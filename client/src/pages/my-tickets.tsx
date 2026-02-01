import { useState, useEffect, useMemo } from "react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Check,
  ChevronsUpDown,
  X,
} from "lucide-react";
import type { Ticket, Category, Vendor, TicketFieldConfiguration } from "@shared/schema";

interface ResolvedField extends TicketFieldConfiguration {
  override?: {
    visibilityOverride: "visible" | "hidden" | null;
    requiredOverride: boolean | null;
  };
  effectiveVisibility: "visible" | "hidden";
  effectiveRequired: boolean;
}

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
    fleekOrderIds: "",
  });
  const [vendorComboOpen, setVendorComboOpen] = useState(false);
  const [orderIdsComboOpen, setOrderIdsComboOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [availableOrderIds, setAvailableOrderIds] = useState<string[]>([]);
  const [vendorSearchValue, setVendorSearchValue] = useState("");
  const [orderIdSearchValue, setOrderIdSearchValue] = useState("");
  const [resolvedFields, setResolvedFields] = useState<ResolvedField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
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

  // Fetch all field configurations for display order
  const { data: fieldConfigs } = useQuery({
    queryKey: ["field-configurations"],
    queryFn: async () => {
      const res = await fetch("/api/config/field-configurations");
      if (!res.ok) throw new Error("Failed to fetch field configurations");
      return res.json();
    },
  });

  // Get sorted visible fields based on displayOrder
  const sortedVisibleFields = useMemo(() => {
    if (!fieldConfigs) return [];
    return fieldConfigs
      .filter((f: any) => f.isEnabled)
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
  }, [fieldConfigs]);

  // Helper to get field config by name
  const getFieldConfig = (fieldName: string) => {
    return sortedVisibleFields.find((f: any) => f.fieldName === fieldName);
  };

  const categoryMap = categories?.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>) || {};

  const filteredCategories = categories?.filter((cat) => {
    if (newTicket.department && cat.l1 !== newTicket.department) return false;
    if (newTicket.issueType && cat.issueType !== newTicket.issueType) return false;
    return true;
  }) || [];

  // Fetch order IDs from BigQuery when vendor is selected
  useEffect(() => {
    const fetchOrderIds = async () => {
      if (newTicket.vendorHandle) {
        try {
          const res = await fetch(`/api/bigquery/vendor/${encodeURIComponent(newTicket.vendorHandle)}/order-ids?limit=100`);
          if (res.ok) {
            const orderIds = await res.json();
            setAvailableOrderIds(orderIds);
          } else {
            setAvailableOrderIds([]);
          }
        } catch (error) {
          console.error('Failed to fetch order IDs:', error);
          setAvailableOrderIds([]);
        }
      } else {
        setAvailableOrderIds([]);
        setSelectedOrderIds([]);
      }
    };

    fetchOrderIds();
  }, [newTicket.vendorHandle]);

  // Update fleekOrderIds string when selectedOrderIds changes
  useEffect(() => {
    setNewTicket(prev => ({
      ...prev,
      fleekOrderIds: selectedOrderIds.join(', ')
    }));
  }, [selectedOrderIds]);

  // Fetch resolved fields when category is selected
  useEffect(() => {
    const fetchResolvedFields = async () => {
      if (newTicket.categoryId) {
        setIsLoadingFields(true);
        try {
          const res = await fetch(`/api/config/categories/${encodeURIComponent(newTicket.categoryId)}/resolved-fields`);
          if (res.ok) {
            const fields = await res.json();
            setResolvedFields(fields);
          } else {
            setResolvedFields([]);
          }
        } catch (error) {
          console.error('Failed to fetch resolved fields:', error);
          setResolvedFields([]);
        } finally {
          setIsLoadingFields(false);
        }
      } else {
        setResolvedFields([]);
      }
    };

    fetchResolvedFields();
  }, [newTicket.categoryId]);

  // Helper function to check if a field should be visible
  const isFieldVisible = (fieldName: string): boolean => {
    // If we have resolved fields (category selected), use those
    if (resolvedFields.length > 0) {
      const field = resolvedFields.find(f => f.fieldName === fieldName);
      if (!field) return true; // Field not in resolved config, show it
      return field.effectiveVisibility === "visible";
    }
    // Otherwise, use base field config
    const baseField = getFieldConfig(fieldName);
    if (!baseField) return true; // Field not found, show it
    return baseField.isEnabled;
  };

  // Helper function to check if a field is required
  const isFieldRequired = (fieldName: string): boolean => {
    // If we have resolved fields (category selected), use those
    if (resolvedFields.length > 0) {
      const field = resolvedFields.find(f => f.fieldName === fieldName);
      if (!field) return false; // Field not in config, not required
      return field.effectiveRequired;
    }
    // Otherwise, use base field config
    const baseField = getFieldConfig(fieldName);
    if (!baseField) return false; // Field not found
    return baseField.isRequired;
  };

  // Helper function to get field label
  const getFieldLabel = (fieldName: string): string => {
    const baseField = getFieldConfig(fieldName);
    return baseField?.fieldLabel || fieldName;
  };

  // Helper function to get field display order
  const getFieldOrder = (fieldName: string): number => {
    const baseField = getFieldConfig(fieldName);
    return baseField?.displayOrder || 999;
  };

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

      // Parse comma-separated Fleek Order IDs into array
      const fleekOrderIdsArray = ticketData.fleekOrderIds
        ? ticketData.fleekOrderIds.split(',').map(id => id.trim()).filter(id => id.length > 0)
        : [];

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorHandle: ticketData.vendorHandle,
          department: ticketData.department,
          issueType: ticketData.issueType,
          categoryId: ticketData.categoryId,
          subject: ticketData.subject,
          description: ticketData.description,
          fleekOrderIds: fleekOrderIdsArray.length > 0 ? fleekOrderIdsArray : null,
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
      setNewTicket({ vendorHandle: "", department: "", issueType: "", categoryId: "", subject: "", description: "", fleekOrderIds: "" });
      setSelectedOrderIds([]);
      setAvailableOrderIds([]);
      setResolvedFields([]);
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
                    <TableHead className="w-32">Ticket ID</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>SLA Due</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTickets.map((ticket) => {
                    const category = categories?.find(c => c.id === ticket.categoryId);
                    const agingDays = Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24));

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
                        {category ? `${category.l1} > ${category.l2} > ${category.l3}${category.l4 ? ` > ${category.l4}` : ''}` : 'N/A'}
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

      <Dialog open={showNewTicketDialog} onOpenChange={(open) => {
        setShowNewTicketDialog(open);
        if (!open) {
          setResolvedFields([]);
        }
      }}>
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
            {/* Render fields dynamically based on display order from Ticket Fields Manager */}
            {sortedVisibleFields.map((fieldConfig: any) => {
              const fieldName = fieldConfig.fieldName;
              if (!isFieldVisible(fieldName)) return null;

              // Vendor Handle field
              if (fieldName === "vendorHandle") {
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="vendorHandle">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
                    <Popover
                      open={vendorComboOpen}
                      onOpenChange={(open) => {
                        setVendorComboOpen(open);
                        if (!open) setVendorSearchValue("");
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={vendorComboOpen}
                          className="w-full justify-between font-normal"
                          data-testid="select-vendor"
                        >
                          {newTicket.vendorHandle || "Select or type vendor handle..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search vendor handle or name..."
                            value={vendorSearchValue}
                            onValueChange={setVendorSearchValue}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <p className="text-sm text-muted-foreground p-2">
                                No vendor found. You can type manually in the field below.
                              </p>
                            </CommandEmpty>
                            <CommandGroup>
                              {vendors
                                ?.filter((v) => {
                                  if (!vendorSearchValue) return true;
                                  const search = vendorSearchValue.toLowerCase();
                                  return (
                                    v.handle.toLowerCase().includes(search) ||
                                    v.name.toLowerCase().includes(search)
                                  );
                                })
                                .map((v) => (
                                  <CommandItem
                                    key={v.handle}
                                    value={v.handle}
                                    onSelect={() => {
                                      setNewTicket({ ...newTicket, vendorHandle: v.handle });
                                      setVendorComboOpen(false);
                                      setVendorSearchValue("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        newTicket.vendorHandle === v.handle ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {v.handle} - {v.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Input
                      value={newTicket.vendorHandle}
                      onChange={(e) => setNewTicket({ ...newTicket, vendorHandle: e.target.value })}
                      placeholder="Or type vendor handle manually"
                      className="text-sm"
                    />
                  </div>
                );
              }

              // Department field
              if (fieldName === "department") {
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="department">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
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
                );
              }

              // Issue Type field
              if (fieldName === "issueType") {
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="issueType">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
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
                );
              }

              // Category field
              if (fieldName === "categoryId") {
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="category">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
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
                );
              }

              // Subject field
              if (fieldName === "subject") {
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="subject">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
                    <Input
                      id="subject"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      placeholder={fieldConfig.metadata?.placeholder || "Brief summary of the issue"}
                      data-testid="input-subject"
                    />
                  </div>
                );
              }

              // Description field
              if (fieldName === "description") {
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="description">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
                    <Textarea
                      id="description"
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      placeholder={fieldConfig.metadata?.placeholder || "Detailed description of the issue..."}
                      rows={4}
                      data-testid="input-description"
                    />
                  </div>
                );
              }

              // Fleek Order IDs field
              if (fieldName === "fleekOrderIds") {
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="fleekOrderIds">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
                    <Popover
                      open={orderIdsComboOpen}
                      onOpenChange={(open) => {
                        setOrderIdsComboOpen(open);
                        if (!open) setOrderIdSearchValue("");
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={orderIdsComboOpen}
                          className="w-full justify-between font-normal h-auto min-h-10"
                          data-testid="select-order-ids"
                          disabled={!newTicket.vendorHandle}
                        >
                          <div className="flex flex-wrap gap-1 flex-1">
                            {selectedOrderIds.length > 0 ? (
                              selectedOrderIds.map((orderId) => (
                                <Badge key={orderId} variant="secondary" className="gap-1">
                                  {orderId}
                                  <X
                                    className="h-3 w-3 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
                                    }}
                                  />
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">
                                {newTicket.vendorHandle ? "Select or type order IDs..." : "Select vendor first"}
                              </span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search or type order ID..."
                            value={orderIdSearchValue}
                            onValueChange={setOrderIdSearchValue}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="p-2">
                                <p className="text-sm text-muted-foreground mb-2">
                                  {availableOrderIds.length === 0 && newTicket.vendorHandle
                                    ? "No order IDs found for this vendor in BigQuery"
                                    : "Type to manually enter order ID"}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-full"
                                  onClick={() => {
                                    const value = orderIdSearchValue.trim();
                                    if (value && !selectedOrderIds.includes(value)) {
                                      setSelectedOrderIds(prev => [...prev, value]);
                                      setOrderIdSearchValue("");
                                    }
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add manually
                                </Button>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {availableOrderIds
                                .filter((orderId) => {
                                  if (!orderIdSearchValue) return true;
                                  return orderId.toLowerCase().includes(orderIdSearchValue.toLowerCase());
                                })
                                .map((orderId) => (
                                  <CommandItem
                                    key={orderId}
                                    value={orderId}
                                    onSelect={(value) => {
                                      setSelectedOrderIds(prev =>
                                        prev.includes(value)
                                          ? prev.filter(id => id !== value)
                                          : [...prev, value]
                                      );
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedOrderIds.includes(orderId) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {orderId}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Select from available order IDs or type manually. Multiple selections allowed.
                    </p>
                  </div>
                );
              }

              // Skip unknown fields
              return null;
            })}

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
                  isLoadingFields ||
                  (isFieldRequired("vendorHandle") && !newTicket.vendorHandle) ||
                  (isFieldRequired("department") && !newTicket.department) ||
                  (isFieldRequired("issueType") && !newTicket.issueType) ||
                  (isFieldRequired("categoryId") && !newTicket.categoryId) ||
                  (isFieldRequired("subject") && !newTicket.subject) ||
                  (isFieldRequired("description") && !newTicket.description) ||
                  (isFieldRequired("fleekOrderIds") && selectedOrderIds.length === 0)
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
