import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/customers - Get all persistent customers
router.get('/', authenticate, authorize(['super_admin', 'editor', 'viewer', 'commercial'], PERMISSIONS.CUSTOMERS_VIEW), async (req: Request, res: Response) => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                _count: {
                    select: { orders: true }
                },
                orders: {
                    select: {
                        total: true,
                        createdAt: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formattedCustomers = customers.map((customer: any) => {
            const totalSpent = customer.orders.reduce((sum: number, order: any) => sum + order.total, 0);
            const lastOrder = customer.orders.length > 0
                ? [...customer.orders].sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())[0]
                : null;

            return {
                id: customer.phone,
                name: customer.name,
                phone: customer.phone,
                email: customer.email || '',
                city: customer.city,
                address: customer.address,
                ordersCount: customer._count.orders,
                totalSpent: totalSpent,
                lastOrderDate: lastOrder ? lastOrder.createdAt : null
            };
        }).sort((a: any, b: any) => b.totalSpent - a.totalSpent);

        res.json(formattedCustomers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// GET /api/customers/:customerId/orders - Get all orders for a specific customer
router.get('/:customerId/orders', authenticate, authorize(['super_admin', 'editor', 'viewer'], PERMISSIONS.CUSTOMERS_VIEW), async (req: Request, res: Response) => {
    try {
        const { customerId } = req.params;

        // Fetch all orders for this customer (using phone as identifier)
        const orders = await prisma.order.findMany({
            where: {
                phone: customerId
            },
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
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ error: 'Failed to fetch customer orders' });
    }
});

export default router;
