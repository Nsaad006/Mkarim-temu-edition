import apiClient from '@/lib/api-client';

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        permissions?: string[];
    };
}

export interface LoginCredentials {
    email: string;
    password?: string;
}

export const authApi = {
    // Login
    login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
        const { data } = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
        // Save token to localStorage
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    },

    // Get current user
    me: async (): Promise<LoginResponse['user']> => {
        const { data } = await apiClient.get<LoginResponse['user']>('/api/auth/me');
        return data;
    },

    // Logout
    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
    }
};
