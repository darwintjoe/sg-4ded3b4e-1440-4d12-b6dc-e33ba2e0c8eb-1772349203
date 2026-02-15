import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runPOSSalesUAT } from "@/lib/pos-sales-uat";
import type { POSUATReport } from "@/lib/pos-sales-uat";
import { Play, CheckCircle, XCircle, Clock, DollarSign, ShoppingCart, CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function POSSalesUATPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<POSUATReport | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);
    try {
      const testResults = await runPOSSalesUAT();
      setResults(testResults);
    } catch (error) {
      console.error("UAT failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">💰</div>
            <div>
              <h1 className="text-3xl font-bold">POS Sales UAT</h1>
              <p className="text-muted-foreground">Comprehensive transaction simulation and validation</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Test Scenario */}
        <Card>
          <CardHeader>
            <CardTitle>Test Scenario</CardTitle>
            <CardDescription>
              This UAT simulates realistic POS transactions and validates data integrity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">100 transactions per day</span> for 10 consecutive days (1,000 total)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">5-10 items per transaction</span> (randomized)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Mixed payment methods:</span> Cash (40%), QRIS (30%), Split (30%)
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Data validation:</span> Receipts, Items, Daily Summaries, Payment Breakdown
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold">Report verification:</span> Revenue, Transactions, Top Items
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run Test Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Play className="w-5 h-5 mr-2 animate-pulse" />
                  Running Sales UAT... This may take 30-60 seconds
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  🚀 Run Sales UAT
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Total Tests</div>
                  <div className="text-4xl font-bold text-blue-600">{results.totalTests}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Status</div>
                  <div className={`text-4xl font-bold ${results.passed === results.totalTests ? "text-green-600" : "text-red-600"}`}>
                    {results.passed === results.totalTests ? "✅ ALL PASSED" : `❌ ${results.failed} FAILED`}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Simulation Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Simulation Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <ShoppingCart className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">Transactions</div>
                      <div className="text-2xl font-bold">{results.simulations.totalTransactions}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                      <div className="text-2xl font-bold">
                        Rp {results.simulations.totalRevenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <CreditCard className="w-8 h-8 text-purple-600" />
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Transaction</div>
                      <div className="text-2xl font-bold">
                        Rp {(results.simulations.totalRevenue / results.simulations.totalTransactions).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Cash Only</div>
                    <div className="text-xl font-semibold text-green-600">
                      {results.simulations.cashTransactions}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">QRIS Only</div>
                    <div className="text-xl font-semibold text-blue-600">
                      {results.simulations.qrisTransactions}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Split Payment</div>
                    <div className="text-xl font-semibold text-purple-600">
                      {results.simulations.splitTransactions}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Validations - Simple table, no height constraints */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Validations</CardTitle>
                <CardDescription>
                  10 consecutive days of sales validation - all results shown below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.validations.map((dailyData, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        dailyData.validation.match
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {dailyData.validation.match ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <h3 className="font-semibold">Day {idx + 1}: {dailyData.date}</h3>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {dailyData.validation.actualTransactions} transactions
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground mb-1">Revenue</div>
                          <div className="font-medium">
                            Rp {dailyData.validation.actualRevenue.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Expected: Rp {dailyData.validation.expectedRevenue.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div className="text-muted-foreground mb-1">Cash Total</div>
                          <div className="font-medium">
                            Rp {dailyData.validation.actualCashTotal.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div className="text-muted-foreground mb-1">QRIS Total</div>
                          <div className="font-medium">
                            Rp {dailyData.validation.actualQrisTotal.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div className="text-muted-foreground mb-1">Top Item Sold</div>
                          <div className="font-medium">
                            {dailyData.topItems?.[0]?.actualQuantity || 0} units
                          </div>
                        </div>
                      </div>

                      {!dailyData.validation.match && (
                        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-red-700 dark:text-red-300 text-sm">
                          ⚠️ Validation failed - check revenue or payment totals
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Test Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Tests:</span>
                    <span className="font-medium text-lg">{results.totalTests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Passed:</span>
                    <span className="font-medium text-lg text-green-600">{results.passed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Failed:</span>
                    <span className="font-medium text-lg text-red-600">{results.failed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="font-medium text-lg">
                      {((results.passed / results.totalTests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium text-lg">{(results.duration / 1000).toFixed(1)}s</span>
                  </div>
                </div>

                {results.passed === results.totalTests && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">All validations passed! ✨</span>
                    </div>
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                      Transaction simulation, data integrity, and report calculations are all working correctly.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}