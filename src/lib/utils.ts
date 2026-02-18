import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Sound generation functions
const soundGenerators: Record<string, () => void> = {
  "classic-ding": () => {
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
  },
  
  "bright-chime": () => {
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
  },
  
  "success-bell": () => {
    const audioContext = new AudioContext();
    const now = audioContext.currentTime;
    
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
  },
  
  "coin-drop": () => {
    const audioContext = new AudioContext();
    const now = audioContext.currentTime;
    
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
  },
  
  "digital-beep": () => {
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
  },
  
  "sparkle": () => {
    const audioContext = new AudioContext();
    const now = audioContext.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
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
  },
  
  "triumphant": () => {
    const audioContext = new AudioContext();
    const now = audioContext.currentTime;
    
    const chord1 = [523.25, 659.25, 783.99];
    const chord2 = [587.33, 739.99, 880];
    const chord3 = [659.25, 830.61, 987.77];
    
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
  }
};

export const playSuccessSound = () => {
  try {
    // Get selected sound from localStorage, default to classic-ding
    const selectedSound = typeof window !== "undefined" 
      ? localStorage.getItem("pos-success-sound") || "classic-ding"
      : "classic-ding";
    
    const generator = soundGenerators[selectedSound] || soundGenerators["classic-ding"];
    generator();
  } catch (error) {
    // Fail silently - sound is optional UX enhancement
  }
};