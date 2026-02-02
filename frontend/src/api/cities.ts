import apiClient from '@/lib/api-client';
import { City } from "@/data/mock-admin-data";

export { type City };

export const citiesApi = {
    // Get all cities
    getAll: async (params?: { includeInactive?: boolean }): Promise<City[]> => {
        const { data } = await apiClient.get<City[]>('/api/cities', { params });
        return data;
    },

    // Create city (admin)
    create: async (city: Omit<City, 'id'>): Promise<City> => {
        const { data } = await apiClient.post<City>('/api/cities', city);
        return data;
    },

    // Update city (admin)
    update: async (id: string, city: Partial<City>): Promise<City> => {
        const { data } = await apiClient.put<City>(`/api/cities/${id}`, city);
        return data;
    },
};


