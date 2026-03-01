import { Globe } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSelector() {
  const { settings, updateSettings } = useApp();

  const languages = [
    { code: "en" as const, label: "English", flag: "🇬🇧" },
    { code: "id" as const, label: "Indonesia", flag: "🇮🇩" },
    { code: "zh" as const, label: "中文", flag: "🇨🇳" },
    { code: "th" as const, label: "ไทย", flag: "🇹🇭" },
    { code: "vi" as const, label: "Tiếng Việt", flag: "🇻🇳" },
    { code: "my" as const, label: "မြန်မာ", flag: "🇲🇲" },
  ];

  const currentLanguage = languages.find(lang => lang.code === settings.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => updateSettings({ language: lang.code })}
            className={settings.language === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}