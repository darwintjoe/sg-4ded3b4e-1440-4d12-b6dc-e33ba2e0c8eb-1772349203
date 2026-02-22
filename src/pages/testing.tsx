import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { runAutomatedTests, exportTestResults, exportTestCSV } from "@/lib/automated-testing";
import type { TestReport } from "@/lib/automated-testing";
import { appHealthChecker } from "@/lib/app-health-check";

interface TestResult {
  category: string;
  testCase: string;
  status: "PASS" | "FAIL";
  message: string;
  duration: number;
  timestamp: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export default function TestingPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isHealthCheckRunning, setIsHealthCheckRunning] = useState(false);
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [healthResults, setHealthResults] = useState<TestResult[]>([]);
  const [healthSummary, setHealthSummary] = useState<TestSummary | null>(null);
  const [uatResults, setUatResults] = useState<any>(null);
  const [autoExecuteUAT, setAutoExecuteUAT] = useState(false);
  const [progress, setProgress] = useState(0);

  const runTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestReport(null);
    setHealthResults([]);
    setHealthSummary(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 95));
      }, 200);

      const report = await runAutomatedTests();
      
      clearInterval(progressInterval);
      setProgress(100);
      setTestReport(report);
    } catch (error) {
      console.error("Testing failed:", error);
      alert("Testing failed: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsRunning(false);
    }
  };

  const runHealthCheck = async () => {
    setIsHealthCheckRunning(true);
    setHealthResults([]);
    setHealthSummary(null);
    setTestReport(null);

    try {
      const report = await appHealthChecker.runHealthCheck();
      
      const testResults: TestResult[] = report.results.map(r => ({
        category: r.category || "Health Check",
        testCase: r.testCase || r.name,
        status: r.passed ? "PASS" : "FAIL",
        message: r.error || r.message || (r.passed ? "Passed" : "Failed"),
        duration: r.duration,
        timestamp: r.timestamp || Date.now()
      }));

      setHealthResults(testResults);
      setHealthSummary({
        total: report.total,
        passed: report.passed,
        failed: report.failed,
        skipped: report.skipped,
        duration: report.duration
      });
    } catch (error) {
      console.error("Health check failed:", error);
      setHealthResults([{
        category: "System",
        testCase: "Health Check Runner",
        status: "FAIL",
        message: error instanceof Error ? error.message : "Unknown error",
        duration: 0,
        timestamp: Date.now()
      }]);
    }

    setIsHealthCheckRunning(false);
  };

  const runUAT = async () => {
    setIsRunning(true);
    setUatResults(null);
    try {
      if (typeof window !== "undefined" && (window as any).runBackupRestoreUAT) {
        const results = await (window as any).runBackupRestoreUAT();
        setUatResults(results);
      } else {
        throw new Error("UAT runner not available");
      }
    } catch (error) {
      console.error("UAT Failed:", error);
      setUatResults({
        success: false,
        error: error instanceof Error ? error.message : "UAT execution failed"
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (autoExecuteUAT && !isRunning && !uatResults) {
      runUAT();
    }
  }, [autoExecuteUAT, isRunning, uatResults]);

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

  const passRate = testReport ? ((testReport.passed / testReport.totalTests) * 100).toFixed(1) : "0";
  const healthPassRate = healthSummary ? ((healthSummary.passed / healthSummary.total) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen overflow-y-auto">
      <div className="container mx-auto p-8 pb-20">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
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
              <div className="flex gap-4 justify-center flex-wrap">
                <Button
                  onClick={runTests}
                  disabled={isRunning || isHealthCheckRunning}
                  variant="default"
                >
                  {isRunning ? "Running Tests..." : "Run All Tests"}
                </Button>
                <Button
                  onClick={runHealthCheck}
                  disabled={isRunning || isHealthCheckRunning}
                  variant="outline"
                >
                  {isHealthCheckRunning ? "Running Health Check..." : "Health Check"}
                </Button>
                <Button
                  onClick={runUAT}
                  disabled={isRunning || isHealthCheckRunning}
                  variant="outline"
                >
                  Run Backup/Restore UAT
                </Button>
              </div>

              {(isRunning || isHealthCheckRunning) && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                    Testing in progress... {progress}%
                  </p>
                </div>
              )}

              {(testReport || healthSummary) && (
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleExportJSON} variant="outline" size="sm">
                    Export JSON
                  </Button>
                  <Button onClick={handleExportCSV} variant="outline" size="sm">
                    Export CSV
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Check Results */}
          {healthSummary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Tests</CardDescription>
                    <CardTitle className="text-3xl">{healthSummary.total}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-green-200 dark:border-green-900">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Passed
                    </CardDescription>
                    <CardTitle className="text-3xl text-green-600">{healthSummary.passed}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Failed
                    </CardDescription>
                    <CardTitle className="text-3xl text-red-600">{healthSummary.failed}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-blue-200 dark:border-blue-900">
                  <CardHeader className="pb-3">
                    <CardDescription>Pass Rate</CardDescription>
                    <CardTitle className="text-3xl text-blue-600">{healthPassRate}%</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {healthSummary.failed === 0 ? (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    🎉 <strong>All health checks passed!</strong> System is healthy.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    ⚠️ <strong>{healthSummary.failed} check(s) failed.</strong> Review details below.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Health Check Details</CardTitle>
                  <CardDescription>
                    Completed in {(healthSummary.duration / 1000).toFixed(2)}s
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {healthResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          result.status === "PASS"
                            ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900"
                            : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900"
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
                              {result.duration.toFixed(0)}ms
                            </span>
                            
                            {result.status === "PASS" ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
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

          {/* Test Report Results */}
          {testReport && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Tests</CardDescription>
                    <CardTitle className="text-3xl">{testReport.totalTests}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-green-200 dark:border-green-900">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Passed
                    </CardDescription>
                    <CardTitle className="text-3xl text-green-600">{testReport.passed}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-red-200 dark:border-red-900">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Failed
                    </CardDescription>
                    <CardTitle className="text-3xl text-red-600">{testReport.failed}</CardTitle>
                  </CardHeader>
                </Card>

                <Card className="border-blue-200 dark:border-blue-900">
                  <CardHeader className="pb-3">
                    <CardDescription>Pass Rate</CardDescription>
                    <CardTitle className="text-3xl text-blue-600">{passRate}%</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {testReport.failed === 0 ? (
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
                    ⚠️ <strong>{testReport.failed} test(s) failed.</strong> Review the details below.
                  </AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Test Results Details</CardTitle>
                  <CardDescription>
                    Completed in {((testReport.endTime - testReport.startTime) / 1000).toFixed(2)}s
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testReport.results.map((result, index) => (
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

          {/* UAT Results */}
          {uatResults && (
            <Card>
              <CardHeader>
                <CardTitle>Backup/Restore UAT Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(uatResults, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!testReport && !healthSummary && !isRunning && !isHealthCheckRunning && (
            <Card>
              <CardHeader>
                <CardTitle>Testing Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p><strong>Available Test Suites:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Run All Tests</strong> - Full automated test suite</li>
                    <li><strong>Health Check</strong> - Quick system health verification</li>
                    <li><strong>Backup/Restore UAT</strong> - Backup and restore workflow tests</li>
                  </ul>
                  
                  <p className="pt-4"><strong>What tests validate:</strong></p>
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
    </div>
  );
}