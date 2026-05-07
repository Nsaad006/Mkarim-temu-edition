import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";

const CTASection = () => {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const ctaTitle = settings?.ctaTitle || "PRÊT À RÉVOLUTIONNER VOTRE SETUP ?";
  const ctaSubtitle = settings?.ctaSubtitle || "Rejoignez l'élite des gamers marocains. Qualité certifiée, livraison express et service client dédié.";
  const primaryBtnText = settings?.ctaPrimaryBtnText || "Accéder à la Boutique";
  const primaryBtnLink = settings?.ctaPrimaryBtnLink || "/products";
  const secondaryBtnText = settings?.ctaSecondaryBtnText || "Besoin d'aide ?";
  const secondaryBtnLink = settings?.ctaSecondaryBtnLink || "/contact";

  return (
    <section className="py-12 md:py-24 relative overflow-hidden bg-background">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670&auto=format&fit=crop"
          alt="Gaming Setup"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </div>

      {/* Decorative Border Glow */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_20px_rgba(235,68,50,0.5)]" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_20px_rgba(235,68,50,0.5)]" />

      <div className="container-custom relative z-10 px-4 md:px-0">
        <div className="max-w-4xl mx-auto backdrop-blur-md rounded-2xl md:rounded-3xl border border-border bg-card/60 p-5 md:p-16 text-center shadow-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-sm font-bold   mb-6 md:mb-8">
              Édition Limitée
            </span>

            <h2 className="font-display text-2xl sm:text-3xl md:text-6xl font-bold text-foreground mb-6 md:mb-8 tracking-tight leading-tight md:leading-none">
              {ctaTitle.split(' ').map((word, i) => (
                <span key={i} className={word.toLowerCase() === 'setup' || word.toLowerCase() === 'révolutionner' ? "text-primary" : ""}>
                  {word}{' '}
                </span>
              ))}
            </h2>

            <p className="text-base md:text-xl text-muted-foreground mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-2 md:px-0 font-medium">
              {ctaSubtitle}
            </p>

            <div className="flex flex-col lg:flex-row gap-4 md:gap-6 justify-center items-center">
              <Link to={primaryBtnLink} className="w-full lg:w-auto shrink-0">
                <Button size="xl" className="w-full lg:w-auto px-6 md:px-10 shadow-[0_0_30px_rgba(235,68,50,0.3)] shrink-0">
                  {primaryBtnText}
                  <ArrowRight />
                </Button>
              </Link>
              <Link to={secondaryBtnLink} className="w-full lg:w-auto shrink-0">
                <Button size="xl" variant="outline" className="w-full lg:w-auto px-6 md:px-10 shrink-0">
                  {secondaryBtnText}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

