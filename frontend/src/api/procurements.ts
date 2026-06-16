import apiClient from "@/lib/api-client";

export const procurementsApi = {
    getAll: async () => {
        const { data } = await apiClient.get('/api/procurements');
        return data;
    },
    create: async (data: {
        supplierId: string;
        productId: string;
        quantityPurchased: number;
        unitCostPrice: number;
        purchaseDate?: string;
    }) => {
        const { data: result } = await apiClient.post('/api/procurements', data);
        return result;
    },
    deleteOne: async (id: string) => {
        const { data } = await apiClient.delete(`/api/procurements/${id}`);
        return data;
    },
    deleteBulk: async (ids: string[]) => {
        const { data } = await apiClient.delete('/api/procurements/bulk', { data: { ids } });
        return data;
    },
};
