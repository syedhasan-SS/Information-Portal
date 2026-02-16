import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Settings,
  ChevronDown,
  MessageSquare,
  CheckCircle,
  UserPlus,
} from "lucide-react";
import type { Ticket, Category, Vendor, TicketFieldConfiguration } from "@shared/schema";
import { getUserColumnPreferences, updateUserColumnPreferences } from "@/lib/api";

interface ResolvedField extends TicketFieldConfiguration {
  override?: {
    visibilityOverride: "visible" | "hidden" | null;
    requiredOverride: boolean | null;
  };
  effectiveVisibility: "visible" | "hidden";
  effectiveRequired: boolean;
}

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

// Unified ticket config type from the new category system
type TicketConfig = {
  id: string;
  issueType: "Complaint" | "Request" | "Information";
  l1: string;
  l2: string;
  l3: string;
  l4: string | null;
  description: string;
  departmentType: "Seller Support" | "Customer Support" | "All";
  isActive: boolean;
  slaResponseHours: number | null;
  slaResolutionHours: number;
};

async function getTicketConfigs(): Promise<TicketConfig[]> {
  const res = await fetch("/api/config/ticket-configs");
  if (!res.ok) throw new Error("Failed to fetch ticket configs");
  return res.json();
}

// Keep old categories API as fallback
async function getCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function getCategoriesForTicketCreation(filters?: { departmentType?: string }): Promise<(Category & { departmentType: string })[]> {
  const params = new URLSearchParams();
  if (filters?.departmentType) params.append('departmentType', filters.departmentType);

  const url = `/api/categories/for-ticket-creation${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch categories for ticket creation");
  return res.json();
}

async function getVendors(): Promise<Vendor[]> {
  const res = await fetch("/api/vendors");
  if (!res.ok) throw new Error("Failed to fetch vendors");
  return res.json();
}

async function getUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

const DEPARTMENTS = ["Finance", "Operations", "Marketplace", "Tech", "Experience", "CX"] as const;
const ISSUE_TYPES = ["Complaint", "Request", "Information"] as const;

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

export default function MyTicketsPage() {
  const [, setLocation] = useLocation();
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<"created" | "assigned" | "solved">("created");
  const [createdSubTab, setCreatedSubTab] = useState<"all" | "new" | "open" | "assigned" | "solved">("all");
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [newTicket, setNewTicket] = useState({
    vendorHandle: "",
    customer: "",
    department: "",
    issueType: "",
    categoryId: "",
    subject: "",
    description: "",
    fleekOrderIds: "",
  });
  const [vendorComboOpen, setVendorComboOpen] = useState(false);
  const [orderIdsComboOpen, setOrderIdsComboOpen] = useState(false);
  const [categoryComboOpen, setCategoryComboOpen] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [availableOrderIds, setAvailableOrderIds] = useState<string[]>([]);
  const [vendorSearchValue, setVendorSearchValue] = useState("");
  const [orderIdSearchValue, setOrderIdSearchValue] = useState("");
  const [categorySearchValue, setCategorySearchValue] = useState("");
  const [resolvedFields, setResolvedFields] = useState<ResolvedField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [tempColumns, setTempColumns] = useState<string[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showBulkTransferDialog, setShowBulkTransferDialog] = useState(false);
  const [bulkTransferAssignee, setBulkTransferAssignee] = useState("");
  const [showBulkCommentDialog, setShowBulkCommentDialog] = useState(false);
  const [bulkComment, setBulkComment] = useState("");
  const [showBulkSolveDialog, setShowBulkSolveDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast} = useToast();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  // Fetch user's column preferences
  const { data: columnPreferences } = useQuery({
    queryKey: ["column-preferences", user?.id],
    queryFn: () => getUserColumnPreferences(user!.id),
    enabled: !!user,
  });

  // Fetch categories from categoryHierarchy filtered by user's departmentType
  const userDepartmentType = useMemo(() => {
    if (!user) return undefined;

    // CX department with subdepartment (Customer Support or Seller Support)
    if (user.department === "CX" && user.subDepartment) {
      return user.subDepartment; // "Customer Support" or "Seller Support"
    }

    // Owner and Admin roles should see all fields (treat as "All")
    // This allows them to create tickets for any department type
    if (user.role === "Owner" || user.role === "Admin") {
      return "All";
    }

    return undefined;
  }, [user]);

  const { data: categories } = useQuery({
    queryKey: ["categories-for-ticket", userDepartmentType],
    queryFn: () => getCategoriesForTicketCreation({
      departmentType: userDepartmentType
    }),
    enabled: !!user,
  });

  // Fetch unified ticket configs from the new category system
  const { data: ticketConfigs } = useQuery({
    queryKey: ["ticket-configs"],
    queryFn: getTicketConfigs,
  });

  const { data: vendors } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
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

  // Get ALL enabled fields sorted by displayOrder
  // Visibility is controlled by isFieldVisible() which considers:
  // 1. Category-level overrides (if category selected)
  // 2. User's department type (default visibility)
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

  // Categories are already filtered by departmentType from the API
  // Just need to filter by issueType from form selection
  const availableCategories = useMemo(() => {
    if (!categories || !user) return [];

    console.log(`[Available Categories] Total categories from API: ${categories.length}`);
    console.log(`[Available Categories] User: ${user.email}, Dept: ${user.department}, SubDept: ${user.subDepartment}`);

    if (categories.length > 0) {
      const breakdown = categories.reduce((acc, cat) => {
        const type = (cat as any).departmentType || "Unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('[Available Categories] Breakdown by departmentType:', breakdown);
    }

    // Categories are already filtered by departmentType at API level
    // No need for additional filtering here
    return categories;
  }, [categories, user]);

  const categoryMap = availableCategories.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, typeof availableCategories[0]>) || {};

  const filteredCategories = useMemo(() => {
    const filtered = availableCategories.filter((cat) => {
      // Filter by Department (L1) - optional cascading filter
      if (newTicket.department && cat.l1 !== newTicket.department) return false;

      // Note: issueType is a form field but NOT associated with categories in categoryHierarchy
      // Categories are pre-filtered by departmentType at API level
      // No issueType filtering needed here

      return true;
    });

    console.log(`[Category Filter] Total available categories: ${availableCategories.length}, Filtered: ${filtered.length}`);
    if (filtered.length > 0) {
      console.log(`[Category Filter] Sample filtered categories:`, filtered.slice(0, 3).map(c => ({ l1: c.l1, l2: c.l2, l3: c.l3 })));
    }

    return filtered;
  }, [availableCategories, newTicket.department]);

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
          // Pass departmentType to get department-specific fields
          const params = new URLSearchParams();
          if (userDepartmentType) {
            params.append('departmentType', userDepartmentType);
          }
          const url = `/api/config/categories/${encodeURIComponent(newTicket.categoryId)}/resolved-fields${params.toString() ? '?' + params.toString() : ''}`;

          console.log(`[Resolved Fields] Fetching for category ${newTicket.categoryId}, departmentType: ${userDepartmentType}`);
          const res = await fetch(url);
          if (res.ok) {
            const fields = await res.json();
            console.log(`[Resolved Fields] Received ${fields.length} fields`);
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
  }, [newTicket.categoryId, userDepartmentType]);

  // Helper function to check if a field should be visible
  // Priority: 1) Category override (if category selected), 2) User department type default
  const isFieldVisible = (fieldName: string): boolean => {
    // ALWAYS show core required fields regardless of configuration
    // These are essential for ticket creation and must never be hidden
    const coreRequiredFields = ["subject", "description", "department", "issueType", "categoryId"];
    if (coreRequiredFields.includes(fieldName)) {
      return true;
    }

    // If we have resolved fields (category selected), ONLY use those
    // This ensures category-specific field visibility is respected
    if (resolvedFields.length > 0) {
      const field = resolvedFields.find(f => f.fieldName === fieldName);
      if (field) {
        // Category has field configuration - use its effective visibility
        return field.effectiveVisibility === "visible";
      }
      // Field not in resolved fields for this category - hide it by default
      // This prevents fields irrelevant to the category from showing
      return false;
    }

    // No category selected yet - default visibility based on user's department type
    const baseField = sortedVisibleFields.find((f: any) => f.fieldName === fieldName);
    if (!baseField) return false; // Field not found

    const fieldDeptType = baseField.departmentType || "All";

    // If user has "All" department type (Owner, Admin), show all fields
    if (userDepartmentType === "All") {
      return true;
    }

    // Show if field is for "All" departments OR matches user's department type
    return fieldDeptType === "All" || fieldDeptType === userDepartmentType;
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

      // Don't generate ticket number on client - let server handle it
      // const ticketNumber = `ESC-${Date.now().toString(36).toUpperCase()}`;

      // Parse comma-separated Fleek Order IDs into array
      const fleekOrderIdsArray = ticketData.fleekOrderIds
        ? ticketData.fleekOrderIds.split(',').map(id => id.trim()).filter(id => id.length > 0)
        : [];

      console.log('📝 Creating ticket with data:', {
        categoryId: ticketData.categoryId,
        department: ticketData.department,
        issueType: ticketData.issueType,
        subject: ticketData.subject,
      });

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorHandle: ticketData.vendorHandle || null,
          customer: ticketData.customer || null,
          department: ticketData.department,
          issueType: ticketData.issueType,
          categoryId: ticketData.categoryId || undefined,
          subject: ticketData.subject.trim(),
          description: ticketData.description.trim(),
          fleekOrderIds: fleekOrderIdsArray.length > 0 ? fleekOrderIdsArray : null,
          // ticketNumber removed - let server generate it
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
          createdById: user?.id, // Track who created the ticket
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Server error response:', errorData);
        throw new Error(errorData.error || `Failed to create ticket (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setShowNewTicketDialog(false);
      setNewTicket({ vendorHandle: "", customer: "", department: "", issueType: "", categoryId: "", subject: "", description: "", fleekOrderIds: "" });
      setSelectedOrderIds([]);
      setAvailableOrderIds([]);
      setResolvedFields([]);
      toast({ title: "Success", description: "Ticket created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Column preferences mutation
  const updateColumnsMutation = useMutation({
    mutationFn: async (visibleColumns: string[]) => {
      if (!user) throw new Error("User not found");
      return updateUserColumnPreferences(user.id, visibleColumns);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-preferences", user?.id] });
      setShowColumnSettings(false);
      toast({ title: "Success", description: "Column preferences saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
              status: "Open", // Set to Open when assigning
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

  // Filter tickets by current logged-in user
  const createdTickets = tickets?.filter((t) => t.createdById === user?.id) || [];

  // Assigned tickets - exclude solved/closed tickets
  const assignedTickets = tickets?.filter((t) =>
    t.assigneeId === user?.id &&
    t.status !== "Solved" &&
    t.status !== "Closed"
  ) || [];

  // Solved tickets - tickets that user created OR was assigned to
  const solvedTickets = tickets?.filter((t) =>
    (t.createdById === user?.id || t.assigneeId === user?.id) &&
    (t.status === "Solved" || t.status === "Closed")
  ) || [];

  // Sub-filter created tickets based on workflow status
  const filteredCreatedTickets = useMemo(() => {
    if (activeTab !== "created") return createdTickets;

    switch (createdSubTab) {
      case "new":
        // New: Assigned to dept but not to a team member
        return createdTickets.filter(t => t.status === "New" && !t.assigneeId);
      case "open":
        // Open: Claimed and assigned to someone
        return createdTickets.filter(t => t.status === "Open" && t.assigneeId);
      case "assigned":
        // All assigned tickets (exclude solved/closed)
        return createdTickets.filter(t => t.assigneeId && t.status !== "Solved" && t.status !== "Closed");
      case "solved":
        // All solved tickets created by user
        return createdTickets.filter(t => t.status === "Solved" || t.status === "Closed");
      case "all":
      default:
        return createdTickets;
    }
  }, [createdTickets, createdSubTab, activeTab]);

  const displayedTickets = activeTab === "created"
    ? filteredCreatedTickets
    : activeTab === "assigned"
      ? assignedTickets
      : solvedTickets;

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

  // Column configuration
  const visibleColumns = columnPreferences?.visibleColumns || [];
  const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId);

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

            <div className="flex gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempColumns(columnPreferences?.visibleColumns || []);
                  setShowColumnSettings(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
              {hasPermission("create:tickets") && (
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => setShowNewTicketDialog(true)}
                  data-testid="button-create-ticket"
                >
                  <Plus className="h-4 w-4" />
                  New Ticket
                </Button>
              )}
            </div>
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
          <Button
            variant={activeTab === "solved" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("solved")}
            data-testid="tab-solved"
          >
            <Check className="mr-2 h-4 w-4" />
            Solved Tickets
            <Badge variant="outline" className="ml-2">{solvedTickets.length}</Badge>
          </Button>
        </div>

        {/* Sub-tabs for "Tickets I Created" */}
        {activeTab === "created" && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            <Button
              size="sm"
              variant={createdSubTab === "all" ? "default" : "outline"}
              onClick={() => setCreatedSubTab("all")}
              className="whitespace-nowrap"
            >
              All Tickets
              <Badge variant="secondary" className="ml-2 bg-background">{createdTickets.length}</Badge>
            </Button>
            <Button
              size="sm"
              variant={createdSubTab === "new" ? "default" : "outline"}
              onClick={() => setCreatedSubTab("new")}
              className="whitespace-nowrap"
            >
              New
              <Badge variant="secondary" className="ml-2 bg-background">
                {createdTickets.filter(t => t.status === "New" && !t.assigneeId).length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={createdSubTab === "open" ? "default" : "outline"}
              onClick={() => setCreatedSubTab("open")}
              className="whitespace-nowrap"
            >
              Open
              <Badge variant="secondary" className="ml-2 bg-background">
                {createdTickets.filter(t => t.status === "Open" && t.assigneeId).length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={createdSubTab === "assigned" ? "default" : "outline"}
              onClick={() => setCreatedSubTab("assigned")}
              className="whitespace-nowrap"
            >
              Assigned
              <Badge variant="secondary" className="ml-2 bg-background">
                {createdTickets.filter(t => t.assigneeId).length}
              </Badge>
            </Button>
            <Button
              size="sm"
              variant={createdSubTab === "solved" ? "default" : "outline"}
              onClick={() => setCreatedSubTab("solved")}
              className="whitespace-nowrap"
            >
              Solved
              <Badge variant="secondary" className="ml-2 bg-background">
                {createdTickets.filter(t => t.status === "Solved").length}
              </Badge>
            </Button>
          </div>
        )}

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
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={displayedTickets.length > 0 && selectedTickets.size === displayedTickets.length}
                        onChange={() => handleSelectAll(displayedTickets.map(t => t.id))}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    {isColumnVisible("ticketId") && <TableHead className="w-32">Ticket ID</TableHead>}
                    {isColumnVisible("vendor") && <TableHead>Vendor</TableHead>}
                    {isColumnVisible("customer") && <TableHead>Customer</TableHead>}
                    {isColumnVisible("department") && <TableHead>Department</TableHead>}
                    {isColumnVisible("category") && <TableHead>Category</TableHead>}
                    {isColumnVisible("issueType") && <TableHead>Issue Type</TableHead>}
                    {isColumnVisible("priority") && <TableHead>Priority</TableHead>}
                    {isColumnVisible("status") && <TableHead>Status</TableHead>}
                    {isColumnVisible("assignee") && <TableHead>Assignee</TableHead>}
                    {isColumnVisible("slaDue") && <TableHead>SLA Due</TableHead>}
                    {isColumnVisible("aging") && <TableHead>Aging</TableHead>}
                    {isColumnVisible("lastUpdated") && <TableHead>Last Updated</TableHead>}
                    {isColumnVisible("source") && <TableHead>Source</TableHead>}
                    {isColumnVisible("actions") && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedTickets.map((ticket) => {
                    const agingDays = Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24));

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
                      {isColumnVisible("ticketId") && (
                        <TableCell className="font-mono text-sm">
                          {ticket.ticketNumber || ticket.id.slice(0, 8)}
                        </TableCell>
                      )}
                      {isColumnVisible("vendor") && (
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {ticket.vendorHandle || <span className="italic">N/A</span>}
                        </TableCell>
                      )}
                      {isColumnVisible("customer") && (
                        <TableCell className="text-sm text-muted-foreground">
                          {ticket.customer || <span className="italic">N/A</span>}
                        </TableCell>
                      )}
                      {isColumnVisible("department") && (
                        <TableCell>
                          <Badge variant="secondary">{ticket.department}</Badge>
                        </TableCell>
                      )}
                      {isColumnVisible("category") && (
                        <TableCell className="text-sm">
                          {getCategoryDisplay(ticket, categoryMap)}
                        </TableCell>
                      )}
                      {isColumnVisible("issueType") && (
                        <TableCell>
                          <Badge variant="outline">{ticket.issueType}</Badge>
                        </TableCell>
                      )}
                      {isColumnVisible("priority") && (
                        <TableCell>{getPriorityBadge(ticket.priorityTier)}</TableCell>
                      )}
                      {isColumnVisible("status") && (
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      )}
                      {isColumnVisible("assignee") && (
                        <TableCell className="text-sm">
                          {ticket.assigneeId ? (
                            <span className="text-muted-foreground">
                              {users?.find(u => u.id === ticket.assigneeId)?.name || ticket.assigneeId.slice(0, 8)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible("slaDue") && (
                        <TableCell className="text-sm">
                          {ticket.slaResolveTarget ? (
                            <span className={new Date(ticket.slaResolveTarget) < new Date() ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {new Date(ticket.slaResolveTarget).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">No SLA</span>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible("aging") && (
                        <TableCell className="text-sm">
                          <span className={agingDays > 7 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                            {agingDays}d
                          </span>
                        </TableCell>
                      )}
                      {isColumnVisible("lastUpdated") && (
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </TableCell>
                      )}
                      {isColumnVisible("source") && (
                        <TableCell className="text-sm text-muted-foreground">
                          Portal
                        </TableCell>
                      )}
                      {isColumnVisible("actions") && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/tickets/${ticket.id}?from=my-tickets`)}
                            data-testid={`button-view-${ticket.id}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      )}
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
                          {newTicket.vendorHandle ?
                            vendors?.find(v => v.handle === newTicket.vendorHandle)?.name || newTicket.vendorHandle
                            : "Select or search vendor..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search vendor by name or handle..."
                            value={vendorSearchValue}
                            onValueChange={setVendorSearchValue}
                          />
                          <CommandList className="max-h-[300px] overflow-y-auto">
                            {!vendorSearchValue && vendors && vendors.length > 200 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 border-b">
                                Showing first 200 of {vendors.length} vendors. Type to search all...
                              </div>
                            )}
                            <CommandEmpty>
                              <div className="p-4 text-center">
                                <p className="text-sm text-muted-foreground mb-2">
                                  No vendor found matching "{vendorSearchValue}"
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setNewTicket({ ...newTicket, vendorHandle: vendorSearchValue });
                                    setVendorComboOpen(false);
                                    setVendorSearchValue("");
                                  }}
                                >
                                  Use "{vendorSearchValue}" anyway
                                </Button>
                              </div>
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
                                .slice(0, vendorSearchValue ? undefined : 200)
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
                                    <div className="flex flex-col">
                                      <span className="font-medium">{v.name}</span>
                                      <span className="text-xs text-muted-foreground">{v.handle}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              }

              // Customer field (for Customer Support)
              if (fieldName === "customer") {
                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="customer">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
                    <Input
                      id="customer"
                      value={newTicket.customer}
                      onChange={(e) => setNewTicket({ ...newTicket, customer: e.target.value })}
                      placeholder={fieldConfig.metadata?.placeholder || "Enter customer name or ID"}
                      data-testid="input-customer"
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
                      <SelectContent className="max-h-[300px] overflow-y-auto">
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
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {ISSUE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              // Category field - Searchable hierarchical dropdown
              if (fieldName === "categoryId") {
                const selectedCategory = availableCategories.find(c => c.id === newTicket.categoryId);
                const getCategoryDisplayPath = (cat: typeof availableCategories[0] | undefined) => {
                  if (!cat) return "";
                  // Display as L2 > L3 > L4 (excluding L1 which is department)
                  const parts = [cat.l2, cat.l3];
                  if (cat.l4) parts.push(cat.l4);
                  return parts.join(" > ");
                };

                return (
                  <div key={fieldName} className="space-y-2">
                    <Label htmlFor="category">
                      {getFieldLabel(fieldName)} {isFieldRequired(fieldName) ? <span className="text-red-500">*</span> : ""}
                    </Label>
                    <Popover
                      open={categoryComboOpen}
                      onOpenChange={(open) => {
                        setCategoryComboOpen(open);
                        if (!open) setCategorySearchValue("");
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryComboOpen}
                          className="w-full justify-between font-normal h-auto min-h-10 text-left"
                          data-testid="select-category"
                        >
                          <span className={selectedCategory ? "" : "text-muted-foreground"}>
                            {selectedCategory ? getCategoryDisplayPath(selectedCategory) : "Search or select category..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Type to search categories..."
                            value={categorySearchValue}
                            onValueChange={setCategorySearchValue}
                          />
                          <CommandList className="max-h-[300px] overflow-y-auto">
                            <CommandEmpty>
                              <p className="text-sm text-muted-foreground p-2">
                                No categories found matching "{categorySearchValue}"
                              </p>
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredCategories
                                .filter((c) => {
                                  if (!categorySearchValue) return true;
                                  const search = categorySearchValue.toLowerCase();
                                  // Search across all levels
                                  return (
                                    c.l2.toLowerCase().includes(search) ||
                                    c.l3.toLowerCase().includes(search) ||
                                    (c.l4 && c.l4.toLowerCase().includes(search)) ||
                                    c.path.toLowerCase().includes(search)
                                  );
                                })
                                .map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={c.id}
                                    onSelect={() => {
                                      console.log('✅ Category selected:', { id: c.id, path: c.path, l1: c.l1, l2: c.l2, l3: c.l3, l4: c.l4 });
                                      setNewTicket({ ...newTicket, categoryId: c.id });
                                      setCategoryComboOpen(false);
                                      setCategorySearchValue("");
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Check
                                      className={cn(
                                        "h-4 w-4 shrink-0",
                                        newTicket.categoryId === c.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {c.l4 || c.l3}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {getCategoryDisplayPath(c)}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedCategory && (
                      <p className="text-xs text-muted-foreground">
                        Full path: {selectedCategory.issueType} &gt; {selectedCategory.l1} &gt; {getCategoryDisplayPath(selectedCategory)}
                      </p>
                    )}
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
                // For Seller Support: Only enable if vendor is selected (to fetch vendor's orders)
                // For Customer Support: Always enable (manual entry, no vendor required)
                const isVendorFieldVisible = isFieldVisible("vendorHandle");
                const shouldDisableOrderIds = isVendorFieldVisible && !newTicket.vendorHandle;

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
                          disabled={shouldDisableOrderIds}
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
                                {shouldDisableOrderIds
                                  ? "Select vendor first"
                                  : (isVendorFieldVisible && newTicket.vendorHandle
                                      ? "Select or type order IDs..."
                                      : "Type order IDs...")}
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
                          <CommandList className="max-h-[300px] overflow-y-auto">
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
                  (isFieldRequired("customer") && !newTicket.customer) ||
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

      {/* Column Settings Dialog */}
      <Dialog open={showColumnSettings} onOpenChange={setShowColumnSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Columns</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which columns you want to see in the ticket list:
            </p>
            <div className="space-y-2">
              {[
                { id: "ticketId", label: "Ticket ID" },
                { id: "vendor", label: "Vendor" },
                { id: "customer", label: "Customer" },
                { id: "department", label: "Department" },
                { id: "category", label: "Category" },
                { id: "issueType", label: "Issue Type" },
                { id: "priority", label: "Priority" },
                { id: "status", label: "Status" },
                { id: "assignee", label: "Assignee" },
                { id: "slaDue", label: "SLA Due" },
                { id: "aging", label: "Aging" },
                { id: "lastUpdated", label: "Last Updated" },
                { id: "source", label: "Source" },
                { id: "actions", label: "Actions" },
              ].map((column) => (
                <label key={column.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempColumns.includes(column.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempColumns([...tempColumns, column.id]);
                      } else {
                        setTempColumns(tempColumns.filter((c) => c !== column.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">{column.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowColumnSettings(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => updateColumnsMutation.mutate(tempColumns)}
                disabled={updateColumnsMutation.isPending}
              >
                {updateColumnsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  {users?.map((u) => (
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
