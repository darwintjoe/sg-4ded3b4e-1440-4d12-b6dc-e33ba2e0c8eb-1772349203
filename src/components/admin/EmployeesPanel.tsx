import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { db } from "@/lib/db";
import { Employee, UserRole } from "@/types";
import { Plus, Edit, Trash2, Users, Shield, User, Search, ArrowUpDown, Upload, Download, AlertCircle, Eye, EyeOff } from "lucide-react";

type SortField = "name" | "pin" | "joinDate";
type SortDirection = "asc" | "desc";

export function EmployeesPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [hideInactive, setHideInactive] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const allEmployees = await db.getAll<Employee>("employees");
    setEmployees(allEmployees);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const validateUniqueness = async (employee: Employee): Promise<string | null> => {
    const allEmployees = await db.getAll<Employee>("employees");
    
    // Check PIN uniqueness - ONLY among ACTIVE employees (resigned employees' PINs can be reused)
    const duplicatePin = allEmployees.find(
      (e) => 
        e.pin === employee.pin && 
        e.id !== employee.id &&
        e.isActive !== false // Only check active employees
    );
    if (duplicatePin) {
      return `PIN "${employee.pin}" is already in use by an active employee`;
    }

    // Check Name uniqueness - among ALL employees (active + inactive)
    const duplicateName = allEmployees.find(
      (e) => e.name.toLowerCase() === employee.name.toLowerCase() && e.id !== employee.id
    );
    if (duplicateName) {
      return `Employee name "${employee.name}" already exists`;
    }

    return null;
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;

    // Validation
    if (!editingEmployee.name.trim()) {
      setValidationError("Employee name is required");
      return;
    }

    if (!editingEmployee.pin || editingEmployee.pin.length < 4 || editingEmployee.pin.length > 6) {
      setValidationError("PIN must be 4-6 digits");
      return;
    }

    // Check uniqueness
    const uniqueError = await validateUniqueness(editingEmployee);
    if (uniqueError) {
      setValidationError(uniqueError);
      return;
    }

    const employeeToSave = {
      ...editingEmployee,
      joinDate: editingEmployee.joinDate || Date.now(),
      createdAt: editingEmployee.createdAt || Date.now(),
      isActive: editingEmployee.isActive !== false // Default to true if not set
    };

    if (employeeToSave.id) {
      await db.put("employees", employeeToSave);
    } else {
      await db.add("employees", { ...employeeToSave, id: Date.now() });
    }

    await loadEmployees();
    setHasUnsavedChanges(false);
    setValidationError("");
    setIsSheetOpen(false);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!employee.id) return;

    // Prevent deleting default accounts
    if (employee.pin === "0000" || employee.pin === "1111") {
      alert("Cannot delete default admin or cashier account");
      return;
    }

    if (confirm(`Permanently delete "${employee.name}"? This cannot be undone.`)) {
      await db.delete("employees", employee.id);
      await loadEmployees();
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    if (!employee.id) return;

    // Prevent deactivating default accounts
    if (employee.pin === "0000" || employee.pin === "1111") {
      alert("Cannot deactivate default admin or cashier account");
      return;
    }

    const action = employee.isActive !== false ? "mark as resigned" : "reactivate";
    if (confirm(`Are you sure you want to ${action} "${employee.name}"?`)) {
      await db.put("employees", {
        ...employee,
        isActive: employee.isActive === false ? true : false
      });
      await loadEmployees();
    }
  };

  const handleNewEmployee = () => {
    setEditingEmployee({
      name: "",
      pin: "",
      role: "employee",
      joinDate: Date.now(),
      createdAt: Date.now(),
      isActive: true
    });
    setHasUnsavedChanges(false);
    setValidationError("");
    setIsSheetOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee({ ...employee });
    setHasUnsavedChanges(false);
    setValidationError("");
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Discard them?")) {
        setIsSheetOpen(false);
        setEditingEmployee(null);
        setHasUnsavedChanges(false);
        setValidationError("");
      }
    } else {
      setIsSheetOpen(false);
      setEditingEmployee(null);
      setValidationError("");
    }
  };

  const handleFieldChange = (field: keyof Employee, value: any) => {
    if (!editingEmployee) return;
    setEditingEmployee({ ...editingEmployee, [field]: value });
    setHasUnsavedChanges(true);
  };

  const downloadCSVTemplate = () => {
    const template = "name,pin,role,joinDate,isActive\nJohn Doe,1234,cashier,2026-01-15,true\nJane Smith,5678,employee,2026-01-20,true";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees_template.csv";
    a.click();
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });

      if (row.name && row.pin) {
        // Parse joinDate if provided (format: YYYY-MM-DD)
        let joinDate = Date.now();
        if (row.joindate) {
          const parsed = new Date(row.joindate);
          if (!isNaN(parsed.getTime())) {
            joinDate = parsed.getTime();
          }
        }

        // Parse isActive status
        const isActive = row.isactive !== "false" && row.isactive !== "0";

        const newEmployee: Employee = {
          name: row.name,
          pin: row.pin,
          role: (row.role as UserRole) || "employee",
          joinDate,
          createdAt: Date.now(),
          isActive
        };

        // Check uniqueness before import
        const error = await validateUniqueness(newEmployee);
        if (!error) {
          await db.add("employees", { ...newEmployee, id: Date.now() + i });
          imported++;
        } else {
          skipped++;
        }
      }
    }

    await loadEmployees();
    alert(`Import complete!\nImported: ${imported}\nSkipped (duplicates): ${skipped}`);
    event.target.value = "";
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "cashier":
        return <User className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "default";
      case "cashier":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const filteredEmployees = employees
    .filter((employee) => {
      // Hide inactive filter
      if (hideInactive && employee.isActive === false) return false;

      // Search filter
      return (
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.pin.includes(searchQuery)
      );
    })
    .sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "pin") {
        aVal = a.pin;
        bVal = b.pin;
      } else if (sortField === "joinDate") {
        aVal = a.joinDate || 0;
        bVal = b.joinDate || 0;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const activeCount = employees.filter(e => e.isActive !== false).length;
  const inactiveCount = employees.filter(e => e.isActive === false).length;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or PIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-slate-50 dark:bg-slate-900">
            <Switch
              id="hide-inactive"
              checked={hideInactive}
              onCheckedChange={setHideInactive}
            />
            <Label htmlFor="hide-inactive" className="cursor-pointer text-sm font-medium">
              {hideInactive ? <EyeOff className="h-4 w-4 inline mr-1" /> : <Eye className="h-4 w-4 inline mr-1" />}
              Hide Resigned
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={downloadCSVTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Template
          </Button>

          <Button variant="outline" size="sm" className="gap-2 relative">
            <Upload className="h-4 w-4" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </Button>

          <Button onClick={handleNewEmployee} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex gap-4">
        <Card className="p-4 flex-1">
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <div className="text-sm text-slate-500">Active Employees</div>
        </Card>
        <Card className="p-4 flex-1">
          <div className="text-2xl font-bold text-slate-400">{inactiveCount}</div>
          <div className="text-sm text-slate-500">Resigned</div>
        </Card>
      </div>

      {/* List View Table */}
      {filteredEmployees.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Users className="h-16 w-16 mx-auto text-slate-300" />
            <p className="text-slate-500">
              {searchQuery ? "No employees found" : "No employees yet. Add your first employee!"}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("name")}
                    className="hover:bg-transparent p-0 h-auto font-semibold"
                  >
                    Employee Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("pin")}
                    className="hover:bg-transparent p-0 h-auto font-semibold"
                  >
                    PIN
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[150px]">Role</TableHead>
                <TableHead className="w-[150px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("joinDate")}
                    className="hover:bg-transparent p-0 h-auto font-semibold"
                  >
                    Join Since
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className={employee.isActive === false ? "opacity-50" : ""}>
                  <TableCell>
                    <Badge variant={employee.isActive === false ? "outline" : "default"} className="gap-1">
                      {employee.isActive === false ? "Resigned" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell className="font-mono text-sm">{employee.pin}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(employee.role)} className="gap-1">
                      {getRoleIcon(employee.role)}
                      {employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(employee.joinDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(employee)}
                        className="h-8 px-2"
                        title={employee.isActive === false ? "Reactivate" : "Mark as Resigned"}
                        disabled={employee.pin === "0000" || employee.pin === "1111"}
                      >
                        {employee.isActive === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEmployee(employee)}
                        className="h-8 px-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEmployee(employee)}
                        className="h-8 px-2 text-red-600 hover:text-red-700"
                        disabled={employee.pin === "0000" || employee.pin === "1111"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Full Screen Sheet Modal */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingEmployee?.id ? "Edit Employee" : "Add New Employee"}
            </SheetTitle>
          </SheetHeader>

          {editingEmployee && (
            <div className="space-y-6 mt-6">
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={editingEmployee.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label>PIN (4-6 digits) *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={editingEmployee.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      handleFieldChange("pin", value);
                    }}
                    placeholder="1234"
                    disabled={editingEmployee.pin === "0000" || editingEmployee.pin === "1111"}
                  />
                  <p className="text-xs text-slate-500">
                    Must be unique among active employees (resigned employees' PINs can be reused)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={editingEmployee.role}
                    onValueChange={(value) => handleFieldChange("role", value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">🛡️ Admin</SelectItem>
                      <SelectItem value="cashier">👤 Cashier</SelectItem>
                      <SelectItem value="employee">👥 Employee</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Admin: Full access | Cashier: POS access | Employee: Attendance only
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Join Date</Label>
                  <Input
                    type="date"
                    value={
                      editingEmployee.joinDate
                        ? new Date(editingEmployee.joinDate).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => {
                      const timestamp = new Date(e.target.value).getTime();
                      handleFieldChange("joinDate", timestamp);
                    }}
                  />
                  <p className="text-xs text-slate-500">
                    When this employee joined your business
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label>Employment Status</Label>
                    <p className="text-xs text-slate-500">
                      Set to "Resigned" when employee leaves the company
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="employee-status" className="text-sm font-normal">
                      {editingEmployee.isActive === false ? "Resigned" : "Active"}
                    </Label>
                    <Switch
                      id="employee-status"
                      checked={editingEmployee.isActive !== false}
                      onCheckedChange={(checked) => handleFieldChange("isActive", checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" onClick={handleCloseSheet}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEmployee}
                  disabled={
                    !editingEmployee.name ||
                    !editingEmployee.pin ||
                    editingEmployee.pin.length < 4
                  }
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}