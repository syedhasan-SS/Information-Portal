import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Shield, Search, Settings, Eye, EyeOff, Save } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

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

interface UserAccess {
  pages: Record<string, boolean>;
  features: Record<string, Record<string, boolean>>;
}

export default function UserPermissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [selectedPageForFeatures, setSelectedPageForFeatures] = useState<Page | null>(null);

  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['all-users'],
    queryFn: async () => {
      const res = await fetch('/api/users', {
        headers: { 'x-user-email': user?.email || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: !!user?.email,
  });

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

  // Fetch user's specific access (overrides)
  const { data: userAccess } = useQuery<UserAccess>({
    queryKey: ['user-access-overrides', selectedUser],
    queryFn: async () => {
      const res = await fetch(`/api/page-access/users/${selectedUser}/access`, {
        headers: { 'x-user-email': user?.email || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch user access');
      return res.json();
    },
    enabled: !!selectedUser && !!user?.email,
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

  // Fetch user's feature access for modal
  const { data: userFeatureAccess } = useQuery({
    queryKey: ['user-feature-access', selectedUser, selectedPageForFeatures?.pageKey],
    queryFn: async () => {
      const res = await fetch(`/api/page-access/users/${selectedUser}/features/${selectedPageForFeatures?.pageKey}`, {
        headers: { 'x-user-email': user?.email || '' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch user features');
      return res.json();
    },
    enabled: !!selectedUser && !!selectedPageForFeatures && !!user?.email,
  });

  // Update user page access
  const updateUserPageMutation = useMutation({
    mutationFn: async ({ userId, pageKey, isEnabled }: { userId: string; pageKey: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/page-access/users/${userId}/pages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        credentials: 'include',
        body: JSON.stringify({ pages: { [pageKey]: isEnabled } }),
      });
      if (!res.ok) throw new Error('Failed to update user page access');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-access-overrides', selectedUser] });
      toast({
        title: "Success",
        description: "User page access updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user feature access
  const updateUserFeatureMutation = useMutation({
    mutationFn: async ({ userId, pageKey, features }: { userId: string; pageKey: string; features: Record<string, boolean> }) => {
      const res = await fetch(`/api/page-access/users/${userId}/features`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || '',
        },
        credentials: 'include',
        body: JSON.stringify({ pageKey, features }),
      });
      if (!res.ok) throw new Error('Failed to update user features');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-access-overrides', selectedUser] });
      queryClient.invalidateQueries({ queryKey: ['user-feature-access', selectedUser] });
      toast({
        title: "Success",
        description: "User features updated successfully",
      });
      setFeatureModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePageToggle = (pageKey: string, currentValue: boolean) => {
    if (!selectedUser) return;
    updateUserPageMutation.mutate({
      userId: selectedUser,
      pageKey,
      isEnabled: !currentValue,
    });
  };

  const handleFeatureModalOpen = (page: Page) => {
    setSelectedPageForFeatures(page);
    setFeatureModalOpen(true);
  };

  const handleFeatureSave = (featureStates: Record<string, boolean>) => {
    if (!selectedUser || !selectedPageForFeatures) return;
    updateUserFeatureMutation.mutate({
      userId: selectedUser,
      pageKey: selectedPageForFeatures.pageKey,
      features: featureStates,
    });
  };

  // Filter and search
  const filteredUsers = users.filter(u =>
    (u.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const filteredPages = pages.filter(page => {
    if (!page.isActive) return false;
    if (selectedCategory !== "all" && page.category !== selectedCategory) return false;
    return true;
  });

  const categories = Array.from(new Set(pages.map(p => p.category).filter(Boolean))) as string[];

  const getPageAccess = (pageKey: string): boolean | null => {
    if (!userAccess?.pages) return null;
    return userAccess.pages[pageKey] ?? null;
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="h-8 w-8" />
            User Permissions Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure page and feature access for individual users
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Owner/Admin Only
        </Badge>
      </div>

      {/* User Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Select User</h2>
          </div>
          <div className="relative">
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {filteredUsers.map((u) => (
              <Card
                key={u.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedUser === u.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedUser(u.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{u.username}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <Badge variant={u.role === "Owner" ? "default" : u.role === "Admin" ? "secondary" : "outline"}>
                    {u.role}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      {/* Page Access Configuration */}
      {selectedUser && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Page Access for {selectedUserData?.username}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Override this user's role-based access. Green = enabled, Red = disabled, Default = using role settings
                </p>
              </div>
              <div className="flex gap-2">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                >
                  All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPages.map((page) => {
                const access = getPageAccess(page.pageKey);
                const hasOverride = access !== null;

                return (
                  <Card key={page.id} className={`p-4 ${hasOverride ? (access ? 'border-green-500' : 'border-red-500') : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{page.displayName}</h3>
                          {page.category && (
                            <Badge variant="outline" className="text-xs">
                              {page.category}
                            </Badge>
                          )}
                        </div>
                        {page.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {page.description}
                          </p>
                        )}
                        {hasOverride && (
                          <Badge variant={access ? "default" : "destructive"} className="mt-2 text-xs">
                            Override: {access ? "Enabled" : "Disabled"}
                          </Badge>
                        )}
                        {!hasOverride && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            Using Role Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-2">
                        <Switch
                          checked={access ?? page.defaultEnabled}
                          onCheckedChange={() => handlePageToggle(page.pageKey, access ?? page.defaultEnabled)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleFeatureModalOpen(page)}
                        >
                          {access ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Feature Configuration Modal */}
      <Dialog open={featureModalOpen} onOpenChange={setFeatureModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Configure Features for {selectedPageForFeatures?.displayName}
            </DialogTitle>
          </DialogHeader>
          <FeatureConfigModal
            features={features}
            userFeatureAccess={userFeatureAccess}
            onSave={handleFeatureSave}
            onClose={() => setFeatureModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Feature Configuration Modal Component
function FeatureConfigModal({
  features,
  userFeatureAccess,
  onSave,
  onClose,
}: {
  features: Feature[];
  userFeatureAccess: any;
  onSave: (featureStates: Record<string, boolean>) => void;
  onClose: () => void;
}) {
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>({});

  // Initialize feature states
  useState(() => {
    const initial: Record<string, boolean> = {};
    features.forEach(f => {
      initial[f.featureKey] = userFeatureAccess?.features?.[f.featureKey] ?? f.defaultEnabled;
    });
    setFeatureStates(initial);
  });

  const handleToggle = (featureKey: string) => {
    setFeatureStates(prev => ({
      ...prev,
      [featureKey]: !prev[featureKey],
    }));
  };

  const groupedFeatures = features.reduce((acc, feature) => {
    const type = feature.featureType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const typeLabels = {
    crud: "CRUD Operations",
    export: "Export Functions",
    ui_section: "UI Sections",
    custom: "Custom Features",
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedFeatures).map(([type, typeFeatures]) => (
        <div key={type} className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase">
            {typeLabels[type as keyof typeof typeLabels] || type}
          </h3>
          <div className="space-y-2">
            {typeFeatures.map((feature) => {
              const hasOverride = userFeatureAccess?.features?.[feature.featureKey] !== undefined;
              const isEnabled = featureStates[feature.featureKey] ?? feature.defaultEnabled;

              return (
                <div key={feature.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{feature.displayName}</p>
                      {hasOverride && (
                        <Badge variant="outline" className="text-xs">
                          Override
                        </Badge>
                      )}
                    </div>
                    {feature.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(feature.featureKey)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(featureStates)}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
