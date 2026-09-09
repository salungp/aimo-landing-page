import Nav from "@/components/Nav";
import Hero from "@/components/sections/Hero";
import SeamlessExperience from "@/components/sections/SeamlessExperience";
import WalletCards from "@/components/sections/WalletCards";
import MarketsTogether from "@/components/sections/MarketsTogether";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <SeamlessExperience />
        <WalletCards />
        <MarketsTogether />
      </main>
    </>
  );
}
