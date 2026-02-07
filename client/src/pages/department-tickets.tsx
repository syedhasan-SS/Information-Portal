import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  Search,
  Filter,
  Loader2,
  Building2,
  Clock,
  AlertCircle,
} from "lucide-react";

type Ticket = {
  id: string;
  ticketNumber: string;
  vendorHandle: string;
  department: string;
  issueType: string;
  subject: string;
  status: "New" | "Open" | "Pending" | "Solved" | "Closed";
  priorityTier: "Critical" | "High" | "Medium" | "Low";
  priorityBadge: "P0" | "P1" | "P2" | "P3";
  createdAt: Date;
  assigneeId: string | null;
  slaStatus: "on_track" | "at_risk" | "breached";
};

type User = {
  id: string;
  name: string;
  email: string;
};

export default function DepartmentTicketsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Fetch tickets for the user's department
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["department-tickets", user?.department],
    queryFn: async () => {
      if (!user?.department) return [];
      const res = await fetch(`/api/tickets?department=${user.department}`);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json() as Promise<Ticket[]>;
    },
    enabled: !!user?.department,
  });

  // Fetch users for assignee names
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<User[]>;
    },
  });

  // Create user map for quick lookup
  const userMap = users?.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {} as Record<string, User>) || {};

  // Filter tickets
  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.vendorHandle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priorityTier === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  }) || [];

  // Calculate statistics
  const stats = {
    total: filteredTickets.length,
    new: filteredTickets.filter((t) => t.status === "New").length,
    open: filteredTickets.filter((t) => t.status === "Open").length,
    pending: filteredTickets.filter((t) => t.status === "Pending").length,
    solved: filteredTickets.filter((t) => t.status === "Solved").length,
  };

  const getPriorityColor = (tier: string) => {
    switch (tier) {
      case "Critical": return "destructive";
      case "High": return "default";
      case "Medium": return "secondary";
      case "Low": return "outline";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "default";
      case "Open": return "default";
      case "Pending": return "secondary";
      case "Solved": return "outline";
      case "Closed": return "outline";
      default: return "secondary";
    }
  };

  const getSlaStatusIcon = (status: string) => {
    switch (status) {
      case "on_track": return <Clock className="h-4 w-4 text-green-600" />;
      case "at_risk": return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "breached": return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  if (!user?.department) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="p-6">
          <p className="text-muted-foreground">No department assigned to your account.</p>
        </Card>
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
                  <Building2 className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    {user.department} Department Tickets
                  </h1>
                  <p className="text-xs text-muted-foreground">View and manage department tickets</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Statistics */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Tickets</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">New</div>
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Open</div>
            <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Solved</div>
            <div className="text-2xl font-bold text-green-600">{stats.solved}</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ticket number, subject, or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Solved">Solved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Tickets Table */}
        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No tickets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/tickets/${ticket.id}`)}
                    >
                      <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                      <TableCell>{ticket.vendorHandle}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(ticket.status) as any}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(ticket.priorityTier) as any}>
                          {ticket.priorityBadge}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ticket.assigneeId ? userMap[ticket.assigneeId]?.name || "Unknown" : "Unassigned"}
                      </TableCell>
                      <TableCell>{getSlaStatusIcon(ticket.slaStatus)}</TableCell>
                      <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
}
