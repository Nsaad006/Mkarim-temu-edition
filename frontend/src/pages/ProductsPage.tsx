import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigationType } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Grid3X3,
  LayoutList,
  SlidersHorizontal,
  Loader2,
  X,
  ChevronRight,
  ChevronLeft,
  Search,
  Package,
  LayoutGrid,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { productsApi } from "@/api/products";
import { categoriesApi } from "@/api/categories";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { FilterSidebar } from "@/components/FilterSidebar";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import SEO from "@/components/SEO";

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const sortBy = searchParams.get("sort") || "featured";
  const searchParam = searchParams.get("search") || "";

  const setSortBy = (val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val && val !== "featured") next.set("sort", val);
      else next.delete("sort");
      return next;
    }, { replace: true });
  };

  // Current page derived from URL
  const currentPage = Number(searchParams.get("page")) || 1;
  const [itemsPerPage, setItemsPerPage] = useState(18); // Default to desktop

  // Responsive items per page
  useEffect(() => {
    const handleResize = () => {
      // Mobile/Tablet -> 16 items
      // Desktop -> 18 items
      if (window.innerWidth < 820) {
        setItemsPerPage(16);
      } else {
        setItemsPerPage(18);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Advanced Filtering State - DERIVED FROM URL
  const filters = useMemo(() => ({
    category: searchParams.get("category") || "all",
    cpus: searchParams.get("cpus")?.split(",") || [],
    gpus: searchParams.get("gpus")?.split(",") || [],
    rams: searchParams.get("rams")?.split(",") || [],
    storages: searchParams.get("storages")?.split(",") || [],
    brands: searchParams.get("brands")?.split(",") || [],
    ecrans: searchParams.get("ecrans")?.split(",") || [],
    periphs: searchParams.get("periphs")?.split(",") || [],
    others: searchParams.get("others")?.split(",") || [],
    games: searchParams.get("games")?.split(",") || [],
    minPrice: Number(searchParams.get("minPrice")) || 0,
    maxPrice: Number(searchParams.get("maxPrice")) || 100000,
    inStockOnly: searchParams.get("inStock") === "true",
  }), [searchParams]);

  const updateFilters = (newFilters: any) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);

      // Update with new filters
      Object.entries(newFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length > 0) params.set(key, value.join(","));
          else params.delete(key);
        } else if (typeof value === "boolean") {
          if (value) params.set(key, "true");
          else params.delete(key);
        } else if (typeof value === "number") {
          if (key === "minPrice" && value > 0) params.set(key, value.toString());
          else if (key === "maxPrice" && value < 100000) params.set(key, value.toString());
          else if (key !== "minPrice" && key !== "maxPrice") params.set(key, value.toString());
          else params.delete(key);
        } else if (value && value !== "all") {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });

      // Filter changes always reset page to 1
      params.delete("page");

      return params;
    }, { replace: true });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (page > 1) params.set("page", page.toString());
      else params.delete("page");
      return params;
    }, { replace: false }); // PUSH for pagination
    window.scrollTo(0, 0);
  };


  // Fetch all products

  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll({ published: true }),
  });

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
  });

  const isLoading = productsLoading || categoriesLoading;

  // Complex Client-side Filtering
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      // Search
      if (searchParam && !product.name.toLowerCase().includes(searchParam.toLowerCase())) return false;

      // Category
      const selectedCat = categories.find(c => c.slug === filters.category || c.id === filters.category);
      if (filters.category !== "all" &&
        product.categoryId !== selectedCat?.id &&
        product.categoryId !== selectedCat?.slug) return false;

      // Price
      if (product.price < filters.minPrice || product.price > filters.maxPrice) return false;

      // Stock
      if (filters.inStockOnly && !product.inStock) return false;

      const productText = (product.name + " " + (product.specs?.join(" ") || "") + " " + (product.description || "")).toLowerCase();

      // CPU
      if (filters.cpus?.length > 0) {
        if (!filters.cpus.some(cpu => productText.includes(cpu.toLowerCase()))) return false;
      }

      // GPU
      if (filters.gpus?.length > 0) {
        if (!filters.gpus.some(gpu => productText.includes(gpu.toLowerCase()))) return false;
      }

      // RAM
      if (filters.rams?.length > 0) {
        if (!filters.rams.some(ram => productText.includes(ram.toLowerCase()))) return false;
      }

      // Storage
      if (filters.storages?.length > 0) {
        if (!filters.storages.some(storage => productText.includes(storage.toLowerCase()))) return false;
      }

      // Brands (Marque)
      if (filters.brands?.length > 0) {
        if (!filters.brands.some(brand => productText.includes(brand.toLowerCase()))) return false;
      }

      // Display (Écran)
      if (filters.ecrans?.length > 0) {
        if (!filters.ecrans.some(ecran => productText.includes(ecran.toLowerCase()))) return false;
      }

      // Peripherals
      if (filters.periphs?.length > 0) {
        if (!filters.periphs.some(val => productText.includes(val.toLowerCase()))) return false;
      }

      // Dynamic Specs (Others)
      if (filters.others?.length > 0) {
        if (!filters.others.some(spec => productText.includes(spec.toLowerCase()))) return false;
      }

      // Games
      if (filters.games?.length > 0) {
        if (!filters.games.some(game => productText.includes(game.toLowerCase()))) return false;
      }

      return true;
    });
  }, [allProducts, filters, searchParam]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "name": return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [filteredProducts, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  const navigationType = useNavigationType();

  const removeFilter = (type: string, value?: string) => {
    if (type === 'search') {
      updateFilters({ search: "" });
      return;
    }

    if (type === 'minPrice' || type === 'maxPrice' || type === 'price') {
      updateFilters({ minPrice: 0, maxPrice: 100000 });
      return;
    }

    if (type === 'inStockOnly') {
      updateFilters({ inStock: "" });
      return;
    }

    if (type === 'category') {
      updateFilters({ category: 'all' });
      return;
    }

    const current = (filters as any)[type] || [];
    updateFilters({
      [type]: current.filter((v: string) => v !== value)
    });
  };

  const activeFilterChips = useMemo(() => {
    const chips: { type: string, value: string, label: string }[] = [];
    if (searchParam) chips.push({ type: 'search', value: searchParam, label: `Recherche: ${searchParam}` });
    if (filters.category !== 'all') chips.push({ type: 'category', value: filters.category, label: `Cat: ${filters.category}` });
    filters.cpus.forEach(v => chips.push({ type: 'cpus', value: v, label: v.toUpperCase() }));
    filters.gpus.forEach(v => chips.push({ type: 'gpus', value: v, label: v.toUpperCase() }));
    filters.rams.forEach(v => chips.push({ type: 'rams', value: v, label: v.toUpperCase() }));
    filters.storages.forEach(v => chips.push({ type: 'storages', value: v, label: v.toUpperCase() }));
    filters.brands.forEach(v => chips.push({ type: 'brands', value: v, label: v.toUpperCase() }));
    filters.ecrans.forEach(v => chips.push({ type: 'ecrans', value: v, label: v.toUpperCase() }));
    filters.periphs.forEach(v => chips.push({ type: 'periphs', value: v, label: v.toUpperCase() }));
    filters.others.forEach(v => chips.push({ type: 'others', value: v, label: v.toUpperCase() }));
    filters.games.forEach(v => chips.push({ type: 'games', value: v, label: v.toUpperCase() }));
    if (filters.minPrice > 0 || filters.maxPrice < 100000) {
      chips.push({ type: 'price', value: 'price', label: `${filters.minPrice}-${filters.maxPrice} MAD` });
    }
    if (filters.inStockOnly) chips.push({ type: 'inStockOnly', value: 'true', label: 'En Stock' });
    return chips;
  }, [filters, searchParam]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      <SEO
        title="Catalogue Produits"
        description="Explorez notre arsenal de PC Gamers, composants et accessoires. Trouvez le meilleur matériel informatique au Maroc avec livraison express."
      />
      <Navbar />
      <main className="pt-24 lg:pt-32">
        {/* Simplified Header */}
        <section className="relative py-8 lg:py-12 border-b border-border">
          <div className="container-custom relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-8 group"
                >
                  <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                  Accueil
                </Link>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-6 bg-primary skew-x-[-15deg]" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">ARSYENAL MKARIM</span>
                </div>
                <h1 className="font-display text-5xl md:text-6xl font-black text-foreground italic uppercase tracking-tighter">
                  Catalogue <span className="text-primary tracking-tight">Tech</span>
                </h1>
              </div>


              {/* Desktop Count Card */}
              <div className="hidden lg:block relative group overflow-hidden bg-card/50 backdrop-blur-xl p-1 rounded-2xl border border-border shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center gap-4 px-6 py-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em]">Articles Trouvés</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-foreground italic tracking-tighter shadow-sm">{sortedProducts.length}</span>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Items</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Count Card */}
              <div className="lg:hidden w-full relative overflow-hidden bg-card/50 backdrop-blur-xl rounded-2xl border border-border">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-background to-muted border border-border flex items-center justify-center shadow-inner">
                      <LayoutGrid className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Catalogue</span>
                      </div>
                      <h3 className="text-xl font-black text-foreground italic tracking-tighter">
                        {sortedProducts.length} <span className="text-sm text-muted-foreground not-italic font-bold">Produits</span>
                      </h3>
                    </div>
                  </div>

                  {/* Decorative line */}
                  <div className="h-8 w-[1px] bg-border skew-x-[-15deg]" />

                  <div className="text-right">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Status</span>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-green-500 uppercase">En Ligne</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container-custom py-12">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky bottom-8 rounded-3xl overflow-hidden shadow-2xl border border-border bg-card">
                <FilterSidebar
                  products={allProducts}
                  categories={categories}
                  activeFilters={filters}
                  updateFilters={updateFilters}
                  expand={true}
                  currentSort={sortBy}
                  onSortChange={setSortBy}
                />
              </div>
            </aside>

            {/* Mobile Filter Trigger */}
            <div className="lg:hidden">
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full h-14 bg-card border-border text-foreground font-black uppercase tracking-tighter sm:tracking-normal rounded-2xl shadow-xl px-4">
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                      <span className="text-[11px] sm:text-base font-black whitespace-nowrap">UNITÉ DE FILTRAGE</span>
                    </div>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 bg-transparent border-none w-[300px] sm:w-[350px]">
                  <SheetTitle className="sr-only">Filtres</SheetTitle>
                  <SheetDescription className="sr-only">Options de filtrage pour le catalogue produits</SheetDescription>
                  <FilterSidebar
                    products={allProducts}
                    categories={categories}
                    activeFilters={filters}
                    updateFilters={updateFilters}
                    onClose={() => setShowFilters(false)}
                    currentSort={sortBy}
                    onSortChange={setSortBy}
                  />
                </SheetContent>
              </Sheet>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-8">

              {/* Active Filter Chips */}
              <AnimatePresence>
                {activeFilterChips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 items-center"
                  >
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2">ACTIF:</span>
                    {activeFilterChips.map((chip) => (
                      <motion.div
                        key={`${chip.type}-${chip.value}`}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full group hover:border-primary/50 transition-colors"
                      >
                        <span className="text-[10px] font-black text-primary uppercase tracking-wider">{chip.label}</span>
                        <button
                          onClick={() => removeFilter(chip.type, chip.value)}
                          className="text-primary/40 hover:text-primary transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                    <button
                      onClick={() => updateFilters({
                        category: 'all',
                        cpus: [],
                        gpus: [],
                        rams: [],
                        storages: [],
                        brands: [],
                        ecrans: [],
                        periphs: [],
                        others: [],
                        games: [],
                        minPrice: 0,
                        maxPrice: 100000,
                        inStockOnly: false,
                        search: ""
                      })}
                      className="text-[10px] font-black text-muted-foreground hover:text-foreground uppercase tracking-widest ml-2 transition-colors underline underline-offset-4"
                    >
                      Réinitialiser tout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Products Area */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6 bg-muted/20 rounded-3xl border border-border">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 animate-spin text-primary" />
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                  </div>
                  <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-xs">Synchronisation du catalogue...</p>
                </div>
              ) : sortedProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 md:gap-8">
                    {paginatedProducts.map((product, idx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12 flex justify-center">
                      <Pagination>
                        <PaginationContent className="gap-2">
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                              className={`cursor-pointer bg-card border-border text-foreground hover:bg-accent hover:text-primary gap-1 pl-2.5 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                              size="default"
                              aria-label="Page précédente"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span className="hidden sm:inline">Précédent</span>
                            </PaginationLink>
                          </PaginationItem>

                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            const isCurrent = currentPage === page;
                            const isNeighbor = page >= currentPage - 1 && page <= currentPage + 1;
                            const isFirst = page === 1;
                            const isLast = page === totalPages;

                            // Show first page, last page, current page, and pages around current
                            if (isFirst || isLast || isNeighbor) {
                              // On mobile, only show neighbors (current, prev, next).
                              // Hide first/last if they are not neighbors.
                              const responsiveClass = (!isNeighbor) ? "hidden sm:block" : "";

                              return (
                                <PaginationItem key={page} className={responsiveClass}>
                                  <PaginationLink
                                    onClick={() => handlePageChange(page)}
                                    isActive={isCurrent}
                                    className={`cursor-pointer ${isCurrent
                                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                      : 'bg-card border-border text-foreground hover:bg-accent hover:text-primary'
                                      }`}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                              return (
                                <PaginationItem key={page} className="hidden sm:block">
                                  <PaginationEllipsis className="text-muted-foreground" />
                                </PaginationItem>
                              );
                            }
                            return null;
                          })}

                          <PaginationItem>
                            <PaginationLink
                              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                              className={`cursor-pointer bg-card border-border text-foreground hover:bg-accent hover:text-primary gap-1 pr-2.5 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                              size="default"
                              aria-label="Page suivante"
                            >
                              <span className="hidden sm:inline">Suivant</span>
                              <ChevronRight className="h-4 w-4" />
                            </PaginationLink>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-40 bg-muted/20 rounded-3xl border border-dashed border-border"
                >
                  <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                  <h3 className="font-display text-2xl font-black text-foreground italic uppercase tracking-tighter mb-2">
                    Aucune Correspondance
                  </h3>
                  <p className="text-muted-foreground font-medium max-w-xs mx-auto mb-8">
                    Le matériel spécifié n'est pas disponible dans notre arsenal actuel.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => updateFilters({
                      category: 'all',
                      cpus: [],
                      gpus: [],
                      rams: [],
                      storages: [],
                      brands: [],
                      ecrans: [],
                      periphs: [],
                      others: [],
                      games: [],
                      minPrice: 0,
                      maxPrice: 100000,
                      inStockOnly: false,
                      search: ""
                    })}
                    className="border-border text-foreground hover:bg-accent font-black uppercase tracking-widest h-12 rounded-xl"
                  >
                    Réinitialiser les paramètres
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductsPage;
