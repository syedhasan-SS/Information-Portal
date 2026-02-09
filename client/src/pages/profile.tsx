import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Save, User, Shield, Camera, Loader2, Users } from "lucide-react";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize profile picture from user data or localStorage
  useEffect(() => {
    if (user) {
      const savedPicture = user.profilePicture || localStorage.getItem("profilePicture") || "";
      setProfilePicture(savedPicture);
    }
  }, [user]);

  // Fetch all users to get manager and team info
  const { data: allUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!user,
  });

  // Get manager info
  const manager = allUsers?.find((u: any) => u.id === user?.managerId);

  // Get team members (same sub-department)
  const teamMembers = allUsers?.filter((u: any) =>
    u.subDepartment &&
    u.subDepartment === user?.subDepartment &&
    u.id !== user?.id
  ) || [];

  const updateProfilePictureMutation = useMutation({
    mutationFn: async (profilePicture: string) => {
      if (!user) throw new Error("User not found");
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePicture }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile picture");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate current user query to refresh user data
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been changed successfully.",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfilePicture(base64String);
        localStorage.setItem("profilePicture", base64String);
        // Save to database
        updateProfilePictureMutation.mutate(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { email: string; currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      email: user.email,
      currentPassword,
      newPassword,
    });
  };

  // Show loading state
  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex-1" />
          <h1 className="font-semibold">My Profile</h1>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4">
        <div className="space-y-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profilePicture || user.profilePicture || undefined} alt={user.name} />
                  <AvatarFallback className="text-2xl">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Profile Picture</Label>
                  <p className="text-sm text-muted-foreground">Upload a new profile picture (max 5MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-fit"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Change Picture
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  <p className="font-medium" data-testid="text-user-name">{user.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="font-medium" data-testid="text-user-email">{user.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Role</Label>
                  <p className="font-medium" data-testid="text-user-role">{user.role}</p>
                </div>
                {user.department && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Department</Label>
                    <p className="font-medium">{user.department}</p>
                  </div>
                )}
                {user.subDepartment && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Sub Department</Label>
                    <p className="font-medium">{user.subDepartment}</p>
                  </div>
                )}
                {manager && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Direct Line Manager</Label>
                    <p className="font-medium">{manager.name}</p>
                    <p className="text-xs text-muted-foreground">{manager.email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Section */}
          {user.subDepartment && teamMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  My Team ({user.subDepartment})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  People from your sub-department
                </p>
                <div className="grid gap-3">
                  {teamMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profilePicture || undefined} alt={member.name} />
                        <AvatarFallback>
                          {member.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <PasswordInput
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    data-testid="input-current-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    showStrength
                    data-testid="input-new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                  data-testid="button-save-password"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {changePasswordMutation.isPending ? "Saving..." : "Save New Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
