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
  function initials(name) { var p = String(name || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); }
  function relDays(d) { return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago'; }
  function plural(n, s) { return n + ' ' + s + (n === 1 ? '' : 's'); }
  var SCREENS = ['overview', 'implementation', 'outcomes', 'roster', 'reports'];

  var toastTimer;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200); }

  // ---------- band rendering (shared by Outcomes + Reports) ----------
  function bandBar(dist, slim) {
    var p = dist.pct;
    return '<div class="ad-bar' + (slim ? ' slim' : '') + '" role="img" aria-label="' +
      AD.bands.map(function (b) { return b.label + ' ' + p[b.key] + '%'; }).join(', ') + '">' +
      AD.bands.map(function (b) { return p[b.key] > 0 ? '<span style="width:' + p[b.key] + '%;background:' + b.color + '"></span>' : ''; }).join('') +
      '</div>';
  }
  function bandLegend() {
    return '<div class="ad-legend">' + AD.bands.map(function (b) {
      return '<span class="ad-bandchip"><i style="background:' + b.color + '"></i>' + b.label + '</span>';
    }).join('') + '</div>';
  }
  // Cadence label — every periodic module carries one (spec §3).
  function cadence(pointKey) {
    var pt = AD.points.find(function (p) { return p.key === pointKey; }) || AD.latestComplete;
    var next = AD.openPoint;
    return '<span class="ad-cadence">' + esc(pt.label) + ' · ' + esc(pt.month) +
      (next ? '<span class="next">Next: ' + esc(next.label) + ' · ' + esc(next.month) + '</span>' : '') + '</span>';
  }

  // ============================================================
  //  Config flag — see spec §2. Showing an individual child's stage
  //  to leadership breaks the "identity, not outcomes" wall. Kept
  //  behind this single flag so it is a one-line change to remove.
  //  TODO(privacy): set to false to honour the spec.
  // ============================================================
  var SHOW_STUDENT_STAGE = true;

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
      '<div class="ad-radar-legend">' + ps.series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.label) + '</span>'; }).join('') + '</div></div>';
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
    { key: 'asktilli', label: 'Ask Tilli', disabled: true },   // placeholder — out of scope for v1 (spec §12)
    { key: 'overview', label: 'Overview' },
    { key: 'implementation', label: 'Implementation' },
    { key: 'outcomes', label: 'Outcomes' },
    { key: 'roster', label: 'Roster' },      // absent for principal
    { key: 'reports', label: 'Reports' },
  ];
  function navItems() { return NAV.filter(function (n) { return !(n.key === 'roster' && isPrincipal); }); }

  function chromeHTML(r) {
    var roleLabel = isPrincipal ? 'Principal' : 'Coordinator';
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

    var bottom = '<nav class="ad-bottomnav dash-bottomnav">' + navItems().filter(function (n) { return !n.disabled; }).map(function (n) {
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
    m.innerHTML = '<div class="who"><b>' + esc(me.name) + '</b><span>' + esc(me.email) + '</span></div>' +
      '<button data-am="switch">Switch school year</button>' +
      '<button data-am="signout">Sign out</button>';
    document.querySelector('.ad-header').parentNode.appendChild(m);
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
  }

  // small helpers for building modules
  function card(title, note, bodyHTML, extraClass, headRight) {
    return '<div class="ad-card ' + (extraClass || '') + '">' +
      (title ? '<div class="ad-mod-h"><div><h3 class="ad-mod-title">' + esc(title) + '</h3>' + (note ? '<p class="ad-mod-note">' + note + '</p>' : '') + '</div>' + (headRight || '') + '</div>' : '') +
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
  SCREEN.overview = function (params, body) {
    var wc = AD.windowCompletion();
    var counts = AD.concernCounts();
    var quiet = AD.activity.filter(function (a) { return a.lastActivityDays >= AD.quietThresholdDays; })
      .sort(function (a, b) { return b.lastActivityDays - a.lastActivityDays; });

    // 2) Quiet sections — the most important module.
    var quietBody;
    if (!quiet.length) {
      quietBody = stEmpty('All sections active in the last ' + AD.quietThresholdDays + ' days.', 'Nothing needs your attention here right now.', true);
    } else {
      quietBody = '<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Section</th><th>Teacher</th><th>Last activity</th><th></th></tr></thead><tbody>' +
        quiet.map(function (s) {
          return '<tr><td class="name">' + esc(s.name) + '</td><td>' + esc(s.teacher) + '</td>' +
            '<td class="ad-num">' + relDays(s.lastActivityDays) + '</td>' +
            '<td style="text-align:right;white-space:nowrap"><button class="link-btn" data-viewsec="' + s.id + '">View section</button>' +
            (isCoordinator ? ' <span style="color:var(--ink-300)">·</span> <button class="link-btn" data-msg="' + s.id + '">Message teacher</button>' : '') +
            '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    // 4) Open concerns
    var concernsBody;
    if (isCoordinator) {
      concernsBody = '<div style="display:flex;gap:22px;flex-wrap:wrap">' +
        [['New', 'status-new'], ['Routed', 'status-routed'], ['Closed', 'status-closed']].map(function (p) {
          return '<div class="ad-stat"><div class="num">' + counts[p[0]] + '</div><div class="lbl"><span class="ad-chip ' + p[1] + '">' + p[0] + '</span></div></div>';
        }).join('') + '</div>' +
        '<button class="btn btn-outline btn-sm" data-openqueue="1" style="margin-top:16px">Open concern queue →</button>';
    } else {
      concernsBody = '<div style="display:flex;gap:22px;flex-wrap:wrap">' +
        [['New'], ['Routed'], ['Closed']].map(function (p) { return '<div class="ad-stat"><div class="num">' + counts[p[0]] + '</div><div class="lbl">' + p[0] + '</div></div>'; }).join('') + '</div>' +
        '<div class="ad-privacy"><span aria-hidden="true">🔒</span><span>Names are visible to the counsellor and coordinator only.</span></div>';
    }

    // 3) Assessment window status
    var op = AD.openPoint;
    var windowBody = op
      ? '<div class="ad-stat"><div class="num">' + wc.sections.done + ' <span style="font-size:18px;color:var(--ink-300)">of ' + wc.sections.total + '</span></div><div class="lbl">sections complete</div></div>' +
        '<p class="ad-mod-note" style="margin-top:12px">' + esc(op.label) + ' is <b>open</b> · closes ' + esc(AD.endlineCloses) + '. ' + wc.students.done + ' of ' + wc.students.total + ' students assessed.</p>'
      : stEmpty('No assessment window is open.', 'Next: ' + AD.openPoint);

    // 5) Last outcome snapshot (periodic)
    var snap = outcomeSnapshot();

    // Quick-count chips (identity/setup counts — continuous, no cadence).
    var chips = '<div class="ad-chiprow">' +
      metachip(AD.students.length, 'students') +
      metachip(AD.teachers.length, 'staff members') +
      metachip(AD.sections.length, 'sections') +
      metachip(AD.skills.length, 'skills tracked') + '</div>';

    // Skill-summary cards — grouped by the band MOST children sit in
    // (periodic → carries a cadence label). Neutral band colours, no red.
    var summarySection = '';
    if (AD.completedPoints.length) {
      var groups = AD.schoolSkillGroups(AD.latestComplete.key);
      var order = [
        { key: 'emerging', head: 'skills where most children are still emerging' },
        { key: 'developing', head: 'skills where most children are developing' },
        { key: 'secure', head: 'skills where most children are secure' },
      ];
      var sumBody = '<div class="ad-sumgrid">' + order.map(function (o) {
        var g = groups[o.key], bm = AD.bandMeta(o.key);
        return '<div class="ad-sumcard" style="--band:' + bm.color + '">' +
          '<div class="n">' + g.length + '</div><div class="h">' + esc(o.head) + '</div>' +
          (g.length ? '<ul>' + g.map(function (s) { return '<li>' + esc(s.name) + '</li>'; }).join('') + '</ul>' : '<div class="none">None in this group.</div>') +
          '</div>';
      }).join('') + '</div>' +
      '<p class="ad-mod-note" style="margin-top:14px">Each skill is placed by whichever band most children are in — the same reading as the colour bars in Outcomes. <button class="link-btn" data-tooutcomes="1">See every skill →</button></p>';
      summarySection = '<div style="margin-top:var(--ad-gap)">' + card('How each skill is doing', 'Where most children sit for each skill, school-wide.', sumBody, 'span2', '<div>' + cadence(AD.latestComplete.key) + '</div>') + '</div>';
    }

    body.innerHTML = screenHead('Overview', 'A calm read on whether the programme is running, working, and where to step in.') +
      chips +
      '<div class="ad-status" style="margin-bottom:var(--ad-gap)">' + esc(AD.statusLine()) + '</div>' +
      card('Quiet sections', 'Sections with no activity in ' + AD.quietThresholdDays + '+ days, most silent first.', quietBody, 'span2 accent') +
      '<div class="ad-grid two" style="margin-top:var(--ad-gap)">' +
        card('Assessment window', null, windowBody) +
        card('Open concerns', 'Teacher-raised, by status.', concernsBody) +
      '</div>' +
      '<div style="margin-top:var(--ad-gap)">' +
        card('Last outcome snapshot', null, snap, '', '<div>' + cadence(AD.latestComplete.key) + '</div>') +
      '</div>' +
      summarySection;

    // wiring
    body.querySelectorAll('[data-viewsec]').forEach(function (b) { b.addEventListener('click', function () { var a = AD.activityFor(b.dataset.viewsec); go('implementation', { grade: a.grade, section: a.id }); }); });
    body.querySelectorAll('[data-msg]').forEach(function (b) { b.addEventListener('click', function () { composeMessage(AD.activityFor(b.dataset.msg)); }); });
    var oq = body.querySelector('[data-openqueue]'); if (oq) oq.addEventListener('click', openConcernQueue);
    body.querySelectorAll('[data-tooutcomes]').forEach(function (b) { b.addEventListener('click', function () { go('outcomes', { point: AD.latestComplete.key }); }); });
  };
  function metachip(n, label) { return '<span class="ad-metachip"><b>' + n + '</b> ' + esc(label) + '</span>'; }

  function outcomeSnapshot() {
    if (!AD.completedPoints.length) return stEmpty('Not yet measured.', 'Skill bands appear after Baseline · ' + AD.points[0].month + '.');
    // % of skill×student readings that are Secure at the latest complete point, school-wide.
    var pt = AD.latestComplete;
    var secure = 0, tot = 0;
    AD.students.forEach(function (st) { st.skills.forEach(function (sk) { tot++; if (AD.bandOf(sk[pt.scoreField]) === 'secure') secure++; }); });
    var pctSecure = Math.round((secure / tot) * 100);
    return '<div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">' +
      '<div class="ad-stat"><div class="num">' + pctSecure + '%</div><div class="lbl">of skill readings are Secure at ' + esc(pt.label) + '</div></div>' +
      '<div style="flex:1;min-width:200px">' + bandBar(schoolDistAllSkills(pt.key)) + '<div style="margin-top:10px">' + bandLegend() + '</div></div>' +
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
  SCREEN.implementation = function (params, body) {
    var grade = params.grade || '';
    var section = params.section || '';
    var range = params.range || '30';

    // filters
    var gradeOpts = [{ v: '', t: 'All grades' }].concat(AD.grades.map(function (g) { return { v: g, t: g }; }));
    var secOpts = [{ v: '', t: 'All sections' }].concat(AD.sections.filter(function (s) { return !grade || s.grade === grade; }).map(function (s) { return { v: s.id, t: s.name }; }));
    var rangeOpts = [{ v: '7', t: 'Last 7 days' }, { v: '30', t: 'Last 30 days' }, { v: '90', t: 'Last 90 days' }];
    var filters = '<div class="ad-filters">' +
      selectWrap('f-grade', gradeOpts, grade, 'Grade') +
      selectWrap('f-section', secOpts, section, 'Section') +
      selectWrap('f-range', rangeOpts, range, 'Date range') +
      '<button class="btn btn-outline btn-sm ad-refresh" id="f-refresh" title="Data changes rarely — refresh to re-pull activity">↻ Refresh</button></div>';

    // filtered rows
    var rows = AD.activity.filter(function (a) { return (!grade || a.grade === grade) && (!section || a.id === section); });
    rows = rows.slice().sort(function (a, b) {
      var k = implSort.key, av = a[k], bv = b[k];
      if (k === 'name' || k === 'teacher') { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (k === 'completion') { av = a.completion.done / a.completion.total; bv = b.completion.done / b.completion.total; }
      var r = av < bv ? -1 : av > bv ? 1 : 0; return implSort.dir === 'asc' ? r : -r;
    });
    function sortableTh(key, label, num) { var on = implSort.key === key; return '<th class="sortable' + (num ? ' ad-num' : '') + '" data-sort="' + key + '">' + esc(label) + (on ? ' <span class="arw">' + (implSort.dir === 'asc' ? '▲' : '▼') + '</span>' : '') + '</th>'; }
    var tableBody = !rows.length ? stEmpty('No sections match these filters.', 'Try widening the grade or section filter.') :
      '<div class="ad-tablewrap"><table class="ad-table"><thead><tr>' +
        sortableTh('name', 'Section') + sortableTh('teacher', 'Teacher') + sortableTh('lastActivityDays', 'Last activity') +
        sortableTh('sessions30', 'Ask Tilli sessions', true) + sortableTh('completion', 'Assessment completion') + sortableTh('status', 'Status') +
      '</tr></thead><tbody>' + rows.map(function (a) {
        return '<tr class="clickable" data-secdetail="' + a.id + '"><td class="name">' + esc(a.name) + '</td><td>' + esc(a.teacher) + '</td>' +
          '<td class="ad-num">' + relDays(a.lastActivityDays) + '</td>' +
          '<td class="ad-num">' + a.sessions30 + '</td>' +
          '<td class="ad-num">' + a.completion.done + ' / ' + a.completion.total + ' students</td>' +
          '<td>' + statusChip(a.status) + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    // activity over time (aggregate weeks of filtered rows)
    var weeks = [];
    for (var w = 0; w < 12; w++) weeks.push(rows.reduce(function (sum, a) { return sum + (a.weeks[w] || 0); }, 0));
    var maxW = Math.max.apply(null, weeks.concat([1]));
    var colChart = '<div class="ad-cols">' + weeks.map(function (v) { return '<div class="col' + (v === 0 ? ' dim' : '') + '" style="height:' + Math.max(3, Math.round(v / maxW * 130)) + 'px" title="' + v + ' sessions"></div>'; }).join('') +
      '</div><div class="ad-colx">' + weeks.map(function (_, i) { return '<span>' + (i % 3 === 0 ? 'W' + (i + 1) : '') + '</span>'; }).join('') + '</div>';

    // teacher effort (support delivered — never surveillance)
    var maxSup = Math.max.apply(null, rows.map(function (a) { return a.supportAnswered; }).concat([1]));
    var effort = '<div class="ad-tablewrap"><table class="ad-table" style="min-width:420px"><thead><tr><th>Section</th><th>Teacher</th><th class="ad-num">Support requests answered</th></tr></thead><tbody>' +
      rows.slice().sort(function (a, b) { return b.supportAnswered - a.supportAnswered; }).map(function (a) {
        return '<tr><td class="name">' + esc(a.name) + '</td><td>' + esc(a.teacher) + '</td><td class="ad-num"><div style="display:flex;align-items:center;gap:10px"><div style="flex:1;max-width:140px;height:8px;border-radius:4px;background:var(--surface-100);overflow:hidden"><span style="display:block;height:100%;width:' + Math.round(a.supportAnswered / maxSup * 100) + '%;background:var(--green-500)"></span></div>' + a.supportAnswered + '</div></td></tr>';
      }).join('') + '</tbody></table></div>';

    body.innerHTML = screenHead('Implementation', 'Is it happening? Live activity across every section.') +
      filters +
      card('Section activity', 'Sorted with the sections that need attention first. Click a row for completion detail.', tableBody, 'span2') +
      '<div class="ad-grid two" style="margin-top:var(--ad-gap)">' +
        card('Activity over time', 'Ask Tilli sessions per week' + (grade || section ? ', filtered.' : ', school-wide.'), colChart) +
        card('Teacher effort', 'Support delivered to children, per section — not a ranking.', effort) +
      '</div>';

    // wiring
    body.querySelector('#f-grade').addEventListener('change', function (e) { setParams({ grade: e.target.value, section: '', range: range }); });
    body.querySelector('#f-section').addEventListener('change', function (e) { setParams({ grade: grade, section: e.target.value, range: range }); });
    body.querySelector('#f-range').addEventListener('change', function (e) { setParams({ grade: grade, section: section, range: e.target.value }); });
    body.querySelector('#f-refresh').addEventListener('click', function () { toast('Activity refreshed.'); });
    body.querySelectorAll('[data-sort]').forEach(function (th) { th.addEventListener('click', function () { var k = th.dataset.sort; if (implSort.key === k) implSort.dir = implSort.dir === 'asc' ? 'desc' : 'asc'; else { implSort.key = k; implSort.dir = (k === 'name' || k === 'teacher') ? 'asc' : 'desc'; } render(); }); });
    if (isCoordinator) body.querySelectorAll('[data-secdetail]').forEach(function (tr) { tr.addEventListener('click', function () { completionDetail(tr.dataset.secdetail); }); });
  };
  function statusChip(s) { var lbl = { active: 'Active', slowing: 'Slowing', quiet: 'Quiet' }[s]; return '<span class="ad-chip ' + s + '"><span class="dot"></span>' + lbl + '</span>'; }

  // ========================================================
  //  3) OUTCOMES  (spec §5.3) — periodic data only
  // ========================================================
  SCREEN.outcomes = function (params, body) {
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

    // Module 1+2: skill band distribution + interpretation line
    var gradeBand = grade || 'school';
    var distBody = '<div style="margin-bottom:14px">' + bandLegend() + '</div>' + AD.skills.map(function (sk) {
      var d = AD.distribution(students, sk.key, point);
      var interp = AD.interpret(sk.key, gradeBand, point, AD.shapeOf(d));
      return '<div class="ad-skillrow"><div class="ad-skillname">' + esc(sk.name) + '<small>' + (sk.group === 'sel' ? 'Social-emotional' : 'Cognitive') + '</small></div>' +
        '<div>' + bandBar(d) + '<p class="ad-interp' + (interp.placeholder ? ' placeholder' : '') + '">' + esc(interp.text) + '</p></div></div>';
    }).join('');

    // Module 3: movement since baseline (needs ≥2 complete points)
    var moveBody;
    if (AD.completedPoints.length < 2) {
      moveBody = stEmpty('Movement will appear after ' + AD.points[1].label + ' · ' + AD.points[1].month + '.', 'It needs two completed assessment points to compare.');
    } else {
      moveBody = AD.skills.map(function (sk) {
        var m = AD.movement(students, sk.key);
        return '<div class="ad-skillrow"><div class="ad-skillname">' + esc(sk.name) + '</div><div class="ad-move">' +
          '<span class="up">▲ ' + m.up + ' up</span><span class="same">● ' + m.same + ' held</span><span class="down">▼ ' + m.down + ' down</span>' +
          '<span style="margin-left:auto;font-weight:700;color:var(--ink-300)">' + (m.net > 0 ? '+' + m.net + ' net up' : m.net < 0 ? m.net + ' net' : 'no net change') + '</span></div></div>';
      }).join('');
    }

    // Module 4: progress over time (named markers; never interpolate missing points)
    var progBody = '<div style="margin-bottom:14px">' + bandLegend() + '</div>' + AD.skills.map(function (sk) {
      var track = '<div class="ad-track">' + AD.points.map(function (pt) {
        if (pt.status === 'complete') { var d = AD.distribution(students, sk.key, pt.key); return '<div class="ad-point"><div class="plabel">' + esc(pt.label) + '</div>' + bandBar(d, true) + '<div class="pmeta">' + esc(pt.month) + '</div></div>'; }
        return '<div class="ad-point pending"><div class="plabel">' + esc(pt.label) + '</div><div class="ad-bar slim"><span style="width:100%;background:var(--line-200)"></span></div><div class="pmeta">not yet measured</div></div>';
      }).join('') + '</div>';
      return '<div class="ad-skillrow"><div class="ad-skillname">' + esc(sk.name) + '</div>' + track + '</div>';
    }).join('');

    // Module 5: target vs actual (only if targets set)
    var targetCard = '';
    if (AD.targetsSet) {
      var tActualPt = AD.latestComplete.key;
      var targetBody = '<div style="margin-bottom:14px">' + bandLegend() + '</div>' + AD.skills.map(function (sk) {
        var actual = AD.distribution(students, sk.key, tActualPt);
        var tgt = scopedTarget(scope, sk.key);
        return '<div class="ad-skillrow"><div class="ad-skillname">' + esc(sk.name) + '</div><div>' +
          '<div style="font-size:11px;font-weight:800;color:var(--ink-300);margin-bottom:3px">TARGET (Endline)</div>' + bandBar({ pct: tgt }, true) +
          '<div style="font-size:11px;font-weight:800;color:var(--ink-300);margin:8px 0 3px">ACTUAL (' + esc(AD.latestComplete.label) + ')</div>' + bandBar(actual, true) +
          '</div></div>';
      }).join('');
      targetCard = '<div style="margin-top:var(--ad-gap)">' + card('Target vs actual', 'Targets set at Baseline for Endline, against the latest measured point.', targetBody, '', '<div>' + cadence(tActualPt) + '</div>') + '</div>';
    }

    // Module 6: compare sections (grade has ≥2 sections)
    var compareCard = '';
    var compareGrade = grade || (section ? (AD.sections.find(function (s) { return s.id === section; }) || {}).grade : '');
    if (compareGrade) {
      var gsecs = AD.sections.filter(function (s) { return s.grade === compareGrade; });
      if (gsecs.length >= 2) {
        var cmpBody = '<div style="margin-bottom:14px">' + bandLegend() + '</div>' + AD.skills.map(function (sk) {
          return '<div class="ad-skillrow"><div class="ad-skillname">' + esc(sk.name) + '</div><div style="display:flex;flex-direction:column;gap:7px">' +
            gsecs.map(function (s) { var d = AD.distribution(AD.studentsInSection(s), sk.key, point); return '<div style="display:grid;grid-template-columns:92px 1fr;gap:10px;align-items:center"><span style="font-size:11.5px;font-weight:700;color:var(--ink-450)">' + esc(s.name) + '</span>' + bandBar(d, true) + '</div>'; }).join('') +
            '</div></div>';
        }).join('');
        var cmpRadars = '<div style="margin-top:18px;border-top:1px solid var(--line-200);padding-top:16px"><div class="ad-mod-note" style="margin-bottom:10px">Multi-perspective view per section (mock data).</div><div class="ad-grid two">' +
          gsecs.slice(0, 2).map(function (s) { return '<div><div style="text-align:center;font-weight:800;font-size:13px;color:var(--ink-700);margin-bottom:2px">' + esc(s.name) + '</div>' + radarBlock(AD.studentsInSection(s), point) + '</div>'; }).join('') + '</div></div>';
        compareCard = '<div style="margin-top:var(--ad-gap)">' + card('Compare sections — ' + compareGrade, 'Side-by-side band distribution across this grade.', cmpBody + cmpRadars, '', '<div>' + cadence(point) + '</div>') + '</div>';
      }
    }

    // Grade/section navigator — the mockup's "See your school as grades"
    // → "Look deeper into [grade]" drill. Sits above the skill detail.
    var navCards = '';
    if (level === 'school') navCards = '<div style="margin-bottom:var(--ad-gap)">' + card('See your school as grades', 'Open a grade to look deeper.', gradeNavHTML(point), 'span2') + '</div>';
    else if (level === 'grade') navCards = '<div style="margin-bottom:var(--ad-gap)">' + card('Look deeper into ' + esc(grade), 'Open a section for its full skill view.', sectionNavHTML(grade, point), 'span2') + '</div>';

    // Areas of growth / strength (grade + section scope).
    var gsCard = '';
    if (level !== 'school') {
      var gs = AD.growthStrength(students, point, 2);
      var em = AD.bandMeta('emerging'), se = AD.bandMeta('secure');
      var gGrowth = '<div class="ad-gs" style="--band:' + em.color + ';--bandwash:' + em.wash + '"><h4>Areas of growth</h4><ul>' + gs.growth.map(function (x) { return '<li>' + esc(x.name) + '<span class="p">' + x.secure + '% secure</span></li>'; }).join('') + '</ul></div>';
      var gStrength = '<div class="ad-gs" style="--band:' + se.color + ';--bandwash:' + se.wash + '"><h4>Areas of strength</h4><ul>' + gs.strength.map(function (x) { return '<li>' + esc(x.name) + '<span class="p">' + x.secure + '% secure</span></li>'; }).join('') + '</ul></div>';
      gsCard = '<div class="ad-grid two" style="margin-bottom:var(--ad-gap)">' + gGrowth + gStrength + '</div>';
    }

    // Multi-perspective radar (grade + section scope) — mock data.
    var radarCard = '';
    if (level !== 'school') radarCard = '<div style="margin-top:var(--ad-gap)">' + card('Multi-perspective view', 'How teachers, parents and children each rate this group — mock data for now.', radarBlock(students, point), '', '<div>' + cadence(point) + '</div>') + '</div>';

    // Compare two classes — pick ANY two sections school-wide and read their
    // skill-band distributions side by side at the selected point. Independent
    // of the scope filters above (kept in module state, not the URL). Re-renders
    // in place on change so it never yanks the page back to the top.
    var validIds = AD.sections.map(function (s) { return s.id; });
    if (validIds.indexOf(cmpTwo.a) < 0) cmpTwo.a = AD.sections[0].id;
    if (validIds.indexOf(cmpTwo.b) < 0) cmpTwo.b = (AD.sections[1] || AD.sections[0]).id;
    function cmp2Options(sel) { return AD.sections.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === sel ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join(''); }
    function cmp2HTML() {
      var secA = AD.sections.find(function (s) { return s.id === cmpTwo.a; });
      var secB = AD.sections.find(function (s) { return s.id === cmpTwo.b; });
      var pickers = '<div class="cmp-pickers">' +
        '<div class="cmp-pick"><span class="cmp-cap">Class A</span><label class="select-wrap"><select class="select" id="o-classa" title="First class to compare">' + cmp2Options(cmpTwo.a) + '</select></label></div>' +
        '<span class="cmp-vs">vs</span>' +
        '<div class="cmp-pick"><span class="cmp-cap">Class B</span><label class="select-wrap"><select class="select" id="o-classb" title="Second class to compare">' + cmp2Options(cmpTwo.b) + '</select></label></div>' +
        '</div>';
      var inner;
      if (cmpTwo.a === cmpTwo.b) {
        inner = pickers + stEmpty('Pick two different classes.', 'Choose another class in one of the dropdowns to compare them side by side.');
      } else {
        function cmpRow(nm, d) { return '<div class="cmp-row"><span class="cmp-row-lbl">' + esc(nm) + '</span>' + bandBar(d, true) + '</div>'; }
        inner = pickers + '<div style="margin:2px 0 14px">' + bandLegend() + '</div>' + AD.skills.map(function (sk) {
          var dA = AD.distribution(AD.studentsInSection(secA), sk.key, point);
          var dB = AD.distribution(AD.studentsInSection(secB), sk.key, point);
          return '<div class="ad-skillrow"><div class="ad-skillname">' + esc(sk.name) + '</div><div style="display:flex;flex-direction:column;gap:8px">' + cmpRow(secA.name, dA) + cmpRow(secB.name, dB) + '</div></div>';
        }).join('');
      }
      return card('Compare two classes', '<span class="ad-chip status-new" style="margin-right:8px">New</span>Any two classes, side by side at the selected point.', inner, 'span2', '<div>' + cadence(point) + '</div>');
    }
    function wireCmp2() {
      var host = document.getElementById('o-cmp2'); if (!host) return;
      var a = document.getElementById('o-classa'), b = document.getElementById('o-classb');
      if (a) a.addEventListener('change', function (e) { cmpTwo.a = e.target.value; host.innerHTML = cmp2HTML(); wireCmp2(); });
      if (b) b.addEventListener('change', function (e) { cmpTwo.b = e.target.value; host.innerHTML = cmp2HTML(); wireCmp2(); });
    }

    body.innerHTML = screenHead('Outcomes', 'Is it working? Skill bands and movement — never individual results.') +
      crumbs + filters + navCards + gsCard +
      card('Skill band distribution', 'Where children sit across bands for each skill, at the selected point.', distBody, 'span2', '<div>' + cadence(point) + '</div>') +
      '<div id="o-cmp2" style="margin-top:var(--ad-gap)">' + cmp2HTML() + '</div>' +
      radarCard +
      '<div style="margin-top:var(--ad-gap)">' + card('Movement since baseline', 'Net band movement per skill, Baseline → ' + AD.latestComplete.label + '.', moveBody, '', '<div>' + cadence(AD.latestComplete.key) + '</div>') + '</div>' +
      '<div style="margin-top:var(--ad-gap)">' + card('Progress over time', 'The three assessment points as named markers.', progBody, '', '<div>' + cadence(point) + '</div>') + '</div>' +
      targetCard + compareCard;

    // wiring
    body.querySelectorAll('[data-gradenav]').forEach(function (b) { b.addEventListener('click', function () { setParams({ grade: b.dataset.gradenav, section: '', point: point }); }); });
    body.querySelectorAll('[data-sectionnav]').forEach(function (b) { b.addEventListener('click', function () { setParams({ grade: grade, section: b.dataset.sectionnav, point: point }); }); });
    body.querySelectorAll('[data-scope]').forEach(function (b) { b.addEventListener('click', function () { var lv = b.dataset.scope; if (lv === 'school') setParams({ point: point }); else if (lv === 'grade') setParams({ grade: grade, point: point }); }); });
    body.querySelector('#o-grade').addEventListener('change', function (e) { setParams({ grade: e.target.value, section: '', point: point }); });
    body.querySelector('#o-section').addEventListener('change', function (e) { setParams({ grade: grade, section: e.target.value, point: point }); });
    body.querySelector('#o-point').addEventListener('change', function (e) { setParams({ grade: grade, section: section, point: e.target.value }); });
    wireCmp2();
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
  // Grade cards (school scope) and section cards (grade scope) — the drill navigator.
  function gradeNavHTML(point) {
    return '<div class="ad-navcards">' + AD.grades.map(function (g) {
      var studs = AD.studentsInGrade(g), secs = AD.sections.filter(function (s) { return s.grade === g; }), d = distAllSkills(studs, point);
      return '<button class="ad-navcard" data-gradenav="' + esc(g) + '"><div class="nc-top"><span class="nc-name">' + esc(g) + '</span><span style="color:var(--ink-300)">›</span></div>' +
        '<div class="nc-meta">' + plural(studs.length, 'student') + ' · ' + plural(secs.length, 'section') + '</div>' + bandBar(d) + pctLine(d) + '</button>';
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
  var rosterPage = 1, rosterQ = '';
  SCREEN.roster = function (params, body) {
    var q = params.q != null ? params.q : rosterQ; rosterQ = q;
    var grade = params.grade || '';
    var section = params.section || '';
    var page = parseInt(params.page || '1', 10) || 1;
    var PER = 10;

    var rows = AD.rosterRows().filter(function (r) {
      return (!grade || r.grade === grade) && (!section || AD.sections.find(function (s) { return s.id === section; }) && (function () { var sd = AD.sections.find(function (s) { return s.id === section; }); return r.grade === sd.grade && r.section === sd.section; })()) &&
        (!q || (r.name.toLowerCase().indexOf(q.toLowerCase()) >= 0 || r.adm.toLowerCase().indexOf(q.toLowerCase()) >= 0));
    });
    var pages = Math.max(1, Math.ceil(rows.length / PER));
    page = Math.min(page, pages);
    var pageRows = rows.slice((page - 1) * PER, page * PER);

    var gradeOpts = [{ v: '', t: 'All grades' }].concat(AD.grades.map(function (g) { return { v: g, t: g }; }));
    var secOpts = [{ v: '', t: 'All sections' }].concat(AD.sections.filter(function (s) { return !grade || s.grade === grade; }).map(function (s) { return { v: s.id, t: s.name }; }));

    var listBody = '<div class="ad-filters">' +
      '<input class="input" id="r-q" placeholder="Search name or student ID…" value="' + esc(q) + '" style="max-width:280px" aria-label="Search roster">' +
      selectWrap('r-grade', gradeOpts, grade, 'Grade') + selectWrap('r-section', secOpts, section, 'Section') + '</div>' +
      (!rows.length ? stEmpty('No students match your search.', 'Clear the search or change the filters.') :
      (SHOW_STUDENT_STAGE ? '<div class="ad-privacy"><span aria-hidden="true">⚠️</span><span><b>Temporary:</b> the developmental-stage column shows an individual child\'s SEL result, which leadership is not normally shown (spec §2). It is behind a flag and will be removed.</span></div>' : '') +
      '<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>Name</th><th>Student ID</th><th>Grade</th><th>Section</th><th>Parent email</th>' + (SHOW_STUDENT_STAGE ? '<th>Developmental stage</th>' : '') + '<th>Enrolment</th><th>Parent claim</th></tr></thead><tbody>' +
        pageRows.map(function (r) {
          var claimChip = r.claim === 'Claimed' ? '<span class="ad-chip active"><span class="dot"></span>Claimed</span>' : r.claim === 'Invited' ? '<span class="ad-chip slowing"><span class="dot"></span>Invited</span>' : '<span class="ad-chip quiet"><span class="dot"></span>Not invited</span>';
          var stageCell = SHOW_STUDENT_STAGE ? '<td><span class="ad-bandchip"><i style="background:' + r.stage.color + '"></i>' + esc(r.stage.label) + '</span></td>' : '';
          return '<tr><td class="name">' + esc(r.name) + '</td><td class="ad-num">' + esc(r.adm) + '</td><td>' + esc(r.grade) + '</td><td>' + esc(r.section) + '</td><td>' + esc(r.parentEmail) + '</td>' + stageCell + '<td>' + esc(r.enrolment) + '</td><td>' + claimChip + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;font-size:13px;color:var(--ink-450);font-weight:700">' +
        '<span>' + rows.length + ' students · page ' + page + ' of ' + pages + '</span><span>' +
        '<button class="btn btn-outline btn-sm" data-pg="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>← Prev</button> ' +
        '<button class="btn btn-outline btn-sm" data-pg="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>Next →</button></span></div>');

    // teacher-section assignment
    var assignBody = '<div class="ad-tablewrap"><table class="ad-table" style="min-width:520px"><thead><tr><th>Section</th><th>Assigned teacher</th><th>Persona</th><th></th></tr></thead><tbody>' +
      AD.sections.map(function (s) {
        var opts = AD.teachers.map(function (t) { return '<option value="' + t.id + '"' + (t.id === s.teacherId ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
        var t = AD.teachers.find(function (x) { return x.id === s.teacherId; });
        return '<tr><td class="name">' + esc(s.name) + '</td><td><label class="select-wrap" style="max-width:220px"><select class="select" data-assign="' + s.id + '">' + opts + '</select></label></td><td>' + esc((t && t.role) || '—') + '</td><td style="color:var(--ink-300);font-size:12px">Ending an assignment keeps the section\'s history.</td></tr>';
      }).join('') + '</tbody></table></div>';

    // user management
    var users = seedUsers();
    var userBody = '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-cyan btn-sm" data-invite="1">+ Invite user</button></div>' +
      '<div class="ad-tablewrap"><table class="ad-table" style="min-width:520px"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>' +
      users.map(function (u, i) {
        return '<tr><td class="name">' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td><td>' + (u.status === 'Active' ? '<span class="ad-chip active"><span class="dot"></span>Active</span>' : '<span class="ad-chip slowing"><span class="dot"></span>Invited</span>') + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' + (u.status === 'Invited' ? '<button class="link-btn" data-resend="' + i + '">Resend</button> · ' : '') + '<button class="link-btn" data-revoke="' + i + '" style="color:#B22447">Revoke</button></td></tr>';
      }).join('') + '</tbody></table></div>';

    body.innerHTML = screenHead('Roster', SHOW_STUDENT_STAGE ? 'Operational identity data — plus a temporary developmental-stage column (see the note in Students).' : 'Operational identity data. No SEL results ever appear here.') +
      card('Students', AD.students.length + ' enrolled · ' + (SHOW_STUDENT_STAGE ? 'identity, enrolment and a temporary stage column.' : 'identity and enrolment only.'), listBody, 'span2') +
      '<div style="margin-top:var(--ad-gap)">' + card('Grade migration', 'Promote, retain, remove and add students at year boundary.', '<p class="ad-mod-note" style="margin-bottom:14px">A full year-end flow — reviewable per student, with a preview and a 24-hour undo. Historical results always stay attached to the child and their prior section.</p><button class="btn btn-primary btn-sm" data-migrate="1">Start grade migration</button>') + '</div>' +
      '<div class="ad-grid two" style="margin-top:var(--ad-gap)">' +
        card('Teacher–section assignment', null, assignBody) +
        card('User management', 'Invite, resend, revoke. Revoke is immediate.', userBody) +
      '</div>';
    // NOTE: Duplicate review queue (spec §5.4.5) sits behind the near-match config
    // flag, which is OFF for this school — so the module is intentionally absent.

    // wiring
    var qi = body.querySelector('#r-q');
    qi.addEventListener('input', function (e) { rosterQ = e.target.value; setParams({ q: e.target.value, grade: grade, section: section, page: '1' }); var el = document.getElementById('r-q'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (x) {} } });
    body.querySelector('#r-grade').addEventListener('change', function (e) { setParams({ q: q, grade: e.target.value, section: '', page: '1' }); });
    body.querySelector('#r-section').addEventListener('change', function (e) { setParams({ q: q, grade: grade, section: e.target.value, page: '1' }); });
    body.querySelectorAll('[data-pg]').forEach(function (b) { b.addEventListener('click', function () { if (b.disabled) return; setParams({ q: q, grade: grade, section: section, page: b.dataset.pg }); }); });
    body.querySelectorAll('[data-assign]').forEach(function (s) { s.addEventListener('change', function () { toast('Teacher reassigned. Section history is unchanged.'); }); });
    body.querySelector('[data-migrate]').addEventListener('click', startMigration);
    body.querySelector('[data-invite]').addEventListener('click', inviteUser);
    body.querySelectorAll('[data-revoke]').forEach(function (b) { b.addEventListener('click', function () { toast('Access revoked — session invalidated immediately.'); }); });
    body.querySelectorAll('[data-resend]').forEach(function (b) { b.addEventListener('click', function () { toast('Invitation resent.'); }); });
  };
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
    openModal(modalHead(a.name + ' — ' + AD.openPoint.label + ' completion') +
      '<p class="ad-mod-note" style="margin-bottom:14px">' + a.completion.done + ' of ' + a.completion.total + ' students complete. This is completion only — no scores, bands or skill data.</p>' +
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
        Object.keys(sum.headcounts).map(function (k) { var n = sum.headcounts[k]; return '<tr><td class="name">' + esc(k) + '</td><td class="ad-num">' + n + ' students' + (n > SECTION_LIMIT ? ' <span class="ad-chip slowing"><span class="dot"></span>over limit</span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
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

  // ---------- boot ----------
  if (!location.hash) go('overview', {}, { replace: true }); else render();
})();
