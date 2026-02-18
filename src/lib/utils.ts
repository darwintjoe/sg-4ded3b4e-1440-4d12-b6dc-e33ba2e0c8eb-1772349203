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
    playTone(1046.5, now, 0.15);
    playTone(1318.5, now + 0.1, 0.15);
    playTone(1568, now + 0.2, 0.25);
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
  },
  
  "ka-ching": () => {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    // "KA" - metallic click
    const kaClick = ctx.createOscillator();
    const kaGain = ctx.createGain();
    kaClick.type = "square";
    kaClick.frequency.setValueAtTime(3000, now);
    kaClick.frequency.exponentialRampToValueAtTime(1500, now + 0.01);
    kaGain.gain.setValueAtTime(0.3, now);
    kaGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    kaClick.connect(kaGain).connect(masterGain);
    kaClick.start(now);
    kaClick.stop(now + 0.02);

    // "CHUNK" - drawer thud
    const chunkNoise = ctx.createBufferSource();
    const chunkBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const chunkData = chunkBuffer.getChannelData(0);
    for (let i = 0; i < chunkData.length; i++) {
      chunkData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (chunkData.length * 0.3));
    }
    chunkNoise.buffer = chunkBuffer;
    
    const chunkFilter = ctx.createBiquadFilter();
    chunkFilter.type = "lowpass";
    chunkFilter.frequency.setValueAtTime(200, now);
    
    const chunkGain = ctx.createGain();
    chunkGain.gain.setValueAtTime(0.4, now + 0.015);
    chunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    chunkNoise.connect(chunkFilter).connect(chunkGain).connect(masterGain);
    chunkNoise.start(now + 0.015);

    // "CHING" - polyphonic bell
    const bellStart = now + 0.05;
    const bellFrequencies = [
      { freq: 1760, gain: 0.25 },
      { freq: 2217, gain: 0.18 },
      { freq: 2637, gain: 0.15 },
      { freq: 3520, gain: 0.12 },
      { freq: 4435, gain: 0.08 },
      { freq: 5274, gain: 0.05 }
    ];

    bellFrequencies.forEach(({ freq, gain: volume }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, bellStart);
      
      oscGain.gain.setValueAtTime(0, bellStart);
      oscGain.gain.linearRampToValueAtTime(volume, bellStart + 0.01);
      oscGain.gain.exponentialRampToValueAtTime(0.001, bellStart + 0.8);
      
      osc.connect(oscGain).connect(masterGain);
      osc.start(bellStart);
      osc.stop(bellStart + 0.8);
    });

    // Shimmer overlay
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(7040, bellStart);
    shimmerGain.gain.setValueAtTime(0, bellStart);
    shimmerGain.gain.linearRampToValueAtTime(0.03, bellStart + 0.01);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, bellStart + 0.4);
    shimmer.connect(shimmerGain).connect(masterGain);
    shimmer.start(bellStart);
    shimmer.stop(bellStart + 0.4);
  }
};

export const playSuccessSound = () => {
  try {
    const selectedSound = typeof window !== "undefined" 
      ? localStorage.getItem("pos-success-sound") || "classic-ding"
      : "classic-ding";
    
    const generator = soundGenerators[selectedSound] || soundGenerators["classic-ding"];
    generator();
  } catch (error) {
    // Fail silently - sound is optional UX enhancement
  }
};