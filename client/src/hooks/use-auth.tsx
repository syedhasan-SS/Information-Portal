import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

type User = {
  id: string;
  email: string;
  name: string;
  role: "Owner" | "Admin" | "Head" | "Manager" | "Lead" | "Associate" | "Agent";
  department: string | null;
  subDepartment: string | null; // Sub-department (e.g., "Seller Support" under CX)
  profilePicture: string | null;
  customPermissions: string[] | null; // Agent-level custom permissions
  isActive: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string[]) => boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define default permissions for each role
// Note: Role + Department determines actual access (e.g., Agent in Seller Support sees all Seller Support tickets)
// Custom permissions can be set per user to override these defaults
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  Owner: [
    "view:dashboard",
    "view:tickets",
    "create:tickets",
    "edit:tickets",
    "delete:tickets",
    "view:users",
    "create:users",
    "edit:users",
    "delete:users",
    "view:vendors",
    "create:vendors",
    "edit:vendors",
    "delete:vendors",
    "view:analytics",
    "view:config",
    "edit:config",
    "view:all_tickets",
  ],
  Admin: [
    "view:dashboard",
    "view:tickets",
    "create:tickets",
    "edit:tickets",
    "delete:tickets",
    "view:users",
    "create:users",
    "edit:users",
    "view:vendors",
    "create:vendors",
    "edit:vendors",
    "view:analytics",
    "view:config",
    "edit:config",
    "view:all_tickets",
  ],
  Head: [
    "view:dashboard",
    "view:tickets",
    "create:tickets",
    "edit:tickets",
    "view:users",
    "view:vendors",
    "view:analytics",
    "view:department_tickets",
    "view:department_users",
  ],
  Manager: [
    "view:dashboard",
    "view:tickets",
    "create:tickets",
    "edit:tickets",
    "view:vendors",
    "view:department_tickets",
    "view:department_users",
  ],
  Lead: [
    "view:dashboard",
    "view:tickets",
    "create:tickets",
    "edit:tickets",
    "view:vendors",
    "view:team_tickets",
  ],
  Associate: [
    "view:dashboard",
    "view:tickets",
    "create:tickets",
    "edit:tickets",
    "view:assigned_tickets",
  ],
  Agent: [
    "view:dashboard",
    "view:tickets",
    "create:tickets",
    "edit:tickets",
    "view:assigned_tickets",
    "view:department_tickets", // Agents can view all tickets within their department/sub-department
  ],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Fetch current user session
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const userEmail = localStorage.getItem("userEmail");
      console.log("Fetching current user with email:", userEmail);

      const res = await fetch("/api/auth/me", {
        headers: {
          "Content-Type": "application/json",
          ...(userEmail ? { "x-user-email": userEmail } : {}),
        },
      });

      console.log("Auth response status:", res.status);

      if (!res.ok) {
        if (res.status === 401) {
          console.log("Not authenticated");
          return null;
        }
        throw new Error("Failed to fetch user");
      }

      const userData = await res.json();
      console.log("Authenticated user:", userData);
      return userData as User;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update localStorage when user data is fetched
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("userEmail", currentUser.email);
      localStorage.setItem("userName", currentUser.name);
      localStorage.setItem("userRole", currentUser.role);
      if (currentUser.profilePicture) {
        localStorage.setItem("profilePicture", currentUser.profilePicture);
      }
    }
  }, [currentUser]);

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;

    // Check custom permissions first (agent-level overrides)
    if (currentUser.customPermissions && currentUser.customPermissions.length > 0) {
      return currentUser.customPermissions.includes(permission);
    }

    // Fall back to role-based permissions
    const permissions = ROLE_PERMISSIONS[currentUser.role] || [];
    return permissions.includes(permission);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser ?? null,
        isLoading,
        isAuthenticated: !!currentUser,
        hasPermission,
        hasRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
