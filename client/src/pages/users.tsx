import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { User } from "@shared/schema";

const ROLES = ["Owner", "Admin", "Seller Support Agent", "Department Head", "Department Manager", "Department Agent"] as const;
const DEPARTMENTS = ["Finance", "Operations", "Marketplace", "Tech", "Experience", "CX", "Seller Support"] as const;

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
  department?: string;
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

export default function UsersPage() {
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    department: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormData({ name: "", email: "", password: "", role: "", department: "" });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setError("Please fill in all required fields");
      return;
    }

    mutation.mutate({
      ...formData,
      department: formData.department || undefined,
    });
  };

  const roleColors: Record<string, string> = {
    Owner: "bg-red-500/10 text-red-600 border-red-500/20",
    Admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "Seller Support Agent": "bg-green-500/10 text-green-600 border-green-500/20",
    "Department Head": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Department Manager": "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "Department Agent": "bg-slate-500/10 text-slate-600 border-slate-500/20",
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
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select role" />
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
              {users.map((user) => (
                <Card key={user.id} className="p-5" data-testid={`card-user-${user.id}`}>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("border", roleColors[user.role])} variant="outline">
                        {user.role}
                      </Badge>
                      {user.department && (
                        <Badge variant="secondary">{user.department}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{user.isActive ? "Active" : "Inactive"}</span>
                      <span>Created {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              ))}
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
      </main>
    </div>
  );
}
