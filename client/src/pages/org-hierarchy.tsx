import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Network,
  User,
  Users,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

async function getUsers(): Promise<UserType[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export default function OrgHierarchyPage() {
  const [, setLocation] = useLocation();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  // Helper function to get user by ID
  const getUserById = (id: string | null | undefined): UserType | undefined => {
    if (!id || !users) return undefined;
    return users.find(u => u.id === id);
  };

  // Helper function to get direct reports for a user
  const getDirectReports = (userId: string): UserType[] => {
    if (!users) return [];
    return users.filter(u => u.managerId === userId);
  };

  // Get top-level users (no manager)
  const topLevelUsers = users?.filter(u => !u.managerId) || [];

  // Recursive component to render user tree
  const UserNode = ({ user, level = 0 }: { user: UserType; level?: number }) => {
    const directReports = getDirectReports(user.id);
    const hasReports = directReports.length > 0;

    return (
      <div className="relative">
        <Card
          className={`p-4 mb-2 ${level > 0 ? 'ml-8' : ''} hover:bg-accent/5 transition-colors cursor-pointer`}
          onClick={() => setLocation(`/users?edit=${user.id}`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{user.name}</h3>
                  {!user.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {user.role}
                  </Badge>
                  {user.department && (
                    <span className="text-xs text-muted-foreground">
                      {user.department}{user.subDepartment ? ` - ${user.subDepartment}` : ''}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/users?edit=${user.id}`);
                }}
                className="hover:bg-primary/10"
              >
                Edit User
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Render direct reports recursively */}
        {hasReports && (
          <div className="relative">
            {/* Vertical line connecting to children */}
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
              <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Network className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Organization Hierarchy
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    View team structure and reporting relationships
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/users")}>
              <User className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Summary Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
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
              {topLevelUsers.length}
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
          ) : topLevelUsers.length > 0 ? (
            <div className="space-y-6">
              {topLevelUsers.map((user) => (
                <UserNode key={user.id} user={user} />
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
                  onClick={() => setLocation("/users")}
                >
                  Manage Users
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
