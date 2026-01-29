import { useApp } from "@/contexts/AppContext";
import { LoginScreen } from "@/components/LoginScreen";
import { POSScreen } from "@/components/POSScreen";
import { SEO } from "@/components/SEO";

export default function Home() {
  const { currentUser, isPaused } = useApp();

  return (
    <>
      <SEO
        title="SELL MORE - Mobile POS System"
        description="Offline-first point of sale system optimized for retail and cafe/restaurant businesses"
      />
      {!currentUser || isPaused ? <LoginScreen /> : <POSScreen />}
    </>
  );
}