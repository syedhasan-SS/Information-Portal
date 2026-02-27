/**
 * Pending Complaints Report — HTML Builder
 * Generates a rich, NPS-report-style HTML document for pending complaints.
 * Designed to be screenshotted by headless Chrome and shared as a Slack image.
 */

export interface PendingReportData {
  generatedAt: string;            // e.g. "26 Feb 2026, 9:00 AM PKT"
  totalPending: number;
  totalBreached: number;
  totalOnTrack: number;

  /** Department → count of pending tickets */
  byDepartment: Array<{ dept: string; count: number; breached: number }>;

  /** Assignee → count of assigned pending tickets */
  byAssignee: Array<{ name: string; dept: string; count: number; breached: number }>;

  /** SLA breakdown */
  sla: { onTrack: number; atRisk: number; breached: number };

  /** L1 contact reason → count */
  byContactReason: Array<{ reason: string; count: number; breached: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(val: number, total: number) {
  return total > 0 ? Math.round((val / total) * 100) : 0;
}

function bar(val: number, max: number, color: string) {
  const w = max > 0 ? Math.round((val / max) * 100) : 0;
  return `<div class="bar-bg"><div class="bar-fill" style="width:${w}%;background:${color}"></div></div>`;
}

// ── HTML Builder ──────────────────────────────────────────────────────────────

export function buildPendingReportHtml(data: PendingReportData): string {
  const deptMax = Math.max(...data.byDepartment.map(d => d.count), 1);
  const assigneeMax = Math.max(...data.byAssignee.map(a => a.count), 1);
  const reasonMax = Math.max(...data.byContactReason.map(r => r.count), 1);
  const slaTotal = data.sla.onTrack + data.sla.atRisk + data.sla.breached;

  // SLA donut arcs (SVG)
  const R = 72; const CIR = 2 * Math.PI * R;
  const breachedArc = slaTotal > 0 ? (data.sla.breached / slaTotal) * CIR : 0;
  const atRiskArc   = slaTotal > 0 ? (data.sla.atRisk   / slaTotal) * CIR : 0;
  const onTrackArc  = slaTotal > 0 ? (data.sla.onTrack  / slaTotal) * CIR : 0;
  const onTrackOffset  = 0;
  const atRiskOffset   = onTrackArc;
  const breachedOffset = onTrackArc + atRiskArc;

  // Top assignees (max 12 rows)
  const topAssignees = data.byAssignee.slice(0, 12);
  const assigneeRows = topAssignees.map((a, i) => {
    const breachPct = pct(a.breached, a.count);
    return `
      <tr class="${i % 2 === 0 ? 'row-alt' : ''}">
        <td class="td-rank">${i + 1}</td>
        <td class="td-name">${a.name}</td>
        <td class="td-dept"><span class="dept-chip">${a.dept}</span></td>
        <td class="td-count">${a.count}</td>
        <td class="td-bar">${bar(a.count, assigneeMax, '#5B9EF5')}</td>
        <td class="td-breach ${a.breached > 0 ? 'breach-hot' : 'breach-ok'}">${a.breached > 0 ? `🔴 ${a.breached}` : '✅ 0'}</td>
      </tr>`;
  }).join('');

  // Contact reason rows (max 10)
  const topReasons = data.byContactReason.slice(0, 10);
  const reasonRows = topReasons.map((r, i) => {
    const w = Math.round((r.count / reasonMax) * 100);
    return `
      <div class="reason-row">
        <div class="reason-rank">${i + 1}</div>
        <div class="reason-label">${r.reason || 'Uncategorised'}</div>
        <div class="reason-bar-wrap">
          <div class="reason-bar" style="width:${w}%"></div>
        </div>
        <div class="reason-count">${r.count}</div>
        ${r.breached > 0 ? `<div class="reason-breach">🔴 ${r.breached}</div>` : `<div class="reason-breach ok">—</div>`}
      </div>`;
  }).join('');

  // Department rows
  const deptRows = data.byDepartment.map((d) => {
    const w = Math.round((d.count / deptMax) * 100);
    const breachPct = pct(d.breached, d.count);
    const color = d.breached > 0 ? '#E8453C' : '#F5C518';
    return `
      <div class="dept-row">
        <div class="dept-name">${d.dept}</div>
        <div class="dept-bar-wrap">
          <div class="dept-bar" style="width:${w}%;background:${color}"></div>
        </div>
        <div class="dept-count">${d.count}</div>
        <div class="dept-breach ${d.breached > 0 ? 'breach-hot' : ''}">${d.breached > 0 ? `🔴 ${d.breached} breached` : '✅ On track'}</div>
      </div>`;
  }).join('');

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0c0c0c;--surface:#111;--card:#181818;--border:#252525;--border2:#2e2e2e;
  --yellow:#F5C518;--green:#3DD68C;--green-dim:rgba(61,214,140,.1);
  --red:#E8453C;--red-dim:rgba(232,69,60,.12);
  --blue:#5B9EF5;--orange:#F07C3A;
  --text:#ededed;--muted:#666;--subtle:#3a3a3a;
}
body{background:var(--bg);color:var(--text);font-family:'Syne',sans-serif;font-size:13px;width:900px}

/* ── HEADER ── */
header{
  background:var(--surface);border-bottom:1px solid var(--border);
  padding:20px 40px;display:flex;align-items:center;justify-content:space-between;
}
.logo-text{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:4px;color:var(--yellow)}
.header-right{text-align:right}
.header-title{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:var(--text)}
.header-sub{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);margin-top:2px;letter-spacing:1px}

/* ── HERO ── */
.hero{
  background:linear-gradient(135deg,#111 0%,#13120d 60%,#0f0f0f 100%);
  border-bottom:1px solid var(--border);
  padding:36px 40px 32px;position:relative;overflow:hidden;
}
.hero::after{
  content:'FLOW';position:absolute;right:-10px;top:-10px;
  font-family:'Bebas Neue',sans-serif;font-size:220px;letter-spacing:-4px;
  color:rgba(245,197,24,.025);pointer-events:none;line-height:1;
}
.hero-kicker{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--yellow);margin-bottom:8px}
.hero-heading{font-family:'Bebas Neue',sans-serif;font-size:44px;letter-spacing:1px;line-height:1;margin-bottom:6px}
.hero-heading span{color:var(--yellow)}
.hero-sub{color:var(--muted);font-size:13px;max-width:560px;line-height:1.5;margin-bottom:28px}
.hero-stats{display:flex;gap:40px;align-items:flex-end}
.hs{display:flex;flex-direction:column;gap:4px}
.hs-val{font-family:'Bebas Neue',sans-serif;font-size:48px;line-height:1}
.hs-val.red{color:var(--red)}
.hs-val.yellow{color:var(--yellow)}
.hs-val.green{color:var(--green)}
.hs-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)}
.hero-div{width:1px;height:56px;background:var(--border2)}

/* ── GREETING ── */
.greeting{
  background:linear-gradient(135deg,#191610,#181818);
  border:1px solid #2a2614;border-radius:12px;
  padding:20px 24px;margin:28px 40px 0;
  display:flex;align-items:flex-start;gap:14px;
}
.greet-icon{font-size:24px;flex-shrink:0;margin-top:2px}
.greet-text{font-size:13px;line-height:1.7;color:#c8c8c8}
.greet-text strong{color:var(--yellow)}

/* ── PAGE ── */
.page{padding:28px 40px 40px}
.sec-tag{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--yellow);margin-bottom:5px}
.sec-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:1px;margin-bottom:20px}
.sec-divider{border:none;border-top:1px solid var(--border);margin:32px 0 28px}

/* ── DEPT BARS ── */
.dept-row{display:grid;grid-template-columns:120px 1fr 48px 140px;align-items:center;gap:12px;margin-bottom:10px}
.dept-name{font-size:13px;font-weight:600;color:var(--text)}
.dept-bar-wrap{height:8px;background:var(--subtle);border-radius:999px;overflow:hidden}
.dept-bar{height:100%;border-radius:999px}
.dept-count{font-family:'Bebas Neue',sans-serif;font-size:20px;text-align:right}
.dept-breach{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.5px;color:var(--muted)}
.dept-breach.breach-hot{color:var(--red)}

/* ── BAR HELPER ── */
.bar-bg{height:6px;background:var(--subtle);border-radius:999px;overflow:hidden}
.bar-fill{height:100%;border-radius:999px}

/* ── SLA 3-COL ── */
.sla-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:8px}
.sla-card{
  background:var(--card);border:1px solid var(--border);
  border-radius:12px;padding:20px 22px;
}
.sla-card.breach{border-color:#3d1515;background:#130d0d}
.sla-card.risk{border-color:#2f2311;background:#120f08}
.sla-card.ok{border-color:#0e2318;background:#091510}
.sla-label{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.sla-num{font-family:'Bebas Neue',sans-serif;font-size:48px;line-height:1}
.sla-num.red{color:var(--red)}
.sla-num.orange{color:var(--orange)}
.sla-num.green{color:var(--green)}
.sla-sub{font-size:11px;color:var(--muted);margin-top:4px}
.sla-pct{font-family:'JetBrains Mono',monospace;font-size:11px;margin-top:6px}

/* ── DONUT ── */
.sla-donut-row{display:grid;grid-template-columns:200px 1fr;gap:28px;align-items:center;margin-top:16px}
.donut-wrap{position:relative;width:160px;height:160px}
.donut-wrap svg{width:100%;height:100%;transform:rotate(-90deg)}
.donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.donut-big{font-family:'Bebas Neue',sans-serif;font-size:38px;line-height:1;color:var(--text)}
.donut-small{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--muted);margin-top:2px}
.donut-legend{display:flex;flex-direction:column;gap:12px}
.dl-item{display:flex;align-items:center;gap:10px}
.dl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.dl-label{font-size:12px;color:var(--muted);flex:1}
.dl-count{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500}
.dl-pct{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--subtle);margin-left:4px}

/* ── ASSIGNEE TABLE ── */
.assign-table{width:100%;border-collapse:separate;border-spacing:0 5px}
.assign-table th{
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.5px;
  text-transform:uppercase;color:var(--muted);padding:0 12px 6px;text-align:left;
}
.assign-table td{padding:10px 12px;background:var(--card);border-top:1px solid var(--border);border-bottom:1px solid var(--border);font-size:12px}
.assign-table td:first-child{border-left:1px solid var(--border);border-radius:6px 0 0 6px}
.assign-table td:last-child{border-right:1px solid var(--border);border-radius:0 6px 6px 0}
.row-alt td{background:#151515}
.td-rank{color:var(--muted);font-family:'Bebas Neue',sans-serif;font-size:18px;width:28px}
.td-name{font-weight:600;color:var(--text)}
.td-dept{width:100px}
.td-count{font-family:'Bebas Neue',sans-serif;font-size:22px;width:40px;text-align:right}
.td-bar{width:180px}
.td-breach{font-family:'JetBrains Mono',monospace;font-size:10px;width:80px;text-align:right}
.breach-hot{color:var(--red) !important}
.breach-ok{color:var(--muted)}
.dept-chip{
  display:inline-block;background:var(--subtle);color:var(--muted);
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.5px;
  padding:2px 8px;border-radius:4px;
}

/* ── CONTACT REASON ── */
.reason-row{display:grid;grid-template-columns:24px 1fr 1fr 48px 72px;align-items:center;gap:10px;margin-bottom:8px}
.reason-rank{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--subtle)}
.reason-label{font-size:12px;font-weight:600;color:var(--text)}
.reason-bar-wrap{height:7px;background:var(--subtle);border-radius:999px;overflow:hidden}
.reason-bar{height:100%;border-radius:999px;background:var(--blue)}
.reason-count{font-family:'Bebas Neue',sans-serif;font-size:20px;text-align:right;color:var(--text)}
.reason-breach{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--red);text-align:right}
.reason-breach.ok{color:var(--muted)}

/* ── FOOTER ── */
footer{
  background:var(--surface);border-top:1px solid var(--border);
  padding:14px 40px;display:flex;align-items:center;justify-content:space-between;
}
.footer-left{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:.5px}
.footer-right{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--subtle)}
</style>
</head>
<body>

<!-- ── HEADER ── -->
<header>
  <div class="logo-text">⚡ FLEEK</div>
  <div class="header-right">
    <div class="header-title">Pending Complaints Report</div>
    <div class="header-sub">${data.generatedAt}</div>
  </div>
</header>

<!-- ── HERO ── -->
<div class="hero">
  <div class="hero-kicker">Daily Operations · Internal Report</div>
  <div class="hero-heading">Pending <span>Complaints</span></div>
  <div class="hero-sub">Overview of all open, new and pending cases requiring attention. Managers have been notified.</div>
  <div class="hero-stats">
    <div class="hs">
      <div class="hs-val yellow">${data.totalPending}</div>
      <div class="hs-label">Total Pending</div>
    </div>
    <div class="hero-div"></div>
    <div class="hs">
      <div class="hs-val red">${data.totalBreached}</div>
      <div class="hs-label">SLA Breached</div>
    </div>
    <div class="hero-div"></div>
    <div class="hs">
      <div class="hs-val green">${data.totalOnTrack}</div>
      <div class="hs-label">Within SLA</div>
    </div>
    <div class="hero-div"></div>
    <div class="hs">
      <div class="hs-val" style="color:#F07C3A">${data.sla.atRisk}</div>
      <div class="hs-label">At Risk</div>
    </div>
  </div>
</div>

<!-- ── GREETING ── -->
<div class="greeting">
  <div class="greet-icon">👋</div>
  <div class="greet-text">
    Hi everyone,<br/>
    Please find below the report of pending complaints as of <strong>${data.generatedAt}</strong>.<br/>
    Relevant department managers have been tagged in this message. Please action any breached or at-risk cases immediately.
  </div>
</div>

<div class="page">

  <!-- ── SECTION 1: DEPARTMENT WISE ── -->
  <div class="sec-tag">01 — Department</div>
  <div class="sec-title">Department Wise Pending Complaints</div>
  ${deptRows || '<div style="color:var(--muted);font-size:13px;padding:12px 0">No department data available</div>'}

  <hr class="sec-divider"/>

  <!-- ── SECTION 2: SLA STATUS ── -->
  <div class="sec-tag">02 — SLA</div>
  <div class="sec-title">SLA Status Breakdown</div>
  <div class="sla-row">
    <div class="sla-card breach">
      <div class="sla-label">Out of SLA</div>
      <div class="sla-num red">${data.sla.breached}</div>
      <div class="sla-sub">Breached tickets</div>
      <div class="sla-pct" style="color:var(--red)">${pct(data.sla.breached, slaTotal)}% of total</div>
    </div>
    <div class="sla-card risk">
      <div class="sla-label">At Risk</div>
      <div class="sla-num orange">${data.sla.atRisk}</div>
      <div class="sla-sub">Approaching breach</div>
      <div class="sla-pct" style="color:var(--orange)">${pct(data.sla.atRisk, slaTotal)}% of total</div>
    </div>
    <div class="sla-card ok">
      <div class="sla-label">Within SLA</div>
      <div class="sla-num green">${data.sla.onTrack}</div>
      <div class="sla-sub">On track</div>
      <div class="sla-pct" style="color:var(--green)">${pct(data.sla.onTrack, slaTotal)}% of total</div>
    </div>
  </div>

  <!-- SLA Donut -->
  <div class="sla-donut-row">
    <div class="donut-wrap">
      <svg viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="${R}" fill="none" stroke="#222" stroke-width="28"/>
        <!-- On Track (green) -->
        <circle cx="90" cy="90" r="${R}" fill="none" stroke="#3DD68C" stroke-width="28"
          stroke-dasharray="${onTrackArc} ${CIR - onTrackArc}"
          stroke-dashoffset="${-onTrackOffset}"/>
        <!-- At Risk (orange) -->
        <circle cx="90" cy="90" r="${R}" fill="none" stroke="#F07C3A" stroke-width="28"
          stroke-dasharray="${atRiskArc} ${CIR - atRiskArc}"
          stroke-dashoffset="${-atRiskOffset}"/>
        <!-- Breached (red) -->
        <circle cx="90" cy="90" r="${R}" fill="none" stroke="#E8453C" stroke-width="28"
          stroke-dasharray="${breachedArc} ${CIR - breachedArc}"
          stroke-dashoffset="${-breachedOffset}"/>
      </svg>
      <div class="donut-center">
        <div class="donut-big">${slaTotal}</div>
        <div class="donut-small">TOTAL</div>
      </div>
    </div>
    <div class="donut-legend">
      <div class="dl-item">
        <div class="dl-dot" style="background:#3DD68C"></div>
        <div class="dl-label">Within SLA</div>
        <div class="dl-count" style="color:#3DD68C">${data.sla.onTrack}</div>
        <div class="dl-pct">${pct(data.sla.onTrack, slaTotal)}%</div>
      </div>
      <div class="dl-item">
        <div class="dl-dot" style="background:#F07C3A"></div>
        <div class="dl-label">At Risk</div>
        <div class="dl-count" style="color:#F07C3A">${data.sla.atRisk}</div>
        <div class="dl-pct">${pct(data.sla.atRisk, slaTotal)}%</div>
      </div>
      <div class="dl-item">
        <div class="dl-dot" style="background:#E8453C"></div>
        <div class="dl-label">Out of SLA (Breached)</div>
        <div class="dl-count" style="color:#E8453C">${data.sla.breached}</div>
        <div class="dl-pct">${pct(data.sla.breached, slaTotal)}%</div>
      </div>
    </div>
  </div>

  <hr class="sec-divider"/>

  <!-- ── SECTION 3: ASSIGNEE WISE ── -->
  <div class="sec-tag">03 — Assignees</div>
  <div class="sec-title">Assignee Wise Case Count</div>
  <table class="assign-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Department</th>
        <th>Cases</th>
        <th>Distribution</th>
        <th style="text-align:right">Breached</th>
      </tr>
    </thead>
    <tbody>
      ${assigneeRows || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">No assigned cases</td></tr>'}
    </tbody>
  </table>

  <hr class="sec-divider"/>

  <!-- ── SECTION 4: CONTACT REASON ── -->
  <div class="sec-tag">04 — Contact Reasons</div>
  <div class="sec-title">Contact Reason Wise Pending Complaints</div>
  ${reasonRows || '<div style="color:var(--muted);font-size:13px;padding:12px 0">No category data available</div>'}

</div>

<!-- ── FOOTER ── -->
<footer>
  <div class="footer-left">FLOW Internal Portal · Automated Daily Report</div>
  <div class="footer-right">${data.generatedAt}</div>
</footer>

</body>
</html>`;
}

// ── Build data from raw tickets + users ───────────────────────────────────────

export function buildPendingReportData(
  tickets: any[],
  users: any[]
): PendingReportData {
  // Only pending/active tickets
  const pending = tickets.filter(
    t => t.status === 'New' || t.status === 'Open' || t.status === 'Pending'
  );

  const totalPending  = pending.length;
  const totalBreached = pending.filter(t => t.slaStatus === 'breached').length;
  const atRisk        = pending.filter(t => t.slaStatus === 'at_risk').length;
  const onTrack       = pending.filter(t => t.slaStatus === 'on_track').length;
  const totalOnTrack  = onTrack;

  const userMap = new Map<string, { name: string; dept: string }>(
    users.map((u: any) => [u.id, { name: u.name || u.email, dept: u.department || '' }])
  );

  // ── By department ─────────────────────────────────────────────────────────
  const deptMap = new Map<string, { count: number; breached: number }>();
  pending.forEach(t => {
    const d = t.department || 'Unassigned';
    const cur = deptMap.get(d) || { count: 0, breached: 0 };
    cur.count++;
    if (t.slaStatus === 'breached') cur.breached++;
    deptMap.set(d, cur);
  });
  const byDepartment = Array.from(deptMap.entries())
    .map(([dept, v]) => ({ dept, ...v }))
    .sort((a, b) => b.count - a.count);

  // ── By assignee ───────────────────────────────────────────────────────────
  const agentMap = new Map<string, { count: number; breached: number; dept: string }>();
  pending.forEach(t => {
    if (!t.assigneeId) return;
    const u = userMap.get(t.assigneeId);
    const cur = agentMap.get(t.assigneeId) || { count: 0, breached: 0, dept: u?.dept || '' };
    cur.count++;
    if (t.slaStatus === 'breached') cur.breached++;
    agentMap.set(t.assigneeId, cur);
  });
  const byAssignee = Array.from(agentMap.entries())
    .map(([id, v]) => ({
      name: userMap.get(id)?.name || 'Unknown',
      dept: v.dept,
      count: v.count,
      breached: v.breached,
    }))
    .sort((a, b) => b.count - a.count);

  // ── SLA ───────────────────────────────────────────────────────────────────
  const sla = { onTrack, atRisk, breached: totalBreached };

  // ── By contact reason (L1 category) ──────────────────────────────────────
  const reasonMap = new Map<string, { count: number; breached: number }>();
  pending.forEach(t => {
    // Use categorySnapshot.l1 if available, fallback to ticket.l1, then issueType
    const reason =
      (t.categorySnapshot?.l1) ||
      t.l1 ||
      t.issueType ||
      'Uncategorised';
    const cur = reasonMap.get(reason) || { count: 0, breached: 0 };
    cur.count++;
    if (t.slaStatus === 'breached') cur.breached++;
    reasonMap.set(reason, cur);
  });
  const byContactReason = Array.from(reasonMap.entries())
    .map(([reason, v]) => ({ reason, ...v }))
    .sort((a, b) => b.count - a.count);

  const generatedAt = new Date().toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) + ' PKT';

  return {
    generatedAt,
    totalPending,
    totalBreached,
    totalOnTrack,
    byDepartment,
    byAssignee,
    sla,
    byContactReason,
  };
}
