import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';
import bcrypt from 'bcryptjs';
import { broadcastEvent, SSE_EVENTS } from '../lib/sse';

const router = Router();

// Validate against legacy roles OR allow any string (UUID for dynamic roles)
const createAdminSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.string(), // Can be legacy role name OR role UUID
    allowedCategories: z.array(z.string()).optional(),
});

const LEGACY_ROLES = ['super_admin', 'editor', 'viewer', 'commercial', 'magasinier'];

// Helper to determine role fields
async function resolveRole(roleInput: string) {
    if (LEGACY_ROLES.includes(roleInput)) {
        return { role: roleInput, roleId: null };
    }

    // Check if it's a dynamic role ID
    // We could validate UUID format but finding it is safer
    const dynamicRole = await prisma.role.findUnique({ where: { id: roleInput } });
    if (dynamicRole) {
        return { role: dynamicRole.name, roleId: roleInput };
    }

    throw new Error("Rôle invalide");
}

// GET /api/admins - List all admins
router.get('/', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_VIEW), async (req: Request, res: Response) => {
    try {
        const admins = await prisma.admin.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                active: true,
                createdAt: true,
                roleId: true,
                allowedCategories: true,
                assignedRole: {
                    select: { id: true, name: true, permissions: true }
                }
            }
        });
        res.json(admins);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

// POST /api/admins - Create new admin
router.post('/', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_MANAGE), async (req: Request, res: Response) => {
    try {
        const validatedData = createAdminSchema.parse(req.body);

        // Check if email already exists
        const existing = await prisma.admin.findUnique({
            where: { email: validatedData.email }
        });

        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        let roleFields;
        try {
            roleFields = await resolveRole(validatedData.role);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        const newAdmin = await prisma.admin.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                active: true,
                allowedCategories: validatedData.allowedCategories || [],
                ...roleFields
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                roleId: true,
                allowedCategories: true,
                assignedRole: { select: { name: true } },
                active: true,
                createdAt: true
            }
        });

        broadcastEvent(SSE_EVENTS.ADMIN_USER_CHANGED);
        res.status(201).json(newAdmin);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

// DELETE /api/admins/:id - Delete an admin
router.delete('/:id', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_MANAGE), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

        const admin = await prisma.admin.findUnique({
            where: { id }
        });

        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        // Prevent deleting the main admin
        if (admin.email === 'admin@mkarim.ma') {
            return res.status(403).json({ error: 'Main admin cannot be deleted' });
        }

        await prisma.admin.delete({
            where: { id }
        });

        broadcastEvent(SSE_EVENTS.ADMIN_USER_CHANGED);
        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

// PATCH /api/admins/:id/status - Update admin status
router.patch('/:id/status', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_MANAGE), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const { active } = req.body;

        const updatedAdmin = await prisma.admin.update({
            where: { id },
            data: { active },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                active: true,
                createdAt: true
            }
        });

        broadcastEvent(SSE_EVENTS.ADMIN_USER_CHANGED);
        res.json(updatedAdmin);
    } catch (error) {
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// PATCH /api/admins/:id/role - Update admin role
router.patch('/:id/role', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_MANAGE), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const { role } = req.body;

        const admin = await prisma.admin.findUnique({ where: { id } });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        // Prevent changing the main admin's role
        if (admin.email === 'admin@mkarim.ma') {
            return res.status(403).json({ error: 'Cannot change main admin role' });
        }

        let roleFields;
        try {
            roleFields = await resolveRole(role);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const updatedAdmin = await prisma.admin.update({
            where: { id },
            data: roleFields,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                roleId: true,
                assignedRole: { select: { name: true } },
                active: true,
                createdAt: true
            }
        });

        broadcastEvent(SSE_EVENTS.ADMIN_USER_CHANGED);
        res.json(updatedAdmin);
    } catch (error) {
        console.error("Error updating role:", error);
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// PATCH /api/admins/:id/categories - Update admin allowed categories
router.patch('/:id/categories', authenticate, authorize(['super_admin'], PERMISSIONS.USERS_MANAGE), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const { allowedCategories } = req.body;

        const admin = await prisma.admin.findUnique({ where: { id } });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        if (!Array.isArray(allowedCategories)) {
            return res.status(400).json({ error: 'allowedCategories must be an array' });
        }

        const updatedAdmin = await prisma.admin.update({
            where: { id },
            data: { allowedCategories },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                roleId: true,
                allowedCategories: true,
                assignedRole: { select: { name: true } },
                active: true,
                createdAt: true
            }
        });

        broadcastEvent(SSE_EVENTS.ADMIN_USER_CHANGED);
        res.json(updatedAdmin);
    } catch (error) {
        console.error("Error updating categories:", error);
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(500).json({ error: 'Failed to update categories' });
    }
});

// PATCH /api/admins/:id/password - Update admin password
// Self-change: requires currentPassword. Super-admin/USERS_MANAGE changing another: no old password needed.
router.patch('/:id/password', authenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        if (!user) return res.status(403).json({ error: 'Accès refusé' });

        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

        const isSelf = user.id === id;
        const isSuperAdmin = user.role === 'super_admin';
        const hasPermission = Array.isArray(user.permissions) && user.permissions.includes(PERMISSIONS.USERS_MANAGE);

        if (!isSelf && !isSuperAdmin && !hasPermission) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        const { password, currentPassword } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 6 caractères' });
        }

        const admin = await prisma.admin.findUnique({ where: { id } });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        // The main admin's password can only be changed by the main admin themselves
        if (admin.email === 'admin@mkarim.ma' && !isSelf) {
            return res.status(403).json({ error: 'Seul l\'Admin Principal peut modifier son propre mot de passe.' });
        }

        // When changing own password, always verify the current one
        if (isSelf) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Le mot de passe actuel est requis' });
            }
            const isValid = await bcrypt.compare(currentPassword, admin.password);
            if (!isValid) {
                return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedAdmin = await prisma.admin.update({
            where: { id },
            data: { password: hashedPassword },
            select: { id: true, email: true, name: true, role: true, active: true, createdAt: true }
        });

        res.json(updatedAdmin);
    } catch (error) {
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(500).json({ error: 'Failed to update password' });
    }
});

export default router;
