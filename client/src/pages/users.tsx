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
  Building2,
  ChevronDown,
  ChevronRight,
  FolderTree,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { User, Department, SubDepartment } from "@shared/schema";
import { ROLE_PERMISSIONS } from "@/hooks/use-auth";

const ROLES = ["Owner", "Admin", "Head", "Manager", "Lead", "Associate", "Agent"] as const;
const DEPARTMENTS = ["Finance", "Operations", "Marketplace", "Tech", "Supply", "Growth", "CX"] as const;

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
  const [activeTab, setActiveTab] = useState<"users" | "departments" | "hierarchy">("users");

  // Department management state
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [deptFormData, setDeptFormData] = useState<{
    name: string;
    description: string;
    color: string;
    headId: string;
    subDepartments: Array<{ name: string; description: string }>;
  }>({ name: "", description: "", color: "#6366f1", headId: "__none__", subDepartments: [] });
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);
  const [showSubDeptForm, setShowSubDeptForm] = useState(false);
  const [subDeptFormData, setSubDeptFormData] = useState({ name: "", departmentId: "", parentId: "", description: "" });
  const [editingSubDept, setEditingSubDept] = useState<SubDepartment | null>(null);
  const [deletingSubDeptId, setDeletingSubDeptId] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  // Department queries
  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery({
    queryKey: ["departments-with-subs"],
    queryFn: async () => {
      const res = await fetch("/api/departments/with-sub-departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.json() as Promise<(Department & { subDepartments: SubDepartment[] })[]>;
    },
  });

  // Department mutations
  const createDeptMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; color?: string }) => {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create department");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-subs"] });
      setDeptFormData({ name: "", description: "", color: "#6366f1", headId: "__none__", subDepartments: [] });
      setShowDeptForm(false);
      setSuccess("Department created successfully!");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Department> }) => {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update department");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-subs"] });
      setEditingDept(null);
      setSuccess("Department updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete department");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-subs"] });
      setDeletingDeptId(null);
      setSuccess("Department deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const seedDeptsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/departments/seed-defaults", { method: "POST" });
      if (!res.ok) throw new Error("Failed to seed departments");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-subs"] });
      setSuccess(`Seeded ${data.departments?.length || 0} departments (${data.skipped || 0} already existed)`);
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Sub-department mutations
  const createSubDeptMutation = useMutation({
    mutationFn: async (data: { name: string; departmentId: string; parentId?: string; description?: string }) => {
      const res = await fetch("/api/sub-departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create sub-department");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-subs"] });
      setSubDeptFormData({ name: "", departmentId: "", parentId: "", description: "" });
      setShowSubDeptForm(false);
      setSuccess("Sub-department created successfully!");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const updateSubDeptMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubDepartment> }) => {
      const res = await fetch(`/api/sub-departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update sub-department");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-subs"] });
      setEditingSubDept(null);
      setSuccess("Sub-department updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteSubDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sub-departments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete sub-department");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-subs"] });
      setDeletingSubDeptId(null);
      setSuccess("Sub-department deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const toggleDeptExpanded = (deptId: string) => {
    setExpandedDepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

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
    Head: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Manager: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Lead: "bg-green-500/10 text-green-600 border-green-500/20",
    Associate: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    Agent: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  };

  // Org Chart Node component - Visual hierarchy chart
  const OrgChartNode = ({ user: nodeUser, isRoot = false }: { user: User; isRoot?: boolean }) => {
    const directReports = getDirectReports(nodeUser.id);
    const hasReports = directReports.length > 0;

    return (
      <div className="flex flex-col items-center">
        {/* User Card */}
        <div className={`relative ${!isRoot ? 'pt-6' : ''}`}>
          {/* Vertical line from parent */}
          {!isRoot && (
            <div className="absolute top-0 left-1/2 w-px h-6 bg-border -translate-x-1/2" />
          )}

          <Card className="w-[200px] p-4 hover:shadow-lg transition-all hover:border-primary/50 bg-card">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-14 w-14 mb-2 ring-2 ring-background shadow-md">
                {nodeUser.profilePicture && <AvatarImage src={nodeUser.profilePicture} alt={nodeUser.name} />}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                  {nodeUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-sm leading-tight">{nodeUser.name}</h3>
              <Badge
                variant="outline"
                className={cn(
                  "mt-1 text-xs",
                  roleColors[nodeUser.role]
                )}
              >
                {nodeUser.role}
              </Badge>
              {nodeUser.department && (
                <p className="text-xs text-muted-foreground mt-1">
                  {nodeUser.department}
                  {nodeUser.subDepartment && <span className="block">{nodeUser.subDepartment}</span>}
                </p>
              )}
              {!nodeUser.isActive && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Inactive
                </Badge>
              )}
              {hasReports && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {directReports.length} direct {directReports.length === 1 ? 'report' : 'reports'}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Children */}
        {hasReports && (
          <div className="flex flex-col items-center">
            {/* Vertical line to children */}
            <div className="w-px h-6 bg-border" />

            {/* Horizontal line connecting children */}
            {directReports.length > 1 && (
              <div className="relative w-full flex justify-center">
                <div
                  className="h-px bg-border absolute top-0"
                  style={{
                    width: `calc(${(directReports.length - 1) * 220}px)`,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
            )}

            {/* Children nodes */}
            <div className="flex gap-5 pt-0">
              {directReports.map((report) => (
                <OrgChartNode key={report.id} user={report} />
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "users" | "departments" | "hierarchy")} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Building2 className="h-4 w-4 mr-2" />
              Departments
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
                    Select additional roles to assign multiple responsibilities (e.g., Head + Admin)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department (optional)</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value, subDepartment: "" })}
                  >
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentsData?.filter(d => d.isActive).map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subDepartment">Sub-Department (optional)</Label>
                  <Select
                    value={formData.subDepartment || "__none__"}
                    onValueChange={(value) => setFormData({ ...formData, subDepartment: value === "__none__" ? "" : value })}
                    disabled={!formData.department}
                  >
                    <SelectTrigger data-testid="select-sub-department">
                      <SelectValue placeholder={formData.department ? "Select sub-department" : "Select department first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {departmentsData
                        ?.find(d => d.name === formData.department)
                        ?.subDepartments
                        ?.filter(s => s.isActive)
                        .map((subDept) => (
                          <SelectItem key={subDept.id} value={subDept.name}>
                            {subDept.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.department
                      ? `Available sub-departments under ${formData.department}`
                      : "Select a department first to see available sub-departments"}
                  </p>
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

      <TabsContent value="departments" className="space-y-6">
        {/* Department Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Departments</p>
            <p className="mt-1 text-2xl font-bold">{departmentsData?.length || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Active Departments</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {departmentsData?.filter(d => d.isActive).length || 0}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Sub-Departments</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {departmentsData?.reduce((acc, d) => acc + d.subDepartments.length, 0) || 0}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Users with Departments</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">
              {users?.filter(u => u.department).length || 0}
            </p>
          </Card>
        </div>

        {/* Department Management */}
        <Card>
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">Departments & Sub-Departments</h2>
              <p className="text-sm text-muted-foreground">Manage organizational structure</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedDeptsMutation.mutate()}
                disabled={seedDeptsMutation.isPending}
              >
                {seedDeptsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FolderTree className="h-4 w-4 mr-2" />}
                Seed Defaults
              </Button>
              <Button size="sm" onClick={() => setShowDeptForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>
          </div>

          <div className="p-4">
            {isLoadingDepts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : departmentsData && departmentsData.length > 0 ? (
              <div className="space-y-2">
                {departmentsData.map((dept) => (
                  <Collapsible
                    key={dept.id}
                    open={expandedDepts.has(dept.id)}
                    onOpenChange={() => toggleDeptExpanded(dept.id)}
                  >
                    <div className="rounded-lg border">
                      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/5">
                        <div className="flex items-center gap-3">
                          {expandedDepts.has(dept.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: dept.color || "#6366f1" }}
                          />
                          <div className="text-left">
                            <h3 className="font-medium">{dept.name}</h3>
                            {dept.description && (
                              <p className="text-xs text-muted-foreground">{dept.description}</p>
                            )}
                            {(dept as any).headId && users?.find(u => u.id === (dept as any).headId) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Shield className="h-3 w-3" />
                                Head: {users.find(u => u.id === (dept as any).headId)?.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={dept.isActive ? "default" : "secondary"}>
                            {dept.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <Users className="h-3 w-3 mr-1" />
                            {users?.filter(u => u.department === dept.name).length || 0} user{(users?.filter(u => u.department === dept.name).length || 0) !== 1 ? "s" : ""}
                          </Badge>
                          <Badge variant="outline">
                            {dept.subDepartments.length} sub-dept{dept.subDepartments.length !== 1 ? "s" : ""}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setEditingDept(dept);
                                setDeptFormData({
                                  name: dept.name,
                                  description: dept.description || "",
                                  color: dept.color || "#6366f1",
                                  headId: (dept as any).headId || "__none__",
                                  subDepartments: [],
                                });
                              }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSubDeptFormData({ name: "", departmentId: dept.id, parentId: "", description: "" });
                                setShowSubDeptForm(true);
                              }}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Sub-Department
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingDeptId(dept.id);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t bg-muted/30 p-4">
                          {dept.subDepartments.length > 0 ? (
                            <div className="space-y-2">
                              {/* Render hierarchical sub-departments */}
                              {(() => {
                                // Helper to render sub-departments recursively
                                const renderSubDepts = (parentId: string | null, level: number = 0): React.ReactNode => {
                                  const children = dept.subDepartments.filter(
                                    (s) => ((s as any).parentId || null) === parentId
                                  );
                                  if (children.length === 0) return null;

                                  return children.map((subDept) => (
                                    <div key={subDept.id} className="space-y-2">
                                      <div
                                        className="flex items-center justify-between rounded-md border bg-background p-3"
                                        style={{ marginLeft: `${level * 24}px` }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            level === 0 ? "bg-muted-foreground/50" : level === 1 ? "bg-blue-500/50" : "bg-green-500/50"
                                          )} />
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <p className="font-medium text-sm">{subDept.name}</p>
                                              {(subDept as any).parentId && (
                                                <span className="text-xs text-muted-foreground">
                                                  (under {dept.subDepartments.find(s => s.id === (subDept as any).parentId)?.name})
                                                </span>
                                              )}
                                            </div>
                                            {subDept.description && (
                                              <p className="text-xs text-muted-foreground">{subDept.description}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                                            <Users className="h-2.5 w-2.5 mr-1" />
                                            {users?.filter(u => u.department === dept.name && u.subDepartment === subDept.name).length || 0}
                                          </Badge>
                                          <Badge variant={subDept.isActive ? "outline" : "secondary"} className="text-xs">
                                            {subDept.isActive ? "Active" : "Inactive"}
                                          </Badge>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            title="Add child sub-department"
                                            onClick={() => {
                                              setSubDeptFormData({
                                                name: "",
                                                departmentId: dept.id,
                                                parentId: subDept.id,
                                                description: "",
                                              });
                                              setShowSubDeptForm(true);
                                            }}
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={() => {
                                              setEditingSubDept(subDept);
                                              setSubDeptFormData({
                                                name: subDept.name,
                                                departmentId: subDept.departmentId,
                                                parentId: (subDept as any).parentId || "",
                                                description: subDept.description || "",
                                              });
                                            }}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                            onClick={() => setDeletingSubDeptId(subDept.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                      {/* Render children */}
                                      {renderSubDepts(subDept.id, level + 1)}
                                    </div>
                                  ));
                                };

                                // Start with top-level sub-departments (no parent)
                                return renderSubDepts(null);
                              })()}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No sub-departments yet. Click "Add Sub-Department" to create one.
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">No departments yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create departments to organize your team structure
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" onClick={() => seedDeptsMutation.mutate()}>
                    Seed Default Departments
                  </Button>
                  <Button onClick={() => setShowDeptForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
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

        {/* Organization Chart */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Organization Chart</h2>
            <p className="text-sm text-muted-foreground">Scroll horizontally to view full chart</p>
          </div>

          {isLoading ? (
            <Card className="p-16">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </Card>
          ) : users && users.filter(u => !u.managerId).length > 0 ? (
            <Card className="p-8 overflow-x-auto">
              <div className="flex gap-12 justify-center min-w-max pb-4">
                {users.filter(u => !u.managerId).map((topUser) => (
                  <OrgChartNode key={topUser.id} user={topUser} isRoot />
                ))}
              </div>
            </Card>
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
                onValueChange={(value) => setEditFormData({ ...editFormData, department: value, subDepartment: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentsData?.filter(d => d.isActive).map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subDepartment">Sub-Department (optional)</Label>
              <Select
                value={editFormData.subDepartment || "__none__"}
                onValueChange={(value) => setEditFormData({ ...editFormData, subDepartment: value === "__none__" ? "" : value })}
                disabled={!editFormData.department}
              >
                <SelectTrigger>
                  <SelectValue placeholder={editFormData.department ? "Select sub-department" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {departmentsData
                    ?.find(d => d.name === editFormData.department)
                    ?.subDepartments
                    ?.filter(s => s.isActive)
                    .map((subDept) => (
                      <SelectItem key={subDept.id} value={subDept.name}>
                        {subDept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editFormData.department
                  ? `Available sub-departments under ${editFormData.department}`
                  : "Select a department first"}
              </p>
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

      {/* Create/Edit Department Dialog */}
      <Dialog open={showDeptForm || !!editingDept} onOpenChange={(open) => {
        if (!open) {
          setShowDeptForm(false);
          setEditingDept(null);
          setDeptFormData({ name: "", description: "", color: "#6366f1", headId: "__none__", subDepartments: [] });
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDept ? "Edit Department" : "Create Department"}</DialogTitle>
            <DialogDescription>
              {editingDept ? "Update department details" : "Add a new department to your organization"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Department Name *</Label>
              <Input
                id="dept-name"
                placeholder="e.g., Engineering"
                value={deptFormData.name}
                onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                placeholder="Brief description of the department"
                value={deptFormData.description}
                onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-head">Head of Department</Label>
              <Select
                value={deptFormData.headId}
                onValueChange={(value) => setDeptFormData({ ...deptFormData, headId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department head" />
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
              <p className="text-xs text-muted-foreground">Assign a user as the head of this department</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="dept-color"
                  type="color"
                  value={deptFormData.color}
                  onChange={(e) => setDeptFormData({ ...deptFormData, color: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={deptFormData.color}
                  onChange={(e) => setDeptFormData({ ...deptFormData, color: e.target.value })}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Sub-departments section - only show when creating */}
            {!editingDept && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Sub-Departments</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeptFormData({
                      ...deptFormData,
                      subDepartments: [...deptFormData.subDepartments, { name: "", description: "" }]
                    })}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {deptFormData.subDepartments.length > 0 ? (
                  <div className="space-y-2">
                    {deptFormData.subDepartments.map((subDept, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Sub-department name"
                            value={subDept.name}
                            onChange={(e) => {
                              const updated = [...deptFormData.subDepartments];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setDeptFormData({ ...deptFormData, subDepartments: updated });
                            }}
                          />
                          <Input
                            placeholder="Description (optional)"
                            value={subDept.description}
                            onChange={(e) => {
                              const updated = [...deptFormData.subDepartments];
                              updated[index] = { ...updated[index], description: e.target.value };
                              setDeptFormData({ ...deptFormData, subDepartments: updated });
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            const updated = deptFormData.subDepartments.filter((_, i) => i !== index);
                            setDeptFormData({ ...deptFormData, subDepartments: updated });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3 border rounded-lg border-dashed">
                    No sub-departments added. Click "Add" to create one.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeptForm(false);
              setEditingDept(null);
              setDeptFormData({ name: "", description: "", color: "#6366f1", headId: "__none__", subDepartments: [] });
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const submitData = {
                  name: deptFormData.name,
                  description: deptFormData.description,
                  color: deptFormData.color,
                  headId: deptFormData.headId === "__none__" ? undefined : deptFormData.headId,
                  subDepartments: deptFormData.subDepartments.filter(s => s.name.trim()),
                };
                if (editingDept) {
                  updateDeptMutation.mutate({ id: editingDept.id, data: submitData });
                } else {
                  createDeptMutation.mutate(submitData);
                }
              }}
              disabled={!deptFormData.name || createDeptMutation.isPending || updateDeptMutation.isPending}
            >
              {(createDeptMutation.isPending || updateDeptMutation.isPending) ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
              ) : (
                editingDept ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirmation Dialog */}
      <Dialog open={!!deletingDeptId} onOpenChange={(open) => !open && setDeletingDeptId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this department? All sub-departments will also be deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDeptId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingDeptId && deleteDeptMutation.mutate(deletingDeptId)}
              disabled={deleteDeptMutation.isPending}
            >
              {deleteDeptMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Sub-Department Dialog */}
      <Dialog open={showSubDeptForm || !!editingSubDept} onOpenChange={(open) => {
        if (!open) {
          setShowSubDeptForm(false);
          setEditingSubDept(null);
          setSubDeptFormData({ name: "", departmentId: "", parentId: "", description: "" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubDept ? "Edit Sub-Department" : "Create Sub-Department"}</DialogTitle>
            <DialogDescription>
              {editingSubDept ? "Update sub-department details" : "Add a new sub-department"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sub-dept-name">Sub-Department Name *</Label>
              <Input
                id="sub-dept-name"
                placeholder="e.g., Quality Assurance"
                value={subDeptFormData.name}
                onChange={(e) => setSubDeptFormData({ ...subDeptFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-dept-parent">Parent Department *</Label>
              <Select
                value={subDeptFormData.departmentId}
                onValueChange={(value) => setSubDeptFormData({ ...subDeptFormData, departmentId: value, parentId: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentsData?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-dept-parent-sub">Parent Sub-Department (Optional)</Label>
              <Select
                value={subDeptFormData.parentId || "__none__"}
                onValueChange={(value) => setSubDeptFormData({ ...subDeptFormData, parentId: value === "__none__" ? "" : value })}
                disabled={!subDeptFormData.departmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subDeptFormData.departmentId ? "Select parent sub-department" : "Select department first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (Top-level sub-department)</SelectItem>
                  {departmentsData
                    ?.find(d => d.id === subDeptFormData.departmentId)
                    ?.subDepartments
                    ?.filter(s => s.isActive && s.id !== editingSubDept?.id)
                    .map((subDept) => (
                      <SelectItem key={subDept.id} value={subDept.id}>
                        {subDept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Create nested hierarchies like Supply &gt; Marketplace &gt; MOPS
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-dept-description">Description</Label>
              <Textarea
                id="sub-dept-description"
                placeholder="Brief description of the sub-department"
                value={subDeptFormData.description}
                onChange={(e) => setSubDeptFormData({ ...subDeptFormData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSubDeptForm(false);
              setEditingSubDept(null);
              setSubDeptFormData({ name: "", departmentId: "", parentId: "", description: "" });
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingSubDept) {
                  updateSubDeptMutation.mutate({ id: editingSubDept.id, data: subDeptFormData });
                } else {
                  createSubDeptMutation.mutate(subDeptFormData);
                }
              }}
              disabled={!subDeptFormData.name || !subDeptFormData.departmentId || createSubDeptMutation.isPending || updateSubDeptMutation.isPending}
            >
              {(createSubDeptMutation.isPending || updateSubDeptMutation.isPending) ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
              ) : (
                editingSubDept ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sub-Department Confirmation Dialog */}
      <Dialog open={!!deletingSubDeptId} onOpenChange={(open) => !open && setDeletingSubDeptId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sub-Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sub-department? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSubDeptId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingSubDeptId && deleteSubDeptMutation.mutate(deletingSubDeptId)}
              disabled={deleteSubDeptMutation.isPending}
            >
              {deleteSubDeptMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Deleting...</> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
