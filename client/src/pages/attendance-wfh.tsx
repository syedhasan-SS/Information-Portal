import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Home, Building2, GitMerge, Users, Loader2, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

// ── Constants ────────────────────────────────────────────────────────────────
const LOCATION_CONFIG = {
  wfh:    { label: "Work From Home", short: "WFH",    color: "bg-green-100 text-green-800 border-green-300",  icon: Home       },
  office: { label: "In Office",      short: "Office", color: "bg-blue-100 text-blue-800 border-blue-300",    icon: Building2  },
  hybrid: { label: "Hybrid",         short: "Hybrid", color: "bg-purple-100 text-purple-800 border-purple-300", icon: GitMerge },
} as const;
type WorkLocation = keyof typeof LOCATION_CONFIG;

function getHeaders() {
  const email = localStorage.getItem("userEmail") || "";
  return { "Content-Type": "application/json", ...(email ? { "x-user-email": email } : {}) };
}

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }

// ── Component ─────────────────────────────────────────────────────────────────
export default function AttendanceWfhPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isManager = user && ["Owner","Admin","Head","Manager","Lead"].includes(user.role);

  const today     = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [myLocation, setMyLocation]     = useState<WorkLocation>("office");
  const [myNotes, setMyNotes]           = useState("");
  const [view, setView]                 = useState<"today" | "report">("today");

  // Date range for report view
  const [reportStart, setReportStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return toDateStr(d);
  });
  const [reportEnd, setReportEnd] = useState(today);

  // ── My today's status ───────────────────────────────────────────────────
  const { data: myStatus } = useQuery<any>({
    queryKey: ["wfh-today"],
    queryFn: async () => {
      const res = await fetch("/api/wfh-records/today", { headers: getHeaders() });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.workLocation) setMyLocation(data.workLocation as WorkLocation);
      if (data?.notes)        setMyNotes(data.notes);
    },
  } as any);

  // ── Team today ──────────────────────────────────────────────────────────
  const { data: teamToday = [], isLoading: todayLoading } = useQuery<any[]>({
    queryKey: ["wfh-records", selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      const res = await fetch(`/api/wfh-records?${params}`, { headers: getHeaders() });
      return res.json();
    },
    refetchInterval: 30_000,
    enabled: view === "today",
  });

  // ── Report ───────────────────────────────────────────────────────────────
  const { data: reportData = [], isLoading: reportLoading } = useQuery<any[]>({
    queryKey: ["wfh-records-report", reportStart, reportEnd],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate: reportStart, endDate: reportEnd });
      const res = await fetch(`/api/wfh-records?${params}`, { headers: getHeaders() });
      return res.json();
    },
    enabled: view === "report",
  });

  // ── All users for context ───────────────────────────────────────────────
  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { headers: getHeaders() });
      return res.json();
    },
  });

  const teamMembers = useMemo(() =>
    allUsers.filter((u) => {
      if (!user) return false;
      if (!u.isActive) return false;
      if (user.role === "Owner" || user.role === "Admin") return true;
      return u.department === user.department;
    }),
    [allUsers, user]
  );

  // ── Submit my WFH status ────────────────────────────────────────────────
  const submitStatus = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/wfh-records", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ date: today, workLocation: myLocation, notes: myNotes }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wfh-today"] });
      queryClient.invalidateQueries({ queryKey: ["wfh-records"] });
      toast({ title: "Status Updated", description: `Marked as ${LOCATION_CONFIG[myLocation].label} for today.` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ── Today's summary ──────────────────────────────────────────────────────
  const todayWfhCount    = teamToday.filter((r) => r.workLocation === "wfh").length;
  const todayOfficeCount = teamToday.filter((r) => r.workLocation === "office").length;
  const todayHybridCount = teamToday.filter((r) => r.workLocation === "hybrid").length;
  const notReportedCount = teamMembers.length - teamToday.length;

  // ── Report: per-user WFH days ────────────────────────────────────────────
  const userReportMap = useMemo(() => {
    const map: Record<string, { wfh: number; office: number; hybrid: number; total: number; name: string; dept: string }> = {};
    for (const r of reportData) {
      if (!map[r.userId]) map[r.userId] = { wfh: 0, office: 0, hybrid: 0, total: 0, name: r.userName, dept: r.userDepartment };
      map[r.userId][r.workLocation as WorkLocation]++;
      map[r.userId].total++;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [reportData]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/attendance")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Home className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold">WFH Tracker</h1>
                  <p className="text-xs text-muted-foreground">Work location visibility for the team</p>
                </div>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-1 gap-1">
              <button
                onClick={() => setView("today")}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  view === "today" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="h-3.5 w-3.5" /> Team Today
              </button>
              <button
                onClick={() => setView("report")}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  view === "report" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" /> Report
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-6 space-y-6">

        {/* ── My Status Card ── */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">My Status Today</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              {(Object.entries(LOCATION_CONFIG) as [WorkLocation, typeof LOCATION_CONFIG[WorkLocation]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setMyLocation(key)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                      myLocation === key
                        ? cn("border-2", cfg.color)
                        : "border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.short}
                  </button>
                );
              })}
            </div>
            <Textarea
              value={myNotes}
              onChange={(e) => setMyNotes(e.target.value)}
              placeholder="Optional note (e.g. working from cafe today)"
              className="h-10 min-h-[40px] resize-none text-sm flex-1"
              rows={1}
            />
            <Button
              onClick={() => submitStatus.mutate()}
              disabled={submitStatus.isPending}
              className="shrink-0"
            >
              {submitStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
            </Button>
          </div>
          {myStatus?.workLocation && (
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: {LOCATION_CONFIG[myStatus.workLocation as WorkLocation]?.label}
              {myStatus.notes && ` — ${myStatus.notes}`}
            </p>
          )}
        </Card>

        {/* ── Today's Team View ── */}
        {view === "today" && (
          <>
            {/* Date selector + summary */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Date:</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 w-36 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "WFH",          count: todayWfhCount,    cfg: LOCATION_CONFIG.wfh    },
                { label: "In Office",    count: todayOfficeCount, cfg: LOCATION_CONFIG.office },
                { label: "Hybrid",       count: todayHybridCount, cfg: LOCATION_CONFIG.hybrid },
                { label: "Not Reported", count: notReportedCount, cfg: null },
              ].map(({ label, count, cfg }) => (
                <Card key={label} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{label}</p>
                      <p className={cn("text-3xl font-bold mt-1", cfg ? "" : "text-muted-foreground")}>{count}</p>
                    </div>
                    {cfg && (
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center border", cfg.color)}>
                        <cfg.icon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Card>
              <div className="p-5 border-b flex items-center justify-between">
                <h2 className="font-semibold">Team Location Status</h2>
                <span className="text-xs text-muted-foreground">
                  {selectedDate === today ? "Today" : fmtDate(selectedDate)}
                </span>
              </div>
              {todayLoading ? (
                <div className="flex items-center justify-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="divide-y">
                  {/* Reported members */}
                  {teamToday.map((record) => {
                    const cfg = LOCATION_CONFIG[record.workLocation as WorkLocation];
                    const Icon = cfg?.icon ?? Home;
                    return (
                      <div key={record.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-accent">{record.userName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{record.userName}</p>
                            <p className="text-xs text-muted-foreground">{record.userDepartment}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={cn("text-xs border", cfg?.color)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {cfg?.label}
                          </Badge>
                          {record.notes && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px] truncate">{record.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Not reported */}
                  {teamMembers
                    .filter((m) => !teamToday.some((r) => r.userId === m.id))
                    .map((member) => (
                      <div key={member.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 opacity-50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.department}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Not Reported</Badge>
                      </div>
                    ))}

                  {teamMembers.length === 0 && (
                    <div className="p-10 text-center text-muted-foreground text-sm">No team members found</div>
                  )}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── Report View ── */}
        {view === "report" && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">From:</Label>
                <Input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="h-8 w-36 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">To:</Label>
                <Input type="date" value={reportEnd} max={today} onChange={(e) => setReportEnd(e.target.value)} className="h-8 w-36 text-sm" />
              </div>
            </div>

            <Card>
              <div className="p-5 border-b">
                <h2 className="font-semibold">WFH Summary Report</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmtDate(reportStart)} – {fmtDate(reportEnd)}
                </p>
              </div>
              {reportLoading ? (
                <div className="flex items-center justify-center p-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : userReportMap.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">No data in this period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-5 py-3 text-left font-medium">Team Member</th>
                        <th className="px-4 py-3 text-center font-medium text-green-700">WFH Days</th>
                        <th className="px-4 py-3 text-center font-medium text-blue-700">Office Days</th>
                        <th className="px-4 py-3 text-center font-medium text-purple-700">Hybrid Days</th>
                        <th className="px-4 py-3 text-center font-medium">Total</th>
                        <th className="px-4 py-3 text-center font-medium">WFH %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userReportMap.map((row) => (
                        <tr key={row.name} className="border-b hover:bg-muted/20">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs bg-accent">{row.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{row.name}</p>
                                <p className="text-xs text-muted-foreground">{row.dept}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-green-700">{row.wfh}</td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-700">{row.office}</td>
                          <td className="px-4 py-3 text-center font-semibold text-purple-700">{row.hybrid}</td>
                          <td className="px-4 py-3 text-center font-bold">{row.total}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${row.total ? Math.round((row.wfh / row.total) * 100) : 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {row.total ? Math.round((row.wfh / row.total) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
