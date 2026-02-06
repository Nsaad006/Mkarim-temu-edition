import apiClient from '@/lib/api-client';
import { Product } from '@/data/products';

export interface ProductFilters {
    categoryId?: string;
    inStock?: boolean;
    search?: string;
    featured?: boolean;
    published?: boolean;
}

export const productsApi = {
    // Get all products with optional filters
    getAll: async (filters?: ProductFilters): Promise<Product[]> => {
        const params = new URLSearchParams();
        if (filters?.categoryId) params.append('categoryId', filters.categoryId);
        if (filters?.inStock !== undefined) params.append('inStock', String(filters.inStock));
        if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
        if (filters?.published !== undefined) params.append('published', String(filters.published));
        if (filters?.search) params.append('search', filters.search);

        const { data } = await apiClient.get<Product[]>(`/api/products?${params}`);
        return data;
    },

    // Get single product by ID
    getById: async (id: string): Promise<Product> => {
        const { data } = await apiClient.get<Product>(`/api/products/${id}`);
        return data;
    },

    // Create product (admin)
    create: async (product: Omit<Product, 'id'>): Promise<Product> => {
        const { data } = await apiClient.post<Product>('/api/products', product);
        return data;
    },

    // Update product (admin)
    update: async (id: string, product: Partial<Product> & { password?: string }): Promise<Product> => {
        const { data } = await apiClient.put<Product>(`/api/products/${id}`, product);
        return data;
    },

    // Delete product (admin)
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/api/products/${id}`);
    },

    // Adjust cost price with password verification
    adjustCost: async (id: string, newUnitCostPrice: number, password: string): Promise<any> => {
        const { data } = await apiClient.post(`/api/products/${id}/adjust-cost`, {
            unitCostPrice: newUnitCostPrice,
            password
        });
        return data;
    },
};
