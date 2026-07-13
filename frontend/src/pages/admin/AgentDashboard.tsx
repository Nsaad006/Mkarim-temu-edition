import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { commissionApi, CommissionRecord } from "@/api/commission";
import { ordersApi } from "@/api/orders";
import { useSettings } from "@/context/SettingsContext";
import {
    Clock, CheckCircle2, Package, DollarSign, ChevronLeft, ChevronRight, Eye, AlertCircle, TrendingUp, Truck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import StatusBadge from "@/components/admin/StatusBadge";

const MONTH_NAMES = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function AgentDashboard() {
    const { settings } = useSettings();
    const currency = settings?.currency || "DH";
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    // Scope all query keys to the current user so agents never share cached data
    const currentUserId = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "{}").id ?? "me"; }
        catch { return "me"; }
    })();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["agent-commission", currentUserId, month, year],
        queryFn: () => commissionApi.getMyStats(month, year),
        retry: 1,
        refetchOnWindowFocus: true,
        staleTime: 30_000,
    });

    // Pending orders to confirm (scoped to this agent via backend allowedCategories filter)
    const { data: pendingOrders = [], isLoading: ordersLoading } = useQuery({
        queryKey: ["orders", currentUserId, { status: "PENDING" }],
        queryFn: () => ordersApi.getAll({ status: "PENDING" }),
        retry: 1,
        refetchOnWindowFocus: true,
        staleTime: 30_000,
    });

    // Orders confirmed by this agent that are still awaiting delivery
    const { data: confirmedOrders = [], isLoading: confirmedLoading } = useQuery({
        queryKey: ["orders", currentUserId, { confirmedByMe: true, status: "CONFIRMED_SHIPPED" }],
        queryFn: async () => {
            const [confirmed, shipped] = await Promise.all([
                ordersApi.getAll({ confirmedByMe: true, status: "CONFIRMED" }),
                ordersApi.getAll({ confirmedByMe: true, status: "SHIPPED" }),
            ]);
            return [...confirmed, ...shipped].sort(
                (a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
            );
        },
        retry: 1,
        refetchOnWindowFocus: true,
        staleTime: 30_000,
    });

    const goBack = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const goForward = () => {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

    const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const todayRecords = (data?.records ?? []).filter(
        r => r.status !== 'CANCELLED' && r.createdAt.slice(0, 10) === todayStr
    );
    const todayCommission = todayRecords.reduce((s, r) => s + r.amount, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Mes Commissions</h1>
                    <p className="text-muted-foreground text-sm mt-1">Statistiques et commandes à confirmer</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goBack}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="text-sm font-medium w-36 text-center">{MONTH_NAMES[month - 1]} {year}</span>
                    <Button variant="outline" size="icon" onClick={goForward} disabled={isCurrentMonth}><ChevronRight className="w-4 h-4" /></Button>
                </div>
            </div>

            {/* Error state */}
            {isError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Impossible de charger les données. Vérifiez votre connexion.
                </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Today's commission — highlighted, first */}
                {isCurrentMonth && (
                    <Card className="col-span-2 md:col-span-3 xl:col-span-1 border-green-500/30 bg-green-500/5">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Aujourd'hui</CardTitle>
                            <TrendingUp className="w-4 h-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-green-600">
                                {isLoading ? "—" : todayCommission.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {currency} · {isLoading ? "—" : todayRecords.length} commande{todayRecords.length !== 1 ? "s" : ""}
                            </p>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">À confirmer</CardTitle>
                        <Clock className="w-4 h-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-yellow-600">
                            {ordersLoading ? "—" : pendingOrders.length}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">en attente</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Confirmées</CardTitle>
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {isLoading ? "—" : data?.ordersConfirmed ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">ce mois</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Livrées</CardTitle>
                        <Package className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {isLoading ? "—" : data?.ordersDelivered ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">ce mois</p>
                    </CardContent>
                </Card>

                <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Commission</CardTitle>
                        <DollarSign className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-primary">
                            {isLoading ? "—" : (data?.pendingPayment ?? 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{currency} à recevoir</p>
                    </CardContent>
                </Card>
            </div>

            {/* Summary line */}
            {!isLoading && data && (
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>Gagné: <strong className="text-foreground">{data.totalEarned.toFixed(2)} {currency}</strong></span>
                    <span>Payé: <strong className="text-green-600">{data.totalPaid.toFixed(2)} {currency}</strong></span>
                    <span>Restant: <strong className="text-primary">{data.pendingPayment.toFixed(2)} {currency}</strong></span>
                </div>
            )}

            {/* Pending orders table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            Commandes en attente de confirmation
                            {!ordersLoading && pendingOrders.length > 0 && (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 ml-1">
                                    {pendingOrders.length}
                                </Badge>
                            )}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {ordersLoading ? (
                        <p className="p-4 text-sm text-muted-foreground">Chargement...</p>
                    ) : pendingOrders.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">Aucune commande en attente.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Numéro</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Ville</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Commission si livrée</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingOrders.slice(0, 20).map((order: any) => {
                                    const estimatedComm = order.items?.reduce(
                                        (s: number, item: any) => s + item.quantity * (item.product?.commission || 0), 0
                                    ) ?? 0;
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium text-sm">{order.orderNumber}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">{order.customerName}</p>
                                                    <p className="text-xs text-muted-foreground">{order.phone}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{order.city}</TableCell>
                                            <TableCell className="font-semibold text-sm">{order.total.toLocaleString()} {currency}</TableCell>
                                            <TableCell>
                                                {estimatedComm > 0 ? (
                                                    <span className="text-primary font-semibold text-sm">
                                                        +{estimatedComm.toFixed(2)} {currency}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(order.createdAt), "dd MMM HH:mm", { locale: fr })}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Confirmed orders awaiting delivery */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-500" />
                            Commandes confirmées — en attente de livraison
                            {!confirmedLoading && confirmedOrders.length > 0 && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 ml-1">
                                    {confirmedOrders.length}
                                </Badge>
                            )}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {confirmedLoading ? (
                        <p className="p-4 text-sm text-muted-foreground">Chargement...</p>
                    ) : confirmedOrders.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">Aucune commande en attente de livraison.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Numéro</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Ville</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Commission</TableHead>
                                    <TableHead>Confirmée le</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {confirmedOrders.map((order: any) => {
                                    const commission = order.items?.reduce(
                                        (s: number, item: any) => s + item.quantity * (item.product?.commission || 0), 0
                                    ) ?? 0;
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium text-sm">{order.orderNumber}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium text-sm">{order.customerName}</p>
                                                    <p className="text-xs text-muted-foreground">{order.phone}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{order.city}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={order.status} />
                                            </TableCell>
                                            <TableCell className="font-semibold text-sm">
                                                {order.total.toLocaleString()} {currency}
                                            </TableCell>
                                            <TableCell>
                                                {commission > 0 ? (
                                                    <span className="text-primary font-semibold text-sm">
                                                        {commission.toFixed(2)} {currency}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(order.updatedAt ?? order.createdAt), "dd MMM HH:mm", { locale: fr })}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Commission records this month */}
            {!isLoading && (data?.records?.length ?? 0) > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-primary" />
                            Commissions gagnées — {MONTH_NAMES[month - 1]} {year}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Commande</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Statut commande</TableHead>
                                    <TableHead>Commission</TableHead>
                                    <TableHead>Statut paiement</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data!.records.map((rec: CommissionRecord) => {
                                    const isToday = rec.createdAt.slice(0, 10) === todayStr;
                                    return (
                                    <TableRow key={rec.id} className={isToday ? "bg-green-500/5" : ""}>
                                        <TableCell className="font-medium text-sm">
                                            {rec.order.orderNumber}
                                            {isToday && (
                                                <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1 bg-green-500/10 text-green-600 border-green-500/20">
                                                    Aujourd'hui
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">{rec.order.customerName}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={rec.order.status} />
                                        </TableCell>
                                        <TableCell className="font-semibold text-primary text-sm">
                                            {rec.amount.toFixed(2)} {currency}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                rec.status === 'PAID'
                                                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                    : rec.status === 'CANCELLED'
                                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                    : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                            }>
                                                {rec.status === 'PAID' ? 'Payé' : rec.status === 'CANCELLED' ? 'Annulé' : 'En attente'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(rec.createdAt), "dd MMM HH:mm", { locale: fr })}
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Monthly history */}
            {!isLoading && (data?.history?.length ?? 0) > 1 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Historique mensuel</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Période</TableHead>
                                    <TableHead>Commission totale</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data!.history.map(h => (
                                    <TableRow
                                        key={`${h.year}-${h.month}`}
                                        className={h.month === month && h.year === year ? "bg-primary/5" : ""}
                                    >
                                        <TableCell className="font-medium">{MONTH_NAMES[h.month - 1]} {h.year}</TableCell>
                                        <TableCell className="text-primary font-semibold">
                                            {(h._sum.amount ?? 0).toFixed(2)} {currency}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setMonth(h.month); setYear(h.year); }}
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1" /> Voir
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
