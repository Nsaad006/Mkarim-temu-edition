import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/commission/me — agent's own stats
router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { month, year } = req.query;

        const now = new Date();
        const targetMonth = month ? parseInt(String(month)) : now.getMonth() + 1;
        const targetYear = year ? parseInt(String(year)) : now.getFullYear();

        const [records, payments, ordersPending, ordersConfirmed, ordersDelivered] = await Promise.all([
            prisma.commissionRecord.findMany({
                where: { agentId: user.id, month: targetMonth, year: targetYear },
                include: { order: { select: { id: true, orderNumber: true, customerName: true, total: true, status: true, createdAt: true } } }
            }),
            prisma.commissionPayment.findMany({
                where: { agentId: user.id, month: targetMonth, year: targetYear }
            }),
            prisma.order.count({
                where: { status: 'PENDING', ...(await agentOrderFilter(user.id)) }
            }),
            prisma.order.count({ where: { confirmedById: user.id, status: 'CONFIRMED' } }),
            prisma.order.count({ where: { confirmedById: user.id, status: 'DELIVERED' } }),
        ]);

        const totalEarned = records
            .filter(r => r.status !== 'CANCELLED')
            .reduce((s, r) => s + r.amount, 0);
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

        // Available months with data
        const history = await prisma.commissionRecord.groupBy({
            by: ['month', 'year'],
            where: { agentId: user.id },
            _sum: { amount: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        res.json({
            month: targetMonth,
            year: targetYear,
            totalEarned,
            totalPaid,
            pendingPayment: Math.max(0, totalEarned - totalPaid),
            ordersPending,
            ordersConfirmed,
            ordersDelivered,
            records,
            payments,
            history
        });
    } catch (error) {
        console.error('Error fetching agent commission:', error);
        res.status(500).json({ error: 'Failed to fetch commission data' });
    }
});

// GET /api/commission/agents — super admin: all agents overview
router.get('/agents', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_VIEW), async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;
        const now = new Date();
        const targetMonth = month ? parseInt(String(month)) : now.getMonth() + 1;
        const targetYear = year ? parseInt(String(year)) : now.getFullYear();

        const agents = await prisma.admin.findMany({
            where: { active: true },
            select: {
                id: true, name: true, email: true, role: true, roleId: true,
                assignedRole: { select: { name: true, permissions: true } },
                commissionRecords: {
                    where: { month: targetMonth, year: targetYear, status: { not: 'CANCELLED' } },
                    select: { amount: true, status: true }
                },
                commissionPayments: {
                    where: { month: targetMonth, year: targetYear },
                    select: { amount: true }
                },
                _count: {
                    select: {
                        confirmedOrders: { where: { status: 'CONFIRMED' } }
                    }
                }
            }
        });

        const result = agents.map(agent => {
            const hasConfirmPerm = agent.role === 'commercial' ||
                agent.assignedRole?.permissions?.includes(PERMISSIONS.ORDERS_CONFIRM);
            if (!hasConfirmPerm && agent.role === 'super_admin') return null;

            const totalEarned = agent.commissionRecords.reduce((s, r) => s + r.amount, 0);
            const totalPaid = agent.commissionPayments.reduce((s, p) => s + p.amount, 0);
            return {
                id: agent.id,
                name: agent.name,
                email: agent.email,
                role: agent.role,
                totalEarned,
                totalPaid,
                pendingPayment: Math.max(0, totalEarned - totalPaid),
                confirmedOrdersCount: agent._count.confirmedOrders
            };
        }).filter(Boolean);

        res.json({ month: targetMonth, year: targetYear, agents: result });
    } catch (error) {
        console.error('Error fetching agents commission:', error);
        res.status(500).json({ error: 'Failed to fetch agents commission' });
    }
});

// GET /api/commission/agent/:id — admin view of specific agent
router.get('/agent/:id', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_VIEW), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;
        const now = new Date();
        const targetMonth = month ? parseInt(String(month)) : now.getMonth() + 1;
        const targetYear = year ? parseInt(String(year)) : now.getFullYear();

        const agent = await prisma.admin.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, role: true }
        });
        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        const [records, payments, ordersPending, ordersConfirmed, ordersDelivered, history] = await Promise.all([
            prisma.commissionRecord.findMany({
                where: { agentId: id, month: targetMonth, year: targetYear },
                include: { order: { select: { id: true, orderNumber: true, customerName: true, total: true, status: true, createdAt: true } } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.commissionPayment.findMany({
                where: { agentId: id, month: targetMonth, year: targetYear },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.order.count({ where: { status: 'PENDING', ...(await agentOrderFilter(id)) } }),
            prisma.order.count({ where: { confirmedById: id, status: 'CONFIRMED' } }),
            prisma.order.count({ where: { confirmedById: id, status: 'DELIVERED' } }),
            prisma.commissionRecord.groupBy({
                by: ['month', 'year'],
                where: { agentId: id },
                _sum: { amount: true },
                orderBy: [{ year: 'desc' }, { month: 'desc' }]
            })
        ]);

        const totalEarned = records.filter(r => r.status !== 'CANCELLED').reduce((s, r) => s + r.amount, 0);
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

        res.json({
            agent,
            month: targetMonth,
            year: targetYear,
            totalEarned,
            totalPaid,
            pendingPayment: Math.max(0, totalEarned - totalPaid),
            ordersPending,
            ordersConfirmed,
            ordersDelivered,
            records,
            payments,
            history
        });
    } catch (error) {
        console.error('Error fetching agent commission:', error);
        res.status(500).json({ error: 'Failed to fetch agent commission' });
    }
});

// POST /api/commission/pay/:agentId — admin pays agent
router.post('/pay/:agentId', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_MANAGE), async (req: Request, res: Response) => {
    try {
        const { agentId } = req.params;
        const { amount, month, year, note } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });
        if (!month || !year) return res.status(400).json({ error: 'Mois et année requis' });

        const agent = await prisma.admin.findUnique({ where: { id: agentId } });
        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        // Create payment record
        const payment = await prisma.commissionPayment.create({
            data: { agentId, amount, month, year, note: note || null }
        });

        // Mark commissions as PAID (up to the amount paid)
        const pendingRecords = await prisma.commissionRecord.findMany({
            where: { agentId, month, year, status: 'PENDING' },
            orderBy: { createdAt: 'asc' }
        });

        let remaining = amount;
        for (const record of pendingRecords) {
            if (remaining <= 0) break;
            if (record.amount <= remaining) {
                await prisma.commissionRecord.update({
                    where: { id: record.id },
                    data: { status: 'PAID' }
                });
                remaining -= record.amount;
            }
        }

        res.json({ success: true, payment });
    } catch (error) {
        console.error('Error processing commission payment:', error);
        res.status(500).json({ error: 'Failed to process payment' });
    }
});

// Helper: build order filter for agent's allowed categories
async function agentOrderFilter(agentId: string) {
    const admin = await prisma.admin.findUnique({
        where: { id: agentId },
        select: { allowedCategories: true }
    });
    if (!admin?.allowedCategories?.length) return {};
    return {
        items: {
            some: {
                product: { categoryId: { in: admin.allowedCategories } }
            }
        }
    };
}

export default router;
