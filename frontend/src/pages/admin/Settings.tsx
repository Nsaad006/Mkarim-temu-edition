import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2, Store, Phone, CreditCard, Mail, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, GlobalSettings } from "@/api/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";

const Settings = () => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Partial<GlobalSettings>>({});

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsApi.get(),
    });

    useEffect(() => {
        if (settings) setFormData(settings);
    }, [settings]);

    const mutation = useMutation({
        mutationFn: (data: Partial<GlobalSettings>) => settingsApi.update(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            toast({ title: "Paramètres enregistrés", description: "La configuration de la boutique a été mise à jour." });
        },
        onError: () => {
            toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
        }
    });

    const handleSave = (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const tabClass = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border border-border flex items-center gap-2";

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
                <p className="text-muted-foreground text-sm mt-1">Configuration globale de votre boutique</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
                        <TabsTrigger value="general" className={tabClass}><Store className="w-4 h-4" />Boutique</TabsTrigger>
                        <TabsTrigger value="contact" className={tabClass}><Phone className="w-4 h-4" />Contact</TabsTrigger>
                        <TabsTrigger value="checkout" className={tabClass}><CreditCard className="w-4 h-4" />Paiement</TabsTrigger>
                        <TabsTrigger value="email" className={tabClass}><Mail className="w-4 h-4" />Email</TabsTrigger>
                        <TabsTrigger value="invoice" className={tabClass}><FileText className="w-4 h-4" />Facture</TabsTrigger>
                    </TabsList>

                    <div className="mt-6">

                        {/* ── BOUTIQUE TAB ─────────────────────────────────── */}
                        <TabsContent value="general" className="space-y-6 m-0">
                            {/* Identity */}
                            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                                <h2 className="text-lg font-semibold border-b pb-2">Identité de la Boutique</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nom de la boutique</Label>
                                        <Input
                                            value={formData.storeName || ""}
                                            onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                            placeholder="Ex: MKARIM SOLUTION"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Devise</Label>
                                        <Input
                                            value={formData.currency || "MAD"}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            placeholder="MAD, EUR, USD…"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Numéro WhatsApp</Label>
                                        <Input
                                            value={formData.whatsappNumber || ""}
                                            onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                                            placeholder="+212600000000"
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 pt-2">
                                    <div className="space-y-2">
                                        <Label>Logo de la boutique</Label>
                                        <div className="p-3 border border-border rounded-lg bg-background/50">
                                            <ImageUpload
                                                value={formData.logo || ""}
                                                onChange={(url) => setFormData({ ...formData, logo: url })}
                                            />
                                            <p className="text-xs text-muted-foreground mt-2">PNG transparent recommandé, max 2 MB</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Favicon (onglet navigateur)</Label>
                                        <div className="p-3 border border-border rounded-lg bg-background/50">
                                            <ImageUpload
                                                value={formData.favicon || ""}
                                                onChange={(url) => setFormData({ ...formData, favicon: url })}
                                            />
                                            <p className="text-xs text-muted-foreground mt-2">SVG ou PNG 32×32px recommandé</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-lg font-semibold border-b pb-2">Contenu du Footer</h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={formData.footerDescription || ""}
                                            onChange={(e) => setFormData({ ...formData, footerDescription: e.target.value })}
                                            placeholder="Votre destination pour les meilleurs produits…"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Texte Copyright</Label>
                                        <Input
                                            value={formData.footerCopyright || ""}
                                            onChange={(e) => setFormData({ ...formData, footerCopyright: e.target.value })}
                                            placeholder={`© ${new Date().getFullYear()} MKARIM SOLUTION – Tous droits réservés`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Social media */}
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-lg font-semibold border-b pb-2">Réseaux Sociaux</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {[
                                        { label: "Facebook", key: "facebookLink", placeholder: "https://facebook.com/..." },
                                        { label: "Instagram", key: "instagramLink", placeholder: "https://instagram.com/..." },
                                        { label: "TikTok", key: "tiktokLink", placeholder: "https://tiktok.com/@..." },
                                        { label: "YouTube", key: "youtubeLink", placeholder: "https://youtube.com/..." },
                                        { label: "Twitter / X", key: "twitterLink", placeholder: "https://twitter.com/..." },
                                    ].map(({ label, key, placeholder }) => (
                                        <div key={key} className="space-y-2">
                                            <Label>{label}</Label>
                                            <Input
                                                value={(formData as any)[key] || ""}
                                                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                                                placeholder={placeholder}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── CONTACT TAB ──────────────────────────────────── */}
                        <TabsContent value="contact" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-lg font-semibold border-b pb-2">Informations de Contact</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Adresse</Label>
                                        <Input
                                            value={formData.contactAddress || ""}
                                            onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
                                            placeholder="Casablanca, Maroc"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Téléphone</Label>
                                        <Input
                                            value={formData.contactPhone || ""}
                                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                            placeholder="+212 6 00 00 00 00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            value={formData.contactEmail || ""}
                                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                            placeholder="contact@mkarim.ma"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Horaires d'ouverture</Label>
                                        <Input
                                            value={formData.contactHours || ""}
                                            onChange={(e) => setFormData({ ...formData, contactHours: e.target.value })}
                                            placeholder="Lun–Sam : 9h – 20h"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* About page content */}
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-lg font-semibold border-b pb-2">Page « À Propos »</h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Titre</Label>
                                        <Input
                                            value={formData.aboutTitle || ""}
                                            onChange={(e) => setFormData({ ...formData, aboutTitle: e.target.value })}
                                            placeholder="À propos de nous"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description (intro)</Label>
                                        <Textarea
                                            value={formData.aboutDescription || ""}
                                            onChange={(e) => setFormData({ ...formData, aboutDescription: e.target.value })}
                                            rows={3}
                                            placeholder="Présentation de votre boutique…"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Notre Mission</Label>
                                        <Textarea
                                            value={formData.aboutMission || ""}
                                            onChange={(e) => setFormData({ ...formData, aboutMission: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Image de la boutique</Label>
                                        <ImageUpload
                                            value={formData.aboutImage || ""}
                                            onChange={(url) => setFormData({ ...formData, aboutImage: url })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── PAIEMENT TAB ─────────────────────────────────── */}
                        <TabsContent value="checkout" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                                <h2 className="text-lg font-semibold border-b pb-2">Disponibilité & Paiement</h2>
                                <div className="space-y-4">
                                    {/* Store availability */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div>
                                            <Label className="text-base font-semibold">Boutique ouverte</Label>
                                            <p className="text-sm text-muted-foreground mt-0.5">Permettre aux clients de passer des commandes</p>
                                        </div>
                                        <Switch
                                            checked={formData.storeAvailability || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, storeAvailability: checked })}
                                        />
                                    </div>

                                    {/* COD */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div>
                                            <Label className="text-base font-semibold">Paiement à la livraison (COD)</Label>
                                            <p className="text-sm text-muted-foreground mt-0.5">Activer le règlement en cash à la réception</p>
                                        </div>
                                        <Switch
                                            checked={formData.codEnabled || false}
                                            onCheckedChange={(checked) => setFormData({ ...formData, codEnabled: checked })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Free shipping */}
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-lg font-semibold border-b pb-2">Livraison Gratuite</h2>
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                    <div>
                                        <Label className="text-base font-semibold">Activer la livraison gratuite</Label>
                                        <p className="text-sm text-muted-foreground mt-0.5">Pour les commandes dépassant un montant minimum</p>
                                    </div>
                                    <Switch
                                        checked={formData.freeShippingEnabled || false}
                                        onCheckedChange={(checked) => setFormData({ ...formData, freeShippingEnabled: checked })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Montant minimum ({formData.currency || "MAD"})</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.freeShippingThreshold || 0}
                                        onChange={(e) => setFormData({ ...formData, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                        disabled={!formData.freeShippingEnabled}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Les commandes au-dessus de ce montant bénéficieront de la livraison gratuite.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Texte badge livraison (affiché sur la boutique)</Label>
                                    <Input
                                        value={formData.freeShippingText || ""}
                                        onChange={(e) => setFormData({ ...formData, freeShippingText: e.target.value })}
                                        placeholder="Ex : Livraison gratuite pour les commande > 150dh"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Libellé sous-total (panier)</Label>
                                    <Input
                                        value={(formData as any).cartSubtotalText || ""}
                                        onChange={(e) => setFormData({ ...formData, cartSubtotalText: e.target.value } as any)}
                                        placeholder="Sous-total"
                                    />
                                    <p className="text-xs text-muted-foreground">Texte affiché à côté du montant sous-total dans le panier client.</p>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── EMAIL TAB ────────────────────────────────────── */}
                        <TabsContent value="email" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <h2 className="text-lg font-semibold">Configuration Email (SMTP Gmail)</h2>
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
                                    <p className="font-semibold mb-2">💡 Configuration Gmail</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>Activez la « Validation en deux étapes » sur votre compte Google.</li>
                                        <li>Générez un « Mot de passe d'application » dans les paramètres de sécurité.</li>
                                        <li>Utilisez ce mot de passe ci-dessous (pas votre mot de passe Gmail habituel).</li>
                                    </ul>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nom de l'expéditeur</Label>
                                        <Input
                                            value={formData.emailSenderName || ""}
                                            onChange={(e) => setFormData({ ...formData, emailSenderName: e.target.value })}
                                            placeholder="MKARIM Store"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email Gmail (expéditeur)</Label>
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
                                        <Label>Email administrateur (notifications)</Label>
                                        <Input
                                            value={formData.emailAdminReceiver || ""}
                                            onChange={(e) => setFormData({ ...formData, emailAdminReceiver: e.target.value })}
                                            placeholder="admin@email.com"
                                        />
                                        <p className="text-xs text-muted-foreground">Reçoit les notifications de nouvelles commandes.</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── FACTURE TAB ──────────────────────────────────── */}
                        <TabsContent value="invoice" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <h2 className="text-lg font-semibold border-b pb-2">Configuration des Factures</h2>
                                <div className="space-y-4">
                                    {/* TVA */}
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                        <div>
                                            <Label className="text-base font-semibold">Afficher la TVA</Label>
                                            <p className="text-sm text-muted-foreground mt-0.5">Inclure le détail de la TVA sur les factures</p>
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

                                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <Label>Sous-titre (en-tête facture)</Label>
                                            <Input
                                                value={formData.invoiceSubtitle || ""}
                                                onChange={(e) => setFormData({ ...formData, invoiceSubtitle: e.target.value })}
                                                placeholder="Ex: Vente de produits"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Adresse (en-tête facture)</Label>
                                            <Input
                                                value={formData.invoiceAddress || ""}
                                                onChange={(e) => setFormData({ ...formData, invoiceAddress: e.target.value })}
                                                placeholder="Casablanca, Maroc"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Libellé destinataire</Label>
                                            <Input
                                                value={formData.invoiceCustomerHeader || ""}
                                                onChange={(e) => setFormData({ ...formData, invoiceCustomerHeader: e.target.value })}
                                                placeholder="Facture pour :"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Texte de pied de page</Label>
                                            <Input
                                                value={formData.invoiceFooterText || ""}
                                                onChange={(e) => setFormData({ ...formData, invoiceFooterText: e.target.value })}
                                                placeholder="Merci de votre confiance."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Notes / Mentions légales</Label>
                                        <Textarea
                                            value={formData.invoiceNotes || ""}
                                            onChange={(e) => setFormData({ ...formData, invoiceNotes: e.target.value })}
                                            placeholder="Conditions de paiement, mentions légales…"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Sticky save button */}
                <div className="flex justify-end sticky bottom-6 z-50 bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-border/50">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={mutation.isPending}
                        size="lg"
                        className="shadow-lg gap-2 whitespace-nowrap min-w-[250px]"
                    >
                        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Enregistrer les modifications
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
