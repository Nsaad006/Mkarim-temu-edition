import { useState, useEffect, useMemo } from "react";
import {
    ChevronDown,
    Check,
    Zap,
    Filter
} from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@/data/products";
import { Category } from "@/api/categories";

import * as LucideIcons from "lucide-react";

interface FilterSidebarProps {
    products: Product[];
    categories: Category[];
    activeFilters: any;
    updateFilters: (filters: any) => void;
    onClose?: () => void;
    expand?: boolean; // New prop to control expansion
    currentSort?: string;
    onSortChange?: (sort: string) => void;
    settings?: any;
}

export const FilterSidebar = ({ products, categories, activeFilters, updateFilters, onClose, expand = false, currentSort, onSortChange, settings }: FilterSidebarProps) => {

    // Safety resolver for category icons
    const getCategoryIcon = (cat: any) => {
        // ... (existing logic)
        // 1. Try resolving by explicitly stored DB icon name
        if (cat.icon) {
            const iconName = cat.icon;
            const normalizedInput = iconName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

            // Handle common aliases/typos/French terms
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
            const foundKey = Object.keys(LucideIcons).find(
                key => key.toLowerCase() === target
            );
            if (foundKey) return (LucideIcons as any)[foundKey];
        }

        // 2. Try resolving by slug mapping fallback
        const slug = cat.slug || cat.id;
        const slugMapping: Record<string, any> = {
            'gaming-pc': LucideIcons.Gamepad2,
            'laptops': LucideIcons.Laptop,
            'gaming-monitors': LucideIcons.Tv,
            'monitors': LucideIcons.Monitor,
            'gaming-headsets': LucideIcons.Headset,
            'gaming-mice': LucideIcons.Mouse,
            'gaming-keyboards': LucideIcons.Keyboard,
            'desktops': LucideIcons.Boxes,
            'earphones': LucideIcons.Bluetooth,
            'it-accessories': LucideIcons.Cable,
            'components': LucideIcons.Cpu,
            'trottinette': LucideIcons.Bike,
            'all': LucideIcons.LayoutGrid
        };

        if (slugMapping[slug]) return slugMapping[slug];

        // 3. Fallback to generic filter
        return Filter;
    };
    const [priceRange, setPriceRange] = useState<[number, number]>([
        activeFilters.minPrice || 0,
        activeFilters.maxPrice || 100000
    ]);

    useEffect(() => {
        setPriceRange([activeFilters.minPrice || 0, activeFilters.maxPrice || 100000]);
    }, [activeFilters.minPrice, activeFilters.maxPrice]);

    const handlePriceChange = (value: number[]) => {
        setPriceRange([value[0], value[1]]);
    };

    const applyPriceFilter = () => {
        updateFilters({ ...activeFilters, minPrice: priceRange[0], maxPrice: priceRange[1] });
    };

    const toggleArrayFilter = (field: string, value: string) => {
        const current = activeFilters[field] || [];
        const updated = current.includes(value)
            ? current.filter((v: string) => v !== value)
            : [...current, value];
        updateFilters({ ...activeFilters, [field]: updated });
    };

    // Extract Specs Dynamically based on current category products
    const dynamicSpecs = useMemo(() => {
        if (!products || products.length === 0) return { cpus: [], gpus: [], others: [], rams: [], storages: [], brands: [] };

        const cpus = new Set<string>();
        const gpus = new Set<string>();
        const rams = new Set<string>();
        const storages = new Set<string>();
        const brands = new Set<string>();
        const ecrans = new Set<string>();
        const periphs = new Set<string>();
        const others = new Set<string>();

        // Legacy keyword matchers (fallback)
        const cpuKeywords = ['ryzen', 'core i', 'intel', 'amd'];
        const gpuKeywords = ['rtx', 'gtx', 'radeon', 'rx', 'nvidia'];

        // 1. Resolve active category
        const activeCatObj = activeFilters.category === 'all'
            ? null
            : categories.find(c => String(c.slug) === String(activeFilters.category) || String(c.id) === String(activeFilters.category));

        // 2. Filter products that belong to this category (only if not 'all')
        const relevantProducts = activeCatObj
            ? products.filter(p => String(p.categoryId) === String(activeCatObj.id) || String(p.categoryId) === String(activeCatObj.slug))
            : products;

        // 3. Extract and categorize specs
        relevantProducts.forEach(product => {
            if (product.specs && Array.isArray(product.specs)) {
                product.specs.forEach(spec => {
                    // Try parsing structured format {key}: value
                    const match = spec.match(/^\{([^}]+)\}:\s*(.+)$/);

                    if (match) {
                        const key = match[1].toLowerCase().trim();
                        const value = match[2].trim();

                        if (key === 'cpu') cpus.add(value);
                        else if (key === 'gpu') gpus.add(value);
                        else if (key === 'ram') rams.add(value);
                        else if (key === 'stockage') storages.add(value);
                        else if (key === 'marque' || key === 'marque_pc') brands.add(value);
                        else if (key === 'ecran' || key === 'resolution' || key === 'frequence') ecrans.add(value);
                        else if (['switch', 'dpi', 'capteur', 'polling_rate', 'eclairage'].includes(key)) periphs.add(value);
                        else others.add(`${key}: ${value}`); // Keep others generic
                    } else {
                        // Legacy handling
                        const lowerSpec = spec.toLowerCase();
                        if (cpuKeywords.some(k => lowerSpec.includes(k))) cpus.add(spec);
                        else if (gpuKeywords.some(k => lowerSpec.includes(k))) gpus.add(spec);
                        else if (spec.trim() !== "") others.add(spec);
                    }
                });
            }
        });

        return {
            cpus: Array.from(cpus).sort(),
            gpus: Array.from(gpus).sort(),
            rams: Array.from(rams).sort(),
            storages: Array.from(storages).sort(),
            brands: Array.from(brands).sort(),
            ecrans: Array.from(ecrans).sort(),
            periphs: Array.from(periphs).sort(),
            others: Array.from(others).sort().slice(0, 20)
        };
    }, [products, activeFilters.category, categories]);

    const resetAll = () => {
        updateFilters({
            category: 'all',
            cpus: [],
            gpus: [],
            others: [],
            games: [],
            minPrice: 0,
            maxPrice: 100000,
            inStockOnly: false,
        });
        if (onClose) onClose();
    };

    const Container = expand ? 'div' : ScrollArea;

    return (
        <div className={`flex flex-col ${expand ? '' : 'h-full border-r'} bg-background border-border w-full lg:w-72`}>
            {/* Header */}
            <div className={`p-6 border-b border-border flex items-center bg-background/80 z-20 ${expand ? '' : 'sticky top-0'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    <h2 className="font-display font-bold text-foreground text-lg   tracking-tight">Filtres</h2>
                </div>
            </div>

            <Container className="flex-1 px-4 py-6">
                <div className="space-y-8 pb-8">

                    {/* Price Range (Permanent Global Filter) - Moved to Top */}
                    <div className="pb-8 border-b border-border">
                        <h3 className="px-2 text-[10px] font-bold text-muted-foreground   mb-4">{settings?.filterBudgetTitle || "Filtre par Budget"}</h3>
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-xl">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-[8px] font-bold text-muted-foreground  tracking-widest px-1">MIN (MAD)</p>
                                    <input
                                        type="number"
                                        value={priceRange[0]}
                                        onChange={(e) => {
                                            const val = Math.min(Number(e.target.value), priceRange[1]);
                                            handlePriceChange([val, priceRange[1]]);
                                            updateFilters({ ...activeFilters, minPrice: val, maxPrice: priceRange[1] });
                                        }}
                                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground  outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[8px] font-bold text-muted-foreground  tracking-widest px-1">MAX (MAD)</p>
                                    <input
                                        type="number"
                                        value={priceRange[1]}
                                        onChange={(e) => {
                                            const val = Math.max(Number(e.target.value), priceRange[0]);
                                            handlePriceChange([priceRange[0], val]);
                                            updateFilters({ ...activeFilters, minPrice: priceRange[0], maxPrice: val });
                                        }}
                                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground  outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            <Slider
                                value={priceRange}
                                min={0}
                                max={100000}
                                step={500}
                                onValueChange={handlePriceChange}
                                onValueCommit={applyPriceFilter}
                            />
                        </div>
                    </div>

                    {/* Sorting (Optional: When passed down) */}
                    {onSortChange && currentSort && (
                        <div className="pb-8 border-b border-border">
                            <h3 className="px-2 text-[10px] font-bold text-muted-foreground   mb-4">{settings?.filterSortTitle || "Ordre de Tri"}</h3>
                            <Select value={currentSort} onValueChange={onSortChange}>
                                <SelectTrigger className="w-full bg-card border-border text-foreground font-bold  tracking-wider h-11">
                                    <SelectValue placeholder="Trier par" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    <SelectItem value="featured">Recommandés</SelectItem>
                                    <SelectItem value="price-asc">Prix Croissant</SelectItem>
                                    <SelectItem value="price-desc">Prix Décroissant</SelectItem>
                                    <SelectItem value="name">Nom A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Stock Status (Added) */}
                    <div className="pb-4 border-b border-border">
                        <div
                            onClick={() => updateFilters({ ...activeFilters, inStockOnly: !activeFilters.inStockOnly })}
                            className={`flex items-center justify-between px-4 py-4 rounded-xl cursor-pointer border transition-all duration-300 ${activeFilters.inStockOnly
                                ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                                : 'bg-card border-border hover:border-primary/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeFilters.inStockOnly ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                    <LucideIcons.PackageCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className={`text-xs font-bold  tracking-wider ${activeFilters.inStockOnly ? 'text-green-500' : 'text-foreground'}`}>En Stock Uniquement</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">Masquer les ruptures</p>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${activeFilters.inStockOnly ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                                {activeFilters.inStockOnly && <Check className="w-3 h-3 text-white" />}
                            </div>
                        </div>
                    </div>



                    {/* Main Filter: Categories */}
                    <div>
                        <h3 className="px-2 text-[10px] font-bold text-muted-foreground   mb-4">{settings?.filterCategoryTitle || "Catégories"}</h3>
                        <div className="space-y-1">
                            {[{ id: 'all', name: 'Tous les Produits', slug: 'all', icon: 'LayoutGrid' }, ...categories].map((cat) => {
                                const categorySlug = (cat as any).slug || cat.id;
                                const Icon = getCategoryIcon(cat);
                                const isActive = activeFilters.category === categorySlug;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => updateFilters({ ...activeFilters, category: categorySlug })}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive
                                            ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(235,68,50,0.3)] translate-x-1'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
                                        <span className="text-xs font-bold   tracking-tight">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dynamic Specs based on Category */}
                    <div className="space-y-6 pt-4 border-t border-border">
                        <h3 className="px-2 text-[10px] font-bold text-muted-foreground   mb-2">Caractéristiques</h3>

                        <Accordion type="multiple" className="w-full space-y-2">
                            {/* Brand Group */}
                            {(dynamicSpecs.brands?.length || 0) > 0 && (
                                <AccordionItem value="brands" className="border-none">
                                    <AccordionTrigger className="flex items-center gap-3 py-3 px-4 bg-muted border border-border rounded-xl hover:bg-accent transition-all hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <LucideIcons.Tag className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground  tracking-wider">Marque</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 px-1">
                                        <div className="space-y-1">
                                            {dynamicSpecs.brands.map((brand) => (
                                                <div
                                                    key={brand}
                                                    onClick={() => toggleArrayFilter('brands', brand)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.brands?.includes(brand) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                            {activeFilters.brands?.includes(brand) && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <span className={`text-xs font-bold  tracking-tight transition-colors ${activeFilters.brands?.includes(brand) ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {brand}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* CPU Group */}
                            {dynamicSpecs.cpus.length > 0 && (
                                <AccordionItem value="cpus" className="border-none">
                                    <AccordionTrigger className="flex items-center gap-3 py-3 px-4 bg-muted border border-border rounded-xl hover:bg-accent transition-all hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <LucideIcons.Cpu className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground  tracking-wider">Processeurs</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 px-1">
                                        <div className="space-y-1">
                                            {dynamicSpecs.cpus.map((cpu) => (
                                                <div
                                                    key={cpu}
                                                    onClick={() => toggleArrayFilter('cpus', cpu)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.cpus?.includes(cpu) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                            {activeFilters.cpus?.includes(cpu) && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <span className={`text-xs font-bold  tracking-tight transition-colors ${activeFilters.cpus?.includes(cpu) ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {cpu}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* GPU Group */}
                            {dynamicSpecs.gpus.length > 0 && (
                                <AccordionItem value="gpus" className="border-none">
                                    <AccordionTrigger className="flex items-center gap-3 py-3 px-4 bg-muted border border-border rounded-xl hover:bg-accent transition-all hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <Zap className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground  tracking-wider">Graphisme (GPU)</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 px-1">
                                        <div className="space-y-1">
                                            {dynamicSpecs.gpus.map((gpu) => (
                                                <div
                                                    key={gpu}
                                                    onClick={() => toggleArrayFilter('gpus', gpu)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.gpus?.includes(gpu) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                            {activeFilters.gpus?.includes(gpu) && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <span className={`text-xs font-bold  tracking-tight transition-colors ${activeFilters.gpus?.includes(gpu) ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {gpu}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* RAM Group */}
                            {(dynamicSpecs.rams?.length || 0) > 0 && (
                                <AccordionItem value="rams" className="border-none">
                                    <AccordionTrigger className="flex items-center gap-3 py-3 px-4 bg-muted border border-border rounded-xl hover:bg-accent transition-all hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <LucideIcons.Cpu className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground  tracking-wider">Mémoire (RAM)</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 px-1">
                                        <div className="space-y-1">
                                            {dynamicSpecs.rams.map((ram) => (
                                                <div
                                                    key={ram}
                                                    onClick={() => toggleArrayFilter('rams', ram)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.rams?.includes(ram) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                            {activeFilters.rams?.includes(ram) && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <span className={`text-xs font-bold  tracking-tight transition-colors ${activeFilters.rams?.includes(ram) ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {ram}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* Display (Écran) Group */}
                            {(dynamicSpecs.ecrans?.length || 0) > 0 && (
                                <AccordionItem value="ecrans" className="border-none">
                                    <AccordionTrigger className="flex items-center gap-3 py-3 px-4 bg-muted border border-border rounded-xl hover:bg-accent transition-all hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <LucideIcons.Tv className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground  tracking-wider">Écran & Affichage</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 px-1">
                                        <div className="space-y-1">
                                            {dynamicSpecs.ecrans.map((ecran) => (
                                                <div
                                                    key={ecran}
                                                    onClick={() => toggleArrayFilter('ecrans', ecran)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.ecrans?.includes(ecran) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                            {activeFilters.ecrans?.includes(ecran) && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <span className={`text-xs font-bold  tracking-tight transition-colors ${activeFilters.ecrans?.includes(ecran) ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {ecran}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* Storage (Stockage) Group */}
                            {(dynamicSpecs.storages?.length || 0) > 0 && (
                                <AccordionItem value="storages" className="border-none">
                                    <AccordionTrigger className="flex items-center gap-3 py-3 px-4 bg-muted border border-border rounded-xl hover:bg-accent transition-all hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <LucideIcons.HardDrive className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground  tracking-wider">Stockage</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 px-1">
                                        <div className="space-y-1">
                                            {dynamicSpecs.storages.map((storage) => (
                                                <div
                                                    key={storage}
                                                    onClick={() => toggleArrayFilter('storages', storage)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.storages?.includes(storage) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                            {activeFilters.storages?.includes(storage) && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <span className={`text-xs font-bold  tracking-tight transition-colors ${activeFilters.storages?.includes(storage) ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {storage}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* Peripherals (Périphériques) Group */}
                            {(dynamicSpecs.periphs?.length || 0) > 0 && (
                                <AccordionItem value="periphs" className="border-none">
                                    <AccordionTrigger className="flex items-center gap-3 py-3 px-4 bg-muted border border-border rounded-xl hover:bg-accent transition-all hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <LucideIcons.MousePointer2 className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground  tracking-wider">Specs Périphériques</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 px-1">
                                        <div className="space-y-1">
                                            {dynamicSpecs.periphs.map((val) => (
                                                <div
                                                    key={val}
                                                    onClick={() => toggleArrayFilter('periphs', val)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.periphs?.includes(val) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                            {activeFilters.periphs?.includes(val) && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <span className={`text-xs font-bold  tracking-tight transition-colors ${activeFilters.periphs?.includes(val) ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {val}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}

                            {/* Other Specs (dynamic per category) */}
                            {dynamicSpecs.others.length > 0 && (
                                <AccordionItem value="others" className="border-none">
                                    <AccordionTrigger className="flex items-center gap-3 py-3 px-4 bg-muted border border-border rounded-xl hover:bg-accent transition-all hover:no-underline">
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <LucideIcons.Boxes className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-foreground  tracking-wider">
                                                {activeFilters.category === 'all' ? 'Hardware Global' : 'Filtres Avancés'}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 px-1">
                                        <div className="space-y-1">
                                            {dynamicSpecs.others.map((spec) => (
                                                <div
                                                    key={spec}
                                                    onClick={() => toggleArrayFilter('others', spec)}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeFilters.others?.includes(spec) ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                            {activeFilters.others?.includes(spec) && <Check className="w-3 h-3 text-primary-foreground" />}
                                                        </div>
                                                        <span className={`text-[11px] font-bold  tracking-tight transition-colors ${activeFilters.others?.includes(spec) ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                            {spec}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>
                    </div>


                </div>
            </Container>

            {/* Mobile Apply Button */}
            {onClose && (
                <div className="p-6 border-t border-border bg-background/80">
                    <Button size="xl" className="w-full" onClick={onClose}>
                        Valider le Matériel
                    </Button>
                </div>
            )}
        </div>
    );
};

