import { useState } from "react";
import {
    Search,
    Filter,
    Eye,
    MoreHorizontal,
    Phone,
    MessageCircle,
    XCircle,
    Truck,
    CheckCircle2,
    Package,
    Loader2,
    FileText,
    Download,
    FileSpreadsheet,
    Mail,
    RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect } from "react";
import { Pagination } from "@/components/admin/Pagination";
import {
    exportOrdersToExcel,
    exportOrdersToPDF,
    generateInvoicePDF,
    getInvoiceBlob
} from "@/utils/exportUtils";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { PERMISSIONS } from "@/constants/permissions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import StatusBadge from "@/components/admin/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { ordersApi } from "@/api/orders";
import { productsApi } from "@/api/products";
import { Order } from "@/data/mock-admin-data";
import { toast } from "@/hooks/use-toast";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { useSettings } from "@/context/SettingsContext";
import { getImageUrl } from "@/lib/image-utils";

const Orders = () => {
    const { searchQuery: globalSearch } = useOutletContext<{ searchQuery: string }>();
    const { currency, settings } = useSettings();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [productFilter, setProductFilter] = useState("all");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Retour state
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [returnReason, setReturnReason] = useState("");
    const [orderToReturn, setOrderToReturn] = useState<string | null>(null);

    // Safety cleanup for stuck backdrops (Radix UI)
    // If the page is frozen, it's usually because 'pointer-events: none' is left on the body
    useEffect(() => {
        if (!isDetailsOpen && !isReturnDialogOpen) {
            const cleanup = () => {
                document.body.style.pointerEvents = 'auto';
                document.body.style.overflow = 'auto';
            };
            // Small delay to let Radix finish its own cleanup
            const timer = setTimeout(cleanup, 100);
            return () => clearTimeout(timer);
        }
    }, [isDetailsOpen, isReturnDialogOpen]);

    const queryClient = useQueryClient();

    // Get current user role and permissions from localStorage
    const userStr = localStorage.getItem("user");
    const currentUser = userStr ? JSON.parse(userStr) : { role: "viewer", permissions: [] };
    const userRole = currentUser.role;
    const userPermissions = currentUser.permissions || [];

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => ordersApi.getAll(),
    });

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => productsApi.getAll(),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
            ordersApi.updateStatus(id, status, reason),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });

            // If the updated order is the one currently selected in the details sheet,
            // we close the sheet to avoid stale data and trigger backdrop cleanup.
            if (selectedOrder?.id === variables.id) {
                setIsDetailsOpen(false);
                setSelectedOrder(null);
            }

            toast({
                title: "Statut mis à jour",
                description: "La commande a été mise à jour avec succès.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Impossible de mettre à jour le statut de la commande.",
                variant: "destructive",
            });
        }
    });

    // Helper function to check if user can perform an action based on permissions or role
    const canUpdateStatus = (status: string): boolean => {
        // Super admin and editor or ManageAll can do anything
        if (userRole === 'super_admin' || userRole === 'editor' || userPermissions.includes(PERMISSIONS.ORDERS_MANAGE)) return true;

        // Check specific permissions
        if (status === 'CONFIRMED' && userPermissions.includes(PERMISSIONS.ORDERS_CONFIRM)) return true;
        if (status === 'SHIPPED' && userPermissions.includes(PERMISSIONS.ORDERS_SHIP)) return true;
        if (status === 'DELIVERED' && userPermissions.includes(PERMISSIONS.ORDERS_DELIVER)) return true;
        if (status === 'CANCELLED' && userPermissions.includes(PERMISSIONS.ORDERS_CANCEL)) return true;
        if (status === 'RETOUR' && userPermissions.includes(PERMISSIONS.ORDERS_RETURN)) return true;
        if (status === 'PENDING' && userPermissions.includes(PERMISSIONS.ORDERS_EDIT)) return true;

        // Legacy role fallbacks
        if (userRole === 'commercial') {
            return ['CONFIRMED', 'CANCELLED'].includes(status);
        }
        if (userRole === 'magasinier') {
            return ['SHIPPED', 'DELIVERED', 'RETOUR'].includes(status);
        }

        return false;
    };

    // Helper function to check if a specific action can be performed on an order
    const canPerformAction = (order: Order, targetStatus: string): boolean => {
        const currentStatus = order.status.toUpperCase();

        // Must have the general permission first
        if (!canUpdateStatus(targetStatus)) return false;

        // Super admin and editor can bypass transition rules if needed (but we keep them for safety)
        if (userRole === 'super_admin' || userRole === 'editor') return true;

        // Status transition rules
        if (targetStatus === 'CONFIRMED') {
            return currentStatus === 'PENDING';
        }
        if (targetStatus === 'SHIPPED') {
            return currentStatus === 'CONFIRMED';
        }
        if (targetStatus === 'DELIVERED') {
            return currentStatus === 'SHIPPED';
        }
        if (targetStatus === 'CANCELLED') {
            return ['PENDING', 'CONFIRMED'].includes(currentStatus);
        }
        if (targetStatus === 'RETOUR') {
            return ['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(currentStatus);
        }

        return false;
    };

    // Helper function to check if order is visible to user
    const isOrderVisible = (order: Order): boolean => {
        if (userRole === 'magasinier') {
            // Magasinier can only see CONFIRMED, SHIPPED, DELIVERED and RETOUR orders
            return ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETOUR'].includes(order.status.toUpperCase());
        }
        return true; // All other roles can see all orders
    };

    const filteredOrders = orders
        .filter((order) => {
            // Role-based visibility filter
            if (!isOrderVisible(order)) return false;

            const combinedSearch = (globalSearch + " " + searchTerm).trim().toLowerCase();
            const matchesSearch =
                order.customerName.toLowerCase().includes(combinedSearch) ||
                order.orderNumber.toLowerCase().includes(combinedSearch) ||
                order.phone.includes(combinedSearch) ||
                order.items.some((item: any) => item.product?.name?.toLowerCase().includes(combinedSearch));

            const matchesStatus = statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase();
            const matchesProduct = productFilter === "all" || order.items.some((item: any) => item.productId === productFilter);

            let matchesDate = true;
            if (dateRange?.from) {
                const orderDate = new Date(order.createdAt);
                if (dateRange.to) {
                    matchesDate = orderDate >= dateRange.from && orderDate <= new Date(dateRange.to.getTime() + 86400000); // Add 1 day to include end date
                } else {
                    matchesDate = orderDate >= dateRange.from;
                }
            }

            return matchesSearch && matchesStatus && matchesDate && matchesProduct;
        })
        .sort((a, b) => {
            // Role based sorting priority
            if (userRole === 'magasinier') {
                // Confirmed first
                const aConfirmed = a.status === 'CONFIRMED';
                const bConfirmed = b.status === 'CONFIRMED';
                if (aConfirmed && !bConfirmed) return -1;
                if (!aConfirmed && bConfirmed) return 1;
            } else if (userRole === 'commercial') {
                // Pending first
                const aPending = a.status === 'PENDING';
                const bPending = b.status === 'PENDING';
                if (aPending && !bPending) return -1;
                if (!aPending && bPending) return 1;
            }

            // Default sort by date
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, productFilter, dateRange, globalSearch]);

    // Apply pagination
    const totalPages = Math.ceil(filteredOrders.length / pageSize);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const openOrderDetails = (order: Order) => {
        setSelectedOrder(order);
        setIsDetailsOpen(true);
    };

    const handleStatusChange = (orderId: string, newStatus: string) => {
        if (newStatus === "RETOUR") {
            setOrderToReturn(orderId);
            setReturnReason("");

            // Serialize transition: close sheet first, wait for Radix to cleanup, then open dialog
            // This prevents the "stacking backdrop" issue that leads to UI freezes.
            if (isDetailsOpen && selectedOrder?.id === orderId) {
                setIsDetailsOpen(false);
                setTimeout(() => {
                    setIsReturnDialogOpen(true);
                }, 300); // Wait for Sheet animation + backdrop cleanup
            } else {
                setIsReturnDialogOpen(true);
            }
            return;
        }
        updateStatusMutation.mutate({ id: orderId, status: newStatus });
    };

    const confirmReturn = () => {
        if (orderToReturn) {
            updateStatusMutation.mutate({
                id: orderToReturn,
                status: "RETOUR",
                reason: returnReason
            }, {
                onSuccess: () => {
                    setIsReturnDialogOpen(false);
                    setOrderToReturn(null);
                    // Force refresh as requested by user to ensure absolute clean state
                    // This is a safety measure to ensure any lingering overlays or body locks are cleared.
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            });
        }
    };

    const openWhatsApp = (phone: string, orderNumber: string) => {
        const message = encodeURIComponent(`Bonjour, c'est à propos de votre commande ${orderNumber} sur MKARIM SOLUTION.`);
        window.open(`https://wa.me/${phone.replace(/\s+/g, '')}?text=${message}`, "_blank");
    };

    const handleEmailInvoice = async (order: Order) => {
        if (!order.email) {
            toast({ title: "Erreur", description: "Le client n'a pas d'adresse email", variant: "destructive" });
            return;
        }

        try {
            toast({ title: "Envoi en cours", description: "Veuillez patienter...", });
            const blob = getInvoiceBlob(order, currency, settings);
            await ordersApi.sendInvoiceEmail(order.id, blob);
            toast({ title: "Succès", description: "Facture envoyée par email" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Échec de l'envoi de l'email", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" /> Exporter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportOrdersToExcel(filteredOrders, currency)}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportOrdersToPDF(filteredOrders, currency)}>
                                <FileText className="mr-2 h-4 w-4" /> PDF (.pdf)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4 mb-6 justify-between items-start lg:items-center">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher commande, client..."
                            className="pl-10 h-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9">
                                <SelectValue placeholder="Filtrer par statut" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les statuts</SelectItem>
                                <SelectItem value="pending">En Attente</SelectItem>
                                <SelectItem value="confirmed">Confirmée</SelectItem>
                                <SelectItem value="shipped">Expédiée</SelectItem>
                                <SelectItem value="delivered">Livrée</SelectItem>
                                <SelectItem value="cancelled">Annulée</SelectItem>
                                <SelectItem value="retour">Retour</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="h-9 w-full sm:w-auto">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full sm:w-auto" />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant={productFilter === 'all' ? "outline" : "default"} size="icon" className="h-9 w-9 shrink-0 hidden sm:inline-flex" title="Filtrer par produit">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[300px]">
                                <DropdownMenuLabel>Filtrer par produit</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <div className="max-h-[300px] overflow-y-auto">
                                    <DropdownMenuRadioGroup value={productFilter} onValueChange={setProductFilter}>
                                        <DropdownMenuRadioItem value="all">Tous les produits</DropdownMenuRadioItem>
                                        {products.map((p: any) => (
                                            <DropdownMenuRadioItem key={p.id} value={p.id} className="cursor-pointer">
                                                <div className="flex flex-col">
                                                    <span className="truncate max-w-[240px] text-sm font-medium">{p.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{p.category?.name || p.categoryId}</span>
                                                </div>
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-md border overflow-x-auto overflow-y-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Numéro</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Ville</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Chargement des commandes...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedOrders.length > 0 ? (
                                paginatedOrders.map((order) => (
                                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/5 transition-colors">
                                        <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{order.customerName}</span>
                                                <span className="text-xs text-muted-foreground">{order.phone}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{order.city}</TableCell>
                                        <TableCell>
                                            {format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}
                                        </TableCell>
                                        <TableCell className="font-bold">{order.total.toLocaleString()} {currency}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <StatusBadge status={order.status} />
                                                {order.returnReason && (
                                                    <span className="text-[10px] text-orange-600 font-medium italic truncate max-w-[100px]" title={order.returnReason}>
                                                        {order.returnReason}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openOrderDetails(order);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        generateInvoicePDF(order, currency, settings);
                                                    }}
                                                    title="Télécharger la facture"
                                                >
                                                    <FileText className="w-4 h-4 text-primary" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEmailInvoice(order);
                                                    }}
                                                    title="Envoyer Facture par Email"
                                                >
                                                    <Mail className="w-4 h-4 text-orange-600" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => generateInvoicePDF(order, currency, settings)}>
                                                            <FileText className="mr-2 h-4 w-4" /> Facture PDF
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEmailInvoice(order)}>
                                                            <Mail className="mr-2 h-4 w-4" /> Envoyer Email
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {canUpdateStatus('CONFIRMED') && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(order.id, "CONFIRMED")}
                                                                disabled={updateStatusMutation.isPending || !canPerformAction(order, 'CONFIRMED')}
                                                            >
                                                                Confirmer
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdateStatus('SHIPPED') && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(order.id, "SHIPPED")}
                                                                disabled={updateStatusMutation.isPending || !canPerformAction(order, 'SHIPPED')}
                                                            >
                                                                Marquer Expédiée
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdateStatus('DELIVERED') && (
                                                            <DropdownMenuItem
                                                                onClick={() => handleStatusChange(order.id, "DELIVERED")}
                                                                disabled={updateStatusMutation.isPending || !canPerformAction(order, 'DELIVERED')}
                                                            >
                                                                Marquer Livrée
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canUpdateStatus('CANCELLED') && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive"
                                                                    onClick={() => handleStatusChange(order.id, "CANCELLED")}
                                                                    disabled={updateStatusMutation.isPending || !canPerformAction(order, 'CANCELLED')}
                                                                >
                                                                    Annuler
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="text-orange-600"
                                                                    onClick={() => handleStatusChange(order.id, "RETOUR")}
                                                                    disabled={updateStatusMutation.isPending}
                                                                >
                                                                    RETOUR (Raison demandée)
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        Aucune commande trouvée.
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
                totalItems={filteredOrders.length}
            />

            {/* Global Order Details Sheet */}
            <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
                    {selectedOrder && (
                        <>
                            <SheetHeader className="mb-6">
                                <SheetTitle className="text-2xl">Commande {selectedOrder.orderNumber}</SheetTitle>
                                <SheetDescription>
                                    Détails complets de la commande et informations client
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-6">
                                {/* Status Section */}
                                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Statut actuel</p>
                                        <StatusBadge status={selectedOrder.status} />
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {canUpdateStatus('CONFIRMED') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStatusChange(selectedOrder.id, "CONFIRMED")}
                                                disabled={updateStatusMutation.isPending || !canPerformAction(selectedOrder, 'CONFIRMED')}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmer
                                            </Button>
                                        )}
                                        {canUpdateStatus('SHIPPED') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStatusChange(selectedOrder.id, "SHIPPED")}
                                                disabled={updateStatusMutation.isPending || !canPerformAction(selectedOrder, 'SHIPPED')}
                                            >
                                                <Truck className="w-4 h-4 mr-1" /> Expédier
                                            </Button>
                                        )}
                                        {canUpdateStatus('DELIVERED') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStatusChange(selectedOrder.id, "DELIVERED")}
                                                disabled={updateStatusMutation.isPending || !canPerformAction(selectedOrder, 'DELIVERED')}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" /> Livrer
                                            </Button>
                                        )}
                                        {canUpdateStatus('RETOUR') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                                onClick={() => handleStatusChange(selectedOrder.id, "RETOUR")}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-1" /> Retour
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Return Reason Section */}
                                {(selectedOrder.status.toUpperCase() === 'RETOUR' || selectedOrder.returnReason) && (
                                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                                        <p className="text-sm font-semibold text-orange-800 mb-1 flex items-center gap-2">
                                            <RotateCcw className="w-4 h-4" /> Raison du retour
                                        </p>
                                        <p className="text-sm text-orange-700 italic">
                                            "{selectedOrder.returnReason || "Raison non spécifiée"}"
                                        </p>
                                    </div>
                                )}

                                {/* Customer Info */}
                                <div>
                                    <h3 className="font-semibold text-lg mb-3">Information Client</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Nom complet</p>
                                            <p className="font-medium">{selectedOrder.customerName}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Téléphone</p>
                                            <p className="font-medium flex items-center gap-2">
                                                {selectedOrder.phone}
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openWhatsApp(selectedOrder.phone, selectedOrder.orderNumber)}>
                                                    <MessageCircle className="w-3 h-3 text-green-600" />
                                                </Button>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Ville</p>
                                            <p className="font-medium">{selectedOrder.city}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-muted-foreground">Adresse</p>
                                            <p className="font-medium">{selectedOrder.address}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="font-semibold text-lg mb-3">Articles</h3>
                                    <div className="border rounded-lg divide-y">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="p-3 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                                                        {item.product?.image ? (
                                                            <img src={getImageUrl(item.product.image)} alt={item.product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="w-5 h-5 text-gray-500" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{item.product?.name || 'Produit inconnu'}</p>
                                                        <p className="text-sm text-muted-foreground">Qté: {item.quantity}</p>
                                                    </div>
                                                </div>
                                                <p className="font-medium">{item.price.toLocaleString()} {currency}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                        <span className="font-semibold text-lg">Total à payer</span>
                                        <span className="font-bold text-xl text-primary">{selectedOrder.total.toLocaleString()} {currency}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    {canUpdateStatus('CANCELLED') && (
                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() => handleStatusChange(selectedOrder.id, "CANCELLED")}
                                            disabled={updateStatusMutation.isPending || !canPerformAction(selectedOrder, 'CANCELLED')}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Annuler la commande
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Return Reason Dialog */}
            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmer le retour</DialogTitle>
                        <DialogDescription>
                            Veuillez indiquer la raison du retour. Les articles seront remis en stock.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Ex: Produit cassé, erreur de commande..."
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && returnReason.trim()) confirmReturn();
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>Annuler</Button>
                        <Button
                            disabled={!returnReason.trim() || updateStatusMutation.isPending}
                            onClick={confirmReturn}
                        >
                            {updateStatusMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                            Confirmer le retour
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Orders;
