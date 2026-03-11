import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/api/products";
import { citiesApi } from "@/api/cities";
import { ordersApi } from "@/api/orders";
import { settingsApi } from "@/api/settings";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
    Loader2, CheckCircle2, User, Phone, MapPin, Truck, ShieldCheck, Zap,
    Cpu, HardDrive, Tag, CircuitBoard, Monitor, LayoutGrid, Power, Box,
    Snowflake, Maximize, RefreshCw, Activity, Wifi, Battery, Scale,
    Keyboard, MousePointer2, Target, Palette, Terminal, Layers
} from "lucide-react";
import { AxiosError } from "axios";
import { getImageUrl } from "@/lib/image-utils";

const PromoPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currency } = useSettings();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        city: "",
        address: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const getSpecIcon = (key?: string) => {
        if (!key) return LayoutGrid;
        const normalized = key.toLowerCase().trim();

        if (normalized.includes('cpu') || normalized.includes('processeur')) return Cpu;
        if (normalized.includes('gpu') || normalized.includes('graphique')) return Zap;
        if (normalized.includes('ram') || normalized.includes('memoire')) return CircuitBoard;
        if (normalized.includes('stockage') || normalized.includes('disque') || normalized.includes('ssd') || normalized.includes('hdd')) return HardDrive;
        if (normalized.includes('marque')) return Tag;
        if (normalized.includes('carte_mere') || normalized.includes('motherboard')) return CircuitBoard;
        if (normalized.includes('alimentation') || normalized.includes('psu')) return Power;
        if (normalized.includes('boitier') || normalized.includes('case')) return Box;
        if (normalized.includes('refroidissement') || normalized.includes('cooling')) return Snowflake;
        if (normalized.includes('resolution') || normalized.includes('affichage')) return Maximize;
        if (normalized.includes('frequence') || normalized.includes('rafraichissement') || normalized.includes('hz')) return RefreshCw;
        if (normalized.includes('connectivite') || normalized.includes('wifi') || normalized.includes('bluetooth')) return Wifi;
        if (normalized.includes('batterie') || normalized.includes('autonomie')) return Battery;
        if (normalized.includes('poids') || normalized.includes('weight')) return Scale;
        if (normalized.includes('chipset')) return Cpu;
        if (normalized.includes('format')) return Layers;
        if (normalized.includes('switch') || normalized.includes('clavier')) return Keyboard;
        if (normalized.includes('dpi') || normalized.includes('sensibilite')) return MousePointer2;
        if (normalized.includes('capteur') || normalized.includes('sensor')) return Target;
        if (normalized.includes('rgb') || normalized.includes('eclairage') || normalized.includes('couleur')) return Palette;
        if (normalized.includes('polling') || normalized.includes('rapport')) return Activity;
        if (normalized.includes('garantie') || normalized.includes('warranty')) return ShieldCheck;
        if (normalized.includes('systeme') || normalized.includes('os') || normalized.includes('windows')) return Terminal;
        if (normalized.includes('ecran') || normalized.includes('display')) return Monitor;

        return LayoutGrid;
    };

    // Fetch product
    const { data: product, isLoading: isLoadingProduct } = useQuery({
        queryKey: ['product', id],
        queryFn: () => productsApi.getById(id!),
        enabled: !!id,
    });

    // Fetch cities
    const { data: cities = [] } = useQuery({
        queryKey: ['cities'],
        queryFn: () => citiesApi.getAll(),
    });

    // Fetch settings
    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: () => settingsApi.get(),
    });

    if (isLoadingProduct) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-center px-4">
                <h1 className="text-3xl font-black mb-4">Produit Introuvable</h1>
                <p className="text-muted-foreground mb-8">Ce produit n'est plus disponible ou le lien est invalide.</p>
                <Button onClick={() => navigate("/")} variant="outline">Retourner à l'accueil</Button>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!formData.fullName || formData.fullName.trim().length < 2) {
            newErrors.fullName = "Champ obligatoire";
        }

        if (!formData.phone) {
            newErrors.phone = "Champ obligatoire";
        } else {
            const phoneRegex = /^(\+212|0)[5-7]\d{8}$/;
            if (!phoneRegex.test(formData.phone.replace(/\s/g, ""))) {
                newErrors.phone = "Numéro invalide (Ex: 06XXXXXXXX)";
            }
        }

        if (!formData.city) {
            newErrors.city = "Champ obligatoire";
        } else if (!cities.some(c => c.name.toLowerCase() === formData.city.toLowerCase())) {
            newErrors.city = "Merci de choisir une ville dans la liste";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        setIsSubmitting(true);

        try {
            const order = await ordersApi.create({
                items: [{
                    productId: product.id,
                    quantity: 1
                }],
                customerName: formData.fullName,
                phone: formData.phone.replace(/\s/g, ""),
                city: formData.city,
                address: formData.address || "-",
            });

            toast({
                title: "Commande confirmée !",
                description: `Votre commande a été enregistrée avec succès.`,
            });

            navigate(`/order-success?orderNumber=${order.orderNumber}`);

        } catch (err) {
            const error = err as AxiosError<{ error: string }>;
            toast({
                title: "Erreur",
                description: error.response?.data?.error || "Une erreur est survenue.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedCity = cities.find(c => c.name.toLowerCase() === formData.city.toLowerCase());
    let shippingFee = selectedCity?.shippingFee || 0;

    // Check free shipping logic
    const freeShippingEnabled = settings?.freeShippingEnabled ?? false;
    const freeShippingThreshold = settings?.freeShippingThreshold ?? 0;

    if (freeShippingEnabled && freeShippingThreshold > 0 && product.price >= freeShippingThreshold) {
        shippingFee = 0;
    }

    const total = product.price + (formData.city && settings ? shippingFee : 0);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20 font-sans selection:bg-primary selection:text-white">
            {/* Header/Logo Line */}
            <div className="w-full bg-white dark:bg-zinc-900 border-b border-border shadow-sm sticky top-0 z-50 py-4 px-6 flex justify-center items-center">
                {settings?.logo ? (
                    <img src={getImageUrl(settings.logo)} alt="Logo" className="h-8 md:h-10 object-contain" />
                ) : (
                    <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-primary">
                        MKARIM <span className="text-foreground">SOLUTION</span>
                    </h1>
                )}
            </div>

            <div className="max-w-4xl mx-auto mt-6 md:mt-10 px-4 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
                {/* Product Visuals */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-border shadow-xl">
                        <div className="aspect-square relative mb-6 rounded-2xl overflow-hidden bg-muted/30">
                            <img
                                src={getImageUrl(product.image)}
                                alt={product.name}
                                className="w-full h-full object-contain p-4"
                            />
                            {product.originalPrice && product.originalPrice > product.price && (
                                <div className="absolute top-4 right-4 bg-red-500 text-white font-black px-3 py-1 rounded-full text-sm transform rotate-3 shadow-lg">
                                    PROMO
                                </div>
                            )}
                        </div>

                        <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-foreground leading-tight mb-4">
                            {product.name}
                        </h1>

                        <div className="flex items-baseline gap-3 mb-6">
                            <span className="text-4xl md:text-5xl font-black italic text-primary">
                                {product.price.toLocaleString()} <span className="text-xl">DH</span>
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                                <span className="text-xl text-muted-foreground line-through font-bold">
                                    {product.originalPrice.toLocaleString()} DH
                                </span>
                            )}
                        </div>

                        {product.description && (
                            <div className="text-muted-foreground text-sm font-medium leading-relaxed space-y-2 mb-8 bg-muted/20 p-4 lg:p-6 rounded-2xl border border-border">
                                {product.description.split(/;|\n/).map((line: string, index: number) => {
                                    const trimmedLine = line.trim();
                                    return trimmedLine ? <p key={index} className="flex gap-2"><span className="text-primary">•</span> <span>{trimmedLine}</span></p> : null;
                                })}
                            </div>
                        )}

                        {/* Specs / Components */}
                        {product.specs && product.specs.length > 0 && (
                            <div className="space-y-4 mb-8">
                                <h3 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em] ml-1 bg-muted inline-block px-3 py-1 rounded-sm">COMPOSANTS & SPÉCIFICATIONS</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {product.specs.map((spec: string, index: number) => {
                                        const match = spec.match(/^\{([^}]+)\}:\s*(.+)$/);
                                        const key = match ? match[1] : undefined;
                                        const displayValue = match ? match[2] : spec;
                                        const Icon = getSpecIcon(key);

                                        return (
                                            <div key={index} className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-border p-3 rounded-xl shadow-sm">
                                                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                                                    <Icon className="w-5 h-5 text-primary" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                                                        {key || 'Info'}
                                                    </span>
                                                    <span className="text-sm font-bold text-foreground uppercase tracking-tight truncate">
                                                        {displayValue}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quick Guarantees */}
                        <div className="space-y-3 pt-6 border-t border-border">
                            <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Truck className="w-4 h-4" />
                                </div>
                                Paiement à la livraison (Cash on Delivery)
                            </div>
                            <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Zap className="w-4 h-4" />
                                </div>
                                Livraison rapide partout au Maroc
                            </div>
                            <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                Produit 100% Neuf & Garanti
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Order Form */}
                <div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-border shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl" />

                        <div className="text-center mb-8 relative z-10">
                            <h2 className="text-xl lg:text-2xl font-black italic uppercase text-foreground">
                                DEMANDEZ LE VOTRE <span className="text-primary">MAINTENANT</span>
                            </h2>
                            <p className="text-sm font-bold text-muted-foreground mt-2">
                                Remplissez vos informations, nous vous contacterons pour confirmer la livraison.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Nom complet
                                </Label>
                                <Input
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Ex: Ahmed Benjelloun"
                                    className={`h-12 rounded-xl font-bold bg-zinc-50 dark:bg-zinc-950 ${errors.fullName ? "border-red-500 focus:border-red-500" : ""}`}
                                />
                                {errors.fullName && <p className="text-[10px] font-bold text-red-500">{errors.fullName}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5" /> Téléphone
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Ex: 06 12 34 56 78"
                                    className={`h-12 rounded-xl font-bold bg-zinc-50 dark:bg-zinc-950 ${errors.phone ? "border-red-500 focus:border-red-500" : ""}`}
                                />
                                {errors.phone && <p className="text-[10px] font-bold text-red-500">{errors.phone}</p>}
                            </div>

                            <div className="space-y-2 relative">
                                <Label htmlFor="city" className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> Ville de livraison
                                </Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="EX: CASABLANCA"
                                    autoComplete="off"
                                    className={`h-12 rounded-xl font-bold uppercase bg-zinc-50 dark:bg-zinc-950 ${errors.city ? "border-red-500 focus:border-red-500" : ""}`}
                                />
                                {formData.city.length > 0 && !cities.some(c => c.name.toLowerCase() === formData.city.toLowerCase()) && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                        {cities
                                            .filter(city => city.name.toLowerCase().includes(formData.city.toLowerCase()))
                                            .map((city) => (
                                                <button
                                                    key={city.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, city: city.name });
                                                        setErrors({ ...errors, city: "" });
                                                    }}
                                                    className="w-full px-4 py-3 text-left hover:bg-primary/10 border-b border-border/50 flex justify-between items-center"
                                                >
                                                    <span className="font-bold text-sm uppercase">{city.name}</span>
                                                    <span className="text-[10px] text-muted-foreground font-bold">
                                                        {city.shippingFee} DH
                                                    </span>
                                                </button>
                                            ))}
                                    </div>
                                )}
                                {errors.city && <p className="text-[10px] font-bold text-red-500">{errors.city}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address" className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2">
                                    Adresse (Facultatif)
                                </Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Quartier, rue..."
                                    className="h-12 rounded-xl font-bold bg-zinc-50 dark:bg-zinc-950"
                                />
                            </div>

                            {/* Summary inside form */}
                            {formData.city && settings && (
                                <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-950 border border-border rounded-xl space-y-2">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="text-muted-foreground uppercase">Sous-total</span>
                                        <span>{product.price.toLocaleString()} DH</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="text-muted-foreground uppercase">Livraison</span>
                                        <span className={shippingFee === 0 ? "text-green-500" : ""}>
                                            {shippingFee > 0 ? `+${shippingFee} DH` : "GRATUITE"}
                                        </span>
                                    </div>
                                    <div className="border-t border-border pt-2 mt-2 flex justify-between items-baseline font-black">
                                        <span className="text-lg uppercase italic">TOTAL</span>
                                        <span className="text-2xl text-primary italic">{total.toLocaleString()} DH</span>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-14 text-white text-lg font-black italic tracking-wider flex items-center justify-center gap-3 mt-6 hover:-translate-y-1 transition-transform shadow-[0_10px_20px_rgba(235,68,50,0.2)]"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-6 h-6" />
                                        ACHETER MAINTENANT
                                    </>
                                )}
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PromoPage;
