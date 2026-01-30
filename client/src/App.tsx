import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import AllTicketsPage from "@/pages/all-tickets";
import TicketDetailPage from "@/pages/ticket-detail";
import MyTicketsPage from "@/pages/my-tickets";
import VendorsPage from "@/pages/vendors";
import VendorProfilePage from "@/pages/vendor-profile";
import ProfilePage from "@/pages/profile";
import AnalyticsPage from "@/pages/analytics";
import TicketConfigPage from "@/pages/ticket-config";
import DepartmentTicketsPage from "@/pages/department-tickets";
import NotificationsPage from "@/pages/notifications";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute requiredPermission="view:users">
          <UsersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tickets">
        <ProtectedRoute requiredPermission="view:all_tickets">
          <AllTicketsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tickets/:id">
        <ProtectedRoute>
          <TicketDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/my-tickets">
        <ProtectedRoute>
          <MyTicketsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/department-tickets">
        <ProtectedRoute requiredPermission="view:department_tickets">
          <DepartmentTicketsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/vendors">
        <ProtectedRoute requiredPermission="view:vendors">
          <VendorsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/vendors/:handle">
        <ProtectedRoute requiredPermission="view:vendors">
          <VendorProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute>
          <NotificationsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute requiredPermission="view:analytics">
          <AnalyticsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/ticket-config">
        <ProtectedRoute requiredPermission="view:config">
          <TicketConfigPage />
        </ProtectedRoute>
      </Route>
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
