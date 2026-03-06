import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  generateSubscriptionCode, 
  formatPriceIDR,
  getPricingConfig,
  savePricingConfig,
  getPaymentTransactions,
  type PricingConfig,
  type PaymentTransaction
} from "@/lib/subscription-service";
import { 
  Copy, 
  Download, 
  Plus, 
  QrCode, 
  CreditCard, 
  Package,
  Check,
  Clock,
  Trash2,
  RefreshCw,
  Cloud,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

// Types
interface GeneratedCode {
  code: string;
  durationMonths: number;
  createdAt: string;
  usedAt: string | null;
  usedBy: string | null;
  paymentMethod: "batch" | "qris" | "card";
  paymentRef: string | null;
}

// Google Sheets configuration
const SPREADSHEET_NAME = "SellMore Codes";
const SHEET_NAME = "Codes";

// Google API helpers
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
    gapi?: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey?: string; discoveryDocs: string[] }) => Promise<void>;
        setToken: (token: { access_token: string }) => void;
        sheets: {
          spreadsheets: {
            get: (params: { spreadsheetId: string }) => Promise<{ result: { sheets: Array<{ properties: { title: string } }> } }>;
            create: (params: { resource: { properties: { title: string }; sheets: Array<{ properties: { title: string } }> } }) => Promise<{ result: { spreadsheetId: string } }>;
            values: {
              get: (params: { spreadsheetId: string; range: string }) => Promise<{ result: { values?: string[][] } }>;
              append: (params: { spreadsheetId: string; range: string; valueInputOption: string; resource: { values: string[][] } }) => Promise<void>;
              update: (params: { spreadsheetId: string; range: string; valueInputOption: string; resource: { values: string[][] } }) => Promise<void>;
              clear: (params: { spreadsheetId: string; range: string }) => Promise<void>;
            };
            batchUpdate: (params: { spreadsheetId: string; resource: { requests: Array<{ addSheet?: { properties: { title: string } } }> } }) => Promise<void>;
          };
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

export default function SubscriptionAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);
  const [batchDuration, setBatchDuration] = useState<string>("1");
  const [batchCount, setBatchCount] = useState<string>("10");
  const [singleDuration, setSingleDuration] = useState<string>("1");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "card">("qris");
  const [paymentRef, setPaymentRef] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Pricing state
  const [pricing, setPricing] = useState<PricingConfig>(getPricingConfig());
  const [editingPricing, setEditingPricing] = useState(false);
  const [tempPricing, setTempPricing] = useState<PricingConfig>(pricing);
  
  // Payment transactions
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  
  const { toast } = useToast();

  // Load transactions on mount
  useEffect(() => {
    setTransactions(getPaymentTransactions());
    const interval = setInterval(() => {
      setTransactions(getPaymentTransactions());
    }, 5000); // Poll every 5 seconds for new transactions
    return () => clearInterval(interval);
  }, []);

  // Load Google API scripts
  useEffect(() => {
    const loadGoogleScripts = () => {
      // Load GIS (Google Identity Services)
      if (!document.getElementById("google-gis")) {
        const gisScript = document.createElement("script");
        gisScript.id = "google-gis";
        gisScript.src = "https://accounts.google.com/gsi/client";
        gisScript.async = true;
        gisScript.defer = true;
        document.body.appendChild(gisScript);
      }

      // Load GAPI
      if (!document.getElementById("google-gapi")) {
        const gapiScript = document.createElement("script");
        gapiScript.id = "google-gapi";
        gapiScript.src = "https://apis.google.com/js/api.js";
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => {
          window.gapi?.load("client", async () => {
            await window.gapi?.client.init({
              discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
            });
          });
        };
        document.body.appendChild(gapiScript);
      }
    };

    loadGoogleScripts();
    
    // Check for existing session
    const savedSpreadsheetId = localStorage.getItem("sellmore_admin_spreadsheet_id");
    const savedToken = localStorage.getItem("sellmore_admin_google_token");
    if (savedSpreadsheetId && savedToken) {
      setSpreadsheetId(savedSpreadsheetId);
      // Token will be validated on first API call
    }
  }, []);

  // Connect to Google
  const connectGoogle = useCallback(() => {
    if (!window.google) {
      toast({ title: "Google API not loaded", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: async (response) => {
        if (response.error) {
          setIsLoading(false);
          toast({ title: "Google sign-in failed", description: response.error, variant: "destructive" });
          return;
        }

        if (response.access_token) {
          localStorage.setItem("sellmore_admin_google_token", response.access_token);
          window.gapi?.client.setToken({ access_token: response.access_token });
          setIsGoogleConnected(true);
          
          // Find or create spreadsheet
          await findOrCreateSpreadsheet(response.access_token);
          setIsLoading(false);
        }
      },
    });

    tokenClient.requestAccessToken();
  }, [toast]);

  // Find or create the spreadsheet
  const findOrCreateSpreadsheet = async (token: string) => {
    try {
      // Search for existing spreadsheet
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const searchData = await searchResponse.json();

      let sheetId: string;

      if (searchData.files && searchData.files.length > 0) {
        // Use existing spreadsheet
        sheetId = searchData.files[0].id;
        toast({ title: "Connected to existing spreadsheet" });
      } else {
        // Create new spreadsheet
        const createResponse = await fetch(
          "https://sheets.googleapis.com/v4/spreadsheets",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              properties: { title: SPREADSHEET_NAME },
              sheets: [{ properties: { title: SHEET_NAME } }],
            }),
          }
        );
        const createData = await createResponse.json();
        sheetId = createData.spreadsheetId;

        // Add headers
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SHEET_NAME}!A1:H1?valueInputOption=RAW`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [["Code", "Duration (Months)", "Created At", "Used At", "Used By", "Payment Method", "Payment Ref", "Status"]],
            }),
          }
        );

        toast({ title: "Created new spreadsheet", description: SPREADSHEET_NAME });
      }

      setSpreadsheetId(sheetId);
      localStorage.setItem("sellmore_admin_spreadsheet_id", sheetId);

      // Load existing codes
      await loadCodesFromSheet(token, sheetId);
    } catch (error) {
      console.error("Spreadsheet error:", error);
      toast({ title: "Failed to setup spreadsheet", variant: "destructive" });
    }
  };

  // Load codes from Google Sheet
  const loadCodesFromSheet = async (token: string, sheetId: string) => {
    try {
      setIsSyncing(true);
      setSyncError(null);

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${SHEET_NAME}!A2:H1000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch codes");
      }

      const data = await response.json();
      const rows = data.values || [];

      const codes: GeneratedCode[] = rows.map((row: string[]) => ({
        code: row[0] || "",
        durationMonths: parseInt(row[1], 10) || 1,
        createdAt: row[2] || new Date().toISOString(),
        usedAt: row[3] || null,
        usedBy: row[4] || null,
        paymentMethod: (row[5] as "batch" | "qris" | "card") || "batch",
        paymentRef: row[6] || null,
      })).filter((c: GeneratedCode) => c.code);

      setGeneratedCodes(codes);
      setLastSyncTime(new Date());
      setIsGoogleConnected(true);
    } catch (error) {
      console.error("Load error:", error);
      setSyncError("Failed to load codes from Google Sheet");
    } finally {
      setIsSyncing(false);
    }
  };

  // Save codes to Google Sheet
  const saveCodesToSheet = async (codes: GeneratedCode[]) => {
    const token = localStorage.getItem("sellmore_admin_google_token");
    if (!token || !spreadsheetId) return;

    try {
      setIsSyncing(true);
      setSyncError(null);

      // Clear existing data (except header)
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A2:H1000:clear`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (codes.length > 0) {
        // Write all codes
        const values = codes.map((c) => [
          c.code,
          c.durationMonths.toString(),
          c.createdAt,
          c.usedAt || "",
          c.usedBy || "",
          c.paymentMethod,
          c.paymentRef || "",
          c.usedAt ? "Used" : "Available",
        ]);

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A2:H${codes.length + 1}?valueInputOption=RAW`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ values }),
          }
        );
      }

      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Save error:", error);
      setSyncError("Failed to save to Google Sheet");
      toast({ title: "Sync failed", description: "Changes saved locally only", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  // Refresh from sheet
  const refreshFromSheet = async () => {
    const token = localStorage.getItem("sellmore_admin_google_token");
    if (!token || !spreadsheetId) {
      toast({ title: "Not connected to Google", variant: "destructive" });
      return;
    }
    await loadCodesFromSheet(token, spreadsheetId);
    toast({ title: "Refreshed from Google Sheet" });
  };

  // Disconnect Google
  const disconnectGoogle = () => {
    localStorage.removeItem("sellmore_admin_google_token");
    localStorage.removeItem("sellmore_admin_spreadsheet_id");
    setIsGoogleConnected(false);
    setSpreadsheetId(null);
    setGeneratedCodes([]);
    toast({ title: "Disconnected from Google" });
  };

  // Generate batch codes
  const generateBatchCodes = async () => {
    const count = parseInt(batchCount, 10);
    const duration = parseInt(batchDuration, 10);
    
    if (isNaN(count) || count < 1 || count > 100) {
      toast({ title: "Invalid count", description: "Enter 1-100", variant: "destructive" });
      return;
    }
    
    const newCodes: GeneratedCode[] = [];
    for (let i = 0; i < count; i++) {
      const code = generateSubscriptionCode(duration);
      newCodes.push({
        code,
        durationMonths: duration,
        createdAt: new Date().toISOString(),
        usedAt: null,
        usedBy: null,
        paymentMethod: "batch",
        paymentRef: null
      });
    }
    
    const updatedCodes = [...newCodes, ...generatedCodes];
    setGeneratedCodes(updatedCodes);
    await saveCodesToSheet(updatedCodes);
    
    toast({ 
      title: "Codes generated", 
      description: `${count} x ${duration}-month codes created` 
    });
  };

  // Generate single code
  const generateSingleCode = async () => {
    if (!paymentRef.trim()) {
      toast({ title: "Payment reference required", variant: "destructive" });
      return;
    }
    
    const duration = parseInt(singleDuration, 10);
    const code = generateSubscriptionCode(duration);
    
    const newCode: GeneratedCode = {
      code,
      durationMonths: duration,
      createdAt: new Date().toISOString(),
      usedAt: null,
      usedBy: customerName.trim() || null,
      paymentMethod,
      paymentRef: paymentRef.trim()
    };
    
    const updatedCodes = [newCode, ...generatedCodes];
    setGeneratedCodes(updatedCodes);
    await saveCodesToSheet(updatedCodes);
    
    // Copy to clipboard
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
    
    toast({ 
      title: "Code generated & copied!", 
      description: `${duration}-month code: ${code}` 
    });
    
    // Reset form
    setPaymentRef("");
    setCustomerName("");
  };

  // Mark code as used
  const markAsUsed = async (code: string) => {
    const updatedCodes = generatedCodes.map((c) =>
      c.code === code
        ? { ...c, usedAt: new Date().toISOString(), usedBy: c.usedBy || "Manual" }
        : c
    );
    setGeneratedCodes(updatedCodes);
    await saveCodesToSheet(updatedCodes);
    toast({ title: "Marked as used" });
  };

  // Copy code
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Copied!", description: code });
  };

  // Export codes
  const exportCodes = (filter: "all" | "unused" | "used") => {
    let codes = generatedCodes;
    if (filter === "unused") codes = codes.filter(c => !c.usedAt);
    if (filter === "used") codes = codes.filter(c => c.usedAt);
    
    const csv = [
      ["Code", "Duration", "Created", "Used At", "Used By", "Payment Method", "Payment Ref"].join(","),
      ...codes.map(c => [
        c.code,
        `${c.durationMonths} months`,
        new Date(c.createdAt).toLocaleString(),
        c.usedAt ? new Date(c.usedAt).toLocaleString() : "",
        c.usedBy || "",
        c.paymentMethod,
        c.paymentRef || ""
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscription-codes-${filter}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete code
  const deleteCode = async (code: string) => {
    const updated = generatedCodes.filter(c => c.code !== code);
    setGeneratedCodes(updated);
    await saveCodesToSheet(updated);
    toast({ title: "Code deleted" });
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Stats
  const totalCodes = generatedCodes.length;
  const usedCodes = generatedCodes.filter(c => c.usedAt).length;
  const unusedCodes = totalCodes - usedCodes;

  // Not authenticated - simple password check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <Card className="w-full max-w-sm bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center">Subscription Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Password</Label>
              <Input
                type="password"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value === "sellmore2026") {
                    setIsAuthenticated(true);
                  }
                }}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter admin password"
              />
            </div>
            <Button 
              onClick={(e) => {
                const input = (e.target as HTMLElement).parentElement?.querySelector("input") as HTMLInputElement;
                if (input?.value === "sellmore2026") {
                  setIsAuthenticated(true);
                } else {
                  toast({ title: "Invalid password", variant: "destructive" });
                }
              }} 
              className="w-full"
            >
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-white">Subscription Admin</h1>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-green-400 border-green-400">
              {unusedCodes} unused
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {usedCodes} used
            </Badge>
            <Badge variant="outline" className="text-gray-400 border-gray-400">
              {totalCodes} total
            </Badge>
          </div>
        </div>

        {/* Google Connection Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Google Sheets Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isGoogleConnected ? (
              <div className="space-y-3">
                <p className="text-gray-400 text-sm">
                  Connect to Google Sheets to store and sync your subscription codes securely.
                </p>
                <Button 
                  onClick={connectGoogle} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4 mr-2" />
                  )}
                  Connect Google Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-green-400 text-sm">Connected to Google Sheets</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshFromSheet}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={disconnectGoogle}
                      className="text-red-400 hover:text-red-300"
                    >
                      <LogOut className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {lastSyncTime && (
                  <p className="text-xs text-gray-500">
                    Last synced: {lastSyncTime.toLocaleTimeString()}
                  </p>
                )}
                {syncError && (
                  <Alert className="bg-red-900/20 border-red-700">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-400 text-sm">
                      {syncError}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Reference */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center justify-between">
              <span>Pricing Configuration</span>
              {!editingPricing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTempPricing(pricing);
                    setEditingPricing(true);
                  }}
                  className="h-7 text-xs"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPricing(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      savePricingConfig(tempPricing);
                      setPricing(tempPricing);
                      setEditingPricing(false);
                      toast({ title: "Pricing updated" });
                    }}
                    className="h-7 text-xs"
                  >
                    Save
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!editingPricing ? (
              <div className="flex flex-wrap gap-4">
                {Object.entries(pricing).map(([months, price]) => (
                  <div key={months} className="text-center">
                    <div className="text-lg font-bold text-white">{months} mo</div>
                    <div className="text-sm text-green-400">{formatPriceIDR(price as number)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([1, 3, 6, 12] as const).map((months) => (
                  <div key={months} className="space-y-1">
                    <Label className="text-gray-400 text-xs">{months} Month{months > 1 ? "s" : ""}</Label>
                    <Input
                      type="number"
                      value={tempPricing[months]}
                      onChange={(e) => setTempPricing({ ...tempPricing, [months]: parseInt(e.target.value) || 0 })}
                      className="bg-gray-700 border-gray-600 text-white h-8"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Transactions */}
        {transactions.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Recent Payment Transactions
                <Badge variant="outline" className="ml-auto text-green-400 border-green-400">
                  {transactions.filter(t => t.status === "completed").length} completed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {transactions.slice(0, 10).map((txn) => (
                    <div 
                      key={txn.id} 
                      className="flex items-center justify-between text-sm p-2 rounded bg-gray-700/50"
                    >
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={txn.status === "completed" ? "bg-green-600" : "bg-yellow-600"}
                        >
                          {txn.status}
                        </Badge>
                        <span className="font-mono text-white">{txn.code}</span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(txn.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="batch" className="space-y-4">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="batch" className="data-[state=active]:bg-gray-700">
              <Package className="w-4 h-4 mr-2" />
              Batch Generate
            </TabsTrigger>
            <TabsTrigger value="single" className="data-[state=active]:bg-gray-700">
              <Plus className="w-4 h-4 mr-2" />
              Single Code
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-gray-700">
              <Clock className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Batch Generate Tab */}
          <TabsContent value="batch">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Batch Generate Codes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Duration</Label>
                    <Select value={batchDuration} onValueChange={setBatchDuration}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Month - {formatPriceIDR(50000)}</SelectItem>
                        <SelectItem value="3">3 Months - {formatPriceIDR(135000)}</SelectItem>
                        <SelectItem value="6">6 Months - {formatPriceIDR(255000)}</SelectItem>
                        <SelectItem value="12">12 Months - {formatPriceIDR(480000)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Count</Label>
                    <Select value={batchCount} onValueChange={setBatchCount}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 codes</SelectItem>
                        <SelectItem value="25">25 codes</SelectItem>
                        <SelectItem value="50">50 codes</SelectItem>
                        <SelectItem value="100">100 codes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={generateBatchCodes} 
                  className="w-full"
                  disabled={!isGoogleConnected || isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4 mr-2" />
                  )}
                  Generate {batchCount} Codes
                </Button>
                {!isGoogleConnected && (
                  <p className="text-xs text-yellow-500 text-center">
                    Connect Google Sheets first to generate codes
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Single Code Tab */}
          <TabsContent value="single">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Generate Single Code (Real-time Payment)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Duration</Label>
                    <Select value={singleDuration} onValueChange={setSingleDuration}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Month - {formatPriceIDR(50000)}</SelectItem>
                        <SelectItem value="3">3 Months - {formatPriceIDR(135000)}</SelectItem>
                        <SelectItem value="6">6 Months - {formatPriceIDR(255000)}</SelectItem>
                        <SelectItem value="12">12 Months - {formatPriceIDR(480000)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "qris" | "card")}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qris">
                          <div className="flex items-center">
                            <QrCode className="w-4 h-4 mr-2" />
                            QRIS
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Card
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Payment Reference / Transaction ID *</Label>
                  <Input
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., QRIS-123456 or TXN-789"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Customer Name (optional)</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <Button 
                  onClick={generateSingleCode} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!paymentRef.trim() || !isGoogleConnected || isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Generate & Copy Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-white">Code History</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportCodes("all")}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => exportCodes("unused")}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Unused
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-400">Code</TableHead>
                        <TableHead className="text-gray-400">Duration</TableHead>
                        <TableHead className="text-gray-400">Created</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Payment</TableHead>
                        <TableHead className="text-gray-400 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {generatedCodes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            {isGoogleConnected ? "No codes generated yet" : "Connect Google Sheets to view codes"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        generatedCodes.map((code) => (
                          <TableRow key={code.code} className="border-gray-700">
                            <TableCell className="font-mono text-white text-sm">
                              {code.code}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {code.durationMonths}mo
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {formatDate(code.createdAt)}
                            </TableCell>
                            <TableCell>
                              {code.usedAt ? (
                                <div>
                                  <Badge className="bg-blue-600 text-xs">Used</Badge>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {formatDate(code.usedAt)}
                                    {code.usedBy && (
                                      <div className="text-gray-400">by {code.usedBy}</div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                                  Available
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              <div className="flex items-center gap-1">
                                {code.paymentMethod === "qris" && <QrCode className="w-3 h-3" />}
                                {code.paymentMethod === "card" && <CreditCard className="w-3 h-3" />}
                                {code.paymentMethod === "batch" && <Package className="w-3 h-3" />}
                                <span className="capitalize">{code.paymentMethod}</span>
                              </div>
                              {code.paymentRef && (
                                <div className="text-gray-500 truncate max-w-[100px]" title={code.paymentRef}>
                                  {code.paymentRef}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyCode(code.code)}
                                  className="h-7 w-7 p-0"
                                >
                                  {copiedCode === code.code ? (
                                    <Check className="w-3 h-3 text-green-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                                {!code.usedAt && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => markAsUsed(code.code)}
                                      className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300"
                                      title="Mark as used"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteCode(code.code)}
                                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Copy - Recent Unused */}
        {isGoogleConnected && generatedCodes.filter(c => !c.usedAt).slice(0, 5).length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Quick Copy - Recent Unused Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {generatedCodes.filter(c => !c.usedAt).slice(0, 5).map((code) => (
                  <Button
                    key={code.code}
                    variant="outline"
                    size="sm"
                    onClick={() => copyCode(code.code)}
                    className="font-mono text-xs"
                  >
                    {copiedCode === code.code ? (
                      <Check className="w-3 h-3 mr-1 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 mr-1" />
                    )}
                    {code.code} ({code.durationMonths}mo)
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}