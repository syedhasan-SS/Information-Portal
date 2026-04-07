import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Timer,
  Users,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface OvertimeRecord {
  id: string;
  userId: string;
  userName?: string;
  userDepartment?: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approverName?: string;
  notes?: string;
  createdAt: string;
}

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AttendanceOvertimePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isManager = user && ["Owner", "Admin", "Head", "Manager", "Lead"].includes(user.role);

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; record: OvertimeRecord | null }>({ open: false, record: null });
  const [reviewNotes, setReviewNotes] = useState("");

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "18:00",
    endTime: "20:00",
    reason: "",
  });

  // Fetch OT records
  const { data: records = [], isLoading } = useQuery<OvertimeRecord[]>({
    queryKey: ["overtime-records", filterStatus, filterDept, startDate, endDate, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      if (!isManager) params.set("userId", user?.id || "");
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterDept !== "all" && isManager) params.set("department", filterDept);
      const res = await fetch(`/api/overtime-records?${params}`, {
        headers: { "x-user-email": user?.email || "" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch OT records");
      return res.json();
    },
    enabled: !!user,
  });

  // Create OT record
  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/overtime-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "",
        },
        credentials: "include",
        body: JSON.stringify({ ...data, userId: user?.id }),
      });
      if (!res.ok) throw new Error("Failed to submit OT request");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["overtime-records"] });
      setDialogOpen(false);
      setForm({ date: new Date().toISOString().split("T")[0], startTime: "18:00", endTime: "20:00", reason: "" });
      toast({ title: "OT request submitted", description: "Your overtime request has been sent for approval." });
    },
    onError: () => toast({ title: "Error", description: "Failed to submit OT request", variant: "destructive" }),
  });

  // Update OT record status (managers)
  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const res = await fetch(`/api/overtime-records/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "",
        },
        credentials: "include",
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update OT record");
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["overtime-records"] });
      setReviewDialog({ open: false, record: null });
      setReviewNotes("");
      toast({ title: vars.status === "approved" ? "OT Approved" : "OT Rejected", description: "Status updated successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to update OT record", variant: "destructive" }),
  });

  const pending = records.filter(r => r.status === "pending").length;
  const approved = records.filter(r => r.status === "approved").length;
  const totalHours = records
    .filter(r => r.status === "approved")
    .reduce((acc, r) => {
      const [sh, sm] = r.startTime.split(":").map(Number);
      const [eh, em] = r.endTime.split(":").map(Number);
      return acc + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    }, 0);

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  // Unique departments from records
  const departments = [...new Set(records.map(r => r.userDepartment).filter(Boolean))];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
              <Button variant="ghost" size="sm" onClick={() => setLocation("/attendance")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
                  <Timer className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Overtime (OT) Tracker
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Submit and manage overtime requests
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Log OT
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-3xl font-semibold text-amber-600">{pending}</p>
                <p className="text-xs text-muted-foreground">awaiting review</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Approved OT</p>
                <p className="text-3xl font-semibold text-green-600">{approved}</p>
                <p className="text-xs text-muted-foreground">in selected range</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total OT Hours</p>
                <p className="text-3xl font-semibold text-orange-600">
                  {(totalHours / 60).toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">approved only</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isManager && (
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={filterDept} onValueChange={setFilterDept}>
                  <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d} value={d!}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* OT Records Table */}
        <Card>
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">OT Records</h2>
              <p className="text-sm text-muted-foreground">{records.length} record{records.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <Timer className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No OT records found</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Log OT" to submit an overtime request.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isManager && <TableHead>Employee</TableHead>}
                    {isManager && <TableHead>Department</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    {isManager && <TableHead>Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(record => (
                    <TableRow key={record.id}>
                      {isManager && (
                        <TableCell>
                          <span className="font-medium">{record.userName || "—"}</span>
                        </TableCell>
                      )}
                      {isManager && (
                        <TableCell>
                          <Badge variant="outline">{record.userDepartment || "—"}</Badge>
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">{record.date}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.startTime} – {record.endTime}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-orange-600">
                        {calcDuration(record.startTime, record.endTime)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {record.reason || "—"}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(record.status)}</TableCell>
                      {isManager && (
                        <TableCell>
                          {record.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setReviewDialog({ open: true, record }); setReviewNotes(""); }}
                            >
                              Review
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {record.approverName ? `by ${record.approverName}` : "—"}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>

      {/* Log OT Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-500" />
              Log Overtime
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
            {form.startTime && form.endTime && (
              <p className="text-sm text-orange-600 font-medium">
                Duration: {calcDuration(form.startTime, form.endTime)}
              </p>
            )}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Describe the reason for overtime..."
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.date || !form.startTime || !form.endTime}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog (managers) */}
      <Dialog open={reviewDialog.open} onOpenChange={open => setReviewDialog(d => ({ ...d, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review OT Request</DialogTitle>
          </DialogHeader>
          {reviewDialog.record && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                <p className="font-medium">{reviewDialog.record.userName}</p>
                <p className="text-sm text-muted-foreground">{reviewDialog.record.userDepartment}</p>
                <div className="flex gap-4 text-sm mt-2">
                  <span><span className="text-muted-foreground">Date:</span> {reviewDialog.record.date}</span>
                  <span><span className="text-muted-foreground">Time:</span> {reviewDialog.record.startTime}–{reviewDialog.record.endTime}</span>
                  <span className="font-medium text-orange-600">{calcDuration(reviewDialog.record.startTime, reviewDialog.record.endTime)}</span>
                </div>
                {reviewDialog.record.reason && (
                  <p className="text-sm mt-2 border-t pt-2">{reviewDialog.record.reason}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Add a note..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialog({ open: false, record: null })}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => reviewDialog.record && updateMutation.mutate({ id: reviewDialog.record.id, status: "rejected", notes: reviewNotes })}
              disabled={updateMutation.isPending}
            >
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => reviewDialog.record && updateMutation.mutate({ id: reviewDialog.record.id, status: "approved", notes: reviewNotes })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
