import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Route,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";

type Category = {
  id: string;
  issueType: "Complaint" | "Request" | "Information";
  l1: string;
  l2: string;
  l3: string;
  l4: string | null;
  path: string;
  issuePriorityPoints: number;
};

type User = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  isActive: boolean;
};

type RoutingRule = {
  id: string;
  categoryId: string;
  targetDepartment: string;
  autoAssignEnabled: boolean;
  assignmentStrategy: "round_robin" | "least_loaded" | "specific_agent";
  assignedAgentId: string | null;
  priorityBoost: number;
  slaResponseHoursOverride: number | null;
  slaResolutionHoursOverride: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const DEPARTMENTS = [
  "Finance",
  "Operations",
  "Marketplace",
  "Tech",
  "Supply",
  "Growth",
  "Experience",
  "CX"
];

const ASSIGNMENT_STRATEGIES = [
  { value: "round_robin", label: "Round Robin - Rotate through available agents" },
  { value: "least_loaded", label: "Least Loaded - Assign to agent with fewest tickets" },
  { value: "specific_agent", label: "Specific Agent - Always assign to one agent" },
];

export default function RoutingConfigPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [formData, setFormData] = useState({
    categoryId: "",
    targetDepartment: "",
    autoAssignEnabled: false,
    assignmentStrategy: "round_robin" as "round_robin" | "least_loaded" | "specific_agent",
    assignedAgentId: "",
    priorityBoost: 0,
    slaResponseHoursOverride: "",
    slaResolutionHoursOverride: "",
  });

  // Fetch routing rules
  const { data: routingRules, isLoading: rulesLoading } = useQuery<RoutingRule[]>({
    queryKey: ["routingRules"],
    queryFn: async () => {
      const res = await fetch("/api/config/routing-rules");
      if (!res.ok) throw new Error("Failed to fetch routing rules");
      return res.json();
    },
  });

  // Fetch categories
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  // Fetch users for agent selection
  const { data: users } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Get agents for selected department
  const departmentAgents = users?.filter(
    u => u.isActive && u.role === "Agent" && u.department === formData.targetDepartment
  ) || [];

  // Create routing rule
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/config/routing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create routing rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routingRules"] });
      toast({ title: "Success", description: "Routing rule created successfully" });
      setShowDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update routing rule
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/config/routing-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update routing rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routingRules"] });
      toast({ title: "Success", description: "Routing rule updated successfully" });
      setShowDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete routing rule
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/routing-rules/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete routing rule");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routingRules"] });
      toast({ title: "Success", description: "Routing rule deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      categoryId: "",
      targetDepartment: "",
      autoAssignEnabled: false,
      assignmentStrategy: "round_robin",
      assignedAgentId: "",
      priorityBoost: 0,
      slaResponseHoursOverride: "",
      slaResolutionHoursOverride: "",
    });
    setEditingRule(null);
  };

  const handleSubmit = () => {
    const payload = {
      categoryId: formData.categoryId,
      targetDepartment: formData.targetDepartment,
      autoAssignEnabled: formData.autoAssignEnabled,
      assignmentStrategy: formData.assignmentStrategy,
      assignedAgentId: formData.assignedAgentId || null,
      priorityBoost: formData.priorityBoost,
      slaResponseHoursOverride: formData.slaResponseHoursOverride ? parseInt(formData.slaResponseHoursOverride) : null,
      slaResolutionHoursOverride: formData.slaResolutionHoursOverride ? parseInt(formData.slaResolutionHoursOverride) : null,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (rule: RoutingRule) => {
    setEditingRule(rule);
    setFormData({
      categoryId: rule.categoryId,
      targetDepartment: rule.targetDepartment,
      autoAssignEnabled: rule.autoAssignEnabled,
      assignmentStrategy: rule.assignmentStrategy,
      assignedAgentId: rule.assignedAgentId || "",
      priorityBoost: rule.priorityBoost,
      slaResponseHoursOverride: rule.slaResponseHoursOverride?.toString() || "",
      slaResolutionHoursOverride: rule.slaResolutionHoursOverride?.toString() || "",
    });
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this routing rule?")) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.path || categoryId;
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "N/A";
    const agent = users?.find(u => u.id === agentId);
    return agent?.name || agentId;
  };

  // Get categories that don't have routing rules yet
  const availableCategories = categories?.filter(
    c => !routingRules?.some(r => r.categoryId === c.id)
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/ticket-config")}>
                <ArrowLeft className="h-4 w-4" />
                Back to Ticket Manager
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Route className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Category Routing Configuration
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Configure automatic department routing and agent assignment per category
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              Add Routing Rule
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <Card>
          {rulesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : routingRules && routingRules.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Target Department</TableHead>
                    <TableHead>Auto-Assign</TableHead>
                    <TableHead>Assignment Strategy</TableHead>
                    <TableHead>Assigned Agent</TableHead>
                    <TableHead>Priority Boost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routingRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium text-sm max-w-xs truncate">
                        {getCategoryName(rule.categoryId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rule.targetDepartment}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.autoAssignEnabled ? "default" : "outline"}>
                          {rule.autoAssignEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {rule.assignmentStrategy === "round_robin" && "Round Robin"}
                        {rule.assignmentStrategy === "least_loaded" && "Least Loaded"}
                        {rule.assignmentStrategy === "specific_agent" && "Specific Agent"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rule.assignmentStrategy === "specific_agent" ? getAgentName(rule.assignedAgentId) : "N/A"}
                      </TableCell>
                      <TableCell>
                        {rule.priorityBoost > 0 ? (
                          <Badge variant="secondary">+{rule.priorityBoost}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.isActive ? "default" : "outline"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <Route className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No routing rules configured</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get started by creating your first category routing rule
              </p>
              <Button onClick={() => setShowDialog(true)} className="mt-4">
                <Plus className="h-4 w-4" />
                Add Routing Rule
              </Button>
            </div>
          )}
        </Card>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit" : "Add"} Routing Rule</DialogTitle>
            <DialogDescription>
              Configure automatic routing and assignment for a ticket category
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                disabled={!!editingRule}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {editingRule ? (
                    <SelectItem value={editingRule.categoryId}>
                      {getCategoryName(editingRule.categoryId)}
                    </SelectItem>
                  ) : (
                    availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.path}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!editingRule && availableCategories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All categories already have routing rules configured
                </p>
              )}
            </div>

            {/* Target Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Target Department *</Label>
              <Select
                value={formData.targetDepartment}
                onValueChange={(value) => setFormData({ ...formData, targetDepartment: value, assignedAgentId: "" })}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select target department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-Assignment */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-assign">Enable Auto-Assignment</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically assign tickets to available agents
                  </p>
                </div>
                <Switch
                  id="auto-assign"
                  checked={formData.autoAssignEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoAssignEnabled: checked })}
                />
              </div>

              {formData.autoAssignEnabled && (
                <>
                  {/* Assignment Strategy */}
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Assignment Strategy</Label>
                    <Select
                      value={formData.assignmentStrategy}
                      onValueChange={(value: any) => setFormData({ ...formData, assignmentStrategy: value, assignedAgentId: "" })}
                    >
                      <SelectTrigger id="strategy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNMENT_STRATEGIES.map((strategy) => (
                          <SelectItem key={strategy.value} value={strategy.value}>
                            {strategy.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Specific Agent Selection */}
                  {formData.assignmentStrategy === "specific_agent" && (
                    <div className="space-y-2">
                      <Label htmlFor="agent">Assigned Agent *</Label>
                      <Select
                        value={formData.assignedAgentId}
                        onValueChange={(value) => setFormData({ ...formData, assignedAgentId: value })}
                      >
                        <SelectTrigger id="agent">
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name} ({agent.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {departmentAgents.length === 0 && formData.targetDepartment && (
                        <p className="text-sm text-destructive">
                          No active agents found in {formData.targetDepartment} department
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Priority Boost */}
            <div className="space-y-2">
              <Label htmlFor="priority-boost">Priority Boost (Points)</Label>
              <Input
                id="priority-boost"
                type="number"
                value={formData.priorityBoost}
                onChange={(e) => setFormData({ ...formData, priorityBoost: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-sm text-muted-foreground">
                Add extra priority points to tickets in this category
              </p>
            </div>

            {/* SLA Overrides */}
            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium text-sm">SLA Overrides (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sla-response">Response Time (Hours)</Label>
                  <Input
                    id="sla-response"
                    type="number"
                    value={formData.slaResponseHoursOverride}
                    onChange={(e) => setFormData({ ...formData, slaResponseHoursOverride: e.target.value })}
                    placeholder="Leave empty for default"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sla-resolution">Resolution Time (Hours)</Label>
                  <Input
                    id="sla-resolution"
                    type="number"
                    value={formData.slaResolutionHoursOverride}
                    onChange={(e) => setFormData({ ...formData, slaResolutionHoursOverride: e.target.value })}
                    placeholder="Leave empty for default"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.categoryId ||
                !formData.targetDepartment ||
                (formData.autoAssignEnabled && formData.assignmentStrategy === "specific_agent" && !formData.assignedAgentId) ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingRule ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{editingRule ? "Update" : "Create"} Rule</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
