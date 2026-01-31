import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { ItemsPanel } from "@/components/admin/ItemsPanel";
import { EmployeesPanel } from "@/components/admin/EmployeesPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { LanguageSelector } from "@/components/LanguageSelector";
import { LogOut, Settings, Package, Users, BarChart3 } from "lucide-react";
import { translate } from "@/lib/translations";

export function AdminDashboard() {
  const { logoutAdmin, language } = useApp();
  const [activeTab, setActiveTab] = useState("items");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 pb-20">
      {/* Compact Header */}
      <div className="border-b bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">ADMIN</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button onClick={logoutAdmin} variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === "settings" && <SettingsPanel />}
        {activeTab === "items" && <ItemsPanel />}
        {activeTab === "employees" && <EmployeesPanel />}
        {activeTab === "reports" && <ReportsPanel />}
      </div>

      {/* Bottom Navigation - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t shadow-lg z-20">
        <div className="max-w-7xl mx-auto px-2">
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === "settings"
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Settings className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Settings</span>
            </button>

            <button
              onClick={() => setActiveTab("items")}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === "items"
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Package className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Items</span>
            </button>

            <button
              onClick={() => setActiveTab("employees")}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === "employees"
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Employees</span>
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={`flex flex-col items-center justify-center py-3 px-2 transition-colors ${
                activeTab === "reports"
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <BarChart3 className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}