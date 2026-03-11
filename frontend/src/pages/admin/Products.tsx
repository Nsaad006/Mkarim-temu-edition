import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import {
    Plus, Pencil, Trash2, Search, AlertCircle, Star, Sparkles,
    Cpu, Zap, HardDrive, Tag, Monitor, Terminal, Power, Box,
    Wind, Maximize, Activity, Wifi, Battery, Weight, Layers,
    Keyboard, MousePointer2, Palette, ShieldCheck, CircuitBoard,
    Target, Snowflake, RefreshCw, Layout, Scale, ArchiveRestore,
    ArrowLeft
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { productsApi } from "@/api/products";
import { categoriesApi } from "@/api/categories";
import { suppliersApi } from "@/api/suppliers";
import { Product } from "@/data/products";
import { ImageUpload } from "@/components/ImageUpload";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { getImageUrl } from "@/lib/image-utils";
import { useSettings } from "@/context/SettingsContext";

import { Pagination } from "@/components/admin/Pagination";
import { PERMISSIONS } from "@/constants/permissions";

const AdminProducts = () => {
    const { searchQuery: globalSearch } = useOutletContext<{ searchQuery: string }>();
    const { currency } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [adjustmentPassword, setAdjustmentPassword] = useState("");
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [passwordActionType, setPasswordActionType] = useState<'COST' | 'STOCK'>('COST');
    const [pendingProductData, setPendingProductData] = useState<any>(null);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [showTrash, setShowTrash] = useState(false);
    const queryClient = useQueryClient();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Get current user
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { role: "viewer", permissions: [] };
    const userPermissions = user.permissions || [];

    const [searchParams, setSearchParams] = useSearchParams();

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        originalPrice: "",
        categoryId: "",
        images: [] as string[],
        inStock: true,
        quantity: "0",
        badge: "",
        specs: [] as { key: string, value: string }[],
        supplierId: "", // New required field
        unitCostPrice: "", // New required field
        isFeatured: false,
        published: true,
    });

    // Fetch categories (all, including inactive for admin)
    const { data: categories = [] } = useQuery({
        queryKey: ['categories', 'all'],
        queryFn: () => categoriesApi.getAll(true),
    });

    // Fetch suppliers for the creation form
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: suppliersApi.getAll,
    });

    // Fetch products
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['admin-products', showTrash],
        queryFn: () => productsApi.getAll({ trashed: showTrash }),
    });

    // Check for edit query param
    useEffect(() => {
        const editId = searchParams.get("edit");
        if (editId && products.length > 0 && !isDialogOpen && !editingProduct) {
            const productToEdit = products.find(p => p.id === editId);
            if (productToEdit) {
                handleEdit(productToEdit);
                // Clean up URL without refreshing
                setSearchParams(params => {
                    params.delete("edit");
                    return params;
                });
            }
        }
    }, [products, searchParams, isDialogOpen, editingProduct, setSearchParams]);

    // Create product mutation
    const createMutation = useMutation({
        mutationFn: (data: Omit<Product, 'id'>) => productsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
            toast({
                title: "Produit créé",
                description: "Le produit a été ajouté avec succès.",
            });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: AxiosError<{ error: string }>) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de créer le produit.",
                variant: "destructive",
            });
        },
    });

    // Update product mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
            productsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
            toast({
                title: "Produit modifié",
                description: "Le produit a été mis à jour avec succès.",
            });
            setIsDialogOpen(false);
            resetForm();
        },
        onError: (error: AxiosError<{ error: string }>) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de modifier le produit.",
                variant: "destructive",
            });
        },
    });

    // Cost adjustment mutation
    const adjustCostMutation = useMutation({
        mutationFn: ({ id, cost, password }: { id: string, cost: number, password: string }) =>
            productsApi.adjustCost(id, cost, password),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
            toast({ title: "Coût ajusté", description: "Le prix d'achat a été mis à jour avec succès." });
            setIsPasswordDialogOpen(false);
            setIsDialogOpen(false); // Close the main edit form too
            setAdjustmentPassword("");
        },
        onError: (error: AxiosError<{ error: string }>) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Mot de passe incorrect ou erreur serveur.",
                variant: "destructive",
            });
        },
    });

    // Delete product mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => showTrash ? productsApi.forceDelete(id) : productsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setSelectedProducts([]);
            toast({
                title: showTrash ? "Produit supprimé définitivement" : "Produit déplacé vers la corbeille",
                description: "L'opération a été effectuée avec succès.",
            });
        },
        onError: (error: AxiosError<{ error: string }>) => {
            const errorMessage = error.response?.data?.error || "";

            // Check for the specific backend error about existing orders
            if (errorMessage.includes("exists in orders") || error.response?.status === 400) {
                toast({
                    title: "Impossible de supprimer",
                    description: showTrash ? "Impossible de supprimer définitivement car il figure dans des commandes." : "Ce produit est lié à des commandes existantes.",
                    variant: "destructive",
                    duration: 5000,
                });
            } else {
                toast({
                    title: "Erreur",
                    description: errorMessage || "Impossible de réaliser l'opération.",
                    variant: "destructive",
                });
            }
        },
    });

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const deleteFn = showTrash ? productsApi.forceDelete : productsApi.delete;
            const results = await Promise.allSettled(ids.map(id => deleteFn(id)));
            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                throw new Error(`${failed.length} produit(s) n'ont pas pu être traités.`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setSelectedProducts([]);
            toast({
                title: "Opération réussie",
                description: showTrash ? "Les produits ont été supprimés définitivement." : "Les produits ont été mis à la corbeille.",
            });
        },
        onError: (error: Error) => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] }); // Refresh anyway because some might have succeeded
            setSelectedProducts([]);
            toast({
                title: "Opération partielle ou échouée",
                description: error.message || "Une erreur est survenue lors de l'opération.",
                variant: "destructive",
                duration: 5000,
            });
        },
    });

    // Restore mutation
    const restoreMutation = useMutation({
        mutationFn: (id: string) => productsApi.restore(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({
                title: "Produit restauré",
                description: "Le produit a été restauré avec succès dans le catalogue.",
            });
        },
        onError: () => {
            toast({
                title: "Erreur",
                description: "Impossible de restaurer le produit.",
                variant: "destructive",
            });
        }
    });

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            price: "",
            originalPrice: "",
            categoryId: "",
            images: [],
            inStock: true,
            quantity: "0",
            badge: "",
            specs: [],
            supplierId: "",
            unitCostPrice: "",
            isFeatured: false,
            published: true,
        });
        setEditingProduct(null);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            originalPrice: product.originalPrice?.toString() || "",
            categoryId: product.categoryId,
            images: product.images || (product.image ? [product.image] : []),
            inStock: product.inStock,
            quantity: product.quantity?.toString() || "0",
            badge: product.badge || "",
            specs: product.specs?.map(s => {
                const match = s.match(/^\{(.*?)\}:\s*(.*)$/);
                if (match) return { key: match[1], value: match[2] };
                return { key: "Général", value: s };
            }) || [],
            supplierId: (product as any).procurements?.[0]?.supplierId || "",
            unitCostPrice: (product as any).weightedAverageCost?.toString() || "",
            isFeatured: (product as any).isFeatured || false,
            published: product.published ?? true,
        });
        setIsDialogOpen(true);
    };

    const validateSpecs = (_specs: any, _categoryId: string): { valid: boolean; error?: string } => {
        // ✅ Specs are now completely optional - no validation required
        // Specs without {key} will automatically go to "Hardware Global"
        // Specs with {key}: value will be categorized for filtering (GPU, CPU, RAM, etc.)
        return { valid: true };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate Specifications
        const specsValidation = validateSpecs(formData.specs, formData.categoryId);
        if (!specsValidation.valid) {
            toast({
                title: "Erreur de Spécifications",
                description: specsValidation.error,
                variant: "destructive",
                duration: 5000
            });
            return;
        }

        const productData = {
            name: formData.name,
            description: formData.description,
            price: parseInt(formData.price),
            originalPrice: formData.originalPrice ? parseInt(formData.originalPrice) : undefined,
            categoryId: formData.categoryId,
            images: formData.images,
            inStock: formData.inStock,
            quantity: parseInt(formData.quantity) || 0,
            badge: formData.badge || undefined,
            specs: formData.specs.map(s => s.key === "Général" ? s.value : `{${s.key}}: ${s.value}`),
            supplierId: formData.supplierId,
            unitCostPrice: formData.unitCostPrice,
            isFeatured: formData.isFeatured,
            published: formData.published,
            image: formData.images[0] || "",
        };

        if (editingProduct) {
            // 1. Check for Stock Increase (Requires Password & Super Admin)
            const originalQty = editingProduct.quantity || 0;
            const newQty = productData.quantity;

            if (newQty > originalQty) {
                if (user.role !== 'super_admin' && !userPermissions.includes(PERMISSIONS.PRODUCTS_STOCK_MANAGE)) {
                    toast({
                        title: "Accès refusé",
                        description: "Vous n'avez pas la permission d'ajouter du stock manuellement.",
                        variant: "destructive"
                    });
                    return;
                }
                setPasswordActionType('STOCK');
                setPendingProductData(productData);
                setIsPasswordDialogOpen(true);
                return;
            }

            // 2. Check for Cost Change (Requires Password)
            const originalCost = editingProduct.weightedAverageCost || 0;
            const newCost = parseInt(formData.unitCostPrice) || 0;

            if (newCost !== originalCost && originalCost > 0) {
                setPasswordActionType('COST');
                setIsPasswordDialogOpen(true);
                return;
            }

            // Standard update
            updateMutation.mutate({
                id: editingProduct.id,
                data: productData,
            });
        } else {
            createMutation.mutate(productData);
        }
    };

    // Handle stock status change with validation
    const handleStockStatusChange = (checked: boolean) => {
        const currentQuantity = parseInt(formData.quantity) || 0;

        // BLOCK: Prevent enabling "En stock" when quantity is 0
        if (checked && currentQuantity === 0) {
            toast({
                title: "Stock insuffisant",
                description: "Impossible de marquer le produit en stock. La quantité est à 0.",
                variant: "destructive",
            });
            // Do NOT update state - this prevents the switch from changing
            return false;
        }

        // Also prevent disabling when already disabled and quantity is 0
        if (!checked && currentQuantity === 0) {
            // Allow turning off, but it should already be off
            setFormData({ ...formData, inStock: false });
            return;
        }

        // Normal case: update the state
        setFormData({ ...formData, inStock: checked });
    };

    // Handle quantity change and auto-update stock status
    const handleQuantityChange = (value: string) => {
        const quantity = parseInt(value) || 0;

        // If quantity becomes 0, automatically set inStock to false
        if (quantity === 0) {
            setFormData({ ...formData, quantity: value, inStock: false });
        } else {
            setFormData({ ...formData, quantity: value });
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${name}" ?`)) {
            deleteMutation.mutate(id);
        }
    };

    const handleStockToggle = (product: Product) => {
        // CRITICAL: Prevent enabling stock when quantity is 0
        if (!product.inStock && product.quantity === 0) {
            toast({
                title: "Stock insuffisant",
                description: `Impossible de marquer "${product.name}" en stock. La quantité est à 0.`,
                variant: "destructive",
            });
            return;
        }

        updateMutation.mutate({
            id: product.id,
            data: { inStock: !product.inStock }
        });
    };

    const filteredProducts = products.filter((product) => {
        const combinedSearch = (globalSearch + " " + searchQuery).trim().toLowerCase();
        const matchesSearch = (
            product.name.toLowerCase().includes(combinedSearch) ||
            product.category?.name.toLowerCase().includes(combinedSearch)
        );
        const matchesCategory = categoryFilter === "all" || product.categoryId === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter]);

    // Apply pagination
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedProducts(paginatedProducts.map(p => p.id));
        } else {
            setSelectedProducts([]);
        }
    };

    const handleSelectProduct = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedProducts(prev => [...prev, id]);
        } else {
            setSelectedProducts(prev => prev.filter(pId => pId !== id));
        }
    };

    const handleBulkDelete = () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer les ${selectedProducts.length} produit(s) sélectionné(s) ?`)) {
            bulkDeleteMutation.mutate(selectedProducts);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-muted-foreground">Chargement...</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Produits {showTrash && <span className="text-muted-foreground text-sm font-normal">/ Corbeille</span>}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {selectedProducts.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> {showTrash ? "Supprimer déf." : "À la corbeille"} ({selectedProducts.length})
                        </Button>
                    )}
                    <Button
                        variant={showTrash ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                            setShowTrash(!showTrash);
                            setSelectedProducts([]);
                            setCurrentPage(1);
                        }}
                    >
                        {showTrash ? (
                            <><ArrowLeft className="mr-2 h-4 w-4" /> Retour aux Produits</>
                        ) : (
                            <><Trash2 className="mr-2 h-4 w-4" /> Corbeille</>
                        )}
                    </Button>
                    {!showTrash && (
                        <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Ajouter
                        </Button>
                    )}
                </div>
            </div>

            {/* Search and Filter Section */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-2 items-start sm:items-center bg-card p-4 rounded-xl border border-border">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Rechercher produit, SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-background h-9"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-background h-9">
                        <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        {categories.filter(cat => cat.active).map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Products Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[40px] px-4">
                                    <Checkbox
                                        checked={paginatedProducts.length > 0 && selectedProducts.length === paginatedProducts.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Nom du Produit</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Prix Vente</TableHead>
                                {userPermissions.includes(PERMISSIONS.PRODUCTS_COST_VIEW) && <TableHead>Coût (WAC)</TableHead>}
                                <TableHead>Stock</TableHead>
                                <TableHead>Publié</TableHead>
                                <TableHead>Valeur</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProducts.map((product) => (
                                <TableRow key={product.id} className="hover:bg-muted/5 transition-colors">
                                    <TableCell className="px-4">
                                        <Checkbox
                                            checked={selectedProducts.includes(product.id)}
                                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-secondary border border-border">
                                            <img
                                                src={getImageUrl(product.image)}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span>{product.name}</span>
                                                {(product as any).isFeatured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                                            </div>
                                            {product.badge && (
                                                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded-md w-fit mt-1">
                                                    {product.badge}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                                            {product.category?.name || 'Sans catégorie'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-bold text-primary">
                                        {product.price.toLocaleString()} {currency}
                                    </TableCell>
                                    {userPermissions.includes(PERMISSIONS.PRODUCTS_COST_VIEW) && (
                                        <TableCell className="text-xs text-muted-foreground">
                                            {product.weightedAverageCost && product.weightedAverageCost > 0 ? (
                                                <span className="font-mono">{product.weightedAverageCost.toLocaleString()} {currency}</span>
                                            ) : (
                                                <span className="text-destructive font-bold flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    0 {currency}
                                                </span>
                                            )}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={product.inStock}
                                                onCheckedChange={() => handleStockToggle(product)}
                                                disabled={product.quantity === 0}
                                                className="scale-75 data-[state=checked]:bg-green-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${product.quantity > 0 ? 'text-green-500' : 'text-destructive'}`}>
                                                    {product.quantity > 0 ? 'EN STOCK' : 'ÉPUISÉ'}
                                                </span>
                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                    {product.quantity} unités
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={product.published ?? true}
                                            onCheckedChange={(checked) => {
                                                updateMutation.mutate({
                                                    id: product.id,
                                                    data: { published: checked }
                                                });
                                            }}
                                            className="scale-75 data-[state=checked]:bg-blue-500"
                                        />
                                    </TableCell>
                                    <TableCell className="font-bold text-sm">
                                        {(product.stockValue || 0).toLocaleString()} {currency}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {showTrash ? (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-green-100 hover:text-green-600"
                                                        onClick={() => restoreMutation.mutate(product.id)}
                                                        title="Restaurer"
                                                    >
                                                        <ArchiveRestore className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-destructive/10 text-destructive/80 hover:text-destructive"
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        title="Supprimer définitivement"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-muted"
                                                        onClick={() => handleEdit(product)}
                                                        title="Modifier"
                                                    >
                                                        <Pencil className="w-4 h-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:bg-destructive/10 text-destructive/80 hover:text-destructive"
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        title="Mettre à la corbeille"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                }}
                totalItems={filteredProducts.length}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProduct ? "Modifier le produit" : "Ajouter un produit"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProduct
                                ? "Modifiez les informations du produit ci-dessous."
                                : "Remplissez les informations pour ajouter un nouveau produit."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Nom du produit</Label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="PC Gamer RTX 4070"
                                />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Description du produit..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Prix ({currency})</Label>
                                <Input
                                    type="number"
                                    required
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="15999"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Prix original (optionnel)</Label>
                                <Input
                                    type="number"
                                    value={formData.originalPrice}
                                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                                    placeholder="17999"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Catégorie</Label>
                                <Select
                                    value={formData.categoryId}
                                    onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une catégorie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Stock Initial/Quantité</Label>
                                <Input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => handleQuantityChange(e.target.value)}
                                    placeholder="50"
                                />
                                {parseInt(formData.quantity) === 0 && (
                                    <p className="text-xs text-warning">⚠️ Quantité à 0 - Le produit sera automatiquement en rupture</p>
                                )}
                            </div>

                            {/* Supplier & Cost Price Section - Restricted to Admins */}
                            {(user.role === 'super_admin' || userPermissions.includes(PERMISSIONS.PRODUCTS_COST_VIEW)) && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Prix d'Achat Unitaire ({currency})</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                required
                                                value={formData.unitCostPrice}
                                                onChange={(e) => setFormData({ ...formData, unitCostPrice: e.target.value })}
                                                placeholder="Ex: 12000"
                                                className={editingProduct && (editingProduct.weightedAverageCost || 0) > 0 ? "border-orange-500/50 bg-orange-50/5 pl-8" : "border-primary/50 bg-primary/5"}
                                            />
                                            {editingProduct && (editingProduct.weightedAverageCost || 0) > 0 && (
                                                <div className="absolute left-2.5 top-2.5 text-orange-500">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        {editingProduct && (editingProduct.weightedAverageCost || 0) > 0 && (
                                            <p className="text-[10px] text-orange-600 font-medium italic">
                                                Note: Une modification du coût nécessite votre mot de passe admin.
                                            </p>
                                        )}
                                    </div>

                                    {/* Supplier Section */}
                                    <div className="space-y-2">
                                        <Label>Fournisseur (Obligatoire)</Label>
                                        <Select
                                            required
                                            value={formData.supplierId}
                                            onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                                        >
                                            <SelectTrigger className="border-primary/50 bg-primary/5">
                                                <SelectValue placeholder="Choisir un fournisseur" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((s: any) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Info note for NEW product only */}
                                    {!editingProduct && (
                                        <div className="col-span-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs italic text-primary font-medium">
                                            Note: L'ajout d'un nouveau produit générera automatiquement un <strong>Ordre d'Approvisionnement</strong> de <strong>{parseInt(formData.quantity) * (parseInt(formData.unitCostPrice) || 0)} {currency}</strong>.
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.isFeatured}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                                />
                                <Label>Produit en vedette (Accueil)</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.published}
                                    onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                                />
                                <Label>Publié sur le site</Label>
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label>Images du produit (max 6)</Label>
                                <MultiImageUpload
                                    value={formData.images}
                                    onChange={(urls) => setFormData({ ...formData, images: urls })}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    maxImages={6}
                                />
                            </div>

                            <div className="space-y-4 col-span-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">Spécifications & Caractéristiques</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[11px]"
                                        onClick={() => setFormData({
                                            ...formData,
                                            specs: [...formData.specs, { key: "cpu", value: "" }]
                                        })}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Ajouter une spécification
                                    </Button>
                                </div>

                                <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                                    {formData.specs.length === 0 ? (
                                        <p className="text-center text-[11px] text-muted-foreground py-2 italic">
                                            Aucune spécification ajoutée. Cliquez sur le bouton pour en ajouter.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2">
                                            {formData.specs.map((spec, idx) => (
                                                <div key={idx} className="flex gap-2 items-start">
                                                    <div className="w-32 flex-shrink-0">
                                                        <Select
                                                            value={spec.key}
                                                            onValueChange={(val) => {
                                                                const newSpecs = [...formData.specs];
                                                                newSpecs[idx].key = val;
                                                                setFormData({ ...formData, specs: newSpecs });
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Général">
                                                                    <div className="flex items-center gap-2">
                                                                        <Layout className="w-3.5 h-3.5 text-muted-foreground" />
                                                                        <span>Général (Texte)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="cpu">
                                                                    <div className="flex items-center gap-2">
                                                                        <Cpu className="w-3.5 h-3.5 text-primary" />
                                                                        <span>Processeur (CPU)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="gpu">
                                                                    <div className="flex items-center gap-2">
                                                                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                                                                        <span>Carte Graphique (GPU)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="ram">
                                                                    <div className="flex items-center gap-2">
                                                                        <CircuitBoard className="w-3.5 h-3.5 text-blue-500" />
                                                                        <span>Mémoire RAM</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="stockage">
                                                                    <div className="flex items-center gap-2">
                                                                        <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                                                                        <span>Stockage</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="marque">
                                                                    <div className="flex items-center gap-2">
                                                                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                                                                        <span>Marque</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="marque_pc">
                                                                    <div className="flex items-center gap-2">
                                                                        <Box className="w-3.5 h-3.5 text-muted-foreground" />
                                                                        <span>Modèle PC</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="ecran">
                                                                    <div className="flex items-center gap-2">
                                                                        <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                                                                        <span>Écran</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="os">
                                                                    <div className="flex items-center gap-2">
                                                                        <Terminal className="w-3.5 h-3.5 text-violet-500" />
                                                                        <span>Système (OS)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="carte_mere">
                                                                    <div className="flex items-center gap-2">
                                                                        <CircuitBoard className="w-3.5 h-3.5 text-red-500" />
                                                                        <span>Carte Mère</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="alimentation">
                                                                    <div className="flex items-center gap-2">
                                                                        <Power className="w-3.5 h-3.5 text-amber-600" />
                                                                        <span>Alimentation (PSU)</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="boitier">
                                                                    <div className="flex items-center gap-2">
                                                                        <Box className="w-3.5 h-3.5 text-zinc-400" />
                                                                        <span>Boîtier</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="refroidissement">
                                                                    <div className="flex items-center gap-2">
                                                                        <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
                                                                        <span>Refroidissement</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="resolution">
                                                                    <div className="flex items-center gap-2">
                                                                        <Maximize className="w-3.5 h-3.5 text-indigo-400" />
                                                                        <span>Résolution Écran</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="frequence">
                                                                    <div className="flex items-center gap-2">
                                                                        <RefreshCw className="w-3.5 h-3.5 text-orange-500" />
                                                                        <span>Fréquence</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="connectivite">
                                                                    <div className="flex items-center gap-2">
                                                                        <Wifi className="w-3.5 h-3.5 text-sky-500" />
                                                                        <span>Connectivité</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="batterie">
                                                                    <div className="flex items-center gap-2">
                                                                        <Battery className="w-3.5 h-3.5 text-green-500" />
                                                                        <span>Batterie</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="poids">
                                                                    <div className="flex items-center gap-2">
                                                                        <Scale className="w-3.5 h-3.5 text-stone-400" />
                                                                        <span>Poids</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="chipset">
                                                                    <div className="flex items-center gap-2">
                                                                        <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                                                                        <span>Chipset</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="format">
                                                                    <div className="flex items-center gap-2">
                                                                        <Layers className="w-3.5 h-3.5 text-pink-500" />
                                                                        <span>Format</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="switch">
                                                                    <div className="flex items-center gap-2">
                                                                        <Keyboard className="w-3.5 h-3.5 text-rose-500" />
                                                                        <span>Switch Clavier</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="dpi">
                                                                    <div className="flex items-center gap-2">
                                                                        <MousePointer2 className="w-3.5 h-3.5 text-blue-400" />
                                                                        <span>DPI Souris</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="capteur">
                                                                    <div className="flex items-center gap-2">
                                                                        <Target className="w-3.5 h-3.5 text-red-400" />
                                                                        <span>Capteur Optique</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="eclairage">
                                                                    <div className="flex items-center gap-2">
                                                                        <Palette className="w-3.5 h-3.5 text-fuchsia-500" />
                                                                        <span>RGB / Éclairage</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="polling_rate">
                                                                    <div className="flex items-center gap-2">
                                                                        <Activity className="w-3.5 h-3.5 text-lime-500" />
                                                                        <span>Polling Rate</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="garantie">
                                                                    <div className="flex items-center gap-2">
                                                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                                                        <span>Garantie</span>
                                                                    </div>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="flex-1">
                                                        <Input
                                                            className="h-8 text-xs"
                                                            placeholder={spec.key === "Général" ? "Ex: Garantie 2 ans..." : "Valeur..."}
                                                            value={spec.value}
                                                            onChange={(e) => {
                                                                const newSpecs = [...formData.specs];
                                                                newSpecs[idx].value = e.target.value;
                                                                setFormData({ ...formData, specs: newSpecs });
                                                            }}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                specs: formData.specs.filter((_, i) => i !== idx)
                                                            });
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 px-1 font-medium italic">
                                    <Sparkles className="w-3 h-3 text-primary" />
                                    <span>Les clés techniques (CPU, GPU, RAM...) sont utilisées pour les filtres avancés du catalogue.</span>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 col-span-2">
                                {(() => {
                                    const isQuantityZero = !formData.quantity || formData.quantity === '' || formData.quantity === '0' || parseInt(formData.quantity) === 0;
                                    return (
                                        <>
                                            <div className={isQuantityZero ? "pointer-events-none opacity-50 cursor-not-allowed" : ""}>
                                                <Switch
                                                    checked={formData.inStock}
                                                    onCheckedChange={handleStockStatusChange}
                                                    disabled={isQuantityZero}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Label className={isQuantityZero ? "text-muted-foreground" : ""}>
                                                    En stock
                                                </Label>
                                                {isQuantityZero && (
                                                    <p className="text-xs text-destructive mt-1 font-medium">
                                                        🚫 Bloqué - Quantité à 0
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Password Verification Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="p-1.5 bg-orange-100 rounded-full">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                            </span>
                            Confirmation Sécurisée
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {passwordActionType === 'COST'
                                ? "Vous êtes sur le point de modifier le Prix d'Achat historique. Cette action impactera votre calcul de profit."
                                : "Vous êtes sur le point d'ajouter du stock manuellement. Cette action est réservée aux administrateurs."
                            }
                            <br />Veuillez saisir votre mot de passe pour confirmer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="adjustment-password">Mot de passe Administrateur</Label>
                            <Input
                                id="adjustment-password"
                                type="password"
                                value={adjustmentPassword}
                                onChange={(e) => setAdjustmentPassword(e.target.value)}
                                placeholder="••••••••"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (passwordActionType === 'COST') {
                                            adjustCostMutation.mutate({
                                                id: editingProduct!.id,
                                                cost: parseInt(formData.unitCostPrice),
                                                password: adjustmentPassword
                                            });
                                        } else {
                                            updateMutation.mutate({
                                                id: editingProduct!.id,
                                                data: { ...pendingProductData, password: adjustmentPassword }
                                            });
                                            setIsPasswordDialogOpen(false);
                                            setAdjustmentPassword("");
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-700"
                            disabled={adjustCostMutation.isPending || updateMutation.isPending}
                            onClick={() => {
                                if (passwordActionType === 'COST') {
                                    adjustCostMutation.mutate({
                                        id: editingProduct!.id,
                                        cost: parseInt(formData.unitCostPrice),
                                        password: adjustmentPassword
                                    });
                                } else {
                                    updateMutation.mutate({
                                        id: editingProduct!.id,
                                        data: { ...pendingProductData, password: adjustmentPassword }
                                    });
                                    setIsPasswordDialogOpen(false);
                                    setAdjustmentPassword("");
                                }
                            }}
                        >
                            {adjustCostMutation.isPending || updateMutation.isPending ? "Vérification..." : "Confirmer"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminProducts;
