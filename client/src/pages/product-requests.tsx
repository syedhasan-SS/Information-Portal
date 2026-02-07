import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Send,
  FileText,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Ban,
  PlayCircle,
  UserCheck,
  Filter,
  Search,
} from "lucide-react";
import type { ProductRequest, User } from "@shared/schema";

// API functions
async function getProductRequests(): Promise<ProductRequest[]> {
  const res = await fetch("/api/product-requests", {
    headers: { "x-user-email": localStorage.getItem("userEmail") || "" },
  });
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

async function getUsers(): Promise<User[]> {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function getProductRequestComments(requestId: string): Promise<any[]> {
  const res = await fetch(`/api/product-requests/${requestId}/comments`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

async function createProductRequest(data: any): Promise<ProductRequest> {
  const res = await fetch("/api/product-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": localStorage.getItem("userEmail") || "",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create request");
  }
  return res.json();
}

async function updateProductRequest(id: string, data: any): Promise<ProductRequest> {
  const res = await fetch(`/api/product-requests/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": localStorage.getItem("userEmail") || "",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update request");
  }
  return res.json();
}

async function approveByManager(id: string, comments?: string): Promise<ProductRequest> {
  const res = await fetch(`/api/product-requests/${id}/approve-manager`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": localStorage.getItem("userEmail") || "",
    },
    body: JSON.stringify({ comments }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to approve request");
  }
  return res.json();
}

async function assignRequest(id: string, assignedToId: string, comments?: string): Promise<ProductRequest> {
  const res = await fetch(`/api/product-requests/${id}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": localStorage.getItem("userEmail") || "",
    },
    body: JSON.stringify({ assignedToId, comments }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to assign request");
  }
  return res.json();
}

async function completeRequest(id: string, notes?: string): Promise<ProductRequest> {
  const res = await fetch(`/api/product-requests/${id}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": localStorage.getItem("userEmail") || "",
    },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to complete request");
  }
  return res.json();
}

async function rejectRequest(id: string, reason: string): Promise<ProductRequest> {
  const res = await fetch(`/api/product-requests/${id}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": localStorage.getItem("userEmail") || "",
    },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to reject request");
  }
  return res.json();
}

async function addComment(requestId: string, comment: string, isInternal: boolean): Promise<any> {
  const res = await fetch(`/api/product-requests/${requestId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": localStorage.getItem("userEmail") || "",
    },
    body: JSON.stringify({ comment, isInternal }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add comment");
  }
  return res.json();
}

const REQUEST_TYPES = [
  "User Management",
  "Category Management",
  "Tag Management",
  "Ticket Flow",
  "Department Management",
  "Role & Permissions",
  "Integration",
  "Other",
] as const;

const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

const STATUS_COLORS = {
  Draft: "bg-gray-500",
  "Pending Approval": "bg-yellow-500",
  Approved: "bg-blue-500",
  "In Progress": "bg-indigo-500",
  Completed: "bg-green-500",
  Rejected: "bg-red-500",
  Cancelled: "bg-gray-400",
};

const PRIORITY_COLORS = {
  Low: "text-gray-600",
  Medium: "text-yellow-600",
  High: "text-orange-600",
  Critical: "text-red-600",
};

export default function ProductRequestsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProductRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "my-requests" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requestType: "User Management" as typeof REQUEST_TYPES[number],
    priority: "Medium" as typeof PRIORITIES[number],
  });

  // Comment state
  const [commentText, setCommentText] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Action states
  const [approveComments, setApproveComments] = useState("");
  const [assignToId, setAssignToId] = useState("");
  const [assignComments, setAssignComments] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Queries
  const { data: requests, isLoading } = useQuery({
    queryKey: ["product-requests"],
    queryFn: getProductRequests,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["product-request-comments", selectedRequest?.id],
    queryFn: () => getProductRequestComments(selectedRequest!.id),
    enabled: !!selectedRequest,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createProductRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-requests"] });
      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        requestType: "User Management",
        priority: "Medium",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProductRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-requests"] });
      setShowDetailDialog(false);
      setSelectedRequest(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) => approveByManager(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-requests"] });
      setApproveComments("");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedToId, comments }: { id: string; assignedToId: string; comments?: string }) =>
      assignRequest(id, assignedToId, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-requests"] });
      setAssignToId("");
      setAssignComments("");
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => completeRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-requests"] });
      setCompletionNotes("");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-requests"] });
      setRejectionReason("");
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ requestId, comment, isInternal }: { requestId: string; comment: string; isInternal: boolean }) =>
      addComment(requestId, comment, isInternal),
    onSuccess: () => {
      refetchComments();
      setCommentText("");
      setIsInternalComment(false);
    },
  });

  // Helper functions
  const getUserById = (id?: string) => users?.find((u) => u.id === id);

  const canApprove = (request: ProductRequest) => {
    if (!user) return false;
    const canApproveRole = ["Head", "Manager"].includes(user.role) || user.roles?.some((r) => ["Head", "Manager"].includes(r));
    return canApproveRole && request.status === "Pending Approval";
  };

  const canAssign = (request: ProductRequest) => {
    if (!user) return false;
    const isAdmin = user.role === "Owner" || user.role === "Admin";
    return isAdmin && request.status === "Approved";
  };

  const canComplete = (request: ProductRequest) => {
    if (!user) return false;
    const isAssignee = request.assignedToId === user.id;
    const isAdmin = user.role === "Owner" || user.role === "Admin";
    return (isAssignee || isAdmin) && request.status === "In Progress";
  };

  const canReject = (request: ProductRequest) => {
    if (!user) return false;
    return ["Owner", "Admin", "Head", "Manager"].includes(user.role) ||
      user.roles?.some((r) => ["Owner", "Admin", "Head", "Manager"].includes(r));
  };

  const canEdit = (request: ProductRequest) => {
    if (!user) return false;
    const isAdmin = user.role === "Owner" || user.role === "Admin";
    const isOwner = request.requestedById === user.id;
    return isAdmin || (isOwner && request.status === "Draft");
  };

  // Filter requests
  const filteredRequests = requests?.filter((req) => {
    // Tab filter
    if (activeTab === "my-requests" && req.requestedById !== user?.id) return false;
    if (activeTab === "pending" && req.status !== "Pending Approval") return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !req.title.toLowerCase().includes(query) &&
        !req.description.toLowerCase().includes(query) &&
        !req.requestNumber.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Type filter
    if (filterType !== "all" && req.requestType !== filterType) return false;

    // Status filter
    if (filterStatus !== "all" && req.status !== filterStatus) return false;

    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    createMutation.mutate({
      ...formData,
      status: "Pending Approval",
    });
  };

  const handleSubmitForApproval = () => {
    if (!selectedRequest) return;
    updateMutation.mutate({
      id: selectedRequest.id,
      data: { status: "Pending Approval" },
    });
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    approveMutation.mutate({
      id: selectedRequest.id,
      comments: approveComments,
    });
  };

  const handleAssign = () => {
    if (!selectedRequest || !assignToId) return;
    assignMutation.mutate({
      id: selectedRequest.id,
      assignedToId: assignToId,
      comments: assignComments,
    });
  };

  const handleComplete = () => {
    if (!selectedRequest) return;
    completeMutation.mutate({
      id: selectedRequest.id,
      notes: completionNotes,
    });
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectionReason) return;
    rejectMutation.mutate({
      id: selectedRequest.id,
      reason: rejectionReason,
    });
  };

  const handleAddComment = () => {
    if (!selectedRequest || !commentText.trim()) return;
    commentMutation.mutate({
      requestId: selectedRequest.id,
      comment: commentText,
      isInternal: isInternalComment,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold">Product Requests</h1>
                  <p className="text-xs text-muted-foreground">Manage feature and change requests</p>
                </div>
              </div>
            </div>

            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, description, or request number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {REQUEST_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Pending Approval">Pending Approval</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredRequests && filteredRequests.length > 0 ? (
              filteredRequests.map((request) => {
                const requestedBy = getUserById(request.requestedById);
                const assignedTo = getUserById(request.assignedToId || "");

                return (
                  <Card
                    key={request.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowDetailDialog(true);
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{request.title}</h3>
                            <Badge className={STATUS_COLORS[request.status]}>{request.status}</Badge>
                            <Badge variant="outline" className={PRIORITY_COLORS[request.priority]}>
                              {request.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{request.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{request.requestNumber}</span>
                            <span>•</span>
                            <span>{request.requestType}</span>
                            <span>•</span>
                            <span>Requested by {requestedBy?.name}</span>
                            {assignedTo && (
                              <>
                                <span>•</span>
                                <span>Assigned to {assignedTo.name}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="p-16 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium">No requests found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeTab === "my-requests"
                      ? "You haven't created any requests yet"
                      : activeTab === "pending"
                      ? "No requests pending approval"
                      : "Create your first product request to get started"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Request Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Product Request</DialogTitle>
            <DialogDescription>Submit a new feature or change request for approval</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Brief summary of the request"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type *</Label>
              <Select
                value={formData.requestType}
                onValueChange={(value) => setFormData({ ...formData, requestType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the request..."
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      {selectedRequest && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{selectedRequest.title}</DialogTitle>
                <div className="flex gap-2">
                  <Badge className={STATUS_COLORS[selectedRequest.status]}>{selectedRequest.status}</Badge>
                  <Badge variant="outline" className={PRIORITY_COLORS[selectedRequest.priority]}>
                    {selectedRequest.priority}
                  </Badge>
                </div>
              </div>
              <DialogDescription className="flex items-center gap-2 text-xs">
                <span>{selectedRequest.requestNumber}</span>
                <span>•</span>
                <span>{selectedRequest.requestType}</span>
                <span>•</span>
                <span>Created {new Date(selectedRequest.createdAt).toLocaleDateString()}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Request Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRequest.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Requested By</h4>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getUserById(selectedRequest.requestedById)?.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{getUserById(selectedRequest.requestedById)?.name}</span>
                    </div>
                  </div>

                  {selectedRequest.assignedToId && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Assigned To</h4>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getUserById(selectedRequest.assignedToId)?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{getUserById(selectedRequest.assignedToId)?.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Actions */}
              {canApprove(selectedRequest) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Manager Approval</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Optional comments..."
                      value={approveComments}
                      onChange={(e) => setApproveComments(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleApprove} disabled={approveMutation.isPending} size="sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const reason = prompt("Enter rejection reason:");
                          if (reason) {
                            rejectMutation.mutate({ id: selectedRequest.id, reason });
                          }
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Assignment Actions */}
              {canAssign(selectedRequest) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Assign & Start Work</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select value={assignToId} onValueChange={setAssignToId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users
                            ?.filter((u) => u.role === "Owner" || u.role === "Admin")
                            .map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} - {u.role}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      placeholder="Optional comments..."
                      value={assignComments}
                      onChange={(e) => setAssignComments(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={handleAssign} disabled={assignMutation.isPending || !assignToId} size="sm">
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Assign & Start
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Complete Actions */}
              {canComplete(selectedRequest) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Complete Request</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Completion notes (what was done)..."
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleComplete} disabled={completeMutation.isPending} size="sm">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Comments Section */}
              <div className="space-y-3">
                <h4 className="font-semibold">Comments</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {comments && comments.length > 0 ? (
                    comments.map((comment: any) => {
                      const commentUser = getUserById(comment.userId);
                      return (
                        <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {commentUser?.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold">{commentUser?.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                              {comment.isInternal && (
                                <Badge variant="secondary" className="text-xs">
                                  Internal
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{comment.comment}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                      />
                      Internal comment (only visible to admins)
                    </label>
                    <Button onClick={handleAddComment} disabled={commentMutation.isPending || !commentText.trim()} size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Add Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
