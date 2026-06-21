import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Tag, BarChart2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { promotionsApi, Promotion } from "@/api/promotions";
import { productsApi } from "@/api/products";
import { useSettings } from "@/context/SettingsContext";

const emptyForm = {
    name: "",
    type: "PROMO_CODE" as "PROMO_CODE" | "VOLUME_DISCOUNT",
    code: "",
    discountType: "PERCENT" as "PERCENT" | "FIXED",
    discountValue: 10,
    minQuantity: 2,
    productId: "",
    minOrderTotal: 0,
    maxUses: "",
    active: true,
    expiresAt: "",
};

const Promotions = () => {
    const { currency } = useSettings();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState<Promotion | null>(null);
    const [form, setForm] = useState({ ...emptyForm });

    const { data: promotions = [], isLoading } = useQuery({
        queryKey: ['promotions'],
        queryFn: promotionsApi.getAll,
    });

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => productsApi.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: promotionsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            toast({ title: "Promotion créée" });
            closeDialog();
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.response?.data?.error || "Erreur", variant: "destructive" }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...data }: any) => promotionsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            toast({ title: "Promotion mise à jour" });
            closeDialog();
        },
        onError: (e: any) => toast({ title: "Erreur", description: e?.response?.data?.error || "Erreur", variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: promotionsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            toast({ title: "Promotion supprimée" });
        },
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) => promotionsApi.update(id, { active }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions'] }),
    });

    const openCreate = () => {
        setEditing(null);
        setForm({ ...emptyForm });
        setIsOpen(true);
    };

    const openEdit = (promo: Promotion) => {
        setEditing(promo);
        setForm({
            name: promo.name,
            type: promo.type,
            code: promo.code || "",
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            minQuantity: promo.minQuantity ?? 2,
            productId: promo.productId || "",
            minOrderTotal: promo.minOrderTotal ?? 0,
            maxUses: promo.maxUses?.toString() || "",
            active: promo.active,
            expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : "",
        });
        setIsOpen(true);
    };

    const closeDialog = () => {
        setIsOpen(false);
        setEditing(null);
    };

    const handleSubmit = () => {
        const payload: any = {
            name: form.name,
            type: form.type,
            discountType: form.discountType,
            discountValue: Number(form.discountValue),
            active: form.active,
            code: form.type === 'PROMO_CODE' ? form.code || null : null,
            minQuantity: form.type === 'VOLUME_DISCOUNT' ? Number(form.minQuantity) : null,
            productId: form.type === 'VOLUME_DISCOUNT' && form.productId ? form.productId : null,
            minOrderTotal: form.type === 'PROMO_CODE' && form.minOrderTotal ? Number(form.minOrderTotal) : null,
            maxUses: form.maxUses ? Number(form.maxUses) : null,
            expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        };
        if (editing) {
            updateMutation.mutate({ id: editing.id, ...payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const isExpired = (promo: Promotion) => !!promo.expiresAt && new Date(promo.expiresAt) < new Date();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
                <Button onClick={openCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Ajouter
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                    <p className="text-muted-foreground col-span-2">Chargement...</p>
                ) : promotions.length === 0 ? (
                    <div className="col-span-2 text-center py-16 text-muted-foreground border border-dashed rounded-xl">
                        <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Aucune promotion créée</p>
                    </div>
                ) : promotions.map((promo) => (
                    <div key={promo.id} className={`bg-card border rounded-xl p-5 space-y-3 ${!promo.active || isExpired(promo) ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-base">{promo.name}</span>
                                    <Badge variant={promo.type === 'PROMO_CODE' ? 'default' : 'secondary'}>
                                        {promo.type === 'PROMO_CODE' ? 'Code Promo' : 'Remise Volume'}
                                    </Badge>
                                    {isExpired(promo) && <Badge variant="destructive">Expiré</Badge>}
                                    {!promo.active && !isExpired(promo) && <Badge variant="outline">Inactif</Badge>}
                                </div>
                                {promo.code && (
                                    <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded mt-1 inline-block">{promo.code}</span>
                                )}
                            </div>
                            <Switch
                                checked={promo.active}
                                onCheckedChange={(v) => toggleMutation.mutate({ id: promo.id, active: v })}
                            />
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                                <BarChart2 className="w-3.5 h-3.5" />
                                <span>
                                    Réduction: <strong className="text-foreground">
                                        {promo.discountType === 'PERCENT' ? `${promo.discountValue}%` : `${promo.discountValue} ${currency}`}
                                    </strong>
                                </span>
                            </div>
                            {promo.type === 'VOLUME_DISCOUNT' && (
                                <p>Dès <strong className="text-foreground">{promo.minQuantity} unités</strong>
                                    {promo.productId ? ` du produit sélectionné` : ` (tous les produits)`}
                                </p>
                            )}
                            {promo.type === 'PROMO_CODE' && promo.minOrderTotal ? (
                                <p>Commande min: <strong className="text-foreground">{promo.minOrderTotal} {currency}</strong></p>
                            ) : null}
                            <div className="flex gap-4 text-xs">
                                <span>Utilisé: <strong>{promo.usedCount}</strong>{promo.maxUses ? `/${promo.maxUses}` : ''}</span>
                                {promo.expiresAt && <span>Expire: <strong>{new Date(promo.expiresAt).toLocaleDateString('fr-FR')}</strong></span>}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(promo)}>
                                <Pencil className="w-3.5 h-3.5 mr-1" /> Modifier
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                                onClick={() => { if (confirm('Supprimer cette promotion ?')) deleteMutation.mutate(promo.id); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Modifier la promotion' : 'Nouvelle promotion'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Nom de la promotion</Label>
                            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Soldes été 2026" />
                        </div>

                        <div className="space-y-1">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PROMO_CODE">Code Promo</SelectItem>
                                    <SelectItem value="VOLUME_DISCOUNT">Remise Volume</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {form.type === 'PROMO_CODE' && (
                            <div className="space-y-1">
                                <Label>Code</Label>
                                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ETE2026" className="font-mono" />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Type de réduction</Label>
                                <Select value={form.discountType} onValueChange={(v: any) => setForm({ ...form, discountType: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PERCENT">Pourcentage (%)</SelectItem>
                                        <SelectItem value="FIXED">Montant fixe ({currency})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Valeur {form.discountType === 'PERCENT' ? '(%)' : `(${currency})`}</Label>
                                <Input type="number" min="0" value={form.discountValue}
                                    onChange={e => setForm({ ...form, discountValue: Number(e.target.value) })} />
                            </div>
                        </div>

                        {form.type === 'VOLUME_DISCOUNT' && (
                            <>
                                <div className="space-y-1">
                                    <Label>Quantité minimum</Label>
                                    <Input type="number" min="2" value={form.minQuantity}
                                        onChange={e => setForm({ ...form, minQuantity: Number(e.target.value) })} />
                                    <p className="text-xs text-muted-foreground">La réduction s'applique dès que l'article atteint cette quantité</p>
                                </div>
                                <div className="space-y-1">
                                    <Label>Produit concerné (optionnel)</Label>
                                    <Select value={form.productId || "__all__"} onValueChange={v => setForm({ ...form, productId: v === '__all__' ? '' : v })}>
                                        <SelectTrigger><SelectValue placeholder="Tous les produits" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__all__">Tous les produits</SelectItem>
                                            {products.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {form.type === 'PROMO_CODE' && (
                            <div className="space-y-1">
                                <Label>Montant minimum de commande ({currency})</Label>
                                <Input type="number" min="0" value={form.minOrderTotal}
                                    onChange={e => setForm({ ...form, minOrderTotal: Number(e.target.value) })} />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Limite d'utilisation</Label>
                                <Input type="number" min="1" value={form.maxUses}
                                    placeholder="Illimité"
                                    onChange={e => setForm({ ...form, maxUses: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label>Date d'expiration</Label>
                                <Input type="date" value={form.expiresAt}
                                    onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                            <Label>Active</Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
                            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                                {editing ? 'Enregistrer' : 'Créer'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Promotions;
