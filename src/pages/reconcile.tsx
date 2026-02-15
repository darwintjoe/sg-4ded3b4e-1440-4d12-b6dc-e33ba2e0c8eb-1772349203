import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { reconcileCurrentMonth, ReconciliationResult } from "@/lib/reconcile-current-month";

export default function ReconcilePage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  async function handleReconcile() {
    setIsRunning(true);
    setResult(null);

    try {
      const reconciliationResult = await reconcileCurrentMonth();
      setResult(reconciliationResult);
    } catch (error) {
      setResult({
        success: false,
        month: "2026-01",
        transactionsProcessed: 0,
        dailySummariesCreated: 0,
        monthlySummaryUpdated: false,
        before: { monthlyTotal: 0, dailyTotal: 0, difference: 0 },
        after: { monthlyTotal: 0, dailyTotal: 0, difference: 0 },
        errors: [`Unexpected error: ${error instanceof Error ? error.message : String(error)}`],
      });
    } finally {
      setIsRunning(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <RefreshCw className="h-6 w-6" />
              Data Reconciliation
            </CardTitle>
            <CardDescription>
              One-time fix for current month (2026-01) data consistency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  This will rebuild daily and monthly summaries for January 2026 from actual transaction records.
                  This ensures your two-tier summary architecture stays in sync.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleReconcile}
                disabled={isRunning}
                size="lg"
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reconciling...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Reconciliation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Reconciliation Successful
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    Reconciliation Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Month</div>
                  <div className="text-lg font-semibold">{result.month}</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Transactions</div>
                  <div className="text-lg font-semibold">{result.transactionsProcessed}</div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Daily Summaries</div>
                  <div className="text-lg font-semibold">{result.dailySummariesCreated}</div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Updated</div>
                  <div className="text-lg font-semibold">
                    {result.monthlySummaryUpdated ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              {/* Before/After Comparison */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Before Reconciliation</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Total</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(result.before.monthlyTotal)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Daily Total</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(result.before.dailyTotal)}
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Difference</div>
                    <div className="text-lg font-semibold text-red-600">
                      {formatCurrency(Math.abs(result.before.difference))}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold">After Reconciliation</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Total</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(result.after.monthlyTotal)}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Daily Total</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(result.after.dailyTotal)}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    Math.abs(result.after.difference) < 0.01
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                  }`}>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Difference</div>
                    <div className={`text-lg font-semibold ${
                      Math.abs(result.after.difference) < 0.01
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {formatCurrency(Math.abs(result.after.difference))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Errors:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {result.errors.map((error, idx) => (
                        <li key={idx} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {result.success && (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <div className="font-semibold mb-2">✅ Reconciliation Complete!</div>
                    <p className="text-sm">
                      Monthly and daily summaries are now consistent. All new POS transactions will be properly recorded and aggregated.
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>What This Does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Scans Transactions</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reads all actual transaction records from January 2026
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Rebuilds Daily Summaries</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recalculates daily summaries by aggregating transactions by date
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Rebuilds Monthly Summary</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recalculates monthly summary by aggregating the corrected daily summaries
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">4. Verifies Consistency</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Confirms that monthly total matches the sum of daily totals
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}