import apiClient from '@/lib/api-client';

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    city: string;
    address: string;
    ordersCount: number;
    totalSpent: number;
    lastOrderDate: string;
}

export const customersApi = {
    // Get all unique customers derived from orders
    getAll: async (): Promise<Customer[]> => {
        const { data } = await apiClient.get<Customer[]>('/api/customers');
        return data;
    },

    // Get orders for a specific customer
    getCustomerOrders: async (customerId: string): Promise<any[]> => {
        const { data } = await apiClient.get(`/api/customers/${customerId}/orders`);
        return data;
    },
};

