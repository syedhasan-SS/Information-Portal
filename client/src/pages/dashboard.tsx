import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Filter,
  LayoutGrid,
  LineChart,
  Link2,
  MessageSquareText,
  Search,
  SlidersHorizontal,
  Tag,
  UserRound,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

type IssueType = "Complaint" | "Request" | "Information";
type Status = "New" | "Open" | "Pending" | "Solved" | "Closed";
type PriorityTier = "Critical" | "High" | "Medium" | "Low";

type VendorProfile = {
  handle: string;
  name: string;
  gmvTier: "S" | "M" | "L" | "XL";
  kam: string;
  zone: string;
  persona: string;
};

type TicketComment = {
  id: string;
  createdAt: string;
  author: string;
  body: string;
  visibility: "Internal" | "Zendesk";
};

type Ticket = {
  id: string;
  createdAt: string;
  updatedAt: string;
  vendorHandle: string;
  vendorName?: string;
  department: "Finance" | "Operations" | "Marketplace" | "Tech" | "Experience" | "CX" | "Seller Support";
  issueType: IssueType;
  category: {
    l1: Ticket["department"];
    l2: string;
    l3: string;
    l4?: string;
    path: string;
  };
  subject: string;
  description: string;
  fleekOrderId?: string;
  status: Status;
  priority: {
    score: number;
    tier: PriorityTier;
    badge: "P0" | "P1" | "P2" | "P3";
    breakdown: {
      vendorTicketVolume: number;
      vendorGmvTier: "S" | "M" | "L" | "XL";
      issuePriorityPoints: number;
      gmvPoints: number;
      ticketHistoryPoints: number;
      issuePoints: number;
    };
  };
  owner: {
    team: string;
    assignee?: string;
  };
  resolution: {
    notes?: string;
    resolvedAt?: string;
  };
  comments: TicketComment[];
  zendesk: {
    linked: boolean;
    zendeskTicketId?: string;
  };
};

type CategoryRow = {
  issueType: IssueType;
  l1: Ticket["department"];
  l2: string;
  l3: string;
  l4?: string;
  path: string;
  issuePriorityPoints: number;
};

const STATUS_OPTIONS: Status[] = ["New", "Open", "Pending", "Solved", "Closed"];
const ISSUE_TYPES: IssueType[] = ["Complaint", "Request", "Information"];
const PRIORITY_TIERS: PriorityTier[] = ["Critical", "High", "Medium", "Low"];

const DEPARTMENTS: Ticket["department"][] = [
  "Finance",
  "Operations",
  "Marketplace",
  "Tech",
  "Experience",
  "CX",
  "Seller Support",
];

const MOCK_VENDORS: VendorProfile[] = [
  { handle: "vendor_fleek_moda", name: "Fleek Moda", gmvTier: "XL", kam: "Ayesha Khan", zone: "West", persona: "Strategic" },
  { handle: "vendor_silverlane", name: "Silverlane", gmvTier: "L", kam: "Rohan Mehta", zone: "North", persona: "Growth" },
  { handle: "vendor_kora_home", name: "Kora Home", gmvTier: "M", kam: "Sana Iqbal", zone: "South", persona: "Core" },
  { handle: "vendor_aurora", name: "Aurora", gmvTier: "S", kam: "Hamza Ali", zone: "Central", persona: "Long-tail" },
  { handle: "vendor_nimbus", name: "Nimbus", gmvTier: "M", kam: "Neha Kapoor", zone: "East", persona: "Core" },
];

const MOCK_ORDERS = [
  { fleekOrderId: "FLK-900312", vendorHandle: "vendor_fleek_moda", latestStatus: "Processing", gmv: 15890 },
  { fleekOrderId: "FLK-900145", vendorHandle: "vendor_fleek_moda", latestStatus: "Delivered", gmv: 2210 },
  { fleekOrderId: "FLK-882210", vendorHandle: "vendor_silverlane", latestStatus: "Processing", gmv: 4980 },
  { fleekOrderId: "FLK-873901", vendorHandle: "vendor_silverlane", latestStatus: "Pickup", gmv: 3100 },
  { fleekOrderId: "FLK-701122", vendorHandle: "vendor_kora_home", latestStatus: "QC", gmv: 1890 },
  { fleekOrderId: "FLK-621884", vendorHandle: "vendor_nimbus", latestStatus: "Delivered", gmv: 2420 },
];

const CATEGORY_PATHS: string[] = [
  "Complaint > Finance > Payment > Payment Not Processed",
  "Complaint > Finance > Payment > Account Statement Reconciliation",
  "Complaint > Finance > Payment > Order amount not Included > Shipping data is missing",
  "Complaint > Finance > Payment > Order amount not Included > AR Issue",
  "Complaint > Finance > Payment > Payout Not Received",
  "Complaint > Finance > Payment > ROW - Postage Reimbusrment",
  "Complaint > Finance > Payment > Transfer Receipt Required",
  "Information > Finance > Payment > Payment Process Information",
  "Information > Finance > Payment > Comission Information",
  "Information > Finance > Payment > Payout Details Inquiry",
  "Information > Operations > Order Related Information > Cancellation Reason Required",
  "Information > Operations > Order Related Information > How to fulfil order",
  "Information > Operations > Order Related Information > Pickup Information",
  "Complaint > Operations > Order Issue > Pickup Not Aligned",
  "Information > Marketplace > Product Listing > Product Approval Information",
  "Complaint > Marketplace > Product Listing > Product Approval Request",
  "Information > Marketplace > Product Listing > Rework Guidelines",
  "Information > Marketplace > Product Listing > Product Activation/ Deactivation",
  "Information > Marketplace > Seller Rating and Review > Seller Rating Information",
  "Request > Tech > Account Details Update Request > Shop Name Update",
  "Request > Experience > Account Details Update Request > Profile Picture Update",
  "Request > Tech > Account Details Update Request > BIO Update",
  "Request > Tech > Account Details Update Request > Email Address Update",
  "Request > Tech > Account Details Update Request > Password Update Request",
  "Information > Tech > Account Details Update Information > How to change shop name",
  "Information > Experience > Account Details Update Information > How to change profile picture",
  "Complaint > Operations > Shipping Charges Issue > Extra shipping charged",
  "Information > Operations > Shipping Charges Information > Shipping Calculation - Exact Listing",
  "Information > Operations > Shipping Charges Information > Shipping Calculation - Custom Listing",
  "Request > Operations > Quality Check > QC skip request",
  "Complaint > Operations > Quality Check > RTV request",
  "Complaint > CX > Quality Check > Channel not created",
  "Request > CX > Quality Check > QC hold delay",
  "Information > CX > Quality Check > QC hold reason required",
  "Information > CX > Quality Check > QC grading guidelines",
  "Complaint > CX > Seller Refund > Incorrect Refund Charged",
  "Information > CX > Seller Refund > Refund Related Information",
  "Information > Operations > Order related Information > Order Tracking",
  "Information > Tech > Account Details Information > Login Credentials Required",
  "Information > Tech > Seller Stories > How to Upload a Story",
  "Complaint > Tech > Seller Stories > Story Not Visible",
  "Complaint > Tech > Seller Stories > Story Upload Issues",
  "Request > Tech > Seller Stories > Story Activation Request",
  "Information > Seller Support > General > Contact reason not found",
  "Information > Seller Support > General > Elaboration/ Details required",
  "Information > Seller Support > General > Dead & Drop Chat",
  "Information > Marketplace > Bank Account Details > Bank Account Details Update",
  "Complaint > Marketplace > Product Listing > Product Upload Issue",
  "Request > Tech > Account Details Update Request > Phone number Update",
  "Information > Marketplace > Seller Onboarding > How to become a seller",
  "Information > Marketplace > Cancellation Fee > Cancellation Fee related infomation",
  "Information > Operations > Stock Liquidation > Stock Liquidation Infrormation",
  "Information > Operations > Stock Liquidation > Stock Liquidation - Media Required",
  "Request > Operations > Stock Liquidation > Liquidation Stock – Dispatch Request for New Orders",
  "Complaint > Marketplace > Cancellation Fee > Incorrect Fee Applied",
  "Information > Marketplace > Seller Rating and Review > Review Related Information",
  "Information > Marketplace > Product Listing > Product Listing Information",
  "Information > Marketplace > Promotion & Discount > Make an Offer",
  "Information > Marketplace > Promotion & Discount > Campaign Discount Info",
  "Complaint > Marketplace > Promotion & Discount > Make an Offer",
  "Complaint > Marketplace > Promotion & Discount > Discount Removal Request",
  "Complaint > Finance > Payment > Payment Not Received>RFI – Pending With Partner",
  "Request > Marketplace > Bank Account Details > Bank Account Details Update Request",
  "Request > Marketplace > Seller Review > Review Removal Request",
  "Information > Tech > Account Details Information > Seller KYC Information",
  "Information > Tech > Application Issue > Technical Glitches",
  "Complaint > Operations > Order Issue > Order Status Update",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleString(undefined, { month: "short", day: "2-digit" }) +
    ", " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function priorityTierFromScore(score: number): PriorityTier {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function priorityBadgeFromTier(tier: PriorityTier): Ticket["priority"]["badge"] {
  switch (tier) {
    case "Critical":
      return "P0";
    case "High":
      return "P1";
    case "Medium":
      return "P2";
    case "Low":
      return "P3";
  }
}

function priorityBadgeClass(badge: Ticket["priority"]["badge"]) {
  switch (badge) {
    case "P0":
      return "bg-red-500/12 text-red-700 border-red-500/20";
    case "P1":
      return "bg-orange-500/12 text-orange-700 border-orange-500/20";
    case "P2":
      return "bg-amber-500/12 text-amber-700 border-amber-500/20";
    case "P3":
      return "bg-emerald-500/12 text-emerald-700 border-emerald-500/20";
  }
}

function statusBadgeVariant(status: Status) {
  switch (status) {
    case "New":
      return { className: "bg-violet-500/12 text-violet-700 border-violet-500/20" };
    case "Open":
      return { className: "bg-blue-500/12 text-blue-700 border-blue-500/20" };
    case "Pending":
      return { className: "bg-amber-500/12 text-amber-700 border-amber-500/20" };
    case "Solved":
      return { className: "bg-emerald-500/12 text-emerald-700 border-emerald-500/20" };
    case "Closed":
      return { className: "bg-zinc-500/12 text-zinc-700 border-zinc-500/20" };
  }
}

function slaLabel(tier: PriorityTier) {
  switch (tier) {
    case "Critical":
      return "Response 2h · Resolve 24h";
    case "High":
      return "Response 4h · Resolve 48h";
    case "Medium":
      return "Response 8h · Resolve 72h";
    case "Low":
      return "Response 24h · Resolve 5bd";
  }
}

function categoryRows(): CategoryRow[] {
  return CATEGORY_PATHS.map((path) => {
    const parts = path.split(">"
    ).map((s) => s.trim());
    const issueType = (parts[0] as IssueType) ?? "Complaint";

    const deptFromText = parts[1] ?? "Finance";
    const l1 = (DEPARTMENTS.includes(deptFromText as any)
      ? (deptFromText as Ticket["department"])
      : "Finance");

    const l2 = parts[2] ?? "General";
    const l3 = parts[3] ?? "General";
    const l4 = parts[4];

    const lower = path.toLowerCase();
    const issuePriorityPoints = lower.includes("payment")
      ? 30
      : lower.includes("payout")
        ? 30
        : lower.includes("refund")
          ? 25
          : lower.includes("order")
            ? 20
            : lower.includes("pickup")
              ? 20
              : lower.includes("product")
                ? 15
                : lower.includes("technical") || lower.includes("glitch")
                  ? 15
                  : issueType === "Information"
                    ? 10
                    : 10;

    return { issueType, l1, l2, l3, l4, path, issuePriorityPoints };
  });
}

const CATEGORY_ROWS = categoryRows();

function computePriority(params: {
  vendorTicketVolume: number;
  vendorGmvTier: Ticket["priority"]["breakdown"]["vendorGmvTier"];
  issuePriorityPoints: number;
}) {
  const gmvPoints = ({ S: 10, M: 20, L: 30, XL: 40 } as const)[params.vendorGmvTier];
  const ticketHistoryPoints = params.vendorTicketVolume >= 5 ? 30 : params.vendorTicketVolume >= 3 ? 20 : params.vendorTicketVolume >= 1 ? 10 : 0;
  const issuePoints = Math.max(0, Math.min(30, params.issuePriorityPoints));
  const score = Math.round(gmvPoints + ticketHistoryPoints + issuePoints);
  const tier = priorityTierFromScore(score);
  const badge = priorityBadgeFromTier(tier);

  return {
    score,
    tier,
    badge,
    breakdown: {
      vendorTicketVolume: params.vendorTicketVolume,
      vendorGmvTier: params.vendorGmvTier,
      issuePriorityPoints: params.issuePriorityPoints,
      gmvPoints,
      ticketHistoryPoints,
      issuePoints,
    },
  };
}

function vendorForHandle(handle: string) {
  return MOCK_VENDORS.find((v) => v.handle === handle) ?? null;
}

function initialTickets(): Ticket[] {
  const now = Date.now();

  const base: Array<
    Omit<Ticket, "priority" | "comments" | "resolution" | "zendesk" | "category"> & {
      vendorProfile: VendorProfile;
      vendorTicketVolume: number;
      categoryPath: string;
      zendeskLinked: boolean;
    }
  > = [
    {
      id: "ZND-18402",
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 15).toISOString(),
      vendorHandle: "vendor_fleek_moda",
      vendorName: "Fleek Moda",
      vendorProfile: MOCK_VENDORS[0],
      department: "Finance",
      issueType: "Complaint",
      categoryPath: "Complaint > Finance > Payment > Payout Not Received",
      subject: "Payout not received for last cycle",
      description: "Seller reports payout missing since last settlement. Needs reconciliation and partner status check.",
      fleekOrderId: "FLK-900312",
      status: "Open",
      vendorTicketVolume: 4,
      owner: { team: "Finance Ops", assignee: "" },
      zendeskLinked: true,
    },
    {
      id: "ZND-18377",
      createdAt: new Date(now - 1000 * 60 * 110).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 60).toISOString(),
      vendorHandle: "vendor_silverlane",
      vendorName: "Silverlane",
      vendorProfile: MOCK_VENDORS[1],
      department: "Operations",
      issueType: "Complaint",
      categoryPath: "Complaint > Operations > Order Issue > Order Status Update",
      subject: "Order status needs urgent update",
      description: "Status stuck in processing. Vendor needs update before dispatch window closes.",
      fleekOrderId: "FLK-882210",
      status: "Pending",
      vendorTicketVolume: 2,
      owner: { team: "Ops Control", assignee: "" },
      zendeskLinked: true,
    },
    {
      id: "ZND-18421",
      createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 12).toISOString(),
      vendorHandle: "vendor_kora_home",
      vendorName: "Kora Home",
      vendorProfile: MOCK_VENDORS[2],
      department: "Marketplace",
      issueType: "Complaint",
      categoryPath: "Complaint > Marketplace > Product Listing > Product Upload Issue",
      subject: "Product upload failing",
      description: "Seller cannot upload SKUs; intermittent errors reported across multiple items.",
      status: "New",
      vendorTicketVolume: 3,
      owner: { team: "Catalog", assignee: "" },
      zendeskLinked: true,
    },
    {
      id: "ZND-18311",
      createdAt: new Date(now - 1000 * 60 * 260).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 210).toISOString(),
      vendorHandle: "vendor_aurora",
      vendorName: "Aurora",
      vendorProfile: MOCK_VENDORS[3],
      department: "Tech",
      issueType: "Request",
      categoryPath: "Request > Tech > Account Details Update Request > Email Address Update",
      subject: "Update email address",
      description: "Vendor requests email update. Needs verification and change.",
      status: "Solved",
      vendorTicketVolume: 1,
      owner: { team: "Support Tools", assignee: "" },
      zendeskLinked: false,
    },
    {
      id: "ZND-18258",
      createdAt: new Date(now - 1000 * 60 * 520).toISOString(),
      updatedAt: new Date(now - 1000 * 60 * 430).toISOString(),
      vendorHandle: "vendor_nimbus",
      vendorName: "Nimbus",
      vendorProfile: MOCK_VENDORS[4],
      department: "CX",
      issueType: "Complaint",
      categoryPath: "Complaint > CX > Seller Refund > Incorrect Refund Charged",
      subject: "Incorrect refund charged",
      description: "Refund amount discrepancy reported; requires refund ledger review.",
      status: "Open",
      vendorTicketVolume: 5,
      owner: { team: "CX Refunds", assignee: "" },
      zendeskLinked: true,
    },
  ];

  return base.map((t) => {
    const categoryRow = CATEGORY_ROWS.find((c) => c.path === t.categoryPath) ?? CATEGORY_ROWS[0];
    const priority = computePriority({
      vendorTicketVolume: t.vendorTicketVolume,
      vendorGmvTier: t.vendorProfile.gmvTier,
      issuePriorityPoints: categoryRow.issuePriorityPoints,
    });

    const category = {
      l1: t.department,
      l2: categoryRow.l2,
      l3: categoryRow.l3,
      l4: categoryRow.l4,
      path: categoryRow.path,
    };

    const comments: TicketComment[] = [
      {
        id: `${t.id}-c1`,
        createdAt: t.createdAt,
        author: "Seller Support Agent",
        body: "Escalated with structured category. Please review and take ownership.",
        visibility: "Internal",
      },
      {
        id: `${t.id}-c2`,
        createdAt: t.updatedAt,
        author: t.owner.team,
        body: "Acknowledged. Investigating and will update within SLA.",
        visibility: "Internal",
      },
    ];

    return {
      id: t.id,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      vendorHandle: t.vendorHandle,
      vendorName: t.vendorName,
      department: t.department,
      issueType: t.issueType,
      category,
      subject: t.subject,
      description: t.description,
      fleekOrderId: t.fleekOrderId,
      status: t.status,
      priority,
      owner: t.owner,
      resolution: {},
      comments,
      zendesk: {
        linked: t.zendeskLinked,
        zendeskTicketId: t.zendeskLinked ? t.id.replace("ZND-", "") : undefined,
      },
    };
  });
}

function AppShell(props: { children: React.ReactNode }) {
  return (
    <div className="app-noise min-h-screen">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">{props.children}</div>
    </div>
  );
}

type Role = "Seller Support Agent" | "Department Lead" | "Management" | "Admin";

function RolePicker(props: { role: Role; onChange: (r: Role) => void }) {
  return (
    <Select value={props.role} onValueChange={(v) => props.onChange(v as Role)}>
      <SelectTrigger className="h-9 rounded-xl bg-secondary/60" data-testid="select-role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Seller Support Agent" data-testid="option-role-agent">Seller Support Agent</SelectItem>
        <SelectItem value="Department Lead" data-testid="option-role-lead">Department Lead</SelectItem>
        <SelectItem value="Management" data-testid="option-role-management">Management</SelectItem>
        <SelectItem value="Admin" data-testid="option-role-admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}

function TopBar(props: {
  active: string;
  onNavigate: (key: string) => void;
  role: Role;
  onRoleChange: (r: Role) => void;
}) {
  const nav = [
    { key: "all", label: "All tickets", icon: LayoutGrid },
    { key: "vendors", label: "Vendors", icon: UserRound },
    { key: "issues", label: "Issue types", icon: SlidersHorizontal },
    { key: "summary", label: "Summary", icon: LineChart },
    { key: "create", label: "Create escalation", icon: Tag },
  ] as const;

  return (
    <div className="app-surface rounded-2xl px-4 py-4 sm:px-5" data-testid="topbar">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                <BadgeCheck className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <div className="app-title text-balance text-xl font-semibold leading-tight" data-testid="text-app-title">
                  Seller Escalations Portal
                </div>
                <div className="text-sm text-muted-foreground" data-testid="text-app-tagline">
                  Structured escalations. Clear ownership. Fast resolution.
                </div>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <div className="app-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-foreground/80" data-testid="chip-role">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Role</span>
              <RolePicker role={props.role} onChange={props.onRoleChange} />
            </div>
            <Button variant="secondary" className="rounded-xl" data-testid="button-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = props.active === item.key;
            return (
              <Button
                key={item.key}
                variant={active ? "default" : "secondary"}
                className={cn("rounded-xl", !active && "bg-secondary/70")}
                onClick={() => props.onNavigate(item.key)}
                data-testid={`button-nav-${item.key}`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiTile(props: { label: string; value: string; hint: string; icon: React.ReactNode; testId: string }) {
  return (
    <div className="app-surface hover-elevate rounded-2xl px-4 py-4" data-testid={props.testId}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{props.label}</div>
          <div className="mt-1 app-title text-2xl font-semibold tracking-tight">{props.value}</div>
          <div className="mt-2 text-xs text-muted-foreground">{props.hint}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">{props.icon}</div>
      </div>
    </div>
  );
}

function PriorityBadge(props: { ticket: Ticket; compact?: boolean }) {
  const { badge, score, tier, breakdown } = props.ticket.priority;
  return (
    <div className={cn("flex items-center gap-2", props.compact && "gap-1")}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
          priorityBadgeClass(badge),
        )}
        data-testid={`badge-priority-${props.ticket.id}`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {badge} · {tier} · {score}
      </span>
      {!props.compact ? (
        <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground" data-testid={`text-priority-breakdown-${props.ticket.id}`}>
          <span className="app-chip rounded-full px-2 py-0.5">GMV {breakdown.gmvPoints}</span>
          <span className="app-chip rounded-full px-2 py-0.5">History {breakdown.ticketHistoryPoints}</span>
          <span className="app-chip rounded-full px-2 py-0.5">Issue {breakdown.issuePoints}</span>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill(props: { status: Status; id: string }) {
  const s = statusBadgeVariant(props.status);
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", s.className)}
      data-testid={`badge-status-${props.id}`}
    >
      {props.status}
    </span>
  );
}

function TierPill(props: { tier: PriorityTier; id: string }) {
  const cls =
    props.tier === "Critical"
      ? "bg-red-500/12 text-red-700 border-red-500/20"
      : props.tier === "High"
        ? "bg-orange-500/12 text-orange-700 border-orange-500/20"
        : props.tier === "Medium"
          ? "bg-amber-500/12 text-amber-700 border-amber-500/20"
          : "bg-emerald-500/12 text-emerald-700 border-emerald-500/20";

  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", cls)}
      data-testid={`badge-tier-${props.id}`}
      title={slaLabel(props.tier)}
    >
      {props.tier}
    </span>
  );
}

function TicketTable(props: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
}) {
  return (
    <div className="app-surface rounded-2xl" data-testid="table-tickets">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">ID</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.tickets.map((t) => (
            <TableRow key={t.id} className="hover:bg-secondary/30">
              <TableCell className="font-medium" data-testid={`text-ticket-id-${t.id}`}>{t.id}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium" data-testid={`text-vendor-name-${t.id}`}>{t.vendorName ?? t.vendorHandle}</span>
                  <span className="text-xs text-muted-foreground" data-testid={`text-vendor-handle-${t.id}`}>{t.vendorHandle}</span>
                </div>
              </TableCell>
              <TableCell><StatusPill status={t.status} id={t.id} /></TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <TierPill tier={t.priority.tier} id={t.id} />
                  <div className="text-xs text-muted-foreground" data-testid={`text-sla-${t.id}`}>{slaLabel(t.priority.tier)}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm" data-testid={`text-issue-type-${t.id}`}>{t.issueType}</span>
                  <span className="text-xs text-muted-foreground" data-testid={`text-category-${t.id}`}>{t.category.path}</span>
                </div>
              </TableCell>
              <TableCell data-testid={`text-department-${t.id}`}>{t.department}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => props.onOpen(t)}
                  data-testid={`button-open-ticket-${t.id}`}
                >
                  Open
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TicketDetail(props: {
  role: Role;
  ticket: Ticket;
  vendor: VendorProfile | null;
  onBack: () => void;
  onUpdateStatus: (status: Status) => void;
  onAssign: (assignee: string) => void;
  onAddComment: (comment: TicketComment) => void;
  onResolve: (notes: string) => void;
  onLinkZendesk: (zendeskId: string) => void;
}) {
  const t = props.ticket;
  const [assignee, setAssignee] = useState(t.owner.assignee ?? "");
  const [commentBody, setCommentBody] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<TicketComment["visibility"]>("Internal");
  const [resolutionNotes, setResolutionNotes] = useState(t.resolution.notes ?? "");
  const [zendeskId, setZendeskId] = useState(t.zendesk.zendeskTicketId ?? "");

  const canAssign = props.role === "Admin" || props.role === "Department Lead";
  const canResolve = props.role === "Admin" || props.role === "Department Lead" || props.role === "Management";
  const canComment = true;

  return (
    <div className="space-y-4" data-testid="page-ticket-detail">
      <div className="app-surface rounded-2xl px-4 py-4 sm:px-5" data-testid="panel-ticket-header">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              onClick={props.onBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to tickets
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="app-title text-2xl font-semibold tracking-tight" data-testid="text-detail-id">{t.id}</div>
              <StatusPill status={t.status} id={`${t.id}-detail`} />
              <TierPill tier={t.priority.tier} id={`${t.id}-tier`} />
              <span className="app-chip rounded-full px-2.5 py-1 text-xs text-muted-foreground" data-testid="text-detail-updated">
                Updated {formatDate(t.updatedAt)}
              </span>
            </div>

            <div className="mt-2 text-sm text-muted-foreground" data-testid="text-detail-subject">
              {t.subject}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-xl"
              data-testid="button-zendesk-open"
            >
              <Link2 className="mr-2 h-4 w-4" />
              Open in Zendesk
            </Button>
            <Button
              className="rounded-xl"
              data-testid="button-add-resolution"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Resolution
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <div className="app-surface rounded-2xl p-4" data-testid="card-ticket-body">
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="mt-2 text-sm leading-relaxed" data-testid="text-detail-description">{t.description}</div>
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-comments">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium" data-testid="text-comments-title">Comments</div>
                <div className="text-xs text-muted-foreground" data-testid="text-comments-subtitle">
                  Internal thread + (read-only) Zendesk comments placeholder
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full" data-testid="badge-comment-count">
                {t.comments.length}
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {t.comments
                .slice()
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-secondary/25 px-3 py-3" data-testid={`comment-${c.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium" data-testid={`comment-author-${c.id}`}>{c.author}</div>
                      <div className="flex items-center gap-2">
                        <span className="app-chip rounded-full px-2 py-0.5 text-xs text-muted-foreground" data-testid={`comment-visibility-${c.id}`}>{c.visibility}</span>
                        <span className="text-xs text-muted-foreground" data-testid={`comment-date-${c.id}`}>{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm" data-testid={`comment-body-${c.id}`}>{c.body}</div>
                  </div>
                ))}
            </div>

            {canComment ? (
              <div className="mt-4 rounded-2xl border border-border bg-background/50 p-3" data-testid="form-add-comment">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <div className="text-xs text-muted-foreground mb-1">Visibility</div>
                    <Select value={commentVisibility} onValueChange={(v) => setCommentVisibility(v as any)}>
                      <SelectTrigger className="rounded-xl" data-testid="select-comment-visibility">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Internal" data-testid="option-comment-internal">Internal</SelectItem>
                        <SelectItem value="Zendesk" data-testid="option-comment-zendesk">Zendesk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground mb-1">Add comment</div>
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      className="min-h-[84px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm app-ring focus-visible:ring-0"
                      placeholder="Add context, investigation notes, updates…"
                      data-testid="input-comment"
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground" data-testid="text-comment-hint">
                    (MVP: stored in UI only. Later: sync to Zendesk as internal/public comment.)
                  </div>
                  <Button
                    className="rounded-xl"
                    disabled={!commentBody.trim()}
                    onClick={() => {
                      const c: TicketComment = {
                        id: `${t.id}-c${Math.floor(100 + Math.random() * 899)}`,
                        createdAt: new Date().toISOString(),
                        author: props.role,
                        body: commentBody.trim(),
                        visibility: commentVisibility,
                      };
                      props.onAddComment(c);
                      setCommentBody("");
                    }}
                    data-testid="button-add-comment"
                  >
                    <MessageSquareText className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-resolution">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium" data-testid="text-resolution-title">Resolution</div>
                <div className="text-xs text-muted-foreground" data-testid="text-resolution-subtitle">
                  Add resolution notes, mark solved, and close when needed.
                </div>
              </div>
              <TierPill tier={t.priority.tier} id={`${t.id}-tier2`} />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status workflow</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <Button
                      key={s}
                      variant={t.status === s ? "default" : "secondary"}
                      className="rounded-xl"
                      onClick={() => props.onUpdateStatus(s)}
                      data-testid={`button-set-status-${s}`}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Resolution notes</div>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="min-h-[84px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm app-ring focus-visible:ring-0"
                  placeholder="What was the fix? Any follow-ups?"
                  data-testid="input-resolution-notes"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground" data-testid="text-resolution-hint">
                (MVP: updates the UI. Later: posts to Zendesk and writes to BigQuery escalation table.)
              </div>
              <Button
                className="rounded-xl"
                disabled={!canResolve || !resolutionNotes.trim()}
                onClick={() => props.onResolve(resolutionNotes.trim())}
                data-testid="button-mark-solved"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Save & mark Solved
              </Button>
            </div>

            {t.resolution.resolvedAt ? (
              <div className="mt-3 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm" data-testid="status-resolved">
                Resolved {formatDate(t.resolution.resolvedAt)}
              </div>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="app-surface rounded-2xl p-4" data-testid="card-vendor-profile">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium" data-testid="text-vendor-profile-title">Vendor</div>
                <div className="mt-1 text-sm" data-testid="text-vendor-profile-name">{props.vendor?.name ?? t.vendorName ?? t.vendorHandle}</div>
                <div className="text-xs text-muted-foreground" data-testid="text-vendor-profile-handle">{t.vendorHandle}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                <UserRound className="h-5 w-5 text-foreground/70" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="tile-gmv-tier">
                <div className="text-xs text-muted-foreground">GMV tier</div>
                <div className="mt-0.5 font-medium">{props.vendor?.gmvTier ?? t.priority.breakdown.vendorGmvTier}</div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="tile-kam">
                <div className="text-xs text-muted-foreground">KAM</div>
                <div className="mt-0.5 font-medium">{props.vendor?.kam ?? "—"}</div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="tile-zone">
                <div className="text-xs text-muted-foreground">Zone</div>
                <div className="mt-0.5 font-medium">{props.vendor?.zone ?? "—"}</div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="tile-persona">
                <div className="text-xs text-muted-foreground">Persona</div>
                <div className="mt-0.5 font-medium">{props.vendor?.persona ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-category">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-foreground/70" />
              <div className="font-medium" data-testid="text-category-title">Category</div>
            </div>
            <div className="mt-2 text-sm" data-testid="text-category-path">{t.category.path}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="text-category-levels">
              <span className="app-chip rounded-full px-2 py-0.5">L1: {t.category.l1}</span>
              <span className="app-chip rounded-full px-2 py-0.5">L2: {t.category.l2}</span>
              <span className="app-chip rounded-full px-2 py-0.5">L3: {t.category.l3}</span>
              {t.category.l4 ? <span className="app-chip rounded-full px-2 py-0.5">L4: {t.category.l4}</span> : null}
            </div>
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-link-zendesk">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium" data-testid="text-zendesk-title">Zendesk link</div>
                <div className="text-xs text-muted-foreground" data-testid="text-zendesk-subtitle">Link or create escalation ticket ID (MVP)</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                <Link2 className="h-5 w-5 text-foreground/70" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <Input
                value={zendeskId}
                onChange={(e) => setZendeskId(e.target.value)}
                placeholder="Zendesk Ticket ID (numbers)"
                className="rounded-xl"
                data-testid="input-zendesk-id"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground" data-testid="text-zendesk-linked">
                  {t.zendesk.linked ? `Linked: #${t.zendesk.zendeskTicketId}` : "Not linked"}
                </div>
                <Button
                  variant="secondary"
                  className="rounded-xl"
                  disabled={!zendeskId.trim()}
                  onClick={() => props.onLinkZendesk(zendeskId.trim())}
                  data-testid="button-link-zendesk"
                >
                  Link
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-assignment">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium" data-testid="text-assignment-title">Assignment</div>
                <div className="text-xs text-muted-foreground" data-testid="text-assignment-subtitle">Assign stakeholder and ownership</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                <BadgeCheck className="h-5 w-5 text-foreground/70" />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-xs text-muted-foreground" data-testid="text-owner-team">Team: {t.owner.team}</div>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Assignee (email or name)"
                className="rounded-xl"
                data-testid="input-assignee"
              />
              <Button
                className="w-full rounded-xl"
                disabled={!canAssign || !assignee.trim()}
                onClick={() => props.onAssign(assignee.trim())}
                data-testid="button-assign"
              >
                Assign
              </Button>
              {!canAssign ? (
                <div className="text-xs text-muted-foreground" data-testid="text-assign-disabled">
                  Switch role to Admin or Department Lead to assign.
                </div>
              ) : null}
            </div>
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-order">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-foreground/70" />
              <div className="font-medium" data-testid="text-order-title">Order</div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {t.fleekOrderId ? (
                <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-order-linked">
                  Linked: <span className="font-medium">{t.fleekOrderId}</span>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2 text-sm text-muted-foreground" data-testid="text-order-none">
                  No order linked
                </div>
              )}
              <div className="text-xs text-muted-foreground" data-testid="text-order-hint">
                (In production, this would pull vendor orders from BigQuery.)
              </div>
            </div>
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-slack-preview">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="app-title text-lg font-semibold">Slack notifications</div>
                <div className="mt-1 text-sm text-muted-foreground">In production, escalations would ping the right channel automatically.</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                <Bell className="h-5 w-5 text-foreground/70" />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2" data-testid="text-slack-sample-1">
                <span className="font-medium">#seller-escalations</span> · Escalated <span className="font-medium">{t.priority.tier}</span> for <span className="font-medium">{props.vendor?.name ?? t.vendorName ?? "Vendor"}</span> — “{t.subject}”
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2" data-testid="text-slack-sample-2">
                <span className="font-medium">#critical-escalations</span> · {t.priority.score} score (GMV {t.priority.breakdown.gmvPoints} + History {t.priority.breakdown.ticketHistoryPoints} + Issue {t.priority.breakdown.issuePoints})
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2" data-testid="text-slack-sample-3">
                <span className="font-medium">#{t.department.toLowerCase()}-escalations</span> · Category: <span className="font-medium">{t.category.l3}</span> — {t.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateEscalationPage(props: { tickets: Ticket[]; onCreate: (t: Ticket) => void }) {
  const [mode, setMode] = useState<"link" | "create">("create");

  const [vendorHandle, setVendorHandle] = useState("");
  const [vendorSuggestionOpen, setVendorSuggestionOpen] = useState(false);
  const vendorSuggestions = useMemo(() => {
    const q = vendorHandle.trim().toLowerCase();
    if (!q) return [];
    return MOCK_VENDORS.filter((v) => v.handle.toLowerCase().includes(q) || v.name.toLowerCase().includes(q)).slice(0, 6);
  }, [vendorHandle]);

  const vendor = useMemo(() => {
    const exact = MOCK_VENDORS.find((v) => v.handle === vendorHandle || v.name.toLowerCase() === vendorHandle.toLowerCase());
    return exact ?? null;
  }, [vendorHandle]);

  const [issueType, setIssueType] = useState<IssueType>("Complaint");
  const [department, setDepartment] = useState<Ticket["department"]>("Finance");

  const l2Options = useMemo(() => {
    const rows = CATEGORY_ROWS.filter((r) => r.l1 === department && r.issueType === issueType);
    return Array.from(new Set(rows.map((r) => r.l2))).sort();
  }, [department, issueType]);

  const [l2, setL2] = useState<string>("");

  const l3Options = useMemo(() => {
    const rows = CATEGORY_ROWS.filter((r) => r.l1 === department && r.issueType === issueType && (l2 ? r.l2 === l2 : true));
    return Array.from(new Set(rows.map((r) => r.l3))).sort();
  }, [department, issueType, l2]);

  const [l3, setL3] = useState<string>("");

  const l4Options = useMemo(() => {
    const rows = CATEGORY_ROWS.filter((r) => r.l1 === department && r.issueType === issueType && (l2 ? r.l2 === l2 : true) && (l3 ? r.l3 === l3 : true));
    const options = rows.map((r) => r.l4).filter(Boolean) as string[];
    return Array.from(new Set(options)).sort();
  }, [department, issueType, l2, l3]);

  const [l4, setL4] = useState<string>("");

  const selectedCategory = useMemo(() => {
    const row = CATEGORY_ROWS.find((r) =>
      r.issueType === issueType &&
      r.l1 === department &&
      (l2 ? r.l2 === l2 : true) &&
      (l3 ? r.l3 === l3 : true) &&
      (l4 ? (r.l4 ?? "") === l4 : true),
    );
    return row ?? null;
  }, [issueType, department, l2, l3, l4]);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const [zendeskTicketId, setZendeskTicketId] = useState("");

  const [orderId, setOrderId] = useState("");
  const [orderSuggestionOpen, setOrderSuggestionOpen] = useState(false);
  const orderSuggestions = useMemo(() => {
    const q = orderId.trim().toLowerCase();
    if (!q) return [];
    const handle = vendor?.handle ?? vendorHandle.trim();
    return MOCK_ORDERS
      .filter((o) => (!handle ? true : o.vendorHandle === handle))
      .filter((o) => o.fleekOrderId.toLowerCase().includes(q))
      .slice(0, 6);
  }, [orderId, vendor?.handle, vendorHandle]);

  const vendorTicketVolume = useMemo(() => {
    const handle = (vendor?.handle ?? vendorHandle).trim();
    if (!handle) return 0;
    return props.tickets.filter((t) => t.vendorHandle === handle && t.status !== "Solved" && t.status !== "Closed").length;
  }, [props.tickets, vendor?.handle, vendorHandle]);

  const issuePriorityPoints = selectedCategory?.issuePriorityPoints ?? (issueType === "Information" ? 10 : 10);
  const gmvTier = vendor?.gmvTier ?? ("M" as const);

  const priority = computePriority({
    vendorTicketVolume,
    vendorGmvTier: gmvTier,
    issuePriorityPoints,
  });

  const pathPreview = useMemo(() => {
    const parts = [issueType, department, l2 || "…", l3 || "…", l4 || ""].filter(Boolean);
    return parts.join(" > ");
  }, [issueType, department, l2, l3, l4]);

  const requiredOk =
    vendorHandle.trim() &&
    (mode === "link" ? zendeskTicketId.trim() : true) &&
    issueType &&
    department &&
    l2.trim() &&
    l3.trim() &&
    subject.trim() &&
    description.trim();

  return (
    <div className="space-y-4" data-testid="page-create-escalation">
      <div className="app-surface rounded-2xl px-4 py-4 sm:px-5" data-testid="panel-create-header">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="app-title text-2xl font-semibold tracking-tight" data-testid="text-create-page-title">Create escalation</div>
            <div className="mt-1 text-sm text-muted-foreground" data-testid="text-create-page-subtitle">
              Link an existing Zendesk ticket or create a new escalation record.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={mode === "link" ? "default" : "secondary"}
              className="rounded-xl"
              onClick={() => setMode("link")}
              data-testid="button-mode-link"
            >
              Link Zendesk ticket
            </Button>
            <Button
              variant={mode === "create" ? "default" : "secondary"}
              className="rounded-xl"
              onClick={() => setMode("create")}
              data-testid="button-mode-create"
            >
              Create new
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <Card className="app-surface rounded-2xl" data-testid="card-create-form">
            <CardHeader className="pb-3">
              <CardTitle className="app-title text-lg" data-testid="text-form-title">Escalation details</CardTitle>
              <div className="text-sm text-muted-foreground" data-testid="text-form-hint">
                Required: Vendor, Department, Issue Type, L2, L3, Subject, Description. Order ID optional.
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Vendor handle</div>
                  <div className="relative">
                    <Input
                      value={vendorHandle}
                      onChange={(e) => {
                        setVendorHandle(e.target.value);
                        setVendorSuggestionOpen(true);
                      }}
                      onBlur={() => setTimeout(() => setVendorSuggestionOpen(false), 120)}
                      placeholder="Type vendor handle or name…"
                      className="rounded-xl"
                      data-testid="input-vendor-handle"
                    />
                    {vendorSuggestionOpen && vendorSuggestions.length ? (
                      <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg" data-testid="menu-vendor-suggestions">
                        {vendorSuggestions.map((v) => (
                          <button
                            key={v.handle}
                            className="w-full text-left px-3 py-2 hover:bg-secondary/60"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setVendorHandle(v.handle);
                              setVendorSuggestionOpen(false);
                            }}
                            data-testid={`button-suggest-vendor-${v.handle}`}
                          >
                            <div className="text-sm font-medium">{v.name}</div>
                            <div className="text-xs text-muted-foreground">{v.handle} · GMV {v.gmvTier} · KAM {v.kam}</div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {mode === "link" ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Zendesk Ticket ID</div>
                    <Input
                      value={zendeskTicketId}
                      onChange={(e) => setZendeskTicketId(e.target.value)}
                      placeholder="e.g. 123456"
                      className="rounded-xl"
                      data-testid="input-zendesk-ticket-id"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Fleek Order ID (optional)</div>
                    <div className="relative">
                      <Input
                        value={orderId}
                        onChange={(e) => {
                          setOrderId(e.target.value);
                          setOrderSuggestionOpen(true);
                        }}
                        onBlur={() => setTimeout(() => setOrderSuggestionOpen(false), 120)}
                        placeholder="Search vendor orders…"
                        className="rounded-xl"
                        data-testid="input-order-id"
                      />
                      {orderSuggestionOpen && orderSuggestions.length ? (
                        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg" data-testid="menu-order-suggestions">
                          {orderSuggestions.map((o) => (
                            <button
                              key={o.fleekOrderId}
                              className="w-full text-left px-3 py-2 hover:bg-secondary/60"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setOrderId(o.fleekOrderId);
                                setOrderSuggestionOpen(false);
                              }}
                              data-testid={`button-suggest-order-${o.fleekOrderId}`}
                            >
                              <div className="text-sm font-medium">{o.fleekOrderId}</div>
                              <div className="text-xs text-muted-foreground">Status {o.latestStatus} · GMV {o.gmv}</div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-sm font-medium">Issue type</div>
                  <Select
                    value={issueType}
                    onValueChange={(v) => {
                      setIssueType(v as IssueType);
                      setL2("");
                      setL3("");
                      setL4("");
                    }}
                  >
                    <SelectTrigger className="rounded-xl" data-testid="select-issue-type">
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPES.map((t) => (
                        <SelectItem key={t} value={t} data-testid={`option-issue-${t}`}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Department (L1)</div>
                  <Select
                    value={department}
                    onValueChange={(v) => {
                      setDepartment(v as any);
                      setL2("");
                      setL3("");
                      setL4("");
                    }}
                  >
                    <SelectTrigger className="rounded-xl" data-testid="select-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d} data-testid={`option-department-${d}`}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Sub-dept (L2)</div>
                  <Select
                    value={l2}
                    onValueChange={(v) => {
                      setL2(v);
                      setL3("");
                      setL4("");
                    }}
                  >
                    <SelectTrigger className="rounded-xl" data-testid="select-category-l2">
                      <SelectValue placeholder={l2Options.length ? "Select L2" : "No options"} />
                    </SelectTrigger>
                    <SelectContent>
                      {l2Options.map((x) => (
                        <SelectItem key={x} value={x} data-testid={`option-l2-${x}`}>{x}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Category (L3)</div>
                  <Select
                    value={l3}
                    onValueChange={(v) => {
                      setL3(v);
                      setL4("");
                    }}
                  >
                    <SelectTrigger className="rounded-xl" data-testid="select-category-l3">
                      <SelectValue placeholder={l3Options.length ? "Select L3" : "No options"} />
                    </SelectTrigger>
                    <SelectContent>
                      {l3Options.map((x) => (
                        <SelectItem key={x} value={x} data-testid={`option-l3-${x}`}>{x}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Sub-category (L4)</div>
                  <Select value={l4} onValueChange={(v) => setL4(v)}>
                    <SelectTrigger className="rounded-xl" data-testid="select-category-l4">
                      <SelectValue placeholder={l4Options.length ? "Optional" : "No L4"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" data-testid="option-l4-none">(None)</SelectItem>
                      {l4Options.map((x) => (
                        <SelectItem key={x} value={x} data-testid={`option-l4-${x}`}>{x}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Ticket subject</div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, 200))}
                  className="rounded-xl"
                  placeholder="Max 200 characters"
                  data-testid="input-subject"
                />
                <div className="text-xs text-muted-foreground" data-testid="text-subject-count">
                  {subject.length}/200
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Ticket description</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm app-ring focus-visible:ring-0"
                  placeholder="Detailed issue description…"
                  data-testid="input-description"
                />
              </div>

              <div className="app-surface rounded-2xl p-4" data-testid="card-priority-preview">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium" data-testid="text-priority-preview">Priority preview</div>
                    <div className="mt-1 text-xs text-muted-foreground" data-testid="text-priority-preview-hint">
                      GMV (40%) + Ticket history (30%) + Issue type (30%) → score 0–100.
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", priorityBadgeClass(priority.badge))} data-testid="badge-preview-priority">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {priority.tier} · {priority.score}
                      </span>
                      <span className="app-chip rounded-full px-2 py-0.5 text-xs text-muted-foreground" data-testid="chip-preview-gmv">GMV {priority.breakdown.gmvPoints}</span>
                      <span className="app-chip rounded-full px-2 py-0.5 text-xs text-muted-foreground" data-testid="chip-preview-history">History {priority.breakdown.ticketHistoryPoints}</span>
                      <span className="app-chip rounded-full px-2 py-0.5 text-xs text-muted-foreground" data-testid="chip-preview-issue">Issue {priority.breakdown.issuePoints}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground" data-testid="text-sla-preview">
                      SLA: {slaLabel(priority.tier)}
                    </div>
                  </div>
                  <div className="hidden sm:grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                    <Filter className="h-5 w-5 text-foreground/70" />
                  </div>
                </div>
              </div>

              <div className="app-surface rounded-2xl p-4" data-testid="card-category-preview">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium" data-testid="text-category-preview-title">Category preview</div>
                  <span className="app-chip rounded-full px-2 py-0.5 text-xs text-muted-foreground" data-testid="text-category-preview-points">
                    Issue points: {issuePriorityPoints}
                  </span>
                </div>
                <div className="mt-2 text-sm" data-testid="text-category-preview-path">{pathPreview}</div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground" data-testid="text-create-required">
                  Required: Vendor, Issue type, Department, L2, L3, Subject, Description. (L4 optional.)
                </div>
                <Button
                  className="rounded-xl"
                  disabled={!requiredOk}
                  onClick={() => {
                    const vendorProfile = vendor ?? {
                      handle: vendorHandle.trim(),
                      name: vendorHandle.trim(),
                      gmvTier,
                      kam: "—",
                      zone: "—",
                      persona: "—",
                    };

                    const id = `ESC-${Math.floor(10000 + Math.random() * 89999)}`;
                    const createdAt = new Date().toISOString();

                    const categoryRow: CategoryRow = {
                      issueType,
                      l1: department,
                      l2,
                      l3,
                      l4: l4 || undefined,
                      path: [issueType, department, l2, l3, l4].filter(Boolean).join(" > "),
                      issuePriorityPoints,
                    };

                    const t: Ticket = {
                      id: mode === "link" ? `ZND-${zendeskTicketId.trim()}` : id,
                      createdAt,
                      updatedAt: createdAt,
                      vendorHandle: vendorProfile.handle,
                      vendorName: vendorProfile.name,
                      department,
                      issueType,
                      category: {
                        l1: department,
                        l2: categoryRow.l2,
                        l3: categoryRow.l3,
                        l4: categoryRow.l4,
                        path: categoryRow.path,
                      },
                      subject: subject.trim(),
                      description: description.trim(),
                      fleekOrderId: orderId.trim() ? orderId.trim() : undefined,
                      status: "New",
                      priority,
                      owner: {
                        team: department === "Finance" ? "Finance Team" : department === "Operations" ? "Operations Team" : department === "Marketplace" ? "Marketplace Team" : department,
                        assignee: "",
                      },
                      resolution: {},
                      comments: [
                        {
                          id: `${id}-c1`,
                          createdAt,
                          author: "Seller Support Agent",
                          body: mode === "link" ? "Linked Zendesk ticket and escalated with structured fields." : "Created new escalation in portal (MVP).",
                          visibility: "Internal",
                        },
                      ],
                      zendesk: {
                        linked: true,
                        zendeskTicketId: mode === "link" ? zendeskTicketId.trim() : undefined,
                      },
                    };

                    props.onCreate(t);
                    setVendorHandle("");
                    setSubject("");
                    setDescription("");
                    setZendeskTicketId("");
                    setOrderId("");
                    setL2("");
                    setL3("");
                    setL4("");
                  }}
                  data-testid="button-create-escalation"
                >
                  {mode === "link" ? "Link & escalate" : "Create escalation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="app-surface rounded-2xl p-4" data-testid="card-vendor-preview">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium" data-testid="text-vendor-preview-title">Vendor preview</div>
                <div className="mt-1 text-sm" data-testid="text-vendor-preview-name">{vendor?.name ?? (vendorHandle.trim() ? vendorHandle.trim() : "—")}</div>
                <div className="text-xs text-muted-foreground" data-testid="text-vendor-preview-handle">{vendor?.handle ?? ""}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                <UserRound className="h-5 w-5 text-foreground/70" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="tile-vendor-gmv">
                <div className="text-xs text-muted-foreground">GMV tier</div>
                <div className="mt-0.5 font-medium">{vendor?.gmvTier ?? gmvTier}</div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="tile-vendor-open-count">
                <div className="text-xs text-muted-foreground">Open tickets</div>
                <div className="mt-0.5 font-medium">{vendorTicketVolume}</div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="tile-vendor-kam">
                <div className="text-xs text-muted-foreground">KAM</div>
                <div className="mt-0.5 font-medium">{vendor?.kam ?? "—"}</div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="tile-vendor-zone">
                <div className="text-xs text-muted-foreground">Zone</div>
                <div className="mt-0.5 font-medium">{vendor?.zone ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-slack-routing">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium" data-testid="text-slack-routing-title">Slack routing (preview)</div>
                <div className="text-xs text-muted-foreground" data-testid="text-slack-routing-subtitle">
                  Department channel + critical channel
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                <Bell className="h-5 w-5 text-foreground/70" />
              </div>
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2" data-testid="text-slack-route-dept">
                <span className="font-medium">#{department.toLowerCase()}-escalations</span>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2" data-testid="text-slack-route-critical">
                <span className="font-medium">#critical-escalations</span> {priority.score >= 80 ? "(will notify)" : "(only for score ≥ 80)"}
              </div>
            </div>
          </div>

          <div className="app-surface rounded-2xl p-4" data-testid="card-data-sources">
            <div className="font-medium" data-testid="text-data-sources-title">Data sources (planned)</div>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              <div data-testid="text-source-zendesk">Zendesk: ticket + comments sync (bidirectional)</div>
              <div data-testid="text-source-bigquery">BigQuery: vendor GMV + orders + escalation table</div>
              <div data-testid="text-source-slack">Slack: webhooks to department + critical channels</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [role, setRole] = useState<Role>("Admin");
  const [active, setActive] = useState("all");

  const [tickets, setTickets] = useState<Ticket[]>(() => initialTickets());
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [department, setDepartment] = useState<Ticket["department"] | "all">("all");
  const [issueType, setIssueType] = useState<IssueType | "all">("all");
  const [tier, setTier] = useState<PriorityTier | "all">("all");
  const [dateRange, setDateRange] = useState<"all" | "24h" | "7d" | "30d">("all");

  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return tickets.find((t) => t.id === selectedTicketId) ?? null;
  }, [selectedTicketId, tickets]);

  const selectedVendor = useMemo(() => {
    if (!selectedTicket) return null;
    return vendorForHandle(selectedTicket.vendorHandle);
  }, [selectedTicket]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();

    const cutoff =
      dateRange === "24h"
        ? now - 1000 * 60 * 60 * 24
        : dateRange === "7d"
          ? now - 1000 * 60 * 60 * 24 * 7
          : dateRange === "30d"
            ? now - 1000 * 60 * 60 * 24 * 30
            : null;

    return tickets
      .filter((t) => (status === "all" ? true : t.status === status))
      .filter((t) => (department === "all" ? true : t.department === department))
      .filter((t) => (issueType === "all" ? true : t.issueType === issueType))
      .filter((t) => (tier === "all" ? true : t.priority.tier === tier))
      .filter((t) => (cutoff ? new Date(t.createdAt).getTime() >= cutoff : true))
      .filter((t) => {
        if (!q) return true;
        return (
          t.id.toLowerCase().includes(q) ||
          t.vendorHandle.toLowerCase().includes(q) ||
          (t.vendorName ?? "").toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.category.path.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.priority.score - a.priority.score);
  }, [tickets, search, status, department, issueType, tier, dateRange]);

  const vendorGroups = useMemo(() => {
    const byVendor = new Map<string, Ticket[]>();
    for (const t of tickets) {
      byVendor.set(t.vendorHandle, [...(byVendor.get(t.vendorHandle) ?? []), t]);
    }
    return Array.from(byVendor.entries())
      .map(([handle, items]) => {
        const profile = vendorForHandle(handle);
        const open = items.filter((t) => t.status === "Open" || t.status === "Pending" || t.status === "New").length;
        const topPriority = items.slice().sort((a, b) => b.priority.score - a.priority.score)[0];

        return {
          handle,
          name: profile?.name ?? items[0]?.vendorName ?? handle,
          kam: profile?.kam ?? "—",
          gmvTier: profile?.gmvTier ?? items[0]?.priority.breakdown.vendorGmvTier,
          total: items.length,
          open,
          historical: items.length,
          topPriority,
        };
      })
      .sort((a, b) => b.open - a.open);
  }, [tickets]);

  const issueGroups = useMemo(() => {
    const byIssue = new Map<IssueType, Ticket[]>();
    for (const t of tickets) {
      byIssue.set(t.issueType, [...(byIssue.get(t.issueType) ?? []), t]);
    }
    return ISSUE_TYPES.map((k) => {
      const items = byIssue.get(k) ?? [];
      return {
        type: k,
        total: items.length,
        open: items.filter((t) => t.status === "Open" || t.status === "Pending" || t.status === "New").length,
        top: items.slice().sort((a, b) => b.priority.score - a.priority.score)[0],
      };
    });
  }, [tickets]);

  const summary = useMemo(() => {
    const total = tickets.length;
    const byStatus = STATUS_OPTIONS.map((s) => ({ name: s, value: tickets.filter((t) => t.status === s).length }));
    const byDept = DEPARTMENTS.map((d) => ({ name: d, value: tickets.filter((t) => t.department === d).length }));
    const byIssue = ISSUE_TYPES.map((i) => ({ name: i, value: tickets.filter((t) => t.issueType === i).length }));
    const byTier = PRIORITY_TIERS.map((x) => ({ name: x, value: tickets.filter((t) => t.priority.tier === x).length }));

    const resolvedCount = tickets.filter((t) => t.status === "Solved" || t.status === "Closed").length;
    const resolutionRate = total ? Math.round((resolvedCount / total) * 100) : 0;

    return { total, byStatus, byDept, byIssue, byTier, resolutionRate };
  }, [tickets]);

  if (selectedTicket) {
    return (
      <AppShell>
        <TopBar active={active} onNavigate={setActive} role={role} onRoleChange={setRole} />

        <div className="mt-4">
          <TicketDetail
            role={role}
            ticket={selectedTicket}
            vendor={selectedVendor}
            onBack={() => setSelectedTicketId(null)}
            onUpdateStatus={(s) => {
              setTickets((prev) =>
                prev.map((t) =>
                  t.id === selectedTicket.id
                    ? { ...t, status: s, updatedAt: new Date().toISOString() }
                    : t,
                ),
              );
            }}
            onAssign={(assignee) => {
              setTickets((prev) =>
                prev.map((t) =>
                  t.id === selectedTicket.id
                    ? { ...t, owner: { ...t.owner, assignee }, updatedAt: new Date().toISOString() }
                    : t,
                ),
              );
            }}
            onAddComment={(c) => {
              setTickets((prev) =>
                prev.map((t) =>
                  t.id === selectedTicket.id
                    ? { ...t, comments: [...t.comments, c], updatedAt: new Date().toISOString() }
                    : t,
                ),
              );
            }}
            onResolve={(notes) => {
              const nowIso = new Date().toISOString();
              setTickets((prev) =>
                prev.map((t) =>
                  t.id === selectedTicket.id
                    ? {
                        ...t,
                        status: "Solved",
                        resolution: { notes, resolvedAt: nowIso },
                        updatedAt: nowIso,
                      }
                    : t,
                ),
              );
            }}
            onLinkZendesk={(zendeskId) => {
              const nowIso = new Date().toISOString();
              setTickets((prev) =>
                prev.map((t) =>
                  t.id === selectedTicket.id
                    ? {
                        ...t,
                        zendesk: { linked: true, zendeskTicketId: zendeskId },
                        updatedAt: nowIso,
                      }
                    : t,
                ),
              );
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <TopBar active={active} onNavigate={setActive} role={role} onRoleChange={setRole} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            {active === "create" ? (
              <CreateEscalationPage
                tickets={tickets}
                onCreate={(t) => {
                  setTickets((prev) => [t, ...prev]);
                  setActive("all");
                  setSelectedTicketId(t.id);
                }}
              />
            ) : (
              <>
                <div className="app-surface rounded-2xl px-4 py-4" data-testid="panel-filters">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 items-center gap-2">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                        <Search className="h-5 w-5 text-foreground/70" />
                      </div>
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by ID, vendor, subject, category…"
                        className="rounded-xl"
                        data-testid="input-search"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                        <SelectTrigger className="w-[160px] rounded-xl" data-testid="select-status">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="option-status-all">All statuses</SelectItem>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} data-testid={`option-status-${s}`}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                        <SelectTrigger className="w-[160px] rounded-xl" data-testid="select-tier">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="option-tier-all">All tiers</SelectItem>
                          {PRIORITY_TIERS.map((x) => (
                            <SelectItem key={x} value={x} data-testid={`option-tier-${x}`}>{x}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={department} onValueChange={(v) => setDepartment(v as any)}>
                        <SelectTrigger className="w-[170px] rounded-xl" data-testid="select-filter-department">
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="option-dept-all">All depts</SelectItem>
                          {DEPARTMENTS.map((d) => (
                            <SelectItem key={d} value={d} data-testid={`option-dept-${d}`}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={issueType} onValueChange={(v) => setIssueType(v as any)}>
                        <SelectTrigger className="w-[170px] rounded-xl" data-testid="select-filter-issue">
                          <SelectValue placeholder="Issue type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="option-issue-all">All issues</SelectItem>
                          {ISSUE_TYPES.map((i) => (
                            <SelectItem key={i} value={i} data-testid={`option-issue-${i}`}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                        <SelectTrigger className="w-[140px] rounded-xl" data-testid="select-date-range">
                          <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" data-testid="option-date-all">All time</SelectItem>
                          <SelectItem value="24h" data-testid="option-date-24h">Last 24h</SelectItem>
                          <SelectItem value="7d" data-testid="option-date-7d">Last 7d</SelectItem>
                          <SelectItem value="30d" data-testid="option-date-30d">Last 30d</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="secondary"
                        className="rounded-xl"
                        onClick={() => {
                          setSearch("");
                          setStatus("all");
                          setDepartment("all");
                          setIssueType("all");
                          setTier("all");
                          setDateRange("all");
                        }}
                        data-testid="button-clear-filters"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                <Tabs value={active} onValueChange={setActive}>
                  <TabsList className="hidden" />

                  <TabsContent value="all" className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <KpiTile
                        label="Open workload"
                        value={String(tickets.filter((t) => t.status === "Open" || t.status === "Pending" || t.status === "New").length)}
                        hint="New + Open + Pending"
                        icon={<LayoutGrid className="h-5 w-5 text-foreground/70" />}
                        testId="kpi-open-workload"
                      />
                      <KpiTile
                        label="Resolution rate"
                        value={`${summary.resolutionRate}%`}
                        hint="Solved + Closed"
                        icon={<CheckCircle2 className="h-5 w-5 text-foreground/70" />}
                        testId="kpi-resolution-rate"
                      />
                      <KpiTile
                        label="Highest tier"
                        value={tickets.slice().sort((a, b) => b.priority.score - a.priority.score)[0]?.priority.tier ?? "—"}
                        hint="Across all tickets"
                        icon={<AlertTriangle className="h-5 w-5 text-foreground/70" />}
                        testId="kpi-highest-tier"
                      />
                      <KpiTile
                        label="Vendors impacted"
                        value={String(new Set(tickets.map((t) => t.vendorHandle)).size)}
                        hint="Unique vendors"
                        icon={<UserRound className="h-5 w-5 text-foreground/70" />}
                        testId="kpi-vendors-impacted"
                      />
                    </div>

                    <TicketTable
                      tickets={filtered}
                      onOpen={(t) => setSelectedTicketId(t.id)}
                    />
                  </TabsContent>

                  <TabsContent value="vendors" className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {vendorGroups.map((v) => (
                        <div key={v.handle} className="app-surface hover-elevate rounded-2xl p-4" data-testid={`card-vendor-${v.handle}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium" data-testid={`text-vendor-card-name-${v.handle}`}>{v.name}</div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-vendor-card-handle-${v.handle}`}>{v.handle}</div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground" data-testid={`text-vendor-meta-${v.handle}`}>
                                <span className="app-chip rounded-full px-2 py-0.5">GMV {v.gmvTier}</span>
                                <span className="app-chip rounded-full px-2 py-0.5">KAM {v.kam}</span>
                                <span className="app-chip rounded-full px-2 py-0.5">Open {v.open}</span>
                                <span className="app-chip rounded-full px-2 py-0.5">History {v.historical}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="rounded-full" variant="secondary" data-testid={`badge-vendor-total-${v.handle}`}>{v.total} total</Badge>
                              <Badge className="rounded-full" variant="secondary" data-testid={`badge-vendor-open-${v.handle}`}>{v.open} open</Badge>
                            </div>
                          </div>

                          {v.topPriority ? (
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="text-xs text-muted-foreground" data-testid={`text-vendor-top-${v.handle}`}>
                                Top: {v.topPriority.subject}
                              </div>
                              <button
                                className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", priorityBadgeClass(v.topPriority.priority.badge))}
                                onClick={() => setSelectedTicketId(v.topPriority.id)}
                                data-testid={`button-vendor-open-top-${v.handle}`}
                              >
                                {v.topPriority.priority.tier} · {v.topPriority.priority.score}
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="issues" className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {issueGroups.map((g) => (
                        <div key={g.type} className="app-surface hover-elevate rounded-2xl p-4" data-testid={`card-issue-${g.type}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium" data-testid={`text-issue-title-${g.type}`}>{g.type}</div>
                              <div className="mt-1 text-xs text-muted-foreground" data-testid={`text-issue-counts-${g.type}`}>{g.open} open · {g.total} total</div>
                            </div>
                            <Badge variant="secondary" className="rounded-full" data-testid={`badge-issue-total-${g.type}`}>{g.total}</Badge>
                          </div>

                          {g.top ? (
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-issue-top-${g.type}`}>
                                Top: {g.top.subject}
                              </div>
                              <button
                                className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", priorityBadgeClass(g.top.priority.badge))}
                                onClick={() => setSelectedTicketId(g.top.id)}
                                data-testid={`button-issue-open-top-${g.type}`}
                              >
                                {g.top.priority.tier} · {g.top.priority.score}
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="summary" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="app-surface rounded-2xl p-4" data-testid="chart-status">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">By status</div>
                            <div className="text-xs text-muted-foreground">Ticket distribution</div>
                          </div>
                          <Badge variant="secondary" className="rounded-full">{summary.total} total</Badge>
                        </div>
                        <div className="mt-4 h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={summary.byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                                {summary.byStatus.map((_, idx) => (
                                  <Cell key={idx} fill={["#7c3aed", "#2563eb", "#d97706", "#059669", "#71717a"][idx % 5]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="app-surface rounded-2xl p-4" data-testid="chart-tier">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">By priority tier</div>
                            <div className="text-xs text-muted-foreground">SLA tiers</div>
                          </div>
                          <Badge variant="secondary" className="rounded-full">{PRIORITY_TIERS.length} tiers</Badge>
                        </div>
                        <div className="mt-4 h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summary.byTier} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={30} />
                              <Tooltip />
                              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#ef4444" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="app-surface rounded-2xl p-4" data-testid="chart-department">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">By department</div>
                            <div className="text-xs text-muted-foreground">Where work is landing</div>
                          </div>
                          <Badge variant="secondary" className="rounded-full">{DEPARTMENTS.length} depts</Badge>
                        </div>
                        <div className="mt-4 h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summary.byDept} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-12} height={60} />
                              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={30} />
                              <Tooltip />
                              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#7c3aed" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="app-surface rounded-2xl p-4" data-testid="chart-issue">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">By issue type</div>
                            <div className="text-xs text-muted-foreground">Complaints vs requests vs information</div>
                          </div>
                        </div>
                        <div className="mt-4 h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summary.byIssue} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={30} />
                              <Tooltip />
                              <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#0891b2" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">
            {active !== "create" ? (
              <>
                <div className="app-surface rounded-2xl p-4" data-testid="card-quick-actions">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="app-title text-lg font-semibold">Quick actions</div>
                      <div className="mt-1 text-sm text-muted-foreground">Create, link, and triage escalations.</div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                      <Filter className="h-5 w-5 text-foreground/70" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <Button className="rounded-xl" onClick={() => setActive("create")} data-testid="button-go-create">
                      Create escalation
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="secondary" className="rounded-xl" data-testid="button-slack-preview">
                      Slack notification preview
                      <Bell className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="app-surface rounded-2xl p-4" data-testid="card-blueprint-sla">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-foreground/70" />
                    <div className="font-medium" data-testid="text-sla-title">SLA targets</div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-sla-critical">
                      <span className="font-medium">Critical</span> — Response 2h, Resolve 24h
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-sla-high">
                      <span className="font-medium">High</span> — Response 4h, Resolve 48h
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-sla-medium">
                      <span className="font-medium">Medium</span> — Response 8h, Resolve 72h
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-sla-low">
                      <span className="font-medium">Low</span> — Response 24h, Resolve 5 business days
                    </div>
                  </div>
                </div>

                <div className="app-surface rounded-2xl p-4" data-testid="card-slack-channels">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-foreground/70" />
                    <div className="font-medium" data-testid="text-channels-title">Slack channels (blueprint)</div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-channel-finance">Finance → #finance-escalations</div>
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-channel-ops">Operations → #ops-escalations</div>
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-channel-marketplace">Marketplace → #marketplace-escalations</div>
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-channel-tech">Tech → #tech-escalations</div>
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-channel-cx">CX → #cx-escalations</div>
                    <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-channel-critical">Critical → #critical-escalations</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="app-surface rounded-2xl p-4" data-testid="card-create-side">
                <div className="app-title text-lg font-semibold">Tips</div>
                <div className="mt-2 text-sm text-muted-foreground" data-testid="text-create-tips">
                  Start with Vendor + Department + L2/L3. Priority auto-updates as you pick a payment/refund/order category.
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-tip-1">
                    Payment issues typically score highest.
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/25 px-3 py-2" data-testid="text-tip-2">
                    Vendors with multiple open escalations get prioritized automatically.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
