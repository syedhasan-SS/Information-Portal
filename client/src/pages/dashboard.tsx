import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  BarChart3,
  Ticket,
  Package,
} from "lucide-react";

type Tab = "tickets" | "vendors" | "analytics";
type Status = "New" | "Open" | "Pending" | "Solved" | "Closed";
type Priority = "Critical" | "High" | "Medium" | "Low";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tickets");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-[1600px] px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                  <Ticket className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
                    JoinFleek
                  </h1>
                  <p className="text-xs text-muted-foreground">Seller Escalations</p>
                </div>
              </div>

              <nav className="hidden items-center gap-1 md:flex">
                <TabButton
                  active={activeTab === "tickets"}
                  onClick={() => setActiveTab("tickets")}
                  icon={Ticket}
                  label="All Tickets"
                />
                <TabButton
                  active={activeTab === "vendors"}
                  onClick={() => setActiveTab("vendors")}
                  icon={Package}
                  label="Vendors"
                />
                <TabButton
                  active={activeTab === "analytics"}
                  onClick={() => setActiveTab("analytics")}
                  icon={BarChart3}
                  label="Analytics"
                />
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="hidden bg-accent text-accent-foreground hover:bg-accent/90 md:inline-flex"
                data-testid="button-create-escalation"
              >
                <Plus className="h-4 w-4" />
                New Escalation
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {activeTab === "tickets" && <TicketsView searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
        {activeTab === "vendors" && <VendorsView />}
        {activeTab === "analytics" && <AnalyticsView />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      data-testid={`tab-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

type MockTicket = {
  id: string;
  vendor: string;
  subject: string;
  status: Status;
  priority: Priority;
  department: string;
  createdAt: string;
};

function TicketsView({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}) {
  const mockTickets: MockTicket[] = [
    {
      id: "ESC-1001",
      vendor: "Fleek Moda",
      subject: "Payment not processed for January orders",
      status: "Open",
      priority: "Critical",
      department: "Finance",
      createdAt: "2 hours ago",
    },
    {
      id: "ESC-1002",
      vendor: "Silverlane",
      subject: "Pickup not aligned with schedule",
      status: "Pending",
      priority: "High",
      department: "Operations",
      createdAt: "5 hours ago",
    },
    {
      id: "ESC-1003",
      vendor: "Kora Home",
      subject: "Product approval information needed",
      status: "New",
      priority: "Medium",
      department: "Marketplace",
      createdAt: "1 day ago",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets, vendors, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-tickets"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={AlertTriangle}
          label="Critical"
          value="12"
          trend="+3 today"
          color="destructive"
        />
        <StatsCard
          icon={Clock}
          label="Open"
          value="48"
          trend="+7 this week"
          color="default"
        />
        <StatsCard
          icon={CheckCircle2}
          label="Resolved Today"
          value="23"
          trend="92% on time"
          color="success"
        />
        <StatsCard
          icon={Users}
          label="Active Vendors"
          value="156"
          trend="8 new this month"
          color="default"
        />
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {mockTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  trend: string;
  color: "destructive" | "default" | "success";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{trend}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            color === "destructive" && "bg-destructive/10 text-destructive",
            color === "success" && "bg-green-500/10 text-green-600",
            color === "default" && "bg-accent/20 text-accent-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function TicketCard({ ticket }: { ticket: MockTicket }) {
  const priorityColors = {
    Critical: "bg-destructive/10 text-destructive border-destructive/20",
    High: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    Medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Low: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  const statusColors = {
    New: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    Open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Solved: "bg-green-500/10 text-green-600 border-green-500/20",
    Closed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };

  return (
    <Card className="group cursor-pointer transition-all hover:shadow-md" data-testid={`card-ticket-${ticket.id}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-muted-foreground">{ticket.id}</span>
                  <Badge className={cn("border", priorityColors[ticket.priority])} variant="outline">
                    {ticket.priority}
                  </Badge>
                  <Badge className={cn("border", statusColors[ticket.status])} variant="outline">
                    {ticket.status}
                  </Badge>
                </div>
                <h3 className="text-base font-semibold leading-tight text-foreground group-hover:text-accent-foreground">
                  {ticket.subject}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                <span>{ticket.vendor}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{ticket.department}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{ticket.createdAt}</span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid={`button-view-${ticket.id}`}
          >
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}

function VendorsView() {
  const mockVendors = [
    { name: "Fleek Moda", handle: "fleek_moda", gmvTier: "XL", kam: "Ayesha Khan", openTickets: 8, totalTickets: 45 },
    { name: "Silverlane", handle: "silverlane", gmvTier: "L", kam: "Rohan Mehta", openTickets: 3, totalTickets: 22 },
    { name: "Kora Home", handle: "kora_home", gmvTier: "M", kam: "Sana Iqbal", openTickets: 5, totalTickets: 18 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Vendor Profiles</h2>
          <p className="text-sm text-muted-foreground">GMV tiers, KAM assignments, and ticket history</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockVendors.map((vendor) => (
          <Card key={vendor.handle} className="p-5" data-testid={`card-vendor-${vendor.handle}`}>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                <p className="text-sm text-muted-foreground">@{vendor.handle}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-accent/20 text-accent-foreground border-accent/30" variant="outline">
                  GMV: {vendor.gmvTier}
                </Badge>
                <span className="text-xs text-muted-foreground">KAM: {vendor.kam}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Open: {vendor.openTickets}</span>
                <span className="text-muted-foreground">Total: {vendor.totalTickets}</span>
              </div>
              <Button size="sm" variant="outline" className="w-full">
                View Profile
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Analytics Dashboard</h2>
        <p className="text-sm text-muted-foreground">Performance metrics and trends</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Tickets by Status</h3>
          <div className="space-y-3">
            {[
              { status: "Open", count: 48, color: "bg-blue-500" },
              { status: "Pending", count: 23, color: "bg-amber-500" },
              { status: "Solved", count: 156, color: "bg-green-500" },
              { status: "Closed", count: 89, color: "bg-gray-400" },
            ].map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", item.color)} />
                <span className="flex-1 text-sm text-muted-foreground">{item.status}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Priority Distribution</h3>
          <div className="space-y-3">
            {[
              { priority: "Critical", count: 12, color: "bg-destructive" },
              { priority: "High", count: 28, color: "bg-orange-500" },
              { priority: "Medium", count: 45, color: "bg-blue-500" },
              { priority: "Low", count: 31, color: "bg-green-500" },
            ].map((item) => (
              <div key={item.priority} className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", item.color)} />
                <span className="flex-1 text-sm text-muted-foreground">{item.priority}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
