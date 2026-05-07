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
import { useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { settingsApi } from "@/api/settings";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useSettings } from "@/context/SettingsContext";
import SEO from "@/components/SEO";
import { getImageUrl } from "@/lib/image-utils";

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currency } = useSettings();
  const [quantity, setQuantity] = useState(1);

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

  const soldCount = pseudoRandom(product.id);
  const reviewCount = pseudoRandom(product.id, 50) + 20;

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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 lg:gap-6">

          {/* LEFT: Images */}
          <div className="bg-card border border-border rounded-xl overflow-hidden p-2 md:p-4">
            <ProductImageGallery
              images={product.images && product.images.length > 0 ? product.images : [product.image]}
              productName={product.name}
              badge={product.badge}
            />
          </div>

          {/* RIGHT: Info panel */}
          <div className="flex flex-col gap-3">

            {/* Title & badges */}
            <div className="bg-card border border-border rounded-xl p-4">
              {product.badge && (
                <span className="inline-block bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded mb-2">
                  {product.badge}
                </span>
              )}
              <h1 className="text-base md:text-lg font-semibold text-foreground leading-snug mb-2">
                {product.name}
              </h1>

              {/* Social proof */}
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <div className="flex items-center gap-1 text-yellow-500">
                  {[1,2,3,4].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                  <Star className="w-3.5 h-3.5 fill-yellow-500/50 text-yellow-500" />
                  <span className="text-xs text-muted-foreground ml-1">{reviewCount} avis</span>
                </div>
                <span className="text-muted-foreground text-xs">{soldCount}K+ vendus</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold text-primary">
                  {product.price.toLocaleString()} <span className="text-base">{currency}</span>
                </span>
                {product.originalPrice && (
                  <span className="text-base text-muted-foreground line-through font-medium">
                    {product.originalPrice.toLocaleString()} {currency}
                  </span>
                )}
                {discount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                    -{discount}%
                  </span>
                )}
              </div>

              {/* Urgency */}
              {product.quantity > 0 && product.quantity < 10 && (
                <div className="mt-2">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${(product.quantity / 10) * 100}%` }} />
                  </div>
                  <p className="text-xs text-red-500 font-bold mt-1">🔥 Plus que {product.quantity} en stock !</p>
                </div>
              )}

              {/* Delivery promise */}
              <div className="mt-3 flex items-center gap-2 text-xs text-green-600 font-semibold">
                <Truck className="w-4 h-4" />
                Livraison gratuite · Livraison rapide Maroc
              </div>
            </div>

            {/* Quantity + CTA */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
              {!storeAvailability ? (
                <div className="p-4 bg-muted rounded-lg text-center text-sm font-semibold text-muted-foreground">
                  Boutique temporairement indisponible
                </div>
              ) : (
                <>
                  {/* Quantity */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Quantité :</span>
                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                      <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={!product.inStock || quantity <= 1}
                      >-</button>
                      <span className="w-10 h-8 flex items-center justify-center text-sm font-bold border-x border-border">
                        {quantity}
                      </span>
                      <button
                        className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors text-lg font-bold"
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={!product.inStock}
                      >+</button>
                    </div>
                  </div>

                  {/* Buttons */}
                  <button
                    onClick={handleOrderNow}
                    disabled={!product.inStock}
                    className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" /> Commander maintenant
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    className="w-full h-12 bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground font-bold rounded-full text-sm border border-border transition-colors flex items-center justify-center gap-2"
                  >
                    Ajouter au panier
                  </button>

                  {/* Stock status */}
                  <div className={`flex items-center gap-2 text-xs font-semibold ${product.inStock ? "text-green-600" : "text-red-500"}`}>
                    {product.inStock
                      ? <><Check className="w-4 h-4" /> En stock · Prêt à expédier</>
                      : <><Package className="w-4 h-4" /> En rupture de stock</>
                    }
                  </div>
                </>
              )}
            </div>

            {/* Trust badges */}
            <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: Truck, title: "Livraison rapide", sub: "24-72h Maroc" },
                { icon: ShieldCheck, title: "Garanti", sub: "Produit certifié" },
                { icon: CreditCard, title: "Paiement", sub: "À la livraison" },
              ].map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <b.icon className="w-5 h-5 text-primary" />
                  <span className="text-[11px] font-bold leading-tight">{b.title}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{b.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── DESCRIPTION + SPECS ── */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Description */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-bold text-base mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
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
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-bold text-base mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full inline-block"></span>
                Spécifications techniques
              </h2>
              <div className="space-y-2">
                {product.specs.map((spec, i) => {
                  const match = spec.match(/^\{([^}]+)\}:\s*(.+)$/);
                  const key = match ? match[1] : undefined;
                  const value = match ? match[2] : spec;
                  const Icon = getSpecIcon(key);
                  const label = key ? (specLabels[key.toLowerCase()] || key) : 'Général';
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                      <span className="text-sm font-medium text-foreground flex-1">{value}</span>
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

