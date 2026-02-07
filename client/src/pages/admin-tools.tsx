import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";

export default function AdminToolsPage() {
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Check permission
  if (!hasPermission("edit:config")) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access admin tools. Only Owner, Admin, Head, or Manager roles can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const runMigration = async () => {
    setMigrating(true);
    setMigrationError(null);
    setMigrationResult(null);

    try {
      const response = await fetch("/api/admin/migrate-ticket-numbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": user?.email || "",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Migration failed");
      }

      setMigrationResult(data);
    } catch (error: any) {
      setMigrationError(error.message || "An error occurred during migration");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/ticket-manager")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ticket Manager
        </Button>
        <h1 className="text-3xl font-bold">Admin Tools</h1>
        <p className="text-muted-foreground mt-2">
          System maintenance and migration utilities
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Number Migration</CardTitle>
            <CardDescription>
              Migrate old ESC-XXXXXXX format tickets to new SS##### / CS##### format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What this does:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Finds all tickets with old ESC- prefix format</li>
                <li>Converts Seller Support tickets (with vendor) to SS00001, SS00002, etc.</li>
                <li>Converts Customer Support tickets (no vendor) to CS00001, CS00002, etc.</li>
                <li>Preserves creation order when assigning new sequential numbers</li>
                <li>Updates all ticket references in the database</li>
              </ul>
            </div>

            {migrationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{migrationError}</AlertDescription>
              </Alert>
            )}

            {migrationResult && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">{migrationResult.message}</p>
                    <div className="text-sm">
                      <p>Total migrated: {migrationResult.migrated}</p>
                      <p>Seller Support tickets: {migrationResult.sellerSupport}</p>
                      <p>Customer Support tickets: {migrationResult.customerSupport}</p>
                    </div>
                    {migrationResult.migrations && migrationResult.migrations.length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm mb-1">Migrations:</p>
                        <div className="bg-background p-2 rounded border max-h-40 overflow-y-auto">
                          {migrationResult.migrations.map((m: any, i: number) => (
                            <div key={i} className="text-xs font-mono">
                              {m.old} → {m.new}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={runMigration}
              disabled={migrating}
              className="w-full"
              size="lg"
            >
              {migrating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Ticket Number Migration
                </>
              )}
            </Button>

            {migrationResult && migrationResult.migrated === 0 && (
              <p className="text-sm text-center text-muted-foreground">
                ✅ All tickets are already using the new format. No migration needed.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Current user and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">User:</span>
                <span>{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Email:</span>
                <span>{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Role:</span>
                <span>{user?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Department:</span>
                <span>{user?.department || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
