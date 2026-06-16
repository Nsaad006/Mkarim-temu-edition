import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Search, Home, LayoutGrid, Sun, Moon, ChevronRight, Truck, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";
import { categoriesApi } from "@/api/categories";
import { getImageUrl } from "@/lib/image-utils";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [toutHovered, setToutHovered] = useState(false);
  const toutHoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navWrapperRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(0);
  const mobileCatRef = useRef<HTMLDivElement>(null);
  const [mobileCatCanScrollLeft, setMobileCatCanScrollLeft] = useState(false);
  const [mobileCatCanScrollRight, setMobileCatCanScrollRight] = useState(false);
  const desktopCatRef = useRef<HTMLDivElement>(null);
  const [desktopCatCanScrollLeft, setDesktopCatCanScrollLeft] = useState(false);
  const [desktopCatCanScrollRight, setDesktopCatCanScrollRight] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount, lastAddedTime } = useCart();
  const cartCount = getItemCount();
  const [isPulsing, setIsPulsing] = useState(false);
  const { toggleTheme, theme } = useTheme();

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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const topCategories = categories.filter((c: any) => !c.parentId);

  const storeName = settings?.storeName || "MKARIM";
  const logo = settings?.logo;
  const isCartOrCheckout = location.pathname === "/cart" || location.pathname === "/checkout";
  const currentCategory = new URLSearchParams(location.search).get("category") || "";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchFocused(false);
    }
  };

  const trendingSuggestions = ["PC Gamer", "Souris Gaming", "Clavier Mécanique", "Casque Audio", "Écran 144Hz"];

  const handleCatMouseEnter = (slug: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHoveredCat(slug);
  };

  const handleCatMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setHoveredCat(null), 150);
  };

  const handleToutMouseEnter = () => {
    if (toutHoverTimeout.current) clearTimeout(toutHoverTimeout.current);
    setToutHovered(true);
  };

  const handleToutMouseLeave = () => {
    toutHoverTimeout.current = setTimeout(() => setToutHovered(false), 200);
  };

  // Mobile category scroll arrows
  const updateMobileCatScroll = () => {
    const el = mobileCatRef.current;
    if (!el) return;
    setMobileCatCanScrollLeft(el.scrollLeft > 4);
    setMobileCatCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateMobileCatScroll();
    const el = mobileCatRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateMobileCatScroll, { passive: true });
    window.addEventListener('resize', updateMobileCatScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', updateMobileCatScroll);
      window.removeEventListener('resize', updateMobileCatScroll);
    };
  }, [topCategories.length]);

  // Desktop category pill bar scroll arrows
  const updateDesktopCatScroll = () => {
    const el = desktopCatRef.current;
    if (!el) return;
    setDesktopCatCanScrollLeft(el.scrollLeft > 4);
    setDesktopCatCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateDesktopCatScroll();
    const el = desktopCatRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateDesktopCatScroll, { passive: true });
    window.addEventListener('resize', updateDesktopCatScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', updateDesktopCatScroll);
      window.removeEventListener('resize', updateDesktopCatScroll);
    };
  }, [topCategories.length]);

  // Measure fixed navbar height so the page content isn't hidden behind it
  useEffect(() => {
    const el = navWrapperRef.current;
    if (!el) return;
    const update = () => setNavHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hoveredCatObj = topCategories.find((c: any) => c.slug === hoveredCat);
  const hoveredChildren = hoveredCat
    ? categories.filter((c: any) => c.parentId === hoveredCatObj?.id)
    : [];

  return (
    <>
      {/* Spacer so content below isn't hidden behind the fixed navbar */}
      <div style={{ height: navHeight }} aria-hidden="true" />
      {/* ── FIXED WRAPPER: announcement bar + main header always visible ── */}
      <div ref={navWrapperRef} className="fixed top-0 left-0 right-0 z-50">
      {/* ── TOP ANNOUNCEMENT BAR ── */}
      <div className="bg-foreground text-background text-[11px] font-medium hidden md:flex items-center justify-center gap-8 px-4 py-2">
        <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Livraison gratuite — Partout au Maroc</span>
        <span className="text-foreground/40">|</span>
        <span className="flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Satisfaction garantie · Remboursement en cas de problèmes</span>
        <span className="text-foreground/40">|</span>
        <button className="flex items-center gap-1 font-bold hover:text-primary transition-colors">
          Télécharger l'App <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* ── MAIN HEADER ── */}
      <header className="bg-background shadow-sm border-b border-border">
        {/* === DESKTOP HEADER === */}
        <div className="hidden md:flex items-center gap-2 px-6 h-14">

          {/* LOGO */}
          <Link to="/" className="shrink-0 flex items-center gap-2 mr-3">
            {logo ? (
              <img src={getImageUrl(logo)} alt={storeName} className="h-8 w-auto object-contain" />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg leading-none">M</span>
              </div>
            )}
            <span className="font-bold text-base tracking-tight">{storeName}</span>
          </Link>

          {/* QUICK LINKS */}
          <div className="flex items-center gap-6 mr-4 shrink-0">
             <Link to="/?sort=bestseller" className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                Meilleures ventes
             </Link>
             <Link to="/?sort=new" className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                Nouveautés
             </Link>
          </div>

          {/* SEARCH BAR */}
          <div ref={searchRef} className="flex-1 relative">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                placeholder="Rechercher sur la boutique..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full h-10 bg-muted border border-border rounded-full pl-4 pr-12 text-sm focus:outline-none focus:border-primary focus:bg-background transition-colors placeholder:text-muted-foreground"
              />
              <button type="submit" className="absolute right-1 top-1 h-8 w-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                <Search className="w-4 h-4 text-white" />
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {isSearchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl z-50 p-3"
                >
                  <p className="text-[10px] font-bold text-muted-foreground tracking-wider mb-2">Tendances</p>
                  <div className="flex flex-wrap gap-2">
                    {trendingSuggestions.map((s) => (
                      <button
                        key={s}
                        onMouseDown={() => { setSearchQuery(s); navigate(`/?search=${encodeURIComponent(s)}`); setIsSearchFocused(false); }}
                        className="text-xs bg-muted hover:bg-primary hover:text-white px-3 py-1 rounded-full transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT ACTIONS */}
          <div className="flex items-center gap-2 ml-1 shrink-0">
            {/* Cart */}
            <Link to="/cart" aria-label="Voir le panier" className="relative flex items-center gap-2 px-3 h-10 rounded-full hover:bg-muted transition-colors">
              <motion.div animate={isPulsing ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}} transition={{ duration: 0.5 }}>
                <ShoppingCart className={`w-5 h-5 transition-colors ${isPulsing ? 'text-primary' : 'text-foreground'}`} />
              </motion.div>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 left-5 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
              <span className="text-xs font-bold">Panier</span>
            </Link>
          </div>
        </div>

        {/* === MOBILE HEADER (Temu Native Style) === */}
        <div className="md:hidden flex flex-col bg-white">
          {/* Top Logo */}
          <div className="flex items-center justify-center h-10 mt-1">
            {logo ? (
              <img src={getImageUrl(logo)} alt={storeName} className="h-6 w-auto object-contain" />
            ) : (
              <span className="font-black text-xl text-primary tracking-tight">{storeName.toUpperCase()}</span>
            )}
          </div>

          {/* Search Bar */}
          <div className="px-3 pb-3 relative">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 border-[2.5px] border-black rounded-full pl-4 pr-12 text-[15px] focus:outline-none focus:ring-0 placeholder:text-gray-500 font-medium"
              />
              <button type="submit" className="absolute right-1.5 top-1.5 h-8 w-8 bg-black rounded-full flex items-center justify-center active:scale-95 transition-transform">
                <Search className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>

          {/* Category Tabs with scroll arrows */}
          <div className="relative">
            {mobileCatCanScrollLeft && (
              <button
                className="absolute left-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center bg-gradient-to-r from-white to-transparent"
                onClick={() => mobileCatRef.current?.scrollBy({ left: -120, behavior: 'smooth' })}
              >
                <ChevronRight className="w-4 h-4 rotate-180 text-gray-600" />
              </button>
            )}
            {mobileCatCanScrollRight && (
              <button
                className="absolute right-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center bg-gradient-to-l from-white to-transparent"
                onClick={() => mobileCatRef.current?.scrollBy({ left: 120, behavior: 'smooth' })}
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <div ref={mobileCatRef} className="flex items-center overflow-x-auto scrollbar-hide px-4 gap-6 border-b border-border">
              <Link
                to="/"
                className={`pb-2.5 text-[15px] whitespace-nowrap border-b-[3px] transition-colors relative ${
                  location.pathname === "/" && !currentCategory
                    ? "font-black border-black text-black"
                    : "font-semibold border-transparent text-gray-500 hover:text-black"
                }`}
              >
                Tout
                {location.pathname === "/" && !currentCategory && (
                  <span className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-6 h-[3px] bg-black rounded-t-sm"></span>
                )}
              </Link>

              {topCategories.map((cat: any) => (
                <Link
                  key={cat.slug}
                  to={`/?category=${cat.slug}`}
                  className={`pb-2.5 text-[15px] whitespace-nowrap border-b-[3px] transition-colors relative ${
                    currentCategory === cat.slug
                      ? "font-black border-black text-black"
                      : "font-semibold border-transparent text-gray-500 hover:text-black"
                  }`}
                >
                  {cat.name}
                  {currentCategory === cat.slug && (
                    <span className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-6 h-[3px] bg-black rounded-t-sm"></span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── CATEGORY PILL BAR with Hover Mega-Dropdown (Desktop Only) ── */}
        <div className="hidden md:block border-t border-border bg-background relative">
          {/* Scroll arrows for desktop category bar */}
          {desktopCatCanScrollLeft && (
            <button
              className="absolute left-0 top-0 bottom-0 z-20 w-8 flex items-center justify-center bg-gradient-to-r from-background to-transparent"
              onClick={() => desktopCatRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
            >
              <ChevronRight className="w-4 h-4 rotate-180 text-muted-foreground" />
            </button>
          )}
          {desktopCatCanScrollRight && (
            <button
              className="absolute right-0 top-0 bottom-0 z-20 w-8 flex items-center justify-center bg-gradient-to-l from-background to-transparent"
              onClick={() => desktopCatRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <div ref={desktopCatRef} className="flex items-center gap-0 overflow-x-auto scrollbar-hide px-3 md:px-6 h-10">
            {/* "Tout" pill — dropdown rendered OUTSIDE this overflow container to avoid clipping */}
            <div
              className="h-full flex items-stretch shrink-0 mr-1"
              onMouseEnter={handleToutMouseEnter}
              onMouseLeave={handleToutMouseLeave}
            >
              <Link
                to="/"
                className={`flex items-center gap-1 px-4 h-full text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  location.pathname === "/" && !currentCategory
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Tout
                <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${toutHovered ? "rotate-90" : ""}`} />
              </Link>
            </div>

            {topCategories.map((cat: any) => {
              const children = categories.filter((c: any) => c.parentId === cat.id);
              return (
                <div
                  key={cat.slug}
                  className="relative h-full flex items-stretch"
                  onMouseEnter={() => children.length > 0 && handleCatMouseEnter(cat.slug)}
                  onMouseLeave={handleCatMouseLeave}
                >
                  <Link
                    to={`/?category=${cat.slug}`}
                    className={`shrink-0 flex items-center gap-1 px-4 h-full text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                      currentCategory === cat.slug
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.name}
                    {children.length > 0 && (
                      <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${hoveredCat === cat.slug ? "rotate-90" : ""}`} />
                    )}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* ── "TOUT" DROPDOWN — outside overflow-x-auto so it is never clipped ── */}
          {toutHovered && (
            <div
              className="absolute top-full left-0 z-50 pt-1"
              onMouseEnter={handleToutMouseEnter}
              onMouseLeave={handleToutMouseLeave}
            >
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="ml-6 bg-background border border-border rounded-xl shadow-xl min-w-[200px] py-2"
              >
                <Link
                  to="/"
                  onClick={() => setToutHovered(false)}
                  className="flex items-center px-4 py-2 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                >
                  Tous les produits
                </Link>
                <div className="h-px bg-border mx-3 my-1" />
                {topCategories.map((cat: any) => (
                  <Link
                    key={cat.slug}
                    to={`/?category=${cat.slug}`}
                    onClick={() => setToutHovered(false)}
                    className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                  >
                    {cat.name}
                    <ChevronRight className="w-3 h-3 opacity-40" />
                  </Link>
                ))}
              </motion.div>
            </div>
          )}

          {/* ── MEGA DROPDOWN ── */}
          <AnimatePresence>
            {hoveredCat && hoveredChildren.length > 0 && (
              <motion.div
                key={hoveredCat}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 z-50 bg-background border-b border-border shadow-xl"
                onMouseEnter={() => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }}
                onMouseLeave={handleCatMouseLeave}
              >
                <div className="flex px-6 py-5 gap-6 max-w-7xl mx-auto">
                  {/* LEFT: parent category header + link */}
                  <div className="w-48 shrink-0 border-r border-border pr-6 flex flex-col gap-2">
                    <Link
                      to={`/?category=${hoveredCat}`}
                      onClick={() => setHoveredCat(null)}
                      className="flex items-center justify-between text-sm font-bold text-foreground hover:text-primary transition-colors group"
                    >
                      <span>Tout {hoveredCatObj?.name}</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <p className="text-xs text-muted-foreground">{hoveredCatObj?.productsCount || 0} produits</p>
                  </div>

                  {/* RIGHT: subcategory circle bubbles */}
                  <div className="flex-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                    {hoveredChildren.map((child: any) => (
                      <Link
                        key={child.id}
                        to={`/?category=${hoveredCat}&sub=${child.slug}`}
                        onClick={() => setHoveredCat(null)}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-all bg-muted">
                          {child.image ? (
                            <img
                              src={getImageUrl(child.image)}
                              alt={child.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[10px] font-bold text-muted-foreground text-center px-1 leading-tight">{child.name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-center leading-tight text-muted-foreground group-hover:text-primary transition-colors max-w-[72px] line-clamp-2">
                          {child.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
      </div>{/* end sticky wrapper */}

      {/* ── MOBILE BOTTOM NAV ── */}
      {!isCartOrCheckout && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-stretch h-14 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
          <Link to="/" className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${location.pathname === "/" && !new URLSearchParams(location.search).get("category") ? "text-[#f55900]" : "text-gray-600"}`}>
            <Home className={`w-6 h-6 ${location.pathname === "/" && !new URLSearchParams(location.search).get("category") ? "fill-[#f55900] text-[#f55900]" : "stroke-[2]"}`} />
            <span className="text-[10px] font-bold">Accueil</span>
          </Link>

          <Link to="/?category=all" className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${location.search.includes("category") ? "text-[#f55900]" : "text-gray-600"}`}>
            <Search className={`w-6 h-6 ${location.search.includes("category") ? "stroke-[#f55900] stroke-[2.5]" : "stroke-[2]"}`} />
            <span className="text-[10px] font-bold">Catégories</span>
          </Link>

          <Link to="/cart" className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${location.pathname === "/cart" ? "text-[#f55900]" : "text-gray-600"}`}>
            <div className="relative">
              <motion.div animate={isPulsing ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.5 }}>
                <ShoppingCart className={`w-6 h-6 ${location.pathname === "/cart" ? "fill-[#f55900] text-[#f55900]" : "stroke-[2]"}`} />
              </motion.div>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#f55900] text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">Panier</span>
          </Link>
        </nav>
      )}
    </>
  );
};

export default Navbar;

