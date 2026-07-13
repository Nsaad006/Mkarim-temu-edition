import { useState } from "react";
import { AxiosError } from "axios";
import { Plus, Trash2, Mail, Shield, Pencil, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api-client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminsApi, AdminUser } from "@/api/admins";
import { commissionApi } from "@/api/commission";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { logEvent } from "@/lib/logger";
import { useSettings } from "@/context/SettingsContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const AdminUsers = () => {
    const { settings } = useSettings();
    const currency = settings?.currency || "DH";
    const now = new Date();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [originalRole, setOriginalRole] = useState<{ role: string; roleId: string | null }>({ role: "", roleId: null });
    const [newPassword, setNewPassword] = useState("");

    // Commission panel state
    const [commissionUser, setCommissionUser] = useState<AdminUser | null>(null);
    const [commMonth, setCommMonth] = useState(now.getMonth() + 1);
    const [commYear, setCommYear] = useState(now.getFullYear());
    const [payNote, setPayNote] = useState("");
    const [payAmount, setPayAmount] = useState("");
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "viewer",
        allowedCategories: [] as string[]
    });

    // Fetch admins
    const { data: admins = [], isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: () => adminsApi.getAll(),
    });

    // Fetch dynamic roles
    const { data: dynamicRoles = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data } = await apiClient.get<any[]>('/api/roles');
            return data;
        },
    });

    // Fetch categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await apiClient.get<any[]>('/api/categories');
            return data;
        },
    });

    // Commission data for selected agent
    const { data: commData, isLoading: commLoading } = useQuery({
        queryKey: ['agent-commission-admin', commissionUser?.id, commMonth, commYear],
        queryFn: () => commissionApi.getAgentStats(commissionUser!.id, commMonth, commYear),
        enabled: !!commissionUser,
    });

    const payMutation = useMutation({
        mutationFn: (payload: { amount: number; month: number; year: number; note?: string }) =>
            commissionApi.payAgent(commissionUser!.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-commission-admin'] });
            setPayAmount("");
            setPayNote("");
            toast({ title: "Paiement enregistré", description: "La commission a été marquée comme payée." });
        },
        onError: () => toast({ title: "Erreur", description: "Impossible d'enregistrer le paiement.", variant: "destructive" })
    });

    // Create admin
    const createMutation = useMutation({
        mutationFn: (data: typeof formData) => adminsApi.create(data),
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            logEvent({ action: "ADMIN_USER_CREATED", metadata: { newUserEmail: data.email, role: data.role } });
            toast({
                title: "Utilisateur ajouté",
                description: "Le nouvel administrateur a été créé avec succès.",
            });
            setIsDialogOpen(false);
            setFormData({ name: "", email: "", password: "", role: "viewer", allowedCategories: [] });
        },
        onError: (error: AxiosError<{ error: string }>) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible d'ajouter l'utilisateur.",
                variant: "destructive",
            });
        }
    });

    // Delete admin
    const deleteMutation = useMutation({
        mutationFn: (id: string) => adminsApi.delete(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            logEvent({ action: "ADMIN_USER_DELETED", metadata: { deletedUserId: id } });
            toast({
                title: "Utilisateur supprimé",
                description: "L'administrateur a été retiré avec succès.",
            });
        },
        onError: (error: AxiosError<{ error: string }>) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de supprimer l'utilisateur.",
                variant: "destructive",
            });
        }
    });

    // Status toggle
    const statusMutation = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) => adminsApi.updateStatus(id, active),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            logEvent({ action: "ADMIN_USER_STATUS_CHANGED", metadata: { userId: variables.id, active: variables.active } });
        }
    });

    // Update categories mutation
    const updateCategoriesMutation = useMutation({
        mutationFn: ({ id, allowedCategories }: { id: string; allowedCategories: string[] }) => adminsApi.updateCategories(id, allowedCategories),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        }
    });

    // Update role mutation
    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }: { id: string; role: string }) => adminsApi.updateRole(id, role),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            logEvent({ action: "ADMIN_USER_ROLE_CHANGED", metadata: { userId: variables.id, newRole: variables.role } });
            toast({
                title: "Rôle modifié",
                description: "Le rôle de l'utilisateur a été mis à jour avec succès.",
            });
            setIsEditDialogOpen(false);
            setEditingUser(null);
        },
        onError: (error: AxiosError<{ error: string }>) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de modifier le rôle.",
                variant: "destructive",
            });
        }
    });

    // Update password mutation
    const updatePasswordMutation = useMutation({
        mutationFn: ({ id, password }: { id: string; password: string }) => adminsApi.updatePassword(id, password),
        onSuccess: (_, variables) => {
            logEvent({ action: "ADMIN_USER_PASSWORD_CHANGED", metadata: { userId: variables.id } });
            toast({
                title: "Mot de passe modifié",
                description: "Le mot de passe a été mis à jour avec succès.",
            });
        },
        onError: (error: AxiosError<{ error: string }>) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de modifier le mot de passe.",
                variant: "destructive",
            });
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            // Only update role if it actually changed — avoids "Cannot change main admin role"
            // error when the role dropdown was never touched
            const newRolePayload = editingUser.roleId || editingUser.role;
            const oldRolePayload = originalRole.roleId || originalRole.role;
            if (newRolePayload !== oldRolePayload) {
                await updateRoleMutation.mutateAsync({ id: editingUser.id, role: newRolePayload });
            }

            // Update categories
            await updateCategoriesMutation.mutateAsync({ id: editingUser.id, allowedCategories: editingUser.allowedCategories || [] });

            // Update password if provided
            if (newPassword.trim()) {
                await updatePasswordMutation.mutateAsync({ id: editingUser.id, password: newPassword });
            }

            setIsEditDialogOpen(false);
            setEditingUser(null);
            setNewPassword("");
        } catch (error) {
            // Errors are handled by individual mutations
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Utilisateurs Admin</h1>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Ajouter un Admin
                </Button>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="whitespace-nowrap">Utilisateur</TableHead>
                                <TableHead className="whitespace-nowrap">Rôle</TableHead>
                                <TableHead className="whitespace-nowrap">Dernière Connexion</TableHead>
                                <TableHead className="whitespace-nowrap">Statut</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Chargement des administrateurs...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : admins.length > 0 ? (
                                admins.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="min-w-[200px]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="w-3 h-3" /> {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            <Badge variant="outline" className="gap-1 capitalize">
                                                <Shield className="w-3 h-3" />
                                                {user.assignedRole ? user.assignedRole.name : user.role.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                            Active
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={user.active}
                                                onCheckedChange={(checked) => statusMutation.mutate({ id: user.id, active: checked })}
                                                disabled={statusMutation.isPending}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Commissions"
                                                onClick={() => {
                                                    setCommissionUser(user);
                                                    setCommMonth(now.getMonth() + 1);
                                                    setCommYear(now.getFullYear());
                                                }}
                                            >
                                                <DollarSign className="w-4 h-4 text-primary" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setOriginalRole({ role: user.role, roleId: (user as any).roleId || null });
                                                    setIsEditDialogOpen(true);
                                                }}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                onClick={() => {
                                                    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
                                                        deleteMutation.mutate(user.id);
                                                    }
                                                }}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Aucun administrateur trouvé.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un Administrateur</DialogTitle>
                        <DialogDescription>
                            Remplissez les informations ci-dessous pour créer un nouvel administrateur.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom complet</Label>
                            <Input
                                required
                                placeholder="Ex: Ahmed Benjelloun"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                required
                                placeholder="email@exemple.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mot de passe</Label>
                            <Input
                                type="password"
                                required
                                placeholder="******"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rôle</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(val) => setFormData({ ...formData, role: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner le rôle" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="super_admin">Super Admin (Accès Total)</SelectItem>
                                    <SelectItem value="editor">Éditeur (Gestion Commandes/Produits)</SelectItem>
                                    <SelectItem value="viewer">Observateur (Lecture seule)</SelectItem>
                                    <SelectItem value="commercial">Commercial (Confirmer/Annuler Commandes)</SelectItem>
                                    <SelectItem value="magasinier">Magasinier (Expédier/Livrer Commandes)</SelectItem>
                                    {dynamicRoles.length > 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">Rôles Personnalisés</div>}
                                    {dynamicRoles.map((role: any) => (
                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3 pt-2">
                            <Label>Catégories autorisées (Laissez vide pour autoriser toutes)</Label>
                            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg border max-h-40 overflow-y-auto">
                                {categories.map((cat: any) => (
                                    <div key={cat.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`cat-${cat.id}`}
                                            checked={formData.allowedCategories.includes(cat.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setFormData({ ...formData, allowedCategories: [...formData.allowedCategories, cat.id] });
                                                } else {
                                                    setFormData({ ...formData, allowedCategories: formData.allowedCategories.filter(id => id !== cat.id) });
                                                }
                                            }}
                                        />
                                        <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer mb-0 pb-0">{cat.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={createMutation.isPending}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Création...
                                    </>
                                ) : "Inviter"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Role Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier le Rôle</DialogTitle>
                        <DialogDescription>
                            Modifiez le rôle et les permissions de cet utilisateur.
                        </DialogDescription>
                    </DialogHeader>
                    {editingUser && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Utilisateur</Label>
                                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {editingUser.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium">{editingUser.name}</p>
                                        <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Nouveau Rôle</Label>
                                <Select
                                    value={editingUser.roleId || editingUser.role}
                                    onValueChange={(val) => setEditingUser({ ...editingUser, role: val, roleId: null })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="super_admin">Super Admin (Accès Total)</SelectItem>
                                        <SelectItem value="editor">Éditeur (Gestion Commandes/Produits)</SelectItem>
                                        <SelectItem value="viewer">Observateur (Lecture seule)</SelectItem>
                                        <SelectItem value="commercial">Commercial (Confirmer/Annuler Commandes)</SelectItem>
                                        <SelectItem value="magasinier">Magasinier (Expédier/Livrer Commandes)</SelectItem>
                                        {dynamicRoles.length > 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">Rôles Personnalisés</div>}
                                        {dynamicRoles.map((role: any) => (
                                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3 pt-2">
                                <Label>Catégories autorisées (Laissez vide pour autoriser toutes)</Label>
                                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg border max-h-40 overflow-y-auto">
                                    {categories.map((cat: any) => (
                                        <div key={cat.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`edit-cat-${cat.id}`}
                                                checked={(editingUser.allowedCategories || []).includes(cat.id)}
                                                onCheckedChange={(checked) => {
                                                    const current = editingUser.allowedCategories || [];
                                                    if (checked) {
                                                        setEditingUser({ ...editingUser, allowedCategories: [...current, cat.id] });
                                                    } else {
                                                        setEditingUser({ ...editingUser, allowedCategories: current.filter(id => id !== cat.id) });
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`edit-cat-${cat.id}`} className="text-sm cursor-pointer mb-0 pb-0">{cat.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2 pt-2">
                                <Label>Nouveau Mot de passe (optionnel)</Label>
                                <Input
                                    type="password"
                                    placeholder="Laisser vide pour ne pas changer"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Minimum 6 caractères</p>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setEditingUser(null);
                                        setNewPassword("");
                                        setOriginalRole({ role: "", roleId: null });
                                    }}
                                    disabled={updateRoleMutation.isPending}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    onClick={handleUpdateUser}
                                    disabled={updateRoleMutation.isPending || updatePasswordMutation.isPending}
                                >
                                    {(updateRoleMutation.isPending || updatePasswordMutation.isPending) ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Modification...
                                        </>
                                    ) : "Enregistrer"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Commission Panel Dialog */}
            <Dialog open={!!commissionUser} onOpenChange={(open) => { if (!open) setCommissionUser(null); }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Commissions — {commissionUser?.name}</DialogTitle>
                        <DialogDescription>Statistiques et paiements de commission</DialogDescription>
                    </DialogHeader>

                    {/* Month navigator */}
                    <div className="flex items-center gap-2 justify-center">
                        <Button variant="outline" size="icon" onClick={() => {
                            if (commMonth === 1) { setCommMonth(12); setCommYear(y => y - 1); }
                            else setCommMonth(m => m - 1);
                        }}><ChevronLeft className="w-4 h-4" /></Button>
                        <span className="text-sm font-medium w-36 text-center">{MONTH_NAMES[commMonth - 1]} {commYear}</span>
                        <Button variant="outline" size="icon" onClick={() => {
                            if (commMonth === 12) { setCommMonth(1); setCommYear(y => y + 1); }
                            else setCommMonth(m => m + 1);
                        }}><ChevronRight className="w-4 h-4" /></Button>
                    </div>

                    {commLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : commData && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <Card>
                                    <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Commandes confirmées</CardTitle></CardHeader>
                                    <CardContent><p className="text-xl font-bold">{commData.ordersConfirmed}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Commandes livrées</CardTitle></CardHeader>
                                    <CardContent><p className="text-xl font-bold">{commData.ordersDelivered}</p></CardContent>
                                </Card>
                                <Card className="border-primary/30 bg-primary/5">
                                    <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">À payer</CardTitle></CardHeader>
                                    <CardContent><p className="text-xl font-bold text-primary">{commData.pendingPayment.toFixed(2)} {currency}</p></CardContent>
                                </Card>
                            </div>

                            <div className="flex gap-4 text-sm">
                                <span className="text-muted-foreground">Gagné: <strong>{commData.totalEarned.toFixed(2)} {currency}</strong></span>
                                <span className="text-muted-foreground">Payé: <strong className="text-green-600">{commData.totalPaid.toFixed(2)} {currency}</strong></span>
                            </div>

                            {/* Pay form */}
                            {commData.pendingPayment > 0 && (
                                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                                    <p className="text-sm font-medium">Enregistrer un paiement</p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder={`Montant (max ${commData.pendingPayment.toFixed(2)} ${currency})`}
                                            value={payAmount}
                                            onChange={e => setPayAmount(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Input
                                            placeholder="Note (optionnel)"
                                            value={payNote}
                                            onChange={e => setPayNote(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            disabled={payMutation.isPending || !payAmount || parseFloat(payAmount) <= 0}
                                            onClick={() => payMutation.mutate({
                                                amount: parseFloat(payAmount),
                                                month: commMonth,
                                                year: commYear,
                                                note: payNote || undefined
                                            })}
                                        >
                                            {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Payer"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Commission records */}
                            {commData.records.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Détail des commissions</p>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Commande</TableHead>
                                                <TableHead>Client</TableHead>
                                                <TableHead>Commission</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {commData.records.map(rec => (
                                                <TableRow key={rec.id}>
                                                    <TableCell className="font-medium text-xs">{rec.order.orderNumber}</TableCell>
                                                    <TableCell className="text-sm">{rec.order.customerName}</TableCell>
                                                    <TableCell className="font-semibold text-primary text-sm">{rec.amount.toFixed(2)} {currency}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={
                                                            rec.status === 'PAID' ? "text-green-600 border-green-500/20" :
                                                            rec.status === 'CANCELLED' ? "text-red-500 border-red-500/20" :
                                                            "text-yellow-600 border-yellow-500/20"
                                                        }>
                                                            {rec.status === 'PAID' ? 'Payé' : rec.status === 'CANCELLED' ? 'Annulé' : 'En attente'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {format(new Date(rec.createdAt), "dd MMM", { locale: fr })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Payment history */}
                            {commData.payments.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-2">Paiements effectués</p>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Montant</TableHead>
                                                <TableHead>Note</TableHead>
                                                <TableHead>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {commData.payments.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-semibold text-green-600">+{p.amount.toFixed(2)} {currency}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{p.note || "—"}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {format(new Date(p.createdAt), "dd MMM yyyy", { locale: fr })}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminUsers;
