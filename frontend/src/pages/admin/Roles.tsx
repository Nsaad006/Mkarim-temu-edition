import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash, Check, X, Shield, Info, Users } from "lucide-react";
import { logEvent } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/api-client";
import { PERMISSIONS, PERMISSIONS_LABELS, CATEGORY_LABELS } from "@/constants/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    _count?: {
        admins: number;
    };
    createdAt: string;
}

const Roles = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        permissions: [] as string[]
    });


    const CATEGORY_LABELS: Record<string, string> = {
        PRODUCTS: "PRODUITS",
        CATEGORIES: "CATÉGORIES",
        ORDERS: "COMMANDES",
        CUSTOMERS: "CLIENTS",
        WHOLESALERS: "GROSSISTES",
        ANALYTICS: "STATISTIQUES",
        SETTINGS: "PARAMÈTRES",
        USERS: "UTILISATEURS",
        ROLES: "RÔLES",
        MESSAGES: "MESSAGES",
        LOGISTICS: "LOGISTIQUE",
    };

    // Group available permissions by category
    const permissionCategories = Object.values(PERMISSIONS).reduce((acc, perm) => {
        const category = perm.split(':')[0].toUpperCase();
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
    }, {} as Record<string, string[]>);

    // Fetch Roles
    const { data: roles, isLoading } = useQuery<Role[]>({
        queryKey: ["roles"],
        queryFn: async () => {
            const { data } = await apiClient.get("/api/roles");
            return data;
        },
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            await apiClient.post("/api/roles", data);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            logEvent({ action: "ROLE_CREATED", metadata: { roleName: data?.name } });
            toast({ title: "Rôle créé avec succès" });
            handleCloseDialog();
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de créer le rôle",
                variant: "destructive",
            });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            await apiClient.put(`/api/roles/${editingRole?.id}`, data);
            return { ...data, id: editingRole?.id };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            logEvent({ action: "ROLE_UPDATED", metadata: { roleId: data?.id, roleName: data?.name } });
            toast({ title: "Rôle mis à jour" });
            handleCloseDialog();
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de modifier le rôle",
                variant: "destructive",
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/api/roles/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            logEvent({ action: "ROLE_DELETED", metadata: { roleId: id } });
            toast({ title: "Rôle supprimé" });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de supprimer le rôle",
                variant: "destructive",
            });
        },
    });

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || "",
            permissions: role.permissions,
        });
        setIsDialogOpen(true);
    };

    const handlePermissionToggle = (perm: string) => {
        setFormData(prev => {
            const newPerms = prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm];
            return { ...prev, permissions: newPerms };
        });
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setEditingRole(null);
        setFormData({ name: "", description: "", permissions: [] });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingRole) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    if (isLoading) return <div className="p-8">Chargement...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold">Gestion des Rôles</h1>
                    <p className="text-muted-foreground">Créez et gérez les rôles utilisateurs et leurs permissions</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nouveau Rôle
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {roles?.map((role) => (
                    <Card key={role.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2 mb-1">
                                        <Shield className="w-5 h-5 text-primary" />
                                        {role.name}
                                    </CardTitle>
                                    <CardDescription>{role.description || "Aucune description"}</CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
                                        <Pencil className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            if (confirm("Êtes-vous sûr de vouloir supprimer ce rôle ?")) {
                                                deleteMutation.mutate(role.id);
                                            }
                                        }}
                                        disabled={(role._count?.admins || 0) > 0}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {role.permissions.slice(0, 5).map(perm => (
                                    <Badge key={perm} variant="secondary" className="text-xs">
                                        {PERMISSIONS_LABELS[perm] || perm.split(':')[1]}
                                    </Badge>
                                ))}
                                {role.permissions.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                        +{role.permissions.length - 5} autres
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Users className="w-4 h-4 mr-2" />
                                {role._count?.admins || 0} utilisateurs
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? "Modifier le rôle" : "Créer un nouveau rôle TEST"}</DialogTitle>
                        <DialogDescription>
                            Définissez le nom et les permissions pour ce rôle.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                        <form id="role-form" onSubmit={handleSubmit} className="space-y-6 py-4">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nom du rôle</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Responsable Marketing"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Description du rôle..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Autorisations par catégorie</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(permissionCategories).map(([category, perms]) => (
                                        <div key={category} className="space-y-3 p-4 border rounded-lg bg-card/50">
                                            <h4 className="font-bold text-sm text-primary tracking-wider">
                                                {category === "PRODUCTS" ? "PRODUITS" :
                                                    category === "CATEGORIES" ? "CATÉGORIES" :
                                                        category === "ORDERS" ? "COMMANDES" :
                                                            category === "CUSTOMERS" ? "CLIENTS" :
                                                                category === "WHOLESALERS" ? "GROSSISTES" :
                                                                    category === "ANALYTICS" ? "STATISTIQUES" :
                                                                        category === "SETTINGS" ? "PARAMÈTRES" :
                                                                            category === "USERS" ? "UTILISATEURS" :
                                                                                category === "ROLES" ? "RÔLES" :
                                                                                    category === "MESSAGES" ? "MESSAGES" :
                                                                                        category === "LOGISTICS" ? "LOGISTIQUE" :
                                                                                            category}
                                            </h4>
                                            <div className="space-y-2">
                                                {perms.map((perm) => (
                                                    <div key={perm} className="flex items-start space-x-2">
                                                        <Checkbox
                                                            id={perm}
                                                            checked={formData.permissions.includes(perm)}
                                                            onCheckedChange={() => handlePermissionToggle(perm)}
                                                        />
                                                        <Label
                                                            htmlFor={perm}
                                                            className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                        >
                                                            {PERMISSIONS_LABELS[perm] || perm.split(':')[1]}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </div>

                    <DialogFooter className="mt-4 pt-4 border-t">
                        <Button variant="outline" onClick={handleCloseDialog} type="button">Annuler</Button>
                        <Button type="submit" form="role-form">
                            {editingRole ? "Enregistrer" : "Créer le rôle"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Roles;
