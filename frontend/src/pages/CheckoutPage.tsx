import { useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, MapPin, User, Phone, Home, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { ordersApi } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { citiesApi } from "@/api/cities";
import { productsApi } from "@/api/products";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";
import { settingsApi } from "@/api/settings";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { currency } = useSettings();
  const [searchParams] = useSearchParams();
  const { state: cartState, getTotal, clearCart, addItem } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  // Fetch global settings for free shipping
  const { data: globalSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  // Get product ID from query parameter
  const productId = searchParams.get('product');

  // Fetch product if coming from "Commander Maintenant"
  const { data: directProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getById(productId!),
    enabled: !!productId,
  });

  // Add product to cart when coming from direct checkout
  useEffect(() => {
    if (directProduct && productId) {
      // Check if product is already in cart
      const existingItem = cartState.items.find(item => item.product.id === productId);
      if (!existingItem) {
        addItem(directProduct);
      }
      // Remove product parameter from URL to clean it up
      searchParams.delete('product');
      navigate({ search: searchParams.toString() }, { replace: true });
    }
  }, [directProduct, productId]);

  // Use mocked API
  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => citiesApi.getAll(),
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    address: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if cart is empty
  if (cartState.items.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center flex-1 flex flex-col justify-center">
          <div className="w-32 h-32 bg-muted border border-border rounded-3xl flex items-center justify-center mx-auto mb-8 relative shadow-2xl">
            <ShoppingBag className="w-16 h-16 text-primary" />
            <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
          </div>
          <h1 className="font-display text-4xl font-black text-foreground italic uppercase tracking-tighter mb-4">Panier <span className="text-primary italic">Vide</span></h1>
          <p className="text-muted-foreground font-medium mb-10 max-w-xs mx-auto">Impossible de finaliser une commande sans matériel.</p>
          <Button onClick={() => navigate("/products")} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest px-8 h-14 rounded-xl shadow-[0_0_30px_rgba(235,68,50,0.3)] italic mx-auto">Découvrir le Catalogue</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Custom Validation
    if (!formData.fullName || formData.fullName.trim().length < 2) {
      newErrors.fullName = "Champ obligatoire";
    }

    if (!formData.phone) {
      newErrors.phone = "Champ obligatoire";
    } else {
      // Validate phone number format
      const phoneRegex = /^(\+212|0)[5-7]\d{8}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ""))) {
        newErrors.phone = "Numéro invalide (Ex: 06XXXXXXXX)";
      }
    }

    if (!formData.city) {
      newErrors.city = "Champ obligatoire";
    }

    if (!formData.address || formData.address.trim().length < 5) {
      newErrors.address = "Champ obligatoire";
    }

    if (!formData.email) {
      newErrors.email = "Champ obligatoire";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to the first error
      const firstError = Object.keys(newErrors)[0];
      const element = document.getElementById(firstError);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // Create a single order for all cart items
      const order = await ordersApi.create({
        items: cartState.items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        customerName: formData.fullName,
        email: formData.email,
        phone: formData.phone.replace(/\s/g, ""),
        city: formData.city,
        address: formData.address,
      });

      // Pass the order number for display
      setOrderNumber(order.orderNumber);

      // Clear cart
      clearCart();

      toast({
        title: "Commande confirmée !",
        description: `Votre commande ${order.orderNumber} a été enregistrée avec succès.`,
      });

      // Navigate to success page after a short delay
      setTimeout(() => {
        navigate(`/order-success?orderNumber=${order.orderNumber}`);
      }, 2000);

    } catch (err) {
      const error = err as AxiosError<{ error: string; details?: { message: string }[] }>;
      console.error("Order submission error:", error);

      let description = error.response?.data?.error || error.message || "Une erreur est survenue lors de la commande.";

      if (error.response?.data?.details?.[0]?.message) {
        description += `: ${error.response.data.details[0].message}`;
      }

      toast({
        title: "Erreur",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCity = cities.find(c => c.name === formData.city);
  const cartTotal = getTotal();

  // Calculate shipping fee with free shipping logic
  let shippingFee = selectedCity?.shippingFee || 0;

  // Check if free shipping applies
  const freeShippingEnabled = globalSettings?.freeShippingEnabled ?? false;
  const freeShippingThreshold = globalSettings?.freeShippingThreshold ?? 0;

  // Free shipping applies if:
  // 1. Free shipping is enabled
  // 2. Cart total is greater than or equal to threshold
  // 3. Threshold is greater than 0 (to avoid applying free shipping when threshold is not set)
  const qualifiesForFreeShipping = freeShippingEnabled &&
    freeShippingThreshold > 0 &&
    cartTotal >= freeShippingThreshold;

  if (qualifiesForFreeShipping) {
    shippingFee = 0;
  }

  const total = cartTotal + shippingFee;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      <Navbar />
      <div className="container-custom pt-24 lg:pt-32 pb-24">
        <Button
          variant="ghost"
          onClick={() => navigate("/cart")}
          className="mb-6 lg:mb-10 gap-3 text-muted-foreground hover:text-foreground transition-colors font-black uppercase tracking-[0.2em] text-[10px]"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
          Retour au Panier
        </Button>

        <div className="flex flex-col xl:grid xl:grid-cols-3 gap-6 lg:gap-12 items-stretch">
          {/* Main Checkout Section */}
          <div className="xl:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card backdrop-blur-xl rounded-2xl lg:rounded-3xl p-5 md:p-10 lg:p-14 border border-border shadow-2xl h-full"
            >
              <div className="flex items-center gap-4 mb-8 lg:mb-10 border-b border-border pb-5 lg:pb-8">
                <div className="w-1 h-8 lg:w-2 lg:h-10 bg-primary skew-x-[-15deg]" />
                <h1 className="font-display text-2xl lg:text-5xl font-black text-foreground italic uppercase tracking-tighter leading-none">
                  Finaliser <span className="text-primary tracking-tight uppercase">VOTRE COMMANDE</span>
                </h1>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-[11px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                      <User className="w-3.5 h-3.5 text-primary" />
                      Nom complet
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({ ...formData, fullName: e.target.value });
                        if (errors.fullName) setErrors({ ...errors, fullName: "" });
                      }}
                      placeholder="Votre nom et prénom"
                      className={`bg-background text-foreground h-13 lg:h-14 rounded-xl transition-all font-bold placeholder:text-muted-foreground/30 ${errors.fullName ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary/50"
                        }`}
                    />
                    {errors.fullName && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[11px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      Téléphone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (errors.phone) setErrors({ ...errors, phone: "" });
                      }}
                      placeholder="06 XX XX XX XX"
                      className={`bg-background text-foreground h-13 lg:h-14 rounded-xl transition-all font-bold placeholder:text-muted-foreground/30 ${errors.phone ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary/50"
                        }`}
                    />
                    {errors.phone && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-[11px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      Ville de livraison
                    </Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) => {
                        setFormData({ ...formData, city: value });
                        if (errors.city) setErrors({ ...errors, city: "" });
                      }}
                    >
                      <SelectTrigger
                        id="city"
                        className={`bg-background text-foreground h-13 lg:h-14 rounded-xl transition-all font-bold uppercase tracking-tighter md:tracking-normal text-xs lg:text-sm ${errors.city ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary/50"
                          }`}
                      >
                        <SelectValue placeholder="SÉLECTIONNER VOTRE VILLE" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.name} className="focus:bg-white/5 uppercase tracking-wide font-black text-[10px] cursor-pointer">
                            {city.name} — {city.shippingFee} {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.city && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.city}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-[11px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                      <Home className="w-3.5 h-3.5 text-primary" />
                      Adresse complète
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({ ...formData, address: e.target.value });
                        if (errors.address) setErrors({ ...errors, address: "" });
                      }}
                      placeholder="Quartier, rue, appartement..."
                      className={`bg-background text-foreground h-13 lg:h-14 rounded-xl transition-all font-bold placeholder:text-muted-foreground/30 ${errors.address ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary/50"
                        }`}
                    />
                    {errors.address && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.address}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    Adresse Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    placeholder="votre@email.com"
                    className={`bg-background text-foreground h-13 lg:h-14 rounded-xl transition-all font-bold placeholder:text-muted-foreground/30 ${errors.email ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary/50"
                      }`}
                  />
                  {errors.email && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 px-1">{errors.email}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="xl"
                  className="w-full italic mt-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      <span>ENVOI EN COURS...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 />
                      <span>CONFIRMER LA COMMANDE</span>
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          </div>

          {/* Totals Section */}
          <div className="xl:col-span-1 h-full">
            <div className="bg-card border border-border rounded-2xl lg:rounded-3xl p-5 md:p-12 lg:p-8 xl:sticky xl:top-32 shadow-2xl relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />

              <h2 className="font-display text-lg lg:text-2xl font-black text-foreground italic uppercase tracking-tighter mb-5 border-b border-border pb-3">Récapitulatif</h2>

              <div className="space-y-4">
                <div className="max-h-60 lg:max-h-none overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                  {cartState.items.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-black text-foreground uppercase italic tracking-tight line-clamp-2">{item.product.name}</p>
                        <p className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest mt-1">x{item.quantity}</p>
                      </div>
                      <span className="font-bold text-muted-foreground text-xs sm:text-sm font-mono mt-0.5">
                        {(item.product.price * item.quantity).toLocaleString()} {currency}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-5 border-t border-white/5">
                  <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">SOUS-TOTAL</span>
                    <span className="text-zinc-400">{(getTotal()).toLocaleString()} {currency}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold">
                    <span className="text-zinc-600 uppercase tracking-widest">LIVRAISON</span>
                    <span className={`uppercase italic font-black ${shippingFee === 0 && formData.city ? 'text-green-500' : 'text-zinc-400'}`}>
                      {shippingFee > 0 ? `+${shippingFee} ${currency}` : shippingFee === 0 && formData.city ? 'OFFERTE' : 'À définir'}
                    </span>
                  </div>

                  {/* Free Shipping Messages */}
                  {freeShippingEnabled && freeShippingThreshold > 0 && (
                    <>
                      {qualifiesForFreeShipping && formData.city ? (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 sm:p-3">
                          <p className="text-[9px] sm:text-[10px] font-bold text-green-500 uppercase tracking-wide text-center">
                            🎉 Livraison Gratuite Appliquée (Total ≥ {freeShippingThreshold.toLocaleString()} {currency})
                          </p>
                        </div>
                      ) : (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 sm:p-3">
                          <p className="text-[9px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-wide text-center">
                            💡 Livraison Gratuite Si Total Commande ≥ {freeShippingThreshold.toLocaleString()} {currency}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-5 mt-2 border-t border-white/10 flex flex-row md:flex-col justify-between items-end md:items-start md:gap-2">
                    <span className="font-display text-lg sm:text-xl lg:text-2xl font-black text-foreground italic uppercase tracking-tighter leading-none">Total Net</span>
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black text-primary italic tracking-tighter leading-none">
                      {total.toLocaleString()} <span className="text-[10px] sm:text-xs lg:text-sm not-italic font-bold">{currency}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-6 bg-green-500/5 border border-green-500/10 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-green-500 mb-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-black uppercase tracking-widest italic text-[10px] sm:text-xs">PAIEMENT À LA LIVRAISON</span>
                  </div>
                  <p className="text-[9px] sm:text-[11px] md:text-xs font-bold text-green-500/50 uppercase leading-relaxed text-justify">
                    Réglez en espèces lors de la réception de votre matériel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
