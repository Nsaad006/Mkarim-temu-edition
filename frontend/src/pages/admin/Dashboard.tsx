import {
    ShoppingBag,
    Users,
    CreditCard,
    Package,
    ArrowRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Settings2,
    DollarSign,
    Landmark,
    TrendingUp
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";
import { ordersApi } from "@/api/orders";
import { statsApi } from "@/api/stats";
import { settingsApi } from "@/api/settings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const Dashboard = () => {
    const queryClient = useQueryClient();
    const context = useOutletContext<{ searchQuery: string }>();
    const searchQuery = context?.searchQuery || "";
    const { currency } = useSettings();
    const [lowStockThreshold, setLowStockThreshold] = useState(5);
    const [tempThreshold, setTempThreshold] = useState(5);
    const [showLowStock, setShowLowStock] = useState(false);
    const [showOutOfStock, setShowOutOfStock] = useState(false);


    // Fetch settings to get persisted threshold
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: settingsApi.get,
    });

    useEffect(() => {
        if (settings?.lowStockThreshold) {
            setLowStockThreshold(settings.lowStockThreshold);
            setTempThreshold(settings.lowStockThreshold);
        }
    }, [settings]);

    const handleSaveThreshold = async () => {
        try {
            await settingsApi.update({ lowStockThreshold: tempThreshold });
            setLowStockThreshold(tempThreshold);
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
            toast({
                title: "Succès",
                description: "Seuil d'alerte mis à jour",
            });
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible de mettre à jour le seuil",
                variant: "destructive"
            });
        }
    };



    // Fetch dashboard summary (analytics for charts)
    const { data: summary, isLoading: isStatsLoading } = useQuery({
        queryKey: ['stats-summary', lowStockThreshold],
        queryFn: () => statsApi.getSummary(7, undefined, lowStockThreshold),
    });

    // Fetch dashboard stats (KPI cards - MTD)
    const { data: dashboardStats } = useQuery({
        queryKey: ['dashboard-kpis'],
        queryFn: statsApi.getDashboardStats,
    });

    // Fetch orders for the recent orders table
    const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => ordersApi.getAll(),
    });

    const kpis = dashboardStats || summary?.stats || {
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        totalCapitalInvested: 0,
        currentInventoryValue: 0,
        availableCapital: 0,
        totalProfit: 0
    };

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = ["super_admin", "editor"].includes(user.role);

    const dailyRevenueHistory = summary?.revenueHistory || [];
    const cityData = summary?.salesByCity || [];

    const filteredOrders = orders.filter(order => {
        const query = searchQuery.toLowerCase();
        return (
            order.customerName.toLowerCase().includes(query) ||
            order.orderNumber.toLowerCase().includes(query) ||
            order.items.some(item => item.product?.name.toLowerCase().includes(query))
        );
    });

    const filteredStockAlerts = (summary?.lowStock || []).filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOutOfStock = (summary?.outOfStock || []).filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <div className="flex gap-2">

                    <Link to="/admin/products">
                        <Button size="sm">
                            <Package className="mr-2 h-4 w-4" />
                            Ajouter un Produit
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Alerts Section - Collapsible Buttons */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Out of Stock Button */}
                <div className="space-y-2">
                    <Button
                        variant="outline"
                        className={`w-full justify-between h-auto py-4 border-l-4 ${filteredOutOfStock.length > 0 ? 'border-l-destructive bg-destructive/5' : 'border-l-transparent'}`}
                        onClick={() => setShowOutOfStock(!showOutOfStock)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${filteredOutOfStock.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-lg leading-none">Rupture de Stock</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {filteredOutOfStock.length} produits indisponibles
                                </p>
                            </div>
                        </div>
                        {showOutOfStock ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>

                    {showOutOfStock && filteredOutOfStock.length > 0 && (
                        <div className="bg-card border border-border rounded-xl p-4 animate-in slide-in-from-top-2">
                            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                                {filteredOutOfStock.map(product => (
                                    <div key={product.id} className="bg-background border border-border rounded-lg p-3 flex justify-between items-center shadow-sm">
                                        <div>
                                            <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">Indisponible</p>
                                        </div>
                                        <Link to={`/admin/products?edit=${product.id}`}>
                                            <Button size="sm" variant="ghost" className="h-8">Gérer</Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Low Stock Button */}
                <div className="space-y-2">
                    <Button
                        variant="outline"
                        className={`w-full justify-between h-auto py-4 border-l-4 ${filteredStockAlerts.length > 0 ? 'border-l-warning bg-warning/5' : 'border-l-transparent'}`}
                        onClick={() => setShowLowStock(!showLowStock)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${filteredStockAlerts.length > 0 ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                                <Package className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-semibold text-lg leading-none">Stock Faible</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {filteredStockAlerts.length} produits (≤ {lowStockThreshold})
                                </p>
                            </div>
                        </div>
                        {showLowStock ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>

                    {showLowStock && (
                        <div className="bg-card border border-border rounded-xl p-4 animate-in slide-in-from-top-2 space-y-4">
                            {/* Threshold Settings */}
                            <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
                                <Settings2 className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium whitespace-nowrap">Seuil d'alerte :</span>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={tempThreshold}
                                        onChange={(e) => setTempThreshold(Number(e.target.value) || 0)}
                                        className="w-24 h-8"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-8 w-8 p-0"
                                        disabled={tempThreshold === lowStockThreshold}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveThreshold();
                                        }}
                                        title="Enregistrer"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    </Button>
                                </div>
                                <span className="text-xs text-muted-foreground">unités</span>
                            </div>

                            {/* List */}
                            {filteredStockAlerts.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                                    {filteredStockAlerts.map(product => (
                                        <div key={product.id} className="bg-background border border-border rounded-lg p-3 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                                                <p className="text-xs text-warning font-medium">Reste: {product.quantity}</p>
                                            </div>
                                            <Link to={`/admin/products?edit=${product.id}`}>
                                                <Button size="sm" variant="ghost" className="h-8">Gérer</Button>
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-2">Aucun produit en dessous du seuil.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Commandes"
                    value={kpis.totalOrders}
                    icon={ShoppingBag}
                    trend="+12%"
                    trendUp={true}
                />
                <StatsCard
                    title="En Attente (COD)"
                    value={kpis.pendingOrders}
                    icon={Clock}
                    description="Commandes à confirmer"
                />
                <StatsCard
                    title="Commandes Livrées"
                    value={kpis.deliveredOrders}
                    icon={CheckCircle2}
                    trend="+5%"
                    trendUp={true}
                />
                <StatsCard
                    title="Revenu (Ce mois)"
                    value={`${kpis.totalRevenue.toLocaleString()} ${currency}`}
                    icon={CreditCard}
                    description="CA généré ce mois-ci"
                />

                {/* Financial Cards (Admin/Staff Only) */}
                {isStaff && (
                    <>
                        <StatsCard
                            title="Valeur du Stock"
                            value={`${kpis.currentInventoryValue?.toLocaleString() || 0} ${currency}`}
                            icon={TrendingUp}
                            description="Inventaire actuel (WAC)"
                        />
                        <StatsCard
                            title="Profit (Ce mois)"
                            value={`${kpis.totalProfit?.toLocaleString() || 0} ${currency}`}
                            icon={TrendingUp}
                            trendUp={true}
                            description="Marge brute ce mois-ci"
                            className="bg-emerald-500/10 border-emerald-500/20 sm:col-span-2 lg:col-span-1"
                            iconBgClassName="bg-emerald-500/20"
                            iconClassName="text-emerald-500"
                        />
                    </>
                )}
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
                {/* Revenue Chart */}
                <div className="lg:col-span-4 bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h3 className="font-semibold mb-6">Aperçu des Revenus (7 jours)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyRevenueHistory}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#9b87f5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `${value}${currency}`}
                                />
                                <Tooltip />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#9b87f5"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders by City */}
                <div className="lg:col-span-3 bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h3 className="font-semibold mb-6">Performance par Géographie</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cityData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={80}
                                    tick={{ fontSize: 12, fontWeight: 'bold' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" fill="#9b87f5" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Financial Health Chart (Stock vs Profit) */}
            {isStaff && (
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="mb-6">
                        <h3 className="font-semibold">Santé Financière : Stock vs Profit (Mensuel)</h3>
                        <p className="text-xs text-muted-foreground mt-1">Comparaison des revenus et bénéfices nets par mois.</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summary?.monthlyStats || []}>
                                <defs>
                                    <linearGradient id="dashProfitGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}${currency}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                />
                                <Bar dataKey="revenue" name="CA Total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                                <Bar dataKey="profit" name="Profit Est." fill="url(#dashProfitGradient)" radius={[4, 4, 0, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Recent Orders */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold">Commandes Récentes</h3>
                    <Link to="/admin/orders">
                        <Button variant="outline" size="sm">
                            Voir tout <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>ID Commande</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Produit</TableHead>
                                <TableHead>Montant</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.slice(0, 5).map((order) => (
                                <TableRow key={order.id} className="hover:bg-muted/5 transition-colors">
                                    <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                                    <TableCell>{order.customerName}</TableCell>
                                    <TableCell>
                                        {order.items.length > 1
                                            ? `${order.items[0]?.product?.name} (+${order.items.length - 1})`
                                            : order.items[0]?.product?.name || '---'}
                                    </TableCell>
                                    <TableCell className="font-bold">{order.total.toLocaleString()} {currency}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={order.status} />
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {format(new Date(order.createdAt), 'dd MMM', { locale: fr })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

        </div>
    );
};

export default Dashboard;
