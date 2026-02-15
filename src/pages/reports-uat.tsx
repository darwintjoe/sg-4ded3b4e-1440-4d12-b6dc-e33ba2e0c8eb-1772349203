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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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

        {/* Test Suite Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Suite</CardTitle>
            <CardDescription>
              Comprehensive testing of daily and monthly summary reports with 30-day retention policy
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

        {/* Results */}
        {results && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>{results.timestamp}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {results.results.filter(r => !r.passed).length === 0 ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      ✅ All Passed
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      ⚠️ {results.results.filter(r => !r.passed).length} Failed
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Tests</div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {results.totalTests}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {results.results.filter(r => r.passed).length}
                  </div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {results.results.filter(r => !r.passed).length}
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {results.duration}
                  </div>
                </div>
              </div>

              {/* Test Details */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Test Details
                </h3>
                <div className="overflow-hidden border rounded-lg">
                  {/* Table Header - Fixed */}
                  <div className="bg-gray-50 dark:bg-gray-800 border-b">
                    <div className="grid grid-cols-12 gap-4 p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <div className="col-span-1">Status</div>
                      <div className="col-span-4">Test Name</div>
                      <div className="col-span-5">Details</div>
                      <div className="col-span-2">Duration</div>
                    </div>
                  </div>
                  
                  {/* Scrollable Results */}
                  <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
                    {results.results.map((result, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-4 p-3 text-sm border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="col-span-1">
                          {result.passed ? (
                            <span className="text-green-600 dark:text-green-400">✅</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">❌</span>
                          )}
                        </div>
                        <div className="col-span-4 font-medium text-gray-900 dark:text-white">
                          {result.testName}
                        </div>
                        <div className="col-span-5 text-gray-600 dark:text-gray-400">
                          {result.details}
                        </div>
                        <div className="col-span-2 text-gray-500 dark:text-gray-500">
                          {result.duration}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Summary
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {results.summary}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}