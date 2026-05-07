import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import { productsApi } from "@/api/products";
import { useQuery } from "@tanstack/react-query";

const FeaturedProducts = () => {
  // Fetching more products for the dense feed
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productsApi.getAll({ inStock: true, published: true }),
  });

  // Take up to 20 products for the feed
  const feedProducts = products.slice(0, 20);

  return (
    <section className="bg-background pb-16 pt-2">
      <div className="px-2 sm:px-4 md:px-6 lg:px-8 mx-auto max-w-7xl">
        {/* Temu Style Title */}
        <div className="flex items-center justify-center gap-4 mb-4 mt-2">
          <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent to-red-500"></div>
          <h2 className="font-sans text-xl md:text-2xl font-bold text-red-500  tracking-tight flex items-center gap-2">
            Recommandé pour vous
          </h2>
          <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent to-red-500"></div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden bg-card/40">
                <div className="aspect-[4/5] bg-muted/50 animate-pulse" />
                <div className="p-2 md:p-3 space-y-2">
                  <div className="h-3 w-1/3 bg-muted/50 rounded animate-pulse" />
                  <div className="h-4 w-full bg-muted/60 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-muted/60 rounded animate-pulse" />
                  <div className="h-6 w-1/2 bg-muted/70 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : feedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {feedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "100px" }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-20">
            Aucun produit disponible pour le moment.
          </p>
        )}

        {feedProducts.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Link to="/products" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-3 bg-secondary text-foreground font-bold rounded-full hover:bg-secondary/80 transition-colors border border-border">
                Voir plus de recommandations
              </button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;

