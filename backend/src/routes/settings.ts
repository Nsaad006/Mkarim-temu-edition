import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';
import { broadcastEvent, SSE_EVENTS } from '../lib/sse';

const router = Router();

// GET /api/settings - Public settings
router.get('/', async (req: Request, res: Response) => {
    try {
        // Get or create settings (singleton pattern)
        let settings = await prisma.settings.findFirst();

        if (!settings) {
            // Create default settings if none exist
            settings = await prisma.settings.create({
                data: {}
            });
        }

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT /api/settings - Update settings (super_admin and editor)
router.put('/', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.SETTINGS_MANAGE), async (req: Request, res: Response) => {
    try {
        const {
            storeName,
            storeAvailability,
            codEnabled,
            freeShippingEnabled,
            freeShippingThreshold,
            whatsappNumber,
            currency,
            contactAddress,
            contactPhone,
            contactEmail,
            contactHours,
            footerDescription,
            footerCopyright,
            aboutTitle,
            aboutDescription,
            aboutMission,
            facebookLink,
            instagramLink,
            twitterLink,
            youtubeLink,
            tiktokLink,
            categoriesTitle,
            categoriesSubtitle,
            featuredTitle,
            featuredSubtitle,
            whyTitle,
            whySubtitle,
            whyFeatures,
            cartShippingText,
            ctaTitle,
            ctaSubtitle,
            ctaPrimaryBtnText,
            ctaPrimaryBtnLink,
            ctaSecondaryBtnText,
            ctaSecondaryBtnLink,
            lowStockThreshold,
            favicon
        } = req.body;

        // Debug logging for free shipping
        console.log('Received free shipping settings:', {
            freeShippingEnabled,
            freeShippingThreshold,
            rawBody: { freeShippingEnabled: req.body.freeShippingEnabled, freeShippingThreshold: req.body.freeShippingThreshold }
        });

        // Get existing settings or create if none exist
        let settings = await prisma.settings.findFirst();

        if (!settings) {
            settings = await prisma.settings.create({
                data: {}
            });
        }

        // Update settings
        const updatedSettings = await prisma.settings.update({
            where: { id: settings.id },
            data: {
                ...(storeName !== undefined && { storeName }),
                ...(storeAvailability !== undefined && { storeAvailability }),
                ...(codEnabled !== undefined && { codEnabled }),
                ...(freeShippingEnabled !== undefined && { freeShippingEnabled: Boolean(freeShippingEnabled) }),
                ...(freeShippingThreshold !== undefined && { freeShippingThreshold: Number(freeShippingThreshold) }),
                ...(whatsappNumber !== undefined && { whatsappNumber }),
                ...(currency !== undefined && { currency }),
                ...(contactAddress !== undefined && { contactAddress }),
                ...(contactPhone !== undefined && { contactPhone }),
                ...(contactEmail !== undefined && { contactEmail }),
                ...(contactHours !== undefined && { contactHours }),
                ...(footerDescription !== undefined && { footerDescription }),
                ...(footerCopyright !== undefined && { footerCopyright }),
                ...(aboutTitle !== undefined && { aboutTitle }),
                ...(aboutDescription !== undefined && { aboutDescription }),
                ...(aboutMission !== undefined && { aboutMission }),
                ...(facebookLink !== undefined && { facebookLink }),
                ...(instagramLink !== undefined && { instagramLink }),
                ...(twitterLink !== undefined && { twitterLink }),
                ...(youtubeLink !== undefined && { youtubeLink }),
                ...(tiktokLink !== undefined && { tiktokLink }),
                ...(categoriesTitle !== undefined && { categoriesTitle }),
                ...(categoriesSubtitle !== undefined && { categoriesSubtitle }),
                ...(featuredTitle !== undefined && { featuredTitle }),
                ...(featuredSubtitle !== undefined && { featuredSubtitle }),
                ...(whyTitle !== undefined && { whyTitle }),
                ...(whySubtitle !== undefined && { whySubtitle }),
                ...(whyFeatures !== undefined && { whyFeatures }),
                ...(cartShippingText !== undefined && { cartShippingText }),
                ...(ctaTitle !== undefined && { ctaTitle }),
                ...(ctaSubtitle !== undefined && { ctaSubtitle }),
                ...(ctaPrimaryBtnText !== undefined && { ctaPrimaryBtnText }),
                ...(ctaPrimaryBtnLink !== undefined && { ctaPrimaryBtnLink }),
                ...(ctaSecondaryBtnText !== undefined && { ctaSecondaryBtnText }),
                ...(ctaSecondaryBtnLink !== undefined && { ctaSecondaryBtnLink }),
                ...(lowStockThreshold !== undefined && { lowStockThreshold: Number(lowStockThreshold) }),
                // Email Configuration
                ...(req.body.emailSenderName !== undefined && { emailSenderName: req.body.emailSenderName }),
                ...(req.body.emailGmailUser !== undefined && { emailGmailUser: req.body.emailGmailUser }),
                ...(req.body.emailAppPassword !== undefined && { emailAppPassword: req.body.emailAppPassword }),
                ...(req.body.emailAdminReceiver !== undefined && { emailAdminReceiver: req.body.emailAdminReceiver }),
                ...(req.body.emailEnabled !== undefined && { emailEnabled: Boolean(req.body.emailEnabled) }),

                // About Page Content
                ...(req.body.aboutMissionDetails !== undefined && { aboutMissionDetails: req.body.aboutMissionDetails }),
                ...(req.body.aboutImage !== undefined && { aboutImage: req.body.aboutImage }),
                ...(req.body.aboutHeroImage !== undefined && { aboutHeroImage: req.body.aboutHeroImage }),
                ...(req.body.aboutHeroOverlayOpacity !== undefined && { aboutHeroOverlayOpacity: Number(req.body.aboutHeroOverlayOpacity) }),
                ...(req.body.aboutHeroBlur !== undefined && { aboutHeroBlur: Number(req.body.aboutHeroBlur) }),
                ...(req.body.homeHeroOverlayOpacity !== undefined && { homeHeroOverlayOpacity: Number(req.body.homeHeroOverlayOpacity) }),
                ...(req.body.aboutHeroBlur !== undefined && { aboutHeroBlur: Number(req.body.aboutHeroBlur) }),
                ...(req.body.homeHeroOverlayOpacity !== undefined && { homeHeroOverlayOpacity: Number(req.body.homeHeroOverlayOpacity) }),
                ...(req.body.homeHeroBlur !== undefined && { homeHeroBlur: Number(req.body.homeHeroBlur) }),
                ...(req.body.homeHeroAutoPlayInterval !== undefined && { homeHeroAutoPlayInterval: Number(req.body.homeHeroAutoPlayInterval) }),
                ...(req.body.categoriesAutoPlayInterval !== undefined && { categoriesAutoPlayInterval: Number(req.body.categoriesAutoPlayInterval) }),
                ...(req.body.logo !== undefined && { logo: req.body.logo }),
                ...(req.body.favicon !== undefined && { favicon: req.body.favicon }),
                ...(req.body.aboutValues !== undefined && { aboutValues: req.body.aboutValues }),

                // Invoice Configuration
                ...(req.body.invoiceFooterText !== undefined && { invoiceFooterText: req.body.invoiceFooterText }),
                ...(req.body.invoiceShowTax !== undefined && { invoiceShowTax: Boolean(req.body.invoiceShowTax) }),
                ...(req.body.invoiceTaxRate !== undefined && { invoiceTaxRate: Number(req.body.invoiceTaxRate) }),
                ...(req.body.invoiceNotes !== undefined && { invoiceNotes: req.body.invoiceNotes }),

                // UI Texts Configuration
                ...(req.body.aboutMissionTitle !== undefined && { aboutMissionTitle: req.body.aboutMissionTitle }),
                ...(req.body.aboutStatsLabel !== undefined && { aboutStatsLabel: req.body.aboutStatsLabel }),
                ...(req.body.aboutValuesTitle !== undefined && { aboutValuesTitle: req.body.aboutValuesTitle }),
                ...(req.body.productsPageTitle !== undefined && { productsPageTitle: req.body.productsPageTitle }),
                ...(req.body.productsPageSubtitle !== undefined && { productsPageSubtitle: req.body.productsPageSubtitle }),
                ...(req.body.filterBudgetTitle !== undefined && { filterBudgetTitle: req.body.filterBudgetTitle }),
                ...(req.body.filterSortTitle !== undefined && { filterSortTitle: req.body.filterSortTitle }),
                ...(req.body.filterCategoryTitle !== undefined && { filterCategoryTitle: req.body.filterCategoryTitle }),
                ...(req.body.cartSummaryTitle !== undefined && { cartSummaryTitle: req.body.cartSummaryTitle }),
                ...(req.body.cartSubtotalText !== undefined && { cartSubtotalText: req.body.cartSubtotalText })
            }
        });

        console.log('Updated settings (free shipping):', {
            freeShippingEnabled: updatedSettings.freeShippingEnabled,
            freeShippingThreshold: updatedSettings.freeShippingThreshold
        });

        broadcastEvent(SSE_EVENTS.SETTINGS_CHANGED);
        res.json(updatedSettings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
