import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ShoppingCart, Phone, Search, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";

import { getImageUrl } from "@/lib/image-utils";

const navLinks = [
  { name: "Nos Produits", path: "/products" },
  { name: "À Propos", path: "/about" },
  { name: "Contact", path: "/contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { getItemCount, lastAddedTime } = useCart();
  const cartCount = getItemCount();
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (lastAddedTime > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [lastAddedTime]);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const storeName = settings?.storeName || "MKARIM SOLUTION";
  const whatsappNumber = settings?.whatsappNumber || "+212 6 00 00 00 00";
  const logo = settings?.logo;

  const executeSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const handleButtonClick = () => {
    if (!isSearchOpen) {
      setIsSearchOpen(true);
    } else {
      executeSearch();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const isOutsideDesktop = searchRef.current && !searchRef.current.contains(event.target as Node);
      const isOutsideMobile = mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node);

      if (isOutsideDesktop && isOutsideMobile) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSearchOpen]);

  const { toggleTheme, theme } = useTheme();
  const location = useLocation();
  const isCartOrCheckout = location.pathname === "/cart" || location.pathname === "/checkout";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      {/* Glow Effect under the navbar */}
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_20px_rgba(235,68,50,0.3)]" />

      <div className="bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container-custom">
          {/* Main Layout Container: 3 Zones */}
          {/* Main Layout Container: 3 Zones */}
          <div className="flex items-center justify-between h-14 md:h-16 relative gap-2">

            {/* 1. LEFT ZONE: Search & Desktop Nav */}
            <div className="flex-1 flex items-center justify-start gap-4 min-w-0">
              {/* Mobile Search - Visible only on mobile/tablet */}
              <div ref={mobileSearchRef} className="lg:hidden relative flex items-center z-50 h-9 md:h-12">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ouvrir la recherche"
                  className="relative z-20 text-muted-foreground hover:text-foreground w-9 h-9 md:w-12 md:h-12 shrink-0 rounded-xl"
                  onClick={handleButtonClick}
                >
                  <Search className="w-4 h-4 md:w-5 md:h-5" />
                </Button>

                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.form
                      initial={{ opacity: 0, scale: 0.95, x: 0 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onSubmit={handleSearch}
                      className="absolute left-0 top-0 h-full z-10 w-[120px] sm:w-[200px] md:w-[300px] origin-left"
                    >
                      <input
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        autoFocus
                        aria-label="Rechercher des produits"
                        placeholder="Chercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-full bg-background/95 backdrop-blur-xl border border-primary/20 rounded-xl pl-10 pr-3 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(235,68,50,0.15)] text-xs font-bold italic text-foreground placeholder:text-muted-foreground/50 tracking-wide uppercase shadow-md transition-all duration-300"
                      />
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Desktop Nav Links */}
              <div className="hidden lg:flex items-center gap-6 xl:gap-8 ml-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="group relative px-2 py-1 overflow-visible whitespace-nowrap"
                  >
                    <span className="text-[10px] xl:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">
                      {link.name}
                    </span>
                    <motion.div
                      className="absolute bottom-0 left-0 w-full h-[1px] bg-primary origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                    />
                  </Link>
                ))}
              </div>
            </div>

            {/* 2. CENTER ZONE: Logo - Centered but with guaranteed space */}
            <div className="flex-shrink-0 px-2 flex justify-center z-20">
              <Link to="/" className="relative flex items-center justify-center group">
                {/* Background effects only if no logo image */}
                {!logo && (
                  <>
                    <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500 scale-75 group-hover:scale-100" />
                    <div className="absolute -inset-1 border border-primary/20 rounded-lg skew-x-[-15deg] group-hover:border-primary/50 transition-all duration-500" />
                  </>
                )}

                {logo ? (
                  <img
                    src={getImageUrl(logo)}
                    alt={storeName}
                    width="120"
                    height="48"
                    className="h-8 md:h-10 lg:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="font-display text-sm sm:text-base md:text-xl lg:text-2xl font-black italic uppercase tracking-tighter relative whitespace-nowrap">
                    {storeName.split(" ").length > 1 ? (
                      <>
                        <span className="text-primary drop-shadow-[0_0_10px_rgba(235,68,50,0.5)]">{storeName.split(" ")[0]}</span>
                        <span className="text-foreground ml-1 sm:ml-2 opacity-90">{storeName.split(" ").slice(1).join(" ")}</span>
                      </>
                    ) : (
                      <span className="text-primary drop-shadow-[0_0_10px_rgba(235,68,50,0.5)]">{storeName}</span>
                    )}
                  </span>
                )}
              </Link>
            </div>

            {/* 3. RIGHT ZONE: Actions */}
            <div className="flex-1 flex items-center justify-end gap-1 md:gap-3 lg:gap-4 min-w-0">
              {/* Search Block - Desktop Only */}
              <div ref={searchRef} className="hidden lg:flex relative items-center z-50 h-10 md:h-12">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ouvrir la recherche"
                  className="relative z-20 text-muted-foreground hover:text-foreground w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl"
                  onClick={handleButtonClick}
                >
                  <Search className="w-5 h-5 md:w-6 md:h-6" />
                </Button>

                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.form
                      initial={{ opacity: 0, scale: 0.95, x: 0 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onSubmit={handleSearch}
                      className="absolute right-0 top-0 h-full z-10 w-[200px] sm:w-[250px] md:w-[300px] origin-right"
                    >
                      <input
                        type="text"
                        autoFocus
                        aria-label="Rechercher des produits"
                        placeholder="RECHERCHE..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-full bg-card/95 backdrop-blur-md border border-primary/30 rounded-xl pl-4 pr-12 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-[10px] font-bold text-foreground tracking-widest uppercase shadow-2xl"
                      />
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
                className="text-muted-foreground hover:text-foreground transition-all duration-300 rounded-xl hover:bg-foreground/5 w-10 h-10 md:w-11 md:h-11 shrink-0"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {/* Inline Cart for Desktop/Tablet */}
              <Link to="/cart" aria-label="Voir le panier" className="hidden md:block relative group p-2 shrink-0">
                <motion.div
                  animate={isPulsing ? {
                    scale: [1, 1.3, 1],
                    rotate: [0, 10, -10, 0],
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <div className="relative">
                    <ShoppingCart className={`w-5 h-5 lg:w-6 lg:h-6 transition-colors ${isPulsing ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    {cartCount > 0 && (
                      <span className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-[8px] lg:text-[9px] font-black rounded-lg w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center border border-background skew-x-[-10deg]">
                        <span className="skew-x-[10deg]">{cartCount}</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              </Link>



              {/* Mobile/Tablet Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={isOpen}
                className="lg:hidden text-foreground ml-1 w-10 h-10 md:w-12 md:h-12 shrink-0"
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? <X className="w-6 h-6 md:w-7 md:h-7" /> : <Menu className="w-6 h-6 md:w-7 md:h-7" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Tech Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 lg:hidden bg-background/95 backdrop-blur-2xl flex flex-col pt-24 px-6 gap-8 border-l border-border shadow-[-20px_0_40px_rgba(0,0,0,0.5)]"
          >
            {/* Background pattern for futuristic look */}
            <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--primary)_1px,_transparent_1px)] bg-[size:30px_30px]" />
            </div>

            {/* Header in mobile menu for closing */}
            <div className="flex items-center justify-between mb-2 relative z-10">
              <span className="text-[10px] font-black text-primary tracking-[0.3em] uppercase">Navigation</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fermer le menu"
                className="w-12 h-12 rounded-2xl bg-foreground/5 text-foreground hover:bg-foreground/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-6 relative z-10">
              {navLinks.map((link, idx) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link
                    to={link.path}
                    className="flex items-center justify-between py-4 border-b border-border"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="text-3xl font-black text-foreground italic uppercase tracking-tighter shadow-sm">{link.name}</span>
                    <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_var(--primary)]" />
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-auto pb-12 space-y-4"
            >
              <div className="flex gap-4">
                <Button className="flex-1" onClick={toggleTheme} size="xl">
                  {theme === "dark" ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                </Button>
                <a href={`tel:${whatsappNumber.replace(/\s+/g, "")}`} className="flex-[3]">
                  <Button className="w-full bg-foreground text-background font-black uppercase tracking-widest h-16 rounded-2xl italic px-4" size="xl">
                    APPELER LE SUPPORT
                  </Button>
                </a>
              </div>
              <p className="text-[10px] font-black text-muted-foreground text-center uppercase tracking-[0.3em]">MKARIM SOLUTION GEAR © 2026</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Floating Cart Bubble */}
      {!isCartOrCheckout && (
        <div className="md:hidden fixed bottom-6 right-6 z-[60]">
          <Link to="/cart" aria-label="Voir le panier">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.9 }}
              className="relative w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(235,68,50,0.4)] border border-white/20 skew-x-[-4deg]"
            >
              <motion.div
                animate={isPulsing ? {
                  scale: [1, 1.3, 1],
                  rotate: [0, 15, -15, 0],
                } : {}}
              >
                <ShoppingCart className="w-7 h-7" />
              </motion.div>

              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-white text-primary text-[11px] font-black rounded-lg w-7 h-7 flex items-center justify-center shadow-lg border-2 border-primary skew-x-[4deg]">
                  {cartCount}
                </span>
              )}

              {/* Pulsing Ring Effect */}
              <div className="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-20" />
            </motion.div>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
