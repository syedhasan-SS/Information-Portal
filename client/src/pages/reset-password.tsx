import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { PasswordInput } from "@/components/ui/password-input";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get token from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("token");

    if (!resetToken) {
      setTokenError("No reset token provided");
      setIsVerifying(false);
      return;
    }

    setToken(resetToken);

    // Verify the token
    verifyToken(resetToken);
  }, []);

  const verifyToken = async (resetToken: string) => {
    try {
      const res = await fetch("/api/auth/verify-reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTokenError(data.error || "Invalid or expired reset token");
        setTokenValid(false);
      } else {
        setTokenValid(true);
      }
    } catch (err: any) {
      setTokenError("Failed to verify reset token");
      setTokenValid(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <img
            src="/fleek-logo.png"
            alt="Fleek Logo"
            className="h-20 w-20 rounded-2xl object-cover"
          />
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
              FLOW
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reset Your Password
            </p>
          </div>
        </div>

        {/* Reset Password Card */}
        <Card className="p-8">
          {isVerifying ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verifying reset link...</p>
            </div>
          ) : !tokenValid ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Invalid or Expired Link</p>
                  <p className="mt-1">{tokenError}</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">What to do next:</p>
                <ul className="space-y-1 ml-4 list-disc text-muted-foreground">
                  <li>Request a new password reset link</li>
                  <li>Make sure you're using the latest link from your email</li>
                  <li>Check that the link hasn't expired (valid for 1 hour)</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Link href="/forgot-password" className="flex-1">
                  <Button variant="default" className="w-full">
                    Request New Link
                  </Button>
                </Link>
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Password Reset Successful!</p>
                  <p className="mt-1 text-green-700">
                    Your password has been updated. You can now log in with your new password.
                  </p>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Redirecting to login page in 3 seconds...
              </div>

              <Link href="/login">
                <Button className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Choose a strong password that you haven't used before. Must be at least 8 characters long.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <PasswordInput
                  id="newPassword"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                {newPassword && newPassword.length < 8 && (
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters ({newPassword.length}/8)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">
                    Passwords don't match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 8}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isLoading ? "Resetting Password..." : "Reset Password"}
              </Button>

              <div className="text-center">
                <Link href="/login">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to Login
                  </button>
                </Link>
              </div>
            </form>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Internal use only. Contact Syed Faez for access.
        </p>
      </div>
    </div>
  );
}
