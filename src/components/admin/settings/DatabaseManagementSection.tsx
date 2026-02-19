import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsIcon, AlertTriangle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { translate } from "@/lib/translations";

interface DatabaseManagementSectionProps {
  onInjectSampleData: () => void;
  onClearTransactions: () => void;
  onFactoryReset: () => void;
  isProcessing: boolean;
}

export function DatabaseManagementSection({
  onInjectSampleData,
  onClearTransactions,
  onFactoryReset,
  isProcessing
}: DatabaseManagementSectionProps) {
  const { language } = useApp();
  
  return (
    <Card className="p-4 border-amber-200 dark:border-amber-900">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <SettingsIcon className="h-5 w-5" />
          <h3 className="font-semibold">{translate("settings.db.title", language)}</h3>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {translate("settings.db.description", language)}
        </p>

        <div className="space-y-3">
          {/* Button 1: Inject Sample Data */}
          <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">🎨 {translate("settings.db.sampleData", language)}</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {translate("settings.db.sampleDataDesc", language)}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={onInjectSampleData}
                  disabled={isProcessing}
                >
                  {translate("settings.db.sampleDataButton", language)}
                </Button>
              </div>
            </div>
          </div>

          {/* Button 2: Clear Transaction Data */}
          <div className="border rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">🗑️ {translate("settings.db.clearTransactions", language)}</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {translate("settings.db.clearTransactionsDesc", language)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={onClearTransactions}
                  disabled={isProcessing}
                >
                  {translate("settings.db.clearTransactionsButton", language)}
                </Button>
              </div>
            </div>
          </div>

          {/* Button 3: Factory Reset */}
          <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1 text-red-600 dark:text-red-400">
                  🏭 {translate("settings.db.factoryReset", language)}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {translate("settings.db.factoryResetDesc", language)}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={onFactoryReset}
                  disabled={isProcessing}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {translate("settings.db.factoryResetButton", language)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}