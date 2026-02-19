import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsIcon, AlertTriangle } from "lucide-react";
import { translate } from "@/lib/translations";
import { Language } from "@/types";

interface DatabaseManagementSectionProps {
  language: Language;
  onInjectSampleData: () => void;
  onClearTransactions: () => void;
  onFactoryReset: () => void;
  isProcessing: boolean;
}

export function DatabaseManagementSection({
  language,
  onInjectSampleData,
  onClearTransactions,
  onFactoryReset,
  isProcessing
}: DatabaseManagementSectionProps) {
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
                  onClick={onInjectSampleData}
                  disabled={isProcessing}
                >
                  {translate("settings.database.sampleData.button", language)}
                </Button>
              </div>
            </div>
          </div>

          {/* Button 2: Clear Transaction Data */}
          <div className="border rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">{translate("settings.database.clearTransactions.title", language)}</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {translate("settings.database.clearTransactions.description", language)}
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
    </Card>
  );
}