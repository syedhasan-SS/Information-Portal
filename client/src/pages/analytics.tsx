import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Ticket } from "@shared/schema";

const TIME_GROUPINGS = ["Daily", "Weekly", "Monthly"] as const;
const ISSUE_TYPES = ["All", "Complaint", "Request"] as const;

interface AnalyticsData {
  totalTickets: number;
  totalPending: number;
  totalSolved: number;
  totalNew: number;
  regionWiseStatus: Record<string, { open: number; closed: number; pending: number }>;
  timelineData: Array<{ date: string; count: number }>;
  slaData: { inSLA: number; outOfSLA: number };
  departmentData: Array<{ department: string; count: number; percentage: number }>;
  departmentSLA: Array<{ department: string; compliance: number }>;
  categoryData: Array<{ category: string; count: number; percentage: number }>;
}

async function getTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/tickets");
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

async function getTicketAnalytics() {
  const res = await fetch("/api/analytics/ticket-counts");
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

function processAnalyticsData(
  tickets: Ticket[],
  timeGrouping: string,
  issueType: string,
  startDate?: Date,
  endDate?: Date
): AnalyticsData {
  let filtered = tickets;

  // Filter by issue type
  if (issueType !== "All") {
    filtered = filtered.filter((t) => t.issueType === issueType);
  }

  // Filter by date range
  if (startDate && endDate) {
    filtered = filtered.filter((t) => {
      const ticketDate = new Date(t.createdAt);
      return ticketDate >= startDate && ticketDate <= endDate;
    });
  }

  // Calculate metrics
  const totalTickets = filtered.length;
  const totalPending = filtered.filter((t) => t.status === "Pending").length;
  const totalSolved = filtered.filter((t) => t.status === "Solved").length;
  const totalNew = filtered.filter((t) => t.status === "New").length;

  // Department-wise status (replacing region-wise as tickets don't have region directly)
  const regionWiseStatus: Record<string, { open: number; closed: number; pending: number }> = {};
  filtered.forEach((ticket) => {
    const dept = ticket.department || "Unassigned";
    if (!regionWiseStatus[dept]) {
      regionWiseStatus[dept] = { open: 0, closed: 0, pending: 0 };
    }
    if (ticket.status === "New" || ticket.status === "Open") {
      regionWiseStatus[dept].open++;
    } else if (ticket.status === "Solved" || ticket.status === "Closed") {
      regionWiseStatus[dept].closed++;
    } else if (ticket.status === "Pending") {
      regionWiseStatus[dept].pending++;
    }
  });

  // Timeline data (grouped by time grouping)
  const timelineMap = new Map<string, number>();
  filtered.forEach((ticket) => {
    const date = new Date(ticket.createdAt);
    let key: string;

    if (timeGrouping === "Daily") {
      key = date.toISOString().split("T")[0];
    } else if (timeGrouping === "Weekly") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    timelineMap.set(key, (timelineMap.get(key) || 0) + 1);
  });

  const timelineData = Array.from(timelineMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // SLA data (assuming tickets have an slaStatus field or we check against createdAt)
  const now = new Date();
  let inSLA = 0;
  let outOfSLA = 0;

  filtered.forEach((ticket) => {
    const createdAt = new Date(ticket.createdAt);
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Assume SLA is 24 hours for this example
    if (ticket.status === "Solved" || ticket.status === "Closed" || hoursSinceCreation <= 24) {
      inSLA++;
    } else {
      outOfSLA++;
    }
  });

  const slaData = { inSLA, outOfSLA };

  // Department-wise data
  const deptMap = new Map<string, number>();
  filtered.forEach((ticket) => {
    const dept = ticket.department || "Unassigned";
    deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
  });

  const departmentData = Array.from(deptMap.entries()).map(([department, count]) => ({
    department,
    count,
    percentage: (count / totalTickets) * 100,
  }));

  // Department SLA compliance (simplified calculation)
  const departmentSLA = Array.from(deptMap.keys()).map((department) => {
    const deptTickets = filtered.filter((t) => (t.department || "Unassigned") === department);
    const deptInSLA = deptTickets.filter((t) => {
      const createdAt = new Date(t.createdAt);
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return t.status === "Solved" || t.status === "Closed" || hoursSinceCreation <= 24;
    }).length;

    return {
      department,
      compliance: deptTickets.length > 0 ? (deptInSLA / deptTickets.length) * 100 : 0,
    };
  });

  // Issue Type data (since tickets have issueType field)
  const categoryMap = new Map<string, number>();
  filtered.forEach((ticket) => {
    const issueType = ticket.issueType || "Uncategorized";
    categoryMap.set(issueType, (categoryMap.get(issueType) || 0) + 1);
  });

  const categoryData = Array.from(categoryMap.entries()).map(([category, count]) => ({
    category,
    count,
    percentage: (count / totalTickets) * 100,
  }));

  return {
    totalTickets,
    totalPending,
    totalSolved,
    totalNew,
    regionWiseStatus,
    timelineData,
    slaData,
    departmentData,
    departmentSLA,
    categoryData,
  };
}

export default function AnalyticsPage() {
  const [, setLocation] = useLocation();
  const [timeGrouping, setTimeGrouping] = useState<string>("Daily");
  const [issueType, setIssueType] = useState<string>("All");
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  const { data: reportingAnalytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["ticket-analytics"],
    queryFn: getTicketAnalytics,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const analyticsData = tickets
    ? processAnalyticsData(tickets, timeGrouping, issueType, dateRange.start, dateRange.end)
    : null;

  const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

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
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <BarChart3 className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Analytics
                  </h1>
                  <p className="text-xs text-muted-foreground">Ticket metrics and insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Filters */}
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-lg font-semibold">Filters</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="time-grouping">Time Grouping</Label>
              <Select value={timeGrouping} onValueChange={setTimeGrouping}>
                <SelectTrigger id="time-grouping">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_GROUPINGS.map((grouping) => (
                    <SelectItem key={grouping} value={grouping}>
                      {grouping}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue-type">Issue Type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger id="issue-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Metrics Cards */}
        {analyticsData && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tickets</p>
                    <p className="mt-2 text-3xl font-bold">{analyticsData.totalTickets}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Tickets</p>
                    <p className="mt-2 text-3xl font-bold">{analyticsData.totalPending}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Solved Tickets</p>
                    <p className="mt-2 text-3xl font-bold">{analyticsData.totalSolved}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">New Tickets</p>
                    <p className="mt-2 text-3xl font-bold">{analyticsData.totalNew}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                    <AlertCircle className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Department-wise Status */}
            <Card className="mb-6 p-6">
              <h2 className="mb-4 text-lg font-semibold">Department-wise Ticket Status</h2>
              <div className="space-y-4">
                {Object.entries(analyticsData.regionWiseStatus).map(([region, stats]) => (
                  <div key={region} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{region}</span>
                      <span className="text-muted-foreground">
                        {stats.open + stats.closed + stats.pending} tickets
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-blue-500/10 p-2 text-center">
                        <p className="text-blue-600">Open: {stats.open}</p>
                      </div>
                      <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                        <p className="text-amber-600">Pending: {stats.pending}</p>
                      </div>
                      <div className="rounded-lg bg-green-500/10 p-2 text-center">
                        <p className="text-green-600">Closed: {stats.closed}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Timeline Chart */}
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Tickets Timeline</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* SLA Compliance */}
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">SLA Compliance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "In SLA", value: analyticsData.slaData.inSLA },
                        { name: "Out of SLA", value: analyticsData.slaData.outOfSLA },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* Department Distribution */}
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Department-wise Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.departmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Department SLA Compliance */}
              <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">Department SLA Compliance</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.departmentSLA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="compliance" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Issue Type Distribution */}
              <Card className="p-6 lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold">Issue Type Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.category}: ${entry.count}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Category Hierarchy Breakdowns */}
            {reportingAnalytics && (
              <>
                <h2 className="my-6 text-2xl font-semibold">Category Hierarchy Breakdown</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* L1 Categories */}
                  {reportingAnalytics.byL1 && reportingAnalytics.byL1.length > 0 && (
                    <Card className="p-6">
                      <h2 className="mb-4 text-lg font-semibold">L1 Category Distribution</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportingAnalytics.byL1}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* L2 Categories */}
                  {reportingAnalytics.byL2 && reportingAnalytics.byL2.length > 0 && (
                    <Card className="p-6">
                      <h2 className="mb-4 text-lg font-semibold">L2 Category Distribution</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportingAnalytics.byL2}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#ec4899" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* L3 Categories */}
                  {reportingAnalytics.byL3 && reportingAnalytics.byL3.length > 0 && (
                    <Card className="p-6">
                      <h2 className="mb-4 text-lg font-semibold">L3 Category Distribution</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportingAnalytics.byL3}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* L4 Categories */}
                  {reportingAnalytics.byL4 && reportingAnalytics.byL4.length > 0 && (
                    <Card className="p-6">
                      <h2 className="mb-4 text-lg font-semibold">L4 Category Distribution</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportingAnalytics.byL4}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* Priority Distribution */}
                  {reportingAnalytics.byPriority && reportingAnalytics.byPriority.length > 0 && (
                    <Card className="p-6">
                      <h2 className="mb-4 text-lg font-semibold">Priority Distribution</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={reportingAnalytics.byPriority}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.priority}: ${entry.count}`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {reportingAnalytics.byPriority.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  )}

                  {/* Status Distribution */}
                  {reportingAnalytics.byStatus && reportingAnalytics.byStatus.length > 0 && (
                    <Card className="p-6">
                      <h2 className="mb-4 text-lg font-semibold">Status Distribution</h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportingAnalytics.byStatus}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
