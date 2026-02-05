import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  BarChart3,
  Ticket,
  Store,
  Settings,
  TrendingUp,
  Loader2,
  ArrowRight,
  User,
  AlertCircle,
  LogOut,
  Bell,
  Network,
  Shield,
  FlaskConical,
  ChevronDown,
} from "lucide-react";
import type { Ticket as TicketType, User as UserType } from "@shared/schema";

async function getTickets(): Promise<TicketType[]> {
  const res = await fetch("/api/tickets");
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

async function getUsers(): Promise<UserType[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const res = await fetch(`/api/notifications/unread?userId=${userId}`);
  if (!res.ok) return 0;
  const notifications = await res.json();
  return notifications.length;
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, hasPermission, logout } = useAuth();

  const { data: allTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  // Filter tickets based on user role and permissions
  const tickets = allTickets?.filter((ticket) => {
    if (!user) return false;

    // Owners and Admins see all tickets
    if (hasPermission("view:all_tickets")) {
      return true;
    }

    // Seller Support (sub-department of CX) or CX users can see all tickets (they handle cross-department issues)
    if (user.subDepartment === "Seller Support" || user.department === "CX") {
      return true;
    }

    // Department-based access: Heads/Managers/Leads see their department tickets
    if (hasPermission("view:department_tickets") && user.department) {
      return ticket.department === user.department;
    }

    // Team-based access: Leads see team tickets
    if (hasPermission("view:team_tickets") && user.department) {
      return ticket.department === user.department;
    }

    // Agent/Associate level: see assigned tickets or their department tickets
    if (["Agent", "Associate"].includes(user.role) && user.department) {
      return ticket.assigneeId === user.id || ticket.department === user.department;
    }

    // Default: only show assigned tickets
    return ticket.assigneeId === user.id;
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: hasPermission("view:users"), // Only fetch if user has permission
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unreadNotifications", user?.id],
    queryFn: () => getUnreadNotificationsCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const ticketsToday = tickets?.filter((t) => new Date(t.createdAt) >= today).length || 0;
  const ticketsThisWeek = tickets?.filter((t) => new Date(t.createdAt) >= weekAgo).length || 0;
  const ticketsThisMonth = tickets?.filter((t) => new Date(t.createdAt) >= monthAgo).length || 0;

  const openTickets = tickets?.filter((t) => ["New", "Open", "Pending"].includes(t.status)).length || 0;
  const solvedTickets = tickets?.filter((t) => ["Solved", "Closed"].includes(t.status)).length || 0;
  const totalTickets = tickets?.length || 0;
  const resolutionRate = totalTickets > 0 ? Math.round((solvedTickets / totalTickets) * 100) : 0;

  const onTrackCount = tickets?.filter((t) => t.slaStatus === "on_track").length || 0;
  const atRiskCount = tickets?.filter((t) => t.slaStatus === "at_risk").length || 0;
  const breachedCount = tickets?.filter((t) => t.slaStatus === "breached").length || 0;
  const slaCompliance = totalTickets > 0 ? Math.round(((onTrackCount + atRiskCount * 0.5) / totalTickets) * 100) : 100;

  const priorityBreakdown = {
    Critical: tickets?.filter((t) => t.priorityTier === "Critical").length || 0,
    High: tickets?.filter((t) => t.priorityTier === "High").length || 0,
    Medium: tickets?.filter((t) => t.priorityTier === "Medium").length || 0,
    Low: tickets?.filter((t) => t.priorityTier === "Low").length || 0,
  };

  const departmentBreakdown = tickets?.reduce((acc, t) => {
    acc[t.department] = (acc[t.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Filter users based on current user's department for Heads/Managers
  const filteredUsers = users?.filter((u) => {
    if (!user) return false;

    // Owners/Admins see all agents
    if (hasPermission("view:users")) return true;

    // Heads/Managers see only users from their department
    if (hasPermission("view:department_tickets") && user.department) {
      return u.department === user.department;
    }

    // Agents see themselves in the pending tickets section
    if (u.id === user.id) return true;

    return false;
  });

  const agentPendingTickets = filteredUsers?.map((u) => {
    const userTickets = tickets?.filter((t) => t.assigneeId === u.id) || [];
    const pending = userTickets.filter((t) => ["New", "Open", "Pending"].includes(t.status)).length;
    const breached = userTickets.filter((t) => t.slaStatus === "breached").length;
    return { user: u, pending, breached, total: userTickets.length };
  }).filter((a) => a.total > 0).sort((a, b) => b.pending - a.pending) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/fleek-logo.png"
                alt="Fleek Logo"
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <h1 className="font-serif text-xl font-bold tracking-tight text-black">
                  FLOW
                </h1>
                <p className="text-xs text-muted-foreground">Fleek Complaint Management Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <nav className="hidden items-center gap-2 md:flex">
                {(hasPermission("view:all_tickets") || hasPermission("view:department_tickets")) && (
                  <NavButton onClick={() => setLocation("/tickets")} icon={Ticket} label="All Tickets" />
                )}
                <NavButton onClick={() => setLocation("/my-tickets")} icon={User} label="My Tickets" />
                {hasPermission("view:vendors") && (
                  <NavButton onClick={() => setLocation("/vendors")} icon={Store} label="Vendors" />
                )}
                {hasPermission("view:analytics") && (
                  <NavButton onClick={() => setLocation("/analytics")} icon={BarChart3} label="Analytics" />
                )}
                {/* Labs dropdown - contains admin/config features */}
                {(hasPermission("view:config") || hasPermission("view:users") || hasPermission("view:roles")) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        data-testid="nav-labs"
                      >
                        <FlaskConical className="h-4 w-4" />
                        Labs
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Administration</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {hasPermission("view:config") && (
                        <DropdownMenuItem onClick={() => setLocation("/ticket-config")}>
                          <Settings className="mr-2 h-4 w-4" />
                          Ticket Manager
                        </DropdownMenuItem>
                      )}
                      {hasPermission("view:users") && (
                        <DropdownMenuItem onClick={() => setLocation("/users")}>
                          <Users className="mr-2 h-4 w-4" />
                          User Management
                        </DropdownMenuItem>
                      )}
                      {hasPermission("view:roles") && (
                        <DropdownMenuItem onClick={() => setLocation("/roles")}>
                          <Shield className="mr-2 h-4 w-4" />
                          Roles Management
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => {
                  console.log("Notification bell clicked, navigating to /notifications");
                  setLocation("/notifications");
                }}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>

              {/* User Profile Dropdown */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative gap-2 px-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.profilePicture || undefined} alt={user.name} />
                        <AvatarFallback className="text-sm font-medium">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/my-tickets")}>
                      <Ticket className="mr-2 h-4 w-4" />
                      My Tickets
                    </DropdownMenuItem>
                    {(hasPermission("view:all_tickets") || hasPermission("view:department_tickets")) && (
                      <DropdownMenuItem onClick={() => setLocation("/tickets")}>
                        <Ticket className="mr-2 h-4 w-4" />
                        All Tickets
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {ticketsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-1">Dashboard</h2>
              <p className="text-muted-foreground">Overview of escalations and performance metrics</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="Total Tickets"
                value={totalTickets.toString()}
                subtitle={`${ticketsToday} today • ${ticketsThisWeek} this week`}
                icon={Ticket}
              />
              <KPICard
                title="Resolution Rate"
                value={`${resolutionRate}%`}
                subtitle={`${solvedTickets} resolved of ${totalTickets}`}
                icon={CheckCircle2}
                color="success"
              />
              <KPICard
                title="Open Tickets"
                value={openTickets.toString()}
                subtitle="New + Open + Pending"
                icon={Clock}
              />
              <KPICard
                title="SLA Compliance"
                value={`${slaCompliance}%`}
                subtitle={`${breachedCount} breached`}
                icon={AlertTriangle}
                color={slaCompliance >= 90 ? "success" : slaCompliance >= 70 ? "warning" : "danger"}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Priority Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(priorityBreakdown).map(([priority, count]) => (
                    <PriorityBar key={priority} priority={priority} count={count} total={totalTickets} />
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  SLA Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">On Track</span>
                    </div>
                    <span className="font-semibold text-green-600">{onTrackCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <span className="text-sm">At Risk</span>
                    </div>
                    <span className="font-semibold text-amber-600">{atRiskCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm">Breached</span>
                    </div>
                    <span className="font-semibold text-red-600">{breachedCount}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Tickets by Department
                </h3>
                <div className="space-y-2">
                  {Object.entries(departmentBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([dept, count]) => (
                      <div key={dept} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{dept}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Agent Pending Tickets
                </h3>
              </div>
              {agentPendingTickets.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {agentPendingTickets.slice(0, 8).map(({ user, pending, breached }) => (
                    <Card key={user.id} className="p-4" data-testid={`card-agent-${user.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.department || user.role}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">{pending}</p>
                          <p className="text-xs text-muted-foreground">pending</p>
                        </div>
                        {breached > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {breached} breached
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No agents with assigned tickets</p>
                </Card>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setLocation("/tickets")}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="button-view-all-tickets"
              >
                View All Tickets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setLocation("/vendors")} data-testid="button-manage-vendors">
                Manage Vendors
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn(
            "text-3xl font-semibold tracking-tight",
            color === "success" && "text-green-600",
            color === "warning" && "text-amber-600",
            color === "danger" && "text-red-600"
          )}>{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            color === "success" && "bg-green-500/10 text-green-600",
            color === "warning" && "bg-amber-500/10 text-amber-600",
            color === "danger" && "bg-red-500/10 text-red-600",
            color === "default" && "bg-accent/20 text-accent-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function PriorityBar({
  priority,
  count,
  total,
}: {
  priority: string;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colors: Record<string, string> = {
    Critical: "bg-red-500",
    High: "bg-orange-500",
    Medium: "bg-amber-500",
    Low: "bg-green-500",
  };
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{priority}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colors[priority])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
