import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';
import { z } from 'zod';

const router = Router();

// Validation Schemas
const roleSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    permissions: z.array(z.string())
});

// GET /permissions - List all available permissions
router.get('/permissions', authenticate, (req, res) => {
    // Return the PERMISSIONS object values
    const permissions = Object.values(PERMISSIONS);
    res.json(permissions);
});

// GET / - List all roles
router.get('/', authenticate, authorize(['super_admin'], PERMISSIONS.ROLES_VIEW), async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                _count: {
                    select: { admins: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// POST / - Create role
router.post('/', authenticate, authorize(['super_admin'], PERMISSIONS.ROLES_MANAGE), async (req, res) => {
    try {
        const data = roleSchema.parse(req.body);

        // Check uniqueness
        const existing = await prisma.role.findUnique({
            where: { name: data.name }
        });

        if (existing) {
            return res.status(400).json({ error: 'A role with this name already exists' });
        }

        const role = await prisma.role.create({
            data
        });

        res.json(role);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        res.status(500).json({ error: 'Failed to create role' });
    }
});

// PUT /:id - Update role
router.put('/:id', authenticate, authorize(['super_admin'], PERMISSIONS.ROLES_MANAGE), async (req, res) => {
    try {
        const data = roleSchema.parse(req.body);
        const { id } = req.params;

        const role = await prisma.role.update({
            where: { id },
            data
        });

        res.json(role);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// DELETE /:id - Delete role
router.delete('/:id', authenticate, authorize(['super_admin'], PERMISSIONS.ROLES_MANAGE), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if assigned to any admin
        const role = await prisma.role.findUnique({
            where: { id },
            include: { _count: { select: { admins: true } } }
        });

        if (!role) return res.status(404).json({ error: 'Role not found' });

        if (role._count.admins > 0) {
            return res.status(400).json({ error: 'Cannot delete role assigned to users' });
        }

        await prisma.role.delete({ where: { id } });

        res.json({ message: 'Role deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

export default router;
