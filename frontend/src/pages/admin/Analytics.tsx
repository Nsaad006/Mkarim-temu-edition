import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { statsApi } from "@/api/stats";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { getImageUrl } from "@/lib/image-utils";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const Analytics = () => {
    const { currency } = useSettings();
    const [days, setDays] = useState(30);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedRevenueMonth, setSelectedRevenueMonth] = useState(new Date().getMonth());
    const [selectedProfitMonth, setSelectedProfitMonth] = useState(new Date().getMonth());

    const { data: summary, isLoading } = useQuery({
        queryKey: ['stats-summary', days, dateRange, selectedYear],
        queryFn: () => statsApi.getSummary(days, dateRange, undefined, selectedYear),
    });

    const dailyRevenueHistory = summary?.revenueHistory || [];
    const cityData = summary?.salesByCity || [];
    const topProducts = summary?.topProducts || [];
    const monthlyStats = summary?.monthlyStats || [];

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isStaff = ["super_admin", "editor"].includes(user.role);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Profonds</h1>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Année:</span>
                        <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Année" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2024, 2025, 2026, 2027].map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                        <Download className="mr-2 h-4 w-4" /> Exporter
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h3 className="font-semibold mb-6">Flux de Revenus Quotidiens</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyRevenueHistory}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
                                <YAxis width={80} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}${currency}`} tick={{ fill: '#9ca3af' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#9b87f5"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: "#9b87f5" }}
                                    activeDot={{ r: 6, fill: "#fff" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales by City */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h3 className="font-semibold mb-6">Performance par Géographie</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cityData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 'bold' }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
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
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold tracking-tight">Santé Financière : Stock vs Profit ({selectedYear})</h3>
                            <p className="text-sm text-muted-foreground mt-1">Comparaison entre la valeur immobilisée en stock et les bénéfices générés.</p>
                        </div>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyStats}>
                                <defs>
                                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `${val}${currency}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Bar dataKey="revenue" name="Valeur de Vente" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="profit" name="Profit Estimé" fill="url(#profitGradient)" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Monthly Revenue Card */}
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-muted/30">
                        <h3 className="font-bold flex items-center gap-2 text-blue-500">
                            📊 Revenu Mensuel (CA) - {selectedYear}
                        </h3>
                    </div>
                    <div className="p-6">
                        <Select
                            value={String(selectedRevenueMonth)}
                            onValueChange={(value) => setSelectedRevenueMonth(Number(value))}
                        >
                            <SelectTrigger className="w-full mb-4">
                                <SelectValue>
                                    {monthlyStats[selectedRevenueMonth]?.name || 'Sélectionner un mois'} - {monthlyStats[selectedRevenueMonth]?.revenue.toLocaleString() || 0} {currency}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {monthlyStats.map((m, index) => (
                                    <SelectItem key={m.name} value={String(index)}>
                                        <div className="flex justify-between items-center w-full gap-8">
                                            <span className="font-medium">{m.name}</span>
                                            <span className={`font-bold ${m.revenue === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                {m.revenue.toLocaleString()} {currency}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Mois sélectionné:</span>
                                <span className="font-bold">{monthlyStats[selectedRevenueMonth]?.name}</span>
                            </div>
                            <div className="flex justify-between text-lg">
                                <span className="text-muted-foreground">Chiffre d'Affaire:</span>
                                <span className="font-bold text-blue-500">
                                    {monthlyStats[selectedRevenueMonth]?.revenue.toLocaleString() || 0} {currency}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Monthly Profit Card */}
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border bg-muted/30">
                        <h3 className="font-bold flex items-center gap-2 text-green-500">
                            💰 Profit Mensuel Estimé - {selectedYear}
                        </h3>
                    </div>
                    <div className="p-6">
                        <Select
                            value={String(selectedProfitMonth)}
                            onValueChange={(value) => setSelectedProfitMonth(Number(value))}
                        >
                            <SelectTrigger className="w-full mb-4">
                                <SelectValue>
                                    {monthlyStats[selectedProfitMonth]?.name || 'Sélectionner un mois'} - {monthlyStats[selectedProfitMonth]?.profit > 0 ? '+' : ''}{monthlyStats[selectedProfitMonth]?.profit.toLocaleString() || 0} {currency}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {monthlyStats.map((m, index) => (
                                    <SelectItem key={m.name} value={String(index)}>
                                        <div className="flex justify-between items-center w-full gap-8">
                                            <span className={`font-medium ${m.profit > 0 ? 'text-green-500' : ''}`}>{m.name}</span>
                                            <span className={`font-bold ${m.profit > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                                                {m.profit > 0 ? '+' : ''}{m.profit.toLocaleString()} {currency}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Mois sélectionné:</span>
                                <span className="font-bold">{monthlyStats[selectedProfitMonth]?.name}</span>
                            </div>
                            <div className="flex justify-between text-lg">
                                <span className="text-muted-foreground">Bénéfice Net Est.:</span>
                                <span className={`font-bold ${monthlyStats[selectedProfitMonth]?.profit > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                                    {monthlyStats[selectedProfitMonth]?.profit > 0 ? '+' : ''}{monthlyStats[selectedProfitMonth]?.profit.toLocaleString() || 0} {currency}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Products */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                    <h3 className="font-bold tracking-tight">Top Performance Produits</h3>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4 py-1 bg-muted rounded-full">Derniers {days} jours</span>
                </div>
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-muted-foreground uppercase bg-muted/30 font-bold tracking-widest whitespace-nowrap">
                            <tr>
                                <th className="px-6 py-4">Produit Principal</th>
                                <th className="px-6 py-4">Catégorie</th>
                                <th className="px-6 py-4 text-center">Volume</th>
                                <th className="px-6 py-4 text-right">CA Total</th>
                                {isStaff && <th className="px-6 py-4 text-right text-primary">Profit Net Est.</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {topProducts.map((produit) => (
                                <tr key={produit.id} className="group hover:bg-muted/10 transition-all duration-300">
                                    <td className="px-6 py-4 font-bold flex items-center gap-4">
                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-secondary shadow-sm group-hover:scale-110 transition-transform">
                                            <img src={getImageUrl(produit.image)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <span className="line-clamp-1">{produit.name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-0.5 bg-secondary/50 rounded-full text-[10px] font-bold uppercase tracking-tight">{produit.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-lg text-muted-foreground">{produit.sales}</td>
                                    <td className="px-6 py-4 text-right font-bold">{produit.revenue.toLocaleString()} {currency}</td>
                                    {isStaff && (
                                        <td className="px-6 py-4 text-right">
                                            <span className="px-3 py-1 bg-primary/10 text-primary font-bold rounded-lg border border-primary/20 whitespace-nowrap">
                                                {produit.profit?.toLocaleString() || 0} {currency}
                                            </span>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
