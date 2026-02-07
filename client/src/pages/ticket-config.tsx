import React, { useState, useRef } from "react";
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
  RotateCcw,
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
  l4: string | null; // Sub-Category/Problem Area (optional)
  description: string;
  departmentType: "Seller Support" | "Customer Support" | "All";
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
    departmentType: "All" as "Seller Support" | "Customer Support" | "All",
    isActive: true,
    slaResponseHours: "",
    slaResolutionHours: "",
    fieldOverrides: [] as Array<{
      fieldConfigurationId: string;
      visibilityOverride: "visible" | "hidden" | null;
      requiredOverride: boolean | null;
    }>,
  });

  // CSV upload state
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Multi-selection state
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(new Set());
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Department filter state
  const [departmentFilter, setDepartmentFilter] = useState<"All" | "Seller Support" | "Customer Support">("All");
  const [requestTypeFilter, setRequestTypeFilter] = useState<"All" | "Complaint" | "Request" | "Information">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [slaFilter, setSlaFilter] = useState<"All" | "With Response SLA" | "Resolution Only">("All");

  // Tag filter state
  const [tagStatusFilter, setTagStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [tagAutoAppliedFilter, setTagAutoAppliedFilter] = useState<"All" | "Yes" | "No">("All");

  // Custom field filter state
  const [fieldStatusFilter, setFieldStatusFilter] = useState<"All" | "Enabled" | "Disabled">("All");
  const [fieldRequiredFilter, setFieldRequiredFilter] = useState<"All" | "Yes" | "No">("All");

  // Tags state
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<any | null>(null);
  const [tagFormData, setTagFormData] = useState({
    name: "",
    departmentType: "All" as "Seller Support" | "Customer Support" | "All",
  });

  // Custom Field state
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<any | null>(null);
  const [fieldFormData, setFieldFormData] = useState({
    fieldName: "",
    fieldLabel: "",
    fieldType: "text" as "text" | "textarea" | "select" | "multiselect" | "file" | "array",
    departmentType: "All" as "Seller Support" | "Customer Support" | "All",
    isEnabled: true,
    isRequired: false,
    displayOrder: 0,
    placeholder: "",
    helpText: "",
    options: [] as Array<{ label: string; value: string }>,
  });

  // Fetch configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ["ticket-configs"],
    queryFn: async () => {
      const res = await fetch("/api/config/ticket-configs");
      if (!res.ok) throw new Error("Failed to fetch configurations");
      return res.json() as Promise<CategoryConfig[]>;
    },
  });

  // Filter configurations based on department
  const filteredConfigs = React.useMemo(() => {
    if (!configs) return [];

    return configs.filter(config => {
      // Department filter
      const configDept = config.departmentType || "All";
      const deptMatch =
        departmentFilter === "All"
          ? true  // Show all configs when "All" is selected
          : configDept === departmentFilter;  // Show only exact matches

      // Request Type filter
      const requestTypeMatch = requestTypeFilter === "All" ||
                                config.issueType === requestTypeFilter;

      // Status filter
      const statusMatch = statusFilter === "All" ||
                          (statusFilter === "Active" && config.isActive) ||
                          (statusFilter === "Inactive" && !config.isActive);

      // SLA filter
      const slaMatch = slaFilter === "All" ||
                       (slaFilter === "With Response SLA" && config.slaResponseHours) ||
                       (slaFilter === "Resolution Only" && !config.slaResponseHours);

      return deptMatch && requestTypeMatch && statusMatch && slaMatch;
    });
  }, [configs, departmentFilter, requestTypeFilter, statusFilter, slaFilter]);

  // Fetch tags
  const { data: tags, isLoading: isLoadingTags } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/config/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });

  // Fetch custom fields
  const { data: customFields, isLoading: isLoadingFields } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      const res = await fetch("/api/config/field-configurations");
      if (!res.ok) throw new Error("Failed to fetch custom fields");
      return res.json();
    },
  });

  // Filter tags based on department and other criteria
  const filteredTags = React.useMemo(() => {
    if (!tags) return [];

    return tags.filter((tag: any) => {
      // Department filter
      const tagDept = tag.departmentType || "All";
      const deptMatch =
        departmentFilter === "All"
          ? true
          : tagDept === departmentFilter;

      // Status filter
      const statusMatch =
        tagStatusFilter === "All" ||
        (tagStatusFilter === "Active" && tag.isActive) ||
        (tagStatusFilter === "Inactive" && !tag.isActive);

      // Auto-applied filter
      const autoAppliedMatch =
        tagAutoAppliedFilter === "All" ||
        (tagAutoAppliedFilter === "Yes" && tag.isAutoApplied) ||
        (tagAutoAppliedFilter === "No" && !tag.isAutoApplied);

      return deptMatch && statusMatch && autoAppliedMatch;
    });
  }, [tags, departmentFilter, tagStatusFilter, tagAutoAppliedFilter]);

  // Filter custom fields based on department and other criteria
  const filteredFields = React.useMemo(() => {
    if (!customFields) return [];

    return customFields.filter((field: any) => {
      // Department filter
      const fieldDept = field.departmentType || "All";
      const deptMatch =
        departmentFilter === "All"
          ? true
          : fieldDept === departmentFilter;

      // Status filter
      const statusMatch =
        fieldStatusFilter === "All" ||
        (fieldStatusFilter === "Enabled" && field.isEnabled) ||
        (fieldStatusFilter === "Disabled" && !field.isEnabled);

      // Required filter
      const requiredMatch =
        fieldRequiredFilter === "All" ||
        (fieldRequiredFilter === "Yes" && field.isRequired) ||
        (fieldRequiredFilter === "No" && !field.isRequired);

      return deptMatch && statusMatch && requiredMatch;
    });
  }, [customFields, departmentFilter, fieldStatusFilter, fieldRequiredFilter]);

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

  // Tag mutations
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
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setShowTagDialog(false);
      setEditingTag(null);
      setTagFormData({ name: "", departmentType: "All" });
      toast({ title: "Success", description: "Tag created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create tag", variant: "destructive" });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/config/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update tag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setShowTagDialog(false);
      setEditingTag(null);
      setTagFormData({ name: "", departmentType: "All" });
      toast({ title: "Success", description: "Tag updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tag", variant: "destructive" });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/tags/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete tag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast({ title: "Success", description: "Tag deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tag", variant: "destructive" });
    },
  });

  // Custom Field mutations
  const createFieldMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/config/field-configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create custom field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      setShowFieldDialog(false);
      setEditingField(null);
      setFieldFormData({
        fieldName: "",
        fieldLabel: "",
        fieldType: "text",
        departmentType: "All",
        isEnabled: true,
        isRequired: false,
        displayOrder: 0,
        placeholder: "",
        helpText: "",
        options: [],
      });
      toast({ title: "Success", description: "Custom field created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create custom field", variant: "destructive" });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/config/field-configurations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update custom field");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      setShowFieldDialog(false);
      setEditingField(null);
      setFieldFormData({
        fieldName: "",
        fieldLabel: "",
        fieldType: "text",
        departmentType: "All",
        isEnabled: true,
        isRequired: false,
        displayOrder: 0,
        placeholder: "",
        helpText: "",
        options: [],
      });
      toast({ title: "Success", description: "Custom field updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update custom field", variant: "destructive" });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/field-configurations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete custom field");
      return res.status === 204 ? null : res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Success", description: "Custom field deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete custom field", variant: "destructive" });
    },
  });

  const seedDefaultFieldsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/config/field-configurations/seed-defaults", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to seed default fields");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({
        title: "Success",
        description: `Seeded ${data.fields?.length || 0} default fields (${data.skipped || 0} already existed)`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to seed default fields", variant: "destructive" });
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
      departmentType: "All",
      isActive: true,
      slaResponseHours: "",
      slaResolutionHours: "",
      fieldOverrides: [],
    });
  };

  // Multi-selection handlers
  const toggleSelectAll = () => {
    if (!filteredConfigs) return;
    if (selectedConfigs.size === filteredConfigs.length) {
      setSelectedConfigs(new Set());
    } else {
      setSelectedConfigs(new Set(filteredConfigs.map(c => c.id)));
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

  // Multi-selection handlers for Custom Fields
  const toggleSelectAllFields = () => {
    if (!filteredFields) return;
    if (selectedFields.size === filteredFields.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(filteredFields.map((f: any) => f.id)));
    }
  };

  const toggleSelectField = (id: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFields(newSelected);
  };

  const handleBulkDeleteFields = () => {
    if (selectedFields.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedFields.size} custom field(s)?`)) {
      selectedFields.forEach(id => {
        deleteFieldMutation.mutate(id);
      });
      setSelectedFields(new Set());
    }
  };

  const handleBulkToggleFields = (enable: boolean) => {
    if (selectedFields.size === 0) return;
    selectedFields.forEach(id => {
      updateFieldMutation.mutate({
        id,
        data: { isEnabled: enable },
      });
    });
    setSelectedFields(new Set());
  };

  // Multi-selection handlers for Tags
  const toggleSelectAllTags = () => {
    if (!filteredTags) return;
    if (selectedTags.size === filteredTags.length) {
      setSelectedTags(new Set());
    } else {
      setSelectedTags(new Set(filteredTags.map((t: any) => t.id)));
    }
  };

  const toggleSelectTag = (id: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTags(newSelected);
  };

  const handleBulkDeleteTags = () => {
    if (selectedTags.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedTags.size} tag(s)?`)) {
      selectedTags.forEach(id => {
        deleteTagMutation.mutate(id);
      });
      setSelectedTags(new Set());
    }
  };

  // Helper function to parse CSV line properly (handles quoted fields)
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    // Remove leading/trailing quotes if the entire line is quoted
    const trimmedLine = line.trim();
    const actualLine = (trimmedLine.startsWith('"') && trimmedLine.endsWith('"'))
      ? trimmedLine.slice(1, -1)
      : trimmedLine;

    for (let i = 0; i < actualLine.length; i++) {
      const char = actualLine[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
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

      // Parse header using proper CSV parsing
      const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
      const requiredHeaders = ['issue type', 'l1', 'l2', 'l3', 'description', 'active'];

      // SLA column can be either 'sla (hrs)' or 'sla resolution hours'
      const hasSlaColumn = headers.includes('sla (hrs)') || headers.includes('sla resolution hours');
      if (!hasSlaColumn) {
        toast({
          title: "Invalid CSV Format",
          description: "Missing required SLA column (must have 'SLA (hrs)' or 'SLA Resolution Hours')",
          variant: "destructive"
        });
        return;
      }

      // Department column can be either 'department type' or 'department'
      const hasDepartmentColumn = headers.includes('department type') || headers.includes('department');
      if (!hasDepartmentColumn) {
        toast({
          title: "Invalid CSV Format",
          description: "Missing required Department column (must have 'Department Type' or 'Department')",
          variant: "destructive"
        });
        return;
      }

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
        const values = parseCsvLine(lines[i]);
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Validate and transform
        // Handle SLA - can be single 'sla (hrs)' or separate response/resolution hours
        const slaValue = row['sla (hrs)'] || row['sla resolution hours'];

        const config: any = {
          issueType: row['issue type'],
          l1: row['l1'],
          l2: row['l2'],
          l3: row['l3'],
          l4: row['l4'] || '', // L4 is optional
          description: row['description'],
          departmentType: row['department type'] || row['department'],
          isActive: row['active']?.toLowerCase() === 'true' || row['active']?.toLowerCase() === 'yes',
          slaResponseHours: row['sla response hours'] ? parseInt(row['sla response hours']) : null,
          slaResolutionHours: parseInt(slaValue),
        };

        // Validation
        if (!['Complaint', 'Request', 'Information'].includes(config.issueType)) {
          errors.push(`Row ${i}: Invalid issue type "${config.issueType}" (must be Complaint, Request, or Information)`);
        }
        if (!config.l1 || !config.l2 || !config.l3) {
          errors.push(`Row ${i}: Missing required category fields (l1, l2, l3 are required; l4 is optional)`);
        }
        if (!config.departmentType) {
          errors.push(`Row ${i}: Missing required Department Type`);
        } else if (!['Seller Support', 'Customer Support', 'All'].includes(config.departmentType)) {
          errors.push(`Row ${i}: Invalid Department Type "${config.departmentType}" (must be "Seller Support", "Customer Support", or "All")`);
        }
        if (!config.slaResolutionHours || isNaN(config.slaResolutionHours)) {
          errors.push(`Row ${i}: Invalid or missing SLA resolution hours (must be a number)`);
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
    const template = `No.,Issue Type,L1,L2,L3,L4,Description,Department Type,Active,SLA (hrs)
1,Complaint,Finance,Payment,Payment Not Processed,Commission Issue,Payment related complaint,Seller Support,true,48
2,Request,Operations,Order Management,Order Modification,Cancel Request,Order cancellation request,Seller Support,true,24
3,Information,Tech,Product Listings,Product Information,,Product category information,All,true,8`;

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
    setCurrentStep((prev) => Math.min(prev + 1, 8));
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
      case 5: return true;
      case 6: return true;
      case 7: return !!wizardData.slaResolutionHours;
      case 8: return true; // Form fields step is optional
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
            <Label>Description</Label>
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

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Configure Form Fields</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Customize which fields appear and their requirements for this category.
                Core fields (Vendor, Department, Issue Type, Category, Subject, Description) are always visible and required.
              </p>
            </div>

            {/* Core Fields - Always Required */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium mb-3 text-sm">Core Fields (Locked)</h4>
              <div className="space-y-2">
                {["Vendor Handle", "Department", "Issue Type", "Category", "Subject", "Description"].map((label) => (
                  <div key={label} className="flex items-center justify-between py-2 px-3 bg-background rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{label}</span>
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">Locked</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Fields - Configurable */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3 text-sm">Optional Fields</h4>
              <div className="space-y-3">
                {customFields?.filter((f: any) =>
                  !["vendorHandle", "department", "issueType", "categoryId", "subject", "description"].includes(f.fieldName)
                ).map((field: any) => {
                  const override = wizardData.fieldOverrides.find(o => o.fieldConfigurationId === field.id);
                  const isHidden = override?.visibilityOverride === "hidden";
                  const isRequired = override?.requiredOverride ?? field.isRequired;

                  return (
                    <div
                      key={field.id}
                      className={`flex items-center justify-between py-3 px-4 border rounded-lg ${
                        isHidden ? "bg-muted/30 opacity-60" : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{field.fieldLabel}</span>
                          {isRequired && !isHidden && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{field.fieldName} ({field.fieldType})</span>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Visibility toggle */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Visible</Label>
                          <Switch
                            checked={!isHidden}
                            onCheckedChange={(checked) => {
                              const existing = wizardData.fieldOverrides.find(o => o.fieldConfigurationId === field.id);
                              if (existing) {
                                setWizardData({
                                  ...wizardData,
                                  fieldOverrides: wizardData.fieldOverrides.map(o =>
                                    o.fieldConfigurationId === field.id
                                      ? { ...o, visibilityOverride: checked ? null : "hidden" }
                                      : o
                                  ),
                                });
                              } else {
                                setWizardData({
                                  ...wizardData,
                                  fieldOverrides: [
                                    ...wizardData.fieldOverrides,
                                    {
                                      fieldConfigurationId: field.id,
                                      visibilityOverride: checked ? null : "hidden",
                                      requiredOverride: null,
                                    },
                                  ],
                                });
                              }
                            }}
                          />
                        </div>

                        {/* Required toggle (only if visible) */}
                        {!isHidden && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Required</Label>
                            <Switch
                              checked={isRequired}
                              onCheckedChange={(checked) => {
                                const existing = wizardData.fieldOverrides.find(o => o.fieldConfigurationId === field.id);
                                if (existing) {
                                  setWizardData({
                                    ...wizardData,
                                    fieldOverrides: wizardData.fieldOverrides.map(o =>
                                      o.fieldConfigurationId === field.id
                                        ? { ...o, requiredOverride: checked }
                                        : o
                                    ),
                                  });
                                } else {
                                  setWizardData({
                                    ...wizardData,
                                    fieldOverrides: [
                                      ...wizardData.fieldOverrides,
                                      {
                                        fieldConfigurationId: field.id,
                                        visibilityOverride: null,
                                        requiredOverride: checked,
                                      },
                                    ],
                                  });
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!customFields || customFields.filter((f: any) =>
                  !["vendorHandle", "department", "issueType", "categoryId", "subject", "description"].includes(f.fieldName)
                ).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No optional fields configured. Add custom fields in the Custom Field Manager above.
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Fields with no override will use their default configuration.
              Changes apply only to tickets created under this specific category.
            </p>
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
    "Form Fields",
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
              <div className="ml-8 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/admin-tools")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Tools
                </Button>
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
              <Button
                onClick={() => setLocation("/routing-config")}
                variant="outline"
                size="sm"
                className="border-accent text-accent hover:bg-accent/10"
              >
                <Settings className="h-4 w-4" />
                Routing Rules
              </Button>
              <Button onClick={downloadCsvTemplate} variant="outline" size="sm">
                <FileText className="h-4 w-4" />
                Download Template
              </Button>
              <Button
                onClick={() => {
                  if (!filteredConfigs || filteredConfigs.length === 0) {
                    toast({
                      title: "No Data",
                      description: "No configurations to export",
                      variant: "destructive"
                    });
                    return;
                  }

                  // Create CSV content
                  const headers = ['Issue Type', 'L1', 'L2', 'L3', 'L4', 'Description', 'Active', 'SLA Response Hours', 'SLA Resolution Hours'];
                  const rows = filteredConfigs.map(config => [
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
                    description: `Exported ${filteredConfigs.length} configurations`
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
                Add Category
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
        {/* Summary Section */}
        <div className="mb-6">
          <h2 className="mb-4 text-xl font-semibold">Summary</h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {/* Categories Stats */}
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Categories</p>
              <p className="mt-1 text-2xl font-bold">{filteredConfigs?.length || 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {filteredConfigs?.filter(c => c.isActive).length || 0}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Issue Types</p>
              <p className="mt-1 text-2xl font-bold">
                {filteredConfigs && filteredConfigs.length > 0 ? new Set(filteredConfigs.map(c => c.issueType)).size : 0}
              </p>
            </Card>

            {/* Tags Stats */}
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Tags</p>
              <p className="mt-1 text-2xl font-bold">{filteredTags?.length || 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Active Tags</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {filteredTags?.filter(t => t.isActive).length || 0}
              </p>
            </Card>

            {/* Custom Fields Stats */}
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Fields</p>
              <p className="mt-1 text-2xl font-bold">{filteredFields?.length || 0}</p>
            </Card>
          </div>
        </div>

        {/* Distribution Charts - Only show when data exists */}
        {filteredConfigs && filteredConfigs.length > 0 && (
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
                    filteredConfigs.reduce((acc, c) => {
                      acc[c.issueType] = (acc[c.issueType] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {((count / filteredConfigs.length) * 100).toFixed(1)}%
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
                    filteredConfigs.reduce((acc, c) => {
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
                              style={{ width: `${(count / filteredConfigs.length) * 100}%` }}
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
                    filteredConfigs.reduce((acc, c) => {
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
                              style={{ width: `${(count / filteredConfigs.length) * 100}%` }}
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
                    filteredConfigs.reduce((acc, c) => {
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
                              style={{ width: `${(count / filteredConfigs.length) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold text-sm w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Categories Section - Always visible */}
        <div className={filteredConfigs && filteredConfigs.length > 0 ? "border-t pt-6" : ""}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Categories</h2>
            {selectedConfigs.size > 0 && (
              <div className="flex gap-2">
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
              </div>
            )}
          </div>

          {/* Category Filters */}
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Request Type:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={requestTypeFilter === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRequestTypeFilter("All")}
                >
                  All
                </Button>
                <Button
                  variant={requestTypeFilter === "Complaint" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRequestTypeFilter("Complaint")}
                >
                  Complaint
                </Button>
                <Button
                  variant={requestTypeFilter === "Request" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRequestTypeFilter("Request")}
                >
                  Request
                </Button>
                <Button
                  variant={requestTypeFilter === "Information" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRequestTypeFilter("Information")}
                >
                  Information
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("All")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "Active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "Inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Inactive")}
                >
                  Inactive
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <span className="text-sm font-medium text-muted-foreground">SLA:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={slaFilter === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlaFilter("All")}
                >
                  All
                </Button>
                <Button
                  variant={slaFilter === "With Response SLA" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlaFilter("With Response SLA")}
                >
                  With Response SLA
                </Button>
                <Button
                  variant={slaFilter === "Resolution Only" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlaFilter("Resolution Only")}
                >
                  Resolution Only
                </Button>
              </div>
            </div>
          </Card>
        </div>

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
                        checked={filteredConfigs && filteredConfigs.length > 0 && selectedConfigs.size === filteredConfigs.length}
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
                  {filteredConfigs && filteredConfigs.length > 0 ? (
                    filteredConfigs.map((config, index) => (
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
                                  departmentType: config.departmentType,
                                  isActive: config.isActive,
                                  slaResponseHours: config.slaResponseHours?.toString() || "",
                                  slaResolutionHours: config.slaResolutionHours?.toString() || "",
                                  fieldOverrides: [],
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
                        No Category Created Yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Tags Management Section */}
        <Card className="mt-6">
          <div className="flex items-center justify-between border-b p-6">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">Tags</h2>
                <p className="text-sm text-muted-foreground">Manage custom tags for ticket categorization</p>
              </div>
              {selectedTags.size > 0 && (
                <div className="flex gap-2">
                  <Badge variant="secondary" className="px-3 py-1">
                    {selectedTags.size} selected
                  </Badge>
                  <Button
                    onClick={handleBulkDeleteTags}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
            <Button
              onClick={() => setShowTagDialog(true)}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Tag
            </Button>
          </div>

          {/* Tag Filters */}
          <div className="border-b p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={filteredTags && filteredTags.length > 0 && selectedTags.size === filteredTags.length}
                  onCheckedChange={toggleSelectAllTags}
                />
                <span className="text-sm font-medium text-muted-foreground">Select All</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={tagStatusFilter === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTagStatusFilter("All")}
                >
                  All
                </Button>
                <Button
                  variant={tagStatusFilter === "Active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTagStatusFilter("Active")}
                >
                  Active
                </Button>
                <Button
                  variant={tagStatusFilter === "Inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTagStatusFilter("Inactive")}
                >
                  Inactive
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <span className="text-sm font-medium text-muted-foreground">Auto-Applied:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={tagAutoAppliedFilter === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTagAutoAppliedFilter("All")}
                >
                  All
                </Button>
                <Button
                  variant={tagAutoAppliedFilter === "Yes" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTagAutoAppliedFilter("Yes")}
                >
                  Yes
                </Button>
                <Button
                  variant={tagAutoAppliedFilter === "No" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTagAutoAppliedFilter("No")}
                >
                  No
                </Button>
              </div>
            </div>
          </div>

          {isLoadingTags ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-6">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredTags && filteredTags.length > 0 ? (
                  filteredTags.map((tag: any) => (
                    <Card key={tag.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedTags.has(tag.id)}
                          onCheckedChange={() => toggleSelectTag(tag.id)}
                        />
                        <Badge variant="outline">{tag.name}</Badge>
                        <span className="text-xs text-muted-foreground">{tag.departmentType}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTag(tag);
                            setTagFormData({
                              name: tag.name,
                              departmentType: tag.departmentType || "All",
                            });
                            setShowTagDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
                              deleteTagMutation.mutate(tag.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center text-muted-foreground p-8">
                    No tags found. Click "Add Tag" to create one.
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Custom Field Manager Section */}
        <Card className="mt-6">
          <div className="flex items-center justify-between border-b p-6">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold">Custom Field Manager</h2>
                <p className="text-sm text-muted-foreground">Configure custom fields for ticket creation</p>
              </div>
              {selectedFields.size > 0 && (
                <div className="flex gap-2">
                  <Badge variant="secondary" className="px-3 py-1">
                    {selectedFields.size} selected
                  </Badge>
                  <Button
                    onClick={() => handleBulkToggleFields(true)}
                    variant="outline"
                    size="sm"
                  >
                    Enable Selected
                  </Button>
                  <Button
                    onClick={() => handleBulkToggleFields(false)}
                    variant="outline"
                    size="sm"
                  >
                    Disable Selected
                  </Button>
                  <Button
                    onClick={handleBulkDeleteFields}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => seedDefaultFieldsMutation.mutate()}
                size="sm"
                variant="outline"
                disabled={seedDefaultFieldsMutation.isPending}
              >
                {seedDefaultFieldsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Seed Default Fields
              </Button>
              <Button
                onClick={() => setShowFieldDialog(true)}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Field
              </Button>
            </div>
          </div>

          {/* Custom Field Filters */}
          <div className="border-b p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={fieldStatusFilter === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFieldStatusFilter("All")}
                >
                  All
                </Button>
                <Button
                  variant={fieldStatusFilter === "Enabled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFieldStatusFilter("Enabled")}
                >
                  Enabled
                </Button>
                <Button
                  variant={fieldStatusFilter === "Disabled" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFieldStatusFilter("Disabled")}
                >
                  Disabled
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <span className="text-sm font-medium text-muted-foreground">Required:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={fieldRequiredFilter === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFieldRequiredFilter("All")}
                >
                  All
                </Button>
                <Button
                  variant={fieldRequiredFilter === "Yes" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFieldRequiredFilter("Yes")}
                >
                  Yes
                </Button>
                <Button
                  variant={fieldRequiredFilter === "No" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFieldRequiredFilter("No")}
                >
                  No
                </Button>
              </div>
            </div>
          </div>

          {isLoadingFields ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-6">
              {filteredFields && filteredFields.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredFields && filteredFields.length > 0 && selectedFields.size === filteredFields.length}
                            onCheckedChange={toggleSelectAllFields}
                          />
                        </TableHead>
                        <TableHead className="w-12">Order</TableHead>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFields
                        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                        .map((field: any) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedFields.has(field.id)}
                                onCheckedChange={() => toggleSelectField(field.id)}
                              />
                            </TableCell>
                            <TableCell className="text-center">{field.displayOrder}</TableCell>
                            <TableCell className="font-mono text-sm">{field.fieldName}</TableCell>
                            <TableCell className="font-medium">{field.fieldLabel}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{field.fieldType}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{field.departmentType}</Badge>
                            </TableCell>
                            <TableCell>
                              {field.isRequired ? (
                                <Badge className="bg-red-500 hover:bg-red-600">Required</Badge>
                              ) : (
                                <Badge variant="outline">Optional</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={field.isEnabled ? "default" : "secondary"}
                                className={field.isEnabled ? "bg-green-500 hover:bg-green-600" : ""}
                              >
                                {field.isEnabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingField(field);
                                    setFieldFormData({
                                      fieldName: field.fieldName,
                                      fieldLabel: field.fieldLabel,
                                      fieldType: field.fieldType,
                                      departmentType: field.departmentType || "All",
                                      isEnabled: field.isEnabled,
                                      isRequired: field.isRequired,
                                      displayOrder: field.displayOrder,
                                      placeholder: field.metadata?.placeholder || "",
                                      helpText: field.metadata?.helpText || "",
                                      options: field.metadata?.options || [],
                                    });
                                    setShowFieldDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete the field "${field.fieldLabel}"?`)) {
                                      deleteFieldMutation.mutate(field.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  No custom fields found. Click "Add Custom Field" to create one.
                </div>
              )}
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
                <Label htmlFor="departmentType">Department Type</Label>
                <Select
                  value={wizardData.departmentType}
                  onValueChange={(value) => setWizardData({ ...wizardData, departmentType: value as any })}
                >
                  <SelectTrigger id="departmentType">
                    <SelectValue placeholder="Select department type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Seller Support">Seller Support</SelectItem>
                    <SelectItem value="Customer Support">Customer Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category Hierarchy */}
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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

            {/* Audit Trail Section - Only shown when editing */}
            {editingConfig && (
              <div className="mt-6 border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Audit Information</h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created Date:</span>
                    <span className="font-medium">
                      {editingConfig.createdAt ? new Date(editingConfig.createdAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Update Date:</span>
                    <span className="font-medium">
                      {editingConfig.updatedAt ? new Date(editingConfig.updatedAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  {editingConfig.updatedById && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Update By:</span>
                      <span className="font-medium">
                        {editingConfig.updatedByName || editingConfig.updatedById}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-medium">
                      {editingConfig.version || 1}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields Configuration */}
            <div className="mt-6 border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold">Form Fields Configuration</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Configure which fields appear and their requirements for this category.
                Toggle visibility and required status for each field.
              </p>

              {/* All Fields - Configurable */}
              <div className="space-y-2">
                {customFields?.map((field: any) => {
                  const override = wizardData.fieldOverrides.find(o => o.fieldConfigurationId === field.id);
                  const isHidden = override?.visibilityOverride === "hidden";
                  const isRequired = override?.requiredOverride ?? field.isRequired;

                  return (
                    <div
                      key={field.id}
                      className={`flex items-center justify-between py-2 px-3 border rounded-lg ${
                        isHidden ? "bg-muted/30 opacity-60" : ""
                      }`}
                    >
                      <div>
                        <span className="font-medium text-sm">{field.fieldLabel}</span>
                        <span className="text-xs text-muted-foreground ml-2">({field.fieldType})</span>
                        {field.isRequired && !override?.requiredOverride && (
                          <Badge variant="outline" className="ml-2 text-xs">Default: Required</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Visibility toggle */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Show</Label>
                          <Switch
                            checked={!isHidden}
                            onCheckedChange={(checked) => {
                              const existing = wizardData.fieldOverrides.find(o => o.fieldConfigurationId === field.id);
                              if (existing) {
                                setWizardData({
                                  ...wizardData,
                                  fieldOverrides: wizardData.fieldOverrides.map(o =>
                                    o.fieldConfigurationId === field.id
                                      ? { ...o, visibilityOverride: checked ? null : "hidden" }
                                      : o
                                  ),
                                });
                              } else {
                                setWizardData({
                                  ...wizardData,
                                  fieldOverrides: [
                                    ...wizardData.fieldOverrides,
                                    {
                                      fieldConfigurationId: field.id,
                                      visibilityOverride: checked ? null : "hidden",
                                      requiredOverride: null,
                                    },
                                  ],
                                });
                              }
                            }}
                          />
                        </div>

                        {/* Required toggle (only if visible) */}
                        {!isHidden && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Required</Label>
                            <Switch
                              checked={isRequired}
                              onCheckedChange={(checked) => {
                                const existing = wizardData.fieldOverrides.find(o => o.fieldConfigurationId === field.id);
                                if (existing) {
                                  setWizardData({
                                    ...wizardData,
                                    fieldOverrides: wizardData.fieldOverrides.map(o =>
                                      o.fieldConfigurationId === field.id
                                        ? { ...o, requiredOverride: checked }
                                        : o
                                    ),
                                  });
                                } else {
                                  setWizardData({
                                    ...wizardData,
                                    fieldOverrides: [
                                      ...wizardData.fieldOverrides,
                                      {
                                        fieldConfigurationId: field.id,
                                        visibilityOverride: null,
                                        requiredOverride: checked,
                                      },
                                    ],
                                  });
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!customFields || customFields.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-3 border rounded-lg border-dashed">
                    No fields configured. Add fields in the Ticket Fields Manager section.
                  </p>
                )}
              </div>
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
                  <strong>Option 1:</strong> Issue Type, L1, L2, L3, L4, Description, Department, Active, SLA Response Hours, SLA Resolution Hours
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <strong>Option 2:</strong> No., Issue Type, L1, L2, L3, L4, Description, Department Type, Active, SLA (hrs)
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Note: No. and L4 are optional. Department/Department Type must be "Seller Support", "Customer Support", or "All".
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
                        <TableHead>Department</TableHead>
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
                            <Badge variant="outline">{config.departmentType}</Badge>
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

      {/* Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={(open) => {
        if (!open) {
          setShowTagDialog(false);
          setEditingTag(null);
          setTagFormData({ name: "", departmentType: "All" });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit" : "Add"} Tag</DialogTitle>
            <DialogDescription>
              {editingTag ? "Update the tag details below" : "Create a new tag for ticket categorization"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Tag Name *</Label>
              <Input
                id="tagName"
                value={tagFormData.name}
                onChange={(e) => setTagFormData({ ...tagFormData, name: e.target.value })}
                placeholder="e.g., Urgent, Follow-up, VIP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagDepartmentType">Department Type *</Label>
              <Select
                value={tagFormData.departmentType}
                onValueChange={(value) => setTagFormData({ ...tagFormData, departmentType: value as any })}
              >
                <SelectTrigger id="tagDepartmentType">
                  <SelectValue placeholder="Select department type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Seller Support">Seller Support</SelectItem>
                  <SelectItem value="Customer Support">Customer Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Audit Trail Section - Only shown when editing */}
            {editingTag && (
              <div className="mt-4 border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Audit Information</h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created Date:</span>
                    <span className="font-medium">
                      {editingTag.createdAt ? new Date(editingTag.createdAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Update Date:</span>
                    <span className="font-medium">
                      {editingTag.updatedAt ? new Date(editingTag.updatedAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  {editingTag.updatedById && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Update By:</span>
                      <span className="font-medium">
                        {editingTag.updatedByName || editingTag.updatedById}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-medium">
                      {editingTag.version || 1}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTagDialog(false);
                setEditingTag(null);
                setTagFormData({ name: "", departmentType: "All" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!tagFormData.name.trim()) {
                  toast({ title: "Error", description: "Tag name is required", variant: "destructive" });
                  return;
                }

                if (editingTag) {
                  updateTagMutation.mutate({ id: editingTag.id, data: tagFormData });
                } else {
                  createTagMutation.mutate(tagFormData);
                }
              }}
              disabled={createTagMutation.isPending || updateTagMutation.isPending}
            >
              {(createTagMutation.isPending || updateTagMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingTag ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingTag ? "Update Tag" : "Create Tag"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={(open) => {
        if (!open) {
          setShowFieldDialog(false);
          setEditingField(null);
          setFieldFormData({
            fieldName: "",
            fieldLabel: "",
            fieldType: "text",
            departmentType: "All",
            isEnabled: true,
            isRequired: false,
            displayOrder: 0,
            placeholder: "",
            helpText: "",
            options: [],
          });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit" : "Add"} Custom Field</DialogTitle>
            <DialogDescription>
              {editingField ? "Update the custom field details below" : "Create a new custom field for ticket creation"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fieldName">Field Name *</Label>
                <Input
                  id="fieldName"
                  value={fieldFormData.fieldName}
                  onChange={(e) => setFieldFormData({ ...fieldFormData, fieldName: e.target.value })}
                  placeholder="e.g., fleekOrderIds, customerId"
                  disabled={!!editingField}
                />
                <p className="text-xs text-muted-foreground">Unique field identifier (camelCase)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fieldLabel">Field Label *</Label>
                <Input
                  id="fieldLabel"
                  value={fieldFormData.fieldLabel}
                  onChange={(e) => setFieldFormData({ ...fieldFormData, fieldLabel: e.target.value })}
                  placeholder="e.g., Order IDs, Customer ID"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fieldType">Field Type *</Label>
                <Select
                  value={fieldFormData.fieldType}
                  onValueChange={(value) => setFieldFormData({ ...fieldFormData, fieldType: value as any })}
                >
                  <SelectTrigger id="fieldType">
                    <SelectValue placeholder="Select field type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="select">Select (Dropdown)</SelectItem>
                    <SelectItem value="multiselect">Multi-Select</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                    <SelectItem value="array">Array (Multiple Values)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fieldDepartmentType">Department Type *</Label>
                <Select
                  value={fieldFormData.departmentType}
                  onValueChange={(value) => setFieldFormData({ ...fieldFormData, departmentType: value as any })}
                >
                  <SelectTrigger id="fieldDepartmentType">
                    <SelectValue placeholder="Select department type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Seller Support">Seller Support</SelectItem>
                    <SelectItem value="Customer Support">Customer Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order *</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={fieldFormData.displayOrder}
                  onChange={(e) => setFieldFormData({ ...fieldFormData, displayOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">Order in which field appears</p>
              </div>

              <div className="space-y-4 pt-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isEnabled"
                    checked={fieldFormData.isEnabled}
                    onCheckedChange={(checked) => setFieldFormData({ ...fieldFormData, isEnabled: checked })}
                  />
                  <Label htmlFor="isEnabled" className="cursor-pointer">
                    Field Enabled
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isRequired"
                    checked={fieldFormData.isRequired}
                    onCheckedChange={(checked) => setFieldFormData({ ...fieldFormData, isRequired: checked })}
                  />
                  <Label htmlFor="isRequired" className="cursor-pointer">
                    Required Field
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder Text</Label>
              <Input
                id="placeholder"
                value={fieldFormData.placeholder}
                onChange={(e) => setFieldFormData({ ...fieldFormData, placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helpText">Help Text</Label>
              <Input
                id="helpText"
                value={fieldFormData.helpText}
                onChange={(e) => setFieldFormData({ ...fieldFormData, helpText: e.target.value })}
                placeholder="Enter help text for users"
              />
            </div>

            {/* Options section for select/multiselect fields */}
            {(fieldFormData.fieldType === "select" || fieldFormData.fieldType === "multiselect") && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Options</Label>
                    <p className="text-xs text-muted-foreground">
                      Add options for the {fieldFormData.fieldType === "multiselect" ? "multi-select" : "dropdown"} field
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFieldFormData({
                      ...fieldFormData,
                      options: [...fieldFormData.options, { label: "", value: "" }]
                    })}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                {fieldFormData.options.length > 0 ? (
                  <div className="space-y-2">
                    {fieldFormData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Label (displayed)"
                          value={option.label}
                          onChange={(e) => {
                            const updated = [...fieldFormData.options];
                            updated[index] = { ...updated[index], label: e.target.value };
                            // Auto-fill value from label if value is empty
                            if (!updated[index].value) {
                              updated[index].value = e.target.value;
                            }
                            setFieldFormData({ ...fieldFormData, options: updated });
                          }}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Value (stored)"
                          value={option.value}
                          onChange={(e) => {
                            const updated = [...fieldFormData.options];
                            updated[index] = { ...updated[index], value: e.target.value };
                            setFieldFormData({ ...fieldFormData, options: updated });
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            const updated = fieldFormData.options.filter((_, i) => i !== index);
                            setFieldFormData({ ...fieldFormData, options: updated });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3 border rounded border-dashed">
                    No options added. Click "Add Option" to create one.
                  </p>
                )}
              </div>
            )}

            {/* Audit Trail Section - Only shown when editing */}
            {editingField && (
              <div className="mt-4 border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Audit Information</h3>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created Date:</span>
                    <span className="font-medium">
                      {editingField.createdAt ? new Date(editingField.createdAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Update Date:</span>
                    <span className="font-medium">
                      {editingField.updatedAt ? new Date(editingField.updatedAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  {editingField.updatedById && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Update By:</span>
                      <span className="font-medium">
                        {editingField.updatedByName || editingField.updatedById}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-medium">
                      {editingField.version || 1}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFieldDialog(false);
                setEditingField(null);
                setFieldFormData({
                  fieldName: "",
                  fieldLabel: "",
                  fieldType: "text",
                  departmentType: "All",
                  isEnabled: true,
                  isRequired: false,
                  displayOrder: 0,
                  placeholder: "",
                  helpText: "",
                  options: [],
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!fieldFormData.fieldName.trim() || !fieldFormData.fieldLabel.trim()) {
                  toast({ title: "Error", description: "Field name and label are required", variant: "destructive" });
                  return;
                }

                const data = {
                  fieldName: fieldFormData.fieldName,
                  fieldLabel: fieldFormData.fieldLabel,
                  fieldType: fieldFormData.fieldType,
                  departmentType: fieldFormData.departmentType,
                  isEnabled: fieldFormData.isEnabled,
                  isRequired: fieldFormData.isRequired,
                  displayOrder: fieldFormData.displayOrder,
                  metadata: {
                    placeholder: fieldFormData.placeholder || undefined,
                    helpText: fieldFormData.helpText || undefined,
                    // Include options for select/multiselect fields
                    ...((fieldFormData.fieldType === "select" || fieldFormData.fieldType === "multiselect") && fieldFormData.options.length > 0
                      ? { options: fieldFormData.options.filter(o => o.label.trim() && o.value.trim()) }
                      : {}),
                  },
                };

                if (editingField) {
                  updateFieldMutation.mutate({ id: editingField.id, data });
                } else {
                  createFieldMutation.mutate(data);
                }
              }}
              disabled={createFieldMutation.isPending || updateFieldMutation.isPending}
            >
              {(createFieldMutation.isPending || updateFieldMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingField ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingField ? "Update Field" : "Create Field"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
