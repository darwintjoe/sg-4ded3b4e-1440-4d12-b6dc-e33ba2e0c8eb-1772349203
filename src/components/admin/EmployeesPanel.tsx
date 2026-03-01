import { useState, useMemo } from "react";
import { Plus, Search, Download, Upload, Pencil, Trash2, Users, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/contexts/AppContext";
import { translate } from "@/lib/translations";
import type { Employee } from "@/types";

export function EmployeesPanel() {
  const { employees, deleteEmployee, language } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Get unique roles
  const roles = useMemo(() => {
    const roleSet = new Set(employees.map(emp => emp.role));
    return ["all", ...Array.from(roleSet)];
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           emp.pin.includes(searchQuery);
      const matchesRole = selectedRole === "all" || emp.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, selectedRole]);

  const handleExport = () => {
    const dataStr = JSON.stringify(employees, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedEmployees = JSON.parse(e.target?.result as string);
        console.log("Imported employees:", importedEmployees);
        // TODO: Add employees to database
      } catch (error) {
        console.error("Failed to import employees:", error);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (employeeToDelete?.id) {
      await deleteEmployee(employeeToDelete.id);
      setShowDeleteDialog(false);
      setEmployeeToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Header with Search and Filters */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={translate("employees.searchPlaceholder", language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={translate("employees.allRoles", language)} />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role} value={role}>
                  {role === "all" ? translate("employees.allRoles", language) : role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {translate("employees.export", language)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => document.getElementById('import-emp-file')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {translate("employees.import", language)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            id="import-emp-file"
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Employees List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-50" />
              <p>{translate("employees.noEmployees", language)}</p>
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{employee.name}</h3>
                        <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                          {employee.role}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <span className="font-medium">PIN:</span>
                          <span className="font-mono">{employee.pin}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {translate("employees.joined", language)}: {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : "N/A"}
                        </p>
                        {employee.isActive === false && (
                          <Badge variant="outline" className="mt-1">
                            {translate("employees.inactive", language)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedEmployee(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(employee)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => setShowAddDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate("employees.deleteConfirm", language)}</DialogTitle>
            <DialogDescription>
              {translate("employees.deleteWarning", language).replace("{name}", employeeToDelete?.name || "")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {translate("common.cancel", language)}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {translate("common.delete", language)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Employee Dialog - Placeholder */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translate("employees.addNew", language)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {translate("employees.formPlaceholder", language)}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}