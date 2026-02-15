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

export default function POSSalesUATPage() {
  const [results, setResults] = useState<POSUATReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const report = await runPOSSalesUAT();
      setResults(report);
    } catch (error) {
      console.error("POS Sales UAT failed:", error);
    } finally {
      setIsRunning(false);
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">💰</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                POS Sales UAT
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive transaction simulation and validation
              </p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline">← Back to Home</Button>
          </Link>
        </div>

        {/* Test Scenario Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Scenario</CardTitle>
            <CardDescription>
              This UAT simulates realistic POS transactions and validates data integrity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-sm">
                <strong>100 transactions per day</strong> for 10 consecutive days (1,000 total)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-sm">
                <strong>5-10 items per transaction</strong> (randomized)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-sm">
                <strong>Mixed payment methods:</strong> Cash (40%), QRIS (30%), Split (30%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-sm">
                <strong>Data validation:</strong> Receipts, Items, Daily Summaries, Payment Breakdown
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-sm">
                <strong>Report verification:</strong> Revenue, Transactions, Top Items
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Run Test Button */}
        <Button
          onClick={runTests}
          disabled={isRunning}
          size="lg"
          className="w-full"
        >
          {isRunning ? (
            <>⏳ Running Sales UAT...</>
          ) : (
            <>🚀 Run Sales UAT</>
          )}
        </Button>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">⏱️</span>
                    Total Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {results.totalTests}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Completed in {results.duration}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">
                      {results.passed === results.totalTests ? "✅" : "⚠️"}
                    </span>
                    Passed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${
                    results.passed === results.totalTests 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {results.passed}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {((results.passed / results.totalTests) * 100).toFixed(1)}% success rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Validations */}
            <Card>
              <CardHeader>
                <CardTitle>📅 Daily Validations</CardTitle>
                <CardDescription>
                  Detailed breakdown of each day's transaction data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: "600px" }}>
                  {results.dailyValidations.map((validation, idx) => (
                    <div
                      key={validation.date}
                      className={`p-4 rounded-lg border ${
                        validation.passed
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {validation.passed ? "✅" : "❌"}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {validation.date}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Day {idx + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                          <div className="font-mono">
                            Expected: Rp {validation.expectedRevenue.toLocaleString()}
                          </div>
                          <div className="font-mono">
                            Actual: Rp {validation.actualRevenue.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Transactions:</span>
                          <div className="font-mono">
                            Expected: {validation.expectedTransactions}
                          </div>
                          <div className="font-mono">
                            Actual: {validation.actualTransactions}
                          </div>
                        </div>
                      </div>

                      {validation.issues.length > 0 && (
                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm">
                          <strong>Issues:</strong>
                          <ul className="list-disc list-inside">
                            {validation.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Errors (if any) */}
            {results.errors.length > 0 && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">
                    ⚠️ Errors Detected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "300px" }}>
                    {results.errors.map((error, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                      >
                        <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                          {error}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}