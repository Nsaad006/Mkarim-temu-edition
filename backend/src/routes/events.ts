import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { addSSEClient, removeSSEClient } from '../lib/sse';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';

/**
 * GET /api/events
 * Server-Sent Events endpoint for real-time admin updates.
 * Auth: JWT token passed as ?token= query param (EventSource doesn't support headers).
 */
router.get('/', (req: Request, res: Response) => {
    // Authenticate via query param token (EventSource doesn't support Authorization header)
    const token = req.query.token as string;
    if (!token) {
        return res.status(401).json({ error: 'Token requis' });
    }

    let adminId: string;
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
        adminId = decoded.id;
    } catch {
        return res.status(401).json({ error: 'Token invalide' });
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    // Send initial ping to confirm connection
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ts: Date.now() })}\n\n`);

    // Register client
    const clientId = addSSEClient(res, adminId);

    // Heartbeat every 25s to prevent proxy timeouts
    const heartbeat = setInterval(() => {
        try {
            res.write(': heartbeat\n\n');
        } catch {
            clearInterval(heartbeat);
        }
    }, 25000);

    // Cleanup on disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        removeSSEClient(clientId);
    });
});

export default router;
