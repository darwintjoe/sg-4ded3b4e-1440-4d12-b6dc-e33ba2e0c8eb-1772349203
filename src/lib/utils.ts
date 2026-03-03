import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Round up to nearest 50 cents (0.50)
export function roundTo50(amount: number): number {
  const cents = amount * 100;
  const remainder = cents % 50;
  if (remainder === 0) return amount;
  return (cents + (50 - remainder)) / 100;
}

// Format currency without symbol, with 2 decimal places
export function formatCurrency(amount: number, roundUp = true): string {
  const value = roundUp ? roundTo50(amount) : amount;
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const playSuccessSound = () => {
  try {
    const selectedSound = typeof window !== "undefined" 
      ? localStorage.getItem("pos-success-sound") || "ka-ching"
      : "ka-ching";
    
    // Play embedded audio file
    if (selectedSound === "ka-ching") {
      const audio = new Audio("/ka-ching.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fail silently if audio blocked
      });
    }
  } catch (error) {
    // Fail silently - sound is optional UX enhancement
  }
};

export const playBeepSound = (type: "clockIn" | "clockOut" = "clockIn") => {
  try {
    if (typeof window === "undefined") return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different tones for clock in vs clock out
    if (type === "clockIn") {
      // Rising tone for clock in (positive, welcoming)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(900, audioContext.currentTime + 0.15);
    } else {
      // Falling tone for clock out (closing, goodbye)
      oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.15);
    }
    
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // Clean up
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    // Fail silently - sound is optional UX enhancement
  }
};

export const playTiitSound = () => {
  try {
    if (typeof window === "undefined") return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Short high-pitched "tiit" sound
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(1400, audioContext.currentTime + 0.05);
    oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.12);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.12);
    
    // Clean up
    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    // Fail silently - sound is optional UX enhancement
  }
};