import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedRoute = () => {
    const token = localStorage.getItem("auth_token");
    const isAuthenticated = !!token;
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Get user role
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const userRole = user?.role;

    // Redirect commercial and magasinier to orders page if they try to access other admin pages
    if (userRole === 'commercial' || userRole === 'magasinier') {
        // Allow access only to /admin/orders and its subpaths
        if (location.pathname !== '/admin/orders' && !location.pathname.startsWith('/admin/orders/') && location.pathname.startsWith('/admin')) {
            return <Navigate to="/admin/orders" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
