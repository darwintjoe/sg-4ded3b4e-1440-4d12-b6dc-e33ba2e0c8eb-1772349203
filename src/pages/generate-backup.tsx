import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateSubscriptionCode, decodeSubscriptionCode, DecodedCode } from "@/lib/subscription-service";
import { Key, Copy, CheckCircle2, AlertTriangle, Lock, Calendar, Clock } from "lucide-react";

const ADMIN_PASSWORD = "sellmore2026"; // Change this to your secure password

export default function GenerateBackupPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  const [duration, setDuration] = useState<string>("12");
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState(false);
  
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState<DecodedCode | null>(null);
  
  const [generatedCodes, setGeneratedCodes] = useState<Array<{code: string; duration: number; date: string; timestamp: string}>>([]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError("");
    } else {
      setPasswordError("Invalid password");
    }
  };

  const handleGenerate = () => {
    try {
      const code = generateSubscriptionCode(parseInt(duration), new Date(issueDate));
      setGeneratedCode(code);
      setCopiedCode(false);
      
      // Add to history
      setGeneratedCodes(prev => [{
        code,
        duration: parseInt(duration),
        date: issueDate,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 50)); // Keep last 50
    } catch (error) {
      console.error("Failed to generate code:", error);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleVerify = () => {
    if (!verifyCode.trim()) {
      setVerifyResult(null);
      return;
    }
    const result = decodeSubscriptionCode(verifyCode);
    setVerifyResult(result);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-slate-900 dark:bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-white dark:text-slate-900" />
            </div>
            <CardTitle>Sell More Admin</CardTitle>
            <CardDescription>Subscription Code Generator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
            </div>
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Subscription Code Generator</h1>
            <p className="text-muted-foreground">Generate and verify Sell More subscription codes</p>
          </div>
          <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
            Logout
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Generate Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Generate Code
              </CardTitle>
              <CardDescription>Create new subscription codes for pre-sale cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months (1 Year)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>

              <Button onClick={handleGenerate} className="w-full">
                Generate Code
              </Button>

              {generatedCode && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">Generated Code:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(generatedCode)}
                      className="h-8"
                    >
                      {copiedCode ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="font-mono text-lg font-bold text-green-800 dark:text-green-300 break-all">
                    {generatedCode}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verify Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Verify Code
              </CardTitle>
              <CardDescription>Check if a subscription code is valid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subscription Code</Label>
                <Input
                  placeholder="SM-XXXX-XXXX-XXXXX"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>

              <Button onClick={handleVerify} variant="outline" className="w-full">
                Verify Code
              </Button>

              {verifyResult && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  verifyResult.valid 
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                }`}>
                  {verifyResult.valid ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">Valid Code</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Duration: {verifyResult.durationMonths} month(s)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Issued: {verifyResult.issueDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">{verifyResult.error}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Generated Codes History */}
        {generatedCodes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Generated Codes</CardTitle>
              <CardDescription>Codes generated in this session (not persisted)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generatedCodes.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-medium truncate">{item.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.duration} month(s) • Issued: {item.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.duration}M</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(item.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Note:</strong> This page is for admin use only. Generated codes are not stored on any server. 
            Keep track of issued codes manually or integrate with a database for production use.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}