import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, Bluetooth, AlertCircle, CheckCircle2 } from "lucide-react";
import { Settings } from "@/types";
import { bluetoothPrinter } from "@/lib/bluetooth-printer";

interface PrinterSettingsSectionProps {
  settings: Settings;
  onUpdate: (updates: Partial<Settings>) => void;
}

export function PrinterSettingsSection({ settings, onUpdate }: PrinterSettingsSectionProps) {
  const [printerConnecting, setPrinterConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [testPrinting, setTestPrinting] = useState(false);

  const isBluetoothSupported = bluetoothPrinter.isSupported();

  useEffect(() => {
    if (bluetoothPrinter.isSupported() && bluetoothPrinter.isConnected()) {
      setPrinterConnected(true);
      setPrinterName(bluetoothPrinter.getPrinterName());
    }
  }, []);

  const handleConnectPrinter = async () => {
    setPrinterConnecting(true);
    setPrinterError(null);

    try {
      const result = await bluetoothPrinter.connect();

      if (result.success && result.printerName && result.printerId) {
        setPrinterConnected(true);
        setPrinterName(result.printerName);
        
        onUpdate({
          bluetoothPrinterId: result.printerId,
          bluetoothPrinterName: result.printerName
        });
      } else {
        setPrinterError(result.error || "Failed to connect");
      }
    } catch (error) {
      setPrinterError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setPrinterConnecting(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    await bluetoothPrinter.disconnect();
    setPrinterConnected(false);
    setPrinterName(null);
    
    onUpdate({
      bluetoothPrinterId: undefined,
      bluetoothPrinterName: undefined
    });
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    setPrinterError(null);

    try {
      const result = await bluetoothPrinter.printTest(settings);
      
      if (!result.success) {
        setPrinterError(result.error || "Test print failed");
      }
    } catch (error) {
      setPrinterError(error instanceof Error ? error.message : "Test print failed");
    } finally {
      setTestPrinting(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Printer className="h-4 w-4" />
        Receipt Printer
      </h3>

      {/* Paper Width */}
      <div className="mb-4">
        <Label className="text-sm mb-2 block">Paper Width</Label>
        <RadioGroup
          value={settings.printerWidth.toString()}
          onValueChange={(value) => {
            const width = parseInt(value) as 58 | 80;
            onUpdate({ printerWidth: width });
          }}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="58" id="w58" />
            <Label htmlFor="w58" className="text-sm font-normal cursor-pointer">58mm</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="80" id="w80" />
            <Label htmlFor="w80" className="text-sm font-normal cursor-pointer">80mm</Label>
          </div>
        </RadioGroup>
      </div>

      <Separator className="my-3" />

      {/* Bluetooth Printer */}
      {!isBluetoothSupported ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Bluetooth printing requires Android Chrome
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bluetooth className="h-4 w-4" />
            <span className="text-sm font-medium">Bluetooth Printer</span>
            {printerConnected && (
              <Badge variant="default" className="ml-auto text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${printerConnected ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="text-sm">
                {printerConnected ? printerName : "Not Connected"}
              </span>
            </div>
            {printerConnected ? (
              <Button variant="outline" size="sm" onClick={handleDisconnectPrinter}>
                Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnectPrinter} disabled={printerConnecting}>
                <Bluetooth className="h-3 w-3 mr-1" />
                {printerConnecting ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>

          {printerConnected && (
            <Button
              onClick={handleTestPrint}
              disabled={testPrinting}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              <Printer className="h-3 w-3 mr-2" />
              {testPrinting ? "Printing..." : "Test Print"}
            </Button>
          )}

          {printerError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{printerError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </Card>
  );
}