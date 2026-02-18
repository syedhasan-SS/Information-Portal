import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSuccess(true);
      toast({
        title: "Reset Email Sent",
        description: "If that email exists, we've sent a password reset link",
      });
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

        {/* Forgot Password Card */}
        <Card className="p-8">
          {success ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Check your email</p>
                  <p className="mt-1 text-green-700">
                    If an account exists with <strong>{email}</strong>, you'll receive a password reset link within a few minutes.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Didn't receive an email?</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes and check again</li>
                </ul>
              </div>

              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@joinfleek.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="text-center">
                <Link href="/login">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="h-3 w-3" />
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
