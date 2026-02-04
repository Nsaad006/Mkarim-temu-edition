import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export interface Wholesaler {
    id: string;
    name: string;
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

const getAuthHeader = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const wholesalersApi = {
    getAll: async (search?: string) => {
        const params = search ? { search } : {};
        const response = await axios.get<Wholesaler[]>(`${API_URL}/wholesalers`, {
            params,
            headers: getAuthHeader()
        });
        return response.data;
    },

    getAllOrders: async () => {
        const response = await axios.get<WholesaleOrder[]>(`${API_URL}/wholesalers/orders`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await axios.get<Wholesaler>(`${API_URL}/wholesalers/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    create: async (data: Omit<Wholesaler, 'id' | 'createdAt' | 'orders'>) => {
        const response = await axios.post<Wholesaler>(`${API_URL}/wholesalers`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    createOrder: async (wholesalerId: string, data: { items: { productId: string; quantity: number; unitPrice: number }[]; advanceAmount: number }) => {
        const response = await axios.post<WholesaleOrder>(`${API_URL}/wholesalers/${wholesalerId}/orders`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    addPayment: async (orderId: string, amount: number, note?: string) => {
        const token = localStorage.getItem('auth_token');
        const response = await axios.post(`${API_URL}/wholesalers/orders/${orderId}/payments`, { amount, note }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    updateFullOrder: async (orderId: string, data: { items: any[], advanceAmount: number }) => {
        const token = localStorage.getItem('auth_token');
        const response = await axios.put(`${API_URL}/wholesalers/orders/${orderId}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    deleteOrder: async (orderId: string) => {
        const token = localStorage.getItem('auth_token');
        await axios.delete(`${API_URL}/wholesalers/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};
