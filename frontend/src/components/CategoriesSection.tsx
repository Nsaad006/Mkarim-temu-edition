import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import * as icons from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

import { categoriesApi } from "@/api/categories";
import { settingsApi } from "@/api/settings";
import { useQuery } from "@tanstack/react-query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getImageUrl } from "@/lib/image-utils";

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const CategoriesSection = () => {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const sectionTitle = settings?.categoriesTitle || "Nos Catégories";
  const sectionSubtitle = settings?.categoriesSubtitle || "Découvrez notre large sélection de produits IT et gaming de qualité supérieure";

  if (isLoading) return (
    <section className="section-padding relative overflow-hidden bg-background" aria-hidden="true">
      <div className="container-custom">
        <div className="text-center mb-16">
          <div className="h-12 w-64 bg-muted/60 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="w-24 h-1.5 bg-muted/60 mx-auto mb-6 rounded-full" />
          <div className="h-5 w-96 bg-muted/50 rounded mx-auto animate-pulse" />
        </div>
        <div className="flex gap-4 justify-center overflow-hidden px-6 md:px-16">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3 shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-muted/50 animate-pulse" />
              <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <section className="section-padding relative overflow-hidden bg-background">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-20">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="container-custom relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-4xl md:text-5xl font-black mb-4 tracking-tight">
              {sectionTitle.includes("<") ? (
                <span dangerouslySetInnerHTML={{ __html: sectionTitle }} />
              ) : (
                sectionTitle
              )}
            </h2>
            <div className="w-24 h-1.5 bg-primary mx-auto mb-6 rounded-full" />
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {sectionSubtitle}
            </p>
          </motion.div>
        </div>

        <div className="px-6 md:px-16">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: settings?.categoriesAutoPlayInterval || 3000,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-2">
              {categories.map((category) => {
                let IconComponent: LucideIcon | undefined;

                if (category.icon) {
                  const iconName = category.icon;
                  const normalizedInput = iconName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

                  const aliases: Record<string, string> = {
                    'motocycle': 'motorcycle',
                    'moto': 'motorcycle',
                    'scooter': 'bike',
                    'trottinette': 'bike',
                    'ecran': 'monitor',
                    'souris': 'mouse',
                    'clavier': 'keyboard',
                    'casque': 'headset'
                  };

                  const target = aliases[normalizedInput] || normalizedInput;
                  const foundKey = Object.keys(icons).find(
                    key => key.toLowerCase() === target
                  );
                  if (foundKey) {
                    IconComponent = icons[foundKey as keyof typeof icons] as LucideIcon;
                  }
                }

                if (!IconComponent) {
                  const slugMapping: Record<string, any> = {
                    'gaming-pc': icons.Gamepad2,
                    'laptops': icons.Laptop,
                    'gaming-monitors': icons.Tv,
                    'monitors': icons.Monitor,
                    'gaming-headsets': icons.Headset,
                    'gaming-mice': icons.Mouse,
                    'gaming-keyboards': icons.Keyboard,
                    'desktops': icons.Boxes,
                    'earphones': icons.Bluetooth,
                    'it-accessories': icons.Cable,
                    'components': icons.Cpu,
                    'trottinette': icons.Bike,
                    'all': icons.LayoutGrid
                  };
                  IconComponent = (slugMapping[category.slug] || icons.Package) as LucideIcon;
                }

                return (
                  <CarouselItem key={category.slug} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6">
                    <motion.div
                      variants={item}
                      whileHover={{ y: -8, scale: 1.05 }}
                      className="group h-full"
                    >
                      <Link
                        to={`/products?category=${category.slug}`}
                        className="flex flex-col items-center justify-center py-3"
                      >
                        {/* Circular Image Container */}
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 mb-2 sm:mb-3 rounded-full overflow-hidden bg-muted/30 shadow-lg group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-500">
                          {category.image ? (
                            <img
                              src={getImageUrl(category.image)}
                              alt={category.name}
                              width="150"
                              height="150"
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                              <IconComponent className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all duration-500" />
                            </div>
                          )}
                        </div>

                        {/* Category Name */}
                        <h3 className="font-bold text-[11px] sm:text-xs md:text-sm text-center group-hover:text-primary transition-colors duration-300 line-clamp-2 uppercase tracking-tight leading-tight mb-0.5 px-1">
                          {category.name}
                        </h3>

                        {/* Product Count */}
                        <p className="text-[10px] sm:text-xs text-muted-foreground group-hover:text-primary/70 transition-colors duration-300">
                          {category.productsCount} produits
                        </p>
                      </Link>
                    </motion.div>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
            <CarouselPrevious className="-left-6 md:-left-16 h-6 w-6 md:h-12 md:w-12 bg-transparent md:bg-background border-none md:border-2 md:border-primary/30 p-0 md:p-2 text-primary md:text-foreground hover:bg-transparent shadow-none" />
            <CarouselNext className="-right-6 md:-right-16 h-6 w-6 md:h-12 md:w-12 bg-transparent md:bg-background border-none md:border-2 md:border-primary/30 p-0 md:p-2 text-primary md:text-foreground hover:bg-transparent shadow-none" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
