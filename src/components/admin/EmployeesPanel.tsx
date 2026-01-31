import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { db } from "@/lib/db";
import { Employee, UserRole } from "@/types";
import { useLongPress } from "@/hooks/use-long-press";
import { Plus, Search, Upload, AlertCircle, ArrowUpDown, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortField = "name" | "pin" | "joinDate";
type SortDirection = "asc" | "desc";

// Extracted component for long-press
const EmployeeRow = ({ employee, onEdit }: { employee: Employee; onEdit: (e: Employee) => void }) => {
  const longPressHandlers = useLongPress({
    onLongPress: () => onEdit(employee),
    onClick: () => {}, // Prevent accidental edits on single tap
    delay: 500,
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
    // Format: 14 Jan 26
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "2-digit"
    });
  };

  return (
    <TableRow
      {...longPressHandlers}
      className={cn(
        "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none touch-manipulation",
        employee.isActive === false && "opacity-50 bg-slate-100 dark:bg-slate-900"
      )}
    >
      <TableCell className="font-medium">{employee.name}</TableCell>
      <TableCell className="font-mono text-sm">{employee.pin}</TableCell>
      <TableCell className="text-right text-slate-600 dark:text-slate-400">
        {formatDate(employee.joinDate)}
      </TableCell>
    </TableRow>
  );
};

export function EmployeesPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resigned">("active");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  // Get all unique roles from employees
  const getAllRoles = (): string[] => {
    const rolesSet = new Set<string>(["admin", "cashier", "employee"]); // Default roles
    employees.forEach(emp => {
      if (emp.role) rolesSet.add(emp.role.toLowerCase());
    });
    return Array.from(rolesSet).sort();
  };

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
    
    // Check PIN uniqueness - ONLY among ACTIVE employees
    const duplicatePin = allEmployees.find(
      (e) => 
        e.pin === employee.pin && 
        e.id !== employee.id &&
        e.isActive !== false
    );
    if (duplicatePin) {
      return `PIN "${employee.pin}" is already in use by an active employee`;
    }

    // Check Name uniqueness - among ALL employees
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

    if (!editingEmployee.name.trim()) {
      setValidationError("Employee name is required");
      return;
    }

    if (!editingEmployee.pin || editingEmployee.pin.length < 4 || editingEmployee.pin.length > 6) {
      setValidationError("PIN must be 4-6 digits");
      return;
    }

    const uniqueError = await validateUniqueness(editingEmployee);
    if (uniqueError) {
      setValidationError(uniqueError);
      return;
    }

    const employeeToSave = {
      ...editingEmployee,
      joinDate: editingEmployee.joinDate || Date.now(),
      createdAt: editingEmployee.createdAt || Date.now(),
      isActive: editingEmployee.isActive !== false
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
    
    // Auto-capitalize name field
    if (field === "name" && typeof value === "string") {
      value = capitalizeWords(value);
    }
    
    setEditingEmployee({ ...editingEmployee, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleRoleSelect = (role: string) => {
    const capitalized = capitalizeWords(role);
    handleFieldChange("role", capitalized);
    setRoleSheetOpen(false);
    setRoleSearch("");
    
    // Close keyboard after role selection
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      
      if (lines.length < 2) {
        alert("CSV file is empty or has no data");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      
      let imported = 0;
      let skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const row: any = {};
        
        // Simple mapping based on column index if headers match loosely
        headers.forEach((h, idx) => {
          if (h.includes("name")) row.name = values[idx];
          if (h.includes("pin")) row.pin = values[idx];
          if (h.includes("role")) row.role = values[idx];
          if (h.includes("date") || h.includes("join")) row.joinDate = values[idx];
        });

        if (row.name && row.pin) {
          let joinDate = Date.now();
          if (row.joinDate) {
            const parsed = new Date(row.joinDate);
            if (!isNaN(parsed.getTime())) joinDate = parsed.getTime();
          }

          const newEmployee: Employee = {
            name: row.name,
            pin: row.pin,
            role: (row.role as UserRole) || "employee",
            joinDate,
            createdAt: Date.now(),
            isActive: true
          };

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
      alert(`Import complete!\nImported: ${imported}\nSkipped (duplicates/invalid): ${skipped}`);
      event.target.value = "";
    } catch (err: any) {
      alert("Import failed: " + err.message);
    }
  };

  const filteredEmployees = employees
    .filter((employee) => {
      const matchesSearch = 
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.pin.includes(searchQuery);

      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = employee.isActive !== false;
      if (statusFilter === "resigned") matchesStatus = employee.isActive === false;

      const matchesRole = roleFilter === "all" || employee.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
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

  const filteredRoles = getAllRoles().filter(role =>
    role.toLowerCase().includes(roleSearch.toLowerCase())
  );

  return (
    <div className="p-4 space-y-3">
      {/* Compact Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Expandable Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchExpanded(true)}
            onBlur={() => setSearchExpanded(false)}
            className={cn(
              "transition-all duration-200 pl-10",
              searchExpanded ? "w-full sm:w-64" : "w-24"
            )}
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
          </SelectContent>
        </Select>

        {/* Role Filter */}
        <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="cashier">Cashier</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>

        {/* CSV Import */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCSVImport}
          className="hidden"
        />
      </div>

      {/* Simplified Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button onClick={() => handleSort("name")} className="flex items-center gap-1 font-semibold hover:text-blue-600">
                    Name <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="w-[80px]">
                  <button onClick={() => handleSort("pin")} className="flex items-center gap-1 font-semibold hover:text-blue-600">
                    PIN <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  <button onClick={() => handleSort("joinDate")} className="flex items-center gap-1 font-semibold hover:text-blue-600 ml-auto">
                    Joined <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                    {searchQuery ? "No employees found" : "No employees yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <EmployeeRow key={employee.id} employee={employee} onEdit={handleEditEmployee} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Floating Action Button */}
      <button
        onClick={handleNewEmployee}
        className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg z-10 transition-transform hover:scale-110"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Edit/Add Modal - iPhone Style Header */}
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md h-[90vh] flex flex-col p-0">
          {/* iPhone-style header with action buttons */}
          <SheetHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b bg-background">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={handleCloseSheet}
                className="text-blue-600 hover:text-blue-700 hover:bg-transparent -ml-3"
              >
                Cancel
              </Button>
              <SheetTitle className="text-center flex-1">
                {editingEmployee?.id ? "Edit Employee" : "Add New Employee"}
              </SheetTitle>
              <Button 
                onClick={handleSaveEmployee}
                disabled={!editingEmployee || !editingEmployee.name || !editingEmployee.pin}
                className="bg-blue-600 hover:bg-blue-700 -mr-3"
              >
                Save
              </Button>
            </div>
          </SheetHeader>

          {editingEmployee && (
            <>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-6">
                  {validationError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={editingEmployee.name}
                        onChange={(e) => handleFieldChange("name", e.target.value)}
                        placeholder="John Doe"
                        className="placeholder:text-slate-400/60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>PIN (4-6 digits) <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={editingEmployee.pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          handleFieldChange("pin", value);
                        }}
                        placeholder="1234"
                        className="placeholder:text-slate-400/60"
                        disabled={editingEmployee.pin === "0000" || editingEmployee.pin === "1111"}
                      />
                      <p className="text-xs text-slate-500/60">
                        Unique for active employees
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Role <span className="text-red-500">*</span></Label>
                      <Sheet open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => setRoleSheetOpen(true)}
                        >
                          <span className="capitalize">
                            {editingEmployee.role || "Select or type role..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        <SheetContent side="bottom" className="max-h-[50vh] flex flex-col p-0">
                          <SheetHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                            <SheetTitle>Select or Add Role</SheetTitle>
                          </SheetHeader>
                          <div className="flex-1 overflow-y-auto px-6 pb-2">
                            <Command className="rounded-lg border">
                              <CommandInput 
                                placeholder="Type to search or add new role..." 
                                value={roleSearch}
                                onValueChange={setRoleSearch}
                                className="placeholder:text-slate-400/60"
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="py-6 text-center text-sm text-slate-500">
                                    No role found
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {filteredRoles.map((role) => (
                                    <CommandItem
                                      key={role}
                                      value={role}
                                      onSelect={() => handleRoleSelect(role)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          editingEmployee.role?.toLowerCase() === role ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="capitalize">{role}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </div>
                          {/* Sticky Footer with Create Button */}
                          {roleSearch && filteredRoles.length === 0 && (
                            <div className="flex-shrink-0 p-6 pt-4 border-t bg-background">
                              <Button
                                onClick={() => handleRoleSelect(roleSearch)}
                                className="w-full"
                                size="lg"
                              >
                                Create "{capitalizeWords(roleSearch)}"
                              </Button>
                            </div>
                          )}
                        </SheetContent>
                      </Sheet>
                      <p className="text-xs text-slate-500/60">Tap to select existing or type new role</p>
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
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                      <div className="space-y-1">
                        <Label>Status</Label>
                        <p className="text-xs text-slate-500/60">
                          Toggle to mark as resigned
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="employee-status" className={cn(
                          "text-sm font-medium",
                          editingEmployee.isActive === false ? "text-slate-500" : "text-green-600"
                        )}>
                          {editingEmployee.isActive === false ? "Resigned" : "Active"}
                        </Label>
                        <Switch
                          id="employee-status"
                          checked={editingEmployee.isActive !== false}
                          onCheckedChange={(checked) => handleFieldChange("isActive", checked)}
                          disabled={editingEmployee.pin === "0000" || editingEmployee.pin === "1111"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}