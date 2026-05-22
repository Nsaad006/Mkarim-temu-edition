import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/capital - List all capital entries
router.get('/', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.ANALYTICS_VIEW), async (req, res) => {
    try {
        const entries = await prisma.capitalEntry.findMany({
            include: {
                admin: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.json(entries);
    } catch (error) {
        console.error('Error fetching capital entries:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/capital - Add capital (Injection)
router.post('/', authenticate, authorize(['super_admin'], PERMISSIONS.SETTINGS_MANAGE), async (req: any, res: Response) => {
    try {
        const { amount, description, type = 'INJECTION' } = req.body;
        const adminId = req.user?.id;

        if (!amount) return res.status(400).json({ error: 'Amount is required' });

        const entry = await prisma.capitalEntry.create({
            data: {
                amount: Number(amount),
                type,
                description,
                adminId
            }
        });

        res.status(201).json(entry);
    } catch (error) {
        console.error('Error creating capital entry:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
