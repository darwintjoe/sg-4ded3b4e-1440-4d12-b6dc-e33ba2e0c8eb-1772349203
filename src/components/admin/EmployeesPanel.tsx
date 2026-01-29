import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { Employee, UserRole } from "@/types";
import { Plus, Edit, Trash2, Users, Shield, User } from "lucide-react";

export function EmployeesPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const allEmployees = await db.getAll<Employee>("employees");
    setEmployees(allEmployees);
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;

    // Validate PIN
    if (!editingEmployee.pin || editingEmployee.pin.length < 4 || editingEmployee.pin.length > 6) {
      alert("PIN must be 4-6 digits");
      return;
    }

    // Check for duplicate PIN
    const existingEmployee = employees.find(
      (e) => e.pin === editingEmployee.pin && e.id !== editingEmployee.id
    );
    if (existingEmployee) {
      alert("PIN already in use by another employee");
      return;
    }

    if (editingEmployee.id) {
      await db.put("employees", editingEmployee);
    } else {
      await db.add("employees", { ...editingEmployee, id: Date.now() });
    }

    await loadEmployees();
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = async (id: number) => {
    // Prevent deleting default accounts
    const employee = employees.find((e) => e.id === id);
    if (employee && (employee.pin === "0000" || employee.pin === "1111")) {
      alert("Cannot delete default admin or cashier account");
      return;
    }

    if (confirm("Delete this employee?")) {
      await db.delete("employees", id);
      await loadEmployees();
    }
  };

  const handleNewEmployee = () => {
    setEditingEmployee({
      name: "",
      pin: "",
      role: "employee"
    });
    setIsDialogOpen(true);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Employees Management</h2>
        <Button onClick={handleNewEmployee} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {employees.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Users className="h-16 w-16 mx-auto text-slate-300" />
            <p className="text-slate-500">No employees yet</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{employee.name}</h3>
                    <p className="text-xs text-slate-500 font-mono">PIN: {employee.pin}</p>
                  </div>
                  <Badge variant={getRoleBadgeVariant(employee.role)} className="gap-1">
                    {getRoleIcon(employee.role)}
                    {employee.role}
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingEmployee(employee);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => employee.id && handleDeleteEmployee(employee.id)}
                    className="text-red-600 hover:text-red-700"
                    disabled={employee.pin === "0000" || employee.pin === "1111"}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Add Employee Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEmployee?.id ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
          </DialogHeader>

          {editingEmployee && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={editingEmployee.name}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, name: e.target.value })
                  }
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
                    setEditingEmployee({ ...editingEmployee, pin: value });
                  }}
                  placeholder="1234"
                />
                <p className="text-xs text-slate-500">
                  Must be unique and 4-6 digits only
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={editingEmployee.role}
                  onValueChange={(value) =>
                    setEditingEmployee({ ...editingEmployee, role: value as UserRole })
                  }
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

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
                  Save Employee
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}