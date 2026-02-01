import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { Ticket, Category } from "@shared/schema";

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

const STATUSES = ["New", "Open", "Pending", "Solved", "Closed"] as const;
const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
const DEPARTMENTS = ["Finance", "Operations", "Marketplace", "Tech", "Experience", "CX", "Seller Support"] as const;
const ISSUE_TYPES = ["Complaint", "Request", "Information"] as const;
const SLA_STATUSES = ["on_track", "at_risk", "breached"] as const;

type SortField = "ticketNumber" | "subject" | "vendorHandle" | "department" | "status" | "priorityTier" | "createdAt";
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

  const categoryMap = categories?.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>) || {};

  // Department-based ticket access filtering
  // Seller Support agents see Seller Support tickets
  // Customer Support agents see Customer Support/CX tickets
  // Other department agents see only their department's tickets
  const departmentFilteredTickets = useMemo(() => {
    if (!tickets || !user) return [];

    // If user has view:all_tickets, show all tickets
    if (canViewAllTickets) {
      return tickets;
    }

    // Filter based on user's department/sub-department
    return tickets.filter((ticket) => {
      // Seller Support users (sub-department of CX) see Seller Support tickets
      if (user.subDepartment === "Seller Support") {
        // Seller Support tickets are marked with department containing "Seller Support" or specific category
        return ticket.department === "Seller Support" ||
               ticket.department === "CX" ||
               (ticket.categorySnapshot?.path?.includes("Seller") ?? false);
      }

      // CX/Customer Support users (not Seller Support) see Customer Support tickets
      if (user.department === "CX" && user.subDepartment !== "Seller Support") {
        return ticket.department === "CX" ||
               ticket.department === "Customer Support" ||
               ticket.department === "Experience";
      }

      // Other department users see only their department's tickets
      if (user.department) {
        return ticket.department === user.department;
      }

      // If no department, show nothing (or could show all assigned to them)
      return false;
    });
  }, [tickets, user, canViewAllTickets]);

  const filteredTickets = departmentFilteredTickets.filter((ticket) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !ticket.subject.toLowerCase().includes(query) &&
        !ticket.vendorHandle.toLowerCase().includes(query) &&
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
        aVal = a.vendorHandle;
        bVal = b.vendorHandle;
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
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
                  <SelectContent>
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
                  <SelectContent>
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
                          {ticket.assignedAgentId ? (
                            <span className="text-muted-foreground">
                              {ticket.assignedAgentId.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ticket.slaDueDate ? (
                            <span className={new Date(ticket.slaDueDate) < new Date() ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {new Date(ticket.slaDueDate).toLocaleDateString()}
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
                          {ticket.source || 'Portal'}
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
                    <SelectContent>
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
    </div>
  );
}
