import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/procurements - List all procurements
router.get('/', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_VIEW), async (req, res) => {
    try {
        const procurements = await prisma.procurement.findMany({
            include: {
                supplier: true,
                product: true,
                admin: {
                    select: { name: true }
                }
            },
            orderBy: { purchaseDate: 'desc' }
        });
        res.json(procurements);
    } catch (error) {
        console.error('Error fetching procurements:', error);
        res.status(500).json({ error: 'Failed to fetch procurements' });
    }
});

// POST /api/procurements - Create procurement and update stock
router.post('/', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_MANAGE), async (req: any, res) => {
    try {
        const { supplierId, productId, quantityPurchased, unitCostPrice, purchaseDate } = req.body;
        const adminId = req.user?.id;

        if (!supplierId || !productId || !quantityPurchased || !unitCostPrice) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const quantity = Number(quantityPurchased);
        const unitCost = Number(unitCostPrice);
        const totalCost = quantity * unitCost;

        // Start transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create procurement entry
            const procurement = await tx.procurement.create({
                data: {
                    supplierId,
                    productId,
                    quantityPurchased: quantity,
                    unitCostPrice: unitCost,
                    totalCost,
                    purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
                    createdByAdminId: adminId
                }
            });

            // 2. Update product stock
            const product = await tx.product.update({
                where: { id: productId },
                data: {
                    quantity: {
                        increment: quantity
                    },
                    inStock: true // Ensure product is marked in stock
                }
            });

            return { procurement, product };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating procurement:', error);
        res.status(500).json({ error: 'Failed to create procurement' });
    }
});

// DELETE /api/procurements/bulk - Delete multiple procurement records
router.delete('/bulk', authenticate, authorize(['super_admin'], PERMISSIONS.LOGISTICS_MANAGE), async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs requis' });
        }
        const { count } = await prisma.procurement.deleteMany({ where: { id: { in: ids } } });
        res.json({ deleted: count });
    } catch (error) {
        console.error('Error deleting procurements:', error);
        res.status(500).json({ error: 'Failed to delete procurements' });
    }
});

// DELETE /api/procurements/:id - Delete a single procurement record
router.delete('/:id', authenticate, authorize(['super_admin'], PERMISSIONS.LOGISTICS_MANAGE), async (req, res) => {
    try {
        await prisma.procurement.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    } catch (error) {
        console.error('Error deleting procurement:', error);
        res.status(500).json({ error: 'Failed to delete procurement' });
    }
});

export default router;
