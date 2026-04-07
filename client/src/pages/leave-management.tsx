import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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
  DialogTrigger,
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
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userDepartment: string;
  startDate: string;
  endDate: string;
  leaveType: "sick" | "annual" | "personal" | "emergency";
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  createdAt: string;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: "Sick Leave",
  annual: "Annual Leave",
  personal: "Personal Leave",
  emergency: "Emergency Leave",
};

function getHeaders() {
  const email = localStorage.getItem("userEmail") || "";
  return { "Content-Type": "application/json", ...(email ? { "x-user-email": email } : {}) };
}

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; name: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    leaveType: "sick",
    reason: "",
  });

  const isManager = user && ["Owner", "Admin", "Head", "Manager", "Lead"].includes(user.role);

  // ── Fetch leave requests ─────────────────────────────────────────────────
  const { data: leaveRequests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const res = await fetch("/api/leave-requests", { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      return res.json();
    },
    enabled: !!user,
  });

  // ── Submit leave request ─────────────────────────────────────────────────
  const createLeave = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          startDate: data.startDate,
          endDate: data.endDate,
          leaveType: data.leaveType,
          reason: data.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      setIsDialogOpen(false);
      setFormData({ startDate: "", endDate: "", leaveType: "sick", reason: "" });
      toast({ title: "Leave Request Submitted", description: "Your request has been sent for approval." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ── Approve / Reject ─────────────────────────────────────────────────────
  const reviewLeave = useMutation({
    mutationFn: async ({ id, status, reviewNote }: { id: string; status: "approved" | "rejected"; reviewNote?: string }) => {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status, reviewNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      setRejectDialog(null);
      setRejectNote("");
      toast({
        title: status === "approved" ? "Leave Approved" : "Leave Rejected",
        description: `The leave request has been ${status}.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast({ title: "Invalid Dates", description: "End date must be on or after start date.", variant: "destructive" });
      return;
    }
    createLeave.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    if (status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const pending  = leaveRequests.filter((r) => r.status === "pending").length;
  const approved = leaveRequests.filter((r) => r.status === "approved").length;
  const rejected = leaveRequests.filter((r) => r.status === "rejected").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/attendance")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Calendar className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight">Leave Management</h1>
                  <p className="text-xs text-muted-foreground">Request and manage time off</p>
                </div>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Leave Request</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input type="date" value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date *</Label>
                      <Input type="date" value={formData.endDate} min={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Leave Type *</Label>
                    <Select value={formData.leaveType} onValueChange={(v) => setFormData({ ...formData, leaveType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="annual">Annual Leave</SelectItem>
                        <SelectItem value="personal">Personal Leave</SelectItem>
                        <SelectItem value="emergency">Emergency Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Textarea value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Please provide a reason for your leave..."
                      rows={4} required />
                  </div>

                  {formData.startDate && formData.endDate && (
                    <div className="rounded-lg bg-accent/50 px-4 py-2.5 text-sm">
                      Total days: <strong>{calculateDays(formData.startDate, formData.endDate)}</strong>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLeave.isPending} className="flex-1">
                      {createLeave.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
            <p className="text-3xl font-bold mt-1">{leaveRequests.length}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Approved</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{approved}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{pending}</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Rejected</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{rejected}</p>
          </Card>
        </div>

        {/* Leave Requests Table */}
        <Card>
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">
              {isManager ? "Team Leave Requests" : "My Leave Requests"}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leaveRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isManager && <TableHead>Employee</TableHead>}
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="max-w-xs">Reason</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    {isManager && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      {isManager && (
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{request.userName}</p>
                            <p className="text-xs text-muted-foreground">{request.userDepartment}</p>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap">{fmtDate(request.startDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(request.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{calculateDays(request.startDate, request.endDate)}d</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{LEAVE_TYPE_LABELS[request.leaveType] ?? request.leaveType}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-sm">{request.reason}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {fmtDate(request.createdAt)}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      {isManager && (
                        <TableCell>
                          {request.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm" variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                disabled={reviewLeave.isPending}
                                onClick={() => reviewLeave.mutate({ id: request.id, status: "approved" })}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                disabled={reviewLeave.isPending}
                                onClick={() => { setRejectDialog({ id: request.id, name: request.userName }); setRejectNote(""); }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {request.status === "rejected" && request.reviewNote && (
                            <p className="text-xs text-muted-foreground max-w-[160px] truncate" title={request.reviewNote}>
                              Note: {request.reviewNote}
                            </p>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No leave requests found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "New Request" to submit your first leave application
              </p>
            </div>
          )}
        </Card>
      </main>

      {/* Rejection note dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => { if (!o) { setRejectDialog(null); setRejectNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are rejecting the leave request from <strong>{rejectDialog?.name}</strong>. Optionally provide a reason.
            </p>
            <div className="space-y-2">
              <Label>Reason for Rejection (optional)</Label>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Insufficient coverage during that period..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setRejectDialog(null); setRejectNote(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive" className="flex-1"
                disabled={reviewLeave.isPending}
                onClick={() => {
                  if (!rejectDialog) return;
                  reviewLeave.mutate({ id: rejectDialog.id, status: "rejected", reviewNote: rejectNote || undefined });
                }}
              >
                {reviewLeave.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rejecting…</> : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
