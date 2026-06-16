import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import SEO from "@/components/SEO";
import { productsApi } from "@/api/products";
import { categoriesApi } from "@/api/categories";
import { settingsApi } from "@/api/settings";
import { useQuery } from "@tanstack/react-query";
import { getImageUrl } from "@/lib/image-utils";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("category") || "";
  const subSlug = searchParams.get("sub") || "";
  const searchParam = searchParams.get("search") || "";
  const promoParam = searchParams.get("promo") === "true";
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const [browseActiveCat, setBrowseActiveCat] = useState<string | null>(null);
  const choixCarouselRef = useRef<HTMLDivElement>(null);
  const [choixCanLeft, setChoixCanLeft] = useState(false);
  const [choixCanRight, setChoixCanRight] = useState(false);
  const infiniteSentinelRef = useRef<HTMLDivElement>(null);
  // Session-stable shuffle seed (changes on page load, stable across re-renders)
  const sessionSeed = useMemo(() => Math.random(), []);

  // Pagination state — must be declared before filteredProducts so the infinite-scroll
  // useEffect (which depends on filteredProducts) can safely reference setCurrentPage
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchParams]);

  // Close cat dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Track "Choix du moment" carousel scroll arrows
  const updateChoixScroll = useCallback(() => {
    const el = choixCarouselRef.current;
    if (!el) return;
    setChoixCanLeft(el.scrollLeft > 4);
    setChoixCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateChoixScroll();
    const el = choixCarouselRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateChoixScroll, { passive: true });
    window.addEventListener('resize', updateChoixScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', updateChoixScroll);
      window.removeEventListener('resize', updateChoixScroll);
    };
  }, [updateChoixScroll]);

  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => productsApi.getAll({ published: true }),
  });

  // Stable carousel products — MUST be after allProducts to avoid TDZ error
  const choixProducts = useMemo(() => {
    if (!allProducts.length) return [];
    return [...allProducts]
      .sort((a, b) => {
        const ha = Math.abs(Math.sin((a.id.charCodeAt(0) + a.id.charCodeAt(a.id.length - 1)) * sessionSeed * 3571));
        const hb = Math.abs(Math.sin((b.id.charCodeAt(0) + b.id.charCodeAt(b.id.length - 1)) * sessionSeed * 3571));
        return ha - hb;
      })
      .slice(0, 12);
  }, [allProducts, sessionSeed]);

  // Re-check arrow visibility once products are rendered in the carousel DOM
  // MUST be after choixProducts declaration to avoid TDZ error
  useEffect(() => {
    if (choixProducts.length > 0) {
      const t = setTimeout(updateChoixScroll, 50);
      return () => clearTimeout(t);
    }
  }, [choixProducts.length, updateChoixScroll]);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.getSettings(),
  });

  // Derive which category object is selected
  const selectedParent = useMemo(
    () => categories.find((c: any) => c.slug === categorySlug && !c.parentId) || null,
    [categories, categorySlug]
  );

  // Child categories of selected parent
  const childCategories = useMemo(
    () => (selectedParent ? categories.filter((c: any) => c.parentId === selectedParent.id) : []),
    [categories, selectedParent]
  );

  // The active category for filtering (sub > parent > none)
  const activeCategoryId = useMemo(() => {
    if (subSlug) {
      const sub = categories.find((c: any) => c.slug === subSlug);
      return sub?.id || null;
    }
    if (selectedParent) {
      // Include parent + all its children
      const childIds = childCategories.map((c: any) => c.id);
      return [selectedParent.id, ...childIds];
    }
    return null;
  }, [subSlug, selectedParent, childCategories, categories]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    if (searchParam) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchParam.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchParam.toLowerCase())
      );
    }

    if (activeCategoryId) {
      if (Array.isArray(activeCategoryId)) {
        result = result.filter((p) => activeCategoryId.includes(p.categoryId));
      } else {
        result = result.filter((p) => p.categoryId === activeCategoryId);
      }
    }

    if (promoParam) {
      result = result.filter((p) => p.originalPrice && p.originalPrice > p.price);
    }

    const sortParam = searchParams.get("sort");
    if (sortParam === "bestseller") {
      result = [...result].sort((a, b) => {
        const hashA = (a.id.charCodeAt(0) || 0) + ((a.id.charCodeAt(a.id.length - 1) || 0) * 10);
        const hashB = (b.id.charCodeAt(0) || 0) + ((b.id.charCodeAt(b.id.length - 1) || 0) * 10);
        return hashB - hashA;
      });
    } else if (sortParam === "new") {
      result = [...result].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else {
      // Default: shuffle randomly each page load (stable within this session via sessionSeed)
      result = [...result].sort((a, b) => {
        const ha = Math.abs(Math.sin((a.id.charCodeAt(0) + a.id.charCodeAt(a.id.length - 1)) * sessionSeed * 9973)) ;
        const hb = Math.abs(Math.sin((b.id.charCodeAt(0) + b.id.charCodeAt(b.id.length - 1)) * sessionSeed * 9973));
        return ha - hb;
      });
    }

    if (searchParams.get("onlyPromo") === "true") {
      result = result.filter((p) => p.originalPrice && p.originalPrice > p.price);
    }
    if (searchParams.get("inStock") === "true") {
      result = result.filter((p) => p.inStock);
    }
    const bsCat = searchParams.get("bsCat");
    if (bsCat) {
      const bsCatObj = (categories as any[]).find((c: any) => c.slug === bsCat);
      if (bsCatObj) {
        const childIds = (categories as any[]).filter((c: any) => c.parentId === bsCatObj.id).map((c: any) => c.id);
        const ids = [bsCatObj.id, ...childIds];
        result = result.filter((p) => ids.includes(p.categoryId));
      }
    }
    const catSort = searchParams.get("catSort");
    if (catSort === "asc") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (catSort === "desc") {
      result = [...result].sort((a, b) => b.price - a.price);
    }

    return result;
  }, [allProducts, activeCategoryId, searchParam, searchParams, sessionSeed]);

  // Infinite scroll observer — placed AFTER filteredProducts declaration to avoid TDZ error
  useEffect(() => {
    const el = infiniteSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setCurrentPage(p => p + 1);
      },
      { rootMargin: '300px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [filteredProducts.length]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    0,
    currentPage * ITEMS_PER_PAGE
  );

  const isLoading = productsLoading || catsLoading;

  const selectedSubCat = useMemo(
    () => categories.find((c: any) => c.slug === subSlug) || null,
    [categories, subSlug]
  );

  const isBestseller = searchParams.get("sort") === "bestseller";
  const isNew = searchParams.get("sort") === "new";

  const pageTitle = isBestseller
    ? "Meilleures ventes"
    : isNew
      ? "Nouveautés"
      : promoParam
        ? "Offres de liquidation"
        : selectedParent
          ? `${selectedParent.name}${selectedSubCat ? ` · ${selectedSubCat.name}` : ""}`
          : searchParam
            ? `Résultats pour "${searchParam}"`
            : "Tous les produits";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <SEO
        title={pageTitle}
        description="Découvrez notre sélection de produits avec livraison rapide au Maroc."
      />
      <Navbar />

      <main>
        {/* ── MOBILE TRUST BAR (Temu Native Style) ── */}
        <div className="md:hidden flex flex-row items-stretch w-full px-2 py-1 mb-2">
          {/* Left Block */}
          <div className="flex-1 bg-[#0b801a] text-white flex flex-col justify-center px-2 py-1.5 rounded-l-md border-r border-[#1a902b] overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="bg-white text-[#0b801a] rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
              <span className="text-[11px] font-black tracking-tight leading-tight uppercase line-clamp-2">
                {settings?.freeShippingText || "LIVRAISON GRATUITE"}
              </span>
            </div>
            {!settings?.freeShippingText && (
              <span className="text-[10px] opacity-90 mt-0.5 leading-none pl-5">Spécialement pour vous</span>
            )}
          </div>
          {/* Right Block */}
          <div className="flex-1 bg-[#0b801a] text-white flex flex-col justify-center px-2 py-1.5 rounded-r-md">
            <div className="flex items-center gap-1">
              <span className="border border-white text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold shrink-0">$</span>
              <span className="text-[11px] font-bold tracking-tight leading-none">Ajustement des prix</span>
            </div>
            <span className="text-[10px] opacity-90 mt-0.5 leading-none pl-4.5">Dans les 30 jours</span>
          </div>
        </div>

        {/* ── MARKETING SECTION (CHOIX DU MOMENT) ── */}
        {!categorySlug && !subSlug && !searchParam && !promoParam && !isBestseller && !isNew && !isLoading && (
          <div className="py-6 mb-2">
            <div className="px-2 sm:px-4 md:px-6 lg:px-8 mx-auto max-w-7xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="text-2xl sm:text-3xl font-black text-orange-500">⚡</span>
                    <div className="absolute -bottom-1 left-0 w-full h-1 bg-red-600 rounded-full"></div>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#e41c19] uppercase tracking-tight ml-1">
                    Choix du moment
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-[#e41c19] text-base sm:text-lg font-black flex items-center gap-1 tracking-tight">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 -mr-0.5">
                      <path d="M12.5 2h-5L6 11h4v9l9-12h-5L12.5 2z" />
                    </svg>
                    OFFRES DE LIQUIDATION
                  </div>
                  <button onClick={() => setSearchParams({ promo: "true" })} className="border border-border text-muted-foreground hover:text-foreground hover:border-foreground bg-white px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-sm flex items-center gap-1">
                    Stock limité <span className="font-normal text-[10px]">&gt;</span>
                  </button>
                </div>
              </div>

              {/* CAROUSEL WITH ARROWS */}
              <div className="relative">
                {choixCanLeft && (
                  <button
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 border border-border shadow flex items-center justify-center hover:bg-white transition-colors"
                    onClick={() => choixCarouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                )}
                {choixCanRight && (
                  <button
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 border border-border shadow flex items-center justify-center hover:bg-white transition-colors"
                    onClick={() => choixCarouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )}
              <div ref={choixCarouselRef} className="flex overflow-x-auto gap-3 scrollbar-hide snap-x pb-2" onScroll={updateChoixScroll}>
                {choixProducts.map((product, i) => {
                  // Stable fake review count derived from product id — never changes on re-render
                  const reviewCount = 12 + ((product.id.charCodeAt(0) + product.id.charCodeAt(product.id.length - 1)) * 7) % 488;
                  return (
                    <motion.div
                      key={`promo-${product.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4) }}
                      className="shrink-0 w-[140px] sm:w-[160px] snap-center bg-card border border-border rounded-xl overflow-hidden shadow-sm relative group cursor-pointer hover:border-orange-500/50 transition-colors"
                      onClick={() => window.location.href = `/product/${product.id}`}
                    >
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-[10px] py-1 px-1.5 flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[9px]">En stock</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="flex items-baseline gap-1 mb-1 truncate">
                          <span className="text-sm font-black text-orange-500">{product.price.toLocaleString()}</span>
                          <span className="text-[9px] text-orange-500 font-bold">MAD</span>
                          {product.originalPrice && (
                            <span className="text-[9px] text-muted-foreground line-through ml-0.5">{product.originalPrice.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="text-yellow-400">★★★★★</span>
                          <span className="text-[9px]">({reviewCount})</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>{/* end carousel scroll */}
              </div>{/* end relative wrapper */}
            </div>
          </div>
        )}

        {/* ── BESTSELLER HEADER ── */}
        {isBestseller && (
          <div className="py-4 border-b border-border mb-6">
            <div className="px-2 sm:px-4 md:px-6 lg:px-8 mx-auto max-w-7xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">Meilleures ventes</h1>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                  <button onClick={() => setSearchParams({ sort: "bestseller", time: "30" })} className={`px-4 py-1.5 rounded-full border-2 text-sm font-semibold whitespace-nowrap transition-colors ${!searchParams.get("time") || searchParams.get("time") === "30" ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}>
                    30 derniers jours
                  </button>
                  <button onClick={() => setSearchParams({ sort: "bestseller", time: "14" })} className={`px-4 py-1.5 rounded-full border-2 text-sm font-semibold whitespace-nowrap transition-colors ${searchParams.get("time") === "14" ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}>
                    14 derniers jours
                  </button>
                  <button onClick={() => setSearchParams({ sort: "bestseller", time: "7" })} className={`px-4 py-1.5 rounded-full border-2 text-sm font-semibold whitespace-nowrap transition-colors ${searchParams.get("time") === "7" ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}>
                    7 derniers jours
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground hidden sm:inline-block">Filtrer par catégorie</span>
                  <select
                    className="border border-border rounded-full px-4 py-1.5 text-sm font-semibold bg-transparent focus:outline-none focus:border-foreground cursor-pointer"
                    value={searchParams.get("bsCat") || ""}
                    onChange={(e) => {
                      const p = new URLSearchParams(searchParams);
                      if (e.target.value) p.set("bsCat", e.target.value);
                      else p.delete("bsCat");
                      setSearchParams(p, { replace: true });
                    }}
                  >
                    <option value="">Recommandé</option>
                    {categories.filter((c: any) => !c.parentId && c.active).map((c: any) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── NOUVEAUTÉS HEADER ── */}
        {isNew && (
          <div className="py-4 border-b border-border mb-6">
            <div className="px-2 sm:px-4 md:px-6 lg:px-8 mx-auto max-w-7xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <h1 className="text-xl sm:text-2xl font-bold whitespace-nowrap">Nouveautés</h1>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                  <button onClick={() => setSearchParams({ sort: "new", filter: "recommended" })} className={`px-4 py-1.5 rounded-full border-2 text-sm font-semibold whitespace-nowrap transition-colors ${!searchParams.get("filter") || searchParams.get("filter") === "recommended" ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}>
                    Recommandé pour vous
                  </button>
                  <button onClick={() => setSearchParams({ sort: "new", filter: "week" })} className={`px-4 py-1.5 rounded-full border-2 text-sm font-semibold whitespace-nowrap transition-colors ${searchParams.get("filter") === "week" ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}>
                    Nouveautés de la semaine
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-2 sm:px-4 md:px-6 lg:px-8 mx-auto max-w-7xl">

          {/* ── PROMO HEADER ── */}
          {promoParam && (
            <div className="py-4 border-b border-border mb-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                <button onClick={() => setSearchParams({})} className="hover:text-foreground transition-colors">Page d'accueil</button>
                <span>›</span>
                <span className="text-foreground">Offres de liquidation</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-[#e41c19] text-base sm:text-lg font-black flex items-center gap-1 tracking-tight">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 -mr-0.5">
                      <path d="M12.5 2h-5L6 11h4v9l9-12h-5L12.5 2z" />
                    </svg>
                    OFFRES DE LIQUIDATION
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">Stock limité</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <button onClick={() => setSearchParams({ promo: "true", type: "featured" })} className={`px-4 py-1.5 rounded-full border-2 text-sm font-semibold whitespace-nowrap transition-colors ${!searchParams.get("type") || searchParams.get("type") === "featured" ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}>
                    En vedette
                  </button>
                  <button onClick={() => setSearchParams({ promo: "true", type: "clearance" })} className={`px-4 py-1.5 rounded-full border-2 text-sm font-semibold whitespace-nowrap transition-colors ${searchParams.get("type") === "clearance" ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground"}`}>
                    Fins de série
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SUBCATEGORY BUBBLES (Temu-style circles) ── */}
          <AnimatePresence>
            {selectedParent && childCategories.length > 0 && (
              <motion.div
                key="subcats"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-3 px-1">
                  {/* "Tout" bubble */}
                  <button
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.delete("sub");
                      p.delete("page");
                      setSearchParams(p, { replace: true });
                    }}
                    className="flex flex-col items-center gap-1 shrink-0 group"
                  >
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] flex items-center justify-center transition-all ${!subSlug ? "border-primary" : "border-transparent hover:border-border"} bg-muted overflow-hidden`}>
                      <span className="text-xs font-bold text-foreground">Tout</span>
                    </div>
                    <span className={`text-[10px] sm:text-xs font-medium truncate max-w-[70px] text-center ${!subSlug ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      Tout
                    </span>
                  </button>

                  {childCategories.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        const p = new URLSearchParams(searchParams);
                        if (subSlug === child.slug) {
                          p.delete("sub");
                        } else {
                          p.set("sub", child.slug);
                        }
                        p.delete("page");
                        setSearchParams(p, { replace: true });
                      }}
                      className="flex flex-col items-center gap-1 shrink-0 group"
                    >
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] overflow-hidden transition-all ${subSlug === child.slug ? "border-primary" : "border-transparent hover:border-border"} bg-muted`}>
                        {child.image ? (
                          <img
                            src={getImageUrl(child.image)}
                            alt={child.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[10px] font-bold text-muted-foreground text-center px-1 leading-tight">{child.name}</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] sm:text-xs font-medium truncate max-w-[70px] text-center ${subSlug === child.slug ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {child.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* -- FILTER PILLS BAR -- */}
                <div className="flex flex-wrap items-center gap-2 py-3 mt-2 border-b border-border/50">
                  <button
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      const current = p.get("catSort");
                      const next = !current ? "asc" : current === "asc" ? "desc" : "";
                      if (next) p.set("catSort", next); else p.delete("catSort");
                      setSearchParams(p, { replace: true });
                    }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-colors border ${searchParams.get("catSort") ? "bg-foreground text-background border-foreground" : "bg-muted/50 text-foreground border-border hover:bg-muted"}`}
                  >
                    {searchParams.get("catSort") === "asc" ? "Prix croissant" : searchParams.get("catSort") === "desc" ? "Prix decroissant" : "Tri: Prix"}
                  </button>
                  <button
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      if (p.get("onlyPromo") === "true") p.delete("onlyPromo"); else p.set("onlyPromo", "true");
                      setSearchParams(p, { replace: true });
                    }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors border ${searchParams.get("onlyPromo") === "true" ? "bg-red-500 text-white border-red-500" : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"}`}
                  >Promotions</button>
                  {childCategories.length > 0 && (
                    <div className="relative shrink-0" ref={catDropdownRef}>
                      <button
                        onClick={() => setCatDropdownOpen(o => !o)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors border ${subSlug ? "bg-foreground text-background border-foreground" : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"}`}
                      >
                        {subSlug ? (childCategories.find((c: any) => c.slug === subSlug)?.name || "Sous-cat.") : "Sous-categorie"}
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                      {catDropdownOpen && (
                        <div className="absolute top-full mt-2 left-0 z-50 bg-background border border-border rounded-xl shadow-xl min-w-[180px] py-2 overflow-hidden">
                          <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete("sub"); setSearchParams(p, { replace: true }); setCatDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${!subSlug ? "font-bold text-foreground" : "text-muted-foreground"}`}>Tout voir</button>
                          {childCategories.map((child: any) => (
                            <button key={child.id} onClick={() => { const p = new URLSearchParams(searchParams); p.set("sub", child.slug); setSearchParams(p, { replace: true }); setCatDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${subSlug === child.slug ? "font-bold text-foreground" : "text-muted-foreground"}`}>{child.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      if (p.get("inStock") === "true") p.delete("inStock"); else p.set("inStock", "true");
                      setSearchParams(p, { replace: true });
                    }}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors border ${searchParams.get("inStock") === "true" ? "bg-green-500 text-white border-green-500" : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"}`}
                  >En stock</button>
                  {(searchParams.get("catSort") || searchParams.get("onlyPromo") || subSlug || searchParams.get("inStock")) && (
                    <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete("catSort"); p.delete("onlyPromo"); p.delete("sub"); p.delete("inStock"); setSearchParams(p, { replace: true }); }} className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors">x Effacer</button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── GLOBAL FILTERS CAROUSEL (Temu Style) ── */}
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide px-3 py-3 border-y border-border/50 mb-2 mt-4">
            <button
              onClick={() => { const p = new URLSearchParams(); setSearchParams(p); }}
              className={`shrink-0 flex items-center gap-1.5 text-[15px] transition-colors relative pb-1 ${!searchParams.get("sort") && !searchParams.get("promo")
                  ? "font-black text-black"
                  : "font-bold text-gray-500"
                }`}
            >
              Tout
              {!searchParams.get("sort") && !searchParams.get("promo") && (
                <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-5 h-[3px] bg-black rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => { const p = new URLSearchParams(searchParams); p.set("promo", "true"); p.delete("sort"); setSearchParams(p); }}
              className={`shrink-0 flex items-center gap-1.5 text-[15px] transition-colors relative pb-1 ${searchParams.get("promo")
                  ? "font-black text-black"
                  : "font-bold text-gray-500"
                }`}
            >
              <span className="text-[14px]">⚡</span> Offres
              {searchParams.get("promo") && (
                <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-5 h-[3px] bg-black rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => { const p = new URLSearchParams(searchParams); p.set("sort", "bestseller"); p.delete("promo"); setSearchParams(p); }}
              className={`shrink-0 flex items-center gap-1.5 text-[15px] transition-colors relative pb-1 ${searchParams.get("sort") === "bestseller"
                  ? "font-black text-black"
                  : "font-bold text-gray-500"
                }`}
            >
              <span className="text-[14px]">👍</span> Meilleures ventes
              {searchParams.get("sort") === "bestseller" && (
                <span className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-5 h-[3px] bg-black rounded-full"></span>
              )}
            </button>
          </div>

          {/* ── TEMU-STYLE CATEGORIES BROWSE (mobile "Catégories" tab) ── */}
          {categorySlug === 'all' && (
            <div className="flex min-h-[60vh] mt-2 -mx-2 sm:-mx-4">
              {/* Left sidebar: parent categories */}
              <div className="w-24 sm:w-32 shrink-0 bg-muted/40 border-r border-border overflow-y-auto flex flex-col">
                <button
                  onClick={() => setBrowseActiveCat(null)}
                  className={`w-full text-left px-3 py-3 text-xs font-bold transition-colors border-l-2 ${!browseActiveCat ? 'border-primary bg-background text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
                >
                  En vedette
                </button>
                {(categories as any[]).filter((c: any) => !c.parentId && c.active).map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setBrowseActiveCat(cat.id)}
                    className={`w-full text-left px-3 py-3 text-xs font-medium leading-tight transition-colors border-l-2 ${browseActiveCat === cat.id ? 'border-primary bg-background text-primary font-bold' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Right content: subcategory tiles or parent tiles */}
              <div className="flex-1 overflow-y-auto p-3">
                {!browseActiveCat ? (
                  <>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Acheter par catégorie</p>
                    <div className="grid grid-cols-3 gap-3">
                      {(categories as any[]).filter((c: any) => !c.parentId && c.active).map((cat: any) => (
                        <button
                          key={cat.id}
                          onClick={() => { setSearchParams({ category: cat.slug }); }}
                          className="flex flex-col items-center gap-1.5 group"
                        >
                          <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted border border-border group-hover:border-primary/50 transition-all relative">
                            {cat.image ? (
                              <img src={getImageUrl(cat.image)} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-[10px] font-bold text-muted-foreground text-center px-1">{cat.name}</span>
                              </div>
                            )}
                            {(categories as any[]).filter((c: any) => c.parentId === cat.id).length > 3 && (
                              <span className="absolute top-1 right-1 bg-[#ff6b00] text-white text-[8px] font-bold px-1 py-0.5 rounded">HOT</span>
                            )}
                          </div>
                          <span className="text-[10px] sm:text-xs font-medium text-center leading-tight text-foreground line-clamp-2 w-full">
                            {cat.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  (() => {
                    const parent = (categories as any[]).find((c: any) => c.id === browseActiveCat);
                    const subs = (categories as any[]).filter((c: any) => c.parentId === browseActiveCat && c.active);
                    return (
                      <>
                        <button
                          onClick={() => setSearchParams({ category: parent?.slug || '' })}
                          className="w-full mb-3 py-2 px-3 bg-primary text-white rounded-lg text-xs font-bold text-center"
                        >
                          Voir tout — {parent?.name}
                        </button>
                        {subs.length > 0 ? (
                          <div className="grid grid-cols-3 gap-3">
                            {subs.map((sub: any) => (
                              <button
                                key={sub.id}
                                onClick={() => { setSearchParams({ category: parent?.slug || '', sub: sub.slug }); }}
                                className="flex flex-col items-center gap-1.5 group"
                              >
                                <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted border border-border group-hover:border-primary/50 transition-all">
                                  {sub.image ? (
                                    <img src={getImageUrl(sub.image)} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-[9px] font-bold text-muted-foreground text-center px-1">{sub.name}</span>
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] font-medium text-center leading-tight text-foreground line-clamp-2 w-full">
                                  {sub.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-8">Aucune sous-catégorie</p>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* ── RESULTS HEADER ── */}
          {categorySlug !== 'all' && (
          <div className="flex items-center justify-between py-2 mt-1">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Chargement..." : (
                <span><strong className="text-foreground">{filteredProducts.length}</strong> produits</span>
              )}
            </p>
            {(categorySlug || searchParam) && (
              <button
                onClick={() => setSearchParams({}, { replace: true })}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Tout voir
              </button>
            )}
          </div>
          )}

          {/* ── PRODUCT GRID ── */}
          {categorySlug !== 'all' && (
            <>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 py-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border overflow-hidden bg-card/40 animate-pulse">
                      <div className="aspect-[4/5] bg-muted/50" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 w-3/4 bg-muted/60 rounded" />
                        <div className="h-3 w-1/2 bg-muted/50 rounded" />
                        <div className="h-5 w-1/3 bg-muted/70 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : paginatedProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 py-2">
                  {paginatedProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.4) }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24">
                  <p className="text-muted-foreground font-medium">Aucun produit trouvé.</p>
                  <button
                    onClick={() => setSearchParams({}, { replace: true })}
                    className="mt-4 text-sm text-primary font-semibold hover:underline"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}

              {/* ── INFINITE SCROLL SENTINEL ── */}
              {currentPage * ITEMS_PER_PAGE < filteredProducts.length && (
                <div ref={infiniteSentinelRef} className="h-12 flex items-center justify-center py-4">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
