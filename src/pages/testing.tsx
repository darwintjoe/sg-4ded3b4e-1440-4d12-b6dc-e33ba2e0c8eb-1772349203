import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlayCircle, Download, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { runAutomatedTests, exportTestResults, exportTestCSV } from "@/lib/automated-testing";
import type { TestReport } from "@/lib/automated-testing";

export default function TestingPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<TestReport | null>(null);
  const [progress, setProgress] = useState(0);

  const handleRunTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setReport(null);

    try {
      // Simulate progress updates (in real implementation, this would be event-based)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 95));
      }, 200);

      const testReport = await runAutomatedTests();
      
      clearInterval(progressInterval);
      setProgress(100);
      setReport(testReport);
    } catch (error) {
      console.error("Testing failed:", error);
      alert("Testing failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportJSON = () => {
    const json = exportTestResults();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csv = exportTestCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const passRate = report ? ((report.passed / report.totalTests) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">🤖 Automated Testing Suite</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive machine testing for SELL MORE UAT validation
          </p>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Test Execution Control</CardTitle>
            <CardDescription>
              Run automated tests to validate all critical workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={handleRunTests}
                disabled={isRunning}
                className="flex-1"
                size="lg"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                {isRunning ? "Running Tests..." : "Run All Tests"}
              </Button>
              
              {report && (
                <>
                  <Button
                    onClick={handleExportJSON}
                    variant="outline"
                    size="lg"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Export JSON
                  </Button>
                  
                  <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Export CSV
                  </Button>
                </>
              )}
            </div>

            {isRunning && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                  Testing in progress... {progress}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results Summary */}
        {report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Tests</CardDescription>
                  <CardTitle className="text-3xl">{report.totalTests}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-green-200 dark:border-green-900">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Passed
                  </CardDescription>
                  <CardTitle className="text-3xl text-green-600">{report.passed}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-red-200 dark:border-red-900">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Failed
                  </CardDescription>
                  <CardTitle className="text-3xl text-red-600">{report.failed}</CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3">
                  <CardDescription>Pass Rate</CardDescription>
                  <CardTitle className="text-3xl text-blue-600">{passRate}%</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Overall Status Alert */}
            {report.failed === 0 ? (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  🎉 <strong>All tests passed!</strong> The application is ready for UAT.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  ⚠️ <strong>{report.failed} test(s) failed.</strong> Review the details below and fix issues before UAT.
                </AlertDescription>
              </Alert>
            )}

            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results Details</CardTitle>
                <CardDescription>
                  Completed in {((report.endTime - report.startTime) / 1000).toFixed(2)}s
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.status === "PASS"
                          ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900"
                          : result.status === "FAIL"
                          ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900"
                          : "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {result.category}
                            </Badge>
                            <span className="font-medium">{result.testCase}</span>
                          </div>
                          
                          {result.status === "FAIL" && (
                            <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                              {result.message}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">
                            {result.duration.toFixed(2)}ms
                          </span>
                          
                          {result.status === "PASS" ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : result.status === "FAIL" ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Instructions */}
        {!report && !isRunning && (
          <Card>
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p><strong>What this test suite validates:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Authentication & role-based access control</li>
                  <li>POS cart operations and search functionality</li>
                  <li>Pause/resume functionality with persistence</li>
                  <li>Payment processing (single, mixed, overpayment)</li>
                  <li>Master data CRUD operations (items & employees)</li>
                  <li>Data integrity and uniqueness validation</li>
                  <li>Transaction-protected deletion</li>
                </ul>
                
                <p className="pt-4"><strong>Before running tests:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Tests will clear existing data in test stores</li>
                  <li>Test data will be seeded automatically</li>
                  <li>Results can be exported as JSON or CSV</li>
                  <li>Check browser console for detailed logs</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}