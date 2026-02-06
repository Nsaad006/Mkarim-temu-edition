import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/api/categories";
import { Category } from "@/data/mock-admin-data";
import { toast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { getImageUrl } from "@/lib/image-utils";

const Categories = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        active: true,
        icon: "",
        image: "",
    });

    // Fetch categories (including inactive ones for admin panel)
    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['categories', 'all'],
        queryFn: () => categoriesApi.getAll(true),
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: Partial<Category>) => categoriesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({ title: "Catégorie créée" });
            setIsDialogOpen(false);
            resetForm();
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Category> }) => categoriesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({ title: "Catégorie modifiée" });
            setIsDialogOpen(false);
            resetForm();
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => categoriesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast({ title: "Catégorie supprimée" });
        }
    });

    const filteredCategories = categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const resetForm = () => {
        setFormData({ name: "", slug: "", active: true, icon: "", image: "" });
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
        });
        setIsDialogOpen(true);
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Supprimer cette catégorie ?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleStatusToggle = (category: Category) => {
        const newStatus = !category.active;
        updateMutation.mutate({
            id: category.id,
            data: { active: newStatus }
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Ajouter
                </Button>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="mb-6 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Image</TableHead>
                                <TableHead className="text-center">Aperçu</TableHead>
                                <TableHead>Produits</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCategories.map((category) => (
                                <TableRow key={category.id} className="hover:bg-muted/5 transition-colors">
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-xs">{category.slug}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {category.image ? (
                                            <span className="text-green-500 text-xs">✓ Image</span>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">{category.icon || "-"}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex justify-center">
                                            {category.image ? (
                                                <img
                                                    src={getImageUrl(category.image)}
                                                    alt={category.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-border"
                                                />
                                            ) : (() => {
                                                const iconName = category.icon || "";
                                                const normalized = iconName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

                                                const aliases: Record<string, string> = {
                                                    'motocycle': 'motorcycle',
                                                    'moto': 'motorcycle',
                                                    'scooter': 'bike',
                                                    'trottinette': 'bike'
                                                };

                                                const target = aliases[normalized] || normalized;
                                                const foundKey = Object.keys(LucideIcons).find(key => key.toLowerCase() === target);
                                                const Icon = foundKey ? (LucideIcons as any)[foundKey] : null;
                                                return Icon ? <Icon className="w-5 h-5 text-muted-foreground" /> : <div className="w-5 h-5 bg-muted rounded-md border border-border" />;
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell>{category.productsCount || 0}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={category.active}
                                                onCheckedChange={() => handleStatusToggle(category)}
                                            />
                                            <span className="text-xs font-medium">
                                                {category.active ? "Actif" : "Inactif"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(category.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedCategory ? "Modifier" : "Nouvelle Catégorie"}</DialogTitle>
                        <DialogDescription>
                            Gérez les catégories de produits de votre boutique.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Ex: PC Gamer"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (URL)</Label>
                            <Input
                                id="slug"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                placeholder="ex: pc-gamer"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Image de la catégorie</Label>
                            <ImageUpload
                                value={formData.image}
                                onChange={(url) => setFormData({ ...formData, image: url })}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Image circulaire affichée sur la page d'accueil (recommandé: 400x400px)
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="icon">Icône de secours (Nom Lucide)</Label>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <Input
                                        id="icon"
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        placeholder="Ex: Laptop, Smartphone, Gamepad2"
                                    />
                                </div>
                                <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center">
                                    {(() => {
                                        const iconName = formData.icon;
                                        if (!iconName) return <div className="w-1 h-3 bg-border" />;
                                        const normalized = iconName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

                                        const aliases: Record<string, string> = {
                                            'motocycle': 'motorcycle',
                                            'moto': 'motorcycle',
                                            'scooter': 'bike',
                                            'trottinette': 'bike'
                                        };

                                        const target = aliases[normalized] || normalized;
                                        const foundKey = Object.keys(LucideIcons).find(key => key.toLowerCase() === target);
                                        const Icon = foundKey ? (LucideIcons as any)[foundKey] : null;
                                        return Icon ? <Icon className="w-5 h-5 text-primary" /> : <div className="w-1 h-3 bg-red-500/50" />;
                                    })()}
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Icône affichée si aucune image n'est téléchargée. Utilisez les noms de <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="text-primary hover:underline">Lucide Icons</a>
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
