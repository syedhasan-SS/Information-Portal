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
  FileText,
  Info,
  TrendingDown,
  Minus,
  UserCog,
  Lock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Ticket as TicketType, User as UserType } from "@shared/schema";

async function getTickets(): Promise<TicketType[]> {
  const userEmail = localStorage.getItem("userEmail");
  const res = await fetch("/api/tickets", {
    headers: {
      ...(userEmail ? { "x-user-email": userEmail } : {}),
    },
  });
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

  // IMPORTANT: Backend already filters tickets by department
  // The API endpoint /api/tickets returns pre-filtered tickets based on user's department
  // We trust the backend filtering and just display what we receive
  const tickets = allTickets;

    // Agent/Associate level: see only assigned tickets or their specific department/sub-department tickets
    if (["Agent", "Associate"].includes(user.role)) {
      const isAssigned = ticket.assigneeId === user.id;

      // For CX agents - MUST have sub-department specified
      if (user.department === "CX") {
        if (!user.subDepartment) {
          // CX users without sub-department - only see assigned tickets
          return isAssigned;
        }
        // Filter based on category departmentType
        const categoryDepartmentType = ticket.categorySnapshot?.departmentType;

        // Seller Support agents see assigned tickets OR Seller Support tickets (based on category)
        if (user.subDepartment === "Seller Support") {
          return isAssigned || categoryDepartmentType === "Seller Support" || categoryDepartmentType === "All";
        }
        // Customer Support agents see assigned tickets OR Customer Support tickets (based on category)
        if (user.subDepartment === "Customer Support") {
          return isAssigned || categoryDepartmentType === "Customer Support" || categoryDepartmentType === "All";
        }
        // Other CX sub-departments: only assigned tickets
        return isAssigned;
      }

      // All other agents: see assigned or their department tickets
      if (user.department) {
        return isAssigned || ticket.department === user.department;
      }

      return isAssigned;
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

  // Date ranges for calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const twoMonthsAgo = new Date(today);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  // Ticket counts by time period
  const ticketsToday = tickets?.filter((t) => new Date(t.createdAt) >= today).length || 0;
  const ticketsThisWeek = tickets?.filter((t) => new Date(t.createdAt) >= weekAgo).length || 0;
  const ticketsLastWeek = tickets?.filter((t) => {
    const created = new Date(t.createdAt);
    return created >= twoWeeksAgo && created < weekAgo;
  }).length || 0;

  const ticketsThisMonth = tickets?.filter((t) => new Date(t.createdAt) >= monthAgo).length || 0;
  const ticketsLastMonth = tickets?.filter((t) => {
    const created = new Date(t.createdAt);
    return created >= twoMonthsAgo && created < monthAgo;
  }).length || 0;

  // Pending (open) tickets - across all time
  const openTickets = tickets?.filter((t) => ["New", "Open", "Pending"].includes(t.status)).length || 0;

  // Resolution Rate - based on current month tickets only
  const ticketsThisMonthList = tickets?.filter((t) => new Date(t.createdAt) >= monthAgo) || [];
  const solvedThisMonth = ticketsThisMonthList.filter((t) => ["Solved", "Closed"].includes(t.status)).length;
  const resolutionRate = ticketsThisMonth > 0 ? Math.round((solvedThisMonth / ticketsThisMonth) * 100) : 0;

  // Resolution Rate for last month (for comparison)
  const ticketsLastMonthList = tickets?.filter((t) => {
    const created = new Date(t.createdAt);
    return created >= twoMonthsAgo && created < monthAgo;
  }) || [];
  const solvedLastMonth = ticketsLastMonthList.filter((t) => ["Solved", "Closed"].includes(t.status)).length;
  const resolutionRateLastMonth = ticketsLastMonth.length > 0 ? Math.round((solvedLastMonth / ticketsLastMonth.length) * 100) : 0;

  // SLA Compliance - based on current month tickets only
  const onTrackThisMonth = ticketsThisMonthList.filter((t) => t.slaStatus === "on_track").length;
  const atRiskThisMonth = ticketsThisMonthList.filter((t) => t.slaStatus === "at_risk").length;
  const breachedThisMonth = ticketsThisMonthList.filter((t) => t.slaStatus === "breached").length;
  const slaCompliance = ticketsThisMonth > 0
    ? Math.round(((onTrackThisMonth + atRiskThisMonth * 0.5) / ticketsThisMonth) * 100)
    : 100;

  // SLA Compliance for last month (for comparison)
  const onTrackLastMonth = ticketsLastMonthList.filter((t) => t.slaStatus === "on_track").length;
  const atRiskLastMonth = ticketsLastMonthList.filter((t) => t.slaStatus === "at_risk").length;
  const slaComplianceLastMonth = ticketsLastMonth.length > 0
    ? Math.round(((onTrackLastMonth + atRiskLastMonth * 0.5) / ticketsLastMonth.length) * 100)
    : 100;

  // Priority Breakdown - PENDING TICKETS ONLY
  const pendingTickets = tickets?.filter((t) => ["New", "Open", "Pending"].includes(t.status)) || [];
  const priorityBreakdown = {
    Critical: pendingTickets.filter((t) => t.priorityTier === "Critical").length,
    High: pendingTickets.filter((t) => t.priorityTier === "High").length,
    Medium: pendingTickets.filter((t) => t.priorityTier === "Medium").length,
    Low: pendingTickets.filter((t) => t.priorityTier === "Low").length,
  };

  // Department Breakdown - PENDING TICKETS ONLY
  const departmentBreakdown = pendingTickets.reduce((acc, t) => {
    acc[t.department] = (acc[t.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // SLA Status Breakdown - PENDING TICKETS ONLY
  const slaStatusBreakdown = {
    onTrack: pendingTickets.filter((t) => t.slaStatus === "on_track").length,
    atRisk: pendingTickets.filter((t) => t.slaStatus === "at_risk").length,
    breached: pendingTickets.filter((t) => t.slaStatus === "breached").length,
  };

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
                <NavButton onClick={() => setLocation("/attendance")} icon={Clock} label="Attendance" />
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
                      {/* Page Permissions - Owner/Admin only */}
                      {["Owner", "Admin"].includes(user?.role || "") && (
                        <>
                          <DropdownMenuItem onClick={() => setLocation("/admin/page-permissions")}>
                            <Lock className="mr-2 h-4 w-4" />
                            Page Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation("/admin/user-permissions")}>
                            <UserCog className="mr-2 h-4 w-4" />
                            User Permissions
                          </DropdownMenuItem>
                        </>
                      )}
                      {/* Product Requests - accessible to Lead and above */}
                      {["Owner", "Admin", "Head", "Manager", "Lead"].includes(user?.role || "") ||
                        user?.roles?.some((r) => ["Owner", "Admin", "Head", "Manager", "Lead"].includes(r)) ? (
                        <DropdownMenuItem onClick={() => setLocation("/product-requests")}>
                          <FileText className="mr-2 h-4 w-4" />
                          Product Requests
                        </DropdownMenuItem>
                      ) : null}
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
                value={ticketsThisWeek.toString()}
                subtitle={`This month: ${ticketsThisMonth} tickets`}
                icon={Ticket}
                helpText="Total tickets created this week. Monthly context shows tickets created in the last 30 days."
                comparison={{
                  value: ticketsLastWeek > 0 ? Math.round(((ticketsThisWeek - ticketsLastWeek) / ticketsLastWeek) * 100) : 0,
                  label: "vs last week"
                }}
              />
              <KPICard
                title="Resolution Rate"
                value={`${resolutionRate}%`}
                subtitle={`${solvedThisMonth} resolved of ${ticketsThisMonth} (This Month)`}
                icon={CheckCircle2}
                color="success"
                helpText="Percentage of tickets created this month that have been resolved (Solved or Closed status)."
                comparison={{
                  value: resolutionRateLastMonth > 0 ? resolutionRate - resolutionRateLastMonth : 0,
                  label: "vs last month"
                }}
              />
              <KPICard
                title="Open Tickets"
                value={openTickets.toString()}
                subtitle="New + Open + Pending"
                icon={Clock}
                helpText="Total pending tickets across all time periods (New, Open, and Pending statuses)."
              />
              <KPICard
                title="SLA Compliance"
                value={`${slaCompliance}%`}
                subtitle={`${breachedThisMonth} breached (This Month)`}
                icon={AlertTriangle}
                color={slaCompliance >= 90 ? "success" : slaCompliance >= 70 ? "warning" : "danger"}
                helpText="Percentage of tickets meeting SLA targets. Based on tickets created this month only."
                comparison={{
                  value: slaComplianceLastMonth > 0 ? slaCompliance - slaComplianceLastMonth : 0,
                  label: "vs last month"
                }}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Pending Tickets by Priority
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Shows only pending tickets (New, Open, Pending status). Excludes Solved and Closed tickets.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="space-y-3">
                  {Object.entries(priorityBreakdown).map(([priority, count]) => (
                    <PriorityBar key={priority} priority={priority} count={count} total={openTickets} />
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Pending Tickets by SLA
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Shows SLA status for pending tickets only (New, Open, Pending). Excludes Solved and Closed tickets.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">On Track</span>
                    </div>
                    <span className="font-semibold text-green-600">{slaStatusBreakdown.onTrack}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <span className="text-sm">At Risk</span>
                    </div>
                    <span className="font-semibold text-amber-600">{slaStatusBreakdown.atRisk}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm">Breached</span>
                    </div>
                    <span className="font-semibold text-red-600">{slaStatusBreakdown.breached}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Pending Tickets by Department
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Shows only pending tickets (New, Open, Pending status) grouped by department. Excludes Solved and Closed tickets.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
  helpText,
  comparison,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color?: "default" | "success" | "warning" | "danger";
  helpText?: string;
  comparison?: {
    value: number;
    label: string;
  };
}) {
  const getTrendIcon = () => {
    if (!comparison) return null;
    if (comparison.value > 0) return <TrendingUp className="h-3 w-3" />;
    if (comparison.value < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!comparison) return "";
    if (comparison.value > 0) return "text-green-600";
    if (comparison.value < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {helpText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{helpText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={cn(
            "text-3xl font-semibold tracking-tight",
            color === "success" && "text-green-600",
            color === "warning" && "text-amber-600",
            color === "danger" && "text-red-600"
          )}>{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {comparison && (
            <div className={cn("flex items-center gap-1 text-xs font-medium mt-2", getTrendColor())}>
              {getTrendIcon()}
              <span>{comparison.value > 0 ? "+" : ""}{comparison.value}%</span>
              <span className="text-muted-foreground font-normal">{comparison.label}</span>
            </div>
          )}
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
