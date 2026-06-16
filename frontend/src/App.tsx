import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";

// ─── Eagerly loaded pages (critical path - visited most often) ───────────────
import Index from "./pages/Index";

// ─── Lazily loaded public pages (loaded on demand) ──────────────────────────
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const PromoPage = lazy(() => import("./pages/PromoPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));

// ─── Lazily loaded admin pages (never needed by regular users) ───────────────
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const Products = lazy(() => import("./pages/admin/Products"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const Cities = lazy(() => import("./pages/admin/Cities"));
const Customers = lazy(() => import("./pages/admin/Customers"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const Roles = lazy(() => import("./pages/admin/Roles"));
const Messages = lazy(() => import("./pages/admin/Messages"));
const Suppliers = lazy(() => import("./pages/admin/Suppliers"));
const Procurements = lazy(() => import("./pages/admin/Procurements"));
const Wholesalers = lazy(() => import("./pages/admin/Wholesalers"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));

// ─── Loading fallback ────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
      <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute - reduces redundant API calls
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SettingsProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/products" element={<Navigate to="/" replace />} />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-success" element={<OrderSuccess />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/promo/:id" element={<PromoPage />} />
                  <Route path="/login" element={<Login />} />

                  {/* Admin Routes (Protected + Lazy) */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="orders" element={<Orders />} />
                      <Route path="products" element={<Products />} />
                      <Route path="categories" element={<Categories />} />
                      <Route path="cities" element={<Cities />} />
                      <Route path="customers" element={<Customers />} />
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="roles" element={<Roles />} />
                      <Route path="messages" element={<Messages />} />
                      <Route path="suppliers" element={<Suppliers />} />
                      <Route path="procurements" element={<Procurements />} />
                      <Route path="wholesalers" element={<Wholesalers />} />
                      <Route path="logs" element={<ActivityLogs />} />
                      <Route path="*" element={<Dashboard />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
      </SettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
