import apiClient from '@/lib/api-client';
import { Order } from '@/data/mock-admin-data';

export interface CreateOrderItemData {
    productId: string;
    quantity: number;
    price?: number;
    selectedVariants?: Record<string, string>;
}

export interface CreateOrderData {
    items: CreateOrderItemData[];
    customerName: string;
    email?: string;
    phone: string;
    city: string;
    address: string;
    bypassStockCheck?: boolean;
}

export const ordersApi = {
    // Create new order (Multi-item)
    create: async (orderData: CreateOrderData): Promise<Order> => {
        const { data } = await apiClient.post<Order>('/api/orders', orderData);
        return data;
    },

    // Get all orders (admin)
    getAll: async (filters?: { status?: string; city?: string }): Promise<Order[]> => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.city) params.append('city', filters.city);

        const { data } = await apiClient.get<Order[]>(`/api/orders?${params}`);
        return data;
    },

    // Get order by ID
    getById: async (id: string): Promise<Order> => {
        const { data } = await apiClient.get<Order>(`/api/orders/${id}`);
        return data;
    },

    // Handle partial item returns
    partialReturn: async (id: string, items: { productId: string, quantity: number }[], returnReason?: string): Promise<Order> => {
        const { data } = await apiClient.post<Order>(`/api/orders/${id}/partial-return`, { items, returnReason });
        return data;
    },

    // Update order status (admin)
    updateStatus: async (id: string, status: string, returnReason?: string): Promise<Order> => {
        const { data } = await apiClient.patch<Order>(`/api/orders/${id}/status`, { status, returnReason });
        return data;
    },

    // Update order items (admin)
    updateItems: async (id: string, items: { productId: string; quantity: number; price: number; selectedVariants?: Record<string, string> }[]): Promise<Order> => {
        const { data } = await apiClient.put<Order>(`/api/orders/${id}/items`, { items });
        return data;
    },

    // Delete single order (super_admin only)
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/api/orders/${id}`);
    },

    // Bulk delete orders (super_admin only)
    bulkDelete: async (ids: string[]): Promise<{ success: boolean; deleted: number }> => {
        const { data } = await apiClient.post('/api/orders/bulk-delete', { ids });
        return data;
    },

    // Send invoice email
    sendInvoiceEmail: async (id: string, pdfBlob: Blob) => {
        const formData = new FormData();
        formData.append('invoice', pdfBlob, 'facture.pdf');

        const { data } = await apiClient.post(`/api/orders/${id}/email-invoice`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    }
};
