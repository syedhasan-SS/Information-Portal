/**
 * Serverless Report Image Renderer — Satori + resvg
 *
 * Generates a PNG image of the pending complaints report without Chrome.
 * Works on Vercel, Lambda, and any serverless environment.
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PendingReportData } from './report-html-builder';

// ── Font loading ──────────────────────────────────────────────────────────────

let _fonts: any[] | null = null;

function getFonts(): any[] {
  if (_fonts) return _fonts;

  function loadFont(name: string): Buffer {
    const candidates = [
      join(__dirname, 'fonts', name),
      join(process.cwd(), 'server', 'fonts', name),
      join(process.cwd(), 'dist', 'server', 'fonts', name),
    ];
    for (const p of candidates) {
      try { return readFileSync(p); } catch {}
    }
    throw new Error(`Font not found: ${name}`);
  }

  _fonts = [
    { name: 'Inter', data: loadFont('inter-regular.ttf'), weight: 400, style: 'normal' },
    { name: 'Inter', data: loadFont('inter-bold.ttf'),    weight: 700, style: 'normal' },
    { name: 'Mono',  data: loadFont('jetbrains-mono.ttf'),weight: 400, style: 'normal' },
  ];
  return _fonts;
}

// ── Colour palette ─────────────────────────────────────────────────────────────

const C = {
  bg:            '#0c0c0c',
  surface:       '#111111',
  card:          '#181818',
  border:        '#252525',
  border2:       '#2e2e2e',
  yellow:        '#F5C518',
  green:         '#3DD68C',
  red:           '#E8453C',
  orange:        '#F07C3A',
  blue:          '#5B9EF5',
  text:          '#ededed',
  muted:         '#888888',
  subtle:        '#3a3a3a',
  cardRed:       '#130d0d',
  cardOrange:    '#120f08',
  cardGreen:     '#091510',
  borderRed:     '#3d1515',
  borderOrange:  '#2f2311',
  borderGreen:   '#0e2318',
};

// ── Element helpers ────────────────────────────────────────────────────────────

type Child = Record<string, any> | string | null | undefined;

function row(style: Record<string, any>, children: Child[]): any {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'row', ...style },
      children: children.filter(Boolean),
    },
  };
}

function col(style: Record<string, any>, children: Child[]): any {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', flexDirection: 'column', ...style },
      children: children.filter(Boolean),
    },
  };
}

function txt(style: Record<string, any>, text: string): any {
  return {
    type: 'span',
    props: { style: { display: 'flex', ...style }, children: text },
  };
}

function pct(val: number, total: number) {
  return total > 0 ? Math.round((val / total) * 100) : 0;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
    txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 22, letterSpacing: 4, color: C.yellow }, 'FLEEK'),
    col({ alignItems: 'flex-end', gap: 3 }, [
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, letterSpacing: 2, color: C.text }, title),
      txt({ fontFamily: 'Mono', fontSize: 10, color: C.muted, letterSpacing: 1 }, data.generatedAt),
    ]),
  ]);
}

function hero(data: PendingReportData) {
  const kicker = data.department
    ? `${data.department.toUpperCase()} · DAILY DEPT REPORT`
    : 'DAILY OPERATIONS · INTERNAL REPORT';
  const heading = data.department
    ? `${data.department.toUpperCase()} PENDING TICKETS`
    : 'PENDING COMPLAINTS';
  const sub = data.department
    ? `Overview of open and pending cases in the ${data.department} department.`
    : 'Overview of all open, new and pending cases across all departments.';

  function stat(val: number, label: string, color: string) {
    return col({ gap: 4 }, [
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 44, lineHeight: 1, color }, String(val)),
      txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 2, color: C.muted, textTransform: 'uppercase' }, label),
    ]);
  }

  function vDivider() {
    return { type: 'div', props: { style: { display: 'flex', width: 1, height: 48, background: C.border2 }, children: [] } };
  }

  return col({
    background: '#111111',
    borderBottom: `1px solid ${C.border}`,
    padding: '30px 40px 26px',
    gap: 8,
  }, [
    txt({ fontFamily: 'Mono', fontSize: 10, letterSpacing: 3, color: C.yellow, textTransform: 'uppercase' }, kicker),
    txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 36, lineHeight: 1, color: C.text }, heading),
    txt({ fontFamily: 'Inter', fontSize: 12, color: C.muted, marginBottom: 12 }, sub),
    row({ gap: 36, alignItems: 'flex-end' }, [
      stat(data.totalPending,   'Total Pending', C.yellow),
      vDivider(),
      stat(data.totalBreached,  'Out of SLA',    C.red),
      vDivider(),
      stat(data.sla.atRisk,     'At Risk',       C.orange),
      vDivider(),
      stat(data.totalOnTrack,   'Within SLA',    C.green),
    ]),
  ]);
}

function slaSection(data: PendingReportData) {
  const slaTotal = data.sla.onTrack + data.sla.atRisk + data.sla.breached;

  function card(label: string, value: number, color: string, bg: string, bdr: string, sub: string) {
    return col({
      flex: 1,
      background: bg,
      border: `1px solid ${bdr}`,
      borderRadius: 10,
      padding: '18px 20px',
      gap: 5,
    }, [
      txt({ fontFamily: 'Mono', fontSize: 9, letterSpacing: 2, color: C.muted, textTransform: 'uppercase' }, label),
      txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 44, lineHeight: 1, color }, String(value)),
      txt({ fontFamily: 'Inter', fontSize: 11, color: C.muted }, sub),
      txt({ fontFamily: 'Mono', fontSize: 10, color }, `${pct(value, slaTotal)}% of total`),
    ]);
  }

  return col({ gap: 14 }, [
    row({ gap: 4 }, [
      txt({ fontFamily: 'Mono', fontSize: 9, letterSpacing: 3, color: C.yellow, textTransform: 'uppercase', marginBottom: 4 }, '01 — SLA VIEW'),
    ]),
    txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 20, color: C.text, marginBottom: 14 }, 'SLA Status Breakdown'),
    row({ gap: 14 }, [
      card('Out of SLA',  data.sla.breached, C.red,    C.cardRed,    C.borderRed,    'Breached tickets'),
      card('At Risk',     data.sla.atRisk,   C.orange, C.cardOrange, C.borderOrange, 'Approaching breach'),
      card('Within SLA',  data.sla.onTrack,  C.green,  C.cardGreen,  C.borderGreen,  'On track'),
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

    const shortLabel = item.label.length > 26
      ? item.label.slice(0, 24) + '…'
      : item.label;

    return col({ gap: 6, marginBottom: isLast ? 0 : 12 }, [
      // Label row
      row({ alignItems: 'center', gap: 0, width: 820 }, [
        txt({ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: C.text, width: 170, flexShrink: 0 }, shortLabel),
        txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: C.yellow, width: 40, flexShrink: 0, justifyContent: 'flex-end' }, String(item.total)),
        row({ flex: 1, gap: 16, justifyContent: 'flex-end' }, [
          txt({ fontFamily: 'Mono', fontSize: 11, color: C.green }, `+ ${item.onTrack} ok`),
          txt({ fontFamily: 'Mono', fontSize: 11, color: item.breached > 0 ? C.red : C.muted },
            item.breached > 0 ? `! ${item.breached} sla` : `- 0`),
        ]),
      ]),
      // Stacked bar
      row({ height: 7, borderRadius: 999, overflow: 'hidden', background: C.subtle, width: 820 }, [
        trackWPct > 0
          ? { type: 'div', props: { style: { display: 'flex', width: `${trackWPct}%`, height: '100%', background: C.green }, children: [] } }
          : null,
        breachWPct > 0
          ? { type: 'div', props: { style: { display: 'flex', width: `${breachWPct}%`, height: '100%', background: C.red }, children: [] } }
          : null,
      ].filter(Boolean) as any[]),
    ]);
  }

  return col({ gap: 0 }, [
    row({ gap: 4, marginBottom: 4 }, [
      txt({ fontFamily: 'Mono', fontSize: 9, letterSpacing: 3, color: C.yellow, textTransform: 'uppercase' }, `${sectionNum} — ${sectionLabel}`),
    ]),
    txt({ fontFamily: 'Inter', fontWeight: 700, fontSize: 20, color: C.text, marginBottom: 16 }, title),
    items.length > 0
      ? col({ gap: 0 }, items.map((item, i) => barRow(item, i === items.length - 1)))
      : txt({ fontFamily: 'Inter', fontSize: 12, color: C.muted, padding: '12px 0' }, 'No data available'),
  ]);
}

function divider() {
  return { type: 'div', props: { style: { display: 'flex', width: '100%', height: 1, background: C.border, marginTop: 26, marginBottom: 26 }, children: [] } };
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
    txt({ fontFamily: 'Mono', fontSize: 9, color: C.subtle }, data.generatedAt),
  ]);
}

// ── Height estimator ──────────────────────────────────────────────────────────

function estimateHeight(data: PendingReportData): number {
  const deptRows = Math.min(data.byDepartment.length, 8);
  const catRows  = Math.min(data.byContactReason.length, 10);
  const ROW_H    = 45;  // height per bar row (label + bar + gap)
  const SEC_OH   = 76;  // section tag + title overhead
  const DIV_H    = 53;  // divider (margins + line)

  return Math.ceil(
    56  +   // header
    180 +   // hero
    28  +   // body padding top
    176 +   // SLA section (fixed)
    DIV_H   +
    SEC_OH + deptRows * ROW_H +
    DIV_H   +
    SEC_OH + catRows  * ROW_H +
    36  +   // body padding bottom
    48  +   // footer
    80      // safety buffer
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function buildReportPng(data: PendingReportData): Promise<Buffer> {
  // Dept/category items
  const topDepts = data.byDepartment.slice(0, 8).map(d => ({
    label: d.dept,
    total: d.count,
    breached: d.breached,
    onTrack: d.count - d.breached,
  }));
  const deptMax = Math.max(...topDepts.map(d => d.total), 1);

  // Category items
  const topCats = data.byContactReason.slice(0, 10).map(c => ({
    label: c.reason || 'Uncategorised',
    total: c.count,
    breached: c.breached,
    onTrack: c.count - c.breached,
  }));
  const catMax = Math.max(...topCats.map(c => c.total), 1);

  const sec01Label = data.department ? 'CATEGORY BREAKDOWN' : 'DEPARTMENT BREAKDOWN';
  const sec01Title = data.department
    ? `${data.department} — Category Breakdown`
    : 'Department Wise Pending Tickets';

  const root = col({
    width: 900,
    background: C.bg,
    fontFamily: 'Inter',
    color: C.text,
  }, [
    header(data),
    hero(data),
    col({ padding: '28px 40px 36px', gap: 0 }, [
      slaSection(data),
      divider(),
      barSection('02', sec01Label, sec01Title, topDepts, deptMax),
      divider(),
      barSection('03', 'CATEGORY VIEW',
        data.department ? 'Sub-Category Breakdown' : 'Category Wise Pending Tickets',
        topCats, catMax),
    ]),
    footer(data),
  ]);

  // Render SVG via Satori
  const svg = await satori(root as any, {
    width: 900,
    height: estimateHeight(data),
    embedFont: true,
    fonts: getFonts(),
  });

  // Convert SVG → PNG via resvg
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 900 },
    background: C.bg,
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
