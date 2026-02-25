import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Offline Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <WifiOff className="w-12 h-12 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You're Offline
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No internet connection detected. Don't worry - SELL MORE works offline!
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            If you've used the app before, your data is saved locally. Try:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Open the installed app from your home screen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>All your sales, items, and employee data is stored locally</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>You can continue making sales offline</span>
            </li>
          </ul>
        </div>

        {/* Retry Button */}
        <Button
          onClick={handleRetry}
          size="lg"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>

        {/* App Info */}
        <p className="text-xs text-gray-500 dark:text-gray-500">
          SELL MORE - Mobile POS System
        </p>
      </div>
    </div>
  );
}