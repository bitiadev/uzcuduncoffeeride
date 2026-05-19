import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/sections/hero-section";
import { CategoriesSection } from "@/components/sections/categories-section";
import { CafeSection } from "@/components/sections/cafe-section";
import { ScrollWheel } from "@/components/scroll-animations";
import { FeaturedProductsClient } from "@/components/sections/featured-products-client";
import { Header } from "@/components/layout/header";
import { getCategories } from "@/lib/queries";

export default async function HomePage() {

  const categories = await getCategories();

  return (
    <div className="min-h-screen bg-background">
      <ScrollWheel />
      
      <Header categories={categories} />

      <HeroSection />

      <FeaturedProductsClient />

      <CategoriesSection />     

      <CafeSection />

      <Footer />
    </div>
  );
}