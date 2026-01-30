import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

async function addComment(ticketId: string, content: string): Promise<Comment> {
  const res = await fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketId,
      author: "Current User",
      body: content,
      visibility: "Internal",
    }),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  return res.json();
}

const STATUSES = ["New", "Open", "Pending", "Solved", "Closed"] as const;

export default function TicketDetailPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  
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
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(id!, content),
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
                onClick={() => setLocation("/tickets")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                All Tickets
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
              <h2 className="mb-4 text-lg font-semibold">Description</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {ticket.description}
              </p>
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
                    value={ticket.status}
                    onValueChange={(val) => updateMutation.mutate({ status: val as Ticket["status"] })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select
                    value={ticket.assigneeId || "unassigned"}
                    onValueChange={(val) => updateMutation.mutate({ assigneeId: val === "unassigned" ? null : val })}
                  >
                    <SelectTrigger className="mt-1" data-testid="select-assignee">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <div className="mt-1">{getPriorityBadge(ticket.priorityTier)}</div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Department</label>
                  <div className="mt-1">
                    <Badge variant="secondary">{ticket.department}</Badge>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <p className="mt-1 text-sm">{categoryMap[ticket.categoryId]?.l3 || "-"}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Issue Type</label>
                  <p className="mt-1 text-sm">{ticket.issueType}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Case Creator</label>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold text-xs">
                      {userMap[ticket.createdBy]?.name.charAt(0).toUpperCase() || "?"}
                    </div>
                    <span className="text-sm">{userMap[ticket.createdBy]?.name || "Unknown"}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tags</label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ticket.tags && ticket.tags.length > 0 ? (
                      ticket.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="mr-1 h-3 w-3" />
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No tags</span>
                    )}
                  </div>
                </div>
              </div>
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
    </div>
  );
}
