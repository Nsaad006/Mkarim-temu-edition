import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';
import { broadcastEvent, SSE_EVENTS } from '../lib/sse';

const router = Router();

// GET /api/cities - List cities (default: active only)
router.get('/', async (req, res) => {
    try {
        const { includeInactive } = req.query;

        const whereClause = includeInactive === 'true' ? {} : { active: true };

        const cities = await prisma.city.findMany({
            where: whereClause,
            orderBy: { name: 'asc' }
        });
        res.json(cities);
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

// POST /api/cities - Create city (super_admin/editor)
router.post('/', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_MANAGE), async (req: Request, res: Response) => {
    try {
        const { name, shippingFee, deliveryTime, active } = req.body;

        const newCity = await prisma.city.create({
            data: {
                name,
                shippingFee: Number(shippingFee),
                deliveryTime,
                active: active ?? true
            }
        });

        broadcastEvent(SSE_EVENTS.CITY_CHANGED);
        res.status(201).json(newCity);
    } catch (error) {
        console.error('Error creating city:', error);
        res.status(500).json({ error: 'Failed to create city' });
    }
});

// PUT /api/cities/:id - Update city (super_admin/editor)
router.put('/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.LOGISTICS_MANAGE), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const { name, shippingFee, deliveryTime, active } = req.body;

        const updatedCity = await prisma.city.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(shippingFee !== undefined && { shippingFee: Number(shippingFee) }),
                ...(deliveryTime && { deliveryTime }),
                ...(active !== undefined && { active })
            }
        });

        broadcastEvent(SSE_EVENTS.CITY_CHANGED);
        res.json(updatedCity);
    } catch (error) {
        console.error('Error updating city:', error);
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'City not found' });
        }
        res.status(500).json({ error: 'Failed to update city' });
    }
});

export default router;
