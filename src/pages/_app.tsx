import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AppProvider } from "@/contexts/AppContext";
import { GoogleAuthProvider } from "@/contexts/GoogleAuthContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { SplashScreen } from "@/components/SplashScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState, useEffect } from "react";

// Register service worker for PWA offline support
function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        // Unregister any old service workers first to ensure clean state
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          // Check if this is an old/different service worker
          if (registration.active && !registration.active.scriptURL.endsWith("/sw.js")) {
            console.log("[PWA] Unregistering old service worker:", registration.active.scriptURL);
            await registration.unregister();
          }
        }

        // Register our service worker
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        
        console.log("[PWA] Service Worker registered successfully:", registration.scope);

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content available, prompt for refresh
                console.log("[PWA] New content available, refresh to update");
                // Optionally auto-update
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      } catch (error) {
        console.error("[PWA] Service Worker registration failed:", error);
      }
    });
  }
}

export default function App({ Component, pageProps }: AppProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Register service worker on client side
    registerServiceWorker();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Don't render splash during SSR
  if (!isClient) {
    return null;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
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
      </ErrorBoundary>
    </ThemeProvider>
  );
}