import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { db } from "@/lib/db";
import { Employee, UserRole } from "@/types";
import { useLongPress } from "@/hooks/use-long-press";
import { Plus, Search, AlertCircle, ArrowUpDown, Check, ChevronsUpDown, ArrowDownToLine, ArrowUpFromLine, UserPlus, Users, Calendar, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { translate } from "@/lib/translations";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type SortField = "name" | "pin" | "joinDate";
type SortDirection = "asc" | "desc";

const EmployeeRow = ({ employee, onEdit }: { employee: Employee; onEdit: (e: Employee) => void }) => {
  const longPressHandlers = useLongPress({
    onLongPress: () => onEdit(employee),
    onClick: () => {},
    delay: 500,
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "-";
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
      <TableCell className="text-sm w-[50%] break-words whitespace-normal">{employee.name}</TableCell>
      <TableCell className="text-sm w-[25%]">{employee.pin}</TableCell>
      <TableCell className="text-right text-sm w-[25%] whitespace-nowrap">
        {formatDate(employee.joinDate)}
      </TableCell>
    </TableRow>
  );
};

export function EmployeesPanel() {
  const { language } = useApp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resigned">("active");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [originalEmployee, setOriginalEmployee] = useState<Employee | null>(null);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const hasActualChanges = (): boolean => {
    if (!editingEmployee || !originalEmployee) return false;
    
    const normalize = (val: any) => {
      if (val === "" || val === null || val === undefined) return "";
      if (typeof val === "string") return val.trim();
      return val;
    };

    return (
      normalize(editingEmployee.name) !== normalize(originalEmployee.name) ||
      normalize(editingEmployee.pin) !== normalize(originalEmployee.pin) ||
      normalize(editingEmployee.role) !== normalize(originalEmployee.role) ||
      editingEmployee.joinDate !== originalEmployee.joinDate ||
      editingEmployee.isActive !== originalEmployee.isActive
    );
  };

  const capitalizeWords = (str: string) => {
    return str
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  const getAllRoles = (): string[] => {
    const rolesSet = new Set<string>(["admin", "cashier", "employee"]);
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
    
    const duplicatePin = allEmployees.find(
      (e) => 
        e.pin === employee.pin && 
        e.id !== employee.id &&
        e.isActive !== false
    );
    if (duplicatePin) {
      return `PIN "${employee.pin}" is already in use by an active employee`;
    }

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
      setTimeout(() => pinInputRef.current?.focus(), 100);
      return;
    }

    const uniqueError = await validateUniqueness(editingEmployee);
    if (uniqueError) {
      setValidationError(uniqueError);
      setTimeout(() => pinInputRef.current?.focus(), 100);
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
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleNewEmployee = () => {
    const newEmployee: Employee = {
      name: "",
      pin: "",
      role: "employee",
      joinDate: Date.now(),
      createdAt: Date.now(),
      isActive: true
    };
    setEditingEmployee(newEmployee);
    setOriginalEmployee({ ...newEmployee });
    setHasUnsavedChanges(false);
    setValidationError("");
    setIsDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee({ ...employee });
    setOriginalEmployee({ ...employee });
    setHasUnsavedChanges(false);
    setValidationError("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (hasActualChanges()) {
      if (confirm("You have unsaved changes. Discard them?")) {
        setIsDialogOpen(false);
        setEditingEmployee(null);
        setOriginalEmployee(null);
        setHasUnsavedChanges(false);
        setValidationError("");
      }
    } else {
      setIsDialogOpen(false);
      setEditingEmployee(null);
      setOriginalEmployee(null);
      setValidationError("");
    }
  };

  const handleFieldChange = (field: keyof Employee, value: any) => {
    if (!editingEmployee) return;
    
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

  const handleCSVExport = async () => {
    const allEmployees = await db.getAll<Employee>("employees");
    const headers = ["Name", "PIN", "Role", "Join Date"];
    const rows = allEmployees.map(emp => [
      emp.name,
      emp.pin,
      emp.role,
      emp.joinDate ? new Date(emp.joinDate).toLocaleDateString("en-GB") : ""
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredEmployees = useMemo(() => {
    return employees
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
  }, [employees, searchQuery, statusFilter, roleFilter, sortField, sortDirection]);

  const filteredRoles = getAllRoles().filter(role =>
    role.toLowerCase().includes(roleSearch.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background border-b shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={translate("common.search", language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
        <Button onClick={() => { setEditingEmployee(null); setIsDialogOpen(true); }} className="ml-4 gap-2 shadow-sm">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{translate("employees.addEmployee", language)}</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-8">
            <Users className="h-12 w-12 mb-3 opacity-20" />
            <p>{employees.length === 0 ? translate("employees.noEmployees", language) : translate("employees.noEmployeesFound", language)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEmployees.map((employee) => (
              <Card 
                key={employee.id} 
                className="group overflow-hidden hover:shadow-md transition-all duration-300 border-border/50 bg-background/50 hover:bg-background cursor-pointer"
                onClick={() => { setEditingEmployee(employee); setIsDialogOpen(true); }}
              >
                <div className="p-4 flex items-center gap-4">
                   <Avatar className="h-14 w-14 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                     <AvatarFallback className={`text-lg font-bold ${
                       employee.role === 'admin' 
                         ? 'bg-amber-100 text-amber-700' 
                         : 'bg-blue-100 text-blue-700'
                     }`}>
                       {employee.name.substring(0, 2).toUpperCase()}
                     </AvatarFallback>
                   </Avatar>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between mb-1">
                       <h3 className="font-semibold truncate pr-2">{employee.name}</h3>
                       {employee.role === 'admin' && (
                         <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                       )}
                     </div>
                     <div className="flex items-center gap-2 text-xs">
                       <Badge variant={employee.role === 'admin' ? "default" : "secondary"} className="h-5 px-1.5 font-normal capitalize">
                         {employee.role}
                       </Badge>
                       <span className="text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                         PIN: ••••
                       </span>
                     </div>
                   </div>
                </div>
                <div className="px-4 py-3 bg-muted/30 border-t flex justify-between items-center text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {new Date(employee.joinedAt).toLocaleDateString()}
                  </span>
                  <span className={`flex items-center gap-1.5 ${!employee.isActive ? 'text-red-500' : 'text-green-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${!employee.isActive ? 'bg-red-500' : 'bg-green-600'}`} />
                    {employee.isActive ? translate("common.active", language) : translate("common.inactive", language)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCloseDialog();
        }
      }}>
        <DialogContent className="max-w-md h-[100dvh] max-h-[100dvh] flex flex-col p-0 gap-0 [&>button]:hidden">
          {editingEmployee && (
            <>
              {/* Fixed Header */}
              <div className="flex-shrink-0 px-6 py-3 border-b bg-background">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    onClick={handleCloseDialog}
                    className="text-blue-600 hover:text-blue-700 hover:bg-transparent -ml-3"
                  >
                    {translate("common.cancel", language)}
                  </Button>
                  <h2 className="text-lg font-semibold">
                    {editingEmployee?.id ? translate("employees.editEmployee", language) : translate("employees.addEmployee", language)}
                  </h2>
                  <Button 
                    onClick={handleSaveEmployee}
                    disabled={!editingEmployee || !editingEmployee.name || !editingEmployee.pin}
                    className="bg-blue-600 hover:bg-blue-700 -mr-3"
                  >
                    {translate("common.save", language)}
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div 
                className="flex-1 overflow-y-auto overscroll-contain px-6 py-4" 
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="space-y-4 pb-8">
                  {validationError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>{translate("employees.fullName", language)} <span className="text-red-500">*</span></Label>
                    <Input
                      value={editingEmployee.name}
                      onChange={(e) => handleFieldChange("name", e.target.value)}
                      placeholder="John Doe"
                      className="placeholder:text-slate-400/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{translate("employees.pin", language)} (4-6 digits) <span className="text-red-500">*</span></Label>
                    <Input
                      ref={pinInputRef}
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
                      {translate("employees.uniquePin", language)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{translate("employees.role", language)} <span className="text-red-500">*</span></Label>
                    <Dialog open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setRoleSheetOpen(true)}
                      >
                        <span className="capitalize">
                          {editingEmployee.role || translate("employees.selectRole", language)}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      <DialogContent className="max-w-md max-h-[50vh] flex flex-col p-0">
                        <div className="px-6 pt-6 pb-4 flex-shrink-0">
                          <h3 className="text-lg font-semibold">{translate("employees.selectOrAddRole", language)}</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 pb-2">
                          <Command className="rounded-lg border">
                            <CommandInput 
                              placeholder={translate("employees.searchRole", language)}
                              value={roleSearch}
                              onValueChange={setRoleSearch}
                              className="placeholder:text-slate-400/60"
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div className="py-6 text-center text-sm text-slate-500">
                                  {translate("employees.noRoleFound", language)}
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
                        {roleSearch && filteredRoles.length === 0 && (
                          <div className="flex-shrink-0 p-6 pt-4 border-t bg-background">
                            <Button
                              onClick={() => handleRoleSelect(roleSearch)}
                              className="w-full"
                              size="lg"
                            >
                              {translate("employees.createRole", language).replace("{role}", capitalizeWords(roleSearch))}
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <p className="text-xs text-slate-500/60">{translate("employees.roleHint", language)}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>{translate("employees.joinDate", language)}</Label>
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
                      <Label>{translate("employees.status", language)}</Label>
                      <p className="text-xs text-slate-500/60">
                        {translate("employees.statusHint", language)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="employee-status" className={cn(
                        "text-sm font-medium",
                        editingEmployee.isActive === false ? "text-slate-500" : "text-green-600"
                      )}>
                        {editingEmployee.isActive === false ? translate("employees.resigned", language) : translate("common.active", language)}
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}