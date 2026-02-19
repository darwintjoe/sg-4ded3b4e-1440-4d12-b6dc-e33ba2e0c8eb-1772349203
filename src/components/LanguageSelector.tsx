import { useApp } from "@/contexts/AppContext";
import { Language } from "@/types";

const languages: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "id", label: "ID" },
  { code: "zh", label: "CN" }
];

export function LanguageSelector() {
  const { language, setLanguage } = useApp();

  return (
    <div className="flex items-center gap-1 bg-white/10 backdrop-blur rounded-lg p-1 border border-white/20">
      {languages.map((lang, index) => (
        <div key={lang.code} className="flex items-center">
          <button
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-1.5 rounded text-sm font-bold transition-all ${
              language === lang.code
                ? "bg-white text-slate-900 shadow-md"
                : "text-white hover:bg-white/20"
            }`}
          >
            {lang.label}
          </button>
          {index < languages.length - 1 && (
            <div className="h-4 w-px bg-white/30 mx-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}