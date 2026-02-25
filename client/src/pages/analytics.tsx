import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  X,
  Download,
  Ticket,
  ShieldAlert,
  Activity,
  Users,
  Zap,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import {
  AreaChart,
  Area,
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
import type { Ticket as TicketType } from "@shared/schema";

const TIME_GROUPINGS = ["Daily", "Weekly", "Monthly"] as const;
const ISSUE_TYPES = ["All", "Complaint", "Request"] as const;

const CHART_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#ef4444", "#06b6d4", "#84cc16"];

const STATUS_COLORS: Record<string, string> = {
  New: "#8b5cf6",
  Open: "#3b82f6",
  Pending: "#f59e0b",
  Solved: "#10b981",
  Closed: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: "#ef4444",
  P1: "#f97316",
  P2: "#f59e0b",
  P3: "#10b981",
};

async function getTickets(): Promise<TicketType[]> {
  const userEmail = localStorage.getItem("userEmail");
  const res = await fetch("/api/tickets", {
    headers: { ...(userEmail ? { "x-user-email": userEmail } : {}) },
  });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

async function getUsers() {
  const userEmail = localStorage.getItem("userEmail");
  const res = await fetch("/api/users", {
    headers: { ...(userEmail ? { "x-user-email": userEmail } : {}) },
  });
  if (!res.ok) return [];
  return res.json();
}

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Stat card component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? "text-green-600" : "text-red-500"}`}>
          {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.label}
        </div>
      )}
    </Card>
  );
}

// Progress bar row
function ProgressRow({
  label,
  value,
  total,
  color,
  extra,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  extra?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
          <span className="font-semibold">{value}</span>
          <span className="text-xs text-muted-foreground">({pct}%)</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function exportToCSV(tickets: TicketType[]) {
  const headers = ["Ticket #", "Subject", "Status", "Priority", "Department", "Issue Type", "Assignee", "SLA Status", "Created At", "Resolved At"];
  const rows = tickets.map((t) => [
    t.ticketNumber || "",
    (t.subject || "").replace(/,/g, ";"),
    t.status || "",
    t.priorityBadge || "",
    t.department || "",
    t.issueType || "",
    t.assigneeId || "",
    t.slaStatus || "",
    t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd HH:mm") : "",
    t.resolvedAt ? format(new Date(t.resolvedAt), "yyyy-MM-dd HH:mm") : "",
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tickets-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [, setLocation] = useLocation();
  const [timeGrouping, setTimeGrouping] = useState<string>("Daily");
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("All");
  const [datePreset, setDatePreset] = useState<string>("last30");
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>();
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  // Compute date range from preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (datePreset) {
      case "today": return { start: today, end: now };
      case "yesterday": {
        const y = subDays(today, 1);
        return { start: y, end: new Date(y.getTime() + 86400000 - 1) };
      }
      case "last7": return { start: subDays(today, 7), end: now };
      case "last15": return { start: subDays(today, 15), end: now };
      case "last30": return { start: subDays(today, 30), end: now };
      case "last90": return { start: subDays(today, 90), end: now };
      case "previousWeek": {
        const start = startOfWeek(subDays(today, 7));
        const end = endOfWeek(subDays(today, 7));
        return { start, end };
      }
      case "custom": return { start: customDateStart, end: customDateEnd };
      default: return { start: undefined, end: undefined };
    }
  }, [datePreset, customDateStart, customDateEnd]);

  // Filter tickets
  const filtered = useMemo(() => {
    let result = tickets;
    if (issueTypeFilter !== "All") result = result.filter((t) => t.issueType === issueTypeFilter);
    if (dateRange.start && dateRange.end) {
      result = result.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= dateRange.start! && d <= dateRange.end!;
      });
    }
    return result;
  }, [tickets, issueTypeFilter, dateRange]);

  // ── Metrics ──────────────────────────────────────────────────────────────
  const totalTickets = filtered.length;
  const openTickets = filtered.filter((t) => t.status === "New" || t.status === "Open").length;
  const pendingTickets = filtered.filter((t) => t.status === "Pending").length;
  const solvedTickets = filtered.filter((t) => t.status === "Solved" || t.status === "Closed").length;
  const breachedTickets = filtered.filter((t) => t.slaStatus === "breached").length;
  const atRiskTickets = filtered.filter((t) => t.slaStatus === "at_risk").length;
  const resolutionRate = totalTickets > 0 ? Math.round((solvedTickets / totalTickets) * 100) : 0;

  // ── Timeline ─────────────────────────────────────────────────────────────
  const timelineData = useMemo(() => {
    const map = new Map<string, { created: number; solved: number }>();
    filtered.forEach((t) => {
      const d = new Date(t.createdAt);
      let key: string;
      if (timeGrouping === "Daily") key = format(d, "MMM d");
      else if (timeGrouping === "Weekly") key = `W${format(startOfWeek(d), "MM/dd")}`;
      else key = format(d, "MMM yyyy");
      const cur = map.get(key) || { created: 0, solved: 0 };
      cur.created++;
      if (t.status === "Solved" || t.status === "Closed") cur.solved++;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, timeGrouping]);

  // ── Status breakdown ─────────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => {
      const s = t.status || "Unknown";
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [filtered]);

  // ── Department breakdown ─────────────────────────────────────────────────
  const departmentData = useMemo(() => {
    const map = new Map<string, { total: number; open: number; pending: number; solved: number; breached: number }>();
    filtered.forEach((t) => {
      const dept = t.department || "Unassigned";
      const cur = map.get(dept) || { total: 0, open: 0, pending: 0, solved: 0, breached: 0 };
      cur.total++;
      if (t.status === "New" || t.status === "Open") cur.open++;
      else if (t.status === "Pending") cur.pending++;
      else if (t.status === "Solved" || t.status === "Closed") cur.solved++;
      if (t.slaStatus === "breached") cur.breached++;
      map.set(dept, cur);
    });
    return Array.from(map.entries())
      .map(([department, v]) => ({ department, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // ── Priority breakdown ───────────────────────────────────────────────────
  const priorityData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => {
      const p = t.priorityBadge || "P3";
      map.set(p, (map.get(p) || 0) + 1);
    });
    return ["P0", "P1", "P2", "P3"]
      .filter((p) => map.has(p))
      .map((p) => ({ priority: p, count: map.get(p) || 0 }));
  }, [filtered]);

  // ── Issue type breakdown ─────────────────────────────────────────────────
  const issueTypeData = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => {
      const it = t.issueType || "Unclassified";
      map.set(it, (map.get(it) || 0) + 1);
    });
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }, [filtered]);

  // ── Agent leaderboard ────────────────────────────────────────────────────
  const agentData = useMemo(() => {
    const map = new Map<string, { total: number; solved: number; breached: number }>();
    filtered.forEach((t) => {
      if (!t.assigneeId) return;
      const cur = map.get(t.assigneeId) || { total: 0, solved: 0, breached: 0 };
      cur.total++;
      if (t.status === "Solved" || t.status === "Closed") cur.solved++;
      if (t.slaStatus === "breached") cur.breached++;
      map.set(t.assigneeId, cur);
    });
    const userMap = new Map((users as any[]).map((u: any) => [u.id, u.name || u.email]));
    return Array.from(map.entries())
      .map(([id, v]) => ({
        name: (userMap.get(id) as string) || "Unknown",
        ...v,
        rate: v.total > 0 ? Math.round((v.solved / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filtered, users]);

  // ── SLA Summary ──────────────────────────────────────────────────────────
  const slaData = useMemo(() => {
    const onTrack = filtered.filter((t) => t.slaStatus === "on_track").length;
    const atRisk = filtered.filter((t) => t.slaStatus === "at_risk").length;
    const breached = filtered.filter((t) => t.slaStatus === "breached").length;
    const unknown = filtered.filter((t) => !t.slaStatus).length;
    return [
      { name: "On Track", value: onTrack, color: "#10b981" },
      { name: "At Risk", value: atRisk, color: "#f59e0b" },
      { name: "Breached", value: breached, color: "#ef4444" },
      { name: "No SLA", value: unknown, color: "#9ca3af" },
    ].filter((d) => d.value > 0);
  }, [filtered]);

  const PRESETS = [
    { key: "all", label: "All Time" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last7", label: "Last 7d" },
    { key: "last15", label: "Last 15d" },
    { key: "last30", label: "Last 30d" },
    { key: "last90", label: "Last 90d" },
    { key: "previousWeek", label: "Prev. Week" },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                  <BarChart3 className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight">Analytics & Reporting</h1>
                  <p className="text-xs text-muted-foreground">
                    {totalTickets} tickets · {datePreset === "all" ? "All time" : PRESETS.find(p => p.key === datePreset)?.label}
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered)}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">

        {/* ── Filter Bar ── */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Date Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date Range</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <Button
                    key={p.key}
                    size="sm"
                    variant={datePreset === p.key ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => setDatePreset(p.key)}
                  >
                    {p.label}
                  </Button>
                ))}
                <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant={datePreset === "custom" ? "default" : "outline"}
                      className="h-8 text-xs"
                    >
                      <Calendar className="mr-1.5 h-3 w-3" />
                      Custom
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="flex gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Start Date</Label>
                        <CalendarComponent
                          mode="single"
                          selected={customDateStart}
                          onSelect={setCustomDateStart}
                          disabled={(d) => d > new Date()}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">End Date</Label>
                        <CalendarComponent
                          mode="single"
                          selected={customDateEnd}
                          onSelect={setCustomDateEnd}
                          disabled={(d) => d > new Date() || (!!customDateStart && d < customDateStart)}
                        />
                      </div>
                    </div>
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      disabled={!customDateStart || !customDateEnd}
                      onClick={() => { setDatePreset("custom"); setShowCustomPicker(false); }}
                    >
                      Apply
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="ml-auto flex items-end gap-3">
              {/* Issue Type */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Issue Type</Label>
                <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Time Grouping */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Grouping</Label>
                <Select value={timeGrouping} onValueChange={setTimeGrouping}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_GROUPINGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Clear custom */}
              {(issueTypeFilter !== "All" || datePreset !== "last30") && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setIssueTypeFilter("All"); setDatePreset("last30"); }}>
                  <X className="mr-1 h-3 w-3" /> Reset
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* ── KPI Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Total Tickets" value={totalTickets} icon={Ticket} color="bg-blue-500/10 text-blue-600" subtitle={`${resolutionRate}% resolved`} />
          <StatCard title="Open / New" value={openTickets} icon={Activity} color="bg-purple-500/10 text-purple-600" subtitle="Needs attention" />
          <StatCard title="Pending" value={pendingTickets} icon={Clock} color="bg-amber-500/10 text-amber-600" subtitle="Awaiting response" />
          <StatCard title="Solved" value={solvedTickets} icon={CheckCircle2} color="bg-green-500/10 text-green-600" subtitle={`${resolutionRate}% rate`} />
          <StatCard title="SLA Breached" value={breachedTickets} icon={ShieldAlert} color="bg-red-500/10 text-red-600" subtitle={atRiskTickets > 0 ? `+${atRiskTickets} at risk` : "No tickets at risk"} />
        </div>

        {/* ── Timeline (full width) ── */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Ticket Volume Over Time</h2>
              <p className="text-xs text-muted-foreground">Created vs Resolved — {timeGrouping}</p>
            </div>
            <Badge variant="outline" className="text-xs">{timelineData.length} periods</Badge>
          </div>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timelineData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="created" name="Created" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradCreated)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="solved" name="Solved" stroke="#10b981" strokeWidth={2} fill="url(#gradSolved)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No data for selected range</div>
          )}
        </Card>

        {/* ── Row 2: Status + SLA ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Distribution */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold">Status Breakdown</h2>
            <div className="space-y-3">
              {statusData
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <ProgressRow
                    key={s.status}
                    label={s.status}
                    value={s.count}
                    total={totalTickets}
                    color={STATUS_COLORS[s.status] || "#6b7280"}
                  />
                ))}
            </div>
          </Card>

          {/* SLA Summary */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold">SLA Compliance</h2>
            {slaData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={slaData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {slaData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {slaData.map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-sm">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 text-muted-foreground">{s.name}</span>
                      <span className="font-semibold">{s.value}</span>
                      <span className="text-xs text-muted-foreground">
                        ({totalTickets > 0 ? Math.round((s.value / totalTickets) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No SLA data available</div>
            )}
          </Card>
        </div>

        {/* ── Row 3: Department + Priority ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Department Breakdown */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold">Department Breakdown</h2>
            {departmentData.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground mb-2 px-1">
                  <span className="col-span-2">Department</span>
                  <span className="text-center">Open</span>
                  <span className="text-center">Pending</span>
                  <span className="text-center">Solved</span>
                </div>
                {departmentData.map((d) => (
                  <div key={d.department} className="space-y-1.5">
                    <div className="grid grid-cols-5 items-center gap-2 px-1 text-sm">
                      <span className="col-span-2 font-medium truncate">{d.department}</span>
                      <span className="text-center font-medium text-purple-600">{d.open}</span>
                      <span className="text-center font-medium text-amber-600">{d.pending}</span>
                      <span className="text-center font-medium text-green-600">{d.solved}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="flex h-full">
                        <div className="bg-purple-500 transition-all" style={{ width: `${totalTickets > 0 ? (d.open / totalTickets) * 100 : 0}%` }} />
                        <div className="bg-amber-500 transition-all" style={{ width: `${totalTickets > 0 ? (d.pending / totalTickets) * 100 : 0}%` }} />
                        <div className="bg-green-500 transition-all" style={{ width: `${totalTickets > 0 ? (d.solved / totalTickets) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No data</div>
            )}
          </Card>

          {/* Priority Distribution */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold">Priority Distribution</h2>
            {priorityData.length > 0 ? (
              <div className="space-y-3">
                {priorityData.map((p) => (
                  <ProgressRow
                    key={p.priority}
                    label={p.priority}
                    value={p.count}
                    total={totalTickets}
                    color={PRIORITY_COLORS[p.priority] || "#6b7280"}
                  />
                ))}
                <div className="mt-4 pt-4 border-t border-border">
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={priorityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="priority" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
                        {priorityData.map((entry, i) => (
                          <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || "#6b7280"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No priority data</div>
            )}
          </Card>
        </div>

        {/* ── Row 4: Issue Type + Agent Table ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Issue Type Distribution */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold">Issue Type Distribution</h2>
            {issueTypeData.length > 0 ? (
              <div className="space-y-3">
                {issueTypeData.sort((a, b) => b.count - a.count).map((it, i) => (
                  <ProgressRow
                    key={it.type}
                    label={it.type}
                    value={it.count}
                    total={totalTickets}
                    color={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No data</div>
            )}
          </Card>

          {/* Agent Leaderboard */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Agent Performance</h2>
            </div>
            {agentData.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground mb-1 px-1">
                  <span className="col-span-2">Agent</span>
                  <span className="text-center">Total</span>
                  <span className="text-center">Resolved %</span>
                </div>
                {agentData.map((a, i) => (
                  <div key={a.name} className="grid grid-cols-4 items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/50 transition-colors">
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">{i + 1}</span>
                      <span className="truncate text-sm font-medium">{a.name}</span>
                    </div>
                    <span className="text-center text-sm font-semibold">{a.total}</span>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-sm font-semibold ${a.rate >= 70 ? "text-green-600" : a.rate >= 40 ? "text-amber-600" : "text-red-500"}`}>
                        {a.rate}%
                      </span>
                      {a.breached > 0 && (
                        <Badge variant="destructive" className="h-4 px-1 text-[10px]">{a.breached} SLA</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                <div className="text-center">
                  <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  No assigned tickets in range
                </div>
              </div>
            )}
          </Card>
        </div>

      </main>
    </div>
  );
}
