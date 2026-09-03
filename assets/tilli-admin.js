/* ============================================================
   Tilli Measures — INTERNAL PLATFORM ADMIN  (Tilli Team)
   ------------------------------------------------------------
   The layer ABOVE school admins. A single Super Admin role with
   full access; every write action is [GATED] — routed through a
   single permission stub (always-pass in v1) + confirm + audit —
   so a role layer drops in later without re-architecting.

   Vanilla JS, hash-routed, renders into #tl-app. Reads the mock
   "server" (window.TILLI_ORG) which computes every queue, count,
   status and per-school summary — the client only renders (spec
   §1.1). Also reads window.TILLI_SCHOOL (the one live-wired school)
   to hand off to admin.html.

   IA (spec §2, merged with the carried-over portfolio Analytics):
     Control Room · Analytics · Schools · Students · Assessments ·
     People · Platform Health · AI Assistant
   Phase 1 built Control Room + Schools (+ Hub + Merge). Phase 2 adds
   the assessment/authoring surfaces (Add Students w/ CSV, Observation
   Form, Self-Guided, Master Links, Results & Data) and the New
   Template / Deployment / Group flows. AI Assistant (Ask Tilli /
   Knowledge Base) stays a deliberate cross-product placeholder (§10.1).
   ============================================================ */
(function () {
  'use strict';

  var ORG = window.TILLI_ORG;
  var TS = window.TILLI_SCHOOL;
  var app = document.getElementById('tl-app');
  if (!ORG) { app.innerHTML = '<div class="tl-empty">Org data not loaded.</div>'; return; }

  // ---------- identity (single Super Admin in v1) ----------
  var qp = new URLSearchParams(location.search);
  var session = null; try { session = JSON.parse(localStorage.getItem('tilliMeasures.session') || 'null'); } catch (e) {}
  var email = qp.get('email') || (session && session.email) || 'team@tilli.org';
  var me = { name: 'Tilli Team', email: email, role: 'Super Admin' };

  // ---------- provisioning hierarchy (who can add whom) ----------
  // Single source of truth for the onboarding flow: set up school → assign
  // school admin → school admin adds teachers/students → teachers self-join
  // with the school code and add their own students. Parents are NOT staff —
  // they only verify a student UID, so they never appear here. This map drives
  // the helper text in the invite modal and role editor so the hierarchy is
  // explicit at the moment a role is granted. Keys must match ORG.roles.
  var ROLE_CAPS = {
    'Super Admin':        'Full access — sets up schools, assigns admins, and manages every user.',
    'School Group Admin': 'Manages every school in the group — assigns school admins, teachers and students.',
    'School Admin':       'Adds teachers and students, and shares the school join code so teachers can self-add.',
    'Teacher':            'Joins with the school code and adds their own students. Cannot invite other staff.',
    'none':               'No access yet — assign a role before this person can sign in.'
  };
  function roleCap(role) { return ROLE_CAPS[role] || ''; }

  // ---------- small utils ----------
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  function initials(name) { return String(name || '').trim().split(/\s+/).map(function (w) { return w[0] || ''; }).slice(0, 2).join(''); }
  var pct = function (n) { return Math.max(0, Math.min(100, Math.round(n))); };
  var sum = function (arr, f) { return arr.reduce(function (a, x) { return a + (f ? f(x) : x); }, 0); };
  var toastTimer;
  function toast(msg) { var t = document.getElementById('tl-toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function timeAgo(ms) {
    var s = Math.round((Date.now() - ms) / 1000); if (isNaN(s) || s < 0) s = 0;
    var h = Math.floor(s / 3600), d = Math.floor(h / 24);
    if (d >= 1) return d + 'd ago'; if (h >= 1) return h + 'h ago';
    var m = Math.floor(s / 60); return m <= 1 ? 'just now' : m + 'm ago';
  }
  function statusChip(status) { var m = ORG.status[status] || ORG.status.quiet; return '<span class="tl-chip ' + m.chip + '"><span class="dot"></span>' + m.label + '</span>'; }
  function stageChip(key) { var m = ORG.stageMeta(key); var cls = key === 'mou' ? ' mou' : (key === 'renewed' ? ' renewed' : ''); return '<span class="tl-stagechip' + cls + '">' + esc(m.short) + '</span>'; }
  function statusPill(txt, tone) { return '<span class="tl-pill ' + (tone || '') + '">' + esc(txt) + '</span>'; }

  // ---------- icons ----------
  var ICONS = {
    controlroom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 18 0"/><line x1="12" y1="12" x2="16" y2="10"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><rect x="5" y="10" width="3" height="8"/><rect x="10.5" y="5" width="3" height="13"/><rect x="16" y="13" width="3" height="5"/></svg>',
    schools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><rect x="9.5" y="13" width="5" height="8"/></svg>',
    students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    assessments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17.5" cy="9" r="2.6"/><path d="M16 14.4a4.6 4.6 0 0 1 5 4.1"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2 5 4-12 2 7h6"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="12" rx="3"/><line x1="12" y1="3" x2="12" y2="7"/><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
  };

  // ---------- navigation (grouped sections) ----------
  // Each item: {key(=screen), label}. Sections group them in the sidebar.
  var NAV = [
    { icon: 'controlroom', items: [{ key: 'controlroom', label: 'Control Room' }] },
    { icon: 'analytics',   items: [{ key: 'analytics', label: 'Analytics' }] },
    { icon: 'schools', title: 'Schools', items: [{ key: 'schools', label: 'All Schools' }] },
    // Students (Directory / Add / Merge) are no longer a global section — they
    // live inside each School Hub → Students tab, scoped to that school.
    // Observation Form is no longer its own surface — it's an Observation-audience
    // template (edited under Templates), deployed via Deployments, and its
    // responses live in Deployments → Results.
    { icon: 'assessments', title: 'Assessments', items: [
      { key: 'templates', label: 'Templates' },
      { key: 'deployments', label: 'Deployments' },
    ] },
    { icon: 'people', title: 'People', items: [
      { key: 'users', label: 'Users' },
      { key: 'invitations', label: 'Invitations' },
    ] },
    { icon: 'health', title: 'Platform Health', items: [
      { key: 'issues', label: 'Issue Reports' },
      { key: 'audit', label: 'Audit Trail' },
    ] },
    { icon: 'ai', title: 'AI Assistant', items: [
      { key: 'ask-tilli', label: 'Ask Tilli' },
      { key: 'knowledge', label: 'Knowledge Base' },
    ] },
  ];
  var BOTTOM = [
    { key: 'controlroom', label: 'Control', icon: 'controlroom' },
    { key: 'schools', label: 'Schools', icon: 'schools' },
    { key: 'issues', label: 'Issues', icon: 'health' },
    { key: 'users', label: 'People', icon: 'people' },
  ];

  // ---------- router ----------
  function buildHash(screen, params) {
    var q = Object.keys(params || {}).filter(function (k) { return params[k] !== '' && params[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    return '#/' + screen + (q ? '?' + q : '');
  }
  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var qi = h.indexOf('?');
    var screen = (qi < 0 ? h : h.slice(0, qi)) || 'controlroom';
    var params = {};
    if (qi >= 0) h.slice(qi + 1).split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)); params[k] = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1)); });
    if (!SCREEN[screen]) screen = 'controlroom';
    return { screen: screen, params: params };
  }
  function go(screen, params) { location.hash = buildHash(screen, params); }
  function href(screen, params) { return buildHash(screen, params); }

  // ---------- chrome ----------
  // Which nav item is active for a given screen (hub → schools, etc).
  var SCREEN_PARENT = { school: 'schools', group: 'schools', student: 'schools', directory: 'schools', 'add-students': 'schools', merge: 'schools', search: 'controlroom',
    observation: 'templates', results: 'deployments', 'master-links': 'deployments' };
  function navKeyFor(screen) { return SCREEN_PARENT[screen] || screen; }

  function chrome(r) {
    var active = navKeyFor(r.screen);
    var nav = NAV.map(function (sec) {
      var items = sec.items.map(function (n) {
        var badge = navBadge(n.key);
        return '<button class="tl-nav-item' + (n.key === active ? ' on' : '') + (sec.title ? ' sub' : '') + '" data-nav="' + n.key + '">' +
          (sec.title ? '' : '<span class="ic">' + ICONS[sec.icon] + '</span>') + esc(n.label) +
          (badge ? '<span class="tl-nav-badge">' + badge + '</span>' : '') + '</button>';
      }).join('');
      // Section header rows get the section icon inline.
      var iconHead = sec.title ? '<div class="tl-nav-head"><span class="ic">' + ICONS[sec.icon] + '</span>' + esc(sec.title) + '</div>' : '';
      return (sec.title ? iconHead : '') + items;
    }).join('');

    var side = '<aside class="tl-side">' +
      '<span class="lockup"><img src="_ds/tilli/assets/logos/tilli-wordmark-crop.png" alt="Tilli"><span class="divider"></span><span class="measures">Measures</span></span>' +
      '<span class="tl-badge-int">Platform Admin</span>' +
      '<nav class="tl-nav">' + nav + '</nav>' +
      '<div class="tl-side-foot">Tilli Team · internal platform admin. The layer above school admins.</div></aside>';

    var header = '<header class="tl-header">' +
      '<form class="tl-search" id="tl-search"><span class="ic">' + ICONS.search + '</span>' +
        '<input id="tl-search-in" placeholder="Search schools, students, users, invitations, deployments…" autocomplete="off"></form>' +
      '<div class="tl-h-actions">' +
        '<span class="tl-rolebadge desk-only">Super Admin</span>' +
        '<button class="tl-acct" id="tl-acct-btn" aria-label="Account menu">' + esc(initials(me.name).toUpperCase()) + '</button></div></header>';

    var bottom = '<nav class="tl-bottomnav">' + BOTTOM.map(function (n) {
      return '<button class="' + (n.key === active ? 'on' : '') + '" data-nav="' + n.key + '">' + ICONS[n.icon] + '<span>' + esc(n.label) + '</span></button>';
    }).join('') + '</nav>';

    return side + '<div><div style="position:relative">' + header + '</div><main class="tl-main"><div class="tl-wrap" id="tl-body"></div></main>' + bottom + '</div>';
  }

  // Small live counts on nav items (open issues, expiring invites).
  function navBadge(key) {
    if (key === 'issues') { var n = ORG.issues.filter(function (i) { return i.status === 'open'; }).length; return n || ''; }
    return '';
  }

  function render() {
    var r = currentRoute();
    app.innerHTML = chrome(r);
    var body = document.getElementById('tl-body');
    SCREEN[r.screen](r.params, body);
    // wire chrome
    app.querySelectorAll('[data-nav]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.nav, {}); }); });
    var acct = document.getElementById('tl-acct-btn'); if (acct) acct.addEventListener('click', function (ev) { ev.stopPropagation(); openAcctMenu(acct); });
    var sform = document.getElementById('tl-search'); var sin = document.getElementById('tl-search-in');
    if (sform) sform.addEventListener('submit', function (ev) { ev.preventDefault(); go('search', { q: (sin.value || '').trim() }); });
    if (sin && r.screen === 'search') sin.value = r.params.q || '';
  }

  function openAcctMenu(anchor) {
    if (document.querySelector('.tl-acct-menu')) return;
    var m = document.createElement('div');
    m.className = 'tl-acct-menu';
    m.innerHTML = '<div class="who"><b>' + esc(me.name) + '</b><span>' + esc(me.email) + '</span></div>' +
      '<button data-am="signout">Sign out</button>';
    anchor.parentNode.appendChild(m);
    m.querySelector('[data-am="signout"]').addEventListener('click', function () { try { localStorage.removeItem('tilliMeasures.session'); } catch (e) {} location.href = 'index.html'; });
    setTimeout(function () { document.addEventListener('click', function close(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', close); } }); }, 0);
  }

  // ============================================================
  //  GATED ACTIONS  — single permission stub (always-pass in v1)
  //  + confirm + audit.  Typed confirmation for irreversible acts.
  // ============================================================
  function gated(opts) {
    // opts: {title, body, danger, typed(token string|true), confirmLabel, audit:{action,entity,entityType,schoolId}, onConfirm}
    openConfirm(opts, function () {
      if (opts.audit) ORG.server.logAudit(me.name, opts.audit.action, opts.audit.entity, opts.audit.entityType, opts.audit.schoolId);
      if (opts.onConfirm) opts.onConfirm();
    });
  }
  function openConfirm(opts, onOk) {
    var root = document.getElementById('tl-modal-root');
    var token = opts.typed === true ? 'CONFIRM' : (opts.typed || '');
    root.innerHTML = '<div class="overlay" id="tl-ov"><div class="tl-modal-card">' +
      '<div class="tl-modal-h"><h3>' + esc(opts.title) + '</h3><button class="dialog-close" id="tl-mx" aria-label="Close">×</button></div>' +
      '<div class="tl-confirm-body">' + (opts.body || '') + '</div>' +
      (token ? '<label class="field" style="margin-top:14px">Type <b>' + esc(token) + '</b> to confirm<input class="input" id="tl-confirm-in" autocomplete="off" placeholder="' + esc(token) + '"></label>' +
        '<p id="tl-confirm-err" style="display:none;margin:6px 2px 0;color:var(--orange-500);font-size:13px;font-weight:600">Text doesn\'t match — type <b>' + esc(token) + '</b> exactly to continue.</p>' : '') +
      '<div class="tl-modal-foot">' +
        '<button class="btn btn-outline btn-sm" id="tl-cancel">Cancel</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + ' btn-sm" id="tl-ok"' + (token ? ' disabled' : '') + '>' + esc(opts.confirmLabel || 'Confirm') + '</button>' +
      '</div></div></div>';
    var ov = document.getElementById('tl-ov');
    function close() { root.innerHTML = ''; }
    ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
    document.getElementById('tl-mx').addEventListener('click', close);
    document.getElementById('tl-cancel').addEventListener('click', close);
    var ok = document.getElementById('tl-ok');
    if (token) {
      var inp = document.getElementById('tl-confirm-in');
      var err = document.getElementById('tl-confirm-err');
      inp.focus();
      // Error shows only once something's typed and it's still wrong; clears the
      // moment it matches (or the field is emptied) so it never nags a blank box.
      function sync() {
        var val = inp.value.trim();
        var match = val.toUpperCase() === token.toUpperCase();
        ok.disabled = !match;
        var showErr = val.length > 0 && !match;
        err.style.display = showErr ? 'block' : 'none';
        inp.classList.toggle('err', showErr);
      }
      inp.addEventListener('input', sync);
    }
    ok.addEventListener('click', function () { close(); onOk(); });
  }

  // Generic form modal (add school, invite, etc.)
  function openModal(title, bodyHtml, onSave, saveLabel) {
    var root = document.getElementById('tl-modal-root');
    root.innerHTML = '<div class="overlay" id="tl-ov"><div class="tl-modal-card">' +
      '<div class="tl-modal-h"><h3>' + esc(title) + '</h3><button class="dialog-close" id="tl-mx" aria-label="Close">×</button></div>' +
      bodyHtml +
      '<div class="tl-modal-foot"><button class="btn btn-outline btn-sm" id="tl-cancel">Cancel</button>' +
      '<button class="btn btn-primary btn-sm" id="tl-save">' + esc(saveLabel || 'Save') + '</button></div></div></div>';
    var ov = document.getElementById('tl-ov');
    function close() { root.innerHTML = ''; }
    ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
    document.getElementById('tl-mx').addEventListener('click', close);
    document.getElementById('tl-cancel').addEventListener('click', close);
    document.getElementById('tl-save').addEventListener('click', function () { if (onSave(close) !== false) {} });
    return close;
  }

  // ---------- shared render bits ----------
  function kpi(num, lbl, delta, deeplink) {
    var d = (delta != null && delta !== 0) ? '<span class="tl-kpi-delta">' + (delta > 0 ? '+' : '') + delta + '</span>' : '';
    var inner = '<div class="num">' + esc(num) + d + '</div><div class="lbl">' + esc(lbl) + '</div>';
    return deeplink ? '<a class="tl-kpi link" href="' + deeplink + '">' + inner + '</a>' : '<div class="tl-kpi">' + inner + '</div>';
  }
  function bar(label, value, cls) {
    return '<div class="tl-bar-row"><div class="tl-bar-lbl" title="' + esc(label) + '">' + esc(label) + '</div>' +
      '<div class="tl-bar-track"><div class="tl-bar-fill ' + (cls || '') + '" style="width:' + pct(value) + '%"></div></div>' +
      '<div class="tl-bar-val">' + pct(value) + '</div></div>';
  }
  function stepper(stageKey) {
    var cur = ORG.stageIndex(stageKey);
    return '<div class="tl-steps">' + ORG.stages.map(function (s, i) {
      var cls = i < cur ? 'done' : (i === cur ? 'cur' : '');
      var mark = i < cur ? '✓' : (i + 1);
      return '<div class="tl-step ' + cls + '"><div class="dot">' + mark + '</div><div class="slabel">' + esc(s.short) + '</div></div>';
    }).join('') + '</div>';
  }
  function screenHead(title, sub, actionsHtml) {
    return '<div class="tl-screen-head">' +
      '<div><h1 class="tl-screen-title">' + esc(title) + '</h1>' + (sub ? '<p class="tl-screen-sub">' + esc(sub) + '</p>' : '') + '</div>' +
      (actionsHtml ? '<div class="tl-screen-actions">' + actionsHtml + '</div>' : '') + '</div>';
  }
  function crumbs(parts) {
    return '<div class="tl-crumbs">' + parts.map(function (p, i) {
      var sep = i > 0 ? '<span class="sep">/</span>' : '';
      if (!p.screen) return sep + '<span class="cur">' + esc(p.label) + '</span>';
      var pa = p.params ? ' data-crumb-params="' + esc(encodeURIComponent(JSON.stringify(p.params))) + '"' : '';
      return sep + '<button data-crumb="' + p.screen + '"' + pa + '>' + esc(p.label) + '</button>';
    }).join('') + '</div>';
  }
  function wireCrumbs(body) { body.querySelectorAll('[data-crumb]').forEach(function (b) { b.addEventListener('click', function () { var pr = {}; if (b.dataset.crumbParams) { try { pr = JSON.parse(decodeURIComponent(b.dataset.crumbParams)); } catch (e) {} } go(b.dataset.crumb, pr); }); }); }

  // A tasteful placeholder (never a blank dead-end). Now used only for the
  // cross-product AI Assistant surfaces, which are deliberately not built here.
  function phase2(title, sub, bullets) {
    return screenHead(title, sub) +
      '<div class="tl-card"><div class="tl-phase2"><div class="tl-phase2-tag">Cross-product</div>' +
      '<p class="tl-phase2-lead">Deliberately out of scope for the Measures admin (spec §10.1):</p>' +
      '<ul class="tl-phase2-list">' + bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' +
      '<p class="tl-phase2-note">All Measures surfaces are built. This configures the separate Ask Tilli product.</p></div></div>';
  }

  var SCREEN = {};

  // ============================================================
  //  1) CONTROL ROOM  (landing — spec §3)
  // ============================================================
  var CARD_META = {
    issues: { icon: '⚠', tone: 'high' }, health: { icon: '❤', tone: 'crit' },
    'zero-students': { icon: '◎', tone: 'warn' }, 'no-role': { icon: '◌', tone: 'low' },
    invites: { icon: '✉', tone: 'warn' }, duplicates: { icon: '⧉', tone: 'warn' },
    drafts: { icon: '✎', tone: 'low' }, deployments: { icon: '⏻', tone: 'warn' },
  };
  SCREEN.controlroom = function (params, body) {
    var cr = ORG.server.controlRoom();

    var cards = cr.cards.map(function (c) {
      var meta = CARD_META[c.key] || { icon: '•', tone: 'low' };
      var clear = c.count === 0 && c.key !== 'health';
      if (c.key === 'health' && c.state === 'healthy') clear = true;
      var sub = c.key === 'health'
        ? (c.state === 'healthy' ? 'All systems healthy' : 'Platform ' + c.state)
        : (clear ? 'All clear' : 'Needs attention');
      if (clear) {
        return '<a class="tl-queue clear" href="' + c.deeplink + '"><span class="q-ic">' + meta.icon + '</span>' +
          '<span class="q-body"><span class="q-label">' + esc(c.label) + '</span><span class="q-sub">All clear</span></span>' +
          '<span class="q-count muted">0</span></a>';
      }
      var count = c.key === 'health' ? (c.state || '').toUpperCase() : c.count;
      return '<a class="tl-queue ' + meta.tone + '" href="' + c.deeplink + '"><span class="q-ic">' + meta.icon + '</span>' +
        '<span class="q-body"><span class="q-label">' + esc(c.label) + '</span><span class="q-sub">' + esc(sub) + ' →</span></span>' +
        '<span class="q-count">' + esc(count) + '</span></a>';
    }).join('');

    var stats = cr.stats.map(function (t) {
      return kpi(t.value.toLocaleString(), t.label, t.delta, t.deeplink);
    }).join('');

    var recent = cr.recent.length ? cr.recent.map(function (e) {
      var ent = e.schoolId ? '<button class="link-btn" data-open-school="' + e.schoolId + '">' + esc(e.entity) + '</button>' : esc(e.entity);
      return '<div class="tl-feed-row"><span class="tl-feed-when">' + timeAgo(e.at) + '</span>' +
        '<span class="tl-feed-body"><b>' + esc(e.actor) + '</b> ' + esc(e.actionLabel) + ' ' + ent + '</span></div>';
    }).join('') : '<div class="tl-empty">No recent activity yet.</div>';

    var anyQueue = cr.cards.some(function (c) { return c.key === 'health' ? c.state !== 'healthy' : c.count > 0; });

    body.innerHTML =
      screenHead('Control Room', 'What needs the team\'s attention right now.',
        '<button class="btn btn-primary btn-sm" data-qa="school">+ Add School</button>' +
        '<button class="btn btn-outline btn-sm" data-qa="invite">+ Invite User</button>' +
        '<button class="btn btn-outline btn-sm" data-qa="deployment">+ Deployment</button>' +
        '<button class="btn btn-outline btn-sm" data-qa="template">+ Template</button>') +
      (anyQueue ? '' : '<div class="tl-allclear">Nothing needs your attention right now. 🌱</div>') +
      '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Needs attention</h3><p class="tl-mod-note">Each card links to the pre-filtered list that produced it.</p></div></div>' +
        '<div class="tl-queue-grid">' + cards + '</div></div>' +
      '<div class="tl-mini-head">Platform stats</div>' +
      '<div class="tl-kpis four">' + stats + '</div>' +
      '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Recent activity</h3><p class="tl-mod-note">The human-readable face of the audit trail.</p></div>' +
        '<a class="link-btn" href="' + href('audit', {}) + '">View all →</a></div>' + recent + '</div>';

    body.querySelectorAll('[data-qa]').forEach(function (b) { b.addEventListener('click', function () { quickAction(b.dataset.qa); }); });
    body.querySelectorAll('[data-open-school]').forEach(function (b) { b.addEventListener('click', function () { go('school', { id: b.dataset.openSchool }); }); });
  };

  function quickAction(kind) {
    if (kind === 'school') return openAddSchool();
    if (kind === 'invite') return openInvite(null);
    if (kind === 'deployment') return openNewDeployment(null);
    if (kind === 'template') return openNewTemplate();
  }

  // ============================================================
  //  2) ANALYTICS  (carried over from the portfolio surface)
  // ============================================================
  SCREEN.analytics = function (params, body) {
    var schools = ORG.activeSchools();
    function regionAvg(region, key) { var xs = schools.filter(function (s) { return s.region === region && s[key] != null; }); return xs.length ? Math.round(sum(xs, function (s) { return s[key]; }) / xs.length) : 0; }
    var regionCard = ['India', 'Sri Lanka'].map(function (rg) {
      return '<div style="margin-bottom:6px;font-weight:800;font-size:12.5px;color:var(--ink-700)">' + rg + '</div>' +
        bar('Social-Emotional', regionAvg(rg, 'sel'), 'sel') + bar('Cognitive / EF', regionAvg(rg, 'cog'), 'cog');
    }).join('<div style="height:10px"></div>');
    var boards = {}; schools.forEach(function (s) { boards[s.board] = (boards[s.board] || 0) + 1; });
    var boardMax = Math.max.apply(null, Object.keys(boards).map(function (k) { return boards[k]; })) || 1;
    var boardRows = Object.keys(boards).sort(function (a, b) { return boards[b] - boards[a]; }).map(function (k) {
      return '<div class="tl-bar-row"><div class="tl-bar-lbl">' + esc(k) + '</div><div class="tl-bar-track"><div class="tl-bar-fill" style="width:' + (boards[k] / boardMax * 100) + '%"></div></div><div class="tl-bar-val">' + boards[k] + '</div></div>';
    }).join('');
    var ranked = schools.slice().filter(function (s) { return s.completion; }).sort(function (a, b) { return b.completion - a.completion; }).slice(0, 12);
    var rankRows = ranked.map(function (s) {
      return '<tr class="clickable" data-open="' + s.id + '"><td class="name">' + esc(s.name) + '</td><td>' + esc(s.region) + '</td><td>' + stageChip(s.stage) + '</td><td class="tl-num">' + (s.completion ? s.completion + '%' : '—') + '</td><td>' + statusChip(s.status) + '</td></tr>';
    }).join('');

    body.innerHTML = screenHead('Analytics', 'Rollups across the whole portfolio — outcomes, engagement and rollout.') +
      '<div class="tl-grid two">' +
        '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Outcomes by region</h3><p class="tl-mod-note">Average band across schools with results.</p></div></div>' + regionCard +
          '<div class="tl-legend"><span><i style="background:var(--green-500)"></i>Social-Emotional</span><span><i style="background:var(--cyan-500)"></i>Cognitive / EF</span></div></div>' +
        '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Board mix</h3><p class="tl-mod-note">Partner schools by curriculum board.</p></div></div>' + boardRows + '</div>' +
      '</div>' +
      '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Completion ranking</h3><p class="tl-mod-note">Assessment completion, highest first.</p></div></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:560px"><thead><tr><th>School</th><th>Region</th><th>Stage</th><th>Completion</th><th>Engagement</th></tr></thead><tbody>' + rankRows + '</tbody></table></div></div>';
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { go('school', { id: b.dataset.open }); }); });
  };

  // ============================================================
  //  3) ALL SCHOOLS  (spec §4.1)
  // ============================================================
  var schState = { tab: 'active', view: 'list', q: '', flag: '' };
  SCREEN.schools = function (params, body) {
    if (params.flag != null) { schState.flag = params.flag; schState.tab = 'active'; }
    var all = ORG.schools;
    var counts = { active: all.filter(function (s) { return !s.archived; }).length, archived: all.filter(function (s) { return s.archived; }).length };

    var q = schState.q.trim().toLowerCase();
    var tabActive = schState.tab === 'active';
    // Top level shows groups + independent schools; searching / archived / flags flatten to a plain list.
    var grouped = tabActive && !q && schState.flag !== 'zero-students';

    var content;
    if (grouped) {
      var groups = ORG.groups.filter(function (g) { return g.id !== 'g-none'; }).map(function (g) {
        return { g: g, schools: all.filter(function (s) { return !s.archived && s.groupId === g.id; }) };
      }).filter(function (x) { return x.schools.length; });
      var indep = all.filter(function (s) { return !s.archived && s.groupId === 'g-none'; });
      content =
        (groups.length ? '<div class="tl-listgroup-h">School groups <b>' + groups.length + '</b></div>' + groupListHtml(groups, schState.view) : '') +
        '<div class="tl-listgroup-h">Independent schools <b>' + indep.length + '</b></div>' +
        schoolListHtml(indep, schState.view);
    } else {
      var rows = all.filter(function (s) {
        if (tabActive ? s.archived : !s.archived) return false;
        if (schState.flag === 'zero-students' && s.students !== 0) return false;
        if (q && (s.name + ' ' + s.code).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      content = rows.length ? schoolListHtml(rows, schState.view)
        : '<div class="tl-empty">' + (all.length ? 'No schools match.' : 'No schools yet — add your first school.') + '</div>';
    }

    var flagBanner = schState.flag === 'zero-students'
      ? '<div class="tl-filterbanner">Filtered to <b>schools with 0 students</b> · <button class="link-btn" id="sch-clearflag">clear</button></div>' : '';

    body.innerHTML = screenHead('All Schools', ORG.activeSchools().length + ' active partner schools across the portfolio.',
      '<button class="btn btn-outline btn-sm" id="sch-newgroup">New Group</button><button class="btn btn-primary btn-sm" id="sch-add">+ Add School</button>') +
      '<div class="tl-tabs">' +
        '<button class="tl-tab' + (tabActive ? ' on' : '') + '" data-tab="active">Active <b>' + counts.active + '</b></button>' +
        '<button class="tl-tab' + (!tabActive ? ' on' : '') + '" data-tab="archived">Archived <b>' + counts.archived + '</b></button>' +
        '<div class="tl-viewtoggle"><button class="' + (schState.view === 'grid' ? 'on' : '') + '" data-view="grid" title="Grid">▦</button><button class="' + (schState.view === 'list' ? 'on' : '') + '" data-view="list" title="List">☰</button></div>' +
      '</div>' + flagBanner +
      '<div class="tl-filters"><input class="input grow" id="sch-q" placeholder="Search by school name or code…" value="' + esc(schState.q) + '" style="max-width:360px"></div>' +
      content;

    body.querySelectorAll('[data-group-open]').forEach(function (b) { b.addEventListener('click', function (ev) { if (ev.target.dataset.gmenu) return; go('group', { id: b.dataset.groupOpen }); }); });
    body.querySelectorAll('[data-gmenu]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); openGroupMenu(b.dataset.gmenu); }); });
    body.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { schState.tab = b.dataset.tab; SCREEN.schools({}, body); }); });
    body.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { schState.view = b.dataset.view; SCREEN.schools({}, body); }); });
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); go('school', { id: b.dataset.open }); }); });
    var cf = body.querySelector('#sch-clearflag'); if (cf) cf.addEventListener('click', function () { schState.flag = ''; go('schools', {}); SCREEN.schools({}, body); });
    var addb = body.querySelector('#sch-add'); if (addb) addb.addEventListener('click', openAddSchool);
    var ng = body.querySelector('#sch-newgroup'); if (ng) ng.addEventListener('click', openNewGroup);
    var qi = body.querySelector('#sch-q'); if (qi) qi.addEventListener('input', function () { schState.q = qi.value; var pos = qi.selectionStart; SCREEN.schools({}, body); var nq = body.querySelector('#sch-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  };

  // ---- shared list renderers (schools + groups) ----
  function schoolListHtml(rows, view) {
    if (!rows.length) return '<div class="tl-empty">No schools here yet.</div>';
    if (view === 'grid') return '<div class="tl-school-grid">' + rows.map(schoolCard).join('') + '</div>';
    return '<div class="tl-tablewrap"><table class="tl-table" style="min-width:760px"><thead><tr><th>School</th><th>Group</th><th>Grades</th><th>Students</th><th>Staff</th><th>Stage</th><th></th></tr></thead><tbody>' +
      rows.map(function (s) {
        return '<tr class="clickable" data-open="' + s.id + '"><td class="name">' + esc(s.name) + '<small>' + esc(s.type) + ' · ' + esc(s.code) + '</small></td>' +
          '<td>' + esc(s.groupName) + '</td><td class="tl-num">' + s.gradeCount + '</td><td class="tl-num">' + s.students.toLocaleString() + '</td>' +
          '<td class="tl-num">' + s.staff + '</td><td>' + stageChip(s.stage) + '</td><td style="text-align:right;color:var(--ink-300)">›</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function groupAgg(gs) {
    return { schools: gs.length,
      students: gs.reduce(function (a, s) { return a + s.students; }, 0),
      staff: gs.reduce(function (a, s) { return a + s.staff; }, 0) };
  }
  function groupListHtml(groups, view) {
    if (view === 'grid') return '<div class="tl-school-grid">' + groups.map(groupCard).join('') + '</div>';
    return '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>Group</th><th>Schools</th><th>Students</th><th>Staff</th><th></th></tr></thead><tbody>' +
      groups.map(function (x) {
        var a = groupAgg(x.schools);
        return '<tr class="clickable" data-group-open="' + x.g.id + '"><td class="name">' + esc(x.g.name) + '<small>School group</small></td>' +
          '<td class="tl-num">' + a.schools + '</td><td class="tl-num">' + a.students.toLocaleString() + '</td><td class="tl-num">' + a.staff + '</td>' +
          '<td style="text-align:right;white-space:nowrap"><span class="chip-menu" data-gmenu="' + x.g.id + '">⋮</span> <span style="color:var(--ink-300)">›</span></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function groupCard(x) {
    var a = groupAgg(x.schools);
    return '<div class="tl-school-card is-group" data-group-open="' + x.g.id + '">' +
      '<div class="sc-top"><div class="sc-name">' + esc(x.g.name) + '</div><span class="tl-stagechip renewed">Group</span></div>' +
      '<div class="sc-meta">School group · ' + a.schools + ' school' + (a.schools === 1 ? '' : 's') + '</div>' +
      '<div class="sc-stats"><div><b>' + a.schools + '</b><span>schools</span></div><div><b>' + a.students.toLocaleString() + '</b><span>students</span></div><div><b>' + a.staff + '</b><span>staff</span></div></div>' +
      '<div class="sc-actions"><button class="link-btn" data-gmenu="' + x.g.id + '">Manage</button><span class="sc-open">Open →</span></div></div>';
  }

  // ---- Group detail: schools inside one group (own screen) ----
  var grpState = { tab: 'active', q: '' };
  SCREEN.group = function (params, body) {
    var g = ORG.groupById(params.id);
    if (!g || g.id === 'g-none') { go('schools', {}); return; }
    var q = grpState.q.trim().toLowerCase();
    var inGroup = ORG.schools.filter(function (s) { return s.groupId === g.id; });
    var counts = { active: inGroup.filter(function (s) { return !s.archived; }).length, archived: inGroup.filter(function (s) { return s.archived; }).length };
    var rows = inGroup.filter(function (s) {
      if (grpState.tab === 'active' ? s.archived : !s.archived) return false;
      if (q && (s.name + ' ' + s.code).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });

    body.innerHTML = crumbs([{ label: 'All Schools', screen: 'schools' }, { label: g.name }]) +
      screenHead(g.name, counts.active + ' school' + (counts.active === 1 ? '' : 's') + ' in this group.',
        '<button class="btn btn-outline btn-sm" id="grp-dl-assess" title="Assessment completion log for every school in this group — responses vs expected per teacher / parent / student assessment.">↓ Assessments CSV</button>' +
        '<button class="btn btn-outline btn-sm" id="grp-dl-staff" title="Every staff member across this group — name, email, role and sections.">↓ Staff CSV</button>' +
        '<button class="btn btn-primary btn-sm" id="grp-add">+ Add School</button>') +
      '<div class="tl-tabs">' +
        '<button class="tl-tab' + (grpState.tab === 'active' ? ' on' : '') + '" data-gtab="active">Active <b>' + counts.active + '</b></button>' +
        '<button class="tl-tab' + (grpState.tab === 'archived' ? ' on' : '') + '" data-gtab="archived">Archived <b>' + counts.archived + '</b></button>' +
        '<div class="tl-viewtoggle"><button class="' + (schState.view === 'grid' ? 'on' : '') + '" data-view="grid" title="Grid">▦</button><button class="' + (schState.view === 'list' ? 'on' : '') + '" data-view="list" title="List">☰</button></div>' +
      '</div>' +
      '<div class="tl-filters"><input class="input grow" id="grp-q" placeholder="Search within ' + esc(g.name) + '…" value="' + esc(grpState.q) + '" style="max-width:360px"></div>' +
      (rows.length ? schoolListHtml(rows, schState.view)
        : '<div class="tl-empty">No schools in this group' + (q ? ' match your search.' : ' yet.') + '</div>');

    wireCrumbs(body);
    body.querySelectorAll('[data-gtab]').forEach(function (b) { b.addEventListener('click', function () { grpState.tab = b.dataset.gtab; SCREEN.group(params, body); }); });
    body.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { schState.view = b.dataset.view; SCREEN.group(params, body); }); });
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); go('school', { id: b.dataset.open }); }); });
    var ab = body.querySelector('#grp-add'); if (ab) ab.addEventListener('click', openAddSchool);
    // Group-wide CSV exports — active schools in this group, regardless of the search filter.
    var groupSchools = inGroup.filter(function (s) { return !s.archived; });
    var slug = g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group';
    var da = body.querySelector('#grp-dl-assess'); if (da) da.addEventListener('click', function () { exportGroupAssessments(groupSchools, slug); });
    var dst = body.querySelector('#grp-dl-staff'); if (dst) dst.addEventListener('click', function () { exportGroupStaff(groupSchools, slug); });
    var qi = body.querySelector('#grp-q'); if (qi) qi.addEventListener('input', function () { grpState.q = qi.value; var pos = qi.selectionStart; SCREEN.group(params, body); var nq = body.querySelector('#grp-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  };

  // Group CSV builders — one row per (school × assessment) and one per staff member.
  function exportGroupAssessments(schools, slug) {
    var ids = {}; schools.forEach(function (s) { ids[s.id] = s; });
    var rows = ORG.results.filter(function (r) { return ids[r.schoolId]; }).map(function (r) {
      var s = ids[r.schoolId];
      return [s.name, s.code, r.assessment, r.phase, r.audience, r.responses, r.expected, r.completion, r.status, r.updated];
    });
    if (!rows.length) { toast('No assessment data for this group yet.'); return; }
    downloadCsv(slug + '-assessments.csv',
      ['School', 'Code', 'Assessment', 'Phase', 'Audience', 'Responses', 'Expected', 'Completion %', 'Status', 'Updated'], rows);
  }
  function exportGroupStaff(schools, slug) {
    var ids = {}; schools.forEach(function (s) { ids[s.id] = s; });
    var rows = ORG.users.filter(function (u) { return ids[u.schoolId]; }).map(function (u) {
      var s = ids[u.schoolId];
      return [s.name, s.code, u.name, u.email, u.role, (u.sections && u.sections.length) ? u.sections.join('; ') : ''];
    });
    if (!rows.length) { toast('No staff on record for this group yet.'); return; }
    downloadCsv(slug + '-staff.csv', ['School', 'Code', 'Name', 'Email', 'Role', 'Sections'], rows);
  }

  // ---- Per-student assessment log (school hub → Assessments) ----
  // A student × assessment matrix of Completed / In Progress / Not Started.
  // The one live-wired school uses its real roster; every other school gets a
  // deterministic synthetic roster from its grades/sections tree (seeded by
  // code, so re-exports are stable). Cell statuses are weighted by each
  // assessment's real completion %, so the matrix agrees with the aggregate log.
  function seededRng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function strSeed(str) { var h = 2166136261 >>> 0; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var ROSTER_FIRSTS = ['Aarav', 'Diya', 'Vivaan', 'Ananya', 'Aditya', 'Isha', 'Kabir', 'Sara', 'Rohan', 'Meera', 'Arjun', 'Anaya', 'Ishaan', 'Riya', 'Vihaan', 'Kiara', 'Reyansh', 'Myra', 'Advait', 'Navya', 'Dhruv', 'Aadhya', 'Krish', 'Pari', 'Yash'];
  var ROSTER_LASTS = ['Sharma', 'Iyer', 'Nair', 'Menon', 'Kapoor', 'Reddy', 'Gupta', 'Rao', 'Shah', 'Krishnan', 'Desai', 'Bose', 'Patel', 'Verma', 'Chopra', 'Malhotra', 'Pillai', 'Jain', 'Das', 'Sinha'];
  function studentRosterFor(s) {
    if (s.id === 'little-sprouts' && TS && TS.students) {
      return TS.students.map(function (st) { return { gradeSection: st.grade + ' - ' + st.section, id: st.adm, name: st.first + ' ' + st.last }; });
    }
    var rows = [], rnd = seededRng(strSeed(s.code));
    function pushStudent(label) {
      var f = ROSTER_FIRSTS[Math.floor(rnd() * ROSTER_FIRSTS.length)];
      var l = ROSTER_LASTS[Math.floor(rnd() * ROSTER_LASTS.length)];
      var id = rnd() > 0.5 ? ('2025' + String(100000 + Math.floor(rnd() * 899999))) : String(20000 + Math.floor(rnd() * 79999));
      rows.push({ gradeSection: label, id: id, name: f + ' ' + l });
    }
    ((s.structure && s.structure.grades) || []).forEach(function (g) {
      if (g.sections && g.sections.length) {
        g.sections.forEach(function (sec) { for (var k = 0; k < sec.students; k++) pushStudent(g.grade + ' - ' + sec.name); });
      } else {
        // Sectionless grade: students belong to the grade as one cohort.
        for (var k = 0; k < (parseInt(g.students, 10) || 0); k++) pushStudent(g.grade);
      }
    });
    return rows;
  }
  var STUDENTLOG_TONE = { 'Completed': 'ok', 'In Progress': 'warn', 'Not Started': 'danger' };
  function renderStudentAssessmentLog(d, mount) {
    var s = d.school;
    // Only student-facing assessments belong in a per-student log; a teacher
    // observation is completed once per class, not per child.
    var cols = d.deployments.filter(function (x) { return x.audience === 'Direct Assessment' || x.audience === 'Parent'; });
    if (!cols.length) { mount.innerHTML = '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-empty">No student-facing assessments deployed for this school yet.</div></div>'; return; }
    var roster = studentRosterFor(s);
    if (!roster.length) { mount.innerHTML = '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-empty">No students on record for this school yet.</div></div>'; return; }
    var frac = cols.map(function (dep) {
      if (dep.status === 'Scheduled') return 0;
      var res = ORG.results.find(function (r) { return r.schoolId === s.id && r.assessment === dep.assessment && r.audience === dep.audience; });
      return res ? Math.max(0, Math.min(1, res.completion / 100)) : 0.4;
    });
    var tally = cols.map(function () { return { 'Completed': 0, 'In Progress': 0, 'Not Started': 0 }; });
    var rnd = seededRng(strSeed(s.code + '|log'));
    var bodyRows = roster.map(function (st) {
      var cells = cols.map(function (dep, ci) {
        var status;
        if (dep.status === 'Scheduled') status = 'Not Started';
        else { var done = frac[ci], prog = Math.min(0.15, (1 - done) * 0.4), u = rnd(); status = u < done ? 'Completed' : (u < done + prog ? 'In Progress' : 'Not Started'); }
        tally[ci][status]++;
        return '<td>' + statusPill(status, STUDENTLOG_TONE[status]) + '</td>';
      }).join('');
      return '<tr><td>' + esc(st.gradeSection) + '</td><td class="mono">' + esc(st.id) + '</td><td class="name">' + esc(st.name) + '</td>' + cells + '</tr>';
    }).join('');
    var head = '<tr><th>Grade + Section</th><th>Student ID</th><th>Student Name</th>' +
      cols.map(function (dep, ci) {
        var t = tally[ci];
        return '<th>' + esc(dep.assessment) + '<small style="display:block;font-weight:600;text-transform:none;letter-spacing:0;color:var(--ink-300);margin-top:3px">' + t['Completed'] + ' done · ' + t['In Progress'] + ' in progress · ' + t['Not Started'] + ' not started</small></th>';
      }).join('') + '</tr>';
    mount.innerHTML = '<div class="tl-card" style="margin-top:var(--tl-gap)">' +
      '<div class="tl-mod-h"><div><h3 class="tl-mod-title">Student assessment log</h3><p class="tl-mod-note">' + roster.length + ' students · ' + cols.length + ' student-facing assessment' + (cols.length === 1 ? '' : 's') + ' · <span class="tl-pill ok">Completed</span> <span class="tl-pill warn">In Progress</span> <span class="tl-pill danger">Not Started</span></p></div></div>' +
      '<div class="tl-tablewrap"><table class="tl-table" style="min-width:' + (420 + cols.length * 190) + 'px"><thead>' + head + '</thead><tbody>' + bodyRows + '</tbody></table></div></div>';
  }

  function schoolCard(s) {
    var flags = ORG.server.schoolFlags(s);
    var warn = flags.length ? '<div class="sc-flags">' + flags.map(function (f) { return '<span class="sc-flag">' + esc(f.label) + '</span>'; }).join('') + '</div>' : '';
    return '<div class="tl-school-card" data-open="' + s.id + '">' +
      '<div class="sc-top"><div class="sc-name">' + esc(s.name) + (s.live ? ' <span class="tl-chip active" style="font-size:9px;padding:2px 7px"><span class="dot"></span>Live</span>' : '') + '</div>' + stageChip(s.stage) + '</div>' +
      '<div class="sc-meta">' + esc(s.type) + ' · <span class="mono">' + esc(s.code) + '</span> · ' + esc(s.groupName) + '</div>' +
      '<div class="sc-stats"><div><b>' + s.gradeCount + '</b><span>grades</span></div><div><b>' + s.students.toLocaleString() + '</b><span>students</span></div><div><b>' + s.staff + '</b><span>staff</span></div></div>' +
      warn +
      '<div class="sc-actions"><button class="link-btn" data-edit="' + s.id + '">Edit</button>' +
        '<button class="link-btn" data-archive="' + s.id + '">' + (s.archived ? 'Un-archive' : 'Archive') + '</button>' +
        '<span class="sc-open">Open →</span></div></div>';
  }

  function openGroupMenu(gid) {
    var g = ORG.groupById(gid);
    openModal('Group · ' + g.name, '<p class="tl-muted">Group-level actions are gated structure changes.</p>' +
      '<div class="tl-stack"><button class="btn btn-outline block" id="gm-rename">Rename group</button>' +
      '<button class="btn btn-danger block" id="gm-empty">Delete / empty group</button></div>', function (close) {
      close(); return true;
    }, 'Done');
    setTimeout(function () {
      var rn = document.getElementById('gm-rename'); if (rn) rn.addEventListener('click', function () {
        openModal('Rename group', '<label class="field">Group name<input class="input" id="gr-name" value="' + esc(g.name) + '"></label>', function (close) {
          var nm = (document.getElementById('gr-name').value || '').trim(); if (!nm) { toast('Group name is required.'); return false; }
          ORG.server.renameGroup(g.id, nm); ORG.server.logAudit(me.name, 'group.rename', nm, 'group');
          close(); toast('Group renamed.'); go('schools', {});
        }, 'Save');
      });
      var em = document.getElementById('gm-empty'); if (em) em.addEventListener('click', function () {
        document.getElementById('tl-modal-root').innerHTML = '';
        gated({ title: 'Delete group', danger: true, typed: 'DELETE', body: '<p>Delete <b>' + esc(g.name) + '</b>? Its schools move to <b>No group</b> — no school or student data is deleted.</p>', confirmLabel: 'Delete group', audit: { action: 'group.delete', entity: g.name, entityType: 'group' }, onConfirm: function () { ORG.server.deleteGroup(g.id); toast('Group deleted.'); go('schools', {}); } });
      });
    }, 0);
  }

  // ---------- Add-School wizard (spec §4.1: name, type, group, initial
  //            grades/sections → land on the new hub). Multi-step so a
  //            Super Admin can set up the whole school in one flow. ----------
  var ADD_BOARDS = ['CBSE', 'ICSE', 'IB', 'Cambridge', 'National', 'State Board', 'Other'];
  // Country → cities. City picker is filtered by the chosen country (country first).
  var ADD_COUNTRIES = ['India', 'Sri Lanka'];
  var ADD_CITIES = {
    'India': ['Bengaluru', 'Mumbai', 'Delhi', 'Gurugram', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Jaipur'],
    'Sri Lanka': ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo'],
  };
  var ADD_GRADE_PRESETS = ['LKG', 'UKG', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  var WIZ_STEPS = [
    { key: 'profile', label: 'Profile' }, { key: 'rollout', label: 'Rollout' },
    { key: 'structure', label: 'Grades' }, { key: 'admin', label: 'First admin', optional: true },
    { key: 'review', label: 'Review' },
  ];
  function secLetter(i) { return String.fromCharCode(65 + i); }

  // Canonical grade ordering: early years (Nursery → KG) first, then Grade 1..N
  // numerically, then any unrecognised custom names alphabetically at the end.
  var GRADE_EARLY_RANK = { 'playgroup': -7, 'pre-nursery': -7, 'nursery': -6, 'pre-k': -5, 'prek': -5, 'lkg': -4, 'ukg': -3, 'kg': -2, 'kindergarten': -1 };
  function gradeRank(name) {
    var n = String(name || '').trim().toLowerCase();
    if (GRADE_EARLY_RANK[n] != null) return GRADE_EARLY_RANK[n];
    var m = n.match(/\d+/);
    if (m) return parseInt(m[0], 10);   // Grade 1 / Class 2 / Std 3 → 1, 2, 3
    return 900;                          // unknown custom → sort last
  }
  function sortGrades(list) {
    list.sort(function (a, b) {
      var ra = gradeRank(a.grade), rb = gradeRank(b.grade);
      return ra !== rb ? ra - rb : a.grade.localeCompare(b.grade);
    });
    return list;
  }
  // "Joined" is picked from a native date input (YYYY-MM-DD) but stored/shown as a friendly string.
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function todayISO() { var t = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; }; return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()); }
  function fmtJoined(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); return m ? (parseInt(m[3], 10) + ' ' + MONTHS_SHORT[parseInt(m[2], 10) - 1] + ' ' + m[1]) : (v || ''); }
  // Students for a grade: sum of its sections, or — when it has none — the
  // grade-level count entered directly against the grade.
  function gradeStudents(g) { return g.sections.length ? g.sections.reduce(function (b, s) { return b + (parseInt(s.students, 10) || 0); }, 0) : (parseInt(g.students, 10) || 0); }
  function draftStudentTotal(d) { return d.grades.reduce(function (a, g) { return a + gradeStudents(g); }, 0); }
  function draftSectionTotal(d) { return d.grades.reduce(function (a, g) { return a + g.sections.length; }, 0); }

  function openAddSchool() {
    var d = {
      name: '', boards: [], city: '', country: 'India',
      groupId: 'g-none', stage: 'onboarding', joined: todayISO(),
      grades: [], admin: { name: '', email: '' },
    };
    var step = 0;
    var root = document.getElementById('tl-modal-root');

    function close() { root.innerHTML = ''; }

    // Pull the current step's inputs into the draft before we move/re-render.
    function commit() {
      var g = function (id) { return document.getElementById(id); };
      if (step === 0) {
        if (g('ws-name')) d.name = g('ws-name').value.trim();
        var boxes = document.querySelectorAll('.ws-board:checked');
        d.boards = Array.prototype.map.call(boxes, function (b) { return b.value; });
        if (g('ws-country')) d.country = g('ws-country').value;
        if (g('ws-city')) d.city = g('ws-city').value;
        if (g('ws-group')) d.groupId = g('ws-group').value;
      } else if (step === 1) {
        if (g('ws-stage')) d.stage = g('ws-stage').value;
        if (g('ws-joined')) d.joined = g('ws-joined').value.trim() || d.joined;
      } else if (step === 3) {
        if (g('ws-admin-name')) d.admin.name = g('ws-admin-name').value.trim();
        if (g('ws-admin-email')) d.admin.email = g('ws-admin-email').value.trim();
      }
    }

    function stepper() {
      return '<div class="tl-steps" style="margin-bottom:18px">' + WIZ_STEPS.map(function (s, i) {
        var cls = i < step ? 'done' : (i === step ? 'cur' : '');
        var optTag = s.optional ? '<span class="ws-opt-tag">optional</span>' : '';
        return '<div class="tl-step ' + cls + '"><div class="dot">' + (i < step ? '✓' : (i + 1)) + '</div><div class="slabel">' + esc(s.label) + optTag + '</div></div>';
      }).join('') + '</div>';
    }

    // City options for the currently selected country (country must be chosen first).
    function cityOptions() {
      var list = ADD_CITIES[d.country] || [];
      return '<option value="">Select a city…</option>' +
        list.map(function (c) { return '<option value="' + esc(c) + '"' + (c === d.city ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    }

    function bodyProfile() {
      var boardBoxes = ADD_BOARDS.map(function (b) {
        var on = d.boards.indexOf(b) !== -1;
        return '<label class="ws-board-opt"><input class="ws-board" type="checkbox" value="' + esc(b) + '"' + (on ? ' checked' : '') + '> ' + esc(b) + '</label>';
      }).join('');
      var countryOpts = ADD_COUNTRIES.map(function (c) { return '<option value="' + esc(c) + '"' + (c === d.country ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
      var groupOpts = ORG.groups.map(function (g) { return '<option value="' + g.id + '"' + (g.id === d.groupId ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') +
        '<option value="__new">＋ New group…</option>';
      return '<p class="tl-muted">The basics. Only the name is required — everything else can change later.</p>' +
        '<div class="tl-stack">' +
          '<label class="field">School name *<input class="input" id="ws-name" placeholder="e.g. Harmony High" value="' + esc(d.name) + '"></label>' +
          '<div class="field">Board <span class="tl-muted" style="font-weight:400">(select all that apply)</span>' +
            '<div class="ws-board-grid">' + boardBoxes + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:10px">' +
            '<label class="field" style="flex:1">Country<select class="select" id="ws-country">' + countryOpts + '</select></label>' +
            '<label class="field" style="flex:1">City<select class="select" id="ws-city">' + cityOptions() + '</select></label>' +
          '</div>' +
          '<label class="field">Group<select class="select" id="ws-group">' + groupOpts + '</select></label>' +
          '<div id="ws-newgroup-row" style="display:none;gap:8px">' +
            '<input class="input grow" id="ws-newgroup" placeholder="New group name">' +
            '<button class="btn btn-outline btn-sm" id="ws-newgroup-add" type="button">Create</button>' +
          '</div>' +
        '</div>';
    }

    function bodyRollout() {
      var stageOpts = ORG.stages.map(function (s) { return '<option value="' + s.key + '"' + (s.key === d.stage ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('');
      return '<p class="tl-muted">Where this partnership sits today. New schools usually start at <b>Onboarding</b>.</p>' +
        '<div class="tl-stack">' +
          '<label class="field">Rollout stage<select class="select" id="ws-stage">' + stageOpts + '</select></label>' +
          '<label class="field">Joined <span class="tl-muted" style="font-weight:400">(defaults to today)</span><input class="input" type="date" id="ws-joined" value="' + esc(d.joined) + '" max="' + todayISO() + '"></label>' +
        '</div>';
    }

    function bodyStructure() {
      var presetBtns = ADD_GRADE_PRESETS.filter(function (p) { return !d.grades.some(function (g) { return g.grade.toLowerCase() === p.toLowerCase(); }); })
        .map(function (p) { return '<button class="ws-add-chip" type="button" data-preset="' + esc(p) + '">＋ ' + esc(p) + '</button>'; }).join('');
      var list = d.grades.length ? d.grades.map(function (g, gi) {
        var secs = g.sections.length ? g.sections.map(function (sec, si) {
          return '<span class="ws-sec"><span class="ws-sec-name">' + esc(sec.name) + '</span>' +
            '<input class="ws-secnum" type="number" min="0" data-gi="' + gi + '" data-si="' + si + '" value="' + (parseInt(sec.students, 10) || 0) + '" aria-label="Students in ' + esc(g.grade + ' ' + sec.name) + '">' +
            '<button class="ws-secx" type="button" data-gi="' + gi + '" data-si="' + si + '" title="Remove section" aria-label="Remove section">×</button></span>';
        }).join('') : '<span class="ws-nosec">No sections</span>' +
          '<label class="ws-gradenum-wrap">Students' +
            '<input class="ws-gradenum" type="number" min="0" data-gi="' + gi + '" value="' + (parseInt(g.students, 10) || 0) + '" aria-label="Students in ' + esc(g.grade) + '"></label>';
        return '<div class="ws-grade-card">' +
          '<input class="ws-gradename" data-gi="' + gi + '" value="' + esc(g.grade) + '" aria-label="Grade name — click to rename" title="Click to rename">' +
          '<div class="ws-secs">' + secs + '</div>' +
          '<div class="ws-grade-actions">' +
            '<button class="ws-add-sec" type="button" data-addsec="' + gi + '">＋ Section</button>' +
            '<button class="ws-grade-del" type="button" data-delgrade="' + gi + '" title="Remove grade">Remove</button>' +
          '</div></div>';
      }).join('') : '<div class="tl-empty">No grades yet — add one below, or tap a preset.</div>';
      return '<p class="tl-muted">Add grades, rename any inline, and set how many students sit in each section. Grades sort automatically (early years first). Totals update as you type.</p>' +
        '<div class="ws-grades">' + list + '</div>' +
        '<div class="ws-addbar">' +
          (presetBtns ? '<div class="ws-addbar-lbl">Quick add</div><div class="ws-presets">' + presetBtns + '</div>' : '') +
          '<div class="ws-newgrade-row"><input class="input grow" id="ws-newgrade" placeholder="Custom grade (e.g. Grade 7)"><button class="btn btn-outline btn-sm" id="ws-addgrade" type="button">Add grade</button></div>' +
        '</div>' +
        '<div class="ws-total">' + d.grades.length + ' grades · ' + draftSectionTotal(d) + ' sections · <b>' + draftStudentTotal(d) + '</b> students</div>';
    }

    function bodyAdmin() {
      return '<div class="ws-optional-note"><span class="pill">Optional</span><span>Invite the first admin now, or skip and add people later from the school hub.</span></div>' +
        '<p class="tl-muted">If you invite them, they\'ll get an activation email and can add teachers and students themselves. Teachers can also self-join later with the school code from the Staff tab.</p>' +
        '<div class="tl-stack">' +
          '<label class="field">Admin name<input class="input" id="ws-admin-name" placeholder="e.g. Meera Krishnan" value="' + esc(d.admin.name) + '"></label>' +
          '<label class="field">Admin email<input class="input" id="ws-admin-email" type="email" placeholder="name@school.edu" value="' + esc(d.admin.email) + '"></label>' +
        '</div>' +
        '<button class="link-btn" id="ws-skip-admin" type="button" style="margin-top:12px">Skip this step →</button>';
    }

    function bodyReview() {
      var grp = (ORG.groups.find(function (g) { return g.id === d.groupId; }) || ORG.groups[0]).name;
      var stageLbl = (ORG.stages.find(function (s) { return s.key === d.stage; }) || ORG.stages[0]).label;
      function row(k, v) { return '<div class="ws-rev-row"><span>' + esc(k) + '</span><b>' + esc(v || '—') + '</b></div>'; }
      var admin = d.admin.email ? (d.admin.name || d.admin.email) + ' · ' + d.admin.email : 'None — add later';
      return '<p class="tl-muted">Confirm and create. You\'ll land on the new school\'s hub. <span class="tl-gated">gated</span></p>' +
        '<div class="ws-review">' +
          row('Name', d.name) + row('Board', d.boards.join(', ')) +
          row('Location', [d.city, d.country].filter(Boolean).join(', ')) +
          row('Group', grp) + row('Stage', stageLbl) + row('Joined', fmtJoined(d.joined)) +
          row('Structure', d.grades.length + ' grades · ' + draftSectionTotal(d) + ' sections · ' + draftStudentTotal(d) + ' students') +
          row('First admin', admin) +
        '</div>';
    }

    var BODIES = [bodyProfile, bodyRollout, bodyStructure, bodyAdmin, bodyReview];

    // Whether the current step is missing required input (school name is the
    // only hard requirement in the wizard). Gates the Next/Create button so you
    // can't advance past step 1 with an empty name.
    function stepBlocked() {
      if (step === 0) return !d.name;              // school name is mandatory
      if (step === 2) return !d.grades.length;     // at least one grade is mandatory
      return false;
    }
    // Refresh the footer button's enabled state without re-rendering the whole
    // step (grades/name update the body in place).
    function syncNext() { var nb = document.getElementById('ws-next'); if (nb) nb.disabled = stepBlocked(); }

    function render() {
      var last = step === WIZ_STEPS.length - 1;
      root.innerHTML = '<div class="overlay" id="tl-ov"><div class="tl-modal-card">' +
        '<div class="tl-modal-h"><h3>Add a partner school</h3><button class="dialog-close" id="tl-mx" aria-label="Close">×</button></div>' +
        stepper() +
        '<div id="ws-body">' + BODIES[step]() + '</div>' +
        '<div class="tl-modal-foot" style="justify-content:space-between">' +
          '<button class="btn btn-outline btn-sm" id="ws-back"' + (step === 0 ? ' style="visibility:hidden"' : '') + ' type="button">Back</button>' +
          '<button class="btn btn-primary btn-sm" id="ws-next" type="button"' + (stepBlocked() ? ' disabled' : '') + '>' + (last ? 'Create school' : 'Next') + '</button>' +
        '</div></div></div>';

      var ov = document.getElementById('tl-ov');
      ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
      document.getElementById('tl-mx').addEventListener('click', close);
      document.getElementById('ws-back').addEventListener('click', function () { commit(); step = Math.max(0, step - 1); render(); });
      document.getElementById('ws-next').addEventListener('click', onNext);
      wireStep();
    }

    function wireStep() {
      if (step === 0) {
        // Keep the Next button in sync with the name field as you type, so the
        // gate lifts the moment a name is present (and re-locks if cleared).
        var nameEl = document.getElementById('ws-name');
        nameEl.addEventListener('input', function () {
          d.name = nameEl.value.trim();
          syncNext();
        });
        // Country drives the city list — reset city and repopulate on change.
        var country = document.getElementById('ws-country');
        var cityEl = document.getElementById('ws-city');
        country.addEventListener('change', function () {
          d.country = country.value; d.city = '';
          cityEl.innerHTML = cityOptions();
        });
        var sel = document.getElementById('ws-group');
        var row = document.getElementById('ws-newgroup-row');
        sel.addEventListener('change', function () {
          if (sel.value === '__new') { row.style.display = 'flex'; document.getElementById('ws-newgroup').focus(); }
          else { row.style.display = 'none'; d.groupId = sel.value; }
        });
        document.getElementById('ws-newgroup-add').addEventListener('click', function () {
          var nm = (document.getElementById('ws-newgroup').value || '').trim();
          if (!nm) { toast('Group name required.'); return; }
          var g = ORG.server.createGroup(nm); ORG.server.logAudit(me.name, 'group.create', g.name, 'group');
          d.groupId = g.id; toast('Group “' + g.name + '” created.'); commit(); render();
        });
      } else if (step === 2) {
        var body = document.getElementById('ws-body');
        body.querySelectorAll('[data-preset]').forEach(function (b) { b.addEventListener('click', function () { addGrade(b.dataset.preset); }); });
        var ag = document.getElementById('ws-addgrade');
        ag.addEventListener('click', function () { var v = (document.getElementById('ws-newgrade').value || '').trim(); if (!v) { toast('Grade name required.'); return; } addGrade(v); });
        document.getElementById('ws-newgrade').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ag.click(); } });
        body.querySelectorAll('[data-addsec]').forEach(function (b) { b.addEventListener('click', function () {
          var g = d.grades[+b.dataset.addsec];
          // First section inherits any grade-level count, so the cohort you already
          // typed becomes Section A rather than being silently dropped.
          if (!g.sections.length && (parseInt(g.students, 10) || 0) > 0) {
            g.sections.push({ name: secLetter(0), students: parseInt(g.students, 10) || 0 }); g.students = 0;
          } else {
            g.sections.push({ name: secLetter(g.sections.length), students: 0 });
          }
          rerenderStructure();
        }); });
        body.querySelectorAll('[data-delgrade]').forEach(function (b) { b.addEventListener('click', function () { d.grades.splice(+b.dataset.delgrade, 1); rerenderStructure(); }); });
        body.querySelectorAll('.ws-secx').forEach(function (b) { b.addEventListener('click', function () {
          var g = d.grades[+b.dataset.gi]; g.sections.splice(+b.dataset.si, 1);
          g.sections.forEach(function (sec, i) { sec.name = secLetter(i); }); // keep A,B,C… contiguous
          rerenderStructure();
        }); });
        body.querySelectorAll('.ws-secnum').forEach(function (inp) { inp.addEventListener('input', function () {
          d.grades[+inp.dataset.gi].sections[+inp.dataset.si].students = Math.max(0, parseInt(inp.value, 10) || 0);
          var tot = document.querySelector('#ws-body .ws-total');
          if (tot) tot.innerHTML = d.grades.length + ' grades · ' + draftSectionTotal(d) + ' sections · <b>' + draftStudentTotal(d) + '</b> students';
        }); });
        // Grade-level student count, shown only when the grade has no sections.
        body.querySelectorAll('.ws-gradenum').forEach(function (inp) { inp.addEventListener('input', function () {
          d.grades[+inp.dataset.gi].students = Math.max(0, parseInt(inp.value, 10) || 0);
          var tot = document.querySelector('#ws-body .ws-total');
          if (tot) tot.innerHTML = d.grades.length + ' grades · ' + draftSectionTotal(d) + ' sections · <b>' + draftStudentTotal(d) + '</b> students';
        }); });
        // Inline rename — commit on blur/Enter, then re-sort so it lands in the right place.
        body.querySelectorAll('.ws-gradename').forEach(function (inp) {
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
          inp.addEventListener('change', function () {
            var gi = +inp.dataset.gi, nv = (inp.value || '').trim();
            if (!nv) { toast('Grade name can’t be empty.'); rerenderStructure(); return; }
            if (d.grades.some(function (g, i) { return i !== gi && g.grade.toLowerCase() === nv.toLowerCase(); })) { toast('That grade already exists.'); rerenderStructure(); return; }
            d.grades[gi].grade = nv; sortGrades(d.grades); rerenderStructure();
          });
        });
      } else if (step === 3) {
        var skip = document.getElementById('ws-skip-admin');
        if (skip) skip.addEventListener('click', function () { d.admin = { name: '', email: '' }; step++; render(); });
      }
    }

    function addGrade(name) {
      if (d.grades.some(function (g) { return g.grade.toLowerCase() === name.toLowerCase(); })) { toast('Grade already added.'); return; }
      // Grades start with no sections — a school may run a grade as a single
      // ungrouped cohort. Sections are added explicitly via "+ Section".
      d.grades.push({ grade: name, sections: [], students: 0 });
      sortGrades(d.grades);
      rerenderStructure();
    }
    function rerenderStructure() { document.getElementById('ws-body').innerHTML = bodyStructure(); wireStep(); syncNext(); }

    function onNext() {
      commit();
      if (step === 0 && !d.name) { toast('School name is required.'); return; }
      if (step === 2 && !d.grades.length) { toast('Add at least one grade.'); return; }
      if (step === 3 && d.admin.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.admin.email)) { toast('Enter a valid admin email.'); return; }
      if (step < WIZ_STEPS.length - 1) { step++; render(); return; }
      // Final step → show a brief "creating" transition, then commit and land
      // on the new school's hub. The create itself is synchronous; the delay is
      // purely to give the action a beat of feedback before the screen swaps.
      renderCreating();
      setTimeout(function () {
        d.board = d.boards.join(', ');
        var s = ORG.server.createSchool(Object.assign({}, d, { joined: fmtJoined(d.joined) }));
        ORG.server.logAudit(me.name, 'school.add', s.name, 'school', s.id);
        if (d.admin.email) ORG.server.logAudit(me.name, 'invitation.send', d.admin.email, 'invitation', s.id);
        close();
        toast(s.name + ' created' + (draftSectionTotal(d) ? ' with ' + draftSectionTotal(d) + ' sections.' : '.'));
        go('school', { id: s.id });
      }, 1100);
    }

    // Full-modal "creating…" state shown between Create and landing on the hub.
    function renderCreating() {
      root.innerHTML = '<div class="overlay" id="tl-ov"><div class="tl-modal-card tl-creating">' +
        '<div class="tl-creating-spin" aria-hidden="true"></div>' +
        '<h3>Creating the school…</h3>' +
        '<p class="tl-muted">Setting up <b>' + esc(d.name) + '</b> and its structure.</p>' +
        '</div></div>';
    }

    render();
  }

  // ============================================================
  //  SCHOOL DETAIL HUB  (spec §4.2)
  // ============================================================
  var HUB_TABS = [
    { key: 'overview', label: 'Overview' }, { key: 'students', label: 'Students' },
    { key: 'staff', label: 'Staff & Access' }, { key: 'assessments', label: 'Assessments' },
    { key: 'issues', label: 'Issues & Logs' }, { key: 'settings', label: 'Settings' },
  ];
  SCREEN.school = function (params, body) {
    var sum0 = ORG.server.schoolSummary(params.id);
    if (!sum0) { body.innerHTML = '<div class="tl-empty">School not found.</div>'; return; }
    var s = sum0.school;
    var tab = params.tab && HUB_TABS.some(function (t) { return t.key === params.tab; }) ? params.tab : 'overview';

    var crumbParts = [{ label: 'All Schools', screen: 'schools' }];
    if (s.groupId && s.groupId !== 'g-none') crumbParts.push({ label: s.groupName, screen: 'group', params: { id: s.groupId } });
    crumbParts.push({ label: s.name });
    var header = crumbs(crumbParts) +
      '<div class="tl-hub-head">' +
        '<div><h1 class="tl-screen-title" style="margin-bottom:4px">' + esc(s.name) + (s.archived ? ' <span class="tl-pill">Archived</span>' : '') + '</h1>' +
        '<p class="tl-screen-sub" style="margin:0">' + esc(s.type) + ' · <span class="mono">' + esc(s.code) + '</span> · ' + esc(s.groupName) + ' · ' + esc(s.city + ', ' + s.country) + '</p></div>' +
        '<div class="tl-hub-actions"><button class="btn btn-outline btn-sm" data-hub-edit>Edit</button>' +
          '<button class="btn btn-outline btn-sm" data-hub-archive>' + (s.archived ? 'Un-archive' : 'Archive') + '</button>' +
          (s.archived ? '<button class="btn btn-danger btn-sm" data-hub-delete>Delete</button>' : '') +
          (s.live ? '<a class="btn btn-primary btn-sm" href="admin.html?school=' + encodeURIComponent(s.created ? s.id : s.name) + '&email=' + encodeURIComponent(s.created && s.coordinator ? s.coordinator.email : me.email) + '&from=tilli" style="text-decoration:none">Leadership dashboard →</a>' : '') + '</div>' +
      '</div>' +
      '<div class="tl-kpis five" style="margin-top:14px">' +
        kpi(s.gradeCount, 'Grades') + kpi(s.sectionCount, 'Sections') + kpi(s.students.toLocaleString(), 'Students') +
        kpi(s.staff, 'Staff') + kpi(sum0.counts.openIssues, 'Open issues') + '</div>' +
      '<div class="tl-tabs hub">' + HUB_TABS.map(function (t) {
        return '<button class="tl-tab' + (t.key === tab ? ' on' : '') + '" data-hubtab="' + t.key + '">' + esc(t.label) + '</button>';
      }).join('') + '</div>';

    body.innerHTML = header + '<div id="hub-tab"></div>';
    var hubEl = document.getElementById('hub-tab');

    // Switch tabs by swapping ONLY the #hub-tab section — no full-screen
    // re-render, so scroll position holds and the sidebar/header/KPIs don't
    // flash. The URL is kept in sync via replaceState (a refresh still lands
    // on the right tab) without firing hashchange → render.
    function selectTab(key) {
      if (!HUB[key] || key === tab) return;
      tab = key;
      body.querySelectorAll('.tl-tab[data-hubtab]').forEach(function (b) { b.classList.toggle('on', b.dataset.hubtab === key); });
      HUB[key](sum0, hubEl);
      wireHubtabTriggers();
      history.replaceState(null, '', buildHash('school', { id: s.id, tab: key }));
    }
    // (Re)bind every [data-hubtab] trigger — the tab bar plus in-content
    // shortcuts like Overview's "View all →" — to the in-place swap. Called
    // again after each swap because the hub content is fresh DOM each time.
    function wireHubtabTriggers() {
      body.querySelectorAll('[data-hubtab]').forEach(function (b) {
        if (b._hubBound) return; b._hubBound = true;
        b.addEventListener('click', function () { selectTab(b.dataset.hubtab); });
      });
    }

    HUB[tab](sum0, hubEl);
    wireHubtabTriggers();

    wireCrumbs(body);
    body.querySelector('[data-hub-edit]').addEventListener('click', function () { openSchoolEditor(s); });
    body.querySelector('[data-hub-archive]').addEventListener('click', function () { archiveSchool(s); });
    var delBtn = body.querySelector('[data-hub-delete]');
    if (delBtn) delBtn.addEventListener('click', function () { deleteSchool(s); });
  };

  function deleteSchool(s) {
    if (!s.archived) { toast('Archive the school before deleting it.'); return; }
    gated({ title: 'Delete ' + s.name, danger: true, typed: 'DELETE',
      body: '<p>This <b>permanently removes</b> ' + esc(s.name) + ', its staff accounts and pending invitations. This cannot be undone.</p>',
      confirmLabel: 'Delete school', audit: { action: 'school.delete', entity: s.name, entityType: 'school', schoolId: s.id },
      onConfirm: function () { ORG.server.deleteSchool(s.id); toast(s.name + ' deleted.'); go('schools', {}); } });
  }

  function archiveSchool(s) {
    if (s.archived) { gated({ title: 'Un-archive ' + s.name, body: '<p>Restore this school to the active list and its deployments/master links.</p>', confirmLabel: 'Un-archive', audit: { action: 'school.archive', entity: s.name, entityType: 'school', schoolId: s.id }, onConfirm: function () { s.archived = false; toast(s.name + ' restored.'); go('school', { id: s.id }); } }); return; }
    gated({ title: 'Archive ' + s.name, danger: true, typed: 'ARCHIVE',
      body: '<p>Archiving hides the school from active lists and <b>suspends its deployments and master links</b>. Students and data are kept and can be restored.</p>',
      confirmLabel: 'Archive school', audit: { action: 'school.archive', entity: s.name, entityType: 'school', schoolId: s.id },
      onConfirm: function () { s.archived = true; toast(s.name + ' archived.'); go('schools', {}); } });
  }

  // ---- Hub tabs ----
  var HUB = {};
  HUB.overview = function (d, el) {
    var s = d.school;
    var structure = d.structure.grades.length
      ? '<div class="tl-tree">' + d.structure.grades.map(function (g) {
          var body = g.sections.length
            ? g.sections.map(function (sec) { return '<span class="tl-tree-sec">' + esc(sec.name) + ' <i>' + sec.students + '</i></span>'; }).join('')
            : '<span class="tl-tree-sec">No sections <i>' + (parseInt(g.students, 10) || 0) + '</i></span>';
          return '<div class="tl-tree-grade"><b>' + esc(g.grade) + '</b>' + body + '</div>';
        }).join('') + '</div>'
      : '<div class="tl-empty">No grades/sections yet.</div>';

    var progress = '<div class="tl-phases">' + d.assessment_progress.map(function (p) {
      var tone = !p.deployed ? 'muted' : (p.status === 'Live' ? 'live' : (p.status === 'Ended' ? 'done' : 'sched'));
      return '<div class="tl-phase ' + tone + '"><div class="tp-name">' + esc(p.phase) + '</div>' +
        '<div class="tp-state">' + (p.deployed ? esc(p.status) : 'Not deployed') + '</div>' +
        (p.deployed ? '<div class="tp-win">' + esc(p.window || '') + '</div><div class="tp-comp">' + (p.completion != null ? pct(p.completion) + '% complete' : '') + '</div>' : '') + '</div>';
    }).join('') + '</div>';

    var flags = d.flags.length ? '<div class="tl-flagrow">' + d.flags.map(function (f) { return '<span class="tl-flag">⚠ ' + esc(f.label) + '</span>'; }).join('') + '</div>' : '<div class="tl-ok">On track — no onboarding flags. 🌱</div>';

    var issues = d.issues.filter(function (i) { return i.status === 'open'; }).slice(0, 4);
    var issuesHtml = issues.length ? issues.map(function (i) { return '<div class="tl-feed-row"><span class="tl-feed-when">' + esc(i.date) + '</span><span class="tl-feed-body">' + esc(i.page) + ' · <i>' + esc(i.reporter) + '</i></span></div>'; }).join('') : '<div class="tl-empty">No open issues.</div>';

    el.innerHTML = '<div class="tl-grid two">' +
      '<div class="tl-card"><div class="tl-mod-h"><h3 class="tl-mod-title">Structure</h3></div>' + structure + '</div>' +
      '<div class="tl-card"><div class="tl-mod-h"><h3 class="tl-mod-title">Onboarding</h3></div>' + flags + '</div>' +
      '<div class="tl-card span2"><div class="tl-mod-h"><h3 class="tl-mod-title">Assessment progress</h3></div>' + progress + '</div>' +
      '<div class="tl-card span2"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Open issues</h3></div><button class="link-btn" data-hubtab="issues">View all →</button></div>' + issuesHtml + '</div>' +
    '</div>';
    // [data-hubtab] triggers are wired by SCREEN.school's wireHubtabTriggers()
    // so they swap the section in place instead of re-rendering the screen.
  };

  HUB.students = function (d, el) {
    var s = d.school;
    var roster = s.id === 'little-sprouts' && TS ? TS.students.map(function (st) {
      return { name: st.first + ' ' + st.last, admission: st.adm, gradeSection: st.grade + ' ' + st.section, status: 'Active' };
    }) : (s.created && window.TilliAPI) ? window.TilliAPI.studentsForSchool(s.id).map(function (st) {
      return { name: st.name, admission: st.student_id, gradeSection: st.grade + ' ' + st.section, status: 'Active' };
    }) : [];
    var rows = roster.length ? roster.map(function (r) {
      return '<tr><td class="name"><button class="link-btn" data-open-student="' + esc(r.admission) + '">' + esc(r.name) + '</button></td><td class="mono">' + esc(r.admission) + '</td><td>' + esc(r.gradeSection) + '</td><td>' + statusPill(r.status, 'ok') + '</td>' +
        '<td style="text-align:right"><button class="link-btn" data-edit-st="' + esc(r.admission) + '">Edit</button> <button class="link-btn danger" data-del-st="' + esc(r.admission) + '" data-nm="' + esc(r.name) + '">Delete</button></td></tr>';
    }).join('') : '';
    el.innerHTML = '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Student Directory</h3><p class="tl-mod-note">' + (roster.length ? roster.length + ' students · ' : '') + 'this school\'s roster.</p></div>' +
        '<div class="tl-inline-actions"><button class="btn btn-outline btn-sm" data-add-st>+ Add Students</button><button class="btn btn-outline btn-sm" data-merge-here>Merge Students</button></div></div>' +
      (rows ? '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>Name</th><th>Admission #</th><th>Grade/Section</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
            : '<div class="tl-empty">No students yet — add students or import a CSV.</div>') +
      '<div class="tl-inline-link"><button class="link-btn" data-hubtab="issues">This school\'s deletion logs →</button></div></div>';
    el.querySelector('[data-add-st]').addEventListener('click', function () { go('add-students', { school: s.id }); });
    el.querySelector('[data-merge-here]').addEventListener('click', function () { go('merge', { school: s.id }); });
    el.querySelectorAll('[data-open-student]').forEach(function (b) { b.addEventListener('click', function () { go('student', { school: s.id, adm: b.dataset.openStudent }); }); });
    // [data-hubtab] deletion-logs link is wired in place by SCREEN.school.
    el.querySelectorAll('[data-del-st]').forEach(function (b) { b.addEventListener('click', function () {
      gated({ title: 'Delete student', danger: true, typed: 'DELETE', body: '<p>Delete <b>' + esc(b.dataset.nm) + '</b> (' + esc(b.dataset.delSt) + ')? This writes to Deletion Logs.</p>', confirmLabel: 'Delete student', audit: { action: 'student.delete', entity: b.dataset.nm, entityType: 'student', schoolId: s.id }, onConfirm: function () { toast('Student deleted — logged.'); } });
    }); });
    el.querySelectorAll('[data-edit-st]').forEach(function (b) { b.addEventListener('click', function () { openStudentEditor(s.id, b.dataset.editSt, function () { go('school', { id: s.id, tab: 'students' }); }); }); });
  };

  HUB.staff = function (d, el) {
    var s = d.school;
    var staffRows = d.staff_users.length ? d.staff_users.map(function (u) {
      return '<tr><td class="name">' + esc(u.name) + '<small>' + esc(u.email) + '</small></td><td>' + esc(u.role) + '</td>' +
        '<td>' + (u.sections && u.sections.length ? esc(u.sections.join(', ')) : '—') + '</td>' +
        '<td style="text-align:right"><button class="link-btn" data-role="' + esc(u.email) + '">Change role</button> <button class="link-btn danger" data-remove="' + esc(u.name) + '">Remove</button></td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="tl-empty">No staff yet — invite a school admin or teacher.</div></td></tr>';

    var invRows = d.invitations.length ? d.invitations.map(function (i) {
      return '<tr><td class="name">' + esc(i.name) + '<small>' + esc(i.email) + '</small></td><td>' + esc(i.role) + '</td><td>' + invStatusPill(i) + '</td><td>' + esc(i.expires) + '</td>' +
        '<td style="text-align:right"><button class="link-btn" data-resend="' + esc(i.email) + '">Resend</button> <button class="link-btn danger" data-revoke="' + esc(i.email) + '">Revoke</button></td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="tl-empty">No invitations.</div></td></tr>';

    // Teacher self-join: a teacher who enters this school code is auto-added
    // as staff — no per-teacher invite needed. School Admins share it; the
    // explicit invite above stays available for named onboarding.
    var teacherJoin = (s.created && s.joinCode) ? s.joinCode : s.code;
    var joinCode = '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Teacher join code</h3>' +
        '<p class="tl-mod-note">Share with teachers — anyone who enters this code is auto-added to ' + esc(s.name) + ' as a Teacher. No invite required.</p></div></div>' +
      '<div class="tl-linkrow"><div><b>School code</b><span class="mono">' + esc(teacherJoin) + '</span></div>' +
        '<button class="btn btn-outline btn-sm" data-copy="' + esc(teacherJoin) + '">Copy code</button></div></div>';

    // Demo access panel — the exact logins + codes needed to click through the
    // whole flow (coordinator → teacher → parent) for a created school.
    var codesCard = '';
    if (s.created && window.TilliAPI) {
      var teachers = (d.staff_users || []).filter(function (u) { return u.role === 'Teacher'; });
      var tRows = teachers.map(function (u) {
        return '<div class="ws-rev-row"><span>Teacher · ' + esc((u.sections || []).join(', ') || '—') + '</span><b class="mono">' + esc(u.email) + '</b></div>';
      }).join('');
      var claims = (s.claimSamples || window.TilliAPI.studentsForSchool(s.id).slice(0, 6).map(function (st) {
        return { adm: st.student_id, name: st.name, grade: st.grade, section: st.section, claimCode: st.claimCode };
      }));
      var cRows = claims.map(function (c) {
        return '<div class="ws-rev-row"><span>' + esc(c.name) + ' · ' + esc(c.grade + ' ' + c.section) + ' · adm ' + esc(c.adm) + '</span><b class="mono">' + esc(c.claimCode) + '</b></div>';
      }).join('');
      codesCard = '<div class="tl-card" style="margin-bottom:var(--tl-gap)"><div class="tl-mod-h"><div>' +
          '<h3 class="tl-mod-title">Demo access & codes</h3>' +
          '<p class="tl-mod-note">Everything you need to log in as each role for this school (all mock / localStorage). Claim method: <b>code</b>.</p></div></div>' +
        '<div class="ws-review">' +
          '<div class="ws-rev-row"><span><b>Coordinator login</b> (School dashboard)</span><b class="mono">' + esc(s.coordinator ? s.coordinator.email : '—') + '</b></div>' +
          '<div class="ws-rev-row"><span><b>Teacher join code</b></span><b class="mono">' + esc(teacherJoin) + '</b></div>' +
          tRows +
          '<div class="ws-rev-row" style="border-top:1px solid var(--surface-200);margin-top:6px;padding-top:10px"><span><b>Parent claim codes</b> (school = this school, then the code)</span><b></b></div>' +
          cRows +
        '</div></div>';
    }

    el.innerHTML = codesCard + joinCode +
      '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Staff at this school</h3></div><button class="btn btn-outline btn-sm" data-invite>+ Invite to this school</button></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>User</th><th>Role</th><th>Sections</th><th></th></tr></thead><tbody>' + staffRows + '</tbody></table></div></div>' +
      '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><h3 class="tl-mod-title">Invitations</h3></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>Recipient</th><th>Role</th><th>Status</th><th>Expires</th><th></th></tr></thead><tbody>' + invRows + '</tbody></table></div></div>';
    el.querySelector('[data-invite]').addEventListener('click', function () { openInvite(s.id); });
    el.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.dataset.copy, 'School code copied.'); }); });
    el.querySelectorAll('[data-resend]').forEach(function (b) { b.addEventListener('click', function () { ORG.server.logAudit(me.name, 'invitation.resend', b.dataset.resend, 'invitation', s.id); toast('Invitation resent to ' + b.dataset.resend + '.'); }); });
    el.querySelectorAll('[data-revoke]').forEach(function (b) { b.addEventListener('click', function () { gated({ title: 'Revoke invitation', danger: true, body: '<p>Revoke the invitation to <b>' + esc(b.dataset.revoke) + '</b>?</p>', confirmLabel: 'Revoke', audit: { action: 'invitation.revoke', entity: b.dataset.revoke, entityType: 'invitation', schoolId: s.id }, onConfirm: function () { toast('Invitation revoked.'); } }); }); });
    el.querySelectorAll('[data-role]').forEach(function (b) { b.addEventListener('click', function () { openRoleEditor(ORG.users.find(function (u) { return u.email === b.dataset.role; }), function () { go('school', { id: s.id, tab: 'staff' }); }); }); });
    el.querySelectorAll('[data-remove]').forEach(function (b) { b.addEventListener('click', function () { gated({ title: 'Remove from school', danger: true, body: '<p>Remove <b>' + esc(b.dataset.remove) + '</b> from ' + esc(s.name) + '?</p>', confirmLabel: 'Remove', audit: { action: 'user.remove', entity: b.dataset.remove, entityType: 'user', schoolId: s.id }, onConfirm: function () { toast('Removed from school.'); } }); }); });
  };

  // ============================================================
  //  DEPLOYMENT DRILL-DOWN TIMELINE  (school Assessments tab)
  //  Level 1 phases → Level 2 audiences → Level 3 assessment chain.
  //  Phase/audience states are derived LIVE from the school's real
  //  deployments each render (so ending one updates instantly);
  //  the Level-3 chains are synthesised once and then cached, so
  //  drag re-ordering and mode edits persist for the session.
  // ============================================================
  var TL_AUD = [
    { key: 'teacher', label: 'Teacher based', aud: 'Teacher' },
    { key: 'parent', label: 'Parent based', aud: 'Parent' },
    { key: 'direct', label: 'Student Direct', aud: 'Direct Assessment' },
  ];
  var TL_PHASES = ['Baseline', 'Midline', 'Endline'];
  var TL_STATE_LABEL = { completed: 'Completed', inprogress: 'In progress', pending: 'Pending' };
  var TL_MODE = { school: 'Do at school', home: 'Do at home', off: 'Off' };
  var TL_MODE_ORDER = ['school', 'home', 'off'];
  var TL_STATE_ORDER = ['pending', 'inprogress', 'completed'];
  var TL_CHAIN = {};       // sid -> { 'Baseline|teacher': [{id,name,mode}], … }  (edits persist in-session)
  var TL_NAV = {};         // sid -> { level, phase, audience }
  var TL_OVERRIDE = {};    // sid -> { 'Baseline': state, 'Baseline|teacher': state }  (manual taps win over derived)

  function tlNav(sid) { return TL_NAV[sid] || (TL_NAV[sid] = { level: 1, phase: null, audience: null }); }
  function tlStateFrom(deps) {
    if (!deps.length) return 'pending';
    if (deps.some(function (d) { return d.status === 'Live'; })) return 'inprogress';
    if (deps.every(function (d) { return d.status === 'Ended'; })) return 'completed';
    return 'pending';
  }
  // Effective state = a manual tap-override if the user set one, else the state
  // derived live from the school's real deployments.
  function tlEffState(sid, key, derived) { var ov = TL_OVERRIDE[sid]; return (ov && ov[key]) || derived; }
  function tlCycleState(sid, key, cur) { (TL_OVERRIDE[sid] || (TL_OVERRIDE[sid] = {}))[key] = TL_STATE_ORDER[(TL_STATE_ORDER.indexOf(cur) + 1) % 3]; }
  function tlPhaseState(deps, phase) { return tlStateFrom(deps.filter(function (d) { return d.phase === phase; })); }
  function tlAudState(deps, phase, aud) { return tlStateFrom(deps.filter(function (d) { return d.phase === phase && d.audience === aud; })); }
  function tlPool(aud) {
    if (aud === 'Teacher') return ['SEL Observation', 'EF Observation', 'Wellbeing Check', 'Classroom Climate', 'Term Review'];
    if (aud === 'Parent') return ['Home SEL Survey', 'Routines Report', 'Wellbeing Check', 'Screen-time Survey', 'Term Review'];
    return ['EMT 1', 'EMT 2', 'EMT 4', 'Hearts & Flowers', 'Memory Game'];
  }
  // Baseline has a fixed, curated chain per audience (not the randomised pool).
  // Teacher assessments always run at school (no 'home' mode — see tlModeOrder).
  function tlBaselineChain(aud) {
    if (aud === 'Teacher') return [
      { name: 'Pre-training', mode: 'school' },
      { name: 'Post-training', mode: 'school' },
      { name: 'Teacher observational report on student foundational skills', mode: 'school' },
    ];
    if (aud === 'Parent') return [
      { name: 'Home SEL Survey', mode: 'school' },
    ];
    return [
      { name: 'IDELA', mode: 'school' },
      { name: 'Hearts & Flowers', mode: 'home' },
      { name: 'Memory Game', mode: 'off' },
      { name: 'EMT 1', mode: 'off' },
      { name: 'EMT 2', mode: 'off' },
      { name: 'EMT 4', mode: 'off' },
    ];
  }
  // Mode cycle order per audience. Teacher has no 'home' option.
  function tlModeOrder(aud) { return aud === 'Teacher' ? ['school', 'off'] : TL_MODE_ORDER; }
  function tlChain(s, phase, aud, audKey) {
    var byS = TL_CHAIN[s.id] || (TL_CHAIN[s.id] = {}), k = phase + '|' + audKey;
    if (!byS[k]) {
      if (phase === 'Baseline') {
        byS[k] = tlBaselineChain(aud).map(function (it, i) {
          return { id: (phase + audKey + i).toLowerCase().replace(/[^a-z0-9]/g, ''), name: it.name, mode: it.mode };
        });
      } else {
        var rnd = seededRng(strSeed(s.code + '|' + phase + '|' + audKey)), pool = tlPool(aud);
        var n = Math.min(pool.length, 3 + Math.floor(rnd() * 3)); // 3–5
        var out = [];
        for (var i = 0; i < n; i++) out.push({ id: (phase + audKey + i).toLowerCase().replace(/[^a-z0-9]/g, ''), name: pool[i], mode: i === 0 ? 'school' : (i === 1 ? 'home' : 'off') });
        byS[k] = out;
      }
    }
    return byS[k];
  }
  function tlRail(nodes) {
    var n = nodes.length;
    return '<div class="tl-tl-rail"><div class="tl-tl-line" style="left:calc(50% / ' + n + ');right:calc(50% / ' + n + ')"></div>' +
      nodes.map(function (nd) {
        return '<div class="tl-tl-node ' + nd.cls + '"' + (nd.attrs || '') + (nd.draggable ? ' draggable="true"' : '') + '>' +
          '<div class="tl-tl-diamond"' + (nd.mkTitle ? ' title="' + esc(nd.mkTitle) + '"' : '') + '></div><div class="tl-tl-dot"></div>' +
          '<div class="tl-tl-label' + (nd.navLabel ? ' nav' : '') + '"' + (nd.navTitle ? ' title="' + esc(nd.navTitle) + '"' : '') + '>' + esc(nd.label) + (nd.navLabel ? ' <span class="tl-tl-caret">›</span>' : '') + '</div>' +
          (nd.sub ? '<div class="tl-tl-sub">' + esc(nd.sub) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
  }
  function tlLegend(items) { return '<div class="tl-tl-legend">' + items.map(function (it) { return '<span class="' + it[0] + '"><i></i>' + esc(it[1]) + '</span>'; }).join('') + '</div>'; }
  var TL_AUD_SHORT = { teacher: 'Teacher', parent: 'Parent', direct: 'Direct' };
  // ── Deployment planner (bottom of the school Assessments tab) ────────────
  // This is now the single place assessments are configured and deployed.
  // Per phase you set a Start/End window, give School and Home their own
  // schedules, order the assessments inside each mode lane (order matters —
  // it's the sequence they run in), and hit "Deploy phase". Off is the parking
  // lot. The top timeline just reflects the resulting status. Per-item overrides
  // (move / deploy one / end one) live in each row's ⋯ menu. All state is
  // in-session (prototype), mirroring how TL_CHAIN / TL_OVERRIDE already work.
  var TL_PLAN = {};   // sid -> { phase -> { start, end, sched:{school,home}, deployed, byId, order:{school,home,off} } }
  var TL_POP = null;  // the open per-item ⋯ menu, if any

  function tlPlan(s, phase) {
    var byS = TL_PLAN[s.id] || (TL_PLAN[s.id] = {});
    if (!byS[phase]) {
      var byId = {}, order = { school: [], home: [], off: [] };
      TL_AUD.forEach(function (a) {
        tlChain(s, phase, a.aud, a.key).forEach(function (it) {
          byId[it.id] = { id: it.id, name: it.name, aud: a.key, mode: it.mode, live: false };
          (order[it.mode] || order.off).push(it.id);
        });
      });
      byS[phase] = { start: '', end: '', sched: { school: '', home: '' }, deployed: false, byId: byId, order: order };
      // Hydrate from the shared store so a created school's deployed phases
      // survive a reload (the planner's own state is in-session only).
      if (s.created && window.TilliAPI) {
        var deps = window.TilliAPI.getDeployments(s.id).filter(function (x) { return x.phase === phase; });
        if (deps.length) {
          var rec = byS[phase];
          rec.deployed = true;
          if (deps[0].start) rec.start = deps[0].start;
          if (deps[0].end) rec.end = deps[0].end;
          deps.forEach(function (dep) { (dep.assessments || []).forEach(function (a) { if (rec.byId[a.id]) rec.byId[a.id].live = true; }); });
        }
      }
    }
    return byS[phase];
  }

  // Move an item into a mode lane (optionally before another item). Teacher
  // assessments can't run at home — mirrors tlModeOrder in the timeline.
  function planMove(s, phase, id, mode, beforeId) {
    var p = tlPlan(s, phase), it = p.byId[id];
    if (mode === 'home' && it.aud === 'teacher') { toast('Teacher assessments can’t run at home.'); return false; }
    ['school', 'home', 'off'].forEach(function (m) { var i = p.order[m].indexOf(id); if (i > -1) p.order[m].splice(i, 1); });
    var arr = p.order[mode], idx = arr.length;
    if (beforeId != null) { var bi = arr.indexOf(beforeId); if (bi > -1) idx = bi; }
    arr.splice(idx, 0, id); it.mode = mode;
    return true;
  }

  // Persist a phase's running assessments into the shared TilliAPI store, per
  // audience, so the teacher & parent apps surface exactly what's deployed here.
  // Only created schools have a real roster in that store.
  var TL_AUD_LABEL = { teacher: 'Teacher', parent: 'Parent', direct: 'Direct Assessment' };
  function tlPersistDeploy(s, phase) {
    if (!(s.created && window.TilliAPI)) return;
    var p = tlPlan(s, phase), running = p.order.school.concat(p.order.home), byAud = {};
    running.forEach(function (id) { var it = p.byId[id]; (byAud[it.aud] = byAud[it.aud] || []).push({ id: it.id, name: it.name }); });
    Object.keys(TL_AUD_LABEL).forEach(function (k) {
      if (byAud[k] && byAud[k].length) window.TilliAPI.deployPhase(s.id, phase, TL_AUD_LABEL[k], { start: p.start, end: p.end, window: p.start + ' → ' + p.end, assessments: byAud[k] });
      else window.TilliAPI.undeployPhase(s.id, phase, TL_AUD_LABEL[k]);
    });
  }
  function tlPersistUndeploy(s, phase) {
    if (!(s.created && window.TilliAPI)) return;
    Object.keys(TL_AUD_LABEL).forEach(function (k) { window.TilliAPI.undeployPhase(s.id, phase, TL_AUD_LABEL[k]); });
  }
  // Aggregate real completion for a deployed phase across all audiences.
  function tlPhaseCompletion(s, phase) {
    if (!(s.created && window.TilliAPI)) return null;
    var ids = window.TilliAPI.studentsForSchool(s.id).map(function (x) { return x.student_id; });
    var done = 0, exp = 0;
    Object.keys(TL_AUD_LABEL).forEach(function (k) { var c = window.TilliAPI.completionStats(s.id, phase, TL_AUD_LABEL[k], ids); done += c.done; exp += c.expected; });
    return exp ? Math.round(done * 100 / exp) : 0;
  }

  function planPhaseCard(s, phase) {
    var p = tlPlan(s, phase);
    var running = p.order.school.length + p.order.home.length, parked = p.order.off.length;
    var ready = running > 0 && p.start && p.end && !p.deployed;
    var deployBtn = p.deployed
      ? '<button class="btn btn-outline btn-sm" data-undeploy="' + esc(phase) + '">Undeploy</button>'
      : '<button class="btn btn-primary btn-sm" data-deploy="' + esc(phase) + '"' +
        (ready ? '' : ' disabled title="Set a start &amp; end date and keep at least one assessment on"') + '>Deploy phase</button>';
    var statusPill = p.deployed
      ? '<span class="dep-status is-deployed" title="This phase is live — its assessments have been deployed to the school">● Deployed</span>'
      : '<span class="dep-status is-draft" title="Not yet deployed — configure and hit Deploy phase to send it to the school">○ Not deployed</span>';
    var comp = p.deployed ? tlPhaseCompletion(s, phase) : null;
    var compPill = comp != null ? '<span class="dep-phase-sum" title="Live completion across teacher/parent/student assessments">' + comp + '% complete</span>' : '';
    var head = '<div class="dep-phase-head">' +
      '<span class="dep-phase-name">' + esc(phase) + '</span>' +
      statusPill +
      '<span class="dep-phase-sum">' + running + ' running · ' + parked + ' off</span>' + compPill +
      '<span class="dep-dates">' +
        '<input type="date" class="dep-date" data-date="' + esc(phase) + '|start" value="' + esc(p.start) + '" aria-label="' + esc(phase) + ' start date">' +
        '<span class="dep-date-sep">→</span>' +
        '<input type="date" class="dep-date" data-date="' + esc(phase) + '|end" value="' + esc(p.end) + '" aria-label="' + esc(phase) + ' end date">' +
      '</span>' + deployBtn + '</div>';
    var lanes = TL_MODE_ORDER.map(function (mode) {
      var ids = p.order[mode], off = mode === 'off';
      var sched = off ? '' :
        '<button class="dep-sched" data-sched="' + esc(phase) + '|' + mode + '" title="When ' + esc(TL_MODE[mode]) + ' assessments run">🕘 ' + esc(p.sched[mode] || 'Set schedule') + '</button>';
      var nodes = ids.map(function (id, idx) {
        var it = p.byId[id];
        return '<div class="dep-node md-' + mode + (it.live ? ' is-live' : '') + '" draggable="true" data-item="' + esc(id) + '">' +
          (off ? '' : '<span class="dep-ord">' + (idx + 1) + '</span>') +
          '<span class="dep-node-name">' + esc(it.name) + '</span>' +
          '<span class="dep-aud-tag aud-' + it.aud + '">' + esc(TL_AUD_SHORT[it.aud]) + '</span>' +
          (it.live ? '<span class="dep-live-dot" title="Deployed">●</span>' : '') +
          '<button class="dep-item-menu" data-menu="' + esc(id) + '" aria-label="Move or deploy this assessment">⋯</button>' +
        '</div>';
      }).join('');
      var empty = '<span class="dep-lane-empty">' + (off ? 'Nothing turned off' : 'Drag assessments here') + '</span>';
      return '<div class="dep-lane' + (off ? ' dep-lane--off' : '') + '" data-lane="' + esc(phase) + '|' + mode + '">' +
        '<div class="dep-lane-head"><span class="dep-mode-tag md-' + mode + '">' + esc(off ? 'Off' : TL_MODE[mode]) + '</span>' + sched + '</div>' +
        '<div class="dep-lane-items">' + (nodes || empty) + '</div></div>';
    }).join('');
    return '<div class="dep-phase' + (p.deployed ? ' is-deployed' : '') + '" data-phase="' + esc(phase) + '">' + head + lanes + '</div>';
  }

  function renderPlanner(d, mount) {
    if (!mount) return;
    var s = d.school;
    mount.innerHTML = TL_PHASES.map(function (phase) { return planPhaseCard(s, phase); }).join('');
    wirePlanner(d, mount);
  }

  function closeItemMenu() { if (TL_POP) { TL_POP.remove(); TL_POP = null; } document.removeEventListener('mousedown', onPopOutside); }
  function onPopOutside(e) { if (TL_POP && !TL_POP.contains(e.target)) closeItemMenu(); }
  function refreshPlanner(d) {
    closeItemMenu();
    var pm = document.getElementById('dep-planner'); if (pm) renderPlanner(d, pm);
    var tw = document.getElementById('dep-timeline'); if (tw) renderDeploymentTimeline(d, tw);
  }

  function openItemMenu(btn, d, s, phase, id) {
    closeItemMenu();
    var p = tlPlan(s, phase), it = p.byId[id];
    var moves = [['school', 'Do at school'], ['home', 'Do at home'], ['off', 'Turn off']].map(function (o) {
      var dis = (o[0] === it.mode) || (o[0] === 'home' && it.aud === 'teacher');
      return '<button type="button" data-mv="' + o[0] + '"' + (dis ? ' disabled' : '') + '><i class="dep-swatch md-' + o[0] + '"></i>' + o[1] + '</button>';
    }).join('');
    var override = it.live
      ? '<button type="button" class="danger" data-live="0">End this assessment</button>'
      : '<button type="button" data-live="1"' + (it.mode === 'off' ? ' disabled' : '') + '>Deploy this one now</button>';
    var pop = document.createElement('div');
    pop.className = 'dep-pop';
    pop.innerHTML = '<div class="dep-pop-h">' + esc(it.name) + '</div>' + moves + '<div class="dep-pop-sep"></div>' + override;
    document.body.appendChild(pop);
    TL_POP = pop;
    var r = btn.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, window.scrollX + r.right - pop.offsetWidth) + 'px';
    pop.addEventListener('click', function (e) {
      var mv = e.target.closest('[data-mv]'), lv = e.target.closest('[data-live]');
      if (mv && !mv.hasAttribute('disabled')) { planMove(s, phase, id, mv.dataset.mv); refreshPlanner(d); }
      else if (lv && !lv.hasAttribute('disabled')) { it.live = lv.dataset.live === '1'; refreshPlanner(d); }
    });
    setTimeout(function () { document.addEventListener('mousedown', onPopOutside); }, 0);
  }

  function wirePlanner(d, mount) {
    var s = d.school, dragId = null;

    mount.querySelectorAll('.dep-date').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var parts = inp.dataset.date.split('|'); tlPlan(s, parts[0])[parts[1]] = inp.value; renderPlanner(d, mount);
      });
    });
    mount.querySelectorAll('[data-sched]').forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = b.dataset.sched.split('|'), p = tlPlan(s, parts[0]), mode = parts[1];
        var val = prompt('When do “' + TL_MODE[mode] + '” assessments run for ' + parts[0] + '?\n(e.g. “Mon & Wed, 9–10am” or “Week of 4 Aug”)', p.sched[mode] || '');
        if (val !== null) { p.sched[mode] = val.trim(); renderPlanner(d, mount); }
      });
    });
    mount.querySelectorAll('[data-deploy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var phase = b.dataset.deploy, p = tlPlan(s, phase), n = p.order.school.length + p.order.home.length;
        gated({ title: 'Deploy ' + phase, confirmLabel: 'Deploy phase',
          body: '<p>Deploy <b>' + n + '</b> assessment' + (n === 1 ? '' : 's') + ' for <b>' + esc(phase) + '</b> (' + esc(p.start) + ' → ' + esc(p.end) + ')?</p>' +
                '<p class="tl-muted">School &amp; Home assessments go live on their set schedules, in the order shown. Off assessments are skipped.</p>',
          audit: { action: 'phase.deploy', entity: phase, entityType: 'phase', schoolId: s.id },
          onConfirm: function () {
            p.deployed = true;
            p.order.school.concat(p.order.home).forEach(function (id) { p.byId[id].live = true; });
            (TL_OVERRIDE[s.id] || (TL_OVERRIDE[s.id] = {}))[phase] = 'inprogress';   // reflect in top timeline
            tlPersistDeploy(s, phase);   // → teacher/parent apps now see these assessments
            refreshPlanner(d); toast(phase + ' deployed.');
          } });
      });
    });
    mount.querySelectorAll('[data-undeploy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var phase = b.dataset.undeploy, p = tlPlan(s, phase);
        p.deployed = false; Object.keys(p.byId).forEach(function (id) { p.byId[id].live = false; });
        var ov = TL_OVERRIDE[s.id]; if (ov) delete ov[phase];
        tlPersistUndeploy(s, phase);
        refreshPlanner(d); toast(phase + ' returned to draft.');
      });
    });
    mount.querySelectorAll('[data-menu]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); openItemMenu(b, d, s, b.closest('[data-phase]').dataset.phase, b.dataset.menu); });
    });

    // Drag to reorder within a lane, or across lanes to change where it runs.
    mount.querySelectorAll('.dep-node[draggable="true"]').forEach(function (nd) {
      nd.addEventListener('dragstart', function (e) { dragId = nd.dataset.item; nd.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (e2) {} });
      nd.addEventListener('dragend', function () { nd.classList.remove('dragging'); dragId = null; mount.querySelectorAll('.dep-lane.dragover').forEach(function (l) { l.classList.remove('dragover'); }); });
    });
    mount.querySelectorAll('.dep-lane').forEach(function (lane) {
      lane.addEventListener('dragover', function (e) { e.preventDefault(); lane.classList.add('dragover'); e.dataTransfer.dropEffect = 'move'; });
      lane.addEventListener('dragleave', function (e) { if (!lane.contains(e.relatedTarget)) lane.classList.remove('dragover'); });
      lane.addEventListener('drop', function (e) {
        e.preventDefault(); lane.classList.remove('dragover');
        if (!dragId) return;
        var parts = lane.dataset.lane.split('|'), phase = parts[0], mode = parts[1], before = null;
        var nodes = [].slice.call(lane.querySelectorAll('.dep-node[data-item]'));
        for (var i = 0; i < nodes.length; i++) { var r = nodes[i].getBoundingClientRect(); if (e.clientX < r.left + r.width / 2) { before = nodes[i].dataset.item; break; } }
        if (before === dragId) before = null;
        if (planMove(s, phase, dragId, mode, before)) renderPlanner(d, mount);
      });
    });
  }

  // Top timeline is now status-only (Phases → Audiences). Where each
  // assessment runs — School / Home / Off — and the deploy action live in the
  // planner below (renderPlanner), so there is a single place to configure.
  function renderDeploymentTimeline(d, mount) {
    var s = d.school, deps = d.deployments, nav = tlNav(s.id);
    if (nav.level > 2) nav.level = 2;   // level 3 (assessment editing) moved to the planner
    var crumbs, note, rail, legend;

    if (nav.level === 1) {
      crumbs = '<span class="cur">Program phases</span>';
      note = 'Tap a diamond to change a phase’s status · tap the name to see its audiences. Set where assessments run below.';
      rail = tlRail(TL_PHASES.map(function (p) {
        var st = tlEffState(s.id, p, tlPhaseState(deps, p));
        return { label: p, sub: TL_STATE_LABEL[st], cls: 'st-' + st + ' clickable', attrs: ' data-phase="' + p + '"',
          mkTitle: 'Tap to change status', navLabel: true, navTitle: 'Open ' + p + ' audiences' };
      }));
      legend = tlLegend([['completed', 'Completed'], ['inprogress', 'In progress'], ['pending', 'Pending']]);
    } else {
      crumbs = '<button data-tlup="1">Program phases</button><span class="sep">›</span><span class="cur">' + esc(nav.phase) + '</span>';
      note = 'Status per audience for ' + esc(nav.phase) + '. Configure & deploy this phase below.';
      rail = tlRail(TL_AUD.map(function (a) {
        var key = nav.phase + '|' + a.key, st = tlEffState(s.id, key, tlAudState(deps, nav.phase, a.aud)), ch = tlChain(s, nav.phase, a.aud, a.key);
        return { label: a.label, sub: ch.length + ' assessment' + (ch.length === 1 ? '' : 's'), cls: 'aud st-' + st + ' clickable', attrs: ' data-aud="' + a.key + '"',
          mkTitle: 'Tap to change status' };
      }));
      legend = tlLegend([['active', 'Active audience'], ['completed', 'Completed'], ['inprogress', 'In progress'], ['pending', 'Pending']]);
    }

    mount.innerHTML = '<div class="tl-tl"><div class="tl-tl-crumbs">' + crumbs + '</div><p class="tl-tl-note">' + note + '</p>' + rail + legend + '</div>';

    mount.querySelectorAll('[data-tlup]').forEach(function (b) { b.addEventListener('click', function () { nav.level = +b.dataset.tlup; renderDeploymentTimeline(d, mount); }); });
    // Phases (L1): diamond cycles status, name opens the audience status view.
    mount.querySelectorAll('[data-phase]').forEach(function (nd) {
      var p = nd.dataset.phase;
      nd.querySelector('.tl-tl-diamond').addEventListener('click', function () { tlCycleState(s.id, p, tlEffState(s.id, p, tlPhaseState(deps, p))); renderDeploymentTimeline(d, mount); });
      nd.querySelector('.tl-tl-label').addEventListener('click', function () { nav.level = 2; nav.phase = p; renderDeploymentTimeline(d, mount); });
    });
    // Audiences (L2): diamond cycles status. Assessment-level config is in the planner.
    mount.querySelectorAll('[data-aud]').forEach(function (nd) {
      var akey = nd.dataset.aud, adef = TL_AUD.filter(function (x) { return x.key === akey; })[0], key = nav.phase + '|' + akey;
      nd.querySelector('.tl-tl-diamond').addEventListener('click', function () { tlCycleState(s.id, key, tlEffState(s.id, key, tlAudState(deps, nav.phase, adef.aud))); renderDeploymentTimeline(d, mount); });
    });
  }

  HUB.assessments = function (d, el) {
    var s = d.school;

    var links = ['Parent', 'Teacher', 'Direct Assessment'].map(function (kind) {
      var url = 'https://measures.tilli.app/' + s.code.toLowerCase() + '/' + kind.toLowerCase().replace(/\s+/g, '-');
      return '<div class="tl-linkrow"><div><b>' + esc(kind) + '</b><span class="mono">' + esc(url) + '</span></div><button class="btn btn-outline btn-sm" data-copy="' + esc(url) + '">Copy Link</button></div>';
    }).join('');

    el.innerHTML = '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Deployments</h3></div>' +
        '<div class="tl-inline-actions">' +
          '<button class="btn btn-outline btn-sm" data-studentlog title="Per-student status (Completed / In Progress / Not Started) for every student-facing assessment deployed to this school — one row per student, one column per assessment.">Student assessment log</button>' +
          '<button class="btn btn-outline btn-sm" data-newdep>+ New deployment</button></div></div>' +
        '<div id="dep-timeline"></div>' +
        '<div class="dep-chains" id="dep-planner"></div></div>' +
      '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Master Links</h3><p class="tl-mod-note">Per-school hub links. Same data as Deployments → Master Links.</p></div></div>' + links +
        '<div style="margin-top:14px"><button class="btn btn-outline btn-sm" data-dlcsv>Download this school\'s results (CSV)</button></div></div>' +
      '<div id="hub-studentlog"></div>';
    el.querySelector('[data-newdep]').addEventListener('click', function () { openNewDeployment(s.id, true); });
    renderDeploymentTimeline(d, el.querySelector('#dep-timeline'));
    renderPlanner(d, el.querySelector('#dep-planner'));
    var slBtn = el.querySelector('[data-studentlog]'), slMount = el.querySelector('#hub-studentlog');
    slBtn.addEventListener('click', function () {
      if (slMount.innerHTML) { slMount.innerHTML = ''; slBtn.textContent = 'Student assessment log'; slBtn.classList.remove('on'); return; }
      renderStudentAssessmentLog(d, slMount);
      slBtn.textContent = 'Hide student assessment log'; slBtn.classList.add('on');
      slMount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    el.querySelector('[data-dlcsv]').addEventListener('click', function () {
      var rows = ORG.results.filter(function (r) { return r.schoolId === s.id; });
      downloadCsv(s.code.toLowerCase() + '-results.csv', ['Assessment', 'Phase', 'Audience', 'Responses', 'Expected', 'Completion %', 'Status', 'Updated'],
        rows.map(function (r) { return [r.assessment, r.phase, r.audience, r.responses, r.expected, r.completion, r.status, r.updated]; }));
    });
    el.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.dataset.copy); }); });
    el.querySelectorAll('[data-end]').forEach(function (b) { b.addEventListener('click', function () {
      var dep = d.deployments.find(function (x) { return x.id === b.dataset.end; }); if (!dep || dep.status === 'Ended') return;
      gated({ title: 'End deployment', danger: true, body: '<p>End <b>' + esc(dep.assessment) + '</b> now? Its window closes immediately.</p>', confirmLabel: 'End deployment', audit: { action: 'deployment.end', entity: dep.assessment, entityType: 'deployment', schoolId: s.id }, onConfirm: function () { ORG.server.endDeployment(dep.id); toast('Deployment ended.'); go('school', { id: s.id, tab: 'assessments' }); } });
    }); });
  };

  HUB.issues = function (d, el) {
    var s = d.school;
    var iRows = d.issues.length ? d.issues.map(function (i) {
      return '<tr><td class="name">' + esc(i.reporter) + '<small>' + esc(i.role) + '</small></td><td>' + esc(i.page) + '</td><td>' + esc(i.device) + '</td><td>' + esc(i.date) + '</td><td>' + issueStatusPill(i.status) + '</td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="tl-empty">No issues for this school.</div></td></tr>';
    var dRows = d.deletions.length ? d.deletions.map(function (x) {
      return '<tr><td>' + esc(x.deletedAt) + '</td><td class="name">' + esc(x.studentName) + '<small class="mono">' + esc(x.code) + '</small></td><td>' + esc(x.gradeSection) + '</td><td>' + esc(x.deletedBy) + '</td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="tl-empty">No deletions for this school.</div></td></tr>';
    el.innerHTML = '<div class="tl-card"><div class="tl-mod-h"><h3 class="tl-mod-title">Issue reports</h3></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>Reporter</th><th>Page</th><th>Device</th><th>Date</th><th>Status</th></tr></thead><tbody>' + iRows + '</tbody></table></div></div>' +
      '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><h3 class="tl-mod-title">Deletion logs</h3></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:560px"><thead><tr><th>Deleted at</th><th>Student</th><th>Grade/Section</th><th>Deleted by</th></tr></thead><tbody>' + dRows + '</tbody></table></div></div>';
  };

  HUB.settings = function (d, el) {
    var s = d.school;
    el.innerHTML = '<div class="tl-card"><div class="tl-mod-h"><h3 class="tl-mod-title">Settings</h3></div>' +
      '<div class="tl-settings"><button class="btn btn-outline block" data-set="profile">Edit profile</button>' +
      '<button class="btn btn-outline block" data-set="grades">Manage grades / sections</button>' +
      '<button class="btn btn-outline block" data-set="group">Group assignment</button>' +
      '<button class="btn btn-danger block" data-set="archive">' + (s.archived ? 'Un-archive school' : 'Archive school') + '</button>' +
      (s.archived ? '<button class="btn btn-danger block" data-set="delete">Delete school</button>' : '') + '</div>' +
      '<p class="tl-muted" style="margin-top:12px">As Super Admin you have full access — every action here runs and is written to the audit trail. A role layer can restrict these later.</p></div>';
    el.querySelectorAll('[data-set]').forEach(function (b) { b.addEventListener('click', function () {
      var k = b.dataset.set;
      if (k === 'archive') archiveSchool(s);
      else if (k === 'delete') deleteSchool(s);
      else if (k === 'grades') openStructureEditor(s);
      else openSchoolEditor(s); // profile + group assignment both live in the school editor
    }); });
  };

  // ============================================================
  //  STUDENT REPORT  (skill scores · multi-perspective · 5-yr progress)
  //  Only the one live-wired school (window.TILLI_SCHOOL) carries real
  //  per-student skill data; the report reads it straight off the student.
  // ============================================================
  var STUDENT_TABS = [
    { key: 'skills', label: 'Skill Scores' },
    { key: 'perspective', label: 'Multi-Perspective Report' },
    { key: 'progress', label: 'Progress (5-year)' },
  ];
  // Plain-language descriptions for the 12 measured skills.
  var SKILL_DESC = {
    emotion_awareness: 'Recognizing and understanding emotions in self and others',
    emotion_regulation: 'Managing and controlling emotional responses',
    empathy: 'Understanding and sharing the feelings of others',
    relationship_skills: 'Building and maintaining healthy relationships',
    metacognition: "Thinking about one's own thinking and learning processes",
    critical_thinking: 'Analyzing and evaluating information to form judgments',
    working_memory: 'Holding and manipulating information in mind',
    planning: 'Setting goals and organizing steps to achieve them',
    cognitive_flexibility: 'Adapting thinking to new or changing situations',
    inhibition_distraction: 'Resisting distractions and maintaining focus',
    inhibition_response: 'Controlling impulsive responses and actions',
    attention: 'Sustaining focus on tasks and filtering distractions',
  };
  // Score → proficiency level. Thresholds mirror the garden bands (34 / 67).
  function skillLevel(p) {
    if (p < 34) return { label: 'Beginner', tone: 'danger' };
    if (p < 67) return { label: 'Learner', tone: 'warn' };
    if (p < 85) return { label: 'Proficient', tone: 'sched' };
    return { label: 'Advanced', tone: 'ok' };
  }
  function gapStatus(g) {
    if (g <= 10) return { label: 'Aligned', tone: 'ok', mark: '↗' };
    if (g <= 30) return { label: 'Moderate', tone: 'muted', mark: '–' };
    return { label: 'High Gap', tone: 'danger', mark: '⚠' };
  }
  var SR_ICON = {
    heart: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#E1543E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    brain: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 5 2V4.5A1.5 1.5 0 0 0 9 3z"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-5 2V4.5A1.5 1.5 0 0 1 15 3z"/></svg>',
  };
  var SR_PERSP = [
    { key: 'teacher', label: 'Teacher', color: '#4A90D9' },
    { key: 'parent', label: 'Parent', color: '#56C02B' },
    { key: 'student', label: 'Student Direct', color: '#F0A84A' },
  ];

  SCREEN.student = function (params, body) {
    var s = ORG.byId(params.school);
    var stu = (TS && TS.findByAdm) ? TS.findByAdm(params.adm) : null;
    if (!s || !stu) { body.innerHTML = '<div class="tl-empty">Student report is only available for schools with a live-wired roster.</div>'; return; }
    var tab = params.tab && STUDENT_TABS.some(function (t) { return t.key === params.tab; }) ? params.tab : 'skills';

    var crumbParts = [{ label: 'All Schools', screen: 'schools' }];
    if (s.groupId && s.groupId !== 'g-none') crumbParts.push({ label: s.groupName, screen: 'group', params: { id: s.groupId } });
    crumbParts.push({ label: s.name, screen: 'school', params: { id: s.id, tab: 'students' } });
    crumbParts.push({ label: stu.name });

    var sel = stu.skills.filter(function (k) { return k.group === 'sel'; });
    var cog = stu.skills.filter(function (k) { return k.group === 'cog'; });

    body.innerHTML = crumbs(crumbParts) +
      '<div class="tl-hub-head"><div><h1 class="tl-screen-title" style="margin-bottom:4px">' + esc(stu.name) + '</h1>' +
        '<p class="tl-screen-sub" style="margin:0"><span class="mono">' + esc(stu.adm) + '</span> · ' + esc(stu.grade + ' ' + stu.section) + ' · ' + esc(s.name) + (stu.teacherName ? ' · Teacher: ' + esc(stu.teacherName) : '') + '</p></div>' +
        '<div class="tl-hub-actions"><div class="tl-kpi" style="min-width:120px"><div class="num">' + pct(stu.overallPct) + '%</div><div class="lbl">Overall skill score</div></div></div></div>' +
      '<div class="tl-tabs hub">' + STUDENT_TABS.map(function (t) {
        return '<button class="tl-tab' + (t.key === tab ? ' on' : '') + '" data-sttab="' + t.key + '">' + esc(t.label) + '</button>';
      }).join('') + '</div>' +
      '<div id="st-tab"></div>';

    var host = document.getElementById('st-tab');
    if (tab === 'skills') host.innerHTML = srSkillsTab(sel, cog);
    else if (tab === 'perspective') host.innerHTML = srPerspectiveTab(stu);
    else host.innerHTML = srProgressTab(stu);

    wireCrumbs(body);
    body.querySelectorAll('[data-sttab]').forEach(function (b) { b.addEventListener('click', function () { go('student', { school: s.id, adm: stu.adm, tab: b.dataset.sttab }); }); });
  };

  function srSkillRow(k) {
    var lv = skillLevel(k.pct);
    return '<div class="sr-skill"><div class="sr-sk-body"><div class="sr-sk-name">' + esc(k.name) + '</div>' +
      '<div class="sr-sk-desc">' + esc(SKILL_DESC[k.key] || '') + '</div></div>' +
      '<div class="sr-sk-pct">' + pct(k.pct) + '%</div>' + statusPill(lv.label, lv.tone) + '</div>';
  }
  function srSkillsTab(sel, cog) {
    return '<div class="tl-grid two">' +
      '<div class="tl-card"><div class="sr-secthead">' + SR_ICON.heart + '<h3>Social-Emotional Learning</h3></div>' + sel.map(srSkillRow).join('') + '</div>' +
      '<div class="tl-card"><div class="sr-secthead">' + SR_ICON.brain + '<h3>Cognitive Skills</h3></div>' + cog.map(srSkillRow).join('') + '</div></div>';
  }

  function srPerspectiveTab(stu) {
    var axes = stu.skills.map(function (k) { return k.name; });
    var series = SR_PERSP.map(function (p) { return { label: p.label, color: p.color, values: stu.skills.map(function (k) { return k[p.key]; }) }; });
    var legend = '<div class="sr-legend">' + SR_PERSP.map(function (p) { return '<span><i style="background:' + p.color + '"></i>' + esc(p.label) + '</span>'; }).join('') + '</div>';

    var gapRows = stu.skills.map(function (k) {
      var st = gapStatus(k.gap);
      return '<tr><td class="name">' + esc(k.name) + '</td><td class="tl-num">' + k.teacher + '%</td><td class="tl-num">' + k.parent + '%</td>' +
        '<td class="tl-num">' + k.student + '%</td><td class="tl-num">' + k.gap + '%</td><td>' + statusPill(st.mark + ' ' + st.label, st.tone) + '</td></tr>';
    }).join('');

    return '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Multi-perspective view</h3>' +
        '<p class="tl-mod-note">The same skills rated by teacher, parent and the child directly — the gaps between them are often the most useful part.</p></div></div>' +
        '<div class="sr-radar-wrap">' + srRadar(axes, series) + legend + '</div></div>' +
      '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Gap Analysis</h3>' +
        '<p class="tl-mod-note">Discrepancies between perspectives — large gaps may indicate areas needing attention.</p></div></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>Skill</th><th>Teacher</th><th>Parent</th><th>Student Direct</th><th>Gap</th><th>Status</th></tr></thead><tbody>' + gapRows + '</tbody></table></div></div>';
  }

  // Radar: n axes, m series (values 0–100).
  function srRadar(axes, series) {
    var W = 640, H = 470, cx = W / 2, cy = H / 2, R = 150, n = axes.length;
    function ang(i) { return -Math.PI / 2 + i * 2 * Math.PI / n; }
    function pt(i, val) { var a = ang(i), r = R * (Math.max(0, Math.min(100, val)) / 100); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:560px" role="img" aria-label="Multi-perspective radar across skills">';
    [25, 50, 75, 100].forEach(function (g) {
      var p = []; for (var i = 0; i < n; i++) { var q = pt(i, g); p.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      svg += '<polygon points="' + p.join(' ') + '" fill="none" stroke="#E4E6EC" stroke-width="1"/>';
    });
    for (var i = 0; i < n; i++) {
      var edge = pt(i, 100);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + edge[0].toFixed(1) + '" y2="' + edge[1].toFixed(1) + '" stroke="#EDEEF2" stroke-width="1"/>';
      var a = ang(i), lr = R + 20, lx = cx + lr * Math.cos(a), ly = cy + lr * Math.sin(a);
      var anchor = Math.abs(lx - cx) < 10 ? 'middle' : (lx < cx ? 'end' : 'start');
      svg += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '" dominant-baseline="middle" font-size="10.5" fill="#6B7180">' + esc(axes[i]) + '</text>';
    }
    series.forEach(function (ser) {
      var p = []; for (var j = 0; j < n; j++) { var q = pt(j, ser.values[j]); p.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      svg += '<polygon points="' + p.join(' ') + '" fill="' + ser.color + '" fill-opacity="0.13" stroke="' + ser.color + '" stroke-width="2" stroke-linejoin="round"/>';
    });
    return svg + '</svg>';
  }

  // 5-year progress: real data gives only in-year points, so trajectories are
  // synthesised (seeded by admission #) ending at the child's current averages.
  function srProgressTab(stu) {
    var selNow = Math.round(avg(stu.skills.filter(function (k) { return k.group === 'sel'; }).map(function (k) { return k.pct; })));
    var cogNow = Math.round(avg(stu.skills.filter(function (k) { return k.group === 'cog'; }).map(function (k) { return k.pct; })));
    var years = 5, endYear = 2026;
    var labels = []; for (var y = 0; y < years; y++) labels.push(String(endYear - (years - 1) + y));
    function traj(end, tag) {
      var r = seededRng(strSeed(stu.adm + tag));
      var start = Math.max(6, end - (18 + Math.floor(r() * 22))), out = [];
      for (var i = 0; i < years; i++) { var t = i / (years - 1), base = start + (end - start) * t, jit = (r() - 0.5) * 8; out.push(i === years - 1 ? end : Math.round(Math.max(2, Math.min(100, base + jit)))); }
      return out;
    }
    var seriesList = [
      { label: 'Social-Emotional', color: '#56C02B', values: traj(selNow, ':sel5') },
      { label: 'Cognitive', color: '#4A90D9', values: traj(cogNow, ':cog5') },
    ];
    var legend = '<div class="sr-legend">' + seriesList.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.label) + '</span>'; }).join('') + '</div>';
    return '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Progress over time</h3>' +
      '<p class="tl-mod-note">' + esc(stu.name.split(' ')[0]) + '\'s social-emotional and cognitive averages across ' + years + ' years in the programme. The most recent point is the current score.</p></div></div>' +
      srLineChart(seriesList, labels) + legend + '</div>';
  }
  function srLineChart(seriesList, xLabels) {
    var W = 760, H = 300, padL = 34, padR = 16, padT = 14, padB = 32, n = xLabels.length;
    var iw = W - padL - padR, ih = H - padT - padB;
    function X(i) { return padL + iw * (n === 1 ? 0.5 : i / (n - 1)); }
    function Y(v) { return padT + ih * (1 - Math.max(0, Math.min(100, v)) / 100); }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Progress over five years">';
    [0, 25, 50, 75, 100].forEach(function (g) {
      var y = Y(g).toFixed(1);
      svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#EDEEF2"/>' +
        '<text x="' + (padL - 6) + '" y="' + (Y(g) + 3).toFixed(1) + '" text-anchor="end" font-size="10" fill="#9AA0AC">' + g + '</text>';
    });
    xLabels.forEach(function (lb, i) { svg += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10.5" fill="#6B7180">' + esc(lb) + '</text>'; });
    seriesList.forEach(function (ser) {
      var dpath = ser.values.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
      svg += '<path d="' + dpath + '" fill="none" stroke="' + ser.color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      ser.values.forEach(function (v, i) { svg += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.6" fill="#fff" stroke="' + ser.color + '" stroke-width="2"/>'; });
    });
    return svg + '</svg>';
  }
  function avg(arr) { return arr.length ? arr.reduce(function (a, x) { return a + x; }, 0) / arr.length : 0; }

  // ============================================================
  //  MERGE STUDENTS  (spec §4.3)
  // ============================================================
  var mergeSel = { master: null, dup: null };
  SCREEN.merge = function (params, body) {
    var suggested = ORG.duplicates.slice();
    var scopeId = params.school || '';
    if (scopeId) suggested = suggested.filter(function (d) { return d.schoolId === scopeId; });

    var suggHtml = suggested.length ? suggested.map(function (d, i) {
      var sc = ORG.byId(d.schoolId);
      return '<div class="tl-sugg"><div class="tl-sugg-body"><div class="ss-title">' + esc(d.master.name) + ' <span class="ss-vs">↔</span> ' + esc(d.duplicate.name) + '</div>' +
        '<div class="ss-meta">' + (sc ? esc(sc.name) + ' · ' : '') + (d.reason === 'same-admission' ? 'Same admission #' : 'Same name (normalised)') + '</div></div>' +
        '<button class="btn btn-outline btn-sm" data-review="' + i + '">Review →</button></div>';
    }).join('') : '<div class="tl-empty">No duplicate suggestions' + (scopeId ? ' for this school' : '') + '. 🌱</div>';

    var history = ORG.mergeHistory.map(function (h) {
      var sc = ORG.byId(h.schoolId);
      var smell = h.relinked === 0 ? ' <span class="tl-smell" title="No assessment data moved — possible no-op or mistaken merge">0 re-linked</span>' : '';
      return '<tr><td>' + esc(h.date) + '</td><td>' + (sc ? esc(sc.name) : '—') + '</td><td class="name">' + esc(h.master) + '</td><td>' + esc(h.duplicate) + '</td><td class="tl-num">' + h.relinked + smell + '</td><td class="tl-num">' + h.skipped + '</td></tr>';
    }).join('');

    var sc = scopeId ? ORG.byId(scopeId) : null;
    body.innerHTML = (sc ? crumbs([{ label: 'All Schools', screen: 'schools' }, { label: sc.name, screen: 'school', params: { id: sc.id, tab: 'students' } }, { label: 'Merge Students' }]) : '') +
      screenHead('Merge Students', 'Deduplicate profiles. Suggestions never auto-merge — always confirm.' + (sc ? ' Scoped to ' + sc.name + '.' : '')) +
      '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Suggested duplicates</h3><p class="tl-mod-note">Same admission # or same normalised name within a school.</p></div></div>' + suggHtml + '</div>' +
      '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Merge history</h3><p class="tl-mod-note">Rows marked <span class="tl-smell">0 re-linked</span> moved no assessment data.</p></div></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>Date</th><th>School</th><th>Master (kept)</th><th>Duplicate (deleted)</th><th>Re-linked</th><th>Skipped</th></tr></thead><tbody>' + history + '</tbody></table></div></div>';

    wireCrumbs(body);
    body.querySelectorAll('[data-review]').forEach(function (b) { b.addEventListener('click', function () { openMergeReview(suggested[+b.dataset.review]); }); });
  };

  function diffRow(label, a, b) {
    var same = String(a).toLowerCase().replace(/\s+/g, '') === String(b).toLowerCase().replace(/\s+/g, '');
    return '<tr class="' + (same ? '' : 'diff') + '"><th>' + esc(label) + '</th><td>' + esc(a) + '</td><td>' + esc(b) + '</td></tr>';
  }
  function openMergeReview(d) {
    var sc = ORG.byId(d.schoolId);
    var body = '<p class="tl-muted">Master (kept) on the left, duplicate (deleted) on the right. Confirm they are the same child. <span class="tl-gated">gated</span></p>' +
      '<div class="tl-tablewrap"><table class="tl-difftable"><thead><tr><th></th><th>Master · kept</th><th>Duplicate · deleted</th></tr></thead><tbody>' +
        diffRow('Name', d.master.name, d.duplicate.name) +
        diffRow('Admission #', d.master.admission, d.duplicate.admission) +
        diffRow('Grade/Section', d.master.gradeSection, d.duplicate.gradeSection) +
        diffRow('Assessments', d.master.assessments, d.duplicate.assessments) +
      '</tbody></table></div>';
    openModal('Review merge · ' + (sc ? sc.name : ''), body, function (close) {
      close();
      gated({ title: 'Confirm merge', danger: true, typed: 'MERGE',
        body: '<p>Re-link <b>' + esc(d.duplicate.name) + '</b> into <b>' + esc(d.master.name) + '</b> and delete the duplicate. Writes a Merge History row and a Deletion Log row.</p>',
        confirmLabel: 'Merge & delete duplicate',
        audit: { action: 'student.merge', entity: d.master.name + ' ← ' + d.duplicate.name, entityType: 'student', schoolId: d.schoolId },
        onConfirm: function () {
          ORG.mergeHistory.unshift({ id: 'mh-' + Date.now(), date: ORG.iso(new Date('2026-08-27')), schoolId: d.schoolId, master: d.master.name, duplicate: d.duplicate.name, relinked: d.duplicate.assessments, skipped: 0 });
          var idx = ORG.duplicates.indexOf(d); if (idx >= 0) ORG.duplicates.splice(idx, 1);
          toast('Merged — ' + d.duplicate.assessments + ' assessment(s) re-linked.'); go('merge', { school: d.schoolId });
        } });
      return true;
    }, 'Continue to confirm');
  }

  // ============================================================
  //  LEAN REAL SCREENS  (deep-link targets — no dead ends)
  // ============================================================

  // Student Directory (lookup-only, spec §5.1)
  SCREEN.directory = function (params, body) {
    var rows = ORG.server.studentDirectory();
    var q = (params.q || '').toLowerCase();
    var filtered = rows.filter(function (r) { return !q || (r.name + ' ' + r.admission).toLowerCase().indexOf(q) >= 0; });
    body.innerHTML = screenHead('Student Directory', 'Global, cross-school lookup. Read-only — student writes happen in the school context.') +
      '<div class="tl-card"><div class="tl-filters"><input class="input grow" id="dir-q" placeholder="Search by name or admission #…" style="max-width:340px" value="' + esc(params.q || '') + '"></div>' +
      (filtered.length ? '<div class="tl-tablewrap"><table class="tl-table" style="min-width:560px"><thead><tr><th>Name</th><th>Admission #</th><th>School</th><th>Grade/Section</th></tr></thead><tbody>' +
        filtered.map(function (r) { var s = ORG.byId(r.schoolId); return '<tr class="clickable" data-open="' + r.schoolId + '"><td class="name">' + esc(r.name) + '</td><td class="mono">' + esc(r.admission) + '</td><td>' + (s ? esc(s.name) : '—') + '</td><td>' + esc(r.gradeSection) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="tl-empty">No students match. (Phase 1 directory shows schools with a live roster.)</div>') + '</div>';
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { go('school', { id: b.dataset.open, tab: 'students' }); }); });
    var qi = body.querySelector('#dir-q'); if (qi) qi.addEventListener('input', function () { var pos = qi.selectionStart; SCREEN.directory({ q: qi.value }, body); var nq = body.querySelector('#dir-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  };

  // Users (spec §7.1) — "No role" first-class filter
  SCREEN.users = function (params, body) {
    var roleF = params.role || '';
    var kindF = params.kind || '';
    var q = (params.q || '').toLowerCase();
    var list = ORG.users.filter(function (u) {
      if (roleF === 'none' && u.role !== 'none') return false;
      if (roleF && roleF !== 'none' && u.role !== roleF) return false;
      if (kindF === 'staff' && (u.role === 'none' || u.role === 'Super Admin')) return false;
      if (q && (u.name + ' ' + u.email).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var banner = roleF === 'none' ? '<div class="tl-filterbanner">Filtered to <b>users with no role</b> — dead accounts to clean up · <button class="link-btn" id="u-clear">clear</button></div>' : '';
    var rows = list.slice(0, 200).map(function (u) {
      var s = u.schoolId ? ORG.byId(u.schoolId) : null;
      return '<tr><td class="name">' + esc(u.name) + '<small>' + esc(u.email) + '</small></td>' +
        '<td>' + (u.role === 'none' ? '<span class="tl-pill warn">No role</span>' : esc(u.role)) + '</td>' +
        '<td>' + (s ? esc(s.name) : (u.role === 'Super Admin' ? 'Tilli Team' : '—')) + '</td>' +
        '<td style="text-align:right"><button class="link-btn" data-role="' + esc(u.email) + '">Change role</button> <button class="link-btn danger" data-del="' + esc(u.name) + '">Delete</button></td></tr>';
    }).join('') || '<tr><td colspan="4"><div class="tl-empty">No users match.</div></td></tr>';
    var roleOpts = ['', 'none'].concat(ORG.roles.filter(function (r) { return r !== 'none'; })).map(function (r) {
      return '<option value="' + r + '"' + (roleF === r ? ' selected' : '') + '>' + (r === '' ? 'All roles' : (r === 'none' ? 'No role' : r)) + '</option>';
    }).join('');
    body.innerHTML = screenHead('Users', list.length + ' users' + (roleF ? ' (filtered)' : '') + '.',
      '<button class="btn btn-primary btn-sm" data-invite>+ Invite user</button>') + banner +
      '<div class="tl-card"><div class="tl-filters"><label class="select-wrap"><select class="select" id="u-role">' + roleOpts + '</select></label>' +
        '<input class="input grow" id="u-q" placeholder="Search name or email…" style="max-width:320px" value="' + esc(params.q || '') + '"></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>User</th><th>Role</th><th>School</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (list.length > 200 ? '<p class="tl-muted" style="margin-top:10px">Showing first 200 — pagination/virtualisation lands with the full People screen.</p>' : '') + '</div>';
    var rs = body.querySelector('#u-role'); if (rs) rs.addEventListener('change', function () { go('users', { role: rs.value, q: params.q }); });
    var uc = body.querySelector('#u-clear'); if (uc) uc.addEventListener('click', function () { go('users', {}); });
    var uq = body.querySelector('#u-q'); if (uq) uq.addEventListener('input', function () { var pos = uq.selectionStart; SCREEN.users({ role: roleF, kind: kindF, q: uq.value }, body); var nq = body.querySelector('#u-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
    var iv = body.querySelector('[data-invite]'); if (iv) iv.addEventListener('click', function () { openInvite(null); });
    body.querySelectorAll('[data-role]').forEach(function (b) { b.addEventListener('click', function () { openRoleEditor(ORG.users.find(function (u) { return u.email === b.dataset.role; }), function () { go('users', { role: roleF, q: params.q }); }); }); });
    body.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { gated({ title: 'Delete user', danger: true, typed: 'DELETE', body: '<p>Delete <b>' + esc(b.dataset.del) + '</b>? This cannot be undone.</p>', confirmLabel: 'Delete user', audit: { action: 'user.delete', entity: b.dataset.del, entityType: 'user' }, onConfirm: function () { toast('User deleted — logged.'); } }); }); });
  };

  // Invitations (spec §7.2)
  function invStatusPill(i) { var m = { 'Activated': 'ok', 'Account Created': 'sched', 'Expired': 'danger' }; return statusPill(i.status, m[i.status] || ''); }
  SCREEN.invitations = function (params, body) {
    var attn = params.filter === 'attention';
    var list = ORG.invitations.filter(function (i) {
      if (!attn) return true;
      if (i.status === 'Activated') return false;
      var d = ORG.daysFromNow(i.expires);
      return i.status === 'Expired' || (d >= 0 && d <= 7);
    });
    var banner = attn ? '<div class="tl-filterbanner">Filtered to <b>expiring / expired</b> invitations · <button class="link-btn" id="inv-clear">clear</button></div>' : '';
    var rows = list.map(function (i) {
      var s = i.schoolId ? ORG.byId(i.schoolId) : null;
      return '<tr><td class="name"><button class="link-btn" data-inv-detail="' + esc(i.email) + '" style="font-weight:700;color:var(--ink-900)">' + esc(i.name) + '</button><small>' + esc(i.email) + '</small></td><td>' + esc(i.role) + '</td><td>' + (s ? esc(s.name) : '—') + '</td>' +
        '<td>' + invStatusPill(i) + '</td><td>' + esc(i.delivery) + '</td><td>' + esc(i.created) + '</td><td>' + esc(i.expires) + '</td>' +
        '<td style="text-align:right"><button class="link-btn" data-resend="' + esc(i.email) + '">Resend</button> <button class="link-btn danger" data-revoke="' + esc(i.email) + '">Revoke</button></td></tr>';
    }).join('') || '<tr><td colspan="8"><div class="tl-empty">No invitations.</div></td></tr>';
    body.innerHTML = screenHead('Invitations', list.length + ' invitations' + (attn ? ' needing attention' : '') + '.', '<button class="btn btn-primary btn-sm" data-invite>+ New invitation</button>') + banner +
      '<div class="tl-card"><div class="tl-tablewrap"><table class="tl-table" style="min-width:820px"><thead><tr><th>Recipient</th><th>Role</th><th>School</th><th>Status</th><th>Delivery</th><th>Created</th><th>Expires</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    var c = body.querySelector('#inv-clear'); if (c) c.addEventListener('click', function () { go('invitations', {}); });
    var iv = body.querySelector('[data-invite]'); if (iv) iv.addEventListener('click', function () { openInvite(null); });
    body.querySelectorAll('[data-inv-detail]').forEach(function (b) { b.addEventListener('click', function () { openInviteDetail(b.dataset.invDetail); }); });
    body.querySelectorAll('[data-resend]').forEach(function (b) { b.addEventListener('click', function () { ORG.server.logAudit(me.name, 'invitation.resend', b.dataset.resend, 'invitation'); toast('Invitation resent.'); }); });
    body.querySelectorAll('[data-revoke]').forEach(function (b) { b.addEventListener('click', function () { gated({ title: 'Revoke invitation', danger: true, body: '<p>Revoke the invitation to <b>' + esc(b.dataset.revoke) + '</b>?</p>', confirmLabel: 'Revoke', audit: { action: 'invitation.revoke', entity: b.dataset.revoke, entityType: 'invitation' }, onConfirm: function () { toast('Invitation revoked.'); } }); }); });
  };

  function openInvite(schoolId) {
    var schoolOpts = '<option value="">— Select school —</option>' + ORG.activeSchools().map(function (s) { return '<option value="' + s.id + '"' + (s.id === schoolId ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('');
    var invRoles = ORG.roles.filter(function (r) { return r !== 'none'; });
    var roleOpts = invRoles.map(function (r) { return '<option value="' + r + '">' + esc(r) + '</option>'; }).join('');
    openModal('New invitation', '<p class="tl-muted">Send an onboarding invite. <span class="tl-gated">gated</span></p><div class="tl-stack">' +
      '<label class="field">Recipient email<input class="input" id="iv-email" type="email" placeholder="name@school.edu"></label>' +
      '<label class="field">Role<select class="select" id="iv-role">' + roleOpts + '</select>' +
        '<span class="tl-rolecap" id="iv-rolecap">' + esc(roleCap(invRoles[0])) + '</span></label>' +
      '<label class="field">School<select class="select" id="iv-school">' + schoolOpts + '</select></label>' +
      '</div>', function (close) {
        var em = (document.getElementById('iv-email').value || '').trim();
        if (!em) { toast('Recipient email is required.'); return false; }
        var role = document.getElementById('iv-role').value;
        var schId = document.getElementById('iv-school').value || null;
        var res = window.TilliAPI
          ? window.TilliAPI.createInvite({ email: em, role: role, school_id: schId, invitedBy: me.email })
          : { ok: false };
        if (!res.ok) { toast('Could not create the invitation.'); return false; }
        // Surface it in the Invitations table (live + persisted via TilliAPI).
        if (window.TilliAPI.getAccount) ORG.server.addInvitation(window.TilliAPI.getAccount(em));
        ORG.server.logAudit(me.name, 'invitation.send', em, 'invitation', schId);
        close();
        go('invitations', {});        // land on the list so the new row is visible
        showInviteCredentials(res);   // reveal the one-time temp password to relay
      }, 'Send invite');
    // Reflect what the chosen role can do, live, so the provisioning
    // hierarchy is visible before the invite goes out.
    var ivRole = document.getElementById('iv-role'), ivCap = document.getElementById('iv-rolecap');
    if (ivRole && ivCap) ivRole.addEventListener('change', function () { ivCap.textContent = roleCap(ivRole.value); });
  }

  // Click a row's recipient to inspect the invite: role, school, status, dates
  // and — for invites we minted that haven't been reset yet — the temp password.
  function openInviteDetail(emailOrRow) {
    var inv = ORG.invitations.filter(function (i) { return i.email === emailOrRow; })[0];
    var acct = (window.TilliAPI && window.TilliAPI.getAccount) ? window.TilliAPI.getAccount(emailOrRow) : null;
    if (!inv && !acct) { toast('No details for this invitation.'); return; }
    var email = (inv && inv.email) || (acct && acct.email) || emailOrRow;
    var role = (inv && inv.role) || (acct && acct.role) || '—';
    var sc = inv && inv.schoolId ? ORG.byId(inv.schoolId) : (acct && acct.school_id ? ORG.byId(acct.school_id) : null);
    var status = inv ? inv.status : (acct && acct.status === 'active' ? 'Activated' : 'Account Created');

    // Password line: show the live temp password only while it's still valid
    // (account exists and hasn't been reset). Seeded demo invites have none.
    var pwLine;
    if (acct && acct.mustReset && acct.tempPassword)
      pwLine = '<div class="ws-rev-row"><span>Temporary password</span><b class="mono" id="ivd-temp">' + esc(acct.tempPassword) + '</b></div>';
    else if (acct && !acct.mustReset)
      pwLine = '<div class="ws-rev-row"><span>Temporary password</span><b class="tl-muted">Used — recipient set their own password</b></div>';
    else
      pwLine = '<div class="ws-rev-row"><span>Temporary password</span><b class="tl-muted">Not available (demo seed invite)</b></div>';

    var canCopy = acct && acct.mustReset && acct.tempPassword;
    openModal('Invitation · ' + esc((inv && inv.name) || email),
      '<div class="tl-stack" style="margin-top:4px">' +
        '<div class="ws-rev-row"><span>Email</span><b class="mono">' + esc(email) + '</b></div>' +
        '<div class="ws-rev-row"><span>Role</span><b>' + esc(role) + '</b></div>' +
        '<div class="ws-rev-row"><span>School</span><b>' + (sc ? esc(sc.name) : '—') + '</b></div>' +
        '<div class="ws-rev-row"><span>Status</span><b>' + esc(status) + '</b></div>' +
        (inv ? '<div class="ws-rev-row"><span>Created</span><b>' + esc(inv.created) + '</b></div>' +
               '<div class="ws-rev-row"><span>Expires</span><b>' + esc(inv.expires) + '</b></div>' : '') +
        pwLine +
      '</div>' +
      (canCopy ? '<p class="tl-muted" style="margin-top:12px;font-size:12.5px">The recipient signs in with this password at the Tilli Measures landing page, then sets their own.</p>'
               : ''),
      function (close) {
        if (canCopy) {
          var t = email + '\n' + acct.tempPassword;
          if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Credentials copied.'); }, function () { toast('Copy failed.'); });
          return false;   // keep open after copy
        }
        close();
      }, canCopy ? 'Copy credentials' : 'Close');
  }

  // After an invite is created, reveal the one-time temporary password so the
  // Super Admin can pass it to the recipient. The recipient signs in with this
  // + their email, then is forced to set their own password on first login.
  function showInviteCredentials(res) {
    openModal('Invitation created', '<p class="tl-muted">Share these one-time credentials with <b>' + esc(res.email) + '</b>. They\'ll sign in and set their own password.</p>' +
      '<div class="tl-stack" style="margin-top:12px">' +
        '<div class="ws-rev-row"><span>Email</span><b class="mono">' + esc(res.email) + '</b></div>' +
        '<div class="ws-rev-row"><span>Temporary password</span><b class="mono" id="iv-temp">' + esc(res.tempPassword) + '</b></div>' +
        '<div class="ws-rev-row"><span>Role</span><b>' + esc(res.role) + '</b></div>' +
      '</div>' +
      '<p class="tl-muted" style="margin-top:12px;font-size:12.5px">This password is shown once and expires when they set their own. Sign-in is at the Tilli Measures landing page.</p>',
      function (close) {
        var t = res.email + '\n' + res.tempPassword;
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Credentials copied.'); }, function () { toast('Copy failed — select manually.'); });
        else toast('Copy not supported here.');
        return false;   // keep the reveal open after copying
      }, 'Copy credentials');
  }

  // Issue Reports (spec §8.1) — auto-crash grouped
  function issueStatusPill(st) { var m = { open: 'danger', investigating: 'warn', resolved: 'ok' }; return statusPill(st.charAt(0).toUpperCase() + st.slice(1), m[st] || ''); }
  SCREEN.issues = function (params, body) {
    var st = params.status || 'all';
    var counts = { all: ORG.issues.length, open: 0, investigating: 0, resolved: 0 };
    ORG.issues.forEach(function (i) { counts[i.status]++; });
    var human = ORG.issues.filter(function (i) { return !i.autoCrash; });
    var crashes = ORG.issues.filter(function (i) { return i.autoCrash; });
    var list = human.filter(function (i) { return st === 'all' || i.status === st; });

    var rows = list.map(function (i) {
      var s = ORG.byId(i.schoolId);
      return '<tr><td class="name">' + esc(i.reporter) + '<small>' + esc(i.role) + '</small></td><td>' + (s ? esc(s.name) : '—') + '</td><td>' + esc(i.page) + '</td><td>' + esc(i.device) + '</td><td>' + esc(i.date) + '</td><td>' + issueStatusPill(i.status) + '</td>' +
        '<td style="text-align:right"><button class="link-btn" data-status="' + i.id + '">Change status</button></td></tr>';
    }).join('') || '<tr><td colspan="7"><div class="tl-empty">No issues in this view.</div></td></tr>';

    var crashGroup = crashes.length ? '<div class="tl-card" style="margin-top:var(--tl-gap)"><details class="tl-crashes"><summary><b>' + crashes.length + '</b> auto-crash reports · grouped (' + esc(crashes[0].crashSig) + ')</summary>' +
      '<div class="tl-tablewrap"><table class="tl-table" style="min-width:560px"><thead><tr><th>Device</th><th>Page</th><th>Date</th><th>School</th></tr></thead><tbody>' +
        crashes.map(function (c) { var s = ORG.byId(c.schoolId); return '<tr><td>' + esc(c.device) + '</td><td>' + esc(c.page) + '</td><td>' + esc(c.date) + '</td><td>' + (s ? esc(s.name) : '—') + '</td></tr>'; }).join('') +
      '</tbody></table></div></details></div>' : '';

    body.innerHTML = screenHead('Issue Reports', counts.open + ' open · ' + crashes.length + ' auto-crash grouped.') +
      '<div class="tl-card"><div class="tl-tabs">' +
        ['all', 'open', 'investigating', 'resolved'].map(function (k) { return '<button class="tl-tab' + (st === k ? ' on' : '') + '" data-istab="' + k + '">' + k.charAt(0).toUpperCase() + k.slice(1) + ' <b>' + (k === 'all' ? counts.all : counts[k]) + '</b></button>'; }).join('') + '</div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:760px"><thead><tr><th>Reporter</th><th>School</th><th>Page</th><th>Device</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      crashGroup;
    body.querySelectorAll('[data-istab]').forEach(function (b) { b.addEventListener('click', function () { go('issues', { status: b.dataset.istab }); }); });
    body.querySelectorAll('[data-status]').forEach(function (b) { b.addEventListener('click', function () { changeIssueStatus(b.dataset.status, body, params); }); });
  };
  function changeIssueStatus(id, body, params) {
    var i = ORG.issues.find(function (x) { return x.id === id; }); if (!i) return;
    openModal('Change issue status', '<div class="tl-stack">' + ['open', 'investigating', 'resolved'].map(function (s) {
      return '<button class="btn ' + (i.status === s ? 'btn-primary' : 'btn-outline') + ' block" data-set="' + s + '">' + s.charAt(0).toUpperCase() + s.slice(1) + '</button>';
    }).join('') + '</div>', function (close) { close(); return true; }, 'Done');
    setTimeout(function () { document.querySelectorAll('[data-set]').forEach(function (b) { b.addEventListener('click', function () { i.status = b.dataset.set; ORG.server.logAudit(me.name, 'issue.status', i.page + ' → ' + b.dataset.set, 'issue', i.schoolId); document.getElementById('tl-modal-root').innerHTML = ''; toast('Status → ' + b.dataset.set + '.'); SCREEN.issues(params, body); }); }); }, 0);
  }

  // Deployments (spec §6.4) — status server-derived
  function depStatusPill(st) { var m = { Scheduled: 'sched', Live: 'ok', Ended: 'muted' }; return statusPill(st, m[st] || ''); }
  SCREEN.deployments = function (params, body) {
    var tab = (params.tab === 'results' || params.tab === 'master-links') ? params.tab : 'list';
    var panels = { list: depList, results: depResults, 'master-links': depMasterLinks };
    body.innerHTML = screenHead('Deployments', 'Deploy assessments to schools and read their responses.') +
      '<div class="tl-tabs">' +
        '<button class="tl-tab' + (tab === 'list' ? ' on' : '') + '" data-deptab="list">Deployments <b>' + ORG.deployments.length + '</b></button>' +
        '<button class="tl-tab' + (tab === 'results' ? ' on' : '') + '" data-deptab="results">Results <b>' + ORG.results.length + '</b></button>' +
        '<button class="tl-tab' + (tab === 'master-links' ? ' on' : '') + '" data-deptab="master-links">Master Links <b>' + ORG.masterLinks.hubs.length + '</b></button>' +
      '</div><div id="dep-panel"></div>';
    (panels[tab])(params, document.getElementById('dep-panel'));
    body.querySelectorAll('[data-deptab]').forEach(function (b) { b.addEventListener('click', function () { go('deployments', { tab: b.dataset.deptab }); }); });
  };

  function depList(params, el) {
    var attn = params.filter === 'attention';
    var list = ORG.deployments.filter(function (d) {
      if (!attn) return true;
      if (d.status === 'Live') return ORG.daysFromNow(d.end) <= 3;
      if (d.status === 'Scheduled') return ORG.daysFromNow(d.start) < 0;
      return false;
    });
    var banner = attn ? '<div class="tl-filterbanner">Filtered to <b>deployments needing attention</b> (window closing, or scheduled start passed) · <button class="link-btn" id="dep-clear">clear</button></div>' : '';
    var rows = list.map(function (d) {
      var s = ORG.byId(d.schoolId);
      // Rows deep-link into the Results tab, pre-filtered to that assessment.
      return '<tr class="clickable" data-depres="' + esc(d.assessment) + '"><td class="name">' + esc(d.assessment) + (d.gamified ? ' <span class="tl-badge-gam">Gamified</span>' : '') + '</td><td>' + (s ? esc(s.name) : '—') + '</td><td>' + esc(d.audience) + '</td><td>' + esc(d.phase) + '</td><td>' + esc(d.start + ' → ' + d.end) + '</td><td>' + (d.chain ? '⛓' : '—') + '</td><td>' + depStatusPill(d.status) + '</td></tr>';
    }).join('') || '<tr><td colspan="7"><div class="tl-empty">No deployments in this view.</div></td></tr>';
    el.innerHTML = banner +
      '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-newdep>+ New deployment</button></div>' +
      '<div class="tl-card"><div class="tl-tablewrap"><table class="tl-table" style="min-width:820px"><thead><tr><th>Assessment</th><th>School</th><th>Audience</th><th>Phase</th><th>Window</th><th>Chain</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    var c = el.querySelector('#dep-clear'); if (c) c.addEventListener('click', function () { go('deployments', {}); });
    var nd = el.querySelector('[data-newdep]'); if (nd) nd.addEventListener('click', function () { openNewDeployment(null); });
    el.querySelectorAll('[data-depres]').forEach(function (b) { b.addEventListener('click', function () { go('deployments', { tab: 'results', q: b.dataset.depres }); }); });
  }

  // Results tab — the assessment results / export home (was "Results & Data",
  // formerly "AMES Data"). Observation responses land here alongside everything.
  function depResults(params, el) {
    var phaseF = params.phase || '';
    var q = (params.q || '').toLowerCase();
    var list = ORG.results.filter(function (r) {
      if (phaseF && r.phase !== phaseF) return false;
      var s = ORG.byId(r.schoolId);
      if (q && (((s ? s.name : '') + ' ' + r.assessment).toLowerCase().indexOf(q) < 0)) return false;
      return true;
    });
    var phaseOpts = ['', 'Baseline', 'Midline', 'Endline'].map(function (ph) { return '<option value="' + ph + '"' + (phaseF === ph ? ' selected' : '') + '>' + (ph || 'All phases') + '</option>'; }).join('');
    var rows = list.length ? list.map(function (r) { var s = ORG.byId(r.schoolId);
      return '<tr><td class="name">' + (s ? esc(s.name) : '—') + '</td><td>' + esc(r.assessment) + '</td><td>' + esc(r.phase) + '</td><td>' + esc(r.audience) + '</td><td class="tl-num">' + r.responses + ' / ' + r.expected + '</td><td class="tl-num">' + pct(r.completion) + '%</td><td>' + depStatusPill(r.status) + '</td><td>' + esc(r.updated) + '</td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="tl-empty">No results match.</div></td></tr>';
    el.innerHTML =
      '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" id="res-dl">Download CSV</button></div>' +
      '<div class="tl-card"><div class="tl-filters"><label class="select-wrap"><select class="select" id="res-phase">' + phaseOpts + '</select></label>' +
        '<input class="input grow" id="res-q" placeholder="Search school or assessment…" style="max-width:320px" value="' + esc(params.q || '') + '"></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:820px"><thead><tr><th>School</th><th>Assessment</th><th>Phase</th><th>Audience</th><th>Responses</th><th>Completion</th><th>Status</th><th>Updated</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    el.querySelector('#res-dl').addEventListener('click', function () {
      downloadCsv('assessment-results.csv', ['School', 'Assessment', 'Phase', 'Audience', 'Responses', 'Expected', 'Completion %', 'Status', 'Updated'],
        list.map(function (r) { var s = ORG.byId(r.schoolId); return [s ? s.name : '', r.assessment, r.phase, r.audience, r.responses, r.expected, r.completion, r.status, r.updated]; }));
    });
    var pf = el.querySelector('#res-phase'); if (pf) pf.addEventListener('change', function () { go('deployments', { tab: 'results', phase: pf.value, q: params.q }); });
    var rq = el.querySelector('#res-q'); if (rq) rq.addEventListener('input', function () { var pos = rq.selectionStart; depResults({ phase: phaseF, q: rq.value }, el); var nq = el.querySelector('#res-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  }

  // Templates (spec §6.1)
  SCREEN.templates = function (params, body) {
    var stF = params.status || '';
    var list = ORG.templates.filter(function (t) { return !stF || t.status === stF; });
    var banner = stF ? '<div class="tl-filterbanner">Filtered to <b>' + esc(stF) + '</b> templates · <button class="link-btn" id="tpl-clear">clear</button></div>' : '';
    var cards = list.map(function (t) {
      return '<div class="tl-tpl-card"><div class="tt-top"><span class="tt-aud">' + esc(t.audience) + '</span>' + statusPill(t.status, t.status === 'Published' ? 'ok' : 'warn') + '</div>' +
        '<div class="tt-title">' + esc(t.title) + '</div><div class="tt-desc">' + esc(t.desc) + '</div>' +
        '<div class="tt-foot"><span class="tt-phase">' + esc(t.phase) + '</span><button class="link-btn" data-tpl="' + t.id + '">Edit ⋮</button></div></div>';
    }).join('');
    // The Observation Form is a first-class template (audience: Observation): a
    // shared question bank published per phase. It opens its own editor rather
    // than the generic template menu. Hidden when a status filter is applied.
    var obsCard = '';
    if (!stF) {
      var obs = ORG.observation;
      var pub = obs.phases.filter(function (p) { return p.published; }).length;
      obsCard = '<div class="tl-tpl-card"><div class="tt-top"><span class="tt-aud">Observation</span>' +
        statusPill(pub + '/' + obs.phases.length + ' phases live', pub ? 'ok' : 'warn') + '</div>' +
        '<div class="tt-title">Teacher Observation Form</div>' +
        '<div class="tt-desc">' + obs.questions.length + '-item shared question bank, published per phase. Deploy from Deployments.</div>' +
        '<div class="tt-foot"><span class="tt-phase">Pre · Mid · Post</span><button class="link-btn" data-obsedit>Configure ⋮</button></div></div>';
    }
    // Self-Guided assessments live here too: gamified instruments (EMT, Hearts &
    // Flowers, Memory Game) shown as their own section under the template grid.
    var sgCards = stF ? '' : ORG.selfGuided.map(function (g) {
      return '<div class="tl-sg-card"><div class="sg-top"><div><div class="sg-name">' + esc(g.name) + '</div><div class="sg-full">' + esc(g.full) + '</div></div>' +
        statusPill(g.status, g.status === 'Published' ? 'ok' : 'warn') + '</div>' +
        skillTagsHtml(g.skills) + '<div class="sg-desc">' + esc(g.desc) + '</div>' +
        '<div class="sg-foot"><span class="sg-q">' + g.questions + ' items</span><button class="btn btn-outline btn-sm" data-manage="' + g.id + '">Manage</button></div></div>';
    }).join('');
    var sgSection = sgCards ? '<div class="tl-mini-head">Self-Guided Assessments</div>' +
      '<p class="tl-mod-note" style="margin:-4px 0 var(--tl-gap)">' + ORG.selfGuided.length + ' gamified instruments — EMT, Hearts &amp; Flowers, Memory Game.</p>' +
      '<div class="tl-sg-grid">' + sgCards + '</div>' : '';
    body.innerHTML = screenHead('Templates', (list.length + (obsCard ? 1 : 0)) + ' assessment templates.', '<button class="btn btn-primary btn-sm" data-new>+ New template</button>') + banner +
      '<div class="tl-tpl-grid">' + (obsCard + cards || '<div class="tl-empty">No templates.</div>') + '</div>' + sgSection;
    var c = body.querySelector('#tpl-clear'); if (c) c.addEventListener('click', function () { go('templates', {}); });
    var nb = body.querySelector('[data-new]'); if (nb) nb.addEventListener('click', openNewTemplate);
    var ob = body.querySelector('[data-obsedit]'); if (ob) ob.addEventListener('click', function () { go('observation', {}); });
    body.querySelectorAll('[data-tpl]').forEach(function (b) { b.addEventListener('click', function () { openTemplateMenu(b.dataset.tpl); }); });
    body.querySelectorAll('[data-manage]').forEach(function (b) { b.addEventListener('click', function () { openManageGame(b.dataset.manage); }); });
  };

  // Deletion Logs (spec §8.3) — read-only evidence
  SCREEN.deletion = function (params, body) {
    var q = (params.q || '').toLowerCase();
    var list = ORG.deletionLogs.filter(function (x) { return !q || (x.studentName + ' ' + x.code).toLowerCase().indexOf(q) >= 0; });
    var rows = list.map(function (x) {
      var s = ORG.byId(x.schoolId); var sys = x.deletedBy.indexOf('System') >= 0;
      return '<tr><td>' + esc(x.deletedAt) + '</td><td class="name">' + esc(x.studentName) + '<small class="mono">' + esc(x.code) + '</small></td><td>' + esc(x.gradeSection) + '</td><td>' + (s ? esc(s.name) : '—') + '</td><td>' + (sys ? '<span class="tl-pill muted">' + esc(x.deletedBy) + '</span>' : esc(x.deletedBy)) + '</td></tr>';
    }).join('') || '<tr><td colspan="5"><div class="tl-empty">No deletion records.</div></td></tr>';
    body.innerHTML = crumbs([{ label: 'Audit Trail', screen: 'audit' }, { label: 'Deletion Logs' }]) +
      screenHead('Deletion Logs', list.length + ' records · read-only evidence.') +
      '<div class="tl-card"><div class="tl-filters"><input class="input grow" id="del-q" placeholder="Search student or code…" style="max-width:320px" value="' + esc(params.q || '') + '"></div>' +
        '<div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>Deleted at</th><th>Student</th><th>Grade/Section</th><th>School</th><th>Deleted by</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    wireCrumbs(body);
    var qi = body.querySelector('#del-q'); if (qi) qi.addEventListener('input', function () { var pos = qi.selectionStart; SCREEN.deletion({ q: qi.value }, body); var nq = body.querySelector('#del-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  };

  // Audit Trail (spec §8.4)
  SCREEN.audit = function (params, body) {
    var rows = ORG.audit.map(function (e) {
      var s = e.schoolId ? ORG.byId(e.schoolId) : null;
      return '<tr><td>' + timeAgo(e.at) + '</td><td class="name">' + esc(e.actor) + '</td><td>' + esc(actionLabelG(e.action)) + '</td><td>' + esc(e.entity) + (s ? ' <small>' + esc(s.name) + '</small>' : '') + '</td></tr>';
    }).join('');
    body.innerHTML = screenHead('Audit Trail', 'Append-only log of every gated action. Deletion Logs and Merge History are filtered views of this.',
        '<button class="btn btn-outline btn-sm" data-nav="deletion">Deletion Logs →</button>') +
      '<div class="tl-card"><div class="tl-tablewrap"><table class="tl-table" style="min-width:640px"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    body.querySelectorAll('[data-nav]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.nav, {}); }); });
  };
  function actionLabelG(a) {
    return ({ 'template.publish': 'Published template', 'template.create': 'Created template', 'template.duplicate': 'Duplicated template', 'template.delete': 'Deleted template', 'template.edit': 'Edited template',
      'student.merge': 'Merged students', 'student.delete': 'Deleted students', 'student.add': 'Imported students', 'student.edit': 'Edited student',
      'school.add': 'Added school', 'school.archive': 'Archived school', 'school.delete': 'Deleted school', 'school.edit': 'Edited school', 'school.structure': 'Updated grades / sections', 'role.change': 'Changed role',
      'deployment.create': 'Created deployment', 'deployment.end': 'Ended deployment',
      'observation.publish': 'Published observation phase', 'observation.access': 'Changed form access', 'selfguided.publish': 'Published self-guided game', 'selfguided.edit': 'Edited self-guided game',
      'group.create': 'Created group', 'group.rename': 'Renamed group', 'group.delete': 'Deleted group',
      'invitation.resend': 'Resent invitation', 'invitation.send': 'Sent invitation', 'invitation.revoke': 'Revoked invitation',
      'user.delete': 'Deleted user', 'user.remove': 'Removed from school', 'issue.status': 'Changed issue status' })[a] || a;
  }

  // Global search (spec: schools · students · users · invitations · deployments)
  SCREEN.search = function (params, body) {
    var q = (params.q || '').trim().toLowerCase();
    if (!q) { body.innerHTML = screenHead('Search', 'Type a query in the top bar.') + '<div class="tl-card"><div class="tl-empty">Search schools, students, users, invitations and deployments.</div></div>'; return; }
    var groups = [
      { title: 'Schools', rows: ORG.schools.filter(function (s) { return (s.name + ' ' + s.code).toLowerCase().indexOf(q) >= 0; }).slice(0, 8).map(function (s) { return { label: s.name, sub: s.code + ' · ' + s.groupName, go: ['school', { id: s.id }] }; }) },
      { title: 'Students', rows: ORG.server.studentDirectory().filter(function (r) { return (r.name + ' ' + r.admission).toLowerCase().indexOf(q) >= 0; }).slice(0, 8).map(function (r) { return { label: r.name, sub: r.admission, go: ['school', { id: r.schoolId, tab: 'students' }] }; }) },
      { title: 'Users', rows: ORG.users.filter(function (u) { return (u.name + ' ' + u.email).toLowerCase().indexOf(q) >= 0; }).slice(0, 8).map(function (u) { return { label: u.name, sub: u.email + ' · ' + u.role, go: ['users', { q: u.name }] }; }) },
      { title: 'Invitations', rows: ORG.invitations.filter(function (i) { return (i.name + ' ' + i.email).toLowerCase().indexOf(q) >= 0; }).slice(0, 6).map(function (i) { return { label: i.name, sub: i.email + ' · ' + i.status, go: ['invitations', {}] }; }) },
      { title: 'Deployments', rows: ORG.deployments.filter(function (d) { return d.assessment.toLowerCase().indexOf(q) >= 0; }).slice(0, 6).map(function (d) { return { label: d.assessment, sub: d.phase + ' · ' + d.status, go: ['deployments', {}] }; }) },
    ].filter(function (g) { return g.rows.length; });
    var html = groups.length ? groups.map(function (g) {
      return '<div class="tl-card"><div class="tl-mod-h"><h3 class="tl-mod-title">' + g.title + ' <span class="tl-count">' + g.rows.length + '</span></h3></div>' +
        g.rows.map(function (r, i) { return '<button class="tl-searchrow" data-g="' + esc(g.title) + '" data-i="' + i + '"><b>' + esc(r.label) + '</b><span>' + esc(r.sub) + '</span></button>'; }).join('') + '</div>';
    }).join('') : '<div class="tl-card"><div class="tl-empty">Nothing matches “' + esc(params.q) + '”.</div></div>';
    body.innerHTML = screenHead('Search', 'Results for “' + params.q + '”.') + html;
    body.querySelectorAll('[data-g]').forEach(function (b) { b.addEventListener('click', function () { var g = groups.find(function (x) { return x.title === b.dataset.g; }); var r = g.rows[+b.dataset.i]; go(r.go[0], r.go[1]); }); });
  };

  // ============================================================
  //  ADD STUDENTS  (spec §5.2 / hub Students) — manual + CSV import
  // ============================================================
  var addState = { mode: 'manual', batch: [], preview: null, grade: '', section: '' };
  SCREEN['add-students'] = function (p, b) {
    var sc = p.school ? ORG.byId(p.school) : null;
    var crumb = sc ? crumbs([{ label: 'All Schools', screen: 'schools' }, { label: sc.name, screen: 'school', params: { id: sc.id, tab: 'students' } }, { label: 'Add Students' }]) : '';
    var schoolPicker = sc
      ? '<div class="tl-filterbanner">Adding to <b>' + esc(sc.name) + '</b> · <span class="mono">' + esc(sc.code) + '</span></div>'
      : '<div class="tl-card" style="margin-bottom:var(--tl-gap)"><label class="field">School<select class="select" id="as-school"><option value="">— Select a school —</option>' +
          ORG.activeSchools().map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></label></div>';

    b.innerHTML = crumb + screenHead('Add Students' + (sc ? ' · ' + sc.name : ''), 'Manual entry or CSV import. Rows are validated before commit.') + schoolPicker +
      '<div class="tl-seg"><button data-mode="manual" class="' + (addState.mode === 'manual' ? 'on' : '') + '">Manual</button><button data-mode="csv" class="' + (addState.mode === 'csv' ? 'on' : '') + '">CSV import</button></div>' +
      '<div id="as-panel"></div>';

    renderAddPanel(sc, document.getElementById('as-panel'));
    wireCrumbs(b);
    b.querySelectorAll('[data-mode]').forEach(function (btn) { btn.addEventListener('click', function () { addState.mode = btn.dataset.mode; SCREEN['add-students'](p, b); }); });
    if (!sc) { var ss = b.querySelector('#as-school'); if (ss) ss.addEventListener('change', function () { p.school = ss.value; go('add-students', { school: ss.value }); }); }
  };

  function currentAddSchool(sc) { if (sc) return sc; var ss = document.getElementById('as-school'); return ss && ss.value ? ORG.byId(ss.value) : null; }

  function renderAddPanel(sc, el) {
    if (addState.mode === 'manual') {
      var batchRows = addState.batch.length ? addState.batch.map(function (r, i) {
        return '<tr><td class="name">' + esc(r.name) + '</td><td class="mono">' + esc(r.admission) + '</td><td>' + esc((r.grade + ' ' + (r.section || '')).trim()) + '</td>' +
          '<td style="text-align:right"><button class="link-btn danger" data-drop="' + i + '">Remove</button></td></tr>';
      }).join('') : '<tr><td colspan="4"><div class="tl-empty">No students staged yet — add one above.</div></td></tr>';
      // Grade / section come from the school's structure and are chosen ONCE —
      // the selection is sticky (kept in addState) so you can keep adding
      // students into the same grade/section without re-picking each time.
      // Changing the grade resets the section to that grade's first (or none).
      var addSchool = currentAddSchool(sc);
      var grades = (addSchool && addSchool.structure && addSchool.structure.grades) ? addSchool.structure.grades : [];
      var gObj = grades.filter(function (g) { return g.grade === addState.grade; })[0];
      if (!gObj && grades.length) { gObj = grades[0]; addState.grade = gObj.grade; }
      var secs = gObj ? gObj.sections : [];
      if (addState.section && !secs.some(function (s) { return s.name === addState.section; })) addState.section = '';
      if (!addState.section && secs.length) addState.section = secs[0].name;

      var gradeControl = grades.length
        ? '<select class="select" id="m-grade">' + grades.map(function (g) {
            return '<option value="' + esc(g.grade) + '"' + (g.grade === addState.grade ? ' selected' : '') + '>' + esc(g.grade) + '</option>';
          }).join('') + '</select>'
        : '<input class="input" id="m-grade" value="' + esc(addState.grade) + '" placeholder="Grade 1">';
      var sectionControl = grades.length
        ? '<select class="select" id="m-sec">' +
            '<option value="">— No section —</option>' +
            secs.map(function (s) { return '<option value="' + esc(s.name) + '"' + (s.name === addState.section ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
          '</select>'
        : '<input class="input" id="m-sec" value="' + esc(addState.section) + '" placeholder="A">';

      el.innerHTML = '<div class="tl-stepcard"><div class="tl-stepnum">1</div><div class="tl-card"><div class="tl-mod-h"><h3 class="tl-mod-title">Add a student</h3></div>' +
        '<div class="tl-stack" style="max-width:520px">' +
          '<div style="display:flex;gap:10px"><label class="field" style="flex:1">Grade' + gradeControl + '</label>' +
            '<label class="field" style="width:130px">Section' + sectionControl + '</label></div>' +
          '<label class="field">Full name<input class="input" id="m-name" placeholder="e.g. Aarav Sharma"></label>' +
          '<label class="field">Admission #<input class="input" id="m-adm" placeholder="ADM-1234"></label>' +
          '<div><button class="btn btn-outline btn-sm" id="m-add">+ Add to batch</button></div>' +
        '</div></div></div>' +
        '<div class="tl-stepcard" style="margin-top:var(--tl-gap)"><div class="tl-stepnum">2</div><div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Staged for import</h3><p class="tl-mod-note">' + addState.batch.length + ' student(s) ready.</p></div>' +
          (addState.batch.length ? '<button class="btn btn-primary btn-sm" id="m-import">Import ' + addState.batch.length + ' student(s)</button>' : '') + '</div>' +
          '<div class="tl-tablewrap"><table class="tl-table" style="min-width:520px"><thead><tr><th>Name</th><th>Admission #</th><th>Grade/Section</th><th></th></tr></thead><tbody>' + batchRows + '</tbody></table></div></div></div>';
      // Sticky grade/section: update addState and re-render (grade change also
      // refreshes the section list for the newly selected grade).
      var gradeEl = el.querySelector('#m-grade');
      gradeEl.addEventListener('change', function () { addState.grade = gradeEl.value.trim(); addState.section = ''; renderAddPanel(sc, el); });
      var secEl = el.querySelector('#m-sec');
      secEl.addEventListener('change', function () { addState.section = secEl.value.trim(); });
      el.querySelector('#m-add').addEventListener('click', function () {
        var name = (document.getElementById('m-name').value || '').trim();
        var adm = (document.getElementById('m-adm').value || '').trim();
        if (!name || !adm) { toast('Name and admission # are required.'); return; }
        // Read grade/section straight off the sticky selection.
        addState.grade = (document.getElementById('m-grade').value || '').trim();
        addState.section = (document.getElementById('m-sec').value || '').trim();
        addState.batch.push({ name: name, admission: adm, grade: addState.grade || 'Grade 1', section: addState.section });
        renderAddPanel(sc, el);
        var nm = document.getElementById('m-name'); if (nm) nm.focus(); // keep entering into the same grade
      });
      el.querySelectorAll('[data-drop]').forEach(function (btn) { btn.addEventListener('click', function () { addState.batch.splice(+btn.dataset.drop, 1); renderAddPanel(sc, el); }); });
      var imp = el.querySelector('#m-import'); if (imp) imp.addEventListener('click', function () { commitStudents(sc, addState.batch.slice()); });
    } else {
      var sample = 'name,admission,grade,section\nAarav Sharma,ADM-2001,Grade 1,A\nDiya Nair,ADM-2002,Grade 1,B\n,ADM-2003,Grade 2,A';
      var prev = addState.preview;
      el.innerHTML = '<div class="tl-card"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Paste CSV</h3><p class="tl-mod-note">Columns: name, admission, grade, section. First row is the header.</p></div><button class="link-btn" id="csv-sample">Insert sample</button></div>' +
          '<textarea class="input" id="csv-in" rows="6" style="font-family:ui-monospace,monospace;font-size:12.5px;resize:vertical" placeholder="' + esc(sample) + '"></textarea>' +
          '<div style="margin-top:12px"><button class="btn btn-outline btn-sm" id="csv-validate">Validate</button></div></div>' +
        (prev ? '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Validation preview</h3>' +
            '<p class="tl-mod-note"><span class="tl-valid-ok">' + prev.valid.length + ' valid</span>' + (prev.invalid.length ? ' · <span class="tl-valid-err">' + prev.invalid.length + ' with errors</span>' : '') + '</p></div>' +
            (prev.valid.length ? '<button class="btn btn-primary btn-sm" id="csv-import">Import ' + prev.valid.length + ' valid row(s)</button>' : '') + '</div>' +
          '<div class="tl-tablewrap"><table class="tl-table" style="min-width:560px"><thead><tr><th>#</th><th>Name</th><th>Admission #</th><th>Grade/Section</th><th>Status</th></tr></thead><tbody>' +
            prev.all.map(function (r, i) {
              return '<tr class="' + (r.error ? 'tl-rowbad' : '') + '"><td class="tl-num">' + (i + 1) + '</td><td class="name">' + esc(r.name || '—') + '</td><td class="mono">' + esc(r.admission || '—') + '</td><td>' + esc((r.grade || '') + ' ' + (r.section || '')) + '</td><td>' + (r.error ? '<span class="tl-valid-err">' + esc(r.error) + '</span>' : '<span class="tl-valid-ok">OK</span>') + '</td></tr>';
            }).join('') + '</tbody></table></div></div>' : '');
      el.querySelector('#csv-sample').addEventListener('click', function () { document.getElementById('csv-in').value = sample; });
      el.querySelector('#csv-validate').addEventListener('click', function () { addState.preview = parseCsv(document.getElementById('csv-in').value); renderAddPanel(sc, el); });
      var ci = el.querySelector('#csv-import'); if (ci) ci.addEventListener('click', function () { commitStudents(sc, addState.preview.valid.slice()); });
    }
  }

  function parseCsv(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length) { var h = lines[0].toLowerCase(); if (h.indexOf('name') >= 0 && h.indexOf('admission') >= 0) lines.shift(); }
    var seen = {}, all = [];
    lines.forEach(function (line) {
      var c = line.split(',').map(function (x) { return x.trim(); });
      var row = { name: c[0] || '', admission: c[1] || '', grade: c[2] || 'Grade 1', section: c[3] || 'A' };
      if (!row.name) row.error = 'Missing name';
      else if (!row.admission) row.error = 'Missing admission #';
      else if (seen[row.admission.toLowerCase()]) row.error = 'Duplicate in file';
      else seen[row.admission.toLowerCase()] = true;
      all.push(row);
    });
    return { all: all, valid: all.filter(function (r) { return !r.error; }), invalid: all.filter(function (r) { return r.error; }) };
  }

  function commitStudents(sc, rows) {
    var school = currentAddSchool(sc);
    if (!school) { toast('Select a school first.'); return; }
    if (!rows.length) { toast('Nothing to import.'); return; }
    gated({ title: 'Import ' + rows.length + ' student(s)', typed: rows.length > 20 ? 'IMPORT' : null,
      body: '<p>Add <b>' + rows.length + '</b> student(s) to <b>' + esc(school.name) + '</b>? Duplicate admission numbers surface later in Merge.</p>',
      confirmLabel: 'Import students', audit: { action: 'student.add', entity: rows.length + ' students', entityType: 'student', schoolId: school.id },
      onConfirm: function () {
        var res = persistStudents(school, rows);
        addState.batch = []; addState.preview = null;
        if (res.persisted) {
          var msg = res.added + ' student(s) added to ' + school.name + '.';
          if (res.skipped) msg += ' ' + res.skipped + ' skipped (duplicate / conflict).';
          toast(msg);
        } else {
          toast(rows.length + ' student(s) imported to ' + school.name + '.');
        }
        go('school', { id: school.id, tab: 'students' });
      } });
  }

  // Write the staged rows into the shared TilliAPI roster so they persist and
  // surface in the teacher/coordinator apps. Only wizard-created schools have a
  // real backing store (and a coordinator/admin to act as); seeded demo schools
  // fall back to the display-only toast.
  function persistStudents(school, rows) {
    if (!(school.created && window.TilliAPI && school.coordinator && school.coordinator.email))
      return { persisted: false };
    var actor = school.coordinator.email, added = 0, skipped = 0;
    rows.forEach(function (r) {
      var parts = String(r.name || '').trim().split(/\s+/);
      var first = parts.shift() || '', last = parts.join(' ');
      var secId = window.TilliAPI.ensureSection(school.id, r.grade || 'Grade 1', r.section || '');
      var out = window.TilliAPI.addStudent({ actorEmail: actor, school_id: school.id, section_id: secId,
        student_id: r.admission, first: first, last: last, grade: r.grade, section: r.section, source: 'admin' });
      if (out && (out.result === 'created' || out.result === 'merged')) added++; else skipped++;
    });
    return { persisted: true, added: added, skipped: skipped };
  }

  // ============================================================
  //  OBSERVATION FORM  (spec §6.2) — Configuration + Results
  // ============================================================
  // Observation Form editor — reached from Templates (it's an Observation-audience
  // template). Owns the shared question bank + per-phase publishing only.
  // Deployment happens via Deployments; responses appear in Deployments → Results.
  SCREEN.observation = function (p, b) {
    var obs = ORG.observation;
    var qRows = obs.questions.map(function (q, i) {
      return '<div class="tl-qrow"><span class="q-n">' + (i + 1) + '</span><span class="q-txt">' + esc(q.text) + '</span>' + skillTagsHtml([q.skill]) + '</div>';
    }).join('');
    var phaseRows = obs.phases.map(function (ph) {
      return '<div class="tl-toggle-row"><div class="tr-body"><b>' + esc(ph.label) + '</b><span>' + (ph.published ? 'Published — deployable from Deployments' : 'Draft — hidden from deployment') + '</span></div>' + switchHtml(ph.published, ' data-obphase="' + ph.key + '"') + '</div>';
    }).join('');

    b.innerHTML = crumbs([{ label: 'Templates', screen: 'templates' }, { label: 'Teacher Observation Form' }]) +
      screenHead('Teacher Observation Form', 'An assessment template — shared question bank, published per phase. Deploy it from Deployments; read responses in Deployments → Results.') +
      '<div class="tl-grid two">' +
        '<div class="tl-card span2"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Question bank</h3><p class="tl-mod-note">' + obs.questions.length + ' active questions, shared across all phases.</p></div>' +
          '<div class="tl-inline-actions"><button class="btn btn-outline btn-sm" id="ob-preview">Preview</button><button class="btn btn-outline btn-sm" id="ob-dlq">Download CSV</button></div></div>' +
          '<div class="tl-qbank">' + qRows + '</div></div>' +
        '<div class="tl-card span2"><div class="tl-mod-h"><div><h3 class="tl-mod-title">Phase publishing</h3><p class="tl-mod-note">Pre / Mid / Post — publishing a phase makes it deployable.</p></div></div>' + phaseRows + '</div>' +
      '</div>';

    wireCrumbs(b);
    b.querySelector('#ob-preview').addEventListener('click', function () { toast('Form preview — opens the respondent view.'); });
    b.querySelector('#ob-dlq').addEventListener('click', function () {
      downloadCsv('observation-questions.csv', ['#', 'Question', 'Skill'], obs.questions.map(function (q, i) { return [i + 1, q.text, q.skill]; }));
    });
    b.querySelectorAll('[data-obphase]').forEach(function (sw) { sw.addEventListener('change', function () {
      ORG.server.setObsPhasePublish(sw.dataset.obphase, sw.checked);
      ORG.server.logAudit(me.name, 'observation.publish', sw.dataset.obphase + ' → ' + (sw.checked ? 'published' : 'draft'), 'template');
      toast('Phase ' + sw.dataset.obphase + (sw.checked ? ' published.' : ' set to draft.'));
    }); });
  };

  // ============================================================
  //  SELF-GUIDED ASSESSMENTS  (spec §6.3) — gamified instruments
  // ============================================================
  // Self-Guided is now a section of the Templates screen; keep this route as an
  // alias so old links and the post-save redirect land on the merged view.
  SCREEN['self-guided'] = function (p, b) { SCREEN.templates(p, b); };

  function openManageGame(id) {
    var g = ORG.selfGuided.find(function (x) { return x.id === id; }); if (!g) return;
    openModal('Manage · ' + g.name,
      '<div class="tl-stack">' +
        '<label class="field">Name<input class="input" id="mg-name" value="' + esc(g.name) + '"></label>' +
        '<label class="field">Full title<input class="input" id="mg-full" value="' + esc(g.full) + '"></label>' +
        '<label class="field">Description<input class="input" id="mg-desc" value="' + esc(g.desc) + '"></label>' +
        '<label class="field">Number of items<input class="input" type="number" min="0" id="mg-items" value="' + g.questions + '"></label>' +
      '</div>' +
      '<div class="tl-toggle-row" style="margin-top:6px"><div class="tr-body"><b>Published</b><span>Available to deploy across schools</span></div>' + switchHtml(g.status === 'Published', ' id="mg-pub"') + '</div>',
      function (close) {
        var nm = (document.getElementById('mg-name').value || '').trim(); if (!nm) { toast('Name is required.'); return false; }
        ORG.server.updateGame(g.id, { name: nm, full: document.getElementById('mg-full').value, desc: document.getElementById('mg-desc').value, questions: Math.max(0, parseInt(document.getElementById('mg-items').value, 10) || 0), status: document.getElementById('mg-pub').checked ? 'Published' : 'Draft' });
        ORG.server.logAudit(me.name, 'selfguided.edit', nm, 'template');
        close(); toast(nm + ' updated.'); go('templates', {});
      }, 'Save changes');
  }

  // ============================================================
  //  MASTER LINKS  (spec §6.5) — hub entry points + per-school
  //  Now a tab under Deployments (§6 merge). Renders into a panel;
  //  the old #/master-links route forwards to the Deployments tab.
  // ============================================================
  function depMasterLinks(p, el) {
    var ml = ORG.masterLinks;
    var actives = ORG.activeSchools();
    var sections = ml.hubs.map(function (hub) {
      var master = ORG.masterLinkUrl('all', hub.slug);
      var perSchool = actives.map(function (s) {
        var url = ORG.masterLinkUrl(s.code, hub.slug);
        return '<div class="tl-linkrow"><div><b>' + esc(s.name) + '</b><span class="mono">' + esc(url) + '</span></div><button class="btn btn-outline btn-sm" data-copy="' + esc(url) + '">Copy Link</button></div>';
      }).join('');
      return '<div class="tl-card" style="margin-top:var(--tl-gap)"><div class="tl-mod-h"><div><h3 class="tl-mod-title">' + esc(hub.label) + ' hub</h3><p class="tl-mod-note">Entry point for ' + esc(hub.label.toLowerCase()) + ' assessments.</p></div></div>' +
        '<div class="tl-linkrow"><div><b>Master link (all schools)</b><span class="mono">' + esc(master) + '</span></div><button class="btn btn-primary btn-sm" data-copy="' + esc(master) + '">Copy Link</button></div>' +
        '<details style="margin-top:8px"><summary class="link-btn" style="cursor:pointer">Per-school links (' + actives.length + ') →</summary>' + perSchool + '</details></div>';
    }).join('');

    el.innerHTML =
      '<div class="tl-card"><div class="tl-toggle-row"><div class="tr-body"><b>Entry points only</b><span>Hide chained follow-up assessments from these links</span></div>' + switchHtml(ml.hideChained, ' id="ml-chain"') + '</div></div>' +
      sections;
    var ch = el.querySelector('#ml-chain'); if (ch) ch.addEventListener('change', function () { ml.hideChained = ch.checked; toast('Entry-points-only ' + (ch.checked ? 'on.' : 'off.')); });
    el.querySelectorAll('[data-copy]').forEach(function (btn) { btn.addEventListener('click', function () { copy(btn.dataset.copy); }); });
  }
  SCREEN['master-links'] = function (p, b) { go('deployments', { tab: 'master-links' }); };

  // Results now live under Deployments (§6 merge). Keep the old #/results route
  // working by forwarding to the Deployments → Results tab, params preserved.
  SCREEN.results = function (p, b) { go('deployments', { tab: 'results', phase: p.phase, q: p.q }); };

  // ---- AI Assistant — intentionally cross-product; deferred per spec §10.1 ----
  SCREEN['ask-tilli'] = function (p, b) { b.innerHTML = phase2('Ask Tilli', 'Cross-product — configures the Ask Tilli product, not Measures (spec §10.1).', ['Deliberately not built here: it belongs to a separate Ask Tilli admin', 'Kept in this nav for now; revisit when Ask Tilli gets its own surface']); };
  SCREEN.knowledge = function (p, b) { b.innerHTML = phase2('Knowledge Base', 'Cross-product — knowledge sources powering Ask Tilli (spec §10.1).', ['Deliberately not built here: it configures Ask Tilli, not Measures', 'Candidate to split into a separate admin']); };

  // ============================================================
  //  CREATE FLOWS  (New Template / Deployment / Group)
  // ============================================================
  function openNewTemplate() {
    var audOpts = ['Teacher', 'Parent', 'Direct Assessment'].map(function (a) { return '<option>' + a + '</option>'; }).join('');
    var phOpts = ['Baseline', 'Midline', 'Endline'].map(function (a) { return '<option>' + a + '</option>'; }).join('');
    openModal('New template', '<p class="tl-muted">Create an assessment template. <span class="tl-gated">gated</span></p><div class="tl-stack">' +
      '<label class="field">Title<input class="input" id="nt-title" placeholder="e.g. Endline · Parent Report"></label>' +
      '<div style="display:flex;gap:10px"><label class="field" style="flex:1">Audience<select class="select" id="nt-aud">' + audOpts + '</select></label>' +
      '<label class="field" style="flex:1">Phase<select class="select" id="nt-phase">' + phOpts + '</select></label></div>' +
      '<label class="field">Description<input class="input" id="nt-desc" placeholder="Short description"></label>' +
      '<label class="field">Status<select class="select" id="nt-status"><option>Draft</option><option>Published</option></select></label>' +
      '</div>', function (close) {
        var title = (document.getElementById('nt-title').value || '').trim();
        if (!title) { toast('Title is required.'); return false; }
        var t = ORG.server.createTemplate({ title: title, audience: document.getElementById('nt-aud').value, phase: document.getElementById('nt-phase').value, desc: document.getElementById('nt-desc').value.trim(), status: document.getElementById('nt-status').value });
        ORG.server.logAudit(me.name, 'template.create', t.title, 'template');
        close(); toast('Template “' + t.title + '” created.'); go('templates', {});
      }, 'Create template');
  }

  function openTemplateMenu(id) {
    var t = ORG.templates.find(function (x) { return x.id === id; }); if (!t) return;
    var pubLabel = t.status === 'Published' ? 'Unpublish' : 'Publish';
    openModal('Template · ' + t.title, '<p class="tl-muted">' + esc(t.audience) + ' · ' + esc(t.phase) + ' · ' + statusPill(t.status, t.status === 'Published' ? 'ok' : 'warn') + '</p>' +
      '<div class="tl-stack"><button class="btn btn-outline block" id="tm-edit">Edit</button>' +
      '<button class="btn btn-outline block" id="tm-dup">Duplicate</button>' +
      '<button class="btn btn-outline block" id="tm-pub">' + pubLabel + '</button>' +
      '<button class="btn btn-danger block" id="tm-del">Delete</button></div>', function (close) { close(); return true; }, 'Close');
    setTimeout(function () {
      document.getElementById('tm-edit').addEventListener('click', function () { openTemplateEditor(t); });
      document.getElementById('tm-dup').addEventListener('click', function () { var c = ORG.server.createTemplate({ title: t.title + ' (copy)', audience: t.audience, phase: t.phase, desc: t.desc, status: 'Draft' }); ORG.server.logAudit(me.name, 'template.duplicate', c.title, 'template'); document.getElementById('tl-modal-root').innerHTML = ''; toast('Duplicated.'); go('templates', {}); });
      document.getElementById('tm-pub').addEventListener('click', function () { ORG.server.publishTemplate(t.id, t.status !== 'Published'); ORG.server.logAudit(me.name, 'template.publish', t.title + ' → ' + t.status, 'template'); document.getElementById('tl-modal-root').innerHTML = ''; toast('Template ' + (t.status === 'Published' ? 'published.' : 'unpublished.')); go('templates', {}); });
      document.getElementById('tm-del').addEventListener('click', function () { document.getElementById('tl-modal-root').innerHTML = ''; gated({ title: 'Delete template', danger: true, typed: 'DELETE', body: '<p>Delete <b>' + esc(t.title) + '</b>? This cannot be undone.</p>', confirmLabel: 'Delete template', audit: { action: 'template.delete', entity: t.title, entityType: 'template' }, onConfirm: function () { ORG.server.deleteTemplate(t.id); toast('Template deleted.'); go('templates', {}); } }); });
    }, 0);
  }

  // ---- Super-Admin editors (v1: full access — these actually write) ----
  function openTemplateEditor(t) {
    var audOpts = ['Teacher', 'Parent', 'Direct Assessment'].map(function (a) { return '<option' + (t.audience === a ? ' selected' : '') + '>' + a + '</option>'; }).join('');
    var phOpts = ['Baseline', 'Midline', 'Endline'].map(function (a) { return '<option' + (t.phase === a ? ' selected' : '') + '>' + a + '</option>'; }).join('');
    openModal('Edit template', '<div class="tl-stack">' +
      '<label class="field">Title<input class="input" id="et-title" value="' + esc(t.title) + '"></label>' +
      '<div style="display:flex;gap:10px"><label class="field" style="flex:1">Audience<select class="select" id="et-aud">' + audOpts + '</select></label>' +
      '<label class="field" style="flex:1">Phase<select class="select" id="et-phase">' + phOpts + '</select></label></div>' +
      '<label class="field">Description<input class="input" id="et-desc" value="' + esc(t.desc) + '"></label>' +
      '<label class="field">Status<select class="select" id="et-status"><option' + (t.status === 'Draft' ? ' selected' : '') + '>Draft</option><option' + (t.status === 'Published' ? ' selected' : '') + '>Published</option></select></label>' +
      '</div>', function (close) {
        var title = (document.getElementById('et-title').value || '').trim(); if (!title) { toast('Title is required.'); return false; }
        ORG.server.updateTemplate(t.id, { title: title, audience: document.getElementById('et-aud').value, phase: document.getElementById('et-phase').value, desc: document.getElementById('et-desc').value, status: document.getElementById('et-status').value });
        ORG.server.logAudit(me.name, 'template.edit', title, 'template');
        close(); toast('Template updated.'); go('templates', {});
      }, 'Save changes');
  }

  function openSchoolEditor(s) {
    var groupOpts = ORG.groups.map(function (g) { return '<option value="' + g.id + '"' + (s.groupId === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('');
    openModal('Edit school', '<div class="tl-stack">' +
      '<label class="field">School name<input class="input" id="es-name" value="' + esc(s.name) + '"></label>' +
      '<label class="field">Type<input class="input" id="es-type" value="' + esc(s.type) + '"></label>' +
      '<div style="display:flex;gap:10px"><label class="field" style="flex:1">City<input class="input" id="es-city" value="' + esc(s.city) + '"></label>' +
      '<label class="field" style="flex:1">Country<input class="input" id="es-country" value="' + esc(s.country) + '"></label></div>' +
      '<label class="field">Group<select class="select" id="es-group">' + groupOpts + '</select></label>' +
      '</div>', function (close) {
        var nm = (document.getElementById('es-name').value || '').trim(); if (!nm) { toast('School name is required.'); return false; }
        var country = document.getElementById('es-country').value;
        ORG.server.updateSchool(s.id, { name: nm, type: document.getElementById('es-type').value, city: document.getElementById('es-city').value, country: country, region: country, groupId: document.getElementById('es-group').value });
        ORG.server.logAudit(me.name, 'school.edit', nm, 'school', s.id);
        close(); toast('School updated.'); go('school', { id: s.id });
      }, 'Save changes');
  }

  function openRoleEditor(u, after) {
    if (!u) { toast('User not found.'); return; }
    var roleOpts = ORG.roles.map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + (r === 'none' ? 'No role' : r) + '</option>'; }).join('');
    openModal('Change role · ' + u.name, '<p class="tl-muted">' + esc(u.email) + '</p><label class="field">Role<select class="select" id="rr-role">' + roleOpts + '</select>' +
      '<span class="tl-rolecap" id="rr-rolecap">' + esc(roleCap(u.role)) + '</span></label>', function (close) {
      var role = document.getElementById('rr-role').value;
      ORG.server.setUserRole(u.email, role);
      ORG.server.logAudit(me.name, 'role.change', u.name + ' → ' + (role === 'none' ? 'No role' : role), 'user', u.schoolId || null);
      close(); toast('Role updated.'); if (after) after();
    }, 'Save');
    var rrRole = document.getElementById('rr-role'), rrCap = document.getElementById('rr-rolecap');
    if (rrRole && rrCap) rrRole.addEventListener('change', function () { rrCap.textContent = roleCap(rrRole.value); });
  }

  function openStudentEditor(schoolId, adm, after) {
    var st = (TS && TS.students) ? TS.students.find(function (x) { return x.adm === adm; }) : null;
    if (!st) { toast('This roster is read-only in the demo.'); return; }
    openModal('Edit student', '<div class="tl-stack">' +
      '<div style="display:flex;gap:10px"><label class="field" style="flex:1">First name<input class="input" id="st-first" value="' + esc(st.first) + '"></label>' +
      '<label class="field" style="flex:1">Last name<input class="input" id="st-last" value="' + esc(st.last) + '"></label></div>' +
      '<label class="field">Admission #<input class="input" id="st-adm" value="' + esc(st.adm) + '"></label>' +
      '<div style="display:flex;gap:10px"><label class="field" style="flex:1">Grade<input class="input" id="st-grade" value="' + esc(st.grade) + '"></label>' +
      '<label class="field" style="flex:1">Section<input class="input" id="st-sec" value="' + esc(st.section) + '"></label></div>' +
      '</div>', function (close) {
        st.first = document.getElementById('st-first').value; st.last = document.getElementById('st-last').value;
        st.adm = document.getElementById('st-adm').value; st.grade = document.getElementById('st-grade').value; st.section = document.getElementById('st-sec').value;
        ORG.server.logAudit(me.name, 'student.edit', st.first + ' ' + st.last, 'student', schoolId);
        close(); toast('Student updated.'); if (after) after();
      }, 'Save changes');
  }

  function openStructureEditor(s) {
    var tree = s.structure.grades.length ? s.structure.grades.map(function (g) {
      var body = g.sections.length
        ? g.sections.map(function (sec) { return '<span class="tl-tree-sec">' + esc(sec.name) + ' <i>' + sec.students + '</i></span>'; }).join('')
        : '<span class="tl-tree-sec">No sections <i>' + (parseInt(g.students, 10) || 0) + '</i></span>';
      return '<div class="tl-tree-grade"><b>' + esc(g.grade) + '</b>' + body +
        '<button class="link-btn" data-addsec="' + esc(g.grade) + '">+ Section</button></div>';
    }).join('') : '<div class="tl-empty">No grades yet — add one below.</div>';
    openModal('Grades & sections · ' + s.name,
      '<div class="tl-tree" style="margin-bottom:16px">' + tree + '</div>' +
      '<div style="display:flex;gap:8px"><input class="input grow" id="sg-newgrade" placeholder="New grade (e.g. Grade 6)"><button class="btn btn-outline btn-sm" id="sg-addgrade">Add grade</button></div>',
      function (close) { close(); return true; }, 'Done');
    setTimeout(function () {
      document.querySelectorAll('[data-addsec]').forEach(function (b) { b.addEventListener('click', function () {
        ORG.server.addSection(s.id, b.dataset.addsec); ORG.server.logAudit(me.name, 'school.structure', 'section added to ' + b.dataset.addsec, 'school', s.id); openStructureEditor(s);
      }); });
      var ag = document.getElementById('sg-addgrade'); if (ag) ag.addEventListener('click', function () {
        var nm = (document.getElementById('sg-newgrade').value || '').trim(); if (!nm) { toast('Grade name required.'); return; }
        ORG.server.addGrade(s.id, nm); ORG.server.logAudit(me.name, 'school.structure', 'grade ' + nm + ' added', 'school', s.id); openStructureEditor(s);
      });
    }, 0);
  }

  function openNewDeployment(schoolId, afterHub) {
    var schoolOpts = '<option value="">— Select school —</option>' + ORG.activeSchools().map(function (s) { return '<option value="' + s.id + '"' + (s.id === schoolId ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('');
    var tplOpts = ORG.templates.map(function (t) { return '<option value="' + esc(t.title) + '" data-aud="' + esc(t.audience) + '" data-phase="' + esc(t.phase) + '">' + esc(t.title) + '</option>'; }).join('');
    openModal('New deployment', '<p class="tl-muted">Deploy an assessment to a school. Status is derived from the window + publish state. <span class="tl-gated">gated</span></p><div class="tl-stack">' +
      '<label class="field">School<select class="select" id="nd-school">' + schoolOpts + '</select></label>' +
      '<label class="field">Assessment<select class="select" id="nd-assess">' + tplOpts + '</select></label>' +
      '<div style="display:flex;gap:10px"><label class="field" style="flex:1">Audience<select class="select" id="nd-aud"><option>Teacher</option><option>Parent</option><option>Direct Assessment</option></select></label>' +
      '<label class="field" style="flex:1">Phase<select class="select" id="nd-phase"><option>Baseline</option><option>Midline</option><option>Endline</option></select></label></div>' +
      '<div style="display:flex;gap:10px"><label class="field" style="flex:1">Start<input class="input" type="date" id="nd-start" value="' + TODAY_ISO + '"></label>' +
      '<label class="field" style="flex:1">End<input class="input" type="date" id="nd-end" value="' + isoPlus(14) + '"></label></div>' +
      '<div class="tl-toggle-row" style="border:none;padding:4px 0"><div class="tr-body"><b>Publish now</b><span>Unpublished deployments stay Scheduled.</span></div>' + switchHtml(true, ' id="nd-pub"') + '</div>' +
      '</div>', function (close) {
        var sid = document.getElementById('nd-school').value;
        if (!sid) { toast('Select a school.'); return false; }
        var assess = document.getElementById('nd-assess');
        var d = ORG.server.createDeployment({ schoolId: sid, assessment: assess.value || 'Assessment', audience: document.getElementById('nd-aud').value, phase: document.getElementById('nd-phase').value, start: document.getElementById('nd-start').value, end: document.getElementById('nd-end').value, published: document.getElementById('nd-pub').checked });
        var s = ORG.byId(sid);
        ORG.server.logAudit(me.name, 'deployment.create', d.assessment + ' (' + (s ? s.name : '') + ')', 'deployment', sid);
        close(); toast('Deployment created — ' + d.status + '.');
        if (afterHub) go('school', { id: sid, tab: 'assessments' }); else go('deployments', {});
      }, 'Create deployment');
    setTimeout(function () { var a = document.getElementById('nd-assess'); if (a) a.addEventListener('change', function () { var o = a.options[a.selectedIndex]; if (o.dataset.aud) document.getElementById('nd-aud').value = o.dataset.aud; if (o.dataset.phase) document.getElementById('nd-phase').value = o.dataset.phase; }); }, 0);
  }

  function openNewGroup() {
    openModal('New school group', '<p class="tl-muted">Groups let you manage related schools together. <span class="tl-gated">gated</span></p>' +
      '<label class="field">Group name<input class="input" id="ng-name" placeholder="e.g. Coastal Schools Trust"></label>', function (close) {
        var nm = (document.getElementById('ng-name').value || '').trim();
        if (!nm) { toast('Group name is required.'); return false; }
        var g = ORG.server.createGroup(nm); ORG.server.logAudit(me.name, 'group.create', g.name, 'group');
        close(); toast('Group “' + g.name + '” created.'); go('schools', {});
      }, 'Create group');
  }

  // ---------- shared Phase-2 utils ----------
  var TODAY_ISO = ORG.iso(new Date('2026-08-27T00:00:00'));
  function isoPlus(days) { return ORG.iso(new Date(new Date('2026-08-27T00:00:00').getTime() + days * 86400000)); }
  function switchHtml(checked, attrs) {
    return '<label class="tl-switch"><input type="checkbox"' + (checked ? ' checked' : '') + (attrs || '') + '><span class="track"></span><span class="thumb"></span></label>';
  }
  var SEL_KEYS = ['SEL', 'Self-Awareness', 'Self-Management', 'Social Awareness', 'Relationship Skills', 'Responsible Decisions'];
  function skillTagsHtml(skills) {
    return '<div class="tl-skilltags">' + skills.map(function (s) {
      var cls = s === 'Cognitive' || ['Working Memory', 'Inhibitory Control', 'Cognitive Flexibility'].indexOf(s) >= 0 ? 'cog' : (SEL_KEYS.indexOf(s) >= 0 ? 'sel' : '');
      return '<span class="tl-skilltag ' + cls + '">' + esc(s) + '</span>';
    }).join('') + '</div>';
  }
  function csvEscape(v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadCsv(filename, headers, rows) {
    var lines = [headers.map(csvEscape).join(',')].concat(rows.map(function (r) { return r.map(csvEscape).join(','); }));
    try {
      var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      toast('Downloaded ' + filename);
    } catch (e) { toast('Export not supported in this browser.'); }
  }

  // ---------- clipboard ----------
  function copy(text, msg) { var ok = msg || 'Link copied.'; try { navigator.clipboard.writeText(text).then(function () { toast(ok); }, function () { toast('Copy failed.'); }); } catch (e) { toast('Copy not supported.'); } }

  // ---------- boot ----------
  window.addEventListener('hashchange', render);
  if (!location.hash) location.replace('#/controlroom');
  render();
})();
