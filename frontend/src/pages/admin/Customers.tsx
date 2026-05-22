import { useState } from "react";
import { Search, Mail, Phone, FileDown, History, Loader2, Plus, ShoppingCart, Trash2, Heart, Star, UserPlus } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi, Customer } from "@/api/customers";
import { productsApi } from "@/api/products";
import { ordersApi } from "@/api/orders";
import { citiesApi } from "@/api/cities";
import { useSettings } from "@/context/SettingsContext";
import { exportCustomersToExcel, exportCustomersToPDF } from "@/utils/exportUtils";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { Pagination } from "@/components/admin/Pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/constants/permissions";
import { Checkbox } from "@/components/ui/checkbox";

const Customers = () => {
    const { currency } = useSettings();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showOrderHistory, setShowOrderHistory] = useState(false);
    const [showCreateOrder, setShowCreateOrder] = useState(false);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number; price: number }>>([]);
    const [productSearch, setProductSearch] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [typeFilter, setTypeFilter] = useState("all");

    // Get current user permissions
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { role: "viewer", permissions: [] };
    const userPermissions = user.permissions || [];
    const isSuperAdmin = user.role === 'super_admin';
    const canCreate = isSuperAdmin || userPermissions.includes(PERMISSIONS.CUSTOMERS_CREATE) || userPermissions.includes(PERMISSIONS.CUSTOMERS_MANAGE);
    const canEdit = isSuperAdmin || userPermissions.includes(PERMISSIONS.CUSTOMERS_EDIT) || userPermissions.includes(PERMISSIONS.CUSTOMERS_MANAGE);
    const canDelete = isSuperAdmin || userPermissions.includes(PERMISSIONS.CUSTOMERS_DELETE) || userPermissions.includes(PERMISSIONS.CUSTOMERS_MANAGE);

    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

    const [newCustomer, setNewCustomer] = useState({
        name: "",
        phone: "",
        email: "",
        city: "",
        address: ""
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['admin-customers'],
        queryFn: () => customersApi.getAll(),
    });

    const { data: customerOrders = [], isLoading: isLoadingOrders } = useQuery({
        queryKey: ['customer-orders', selectedCustomer?.id],
        queryFn: () => customersApi.getCustomerOrders(selectedCustomer!.id),
        enabled: !!selectedCustomer,
    });

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => productsApi.getAll(),
    });

    const { data: cities = [] } = useQuery({
        queryKey: ['cities'],
        queryFn: () => citiesApi.getAll(),
    });

    const filteredCustomers = customers.filter((customer) => {
        const matchesSearch =
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.includes(searchTerm);

        const matchesType =
            typeFilter === "all" ||
            (typeFilter === "loyal" && customer.isLoyal) ||
            (typeFilter === "vip" && customer.isFavorite) ||
            (typeFilter === "normal" && !customer.isLoyal && !customer.isFavorite);

        return matchesSearch && matchesType;
    });

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter]);

    // Safety fix for frozen page after closing dialogs (Radix UI overlay bug)
    useEffect(() => {
        if (!showOrderHistory && !showCreateOrder && !showAddCustomer) {
            document.body.style.pointerEvents = 'auto';
            document.body.style.overflow = 'auto';
        }
    }, [showOrderHistory, showCreateOrder, showAddCustomer]);

    // Apply pagination
    const totalPages = Math.ceil(filteredCustomers.length / pageSize);
    const paginatedCustomers = filteredCustomers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleExportExcel = () => {
        try {
            exportCustomersToExcel(filteredCustomers, currency);
            toast({
                title: "Export réussi",
                description: "Les clients ont été exportés en Excel.",
            });
        } catch (error) {
            toast({
                title: "Erreur d'export",
                description: "Impossible d'exporter les clients.",
                variant: "destructive",
            });
        }
    };

    const handleExportPDF = () => {
        try {
            exportCustomersToPDF(filteredCustomers, currency);
            toast({
                title: "Export réussi",
                description: "Les clients ont été exportés en PDF.",
            });
        } catch (error) {
            toast({
                title: "Erreur d'export",
                description: "Impossible d'exporter les clients.",
                variant: "destructive",
            });
        }
    };

    const handleViewOrderHistory = (customer: Customer) => {
        setSelectedCustomer(customer);
        setTimeout(() => setShowOrderHistory(true), 100);
    };

    const handleCreateOrder = (customer: Customer) => {
        setSelectedCustomer(customer);
        setOrderItems([]);
        setProductSearch("");
        setShowProductDropdown(false);
        setTimeout(() => setShowCreateOrder(true), 100);
    };

    const handleAddProduct = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        setOrderItems([...orderItems, {
            productId: product.id,
            quantity: 1,
            price: product.price
        }]);
        setProductSearch("");
        setShowProductDropdown(false);
    };

    const handleRemoveProduct = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const handleUpdateQuantity = (index: number, quantity: number) => {
        const newItems = [...orderItems];
        newItems[index].quantity = Math.max(1, quantity);
        setOrderItems(newItems);
    };

    const handleUpdatePrice = (index: number, price: number) => {
        const newItems = [...orderItems];
        newItems[index].price = Math.max(0, price);
        setOrderItems(newItems);
    };

    const createOrderMutation = useMutation({
        mutationFn: (orderData: any) => ordersApi.create(orderData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({
                title: "Commande créée",
                description: "La commande a été créée avec succès.",
            });
            setShowCreateOrder(false);
            setOrderItems([]);
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.error || error?.message || "Impossible de créer la commande.";
            toast({
                title: "Erreur",
                description: errorMessage,
                variant: "destructive",
            });
        }
    });

    const handleSubmitOrder = () => {
        if (!selectedCustomer || orderItems.length === 0) return;

        const orderData = {
            customerName: selectedCustomer.name,
            phone: selectedCustomer.phone,
            email: selectedCustomer.email,
            city: selectedCustomer.city,
            address: selectedCustomer.address,
            items: orderItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
            })),
            bypassStockCheck: true // Admin can create orders regardless of stock
        };

        createOrderMutation.mutate(orderData);
    };

    const addCustomerMutation = useMutation({
        mutationFn: (data: any) => customersApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
            toast({ title: "Succès", description: "Client ajouté manuellement" });
            setShowAddCustomer(false);
            setNewCustomer({ name: "", phone: "", email: "", city: "", address: "" });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error?.response?.data?.error || "Impossible d'ajouter le client",
                variant: "destructive"
            });
        }
    });

    const updateCustomerMutation = useMutation({
        mutationFn: ({ dbId, data }: { dbId: string, data: any }) => customersApi.update(dbId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
            toast({ title: "Mise à jour réussie" });
        }
    });

    const deleteCustomerMutation = useMutation({
        mutationFn: (dbId: string) => customersApi.delete(dbId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
            toast({ title: "Client supprimé", description: "Le client a été supprimé avec succès." });
        },
        onError: () => {
            toast({ title: "Erreur", description: "Impossible de supprimer ce client.", variant: "destructive" });
        }
    });

    const handleDeleteCustomer = (customer: Customer) => {
        if (window.confirm(`Supprimer définitivement "${customer.name}" ? Cette action est irréversible.`)) {
            deleteCustomerMutation.mutate(customer.dbId);
        }
    };

    const bulkDeleteCustomersMutation = useMutation({
        mutationFn: (dbIds: string[]) => customersApi.bulkDelete(dbIds),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
            setSelectedCustomerIds([]);
            toast({ title: "Clients supprimés", description: `${data.deleted} client(s) supprimé(s).` });
        },
        onError: () => {
            toast({ title: "Erreur", description: "Impossible de supprimer les clients.", variant: "destructive" });
        }
    });

    const handleBulkDeleteCustomers = () => {
        if (selectedCustomerIds.length === 0) return;
        if (window.confirm(`Supprimer définitivement ${selectedCustomerIds.length} client(s) ? Cette action est irréversible.`)) {
            bulkDeleteCustomersMutation.mutate(selectedCustomerIds);
        }
    };

    const toggleFavorite = (customer: Customer) => {
        updateCustomerMutation.mutate({
            dbId: customer.dbId,
            data: { isFavorite: !customer.isFavorite }
        });
    };

    const toggleLoyal = (customer: Customer) => {
        updateCustomerMutation.mutate({
            dbId: customer.dbId,
            data: { isLoyal: !customer.isLoyal }
        });
    };


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                <div className="flex gap-2">
                    {selectedCustomerIds.length > 0 && canDelete && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDeleteCustomers}
                            disabled={bulkDeleteCustomersMutation.isPending}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer ({selectedCustomerIds.length})
                        </Button>
                    )}
                    {canCreate && (
                        <Button onClick={() => setShowAddCustomer(true)} className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            <span className="hidden sm:inline">Ajouter un Client</span>
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <FileDown className="w-4 h-4 mr-2" />
                                Exporter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleExportExcel}>
                                <FileDown className="w-4 h-4 mr-2" />
                                Exporter en Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportPDF}>
                                <FileDown className="w-4 h-4 mr-2" />
                                Exporter en PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="max-w-sm relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par nom, email ou téléphone..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder="Type de client" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les clients</SelectItem>
                            <SelectItem value="loyal">Clients FIDÈLE</SelectItem>
                            <SelectItem value="vip">Clients VIP</SelectItem>
                            <SelectItem value="normal">Clients Normaux</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {canDelete && (
                                    <TableHead className="w-10">
                                        <Checkbox
                                            checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedCustomerIds.includes(c.dbId))}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedCustomerIds(prev => [...new Set([...prev, ...paginatedCustomers.map(c => c.dbId)])]);
                                                } else {
                                                    setSelectedCustomerIds(prev => prev.filter(id => !paginatedCustomers.map(c => c.dbId).includes(id)));
                                                }
                                            }}
                                        />
                                    </TableHead>
                                )}
                                <TableHead>Client</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Ville</TableHead>
                                <TableHead>Commandes</TableHead>
                                <TableHead>Total Dépensé</TableHead>
                                <TableHead>Dernière Commande</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Chargement des clients...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedCustomers.length > 0 ? (
                                paginatedCustomers.map((customer) => (
                                    <TableRow key={customer.id} className={`hover:bg-muted/50 ${selectedCustomerIds.includes(customer.dbId) ? 'bg-muted/20' : ''}`}>
                                        {canDelete && (
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedCustomerIds.includes(customer.dbId)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedCustomerIds(prev =>
                                                            checked ? [...prev, customer.dbId] : prev.filter(id => id !== customer.dbId)
                                                        );
                                                    }}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">{customer.name}</p>
                                                        {customer.isFavorite && <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />}
                                                        {customer.isLoyal && <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-mono">{customer.phone}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <Mail className="w-3 h-3" /> {customer.email}
                                                </span>
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <Phone className="w-3 h-3" /> {customer.phone}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{customer.city}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium">{customer.ordersCount}</span>
                                                {customer.isLoyal && <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded font-bold border border-yellow-500/20 w-fit">FIDÈLE</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-primary">{customer.totalSpent.toLocaleString()} {currency}</span>
                                                {customer.isFavorite && <span className="text-[10px] text-red-500 font-bold  tracking-wider">Client VIP</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(customer.lastOrderDate).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 ${customer.isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`}
                                                    onClick={() => toggleFavorite(customer)}
                                                    disabled={!canEdit}
                                                >
                                                    <Heart className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={`h-8 w-8 ${customer.isLoyal ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`}
                                                    onClick={() => toggleLoyal(customer)}
                                                    disabled={!canEdit}
                                                >
                                                    <Star className="h-4 w-4" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">Options</Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem onSelect={() => handleCreateOrder(customer)}>
                                                            <Plus className="w-4 h-4 mr-2" /> Nouvelle Commande
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleViewOrderHistory(customer)}>
                                                            <History className="w-4 h-4 mr-2" /> Historique
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => window.open(`https://wa.me/${customer.phone.replace(/\s+/g, '')}`, "_blank")}>
                                                            <Phone className="w-4 h-4 mr-2" /> WhatsApp
                                                        </DropdownMenuItem>
                                                        {canDelete && (
                                                            <DropdownMenuItem
                                                                onSelect={() => handleDeleteCustomer(customer)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        Aucun client trouvé.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination outside of the centered container if needed, but below the card */}
            <div className="flex justify-center mt-6">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                    }}
                    totalItems={filteredCustomers.length}
                />
            </div>

            {/* Order History Dialog */}
            <Dialog open={showOrderHistory} onOpenChange={setShowOrderHistory}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Historique des Commandes</DialogTitle>
                        <DialogDescription>
                            {selectedCustomer && (
                                <>
                                    Client: <span className="font-semibold">{selectedCustomer.name}</span> |
                                    Total: <span className="font-semibold">{selectedCustomer.ordersCount} commande(s)</span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        {isLoadingOrders ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                <span>Chargement de l'historique...</span>
                            </div>
                        ) : customerOrders.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>N° Commande</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Produits</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customerOrders.map((order: any) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                                            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {order.items?.map((item: any, idx: number) => (
                                                        <div key={idx} className="text-muted-foreground">
                                                            {item.product?.name || 'Produit'} x{item.quantity}
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold">{order.total.toLocaleString()} {currency}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                                                        order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                                            order.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                                                                'bg-yellow-500/10 text-yellow-500'}`}>
                                                    {order.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Aucune commande trouvée pour ce client.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Order Dialog */}
            <Dialog open={showCreateOrder} onOpenChange={setShowCreateOrder}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Créer une Commande</DialogTitle>
                        <DialogDescription>
                            {selectedCustomer && (
                                <>
                                    Client: <span className="font-semibold">{selectedCustomer.name}</span> |
                                    Téléphone: <span className="font-semibold">{selectedCustomer.phone}</span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        {/* Product Selection */}
                        <div className="space-y-2">
                            <Label>Ajouter un produit</Label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Input
                                        placeholder="Rechercher un produit..."
                                        value={productSearch}
                                        onChange={(e) => {
                                            setProductSearch(e.target.value);
                                            setShowProductDropdown(true);
                                        }}
                                        onFocus={() => setShowProductDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                                    />
                                    {showProductDropdown && productSearch && (
                                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[300px] overflow-y-auto">
                                            {products
                                                .filter(p =>
                                                    p.name.toLowerCase().includes(productSearch.toLowerCase())
                                                )
                                                .map((product) => (
                                                    <div
                                                        key={product.id}
                                                        className="px-3 py-2 hover:bg-accent cursor-pointer"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            handleAddProduct(product.id);
                                                        }}
                                                    >
                                                        <div className="font-medium text-sm">{product.name}</div>
                                                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                                            <span>Prix: {product.price} {currency}</span>
                                                            <span>•</span>
                                                            <span>Stock: {product.quantity || 0}</span>
                                                            {product.weightedAverageCost !== undefined && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-green-600 font-medium">Coût: {product.weightedAverageCost.toFixed(2)} {currency}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                            {products.filter(p =>
                                                p.name.toLowerCase().includes(productSearch.toLowerCase())
                                            ).length === 0 && (
                                                    <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                                                        Aucun produit trouvé
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </div>
                                <Button onClick={() => productSearch && handleAddProduct(products.find(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))?.id || '')} disabled={!productSearch}>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Ajouter
                                </Button>
                            </div>
                        </div>

                        {/* Order Items */}
                        {orderItems.length > 0 && (
                            <div className="space-y-2">
                                <Label>Produits de la commande</Label>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Produit</TableHead>
                                                <TableHead>Prix Unitaire</TableHead>
                                                <TableHead>Quantité</TableHead>
                                                <TableHead>Total</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orderItems.map((item, index) => {
                                                const product = products.find(p => p.id === item.productId);
                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">
                                                            {product?.name || 'Produit inconnu'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={item.price}
                                                                onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                                                                className="w-24"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                max={product?.quantity || 999}
                                                                value={item.quantity}
                                                                onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                                                className="w-20"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-semibold">
                                                            {(item.price * item.quantity).toFixed(2)} {currency}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRemoveProduct(index)}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Total */}
                                <div className="flex justify-end pt-4 border-t">
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Total de la commande</p>
                                        <p className="text-2xl font-bold">
                                            {orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} {currency}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {orderItems.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Aucun produit ajouté</p>
                                <p className="text-sm">Sélectionnez un produit ci-dessus pour commencer</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowCreateOrder(false)}>
                                Annuler
                            </Button>
                            <Button
                                onClick={handleSubmitOrder}
                                disabled={orderItems.length === 0 || createOrderMutation.isPending}
                            >
                                {createOrderMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Création...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        Créer la Commande
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Customer Dialog */}
            <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau Client</DialogTitle>
                        <DialogDescription>Ajouter un client manuellement à la base de données.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nom Complet</Label>
                            <Input
                                id="name"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input
                                id="phone"
                                placeholder="06XXXXXXXX"
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email (Optionnel)</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="city">Ville</Label>
                            <Select
                                value={newCustomer.city}
                                onValueChange={(val) => setNewCustomer({ ...newCustomer, city: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une ville" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.map(city => (
                                        <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Adresse</Label>
                            <Input
                                id="address"
                                value={newCustomer.address}
                                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Annuler</Button>
                        <Button
                            onClick={() => addCustomerMutation.mutate(newCustomer)}
                            disabled={!newCustomer.name || !newCustomer.phone || !newCustomer.city || addCustomerMutation.isPending}
                        >
                            {addCustomerMutation.isPending ? "Ajout..." : "Enregistrer"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Customers;
