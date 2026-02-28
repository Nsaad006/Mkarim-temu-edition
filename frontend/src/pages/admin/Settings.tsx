import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, GlobalSettings } from "@/api/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";
import { Slider } from "@/components/ui/slider";
import { HeroSlideManager } from "@/components/admin/HeroSlideManager";

const Settings = () => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Partial<GlobalSettings>>({});
    const [heroSlidesChanges, setHeroSlidesChanges] = useState<Record<string, any>>({});

    // Fetch settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsApi.get(),
    });

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    // Update mutation
    const mutation = useMutation({
        mutationFn: (data: Partial<GlobalSettings>) => settingsApi.update(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            toast({
                title: "Paramètres enregistrés",
                description: "La configuration de la boutique a été mise à jour.",
            });
        },
        onError: () => {
            toast({
                title: "Erreur",
                description: "Impossible de sauvegarder les paramètres.",
                variant: "destructive"
            });
        }
    });

    const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();

        console.log('Saving settings...', {
            freeShippingEnabled: formData.freeShippingEnabled,
            freeShippingThreshold: formData.freeShippingThreshold,
            fullFormData: formData
        });

        // Save settings
        mutation.mutate(formData);

        // Save hero slides if there are changes
        if (Object.keys(heroSlidesChanges).length > 0 && (window as any).__saveHeroSlides) {
            try {
                await (window as any).__saveHeroSlides();
            } catch (error) {
                console.error('Error saving hero slides:', error);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>

            <form onSubmit={handleSave} className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-2 bg-transparent p-0">
                        <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border">Général</TabsTrigger>
                        <TabsTrigger value="hero" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border">Hero</TabsTrigger>
                        <TabsTrigger value="sections" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border">Sections</TabsTrigger>
                        <TabsTrigger value="contact" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border">Contact</TabsTrigger>
                        <TabsTrigger value="checkout" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border">Checkout</TabsTrigger>
                        <TabsTrigger value="email" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border">Email</TabsTrigger>
                        <TabsTrigger value="invoice" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border">Facture</TabsTrigger>
                    </TabsList>

                    <div className="mt-6">
                        <TabsContent value="email" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h2 className="text-xl font-semibold">Configuration Email (SMTP Gmail)</h2>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="email-enabled">Activer les emails</Label>
                                        <Switch
                                            id="email-enabled"
                                            checked={formData.emailEnabled || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, emailEnabled: checked })}
                                        />
                                    </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
                                    <p className="font-semibold mb-1">💡 Instructions :</p>
                                    <ul className="list-disc pl-5 mt-2 space-y-1">
                                        <li>Activez la "Validation en deux étapes" sur votre compte Google.</li>
                                        <li>Générez un "Mot de passe d'application" (App Password) dans les paramètres de sécurité.</li>
                                        <li>Utilisez ce mot de passe ci-dessous (ce n'est PAS votre mot de passe Gmail habituel).</li>
                                    </ul>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nom de l'expéditeur</Label>
                                        <Input
                                            value={formData.emailSenderName || ""}
                                            onChange={(e) => setFormData({ ...formData, emailSenderName: e.target.value })}
                                            placeholder="Ex: MKARIM Store"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email Gmail (Expéditeur)</Label>
                                        <Input
                                            value={formData.emailGmailUser || ""}
                                            onChange={(e) => setFormData({ ...formData, emailGmailUser: e.target.value })}
                                            placeholder="votre-email@gmail.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mot de passe d'application</Label>
                                        <Input
                                            type="password"
                                            value={formData.emailAppPassword || ""}
                                            onChange={(e) => setFormData({ ...formData, emailAppPassword: e.target.value })}
                                            placeholder="xxxx xxxx xxxx xxxx"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email Administrateur (Notifications)</Label>
                                        <Input
                                            value={formData.emailAdminReceiver || ""}
                                            onChange={(e) => setFormData({ ...formData, emailAdminReceiver: e.target.value })}
                                            placeholder="destinataire@email.com"
                                        />
                                        <p className="text-xs text-muted-foreground">L'email qui recevra les notifications de nouvelles commandes.</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Invoice Tab */}
                        <TabsContent value="invoice" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Configuration des Factures</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Afficher la TVA</Label>
                                            <p className="text-sm text-muted-foreground">Inclure le détail de la TVA sur les factures générées.</p>
                                        </div>
                                        <Switch
                                            checked={formData.invoiceShowTax || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, invoiceShowTax: checked })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Taux de TVA (%)</Label>
                                        <Input
                                            type="number"
                                            value={formData.invoiceTaxRate ?? 20}
                                            onChange={(e) => setFormData({ ...formData, invoiceTaxRate: parseFloat(e.target.value) })}
                                            disabled={!formData.invoiceShowTax}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Sous-titre (Header)</Label>
                                        <Input
                                            value={formData.invoiceSubtitle || ""}
                                            onChange={(e) => setFormData({ ...formData, invoiceSubtitle: e.target.value })}
                                            placeholder="Ex: Vente de PC & Matériel Gaming"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Adresse (Header)</Label>
                                        <Input
                                            value={formData.invoiceAddress || ""}
                                            onChange={(e) => setFormData({ ...formData, invoiceAddress: e.target.value })}
                                            placeholder="Ex: Casablanca, Maroc"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Libellé Destinataire</Label>
                                        <Input
                                            value={formData.invoiceCustomerHeader || ""}
                                            onChange={(e) => setFormData({ ...formData, invoiceCustomerHeader: e.target.value })}
                                            placeholder="Ex: Facture pour :"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Texte de pied de page</Label>
                                        <Input
                                            value={formData.invoiceFooterText || ""}
                                            onChange={(e) => setFormData({ ...formData, invoiceFooterText: e.target.value })}
                                            placeholder="Ex: Merci de votre confiance."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Notes / Mentions légales</Label>
                                        <Textarea
                                            value={formData.invoiceNotes || ""}
                                            onChange={(e) => setFormData({ ...formData, invoiceNotes: e.target.value })}
                                            placeholder="Mentions légales, conditions de paiement..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        {/* General Tab */}
                        <TabsContent value="general" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Identité de la Boutique</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nom de la boutique</Label>
                                        <Input
                                            value={formData.storeName || ""}
                                            onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Devise</Label>
                                        <Input
                                            value={formData.currency || "DH"}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Numéro WhatsApp</Label>
                                    <Input
                                        value={formData.whatsappNumber || ""}
                                        onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                                        placeholder="+212600000000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Logo de la boutique</Label>
                                    <div className="p-4 border border-border rounded-lg bg-background/50">
                                        <ImageUpload
                                            value={formData.logo || ""}
                                            onChange={(url) => setFormData({ ...formData, logo: url })}
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Format recommandé: PNG transparent, max 2MB. Si aucun logo n'est ajouté, le nom de la boutique sera affiché.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Favicon (Icône de l'onglet)</Label>
                                    <div className="p-4 border border-border rounded-lg bg-background/50">
                                        <ImageUpload
                                            value={formData.favicon || ""}
                                            onChange={(url) => setFormData({ ...formData, favicon: url })}
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Icône affichée dans l'onglet du navigateur. Format recommandé: SVG ou PNG (32x32px), max 500KB.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Réseaux Sociaux</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Facebook</Label>
                                        <Input
                                            value={formData.facebookLink || ""}
                                            onChange={(e) => setFormData({ ...formData, facebookLink: e.target.value })}
                                            placeholder="https://facebook.com/..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Instagram</Label>
                                        <Input
                                            value={formData.instagramLink || ""}
                                            onChange={(e) => setFormData({ ...formData, instagramLink: e.target.value })}
                                            placeholder="https://instagram.com/..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Twitter / X</Label>
                                        <Input
                                            value={formData.twitterLink || ""}
                                            onChange={(e) => setFormData({ ...formData, twitterLink: e.target.value })}
                                            placeholder="https://twitter.com/..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>YouTube</Label>
                                        <Input
                                            value={formData.youtubeLink || ""}
                                            onChange={(e) => setFormData({ ...formData, youtubeLink: e.target.value })}
                                            placeholder="https://youtube.com/..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>TikTok</Label>
                                        <Input
                                            value={formData.tiktokLink || ""}
                                            onChange={(e) => setFormData({ ...formData, tiktokLink: e.target.value })}
                                            placeholder="https://tiktok.com/@..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Contenu du Footer</h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Description du Footer</Label>
                                        <Textarea
                                            value={formData.footerDescription || ""}
                                            onChange={(e) => setFormData({ ...formData, footerDescription: e.target.value })}
                                            placeholder="Votre destination pour les meilleurs PC..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Copyright</Label>
                                        <Input
                                            value={formData.footerCopyright || ""}
                                            onChange={(e) => setFormData({ ...formData, footerCopyright: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Hero Tab */}
                        <TabsContent value="hero" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Style Global du Hero</h2>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <Label>Opacité du filtre sombre</Label>
                                            <span className="text-sm text-muted-foreground">{formData.homeHeroOverlayOpacity ?? 80}%</span>
                                        </div>
                                        <Slider
                                            value={[formData.homeHeroOverlayOpacity ?? 80]}
                                            max={100}
                                            step={5}
                                            onValueChange={(vals) => setFormData({ ...formData, homeHeroOverlayOpacity: vals[0] })}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <Label>Flou de l'image (Blur)</Label>
                                            <span className="text-sm text-muted-foreground">{formData.homeHeroBlur ?? 0}px</span>
                                        </div>
                                        <Slider
                                            value={[formData.homeHeroBlur ?? 0]}
                                            max={20}
                                            step={1}
                                            onValueChange={(vals) => setFormData({ ...formData, homeHeroBlur: vals[0] })}
                                        />
                                    </div>
                                    <div className="space-y-4 col-span-2 md:col-span-1">
                                        <div className="flex justify-between">
                                            <Label>Vitesse du diaporama (ms)</Label>
                                            <span className="text-sm text-muted-foreground">{formData.homeHeroAutoPlayInterval ?? 5000}ms</span>
                                        </div>
                                        <Slider
                                            value={[formData.homeHeroAutoPlayInterval ?? 5000]}
                                            min={1000}
                                            max={10000}
                                            step={500}
                                            onValueChange={(vals) => setFormData({ ...formData, homeHeroAutoPlayInterval: vals[0] })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <HeroSlideManager
                                onSlidesChange={(newSlides) => {
                                    setHeroSlidesChanges(prev => ({ ...prev, slides: newSlides }));
                                }}
                            />
                        </TabsContent>

                        {/* Sections Content Tab */}
                        <TabsContent value="sections" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Titres des Sections</h2>

                                <div className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Titre "Catégories"</Label>
                                            <Input
                                                value={formData.categoriesTitle || "Nos Catégories"}
                                                onChange={(e) => setFormData({ ...formData, categoriesTitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sous-titre "Catégories"</Label>
                                            <Input
                                                value={formData.categoriesSubtitle || "Explorez nos produits par catégorie"}
                                                onChange={(e) => setFormData({ ...formData, categoriesSubtitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Vitesse de défilement (ms)</Label>
                                            <Input
                                                type="number"
                                                value={formData.categoriesAutoPlayInterval || 3000}
                                                onChange={(e) => setFormData({ ...formData, categoriesAutoPlayInterval: parseInt(e.target.value) || 3000 })}
                                                placeholder="3000"
                                            />
                                            <p className="text-xs text-muted-foreground">Temps en millisecondes (ex: 3000 = 3 secondes). 0 pour désactiver.</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-4 grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Titre "Produits Vedettes"</Label>
                                            <Input
                                                value={formData.featuredTitle || "Produits Vedettes"}
                                                onChange={(e) => setFormData({ ...formData, featuredTitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sous-titre "Produits Vedettes"</Label>
                                            <Input
                                                value={formData.featuredSubtitle || "Nos meilleures ventes du moment"}
                                                onChange={(e) => setFormData({ ...formData, featuredSubtitle: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-4 grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Titre "Pourquoi Nous"</Label>
                                            <Input
                                                value={formData.whyTitle || "Pourquoi Nous Choisir ?"}
                                                onChange={(e) => setFormData({ ...formData, whyTitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sous-titre "Pourquoi Nous"</Label>
                                            <Input
                                                value={formData.whySubtitle || "La qualité et le service avant tout"}
                                                onChange={(e) => setFormData({ ...formData, whySubtitle: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-4 grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Titre "Contact"</Label>
                                            <Input
                                                value={formData.ctaTitle || "Une Question ?"}
                                                onChange={(e) => setFormData({ ...formData, ctaTitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sous-titre "Contact"</Label>
                                            <Input
                                                value={formData.ctaSubtitle || "Notre équipe est là pour vous aider"}
                                                onChange={(e) => setFormData({ ...formData, ctaSubtitle: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-border pt-4">
                                        <h3 className="text-lg font-medium mb-3">Seuil de stock bas</h3>
                                        <div className="space-y-2 max-w-xs">
                                            <Label>Seuil d'alerte</Label>
                                            <Input
                                                type="number"
                                                value={formData.lowStockThreshold || 5}
                                                onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                                            />
                                            <p className="text-xs text-muted-foreground">Les produits avec un stock inférieur à ce nombre afficheront un badge "Stock Faible".</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CTA Section */}
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Section CTA (Bas de page)</h2>
                                <div className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Titre</Label>
                                            <Input
                                                value={formData.ctaTitle || ""}
                                                onChange={(e) => setFormData({ ...formData, ctaTitle: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Sous-titre</Label>
                                            <Input
                                                value={formData.ctaSubtitle || ""}
                                                onChange={(e) => setFormData({ ...formData, ctaSubtitle: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Texte Bouton Principal</Label>
                                            <Input
                                                value={formData.ctaPrimaryBtnText || ""}
                                                onChange={(e) => setFormData({ ...formData, ctaPrimaryBtnText: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Lien Bouton Principal</Label>
                                            <Input
                                                value={formData.ctaPrimaryBtnLink || ""}
                                                onChange={(e) => setFormData({ ...formData, ctaPrimaryBtnLink: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Texte Bouton Secondaire</Label>
                                            <Input
                                                value={formData.ctaSecondaryBtnText || ""}
                                                onChange={(e) => setFormData({ ...formData, ctaSecondaryBtnText: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Lien Bouton Secondaire</Label>
                                            <Input
                                                value={formData.ctaSecondaryBtnLink || ""}
                                                onChange={(e) => setFormData({ ...formData, ctaSecondaryBtnLink: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Contact Tab */}
                        <TabsContent value="contact" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Informations de Contact</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Adresse</Label>
                                        <Input
                                            value={formData.contactAddress || ""}
                                            onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Téléphone</Label>
                                        <Input
                                            value={formData.contactPhone || ""}
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            value={formData.contactEmail || ""}
                                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Horaires</Label>
                                        <Input
                                            value={formData.contactHours || ""}
                                            onChange={(e) => setFormData({ ...formData, contactHours: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Page À Propos</h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Image de Fond (Hero)</Label>
                                        <ImageUpload
                                            value={formData.aboutHeroImage || ""}
                                            onChange={(url) => setFormData({ ...formData, aboutHeroImage: url })}
                                        />
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <Label>Opacité du filtre</Label>
                                                <span className="text-xs text-muted-foreground">{formData.aboutHeroOverlayOpacity ?? 90}%</span>
                                            </div>
                                            <Slider
                                                value={[formData.aboutHeroOverlayOpacity ?? 90]}
                                                max={100}
                                                step={5}
                                                onValueChange={(vals) => setFormData({ ...formData, aboutHeroOverlayOpacity: vals[0] })}
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between">
                                                <Label>Flou (Blur)</Label>
                                                <span className="text-xs text-muted-foreground">{formData.aboutHeroBlur ?? 0}px</span>
                                            </div>
                                            <Slider
                                                value={[formData.aboutHeroBlur ?? 0]}
                                                max={20}
                                                step={1}
                                                onValueChange={(vals) => setFormData({ ...formData, aboutHeroBlur: vals[0] })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Titre</Label>
                                        <Input
                                            value={formData.aboutTitle || ""}
                                            onChange={(e) => setFormData({ ...formData, aboutTitle: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={formData.aboutDescription || ""}
                                            onChange={(e) => setFormData({ ...formData, aboutDescription: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mission (Paragraphe 1)</Label>
                                        <Textarea
                                            value={formData.aboutMission || ""}
                                            onChange={(e) => setFormData({ ...formData, aboutMission: e.target.value })}
                                            rows={2}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mission (Paragraphe 2)</Label>
                                        <Textarea
                                            value={formData.aboutMissionDetails || ""}
                                            onChange={(e) => setFormData({ ...formData, aboutMissionDetails: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Image de la Mission</Label>
                                        <ImageUpload
                                            value={formData.aboutImage || ""}
                                            onChange={(url) => setFormData({ ...formData, aboutImage: url })}
                                        />
                                    </div>

                                    {/* Values Section Editing */}
                                    <div className="pt-4 space-y-4 border-t">
                                        <h3 className="font-semibold text-lg">Nos Valeurs (4 Valeurs)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Array.isArray(formData.aboutValues) && formData.aboutValues.map((val: any, idx: number) => (
                                                <div key={idx} className="p-4 bg-muted/30 border rounded-lg space-y-2">
                                                    <p className="text-xs font-bold uppercase text-muted-foreground">Valeur #{idx + 1}</p>
                                                    <Label>Titre</Label>
                                                    <Input
                                                        value={val.title}
                                                        onChange={(e) => {
                                                            const newValues = [...(formData.aboutValues as any[])];
                                                            newValues[idx] = { ...newValues[idx], title: e.target.value };
                                                            setFormData({ ...formData, aboutValues: newValues });
                                                        }}
                                                    />
                                                    <Label>Description</Label>
                                                    <Textarea
                                                        value={val.description}
                                                        onChange={(e) => {
                                                            const newValues = [...(formData.aboutValues as any[])];
                                                            newValues[idx] = { ...newValues[idx], description: e.target.value };
                                                            setFormData({ ...formData, aboutValues: newValues });
                                                        }}
                                                        rows={2}
                                                    />
                                                </div>
                                            ))}
                                            {(!formData.aboutValues || formData.aboutValues.length === 0) && (
                                                <Button type="button" variant="outline" onClick={() => setFormData({
                                                    ...formData,
                                                    aboutValues: [
                                                        { title: "Confiance", description: "..." },
                                                        { title: "Qualité", description: "..." },
                                                        { title: "Service Client", description: "..." },
                                                        { title: "Fiabilité", description: "..." }
                                                    ]
                                                })}>
                                                    Initialiser les valeurs par défaut
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Checkout Tab */}
                        <TabsContent value="checkout" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Paramètres Généraux</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Livraison Gratuite</Label>
                                            <p className="text-sm text-muted-foreground">Activer la livraison gratuite pour toutes les commandes au-dessus d'un certain montant.</p>
                                        </div>
                                        <Switch
                                            checked={formData.freeShippingEnabled || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, freeShippingEnabled: checked })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Montant minimum (MAD)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={formData.freeShippingThreshold || 0}
                                            onChange={(e) => setFormData({ ...formData, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Les commandes au-dessus de ce montant bénéficieront de la livraison gratuite (si activée).
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-xl font-semibold border-b pb-2">Checkout & Paiement</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Paiement à la livraison (COD)</Label>
                                            <p className="text-sm text-muted-foreground">Activer le paiement à la livraison pour les clients</p>
                                        </div>
                                        <Switch
                                            checked={formData.codEnabled || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, codEnabled: checked })}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Disponibilité de la boutique</Label>
                                            <p className="text-sm text-muted-foreground">Permettre aux clients de passer des commandes</p>
                                        </div>
                                        <Switch
                                            checked={formData.storeAvailability || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, storeAvailability: checked })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="flex justify-end sticky bottom-6 z-50 bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border/50 pointer-events-auto">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={mutation.isPending}
                        size="xl"
                        className="shadow-lg relative z-50 cursor-pointer"
                    >
                        {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save />}
                        Enregistrer les changements
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
