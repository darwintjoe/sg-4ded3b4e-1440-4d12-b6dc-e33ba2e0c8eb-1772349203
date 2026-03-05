import { useEffect, useState } from "react";
import { Sun, Moon, Sunrise, Sunset, Clock, Coffee, Sparkles } from "lucide-react";

interface GreetingData {
  emoji: string;
  icon: typeof Sun;
  greeting: string;
  message: string;
  color: string;
  bgGradient: string;
}

interface AttendanceGreetingProps {
  type: "clockIn" | "clockOut";
  employeeName: string;
  isLate?: boolean;
  isEarly?: boolean;
  onComplete: () => void;
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function getClockInGreeting(name: string, isLate: boolean, isEarly: boolean): GreetingData {
  const timeOfDay = getTimeOfDay();
  const firstName = name.split(" ")[0];
  
  // Early bird (before expected time)
  if (isEarly) {
    const earlyMessages = [
      { greeting: `Wow ${firstName}!`, message: "You're early today! The boss will love this 💪" },
      { greeting: `Hey ${firstName}!`, message: "Early bird catches the worm! Great start! 🐦" },
      { greeting: `${firstName}!`, message: "So early! Someone's motivated today! 🌟" },
    ];
    const pick = earlyMessages[Math.floor(Math.random() * earlyMessages.length)];
    return {
      emoji: "⭐",
      icon: Sparkles,
      ...pick,
      color: "text-yellow-300",
      bgGradient: "from-yellow-600/90 via-amber-600/90 to-orange-600/90"
    };
  }
  
  // Late arrival
  if (isLate) {
    const lateMessages = [
      { greeting: `Oops, ${firstName}!`, message: "Running a bit late today, huh? Let's catch up! 💨" },
      { greeting: `Hey ${firstName}...`, message: "Better late than never! Let's make it count! 🏃" },
      { greeting: `${firstName}!`, message: "Traffic? Alarm? No worries, you're here now! 😅" },
    ];
    const pick = lateMessages[Math.floor(Math.random() * lateMessages.length)];
    return {
      emoji: "😅",
      icon: Clock,
      ...pick,
      color: "text-orange-300",
      bgGradient: "from-orange-600/90 via-red-500/90 to-pink-600/90"
    };
  }
  
  // Normal arrival - time-based greetings
  if (timeOfDay === "morning") {
    const morningMessages = [
      { greeting: `Good Morning, ${firstName}!`, message: "Have a wonderful and productive day! ☀️" },
      { greeting: `Morning, ${firstName}!`, message: "Ready to crush it today? Let's go! 💪" },
      { greeting: `Hey ${firstName}!`, message: "Fresh morning, fresh start! You got this! 🌅" },
      { greeting: `Rise & shine, ${firstName}!`, message: "Another beautiful day awaits! ✨" },
    ];
    const pick = morningMessages[Math.floor(Math.random() * morningMessages.length)];
    return {
      emoji: "🌅",
      icon: Sunrise,
      ...pick,
      color: "text-amber-300",
      bgGradient: "from-amber-500/90 via-orange-500/90 to-rose-500/90"
    };
  }
  
  if (timeOfDay === "afternoon") {
    const afternoonMessages = [
      { greeting: `Good Afternoon, ${firstName}!`, message: "Afternoon shift? Let's make it great! 🌤️" },
      { greeting: `Hey ${firstName}!`, message: "Ready for a productive afternoon! 💼" },
      { greeting: `${firstName}!`, message: "Afternoon crew reporting! Let's do this! 🚀" },
    ];
    const pick = afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
    return {
      emoji: "🌤️",
      icon: Sun,
      ...pick,
      color: "text-sky-300",
      bgGradient: "from-sky-500/90 via-blue-500/90 to-indigo-500/90"
    };
  }
  
  // Evening/Night
  const eveningMessages = [
    { greeting: `Good Evening, ${firstName}!`, message: "Night shift hero! You're awesome! 🦸" },
    { greeting: `Hey ${firstName}!`, message: "Evening warrior reporting for duty! 🌙" },
    { greeting: `${firstName}!`, message: "Let's own this night shift! 💫" },
  ];
  const pick = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
  return {
    emoji: "🌙",
    icon: Moon,
    ...pick,
    color: "text-purple-300",
    bgGradient: "from-purple-600/90 via-indigo-600/90 to-blue-700/90"
  };
}

function getClockOutGreeting(name: string, isEarly: boolean, isLate: boolean): GreetingData {
  const timeOfDay = getTimeOfDay();
  const firstName = name.split(" ")[0];
  
  // Left early
  if (isEarly) {
    const earlyMessages = [
      { greeting: `Take care, ${firstName}!`, message: "Heading out early? Hope everything's okay! 🤗" },
      { greeting: `Bye ${firstName}!`, message: "Early day today? Rest well! See you! 👋" },
      { greeting: `${firstName}!`, message: "Short day today! Take care of yourself! 💚" },
    ];
    const pick = earlyMessages[Math.floor(Math.random() * earlyMessages.length)];
    return {
      emoji: "👋",
      icon: Coffee,
      ...pick,
      color: "text-teal-300",
      bgGradient: "from-teal-600/90 via-cyan-600/90 to-sky-600/90"
    };
  }
  
  // Stayed late / overtime
  if (isLate) {
    const lateMessages = [
      { greeting: `Finally, ${firstName}!`, message: "Long day! You deserve a good rest! 😴" },
      { greeting: `Wow ${firstName}!`, message: "Working late? You're a star! Rest well! ⭐" },
      { greeting: `${firstName}!`, message: "Overtime hero! Go home and recharge! 🔋" },
    ];
    const pick = lateMessages[Math.floor(Math.random() * lateMessages.length)];
    return {
      emoji: "🌟",
      icon: Moon,
      ...pick,
      color: "text-indigo-300",
      bgGradient: "from-indigo-600/90 via-purple-600/90 to-pink-600/90"
    };
  }
  
  // Normal clock out
  if (timeOfDay === "morning" || timeOfDay === "afternoon") {
    const dayMessages = [
      { greeting: `See you, ${firstName}!`, message: "Great work today! Enjoy your time off! 🎉" },
      { greeting: `Bye ${firstName}!`, message: "Another day done! Take care! 👋" },
      { greeting: `${firstName}!`, message: "Good job today! See you next time! ✌️" },
    ];
    const pick = dayMessages[Math.floor(Math.random() * dayMessages.length)];
    return {
      emoji: "👋",
      icon: Sun,
      ...pick,
      color: "text-emerald-300",
      bgGradient: "from-emerald-500/90 via-teal-500/90 to-cyan-500/90"
    };
  }
  
  // Evening/Night
  const nightMessages = [
    { greeting: `Good night, ${firstName}!`, message: "Rest well! See you tomorrow! 🌙" },
    { greeting: `Take care, ${firstName}!`, message: "Long day done! Sweet dreams! 💤" },
    { greeting: `Bye ${firstName}!`, message: "Night shift complete! You're amazing! ⭐" },
  ];
  const pick = nightMessages[Math.floor(Math.random() * nightMessages.length)];
  return {
    emoji: "🌙",
    icon: Sunset,
    ...pick,
    color: "text-violet-300",
    bgGradient: "from-violet-600/90 via-purple-600/90 to-fuchsia-600/90"
  };
}

export function AttendanceGreeting({ 
  type, 
  employeeName, 
  isLate = false, 
  isEarly = false, 
  onComplete 
}: AttendanceGreetingProps) {
  const [visible, setVisible] = useState(false);
  
  const data = type === "clockIn" 
    ? getClockInGreeting(employeeName, isLate, isEarly)
    : getClockOutGreeting(employeeName, isEarly, isLate);
  
  const Icon = data.icon;
  
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Card */}
      <div 
        className={`relative max-w-sm w-full bg-gradient-to-br ${data.bgGradient} rounded-3xl p-8 shadow-2xl border border-white/20 transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"
        }`}
      >
        <div className="text-center">
          <div className="mb-5 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Icon className={`w-10 h-10 ${data.color}`} />
            </div>
          </div>
          <h1 className={`text-2xl font-black mb-2 ${data.color}`}>
            {data.greeting}
          </h1>
          <p className="text-lg text-white/90 font-medium">
            {data.message}
          </p>
        </div>
      </div>
    </div>
  );
}