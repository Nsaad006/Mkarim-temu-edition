import { useState } from "react";
import { AxiosError } from "axios";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";
import { contactsApi } from "@/api/contacts";

const ContactPage = () => {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const storeName = settings?.storeName || "MKARIM SOLUTION";
  const whatsappNumber = settings?.whatsappNumber || "+212 6 00 00 00 00";
  const contactEmail = settings?.contactEmail || "contact@mkarim.ma";

  const contactInfo = [
    {
      icon: MapPin,
      title: "Adresse",
      value: settings?.contactAddress || "Casablanca, Maroc",
      link: null,
    },
    {
      icon: Clock,
      title: "Horaires",
      value: settings?.contactHours || "Lun - Sam: 9h - 20h",
      link: null,
    },
    {
      icon: Phone,
      title: "Téléphone",
      value: settings?.contactPhone || whatsappNumber,
      link: `tel:${(settings?.contactPhone || whatsappNumber).replace(/\s+/g, "")}`,
    },
    {
      icon: Mail,
      title: "Email",
      value: contactEmail,
      link: `mailto:${contactEmail}`,
    },
  ];
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await contactsApi.submit(formData);
      toast({
        title: "Message envoyé !",
        description: "Nous vous répondrons dans les plus brefs délais.",
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Une erreur est survenue lors de l'envoi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Bonjour, je souhaite avoir des informations sur vos produits.");
    window.open(`https://wa.me/${whatsappNumber.replace(/\s+/g, "").replace("+", "")}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
      <SEO
        title="Contact"
        description="Une question ? Un projet ? Contactez MKARIM SOLUTION. Notre équipe est à votre écoute pour vous fournir les meilleures solutions informatiques au Maroc."
      />
      <Navbar />
      <main className="pt-24 lg:pt-32">
        {/* Header */}
        <section className="relative py-8 sm:py-12 lg:py-20 overflow-hidden">
          <div className="container-custom relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-primary text-primary-foreground text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-4 skew-x-[-12deg]">
                <span className="skew-x-[12deg]">MKARIM SUPPORT</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-black mb-6 tracking-tighter text-foreground uppercase italic leading-[1.1]">
                Contactez-<span className="text-primary italic">Nous</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed">
                Notre équipe d'experts est disponible pour vous accompagner et répondre à toutes vos questions tech & gaming.
              </p>
            </motion.div>
          </div>
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px] pointer-events-none" />
        </section>

        <section className="pt-4 pb-20 md:pb-24 relative">
          <div className="container-custom">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-10 xl:gap-8 items-start">
              {/* Contact Info */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="xl:col-span-1 space-y-6 lg:space-y-8 order-2 xl:order-1"
              >
                <div className="bg-card backdrop-blur-xl rounded-3xl border border-border p-5 sm:p-8 shadow-2xl">
                  <h2 className="font-display text-lg md:text-xl lg:text-2xl font-black text-foreground uppercase tracking-tight mb-6 md:mb-8 italic">
                    Informations Directes
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6 sm:gap-x-10 sm:gap-y-10">
                    {contactInfo.map((info) => (
                      <div key={info.title} className="flex items-start gap-4 lg:gap-5 group">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl lg:rounded-2xl bg-muted border border-border flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 transition-colors duration-300">
                          <info.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{info.title}</p>
                          {info.link ? (
                            <a
                              href={info.link}
                              className="text-sm sm:text-base lg:text-lg font-black text-foreground hover:text-primary transition-colors tracking-tight italic block break-words"
                            >
                              {info.value}
                            </a>
                          ) : (
                            <p className="text-sm sm:text-base lg:text-lg font-black text-foreground tracking-tight italic break-words">{info.value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WhatsApp CTA */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-5 sm:p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-green-500/20 transition-colors" />
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl lg:rounded-2xl bg-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                      <MessageCircle className="w-5 h-5 md:w-8 md:h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-black text-foreground uppercase tracking-tight italic leading-tight">Assistance Directe</p>
                      <p className="text-[10px] md:text-xs font-bold text-green-500/80 uppercase tracking-widest leading-none mt-1">Réponse immédiate</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleWhatsApp}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-wider h-auto min-h-[3.5rem] px-6 py-4 rounded-xl relative z-10 text-xs sm:text-sm lg:text-base shadow-xl active:scale-95 whitespace-normal leading-tight"
                  >
                    Lancer le Chat WhatsApp
                  </Button>
                </div>
              </motion.div>

              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="xl:col-span-2 order-1 xl:order-2"
              >
                <div className="bg-card backdrop-blur-xl rounded-3xl border border-border p-5 sm:p-10 xl:p-10 shadow-2xl">
                  <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black text-foreground uppercase tracking-tight mb-5 md:mb-8 italic">
                    Transmettre un Message
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="name" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Nom complet *</Label>
                        <Input
                          id="name"
                          placeholder="votre nom"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="bg-background border-border text-foreground h-12 sm:h-14 md:h-14 rounded-xl focus:border-primary/50 transition-all font-black placeholder:text-muted-foreground/30 text-xs sm:text-sm lg:text-base"
                        />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="email" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="votre@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="bg-background border-border text-foreground h-12 sm:h-14 md:h-14 rounded-xl focus:border-primary/50 transition-all font-black placeholder:text-muted-foreground/30 text-xs sm:text-sm lg:text-base"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="phone" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Téléphone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+212 6 XX XX XX XX"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="bg-background border-border text-foreground h-12 sm:h-14 md:h-14 rounded-xl focus:border-primary/50 transition-all font-black placeholder:text-muted-foreground/30 text-xs sm:text-sm lg:text-base"
                        />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="subject" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sujet</Label>
                        <Input
                          id="subject"
                          placeholder="sujet de votre demande"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="bg-background border-border text-foreground h-12 sm:h-14 md:h-14 rounded-xl focus:border-primary/50 transition-all font-black placeholder:text-muted-foreground/30 text-xs sm:text-sm lg:text-base"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="message" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="votre message détaillé..."
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="bg-background border-border text-foreground rounded-xl focus:border-primary/50 transition-all font-black resize-none p-4 sm:p-6 lg:p-6 placeholder:text-muted-foreground/30 text-xs sm:text-sm lg:text-base"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.2em] h-14 sm:h-16 md:h-16 rounded-xl shadow-[0_0_30px_rgba(235,68,50,0.3)] transition-all hover:shadow-[0_0_40px_rgba(235,68,50,0.5)] active:scale-95 flex items-center justify-center gap-3 px-10"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="text-xs sm:text-sm lg:text-base">Transmission...</span>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <Send className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span className="text-xs sm:text-sm lg:text-base">Démarrer l'envoi</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
