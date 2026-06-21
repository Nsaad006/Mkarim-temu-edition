import apiClient from '@/lib/api-client';

export interface Promotion {
    id: string;
    name: string;
    type: 'VOLUME_DISCOUNT' | 'PROMO_CODE';
    code?: string | null;
    discountType: 'PERCENT' | 'FIXED';
    discountValue: number;
    minQuantity?: number | null;
    productId?: string | null;
    minOrderTotal?: number | null;
    maxUses?: number | null;
    usedCount: number;
    active: boolean;
    expiresAt?: string | null;
    createdAt: string;
}

export const promotionsApi = {
    getPublic: async (): Promise<Promotion[]> => {
        const { data } = await apiClient.get('/api/promotions/public');
        return data;
    },
    getAll: async (): Promise<Promotion[]> => {
        const { data } = await apiClient.get('/api/promotions');
        return data;
    },
    create: async (payload: Omit<Promotion, 'id' | 'usedCount' | 'createdAt'>): Promise<Promotion> => {
        const { data } = await apiClient.post('/api/promotions', payload);
        return data;
    },
    update: async (id: string, payload: Partial<Promotion>): Promise<Promotion> => {
        const { data } = await apiClient.patch(`/api/promotions/${id}`, payload);
        return data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/api/promotions/${id}`);
    },
    validate: async (code: string, cartTotal: number): Promise<{ valid: boolean; promotion: Promotion; discountAmount: number }> => {
        const { data } = await apiClient.post('/api/promotions/validate', { code, cartTotal });
        return data;
    },
};
