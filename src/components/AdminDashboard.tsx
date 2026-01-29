import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { ItemsPanel } from "@/components/admin/ItemsPanel";
import { EmployeesPanel } from "@/components/admin/EmployeesPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { LanguageSelector } from "@/components/LanguageSelector";
import { LogOut, Settings, Package, Users, BarChart3, Database } from "lucide-react";
import { translate } from "@/lib/translations";

export function AdminDashboard() {
  const { logoutAdmin, language } = useApp();
  const [activeTab, setActiveTab] = useState("settings");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">ADMIN DASHBOARD</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {translate("admin.subtitle", language)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button onClick={logoutAdmin} variant="outline" size="lg">
              <LogOut className="h-5 w-5 mr-2" />
              {translate("common.logout", language)}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-2">
            <TabsTrigger value="settings" className="gap-2 py-3">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-2 py-3">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Items</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2 py-3">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Employees</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 py-3">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>

          <TabsContent value="items">
            <ItemsPanel />
          </TabsContent>

          <TabsContent value="employees">
            <EmployeesPanel />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}