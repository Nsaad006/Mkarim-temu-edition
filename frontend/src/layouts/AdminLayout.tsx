import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    ShoppingBag,
    Package,
    Users,
    BarChart3,
    Settings,
    Menu,
    X,
    LogOut,
    MapPin,
    FolderOpen,
    ShieldCheck,
    Mail,
    Search,
    Truck,
    Briefcase,
    BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authApi } from "@/api/auth";

import { PERMISSIONS } from "@/constants/permissions";

const sidebarItems = [
    { icon: LayoutDashboard, label: "Tableau de bord", path: "/admin", roles: ["super_admin", "editor", "viewer"], permission: PERMISSIONS.ANALYTICS_VIEW },
    { icon: ShoppingBag, label: "Commandes", path: "/admin/orders", roles: ["super_admin", "editor", "viewer", "commercial", "magasinier"], permission: PERMISSIONS.ORDERS_VIEW },
    { icon: Briefcase, label: "Grossistes", path: "/admin/wholesalers", roles: ["super_admin", "editor"], permission: PERMISSIONS.LOGISTICS_VIEW },
    { icon: Package, label: "Produits", path: "/admin/products", roles: ["super_admin", "editor", "viewer"], permission: PERMISSIONS.PRODUCTS_VIEW },
    { icon: Truck, label: "Fournisseurs", path: "/admin/suppliers", roles: ["super_admin", "editor"], permission: PERMISSIONS.LOGISTICS_VIEW },
    { icon: Package, label: "Approvisionnements", path: "/admin/procurements", roles: ["super_admin", "editor"], permission: PERMISSIONS.LOGISTICS_VIEW },
    { icon: FolderOpen, label: "Catégories", path: "/admin/categories", roles: ["super_admin", "editor", "viewer"], permission: PERMISSIONS.CATEGORIES_VIEW },
    { icon: MapPin, label: "Livraison", path: "/admin/cities", roles: ["super_admin", "editor", "viewer"], permission: PERMISSIONS.LOGISTICS_VIEW },
    { icon: Users, label: "Clients", path: "/admin/customers", roles: ["super_admin", "editor", "viewer"], permission: PERMISSIONS.CUSTOMERS_VIEW },
    { icon: Mail, label: "Messages", path: "/admin/messages", roles: ["super_admin", "editor", "viewer"], permission: PERMISSIONS.MESSAGES_VIEW },
    { icon: BarChart3, label: "Analyses", path: "/admin/analytics", roles: ["super_admin", "editor", "viewer"], permission: PERMISSIONS.ANALYTICS_VIEW },
    { icon: ShieldCheck, label: "Utilisateurs", path: "/admin/users", roles: ["super_admin"], permission: PERMISSIONS.USERS_VIEW },
    { icon: ShieldCheck, label: "Rôles", path: "/admin/roles", roles: ["super_admin"], permission: PERMISSIONS.ROLES_VIEW },
    { icon: Settings, label: "Paramètres", path: "/admin/settings", roles: ["super_admin"], permission: PERMISSIONS.SETTINGS_VIEW },
];

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [searchQuery, setSearchQuery] = useState("");
    const location = useLocation();
    const navigate = useNavigate();

    // Auto-close sidebar on route change for mobile
    useEffect(() => {
        if (window.innerWidth < 1024 && isSidebarOpen) {
            setIsSidebarOpen(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Get current user from localStorage
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : { name: "Admin", role: "super_admin", permissions: [] };

    const handleLogout = () => {
        authApi.logout();
        navigate("/login");
    };

    const filteredSidebarItems = sidebarItems.filter(item => {
        // Legacy Role Match
        if (item.roles.includes(user.role)) return true;
        // Permission Match
        if (item.permission && user.permissions?.includes(item.permission)) return true;
        return false;
    });

    return (
        <div className="min-h-screen bg-gaming-admin flex">
            {/* Background Glow Elements */}
            <div className="gaming-glow-top" />
            <div className="gaming-glow-bottom" />
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    } lg:translate-x-0 flex flex-col`}
            >
                <div className="h-16 flex items-center px-6 border-b border-border flex-shrink-0">
                    <Link to="/admin" className="font-display font-bold text-xl">
                        MKARIM <span className="text-primary">ADMIN</span>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {filteredSidebarItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.path} to={item.path}>
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`w-full justify-start gap-3 text-sm font-medium h-9 mb-1 ${isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"}`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        );
                    })}
                </div>

                <div className="p-3 border-t border-border flex-shrink-0">
                    <Button
                        variant="outline"
                        className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
                {/* Header */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden"
                        >
                            <Menu className="w-5 h-5" />
                        </Button>

                        {/* Global Search Bar */}
                        <div className="relative hidden md:block w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Recherche globale (Commandes, Produits...)"
                                className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                                {user.role.replace('_', ' ')}
                            </p>
                        </div>
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="https://github.com/shadcn.png" />
                            <AvatarFallback>AD</AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 relative z-10">
                    <Outlet context={{ searchQuery }} />
                </main>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;
