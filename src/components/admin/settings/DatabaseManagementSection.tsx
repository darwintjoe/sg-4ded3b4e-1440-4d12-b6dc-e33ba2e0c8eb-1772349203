import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsIcon, AlertTriangle, Store } from "lucide-react";
import { translate } from "@/lib/translations";
import { Language, BusinessType } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

interface DatabaseManagementSectionProps {
  language: Language;
  onInjectSampleData: (businessType: string) => void;
  onClearTransactions: () => void;
  onFactoryReset: () => void;
  onInitiateRestore: () => void;
  restoreState: any;
  backupProcessing: boolean;
  handleBackupNow: () => Promise<void>;
  isSignedIn: boolean;
  backupStatus: any;
  startPreviewProcess: () => Promise<void>;
}

const BUSINESS_TYPES: Array<{ id: BusinessType; name: string; icon: string; description: string }> = [
  { id: "convenience-store", name: "Convenience Store", icon: "🏪", description: "Groceries, snacks, drinks & daily essentials" },
  { id: "stationery", name: "Stationery", icon: "📚", description: "Office supplies, books & writing materials" },
  { id: "toys", name: "Toys & Games", icon: "🎮", description: "Toys, games & children's products" },
  { id: "electronics", name: "Electronics", icon: "📱", description: "Phones, accessories & gadgets" },
  { id: "warung-padang", name: "Warung Padang", icon: "🍛", description: "Indonesian Padang cuisine restaurant" },
  { id: "noodle-tea", name: "Noodle & Tea", icon: "🍜", description: "Noodles, tea & beverages" },
  { id: "building-materials", name: "Building Materials", icon: "🏗️", description: "Construction & hardware supplies" },
  { id: "pharmacy", name: "Pharmacy", icon: "💊", description: "Medicines, health & wellness products" },
];

export function DatabaseManagementSection({
  language,
  onInjectSampleData,
  onClearTransactions,
  onFactoryReset,
  onInitiateRestore,
  restoreState,
  backupProcessing,
  handleBackupNow,
  isSignedIn,
  backupStatus,
  startPreviewProcess
}: DatabaseManagementSectionProps) {
  const isProcessing = backupProcessing || restoreState?.phase !== "idle";
  const [showBusinessTypeSelector, setShowBusinessTypeSelector] = useState(false);

  const handleBusinessTypeSelect = (businessType: string) => {
    onInjectSampleData(businessType);
    setShowBusinessTypeSelector(false);
  };

  return (
    <Card className="p-4 border-amber-200 dark:border-amber-900">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <SettingsIcon className="h-5 w-5" />
          <h3 className="font-semibold">{translate("settings.database.title", language)}</h3>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {translate("settings.database.description", language)}
        </p>

        <div className="space-y-3">
          {/* Button 1: Inject Sample Data */}
          <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">{translate("settings.database.sampleData.title", language)}</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {translate("settings.database.sampleData.description", language)}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowBusinessTypeSelector(true)}
                  disabled={isProcessing}
                >
                  <Store className="h-4 w-4 mr-2" />
                  {translate("settings.database.sampleData.button", language)}
                </Button>
              </div>
            </div>
          </div>

          {/* Button 2: Clear Transaction Data */}
          <div className="border rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">{translate("settings.database.sampleData.title", language)}</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {translate("settings.database.sampleData.description", language)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={onClearTransactions}
                  disabled={isProcessing}
                >
                  {translate("settings.database.clearTransactions.button", language)}
                </Button>
              </div>
            </div>
          </div>

          {/* Button 3: Factory Reset */}
          <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1 text-red-600 dark:text-red-400">
                  {translate("settings.database.factoryReset.title", language)}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {translate("settings.database.factoryReset.description", language)}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={onFactoryReset}
                  disabled={isProcessing}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {translate("settings.database.factoryReset.button", language)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Type Selector Modal */}
      <Dialog open={showBusinessTypeSelector} onOpenChange={setShowBusinessTypeSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {translate("settings.database.sampleData.selectType", language) || "Select Business Type"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {translate("settings.database.sampleData.selectTypeDescription", language) || "Choose a business type to generate realistic sample data"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((business) => (
              <button
                key={business.id}
                onClick={() => handleBusinessTypeSelect(business.id)}
                disabled={isProcessing}
                className="p-4 border rounded-lg text-left hover:bg-accent hover:border-primary transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="text-3xl mb-2">{business.icon}</div>
                <div className="font-medium text-sm">{business.name}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{business.description}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}