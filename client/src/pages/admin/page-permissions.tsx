import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Settings, Shield, Users, ArrowLeft, Save, X } from "lucide-react";
import { useLocation } from "wouter";

interface Page {
  id: string;
  pageKey: string;
  displayName: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  defaultEnabled: boolean;
}

interface Feature {
  id: string;
  pageKey: string;
  featureKey: string;
  displayName: string;
  description: string | null;
  featureType: "crud" | "export" | "ui_section" | "custom";
  isActive: boolean;
  defaultEnabled: boolean;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
}

export default function PagePermissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [selectedPageForFeatures, setSelectedPageForFeatures] = useState<Page | null>(null);

  // Fetch all pages
  const { data: pages = [] } = useQuery<Page[]>({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const res = await fetch('/api/page-access/pages', {
        headers: { 'x-user-email': user?.email || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch pages');
      return res.json();
    },
    enabled: !!user?.email,
  });

  // Fetch all roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles', {
        headers: { 'x-user-email': user?.email || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch roles');
      return res.json();
    },
    enabled: !!user?.email,
  });

  // Fetch role's page access
  const { data: roleAccess } = useQuery({
    queryKey: ['role-page-access', selectedRole],
    queryFn: async () => {
      const res = await fetch(`/api/page-access/roles/${selectedRole}`, {
        headers: { 'x-user-email': user?.email || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch role access');
      return res.json();
    },
    enabled: !!selectedRole && !!user?.email,
  });

  // Fetch features for selected page
  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ['page-features', selectedPageForFeatures?.pageKey],
    queryFn: async () => {
      const res = await fetch(`/api/page-access/features/${selectedPageForFeatures?.pageKey}`, {
        headers: { 'x-user-email': user?.email || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch features');
      return res.json();
    },
    enabled: !!selectedPageForFeatures && !!user?.email,
  });

  // Update role page access mutation
  const updateRolePageMutation = useMutation({
    mutationFn: async ({ roleId, pageKey, isEnabled }: { roleId: string; pageKey: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/page-access/roles/${roleId}/pages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        credentials: 'include',
        body: JSON.stringify({ pages: { [pageKey]: isEnabled } }),
      });
      if (!res.ok) throw new Error('Failed to update page access');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-page-access', selectedRole] });
      toast({
        title: "Success",
        description: "Page access updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update page access",
        variant: "destructive",
      });
    },
  });

  // Update role feature access mutation
  const updateRoleFeatureMutation = useMutation({
    mutationFn: async ({ roleId, pageKey, featureKey, isEnabled }: { roleId: string; pageKey: string; featureKey: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/page-access/roles/${roleId}/features`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        credentials: 'include',
        body: JSON.stringify({ features: { [`${pageKey}:${featureKey}`]: isEnabled } }),
      });
      if (!res.ok) throw new Error('Failed to update feature access');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-page-access', selectedRole] });
      toast({
        title: "Success",
        description: "Feature access updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update feature access",
        variant: "destructive",
      });
    },
  });

  // Check if page is enabled for selected role
  const isPageEnabled = (pageKey: string): boolean => {
    if (!roleAccess?.pages) return false;
    const access = roleAccess.pages.find((p: any) => p.pageKey === pageKey);
    return access?.isEnabled ?? false;
  };

  // Check if feature is enabled for selected role
  const isFeatureEnabled = (pageKey: string, featureKey: string): boolean => {
    if (!roleAccess?.features) return false;
    const access = roleAccess.features.find((f: any) => f.pageKey === pageKey && f.featureKey === featureKey);
    return access?.isEnabled ?? false;
  };

  // Filter pages
  const categories = [...new Set(pages.map(p => p.category).filter(Boolean))];
  const filteredPages = pages.filter(page => {
    const matchesCategory = selectedCategory === "all" || page.category === selectedCategory;
    const matchesSearch = searchQuery === "" ||
      page.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.pageKey.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group pages by category
  const pagesByCategory = filteredPages.reduce((acc, page) => {
    const cat = page.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(page);
    return acc;
  }, {} as Record<string, Page[]>);

  if (user?.role !== "Owner" && user?.role !== "Admin") {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            Only Owner and Admin roles can manage page permissions.
          </p>
          <Button onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Page & Feature Permissions</h1>
          <p className="text-muted-foreground mt-1">
            Control access to pages and features by role
          </p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Select Role</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a role..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Category</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat!}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Search</label>
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Pages List */}
      {selectedRole ? (
        <div className="space-y-6">
          {Object.entries(pagesByCategory).map(([category, categoryPages]) => (
            <Card key={category} className="p-6">
              <h2 className="text-xl font-semibold mb-4">{category}</h2>
              <div className="space-y-3">
                {categoryPages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{page.displayName}</h3>
                        <Badge variant="outline" className="text-xs">
                          {page.pageKey}
                        </Badge>
                      </div>
                      {page.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {page.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPageForFeatures(page);
                          setFeatureModalOpen(true);
                        }}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configure Features
                      </Button>

                      <Switch
                        checked={isPageEnabled(page.pageKey)}
                        onCheckedChange={(checked) => {
                          updateRolePageMutation.mutate({
                            roleId: selectedRole,
                            pageKey: page.pageKey,
                            isEnabled: checked,
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold mb-2">Select a Role</h3>
          <p className="text-muted-foreground">
            Choose a role from the dropdown above to manage its page and feature access.
          </p>
        </Card>
      )}

      {/* Feature Configuration Modal */}
      <Dialog open={featureModalOpen} onOpenChange={setFeatureModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configure Features: {selectedPageForFeatures?.displayName}
              {selectedRole && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  for {roles.find(r => r.id === selectedRole)?.displayName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {features.length > 0 ? (
              features.reduce((acc, feature) => {
                const type = feature.featureType;
                if (!acc[type]) acc[type] = [];
                acc[type].push(feature);
                return acc;
              }, {} as Record<string, Feature[]>),
              Object.entries(
                features.reduce((acc, feature) => {
                  const type = feature.featureType;
                  if (!acc[type]) acc[type] = [];
                  acc[type].push(feature);
                  return acc;
                }, {} as Record<string, Feature[]>)
              ).map(([type, typeFeatures]) => (
                <div key={type} className="space-y-2">
                  <h4 className="font-medium capitalize">
                    {type === "crud" ? "CRUD Actions" :
                     type === "export" ? "Export Functions" :
                     type === "ui_section" ? "UI Sections" :
                     "Custom Features"}
                  </h4>
                  <div className="space-y-2 pl-4">
                    {typeFeatures.map((feature) => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{feature.displayName}</p>
                          {feature.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {feature.description}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={isFeatureEnabled(feature.pageKey, feature.featureKey)}
                          onCheckedChange={(checked) => {
                            updateRoleFeatureMutation.mutate({
                              roleId: selectedRole,
                              pageKey: feature.pageKey,
                              featureKey: feature.featureKey,
                              isEnabled: checked,
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No features configured for this page yet.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setFeatureModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
