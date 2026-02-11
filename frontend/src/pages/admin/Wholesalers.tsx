import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wholesalersApi, Wholesaler, WholesaleOrder } from '@/api/wholesalers';
import { productsApi } from '@/api/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, MapPin, Phone, Mail, ShoppingCart, Eye, DollarSign, FileText, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { useSettings } from "@/context/SettingsContext"; // Import hook
import { PERMISSIONS } from "@/constants/permissions";


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
};

import { generateWholesaleInvoicePDF, getWholesaleInvoiceBlob } from '@/utils/exportUtils';

export default function Wholesalers() {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { role: "viewer", permissions: [] };
    const userPermissions = user.permissions || [];
    const isSuperAdmin = user.role === 'super_admin';
    const canManageWholesalers = isSuperAdmin || userPermissions.includes(PERMISSIONS.WHOLESALERS_CREATE) || userPermissions.includes(PERMISSIONS.LOGISTICS_MANAGE);
    const canEditWholesalers = isSuperAdmin || userPermissions.includes(PERMISSIONS.WHOLESALERS_EDIT) || userPermissions.includes(PERMISSIONS.LOGISTICS_MANAGE);
    const canPayWholesalers = isSuperAdmin || userPermissions.includes(PERMISSIONS.WHOLESALERS_PAYMENTS) || userPermissions.includes(PERMISSIONS.LOGISTICS_MANAGE);

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { settings, currency } = useSettings(); // Get settings and currency
    const [search, setSearch] = useState('');

    // State for Dialogs
    const [isAddWholesalerOpen, setIsAddWholesalerOpen] = useState(false);
    const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<WholesaleOrder | null>(null);
    const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false); // Controls detail view
    const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

    // Edit Wholesaler State
    const [editingWholesaler, setEditingWholesaler] = useState<Wholesaler | null>(null);
    const [isEditWholesalerOpen, setIsEditWholesalerOpen] = useState(false);

    // Price Warning State
    const [showPriceWarning, setShowPriceWarning] = useState(false);
    const [priceWarningItems, setPriceWarningItems] = useState<Array<{ productName: string, unitPrice: number, cost: number }>>([]);

    // Fetch Data
    const { data: orders = [] } = useQuery<WholesaleOrder[]>({
        queryKey: ['wholesale-orders'],
        queryFn: () => wholesalersApi.getAllOrders()
    });

    const { data: wholesalers = [] } = useQuery<Wholesaler[]>({
        queryKey: ['wholesalers'],
        queryFn: () => wholesalersApi.getAll()
    });

    // Derived state for filtering
    const filteredOrders = orders.filter((order: any) =>
        order.wholesaler?.name.toLowerCase().includes(search.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(search.toLowerCase())
    );

    // --- Mutations ---

    const createWholesalerMutation = useMutation({
        mutationFn: wholesalersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wholesalers'] });
            setIsAddWholesalerOpen(false);
            setNewWholesaler({
                type: 'PARTICULIER',
                name: '',
                address: '',
                phone: '',
                email: '',
                ice: '',
                responsibleName: ''
            });
            toast({ title: "Succès", description: "Grossiste ajouté avec succès" });
        },
        onError: () => {
            toast({ title: "Erreur", description: "Impossible d'ajouter le grossiste", variant: "destructive" });
        }
    });

    const updateWholesalerMutation = useMutation({
        mutationFn: (data: Partial<Wholesaler> & { id: string }) =>
            wholesalersApi.update(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wholesalers'] });
            setIsEditWholesalerOpen(false);
            toast({ title: "Succès", description: "Grossiste mis à jour" });
        },
        onError: () => {
            toast({ title: "Erreur", description: "Impossible de mettre à jour", variant: "destructive" });
        }
    });

    // Wholesaler History Modal State
    const [selectedWholesalerHistory, setSelectedWholesalerHistory] = useState<Wholesaler | null>(null);
    const [isWholesalerHistoryOpen, setIsWholesalerHistoryOpen] = useState(false);

    const openWholesalerHistory = (wholesaler: Wholesaler) => {
        setSelectedWholesalerHistory(wholesaler);
        setIsWholesalerHistoryOpen(true);
    };

    const handleEmailInvoice = async (order: any) => {
        if (!order.wholesaler?.email) {
            toast({ title: "Erreur", description: "Le grossiste n'a pas d'adresse email", variant: "destructive" });
            return;
        }

        try {
            toast({ title: "Envoi en cours", description: "Veuillez patienter..." });
            // Using 'DH' as standard currency for now, or get from context/settings
            const blob = getWholesaleInvoiceBlob(order, currency, settings);
            await wholesalersApi.sendInvoiceEmail(order.id, blob);
            toast({ title: "Succès", description: "Facture envoyée par email" });
        } catch (error) {
            console.error(error);
            toast({ title: "Erreur", description: "Échec de l'envoi de l'email", variant: "destructive" });
        }
    };

    const createOrderMutation = useMutation({
        mutationFn: (data: { wholesalerId: string, items: any[], advanceAmount: number }) =>
            wholesalersApi.createOrder(data.wholesalerId, { items: data.items, advanceAmount: data.advanceAmount }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wholesale-orders'] });
            setIsAddOrderOpen(false);
            toast({ title: "Succès", description: "Commande créée avec succès" });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.response?.data?.error || "Impossible de créer la commande", variant: "destructive" });
        }
    });

    const addPaymentMutation = useMutation({
        mutationFn: (data: { orderId: string, amount: number, note: string }) =>
            wholesalersApi.addPayment(data.orderId, data.amount, data.note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wholesale-orders'] });
            // Refresh details if open
            // We might need to refetch specific item or just close. 
            // Better to invalidate 'wholesale-orders' then reload selectedOrder from the list if possible, 
            // but selectedOrder is local state. We should close or update it.
            // For now, let's close the modal or keep it open but we need to refresh data.
            setIsOrderDetailsOpen(false);
            setNewPaymentAmount('');
            setNewPaymentNote('');
            toast({ title: "Succès", description: "Paiement ajouté" });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.response?.data?.error || "Erreur lors du paiement", variant: "destructive" });
        }
    });

    const updateFullOrderMutation = useMutation({
        mutationFn: (data: { orderId: string, items: any[], advanceAmount: number }) =>
            wholesalersApi.updateFullOrder(data.orderId, { items: data.items, advanceAmount: data.advanceAmount }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wholesale-orders'] });
            setIsEditOrderOpen(false);
            toast({ title: "Succès", description: "Commande modifiée avec succès" });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: err.response?.data?.error || "Impossible de modifier la commande", variant: "destructive" });
        }
    });

    const cancelOrderMutation = useMutation({
        mutationFn: (orderId: string) => wholesalersApi.deleteOrder(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wholesale-orders'] });
            setIsOrderDetailsOpen(false);
            toast({ title: "Succès", description: "Commande annulée" });
        },
        onError: (err: any) => {
            toast({ title: "Erreur", description: "Impossible d'annuler: " + (err.response?.data?.error || ""), variant: "destructive" });
        }
    });

    // --- Forms State ---
    const [newWholesaler, setNewWholesaler] = useState<{
        type: 'PARTICULIER' | 'ENTREPRISE';
        name: string;
        address: string;
        phone: string;
        email: string;
        ice?: string;
        responsibleName?: string;
    }>({
        type: 'PARTICULIER',
        name: '',
        address: '',
        phone: '',
        email: '',
        ice: '',
        responsibleName: ''
    });

    // Add Order Form State
    const [newOrderWholesalerId, setNewOrderWholesalerId] = useState('');
    const [newOrderItems, setNewOrderItems] = useState<{ productId: string, quantity: number, unitPrice: number }[]>([]);
    const [newOrderAdvance, setNewOrderAdvance] = useState(0);

    // Payment Form State
    const [newPaymentAmount, setNewPaymentAmount] = useState('');
    const [newPaymentNote, setNewPaymentNote] = useState('');

    // Products for selecting in order
    const [products, setProducts] = useState<any[]>([]); // Need to fetch products

    // Fetch products on demand for the order form
    useEffect(() => {
        if (isAddOrderOpen || isEditOrderOpen) {
            productsApi.getAll().then(setProducts);
        }
    }, [isAddOrderOpen, isEditOrderOpen]);


    const handleAddWholesaler = (e: React.FormEvent) => {
        e.preventDefault();
        createWholesalerMutation.mutate(newWholesaler);
    };

    const handleUpdateWholesaler = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWholesaler) return;
        updateWholesalerMutation.mutate(editingWholesaler);
    };

    const handleAddOrderItem = () => {
        setNewOrderItems([...newOrderItems, { productId: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleUpdateOrderItem = (index: number, field: string, value: any) => {
        const updated = [...newOrderItems];
        if (field === 'productId') {
            // Find price? For wholesale, usually manual price input.
            // Maybe autofill cost price?
        }
        (updated[index] as any)[field] = value;
        setNewOrderItems(updated);
    };

    const handleCreateOrder = () => {
        if (!newOrderWholesalerId) return toast({ title: "Erreur", description: "Sélectionnez un grossiste", variant: "destructive" });
        if (newOrderItems.length === 0) return toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });

        // Check if any item has unit price < cost
        const itemsBelowCost: Array<{ productName: string, unitPrice: number, cost: number }> = [];

        for (const item of newOrderItems) {
            const product = products.find(p => p.id === item.productId);
            if (product && item.unitPrice < (product.weightedAverageCost || 0)) {
                itemsBelowCost.push({
                    productName: product.name,
                    unitPrice: item.unitPrice,
                    cost: product.weightedAverageCost || 0
                });
            }
        }

        // If items below cost, show warning
        if (itemsBelowCost.length > 0) {
            setPriceWarningItems(itemsBelowCost);
            setShowPriceWarning(true);
            return;
        }

        // Proceed with order creation
        proceedWithOrderCreation();
    };

    const proceedWithOrderCreation = () => {
        createOrderMutation.mutate({
            wholesalerId: newOrderWholesalerId,
            items: newOrderItems,
            advanceAmount: Number(newOrderAdvance)
        });
        setShowPriceWarning(false);
    };

    const handleUpdateFullOrder = () => {
        if (!editingOrderId) return;
        if (newOrderItems.length === 0) return toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });

        updateFullOrderMutation.mutate({
            orderId: editingOrderId,
            items: newOrderItems,
            advanceAmount: Number(newOrderAdvance)
        });
    }

    const handleAddPayment = () => {
        if (!selectedOrder) return;
        const amount = Number(newPaymentAmount);
        if (!amount || amount <= 0) return;

        addPaymentMutation.mutate({
            orderId: selectedOrder.id,
            amount: amount,
            note: newPaymentNote
        });
    };

    const openEditOrder = (order: any) => {
        setSelectedOrder(order);
        setEditingOrderId(order.id);
        setNewOrderWholesalerId(order.wholesalerId); // Usually readonly in edit, but tracking it
        setNewOrderItems(order.items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice
        })));
        setNewOrderAdvance(order.advanceAmount);
        setIsOrderDetailsOpen(false); // Close details
        setIsEditOrderOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestion des Grossistes</h1>
                    <p className="text-muted-foreground">Gérez vos clients B2B et suivis de commandes</p>
                </div>
                <div className="flex gap-2">
                    {canManageWholesalers && (
                        <>
                            <Button size="sm" onClick={() => setIsAddWholesalerOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Nouveau Grossiste
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setIsAddOrderOpen(true)}>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Nouvelle Commande
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-2 bg-background p-1 border rounded-md max-w-sm">
                <Search className="h-4 w-4 ml-2 text-muted-foreground" />
                <Input
                    placeholder="Rechercher grossiste ou commande..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-0 focus-visible:ring-0"
                />
            </div>

            {/* Tabs for Orders and Wholesalers */}
            <div className="flex space-x-4 border-b">
                <button
                    className={`pb-2 px-4 border-b-2 font-medium transition-colors ${!search.startsWith('type:wholesaler') ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                        }`}
                    onClick={() => setSearch('')}
                >
                    Historique des Commandes
                </button>
                <button
                    className={`pb-2 px-4 border-b-2 font-medium transition-colors ${search.startsWith('type:wholesaler') ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                        }`}
                    onClick={() => setSearch('type:wholesaler')}
                >
                    Liste des Grossistes
                </button>
            </div>

            {!search.startsWith('type:wholesaler') ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Historique des Commandes B2B</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto bg-card rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Commande</TableHead>
                                        <TableHead className="whitespace-nowrap">Grossiste</TableHead>
                                        <TableHead className="whitespace-nowrap">Date</TableHead>
                                        <TableHead className="whitespace-nowrap">Montant Total</TableHead>
                                        <TableHead className="whitespace-nowrap">Avance</TableHead>
                                        <TableHead className="whitespace-nowrap">Reste à payer</TableHead>
                                        <TableHead className="whitespace-nowrap">Statut</TableHead>
                                        <TableHead className="whitespace-nowrap">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.map((order: any) => {
                                        const remaining = order.totalAmount - order.advanceAmount;

                                        return (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium whitespace-nowrap">{order.orderNumber}</TableCell>
                                                <TableCell className="min-w-[150px]">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">{order.wholesaler.name}</span>
                                                        <span className="text-xs text-muted-foreground">{order.wholesaler.phone}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}</TableCell>
                                                <TableCell className="whitespace-nowrap">{formatCurrency(order.totalAmount)}</TableCell>
                                                <TableCell className="whitespace-nowrap">{formatCurrency(order.advanceAmount)}</TableCell>
                                                <TableCell className={`whitespace-nowrap ${remaining > 0 ? "text-red-500 font-bold" : "text-green-500 font-bold"}`}>
                                                    {formatCurrency(Math.max(0, remaining))}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`whitespace-nowrap ${order.status === 'PAID' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`} variant="outline">
                                                        {order.status === 'PAID' ? 'Réglée' : 'Non Réglée'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        setSelectedOrder(order);
                                                        setIsOrderDetailsOpen(true);
                                                    }} title="Détails">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => generateWholesaleInvoicePDF(order, currency, settings)} title="Télécharger Facture">
                                                        <FileText className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleEmailInvoice(order)} title="Envoyer Facture par Email">
                                                        <Mail className="w-4 h-4 text-orange-600" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filteredOrders.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                Aucune commande trouvée
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Liste des Grossistes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Grossiste</TableHead>
                                        <TableHead className="whitespace-nowrap">Type</TableHead>
                                        <TableHead className="whitespace-nowrap">ICE</TableHead>
                                        <TableHead className="whitespace-nowrap">Téléphone</TableHead>
                                        <TableHead className="whitespace-nowrap">Email</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Total Commandes</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {wholesalers.map((w: any) => (
                                        <TableRow key={w.id}>
                                            <TableCell className="font-medium whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span>{w.name}</span>
                                                    {w.type === 'ENTREPRISE' && w.responsibleName && (
                                                        <span className="text-[10px] text-muted-foreground uppercase">Resp: {w.responsibleName}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant={w.type === 'ENTREPRISE' ? "default" : "secondary"} className="text-[10px]">
                                                    {w.type === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {w.ice || <span className="text-muted-foreground text-xs italic">N/A</span>}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap font-mono text-xs">
                                                {w.phone}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap text-xs">
                                                {w.email || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold whitespace-nowrap">
                                                {w._count?.orders || w.orders?.length || 0}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                {canEditWholesalers && (
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        setEditingWholesaler(w);
                                                        setIsEditWholesalerOpen(true);
                                                    }}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => openWholesalerHistory(w)}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {wholesalers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Aucun grossiste enregistré
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modal: Add Wholesaler */}
            <Dialog open={isAddWholesalerOpen} onOpenChange={setIsAddWholesalerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajouter un Grossiste</DialogTitle>
                        <DialogDescription>Information de contact du client B2B</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddWholesaler} className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Type de Grossiste</Label>
                            <Select
                                value={newWholesaler.type}
                                onValueChange={(val: 'PARTICULIER' | 'ENTREPRISE') => setNewWholesaler({ ...newWholesaler, type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner le type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PARTICULIER">Particulier</SelectItem>
                                    <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>{newWholesaler.type === 'ENTREPRISE' ? 'Nom Entreprise' : 'Nom Complet'}</Label>
                            <Input value={newWholesaler.name} onChange={e => setNewWholesaler({ ...newWholesaler, name: e.target.value })} required />
                        </div>

                        {newWholesaler.type === 'ENTREPRISE' && (
                            <>
                                <div className="grid gap-2">
                                    <Label>ICE (15 chiffres)</Label>
                                    <Input
                                        type="number"
                                        placeholder="Ex: 001234567890123"
                                        value={newWholesaler.ice}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val.length <= 15) setNewWholesaler({ ...newWholesaler, ice: val });
                                        }}
                                        required
                                    />
                                    {newWholesaler.ice && newWholesaler.ice.length !== 15 && (
                                        <p className="text-[10px] text-red-500">L'ICE doit comporter exactement 15 chiffres ({newWholesaler.ice.length}/15)</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label>Nom Responsable</Label>
                                    <Input value={newWholesaler.responsibleName} onChange={e => setNewWholesaler({ ...newWholesaler, responsibleName: e.target.value })} required />
                                </div>
                            </>
                        )}

                        <div className="grid gap-2">
                            <Label>Téléphone</Label>
                            <Input value={newWholesaler.phone} onChange={e => setNewWholesaler({ ...newWholesaler, phone: e.target.value })} required />
                        </div>
                        <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input value={newWholesaler.email} onChange={e => setNewWholesaler({ ...newWholesaler, email: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Adresse</Label>
                            <Input value={newWholesaler.address} onChange={e => setNewWholesaler({ ...newWholesaler, address: e.target.value })} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createWholesalerMutation.isPending}>Ajouter</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Edit Wholesaler */}
            <Dialog open={isEditWholesalerOpen} onOpenChange={setIsEditWholesalerOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modifier le Grossiste</DialogTitle>
                    </DialogHeader>
                    {editingWholesaler && (
                        <form onSubmit={handleUpdateWholesaler} className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Type de Grossiste</Label>
                                <Select
                                    value={editingWholesaler.type}
                                    onValueChange={(val: 'PARTICULIER' | 'ENTREPRISE') => setEditingWholesaler({ ...editingWholesaler, type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner le type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PARTICULIER">Particulier</SelectItem>
                                        <SelectItem value="ENTREPRISE">Entreprise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>{editingWholesaler.type === 'ENTREPRISE' ? 'Nom Entreprise' : 'Nom Complet'}</Label>
                                <Input value={editingWholesaler.name} onChange={e => setEditingWholesaler({ ...editingWholesaler, name: e.target.value })} required />
                            </div>

                            {editingWholesaler.type === 'ENTREPRISE' && (
                                <>
                                    <div className="grid gap-2">
                                        <Label>ICE (15 chiffres)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 001234567890123"
                                            value={editingWholesaler.ice || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val.length <= 15) setEditingWholesaler({ ...editingWholesaler, ice: val });
                                            }}
                                            required
                                        />
                                        {editingWholesaler.ice && editingWholesaler.ice.length !== 15 && (
                                            <p className="text-[10px] text-red-500">L'ICE doit comporter exactement 15 chiffres ({editingWholesaler.ice.length}/15)</p>
                                        )}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Nom Responsable</Label>
                                        <Input value={editingWholesaler.responsibleName || ''} onChange={e => setEditingWholesaler({ ...editingWholesaler, responsibleName: e.target.value })} required />
                                    </div>
                                </>
                            )}

                            <div className="grid gap-2">
                                <Label>Téléphone</Label>
                                <Input value={editingWholesaler.phone} onChange={e => setEditingWholesaler({ ...editingWholesaler, phone: e.target.value })} required />
                            </div>
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input value={editingWholesaler.email || ''} onChange={e => setEditingWholesaler({ ...editingWholesaler, email: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Adresse</Label>
                                <Input value={editingWholesaler.address} onChange={e => setEditingWholesaler({ ...editingWholesaler, address: e.target.value })} />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={updateWholesalerMutation.isPending}>Enregistrer</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal: Wholesaler History */}
            <Dialog open={isWholesalerHistoryOpen} onOpenChange={setIsWholesalerHistoryOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Historique des Commandes: {selectedWholesalerHistory?.name}</DialogTitle>
                        <DialogDescription>
                            Liste complète des transactions pour ce client
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-md border mt-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>N° Commande</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total Commande</TableHead>
                                    <TableHead className="text-right">Avance (Total)</TableHead>
                                    <TableHead className="text-right">Reste à Payer</TableHead>
                                    <TableHead className="text-center">Statut</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.filter((o: any) => o.wholesalerId === selectedWholesalerHistory?.id).length > 0 ? (
                                    orders
                                        .filter((o: any) => o.wholesalerId === selectedWholesalerHistory?.id)
                                        .map((order: any) => {
                                            const remaining = order.totalAmount - order.advanceAmount;
                                            return (
                                                <TableRow key={order.id}>
                                                    <TableCell className="font-mono">{order.orderNumber}</TableCell>
                                                    <TableCell>{format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr })}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(order.totalAmount)}</TableCell>
                                                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(order.advanceAmount)}</TableCell>
                                                    <TableCell className={`text-right font-bold ${remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {formatCurrency(Math.max(0, remaining))}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={order.status === 'PAID' ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}>
                                                            {order.status === 'PAID' ? 'Payé' : 'Non Payé'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="sm" onClick={() => {
                                                            setSelectedOrder(order);
                                                            setIsOrderDetailsOpen(true);
                                                        }} title="Détails">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => generateWholesaleInvoicePDF(order, currency, settings)} title="Télécharger Facture">
                                                            <FileText className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleEmailInvoice(order)} title="Envoyer Facture par Email">
                                                            <Mail className="w-4 h-4 text-orange-600" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                            Aucune commande pour ce grossiste
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Order */}
            <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Nouvelle Commande Grossiste</DialogTitle>
                        <DialogDescription>Créer une commande et déduire du stock</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                        <div className="grid gap-2">
                            <Label>Sélectionner Grossiste</Label>
                            <Select onValueChange={setNewOrderWholesalerId} value={newOrderWholesalerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un grossiste" />
                                </SelectTrigger>
                                <SelectContent>
                                    {wholesalers.map((w: any) => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border rounded-md p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Articles</h3>
                                <Button size="sm" variant="outline" onClick={handleAddOrderItem}><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
                            </div>
                            {newOrderItems.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Label className="text-xs">Produit</Label>
                                        <Select
                                            value={item.productId}
                                            onValueChange={(val) => handleUpdateOrderItem(idx, 'productId', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Produit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((p: any) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                                                                {p.images && p.images[0] ? (
                                                                    <img
                                                                        src={`http://localhost:3001${p.images[0]}`}
                                                                        alt={p.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                                                                        IMG
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col text-left">
                                                                <span className="font-medium text-sm">{p.name}</span>
                                                                <div className="flex gap-2 text-xs text-muted-foreground">
                                                                    <span>Stock: {p.quantity}</span>
                                                                    <span>•</span>
                                                                    <span className="text-green-600 font-medium">Coût: {formatCurrency(p.weightedAverageCost || 0)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24">
                                        <Label className="text-xs">Qté</Label>
                                        <Input type="number" value={item.quantity} onChange={(e) => handleUpdateOrderItem(idx, 'quantity', Number(e.target.value))} />
                                    </div>
                                    <div className="w-32">
                                        <Label className="text-xs">Prix Unitaire</Label>
                                        <Input type="number" value={item.unitPrice} onChange={(e) => handleUpdateOrderItem(idx, 'unitPrice', Number(e.target.value))} />
                                    </div>
                                    <Button size="icon" variant="destructive" onClick={() => {
                                        const updated = newOrderItems.filter((_, i) => i !== idx);
                                        setNewOrderItems(updated);
                                    }}>
                                        <div className="w-4 h-4 bg-white/20" />X
                                    </Button>
                                </div>
                            ))}
                            {newOrderItems.length > 0 && (
                                <div className="text-right font-bold text-lg">
                                    Total Calculé: {formatCurrency(newOrderItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0))}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Montant Avance (DH)</Label>
                            <Input type="number" value={newOrderAdvance} onChange={(e) => setNewOrderAdvance(Number(e.target.value))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateOrder} disabled={createOrderMutation.isPending}>Valider la commande</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Price Warning Dialog */}
            <Dialog open={showPriceWarning} onOpenChange={setShowPriceWarning}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">⚠️ Attention: Prix en dessous du coût</DialogTitle>
                        <DialogDescription>
                            Les produits suivants ont un prix unitaire inférieur au coût d'achat. Cela entraînera une perte sur ces articles.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="text-left p-3 font-semibold">Produit</th>
                                        <th className="text-right p-3 font-semibold">Prix Unitaire</th>
                                        <th className="text-right p-3 font-semibold">Coût</th>
                                        <th className="text-right p-3 font-semibold">Perte</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priceWarningItems.map((item, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-3">{item.productName}</td>
                                            <td className="text-right p-3 text-destructive font-semibold">
                                                {formatCurrency(item.unitPrice)}
                                            </td>
                                            <td className="text-right p-3">
                                                {formatCurrency(item.cost)}
                                            </td>
                                            <td className="text-right p-3 text-destructive font-bold">
                                                -{formatCurrency(item.cost - item.unitPrice)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                            <p className="text-sm font-medium text-destructive">
                                Êtes-vous sûr de vouloir continuer avec ces prix ?
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Cette action créera une commande avec des prix inférieurs au coût d'achat.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowPriceWarning(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={proceedWithOrderCreation}>
                            Confirmer et Continuer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Order Detail */}
            <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
                <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Détail Commande {selectedOrder?.orderNumber}</DialogTitle>
                        <DialogDescription>
                            Client: {(selectedOrder as any)?.wholesaler?.name}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produit</TableHead>
                                        <TableHead className="text-right">Qté</TableHead>
                                        <TableHead className="text-right text-muted-foreground">Coût U.</TableHead>
                                        <TableHead className="text-right">Prix Vente</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrder.items.map((item: any) => {
                                        // Calculate WAC for display
                                        let wac = 0;
                                        if (item.product?.procurements) {
                                            const totalCost = item.product.procurements.reduce((sum: number, p: any) => sum + (p.unitCostPrice * p.quantityPurchased), 0);
                                            const totalQty = item.product.procurements.reduce((sum: number, p: any) => sum + p.quantityPurchased, 0);
                                            wac = totalQty > 0 ? totalCost / totalQty : 0;
                                        }

                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.product.name}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{formatCurrency(wac)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(item.unitPrice)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            <div className="bg-muted p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span>Montant Total</span>
                                    <span className="font-bold">{formatCurrency(selectedOrder.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Avance payée</span>
                                    <span className="text-green-600 font-bold">{formatCurrency(selectedOrder.advanceAmount)}</span>
                                </div>
                                <div className="flex justify-between text-lg border-t pt-2">
                                    <span>Reste à payer</span>
                                    <span className={(selectedOrder.totalAmount - selectedOrder.advanceAmount) > 0 ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                                        {formatCurrency(Math.max(0, selectedOrder.totalAmount - selectedOrder.advanceAmount))}
                                    </span>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Badge className={selectedOrder.status === 'PAID' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
                                        {selectedOrder.status === 'PAID' ? 'Réglée' : 'Non Réglée'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-semibold text-lg">Historique des Paiements</h3>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Note</TableHead>
                                            <TableHead className="text-right">Montant</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                                            selectedOrder.payments.map((payment) => (
                                                <TableRow key={payment.id}>
                                                    <TableCell>{format(new Date(payment.date), 'dd MMM yyyy HH:mm', { locale: fr })}</TableCell>
                                                    <TableCell>{payment.note || '-'}</TableCell>
                                                    <TableCell className="text-right font-medium text-green-600">
                                                        +{formatCurrency(payment.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                                                    Aucun paiement enregistré
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>

                                {/* Add Payment Section */}
                                {(selectedOrder.totalAmount - selectedOrder.advanceAmount) > 0 && canPayWholesalers && (
                                    <div className="bg-muted/50 p-4 rounded-md space-y-3 border">
                                        <h4 className="font-medium text-sm">Ajouter un paiement</h4>
                                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                                            <div className="grid gap-1.5 flex-1">
                                                <Label htmlFor="payment-amount">Montant (max: {formatCurrency(selectedOrder.totalAmount - selectedOrder.advanceAmount)})</Label>
                                                <Input
                                                    id="payment-amount"
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={newPaymentAmount}
                                                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid gap-1.5 flex-[2]">
                                                <Label htmlFor="payment-note">Note / Référence</Label>
                                                <Input
                                                    id="payment-note"
                                                    placeholder="Ex: Virement bancaire, Espèces..."
                                                    value={newPaymentNote}
                                                    onChange={(e) => setNewPaymentNote(e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                onClick={handleAddPayment}
                                                disabled={addPaymentMutation.isPending || !newPaymentAmount || Number(newPaymentAmount) <= 0}
                                            >
                                                <DollarSign className="w-4 h-4 mr-2" />
                                                Ajouter
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="flex justify-between sm:justify-between w-full pt-4 border-t">
                                {canEditWholesalers && (
                                    <>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                if (confirm("Êtes-vous sûr de vouloir annuler cette commande ? Le stock sera restauré.")) {
                                                    cancelOrderMutation.mutate(selectedOrder.id);
                                                }
                                            }}
                                            disabled={cancelOrderMutation.isPending}
                                        >
                                            Annuler la Commande
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => openEditOrder(selectedOrder)}
                                        >
                                            Modifier la Commande
                                        </Button>
                                    </>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal: Edit Order */}
            <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Modifier la Commande</DialogTitle>
                        <DialogDescription>
                            Modification complète (Stock sera ajusté)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                        <div className="grid gap-2">
                            <Label>Grossiste</Label>
                            <Select value={newOrderWholesalerId} disabled>
                                <SelectTrigger>
                                    <SelectValue placeholder="Grossiste" />
                                </SelectTrigger>
                                <SelectContent>
                                    {wholesalers.map((w: any) => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border rounded-md p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Articles</h3>
                                <Button size="sm" variant="outline" onClick={handleAddOrderItem}><Plus className="w-3 h-3 mr-1" /> Ajouter</Button>
                            </div>
                            {newOrderItems.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Label className="text-xs">Produit</Label>
                                        <Select
                                            value={item.productId}
                                            onValueChange={(val) => handleUpdateOrderItem(idx, 'productId', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Produit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((p: any) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                                                                {p.images && p.images[0] ? (
                                                                    <img
                                                                        src={`http://localhost:3001${p.images[0]}`}
                                                                        alt={p.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                                                                        IMG
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col text-left">
                                                                <span className="font-medium text-sm">{p.name}</span>
                                                                <div className="flex gap-2 text-xs text-muted-foreground">
                                                                    <span>Stock: {p.quantity}</span>
                                                                    <span>•</span>
                                                                    <span className="text-green-600 font-medium">Coût: {formatCurrency(p.weightedAverageCost || 0)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24">
                                        <Label className="text-xs">Qté</Label>
                                        <Input type="number" value={item.quantity} onChange={(e) => handleUpdateOrderItem(idx, 'quantity', Number(e.target.value))} />
                                    </div>
                                    <div className="w-32">
                                        <Label className="text-xs">Prix Unitaire</Label>
                                        <Input type="number" value={item.unitPrice} onChange={(e) => handleUpdateOrderItem(idx, 'unitPrice', Number(e.target.value))} />
                                    </div>
                                    <Button size="icon" variant="destructive" onClick={() => {
                                        const updated = newOrderItems.filter((_, i) => i !== idx);
                                        setNewOrderItems(updated);
                                    }}>
                                        <div className="w-4 h-4 bg-white/20" />X
                                    </Button>
                                </div>
                            ))}
                            {newOrderItems.length > 0 && (
                                <div className="text-right font-bold text-lg">
                                    Total Calculé: {formatCurrency(newOrderItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0))}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Montant Avance (DH)</Label>
                            <Input type="number" value={newOrderAdvance} onChange={(e) => setNewOrderAdvance(Number(e.target.value))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdateFullOrder} disabled={updateFullOrderMutation.isPending}>Confirmer Modification</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
