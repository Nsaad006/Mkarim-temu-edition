import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PERMISSIONS } from "@/constants/permissions";

// Roles that have unrestricted access to all admin pages they have permissions for
const FULL_ADMIN_ROLES = ['super_admin', 'editor', 'viewer'];

// Permissions that indicate a broad admin (not just an agent/warehouse)
const BROAD_ADMIN_PERMISSIONS = [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
];

const ProtectedRoute = () => {
    const token = localStorage.getItem("auth_token");
    const isAuthenticated = !!token;
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const role: string = user?.role ?? '';
    const permissions: string[] = user?.permissions ?? [];

    // Full admins pass through — their page access is controlled by sidebar permissions
    if (FULL_ADMIN_ROLES.includes(role)) {
        return <Outlet />;
    }

    // Detect agent: has orders:confirm but none of the broad admin permissions
    // Covers both the legacy "commercial" role AND any custom role configured as an agent
    const isAgent = role === 'commercial' ||
        (permissions.includes(PERMISSIONS.ORDERS_CONFIRM) &&
         !BROAD_ADMIN_PERMISSIONS.some(p => permissions.includes(p)));

    // Detect warehouse: magasinier or has ship/deliver but no confirm
    const isWarehouse = role === 'magasinier' ||
        (!permissions.includes(PERMISSIONS.ORDERS_CONFIRM) &&
         (permissions.includes(PERMISSIONS.ORDERS_SHIP) ||
          permissions.includes(PERMISSIONS.ORDERS_DELIVER)));

    if (isAgent) {
        const allowedPaths = ['/admin/orders', '/admin/my-dashboard'];
        const isAllowed = allowedPaths.some(
            p => location.pathname === p || location.pathname.startsWith(p + '/')
        );
        if (!isAllowed && location.pathname.startsWith('/admin')) {
            return <Navigate to="/admin/my-dashboard" replace />;
        }
    }

    if (isWarehouse) {
        const allowedPaths = ['/admin/orders'];
        const isAllowed = allowedPaths.some(
            p => location.pathname === p || location.pathname.startsWith(p + '/')
        );
        if (!isAllowed && location.pathname.startsWith('/admin')) {
            return <Navigate to="/admin/orders" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
