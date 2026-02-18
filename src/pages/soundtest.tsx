import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Volume2, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SoundOption {
  id: string;
  name: string;
  description: string;
  color: string;
  play: () => void;
}

export default function SoundTestPage() {
  const [selectedSound, setSelectedSound] = useState<string>("ka-ching");
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const playSound = async (soundId: string, audioSrc: string) => {
    setIsPlaying(soundId);
    try {
      const audio = new Audio(audioSrc);
      audio.volume = 0.5;
      await audio.play();
      audio.onended = () => setIsPlaying(null);
    } catch (error) {
      setTimeout(() => setIsPlaying(null), 800);
    }
  };

  const soundOptions: SoundOption[] = [
    {
      id: "ka-ching",
      name: "Ka-Ching",
      description: "Classic cash register sound",
      color: "bg-emerald-600",
      play: () => playSound("ka-ching", "/ka-ching.mp3")
    }
  ];

  const handleSelect = (soundId: string) => {
    setSelectedSound(soundId);
    localStorage.setItem("pos-success-sound", soundId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🔊 Sound Test
          </h1>
          <p className="text-lg text-muted-foreground">
            Test your success confirmation sound
          </p>
          <Badge variant="outline" className="text-sm">
            Current: {soundOptions.find(s => s.id === selectedSound)?.name}
          </Badge>
        </div>

        {/* Sound Card */}
        <div className="max-w-md mx-auto">
          {soundOptions.map((sound) => (
            <Card 
              key={sound.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer",
                selectedSound === sound.id && "ring-2 ring-primary shadow-lg"
              )}
              onClick={() => handleSelect(sound.id)}
            >
              {/* Color accent bar */}
              <div className={cn("h-2", sound.color)} />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{sound.name}</CardTitle>
                  {selectedSound === sound.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <CardDescription className="text-sm">
                  {sound.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Button
                  variant={isPlaying === sound.id ? "secondary" : "outline"}
                  className="w-full hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.play();
                  }}
                  disabled={isPlaying === sound.id}
                >
                  <Volume2 className={cn(
                    "h-4 w-4 mr-2",
                    isPlaying === sound.id && "animate-pulse"
                  )} />
                  {isPlaying === sound.id ? "Playing..." : "Play Sound"}
                </Button>
              </CardContent>

              {/* Selected indicator */}
              {selectedSound === sound.id && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 transform rotate-45 translate-x-8 -translate-y-8" />
              )}
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Card className="max-w-2xl mx-auto bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Click "Play Sound" to preview the confirmation sound</p>
            <p>• This sound will play when completing sales in the POS</p>
            <p>• Adjust your device volume to a comfortable level</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}