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
  LogIn,
  LogOut,
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@shared/schema";

interface TeamMemberStatus {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  isLoggedIn: boolean;
  loginTime?: string;
  workDuration?: number;
  onBreak?: boolean;
  breakDuration?: number;
}

export default function TeamAttendancePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const isManager = user && ["Owner", "Admin", "Head", "Manager", "Lead"].includes(user.role);

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            This page is only accessible to managers and above.
          </p>
          <Button onClick={() => setLocation("/attendance")}>
            Go to My Attendance
          </Button>
        </Card>
      </div>
    );
  }

  // Fetch all users
  const { data: allUsers } = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Fetch today's attendance data
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["team-attendance-realtime"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const params = new URLSearchParams({
        startDate: today,
        endDate: today,
      });
      const res = await fetch(`/api/attendance/reports?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch attendance data");
      return res.json();
    },
    refetchInterval: refreshInterval,
  });

  // Filter users by department if needed
  const teamMembers = allUsers?.filter((u) => {
    if (user.role === "Owner" || user.role === "Admin") return true;
    return u.department === user.department;
  }) || [];

  // Build team status from attendance data
  const teamStatus: TeamMemberStatus[] = teamMembers.map((member) => {
    const memberData = attendanceData?.byUser?.[member.id];
    const hasActiveSession = memberData && memberData.completedSessions < memberData.totalSessions;

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      department: member.department || "Unknown",
      role: member.role,
      isLoggedIn: hasActiveSession,
      loginTime: hasActiveSession ? undefined : undefined, // Would need more detailed API data
      workDuration: memberData?.totalMinutes,
      onBreak: false, // Would need break tracking in API
      breakDuration: 0,
    };
  });

  const loggedInCount = teamStatus.filter((m) => m.isLoggedIn).length;
  const loggedOutCount = teamStatus.filter((m) => !m.isLoggedIn).length;
  const onBreakCount = teamStatus.filter((m) => m.onBreak).length;

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex h-16 items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/attendance")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Team Attendance</span>
            </div>
            <Badge variant="secondary" className="animate-pulse">
              Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Team</p>
                <p className="text-3xl font-bold mt-2">{teamStatus.length}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Logged In</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{loggedInCount}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On Break</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{onBreakCount}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Coffee className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Logged Out</p>
                <p className="text-3xl font-bold text-gray-600 mt-2">{loggedOutCount}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Team Members List */}
        <Card>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Team Members</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>Updates every 5 seconds</span>
              </div>
            </div>
          </div>

          <div className="divide-y">
            {teamStatus.map((member) => (
              <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className={cn(
                      "h-12 w-12 ring-2",
                      member.isLoggedIn ? "ring-green-500" : "ring-gray-300"
                    )}>
                      <AvatarFallback className={cn(
                        member.isLoggedIn ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                      )}>
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {member.department}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-2">
                      {member.isLoggedIn ? (
                        <>
                          {member.onBreak ? (
                            <Badge className="bg-amber-500">
                              <Coffee className="h-3 w-3 mr-1" />
                              On Break
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Logged Out
                        </Badge>
                      )}
                    </div>

                    {member.isLoggedIn && (
                      <div className="space-y-1">
                        {member.loginTime && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <LogIn className="h-3 w-3" />
                            <span>{new Date(member.loginTime).toLocaleTimeString()}</span>
                          </div>
                        )}
                        {member.workDuration !== undefined && (
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(member.workDuration)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {teamStatus.length === 0 && (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No team members found</p>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
