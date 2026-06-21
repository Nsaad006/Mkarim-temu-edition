import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart, Truck, ShieldCheck, CreditCard, ArrowLeft, Loader2,
  Star, ChevronRight, Check, Package, RefreshCw,
  Cpu, Zap, HardDrive, Tag, CircuitBoard, AppWindow, Monitor, LayoutGrid,
  Power, Box, Snowflake, Maximize, Activity, Wifi, Battery,
  Scale, Keyboard, MousePointer2, Target, Palette, Terminal, Layers,
  Link2, Ruler, Droplets, Settings2, Globe, Wrench, Plug, Mic,
  Thermometer, Sun, Hash, Info, Gem, Shirt
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { productsApi } from "@/api/products";
import { promotionsApi } from "@/api/promotions";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import { useCart } from "@/context/CartContext";
import { settingsApi } from "@/api/settings";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { useSettings } from "@/context/SettingsContext";
import SEO from "@/components/SEO";
import { getImageUrl } from "@/lib/image-utils";
import { Clock } from "lucide-react";

/* ── Countdown hook ── */
const useCountdown = (productId: string, expiresAt?: string | null, createdAt?: string | null) => {
  const storageKey = `cdx_${productId}`;

  const secsUntil = (iso: string) =>
    Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));

  const [totalSecs, setTotalSecs] = useState<number>(() => {
    if (expiresAt) return secsUntil(expiresAt);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const remaining = Math.floor((parseInt(stored, 10) - Date.now()) / 1000);
        if (remaining > 0) return remaining;
        return 0;
      }
    } catch {}
    const days = 2 + Math.random() * 4;
    const expiryMs = Date.now() + days * 24 * 3600 * 1000;
    try { localStorage.setItem(storageKey, String(Math.round(expiryMs))); } catch {}
    return Math.round(days * 24 * 3600);
  });

  // Sync to real expiry when promotion data loads
  useEffect(() => {
    if (expiresAt) setTotalSecs(secsUntil(expiresAt));
  }, [expiresAt]);

  // Always-running tick
  useEffect(() => {
    const t = setInterval(() => setTotalSecs(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const maxSecs = expiresAt && createdAt
    ? Math.max(1, Math.floor((new Date(expiresAt).getTime() - new Date(createdAt).getTime()) / 1000))
    : 6 * 24 * 3600;

  const d = Math.floor(totalSecs / 86400);
  const h = String(Math.floor((totalSecs % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
  const s = String(totalSecs % 60).padStart(2, "0");
  return { d, h, m, s, expired: totalSecs === 0, totalSecs, maxSecs };
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currency } = useSettings();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [activeVariantImage, setActiveVariantImage] = useState<string | null>(null);

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

  const { data: publicPromotions = [] } = useQuery({
    queryKey: ['promotions-public'],
    queryFn: promotionsApi.getPublic,
    enabled: !!product,
  });

  const applicablePromotion = useMemo(() => {
    if (!product) return null;
    return publicPromotions.find(
      (p) => p.type === 'VOLUME_DISCOUNT' && (!p.productId || p.productId === product.id)
    ) || null;
  }, [publicPromotions, product]);

  const countdown = useCountdown(
    id || 'default',
    applicablePromotion?.expiresAt ?? null,
    applicablePromotion?.createdAt ?? null,
  );

  const [relatedVisible, setRelatedVisible] = useState(10);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  // Infinite scroll for related products — placed AFTER relatedProducts to avoid TDZ error
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setRelatedVisible(v => v + 10);
      },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [relatedProducts.length]);

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

    // If key contains "~iconName" (admin-selected icon), resolve dynamically via LucideIcons
    if (key.includes('~')) {
      const iconName = key.split('~')[1]?.trim();
      if (iconName) {
        const found = Object.keys(LucideIcons).find(k => k.toLowerCase() === iconName.toLowerCase());
        if (found) return (LucideIcons as any)[found];
      }
    }

    const k = key.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents: é→e, ç→c, etc.
      .replace(/[_\s-]+/g, ' ');

    // Hardware components
    if (k.includes('cpu') || k.includes('processeur') || k.includes('processor')) return Cpu;
    if (k.includes('gpu') || k.includes('graphique') || k.includes('graphic')) return Monitor;
    if (k.includes('ram') || k.includes('memoire') || k.includes('memory')) return CircuitBoard;
    if (k.includes('stockage') || k.includes('ssd') || k.includes('hdd') || k.includes('storage') || k.includes('disque') || k.includes('capacite')) return HardDrive;
    if (k.includes('carte mere') || k.includes('motherboard')) return CircuitBoard;
    if (k.includes('alimentation') || k.includes('power supply') || k.includes('watt') || k.includes('puissance') || k.includes('tension') || k.includes('courant') || k.includes('voltage')) return Power;
    if (k.includes('boitier') || k.includes('case') || k.includes('chassis')) return Box;
    if (k.includes('refroidissement') || k.includes('cooling') || k.includes('ventilation') || k.includes('temperature') || k.includes('thermique')) return Snowflake;
    if (k.includes('thermometre')) return Thermometer;

    // Display
    if (k.includes('ecran') || k.includes('display') || k.includes('moniteur') || k.includes('panneau')) return Monitor;
    if (k.includes('resolution') || k.includes('pixel')) return Maximize;
    if (k.includes('luminosite') || k.includes('brightness') || k.includes('nits') || k.includes('lumiere')) return Sun;
    if (k.includes('contraste')) return Monitor;
    if (k.includes('frequence') || k.includes('hz') || k.includes('taux')) return RefreshCw;

    // Connectivity
    if (k.includes('wifi') || k.includes('wireless') || k.includes('sans fil')) return Wifi;
    if (k.includes('connectivite') || k.includes('connectivity') || k.includes('connexion') || k.includes('interface') || k.includes('port') || k.includes('usb') || k.includes('hdmi') || k.includes('bluetooth')) return Plug;
    if (k.includes('compatib') || k.includes('compatible')) return Link2;
    if (k.includes('protocole') || k.includes('norme') || k.includes('standard')) return Globe;

    // Power / Battery
    if (k.includes('batterie') || k.includes('battery') || k.includes('autonomie')) return Battery;

    // Peripherals
    if (k.includes('clavier') || k.includes('keyboard') || k.includes('switch')) return Keyboard;
    if (k.includes('souris') || k.includes('mouse') || k.includes('dpi') || k.includes('curseur')) return MousePointer2;
    if (k.includes('capteur') || k.includes('sensor')) return Target;
    if (k.includes('polling') || k.includes('latence') || k.includes('latency') || k.includes('vitesse') || k.includes('speed')) return Activity;
    if (k.includes('micro') || k.includes('microphone') || k.includes('voix')) return Mic;
    if (k.includes('audio') || k.includes('son') || k.includes('haut parleur') || k.includes('speaker') || k.includes('casque')) return Activity;

    // Appearance
    if (k.includes('couleur') || k.includes('color') || k.includes('rgb') || k.includes('eclairage') || k.includes('lumiere') || k.includes('teinte')) return Palette;
    if (k.includes('finition') || k.includes('texture') || k.includes('surface') || k.includes('brillant') || k.includes('mat') || k.includes('satin') || k.includes('lisse')) return Gem;
    if (k.includes('design') || k.includes('forme') || k.includes('style') || k.includes('aspect') || k.includes('look')) return Palette;
    if (k.includes('matiere') || k.includes('material') || k.includes('tissu') || k.includes('fabric') || k.includes('textile') || k.includes('cuir') || k.includes('plastique') || k.includes('aluminium') || k.includes('acier') || k.includes('metal')) return Layers;

    // Clothing / apparel
    if (k.includes('taille') || k.includes('size') || k.includes('pointure') || k.includes('tour de')) return Shirt;
    if (k.includes('coupe') || k.includes('fit') || k.includes('coton') || k.includes('cotton') || k.includes('polyester')) return Shirt;

    // Dimensions / measurements
    if (k.includes('dimension') || k.includes('longueur') || k.includes('largeur') || k.includes('hauteur') || k.includes('diametre') || k.includes('epaisseur') || k.includes('profondeur') || k.includes('format') || k.includes('mm') || k.includes('cm')) return Ruler;
    if (k.includes('poids') || k.includes('weight') || k.includes('gramme') || k.includes('kg')) return Scale;

    // General product info
    if (k.includes('marque') || k.includes('brand') || k.includes('fabricant') || k.includes('constructeur')) return Tag;
    if (k.includes('modele') || k.includes('model') || k.includes('reference') || k.includes('sku') || k.includes('ref')) return Hash;
    if (k.includes('garantie') || k.includes('warranty') || k.includes('assurance')) return ShieldCheck;
    if (k.includes('os') || k.includes('windows') || k.includes('linux') || k.includes('systeme')) return Terminal;
    if (k.includes('humidite') || k.includes('humidity') || k.includes('waterproof') || k.includes('etanche') || k.includes('resistant eau') || k.includes('splash')) return Droplets;
    if (k.includes('type') || k.includes('categorie') || k.includes('gamme') || k.includes('serie')) return Settings2;
    if (k.includes('quantite') || k.includes('quantity') || k.includes('nb') || k.includes('nombre') || k.includes('contenu')) return Package;
    if (k.includes('maintenance') || k.includes('entretien') || k.includes('reparation') || k.includes('outil')) return Wrench;
    if (k.includes('general') || k.includes('info') || k.includes('detail') || k.includes('description') || k.includes('autre')) return Info;

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

  const productVariants: { type: string; options: string[]; required: boolean; images?: Record<string, string> }[] = (product as any).variants || [];
  const missingRequiredVariants = productVariants.filter(v => v.required && !selectedVariants[v.type]);

  const handleAddToCart = () => {
    if (missingRequiredVariants.length > 0) {
      toast({ title: "Variante requise", description: `Veuillez choisir : ${missingRequiredVariants.map(v => v.type).join(', ')}`, variant: "destructive" });
      return;
    }
    addItem(product, quantity, Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined, activeVariantImage || undefined);
    toast({ title: "Ajouté au panier", description: `${quantity}x ${product.name}` });
  };

  const handleOrderNow = () => {
    if (missingRequiredVariants.length > 0) {
      toast({ title: "Variante requise", description: `Veuillez choisir : ${missingRequiredVariants.map(v => v.type).join(', ')}`, variant: "destructive" });
      return;
    }
    addItem(product, quantity, Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined, activeVariantImage || undefined);
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

          {/* LEFT: Images — reorder to show variant image first */}
          {(() => {
            const base = product.images && product.images.length > 0 ? product.images : [product.image];
            const galleryImages = activeVariantImage && !base.includes(activeVariantImage)
              ? [activeVariantImage, ...base]
              : activeVariantImage && base.includes(activeVariantImage)
                ? [activeVariantImage, ...base.filter(i => i !== activeVariantImage)]
                : base;
            return (
              <div className="bg-card border border-border rounded-2xl p-3 h-full">
                <ProductImageGallery
                  key={galleryImages[0]}
                  images={galleryImages}
                  productName={product.name}
                  badge={product.badge}
                />
              </div>
            );
          })()}

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

              {/* Volume discount banner */}
              {applicablePromotion && (
                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs font-semibold px-3 py-2 rounded-lg mb-3">
                  <Tag className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {applicablePromotion.name} — Achetez {applicablePromotion.minQuantity}+ unités et économisez{" "}
                    {applicablePromotion.discountType === "PERCENT"
                      ? `${applicablePromotion.discountValue}%`
                      : `${applicablePromotion.discountValue} ${currency}`}{" "}
                    par article
                  </span>
                </div>
              )}

              {/* Countdown timer — shown for discounted products or active promotions with expiry */}
              {(discount > 0 || (applicablePromotion && applicablePromotion.expiresAt)) && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 font-semibold text-orange-600 dark:text-orange-400">
                      <Clock className="w-3.5 h-3.5" />
                      {countdown.expired ? "Offre expirée" : "Offre se termine dans"}
                    </span>
                    {!countdown.expired && (
                      <span className="font-mono font-bold text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-800 flex items-center gap-1">
                        {countdown.d > 0 && <><span>{countdown.d}j</span><span className="opacity-40 mx-0.5">·</span></>}
                        <span>{countdown.h}:{countdown.m}:{countdown.s}</span>
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, (countdown.totalSecs / countdown.maxSecs) * 100)}%`,
                        background: countdown.expired
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
                  {/* Variant selectors */}
                  {productVariants.length > 0 && (
                    <div className="space-y-3">
                      {productVariants.map((variant) => {
                        const isColor = variant.type.toLowerCase().includes('couleur') || variant.type.toLowerCase().includes('color');
                        return (
                          <div key={variant.type}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">{variant.type}</span>
                              {selectedVariants[variant.type] && (
                                <span className="text-xs text-muted-foreground">— {selectedVariants[variant.type]}</span>
                              )}
                              {variant.required && !selectedVariants[variant.type] && (
                                <span className="text-[10px] text-red-500 font-semibold">* Requis</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {variant.options.map((opt) => {
                                const isSelected = selectedVariants[variant.type] === opt;
                                // Try to detect hex color in option like "Rouge|#FF0000" or just a named color
                                const colorMatch = opt.match(/^(.+)\|?(#[0-9a-fA-F]{3,6})$/);
                                const label = colorMatch ? colorMatch[1] : opt;
                                const hex = colorMatch ? colorMatch[2] : null;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                    setSelectedVariants({ ...selectedVariants, [variant.type]: opt });
                                    // Switch gallery image if this option has a linked image
                                    const img = variant.images?.[opt];
                                    setActiveVariantImage(img || null);
                                  }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                                      isSelected
                                        ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30'
                                        : 'border-border hover:border-primary/50 text-foreground'
                                    }`}
                                  >
                                    {isColor && hex && (
                                      <span className="w-4 h-4 rounded-full border border-border/50 shrink-0" style={{ background: hex }} />
                                    )}
                                    {isColor && !hex && (
                                      <span className="w-4 h-4 rounded-full border border-border/50 shrink-0" style={{ background: opt.toLowerCase() }} />
                                    )}
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {missingRequiredVariants.length > 0 && (
                        <p className="text-xs text-red-500">Veuillez sélectionner : {missingRequiredVariants.map(v => v.type).join(', ')}</p>
                      )}
                    </div>
                  )}

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
                    disabled={!product.inStock || missingRequiredVariants.length > 0}
                    className="w-full h-13 py-3.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" /> Commander maintenant
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock || missingRequiredVariants.length > 0}
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
                  const key = match ? match[1] : undefined;           // may contain "~iconName"
                  const baseKey = key ? key.split('~')[0] : undefined; // clean key without icon
                  const value = match ? match[2] : spec;
                  const Icon = getSpecIcon(key);
                  const label = baseKey ? (specLabels[baseKey.toLowerCase()] || baseKey) : 'Général';
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
            {/* Infinite scroll sentinel */}
            {relatedVisible < relatedProducts.length && (
              <div ref={sentinelRef} className="h-8 mt-4" />
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;

