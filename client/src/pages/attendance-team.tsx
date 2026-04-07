import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Users,
  Clock,
  Coffee,
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
  Monitor,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@shared/schema";

export default function TeamAttendancePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState<"portal" | "attendance">("portal");

  const isManager = user && ["Owner", "Admin", "Head", "Manager", "Lead"].includes(user.role);

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">This page is only accessible to managers and above.</p>
          <Button onClick={() => setLocation("/attendance")}>Go to My Attendance</Button>
        </Card>
      </div>
    );
  }

  // ── View 1: Portal online (heartbeat-based) ──────────────────────────────
  const { data: onlineUsers, isLoading: onlineLoading } = useQuery<Omit<UserType, "password">[]>({
    queryKey: ["users-online"],
    queryFn: async () => {
      const email = localStorage.getItem("userEmail") || "";
      const res = await fetch("/api/users/online", {
        headers: { "x-user-email": email },
      });
      if (!res.ok) throw new Error("Failed to fetch online users");
      return res.json();
    },
    refetchInterval: 15_000, // refresh every 15 s
    enabled: activeView === "portal",
  });

  // ── View 2: Attendance check-in (existing logic) ─────────────────────────
  const { data: allUsers } = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["team-attendance-realtime"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const params = new URLSearchParams({ startDate: today, endDate: today });
      const res = await fetch(`/api/attendance/reports?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attendance data");
      return res.json();
    },
    refetchInterval: 30_000,
    enabled: activeView === "attendance",
  });

  const teamMembers = (allUsers ?? []).filter((u) => {
    if (!user) return false;
    if (user.role === "Owner" || user.role === "Admin") return true;
    return u.department === user.department;
  });

  const checkedInMembers = teamMembers.map((member) => {
    const memberData = attendanceData?.byUser?.[member.id];
    const hasActiveSession = memberData && memberData.completedSessions < memberData.totalSessions;
    return {
      ...member,
      isCheckedIn: !!hasActiveSession,
      workDuration: memberData?.totalMinutes as number | undefined,
    };
  });

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // ── Counts ────────────────────────────────────────────────────────────────
  const portalOnlineCount    = onlineUsers?.length ?? 0;
  const attendanceActiveCount = checkedInMembers.filter((m) => m.isCheckedIn).length;

  const isLoading = activeView === "portal" ? onlineLoading : attendanceLoading;

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
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-semibold">Team Status</span>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-1 gap-1">
              <button
                onClick={() => setActiveView("portal")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  activeView === "portal"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                Portal Online
                {portalOnlineCount > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white font-bold">
                    {portalOnlineCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveView("attendance")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  activeView === "attendance"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                Attendance
                {attendanceActiveCount > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white font-bold">
                    {attendanceActiveCount}
                  </span>
                )}
              </button>
            </div>

            <Badge variant="secondary" className="animate-pulse text-xs">
              <Timer className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-6 space-y-6">

        {/* ── View 1: Portal Online ── */}
        {activeView === "portal" && (
          <>
            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Currently Online</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{portalOnlineCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active in last 5 min</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Team</p>
                    <p className="text-3xl font-bold mt-1">{teamMembers.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Offline</p>
                    <p className="text-3xl font-bold text-muted-foreground mt-1">
                      {teamMembers.length - portalOnlineCount}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <div className="p-5 border-b">
                <h2 className="font-semibold">Who's Online Now</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Users actively using the portal — refreshes every 15 seconds
                </p>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (onlineUsers ?? []).length === 0 ? (
                <div className="p-12 text-center">
                  <Monitor className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">No one is currently online</p>
                </div>
              ) : (
                <div className="divide-y">
                  {(onlineUsers ?? []).map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 ring-2 ring-green-500">
                            <AvatarFallback className="bg-green-100 text-green-700 text-sm font-semibold">
                              {member.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                          <div className="flex gap-1.5 mt-1">
                            {member.department && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5">{member.department}</Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{member.role}</Badge>
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-green-500 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Online
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ── View 2: Attendance Check-in ── */}
        {activeView === "attendance" && (
          <>
            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Checked In</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{attendanceActiveCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active session today</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <CalendarCheck className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Team</p>
                    <p className="text-3xl font-bold mt-1">{teamMembers.length}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Not Checked In</p>
                    <p className="text-3xl font-bold text-muted-foreground mt-1">
                      {teamMembers.length - attendanceActiveCount}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </Card>
            </div>

            <Card>
              <div className="p-5 border-b">
                <h2 className="font-semibold">Today's Attendance</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attendance check-in status — refreshes every 30 seconds
                </p>
              </div>
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="divide-y">
                  {checkedInMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Avatar className={cn(
                          "h-10 w-10 ring-2",
                          member.isCheckedIn ? "ring-blue-500" : "ring-gray-200"
                        )}>
                          <AvatarFallback className={cn(
                            "text-sm font-semibold",
                            member.isCheckedIn ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                          <div className="flex gap-1.5 mt-1">
                            {member.department && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5">{member.department}</Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{member.role}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {member.isCheckedIn ? (
                          <Badge className="bg-blue-500 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Checked In
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Checked In
                          </Badge>
                        )}
                        {member.isCheckedIn && member.workDuration !== undefined && (
                          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(member.workDuration)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {checkedInMembers.length === 0 && (
                    <div className="p-12 text-center">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground">No team members found</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
