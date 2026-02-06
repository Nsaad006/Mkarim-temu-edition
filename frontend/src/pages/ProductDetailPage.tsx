import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShoppingCart, Truck, ShieldCheck, CreditCard, ArrowLeft, Check, Loader2,
  Cpu, Zap, HardDrive, Tag, CircuitBoard, AppWindow, Monitor, LayoutGrid,
  Power, Box, Wind, Snowflake, Maximize, RefreshCw, Activity, Wifi, Battery,
  Scale, Keyboard, MousePointer2, Target, Palette, Terminal, Layers
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { productsApi } from "@/api/products";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useMemo } from "react";
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

  // Fetch current product
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

  // Fetch all products for matching related ones (simple approach)
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll(),
    enabled: !!product,
  });

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.id !== id && p.categoryId === product.categoryId)
      .slice(0, 4);
  }, [allProducts, product, id]);

  // Helper to get icon for spec key
  const getSpecIcon = (key?: string) => {
    if (!key) return LayoutGrid;
    const normalized = key.toLowerCase().trim();

    if (normalized.includes('cpu') || normalized.includes('processeur')) return Cpu;
    if (normalized.includes('gpu') || normalized.includes('graphique')) return Zap;
    if (normalized.includes('ram') || normalized.includes('memoire')) return CircuitBoard;
    if (normalized.includes('stockage') || normalized.includes('disque') || normalized.includes('ssd') || normalized.includes('hdd')) return HardDrive;
    if (normalized.includes('marque')) return Tag;
    if (normalized.includes('carte_mere') || normalized.includes('motherboard')) return CircuitBoard;
    if (normalized.includes('alimentation') || normalized.includes('psu')) return Power;
    if (normalized.includes('boitier') || normalized.includes('case')) return Box;
    if (normalized.includes('refroidissement') || normalized.includes('cooling')) return Snowflake;
    if (normalized.includes('resolution') || normalized.includes('affichage')) return Maximize;
    if (normalized.includes('frequence') || normalized.includes('rafraichissement') || normalized.includes('hz')) return RefreshCw;
    if (normalized.includes('connectivite') || normalized.includes('wifi') || normalized.includes('bluetooth')) return Wifi;
    if (normalized.includes('batterie') || normalized.includes('autonomie')) return Battery;
    if (normalized.includes('poids') || normalized.includes('weight')) return Scale;
    if (normalized.includes('chipset')) return Cpu;
    if (normalized.includes('format')) return Layers;
    if (normalized.includes('switch') || normalized.includes('clavier')) return Keyboard;
    if (normalized.includes('dpi') || normalized.includes('sensibilite')) return MousePointer2;
    if (normalized.includes('capteur') || normalized.includes('sensor')) return Target;
    if (normalized.includes('rgb') || normalized.includes('eclairage') || normalized.includes('couleur')) return Palette;
    if (normalized.includes('polling') || normalized.includes('rapport')) return Activity;
    if (normalized.includes('garantie') || normalized.includes('warranty')) return ShieldCheck;
    if (normalized.includes('systeme') || normalized.includes('os') || normalized.includes('windows')) return Terminal;
    if (normalized.includes('ecran') || normalized.includes('display')) return Monitor;

    return LayoutGrid;
  };

  if (isProductLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-32 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-xs">Initialisation du matériel...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-32 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="font-display text-4xl font-black text-foreground uppercase italic mb-6 tracking-tighter">Matériel <span className="text-primary">Introuvable</span></h1>
            <Link to="/products">
              <Button className="bg-primary text-primary-foreground font-black uppercase tracking-widest px-8 h-14 rounded-xl">Retour au Catalogue</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product);
  };

  const handleOrderNow = () => {
    navigate(`/checkout?product=${product.id}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      <SEO
        title={product.name}
        description={`${product.name} - ${product.description.slice(0, 150)}... Achetez au meilleur prix au Maroc.`}
        ogImage={getImageUrl(product.image)}
        keywords={`${product.name}, ${product.category?.name}, gaming maroc, pc gamer`}
      />
      <Navbar />
      <main className="pt-24 lg:pt-32">
        <div className="container-custom py-8 lg:py-16">
          {/* Breadcrumb */}
          <Link
            to="/products"
            className="inline-flex items-center gap-3 text-muted-foreground hover:text-foreground mb-10 transition-colors font-black uppercase tracking-[0.2em] text-[10px]"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            Retour au Catalogue
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Product Image Gallery */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <ProductImageGallery
                images={product.images && product.images.length > 0 ? product.images : [product.image]}
                productName={product.name}
                badge={product.badge}
              />
              {/* Decorative glow */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-10"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-muted border border-border text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4 skew-x-[-12deg]">
                  <span className="skew-x-[12deg]">{product.category?.name || product.categoryId.replace("-", " ")}</span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-foreground italic tracking-tighter leading-[0.9] mb-6 uppercase">
                  {product.name}
                </h1>
                <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-xl">
                  {product.description}
                </p>
              </div>

              {/* Price & Stock */}
              <div className="flex flex-wrap items-center gap-8 bg-card backdrop-blur-md p-8 rounded-3xl border border-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
                <div className="relative z-10">
                  <div className="flex flex-col gap-1 mb-2">
                    <span className="text-5xl lg:text-6xl font-black text-foreground italic tracking-tighter">
                      {product.price.toLocaleString()} <span className="text-primary text-2xl lg:text-3xl ml-1">{currency}</span>
                    </span>
                    {product.originalPrice && (
                      <span className="text-xl lg:text-2xl text-muted-foreground/40 line-through font-bold tracking-tighter italic ml-1">
                        {product.originalPrice.toLocaleString()} {currency}
                      </span>
                    )}
                  </div>
                  <div className={`mt-4 inline-flex items-center gap-2 font-black uppercase tracking-[0.2em] text-[10px] ${product.inStock ? "text-green-500" : "text-red-500"}`}>
                    <div className={`w-2 h-2 rounded-full ${product.inStock ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                    {product.inStock ? "UNITÉ PRÊTE POUR EXPÉDITION" : "EN RUPTURE"}
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                {!storeAvailability ? (
                  <div className="p-6 bg-primary/5 text-primary border border-primary/20 rounded-2xl text-center flex-1 font-black uppercase tracking-widest text-sm italic">
                    ACCÈS AUX LOGISTIQUES TEMPORAIREMENT SUSPENDU.
                  </div>
                ) : (
                  <>
                    <Button
                      size="xl"
                      className="w-full sm:flex-[1.5] shrink-0 italic tracking-tighter sm:tracking-normal px-2 text-sm sm:text-lg shadow-[0_4px_20px_rgba(235,68,50,0.25)]"
                      onClick={handleOrderNow}
                      disabled={!product.inStock}
                    >
                      COMMANDER
                    </Button>
                    <Button
                      variant="outline"
                      size="xl"
                      className="w-full sm:flex-1 shrink-0 px-2 text-sm sm:text-lg"
                      onClick={handleAddToCart}
                      disabled={!product.inStock}
                    >
                      <ShoppingCart />
                      PANIER
                    </Button>
                  </>
                )}
              </div>

              {/* Specs */}
              {product.specs && product.specs.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-2">SPECIFICATIONS TECHNIQUES</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.specs.map((spec, index) => {
                      // Parse the {key}: value format
                      const match = spec.match(/^\{([^}]+)\}:\s*(.+)$/);
                      const key = match ? match[1] : undefined;
                      const displayValue = match ? match[2] : spec;
                      const Icon = getSpecIcon(key);

                      // Human readable labels mapping
                      const labels: Record<string, string> = {
                        'cpu': 'Processeur',
                        'gpu': 'Graphique',
                        'ram': 'Mémoire',
                        'stockage': 'Stockage',
                        'marque': 'Marque',
                        'marque_pc': 'Modèle',
                        'ecran': 'Écran',
                        'os': 'Système',
                        'carte_mere': 'Carte Mère',
                        'alimentation': 'Alimentation',
                        'boitier': 'Boîtier',
                        'refroidissement': 'Cooling',
                        'resolution': 'Résolution',
                        'frequence': 'Fréquence',
                        'connectivite': 'Connexion',
                        'batterie': 'Batterie',
                        'poids': 'Poids',
                        'chipset': 'Chipset',
                        'format': 'Format',
                        'switch': 'Switch',
                        'dpi': 'Sensibilité',
                        'capteur': 'Capteur',
                        'eclairage': 'RGB',
                        'polling_rate': 'Polling',
                        'garantie': 'Garantie'
                      };

                      const label = key ? (labels[key.toLowerCase()] || key) : 'Général';

                      return (
                        <div key={index} className="flex items-center gap-4 bg-muted/40 border border-border p-4 rounded-xl group hover:border-primary/30 transition-all duration-300">
                          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border border-border shrink-0 group-hover:bg-primary/5 transition-colors">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none mb-1">
                              {label}
                            </span>
                            <span className="text-sm font-bold text-foreground uppercase tracking-tight truncate">
                              {displayValue}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-6 pt-10 border-t border-border">
                {[
                  { icon: Truck, label: "EXPRESS LOGISTICS", sub: "24-72H MAROC" },
                  { icon: ShieldCheck, label: "CERTIFIED GEAR", sub: "FULL WARRANTY" },
                  { icon: CreditCard, label: "SECURE COD", sub: "PAY ON RECEIPT" }
                ].map((badge, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-3">
                    <badge.icon className="w-6 h-6 text-primary" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-foreground tracking-[0.1em]">{badge.label}</p>
                      <p className="text-[8px] font-bold text-muted-foreground tracking-[0.05em]">{badge.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-32 pt-16 border-t border-border">
              <div className="flex items-center justify-between mb-12">
                <h2 className="font-display text-3xl md:text-5xl font-black text-foreground italic tracking-tighter uppercase">
                  UNITÉS <span className="text-primary">SIMILAIRES</span>
                </h2>
                <Link to="/products" className="text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-[0.2em] transition-colors border-b border-border hover:border-primary pb-1">
                  VOIR CATALOGUE COMPLET
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailPage;
