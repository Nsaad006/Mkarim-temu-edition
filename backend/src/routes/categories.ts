import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, authorize, optionalAuthenticate } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/categories - List all categories (public, with optional auth for inactive)
router.get('/', optionalAuthenticate, async (req, res) => {
    try {
        const { includeInactive } = req.query;
        const user = (req as any).user;

        // Only allow fetching inactive categories if the user is a properly authorized admin
        const isAuthorizedAdmin = user && (
            ['super_admin', 'editor', 'viewer'].includes(user.role) ||
            (user.permissions && (
                user.permissions.includes(PERMISSIONS.CATEGORIES_VIEW) ||
                user.permissions.includes(PERMISSIONS.PRODUCTS_VIEW)
            ))
        );

        // If includeInactive requested but user is not authorized, silently fall back to active-only
        const showInactive = includeInactive === 'true' && isAuthorizedAdmin;
        const whereClause = showInactive ? {} : { active: true };

        const categories = await prisma.category.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        // Map to include productsCount
        const result = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            image: cat.image,
            active: cat.active,
            createdAt: cat.createdAt,
            updatedAt: cat.updatedAt,
            productsCount: cat._count.products
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// POST /api/categories - Create category (super_admin/editor/manage)
router.post('/', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.CATEGORIES_CREATE, PERMISSIONS.CATEGORIES_MANAGE]), async (req: Request, res: Response) => {
    try {
        const { name, slug, active } = req.body;

        const newCategory = await prisma.category.create({
            data: {
                name,
                slug,
                icon: req.body.icon,
                image: req.body.image,
                active: active ?? true
            }
        });

        res.status(201).json(newCategory);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// PUT /api/categories/:id - Update category (super_admin/editor/manage)
router.put('/:id', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.CATEGORIES_EDIT, PERMISSIONS.CATEGORIES_MANAGE]), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const { name, slug, active } = req.body;

        const updatedCategory = await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(slug && { slug }),
                ...(req.body.icon !== undefined && { icon: req.body.icon }),
                ...(req.body.image !== undefined && { image: req.body.image }),
                ...(active !== undefined && { active })
            }
        });

        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// DELETE /api/categories/:id - Delete category (super_admin/editor/manage)
router.delete('/:id', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.CATEGORIES_DELETE, PERMISSIONS.CATEGORIES_MANAGE]), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

        await prisma.category.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting category:', error);
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export default router;
