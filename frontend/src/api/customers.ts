import apiClient from '@/lib/api-client';

export interface Customer {
    id: string; // Phone or unique identifier used in routes
    dbId: string; // The primary UUID from database
    name: string;
    phone: string;
    email: string;
    city: string;
    address: string;
    isFavorite: boolean;
    isLoyal: boolean;
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

    // Create a customer manually
    create: async (customerData: Partial<Customer>): Promise<Customer> => {
        const { data } = await apiClient.post<Customer>('/api/customers', customerData);
        return data;
    },

    // Update a customer (flags, contact info, etc.)
    update: async (dbId: string, customerData: Partial<Customer>): Promise<Customer> => {
        const { data } = await apiClient.patch<Customer>(`/api/customers/${dbId}`, customerData);
        return data;
    },

    // Get orders for a specific customer
    getCustomerOrders: async (customerId: string): Promise<any[]> => {
        const { data } = await apiClient.get(`/api/customers/${customerId}/orders`);
        return data;
    },
};

