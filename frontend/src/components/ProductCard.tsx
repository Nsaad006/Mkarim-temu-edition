import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { toast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/image-utils";
import { useSettings } from "@/context/SettingsContext";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { currency } = useSettings();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
  };

  const [searchParams] = useSearchParams();

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
    
  const isPromo = searchParams.get("promo") === "true" && discount > 0;
  const isBestseller = searchParams.get("sort") === "bestseller";

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    navigate(`/product/${product.id}`);
  };

  const pseudoRandom = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 150) + 12;
  };

  const soldCount = pseudoRandom(product.id) * 350 + 2000; // Fake large numbers for bestseller

  if (isBestseller) {
    const isSuperBestseller = soldCount > 10000;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="group relative flex flex-col h-full bg-white dark:bg-card overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-105"
          />
        </div>

        <div className="pt-2 pb-3 px-1 flex flex-col flex-grow">
          {/* ÉCONOMIES and Title */}
          <div className="flex items-center gap-1.5 mb-1.5 overflow-hidden">
             {discount > 0 && (
               <div className="border border-[#e41c19] text-[#e41c19] flex items-center px-1 rounded-[3px] font-bold text-[8px] sm:text-[9px] shrink-0 whitespace-nowrap">
                 ÉCONOMIES
               </div>
             )}
             <div className="truncate text-[11px] sm:text-xs text-muted-foreground flex-1">
               {product.name}
             </div>
          </div>

          {/* Price & Sales & Cart */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-black text-[#e41c19] leading-none">{product.price.toLocaleString()} <span className="text-[9px] sm:text-[10px]">{currency}</span></span>
              {product.originalPrice && (
                <span className="text-[9px] sm:text-[10px] text-muted-foreground line-through ml-0.5">{product.originalPrice.toLocaleString()}</span>
              )}
              <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-1 flex items-center gap-0.5">
                <span className="text-orange-500">🔥</span>
                {soldCount.toLocaleString()}+ ventes
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); if (product.inStock) handleAddToCart(e); }}
              className="text-foreground border border-border w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* #1 ARTICLE MEILLEURE VENTE */}
          <div className="text-[#ff7a00] font-bold text-[9px] sm:text-[10px] mb-1">
            #{(pseudoRandom(product.id + "rank") % 5) + 1} ARTICLE MEILLEURE VENTE | 6 derniers jours
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground mb-1.5">
            <span className="text-black dark:text-white tracking-widest text-[9px]">★★★★★</span>
            <span>{pseudoRandom(product.id + "reviews") * 10 + 100}</span>
          </div>

          {/* Vendeur vedette */}
          {isSuperBestseller && (
            <div className="flex items-center gap-1">
               <div className="bg-[#6b31a3] text-white px-1.5 py-0.5 rounded-[3px] text-[8px] sm:text-[9px] font-bold flex items-center gap-1">
                 ★ Vendeur vedette
               </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (isPromo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="group relative flex flex-col h-full bg-white dark:bg-card border border-border overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl"
        onClick={handleCardClick}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-105"
          />
        </div>

        <div className="p-2 flex flex-col flex-grow">
          {/* Badges & Name */}
          <div className="flex items-center gap-1 mb-2">
             <div className="bg-[#e41c19] text-white flex items-center px-1.5 py-0.5 rounded-sm font-bold text-[9px] sm:text-[10px] shrink-0 whitespace-nowrap">
               <span className="mr-0.5 text-yellow-300">⚡</span>
               BON PLAN
             </div>
             <div className="bg-[#e41c19] text-white px-1.5 py-0.5 rounded-sm font-bold text-[9px] sm:text-[10px] shrink-0">
               -{discount}%
             </div>
             <div className="truncate text-[10px] sm:text-[11px] text-muted-foreground ml-1">
               {product.name}
             </div>
          </div>

          {/* Price Block */}
          <div className="bg-red-50 dark:bg-red-950/20 flex items-center justify-between p-2 rounded-lg mb-2 border border-red-100 dark:border-red-900/30">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-[#e41c19]">{product.price.toLocaleString()}</span>
              <span className="text-[9px] sm:text-[10px] text-[#e41c19] font-bold">{currency}</span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground line-through ml-0.5 sm:ml-1">{product.originalPrice?.toLocaleString()}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); if (product.inStock) handleAddToCart(e); }}
              className="bg-[#e41c19] text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shrink-0 shadow-md"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-1.5 mb-2">
             <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden relative">
               <div className="absolute left-0 top-0 bottom-0 bg-[#ff8100] rounded-full" style={{ width: `${Math.max(30, 100 - (soldCount % 50))}%` }} />
             </div>
             <div className="flex items-center gap-1 shrink-0 text-[#ff8100]">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
               <span className="text-[9px] sm:text-[10px] font-bold">Durée limitée</span>
             </div>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-muted-foreground mt-auto pt-1">
             <span>{soldCount}K+ ventes</span>
             <span className="text-border">|</span>
             <span className="flex items-center text-foreground font-bold">
               ★ 4.{(pseudoRandom(product.id + "rating") % 5) + 3} <span className="text-muted-foreground font-normal ml-0.5">({pseudoRandom(product.id + "rcount") * 10 + 100})</span>
             </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group relative flex flex-col h-full bg-card/40 border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(235,68,50,0.15)] hover:-translate-y-1 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={getImageUrl(product.image)}
          alt={product.name}
          width="400"
          height="400"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110 md:group-hover:rotate-1"
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Badges - Temu Style */}
        <div className="absolute top-2 left-0 flex flex-col gap-1 items-start z-10">
          {product.badge && (
            <div className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-r-md shadow-sm">
              <span className="inline-block tracking-wide">{product.badge}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-r-md shadow-sm">
              <span className="inline-block tracking-wider">-{discount}%</span>
            </div>
          )}
        </div>

        {/* Quick View Icon - Desktop Only */}
        <div className="absolute top-4 right-4 opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-x-2 md:group-hover:translate-x-0 hidden md:block">
          <div
            role="button"
            aria-label={`Aperçu rapide de ${product.name}`}
            className="w-10 h-10 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center border border-border hover:bg-primary hover:text-white transition-colors"
          >
            <Eye className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-2 md:p-2.5 flex flex-col flex-grow">
        <h3 className="font-sans text-[11px] md:text-[13px] font-medium text-foreground leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Temu Urgency & Social Proof */}
        <div className="flex flex-col gap-0.5 mb-1.5">
          {product.quantity > 0 && product.quantity < 10 && (
            <div className="w-full bg-secondary rounded-full h-1 mt-1 overflow-hidden">
              <div className="bg-red-500 h-1 rounded-full" style={{ width: `${(product.quantity / 10) * 100}%` }}></div>
            </div>
          )}
          <span className="text-[10px] font-bold text-red-500">
            {product.quantity > 0 && product.quantity < 10 ? `Presque épuisé ! Plus que ${product.quantity}` : "Livraison Gratuite"}
          </span>
          <span className="text-[9px] md:text-[10px] text-muted-foreground flex items-center gap-1">
            {soldCount}K+ vendus
          </span>
        </div>

        {/* Pricing */}
        <div className="flex flex-col gap-0 mb-2">
          <span className={`text-lg md:text-xl font-bold tracking-tight leading-none ${discount >= 50 ? 'text-red-600' : 'text-foreground'}`}>
            {product.price.toLocaleString()} <span className="text-[9px] md:text-[10px] ml-0.5">{currency}</span>
          </span>
          {product.originalPrice && (
            <span className="text-[9px] md:text-[10px] text-muted-foreground line-through font-medium">
              {product.originalPrice.toLocaleString()} {currency}
            </span>
          )}
        </div>

        {/* Actions - Integrated Side-by-Side */}
        <div className="flex items-center gap-1 mt-auto">
          <Button
            variant="outline"
            size="icon"
            aria-label={`Ajouter ${product.name} au panier`}
            className="shrink-0 w-8 h-8 rounded-lg"
            disabled={!product.inStock}
            onClick={(e) => {
              e.stopPropagation();
              if (product.inStock) {
                handleAddToCart(e);
              }
            }}
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>

          <Link
            to={`/product/${product.id}`}
            className="flex-[3] min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Button className="w-full h-8 px-2 overflow-hidden rounded-lg" size="sm">
              <span className="text-[9px] sm:text-[10px] font-bold tracking-tight whitespace-nowrap">COMMANDER</span>
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;

