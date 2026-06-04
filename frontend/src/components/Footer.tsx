import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, ChevronDown, ChevronUp } from "lucide-react";

// Brand icons removed from lucide-react v1.x — using inline SVGs
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);
const TiktokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.02a8.16 8.16 0 0 0 4.77 1.53V7.1a4.85 4.85 0 0 1-1-.41z"/>
  </svg>
);
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";
import { categoriesApi } from "@/api/categories";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const quickLinks = [
  { name: "Accueil", path: "/" },
  { name: "Nos Produits", path: "/?all=1" },
  { name: "À Propos", path: "/about" },
  { name: "Contact", path: "/contact" },
];

const Footer = () => {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => categoriesApi.getAll(),
  });

  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const storeName = settings?.storeName || "MKARIM SOLUTION";
  const whatsappNumber = settings?.whatsappNumber || "+212 6 00 00 00 00";
  const codEnabled = settings?.codEnabled ?? true;

  const AccordionSection = ({ title, id, children }: { title: string, id: string, children: React.ReactNode }) => {
    const isOpen = openSection === id;
    return (
      <div className="border-b border-border lg:border-none">
        <button
          onClick={() => toggleSection(id)}
          aria-label={isOpen ? `Fermer la section ${title}` : `Ouvrir la section ${title}`}
          aria-expanded={isOpen}
          className="w-full py-6 flex justify-between items-center lg:hidden"
        >
          <h3 className="font-display font-bold text-foreground text-base  tracking-widest">{title}</h3>
          {isOpen ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <h3 className="hidden lg:block font-display font-bold text-foreground text-lg mb-8  tracking-widest">{title}</h3>

        <div className={`lg:block ${isOpen ? 'block pb-6' : 'hidden'}`}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <footer className="bg-background border-t border-border pt-16 pb-12">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 lg:gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-8 mb-12 lg:mb-0">
            <Link to="/" className="inline-block">
              <span className="font-display text-3xl font-bold tracking-tight">
                {storeName.split(" ").length > 1 ? (
                  <>
                    <span className="text-primary">{storeName.split(" ")[0]}</span>
                    <span className="text-foreground"> {storeName.split(" ").slice(1).join(" ")}</span>
                  </>
                ) : (
                  <span className="text-primary">{storeName}</span>
                )}
              </span>
            </Link>
            <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
              {settings?.footerDescription || "Votre destination pour les meilleurs produits. Qualité, service et livraison rapide partout au Maroc."}
            </p>
            <div className="flex gap-4 flex-wrap">
              {[
                { Icon: FacebookIcon, link: settings?.facebookLink, name: "Facebook" },
                { Icon: InstagramIcon, link: settings?.instagramLink, name: "Instagram" },
                { Icon: TwitterIcon, link: settings?.twitterLink, name: "Twitter / X" },
                { Icon: YoutubeIcon, link: settings?.youtubeLink, name: "YouTube" },
                { Icon: TiktokIcon, link: settings?.tiktokLink, name: "TikTok" },
              ].map(({ Icon, link, name }, i) => link ? (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer" aria-label={`Suivez-nous sur ${name}`} className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 group">
                  <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary-foreground" />
                </a>
              ) : null)}
              {settings?.tiktokLink && (
                <a href={settings.tiktokLink} target="_blank" rel="noopener noreferrer" aria-label="Suivez-nous sur TikTok" className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all duration-300 group">
                  <svg className="w-6 h-6 text-muted-foreground group-hover:text-primary-foreground fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1.01-.01 2.62.02 5.24-.02 7.86-.08 1.41-.47 2.81-1.25 4-1.35 2.06-3.8 3.12-6.23 2.77-2.34-.33-4.42-2.14-5.02-4.47-.63-2.45.19-5.14 2.09-6.84 1.25-1.12 2.92-1.72 4.6-1.68.03 1.48.01 2.96.02 4.44-.79-.07-1.61.12-2.3.52-.94.54-1.48 1.6-1.41 2.67.06 1.05.74 2.03 1.75 2.37 1.05.35 2.29.08 3-.77.58-.65.85-1.53.8-2.39.02-4.99.01-9.98.01-14.97z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          <AccordionSection title="Catégories" id="univers">
            <ul className="space-y-4">
              {categories.filter((c: any) => !c.parentId).slice(0, 6).map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/?category=${category.slug}`}
                    className="text-muted-foreground hover:text-primary transition-colors text-base font-medium"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </AccordionSection>

          {/* Quick Links */}
          <AccordionSection title="Navigation" id="nav">
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors text-base font-medium"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </AccordionSection>

          {/* Contact */}
          <AccordionSection title="Contact" id="contact">
            <ul className="space-y-6">
              <li className="flex items-start gap-4 text-base text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <span className="pt-1">{settings?.contactAddress || "Casablanca, Maroc"}</span>
              </li>
              <li className="flex items-center gap-4 text-base text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <a href={`tel:${whatsappNumber.replace(/\s+/g, "")}`} className="hover:text-primary transition-colors font-bold">
                  {whatsappNumber}
                </a>
              </li>
              <li className="flex items-center gap-4 text-base text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <a href={`mailto:${settings?.contactEmail || "contact@mkarim.ma"}`} className="hover:text-primary transition-colors truncate">
                  {settings?.contactEmail || "contact@mkarim.ma"}
                </a>
              </li>
            </ul>
          </AccordionSection>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-border flex flex-col lg:flex-row justify-between items-center gap-8">
          <p className="text-muted-foreground text-sm text-center lg:text-left">
            {settings?.footerCopyright || `© ${new Date().getFullYear()} ${storeName} – Tous droits réservés`}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 text-[10px] md:text-xs font-bold   text-muted-foreground">
            {codEnabled && (
              <span className="flex items-center gap-3 bg-muted py-2 px-4 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Paiement à la livraison
              </span>
            )}
            <span className="flex items-center gap-3 bg-muted py-2 px-4 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Livraison nationale
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

