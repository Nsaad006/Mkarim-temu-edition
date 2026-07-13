import apiClient from '@/lib/api-client';

export interface CommissionRecord {
    id: string;
    agentId: string;
    orderId: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    month: number;
    year: number;
    createdAt: string;
    updatedAt: string;
    order: {
        id: string;
        orderNumber: string;
        customerName: string;
        total: number;
        status: string;
        createdAt: string;
    };
}

export interface CommissionPayment {
    id: string;
    agentId: string;
    amount: number;
    month: number;
    year: number;
    note?: string;
    createdAt: string;
}

export interface CommissionHistoryEntry {
    month: number;
    year: number;
    _sum: { amount: number | null };
}

export interface AgentCommissionData {
    month: number;
    year: number;
    totalEarned: number;
    totalPaid: number;
    pendingPayment: number;
    ordersPending: number;
    ordersConfirmed: number;
    ordersDelivered: number;
    records: CommissionRecord[];
    payments: CommissionPayment[];
    history: CommissionHistoryEntry[];
    agent?: { id: string; name: string; email: string; role: string };
}

export interface AgentSummary {
    id: string;
    name: string;
    email: string;
    role: string;
    totalEarned: number;
    totalPaid: number;
    pendingPayment: number;
    confirmedOrdersCount: number;
}

export interface GlobalCommissionData {
    month: number;
    year: number;
    agents: AgentSummary[];
}

export const commissionApi = {
    getMyStats: async (month?: number, year?: number): Promise<AgentCommissionData> => {
        const params: any = {};
        if (month) params.month = month;
        if (year) params.year = year;
        const { data } = await apiClient.get('/api/commission/me', { params });
        return data;
    },

    getAgentStats: async (agentId: string, month?: number, year?: number): Promise<AgentCommissionData> => {
        const params: any = {};
        if (month) params.month = month;
        if (year) params.year = year;
        const { data } = await apiClient.get(`/api/commission/agent/${agentId}`, { params });
        return data;
    },

    getAllAgents: async (month?: number, year?: number): Promise<GlobalCommissionData> => {
        const params: any = {};
        if (month) params.month = month;
        if (year) params.year = year;
        const { data } = await apiClient.get('/api/commission/agents', { params });
        return data;
    },

    payAgent: async (agentId: string, payload: { amount: number; month: number; year: number; note?: string }) => {
        const { data } = await apiClient.post(`/api/commission/pay/${agentId}`, payload);
        return data;
    }
};
