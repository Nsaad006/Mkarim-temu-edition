import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/hero-slides - Public
router.get('/', async (req: Request, res: Response) => {
    try {
        const slides = await prisma.heroSlide.findMany({
            where: { active: true },
            orderBy: { order: 'asc' }
        });
        res.json(slides);
    } catch (error) {
        console.error('Error fetching hero slides:', error);
        res.status(500).json({ error: 'Failed to fetch hero slides' });
    }
});

// GET /api/hero-slides/all - Admin only
router.get('/all', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE]), async (req: Request, res: Response) => {
    try {
        const slides = await prisma.heroSlide.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(slides);
    } catch (error) {
        console.error('Error fetching all hero slides:', error);
        res.status(500).json({ error: 'Failed to fetch all hero slides' });
    }
});

// POST /api/hero-slides - Admin only
router.post('/', authenticate, authorize(['super_admin'], PERMISSIONS.SETTINGS_MANAGE), async (req: Request, res: Response) => {
    try {
        const { image, title, subtitle, description, buttonText, buttonLink, badge, order, active } = req.body;

        const slide = await prisma.heroSlide.create({
            data: {
                image,
                title,
                subtitle,
                description,
                buttonText,
                buttonLink,
                badge,
                order: order || 0,
                active: active ?? true
            }
        });

        res.status(201).json(slide);
    } catch (error) {
        console.error('Error creating hero slide:', error);
        res.status(500).json({ error: 'Failed to create hero slide' });
    }
});

// PUT /api/hero-slides/:id - Admin only
router.put('/:id', authenticate, authorize(['super_admin'], PERMISSIONS.SETTINGS_MANAGE), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { image, title, subtitle, description, buttonText, buttonLink, badge, order, active } = req.body;

        const slide = await prisma.heroSlide.update({
            where: { id },
            data: {
                ...(image !== undefined && { image }),
                ...(title !== undefined && { title }),
                ...(subtitle !== undefined && { subtitle }),
                ...(description !== undefined && { description }),
                ...(buttonText !== undefined && { buttonText }),
                ...(buttonLink !== undefined && { buttonLink }),
                ...(badge !== undefined && { badge }),
                ...(order !== undefined && { order }),
                ...(active !== undefined && { active })
            }
        });

        res.json(slide);
    } catch (error) {
        console.error('Error updating hero slide:', error);
        res.status(500).json({ error: 'Failed to update hero slide' });
    }
});

// DELETE /api/hero-slides/:id - Admin only
router.delete('/:id', authenticate, authorize(['super_admin'], PERMISSIONS.SETTINGS_MANAGE), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.heroSlide.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting hero slide:', error);
        res.status(500).json({ error: 'Failed to delete hero slide' });
    }
});

export default router;
