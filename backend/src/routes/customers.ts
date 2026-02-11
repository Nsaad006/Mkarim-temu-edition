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
                id: customer.phone, // Keeping phone as ID for consistency with GET
                dbId: customer.id, // Providing real ID for updates
                name: customer.name,
                phone: customer.phone,
                email: customer.email || '',
                city: customer.city,
                address: customer.address,
                isFavorite: customer.isFavorite,
                isLoyal: customer.isLoyal,
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

// POST /api/customers - Create a customer manually
router.post('/', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.CUSTOMERS_CREATE, PERMISSIONS.CUSTOMERS_MANAGE]), async (req: Request, res: Response) => {
    try {
        const { name, phone, email, city, address } = req.body;

        const customer = await prisma.customer.create({
            data: {
                name,
                phone,
                email: email || null,
                city,
                address: address || ""
            }
        });

        res.status(201).json(customer);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Un client avec ce numéro de téléphone existe déjà.' });
        }
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// PATCH /api/customers/:id - Update customer (including favorite/loyal status)
router.patch('/:id', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.CUSTOMERS_EDIT, PERMISSIONS.CUSTOMERS_MANAGE]), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isFavorite, isLoyal, name, email, city, address, phone } = req.body;

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                isFavorite,
                isLoyal,
                name,
                email,
                city,
                address,
                phone
            }
        });

        res.json(customer);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ error: 'Failed to update customer' });
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
