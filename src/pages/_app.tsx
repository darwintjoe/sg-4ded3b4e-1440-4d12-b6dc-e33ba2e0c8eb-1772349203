import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AppProvider } from "@/contexts/AppContext";
import { GoogleAuthProvider } from "@/contexts/GoogleAuthContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <GoogleAuthProvider>
        <AppProvider>
          <Component {...pageProps} />
          <PWAInstallPrompt />
        </AppProvider>
      </GoogleAuthProvider>
    </ThemeProvider>
  );
}