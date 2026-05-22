import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';
import { sendEmail } from '../lib/email';
import multer from 'multer';

const uploadPdf = multer({ storage: multer.memoryStorage() });

const router = Router();

// Validation schema for Moroccan phone numbers
const phoneRegex = /^(\+212|0)[5-7]\d{8}$/;

const createOrderSchema = z.object({
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive().optional()
    })).min(1, 'Votre panier est vide'),
    customerName: z.string().min(2, "Merci de saisir votre nom complet (min 2 caractères)"),
    email: z.string().email("Merci de saisir une adresse email valide").optional().or(z.literal("")),
    phone: z.string().regex(phoneRegex, 'Merci de saisir un numéro de téléphone marocain valide (Ex: 06XXXXXXXX)'),
    city: z.string().min(2, "Merci de sélectionner votre ville"),
    address: z.string().optional().or(z.literal("")),
    bypassStockCheck: z.boolean().optional()
});

const updateOrderItemsSchema = z.object({
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().positive()
    })).min(1, 'Votre panier est vide')
});


// Generate order number
function generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}${random}`;
}

// import { sendOrderEmails, sendOrderUpdatedEmails } from '../lib/email';
import { sendOrderEmails, sendOrderUpdatedEmails } from '../lib/email';

// POST /api/orders - Create new COD order (Multi-item)
router.post('/', async (req, res) => {
    try {
        // ... (rest of validation and total calculation remains the same)
        const validatedData = createOrderSchema.parse(req.body);

        // Find products and calculate total
        let total = 0;
        const orderItems = [];

        for (const item of validatedData.items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }

            // Only check stock if bypassStockCheck is not true
            if (!validatedData.bypassStockCheck && (!product.inStock || product.quantity < item.quantity)) {
                return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
            }

            // Use provided price (admin manual order) or product price from DB
            const finalPrice = item.price ?? product.price;
            total += finalPrice * item.quantity;

            orderItems.push({
                productId: item.productId,
                quantity: item.quantity,
                price: finalPrice
            });

            // NOTE: Stock is NOT decremented here anymore. 
            // It will be decremented only when status changes to CONFIRMED.
        }

        // Create or update customer record for persistent tracking
        const customer = await prisma.customer.upsert({
            where: { phone: validatedData.phone },
            update: {
                name: validatedData.customerName,
                email: validatedData.email || null,
                city: validatedData.city,
                address: validatedData.address || "",
            },
            create: {
                name: validatedData.customerName,
                email: validatedData.email || null,
                phone: validatedData.phone,
                city: validatedData.city,
                address: validatedData.address || "",
            }
        });

        const newOrder = await prisma.order.create({
            data: {
                orderNumber: generateOrderNumber(),
                customerId: customer.id,
                customerName: validatedData.customerName,
                email: validatedData.email || null,
                phone: validatedData.phone,
                city: validatedData.city,
                address: validatedData.address || "",
                total: total,
                status: 'PENDING',
                items: {
                    create: orderItems
                }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        // Send email notifications immediately and wait for completion
        // This ensures emails are sent instantly before responding to the client
        try {
            await sendOrderEmails(newOrder);
            console.log('✅ Order emails sent successfully');
        } catch (emailError) {
            console.error('❌ Error sending order emails:', emailError);
            // Continue with order creation even if email fails
        }

        res.status(201).json(newOrder);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues
            });
        }

        console.error('Error creating order:', error);
        res.status(500).json({ error: (error as Error).message || 'Failed to create order' });
    }
});

// GET /api/orders - List all orders (admin/editor/viewer/commercial/magasinier or any order permission)
router.get('/', authenticate, authorize(
    ['super_admin', 'editor', 'viewer', 'commercial', 'magasinier'],
    [
        PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE, PERMISSIONS.ORDERS_EDIT,
        PERMISSIONS.ORDERS_CONFIRM, PERMISSIONS.ORDERS_SHIP, PERMISSIONS.ORDERS_DELIVER,
        PERMISSIONS.ORDERS_CANCEL, PERMISSIONS.ORDERS_RETURN
    ]
), async (req: Request, res: Response) => {
    try {
        const { status, city } = req.query;
        const user = (req as any).user; // Get authenticated user

        const where: Prisma.OrderWhereInput = {};

        // Role-based filtering
        if (user.role === 'magasinier') {
            // Magasinier can only see CONFIRMED, SHIPPED, DELIVERED and RETOUR orders
            where.status = {
                in: ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETOUR']
            };
        }
        // Commercial and other roles can see all orders

        if (status) {
            // If magasinier, ensure they can only filter within their allowed statuses
            if (user.role === 'magasinier') {
                const requestedStatus = String(status) as import('@prisma/client').OrderStatus;
                if (['CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETOUR'].includes(requestedStatus)) {
                    where.status = requestedStatus;
                }
            } else {
                where.status = String(status) as import('@prisma/client').OrderStatus;
            }
        }

        if (city) {
            where.city = String(city);
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Apply allowedCategories filtering for restricted users
        // Only show orders that contain at least one product from the user's allowed categories
        let filteredOrders = orders;
        if (user.role !== 'super_admin') {
            const adminData: any = await prisma.admin.findUnique({
                where: { id: user.id },
                select: { allowedCategories: true } as any
            });

            if (adminData && adminData.allowedCategories && adminData.allowedCategories.length > 0) {
                filteredOrders = orders.filter((order: any) =>
                    order.items.some((item: any) =>
                        item.product && adminData.allowedCategories.includes(item.product.categoryId)
                    )
                );
            }
        }

        res.json(filteredOrders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/orders/:id - Get order details (admin/editor/viewer/commercial/magasinier or any order permission)
router.get('/:id', authenticate, authorize(
    ['super_admin', 'editor', 'viewer', 'commercial', 'magasinier'],
    [
        PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE, PERMISSIONS.ORDERS_EDIT,
        PERMISSIONS.ORDERS_CONFIRM, PERMISSIONS.ORDERS_SHIP, PERMISSIONS.ORDERS_DELIVER,
        PERMISSIONS.ORDERS_CANCEL, PERMISSIONS.ORDERS_RETURN
    ]
), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// PUT /api/orders/:id/items - Update order items
router.put('/:id/items', authenticate, authorize(['super_admin', 'editor', 'commercial', 'magasinier'], [PERMISSIONS.ORDERS_EDIT, PERMISSIONS.ORDERS_MANAGE]), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

        const validatedData = updateOrderItemsSchema.parse(req.body);

        // Calculate new total and prepare items data
        let total = 0;
        const newItemsData: { productId: string; quantity: number; price: number }[] = [];
        const itemsForEmail: any[] = [];

        for (const item of validatedData.items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }

            total += item.price * item.quantity;
            newItemsData.push({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
            });
            itemsForEmail.push({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                product: { name: product.name }
            });
        }

        const currentOrder = await prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const user = (req as any).user;
        const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';
        const perms = user.permissions || [];

        if (!isSuperAdmin && !perms.includes(PERMISSIONS.ORDERS_MANAGE)) {
            const hasEditPerm = perms.includes(PERMISSIONS.ORDERS_EDIT) || user.role === 'magasinier' || user.role === 'commercial';
            if (!hasEditPerm) {
                return res.status(403).json({ error: "Vous n'avez pas la permission de modifier les commandes." });
            }

            const status = currentOrder.status;

            if (!['PENDING', 'CONFIRMED'].includes(status)) {
                if (status === 'SHIPPED' && !(user.role === 'magasinier' || perms.includes(PERMISSIONS.ORDERS_SHIP))) {
                    return res.status(403).json({ error: "Vous n'avez pas la permission de modifier une commande expédiée." });
                }
                if (status === 'DELIVERED' && !(user.role === 'magasinier' || perms.includes(PERMISSIONS.ORDERS_DELIVER))) {
                    return res.status(403).json({ error: "Vous n'avez pas la permission de modifier une commande livrée." });
                }
                if (status === 'CANCELLED' || status === 'RETOUR') {
                    return res.status(403).json({ error: "Vous ne pouvez pas modifier une commande annulée ou retournée." });
                }
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const DEDUCT_STATUSES = ['CONFIRMED', 'SHIPPED', 'DELIVERED'];
            const isDeducted = DEDUCT_STATUSES.includes(currentOrder.status);

            if (isDeducted) {
                // Restore old stock
                for (const oldItem of currentOrder.items) {
                    await tx.product.update({
                        where: { id: oldItem.productId },
                        data: {
                            quantity: { increment: oldItem.quantity },
                            inStock: true
                        }
                    });
                }
                // Deduct new stock
                for (const newItem of newItemsData) {
                    const product = await tx.product.findUnique({ where: { id: newItem.productId } });
                    if (!product) throw new Error(`Product ${newItem.productId} not found`);
                    if (product.quantity < newItem.quantity) {
                        throw new Error(`Stock insuffisant pour le produit (Requis: ${newItem.quantity}, Dispo: ${product.quantity})`);
                    }
                    await tx.product.update({
                        where: { id: newItem.productId },
                        data: {
                            quantity: { decrement: newItem.quantity },
                            inStock: product.quantity - newItem.quantity > 0
                        }
                    });
                }
            }

            // Delete existing items
            await tx.orderItem.deleteMany({
                where: { orderId: id }
            });

            // Create new items and update total
            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    total,
                    items: {
                        create: newItemsData
                    }
                },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            return updatedOrder;
        });

        // Send emails
        await sendOrderUpdatedEmails(result, itemsForEmail);

        res.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues
            });
        }
        res.status(500).json({ error: (error as Error).message || 'Failed to update order items' });
    }
});

// POST /api/orders/:id/partial-return - Handle returning specific items
router.post('/:id/partial-return', authenticate, authorize(['super_admin', 'editor', 'commercial', 'magasinier'], [
    PERMISSIONS.ORDERS_MANAGE,
    PERMISSIONS.ORDERS_RETURN
]), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const { items, returnReason } = req.body;
        const user = (req as any).user;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items provided for return' });
        }

        const currentOrder = await prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const isSuperAdmin = user.role === 'super_admin';
        const hasManageAll = user.permissions?.includes(PERMISSIONS.ORDERS_MANAGE);
        const perms = user.permissions || [];
        const userRole = (user.role || '').toLowerCase();

        if (!isSuperAdmin && !hasManageAll && !perms.includes(PERMISSIONS.ORDERS_RETURN) && userRole !== 'magasinier') {
            return res.status(403).json({ error: "Vous n'avez pas la permission d'effectuer un retour" });
        }

        if (!['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(currentOrder.status)) {
            return res.status(400).json({ error: 'Vous ne pouvez retourner que des commandes confirmées, expédiées ou livrées.' });
        }

        const result = await prisma.$transaction(async (tx) => {
            let totalDeductionFromOrder = 0;
            let totalRemainingQuantityInOrder = 0;

            for (const orderItem of currentOrder.items) {
                const returnedItem = items.find(i => i.productId === orderItem.productId);
                let newQuantity = orderItem.quantity;

                if (returnedItem && returnedItem.quantity > 0) {
                    if (returnedItem.quantity > orderItem.quantity) {
                        throw new Error(`Quantité retournée superieure à la quantité commandée pour le produit ${orderItem.productId}`);
                    }

                    const refundQuantity = returnedItem.quantity;
                    newQuantity -= refundQuantity;
                    totalDeductionFromOrder += refundQuantity * orderItem.price;

                    // Restock
                    await tx.product.update({
                        where: { id: orderItem.productId },
                        data: {
                            quantity: { increment: refundQuantity },
                            inStock: true
                        }
                    });

                    // Log return
                    await tx.returnedItem.create({
                        data: {
                            orderId: id,
                            productId: orderItem.productId,
                            quantity: refundQuantity,
                            price: orderItem.price,
                            reason: returnReason || 'Retour partiel'
                        }
                    });

                    // Update or Delete OrderItem
                    if (newQuantity === 0) {
                        await tx.orderItem.delete({
                            where: { id: orderItem.id }
                        });
                    } else {
                        await tx.orderItem.update({
                            where: { id: orderItem.id },
                            data: { quantity: newQuantity }
                        });
                    }
                }
                totalRemainingQuantityInOrder += newQuantity;
            }

            const newTotal = Math.max(0, currentOrder.total - totalDeductionFromOrder);
            const isFullReturn = totalRemainingQuantityInOrder === 0;

            const existingReason = currentOrder.returnReason ? currentOrder.returnReason + ' | ' : '';
            const newReason = `${existingReason}Retour partiel: ${returnReason || 'Non spécifié'}`;

            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    total: newTotal,
                    status: isFullReturn ? 'RETOUR' : currentOrder.status,
                    returnReason: isFullReturn ? returnReason : newReason
                },
                include: {
                    items: { include: { product: true } }
                }
            });

            return updatedOrder;
        });

        res.json(result);
    } catch (error) {
        console.error('Error in partial return:', error);
        res.status(500).json({ error: (error as Error).message || 'Failed to process partial return' });
    }
});

// PATCH /api/orders/:id/status - Update order status (super_admin/editor/commercial/magasinier)

router.patch('/:id/status', authenticate, authorize(['super_admin', 'editor', 'commercial', 'magasinier'], [
    PERMISSIONS.ORDERS_MANAGE,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.ORDERS_CONFIRM,
    PERMISSIONS.ORDERS_SHIP,
    PERMISSIONS.ORDERS_DELIVER,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.ORDERS_RETURN
]), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const { status, returnReason } = req.body;
        const user = (req as any).user;

        // 1. Get current order with items
        const currentOrder = await prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const oldStatus = currentOrder.status;

        // If status is same, just return
        if (status === oldStatus) {
            return res.json(currentOrder);
        }

        // 2. Permission-based status update restrictions
        const isSuperAdmin = user.role === 'super_admin';
        const hasManageAll = user.permissions?.includes(PERMISSIONS.ORDERS_MANAGE);

        if (!isSuperAdmin && !hasManageAll) {
            const perms = user.permissions || [];
            const userRole = (user.role || '').toLowerCase();

            // Check specific status permissions (with legacy role fallbacks)
            if (status === 'CONFIRMED' && !perms.includes(PERMISSIONS.ORDERS_CONFIRM) && userRole !== 'commercial') {
                return res.status(403).json({ error: "Vous n'avez pas la permission de confirmer les commandes" });
            }
            if (status === 'SHIPPED' && !perms.includes(PERMISSIONS.ORDERS_SHIP) && userRole !== 'magasinier') {
                return res.status(403).json({ error: "Vous n'avez pas la permission d'expédier les commandes" });
            }
            if (status === 'DELIVERED' && !perms.includes(PERMISSIONS.ORDERS_DELIVER) && userRole !== 'magasinier') {
                return res.status(403).json({ error: "Vous n'avez pas la permission de livrer les commandes" });
            }
            if (status === 'CANCELLED' && !perms.includes(PERMISSIONS.ORDERS_CANCEL) && userRole !== 'commercial') {
                return res.status(403).json({ error: "Vous n'avez pas la permission d'annuler les commandes" });
            }
            if (status === 'RETOUR' && !perms.includes(PERMISSIONS.ORDERS_RETURN) && userRole !== 'magasinier') {
                return res.status(403).json({ error: "Vous n'avez pas la permission d'effectuer un retour" });
            }
            if (status === 'PENDING' && !perms.includes(PERMISSIONS.ORDERS_EDIT) && !perms.includes(PERMISSIONS.ORDERS_CANCEL) && userRole !== 'commercial') {
                return res.status(403).json({ error: "Vous n'avez pas la permission de remettre en attente" });
            }

            // Commercial logic: can confirm PENDING or CANCELLED orders
            if ((perms.includes(PERMISSIONS.ORDERS_CONFIRM) || userRole === 'commercial') && !perms.includes(PERMISSIONS.ORDERS_SHIP) && userRole !== 'magasinier') {
                if (status === 'CONFIRMED' && !['PENDING', 'CANCELLED'].includes(oldStatus)) {
                    return res.status(403).json({ error: 'Vous ne pouvez confirmer que les commandes en attente ou annulées' });
                }
            }

            // Magasinier logic (if they only have ship/deliver/return, not confirm)
            if (!perms.includes(PERMISSIONS.ORDERS_CONFIRM) && userRole !== 'commercial') {
                if (status === 'RETOUR') {
                    if (!['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(oldStatus)) {
                        return res.status(403).json({ error: 'Vous ne pouvez retourner que les commandes confirmées, expédiées ou livrées' });
                    }
                } else if (status !== 'PENDING') {
                    if (!['CONFIRMED', 'SHIPPED'].includes(oldStatus)) {
                        return res.status(403).json({ error: 'Vous ne pouvez traiter que les commandes confirmées ou expédiées' });
                    }
                }
            }
        }

        // 3. Perform Update with Stock Adjustment in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Define statuses that imply inventory deduction
            const DEDUCT_STATUSES = ['CONFIRMED', 'SHIPPED', 'DELIVERED'];

            const wasDeducted = DEDUCT_STATUSES.includes(oldStatus);
            const shouldBeDeducted = DEDUCT_STATUSES.includes(status);

            // LOGIC: Deduct Stock (Pending -> Confirmed)
            if (!wasDeducted && shouldBeDeducted) {
                // Check availability first
                for (const item of currentOrder.items) {
                    const product = await tx.product.findUnique({ where: { id: item.productId } });
                    if (!product) throw new Error(`Product ${item.productId} not found`);

                    if (product.quantity < item.quantity) {
                        throw new Error(`Stock insuffisant pour '${product.name}' (Requis: ${item.quantity}, Dispo: ${product.quantity})`);
                    }

                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            quantity: { decrement: item.quantity }
                        }
                    });

                    // Check if out of stock
                    if (product.quantity - item.quantity <= 0) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { inStock: false }
                        });
                    }
                }
                console.log(`Order ${currentOrder.orderNumber}: Stock deducted.`);
            }
            // LOGIC: Restore Stock (Confirmed -> Cancelled/Returned/Pending)
            else if (wasDeducted && !shouldBeDeducted) {
                for (const item of currentOrder.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            quantity: { increment: item.quantity },
                            inStock: true // Definitely in stock now
                        }
                    });

                    // Log return if status is RETOUR
                    if (status === 'RETOUR') {
                        await tx.returnedItem.create({
                            data: {
                                orderId: id,
                                productId: item.productId,
                                quantity: item.quantity,
                                price: item.price,
                                reason: returnReason || 'Retour complet de commande'
                            }
                        });
                    }
                }
                console.log(`Order ${currentOrder.orderNumber}: Stock restored.`);
            }

            // Update order status
            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    status,
                    returnReason: status === 'RETOUR' ? returnReason : currentOrder.returnReason
                },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });

            return updatedOrder;
        });

        res.json(result);
    } catch (error) {
        console.error('Error updating order status:', error);
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.status(500).json({ error: (error as Error).message || 'Failed to update order status' });
    }
});

// POST /api/orders/:id/email-invoice - Send content via email
router.post('/:id/email-invoice', authenticate, authorize(['super_admin', 'editor', 'commercial'], [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_MANAGE, PERMISSIONS.ORDERS_EDIT, PERMISSIONS.ORDERS_CONFIRM, PERMISSIONS.ORDERS_SHIP, PERMISSIONS.ORDERS_DELIVER, PERMISSIONS.ORDERS_CANCEL, PERMISSIONS.ORDERS_RETURN]), uploadPdf.single('invoice'), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No invoice file uploaded' });
        }

        const order = await prisma.order.findUnique({
            where: { id },
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (!order.email) {
            return res.status(400).json({ error: 'Customer has no email address associated with this order' });
        }

        const subject = `Facture Commande #${order.orderNumber} - MKARIM Solution`;
        const html = `
            <p>Bonjour ${order.customerName},</p>
            <p>Veuillez trouver ci-joint la facture pour votre commande <strong>#${order.orderNumber}</strong>.</p>
            <p>Merci de votre confiance.</p>
            <p>Cordialement,<br>L'équipe MKARIM Solution</p>
        `;

        await sendEmail(
            order.email,
            subject,
            html,
            [{
                filename: file.originalname || 'facture.pdf',
                content: file.buffer,
                contentType: 'application/pdf'
            }]
        );

        res.json({ success: true, message: 'Email envoyé avec succès' });
    } catch (error) {
        console.error('Error sending invoice email:', error);
        res.status(500).json({ error: 'Failed to send invoice email' });
    }
});

// DELETE /api/orders/:id - Delete a single order (super_admin only)
router.delete('/:id', authenticate, authorize(['super_admin'], [PERMISSIONS.ORDERS_MANAGE]), async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        await prisma.$transaction(async (tx) => {
            await tx.orderItem.deleteMany({ where: { orderId: id } });
            await tx.order.delete({ where: { id } });
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// DELETE /api/orders/bulk - Delete multiple orders (super_admin only)
router.post('/bulk-delete', authenticate, authorize(['super_admin'], [PERMISSIONS.ORDERS_MANAGE]), async (req: Request, res: Response) => {
    try {
        const { ids } = req.body as { ids: string[] };
        if (!ids || ids.length === 0) return res.status(400).json({ error: 'No order IDs provided' });

        await prisma.$transaction(async (tx) => {
            await tx.orderItem.deleteMany({ where: { orderId: { in: ids } } });
            await tx.order.deleteMany({ where: { id: { in: ids } } });
        });

        res.json({ success: true, deleted: ids.length });
    } catch (error) {
        console.error('Error bulk deleting orders:', error);
        res.status(500).json({ error: 'Failed to delete orders' });
    }
});

export default router;
