import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runReportsUAT } from "@/lib/reports-uat";
import type { UATReport } from "@/lib/reports-uat";
import Link from "next/link";

export default function ReportsUATPage() {
  const [results, setResults] = useState<UATReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);
    try {
      const report = await runReportsUAT();
      setResults(report);
    } catch (error) {
      console.error("UAT failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Reports UAT Testing
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Two-Tier Summary Architecture Validation
              </p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline">← Back to Home</Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Suite</CardTitle>
            <CardDescription>
              Comprehensive testing of daily and monthly summary reports with 30-day
              retention policy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>⏳ Running Tests...</>
              ) : (
                <>🚀 Run All UAT Tests</>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Test Results</span>
                {results.passed ? (
                  <span className="text-green-600 dark:text-green-400">✅ All Passed</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    ⚠️ {results.results.filter((r) => !r.passed).length} Failed
                  </span>
                )}
              </CardTitle>
              <CardDescription>{results.timestamp}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Tests</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {results.totalTests}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {results.results.filter((r) => r.passed).length}
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {results.results.filter((r) => !r.passed).length}
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {results.duration}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Test Details</h3>
                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2 border rounded-md p-2">
                  {results.results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 ${
                        result.passed
                          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-2xl">
                            {result.passed ? "✅" : "❌"}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {result.testName}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {result.details}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                          {result.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{results.summary}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}