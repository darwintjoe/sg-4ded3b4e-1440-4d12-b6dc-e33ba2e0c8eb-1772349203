import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runReportsUAT } from "@/lib/reports-uat";
import type { UATReport } from "@/lib/reports-uat";
import Link from "next/link";

export default function ReportsUATPage() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<UATReport | null>(null);

  const handleRunTests = async () => {
    setRunning(true);
    setReport(null);
    try {
      const result = await runReportsUAT();
      setReport(result);
    } catch (error) {
      console.error("UAT failed:", error);
      alert(`UAT Testing Failed: ${error}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">📊 Reports UAT Testing</h1>
            <p className="text-slate-600 mt-2">Two-Tier Summary Architecture Validation</p>
          </div>
          <Link href="/">
            <Button variant="outline">← Back to Home</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Suite</CardTitle>
            <CardDescription>
              Comprehensive testing of daily and monthly summary reports with 30-day retention policy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleRunTests} 
              disabled={running}
              size="lg"
              className="w-full"
            >
              {running ? "Running Tests..." : "🚀 Run All UAT Tests"}
            </Button>
          </CardContent>
        </Card>

        {report && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Test Results</span>
                <span className={report.failed === 0 ? "text-green-600" : "text-red-600"}>
                  {report.failed === 0 ? "✅ All Passed" : `⚠️ ${report.failed} Failed`}
                </span>
              </CardTitle>
              <CardDescription>{report.timestamp}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Tests</div>
                  <div className="text-3xl font-bold text-blue-900">{report.totalTests}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Passed</div>
                  <div className="text-3xl font-bold text-green-900">{report.passed}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">Failed</div>
                  <div className="text-3xl font-bold text-red-900">{report.failed}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Duration</div>
                  <div className="text-3xl font-bold text-purple-900">{(report.duration / 1000).toFixed(1)}s</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Test Details</h3>
                <div className="bg-slate-50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="text-left p-3 font-semibold">Status</th>
                        <th className="text-left p-3 font-semibold">Test Name</th>
                        <th className="text-left p-3 font-semibold">Details</th>
                        <th className="text-right p-3 font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.results.map((result, idx) => (
                        <tr key={idx} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="p-3">
                            <span className={result.passed ? "text-green-600" : "text-red-600"}>
                              {result.passed ? "✅" : "❌"}
                            </span>
                          </td>
                          <td className="p-3 font-medium">{result.testName}</td>
                          <td className="p-3 text-slate-600 text-sm">{result.details}</td>
                          <td className="p-3 text-right text-slate-500 text-sm">{result.duration.toFixed(2)}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${report.failed === 0 ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                <p className={`font-medium ${report.failed === 0 ? "text-green-900" : "text-yellow-900"}`}>
                  {report.summary}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}