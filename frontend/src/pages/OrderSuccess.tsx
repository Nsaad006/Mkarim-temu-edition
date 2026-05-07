import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Package, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import confetti from "canvas-confetti";

const OrderSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderNumber = searchParams.get("orderNumber");

    useEffect(() => {
        // If no order number, redirect to home or 404
        if (!orderNumber) {
            navigate("/not-found", { replace: true });
            return;
        }

        // Trigger confetti animation with brand colors
        const count = 200;
        const defaults = {
            origin: { y: 0.7 },
            colors: ['#EB4432', '#FFFFFF', '#000000']
        };

        function fire(particleRatio: number, opts: confetti.Options) {
            confetti({
                ...defaults,
                ...opts,
                particleCount: Math.floor(count * particleRatio)
            });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });

        // Handle browser back button - redirect to home page
        const handlePopState = () => {
            navigate("/", { replace: true });
        };

        // Replace current history state to prevent going back to checkout
        window.history.replaceState(null, "", `/order-success?orderNumber=${orderNumber}`);

        // Listen for back button
        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, [navigate, orderNumber]);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">
            <Navbar />
            <div className="container mx-auto px-4 pt-32 pb-24 flex-1">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <div className="w-32 h-32 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-10 relative">
                        <CheckCircle2 className="w-16 h-16 text-green-500 relative z-10" />
                        <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
                    </div>

                    <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground   tracking-tight mb-6 leading-none">COMMANDE <span className="text-primary tracking-tight">VALIDÉE</span></h1>
                    <p className="text-xl text-muted-foreground font-medium mb-12 max-w-lg mx-auto leading-relaxed">
                        Félicitations ! Votre commande a été bien enregistrée.
                    </p>

                    {orderNumber && (
                        <div className="bg-card backdrop-blur-xl rounded-3xl p-8 border border-border mb-12 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors" />
                            <p className="text-[10px] font-bold text-muted-foreground   mb-4">IDENTIFIANT DE TRANSACTION</p>
                            <p className="text-3xl md:text-5xl font-mono font-bold text-primary tracking-tight  select-all">{orderNumber}</p>
                        </div>
                    )}

                    <div className="bg-card border border-border rounded-3xl p-8 md:p-10 mb-12 text-left relative">
                        <h2 className="font-display text-xl font-bold text-foreground   tracking-tight mb-8 flex items-center gap-4">
                            <div className="w-1.5 h-6 bg-primary rounded-full" />
                            COMMANDE EN PRÉPARATION
                        </h2>
                        <div className="space-y-6">
                            {[
                                { step: "01", title: "Vérification de la commande", desc: "Un conseiller vous contactera par téléphone dans les 24h pour confirmer l'adresse de livraison." },
                                { step: "02", title: "Activation du convoi", desc: "Votre matériel sera préparé et scellé pour une expédition express par notre flotte partenaire." },
                                { step: "03", title: "Transfert physique", desc: "Le matériel vous sera remis en mains propres. Paiement cash exigé lors de la réception finale." }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-6 group">
                                    <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 transition-colors duration-300">
                                        <span className="text-xs font-bold text-primary  font-mono">{item.step}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground  tracking-widest mb-1 ">{item.title}</h3>
                                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-2xl mx-auto">
                        <Button
                            onClick={() => navigate("/")}
                            variant="outline"
                            size="xl"
                            className="w-full sm:flex-1 border-2 border-primary/20 hover:border-primary text-foreground hover:bg-primary/5 font-bold  tracking-wide rounded-2xl  px-6 py-6 text-sm"
                        >
                            <Home className="w-5 h-5 mr-2 flex-shrink-0 text-primary" />
                            <span className="whitespace-nowrap">RETOUR ACCUEIL</span>
                        </Button>
                        <Button
                            onClick={() => navigate("/products")}
                            size="xl"
                            className="w-full sm:flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold  tracking-wide rounded-2xl shadow-[0_0_30px_rgba(235,68,50,0.3)] hover:shadow-[0_0_40px_rgba(235,68,50,0.5)]  px-6 py-6 text-sm"
                        >
                            <Package className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span className="whitespace-nowrap">REVOIR LE CATALOGUE</span>
                        </Button>
                    </div>
                </motion.div>
            </div>
            <Footer />
        </div>
    );
};

export default OrderSuccess;

