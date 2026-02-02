import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth, ROLE_PERMISSIONS } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Shield,
  Users,
  Key,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Check,
  Lock,
  Unlock,
  RefreshCw,
} from "lucide-react";

type Permission = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Role = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
};

async function getRoles(): Promise<Role[]> {
  const res = await fetch("/api/roles");
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

async function getPermissions(): Promise<{ permissions: Permission[]; grouped: Record<string, Permission[]> }> {
  const res = await fetch("/api/permissions");
  if (!res.ok) throw new Error("Failed to fetch permissions");
  return res.json();
}

export default function RolesPage() {
  const [, setLocation] = useLocation();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("system");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [roleForm, setRoleForm] = useState({
    name: "",
    displayName: "",
    description: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: getPermissions,
  });

  const systemRoles = useMemo(() => {
    return roles?.filter(r => r.isSystem) || [];
  }, [roles]);

  const customRoles = useMemo(() => {
    return roles?.filter(r => !r.isSystem) || [];
  }, [roles]);

  const canEditRoles = hasPermission("edit:roles");
  const canCreateRoles = hasPermission("create:roles");
  const canDeleteRoles = hasPermission("delete:roles");

  // Seed defaults mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/roles/seed-defaults", { method: "POST" });
      if (!res.ok) throw new Error("Failed to seed defaults");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["permissions"] });

      const hasErrors = data.errors && data.errors.length > 0;
      const description = hasErrors
        ? `Created ${data.permissions.created} permissions, ${data.roles.created} roles. Errors: ${data.errors.length}`
        : `Created ${data.permissions.created} permissions, ${data.roles.created} roles. Skipped ${data.permissions.skipped} existing permissions, ${data.roles.skipped} existing roles.`;

      toast({
        title: hasErrors ? "Seeding Completed with Errors" : "Defaults Seeded",
        description,
        variant: hasErrors ? "destructive" : "default",
      });

      // Log full details to console for debugging
      console.log("[Seed Results]", data);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Create/Update role mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { role: typeof roleForm; permissionIds: string[]; isEdit: boolean; roleId?: string }) => {
      const url = data.isEdit ? `/api/roles/${data.roleId}` : "/api/roles";
      const method = data.isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data.role,
          permissions: data.permissionIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Success", description: editingRole ? "Role updated" : "Role created" });
      handleCloseDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Update permissions mutation (for system roles)
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      const res = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update permissions");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Success", description: "Permissions updated" });
      handleCloseDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete role mutation
  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Success", description: "Role deleted" });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenCreateDialog = () => {
    setEditingRole(null);
    setRoleForm({ name: "", displayName: "", description: "" });
    setSelectedPermissions(new Set());
    setShowRoleDialog(true);
  };

  const handleOpenEditDialog = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
    });
    setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
    setShowRoleDialog(true);
  };

  const handleOpenPermissionDialog = (role: Role) => {
    setEditingRole(role);
    setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
    setShowPermissionDialog(true);
  };

  const handleCloseDialog = () => {
    setShowRoleDialog(false);
    setShowPermissionDialog(false);
    setEditingRole(null);
    setRoleForm({ name: "", displayName: "", description: "" });
    setSelectedPermissions(new Set());
  };

  const handleSaveRole = () => {
    if (editingRole?.isSystem) {
      // For system roles, only update permissions
      updatePermissionsMutation.mutate({
        roleId: editingRole.id,
        permissionIds: Array.from(selectedPermissions),
      });
    } else {
      saveMutation.mutate({
        role: roleForm,
        permissionIds: Array.from(selectedPermissions),
        isEdit: !!editingRole,
        roleId: editingRole?.id,
      });
    }
  };

  const handleSavePermissions = () => {
    if (!editingRole) return;
    updatePermissionsMutation.mutate({
      roleId: editingRole.id,
      permissionIds: Array.from(selectedPermissions),
    });
  };

  const togglePermission = (permId: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permId)) {
      newSet.delete(permId);
    } else {
      newSet.add(permId);
    }
    setSelectedPermissions(newSet);
  };

  const toggleAllInCategory = (category: string, permissions: Permission[]) => {
    const newSet = new Set(selectedPermissions);
    const categoryPermIds = permissions.filter(p => p.category === category).map(p => p.id);
    const allSelected = categoryPermIds.every(id => newSet.has(id));

    if (allSelected) {
      categoryPermIds.forEach(id => newSet.delete(id));
    } else {
      categoryPermIds.forEach(id => newSet.add(id));
    }
    setSelectedPermissions(newSet);
  };

  const renderRoleTable = (rolesList: Role[], isSystemTab: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">S.No</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Display Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Permissions</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-20">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rolesList.map((role, index) => (
          <TableRow key={role.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell className="font-mono text-sm">
              <div className="flex items-center gap-2">
                {role.isSystem && <Lock className="h-3 w-3 text-muted-foreground" />}
                {role.name}
              </div>
            </TableCell>
            <TableCell>{role.displayName}</TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">
              {role.description || "-"}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{role.permissions.length} permissions</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={role.isActive ? "default" : "secondary"}>
                {role.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isSystemTab ? (
                    <DropdownMenuItem
                      onClick={() => handleOpenPermissionDialog(role)}
                      disabled={!canEditRoles}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Edit Permissions
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleOpenEditDialog(role)}
                        disabled={!canEditRoles}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm(role)}
                        disabled={!canDeleteRoles}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
        {rolesList.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              {isSystemTab
                ? "No system roles found. Click 'Seed Defaults' to create them."
                : "No custom roles created yet."}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderPermissionsGrid = () => {
    if (!permissionsData?.grouped) return null;

    const categories = Object.keys(permissionsData.grouped).sort();

    return (
      <div className="space-y-6">
        {categories.map(category => {
          const categoryPerms = permissionsData.grouped[category];
          const allSelected = categoryPerms.every(p => selectedPermissions.has(p.id));
          const someSelected = categoryPerms.some(p => selectedPermissions.has(p.id));

          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleAllInCategory(category, permissionsData.permissions)}
                  className={someSelected && !allSelected ? "opacity-50" : ""}
                />
                <h4 className="font-semibold text-sm">{category}</h4>
                <Badge variant="outline" className="text-xs">
                  {categoryPerms.filter(p => selectedPermissions.has(p.id)).length}/{categoryPerms.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                {categoryPerms.map(perm => (
                  <div key={perm.id} className="flex items-center gap-2">
                    <Checkbox
                      id={perm.id}
                      checked={selectedPermissions.has(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                    />
                    <Label htmlFor={perm.id} className="text-sm cursor-pointer">
                      {perm.displayName}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Shield className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Roles & Permissions
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Manage roles and their permissions
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
              >
                {seedMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Seed Defaults
              </Button>
              {canCreateRoles && (
                <Button size="sm" onClick={handleOpenCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
          <Card className="p-4">
            <p className="text-sm font-medium text-muted-foreground">System Roles</p>
            <h3 className="mt-1 text-2xl font-bold">{systemRoles.length}</h3>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Custom Roles</p>
            <h3 className="mt-1 text-2xl font-bold">{customRoles.length}</h3>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total Permissions</p>
            <h3 className="mt-1 text-2xl font-bold">{permissionsData?.permissions.length || 0}</h3>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Categories</p>
            <h3 className="mt-1 text-2xl font-bold">
              {permissionsData?.grouped ? Object.keys(permissionsData.grouped).length : 0}
            </h3>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-4">
              <TabsList className="h-12 bg-transparent">
                <TabsTrigger value="system" className="gap-2">
                  <Lock className="h-4 w-4" />
                  System Roles
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2">
                  <Unlock className="h-4 w-4" />
                  Custom Roles
                </TabsTrigger>
                <TabsTrigger value="permissions" className="gap-2">
                  <Key className="h-4 w-4" />
                  Permissions
                </TabsTrigger>
                <TabsTrigger value="defaults" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Hardcoded Defaults
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="system" className="mt-0">
              {rolesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderRoleTable(systemRoles, true)
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-0">
              {rolesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderRoleTable(customRoles, false)
              )}
            </TabsContent>

            <TabsContent value="permissions" className="mt-0 p-4">
              {permissionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  {permissionsData?.grouped && Object.entries(permissionsData.grouped).sort().map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        {category}
                        <Badge variant="outline" className="text-xs">{perms.length}</Badge>
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">S.No</TableHead>
                            <TableHead>Permission</TableHead>
                            <TableHead>Display Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {perms.map((perm, idx) => (
                            <TableRow key={perm.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell className="font-mono text-sm">{perm.name}</TableCell>
                              <TableCell>{perm.displayName}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {perm.description || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={perm.isSystem ? "secondary" : "outline"}>
                                  {perm.isSystem ? "System" : "Custom"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                  {!permissionsData?.permissions.length && (
                    <div className="text-center py-8 text-muted-foreground">
                      No permissions found. Click "Seed Defaults" to create system permissions.
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="defaults" className="mt-0 p-4">
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Hardcoded Default Permissions</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    These are the default role permissions defined in the codebase. They are used as a fallback when database permissions are not available.
                    Click "Seed Defaults" above to copy these to the database for customization.
                  </p>
                </div>

                {Object.entries(ROLE_PERMISSIONS).map(([roleName, permissions]) => (
                  <div key={roleName} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        {roleName}
                      </h4>
                      <Badge variant="secondary">{permissions.length} permissions</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {permissions.map((perm) => (
                        <div
                          key={perm}
                          className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1"
                        >
                          <Check className="h-3 w-3 text-green-600" />
                          <span className="font-mono text-xs">{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="border-t pt-6 mt-6">
                  <h4 className="font-semibold mb-4">All Available Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { category: "General", permissions: ["view:dashboard"] },
                      { category: "Tickets", permissions: ["view:tickets", "create:tickets", "edit:tickets", "delete:tickets", "view:all_tickets", "view:department_tickets", "view:assigned_tickets", "view:team_tickets"] },
                      { category: "Users", permissions: ["view:users", "create:users", "edit:users", "delete:users", "view:department_users"] },
                      { category: "Vendors", permissions: ["view:vendors", "create:vendors", "edit:vendors", "delete:vendors"] },
                      { category: "Analytics", permissions: ["view:analytics"] },
                      { category: "Settings", permissions: ["view:config", "edit:config", "view:roles", "create:roles", "edit:roles", "delete:roles"] },
                    ].map(({ category, permissions }) => (
                      <div key={category} className="border rounded-lg p-3">
                        <h5 className="font-medium text-sm mb-2 text-muted-foreground">{category}</h5>
                        <div className="space-y-1">
                          {permissions.map((perm) => (
                            <div key={perm} className="font-mono text-xs bg-muted/30 rounded px-2 py-1">
                              {perm}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>

      {/* Create/Edit Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole
                ? editingRole.isSystem
                  ? `Edit ${editingRole.displayName} Permissions`
                  : `Edit Role: ${editingRole.displayName}`
                : "Create Custom Role"}
            </DialogTitle>
            <DialogDescription>
              {editingRole?.isSystem
                ? "System role names cannot be changed, but you can modify their permissions."
                : "Define a new role with specific permissions."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Role details (hidden for system roles) */}
            {!editingRole?.isSystem && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Role Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., CX_Supervisor"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name *</Label>
                    <Input
                      id="displayName"
                      placeholder="e.g., CX Supervisor"
                      value={roleForm.displayName}
                      onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this role is for..."
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  />
                </div>
              </>
            )}

            {/* Permissions grid */}
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                {renderPermissionsGrid()}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {selectedPermissions.size} permissions
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={
                saveMutation.isPending ||
                updatePermissionsMutation.isPending ||
                (!editingRole?.isSystem && (!roleForm.name || !roleForm.displayName))
              }
            >
              {(saveMutation.isPending || updatePermissionsMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingRole ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit System Role Permissions Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editingRole?.displayName} Permissions
            </DialogTitle>
            <DialogDescription>
              Modify the permissions for this system role. The role name cannot be changed.
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
            {renderPermissionsGrid()}
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: {selectedPermissions.size} permissions
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending}
            >
              {updatePermissionsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{deleteConfirm?.displayName}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
