import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  TicketIcon,
  User,
  Plus,
} from "lucide-react";
import type { Ticket, Category, Vendor } from "@shared/schema";

async function getTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/tickets");
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

async function getCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function getVendors(): Promise<Vendor[]> {
  const res = await fetch("/api/vendors");
  if (!res.ok) throw new Error("Failed to fetch vendors");
  return res.json();
}

const DEPARTMENTS = ["Finance", "Operations", "Marketplace", "Tech", "Experience", "CX", "Seller Support"] as const;
const ISSUE_TYPES = ["Complaint", "Request", "Information"] as const;

export default function MyTicketsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"created" | "assigned">("created");
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [newTicket, setNewTicket] = useState({
    vendorHandle: "",
    department: "",
    issueType: "",
    categoryId: "",
    subject: "",
    description: "",
    fleekOrderId: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
  });

  const categoryMap = categories?.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>) || {};

  const filteredCategories = categories?.filter((cat) => {
    if (newTicket.department && cat.l1 !== newTicket.department) return false;
    if (newTicket.issueType && cat.issueType !== newTicket.issueType) return false;
    return true;
  }) || [];

  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: typeof newTicket) => {
      const category = categories?.find((c) => c.id === ticketData.categoryId);
      const vendor = vendors?.find((v) => v.handle === ticketData.vendorHandle);
      const openTicketCount = tickets?.filter((t) => 
        t.vendorHandle === ticketData.vendorHandle && 
        ["New", "Open", "Pending"].includes(t.status)
      ).length || 0;

      const gmvPoints = { Platinum: 40, XL: 40, Gold: 30, L: 30, Silver: 20, M: 20, Bronze: 10, S: 10 }[vendor?.gmvTier || "S"] || 10;
      const ticketHistoryPoints = Math.min(openTicketCount * 5, 20);
      const issuePoints = category?.issuePriorityPoints || 10;
      const priorityScore = gmvPoints + ticketHistoryPoints + issuePoints;
      
      let priorityTier: "Critical" | "High" | "Medium" | "Low";
      let priorityBadge: "P0" | "P1" | "P2" | "P3";
      if (priorityScore >= 70) { priorityTier = "Critical"; priorityBadge = "P0"; }
      else if (priorityScore >= 50) { priorityTier = "High"; priorityBadge = "P1"; }
      else if (priorityScore >= 30) { priorityTier = "Medium"; priorityBadge = "P2"; }
      else { priorityTier = "Low"; priorityBadge = "P3"; }

      const ticketNumber = `ESC-${Date.now().toString(36).toUpperCase()}`;
      
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ticketData,
          ticketNumber,
          status: "New",
          priorityScore,
          priorityTier,
          priorityBadge,
          priorityBreakdown: {
            vendorTicketVolume: openTicketCount,
            vendorGmvTier: vendor?.gmvTier || "S",
            issuePriorityPoints: issuePoints,
            gmvPoints,
            ticketHistoryPoints,
            issuePoints,
          },
          ownerTeam: ticketData.department,
          slaStatus: "on_track",
        }),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowNewTicketDialog(false);
      setNewTicket({ vendorHandle: "", department: "", issueType: "", categoryId: "", subject: "", description: "", fleekOrderId: "" });
      toast({ title: "Success", description: "Ticket created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Note: In production, filter by current logged-in user ID
  // For now, showing all tickets with createdById/assigneeId set
  const createdTickets = tickets?.filter((t) => t.createdById) || [];
  const assignedTickets = tickets?.filter((t) => t.assigneeId) || [];

  const displayedTickets = activeTab === "created" ? createdTickets : assignedTickets;

  const getSlaStatusBadge = (status?: string | null) => {
    switch (status) {
      case "on_track":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">On Track</Badge>;
      case "at_risk":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">At Risk</Badge>;
      case "breached":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Breached</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      Critical: "bg-red-500 text-white",
      High: "bg-orange-500 text-white",
      Medium: "bg-amber-500 text-black",
      Low: "bg-green-500 text-white",
    };
    return <Badge className={colors[priority]}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      New: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      Open: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      Pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      Solved: "bg-green-500/10 text-green-600 border-green-500/20",
      Closed: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    };
    return <Badge className={cn("border", colors[status])} variant="outline">{status}</Badge>;
  };

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
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <User className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    My Tickets
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    View tickets you created or are assigned to
                  </p>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setShowNewTicketDialog(true)}
              data-testid="button-create-ticket"
            >
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6 flex gap-2">
          <Button
            variant={activeTab === "created" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("created")}
            data-testid="tab-created"
          >
            <TicketIcon className="mr-2 h-4 w-4" />
            Tickets I Created
            <Badge variant="outline" className="ml-2">{createdTickets.length}</Badge>
          </Button>
          <Button
            variant={activeTab === "assigned" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("assigned")}
            data-testid="tab-assigned"
          >
            <User className="mr-2 h-4 w-4" />
            Assigned to Me
            <Badge variant="outline" className="ml-2">{assignedTickets.length}</Badge>
          </Button>
        </div>

        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayedTickets.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Ticket #</TableHead>
                    <TableHead className="min-w-[200px]">Subject</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>SLA Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTickets.map((ticket) => (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                      <TableCell className="font-mono text-sm">
                        {ticket.ticketNumber || ticket.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px] truncate font-medium">{ticket.subject}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {ticket.vendorHandle}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ticket.department}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>{getPriorityBadge(ticket.priorityTier)}</TableCell>
                      <TableCell>{getSlaStatusBadge(ticket.slaStatus)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/tickets/${ticket.id}`)}
                          data-testid={`button-view-${ticket.id}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <TicketIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground">No tickets found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === "created"
                  ? "You haven't created any tickets yet"
                  : "No tickets have been assigned to you"}
              </p>
            </div>
          )}
        </Card>
      </main>

      <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTicketMutation.mutate(newTicket);
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vendorHandle">Vendor</Label>
                <Select
                  value={newTicket.vendorHandle}
                  onValueChange={(val) => setNewTicket({ ...newTicket, vendorHandle: val })}
                >
                  <SelectTrigger data-testid="select-vendor">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map((v) => (
                      <SelectItem key={v.handle} value={v.handle}>
                        {v.handle} - {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={newTicket.department}
                  onValueChange={(val) => setNewTicket({ ...newTicket, department: val, categoryId: "" })}
                >
                  <SelectTrigger data-testid="select-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueType">Issue Type</Label>
                <Select
                  value={newTicket.issueType}
                  onValueChange={(val) => setNewTicket({ ...newTicket, issueType: val, categoryId: "" })}
                >
                  <SelectTrigger data-testid="select-issue-type">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTicket.categoryId}
                  onValueChange={(val) => setNewTicket({ ...newTicket, categoryId: val })}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.l3} {c.l4 && `> ${c.l4}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief summary of the issue"
                data-testid="input-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Detailed description of the issue..."
                rows={4}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fleekOrderId">Fleek Order ID (optional)</Label>
              <Input
                id="fleekOrderId"
                value={newTicket.fleekOrderId}
                onChange={(e) => setNewTicket({ ...newTicket, fleekOrderId: e.target.value })}
                placeholder="e.g., ORD-123456"
                data-testid="input-order-id"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewTicketDialog(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={
                  createTicketMutation.isPending ||
                  !newTicket.vendorHandle ||
                  !newTicket.department ||
                  !newTicket.issueType ||
                  !newTicket.categoryId ||
                  !newTicket.subject ||
                  !newTicket.description
                }
                data-testid="button-submit-ticket"
              >
                {createTicketMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Ticket"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
