import apiClient from '@/lib/api-client';

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: string;
    roleId?: string | null;
    assignedRole?: {
        id: string;
        name: string;
        permissions: string[];
    };
    active: boolean;
    allowedCategories?: string[];
}

export const adminsApi = {
    getAll: async (): Promise<AdminUser[]> => {
        const { data } = await apiClient.get<AdminUser[]>('/api/admins');
        return data;
    },
    create: async (data: Omit<AdminUser, 'id' | 'active'> & { password?: string }): Promise<AdminUser> => {
        const { data: response } = await apiClient.post<AdminUser>('/api/admins', data);
        return response;
    },
    updateStatus: async (id: string, active: boolean): Promise<AdminUser> => {
        const { data } = await apiClient.patch<AdminUser>(`/api/admins/${id}/status`, { active });
        return data;
    },
    updateRole: async (id: string, role: string): Promise<AdminUser> => {
        const { data } = await apiClient.patch<AdminUser>(`/api/admins/${id}/role`, { role });
        return data;
    },
    updatePassword: async (id: string, password: string, currentPassword?: string): Promise<AdminUser> => {
        const { data } = await apiClient.patch<AdminUser>(`/api/admins/${id}/password`, { password, currentPassword });
        return data;
    },
    updateCategories: async (id: string, allowedCategories: string[]): Promise<AdminUser> => {
        const { data } = await apiClient.patch<AdminUser>(`/api/admins/${id}/categories`, { allowedCategories });
        return data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/api/admins/${id}`);
    }
};
