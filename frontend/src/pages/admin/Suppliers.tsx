import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, Phone, Mail, MapPin, Package, DollarSign, History, ExternalLink } from "lucide-react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersApi } from "@/api/suppliers";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Suppliers = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailId, setDetailId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        city: "",
        notes: "",
    });

    // Fetch suppliers
    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers'],
        queryFn: suppliersApi.getAll,
    });

    // Fetch single supplier details
    const { data: supplierDetail, isLoading: isDetailLoading } = useQuery({
        queryKey: ['supplier', detailId],
        queryFn: () => suppliersApi.getById(detailId!),
        enabled: !!detailId
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: any) => suppliersApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: "Fournisseur ajouté" });
            setIsDialogOpen(false);
            resetForm();
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => suppliersApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: "Fournisseur mis à jour" });
            setIsDialogOpen(false);
            resetForm();
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => suppliersApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast({ title: "Fournisseur supprimé" });
        },
        onError: (err: any) => {
            toast({
                title: "Erreur",
                description: err.response?.data?.error || "Impossible de supprimer ce fournisseur",
                variant: "destructive"
            });
        }
    });

    const filteredSuppliers = suppliers.filter((s: any) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm)
    );

    const resetForm = () => {
        setFormData({ name: "", phone: "", email: "", city: "", notes: "" });
        setSelectedSupplier(null);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSupplier) {
            updateMutation.mutate({ id: selectedSupplier.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const openEditDialog = (supplier: any) => {
        setSelectedSupplier(supplier);
        setFormData({
            name: supplier.name,
            phone: supplier.phone,
            email: supplier.email || "",
            city: supplier.city || "",
            notes: supplier.notes || "",
        });
        setIsDialogOpen(true);
    };

    const openDetail = (id: string) => {
        setDetailId(id);
        setIsDetailOpen(true);
    };

    const openCreateDialog = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Supprimer ce fournisseur ?")) {
            deleteMutation.mutate(id);
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Ajouter
                </Button>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="mb-6 max-w-sm relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Ville</TableHead>
                            <TableHead>Approvisionnements</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSuppliers.map((supplier: any) => (
                            <TableRow key={supplier.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="font-bold">{supplier.name}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-xs gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <Phone className="w-3 h-3 text-muted-foreground" />
                                            {supplier.phone}
                                        </div>
                                        {supplier.email && (
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="w-3 h-3 text-muted-foreground" />
                                                {supplier.email}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <MapPin className="w-3 h-3 text-muted-foreground" />
                                        {supplier.city || "-"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-primary" />
                                        <span className="font-bold">{supplier._count?.procurements || 0}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openDetail(supplier.id)}>
                                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Détails
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(supplier)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(supplier.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedSupplier ? "Modifier le fournisseur" : "Ajouter un fournisseur"}</DialogTitle>
                        <DialogDescription>
                            Remplissez les informations du partenaire fournisseur.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="name">Nom / Raison Sociale</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Téléphone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">Ville</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="notes">Notes / Observations</Label>
                                <textarea
                                    id="notes"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
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

            {/* Detail Sheet/Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {isDetailLoading ? (
                        <div className="flex items-center justify-center p-20">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        </div>
                    ) : supplierDetail && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Package className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl">{supplierDetail.name}</DialogTitle>
                                        <DialogDescription>{supplierDetail.city || "Ville non spécifiée"}</DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
                                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                                    <p className="text-xs font-medium text-muted-foreground mb-1  tracking-wider">Investissement Total</p>
                                    <p className="text-2xl font-bold text-primary ">
                                        {supplierDetail.summary.totalSpent.toLocaleString()} <span className="text-xs not-">MAD</span>
                                    </p>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                                    <p className="text-xs font-medium text-muted-foreground mb-1  tracking-wider">Quantité Achetée</p>
                                    <p className="text-2xl font-bold ">
                                        {supplierDetail.summary.totalItems.toLocaleString()} <span className="text-xs not-">Unités</span>
                                    </p>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-xl border border-border">
                                    <p className="text-xs font-medium text-muted-foreground mb-1  tracking-wider">Produits Référencés</p>
                                    <p className="text-2xl font-bold ">
                                        {supplierDetail.summary.uniqueProducts} <span className="text-xs not-">Types</span>
                                    </p>
                                </div>
                            </div>

                            <Tabs defaultValue="history" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="history" className="flex items-center gap-2">
                                        <History className="w-4 h-4" /> Historique d'Achats
                                    </TabsTrigger>
                                    <TabsTrigger value="products" className="flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Produits Fournis
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="history" className="pt-4">
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Produit</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead className="text-center">Quantité</TableHead>
                                                    <TableHead className="text-right">P.U Achat</TableHead>
                                                    <TableHead className="text-right">Total Cost</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {supplierDetail.procurements.map((p: any) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-bold text-xs">{p.product.name}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground ">
                                                            {format(new Date(p.purchaseDate), 'dd MMM yyyy', { locale: fr })}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono">+{p.quantityPurchased}</TableCell>
                                                        <TableCell className="text-right font-mono text-xs">{p.unitCostPrice} MAD</TableCell>
                                                        <TableCell className="text-right font-bold text-xs text-primary">{p.totalCost} MAD</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                                <TabsContent value="products" className="pt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {supplierDetail.summary.products.map((p: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-card border rounded-xl">
                                                <div>
                                                    <p className="font-bold text-sm leading-tight">{p.name}</p>
                                                    <p className="text-[10px] text-muted-foreground  tracking-widest mt-1">
                                                        Total: {p.quantity} unités
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-primary ">{p.total.toLocaleString()} MAD</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Suppliers;

