import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2,
  MoreVertical,
  Key,
  Shield,
  Eye,
  EyeOff,
  Network,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@shared/schema";
import { ROLE_PERMISSIONS } from "@/hooks/use-auth";

const ROLES = ["Owner", "Admin", "Seller Support Agent", "Department Head", "Department Manager", "Department Agent"] as const;
const DEPARTMENTS = ["Finance", "Operations", "Marketplace", "Tech", "Experience", "CX", "Seller Support"] as const;

// All available permissions
const ALL_PERMISSIONS = [
  { id: "view:dashboard", label: "View Dashboard", category: "General" },
  { id: "view:tickets", label: "View Tickets", category: "Tickets" },
  { id: "create:tickets", label: "Create Tickets", category: "Tickets" },
  { id: "edit:tickets", label: "Edit Tickets", category: "Tickets" },
  { id: "delete:tickets", label: "Delete Tickets", category: "Tickets" },
  { id: "view:all_tickets", label: "View All Tickets", category: "Tickets" },
  { id: "view:department_tickets", label: "View Department Tickets", category: "Tickets" },
  { id: "view:assigned_tickets", label: "View Assigned Tickets", category: "Tickets" },
  { id: "view:users", label: "View Users", category: "Users" },
  { id: "create:users", label: "Create Users", category: "Users" },
  { id: "edit:users", label: "Edit Users", category: "Users" },
  { id: "delete:users", label: "Delete Users", category: "Users" },
  { id: "view:vendors", label: "View Vendors", category: "Vendors" },
  { id: "create:vendors", label: "Create Vendors", category: "Vendors" },
  { id: "edit:vendors", label: "Edit Vendors", category: "Vendors" },
  { id: "delete:vendors", label: "Delete Vendors", category: "Vendors" },
  { id: "view:analytics", label: "View Analytics", category: "Analytics" },
  { id: "view:config", label: "View Configuration", category: "Settings" },
  { id: "edit:config", label: "Edit Configuration", category: "Settings" },
] as const;

async function getUsers(): Promise<User[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: string;
  roles?: string[];
  department?: string;
  subDepartment?: string;
  managerId?: string;
}): Promise<User> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create user");
  }
  return res.json();
}

async function updateUser(id: string, data: {
  name?: string;
  email?: string;
  role?: string;
  roles?: string[];
  department?: string;
  subDepartment?: string;
  managerId?: string;
}): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update user");
  }
  return res.json();
}

async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to delete user");
  }
}

async function changeUserPassword(id: string, newPassword: string): Promise<void> {
  const res = await fetch(`/api/users/${id}/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to change password");
  }
}

async function updateUserPermissions(id: string, permissions: string[]): Promise<void> {
  const res = await fetch(`/api/users/${id}/permissions`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customPermissions: permissions }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update permissions");
  }
}

export default function UsersPage() {
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    department: "",
    subDepartment: "",
    managerId: "__none__",
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    subDepartment: "",
    managerId: "__none__",
  });
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [managingPermissionsUser, setManagingPermissionsUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"users" | "hierarchy">("users");

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormData({ name: "", email: "", password: "", role: "", department: "", subDepartment: "", managerId: "__none__" });
      setSelectedRoles([]);
      setShowForm(false);
      setSuccess("User created successfully!");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
      setEditSelectedRoles([]);
      setSuccess("User updated successfully!");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeletingUserId(null);
      setSuccess("User deleted successfully!");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => changeUserPassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setChangingPasswordUser(null);
      setNewPassword("");
      setSuccess("Password changed successfully!");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      updateUserPermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setManagingPermissionsUser(null);
      setSelectedPermissions([]);
      setSuccess("Permissions updated successfully!");
      setError("");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setError("Please fill in all required fields");
      return;
    }

    mutation.mutate({
      ...formData,
      managerId: formData.managerId === "__none__" ? undefined : formData.managerId,
      roles: selectedRoles.length > 0 ? selectedRoles : undefined,
      department: formData.department || undefined,
    });
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "",
      subDepartment: user.subDepartment || "",
      managerId: user.managerId || "__none__",
    });
    setEditSelectedRoles(user.roles || []);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError("");
    if (!editFormData.name || !editFormData.email || !editFormData.role) {
      setError("Please fill in all required fields");
      return;
    }

    updateMutation.mutate({
      id: editingUser.id,
      data: {
        ...editFormData,
        managerId: editFormData.managerId === "__none__" ? undefined : editFormData.managerId,
        roles: editSelectedRoles.length > 0 ? editSelectedRoles : undefined,
        department: editFormData.department || undefined,
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (deletingUserId) {
      deleteMutation.mutate(deletingUserId);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPasswordUser) return;

    setError("");
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    changePasswordMutation.mutate({
      id: changingPasswordUser.id,
      password: newPassword,
    });
  };

  const handleManagePermissions = (user: User) => {
    setManagingPermissionsUser(user);
    // If user has custom permissions, use those; otherwise pre-select role-based defaults
    const permissions = user.customPermissions && user.customPermissions.length > 0
      ? user.customPermissions
      : (ROLE_PERMISSIONS[user.role] || []);
    setSelectedPermissions(permissions);
  };

  const handlePermissionsSubmit = () => {
    if (!managingPermissionsUser) return;
    updatePermissionsMutation.mutate({
      id: managingPermissionsUser.id,
      permissions: selectedPermissions,
    });
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleRole = (role: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditSelectedRoles((prev) =>
        prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
      );
    } else {
      setSelectedRoles((prev) =>
        prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
      );
    }
  };

  const getManagerName = (managerId: string | undefined | null) => {
    if (!managerId || !users) return null;
    const manager = users.find(u => u.id === managerId);
    return manager ? manager.name : null;
  };

  const getDirectReports = (userId: string) => {
    if (!users) return [];
    return users.filter(u => u.managerId === userId);
  };

  const roleColors: Record<string, string> = {
    Owner: "bg-red-500/10 text-red-600 border-red-500/20",
    Admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "Seller Support Agent": "bg-green-500/10 text-green-600 border-green-500/20",
    "Department Head": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Department Manager": "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "Department Agent": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  };

  // Org Hierarchy UserNode component
  const UserNode = ({ user: nodeUser, level = 0 }: { user: User; level?: number }) => {
    const directReports = getDirectReports(nodeUser.id);
    const hasReports = directReports.length > 0;

    return (
      <div className="relative">
        <Card className={`p-4 mb-2 ${level > 0 ? 'ml-8' : ''} hover:bg-accent/5 transition-colors`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {nodeUser.profilePicture && <AvatarImage src={nodeUser.profilePicture} alt={nodeUser.name} />}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {nodeUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{nodeUser.name}</h3>
                  {!nodeUser.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {nodeUser.role}
                  </Badge>
                  {nodeUser.department && (
                    <span className="text-xs text-muted-foreground">
                      {nodeUser.department}{nodeUser.subDepartment ? ` - ${nodeUser.subDepartment}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasReports && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {directReports.length} {directReports.length === 1 ? 'report' : 'reports'}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Render direct reports recursively */}
        {hasReports && (
          <div className="relative">
            {level === 0 && (
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            )}
            <div className="space-y-2">
              {directReports.map((report) => (
                <UserNode key={report.id} user={report} level={level + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Users className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    User Management
                  </h1>
                  <p className="text-xs text-muted-foreground">Create and manage portal users</p>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-create-user"
            >
              <Plus className="h-4 w-4" />
              Create User
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "users" | "hierarchy")} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="hierarchy">
              <Network className="h-4 w-4 mr-2" />
              Organization Hierarchy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* User Statistics */}
            {users && (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {/* Total Users */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <h3 className="mt-2 text-3xl font-bold">{users.length}</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            {/* Role-wise Breakdown */}
            <Card className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">Role-wise Users</p>
              <div className="space-y-2">
                {Object.entries(
                  users.reduce((acc, user) => {
                    acc[user.role] = (acc[user.role] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{role}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Department-wise Breakdown */}
            <Card className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">Department-wise Users</p>
              <div className="space-y-2">
                {Object.entries(
                  users
                    .filter((user) => user.department)
                    .reduce((acc, user) => {
                      if (user.department) {
                        acc[user.department] = (acc[user.department] || 0) + 1;
                      }
                      return acc;
                    }, {} as Record<string, number>)
                ).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{dept}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {users.filter((user) => !user.department).length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">No Department</span>
                    <span className="font-semibold">{users.filter((user) => !user.department).length}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Create User Form */}
        {showForm && (
          <Card className="mb-8 p-6">
            <h2 className="mb-6 text-lg font-semibold">Create New User</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@joinfleek.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <PasswordInput
                    id="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    showStrength
                    data-testid="input-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Primary Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select primary role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Additional Roles (optional)</Label>
                  <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                    {ROLES.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={selectedRoles.includes(role)}
                          onCheckedChange={() => toggleRole(role, false)}
                        />
                        <Label
                          htmlFor={`role-${role}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {role}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select additional roles to assign multiple responsibilities (e.g., Department Head + Admin)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department (optional)</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subDepartment">Sub-Department (optional)</Label>
                  <Input
                    id="subDepartment"
                    placeholder="e.g., Shipping, QC, Logistics"
                    value={formData.subDepartment}
                    onChange={(e) => setFormData({ ...formData, subDepartment: e.target.value })}
                    data-testid="input-sub-department"
                  />
                  <p className="text-xs text-muted-foreground">Sub-team or specialized unit within the department</p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="managerId">Reports To (optional)</Label>
                  <Select
                    value={formData.managerId}
                    onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                  >
                    <SelectTrigger data-testid="select-manager">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {users?.filter(u => u.isActive).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} - {user.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Select the direct manager for this user</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="button-submit-user"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Users List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Users</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users && users.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => {
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                const isPasswordVisible = visiblePasswords.has(user.id);

                return (
                  <Card key={user.id} className="p-5" data-testid={`card-user-${user.id}`}>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                          <AvatarFallback className="text-sm font-medium bg-accent text-accent-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
                              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                  Password: <span className="font-mono">{isPasswordVisible ? user.password : '••••••••'}</span>
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => togglePasswordVisibility(user.id)}
                                >
                                  {isPasswordVisible ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setChangingPasswordUser(user)}>
                                  <Key className="mr-2 h-4 w-4" />
                                  Change Password
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManagePermissions(user)}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Manage Permissions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingUserId(user.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("border", roleColors[user.role])} variant="outline">
                          {user.role}
                        </Badge>
                        {user.roles && user.roles.length > 0 && user.roles.map((role) => (
                          role !== user.role && (
                            <Badge key={role} className={cn("border", roleColors[role])} variant="outline">
                              {role}
                            </Badge>
                          )
                        ))}
                        {user.department && (
                          <Badge variant="secondary">
                            {user.department}{user.subDepartment ? ` - ${user.subDepartment}` : ''}
                          </Badge>
                        )}
                      </div>
                      {(user.managerId || getDirectReports(user.id).length > 0) && (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {user.managerId && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Reports to:</span>
                              <span>{getManagerName(user.managerId)}</span>
                            </div>
                          )}
                          {getDirectReports(user.id).length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Direct reports:</span>
                              <span>{getDirectReports(user.id).length}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{user.isActive ? "Active" : "Inactive"}</span>
                        <span>Created {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground">No users yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first user to get started
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" />
                Create User
              </Button>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="hierarchy" className="space-y-6">
        {/* Organization Hierarchy Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="mt-1 text-2xl font-bold">{users?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Active Users</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {users?.filter(u => u.isActive).length || 0}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Top Level</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {users?.filter(u => !u.managerId).length || 0}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Departments</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">
              {users ? new Set(users.filter(u => u.department).map(u => u.department)).size : 0}
            </p>
          </Card>
        </div>

        {/* Organization Tree */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Organization Structure</h2>
          </div>

          {isLoading ? (
            <Card className="p-16">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ) : users && users.filter(u => !u.managerId).length > 0 ? (
            <div className="space-y-6">
              {users.filter(u => !u.managerId).map((topUser) => (
                <UserNode key={topUser.id} user={topUser} />
              ))}
            </div>
          ) : (
            <Card className="p-16">
              <div className="text-center">
                <Network className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground">No organization hierarchy</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add users and assign managers to build your organization structure
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab("users")}
                >
                  Manage Users
                </Button>
              </div>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {error && editingUser && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                placeholder="John Doe"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="john@joinfleek.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Primary Role *</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Additional Roles (optional)</Label>
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                {ROLES.map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-role-${role}`}
                      checked={editSelectedRoles.includes(role)}
                      onCheckedChange={() => toggleRole(role, true)}
                    />
                    <Label
                      htmlFor={`edit-role-${role}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {role}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select additional roles to assign multiple responsibilities
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-department">Department (optional)</Label>
              <Select
                value={editFormData.department}
                onValueChange={(value) => setEditFormData({ ...editFormData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subDepartment">Sub-Department (optional)</Label>
              <Input
                id="edit-subDepartment"
                placeholder="e.g., Shipping, QC, Logistics"
                value={editFormData.subDepartment}
                onChange={(e) => setEditFormData({ ...editFormData, subDepartment: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Sub-team or specialized unit</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-managerId">Reports To (optional)</Label>
              <Select
                value={editFormData.managerId}
                onValueChange={(value) => setEditFormData({ ...editFormData, managerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {users?.filter(u => {
                    // Include active users (excluding the user being edited)
                    if (u.isActive && u.id !== editingUser?.id) return true;
                    // Also include the current manager even if inactive (so the Select value is valid)
                    if (editFormData.managerId !== "__none__" && u.id === editFormData.managerId && u.id !== editingUser?.id) return true;
                    return false;
                  }).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.role}{!user.isActive ? " (Inactive)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select the direct manager</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingUserId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleDeleteConfirm}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={!!changingPasswordUser} onOpenChange={(open) => !open && setChangingPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {changingPasswordUser?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {error && changingPasswordUser && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput
                id="new-password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                showStrength
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setChangingPasswordUser(null);
                  setNewPassword("");
                  setError("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog open={!!managingPermissionsUser} onOpenChange={(open) => !open && setManagingPermissionsUser(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions - {managingPermissionsUser?.name}</DialogTitle>
            <DialogDescription>
              Customize agent-level permissions. These override default role permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Group permissions by category */}
            {Object.entries(
              ALL_PERMISSIONS.reduce((acc, perm) => {
                if (!acc[perm.category]) acc[perm.category] = [];
                acc[perm.category].push(perm);
                return acc;
              }, {} as Record<string, Array<typeof ALL_PERMISSIONS[number]>>)
            ).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium text-sm">{category}</h4>
                <div className="grid grid-cols-2 gap-3">
                  {perms.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                      <Label
                        htmlFor={permission.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {permission.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Show current role permissions for reference */}
            {managingPermissionsUser && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">
                  Default Role Permissions ({managingPermissionsUser.role})
                </h4>
                <p className="text-xs text-muted-foreground">
                  Custom permissions override these default permissions.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setManagingPermissionsUser(null);
                setSelectedPermissions([]);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePermissionsSubmit}
              disabled={updatePermissionsMutation.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {updatePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Permissions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
