import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Store,
  Loader2,
  TicketIcon,
  Mail,
  Phone,
  MapPin,
  User,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { Vendor, Ticket, Category } from "@shared/schema";

async function getVendor(handle: string): Promise<Vendor | undefined> {
  const res = await fetch(`/api/vendors/${handle}`);
  if (!res.ok) return undefined;
  return res.json();
}

async function getTickets(): Promise<Ticket[]> {
  const res = await fetch("/api/tickets");
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

async function getCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

const STATUSES = ["All", "New", "Open", "Pending", "Solved", "Closed"] as const;

export default function VendorProfilePage() {
  const [, setLocation] = useLocation();
  const { handle } = useParams<{ handle: string }>();
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ["vendor", handle],
    queryFn: () => getVendor(handle!),
    enabled: !!handle,
  });

  const { data: tickets } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const categoryMap = categories?.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>) || {};

  const vendorTickets = tickets?.filter((t) => t.vendorHandle === handle) || [];
  
  const filteredTickets = statusFilter === "All"
    ? vendorTickets
    : vendorTickets.filter((t) => t.status === statusFilter);

  const openTickets = vendorTickets.filter((t) => ["New", "Open", "Pending"].includes(t.status)).length;
  const solvedTickets = vendorTickets.filter((t) => t.status === "Solved" || t.status === "Closed").length;

  const categoryCount = vendorTickets.reduce((acc, ticket) => {
    const cat = categoryMap[ticket.categoryId];
    if (cat) {
      acc[cat.l3] = (acc[cat.l3] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const getTierBadge = (tier?: string | null) => {
    if (!tier) return null;
    const colors: Record<string, string> = {
      Platinum: "bg-gradient-to-r from-slate-400 to-slate-600 text-white",
      Gold: "bg-gradient-to-r from-amber-400 to-amber-600 text-white",
      Silver: "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-700",
      Bronze: "bg-gradient-to-r from-orange-300 to-orange-500 text-white",
    };
    return <Badge className={cn("text-sm px-3 py-1", colors[tier] || "bg-slate-500")}>{tier}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      Critical: "bg-red-500 text-white",
      High: "bg-orange-500 text-white",
      Medium: "bg-amber-500 text-black",
      Low: "bg-green-500 text-white",
    };
    return <Badge className={colors[priority]}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      New: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      Open: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      Pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      Solved: "bg-green-500/10 text-green-600 border-green-500/20",
      Closed: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    };
    return <Badge className={cn("border", colors[status])} variant="outline">{status}</Badge>;
  };

  if (vendorLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Store className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">Vendor not found</h2>
        <Button onClick={() => setLocation("/vendors")} className="mt-4">
          Back to Vendors
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/vendors")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                All Vendors
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-foreground">
                  {vendor.handle.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-mono text-xl font-semibold">{vendor.handle}</h1>
                    {getTierBadge(vendor.gmvTier)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {vendor.region || vendor.zone || "Unknown Region"} • {vendor.country || "Unknown Country"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Vendor Information</h3>
              <div className="space-y-4">
                {vendor.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{vendor.email}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{vendor.region || vendor.zone || "Unknown"} - {vendor.country || "N/A"}</span>
                </div>
                {vendor.kam && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>KAM: {vendor.kam}</span>
                  </div>
                )}
                {vendor.gmv90Day && (
                  <div className="flex items-center gap-3 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>90-day GMV: ${vendor.gmv90Day.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Ticket Statistics</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-foreground">{vendorTickets.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-600">{openTickets}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{solvedTickets}</p>
                  <p className="text-xs text-muted-foreground">Solved</p>
                </div>
              </div>
            </Card>

            {topCategories.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-4 font-semibold">Top Issue Categories</h3>
                <div className="space-y-3">
                  {topCategories.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[150px]">{name}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <TicketIcon className="h-4 w-4" />
                  Vendor Tickets ({filteredTickets.length})
                </h3>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredTickets.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket #</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-mono text-sm">
                            {ticket.ticketNumber || ticket.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {ticket.subject}
                          </TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell>{getPriorityBadge(ticket.priorityTier)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/tickets/${ticket.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <TicketIcon className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No tickets found</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
