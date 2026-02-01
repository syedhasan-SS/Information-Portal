import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[]; // Multiple permissions with OR logic (any one grants access)
  requiredRoles?: string[];
};

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRoles
}: ProtectedRouteProps) {
  const { user, isLoading, hasPermission, hasRole } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    console.log("ProtectedRoute check:", { isLoading, user, userEmail: localStorage.getItem("userEmail") });
    if (!isLoading && !user) {
      // Not authenticated, redirect to login
      console.log("Not authenticated, redirecting to login");
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Check permission if required (single permission)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to access this page.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your role: <span className="font-medium">{user.role}</span>
          </p>
        </div>
        <button
          onClick={() => setLocation("/dashboard")}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Check multiple permissions with OR logic (any one grants access)
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAnyPermission = requiredPermissions.some(perm => hasPermission(perm));
    if (!hasAnyPermission) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="mt-2 text-muted-foreground">
              You don't have permission to access this page.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your role: <span className="font-medium">{user.role}</span>
            </p>
          </div>
          <button
            onClick={() => setLocation("/dashboard")}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
          >
            Go to Dashboard
          </button>
        </div>
      );
    }
  }

  // Check roles if required
  if (requiredRoles && !hasRole(requiredRoles)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">
            Your role doesn't have access to this page.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your role: <span className="font-medium">{user.role}</span>
          </p>
        </div>
        <button
          onClick={() => setLocation("/dashboard")}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Authorized
  return <>{children}</>;
}
