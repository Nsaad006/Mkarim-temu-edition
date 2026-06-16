import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, Trash2, Activity, User, LogIn, LogOut, Package, ShoppingBag, FolderOpen, UserPlus, UserMinus, Settings, RotateCcw, Layers, Building2, Truck, MapPin, Shield, Key, UserCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import apiClient from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

const ACTION_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  // Auth
  ADMIN_LOGIN:                  { label: "Connexion",                icon: LogIn,       color: "text-green-600" },
  ADMIN_LOGOUT:                 { label: "Déconnexion",              icon: LogOut,      color: "text-red-500" },
  // Orders
  ORDER_CONFIRMED:              { label: "Commande confirmée",       icon: Package,     color: "text-green-600" },
  ORDER_SHIPPED:                { label: "Commande expédiée",        icon: Package,     color: "text-blue-500" },
  ORDER_DELIVERED:              { label: "Commande livrée",          icon: Package,     color: "text-green-700" },
  ORDER_CANCELLED:              { label: "Commande annulée",         icon: Package,     color: "text-red-500" },
  ORDER_PENDING:                { label: "Commande en attente",      icon: Package,     color: "text-yellow-600" },
  ORDER_EDITED:                 { label: "Commande modifiée",        icon: Package,     color: "text-yellow-600" },
  ORDER_DELETED:                { label: "Commande supprimée",       icon: Package,     color: "text-red-500" },
  ORDER_RETURN:                 { label: "Retour commande",          icon: RotateCcw,   color: "text-orange-500" },
  // Products
  PRODUCT_CREATED:              { label: "Produit créé",             icon: ShoppingBag, color: "text-green-600" },
  PRODUCT_UPDATED:              { label: "Produit modifié",          icon: ShoppingBag, color: "text-yellow-600" },
  PRODUCT_DELETED:              { label: "Produit supprimé",         icon: ShoppingBag, color: "text-red-500" },
  PRODUCT_BULK_DELETED:         { label: "Suppression en masse",     icon: Layers,      color: "text-red-600" },
  PRODUCT_RESTORED:             { label: "Produit restauré",         icon: RotateCcw,   color: "text-green-500" },
  PRODUCT_RESTOCKED:            { label: "Réapprovisionnement",      icon: ShoppingBag, color: "text-blue-400" },
  // Categories
  CATEGORY_CREATED:             { label: "Catégorie créée",          icon: FolderOpen,  color: "text-green-600" },
  CATEGORY_UPDATED:             { label: "Catégorie modifiée",       icon: FolderOpen,  color: "text-yellow-600" },
  CATEGORY_DELETED:             { label: "Catégorie supprimée",      icon: FolderOpen,  color: "text-red-500" },
  // Admin users
  ADMIN_USER_CREATED:           { label: "Utilisateur ajouté",       icon: UserPlus,    color: "text-green-600" },
  ADMIN_USER_DELETED:           { label: "Utilisateur supprimé",     icon: UserMinus,   color: "text-red-500" },
  ADMIN_USER_STATUS_CHANGED:    { label: "Statut utilisateur",       icon: UserCheck,   color: "text-blue-500" },
  ADMIN_USER_ROLE_CHANGED:      { label: "Rôle utilisateur",         icon: Shield,      color: "text-purple-500" },
  ADMIN_USER_PASSWORD_CHANGED:  { label: "Mot de passe changé",      icon: Key,         color: "text-orange-500" },
  // Wholesalers
  WHOLESALER_CREATED:           { label: "Grossiste créé",           icon: Building2,   color: "text-green-600" },
  WHOLESALER_UPDATED:           { label: "Grossiste modifié",        icon: Building2,   color: "text-yellow-600" },
  WHOLESALER_DELETED:           { label: "Grossiste supprimé",       icon: Building2,   color: "text-red-500" },
  WHOLESALE_ORDER_CREATED:      { label: "Commande grossiste",       icon: Package,     color: "text-green-600" },
  WHOLESALE_ORDER_UPDATED:      { label: "Cmd grossiste modifiée",   icon: Package,     color: "text-yellow-600" },
  WHOLESALE_ORDER_CANCELLED:    { label: "Cmd grossiste annulée",    icon: Package,     color: "text-red-500" },
  WHOLESALE_PAYMENT_ADDED:      { label: "Paiement grossiste",       icon: Building2,   color: "text-blue-500" },
  // Suppliers
  SUPPLIER_CREATED:             { label: "Fournisseur créé",         icon: Truck,       color: "text-green-600" },
  SUPPLIER_UPDATED:             { label: "Fournisseur modifié",      icon: Truck,       color: "text-yellow-600" },
  SUPPLIER_DELETED:             { label: "Fournisseur supprimé",     icon: Truck,       color: "text-red-500" },
  // Procurements
  PROCUREMENT_CREATED:          { label: "Approvisionnement",        icon: Truck,       color: "text-blue-500" },
  // Cities
  CITY_CREATED:                 { label: "Ville créée",              icon: MapPin,      color: "text-green-600" },
  CITY_UPDATED:                 { label: "Ville modifiée",           icon: MapPin,      color: "text-yellow-600" },
  CITY_DELETED:                 { label: "Ville supprimée",          icon: MapPin,      color: "text-red-500" },
  // Roles
  ROLE_CREATED:                 { label: "Rôle créé",                icon: Shield,      color: "text-green-600" },
  ROLE_UPDATED:                 { label: "Rôle modifié",             icon: Shield,      color: "text-yellow-600" },
  ROLE_DELETED:                 { label: "Rôle supprimé",            icon: Shield,      color: "text-red-500" },
  // Settings
  SETTINGS_UPDATED:             { label: "Paramètres modifiés",      icon: Settings,    color: "text-primary" },
};

const fetchLogs = async (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString();
  const { data } = await apiClient.get(`/api/logs?${qs}`);
  return data;
};

const ActivityLogs = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  // One-time migrations on mount (fire-and-forget)
  useEffect(() => {
    apiClient.post("/api/logs/migrate-order-actions").catch(() => {});
    apiClient.post("/api/logs/migrate-order-numbers").catch(() => {});
  }, []);
  const [actionFilter, setActionFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<"cleanup" | "all" | null>(null);

  const queryParams: Record<string, string> = {
    page: String(page),
    limit: "50",
  };
  if (actionFilter && actionFilter !== "all") queryParams.action = actionFilter;
  if (emailFilter) queryParams.userEmail = emailFilter;
  if (searchFilter) queryParams.search = searchFilter;
  if (dateFrom) queryParams.from = dateFrom;
  if (dateTo) queryParams.to = dateTo;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["activity-logs", queryParams],
    queryFn: () => fetchLogs(queryParams),
    refetchInterval: 3000,
  });

  const logs: any[] = data?.logs || [];
  const total: number = data?.total || 0;
  const pages: number = data?.pages || 1;

  const cleanupMutation = useMutation({
    mutationFn: () => apiClient.delete("/api/logs/cleanup"),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setDeleteDialog(null);
      toast({ title: "Nettoyage effectué", description: `${res.data.deleted} log(s) supprimé(s).` });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de nettoyer les logs.", variant: "destructive" }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => apiClient.delete("/api/logs/all"),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setDeleteDialog(null);
      toast({ title: "Logs supprimés", description: `${res.data.deleted} log(s) supprimé(s).` });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de supprimer les logs.", variant: "destructive" }),
  });

  const applyEmailFilter = () => {
    setEmailFilter(emailInput.trim());
    setPage(1);
  };

  const applySearch = () => {
    setSearchFilter(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setActionFilter("all");
    setEmailFilter("");
    setEmailInput("");
    setSearchInput("");
    setSearchFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Logs d'activité
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total.toLocaleString()} événements enregistrés</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
            onClick={() => setDeleteDialog("cleanup")}
          >
            <Trash2 className="w-4 h-4" /> Supprimer les logs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        {/* Free text search */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Recherche</label>
          <div className="flex gap-1">
            <Input
              className="h-8 text-xs w-52"
              placeholder="N° commande, produit..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
            />
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={applySearch}>
              <Search className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Action filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Action</label>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Toutes les actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Email filter */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Email / Utilisateur</label>
          <div className="flex gap-1">
            <Input
              className="h-8 text-xs w-44"
              placeholder="email@..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyEmailFilter()}
            />
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={applyEmailFilter}>
              <Search className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Date from */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Du</label>
          <Input type="datetime-local" className="h-8 text-xs w-44" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </div>

        {/* Date to */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Au</label>
          <Input type="datetime-local" className="h-8 text-xs w-44" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>

        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Effacer
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-44">Horodatage</TableHead>
              <TableHead className="text-xs w-44">Action</TableHead>
              <TableHead className="text-xs w-48">Utilisateur</TableHead>
              <TableHead className="text-xs">Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><div className="h-3 bg-muted rounded animate-pulse w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                  Aucun événement trouvé
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const meta = log.metadata || {};

                // Legacy logs stored action="ORDER_STATUS_CHANGED" with metadata.newStatus.
                // Resolve them to the specific action type so they display correctly.
                let resolvedAction = log.action;
                if (log.action === "ORDER_STATUS_CHANGED" && meta.newStatus) {
                  const mapped: Record<string, string> = {
                    CONFIRMED: "ORDER_CONFIRMED",
                    SHIPPED:   "ORDER_SHIPPED",
                    DELIVERED: "ORDER_DELIVERED",
                    CANCELLED: "ORDER_CANCELLED",
                    PENDING:   "ORDER_PENDING",
                  };
                  resolvedAction = mapped[meta.newStatus] || log.action;
                }

                const actionInfo = ACTION_LABELS[resolvedAction] || { label: resolvedAction, icon: Activity, color: "text-foreground" };
                const Icon = actionInfo.icon;

                // Prefer real orderNumber; fall back to short orderId for legacy entries
                const orderRef = meta.orderNumber || (meta.orderId ? `#${String(meta.orderId).slice(0, 8)}` : null);

                return (
                  <TableRow key={log.id} className="hover:bg-muted/30 text-xs">
                    <TableCell className="text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1.5 font-semibold ${actionInfo.color}`}>
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {actionInfo.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[180px]">
                          {log.userEmail || log.userId || <span className="text-muted-foreground italic">—</span>}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs">
                      <div className="truncate text-[11px] space-x-2">
                        {meta.productName && <span>📦 {meta.productName}</span>}
                        {meta.categoryName && <span>🗂 {meta.categoryName}</span>}
                        {orderRef && <span>🧾 {orderRef}</span>}
                        {meta.itemCount !== undefined && !orderRef && <span>{meta.itemCount} article(s)</span>}
                        {meta.count !== undefined && <span>{meta.count} élément(s)</span>}
                        {meta.newUserEmail && <span>👤 {meta.newUserEmail} ({meta.role})</span>}
                        {meta.permanent === true && <span className="text-red-500 font-semibold">définitif</span>}
                        {!meta.productName && !meta.categoryName && !orderRef && !meta.newUserEmail && !meta.count && (
                          <span className="italic opacity-40">{JSON.stringify(meta).replace(/[{}"]/g, '').slice(0, 80) || '—'}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} / {pages} — {total} total
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Suivant</Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialog !== null} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Supprimer les logs
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-3">
              <p>Choisissez une option de suppression :</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setDeleteDialog("cleanup")}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-colors text-sm ${
                    deleteDialog === "cleanup"
                      ? "border-orange-400 bg-orange-50 text-orange-800"
                      : "border-border hover:border-orange-300 hover:bg-orange-50/50"
                  }`}
                >
                  <div className="font-semibold">🧹 Nettoyer les anciens logs</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Supprime les logs de plus de 30 jours</div>
                </button>
                <button
                  onClick={() => setDeleteDialog("all")}
                  className={`text-left px-4 py-3 rounded-lg border-2 transition-colors text-sm ${
                    deleteDialog === "all"
                      ? "border-red-500 bg-red-50 text-red-800"
                      : "border-border hover:border-red-300 hover:bg-red-50/50"
                  }`}
                >
                  <div className="font-semibold">🗑️ Supprimer tous les logs</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Efface l'historique complet — irréversible</div>
                </button>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Annuler</Button>
            {deleteDialog === "cleanup" && (
              <Button
                variant="destructive"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={cleanupMutation.isPending}
                onClick={() => cleanupMutation.mutate()}
              >
                {cleanupMutation.isPending ? "Nettoyage..." : "Nettoyer"}
              </Button>
            )}
            {deleteDialog === "all" && (
              <Button
                variant="destructive"
                disabled={deleteAllMutation.isPending}
                onClick={() => deleteAllMutation.mutate()}
              >
                {deleteAllMutation.isPending ? "Suppression..." : "Tout supprimer"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityLogs;
