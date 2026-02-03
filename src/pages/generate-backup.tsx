import { useState } from "react";
import { generateBackup } from "../../scripts/generate-backup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, CheckCircle, Loader2 } from "lucide-react";

export default function GenerateBackupPage() {
  const [generating, setGenerating] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      setComplete(false);

      await generateBackup();

      setComplete(true);
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to generate backup");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Generate Test Backup</CardTitle>
            <CardDescription>
              Create a realistic backup file with 26 months of SellMore Mart data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Backup Contents:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✅ 200 SKU Indonesian convenience store items</li>
                <li>✅ 8 employees (2 cashiers + 6 helpers)</li>
                <li>✅ 26 months operation (Dec 2023 - Feb 2026)</li>
                <li>✅ ~120 transactions/day average</li>
                <li>✅ 60% QRIS / 40% Cash split</li>
                <li>✅ 2 shifts daily (06:00-14:00, 14:00-22:00)</li>
                <li>✅ Daily & monthly summary tables</li>
                <li>✅ Recent 60 days of shift records</li>
                <li>✅ PPN 10% inclusive tax</li>
              </ul>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {complete && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    Backup Generated Successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    The file has been downloaded to your device.
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Backup...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Generate & Download Backup
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>💡 <strong>Note:</strong> This will generate a compressed .json.gz file (~1-2MB) ready for testing the restore function.</p>
              <p>🔐 The file includes metadata with checksum for validation.</p>
              <p>📊 All data is realistic and follows Indonesian convenience store patterns.</p>
              <p>📦 File is gzip compressed, matching the exact format of automated backups.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}