import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      const user = await res.json();

      // Store user email in localStorage for session management
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userRole", user.role);

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Login Failed",
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
              Fleek Complaint Management Portal
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@joinfleek.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground"
              data-testid="link-forgot-password"
            >
              Forgot your password?
            </a>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Internal use only. Contact Syed Faez for access.
        </p>
      </div>
    </div>
  );
}
