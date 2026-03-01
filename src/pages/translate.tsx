import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2, Globe } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type TranslationStatus = "idle" | "translating" | "success" | "error";

interface LanguageProgress {
  code: string;
  name: string;
  totalKeys: number;
  translatedKeys: number;
  progress: number;
  status: TranslationStatus;
  message?: string;
}

export default function TranslatePage() {
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [languageProgress, setLanguageProgress] = useState<LanguageProgress[]>([]);

  const targetLanguages = [
    { code: "th", name: "Thai (ไทย)" },
    { code: "vi", name: "Vietnamese (Tiếng Việt)" },
    { code: "my", name: "Myanmar (မြန်မာ)" }
  ];

  const updateLanguageProgress = (code: string, updates: Partial<LanguageProgress>) => {
    setLanguageProgress(prev => {
      const existing = prev.find(l => l.code === code);
      if (existing) {
        return prev.map(l => l.code === code ? { ...l, ...updates } : l);
      } else {
        return [...prev, { code, name: "", totalKeys: 0, translatedKeys: 0, progress: 0, status: "idle", ...updates }];
      }
    });
  };

  const translateLanguage = async (languageCode: string, languageName: string) => {
    let startIndex = 0;
    let completed = false;

    updateLanguageProgress(languageCode, {
      name: languageName,
      status: "translating",
      progress: 0
    });

    while (!completed) {
      try {
        const response = await fetch("/api/translate-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetLanguage: languageCode,
            startIndex
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || "Translation failed");
        }

        const data = await response.json();

        updateLanguageProgress(languageCode, {
          totalKeys: data.totalKeys || 0,
          translatedKeys: data.translatedKeys || 0,
          progress: data.progress || 0,
          status: data.completed ? "success" : "translating",
          message: data.message
        });

        if (data.completed) {
          completed = true;
        } else {
          startIndex = data.nextStartIndex || startIndex + 30;
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        updateLanguageProgress(languageCode, {
          status: "error",
          message: error instanceof Error ? error.message : "Translation failed"
        });
        throw error;
      }
    }
  };

  const handleStartTranslation = async () => {
    setStatus("translating");
    setMessage("Starting translation process...");
    setLanguageProgress([]);

    try {
      for (const lang of targetLanguages) {
        setMessage(`Translating ${lang.name}...`);
        await translateLanguage(lang.code, lang.name);
      }

      setStatus("success");
      setMessage("All translations completed successfully! Please restart the server to see changes.");

    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Translation failed");
    }
  };

  const allCompleted = languageProgress.length > 0 && 
    languageProgress.every(l => l.status === "success");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Manual Translation Tool
          </h1>
          <p className="text-muted-foreground">
            Translate missing Indonesian and Chinese keys
          </p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              How it Works
            </CardTitle>
            <CardDescription>This tool will:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Scan translations.ts for missing Indonesian (id) and Chinese (zh) keys</li>
              <li>Translate missing keys using Google Translate API</li>
              <li>Update translations.ts file directly</li>
              <li>Generate downloadable backup of translations</li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <Button 
              onClick={handleStartTranslation}
              disabled={status === "translating"}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {status === "translating" ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Translating...
                </>
              ) : (
                "Start Translation"
              )}
            </Button>

            {message && (
              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                status === "error" 
                  ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900" 
                  : status === "success"
                  ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                  : "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
              }`}>
                {status === "error" ? (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                ) : status === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
                )}
                <p className={`text-sm font-medium ${
                  status === "error" 
                    ? "text-red-800 dark:text-red-200" 
                    : status === "success"
                    ? "text-green-800 dark:text-green-200"
                    : "text-blue-800 dark:text-blue-200"
                }`}>
                  {message}
                </p>
              </div>
            )}

            {languageProgress.length > 0 && (
              <div className="space-y-3 pt-2">
                {languageProgress.map((lang) => (
                  <div key={lang.code} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        {lang.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {lang.status === "error" && <AlertCircle className="w-4 h-4 text-red-600" />}
                        {lang.status === "translating" && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                        {lang.name}
                      </span>
                      <span className="text-muted-foreground">
                        {lang.translatedKeys} / {lang.totalKeys} keys ({lang.progress}%)
                      </span>
                    </div>
                    <Progress value={lang.progress} className="h-2" />
                  </div>
                ))}
              </div>
            )}

            {allCompleted && (
              <div className="pt-4 border-t">
                <p className="text-sm text-center text-muted-foreground">
                  🎉 Translation complete! Restart the server to see changes.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 shadow-lg bg-slate-50 dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-700 dark:text-green-400 font-medium">GOOGLE_TRANSLATE_API_KEY configured</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-700 dark:text-green-400 font-medium">This tool modifies source files - make sure to test after translating</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-green-700 dark:text-green-400 font-medium">Make sure to restart server after translation completes</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}