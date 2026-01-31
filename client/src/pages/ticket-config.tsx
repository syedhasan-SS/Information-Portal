import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Settings,
  Plus,
  Edit,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Upload,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Category configuration type combining issue type and hierarchy
type CategoryConfig = {
  id: string;
  issueType: "Complaint" | "Request" | "Information";
  l1: string; // Department
  l2: string; // Sub Department
  l3: string; // Category
  l4: string; // Sub-Category/Problem Area
  description: string;
  isActive: boolean;
  slaResponseHours: number | null;
  slaResolutionHours: number;
  createdAt: Date;
};

export default function TicketConfigPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingConfig, setEditingConfig] = useState<CategoryConfig | null>(null);
  const [wizardData, setWizardData] = useState({
    issueType: "" as "Complaint" | "Request" | "Information" | "",
    l1: "",
    l2: "",
    l3: "",
    l4: "",
    description: "",
    isActive: true,
    slaResponseHours: "",
    slaResolutionHours: "",
  });

  // CSV upload state
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Multi-selection state
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(new Set());

  // Department filter state
  const [departmentFilter, setDepartmentFilter] = useState<"All" | "Seller Support" | "Customer Support">("All");

  // Fetch configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ["ticket-configs"],
    queryFn: async () => {
      const res = await fetch("/api/config/ticket-configs");
      if (!res.ok) throw new Error("Failed to fetch configurations");
      return res.json() as Promise<CategoryConfig[]>;
    },
  });

  // Create configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/config/ticket-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create configuration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-configs"] });
      setShowWizard(false);
      resetWizard();
      toast({ title: "Success", description: "Configuration created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create configuration", variant: "destructive" });
    },
  });

  // Bulk create configuration mutation
  const bulkCreateConfigMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const res = await fetch("/api/config/ticket-configs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: data }),
      });
      if (!res.ok) throw new Error("Failed to create configurations");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ticket-configs"] });
      setShowCsvPreview(false);
      setCsvData([]);
      setCsvErrors([]);
      toast({
        title: "Success",
        description: `${data.count || csvData.length} configurations created successfully`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create configurations",
        variant: "destructive"
      });
    },
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/config/ticket-configs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update configuration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-configs"] });
      setShowWizard(false);
      resetWizard();
      toast({ title: "Success", description: "Configuration updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update configuration", variant: "destructive" });
    },
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/ticket-configs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete configuration");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-configs"] });
      toast({ title: "Success", description: "Configuration deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete configuration", variant: "destructive" });
    },
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setEditingConfig(null);
    setWizardData({
      issueType: "",
      l1: "",
      l2: "",
      l3: "",
      l4: "",
      description: "",
      isActive: true,
      slaResponseHours: "",
      slaResolutionHours: "",
    });
  };

  // Multi-selection handlers
  const toggleSelectAll = () => {
    if (!configs) return;
    if (selectedConfigs.size === configs.length) {
      setSelectedConfigs(new Set());
    } else {
      setSelectedConfigs(new Set(configs.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedConfigs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedConfigs(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedConfigs.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedConfigs.size} configuration(s)?`)) {
      selectedConfigs.forEach(id => {
        deleteConfigMutation.mutate(id);
      });
      setSelectedConfigs(new Set());
    }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedConfigs.size === 0) return;
    selectedConfigs.forEach(async (id) => {
      updateConfigMutation.mutate({
        id,
        data: { isActive: activate },
      });
    });
    setSelectedConfigs(new Set());
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "CSV file is empty or invalid",
          variant: "destructive"
        });
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['issue type', 'l1', 'l2', 'l3', 'l4', 'description', 'active', 'sla resolution hours'];

      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast({
          title: "Invalid CSV Format",
          description: `Missing required columns: ${missingHeaders.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      // Parse data
      const parsedData: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Validate and transform
        const config: any = {
          issueType: row['issue type'],
          l1: row['l1'],
          l2: row['l2'],
          l3: row['l3'],
          l4: row['l4'],
          description: row['description'],
          isActive: row['active']?.toLowerCase() === 'true' || row['active']?.toLowerCase() === 'yes',
          slaResponseHours: row['sla response hours'] ? parseInt(row['sla response hours']) : null,
          slaResolutionHours: parseInt(row['sla resolution hours']),
        };

        // Validation
        if (!['Complaint', 'Request', 'Information'].includes(config.issueType)) {
          errors.push(`Row ${i}: Invalid issue type "${config.issueType}"`);
        }
        if (!config.l1 || !config.l2 || !config.l3 || !config.l4) {
          errors.push(`Row ${i}: Missing required category fields`);
        }
        if (!config.slaResolutionHours || isNaN(config.slaResolutionHours)) {
          errors.push(`Row ${i}: Invalid or missing SLA resolution hours`);
        }

        if (errors.length === 0 || errors.filter(e => e.startsWith(`Row ${i}:`)).length === 0) {
          parsedData.push(config);
        }
      }

      if (errors.length > 0) {
        setCsvErrors(errors);
      }

      if (parsedData.length > 0) {
        setCsvData(parsedData);
        setShowCsvPreview(true);
      } else {
        toast({
          title: "No Valid Data",
          description: "CSV file contains no valid configurations",
          variant: "destructive"
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read CSV file",
        variant: "destructive"
      });
    };

    reader.readAsText(file);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    parseCsvFile(file);

    // Reset input
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = '';
    }
  };

  const handleBulkCreate = () => {
    if (csvData.length === 0) return;
    bulkCreateConfigMutation.mutate(csvData);
  };

  const downloadCsvTemplate = () => {
    const template = `Issue Type,L1,L2,L3,L4,Description,Active,SLA Response Hours,SLA Resolution Hours
Complaint,Finance,Payment,Payment Not Processed,Commission Issue,Payment related complaint,true,24,48
Request,Operations,Order Management,Order Modification,Cancel Request,Order cancellation request,true,12,24
Information,Tech,Product Listings,Product Information,Category Query,Product category information,true,,8`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ticket-config-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded successfully"
    });
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 7));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    const data = {
      ...wizardData,
      slaResponseHours: wizardData.slaResponseHours ? parseInt(wizardData.slaResponseHours) : null,
      slaResolutionHours: parseInt(wizardData.slaResolutionHours),
    };

    if (editingConfig) {
      // Update existing configuration
      updateConfigMutation.mutate({
        id: editingConfig.id,
        data: {
          description: data.description,
          isActive: data.isActive,
          slaResponseHours: data.slaResponseHours,
          slaResolutionHours: data.slaResolutionHours,
        },
      });
    } else {
      // Create new configuration
      createConfigMutation.mutate(data);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!wizardData.issueType && !!wizardData.l1;
      case 2: return !!wizardData.l2;
      case 3: return !!wizardData.l3;
      case 4: return !!wizardData.l4;
      case 5: return !!wizardData.description;
      case 6: return true;
      case 7: return !!wizardData.slaResolutionHours;
      default: return false;
    }
  };

  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Type *</Label>
              <Select
                value={wizardData.issueType}
                onValueChange={(value) => setWizardData({ ...wizardData, issueType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Complaint">Complaint</SelectItem>
                  <SelectItem value="Request">Request</SelectItem>
                  <SelectItem value="Information">Information</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>L1 - Department *</Label>
              <Select
                value={wizardData.l1}
                onValueChange={(value) => setWizardData({ ...wizardData, l1: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Marketplace">Marketplace</SelectItem>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Experience">Experience</SelectItem>
                  <SelectItem value="CX">CX</SelectItem>
                  <SelectItem value="Seller Support">Seller Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-2">
            <Label>L2 - Sub Department *</Label>
            <Input
              placeholder="e.g., Payment, Order Related Information"
              value={wizardData.l2}
              onChange={(e) => setWizardData({ ...wizardData, l2: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Enter the sub-department name for {wizardData.l1}
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-2">
            <Label>L3 - Category *</Label>
            <Input
              placeholder="e.g., Payment Not Processed, Product Approval Request"
              value={wizardData.l3}
              onChange={(e) => setWizardData({ ...wizardData, l3: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Enter the category name for {wizardData.l2}
            </p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-2">
            <Label>L4 - Sub-Category / Problem Area *</Label>
            <Input
              placeholder="e.g., Commission Adjustment Request, AR Issue"
              value={wizardData.l4}
              onChange={(e) => setWizardData({ ...wizardData, l4: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Enter the specific problem area for {wizardData.l3}
            </p>
          </div>
        );

      case 5:
        return (
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              placeholder="Brief description of this configuration"
              value={wizardData.description}
              onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={wizardData.isActive}
                onCheckedChange={(checked) => setWizardData({ ...wizardData, isActive: checked })}
              />
              <Label>Active Configuration</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {wizardData.isActive
                ? "This configuration will be available for ticket creation"
                : "This configuration will be hidden from ticket creation"}
            </p>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Response Time (hours)</Label>
              <Input
                type="number"
                placeholder="Optional"
                value={wizardData.slaResponseHours}
                onChange={(e) => setWizardData({ ...wizardData, slaResponseHours: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Resolution Time (hours) *</Label>
              <Input
                type="number"
                placeholder="Required"
                value={wizardData.slaResolutionHours}
                onChange={(e) => setWizardData({ ...wizardData, slaResolutionHours: e.target.value })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    "Issue Type & Department",
    "Sub Department",
    "Category",
    "Sub-Category / Problem Area",
    "Description",
    "Active Status",
    "SLA Timeline",
  ];

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
                    Ticket Manager
                  </h1>
                  <p className="text-xs text-muted-foreground">Manage categories, tags, and field configurations</p>
                </div>
              </div>
              <div className="flex gap-2 ml-8">
                <Button
                  variant={departmentFilter === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepartmentFilter("All")}
                >
                  All
                </Button>
                <Button
                  variant={departmentFilter === "Seller Support" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepartmentFilter("Seller Support")}
                >
                  Seller Support
                </Button>
                <Button
                  variant={departmentFilter === "Customer Support" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepartmentFilter("Customer Support")}
                >
                  Customer Support
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedConfigs.size > 0 && (
                <>
                  <Badge variant="secondary" className="px-3 py-1">
                    {selectedConfigs.size} selected
                  </Badge>
                  <Button
                    onClick={() => handleBulkActivate(true)}
                    variant="outline"
                    size="sm"
                  >
                    Activate Selected
                  </Button>
                  <Button
                    onClick={() => handleBulkActivate(false)}
                    variant="outline"
                    size="sm"
                  >
                    Deactivate Selected
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                </>
              )}
              <Button onClick={downloadCsvTemplate} variant="outline" size="sm">
                <FileText className="h-4 w-4" />
                Download Template
              </Button>
              <Button
                onClick={() => {
                  if (!configs || configs.length === 0) {
                    toast({
                      title: "No Data",
                      description: "No configurations to export",
                      variant: "destructive"
                    });
                    return;
                  }

                  // Create CSV content
                  const headers = ['Issue Type', 'L1', 'L2', 'L3', 'L4', 'Description', 'Active', 'SLA Response Hours', 'SLA Resolution Hours'];
                  const rows = configs.map(config => [
                    config.issueType,
                    config.l1,
                    config.l2,
                    config.l3,
                    config.l4,
                    config.description || '',
                    config.isActive ? 'true' : 'false',
                    config.slaResponseHours || '',
                    config.slaResolutionHours
                  ]);

                  const csvContent = [headers, ...rows]
                    .map(row => row.map(cell => `"${cell}"`).join(','))
                    .join('\n');

                  // Download
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ticket-configurations-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);

                  toast({
                    title: "Export Successful",
                    description: `Exported ${configs.length} configurations`
                  });
                }}
                variant="outline"
                size="sm"
              >
                <FileText className="h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={() => csvFileInputRef.current?.click()} variant="outline" size="sm">
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
              <Button onClick={() => setShowWizard(true)} size="sm">
                <Plus className="h-4 w-4" />
                Add Configuration
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hidden CSV file input */}
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv"
        onChange={handleCsvUpload}
        className="hidden"
      />

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {/* Analytics Summary Cards */}
        {configs && configs.length > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Configurations</p>
                <p className="mt-2 text-3xl font-bold">{configs.length}</p>
              </div>
            </Card>

            <Card className="p-6">
              <div>
                <p className="text-sm text-muted-foreground">Active Configs</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {configs.filter(c => c.isActive).length}
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div>
                <p className="text-sm text-muted-foreground">Inactive Configs</p>
                <p className="mt-2 text-3xl font-bold text-gray-600">
                  {configs.filter(c => !c.isActive).length}
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div>
                <p className="text-sm text-muted-foreground">Issue Types</p>
                <p className="mt-2 text-3xl font-bold">
                  {new Set(configs.map(c => c.issueType)).size}
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Distribution Charts */}
        {configs && configs.length > 0 && (
          <>
            <div className="mb-4 flex items-center">
              <h2 className="text-xl font-semibold">Category Distributions</h2>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              {/* Issue Type Distribution */}
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Issue Type Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(
                    configs.reduce((acc, c) => {
                      acc[c.issueType] = (acc[c.issueType] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {((count / configs.length) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* L1 Distribution */}
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">L1 (Department) Distribution</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {Object.entries(
                    configs.reduce((acc, c) => {
                      acc[c.l1] = (acc[c.l1] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([l1, count]) => (
                      <div key={l1} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex-1">{l1}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${(count / configs.length) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-sm w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              {/* L2 Distribution */}
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">L2 (Sub Department) Distribution</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {Object.entries(
                    configs.reduce((acc, c) => {
                      acc[c.l2] = (acc[c.l2] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([l2, count]) => (
                      <div key={l2} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex-1">{l2}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pink-500"
                              style={{ width: `${(count / configs.length) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-sm w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              {/* L3 Distribution */}
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">L3 (Category) Distribution</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {Object.entries(
                    configs.reduce((acc, c) => {
                      acc[c.l3] = (acc[c.l3] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([l3, count]) => (
                      <div key={l3} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex-1">{l3}</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${(count / configs.length) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-sm w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>

            <div className="mb-4 border-t pt-6">
              <h2 className="text-xl font-semibold">Categories</h2>
            </div>
          </>
        )}

        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={configs && configs.length > 0 && selectedConfigs.size === configs.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Request Type</TableHead>
                    <TableHead>Dept (L1)</TableHead>
                    <TableHead>Sub Dept (L2)</TableHead>
                    <TableHead>Category (L3)</TableHead>
                    <TableHead>Sub Category (L4)</TableHead>
                    <TableHead>SLA (hrs)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs && configs.length > 0 ? (
                    configs.map((config, index) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedConfigs.has(config.id)}
                            onCheckedChange={() => toggleSelect(config.id)}
                          />
                        </TableCell>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{config.issueType}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{config.l1}</TableCell>
                        <TableCell>{config.l2}</TableCell>
                        <TableCell>{config.l3}</TableCell>
                        <TableCell>{config.l4}</TableCell>
                        <TableCell>
                          {config.slaResponseHours && `${config.slaResponseHours}/`}
                          {config.slaResolutionHours}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={config.isActive ? "default" : "secondary"}
                            className={config.isActive ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {config.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingConfig(config);
                                setWizardData({
                                  issueType: config.issueType as "Complaint" | "Request" | "Information",
                                  l1: config.l1,
                                  l2: config.l2,
                                  l3: config.l3,
                                  l4: config.l4,
                                  description: config.description || "",
                                  isActive: config.isActive,
                                  slaResponseHours: config.slaResponseHours?.toString() || "",
                                  slaResolutionHours: config.slaResolutionHours?.toString() || "",
                                });
                                setCurrentStep(1);
                                setShowWizard(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the configuration for "${config.l4}"?`)) {
                                  deleteConfigMutation.mutate(config.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No configurations found. Click "Add Configuration" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>

      {/* Configuration Wizard */}
      <Dialog open={showWizard} onOpenChange={(open) => {
        if (!open) {
          setShowWizard(false);
          resetWizard();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit" : "Add"} Ticket Configuration
            </DialogTitle>
            <DialogDescription>
              {editingConfig ? "Update the configuration details below" : "Fill in all required fields to create a new ticket configuration"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Issue Type & Department Section */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="issueType">Issue Type *</Label>
                <Select
                  value={wizardData.issueType}
                  onValueChange={(value) => setWizardData({ ...wizardData, issueType: value as any })}
                >
                  <SelectTrigger id="issueType">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Complaint">Complaint</SelectItem>
                    <SelectItem value="Request">Request</SelectItem>
                    <SelectItem value="Information">Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="l1">L1 - Department *</Label>
                <Input
                  id="l1"
                  value={wizardData.l1}
                  onChange={(e) => setWizardData({ ...wizardData, l1: e.target.value })}
                  placeholder="e.g., Finance, Operations"
                  disabled={!!editingConfig}
                />
              </div>
            </div>

            {/* Category Hierarchy */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="l2">L2 - Sub Department *</Label>
                <Input
                  id="l2"
                  value={wizardData.l2}
                  onChange={(e) => setWizardData({ ...wizardData, l2: e.target.value })}
                  placeholder="e.g., Accounts Payable"
                  disabled={!!editingConfig}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="l3">L3 - Category *</Label>
                <Input
                  id="l3"
                  value={wizardData.l3}
                  onChange={(e) => setWizardData({ ...wizardData, l3: e.target.value })}
                  placeholder="e.g., Invoice Processing"
                  disabled={!!editingConfig}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="l4">L4 - Sub Category / Problem Area *</Label>
              <Input
                id="l4"
                value={wizardData.l4}
                onChange={(e) => setWizardData({ ...wizardData, l4: e.target.value })}
                placeholder="e.g., Payment Delay"
                disabled={!!editingConfig}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={wizardData.description}
                onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
                placeholder="Brief description of this configuration"
              />
            </div>

            {/* SLA Configuration */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slaResponseHours">SLA Response Time (hours)</Label>
                <Input
                  id="slaResponseHours"
                  type="number"
                  value={wizardData.slaResponseHours}
                  onChange={(e) => setWizardData({ ...wizardData, slaResponseHours: e.target.value })}
                  placeholder="24"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slaResolutionHours">SLA Resolution Time (hours) *</Label>
                <Input
                  id="slaResolutionHours"
                  type="number"
                  value={wizardData.slaResolutionHours}
                  onChange={(e) => setWizardData({ ...wizardData, slaResolutionHours: e.target.value })}
                  placeholder="72"
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={wizardData.isActive}
                onCheckedChange={(checked) => setWizardData({ ...wizardData, isActive: checked })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active Configuration
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowWizard(false);
                resetWizard();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !wizardData.issueType ||
                !wizardData.l1 ||
                !wizardData.l2 ||
                !wizardData.l3 ||
                !wizardData.l4 ||
                !wizardData.slaResolutionHours ||
                createConfigMutation.isPending ||
                updateConfigMutation.isPending
              }
            >
              {(createConfigMutation.isPending || updateConfigMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingConfig ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{editingConfig ? "Update Configuration" : "Create Configuration"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Preview Dialog */}
      <Dialog open={showCsvPreview} onOpenChange={(open) => {
        if (!open) {
          setShowCsvPreview(false);
          setCsvData([]);
          setCsvErrors([]);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              CSV Upload Preview
            </DialogTitle>
            <DialogDescription>
              Review the configurations before importing. {csvData.length} valid configuration(s) found.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Errors Alert */}
            {csvErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Found {csvErrors.length} error(s):</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {csvErrors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {csvErrors.length > 5 && (
                      <li>... and {csvErrors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* CSV Template Info */}
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-1">CSV Format:</div>
                <div className="text-sm text-muted-foreground">
                  Columns: Issue Type, L1, L2, L3, L4, Description, Active, SLA Response Hours, SLA Resolution Hours
                </div>
              </AlertDescription>
            </Alert>

            {/* Preview Table */}
            {csvData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">No.</TableHead>
                        <TableHead>Issue Type</TableHead>
                        <TableHead>L1</TableHead>
                        <TableHead>L2</TableHead>
                        <TableHead>L3</TableHead>
                        <TableHead>L4</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>SLA (hrs)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.map((config, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{config.issueType}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{config.l1}</TableCell>
                          <TableCell>{config.l2}</TableCell>
                          <TableCell>{config.l3}</TableCell>
                          <TableCell>{config.l4}</TableCell>
                          <TableCell className="max-w-xs truncate" title={config.description}>
                            {config.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.isActive ? "default" : "secondary"}>
                              {config.isActive ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {config.slaResponseHours && `${config.slaResponseHours}/`}
                            {config.slaResolutionHours}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCsvPreview(false);
                setCsvData([]);
                setCsvErrors([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={csvData.length === 0 || bulkCreateConfigMutation.isPending}
            >
              {bulkCreateConfigMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {csvData.length} Configuration(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
