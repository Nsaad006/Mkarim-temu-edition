import { motion } from "framer-motion";
import { ShieldCheck, Truck, Headphones, Award, CreditCard, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";

const features = [
  {
    icon: CreditCard,
    title: "Paiement à la Livraison",
    description: "Payez en cash à la réception de votre commande. Simple et sécurisé.",
  },
  {
    icon: Truck,
    title: "Livraison Rapide",
    description: "Livraison partout au Maroc en 24-72h selon votre ville.",
  },
  {
    icon: ShieldCheck,
    title: "Garantie Produits",
    description: "Tous nos produits sont couverts par une garantie officielle.",
  },
  {
    icon: Award,
    title: "Qualité Premium",
    description: "Nous sélectionnons uniquement des produits de qualité supérieure.",
  },
  {
    icon: Headphones,
    title: "Support Client",
    description: "Notre équipe est disponible pour vous accompagner avant et après achat.",
  },
  {
    icon: Clock,
    title: "Réponse Rapide",
    description: "Confirmation de commande sous 24h et suivi personnalisé.",
  },
];

const WhyChooseUs = () => {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const sectionTitle = settings?.whyTitle || "L'EXCELLENCE MKARIM SOLUTION";
  const sectionSubtitle = settings?.whySubtitle || "Nous redéfinissons le standard du gaming au Maroc avec un service irréprochable.";

  // Maps string representation of icon from db to actual Lucide component
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'CreditCard': return CreditCard;
      case 'Truck': return Truck;
      case 'ShieldCheck': return ShieldCheck;
      case 'Award': return Award;
      case 'Headphones': return Headphones;
      case 'Clock': return Clock;
      default: return ShieldCheck; // Fallback
    }
  };

  const currentFeatures = settings?.whyFeatures && Array.isArray(settings.whyFeatures) && settings.whyFeatures.length > 0
    ? settings.whyFeatures.map((f: any) => ({ ...f, icon: getIconComponent(f.icon) }))
    : features;

  return (
    <section className="section-padding relative overflow-hidden bg-background">
      {/* Background Decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="text-center mb-10 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 tracking-tight  px-4">
              {sectionTitle}
            </h2>
            <p className="text-foreground/80 max-w-2xl mx-auto text-base md:text-lg px-6 font-medium">
              {sectionSubtitle}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 px-2 md:px-0">
          {currentFeatures.map((feature: any, index: number) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative p-5 md:p-8 rounded-xl md:rounded-2xl bg-card/40 border border-border backdrop-blur-sm group hover:border-primary/50 transition-all duration-500 overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full group-hover:bg-primary/20 transition-colors duration-500" />

              <div className="relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-muted border border-border flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500 shadow-xl">
                <feature.icon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              </div>

              <h3 className="relative z-10 font-display font-bold text-[12px] sm:text-sm md:text-xl mb-1 md:mb-3 group-hover:text-primary transition-colors leading-tight truncate">
                {feature.title}
              </h3>

              <p className="relative z-10 text-[9px] sm:text-[11px] md:text-base text-muted-foreground leading-relaxed md:leading-relaxed line-clamp-3 md:line-clamp-none">
                {feature.description}
              </p>

              {/* Decorative line */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-primary group-hover:w-full transition-all duration-700" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;

