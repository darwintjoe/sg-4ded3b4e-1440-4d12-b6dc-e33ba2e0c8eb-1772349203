import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Check } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    // Check if this is the first visit
    const hasVisitedBefore = localStorage.getItem("pwa-has-visited");
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedAt = localStorage.getItem("pwa-install-dismissed-at");
    
    // Mark as visited
    if (!hasVisitedBefore) {
      localStorage.setItem("pwa-has-visited", "true");
      setIsFirstVisit(true);
    }

    // Check if dismissed more than 7 days ago - if so, show again
    if (dismissed && dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (dismissedTime < sevenDaysAgo) {
        // Reset dismissal after 7 days
        localStorage.removeItem("pwa-install-dismissed");
        localStorage.removeItem("pwa-install-dismissed-at");
      } else {
        setIsDismissed(true);
        return;
      }
    } else if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Show prompt logic
    if (isInstallable && !isInstalled) {
      if (!hasVisitedBefore) {
        // First visit: show immediately after a brief delay (let app load first)
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 2000); // 2 seconds - enough to see the app
        return () => clearTimeout(timer);
      } else {
        // Returning visitor: show after 5 seconds
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
    localStorage.setItem("pwa-install-dismissed-at", Date.now().toString());
  };

  if (!showPrompt || isDismissed || isInstalled || !isInstallable) {
    return null;
  }

  // First visit gets a more prominent banner
  if (isFirstVisit) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 animate-in fade-in">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:zoom-in-95">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-t-2xl p-6 text-white">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Smartphone className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Install SELL MORE</h2>
                <p className="text-blue-100 text-sm">Works offline • Fast access</p>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Works without internet connection</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Launch instantly from home screen</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Full-screen experience, no browser UI</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleInstall}
                size="lg"
                className="flex-1 gap-2"
              >
                <Download className="w-4 h-4" />
                Install Now
              </Button>
              <Button
                onClick={handleDismiss}
                size="lg"
                variant="outline"
              >
                Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Returning visitor gets a smaller banner
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-5">
      <div className="rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-sm">Install SELL MORE POS</h3>
            <p className="text-xs text-muted-foreground">
              Install for offline access and faster performance.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                className="flex-1"
              >
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Not now
              </Button>
            </div>
          </div>
          <Button
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}