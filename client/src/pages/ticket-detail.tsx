import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Tag,
  MessageSquare,
  Activity,
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
  ExternalLink,
  Save,
  Plus,
  X,
} from "lucide-react";
import type { Ticket, Comment, Category, User as UserType } from "@shared/schema";

interface FleetOrderData {
  orderId: string;
  orderDate?: string;
  orderStatus?: string;
  orderAmount?: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  vendorHandle?: string;
}

async function getTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}`);
  if (!res.ok) throw new Error("Failed to fetch ticket");
  return res.json();
}

async function getOrdersFromBigQuery(orderIds: string[]): Promise<FleetOrderData[]> {
  try {
    const ids = orderIds.join(',');
    const res = await fetch(`/api/bigquery/orders?ids=${encodeURIComponent(ids)}`);
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error('Failed to fetch BigQuery orders:', error);
    return [];
  }
}

async function getComments(ticketId: string): Promise<Comment[]> {
  const res = await fetch(`/api/tickets/${ticketId}/comments`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

async function getCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function getUsers(): Promise<UserType[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update ticket");
  return res.json();
}

async function addComment(ticketId: string, content: string, userId: string, userName: string): Promise<Comment> {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketId,
      author: userName,
      body: content,
      visibility: "Internal",
      createdById: userId, // Pass user ID for notification filtering
    }),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  return res.json();
}

const STATUSES = ["New", "Open", "Pending", "Solved", "Closed"] as const;

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

export default function TicketDetailPage() {
  const [location, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  const [pendingChanges, setPendingChanges] = useState<Partial<Ticket>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [newTag, setNewTag] = useState("");

  // Get the referrer from query params
  const urlParams = new URLSearchParams(window.location.search);
  const from = urlParams.get('from') || 'all-tickets';

  const getBackPath = () => {
    switch (from) {
      case 'my-tickets':
        return '/my-tickets';
      case 'notifications':
        return '/notifications';
      case 'all-tickets':
      default:
        return '/tickets';
    }
  };

  const getBackLabel = () => {
    switch (from) {
      case 'my-tickets':
        return 'My Tickets';
      case 'notifications':
        return 'Notifications';
      case 'all-tickets':
      default:
        return 'All Tickets';
    }
  };
  
  const queryClient = useQueryClient();

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", id],
    queryFn: () => getComments(id!),
    enabled: !!id,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const { data: bigQueryOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["bigquery-orders", ticket?.fleekOrderIds],
    queryFn: () => getOrdersFromBigQuery(ticket!.fleekOrderIds!),
    enabled: !!(ticket?.fleekOrderIds && ticket.fleekOrderIds.length > 0),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Ticket>) => updateTicket(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setPendingChanges({});
      setShowConfirmDialog(false);
    },
    onError: (error: Error) => {
      console.error("Failed to update ticket:", error);
      alert("Failed to save changes: " + error.message);
      // Don't clear pending changes on error so user can retry
    },
  });

  const handleSaveChanges = () => {
    if (Object.keys(pendingChanges).length > 0) {
      setShowConfirmDialog(true);
    }
  };

  const confirmSaveChanges = () => {
    // Add current user ID to the update payload for notification filtering
    const updatesWithUser = {
      ...pendingChanges,
      userId: user?.id, // Pass user ID for notification logic
    };
    updateMutation.mutate(updatesWithUser);
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      status: "Status",
      assigneeId: "Assignee",
      priorityTier: "Priority",
      categoryId: "Category",
      department: "Department",
      issueType: "Issue Type",
      tags: "Tags",
    };
    return labels[field] || field;
  };

  const getFieldDisplayValue = (field: string, value: any): string => {
    if (field === "assigneeId") {
      if (value === null) return "Unassigned";
      const user = users?.find(u => u.id === value);
      return user?.name || value;
    }
    if (field === "categoryId") {
      const category = categoryMap[value];
      return category ? `${category.l1} > ${category.l2} > ${category.l3}${category.l4 ? ` > ${category.l4}` : ''}` : value;
    }
    if (field === "tags") {
      return Array.isArray(value) ? value.join(", ") : String(value);
    }
    return String(value);
  };

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(id!, content, user?.id!, user?.name || "Unknown User"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      setNewComment("");
    },
  });

  const categoryMap = categories?.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>) || {};

  const userMap = users?.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {} as Record<string, UserType>) || {};

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

  if (ticketLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">Ticket not found</h2>
        <Button onClick={() => setLocation("/tickets")} className="mt-4">
          Back to Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(getBackPath())}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                {getBackLabel()}
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-mono text-lg font-semibold">
                    #{ticket.ticketNumber || ticket.id.slice(0, 8)}
                  </h1>
                  {getStatusBadge(ticket.status)}
                  {getPriorityBadge(ticket.priorityTier)}
                  {getSlaStatusBadge(ticket.slaStatus)}
                </div>
                <p className="text-sm text-muted-foreground truncate max-w-md">
                  {ticket.subject}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Ticket Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subject</label>
                  <p className="mt-1 text-base font-medium">{ticket.subject}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {ticket.description}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4 border-b pb-4 mb-4">
                <Button
                  variant={activeTab === "comments" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("comments")}
                >
                  <MessageSquare className="mr-1 h-4 w-4" />
                  Comments ({comments?.length || 0})
                </Button>
                <Button
                  variant={activeTab === "activity" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("activity")}
                >
                  <Activity className="mr-1 h-4 w-4" />
                  Activity Log
                </Button>
              </div>

              {activeTab === "comments" && (
                <div className="space-y-4">
                  {commentsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments && comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold text-sm">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{comment.author}</span>
                            <span className="text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                            {comment.visibility === "Internal" && (
                              <Badge variant="outline" className="text-xs">Internal</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm">{comment.body}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No comments yet
                    </p>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="input-comment"
                    />
                    <Button
                      onClick={() => newComment.trim() && commentMutation.mutate(newComment)}
                      disabled={!newComment.trim() || commentMutation.isPending}
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      data-testid="button-submit-comment"
                    >
                      {commentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-medium">Ticket Created</p>
                      <p className="text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {ticket.resolvedAt && (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="font-medium">Ticket Resolved</p>
                        <p className="text-muted-foreground">
                          {new Date(ticket.resolvedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Ticket Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select
                    value={pendingChanges.status ?? ticket.status}
                    onValueChange={(val) => setPendingChanges({ ...pendingChanges, status: val as Ticket["status"] })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select
                    value={pendingChanges.assigneeId !== undefined ? (pendingChanges.assigneeId || "unassigned") : (ticket.assigneeId || "unassigned")}
                    onValueChange={(val) => setPendingChanges({ ...pendingChanges, assigneeId: val === "unassigned" ? null : val })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-assignee">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select
                    value={pendingChanges.priorityTier ?? ticket.priorityTier}
                    onValueChange={(val) => setPendingChanges({ ...pendingChanges, priorityTier: val as "Critical" | "High" | "Medium" | "Low" })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Department</label>
                  <Select
                    value={pendingChanges.department ?? ticket.department}
                    onValueChange={(val) => setPendingChanges({ ...pendingChanges, department: val as "Finance" | "Operations" | "Marketplace" | "Tech" | "Supply" | "Growth" | "Experience" | "CX" })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-department">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Marketplace">Marketplace</SelectItem>
                      <SelectItem value="Tech">Tech</SelectItem>
                      <SelectItem value="Supply">Supply</SelectItem>
                      <SelectItem value="Growth">Growth</SelectItem>
                      <SelectItem value="Experience">Experience</SelectItem>
                      <SelectItem value="CX">CX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <Select
                    value={pendingChanges.categoryId ?? ticket.categoryId}
                    onValueChange={(val) => setPendingChanges({ ...pendingChanges, categoryId: val })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.path}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Issue Type</label>
                  <Select
                    value={pendingChanges.issueType ?? ticket.issueType}
                    onValueChange={(val) => setPendingChanges({ ...pendingChanges, issueType: val as "Complaint" | "Request" | "Information" })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-issue-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectItem value="Complaint">Complaint</SelectItem>
                      <SelectItem value="Request">Request</SelectItem>
                      <SelectItem value="Information">Information</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Case Creator</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold text-xs">
                      {ticket.createdById && userMap[ticket.createdById]?.name.charAt(0).toUpperCase() || "?"}
                    </div>
                    <span className="text-sm">{ticket.createdById && userMap[ticket.createdById]?.name || "Unknown"}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tags</label>
                  <div className="mt-1 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {(pendingChanges.tags ?? ticket.tags)?.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const currentTags = pendingChanges.tags ?? ticket.tags ?? [];
                              const newTags = currentTags.filter((_, i) => i !== index);
                              setPendingChanges({ ...pendingChanges, tags: newTags });
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {!(pendingChanges.tags ?? ticket.tags)?.length && (
                        <span className="text-sm text-muted-foreground">No tags</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTag.trim()) {
                            e.preventDefault();
                            const currentTags = pendingChanges.tags ?? ticket.tags ?? [];
                            if (!currentTags.includes(newTag.trim())) {
                              setPendingChanges({ ...pendingChanges, tags: [...currentTags, newTag.trim()] });
                              setNewTag("");
                            }
                          }
                        }}
                        placeholder="Add tag..."
                        className="text-xs h-7"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (newTag.trim()) {
                            const currentTags = pendingChanges.tags ?? ticket.tags ?? [];
                            if (!currentTags.includes(newTag.trim())) {
                              setPendingChanges({ ...pendingChanges, tags: [...currentTags, newTag.trim()] });
                              setNewTag("");
                            }
                          }
                        }}
                        className="h-7 px-2"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {hasPendingChanges && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    onClick={handleSaveChanges}
                    disabled={updateMutation.isPending}
                    className="w-full"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Vendor Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Vendor Handle</label>
                  <Button
                    variant="link"
                    className="mt-0.5 h-auto p-0 text-sm font-mono"
                    onClick={() => setLocation(`/vendors/${ticket.vendorHandle}`)}
                  >
                    {ticket.vendorHandle}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </div>

                {ticket.fleekOrderIds && ticket.fleekOrderIds.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Fleek Order ID{ticket.fleekOrderIds.length > 1 ? 's' : ''}
                    </label>
                    <div className="mt-1 space-y-1">
                      {ticket.fleekOrderIds.map((orderId, index) => (
                        <p key={index} className="font-mono text-sm">{orderId}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {ticket.fleekOrderIds && ticket.fleekOrderIds.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-4 font-semibold flex items-center justify-between">
                  Order Information
                  {ordersLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </h3>
                {bigQueryOrders && bigQueryOrders.length > 0 ? (
                  <div className="space-y-4">
                    {bigQueryOrders.map((order, index) => (
                      <div key={order.orderId} className={cn(
                        "space-y-2 pb-3",
                        index < bigQueryOrders.length - 1 && "border-b border-border"
                      )}>
                        <div className="flex items-start justify-between">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Order ID</label>
                            <p className="mt-0.5 font-mono text-sm font-semibold">{order.orderId}</p>
                          </div>
                          {order.orderStatus && (
                            <Badge variant="secondary" className="text-xs">
                              {order.orderStatus}
                            </Badge>
                          )}
                        </div>

                        {order.orderAmount && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Amount</label>
                            <p className="mt-0.5 text-sm">
                              {order.currency || '$'}{order.orderAmount.toLocaleString()}
                            </p>
                          </div>
                        )}

                        {order.orderDate && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Order Date</label>
                            <p className="mt-0.5 text-sm">
                              {new Date(order.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}

                        {order.customerName && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Customer</label>
                            <p className="mt-0.5 text-sm">{order.customerName}</p>
                            {order.customerEmail && (
                              <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : !ordersLoading ? (
                  <p className="text-sm text-muted-foreground">
                    {bigQueryOrders ? 'No order data available in BigQuery' : 'BigQuery integration not configured'}
                  </p>
                ) : null}
              </Card>
            )}

            <Card className="p-6">
              <h3 className="mb-4 font-semibold">SLA Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">SLA Status</label>
                  <div className="mt-1">{getSlaStatusBadge(ticket.slaStatus)}</div>
                </div>

                {ticket.slaResolveTarget && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Resolve Target</label>
                    <p className="mt-1 text-sm">
                      {new Date(ticket.slaResolveTarget).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              Please review the changes you're about to make to this ticket.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {Object.entries(pendingChanges).map(([field, newValue]) => {
              const currentValue = ticket?.[field as keyof Ticket];
              return (
                <div key={field} className="rounded-lg border p-3">
                  <p className="text-sm font-medium mb-2">{getFieldLabel(field)}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Current</p>
                      <p className="font-medium">{getFieldDisplayValue(field, currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">New</p>
                      <p className="font-medium text-blue-600">{getFieldDisplayValue(field, newValue)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSaveChanges}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm & Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
