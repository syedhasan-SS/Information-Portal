import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Settings,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types from schema
type IssueType = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryHierarchy = {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  parentId: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CategoryMapping = {
  id: string;
  issueTypeId: string;
  l1CategoryId: string;
  l2CategoryId: string | null;
  l3CategoryId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SlaConfiguration = {
  id: string;
  name: string;
  issueTypeId: string | null;
  l1CategoryId: string | null;
  l2CategoryId: string | null;
  l3CategoryId: string | null;
  responseTimeHours: number | null;
  resolutionTimeHours: number;
  useBusinessHours: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PriorityConfiguration = {
  id: string;
  name: string;
  level: "Critical" | "High" | "Medium" | "Low";
  issueTypeId: string | null;
  l1CategoryId: string | null;
  l2CategoryId: string | null;
  l3CategoryId: string | null;
  points: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type Tag = {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  isAutoApplied: boolean;
  autoApplyCondition: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function TicketConfigPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("issue-types");

  // Fetch all configuration data
  const { data: issueTypes } = useQuery({
    queryKey: ["config", "issue-types"],
    queryFn: async () => {
      const res = await fetch("/api/config/issue-types");
      if (!res.ok) throw new Error("Failed to fetch issue types");
      return res.json() as Promise<IssueType[]>;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["config", "categories"],
    queryFn: async () => {
      const res = await fetch("/api/config/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json() as Promise<CategoryHierarchy[]>;
    },
  });

  const { data: mappings } = useQuery({
    queryKey: ["config", "mappings"],
    queryFn: async () => {
      const res = await fetch("/api/config/mappings");
      if (!res.ok) throw new Error("Failed to fetch mappings");
      return res.json() as Promise<CategoryMapping[]>;
    },
  });

  const { data: slas } = useQuery({
    queryKey: ["config", "sla"],
    queryFn: async () => {
      const res = await fetch("/api/config/sla");
      if (!res.ok) throw new Error("Failed to fetch SLAs");
      return res.json() as Promise<SlaConfiguration[]>;
    },
  });

  const { data: priorities } = useQuery({
    queryKey: ["config", "priorities"],
    queryFn: async () => {
      const res = await fetch("/api/config/priorities");
      if (!res.ok) throw new Error("Failed to fetch priorities");
      return res.json() as Promise<PriorityConfiguration[]>;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["config", "tags"],
    queryFn: async () => {
      const res = await fetch("/api/config/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json() as Promise<Tag[]>;
    },
  });

  // State for forms
  const [showIssueTypeForm, setShowIssueTypeForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showSlaForm, setShowSlaForm] = useState(false);
  const [showPriorityForm, setShowPriorityForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);

  const [issueTypeForm, setIssueTypeForm] = useState({ name: "", description: "", isActive: true });
  const [categoryForm, setCategoryForm] = useState({ name: "", level: 1 as 1 | 2 | 3, parentId: "", description: "", isActive: true });
  const [slaForm, setSlaForm] = useState({
    name: "",
    issueTypeId: "",
    l1CategoryId: "",
    l2CategoryId: "",
    l3CategoryId: "",
    responseTimeHours: "",
    resolutionTimeHours: "",
    useBusinessHours: false,
    isActive: true,
  });
  const [priorityForm, setPriorityForm] = useState({
    name: "",
    level: "Medium" as "Critical" | "High" | "Medium" | "Low",
    issueTypeId: "",
    l1CategoryId: "",
    l2CategoryId: "",
    l3CategoryId: "",
    points: "",
    isActive: true,
  });
  const [tagForm, setTagForm] = useState({ name: "", color: "#3b82f6", description: "", isAutoApplied: false, isActive: true });

  // Create Issue Type
  const createIssueTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/config/issue-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create issue type");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "issue-types"] });
      setShowIssueTypeForm(false);
      setIssueTypeForm({ name: "", description: "", isActive: true });
      toast({ title: "Success", description: "Issue type created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create issue type", variant: "destructive" });
    },
  });

  // Create Category
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/config/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "categories"] });
      setShowCategoryForm(false);
      setCategoryForm({ name: "", level: 1, parentId: "", description: "", isActive: true });
      toast({ title: "Success", description: "Category created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
    },
  });

  // Create SLA
  const createSlaMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/config/sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create SLA");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "sla"] });
      setShowSlaForm(false);
      setSlaForm({
        name: "",
        issueTypeId: "",
        l1CategoryId: "",
        l2CategoryId: "",
        l3CategoryId: "",
        responseTimeHours: "",
        resolutionTimeHours: "",
        useBusinessHours: false,
        isActive: true,
      });
      toast({ title: "Success", description: "SLA configuration created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create SLA", variant: "destructive" });
    },
  });

  // Create Priority
  const createPriorityMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/config/priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create priority");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "priorities"] });
      setShowPriorityForm(false);
      setPriorityForm({
        name: "",
        level: "Medium",
        issueTypeId: "",
        l1CategoryId: "",
        l2CategoryId: "",
        l3CategoryId: "",
        points: "",
        isActive: true,
      });
      toast({ title: "Success", description: "Priority configuration created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create priority", variant: "destructive" });
    },
  });

  // Create Tag
  const createTagMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/config/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "tags"] });
      setShowTagForm(false);
      setTagForm({ name: "", color: "#3b82f6", description: "", isAutoApplied: false, isActive: true });
      toast({ title: "Success", description: "Tag created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create tag", variant: "destructive" });
    },
  });

  const handleSubmitIssueType = () => {
    createIssueTypeMutation.mutate(issueTypeForm);
  };

  const handleSubmitCategory = () => {
    createCategoryMutation.mutate({
      ...categoryForm,
      parentId: categoryForm.parentId || null,
    });
  };

  const handleSubmitSla = () => {
    createSlaMutation.mutate({
      ...slaForm,
      issueTypeId: slaForm.issueTypeId || null,
      l1CategoryId: slaForm.l1CategoryId || null,
      l2CategoryId: slaForm.l2CategoryId || null,
      l3CategoryId: slaForm.l3CategoryId || null,
      responseTimeHours: slaForm.responseTimeHours ? parseInt(slaForm.responseTimeHours) : null,
      resolutionTimeHours: parseInt(slaForm.resolutionTimeHours),
    });
  };

  const handleSubmitPriority = () => {
    createPriorityMutation.mutate({
      ...priorityForm,
      issueTypeId: priorityForm.issueTypeId || null,
      l1CategoryId: priorityForm.l1CategoryId || null,
      l2CategoryId: priorityForm.l2CategoryId || null,
      l3CategoryId: priorityForm.l3CategoryId || null,
      points: parseInt(priorityForm.points),
    });
  };

  const handleSubmitTag = () => {
    createTagMutation.mutate(tagForm);
  };

  // Get category name by ID
  const getCategoryName = (id: string | null) => {
    if (!id || !categories) return "N/A";
    const category = categories.find((c) => c.id === id);
    return category?.name || "N/A";
  };

  // Get issue type name by ID
  const getIssueTypeName = (id: string | null) => {
    if (!id || !issueTypes) return "N/A";
    const issueType = issueTypes.find((it) => it.id === id);
    return issueType?.name || "N/A";
  };

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
                  <Settings className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Ticket Configuration
                  </h1>
                  <p className="text-xs text-muted-foreground">Manage ticket categories, SLAs, and priorities</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="issue-types">Issue Types</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="sla">SLA Configuration</TabsTrigger>
            <TabsTrigger value="priorities">Priorities</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
          </TabsList>

          {/* Issue Types Tab */}
          <TabsContent value="issue-types">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Issue Types</h2>
                <Button onClick={() => setShowIssueTypeForm(true)} size="sm">
                  <Plus className="h-4 w-4" />
                  Add Issue Type
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issueTypes?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.description || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {!issueTypes || issueTypes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No issue types configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Category Hierarchy</h2>
                <Button onClick={() => setShowCategoryForm(true)} size="sm">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </div>

              <div className="space-y-6">
                {/* L1 Categories */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">L1 Categories (Department)</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.filter((c) => c.level === 1).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.description || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* L2 Categories */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">L2 Categories (Sub-Department)</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Parent (L1)</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.filter((c) => c.level === 2).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{getCategoryName(item.parentId)}</TableCell>
                          <TableCell>{item.description || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* L3 Categories */}
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">L3 Categories (Issue Cause)</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Parent (L2)</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.filter((c) => c.level === 3).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{getCategoryName(item.parentId)}</TableCell>
                          <TableCell>{item.description || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={item.isActive ? "default" : "secondary"}>
                              {item.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* SLA Configuration Tab */}
          <TabsContent value="sla">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">SLA Configurations</h2>
                <Button onClick={() => setShowSlaForm(true)} size="sm">
                  <Plus className="h-4 w-4" />
                  Add SLA
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>L1 Category</TableHead>
                    <TableHead>Response Time (hrs)</TableHead>
                    <TableHead>Resolution Time (hrs)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slas?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{getIssueTypeName(item.issueTypeId)}</TableCell>
                      <TableCell>{getCategoryName(item.l1CategoryId)}</TableCell>
                      <TableCell>{item.responseTimeHours || "N/A"}</TableCell>
                      <TableCell>{item.resolutionTimeHours}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!slas || slas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No SLA configurations
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Priorities Tab */}
          <TabsContent value="priorities">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Priority Configurations</h2>
                <Button onClick={() => setShowPriorityForm(true)} size="sm">
                  <Plus className="h-4 w-4" />
                  Add Priority
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>L1 Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priorities?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.level === "Critical" ? "destructive" : "default"}>
                          {item.level}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.points}</TableCell>
                      <TableCell>{getIssueTypeName(item.issueTypeId)}</TableCell>
                      <TableCell>{getCategoryName(item.l1CategoryId)}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!priorities || priorities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No priority configurations
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Tags</h2>
                <Button onClick={() => setShowTagForm(true)} size="sm">
                  <Plus className="h-4 w-4" />
                  Add Tag
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Auto-Applied</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: item.color || "#3b82f6" }}
                          />
                          {item.color || "#3b82f6"}
                        </div>
                      </TableCell>
                      <TableCell>{item.description || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant={item.isAutoApplied ? "default" : "secondary"}>
                          {item.isAutoApplied ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!tags || tags.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No tags configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Issue Type Form Dialog */}
      <Dialog open={showIssueTypeForm} onOpenChange={setShowIssueTypeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Issue Type</DialogTitle>
            <DialogDescription>Create a new issue type for ticket classification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issue-type-name">Name *</Label>
              <Input
                id="issue-type-name"
                value={issueTypeForm.name}
                onChange={(e) => setIssueTypeForm({ ...issueTypeForm, name: e.target.value })}
                placeholder="e.g., Complaint, Request, Information"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-type-desc">Description</Label>
              <Input
                id="issue-type-desc"
                value={issueTypeForm.description}
                onChange={(e) => setIssueTypeForm({ ...issueTypeForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="issue-type-active"
                checked={issueTypeForm.isActive}
                onCheckedChange={(checked) => setIssueTypeForm({ ...issueTypeForm, isActive: checked })}
              />
              <Label htmlFor="issue-type-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueTypeForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitIssueType} disabled={createIssueTypeMutation.isPending}>
              {createIssueTypeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Create a new category in the hierarchy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-level">Level *</Label>
              <Select
                value={categoryForm.level.toString()}
                onValueChange={(value) => setCategoryForm({ ...categoryForm, level: parseInt(value) as 1 | 2 | 3 })}
              >
                <SelectTrigger id="category-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">L1 (Department)</SelectItem>
                  <SelectItem value="2">L2 (Sub-Department)</SelectItem>
                  <SelectItem value="3">L3 (Issue Cause)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {categoryForm.level > 1 && (
              <div className="space-y-2">
                <Label htmlFor="category-parent">Parent Category</Label>
                <Select
                  value={categoryForm.parentId}
                  onValueChange={(value) => setCategoryForm({ ...categoryForm, parentId: value })}
                >
                  <SelectTrigger id="category-parent">
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      ?.filter((c) => c.level === categoryForm.level - 1)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="category-desc">Description</Label>
              <Input
                id="category-desc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="category-active"
                checked={categoryForm.isActive}
                onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
              />
              <Label htmlFor="category-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCategory} disabled={createCategoryMutation.isPending}>
              {createCategoryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SLA Form Dialog */}
      <Dialog open={showSlaForm} onOpenChange={setShowSlaForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add SLA Configuration</DialogTitle>
            <DialogDescription>Define SLA targets for ticket resolution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sla-name">Name *</Label>
              <Input
                id="sla-name"
                value={slaForm.name}
                onChange={(e) => setSlaForm({ ...slaForm, name: e.target.value })}
                placeholder="SLA configuration name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-issue-type">Issue Type (optional)</Label>
              <Select
                value={slaForm.issueTypeId}
                onValueChange={(value) => setSlaForm({ ...slaForm, issueTypeId: value })}
              >
                <SelectTrigger id="sla-issue-type">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {issueTypes?.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-l1">L1 Category (optional)</Label>
              <Select
                value={slaForm.l1CategoryId}
                onValueChange={(value) => setSlaForm({ ...slaForm, l1CategoryId: value })}
              >
                <SelectTrigger id="sla-l1">
                  <SelectValue placeholder="Select L1 category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    ?.filter((c) => c.level === 1)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-response">Response Time (hours)</Label>
              <Input
                id="sla-response"
                type="number"
                value={slaForm.responseTimeHours}
                onChange={(e) => setSlaForm({ ...slaForm, responseTimeHours: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sla-resolution">Resolution Time (hours) *</Label>
              <Input
                id="sla-resolution"
                type="number"
                value={slaForm.resolutionTimeHours}
                onChange={(e) => setSlaForm({ ...slaForm, resolutionTimeHours: e.target.value })}
                placeholder="Required"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="sla-business-hours"
                checked={slaForm.useBusinessHours}
                onCheckedChange={(checked) => setSlaForm({ ...slaForm, useBusinessHours: checked })}
              />
              <Label htmlFor="sla-business-hours">Use Business Hours</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="sla-active"
                checked={slaForm.isActive}
                onCheckedChange={(checked) => setSlaForm({ ...slaForm, isActive: checked })}
              />
              <Label htmlFor="sla-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlaForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitSla} disabled={createSlaMutation.isPending}>
              {createSlaMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Form Dialog */}
      <Dialog open={showPriorityForm} onOpenChange={setShowPriorityForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Priority Configuration</DialogTitle>
            <DialogDescription>Define priority mapping for tickets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="priority-name">Name *</Label>
              <Input
                id="priority-name"
                value={priorityForm.name}
                onChange={(e) => setPriorityForm({ ...priorityForm, name: e.target.value })}
                placeholder="Priority configuration name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-level">Priority Level *</Label>
              <Select
                value={priorityForm.level}
                onValueChange={(value) => setPriorityForm({ ...priorityForm, level: value as any })}
              >
                <SelectTrigger id="priority-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-points">Points *</Label>
              <Input
                id="priority-points"
                type="number"
                value={priorityForm.points}
                onChange={(e) => setPriorityForm({ ...priorityForm, points: e.target.value })}
                placeholder="Priority points"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-issue-type">Issue Type (optional)</Label>
              <Select
                value={priorityForm.issueTypeId}
                onValueChange={(value) => setPriorityForm({ ...priorityForm, issueTypeId: value })}
              >
                <SelectTrigger id="priority-issue-type">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  {issueTypes?.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority-l1">L1 Category (optional)</Label>
              <Select
                value={priorityForm.l1CategoryId}
                onValueChange={(value) => setPriorityForm({ ...priorityForm, l1CategoryId: value })}
              >
                <SelectTrigger id="priority-l1">
                  <SelectValue placeholder="Select L1 category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    ?.filter((c) => c.level === 1)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="priority-active"
                checked={priorityForm.isActive}
                onCheckedChange={(checked) => setPriorityForm({ ...priorityForm, isActive: checked })}
              />
              <Label htmlFor="priority-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriorityForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitPriority} disabled={createPriorityMutation.isPending}>
              {createPriorityMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Form Dialog */}
      <Dialog open={showTagForm} onOpenChange={setShowTagForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>Create a new tag for ticket classification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name *</Label>
              <Input
                id="tag-name"
                value={tagForm.name}
                onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                placeholder="Tag name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-color">Color</Label>
              <Input
                id="tag-color"
                type="color"
                value={tagForm.color}
                onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-desc">Description</Label>
              <Input
                id="tag-desc"
                value={tagForm.description}
                onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="tag-auto"
                checked={tagForm.isAutoApplied}
                onCheckedChange={(checked) => setTagForm({ ...tagForm, isAutoApplied: checked })}
              />
              <Label htmlFor="tag-auto">Auto-apply</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="tag-active"
                checked={tagForm.isActive}
                onCheckedChange={(checked) => setTagForm({ ...tagForm, isActive: checked })}
              />
              <Label htmlFor="tag-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitTag} disabled={createTagMutation.isPending}>
              {createTagMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
