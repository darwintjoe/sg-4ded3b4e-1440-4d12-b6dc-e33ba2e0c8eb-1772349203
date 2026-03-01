import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function TranslatePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/translate-manual", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Translation failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Manual Translation Tool</h1>
          <p className="text-gray-600">Translate missing Indonesian and Chinese keys</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              This tool will:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Scan translations.ts for missing Indonesian (id) and Chinese (zh) keys</li>
                <li>Translate missing keys using Google Translate API</li>
                <li>Update translations.ts file directly</li>
                <li>Generate downloadable backup of translations</li>
              </ol>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleTranslate}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Translating...
                </>
              ) : (
                "Start Translation"
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-4">
                {result.missingCount === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      All translations are up to date! No missing keys found.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Alert>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        Successfully translated {result.translatedCount} keys!
                      </AlertDescription>
                    </Alert>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Translation Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Indonesian (id)</span>
                          <Badge variant="secondary">{result.languages.id} keys</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Chinese (zh)</span>
                          <Badge variant="secondary">{result.languages.zh} keys</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {result.downloadUrl && (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full"
                      >
                        <a href={result.downloadUrl} download="translations.ts">
                          Download Updated Translations File
                        </a>
                      </Button>
                    )}

                    <Alert>
                      <AlertDescription className="text-sm">
                        <strong>Next Steps:</strong>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Download the updated translations file (optional backup)</li>
                          <li>Restart your Next.js server to see changes</li>
                          <li>Deploy to Vercel via Softgen Publish button</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ <code>GOOGLE_TRANSLATE_API_KEY</code> must be set in environment variables</p>
              <p>ℹ️ This tool modifies files directly - no GitHub push required</p>
              <p>⚠️ Make sure to restart server after translation completes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}