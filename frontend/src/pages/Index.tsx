import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CategoriesSection from "@/components/CategoriesSection";
import FeaturedProducts from "@/components/FeaturedProducts";
import WhyChooseUs from "@/components/WhyChooseUs";
import CTASection from "@/components/CTASection";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        description="Le leader du gaming au Maroc. Découvrez nos configurations sur mesure, PC portables et accessoires haut de gamme avec paiement à la livraison."
      />
      <Navbar />
      <main>
        <HeroSection />
        <CategoriesSection />
        <FeaturedProducts />
        <CTASection />
        <WhyChooseUs />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
