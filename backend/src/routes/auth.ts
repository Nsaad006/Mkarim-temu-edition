import { Router, Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        permissions?: string[];
    };
}
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        // Find user in database with assigned role and permissions
        const admin = await prisma.admin.findUnique({
            where: { email },
            include: { assignedRole: true }
        });

        // Check if admin exists and is active
        if (!admin || !admin.active) {
            return res.status(401).json({ error: 'Identifiants invalides ou compte désactivé' });
        }

        // Compare password using bcrypt
        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Identifiants invalides ou compte désactivé' });
        }

        const permissions = admin.assignedRole?.permissions || [];

        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin.id,
                email: admin.email,
                role: admin.role,
                permissions: permissions
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            token,
            user: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                permissions: permissions
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Middleware to verify JWT
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: string;
            email: string;
            role: string;
            permissions?: string[];
        };
        (req as AuthenticatedRequest).user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Middleware to authorize roles OR permissions
export const authorize = (allowedRoles: string[], requiredPermission?: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthenticatedRequest).user;

        if (!user) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        // 1. Check Legacy/Static Role match
        if (allowedRoles.includes(user.role)) {
            return next();
        }

        // 2. Check Permission (if this route requires one and user has it)
        if (requiredPermission) {
            const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
            if (perms.some(p => user.permissions?.includes(p))) {
                return next();
            }
        }

        return res.status(403).json({ error: 'Accès refusé - Privilèges insuffisants' });
    };
};

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthenticatedRequest).user?.id;
        const admin = await prisma.admin.findUnique({
            where: { id: userId },
            include: { assignedRole: true }
        });

        if (admin) {
            return res.json({
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                permissions: admin.assignedRole?.permissions || []
            });
        }

        res.status(404).json({ error: 'User not found' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

export default router;
