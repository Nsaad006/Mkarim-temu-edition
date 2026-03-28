import { Link, useNavigate } from "react-router-dom";
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

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

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

        {/* Badges - Gaming Style */}
        <div className="absolute top-2 md:top-4 left-0 flex flex-col gap-1.5 md:gap-2 items-start z-10">
          {product.badge && (
            <div className="bg-primary text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-0.5 md:py-1 skew-x-[-12deg] -ml-1 shadow-lg">
              <span className="skew-x-[12deg] inline-block uppercase tracking-wider md:tracking-widest">{product.badge}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="bg-white/90 md:bg-white text-black text-[8px] md:text-[10px] font-black px-2 md:px-3 py-0.5 md:py-1 skew-x-[-12deg] -ml-1 shadow-lg border-l-2 md:border-l-4 border-primary">
              <span className="skew-x-[12deg] inline-block uppercase tracking-wider md:tracking-widest">-{discount}% OFF</span>
            </div>
          )}
        </div>

        {/* Quick View Icon - Desktop Only */}
        <div className="absolute top-4 right-4 opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform translate-x-2 md:group-hover:translate-x-0 hidden md:block">
          <div
            role="button"
            aria-label={`Aperçu rapide de ${product.name}`}
            className="w-10 h-10 bg-background/50 backdrop-blur-md rounded-xl flex items-center justify-center border border-border hover:bg-primary transition-colors"
          >
            <Eye className="w-5 h-5 text-foreground" />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 md:p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
            {product.category?.name || product.categoryId.replace("-", " ")}
          </span>
          <div className={`flex items-center gap-1 ${product.inStock ? "" : "text-red-500"}`}>
            {!product.inStock && (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tighter">
                  EN RUPTURE
                </span>
              </>
            )}
          </div>
        </div>

        <h3 className="font-display text-[13px] md:text-lg font-black text-foreground italic tracking-tighter leading-tight mb-1 md:mb-2 line-clamp-2 min-h-[2.2rem] md:min-h-[3.5rem] uppercase group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Pricing */}
        <div className="flex flex-col gap-0 mb-3 md:mb-4">
          <span className="text-base sm:text-lg md:text-2xl font-black text-primary italic tracking-tight leading-tight">
            {product.price.toLocaleString()} <span className="text-[10px] md:text-sm ml-0.5">{currency}</span>
          </span>
          {product.originalPrice && (
            <span className="text-[10px] md:text-xs text-muted-foreground/40 line-through font-bold italic">
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
            className="shrink-0 w-10 h-10"
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
            <Button className="w-full italic px-2 overflow-hidden" size="default">
              <span className="text-[9px] sm:text-xs font-black tracking-tighter sm:tracking-normal whitespace-nowrap">COMMANDER</span>
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
