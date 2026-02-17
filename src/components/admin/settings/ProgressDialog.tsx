import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ProgressDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  progress?: number;
  total?: number;
}

export function ProgressDialog({ 
  isOpen, 
  title, 
  message, 
  progress, 
  total 
}: ProgressDialogProps) {
  if (!isOpen) return null;

  const percentage = total ? Math.round((progress || 0) / total * 100) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 shadow-2xl border-2 border-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          
          <p className="text-sm text-muted-foreground">{message}</p>
          
          {percentage !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress?.toLocaleString()} / {total?.toLocaleString()}</span>
                <span>{percentage}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out" 
                  style={{ width: `${percentage}%` }} 
                />
              </div>
            </div>
          )}
          
          {percentage === undefined && (
            <div className="flex justify-center py-4">
              <div className="flex space-x-2">
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-3 w-3 bg-primary rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}