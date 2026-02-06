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

// Generate order number
function generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}${random}`;
}

// import { sendOrderEmails } from '../lib/email';
import { sendOrderEmails } from '../lib/email';

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

// GET /api/orders - List all orders (admin/editor/viewer/commercial/magasinier)
router.get('/', authenticate, authorize(['super_admin', 'editor', 'viewer', 'commercial', 'magasinier'], PERMISSIONS.ORDERS_VIEW), async (req: Request, res: Response) => {
    try {
        const { status, city } = req.query;
        const user = (req as any).user; // Get authenticated user

        const where: Prisma.OrderWhereInput = {};

        // Role-based filtering
        if (user.role === 'magasinier') {
            // Magasinier can only see CONFIRMED, SHIPPED, and DELIVERED orders
            where.status = {
                in: ['CONFIRMED', 'SHIPPED', 'DELIVERED']
            };
        }
        // Commercial and other roles can see all orders

        if (status) {
            // If magasinier, ensure they can only filter within their allowed statuses
            if (user.role === 'magasinier') {
                const requestedStatus = String(status) as import('@prisma/client').OrderStatus;
                if (['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(requestedStatus)) {
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
                createdAt: 'desc'
            }
        });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/orders/:id - Get order details (admin/editor/viewer/commercial/magasinier)
router.get('/:id', authenticate, authorize(['super_admin', 'editor', 'viewer', 'commercial', 'magasinier'], PERMISSIONS.ORDERS_VIEW), async (req: Request, res: Response) => {
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

// PATCH /api/orders/:id/status - Update order status (super_admin/editor/commercial/magasinier)
router.patch('/:id/status', authenticate, authorize(['super_admin', 'editor', 'commercial', 'magasinier'], PERMISSIONS.ORDERS_MANAGE), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const { status } = req.body;
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

        // 2. Role-based status update restrictions
        if (user.role === 'commercial') {
            // Commercial can only CONFIRM or CANCEL orders
            if (!['CONFIRMED', 'CANCELLED'].includes(status)) {
                return res.status(403).json({
                    error: 'Commercial can only confirm or cancel orders'
                });
            }

            // Commercial can only CONFIRM orders that are PENDING
            if (status === 'CONFIRMED' && oldStatus !== 'PENDING') {
                return res.status(403).json({
                    error: 'Vous ne pouvez confirmer que les commandes en attente'
                });
            }

            // Commercial can only CANCEL orders that are PENDING or CONFIRMED
            if (status === 'CANCELLED' && !['PENDING', 'CONFIRMED'].includes(oldStatus)) {
                return res.status(403).json({
                    error: 'Vous ne pouvez annuler que les commandes en attente ou confirmées'
                });
            }

            // Cannot modify orders that are already SHIPPED, DELIVERED, or CANCELLED
            if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(oldStatus) && status !== 'CANCELLED') {
                return res.status(403).json({
                    error: 'Cette commande ne peut plus être modifiée'
                });
            }
        } else if (user.role === 'magasinier') {
            // Magasinier can only set SHIPPED or DELIVERED
            if (!['SHIPPED', 'DELIVERED'].includes(status)) {
                return res.status(403).json({
                    error: 'Magasinier can only set orders to shipped or delivered'
                });
            }

            // Magasinier can only update orders that are already CONFIRMED
            if (!['CONFIRMED', 'SHIPPED'].includes(oldStatus)) {
                return res.status(403).json({
                    error: 'Magasinier can only update confirmed or shipped orders'
                });
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
                }
                console.log(`Order ${currentOrder.orderNumber}: Stock restored.`);
            }

            // Update order status
            const updatedOrder = await tx.order.update({
                where: { id },
                data: { status },
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
router.post('/:id/email-invoice', authenticate, authorize(['super_admin', 'editor', 'commercial']), uploadPdf.single('invoice'), async (req: Request, res: Response) => {
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

export default router;
