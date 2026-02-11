import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    console.warn('⚠️ VITE_API_URL is not set. Defaulting to localhost:3001. API calls will likely fail in production.');
}

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for auth and logging
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (import.meta.env.DEV) {
            console.log(`🔵 ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
            window.location.href = '/login';
        }

        if (import.meta.env.DEV) {
            console.error('🔴 API Error:', error.response?.data || error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
