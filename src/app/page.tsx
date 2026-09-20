import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import SeamlessExperience from "@/components/sections/SeamlessExperience";
import WalletCards from "@/components/sections/WalletCards";
import MarketsTogether from "@/components/sections/MarketsTogether";
import BentoGrid from "@/components/sections/BentoGrid";
import OneBalance from "@/components/sections/OneBalance";
import FAQ from "@/components/sections/FAQ";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <SeamlessExperience />
        <WalletCards />
        <MarketsTogether />
        <BentoGrid />
        <OneBalance />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
