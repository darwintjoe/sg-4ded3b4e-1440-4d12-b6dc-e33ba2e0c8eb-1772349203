import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportsUAT } from "@/lib/reports-uat";
import { Play, Download, CheckCircle, XCircle, Clock } from "lucide-react";

export default function ReportsUATPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [progress, setProgress] = useState("");

  const runTests = async () => {
    setIsRunning(true);
    setProgress("Initializing UAT tests...");
    
    try {
      const uat = new ReportsUAT();
      
      setProgress("Running comprehensive tests...");
      const result = await uat.runAllTests();
      
      setReport(result);
      setProgress("Tests completed!");
      
      // Generate and download HTML report
      const html = await uat.generateHTMLReport(result);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reports-uat-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("UAT failed:", error);
      setProgress(`Error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadJSON = () => {
    if (!report) return;
    
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-uat-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const passRate = report ? ((report.passed / report.totalTests) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">📊 Reports UAT Testing</h1>
          <p className="text-muted-foreground">
            Comprehensive validation of two-tier summary architecture
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={runTests}
                disabled={isRunning}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isRunning ? "Running Tests..." : "Run All Tests"}
              </Button>
              
              {report && (
                <Button
                  onClick={downloadJSON}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download JSON Report
                </Button>
              )}
            </div>
            
            {progress && (
              <div className="text-sm text-muted-foreground">
                {progress}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tests Passed</p>
                      <p className="text-3xl font-bold text-green-600">
                        {report.passed}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tests Failed</p>
                      <p className="text-3xl font-bold text-red-600">
                        {report.failed}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pass Rate</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {passRate}%
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {(report.duration / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Test Name</th>
                        <th className="text-left py-3 px-4">Details</th>
                        <th className="text-right py-3 px-4">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.results.map((result: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            {result.passed ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {result.testName}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {result.details}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {result.duration.toFixed(2)}ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{report.summary}</p>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Architecture:</strong> Two-tier summary tables with 30-day daily retention + unlimited monthly history
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Test Coverage:</strong> Database initialization, data generation, query performance, edge cases, data consistency
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Initial State */}
        {!report && !isRunning && (
          <Card>
            <CardContent className="py-12 text-center">
              <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Ready to Run Tests</h3>
              <p className="text-muted-foreground mb-4">
                Click "Run All Tests" to validate the two-tier architecture
              </p>
              <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-1">
                <li>✓ Database schema validation</li>
                <li>✓ Sample data generation</li>
                <li>✓ Daily & monthly query tests</li>
                <li>✓ All time range validations (1D - 5Y)</li>
                <li>✓ Two-tier query strategy</li>
                <li>✓ Edge case handling</li>
                <li>✓ Data consistency checks</li>
                <li>✓ Performance benchmarks</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}