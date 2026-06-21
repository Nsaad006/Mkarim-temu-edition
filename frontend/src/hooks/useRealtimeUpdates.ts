import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Connects to the backend SSE endpoint and invalidates TanStack Query caches
 * whenever another admin performs a mutation.
 * Place this hook once in the AdminLayout so it's always active.
 */
export function useRealtimeUpdates() {
    const queryClient = useQueryClient();
    const esRef = useRef<EventSource | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        let stopped = false;

        const connect = () => {
            if (stopped) return;

            const url = `${API_BASE}/api/events?token=${encodeURIComponent(token)}`;
            const es = new EventSource(url);
            esRef.current = es;

            es.onopen = () => {
                console.log('[SSE] Connected to real-time updates');
            };

            es.onmessage = (event) => {
                try {
                    const { type, data } = JSON.parse(event.data);

                    switch (type) {
                        case 'CONNECTED':
                            break;

                        // ── Orders ──
                        case 'ORDER_CREATED':
                            queryClient.invalidateQueries({ queryKey: ['orders'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
                            queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
                            toast({
                                title: '🛒 Nouvelle commande',
                                description: `Commande ${data?.orderNumber} — ${data?.customerName}`,
                                duration: 5000,
                            });
                            break;

                        case 'ORDER_STATUS_UPDATED':
                        case 'ORDER_ITEMS_UPDATED':
                        case 'ORDER_DELETED':
                            queryClient.invalidateQueries({ queryKey: ['orders'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
                            queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
                            break;

                        // ── Products ──
                        case 'PRODUCT_CREATED':
                        case 'PRODUCT_UPDATED':
                        case 'PRODUCT_DELETED':
                            queryClient.invalidateQueries({ queryKey: ['products'] });
                            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
                            break;

                        // ── Categories ──
                        case 'CATEGORY_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['categories'] });
                            break;

                        // ── Customers ──
                        case 'CUSTOMER_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
                            queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
                            break;

                        // ── Cities ──
                        case 'CITY_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['admin-cities'] });
                            queryClient.invalidateQueries({ queryKey: ['cities'] });
                            break;

                        // ── Settings ──
                        case 'SETTINGS_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['settings'] });
                            break;

                        // ── Suppliers ──
                        case 'SUPPLIER_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
                            break;

                        // ── Promotions ──
                        case 'PROMOTION_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['promotions'] });
                            queryClient.invalidateQueries({ queryKey: ['promotions-public'] });
                            break;

                        // ── Procurements ──
                        case 'PROCUREMENT_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['procurements'] });
                            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
                            break;

                        // ── Wholesalers ──
                        case 'WHOLESALER_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['wholesalers'] });
                            queryClient.invalidateQueries({ queryKey: ['wholesale-orders'] });
                            break;

                        // ── Admin users & roles ──
                        case 'ADMIN_USER_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                            break;

                        case 'ROLE_CHANGED':
                            queryClient.invalidateQueries({ queryKey: ['roles'] });
                            break;

                        default:
                            break;
                    }
                } catch {
                    // Ignore malformed events
                }
            };

            es.onerror = () => {
                es.close();
                esRef.current = null;
                if (!stopped) {
                    // Auto-reconnect after 5 seconds
                    reconnectTimer.current = setTimeout(connect, 5000);
                }
            };
        };

        connect();

        return () => {
            stopped = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            esRef.current?.close();
            esRef.current = null;
        };
    }, [queryClient]);
}
