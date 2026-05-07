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
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, User, Phone, MapPin, Truck, ShieldCheck, Zap, Star, Clock, Package, BadgePercent, ChevronDown } from "lucide-react";
import { AxiosError } from "axios";
import { getImageUrl } from "@/lib/image-utils";
import { ProductImageGallery } from "@/components/ProductImageGallery";

/* ─── Countdown Timer ─────────────────────────── */
const useCountdown = (minutes = 15) => {
  const [secs, setSecs] = useState(minutes * 60);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return { m, s, expired: secs === 0 };
};

/* ─── Main Component ──────────────────────────── */
const PromoPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currency } = useSettings();
  const { m, s } = useCountdown(18);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [formData, setFormData] = useState({ fullName: "", phone: "", city: "", address: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.getById(id!),
    enabled: !!id,
  });
  const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: citiesApi.getAll });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
    </div>
  );
  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-4">
      <h1 className="text-2xl font-bold mb-4">Produit Introuvable</h1>
      <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
    </div>
  );

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const selectedCity = cities.find(c => c.name.toLowerCase() === formData.city.toLowerCase());
  let shippingFee = selectedCity?.shippingFee || 0;
  if (settings?.freeShippingEnabled && settings.freeShippingThreshold && product.price >= settings.freeShippingThreshold) shippingFee = 0;
  const total = product.price + (formData.city && settings ? shippingFee : 0);

  const filteredCities = cities.filter(c => c.name.toLowerCase().includes(formData.city.toLowerCase()));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) e.fullName = "Nom obligatoire";
    if (!formData.phone) { e.phone = "Téléphone obligatoire"; }
    else if (!/^(\+212|0)[5-7]\d{8}$/.test(formData.phone.replace(/\s/g, ""))) e.phone = "Ex: 06XXXXXXXX";
    if (!formData.city) e.city = "Ville obligatoire";
    else if (!cities.some(c => c.name.toLowerCase() === formData.city.toLowerCase())) e.city = "Choisissez une ville dans la liste";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);
    try {
      const order = await ordersApi.create({
        items: [{ productId: product.id, quantity: 1 }],
        customerName: formData.fullName,
        phone: formData.phone.replace(/\s/g, ""),
        city: formData.city,
        address: formData.address || "-",
      });
      setSubmitted(true);
      setTimeout(() => navigate(`/order-success?orderNumber=${order.orderNumber}`), 2000);
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      toast({ title: "Erreur", description: error.response?.data?.error || "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── SUBMITTED STATE ── */
  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-4 gap-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Commande confirmée !</h1>
        <p className="text-muted-foreground mt-2">Nous vous contacterons bientôt pour confirmer la livraison.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans">

      {/* ── TOP URGENCY BAR ── */}
      <div className="bg-red-600 text-white text-center py-2 px-4 text-xs sm:text-sm font-bold tracking-wide flex items-center justify-center gap-2">
        <Clock className="w-4 h-4 shrink-0" />
        <span>Offre expire dans :</span>
        <span className="bg-white text-red-600 font-black px-2 py-0.5 rounded text-sm tabular-nums">{m}:{s}</span>
        <span>— Stock limité !</span>
      </div>

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm py-3 px-6 flex justify-center">
        {settings?.logo
          ? <img src={getImageUrl(settings.logo)} alt="Logo" className="h-8 md:h-10 object-contain" />
          : <span className="text-xl font-black text-primary tracking-tight">{settings?.storeName || "MKARIM"}</span>
        }
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-start">

        {/* ── LEFT: PRODUCT ── */}
        <div className="space-y-4">
          {/* Image gallery */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <div className="relative">
              {discount > 0 && (
                <div className="absolute top-3 left-3 z-10 bg-red-600 text-white font-black px-3 py-1 rounded-lg text-sm shadow-lg">
                  -{discount}%
                </div>
              )}
              {product.badge && (
                <div className="absolute top-3 right-3 z-10 bg-primary text-white font-bold px-3 py-1 rounded-lg text-xs shadow">
                  {product.badge}
                </div>
              )}
            </div>
            <div className="p-2">
              <ProductImageGallery
                images={product.images && product.images.length > 0 ? product.images : [product.image]}
                productName={product.name}
                badge={undefined}
              />
            </div>
          </div>

          {/* Product info */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">{product.name}</h1>

            {/* Stars */}
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
              <span className="text-xs text-gray-500 ml-2 font-semibold">4.9 · 238 avis</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className={`text-4xl font-black ${discount >= 50 ? "text-red-600" : "text-gray-900"}`}>
                {product.price.toLocaleString()} <span className="text-xl font-bold">{currency}</span>
              </span>
              {product.originalPrice && (
                <span className="text-lg text-gray-400 line-through font-medium">
                  {product.originalPrice.toLocaleString()} {currency}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && product.description.trim() && (
              <div className="pt-3 border-t border-gray-100">
                {product.description.includes(';') || product.description.includes('\n') ? (
                  // Bullet list when separators exist
                  <div className="space-y-1.5">
                    {product.description.split(/;|\n/).filter(l => l.trim()).map((line, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 font-black mt-0.5 shrink-0">✓</span>
                        <span>{line.trim()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Plain paragraph when no separators
                  <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Truck, label: "Livraison", sub: "24–72h Maroc" },
              { icon: ShieldCheck, label: "Garanti", sub: "100% Neuf" },
              { icon: Package, label: "Paiement", sub: "À la livraison" },
            ].map((b, i) => (
              <div key={i} className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
                <b.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[11px] font-black text-gray-800">{b.label}</p>
                <p className="text-[10px] text-gray-500">{b.sub}</p>
              </div>
            ))}
          </div>

          {/* Social proof ticker */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-bold text-orange-700">
            <Zap className="w-4 h-4 shrink-0" />
            <span>🔥 12 personnes regardent ce produit en ce moment</span>
          </div>
        </div>

        {/* ── RIGHT: ORDER FORM ── */}
        <div className="md:sticky md:top-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Form header */}
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 text-white text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <BadgePercent className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-90">Offre Exclusive</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black">COMMANDER MAINTENANT</h2>
              <p className="text-xs opacity-80 mt-1 font-medium">Livraison gratuite · Paiement à la réception</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nom */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Nom complet *
                </Label>
                <Input
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Prénom et Nom"
                  className={`h-12 rounded-xl border-2 font-semibold text-sm bg-gray-50 focus:bg-white transition-colors ${errors.fullName ? "border-red-400" : "border-gray-200 focus:border-red-500"}`}
                />
                {errors.fullName && <p className="text-[11px] text-red-500 font-semibold">{errors.fullName}</p>}
              </div>

              {/* Téléphone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Téléphone *
                </Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="06 XX XX XX XX"
                  className={`h-12 rounded-xl border-2 font-semibold text-sm bg-gray-50 focus:bg-white transition-colors ${errors.phone ? "border-red-400" : "border-gray-200 focus:border-red-500"}`}
                />
                {errors.phone && <p className="text-[11px] text-red-500 font-semibold">{errors.phone}</p>}
              </div>

              {/* Ville */}
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Ville *
                </Label>
                <div className="relative">
                  <Input
                    value={formData.city}
                    onChange={e => { setFormData({ ...formData, city: e.target.value }); setCityOpen(true); }}
                    onFocus={() => setCityOpen(true)}
                    placeholder="Ex: Casablanca"
                    autoComplete="off"
                    className={`h-12 rounded-xl border-2 font-semibold text-sm bg-gray-50 focus:bg-white pr-10 transition-colors ${errors.city ? "border-red-400" : "border-gray-200 focus:border-red-500"}`}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <AnimatePresence>
                  {cityOpen && formData.city.length > 0 && filteredCities.length > 0 && !cities.some(c => c.name.toLowerCase() === formData.city.toLowerCase()) && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-44 overflow-y-auto"
                    >
                      {filteredCities.map(city => (
                        <button
                          key={city.id}
                          type="button"
                          onClick={() => { setFormData({ ...formData, city: city.name }); setCityOpen(false); setErrors({ ...errors, city: "" }); }}
                          className="w-full px-4 py-3 text-left hover:bg-red-50 border-b border-gray-50 flex justify-between items-center last:border-0"
                        >
                          <span className="font-bold text-sm text-gray-800">{city.name}</span>
                          <span className="text-xs text-gray-400 font-semibold">
                            {city.shippingFee === 0 ? "Gratuit" : `${city.shippingFee} ${currency}`}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {errors.city && <p className="text-[11px] text-red-500 font-semibold">{errors.city}</p>}
              </div>

              {/* Adresse */}
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Adresse (facultatif)
                </Label>
                <Input
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Quartier, rue, bâtiment..."
                  className="h-12 rounded-xl border-2 border-gray-200 focus:border-red-500 font-semibold text-sm bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              {/* Order summary */}
              {formData.city && settings && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Produit</span>
                    <span>{product.price.toLocaleString()} {currency}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-gray-600">
                    <span>Livraison</span>
                    <span className={shippingFee === 0 ? "text-green-600 font-bold" : ""}>
                      {shippingFee === 0 ? "GRATUITE 🎁" : `+${shippingFee} ${currency}`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
                    <span className="font-black text-gray-800 text-base">TOTAL</span>
                    <span className="text-2xl font-black text-red-600">{total.toLocaleString()} {currency}</span>
                  </div>
                </motion.div>
              )}

              {/* CTA Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 text-white text-base font-black tracking-wide rounded-xl shadow-lg hover:shadow-red-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Traitement...</>
                  : <><CheckCircle2 className="w-5 h-5" /> CONFIRMER MA COMMANDE</>
                }
              </Button>

              {/* Micro trust */}
              <p className="text-center text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                Paiement 100% à la livraison · Aucun frais caché
              </p>
            </form>
          </motion.div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100 bg-white mt-6">
        {settings?.storeName || "MKARIM"} · {settings?.footerCopyright || `© ${new Date().getFullYear()} Tous droits réservés`}
      </footer>
    </div>
  );
};

export default PromoPage;
