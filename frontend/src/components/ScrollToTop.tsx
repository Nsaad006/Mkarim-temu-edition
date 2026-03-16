import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const SCROLL_STORAGE_KEY = 'mkarim_scroll_pos_v3';

const loadSavedPositions = (): Record<string, number> => {
    try {
        const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

const ScrollToTop = () => {
    const location = useLocation();
    const navigationType = useNavigationType();
    const scrollPositions = useRef<Record<string, number>>(loadSavedPositions());
    const isRestoring = useRef(false);

    // Set manual restoration once
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    // Save scroll position
    useEffect(() => {
        let timeout: number;
        const handleScroll = () => {
            if (isRestoring.current) return;

            // Skip saving the very top if we just navigated (prevents overriding restoration with 0)
            if (window.scrollY === 0) return;

            window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                const key = location.pathname + location.search;
                scrollPositions.current[key] = window.scrollY;
                try {
                    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollPositions.current));
                } catch (e) { }
            }, 100);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.clearTimeout(timeout);
        };
    }, [location.pathname, location.search]);

    // Perform Restoration
    useLayoutEffect(() => {
        const key = location.pathname + location.search;
        const isProductDetail = location.pathname.startsWith('/product/');

        // Always scroll to top for product details (even on back)
        if (isProductDetail) {
            isRestoring.current = true;
            window.scrollTo(0, 0);
            setTimeout(() => { isRestoring.current = false; }, 150);
            return;
        }

        if (navigationType === 'POP') {
            const saved = scrollPositions.current[key];
            if (saved && saved > 0) {
                isRestoring.current = true;

                let attempts = 0;
                const maxAttempts = 40;

                const restore = () => {
                    attempts++;
                    const docHeight = document.documentElement.scrollHeight;

                    // If page is tall enough or we've tried for 4 seconds
                    if (docHeight >= saved || attempts >= maxAttempts) {
                        window.scrollTo(0, Math.min(saved, Math.max(0, docHeight - window.innerHeight)));
                        setTimeout(() => { isRestoring.current = false; }, 200);
                        return;
                    }

                    if (attempts < maxAttempts) {
                        setTimeout(restore, 100);
                    } else {
                        isRestoring.current = false;
                    }
                };

                restore();
            } else {
                // Default to top if no saved position
                window.scrollTo(0, 0);
            }
        } else if (navigationType === 'PUSH' || navigationType === 'REPLACE') {
            isRestoring.current = true;
            window.scrollTo(0, 0);
            setTimeout(() => { isRestoring.current = false; }, 150);
        }
    }, [location.pathname, location.search, navigationType]);

    return null;
};

export default ScrollToTop;
