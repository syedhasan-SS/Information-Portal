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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  Download,
  Loader2,
  Calendar,
  X,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import type { Ticket as TicketType } from "@shared/schema";

// ── Constants ─────────────────────────────────────────────────────────────────

const ISSUE_TYPES_OPTS = ["Complaint", "Request", "Information"] as const;
const TICKET_STATUS_OPTS = ["New", "Open", "Pending", "Solved", "Closed"] as const;

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

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe",
  "#818cf8", "#60a5fa", "#38bdf8", "#34d399", "#a3e635",
  "#fb923c", "#f87171", "#f472b6", "#e879f9", "#c026d3",
  "#7c3aed", "#2563eb", "#0891b2", "#059669", "#65a30d",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "—";
  const totalMins = Math.floor(ms / 60000);
  const totalHours = Math.floor(totalMins / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (totalHours > 0) return `${totalHours}h ${mins}m`;
  return `${totalMins}m`;
}

function p90(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.9 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function getTickets(): Promise<TicketType[]> {
  return fetch("/api/tickets").then((r) => r.json());
}

function shortLabel(path: string, maxLen = 28): string {
  const last = path.split(" > ").at(-1) || path;
  return last.length > maxLen ? last.slice(0, maxLen) + "…" : last;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "path" | "total" | "pct" | "avg" | "p90" | "breached" | "open" | "resolved";
type SortDir = "asc" | "desc";
type ChartView = "volume" | "resolution";
type ResMetric = "avg" | "p90";

interface CategoryRow {
  path: string;
  total: number;
  pct: string;
  avgMs: number | null;
  p90Ms: number | null;
  breached: number;
  open: number;
  resolved: number;
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCategoryCSV(rows: CategoryRow[]) {
  const headers = [
    "Category",
    "Total Tickets",
    "% of Total",
    "Avg Resolution Time",
    "P90 Resolution Time",
    "SLA Breached",
    "Open Tickets",
    "Resolved Tickets",
  ];
  const csvRows = rows.map((r) =>
    [
      `"${r.path.replace(/"/g, '""')}"`,
      r.total,
      r.pct + "%",
      r.avgMs !== null ? formatDuration(r.avgMs) : "—",
      r.p90Ms !== null ? formatDuration(r.p90Ms) : "—",
      r.breached,
      r.open,
      r.resolved,
    ].join(",")
  );
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `category-distribution-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

const VolumeTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card p-3 text-xs shadow-lg max-w-[260px]">
      <p className="font-medium text-foreground mb-1 break-words">{d.fullPath}</p>
      <p className="text-muted-foreground">Tickets: <span className="font-semibold text-foreground">{d.count}</span></p>
      <p className="text-muted-foreground">% of Total: <span className="font-semibold text-foreground">{d.pct}%</span></p>
    </div>
  );
};

const ResolutionTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-card p-3 text-xs shadow-lg max-w-[260px]">
      <p className="font-medium text-foreground mb-1 break-words">{d.fullPath}</p>
      <p className="text-muted-foreground">Resolution Time: <span className="font-semibold text-foreground">{d.formatted}</span></p>
      <p className="text-muted-foreground">Ticket Count: <span className="font-semibold text-foreground">{d.count}</span></p>
    </div>
  );
};

// ── Sortable Column Header ────────────────────────────────────────────────────

function SortableHeader({
  label, sortKey: key, current, dir, onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === key;
  return (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap hover:bg-muted/50 transition-colors"
      onClick={() => onSort(key)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          dir === "desc" ? <ArrowDown className="h-3 w-3 opacity-70" /> : <ArrowUp className="h-3 w-3 opacity-70" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

// ── Drill-Down URL builder ────────────────────────────────────────────────────

function buildDrillDownUrl(
  path: string,
  dateStart: Date | undefined,
  dateEnd: Date | undefined,
  issueTypeFilters: string[],
  statusFilters: string[],
): string {
  const params = new URLSearchParams();
  params.set("category", encodeURIComponent(path));
  if (dateStart) params.set("start", dateStart.toISOString());
  if (dateEnd) params.set("end", dateEnd.toISOString());
  if (issueTypeFilters.length > 0) params.set("issueType", encodeURIComponent(issueTypeFilters[0]));
  if (statusFilters.length > 0) params.set("status", encodeURIComponent(statusFilters.join(",")));
  return `/tickets?${params.toString()}`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsCategoriesPage() {
  const [, setLocation] = useLocation();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<string>("last30");
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>();
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [issueTypeFilters, setIssueTypeFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [issueTypeOpen, setIssueTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // ── Table sort state ────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Chart/view state ────────────────────────────────────────────────────────
  const [chartView, setChartView] = useState<ChartView>("volume");
  const [resMetric, setResMetric] = useState<ResMetric>("avg");
  const [chartLimit, setChartLimit] = useState<10 | 20>(20);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: tickets = [], isLoading } = useQuery<TicketType[]>({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  // ── Filter helpers ──────────────────────────────────────────────────────────
  const toggleFilter = (
    val: string, current: string[], setter: (v: string[]) => void
  ) => setter(current.includes(val) ? current.filter((v) => v !== val) : [...current, val]);

  // ── Date range ──────────────────────────────────────────────────────────────
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
        return { start, end: endOfWeek(start) };
      }
      case "custom":
        return { start: customDateStart, end: customDateEnd };
      default: // "all"
        return { start: undefined, end: undefined };
    }
  }, [datePreset, customDateStart, customDateEnd]);

  // ── Filtered tickets ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = tickets;
    if (issueTypeFilters.length > 0)
      result = result.filter((t) => issueTypeFilters.includes(t.issueType ?? ""));
    if (statusFilters.length > 0)
      result = result.filter((t) => statusFilters.includes(t.status ?? ""));
    if (dateRange.start && dateRange.end) {
      result = result.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= dateRange.start! && d <= dateRange.end!;
      });
    }
    return result;
  }, [tickets, issueTypeFilters, statusFilters, dateRange]);

  // ── Category data ───────────────────────────────────────────────────────────
  const categoryData = useMemo<CategoryRow[]>(() => {
    const map = new Map<string, {
      total: number; open: number; resolved: number;
      breached: number; resolutionTimes: number[];
    }>();

    for (const ticket of filtered) {
      const snap = (ticket as any).categorySnapshot;
      const path: string = snap?.path || "Uncategorized";

      if (!map.has(path)) {
        map.set(path, { total: 0, open: 0, resolved: 0, breached: 0, resolutionTimes: [] });
      }
      const entry = map.get(path)!;
      entry.total++;

      const isResolved = ticket.status === "Solved" || ticket.status === "Closed";
      if (isResolved) {
        entry.resolved++;
        const resolvedAt = (ticket as any).resolvedAt;
        if (resolvedAt && ticket.createdAt) {
          const ms = new Date(resolvedAt).getTime() - new Date(ticket.createdAt).getTime();
          if (ms >= 0) entry.resolutionTimes.push(ms);
        }
      } else {
        entry.open++;
      }

      if (ticket.slaStatus === "breached") entry.breached++;
    }

    const total = filtered.length;
    return Array.from(map.entries()).map(([path, e]) => ({
      path,
      total: e.total,
      pct: total > 0 ? ((e.total / total) * 100).toFixed(1) : "0.0",
      avgMs: e.resolutionTimes.length > 0
        ? e.resolutionTimes.reduce((a, b) => a + b, 0) / e.resolutionTimes.length
        : null,
      p90Ms: e.resolutionTimes.length > 0 ? p90(e.resolutionTimes) : null,
      breached: e.breached,
      open: e.open,
      resolved: e.resolved,
    }));
  }, [filtered]);

  // ── Sorted table data ───────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortedData = useMemo(() => {
    return [...categoryData].sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case "path": return sortDir === "desc"
          ? b.path.localeCompare(a.path)
          : a.path.localeCompare(b.path);
        case "pct": av = parseFloat(a.pct); bv = parseFloat(b.pct); break;
        case "avg": av = a.avgMs ?? -1; bv = b.avgMs ?? -1; break;
        case "p90": av = a.p90Ms ?? -1; bv = b.p90Ms ?? -1; break;
        case "breached": av = a.breached; bv = b.breached; break;
        case "open": av = a.open; bv = b.open; break;
        case "resolved": av = a.resolved; bv = b.resolved; break;
        default: av = a.total; bv = b.total;
      }
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [categoryData, sortKey, sortDir]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (chartView === "volume") {
      return [...categoryData]
        .sort((a, b) => b.total - a.total)
        .slice(0, chartLimit)
        .map((d) => ({
          name: shortLabel(d.path),
          fullPath: d.path,
          count: d.total,
          pct: d.pct,
        }));
    }
    return [...categoryData]
      .filter((d) => (resMetric === "avg" ? d.avgMs : d.p90Ms) !== null)
      .sort((a, b) => {
        const av = resMetric === "avg" ? (a.avgMs ?? 0) : (a.p90Ms ?? 0);
        const bv = resMetric === "avg" ? (b.avgMs ?? 0) : (b.p90Ms ?? 0);
        return bv - av;
      })
      .slice(0, chartLimit)
      .map((d) => {
        const ms = resMetric === "avg" ? d.avgMs! : d.p90Ms!;
        return {
          name: shortLabel(d.path),
          fullPath: d.path,
          resolutionHours: parseFloat((ms / 3600000).toFixed(2)),
          formatted: formatDuration(ms),
          count: d.total,
        };
      });
  }, [categoryData, chartView, resMetric, chartLimit]);

  const isFilterActive =
    issueTypeFilters.length > 0 || statusFilters.length > 0 || datePreset !== "last30";
  const resetFilters = () => {
    setIssueTypeFilters([]);
    setStatusFilters([]);
    setDatePreset("last30");
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeLabelSuffix = (n: number, singular: string) =>
    n === 0 ? `All ${singular}s` : n === 1 ? `1 ${singular}` : `${n} ${singular}s`;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/analytics")}>
                <ArrowLeft className="h-4 w-4" />
                Back to Analytics
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Layers className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight">
                    Category Distribution
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} tickets · {categoryData.length} categories ·{" "}
                    {datePreset === "all"
                      ? "All time"
                      : PRESETS.find((p) => p.key === datePreset)?.label}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCategoryCSV(sortedData)}
                disabled={sortedData.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        {/* ── Filter Bar ────────────────────────────────────────────────────── */}
        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Date Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date Range</Label>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                  <Button
                    key={p.key}
                    variant={datePreset === p.key ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => { setDatePreset(p.key); setShowCustomPicker(false); }}
                  >
                    {p.label}
                  </Button>
                ))}
                <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={datePreset === "custom" ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <Calendar className="mr-1 h-3 w-3" />
                      {datePreset === "custom" && customDateStart && customDateEnd
                        ? `${format(customDateStart, "MMM d")} – ${format(customDateEnd, "MMM d")}`
                        : "Custom"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{ from: customDateStart, to: customDateEnd }}
                      onSelect={(range) => {
                        if (range?.from) setCustomDateStart(range.from);
                        if (range?.to) { setCustomDateEnd(range.to); setDatePreset("custom"); setShowCustomPicker(false); }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="ml-auto flex items-end gap-3">
              {/* Issue Type multi-select */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Issue Type</Label>
                <Popover open={issueTypeOpen} onOpenChange={setIssueTypeOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 min-w-[140px] justify-between text-xs font-normal">
                      <span className="truncate">{activeLabelSuffix(issueTypeFilters.length, "Type")}</span>
                      {issueTypeFilters.length > 0 && (
                        <Badge className="ml-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {issueTypeFilters.length}
                        </Badge>
                      )}
                      <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[160px] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {ISSUE_TYPES_OPTS.map((t) => (
                            <CommandItem
                              key={t}
                              onSelect={() => toggleFilter(t, issueTypeFilters, setIssueTypeFilters)}
                              className="flex items-center gap-2 cursor-pointer text-xs"
                            >
                              <Checkbox checked={issueTypeFilters.includes(t)} className="pointer-events-none" />
                              <span>{t}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {issueTypeFilters.length > 0 && (
                          <>
                            <div className="border-t mx-1" />
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => setIssueTypeFilters([])}
                                className="justify-center text-xs text-muted-foreground cursor-pointer"
                              >
                                Clear
                              </CommandItem>
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Status multi-select */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 min-w-[130px] justify-between text-xs font-normal">
                      <span className="truncate">{activeLabelSuffix(statusFilters.length, "Status")}</span>
                      {statusFilters.length > 0 && (
                        <Badge className="ml-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {statusFilters.length}
                        </Badge>
                      )}
                      <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[150px] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {TICKET_STATUS_OPTS.map((s) => (
                            <CommandItem
                              key={s}
                              onSelect={() => toggleFilter(s, statusFilters, setStatusFilters)}
                              className="flex items-center gap-2 cursor-pointer text-xs"
                            >
                              <Checkbox checked={statusFilters.includes(s)} className="pointer-events-none" />
                              <span>{s}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {statusFilters.length > 0 && (
                          <>
                            <div className="border-t mx-1" />
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => setStatusFilters([])}
                                className="justify-center text-xs text-muted-foreground cursor-pointer"
                              >
                                Clear
                              </CommandItem>
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {isFilterActive && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
                  <X className="mr-1 h-3 w-3" /> Reset
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* ── KPI Summary ────────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Tickets",
              value: filtered.length,
              sub: `${categoryData.length} categories`,
              color: "text-blue-600",
              bg: "bg-blue-500/10",
            },
            {
              label: "Resolved",
              value: filtered.filter((t) => t.status === "Solved" || t.status === "Closed").length,
              sub: filtered.length > 0
                ? `${((filtered.filter((t) => t.status === "Solved" || t.status === "Closed").length / filtered.length) * 100).toFixed(0)}% resolution rate`
                : "—",
              color: "text-green-600",
              bg: "bg-green-500/10",
            },
            {
              label: "SLA Breached",
              value: filtered.filter((t) => t.slaStatus === "breached").length,
              sub: filtered.length > 0
                ? `${((filtered.filter((t) => t.slaStatus === "breached").length / filtered.length) * 100).toFixed(0)}% breach rate`
                : "—",
              color: "text-red-600",
              bg: "bg-red-500/10",
            },
            {
              label: "Avg Resolution",
              value: (() => {
                const times = filtered
                  .filter((t) => (t.status === "Solved" || t.status === "Closed") && (t as any).resolvedAt)
                  .map((t) => new Date((t as any).resolvedAt).getTime() - new Date(t.createdAt).getTime())
                  .filter((ms) => ms >= 0);
                if (times.length === 0) return "—";
                const avg = times.reduce((a, b) => a + b, 0) / times.length;
                return formatDuration(avg);
              })(),
              sub: "across all categories",
              color: "text-purple-600",
              bg: "bg-purple-500/10",
            },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</p>
                </div>
                <div className={`rounded-lg p-2 ${kpi.bg}`}>
                  <BarChart3 className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Section 1: Category Distribution Table ──────────────────────── */}
        <Card>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Overall Category Distribution</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sortedData.length} categories · sorted by{" "}
                <span className="font-medium">{sortKey}</span>{" "}
                ({sortDir === "desc" ? "highest first" : "lowest first"})
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportCategoryCSV(sortedData)} disabled={sortedData.length === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export
            </Button>
          </div>

          {sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Layers className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No category data found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableHeader label="Category" sortKey="path" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Total" sortKey="total" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="% Share" sortKey="pct" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Avg Resolution" sortKey="avg" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="P90 Resolution" sortKey="p90" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="SLA Breached" sortKey="breached" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Open" sortKey="open" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Resolved" sortKey="resolved" current={sortKey} dir={sortDir} onSort={handleSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((row) => (
                    <TableRow key={row.path}>
                      <TableCell className="font-medium text-xs max-w-[280px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{row.path.split(" > ").at(-1)}</span>
                          {row.path.includes(" > ") && (
                            <span className="text-muted-foreground text-[10px] leading-tight">
                              {row.path.split(" > ").slice(0, -1).join(" › ")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          className="font-semibold text-primary underline-offset-2 hover:underline cursor-pointer transition-colors"
                          title={`View ${row.total} tickets for "${row.path}"`}
                          onClick={() =>
                            setLocation(buildDrillDownUrl(
                              row.path,
                              dateRange.start,
                              dateRange.end,
                              issueTypeFilters,
                              statusFilters,
                            ))
                          }
                        >
                          {row.total}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden w-16">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(parseFloat(row.pct), 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{row.pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.avgMs !== null ? formatDuration(row.avgMs) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.p90Ms !== null ? formatDuration(row.p90Ms) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {row.breached > 0 ? (
                          <Badge variant="destructive" className="text-xs">{row.breached}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{row.open}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-green-600 font-medium">{row.resolved}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* ── Section 2: Top Categories Chart ────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h2 className="font-semibold">Top Categories</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {chartView === "volume"
                  ? `Top ${chartLimit} by ticket volume`
                  : `Top ${chartLimit} by ${resMetric === "avg" ? "average" : "P90"} resolution time`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Volume / Resolution toggle */}
              <div className="flex rounded-md border overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-xs transition-colors ${chartView === "volume" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setChartView("volume")}
                >
                  By Ticket Volume
                </button>
                <button
                  className={`px-3 py-1.5 text-xs border-l transition-colors ${chartView === "resolution" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setChartView("resolution")}
                >
                  By Resolution Time
                </button>
              </div>

              {/* Avg / P90 toggle (only for resolution view) */}
              {chartView === "resolution" && (
                <div className="flex rounded-md border overflow-hidden">
                  <button
                    className={`px-3 py-1.5 text-xs transition-colors ${resMetric === "avg" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setResMetric("avg")}
                  >
                    Avg
                  </button>
                  <button
                    className={`px-3 py-1.5 text-xs border-l transition-colors ${resMetric === "p90" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setResMetric("p90")}
                  >
                    P90
                  </button>
                </div>
              )}

              {/* Top 10 / Top 20 */}
              <Select value={String(chartLimit)} onValueChange={(v) => setChartLimit(Number(v) as 10 | 20)}>
                <SelectTrigger className="h-8 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-5">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BarChart3 className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">No data to display for selected filters</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={
                      chartView === "resolution"
                        ? (v) => `${v}h`
                        : undefined
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  {chartView === "volume" ? (
                    <Tooltip content={<VolumeTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  ) : (
                    <Tooltip content={<ResolutionTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                  )}
                  <Bar
                    dataKey={chartView === "volume" ? "count" : "resolutionHours"}
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data?.fullPath) {
                        setLocation(buildDrillDownUrl(
                          data.fullPath,
                          dateRange.start,
                          dateRange.end,
                          issueTypeFilters,
                          statusFilters,
                        ));
                      }
                    }}
                    label={
                      chartView === "volume"
                        ? { position: "right", fontSize: 11, formatter: (v: number) => v }
                        : { position: "right", fontSize: 11, formatter: (_: number, entry: any) => entry?.formatted || "" }
                    }
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Legend / color key */}
            {chartData.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                {chartData.map((d, i) => (
                  <div key={d.fullPath} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="truncate max-w-[180px]" title={d.fullPath}>{d.fullPath}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
