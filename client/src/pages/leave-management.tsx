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
import { cn } from "@/lib/utils";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export default function LeaveManagementPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    leaveType: "sick",
    reason: "",
  });

  const isManager = user && ["Owner", "Admin", "Head", "Manager", "Lead"].includes(user.role);

  // This would be the actual API implementation
  const { data: leaveRequests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["leave-requests", user?.id],
    queryFn: async () => {
      // Placeholder - would be actual API call
      return [];
    },
    enabled: !!user,
  });

  const createLeave = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Placeholder - would be actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { ...data, status: "pending" };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      setIsDialogOpen(false);
      setFormData({ startDate: "", endDate: "", leaveType: "sick", reason: "" });
      toast({
        title: "Leave Request Submitted",
        description: "Your request has been sent for approval.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createLeave.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff + 1;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/attendance")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Calendar className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Leave Management
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Request and manage time off
                  </p>
                </div>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
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
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Leave Type</Label>
                    <Select
                      value={formData.leaveType}
                      onValueChange={(value) => setFormData({ ...formData, leaveType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="annual">Annual Leave</SelectItem>
                        <SelectItem value="personal">Personal Leave</SelectItem>
                        <SelectItem value="emergency">Emergency Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Please provide a reason for your leave..."
                      rows={4}
                      required
                    />
                  </div>

                  {formData.startDate && formData.endDate && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Total days: <strong>{calculateDays(formData.startDate, formData.endDate)}</strong>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createLeave.isPending}
                      className="flex-1"
                    >
                      {createLeave.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Request"
                      )}
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
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
              <p className="text-3xl font-bold">{leaveRequests?.length || 0}</p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <p className="text-3xl font-bold text-green-600">
                {leaveRequests?.filter((r) => r.status === "approved").length || 0}
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-amber-600">
                {leaveRequests?.filter((r) => r.status === "pending").length || 0}
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Rejected</p>
              <p className="text-3xl font-bold text-red-600">
                {leaveRequests?.filter((r) => r.status === "rejected").length || 0}
              </p>
            </div>
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
          ) : leaveRequests && leaveRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isManager && <TableHead>Employee</TableHead>}
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      {isManager && (
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.userName}</p>
                            <p className="text-sm text-muted-foreground">{request.userId}</p>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>{new Date(request.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(request.endDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {calculateDays(request.startDate, request.endDate)} days
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{request.leaveType}</TableCell>
                      <TableCell className="max-w-md truncate">{request.reason}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {isManager && request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600">
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600">
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No leave requests found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "New Request" to submit your first leave application
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
