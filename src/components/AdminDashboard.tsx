import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { ItemsPanel } from "@/components/admin/ItemsPanel";
import { EmployeesPanel } from "@/components/admin/EmployeesPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { LogOut, Settings, Package, Users, BarChart3 } from "lucide-react";
import { translate } from "@/lib/translations";

export function AdminDashboard() {
  const { logoutAdmin, language } = useApp();
  const [activeTab, setActiveTab] = useState("items");

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Fixed Header */}
      <div className="flex-shrink-0 border-b bg-white dark:bg-slate-800 shadow-sm z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">
            {activeTab === "settings" && "SETTINGS"}
            {activeTab === "items" && "ITEMS"}
            {activeTab === "employees" && "EMPLOYEES"}
            {activeTab === "reports" && "REPORTS"}
          </h1>
          <div className="flex items-center gap-2">
            <Button onClick={logoutAdmin} variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto">
          {activeTab === "settings" && <SettingsPanel />}
          {activeTab === "items" && <ItemsPanel />}
          {activeTab === "employees" && <EmployeesPanel />}
          {activeTab === "reports" && <ReportsPanel />}
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-t shadow-lg z-30">
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