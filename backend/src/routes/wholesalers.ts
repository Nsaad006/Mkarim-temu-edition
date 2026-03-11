import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';
import { sendEmail } from '../lib/email';
import multer from 'multer';

const uploadPdf = multer({ storage: multer.memoryStorage() });

const router = Router();

// GET /api/wholesalers - List all wholesalers with optional search
router.get('/', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.WHOLESALERS_VIEW, PERMISSIONS.LOGISTICS_VIEW]), async (req, res) => {
    try {
        const { search } = req.query;
        const where: any = {};

        if (search) {
            const searchStr = String(search).toLowerCase();
            where.OR = [
                { name: { contains: searchStr, mode: 'insensitive' } },
                { phone: { contains: searchStr, mode: 'insensitive' } }
            ];
        }

        const wholesalers = await prisma.wholesaler.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });

        res.json(wholesalers);
    } catch (error) {
        console.error('Error fetching wholesalers:', error);
        res.status(500).json({ error: 'Failed to fetch wholesalers' });
    }
});

// GET /api/wholesalers/orders - List all orders flat
router.get('/orders', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.WHOLESALERS_VIEW, PERMISSIONS.LOGISTICS_VIEW]), async (req, res) => {
    try {
        const orders = await prisma.wholesaleOrder.findMany({
            include: {
                wholesaler: true,
                items: {
                    include: {
                        product: {
                            include: {
                                procurements: {
                                    select: {
                                        unitCostPrice: true,
                                        quantityPurchased: true
                                    }
                                }
                            }
                        }
                    }
                },
                payments: {
                    orderBy: { date: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching wholesale orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/wholesalers/:id - Get details (with orders)
router.get('/:id', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.WHOLESALERS_VIEW, PERMISSIONS.LOGISTICS_VIEW]), async (req, res) => {
    try {
        const { id } = req.params;
        const wholesaler = await prisma.wholesaler.findUnique({
            where: { id },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        },
                        payments: {
                            orderBy: { date: 'desc' }
                        }
                    }
                }
            }
        });

        if (!wholesaler) return res.status(404).json({ error: 'Wholesaler not found' });
        res.json(wholesaler);
    } catch (error) {
        console.error('Error fetching wholesaler:', error);
        res.status(500).json({ error: 'Failed to fetch wholesaler' });
    }
});

// POST /api/wholesalers - Create wholesaler
router.post('/', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.WHOLESALERS_CREATE, PERMISSIONS.LOGISTICS_MANAGE]), async (req, res) => {
    try {
        const { type, name, address, phone, email, ice, responsibleName } = req.body;

        if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
        if (type === 'ENTREPRISE' && (!ice || ice.length !== 15)) {
            return res.status(400).json({ error: 'ICE valide (15 chiffres) est requis pour une entreprise' });
        }

        const wholesaler = await prisma.wholesaler.create({
            data: {
                type: type || 'PARTICULIER',
                name,
                address,
                phone,
                email,
                ice: type === 'ENTREPRISE' ? ice : null,
                responsibleName: type === 'ENTREPRISE' ? responsibleName : null
            }
        });
        res.status(201).json(wholesaler);
    } catch (error) {
        console.error('Error creating wholesaler:', error);
        if ((error as any).code === 'P2002') return res.status(400).json({ error: 'Phone number already exists' });
        res.status(500).json({ error: 'Failed to create wholesaler' });
    }
});

// PUT /api/wholesalers/:id - Update wholesaler
router.put('/:id', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.WHOLESALERS_EDIT, PERMISSIONS.LOGISTICS_MANAGE]), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { type, name, address, phone, email, ice, responsibleName } = req.body;

        if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
        if (type === 'ENTREPRISE' && (!ice || ice.length !== 15)) {
            return res.status(400).json({ error: 'ICE valide (15 chiffres) est requis pour une entreprise' });
        }

        const wholesaler = await prisma.wholesaler.update({
            where: { id },
            data: {
                type,
                name,
                address,
                phone,
                email,
                ice: type === 'ENTREPRISE' ? ice : null,
                responsibleName: type === 'ENTREPRISE' ? responsibleName : null
            }
        });
        res.json(wholesaler);
    } catch (error) {
        console.error('Error updating wholesaler:', error);
        if ((error as any).code === 'P2002') return res.status(400).json({ error: 'Phone number already exists' });
        res.status(500).json({ error: 'Failed to update wholesaler' });
    }
});

// DELETE /api/wholesalers/:id - Delete wholesaler
router.delete('/:id', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.WHOLESALERS_EDIT, PERMISSIONS.LOGISTICS_MANAGE]), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if wholesaler has any orders
        const ordersCount = await prisma.wholesaleOrder.count({
            where: { wholesalerId: id }
        });

        if (ordersCount > 0) {
            return res.status(400).json({ error: "impossible de supprimer un grossiste disposant d'une commande" });
        }

        await prisma.wholesaler.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting wholesaler:', error);
        res.status(500).json({ error: 'Failed to delete wholesaler' });
    }
});

// POST /api/wholesalers/:id/orders - Create Order
router.post('/:id/orders', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.WHOLESALERS_CREATE, PERMISSIONS.LOGISTICS_MANAGE]), async (req: any, res: Response) => {
    try {
        const { id: wholesalerId } = req.params;
        // items: { productId, quantity, unitPrice }[]
        const { items, advanceAmount } = req.body;
        const adminId = req.user?.id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items are required' });
        }

        const result = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;

            // 1. Calculate Total & Validate Stock
            for (const item of items) {
                totalAmount += (Number(item.quantity) * Number(item.unitPrice));

                // Decrement stock logic
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new Error(`Product ${item.productId} not found`);
                if (product.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.name}`);
                }

                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantity: { decrement: item.quantity } }
                });
            }

            // 2. Determine Status
            const advance = Number(advanceAmount) || 0;
            const remaining = totalAmount - advance;
            const status = remaining <= 0 ? 'PAID' : 'PENDING';

            // 3. Create Order
            // Generate Order Number: WO-{YYYY}-{Count} (simple logic)
            const count = await tx.wholesaleOrder.count();
            const orderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

            const order = await tx.wholesaleOrder.create({
                data: {
                    wholesalerId,
                    orderNumber,
                    totalAmount,
                    advanceAmount: advance,
                    status,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.unitPrice)
                        }))
                    }
                },
                include: { items: true }
            });

            // 4. Record Initial Payment if Advance > 0
            if (advance > 0) {
                await tx.wholesalePayment.create({
                    data: {
                        wholesaleOrderId: order.id,
                        amount: advance,
                        note: 'Avance initiale',
                        date: new Date()
                    }
                });
            }

            return order;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creating wholesale order:', error);
        res.status(400).json({ error: error.message || 'Failed to create order' });
    }
});

// POST /api/wholesalers/orders/:orderId/payments - Add Payment
router.post('/orders/:orderId/payments', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.WHOLESALERS_PAYMENTS, PERMISSIONS.LOGISTICS_MANAGE]), async (req, res) => {
    try {
        const { orderId } = req.params;
        const { amount, note } = req.body;
        const paymentAmount = Number(amount);

        if (!paymentAmount || paymentAmount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        await prisma.$transaction(async (tx) => {
            const order = await tx.wholesaleOrder.findUnique({ where: { id: orderId } });
            if (!order) throw new Error('Order not found');

            const remaining = order.totalAmount - order.advanceAmount;

            // Allow if remaining is positive, but ensure we don't overpay significantly?
            // User requirement: "payment added has to be <= the reste Reste à payer"
            if (paymentAmount > remaining) {
                throw new Error(`Le paiement (${paymentAmount}) dépasse le reste à payer (${remaining})`);
            }
            if (remaining <= 0) {
                throw new Error('La commande est déjà réglée');
            }

            // Create Payment
            await tx.wholesalePayment.create({
                data: {
                    wholesaleOrderId: orderId,
                    amount: paymentAmount,
                    note: note || 'Paiement',
                    date: new Date()
                }
            });

            // Update Order
            const newAdvance = order.advanceAmount + paymentAmount;
            const newStatus = (order.totalAmount - newAdvance) <= 0 ? 'PAID' : 'PENDING';

            await tx.wholesaleOrder.update({
                where: { id: orderId },
                data: {
                    advanceAmount: newAdvance,
                    status: newStatus
                }
            });
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error adding payment:', error);
        res.status(400).json({ error: error.message || 'Failed to add payment' });
    }
});

// PUT /api/wholesalers/orders/:id - Update Full Order
router.put('/orders/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_MANAGE), async (req, res) => {
    try {
        const { id } = req.params;
        const { items, advanceAmount } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items are required' });
        }

        await prisma.$transaction(async (tx) => {
            // 1. Get existing order to restore stock
            const existingOrder = await tx.wholesaleOrder.findUnique({
                where: { id },
                include: { items: true }
            });

            if (!existingOrder) throw new Error('Order not found');

            // 2. Restore Stock from OLD items
            for (const item of existingOrder.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantity: { increment: item.quantity } }
                });
            }

            // 3. Delete OLD items
            await tx.wholesaleOrderItem.deleteMany({ where: { wholesaleOrderId: id } });

            // 4. Create NEW items & Decrement Stock
            let totalAmount = 0;
            for (const item of items) {
                const qty = Number(item.quantity);
                const price = Number(item.unitPrice);
                totalAmount += (qty * price);

                // Check Stock
                const product = await tx.product.findUnique({ where: { id: item.productId } });
                if (!product) throw new Error(`Product ${item.productId} not found`);

                if (product.quantity < qty) {
                    throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.quantity}`);
                }

                // Decrement
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantity: { decrement: qty } }
                });

                // Create Item
                await tx.wholesaleOrderItem.create({
                    data: {
                        wholesaleOrderId: id,
                        productId: item.productId,
                        quantity: qty,
                        unitPrice: price
                    }
                });
            }

            // 5. Update Order Master Record
            const advance = Number(advanceAmount);
            const remaining = totalAmount - advance;
            const status = remaining <= 0 ? 'PAID' : 'PENDING';

            await tx.wholesaleOrder.update({
                where: { id },
                data: {
                    totalAmount,
                    advanceAmount: advance,
                    status
                }
            });
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error updating order:', error);
        res.status(400).json({ error: error.message || 'Failed to update order' });
    }
});

// DELETE /api/wholesalers/orders/:id - Cancel Order
router.delete('/orders/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_MANAGE), async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.$transaction(async (tx) => {
            const order = await tx.wholesaleOrder.findUnique({
                where: { id },
                include: { items: true }
            });

            if (!order) throw new Error('Order not found');

            // Restore Stock
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantity: { increment: item.quantity } }
                });
            }

            // Delete Order (Cascade will delete items)
            await tx.wholesaleOrder.delete({ where: { id } });
        });

        res.status(204).send();
    } catch (error: any) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: error.message || 'Failed to delete order' });
    }
});

// POST /api/wholesalers/orders/:id/email-invoice - Send PDF Invoice via Email
router.post('/orders/:id/email-invoice', authenticate, authorize(['super_admin', 'editor']), uploadPdf.single('invoice'), async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No invoice file uploaded' });
        }

        const order = await prisma.wholesaleOrder.findUnique({
            where: { id },
            include: { wholesaler: true }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (!order.wholesaler.email) return res.status(400).json({ error: 'Wholesaler has no email address' });

        const subject = `Facture Commande #${order.orderNumber}`;
        const html = `
            <p>Bonjour ${order.wholesaler.name},</p>
            <p>Veuillez trouver ci-joint la facture pour votre commande #${order.orderNumber}.</p>
            <p>Cordialement,<br>MKARIM Solution</p>
        `;

        await sendEmail(
            order.wholesaler.email,
            subject,
            html,
            [{
                filename: file.originalname || 'facture.pdf',
                content: file.buffer,
                contentType: 'application/pdf'
            }]
        );

        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
        console.error('Error sending invoice email:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

export default router;
