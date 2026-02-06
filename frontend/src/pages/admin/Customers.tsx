import { useState } from "react";
import { Search, Mail, Phone, FileDown, History, Loader2, Plus, ShoppingCart, Trash2 } from "lucide-react";
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

const Customers = () => {
    const { currency } = useSettings();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showOrderHistory, setShowOrderHistory] = useState(false);
    const [showCreateOrder, setShowCreateOrder] = useState(false);
    const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number; price: number }>>([]);
    const [productSearch, setProductSearch] = useState("");
    const [showProductDropdown, setShowProductDropdown] = useState(false);

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

    const filteredCustomers = customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm)
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

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
        setShowOrderHistory(true);
    };

    const handleCreateOrder = (customer: Customer) => {
        setSelectedCustomer(customer);
        setOrderItems([]);
        setProductSearch("");
        setShowProductDropdown(false);
        setShowCreateOrder(true);
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
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

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
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
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Chargement des clients...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedCustomers.length > 0 ? (
                                paginatedCustomers.map((customer) => (
                                    <TableRow key={customer.id} className="hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{customer.name}</p>
                                                    <p className="text-xs text-muted-foreground">{customer.id}</p>
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
                                        <TableCell>{customer.ordersCount}</TableCell>
                                        <TableCell className="font-semibold">{customer.totalSpent.toLocaleString()} {currency}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(customer.lastOrderDate).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleCreateOrder(customer)}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Ajouter une commande
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewOrderHistory(customer)}
                                                >
                                                    <History className="w-4 h-4 mr-1" />
                                                    Historique
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(`https://wa.me/${customer.phone.replace(/\s+/g, '')}`, "_blank")}
                                                >
                                                    WhatsApp
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Aucun client trouvé.
                                    </TableCell>
                                </TableRow>
                            )}
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
                totalItems={filteredCustomers.length}
            />

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
                                                        onClick={() => handleAddProduct(product.id)}
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
        </div>
    );
};

export default Customers;