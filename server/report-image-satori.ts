/**
 * Serverless Report Image Renderer — Satori + resvg
 *
 * Generates a 1200px wide PNG report with 2-column layout for Category & Assignee.
 * Works on Vercel, Lambda, and any serverless environment.
 * Supports 'dark' and 'light' themes.
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { PendingReportData } from './report-html-builder';
import { interRegularFont, interBoldFont, jetbrainsMonoFont } from './fonts/font-data';

// ── Layout constants ──────────────────────────────────────────────────────────

const REPORT_WIDTH = 1200;
const H_PAD        = 48;           // horizontal padding each side
const CONTENT_W    = REPORT_WIDTH - H_PAD * 2; // 1104
const COL_GAP      = 44;
const COL_W        = Math.floor((CONTENT_W - COL_GAP) / 2); // 530

const SLA_CARD_GAP = 18;
const SLA_CARD_W   = Math.floor((CONTENT_W - SLA_CARD_GAP * 2) / 3); // 356
const SLA_BAR_W    = SLA_CARD_W - 52; // inner bar width (26px padding each side)

// ── Font loading (pre-bundled as base64) ──────────────────────────────────────

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
  bg:           '#f5f5f5',
  surface:      '#ffffff',
  card:         '#ffffff',
  border:       '#e4e4e7',
  border2:      '#d4d4d8',
  accent:       '#d97706',
  green:        '#16a34a',
  red:          '#dc2626',
  orange:       '#ea580c',
  text:         '#18181b',
  muted:        '#71717a',
  subtle:       '#e4e4e7',
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

  // ── Logo mark: "F" badge ───────────────────────────────────────────────────
  function logoMark() {
    return row({
      width: 40, height: 40,
      background: C.accent,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }, [
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 22, color: '#111111', lineHeight: 1 }, 'F'),
    ]);
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  function header(data: PendingReportData) {
    const title = data.department
      ? `${data.department.toUpperCase()} — PENDING REPORT`
      : 'PENDING COMPLAINTS REPORT';

    return row({
      background: C.surface,
      borderBottom: `2px solid ${C.accent}`,
      padding: `20px ${H_PAD}px`,
      alignItems: 'center',
      justifyContent: 'space-between',
    }, [
      // Left: logo icon + brand text
      row({ alignItems: 'center', gap: 14 }, [
        logoMark(),
        col({ gap: 2 }, [
          txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 22, letterSpacing: 3, color: C.accent, lineHeight: 1 }, 'FLEEK'),
          txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 2, color: C.muted }, 'FLOW PORTAL'),
        ]),
      ]),
      // Right: report title + timestamp
      col({ alignItems: 'flex-end', gap: 4 }, [
        txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, letterSpacing: 2, color: C.text }, title),
        txt({ fontFamily: 'Mono', fontSize: 11, color: C.muted, letterSpacing: 1 }, data.generatedAt),
      ]),
    ]);
  }

  // ── Hero ───────────────────────────────────────────────────────────────────
  function hero(data: PendingReportData) {
    const kicker  = data.department ? `${data.department.toUpperCase()} · DAILY DEPT REPORT` : 'DAILY OPERATIONS · INTERNAL REPORT';
    const heading = data.department ? `${data.department.toUpperCase()} PENDING TICKETS`      : 'PENDING COMPLAINTS';
    const sub     = data.department
      ? `Overview of open and pending cases in the ${data.department} department.`
      : 'Overview of all open, new and pending cases across all departments.';

    function stat(val: number, label: string, color: string) {
      return col({ gap: 6, flexShrink: 0 }, [
        txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 54, lineHeight: 1, color }, String(val)),
        txt({ fontFamily: 'Mono', fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: 'uppercase' }, label),
      ]);
    }

    return col({
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      padding: `34px ${H_PAD}px 30px`,
      gap: 8,
    }, [
      txt({ fontFamily: 'Mono', fontSize: 11, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, kicker),
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 42, lineHeight: 1, color: C.text }, heading),
      txt({ fontFamily: 'Inter', fontSize: 14, color: C.muted, marginBottom: 18 }, sub),
      row({ gap: 52, alignItems: 'flex-end' }, [
        stat(data.totalPending,  'Total Pending', C.accent),
        solidDiv({ width: 1, height: 54, background: C.border2, flexShrink: 0 }),
        stat(data.totalBreached, 'Out of SLA',   C.red),
        solidDiv({ width: 1, height: 54, background: C.border2, flexShrink: 0 }),
        stat(data.sla.atRisk,    'At Risk',      C.orange),
        solidDiv({ width: 1, height: 54, background: C.border2, flexShrink: 0 }),
        stat(data.totalOnTrack,  'Within SLA',   C.green),
      ]),
    ]);
  }

  // ── SLA Section ────────────────────────────────────────────────────────────
  function slaSection(data: PendingReportData) {
    const slaTotal = data.sla.onTrack + data.sla.atRisk + data.sla.breached;

    function card(label: string, value: number, color: string, bg: string, bdr: string, sub: string) {
      const pctVal    = pct(value, slaTotal);
      const barFillPx = Math.round(SLA_BAR_W * pctVal / 100);

      return col({
        width: SLA_CARD_W,
        background: bg,
        border: `1px solid ${bdr}`,
        borderRadius: 14,
        padding: '24px 26px',
        gap: 6,
      }, [
        txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 2, color: C.muted, textTransform: 'uppercase' }, label),
        txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 54, lineHeight: 1, color }, String(value)),
        txt({ fontFamily: 'Inter', fontSize: 13, color: C.muted }, sub),
        txt({ fontFamily: 'Mono', fontSize: 12, color }, `${pctVal}% of total`),
        // Mini fill bar
        row({ marginTop: 10, height: 5, borderRadius: 999, background: C.subtle, overflow: 'hidden', width: SLA_BAR_W }, [
          barFillPx > 0 ? solidDiv({ width: barFillPx, height: 5, background: color, borderRadius: 999 }) : null,
        ].filter(Boolean) as any[]),
      ]);
    }

    return col({ gap: 18 }, [
      // Section title + 48h SLA note
      row({ alignItems: 'center', gap: 18 }, [
        col({ gap: 4 }, [
          txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, '01 — SLA VIEW'),
          txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, color: C.text }, 'SLA Status Breakdown'),
        ]),
        solidDiv({ width: 1, height: 36, background: C.border2 }),
        col({ gap: 2 }, [
          txt({ fontFamily: 'Mono', fontSize: 11, color: C.muted }, 'Standard SLA'),
          txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 20, color: C.accent }, '48 hours'),
        ]),
      ]),
      row({ gap: SLA_CARD_GAP }, [
        card('Out of SLA', data.sla.breached, C.red,    C.cardRed,    C.borderRed,    'Breached tickets'),
        card('At Risk',    data.sla.atRisk,   C.orange, C.cardOrange, C.borderOrange, 'Approaching breach'),
        card('Within SLA', data.sla.onTrack,  C.green,  C.cardGreen,  C.borderGreen,  'On track'),
      ]),
    ]);
  }

  // ── Bar section (dept and category) ───────────────────────────────────────
  function barSection(
    sectionNum: string,
    sectionLabel: string,
    title: string,
    items: Array<{ label: string; sublabel?: string; total: number; breached: number; onTrack: number }>,
    maxTotal: number,
    colWidth: number = CONTENT_W
  ) {
    const isFullWidth  = colWidth >= CONTENT_W;
    const labelColW    = isFullWidth ? 240 : 162;
    const countColW    = isFullWidth ? 54  : 42;
    const maxChars     = isFullWidth ? 32  : 22;
    const labelSize    = isFullWidth ? 15  : 14;
    const countSize    = isFullWidth ? 17  : 15;
    const monoSize     = isFullWidth ? 13  : 12;
    const barH         = isFullWidth ? 9   : 8;

    function barRow(
      item: { label: string; sublabel?: string; total: number; breached: number; onTrack: number },
      isLast: boolean
    ) {
      const barWidthPct = maxTotal > 0 ? Math.round((item.total / maxTotal) * 100) : 0;
      const breachWPct  = item.total > 0 ? Math.round((item.breached / item.total) * barWidthPct) : 0;
      const trackWPct   = barWidthPct - breachWPct;
      const shortLabel  = item.label.length > maxChars ? item.label.slice(0, maxChars - 1) + '…' : item.label;
      const shortSub    = item.sublabel
        ? (item.sublabel.length > 14 ? item.sublabel.slice(0, 12) + '…' : item.sublabel)
        : null;

      return col({ gap: 7, marginBottom: isLast ? 0 : 15 }, [
        row({ alignItems: 'center', gap: 0, width: colWidth }, [
          // Label column with optional dept sublabel
          col({ width: labelColW, flexShrink: 0, gap: 4 }, [
            txt({ fontFamily: 'Inter', fontWeight: 600, fontSize: labelSize, color: C.text, lineHeight: 1.2 }, shortLabel),
            shortSub ? txt({
              fontFamily: 'Mono', fontSize: 10, color: C.muted,
              background: C.subtle, borderRadius: 4,
              paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2,
              alignSelf: 'flex-start',
            }, shortSub) : null,
          ]),
          // Count
          txt({
            fontFamily: 'Inter', fontWeight: 700, fontSize: countSize, color: C.accent,
            width: countColW, flexShrink: 0, justifyContent: 'flex-end',
          }, String(item.total)),
          // SLA breakdown (right-aligned)
          row({ flex: 1, gap: 16, justifyContent: 'flex-end' }, [
            txt({ fontFamily: 'Mono', fontSize: monoSize, color: C.green }, `+ ${item.onTrack} ok`),
            txt({
              fontFamily: 'Mono', fontSize: monoSize,
              color: item.breached > 0 ? C.red : C.muted,
            }, item.breached > 0 ? `! ${item.breached} sla` : `- 0`),
          ]),
        ]),
        // Stacked bar
        row({ height: barH, borderRadius: 999, overflow: 'hidden', background: C.subtle, width: colWidth }, [
          trackWPct > 0  ? solidDiv({ width: `${trackWPct}%`,  height: '100%', background: C.green }) : null,
          breachWPct > 0 ? solidDiv({ width: `${breachWPct}%`, height: '100%', background: C.red })   : null,
        ].filter(Boolean) as any[]),
      ]);
    }

    return col({ gap: 0 }, [
      txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, `${sectionNum} — ${sectionLabel}`),
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: isFullWidth ? 24 : 20, color: C.text, marginTop: 5, marginBottom: 18 }, title),
      items.length > 0
        ? col({ gap: 0 }, items.map((item, i) => barRow(item, i === items.length - 1)))
        : txt({ fontFamily: 'Inter', fontSize: 13, color: C.muted }, 'No data available'),
    ]);
  }

  // ── Assignee section ───────────────────────────────────────────────────────
  function assigneeSection(
    data: PendingReportData,
    sectionNum: string,
    colWidth: number = CONTENT_W
  ) {
    const topAssignees  = data.byAssignee.slice(0, 12);
    const maxCount      = Math.max(...topAssignees.map(a => a.count), 1);
    const isFullWidth   = colWidth >= CONTENT_W;
    const nameColW      = isFullWidth ? 210 : 158;
    const countColW     = isFullWidth ? 54  : 42;
    const monoSize      = isFullWidth ? 13  : 12;
    const maxNameChars  = isFullWidth ? 22  : 18;
    const barH          = isFullWidth ? 9   : 8;

    function assigneeRow(
      a: { name: string; dept: string; count: number; breached: number },
      isLast: boolean
    ) {
      const onTrack     = a.count - a.breached;
      const barWidthPct = Math.round((a.count / maxCount) * 100);
      const breachWPct  = a.count > 0 ? Math.round((a.breached / a.count) * barWidthPct) : 0;
      const trackWPct   = barWidthPct - breachWPct;
      const shortName   = a.name.length > maxNameChars ? a.name.slice(0, maxNameChars - 1) + '…' : a.name;
      const deptLabel   = a.dept || '—';
      const shortDept   = deptLabel.length > 14 ? deptLabel.slice(0, 12) + '…' : deptLabel;
      const isUnassigned = a.name === 'Unassigned';

      return col({ gap: 6, marginBottom: isLast ? 0 : 15 }, [
        row({ alignItems: 'center', gap: 0, width: colWidth }, [
          // Name + dept tag
          col({ width: nameColW, flexShrink: 0, gap: 4 }, [
            txt({
              fontFamily: 'Inter', fontWeight: 600, fontSize: 14, lineHeight: 1.2,
              color: isUnassigned ? C.muted : C.text,
              fontStyle: isUnassigned ? 'italic' : 'normal',
            }, shortName),
            txt({
              fontFamily: 'Mono', fontSize: 10, color: C.muted,
              background: C.subtle, borderRadius: 4,
              paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2,
              alignSelf: 'flex-start',
            }, shortDept),
          ]),
          // Count
          txt({
            fontFamily: 'Inter', fontWeight: 700, fontSize: 15, color: C.accent,
            width: countColW, flexShrink: 0, justifyContent: 'flex-end',
          }, String(a.count)),
          // SLA breakdown
          row({ flex: 1, gap: 16, justifyContent: 'flex-end' }, [
            txt({ fontFamily: 'Mono', fontSize: monoSize, color: C.green }, `+ ${onTrack} ok`),
            txt({
              fontFamily: 'Mono', fontSize: monoSize,
              color: a.breached > 0 ? C.red : C.muted,
            }, a.breached > 0 ? `! ${a.breached} sla` : `- 0`),
          ]),
        ]),
        // Stacked bar
        row({ height: barH, borderRadius: 999, overflow: 'hidden', background: C.subtle, width: colWidth }, [
          trackWPct > 0  ? solidDiv({ width: `${trackWPct}%`,  height: '100%', background: C.green }) : null,
          breachWPct > 0 ? solidDiv({ width: `${breachWPct}%`, height: '100%', background: C.red })   : null,
        ].filter(Boolean) as any[]),
      ]);
    }

    return col({ gap: 0 }, [
      txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase' }, `${sectionNum} — ASSIGNEE VIEW`),
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: isFullWidth ? 24 : 20, color: C.text, marginTop: 5, marginBottom: 18 }, 'Assignee Wise Pending Tickets'),
      topAssignees.length > 0
        ? col({ gap: 0 }, topAssignees.map((a, i) => assigneeRow(a, i === topAssignees.length - 1)))
        : txt({ fontFamily: 'Inter', fontSize: 13, color: C.muted }, 'No assigned tickets'),
    ]);
  }

  function divider() {
    return solidDiv({ width: '100%', height: 1, background: C.border, marginTop: 30, marginBottom: 30 });
  }

  function footer(data: PendingReportData) {
    return row({
      background: C.surface,
      borderTop: `1px solid ${C.border}`,
      padding: `14px ${H_PAD}px`,
      alignItems: 'center',
      justifyContent: 'space-between',
    }, [
      txt({ fontFamily: 'Mono', fontSize: 10, color: C.muted, letterSpacing: 1 }, 'FLOW INTERNAL PORTAL · AUTOMATED DAILY REPORT · STANDARD SLA: 48H'),
      txt({ fontFamily: 'Mono', fontSize: 10, color: C.muted }, data.generatedAt),
    ]);
  }

  return { header, hero, slaSection, barSection, assigneeSection, divider, footer };
}

// ── Height estimator ──────────────────────────────────────────────────────────

function estimateHeight(data: PendingReportData): number {
  const deptRows     = Math.min(data.byDepartment.length, 8);
  const catRows      = Math.min(data.byContactReason.length, 10);
  const assigneeRows = Math.min(data.byAssignee.length, 12);

  const ROW_H_FULL   = 60;   // full-width dept rows
  const ROW_H_COL    = 64;   // 2-col rows (have sublabel/dept tag = taller)
  const SEC_OH       = 78;   // section overhead (tag + title + bottom margin)
  const DIV_H        = 61;   // divider (1px + 30px margin each side)

  // 2-col height = max of category col vs assignee col
  const catColH      = SEC_OH + catRows      * ROW_H_COL;
  const assigneeColH = SEC_OH + assigneeRows * ROW_H_COL;
  const twoColH      = Math.max(catColH, assigneeColH);

  return Math.ceil(
    64  +  // header
    200 +  // hero
    32  +  // body padding top
    220 +  // SLA section (bigger cards + 48h note)
    DIV_H + SEC_OH + deptRows * ROW_H_FULL +
    DIV_H + twoColH +
    40  +  // body padding bottom
    50  +  // footer
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

  // Category rows — include dept sublabel
  const topCats = data.byContactReason.slice(0, 10).map(c => ({
    label:    c.reason || 'Uncategorised',
    sublabel: c.dept   || undefined,
    total:    c.count,
    breached: c.breached,
    onTrack:  c.count - c.breached,
  }));
  const catMax = Math.max(...topCats.map(c => c.total), 1);

  const sec01Label = data.department ? 'CATEGORY BREAKDOWN' : 'DEPARTMENT BREAKDOWN';
  const sec01Title = data.department ? `${data.department} — Category Breakdown` : 'Department Wise Pending Tickets';
  const catTitle   = data.department ? 'Sub-Category Breakdown (L3/L4)' : 'Category Wise Pending Tickets (L3/L4)';

  const root = col({ width: REPORT_WIDTH, background: C.bg, fontFamily: 'Inter', color: C.text }, [
    L.header(data),
    L.hero(data),
    col({ padding: `30px ${H_PAD}px 40px`, gap: 0 }, [
      L.slaSection(data),
      L.divider(),
      L.barSection('02', sec01Label, sec01Title, topDepts, deptMax, CONTENT_W),
      L.divider(),
      // Two-column row: Category (left) + Assignee (right)
      // COL_W + COL_GAP + COL_W = 530 + 44 + 530 = 1104 = CONTENT_W  (exact fit, no overflow)
      row({ gap: COL_GAP, alignItems: 'flex-start' }, [
        col({ width: COL_W }, [
          L.barSection('03', 'CATEGORY VIEW (L3/L4)', catTitle, topCats, catMax, COL_W),
        ]),
        col({ width: COL_W }, [
          L.assigneeSection(data, '04', COL_W),
        ]),
      ]),
    ]),
    L.footer(data),
  ]);

  const svg = await satori(root as any, {
    width: REPORT_WIDTH,
    height: estimateHeight(data),
    embedFont: true,
    fonts: getFonts(),
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: REPORT_WIDTH },
    background: C.bg,
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
