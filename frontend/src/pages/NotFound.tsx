import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-white">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-32 pb-24 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="container-custom relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-muted border border-border mb-10 relative group">
              <AlertTriangle className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <h1 className="font-display text-8xl md:text-[12rem] font-bold text-foreground   tracking-tight leading-none mb-4 opacity-10 select-none">
              404
            </h1>

            <div className="relative -mt-16 md:-mt-32 mb-12">
              <h2 className="font-display text-4xl md:text-6xl font-bold text-foreground   tracking-tight mb-6">
                UNITÉ <span className="text-primary">INTROUVABLE</span>
              </h2>
              <p className="text-xl text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
                La page que vous recherchez n'existe pas ou a été déplacée.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold  tracking-widest px-8 h-16 rounded-2xl shadow-[0_0_30px_rgba(235,68,50,0.3)]  w-full sm:w-auto">
                  <Home className="w-5 h-5 mr-3" />
                  Bases de Commande
                </Button>
              </Link>
              <Link to="/products">
                <Button variant="outline" size="lg" className="border-border text-foreground hover:bg-accent font-bold  tracking-widest px-8 h-16 rounded-2xl  w-full sm:w-auto">
                  <Search className="w-5 h-5 mr-3 text-primary" />
                  Explorer le Catalogue
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;

