import { useState, useEffect } from "react";
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
  ChevronsUpDown,
  Check,
  Upload,
  FileUp,
  UserCheck,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

async function bulkCreateUsers(users: any[]): Promise<any> {
  const res = await fetch("/api/users/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ users }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to bulk create users");
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

  // Bulk upload state
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploadResult, setBulkUploadResult] = useState<any>(null);

  // Manager combobox state
  const [managerComboOpen, setManagerComboOpen] = useState(false);
  const [managerSearchValue, setManagerSearchValue] = useState("");
  const [editManagerComboOpen, setEditManagerComboOpen] = useState(false);
  const [editManagerSearchValue, setEditManagerSearchValue] = useState("");

  // Reportees combobox state
  const [reporteesComboOpen, setReporteesComboOpen] = useState(false);
  const [reporteesSearchValue, setReporteesSearchValue] = useState("");
  const [selectedReportees, setSelectedReportees] = useState<string[]>([]);

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

  // Handle edit query parameter from org hierarchy
  useEffect(() => {
    if (users && !isLoading) {
      const params = new URLSearchParams(window.location.search);
      const editUserId = params.get('edit');
      if (editUserId) {
        const userToEdit = users.find(u => u.id === editUserId);
        if (userToEdit) {
          handleEditClick(userToEdit);
          // Clean up URL without reload
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [users, isLoading]);

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

  const syncDeptHeadsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/departments/sync-heads", { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync department heads");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-subs"] });
      setSuccess(`Synced ${data.syncedCount} department heads from user assignments`);
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

  const bulkMutation = useMutation({
    mutationFn: bulkCreateUsers,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setBulkUploadResult(data);
      setBulkFile(null);
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
      setSelectedReportees([]);
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
      roles: selectedRoles, // Always send roles array, even if empty
      department: formData.department || undefined,
    });
  };

  const handleBulkUpload = () => {
    if (!bulkFile) {
      setError("Please select a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          setError("CSV file is empty or has no data rows");
          return;
        }

        // Parse CSV header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'email', 'password', 'role'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setError(`Missing required columns: ${missingHeaders.join(', ')}`);
          return;
        }

        // Parse data rows
        const usersData = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const user: any = {};

          headers.forEach((header, i) => {
            if (values[i]) {
              user[header] = values[i];
            }
          });

          // Handle roles array if present
          if (user.roles && typeof user.roles === 'string') {
            user.roles = user.roles.split(';').map((r: string) => r.trim()).filter((r: string) => r);
          }

          // Handle managerId: convert empty string to undefined
          if (user.managerid === '' || user.managerid === null) {
            delete user.managerid;
          }
          // Also check camelCase version
          if (user.managerId === '' || user.managerId === null) {
            delete user.managerId;
          }

          return user;
        });

        bulkMutation.mutate(usersData);
      } catch (err: any) {
        setError("Failed to parse CSV file: " + err.message);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file");
    };

    reader.readAsText(bulkFile);
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
    // Initialize reportees with current direct reports
    const currentReportees = users?.filter(u => u.managerId === user.id).map(u => u.id) || [];
    setSelectedReportees(currentReportees);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError("");
    if (!editFormData.name || !editFormData.email || !editFormData.role) {
      setError("Please fill in all required fields");
      return;
    }

    // First update the user
    updateMutation.mutate({
      id: editingUser.id,
      data: {
        ...editFormData,
        managerId: editFormData.managerId === "__none__" ? undefined : editFormData.managerId,
        roles: editSelectedRoles, // Always send roles array, even if empty (to clear secondary roles)
        department: editFormData.department || undefined,
      },
    });

    // Update reportees (direct reports)
    const currentReportees = users?.filter(u => u.managerId === editingUser.id).map(u => u.id) || [];

    // Find users to add as reportees (selected but not currently reporting)
    const toAdd = selectedReportees.filter(id => !currentReportees.includes(id));

    // Find users to remove as reportees (currently reporting but not selected)
    const toRemove = currentReportees.filter(id => !selectedReportees.includes(id));

    // Update users who should now report to this person
    for (const userId of toAdd) {
      try {
        await updateUser(userId, { managerId: editingUser.id });
      } catch (error) {
        console.error("Failed to add reportee:", error);
      }
    }

    // Update users who should no longer report to this person
    for (const userId of toRemove) {
      try {
        await updateUser(userId, { managerId: undefined });
      } catch (error) {
        console.error("Failed to remove reportee:", error);
      }
    }

    // Refresh the user list after reportees updates
    if (toAdd.length > 0 || toRemove.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
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

  // Department colors for org chart - light borders only
  const departmentColors: Record<string, string> = {
    Finance: "border-blue-300",
    HR: "border-purple-300",
    IT: "border-green-300",
    Sales: "border-orange-300",
    Marketing: "border-pink-300",
    Operations: "border-cyan-300",
    CX: "border-amber-300",
    Legal: "border-indigo-300",
    Product: "border-teal-300",
  };

  const getDepartmentBorder = (department: string | null) => {
    if (!department) return "border-gray-300";
    return departmentColors[department] || "border-gray-300";
  };

  // Org Chart Node component - Visual hierarchy chart
  const OrgChartNode = ({ user: nodeUser, isRoot = false }: { user: User; isRoot?: boolean }) => {
    const directReports = getDirectReports(nodeUser.id);
    const hasReports = directReports.length > 0;
    const deptBorder = getDepartmentBorder(nodeUser.department);

    return (
      <div className="flex flex-col items-center">
        {/* Card with Avatar on top */}
        <div className="flex flex-col items-center">
          {/* Avatar Circle */}
          <Avatar className="h-14 w-14 ring-2 ring-background shadow-md border-2 border-gray-200 mb-2">
            {nodeUser.profilePicture && <AvatarImage src={nodeUser.profilePicture} alt={nodeUser.name} />}
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
              {nodeUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info Card */}
          <Card className={cn(
            "w-[160px] rounded-md px-3 py-2.5 text-center border-2 bg-white",
            deptBorder
          )}>
            <h3 className="font-semibold text-sm leading-tight">{nodeUser.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{nodeUser.role}</p>
            {nodeUser.department && (
              <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">
                {nodeUser.department}
              </p>
            )}
          </Card>
        </div>

        {/* Children */}
        {hasReports && (
          <div className="flex flex-col items-center">
            {/* Vertical line down from card */}
            <div className="w-px h-8 bg-border" />

            {/* Children container */}
            <div className="flex gap-4 relative">
              {/* Horizontal connector line spanning from first to last child center */}
              {directReports.length > 1 && (
                <div
                  className="h-px bg-border absolute top-0"
                  style={{
                    left: '80px', // Center of first card (half of 160px)
                    width: `${(directReports.length - 1) * 176}px` // Distance from first center to last center
                  }}
                />
              )}

              {/* Children nodes with vertical connectors */}
              {directReports.map((report) => (
                <div key={report.id} className="flex flex-col items-center">
                  {/* Vertical line from horizontal to child */}
                  <div className="w-px h-8 bg-border" />
                  <OrgChartNode user={report} />
                </div>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="button-create-user"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Single User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkUpload(true)}>
                  <FileUp className="h-4 w-4 mr-2" />
                  Bulk Upload (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  // Export users to CSV with IDs
                  if (!users) return;
                  const csv = [
                    "id,name,email,role,department,subDepartment,managerId,managerName",
                    ...users.map(u => {
                      const manager = users.find(m => m.id === u.managerId);
                      return `${u.id},${u.name},${u.email},${u.role},"${u.department || ""}","${u.subDepartment || ""}",${u.managerId || ""},${manager?.name || ""}`;
                    })
                  ].join("\n");
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'users_with_ids.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Download User List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                    onValueChange={(value) => {
                      setFormData({ ...formData, role: value });
                      // Sync with additional roles: ensure primary role is always included
                      if (!selectedRoles.includes(value)) {
                        setSelectedRoles([value, ...selectedRoles]);
                      } else {
                        // Move it to front if already exists
                        setSelectedRoles([value, ...selectedRoles.filter(r => r !== value)]);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select primary role" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
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
                    <SelectContent className="max-h-[300px] overflow-y-auto">
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
                    <SelectContent className="max-h-[300px] overflow-y-auto">
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
                  <Popover
                    open={managerComboOpen}
                    onOpenChange={(open) => {
                      setManagerComboOpen(open);
                      if (!open) setManagerSearchValue("");
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={managerComboOpen}
                        className="w-full justify-between font-normal"
                        data-testid="select-manager"
                      >
                        {formData.managerId && formData.managerId !== "__none__"
                          ? users?.find((u) => u.id === formData.managerId)?.name + " - " + users?.find((u) => u.id === formData.managerId)?.role
                          : "Search or select manager..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search by name or role..."
                          value={managerSearchValue}
                          onValueChange={setManagerSearchValue}
                        />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>
                            <p className="text-sm text-muted-foreground p-2">
                              No users found
                            </p>
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__none__"
                              onSelect={() => {
                                setFormData({ ...formData, managerId: "__none__" });
                                setManagerComboOpen(false);
                                setManagerSearchValue("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.managerId === "__none__" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              None
                            </CommandItem>
                            {users
                              ?.filter((u) => {
                                if (!u.isActive) return false;
                                if (!managerSearchValue) return true;
                                const search = managerSearchValue.toLowerCase();
                                return (
                                  u.name.toLowerCase().includes(search) ||
                                  u.role.toLowerCase().includes(search)
                                );
                              })
                              .map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.id}
                                  onSelect={() => {
                                    setFormData({ ...formData, managerId: user.id });
                                    setManagerComboOpen(false);
                                    setManagerSearchValue("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.managerId === user.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {user.name} - {user.role}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">Search and select the direct manager for this user</p>
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
                onClick={() => syncDeptHeadsMutation.mutate()}
                disabled={syncDeptHeadsMutation.isPending}
                title="Auto-sync department heads from user role assignments"
              >
                {syncDeptHeadsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                Sync Heads
              </Button>
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
                                {(dept as any).autoDetectedHead && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                                    Auto
                                  </Badge>
                                )}
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
            <Card className="p-6 overflow-x-auto">
              <div className="flex gap-8 justify-center min-w-max pb-4">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                onValueChange={(value) => {
                  setEditFormData({ ...editFormData, role: value });
                  // Sync with additional roles: ensure primary role is always included as first item
                  if (!editSelectedRoles.includes(value)) {
                    setEditSelectedRoles([value, ...editSelectedRoles]);
                  } else {
                    // Move it to front if already exists
                    setEditSelectedRoles([value, ...editSelectedRoles.filter(r => r !== value)]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary role" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
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
                <SelectContent className="max-h-[300px] overflow-y-auto">
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
                <SelectContent className="max-h-[300px] overflow-y-auto">
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
              <Popover
                open={editManagerComboOpen}
                onOpenChange={(open) => {
                  setEditManagerComboOpen(open);
                  if (!open) setEditManagerSearchValue("");
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editManagerComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    {editFormData.managerId && editFormData.managerId !== "__none__"
                      ? users?.find((u) => u.id === editFormData.managerId)?.name + " - " + users?.find((u) => u.id === editFormData.managerId)?.role + (!users?.find((u) => u.id === editFormData.managerId)?.isActive ? " (Inactive)" : "")
                      : "Search or select manager..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search by name or role..."
                      value={editManagerSearchValue}
                      onValueChange={setEditManagerSearchValue}
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>
                        <p className="text-sm text-muted-foreground p-2">
                          No users found
                        </p>
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setEditFormData({ ...editFormData, managerId: "__none__" });
                            setEditManagerComboOpen(false);
                            setEditManagerSearchValue("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              editFormData.managerId === "__none__" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          None
                        </CommandItem>
                        {users
                          ?.filter((u) => {
                            // Exclude the user being edited
                            if (u.id === editingUser?.id) return false;
                            // Include active users
                            if (u.isActive) {
                              if (!editManagerSearchValue) return true;
                              const search = editManagerSearchValue.toLowerCase();
                              return (
                                u.name.toLowerCase().includes(search) ||
                                u.role.toLowerCase().includes(search)
                              );
                            }
                            // Also include the current manager even if inactive (so the value is valid)
                            if (editFormData.managerId !== "__none__" && u.id === editFormData.managerId) {
                              if (!editManagerSearchValue) return true;
                              const search = editManagerSearchValue.toLowerCase();
                              return (
                                u.name.toLowerCase().includes(search) ||
                                u.role.toLowerCase().includes(search)
                              );
                            }
                            return false;
                          })
                          .map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={() => {
                                setEditFormData({ ...editFormData, managerId: user.id });
                                setEditManagerComboOpen(false);
                                setEditManagerSearchValue("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editFormData.managerId === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user.name} - {user.role}{!user.isActive ? " (Inactive)" : ""}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Search and select the direct manager</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-reportees">Direct Reports (Reportees)</Label>
              <Popover
                open={reporteesComboOpen}
                onOpenChange={(open) => {
                  setReporteesComboOpen(open);
                  if (!open) setReporteesSearchValue("");
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={reporteesComboOpen}
                    className="w-full justify-between font-normal h-auto min-h-10"
                  >
                    <div className="flex flex-wrap gap-1 flex-1">
                      {selectedReportees.length > 0 ? (
                        selectedReportees.map((userId) => {
                          const user = users?.find((u) => u.id === userId);
                          return user ? (
                            <Badge key={userId} variant="secondary" className="gap-1">
                              {user.name}
                              <button
                                type="button"
                                className="ml-1 hover:bg-muted rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReportees(prev => prev.filter(id => id !== userId));
                                }}
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })
                      ) : (
                        <span className="text-muted-foreground">Select users who report to this person...</span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search by name or role..."
                      value={reporteesSearchValue}
                      onValueChange={setReporteesSearchValue}
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>
                        <p className="text-sm text-muted-foreground p-2">
                          No users found
                        </p>
                      </CommandEmpty>
                      <CommandGroup>
                        {users
                          ?.filter((u) => {
                            // Exclude the user being edited
                            if (u.id === editingUser?.id) return false;
                            // Only include active users
                            if (!u.isActive) return false;
                            // Apply search filter
                            if (!reporteesSearchValue) return true;
                            const search = reporteesSearchValue.toLowerCase();
                            return (
                              u.name.toLowerCase().includes(search) ||
                              u.role.toLowerCase().includes(search)
                            );
                          })
                          .map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id}
                              onSelect={(value) => {
                                setSelectedReportees(prev =>
                                  prev.includes(value)
                                    ? prev.filter(id => id !== value)
                                    : [...prev, value]
                                );
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedReportees.includes(user.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user.name} - {user.role}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Select users who will report directly to this person. Multiple selections allowed.
              </p>
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
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="__none__">None</SelectItem>
                  {users?.filter(u => u.isActive && (u.role === "Head" || u.roles?.includes("Head"))).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Only users with "Head" role can be assigned as department heads</p>
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
                <SelectContent className="max-h-[300px] overflow-y-auto">
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
                <SelectContent className="max-h-[300px] overflow-y-auto">
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

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={(open) => {
        setShowBulkUpload(open);
        if (!open) {
          setBulkFile(null);
          setBulkUploadResult(null);
          setError("");
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk User Upload</DialogTitle>
            <DialogDescription>
              Upload a CSV file to create multiple users at once. Download the template to see the required format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {bulkUploadResult && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="font-semibold">{bulkUploadResult.message}</p>
                </div>
                <div className="text-sm space-y-1">
                  <p>✓ Successfully created: {bulkUploadResult.created} users</p>
                  {bulkUploadResult.failed > 0 && (
                    <p className="text-destructive">✗ Failed: {bulkUploadResult.failed} users</p>
                  )}
                </div>
                {bulkUploadResult.details?.failed?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold mb-2">Failed rows:</p>
                    <div className="max-h-40 overflow-y-auto bg-muted p-2 rounded text-xs space-y-1">
                      {bulkUploadResult.details.failed.map((fail: any, i: number) => (
                        <div key={i}>Row {fail.row} ({fail.email}): {fail.error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>CSV File</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  disabled={bulkMutation.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Create and download CSV template
                    const template = "name,email,password,role,department,subDepartment,managerId\nJohn Doe,john@example.com,password123,Agent,Support,,\nJane Smith,jane@example.com,password456,Manager,Sales,,";
                    const blob = new Blob([template], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'user_upload_template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download Template
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Required columns: name, email, password, role. Optional: department, subDepartment, managerId
              </p>
            </div>

            <div className="bg-muted p-3 rounded-lg text-xs space-y-2">
              <p className="font-semibold">CSV Format Guidelines:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>First row must contain column headers</li>
                <li>Required: name, email, password, role</li>
                <li>Optional: department, subDepartment, managerId</li>
                <li>All fields should be comma-separated</li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-2 rounded">
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">💡 How to find Manager IDs:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-2 text-blue-800 dark:text-blue-200">
                  <li>Click "Download User List" in the dropdown above</li>
                  <li>Open the downloaded CSV to see all user IDs</li>
                  <li>Copy the ID of the manager you want to assign</li>
                  <li>Paste it in the managerId column for new users</li>
                  <li>Leave managerId empty if user has no manager</li>
                </ol>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkUpload(false);
                setBulkFile(null);
                setBulkUploadResult(null);
                setError("");
              }}
            >
              {bulkUploadResult ? "Close" : "Cancel"}
            </Button>
            {!bulkUploadResult && (
              <Button
                onClick={handleBulkUpload}
                disabled={!bulkFile || bulkMutation.isPending}
              >
                {bulkMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Users
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
