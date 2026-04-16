import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, ChevronLeft, ChevronRight, CalendarDays, Loader2,
  Plus, Search, X, BarChart2, Calendar, Trash2, Users, ChevronDown,
  ChevronUp, Settings, Building2, Clock, LayoutGrid,
} from "lucide-react";
import { cn, formatDateShort } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

// ── Constants ─────────────────────────────────────────────────────────────────
const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_PX = 48;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_PX;
const SCROLL_TO_HOUR = 7;

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; solid: string; dot: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-900",    border: "border-blue-200",    solid: "border-blue-500",    dot: "bg-blue-500"    },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-200", solid: "border-emerald-500", dot: "bg-emerald-500" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-900",  border: "border-violet-200",  solid: "border-violet-500",  dot: "bg-violet-500"  },
  orange:  { bg: "bg-orange-50",  text: "text-orange-900",  border: "border-orange-200",  solid: "border-orange-500",  dot: "bg-orange-500"  },
  pink:    { bg: "bg-pink-50",    text: "text-pink-900",    border: "border-pink-200",    solid: "border-pink-500",    dot: "bg-pink-500"    },
  teal:    { bg: "bg-teal-50",    text: "text-teal-900",    border: "border-teal-200",    solid: "border-teal-500",    dot: "bg-teal-500"    },
  amber:   { bg: "bg-amber-50",   text: "text-amber-900",   border: "border-amber-200",   solid: "border-amber-500",   dot: "bg-amber-500"   },
  red:     { bg: "bg-red-50",     text: "text-red-900",     border: "border-red-200",     solid: "border-red-500",     dot: "bg-red-500"     },
};
const COLOR_KEYS = Object.keys(COLOR_MAP);
const MC = COLOR_KEYS.map(k => COLOR_MAP[k]);

const ROLE_ORDER: Record<string, number> = {
  Owner: 0, Admin: 1, Head: 2, Manager: 3, Lead: 4, Associate: 5, Agent: 6,
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShiftConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  isActive: boolean;
}
interface ShiftRow {
  id: string;
  userId: string;
  date: string;
  shiftType: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  slotType: "shift" | "frt" | null;
  userName: string;
  userDepartment: string;
}
interface OverlayEvent {
  userId: string;
  date: string;
  type: "leave" | "wfh";
  label: string;
  userName: string;
}
interface LayoutEvent {
  shift: ShiftRow;
  topPx: number;
  heightPx: number;
  laneIdx: number;
  laneCount: number;
  colorIdx: number;
}
interface CellDialogState { userId: string; date: string; }
interface FrtSlot { startTime: string; endTime: string; }
interface BulkForm {
  memberIds: string[];
  startDate: string;
  endDate: string;
  shiftConfigId: string;
  startTime: string;
  endTime: string;
  notes: string;
  slotType: "shift" | "frt";
  frtSlots: FrtSlot[];
  excludeWeekends: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDateStr(d: Date): string { return d.toISOString().split("T")[0]; }
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getWeekStart(d: Date): Date {
  const c = new Date(d); const dow = c.getDay();
  c.setDate(c.getDate() - (dow === 0 ? 6 : dow - 1)); c.setHours(0, 0, 0, 0); return c;
}
function getWeekDates(ws: Date): Date[] { return Array.from({ length: 7 }, (_, i) => addDays(ws, i)); }
function getMonthWeeks(cursor: Date): Date[][] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const dow0 = first.getDay();
  const start = addDays(first, -(dow0 === 0 ? 6 : dow0 - 1));
  const dow1 = last.getDay();
  const end = addDays(last, dow1 === 0 ? 0 : 7 - dow1);
  const weeks: Date[][] = [];
  let cur = start;
  while (cur <= end) { weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i))); cur = addDays(cur, 7); }
  return weeks;
}
function timeToMinutes(t: string): number {
  if (!t) return 0; const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0);
}
function topPxForTime(t: string): number { return (timeToMinutes(t) / 60) * HOUR_PX; }
function heightPxForRange(s: string, e: string): number {
  let mins = timeToMinutes(e) - timeToMinutes(s);
  if (mins <= 0) mins += 24 * 60;
  return Math.max(mins / 60 * HOUR_PX, 22);
}
function fmt12(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function layoutDay(shifts: ShiftRow[], colorMap: Record<string, number>): LayoutEvent[] {
  const valid = shifts.filter(s => s.startTime && s.endTime && s.shiftType !== "off");
  const sorted = [...valid].sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!));
  const lanes: number[] = [];
  const result: LayoutEvent[] = sorted.map(s => {
    const top = topPxForTime(s.startTime!);
    const h = heightPxForRange(s.startTime!, s.endTime!);
    let lane = lanes.findIndex(b => b <= top + 2);
    if (lane === -1) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = top + h;
    return { shift: s, topPx: top, heightPx: h, laneIdx: lane, laneCount: 1, colorIdx: colorMap[s.userId] ?? 0 };
  });
  result.forEach(ev => { ev.laneCount = lanes.length || 1; });
  return result;
}
function getHeaders(): Record<string, string> {
  const email = localStorage.getItem("userEmail") || "";
  return { "Content-Type": "application/json", ...(email ? { "x-user-email": email } : {}) };
}
function getColorCfg(color: string) { return COLOR_MAP[color] ?? COLOR_MAP.blue; }

// ── Roster Cell ───────────────────────────────────────────────────────────────
function RosterCell({
  shifts, overlays, isManager, shiftConfigs, isToday, isWeekend, onAdd, onDelete,
}: {
  shifts: ShiftRow[];
  overlays: OverlayEvent[];
  isManager: boolean;
  shiftConfigs: ShiftConfig[];
  isToday: boolean;
  isWeekend: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const hasContent = shifts.length > 0 || overlays.length > 0;
  return (
    <div
      className={cn(
        "relative min-h-[60px] p-1 border-r border-border/30 transition-colors group",
        isToday && "bg-primary/[0.04]",
        isWeekend && !isToday && "bg-muted/30",
        !hasContent && isManager && "cursor-pointer hover:bg-muted/30",
      )}
      onClick={() => !hasContent && isManager && onAdd()}
    >
      {overlays.map((o, i) => (
        <div key={i} className={cn(
          "rounded text-[9px] font-medium px-1.5 py-0.5 mb-0.5 truncate leading-tight",
          o.type === "leave" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        )}>
          {o.type === "leave" ? "🏖 Leave" : "🏠 WFH"}
        </div>
      ))}
      {shifts.map(s => {
        const config = shiftConfigs.find(c => c.id === s.shiftType);
        const cc = config ? getColorCfg(config.color) : COLOR_MAP.blue;
        const isFrt = s.slotType === "frt";
        return (
          <div key={s.id}
            className={cn(
              "flex items-start justify-between rounded text-[9px] font-medium px-1.5 py-0.5 mb-0.5 cursor-pointer group/chip",
              isFrt
                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-400"
                : cn(cc.bg, cc.text, cc.border, "border hover:opacity-90"),
            )}
            onClick={e => { e.stopPropagation(); onAdd(); }}
          >
            <span className="leading-tight">
              <span className="block">{isFrt ? "⚡ FRT" : (config?.name || s.shiftType)}</span>
              {s.startTime && <span className="opacity-60 text-[8px]">{fmt12(s.startTime)}</span>}
            </span>
            {isManager && (
              <button
                className="ml-0.5 shrink-0 opacity-0 group-hover/chip:opacity-100 hover:text-red-500 transition-opacity mt-0.5"
                onClick={e => { e.stopPropagation(); onDelete(s.id); }}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        );
      })}
      {hasContent && isManager && (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground"
          onClick={e => { e.stopPropagation(); onAdd(); }}
        >
          <Plus className="h-2.5 w-2.5" />
        </button>
      )}
      {!hasContent && isManager && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Plus className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}

// CX departments (matches analytics page definition)
const CX_DEPTS = ["Customer Support", "Seller Support"] as const;

// ── Roster Grid ───────────────────────────────────────────────────────────────
function RosterGrid({
  weekDates, members, allShifts, overlays, shiftConfigs,
  isManager, todayStr, colorMap, onCellClick, onDelete,
}: {
  weekDates: Date[];
  members: UserType[];
  allShifts: ShiftRow[];
  overlays: OverlayEvent[];
  shiftConfigs: ShiftConfig[];
  isManager: boolean;
  todayStr: string;
  colorMap: Record<string, number>;
  onCellClick: (userId: string, date: string) => void;
  onDelete: (id: string) => void;
}) {
  const shiftIdx = useMemo(() => {
    const m: Record<string, ShiftRow[]> = {};
    for (const s of allShifts) {
      const k = `${s.userId}::${s.date}`;
      if (!m[k]) m[k] = [];
      m[k].push(s);
    }
    return m;
  }, [allShifts]);

  const overlayIdx = useMemo(() => {
    const m: Record<string, OverlayEvent[]> = {};
    for (const o of overlays) {
      const k = `${o.userId}::${o.date}`;
      if (!m[k]) m[k] = [];
      m[k].push(o);
    }
    return m;
  }, [overlays]);

  // Split members into CX and Internal
  const cxMembers       = useMemo(() => members.filter(m => CX_DEPTS.includes(m.department as any)), [members]);
  const internalMembers = useMemo(() => members.filter(m => !CX_DEPTS.includes(m.department as any)), [members]);

  // Internal departments (sorted)
  const internalDepts = useMemo(() =>
    [...new Set(internalMembers.map(m => m.department).filter(Boolean))].sort(), [internalMembers]);

  if (members.length === 0) {
    return (
      <div className="border rounded-xl p-12 text-center text-muted-foreground bg-card">
        No members match the current filter.
      </div>
    );
  }

  // Coverage row for a given member subset
  function CoverageRow({ subset }: { subset: UserType[] }) {
    if (subset.length === 0) return null;
    return (
      <div className="flex border-t border-border/40 bg-muted/10 min-w-[720px]">
        <div className="w-44 shrink-0 flex items-center px-3 py-1.5 border-r border-border/30">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Coverage</span>
        </div>
        {weekDates.map(d => {
          const ds = toDateStr(d);
          const scheduled = subset.filter(m => (shiftIdx[`${m.id}::${ds}`]?.length ?? 0) > 0).length;
          const total = subset.length;
          const pct = total === 0 ? 1 : scheduled / total;
          const [textC, barC] = pct >= 1
            ? ["text-green-600", "bg-green-500"]
            : pct >= 0.5
            ? ["text-amber-600", "bg-amber-500"]
            : ["text-red-600", "bg-red-500"];
          return (
            <div key={ds} className="flex-1 min-w-[80px] flex flex-col items-center justify-center py-1.5 border-r border-border/30 last:border-r-0">
              <span className={cn("text-[10px] font-bold tabular-nums", textC)}>{scheduled}/{total}</span>
              <div className="w-8 mt-0.5 h-1 rounded-full bg-border/40 overflow-hidden">
                <div className={cn("h-full rounded-full", barC)} style={{ width: `${Math.round(pct * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const dayHeaders = (
    <div className="flex border-b bg-muted/30 sticky top-0 z-10 min-w-[720px]">
      <div className="w-44 shrink-0 px-3 py-2.5 border-r border-border/40 flex items-end">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
      </div>
      {weekDates.map(d => {
        const ds = toDateStr(d);
        const isToday = ds === todayStr;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        return (
          <div key={ds} className={cn(
            "flex-1 text-center py-2 border-r border-border/40 last:border-r-0 min-w-[80px]",
            isToday && "bg-primary/5",
            isWeekend && !isToday && "bg-muted/20",
          )}>
            <div className={cn("text-[9px] font-semibold uppercase tracking-wide",
              isWeekend ? "text-muted-foreground/50" : "text-muted-foreground")}>
              {d.toLocaleDateString("en-GB", { weekday: "short" })}
            </div>
            <div className={cn("text-lg font-bold",
              isToday ? "text-primary" : isWeekend ? "text-muted-foreground/60" : "text-foreground")}>
              {d.getDate()}
            </div>
            <div className="text-[9px] text-muted-foreground/50">
              {d.toLocaleDateString("en-GB", { month: "short" })}
            </div>
          </div>
        );
      })}
    </div>
  );

  function renderMemberRow(member: UserType, ri: number) {
    const ci = (colorMap[member.id] ?? ri) % MC.length;
    const hasAnyShift = weekDates.some(d => (shiftIdx[`${member.id}::${toDateStr(d)}`]?.length ?? 0) > 0);
    const hasLeaveThisWeek = weekDates.some(d =>
      (overlayIdx[`${member.id}::${toDateStr(d)}`] ?? []).some(o => o.type === "leave")
    );
    return (
      <div key={member.id} className={cn(
        "flex border-b border-border/20 transition-colors hover:bg-muted/5 min-w-[720px]",
        !hasAnyShift && !hasLeaveThisWeek && "opacity-60",
      )}>
        <div className="w-44 shrink-0 flex items-center gap-2 px-3 py-2 border-r border-border/30">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className={cn("text-[10px] text-white", MC[ci].dot)}>
              {member.name.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate leading-tight">{member.name}</p>
            <p className="text-[9px] text-muted-foreground truncate">{member.department}</p>
          </div>
          {!hasAnyShift && !hasLeaveThisWeek && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 ml-auto" title="Not scheduled" />
          )}
        </div>
        {weekDates.map(d => {
          const ds = toDateStr(d);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div key={ds} className="flex-1 min-w-[80px]">
              <RosterCell
                shifts={shiftIdx[`${member.id}::${ds}`] || []}
                overlays={overlayIdx[`${member.id}::${ds}`] || []}
                isManager={isManager}
                shiftConfigs={shiftConfigs}
                isToday={ds === todayStr}
                isWeekend={isWeekend}
                onAdd={() => onCellClick(member.id, ds)}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Section header (CX or Internal)
  function SectionHeader({ label, description, count, accent }: {
    label: string; description: string; count: number; accent: string;
  }) {
    return (
      <div className={cn("flex items-center gap-3 px-4 py-2.5 border-b border-border/40 min-w-[720px]", accent)}>
        <div className="flex-1">
          <p className="text-xs font-bold text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="text-[10px] px-2">{count} member{count !== 1 ? "s" : ""}</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Section 1: CX Teams ── */}
      {cxMembers.length > 0 && (
        <div className="border rounded-xl overflow-auto bg-card">
          {dayHeaders}
          <SectionHeader
            label="Customer Experience (CX) Teams"
            description="Customer Support · Seller Support"
            count={cxMembers.length}
            accent="bg-blue-50/60"
          />
          {/* CX sub-departments */}
          {CX_DEPTS.map(dept => {
            const deptMembers = cxMembers.filter(m => m.department === dept);
            if (deptMembers.length === 0) return null;
            return (
              <div key={dept}>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50/40 border-b border-border/20 min-w-[720px]">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">{dept}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto">{deptMembers.length}</span>
                </div>
                {deptMembers.map((m, ri) => renderMemberRow(m, ri))}
              </div>
            );
          })}
          <CoverageRow subset={cxMembers} />
        </div>
      )}

      {/* ── Section 2: Internal Departments ── */}
      {internalMembers.length > 0 && (
        <div className="border rounded-xl overflow-auto bg-card">
          {dayHeaders}
          <SectionHeader
            label="Internal Departments"
            description={internalDepts.join(" · ") || "All other departments"}
            count={internalMembers.length}
            accent="bg-muted/30"
          />
          {internalDepts.map(dept => {
            const deptMembers = internalMembers.filter(m => m.department === dept);
            if (deptMembers.length === 0) return null;
            return (
              <div key={dept}>
                <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 border-b border-border/20 min-w-[720px]">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{dept}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto">{deptMembers.length}</span>
                </div>
                {deptMembers.map((m, ri) => renderMemberRow(m, ri))}
              </div>
            );
          })}
          {/* ungrouped internal members */}
          {internalMembers.filter(m => !internalDepts.includes(m.department || "")).map((m, ri) => renderMemberRow(m, ri))}
          <CoverageRow subset={internalMembers} />
        </div>
      )}
    </div>
  );
}

// ── Timeline grid primitives (used by Timeline tab) ───────────────────────────
function HourLines() {
  return (
    <>
      {Array.from({ length: TOTAL_HOURS }, (_, i) => (
        <div key={i} className={cn("absolute w-full border-t", i === 0 ? "border-border/0" : "border-border/20")}
          style={{ top: i * HOUR_PX }} />
      ))}
    </>
  );
}
function TimeAxis() {
  return (
    <div className="relative shrink-0 w-14 border-r border-border/40 bg-muted/20" style={{ height: GRID_HEIGHT }}>
      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
        const h = START_HOUR + i;
        if (h > 23) return null;
        return (
          <div key={h} className="absolute right-2 text-[10px] text-muted-foreground tabular-nums leading-none"
            style={{ top: i * HOUR_PX - 6 }}>
            {String(h).padStart(2, "0")}:00
          </div>
        );
      })}
    </div>
  );
}
function ScrollGrid({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = SCROLL_TO_HOUR * HOUR_PX; }, []);
  return <div ref={ref} className="overflow-y-auto" style={{ maxHeight: 560 }}>{children}</div>;
}
function EventBlock({ ev, onDelete, isManager, shiftConfigs }: {
  ev: LayoutEvent; onDelete: () => void; isManager: boolean; shiftConfigs: ShiftConfig[];
}) {
  const ci = ev.colorIdx % MC.length;
  const cfg = MC[ci];
  const isFrt = ev.shift.slotType === "frt";
  const gap = 2;
  const style = {
    top: ev.topPx, height: ev.heightPx,
    left: `calc(${(ev.laneIdx / ev.laneCount) * 100}% + ${gap}px)`,
    width: `calc(${(1 / ev.laneCount) * 100}% - ${gap * 2}px)`,
  };
  const configMatch = shiftConfigs.find(c => c.id === ev.shift.shiftType || c.name.toLowerCase() === ev.shift.shiftType);
  const cc = configMatch ? getColorCfg(configMatch.color) : null;
  const displayBg = cc?.bg ?? cfg.bg;
  const displayText = cc?.text ?? cfg.text;
  const displayBorder = cc?.border ?? cfg.border;
  const displaySolid = cc?.solid ?? cfg.solid;

  if (isFrt) {
    return (
      <div className={cn("absolute rounded-md border-l-[3px] border border-border/40 bg-white px-1.5 py-1 overflow-hidden group cursor-default", displaySolid)} style={style}>
        <div className="absolute top-0.5 right-0.5 text-[8px] bg-amber-100 text-amber-700 rounded px-1 font-bold leading-4">FRT</div>
        <div className={cn("font-semibold truncate leading-tight text-[10px]", displayText)}>{ev.shift.userName.split(" ")[0]}</div>
        {ev.heightPx > 28 && <div className={cn("text-[9px] opacity-75 truncate", displayText)}>{fmt12(ev.shift.startTime!)}–{fmt12(ev.shift.endTime!)}</div>}
        {isManager && (
          <button className="absolute bottom-0.5 right-0.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-gray-400 hover:text-red-500"
            onClick={e => { e.stopPropagation(); onDelete(); }}><X className="h-2.5 w-2.5" /></button>
        )}
      </div>
    );
  }
  return (
    <div className={cn("absolute rounded-md border text-[10px] px-1.5 py-1 overflow-hidden group cursor-default", displayBg, displayText, displayBorder)} style={style}>
      <div className="font-semibold truncate leading-tight">{ev.shift.userName.split(" ")[0]}</div>
      {ev.heightPx > 28 && <div className="opacity-70 truncate">{fmt12(ev.shift.startTime!)}–{fmt12(ev.shift.endTime!)}</div>}
      {isManager && (
        <button className="absolute top-0.5 right-0.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-white/80 text-gray-400 hover:text-red-500"
          onClick={e => { e.stopPropagation(); onDelete(); }}><X className="h-2.5 w-2.5" /></button>
      )}
    </div>
  );
}

// ── Timeline Week View ────────────────────────────────────────────────────────
function WeekCalendar({ weekDates, allShifts, colorMap, isManager, todayStr, onAddSlot, onDelete, shiftConfigs }: {
  weekDates: Date[]; allShifts: ShiftRow[]; colorMap: Record<string, number>;
  isManager: boolean; todayStr: string;
  onAddSlot: (ds: string) => void; onDelete: (id: string) => void; shiftConfigs: ShiftConfig[];
}) {
  const eventsByDay = useMemo(() => {
    const m: Record<string, ShiftRow[]> = {};
    for (const s of allShifts) { if (!m[s.date]) m[s.date] = []; m[s.date].push(s); }
    return m;
  }, [allShifts]);
  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <div className="flex border-b bg-muted/30">
        <div className="w-14 shrink-0" />
        {weekDates.map(d => {
          const ds = toDateStr(d); const isToday = ds === todayStr;
          return (
            <div key={ds} className={cn("flex-1 text-center py-3 border-l border-border/40", isToday && "bg-primary/5")}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{d.toLocaleDateString("en-GB", { weekday: "short" })}</div>
              <div className={cn("text-xl font-bold mt-0.5", isToday ? "text-primary" : "text-foreground")}>{d.getDate()}</div>
              <div className="text-[10px] text-muted-foreground">{d.toLocaleDateString("en-GB", { month: "short" })}</div>
            </div>
          );
        })}
      </div>
      <ScrollGrid>
        <div className="flex">
          <TimeAxis />
          {weekDates.map(d => {
            const ds = toDateStr(d); const isToday = ds === todayStr;
            const laid = layoutDay(eventsByDay[ds] || [], colorMap);
            return (
              <div key={ds} className={cn("flex-1 relative border-l border-border/40 cursor-pointer", isToday && "bg-primary/[0.02]")}
                style={{ height: GRID_HEIGHT }} onClick={() => isManager && onAddSlot(ds)}>
                <HourLines />
                {laid.map(ev => <EventBlock key={ev.shift.id} ev={ev} onDelete={() => onDelete(ev.shift.id)} isManager={isManager} shiftConfigs={shiftConfigs} />)}
              </div>
            );
          })}
        </div>
      </ScrollGrid>
    </div>
  );
}

// ── Timeline Month View ───────────────────────────────────────────────────────
function MonthCalendar({ cursor, allShifts, colorMap, isManager, todayStr, onClickDay }: {
  cursor: Date; allShifts: ShiftRow[]; colorMap: Record<string, number>;
  isManager: boolean; todayStr: string; onClickDay: (ds: string) => void;
}) {
  const weeks = getMonthWeeks(cursor);
  const shiftsByDay = useMemo(() => {
    const m: Record<string, ShiftRow[]> = {};
    for (const s of allShifts) { if (!m[s.date]) m[s.date] = []; m[s.date].push(s); }
    return m;
  }, [allShifts]);
  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="text-center py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-r last:border-r-0">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
          {week.map(d => {
            const ds = toDateStr(d);
            const isThisMonth = d.getMonth() === cursor.getMonth();
            const isToday = ds === todayStr;
            const dayShifts = shiftsByDay[ds] || [];
            return (
              <div key={ds} className={cn("min-h-[90px] p-2 border-r last:border-r-0 cursor-pointer hover:bg-muted/20 transition-colors",
                !isThisMonth && "bg-muted/10 opacity-50", isToday && "bg-primary/5")}
                onClick={() => onClickDay(ds)}>
                <div className={cn("text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground")}>{d.getDate()}</div>
                {dayShifts.slice(0, 3).map(s => {
                  const ci = (colorMap[s.userId] ?? 0) % MC.length;
                  const isFrt = s.slotType === "frt";
                  return (
                    <div key={s.id} className={cn("text-[9px] rounded px-1 py-0.5 mb-0.5 truncate font-medium",
                      isFrt ? "bg-amber-50 text-amber-700 border border-amber-200" : cn(MC[ci].bg, MC[ci].text))}>
                      {isFrt ? "FRT" : s.userName.split(" ")[0]}{s.startTime ? ` ${fmt12(s.startTime)}` : ""}
                    </div>
                  );
                })}
                {dayShifts.length > 3 && <div className="text-[9px] text-muted-foreground">+{dayShifts.length - 3}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Quick Assign Dialog ───────────────────────────────────────────────────────
function QuickAssignDialog({
  userId, date, existingShifts, members, shiftConfigs, overlays,
  onSave, onDelete, onClose, isSaving, isDeleting,
}: {
  userId: string; date: string; existingShifts: ShiftRow[];
  members: UserType[]; shiftConfigs: ShiftConfig[]; overlays: OverlayEvent[];
  onSave: (d: any) => void; onDelete: (id: string) => void;
  onClose: () => void; isSaving: boolean; isDeleting: boolean;
}) {
  const [selUserId, setSelUserId] = useState(userId);
  const [mode, setMode] = useState<"shift" | "frt" | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState(shiftConfigs[0]?.id ?? "");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  const member = members.find(m => m.id === selUserId);
  const memberOverlays = overlays.filter(o => o.userId === selUserId && o.date === date);
  const memberShifts = existingShifts.filter(s => !selUserId || s.userId === selUserId);

  const d = new Date(date + "T12:00:00");
  const dateLabel = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  function handleConfigSelect(id: string) {
    const cfg = shiftConfigs.find(c => c.id === id);
    setSelectedConfigId(id);
    if (cfg) { setCustomStart(cfg.startTime); setCustomEnd(cfg.endTime); }
    setMode("shift");
    setShowOverride(false);
  }
  function handleFrtSelect() {
    setMode("frt");
    setCustomStart("09:00");
    setCustomEnd("13:00");
    setShowOverride(true);
  }
  function handleSave() {
    onSave({ userId: selUserId, date, shiftType: mode === "frt" ? "frt" : (selectedConfigId || "custom"), startTime: customStart, endTime: customEnd, notes, slotType: mode });
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{member?.name ?? "Assign Shift"}</DialogTitle>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {!userId && (
            <div className="space-y-1.5">
              <Label className="text-xs">Team Member</Label>
              <Select value={selUserId} onValueChange={setSelUserId}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {memberOverlays.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {memberOverlays.map((o, i) => (
                <span key={i} className={cn("text-xs rounded-full px-2.5 py-0.5 font-medium",
                  o.type === "leave" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                  {o.type === "leave" ? "🏖 On Leave" : "🏠 WFH"}
                </span>
              ))}
            </div>
          )}
          {memberShifts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Current Schedule</p>
              {memberShifts.map(s => {
                const cfg = shiftConfigs.find(c => c.id === s.shiftType);
                const cc = cfg ? getColorCfg(cfg.color) : COLOR_MAP.blue;
                const isFrt = s.slotType === "frt";
                return (
                  <div key={s.id} className={cn("flex items-center justify-between rounded-lg px-3 py-2 border text-sm",
                    isFrt ? "bg-amber-50 border-amber-200 text-amber-800" : cn(cc.bg, cc.border, cc.text))}>
                    <span className="font-medium">
                      {isFrt ? "⚡ FRT" : (cfg?.name || s.shiftType)}
                      {s.startTime ? ` · ${fmt12(s.startTime)}–${fmt12(s.endTime!)}` : ""}
                    </span>
                    <button onClick={() => onDelete(s.id)} disabled={isDeleting}
                      className="text-muted-foreground hover:text-red-500 ml-2 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {memberShifts.length > 0 ? "Add Slot" : "Assign Shift"}
            </p>
            {shiftConfigs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic border rounded-lg p-3 bg-muted/20">
                No shift types configured. Ask an admin to add shifts via "Manage Shifts".
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {shiftConfigs.map(c => {
                  const cc = getColorCfg(c.color);
                  const isSelected = selectedConfigId === c.id && mode === "shift";
                  return (
                    <button key={c.id} onClick={() => handleConfigSelect(c.id)}
                      className={cn("rounded-lg border p-2.5 text-left transition-all",
                        isSelected ? cn("border-2", cc.bg, cc.text, cc.solid) : "border-border hover:bg-muted/50")}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", cc.dot)} />
                        <span className="text-sm font-semibold leading-tight">{c.name}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5 ml-3.5">{fmt12(c.startTime)}–{fmt12(c.endTime)}</p>
                    </button>
                  );
                })}
                <button onClick={handleFrtSelect}
                  className={cn("rounded-lg border p-2.5 text-left transition-all",
                    mode === "frt" ? "border-2 border-amber-400 bg-amber-50 text-amber-800" : "border-border hover:bg-muted/50")}>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm font-semibold leading-tight">FRT Slot</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5 ml-3.5">First response time</p>
                </button>
              </div>
            )}
          </div>
          {mode && (
            <div>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
                onClick={() => setShowOverride(v => !v)}>
                <Clock className="h-3 w-3" />
                Override times
                {showOverride ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showOverride && (
                <div className="rounded-lg border border-border/60 p-3 bg-muted/20 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Start</Label>
                      <Input type="time" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End</Label>
                      <Input type="time" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="h-8 text-sm" />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button className="flex-1" disabled={isSaving || !mode || !selUserId || !customStart || !customEnd} onClick={handleSave}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Schedule Dialog (simplified) ────────────────────────────────────────
function BulkAddDialog({ members, shiftConfigs, onClose, onSubmit, isSubmitting }: {
  members: UserType[]; shiftConfigs: ShiftConfig[];
  onClose: () => void; onSubmit: (f: BulkForm) => void; isSubmitting: boolean;
}) {
  const today = toDateStr(new Date());
  const departments = useMemo(() => [...new Set(members.map(m => m.department).filter(Boolean))].sort(), [members]);
  const [form, setForm] = useState<BulkForm>({
    memberIds: members.map(m => m.id),
    startDate: today, endDate: today,
    shiftConfigId: shiftConfigs[0]?.id ?? "",
    startTime: shiftConfigs[0]?.startTime ?? "09:00",
    endTime: shiftConfigs[0]?.endTime ?? "17:00",
    notes: "", slotType: "shift",
    frtSlots: [{ startTime: "09:00", endTime: "13:00" }, { startTime: "13:00", endTime: "17:00" }],
    excludeWeekends: true,
  });
  const [search, setSearch] = useState("");
  const [activeDept, setActiveDept] = useState("all");
  function upd(p: Partial<BulkForm>) { setForm(f => ({ ...f, ...p })); }
  function onConfigSelect(id: string) {
    const cfg = shiftConfigs.find(c => c.id === id);
    upd({ shiftConfigId: id, slotType: "shift", startTime: cfg?.startTime ?? form.startTime, endTime: cfg?.endTime ?? form.endTime });
  }
  function selectDept(dept: string) {
    setActiveDept(dept);
    upd({ memberIds: dept === "all" ? members.map(m => m.id) : members.filter(m => m.department === dept).map(m => m.id) });
  }
  function toggle(id: string) {
    upd({ memberIds: form.memberIds.includes(id) ? form.memberIds.filter(x => x !== id) : [...form.memberIds, id] });
  }
  function addFrtSlot() { upd({ frtSlots: [...form.frtSlots, { startTime: "17:00", endTime: "21:00" }] }); }
  function removeFrtSlot(i: number) { upd({ frtSlots: form.frtSlots.filter((_, idx) => idx !== i) }); }
  function updFrtSlot(i: number, k: "startTime" | "endTime", v: string) {
    const s = [...form.frtSlots]; s[i] = { ...s[i], [k]: v }; upd({ frtSlots: s });
  }
  const workDays = useMemo(() => {
    let c = 0;
    for (let d = new Date(form.startDate); d <= new Date(form.endDate); d.setDate(d.getDate() + 1)) {
      const dw = d.getDay(); if (!form.excludeWeekends || (dw !== 0 && dw !== 6)) c++;
    }
    return c;
  }, [form.startDate, form.endDate, form.excludeWeekends]);
  const slotsPerMember = form.slotType === "frt" ? form.frtSlots.length : 1;
  const total = workDays * form.memberIds.length * slotsPerMember;
  const filteredMembers = members.filter(m =>
    (activeDept === "all" || m.department === activeDept) &&
    (!search || m.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Bulk Schedule
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-1">

          {/* 1. When */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">When</p>
            <div className="flex items-center gap-2">
              <Input type="date" value={form.startDate} onChange={e => upd({ startDate: e.target.value })} className="text-sm flex-1" />
              <span className="text-muted-foreground">→</span>
              <Input type="date" value={form.endDate} onChange={e => upd({ endDate: e.target.value })} className="text-sm flex-1" />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.excludeWeekends} onCheckedChange={v => upd({ excludeWeekends: v })} />
                <span className="text-sm">Skip weekends</span>
              </div>
              <Badge variant="secondary">{workDays} day{workDays !== 1 ? "s" : ""}</Badge>
            </div>
          </div>

          {/* 2. Shift */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Shift Type</p>
            {shiftConfigs.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {shiftConfigs.map(c => {
                  const cc = getColorCfg(c.color);
                  const isSelected = form.shiftConfigId === c.id && form.slotType === "shift";
                  return (
                    <button key={c.id} onClick={() => onConfigSelect(c.id)}
                      className={cn("rounded-lg border p-2.5 text-left transition-all",
                        isSelected ? cn("border-2", cc.bg, cc.text, cc.solid) : "border-border hover:bg-muted/50")}>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", cc.dot)} />
                        <span className="text-sm font-semibold">{c.name}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground ml-3.5">{fmt12(c.startTime)}–{fmt12(c.endTime)}</p>
                    </button>
                  );
                })}
                <button onClick={() => upd({ slotType: "frt", shiftConfigId: "" })}
                  className={cn("rounded-lg border p-2.5 text-left transition-all",
                    form.slotType === "frt" ? "border-2 border-amber-400 bg-amber-50 text-amber-800" : "border-border hover:bg-muted/50")}>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-sm font-semibold">FRT Slot</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground ml-3.5">First response time</p>
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic border rounded-lg p-3 bg-muted/20">
                No shift types configured. Use "Manage Shifts" to create shift types first.
              </p>
            )}
            {form.slotType === "frt" && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">FRT Time Slots</p>
                  <button onClick={addFrtSlot} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    <Plus className="h-3 w-3" /> Add Slot
                  </button>
                </div>
                {form.frtSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <span className="text-[10px] font-bold text-amber-700 w-6 shrink-0">#{i + 1}</span>
                    <Input type="time" value={slot.startTime} onChange={e => updFrtSlot(i, "startTime", e.target.value)} className="h-7 text-xs flex-1" />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input type="time" value={slot.endTime} onChange={e => updFrtSlot(i, "endTime", e.target.value)} className="h-7 text-xs flex-1" />
                    {form.frtSlots.length > 1 && (
                      <button onClick={() => removeFrtSlot(i)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Who */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Who</p>
              <span className="text-xs text-muted-foreground">{form.memberIds.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => selectDept("all")}
                className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
                  activeDept === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50")}>
                All ({members.length})
              </button>
              {departments.map(dept => (
                <button key={dept} onClick={() => selectDept(dept)}
                  className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
                    activeDept === dept ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/50")}>
                  {dept} ({members.filter(m => m.department === dept).length})
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border divide-y">
              {filteredMembers.map(m => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                  <Checkbox checked={form.memberIds.includes(m.id)} onCheckedChange={() => toggle(m.id)} />
                  <span className="text-sm font-medium flex-1">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground">{m.role}</span>
                </label>
              ))}
              {filteredMembers.length === 0 && <div className="py-4 text-center text-xs text-muted-foreground">No members found</div>}
            </div>
          </div>

          {total > 0 && (
            <div className={cn("rounded-lg border px-4 py-3 text-center",
              form.slotType === "frt" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-primary/5 border-primary/20 text-foreground")}>
              <span className="text-xl font-bold">{total}</span>{" "}
              <span className="text-sm font-medium">{form.slotType === "frt" ? "FRT slot" : "shift"}{total !== 1 ? "s" : ""} will be created</span>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {form.memberIds.length} member{form.memberIds.length !== 1 ? "s" : ""} × {workDays} day{workDays !== 1 ? "s" : ""}
                {slotsPerMember > 1 ? ` × ${slotsPerMember} slots` : ""}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            className={cn("flex-1", form.slotType === "frt" && "bg-amber-500 hover:bg-amber-600 text-white")}
            disabled={isSubmitting || form.memberIds.length === 0 || total === 0 || (form.slotType === "shift" && !form.shiftConfigId)}
            onClick={() => onSubmit(form)}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create {total > 0 ? total : ""} {form.slotType === "frt" ? "FRT Slot" : "Shift"}{total !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shift Config Manager ──────────────────────────────────────────────────────
function ShiftConfigManager({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", startTime: "09:00", endTime: "17:00", color: "blue" });
  const { data: configs = [], isLoading } = useQuery<ShiftConfig[]>({
    queryKey: ["shift-configurations-all"],
    queryFn: async () => (await fetch("/api/shift-configurations", { headers: getHeaders() })).json(),
  });
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editId ? `/api/shift-configurations/${editId}` : "/api/shift-configurations";
      const r = await fetch(url, { method: editId ? "PATCH" : "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to save");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-configurations"] });
      qc.invalidateQueries({ queryKey: ["shift-configurations-all"] });
      setEditId(null); setForm({ name: "", startTime: "09:00", endTime: "17:00", color: "blue" });
      toast({ title: editId ? "Shift updated" : "Shift created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/shift-configurations/${id}`, { method: "DELETE", headers: getHeaders() }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-configurations"] }); qc.invalidateQueries({ queryKey: ["shift-configurations-all"] }); toast({ title: "Shift deleted" }); },
  });
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await fetch(`/api/shift-configurations/${id}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ isActive }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-configurations"] }); qc.invalidateQueries({ queryKey: ["shift-configurations-all"] }); },
  });
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings className="h-4 w-4" /> Manage Shift Types</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <h4 className="text-sm font-semibold">{editId ? "Edit Shift" : "Add New Shift"}</h4>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Shift A, Morning" className="text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="text-sm" />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {COLOR_KEYS.map(c => {
                const cfg = COLOR_MAP[c];
                return (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={cn("w-7 h-7 rounded-full transition-all", cfg.dot,
                      form.color === c ? "ring-2 ring-offset-2 ring-foreground/30 scale-110" : "opacity-60 hover:opacity-100")} />
                );
              })}
            </div>
            <div className="flex gap-2">
              {editId && <Button variant="outline" size="sm" onClick={() => { setEditId(null); setForm({ name: "", startTime: "09:00", endTime: "17:00", color: "blue" }); }} className="flex-1">Cancel</Button>}
              <Button size="sm" className="flex-1" disabled={!form.name || saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editId ? "Save Changes" : "Add Shift"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : configs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No shifts configured yet</p>
            ) : configs.map(c => {
              const cfg = getColorCfg(c.color);
              return (
                <div key={c.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5", cfg.bg)}>
                  <div className={cn("w-3 h-3 rounded-full shrink-0", cfg.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-semibold", cfg.text)}>{c.name}</div>
                    <div className={cn("text-[11px] opacity-70", cfg.text)}>{fmt12(c.startTime)} – {fmt12(c.endTime)}</div>
                  </div>
                  <Switch checked={c.isActive} onCheckedChange={v => toggleActive.mutate({ id: c.id, isActive: v })} />
                  <button onClick={() => { setEditId(c.id); setForm({ name: c.name, startTime: c.startTime, endTime: c.endTime, color: c.color }); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"><Settings className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteMutation.mutate(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} className="w-full">Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ shifts, members, colorMap, weekLabel }: {
  shifts: ShiftRow[]; members: UserType[]; colorMap: Record<string, number>; weekLabel: string;
}) {
  const stats = useMemo(() => {
    const total = shifts.filter(s => s.shiftType !== "off").length;
    const frt = shifts.filter(s => s.slotType === "frt").length;
    const byMbr: Record<string, number> = {};
    shifts.forEach(s => { byMbr[s.userId] = (byMbr[s.userId] || 0) + 1; });
    return { total, frt, byMbr };
  }, [shifts]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground mt-1">Total Shifts</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold text-amber-600">{stats.frt}</div><div className="text-xs text-muted-foreground mt-1">FRT Slots</div></Card>
        <Card className="p-4 text-center"><div className="text-2xl font-bold text-muted-foreground">{members.filter(m => !stats.byMbr[m.id]).length}</div><div className="text-xs text-muted-foreground mt-1">Unscheduled</div></Card>
      </div>
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">{weekLabel} — Member Breakdown</h3>
        <div className="space-y-2">
          {members.map(m => {
            const ci = (colorMap[m.id] ?? 0) % MC.length;
            const count = stats.byMbr[m.id] || 0;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className={cn("text-[10px] text-white", MC[ci].dot)}>
                    {m.name.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground">{m.department}</div>
                </div>
                {count > 0
                  ? <Badge variant="secondary" className="text-xs">{count} shift{count !== 1 ? "s" : ""}</Badge>
                  : <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Unscheduled</Badge>}
              </div>
            );
          })}
          {members.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No members found</p>}
        </div>
      </Card>
    </div>
  );
}

// ── Team Structure ────────────────────────────────────────────────────────────
function TeamStructureSection({ members, colorMap }: { members: UserType[]; colorMap: Record<string, number> }) {
  const [expanded, setExpanded] = useState(false);
  const { leaders, reportsMap, ungrouped } = useMemo(() => {
    const mSet = new Set(members.map(m => m.id));
    const reportsMap: Record<string, UserType[]> = {};
    members.forEach(m => {
      if (m.managerId && mSet.has(m.managerId)) {
        if (!reportsMap[m.managerId]) reportsMap[m.managerId] = [];
        reportsMap[m.managerId].push(m);
      }
    });
    const leaders = members.filter(m => reportsMap[m.id]?.length > 0).sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));
    const managedIds = new Set(Object.values(reportsMap).flat().map(m => m.id));
    const leaderIds = new Set(leaders.map(l => l.id));
    return { leaders, reportsMap, ungrouped: members.filter(m => !managedIds.has(m.id) && !leaderIds.has(m.id)) };
  }, [members]);
  return (
    <Card className="overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Team Structure</span>
          <Badge variant="secondary" className="text-xs">{members.length} members</Badge>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaders.map(lead => {
            const ci = (colorMap[lead.id] ?? 0) % MC.length;
            return (
              <div key={lead.id} className="rounded-lg border overflow-hidden">
                <div className={cn("flex items-center gap-2.5 px-3 py-2.5", MC[ci].bg)}>
                  <Avatar className="h-7 w-7"><AvatarFallback className={cn("text-[10px] text-white", MC[ci].dot)}>{lead.name.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0"><div className={cn("text-xs font-semibold truncate", MC[ci].text)}>{lead.name}</div><div className={cn("text-[10px] opacity-70", MC[ci].text)}>{lead.role}</div></div>
                </div>
                <div className="divide-y">
                  {(reportsMap[lead.id] || []).map(r => {
                    const ri = (colorMap[r.id] ?? 0) % MC.length;
                    return (
                      <div key={r.id} className="flex items-center gap-2 px-3 py-2">
                        <Avatar className="h-5 w-5"><AvatarFallback className={cn("text-[9px] text-white", MC[ri].dot)}>{r.name.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                        <span className="text-xs truncate">{r.name}</span>
                        <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0">{r.role}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {ungrouped.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-semibold text-muted-foreground">Other Members</span></div>
              <div className="divide-y">
                {ungrouped.map(m => { const ci = (colorMap[m.id] ?? 0) % MC.length; return (<div key={m.id} className="flex items-center gap-2 px-3 py-2"><Avatar className="h-5 w-5"><AvatarFallback className={cn("text-[9px] text-white", MC[ci].dot)}>{m.name.split(" ").map(p => p[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback></Avatar><span className="text-xs truncate">{m.name}</span><Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0">{m.role}</Badge></div>); })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AttendanceShiftsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isManager = user && ["Owner", "Admin", "Head", "Manager", "Lead"].includes(user.role);
  const isAdmin = user && ["Owner", "Admin"].includes(user.role);

  const [mainTab, setMainTab] = useState<"roster" | "timeline" | "overview">("roster");
  const [calView, setCalView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterMbr, setFilterMbr] = useState("all");
  const [cellDialog, setCellDialog] = useState<CellDialogState | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const todayStr = toDateStr(new Date());
  const weekStart = useMemo(() => getWeekStart(cursor), [cursor]);
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (mainTab === "timeline" && calView === "month") {
      const wks = getMonthWeeks(cursor);
      return { rangeStart: toDateStr(wks[0][0]), rangeEnd: toDateStr(wks[wks.length - 1][6]) };
    }
    return { rangeStart: toDateStr(getWeekStart(cursor)), rangeEnd: toDateStr(addDays(getWeekStart(cursor), 6)) };
  }, [mainTab, calView, cursor]);

  const navLabel = useMemo(() => {
    if (mainTab === "timeline" && calView === "month")
      return cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const ws = getWeekStart(cursor), we = addDays(ws, 6);
    return `${ws.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${we.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [mainTab, calView, cursor]);

  function navigate(dir: -1 | 1) {
    const c = new Date(cursor);
    if (mainTab === "timeline" && calView === "month") c.setMonth(c.getMonth() + dir);
    else c.setDate(c.getDate() + dir * 7);
    setCursor(c);
  }

  // Queries
  const { data: allUsers = [] } = useQuery<UserType[]>({
    queryKey: ["users"],
    queryFn: async () => (await fetch("/api/users", { headers: getHeaders() })).json(),
    enabled: !!user,
  });
  const { data: shiftConfigs = [] } = useQuery<ShiftConfig[]>({
    queryKey: ["shift-configurations"],
    queryFn: async () => (await fetch("/api/shift-configurations", { headers: getHeaders() })).json(),
    enabled: !!user,
  });
  const { data: leaveData = [] } = useQuery<any[]>({
    queryKey: ["leave-requests-range", rangeStart, rangeEnd],
    queryFn: async () => {
      const r = await fetch(`/api/leave-requests?status=approved`, { headers: getHeaders() });
      return r.json();
    },
    enabled: !!user,
  });
  const { data: wfhData = [] } = useQuery<any[]>({
    queryKey: ["wfh-records-range", rangeStart, rangeEnd],
    queryFn: async () => {
      const r = await fetch(`/api/wfh-records?startDate=${rangeStart}&endDate=${rangeEnd}`, { headers: getHeaders() });
      return r.json();
    },
    enabled: !!user,
  });

  const overlays = useMemo((): OverlayEvent[] => {
    const result: OverlayEvent[] = [];
    for (const lr of leaveData) {
      if (!lr.startDate || !lr.endDate) continue;
      for (let d = new Date(lr.startDate); d <= new Date(lr.endDate); d.setDate(d.getDate() + 1)) {
        const ds = toDateStr(d);
        if (ds >= rangeStart && ds <= rangeEnd)
          result.push({ userId: lr.userId || lr.user_id, date: ds, type: "leave", label: lr.leaveType || "Leave", userName: lr.userName || "" });
      }
    }
    for (const wr of wfhData) {
      if (wr.workLocation === "wfh") {
        const ds = wr.date;
        if (ds >= rangeStart && ds <= rangeEnd)
          result.push({ userId: wr.userId || wr.user_id, date: ds, type: "wfh", label: "WFH", userName: wr.userName || "" });
      }
    }
    return result;
  }, [leaveData, wfhData, rangeStart, rangeEnd]);

  const departments = useMemo(() =>
    [...new Set(allUsers.filter(u => u.isActive).map(u => u.department).filter(Boolean))].sort(), [allUsers]);

  const teamMembers = useMemo(() =>
    allUsers.filter(u => {
      if (!u.isActive) return false;
      if (user?.role === "Owner" || user?.role === "Admin") return true;
      return u.department === user?.department;
    }), [allUsers, user]);

  const colorMap = useMemo(() => {
    const m: Record<string, number> = {};
    teamMembers.forEach((u, i) => { m[u.id] = i; });
    return m;
  }, [teamMembers]);

  const filteredMembers = useMemo(() =>
    teamMembers.filter(m => {
      if (filterDept !== "all" && m.department !== filterDept) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterMbr !== "all" && m.id !== filterMbr) return false;
      return true;
    }), [teamMembers, search, filterMbr, filterDept]);

  const { data: rawShifts = [], isLoading } = useQuery<ShiftRow[]>({
    queryKey: ["shift-schedules", rangeStart, rangeEnd],
    queryFn: async () => (await fetch(`/api/shift-schedules?weekStart=${rangeStart}&weekEnd=${rangeEnd}`, { headers: getHeaders() })).json(),
    enabled: !!user,
  });

  const visibleShifts = useMemo(() =>
    rawShifts.filter(s => {
      const mbr = teamMembers.find(m => m.id === s.userId);
      if (!mbr) return false;
      if (filterDept !== "all" && mbr.department !== filterDept) return false;
      if (search && !mbr.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterMbr !== "all" && s.userId !== filterMbr) return false;
      return true;
    }), [rawShifts, teamMembers, search, filterMbr, filterDept]);

  const thisWeekShifts = useMemo(() => {
    const ws = toDateStr(getWeekStart(new Date()));
    const we = toDateStr(addDays(getWeekStart(new Date()), 6));
    return rawShifts.filter(s => s.date >= ws && s.date <= we);
  }, [rawShifts]);

  // Mutations
  const createShift = useMutation({
    mutationFn: async (d: any) => {
      const r = await fetch("/api/shift-schedules", { method: "POST", headers: getHeaders(), body: JSON.stringify(d) });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-schedules"] }); setCellDialog(null); toast({ title: "Shift assigned" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteShift = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/shift-schedules/${id}`, { method: "DELETE", headers: getHeaders() }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-schedules"] }); setCellDialog(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const createBulk = useMutation({
    mutationFn: async (f: BulkForm) => {
      if (f.slotType === "frt") {
        let total = 0;
        for (const slot of f.frtSlots) {
          const r = await fetch("/api/shift-schedules/bulk", { method: "POST", headers: getHeaders(), body: JSON.stringify({ ...f, startTime: slot.startTime, endTime: slot.endTime, shiftType: f.shiftConfigId || "frt" }) });
          if (!r.ok) throw new Error("Failed");
          const d = await r.json(); total += d.created || 0;
        }
        return { created: total };
      }
      const r = await fetch("/api/shift-schedules/bulk", { method: "POST", headers: getHeaders(), body: JSON.stringify({ ...f, shiftType: f.shiftConfigId || "custom" }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["shift-schedules"] }); setBulkOpen(false); toast({ title: `${d.created} shifts created` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cellDialogShifts = useMemo(() => {
    if (!cellDialog) return [];
    return rawShifts.filter(s => s.userId === cellDialog.userId && s.date === cellDialog.date);
  }, [cellDialog, rawShifts]);

  if (!user) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-6">
          <div className="flex h-16 items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/attendance")}>
              <ArrowLeft className="h-4 w-4" />Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                <CalendarDays className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-semibold">Shift Schedule</h1>
                <p className="text-xs text-muted-foreground">Team shift & FRT management</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* Main tabs */}
              <div className="flex rounded-lg border border-border bg-muted/40 p-1 gap-0.5">
                <button onClick={() => setMainTab("roster")}
                  className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    mainTab === "roster" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <LayoutGrid className="h-3.5 w-3.5" />Roster
                </button>
                <button onClick={() => setMainTab("timeline")}
                  className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    mainTab === "timeline" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <Calendar className="h-3.5 w-3.5" />Timeline
                </button>
                <button onClick={() => setMainTab("overview")}
                  className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    mainTab === "overview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <BarChart2 className="h-3.5 w-3.5" />Overview
                </button>
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="gap-1.5">
                  <Settings className="h-4 w-4" />Shifts
                </Button>
              )}
              {isManager && (
                <Button size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />Bulk Schedule
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-6 space-y-4">
        {/* Toolbar (roster + timeline share the same nav) */}
        {mainTab !== "overview" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Week/month toggle (timeline only) */}
            {mainTab === "timeline" && (
              <div className="flex rounded-lg border border-border bg-muted/40 p-1 gap-0.5">
                {(["week", "month"] as const).map(v => (
                  <button key={v} onClick={() => setCalView(v)}
                    className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all",
                      calView === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {v}
                  </button>
                ))}
              </div>
            )}
            {/* Navigation */}
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())} className="text-xs h-8 px-3">Today</Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
              <span className="text-sm font-medium px-2 min-w-[200px]">{navLabel}</span>
            </div>
            {/* Filters */}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-36" />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="All depts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMbr} onValueChange={setFilterMbr}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All members" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {filteredMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Legend */}
        {mainTab !== "overview" && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {shiftConfigs.map(c => (
              <div key={c.id} className="flex items-center gap-1.5">
                <div className={cn("h-2.5 w-2.5 rounded-full", getColorCfg(c.color).dot)} />
                <span className="text-muted-foreground">{c.name} · {fmt12(c.startTime)}–{fmt12(c.endTime)}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="text-muted-foreground">FRT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="text-muted-foreground">Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="text-muted-foreground">WFH</span>
            </div>
            {filteredMembers.filter(m => !rawShifts.some(s => s.userId === m.id && s.date >= rangeStart && s.date <= rangeEnd)).length > 0 && (
              <div className="flex items-center gap-1.5 ml-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground text-[10px]">= not scheduled this week</span>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── ROSTER TAB ── */}
            {mainTab === "roster" && (
              <div className="space-y-4">
                <RosterGrid
                  weekDates={weekDates}
                  members={filteredMembers}
                  allShifts={visibleShifts}
                  overlays={overlays}
                  shiftConfigs={shiftConfigs}
                  isManager={!!isManager}
                  todayStr={todayStr}
                  colorMap={colorMap}
                  onCellClick={(userId, date) => setCellDialog({ userId, date })}
                  onDelete={id => deleteShift.mutate(id)}
                />
                <TeamStructureSection members={filteredMembers} colorMap={colorMap} />
              </div>
            )}

            {/* ── TIMELINE TAB ── */}
            {mainTab === "timeline" && (
              <div className="space-y-4">
                {calView === "week" && (
                  <WeekCalendar
                    weekDates={weekDates}
                    allShifts={visibleShifts}
                    colorMap={colorMap}
                    isManager={!!isManager}
                    todayStr={todayStr}
                    shiftConfigs={shiftConfigs}
                    onAddSlot={ds => isManager && setCellDialog({ userId: filterMbr !== "all" ? filterMbr : "", date: ds })}
                    onDelete={id => deleteShift.mutate(id)}
                  />
                )}
                {calView === "month" && (
                  <MonthCalendar
                    cursor={cursor}
                    allShifts={visibleShifts}
                    colorMap={colorMap}
                    isManager={!!isManager}
                    todayStr={todayStr}
                    onClickDay={ds => { setCursor(new Date(ds + "T12:00:00")); setCalView("week"); }}
                  />
                )}
              </div>
            )}

            {/* ── OVERVIEW TAB ── */}
            {mainTab === "overview" && (
              <OverviewTab
                shifts={thisWeekShifts}
                members={filteredMembers}
                colorMap={colorMap}
                weekLabel={`Week of ${getWeekStart(new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
              />
            )}
          </>
        )}
      </main>

      {/* Quick Assign Dialog */}
      {cellDialog && (
        <QuickAssignDialog
          userId={cellDialog.userId}
          date={cellDialog.date}
          existingShifts={cellDialogShifts}
          members={filteredMembers.length > 0 ? filteredMembers : teamMembers}
          shiftConfigs={shiftConfigs}
          overlays={overlays}
          onSave={d => createShift.mutate(d)}
          onDelete={id => deleteShift.mutate(id)}
          onClose={() => setCellDialog(null)}
          isSaving={createShift.isPending}
          isDeleting={deleteShift.isPending}
        />
      )}

      {bulkOpen && (
        <BulkAddDialog
          members={filteredMembers.length > 0 ? filteredMembers : teamMembers}
          shiftConfigs={shiftConfigs}
          onClose={() => setBulkOpen(false)}
          onSubmit={f => createBulk.mutate(f)}
          isSubmitting={createBulk.isPending}
        />
      )}

      {configOpen && <ShiftConfigManager onClose={() => setConfigOpen(false)} />}
    </div>
  );
}
