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