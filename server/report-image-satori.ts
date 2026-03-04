/**
 * Serverless Report Image Renderer — Satori + resvg
 *
 * Generates a PNG image of the pending complaints report without Chrome.
 * Works on Vercel, Lambda, and any serverless environment.
 * Supports 'dark' and 'light' themes.
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { PendingReportData } from './report-html-builder';
import { interRegularFont, interBoldFont, jetbrainsMonoFont } from './fonts/font-data';

// ── Font loading (pre-bundled as base64 — works on any platform) ──────────────

function getFonts(): any[] {
  return [
    { name: 'Inter', data: interRegularFont, weight: 400, style: 'normal' },
    { name: 'Inter', data: interBoldFont,    weight: 700, style: 'normal' },
    { name: 'Mono',  data: jetbrainsMonoFont, weight: 400, style: 'normal' },
  ];
}

// ── Colour palettes ────────────────────────────────────────────────────────────

export type ReportTheme = 'dark' | 'light';

interface Palette {
  bg: string; surface: string; card: string;
  border: string; border2: string;
  accent: string; green: string; red: string; orange: string;
  text: string; muted: string; subtle: string;
  cardRed: string; cardOrange: string; cardGreen: string;
  borderRed: string; borderOrange: string; borderGreen: string;
}

const DARK: Palette = {
  bg:           '#0c0c0c',
  surface:      '#111111',
  card:         '#181818',
  border:       '#252525',
  border2:      '#2e2e2e',
  accent:       '#F5C518',
  green:        '#3DD68C',
  red:          '#E8453C',
  orange:       '#F07C3A',
  text:         '#ededed',
  muted:        '#888888',
  subtle:       '#3a3a3a',
  cardRed:      '#130d0d',
  cardOrange:   '#120f08',
  cardGreen:    '#091510',
  borderRed:    '#3d1515',
  borderOrange: '#2f2311',
  borderGreen:  '#0e2318',
};

const LIGHT: Palette = {
  bg:           '#ffffff',
  surface:      '#f4f4f5',
  card:         '#ffffff',
  border:       '#e4e4e7',
  border2:      '#d4d4d8',
  accent:       '#d97706',
  green:        '#16a34a',
  red:          '#dc2626',
  orange:       '#ea580c',
  text:         '#18181b',
  muted:        '#71717a',
  subtle:       '#d4d4d8',
  cardRed:      '#fef2f2',
  cardOrange:   '#fff7ed',
  cardGreen:    '#f0fdf4',
  borderRed:    '#fecaca',
  borderOrange: '#fed7aa',
  borderGreen:  '#bbf7d0',
};

// ── Element helpers ────────────────────────────────────────────────────────────

type Child = Record<string, any> | string | null | undefined;

function row(style: Record<string, any>, children: Child[]): any {
  return { type: 'div', props: { style: { display: 'flex', flexDirection: 'row', ...style }, children: children.filter(Boolean) } };
}
function col(style: Record<string, any>, children: Child[]): any {
  return { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', ...style }, children: children.filter(Boolean) } };
}
function txt(style: Record<string, any>, text: string): any {
  return { type: 'span', props: { style: { display: 'flex', ...style }, children: text } };
}
function solidDiv(style: Record<string, any>): any {
  return { type: 'div', props: { style: { display: 'flex', ...style }, children: [] } };
}
function pct(val: number, total: number) {
  return total > 0 ? Math.round((val / total) * 100) : 0;
}

// ── Themed component factory ───────────────────────────────────────────────────

function makeLayout(C: Palette) {
  function header(data: PendingReportData) {
    const title = data.department
      ? `${data.department.toUpperCase()} — PENDING REPORT`
      : 'PENDING COMPLAINTS REPORT';

    return row({
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      padding: '18px 40px',
      alignItems: 'center',
      justifyContent: 'space-between',
    }, [
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 22, letterSpacing: 4, color: C.accent }, 'FLEEK'),
      col({ alignItems: 'flex-end', gap: 3 }, [
        txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, letterSpacing: 2, color: C.text }, title),
        txt({ fontFamily: 'Mono', fontSize: 10, color: C.muted, letterSpacing: 1 }, data.generatedAt),
      ]),
    ]);
  }

  function hero(data: PendingReportData) {
    const kicker  = data.department ? `${data.department.toUpperCase()} · DAILY DEPT REPORT` : 'DAILY OPERATIONS · INTERNAL REPORT';
    const heading = data.department ? `${data.department.toUpperCase()} PENDING TICKETS` : 'PENDING COMPLAINTS';
    const sub     = data.department
      ? `Overview of open and pending cases in the ${data.department} department.`
      : 'Overview of all open, new and pending cases across all departments.';

    function stat(val: number, label: string, color: string) {
      return col({ gap: 4 }, [
        txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 44, lineHeight: 1, color }, String(val)),
        txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 2, color: C.muted, textTransform: 'uppercase' }, label),
      ]);
    }

    return col({
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      padding: '30px 40px 26px',
      gap: 8,
    }, [
      txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, kicker),
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 36, lineHeight: 1, color: C.text }, heading),
      txt({ fontFamily: 'Inter', fontSize: 12, color: C.muted, marginBottom: 12 }, sub),
      row({ gap: 36, alignItems: 'flex-end' }, [
        stat(data.totalPending,  'Total Pending', C.accent),
        solidDiv({ width: 1, height: 48, background: C.border2 }),
        stat(data.totalBreached, 'Out of SLA',   C.red),
        solidDiv({ width: 1, height: 48, background: C.border2 }),
        stat(data.sla.atRisk,    'At Risk',      C.orange),
        solidDiv({ width: 1, height: 48, background: C.border2 }),
        stat(data.totalOnTrack,  'Within SLA',   C.green),
      ]),
    ]);
  }

  function slaSection(data: PendingReportData) {
    const slaTotal = data.sla.onTrack + data.sla.atRisk + data.sla.breached;

    function card(label: string, value: number, color: string, bg: string, bdr: string, sub: string) {
      return col({
        flex: 1, background: bg, border: `1px solid ${bdr}`,
        borderRadius: 10, padding: '18px 20px', gap: 5,
      }, [
        txt({ fontFamily: 'Mono', fontSize: 9, letterSpacing: 2, color: C.muted, textTransform: 'uppercase' }, label),
        txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 44, lineHeight: 1, color }, String(value)),
        txt({ fontFamily: 'Inter', fontSize: 11, color: C.muted }, sub),
        txt({ fontFamily: 'Mono', fontSize: 10, color }, `${pct(value, slaTotal)}% of total`),
      ]);
    }

    return col({ gap: 14 }, [
      txt({ fontFamily: 'Mono', fontSize: 9, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, '01 — SLA VIEW'),
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 20, color: C.text }, 'SLA Status Breakdown'),
      row({ gap: 14, marginTop: 2 }, [
        card('Out of SLA', data.sla.breached, C.red,    C.cardRed,    C.borderRed,    'Breached tickets'),
        card('At Risk',    data.sla.atRisk,   C.orange, C.cardOrange, C.borderOrange, 'Approaching breach'),
        card('Within SLA', data.sla.onTrack,  C.green,  C.cardGreen,  C.borderGreen,  'On track'),
      ]),
    ]);
  }

  function barSection(
    sectionNum: string,
    sectionLabel: string,
    title: string,
    items: Array<{ label: string; total: number; breached: number; onTrack: number }>,
    maxTotal: number
  ) {
    function barRow(item: { label: string; total: number; breached: number; onTrack: number }, isLast: boolean) {
      const barWidthPct = maxTotal > 0 ? Math.round((item.total / maxTotal) * 100) : 0;
      const breachWPct  = item.total > 0 ? Math.round((item.breached / item.total) * barWidthPct) : 0;
      const trackWPct   = barWidthPct - breachWPct;
      const shortLabel  = item.label.length > 26 ? item.label.slice(0, 24) + '…' : item.label;

      return col({ gap: 6, marginBottom: isLast ? 0 : 12 }, [
        row({ alignItems: 'center', gap: 0, width: 820 }, [
          txt({ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: C.text, width: 170, flexShrink: 0 }, shortLabel),
          txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: C.accent, width: 40, flexShrink: 0, justifyContent: 'flex-end' }, String(item.total)),
          row({ flex: 1, gap: 16, justifyContent: 'flex-end' }, [
            txt({ fontFamily: 'Mono', fontSize: 11, color: C.green }, `+ ${item.onTrack} ok`),
            txt({ fontFamily: 'Mono', fontSize: 11, color: item.breached > 0 ? C.red : C.muted },
              item.breached > 0 ? `! ${item.breached} sla` : `- 0`),
          ]),
        ]),
        row({ height: 7, borderRadius: 999, overflow: 'hidden', background: C.subtle, width: 820 }, [
          trackWPct > 0  ? solidDiv({ width: `${trackWPct}%`,  height: '100%', background: C.green }) : null,
          breachWPct > 0 ? solidDiv({ width: `${breachWPct}%`, height: '100%', background: C.red })   : null,
        ].filter(Boolean) as any[]),
      ]);
    }

    return col({ gap: 0 }, [
      txt({ fontFamily: 'Mono', fontSize: 9, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, `${sectionNum} — ${sectionLabel}`),
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 20, color: C.text, marginTop: 4, marginBottom: 16 }, title),
      items.length > 0
        ? col({ gap: 0 }, items.map((item, i) => barRow(item, i === items.length - 1)))
        : txt({ fontFamily: 'Inter', fontSize: 12, color: C.muted }, 'No data available'),
    ]);
  }

  function assigneeSection(
    data: PendingReportData,
    sectionNum: string
  ) {
    const topAssignees = data.byAssignee.slice(0, 12);
    const maxCount = Math.max(...topAssignees.map(a => a.count), 1);

    function assigneeRow(
      a: { name: string; dept: string; count: number; breached: number },
      isLast: boolean
    ) {
      const onTrack = a.count - a.breached;
      const barWidthPct = Math.round((a.count / maxCount) * 100);
      const breachWPct  = a.count > 0 ? Math.round((a.breached / a.count) * barWidthPct) : 0;
      const trackWPct   = barWidthPct - breachWPct;
      const shortName   = a.name.length > 20 ? a.name.slice(0, 18) + '…' : a.name;
      const shortDept   = a.dept.length > 12 ? a.dept.slice(0, 10) + '…' : a.dept;

      return col({ gap: 5, marginBottom: isLast ? 0 : 12 }, [
        // Label row: name + dept tag + total + counts
        row({ alignItems: 'center', gap: 0, width: 820 }, [
          // Name column
          col({ width: 160, flexShrink: 0, gap: 2 }, [
            txt({ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: C.text }, shortName),
            txt({
              fontFamily: 'Mono', fontSize: 9, color: C.muted,
              background: C.surface, borderRadius: 3,
              paddingLeft: 5, paddingRight: 5, paddingTop: 2, paddingBottom: 2,
              alignSelf: 'flex-start',
            }, shortDept),
          ]),
          // Total count
          txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: C.accent, width: 40, flexShrink: 0, justifyContent: 'flex-end' }, String(a.count)),
          // SLA counts right-aligned
          row({ flex: 1, gap: 16, justifyContent: 'flex-end' }, [
            txt({ fontFamily: 'Mono', fontSize: 11, color: C.green }, `+ ${onTrack} ok`),
            txt({ fontFamily: 'Mono', fontSize: 11, color: a.breached > 0 ? C.red : C.muted },
              a.breached > 0 ? `! ${a.breached} sla` : `- 0`),
          ]),
        ]),
        // Stacked bar
        row({ height: 7, borderRadius: 999, overflow: 'hidden', background: C.subtle, width: 820 }, [
          trackWPct > 0  ? solidDiv({ width: `${trackWPct}%`,  height: '100%', background: C.green }) : null,
          breachWPct > 0 ? solidDiv({ width: `${breachWPct}%`, height: '100%', background: C.red })   : null,
        ].filter(Boolean) as any[]),
      ]);
    }

    return col({ gap: 0 }, [
      txt({ fontFamily: 'Mono', fontSize: 9, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, `${sectionNum} — ASSIGNEE VIEW`),
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 20, color: C.text, marginTop: 4, marginBottom: 16 }, 'Assignee Wise Pending Tickets'),
      topAssignees.length > 0
        ? col({ gap: 0 }, topAssignees.map((a, i) => assigneeRow(a, i === topAssignees.length - 1)))
        : txt({ fontFamily: 'Inter', fontSize: 12, color: C.muted }, 'No assigned tickets'),
    ]);
  }

  function divider() {
    return solidDiv({ width: '100%', height: 1, background: C.border, marginTop: 26, marginBottom: 26 });
  }

  function footer(data: PendingReportData) {
    return row({
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      padding: '12px 40px',
      alignItems: 'center',
      justifyContent: 'space-between',
    }, [
      txt({ fontFamily: 'Mono', fontSize: 9, color: C.muted, letterSpacing: 1 }, 'FLOW INTERNAL PORTAL · AUTOMATED DAILY REPORT'),
      txt({ fontFamily: 'Mono', fontSize: 9, color: C.muted }, data.generatedAt),
    ]);
  }

  return { header, hero, slaSection, barSection, assigneeSection, divider, footer };
}

// ── Height estimator ──────────────────────────────────────────────────────────

function estimateHeight(data: PendingReportData): number {
  const deptRows     = Math.min(data.byDepartment.length,    8);
  const catRows      = Math.min(data.byContactReason.length, 10);
  const assigneeRows = Math.min(data.byAssignee.length,      12);
  const ROW_H    = 50;   // slightly taller for assignee rows (name + dept tag)
  const SEC_OH   = 76;
  const DIV_H    = 53;

  return Math.ceil(
    56  +  // header
    180 +  // hero
    28  +  // body padding top
    176 +  // SLA section
    DIV_H + SEC_OH + deptRows     * ROW_H +
    DIV_H + SEC_OH + catRows      * ROW_H +
    DIV_H + SEC_OH + assigneeRows * ROW_H +
    36  +  // body padding bottom
    48  +  // footer
    80     // safety buffer
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function buildReportPng(
  data: PendingReportData,
  theme: ReportTheme = 'dark'
): Promise<Buffer> {
  const C = theme === 'light' ? LIGHT : DARK;
  const L = makeLayout(C);

  const topDepts = data.byDepartment.slice(0, 8).map(d => ({
    label: d.dept, total: d.count, breached: d.breached, onTrack: d.count - d.breached,
  }));
  const deptMax = Math.max(...topDepts.map(d => d.total), 1);

  const topCats = data.byContactReason.slice(0, 10).map(c => ({
    label: c.reason || 'Uncategorised', total: c.count, breached: c.breached, onTrack: c.count - c.breached,
  }));
  const catMax = Math.max(...topCats.map(c => c.total), 1);

  const sec01Label = data.department ? 'CATEGORY BREAKDOWN' : 'DEPARTMENT BREAKDOWN';
  const sec01Title = data.department ? `${data.department} — Category Breakdown` : 'Department Wise Pending Tickets';

  const root = col({ width: 900, background: C.bg, fontFamily: 'Inter', color: C.text }, [
    L.header(data),
    L.hero(data),
    col({ padding: '28px 40px 36px', gap: 0 }, [
      L.slaSection(data),
      L.divider(),
      L.barSection('02', sec01Label, sec01Title, topDepts, deptMax),
      L.divider(),
      L.barSection('03', 'CATEGORY VIEW (L3/L4)',
        data.department ? 'Sub-Category Breakdown (L3/L4)' : 'Category Wise Pending Tickets (L3/L4)',
        topCats, catMax),
      L.divider(),
      L.assigneeSection(data, '04'),
    ]),
    L.footer(data),
  ]);

  const svg = await satori(root as any, {
    width: 900,
    height: estimateHeight(data),
    embedFont: true,
    fonts: getFonts(),
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 900 },
    background: C.bg,
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
