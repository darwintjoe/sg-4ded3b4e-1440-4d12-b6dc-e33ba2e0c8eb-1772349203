"use client";

import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Initialize and play ka-ching sound
    audioRef.current = new Audio("/ka-ching.mp3");
    audioRef.current.volume = 0.7;
    audioRef.current.play().catch((error) => {
      console.log("Audio playback failed (likely due to browser autoplay policy):", error);
    });

    const video = videoRef.current;
    if (!video) return;

    // Handle video end
    const handleVideoEnd = () => {
      // Fade out transition
      setIsVisible(false);
      // Wait for fade animation to complete before calling onComplete
      setTimeout(() => {
        onComplete();
      }, 500);
    };

    // Handle video error (fallback to auto-complete after 5 seconds)
    const handleVideoError = () => {
      console.error("Video failed to load, proceeding to app...");
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onComplete();
        }, 500);
      }, 5000);
    };

    video.addEventListener("ended", handleVideoEnd);
    video.addEventListener("error", handleVideoError);

    // Attempt to play video
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.error("Video autoplay failed:", error);
        // If autoplay fails, still proceed after 5 seconds
        handleVideoError();
      });
    }

    return () => {
      video.removeEventListener("ended", handleVideoEnd);
      video.removeEventListener("error", handleVideoError);
      // Stop audio when component unmounts
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ pointerEvents: isVisible ? "auto" : "none" }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain max-w-[100%]"
        playsInline
        muted
        preload="auto"
      >
        <source src="/splash.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}