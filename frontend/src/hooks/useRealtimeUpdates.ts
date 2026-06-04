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
                            // Initial connection confirmation — no action needed
                            break;

                        case 'ORDER_CREATED':
                            queryClient.invalidateQueries({ queryKey: ['orders'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
                            toast({
                                title: '🛒 Nouvelle commande',
                                description: `Commande ${data?.orderNumber} — ${data?.customerName}`,
                                duration: 5000,
                            });
                            break;

                        case 'ORDER_STATUS_UPDATED':
                            queryClient.invalidateQueries({ queryKey: ['orders'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
                            break;

                        case 'ORDER_ITEMS_UPDATED':
                            queryClient.invalidateQueries({ queryKey: ['orders'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
                            break;

                        case 'ORDER_DELETED':
                            queryClient.invalidateQueries({ queryKey: ['orders'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
                            break;

                        case 'PRODUCT_CREATED':
                        case 'PRODUCT_UPDATED':
                        case 'PRODUCT_DELETED':
                            queryClient.invalidateQueries({ queryKey: ['products'] });
                            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
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
