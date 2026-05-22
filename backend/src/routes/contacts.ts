import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from './auth';
import { z } from 'zod';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();
const prisma = new PrismaClient();

// Validation schema for contact submission
const contactSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    subject: z.string().min(1, 'Subject is required'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
});

// Public endpoint - Submit contact form
router.post('/', async (req: Request, res: Response) => {
    try {
        const validatedData = contactSchema.parse(req.body);

        const contact = await prisma.contact.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                phone: validatedData.phone || null,
                subject: validatedData.subject,
                message: validatedData.message,
            },
        });

        res.status(201).json({
            message: 'Contact form submitted successfully',
            id: contact.id,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues
            });
        }
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Failed to submit contact form' });
    }
});

// Admin endpoint - Get all contacts
router.get('/', authenticate, authorize(['super_admin', 'editor', 'viewer'], PERMISSIONS.MESSAGES_VIEW), async (req: Request, res: Response) => {
    try {
        const contacts = await prisma.contact.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

// Admin endpoint - Update contact status
router.patch('/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.MESSAGES_MANAGE), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const contact = await prisma.contact.update({
            where: { id },
            data: { status },
        });

        res.json(contact);
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

// Admin endpoint - Delete contact
router.delete('/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.MESSAGES_MANAGE), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.contact.delete({
            where: { id },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

export default router;
