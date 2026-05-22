import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart, Truck, ShieldCheck, CreditCard, ArrowLeft, Loader2,
  Star, ChevronRight, Check, Package, RefreshCw,
  Cpu, Zap, HardDrive, Tag, CircuitBoard, AppWindow, Monitor, LayoutGrid,
  Power, Box, Snowflake, Maximize, Activity, Wifi, Battery,
  Scale, Keyboard, MousePointer2, Target, Palette, Terminal, Layers
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { productsApi } from "@/api/products";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useMemo, useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { settingsApi } from "@/api/settings";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useSettings } from "@/context/SettingsContext";
import SEO from "@/components/SEO";
import { getImageUrl } from "@/lib/image-utils";
import { Clock } from "lucide-react";

/* ── Countdown hook (session-scoped: resets on page load) ── */
const useCountdown = (minutes = 18) => {
  const [secs, setSecs] = useState(minutes * 60);
  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return { m, s, expired: secs === 0 };
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currency } = useSettings();
  const [quantity, setQuantity] = useState(1);
  const { m: countdownM, s: countdownS, expired: countdownExpired } = useCountdown(18);

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id as string),
    enabled: !!id,
  });

  const { addItem } = useCart();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const storeAvailability = settings?.storeAvailability ?? true;

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll({ published: true }),
    enabled: !!product,
  });

  const [relatedVisible, setRelatedVisible] = useState(10);

  // Full interleaved pool (no cap — Voir plus handles pagination)
  const relatedProducts = useMemo(() => {
    if (!product || allProducts.length === 0) return [];
    const others = allProducts.filter((p) => p.id !== id);
    const seed = product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1);
    const seeded = [...others].sort((a, b) => {
      const ha = (a.id.charCodeAt(0) * seed + a.id.charCodeAt(a.id.length - 1)) % 997;
      const hb = (b.id.charCodeAt(0) * seed + b.id.charCodeAt(b.id.length - 1)) % 997;
      return ha - hb;
    });
    // Interleave same-category + other categories for variety
    const samecat = seeded.filter((p) => p.categoryId === product.categoryId);
    const othercats = seeded.filter((p) => p.categoryId !== product.categoryId);
    const mixed: typeof others = [];
    for (let i = 0; i < Math.max(samecat.length, othercats.length); i++) {
      if (samecat[i]) mixed.push(samecat[i]);
      if (othercats[i]) mixed.push(othercats[i]);
    }
    return mixed; // full pool
  }, [allProducts, product, id]);

  const discount = product?.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  // Fake social proof (deterministic from product id)
  const pseudoRandom = (str: string, offset = 0) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs((hash + offset) % 150) + 12;
  };

  const getSpecIcon = (key?: string) => {
    if (!key) return LayoutGrid;
    const k = key.toLowerCase();
    if (k.includes('cpu') || k.includes('processeur')) return Cpu;
    if (k.includes('gpu') || k.includes('graphique')) return Zap;
    if (k.includes('ram')) return CircuitBoard;
    if (k.includes('stockage') || k.includes('ssd') || k.includes('hdd')) return HardDrive;
    if (k.includes('marque')) return Tag;
    if (k.includes('carte_mere')) return CircuitBoard;
    if (k.includes('alimentation')) return Power;
    if (k.includes('boitier')) return Box;
    if (k.includes('refroidissement')) return Snowflake;
    if (k.includes('resolution')) return Maximize;
    if (k.includes('frequence') || k.includes('hz')) return RefreshCw;
    if (k.includes('connectivite') || k.includes('wifi')) return Wifi;
    if (k.includes('batterie')) return Battery;
    if (k.includes('poids')) return Scale;
    if (k.includes('clavier') || k.includes('switch')) return Keyboard;
    if (k.includes('dpi')) return MousePointer2;
    if (k.includes('capteur')) return Target;
    if (k.includes('rgb') || k.includes('eclairage')) return Palette;
    if (k.includes('polling')) return Activity;
    if (k.includes('garantie')) return ShieldCheck;
    if (k.includes('os') || k.includes('windows')) return Terminal;
    if (k.includes('ecran') || k.includes('display')) return Monitor;
    return LayoutGrid;
  };

  if (isProductLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
          <h1 className="text-xl font-bold">Produit introuvable</h1>
          <Link to="/"><Button>Retour à l'accueil</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast({ title: "Ajouté au panier", description: `${quantity}x ${product.name}` });
  };

  const handleOrderNow = () => {
    addItem(product, quantity);
    navigate("/cart");
  };

  const soldCount = (product as any).salesCount ?? pseudoRandom(product.id);

  const specLabels: Record<string, string> = {
    'cpu': 'Processeur', 'gpu': 'Graphique', 'ram': 'Mémoire', 'stockage': 'Stockage',
    'marque': 'Marque', 'marque_pc': 'Modèle', 'ecran': 'Écran', 'os': 'Système',
    'carte_mere': 'Carte Mère', 'alimentation': 'Alimentation', 'boitier': 'Boîtier',
    'refroidissement': 'Cooling', 'resolution': 'Résolution', 'frequence': 'Fréquence',
    'connectivite': 'Connexion', 'batterie': 'Batterie', 'poids': 'Poids', 'chipset': 'Chipset',
    'format': 'Format', 'switch': 'Switch', 'dpi': 'Sensibilité', 'capteur': 'Capteur',
    'eclairage': 'RGB', 'polling_rate': 'Polling', 'garantie': 'Garantie'
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEO
        title={product.name}
        description={`${product.name} - ${product.description?.slice(0, 150)}...`}
        ogImage={getImageUrl(product.image)}
      />
      <Navbar />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
          <ChevronRight className="w-3 h-3" />
          {product.category && (
            <>
              <Link to={`/?category=${product.categoryId}`} className="hover:text-primary transition-colors">
                {product.category.name}
              </Link>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        {/* ── MAIN PRODUCT SECTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-6 lg:gap-8 items-stretch">

          {/* LEFT: Images */}
          <div className="bg-card border border-border rounded-2xl p-3 h-full">
            <ProductImageGallery
              images={product.images && product.images.length > 0 ? product.images : [product.image]}
              productName={product.name}
              badge={product.badge}
            />
          </div>

          {/* RIGHT: Unified info panel */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

            {/* ── Section 1: Title + social proof ── */}
            <div className="p-5 pb-4">
              {product.badge && (
                <span className="inline-block bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-3 border border-primary/20">
                  {product.badge}
                </span>
              )}
              <h1 className="text-xl font-bold text-foreground leading-snug mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  <Star className="w-4 h-4 fill-yellow-400/40 text-yellow-400" />
                </div>
                {soldCount > 0 && (
                  <span className="text-xs text-muted-foreground font-medium">{soldCount.toLocaleString()}+ vendus</span>
                )}
              </div>
            </div>

            <div className="h-px bg-border mx-5" />

            {/* ── Section 2: Price ── */}
            <div className="p-5 pb-4">
              <div className="flex items-end gap-3 flex-wrap mb-2">
                <span className="text-4xl font-extrabold text-primary tracking-tight">
                  {product.price.toLocaleString()}
                  <span className="text-lg font-bold ml-1">{currency}</span>
                </span>
                {product.originalPrice && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground line-through">
                      {product.originalPrice.toLocaleString()} {currency}
                    </span>
                    {discount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                        -{discount}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Savings callout */}
              {discount > 0 && product.originalPrice && (
                <div className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800 mb-3">
                  <Check className="w-3.5 h-3.5" />
                  Vous économisez {(product.originalPrice - product.price).toLocaleString()} {currency}
                </div>
              )}

              {/* Countdown timer — shown only for discounted products */}
              {discount > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 font-semibold text-orange-600 dark:text-orange-400">
                      <Clock className="w-3.5 h-3.5" />
                      {countdownExpired ? "Offre expirée" : "Offre se termine dans"}
                    </span>
                    {!countdownExpired && (
                      <span className="font-mono font-bold text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800">
                        {countdownM}:{countdownS}
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-1000"
                      style={{
                        width: `${((parseInt(countdownM) * 60 + parseInt(countdownS)) / (18 * 60)) * 100}%`,
                        background: countdownExpired
                          ? '#ef4444'
                          : 'linear-gradient(90deg, #f97316, #ef4444)'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Urgency bar */}
              {product.quantity > 0 && product.quantity < 10 && (
                <div className="mt-2 mb-1">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${(product.quantity / 10) * 100}%` }} />
                  </div>
                  <p className="text-xs text-red-500 font-bold mt-1">🔥 Plus que {product.quantity} en stock !</p>
                </div>
              )}

              {/* Delivery */}
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-semibold mt-2">
                <Truck className="w-4 h-4 shrink-0" />
                Livraison gratuite · Livraison rapide Maroc
              </div>
            </div>

            <div className="h-px bg-border mx-5" />

            {/* ── Section 3: Quantity + CTA ── */}
            <div className="p-5 flex flex-col gap-4">
              {!storeAvailability ? (
                <div className="p-4 bg-muted rounded-xl text-center text-sm font-semibold text-muted-foreground">
                  Boutique temporairement indisponible
                </div>
              ) : (
                <>
                  {/* Quantity selector */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Quantité</span>
                    <div className="flex items-center gap-0 rounded-xl border border-border overflow-hidden bg-muted/40">
                      <button
                        className="w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold text-foreground disabled:opacity-40"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={!product.inStock || quantity <= 1}
                      >−</button>
                      <span className="w-12 h-10 flex items-center justify-center text-sm font-bold border-x border-border bg-card">
                        {quantity}
                      </span>
                      <button
                        className="w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold text-foreground disabled:opacity-40"
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={!product.inStock}
                      >+</button>
                    </div>
                  </div>

                  {/* CTA buttons */}
                  <button
                    onClick={handleOrderNow}
                    disabled={!product.inStock}
                    className="w-full h-13 py-3.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" /> Commander maintenant
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    className="w-full h-13 py-3.5 bg-background hover:bg-muted disabled:opacity-50 text-foreground font-semibold rounded-xl text-sm border border-border transition-colors flex items-center justify-center gap-2"
                  >
                    Ajouter au panier
                  </button>

                  {/* Stock status pill */}
                  <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold ${product.inStock ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {product.inStock
                      ? <><span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" /> En stock · Prêt à expédier</>
                      : <><Package className="w-3.5 h-3.5" /> En rupture de stock</>
                    }
                  </div>
                </>
              )}
            </div>

            {/* ── Section 4: Trust badges ── */}
            <div className="border-t border-border bg-muted/30 grid grid-cols-3 divide-x divide-border text-center">
              {[
                { icon: Truck, title: "Livraison rapide", sub: "24-72h Maroc" },
                { icon: ShieldCheck, title: "Garanti", sub: "Produit certifié" },
                { icon: CreditCard, title: "Paiement", sub: "À la livraison" },
              ].map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-1 py-3 px-2">
                  <b.icon className="w-5 h-5 text-primary mb-0.5" />
                  <span className="text-[11px] font-bold leading-tight text-foreground">{b.title}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{b.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── DESCRIPTION + SPECS ── same column widths as the product grid above */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-6 lg:gap-8">
          {/* Description */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold text-base mb-4 flex items-center gap-2.5">
              <span className="w-1 h-5 bg-primary rounded-full inline-block shrink-0"></span>
              Description du produit
            </h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              {product.description?.split(/;|\n/).map((line, i) => {
                const t = line.trim();
                return t ? <p key={i}>{t}</p> : null;
              })}
            </div>
          </div>

          {/* Specs */}
          {product.specs && product.specs.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold text-base mb-4 flex items-center gap-2.5">
                <span className="w-1 h-5 bg-primary rounded-full inline-block shrink-0"></span>
                Spécifications techniques
              </h2>
              <div className="divide-y divide-border">
                {product.specs.map((spec, i) => {
                  const match = spec.match(/^\{([^}]+)\}:\s*(.+)$/);
                  const key = match ? match[1] : undefined;
                  const value = match ? match[2] : spec;
                  const Icon = getSpecIcon(key);
                  const label = key ? (specLabels[key.toLowerCase()] || key) : 'Général';
                  return (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                      <span className="text-sm font-semibold text-foreground flex-1">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RELATED PRODUCTS ── */}
        {relatedProducts.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border" />
              <h2 className="font-bold text-base whitespace-nowrap text-muted-foreground tracking-wide text-sm">
                Vous aimerez aussi
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {relatedProducts.slice(0, relatedVisible).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {relatedVisible < relatedProducts.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setRelatedVisible(v => v + 10)}
                  className="px-8 py-2.5 rounded-full border border-border text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all duration-200 hover:shadow-sm active:scale-95"
                >
                  Voir plus
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;

