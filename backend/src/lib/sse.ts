import { Response } from 'express';

interface SSEClient {
    id: string;
    res: Response;
    adminId: string;
}

// In-memory list of connected SSE clients
const clients: SSEClient[] = [];

let clientIdCounter = 0;

/**
 * Register a new SSE client connection
 */
export function addSSEClient(res: Response, adminId: string): string {
    const id = `sse_${++clientIdCounter}`;
    clients.push({ id, res, adminId });
    console.log(`[SSE] Client connected: ${id} (admin: ${adminId}) — total: ${clients.length}`);
    return id;
}

/**
 * Remove a disconnected SSE client
 */
export function removeSSEClient(id: string): void {
    const idx = clients.findIndex(c => c.id === id);
    if (idx > -1) {
        clients.splice(idx, 1);
        console.log(`[SSE] Client disconnected: ${id} — total: ${clients.length}`);
    }
}

/**
 * Broadcast an event to ALL connected admin clients
 * (optionally exclude the sender)
 */
export function broadcastEvent(type: string, data?: any, excludeAdminId?: string): void {
    const payload = `data: ${JSON.stringify({ type, data, ts: Date.now() })}\n\n`;
    let sent = 0;

    clients.forEach(client => {
        if (excludeAdminId && client.adminId === excludeAdminId) return;
        try {
            client.res.write(payload);
            sent++;
        } catch (err) {
            // Client disconnected without cleanup — remove it
            removeSSEClient(client.id);
        }
    });

    if (clients.length > 0) {
        console.log(`[SSE] Broadcast "${type}" → ${sent}/${clients.length} clients`);
    }
}

export const SSE_EVENTS = {
    // Orders
    ORDER_CREATED:        'ORDER_CREATED',
    ORDER_STATUS_UPDATED: 'ORDER_STATUS_UPDATED',
    ORDER_ITEMS_UPDATED:  'ORDER_ITEMS_UPDATED',
    ORDER_DELETED:        'ORDER_DELETED',

    // Products
    PRODUCT_CREATED:      'PRODUCT_CREATED',
    PRODUCT_UPDATED:      'PRODUCT_UPDATED',
    PRODUCT_DELETED:      'PRODUCT_DELETED',

    // Categories
    CATEGORY_CHANGED:     'CATEGORY_CHANGED',

    // Customers
    CUSTOMER_CHANGED:     'CUSTOMER_CHANGED',

    // Cities
    CITY_CHANGED:         'CITY_CHANGED',

    // Settings
    SETTINGS_CHANGED:     'SETTINGS_CHANGED',

    // Suppliers
    SUPPLIER_CHANGED:     'SUPPLIER_CHANGED',

    // Promotions
    PROMOTION_CHANGED:    'PROMOTION_CHANGED',

    // Procurements
    PROCUREMENT_CHANGED:  'PROCUREMENT_CHANGED',

    // Wholesalers
    WHOLESALER_CHANGED:   'WHOLESALER_CHANGED',

    // Admin users & roles
    ADMIN_USER_CHANGED:   'ADMIN_USER_CHANGED',
    ROLE_CHANGED:         'ROLE_CHANGED',

    // Commission
    COMMISSION_CHANGED:   'COMMISSION_CHANGED',

    // Stats / generic
    STATS_UPDATED:        'STATS_UPDATED',
};
