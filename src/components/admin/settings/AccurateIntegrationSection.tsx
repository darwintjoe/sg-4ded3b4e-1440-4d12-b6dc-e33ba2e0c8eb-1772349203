import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Link2,
  Link2Off,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings,
  Cloud,
  CloudOff,
  Loader2,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { translate } from "@/lib/translations";
import { accurateService } from "@/lib/accurate-service";
import type { Language, AccurateConnectionStatus } from "@/types";

interface AccurateIntegrationSectionProps {
  language: Language;
}

interface DatabaseOption {
  id: string;
  name: string;
  hostUrl: string;
}

export function AccurateIntegrationSection({ language }: AccurateIntegrationSectionProps) {
  // Credentials state
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<AccurateConnectionStatus>({ connected: false });
  const [databases, setDatabases] = useState<DatabaseOption[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [syncQueueStatus, setSyncQueueStatus] = useState({ pending: 0, failed: 0, total: 0 });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    const credentials = accurateService.getCredentials();
    if (credentials) {
      setClientId(credentials.clientId || "");
      setClientSecret(credentials.clientSecret || "");
      setSelectedDatabase(credentials.databaseId || "");
    }
    
    // Check connection status
    checkConnectionStatus();
    
    // Load sync queue status
    setSyncQueueStatus(accurateService.getSyncQueueStatus());
  }, []);

  const checkConnectionStatus = async () => {
    const status = await accurateService.getConnectionStatus();
    setConnectionStatus(status);
    
    if (status.connected) {
      // Fetch database list if connected
      const dbResult = await accurateService.fetchDatabaseList();
      if (dbResult.success && dbResult.databases) {
        setDatabases(dbResult.databases);
      }
    }
  };

  const handleSaveCredentials = () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setMessage({ type: "error", text: "Client ID and Client Secret are required" });
      return;
    }

    accurateService.setCredentials({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    });

    setMessage({ type: "success", text: "Credentials saved" });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStartAuth = () => {
    try {
      // Save credentials first
      accurateService.setCredentials({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      });

      // Generate auth URL
      // Note: In production, use your actual redirect URI
      const redirectUri = `${window.location.origin}/accurate-callback`;
      const url = accurateService.getAuthorizationUrl(redirectUri);
      
      setAuthUrl(url);
      setShowAuthDialog(true);
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to start authentication" 
      });
    }
  };

  const handleExchangeCode = async () => {
    if (!authCode.trim()) {
      setMessage({ type: "error", text: "Please enter the authorization code" });
      return;
    }

    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/accurate-callback`;
      const result = await accurateService.exchangeCodeForToken(authCode.trim(), redirectUri);

      if (result.success) {
        setShowAuthDialog(false);
        setAuthCode("");
        setMessage({ type: "success", text: "Successfully connected to Accurate!" });
        
        // Refresh connection status and database list
        await checkConnectionStatus();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to authenticate" });
      }
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Authentication failed" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (!window.confirm("Disconnect from Accurate? This will clear all sync settings.")) {
      return;
    }

    accurateService.clearCredentials();
    setConnectionStatus({ connected: false });
    setDatabases([]);
    setSelectedDatabase("");
    setMessage({ type: "success", text: "Disconnected from Accurate" });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSelectDatabase = (dbId: string) => {
    const db = databases.find((d) => d.id === dbId);
    if (db) {
      accurateService.setActiveDatabase(db.id, db.hostUrl);
      setSelectedDatabase(dbId);
      setMessage({ type: "success", text: `Selected database: ${db.name}` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await accurateService.testConnection();
      setMessage({ 
        type: result.success ? "success" : "error", 
        text: result.message 
      });
      
      if (result.success) {
        await checkConnectionStatus();
      }
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Connection test failed" 
      });
    } finally {
      setIsTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleProcessQueue = async () => {
    setIsLoading(true);
    try {
      const result = await accurateService.processSyncQueue();
      setSyncQueueStatus(accurateService.getSyncQueueStatus());
      setMessage({ 
        type: "success", 
        text: `Processed ${result.processed} items, ${result.failed} failed` 
      });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to process sync queue" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const isConfigured = accurateService.isConfigured();
  const isConnected = connectionStatus.connected;

  return (
    <Card className="p-4 border-blue-200 dark:border-blue-900">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Cloud className="h-5 w-5" />
            <h3 className="font-semibold">Accurate.id Integration</h3>
            <Badge variant="outline" className="text-xs">Beta</Badge>
          </div>
          {isConnected ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary">
              <CloudOff className="h-3 w-3 mr-1" />
              Not Connected
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Sync your POS sales data with Accurate.id accounting software for seamless bookkeeping.
        </p>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Register as a developer at{" "}
            <a 
              href="https://accurate.id/developer" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              accurate.id/developer
              <ExternalLink className="h-3 w-3" />
            </a>
            {" "}to get your Client ID and Secret.
          </AlertDescription>
        </Alert>

        {/* Message Display */}
        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Credentials Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">API Credentials</h4>
          
          <div className="space-y-2">
            <Label htmlFor="clientId" className="text-xs">Client ID</Label>
            <Input
              id="clientId"
              type="text"
              placeholder="Enter your Accurate Client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isConnected}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret" className="text-xs">Client Secret</Label>
            <div className="relative">
              <Input
                id="clientSecret"
                type={showSecret ? "text" : "password"}
                placeholder="Enter your Accurate Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={isConnected}
                className="font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!isConnected && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveCredentials}
                disabled={!clientId || !clientSecret}
              >
                Save Credentials
              </Button>
              <Button
                size="sm"
                onClick={handleStartAuth}
                disabled={!clientId || !clientSecret}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Connect to Accurate
              </Button>
            </div>
          )}
        </div>

        {/* Connected State UI */}
        {isConnected && (
          <>
            <Separator />
            
            {/* Company Info */}
            {connectionStatus.companyName && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">{connectionStatus.companyName}</span>
                </div>
                {connectionStatus.databaseName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Database:</span>
                    <span className="font-medium">{connectionStatus.databaseName}</span>
                  </div>
                )}
                {connectionStatus.lastSyncTime && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span className="font-medium">
                      {new Date(connectionStatus.lastSyncTime).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Database Selection */}
            {databases.length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs">Select Database</Label>
                <Select value={selectedDatabase} onValueChange={handleSelectDatabase}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a database" />
                  </SelectTrigger>
                  <SelectContent>
                    {databases.map((db) => (
                      <SelectItem key={db.id} value={db.id}>
                        {db.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sync Queue Status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Sync Queue</h4>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Pending:</span>
                  <Badge variant="secondary">{syncQueueStatus.pending}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Failed:</span>
                  <Badge variant={syncQueueStatus.failed > 0 ? "destructive" : "secondary"}>
                    {syncQueueStatus.failed}
                  </Badge>
                </div>
              </div>
              
              {syncQueueStatus.pending > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProcessQueue}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Process Queue
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
              >
                <Link2Off className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </>
        )}
      </div>

      {/* OAuth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect to Accurate</DialogTitle>
            <DialogDescription>
              Complete the OAuth authorization to connect your Accurate account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Click the button below to open Accurate authorization page
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(authUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Accurate Authorization
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                2. After authorizing, copy the authorization code and paste it below
              </p>
              <Input
                placeholder="Paste authorization code here"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAuthDialog(false);
                  setAuthCode("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExchangeCode}
                disabled={!authCode || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Complete Connection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}