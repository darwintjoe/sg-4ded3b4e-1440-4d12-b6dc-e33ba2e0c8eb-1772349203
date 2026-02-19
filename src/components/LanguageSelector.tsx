import { useApp } from "@/contexts/AppContext";
import { Language } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const languageLabels: Record<Language, string> = {
  en: "EN",
  id: "ID",
  zh: "CN"
};

export function LanguageSelector() {
  const { language, setLanguage } = useApp();

  return (
    <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
      <SelectTrigger className="w-[100px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
        <SelectValue>{languageLabels[language]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">EN</SelectItem>
        <SelectItem value="id">ID</SelectItem>
        <SelectItem value="zh">CN</SelectItem>
      </SelectContent>
    </Select>
  );
}