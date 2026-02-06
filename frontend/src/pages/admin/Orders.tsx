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
    Mail
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
import StatusBadge from "@/components/admin/StatusBadge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { ordersApi } from "@/api/orders";
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
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const queryClient = useQueryClient();

    // Get current user role from localStorage
    const userStr = localStorage.getItem("user");
    const currentUser = userStr ? JSON.parse(userStr) : { role: "viewer" };
    const userRole = currentUser.role;

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => ordersApi.getAll(),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            ordersApi.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
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

    // Helper function to check if user can perform an action
    const canUpdateStatus = (status: string): boolean => {
        if (userRole === 'super_admin' || userRole === 'editor') return true;
        if (userRole === 'commercial') {
            return ['CONFIRMED', 'CANCELLED'].includes(status);
        }
        if (userRole === 'magasinier') {
            return ['SHIPPED', 'DELIVERED'].includes(status);
        }
        return false;
    };

    // Helper function to check if a specific action can be performed on an order
    const canPerformAction = (order: Order, targetStatus: string): boolean => {
        const currentStatus = order.status.toUpperCase();

        // Super admin and editor can do anything
        if (userRole === 'super_admin' || userRole === 'editor') return true;

        if (userRole === 'commercial') {
            // Commercial can only CONFIRM orders that are PENDING
            if (targetStatus === 'CONFIRMED') {
                return currentStatus === 'PENDING';
            }
            // Commercial can only CANCEL orders that are PENDING or CONFIRMED
            if (targetStatus === 'CANCELLED') {
                return ['PENDING', 'CONFIRMED'].includes(currentStatus);
            }
        }

        if (userRole === 'magasinier') {
            // Magasinier can only mark as SHIPPED if order is CONFIRMED
            if (targetStatus === 'SHIPPED') {
                return currentStatus === 'CONFIRMED';
            }
            // Magasinier can only mark as DELIVERED if order is SHIPPED
            if (targetStatus === 'DELIVERED') {
                return currentStatus === 'SHIPPED';
            }
        }

        return false;
    };

    // Helper function to check if order is visible to user
    const isOrderVisible = (order: Order): boolean => {
        if (userRole === 'magasinier') {
            // Magasinier can only see CONFIRMED, SHIPPED, and DELIVERED orders
            return ['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status.toUpperCase());
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
                order.phone.includes(combinedSearch);

            const matchesStatus = statusFilter === "all" || order.status.toLowerCase() === statusFilter.toLowerCase();

            let matchesDate = true;
            if (dateRange?.from) {
                const orderDate = new Date(order.createdAt);
                if (dateRange.to) {
                    matchesDate = orderDate >= dateRange.from && orderDate <= new Date(dateRange.to.getTime() + 86400000); // Add 1 day to include end date
                } else {
                    matchesDate = orderDate >= dateRange.from;
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
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
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, dateRange, globalSearch]);

    // Apply pagination
    const totalPages = Math.ceil(filteredOrders.length / pageSize);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleStatusChange = (orderId: string, newStatus: string) => {
        updateStatusMutation.mutate({ id: orderId, status: newStatus });
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
                            </SelectContent>
                        </Select>
                        <div className="h-9 w-full sm:w-auto">
                            <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full sm:w-auto" />
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 hidden sm:inline-flex">
                            <Filter className="h-4 w-4" />
                        </Button>
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
                                            <StatusBadge status={order.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Sheet>
                                                <SheetTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </SheetTrigger>
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
                                                <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
                                                    <SheetHeader className="mb-6">
                                                        <SheetTitle className="text-2xl">Commande {order.orderNumber}</SheetTitle>
                                                        <SheetDescription>
                                                            Détails complets de la commande et informations client
                                                        </SheetDescription>
                                                    </SheetHeader>

                                                    <div className="space-y-6">
                                                        {/* Status Section */}
                                                        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                                                            <div>
                                                                <p className="text-sm text-muted-foreground mb-1">Statut actuel</p>
                                                                <StatusBadge status={order.status} />
                                                            </div>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {/* Commercial can only CONFIRM */}
                                                                {canUpdateStatus('CONFIRMED') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleStatusChange(order.id, "CONFIRMED")}
                                                                        disabled={updateStatusMutation.isPending || !canPerformAction(order, 'CONFIRMED')}
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmer
                                                                    </Button>
                                                                )}
                                                                {/* Magasinier can mark as SHIPPED */}
                                                                {canUpdateStatus('SHIPPED') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleStatusChange(order.id, "SHIPPED")}
                                                                        disabled={updateStatusMutation.isPending || !canPerformAction(order, 'SHIPPED')}
                                                                    >
                                                                        <Truck className="w-4 h-4 mr-1" /> Expédier
                                                                    </Button>
                                                                )}
                                                                {/* Magasinier can mark as DELIVERED */}
                                                                {canUpdateStatus('DELIVERED') && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleStatusChange(order.id, "DELIVERED")}
                                                                        disabled={updateStatusMutation.isPending || !canPerformAction(order, 'DELIVERED')}
                                                                    >
                                                                        <CheckCircle2 className="w-4 h-4 mr-1" /> Livrer
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Customer Info */}
                                                        <div>
                                                            <h3 className="font-semibold text-lg mb-3">Information Client</h3>
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <p className="text-muted-foreground">Nom complet</p>
                                                                    <p className="font-medium">{order.customerName}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground">Téléphone</p>
                                                                    <p className="font-medium flex items-center gap-2">
                                                                        {order.phone}
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openWhatsApp(order.phone, order.orderNumber)}>
                                                                            <MessageCircle className="w-3 h-3 text-green-600" />
                                                                        </Button>
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-muted-foreground">Ville</p>
                                                                    <p className="font-medium">{order.city}</p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-muted-foreground">Adresse</p>
                                                                    <p className="font-medium">{order.address}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Items */}
                                                        <div>
                                                            <h3 className="font-semibold text-lg mb-3">Articles</h3>
                                                            <div className="border rounded-lg divide-y">
                                                                {order.items.map((item, idx) => (
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
                                                                <span className="font-bold text-xl text-primary">{order.total.toLocaleString()} {currency}</span>
                                                            </div>
                                                        </div>

                                                        {/* Quick Actions */}
                                                        <div>
                                                            <h3 className="font-semibold text-lg mb-3">Actions Rapides</h3>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => openWhatsApp(order.phone, order.orderNumber)}>
                                                                    <MessageCircle className="w-4 h-4 mr-2" />
                                                                    WhatsApp
                                                                </Button>
                                                                <Button className="w-full" variant="outline" onClick={() => window.open(`tel:${order.phone}`)}>
                                                                    <Phone className="w-4 h-4 mr-2" />
                                                                    Appeler
                                                                </Button>
                                                                <Button className="w-full" variant="outline" onClick={() => generateInvoicePDF(order, currency, settings)}>
                                                                    <FileText className="w-4 h-4 mr-2" />
                                                                    Facture
                                                                </Button>
                                                                <Button className="w-full" variant="outline" onClick={() => handleEmailInvoice(order)}>
                                                                    <Mail className="w-4 h-4 mr-2" />
                                                                    Envoyer Email
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 border-t">
                                                            {canUpdateStatus('CANCELLED') && (
                                                                <Button
                                                                    variant="destructive"
                                                                    className="w-full"
                                                                    onClick={() => handleStatusChange(order.id, "CANCELLED")}
                                                                    disabled={updateStatusMutation.isPending || !canPerformAction(order, 'CANCELLED')}
                                                                >
                                                                    <XCircle className="w-4 h-4 mr-2" />
                                                                    Annuler la commande
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </SheetContent>
                                            </Sheet>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
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
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
        </div>
    );
};

export default Orders;
