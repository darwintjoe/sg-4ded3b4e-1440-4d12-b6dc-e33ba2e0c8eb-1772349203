import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AppProvider } from "@/contexts/AppContext";
import { GoogleAuthProvider } from "@/contexts/GoogleAuthContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { SplashScreen } from "@/components/SplashScreen";
import { useState, useEffect } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Don't render splash during SSR
  if (!isClient) {
    return null;
  }

  return (
    <ThemeProvider>
      <GoogleAuthProvider>
        <AppProvider>
          {showSplash ? (
            <SplashScreen onComplete={handleSplashComplete} />
          ) : (
            <>
              <Component {...pageProps} />
              <PWAInstallPrompt />
            </>
          )}
        </AppProvider>
      </GoogleAuthProvider>
    </ThemeProvider>
  );
}