import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runReportsUAT } from "@/lib/reports-uat";
import type { UATReport } from "@/lib/reports-uat";
import { CheckCircle, XCircle, Clock, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReportsUATPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<UATReport | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);
    try {
      const testResults = await runReportsUAT();
      setResults(testResults);
    } catch (error) {
      console.error("UAT failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold">Reports UAT Testing</h1>
              <p className="text-muted-foreground">Two-Tier Summary Architecture Validation</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
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
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  🚀 Run All UAT Tests
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Total Tests</div>
                  <div className="text-3xl font-bold text-blue-600">{results.totalTests}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Passed</div>
                  <div className="text-3xl font-bold text-green-600">{results.passed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Failed</div>
                  <div className="text-3xl font-bold text-red-600">{results.failed}</div>
                  {results.failed > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">{results.failed} Failed</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground mb-2">Duration</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {(results.duration / 1000).toFixed(1)}s
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Details - SIMPLE TABLE WITH NO HEIGHT CONSTRAINTS */}
            <Card>
              <CardHeader>
                <CardTitle>Test Details</CardTitle>
                <CardDescription>
                  Showing all {results.totalTests} test results - scroll down to see more
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Test Name</th>
                        <th className="text-left p-3 font-medium">Details</th>
                        <th className="text-right p-3 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.results.map((result, index) => (
                        <tr
                          key={index}
                          className={`border-t ${
                            result.passed
                              ? "hover:bg-green-50/50 dark:hover:bg-green-900/10"
                              : "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                          }`}
                        >
                          <td className="p-3">
                            {result.passed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </td>
                          <td className="p-3 font-medium">{result.testName}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            <div>{result.details}</div>
                            {result.error && (
                              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-red-700 dark:text-red-300 text-xs font-mono">
                                Error: {result.error}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right text-sm">
                            <div className="flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3" />
                              {result.duration}ms
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Test Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tests:</span>
                    <span className="font-medium">{results.totalTests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Passed:</span>
                    <span className="font-medium text-green-600">{results.passed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Failed:</span>
                    <span className="font-medium text-red-600">{results.failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="font-medium">
                      {((results.passed / results.totalTests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Duration:</span>
                    <span className="font-medium">{(results.duration / 1000).toFixed(2)}s</span>
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