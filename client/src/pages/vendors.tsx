import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Search,
  Store,
  Loader2,
  TicketIcon,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Vendor, Ticket } from "@shared/schema";

async function getVendors(): Promise<Vendor[]> {
  const res = await fetch("/api/vendors");
  if (!res.ok) throw new Error("Failed to fetch vendors");
  return res.json();
}

async function getTickets(): Promise<Ticket[]> {
  const userEmail = localStorage.getItem("userEmail");
  const res = await fetch("/api/tickets", {
    headers: {
      ...(userEmail ? { "x-user-email": userEmail } : {}),
    },
  });
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

const REGION_TABS = [
  { id: "all", label: "All Vendors" },
  { id: "zone", label: "Zone" },
  { id: "non-zone", label: "Non-Zone (UK)" },
  { id: "row", label: "ROW" },
  { id: "in", label: "India" },
] as const;

/** Map zone/origin values from BigQuery to a human-readable region label */
function getRegionLabel(vendor: { region?: string | null; zone?: string | null; country?: string | null }): string {
  // Prefer the manually-set region field if present
  if (vendor.region) return vendor.region;
  // Fall back to zone field (synced from BigQuery aurora_postgres_public.vendors.zone)
  if (vendor.zone) {
    const z = vendor.zone.toLowerCase();
    if (z === "zone") return "Zone (UK)";
    if (z === "non-zone") return "Non-Zone (UK)";
    if (z === "row") return "ROW";
    if (z === "in" || z === "india") return "India";
    return vendor.zone; // return as-is if unrecognized
  }
  if (vendor.country) {
    const c = vendor.country.toLowerCase();
    if (c === "gb" || c === "uk") return "UK";
    if (c === "in") return "India";
    if (c === "us") return "USA";
    return vendor.country.toUpperCase();
  }
  return "Unknown";
}

type SortColumn = "total" | "open" | null;
type SortDirection = "asc" | "desc";

export default function VendorsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/50" />;
    return sortDirection === "desc"
      ? <ArrowDown className="ml-1 h-3 w-3 text-foreground" />
      : <ArrowUp className="ml-1 h-3 w-3 text-foreground" />;
  };

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: getVendors,
  });

  const { data: tickets } = useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });

  const ticketsByVendor = tickets?.reduce((acc, ticket) => {
    if (!ticket.vendorHandle) return acc;
    if (!acc[ticket.vendorHandle]) {
      acc[ticket.vendorHandle] = { total: 0, open: 0 };
    }
    acc[ticket.vendorHandle].total++;
    if (["New", "Open", "Pending"].includes(ticket.status)) {
      acc[ticket.vendorHandle].open++;
    }
    return acc;
  }, {} as Record<string, { total: number; open: number }>) || {};

  const vendorsWithTickets = vendors?.filter((v) => ticketsByVendor[v.handle]?.total > 0) || [];

  const filteredVendors = vendorsWithTickets
    .filter((vendor) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesHandle = vendor.handle.toLowerCase().includes(query);
        const matchesName = vendor.name?.toLowerCase().includes(query);
        if (!matchesHandle && !matchesName) {
          return false;
        }
      }

      if (activeTab !== "all") {
        const region = (vendor.region || vendor.zone || "").toLowerCase();
        const country = (vendor.country || "").toLowerCase();

        switch (activeTab) {
          case "zone":
            return region === "zone";
          case "non-zone":
            return (country === "gb" || country === "uk") && region !== "zone";
          case "in":
            return country === "in";
          case "row":
            return country !== "gb" && country !== "uk" && country !== "in" && region !== "zone";
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      const aVal = sortColumn === "total"
        ? (ticketsByVendor[a.handle]?.total || 0)
        : (ticketsByVendor[a.handle]?.open || 0);
      const bVal = sortColumn === "total"
        ? (ticketsByVendor[b.handle]?.total || 0)
        : (ticketsByVendor[b.handle]?.open || 0);
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });

  const topVendors = [...vendorsWithTickets]
    .sort((a, b) => (ticketsByVendor[b.handle]?.total || 0) - (ticketsByVendor[a.handle]?.total || 0))
    .slice(0, 5);

  const getTierBadge = (tier?: string | null) => {
    if (!tier) return null;
    const colors: Record<string, string> = {
      Platinum: "bg-gradient-to-r from-slate-400 to-slate-600 text-white",
      Gold: "bg-gradient-to-r from-amber-400 to-amber-600 text-white",
      Silver: "bg-gradient-to-r from-slate-300 to-slate-400 text-slate-700",
      Bronze: "bg-gradient-to-r from-orange-300 to-orange-500 text-white",
    };
    return <Badge className={colors[tier] || "bg-slate-500"}>{tier}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Store className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    Vendors
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {filteredVendors.length} vendors with tickets
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {topVendors.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Top Sellers by Ticket Volume
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {topVendors.map((vendor) => (
                <Card
                  key={vendor.id}
                  className="min-w-[220px] cursor-pointer p-4 transition-shadow hover:shadow-md"
                  onClick={() => setLocation(`/vendors/${vendor.handle}`)}
                  data-testid={`card-top-vendor-${vendor.handle}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold">{vendor.handle}</p>
                      {getTierBadge(vendor.gmvTier)}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">
                        {ticketsByVendor[vendor.handle]?.total || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">total tickets</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Badge variant={ticketsByVendor[vendor.handle]?.open > 0 ? "destructive" : "secondary"}>
                      {ticketsByVendor[vendor.handle]?.open || 0} open
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {REGION_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <Card>
          {vendorsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVendors.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Handle</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none hover:text-foreground"
                      onClick={() => handleSort("total")}
                    >
                      <span className="inline-flex items-center justify-center">
                        Total Tickets
                        <SortIcon column="total" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="text-center cursor-pointer select-none hover:text-foreground"
                      onClick={() => handleSort("open")}
                    >
                      <span className="inline-flex items-center justify-center">
                        Open Tickets
                        <SortIcon column="open" />
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id} data-testid={`row-vendor-${vendor.handle}`}>
                      <TableCell className="font-mono font-medium">
                        {vendor.handle}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRegionLabel(vendor)}</Badge>
                      </TableCell>
                      <TableCell>
                        {getTierBadge(vendor.gmvTier) || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {ticketsByVendor[vendor.handle]?.total || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={ticketsByVendor[vendor.handle]?.open > 0 ? "destructive" : "secondary"}>
                          {ticketsByVendor[vendor.handle]?.open || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/vendors/${vendor.handle}`)}
                          data-testid={`button-view-${vendor.handle}`}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground">No vendors found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "No vendors with tickets yet"}
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
