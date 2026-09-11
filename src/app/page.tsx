import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import SeamlessExperience from "@/components/sections/SeamlessExperience";
import WalletCards from "@/components/sections/WalletCards";
import MarketsTogether from "@/components/sections/MarketsTogether";
import DeepDive from "@/components/sections/DeepDive";
import HowItWorks from "@/components/sections/HowItWorks";
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
        <DeepDive />
        <HowItWorks />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
