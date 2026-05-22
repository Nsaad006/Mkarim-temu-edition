import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/suppliers - List all suppliers
router.get('/', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.LOGISTICS_VIEW, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_EDIT]), async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { procurements: true }
                }
            }
        });
        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// GET /api/suppliers/:id - Get supplier details including history
router.get('/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_VIEW), async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                procurements: {
                    include: {
                        product: true
                    },
                    orderBy: { purchaseDate: 'desc' }
                }
            }
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Calculate summary data
        const totalSpent = supplier.procurements.reduce((sum, p) => sum + p.totalCost, 0);
        const totalItems = supplier.procurements.reduce((sum, p) => sum + p.quantityPurchased, 0);

        // Group by product for "Products supplied" view
        const productMap = new Map();
        supplier.procurements.forEach(p => {
            const existing = productMap.get(p.productId) || { name: p.product.name, quantity: 0, total: 0 };
            productMap.set(p.productId, {
                name: p.product.name,
                quantity: existing.quantity + p.quantityPurchased,
                total: existing.total + p.totalCost
            });
        });

        res.json({
            ...supplier,
            summary: {
                totalSpent,
                totalItems,
                uniqueProducts: productMap.size,
                products: Array.from(productMap.values())
            }
        });
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
});

// POST /api/suppliers - Create supplier
router.post('/', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_MANAGE), async (req, res) => {
    try {
        const { name, phone, email, city, notes } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }

        const newSupplier = await prisma.supplier.create({
            data: { name, phone, email, city, notes }
        });

        res.status(201).json(newSupplier);
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ error: 'Failed to create supplier' });
    }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_MANAGE), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email, city, notes } = req.body;

        const updatedSupplier = await prisma.supplier.update({
            where: { id },
            data: { name, phone, email, city, notes }
        });

        res.json(updatedSupplier);
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_MANAGE), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if supplier has any procurements
        const procurementCount = await prisma.procurement.count({
            where: { supplierId: id }
        });

        if (procurementCount > 0) {
            return res.status(400).json({ error: 'Cannot delete supplier with procurement history' });
        }

        await prisma.supplier.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});

export default router;
