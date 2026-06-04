import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ChevronLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { getImageUrl } from "@/lib/image-utils";
import { useSettings } from "@/context/SettingsContext";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/api/products";
import ProductCard from "@/components/ProductCard";

const QuantityInput = ({
    value,
    onChange
}: {
    value: number,
    onChange: (val: number) => void
}) => {
    const [localValue, setLocalValue] = useState(value.toString());

    // Update local value if prop changes (e.g. from buttons)
    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);

        const num = parseInt(val);
        if (!isNaN(num) && num >= 1) {
            onChange(num);
        }
    };

    const handleBlur = () => {
        const num = parseInt(localValue);
        if (isNaN(num) || num < 1) {
            setLocalValue("1");
            onChange(1);
        } else {
            setLocalValue(num.toString());
            onChange(num);
        }
    };

    return (
        <input
            type="number"
            min="1"
            value={localValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-6 lg:w-10 bg-transparent text-center text-[11px] lg:text-sm font-bold text-foreground  border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
    );
};

const CartPage = () => {
    const { state, removeItem, updateQuantity, getTotal } = useCart();
    const { currency, settings } = useSettings();
    const shippingText = settings?.cartShippingText || "Livraison incluse";

    const { data: allProducts = [] } = useQuery({
        queryKey: ['products', 'cart-suggestions'],
        queryFn: () => productsApi.getAll({ published: true }),
    });

    const suggestions = useMemo(() => {
        const cartIds = new Set(state.items.map(i => i.product.id));
        const cartCatIds = [...new Set(state.items.map(i => i.product.categoryId))];
        const available = allProducts.filter(p => !cartIds.has(p.id));
        const seedStr = state.items[0]?.product.id || 'seed';
        const seed = seedStr.charCodeAt(0) + seedStr.charCodeAt(seedStr.length - 1);
        const shuffled = [...available].sort((a, b) => {
            const ha = (a.id.charCodeAt(0) * seed + a.id.charCodeAt(a.id.length - 1)) % 997;
            const hb = (b.id.charCodeAt(0) * seed + b.id.charCodeAt(b.id.length - 1)) % 997;
            return ha - hb;
        });
        // Interleave cart-related and other-category products (full pool, no cap)
        const fromCart = shuffled.filter(p => cartCatIds.includes(p.categoryId));
        const fromOthers = shuffled.filter(p => !cartCatIds.includes(p.categoryId));
        const mixed: typeof available = [];
        for (let i = 0; i < Math.max(fromCart.length, fromOthers.length); i++) {
            if (fromCart[i]) mixed.push(fromCart[i]);
            if (fromOthers[i]) mixed.push(fromOthers[i]);
        }
        return mixed; // full pool
    }, [allProducts, state.items]);

    const [suggestionsVisible, setSuggestionsVisible] = useState(10);

    if (state.items.length === 0) {
        return (
            <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">
                {/* Custom Simple Header for Cart Page */}
                <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
                    <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
                        <button onClick={() => window.history.back()} className="p-2 -ml-2 text-gray-600 hover:text-black transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1 flex justify-center">
                            <h1 className="font-bold text-lg">Panier</h1>
                        </div>
                        <div className="w-10"></div>
                    </div>
                </header>
                <div className="container mx-auto px-4 pt-32 pb-12 flex-1 flex flex-col justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md mx-auto text-center"
                    >
                        <div className="w-24 h-24 bg-muted border border-border rounded-3xl flex items-center justify-center mx-auto mb-6 relative shadow-2xl">
                            <ShoppingBag className="w-12 h-12 text-primary" />
                            <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
                        </div>
                        <h1 className="font-display text-3xl font-bold text-foreground   tracking-tight mb-3">Votre panier est <span className="text-primary ">vide</span></h1>
                        <p className="text-muted-foreground font-medium mb-8 max-w-xs mx-auto text-sm">
                            Découvrez nos meilleurs produits et profitez de nos offres exceptionnelles !
                        </p>
                        <Link to="/products">
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold  tracking-widest h-12 rounded-xl shadow-[0_0_30px_rgba(235,68,50,0.3)]  px-8 gap-2 w-auto">
                                <ShoppingBag className="w-4 h-4" />
                                Découvrir le Catalogue
                            </Button>
                        </Link>
                    </motion.div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">
            {/* Custom Simple Header for Cart Page */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
                    <button onClick={() => window.history.back()} className="p-2 -ml-2 text-gray-600 hover:text-black transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 flex justify-center">
                        <h1 className="font-bold text-lg">Commandé En Toute Confiance</h1>
                    </div>
                    <div className="w-10 flex justify-end">
                        <ShieldCheck className="w-6 h-6 text-green-600" />
                    </div>
                </div>
            </header>
            <div className="max-w-7xl mx-auto px-5 sm:px-6 md:px-8 lg:px-8 pt-6 lg:pt-8 pb-8 flex-1 w-full">
                <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                    <div className="w-1.5 h-6 lg:w-2 lg:h-10 bg-primary rounded-full" />
                    <h1 className="font-display text-xl lg:text-4xl font-bold text-foreground   tracking-tight">Votre <span className="text-primary">Panier</span></h1>
                </div>

                <div className="grid xl:grid-cols-3 gap-8 lg:gap-12">
                    {/* Cart Items */}
                    <div className="xl:col-span-2 space-y-3 lg:space-y-6">
                        {state.items.map((item) => (
                            <motion.div
                                key={item.product.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="w-full bg-card backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-border group hover:border-primary/30 transition-all duration-300 shadow-lg overflow-hidden"
                            >
                                <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: 'auto 1fr' }}>
                                    {/* Product Image — fixed width, never shrinks */}
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg sm:rounded-xl overflow-hidden bg-muted border border-border group-hover:border-primary/50 transition-colors self-center">
                                        <img
                                            src={getImageUrl(item.product.image)}
                                            alt={item.product.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>

                                    {/* Product Info — takes remaining width, cannot overflow */}
                                    <div className="flex flex-col justify-between gap-2 min-w-0">

                                        {/* Row 1: Title + Delete */}
                                        <div className="flex items-start gap-2 min-w-0">
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate text-sm sm:text-base font-bold text-foreground   tracking-tight leading-tight font-display">{item.product.name}</p>
                                                <p className="truncate text-[10px] sm:text-xs font-bold text-muted-foreground   mt-0.5">
                                                    {item.product.category?.name || item.product.categoryId?.replace("-", " ") || "MATÉRIEL"}
                                                </p>
                                                {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {Object.entries(item.selectedVariants).map(([key, value]) => (
                                                            <span key={key} className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 rounded-full px-1.5 py-0.5">
                                                                {key}: {value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => removeItem(item.product.id)}
                                                className="text-zinc-500 hover:text-primary hover:bg-primary/10 border-border rounded-lg h-7 w-7 sm:h-8 sm:w-8 shrink-0 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        {/* Row 2: Quantity + Price */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-0 sm:gap-1 bg-background rounded-lg p-0.5 border border-border shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 sm:h-7 sm:w-7 text-foreground hover:bg-accent active:scale-95"
                                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus className="w-2.5 h-2.5" />
                                                </Button>
                                                <QuantityInput
                                                    value={item.quantity}
                                                    onChange={(val) => updateQuantity(item.product.id, val)}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 sm:h-7 sm:w-7 text-foreground hover:bg-accent active:scale-95"
                                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                >
                                                    <Plus className="w-2.5 h-2.5" />
                                                </Button>
                                            </div>

                                            <p className="text-base sm:text-lg font-bold text-primary  tracking-tight shrink-0">
                                                {(item.product.price * item.quantity).toLocaleString()} <span className="text-[9px] sm:text-xs not- text-muted-foreground">{currency}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Order Summary (Desktop/Tablet) */}
                    <div className="hidden md:block xl:col-span-1">
                        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 xl:sticky xl:top-24 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                            <h2 className="font-display text-xl lg:text-2xl font-bold text-foreground   tracking-tight mb-4 border-b border-border pb-3">{settings?.cartSummaryTitle || "Résumé de la Commande"}</h2>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                                    <span className="text-muted-foreground  ">{settings?.cartSubtotalText || "Sous-total"}</span>
                                    <span className="text-foreground">{getTotal().toLocaleString()} {currency}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                                    <span className="text-muted-foreground  ">{shippingText}</span>
                                    <span className="text-green-500   font-bold">✔</span>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex flex-col gap-1">
                                    <span className="font-display text-lg sm:text-xl font-bold text-foreground   tracking-tight leading-none">Total commande</span>
                                    <span className="text-3xl sm:text-4xl font-bold text-primary  tracking-tight leading-none">
                                        {(getTotal()).toLocaleString()} <span className="text-xs sm:text-sm not- font-bold">{currency}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Link to="/checkout" className="block w-full">
                                    <Button className="w-full h-12 sm:h-14  text-sm sm:text-base tracking-tight font-bold  bg-primary hover:bg-primary/90 text-primary-foreground">
                                        Finaliser la Commande
                                    </Button>
                                </Link>

                                <Link to="/products" className="block w-full">
                                    <Button variant="outline" className="w-full h-10 sm:h-12  text-xs sm:text-sm font-bold border-white/10 hover:bg-white/5  tracking-widest">
                                        Revenir au Magasin
                                    </Button>
                                </Link>
                            </div>

                            <div className="mt-6 space-y-3">
                                {[
                                    { text: "Paiement à la livraison", color: "bg-green-500" },
                                    { text: "Livraison Express 24-72h", color: "bg-primary" },
                                    { text: "Certification Qualité Mkarim", color: "bg-white" }
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div className={`w-2 h-2 ${row.color} rounded-full shadow-[0_0_15px_currentColor]`} />
                                        <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground  tracking-widest">{row.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Mobile Summary Bar */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border p-4 sm:p-6 md:p-8 pb-[env(safe-area-inset-bottom,1rem)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
                            <div className="flex flex-col">
                                <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-muted-foreground  tracking-widest leading-none mb-1.5 sm:mb-2 text-left">Total commande</span>
                                <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary  tracking-tight leading-none">{(getTotal()).toLocaleString()} <span className="text-[10px] sm:text-xs not- text-muted-foreground ml-0.5">{currency}</span></span>
                            </div>
                            <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-green-500   tracking-tight bg-green-500/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-green-500/20">{shippingText}</span>
                        </div>

                        <div className="flex flex-col gap-3 sm:gap-4">
                            <Link to="/checkout" className="block w-full">
                                <Button className="w-full h-12 sm:h-14  text-sm sm:text-base px-2 tracking-tight sm:tracking-normal font-bold  bg-primary hover:bg-primary/90 text-primary-foreground">
                                    FINALISER LA COMMANDE
                                </Button>
                            </Link>
                            <Link to="/products" className="block w-full">
                                <Button variant="ghost" className="w-full h-10 sm:h-12  text-[10px] sm:text-xs md:text-sm font-bold  tracking-widest" size="sm">
                                    REVENIR AU MAGASIN
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            {/* VOUS AIMEREZ AUSSI */}
            {suggestions.length > 0 && (
                <div className="mt-4 pb-8 max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 w-full">
                    <div className="flex items-center gap-4 mb-5">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border" />
                        <h2 className="font-bold whitespace-nowrap text-muted-foreground tracking-wide text-sm">
                            Vous aimerez aussi
                        </h2>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border" />
                    </div>
                    {/* Same grid as main storefront for consistent card size */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                        {suggestions.slice(0, suggestionsVisible).map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                    {suggestionsVisible < suggestions.length && (
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={() => setSuggestionsVisible(v => v + 10)}
                                className="px-8 py-2.5 rounded-full border border-border text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200 hover:shadow-sm active:scale-95"
                            >
                                Voir plus
                            </button>
                        </div>
                    )}
                </div>
            )}
            {/* Spacer for sticky mobile bottom bar */}
            <div className="h-48 md:h-0" />
            <Footer />
        </div>
    );
};

export default CartPage;

