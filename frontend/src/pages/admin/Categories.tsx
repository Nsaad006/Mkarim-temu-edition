import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, FolderTree, Folder } from "lucide-react";
import * as LucideIcons from "lucide-react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/api/categories";
import { Category } from "@/data/mock-admin-data";
import { toast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { getImageUrl } from "@/lib/image-utils";
import { PERMISSIONS } from "@/constants/permissions";

type TabType = "parents" | "children";

const Categories = () => {
    const [activeTab, setActiveTab] = useState<TabType>("parents");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<{
        name: string;
        slug: string;
        active: boolean;
        icon: string;
        image: string;
        parentId: string | null;
    }>({
        name: "",
        slug: "",
        active: true,
        icon: "",
        image: "",
        parentId: null,
    });

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { role: "viewer", permissions: [] };
    const userPermissions = user.permissions || [];
    const isSuperAdmin = user.role === 'super_admin';
    const canCreate = isSuperAdmin || userPermissions.includes(PERMISSIONS.CATEGORIES_CREATE) || userPermissions.includes(PERMISSIONS.CATEGORIES_MANAGE);
    const canEdit = isSuperAdmin || userPermissions.includes(PERMISSIONS.CATEGORIES_EDIT) || userPermissions.includes(PERMISSIONS.CATEGORIES_MANAGE);
    const canDelete = isSuperAdmin || userPermissions.includes(PERMISSIONS.CATEGORIES_DELETE) || userPermissions.includes(PERMISSIONS.CATEGORIES_MANAGE);

    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['categories', 'all'],
        queryFn: () => categoriesApi.getAll(true),
    });

    const parentCategories = categories.filter((c: any) => !c.parentId);
    const childCategories = categories.filter((c: any) => !!c.parentId);

    const filteredParents = parentCategories.filter((c: any) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredChildren = childCategories.filter((c: any) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const createMutation = useMutation({
        mutationFn: (data: Partial<Category>) => categoriesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({ title: "Catégorie créée avec succès" });
            setIsDialogOpen(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Category> }) => categoriesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({ title: "Catégorie modifiée" });
            setIsDialogOpen(false);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => categoriesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({ title: "Catégorie supprimée" });
        }
    });

    const resetForm = () => {
        setFormData({ name: "", slug: "", active: true, icon: "", image: "", parentId: null });
        setSelectedCategory(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCategory) {
            updateMutation.mutate({ id: selectedCategory.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const openEditDialog = (category: Category) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name,
            slug: category.slug,
            active: category.active,
            icon: category.icon || "",
            image: category.image || "",
            parentId: (category as any).parentId || null,
        });
        setIsDialogOpen(true);
    };

    const openCreateDialog = (defaultParentId: string | null = null) => {
        resetForm();
        setFormData(prev => ({ ...prev, parentId: defaultParentId }));
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Supprimer cette catégorie ? Les sous-catégories orphelines seront également supprimées.")) {
            deleteMutation.mutate(id);
        }
    };

    const handleStatusToggle = (category: Category) => {
        updateMutation.mutate({ id: category.id, data: { active: !category.active } });
    };

    const renderIconPreview = (iconName: string) => {
        if (!iconName) return <div className="w-5 h-5 bg-muted rounded-full border border-border" />;
        const normalized = iconName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const aliases: Record<string, string> = { 'motocycle': 'motorcycle', 'moto': 'motorcycle', 'scooter': 'bike', 'trottinette': 'bike' };
        const target = aliases[normalized] || normalized;
        const foundKey = Object.keys(LucideIcons).find(key => key.toLowerCase() === target);
        const Icon = foundKey ? (LucideIcons as any)[foundKey] : null;
        return Icon ? <Icon className="w-5 h-5 text-muted-foreground" /> : <div className="w-5 h-5 bg-muted rounded-full border border-border" />;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const tabs: { key: TabType; label: string; icon: React.ElementType; count: number }[] = [
        { key: "parents", label: "Catégories Parentes", icon: FolderTree, count: parentCategories.length },
        { key: "children", label: "Sous-Catégories", icon: Folder, count: childCategories.length },
    ];

    const currentList = activeTab === "parents" ? filteredParents : filteredChildren;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {parentCategories.length} parentes · {childCategories.length} sous-catégories
                    </p>
                </div>
                {canCreate && (
                    <Button onClick={() => openCreateDialog(activeTab === "children" ? (parentCategories[0]?.id ?? null) : null)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {activeTab === "parents" ? "Ajouter une parente" : "Ajouter une sous-catégorie"}
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit border border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setSearchTerm(""); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === tab.key
                                ? "bg-background text-foreground shadow-sm border border-border"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            activeTab === tab.key ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Card */}
            <div className="bg-card rounded-xl border border-border shadow-sm">
                {/* Search Bar */}
                <div className="p-4 border-b border-border">
                    <div className="max-w-sm relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={`Rechercher une ${activeTab === "parents" ? "catégorie parente" : "sous-catégorie"}...`}
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {currentList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                            {activeTab === "parents" ? <FolderTree className="w-10 h-10 opacity-30" /> : <Folder className="w-10 h-10 opacity-30" />}
                            <p className="text-sm font-medium">
                                {searchTerm
                                    ? "Aucun résultat"
                                    : `Aucune ${activeTab === "parents" ? "catégorie parente" : "sous-catégorie"} trouvée`}
                            </p>
                            {canCreate && !searchTerm && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openCreateDialog(activeTab === "children" ? (parentCategories[0]?.id ?? null) : null)}
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Créer maintenant
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead>Aperçu</TableHead>
                                    <TableHead>Nom</TableHead>
                                    {activeTab === "children" && <TableHead>Catégorie Parente</TableHead>}
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Produits</TableHead>
                                    {activeTab === "parents" && <TableHead>Sous-catégories</TableHead>}
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentList.map((category: any) => {
                                    const childCount = childCategories.filter((c: any) => c.parentId === category.id).length;
                                    const parentName = categories.find((c: any) => c.id === category.parentId)?.name;

                                    return (
                                        <TableRow key={category.id} className="hover:bg-muted/5 transition-colors">
                                            {/* Image / Icon preview */}
                                            <TableCell>
                                                <div className="flex items-center justify-center w-10 h-10">
                                                    {category.image ? (
                                                        <img
                                                            src={getImageUrl(category.image)}
                                                            alt={category.name}
                                                            className="w-10 h-10 rounded-full object-cover border border-border"
                                                        />
                                                    ) : renderIconPreview(category.icon || "")}
                                                </div>
                                            </TableCell>

                                            {/* Name */}
                                            <TableCell className="font-medium">{category.name}</TableCell>

                                            {/* Parent name — only for children tab */}
                                            {activeTab === "children" && (
                                                <TableCell>
                                                    {parentName ? (
                                                        <Badge variant="secondary" className="font-normal">{parentName}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                            )}

                                            {/* Slug */}
                                            <TableCell className="text-muted-foreground font-mono text-xs">{category.slug}</TableCell>

                                            {/* Products count */}
                                            <TableCell>
                                                <span className="font-semibold">{category.productsCount || 0}</span>
                                            </TableCell>

                                            {/* Children count — only for parents tab */}
                                            {activeTab === "parents" && (
                                                <TableCell>
                                                    {childCount > 0 ? (
                                                        <Badge variant="outline" className="text-xs gap-1">
                                                            <Folder className="w-3 h-3" /> {childCount}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                            )}

                                            {/* Status toggle */}
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={category.active}
                                                        onCheckedChange={() => handleStatusToggle(category)}
                                                        disabled={!canEdit}
                                                    />
                                                    <span className="text-xs font-medium">
                                                        {category.active ? "Actif" : "Inactif"}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {/* Quick: add child — only shown in parents tab */}
                                                    {activeTab === "parents" && canCreate && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Ajouter une sous-catégorie"
                                                            onClick={() => {
                                                                openCreateDialog(category.id);
                                                                setActiveTab("children");
                                                            }}
                                                        >
                                                            <Plus className="w-4 h-4 text-primary" />
                                                        </Button>
                                                    )}
                                                    {canEdit && (
                                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {canDelete && (
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(category.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedCategory ? "Modifier la catégorie" : formData.parentId ? "Nouvelle Sous-Catégorie" : "Nouvelle Catégorie Parente"}
                        </DialogTitle>
                        <DialogDescription>
                            {formData.parentId
                                ? `Sous-catégorie de : ${categories.find((c: any) => c.id === formData.parentId)?.name || "—"}`
                                : "Catégorie principale — sera affichée dans la barre de navigation."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        {/* Parent selector */}
                        <div className="space-y-2">
                            <Label>Catégorie Parente</Label>
                            <Select
                                value={formData.parentId || "none"}
                                onValueChange={(val) => setFormData({ ...formData, parentId: val === "none" ? null : val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Aucune (Catégorie principale)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Aucune (Catégorie principale)</SelectItem>
                                    {parentCategories
                                        .filter((c: any) => c.id !== selectedCategory?.id)
                                        .map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder={formData.parentId ? "Ex: Souris Gaming" : "Ex: PC Gamer"}
                            />
                        </div>

                        {/* Slug */}
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (URL)</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                placeholder={formData.parentId ? "ex: souris-gaming" : "ex: pc-gamer"}
                            />
                        </div>

                        {/* Image */}
                        <div className="space-y-2">
                            <Label>Image (cercle sur la page d'accueil)</Label>
                            <ImageUpload
                                value={formData.image}
                                onChange={(url) => setFormData({ ...formData, image: url })}
                            />
                            <p className="text-[10px] text-muted-foreground">Recommandé : 400×400 px, format carré</p>
                        </div>

                        {/* Fallback icon */}
                        <div className="space-y-2">
                            <Label htmlFor="icon">Icône de secours (Lucide)</Label>
                            <div className="flex gap-3 items-center">
                                <Input
                                    id="icon"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    placeholder="Ex: Laptop, Gamepad2, Monitor"
                                    className="flex-1"
                                />
                                <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                                    {renderIconPreview(formData.icon)}
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Utilisée si aucune image. Voir{" "}
                                <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="text-primary hover:underline">lucide.dev/icons</a>
                            </p>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Categories;
