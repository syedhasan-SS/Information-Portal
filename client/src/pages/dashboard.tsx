import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Filter,
  LayoutGrid,
  LineChart,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

type IssueType = "Complaint" | "Request" | "Information";
type Status = "New" | "Open" | "Pending" | "Solved" | "Closed";

type Ticket = {
  id: string;
  createdAt: string;
  vendorHandle: string;
  vendorName?: string;
  department: "Finance" | "Operations" | "Marketplace" | "Tech" | "Experience" | "CX" | "Seller Support";
  issueType: IssueType;
  categoryPath: string;
  subject: string;
  description: string;
  fleekOrderId?: string;
  status: Status;
  priority: {
    score: number;
    badge: "P0" | "P1" | "P2" | "P3";
    breakdown: {
      vendorTicketVolume: number;
      vendorGmvTier: "S" | "M" | "L" | "XL";
      issuePriority: number;
    };
  };
  owner: {
    team: string;
    assignee?: string;
  };
};

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

const DEPARTMENTS: Ticket["department"][] = [
  "Finance",
  "Operations",
  "Marketplace",
  "Tech",
  "Experience",
  "CX",
  "Seller Support",
];

const STATUS_OPTIONS: Status[] = ["New", "Open", "Pending", "Solved", "Closed"];
const ISSUE_TYPES: IssueType[] = ["Complaint", "Request", "Information"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "2-digit" }) + ", " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
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

function computePriority(params: { vendorTicketVolume: number; vendorGmvTier: Ticket["priority"]["breakdown"]["vendorGmvTier"]; issuePriority: number }) {
  const volumeScore = Math.min(40, params.vendorTicketVolume * 8);
  const gmvScore = ({ S: 8, M: 14, L: 20, XL: 26 } as const)[params.vendorGmvTier];
  const issueScore = Math.min(34, params.issuePriority * 8);
  const score = Math.round(volumeScore + gmvScore + issueScore);
  const badge: Ticket["priority"]["badge"] = score >= 78 ? "P0" : score >= 60 ? "P1" : score >= 42 ? "P2" : "P3";
  return { score, badge };
}

const MOCK_VENDORS = [
  { handle: "vendor_fleek_moda", name: "Fleek Moda", gmvTier: "XL" as const },
  { handle: "vendor_silverlane", name: "Silverlane", gmvTier: "L" as const },
  { handle: "vendor_kora_home", name: "Kora Home", gmvTier: "M" as const },
  { handle: "vendor_aurora", name: "Aurora", gmvTier: "S" as const },
  { handle: "vendor_nimbus", name: "Nimbus", gmvTier: "M" as const },
];

function initialTickets(): Ticket[] {
  const base: Array<
    Omit<Ticket, "priority"> & {
      p: Ticket["priority"]["breakdown"];
    }
  > = [
    {
      id: "ZND-18402",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      vendorHandle: "vendor_fleek_moda",
      vendorName: "Fleek Moda",
      department: "Finance",
      issueType: "Complaint",
      categoryPath: "Complaint > Finance > Payment > Payout Not Received",
      subject: "Payout not received for last cycle",
      description: "Seller reports payout missing since last settlement. Needs reconciliation and partner status check.",
      fleekOrderId: "FLK-900312",
      status: "Open",
      p: { vendorTicketVolume: 4, vendorGmvTier: "XL", issuePriority: 4 },
      owner: { team: "Finance Ops", assignee: "" },
    },
    {
      id: "ZND-18377",
      createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
      vendorHandle: "vendor_silverlane",
      vendorName: "Silverlane",
      department: "Operations",
      issueType: "Complaint",
      categoryPath: "Complaint > Operations > Order Issue > Order Status Update",
      subject: "Order status needs urgent update",
      description: "Status stuck in processing. Vendor needs update before dispatch window closes.",
      fleekOrderId: "FLK-882210",
      status: "Pending",
      p: { vendorTicketVolume: 2, vendorGmvTier: "L", issuePriority: 2 },
      owner: { team: "Ops Control", assignee: "" },
    },
    {
      id: "ZND-18421",
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      vendorHandle: "vendor_kora_home",
      vendorName: "Kora Home",
      department: "Marketplace",
      issueType: "Complaint",
      categoryPath: "Complaint > Marketplace > Product Listing > Product Upload Issue",
      subject: "Product upload failing",
      description: "Seller cannot upload SKUs; intermittent errors reported across multiple items.",
      status: "New",
      p: { vendorTicketVolume: 3, vendorGmvTier: "M", issuePriority: 2 },
      owner: { team: "Catalog", assignee: "" },
    },
    {
      id: "ZND-18311",
      createdAt: new Date(Date.now() - 1000 * 60 * 260).toISOString(),
      vendorHandle: "vendor_aurora",
      vendorName: "Aurora",
      department: "Tech",
      issueType: "Request",
      categoryPath: "Request > Tech > Account Details Update Request > Email Address Update",
      subject: "Update email address",
      description: "Vendor requests email update. Needs verification and change.",
      status: "Solved",
      p: { vendorTicketVolume: 1, vendorGmvTier: "S", issuePriority: 1 },
      owner: { team: "Support Tools", assignee: "" },
    },
    {
      id: "ZND-18258",
      createdAt: new Date(Date.now() - 1000 * 60 * 520).toISOString(),
      vendorHandle: "vendor_nimbus",
      vendorName: "Nimbus",
      department: "CX",
      issueType: "Complaint",
      categoryPath: "Complaint > CX > Seller Refund > Incorrect Refund Charged",
      subject: "Incorrect refund charged",
      description: "Refund amount discrepancy reported; requires refund ledger review.",
      status: "Open",
      p: { vendorTicketVolume: 5, vendorGmvTier: "M", issuePriority: 3 },
      owner: { team: "CX Refunds", assignee: "" },
    },
  ];

  return base.map((t) => {
    const { score, badge } = computePriority(t.p);
    return {
      ...t,
      priority: {
        score,
        badge,
        breakdown: t.p,
      },
    };
  });
}

function AppShell(props: { children: React.ReactNode }) {
  return (
    <div className="app-noise min-h-screen">
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {props.children}
      </div>
    </div>
  );
}

function TopBar(props: { active: string; onNavigate: (key: string) => void }) {
  const nav = [
    { key: "all", label: "All tickets", icon: LayoutGrid },
    { key: "vendors", label: "Vendors", icon: UserRound },
    { key: "issues", label: "Issue types", icon: SlidersHorizontal },
    { key: "summary", label: "Summary", icon: LineChart },
  ] as const;

  return (
    <div className="app-surface rounded-2xl px-4 py-4 sm:px-5">
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
            <div className="app-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-foreground/80" data-testid="chip-role">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Role: Admin
            </div>
            <Button variant="secondary" className="rounded-xl" data-testid="button-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
          {props.icon}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge(props: { ticket: Ticket }) {
  const { badge, score, breakdown } = props.ticket.priority;
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
          priorityBadgeClass(badge),
        )}
        data-testid={`badge-priority-${props.ticket.id}`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {badge} · {score}
      </span>
      <div className="hidden xl:flex items-center gap-2 text-xs text-muted-foreground" data-testid={`text-priority-breakdown-${props.ticket.id}`}>
        <span className="app-chip rounded-full px-2 py-0.5">Volume {breakdown.vendorTicketVolume}</span>
        <span className="app-chip rounded-full px-2 py-0.5">GMV {breakdown.vendorGmvTier}</span>
        <span className="app-chip rounded-full px-2 py-0.5">Issue {breakdown.issuePriority}</span>
      </div>
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
            <TableHead>Issue</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="min-w-[260px]">Priority</TableHead>
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
                <div className="flex flex-col">
                  <span className="text-sm" data-testid={`text-issue-type-${t.id}`}>{t.issueType}</span>
                  <span className="text-xs text-muted-foreground" data-testid={`text-category-${t.id}`}>{t.categoryPath}</span>
                </div>
              </TableCell>
              <TableCell data-testid={`text-department-${t.id}`}>{t.department}</TableCell>
              <TableCell><PriorityBadge ticket={t} /></TableCell>
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

function TicketDrawer(props: {
  ticket: Ticket | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Status) => void;
}) {
  if (!props.ticket) return null;
  const t = props.ticket;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={props.onClose} data-testid="overlay-ticket" />
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-background/90 backdrop-blur-xl shadow-2xl border-l border-border">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="app-title text-lg font-semibold" data-testid="text-drawer-ticket-id">{t.id}</div>
                  <StatusPill status={t.status} id={`${t.id}-drawer`} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground" data-testid="text-drawer-created">Created {formatDate(t.createdAt)}</div>
              </div>
              <Button variant="secondary" className="rounded-xl" onClick={props.onClose} data-testid="button-close-drawer">
                Close
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-5 py-5">
            <div className="space-y-4">
              <div className="app-surface rounded-2xl p-4">
                <div className="text-xs text-muted-foreground">Subject</div>
                <div className="mt-1 font-medium" data-testid="text-drawer-subject">{t.subject}</div>
                <div className="mt-4 text-xs text-muted-foreground">Description</div>
                <div className="mt-1 text-sm leading-relaxed" data-testid="text-drawer-description">{t.description}</div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="app-surface rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">Vendor</div>
                  <div className="mt-1 font-medium" data-testid="text-drawer-vendor">{t.vendorName ?? t.vendorHandle}</div>
                  <div className="mt-1 text-xs text-muted-foreground" data-testid="text-drawer-vendor-handle">{t.vendorHandle}</div>
                </div>
                <div className="app-surface rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">Department</div>
                  <div className="mt-1 font-medium" data-testid="text-drawer-department">{t.department}</div>
                  <div className="mt-1 text-xs text-muted-foreground" data-testid="text-drawer-issue-type">{t.issueType}</div>
                </div>
              </div>

              <div className="app-surface rounded-2xl p-4">
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="mt-1 text-sm" data-testid="text-drawer-category">{t.categoryPath}</div>
                {t.fleekOrderId ? (
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground">Fleek Order ID</div>
                    <div className="mt-1 font-medium" data-testid="text-drawer-order-id">{t.fleekOrderId}</div>
                  </div>
                ) : null}
              </div>

              <div className="app-surface rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Priority</div>
                    <div className="mt-1">
                      <PriorityBadge ticket={t} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Owner</div>
                    <div className="mt-1 font-medium" data-testid="text-drawer-owner">{t.owner.team}</div>
                  </div>
                </div>
              </div>

              <div className="app-surface rounded-2xl p-4">
                <div className="text-sm font-medium">Update status</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <Button
                      key={s}
                      variant={t.status === s ? "default" : "secondary"}
                      className="rounded-xl"
                      onClick={() => props.onUpdateStatus(t.id, s)}
                      data-testid={`button-set-status-${s}`}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  (In MVP, this just updates the UI — later it would sync back to Zendesk.)
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border px-5 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button variant="secondary" className="rounded-xl" data-testid="button-simulate-slack">
                <Bell className="mr-2 h-4 w-4" />
                Simulate Slack notification
              </Button>
              <Button className="rounded-xl" data-testid="button-add-resolution">
                Add resolution
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateEscalationCard(props: {
  onCreate: (t: Ticket) => void;
  existingTickets: Ticket[];
}) {
  const [vendorHandle, setVendorHandle] = useState("");
  const [vendorSuggestionOpen, setVendorSuggestionOpen] = useState(false);
  const vendorSuggestions = useMemo(() => {
    const q = vendorHandle.trim().toLowerCase();
    if (!q) return [];
    return MOCK_VENDORS.filter((v) => v.handle.toLowerCase().includes(q) || v.name.toLowerCase().includes(q)).slice(0, 6);
  }, [vendorHandle]);

  const [issueType, setIssueType] = useState<IssueType>("Complaint");
  const [department, setDepartment] = useState<Ticket["department"]>("Finance");
  const [categoryPath, setCategoryPath] = useState(CATEGORY_PATHS[0]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");

  const selectedVendor = useMemo(() => {
    const exact = MOCK_VENDORS.find((v) => v.handle === vendorHandle || v.name.toLowerCase() === vendorHandle.toLowerCase());
    return exact ?? null;
  }, [vendorHandle]);

  const issuePriority = useMemo(() => {
    const lower = categoryPath.toLowerCase();
    if (lower.includes("payment")) return 4;
    if (lower.includes("refund")) return 3;
    if (lower.includes("order")) return 2;
    return 1;
  }, [categoryPath]);

  const vendorTicketVolume = useMemo(() => {
    const handle = (selectedVendor?.handle ?? vendorHandle).trim();
    if (!handle) return 1;
    return props.existingTickets.filter((t) => t.vendorHandle === handle).length + 1;
  }, [props.existingTickets, selectedVendor?.handle, vendorHandle]);

  const gmvTier = selectedVendor?.gmvTier ?? ("M" as const);
  const { score, badge } = computePriority({ vendorTicketVolume, vendorGmvTier: gmvTier, issuePriority });

  const canCreate = vendorHandle.trim() && subject.trim() && description.trim() && categoryPath && department && issueType;

  return (
    <Card className="app-surface rounded-2xl" data-testid="card-create-escalation">
      <CardHeader className="pb-3">
        <CardTitle className="app-title text-lg" data-testid="text-create-title">New escalation</CardTitle>
        <div className="text-sm text-muted-foreground" data-testid="text-create-subtitle">
          Create a structured escalation (MVP: stored in UI only).
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
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden" data-testid="menu-vendor-suggestions">
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
                      <div className="text-xs text-muted-foreground">{v.handle} · GMV {v.gmvTier}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Fleek Order ID (optional)</div>
            <Input
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="FLK-…"
              className="rounded-xl"
              data-testid="input-order-id"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Issue type</div>
            <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
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
            <div className="text-sm font-medium">Department</div>
            <Select value={department} onValueChange={(v) => setDepartment(v as Ticket["department"])}>
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
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Problem category</div>
          <Select value={categoryPath} onValueChange={setCategoryPath}>
            <SelectTrigger className="rounded-xl" data-testid="select-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              {CATEGORY_PATHS.map((c) => (
                <SelectItem key={c} value={c} data-testid={`option-category-${c}`}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Ticket subject</div>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" data-testid="input-subject" />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Ticket description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[110px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm app-ring focus-visible:ring-0"
            placeholder="Add context, order details, screenshots links…"
            data-testid="input-description"
          />
        </div>

        <div className="app-surface rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium" data-testid="text-priority-preview">Priority preview</div>
              <div className="mt-1 text-xs text-muted-foreground" data-testid="text-priority-preview-hint">
                Combines vendor volume, vendor size (GMV tier), and issue-type priority.
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", priorityBadgeClass(badge))} data-testid="badge-preview-priority">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {badge} · {score}
                </span>
                <span className="app-chip rounded-full px-2 py-0.5 text-xs text-muted-foreground" data-testid="chip-preview-volume">Volume {vendorTicketVolume}</span>
                <span className="app-chip rounded-full px-2 py-0.5 text-xs text-muted-foreground" data-testid="chip-preview-gmv">GMV {gmvTier}</span>
                <span className="app-chip rounded-full px-2 py-0.5 text-xs text-muted-foreground" data-testid="chip-preview-issue">Issue {issuePriority}</span>
              </div>
            </div>
            <div className="hidden sm:grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
              <Filter className="h-5 w-5 text-foreground/70" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground" data-testid="text-create-required">
            Required: Vendor, Category, Department, Issue type, Subject, Description.\n          </div>
          <Button
            className="rounded-xl"
            disabled={!canCreate}
            onClick={() => {
              const id = `ZND-${Math.floor(10000 + Math.random() * 89999)}`;
              const vendor = selectedVendor;
              const createdAt = new Date().toISOString();
              const { score: s, badge: b } = computePriority({ vendorTicketVolume, vendorGmvTier: gmvTier, issuePriority });
              props.onCreate({
                id,
                createdAt,
                vendorHandle: vendor?.handle ?? vendorHandle.trim(),
                vendorName: vendor?.name,
                department,
                issueType,
                categoryPath,
                subject: subject.trim(),
                description: description.trim(),
                fleekOrderId: orderId.trim() ? orderId.trim() : undefined,
                status: "New",
                priority: {
                  score: s,
                  badge: b,
                  breakdown: { vendorTicketVolume, vendorGmvTier: gmvTier, issuePriority },
                },
                owner: {
                  team: department === "Finance" ? "Finance Ops" : department === "Operations" ? "Ops Control" : department === "Marketplace" ? "Marketplace" : department,
                  assignee: "",
                },
              });
              setSubject("");
              setDescription("");
              setOrderId("");
            }}
            data-testid="button-create-escalation"
          >
            Create escalation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [active, setActive] = useState("all");
  const [tickets, setTickets] = useState<Ticket[]>(() => initialTickets());
  const [drawerTicket, setDrawerTicket] = useState<Ticket | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [department, setDepartment] = useState<Ticket["department"] | "all">("all");
  const [issueType, setIssueType] = useState<IssueType | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter((t) => (status === "all" ? true : t.status === status))
      .filter((t) => (department === "all" ? true : t.department === department))
      .filter((t) => (issueType === "all" ? true : t.issueType === issueType))
      .filter((t) => {
        if (!q) return true;
        return (
          t.id.toLowerCase().includes(q) ||
          t.vendorHandle.toLowerCase().includes(q) ||
          (t.vendorName ?? "").toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.categoryPath.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.priority.score - a.priority.score);
  }, [tickets, search, status, department, issueType]);

  const vendorGroups = useMemo(() => {
    const byVendor = new Map<string, Ticket[]>();
    for (const t of tickets) {
      const k = t.vendorHandle;
      byVendor.set(k, [...(byVendor.get(k) ?? []), t]);
    }
    return Array.from(byVendor.entries())
      .map(([handle, items]) => ({
        handle,
        name: items[0]?.vendorName ?? handle,
        total: items.length,
        open: items.filter((t: Ticket) => t.status === "Open" || t.status === "Pending" || t.status === "New").length,
        topPriority: items.slice().sort((a: Ticket, b: Ticket) => b.priority.score - a.priority.score)[0],
      }))
      .sort((a, b) => b.open - a.open);
  }, [tickets]);

  const issueGroups = useMemo(() => {
    const byIssue = new Map<IssueType, Ticket[]>();
    for (const t of tickets) {
      byIssue.set(t.issueType, [...(byIssue.get(t.issueType) ?? []), t]);
    }
    return ISSUE_TYPES.map((k) => ({
      type: k,
      total: (byIssue.get(k) ?? []).length,
      open: (byIssue.get(k) ?? []).filter((t) => t.status === "Open" || t.status === "Pending" || t.status === "New").length,
      top: (byIssue.get(k) ?? []).slice().sort((a, b) => b.priority.score - a.priority.score)[0],
    }));
  }, [tickets]);

  const summary = useMemo(() => {
    const total = tickets.length;
    const byStatus = STATUS_OPTIONS.map((s) => ({ name: s, value: tickets.filter((t) => t.status === s).length }));
    const byDept = DEPARTMENTS.map((d) => ({ name: d, value: tickets.filter((t) => t.department === d).length }));
    const byIssue = ISSUE_TYPES.map((i) => ({ name: i, value: tickets.filter((t) => t.issueType === i).length }));
    return { total, byStatus, byDept, byIssue };
  }, [tickets]);

  return (
    <AppShell>
      <div className="space-y-4">
        <TopBar active={active} onNavigate={setActive} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
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

                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                      setDepartment("all");
                      setIssueType("all");
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <KpiTile
                    label="Open workload"
                    value={String(tickets.filter((t) => t.status === "Open" || t.status === "Pending" || t.status === "New").length)}
                    hint="New + Open + Pending"
                    icon={<LayoutGrid className="h-5 w-5 text-foreground/70" />}
                    testId="kpi-open-workload"
                  />
                  <KpiTile
                    label="Highest priority"
                    value={tickets.slice().sort((a, b) => b.priority.score - a.priority.score)[0]?.priority.badge ?? "—"}
                    hint="Across all tickets"
                    icon={<AlertTriangle className="h-5 w-5 text-foreground/70" />}
                    testId="kpi-highest-priority"
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
                  onOpen={(t) => setDrawerTicket(t)}
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
                            onClick={() => setDrawerTicket(v.topPriority)}
                            data-testid={`button-vendor-open-top-${v.handle}`}
                          >
                            {v.topPriority.priority.badge} · {v.topPriority.priority.score}
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
                            onClick={() => setDrawerTicket(g.top)}
                            data-testid={`button-issue-open-top-${g.type}`}
                          >
                            {g.top.priority.badge} · {g.top.priority.score}
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
                              <Cell
                                key={idx}
                                fill={["#7c3aed", "#2563eb", "#d97706", "#059669", "#71717a"][idx % 5]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
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

                  <div className="app-surface rounded-2xl p-4 lg:col-span-2" data-testid="chart-issue">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">By issue type</div>
                        <div className="text-xs text-muted-foreground">Complaints vs requests vs information</div>
                      </div>
                    </div>
                    <div className="mt-4 h-[220px]">
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
          </div>

          <div className="lg:col-span-4 space-y-4">
            <CreateEscalationCard
              existingTickets={tickets}
              onCreate={(t) => {
                setTickets((prev) => [t, ...prev]);
                setActive("all");
              }}
            />

            <div className="app-surface rounded-2xl p-4" data-testid="card-slack-preview">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="app-title text-lg font-semibold">Slack notifications</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    In production, escalations would ping the right channel automatically.
                  </div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary/70 ring-1 ring-border/60">
                  <Bell className="h-5 w-5 text-foreground/70" />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2" data-testid="text-slack-sample-1">
                  <span className="font-medium">#seller-escalations</span> · New escalation <span className="font-medium">P1</span> for <span className="font-medium">Fleek Moda</span> — “Payout not received for last cycle”
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2" data-testid="text-slack-sample-2">
                  <span className="font-medium">#finance-ops</span> · Escalated: <span className="font-medium">Payment {">"} Payout Not Received</span> — ZND-18402
                </div>
              </div>
            </div>
          </div>
        </div>

        <TicketDrawer
          ticket={drawerTicket}
          onClose={() => setDrawerTicket(null)}
          onUpdateStatus={(id, s) => {
            setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: s } : t)));
            setDrawerTicket((prev) => (prev?.id === id ? { ...prev, status: s } : prev));
          }}
        />
      </div>
    </AppShell>
  );
}
