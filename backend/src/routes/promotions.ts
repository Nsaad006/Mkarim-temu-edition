import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

const promotionSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['VOLUME_DISCOUNT', 'PROMO_CODE']),
    code: z.string().optional().nullable(),
    discountType: z.enum(['PERCENT', 'FIXED']),
    discountValue: z.number().positive(),
    minQuantity: z.number().int().positive().optional().nullable(),
    productId: z.string().optional().nullable(),
    minOrderTotal: z.number().optional().nullable(),
    maxUses: z.number().int().positive().optional().nullable(),
    active: z.boolean().optional(),
    expiresAt: z.string().optional().nullable(),
});

// GET /api/promotions/public - active promotions (no auth, for frontend display)
router.get('/public', async (_req: Request, res: Response) => {
    try {
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
            where: {
                active: true,
                AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
            }
        });
        res.json(promotions);
    } catch {
        res.status(500).json({ error: 'Failed to fetch promotions' });
    }
});

// GET /api/promotions - list all (admin)
router.get('/', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.SETTINGS_VIEW), async (_req: Request, res: Response) => {
    try {
        const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(promotions);
    } catch {
        res.status(500).json({ error: 'Failed to fetch promotions' });
    }
});

// POST /api/promotions - create
router.post('/', authenticate, authorize(['super_admin'], PERMISSIONS.SETTINGS_MANAGE), async (req: Request, res: Response) => {
    try {
        const data = promotionSchema.parse(req.body);
        if (data.type === 'PROMO_CODE' && !data.code) {
            return res.status(400).json({ error: 'Un code promo est requis pour ce type de promotion' });
        }
        const promotion = await prisma.promotion.create({
            data: {
                ...data,
                code: data.code || null,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                active: data.active ?? true,
            }
        });
        broadcastEvent(SSE_EVENTS.PROMOTION_CHANGED);
        res.status(201).json(promotion);
    } catch (error: any) {
        if (error?.code === 'P2002') return res.status(400).json({ error: 'Ce code promo existe déjà' });
        if (error?.name === 'ZodError') return res.status(400).json({ error: 'Données invalides', details: error.issues });
        res.status(500).json({ error: 'Failed to create promotion' });
    }
});

// PATCH /api/promotions/:id - update
router.patch('/:id', authenticate, authorize(['super_admin'], PERMISSIONS.SETTINGS_MANAGE), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = promotionSchema.partial().parse(req.body);
        const promotion = await prisma.promotion.update({
            where: { id },
            data: {
                ...data,
                expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : undefined,
            }
        });
        broadcastEvent(SSE_EVENTS.PROMOTION_CHANGED);
        res.json(promotion);
    } catch (error: any) {
        if (error?.code === 'P2002') return res.status(400).json({ error: 'Ce code promo existe déjà' });
        res.status(500).json({ error: 'Failed to update promotion' });
    }
});

// DELETE /api/promotions/:id
router.delete('/:id', authenticate, authorize(['super_admin'], PERMISSIONS.SETTINGS_MANAGE), async (req: Request, res: Response) => {
    try {
        await prisma.promotion.delete({ where: { id: req.params.id } });
        broadcastEvent(SSE_EVENTS.PROMOTION_CHANGED);
        res.json({ message: 'Promotion supprimée' });
    } catch {
        res.status(500).json({ error: 'Failed to delete promotion' });
    }
});

// POST /api/promotions/validate - validate a promo code (public)
router.post('/validate', async (req: Request, res: Response) => {
    try {
        const { code, cartTotal } = req.body;
        if (!code) return res.status(400).json({ error: 'Code requis' });

        const promo = await prisma.promotion.findFirst({
            where: {
                code: { equals: code, mode: 'insensitive' },
                type: 'PROMO_CODE',
                active: true,
            }
        });

        if (!promo) return res.status(404).json({ error: 'Code invalide ou inexistant' });
        if (promo.expiresAt && promo.expiresAt < new Date()) return res.status(400).json({ error: 'Ce code a expiré' });
        if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'Ce code a atteint sa limite d\'utilisation' });
        if (promo.minOrderTotal && cartTotal < promo.minOrderTotal) {
            return res.status(400).json({ error: `Commande minimum de ${promo.minOrderTotal} DH requis pour ce code` });
        }

        const discountAmount = promo.discountType === 'PERCENT'
            ? Math.round(cartTotal * promo.discountValue / 100)
            : Math.round(promo.discountValue);

        res.json({ valid: true, promotion: promo, discountAmount });
    } catch {
        res.status(500).json({ error: 'Failed to validate promo code' });
    }
});

export default router;
