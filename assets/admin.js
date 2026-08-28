/* ============================================================
   Tilli Measures — School Admin (leadership) dashboard
   ------------------------------------------------------------
   One codebase, role-based views. This is the leadership surface
   (Coordinator / Principal), separate from the teacher dashboard.
   Vanilla JS state machine + hash router. No framework.

   Priority questions it answers (spec §1):
     1. Is it happening?   → Overview, Implementation (continuous)
     2. Is it working?     → Outcomes (periodic)
     3. Can I show it?     → Reports
     4. Where to intervene?→ Quiet sections, Concern queue

   Governing rule (spec §2): admin roles see WHO, not HOW. No
   student-level SEL results anywhere — no route exists for one.
   ============================================================ */
(function () {
  'use strict';

  var AD = window.ADMIN_DATA;
  var TS = window.TILLI_SCHOOL;
  if (!AD || !TS) { document.getElementById('ad-app').innerHTML = '<div class="ad-err">Dashboard data failed to load.</div>'; return; }

  // ---------- identity / role ----------
  var qp = new URLSearchParams(location.search);
  var session = null; try { session = JSON.parse(localStorage.getItem('tilliMeasures.session') || 'null'); } catch (e) {}
  var email = qp.get('email') || (session && session.email) || (TS.admins[0] && TS.admins[0].email);
  var me = TS.findAdmin(email) || TS.admins[0];
  var role = (session && session.role) || (me && me.role) || 'coordinator';
  var isCoordinator = role !== 'principal';   // coordinator = full; principal = view-only
  var isPrincipal = role === 'principal';

  var app = document.getElementById('ad-app');
  var modalRoot = document.getElementById('ad-modal-root');
  var toastEl = document.getElementById('ad-toast');

  // ---------- tiny utils ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Number-aware noun: countNoun(1,'child','children') → "1 child".
  function countNoun(n, singular, plural) { return n + ' ' + (Number(n) === 1 ? singular : plural); }
  function initials(name) { var p = String(name || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); }
  function relDays(d) { return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago'; }
  function plural(n, s) { return n + ' ' + s + (n === 1 ? '' : 's'); }
  var SCREENS = ['overview', 'implementation', 'outcomes', 'roster', 'reports', 'asktilli'];

  var toastTimer;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200); }

  // ---------- hover info boxes (tooltips) ----------
  // The domain vocabulary this dashboard quietly assumes. Each string is
  // shown in a small dark bubble when its label is hovered/focused, so a
  // leader who visits a few times a year never has to remember the jargon.
  var TIP = {
    emerging: 'Just starting to appear — the child needs regular adult support and prompts to use this skill.',
    developing: 'Shows up often but is not consistent yet — used with the occasional reminder.',
    secure: 'Steady and independent — the child uses it reliably across everyday situations.',
    cadence: 'Skill outcomes are measured three times a year: Baseline (start), Midline (middle) and Endline (end). This tag shows the point you are viewing and the next one due.',
    lastActivity: 'Days since anyone in this section last used Tilli.',
    sessions: 'Ask Tilli learning sessions children completed in the selected date range — a read on how actively the class is using the programme.',
    completion: 'How many students have finished the open assessment window. Completion only — never their scores.',
    statusCol: 'A quick read of recent momentum. Hover a status chip to see what Active, Slowing and Quiet mean.',
    active: 'Active — used Tilli recently and steadily.',
    slowing: 'Slowing — still active, but activity has dropped off lately.',
    quiet: 'Quiet — no activity for a while. A good place to check in.',
    quietSections: 'Sections with no Tilli activity for a while, most silent first. A prompt to offer help — never a judgement of the teacher.',
    movement: 'For each skill: how many children moved up a band, held steady, or moved down since Baseline. "Net up" is ups minus downs.',
    perspective: 'The same skills rated from three viewpoints — teacher, parent and the child\'s own answers. The gaps between them are often the interesting part.',
    effort: 'Support requests the teacher answered for children, per section — a measure of care given, not a ranking or a target.',
  };
  var PERSP_TIP = {
    'Teacher': 'How the class teacher rates these skills.',
    'Parent': 'How parents rate these skills at home.',
    'Student Direct': 'The children\'s own answers, gathered directly through Ask Tilli.',
  };
  // Wrap an already-safe label so hovering it (and the little ⓘ) shows `text`.
  // `cls` adds tooltip modifiers, e.g. 'down', 'down end'.
  function withInfo(labelHTML, text, cls) {
    return '<span class="ad-tip' + (cls ? ' ' + cls : '') + '" data-tip="' + esc(text) + '" tabindex="0">' +
      labelHTML + '<span class="ad-info" aria-hidden="true">i</span></span>';
  }

  // ---------- band rendering (shared by Outcomes + Reports) ----------
  // `targetSecure` (optional) draws a target marker on the bar (feedback §2):
  // Secure is the right-most segment, so an N% Secure target sits at (100−N)%
  // from the left — the green block should reach that line.
  function bandBar(dist, slim, targetSecure) {
    var p = dist.pct;
    var bar = '<div class="ad-bar' + (slim ? ' slim' : '') + '" role="img" aria-label="' +
      AD.bands.map(function (b) { return b.label + ' ' + p[b.key] + '%'; }).join(', ') + '">' +
      AD.bands.map(function (b) { return p[b.key] > 0 ? '<span style="width:' + p[b.key] + '%;background:' + b.color + '"></span>' : ''; }).join('') +
      '</div>';
    if (targetSecure == null) return bar;
    var left = Math.max(0, Math.min(100, 100 - targetSecure));
    return '<div class="ad-barwrap">' + bar +
      '<span class="ad-bar-target" style="left:' + left + '%" title="Target: ' + targetSecure + '% Secure"></span></div>';
  }
  // "62% Secure · target 70% (8 pts to go)" — the text half of the benchmark.
  function targetDelta(actualSecure, targetSecure) {
    if (targetSecure == null) return '';
    var gap = targetSecure - actualSecure;
    return '<span class="ad-targetdelta' + (gap <= 0 ? ' met' : '') + '">Target ' + targetSecure + '% Secure · ' +
      (gap <= 0 ? 'met' : gap + (gap === 1 ? ' pt to go' : ' pts to go')) + '</span>';
  }
  function bandLegend() {
    return '<div class="ad-legend">' + AD.bands.map(function (b) {
      return '<span class="ad-bandchip ad-tip" data-tip="' + esc(TIP[b.key] || '') + '" tabindex="0"><i style="background:' + b.color + '"></i>' + b.label + '</span>';
    }).join('') + '</div>';
  }
  // Cadence label — every periodic module carries one (spec §3).
  function cadence(pointKey) {
    var pt = AD.points.find(function (p) { return p.key === pointKey; }) || AD.latestComplete;
    if (!pt) return '';   // no completed point yet (No-data lifecycle state)
    var next = AD.openPoint;
    return '<span class="ad-cadence ad-tip end" data-tip="' + esc(TIP.cadence) + '" tabindex="0">' + esc(pt.label) + ' · ' + esc(pt.month) +
      (next ? '<span class="next">Next: ' + esc(next.label) + ' · ' + esc(next.month) + '</span>' : '') +
      '<span class="ad-info" aria-hidden="true">i</span></span>';
  }

  // ============================================================
  //  Config flag — see spec §2. Showing an individual child's stage
  //  to leadership breaks the "identity, not outcomes" wall. Kept
  //  behind this single flag so it is a one-line change to remove.
  //  TODO(privacy): set to false to honour the spec.
  // ============================================================
  var SHOW_STUDENT_STAGE = false;   // was true — restored the privacy wall (feedback: never breach it in a demo).

  // Aggregate band distribution across ALL skills, for any set of
  // students at a point (used by the grade/section navigator cards).
  function distAllSkills(students, pointKey) {
    var c = { emerging: 0, developing: 0, secure: 0 }, n = 0;
    var f = AD.points.find(function (p) { return p.key === pointKey; }).scoreField;
    students.forEach(function (st) { st.skills.forEach(function (sk) { c[AD.bandOf(sk[f])]++; n++; }); });
    n = n || 1;
    return { n: n, counts: c, pct: { emerging: Math.round(c.emerging / n * 100), developing: Math.round(c.developing / n * 100), secure: Math.round(c.secure / n * 100) } };
  }
  function pctLine(d) { return '<div class="nc-pcts">' + AD.bands.map(function (b) { return '<span>' + d.pct[b.key] + '% ' + esc(b.label) + '</span>'; }).join('') + '</div>'; }

  // ---------- Progress-over-time stacked-area chart ----------
  // One combined chart tracing the band mix (Emerging / Developing /
  // Secure, stacked to 100%) across the completed assessment points.
  // `skillKey===''` pools every skill; otherwise a single skill's arc.
  // NEVER interpolates: only completed points become nodes; incomplete
  // points appear as faded ticks on the axis with no area drawn into them.
  function progRows(students, skillKey) {   // time on x-axis: one node per completed point
    return AD.completedPoints.map(function (pt) {
      var d = skillKey ? AD.distribution(students, skillKey, pt.key) : distAllSkills(students, pt.key);
      return { label: pt.label, sub: pt.month, pct: d.pct, n: d.n };
    });
  }
  function progRowsBySkill(students, pointKey, onlySkillKey) {   // skills on x-axis: one node per skill, at one point
    var list = onlySkillKey ? AD.skills.filter(function (sk) { return sk.key === onlySkillKey; }) : AD.skills;
    return list.map(function (sk) { var d = AD.distribution(students, sk.key, pointKey); return { label: sk.name, sub: '', pct: d.pct, n: d.n }; });
  }
  // Catmull-Rom → cubic-bezier smoothing through {x,y} nodes.
  function smoothD(pts) {
    if (!pts.length) return '';
    if (pts.length === 1) return 'M' + pts[0].x + ' ' + pts[0].y;
    var d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }
  function progChartSVG(rows, opts) {
    opts = opts || {};
    var rotate = !!opts.rotate, showVals = opts.showVals !== false;
    // W is the container's real pixel width so 1 unit = 1px → fonts / strokes /
    // dots keep a constant on-screen size at any card width; only spacing stretches.
    // Rotated skill labels lean down-left, so the first/last points need extra
    // horizontal room; padL/padB grow in rotate mode to keep every label inside.
    var W = opts.W || 720, H = 320, padL = rotate ? 74 : 34, padR = 34, padT = 26, padB = rotate ? 96 : 52;
    var x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    var nPts = rows.length;
    var xAt = function (i) { return nPts === 1 ? (x0 + x1) / 2 : x0 + (i / (nPts - 1)) * (x1 - x0); };
    var yAt = function (v) { return y1 - (v / 100) * (y1 - y0); };
    // horizontal grid + % axis
    var grid = '';
    [0, 25, 50, 75, 100].forEach(function (v) {
      var y = yAt(v);
      grid += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y + '" stroke="var(--line-200)" stroke-width="1"' + (v === 0 ? '' : ' stroke-dasharray="3 6"') + '/>';
      grid += '<text x="' + (x0 - 8) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--ink-300)" font-family="Montserrat">' + v + '</text>';
    });
    // Three INDEPENDENT series (not stacked) — each band plots its own % 0–100
    // across the points, free to rise, fall and cross. Soft area under a bold line.
    var SERIES = ['secure', 'developing', 'emerging'].map(function (k) { return { key: k, meta: AD.bandMeta(k) }; });
    var areas = '', lines = '', dots = '';
    SERIES.forEach(function (s) {
      var top = rows.map(function (r, i) { return { x: xAt(i), y: yAt(r.pct[s.key]) }; });
      if (nPts >= 2) {
        // area: smooth line, then straight down to the baseline and back — translucent so overlaps read
        areas += '<path d="' + smoothD(top) + ' L' + top[top.length - 1].x.toFixed(1) + ' ' + y1 + ' L' + top[0].x.toFixed(1) + ' ' + y1 + ' Z" fill="' + s.meta.color + '" fill-opacity="0.14"/>';
        lines += '<path d="' + smoothD(top) + '" fill="none" stroke="' + s.meta.color + '" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round"/>';
      }
      top.forEach(function (p) { dots += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4.5" fill="#fff" stroke="' + s.meta.color + '" stroke-width="2.75"/>'; });
    });
    // value labels — haloed so they stay legible wherever areas overlap.
    // Suppressed when there are many x-points (skills view) or they'd collide.
    var overlay = '';
    rows.forEach(function (r, i) {
      var x = xAt(i);
      if (showVals) SERIES.forEach(function (s) {
        var v = r.pct[s.key], y = yAt(v);
        overlay += '<text x="' + x + '" y="' + (y - 9) + '" text-anchor="middle" font-size="12" font-weight="800" font-family="Montserrat" paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round" fill="' + s.meta.color + '">' + v + '%</text>';
      });
      if (rotate) {
        var short = r.label.length > 15 ? r.label.slice(0, 14).replace(/\s+$/, '') + '…' : r.label;
        overlay += '<text x="' + x + '" y="' + (y1 + 14) + '" text-anchor="end" transform="rotate(-32 ' + x + ' ' + (y1 + 14) + ')" font-size="10" font-weight="700" fill="var(--ink-450)" font-family="Montserrat"><title>' + esc(r.label) + '</title>' + esc(short) + '</text>';
      } else {
        overlay += '<text x="' + x + '" y="' + (y1 + 20) + '" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ink-700)" font-family="Montserrat">' + esc(r.label) + '</text>';
        if (r.sub) overlay += '<text x="' + x + '" y="' + (y1 + 36) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--ink-300)" font-family="Montserrat">' + esc(r.sub) + '</text>';
      }
    });
    // faded ticks for points that aren't measured yet (time view only)
    var futTicks = opts.showFuture ? AD.points.filter(function (p) { return p.status !== 'complete'; }).map(function (p) {
      return '<span class="ad-progfut"><i>' + esc(p.label) + '</i>' + esc(p.status === 'open' ? p.month + ' · collecting' : 'not yet measured') + '</span>';
    }).join('') : '';
    return '<div class="ad-progchart"><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Band distribution across assessment points">' +
      grid + areas + lines + dots + overlay + '</svg></div>' + (futTicks ? '<div class="ad-progfuts">' + futTicks + '</div>' : '');
  }
  // Resolve the current view from the two selectors.
  //  • Period = "All" → time on the x-axis (Baseline→Endline) for the chosen skill (or pooled).
  //  • A specific period → skills on the x-axis at that point (all skills, or just the chosen one).
  function progView(students) {
    // guard against a stale period selection after a lifecycle change
    if (progPeriod !== 'all' && !AD.completedPoints.some(function (p) { return p.key === progPeriod; })) progPeriod = 'all';
    var skillName = progSkill ? (AD.skills.find(function (s) { return s.key === progSkill; }) || {}).name : '';
    if (progPeriod === 'all') {                        // TIME on x-axis
      return { rows: progRows(students, progSkill), opts: { showFuture: true },
        cap: 'Band mix across assessment points — ' + (progSkill ? esc(skillName) : 'all skills pooled') + '.' };
    }
    var pLabel = (AD.completedPoints.find(function (p) { return p.key === progPeriod; }) || {}).label || '';
    var rows = progRowsBySkill(students, progPeriod, progSkill);
    return { rows: rows, opts: { rotate: true, showVals: rows.length <= 5 },
      cap: (progSkill ? esc(skillName) : 'Band mix across every skill') + ' at ' + esc(pLabel) + '.' };
  }
  // Container pixel width → SVG unit width, so on-screen sizes stay constant.
  function progW() { var h = document.getElementById('o-progchart'); return h && h.clientWidth ? Math.max(320, Math.round(h.clientWidth)) : 720; }
  // Head (legend + selectors + caption) + an empty chart host filled by drawProgChart.
  function progOverTimeHTML(students) {
    var v = progView(students);
    var skillOpts = '<option value=""' + (progSkill ? '' : ' selected') + '>All skills</option>' +
      AD.skills.map(function (sk) { return '<option value="' + esc(sk.key) + '"' + (sk.key === progSkill ? ' selected' : '') + '>' + esc(sk.name) + '</option>'; }).join('');
    var periodOpts = '<option value="all"' + (progPeriod === 'all' ? ' selected' : '') + '>All periods</option>' +
      AD.completedPoints.map(function (p) { return '<option value="' + esc(p.key) + '"' + (p.key === progPeriod ? ' selected' : '') + '>' + esc(p.label) + '</option>'; }).join('');
    var head = '<div class="ad-proghead"><div>' + bandLegend() + '</div><div class="ad-progselects">' +
      '<label class="select-wrap"><select class="select" id="o-progskill" title="Trace all skills pooled together, or one skill on its own">' + skillOpts + '</select></label>' +
      '<label class="select-wrap"><select class="select" id="o-progperiod" title="All periods = time on the x-axis. Pick one period = every skill on the x-axis at that point.">' + periodOpts + '</select></label>' +
      '</div></div>';
    return head + '<div class="ad-progcap">' + v.cap + '</div><div id="o-progchart" class="ad-progchart"></div>';
  }
  // Measure, then draw the SVG at 1 unit = 1px. Called after insertion and on resize.
  function drawProgChart(students) {
    var host = document.getElementById('o-progchart'); if (!host) return;
    var v = progView(students); v.opts.W = progW();
    host.innerHTML = progChartSVG(v.rows, v.opts);
  }
  var progStudents = null, progResizeBound = false;   // latest scope for the chart + its resize redraw
  function bindProgResize() {
    if (progResizeBound) return; progResizeBound = true;
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (progStudents) drawProgChart(progStudents); }, 150); });
  }

  // ---------- multi-perspective radar (mock; spec-new) ----------
  var PERSP_COLORS = { teacher: '#4A90D9', parent: '#56C02B', studentDirect: '#F0A84A' };
  function perspSeries(students, pointKey) {
    var rows = AD.perspectiveRadar(students, pointKey);
    return {
      axes: rows.map(function (r) { return r.name; }),
      series: [
        { label: 'Teacher', color: PERSP_COLORS.teacher, values: rows.map(function (r) { return r.teacher; }) },
        { label: 'Parent', color: PERSP_COLORS.parent, values: rows.map(function (r) { return r.parent; }) },
        { label: 'Student Direct', color: PERSP_COLORS.studentDirect, values: rows.map(function (r) { return r.studentDirect; }) },
      ],
    };
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function shortAxis(name) { return name.length > 15 ? name.replace(/\s*\(.*\)\s*/, ' ').trim().slice(0, 15) : name; }
  function radarSVG(series, axes) {
    var N = axes.length, cx = 190, cy = 165, R = 108, W = 380, H = 320, top = -Math.PI / 2;
    function pt(i, r) { var a = top + (i / N) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Multi-perspective radar across skills">';
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      var p = []; for (var i = 0; i < N; i++) { var q = pt(i, R * f); p.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      s += '<polygon points="' + p.join(' ') + '" fill="none" stroke="var(--line-200)" stroke-width="1"/>';
    });
    for (var i = 0; i < N; i++) {
      var e = pt(i, R); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" stroke="var(--line-200)" stroke-width="1"/>';
      var l = pt(i, R + 13); var anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] < cx ? 'end' : 'start');
      s += '<text x="' + l[0].toFixed(1) + '" y="' + l[1].toFixed(1) + '" text-anchor="' + anchor + '" dominant-baseline="middle" font-size="8" font-weight="700" fill="var(--ink-450)" font-family="Montserrat,sans-serif">' + esc(shortAxis(axes[i])) + '</text>';
    }
    series.forEach(function (ser) {
      var p = []; for (var i = 0; i < N; i++) { var r = R * clamp01(ser.values[i] / 100); var q = pt(i, r); p.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      s += '<polygon points="' + p.join(' ') + '" fill="' + ser.color + '" fill-opacity="0.13" stroke="' + ser.color + '" stroke-width="2" stroke-linejoin="round"/>';
    });
    return s + '</svg>';
  }
  function radarBlock(students, pointKey) {
    var ps = perspSeries(students, pointKey);
    return '<div class="ad-radar-wrap">' + radarSVG(ps.series, ps.axes) +
      '<div class="ad-radar-legend">' + ps.series.map(function (s) { return '<span class="ad-tip" data-tip="' + esc(PERSP_TIP[s.label] || '') + '" tabindex="0"><i style="background:' + s.color + '"></i>' + esc(s.label) + '</span>'; }).join('') + '</div></div>';
  }

  // ---------- state components ----------
  function stEmpty(bigLine, sub, ok) {
    return '<div class="ad-empty' + (ok ? ' ok' : '') + '"><span class="big">' + esc(bigLine) + '</span>' + (sub ? esc(sub) : '') + '</div>';
  }
  function stError(what) {
    return '<div class="ad-err">' + esc(what) + '<br><button class="btn btn-outline btn-sm" data-retry="1">Retry</button></div>';
  }
  function skelLines(n) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="skeleton ad-skel" style="width:' + (90 - i * 12) + '%"></div>'; return s; }
  function skelCard(title) { return '<div class="ad-card"><div class="ad-skel skeleton" style="width:40%;height:16px;margin-bottom:14px"></div>' + skelLines(4) + '</div>'; }
  function screenSkeleton() { return '<div class="ad-skel skeleton" style="width:38%;height:26px;margin:6px 0 18px"></div><div class="ad-grid two">' + skelCard() + skelCard() + skelCard() + skelCard() + '</div>'; }

  // ========================================================
  //  ROUTER
  // ========================================================
  var lastHash = null, loadTimer, loadedScreens = {};

  function buildHash(screen, params) {
    var q = Object.keys(params || {}).filter(function (k) { return params[k] !== '' && params[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    return '#/' + screen + (q ? '?' + q : '');
  }
  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var qi = h.indexOf('?');
    var screen = (qi < 0 ? h : h.slice(0, qi)) || 'overview';
    var params = {};
    if (qi >= 0) h.slice(qi + 1).split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)); params[k] = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1)); });
    if (SCREENS.indexOf(screen) < 0) screen = 'overview';
    return { screen: screen, params: params };
  }
  function go(screen, params, opts) {
    var hash = buildHash(screen, params);
    if (opts && opts.replace) { history.replaceState(null, '', hash); render(); }
    else if (location.hash === hash) { render(); }
    else { location.hash = hash; }  // hashchange → render
  }
  // Update filter params on the CURRENT screen (shareable URL), no history spam.
  function setParams(params, replace) { var r = currentRoute(); go(r.screen, params, { replace: replace !== false }); }

  window.addEventListener('hashchange', function () { if (location.hash !== lastHash) render(); });

  // ========================================================
  //  CHROME (sidebar / header / bottom nav)
  // ========================================================
  var ICONS = {
    asktilli: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>',
    overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    implementation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
    outcomes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    roster: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  };
  var NAV = [
    { key: 'overview', label: 'Overview' },
    { key: 'outcomes', label: 'Outcomes' },
    { key: 'roster', label: 'Roster' },      // absent for principal
    { key: 'reports', label: 'Reports' },
    { key: 'asktilli', label: 'Ask Tilli' }, // live assistant — also reachable via the floating button
  ];
  function navItems() { return NAV.filter(function (n) { return !(n.key === 'roster' && isPrincipal); }); }

  function chromeHTML(r) {
    var roleLabel = isPrincipal ? 'Principal' : (role === 'tilli' ? 'Tilli Team' : 'Coordinator');
    var yr = AD.academicYears;
    var yearCtrl = yr.length > 1
      ? '<span class="ad-year">' + esc(yr[yr.length - 1]) + ' ▾</span>'   // selector only when >1 year (spec §10.3)
      : '<span class="ad-year">' + esc(yr[0]) + '</span>';
    var side = '<aside class="ad-side dash-side">' +
      '<span class="lockup"><img src="_ds/tilli/assets/logos/tilli-wordmark-crop.png" alt="Tilli"><span class="divider"></span><span class="measures">Measures</span></span>' +
      '<nav class="ad-nav">' + navItems().map(function (n) {
        if (n.disabled) return '<button class="ad-nav-item disabled" data-navsoon="1" title="Coming soon to the leadership view"><span class="ic">' + ICONS[n.key] + '</span>' + esc(n.label) + '<span class="ad-soon">Soon</span></button>';
        return '<button class="ad-nav-item' + (n.key === r.screen ? ' on' : '') + '" data-nav="' + n.key + '"><span class="ic">' + ICONS[n.key] + '</span>' + esc(n.label) + '</button>';
      }).join('') + '</nav>' +
      '<div class="ad-side-foot">Leadership view · data updates 3× a year for outcomes, daily for activity.</div></aside>';

    var header = '<header class="ad-header dash-header">' +
      '<div><div class="ad-school">' + esc(AD.school.name) + '</div><div class="ad-sub desk-only">' + esc(AD.school.city + ', ' + AD.school.country) + '</div></div>' +
      '<div style="margin-left:auto;display:flex;align-items:center;gap:12px">' + yearCtrl +
      '<span class="ad-rolebadge">' + esc(roleLabel) + '</span>' +
      '<button class="ad-acct" id="ad-acct-btn" aria-label="Account menu">' + esc(initials(me.name).toUpperCase()) + '</button></div></header>';

    var bottom = '<nav class="ad-bottomnav dash-bottomnav">' + navItems().filter(function (n) { return !n.disabled && n.key !== 'asktilli'; }).map(function (n) {
      return '<button class="' + (n.key === r.screen ? 'on' : '') + '" data-nav="' + n.key + '">' + ICONS[n.key] + '<span>' + esc(n.label) + '</span></button>';
    }).join('') + '</nav>';

    return side + '<div><div style="position:relative">' + header + '</div>' +
      '<main class="ad-main"><div class="ad-wrap"><div id="ad-main-body"></div></div></main></div>' + bottom;
  }

  function wireChrome() {
    app.querySelectorAll('[data-nav]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.nav, {}); }); });
    app.querySelectorAll('[data-navsoon]').forEach(function (b) { b.addEventListener('click', function () { toast('Ask Tilli is coming to the leadership view soon.'); }); });
    var acct = document.getElementById('ad-acct-btn');
    if (acct) acct.addEventListener('click', function (ev) { ev.stopPropagation(); openAcctMenu(); });
  }
  function openAcctMenu() {
    closeAcctMenu();
    var m = document.createElement('div');
    m.className = 'ad-acct-menu'; m.id = 'ad-acct-menu';
    // Tilli Team drilled in from the internal platform — offer a way back to it.
    var fromTilli = qp.get('from') === 'tilli' || role === 'tilli';
    m.innerHTML = '<div class="who"><b>' + esc(me.name) + '</b><span>' + esc(me.email) + '</span></div>' +
      (fromTilli ? '<button data-am="tilli">← Tilli platform</button>' : '') +
      '<button data-am="switch">Switch school year</button>' +
      '<button data-am="signout">Sign out</button>';
    document.querySelector('.ad-header').parentNode.appendChild(m);
    if (fromTilli) m.querySelector('[data-am="tilli"]').addEventListener('click', function () { location.href = 'tilli.html?email=' + encodeURIComponent(me.email); });
    m.querySelector('[data-am="signout"]').addEventListener('click', function () { try { localStorage.removeItem('tilliMeasures.session'); } catch (e) {} location.href = 'index.html'; });
    m.querySelector('[data-am="switch"]').addEventListener('click', function () { toast('Only one academic year of data exists yet.'); closeAcctMenu(); });
    setTimeout(function () { document.addEventListener('click', closeAcctMenu, { once: true }); }, 0);
  }
  function closeAcctMenu() { var m = document.getElementById('ad-acct-menu'); if (m) m.remove(); }

  // ========================================================
  //  RENDER
  // ========================================================
  function render() {
    lastHash = location.hash;
    var r = currentRoute();
    if (r.screen === 'roster' && !isCoordinator) { go('overview', {}, { replace: true }); return; }
    if (r.screen === 'implementation') { go('overview', {}, { replace: true }); return; }   // Implementation removed from nav
    closeAcctMenu();
    app.innerHTML = chromeHTML(r);
    var body = document.getElementById('ad-main-body');
    if (!loadedScreens[r.screen]) {
      body.innerHTML = screenSkeleton();
      clearTimeout(loadTimer);
      loadTimer = setTimeout(function () { loadedScreens[r.screen] = true; render(); }, 340);
    } else {
      try { SCREEN[r.screen](r.params, body); }
      catch (e) { console.error(e); body.innerHTML = stError('This screen could not be built.'); }
    }
    wireChrome();
    syncFab();
  }

  // small helpers for building modules
  function card(title, note, bodyHTML, extraClass, headRight, tipText) {
    var titleHTML = tipText ? withInfo(esc(title), tipText) : esc(title);
    return '<div class="ad-card ' + (extraClass || '') + '">' +
      (title ? '<div class="ad-mod-h"><div><h3 class="ad-mod-title">' + titleHTML + '</h3>' + (note ? '<p class="ad-mod-note">' + note + '</p>' : '') + '</div>' + (headRight || '') + '</div>' : '') +
      bodyHTML + '</div>';
  }
  function screenHead(title, sub) { return '<h1 class="ad-screen-title">' + esc(title) + '</h1><p class="ad-screen-sub">' + esc(sub) + '</p>'; }
  function selectWrap(id, options, current, label) {
    return '<label class="select-wrap"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '><select class="select" id="' + id + '">' +
      options.map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(o.v) === String(current) ? ' selected' : '') + '>' + esc(o.t) + '</option>'; }).join('') +
      '</select></label>';
  }

  var SCREEN = {};

  // ========================================================
  //  1) OVERVIEW  (spec §5.1)
  // ========================================================
  // Skill band distribution body — where children sit across bands per skill,
  // split into Social-Emotional / Executive Function buckets. Shared: the
  // Overview renders it whole-school; kept as a plain helper so scope/point
  // are passed in rather than closed over.
  function skillBandDistBody(students, point, gradeBand) {
    function distSkillRow(sk) {
      var d = AD.distribution(students, sk.key, point);
      var interp = AD.interpret(sk.key, gradeBand, point, AD.shapeOf(d));
      // School-scope rows carry the skill's Secure target so every bar has a "vs what?".
      var tgt = (AD.targetsSet && gradeBand === 'school') ? AD.skillSecureTarget(sk.key) : null;
      return '<div class="ad-skillrow"><div class="ad-skillname">' + esc(sk.name) + '<small>' + (sk.group === 'sel' ? 'Social-emotional' : 'Executive function') + '</small></div>' +
        '<div>' + bandBar(d, false, tgt) + (tgt != null ? targetDelta(d.pct.secure, tgt) : '') +
        '<p class="ad-interp' + (interp.placeholder ? ' placeholder' : '') + '">' + esc(interp.text) + '</p></div></div>';
    }
    function distBucket(title, groupKey) {
      var list = AD.skills.filter(function (s) { return s.group === groupKey; });
      return '<details class="ad-bucket" open>' +
        '<summary class="ad-bucket-sum"><span class="ad-bucket-chev">▾</span>' +
        '<span class="ad-bucket-title">' + esc(title) + '</span>' +
        '<span class="ad-bucket-count">' + list.length + ' skills</span></summary>' +
        '<div class="ad-bucket-body">' + list.map(distSkillRow).join('') + '</div></details>';
    }
    return '<div style="margin-bottom:14px">' + bandLegend() + '</div>' +
      distBucket('Social-Emotional', 'sel') +
      distBucket('Executive Function', 'cog');
  }

  // Verdict banner (feedback §1/§2/§3) — the answer before the evidence.
  // One headline (is it working + direction of travel), one sub-line
  // (adoption + children moved + window), and a pooled band bar with the
  // Secure target marked. Adapts to every lifecycle state.
  function verdictHTML() {
    var v = AD.leadershipVerdict();
    var actLine = v.sectionsActive + ' of ' + v.sectionsTotal + ' classes active';
    var windowLine = v.openPoint ? v.openPoint.label + ' closes in ' + v.endlineInDays + ' days' : '';
    var head, sub, cls = '';
    if (!v.hasOutcomes) {
      head = 'The programme is running — no skills measured yet.';
      sub = [actLine, v.openPoint ? v.openPoint.label + ' window is collecting now' : ''].filter(Boolean).join(' · ');
    } else if (v.deltaSecure == null) {
      head = v.pctSecure + '% of skill readings are Secure at ' + v.point.label + ' — your starting point.';
      sub = [actLine, windowLine].filter(Boolean).join(' · ');
    } else {
      var arrow = v.deltaSecure > 0 ? '▲' : v.deltaSecure < 0 ? '▼' : '—';
      cls = v.deltaSecure > 0 ? ' good' : v.deltaSecure < 0 ? ' watch' : '';
      head = v.pctSecure + '% of skill readings are Secure at ' + v.point.label + ' — ' +
        (v.deltaSecure === 0 ? 'level with Baseline.' : arrow + ' ' + Math.abs(v.deltaSecure) + ' points since Baseline.');
      var moved = v.movementAvail ? v.childrenUp + ' of ' + countNoun(v.childrenN, 'child', 'children') + ' moved up a band' : '';
      sub = [actLine, moved, windowLine].filter(Boolean).join(' · ');
    }
    var right = '';
    if (v.hasOutcomes) {
      var d = schoolDistAllSkills(v.point.key);
      right = '<div class="ad-verdict-right">' + bandBar(d, false, v.targetSecure) +
        (v.targetSecure != null ? '<div class="ad-verdict-tgt"><span class="tk"></span>Target ' + v.targetSecure + '% Secure' +
          (v.pctSecure >= v.targetSecure ? ' · met' : ' · ' + (v.targetSecure - v.pctSecure) + ' pts to go') + '</div>' : '') +
        '<div style="margin-top:4px">' + bandLegend() + '</div></div>';
    }
    return '<div class="ad-status ad-verdict' + cls + '"><div class="ad-verdict-main">' +
      '<div class="ad-verdict-head">' + esc(head) + '</div>' +
      (sub ? '<div class="ad-verdict-sub">' + esc(sub) + '</div>' : '') + '</div>' + right + '</div>';
  }

  SCREEN.overview = function (params, body) {
    // 5) Last outcome snapshot (periodic)
    var snap = outcomeSnapshot();

    // Quick-count chips (identity/setup counts — continuous, no cadence).
    var chips = '<div class="ad-chiprow">' +
      metachip(AD.students.length, 'students') +
      metachip(AD.teachers.length, 'staff members') +
      metachip(AD.sections.length, 'sections') +
      metachip(AD.skills.length, 'skills tracked') + '</div>';

    // Areas of growth / strength — whole-school digest (top 2 each). Mirrors the
    // per-class cards on Outcomes; the "See class breakdown" link drills in.
    var gsSection = '';
    if (AD.completedPoints.length) {
      var gs = AD.growthStrength(AD.students, AD.latestComplete.key, 2);
      var em = AD.bandMeta('emerging'), se = AD.bandMeta('secure');
      var gsList = function (rows) { return '<ul>' + rows.map(function (x) { return '<li>' + esc(x.name) + '<span class="p">' + x.secure + '% secure</span></li>'; }).join('') + '</ul>'; };
      var gGrowth = '<div class="ad-gs" style="--band:' + em.color + ';--bandwash:' + em.wash + '"><h4>Areas of growth</h4>' + gsList(gs.growth) + '</div>';
      var gStrength = '<div class="ad-gs" style="--band:' + se.color + ';--bandwash:' + se.wash + '"><h4>Areas of strength</h4>' + gsList(gs.strength) + '</div>';
      gsSection = '<div style="margin-top:var(--ad-gap)">' +
        '<div class="ad-gs-head"><span class="ad-scopepill">All classes</span>' +
        '<button class="link-btn" data-tobreakdown="1">See class breakdown →</button></div>' +
        '<div class="ad-grid two" style="margin-top:12px">' + gGrowth + gStrength + '</div></div>';
    }

    // Skill band distribution — whole-school only, at the latest complete point.
    var distCard = '';
    if (AD.completedPoints.length) {
      var distBody = skillBandDistBody(AD.students, AD.latestComplete.key, 'school');
      distCard = '<div style="margin-top:var(--ad-gap)">' +
        card('Skill band distribution', 'Where children across the whole school sit across bands for each skill.', distBody, 'span2', '<div>' + cadence(AD.latestComplete.key) + '</div>') +
      '</div>';
    }

    body.innerHTML = screenHead('Overview', 'A calm read on whether the programme is running, working, and where to step in.') +
      verdictHTML() +
      '<div style="margin-top:var(--ad-gap)"></div>' +
      chips +
      (AD.openPoint ? '<div style="margin-top:var(--ad-gap)">' + sectionActivityUI(params) + '</div>' : '') +   // hidden when no window is open
      gsSection +
      '<div style="margin-top:var(--ad-gap)">' +
        card('Last outcome snapshot', null, snap, '', AD.latestComplete ? '<div>' + cadence(AD.latestComplete.key) + '</div>' : '') +
      '</div>' +
      distCard;

    // wiring
    if (AD.openPoint && AD.lifecycleState !== 'nodata') wireSectionActivity(body, params);   // filters/sort/row clicks only apply when the table is shown
    body.querySelectorAll('[data-tooutcomes]').forEach(function (b) { b.addEventListener('click', function () { go('outcomes', { point: AD.latestComplete.key }); }); });
    body.querySelectorAll('[data-tobreakdown]').forEach(function (b) { b.addEventListener('click', function () { go('outcomes', { point: AD.latestComplete.key }); }); });
  };
  function metachip(n, label) { return '<span class="ad-metachip"><b>' + n + '</b> ' + esc(label) + '</span>'; }

  function outcomeSnapshot() {
    if (!AD.completedPoints.length) return stEmpty('Not yet measured.', 'Skill bands appear after Baseline · ' + AD.points[0].month + '.');
    // % of skill×student readings that are Secure at the latest complete point, school-wide.
    var pt = AD.latestComplete;
    var secure = 0, tot = 0;
    AD.students.forEach(function (st) { st.skills.forEach(function (sk) { tot++; if (AD.bandOf(sk[pt.scoreField]) === 'secure') secure++; }); });
    var pctSecure = Math.round((secure / tot) * 100);
    var tgt = AD.targetsSet ? AD.pooledSecureTarget() : null;
    return '<div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">' +
      '<div class="ad-stat"><div class="num">' + pctSecure + '%</div><div class="lbl">of skill readings are Secure at ' + esc(pt.label) + '</div>' +
        (tgt != null ? targetDelta(pctSecure, tgt) : '') + '</div>' +
      '<div style="flex:1;min-width:200px">' + bandBar(schoolDistAllSkills(pt.key), false, tgt) + '<div style="margin-top:10px">' + bandLegend() + '</div></div>' +
      '<button class="btn btn-cyan btn-sm" data-tooutcomes="1">See Outcomes →</button></div>';
  }
  // aggregate distribution across ALL skills school-wide (snapshot only)
  function schoolDistAllSkills(pointKey) {
    var c = { emerging: 0, developing: 0, secure: 0 }, n = 0;
    var f = AD.points.find(function (p) { return p.key === pointKey; }).scoreField;
    AD.students.forEach(function (st) { st.skills.forEach(function (sk) { c[AD.bandOf(sk[f])]++; n++; }); });
    return { n: n, counts: c, pct: { emerging: Math.round(c.emerging / n * 100), developing: Math.round(c.developing / n * 100), secure: Math.round(c.secure / n * 100) } };
  }

  // ========================================================
  //  2) IMPLEMENTATION  (spec §5.2) — continuous data
  // ========================================================
  var implSort = { key: 'lastActivityDays', dir: 'desc' };  // default: problems on top
  var cmpTwo = { a: null, b: null };  // "Compare two classes" picker state (Outcomes) — any two sections, school-wide
  var progSkill = '';                 // "Progress over time" chart — '' = all skills, else a skill key
  var progPeriod = 'all';             // "Progress over time" chart — 'all' = time on x-axis, else a point key = skills on x-axis

  // Section activity (filters + table) — lives on the Overview screen. Kept as a
  // screen-agnostic helper: setParams/render act on whatever route is current.
  function sortableTh(key, label, num, tipText, tipCls) { var on = implSort.key === key; var lbl = tipText ? withInfo(esc(label), tipText, tipCls || 'down') : esc(label); return '<th class="sortable' + (num ? ' ad-num' : '') + '" data-sort="' + key + '">' + lbl + (on ? ' <span class="arw">' + (implSort.dir === 'asc' ? '▲' : '▼') + '</span>' : '') + '</th>'; }
  function sectionActivityRows(grade, section) {
    var rows = AD.activity.filter(function (a) { return (!grade || a.grade === grade) && (!section || a.id === section); });
    return rows.slice().sort(function (a, b) {
      var k = implSort.key, av = a[k], bv = b[k];
      if (k === 'name' || k === 'teacher') { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (k === 'completion') { av = a.completion.done / a.completion.total; bv = b.completion.done / b.completion.total; }
      var r = av < bv ? -1 : av > bv ? 1 : 0; return implSort.dir === 'asc' ? r : -r;
    });
  }
  function sectionActivityUI(params) {
    // Window just opened, nothing measured yet (the "No data" stage) → nudge, no table.
    if (AD.lifecycleState === 'nodata') {
      return card('Section activity', 'Live activity across every section.',
        stEmpty('No assessments yet.', 'Ask your teachers to start assessing their students — section activity will appear here as they do.'), 'span2');
    }
    var grade = params.grade || '', section = params.section || '', range = params.range || '30';
    var gradeOpts = [{ v: '', t: 'All grades' }].concat(AD.grades.map(function (g) { return { v: g, t: g }; }));
    var secOpts = [{ v: '', t: 'All sections' }].concat(AD.sections.filter(function (s) { return !grade || s.grade === grade; }).map(function (s) { return { v: s.id, t: s.name }; }));
    var rangeOpts = [{ v: '7', t: 'Last 7 days' }, { v: '30', t: 'Last 30 days' }, { v: '90', t: 'Last 90 days' }];
    var filters = '<div class="ad-filters">' +
      selectWrap('f-grade', gradeOpts, grade, 'Grade') +
      selectWrap('f-section', secOpts, section, 'Section') +
      selectWrap('f-range', rangeOpts, range, 'Date range') +
      '<button class="btn btn-outline btn-sm ad-refresh" id="f-refresh" title="Data changes rarely — refresh to re-pull activity">↻ Refresh</button></div>';
    var rows = sectionActivityRows(grade, section);
    var tableBody = !rows.length ? stEmpty('No sections match these filters.', 'Try widening the grade or section filter.') :
      '<div class="ad-tablewrap"><table class="ad-table"><thead><tr>' +
        sortableTh('name', 'Section') + sortableTh('teacher', 'Teacher') + sortableTh('lastActivityDays', 'Last activity', false, TIP.lastActivity) +
        sortableTh('completion', 'Assessment completion', false, TIP.completion) + sortableTh('status', 'Status', false, TIP.statusCol, 'down end') +
      '</tr></thead><tbody>' + rows.map(function (a) {
        return '<tr class="clickable" data-secdetail="' + a.id + '"><td class="name">' + esc(a.name) + '</td><td>' + esc(a.teacher) + '</td>' +
          '<td class="ad-num">' + relDays(a.lastActivityDays) + '</td>' +
          '<td class="ad-num">' + (AD.openPoint ? a.completion.done + ' / ' + countNoun(a.completion.total, 'student', 'students') : '<span style="color:var(--ink-300)">— no open window</span>') + '</td>' +
          '<td>' + statusChip(a.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return filters + card('Section activity', 'Sorted with the sections that need attention first. Click a row for completion detail.', tableBody, 'span2');
  }
  function wireSectionActivity(body, params) {
    var grade = params.grade || '', section = params.section || '', range = params.range || '30';
    var g = body.querySelector('#f-grade'); if (!g) return;   // table may be absent (no rows / empty state)
    g.addEventListener('change', function (e) { setParams({ grade: e.target.value, section: '', range: range }); });
    body.querySelector('#f-section').addEventListener('change', function (e) { setParams({ grade: grade, section: e.target.value, range: range }); });
    body.querySelector('#f-range').addEventListener('change', function (e) { setParams({ grade: grade, section: section, range: e.target.value }); });
    body.querySelector('#f-refresh').addEventListener('click', function () { toast('Activity refreshed.'); });
    body.querySelectorAll('[data-sort]').forEach(function (th) { th.addEventListener('click', function () { var k = th.dataset.sort; if (implSort.key === k) implSort.dir = implSort.dir === 'asc' ? 'desc' : 'asc'; else { implSort.key = k; implSort.dir = (k === 'name' || k === 'teacher') ? 'asc' : 'desc'; } render(); }); });
    if (isCoordinator) body.querySelectorAll('[data-secdetail]').forEach(function (tr) { tr.addEventListener('click', function () { completionDetail(tr.dataset.secdetail); }); });
  }

  SCREEN.implementation = function (params, body) {
    // Section activity now lives on Overview; this screen just points there.
    body.innerHTML = screenHead('Implementation', 'Is it happening? Live activity across every section.') +
      stEmpty('Section activity moved to Overview.', 'Live activity across every section now sits at the top of the Overview screen.');
  };
  function statusChip(s) { var lbl = { active: 'Active', slowing: 'Slowing', quiet: 'Quiet' }[s]; return '<span class="ad-chip ' + s + '" title="' + esc(TIP[s] || '') + '"><span class="dot"></span>' + lbl + '</span>'; }

  // ========================================================
  //  3) OUTCOMES  (spec §5.3) — periodic data only
  // ========================================================
  SCREEN.outcomes = function (params, body) {
    // No completed assessment point yet (No-data lifecycle state): every
    // outcome module needs at least one measured point, so show one calm
    // empty state instead of the full skill grid.
    if (!AD.completedPoints.length) {
      body.innerHTML = screenHead('Outcomes', 'Is it working? Skill bands and movement — never individual results.') +
        card('Skill outcomes', null, stEmpty('Not yet measured.', 'Skill bands appear after the Baseline assessment · ' + AD.points[0].month + '.'), 'span2');
      return;
    }
    // scope from filters (School → Grade → Section)
    var grade = params.grade || '';
    var section = params.section || '';
    var point = params.point && AD.completedPoints.some(function (p) { return p.key === params.point; }) ? params.point : AD.latestComplete.key;
    var level = section ? 'section' : grade ? 'grade' : 'school';
    var scope = { level: level, grade: grade, sectionId: section };
    var students = AD.scopeStudents(scope);

    // breadcrumb (terminates at section — no student level exists)
    var crumbs = '<div class="ad-crumbs"><button data-scope="school">School</button>';
    if (grade) crumbs += '<span class="sep">›</span>' + (section ? '<button data-scope="grade">' + esc(grade) + '</button>' : '<span class="cur">' + esc(grade) + '</span>');
    if (section) { var sd = AD.sections.find(function (s) { return s.id === section; }); crumbs += '<span class="sep">›</span><span class="cur">' + esc(sd ? sd.name : '') + '</span>'; }
    crumbs += '</div>';

    // scope + point controls
    var gradeOpts = [{ v: '', t: 'Whole school' }].concat(AD.grades.map(function (g) { return { v: g, t: g }; }));
    var secOpts = [{ v: '', t: grade ? 'All sections' : 'Pick a grade first' }].concat(AD.sections.filter(function (s) { return !grade || s.grade === grade; }).map(function (s) { return { v: s.id, t: s.name }; }));
    var pointOpts = AD.completedPoints.map(function (p) { return { v: p.key, t: p.label + ' · ' + p.month }; });
    var filters = '<div class="ad-filters">' +
      selectWrap('o-grade', gradeOpts, grade, 'Grade') +
      selectWrap('o-section', secOpts, section, 'Section') +
      '<span style="width:1px;height:26px;background:var(--line-200)"></span>' +
      selectWrap('o-point', pointOpts, point, 'Assessment point') + '</div>';

    // Module 4: progress over time — one stacked-area chart tracing the
    // band mix across completed points; selector switches pooled / single skill.
    var progBody = '<div id="o-prog">' + progOverTimeHTML(students) + '</div>';

    // Grade/section navigator — the mockup's "See your school as grades"
    // → "Look deeper into [grade]" drill. Sits above the skill detail.
    var navCards = '';
    if (level === 'school') navCards = '<div style="margin-bottom:var(--ad-gap)">' + card('See your school as grades', 'Open a grade to look deeper.', gradeNavHTML(point), 'span2') + '</div>';
    else if (level === 'grade') {
      // Headline snapshot from the grade card (school view): % Secure + band bar,
      // sitting above the section navigator so the drill opens on the same summary.
      var gStuds = AD.studentsInGrade(grade), gSecs = AD.sections.filter(function (s) { return s.grade === grade; });
      var gd = distAllSkills(gStuds, point), seMeta = AD.bandMeta('secure');
      var gPt = AD.points.find(function (p) { return p.key === point; }) || AD.latestComplete;
      var snap = '<div class="ad-gradesnap">' +
        '<div class="ad-stat"><div class="num">' + gd.pct.secure + '%</div>' +
          '<div class="lbl">' + esc(seMeta.label) + ' at ' + esc(gPt ? gPt.label : '') + '</div></div>' +
        '<div class="gs-bar">' + bandBar(gd) + '<div style="margin-top:10px">' + bandLegend() + '</div></div></div>';
      var gNote = plural(gStuds.length, 'student') + ' · ' + plural(gSecs.length, 'section') + ' · Open a section for its full skill view.';
      navCards = '<div style="margin-bottom:var(--ad-gap)">' + card('Look deeper into ' + esc(grade), gNote, snap + sectionNavHTML(grade, point), 'span2') + '</div>';
    }

    // Areas of growth / strength (grade + section scope).
    var gsCard = '';
    if (level !== 'school') {
      var gs = AD.growthStrength(students, point, 2);
      var em = AD.bandMeta('emerging'), se = AD.bandMeta('secure');
      var gGrowth = '<div class="ad-gs" style="--band:' + em.color + ';--bandwash:' + em.wash + '"><h4>Areas of growth</h4><ul>' + gs.growth.map(function (x) { return '<li>' + esc(x.name) + '<span class="p">' + x.secure + '% secure</span></li>'; }).join('') + '</ul></div>';
      var gStrength = '<div class="ad-gs" style="--band:' + se.color + ';--bandwash:' + se.wash + '"><h4>Areas of strength</h4><ul>' + gs.strength.map(function (x) { return '<li>' + esc(x.name) + '<span class="p">' + x.secure + '% secure</span></li>'; }).join('') + '</ul></div>';
      gsCard = '<div class="ad-grid two" style="margin-bottom:var(--ad-gap)">' + gGrowth + gStrength + '</div>';
    }

    // Multi-perspective radar — section scope only.
    var radarCard = (level === 'section') ? card('Multi-perspective view', 'The same skills rated by teachers, parents and the children themselves — the gaps between them are often the most useful part.', radarBlock(students, point), '', '<div>' + cadence(point) + '</div>', TIP.perspective) : '';

    // Compare two classes — pick ANY two sections school-wide and read their
    // skill-band distributions side by side at the selected point. Independent
    // of the scope filters above (kept in module state, not the URL). Re-renders
    // in place on change so it never yanks the page back to the top.
    // Nothing is pre-selected — the user picks both classes. Only clear a
    // selection if it points at a section that no longer exists.
    var validIds = AD.sections.map(function (s) { return s.id; });
    if (cmpTwo.a && validIds.indexOf(cmpTwo.a) < 0) cmpTwo.a = null;
    if (cmpTwo.b && validIds.indexOf(cmpTwo.b) < 0) cmpTwo.b = null;
    function cmp2Options(sel, side) {
      return '<option value=""' + (sel ? '' : ' selected') + ' disabled>Select class ' + (side === 'a' ? 'A' : 'B') + '…</option>' +
        AD.sections.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === sel ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('');
    }
    // Single-word standing for one skill in one class: whichever band most of
    // the children sit in. Used for the little status chip on each skill row.
    function cmpSkillVerdict(d) {
      var p = d.pct;
      if (p.secure >= p.developing && p.secure >= p.emerging) return { label: 'Strong', color: AD.bandMeta('secure').color };
      if (p.emerging >= p.developing && p.emerging >= p.secure) return { label: 'Emerging', color: AD.bandMeta('emerging').color };
      return { label: 'Developing', color: AD.bandMeta('developing').color };
    }
    // One class column: picker on top, then (once picked) growth/strength,
    // a skill-band-bar list, and the multi-perspective radar — the full
    // section read, so two classes can be scanned side by side.
    function cmpColHTML(side) {
      var selId = cmpTwo[side], otherId = cmpTwo[side === 'a' ? 'b' : 'a'];
      var sec = AD.sections.find(function (s) { return s.id === selId; });
      var picker = '<label class="select-wrap cmp-select"><select class="select" id="o-class' + side + '" title="Class to show in this column">' + cmp2Options(selId, side) + '</select></label>';
      var inner;
      if (!sec) {
        inner = stEmpty('No class chosen yet.', 'Pick a class above to see its strengths, growth areas and skill bands.');
      } else if (selId === otherId) {
        inner = stEmpty('Already shown.', 'This class is on the other side — pick a different one to compare.');
      } else {
        var studs = AD.studentsInSection(sec);
        var gs = AD.growthStrength(studs, point, 2), em = AD.bandMeta('emerging'), se = AD.bandMeta('secure');
        var gsList = function (rows) { return '<ul>' + rows.map(function (x) { return '<li>' + esc(x.name) + '<span class="p">' + x.secure + '% secure</span></li>'; }).join('') + '</ul>'; };
        var gsBlock = '<div class="cmp-gs">' +
          '<div class="ad-gs" style="--band:' + em.color + ';--bandwash:' + em.wash + '"><h4>Areas of growth</h4>' + gsList(gs.growth) + '</div>' +
          '<div class="ad-gs" style="--band:' + se.color + ';--bandwash:' + se.wash + '"><h4>Areas of strength</h4>' + gsList(gs.strength) + '</div></div>';
        var skillList = '<div class="cmp-skills">' + AD.skills.map(function (sk) {
          var d = AD.distribution(studs, sk.key, point), v = cmpSkillVerdict(d);
          return '<div class="cmp-skillrow"><span class="cmp-sk-name">' + esc(sk.name) + '</span>' +
            '<div class="cmp-sk-bar">' + bandBar(d, true) + '</div>' +
            '<span class="cmp-sk-status" style="color:' + v.color + '"><i style="background:' + v.color + '"></i>' + v.label + '</span></div>';
        }).join('') + '</div>';
        inner = gsBlock + '<div class="cmp-legend">' + bandLegend() + '</div>' + skillList + '<div class="cmp-radar">' + radarBlock(studs, point) + '</div>';
      }
      return '<div class="cmp-col">' + picker + '<div class="ad-card cmp-body">' + inner + '</div></div>';
    }
    function cmp2HTML() {
      return '<div class="cmp-head"><div class="cmp-head-kicker">You can compare two classes here</div>' +
        '<div class="cmp-head-row"><h2 class="cmp-head-title">Which two classes do you want to see?</h2>' + cadence(point) + '</div></div>' +
        '<div class="cmp-cols">' + cmpColHTML('a') + cmpColHTML('b') + '</div>';
    }
    function wireCmp2() {
      var host = document.getElementById('o-cmp2'); if (!host) return;
      var a = document.getElementById('o-classa'), b = document.getElementById('o-classb');
      if (a) a.addEventListener('change', function (e) { cmpTwo.a = e.target.value; host.innerHTML = cmp2HTML(); wireCmp2(); });
      if (b) b.addEventListener('change', function (e) { cmpTwo.b = e.target.value; host.innerHTML = cmp2HTML(); wireCmp2(); });
    }

    // Progress + Multi-perspective live only on the section view (2 columns).
    // At school scope, Progress stays full width; the grade ("class") view shows
    // neither — it's just the section navigator + growth/strength.
    var progCard = card('Progress over time', 'How the skill-band mix shifts across the assessment points.', progBody, '', '<div>' + cadence(point) + '</div>');
    var midRow = '';
    if (level === 'section') midRow = '<div class="ad-grid two" style="margin-top:var(--ad-gap)">' + progCard + radarCard + '</div>';
    else if (level === 'school') midRow = '<div style="margin-top:var(--ad-gap)">' + progCard + '</div>';

    body.innerHTML = screenHead('Outcomes', 'Is it working? Skill bands and movement — never individual results.') +
      crumbs + navCards + gsCard +
      midRow +
      (level === 'school' ? '<div id="o-cmp2" style="margin-top:var(--ad-gap)">' + cmp2HTML() + '</div>' : '');

    // wiring
    body.querySelectorAll('[data-gradenav]').forEach(function (b) { b.addEventListener('click', function () { setParams({ grade: b.dataset.gradenav, section: '', point: point }); }); });
    body.querySelectorAll('[data-sectionnav]').forEach(function (b) { b.addEventListener('click', function () { setParams({ grade: grade, section: b.dataset.sectionnav, point: point }); }); });
    body.querySelectorAll('[data-scope]').forEach(function (b) { b.addEventListener('click', function () { var lv = b.dataset.scope; if (lv === 'school') setParams({ point: point }); else if (lv === 'grade') setParams({ grade: grade, point: point }); }); });
    var elGrade = body.querySelector('#o-grade'); if (elGrade) elGrade.addEventListener('change', function (e) { setParams({ grade: e.target.value, section: '', point: point }); });
    var elSection = body.querySelector('#o-section'); if (elSection) elSection.addEventListener('change', function (e) { setParams({ grade: grade, section: e.target.value, point: point }); });
    var elPoint = body.querySelector('#o-point'); if (elPoint) elPoint.addEventListener('change', function (e) { setParams({ grade: grade, section: section, point: e.target.value }); });
    wireCmp2();
    progStudents = students; bindProgResize();
    (function wireProg() {
      var host = document.getElementById('o-prog'); if (!host) return;
      var rerender = function () { host.innerHTML = progOverTimeHTML(students); drawProgChart(students); wireProg(); };
      var sk = document.getElementById('o-progskill'), pe = document.getElementById('o-progperiod');
      if (sk) sk.addEventListener('change', function (e) { progSkill = e.target.value; rerender(); });
      if (pe) pe.addEventListener('change', function (e) { progPeriod = e.target.value; rerender(); });
      drawProgChart(students);   // first paint once the host is measurable
    })();
  };
  // scoped target = grade target; school = enrolment-weighted avg of grade targets; section = its grade's target
  function scopedTarget(scope, skillKey) {
    if (scope.level === 'grade') return AD.targets[scope.grade][skillKey];
    if (scope.level === 'section') { var sd = AD.sections.find(function (s) { return s.id === scope.sectionId; }); return AD.targets[sd.grade][skillKey]; }
    // school: weighted average across grades
    var acc = { emerging: 0, developing: 0, secure: 0 }, tot = 0;
    AD.grades.forEach(function (g) { var n = AD.studentsInGrade(g).length; tot += n; var t = AD.targets[g][skillKey]; acc.emerging += t.emerging * n; acc.developing += t.developing * n; acc.secure += t.secure * n; });
    return { emerging: Math.round(acc.emerging / tot), developing: Math.round(acc.developing / tot), secure: Math.round(acc.secure / tot) };
  }
  // Grade breakdown (school scope) — each grade in the Overview snapshot format:
  // % Secure headline + band bar, then Areas of growth / strength, plus a
  // drill-in link. Section cards (grade scope) stay as the compact navigator.
  function gradeNavHTML(point) {
    var ptObj = AD.points.find(function (p) { return p.key === point; }) || AD.latestComplete;
    var ptLabel = ptObj ? ptObj.label : '';
    var em = AD.bandMeta('emerging'), se = AD.bandMeta('secure');
    var gsList = function (rows) { return '<ul>' + rows.map(function (x) { return '<li>' + esc(x.name) + '<span class="p">' + x.secure + '% secure</span></li>'; }).join('') + '</ul>'; };
    return '<div style="margin-bottom:14px">' + bandLegend() + '</div>' +
      '<div class="ad-gradebreaks">' + AD.grades.map(function (g) {
        var studs = AD.studentsInGrade(g), secs = AD.sections.filter(function (s) { return s.grade === g; });
        var d = distAllSkills(studs, point), gs = AD.growthStrength(studs, point, 2);
        var gGrowth = '<div class="ad-gs" style="--band:' + em.color + ';--bandwash:' + em.wash + '"><h4>Areas of growth</h4>' + gsList(gs.growth) + '</div>';
        var gStrength = '<div class="ad-gs" style="--band:' + se.color + ';--bandwash:' + se.wash + '"><h4>Areas of strength</h4>' + gsList(gs.strength) + '</div>';
        return '<div class="ad-gradebreak">' +
          '<div class="gb-head"><div><div class="gb-name">' + esc(g) + '</div>' +
            '<div class="gb-meta">' + plural(studs.length, 'student') + ' · ' + plural(secs.length, 'section') + '</div></div>' +
            '<button class="link-btn" data-gradenav="' + esc(g) + '">Look deeper →</button></div>' +
          '<div class="gb-snap"><div class="ad-stat"><div class="num">' + d.pct.secure + '%</div>' +
            '<div class="lbl">' + esc(se.label) + ' at ' + esc(ptLabel) + '</div></div>' +
            '<div class="gb-bar">' + bandBar(d) + '</div></div>' +
          '<div class="ad-grid two gb-gs">' + gGrowth + gStrength + '</div></div>';
      }).join('') + '</div>';
  }
  function sectionNavHTML(grade, point) {
    return '<div class="ad-navcards">' + AD.sections.filter(function (s) { return s.grade === grade; }).map(function (s) {
      var studs = AD.studentsInSection(s), d = distAllSkills(studs, point);
      return '<button class="ad-navcard" data-sectionnav="' + esc(s.id) + '"><div class="nc-top"><span class="nc-name">' + esc(s.name) + '</span><span style="color:var(--ink-300)">›</span></div>' +
        '<div class="nc-meta">' + plural(studs.length, 'student') + '</div>' + bandBar(d) + pctLine(d) + '</button>';
    }).join('') + '</div>';
  }

  // ========================================================
  //  4) ROSTER  (spec §5.4) — coordinator only. Identity, never SEL.
  // ========================================================
  SCREEN.roster = function (params, body) {
    // Grade-select-first: one clickable box per grade. Tapping a box opens the
    // grade's roster (students + teacher-per-section) in a popup. Fast global
    // "find one child" search now lives inside each grade popup.
    var gradeCards = !AD.grades.length ? stEmpty('No grades yet.', 'Students appear here once enrolment is imported.') :
      '<div class="ad-navcards">' + AD.grades.map(function (g) {
        var studs = AD.studentsInGrade(g);
        var secs = AD.sections.filter(function (s) { return s.grade === g; });
        var teacherLine = '<div class="nc-pcts">' + secs.map(function (s) {
          return '<span>' + esc(s.section) + ' · ' + esc(AD.teacherFor(s)) + '</span>';
        }).join('') + '</div>';
        return '<button class="ad-navcard" data-graderoster="' + esc(g) + '">' +
          '<div class="nc-top"><span class="nc-name">' + esc(g) + '</span><span style="color:var(--ink-300)">›</span></div>' +
          '<div class="nc-meta">' + plural(studs.length, 'student') + ' · ' + plural(secs.length, 'section') + '</div>' +
          teacherLine + '</button>';
      }).join('') + '</div>';
    var listBody = gradeCards;

    // user management
    var users = seedUsers();
    var userBody = '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-cyan btn-sm" data-invite="1">+ Invite user</button></div>' +
      '<div class="ad-tablewrap"><table class="ad-table" style="min-width:520px"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>' +
      users.map(function (u, i) {
        return '<tr><td class="name">' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td><td>' + (u.status === 'Active' ? '<span class="ad-chip active"><span class="dot"></span>Active</span>' : '<span class="ad-chip slowing"><span class="dot"></span>Invited</span>') + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' + (u.status === 'Invited' ? '<button class="link-btn" data-resend="' + i + '">Resend</button> · ' : '') + '<button class="link-btn" data-revoke="' + i + '" style="color:#B22447">Revoke</button></td></tr>';
      }).join('') + '</tbody></table></div>';

    body.innerHTML = screenHead('Roster', SHOW_STUDENT_STAGE ? 'Operational identity data — plus a temporary developmental-stage column (see the note in Students).' : 'Operational identity data. No SEL results ever appear here.') +
      card('Students', AD.students.length + ' enrolled · pick a grade to see its students and assigned teachers.', listBody, 'span2', '<button class="btn btn-primary btn-sm" data-migrate="1" title="Promote, retain, remove and add students at year boundary. Reviewable per student, with a preview and a 24-hour undo.">Start grade migration</button>') +
      '<div style="margin-top:var(--ad-gap)">' +
        card('User management', 'Invite, resend, revoke. Revoke is immediate.', userBody) +
      '</div>';
    // NOTE: Duplicate review queue (spec §5.4.5) sits behind the near-match config
    // flag, which is OFF for this school — so the module is intentionally absent.

    // wiring
    body.querySelectorAll('[data-graderoster]').forEach(function (b) { b.addEventListener('click', function () { openGradeRoster(b.dataset.graderoster); }); });
    body.querySelector('[data-migrate]').addEventListener('click', startMigration);
    body.querySelector('[data-invite]').addEventListener('click', inviteUser);
    body.querySelectorAll('[data-revoke]').forEach(function (b) { b.addEventListener('click', function () { toast('Access revoked — session invalidated immediately.'); }); });
    body.querySelectorAll('[data-resend]').forEach(function (b) { b.addEventListener('click', function () { toast('Invitation resent.'); }); });
  };
  // ---- Grade roster popup (grade-select-first) — students + teacher per section ----
  function openGradeRoster(grade) {
    var secs = AD.sections.filter(function (s) { return s.grade === grade; });
    var rows = AD.rosterRows().filter(function (r) { return r.grade === grade; });

    // Teacher-per-section: editable inline. Writes back to the shared AD.sections
    // object, so the roster screen's Teacher–section assignment card stays in sync.
    var teacherBlock = '<div style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-bottom:16px">' +
      secs.map(function (s) {
        var opts = AD.teachers.map(function (t) { return '<option value="' + t.id + '"' + (t.id === s.teacherId ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
        return '<div style="display:flex;align-items:center;gap:8px">' +
          '<span class="ad-metachip" style="padding:7px 13px"><b>' + esc(s.section) + '</b></span>' +
          '<label class="select-wrap" style="min-width:180px"><select class="select" style="padding:9px 32px 9px 13px;font-size:13px" data-grteacher="' + esc(s.id) + '">' + opts + '</select></label></div>';
      }).join('') + '</div>';

    var tableHTML = '<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Name</th><th>Student ID</th><th>Section</th><th>Parent email</th>' + (SHOW_STUDENT_STAGE ? '<th>Developmental stage</th>' : '') + '</tr></thead><tbody id="gr-tbody">' +
      rows.map(function (r) {
        var stageCell = SHOW_STUDENT_STAGE ? '<td>' + (r.stage ? '<span class="ad-bandchip"><i style="background:' + r.stage.color + '"></i>' + esc(r.stage.label) + '</span>' : '<span style="color:var(--ink-300)">not yet measured</span>') + '</td>' : '';
        return '<tr data-nm="' + esc((r.name + ' ' + r.adm).toLowerCase()) + '" data-sec="' + esc(r.section) + '"><td class="name">' + esc(r.name) + '</td><td class="ad-num">' + esc(r.adm) + '</td><td>' + esc(r.section) + '</td><td>' + esc(r.parentEmail) + '</td>' + stageCell + '</tr>';
      }).join('') + '</tbody></table></div>';

    openModal(modalHead(grade + ' · roster') +
      '<p class="ad-mod-note" style="margin-bottom:14px">' + plural(rows.length, 'student') + ' · ' + plural(secs.length, 'section') + '. ' + (SHOW_STUDENT_STAGE ? 'Identity, enrolment and a temporary stage column.' : 'Identity and enrolment only — no SEL results.') + '</p>' +
      (SHOW_STUDENT_STAGE ? '<div class="ad-privacy"><span aria-hidden="true">⚠️</span><span><b>Temporary:</b> the developmental-stage column shows an individual child\'s SEL result, which leadership is not normally shown (spec §2). It is behind a flag and will be removed.</span></div>' : '') +
      '<div style="font-weight:800;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-450);margin-bottom:8px">Teachers</div>' + teacherBlock +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px">' +
        '<button type="button" class="ad-filterchip on" data-secfilter="" aria-pressed="true">All sections</button>' +
        secs.map(function (s) { return '<button type="button" class="ad-filterchip" data-secfilter="' + esc(s.section) + '" aria-pressed="false">Section ' + esc(s.section) + '</button>'; }).join('') +
      '</div>' +
      '<input class="input" id="gr-q" placeholder="Search name or student ID…" style="max-width:280px;margin-bottom:14px" aria-label="Search students in ' + esc(grade) + '">' +
      tableHTML, { wide: true });

    var q = document.getElementById('gr-q');
    var activeSec = '';   // '' = all sections
    function applyRosterFilter() {
      var v = q.value.toLowerCase();
      modalRoot.querySelectorAll('#gr-tbody tr').forEach(function (tr) {
        var okName = !v || tr.dataset.nm.indexOf(v) >= 0;
        var okSec = !activeSec || tr.dataset.sec === activeSec;
        tr.style.display = (okName && okSec) ? '' : 'none';
      });
    }
    q.addEventListener('input', applyRosterFilter);
    modalRoot.querySelectorAll('[data-secfilter]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        activeSec = chip.dataset.secfilter;
        modalRoot.querySelectorAll('[data-secfilter]').forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('on', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        applyRosterFilter();
      });
    });

    modalRoot.querySelectorAll('[data-grteacher]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var sec = AD.sections.find(function (x) { return x.id === sel.dataset.grteacher; });
        if (sec) sec.teacherId = sel.value;
        toast('Teacher reassigned. Section history is unchanged.');
      });
    });
  }

  function seedUsers() {
    return [
      { name: 'Meera Krishnan', email: 'meera.krishnan@littlesprouts.edu', role: 'Coordinator', status: 'Active' },
      { name: 'Kavya Rao', email: 'kavya.rao@littlesprouts.edu', role: 'Teacher', status: 'Active' },
      { name: 'Rohan Iyer', email: 'rohan.iyer@littlesprouts.edu', role: 'Teacher', status: 'Active' },
      { name: 'Dilani Perera', email: 'dilani.perera@littlesprouts.edu', role: 'Teacher', status: 'Active' },
      { name: 'Nadia Fernando', email: 'nadia.fernando@littlesprouts.edu', role: 'Teacher', status: 'Invited' },
      { name: 'A. Wanigasuriya', email: 'principal@littlesprouts.edu', role: 'Principal', status: 'Invited' },
    ];
  }

  // ========================================================
  //  5) REPORTS  (spec §5.5) — both roles
  // ========================================================
  SCREEN.reports = function (params, body) {
    // Nothing measured yet → nothing to report (No-data lifecycle state).
    if (!AD.completedPoints.length) {
      body.innerHTML = screenHead('Reports', 'The screen you came for. Everything here is safe to share.') +
        card('Reports', null, stEmpty('Nothing to report yet.', 'Reports become available after the Baseline assessment · ' + AD.points[0].month + '.'), 'span2');
      return;
    }
    var scope = params.rscope || 'school';        // school | <grade>
    var point = params.rpoint || AD.latestComplete.key;
    var scopeOpts = [{ v: 'school', t: 'Whole school' }].concat(AD.grades.map(function (g) { return { v: g, t: g }; }));
    var pointOpts = AD.completedPoints.map(function (p) { return { v: p.key, t: p.label + ' · ' + p.month }; });

    var summaryBody = '<p class="ad-mod-note" style="margin-bottom:14px">One page, board-ready. Sections running, students assessed, band distribution, movement, targets and interpretation lines. No individual students; no teacher attribution.</p>' +
      '<div class="ad-filters">' + selectWrap('rp-scope', scopeOpts, scope, 'Scope') + selectWrap('rp-point', pointOpts, point, 'Assessment point') + '</div>' +
      '<button class="btn btn-primary btn-sm" data-genpdf="1">Generate leadership summary</button>';

    var newsletter = newsletterText(scope, point);
    var newsBody = '<p class="ad-mod-note" style="margin-bottom:12px">Plain, parent-facing language — no band names, no scores, no jargon. Edit before copying.</p>' +
      '<textarea class="ad-copyblock" id="rp-news">' + esc(newsletter) + '</textarea>' +
      '<div style="display:flex;gap:10px;margin-top:12px"><button class="btn btn-cyan btn-sm" data-copynews="1">Copy to clipboard</button><button class="btn btn-outline btn-sm" data-regennews="1">Regenerate</button></div>';

    var csvBody = '<p class="ad-mod-note" style="margin-bottom:14px">Every export carries the assessment point and generation date. No student-level outcome export exists — the data simply is not there to export.</p>' +
      '<div style="display:flex;flex-direction:column;gap:10px;max-width:420px">' +
      (isCoordinator ? '<button class="btn btn-outline btn-sm" data-csv="roster" style="justify-content:space-between">Roster + completion CSV <span style="color:var(--ink-300)">identity only, no scores</span></button>' : '') +
      '<button class="btn btn-outline btn-sm" data-csv="outcomes" style="justify-content:space-between">Aggregate outcomes CSV <span style="color:var(--ink-300)">section level and above</span></button>' +
      '</div>';

    body.innerHTML = screenHead('Reports', 'The screen you came for. Everything here is safe to share.') +
      card('Leadership summary (PDF)', null, summaryBody, 'span2') +
      '<div style="margin-top:var(--ad-gap)">' + card('Newsletter paragraph', null, newsBody) + '</div>' +
      '<div style="margin-top:var(--ad-gap)">' + card('Data export (CSV)', null, csvBody) + '</div>';

    body.querySelector('#rp-scope').addEventListener('change', function (e) { setParams({ rscope: e.target.value, rpoint: point }); });
    body.querySelector('#rp-point').addEventListener('change', function (e) { setParams({ rscope: scope, rpoint: e.target.value }); });
    body.querySelector('[data-genpdf]').addEventListener('click', function () { generateSummary(scope, point); });
    body.querySelector('[data-copynews]').addEventListener('click', function () { var t = document.getElementById('rp-news'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) {} toast('Newsletter paragraph copied.'); });
    body.querySelector('[data-regennews]').addEventListener('click', function () { document.getElementById('rp-news').value = newsletterText(scope, point); toast('Regenerated.'); });
    body.querySelectorAll('[data-csv]').forEach(function (b) { b.addEventListener('click', function () { exportCSV(b.dataset.csv, scope, point); }); });
  };

  // ---------- Reports helpers ----------
  function scopeStudentsForReport(scope) { return scope === 'school' ? AD.students : AD.studentsInGrade(scope); }
  function genStamp() { return '2026-08-18'; } // demo "today"

  function newsletterText(scope, point) {
    var pt = AD.points.find(function (p) { return p.key === point; });
    var where = scope === 'school' ? 'across the school' : 'in ' + scope;
    var secs = AD.activity.filter(function (a) { return scope === 'school' || a.grade === scope; }).length;
    return 'This term, our children continued their social-emotional and thinking-skills journey with Tilli ' + where + '. ' +
      'All ' + secs + ' of our classes took part, and our teachers checked in at ' + pt.label + ' to see how everyone is growing. ' +
      'Many children are becoming more confident at naming their feelings, settling into routines, and staying with a task — the everyday building blocks that help them thrive. ' +
      'We are proud of how our classrooms are making space for these skills alongside reading and numbers, and we look forward to sharing more at Endline.';
  }

  function generateSummary(scope, point) {
    // "Server-side, non-blocking" — simulate a short generation, then open a
    // print-ready one-pager the user can save as PDF (WeasyPrint stand-in).
    var ov = openModal('<div style="text-align:center;padding:30px 10px"><div class="spinner" style="margin:0 auto 16px"></div><p style="font-weight:700;color:var(--ink-600)">Generating leadership summary…</p><p class="ad-mod-note">You can keep working — it will open when ready.</p></div>');
    setTimeout(function () { closeModal(); openSummaryDoc(scope, point); }, 1200);
  }
  function openSummaryDoc(scope, point) {
    var pt = AD.points.find(function (p) { return p.key === point; });
    var students = scopeStudentsForReport(scope);
    var secs = AD.activity.filter(function (a) { return scope === 'school' || a.grade === scope; });
    var scopeName = scope === 'school' ? AD.school.name : scope;
    var skillRows = AD.skills.map(function (sk) {
      var d = AD.distribution(students, sk.key, point);
      var m = AD.completedPoints.length >= 2 ? AD.movement(students, sk.key) : null;
      return '<tr><td>' + esc(sk.name) + '</td><td>' + miniBar(d) + '</td><td style="white-space:nowrap">' + (m ? '▲' + m.up + ' / ▼' + m.down : '—') + '</td></tr>';
    }).join('');
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Tilli Measures — Leadership summary</title>' +
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#141414;margin:0;padding:32px;max-width:820px}h1{font-size:22px;margin:0 0 2px}.sub{color:#5B6170;font-size:13px;margin:0 0 18px}.meta{font-size:12px;color:#9AA3AF;margin-bottom:18px}' +
      'table{width:100%;border-collapse:collapse;font-size:12.5px}td,th{padding:7px 8px;border-bottom:1px solid #ECEEF2;text-align:left}th{font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;color:#5B6170}' +
      '.tiles{display:flex;gap:24px;margin:16px 0 22px}.tile b{display:block;font-size:24px}.tile span{font-size:12px;color:#5B6170}.leg{font-size:11px;color:#5B6170;margin-top:10px}.print{margin:20px 0;text-align:center}@media print{.print{display:none}}</style></head><body>' +
      '<h1>' + esc(scopeName) + ' — Leadership summary</h1><p class="sub">Social-emotional & cognitive skills · Tilli Measures</p>' +
      '<p class="meta">Assessment point: <b>' + esc(pt.label) + ' · ' + esc(pt.month) + '</b> · Generated ' + genStamp() + '</p>' +
      '<div class="tiles"><div class="tile"><b>' + secs.length + '</b><span>sections running</span></div><div class="tile"><b>' + students.length + '</b><span>students assessed</span></div><div class="tile"><b>' + AD.completedPoints.length + '</b><span>assessment points complete</span></div></div>' +
      '<table><thead><tr><th>Skill</th><th>Band distribution (Emerging / Developing / Secure)</th><th>Movement</th></tr></thead><tbody>' + skillRows + '</tbody></table>' +
      '<p class="leg">Bands: Emerging (orange) · Developing (blue) · Secure (green). Figures are group distributions — no individual results are shown. No section-level teacher attribution.</p>' +
      '<div class="print"><button onclick="window.print()" style="padding:10px 22px;font-size:14px;border:none;border-radius:999px;background:#56C02B;color:#fff;font-weight:700;cursor:pointer">Print / Save as PDF</button></div></body></html>';
    var w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
    else toast('Allow pop-ups to open the summary.');
  }
  function miniBar(d) {
    var p = d.pct;
    return '<span style="display:inline-flex;width:200px;height:14px;border-radius:4px;overflow:hidden;vertical-align:middle">' +
      '<i style="width:' + p.emerging + '%;background:#F0A84A"></i><i style="width:' + p.developing + '%;background:#26BDE2"></i><i style="width:' + p.secure + '%;background:#56C02B"></i></span> ' +
      '<span style="font-size:11px;color:#5B6170">' + p.secure + '% secure</span>';
  }
  function exportCSV(kind, scope, point) {
    var pt = AD.points.find(function (p) { return p.key === point; });
    var lines = [], name;
    var header = '# Tilli Measures export · ' + (scope === 'school' ? AD.school.name : scope) + ' · Assessment point: ' + pt.label + ' · Generated ' + genStamp();
    if (kind === 'roster') {
      name = 'roster-completion';
      lines.push(header); lines.push('Student ID,Name,Grade,Section,Enrolment,Parent claim');
      AD.rosterRows().forEach(function (r) { if (scope !== 'school' && r.grade !== scope) return; lines.push([r.adm, r.name, r.grade, r.section, r.enrolment, r.claim].map(csvCell).join(',')); });
    } else {
      name = 'aggregate-outcomes';
      lines.push(header); lines.push('Scope,Level,Skill,Emerging %,Developing %,Secure %');
      var scopes = [];
      if (scope === 'school') { scopes.push({ label: AD.school.name, level: 'School', students: AD.students }); AD.grades.forEach(function (g) { scopes.push({ label: g, level: 'Grade', students: AD.studentsInGrade(g) }); }); }
      else scopes.push({ label: scope, level: 'Grade', students: AD.studentsInGrade(scope) });
      AD.sections.filter(function (s) { return scope === 'school' || s.grade === scope; }).forEach(function (s) { scopes.push({ label: s.name, level: 'Section', students: AD.studentsInSection(s) }); });
      scopes.forEach(function (sc) { AD.skills.forEach(function (sk) { var d = AD.distribution(sc.students, sk.key, point); lines.push([sc.label, sc.level, sk.name, d.pct.emerging, d.pct.developing, d.pct.secure].map(csvCell).join(',')); }); });
    }
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'tilli-' + name + '-' + point + '-' + genStamp() + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    toast('CSV exported.');
  }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  // ========================================================
  //  ASK TILLI  (feedback §5) — a live assistant, reachable from a
  //  floating button on every screen and from its own nav destination.
  //  Answers are generated from THIS school's dashboard data. It is a
  //  scripted preview: a developer swaps askAnswer() for a real
  //  model call wired to the same data reads.
  // ========================================================
  var askState = { messages: null, open: false };
  var ASK_SUGS = ['Is the programme working?', 'Which class is quietest?', 'Where are we weakest?', 'Any open concerns?', 'How do I show this to my board?'];
  function askGreeting() {
    return [{ role: 'tilli', sugs: true,
      html: 'Hi ' + esc((me.name || 'there').split(' ')[0]) + " — I'm Tilli. Ask me about how your school is using the programme, whether it's working, any concerns raised, or how to read anything on this dashboard." }];
  }
  function askEnsure() { if (!askState.messages) askState.messages = askGreeting(); }
  function askLink(screen, label, params) {
    return '<button class="ask-link" data-askgo="' + esc(screen) + '"' +
      (params ? ' data-askparams="' + esc(JSON.stringify(params)) + '"' : '') + '>' + esc(label) + ' →</button>';
  }
  // Keyword responder over the real data reads. Returns { html, sugs }.
  function askAnswer(q) {
    var t = ' ' + q.toLowerCase() + ' ';
    var v = AD.leadershipVerdict();
    if (/work|secure|outcome|result|improv|progress|effect/.test(t)) {
      if (!v.hasOutcomes) return { html: 'Nothing is measured yet — the ' + esc(v.openPoint ? v.openPoint.label : 'Baseline') + ' window is still collecting. Skill outcomes appear once it closes.' };
      var s = '<b>' + v.pctSecure + '%</b> of skill readings are Secure at ' + esc(v.point.label) + '.';
      if (v.deltaSecure != null) { s += ' That is ' + (v.deltaSecure >= 0 ? 'up ' : 'down ') + Math.abs(v.deltaSecure) + ' points since Baseline'; if (v.movementAvail) s += ', and ' + v.childrenUp + ' of ' + countNoun(v.childrenN, 'child', 'children') + ' moved up a band'; s += '.'; }
      if (v.targetSecure != null) { var gap = v.targetSecure - v.pctSecure; s += ' Your target is ' + v.targetSecure + '% (' + (gap <= 0 ? 'met' : gap + (gap === 1 ? ' point to go' : ' points to go')) + ').'; }
      return { html: s + ' ' + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/quiet|inactiv|activity|adoption|happening|using|engag/.test(t)) {
      var q2 = AD.activity.slice().sort(function (a, b) { return b.lastActivityDays - a.lastActivityDays; });
      var top = q2[0];
      var s2 = v.sectionsActive + ' of ' + v.sectionsTotal + ' classes are active. ';
      s2 += top.status === 'quiet'
        ? 'The quietest is <b>' + esc(top.name) + '</b> (' + esc(top.teacher) + '), last active ' + top.lastActivityDays + ' days ago — a good place to offer help.'
        : 'Every class has been active recently.';
      return { html: s2 + ' ' + askLink('overview', 'Open section activity') };
    }
    if (/weak|lowest|struggl|growth|behind|room to grow|which skill/.test(t)) {
      if (!v.hasOutcomes) return { html: 'Skill areas appear once the first assessment window closes.' };
      var gg = AD.growthStrength(AD.students, v.point.key, 3);
      return { html: 'The areas with the most room to grow: ' + gg.growth.map(function (x) { return '<b>' + esc(x.name) + '</b> (' + x.secure + '% secure)'; }).join(', ') + '. These respond well to short, frequent practice. ' + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/strong|strength|best|highest|good at|doing well/.test(t)) {
      if (!v.hasOutcomes) return { html: 'Skill areas appear once the first assessment window closes.' };
      var gs = AD.growthStrength(AD.students, v.point.key, 3);
      return { html: 'Your strongest areas: ' + gs.strength.map(function (x) { return '<b>' + esc(x.name) + '</b> (' + x.secure + '% secure)'; }).join(', ') + '. ' + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/concern|flag|risk|worried|counsel|wellbeing|well-being/.test(t)) {
      var c = AD.concernCounts();
      return { html: 'There ' + (c.New === 1 ? 'is ' : 'are ') + '<b>' + c.New + '</b> new concern' + (c.New === 1 ? '' : 's') + ' waiting to be routed, ' + c.Routed + ' with the counsellor, and ' + c.Closed + ' closed. Names are visible to you as coordinator; a principal sees counts only.' };
    }
    if (/report|board|committee|pdf|newsletter|parent|share|present/.test(t)) {
      return { html: 'The <b>Reports</b> screen has a one-page, board-ready summary (PDF), a plain-language paragraph for your parent newsletter, and CSV exports — all safe to share, with no individual student data. ' + askLink('reports', 'Go to Reports') };
    }
    if (/target|goal|benchmark|on track/.test(t)) {
      if (!v.hasOutcomes || v.targetSecure == null) return { html: 'Targets compare against measured outcomes, which appear once the first window closes.' };
      var gap2 = v.targetSecure - v.pctSecure;
      return { html: 'Your Secure target is <b>' + v.targetSecure + '%</b> across all skills. You are at ' + v.pctSecure + '% — ' + (gap2 <= 0 ? 'target met.' : gap2 + ' points to go.') + ' ' + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/how many|student count|roster|enrol|class list|section|teacher|staff/.test(t)) {
      return { html: 'Your school has <b>' + AD.students.length + '</b> students across <b>' + AD.sections.length + '</b> sections and <b>' + AD.teachers.length + '</b> teaching staff, tracking ' + AD.skills.length + ' skills. ' + (isCoordinator ? askLink('roster', 'Open Roster') : '') };
    }
    if (/band|emerging|developing|what does|how do i read|meaning|explain|help/.test(t)) {
      return { html: 'Skills are grouped into three developmental bands: <b>Emerging</b> (needs adult prompts), <b>Developing</b> (used with reminders), and <b>Secure</b> (steady and independent). Leadership only ever sees group distributions — never an individual child\'s score.' };
    }
    return { html: 'I can help with adoption (who is using Tilli), outcomes (is it working), concerns, targets, and getting a board-ready report. Try one of these:', sugs: true };
  }
  function askMsgHTML(m) {
    if (m.role === 'me') return '<div class="ask-msg me">' + esc(m.text) + '</div>';
    var s = '<div class="ask-msg tilli">' + m.html + '</div>';
    if (m.sugs) s += '<div class="ask-sugs">' + ASK_SUGS.map(function (x) { return '<button class="ask-sug" data-asksug="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>';
    return s;
  }
  function askThreadHTML() { askEnsure(); return askState.messages.map(askMsgHTML).join(''); }
  function askBodies() { return [document.getElementById('ask-panel-body'), document.getElementById('ask-screen-body')].filter(Boolean); }
  function askWireBody(b) {
    b.querySelectorAll('[data-asksug]').forEach(function (x) { x.addEventListener('click', function () { askSend(x.dataset.asksug); }); });
    b.querySelectorAll('[data-askgo]').forEach(function (x) { x.addEventListener('click', function () { var p = x.dataset.askparams ? JSON.parse(x.dataset.askparams) : {}; askClosePanel(); go(x.dataset.askgo, p); }); });
  }
  function askRefresh() { askBodies().forEach(function (b) { b.innerHTML = askThreadHTML(); b.scrollTop = b.scrollHeight; askWireBody(b); }); }
  function askSend(text) {
    text = String(text || '').trim(); if (!text) return;
    askEnsure();
    askState.messages.push({ role: 'me', text: text });
    var a = askAnswer(text);
    askState.messages.push({ role: 'tilli', html: a.html, sugs: !!a.sugs });
    askRefresh();
  }
  function askFootHTML(idBase) {
    return '<div class="ask-foot"><input class="ask-input" id="' + idBase + '-input" placeholder="Ask about your data…" aria-label="Ask Tilli"><button class="ask-send" id="' + idBase + '-send" aria-label="Send">➤</button></div>';
  }
  function askWireFoot(idBase) {
    var inp = document.getElementById(idBase + '-input'), send = document.getElementById(idBase + '-send');
    if (!inp) return;
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { askSend(inp.value); inp.value = ''; } });
    send.addEventListener('click', function () { askSend(inp.value); inp.value = ''; inp.focus(); });
  }
  function askOpenPanel() {
    if (document.getElementById('ask-panel')) return;
    askEnsure();
    var p = document.createElement('div'); p.className = 'ask-panel'; p.id = 'ask-panel';
    p.innerHTML =
      '<div class="ask-head"><span class="ask-ava">' + ICONS.asktilli + '</span>' +
      '<div><b>Ask Tilli<span class="ask-beta">Beta</span></b><span class="ask-sub">Answers from your school\'s data</span></div>' +
      '<button class="ask-x" data-askclose="1" aria-label="Close Ask Tilli">×</button></div>' +
      '<div class="ask-body" id="ask-panel-body"></div>' + askFootHTML('ask-panel');
    document.body.appendChild(p);
    askState.open = true; syncFab();
    var body = document.getElementById('ask-panel-body'); body.innerHTML = askThreadHTML(); body.scrollTop = body.scrollHeight; askWireBody(body);
    p.querySelector('[data-askclose]').addEventListener('click', askClosePanel);
    askWireFoot('ask-panel');
    var inp = document.getElementById('ask-panel-input'); if (inp) inp.focus();
  }
  function askClosePanel() { var p = document.getElementById('ask-panel'); if (p) p.remove(); askState.open = false; syncFab(); }

  SCREEN.asktilli = function (params, body) {
    askEnsure();
    body.innerHTML = screenHead('Ask Tilli', 'Ask anything about your school\'s data in plain language. This is a preview — answers are generated from what\'s already on your dashboard.') +
      '<div class="ask-screen"><div class="ask-shell">' +
        '<div class="ask-body" id="ask-screen-body"></div>' + askFootHTML('ask-screen') +
      '</div></div>';
    var b = document.getElementById('ask-screen-body'); b.innerHTML = askThreadHTML(); b.scrollTop = b.scrollHeight; askWireBody(b);
    askWireFoot('ask-screen');
  };

  function buildFab() {
    if (document.getElementById('ask-fab-btn')) return;
    var b = document.createElement('button'); b.className = 'ask-fab'; b.id = 'ask-fab-btn';
    b.innerHTML = ICONS.asktilli + '<span>Ask Tilli</span>';
    b.addEventListener('click', askOpenPanel);
    document.body.appendChild(b);
    syncFab();
  }
  // Hide the floating button while the panel is open or the user is already
  // on the Ask Tilli screen — otherwise it's redundant.
  function syncFab() {
    var b = document.getElementById('ask-fab-btn'); if (!b) return;
    b.style.display = (askState.open || currentRoute().screen === 'asktilli') ? 'none' : '';
  }

  // ========================================================
  //  MODALS + FLOWS
  // ========================================================
  function openModal(html, opts) {
    closeModal();
    var ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'ad-overlay';
    ov.innerHTML = '<div class="ad-modal-card' + (opts && opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true"><button class="dialog-close focus" data-mclose="1" aria-label="Close">×</button>' + html + '</div>';
    modalRoot.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
    ov.querySelectorAll('[data-mclose]').forEach(function (b) { b.addEventListener('click', closeModal); });
    document.addEventListener('keydown', escClose);
    return ov;
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal() { var ov = document.getElementById('ad-overlay'); if (ov) ov.remove(); document.removeEventListener('keydown', escClose); }
  function modalHead(title) { return '<div class="ad-modal-h"><h3>' + esc(title) + '</h3></div>'; }

  // ---- Message teacher (spec §5.1.2 + §6 compose) ----
  function composeMessage(sec) {
    openModal(modalHead('Message ' + sec.teacher) +
      '<p class="ad-mod-note" style="margin-bottom:14px">' + esc(sec.name) + ' · last activity ' + relDays(sec.lastActivityDays).toLowerCase() + '. A gentle nudge, not an alert.</p>' +
      '<textarea class="ad-copyblock" id="msg-body" style="min-height:120px">Hi ' + esc(sec.teacher.split(' ')[0]) + ', just checking in on ' + esc(sec.name) + ' — I noticed it has been quiet on Tilli lately. Anything I can help with?</textarea>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn btn-outline btn-sm" data-mclose="1">Cancel</button><button class="btn btn-primary btn-sm" id="msg-send">Send message</button></div>');
    document.getElementById('msg-send').addEventListener('click', function () { closeModal(); toast('Message sent to ' + sec.teacher + '.'); });
  }

  // ---- Concern queue + routing (spec §6.4) ----
  function openConcernQueue(filterStatus) {
    var counts = AD.concernCounts();
    var chips = ['All', 'New', 'Routed', 'Closed'].map(function (s) {
      var on = (filterStatus || 'All') === s;
      return '<button class="btn btn-sm ' + (on ? 'btn-cyan' : 'btn-outline') + '" data-cfilter="' + s + '">' + s + (s !== 'All' ? ' (' + counts[s] + ')' : '') + '</button>';
    }).join(' ');
    var list = AD.concerns.filter(function (c) { return !filterStatus || filterStatus === 'All' || c.status === filterStatus; });
    var body = list.map(function (c) {
      var st = c.status.toLowerCase();
      return '<div class="ad-concern"><div class="top"><div><div class="who">' + esc(c.student) + '</div><div class="meta">' + esc(c.section) + ' · ' + esc(c.teacher) + ' · ' + esc(c.date) + '</div></div><span class="ad-chip status-' + st + '">' + esc(c.status) + (c.routed_to ? ' → ' + esc(c.routed_to) : '') + '</span></div>' +
        '<p class="note">' + esc(c.note) + '</p>' +
        (c.outcome ? '<div class="outcome"><b>Outcome:</b> ' + esc(c.outcome) + '</div>' : '') +
        (c.status === 'New' ? '<div class="actions"><button class="btn btn-cyan btn-sm" data-route="' + c.id + '">Route to counsellor</button><button class="btn btn-outline btn-sm" data-handle="' + c.id + '">Handle internally</button></div>' :
         c.status === 'Routed' ? '<div class="actions"><button class="btn btn-outline btn-sm" data-close="' + c.id + '">Close with outcome</button></div>' : '') +
        '</div>';
    }).join('') || stEmpty('No concerns in this view.', 'Nothing to route right now.', true);

    openModal(modalHead('Concern queue') +
      '<p class="ad-mod-note" style="margin-bottom:14px">A routing queue, never an alarm. Names are visible to you as coordinator.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' + chips + '</div>' + body, { wide: true });

    modalRoot.querySelectorAll('[data-cfilter]').forEach(function (b) { b.addEventListener('click', function () { openConcernQueue(b.dataset.cfilter); }); });
    modalRoot.querySelectorAll('[data-route]').forEach(function (b) { b.addEventListener('click', function () { routeConcern(b.dataset.route, 'Counsellor'); }); });
    modalRoot.querySelectorAll('[data-handle]').forEach(function (b) { b.addEventListener('click', function () { routeConcern(b.dataset.handle, 'Handled internally'); }); });
    modalRoot.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeConcern(b.dataset.close); }); });
  }
  function routeConcern(id, to) {
    var c = AD.concerns.find(function (x) { return x.id === id; }); if (!c) return;
    openModal(modalHead('Route: ' + c.student) +
      '<p class="ad-mod-note" style="margin-bottom:12px">Routing to <b>' + esc(to) + '</b> requires a note.</p>' +
      '<textarea class="ad-copyblock" id="route-note" placeholder="Add a short note for whoever picks this up…" style="min-height:110px"></textarea>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn btn-outline btn-sm" data-back="1">Back</button><button class="btn btn-primary btn-sm" id="route-go">Confirm routing</button></div>');
    modalRoot.querySelector('[data-back]').addEventListener('click', function () { openConcernQueue(); });
    document.getElementById('route-go').addEventListener('click', function () {
      if (!document.getElementById('route-note').value.trim()) { toast('A note is required to route.'); return; }
      c.status = to === 'Handled internally' ? 'Closed' : 'Routed'; c.routed_to = to;
      if (to === 'Handled internally') c.outcome = 'Handled internally by the coordinator.';
      toast('Concern ' + (to === 'Handled internally' ? 'handled internally.' : 'routed to counsellor.')); openConcernQueue();
    });
  }
  function closeConcern(id) {
    var c = AD.concerns.find(function (x) { return x.id === id; }); if (!c) return;
    openModal(modalHead('Close: ' + c.student) +
      '<p class="ad-mod-note" style="margin-bottom:12px">Closed concerns stay in the queue, filterable.</p>' +
      '<textarea class="ad-copyblock" id="close-note" placeholder="Outcome note…" style="min-height:110px"></textarea>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn btn-outline btn-sm" data-back="1">Back</button><button class="btn btn-primary btn-sm" id="close-go">Close concern</button></div>');
    modalRoot.querySelector('[data-back]').addEventListener('click', function () { openConcernQueue(); });
    document.getElementById('close-go').addEventListener('click', function () {
      var v = document.getElementById('close-note').value.trim(); if (!v) { toast('Add an outcome note to close.'); return; }
      c.status = 'Closed'; c.outcome = v; toast('Concern closed.'); openConcernQueue();
    });
  }

  // ---- Completion detail (spec §5.2.4) — outstanding students, NO scores ----
  function completionDetail(secId) {
    var a = AD.activityFor(secId);
    var sd = AD.sections.find(function (s) { return s.id === secId; });
    var students = AD.studentsInSection(sd);
    // deterministic "outstanding" set sized to match the activity completion count
    var outstandingN = a.completion.total - a.completion.done;
    var outstanding = students.slice(students.length - outstandingN);
    var winLabel = AD.openPoint ? AD.openPoint.label : 'Assessment';
    openModal(modalHead(a.name + ' — ' + winLabel + ' completion') +
      '<p class="ad-mod-note" style="margin-bottom:14px">' + a.completion.done + ' of ' + countNoun(a.completion.total, 'student', 'students') + ' complete. This is completion only — no scores, bands or skill data.</p>' +
      (outstanding.length ? '<div style="font-weight:800;font-size:12px;color:var(--ink-450);margin-bottom:8px">STILL TO COMPLETE</div><div class="ad-tablewrap"><table class="ad-table" style="min-width:360px"><thead><tr><th>Student</th><th>Student ID</th></tr></thead><tbody>' +
        outstanding.map(function (s) { return '<tr><td class="name">' + esc(s.name) + '</td><td class="ad-num">' + esc(s.adm) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : stEmpty('All students complete.', 'Nothing outstanding for this window.', true)));
  }

  // ---- User invite ----
  function inviteUser() {
    openModal(modalHead('Invite a user') +
      '<div style="display:flex;flex-direction:column;gap:12px">' +
      '<label class="field">Email<input class="input" id="inv-email" placeholder="name@littlesprouts.edu"></label>' +
      '<label class="field">Role' + selectWrap('inv-role', [{ v: 'Teacher', t: 'Teacher' }, { v: 'Coordinator', t: 'Coordinator' }, { v: 'Principal', t: 'Principal (view-only)' }], 'Teacher') + '</label></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn btn-outline btn-sm" data-mclose="1">Cancel</button><button class="btn btn-primary btn-sm" id="inv-send">Send invite</button></div>');
    document.getElementById('inv-send').addEventListener('click', function () { var e = document.getElementById('inv-email').value.trim(); if (!e) { toast('Enter an email.'); return; } closeModal(); toast('Invitation sent to ' + e + '.'); });
  }

  // ---- Grade migration (spec §6.2) — full multi-step flow ----
  var GRADE_LADDER = ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  var SECTION_LIMIT = 30;
  var mig;
  function nextGrade(g) { var i = GRADE_LADDER.indexOf(g); return i >= 0 && i < GRADE_LADDER.length - 1 ? GRADE_LADDER[i + 1] : g; }
  function startMigration() {
    mig = {
      step: 'entry',
      rows: AD.students.map(function (s) { return { adm: s.adm, name: s.name, grade: s.grade, section: s.section, action: 'promote', toSection: s.section }; }),
      adds: [],
    };
    renderMigration();
  }
  function renderMigration() {
    var html = modalHead('Grade migration · ' + AD.academicYears[0]);
    if (mig.step === 'entry') {
      html += '<p class="ad-mod-note" style="margin-bottom:16px">This starts the year-end migration. Every enrolled student gets a proposed promotion you can adjust. Nothing is committed until the final step, and it can be undone for 24 hours.</p>' +
        '<div class="ad-privacy"><span aria-hidden="true">🔒</span><span>Historical assessment data stays attached to each child and to their prior section-year. Migration never moves or orphans results.</span></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button class="btn btn-outline btn-sm" data-mclose="1">Not now</button><button class="btn btn-primary btn-sm" data-mig="review">Begin review →</button></div>';
    } else if (mig.step === 'review') {
      html += '<p class="ad-mod-note" style="margin-bottom:14px">Adjust any student. Bulk-set a whole grade with the header control.</p>';
      AD.grades.forEach(function (g) {
        var gr = mig.rows.filter(function (r) { return r.grade === g; });
        html += '<div style="margin-bottom:18px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><b style="font-family:Quicksand,sans-serif;font-size:15px">' + esc(g) + ' → ' + esc(nextGrade(g)) + '</b>' +
          '<label class="select-wrap" style="max-width:190px"><select class="select" data-bulk="' + esc(g) + '"><option value="">Bulk action…</option><option value="promote">Promote all</option><option value="retain">Retain all</option><option value="graduate">Mark all graduating</option></select></label></div>' +
          '<div class="ad-tablewrap"><table class="ad-table" style="min-width:520px"><tbody>' +
          gr.map(function (r) {
            return '<tr><td class="name">' + esc(r.name) + '</td><td class="ad-num" style="color:var(--ink-300)">' + esc(r.adm) + '</td><td><label class="select-wrap"><select class="select" data-act="' + r.adm + '">' +
              [['promote', 'Promote → ' + nextGrade(r.grade)], ['retain', 'Retain in ' + r.grade], ['graduate', 'Graduating'], ['remove', 'Remove (left school)']].map(function (o) { return '<option value="' + o[0] + '"' + (r.action === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
              '</select></label></td></tr>';
          }).join('') + '</tbody></table></div></div>';
      });
      html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px"><button class="btn btn-outline btn-sm" data-mig="entry">Back</button><button class="btn btn-primary btn-sm" data-mig="add">Next: new intake →</button></div>';
    } else if (mig.step === 'add') {
      html += '<p class="ad-mod-note" style="margin-bottom:14px">Add new intake students. (CSV upload is desktop-only in the full product; add individually here.)</p>' +
        '<div id="mig-adds">' + mig.adds.map(addRowHTML).join('') + '</div>' +
        '<button class="btn btn-outline btn-sm" data-addrow="1" style="margin-top:6px">+ Add a student</button>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button class="btn btn-outline btn-sm" data-mig="review">Back</button><button class="btn btn-primary btn-sm" data-mig="preview">Preview →</button></div>';
    } else if (mig.step === 'preview') {
      var sum = migSummary();
      html += '<p class="ad-mod-note" style="margin-bottom:14px">Review before committing.</p>' +
        '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:18px">' +
        [['Promoted', sum.promote], ['Retained', sum.retain], ['Graduating', sum.graduate], ['Removed', sum.remove], ['Added', sum.add]].map(function (p) { return '<div class="ad-stat"><div class="num">' + p[1] + '</div><div class="lbl">' + p[0] + '</div></div>'; }).join('') + '</div>' +
        '<div style="font-weight:800;font-size:12px;color:var(--ink-450);margin-bottom:8px">RESULTING SECTION HEADCOUNTS</div><div class="ad-tablewrap"><table class="ad-table" style="min-width:360px"><tbody>' +
        Object.keys(sum.headcounts).map(function (k) { var n = sum.headcounts[k]; return '<tr><td class="name">' + esc(k) + '</td><td class="ad-num">' + countNoun(n, 'student', 'students') + (n > SECTION_LIMIT ? ' <span class="ad-chip slowing"><span class="dot"></span>over limit</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button class="btn btn-outline btn-sm" data-mig="add">Back</button><button class="btn btn-primary btn-sm" data-mig="commit">Commit migration</button></div>';
    } else if (mig.step === 'commit') {
      var s2 = migSummary();
      html += '<div style="text-align:center;padding:14px 0"><div style="font-size:34px;margin-bottom:8px">✓</div><h3 style="font-family:Quicksand,sans-serif;margin:0 0 6px">Migration committed</h3>' +
        '<p class="ad-mod-note" style="max-width:44ch;margin:0 auto 14px">' + s2.promote + ' promoted, ' + s2.retain + ' retained, ' + s2.graduate + ' graduating, ' + s2.remove + ' removed, ' + s2.add + ' added. Historical assessment data remains attached to each child and their prior section.</p>' +
        '<div class="ad-privacy" style="justify-content:center;max-width:420px;margin:0 auto"><span aria-hidden="true">↩</span><span>You can undo this entire migration as one transaction for the next 24 hours.</span></div>' +
        '<div style="margin-top:18px"><button class="btn btn-outline btn-sm" data-mig="undo">Undo migration</button> <button class="btn btn-primary btn-sm" data-mclose="1">Done</button></div></div>';
    }
    var ov = openModal(html, { wide: mig.step === 'review' || mig.step === 'preview' });
    // wiring
    ov.querySelectorAll('[data-mig]').forEach(function (b) { b.addEventListener('click', function () { var to = b.dataset.mig; if (to === 'undo') { closeModal(); toast('Migration undone — roster restored.'); return; } if (mig.step === 'add') collectAdds(ov); mig.step = to; renderMigration(); }); });
    ov.querySelectorAll('[data-act]').forEach(function (s) { s.addEventListener('change', function () { var r = mig.rows.find(function (x) { return x.adm === s.dataset.act; }); if (r) r.action = s.value; }); });
    ov.querySelectorAll('[data-bulk]').forEach(function (s) { s.addEventListener('change', function () { if (!s.value) return; mig.rows.forEach(function (r) { if (r.grade === s.dataset.bulk) r.action = s.value; }); renderMigration(); }); });
    var ar = ov.querySelector('[data-addrow]'); if (ar) ar.addEventListener('click', function () { collectAdds(ov); mig.adds.push({ name: '', grade: AD.grades[0], section: 'A' }); renderMigration(); });
    ov.querySelectorAll('[data-addfield]').forEach(function (f) { f.addEventListener('input', function () {}); });
  }
  function addRowHTML(a, i) {
    var gOpts = AD.grades.map(function (g) { return '<option' + (a.grade === g ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('');
    return '<div style="display:grid;grid-template-columns:1fr 130px 90px;gap:8px;margin-bottom:8px" data-addidx="' + i + '">' +
      '<input class="input" data-addfield="name" data-i="' + i + '" placeholder="Full name" value="' + esc(a.name) + '">' +
      '<label class="select-wrap"><select class="select" data-addfield="grade" data-i="' + i + '">' + gOpts + '</select></label>' +
      '<input class="input" data-addfield="section" data-i="' + i + '" placeholder="Sec" value="' + esc(a.section) + '"></div>';
  }
  function collectAdds(ov) {
    ov.querySelectorAll('[data-addfield]').forEach(function (f) { var i = +f.dataset.i; if (mig.adds[i]) mig.adds[i][f.dataset.addfield] = f.value; });
  }
  function migSummary() {
    var s = { promote: 0, retain: 0, graduate: 0, remove: 0, add: mig.adds.filter(function (a) { return (a.name || '').trim(); }).length };
    mig.rows.forEach(function (r) { s[r.action]++; });
    var hc = {};
    mig.rows.forEach(function (r) {
      if (r.action === 'remove' || r.action === 'graduate') return;
      var g = r.action === 'promote' ? nextGrade(r.grade) : r.grade;
      var key = g + ' ' + r.section; hc[key] = (hc[key] || 0) + 1;
    });
    mig.adds.forEach(function (a) { if (!(a.name || '').trim()) return; var key = a.grade + ' ' + (a.section || 'A'); hc[key] = (hc[key] || 0) + 1; });
    return { promote: s.promote, retain: s.retain, graduate: s.graduate, remove: s.remove, add: s.add, headcounts: hc };
  }

  // ============================================================
  //  PREVIEW-STATE TOGGLE  (demo / dev tooling — NOT part of the
  //  shipped leadership UI). Lets you see the coordinator dashboard
  //  at every stage of a school's assessment year by flipping the
  //  lifecycle state in ADMIN_DATA, then re-rendering. Lives OUTSIDE
  //  #ad-app so it survives full re-renders. Delete this block (and
  //  the LIFECYCLE_STATES layer in admin-data.js) to ship.
  // ============================================================
  function buildStatePanel() {
    if (document.getElementById('ad-statepanel')) return;
    var wrap = document.createElement('div');
    wrap.className = 'ad-statepanel'; wrap.id = 'ad-statepanel';
    document.body.appendChild(wrap);
    renderStatePanel();
  }
  function renderStatePanel() {
    var wrap = document.getElementById('ad-statepanel'); if (!wrap) return;
    var active = AD.lifecycleState;
    var collapsed = wrap.classList.contains('collapsed');
    wrap.innerHTML =
      '<div class="ad-sp-head">' +
        '<span class="ad-sp-title">Preview stage <span class="ad-sp-new" title="Newly added demo control — remove before shipping">*</span></span>' +
        '<button class="ad-sp-toggle" data-sptoggle="1" title="Show / hide the preview-stage buttons">' + (collapsed ? '▸' : '▾') + '</button>' +
      '</div>' +
      '<div class="ad-sp-body">' +
        '<p class="ad-sp-hint">See the coordinator dashboard at each point of a school\'s year. Not shown to real users.</p>' +
        AD.lifecycleStates.map(function (s) {
          return '<button class="ad-sp-btn' + (s.key === active ? ' on' : '') + '" data-spstate="' + esc(s.key) + '" title="' + esc(s.hint) + '">' +
            '<span class="ad-sp-dot"></span>' + esc(s.label) + '</button>';
        }).join('') +
      '</div>';
    wrap.querySelector('[data-sptoggle]').addEventListener('click', function () { wrap.classList.toggle('collapsed'); renderStatePanel(); });
    wrap.querySelectorAll('[data-spstate]').forEach(function (b) {
      b.addEventListener('click', function () {
        AD.setLifecycleState(b.dataset.spstate);
        render();
        renderStatePanel();
        var s = AD.lifecycleStates.find(function (x) { return x.key === AD.lifecycleState; });
        toast('Preview: ' + (s ? s.label : '') + ' stage.');
      });
    });
  }

  // ---------- boot ----------
  buildStatePanel();
  buildFab();
  if (!location.hash) go('overview', {}, { replace: true }); else render();
})();
