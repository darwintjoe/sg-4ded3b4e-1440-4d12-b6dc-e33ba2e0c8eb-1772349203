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
  const [selectedSound, setSelectedSound] = useState<string>("classic-ding");
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  // Sound generation functions
  const playSound = async (soundId: string, generator: () => void) => {
    setIsPlaying(soundId);
    try {
      await generator();
    } finally {
      setTimeout(() => setIsPlaying(null), 800);
    }
  };

  const soundOptions: SoundOption[] = [
    {
      id: "classic-ding",
      name: "Classic Ding",
      description: "Traditional two-tone cash register sound",
      color: "bg-blue-500",
      play: () => playSound("classic-ding", () => {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(1318, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1760, audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.35);
      })
    },
    {
      id: "bright-chime",
      name: "Bright Chime",
      description: "Uplifting three-tone ascending melody",
      color: "bg-yellow-500",
      play: () => playSound("bright-chime", () => {
        const audioContext = new AudioContext();
        
        const playTone = (frequency: number, startTime: number, duration: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, startTime);
          oscillator.type = "sine";
          
          gainNode.gain.setValueAtTime(0.25, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        
        const now = audioContext.currentTime;
        playTone(1046.5, now, 0.15); // C6
        playTone(1318.5, now + 0.1, 0.15); // E6
        playTone(1568, now + 0.2, 0.25); // G6
      })
    },
    {
      id: "success-bell",
      name: "Success Bell",
      description: "Rich, resonant bell sound with harmonics",
      color: "bg-green-500",
      play: () => playSound("success-bell", () => {
        const audioContext = new AudioContext();
        const now = audioContext.currentTime;
        
        // Create multiple harmonics for bell-like sound
        const frequencies = [800, 1200, 1600, 2000];
        const gains = [0.3, 0.2, 0.15, 0.1];
        
        frequencies.forEach((freq, i) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, now);
          oscillator.type = "sine";
          
          gainNode.gain.setValueAtTime(gains[i], now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          
          oscillator.start(now);
          oscillator.stop(now + 0.8);
        });
      })
    },
    {
      id: "coin-drop",
      name: "Coin Drop",
      description: "Metallic coins hitting surface",
      color: "bg-amber-600",
      play: () => playSound("coin-drop", () => {
        const audioContext = new AudioContext();
        const now = audioContext.currentTime;
        
        // Simulate multiple coin drops with descending pitch
        const coinTimes = [0, 0.08, 0.14, 0.18, 0.21];
        const pitches = [1200, 1100, 1000, 950, 900];
        
        coinTimes.forEach((time, i) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(pitches[i], now + time);
          oscillator.type = "square";
          
          gainNode.gain.setValueAtTime(0.15, now + time);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + time + 0.08);
          
          oscillator.start(now + time);
          oscillator.stop(now + time + 0.08);
        });
      })
    },
    {
      id: "ka-ching",
      name: "Cash Register Ka-Ching",
      description: "Classic retail sound with mechanical feel",
      color: "bg-emerald-600",
      play: () => playSound("ka-ching", () => {
        const audioContext = new AudioContext();
        const now = audioContext.currentTime;
        
        // "Ka" sound - mechanical click
        const noise = audioContext.createBufferSource();
        const noiseBuffer = audioContext.createBuffer(1, 4410, 44100); // 0.1 seconds
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 4410; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;
        
        const noiseGain = audioContext.createGain();
        noise.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        noiseGain.gain.setValueAtTime(0.1, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        noise.start(now);
        
        // "Ching" sound - bell tone
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(1760, now + 0.05);
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        oscillator.start(now + 0.05);
        oscillator.stop(now + 0.4);
      })
    },
    {
      id: "digital-beep",
      name: "Digital Beep",
      description: "Modern, clean confirmation beep",
      color: "bg-cyan-500",
      play: () => playSound("digital-beep", () => {
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.type = "square";
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      })
    },
    {
      id: "sparkle",
      name: "Sparkle",
      description: "Magical ascending arpeggio",
      color: "bg-purple-500",
      play: () => playSound("sparkle", () => {
        const audioContext = new AudioContext();
        const now = audioContext.currentTime;
        
        // Ascending arpeggio with sparkle effect
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
        const timings = [0, 0.06, 0.12, 0.18, 0.24];
        
        notes.forEach((freq, i) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, now + timings[i]);
          oscillator.type = "sine";
          
          gainNode.gain.setValueAtTime(0.15, now + timings[i]);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + timings[i] + 0.3);
          
          oscillator.start(now + timings[i]);
          oscillator.stop(now + timings[i] + 0.3);
        });
      })
    },
    {
      id: "triumphant",
      name: "Triumphant",
      description: "Bold, celebratory fanfare",
      color: "bg-red-500",
      play: () => playSound("triumphant", () => {
        const audioContext = new AudioContext();
        const now = audioContext.currentTime;
        
        // Triumphant chord progression
        const chord1 = [523.25, 659.25, 783.99]; // C major
        const chord2 = [587.33, 739.99, 880]; // D major
        const chord3 = [659.25, 830.61, 987.77]; // E major
        
        const playChord = (frequencies: number[], startTime: number, duration: number) => {
          frequencies.forEach(freq => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, startTime);
            oscillator.type = "square";
            
            gainNode.gain.setValueAtTime(0.1, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
          });
        };
        
        playChord(chord1, now, 0.15);
        playChord(chord2, now + 0.12, 0.15);
        playChord(chord3, now + 0.24, 0.35);
      })
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
            🔊 Sound Test Lab
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose your perfect success confirmation sound
          </p>
          <Badge variant="outline" className="text-sm">
            Current: {soundOptions.find(s => s.id === selectedSound)?.name}
          </Badge>
        </div>

        {/* Sound Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {soundOptions.map((sound) => (
            <Card 
              key={sound.id}
              className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group",
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
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
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
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Click "Play Sound" to preview each confirmation sound</p>
            <p>• Click anywhere on a card to select it as your active sound</p>
            <p>• Your selection is automatically saved and will play when completing sales</p>
            <p>• Test the sound volume on your device before selecting</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}