import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2, Store, Phone, CreditCard, Mail, FileText, KeyRound, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, GlobalSettings } from "@/api/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";
import { logEvent } from "@/lib/logger";
import { adminsApi } from "@/api/admins";

const Settings = () => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Partial<GlobalSettings>>({});

    // Password change state (for logged-in admin)
    const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();

    const changePasswordMutation = useMutation({
        mutationFn: ({ newPwd, currentPwd }: { newPwd: string; currentPwd: string }) =>
            adminsApi.updatePassword(currentUser.id, newPwd, currentPwd),
        onSuccess: () => {
            logEvent({ action: "ADMIN_USER_PASSWORD_CHANGED", metadata: { userId: currentUser.id } });
            setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            toast({ title: "Mot de passe modifié", description: "Votre mot de passe a été mis à jour avec succès." });
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.error || "Impossible de modifier le mot de passe.";
            toast({ title: "Erreur", description: msg, variant: "destructive" });
        },
    });

    const handleChangePassword = () => {
        if (!pwdForm.currentPassword) {
            toast({ title: "Erreur", description: "Veuillez saisir votre mot de passe actuel.", variant: "destructive" });
            return;
        }
        if (pwdForm.newPassword.length < 6) {
            toast({ title: "Erreur", description: "Le nouveau mot de passe doit comporter au moins 6 caractères.", variant: "destructive" });
            return;
        }
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
            return;
        }
        changePasswordMutation.mutate({ newPwd: pwdForm.newPassword, currentPwd: pwdForm.currentPassword });
    };

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsApi.get(),
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                commissionTrigger: 'on_delivery',
                commissionCancelPolicy: 'keep',
                commissionSplitConfirmPct: 30,
                commissionSplitDeliverPct: 70,
                commissionGraceDays: 7,
                ...settings,
            });
        }
    }, [settings]);

    const mutation = useMutation({
        mutationFn: (data: Partial<GlobalSettings>) => settingsApi.update(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            logEvent({ action: "SETTINGS_UPDATED" });
            toast({ title: "Paramètres enregistrés", description: "La configuration de la boutique a été mise à jour." });
        },
        onError: () => {
            toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
        }
    });

    const handleSave = () => {
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

            <div className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
                        <TabsTrigger value="general" className={tabClass}><Store className="w-4 h-4" />Boutique</TabsTrigger>
                        <TabsTrigger value="contact" className={tabClass}><Phone className="w-4 h-4" />Contact</TabsTrigger>
                        <TabsTrigger value="checkout" className={tabClass}><CreditCard className="w-4 h-4" />Paiement</TabsTrigger>
                        <TabsTrigger value="email" className={tabClass}><Mail className="w-4 h-4" />Email</TabsTrigger>
                        <TabsTrigger value="invoice" className={tabClass}><FileText className="w-4 h-4" />Facture</TabsTrigger>
                        <TabsTrigger value="commission" className={tabClass}><DollarSign className="w-4 h-4" />Commissions</TabsTrigger>
                        <TabsTrigger value="account" className={tabClass}><KeyRound className="w-4 h-4" />Mon Compte</TabsTrigger>
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

                        {/* ── COMPTE TAB ──────────────────────────────────── */}
                        {/* ── COMMISSIONS TAB ────────────────────────────────── */}
                        <TabsContent value="commission" className="space-y-6 m-0">
                            {(() => {
                                // Resolved values with defaults matching the DB schema defaults
                                const trigger = formData.commissionTrigger ?? 'on_delivery';
                                const cancelPolicy = formData.commissionCancelPolicy ?? 'keep';
                                const splitConfirm = formData.commissionSplitConfirmPct ?? 30;
                                const splitDeliver = formData.commissionSplitDeliverPct ?? 70;
                                const graceDays = formData.commissionGraceDays ?? 7;

                                return (
                                    <>
                                        {/* Trigger */}
                                        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                                            <div>
                                                <h2 className="text-lg font-semibold border-b pb-2">Déclencheur de commission</h2>
                                                <p className="text-sm text-muted-foreground mt-1">À quel moment l'agent gagne-t-il sa commission ?</p>
                                            </div>

                                            <div className="grid gap-3">
                                                {([
                                                    { value: 'on_delivery', label: 'À la livraison uniquement', desc: "Commission calculée seulement quand la commande est marquée LIVRÉE. Mode le plus sécurisé." },
                                                    { value: 'on_confirmation', label: 'À la confirmation', desc: "Commission calculée dès que l'agent confirme la commande." },
                                                    { value: 'split', label: 'Partagée (confirmation + livraison)', desc: "Un % à la confirmation, le reste à la livraison. Idéal pour motiver et sécuriser." },
                                                ] as const).map(opt => (
                                                    <label
                                                        key={opt.value}
                                                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                                                            trigger === opt.value
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border hover:border-primary/40'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="commissionTrigger"
                                                            value={opt.value}
                                                            checked={trigger === opt.value}
                                                            onChange={() => setFormData({ ...formData, commissionTrigger: opt.value })}
                                                            className="mt-0.5 accent-primary"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-sm">{opt.label}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>

                                            {/* Split percentages */}
                                            {trigger === 'split' && (
                                                <div className="border border-dashed border-primary/30 bg-primary/5 rounded-lg p-4 space-y-4">
                                                    <p className="text-sm font-medium">Répartition du split</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>% à la confirmation</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    value={splitConfirm}
                                                                    onChange={e => {
                                                                        const v = Math.min(100, Math.max(0, Number(e.target.value)));
                                                                        setFormData({ ...formData, commissionSplitConfirmPct: v, commissionSplitDeliverPct: 100 - v });
                                                                    }}
                                                                    className="w-24"
                                                                />
                                                                <span className="text-sm text-muted-foreground">%</span>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>% à la livraison</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    value={splitDeliver}
                                                                    onChange={e => {
                                                                        const v = Math.min(100, Math.max(0, Number(e.target.value)));
                                                                        setFormData({ ...formData, commissionSplitDeliverPct: v, commissionSplitConfirmPct: 100 - v });
                                                                    }}
                                                                    className="w-24"
                                                                />
                                                                <span className="text-sm text-muted-foreground">%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Total : {splitConfirm + splitDeliver}% — les deux valeurs s'ajustent automatiquement pour totaliser 100%.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Cancel policy */}
                                        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                                            <div>
                                                <h2 className="text-lg font-semibold border-b pb-2">Politique d'annulation</h2>
                                                <p className="text-sm text-muted-foreground mt-1">Que se passe-t-il avec la commission si la commande est annulée ou retournée ?</p>
                                            </div>

                                            <div className="grid gap-3">
                                                {([
                                                    { value: 'keep', label: 'Conserver la commission', desc: "L'annulation ou le retour ne supprime pas la commission déjà gagnée." },
                                                    { value: 'cancel_on_return', label: 'Annuler la commission', desc: "La commission est annulée dès que la commande est annulée ou retournée." },
                                                    { value: 'grace_period', label: 'Période de grâce', desc: "La commission est annulée seulement si le retour a lieu dans un délai défini après la création de la commission." },
                                                ] as const).map(opt => (
                                                    <label
                                                        key={opt.value}
                                                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                                                            cancelPolicy === opt.value
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border hover:border-primary/40'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="commissionCancelPolicy"
                                                            value={opt.value}
                                                            checked={cancelPolicy === opt.value}
                                                            onChange={() => setFormData({ ...formData, commissionCancelPolicy: opt.value })}
                                                            className="mt-0.5 accent-primary"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-sm">{opt.label}</p>
                                                            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>

                                            {/* Grace days */}
                                            {cancelPolicy === 'grace_period' && (
                                                <div className="border border-dashed border-primary/30 bg-primary/5 rounded-lg p-4 space-y-2">
                                                    <Label>Nombre de jours de grâce</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            max={90}
                                                            value={graceDays}
                                                            onChange={e => setFormData({ ...formData, commissionGraceDays: Math.max(1, Number(e.target.value)) })}
                                                            className="w-24"
                                                        />
                                                        <span className="text-sm text-muted-foreground">jours après la création de la commission</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Un retour effectué après ce délai ne supprimera pas la commission.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </TabsContent>

                        <TabsContent value="account" className="space-y-6 m-0">
                            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                                <div className="flex items-center gap-3 pb-2 border-b">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                                        {(currentUser.name || currentUser.email || "?").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{currentUser.name || "—"}</p>
                                        <p className="text-xs text-muted-foreground">{currentUser.email || "—"}</p>
                                    </div>
                                </div>

                                <h2 className="text-base font-semibold pt-1">Changer le mot de passe</h2>
                                <div className="space-y-4 max-w-sm">
                                    <div className="space-y-2">
                                        <Label>Mot de passe actuel</Label>
                                        <Input
                                            type="password"
                                            placeholder="Votre mot de passe actuel"
                                            value={pwdForm.currentPassword}
                                            onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                                            autoComplete="current-password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nouveau mot de passe</Label>
                                        <Input
                                            type="password"
                                            placeholder="Minimum 6 caractères"
                                            value={pwdForm.newPassword}
                                            onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Confirmer le nouveau mot de passe</Label>
                                        <Input
                                            type="password"
                                            placeholder="Répétez le nouveau mot de passe"
                                            value={pwdForm.confirmPassword}
                                            onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <Button type="button" onClick={handleChangePassword} disabled={changePasswordMutation.isPending} className="gap-2">
                                        {changePasswordMutation.isPending
                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Modification...</>
                                            : <><KeyRound className="w-4 h-4" /> Modifier le mot de passe</>
                                        }
                                    </Button>
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
            </div>
        </div>
    );
};

export default Settings;
