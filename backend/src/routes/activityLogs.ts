import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';
import { z } from 'zod';

const router = Router();

const logSchema = z.object({
  action: z.string().min(1),
  userType: z.string().optional().default('guest'),
  userId: z.string().optional(),
  userEmail: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// POST /api/logs — receive a log event from frontend
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = logSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid log data' });

    const { action, userType, userId, userEmail, metadata } = parsed.data;

    await prisma.activityLog.create({
      data: {
        action,
        userType: userType || 'guest',
        userId: userId || null,
        userEmail: userEmail || null,
        metadata: metadata || {},
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Error saving activity log:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Mapping from new specific action types to legacy metadata.newStatus values
const LEGACY_STATUS_MAP: Record<string, string> = {
  ORDER_CONFIRMED: 'CONFIRMED',
  ORDER_SHIPPED:   'SHIPPED',
  ORDER_DELIVERED: 'DELIVERED',
  ORDER_CANCELLED: 'CANCELLED',
  ORDER_PENDING:   'PENDING',
};

// GET /api/logs — admin: paginated list with filters
router.get('/', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.ANALYTICS_VIEW]), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
    const action = req.query.action as string | undefined;
    const userEmail = req.query.userEmail as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const search = req.query.search as string | undefined;

    // When a free-text search is provided, use raw SQL so we can do ILIKE on
    // metadata::text (covers orderNumber, productName, categoryName, etc.)
    if (search) {
      const searchPat = `%${search}%`;

      const conditions: Prisma.Sql[] = [
        Prisma.sql`metadata::text ILIKE ${searchPat}`,
      ];

      if (action) {
        const legacyStatus = LEGACY_STATUS_MAP[action];
        if (legacyStatus) {
          conditions.push(
            Prisma.sql`(action = ${action} OR (action = 'ORDER_STATUS_CHANGED' AND metadata->>'newStatus' = ${legacyStatus}))`
          );
        } else {
          conditions.push(Prisma.sql`action = ${action}`);
        }
      }

      if (userEmail) conditions.push(Prisma.sql`"userEmail" ILIKE ${'%' + userEmail + '%'}`);
      if (from) conditions.push(Prisma.sql`timestamp >= ${new Date(from)}`);
      if (to) conditions.push(Prisma.sql`timestamp <= ${new Date(to)}`);

      const whereClause = conditions.reduce((acc, part) => Prisma.sql`${acc} AND ${part}`);

      const [logs, countResult] = await Promise.all([
        prisma.$queryRaw<any[]>(
          Prisma.sql`SELECT * FROM "ActivityLog" WHERE ${whereClause} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`
        ),
        prisma.$queryRaw<[{ count: bigint }]>(
          Prisma.sql`SELECT COUNT(*) as count FROM "ActivityLog" WHERE ${whereClause}`
        ),
      ]);

      const total = Number(countResult[0].count);
      return res.json({ logs, total, page, pages: Math.ceil(total / limit), limit });
    }

    // No search — use Prisma ORM for the normal case
    const where: any = {};

    if (action) {
      const legacyStatus = LEGACY_STATUS_MAP[action];
      if (legacyStatus) {
        where.OR = [
          { action },
          { action: 'ORDER_STATUS_CHANGED', metadata: { path: ['newStatus'], equals: legacyStatus } },
        ];
      } else {
        where.action = action;
      }
    }

    if (userEmail) where.userEmail = { contains: userEmail, mode: 'insensitive' };
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit), limit });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST /api/logs/migrate-order-actions — one-time migration to convert legacy ORDER_STATUS_CHANGED
// entries to the specific action types (ORDER_CONFIRMED, ORDER_SHIPPED, etc.)
router.post('/migrate-order-actions', authenticate, authorize(['super_admin'], []), async (req: Request, res: Response) => {
  try {
    const updates = await Promise.all(
      Object.entries(LEGACY_STATUS_MAP).map(([newAction, status]) =>
        prisma.$executeRaw`
          UPDATE "ActivityLog"
          SET action = ${newAction}
          WHERE action = 'ORDER_STATUS_CHANGED'
            AND metadata->>'newStatus' = ${status}
        `
      )
    );
    const total = updates.reduce((sum, n) => sum + Number(n), 0);
    res.json({ migrated: total });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// POST /api/logs/migrate-order-numbers — backfill orderNumber into metadata for old logs
router.post('/migrate-order-numbers', authenticate, authorize(['super_admin'], []), async (req: Request, res: Response) => {
  try {
    const orderActions = [
      'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED',
      'ORDER_CANCELLED', 'ORDER_PENDING', 'ORDER_EDITED',
      'ORDER_DELETED', 'ORDER_RETURN',
    ];

    const logs = await prisma.activityLog.findMany({
      where: { action: { in: orderActions } },
    });

    let updated = 0;
    for (const log of logs) {
      const meta = (log.metadata || {}) as Record<string, any>;
      if (meta.orderId && !meta.orderNumber) {
        const order = await prisma.order.findUnique({
          where: { id: meta.orderId },
          select: { orderNumber: true },
        });
        if (order?.orderNumber) {
          await prisma.activityLog.update({
            where: { id: log.id },
            data: { metadata: { ...meta, orderNumber: order.orderNumber } },
          });
          updated++;
        }
      }
    }

    res.json({ migrated: updated });
  } catch (error) {
    console.error('Order number migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// DELETE /api/logs/cleanup — admin: clear logs older than 30 days
router.delete('/cleanup', authenticate, authorize(['super_admin'], []), async (req: Request, res: Response) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const { count } = await prisma.activityLog.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });
    res.json({ deleted: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup logs' });
  }
});

// DELETE /api/logs/all — super_admin only: delete ALL logs
router.delete('/all', authenticate, authorize(['super_admin'], []), async (req: Request, res: Response) => {
  try {
    const { count } = await prisma.activityLog.deleteMany({});
    res.json({ deleted: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete logs' });
  }
});

export default router;
