import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runPOSSalesUAT } from "@/lib/pos-sales-uat";
import Link from "next/link";
import { ArrowLeft, Play, CheckCircle, XCircle, Clock, DollarSign, ShoppingCart, CreditCard } from "lucide-react";

interface UATReport {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  simulations: {
    totalTransactions: number;
    totalItems: number;
    totalRevenue: number;
    cashTransactions: number;
    qrisTransactions: number;
    splitTransactions: number;
  };
  validations: Array<{
    date: string;
    validation: {
      expectedRevenue: number;
      actualRevenue: number;
      expectedTransactions: number;
      actualTransactions: number;
      expectedCashTotal: number;
      actualCashTotal: number;
      expectedQrisTotal: number;
      actualQrisTotal: number;
      match: boolean;
    };
    topItems: Array<{
      itemName: string;
      expectedQuantity: number;
      actualQuantity: number;
      match: boolean;
    }>;
  }>;
  errors: string[];
  summary: string;
}

export default function POSSalesUAT() {
  const [report, setReport] = useState<UATReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setRunning(true);
    setError(null);
    setReport(null);

    try {
      const result = await runPOSSalesUAT();
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setRunning(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">🏪 POS Sales UAT</h1>
              <p className="text-muted-foreground">
                Comprehensive transaction simulation and validation
              </p>
            </div>
          </div>
          <Button
            onClick={runTests}
            disabled={running}
            size="lg"
            className="gap-2"
          >
            <Play className="h-5 w-5" />
            {running ? "Running Tests..." : "🚀 Run Sales UAT"}
          </Button>
        </div>

        {/* Test Description */}
        <Card>
          <CardHeader>
            <CardTitle>Test Scenario</CardTitle>
            <CardDescription>
              This UAT simulates realistic POS transactions and validates data integrity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✅ <strong>100 transactions per day</strong> for 10 consecutive days (1,000 total)</li>
              <li>✅ <strong>5-10 items per transaction</strong> (randomized)</li>
              <li>✅ <strong>Mixed payment methods:</strong> Cash (40%), QRIS (30%), Split (30%)</li>
              <li>✅ <strong>Data validation:</strong> Receipts, Items, Daily Summaries, Payment Breakdown</li>
              <li>✅ <strong>Report verification:</strong> Revenue, Transactions, Top Items</li>
            </ul>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {report && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.totalTests}</div>
                  <p className="text-xs text-muted-foreground">
                    Completed in {formatDuration(report.duration)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Passed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{report.passed}</div>
                  <p className="text-xs text-muted-foreground">
                    {((report.passed / report.totalTests) * 100).toFixed(1)}% success rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{report.failed}</div>
                  <p className="text-xs text-muted-foreground">
                    {report.failed === 0 ? "All tests passed!" : "Some tests failed"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(report.simulations.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report.simulations.totalTransactions} transactions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Simulation Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Simulation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                    <p className="text-2xl font-bold">{report.simulations.totalTransactions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items Sold</p>
                    <p className="text-2xl font-bold">{report.simulations.totalItems}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Items/Transaction</p>
                    <p className="text-2xl font-bold">
                      {(report.simulations.totalItems / report.simulations.totalTransactions).toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Method Distribution
                  </p>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Cash:</span>
                      <span className="text-sm font-medium">{report.simulations.cashTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">QRIS:</span>
                      <span className="text-sm font-medium">{report.simulations.qrisTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Split:</span>
                      <span className="text-sm font-medium">{report.simulations.splitTransactions}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Validations */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Validations ({report.validations.length} days)</CardTitle>
                <CardDescription>
                  {report.summary}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto pr-4 space-y-4 border rounded-md p-2">
                  {report.validations.map((validation) => (
                    <div
                      key={validation.date}
                      className={`p-4 rounded-lg border ${
                        validation.validation.match
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : "border-red-500 bg-red-50 dark:bg-red-950"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                          {validation.validation.match ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          {validation.date}
                        </h3>
                        <span className="text-sm font-medium">
                          {validation.validation.expectedTransactions} transactions
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-medium">
                            Expected: {formatCurrency(validation.validation.expectedRevenue)}
                          </p>
                          <p className="font-medium">
                            Actual: {formatCurrency(validation.validation.actualRevenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Transactions</p>
                          <p className="font-medium">
                            Expected: {validation.validation.expectedTransactions}
                          </p>
                          <p className="font-medium">
                            Actual: {validation.validation.actualTransactions}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cash Total</p>
                          <p className="font-medium">
                            Expected: {formatCurrency(validation.validation.expectedCashTotal)}
                          </p>
                          <p className="font-medium">
                            Actual: {formatCurrency(validation.validation.actualCashTotal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">QRIS Total</p>
                          <p className="font-medium">
                            Expected: {formatCurrency(validation.validation.expectedQrisTotal)}
                          </p>
                          <p className="font-medium">
                            Actual: {formatCurrency(validation.validation.actualQrisTotal)}
                          </p>
                        </div>
                      </div>

                      {validation.topItems.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium mb-2">Top 5 Items</p>
                          <div className="space-y-1">
                            {validation.topItems.map((item) => (
                              <div
                                key={item.itemName}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="flex items-center gap-1">
                                  {item.match ? (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  {item.itemName}
                                </span>
                                <span>
                                  Exp: {item.expectedQuantity} / Act: {item.actualQuantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Errors */}
            {report.errors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Errors ({report.errors.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {report.errors.map((error, index) => (
                      <li key={index} className="text-sm text-destructive">
                        {error}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>✅ Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">
                  Now that the transactions are simulated, verify the data in the Reports Panel:
                </p>
                <div className="space-y-2">
                  <Link href="/admin">
                    <Button className="w-full justify-start" variant="outline">
                      📊 Open Admin Reports Panel
                    </Button>
                  </Link>
                  <div className="text-xs text-muted-foreground space-y-1 pl-4">
                    <p>• Check Sales Overview tab for accurate totals</p>
                    <p>• Verify Payment Breakdown matches simulated data</p>
                    <p>• Test all time ranges (1D, 7D, L30D, 1M, etc.)</p>
                    <p>• Check Top Items ranking</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}