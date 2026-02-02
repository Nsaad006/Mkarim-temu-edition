import apiClient from '@/lib/api-client';

export interface GlobalSettings {
    id?: string;
    // Store Settings
    storeName: string;
    storeAvailability: boolean;
    codEnabled: boolean;
    freeShippingEnabled?: boolean;
    freeShippingThreshold?: number;
    whatsappNumber: string;
    currency: string;
    logo?: string;

    // Contact Information
    contactAddress: string;
    contactPhone: string;
    contactEmail: string;
    contactHours: string;

    // Footer Content
    footerDescription: string;
    footerCopyright: string;

    // Social Media Links
    facebookLink?: string;
    instagramLink?: string;
    twitterLink?: string;
    youtubeLink?: string;
    tiktokLink?: string;

    // Home Page Content
    heroImage?: string;
    heroSubtitle?: string;
    heroTitle?: string;
    heroDescription?: string;
    heroPrimaryBtnText?: string;
    heroPrimaryBtnLink?: string;
    heroSecondaryBtnText?: string;
    heroSecondaryBtnLink?: string;

    categoriesTitle?: string;
    categoriesSubtitle?: string;

    featuredTitle?: string;
    featuredSubtitle?: string;

    whyTitle?: string;
    whySubtitle?: string;

    ctaTitle?: string;
    ctaSubtitle?: string;
    ctaPrimaryBtnText?: string;
    ctaPrimaryBtnLink?: string;
    ctaSecondaryBtnText?: string;
    ctaSecondaryBtnLink?: string;

    // About Page Content
    aboutTitle: string;
    aboutDescription: string;
    aboutMission: string;
    aboutMissionDetails?: string;
    aboutImage?: string;
    aboutHeroImage?: string;
    aboutHeroOverlayOpacity?: number;
    aboutHeroBlur?: number;
    homeHeroOverlayOpacity?: number;
    homeHeroBlur?: number;
    homeHeroAutoPlayInterval?: number;
    categoriesAutoPlayInterval?: number;
    aboutValues?: any;

    updatedAt: string;
    createdAt?: string;

    // Low Stock Settings
    lowStockThreshold?: number;

    // Email Configuration
    emailSenderName?: string;
    emailGmailUser?: string;
    emailClientId?: string;
    emailClientSecret?: string;
    emailRefreshToken?: string;
    emailAdminReceiver?: string;
    emailEnabled?: boolean;
}

export const settingsApi = {
    // Get current settings
    get: async (): Promise<GlobalSettings> => {
        const { data } = await apiClient.get<GlobalSettings>('/api/settings');
        return data;
    },

    // Update settings (admin)
    update: async (settings: Partial<GlobalSettings>): Promise<GlobalSettings> => {
        const { data } = await apiClient.put<GlobalSettings>('/api/settings', settings);
        return data;
    }
};
