import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { LogOut, Settings, Database, BarChart3, Users, Package } from "lucide-react";
import { translate } from "@/lib/translations";

export function AdminDashboard() {
  const { logoutAdmin, language } = useApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">ADMIN DASHBOARD</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {translate("admin.subtitle", language)}
            </p>
          </div>
          <Button onClick={logoutAdmin} variant="outline" size="lg">
            <LogOut className="h-5 w-5 mr-2" />
            {translate("common.logout", language)}
          </Button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {translate("admin.settings", language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Configure POS mode, printer, tax rate, and system preferences
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {translate("admin.items", language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage product catalog, categories, variants, and modifiers
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {translate("admin.employees", language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Add, edit, and manage employee accounts and PINs
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {translate("admin.reports", language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                View sales reports, attendance logs, and business analytics
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {translate("admin.backup", language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Backup data to Google Drive and manage cloud storage
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-amber-100 dark:bg-amber-900 border-2 border-amber-500 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            ℹ️ Dashboard features are placeholders. Full admin functionality will be implemented in Stage 3.
          </p>
        </div>
      </div>
    </div>
  );
}