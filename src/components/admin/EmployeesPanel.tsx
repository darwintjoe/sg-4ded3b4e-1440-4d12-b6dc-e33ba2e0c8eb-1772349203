import { useState, useRef } from "react";
import { Search, Plus, ArrowUpFromLine, ArrowDownToLine, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/contexts/AppContext";
import { Employee } from "@/types";
import { translate } from "@/lib/translations";
import { toast } from "@/hooks/use-toast";

export function EmployeesPanel() {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    importEmployeesFromCSV,
    language
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resigned">("active");
  const [roleFilter, setRoleFilter] = useState<"all" | "cashier" | "admin">("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "cashier" as "cashier" | "admin",
    pin: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleAddEmployee = () => {
    if (!formData.name || !formData.email || !formData.pin) {
      toast({
        title: translate("common.error", language),
        description: translate("employees.fillRequired", language),
        variant: "destructive"
      });
      return;
    }

    if (formData.pin.length !== 4 || !/^\d+$/.test(formData.pin)) {
      toast({
        title: translate("common.error", language),
        description: translate("employees.invalidPin", language),
        variant: "destructive"
      });
      return;
    }

    const newEmployee: Omit<Employee, "id" | "createdAt"> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      pin: formData.pin,
      status: "active"
    };

    addEmployee(newEmployee);
    setIsAddDialogOpen(false);
    resetForm();
    toast({
      title: translate("common.success", language),
      description: translate("employees.employeeAdded", language)
    });
  };

  const handleEditEmployee = () => {
    if (!selectedEmployee) return;

    if (!formData.name || !formData.email || !formData.pin) {
      toast({
        title: translate("common.error", language),
        description: translate("employees.fillRequired", language),
        variant: "destructive"
      });
      return;
    }

    if (formData.pin.length !== 4 || !/^\d+$/.test(formData.pin)) {
      toast({
        title: translate("common.error", language),
        description: translate("employees.invalidPin", language),
        variant: "destructive"
      });
      return;
    }

    const updatedEmployee: Employee = {
      ...selectedEmployee,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      pin: formData.pin
    };

    updateEmployee(updatedEmployee);
    setIsEditDialogOpen(false);
    setSelectedEmployee(null);
    resetForm();
    toast({
      title: translate("common.success", language),
      description: translate("employees.employeeUpdated", language)
    });
  };

  const handleDeleteEmployee = () => {
    if (!selectedEmployee) return;
    deleteEmployee(selectedEmployee.id);
    setIsDeleteDialogOpen(false);
    setSelectedEmployee(null);
    toast({
      title: translate("common.success", language),
      description: translate("employees.employeeDeleted", language)
    });
  };

  const handleToggleStatus = (employee: Employee) => {
    const newStatus = employee.status === "active" ? "resigned" : "active";
    updateEmployee({ ...employee, status: newStatus });
    toast({
      title: translate("common.success", language),
      description: newStatus === "active" 
        ? translate("employees.employeeActivated", language)
        : translate("employees.employeeDeactivated", language)
    });
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || "",
      phone: employee.phone || "",
      role: (employee.role === "employee" ? "cashier" : employee.role) as "admin" | "cashier",
      pin: employee.pin
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "cashier",
      pin: ""
    });
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importEmployeesFromCSV(file);
      toast({
        title: translate("common.success", language),
        description: translate("employees.importSuccess", language)
      });
    } catch (error) {
      toast({
        title: translate("common.error", language),
        description: translate("employees.importError", language),
        variant: "destructive"
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCSVExport = () => {
    const headers = ["Name", "Email", "Phone", "Role", "PIN", "Status"];
    const rows = employees.map(emp => [
      emp.name,
      emp.email,
      emp.phone,
      emp.role,
      emp.pin,
      emp.status
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `employees_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: translate("common.success", language),
      description: translate("employees.exportSuccess", language)
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translate("common.all", language)}</SelectItem>
              <SelectItem value="active">{translate("common.active", language)}</SelectItem>
              <SelectItem value="resigned">{translate("common.inactive", language)}</SelectItem>
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as any)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{translate("employees.allRoles", language)}</SelectItem>
              <SelectItem value="cashier">{translate("employees.cashier", language)}</SelectItem>
              <SelectItem value="admin">{translate("employees.admin", language)}</SelectItem>
            </SelectContent>
          </Select>

          {/* Import Button */}
          <Button 
            variant="outline" 
            size="default"
            onClick={() => fileInputRef.current?.click()}
            className="w-auto px-3 whitespace-nowrap"
          >
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            <span>{translate("common.import", language)}</span>
          </Button>

          {/* Export Button */}
          <Button 
            variant="outline" 
            size="default"
            onClick={handleCSVExport}
            className="w-auto px-3 whitespace-nowrap"
          >
            <ArrowUpFromLine className="h-4 w-4 mr-2" />
            <span>{translate("common.export", language)}</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={translate("common.searchPlaceholder", language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleCSVImport}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{translate("employees.name", language)}</TableHead>
              <TableHead>{translate("employees.email", language)}</TableHead>
              <TableHead>{translate("employees.phone", language)}</TableHead>
              <TableHead>{translate("employees.role", language)}</TableHead>
              <TableHead>{translate("common.status", language)}</TableHead>
              <TableHead className="text-right">{translate("common.actions", language)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {translate("employees.noEmployees", language)}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone}</TableCell>
                  <TableCell>
                    <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                      {translate(`employees.${employee.role}`, language)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(employee)}
                    >
                      <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                        {employee.status === "active" ? translate("common.active", language) : translate("common.inactive", language)}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(employee)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Button 
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg"
        onClick={() => {
          resetForm();
          setIsAddDialogOpen(true);
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translate("employees.addEmployee", language)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{translate("employees.name", language)} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">{translate("employees.email", language)} *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">{translate("employees.phone", language)}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role">{translate("employees.role", language)} *</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val as any })}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">{translate("employees.cashier", language)}</SelectItem>
                  <SelectItem value="admin">{translate("employees.admin", language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pin">{translate("employees.pin", language)} * (4 digits)</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {translate("common.cancel", language)}
            </Button>
            <Button onClick={handleAddEmployee}>
              {translate("common.add", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{translate("employees.editEmployee", language)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{translate("employees.name", language)} *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">{translate("employees.email", language)} *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">{translate("employees.phone", language)}</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">{translate("employees.role", language)} *</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val as any })}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">{translate("employees.cashier", language)}</SelectItem>
                  <SelectItem value="admin">{translate("employees.admin", language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-pin">{translate("employees.pin", language)} * (4 digits)</Label>
              <Input
                id="edit-pin"
                type="password"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {translate("common.cancel", language)}
            </Button>
            <Button onClick={handleEditEmployee}>
              {translate("common.save", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{translate("employees.deleteConfirm", language)}</AlertDialogTitle>
            <AlertDialogDescription>
              {translate("employees.deleteWarning", language)}
              {selectedEmployee && (
                <div className="mt-2 font-semibold">
                  {selectedEmployee.name} ({selectedEmployee.email})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{translate("common.cancel", language)}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive text-destructive-foreground">
              {translate("common.delete", language)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}