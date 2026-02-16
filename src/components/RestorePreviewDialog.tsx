import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Users, Calendar, Database, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface BackupData {
  metadata: {
    version: string;
    timestamp: string;
    deviceId: string;
    dataSize: number;
    checksum: string;
    status: string;
    itemCount?: number;
    employeeCount?: number;
  };
  items: any[];
  employees: any[];
  categories: any[];
  settings: any;
  shifts: any[];
  dailyItemSales: any[];
  dailyPaymentSales: any[];
  dailyAttendance: any[];
  monthlyItemSales: any[];
  monthlySalesSummary: any[];
  monthlyAttendanceSummary: any[];
}

interface RestorePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupData: BackupData | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function RestorePreviewDialog({
  open,
  onOpenChange,
  backupData,
  onConfirm,
  onCancel,
}: RestorePreviewDialogProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  if (!backupData) return null;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getOldestShiftDate = () => {
    if (!backupData.shifts || backupData.shifts.length === 0) return "None";
    const oldestShift = backupData.shifts.reduce((oldest, shift) => {
      return new Date(shift.shiftStart) < new Date(oldest.shiftStart) ? shift : oldest;
    });
    return formatDate(oldestShift.shiftStart);
  };

  const getNewestShiftDate = () => {
    if (!backupData.shifts || backupData.shifts.length === 0) return "None";
    const newestShift = backupData.shifts.reduce((newest, shift) => {
      return new Date(shift.shiftStart) > new Date(newest.shiftStart) ? shift : newest;
    });
    return formatDate(newestShift.shiftStart);
  };

  const handleConfirm = async () => {
    setIsRestoring(true);
    try {
      await onConfirm();
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Restore Preview
          </DialogTitle>
          <DialogDescription>
            Review what will be restored before proceeding
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will replace all current data with the backup data shown below.
              Your current database will be backed up and can be reverted within 24 hours.
            </AlertDescription>
          </Alert>

          {/* Backup Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Backup Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{formatDate(backupData.metadata.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">{formatSize(backupData.metadata.dataSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="flex items-center gap-1 font-medium text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium">{backupData.metadata.version}</span>
              </div>
            </CardContent>
          </Card>

          {/* Master Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Master Data</CardTitle>
              <CardDescription>Core business data that will be restored</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{backupData.items.length}</div>
                  <div className="text-xs text-muted-foreground">Items</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{backupData.employees.length}</div>
                  <div className="text-xs text-muted-foreground">Employees</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{backupData.categories.length}</div>
                  <div className="text-xs text-muted-foreground">Categories</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                  <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{backupData.shifts.length}</div>
                  <div className="text-xs text-muted-foreground">Recent Shifts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historical Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Historical Data</CardTitle>
              <CardDescription>Summary tables and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Item Sales:</span>
                <span className="font-medium">{backupData.dailyItemSales.length} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Payment Sales:</span>
                <span className="font-medium">{backupData.dailyPaymentSales.length} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Attendance:</span>
                <span className="font-medium">{backupData.dailyAttendance.length} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Item Sales:</span>
                <span className="font-medium">{backupData.monthlyItemSales.length} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Sales Summary:</span>
                <span className="font-medium">{backupData.monthlySalesSummary.length} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Attendance:</span>
                <span className="font-medium">{backupData.monthlyAttendanceSummary.length} months</span>
              </div>
            </CardContent>
          </Card>

          {/* Shift Date Range */}
          {backupData.shifts && backupData.shifts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Shift History Range</CardTitle>
                <CardDescription>Date range of shifts included in backup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Oldest Shift:</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3" />
                    {getOldestShiftDate()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Newest Shift:</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3" />
                    {getNewestShiftDate()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revert Information */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Safety Net:</strong> After restoring, you will have 24 hours to revert back to your current data
              if needed. Your current database will be preserved during this window.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isRestoring}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRestoring ? "Restoring..." : "Confirm Restore"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}