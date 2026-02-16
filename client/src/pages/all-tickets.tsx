import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
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
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowUpDown,
  Search,
  Filter,
  Loader2,
  TicketIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import type { Ticket, Category, Department, SubDepartment } from "@shared/schema";

async function getTickets(): Promise<Ticket[]> {
  const userEmail = localStorage.getItem("userEmail");
  const res = await fetch("/api/tickets", {
    headers: {
      ...(userEmail ? { "x-user-email": userEmail } : {}),
    },
  });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

async function getCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function getDepartments(): Promise<(Department & { subDepartments: SubDepartment[] })[]> {
  const res = await fetch("/api/departments/with-sub-departments");
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

async function getUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

const STATUSES = ["New", "Open", "Pending", "Solved", "Closed"] as const;
const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const ISSUE_TYPES = ["Complaint", "Request", "Information"] as const;
const SLA_STATUSES = ["on_track", "at_risk", "breached"] as const;

type SortField = "ticketNumber" | "subject" | "vendorHandle" | "department" | "issueType" | "status" | "priorityTier" | "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";

/**
 * Gets category display path with snapshot fallback
 * Priority: snapshot > live category > unknown
 */
function getCategoryDisplay(ticket: Ticket, categoryMap: Record<string, Category>): string {
  // V1: Use snapshot (preferred for backward compatibility)
  if (ticket.categorySnapshot?.path) {
    return ticket.categorySnapshot.path;
  }

  // V0: Fallback to live reference for old tickets
  const category = categoryMap[ticket.categoryId];
  if (category) {
    return `${category.l1} > ${category.l2} > ${category.l3}${category.l4 ? ` > ${category.l4}` : ''}`;
  }

  // Last resort: category was deleted and no snapshot exists
  return 'Unknown Category (Deleted)';
}

export default function AllTicketsPage() {
  const [, setLocation] = useLocation();
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<"open" | "solved">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState("");
  const [slaStatusFilter, setSlaStatusFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showBulkTransferDialog, setShowBulkTransferDialog] = useState(false);
  const [bulkTransferAssignee, setBulkTransferAssignee] = useState("");
  const [showBulkCommentDialog, setShowBulkCommentDialog] = useState(false);
  const [bulkComment, setBulkComment] = useState("");
  const [showBulkSolveDialog, setShowBulkSolveDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if user can view all tickets or only department tickets
  const canViewAllTickets = hasPermission("view:all_tickets");

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments-with-subs"],
    queryFn: getDepartments,
  });

  const categoryMap = categories?.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>) || {};

  // Bulk transfer mutation
  const bulkTransferMutation = useMutation({
    mutationFn: async ({ ticketIds, assigneeId }: { ticketIds: string[], assigneeId: string }) => {
      const results = await Promise.all(
        ticketIds.map(async (ticketId) => {
          const res = await fetch(`/api/tickets/${ticketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assigneeId,
              status: "Open",
            }),
          });
          if (!res.ok) throw new Error(`Failed to transfer ticket ${ticketId}`);
          return res.json();
        })
      );
      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setSelectedTickets(new Set());
      setShowBulkTransferDialog(false);
      setBulkTransferAssignee("");
      toast({
        title: "Success",
        description: `Successfully transferred ${variables.ticketIds.length} ticket(s)`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Bulk comment mutation
  const bulkCommentMutation = useMutation({
    mutationFn: async ({ ticketIds, comment }: { ticketIds: string[], comment: string }) => {
      const results = await Promise.all(
        ticketIds.map(async (ticketId) => {
          const res = await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticketId,
              userId: user?.id,
              comment,
              isInternal: false,
            }),
          });
          if (!res.ok) throw new Error(`Failed to add comment to ticket ${ticketId}`);
          return res.json();
        })
      );
      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setSelectedTickets(new Set());
      setShowBulkCommentDialog(false);
      setBulkComment("");
      toast({
        title: "Success",
        description: `Added comment to ${variables.ticketIds.length} ticket(s)`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Bulk solve mutation
  const bulkSolveMutation = useMutation({
    mutationFn: async (ticketIds: string[]) => {
      // Get current ticket data to check statuses
      const ticketsToSolve = tickets?.filter(t => ticketIds.includes(t.id)) || [];

      const results = await Promise.all(
        ticketsToSolve.map(async (ticket) => {
          try {
            // If ticket is "New", first transition to "Open", then to "Solved"
            if (ticket.status === "New") {
              // First update to Open
              const openRes = await fetch(`/api/tickets/${ticket.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Open" }),
              });
              if (!openRes.ok) {
                const errorData = await openRes.json();
                console.error(`Failed to open ticket ${ticket.id}:`, errorData);
                throw new Error(`Failed to open ticket ${ticket.ticketNumber}: ${errorData.error || 'Unknown error'}`);
              }
            }

            // Then update to Solved (works for all status types now)
            const res = await fetch(`/api/tickets/${ticket.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "Solved",
              }),
            });

            if (!res.ok) {
              const errorData = await res.json();
              console.error(`Failed to solve ticket ${ticket.id}:`, errorData);
              throw new Error(`Failed to solve ticket ${ticket.ticketNumber}: ${errorData.error || 'Unknown error'}`);
            }
            return res.json();
          } catch (error: any) {
            console.error(`Error processing ticket ${ticket.id}:`, error);
            throw error;
          }
        })
      );
      return results;
    },
    onSuccess: (_, ticketIds) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setSelectedTickets(new Set());
      setShowBulkSolveDialog(false);
      toast({
        title: "Success",
        description: `Marked ${ticketIds.length} ticket(s) as solved`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Bulk selection handlers
  const handleSelectTicket = (ticketId: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleSelectAll = (ticketIds: string[]) => {
    if (selectedTickets.size === ticketIds.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(ticketIds));
    }
  };

  const handleBulkTransfer = () => {
    if (selectedTickets.size === 0) {
      toast({ title: "No tickets selected", description: "Please select tickets to transfer", variant: "destructive" });
      return;
    }
    setShowBulkTransferDialog(true);
  };

  const handleBulkComment = () => {
    if (selectedTickets.size === 0) {
      toast({ title: "No tickets selected", description: "Please select tickets to add comment", variant: "destructive" });
      return;
    }
    setShowBulkCommentDialog(true);
  };

  const handleBulkSolve = () => {
    if (selectedTickets.size === 0) {
      toast({ title: "No tickets selected", description: "Please select tickets to solve", variant: "destructive" });
      return;
    }
    setShowBulkSolveDialog(true);
  };

  // Department-based ticket access filtering
  // Each agent/department can ONLY see their own department's tickets
  // This includes strict separation between Customer Support and Seller Support within CX
  const departmentFilteredTickets = useMemo(() => {
    if (!tickets || !user) return [];

    console.log("[All-Tickets] User:", user.email, "Department:", user.department, "Role:", user.role);
    console.log("[All-Tickets] Tickets received from API:", tickets.length);
    console.log("[All-Tickets] Departments in tickets:", [...new Set(tickets.map(t => t.department))]);

    // IMPORTANT: Backend already filters tickets by department
    // The API endpoint /api/tickets returns pre-filtered tickets based on user's department
    // We trust the backend filtering and just display what we receive

    // No client-side department filtering needed - backend handles it all
    console.log("[All-Tickets] Trusting backend filter - displaying all", tickets.length, "tickets");
    return tickets;
  }, [tickets, user, canViewAllTickets]);

  const filteredTickets = departmentFilteredTickets.filter((ticket) => {
    // Tab-based filtering: Open vs Solved
    if (activeTab === "open") {
      // Open tab: exclude Solved and Closed tickets
      if (ticket.status === "Solved" || ticket.status === "Closed") {
        return false;
      }
    } else if (activeTab === "solved") {
      // Solved tab: only show Solved and Closed tickets
      if (ticket.status !== "Solved" && ticket.status !== "Closed") {
        return false;
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !ticket.subject.toLowerCase().includes(query) &&
        !(ticket.vendorHandle || "").toLowerCase().includes(query) &&
        !(ticket.ticketNumber || "").toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    if (statusFilter.length > 0 && !statusFilter.includes(ticket.status)) {
      return false;
    }

    if (priorityFilter.length > 0 && !priorityFilter.includes(ticket.priorityTier)) {
      return false;
    }

    if (departmentFilter && ticket.department !== departmentFilter) {
      return false;
    }

    if (issueTypeFilter && ticket.issueType !== issueTypeFilter) {
      return false;
    }

    if (slaStatusFilter && ticket.slaStatus !== slaStatusFilter) {
      return false;
    }

    return true;
  }) || [];

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let aVal: string | number | Date = "";
    let bVal: string | number | Date = "";
    
    switch (sortField) {
      case "ticketNumber":
        aVal = a.ticketNumber || "";
        bVal = b.ticketNumber || "";
        break;
      case "subject":
        aVal = a.subject;
        bVal = b.subject;
        break;
      case "vendorHandle":
        aVal = a.vendorHandle || "";
        bVal = b.vendorHandle || "";
        break;
      case "department":
        aVal = a.department;
        bVal = b.department;
        break;
      case "status":
        aVal = a.status;
        bVal = b.status;
        break;
      case "priorityTier":
        const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        aVal = priorityOrder[a.priorityTier as keyof typeof priorityOrder];
        bVal = priorityOrder[b.priorityTier as keyof typeof priorityOrder];
        break;
      case "createdAt":
        aVal = new Date(a.createdAt);
        bVal = new Date(b.createdAt);
        break;
    }
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedTickets.length / pageSize);
  const paginatedTickets = sortedTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilter(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setPriorityFilter([]);
    setDepartmentFilter("");
    setIssueTypeFilter("");
    setSlaStatusFilter("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter.length > 0 || priorityFilter.length > 0 || departmentFilter || issueTypeFilter || slaStatusFilter || searchQuery;

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
                  <TicketIcon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    All Tickets
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {filteredTickets.length} tickets found
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedTickets.size > 0 && (
                <>
                  <Badge variant="secondary" className="px-3 py-1">
                    {selectedTickets.size} selected
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Bulk Actions
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleBulkTransfer}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Transfer to Assignee
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkComment}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Add Comment
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkSolve}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Solved
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTickets(new Set())}
                  >
                    Clear
                  </Button>
                </>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-64 pl-9"
                  data-testid="input-search"
                />
              </div>
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-filters"
              >
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
                    {statusFilter.length + priorityFilter.length + (departmentFilter ? 1 : 0) + (issueTypeFilter ? 1 : 0) + (slaStatusFilter ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 border-b">
          <Button
            variant={activeTab === "open" ? "default" : "ghost"}
            onClick={() => {
              setActiveTab("open");
              setCurrentPage(1);
              setSelectedTickets(new Set());
            }}
            className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary"
            data-active={activeTab === "open"}
          >
            Open Tickets
          </Button>
          <Button
            variant={activeTab === "solved" ? "default" : "ghost"}
            onClick={() => {
              setActiveTab("solved");
              setCurrentPage(1);
              setSelectedTickets(new Set());
            }}
            className="rounded-b-none border-b-2 border-transparent data-[active=true]:border-primary"
            data-active={activeTab === "solved"}
          >
            Solved Tickets
          </Button>
        </div>

        {showFilters && (
          <Card className="mb-6 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter.includes(status) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleStatusFilter(status)}
                      className={cn(
                        "h-7 text-xs",
                        statusFilter.includes(status) && "bg-accent text-accent-foreground"
                      )}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <div className="flex flex-wrap gap-1">
                  {PRIORITIES.map((priority) => (
                    <Button
                      key={priority}
                      variant={priorityFilter.includes(priority) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePriorityFilter(priority)}
                      className={cn(
                        "h-7 text-xs",
                        priorityFilter.includes(priority) && "bg-accent text-accent-foreground"
                      )}
                    >
                      {priority}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <Select value={departmentFilter} onValueChange={(val) => { setDepartmentFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-40">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departmentsData?.filter(d => d.isActive).map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Issue Type</label>
                <Select value={issueTypeFilter} onValueChange={(val) => { setIssueTypeFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="all">All Types</SelectItem>
                    {ISSUE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">SLA Status</label>
                <Select value={slaStatusFilter} onValueChange={(val) => { setSlaStatusFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="on_track">On Track</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="breached">Breached</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                  <X className="mr-1 h-3 w-3" />
                  Clear All
                </Button>
              )}
            </div>
          </Card>
        )}

        <Card>
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedTickets.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={paginatedTickets.length > 0 && selectedTickets.size === paginatedTickets.length}
                          onChange={() => handleSelectAll(paginatedTickets.map(t => t.id))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead className="w-32">
                        <Button variant="ghost" size="sm" onClick={() => handleSort("ticketNumber")} className="-ml-3 h-8">
                          Ticket ID
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("vendorHandle")} className="-ml-3 h-8">
                          Vendor
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("department")} className="-ml-3 h-8">
                          Department
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("issueType")} className="-ml-3 h-8">
                          Issue Type
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("priorityTier")} className="-ml-3 h-8">
                          Priority
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("status")} className="-ml-3 h-8">
                          Status
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>SLA Due</TableHead>
                      <TableHead>Aging</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort("updatedAt")} className="-ml-3 h-8">
                          Last Updated
                          <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTickets.map((ticket) => {
                      const agingDays = Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                      const categoryDisplay = getCategoryDisplay(ticket, categoryMap);

                      return (
                      <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTickets.has(ticket.id)}
                            onChange={() => handleSelectTicket(ticket.id)}
                            className="h-4 w-4 rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {ticket.ticketNumber || ticket.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {ticket.vendorHandle}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ticket.department}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {categoryDisplay}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.issueType}</Badge>
                        </TableCell>
                        <TableCell>{getPriorityBadge(ticket.priorityTier)}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell className="text-sm">
                          {ticket.assigneeId ? (
                            <span className="text-muted-foreground">
                              {users?.find(u => u.id === ticket.assigneeId)?.name || ticket.assigneeId.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ticket.slaResolveTarget ? (
                            <span className={new Date(ticket.slaResolveTarget) < new Date() ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {new Date(ticket.slaResolveTarget).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">No SLA</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={agingDays > 7 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                            {agingDays}d
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          Portal
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/tickets/${ticket.id}?from=all-tickets`)}
                            data-testid={`button-view-${ticket.id}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Show</span>
                  <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(parseInt(val)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <TicketIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground">No tickets found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "No tickets have been created yet"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </Card>
      </main>

      {/* Bulk Transfer Dialog */}
      <Dialog open={showBulkTransferDialog} onOpenChange={setShowBulkTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Tickets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Transfer {selectedTickets.size} selected ticket(s) to:
            </p>
            <div className="space-y-2">
              <Label htmlFor="bulk-assignee">Assign to</Label>
              <Select value={bulkTransferAssignee} onValueChange={setBulkTransferAssignee}>
                <SelectTrigger id="bulk-assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkTransferDialog(false);
                  setBulkTransferAssignee("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!bulkTransferAssignee) {
                    toast({
                      title: "No assignee selected",
                      description: "Please select an assignee",
                      variant: "destructive",
                    });
                    return;
                  }
                  bulkTransferMutation.mutate({
                    ticketIds: Array.from(selectedTickets),
                    assigneeId: bulkTransferAssignee,
                  });
                }}
                disabled={bulkTransferMutation.isPending || !bulkTransferAssignee}
              >
                {bulkTransferMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  "Transfer"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Comment Dialog */}
      <Dialog open={showBulkCommentDialog} onOpenChange={setShowBulkCommentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment to Tickets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add a comment to {selectedTickets.size} selected ticket(s):
            </p>
            <div className="space-y-2">
              <Label htmlFor="bulk-comment">Comment</Label>
              <Textarea
                id="bulk-comment"
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                placeholder="Enter your comment..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkCommentDialog(false);
                  setBulkComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!bulkComment.trim()) {
                    toast({
                      title: "Comment required",
                      description: "Please enter a comment",
                      variant: "destructive",
                    });
                    return;
                  }
                  bulkCommentMutation.mutate({
                    ticketIds: Array.from(selectedTickets),
                    comment: bulkComment,
                  });
                }}
                disabled={bulkCommentMutation.isPending || !bulkComment.trim()}
              >
                {bulkCommentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Comment"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Solve Dialog */}
      <Dialog open={showBulkSolveDialog} onOpenChange={setShowBulkSolveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Tickets as Solved</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to mark {selectedTickets.size} ticket(s) as solved?
            </p>
            <p className="text-sm text-muted-foreground">
              This will update the status to "Solved" and set the resolved date.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowBulkSolveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  bulkSolveMutation.mutate(Array.from(selectedTickets));
                }}
                disabled={bulkSolveMutation.isPending}
              >
                {bulkSolveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Solving...
                  </>
                ) : (
                  "Mark as Solved"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
