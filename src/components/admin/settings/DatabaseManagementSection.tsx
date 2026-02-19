import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsIcon, AlertTriangle } from "lucide-react";

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
  return (
    <Card className="p-4 border-amber-200 dark:border-amber-900">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <SettingsIcon className="h-5 w-5" />
          <h3 className="font-semibold">Database Management</h3>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Manage your store data for onboarding, testing, or starting fresh.
        </p>

        <div className="space-y-3">
          {/* Button 1: Inject Sample Data */}
          <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">🎨 Inject Sample Data</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Load demo data: 200 items, 8 employees, 26 months of transactions. 
                  Perfect for learning the system.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={onInjectSampleData}
                  disabled={isProcessing}
                >
                  Load Sample Data
                </Button>
              </div>
            </div>
          </div>

          {/* Button 2: Clear Transaction Data */}
          <div className="border rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">🗑️ Clear Transaction Data</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Remove all transactions and reports. Items, employees, and settings remain intact.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                  onClick={onClearTransactions}
                  disabled={isProcessing}
                >
                  Clear Transaction Data
                </Button>
              </div>
            </div>
          </div>

          {/* Button 3: Factory Reset */}
          <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1 text-red-600 dark:text-red-400">
                  🏭 Factory Reset
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Delete EVERYTHING and return to fresh install state. All data will be lost permanently.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={onFactoryReset}
                  disabled={isProcessing}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Factory Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}