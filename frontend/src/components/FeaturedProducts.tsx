import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "./ProductCard";
import { productsApi } from "@/api/products";
import { settingsApi } from "@/api/settings";
import { useQuery } from "@tanstack/react-query";

const FeaturedProducts = () => {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productsApi.getAll({ inStock: true, featured: true, published: true }),
  });

  const sectionTitle = settings?.featuredTitle || "LES INCONTOURNABLES";
  const sectionSubtitle = settings?.featuredSubtitle || "Sélectionnés spécialement pour les performances ultimes.";

  const featuredProducts = products.slice(0, 8);

  return (
    <section className="section-padding relative bg-muted/30">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

      <div className="container-custom relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-4xl md:text-5xl font-black mb-4 tracking-tighter">
                {sectionTitle}
              </h2>
              <div className="w-20 h-1.5 bg-primary mb-6 rounded-full" />
              <p className="text-foreground/80 text-lg font-medium">
                {sectionSubtitle}
              </p>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link to="/products" className="w-full sm:w-auto">
              <Button variant="gaming" size="lg" className="w-full sm:w-auto">
                VOIR TOUT LE CATALOGUE
                <ArrowRight />
              </Button>
            </Link>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
            </div>
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-8">
            {featuredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full"
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-20">
            Aucun produit populaire disponible pour le moment.
          </p>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
