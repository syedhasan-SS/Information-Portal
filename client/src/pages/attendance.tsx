import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  MapPin,
  Calendar,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  Users,
  BarChart3,
  ArrowLeft,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@shared/schema";

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userDepartment: string;
  userRole: string;
  loginTime: string;
  logoutTime?: string;
  loginLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  logoutLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  workDuration?: number;
  status: "active" | "completed" | "incomplete";
  notes?: string;
  createdAt: string;
}

interface AttendanceAnalytics {
  totalRecords: number;
  completedSessions: number;
  incompleteSessions: number;
  activeSessions: number;
  lateLogins: number;
  missingLogouts: number;
  averageDuration: number;
  byUser: Record<string, any>;
  byDepartment: Record<string, any>;
}

async function getUsers(): Promise<UserType[]> {
  const res = await fetch("/api/users", {
    credentials: 'include'
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export default function AttendancePage() {
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to last 7 days
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");

  console.log("AttendancePage: user =", user);

  // Check if user has manager-level access
  const isManager = user && ["Owner", "Admin", "Head", "Manager", "Lead"].includes(user.role);
  const canViewAllUsers = user && ["Owner", "Admin"].includes(user.role);

  // Fetch users for dropdown (managers and above)
  const { data: users } = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: isManager,
  });

  // Filter users based on access level
  const availableUsers = users?.filter(u => {
    if (canViewAllUsers) return true;
    if (user?.department && u.department === user.department) return true;
    return u.id === user?.id;
  }) || [];

  // Fetch attendance history
  const { data: historyData, isLoading: historyLoading } = useQuery<{
    records: AttendanceRecord[];
    pagination: any;
  }>({
    queryKey: [
      "attendance-history",
      selectedUserId || user?.id,
      startDate,
      endDate,
      statusFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: selectedUserId || user?.id || "",
        startDate,
        endDate,
        limit: "100",
      });

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const res = await fetch(`/api/attendance/history?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        console.error("Attendance history fetch failed:", res.status, res.statusText);
        throw new Error("Failed to fetch attendance history");
      }
      const data = await res.json();
      console.log("Attendance history data:", data);
      return data;
    },
    enabled: !!user,
  });

  // Fetch analytics (managers only)
  const { data: analytics } = useQuery<AttendanceAnalytics>({
    queryKey: ["attendance-reports", startDate, endDate, user?.department],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (user?.department && !canViewAllUsers) {
        params.append("department", user.department);
      }

      const res = await fetch(`/api/attendance/reports?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch attendance reports");
      return res.json();
    },
    enabled: isManager,
  });

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "incomplete":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Incomplete
          </Badge>
        );
      default:
        return null;
    }
  };

  const exportToCSV = () => {
    if (!historyData?.records) return;

    const headers = [
      "Name",
      "Email",
      "Department",
      "Login Time",
      "Logout Time",
      "Duration",
      "Status",
      "Has Login Location",
      "Has Logout Location",
    ];

    const rows = historyData.records.map(record => [
      record.userName,
      record.userEmail,
      record.userDepartment,
      formatTime(record.loginTime),
      record.logoutTime ? formatTime(record.logoutTime) : "N/A",
      formatDuration(record.workDuration),
      record.status,
      record.loginLocation ? "Yes" : "No",
      record.logoutLocation ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                  <Clock className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Attendance Reports
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    View and manage attendance records{isManager ? " for your team" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button
            onClick={() => setLocation("/attendance/checkin")}
            className="h-24 bg-blue-600 hover:bg-blue-700 flex-col gap-2"
          >
            <LogIn className="h-8 w-8" />
            <span className="text-lg font-semibold">Check In/Out</span>
          </Button>

          <Button
            onClick={() => setLocation("/attendance")}
            variant="outline"
            className="h-24 flex-col gap-2"
          >
            <Calendar className="h-8 w-8" />
            <span className="text-lg font-semibold">My Reports</span>
          </Button>

          {isManager && (
            <Button
              onClick={() => setLocation("/attendance/team")}
              variant="outline"
              className="h-24 flex-col gap-2"
            >
              <Users className="h-8 w-8" />
              <span className="text-lg font-semibold">Team Status</span>
            </Button>
          )}

          <Button
            onClick={() => setLocation("/leave-management")}
            variant="outline"
            className="h-24 flex-col gap-2"
          >
            <Download className="h-8 w-8" />
            <span className="text-lg font-semibold">Leave Requests</span>
          </Button>
        </div>

        {/* Analytics Cards (Managers Only) */}
        {isManager && analytics && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                  <p className="text-3xl font-semibold">{analytics.totalRecords}</p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.completedSessions} completed
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Late Logins</p>
                  <p className="text-3xl font-semibold text-amber-600">
                    {analytics.lateLogins}
                  </p>
                  <p className="text-xs text-muted-foreground">After 9:30 AM</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Missing Logouts</p>
                  <p className="text-3xl font-semibold text-red-600">
                    {analytics.missingLogouts}
                  </p>
                  <p className="text-xs text-muted-foreground">Incomplete sessions</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                  <p className="text-3xl font-semibold text-green-600">
                    {analytics.averageDuration.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground">Per session</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {isManager && (
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUserId || "all"} onValueChange={(val) => setSelectedUserId(val === "all" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="w-full"
                disabled={!historyData?.records?.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Attendance History Table */}
        <Card>
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Attendance History</h2>
            <p className="text-sm text-muted-foreground">
              {historyData?.records.length || 0} records found
            </p>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : historyData?.records.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>Logout Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.userName}</p>
                          <p className="text-xs text-muted-foreground">{record.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.userDepartment}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatTime(record.loginTime)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.logoutTime ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{formatTime(record.logoutTime)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {formatDuration(record.workDuration)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {record.loginLocation && (
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              In
                            </Badge>
                          )}
                          {record.logoutLocation && (
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              Out
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No attendance records found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or date range
              </p>
            </div>
          )}
        </Card>

        {/* By User Analytics (Managers Only) */}
        {isManager && analytics && Object.keys(analytics.byUser).length > 0 && (
          <Card>
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                By User
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Total Sessions</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Late Logins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(analytics.byUser).map((userStat: any) => (
                    <TableRow key={userStat.userId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{userStat.userName}</p>
                          <p className="text-xs text-muted-foreground">{userStat.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{userStat.department}</Badge>
                      </TableCell>
                      <TableCell>{userStat.totalSessions}</TableCell>
                      <TableCell>{userStat.completedSessions}</TableCell>
                      <TableCell className="font-mono">
                        {(userStat.totalMinutes / 60).toFixed(1)}h
                      </TableCell>
                      <TableCell>
                        {userStat.lateLogins > 0 ? (
                          <Badge variant="destructive">{userStat.lateLogins}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
