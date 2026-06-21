import apiClient from '@/lib/api-client';

export interface Wholesaler {
    id: string;
    type: 'PARTICULIER' | 'ENTREPRISE';
    name: string;
    ice?: string;
    responsibleName?: string;
    address: string;
    phone: string;
    email?: string;
    createdAt: string;
    orders?: WholesaleOrder[];
    _count?: {
        orders: number;
    };
}

export interface WholesalePayment {
    id: string;
    wholesaleOrderId: string;
    amount: number;
    date: string;
    note?: string;
}

export interface WholesaleOrder {
    id: string;
    wholesalerId: string;
    orderNumber: string;
    totalAmount: number;
    advanceAmount: number;
    status: 'PENDING' | 'PAID';
    createdAt: string;
    items: WholesaleOrderItem[];
    payments?: WholesalePayment[];
}

export interface WholesaleOrderItem {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    product: {
        name: string;
        image: string;
    };
}

export const wholesalersApi = {
    getAll: async (search?: string) => {
        const params = search ? { search } : {};
        const { data } = await apiClient.get<Wholesaler[]>('/api/wholesalers', { params });
        return data;
    },

    getAllOrders: async () => {
        const { data } = await apiClient.get<WholesaleOrder[]>('/api/wholesalers/orders');
        return data;
    },

    getById: async (id: string) => {
        const { data } = await apiClient.get<Wholesaler>(`/api/wholesalers/${id}`);
        return data;
    },

    create: async (data: Omit<Wholesaler, 'id' | 'createdAt' | 'orders'>) => {
        const { data: result } = await apiClient.post<Wholesaler>('/api/wholesalers', data);
        return result;
    },

    update: async (id: string, data: Partial<Omit<Wholesaler, 'id' | 'createdAt' | 'orders'>>) => {
        const { data: result } = await apiClient.put<Wholesaler>(`/api/wholesalers/${id}`, data);
        return result;
    },

    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/api/wholesalers/${id}`);
        return data;
    },

    createOrder: async (wholesalerId: string, data: { items: { productId: string; quantity: number; unitPrice: number }[]; advanceAmount: number }) => {
        const { data: result } = await apiClient.post<WholesaleOrder>(`/api/wholesalers/${wholesalerId}/orders`, data);
        return result;
    },

    addPayment: async (orderId: string, amount: number, note?: string) => {
        const { data } = await apiClient.post(`/api/wholesalers/orders/${orderId}/payments`, { amount, note });
        return data;
    },

    updateFullOrder: async (orderId: string, data: { items: any[], advanceAmount: number }) => {
        const { data: result } = await apiClient.put(`/api/wholesalers/orders/${orderId}`, data);
        return result;
    },

    deleteOrder: async (orderId: string) => {
        await apiClient.delete(`/api/wholesalers/orders/${orderId}`);
    },

    sendInvoiceEmail: async (orderId: string, pdfBlob: Blob) => {
        const formData = new FormData();
        formData.append('invoice', pdfBlob, 'facture.pdf');
        const { data } = await apiClient.post(`/api/wholesalers/orders/${orderId}/email-invoice`, formData);
        return data;
    }
};
