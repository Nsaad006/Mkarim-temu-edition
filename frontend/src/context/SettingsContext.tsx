import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi, GlobalSettings } from "@/api/settings";

interface SettingsContextType {
    settings: GlobalSettings | undefined;
    isLoading: boolean;
    formatPrice: (price: number) => string;
    currency: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsApi.get(),
    });

    const currency = settings?.currency || "DH";
    const API_URL = import.meta.env.VITE_API_URL || '';

    // Update dynamic favicon
    React.useEffect(() => {
        if (settings?.favicon) {
            const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            const faviconUrl = settings.favicon.startsWith('http')
                ? settings.favicon
                : `${API_URL}${settings.favicon}`;

            if (link) {
                link.href = faviconUrl;
            } else {
                const newLink = document.createElement('link');
                newLink.rel = 'icon';
                newLink.href = faviconUrl;
                document.getElementsByTagName('head')[0].appendChild(newLink);
            }
        }
    }, [settings?.favicon, API_URL]);

    const formatPrice = (price: number) => {
        return `${price.toLocaleString()} ${currency}`;
    };

    return (
        <SettingsContext.Provider value={{ settings, isLoading, formatPrice, currency }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};
