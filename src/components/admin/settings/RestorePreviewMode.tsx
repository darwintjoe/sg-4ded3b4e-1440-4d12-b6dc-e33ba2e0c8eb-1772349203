import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Store, Eye, CheckCircle2, Info } from "lucide-react";

interface RestorePreviewModeProps {
  previewData: any;
  onCancel: () => void;
  onApply: () => void;
}

export function RestorePreviewMode({ previewData, onCancel, onApply }: RestorePreviewModeProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Preview Mode Header */}
      <div className="bg-amber-500 text-black px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 font-bold">
          <Eye className="h-5 w-5" />
          <span>PREVIEW MODE - Reviewing Backup Data</span>
        </div>
        <div className="flex gap-3">
          <Button variant="destructive" size="sm" onClick={onCancel}>
            Cancel Restore
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            className="bg-green-700 hover:bg-green-800 text-white" 
            onClick={onApply}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Apply Restore
          </Button>
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Store className="h-16 w-16 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold">Backup Preview</h1>
            <p className="text-muted-foreground">
              Review the data before applying the restore.
            </p>
          </div>

          {previewData && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="text-3xl font-bold text-primary">{previewData.items?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Items</div>
              </Card>
              <Card className="p-4">
                <div className="text-3xl font-bold text-primary">{previewData.employees?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Employees</div>
              </Card>
              <Card className="p-4">
                <div className="text-3xl font-bold text-primary">{previewData.categories?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </Card>
              <Card className="p-4">
                <div className="text-3xl font-bold text-primary">{previewData.shifts?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Shifts</div>
              </Card>
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This data will replace your current database when you click "Apply Restore".
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}