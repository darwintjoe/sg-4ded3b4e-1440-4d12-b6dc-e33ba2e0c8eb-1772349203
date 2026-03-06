import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  generateSubscriptionCode, 
  formatPriceIDR,
  DEVELOPER_QRIS 
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
  RefreshCw
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

const STORAGE_KEY = "sellmore_generated_codes";
const ADMIN_PASSWORD = "sellmore2026"; // Simple password protection

export default function SubscriptionAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);
  const [batchDuration, setBatchDuration] = useState<string>("1");
  const [batchCount, setBatchCount] = useState<string>("10");
  const [singleDuration, setSingleDuration] = useState<string>("1");
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "card">("qris");
  const [paymentRef, setPaymentRef] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Load codes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setGeneratedCodes(JSON.parse(stored));
      } catch {
        setGeneratedCodes([]);
      }
    }
  }, []);

  // Save codes to localStorage
  const saveCodes = (codes: GeneratedCode[]) => {
    setGeneratedCodes(codes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  };

  // Check used codes from subscription service
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkUsedCodes = () => {
      const usedCodesStr = localStorage.getItem("sellmore_used_codes");
      const subscriptionStr = localStorage.getItem("sellmore_subscription");
      
      if (!usedCodesStr && !subscriptionStr) return;
      
      const usedCodes: string[] = usedCodesStr ? JSON.parse(usedCodesStr) : [];
      
      setGeneratedCodes(prev => {
        let updated = false;
        const newCodes = prev.map(code => {
          if (!code.usedAt && usedCodes.includes(code.code)) {
            updated = true;
            return {
              ...code,
              usedAt: new Date().toISOString(),
              usedBy: code.usedBy || "Unknown"
            };
          }
          return code;
        });
        
        if (updated) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newCodes));
        }
        return newCodes;
      });
    };
    
    checkUsedCodes();
    const interval = setInterval(checkUsedCodes, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast({ title: "Authenticated", description: "Welcome to Subscription Admin" });
    } else {
      toast({ title: "Invalid password", variant: "destructive" });
    }
  };

  const generateBatchCodes = () => {
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
    
    saveCodes([...newCodes, ...generatedCodes]);
    toast({ 
      title: "Codes generated", 
      description: `${count} x ${duration}-month codes created` 
    });
  };

  const generateSingleCode = () => {
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
    
    saveCodes([newCode, ...generatedCodes]);
    
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Copied!", description: code });
  };

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

  const deleteCode = (code: string) => {
    const updated = generatedCodes.filter(c => c.code !== code);
    saveCodes(updated);
    toast({ title: "Code deleted" });
  };

  const clearAllCodes = () => {
    if (confirm("Delete ALL codes? This cannot be undone.")) {
      saveCodes([]);
      toast({ title: "All codes cleared" });
    }
  };

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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter admin password"
              />
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
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Subscription Admin</h1>
          <div className="flex gap-2">
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

        {/* Pricing Reference */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Pricing Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(DEVELOPER_QRIS.pricing).map(([months, price]) => (
                <div key={months} className="text-center">
                  <div className="text-lg font-bold text-white">{months} mo</div>
                  <div className="text-sm text-green-400">{formatPriceIDR(price)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
                <Button onClick={generateBatchCodes} className="w-full">
                  <Package className="w-4 h-4 mr-2" />
                  Generate {batchCount} Codes
                </Button>
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
                  disabled={!paymentRef.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate & Copy Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Code History</CardTitle>
                  <div className="flex gap-2">
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
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={clearAllCodes}
                      className="text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear
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
                            No codes generated yet
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteCode(code.code)}
                                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
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

        {/* Recently Generated (Quick Access) */}
        {generatedCodes.filter(c => !c.usedAt).slice(0, 5).length > 0 && (
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