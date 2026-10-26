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
   Form, Self-Guided, Results & Data) and the New
   Template / Deployment / Group flows. AI Assistant (Ask Tilli /
   Knowledge Base) stays a deliberate cross-product placeholder (§10.1).
   ============================================================ */
(function () {
  'use strict';

  var ORG = window.TILLI_ORG;
  var TS = window.TILLI_SCHOOL;
  var app = document.getElementById('tl-app');
  if (!ORG) { app.innerHTML = '<div class="ui-empty">Org data not loaded.</div>'; return; }

  // ---------- identity (single Super Admin in v1) ----------
  var qp = new URLSearchParams(location.search);
  var session = null; try { session = JSON.parse(localStorage.getItem('tilliMeasures.session') || 'null'); } catch (e) {}
  var email = qp.get('email') || (session && session.email) || 'team@tilli.org';
  var me = { name: 'Tilli Team', email: email, role: 'Super Admin' };

  // ---------- School Group Admin mode ----------
  // tilli.html?group=<id> renders this same app scoped to one group's schools:
  // Group Overview + Change History + a read-only school drill-in. A Super
  // Admin can preview it (&from=tilli) and keeps their own identity.
  var GROUP = (function () {
    var id = qp.get('group'), g = id && ORG.groupById(id);
    return g && g.id === id && id !== 'g-none' ? g : null;
  })();
  var groupPreview = !!GROUP && qp.get('from') === 'tilli';
  if (GROUP && !groupPreview) {
    var gAcct = (window.TilliAPI && window.TilliAPI.getAccount) ? window.TilliAPI.getAccount(email) : null;
    me = { name: (gAcct && gAcct.name) || GROUP.name + ' admin', email: email, role: 'School Group Admin' };
  }
  // Every change made from this console is logged under this person.
  if (window.TilliAPI && window.TilliAPI.setHistoryActor) window.TilliAPI.setHistoryActor({ email: me.email, name: me.name, role: GROUP && !groupPreview ? 'group' : 'tilli' });

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
    'School Admin':       'Adds teachers and students, and shares the school code so teachers can self-add.',
    'Teacher':            'Joins with the school code and adds their own students. Cannot invite other staff.',
    'none':               'No access yet — assign a role before this person can sign in.'
  };
  function roleCap(role) { return ROLE_CAPS[role] || ''; }

  // ---------- small utils ----------
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  function initials(name) { return String(name || '').trim().split(/\s+/).map(function (w) { return w[0] || ''; }).slice(0, 2).join(''); }
  var pct = function (n) { return Math.max(0, Math.min(100, Math.round(n))); };
  var sum = function (arr, f) { return arr.reduce(function (a, x) { return a + (f ? f(x) : x); }, 0); };
  // Chart / illustration palette for the student report — exact hex art values,
  // kept in ONE place. (UI chrome uses tokens; perspectives use TilliPalette.)
  var CHART = {
    selIcon: '#E1543E',   // heart icon · Social-Emotional section
    cogIcon: '#4A90D9',   // brain icon · Cognitive section
    sel: '#56C02B',       // Social-Emotional progress line
    cog: '#4A90D9',       // Cognitive progress line
  };
  var toastTimer;
  function toast(msg) { var t = document.getElementById('tl-toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function timeAgo(ms) {
    var s = Math.round((Date.now() - ms) / 1000); if (isNaN(s) || s < 0) s = 0;
    var h = Math.floor(s / 3600), d = Math.floor(h / 24);
    if (d >= 1) return d + 'd ago'; if (h >= 1) return h + 'h ago';
    var m = Math.floor(s / 60); return m <= 1 ? 'just now' : m + 'm ago';
  }
  function statusChip(status) { var m = ORG.status[status] || ORG.status.quiet; return '<span class="ui-chip ' + m.chip + '"><span class="dot"></span>' + m.label + '</span>'; }
  function statusPill(txt, tone) { return '<span class="ui-chip ' + (tone || '') + '">' + esc(txt) + '</span>'; }

  // ---------- icons ----------
  var ICONS = {
    // layout toggle (Templates)
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
    // row actions (Users & Invitations tables, Templates list)
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    role: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M3 20a6 6 0 0 1 9.5-4.9"/><path d="M17.5 13.5l3 3-5 5H12.5v-3z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/><line x1="10" y1="11" x2="10" y2="16"/><line x1="14" y1="11" x2="14" y2="16"/></svg>',
    resend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>',
    revoke: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    controlroom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 18 0"/><line x1="12" y1="12" x2="16" y2="10"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><rect x="5" y="10" width="3" height="8"/><rect x="10.5" y="5" width="3" height="13"/><rect x="16" y="13" width="3" height="5"/></svg>',
    schools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><rect x="9.5" y="13" width="5" height="8"/></svg>',
    students: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    assessments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17.5" cy="9" r="2.6"/><path d="M16 14.4a4.6 4.6 0 0 1 5 4.1"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2 5 4-12 2 7h6"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="12" rx="3"/><line x1="12" y1="3" x2="12" y2="7"/><circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/></svg>',
  };

  // ---------- navigation (grouped sections) ----------
  // Each item: {key(=screen), label}. Sections group them in the sidebar.
  var NAV = [
    { icon: 'controlroom', items: [{ key: 'controlroom', label: 'Control Room' }] },
    { icon: 'analytics',   items: [{ key: 'analytics', label: 'Analytics' }] },
    { icon: 'schools', title: 'Schools', items: [{ key: 'schools', label: 'All Schools' }, { key: 'history', label: 'Change History' }] },
    // Students (Directory / Add / Merge) are no longer a global section — they
    // live inside each School Hub → Students tab, scoped to that school.
    // Observation Form is no longer its own surface — it's an Observation-audience
    // template (edited under Templates), deployed via Deployments, and its
    // responses live in Deployments → Results. Teacher Reflection Questions are
    // likewise a card on Templates rather than their own nav item.
    { icon: 'assessments', title: 'Assessments', items: [
      { key: 'templates', label: 'Templates' },
      { key: 'deployments', label: 'Deployments' },
    ] },
    { icon: 'people', title: 'People', items: [
      // Users + Invitations are one page with tabs; #/invitations is the second tab.
      { key: 'users', label: 'Users & Invitations' },
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
  // Group mode: a deliberately small surface — overview, history, school drill-in.
  var GROUP_NAV = [
    { icon: 'controlroom', items: [{ key: 'groupoverview', label: 'Group Overview' }] },
    { icon: 'history', items: [{ key: 'history', label: 'Change History' }] },
  ];
  var GROUP_BOTTOM = [
    { key: 'groupoverview', label: 'Overview', icon: 'controlroom' },
    { key: 'history', label: 'History', icon: 'history' },
  ];
  var GROUP_SCREENS = { groupoverview: 1, gschool: 1, history: 1 };
  var HOME = GROUP ? 'groupoverview' : 'controlroom';

  // ---------- router ----------
  function buildHash(screen, params) {
    var q = Object.keys(params || {}).filter(function (k) { return params[k] !== '' && params[k] != null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    return '#/' + screen + (q ? '?' + q : '');
  }
  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var qi = h.indexOf('?');
    var screen = (qi < 0 ? h : h.slice(0, qi)) || HOME;
    var params = {};
    if (qi >= 0) h.slice(qi + 1).split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='); var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)); params[k] = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1)); });
    if (!SCREEN[screen]) screen = HOME;
    // Group mode only reaches its own screens; the Super Admin console never shows the group ones.
    if (GROUP ? !GROUP_SCREENS[screen] : (screen === 'groupoverview' || screen === 'gschool')) screen = HOME;
    return { screen: screen, params: params };
  }
  // Same address → no hashchange fires, so redraw directly (e.g. after an action
  // that should refresh the screen you're already on).
  function go(screen, params) { var h = buildHash(screen, params); if (location.hash === h) render(); else location.hash = h; }
  function href(screen, params) { return buildHash(screen, params); }

  // ---------- chrome ----------
  // Which nav item is active for a given screen (hub → schools, etc).
  var SCREEN_PARENT = { school: 'schools', group: 'schools', student: 'schools', directory: 'schools', 'add-students': 'schools', merge: 'schools', 'class-sizes': 'schools', search: 'controlroom',
    observation: 'templates', template: 'templates', reflection: 'templates', invitations: 'users', results: 'deployments', 'master-links': 'schools', gschool: 'groupoverview' };
  function navKeyFor(screen) { return SCREEN_PARENT[screen] || screen; }

  function chrome(r) {
    var active = navKeyFor(r.screen);
    var nav = (GROUP ? GROUP_NAV : NAV).map(function (sec) {
      var items = sec.items.map(function (n) {
        var badge = navBadge(n.key);
        return '<button class="ui-nav-item' + (n.key === active ? ' on' : '') + (sec.title ? ' sub' : '') + '" data-nav="' + n.key + '">' +
          (sec.title ? '' : '<span class="ic">' + ICONS[sec.icon] + '</span>') + esc(n.label) +
          (badge ? '<span class="tl-nav-badge">' + badge + '</span>' : '') + '</button>';
      }).join('');
      // Section header rows get the section icon inline.
      var iconHead = sec.title ? '<div class="tl-nav-head"><span class="ic">' + ICONS[sec.icon] + '</span>' + esc(sec.title) + '</div>' : '';
      return (sec.title ? iconHead : '') + items;
    }).join('');

    var roleLabel = GROUP ? 'School Group Admin' + (groupPreview ? ' · preview' : '') : 'Super Admin';
    var side = '<aside class="ui-side tl-side">' +
      '<span class="lockup"><img src="_ds/tilli/assets/logos/tilli-wordmark-crop.png" alt="Tilli"><span class="divider"></span><span class="measures">Measures</span></span>' +
      '<span class="ui-tag green tl-badge-int">' + (GROUP ? esc(GROUP.name) : 'Platform Admin') + '</span>' +
      '<nav class="ui-nav">' + nav + '</nav>' +
      // Bottom-left profile, same on every dashboard; opens the account menu.
      '<div class="ui-side-bottom">' +
        '<button class="ui-side-profile" id="tl-acct-btn" aria-label="Account menu" title="' + (GROUP
          ? 'School Group Admin · every school in ' + esc(GROUP.name) + '.' + (groupPreview ? ' Previewing as Tilli Team.' : '')
          : 'Tilli Team · internal platform admin. The layer above school admins.') + '">' +
          '<span class="ui-avatar sm">' + esc(initials(me.name).toUpperCase()) + '</span>' +
          '<span class="meta"><b>' + esc(me.name) + '</b><span>' + roleLabel + '</span></span><span class="chev">⋯</span>' +
        '</button></div></aside>';

    // No top-bar search (finding a school lives in the Control Room). Without a
    // group title the header only carries the phone avatar, so it hides on desktop.
    var header = '<header class="ui-header tl-header' + (GROUP ? '' : ' tl-header-bare') + '">' +
      (GROUP ? '<div class="tl-search tl-group-title">' + esc(GROUP.name) + '</div>' : '') +
      '<div class="tl-h-actions">' +
        // Phone only (sidebar hidden): the avatar stands in for the sidebar profile.
        '<button class="ui-avatar tl-acct-m" id="tl-acct-btn-m" aria-label="Account menu">' + esc(initials(me.name).toUpperCase()) + '</button></div></header>';

    var bottom = '<nav class="ui-bottomnav tl-bottomnav">' + (GROUP ? GROUP_BOTTOM : BOTTOM).map(function (n) {
      return '<button class="' + (n.key === active ? 'on' : '') + '" data-nav="' + n.key + '">' + ICONS[n.icon] + '<span>' + esc(n.label) + '</span></button>';
    }).join('') + '</nav>';

    return side + '<div><div style="position:relative">' + header + '</div><main class="tl-main"><div class="tl-wrap" id="tl-body"></div></main>' + bottom + '</div>';
  }

  // Small live counts on nav items (open issues, expiring invites).
  function navBadge(key) {
    if (key === 'issues') { var n = ORG.issues.filter(function (i) { return i.status === 'open'; }).length; return n || ''; }
    // Children a teacher added past their class size, waiting for approval (any school).
    if (key === 'schools' && !GROUP && window.TilliAPI && window.TilliAPI.pendingStudents) return window.TilliAPI.pendingStudents().length || '';
    return '';
  }

  // Group-admin console for an archived group: nothing to manage, just say so.
  function archivedGroupNotice(body) {
    body.innerHTML = '<div class="ui-card tl-archived-notice"><div class="ui-eyebrow">Group archived</div>' +
      '<h1 class="ui-screen-title">' + esc(GROUP.name) + ' has been archived</h1>' +
      '<p class="tl-muted">Its schools, deployments and links are paused' + (GROUP.archivedAt ? ' since ' + esc(fmtJoined(GROUP.archivedAt)) : '') + '. Your data is safe. If this is a mistake or you’re starting a new term, contact the Tilli team at <a href="mailto:info@tillikids.com">info@tillikids.com</a>.</p>' +
      (groupPreview ? '<a class="btn btn-outline btn-sm" href="tilli.html#/group?id=' + encodeURIComponent(GROUP.id) + '" style="text-decoration:none">← Back to Platform Admin</a>' : '') + '</div>';
  }

  function render() {
    var r = currentRoute();
    app.innerHTML = chrome(r);
    var body = document.getElementById('tl-body');
    app.classList.toggle('tl-ask-mode', r.screen === 'ask-tilli' && !GROUP);   // full-height chat layout
    if (GROUP && GROUP.archived) archivedGroupNotice(body);
    else SCREEN[r.screen](r.params, body);
    // wire chrome
    app.querySelectorAll('[data-nav]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.nav, {}); }); });
    ['tl-acct-btn', 'tl-acct-btn-m'].forEach(function (id) {
      var b = document.getElementById(id); if (b) b.addEventListener('click', function (ev) { ev.stopPropagation(); openAcctMenu(b); });
    });
    if (window.TilliFloat) TilliFloat.hideAsk(r.screen === 'ask-tilli');
  }

  // ---------- school typeahead (top-bar search + Control Room "Find a school") ----------
  var TA_MAX = 6;   // schools shown in the suggestion list
  function schoolMatches(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    var starts = function (sc) { return sc.name.toLowerCase().indexOf(q) === 0 ? 0 : 1; };
    return ORG.schools.filter(function (sc) { return (sc.name + ' ' + sc.code + ' ' + (sc.city || '')).toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return starts(a) - starts(b) || (a.archived ? 1 : 0) - (b.archived ? 1 : 0) || a.name.localeCompare(b.name); })
      .slice(0, TA_MAX);
  }
  // opts.onPick(school) — a school row was chosen. opts.onSubmit(q) — optional
  // "See all results" row; without it, plain Enter picks the first match.
  function schoolTypeahead(input, opts) {
    var host = input.parentNode, menu = null, hits = [], idx = -1;
    var rowCount = function () { return hits.length + (opts.onSubmit ? 1 : 0); };
    function close() { if (menu) { menu.remove(); menu = null; } idx = -1; input.setAttribute('aria-expanded', 'false'); }
    function draw() {
      var q = input.value.trim();
      if (!q) { close(); return; }
      hits = schoolMatches(q);
      if (!menu) {
        menu = document.createElement('div'); menu.className = 'ui-menu tl-ta-menu'; menu.setAttribute('role', 'listbox');
        menu.addEventListener('mousedown', function (ev) { ev.preventDefault(); });   // keep focus in the input
        menu.addEventListener('click', function (ev) { var b = ev.target.closest('[data-ta]'); if (b) choose(+b.dataset.ta); });
        host.appendChild(menu);
      }
      menu.innerHTML = (hits.length ? hits.map(function (sc, i) {
        return '<button type="button" role="option" class="ui-menu-item tl-ta-item' + (i === idx ? ' on' : '') + '" data-ta="' + i + '">' +
          '<span class="tl-ta-name">' + esc(sc.name) + (sc.archived ? ' <span class="ui-chip muted">Archived</span>' : '') + '</span>' +
          '<span class="tl-ta-sub">' + esc([sc.code, sc.city, sc.country].filter(Boolean).join(' · ')) + '</span></button>';
      }).join('') : '<div class="tl-ta-empty">No school matches “' + esc(q) + '”.</div>') +
        (opts.onSubmit ? '<button type="button" role="option" class="ui-menu-item tl-ta-all' + (idx === hits.length ? ' on' : '') + '" data-ta="' + hits.length + '">See all results for “' + esc(q) + '” →</button>' : '');
      input.setAttribute('aria-expanded', 'true');
    }
    function choose(i) {
      var q = input.value.trim(); close();
      if (i < hits.length) opts.onPick(hits[i]); else if (opts.onSubmit) opts.onSubmit(q);
    }
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    input.addEventListener('input', function () { idx = -1; draw(); });
    input.addEventListener('focus', function () { if (input.value.trim()) draw(); });
    input.addEventListener('blur', close);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault(); if (!menu) draw(); var n = rowCount(); if (!n) return;
        idx = ev.key === 'ArrowDown' ? (idx + 1) % n : (idx <= 0 ? n - 1 : idx - 1); draw();
      } else if (ev.key === 'Escape') { close(); }
      else if (ev.key === 'Enter') {
        ev.preventDefault(); var q = input.value.trim(); if (!q) return;
        if (!menu) draw();
        if (idx >= 0) choose(idx);
        else if (opts.onSubmit) { close(); opts.onSubmit(q); }
        else if (hits.length) choose(0);
      }
    });
  }

  function openAcctMenu(anchor) {
    if (document.querySelector('.tl-acct-menu')) return;
    var m = document.createElement('div');
    m.className = 'ui-menu ui-acct-menu tl-acct-menu';
    m.innerHTML = '<div class="who"><b>' + esc(me.name) + '</b><span>' + esc(me.email) + '</span></div>' +
      (groupPreview ? '<button class="ui-menu-item" data-am="tilli">← Tilli platform</button>' : '') +
      '<button class="ui-menu-item" data-am="signout">Sign out</button>';
    // Sidebar profile → opens upward from it; phone header avatar → downward, right-aligned.
    var r = anchor.getBoundingClientRect();
    if (anchor.closest('.ui-side')) { m.style.left = r.left + 'px'; m.style.bottom = (window.innerHeight - r.top + 6) + 'px'; }
    else { m.style.right = Math.max(8, window.innerWidth - r.right) + 'px'; m.style.top = (r.bottom + 6) + 'px'; }
    document.body.appendChild(m);
    if (groupPreview) m.querySelector('[data-am="tilli"]').addEventListener('click', function () { location.href = 'tilli.html?email=' + encodeURIComponent(me.email) + '#/group?id=' + encodeURIComponent(GROUP.id); });
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
    root.innerHTML = '<div class="overlay" id="tl-ov"><div class="ui-modal-card">' +
      '<div class="ui-modal-h"><h3>' + esc(opts.title) + '</h3><button class="dialog-close" id="tl-mx" aria-label="Close">×</button></div>' +
      '<div class="tl-confirm-body">' + (opts.body || '') + '</div>' +
      (token ? '<label class="field mt-3">Type <b>' + esc(token) + '</b> to confirm<input class="input" id="tl-confirm-in" autocomplete="off" placeholder="' + esc(token) + '"></label>' +
        '<p id="tl-confirm-err" class="err-text" style="display:none;margin:6px 2px 0">Text doesn\'t match — type <b>' + esc(token) + '</b> exactly to continue.</p>' : '') +
      '<div class="ui-modal-foot">' +
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
  // onSave null → no Cancel / Save footer (the modal's own buttons do the work; × closes).
  function openModal(title, bodyHtml, onSave, saveLabel) {
    var root = document.getElementById('tl-modal-root');
    root.innerHTML = '<div class="overlay" id="tl-ov"><div class="ui-modal-card">' +
      '<div class="ui-modal-h"><h3>' + esc(title) + '</h3><button class="dialog-close" id="tl-mx" aria-label="Close">×</button></div>' +
      bodyHtml +
      (onSave ? '<div class="ui-modal-foot"><button class="btn btn-outline btn-sm" id="tl-cancel">Cancel</button>' +
      '<button class="btn btn-primary btn-sm" id="tl-save">' + esc(saveLabel || 'Save') + '</button></div>' : '') + '</div></div>';
    var ov = document.getElementById('tl-ov');
    function close() { root.innerHTML = ''; }
    ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
    document.getElementById('tl-mx').addEventListener('click', close);
    if (onSave) {
      document.getElementById('tl-cancel').addEventListener('click', close);
      document.getElementById('tl-save').addEventListener('click', function () { if (onSave(close) !== false) {} });
    }
    return close;
  }

  // ---------- shared render bits ----------
  function kpi(num, lbl, delta, deeplink) {
    var d = (delta != null && delta !== 0) ? '<span class="tl-kpi-delta">' + (delta > 0 ? '+' : '') + delta + '</span>' : '';
    var inner = '<div class="num">' + esc(num) + d + '</div><div class="lbl">' + esc(lbl) + '</div>';
    return deeplink ? '<a class="ui-card tight link ui-kpi tl-kpi" href="' + deeplink + '">' + inner + '</a>' : '<div class="ui-card tight ui-kpi tl-kpi">' + inner + '</div>';
  }
  function bar(label, value, cls) {
    return '<div class="tl-bar-row"><div class="tl-bar-lbl" title="' + esc(label) + '">' + esc(label) + '</div>' +
      '<div class="ui-meter lg light"><div class="tl-bar-fill ' + (cls || '') + '" style="width:' + pct(value) + '%"></div></div>' +
      '<div class="tl-bar-val">' + pct(value) + '</div></div>';
  }
  // Social-Emotional / Cognitive outcome bars (same look as Analytics → Outcomes
  // by region). sel/cog are 0–100 band scores; null = no results yet.
  function outcomesCardHtml(sel, cog, note, extraCls) {
    var body = sel == null && cog == null
      ? '<div class="ui-empty">No outcome results yet — scores appear once a Midline or Endline is complete.</div>'
      : bar('Social-Emotional', sel || 0, 'sel') + bar('Cognitive', cog || 0, 'cog');
    return '<div class="ui-card' + (extraCls ? ' ' + extraCls : '') + '"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Outcomes</h3><p class="ui-mod-note">' + esc(note) + '</p></div></div>' + body + '</div>';
  }
  function avgOutcome(list, key) {
    var xs = list.filter(function (s) { return s[key] != null; });
    return xs.length ? Math.round(xs.reduce(function (a, s) { return a + s[key]; }, 0) / xs.length) : null;
  }
  function screenHead(title, sub, actionsHtml) {
    return '<div class="tl-screen-head">' +
      '<div><h1 class="ui-screen-title">' + esc(title) + '</h1>' + (sub ? '<p class="ui-screen-sub">' + esc(sub) + '</p>' : '') + '</div>' +
      ((actionsHtml || !GROUP) ? '<div class="tl-screen-actions">' + helpBtnHtml() + (actionsHtml || '') + '</div>' : '') + '</div>';
  }
  function crumbs(parts) {
    return '<div class="ui-crumbs">' + parts.map(function (p, i) {
      var sep = i > 0 ? '<span class="sep">/</span>' : '';
      if (!p.screen) return sep + '<span class="cur">' + esc(p.label) + '</span>';
      var pa = p.params ? ' data-crumb-params="' + esc(encodeURIComponent(JSON.stringify(p.params))) + '"' : '';
      return sep + '<button data-crumb="' + p.screen + '"' + pa + '>' + esc(p.label) + '</button>';
    }).join('') + '</div>';
  }
  function wireCrumbs(body) { body.querySelectorAll('[data-crumb]').forEach(function (b) { b.addEventListener('click', function () { var pr = {}; if (b.dataset.crumbParams) { try { pr = JSON.parse(decodeURIComponent(b.dataset.crumbParams)); } catch (e) {} } go(b.dataset.crumb, pr); }); }); }

  var SCREEN = {};

  // ============================================================
  //  1) CONTROL ROOM  (landing — spec §3)
  // ============================================================
  var CARD_META = {
    issues: { icon: '⚠', tone: 'high' }, health: { icon: '❤', tone: 'crit' },
    'zero-students': { icon: '◎', tone: 'warn' }, 'no-role': { icon: '◌', tone: 'low' },
    invites: { icon: '✉', tone: 'warn' }, duplicates: { icon: '⧉', tone: 'warn' },
    drafts: { icon: '✎', tone: 'low' }, deployments: { icon: '⏻', tone: 'warn' },
    'student-requests': { icon: '＋', tone: 'warn' }, 'short-classes': { icon: '▢', tone: 'low' }, 'year-requests': { icon: '↻', tone: 'warn' }, calendars: { icon: '📅', tone: 'warn' },
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

    // School-side changes first: the 10 newest Change History rows across active schools.
    var recent = histList(ORG.server.history(ORG.activeSchools().map(function (s) { return s.id; }), { limit: 10 }),
      { summary: true, empty: 'No changes at any school yet.' });

    var anyQueue = cr.cards.some(function (c) { return c.key === 'health' ? c.state !== 'healthy' : c.count > 0; });

    body.innerHTML =
      screenHead('Control Room', 'What needs the team\'s attention right now.',
        '<button class="btn btn-primary btn-sm" data-qa="school">+ Add School</button>' +
        '<button class="btn btn-outline btn-sm" data-qa="invite">+ Invite User</button>' +
        '<button class="btn btn-outline btn-sm" data-qa="deployment">+ Deployment</button>' +
        '<button class="btn btn-outline btn-sm" data-qa="template">+ Template</button>') +
      '<div class="tl-findschool"><span class="ic">' + ICONS.search + '</span>' +
        '<input id="cr-find" class="tl-findschool-in" placeholder="Find a school — name, code or city" autocomplete="off" aria-label="Find a school and open it" title="Type a school name, code or city, then pick it (or press Enter) to open its hub."></div>' +
      (anyQueue ? '' : '<div class="tl-allclear">Nothing needs your attention right now. 🌱</div>') +
      '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Needs attention</h3><p class="ui-mod-note">Each card links to the pre-filtered list that produced it.</p></div></div>' +
        '<div class="tl-queue-grid">' + cards + '</div></div>' +
      '<div class="ui-eyebrow tl-mini-head">Platform stats</div>' +
      '<div class="tl-kpis four">' + stats + '</div>' +
      '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Recent activity</h3><p class="ui-mod-note">The latest changes from schools — student records and assessments.</p></div>' +
        '<a class="btn-link" href="' + href('history', {}) + '">View all →</a></div><div id="cr-recent">' + recent + '</div></div>';

    body.querySelectorAll('[data-qa]').forEach(function (b) { b.addEventListener('click', function () { quickAction(b.dataset.qa); }); });
    var crFind = body.querySelector('#cr-find'); if (crFind) schoolTypeahead(crFind, { onPick: function (sc) { go('school', { id: sc.id }); } });
    if (HU) HU.wireSummary(body.querySelector('#cr-recent'));   // one-line rows → click to expand
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
    // One block per country that has partner schools (India, Sri Lanka, Jordan…).
    var regions = []; schools.forEach(function (s) { if (s.region && regions.indexOf(s.region) < 0) regions.push(s.region); });
    var regionCard = regions.map(function (rg) {
      return '<div style="margin-bottom:6px;font-weight:700;font-size:var(--fs-sm);color:var(--ink-700)">' + rg + '</div>' +
        bar('Social-Emotional', regionAvg(rg, 'sel'), 'sel') + bar('Cognitive', regionAvg(rg, 'cog'), 'cog');
    }).join('<div style="height:10px"></div>');
    // A multi-board school counts once under each of its boards (so bars can sum past the school count).
    var boards = {}; schools.forEach(function (s) { schoolBoardList(s).forEach(function (b) { boards[b] = (boards[b] || 0) + 1; }); });
    var boardMax = Math.max.apply(null, Object.keys(boards).map(function (k) { return boards[k]; })) || 1;
    var boardRows = Object.keys(boards).sort(function (a, b) { return boards[b] - boards[a]; }).map(function (k) {
      return '<div class="tl-bar-row"><div class="tl-bar-lbl">' + esc(k) + '</div><div class="ui-meter lg light"><div class="tl-bar-fill" style="width:' + (boards[k] / boardMax * 100) + '%"></div></div><div class="tl-bar-val">' + boards[k] + '</div></div>';
    }).join('');
    // Completion ranking: schools (top 12) or school groups (average of their
    // schools with completion > 0 — same pool the school ranking uses).
    var rankByGroup = params.rank === 'groups';
    var ranked = schools.slice().filter(function (s) { return s.completion; }).sort(function (a, b) { return b.completion - a.completion; }).slice(0, 12);
    var rankHead, rankRows;
    if (rankByGroup) {
      var gRows = ORG.activeGroups().filter(function (g) { return g.id !== 'g-none'; }).map(function (g) {
        var inG = schools.filter(function (s) { return s.groupId === g.id; });
        var withC = inG.filter(function (s) { return s.completion; });
        var low = withC.slice().sort(function (a, b) { return a.completion - b.completion; })[0];
        return { g: g, n: inG.length, nc: withC.length, students: sum(inG, function (s) { return s.students; }),
          avg: withC.length ? Math.round(sum(withC, function (s) { return s.completion; }) / withC.length) : null, low: low };
      }).filter(function (x) { return x.n; }).sort(function (a, b) { return (b.avg == null ? -1 : b.avg) - (a.avg == null ? -1 : a.avg); });
      rankHead = '<tr><th>School group</th><th>Schools</th><th>Students</th><th>Avg completion</th><th>Lowest school</th></tr>';
      rankRows = gRows.map(function (x) {
        return '<tr class="clickable" data-open-group="' + x.g.id + '"><td class="name">' + esc(x.g.name) + '</td><td class="tl-num">' + x.n + (x.nc < x.n ? '<small>' + x.nc + ' with results</small>' : '') + '</td>' +
          '<td class="tl-num">' + x.students.toLocaleString() + '</td><td class="tl-num">' + (x.avg == null ? '—' : x.avg + '%') + '</td>' +
          '<td>' + (x.low ? esc(x.low.name) + ' <small>' + x.low.completion + '%</small>' : '—') + '</td></tr>';
      }).join('') || '<tr><td colspan="5"><div class="ui-empty">No school groups yet.</div></td></tr>';
    } else {
      rankHead = '<tr><th>School</th><th>Group</th><th>Region</th><th>Completion</th><th>Engagement</th></tr>';
      rankRows = ranked.map(function (s) {
        return '<tr class="clickable" data-open="' + s.id + '"><td class="name">' + esc(s.name) + '</td><td>' + (s.groupId === 'g-none' ? '<span class="text-muted">—</span>' : esc(s.groupName)) + '</td><td>' + esc(s.region) + '</td><td class="tl-num">' + (s.completion ? s.completion + '%' : '—') + '</td><td>' + statusChip(s.status) + '</td></tr>';
      }).join('');
    }
    var rankSeg = '<div class="ui-seg" role="group" aria-label="Rank by">' +
      '<button class="' + (!rankByGroup ? 'on' : '') + '" data-rank="" title="Rank individual schools (top 12)">Schools</button>' +
      '<button class="' + (rankByGroup ? 'on' : '') + '" data-rank="groups" title="Rank school groups by the average completion of their schools">School groups</button></div>';

    body.innerHTML = screenHead('Analytics', 'Rollups across the whole portfolio — outcomes, engagement and rollout.') +
      '<div class="tl-grid two">' +
        '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Outcomes by region</h3><p class="ui-mod-note">Average band across schools with results.</p></div></div>' + regionCard +
          '<div class="ui-legend"><span><i style="background:var(--green-500)"></i>Social-Emotional</span><span><i style="background:var(--cyan-500)"></i>Cognitive</span></div></div>' +
        '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Board mix</h3><p class="ui-mod-note">Partner schools by curriculum board.</p></div></div>' + boardRows + '</div>' +
      '</div>' +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Completion ranking</h3><p class="ui-mod-note">' +
        (rankByGroup ? 'School groups by the average completion of their schools with results, highest first.' : 'Assessment completion, highest first.') + '</p></div>' + rankSeg + '</div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-640 tl-rank-small"><thead>' + rankHead + '</thead><tbody>' + rankRows + '</tbody></table></div></div>';
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { go('school', { id: b.dataset.open }); }); });
    body.querySelectorAll('[data-open-group]').forEach(function (b) { b.addEventListener('click', function () { go('group', { id: b.dataset.openGroup }); }); });
    body.querySelectorAll('[data-rank]').forEach(function (b) { b.addEventListener('click', function () { go('analytics', b.dataset.rank ? { rank: b.dataset.rank } : {}); }); });
  };

  // ============================================================
  //  3) ALL SCHOOLS  (spec §4.1)
  // ============================================================
  var schState = { tab: 'active', view: 'list', q: '', flag: '', country: '' };
  SCREEN.schools = function (params, body) {
    if (params.flag != null) { schState.flag = params.flag; schState.tab = 'active'; }
    var tabActive = schState.tab === 'active';
    // Country switch (school-success feedback: "divide into countries"). Counts
    // follow the Active/Archived tab; every other filter applies inside the country.
    var inTab = ORG.schools.filter(function (s) { return tabActive ? !s.archived : s.archived; });
    var countryCounts = {};
    inTab.forEach(function (s) { var c = s.country || 'Unspecified'; countryCounts[c] = (countryCounts[c] || 0) + 1; });
    var countries = Object.keys(countryCounts).sort(function (a, b) { return countryCounts[b] - countryCounts[a] || a.localeCompare(b); });
    if (schState.country && !countryCounts[schState.country]) schState.country = '';
    var inCountry = function (s) { return !schState.country || (s.country || 'Unspecified') === schState.country; };
    var all = ORG.schools.filter(inCountry);
    var counts = { active: all.filter(function (s) { return !s.archived; }).length, archived: all.filter(function (s) { return s.archived; }).length };

    var q = schState.q.trim().toLowerCase();
    // Top level shows groups + independent schools; searching / archived / flags flatten to a plain list.
    var grouped = !q && !schState.flag;
    var yearAsk = {};
    if (schState.flag === 'year-request' && window.TilliAPI) window.TilliAPI.openYearRequests().forEach(function (r) { yearAsk[r.school_id] = 1; });
    if (schState.flag === 'calendar' && window.TilliAPI) window.TilliAPI.calendarQueue().forEach(function (r) { yearAsk[r.school_id] = 1; });

    // Every school in the current view (tab + country + flag + search) — the flat
    // list, and what the Schools CSV exports even when the screen shows groups.
    var rows = all.filter(function (s) {
      if (tabActive ? s.archived : !s.archived) return false;
      if (schState.flag === 'zero-students' && s.students !== 0) return false;
      if ((schState.flag === 'year-request' || schState.flag === 'calendar') && !yearAsk[s.id]) return false;
      if (q && (s.name + ' ' + s.code).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var content;
    if (grouped && tabActive) {
      var groups = ORG.groups.filter(function (g) { return g.id !== 'g-none' && !g.archived; }).map(function (g) {
        return { g: g, schools: all.filter(function (s) { return !s.archived && s.groupId === g.id; }) };
      }).filter(function (x) { return x.schools.length; });
      var indep = all.filter(function (s) { return !s.archived && s.groupId === 'g-none'; });
      content =
        (groups.length ? '<div class="tl-listgroup-h">School groups <b>' + groups.length + '</b></div>' + groupListHtml(groups, schState.view) : '') +
        '<div class="tl-listgroup-h">Independent schools <b>' + indep.length + '</b></div>' +
        schoolListHtml(indep, schState.view);
    } else if (grouped) {
      // Archived tab: whole archived groups first, then schools archived on their own.
      var agroups = ORG.groups.filter(function (g) { return g.archived; }).map(function (g) {
        return { g: g, schools: all.filter(function (s) { return s.archived && s.groupId === g.id; }) };
      }).filter(function (x) { return x.schools.length || !schState.country; });
      var aGroupIds = agroups.map(function (x) { return x.g.id; });
      var loose = rows.filter(function (s) { return aGroupIds.indexOf(s.groupId) < 0; });
      content = (agroups.length || loose.length)
        ? (agroups.length ? '<div class="tl-listgroup-h">Archived groups <b>' + agroups.length + '</b></div>' + groupListHtml(agroups, schState.view) : '') +
          '<div class="tl-listgroup-h">Archived schools <b>' + loose.length + '</b></div>' + schoolListHtml(loose, schState.view)
        : '<div class="ui-empty">Nothing archived.</div>';
    } else {
      content = rows.length ? schoolListHtml(rows, schState.view)
        : '<div class="ui-empty">' + (all.length ? 'No schools match.' : 'No schools yet — add your first school.') + '</div>';
    }

    var flagName = { 'zero-students': 'schools with 0 students', 'year-request': 'schools asking to start next year', calendar: 'school calendars to review' }[schState.flag];
    var flagBanner = flagName
      ? '<div class="tl-filterbanner">Filtered to <b>' + flagName + '</b> · <button class="btn-link" id="sch-clearflag">clear</button></div>' : '';

    var countrySeg = countries.length > 1 ? '<div class="ui-seg tl-country-seg" role="group" aria-label="Filter by country">' +
      '<button class="' + (!schState.country ? 'on' : '') + '" data-country="" title="Schools in every country">All countries <b>' + inTab.length + '</b></button>' +
      countries.map(function (c) { return '<button class="' + (schState.country === c ? 'on' : '') + '" data-country="' + esc(c) + '" title="Only schools in ' + esc(c) + '">' + esc(c) + ' <b>' + countryCounts[c] + '</b></button>'; }).join('') +
      '</div>' : '';
    body.innerHTML = screenHead('All Schools', ORG.activeSchools().filter(inCountry).length + ' active partner schools ' + (schState.country ? 'in ' + esc(schState.country) + '.' : 'across the portfolio.'),
      '<button class="btn btn-outline btn-sm" id="sch-csv" title="Download every school in this view (tab, country and search apply) as a CSV.">↓ Schools CSV</button>' +
      '<button class="btn btn-outline btn-sm" id="sch-newgroup">New Group</button><button class="btn btn-primary btn-sm" id="sch-add">+ Add School</button>') +
      '<div class="ui-tabs">' +
        '<button class="ui-tab' + (tabActive ? ' on' : '') + '" data-tab="active">Active <b>' + counts.active + '</b></button>' +
        '<button class="ui-tab' + (!tabActive ? ' on' : '') + '" data-tab="archived">Archived <b>' + counts.archived + '</b></button>' +
        '<div class="tl-viewtoggle"><button class="' + (schState.view === 'grid' ? 'on' : '') + '" data-view="grid" title="Grid">▦</button><button class="' + (schState.view === 'list' ? 'on' : '') + '" data-view="list" title="List">☰</button></div>' +
      '</div>' + flagBanner +
      '<div class="tl-filters">' + countrySeg + '<input class="input grow tl-filter-q" id="sch-q" placeholder="Search by school name or code…" value="' + esc(schState.q) + '"></div>' +
      content;

    body.querySelectorAll('[data-group-open]').forEach(function (b) { b.addEventListener('click', function (ev) { if (ev.target.dataset.gmenu) return; go('group', { id: b.dataset.groupOpen }); }); });
    body.querySelectorAll('[data-gmenu]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); openGroupMenu(b.dataset.gmenu); }); });
    body.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { schState.tab = b.dataset.tab; SCREEN.schools({}, body); }); });
    body.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { schState.view = b.dataset.view; SCREEN.schools({}, body); }); });
    body.querySelectorAll('[data-country]').forEach(function (b) { b.addEventListener('click', function () { schState.country = b.dataset.country; SCREEN.schools({}, body); }); });
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); go('school', { id: b.dataset.open }); }); });
    wireIssueChips(body);
    var cf = body.querySelector('#sch-clearflag'); if (cf) cf.addEventListener('click', function () { schState.flag = ''; go('schools', {}); SCREEN.schools({}, body); });
    var addb = body.querySelector('#sch-add'); if (addb) addb.addEventListener('click', openAddSchool);
    var ng = body.querySelector('#sch-newgroup'); if (ng) ng.addEventListener('click', openNewGroup);
    var csvb = body.querySelector('#sch-csv'); if (csvb) csvb.addEventListener('click', function () {
      var name = 'schools-' + (tabActive ? 'active' : 'archived') + (schState.country ? '-' + schState.country.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '') + '.csv';
      exportSchools(rows, name);
    });
    var qi = body.querySelector('#sch-q'); if (qi) qi.addEventListener('input', function () { schState.q = qi.value; var pos = qi.selectionStart; SCREEN.schools({}, body); var nq = body.querySelector('#sch-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  };

  // ---- shared list renderers (schools + groups) ----
  // Red "N open issues" marker — opens the school's Issues & Logs tab.
  function issueChip(id, n) {
    return n ? '<button class="ui-chip danger tl-issue-chip" data-issues-of="' + esc(id) + '" title="' + n + ' open issue' + (n === 1 ? '' : 's') + ' reported from this school — open Issues & Logs">⚠ ' + n + ' open issue' + (n === 1 ? '' : 's') + '</button>' : '';
  }
  function wireIssueChips(root) {
    root.querySelectorAll('[data-issues-of]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); go('school', { id: b.dataset.issuesOf, tab: 'issues' }); }); });
  }
  function schoolListHtml(rows, view) {
    if (!rows.length) return '<div class="ui-empty">No schools here yet.</div>';
    if (view === 'grid') return '<div class="tl-school-grid">' + rows.map(schoolCard).join('') + '</div>';
    return '<div class="ui-tablewrap"><table class="ui-table mw-760"><thead><tr><th>School</th><th>Group</th><th>Location</th><th>Grades</th><th>Students</th><th>Staff</th><th></th></tr></thead><tbody>' +
      rows.map(function (s) {
        return '<tr class="clickable" data-open="' + s.id + '"><td class="name">' + esc(s.name) + ' ' + issueChip(s.id, ORG.server.openIssueCount(s.id)) + '<small>' + esc(s.type) + ' · ' + esc(s.code) + '</small></td>' +
          '<td>' + esc(s.groupName) + '</td><td>' + esc([s.city, s.country].filter(Boolean).join(', ') || '—') + '</td><td class="tl-num">' + s.gradeCount + '</td><td class="tl-num">' + s.students.toLocaleString() + '</td>' +
          '<td class="tl-num">' + s.staff + '</td><td class="r text-muted">›</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function groupAgg(gs) {
    return { schools: gs.length,
      students: gs.reduce(function (a, s) { return a + s.students; }, 0),
      staff: gs.reduce(function (a, s) { return a + s.staff; }, 0) };
  }
  function groupListHtml(groups, view) {
    if (view === 'grid') return '<div class="tl-school-grid">' + groups.map(groupCard).join('') + '</div>';
    return '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Group</th><th>Schools</th><th>Students</th><th>Staff</th><th></th></tr></thead><tbody>' +
      groups.map(function (x) {
        var a = groupAgg(x.schools);
        return '<tr class="clickable" data-group-open="' + x.g.id + '"><td class="name">' + esc(x.g.name) + (x.g.archived ? ' <span class="ui-chip muted">Archived</span>' : '') + '<small>School group</small></td>' +
          '<td class="tl-num">' + a.schools + '</td><td class="tl-num">' + a.students.toLocaleString() + '</td><td class="tl-num">' + a.staff + '</td>' +
          '<td class="r" style="white-space:nowrap"><span class="chip-menu" data-gmenu="' + x.g.id + '">⋮</span> <span class="text-muted">›</span></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function groupCard(x) {
    var a = groupAgg(x.schools);
    return '<div class="tl-school-card is-group" data-group-open="' + x.g.id + '">' +
      '<div class="sc-top"><div class="sc-name">' + esc(x.g.name) + '</div>' + (x.g.archived ? '<span class="ui-chip muted">Archived group</span>' : '<span class="ui-chip ok">Group</span>') + '</div>' +
      '<div class="sc-meta">School group · ' + a.schools + ' school' + (a.schools === 1 ? '' : 's') + '</div>' +
      '<div class="sc-stats"><div><b>' + a.schools + '</b><span>schools</span></div><div><b>' + a.students.toLocaleString() + '</b><span>students</span></div><div><b>' + a.staff + '</b><span>staff</span></div></div>' +
      '<div class="sc-actions"><button class="btn-link" data-gmenu="' + x.g.id + '">Manage</button><span class="sc-open">Open →</span></div></div>';
  }

  // ---- Group detail: schools inside one group (own screen) ----
  var grpState = { tab: 'active', q: '' };
  SCREEN.group = function (params, body) {
    var g = ORG.groupById(params.id);
    if (!g || g.id === 'g-none') { go('schools', {}); return; }
    if (g.archived) grpState.tab = 'archived';   // nothing is active in an archived group
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
        '<a class="btn btn-outline btn-sm" href="tilli.html?group=' + encodeURIComponent(g.id) + '&from=tilli&email=' + encodeURIComponent(me.email) + '" style="text-decoration:none" title="Open the School Group Admin view of this group — what its group admin sees">Group admin view →</a>' +
        '<button class="btn btn-outline btn-sm" id="grp-dl-assess" title="Assessment completion log for every school in this group — responses vs expected per teacher / parent / student assessment.">↓ Assessments CSV</button>' +
        '<button class="btn btn-outline btn-sm" id="grp-dl-staff" title="Every staff member across this group — name, email, role and sections.">↓ Staff CSV</button>' +
        (g.archived ? '' : '<button class="btn btn-outline btn-sm" id="grp-calendar" title="Enter one school calendar and use it for every active school in this group.">One calendar for all</button>') +
        '<button class="btn btn-outline btn-sm" id="grp-manage" title="Rename, archive or delete this group.">Manage ⋯</button>' +
        (g.archived ? '' : '<button class="btn btn-primary btn-sm" id="grp-add">+ Add School</button>')) +
      (g.archived ? '<div class="tl-filterbanner">This group was <b>archived</b>' + (g.archivedAt ? ' on ' + esc(fmtJoined(g.archivedAt)) : '') + ' — its schools are archived and its group admin sees an archived notice. <button class="btn-link" id="grp-unarch">Un-archive group</button></div>' : '') +
      (function () {
        var withRes = inGroup.filter(function (s) { return !s.archived && (s.sel != null || s.cog != null); });
        return outcomesCardHtml(avgOutcome(withRes, 'sel'), avgOutcome(withRes, 'cog'),
          withRes.length ? 'Average band score (0–100) across ' + withRes.length + ' school' + (withRes.length === 1 ? '' : 's') + ' in this group with results.' : 'Average across the group’s schools with results.', 'mb-gap');
      })() +
      (g.archived || !counts.active ? '' : '<div class="ui-card mb-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Group links</h3><p class="ui-mod-note">Share one link with the whole group — each person picks their school first.</p></div></div>' + groupLinksHtml(g) + '</div>') +
      '<div class="ui-tabs">' +
        '<button class="ui-tab' + (grpState.tab === 'active' ? ' on' : '') + '" data-gtab="active">Active <b>' + counts.active + '</b></button>' +
        '<button class="ui-tab' + (grpState.tab === 'archived' ? ' on' : '') + '" data-gtab="archived">Archived <b>' + counts.archived + '</b></button>' +
        '<div class="tl-viewtoggle"><button class="' + (schState.view === 'grid' ? 'on' : '') + '" data-view="grid" title="Grid">▦</button><button class="' + (schState.view === 'list' ? 'on' : '') + '" data-view="list" title="List">☰</button></div>' +
      '</div>' +
      '<div class="tl-filters"><input class="input grow tl-filter-q" id="grp-q" placeholder="Search within ' + esc(g.name) + '…" value="' + esc(grpState.q) + '"></div>' +
      (rows.length ? schoolListHtml(rows, schState.view)
        : '<div class="ui-empty">No schools in this group' + (q ? ' match your search.' : ' yet.') + '</div>');

    wireCrumbs(body);
    body.querySelectorAll('[data-gtab]').forEach(function (b) { b.addEventListener('click', function () { grpState.tab = b.dataset.gtab; SCREEN.group(params, body); }); });
    body.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { schState.view = b.dataset.view; SCREEN.group(params, body); }); });
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); go('school', { id: b.dataset.open }); }); });
    wireIssueChips(body);
    var ab = body.querySelector('#grp-add'); if (ab) ab.addEventListener('click', openAddSchool);
    var gc = body.querySelector('#grp-calendar'); if (gc) gc.addEventListener('click', function () { openGroupCalendar(g, inGroup.filter(function (x) { return !x.archived; })); });
    var ua = body.querySelector('#grp-unarch'); if (ua) ua.addEventListener('click', function () { archiveGroupFlow(g); });
    var gm = body.querySelector('#grp-manage'); if (gm) gm.addEventListener('click', function () { openGroupMenu(g.id); });
    body.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.dataset.copy); }); });
    // Group-wide CSV exports — active schools in this group, regardless of the search filter.
    var groupSchools = inGroup.filter(function (s) { return !s.archived; });
    var slug = g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group';
    var da = body.querySelector('#grp-dl-assess'); if (da) da.addEventListener('click', function () { exportGroupAssessments(groupSchools, slug); });
    var dst = body.querySelector('#grp-dl-staff'); if (dst) dst.addEventListener('click', function () { exportGroupStaff(groupSchools, slug); });
    var qi = body.querySelector('#grp-q'); if (qi) qi.addEventListener('input', function () { grpState.q = qi.value; var pos = qi.selectionStart; SCREEN.group(params, body); var nq = body.querySelector('#grp-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  };

  // All Schools CSV — one row per school in the current view.
  function exportSchools(list, filename) {
    downloadCsv(filename,
      ['School', 'Code', 'Group', 'City', 'Country', 'Type', 'Board', 'Students', 'Staff', 'Grades', 'Sections', 'Completion %', 'Engagement', 'Joined', 'Archived'],
      list.map(function (s) {
        return [s.name, s.code, s.groupName, s.city, s.country, s.type, s.board, s.students, s.staff,
          s.gradeCount, s.sectionCount, s.completion || 0, (ORG.status[s.status] || ORG.status.quiet).label, s.joined, s.archived ? 'Yes' : 'No'];
      }));
  }
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
  // ---- Per-teacher assessment log (school hub → Assessments) ----
  // One row per teacher, one column per teacher-audience deployment. Status per
  // cell follows the check-in rule: Completed = every student in the teacher's
  // sections rated; In progress = at least one; Not started = none.
  var TEACHER_FIRSTS = ['Anita', 'Deepa', 'Farah', 'Kavitha', 'Lakshmi', 'Meena', 'Nalini', 'Priya', 'Revathi', 'Sunita', 'Tharushi', 'Nadeesha', 'Ishara', 'Rekha', 'Shalini', 'Geetha'];
  var TEACHERLOG_TONE = { 'Completed': 'ok', 'In progress': 'warn', 'Not started': 'danger', 'No students': 'muted' };
  var TL_PHASE_ORDER = ['Baseline', 'Midline', 'Endline'];
  function teacherCell(done, expected) {
    var st = !expected ? 'No students' : done >= expected ? 'Completed' : done > 0 ? 'In progress' : 'Not started';
    return { status: st, done: done, expected: expected };
  }
  // → { cols:[{label, phase}], teachers:[{name, email, sections[], students, cells[]}], live:bool }
  function teacherRosterFor(s, d) {
    var API = window.TilliAPI;
    var liveData = (s.created || s.live) && API && API.teachersFor;
    var apiDeps = liveData ? API.getDeployments(s.id).filter(function (x) { return x.audience === 'Teacher' && x.deployed !== false; })
      .sort(function (a, b) { return TL_PHASE_ORDER.indexOf(a.phase) - TL_PHASE_ORDER.indexOf(b.phase); }) : [];
    var mockDeps = (d.deployments || []).filter(function (x) { return x.audience === 'Teacher'; });

    // Teachers + their students: real for live / created schools, generated otherwise.
    var teachers;
    if (liveData) {
      var studs = API.studentsForSchool(s.id), secs = API.sectionsForSchool(s.id);
      teachers = API.teachersFor(s.id).map(function (t) {
        var mine = studs.filter(function (x) { return t.section_ids.indexOf(x.section_id) >= 0; });
        return { name: t.name, email: t.email, ids: mine.map(function (x) { return x.student_id; }), students: mine.length,
          sections: t.section_ids.map(function (id) { var v = secs.find(function (x) { return x.section_id === id; }); return v ? v.name : null; }).filter(Boolean) };
      });
    } else {
      var secList = [];
      ((s.structure && s.structure.grades) || []).forEach(function (g) {
        if (g.sections.length) g.sections.forEach(function (sec) { secList.push({ label: g.grade + ' ' + sec.name, students: sec.students || 0 }); });
        else secList.push({ label: g.grade, students: parseInt(g.students, 10) || 0 });
      });
      var n = Math.min(secList.length, Math.max(1, (s.staff || 1) - 1)), rnd = seededRng(strSeed(s.code + '|teachers')), used = {};
      teachers = [];
      for (var i = 0; i < n; i++) {
        var nm; do { nm = TEACHER_FIRSTS[Math.floor(rnd() * TEACHER_FIRSTS.length)] + ' ' + ROSTER_LASTS[Math.floor(rnd() * ROSTER_LASTS.length)]; } while (used[nm] && Object.keys(used).length < 200);
        used[nm] = 1;
        teachers.push({ name: nm, email: nm.toLowerCase().replace(/\s+/g, '.') + '@' + s.code.toLowerCase().split('-')[0] + '.edu', sections: [], students: 0 });
      }
      secList.forEach(function (sec, k) { if (!teachers.length) return; var t = teachers[k % teachers.length]; t.sections.push(sec.label); t.students += sec.students; });
    }

    var cols, rnd2 = seededRng(strSeed(s.code + '|teacherlog'));
    if (apiDeps.length) {
      // Per-teacher self-report items (Pre / Post-training) get their own columns;
      // the rest are per-student observations over the teacher's sections.
      var selfCols = [], reps = API.selfReportsFor ? API.selfReportsFor(s.id) : {};
      apiDeps.forEach(function (x) { (x.assessments || []).forEach(function (a) { if (a.perTeacher) selfCols.push({ dep: x, item: a }); }); });
      cols = selfCols.map(function (c) { return { label: c.item.name + ' (self-report)', phase: c.dep.phase, self: true }; })
        .concat(apiDeps.filter(function (x) { return (x.assessments || []).some(function (a) { return !a.perTeacher; }); })
          .map(function (x) { return { label: x.phase + ' · observations' + (x.status === 'Scheduled' ? ' (opens ' + fmtJoined(x.start) + ')' : ''), phase: x.phase }; }));
      teachers.forEach(function (t) {
        var r = reps[String(t.email || '').toLowerCase()] || {};
        t.cells = selfCols.map(function (c) {
          var at = /post/i.test(c.item.name) ? r.post : r.pre;
          return at ? { status: 'Completed', done: 1, expected: 1, at: at } : { status: 'Not started', done: 0, expected: 1 };
        }).concat(apiDeps.filter(function (x) { return (x.assessments || []).some(function (a) { return !a.perTeacher; }); }).map(function (x) {
          var c = API.completionStats(s.id, x.phase, 'Teacher', t.ids || []); return teacherCell(c.done, c.expected);
        }));
      });
    } else {
      cols = mockDeps.map(function (x) { return { label: x.assessment, phase: x.phase }; });
      teachers.forEach(function (t) {
        t.cells = mockDeps.map(function (x) {
          if (x.status === 'Scheduled') return teacherCell(0, t.students);
          var res = ORG.results.find(function (r) { return r.schoolId === s.id && r.assessment === x.assessment && r.audience === 'Teacher'; });
          var frac = res ? Math.max(0, Math.min(1, res.completion / 100)) : 0.5, u = rnd2();
          var done = u < frac ? t.students : (u < frac + 0.25 * (1 - frac) ? Math.max(1, Math.round(t.students * rnd2() * 0.9)) : 0);
          return teacherCell(Math.min(done, t.students), t.students);
        });
      });
    }
    return { cols: cols, teachers: teachers, live: !!apiDeps.length };
  }
  function renderTeacherAssessmentLog(d, mount) {
    var s = d.school, tr = teacherRosterFor(s, d);
    if (!tr.cols.length) { mount.innerHTML = '<div class="ui-card mt-gap"><div class="ui-empty">No teacher assessments deployed for this school yet.</div></div>'; return; }
    if (!tr.teachers.length) { mount.innerHTML = '<div class="ui-card mt-gap"><div class="ui-empty">No teachers on record for this school yet.</div></div>'; return; }
    var summary = tr.cols.map(function (c, ci) {
      var counted = tr.teachers.filter(function (t) { return t.cells[ci].status !== 'No students'; });
      var done = counted.filter(function (t) { return t.cells[ci].status === 'Completed'; }).length;
      return '<span class="tl-tlog-sum"><b>' + done + '</b> of ' + counted.length + ' teachers done with ' + esc(c.label) + '</span>';
    }).join('');
    var head = '<tr><th>Teacher</th><th>Sections</th>' + tr.cols.map(function (c) { return '<th>' + esc(c.label) + '</th>'; }).join('') + '</tr>';
    var rows = tr.teachers.map(function (t) {
      return '<tr><td class="name">' + esc(t.name) + '<small>' + esc(t.email) + '</small></td><td>' + esc(t.sections.join(', ') || '—') + '<small>' + t.students + ' students</small></td>' +
        t.cells.map(function (c) {
          return '<td>' + statusPill(c.status === 'In progress' ? 'In progress · ' + c.done + '/' + c.expected : c.status, TEACHERLOG_TONE[c.status]) +
            (c.at ? '<small>' + esc(fmtJoined(ORG.iso(c.at))) + '</small>' : '') + '</td>';
        }).join('') + '</tr>';
    }).join('');
    mount.innerHTML = '<div class="ui-card mt-gap">' +
      '<div class="ui-mod-h"><div><h3 class="ui-mod-title">Teacher assessment log</h3><p class="ui-mod-note">' + tr.teachers.length + ' teachers · ' +
        (tr.live ? 'live completion from the teacher app' : 'demo data') + ' · Completed = every student in their sections rated.</p></div>' +
        '<button class="btn btn-outline btn-sm" data-tlog-csv>↓ CSV</button></div>' +
      '<div class="tl-tlog-sums">' + summary + '</div>' +
      '<div class="ui-tablewrap"><table class="ui-table tl-tlog-table" style="min-width:' + (380 + tr.cols.length * 190) + 'px"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div></div>';
    mount.querySelector('[data-tlog-csv]').addEventListener('click', function () {
      downloadCsv(s.code.toLowerCase() + '-teacher-assessment-log.csv', ['Teacher', 'Email', 'Sections', 'Students'].concat(tr.cols.map(function (c) { return c.label; })),
        tr.teachers.map(function (t) { return [t.name, t.email, t.sections.join('; '), t.students].concat(t.cells.map(function (c) { return c.status + (c.expected ? ' (' + c.done + '/' + c.expected + ')' : ''); })); }));
    });
  }

  var STUDENTLOG_TONE = { 'Completed': 'ok', 'In Progress': 'warn', 'Not Started': 'danger' };
  function renderStudentAssessmentLog(d, mount) {
    var s = d.school;
    // Only student-facing assessments belong in a per-student log; a teacher
    // observation is completed once per class, not per child.
    var cols = d.deployments.filter(function (x) { return x.audience === 'Direct Assessment' || x.audience === 'Parent'; });
    if (!cols.length) { mount.innerHTML = '<div class="ui-card mt-gap"><div class="ui-empty">No student-facing assessments deployed for this school yet.</div></div>'; return; }
    var roster = studentRosterFor(s);
    if (!roster.length) { mount.innerHTML = '<div class="ui-card mt-gap"><div class="ui-empty">No students on record for this school yet.</div></div>'; return; }
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
        return '<th>' + esc(dep.assessment) + '<small>' + t['Completed'] + ' done · ' + t['In Progress'] + ' in progress · ' + t['Not Started'] + ' not started</small></th>';
      }).join('') + '</tr>';
    mount.innerHTML = '<div class="ui-card mt-gap">' +
      '<div class="ui-mod-h"><div><h3 class="ui-mod-title">Student assessment log</h3><p class="ui-mod-note">' + roster.length + ' students · ' + cols.length + ' student-facing assessment' + (cols.length === 1 ? '' : 's') + ' · <span class="ui-chip ok">Completed</span> <span class="ui-chip warn">In Progress</span> <span class="ui-chip danger">Not Started</span></p></div></div>' +
      '<div class="ui-tablewrap"><table class="ui-table" style="min-width:' + (420 + cols.length * 190) + 'px"><thead>' + head + '</thead><tbody>' + bodyRows + '</tbody></table></div></div>';
  }

  function schoolCard(s) {
    var flags = ORG.server.schoolFlags(s);
    var nIss = ORG.server.openIssueCount(s.id);
    var warn = (flags.length || nIss) ? '<div class="sc-flags">' + issueChip(s.id, nIss) + flags.map(function (f) { return '<span class="ui-chip warn">' + esc(f.label) + '</span>'; }).join('') + '</div>' : '';
    return '<div class="tl-school-card" data-open="' + s.id + '">' +
      '<div class="sc-top"><div class="sc-name">' + esc(s.name) + (s.live ? ' <span class="ui-chip active" style="padding:2px 7px"><span class="dot"></span>Live</span>' : '') + '</div></div>' +
      '<div class="sc-meta">' + esc(s.type) + ' · <span class="mono">' + esc(s.code) + '</span> · ' + esc(s.groupName) + (s.country ? ' · ' + esc(s.country) : '') + '</div>' +
      '<div class="sc-stats"><div><b>' + s.gradeCount + '</b><span>grades</span></div><div><b>' + s.students.toLocaleString() + '</b><span>students</span></div><div><b>' + s.staff + '</b><span>staff</span></div></div>' +
      warn +
      '<div class="sc-actions"><button class="btn-link" data-edit="' + s.id + '">Edit</button>' +
        '<button class="btn-link" data-archive="' + s.id + '">' + (s.archived ? 'Un-archive' : 'Archive') + '</button>' +
        '<span class="sc-open">Open →</span></div></div>';
  }

  function archiveGroupFlow(g) {
    var inGroup = ORG.schools.filter(function (s) { return s.groupId === g.id; });
    if (g.archived) {
      var back = inGroup.filter(function (s) { return s.archivedByGroup; }).length;
      gated({ title: 'Un-archive ' + g.name, body: '<p>Restore <b>' + esc(g.name) + '</b> and the <b>' + back + '</b> school' + (back === 1 ? '' : 's') + ' archived with it. Schools that were archived on their own stay archived.</p>',
        confirmLabel: 'Un-archive group', audit: { action: 'group.unarchive', entity: g.name, entityType: 'group' },
        onConfirm: function () { ORG.server.archiveGroup(g.id, false); toast(g.name + ' restored.'); grpState.tab = 'active'; go('group', { id: g.id }); } });
      return;
    }
    var live = inGroup.filter(function (s) { return !s.archived; }).length;
    gated({ title: 'Archive ' + g.name, danger: true, typed: 'ARCHIVE',
      body: '<p>Archive <b>' + esc(g.name) + '</b> and its <b>' + live + '</b> active school' + (live === 1 ? '' : 's') + '. They leave the active lists and their deployments and share links are suspended. The group admin sees an “archived” notice. Nothing is deleted — un-archive restores it all.</p>',
      confirmLabel: 'Archive group', audit: { action: 'group.archive', entity: g.name, entityType: 'group' },
      onConfirm: function () { ORG.server.archiveGroup(g.id, true); toast(g.name + ' archived.'); schState.tab = 'archived'; go('schools', {}); } });
  }

  function openGroupMenu(gid) {
    var g = ORG.groupById(gid);
    openModal('Group · ' + g.name, '<p class="tl-muted">Changes here affect every school in the group, and each one asks you to confirm.' + (g.archived ? ' <span class="ui-chip muted">Archived</span>' : '') + '</p>' +
      '<div class="tl-stack"><button class="btn btn-outline block" id="gm-rename">Rename group</button>' +
      '<button class="btn btn-outline block" id="gm-archive" title="' + (g.archived ? 'Restore the group and the schools that were archived with it.' : 'Archive the group and every school in it. Nothing is deleted.') + '">' + (g.archived ? 'Un-archive group' : 'Archive group') + '</button>' +
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
      var ga = document.getElementById('gm-archive'); if (ga) ga.addEventListener('click', function () {
        document.getElementById('tl-modal-root').innerHTML = '';
        archiveGroupFlow(g);
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
  // Board picker shared by Add School and Edit school. Picker state is
  // { checked: [...ADD_BOARDS], other: 'typed name' }. Ticking Other asks which
  // board, and the typed name is what's saved — so Board mix never says "Other".
  function boardStateFrom(names) {
    var checked = [], other = [];
    (names || []).forEach(function (b) {
      if (b === 'Other') { if (checked.indexOf('Other') < 0) checked.push('Other'); }
      else if (ADD_BOARDS.indexOf(b) >= 0) checked.push(b);
      else other.push(b);
    });
    if (other.length && checked.indexOf('Other') < 0) checked.push('Other');
    return { checked: checked, other: other.join(', ') };
  }
  function boardNames(st) {
    var out = st.checked.filter(function (b) { return b !== 'Other'; });
    if (st.checked.indexOf('Other') >= 0) st.other.split(',').forEach(function (x) { x = x.trim(); if (x && out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  function boardError(st) {
    if (!st.checked.length) return 'Pick at least one board.';
    if (st.checked.indexOf('Other') >= 0 && !st.other.trim()) return 'Type the name of the other board.';
    return '';
  }
  function boardPickerHtml(pfx, st) {
    var otherOn = st.checked.indexOf('Other') >= 0;
    return '<div class="field" id="' + pfx + '-boards">Board * <span class="tl-muted" style="font-weight:400">(select all that apply)</span>' +
      '<div class="ws-board-grid">' + ADD_BOARDS.map(function (b) {
        return '<label class="ws-board-opt"><input class="ws-board" type="checkbox" value="' + esc(b) + '"' + (st.checked.indexOf(b) >= 0 ? ' checked' : '') + '> ' + esc(b) + '</label>';
      }).join('') + '</div>' +
      '<input class="input ws-board-other" placeholder="Which board? e.g. Montessori" value="' + esc(st.other) + '" aria-label="Name of the other board"' +
        ' title="The board name that gets saved instead of “Other”. Separate several with commas."' + (otherOn ? '' : ' hidden') + '>' +
    '</div>';
  }
  function readBoardPicker(pfx) {
    var el = document.getElementById(pfx + '-boards');
    if (!el) return { checked: [], other: '' };
    return { checked: Array.prototype.map.call(el.querySelectorAll('.ws-board:checked'), function (b) { return b.value; }),
      other: el.querySelector('.ws-board-other').value };
  }
  function wireBoardPicker(pfx, onChange) {
    var el = document.getElementById(pfx + '-boards'); if (!el) return;
    var otherIn = el.querySelector('.ws-board-other');
    el.querySelectorAll('.ws-board').forEach(function (b) {
      b.addEventListener('change', function () {
        if (b.value === 'Other') { otherIn.hidden = !b.checked; if (b.checked) otherIn.focus(); }
        if (onChange) onChange(readBoardPicker(pfx));
      });
    });
    otherIn.addEventListener('input', function () { if (onChange) onChange(readBoardPicker(pfx)); });
  }
  // Country → cities. City picker is filtered by the chosen country (country first).
  var ADD_COUNTRIES = ['India', 'Sri Lanka', 'Jordan'];
  var ADD_CITIES = {
    'India': ['Bengaluru', 'Mumbai', 'Delhi', 'Gurugram', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Jaipur'],
    'Sri Lanka': ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo'],
    'Jordan': ['Amman', 'Irbid', 'Zarqa', 'Aqaba', 'Madaba', 'Salt'],
  };
  // Usual academic year per country, as [start month, start day, end month, end day]
  // (months 1–12). Only a suggestion — Add School asks for this year's real dates.
  var YEAR_SHAPE = { 'India': [6, 1, 5, 31], 'Sri Lanka': [1, 1, 12, 31], 'Jordan': [9, 1, 6, 30] };
  // The suggested year that contains `iso` (YYYY-MM-DD) for a country.
  function suggestYear(country, iso) {
    var sh = YEAR_SHAPE[country] || YEAR_SHAPE.India, p = function (x) { return (x < 10 ? '0' : '') + x; };
    var y = +iso.slice(0, 4), md = iso.slice(5);
    var startMd = p(sh[0]) + '-' + p(sh[1]);
    if (md < startMd) y -= 1;
    var endY = sh[2] > sh[0] || (sh[2] === sh[0] && sh[3] >= sh[1]) ? y : y + 1;
    return { start: y + '-' + startMd, end: endY + '-' + p(sh[2]) + '-' + p(sh[3]) };
  }
  // Fixed base grades (TilliAPI.BASE_GRADES): every grade picks one, however the school names it.
  var BASE_GRADES = (window.TilliAPI && window.TilliAPI.BASE_GRADES) || ['Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  function inferBase(name) { return window.TilliAPI && window.TilliAPI.inferBaseGrade ? window.TilliAPI.inferBaseGrade(name) : ''; }
  function sameName(a, b) { return String(a || '').replace(/\s+/g, '').toLowerCase() === String(b || '').replace(/\s+/g, '').toLowerCase(); }
  // Small "(Grade 1)" bracket shown only when the school's name differs from the base.
  function baseTag(shown, base, extraCls) {
    return base && !sameName(shown, base) ? ' <small class="ws-base' + (extraCls ? ' ' + extraCls : '') + '" title="Base: ' + esc(base) + '. Fixed, so Tilli and Ask Tilli always know which grade this is.">(' + esc(base) + ')</small>' : '';
  }
  // Display label with bracket, for read-only places: "Sunflowers (Grade 1)".
  function gradeLbl(name, base) { var b = base || inferBase(name); return b && !sameName(name, b) ? name + ' (' + b + ')' : name; }
  // "Rose (Grade 1A)" for a student's grade + section at a school (bracket only when renamed).
  function secLbl(schoolId, grade, section) {
    if (window.TilliAPI && window.TilliAPI.sectionLabel) return window.TilliAPI.sectionLabel(schoolId, grade || '', section || '');
    return ((grade || '') + ' ' + (section || '')).trim();
  }
  function baseCode(base, letter) { return window.TilliAPI && window.TilliAPI.baseSectionCode ? window.TilliAPI.baseSectionCode(base, letter) : (base || '') + (letter || ''); }
  var WIZ_STEPS = [
    { key: 'profile', label: 'Profile' },
    { key: 'structure', label: 'Grades' }, { key: 'admin', label: 'First admin', optional: true },
    { key: 'review', label: 'Review' },
  ];
  function secLetter(i) { return String.fromCharCode(65 + i); }
  var WIZ_SECTION_SIZE = 30;   // Add School: default expected students in a new section

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
      var ra = gradeRank(a.base || a.grade), rb = gradeRank(b.base || b.grade);
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
      name: '', boards: [], boardPick: { checked: [], other: '' }, city: '', country: 'India',
      groupId: 'g-none', joined: todayISO(), yearStart: '', yearEnd: '', yearTouched: false,
      grades: [], admin: { name: '', email: '' },
    };
    var step = 0;
    var root = document.getElementById('tl-modal-root');
    var sy0 = suggestYear(d.country, d.joined); d.yearStart = sy0.start; d.yearEnd = sy0.end;

    function close() { root.innerHTML = ''; }

    // Pull the current step's inputs into the draft before we move/re-render.
    function commit() {
      var g = function (id) { return document.getElementById(id); };
      if (step === 0) {
        if (g('ws-name')) d.name = g('ws-name').value.trim();
        if (document.getElementById('ws-boards')) { d.boardPick = readBoardPicker('ws'); d.boards = boardNames(d.boardPick); }
        if (g('ws-country')) d.country = g('ws-country').value;
        if (g('ws-city')) d.city = g('ws-city').value;
        if (g('ws-group')) d.groupId = g('ws-group').value;
        if (g('ws-joined')) d.joined = g('ws-joined').value.trim() || d.joined;
        if (g('ws-ystart')) d.yearStart = g('ws-ystart').value;
        if (g('ws-yend')) d.yearEnd = g('ws-yend').value;
      } else if (step === 2) {
        if (g('ws-admin-name')) d.admin.name = g('ws-admin-name').value.trim();
        if (g('ws-admin-email')) d.admin.email = g('ws-admin-email').value.trim();
        var bsc = document.querySelector('input[name="ws-bscope"]:checked');
        if (bsc) d.admin.boards = bsc.value === 'some' ? Array.prototype.map.call(document.querySelectorAll('[data-wsboard]:checked'), function (c) { return c.value; }) : null;
        if (d.admin.boards && !d.admin.boards.length) d.admin.boards = null;
      }
    }

    function stepper() {
      return '<div class="tl-steps" style="margin-bottom:18px">' + WIZ_STEPS.map(function (s, i) {
        var cls = i < step ? 'done' : (i === step ? 'cur' : '');
        var optTag = s.optional ? '<span class="ui-tag plain ws-opt-tag">optional</span>' : '';
        return '<div class="tl-step ' + cls + '"><div class="dot">' + (i < step ? '✓' : (i + 1)) + '</div><div class="slabel">' + esc(s.label) + optTag + '</div></div>';
      }).join('') + '</div>';
    }

    // City options for the currently selected country (country must be chosen first).
    function cityOptions() {
      var list = ADD_CITIES[d.country] || [];
      return '<option value="">Select a city…</option>' +
        list.map(function (c) { return '<option value="' + esc(c) + '"' + (c === d.city ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    }

    // "Suggested for Sri Lanka (Jan – Dec)" until the dates are changed by hand.
    function yearHint() {
      var sh = YEAR_SHAPE[d.country]; if (!sh || d.yearTouched) return 'The school’s own dates — windows and the year-end rollover follow them.';
      return 'Suggested for ' + d.country + ' (' + MONTHS_SHORT[sh[0] - 1] + ' – ' + MONTHS_SHORT[sh[2] - 1] + '). Change them to the school’s own dates.';
    }
    function bodyProfile() {
      var countryOpts = ADD_COUNTRIES.map(function (c) { return '<option value="' + esc(c) + '"' + (c === d.country ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
      var groupOpts = ORG.activeGroups().map(function (g) { return '<option value="' + g.id + '"' + (g.id === d.groupId ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') +
        '<option value="__new">＋ New group…</option>';
      return '<p class="tl-muted">The basics. Name, board, country and city are required — everything can change later.</p>' +
        '<div class="tl-stack">' +
          '<label class="field">School name *<input class="input" id="ws-name" placeholder="e.g. Harmony High" value="' + esc(d.name) + '"></label>' +
          boardPickerHtml('ws', d.boardPick) +
          '<div class="tl-fieldrow">' +
            '<label class="field flex-1">Country *<select class="select" id="ws-country">' + countryOpts + '</select></label>' +
            '<label class="field flex-1">City *<select class="select" id="ws-city">' + cityOptions() + '</select></label>' +
          '</div>' +
          '<label class="field">Group<select class="select" id="ws-group">' + groupOpts + '</select></label>' +
          '<div id="ws-newgroup-row" style="display:none;gap:8px">' +
            '<input class="input grow" id="ws-newgroup" placeholder="New group name">' +
            '<button class="btn btn-outline btn-sm" id="ws-newgroup-add" type="button">Create</button>' +
          '</div>' +
          '<label class="field">Joined <span class="tl-muted" style="font-weight:400">(defaults to today)</span><input class="input" type="date" id="ws-joined" value="' + esc(d.joined) + '" max="' + todayISO() + '"></label>' +
          '<div class="tl-fieldrow" title="This academic year at the school. Suggested from the country — change it to the school’s own dates. Assessment windows and the year-end rollover follow these dates.">' +
            '<label class="field flex-1">This academic year starts *<input class="input" type="date" id="ws-ystart" value="' + esc(d.yearStart) + '"></label>' +
            '<label class="field flex-1">and ends *<input class="input" type="date" id="ws-yend" value="' + esc(d.yearEnd) + '"></label>' +
          '</div>' +
          '<p class="tl-muted m-0" id="ws-yearhint">' + esc(yearHint()) + '</p>' +
          '<div class="field"><span>School calendar <span class="tl-muted" style="font-weight:400">(optional)</span></span>' +
            '<div class="tl-inline-actions"><label class="btn btn-outline btn-sm">Upload a PDF or photo<input type="file" accept=".pdf,image/*" class="hidden" id="ws-calfile"></label>' +
            '<span class="tl-muted" id="ws-calname">' + (d.calFileName ? esc(d.calFileName) + ' — we’ll read the dates after the school is created' : 'Or add it later: Assessments → Plan from calendar.') + '</span></div></div>' +
        '</div>';
    }

    function bodyStructure() {
      var freeBases = BASE_GRADES.filter(function (b) { return !d.grades.some(function (g) { return g.base === b; }); });
      var presetBtns = freeBases.map(function (p) { return '<button class="ui-filterchip" type="button" data-preset="' + esc(p) + '">＋ ' + esc(p) + '</button>'; }).join('');
      var baseOpts = '<option value="">Base grade…</option>' + freeBases.map(function (b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
      var list = d.grades.length ? d.grades.map(function (g, gi) {
        var secs = g.sections.length ? g.sections.map(function (sec, si) {
          return '<span class="ws-sec"><input class="ws-secname" data-gi="' + gi + '" data-si="' + si + '" value="' + esc(sec.name) + '" size="' + Math.max(1, sec.name.length) + '" aria-label="Section name — click to rename" title="Click to rename. Base stays ' + esc(baseCode(g.base, sec.base)) + '.">' +
            baseTag(sec.name, sec.base, 'sec') +
            '<input class="ws-secnum" type="number" min="0" data-gi="' + gi + '" data-si="' + si + '" value="' + (parseInt(sec.students, 10) || 0) + '" aria-label="Expected students in ' + esc(g.grade + ' ' + sec.name) + '" title="Expected students in ' + esc(g.grade + ' ' + sec.name) + '. Teachers can add up to this many; more needs an admin’s approval. Leave at 0 and teachers can’t add anyone without approval.">' +
            '<button class="ws-secx" type="button" data-gi="' + gi + '" data-si="' + si + '" title="Remove section" aria-label="Remove section">×</button></span>';
        }).join('') : '<span class="ws-nosec">No sections</span>' +
          '<label class="ws-gradenum-wrap">Students' +
            '<input class="ws-gradenum" type="number" min="0" data-gi="' + gi + '" value="' + (parseInt(g.students, 10) || 0) + '" aria-label="Students in ' + esc(g.grade) + '"></label>';
        // Multi-board school: each grade runs one board (its sections inherit it).
        if (d.boards.length > 1 && d.boards.indexOf(g.board) < 0) g.board = d.boards[0];
        var boardSel = d.boards.length > 1 ? '<select class="select sm ws-gradeboard" data-gboard="' + gi + '" aria-label="Board for ' + esc(g.grade) + '" title="Which board this grade follows. A school admin limited to one board only sees that board’s grades.">' +
          d.boards.map(function (b) { return '<option' + (b === g.board ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select>' : '';
        return '<div class="ws-grade-card">' +
          '<div class="ws-gradeid"><input class="ws-gradename" data-gi="' + gi + '" value="' + esc(g.grade) + '" aria-label="Grade name — click to rename" title="Click to rename. Base stays ' + esc(g.base) + '.">' + baseTag(g.grade, g.base) + boardSel + '</div>' +
          '<div class="ws-secs">' + secs + '</div>' +
          '<div class="ws-grade-actions">' +
            '<button class="btn-link ws-add-sec" type="button" data-addsec="' + gi + '">＋ Section</button>' +
            '<button class="tl-rowact danger" type="button" data-delgrade="' + gi + '" title="Remove grade" aria-label="Remove ' + esc(g.grade) + '">' + ICONS.trash + '</button>' +
          '</div></div>';
      }).join('') : '';
      return '<p class="tl-muted">Add the grades this school teaches.</p>' +
        '<div class="ws-grades">' + list + '</div>' +
        '<div class="ws-addbar">' +
          (presetBtns ? '<div class="ws-addbar-lbl">Quick add</div><div class="ws-presets">' + presetBtns + '</div>' : '') +
          (freeBases.length ? '<div class="ws-newgrade-row"><select class="select" id="ws-newbase" aria-label="Base grade" title="The fixed grade this maps to. Tilli and Ask Tilli use it even if the school renames the grade.">' + baseOpts + '</select>' +
            '<input class="input grow" id="ws-newgrade" placeholder="School’s name for it (optional)" aria-label="School’s name for this grade">' +
            '<button class="btn btn-outline btn-sm" id="ws-addgrade" type="button">Add</button></div>' : '') +
        '</div>' +
        (d.grades.length ? '<div class="ws-total">' + d.grades.length + ' grades · ' + draftSectionTotal(d) + ' sections · <b>' + draftStudentTotal(d) + '</b> students' +
          ' <span class="tl-tip" tabindex="0" role="button" aria-label="About empty grades and sections" data-tip="Any grade or section still without students ' + ORG.emptyStructureTtlDays + ' days after it’s added is removed automatically. It can be added back.">i</span></div>' : '');
    }

    function bodyAdmin() {
      return '<div class="ui-note ws-optional-note"><span class="ui-tag green">Optional</span><span>Invite the first admin now, or skip and add people later from the school hub.</span></div>' +
        '<p class="tl-muted">If you invite them, they\'ll get an activation email and can add teachers and students themselves. Teachers can also self-join later with the school code from the Staff tab.</p>' +
        '<div class="tl-stack">' +
          '<label class="field">Admin name<input class="input" id="ws-admin-name" placeholder="e.g. Meera Krishnan" value="' + esc(d.admin.name) + '"></label>' +
          '<label class="field">Admin email<input class="input" id="ws-admin-email" type="email" placeholder="name@school.edu" value="' + esc(d.admin.email) + '"></label>' +
          // Multi-board school: the first admin can be limited to some boards.
          (d.boards.length > 1 ? '<div class="field"><span>Board access</span>' +
            '<label class="tl-check"><input type="radio" name="ws-bscope" value="all"' + (d.admin.boards ? '' : ' checked') + '> All boards (' + esc(d.boards.join(' + ')) + ')</label>' +
            '<label class="tl-check"><input type="radio" name="ws-bscope" value="some"' + (d.admin.boards ? ' checked' : '') + '> Only these boards:</label>' +
            '<div class="tl-inline-actions" style="padding-left:24px">' + d.boards.map(function (b) { return '<label class="tl-check"><input type="checkbox" data-wsboard value="' + esc(b) + '"' + (d.admin.boards && d.admin.boards.indexOf(b) >= 0 ? ' checked' : '') + '> ' + esc(b) + '</label>'; }).join('') + '</div>' +
            '<span class="tl-muted">A one-board admin sees only that board’s grades, children and results.</span></div>' : '') +
        '</div>' +
        '<button class="btn-link mt-3" id="ws-skip-admin" type="button">Skip this step →</button>';
    }

    function bodyReview() {
      var grp = (ORG.groups.find(function (g) { return g.id === d.groupId; }) || ORG.groups[0]).name;
      function row(k, v) { return '<div class="ws-rev-row"><span>' + esc(k) + '</span><b>' + esc(v || '—') + '</b></div>'; }
      var admin = d.admin.email ? (d.admin.name || d.admin.email) + ' · ' + d.admin.email : 'None — add later';
      return '<p class="tl-muted">Check the details, then create. You\'ll land on the new school\'s page.</p>' +
        '<div class="ws-review">' +
          row('Name', d.name) + row('Board', d.boards.join(', ')) +
          row('Location', [d.city, d.country].filter(Boolean).join(', ')) +
          row('Group', grp) + row('Joined', fmtJoined(d.joined)) +
          row('Academic year', fmtJoined(d.yearStart) + ' → ' + fmtJoined(d.yearEnd)) +
          (d.calFileName ? row('School calendar', d.calFileName + ' (read after create — check it)') : '') +
          (d.admin.email && d.boards.length > 1 ? row('Admin board access', d.admin.boards ? d.admin.boards.join(' + ') + ' only' : 'All boards') : '') +
          row('Structure', d.grades.length + ' grades · ' + draftSectionTotal(d) + ' sections · ' + draftStudentTotal(d) + ' students') +
          row('Grades', d.grades.map(function (g) { return gradeLbl(g.grade, g.base) + (d.boards.length > 1 ? ' · ' + (g.board || d.boards[0]) : '') + (!g.sections.length && !(parseInt(g.students, 10) || 0) ? ' (no sections yet)' : ''); }).join(', ')) +
          row('First admin', admin) +
        '</div>';
    }

    var BODIES = [bodyProfile, bodyStructure, bodyAdmin, bodyReview];

    // What the current step is still missing ('' = nothing). Gates the Next/Create
    // button and becomes its hover tooltip, so a greyed-out Next explains itself.
    function blockReason() {
      if (step === 0) {
        if (!d.name) return 'Add the school name';
        if (boardError(d.boardPick)) return boardError(d.boardPick);
        if (!d.country || !d.city) return 'Pick a country and a city';
        if (!d.yearStart || !d.yearEnd) return 'Add this academic year’s start and end dates';
        if (d.yearEnd <= d.yearStart) return 'The academic year must end after it starts';
      }
      if (step === 1 && !d.grades.length) return 'Add at least one grade';
      return '';
    }
    function stepBlocked() { return !!blockReason(); }
    // Refresh the footer button's enabled state + tooltip without re-rendering the
    // whole step (grades/name update the body in place).
    function syncNext() { var nb = document.getElementById('ws-next'); if (nb) { nb.disabled = stepBlocked(); nb.title = blockReason(); } }

    function render() {
      var last = step === WIZ_STEPS.length - 1;
      root.innerHTML = '<div class="overlay" id="tl-ov"><div class="ui-modal-card">' +
        '<div class="ui-modal-h"><h3>Add a partner school</h3><button class="dialog-close" id="tl-mx" aria-label="Close">×</button></div>' +
        stepper() +
        '<div id="ws-body">' + BODIES[step]() + '</div>' +
        '<div class="ui-modal-foot" style="justify-content:space-between">' +
          '<button class="btn btn-outline btn-sm" id="ws-back"' + (step === 0 ? ' style="visibility:hidden"' : '') + ' type="button">Back</button>' +
          '<button class="btn btn-primary btn-sm" id="ws-next" type="button"' + (stepBlocked() ? ' disabled title="' + esc(blockReason()) + '"' : '') + '>' + (last ? 'Create school' : 'Next') + '</button>' +
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
        wireBoardPicker('ws', function (st) { d.boardPick = st; d.boards = boardNames(st); syncNext(); });
        // Country drives the city list — reset city and repopulate on change.
        var country = document.getElementById('ws-country');
        var cityEl = document.getElementById('ws-city');
        var ys = document.getElementById('ws-ystart'), ye = document.getElementById('ws-yend'), yh = document.getElementById('ws-yearhint');
        country.addEventListener('change', function () {
          d.country = country.value; d.city = '';
          cityEl.innerHTML = cityOptions();
          // Re-suggest the year for the new country unless it was typed in by hand.
          if (!d.yearTouched) { var sy = suggestYear(d.country, d.joined); d.yearStart = ys.value = sy.start; d.yearEnd = ye.value = sy.end; }
          yh.textContent = yearHint();
          syncNext();
        });
        [ys, ye].forEach(function (x) { x.addEventListener('change', function () { d.yearStart = ys.value; d.yearEnd = ye.value; d.yearTouched = true; yh.textContent = yearHint(); syncNext(); }); });
        cityEl.addEventListener('change', function () { d.city = cityEl.value; syncNext(); });
        document.getElementById('ws-calfile').addEventListener('change', function (e) {
          var f = e.target.files && e.target.files[0]; if (!f) return;
          d.calFileName = f.name; document.getElementById('ws-calname').textContent = f.name + ' — we’ll read the dates after the school is created';
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
      } else if (step === 1) {
        var body = document.getElementById('ws-body');
        body.querySelectorAll('[data-preset]').forEach(function (b) { b.addEventListener('click', function () { addGrade(b.dataset.preset); }); });
        body.querySelectorAll('[data-gboard]').forEach(function (sel) { sel.addEventListener('change', function () { d.grades[+sel.dataset.gboard].board = sel.value; }); });
        var ag = document.getElementById('ws-addgrade');
        if (ag) {
          ag.addEventListener('click', function () {
            var base = document.getElementById('ws-newbase').value;
            if (!base) { toast('Pick the base grade it maps to.'); return; }
            addGrade(base, (document.getElementById('ws-newgrade').value || '').trim());
          });
          document.getElementById('ws-newgrade').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ag.click(); } });
        }
        body.querySelectorAll('[data-addsec]').forEach(function (b) { b.addEventListener('click', function () {
          var g = d.grades[+b.dataset.addsec];
          // First section inherits any grade-level count, so the cohort you already
          // typed becomes Section A rather than being silently dropped.
          if (!g.sections.length && (parseInt(g.students, 10) || 0) > 0) {
            g.sections.push({ name: secLetter(0), base: secLetter(0), students: parseInt(g.students, 10) || 0 }); g.students = 0;
          } else {
            // A new section starts at a typical class size (editable) — 0 would mean "no size",
            // and then every child a teacher adds would need an admin's approval.
            g.sections.push({ name: secLetter(g.sections.length), base: secLetter(g.sections.length), students: WIZ_SECTION_SIZE });
          }
          rerenderStructure();
        }); });
        body.querySelectorAll('[data-delgrade]').forEach(function (b) { b.addEventListener('click', function () { d.grades.splice(+b.dataset.delgrade, 1); rerenderStructure(); }); });
        body.querySelectorAll('.ws-secx').forEach(function (b) { b.addEventListener('click', function () {
          var g = d.grades[+b.dataset.gi]; g.sections.splice(+b.dataset.si, 1);
          // Keep base letters A,B,C… contiguous (nothing exists yet); renamed sections keep their name.
          g.sections.forEach(function (sec, i) { if (sameName(sec.name, sec.base)) sec.name = secLetter(i); sec.base = secLetter(i); });
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
            d.grades[gi].grade = nv; rerenderStructure();   // base is fixed, so the order doesn't change
          });
        });
        // Section rename — the base letter (A, B…) never changes.
        body.querySelectorAll('.ws-secname').forEach(function (inp) {
          inp.addEventListener('input', function () { inp.size = Math.max(1, inp.value.length); });
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
          inp.addEventListener('change', function () {
            var g = d.grades[+inp.dataset.gi], si = +inp.dataset.si, nv = (inp.value || '').trim();
            if (!nv) { toast('Section name can’t be empty.'); rerenderStructure(); return; }
            if (g.sections.some(function (x, i) { return i !== si && x.name.toLowerCase() === nv.toLowerCase(); })) { toast('That section already exists in ' + g.grade + '.'); rerenderStructure(); return; }
            g.sections[si].name = nv; rerenderStructure();
          });
        });
      } else if (step === 2) {
        var skip = document.getElementById('ws-skip-admin');
        if (skip) skip.addEventListener('click', function () { d.admin = { name: '', email: '' }; step++; render(); });
      }
    }

    // base = fixed grade from BASE_GRADES; name = what the school calls it (defaults to the base).
    function addGrade(base, name) {
      name = name || base;
      if (d.grades.some(function (g) { return g.base === base; })) { toast(base + ' is already added — rename it instead.'); return; }
      if (d.grades.some(function (g) { return g.grade.toLowerCase() === name.toLowerCase(); })) { toast('A grade called “' + name + '” already exists.'); return; }
      // Grades start with no sections — a school may run a grade as a single
      // ungrouped cohort. Sections are added explicitly via "+ Section".
      d.grades.push({ grade: name, base: base, sections: [], students: 0 });
      sortGrades(d.grades);
      rerenderStructure();
    }
    function rerenderStructure() { document.getElementById('ws-body').innerHTML = bodyStructure(); wireStep(); syncNext(); }

    function onNext() {
      commit();
      if (step === 0 && !d.name) { toast('School name is required.'); return; }
      if (step === 0 && boardError(d.boardPick)) { toast(boardError(d.boardPick)); return; }
      if (step === 0 && (!d.country || !d.city)) { toast('Pick a country and a city.'); return; }
      if (step === 1 && !d.grades.length) { toast('Add at least one grade.'); return; }
      if (step === 2 && d.admin.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.admin.email)) { toast('Enter a valid admin email.'); return; }
      if (step < WIZ_STEPS.length - 1) { step++; render(); return; }
      // Final step → show a brief "creating" transition, then commit and land
      // on the new school's hub. The create itself is synchronous; the delay is
      // purely to give the action a beat of feedback before the screen swaps.
      renderCreating();
      setTimeout(function () {
        d.board = d.boards.join(', ');   // display string; d.boards rides along as the array
        var s = ORG.server.createSchool(Object.assign({}, d, { joined: fmtJoined(d.joined) }));
        ORG.server.logAudit(me.name, 'school.add', s.name, 'school', s.id);
        if (d.admin.email) ORG.server.logAudit(me.name, 'invitation.send', d.admin.email, 'invitation', s.id);
        // Calendar uploaded in Profile: read it into the new school, waiting for review.
        var calRead = d.calFileName && window.TilliAPI ? window.TilliAPI.readCalendarFile(s.id, d.calFileName) : null;
        if (calRead) window.TilliAPI.saveCalendar(s.id, calRead, me.email, { status: 'submitted', source: 'upload', fileName: d.calFileName });
        close();
        toast(s.name + ' created' + (draftSectionTotal(d) ? ' with ' + draftSectionTotal(d) + ' sections.' : '.') + (calRead ? ' Calendar read — check it in Assessments → Plan from calendar.' : ''));
        go('school', { id: s.id });
      }, 1100);
    }

    // Full-modal "creating…" state shown between Create and landing on the hub.
    function renderCreating() {
      root.innerHTML = '<div class="overlay" id="tl-ov"><div class="ui-modal-card tl-creating">' +
        '<div class="spinner tl-creating-spin" aria-hidden="true"></div>' +
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
    { key: 'issues', label: 'Issues & Logs' }, { key: 'history', label: 'History' }, { key: 'settings', label: 'Settings' },
  ];
  SCREEN.school = function (params, body) {
    var sum0 = ORG.server.schoolSummary(params.id);
    if (!sum0) { body.innerHTML = '<div class="ui-empty">School not found.</div>'; return; }
    var s = sum0.school;
    var tab = params.tab && HUB_TABS.some(function (t) { return t.key === params.tab; }) ? params.tab : 'overview';

    var crumbParts = [{ label: 'All Schools', screen: 'schools' }];
    if (s.groupId && s.groupId !== 'g-none') crumbParts.push({ label: s.groupName, screen: 'group', params: { id: s.groupId } });
    crumbParts.push({ label: s.name });
    var header = crumbs(crumbParts) +
      '<div class="tl-hub-head">' +
        '<div><h1 class="ui-screen-title" style="margin-bottom:4px">' + esc(s.name) + (s.archived ? ' <span class="ui-chip">Archived</span>' : '') + '</h1>' +
        '<p class="ui-screen-sub m-0">' + esc(s.type) + ' · <span class="mono">' + esc(s.code) + '</span> · ' + esc(s.groupName) + ' · ' + esc(s.city + ', ' + s.country) + '</p>' +
        '<button class="tl-hub-last" data-hubtab="history" title="Open this school\'s change history">' + lastLine(s.id) + '</button></div>' +
        '<div class="tl-hub-actions">' + helpBtnHtml() + '<button class="btn btn-outline btn-sm" data-hub-edit>Edit</button>' +
          '<button class="btn btn-outline btn-sm" data-hub-archive>' + (s.archived ? 'Un-archive' : 'Archive') + '</button>' +
          (s.archived ? '<button class="btn btn-danger btn-sm" data-hub-delete>Delete</button>' : '') +
          (s.live ? '<a class="btn btn-primary btn-sm" href="admin.html?school=' + encodeURIComponent(s.created ? s.id : s.name) + '&email=' + encodeURIComponent(s.created && s.coordinator ? s.coordinator.email : me.email) + '&from=tilli" style="text-decoration:none">Leadership dashboard →</a>' : '') + '</div>' +
      '</div>' +
      '<div class="tl-kpis five mt-3">' +
        kpi(s.gradeCount, 'Grades') + kpi(s.sectionCount, 'Sections') + kpi(s.students.toLocaleString(), 'Students') +
        kpi(s.staff, 'Staff') + kpi(sum0.counts.openIssues, 'Open issues') + '</div>' +
      '<div class="ui-tabs hub">' + HUB_TABS.map(function (t) {
        return '<button class="ui-tab' + (t.key === tab ? ' on' : '') + '" data-hubtab="' + t.key + '">' + esc(t.label) + '</button>';
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
      body.querySelectorAll('.ui-tab[data-hubtab]').forEach(function (b) { b.classList.toggle('on', b.dataset.hubtab === key); });
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
    var sg = ORG.groupById(s.groupId);
    if (s.archived && sg && sg.id === s.groupId && sg.archived) { toast(sg.name + ' is archived — un-archive the group first (or move the school to another group).'); return; }
    if (s.archived) { gated({ title: 'Un-archive ' + s.name, body: '<p>Restore this school to the active list, with its deployments and share links.</p>', confirmLabel: 'Un-archive', audit: { action: 'school.archive', entity: s.name, entityType: 'school', schoolId: s.id }, onConfirm: function () { s.archived = false; toast(s.name + ' restored.'); go('school', { id: s.id }); } }); return; }
    gated({ title: 'Archive ' + s.name, danger: true, typed: 'ARCHIVE',
      body: '<p>Archiving hides the school from active lists and <b>suspends its deployments and share links</b>. Students and data are kept and can be restored.</p>',
      confirmLabel: 'Archive school', audit: { action: 'school.archive', entity: s.name, entityType: 'school', schoolId: s.id },
      onConfirm: function () { s.archived = true; toast(s.name + ' archived.'); go('schools', {}); } });
  }

  // Baseline / Midline / Endline cards from a school summary (hub + group drill-in).
  function phaseProgressHtml(d) {
    return '<div class="tl-phases">' + d.assessment_progress.map(function (p) {
      var tone = !p.deployed ? 'muted' : (p.status === 'Live' ? 'live' : (p.status === 'Ended' ? 'done' : 'sched'));
      return '<div class="tl-phase ' + tone + '"><div class="tp-name">' + esc(p.phase) + '</div>' +
        '<div class="tp-state">' + (p.deployed ? esc(p.status) : 'Not deployed') + '</div>' +
        (p.deployed ? '<div class="tp-win">' + esc(p.window || '') + '</div><div class="tp-comp" title="Children who have finished every assessment deployed to this school for this phase">' +
          (p.completion != null ? pct(p.completion) + '% complete' + (p.kidsTotal ? ' · ' + p.kidsDone + ' of ' + p.kidsTotal + ' children' : '') : '') + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }

  // ---- Expected class size (shared TilliAPI roster) ----
  // A section's room — added / expected / pending — or null for a portfolio
  // school that only carries headline numbers.
  function roomFor(schoolId, grade, section) {
    var A = window.TilliAPI;
    return A && A.sectionRoom ? A.sectionRoom(schoolId, grade, section || '') : null;
  }
  // The count on a section chip: "12/14" plus a short tag for what's missing.
  function roomChipHtml(room, fallback) {
    if (!room) return ' <i>' + fallback + '</i>';
    var html = ' <i>' + room.added + (room.expected != null ? '/' + room.expected : '') + '</i>';
    if (room.expected == null) html += '<em class="tl-room-tag warn" title="No expected class size set — teachers can’t add students here without an admin’s approval.">no size set</em>';
    else if (!room.confirmed) html += '<em class="tl-room-tag warn" title="Set automatically from the headcount — confirm it in Settings → Grades & sections.">not confirmed</em>';
    else if (room.left) html += '<em class="tl-room-tag" title="' + room.left + ' still to add before this class is complete.">' + room.left + ' to add</em>';
    if (room.pending) html += '<em class="tl-room-tag pend" title="New students a teacher added past the expected size — waiting for approval.">+' + room.pending + ' pending</em>';
    return html;
  }
  // Approve / turn down a child a teacher added past the class size.
  function decideNewStudent(st, approve, after) {
    var nm = st.name || st.student_id;
    if (approve) {
      var r = window.TilliAPI.decideStudent(st.school_id, st.student_id, true, me.email);
      if (!r.ok) { toast('That request was already handled.'); after(); return; }
      ORG.server.logAudit(me.name, 'student.approve', nm, 'student', st.school_id);
      toast(nm + ' approved' + (r.room && r.room.expected ? ' — ' + r.room.name + ' now expects ' + r.room.expected + '.' : '.'));
      after(); return;
    }
    gated({ title: 'Turn down new student', danger: true,
      body: '<p>Remove <b>' + esc(nm) + '</b> (' + esc(st.student_id) + ') from <b>' + esc(st.section_name) + '</b>? Do this when the child is a duplicate or isn’t at this school. Anything already recorded for them is removed too.</p>',
      confirmLabel: 'Turn down', audit: { action: 'student.reject', entity: nm, entityType: 'student', schoolId: st.school_id },
      onConfirm: function () { window.TilliAPI.decideStudent(st.school_id, st.student_id, false, me.email); toast(nm + ' turned down and removed.'); after(); } });
  }
  // Table of waiting children with Approve / Turn down. showSchool for the cross-school page.
  function pendingTableHtml(list, showSchool) {
    return '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Student</th>' + (showSchool ? '<th>School</th>' : '') +
      '<th>Class</th><th>Added by</th><th>Class size</th><th></th></tr></thead><tbody>' +
      list.map(function (st, i) {
        var rm = st.room;
        return '<tr><td class="name">' + esc(st.name) + ' <span class="mono tl-muted">' + esc(st.student_id) + '</span></td>' +
          (showSchool ? '<td><a class="btn-link" href="' + href('school', { id: st.school_id, tab: 'students' }) + '">' + esc(st.school_name) + '</a></td>' : '') +
          '<td>' + esc(secLbl(st.school_id, st.grade, st.section)) + '</td>' +
          '<td>' + esc(st.requestedByName) + ' <span class="tl-muted">· ' + esc(timeAgo(st.requestedAt)) + '</span></td>' +
          '<td title="Students added / expected size">' + (rm ? (rm.expected == null ? 'Not set' : rm.added + ' of ' + rm.expected) : '—') + '</td>' +
          '<td class="r nowrap"><button class="btn btn-primary btn-sm" data-approve="' + i + '">Approve</button> <button class="btn-link danger" data-turndown="' + i + '">Turn down</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function wirePendingTable(root, list, after) {
    // Approve / turn down changes the roster, so the school's header counts are re-read first.
    var done = function (st) { return function () { ORG.refreshApiSchool(st.school_id); after(); }; };
    root.querySelectorAll('[data-approve]').forEach(function (b) { b.addEventListener('click', function () { var st = list[+b.dataset.approve]; decideNewStudent(st, true, done(st)); }); });
    root.querySelectorAll('[data-turndown]').forEach(function (b) { b.addEventListener('click', function () { var st = list[+b.dataset.turndown]; decideNewStudent(st, false, done(st)); }); });
  }

  // ---- Hub tabs ----
  var HUB = {};
  HUB.history = function (d, el) {
    var s = d.school;
    el.innerHTML = '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Change history</h3>' +
        '<p class="ui-mod-note">Student records and assessments at this school — who changed what, and when.</p></div>' +
        '<a class="btn-link" href="' + href('history', { school: s.id }) + '">Filter &amp; search →</a></div>' +
      histList(ORG.server.history([s.id], { limit: 40 }), { showSchool: false, empty: 'No changes recorded for this school yet.' }) + '</div>';
  };
  HUB.overview = function (d, el) {
    var s = d.school;
    var structure = d.structure.grades.length
      ? '<div class="tl-tree">' + d.structure.grades.map(function (g) {
          var body = g.sections.length
            ? g.sections.map(function (sec) { return '<span class="tl-tree-sec">' + esc(sec.name) + baseTag(sec.name, sec.base, 'sec') + roomChipHtml(roomFor(s.id, g.grade, sec.name), sec.students) + '</span>'; }).join('')
            : '<span class="tl-tree-sec" title="Students and teachers are placed in sections — add a section to this grade before adding them.">No sections yet' + ((parseInt(g.students, 10) || 0) ? ' <i>' + parseInt(g.students, 10) + '</i>' : '') + '</span>';
          return '<div class="tl-tree-grade"><b>' + esc(g.grade) + '</b>' + baseTag(g.grade, g.base || inferBase(g.grade)) + body + '</div>';
        }).join('') + '</div>'
      : '<div class="ui-empty">No grades/sections yet.</div>';

    var progress = phaseProgressHtml(d);

    var flags = d.flags.length ? '<div class="tl-flagrow">' + d.flags.map(function (f) { return '<span class="ui-chip warn lg">⚠ ' + esc(f.label) + '</span>'; }).join('') + '</div>' : '<div class="tl-ok">On track — no onboarding flags. 🌱</div>';

    var issues = d.issues.filter(function (i) { return i.status === 'open'; }).slice(0, 4);
    var issuesHtml = issues.length ? issues.map(function (i) { return '<div class="tl-feed-row"><span class="tl-feed-when">' + esc(i.date) + '</span><span class="tl-feed-body">' + esc(i.page) + ' · <i>' + esc(i.reporter) + '</i></span></div>'; }).join('') : '<div class="ui-empty">No open issues.</div>';

    // Live schools: outcomes come from the latest finished phase (any year), labelled
    // with that year + phase; the Year over year card follows from year 2.
    var yrs = schoolYears(s), latest = yrs ? latestOutcomes(s, yrs) : null;
    var outcomes = GROUP ? '' : latest
      ? outcomesCardHtml(latest.sel, latest.cog, 'Average skill score (0–100) · ' + latest.label + '.', 'span2')
      : outcomesCardHtml(yrs ? null : s.sel, yrs ? null : s.cog, 'Average skill score (0–100) from this school’s latest results.', 'span2');
    var yoy = yrs && yrs.length > 1 ? yearOverYearHtml(s, yrs).replace('<div class="ui-card mt-gap">', '<div class="ui-card span2">')
      .replace('<h3 class="ui-mod-title">Year over year</h3>', '<h3 class="ui-mod-title">Year ' + yrs.length + ' with Tilli</h3>') : '';
    el.innerHTML = '<div class="tl-grid two">' +
      '<div class="ui-card"><div class="ui-mod-h"><h3 class="ui-mod-title">Structure</h3></div>' + structure + '</div>' +
      '<div class="ui-card"><div class="ui-mod-h"><h3 class="ui-mod-title">Onboarding</h3></div>' + flags + '</div>' +
      '<div class="ui-card span2"><div class="ui-mod-h"><h3 class="ui-mod-title">Assessment progress</h3></div>' + progress + '</div>' +
      yoy + outcomes +
      '<div class="ui-card span2"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Open issues</h3></div><button class="btn-link" data-hubtab="issues">View all →</button></div>' + issuesHtml + '</div>' +
    '</div>';
    // [data-hubtab] triggers are wired by SCREEN.school's wireHubtabTriggers()
    // so they swap the section in place instead of re-rendering the screen.
  };

  HUB.students = function (d, el) {
    var s = d.school;
    var roster = s.id === 'little-sprouts' && TS ? TS.students.map(function (st) {
      return { name: st.first + ' ' + st.last, admission: st.adm, gradeSection: st.grade + ' ' + st.section, status: 'Active' };
    }) : (s.created && window.TilliAPI) ? window.TilliAPI.studentsForSchool(s.id).map(function (st) {
      return { name: st.name, admission: st.student_id, gradeSection: secLbl(s.id, st.grade, st.section), status: st.approval === 'pending' ? 'Pending' : 'Active' };
    }) : [];
    var waiting = window.TilliAPI && window.TilliAPI.pendingStudents ? window.TilliAPI.pendingStudents(s.id) : [];
    el.innerHTML = (waiting.length ? '<div class="ui-card tl-pendcard"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Waiting for approval</h3>' +
        '<p class="ui-mod-note">' + waiting.length + ' new student' + (waiting.length === 1 ? '' : 's') + ' added past the class size. They can already be assessed.</p></div></div>' +
        '<div id="stu-pending">' + pendingTableHtml(waiting, false) + '</div></div>' : '') +
      '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Student Directory</h3><p class="ui-mod-note">' + (roster.length ? roster.length + ' students · ' : '') + 'this school\'s roster.</p></div>' +
        '<div class="tl-inline-actions"><button class="btn btn-outline btn-sm" data-add-st>+ Add Students</button><button class="btn btn-outline btn-sm" data-merge-here>Merge Students</button>' +
          '<button class="btn btn-outline btn-sm" data-hubtab="issues" title="Students deleted at this school, who deleted them and when (Issues & Logs tab).">Deletion logs</button></div></div>' +
      (roster.length ? '<div class="tl-filters"><input class="input grow tl-filter-q" id="stu-q" type="search" placeholder="Search by name, admission # or grade/section…" aria-label="Search students" value="' + esc(stuPager.schoolId === s.id ? stuPager.q : '') + '"></div><div id="stu-page"></div>'
        : '<div class="ui-empty">No students yet — add students or import a CSV.</div>') + '</div>';
    if (waiting.length) wirePendingTable(el.querySelector('#stu-pending'), waiting, function () { go('school', { id: s.id, tab: 'students' }); });
    el.querySelector('[data-add-st]').addEventListener('click', function () { go('add-students', { school: s.id }); });
    el.querySelector('[data-merge-here]').addEventListener('click', function () { go('merge', { school: s.id }); });
    // [data-hubtab] Deletion logs button is wired in place by SCREEN.school.
    // Only the table + pager re-render when paging, so that button stays wired.
    if (stuPager.schoolId !== s.id) { stuPager.schoolId = s.id; stuPager.page = 1; stuPager.q = ''; }
    var mount = el.querySelector('#stu-page');
    function drawPage() {
      // Search matches any word of the query against name, admission # and grade/section.
      var words = stuPager.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      var list = words.length ? roster.filter(function (r) { var hay = (r.name + ' ' + r.admission + ' ' + r.gradeSection).toLowerCase(); return words.every(function (w) { return hay.indexOf(w) >= 0; }); }) : roster;
      var pages = Math.max(1, Math.ceil(list.length / stuPager.size));
      stuPager.page = Math.min(Math.max(1, stuPager.page), pages);
      var start = (stuPager.page - 1) * stuPager.size;
      var rows = list.slice(start, start + stuPager.size).map(function (r) {
        return '<tr><td class="name"><button class="btn-link" data-open-student="' + esc(r.admission) + '">' + esc(r.name) + '</button></td><td class="mono">' + esc(r.admission) + '</td><td>' + esc(r.gradeSection) + '</td><td>' + statusPill(r.status, r.status === 'Pending' ? 'warn' : 'ok') + '</td>' +
          '<td class="r"><button class="btn-link" data-edit-st="' + esc(r.admission) + '">Edit</button> <button class="btn-link danger" data-del-st="' + esc(r.admission) + '" data-nm="' + esc(r.name) + '">Delete</button></td></tr>';
      }).join('');
      if (!list.length) { mount.innerHTML = '<div class="ui-empty">No students match “' + esc(stuPager.q.trim()) + '”.</div>'; return; }
      mount.innerHTML = '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Name</th><th>Admission #</th><th>Grade/Section</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        pagerHtml(list.length, stuPager.page, stuPager.size, words.length ? 'matching students' : 'students');
      wirePager(mount, function (page, size) {
        if (size !== stuPager.size) { stuPager.size = size; stuPager.page = 1; try { localStorage.setItem(STU_PAGE_KEY, String(size)); } catch (e) { /* per-viewer convenience only */ } }
        else stuPager.page = page;
        drawPage();
        mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      mount.querySelectorAll('[data-open-student]').forEach(function (b) { b.addEventListener('click', function () { go('student', { school: s.id, adm: b.dataset.openStudent }); }); });
      mount.querySelectorAll('[data-del-st]').forEach(function (b) { b.addEventListener('click', function () {
        gated({ title: 'Delete student', danger: true, typed: 'DELETE', body: '<p>Delete <b>' + esc(b.dataset.nm) + '</b> (' + esc(b.dataset.delSt) + ')? This writes to Deletion Logs.</p>', confirmLabel: 'Delete student', audit: { action: 'student.delete', entity: b.dataset.nm, entityType: 'student', schoolId: s.id }, onConfirm: function () { toast('Student deleted — logged.'); } });
      }); });
      mount.querySelectorAll('[data-edit-st]').forEach(function (b) { b.addEventListener('click', function () { openStudentEditor(s.id, b.dataset.editSt, function () { go('school', { id: s.id, tab: 'students' }); }); }); });
    }
    var sq = el.querySelector('#stu-q');
    if (sq) sq.addEventListener('input', function () { stuPager.q = sq.value; stuPager.page = 1; drawPage(); });
    if (mount) drawPage();
  };

  // ---------- pager (Students + Staff tabs; reusable for any long table) ----------
  var PAGE_SIZES = [20, 50, 100];   // rows-per-page options
  var STU_PAGE_KEY = 'tilliMeasures.admin.studentsPerPage';
  var STAFF_PAGE_KEY = 'tilliMeasures.admin.staffPerPage';
  var USERS_PAGE_KEY = 'tilliMeasures.admin.usersPerPage';
  var ISSUES_PAGE_KEY = 'tilliMeasures.admin.issuesPerPage';
  // Remembered rows-per-page for one table (falls back to the first size).
  function savedPageSize(key) { try { var v = +localStorage.getItem(key); return PAGE_SIZES.indexOf(v) >= 0 ? v : PAGE_SIZES[0]; } catch (e) { return PAGE_SIZES[0]; } }
  var stuPager = { schoolId: null, page: 1, q: '', size: savedPageSize(STU_PAGE_KEY) };
  var staffPager = { schoolId: null, page: 1, size: savedPageSize(STAFF_PAGE_KEY) };
  // Users tab: `key` is the active role/kind/search — a new filter jumps back to page 1.
  var usersPager = { key: null, page: 1, size: savedPageSize(USERS_PAGE_KEY) };
  // Issue Reports: `key` is status tab + school — switching either jumps back to page 1.
  var issuesPager = { key: null, page: 1, size: savedPageSize(ISSUES_PAGE_KEY) };
  // Page numbers to show: first, last, and a window around the current page, with … gaps.
  function pageList(page, pages) {
    var out = [], want = {}; [1, pages, page - 1, page, page + 1].forEach(function (n) { if (n >= 1 && n <= pages) want[n] = 1; });
    Object.keys(want).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n, i, arr) { if (i && n - arr[i - 1] > 1) out.push('…'); out.push(n); });
    return out;
  }
  function pagerHtml(total, page, size, noun) {
    var pages = Math.max(1, Math.ceil(total / size)), from = total ? (page - 1) * size + 1 : 0, to = Math.min(total, page * size);
    return '<div class="tl-pager"><span class="tl-pager-info">Showing <b>' + from + '–' + to + '</b> of ' + total.toLocaleString() + ' ' + esc(noun) + '</span>' +
      '<label class="tl-pager-size">Per page <select class="select" data-pg-size aria-label="Rows per page">' +
        PAGE_SIZES.map(function (n) { return '<option value="' + n + '"' + (n === size ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
      '<nav class="tl-pager-nav" aria-label="Pages"><button class="tl-pg" data-pg="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">‹</button>' +
        pageList(page, pages).map(function (n) {
          return n === '…' ? '<span class="tl-pg-gap">…</span>' : '<button class="tl-pg' + (n === page ? ' on' : '') + '" data-pg="' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + n + '</button>';
        }).join('') +
        '<button class="tl-pg" data-pg="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + ' aria-label="Next page">›</button></nav></div>';
  }
  // onChange(page, size) — size changes reset to page 1 in the caller.
  function wirePager(root, onChange) {
    var sel = root.querySelector('[data-pg-size]'), cur = +sel.value;
    root.querySelectorAll('[data-pg]').forEach(function (b) { b.addEventListener('click', function () { if (!b.disabled) onChange(+b.dataset.pg, cur); }); });
    sel.addEventListener('change', function () { onChange(1, +sel.value); });
  }

  HUB.staff = function (d, el) {
    var s = d.school;
    // A school admin limited to some boards says so ("School Admin · CBSE only").
    function boardScopeTag(u) {
      var b = /school admin/i.test(u.role || '') && tlUsesApi(s) && schoolBoardList(s).length > 1 ? window.TilliAPI.adminBoards(s.id, u.email) : null;
      return b ? ' <span class="ui-tag" title="Sees only these boards’ grades, children and results">' + esc(b.join(' + ')) + ' only</span>' : '';
    }
    function staffRowHtml(u) {
      return '<tr><td class="name">' + esc(u.name) + '<small>' + esc(u.email) + '</small></td><td>' + esc(u.role) + boardScopeTag(u) + '</td>' +
        '<td>' + (u.sections && u.sections.length ? esc(u.sections.join(', ')) : '—') + '</td>' +
        '<td class="r"><div class="tl-rowacts"><button class="tl-rowact" data-role="' + esc(u.email) + '" title="Change role" aria-label="Change role for ' + esc(u.name) + '">' + ICONS.role + '</button>' +
        '<button class="tl-rowact danger" data-remove="' + esc(u.name) + '" title="Remove from school" aria-label="Remove ' + esc(u.name) + ' from this school">' + ICONS.trash + '</button></div></td></tr>';
    }

    var invRows = d.invitations.length ? d.invitations.map(function (i) {
      return '<tr><td class="name">' + esc(i.name) + '<small>' + esc(i.email) + '</small></td><td>' + esc(i.role) + boardScopeTag(i) + '</td><td>' + invStatusPill(i) + '</td><td>' + esc(i.expires) + '</td>' +
        '<td class="r"><div class="tl-rowacts"><button class="tl-rowact" data-resend="' + esc(i.email) + '" title="Resend invitation" aria-label="Resend invitation to ' + esc(i.email) + '">' + ICONS.resend + '</button>' +
          '<button class="tl-rowact danger" data-revoke="' + esc(i.email) + '" title="Revoke invitation" aria-label="Revoke invitation to ' + esc(i.email) + '">' + ICONS.revoke + '</button></div></td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="ui-empty">No invitations.</div></td></tr>';

    // One school code: teachers enter it to join (no per-teacher invite needed),
    // and it's part of every link the school shares. The explicit invite below
    // stays available for named onboarding.
    var teacherJoin = s.code;
    var joinCode = '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">School code</h3>' +
        '<p class="ui-mod-note">Teachers enter this to join ' + esc(s.name) + ' as a Teacher — no invite needed. It’s in the teacher and student-assessment links (keep those inside the school); the parents’ link doesn’t contain it.</p></div></div>' +
      '<div class="tl-linkrow"><div><b>School code</b><span class="mono">' + esc(teacherJoin) + '</span></div>' +
        '<div class="tl-inline-actions"><button class="btn btn-outline btn-sm" data-copy="' + esc(teacherJoin) + '">Copy code</button>' +
        (tlUsesApi(s) && !GROUP ? '<button class="btn-link danger" data-regen-code title="Use this if the code was shared outside the school.">Regenerate</button>' : '') + '</div></div></div>';

    // Demo access panel — the exact logins + codes needed to click through the
    // whole flow (coordinator → teacher → parent) for a created school.
    var codesCard = '';
    if (s.created && window.TilliAPI) {
      var teachers = (d.staff_users || []).filter(function (u) { return u.role === 'Teacher'; });
      var tRows = teachers.map(function (u) {
        return '<div class="ws-rev-row"><span>Teacher · ' + esc((u.sections || []).join(', ') || '—') + '</span><b class="mono">' + esc(u.email) + '</b></div>';
      }).join('');
      // Always read the live roster — the samples stashed at creation are empty
      // (new schools start with no students), so they'd hide every later child.
      var claims = window.TilliAPI.studentsForSchool(s.id).slice(0, 6).map(function (st) {
        return { adm: st.student_id, name: st.name, grade: st.grade, section: st.section, claimCode: st.claimCode };
      });
      var cRows = claims.map(function (c) {
        return '<div class="ws-rev-row"><span>' + esc(c.name) + ' · ' + esc(secLbl(s.id, c.grade, c.section)) + ' · adm ' + esc(c.adm) + '</span><b class="mono">' + esc(c.claimCode) + '</b></div>';
      }).join('');
      codesCard = '<div class="ui-card mb-gap"><div class="ui-mod-h"><div>' +
          '<h3 class="ui-mod-title">Demo access & codes</h3>' +
          '<p class="ui-mod-note">Everything you need to log in as each role for this school (all mock / localStorage). Claim method: <b>code</b>.</p></div></div>' +
        '<div class="ws-review">' +
          '<div class="ws-rev-row"><span><b>Coordinator login</b> (School dashboard)</span><b class="mono">' + esc(s.coordinator ? s.coordinator.email : '—') + '</b></div>' +
          '<div class="ws-rev-row"><span><b>School code</b> (teacher sign-up, student assessments)</span><span class="tl-coderow"><b class="mono">' + esc(teacherJoin) + '</b>' +
            '<button class="tl-rowact" data-copy="' + esc(teacherJoin) + '" title="Copy school code" aria-label="Copy school code">' + ICONS.copy + '</button></span></div>' +
          tRows +
          '<div class="ws-rev-row" style="border-top:1px solid var(--line-200);margin-top:6px;padding-top:10px"><span><b>Parent claim codes</b> (school = this school, then the code)</span><b></b></div>' +
          (cRows || '<div class="ws-rev-row"><span class="tl-muted">Add students first — each child gets a claim code a parent uses to link to them.</span></div>') +
        '</div></div>';
    }

    el.innerHTML = codesCard + joinCode +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Staff at this school</h3>' + (d.staff_users.length ? '<p class="ui-mod-note">' + d.staff_users.length + ' staff</p>' : '') + '</div><button class="btn btn-outline btn-sm" data-invite>+ Invite to this school</button></div>' +
        (d.staff_users.length ? '<div id="staff-page"></div>' : '<div class="ui-empty">No staff yet — invite a school admin or teacher.</div>') + '</div>' +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><h3 class="ui-mod-title">Invitations</h3></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Recipient</th><th>Role</th><th>Status</th><th>Expires</th><th></th></tr></thead><tbody>' + invRows + '</tbody></table></div></div>';
    el.querySelector('[data-invite]').addEventListener('click', function () { openInvite(s.id); });
    var rg = el.querySelector('[data-regen-code]');
    if (rg) rg.addEventListener('click', function () {
      gated({ title: 'Regenerate the school code', danger: true, confirmLabel: 'Regenerate now',
        body: '<p>' + esc(s.name) + ' gets a new code. <b>The teacher and student-assessment links and the old code stop working now</b> — share the new ones straight after. The parents’ link doesn’t contain the code, so it keeps working.</p><p class="tl-muted">Teachers and parents already signed in aren’t affected.</p>',
        audit: { action: 'school.code', entity: s.name, entityType: 'school', schoolId: s.id },
        onConfirm: function () {
          var r = window.TilliAPI.regenerateSchoolCode(s.id, me.email);
          if (!r.ok) { toast('Couldn’t change the code.'); return; }
          s.code = s.joinCode = r.code;
          toast('New school code: ' + r.code + '. Re-share the teacher and student-assessment links — the parents’ link hasn’t changed.');
          go('school', { id: s.id, tab: 'staff' });
        } });
    });
    el.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copy(b.dataset.copy, 'School code copied.'); }); });
    el.querySelectorAll('[data-resend]').forEach(function (b) { b.addEventListener('click', function () { ORG.server.logAudit(me.name, 'invitation.resend', b.dataset.resend, 'invitation', s.id); toast('Invitation resent to ' + b.dataset.resend + '.'); }); });
    el.querySelectorAll('[data-revoke]').forEach(function (b) { b.addEventListener('click', function () { gated({ title: 'Revoke invitation', danger: true, body: '<p>Revoke the invitation to <b>' + esc(b.dataset.revoke) + '</b>?</p>', confirmLabel: 'Revoke', audit: { action: 'invitation.revoke', entity: b.dataset.revoke, entityType: 'invitation', schoolId: s.id }, onConfirm: function () { toast('Invitation revoked.'); } }); }); });
    // Staff table — same pager as the Students tab (20 / 50 / 100 per page).
    if (staffPager.schoolId !== s.id) { staffPager.schoolId = s.id; staffPager.page = 1; }
    var mount = el.querySelector('#staff-page');
    function drawStaff() {
      var list = d.staff_users, pages = Math.max(1, Math.ceil(list.length / staffPager.size));
      staffPager.page = Math.min(Math.max(1, staffPager.page), pages);
      var start = (staffPager.page - 1) * staffPager.size;
      mount.innerHTML = '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>User</th><th>Role</th><th>Sections</th><th></th></tr></thead><tbody>' +
        list.slice(start, start + staffPager.size).map(staffRowHtml).join('') + '</tbody></table></div>' +
        pagerHtml(list.length, staffPager.page, staffPager.size, 'staff');
      wirePager(mount, function (page, size) {
        if (size !== staffPager.size) { staffPager.size = size; staffPager.page = 1; try { localStorage.setItem(STAFF_PAGE_KEY, String(size)); } catch (e) { /* per-viewer convenience only */ } }
        else staffPager.page = page;
        drawStaff();
        mount.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      mount.querySelectorAll('[data-role]').forEach(function (b) { b.addEventListener('click', function () { openRoleEditor(ORG.users.find(function (u) { return u.email === b.dataset.role; }), function () { go('school', { id: s.id, tab: 'staff' }); }); }); });
      mount.querySelectorAll('[data-remove]').forEach(function (b) { b.addEventListener('click', function () { gated({ title: 'Remove from school', danger: true, body: '<p>Remove <b>' + esc(b.dataset.remove) + '</b> from ' + esc(s.name) + '?</p>', confirmLabel: 'Remove', audit: { action: 'user.remove', entity: b.dataset.remove, entityType: 'user', schoolId: s.id }, onConfirm: function () { toast('Removed from school.'); } }); }); });
    }
    if (mount) drawStaff();
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
  // ── Deployment planner (school Assessments tab) ──────────────────────────
  // One tab per phase, split by place — "At school" (the teacher runs these)
  // and "At home" (a parent does these). Each place has ONE sequence, so
  // assessments of different audiences can be chained (teacher → direct at
  // school, parent → direct at home), plus an any-time group:
  // "In order" (a chain — #2 opens once #1 is done) and "Any time" (open as
  // soon as the phase is live), so one audience can mix both. Where an
  // assessment runs is fixed by its audience — teachers at school, parents at
  // home; only student direct can be either (school = the teacher runs it,
  // home = a parent does it with the child), and turning one on asks which.
  // The phase's Start → End dates are the schedule, editable any time.
  var TL_WHERE = { teacher: ['school'], parent: ['home'], direct: ['school', 'home'] };
  var TL_WHERE_LABEL = { school: 'At school', home: 'At home' };
  // Student direct: who runs it follows where it runs.
  var TL_DIRECT_WHO = { school: 'the teacher runs it', home: 'a parent does it with the child' };
  // The two places a phase is split into, and who's in each.
  var TL_PLACES = [
    { mode: 'school', label: 'At school', who: 'The teacher runs these', auds: ['teacher', 'direct'] },
    { mode: 'home', label: 'At home', who: 'A parent does these with the child', auds: ['parent', 'direct'] },
  ];
  var TL_WHERE_RULE = { teacher: 'At school only', parent: 'At home only', direct: 'At school or at home' };
  var TL_CHAIN_DEFAULT = { teacher: 'order', parent: 'any', direct: 'any' };   // group a newly-used assessment joins
  var TL_CHAIN = {};       // sid -> { 'Baseline|teacher': [{id,name,mode}], … }  (catalogue per phase)
  var TL_TAB = {};         // sid -> phase tab that's open
  // Phase / audience status — worked out from real deployments + completions only.
  var TL_ST_LABEL = { none: 'Not deployed', scheduled: 'Scheduled', live: 'Live', ended: 'Ended', completed: 'Completed' };
  var TL_ST_CHIP = { none: 'muted', scheduled: 'info', live: 'ok', ended: 'muted', completed: 'ok' };

  // My School Check-in (IDELA's school-safety questions, split out). Where it
  // runs isn't picked per phase: it follows the school's "Parents take part"
  // setting — at home when parents take part, else at school. At school it
  // turns on the own-class rule (TilliAPI.checkinAtSchool): no teacher runs
  // student direct assessments for their own class in that phase.
  var TL_CHECKIN = 'My School Check-in';
  function tlIsCheckin(it) { return !!it && String(it.name).toLowerCase() === TL_CHECKIN.toLowerCase(); }
  function tlParentsOn(s) { return tlUsesApi(s) ? window.TilliAPI.parentsTakePart(s.id) : s.parentsTakePart !== false; }
  function tlCheckinMode(s) { return tlParentsOn(s) ? 'home' : 'school'; }
  function tlCheckinNote(s) { return TL_CHECKIN + ' runs ' + (tlParentsOn(s) ? 'at home' : 'at school') + ' because parents ' + (tlParentsOn(s) ? '' : 'don’t ') + 'take part. Change it with “Parents take part” above the phases.'; }
  // The own-class rule needs another class to swap with — a one-class school
  // (one grade, one section) is exempt (TilliAPI.ownClassRuleOn).
  function tlSectionCount(s) { return tlUsesApi(s) ? window.TilliAPI.sectionsForSchool(s.id).length : (s.sectionCount || 2); }
  function tlRuleApplies(s) { return tlSectionCount(s) > 1; }
  function tlCheckinIds(p) { return Object.keys(p.byId).filter(function (id) { return tlIsCheckin(p.byId[id]); }); }
  function tlCheckinInUse(p) { return tlCheckinIds(p).some(function (id) { return tlGroupOf(p, id); }); }
  // Live phases whose in-use check-in would move if the setting flipped now.
  function tlLiveCheckinPhases(s) {
    return TL_PHASES.filter(function (ph) { var p = tlPlan(s, ph); return tlWindowStatus(s, p) === 'live' && tlCheckinInUse(p); });
  }
  // Results recorded at school by the child's own teacher (kept; flagged once the rule is on).
  function tlOwnClassResults(s, phase) { return tlUsesApi(s) && tlPlan(s, phase).deployed ? window.TilliAPI.ownClassResults(s.id, phase) : []; }
  // Before the own-class rule turns on in some phases: if own teachers already
  // recorded results there, say they're kept and flagged, then proceed.
  function tlWarnRuleOn(s, phases, proceed) {
    var n = tlRuleApplies(s) ? phases.reduce(function (t, ph) { return t + tlOwnClassResults(s, ph).length; }, 0) : 0;
    if (!n) { proceed(); return; }
    gated({ title: 'Turn on the own-class rule?', confirmLabel: 'Turn it on',
      body: '<p>In <b>' + esc(phases.join(', ')) + '</b>, <b>' + n + '</b> student assessment result' + (n === 1 ? ' was' : 's were') + ' recorded by the child’s own class teacher.</p>' +
        '<p>They’re kept, and flagged so you can tell them apart. From now on another teacher assesses each class.</p>',
      audit: { action: 'phase.ownclass', entity: n + ' results flagged · ' + phases.join(', '), entityType: 'phase', schoolId: s.id },
      onConfirm: proceed });
  }
  // Flip the setting, then move the check-in to its new place in every phase
  // that hasn't ended (ended phases keep where it actually ran). skipLive:
  // leave live phases as they are — the change applies from the next phase.
  // A child part-way through a moved check-in finishes it where they started
  // (TilliAPI.startAssessment / chainFor startedMode).
  function tlSetParentsOn(s, on, skipLive) {
    if (tlUsesApi(s)) window.TilliAPI.setParentsTakePart(s.id, on); else s.parentsTakePart = !!on;
    var mode = on ? 'home' : 'school';
    TL_PHASES.forEach(function (ph) {
      var p = tlPlan(s, ph), st = tlWindowStatus(s, p); if (st === 'ended' || (skipLive && st === 'live')) return;
      var moved = false;
      Object.keys(p.byId).forEach(function (id) {
        var it = p.byId[id]; if (!tlIsCheckin(it) || it.mode === mode) return;
        var grp = tlGroupOf(p, id); tlDetach(p, id); it.mode = mode;
        if (grp) { (grp === 'order' ? p.ord : p.any)[mode].push(id); moved = true; } else p.off.push(id);
      });
      if (moved) tlSaved(s, ph);
    });
  }

  function tlPool(aud) {
    if (aud === 'Teacher') return ['SEL Observation', 'EF Observation', 'Wellbeing Check', 'Classroom Climate', 'Term Review'];
    if (aud === 'Parent') return ['Home SEL Survey', 'Routines Report', 'Wellbeing Check', 'Screen-time Survey', 'Term Review'];
    return ['EMT 1', 'EMT 2', 'EMT 4', 'Hearts & Flowers', 'Memory Game'];
  }
  // Baseline has a fixed, curated set per audience; 'off' = in the catalogue but not used.
  function tlBaselineChain(aud) {
    if (aud === 'Teacher') return [
      { name: 'Pre-training', mode: 'school' },
      { name: 'Post-training', mode: 'school' },
      { name: 'Teacher observational report on student foundational skills', mode: 'school' },
    ];
    if (aud === 'Parent') return [
      { name: 'Home SEL Survey', mode: 'home' },
    ];
    return [
      { name: 'IDELA', mode: 'school' },
      { name: TL_CHECKIN, mode: 'checkin' },   // on by default; place follows the parent setting
      { name: 'Hearts & Flowers', mode: 'home' },
      { name: 'Memory Game', mode: 'off' },
      { name: 'EMT 1', mode: 'off' },
      { name: 'EMT 2', mode: 'off' },
      { name: 'EMT 4', mode: 'off' },
    ];
  }
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
        for (var i = 0; i < n; i++) out.push({ id: (phase + audKey + i).toLowerCase().replace(/[^a-z0-9]/g, ''), name: pool[i], mode: i < 2 ? (i === 0 ? 'school' : 'home') : 'off' });
        if (aud === 'Direct Assessment') out.push({ id: (phase + audKey + 'checkin').toLowerCase().replace(/[^a-z0-9]/g, ''), name: TL_CHECKIN, mode: 'checkin' });
        byS[k] = out;
      }
    }
    return byS[k];
  }
  // Where an assessment runs, forced by its audience (direct keeps its choice).
  function tlFixMode(ak, mode) { return TL_WHERE[ak].indexOf(mode) >= 0 ? mode : TL_WHERE[ak][0]; }
  var TL_AUD_SHORT = { teacher: 'Teacher', parent: 'Parent', direct: 'Student direct' };
  var TL_AUD_TAG = { teacher: 'persp-teacher', parent: 'persp-parent', direct: 'persp-student' };   // .ui-tag colour per audience
  var TL_AUD_CHIP = { teacher: 'Teacher', parent: 'Parent', direct: 'Direct' };   // short audience tag on each assessment
  var TL_PLAN = {};   // sid -> { phase -> { start, end, deployed, endedEarly, held, byId, ord:{school,home} (sequence), any:{school,home}, off:[] } }
  var TL_POP = null;  // the open per-item ⋯ menu, if any
  var TL_AUD_LABEL = { teacher: 'Teacher', parent: 'Parent', direct: 'Direct Assessment' };
  var TL_AUD_KEY = { 'Teacher': 'teacher', 'Parent': 'parent', 'Direct Assessment': 'direct' };
  function tlUsesApi(s) { return !!((s.created || s.live) && window.TilliAPI); }
  // Live / created schools run on today's date; mock schools on the demo's fixed date.
  function tlToday(s) { return tlUsesApi(s) ? localISO(new Date()) : TODAY_ISO; }

  function tlPlan(s, phase) {
    var byS = TL_PLAN[s.id] || (TL_PLAN[s.id] = {});
    if (!byS[phase]) {
      var byId = {}, ord = { school: [], home: [] }, any = { school: [], home: [] }, off = [];
      TL_AUD.forEach(function (a) {
        tlChain(s, phase, a.aud, a.key).forEach(function (it) {
          var b = byId[it.id] = { id: it.id, name: it.name, aud: a.key, mode: it.mode === 'checkin' ? tlCheckinMode(s) : tlFixMode(a.key, it.mode) };
          if (it.mode === 'off') off.push(it.id); else (TL_CHAIN_DEFAULT[a.key] === 'order' ? ord : any)[b.mode].push(it.id);
        });
      });
      var rec = byS[phase] = { start: '', end: '', deployed: false, endedEarly: false, held: false, byId: byId, ord: ord, any: any, off: off };
      // Hydrate from the real source so the planner and the teacher / parent
      // apps agree: the shared store for created and live schools, the
      // portfolio deployments for every other school.
      if (tlUsesApi(s)) {
        var deps = window.TilliAPI.getDeployments(s.id).filter(function (x) { return x.phase === phase; });
        if (deps.length) {
          rec.deployed = true; rec.start = deps[0].start || ''; rec.end = deps[0].end || '';
          // Everything in use goes back to the catalogue first…
          ['school', 'home'].forEach(function (m) { ord[m].concat(any[m]).forEach(function (id) { off.push(id); }); ord[m] = []; any[m] = []; });
          // …then exactly what's deployed comes back, in each place's sequence.
          var placed = [];
          TL_AUD.forEach(function (a, ai) {
            var dep = deps.find(function (x) { return x.audience === a.aud; }), ak = a.key;
            if (!dep) return;
            var laneOrdered = dep.chained == null ? TL_CHAIN_DEFAULT[ak] === 'order' : !!dep.chained;
            (dep.assessments || []).forEach(function (x, xi) {
              if (!byId[x.id]) byId[x.id] = { id: x.id, name: x.name || x.id, aud: ak, mode: tlFixMode(ak, x.mode) };
              else if (x.mode) byId[x.id].mode = tlFixMode(ak, x.mode);
              if (x.version) byId[x.id].version = x.version;
              var oi = off.indexOf(x.id); if (oi >= 0) off.splice(oi, 1);
              placed.push({ id: x.id, ordered: x.ordered != null ? !!x.ordered : laneOrdered, pos: x.pos != null ? x.pos : ai * 100 + xi });
            });
          });
          placed.sort(function (a, b) { return a.pos - b.pos; }).forEach(function (x) { (x.ordered ? ord : any)[byId[x.id].mode].push(x.id); });
        } else {
          // Not deployed yet: dates the Tilli team applied from the school calendar are the draft.
          var calc = window.TilliAPI.calendarFor(s.id), ap = calc && calc.applied && calc.applied[phase];
          if (ap) { rec.start = ap.start; rec.end = ap.end; rec.fromCalendar = true; }
        }
      } else {
        var md = ORG.deployments.filter(function (x) { return x.schoolId === s.id && x.phase === phase; });
        if (md.length) {
          rec.deployed = true;
          rec.start = md.map(function (x) { return x.start; }).sort()[0] || '';
          rec.end = md.map(function (x) { return x.end; }).sort().slice(-1)[0] || '';
          rec.endedEarly = md.every(function (x) { return x.status === 'Ended'; }) && rec.end >= TODAY_ISO;
          // Deployed but never published (portfolio data): stays Scheduled until it is.
          rec.held = md.every(function (x) { return x.status === 'Scheduled'; }) && rec.start <= TODAY_ISO;
        }
      }
    }
    return byS[phase];
  }
  // Dates → status, the same rule TilliAPI uses for every app.
  function tlWindowStatus(s, p) {
    if (!p.deployed) return 'none';
    if (p.endedEarly) return 'ended';
    if (p.held) return 'scheduled';
    var t = tlToday(s);
    if (p.start && t < p.start) return 'scheduled';
    if (p.end && t > p.end) return 'ended';
    return 'live';
  }
  // In use for an audience, across both places (school sequence, school any
  // time, then the same at home).
  function tlRunning(p, ak) {
    return p.ord.school.concat(p.any.school, p.ord.home, p.any.home).filter(function (id) { return p.byId[id].aud === ak; });
  }
  function tlRunningCount(p) { return TL_AUD.reduce(function (n, a) { return n + tlRunning(p, a.key).length; }, 0); }
  function tlInPlace(p, ids, mode) { return ids.filter(function (id) { return p.byId[id].mode === mode; }); }
  // { done, expected } for everything run in one place (null = not open yet / unknown).
  function tlPlaceCompletion(s, phase, p, mode) {
    var win = tlWindowStatus(s, p); if (win === 'none' || win === 'scheduled') return null;
    var pl = TL_PLACES.find(function (x) { return x.mode === mode; }), done = 0, exp = 0;
    if (tlUsesApi(s)) {
      // Children who've done everything that runs in this place.
      var k = window.TilliAPI.childrenDone(s.id, phase, null, { mode: mode });
      if (k.pct == null) return null;
      done = k.done; exp = k.total;
    } else {
      // Portfolio schools only report per audience: teachers at school, parents at home.
      var c2 = tlAudCompletion(s, phase, mode === 'school' ? 'teacher' : 'parent'); if (!c2) return null;
      done = c2.done; exp = c2.expected;
    }
    return exp ? { done: done, expected: exp } : null;
  }
  function tlGroupOf(p, id) { var m = p.byId[id].mode; return p.ord[m].indexOf(id) >= 0 ? 'order' : (p.any[m].indexOf(id) >= 0 ? 'any' : null); }
  // { done, expected } for one audience of a deployed phase (null = unknown).
  function tlAudCompletion(s, phase, ak) {
    if (tlUsesApi(s)) {
      var ids = window.TilliAPI.studentsForSchool(s.id).map(function (x) { return x.student_id; });
      var c = window.TilliAPI.completionStats(s.id, phase, TL_AUD_LABEL[ak], ids);
      return c.status === 'Not deployed' ? null : { done: c.done, expected: c.expected };
    }
    var r = ORG.results.find(function (x) { return x.schoolId === s.id && x.phase === phase && x.audience === TL_AUD_LABEL[ak]; });
    return r ? { done: r.responses, expected: r.expected } : null;
  }
  // → { st, pct, start, end, auds: { teacher: { st, pct, n } … } }
  function tlPhaseStatus(s, phase) {
    var p = tlPlan(s, phase), win = tlWindowStatus(s, p), auds = {}, done = 0, exp = 0, known = 0, deployedAuds = 0;
    TL_AUD.forEach(function (a) {
      var n = tlRunning(p, a.key).length;
      if (win === 'none' || !n) { auds[a.key] = { st: 'none', pct: null, n: n }; return; }
      deployedAuds++;
      var c = (win === 'scheduled') ? null : tlAudCompletion(s, phase, a.key), pct = c && c.expected ? Math.round(c.done * 100 / c.expected) : null;
      if (c && c.expected) { done += c.done; exp += c.expected; known++; }
      auds[a.key] = { st: (pct === 100 && win !== 'scheduled') ? 'completed' : win, pct: pct, n: n };
    });
    var pct = exp ? Math.round(done * 100 / exp) : null, kids = null;
    // Live schools: the one completion number — children who've done everything.
    if (tlUsesApi(s) && win !== 'none' && win !== 'scheduled') { kids = window.TilliAPI.childrenDone(s.id, phase); if (kids.pct != null) pct = kids.pct; }
    // Completed only when every deployed audience has every response in.
    var st = win !== 'none' && win !== 'scheduled' && deployedAuds && known === deployedAuds && pct === 100 ? 'completed' : win;
    return { st: st, pct: pct, kids: kids, start: p.start, end: p.end, auds: auds, today: tlToday(s) };
  }
  function tlDateLine(ps) {
    var f = function (v) { return v ? fmtJoined(v) : '—'; };
    if (ps.st === 'none') return '';
    if (ps.st === 'scheduled') return (ps.start <= ps.today ? 'Waiting to be published · window ' + f(ps.start) + ' → ' + f(ps.end) : 'Goes live ' + f(ps.start) + ' · ends ' + f(ps.end));
    var done = ps.pct == null ? '' : ps.kids ? ' · ' + ps.kids.done + ' of ' + ps.kids.total + ' children done (' + ps.pct + '%)' : ' · ' + ps.pct + '% complete';
    if (ps.st === 'live') return 'Live since ' + f(ps.start) + ' · ends ' + f(ps.end) + done;
    if (ps.st === 'ended') return 'Ended ' + f(ps.end) + done;
    return 'Completed · ran ' + f(ps.start) + ' → ' + f(ps.end);
  }
  // Open tab: the live phase, else the next scheduled one, else the first not deployed.
  function tlDefaultTab(s) {
    var st = TL_PHASES.map(function (ph) { return { ph: ph, x: tlPhaseStatus(s, ph) }; });
    var live = st.filter(function (o) { return o.x.st === 'live'; })[0];
    var sched = st.filter(function (o) { return o.x.st === 'scheduled'; }).sort(function (a, b) { return a.x.start < b.x.start ? -1 : 1; })[0];
    var none = st.filter(function (o) { return o.x.st === 'none'; })[0];
    return (live || sched || none || st[st.length - 1]).ph;
  }

  // Persist a phase into the shared TilliAPI store, per audience, in order,
  // with where each runs and whether it's chained — the teacher & parent apps
  // read exactly this.
  // A teacher's own surveys — counted once per teacher, not once per child.
  var TL_PER_TEACHER = ['Pre-training', 'Post-training'];
  // The template behind a planner item: added from Templates (id 'tpl-…'), or
  // the catalogue name matching a template's name ('EMT 1' → 'EMT · …').
  function tlTemplateFor(it) {
    if (String(it.id).indexOf('tpl-') === 0) { var byId = ORG.templates.find(function (t) { return 'tpl-' + t.id === it.id; }); if (byId) return byId; }
    var n = String(it.name).toLowerCase();
    return ORG.templates.find(function (t) { var full = t.title.toLowerCase(), short = full.split(' · ')[0]; return !t.archived && (n === full || n === short || n.indexOf(short + ' ') === 0); }) || null;
  }
  function tlPersistDeploy(s, phase) {
    if (!tlUsesApi(s)) return;
    var p = tlPlan(s, phase), deps = window.TilliAPI.getDeployments(s.id);
    Object.keys(TL_AUD_LABEL).forEach(function (k) {
      var prev = deps.find(function (x) { return x.phase === phase && x.audience === TL_AUD_LABEL[k]; });
      var list = tlRunning(p, k).map(function (id) {
        // pos = place in its location's sequence — chains can cross audiences.
        var it = p.byId[id], at = p.ord[it.mode].indexOf(id), o = { id: id, name: it.name, mode: it.mode, ordered: at >= 0 };
        if (at >= 0) o.pos = at;
        // Version pin: an item already deployed keeps the version it started with;
        // a newly deployed one takes the template's live version for this phase.
        var was = prev && (prev.assessments || []).find(function (x) { return x.id === id; }), tpl = tlTemplateFor(it), lv = tpl && tplLive(tpl, phase);
        var ver = was && was.version ? was.version : (lv ? lv.v : null);
        if (ver) { o.version = ver; it.version = ver; }
        if (k === 'teacher' && TL_PER_TEACHER.indexOf(it.name) >= 0) o.perTeacher = true;
        return o;
      });
      if (list.length) window.TilliAPI.deployPhase(s.id, phase, TL_AUD_LABEL[k], { start: p.start, end: p.end, window: p.start + ' → ' + p.end, assessments: list });
      else window.TilliAPI.undeployPhase(s.id, phase, TL_AUD_LABEL[k]);
    });
  }
  function tlPersistUndeploy(s, phase) {
    if (!tlUsesApi(s)) return;
    Object.keys(TL_AUD_LABEL).forEach(function (k) { window.TilliAPI.undeployPhase(s.id, phase, TL_AUD_LABEL[k]); });
  }
  // Edits — each saves straight away when the phase is already deployed.
  function tlSaved(s, phase) { if (tlPlan(s, phase).deployed) tlPersistDeploy(s, phase); }
  // Student direct only: move to the other place, same group, at the end.
  function tlSetMode(s, phase, id, mode) {
    var p = tlPlan(s, phase), it = p.byId[id];
    if (TL_WHERE[it.aud].indexOf(mode) < 0) { toast(TL_AUD_SHORT[it.aud] + ' assessments run ' + TL_WHERE_RULE[it.aud].toLowerCase() + '.'); return false; }
    if (tlIsCheckin(it) && mode !== tlCheckinMode(s)) { toast(tlCheckinNote(s)); return false; }
    var grp = tlGroupOf(p, id); tlDetach(p, id); it.mode = mode;
    if (grp) (grp === 'order' ? p.ord : p.any)[mode].push(id); else p.off.push(id);
    tlSaved(s, phase); return true;
  }
  function tlDetach(p, id) {
    [p.ord.school, p.ord.home, p.any.school, p.any.home, p.off].forEach(function (q) { var i = q.indexOf(id); if (i >= 0) q.splice(i, 1); });
  }
  function tlTurnOff(s, phase, id) { var p = tlPlan(s, phase); tlDetach(p, id); p.off.push(id); tlSaved(s, phase); }
  // group: 'order' | 'any' (default: the audience's usual group). Joins the end
  // of its place's sequence / any-time list.
  function tlTurnOn(s, phase, id, group) {
    var p = tlPlan(s, phase), it = p.byId[id];
    tlDetach(p, id); it.mode = tlIsCheckin(it) ? tlCheckinMode(s) : tlFixMode(it.aud, it.mode);
    ((group || TL_CHAIN_DEFAULT[it.aud]) === 'order' ? p.ord : p.any)[it.mode].push(id);
    tlSaved(s, phase);
  }
  function tlSetGroup(s, phase, id, group) { var p = tlPlan(s, phase), it = p.byId[id]; tlDetach(p, id); (group === 'order' ? p.ord : p.any)[it.mode].push(id); tlSaved(s, phase); }
  // Move into a group (and, for student direct, a place), before beforeId.
  function tlReorder(s, phase, id, beforeId, group, mode) {
    var p = tlPlan(s, phase), it = p.byId[id];
    if (mode && TL_WHERE[it.aud].indexOf(mode) >= 0 && !tlIsCheckin(it)) it.mode = mode;
    tlDetach(p, id);
    var q = (group === 'any' ? p.any : p.ord)[it.mode], bi = beforeId != null ? q.indexOf(beforeId) : -1;
    q.splice(bi >= 0 ? bi : q.length, 0, id); tlSaved(s, phase);
  }
  // Swap with the neighbour in its place's sequence.
  function tlShift(s, phase, id, delta) {
    var p = tlPlan(s, phase), q = p.ord[p.byId[id].mode], i = q.indexOf(id), j = i + delta;
    if (i < 0 || j < 0 || j >= q.length) return;
    q[i] = q[j]; q[j] = id; tlSaved(s, phase);
  }
  // Student direct: ask where it runs (and so who runs it), then do(mode).
  function askDirectWhere(name, cur, done) {
    openModal('Where should “' + name + '” run?', '<p class="tl-muted">Student direct assessments can run in either place. Choose one — you can change it later from its ⋯ menu.</p>' +
      '<div class="dep-where-pick">' + ['school', 'home'].map(function (m) {
        return '<button type="button" class="dep-where-opt' + (m === cur ? ' on' : '') + '" data-pick="' + m + '"><span class="dep-where md-' + m + '">' + TL_WHERE_LABEL[m] + '</span>' +
          '<b>' + (m === 'school' ? 'Teacher runs it' : 'Parent does it with the child') + '</b><span>' + (m === 'school' ? 'Shows up for the class teacher during the school day.' : 'Shows up in the parent app as an activity to do at home.') + '</span></button>';
      }).join('') + '</div>', function (close) { close(); return true; }, 'Cancel');
    setTimeout(function () {
      document.querySelectorAll('[data-pick]').forEach(function (b) { b.addEventListener('click', function () { document.getElementById('tl-modal-root').innerHTML = ''; done(b.dataset.pick); }); });
    }, 0);
  }

  // What would stop a phase running well once deployed: classes with no teacher,
  // no students at all, and items whose template has no live version for this
  // phase. Warnings only — the Tilli team can still deploy (e.g. to schedule ahead).
  function deployChecks(s, phase, p) {
    var out = [], A = window.TilliAPI;
    var ids = TL_AUD.reduce(function (acc, a) { return acc.concat(tlRunning(p, a.key)); }, []);
    if (tlUsesApi(s)) {
      if (!A.studentsForSchool(s.id).length)
        out.push({ text: 'This school has <b>no students</b> yet.', fix: 'Add students', href: href('add-students', { school: s.id }) });
      var taught = {}; A.teachersFor(s.id).forEach(function (t) { t.section_ids.forEach(function (x) { taught[x] = 1; }); });
      var teacherRuns = ids.some(function (id) { var it = p.byId[id]; return it.aud === 'teacher' || (it.aud === 'direct' && it.mode === 'school'); });
      var bare = A.sectionsForSchool(s.id).filter(function (x) { return !taught[x.section_id]; });
      if (teacherRuns && bare.length)
        out.push({ text: '<b>' + bare.length + ' class' + (bare.length === 1 ? '' : 'es') + ' with no teacher</b> (' + esc(bare.slice(0, 4).map(function (x) { return x.name; }).join(', ') + (bare.length > 4 ? '…' : '')) + ') — nobody can run the at-school assessments there.', fix: 'Staff & Access', href: href('school', { id: s.id, tab: 'staff' }) });
    }
    // Teachers' own Pre / Post-training surveys aren't template-based, so they're skipped.
    var noLive = ids.filter(function (id) { var it = p.byId[id], tpl = tlTemplateFor(it); return TL_PER_TEACHER.indexOf(it.name) < 0 && !it.version && !(tpl && tplLive(tpl, phase)); }).map(function (id) { return p.byId[id].name; });
    if (noLive.length)
      out.push({ text: '<b>' + esc(noLive.join(', ')) + '</b> ' + (noLive.length === 1 ? 'has' : 'have') + ' no live ' + esc(phase) + ' version — there may be nothing to answer.', fix: 'Templates', href: href('templates', {}) });
    return out;
  }

  function planPhaseBody(s, phase) {
    var p = tlPlan(s, phase), ps = tlPhaseStatus(s, phase), running = tlRunningCount(p);
    var missing = [];
    if (!p.start) missing.push('a start date'); if (!p.end) missing.push('an end date'); if (!running) missing.push('at least one assessment');
    // End before start is shown as an error and blocks Deploy — never "fixed" for you.
    var badDates = !!(p.start && p.end && p.end < p.start);
    var ready = !missing.length && !badDates && !p.deployed;
    var deployBtn = p.deployed
      ? '<button class="btn btn-outline btn-sm" data-undeploy="' + esc(phase) + '" title="Take this phase back to draft — teachers and parents lose access">Undeploy</button>'
      : '<button class="btn btn-primary btn-sm" data-deploy="' + esc(phase) + '"' + (ready ? '' : ' disabled') + '>Deploy phase</button>';
    var statusPill = '<span class="ui-chip ' + TL_ST_CHIP[ps.st] + '">' + (ps.st === 'live' ? '● ' : ps.st === 'completed' ? '✓ ' : '') + TL_ST_LABEL[ps.st] + '</span>';
    var head = '<div class="dep-phase-head">' +
      '<span class="dep-phase-name">' + esc(phase) + '</span>' + statusPill +
      '<span class="dep-phase-sum">' + running + ' in use · ' + p.off.length + ' not used</span>' +
      '<span class="dep-dates" title="The phase goes live on the start date and closes after the end date. You can change both at any time.">' +
        '<label>Start <input type="date" class="dep-date" data-date="' + esc(phase) + '|start" value="' + esc(p.start) + '"' + (p.end ? ' max="' + esc(p.end) + '"' : '') + ' aria-label="' + esc(phase) + ' start date"></label>' +
        '<span class="dep-date-sep">→</span>' +
        '<label>End <input type="date" class="dep-date" data-date="' + esc(phase) + '|end" value="' + esc(p.end) + '"' + (p.start ? ' min="' + esc(p.start) + '"' : '') + ' aria-label="' + esc(phase) + ' end date"></label>' +
      '</span>' + deployBtn + '</div>' +
      (badDates ? '<div class="dep-phase-when dep-date-err" role="alert">The end date (' + esc(fmtJoined(p.end)) + ') is before the start date (' + esc(fmtJoined(p.start)) + '). Fix one of them' + (p.deployed ? ' — until then the saved dates stay as they were.' : ' to deploy.') + '</div>'
        : ps.st !== 'none' ? '<div class="dep-phase-when st-' + ps.st + '">' + esc(tlDateLine(ps)) + '</div>'
        : p.fromCalendar && ready ? '<div class="dep-phase-when">Dates from the school calendar — ready to deploy; it goes live on ' + esc(fmtJoined(p.start)) + '.</div>'
        : (!ready ? '<div class="dep-phase-when">To deploy, add ' + esc(missing.join(', ').replace(/, ([^,]*)$/, ' and $1')) + '.</div>' : '<div class="dep-phase-when">Ready to deploy — it goes live on ' + esc(fmtJoined(p.start)) + '.</div>'));

    var chip = function (id, n, prev) {
      var it = p.byId[id];
      var tip = (n ? '#' + n + (prev ? ' — opens once “' + prev + '” is done' : ' — opens first') : 'Any time — open as soon as the phase is live') + (tlIsCheckin(it) ? '. ' + tlCheckinNote(s) : '');
      return '<div class="dep-node md-' + it.mode + (tlIsCheckin(it) ? ' is-checkin' : '') + '" draggable="true" data-item="' + esc(id) + '" title="' + esc(tip) + '">' +
        (n ? '<span class="dep-ord">' + n + '</span>' : '') +
        '<span class="dep-node-name">' + esc(it.name) + '</span>' +
        (it.version ? '<span class="dep-ver" title="Deployed with v' + it.version + ' of this template — this window keeps it even if a newer version is published">v' + it.version + '</span>' : '') +
        '<span class="ui-tag ' + TL_AUD_TAG[it.aud] + '">' + esc(TL_AUD_CHIP[it.aud]) + '</span>' +
        '<button class="dep-item-menu" data-menu="' + esc(id) + '" aria-label="Options for ' + esc(it.name) + '">⋯</button></div>';
    };
    // An empty group only shows while dragging, as a drop target.
    var group = function (ak, mode, grp, ids) {
      var ord = grp === 'order';
      var chips = ids.map(function (id, i) { return (ord && i ? '<span class="dep-arrow" aria-hidden="true">→</span>' : '') + chip(id, ord ? i + 1 : 0, ord && i ? p.byId[ids[i - 1]].name : null); }).join('');
      return '<div class="dep-group' + (ids.length ? '' : ' is-empty') + '"><span class="dep-group-l" title="' + (ord ? 'Each opens once the one before it is done' : 'Open as soon as the phase is live, in any order') + '">' + (ord ? 'In order' : 'Any time') + '</span>' +
        '<div class="dep-aud-items" data-drop="' + ak + '|' + grp + '|' + mode + '">' + (chips || '<span class="dep-lane-empty">Drop here to make it ' + (ord ? 'part of the sequence' : 'any time') + '.</span>') + '</div></div>';
    };
    var rows = TL_PLACES.map(function (pl) {
      var m = pl.mode, ord = p.ord[m], any = p.any[m], has = ord.length || any.length;
      var c = tlPlaceCompletion(s, phase, p, m), win = tlWindowStatus(s, p), pct = c ? Math.round(c.done * 100 / c.expected) : null;
      var st = win === 'none' || !has ? '' : '<span class="dep-aud-st st-' + (pct === 100 ? 'completed' : win) + '">' + (pct === 100 ? 'Completed' : TL_ST_LABEL[win]) + (pct != null ? ' · ' + pct + '%' : '') + '</span>';
      var auds = pl.auds.map(function (ak) { return TL_AUD_CHIP[ak]; }).join(' and ');
      return '<div class="dep-aud dep-place" data-place="' + m + '">' +
        '<div class="dep-aud-h"><span class="dep-place-tag md-' + m + '">' + esc(pl.label) + '</span>' + st + '<span class="dep-aud-rule">' + esc(pl.who) + ' · ' + esc(auds) + ' assessments</span></div>' +
        (has ? group(pl.auds.join(','), m, 'order', ord) + group(pl.auds.join(','), m, 'any', any)
          : '<span class="dep-lane-empty">Nothing runs ' + esc(pl.label.toLowerCase()) + ' in ' + esc(phase) + ' — turn one on below or use + Add assessment.</span>') + '</div>';
    }).join('');

    var offChips = p.off.map(function (id) {
      var it = p.byId[id];
      return '<span class="dep-offitem"><span class="ui-tag ' + TL_AUD_TAG[it.aud] + '">' + esc(TL_AUD_SHORT[it.aud]) + '</span>' + esc(it.name) +
        '<button class="btn-link" data-turnon="' + esc(id) + '">Turn on</button></span>';
    }).join('');
    var offBox = p.off.length ? '<details class="dep-off"><summary>Not used in ' + esc(phase) + ' (' + p.off.length + ')</summary><div class="dep-off-list">' + offChips + '</div></details>' : '';
    // Own-class rule: on while the check-in is in use at school this phase
    // (and the school has more than one class).
    var ckSchool = tlRunning(p, 'direct').some(function (id) { return tlIsCheckin(p.byId[id]) && p.byId[id].mode === 'school'; });
    var ruleOn = ckSchool && tlRuleApplies(s), flagged = ruleOn ? tlOwnClassResults(s, phase).length : 0;
    var rule = ruleOn ? '<div class="tl-filterbanner dep-rule"><b>Own-class rule is on for ' + esc(phase) + '.</b> ' + TL_CHECKIN + ' runs at school, so no teacher runs student assessments for their own class — another teacher does, using the student direct-assessment link.' +
        (flagged ? ' <b>' + flagged + '</b> earlier result' + (flagged === 1 ? ' was' : 's were') + ' recorded by the child’s own teacher — kept and flagged.' : '') + '</div>'
      : ckSchool ? '<div class="tl-filterbanner dep-rule">' + TL_CHECKIN + ' runs at school, but this school has only one class, so the own-class rule doesn’t apply — its teacher runs everything.</div>' : '';
    return '<div class="dep-phase" data-phase="' + esc(phase) + '">' + head + rule + rows + offBox + '</div>';
  }

  function renderPlanner(d, mount) {
    if (!mount) return;
    var s = d.school;
    if (!TL_TAB[s.id]) TL_TAB[s.id] = tlDefaultTab(s);
    var cur = TL_TAB[s.id];
    var tabs = TL_PHASES.map(function (ph) {
      var x = tlPhaseStatus(s, ph);
      return '<button class="dep-tab' + (ph === cur ? ' on' : '') + '" role="tab" aria-selected="' + (ph === cur) + '" data-tab="' + ph + '">' + esc(ph) +
        '<span class="dep-tab-st st-' + x.st + '">' + TL_ST_LABEL[x.st] + (x.pct != null && x.st !== 'scheduled' ? ' · ' + x.pct + '%' : '') + '</span></button>';
    }).join('');
    var on = tlParentsOn(s), live = tlLiveCheckinPhases(s);
    // Phases still running the check-in in the old place (changed "from the next phase").
    var lag = TL_PHASES.filter(function (ph) { var p = tlPlan(s, ph); return tlWindowStatus(s, p) !== 'ended' && tlCheckinIds(p).some(function (id) { return tlGroupOf(p, id) && p.byId[id].mode !== tlCheckinMode(s); }); });
    var parents = '<div class="dep-parents"><div class="dep-parents-txt"><b>Parents take part in Tilli Measures</b>' +
      '<span>' + (on ? TL_CHECKIN + ' runs at home — the parent asks their child the questions.'
        : TL_CHECKIN + ' runs at school' + (tlRuleApplies(s) ? ' — so no teacher runs student assessments for their own class.' : '.')) + '</span>' +
      (lag.length ? '<span>' + esc(lag.join(', ')) + ' keeps it ' + (on ? 'at school' : 'at home') + ' until it ends.</span>' : '') +
      (live.length ? '<span class="dep-parents-lock">Locked while ' + esc(live.join(', ')) + ' is live — changing it asks whether to apply it now or from the next phase.</span>' : '') + '</div>' +
      '<span title="On: parents take part, so ' + TL_CHECKIN + ' goes home. Off: it runs at school and the own-class rule applies. Ended phases keep where it ran.">' +
        switchHtml(on, ' data-parents-on aria-label="Parents take part in Tilli Measures"') + '</span></div>';
    mount.innerHTML = parents + '<div class="dep-tabs" role="tablist" aria-label="Phases">' + tabs + '</div>' + planPhaseBody(s, cur);
    wirePlanner(d, mount);
  }

  function closeItemMenu() { if (TL_POP) { TL_POP.remove(); TL_POP = null; } document.removeEventListener('mousedown', onPopOutside); document.removeEventListener('keydown', onPopKey); }
  function onPopOutside(e) { if (TL_POP && !TL_POP.contains(e.target)) closeItemMenu(); }
  function onPopKey(e) { if (e.key === 'Escape') closeItemMenu(); }
  function refreshPlanner(d) {
    closeItemMenu();
    var pm = document.getElementById('dep-planner'); if (pm) renderPlanner(d, pm);
  }

  function openItemMenu(btn, d, s, phase, id) {
    closeItemMenu();
    var p = tlPlan(s, phase), it = p.byId[id], grp = tlGroupOf(p, id), q = p.ord[it.mode], at = q.indexOf(id);
    // Where: only student direct can switch; others say why.
    var where = tlIsCheckin(it)
      ? '<div class="dep-pop-note"><i class="dep-swatch md-' + it.mode + '"></i>' + esc(tlCheckinNote(s)) + '</div>'
      : TL_WHERE[it.aud].length > 1
      ? ['school', 'home'].map(function (m) { return '<button type="button" class="ui-menu-item" data-mv="' + m + '"' + (it.mode === m ? ' disabled' : '') + '><i class="dep-swatch md-' + m + '"></i>Run ' + TL_WHERE_LABEL[m].toLowerCase() + (m === 'school' ? ' (teacher)' : ' (parent)') + '</button>'; }).join('')
      : '<div class="dep-pop-note"><i class="dep-swatch md-' + it.mode + '"></i>' + esc(TL_AUD_SHORT[it.aud]) + ' assessments run ' + esc(TL_WHERE_RULE[it.aud].toLowerCase()) + '</div>';
    var group = '<div class="dep-pop-sep"></div>' + (grp === 'order'
      ? '<button type="button" class="ui-menu-item" data-grp="any">Make it any time</button>'
      : '<button type="button" class="ui-menu-item" data-grp="order">Add to the in-order sequence</button>');
    var reorder = grp === 'order' && q.length > 1 ?
      '<button type="button" class="ui-menu-item" data-shift="-1"' + (at <= 0 ? ' disabled' : '') + '>↑ Earlier in the order</button>' +
      '<button type="button" class="ui-menu-item" data-shift="1"' + (at >= q.length - 1 ? ' disabled' : '') + '>↓ Later in the order</button>' : '';
    var pop = document.createElement('div');
    pop.className = 'ui-menu dep-pop';
    pop.innerHTML = '<div class="ui-eyebrow dep-pop-h">' + esc(it.name) + '</div>' + where + group + reorder +
      '<div class="dep-pop-sep"></div><button type="button" class="ui-menu-item" data-off="1">Don’t use in ' + esc(phase) + '</button>';
    document.body.appendChild(pop);
    TL_POP = pop;
    var r = btn.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, window.scrollX + r.right - pop.offsetWidth) + 'px';
    pop.addEventListener('click', function (e) {
      var mv = e.target.closest('[data-mv]'), sh = e.target.closest('[data-shift]'), of = e.target.closest('[data-off]'), gp = e.target.closest('[data-grp]');
      if (mv && !mv.hasAttribute('disabled')) { tlSetMode(s, phase, id, mv.dataset.mv); refreshPlanner(d); }
      else if (gp) { tlSetGroup(s, phase, id, gp.dataset.grp); refreshPlanner(d); }
      else if (sh && !sh.hasAttribute('disabled')) { tlShift(s, phase, id, +sh.dataset.shift); refreshPlanner(d); }
      else if (of) { tlTurnOff(s, phase, id); refreshPlanner(d); }
    });
    setTimeout(function () { document.addEventListener('mousedown', onPopOutside); document.addEventListener('keydown', onPopKey); }, 0);
  }

  function wirePlanner(d, mount) {
    var s = d.school, dragId = null;
    mount.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { TL_TAB[s.id] = b.dataset.tab; renderPlanner(d, mount); }); });
    var po = mount.querySelector('[data-parents-on]');
    if (po) po.addEventListener('change', function () {
      var on = po.checked; po.checked = !on;   // nothing changes until confirmed
      function apply(skipLive) {
        // Phases where the check-in will now move to school → the own-class rule turns on there.
        var toSchool = on ? [] : TL_PHASES.filter(function (ph) { var p = tlPlan(s, ph), st = tlWindowStatus(s, p); return st !== 'ended' && !(skipLive && st === 'live') && tlCheckinInUse(p); });
        tlWarnRuleOn(s, toSchool, function () {
          tlSetParentsOn(s, on, skipLive);
          ORG.server.logAudit(me.name, 'school.parents', s.name + ' → parents ' + (on ? 'take part' : 'don’t take part') + (skipLive ? ' (from next phase)' : ''), 'school', s.id);
          toast(TL_CHECKIN + ' now runs ' + (on ? 'at home' : 'at school') + (skipLive ? ' from the next phase.' : '.'));
          refreshPlanner(d);
        });
      }
      var live = tlLiveCheckinPhases(s);
      if (!live.length) { apply(false); return; }
      // A phase is live: default to the next phase, allow changing it now.
      var to = on ? 'at home' : 'at school';
      openModal('Change while ' + live.join(', ') + ' is live?', '<p class="tl-muted">' + TL_CHECKIN + ' is in use in ' + esc(live.join(', ')) + ', which is live now.</p>' +
        '<div class="dep-where-pick">' +
          '<button type="button" class="dep-where-opt on" data-when="next"><b>From the next phase</b><span>' + esc(live.join(', ')) + ' keeps it where it is until it ends. Later phases run it ' + to + '.</span></button>' +
          '<button type="button" class="dep-where-opt" data-when="now"><b>Change it now</b><span>It moves ' + to + ' straight away. A child who has already started it finishes it where they started, and their completion counts as normal.</span></button>' +
        '</div>', function (close) { close(); return true; }, 'Cancel');
      setTimeout(function () {
        document.querySelectorAll('[data-when]').forEach(function (b) { b.addEventListener('click', function () { document.getElementById('tl-modal-root').innerHTML = ''; apply(b.dataset.when === 'next'); }); });
      }, 0);
    });

    // Dates are the schedule — editable before and after deploying.
    mount.querySelectorAll('.dep-date').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var parts = inp.dataset.date.split('|'), phase = parts[0], p = tlPlan(s, phase);
        p[parts[1]] = inp.value;
        // End before start: show the error on the card and save nothing.
        if (p.start && p.end && p.end < p.start) { refreshPlanner(d); return; }
        if (p.deployed) {
          p.endedEarly = false; p.held = false;
          tlPersistDeploy(s, phase);
          ORG.server.logAudit(me.name, 'phase.dates', phase + ': ' + p.start + ' → ' + p.end, 'phase', s.id);
          toast(phase + ' dates saved — ' + TL_ST_LABEL[tlPhaseStatus(s, phase).st].toLowerCase() + '.');
        }
        refreshPlanner(d);
      });
    });
    mount.querySelectorAll('[data-turnon]').forEach(function (b) {
      b.addEventListener('click', function () {
        var phase = b.closest('[data-phase]').dataset.phase, p = tlPlan(s, phase), it = p.byId[b.dataset.turnon];
        if (it.aud !== 'direct') { tlTurnOn(s, phase, it.id); refreshPlanner(d); return; }
        if (tlIsCheckin(it)) {
          var turnOn = function () { tlTurnOn(s, phase, it.id); toast(tlCheckinNote(s).split('. Change')[0] + '.'); refreshPlanner(d); };
          if (tlCheckinMode(s) === 'school') tlWarnRuleOn(s, [phase], turnOn); else turnOn();
          return;
        }
        askDirectWhere(it.name, it.mode, function (mode) {
          it.mode = mode; tlTurnOn(s, phase, it.id);
          toast(it.name + ' runs ' + TL_WHERE_LABEL[mode].toLowerCase() + ' — ' + TL_DIRECT_WHO[mode] + '.'); refreshPlanner(d);
        });
      });
    });
    mount.querySelectorAll('[data-deploy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var phase = b.dataset.deploy, p = tlPlan(s, phase), n = tlRunningCount(p);
        var future = p.start > tlToday(s);
        var orderLine = TL_PLACES.filter(function (pl) { return p.ord[pl.mode].length || p.any[pl.mode].length; }).map(function (pl) {
          var o = p.ord[pl.mode].length, f = p.any[pl.mode].length;
          return pl.label + ': ' + [o ? o + ' in order' : '', f ? f + ' any time' : ''].filter(Boolean).join(', ');
        }).join(' · ');
        var checks = deployChecks(s, phase, p);
        gated({ title: 'Deploy ' + phase, confirmLabel: checks.length ? 'Deploy anyway' : 'Deploy phase',
          body: (checks.length ? '<div class="ui-note warn mb-3 dep-checks"><span aria-hidden="true">⚠️</span><div><b>Before this can run smoothly:</b><ul>' +
                  checks.map(function (c) { return '<li>' + c.text + ' <a class="btn-link" href="' + c.href + '" data-fixlink>' + esc(c.fix) + ' →</a></li>'; }).join('') +
                  '</ul><span class="tl-muted">You can still deploy now — e.g. to schedule it ahead.</span></div></div>' : '') +
                '<p>Deploy <b>' + n + '</b> assessment' + (n === 1 ? '' : 's') + ' for <b>' + esc(phase) + '</b>.</p>' +
                '<p>' + (future ? 'It’s <b>Scheduled</b>: it goes live on <b>' + esc(fmtJoined(p.start)) + '</b>' : 'It goes live <b>now</b>') + ' and closes after <b>' + esc(fmtJoined(p.end)) + '</b>.</p>' +
                '<p class="tl-muted">' + esc(orderLine) + '. You can change the dates and order later.</p>',
          audit: { action: 'phase.deploy', entity: phase, entityType: 'phase', schoolId: s.id },
          onConfirm: function () {
            p.deployed = true; p.endedEarly = false; p.held = false;
            tlPersistDeploy(s, phase);   // → teacher/parent apps now see these assessments
            refreshPlanner(d); toast(phase + (future ? ' scheduled for ' + fmtJoined(p.start) + '.' : ' is live.'));
          } });
        // A fix link leaves the dialog for the page that fixes it.
        document.querySelectorAll('#tl-modal-root [data-fixlink]').forEach(function (a) { a.addEventListener('click', function () { document.getElementById('tl-modal-root').innerHTML = ''; }); });
      });
    });
    mount.querySelectorAll('[data-undeploy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var phase = b.dataset.undeploy, p = tlPlan(s, phase);
        gated({ title: 'Undeploy ' + phase, danger: true, confirmLabel: 'Undeploy',
          body: '<p>Take <b>' + esc(phase) + '</b> back to draft? Teachers and parents lose access to its assessments straight away. Responses already recorded are kept.</p>',
          audit: { action: 'phase.undeploy', entity: phase, entityType: 'phase', schoolId: s.id },
          onConfirm: function () {
            p.deployed = false; p.endedEarly = false; p.held = false;
            tlPersistUndeploy(s, phase);
            refreshPlanner(d); toast(phase + ' returned to draft.');
          } });
      });
    });
    mount.querySelectorAll('[data-menu]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.stopPropagation(); openItemMenu(b, d, s, b.closest('[data-phase]').dataset.phase, b.dataset.menu); });
    });

    // Drag to reorder inside an audience row.
    mount.querySelectorAll('.dep-node[draggable="true"]').forEach(function (nd) {
      nd.addEventListener('dragstart', function (e) { dragId = nd.dataset.item; nd.classList.add('dragging'); mount.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (e2) {} });
      nd.addEventListener('dragend', function () { nd.classList.remove('dragging'); mount.classList.remove('is-dragging'); dragId = null; mount.querySelectorAll('.dragover').forEach(function (l) { l.classList.remove('dragover'); }); });
    });
    mount.querySelectorAll('[data-drop]').forEach(function (row) {
      row.addEventListener('dragover', function (e) {
        if (!dragId) return;
        var phase = row.closest('[data-phase]').dataset.phase;
        var dz = row.dataset.drop.split('|'), it = tlPlan(s, phase).byId[dragId];
        if (TL_WHERE[it.aud].indexOf(dz[2]) < 0) return;   // only into a place its audience can run in
        if (tlIsCheckin(it) && dz[2] !== it.mode) return;   // the check-in's place follows the parent setting
        e.preventDefault(); row.classList.add('dragover'); e.dataTransfer.dropEffect = 'move';
      });
      row.addEventListener('dragleave', function (e) { if (!row.contains(e.relatedTarget)) row.classList.remove('dragover'); });
      row.addEventListener('drop', function (e) {
        e.preventDefault(); row.classList.remove('dragover');
        if (!dragId) return;
        var phase = row.closest('[data-phase]').dataset.phase, before = null;
        var nodes = [].slice.call(row.querySelectorAll('.dep-node[data-item]'));
        for (var i = 0; i < nodes.length; i++) { var r = nodes[i].getBoundingClientRect(); if (e.clientY < r.bottom && e.clientX < r.left + r.width / 2) { before = nodes[i].dataset.item; break; } }
        if (before === dragId) before = null;
        var dz2 = row.dataset.drop.split('|');
        tlReorder(s, phase, dragId, before, dz2[1], dz2[2]); refreshPlanner(d);
      });
    });
  }

  // "+ Add assessment" — put one assessment (from Templates) into a phase. Where
  // it runs follows its audience; it joins the end of that audience's row.
  function openAddAssessment(d) {
    var s = d.school;
    var tpls = ORG.templates.filter(function (t) { return !t.archived && tplPhases(t).length && TL_AUD_KEY[t.audience]; })
      .sort(function (a, b) { return a.title.localeCompare(b.title); });
    if (!tpls.length) { toast('Nothing is live yet — publish a phase of a template in Templates first.'); return; }
    var phOpts = TL_PHASES.map(function (ph) { var st = tlPhaseStatus(s, ph).st; return '<option value="' + ph + '"' + (ph === TL_TAB[s.id] ? ' selected' : '') + '>' + ph + ' — ' + TL_ST_LABEL[st] + '</option>'; }).join('');
    var tOpts = tpls.map(function (t) {
      return '<option value="' + esc(t.id) + '" data-aud="' + esc(t.audience) + '" data-phases="' + esc(tplPhases(t).join(',')) + '">' + esc(t.title) + ' · ' + esc(t.audience) + '</option>'; }).join('');
    openModal('Add assessment', '<p class="tl-muted">Add an assessment to one phase at ' + esc(s.name) + '. It goes at the end of its audience’s row.</p><div class="tl-stack">' +
      '<label class="field">Phase<select class="select" id="aa-phase">' + phOpts + '</select></label>' +
      '<label class="field">Assessment<select class="select" id="aa-tpl">' + tOpts + '</select></label>' +
      '<label class="field">Where it runs<select class="select" id="aa-mode"><option value="school">At school — the teacher runs it</option><option value="home">At home — a parent does it with the child</option></select></label>' +
      '<label class="field">Order<select class="select" id="aa-grp"><option value="order">In order — after the last one in that place’s sequence</option><option value="any">Any time — open as soon as the phase is live</option></select></label>' +
      '<p class="tl-muted" id="aa-note"></p></div>', function (close) {
        var phase = document.getElementById('aa-phase').value, sel = document.getElementById('aa-tpl'), o = sel.options[sel.selectedIndex];
        if (o.dataset.phases.split(',').indexOf(phase) < 0) { toast('That template has no live ' + phase + ' version yet.'); return false; }
        var ak = TL_AUD_KEY[o.dataset.aud], mode = tlFixMode(ak, document.getElementById('aa-mode').value), p = tlPlan(s, phase);
        var id = 'tpl-' + sel.value;
        if (tlRunning(p, ak).indexOf(id) >= 0) { toast('That assessment is already in ' + phase + '.'); return false; }
        if (tlIsCheckin({ name: o.textContent.split(' · ')[0] }) && tlRunning(p, ak).some(function (x) { return tlIsCheckin(p.byId[x]); })) { toast(TL_CHECKIN + ' is already in ' + phase + '.'); return false; }
        if (!p.byId[id]) p.byId[id] = { id: id, name: o.textContent.split(' · ')[0], aud: ak, mode: mode };
        p.byId[id].mode = tlIsCheckin(p.byId[id]) ? tlCheckinMode(s) : mode;
        tlTurnOn(s, phase, id, document.getElementById('aa-grp').value);   // also saves a deployed phase
        ORG.server.logAudit(me.name, 'phase.add', p.byId[id].name + ' → ' + phase, 'phase', s.id);
        TL_TAB[s.id] = phase;
        close(); refreshPlanner(d);
        toast(p.byId[id].name + ' added to ' + phase + (p.deployed ? ' — it’s live now.' : '.'));
      }, 'Add assessment');
    setTimeout(function () {
      var ph = document.getElementById('aa-phase'), sel = document.getElementById('aa-tpl'), md = document.getElementById('aa-mode'), gr = document.getElementById('aa-grp'), note = document.getElementById('aa-note'), lastAud = null;
      function sync() {
        var o = sel.options[sel.selectedIndex], ak = TL_AUD_KEY[o.dataset.aud], p = tlPlan(s, ph.value);
        // Teacher → school, parent → home; only student direct can choose.
        md.disabled = TL_WHERE[ak].length === 1; md.value = tlFixMode(ak, md.value);
        if (ak !== lastAud) { gr.value = TL_CHAIN_DEFAULT[ak]; lastAud = ak; }   // the audience's usual group
        var n = p.ord[tlFixMode(ak, md.value)].length, ordered = gr.value === 'order';
        var tagged = o.dataset.phases.split(','), t0 = ORG.templates.find(function (x) { return x.id === sel.value; }), lv0 = t0 && tplLive(t0, ph.value);
        note.textContent = (lv0 ? 'Uses ' + ph.value + ' v' + lv0.v + '. ' : 'No live ' + ph.value + ' version yet (live: ' + tagged.join(', ') + ') — publish one in Templates first. ') +
          TL_AUD_SHORT[ak] + ' assessments run ' + TL_WHERE_RULE[ak].toLowerCase() + '. ' +
          (ak === 'direct' ? 'Here ' + TL_DIRECT_WHO[md.value] + '. ' : '') +
          (ordered ? 'It will be #' + (n + 1) + ' ' + TL_WHERE_LABEL[tlFixMode(ak, md.value)].toLowerCase() + (n ? ', opening once #' + n + ' is done.' : ', opening first.') : 'It’s open any time, alongside the others.') +
          (p.deployed ? ' ' + ph.value + ' is already deployed, so it’s added straight away.' : '');
      }
      [ph, sel, md, gr].forEach(function (x) { x.addEventListener('change', sync); }); sync();
    }, 0);
  }

  // ---------- Academic years (TilliAPI schools) ----------
  // The current year lives in the planner as before; past years are archived
  // read-only (TilliAPI.yearSummary). Only the Tilli team starts a new year.
  var HUB_YEAR = {};   // sid -> year id being viewed on the Assessments tab
  var PH_ORDER = ['Baseline', 'Midline', 'Endline'];
  function schoolYears(s) {
    var API = window.TilliAPI;
    return tlUsesApi(s) && API && API.yearsFor ? API.yearsFor(s.id) : null;
  }
  function yearRange(y) { return fmtJoined(y.start) + ' → ' + fmtJoined(y.end); }
  function yearBarHtml(s, yrs, selId) {
    var cur = yrs.filter(function (y) { return y.status === 'current'; })[0], viewingCur = cur && selId === cur.id;
    var seg = '<div class="ui-seg tl-yearseg" role="group" aria-label="Academic year">' + yrs.map(function (y) {
      return '<button class="' + (y.id === selId ? 'on' : '') + '" data-year="' + esc(y.id) + '" title="' + esc(yearRange(y)) + (y.status === 'current' ? ' · current year' : ' · closed, read-only') + '">' +
        esc(y.label) + (y.status === 'current' ? ' · current' : '') + '</button>';
    }).join('') + '</div>';
    var n = yrs.indexOf(cur) + 1;
    // Start new year is offered once every window deployed this year has ended.
    // Before that, the Tilli team only gets a quiet "close early" link.
    var rd = viewingCur && !GROUP ? window.TilliAPI.yearReadiness(s.id) : null;
    var ready = rd && rd.ended.length && !rd.live.length && !rd.scheduled.length;
    var newYearBtn = !rd ? '' : ready
      ? '<button class="btn btn-outline btn-sm" data-yearnew title="Close ' + esc(cur.label) + ' (it becomes read-only), move students up a grade and start the next year with an empty planner. Tilli team only.">Start new year</button>'
      : '<button class="btn-link tl-yearearly" data-yearnew data-early="1" title="Start new year appears once every assessment window in ' + esc(cur.label) + ' has ended. Use this only if the school has asked to close the year early.">Close the year early…</button>';
    var cal = rd && window.TilliAPI.calendarFor(s.id);
    var calNote = cal && cal.status === 'submitted' ? '<div class="ui-note info mt-2"><span aria-hidden="true">📅</span><span><b>' + esc(cal.submittedByName || 'The school') + '</b> sent the school calendar on ' + esc(fmtJoined(localISO(new Date(cal.submittedAt)))) + ' — <button class="btn-link" data-yearcal>review it and apply the dates</button>.</span></div>' : '';
    var calBtn = rd ? '<button class="btn btn-outline btn-sm" data-yearcal title="Suggest Baseline / Midline / Endline dates from the school’s terms, exams and holidays.">Plan from calendar</button>' : '';
    var ask = rd && window.TilliAPI.yearRequest(s.id), askNote = ask && ask.status === 'open'
      ? '<div class="ui-note warn mt-2"><span aria-hidden="true">↻</span><span><b>' + esc(ask.byName || ask.by) + '</b> asked on ' + esc(fmtJoined(localISO(new Date(ask.at)))) + ' to start the next academic year.</span></div>' : '';
    return '<div class="ui-card mb-gap tl-yearbar"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Academic year</h3>' +
        '<p class="ui-mod-note">' + (cur ? esc(yearRange(cur)) + ' · year ' + n + ' with Tilli' : '') + '</p>' + askNote + calNote + '</div>' +
        '<div class="tl-inline-actions">' +
          calBtn +
          (viewingCur ? '<button class="btn btn-outline btn-sm" data-yearedit title="Change this year’s name or dates. Dates are set per school.">Edit dates</button>' : '') +
          newYearBtn +
        '</div></div>' + seg + '</div>';
  }
  function laneChip(st) { return '<span class="ui-chip ' + (st === 'Ended' ? 'ok' : st === 'Live' ? 'active' : 'muted') + '">' + esc(st) + '</span>'; }
  // Read-only view of a closed year: what ran, how complete, results, classes.
  function pastYearHtml(s, sum) {
    var y = sum.year;
    var phases = sum.phases.map(function (p) {
      if (!p.lanes.length) return '<div class="ui-card mt-gap"><div class="ui-mod-h"><h3 class="ui-mod-title">' + esc(p.phase) + '</h3></div><div class="ui-empty">Not deployed in ' + esc(y.label) + '.</div></div>';
      var rows = p.lanes.map(function (l) {
        var items = l.assessments.map(function (a) { return esc(a.name) + ' <small class="tl-ver">v' + a.version + '</small>'; }).join(', ');
        return '<tr><td class="name">' + esc(l.audience) + '</td><td>' + esc(l.window || (l.start + ' → ' + l.end)) + '</td><td>' + items + '</td>' +
          '<td class="tl-num">' + l.done + ' / ' + l.expected + '</td><td class="tl-num"><b>' + (l.pct == null ? '—' : l.kidsDone + ' of ' + l.kidsTotal) + '</b>' + (l.pct == null ? '' : ' <span class="tl-muted">(' + l.pct + '%)</span>') + '</td><td>' + laneChip(l.status) + '</td></tr>';
      }).join('');
      return '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">' + esc(p.phase) + '</h3>' +
          '<p class="ui-mod-note">' + (p.pct == null ? '' : p.kidsDone + ' of ' + p.kidsTotal + ' children did everything (' + p.pct + '%)') + (p.avgSkill == null ? '' : ' · average skill score ' + p.avgSkill + ' (0–100)') + '</p></div></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-760"><thead><tr><th>Audience</th><th>Window</th><th>Assessments</th>' +
          '<th title="Responses received / expected — one per child per assessment (teachers’ own surveys not counted)">Responses</th><th title="Children who did every assessment in this lane">Children done</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }).join('');
    var classes = sum.classes.length ? '<div class="tl-tree-grade">' + sum.classes.map(function (c) { return '<span class="tl-tree-sec">' + esc(c.label) + ' <i>' + c.students + '</i></span>'; }).join('') + '</div>' : '<div class="ui-empty">No classes recorded.</div>';
    return '<div class="ui-note tl-yearnote"><span class="ui-tag">Read-only</span><span><b>' + esc(y.label) + '</b> is closed (' + esc(yearRange(y)) + '). Nothing here can be changed — switch to the current year to deploy.</span></div>' +
      '<div class="tl-kpis four mt-3">' + kpi(sum.students, 'Students that year') + kpi(sum.classes.length, 'Classes') +
        kpi(sum.phases.filter(function (p) { return p.lanes.length; }).length + ' of 3', 'Phases run') +
        kpi((function () { var ps = sum.phases.filter(function (p) { return p.pct != null; }); return ps.length ? Math.round(ps.reduce(function (n, p) { return n + p.pct; }, 0) / ps.length) + '%' : '—'; })(), 'Avg completion') + '</div>' +
      phases +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Classes in ' + esc(y.label) + '</h3><p class="ui-mod-note">Names as they were that year; a renamed class shows its base in brackets.</p></div></div>' + classes + '</div>';
  }
  // The newest phase with results, across years (current year first): its
  // Social-Emotional / Cognitive averages and a label like "2025–26 Endline".
  function latestOutcomes(s, yrs) {
    var API = window.TilliAPI;
    for (var i = yrs.length - 1; i >= 0; i--) {
      var sm = API.yearSummary(s.id, yrs[i].id);
      for (var j = sm.phases.length - 1; j >= 0; j--) {
        var p = sm.phases[j];
        if (p.avgSel != null || p.avgCog != null) return { sel: p.avgSel, cog: p.avgCog, label: sm.year.label + ' ' + p.phase };
      }
    }
    return null;
  }
  // Phase × year: completion and average skill, flagging template version changes.
  function yearOverYearHtml(s, yrs) {
    if (yrs.length < 2) return '';
    var API = window.TilliAPI, sums = yrs.map(function (y) { return API.yearSummary(s.id, y.id); });
    var rows = sums.map(function (sm, i) {
      var prev = i ? sums[i - 1] : null;
      return '<tr><td class="name">' + esc(sm.year.label) + (sm.current ? ' <small>current</small>' : '') + '</td>' + sm.phases.map(function (p, pi) {
        if (!p.lanes.length) return '<td class="text-muted">—</td>';
        var pp = prev && prev.phases[pi], warn = '', growth = '';
        // Growth within the year only between phases that used the same assessments.
        var before = sm.phases.slice(0, pi).filter(function (x) { return x.avgSkill != null; }).pop();
        if (before && p.avgSkill != null) {
          if (before.instruments.join() === p.instruments.join()) {
            var dlt = p.avgSkill - before.avgSkill;
            growth = ' <span class="tl-growth ' + (dlt >= 0 ? 'up' : 'down') + '" title="Change since ' + esc(before.phase) + ' — same assessments, so comparable.">' + (dlt >= 0 ? '↑ +' : '↓ ') + dlt + '</span>';
          } else {
            growth = ' <span class="ui-chip muted" title="' + esc(before.phase + ' used ' + before.instruments.join(', ') + '; ' + p.phase + ' used ' + p.instruments.join(', ') + ' — skill scores aren’t comparable, so no growth is shown.') + '">different assessments</span>';
          }
        }
        if (pp && pp.versions.length && p.versions.length && pp.versions.join() !== p.versions.join())
          warn = ' <span class="ui-chip warn" title="The template changed since ' + esc(prev.year.label) + ' — compare these results with care.">⚠ ' + esc(pp.versions.join('/')) + ' → ' + esc(p.versions.join('/')) + '</span>';
        return '<td title="' + (p.pct == null ? '' : p.kidsDone + ' of ' + p.kidsTotal + ' children did every assessment') + '"><b>' + (p.pct == null ? '—' : p.pct + '%') + '</b> of children done' + (p.avgSkill == null ? '' : ' · skill ' + p.avgSkill) + growth + warn + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Year over year</h3>' +
        '<p class="ui-mod-note">Children who did every assessment, and the average skill score (0–100), per phase and year. Skill scores show once a phase has ended; growth arrows only compare phases that used the same assessments.</p></div></div>' +
      '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Year</th>' + PH_ORDER.map(function (p) { return '<th>' + p + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }
  function openYearEdit(s, y) {
    openModal('Edit ' + y.label,
      '<div class="tl-stack"><label class="field">Name<input class="input" id="yr-label" value="' + esc(y.label) + '"></label>' +
      '<div class="tl-fieldrow"><label class="field flex-1">Starts<input class="input" type="date" id="yr-start" value="' + esc(y.start) + '"></label>' +
      '<label class="field flex-1">Ends<input class="input" type="date" id="yr-end" value="' + esc(y.end) + '"></label></div></div>',
      function (close) {
        var r = window.TilliAPI.setYearDates(s.id, y.id, { label: document.getElementById('yr-label').value, start: document.getElementById('yr-start').value, end: document.getElementById('yr-end').value });
        if (!r.ok) { toast(r.reason === 'dates' ? 'The year must end after it starts.' : r.reason === 'label_taken' ? 'Another year already has that name.' : 'Couldn’t save the dates.'); return false; }
        ORG.server.logAudit(me.name, 'school.edit', s.name + ' · ' + r.year.label + ' dates', 'school', s.id);
        close(); toast('Year updated.'); go('school', { id: s.id, tab: 'assessments' });
      }, 'Save');
  }
  // ---- One calendar for a whole school group ----
  // Saves it to every active live school in the group and applies the suggested
  // dates to each school's phases that aren't deployed yet (drafts only).
  function openGroupCalendar(g, schools) {
    var live = schools.filter(tlUsesApi), A = window.TilliAPI, form;
    if (!live.length) { toast('None of this group’s schools are live yet.'); return; }
    var boards = []; live.forEach(function (x) { schoolBoardList(x).forEach(function (b) { if (boards.indexOf(b) < 0) boards.push(b); }); });
    openModal('One calendar for ' + g.name,
      '<p class="tl-muted">For groups whose schools share a calendar. It’s saved to <b>' + live.length + ' school' + (live.length === 1 ? '' : 's') + '</b> (' + esc(live.map(function (x) { return x.name; }).join(', ')) + '), and each one’s Baseline / Midline / Endline dates are set as drafts where nothing is deployed yet. Each school’s own year must cover these dates.</p>' +
      '<div id="gc-form"></div>',
      function (close) {
        if (form.hasErrors()) { toast('Fix the dates that end before they start.'); return false; }
        var c = form.read(); if (!c.terms.length) { toast('Add at least one term.'); return false; }
        var n = 0;
        live.forEach(function (x) {
          if (!A.saveCalendar(x.id, c, me.email, form.meta()).ok) return;
          var sug = A.suggestWindows(x.id, c), dates = {};
          TL_PHASES.forEach(function (ph) { if (sug && sug[ph] && !tlPlan(x, ph).deployed) dates[ph] = { start: sug[ph].start, end: sug[ph].end }; });
          if (Object.keys(dates).length) { A.applyCalendarDates(x.id, dates, me.email); Object.keys(dates).forEach(function (ph) { var p = tlPlan(x, ph); p.start = dates[ph].start; p.end = dates[ph].end; p.fromCalendar = true; }); }
          n++;
        });
        ORG.server.logAudit(me.name, 'phase.dates', g.name + ': one calendar for ' + n + ' schools', 'group');
        close(); toast('Calendar saved to ' + n + ' school' + (n === 1 ? '' : 's') + ' — draft dates set where nothing is deployed.');
      }, 'Save to all schools');
    form = window.TilliCalendarForm.mount(document.getElementById('gc-form'), null, { boards: boards,
      onUpload: function (f) { return A.readCalendarFile(live[0].id, f.name); } });
  }

  // ---- Plan from calendar ----
  // Deployed windows that now overlap an exam block in the school calendar.
  function calendarClashHtml(s) {
    var list = tlUsesApi(s) && window.TilliAPI.calendarConflicts ? window.TilliAPI.calendarConflicts(s.id) : [];
    return list.map(function (c) {
      return '<div class="ui-note warn mb-gap"><span aria-hidden="true">📅</span><span><b>Calendar changed: ' + esc(c.phase) + ' now overlaps ' + esc(c.exam.name + (c.exam.board ? ' (' + c.exam.board + ')' : '')) + '</b> (' +
        esc(fmtJoined(c.exam.start)) + ' → ' + esc(fmtJoined(c.exam.end)) + '). It’s ' + esc(c.status.toLowerCase()) + ' for ' + esc(fmtJoined(c.start)) + ' → ' + esc(fmtJoined(c.end)) + '.' +
        (c.suggestion ? ' <button class="btn-link" data-calshift="' + esc(c.phase) + '">Shift it to ' + esc(fmtJoined(c.suggestion.start)) + ' → ' + esc(fmtJoined(c.suggestion.end)) + '</button>' : '') + '</span></div>';
    }).join('');
  }
  // Review / enter the calendar, see suggested windows with reasons, and apply
  // them to the planner as DRAFT dates (deployed phases are never touched).
  function openPlanFromCalendar(s) {
    var A = window.TilliAPI, cal = A.calendarFor(s.id), form, sug = null;
    var deployed = {}; TL_PHASES.forEach(function (ph) { deployed[ph] = tlPlan(s, ph).deployed; });
    var note = cal && cal.status === 'submitted'
      ? '<div class="ui-note info mb-3"><span aria-hidden="true">📅</span><span><b>' + esc(cal.submittedByName || 'The school') + '</b> sent this on ' + esc(fmtJoined(localISO(new Date(cal.submittedAt)))) + (cal.source === 'upload' && cal.fileName ? ' (read from ' + esc(cal.fileName) + ')' : '') + '. Check it, then apply the dates.</span></div>'
      : cal && cal.status === 'applied' ? '<div class="ui-note mb-3"><span aria-hidden="true">✓</span><span>Dates from this calendar were applied on ' + esc(fmtJoined(localISO(new Date(cal.appliedAt)))) + '. Change anything below and apply again.</span></div>' : '';
    openModal('Plan from calendar · ' + s.name, note + '<div id="pfc-form"></div>' +
      '<div class="ui-eyebrow mt-3 mb-2">Suggested windows</div><div id="pfc-sugg" class="cal-sugg"></div>',
      function (close) {
        if (form.hasErrors()) { toast('Fix the dates that end before they start.'); return false; }
        var c = form.read(); if (!c.terms.length) { toast('Add at least one term.'); return false; }
        var r = A.saveCalendar(s.id, c, me.email, form.meta()); if (!r.ok) { toast('Couldn’t save the calendar.'); return false; }
        var dates = {};
        document.querySelectorAll('[data-pfc]:checked').forEach(function (cb) { var w = sug && sug[cb.dataset.pfc]; if (w) dates[cb.dataset.pfc] = { start: w.start, end: w.end }; });
        if (!Object.keys(dates).length) { close(); toast('Calendar saved — no dates applied.'); go('school', { id: s.id, tab: 'assessments' }); return; }
        A.applyCalendarDates(s.id, dates, me.email);
        Object.keys(dates).forEach(function (ph) { var p = tlPlan(s, ph); p.start = dates[ph].start; p.end = dates[ph].end; p.fromCalendar = true; });
        ORG.server.logAudit(me.name, 'phase.dates', Object.keys(dates).join(', ') + ' from the school calendar', 'phase', s.id);
        close(); toast(Object.keys(dates).join(', ') + ' dates set from the calendar — check the planner, then deploy.');
        go('school', { id: s.id, tab: 'assessments' });
      }, 'Apply to planner');
    // "Save calendar" without touching the planner.
    var foot = document.querySelector('#tl-modal-root .ui-modal-foot');
    foot.insertAdjacentHTML('afterbegin', '<button class="btn-link" style="margin-right:auto" id="pfc-save">Save calendar only</button>');
    document.getElementById('pfc-save').addEventListener('click', function () {
      var c = form.read(); if (!c.terms.length) { toast('Add at least one term.'); return; }
      var r = A.saveCalendar(s.id, c, me.email, form.meta()); toast(r.ok ? 'Calendar saved.' : 'Couldn’t save the calendar.');
    });
    function drawSugg() {
      var box = document.getElementById('pfc-sugg'), c = form.read();
      if (!c.terms.length) { sug = null; box.innerHTML = '<div class="ui-empty">Add at least one term to see suggested windows.</div>'; return; }
      sug = A.suggestWindows(s.id, c);
      box.innerHTML = TL_PHASES.map(function (ph) {
        var w = sug[ph]; if (!w) return '';
        var dep = deployed[ph];
        return '<label class="cal-sugg-row' + (dep ? ' locked' : '') + '"><b><input type="checkbox" data-pfc="' + ph + '"' + (dep ? ' disabled' : ' checked') + '> ' + ph + '</b>' +
          '<span class="when">' + esc(fmtJoined(w.start) + ' → ' + fmtJoined(w.end)) + (dep ? ' · already deployed — change it in the planner' : '') + '</span><span class="why">' + esc(w.reason) + '</span></label>';
      }).join('') +
        (sug.problems.length ? '<div class="ui-note warn"><span aria-hidden="true">⚠️</span><span>' + sug.problems.map(esc).join(' ') + '</span></div>' : '') +
        '<p class="tl-muted m-0">Applying fills the planner dates as drafts — nothing is deployed. Timing rules: Deployments → Scheduling rules.</p>';
    }
    form = window.TilliCalendarForm.mount(document.getElementById('pfc-form'), cal, { boards: schoolBoardList(s),
      onUpload: function (f) { return A.readCalendarFile(s.id, f.name); }, onChange: drawSugg });
    drawSugg();
  }

  // Start next year: close this one (read-only), move children up by base grade, empty planner.
  function openNewYear(s, early) {
    var API = window.TilliAPI, rd = API.yearReadiness(s.id), cur = rd.year, token = 'CLOSE ' + cur.label;
    var isoPlusDays = function (iso, n) { var t = new Date(iso + 'T00:00:00'); t.setDate(t.getDate() + n); return localISO(t); };
    var nStart = isoPlusDays(cur.end, 1), nEnd = isoPlusDays(nStart.replace(/^(\d{4})/, function (y) { return String(+y + 1); }), -1);
    var autoLabel = function (a, b) { return a.slice(0, 4) === b.slice(0, 4) ? a.slice(0, 4) : a.slice(0, 4) + '–' + b.slice(2, 4); };
    var open = rd.live.length
      ? '<label class="tl-check"><input type="checkbox" id="ny-endopen"> End the ' + rd.live.length + ' live assessment window' + (rd.live.length === 1 ? '' : 's') + ' now (' + esc(rd.live.map(function (l) { return l.phase + ' · ' + l.audience; }).join(', ')) + ')</label>'
      : '<p class="tl-muted m-0">Nothing is live — every window has ended or not started.</p>';
    var sched = rd.scheduled.length ? '<p class="tl-muted">' + rd.scheduled.length + ' scheduled window' + (rd.scheduled.length === 1 ? '' : 's') + ' never ran — kept in ' + esc(cur.label) + ' as “Not run”.</p>' : '';
    var grades = rd.grades.length ? rd.grades.map(function (g) {
      var names = g.names.filter(function (n) { return !sameName(n, g.base); });
      var def = g.next ? 'promote' : 'graduate';
      return '<div class="tl-nyrow"><span><b>' + esc(g.base) + '</b>' + (names.length ? ' <small>(' + esc(names.join(', ')) + ')</small>' : '') + ' · ' + g.students + ' student' + (g.students === 1 ? '' : 's') + '</span>' +
        '<select class="select" data-nyg="' + esc(g.base) + '" aria-label="What happens to ' + esc(g.base) + '">' +
          (g.next ? '<option value="promote"' + (def === 'promote' ? ' selected' : '') + '>Move up to ' + esc(g.next) + '</option>' : '') +
          '<option value="retain">Stay in ' + esc(g.base) + '</option>' +
          '<option value="graduate"' + (def === 'graduate' ? ' selected' : '') + '>Graduate (leave the roster)</option></select></div>';
    }).join('') : '<p class="tl-muted m-0">No students on the roster yet.</p>';
    var earlyNote = early ? '<div class="ui-note warn mb-3"><span aria-hidden="true">⚠️</span><span><b>' + esc(cur.label) + ' isn’t finished.</b> ' +
        (rd.live.length ? rd.live.length + ' window' + (rd.live.length === 1 ? ' is' : 's are') + ' live' : '') + (rd.live.length && rd.scheduled.length ? ' and ' : '') +
        (rd.scheduled.length ? rd.scheduled.length + ' ' + (rd.scheduled.length === 1 ? 'is' : 'are') + ' scheduled' : '') + (!rd.live.length && !rd.scheduled.length ? 'Nothing has been deployed this year' : '') +
        '. Only close it early if the school has asked.</span></div>' : '';
    openModal('Start a new academic year · ' + s.name,
      earlyNote +
      '<p class="tl-muted">' + esc(cur.label) + ' closes and becomes read-only — its deployments, completion and results stay viewable. Every child moves as chosen below. This can’t be undone.</p>' +
      '<div class="tl-stack">' +
        '<div class="ui-eyebrow">1 · Close ' + esc(cur.label) + '</div>' + open + sched +
        '<div class="ui-eyebrow mt-3">2 · New year</div>' +
        '<div class="tl-fieldrow"><label class="field flex-1">Starts<input class="input" type="date" id="ny-start" value="' + nStart + '"></label>' +
        '<label class="field flex-1">Ends<input class="input" type="date" id="ny-end" value="' + nEnd + '"></label></div>' +
        '<label class="field">Name<input class="input" id="ny-label" value="' + esc(autoLabel(nStart, nEnd)) + '"></label>' +
        '<div class="ui-eyebrow mt-3">3 · Students</div>' +
        '<p class="tl-muted m-0">By base grade — renamed classes move with their base (Grade 1 A → Grade 2 A).</p>' + grades +
        '<div class="ui-eyebrow mt-3">4 · Next year’s calendar <span class="tl-muted" style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>' +
        '<div class="tl-inline-actions"><label class="btn btn-outline btn-sm">Upload a PDF or photo<input type="file" accept=".pdf,image/*" class="hidden" id="ny-calfile"></label>' +
          '<span class="tl-muted" id="ny-calname">Holidays move every year (Eid, Diwali, Poya days) — last year’s calendar isn’t copied.</span></div>' +
        '<label class="field mt-3">Type <b>' + esc(token) + '</b> to confirm<input class="input" id="ny-confirm" autocomplete="off" placeholder="' + esc(token) + '"></label>' +
      '</div>',
      function (close) {
        if (document.getElementById('ny-confirm').value.trim().toUpperCase() !== token.toUpperCase()) { toast('Type ' + token + ' to confirm.'); return false; }
        var eo = document.getElementById('ny-endopen');
        if (eo && !eo.checked) { toast('End the live windows first (tick the box).'); return false; }
        var acts = {}; document.querySelectorAll('[data-nyg]').forEach(function (sel) { acts[sel.dataset.nyg] = sel.value; });
        var r = API.startNewYear(s.id, { label: document.getElementById('ny-label').value, start: document.getElementById('ny-start').value, end: document.getElementById('ny-end').value,
          endOpen: !!(eo && eo.checked), gradeActions: acts, actorEmail: me.email });
        if (!r.ok) {
          toast({ dates: 'The new year must end after it starts.', before_current: 'The new year must start after ' + cur.label + ' starts.', label_taken: 'A year with that name already exists.', open_lanes: 'End the live windows first.' }[r.reason] || 'Couldn’t start the year.');
          return false;
        }
        ORG.server.logAudit(me.name, 'year.start', s.name + ' · ' + r.year.label, 'school', s.id);
        var nyFile = document.getElementById('ny-calfile').files[0];
        if (nyFile) { var nyCal = API.readCalendarFile(s.id, nyFile.name); if (nyCal) API.saveCalendar(s.id, nyCal, me.email, { status: 'submitted', source: 'upload', fileName: nyFile.name }); }
        delete TL_PLAN[s.id]; delete TL_CHAIN[s.id]; delete TL_TAB[s.id]; delete HUB_YEAR[s.id];
        close();
        toast(r.year.label + ' started · ' + r.moved.promoted + ' moved up, ' + r.moved.retained + ' stayed, ' + r.moved.graduated + ' graduated.');
        go('school', { id: s.id, tab: 'assessments' });
      }, 'Start new year');
    document.getElementById('ny-calfile').addEventListener('change', function (e) { var f = e.target.files && e.target.files[0]; if (f) document.getElementById('ny-calname').textContent = f.name + ' — read into ' + 'the new year for you to check.'; });
    var save = document.getElementById('tl-save'), cf = document.getElementById('ny-confirm');
    save.classList.replace('btn-primary', 'btn-danger'); save.disabled = true;
    cf.addEventListener('input', function () { save.disabled = cf.value.trim().toUpperCase() !== token.toUpperCase(); });
    var st = document.getElementById('ny-start'), en = document.getElementById('ny-end'), lb = document.getElementById('ny-label'), touched = false;
    lb.addEventListener('input', function () { touched = true; });
    [st, en].forEach(function (x) { x.addEventListener('change', function () { if (!touched && st.value && en.value) lb.value = autoLabel(st.value, en.value); }); });
  }
  function wireYearBar(s, d, el) {
    el.querySelectorAll('[data-year]').forEach(function (b) { b.addEventListener('click', function () { HUB_YEAR[s.id] = b.dataset.year; HUB.assessments(d, el); }); });
    var ed = el.querySelector('[data-yearedit]'); if (ed) ed.addEventListener('click', function () { openYearEdit(s, window.TilliAPI.currentYear(s.id)); });
    var ny = el.querySelector('[data-yearnew]'); if (ny) ny.addEventListener('click', function () { openNewYear(s, !!ny.dataset.early); });
    el.querySelectorAll('[data-yearcal]').forEach(function (b) { b.addEventListener('click', function () { openPlanFromCalendar(s); }); });
    // A deployed window that now clashes with the calendar: shift it to the suggestion.
    el.querySelectorAll('[data-calshift]').forEach(function (b) { b.addEventListener('click', function () {
      var c = window.TilliAPI.calendarConflicts(s.id).filter(function (x) { return x.phase === b.dataset.calshift; })[0];
      if (!c || !c.suggestion) return;
      var p = tlPlan(s, c.phase); p.start = c.suggestion.start; p.end = c.suggestion.end;
      tlPersistDeploy(s, c.phase);
      ORG.server.logAudit(me.name, 'phase.dates', c.phase + ': ' + p.start + ' → ' + p.end + ' (calendar)', 'phase', s.id);
      toast(c.phase + ' moved to ' + fmtJoined(p.start) + ' → ' + fmtJoined(p.end) + '.');
      go('school', { id: s.id, tab: 'assessments' });
    }); });
  }

  HUB.assessments = function (d, el) {
    var s = d.school;
    var yrs = schoolYears(s), curY = yrs && yrs.filter(function (y) { return y.status === 'current'; })[0];
    var selY = yrs && curY ? (yrs.some(function (y) { return y.id === HUB_YEAR[s.id]; }) ? HUB_YEAR[s.id] : curY.id) : null;
    var yearBar = yrs && curY ? yearBarHtml(s, yrs, selY) : '';
    if (yrs && curY && selY !== curY.id) {
      el.innerHTML = yearBar + pastYearHtml(s, window.TilliAPI.yearSummary(s.id, selY));
      wireYearBar(s, d, el);
      return;
    }

    // What to send the school: who each link is for, and where it lands.
    var SHARE = [
      { slug: 'parent', label: 'Parents', note: 'Parents sign in and find their child at this school. Safe to send home — it doesn’t contain the school code.' },
      { slug: 'teacher', label: 'Teachers & school admins', note: 'Staff sign in straight into this school.' },
      { slug: 'direct', label: 'Student assessments', note: 'Opened on each child’s device — a teacher signs in with the school code, picks a class and runs the assessments.', preview: 'assess.html' },
    ];
    var links = SHARE.map(function (k) {
      var url = ORG.masterLinkUrl(s, k.slug);
      var preview = k.preview ? '<a class="btn btn-outline btn-sm" href="' + k.preview + '" target="_blank" rel="noopener" title="Open the student assessment page (local prototype)">Preview</a>' : '';
      return '<div class="tl-linkrow"><div><b>' + esc(k.label) + '</b><span class="tl-linknote">' + esc(k.note) + '</span><span class="mono">' + esc(url) + '</span></div><span class="tl-inline-actions">' + preview + '<button class="btn btn-outline btn-sm" data-copy="' + esc(url) + '">Copy Link</button></span></div>';
    }).join('');
    var grp = s.groupId && s.groupId !== 'g-none' ? ORG.groupById(s.groupId) : null;
    var grpNote = grp && !grp.archived ? '<p class="ui-mod-note mt-3">' + esc(s.name) + ' is part of <b>' + esc(grp.name) + '</b>. To reach every school in it with one link, use the <button class="btn-link" data-grouplinks="' + esc(grp.id) + '">group links</button>.</p>' : '';

    el.innerHTML = '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Deployments</h3></div>' +
        '<div class="tl-inline-actions">' +
          '<button class="btn btn-outline btn-sm" data-teacherlog title="Per-teacher status for every teacher assessment deployed to this school — Completed when every student in their sections is rated.">Teacher assessment log</button>' +
          '<button class="btn btn-outline btn-sm" data-dlcsv title="Download this school’s assessment results as a CSV">Results CSV</button>' +
          '<button class="btn btn-outline btn-sm" data-studentlog title="Per-student status (Completed / In Progress / Not Started) for every student-facing assessment deployed to this school — one row per student, one column per assessment.">Student assessment log</button>' +
          '<button class="btn btn-primary btn-sm" data-addassess title="Add an assessment from Templates to one phase of this school">+ Add assessment</button></div></div>' +
        '<div class="dep-chains" id="dep-planner"></div></div>' +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Links to share</h3><p class="ui-mod-note">Send these to ' + esc(s.name) + '. Each one opens straight into this school.</p></div></div>' + links + grpNote + '</div>' +
      '<div id="hub-teacherlog"></div><div id="hub-studentlog"></div>' + (yrs ? yearOverYearHtml(s, yrs) : '');
    if (yearBar) { el.insertAdjacentHTML('afterbegin', calendarClashHtml(s)); el.insertAdjacentHTML('afterbegin', yearBar); wireYearBar(s, d, el); }
    el.querySelector('[data-addassess]').addEventListener('click', function () { openAddAssessment(d); });
    var gl = el.querySelector('[data-grouplinks]'); if (gl) gl.addEventListener('click', function () { go('group', { id: gl.dataset.grouplinks }); });
    renderPlanner(d, el.querySelector('#dep-planner'));
    var slBtn = el.querySelector('[data-studentlog]'), slMount = el.querySelector('#hub-studentlog');
    slBtn.addEventListener('click', function () {
      if (slMount.innerHTML) { slMount.innerHTML = ''; slBtn.textContent = 'Student assessment log'; slBtn.classList.remove('on'); return; }
      renderStudentAssessmentLog(d, slMount);
      slBtn.textContent = 'Hide student assessment log'; slBtn.classList.add('on');
      slMount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    var tlBtn = el.querySelector('[data-teacherlog]'), tlMount = el.querySelector('#hub-teacherlog');
    tlBtn.addEventListener('click', function () {
      if (tlMount.innerHTML) { tlMount.innerHTML = ''; tlBtn.textContent = 'Teacher assessment log'; tlBtn.classList.remove('on'); return; }
      renderTeacherAssessmentLog(d, tlMount);
      tlBtn.textContent = 'Hide teacher assessment log'; tlBtn.classList.add('on');
      tlMount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    }).join('') : '<tr><td colspan="5"><div class="ui-empty">No issues for this school.</div></td></tr>';
    var dRows = d.deletions.length ? d.deletions.map(function (x) {
      return '<tr><td>' + esc(x.deletedAt) + '</td><td class="name">' + esc(x.studentName) + '<small class="mono">' + esc(x.code) + '</small></td><td>' + esc(x.gradeSection) + '</td><td>' + esc(x.deletedBy) + '</td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="ui-empty">No deletions for this school.</div></td></tr>';
    el.innerHTML = '<div class="ui-card"><div class="ui-mod-h"><h3 class="ui-mod-title">Issue reports</h3></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Reporter</th><th>Page</th><th>Device</th><th>Date</th><th>Status</th></tr></thead><tbody>' + iRows + '</tbody></table></div></div>' +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><h3 class="ui-mod-title">Deletion logs</h3></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-560"><thead><tr><th>Deleted at</th><th>Student</th><th>Grade/Section</th><th>Deleted by</th></tr></thead><tbody>' + dRows + '</tbody></table></div></div>';
  };

  HUB.settings = function (d, el) {
    var s = d.school;
    el.innerHTML = '<div class="ui-card"><div class="ui-mod-h"><h3 class="ui-mod-title">Settings</h3></div>' +
      '<div class="tl-settings"><button class="btn btn-outline block" data-set="profile">Edit profile</button>' +
      '<button class="btn btn-outline block" data-set="grades">Manage grades / sections</button>' +
      '<button class="btn btn-outline block" data-set="group">Group assignment</button>' +
      '<button class="btn btn-danger block" data-set="archive">' + (s.archived ? 'Un-archive school' : 'Archive school') + '</button>' +
      (s.archived ? '<button class="btn btn-danger block" data-set="delete">Delete school</button>' : '') + '</div>' +
      '<p class="tl-muted mt-3">As Super Admin you have full access — every action here runs and is written to the audit trail. A role layer can restrict these later.</p></div>';
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
  // Score → level on the ONE site-wide scale (1 Sprouting · 2 Growing · 3 Blooming
  // → .ui-badge.lvl-N / TilliPalette.level(n)). Same 34 / 67 cut-offs as the
  // teacher, parent and school-admin views.
  function skillLevel(p) {
    if (p < 34) return { label: 'Sprouting', n: 1 };
    if (p < 67) return { label: 'Growing', n: 2 };
    return { label: 'Blooming', n: 3 };
  }
  function gapStatus(g) {
    if (g <= 10) return { label: 'Aligned', tone: 'ok', mark: '↗' };
    if (g <= 30) return { label: 'Moderate', tone: 'muted', mark: '–' };
    return { label: 'High Gap', tone: 'danger', mark: '⚠' };
  }
  var SR_ICON = {
    heart: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="' + CHART.selIcon + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    brain: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="' + CHART.cogIcon + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 5 2V4.5A1.5 1.5 0 0 0 9 3z"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-5 2V4.5A1.5 1.5 0 0 1 15 3z"/></svg>',
  };
  // Perspective colours come from the site-wide tokens (var() strings — used in
  // style="" so they also work on the SVG radar polygons).
  var SR_PERSP = [
    { key: 'teacher', label: 'Teacher', color: window.TilliPalette.PERSPECTIVE.teacher },
    { key: 'parent', label: 'Parent', color: window.TilliPalette.PERSPECTIVE.parent },
    { key: 'student', label: 'Student Direct', color: window.TilliPalette.PERSPECTIVE.student },
  ];

  SCREEN.student = function (params, body) {
    var s = ORG.byId(params.school);
    var stu = (TS && TS.findByAdm) ? TS.findByAdm(params.adm) : null;
    if (!s || !stu) {
      // No full report for this school here yet — say so plainly and give a way back.
      var back = s ? href('school', { id: s.id, tab: 'students' }) : href('schools', {});
      body.innerHTML = (s ? crumbs([{ label: 'All Schools', screen: 'schools' }, { label: s.name, screen: 'school', params: { id: s.id, tab: 'students' } }, { label: 'Student' }]) : '') +
        '<div class="ui-card"><div class="ui-empty"><span class="big">Reports for this school aren’t available here yet.</span>' +
          'You can still see this child in the Student Directory, and their teacher sees their progress in the teacher app.<br>' +
          '<a class="btn btn-outline btn-sm mt-3" href="' + back + '">← Back to ' + (s ? esc(s.name) + '’s students' : 'All Schools') + '</a></div></div>';
      if (s) wireCrumbs(body);
      return;
    }
    var tab = params.tab && STUDENT_TABS.some(function (t) { return t.key === params.tab; }) ? params.tab : 'skills';

    var crumbParts = [{ label: 'All Schools', screen: 'schools' }];
    if (s.groupId && s.groupId !== 'g-none') crumbParts.push({ label: s.groupName, screen: 'group', params: { id: s.groupId } });
    crumbParts.push({ label: s.name, screen: 'school', params: { id: s.id, tab: 'students' } });
    crumbParts.push({ label: stu.name });

    var sel = stu.skills.filter(function (k) { return k.group === 'sel'; });
    var cog = stu.skills.filter(function (k) { return k.group === 'cog'; });

    body.innerHTML = crumbs(crumbParts) +
      '<div class="tl-hub-head"><div><h1 class="ui-screen-title" style="margin-bottom:4px">' + esc(stu.name) + '</h1>' +
        '<p class="ui-screen-sub m-0"><span class="mono">' + esc(stu.adm) + '</span> · ' + esc(secLbl(s.id, stu.grade, stu.section)) + ' · ' + esc(s.name) + (stu.teacherName ? ' · Teacher: ' + esc(stu.teacherName) : '') + '</p></div>' +
        '<div class="tl-hub-actions"><div class="ui-card tight ui-kpi tl-kpi" style="min-width:120px"><div class="num">' + pct(stu.overallPct) + '%</div><div class="lbl">Overall skill score</div></div></div></div>' +
      '<div class="ui-tabs hub">' + STUDENT_TABS.map(function (t) {
        return '<button class="ui-tab' + (t.key === tab ? ' on' : '') + '" data-sttab="' + t.key + '">' + esc(t.label) + '</button>';
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
      '<div class="sr-sk-pct">' + pct(k.pct) + '%</div><span class="ui-badge lvl-' + lv.n + '">' + esc(lv.label) + '</span></div>';
  }
  function srSkillsTab(sel, cog) {
    return '<div class="tl-grid two">' +
      '<div class="ui-card"><div class="sr-secthead">' + SR_ICON.heart + '<h3>Social-Emotional Learning</h3></div>' + sel.map(srSkillRow).join('') + '</div>' +
      '<div class="ui-card"><div class="sr-secthead">' + SR_ICON.brain + '<h3>Cognitive Skills</h3></div>' + cog.map(srSkillRow).join('') + '</div></div>';
  }

  function srPerspectiveTab(stu) {
    var axes = stu.skills.map(function (k) { return k.name; });
    var series = SR_PERSP.map(function (p) { return { label: p.label, color: p.color, values: stu.skills.map(function (k) { return k[p.key]; }) }; });
    var legend = '<div class="ui-legend sr-legend">' + SR_PERSP.map(function (p) { return '<span><i style="background:' + p.color + '"></i>' + esc(p.label) + '</span>'; }).join('') + '</div>';

    var gapRows = stu.skills.map(function (k) {
      var st = gapStatus(k.gap);
      return '<tr><td class="name">' + esc(k.name) + '</td><td class="tl-num">' + k.teacher + '%</td><td class="tl-num">' + k.parent + '%</td>' +
        '<td class="tl-num">' + k.student + '%</td><td class="tl-num">' + k.gap + '%</td><td>' + statusPill(st.mark + ' ' + st.label, st.tone) + '</td></tr>';
    }).join('');

    return '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Multi-perspective view</h3>' +
        '<p class="ui-mod-note">The same skills rated by teacher, parent and the child directly — the gaps between them are often the most useful part.</p></div></div>' +
        '<div class="sr-radar-wrap">' + srRadar(axes, series) + legend + '</div></div>' +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Gap Analysis</h3>' +
        '<p class="ui-mod-note">Discrepancies between perspectives — large gaps may indicate areas needing attention.</p></div></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Skill</th><th>Teacher</th><th>Parent</th><th>Student Direct</th><th>Gap</th><th>Status</th></tr></thead><tbody>' + gapRows + '</tbody></table></div></div>';
  }

  // Radar: n axes, m series (values 0–100).
  function srRadar(axes, series) {
    var W = 640, H = 470, cx = W / 2, cy = H / 2, R = 150, n = axes.length;
    function ang(i) { return -Math.PI / 2 + i * 2 * Math.PI / n; }
    function pt(i, val) { var a = ang(i), r = R * (Math.max(0, Math.min(100, val)) / 100); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:560px" role="img" aria-label="Multi-perspective radar across skills">';
    [25, 50, 75, 100].forEach(function (g) {
      var p = []; for (var i = 0; i < n; i++) { var q = pt(i, g); p.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      svg += '<polygon points="' + p.join(' ') + '" fill="none" style="stroke:var(--line-200)" stroke-width="1"/>';
    });
    for (var i = 0; i < n; i++) {
      var edge = pt(i, 100);
      svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + edge[0].toFixed(1) + '" y2="' + edge[1].toFixed(1) + '" style="stroke:var(--line-200)" stroke-width="1"/>';
      var a = ang(i), lr = R + 20, lx = cx + lr * Math.cos(a), ly = cy + lr * Math.sin(a);
      var anchor = Math.abs(lx - cx) < 10 ? 'middle' : (lx < cx ? 'end' : 'start');
      svg += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '" dominant-baseline="middle" font-size="11" style="fill:var(--ink-450)">' + esc(axes[i]) + '</text>';
    }
    series.forEach(function (ser) {
      var p = []; for (var j = 0; j < n; j++) { var q = pt(j, ser.values[j]); p.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); }
      svg += '<polygon points="' + p.join(' ') + '" style="fill:' + ser.color + ';stroke:' + ser.color + '" fill-opacity="0.13" stroke-width="2" stroke-linejoin="round"/>';
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
      { label: 'Social-Emotional', color: CHART.sel, values: traj(selNow, ':sel5') },
      { label: 'Cognitive', color: CHART.cog, values: traj(cogNow, ':cog5') },
    ];
    var legend = '<div class="ui-legend sr-legend">' + seriesList.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.label) + '</span>'; }).join('') + '</div>';
    return '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Progress over time</h3>' +
      '<p class="ui-mod-note">' + esc(stu.name.split(' ')[0]) + '\'s social-emotional and cognitive averages across ' + years + ' years in the programme. The most recent point is the current score.</p></div></div>' +
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
      svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" style="stroke:var(--line-200)"/>' +
        '<text x="' + (padL - 6) + '" y="' + (Y(g) + 3).toFixed(1) + '" text-anchor="end" font-size="11" style="fill:var(--ink-300)">' + g + '</text>';
    });
    xLabels.forEach(function (lb, i) { svg += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" style="fill:var(--ink-450)">' + esc(lb) + '</text>'; });
    seriesList.forEach(function (ser) {
      var dpath = ser.values.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
      svg += '<path d="' + dpath + '" fill="none" stroke="' + ser.color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      ser.values.forEach(function (v, i) { svg += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.6" style="fill:var(--white)" stroke="' + ser.color + '" stroke-width="2"/>'; });
    });
    return svg + '</svg>';
  }
  function avg(arr) { return arr.length ? arr.reduce(function (a, x) { return a + x; }, 0) / arr.length : 0; }

  // ============================================================
  //  MERGE STUDENTS  (spec §4.3)
  // ============================================================
  var mergeSel = { master: null, dup: null };
  // ============================================================
  //  CLASS SIZES — new students waiting for approval + classes still
  //  short of their expected size, across every active school.
  // ============================================================
  SCREEN['class-sizes'] = function (params, body) {
    var A = window.TilliAPI;
    var waiting = A && A.pendingStudents ? A.pendingStudents() : [];
    var short = [];
    ORG.activeSchools().forEach(function (s) {
      (A && A.schoolRooms ? A.schoolRooms(s.id) : []).forEach(function (r) {
        if (r.expected == null || !r.confirmed || r.added < r.expected) short.push({ s: s, r: r });
      });
    });
    var view = params.view === 'classes' ? 'classes' : 'waiting';
    var tab = function (key, label, n) { return '<button class="ui-tab' + (view === key ? ' on' : '') + '" data-csview="' + key + '">' + label + ' <b>' + n + '</b></button>'; };
    var panel;
    if (view === 'waiting') {
      panel = waiting.length
        ? '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Waiting for approval</h3><p class="ui-mod-note">Oldest first. The school admin can approve these too.</p></div></div><div id="cs-pending">' + pendingTableHtml(waiting, true) + '</div></div>'
        : '<div class="tl-allclear">No new students waiting for approval. 🌱</div>';
    } else {
      panel = short.length
        ? '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Classes missing students</h3><p class="ui-mod-note">Fewest students added first. Set a size from the school’s Grades &amp; sections.</p></div></div>' +
          '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>School</th><th>Class</th><th>Added</th><th>Expected</th><th></th><th></th></tr></thead><tbody>' +
          short.sort(function (a, b) { return (a.r.expected == null) - (b.r.expected == null) || (a.r.added / (a.r.expected || 1)) - (b.r.added / (b.r.expected || 1)); }).map(function (x, i) {
            var r = x.r;
            return '<tr><td><a class="btn-link" href="' + href('school', { id: x.s.id }) + '">' + esc(x.s.name) + '</a></td><td>' + esc(A.sectionLabel ? A.sectionLabel(x.s.id, r.section_id) : r.name) + '</td>' +
              '<td>' + r.added + (r.pending ? ' <span class="tl-room-tag pend">+' + r.pending + ' pending</span>' : '') + '</td>' +
              '<td>' + (r.expected == null ? '<span class="tl-room-tag warn">Not set</span>' : r.expected + (r.confirmed ? '' : ' <span class="tl-room-tag warn" title="Set automatically from the headcount — an admin hasn’t checked it.">not confirmed</span>')) + '</td>' +
              '<td>' + (r.expected == null ? 'Teachers can’t add without approval' : r.added < r.expected ? (r.expected - r.added) + ' still to add' : 'Check the size is right') + '</td>' +
              '<td class="r">' + (r.expected != null && !r.confirmed ? '<button class="btn-link" data-csconfirm="' + i + '">Confirm ' + r.expected + '</button> · ' : '') + '<button class="btn-link" data-cssize="' + i + '">Set size</button></td></tr>';
          }).join('') + '</tbody></table></div></div>'
        : '<div class="tl-allclear">Every class has all its expected students. 🌱</div>';
    }
    body.innerHTML = screenHead('Class sizes', 'New students added past a class’s expected size, and classes still missing students.') +
      '<div class="ui-tabs mb-3">' + tab('waiting', 'Waiting for approval', waiting.length) + tab('classes', 'Classes missing students', short.length) + '</div>' + panel;
    body.querySelectorAll('[data-csview]').forEach(function (b) { b.addEventListener('click', function () { go('class-sizes', b.dataset.csview === 'classes' ? { view: 'classes' } : {}); }); });
    var pend = body.querySelector('#cs-pending');
    if (pend) wirePendingTable(pend, waiting, function () { go('class-sizes', {}); });
    body.querySelectorAll('[data-cssize]').forEach(function (b) { b.addEventListener('click', function () { openStructureEditor(short[+b.dataset.cssize].s); }); });
    body.querySelectorAll('[data-csconfirm]').forEach(function (b) { b.addEventListener('click', function () {
      var x = short[+b.dataset.csconfirm], r = A.setSectionExpected(x.s.id, x.r.section_id, x.r.expected, me.email);
      if (r.ok) { ORG.server.logAudit(me.name, 'school.size', x.r.name + ' confirmed at ' + x.r.expected, 'school', x.s.id); toast(x.r.name + ': ' + x.r.expected + ' confirmed.'); }
      go('class-sizes', { view: 'classes' });
    }); });
  };

  SCREEN.merge = function (params, body) {
    var suggested = ORG.duplicates.slice();
    var scopeId = params.school || '';
    if (scopeId) suggested = suggested.filter(function (d) { return d.schoolId === scopeId; });

    var suggHtml = suggested.length ? suggested.map(function (d, i) {
      var sc = ORG.byId(d.schoolId);
      return '<div class="tl-sugg"><div class="tl-sugg-body"><div class="ss-title">' + esc(d.master.name) + ' <span class="ss-vs">↔</span> ' + esc(d.duplicate.name) + '</div>' +
        '<div class="ss-meta">' + (sc ? esc(sc.name) + ' · ' : '') + (d.reason === 'same-admission' ? 'Same admission #' : 'Same name (normalised)') + '</div></div>' +
        '<button class="btn btn-outline btn-sm" data-review="' + i + '">Review →</button></div>';
    }).join('') : '<div class="ui-empty">No duplicate suggestions' + (scopeId ? ' for this school' : '') + '. 🌱</div>';

    var history = ORG.mergeHistory.map(function (h) {
      var sc = ORG.byId(h.schoolId);
      var smell = h.relinked === 0 ? ' <span class="ui-tag plain danger tl-smell" title="No assessment data moved — possible no-op or mistaken merge">0 re-linked</span>' : '';
      return '<tr><td>' + esc(h.date) + '</td><td>' + (sc ? esc(sc.name) : '—') + '</td><td class="name">' + esc(h.master) + '</td><td>' + esc(h.duplicate) + '</td><td class="tl-num">' + h.relinked + smell + '</td><td class="tl-num">' + h.skipped + '</td></tr>';
    }).join('');

    var sc = scopeId ? ORG.byId(scopeId) : null;
    body.innerHTML = (sc ? crumbs([{ label: 'All Schools', screen: 'schools' }, { label: sc.name, screen: 'school', params: { id: sc.id, tab: 'students' } }, { label: 'Merge Students' }]) : '') +
      screenHead('Merge Students', 'Deduplicate profiles. Suggestions never auto-merge — always confirm.' + (sc ? ' Scoped to ' + sc.name + '.' : '')) +
      '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Suggested duplicates</h3><p class="ui-mod-note">Same admission # or same normalised name within a school.</p></div></div>' + suggHtml + '</div>' +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Merge history</h3><p class="ui-mod-note">Rows marked <span class="ui-tag plain danger tl-smell">0 re-linked</span> moved no assessment data.</p></div></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Date</th><th>School</th><th>Master (kept)</th><th>Duplicate (deleted)</th><th>Re-linked</th><th>Skipped</th></tr></thead><tbody>' + history + '</tbody></table></div></div>';

    wireCrumbs(body);
    body.querySelectorAll('[data-review]').forEach(function (b) { b.addEventListener('click', function () { openMergeReview(suggested[+b.dataset.review]); }); });
  };

  function diffRow(label, a, b) {
    var same = String(a).toLowerCase().replace(/\s+/g, '') === String(b).toLowerCase().replace(/\s+/g, '');
    return '<tr class="' + (same ? '' : 'diff') + '"><th>' + esc(label) + '</th><td>' + esc(a) + '</td><td>' + esc(b) + '</td></tr>';
  }
  function openMergeReview(d) {
    var sc = ORG.byId(d.schoolId);
    var body = '<p class="tl-muted">Master (kept) on the left, duplicate (deleted) on the right. Confirm they are the same child. <small class="tl-auditnote">Recorded in the Audit Trail.</small></p>' +
      '<div class="ui-tablewrap"><table class="ui-table compact tl-difftable"><thead><tr><th></th><th>Master · kept</th><th>Duplicate · deleted</th></tr></thead><tbody>' +
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
      '<div class="ui-card"><div class="tl-filters"><input class="input grow tl-filter-q" id="dir-q" placeholder="Search by name or admission #…" value="' + esc(params.q || '') + '"></div>' +
      (filtered.length ? '<div class="ui-tablewrap"><table class="ui-table mw-560"><thead><tr><th>Name</th><th>Admission #</th><th>School</th><th>Grade/Section</th></tr></thead><tbody>' +
        filtered.map(function (r) { var s = ORG.byId(r.schoolId); return '<tr class="clickable" data-open="' + r.schoolId + '"><td class="name">' + esc(r.name) + '</td><td class="mono">' + esc(r.admission) + '</td><td>' + (s ? esc(s.name) : '—') + '</td><td>' + esc(r.gradeSection) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="ui-empty">No students match. (Phase 1 directory shows schools with a live roster.)</div>') + '</div>';
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { go('school', { id: b.dataset.open, tab: 'students' }); }); });
    var qi = body.querySelector('#dir-q'); if (qi) qi.addEventListener('input', function () { var pos = qi.selectionStart; SCREEN.directory({ q: qi.value }, body); var nq = body.querySelector('#dir-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  };

  // Users & Invitations share one page: same title + tab strip, each tab keeps
  // its own route (#/users, #/invitations) so deep links and filters still work.
  function peopleHead(tab, sub) {
    return screenHead('Users & Invitations', sub, '<button class="btn btn-primary btn-sm" data-invite>+ Invite user</button>') +
      '<div class="ui-tabs">' +
        '<button class="ui-tab' + (tab === 'users' ? ' on' : '') + '" data-peopletab="users" title="Everyone with a login and their role.">Users <b>' + ORG.users.length + '</b></button>' +
        '<button class="ui-tab' + (tab === 'invitations' ? ' on' : '') + '" data-peopletab="invitations" title="Invites sent to school admins and teachers — pending, accepted or expired.">Invitations <b>' + ORG.invitations.length + '</b></button>' +
      '</div>';
  }
  // Shared filter bar (search · role · school · school group). Filters ride
  // along in the hash, and carry over when you switch tabs.
  function peopleFilters(params) {
    return { q: params.q || '', role: params.role || '', school: params.school || '', group: params.group || '' };
  }
  // School / group / search test shared by both tabs (role is tab-specific).
  // A row is in a group if it names that group directly (group admins) or its school is in it.
  function peopleRowMatches(row, f) {
    if (f.school && row.schoolId !== f.school) return false;
    if (f.group) {
      var sc = row.schoolId ? ORG.byId(row.schoolId) : null;
      if (row.groupId !== f.group && !(sc && sc.groupId === f.group)) return false;
    }
    var q = f.q.trim().toLowerCase();
    if (q && (row.name + ' ' + row.email).toLowerCase().indexOf(q) < 0) return false;
    return true;
  }
  function peopleFiltersHtml(tab, f) {
    var roles = tab === 'users' ? ['', 'none'].concat(ORG.roles.filter(function (r) { return r !== 'none'; })) : [''].concat(ORG.roles.filter(function (r) { return r !== 'none'; }));
    var roleOpts = roles.map(function (r) {
      return '<option value="' + r + '"' + (f.role === r ? ' selected' : '') + '>' + (r === '' ? 'All roles' : (r === 'none' ? 'No role' : esc(r))) + '</option>';
    }).join('');
    // With a group picked, the school list narrows to that group's schools.
    var schools = ORG.activeSchools().filter(function (sc) { return !f.group || sc.groupId === f.group; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var schoolOpts = '<option value="">All schools</option>' + schools.map(function (sc) {
      return '<option value="' + esc(sc.id) + '"' + (f.school === sc.id ? ' selected' : '') + '>' + esc(sc.name) + '</option>';
    }).join('');
    var groupOpts = '<option value="">All school groups</option>' + ORG.activeGroups().map(function (g) {
      return '<option value="' + esc(g.id) + '"' + (f.group === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>';
    }).join('');
    return '<div class="tl-filters">' +
      '<label class="tl-filter-search grow"><span class="ic">' + ICONS.search + '</span>' +
        '<input class="input" id="pf-q" type="search" placeholder="Search by name or email…" aria-label="Search by name or email" value="' + esc(f.q) + '" title="Matches any part of the person’s name or email."></label>' +
      '<label class="select-wrap"><select class="select" id="pf-role" aria-label="Role" title="Show only this role.">' + roleOpts + '</select></label>' +
      '<label class="select-wrap"><select class="select" id="pf-school" aria-label="School" title="Show only people at this school.">' + schoolOpts + '</select></label>' +
      '<label class="select-wrap"><select class="select" id="pf-group" aria-label="School group" title="Show only people at schools in this group (plus that group’s admins).">' + groupOpts + '</select></label>' +
    '</div>';
  }
  // Read the live bar (search may be typed but not yet in the hash).
  function readPeopleFilters(body) {
    var v = function (id) { var el = body.querySelector(id); return el ? el.value : ''; };
    return { q: v('#pf-q'), role: v('#pf-role'), school: v('#pf-school'), group: v('#pf-group') };
  }
  // extra: tab-only params to keep (users: kind · invitations: filter).
  // rerender(params): redraw in place for typing, so the caret survives.
  function wirePeopleFilters(body, tab, extra, rerender) {
    function params(f) { var o = {}; Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; }); ['q', 'role', 'school', 'group'].forEach(function (k) { o[k] = f[k]; }); return o; }
    ['#pf-role', '#pf-school', '#pf-group'].forEach(function (id) {
      var el = body.querySelector(id); if (!el) return;
      el.addEventListener('change', function () {
        var f = readPeopleFilters(body);
        // A school outside the newly picked group can't match — drop it.
        if (id === '#pf-group' && f.group && f.school) { var sc = ORG.byId(f.school); if (!sc || sc.groupId !== f.group) f.school = ''; }
        go(tab, params(f));
      });
    });
    var qi = body.querySelector('#pf-q');
    if (qi) qi.addEventListener('input', function () {
      var pos = qi.selectionStart;
      rerender(params(readPeopleFilters(body)));
      var nq = body.querySelector('#pf-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} }
    });
  }
  function wirePeopleTabs(body) {
    body.querySelectorAll('[data-peopletab]').forEach(function (b) { b.addEventListener('click', function () {
      var f = readPeopleFilters(body);
      if (f.role === 'none' && b.dataset.peopletab !== 'users') f.role = '';   // invitations always carry a role
      go(b.dataset.peopletab, f);
    }); });
  }

  // Users (spec §7.1) — "No role" first-class filter
  SCREEN.users = function (params, body) {
    var f = peopleFilters(params);
    var roleF = f.role;
    var kindF = params.kind || '';
    var list = ORG.users.filter(function (u) {
      if (roleF === 'none' && u.role !== 'none') return false;
      if (roleF && roleF !== 'none' && u.role !== roleF) return false;
      if (kindF === 'staff' && !ORG.isSchoolStaff(u)) return false;
      return peopleRowMatches(u, f);
    });
    var filtered = !!(roleF || kindF || f.q.trim() || f.school || f.group);
    var banner = roleF === 'none' ? '<div class="tl-filterbanner">Filtered to <b>users with no role</b> — dead accounts to clean up · <button class="btn-link" id="u-clear">clear</button></div>'
      : kindF === 'staff' ? '<div class="tl-filterbanner">Filtered to <b>school staff</b> — group admins, school admins and teachers at active schools (Tilli team and no-role accounts hidden) · <button class="btn-link" id="u-clear">clear</button></div>' : '';
    var pgKey = [roleF, kindF, f.q.trim().toLowerCase(), f.school, f.group].join('|');
    if (usersPager.key !== pgKey) { usersPager.key = pgKey; usersPager.page = 1; }
    var pages = Math.max(1, Math.ceil(list.length / usersPager.size));
    usersPager.page = Math.min(Math.max(1, usersPager.page), pages);
    var start = (usersPager.page - 1) * usersPager.size;
    var rows = list.slice(start, start + usersPager.size).map(function (u) {
      var s = u.schoolId ? ORG.byId(u.schoolId) : null;
      return '<tr><td class="name">' + esc(u.name) + '<small>' + esc(u.email) + '</small></td>' +
        '<td>' + (u.role === 'none' ? '<span class="ui-chip warn">No role</span>' : esc(u.role)) + '</td>' +
        '<td>' + (s ? esc(s.name) : (u.role === 'Super Admin' ? 'Tilli Team' : '—')) + '</td>' +
        '<td class="r"><div class="tl-rowacts"><button class="tl-rowact" data-role="' + esc(u.email) + '" title="Change role" aria-label="Change role for ' + esc(u.name) + '">' + ICONS.role + '</button>' +
          '<button class="tl-rowact danger" data-del="' + esc(u.name) + '" title="Delete user" aria-label="Delete ' + esc(u.name) + '">' + ICONS.trash + '</button></div></td></tr>';
    }).join('') || '<tr><td colspan="4"><div class="ui-empty">No users match.</div></td></tr>';
    body.innerHTML = peopleHead('users', list.length + ' users' + (filtered ? ' (filtered)' : '') + '.') + banner +
      '<div class="ui-card">' + peopleFiltersHtml('users', f) +
        '<div id="u-page"><div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>User</th><th>Role</th><th>School</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (list.length ? pagerHtml(list.length, usersPager.page, usersPager.size, filtered ? 'matching users' : 'users') : '') + '</div></div>';
    wirePeopleTabs(body);
    var um = body.querySelector('#u-page');
    if (list.length) wirePager(um, function (page, size) {
      if (size !== usersPager.size) { usersPager.size = size; usersPager.page = 1; try { localStorage.setItem(USERS_PAGE_KEY, String(size)); } catch (e) { /* per-viewer convenience only */ } }
      else usersPager.page = page;
      SCREEN.users(params, body);
      um = body.querySelector('#u-page'); if (um) um.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    wirePeopleFilters(body, 'users', kindF ? { kind: kindF } : {}, function (np) { SCREEN.users(np, body); });
    var uc = body.querySelector('#u-clear'); if (uc) uc.addEventListener('click', function () { go('users', {}); });
    var iv = body.querySelector('[data-invite]'); if (iv) iv.addEventListener('click', function () { openInvite(null); });
    body.querySelectorAll('[data-role]').forEach(function (b) { b.addEventListener('click', function () { openRoleEditor(ORG.users.find(function (u) { return u.email === b.dataset.role; }), function () { go('users', params); }); }); });
    body.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { gated({ title: 'Delete user', danger: true, typed: 'DELETE', body: '<p>Delete <b>' + esc(b.dataset.del) + '</b>? This cannot be undone.</p>', confirmLabel: 'Delete user', audit: { action: 'user.delete', entity: b.dataset.del, entityType: 'user' }, onConfirm: function () { toast('User deleted — logged.'); } }); }); });
  };

  // Invitations (spec §7.2)
  function invStatusPill(i) { var m = { 'Activated': 'ok', 'Account Created': 'sched', 'Expired': 'danger' }; return statusPill(i.status, m[i.status] || ''); }
  SCREEN.invitations = function (params, body) {
    var f = peopleFilters(params);
    var attn = params.filter === 'attention';
    var list = ORG.invitations.filter(function (i) {
      if (f.role && i.role !== f.role) return false;
      if (!peopleRowMatches(i, f)) return false;
      if (!attn) return true;
      if (i.status === 'Activated') return false;
      var d = ORG.inviteDaysLeft(i);
      return i.status === 'Expired' || (d >= 0 && d <= 7);
    });
    var filtered = !!(f.role || f.q.trim() || f.school || f.group);
    var banner = attn ? '<div class="tl-filterbanner">Filtered to <b>expiring / expired</b> invitations · <button class="btn-link" id="inv-clear">clear</button></div>' : '';
    var rows = list.map(function (i) {
      var s = i.schoolId ? ORG.byId(i.schoolId) : null;
      return '<tr><td class="name"><button class="btn-link text-strong" data-inv-detail="' + esc(i.email) + '">' + esc(i.name) + '</button><small>' + esc(i.email) + '</small></td><td>' + esc(i.role) + '</td><td>' + (s ? esc(s.name) : '—') + '</td>' +
        '<td>' + invStatusPill(i) + '</td><td>' + esc(i.delivery) + '</td><td>' + esc(i.created) + '</td><td>' + esc(i.expires) + '</td>' +
        '<td class="r"><div class="tl-rowacts"><button class="tl-rowact" data-resend="' + esc(i.email) + '" title="Resend invitation" aria-label="Resend invitation to ' + esc(i.email) + '">' + ICONS.resend + '</button>' +
          '<button class="tl-rowact danger" data-revoke="' + esc(i.email) + '" title="Revoke invitation" aria-label="Revoke invitation to ' + esc(i.email) + '">' + ICONS.revoke + '</button></div></td></tr>';
    }).join('') || '<tr><td colspan="8"><div class="ui-empty">No invitations.</div></td></tr>';
    body.innerHTML = peopleHead('invitations', list.length + ' invitations' + (attn ? ' needing attention' : '') + (filtered ? ' (filtered)' : '') + '.') + banner +
      '<div class="ui-card">' + peopleFiltersHtml('invitations', f) + '<div class="ui-tablewrap"><table class="ui-table mw-820"><thead><tr><th>Recipient</th><th>Role</th><th>School</th><th>Status</th><th>Delivery</th><th>Created</th><th>Expires</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    wirePeopleTabs(body);
    wirePeopleFilters(body, 'invitations', attn ? { filter: 'attention' } : {}, function (np) { SCREEN.invitations(np, body); });
    var c = body.querySelector('#inv-clear'); if (c) c.addEventListener('click', function () { go('invitations', readPeopleFilters(body)); });
    var iv = body.querySelector('[data-invite]'); if (iv) iv.addEventListener('click', function () { openInvite(null); });
    body.querySelectorAll('[data-inv-detail]').forEach(function (b) { b.addEventListener('click', function () { openInviteDetail(b.dataset.invDetail); }); });
    body.querySelectorAll('[data-resend]').forEach(function (b) { b.addEventListener('click', function () { ORG.server.logAudit(me.name, 'invitation.resend', b.dataset.resend, 'invitation'); toast('Invitation resent.'); }); });
    body.querySelectorAll('[data-revoke]').forEach(function (b) { b.addEventListener('click', function () { gated({ title: 'Revoke invitation', danger: true, body: '<p>Revoke the invitation to <b>' + esc(b.dataset.revoke) + '</b>?</p>', confirmLabel: 'Revoke', audit: { action: 'invitation.revoke', entity: b.dataset.revoke, entityType: 'invitation' }, onConfirm: function () { toast('Invitation revoked.'); } }); }); });
  };

  function openInvite(schoolId) {
    var schoolOpts = '<option value="">— Select school —</option>' + ORG.activeSchools().map(function (s) { return '<option value="' + s.id + '"' + (s.id === schoolId ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('');
    var invRoles = ORG.roles.filter(function (r) { return r !== 'none'; });
    var roleOpts = invRoles.map(function (r) { return '<option value="' + r + '">' + esc(r) + '</option>'; }).join('');
    var groupOpts = '<option value="">— Select group —</option>' + ORG.activeGroups().filter(function (g) { return g.id !== 'g-none'; })
      .map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>'; }).join('');
    openModal('New invitation', '<p class="tl-muted">Send an onboarding invite. <small class="tl-auditnote">Recorded in the Audit Trail.</small></p><div class="tl-stack">' +
      '<label class="field">Recipient email<input class="input" id="iv-email" type="email" placeholder="name@school.edu"></label>' +
      '<label class="field">Role<select class="select" id="iv-role">' + roleOpts + '</select>' +
        '<span class="tl-rolecap" id="iv-rolecap">' + esc(roleCap(invRoles[0])) + '</span></label>' +
      '<label class="field" id="iv-school-f">School<select class="select" id="iv-school">' + schoolOpts + '</select></label>' +
      '<label class="field" id="iv-group-f" style="display:none">School group<select class="select" id="iv-group">' + groupOpts + '</select></label>' +
      '<div class="field" id="iv-boards-f" style="display:none"><span>Board access</span><div id="iv-boards"></div></div>' +
      '</div>', function (close) {
        var em = (document.getElementById('iv-email').value || '').trim();
        if (!em) { toast('Recipient email is required.'); return false; }
        var role = document.getElementById('iv-role').value;
        var isGroup = role === 'School Group Admin';
        var schId = isGroup ? null : (document.getElementById('iv-school').value || null);
        var grpId = isGroup ? (document.getElementById('iv-group').value || null) : null;
        if (isGroup && !grpId) { toast('Pick the group this admin manages.'); return false; }
        // School admin at a multi-board school: every board, or only the ticked ones.
        var boards = null;
        if (document.getElementById('iv-boards-f').style.display !== 'none' && document.querySelector('input[name="iv-bscope"]:checked').value === 'some') {
          boards = Array.prototype.map.call(document.querySelectorAll('[data-ivboard]:checked'), function (c) { return c.value; });
          if (!boards.length) { toast('Tick at least one board, or choose All boards.'); return false; }
        }
        var res = window.TilliAPI
          ? window.TilliAPI.createInvite({ email: em, role: role, school_id: schId, group_id: grpId, boards: boards, invitedBy: me.email })
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
    var ivRole = document.getElementById('iv-role'), ivCap = document.getElementById('iv-rolecap'), ivSchool = document.getElementById('iv-school');
    // Board access shows only for a School Admin at a school with more than one board.
    function syncBoards() {
      var sc = ORG.byId(ivSchool.value), bl = sc ? schoolBoardList(sc) : [], show = ivRole.value === 'School Admin' && bl.length > 1;
      document.getElementById('iv-boards-f').style.display = show ? '' : 'none';
      if (!show) return;
      document.getElementById('iv-boards').innerHTML =
        '<label class="tl-check"><input type="radio" name="iv-bscope" value="all" checked> All boards (' + esc(bl.join(' + ')) + ')</label>' +
        '<label class="tl-check"><input type="radio" name="iv-bscope" value="some"> Only these boards:</label>' +
        '<div class="tl-inline-actions" style="padding-left:24px">' + bl.map(function (b) { return '<label class="tl-check"><input type="checkbox" data-ivboard value="' + esc(b) + '"> ' + esc(b) + '</label>'; }).join('') + '</div>' +
        '<span class="tl-muted">A one-board admin sees only that board’s grades, children and results.</span>';
    }
    if (ivRole && ivCap) ivRole.addEventListener('change', function () {
      ivCap.textContent = roleCap(ivRole.value);
      // A group admin belongs to a group, not a school.
      var g = ivRole.value === 'School Group Admin';
      document.getElementById('iv-school-f').style.display = g ? 'none' : '';
      document.getElementById('iv-group-f').style.display = g ? '' : 'none';
      syncBoards();
    });
    ivSchool.addEventListener('change', syncBoards);
    syncBoards();
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
      '<div class="tl-stack mt-1">' +
        '<div class="ws-rev-row"><span>Email</span><b class="mono">' + esc(email) + '</b></div>' +
        '<div class="ws-rev-row"><span>Role</span><b>' + esc(role) + '</b></div>' +
        '<div class="ws-rev-row"><span>School</span><b>' + (sc ? esc(sc.name) : '—') + '</b></div>' +
        '<div class="ws-rev-row"><span>Status</span><b>' + esc(status) + '</b></div>' +
        (inv ? '<div class="ws-rev-row"><span>Created</span><b>' + esc(inv.created) + '</b></div>' +
               '<div class="ws-rev-row"><span>Expires</span><b>' + esc(inv.expires) + '</b></div>' : '') +
        pwLine +
      '</div>' +
      (canCopy ? '<p class="tl-muted mt-3">The recipient signs in with this password at the Tilli Measures landing page, then sets their own.</p>'
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
      '<div class="tl-stack mt-3">' +
        '<div class="ws-rev-row"><span>Email</span><b class="mono">' + esc(res.email) + '</b></div>' +
        '<div class="ws-rev-row"><span>Temporary password</span><b class="mono" id="iv-temp">' + esc(res.tempPassword) + '</b></div>' +
        '<div class="ws-rev-row"><span>Role</span><b>' + esc(res.role) + '</b></div>' +
      '</div>' +
      '<p class="tl-muted mt-3">This password is shown once and expires when they set their own. Sign-in is at the Tilli Measures landing page.</p>',
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
    var schF = params.school || '';
    // School filter scopes everything below (tabs, table, crash group).
    var scoped = ORG.issues.filter(function (i) { return !schF || i.schoolId === schF; });
    var counts = { all: scoped.length, open: 0, investigating: 0, resolved: 0 };
    scoped.forEach(function (i) { counts[i.status]++; });
    var human = scoped.filter(function (i) { return !i.autoCrash; });
    var crashes = scoped.filter(function (i) { return i.autoCrash; });
    var list = human.filter(function (i) { return st === 'all' || i.status === st; });

    // Schools ranked by open issues (portfolio-wide) — the "highlight by school" strip.
    var openBySchool = {};
    ORG.schools.forEach(function (sc) { var n = ORG.server.openIssueCount(sc.id); if (n) openBySchool[sc.id] = n; });
    var ranked = Object.keys(openBySchool).sort(function (a, b) { return openBySchool[b] - openBySchool[a]; });
    var strip = ranked.length ? '<div class="tl-issue-strip"><span class="ui-eyebrow">Most open issues</span>' +
      ranked.slice(0, 6).map(function (id) { var sc = ORG.byId(id);
        return '<button class="ui-filterchip' + (schF === id ? ' on' : '') + '" data-isch="' + esc(id) + '" title="Show only ' + esc(sc ? sc.name : id) + '’s issues">' + esc(sc ? sc.name : id) + ' <b>' + openBySchool[id] + '</b></button>';
      }).join('') + '</div>' : '';
    var withIssues = ORG.schools.filter(function (sc) { return ORG.issues.some(function (i) { return i.schoolId === sc.id; }); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    var schoolSel = '<label class="select-wrap"><select class="select" id="is-school" title="Show issues from one school only"><option value="">All schools</option>' +
      withIssues.map(function (sc) { return '<option value="' + esc(sc.id) + '"' + (schF === sc.id ? ' selected' : '') + '>' + esc(sc.name) + (openBySchool[sc.id] ? ' (' + openBySchool[sc.id] + ' open)' : '') + '</option>'; }).join('') +
      '</select></label>';

    var pgKey = st + '|' + schF;
    if (issuesPager.key !== pgKey) { issuesPager.key = pgKey; issuesPager.page = 1; }
    var pages = Math.max(1, Math.ceil(list.length / issuesPager.size));
    issuesPager.page = Math.min(Math.max(1, issuesPager.page), pages);
    var start = (issuesPager.page - 1) * issuesPager.size;
    var rows = list.slice(start, start + issuesPager.size).map(function (i) {
      var s = ORG.byId(i.schoolId);
      return '<tr><td class="name">' + esc(i.reporter) + '<small>' + esc(i.role) + '</small></td><td>' + (s ? esc(s.name) : '—') + '</td><td>' + esc(i.page) + '</td><td>' + esc(i.device) + '</td><td>' + esc(i.date) + '</td><td>' + issueStatusPill(i.status) + '</td>' +
        '<td class="r"><button class="btn-link" data-status="' + i.id + '">Change status</button></td></tr>';
    }).join('') || '<tr><td colspan="7"><div class="ui-empty">No issues in this view.</div></td></tr>';

    var crashGroup = crashes.length ? '<div class="ui-card mt-gap"><details class="tl-crashes"><summary><b>' + crashes.length + '</b> auto-crash reports · grouped (' + esc(crashes[0].crashSig) + ')</summary>' +
      '<div class="ui-tablewrap"><table class="ui-table mw-560"><thead><tr><th>Device</th><th>Page</th><th>Date</th><th>School</th></tr></thead><tbody>' +
        crashes.map(function (c) { var s = ORG.byId(c.schoolId); return '<tr><td>' + esc(c.device) + '</td><td>' + esc(c.page) + '</td><td>' + esc(c.date) + '</td><td>' + (s ? esc(s.name) : '—') + '</td></tr>'; }).join('') +
      '</tbody></table></div></details></div>' : '';

    var schName = schF && ORG.byId(schF) ? ORG.byId(schF).name : '';
    body.innerHTML = screenHead('Issue Reports', counts.open + ' open · ' + crashes.length + ' auto-crash grouped' + (schName ? ' · ' + esc(schName) : '') + '.') +
      strip +
      '<div class="ui-card"><div class="tl-filters">' + schoolSel + (schF ? '<button class="btn-link" id="is-clear">Clear school filter</button>' : '') + '</div><div class="ui-tabs">' +
        ['all', 'open', 'investigating', 'resolved'].map(function (k) { return '<button class="ui-tab' + (st === k ? ' on' : '') + '" data-istab="' + k + '">' + k.charAt(0).toUpperCase() + k.slice(1) + ' <b>' + (k === 'all' ? counts.all : counts[k]) + '</b></button>'; }).join('') + '</div>' +
        '<div id="is-page"><div class="ui-tablewrap"><table class="ui-table mw-760"><thead><tr><th>Reporter</th><th>School</th><th>Page</th><th>Device</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (list.length ? pagerHtml(list.length, issuesPager.page, issuesPager.size, st === 'all' ? 'issues' : st + ' issues') : '') + '</div></div>' +
      crashGroup;
    var im = body.querySelector('#is-page');
    if (list.length) wirePager(im, function (page, size) {
      if (size !== issuesPager.size) { issuesPager.size = size; issuesPager.page = 1; try { localStorage.setItem(ISSUES_PAGE_KEY, String(size)); } catch (e) { /* per-viewer convenience only */ } }
      else issuesPager.page = page;
      SCREEN.issues(params, body);
      im = body.querySelector('#is-page'); if (im) im.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    body.querySelectorAll('[data-istab]').forEach(function (b) { b.addEventListener('click', function () { go('issues', { status: b.dataset.istab, school: schF }); }); });
    body.querySelectorAll('[data-isch]').forEach(function (b) { b.addEventListener('click', function () { go('issues', { status: st, school: schF === b.dataset.isch ? '' : b.dataset.isch }); }); });
    var isel = body.querySelector('#is-school'); if (isel) isel.addEventListener('change', function () { go('issues', { status: st, school: isel.value }); });
    var icl = body.querySelector('#is-clear'); if (icl) icl.addEventListener('click', function () { go('issues', { status: st }); });
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
  function depStatusPill(st) { var m = { Scheduled: 'sched', Live: 'ok', Ended: 'muted', 'Not run': 'muted' }; return statusPill(st, m[st] || ''); }
  SCREEN.deployments = function (params, body) {
    var tab = params.tab === 'results' ? 'results' : 'list';
    var panels = { list: depList, results: depResults };
    body.innerHTML = screenHead('Deployments', 'Deploy assessments to schools and read their responses.') +
      '<div class="ui-tabs">' +
        '<button class="ui-tab' + (tab === 'list' ? ' on' : '') + '" data-deptab="list">Deployments <b>' + ORG.deployments.length + '</b></button>' +
        '<button class="ui-tab' + (tab === 'results' ? ' on' : '') + '" data-deptab="results">Results <b>' + ORG.results.length + '</b></button>' +
      '</div><div id="dep-panel"></div>';
    (panels[tab])(params, document.getElementById('dep-panel'));
    body.querySelectorAll('[data-deptab]').forEach(function (b) { b.addEventListener('click', function () { go('deployments', { tab: b.dataset.deptab }); }); });
    if (tab === 'list' && !GROUP && window.TilliAPI && window.TilliAPI.schedulingRules) {
      body.insertAdjacentHTML('beforeend', schedulingRulesHtml());
      wireSchedulingRules(body);
    }
  };
  // Timing rules behind "Plan from calendar" — one set for every school, editable here.
  var SCHED_FIELDS = [
    { k: 'baselineWeeksIn', label: 'Baseline starts', unit: 'weeks after Term 1 starts', tip: 'Gives children time to settle before the first check-in.' },
    { k: 'windowWeeks', label: 'Each window lasts', unit: 'weeks', tip: 'Length of every Baseline / Midline / Endline window, before holidays stretch it.' },
    { k: 'midlineWeeksIn', label: 'Midline starts', unit: 'weeks into the middle term', tip: 'Midline is placed in the middle term (or halfway through the year with fewer than two terms).' },
    { k: 'midlineGapWeeks', label: 'Midline is at least', unit: 'weeks after Baseline ends', tip: 'Enough time between check-ins for growth to show.' },
    { k: 'endlineBufferWeeks', label: 'Endline ends', unit: 'weeks before the final exams', tip: 'Finishes before the exam rush (or the last term’s end when there are no exams).' },
  ];
  function schedulingRulesHtml() {
    var r = window.TilliAPI.schedulingRules();
    return '<div class="ui-card mt-gap" id="sched-rules"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Scheduling rules</h3><p class="ui-mod-note">Used by <b>Plan from calendar</b> on every school. Windows never overlap an exam block and stretch over holidays.</p></div></div>' +
      '<div class="tl-stack">' + SCHED_FIELDS.map(function (f) {
        return '<label class="tl-schedrow" title="' + esc(f.tip) + '"><span>' + esc(f.label) + '</span><input type="number" min="' + (f.k === 'windowWeeks' ? 1 : 0) + '" max="52" class="input sm" data-sched="' + f.k + '" value="' + r[f.k] + '"><span class="tl-muted">' + esc(f.unit) + '</span></label>';
      }).join('') + '</div></div>';
  }
  function wireSchedulingRules(body) {
    body.querySelectorAll('[data-sched]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var patch = {}; patch[inp.dataset.sched] = inp.value;
        var r = window.TilliAPI.setSchedulingRules(patch); inp.value = r[inp.dataset.sched];
        ORG.server.logAudit(me.name, 'deployment.rules', inp.dataset.sched + ' = ' + r[inp.dataset.sched], 'deployment');
        toast('Scheduling rule saved — applies the next time a calendar is planned.');
      });
    });
  }

  // Mock portfolio rows have no academic year of their own — label them with
  // the year their window starts in (Jun → May), like the seeded schools.
  function mockYearLabel(iso) { var y = +String(iso || TODAY_ISO).slice(0, 4), m = +String(iso || TODAY_ISO).slice(5, 7); if (m < 6) y--; return y + '–' + String(y + 1).slice(2); }
  // Shared-store schools: every lane of every year (current + archived), one row per assessment.
  function apiDeploymentRows() {
    var API = window.TilliAPI, out = [];
    if (!API || !API.yearsFor) return out;
    ORG.schools.forEach(function (s) {
      if (s.archived || !tlUsesApi(s)) return;
      API.yearsFor(s.id).forEach(function (y) {
        API.deploymentsIn(s.id, y.id).forEach(function (l) {
          (l.assessments || []).forEach(function (a) {
            out.push({ assessment: a.name, schoolId: s.id, audience: l.audience, mode: a.mode, phase: l.phase, start: l.start || '', end: l.end || '',
              chain: !!l.chained, status: l.status, year: y.label, current: y.status === 'current', version: a.version || 1 });
          });
        });
      });
    });
    return out;
  }
  function depList(params, el) {
    var attn = params.filter === 'attention', yearF = params.year || '';
    var all = ORG.deployments.map(function (d) { return Object.assign({}, d, { year: mockYearLabel(d.start) }); }).concat(apiDeploymentRows());
    var years = all.reduce(function (acc, d) { if (acc.indexOf(d.year) < 0) acc.push(d.year); return acc; }, []).sort().reverse();
    var list = all.filter(function (d) {
      if (yearF && d.year !== yearF) return false;
      if (!attn) return true;
      if (d.status === 'Live') return ORG.daysFromNow(d.end) <= 3;
      if (d.status === 'Scheduled') return ORG.daysFromNow(d.start) < 0;
      return false;
    });
    var banner = attn ? '<div class="tl-filterbanner">Filtered to <b>deployments needing attention</b> (window closing, or scheduled start passed) · <button class="btn-link" id="dep-clear">clear</button></div>' : '';
    var rows = list.map(function (d) {
      var s = ORG.byId(d.schoolId);
      // Rows deep-link into the Results tab, pre-filtered to that assessment.
      return '<tr class="clickable" data-depres="' + esc(d.assessment) + '"><td class="name">' + esc(d.assessment) + (d.version > 1 ? ' <small class="tl-ver">v' + d.version + '</small>' : '') + (d.gamified ? ' <span class="ui-tag plain pink tl-badge-gam">Gamified</span>' : '') + '</td><td>' + (s ? esc(s.name) : '—') + '</td><td>' + esc(d.year) + '</td><td>' + esc(d.audience) + '</td><td>' + esc((d.mode || (d.audience === 'Parent' ? 'home' : 'school')) === 'home' ? 'At home' : 'At school') + '</td><td>' + esc(d.phase) + '</td><td>' + esc(d.start + ' → ' + d.end) + '</td><td>' + (d.chain ? '⛓' : '—') + '</td><td>' + depStatusPill(d.status) + '</td></tr>';
    }).join('') || '<tr><td colspan="9"><div class="ui-empty">No deployments in this view.</div></td></tr>';
    var yearSel = '<label class="select-wrap" style="max-width:200px"><select class="select" id="dep-year" aria-label="Academic year" title="Show deployments from one academic year. Past years are read-only.">' +
      '<option value="">All years</option>' + years.map(function (y) { return '<option value="' + esc(y) + '"' + (y === yearF ? ' selected' : '') + '>' + esc(y) + '</option>'; }).join('') + '</select></label>';
    el.innerHTML = banner +
      '<div class="row mb-3" style="justify-content:space-between;gap:8px;flex-wrap:wrap">' + yearSel + '<button class="btn btn-primary btn-sm" data-newdep>+ New deployment</button></div>' +
      '<div class="ui-card"><div class="ui-tablewrap"><table class="ui-table mw-820"><thead><tr><th>Assessment</th><th>School</th><th>Year</th><th>Audience</th><th>Where</th><th>Phase</th><th>Window</th><th>Chain</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    el.querySelector('#dep-year').addEventListener('change', function (ev) { go('deployments', Object.assign({}, attn ? { filter: 'attention' } : {}, ev.target.value ? { year: ev.target.value } : {})); });
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
    }).join('') : '<tr><td colspan="8"><div class="ui-empty">No results match.</div></td></tr>';
    el.innerHTML =
      '<div class="row end mb-3"><button class="btn btn-primary btn-sm" id="res-dl">Download CSV</button></div>' +
      '<div class="ui-card"><div class="tl-filters"><label class="select-wrap"><select class="select" id="res-phase">' + phaseOpts + '</select></label>' +
        '<input class="input grow tl-filter-q" id="res-q" placeholder="Search school or assessment…" value="' + esc(params.q || '') + '"></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-820"><thead><tr><th>School</th><th>Assessment</th><th>Phase</th><th>Audience</th><th>Responses</th><th>Completion</th><th>Status</th><th>Updated</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    el.querySelector('#res-dl').addEventListener('click', function () {
      downloadCsv('assessment-results.csv', ['School', 'Assessment', 'Phase', 'Audience', 'Responses', 'Expected', 'Completion %', 'Status', 'Updated'],
        list.map(function (r) { var s = ORG.byId(r.schoolId); return [s ? s.name : '', r.assessment, r.phase, r.audience, r.responses, r.expected, r.completion, r.status, r.updated]; }));
    });
    var pf = el.querySelector('#res-phase'); if (pf) pf.addEventListener('change', function () { go('deployments', { tab: 'results', phase: pf.value, q: params.q }); });
    var rq = el.querySelector('#res-q'); if (rq) rq.addEventListener('input', function () { var pos = rq.selectionStart; depResults({ phase: phaseF, q: rq.value }, el); var nq = el.querySelector('#res-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  }

  // Where an audience's assessments can run: teachers at school, parents at home,
  // student direct either. Shared by templates, New deployment and the planner.
  var WHERE_BY_AUD = { 'Teacher': ['school'], 'Parent': ['home'], 'Direct Assessment': ['school', 'home'] };
  function whereText(aud) { var w = WHERE_BY_AUD[aud] || ['school']; return w.length > 1 ? 'At school or home' : (w[0] === 'home' ? 'At home' : 'At school'); }

  // "Latest" / "Older version" — only for published, non-archived templates.
  // A template has three phase slots (Baseline / Midline / Endline), each with
  // its own published versions and at most one draft (ORG.server.slotOf).
  // tplPhases(t) = the phases with a live version (what can be deployed).
  var TPL_PHASE_LIST = ['Baseline', 'Midline', 'Endline'];
  function tplPhases(t) { return t.phases || []; }
  function tplLive(t, ph) { return ORG.server.liveVersion(t, ph); }
  function tplDraft(t, ph) { return ORG.server.slotOf(t, ph).draft; }
  function tplCountQ(qs) { return (qs || []).filter(function (q) { return q.type !== 'section'; }).length; }
  // One pill per phase: "Baseline v2" (live) · "Midline ✎" (draft only) · "Endline" (not set up).
  function tplPhasePills(t) {
    return '<span class="tl-phpills">' + TPL_PHASE_LIST.map(function (ph) {
      var lv = tplLive(t, ph), dr = tplDraft(t, ph);
      var tip = lv ? ph + ': v' + lv.v + ' is live' + (dr ? ' · a draft is in progress' : '') : dr ? ph + ': draft in progress — not live yet' : ph + ': not set up';
      return '<span class="tl-phpill st-' + (lv ? 'live' : dr ? 'draft' : 'none') + '" title="' + esc(tip) + '">' + ph + (lv ? ' v' + lv.v : '') + (dr ? ' ✎' : '') + '</span>';
    }).join('') + '</span>';
  }
  function fmtMs(ms) { return ms ? fmtJoined(ORG.iso(ms)) : '—'; }
  function tplMetaLine(t) {
    return 'Created ' + esc(fmtMs(t.createdAt)) + ' by ' + esc(t.createdBy || '—') +
      (t.updatedAt && t.updatedAt !== t.createdAt ? ' · Edited ' + esc(fmtMs(t.updatedAt)) + (t.updatedBy && t.updatedBy !== t.createdBy ? ' by ' + esc(t.updatedBy) : '') : '');
  }

  // Templates (spec §6.1)
  // Audience chip: colour + icon per audience (colours: --aud-* in tilli.html).
  var AUD_META = {
    'Teacher':            { cls: 'teacher',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20l4-4 4 4"/><line x1="7" y1="9" x2="13" y2="9"/></svg>' },
    'Parent':             { cls: 'parent',      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17.5" cy="11" r="2.2"/><path d="M14.8 20a3.4 3.4 0 0 1 6.2-1.9"/></svg>' },
    'Direct Assessment':  { cls: 'direct',      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4h4v2.5a1.5 1.5 0 1 0 3 0V4h3v6h-2.5a1.5 1.5 0 1 0 0 3H20v7h-6v-2.5a1.5 1.5 0 1 0-3 0V20H4v-7h2.5a1.5 1.5 0 1 0 0-3H4V4z"/></svg>' },
  };
  var AUD_TIPS = {
    'Teacher': 'Answered by the class teacher about each student.',
    'Parent': 'Answered by a parent at home.',
    'Direct Assessment': 'Done by the student — gamified tasks.',
  };
  function audChip(aud) {
    var m = AUD_META[aud] || { cls: 'other', icon: '' };
    return '<span class="tl-audchip a-' + m.cls + '"' + (AUD_TIPS[aud] ? ' title="' + esc(AUD_TIPS[aud]) + '"' : '') + '>' + m.icon + esc(aud) + '</span>';
  }

  // Grid (cards) or List (table) — a per-viewer preference, remembered in this browser.
  var TPL_LAYOUT_KEY = 'tilliMeasures.admin.templatesLayout';
  var tplLayout = (function () { try { return localStorage.getItem(TPL_LAYOUT_KEY) === 'grid' ? 'grid' : 'list'; } catch (e) { return 'list'; } })();
  // List-view column sort, one state per table. key null = the default order.
  var tplSort = { tpl: { key: null, dir: 1 }, sg: { key: null, dir: 1 } };
  var TPL_SORT_DESC_FIRST = { history: 1, items: 1 };   // columns whose first click is newest / largest first
  // Stable sort by it.sort[key]; empty values always sink to the bottom.
  function sortTplItems(arr, st) {
    if (!st.key) return arr;
    return arr.map(function (it, i) { return { it: it, i: i }; }).sort(function (a, b) {
      var x = a.it.sort[st.key], y = b.it.sort[st.key];
      var nx = x == null || x === '', ny = y == null || y === '';
      if (nx || ny) return nx === ny ? a.i - b.i : (nx ? 1 : -1);
      var c = typeof x === 'string' ? x.localeCompare(y, undefined, { sensitivity: 'base' }) : x - y;
      return c ? c * st.dir : a.i - b.i;
    }).map(function (o) { return o.it; });
  }
  function sortTh(table, key, label, tip) {
    var st = tplSort[table], on = st.key === key;
    return '<th aria-sort="' + (on ? (st.dir > 0 ? 'ascending' : 'descending') : 'none') + '">' +
      '<button type="button" class="tl-sortbtn' + (on ? ' on' : '') + '" data-tsort="' + table + ':' + key + '" title="' + esc(tip) + '">' + label +
      '<span class="tl-sort-ic" aria-hidden="true">' + (on ? (st.dir > 0 ? '▲' : '▼') : '↕') + '</span></button></th>';
  }
  SCREEN.templates = function (params, body) {
    var stF = params.status || '';
    var arch = params.view === 'archived';
    var asList = tplLayout === 'list';
    var counts = { active: ORG.templates.filter(function (t) { return !t.archived; }).length, archived: ORG.templates.filter(function (t) { return t.archived; }).length };
    // ?status=Draft (Control Room card) = templates with a phase draft waiting to be published.
    var list = ORG.templates.filter(function (t) { return (arch ? t.archived : !t.archived) && (stF !== 'Draft' || t.hasDraft); });
    var banner = stF ? '<div class="tl-filterbanner">Filtered to templates with a <b>draft</b> waiting to be published · <button class="btn-link" id="tpl-clear">clear</button></div>' : '';
    // One item model, rendered as a card (grid) or a table row (list).
    // { aud, badges, title, desc, meta, foot, action, archived }
    var items = [];
    // The Observation Form is a first-class template (audience: Observation): a
    // shared question bank published per phase. It opens its own editor rather
    // than the generic template menu. Hidden when a status filter is applied.
    if (!stF && !arch) {
      var obs = ORG.observation;
      var pub = obs.phases.filter(function (p) { return p.published; }).length;
      var obsPills = '<span class="tl-phpills">' + obs.phases.map(function (x, i) {
        return '<span class="tl-phpill st-' + (x.published ? 'live' : 'none') + '" title="' + esc(x.label) + (x.published ? ' — published' : ' — not published') + '">' + TPL_PHASE_LIST[i] + '</span>'; }).join('') + '</span>';
      items.push({ aud: 'Teacher', open: 'data-obsedit', badges: '',
        title: 'Teacher Observation Form', desc: obs.questions.length + '-item shared question bank, published per phase. Deploy from Deployments.',
        meta: '', foot: obsPills,
        action: '<button class="tl-rowact" data-obsedit title="Edit the observation form — questions and which phases are published" aria-label="Edit Teacher Observation Form">' + ICONS.edit + '</button>',
        sort: { title: 'Teacher Observation Form', aud: 'Teacher', history: null } });
    }
    // Teacher Reflection Questions: the one-time onboarding reflection, edited in
    // its own screen (SCREEN.reflection). Not deployed — teachers get it on first login.
    var reflCfg = (!stF && !arch && window.TilliAPI && window.TilliAPI.getReflectionConfig) ? window.TilliAPI.getReflectionConfig() : null;
    if (reflCfg) {
      var rqN = (reflCfg.questions || []).length, rcN = (reflCfg.cats || []).length;
      items.push({ aud: 'Teacher', open: 'data-refledit', badges: '',
        title: 'Teacher Reflection Questions', desc: 'One-time self-reflection every teacher completes during dashboard onboarding — ' + rqN + ' questions across ' + rcN + ' categories.',
        meta: reflCfg.updatedAt ? 'Last saved ' + esc(fmtMs(reflCfg.updatedAt)) : '', foot: '<span class="tl-phnote">Onboarding · ' + rqN + ' questions · not deployed</span>',
        action: '<button class="tl-rowact" data-refledit title="Edit the reflection questions" aria-label="Edit Teacher Reflection Questions">' + ICONS.edit + '</button>',
        sort: { title: 'Teacher Reflection Questions', aud: 'Teacher', history: reflCfg.updatedAt ? +new Date(reflCfg.updatedAt) : null } });
    }
    list.forEach(function (t) {
      items.push({ aud: t.audience, archived: t.archived, open: 'data-tplopen="' + t.id + '"',
        badges: t.archived ? statusPill('Archived', 'muted') : '',
        title: t.title, desc: t.desc, meta: tplMetaLine(t), foot: tplPhasePills(t),
        action: '<button class="tl-rowact" data-tpl="' + t.id + '" title="Edit details, duplicate, archive or delete" aria-label="Options for ' + esc(t.title) + '">' + ICONS.edit + '</button>',
        sort: { title: t.title, aud: t.audience, history: +new Date(t.updatedAt || t.createdAt) || null } });
    });
    function tplName(it) { return '<button type="button" class="tl-tpl-name" ' + it.open + ' title="Open — pick a phase to see or edit its questions">' + esc(it.title) + '</button>'; }
    function tplCard(it) {
      return '<div class="tl-tpl-card' + (it.archived ? ' is-archived' : '') + '"><div class="tt-top">' + audChip(it.aud) +
        (it.badges ? '<span class="tt-badges">' + it.badges + '</span>' : '') + '</div>' +
        '<div class="tt-title">' + tplName(it) + '</div><div class="tt-desc">' + esc(it.desc) + '</div>' +
        (it.meta ? '<div class="tt-meta">' + it.meta + '</div>' : '') +
        '<div class="tt-foot"><span class="tt-phase">' + it.foot + '</span>' + it.action + '</div></div>';
    }
    function tplRow(it) {
      return '<tr' + (it.archived ? ' class="is-archived"' : '') + '><td class="name">' + tplName(it) + '<small>' + esc(it.desc) + '</small></td>' +
        '<td>' + audChip(it.aud) + (it.badges ? ' ' + it.badges : '') + '</td><td>' + it.foot + '</td>' +
        '<td class="tl-tpl-meta">' + (it.meta || '—') + '</td><td class="r">' + it.action + '</td></tr>';
    }
    var empty = '<div class="ui-empty">' + (arch ? 'No archived templates.' : 'No templates.') + '</div>';
    var tplView = !items.length ? empty : asList
      ? '<div class="ui-tablewrap"><table class="ui-table mw-820 tl-tpl-table"><thead><tr>' +
          sortTh('tpl', 'title', 'Template', 'Sort by template name') + sortTh('tpl', 'aud', 'Audience', 'Sort by audience') +
          '<th title="Each phase: v = the live version, ✎ = a draft in progress, plain = not set up">Phases</th>' +
          sortTh('tpl', 'history', 'History', 'Sort by last edited (newest first on the first click)') + '<th></th></tr></thead><tbody>' +
          sortTplItems(items, tplSort.tpl).map(tplRow).join('') + '</tbody></table></div>'
      : '<div class="tl-tpl-grid">' + items.map(tplCard).join('') + '</div>';
    // Self-Guided assessments live here too: gamified instruments (EMT, Hearts &
    // Flowers, Memory Game) shown as their own section under the template grid.
    var games = (stF || arch) ? [] : ORG.selfGuided;
    var sgView = !games.length ? '' : asList
      ? '<div class="ui-tablewrap"><table class="ui-table mw-760 tl-tpl-table"><thead><tr>' +
          sortTh('sg', 'title', 'Instrument', 'Sort by instrument name') + '<th>Skills</th>' +
          sortTh('sg', 'items', 'Items', 'Sort by number of items (most first on the first click)') +
          sortTh('sg', 'status', 'Status', 'Sort by status — Published first') + '<th></th></tr></thead><tbody>' +
          sortTplItems(games.map(function (g) { return { g: g, sort: { title: g.name, items: g.questions, status: g.status === 'Published' ? 0 : 1 } }; }), tplSort.sg).map(function (o) {
            var g = o.g;
            return '<tr><td class="name">' + esc(g.name) + '<small>' + esc(g.full) + ' — ' + esc(g.desc) + '</small></td><td>' + skillTagsHtml(g.skills) + '</td>' +
              '<td>' + g.questions + '</td><td>' + statusPill(g.status, g.status === 'Published' ? 'ok' : 'warn') + '</td>' +
              '<td class="r"><button class="tl-rowact" data-manage="' + g.id + '" title="Manage this instrument" aria-label="Manage ' + esc(g.name) + '">' + ICONS.settings + '</button></td></tr>';
          }).join('') + '</tbody></table></div>'
      : '<div class="tl-sg-grid">' + games.map(function (g) {
          return '<div class="tl-sg-card"><div class="sg-top"><div><div class="sg-name">' + esc(g.name) + '</div><div class="sg-full">' + esc(g.full) + '</div></div>' +
            statusPill(g.status, g.status === 'Published' ? 'ok' : 'warn') + '</div>' +
            skillTagsHtml(g.skills) + '<div class="sg-desc">' + esc(g.desc) + '</div>' +
            '<div class="sg-foot"><span class="sg-q">' + g.questions + ' items</span><button class="tl-rowact" data-manage="' + g.id + '" title="Manage this instrument" aria-label="Manage ' + esc(g.name) + '">' + ICONS.settings + '</button></div></div>';
        }).join('') + '</div>';
    var sgSection = sgView ? '<div class="ui-eyebrow tl-mini-head">Self-Guided Assessments</div>' +
      '<p class="ui-mod-note" style="margin:-4px 0 var(--page-gap)">' + ORG.selfGuided.length + ' gamified instruments — EMT, Hearts &amp; Flowers, Memory Game.</p>' + sgView : '';
    var layoutSeg = '<div class="ui-seg tl-layoutseg" role="group" aria-label="Layout">' +
      '<button class="' + (asList ? '' : 'on') + '" data-tpllayout="grid" aria-pressed="' + !asList + '" title="Grid — one card per template">' + ICONS.grid + '<span>Grid</span></button>' +
      '<button class="' + (asList ? 'on' : '') + '" data-tpllayout="list" aria-pressed="' + asList + '" title="List — one row per template, easier to scan and compare">' + ICONS.list + '<span>List</span></button></div>';
    body.innerHTML = screenHead('Templates', items.length + ' templates. Open one and pick a phase — Baseline, Midline or Endline — to see or edit its questions.', '<button class="btn btn-primary btn-sm" data-new>+ New template</button>') +
      '<div class="ui-tabs">' +
        '<button class="ui-tab' + (!arch ? ' on' : '') + '" data-tplview="">Active <b>' + counts.active + '</b></button>' +
        '<button class="ui-tab' + (arch ? ' on' : '') + '" data-tplview="archived" title="Archived templates are hidden from new deployments but kept for reference.">Archived <b>' + counts.archived + '</b></button>' +
        layoutSeg +
      '</div>' + banner + tplView + sgSection;
    body.querySelectorAll('[data-tsort]').forEach(function (b) { b.addEventListener('click', function () {
      var parts = b.dataset.tsort.split(':'), st = tplSort[parts[0]], key = parts[1];
      if (st.key === key) st.dir = -st.dir;
      else { st.key = key; st.dir = TPL_SORT_DESC_FIRST[key] ? -1 : 1; }
      SCREEN.templates(params, body);
    }); });
    body.querySelectorAll('[data-tpllayout]').forEach(function (b) { b.addEventListener('click', function () {
      if (tplLayout === b.dataset.tpllayout) return;
      tplLayout = b.dataset.tpllayout;
      try { localStorage.setItem(TPL_LAYOUT_KEY, tplLayout); } catch (e) { /* per-viewer convenience only */ }
      SCREEN.templates(params, body);
    }); });
    var c = body.querySelector('#tpl-clear'); if (c) c.addEventListener('click', function () { go('templates', arch ? { view: 'archived' } : {}); });
    body.querySelectorAll('[data-tplview]').forEach(function (b) { b.addEventListener('click', function () { go('templates', b.dataset.tplview ? { view: b.dataset.tplview } : {}); }); });
    var nb = body.querySelector('[data-new]'); if (nb) nb.addEventListener('click', openNewTemplate);
    body.querySelectorAll('[data-obsedit]').forEach(function (b) { b.addEventListener('click', function () { go('observation', {}); }); });
    body.querySelectorAll('[data-refledit]').forEach(function (b) { b.addEventListener('click', function () { go('reflection', {}); }); });
    body.querySelectorAll('[data-tplopen]').forEach(function (b) { b.addEventListener('click', function () { go('template', { id: b.dataset.tplopen }); }); });
    body.querySelectorAll('[data-tpl]').forEach(function (b) { b.addEventListener('click', function () { openTemplateMenu(b.dataset.tpl); }); });
    body.querySelectorAll('[data-manage]').forEach(function (b) { b.addEventListener('click', function () { openManageGame(b.dataset.manage); }); });
  };

  // ============================================================
  //  TEMPLATE BUILDER (#/template?id=) — a template's questions, edited in
  //  place: Section Break / Multiple Choice / Short Answer cards with options
  //  + scores, timing, media, conditional display, scoring rule and skills.
  //  Edits save straight onto the template (autosave). Media / option images
  //  are local previews only in this prototype.
  // ============================================================
  var TB_TYPES = { section: 'Section Break', mc: 'Multiple Choice', text: 'Short Answer' };
  var TB_SKILLS = ['Emotion Awareness', 'Emotion Regulation', 'Empathy', 'Relationship Skills', 'Metacognition', 'Critical Thinking',
    'Attention', 'Working Memory', 'Cognitive Flexibility', 'Planning and Organization', 'Inhibition (Distraction)', 'Inhibition (Response)'];
  var TB_SCORING = { map: 'Option Score Mapping', correct: 'Correct Answer', none: 'Not Scored' };
  var TB_SCORING_TIP = { map: 'Each option carries its own score; the answer’s score counts toward the skills below.',
    correct: 'Options scored 1 are correct, everything else 0.', none: 'Collected but never scored (e.g. feedback on the school).' };
  var TB_LANGS = ['Hindi', 'Tamil', 'Telugu', 'Kannada', 'Marathi', 'Bengali', 'Sinhala'];
  var TB_OPEN_FIRST = 0;   // cards open by default on first visit (0 = all start collapsed)
  var tbState = { id: null, phase: null, tab: 'questions', lang: null, open: {} };
  var TB_IC = {
    drag: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    kebab: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5.5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="18.5" r="1.8"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="14" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><path d="M17 15l-4-4-7 8"/><line x1="20" y1="3" x2="20" y2="9"/><line x1="17" y1="6" x2="23" y2="6"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9a4 4 0 0 1 0 6"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4"/><path d="M7 9l5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/></svg>',
    calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><circle cx="9" cy="12" r=".6"/><circle cx="12" cy="12" r=".6"/><circle cx="15" cy="12" r=".6"/><circle cx="9" cy="16" r=".6"/><circle cx="12" cy="16" r=".6"/><circle cx="15" cy="16" r=".6"/></svg>',
    branch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10"/><path d="M6 12h10"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>',
  };
  // The builder edits a phase's DRAFT (tbState.phase). Live and old versions are read-only (tbVersionView).
  function tbList(t, ph) { var d = tplDraft(t, ph || tbState.phase); return d ? d.questions : []; }
  // Questions only (Section Breaks aren't counted or numbered).
  function tbQuestions(t, ph) { return tbList(t, ph).filter(function (q) { return q.type !== 'section'; }); }
  // Text in the language being edited: the original, or its translation.
  function tbTx(q, f) { if (!tbState.lang) return q[f] || ''; var tr = (q.tr || {})[tbState.lang] || {}; return tr[f] || ''; }
  function tbSetTx(q, f, v) { if (!tbState.lang) { q[f] = v; return; } q.tr = q.tr || {}; (q.tr[tbState.lang] = q.tr[tbState.lang] || {})[f] = v; }
  function tbOptTx(q, i) { if (!tbState.lang) return q.options[i].text || ''; var tr = ((q.tr || {})[tbState.lang] || {}).options || []; return tr[i] || ''; }
  function tbSetOptTx(q, i, v) {
    if (!tbState.lang) { q.options[i].text = v; return; }
    q.tr = q.tr || {}; var tr = q.tr[tbState.lang] = q.tr[tbState.lang] || {}; (tr.options = tr.options || [])[i] = v;
  }
  function tbMaxScore(q) { var m = null; (q.options || []).forEach(function (o) { if (o.score != null && (m == null || o.score > m)) m = o.score; }); return q.scoring === 'none' ? null : m; }
  function tbFileSize(n) { return n < 1024 * 1024 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }

  function tbCard(t, q, idx, num) {
    var open = tbState.open[q.id], ph = function (f) { return tbState.lang ? ' placeholder="' + esc(q[f] || '') + '"' : ''; };
    var head = '<div class="tb-card-h">' +
      '<span class="tb-drag" data-drag title="Drag to reorder">' + TB_IC.drag + '</span>' +
      '<span class="tb-type">' + TB_TYPES[q.type] + '</span>' + (num ? '<span class="tb-num">Q' + num + '</span>' : '') +
      (open ? '<span class="tb-req" title="Respondents must answer before moving on">Required' + switchHtml(q.required, ' data-req aria-label="Required"') + '</span>'
        : '<button type="button" class="tb-peek" data-toggle title="Open">' + esc(q.title || 'Untitled') + '</button>' + (q.required ? '' : '<span class="tb-opt-tag">Optional</span>')) +
      '<button type="button" class="tb-ic tb-chev" data-toggle aria-expanded="' + !!open + '" aria-label="' + (open ? 'Collapse' : 'Expand') + '">' + TB_IC.chev + '</button>' +
      '<button type="button" class="tb-ic" data-qmenu aria-label="More options">' + TB_IC.kebab + '</button></div>';
    if (!open) return '<div class="tb-card t-' + q.type + ' is-closed" data-q="' + esc(q.id) + '">' + head + '</div>';

    var body = '<input class="tb-title" data-f="title" value="' + esc(tbTx(q, 'title')) + '"' + (tbState.lang ? ph('title') : ' placeholder="' + (q.type === 'section' ? 'Section title' : 'Question') + '"') + '>' +
      '<textarea class="tb-desc" data-f="desc" rows="2"' + (tbState.lang ? ph('desc') : ' placeholder="Description (optional)…"') + '>' + esc(tbTx(q, 'desc')) + '</textarea>';
    if (q.type === 'mc') {
      var correct = q.scoring === 'correct';
      body += '<div class="tb-label">Answer Options' + (correct ? '<span class="tb-label-hint">tap ○ to mark the correct answer</span>' : '') + '</div><div class="tb-opts">' + q.options.map(function (o, i) {
        var mark = correct
          ? '<button type="button" class="tb-radio is-btn' + (o.score === 1 ? ' on' : '') + '" data-correct="' + i + '" aria-pressed="' + (o.score === 1) + '" title="' + (o.score === 1 ? 'The correct answer' : 'Mark as the correct answer') + '"></button>'
          : '<span class="tb-radio" aria-hidden="true"></span>';
        return '<div class="tb-opt">' + mark +
          '<input class="input" data-opt="' + i + '" value="' + esc(tbOptTx(q, i)) + '" placeholder="' + esc(tbState.lang ? o.text : 'Option ' + (i + 1)) + '">' +
          (q.scoring === 'map' ? '<input class="input tb-score" type="number" step="1" data-score="' + i + '" value="' + (o.score == null ? '' : o.score) + '" placeholder="Score" title="Score for this option (blank = not scored)">' : '') +
          '<button type="button" class="tb-ic" data-optimg="' + i + '" title="' + (o.img ? 'Replace image' : 'Add an image to this option') + '">' + TB_IC.img + '</button>' +
          '<button type="button" class="tb-ic" data-optdel="' + i + '" title="Remove option"' + (q.options.length < 2 ? ' disabled' : '') + '>' + TB_IC.x + '</button>' +
          (o.img ? '<span class="tb-optimg"><img src="' + esc(o.img) + '" alt=""></span>' : '') + '</div>';
      }).join('') + '</div><button type="button" class="btn btn-outline btn-sm tb-addopt" data-addopt>+ Add Option</button>' +
      '<div class="tb-row"><div><b>Include “None of the Above”</b><span>Adds a final option that asks for a written answer</span></div>' + switchHtml(q.noneOfAbove, ' data-none aria-label="Include None of the Above"') + '</div>' +
      '<div class="tb-row"><div><b>Timed Question</b>' + (q.timed ? '<span>The respondent has ' + q.seconds + ' seconds to answer</span>' : '') + '</div>' +
        (q.timed ? '<label class="tb-secs">Seconds<input class="input" type="number" min="1" data-secs value="' + q.seconds + '"></label>' : '') + switchHtml(q.timed, ' data-timed aria-label="Timed question"') + '</div>';
    } else if (q.type === 'text') {
      body += '<div class="tb-textans">Short written answer</div>';
    }
    body += '<label class="tb-media-row"><span>' + TB_IC.video + 'Video URL:</span><input class="input" data-f2="videoUrl" value="' + esc(q.videoUrl) + '" placeholder="YouTube or Google Drive link"></label>' +
      '<label class="tb-media-row"><span>' + TB_IC.audio + 'Audio Instructions:</span><input class="input" data-f2="audioUrl" value="' + esc(q.audioUrl) + '" placeholder="URL to audio file for read-aloud instructions"></label>' +
      '<div class="tb-label">Media Attachments</div>' +
      (q.media.length ? '<div class="tb-thumbs">' + q.media.map(function (m, i) {
        return '<div class="tb-thumb">' + (m.kind === 'image' ? '<img src="' + esc(m.url) + '" alt="">' : '<span class="tb-thumb-ic">' + (m.kind === 'video' ? TB_IC.video : TB_IC.audio) + '</span>') +
          '<span class="tb-thumb-cap">' + esc(m.name) + '<br>' + esc(m.size) + '</span><button type="button" class="tb-ic tb-thumb-x" data-mediadel="' + i + '" aria-label="Remove ' + esc(m.name) + '">' + TB_IC.x + '</button></div>';
      }).join('') + '</div>' : '') +
      '<button type="button" class="btn btn-outline btn-sm" data-addmedia>' + TB_IC.upload + 'Add Media</button>';
    if (q.type !== 'section') {
      // Conditional display: only show after an earlier multiple-choice answer.
      var earlier = (tbList(t) || []).slice(0, idx).filter(function (x) { return x.type === 'mc'; });
      var c = q.cond || {}, src = earlier.find(function (x) { return x.id === c.q; });
      body += '<details class="tb-fold"' + (q.cond ? ' open' : '') + '><summary>' + TB_IC.branch + 'Conditional Display' + (q.cond ? '<span class="tb-badge">On</span>' : '') + '</summary><div class="tb-fold-b">' +
        (earlier.length ? '<label class="tb-cond">Show this question only if <select class="select" data-condq><option value="">— always show —</option>' +
            earlier.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === c.q ? ' selected' : '') + '>' + esc(x.title || 'Untitled') + '</option>'; }).join('') + '</select></label>' +
          (src ? '<label class="tb-cond">is answered <select class="select" data-condo>' + src.options.map(function (o, i) { return '<option value="' + i + '"' + (i === c.opt ? ' selected' : '') + '>' + esc(o.text || 'Option ' + (i + 1)) + '</option>'; }).join('') + '</select></label>' : '')
          : '<p class="tl-muted">Add a multiple-choice question above this one to show it conditionally.</p>') + '</div></details>' +
        '<details class="tb-fold"><summary>' + TB_IC.calc + 'Scoring Rule<span class="tb-badge" title="' + esc(TB_SCORING_TIP[q.scoring]) + '">' + TB_SCORING[q.scoring] + '</span></summary><div class="tb-fold-b">' +
          (q.type === 'mc' ? '<label class="tb-cond">Rule <select class="select" data-scoring>' + Object.keys(TB_SCORING).map(function (k) { return '<option value="' + k + '"' + (q.scoring === k ? ' selected' : '') + '>' + TB_SCORING[k] + '</option>'; }).join('') + '</select></label>' +
            '<p class="tl-muted">' + esc(TB_SCORING_TIP[q.scoring]) + (tbMaxScore(q) != null ? ' Highest score: ' + tbMaxScore(q) + '.' : '') + '</p>'
            : '<p class="tl-muted">Written answers aren’t scored.</p>') + '</div></details>' +
        '<div class="tb-label">Skills Evaluated</div><div class="tb-skills">' + TB_SKILLS.map(function (k) {
          var on = q.skills.indexOf(k) >= 0;
          return '<button type="button" class="tb-skill' + (on ? ' on' : '') + '" data-skill="' + esc(k) + '" aria-pressed="' + on + '">' + esc(k) + '</button>';
        }).join('') + '</div>';
    }
    return '<div class="tb-card t-' + q.type + '" data-q="' + esc(q.id) + '">' + head + '<div class="tb-body">' + body + '</div></div>';
  }

  // An empty draft: offer to start from a copy of another phase (its live version, else its draft).
  function tbEmptyVersion(t) {
    var from = TPL_PHASE_LIST.filter(function (ph) { var src = tplLive(t, ph) || tplDraft(t, ph); return ph !== tbState.phase && src && src.questions.length; });
    if (!from.length) return '<div class="ui-empty">No questions yet — add the first one below.</div>';
    return '<div class="tb-empty"><b>' + esc(tbState.phase) + ' has no questions yet.</b>' +
      '<span>Start from a copy of another phase — you can change it freely afterwards, and the original stays as it is.</span>' +
      '<div class="tb-empty-act">' + from.map(function (ph) {
        var lv = tplLive(t, ph), n = tplCountQ((lv || tplDraft(t, ph)).questions);
        return '<button type="button" class="btn btn-outline btn-sm" data-copyfrom="' + ph + '">Copy from ' + ph + (lv ? ' v' + lv.v : ' draft') + ' · ' + n + ' question' + (n === 1 ? '' : 's') + '</button>';
      }).join('') + '</div><span class="tb-empty-or">or add the first question below</span></div>';
  }

  // Scoring Configuration tab: what each skill is built from.
  function tbScoringView(t) {
    var qs = tbQuestions(t), by = {}, unscored = [];
    qs.forEach(function (q, i) {
      var m = tbMaxScore(q);
      if (m == null || !q.skills.length) { unscored.push('Q' + (i + 1) + ' ' + (q.title || 'Untitled')); return; }
      q.skills.forEach(function (k) { var r = by[k] || (by[k] = { n: 0, max: 0 }); r.n++; r.max += m; });
    });
    var rows = TB_SKILLS.filter(function (k) { return by[k]; }).map(function (k) { return '<tr><td class="name">' + esc(k) + '</td><td>' + by[k].n + '</td><td>' + by[k].max + '</td></tr>'; }).join('');
    var total = Object.keys(by).reduce(function (n, k) { return n + by[k].max; }, 0);
    return '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Skills and scores</h3><p class="ui-mod-note">Worked out from each question’s options, scoring rule and skills. Highest possible total: <b>' + total + '</b>.</p></div></div>' +
      (rows ? '<div class="ui-tablewrap"><table class="ui-table"><thead><tr><th>Skill</th><th>Questions</th><th>Highest score</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div class="ui-empty">No scored questions yet.</div>') + '</div>' +
      (unscored.length ? '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Not scored (' + unscored.length + ')</h3><p class="ui-mod-note">No scoring rule, no option scores or no skills picked.</p></div></div><ul class="tb-unscored">' + unscored.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '');
  }

  // #/template?id=          → pick a phase (tbPhasePicker)
  // #/template?id=&phase=    → that phase's draft in the builder; no draft → its live version, read-only
  // #/template?id=&phase=&v= → one published version, read-only (tbVersionView)
  SCREEN.template = function (params, body) {
    var t = ORG.templates.find(function (x) { return x.id === params.id; });
    if (!t) { body.innerHTML = crumbs([{ label: 'Templates', screen: 'templates' }, { label: 'Not found' }]) + '<div class="ui-empty">That template no longer exists.</div>'; wireCrumbs(body); return; }
    if (tbState.id !== t.id) tbState = { id: t.id, phase: null, tab: 'questions', lang: null, open: {} };
    if (!t.langs) t.langs = [];
    var ph = TPL_PHASE_LIST.indexOf(params.phase) >= 0 ? params.phase : null;
    if (!ph) { tbPhasePicker(t, body); return; }
    tbState.phase = ph;
    var draft = tplDraft(t, ph);
    if (params.v || !draft) { if (params.v || tplLive(t, ph)) { tbVersionView(t, ph, params.v ? +params.v : tplLive(t, ph).v, body); return; } go('template', { id: t.id }); return; }
    tbList(t).forEach(function (q, i) { if (tbState.open[q.id] == null) tbState.open[q.id] = i < TB_OPEN_FIRST; });
    var qs = tbList(t), n = 0, slot = ORG.server.slotOf(t, ph), lv = tplLive(t, ph), nextV = slot.versions.length + 1;
    // A small + between cards inserts a question at that spot.
    var cards = qs.map(function (q, i) {
      return (i ? '<div class="tb-ins"><button type="button" class="tb-ins-btn" data-ins="' + i + '" title="Add a question here" aria-label="Add a question between ' + (i) + ' and ' + (i + 1) + '">+</button></div>' : '') +
        tbCard(t, q, i, q.type === 'section' ? 0 : ++n);
    }).join('');
    var langs = '<div class="tb-langs"><button type="button" class="tb-lang' + (!tbState.lang ? ' on' : '') + '" data-lang="">English (Original)</button>' +
      t.langs.map(function (l) { return '<button type="button" class="tb-lang' + (tbState.lang === l ? ' on' : '') + '" data-lang="' + esc(l) + '">' + esc(l) + '</button>'; }).join('') +
      '<button type="button" class="tb-addlang" data-addlang>+ Add Language</button></div>';
    var allOpen = qs.length && qs.every(function (q) { return tbState.open[q.id]; });
    var basis = slot.draft.restoredFrom ? 'Restored from v' + slot.draft.restoredFrom + '. ' : slot.draft.from ? 'Based on v' + slot.draft.from + '. ' : '';
    body.innerHTML =
      '<div class="tb-head"><button type="button" class="tb-ic tb-back" data-back aria-label="Back to the phases" title="Back to ' + esc(t.title) + '">' + TB_IC.back + '</button>' +
        '<div class="tb-head-txt"><span class="tb-crumb">' + esc(t.title) + '</span>' +
          '<h1 class="tb-h1">' + ph + ' <span class="tl-phpill st-draft">Draft v' + nextV + '</span></h1>' +
          '<span class="tb-sub">' + esc(basis) + (lv ? 'v' + lv.v + ' stays live — schools keep using it until you publish.' : 'Nothing is live for ' + ph + ' yet — publish to make it deployable.') +
            ' <span class="tb-saved" id="tb-saved"></span></span></div>' +
        '<div class="tb-head-act"><button type="button" class="btn btn-outline btn-sm" data-csv>' + TB_IC.download + 'Download CSV</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-preview>' + TB_IC.eye + 'Preview</button>' +
          (slot.versions.length ? '<button type="button" class="btn btn-outline btn-sm" data-history>History (' + slot.versions.length + ')</button>' : '') +
          (t.archived ? '' : '<button type="button" class="btn btn-primary btn-sm" data-publish title="Make this draft v' + nextV + ', live for new deployments">Publish v' + nextV + '</button>') +
          '<button type="button" class="tb-ic" data-more aria-label="More actions" title="Discard this draft">' + TB_IC.kebab + '</button></div></div>' +
      '<div class="tb-tabs" role="tablist"><button type="button" role="tab" class="tb-tab' + (tbState.tab === 'questions' ? ' on' : '') + '" data-tbtab="questions" aria-selected="' + (tbState.tab === 'questions') + '">Questions</button>' +
        '<button type="button" role="tab" class="tb-tab' + (tbState.tab === 'scoring' ? ' on' : '') + '" data-tbtab="scoring" aria-selected="' + (tbState.tab === 'scoring') + '">Scoring Configuration</button></div>' +
      (tbState.tab === 'scoring' ? tbScoringView(t) :
        '<div class="tb-tools">' + langs + (qs.length ? '<button type="button" class="btn-link" data-openall="' + (allOpen ? 0 : 1) + '">' + (allOpen ? 'Collapse all' : 'Expand all') + '</button>' : '') + '</div>' +
        (tbState.lang ? '<div class="tl-filterbanner">Translating into <b>' + esc(tbState.lang) + '</b> — type over the English shown in each field. Options, scores and settings are shared with the original.</div>' : '') +
        '<div class="tb-list" id="tb-list">' + (cards || tbEmptyVersion(t)) + '</div>' +
        '<div class="tb-add"><span>Add</span><button type="button" class="btn btn-outline btn-sm" data-addq="mc">Multiple Choice</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-addq="text">Short Answer</button><button type="button" class="btn btn-outline btn-sm" data-addq="section">Section Break</button></div>') +
      '<input type="file" id="tb-file" hidden>';
    tbWire(t, params, body);
  };

  // Step 1 of opening a template: pick the phase.
  function tbPhasePicker(t, body) {
    var cards = TPL_PHASE_LIST.map(function (ph) {
      var slot = ORG.server.slotOf(t, ph), lv = tplLive(t, ph), dr = slot.draft;
      var lines = (lv ? '<div class="tb-pc-line"><span class="tl-phpill st-live">Live v' + lv.v + '</span>' + tplCountQ(lv.questions) + ' questions · published ' + esc(fmtMs(lv.publishedAt)) + ' by ' + esc(lv.publishedBy) + '</div>' : '') +
        (dr ? '<div class="tb-pc-line"><span class="tl-phpill st-draft">Draft v' + (slot.versions.length + 1) + '</span>' + tplCountQ(dr.questions) + ' questions · edited ' + esc(fmtMs(dr.updatedAt)) + ' by ' + esc(dr.updatedBy) + '</div>' : '') +
        (!lv && !dr ? '<div class="tb-pc-line tl-muted">Not set up yet.</div>' : '');
      var main = dr ? '<button type="button" class="btn btn-primary btn-sm" data-pc-open="' + ph + '">Continue draft</button>'
        : lv ? '<button type="button" class="btn btn-primary btn-sm" data-pc-edit="' + ph + '" title="Start a draft from v' + lv.v + ' — v' + lv.v + ' stays live until you publish">Edit</button>'
        : '<button type="button" class="btn btn-primary btn-sm" data-pc-edit="' + ph + '">Set up ' + ph + '</button>';
      return '<div class="tb-pcard st-' + (lv ? 'live' : dr ? 'draft' : 'none') + '"><h3 class="tb-pc-h">' + ph + '</h3>' + lines +
        '<div class="tb-pc-act">' + main + (lv ? '<button type="button" class="btn btn-outline btn-sm" data-pc-view="' + ph + '">View v' + lv.v + '</button>' : '') +
        (slot.versions.length ? '<button type="button" class="btn-link" data-pc-hist="' + ph + '">History (' + slot.versions.length + ')</button>' : '') + '</div></div>';
    }).join('');
    body.innerHTML = crumbs([{ label: 'Templates', screen: 'templates' }, { label: t.title }]) +
      screenHead(t.title, t.desc || '', '<button class="btn btn-outline btn-sm" id="tp-more" title="Duplicate, archive or delete">More ⋮</button>' +
        '<button class="btn btn-outline btn-sm" id="tp-edit" title="Name, audience and description">Edit details</button>') +
      '<div class="tl-tm-chips">' + audChip(t.audience) + '<span class="tl-tm-phase">' + esc(whereText(t.audience)) + '</span>' + (t.archived ? statusPill('Archived', 'muted') : '') + '</div>' +
      '<p class="tb-pc-intro">Which phase do you want to work on? Each phase has its own questions and its own versions.</p>' +
      '<div class="tb-pcards">' + cards + '</div>' +
      '<p class="tl-muted tb-pc-note">Publishing a new version never changes a window that’s already running — it keeps the version it started with. New windows get the newest live version.</p>';
    wireCrumbs(body);
    body.querySelector('#tp-edit').addEventListener('click', function () { openTemplateEditor(t); });
    body.querySelector('#tp-more').addEventListener('click', function () { openTemplateMenu(t.id); });
    body.querySelectorAll('[data-pc-open]').forEach(function (b) { b.addEventListener('click', function () { go('template', { id: t.id, phase: b.dataset.pcOpen }); }); });
    body.querySelectorAll('[data-pc-edit]').forEach(function (b) { b.addEventListener('click', function () { ORG.server.startDraft(t.id, b.dataset.pcEdit, me.name); go('template', { id: t.id, phase: b.dataset.pcEdit }); }); });
    body.querySelectorAll('[data-pc-view]').forEach(function (b) { b.addEventListener('click', function () { go('template', { id: t.id, phase: b.dataset.pcView, v: tplLive(t, b.dataset.pcView).v }); }); });
    body.querySelectorAll('[data-pc-hist]').forEach(function (b) { b.addEventListener('click', function () { tbHistory(t, b.dataset.pcHist); }); });
  }
  // Every version of one phase, newest first: open a draft, view, or restore an old one.
  function tbHistory(t, ph) {
    var slot = ORG.server.slotOf(t, ph), lv = tplLive(t, ph);
    var rows = (slot.draft ? '<div class="tb-hist-row"><span class="tl-phpill st-draft">Draft v' + (slot.versions.length + 1) + '</span><span>Edited ' + esc(fmtMs(slot.draft.updatedAt)) + ' by ' + esc(slot.draft.updatedBy) + '</span>' +
        '<button type="button" class="btn-link" data-h-open>Open</button></div>' : '') +
      slot.versions.slice().reverse().map(function (x) {
        var live = lv && x.v === lv.v;
        return '<div class="tb-hist-row"><span class="tl-phpill st-' + (live ? 'live' : 'none') + '">v' + x.v + (live ? ' · Live' : ' · Retired') + '</span>' +
          '<span>' + tplCountQ(x.questions) + ' questions · published ' + esc(fmtMs(x.publishedAt)) + ' by ' + esc(x.publishedBy) + (x.note ? ' · ' + esc(x.note) : '') + '</span>' +
          '<button type="button" class="btn-link" data-h-view="' + x.v + '">View</button>' + (live ? '' : '<button type="button" class="btn-link" data-h-restore="' + x.v + '">Restore</button>') + '</div>';
      }).join('');
    openModal(t.title + ' · ' + ph + ' history', '<div class="tb-hist">' + (rows || '<div class="ui-empty">Nothing published yet.</div>') + '</div>', null);
    var close = function () { document.getElementById('tl-modal-root').innerHTML = ''; };
    var ho = document.querySelector('[data-h-open]'); if (ho) ho.addEventListener('click', function () { close(); go('template', { id: t.id, phase: ph }); });
    document.querySelectorAll('[data-h-view]').forEach(function (b) { b.addEventListener('click', function () { close(); go('template', { id: t.id, phase: ph, v: +b.dataset.hView }); }); });
    document.querySelectorAll('[data-h-restore]').forEach(function (b) { b.addEventListener('click', function () { close(); tbRestore(t, ph, +b.dataset.hRestore); }); });
  }
  function tbRestore(t, ph, v) {
    var slot = ORG.server.slotOf(t, ph);
    gated({ title: 'Restore ' + ph + ' v' + v + '?', confirmLabel: 'Restore as draft',
      body: '<p>A copy of v' + v + ' becomes the ' + ph + ' draft' + (slot.draft ? ', <b>replacing the draft in progress</b>' : '') + '. Nothing changes for schools until you publish it.</p>',
      audit: { action: 'template.restore', entity: t.title + ' · ' + ph + ' v' + v, entityType: 'template' },
      onConfirm: function () { ORG.server.restoreVersion(t.id, ph, v, me.name); toast('v' + v + ' restored as a draft.'); go('template', { id: t.id, phase: ph }); } });
  }
  // One published version, read-only: what respondents get, with scores and skills.
  function tbVersionView(t, ph, v, body) {
    var slot = ORG.server.slotOf(t, ph), ver = slot.versions.find(function (x) { return x.v === v; }), lv = tplLive(t, ph);
    if (!ver) { go('template', { id: t.id }); return; }
    var live = lv && lv.v === v, n = 0;
    var qs = ver.questions.map(function (q) {
      if (q.type === 'section') return '<div class="tb-ro-sec"><h4>' + esc(q.title) + '</h4>' + (q.desc ? '<p>' + esc(q.desc) + '</p>' : '') + '</div>';
      var opts = q.type === 'mc' ? '<ul class="tb-ro-opts">' + q.options.map(function (o) {
        var mark = q.scoring === 'correct' ? (o.score === 1 ? ' <span class="ui-chip ok">Correct</span>' : '') : (q.scoring === 'map' && o.score != null ? ' <span class="tb-ro-score">' + o.score + '</span>' : '');
        return '<li>' + esc(o.text) + mark + '</li>'; }).join('') + '</ul>' : '<div class="tb-textans">Short written answer</div>';
      return '<div class="tb-ro-q"><b>Q' + (++n) + ' · ' + esc(q.title) + '</b>' + (q.desc ? '<p>' + esc(q.desc) + '</p>' : '') + opts +
        '<div class="tb-ro-meta">' + [TB_SCORING[q.scoring], q.timed ? '⏱ ' + q.seconds + 's' : '', q.required ? '' : 'Optional', q.cond ? 'Conditional' : ''].filter(Boolean).map(esc).join(' · ') +
        (q.skills.length ? ' · ' + q.skills.map(esc).join(', ') : '') + '</div></div>';
    }).join('');
    var act = live ? (slot.draft ? '<button type="button" class="btn btn-primary btn-sm" data-vv-draft>Continue draft</button>' : '<button type="button" class="btn btn-primary btn-sm" data-vv-edit title="Start a draft from v' + v + ' — it stays live until you publish">Edit</button>')
      : '<button type="button" class="btn btn-primary btn-sm" data-vv-restore>Restore as draft</button>';
    body.innerHTML =
      '<div class="tb-head"><button type="button" class="tb-ic tb-back" data-back aria-label="Back to the phases" title="Back to ' + esc(t.title) + '">' + TB_IC.back + '</button>' +
        '<div class="tb-head-txt"><span class="tb-crumb">' + esc(t.title) + '</span>' +
          '<h1 class="tb-h1">' + ph + ' <span class="tl-phpill st-' + (live ? 'live' : 'none') + '">v' + v + (live ? ' · Live' : ' · Retired') + '</span></h1>' +
          '<span class="tb-sub">Published ' + esc(fmtMs(ver.publishedAt)) + ' by ' + esc(ver.publishedBy) + (ver.note ? ' · ' + esc(ver.note) : '') + ' · read-only</span></div>' +
        '<div class="tb-head-act"><button type="button" class="btn btn-outline btn-sm" data-history>History (' + slot.versions.length + ')</button>' + act + '</div></div>' +
      '<div class="tb-ro">' + (qs || '<div class="ui-empty">This version has no questions.</div>') + '</div>';
    body.querySelector('[data-back]').addEventListener('click', function () { go('template', { id: t.id }); });
    body.querySelector('[data-history]').addEventListener('click', function () { tbHistory(t, ph); });
    var e1 = body.querySelector('[data-vv-edit]'); if (e1) e1.addEventListener('click', function () { ORG.server.startDraft(t.id, ph, me.name); go('template', { id: t.id, phase: ph }); });
    var e2 = body.querySelector('[data-vv-draft]'); if (e2) e2.addEventListener('click', function () { go('template', { id: t.id, phase: ph }); });
    var e3 = body.querySelector('[data-vv-restore]'); if (e3) e3.addEventListener('click', function () { tbRestore(t, ph, v); });
  }

  function tbWire(t, params, body) {
    var redraw = function () { SCREEN.template(params, body); };
    var savedT = null;
    function saved() {
      ORG.server.touchTemplate(t, me.name);
      var d = tplDraft(t, tbState.phase); if (d) { d.updatedAt = Date.now(); d.updatedBy = me.name; }
      // One audit entry per editing visit, not one per keystroke.
      if (!tbState.logged) { tbState.logged = true; ORG.server.logAudit(me.name, 'template.edit', t.title, 'template'); }
      var el = body.querySelector('#tb-saved'); if (el) { el.textContent = 'Saved'; clearTimeout(savedT); savedT = setTimeout(function () { el.textContent = ''; }, 1500); }
    }
    var qOf = function (el) { var c = el.closest('[data-q]'); return c ? tbList(t).find(function (q) { return q.id === c.dataset.q; }) : null; };
    var qIdx = function (q) { return tbList(t).indexOf(q); };

    var ph = tbState.phase, slot = ORG.server.slotOf(t, ph), nextV = slot.versions.length + 1, lv = tplLive(t, ph);
    body.querySelector('[data-back]').addEventListener('click', function () { go('template', { id: t.id }); });
    var hb = body.querySelector('[data-history]'); if (hb) hb.addEventListener('click', function () { tbHistory(t, ph); });
    body.querySelector('[data-more]').addEventListener('click', function (e) {
      closeItemMenu();
      var pop = document.createElement('div'); pop.className = 'ui-menu dep-pop';
      pop.innerHTML = '<button type="button" class="ui-menu-item danger" data-a="discard">Discard this draft</button>';
      document.body.appendChild(pop); TL_POP = pop;
      var r = e.currentTarget.getBoundingClientRect();
      pop.style.top = (window.scrollY + r.bottom + 6) + 'px'; pop.style.left = Math.max(8, window.scrollX + r.right - pop.offsetWidth) + 'px';
      pop.addEventListener('click', function () {
        closeItemMenu();
        gated({ title: 'Discard the ' + ph + ' draft?', danger: true, confirmLabel: 'Discard draft',
          body: '<p>Your unpublished changes to <b>' + esc(t.title) + ' · ' + ph + '</b> are thrown away.' + (lv ? ' v' + lv.v + ' stays live.' : '') + '</p>',
          audit: { action: 'template.discard', entity: t.title + ' · ' + ph, entityType: 'template' },
          onConfirm: function () { ORG.server.discardDraft(t.id, ph, me.name); toast('Draft discarded.'); go('template', { id: t.id }); } });
      });
      setTimeout(function () { document.addEventListener('mousedown', onPopOutside); document.addEventListener('keydown', onPopKey); }, 0);
    });
    var pb = body.querySelector('[data-publish]'); if (pb) pb.addEventListener('click', function () {
      if (!tbQuestions(t).length) { toast('Add at least one question before publishing.'); return; }
      gated({ title: 'Publish ' + ph + ' v' + nextV + '?', confirmLabel: 'Publish v' + nextV,
        body: '<p><b>' + esc(t.title) + ' · ' + ph + ' v' + nextV + '</b> becomes the live version for new deployments.</p>' +
          (lv ? '<p class="tl-muted">Windows already running keep v' + lv.v + ' until they end, so every child in a window answers the same questions. v' + lv.v + ' moves to History.</p>' : ''),
        audit: { action: 'template.publish', entity: t.title + ' · ' + ph + ' v' + nextV, entityType: 'template' },
        onConfirm: function () { ORG.server.publishDraft(t.id, ph, me.name); toast(ph + ' v' + nextV + ' is live.'); go('template', { id: t.id }); } });
    });
    body.querySelector('[data-csv]').addEventListener('click', function () {
      var n = 0;
      downloadCsv((t.title + ' ' + tbState.phase + ' draft').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-questions.csv', ['#', 'Type', 'Question', 'Description', 'Options (score)', 'Required', 'Timed (s)', 'Scoring', 'Skills', 'Shown if'],
        tbList(t).map(function (q) {
          var src = q.cond && tbList(t).find(function (x) { return x.id === q.cond.q; });
          return [q.type === 'section' ? '' : 'Q' + (++n), TB_TYPES[q.type], q.title, q.desc, (q.options || []).map(function (o) { return o.text + (o.score == null ? '' : ' (' + o.score + ')'); }).join(' | '),
            q.required ? 'Yes' : 'No', q.timed ? q.seconds : '', q.type === 'section' ? '' : TB_SCORING[q.scoring], q.skills.join(' | '),
            src ? src.title + ' = ' + ((src.options[q.cond.opt] || {}).text || '') : ''];
        }));
    });
    body.querySelector('[data-preview]').addEventListener('click', function () {
      var n = 0;
      openModal('Preview · ' + t.title + ' · ' + tbState.phase, '<div class="tb-pv">' + tbList(t).map(function (q) {
        var title = esc(tbTx(q, 'title') || q.title), desc = tbTx(q, 'desc') || q.desc;
        if (q.type === 'section') return '<div class="tb-pv-sec"><h4>' + title + '</h4>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</div>';
        var opts = q.type === 'mc' ? '<div class="tb-pv-opts">' + q.options.concat(q.noneOfAbove ? [{ text: 'None of the above' }] : []).map(function (o, i) {
          return '<label><input type="radio" name="pv-' + esc(q.id) + '"> ' + esc((i < q.options.length ? tbOptTx(q, i) : '') || o.text) + '</label>'; }).join('') + '</div>'
          : '<input class="input" placeholder="Type your answer">';
        return '<div class="tb-pv-q"><b>' + (++n) + '. ' + title + (q.required ? ' <span class="tb-pv-req">*</span>' : '') + '</b>' + (desc ? '<p>' + esc(desc) + '</p>' : '') +
          (q.timed ? '<span class="ui-chip info">⏱ ' + q.seconds + 's</span>' : '') + (q.cond ? '<span class="ui-chip muted">Conditional</span>' : '') + opts + '</div>';
      }).join('') + '</div>', null);
    });
    body.querySelectorAll('[data-copyfrom]').forEach(function (b) { b.addEventListener('click', function () {
      var src = b.dataset.copyfrom;
      ORG.server.copyPhaseIntoDraft(t.id, ph, src, me.name);
      ORG.server.logAudit(me.name, 'template.copyversion', t.title + ': ' + src + ' → ' + ph, 'template');
      saved(); toast('Copied ' + tbQuestions(t, ph).length + ' questions from ' + src + ' into ' + ph + '.'); redraw();
    }); });
    body.querySelectorAll('[data-tbtab]').forEach(function (b) { b.addEventListener('click', function () { tbState.tab = b.dataset.tbtab; redraw(); }); });
    body.querySelectorAll('[data-lang]').forEach(function (b) { b.addEventListener('click', function () { tbState.lang = b.dataset.lang || null; redraw(); }); });
    var al = body.querySelector('[data-addlang]'); if (al) al.addEventListener('click', function () {
      var left = TB_LANGS.filter(function (l) { return t.langs.indexOf(l) < 0; });
      if (!left.length) { toast('Every language is already added.'); return; }
      openModal('Add a language', '<p class="tl-muted">Translate this template’s text. Options, scores and settings stay shared.</p><label class="field">Language<select class="select" id="tb-newlang">' +
        left.map(function (l) { return '<option>' + esc(l) + '</option>'; }).join('') + '</select></label>', function (close) {
          var l = document.getElementById('tb-newlang').value; t.langs.push(l); tbState.lang = l; saved(); close(); redraw();
        }, 'Add language');
    });
    var oa = body.querySelector('[data-openall]'); if (oa) oa.addEventListener('click', function () { var on = oa.dataset.openall === '1'; tbList(t).forEach(function (q) { tbState.open[q.id] = on; }); redraw(); });
    body.querySelectorAll('[data-addq]').forEach(function (b) { b.addEventListener('click', function () {
      var q = ORG.server.newQuestion(t.id + '-n' + Date.now(), b.dataset.addq); tbList(t).push(q); tbState.open[q.id] = true; saved(); redraw();
      var c = body.querySelector('[data-q="' + q.id + '"]'); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); var ti = c.querySelector('.tb-title'); if (ti) ti.focus(); }
    }); });

    var list = body.querySelector('#tb-list'); if (!list) return;
    // Text: patch in place (no redraw → the caret stays put).
    list.addEventListener('input', function (e) {
      var el = e.target, q = qOf(el); if (!q) return;
      if (el.dataset.f) tbSetTx(q, el.dataset.f, el.value);
      else if (el.dataset.f2) q[el.dataset.f2] = el.value.trim();
      else if (el.dataset.opt != null) tbSetOptTx(q, +el.dataset.opt, el.value);
      else if (el.dataset.score != null) q.options[+el.dataset.score].score = el.value === '' ? null : +el.value;
      else if (el.hasAttribute('data-secs')) q.seconds = Math.max(1, +el.value || 1);
      else return;
      saved();
    });
    list.addEventListener('change', function (e) {
      var el = e.target, q = qOf(el); if (!q) return;
      if (el.hasAttribute('data-req')) q.required = el.checked;
      else if (el.hasAttribute('data-none')) q.noneOfAbove = el.checked;
      else if (el.hasAttribute('data-timed')) q.timed = el.checked;
      else if (el.hasAttribute('data-condq')) q.cond = el.value ? { q: el.value, opt: 0 } : null;
      else if (el.hasAttribute('data-condo')) q.cond.opt = +el.value;
      else if (el.hasAttribute('data-scoring')) {
        if (el.value === 'correct' && q.scoring !== 'correct') {
          var best = -1, bs = null; q.options.forEach(function (o, i) { if (o.score != null && (bs == null || o.score > bs)) { bs = o.score; best = i; } });
          q.options.forEach(function (o, i) { o.score = i === best ? 1 : 0; });
        }
        q.scoring = el.value;
      }
      else return;
      saved(); redraw();
    });
    list.addEventListener('click', function (e) {
      var el = e.target.closest('button'); if (!el) return;
      if (el.dataset.ins != null) { tbInsertMenu(el, t, +el.dataset.ins, saved, redraw, body); return; }
      var q = qOf(el); if (!q) return;
      if (el.hasAttribute('data-toggle')) { tbState.open[q.id] = !tbState.open[q.id]; redraw(); return; }
      if (el.hasAttribute('data-addopt')) { q.options.push({ text: '', score: null }); saved(); redraw(); var ins = body.querySelectorAll('[data-q="' + q.id + '"] [data-opt]'); if (ins.length) ins[ins.length - 1].focus(); return; }
      if (el.dataset.correct != null) { q.options.forEach(function (o, i) { o.score = i === +el.dataset.correct ? 1 : 0; }); saved(); redraw(); return; }
      if (el.dataset.optdel != null) { q.options.splice(+el.dataset.optdel, 1); if (q.cond) q.cond.opt = 0; saved(); redraw(); return; }
      if (el.dataset.skill) { var k = el.dataset.skill, at = q.skills.indexOf(k); if (at >= 0) q.skills.splice(at, 1); else q.skills.push(k); saved(); redraw(); return; }
      if (el.dataset.mediadel != null) { q.media.splice(+el.dataset.mediadel, 1); saved(); redraw(); return; }
      if (el.hasAttribute('data-addmedia') || el.dataset.optimg != null) {
        var f = body.querySelector('#tb-file'), forOpt = el.dataset.optimg;
        f.accept = forOpt != null ? 'image/*' : 'image/*,video/*,audio/*'; f.value = '';
        f.onchange = function () {
          var file = f.files && f.files[0]; if (!file) return;
          var url = URL.createObjectURL(file);   // local preview only — not uploaded in the prototype
          if (forOpt != null) q.options[+forOpt].img = url;
          else q.media.push({ name: file.name, size: tbFileSize(file.size), url: url, kind: /^video/.test(file.type) ? 'video' : /^audio/.test(file.type) ? 'audio' : 'image' });
          saved(); redraw();
        };
        f.click(); return;
      }
      if (el.hasAttribute('data-qmenu')) { tbQuestionMenu(el, t, q, saved, redraw); }
    });
    // Drag a card by its handle to reorder.
    var dragId = null;
    list.addEventListener('mousedown', function (e) { var h = e.target.closest('[data-drag]'); if (h) h.closest('.tb-card').setAttribute('draggable', 'true'); });
    list.addEventListener('dragstart', function (e) { var c = e.target.closest('.tb-card'); if (!c) return; dragId = c.dataset.q; c.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {} });
    list.addEventListener('dragover', function (e) { if (!dragId) return; e.preventDefault(); var c = e.target.closest('.tb-card'); list.querySelectorAll('.drop-before').forEach(function (x) { x.classList.remove('drop-before'); }); if (c && c.dataset.q !== dragId) c.classList.add('drop-before'); });
    list.addEventListener('drop', function (e) {
      e.preventDefault(); var c = e.target.closest('.tb-card'); if (!dragId || !c || c.dataset.q === dragId) return;
      var from = tbList(t).findIndex(function (q) { return q.id === dragId; }), moving = tbList(t).splice(from, 1)[0];
      tbList(t).splice(tbList(t).findIndex(function (q) { return q.id === c.dataset.q; }), 0, moving);
      dragId = null; saved(); redraw();
    });
    list.addEventListener('dragend', function () { dragId = null; list.querySelectorAll('.tb-card').forEach(function (x) { x.removeAttribute('draggable'); x.classList.remove('dragging', 'drop-before'); }); });
  }
  // + between cards: pick a type, insert it at that position, open and focus it.
  function tbInsertMenu(btn, t, at, saved, redraw, body) {
    closeItemMenu();
    var pop = document.createElement('div'); pop.className = 'ui-menu dep-pop';
    pop.innerHTML = '<div class="ui-eyebrow dep-pop-h">Add here</div>' + Object.keys(TB_TYPES).map(function (k) { return '<button type="button" class="ui-menu-item" data-type="' + k + '">' + TB_TYPES[k] + '</button>'; }).join('');
    document.body.appendChild(pop); TL_POP = pop;
    var r = btn.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px'; pop.style.left = Math.max(8, window.scrollX + r.left + r.width / 2 - pop.offsetWidth / 2) + 'px';
    pop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-type]'); if (!b) return;
      closeItemMenu();
      var q = ORG.server.newQuestion(t.id + '-n' + Date.now(), b.dataset.type);
      tbList(t).splice(at, 0, q); tbState.open[q.id] = true; saved(); redraw();
      var c = body.querySelector('[data-q="' + q.id + '"]'); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); var ti = c.querySelector('.tb-title'); if (ti) ti.focus(); }
    });
    setTimeout(function () { document.addEventListener('mousedown', onPopOutside); document.addEventListener('keydown', onPopKey); }, 0);
  }
  // ⋮ on a question: duplicate, move, change type, delete.
  function tbQuestionMenu(btn, t, q, saved, redraw) {
    closeItemMenu();
    var i = tbList(t).indexOf(q), last = tbList(t).length - 1;
    var pop = document.createElement('div'); pop.className = 'ui-menu dep-pop';
    pop.innerHTML = '<button type="button" class="ui-menu-item" data-a="dup">Duplicate</button>' +
      '<button type="button" class="ui-menu-item" data-a="up"' + (i <= 0 ? ' disabled' : '') + '>↑ Move up</button>' +
      '<button type="button" class="ui-menu-item" data-a="down"' + (i >= last ? ' disabled' : '') + '>↓ Move down</button><div class="dep-pop-sep"></div>' +
      Object.keys(TB_TYPES).filter(function (k) { return k !== q.type; }).map(function (k) { return '<button type="button" class="ui-menu-item" data-a="type:' + k + '">Change to ' + TB_TYPES[k] + '</button>'; }).join('') +
      '<div class="dep-pop-sep"></div><button type="button" class="ui-menu-item danger" data-a="del">Delete</button>';
    document.body.appendChild(pop); TL_POP = pop;
    var r = btn.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px'; pop.style.left = Math.max(8, window.scrollX + r.right - pop.offsetWidth) + 'px';
    pop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      var a = b.dataset.a; closeItemMenu();
      if (a === 'dup') { var c = JSON.parse(JSON.stringify(q)); c.id = t.id + '-n' + Date.now(); tbList(t).splice(i + 1, 0, c); tbState.open[c.id] = true; }
      else if (a === 'up' || a === 'down') { var j = a === 'up' ? i - 1 : i + 1; tbList(t)[i] = tbList(t)[j]; tbList(t)[j] = q; }
      else if (a.indexOf('type:') === 0) {
        q.type = a.slice(5);
        if (q.type === 'mc' && !q.options.length) q.options = [{ text: '', score: null }];
        if (q.type !== 'mc') q.scoring = 'none'; else if (q.scoring === 'none') q.scoring = 'map';
      }
      else if (a === 'del') {
        if (!confirm('Delete this ' + TB_TYPES[q.type].toLowerCase() + '?\n\n“' + (q.title || 'Untitled') + '”')) return;
        tbList(t).splice(i, 1);
        tbList(t).forEach(function (x) { if (x.cond && x.cond.q === q.id) x.cond = null; });   // nothing can depend on a deleted question
      }
      saved(); redraw();
    });
    setTimeout(function () { document.addEventListener('mousedown', onPopOutside); document.addEventListener('keydown', onPopKey); }, 0);
  }
  // After an edit from the template page, stay on it; from the list, back to the list.
  function tplAfterChange() { if (currentRoute().screen === 'template') render(); else go('templates', {}); }

  // Deletion Logs (spec §8.3) — read-only evidence
  SCREEN.deletion = function (params, body) {
    var q = (params.q || '').toLowerCase();
    var list = ORG.deletionLogs.filter(function (x) { return !q || (x.studentName + ' ' + x.code).toLowerCase().indexOf(q) >= 0; });
    var rows = list.map(function (x) {
      var s = ORG.byId(x.schoolId); var sys = x.deletedBy.indexOf('System') >= 0;
      return '<tr><td>' + esc(x.deletedAt) + '</td><td class="name">' + esc(x.studentName) + '<small class="mono">' + esc(x.code) + '</small></td><td>' + esc(x.gradeSection) + '</td><td>' + (s ? esc(s.name) : '—') + '</td><td>' + (sys ? '<span class="ui-chip muted">' + esc(x.deletedBy) + '</span>' : esc(x.deletedBy)) + '</td></tr>';
    }).join('') || '<tr><td colspan="5"><div class="ui-empty">No deletion records.</div></td></tr>';
    body.innerHTML = crumbs([{ label: 'Audit Trail', screen: 'audit' }, { label: 'Deletion Logs' }]) +
      screenHead('Deletion Logs', list.length + ' records · read-only evidence.') +
      '<div class="ui-card"><div class="tl-filters"><input class="input grow tl-filter-q" id="del-q" placeholder="Search student or code…" value="' + esc(params.q || '') + '"></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Deleted at</th><th>Student</th><th>Grade/Section</th><th>School</th><th>Deleted by</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    wireCrumbs(body);
    var qi = body.querySelector('#del-q'); if (qi) qi.addEventListener('input', function () { var pos = qi.selectionStart; SCREEN.deletion({ q: qi.value }, body); var nq = body.querySelector('#del-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} } });
  };

  // ============================================================
  //  CHANGE HISTORY — student records + assessments, across every
  //  school the viewer can see (all of them, or one group's).
  //  Data: ORG.server.history (live TilliAPI log + portfolio rows).
  // ============================================================
  var HU = window.TilliHistory;
  var HIST_PAGE = 50;   // rows shown per "Show more" step
  var histState = { kind: '', q: '', school: '', shown: HIST_PAGE, range: '7', from: '', to: '' };
  // Date-range presets for Change History. Custom uses the from/to date pickers.
  var HIST_RANGES = [['7', 'Past 7 days'], ['30', 'Past 30 days'], ['custom', 'Custom range'], ['all', 'All time']];
  function localISO(d) { var p = function (x) { return (x < 10 ? '0' : '') + x; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  // → [startMs, endMs] for the current range (null = open-ended).
  function histWindow() {
    var DAY = 86400000, now = Date.now();
    if (histState.range === '7' || histState.range === '30') { var t = new Date(); t.setHours(0, 0, 0, 0); return [t.getTime() - (+histState.range - 1) * DAY, now]; }
    if (histState.range === 'custom') {
      var a = histState.from ? new Date(histState.from + 'T00:00:00').getTime() : null;
      var b = histState.to ? new Date(histState.to + 'T23:59:59.999').getTime() : null;
      return [a, b];
    }
    return [null, null];
  }
  function histRangeLabel() {
    if (histState.range === 'custom') return histState.from || histState.to ? 'between ' + (histState.from ? fmtJoined(histState.from) : 'the start') + ' and ' + (histState.to ? fmtJoined(histState.to) : 'today') : 'in this range';
    return histState.range === 'all' ? '' : 'in the past ' + histState.range + ' days';
  }
  function scopeSchoolIds() {
    return (GROUP ? ORG.schools.filter(function (s) { return s.groupId === GROUP.id; }) : ORG.schools).map(function (s) { return s.id; });
  }
  function schoolNameOf(id) { var s = ORG.byId(id); return s ? s.name : ''; }
  function histList(events, extra) {
    return HU ? HU.listHTML(events, Object.assign({ me: me.email, showSchool: true, schoolName: schoolNameOf }, extra || {})) : '';
  }
  function lastLine(schoolId) { return HU ? HU.lastUpdatedHTML(ORG.server.lastChange(schoolId), { me: me.email }) : ''; }

  SCREEN.history = function (params, body) {
    if (!HU) { body.innerHTML = '<div class="ui-empty">Change history is unavailable.</div>'; return; }
    var ids = scopeSchoolIds();
    histState.school = params.school && ids.indexOf(params.school) >= 0 ? params.school : '';
    var schools = ids.map(ORG.byId).filter(Boolean).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var opts = '<option value="">All schools (' + schools.length + ')</option>' + schools.map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (s.id === histState.school ? ' selected' : '') + '>' + esc(s.name) + '</option>';
    }).join('');
    body.innerHTML = screenHead('Change History', GROUP
        ? 'Every change to student records and assessments across ' + GROUP.name + ' — who made it, when, and what changed.'
        : 'Every change to student records and assessments across the portfolio — by teachers, school admins, parents and the Tilli team.') +
      '<div class="ui-card"><div class="hist-tools">' + HU.kindChipsHTML(histState.kind) +
        '<select class="select tl-hist-school" id="hist-school" aria-label="Filter by school">' + opts + '</select>' +
        '<input class="input hist-q" id="hist-q" placeholder="Search a student, person or section…" value="' + esc(histState.q) + '" aria-label="Search history">' +
        '<span class="hist-count" id="hist-count"></span></div>' +
      '<div class="hist-tools tl-hist-range"><div class="ui-seg" role="group" aria-label="Date range">' +
        HIST_RANGES.map(function (r) { return '<button class="' + (histState.range === r[0] ? 'on' : '') + '" data-hist-range="' + r[0] + '">' + r[1] + '</button>'; }).join('') + '</div>' +
        '<span class="tl-hist-dates" id="hist-dates"' + (histState.range === 'custom' ? '' : ' hidden') + '>' +
          '<label>From <input class="input" type="date" id="hist-from" value="' + esc(histState.from) + '" max="' + localISO(new Date()) + '"></label>' +
          '<label>To <input class="input" type="date" id="hist-to" value="' + esc(histState.to) + '" max="' + localISO(new Date()) + '"></label></span>' +
      '</div><div id="hist-list"></div></div>';

    var listEl = body.querySelector('#hist-list'), countEl = body.querySelector('#hist-count');
    HU.wireSummary(listEl);   // one-line rows → click to expand (delegated; survives redraws)
    function drawList() {
      var win = histWindow();
      var all = ORG.server.history(histState.school ? [histState.school] : ids, { kind: histState.kind, q: histState.q })
        .filter(function (e) { return (win[0] == null || e.at >= win[0]) && (win[1] == null || e.at <= win[1]); });
      var more = all.length - histState.shown, rl = histRangeLabel();
      listEl.innerHTML = histList(all.slice(0, histState.shown), { showSchool: !histState.school, summary: true, all: all,
          empty: histState.q ? 'No changes match “' + histState.q + '”' + (rl ? ' ' + rl : '') + '.' : 'No changes ' + (rl || 'recorded yet') + '.' }) +
        (more > 0 ? '<button class="btn btn-outline btn-sm hist-morebtn" id="hist-more">Show ' + Math.min(HIST_PAGE, more) + ' more</button>' : '');
      countEl.textContent = all.length.toLocaleString() + ' change' + (all.length === 1 ? '' : 's') + (rl ? ' ' + rl : '');
      var mb = listEl.querySelector('#hist-more');
      if (mb) mb.addEventListener('click', function () { histState.shown += HIST_PAGE; drawList(); });
    }
    body.querySelectorAll('[data-hist-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        histState.kind = b.dataset.histKind; histState.shown = HIST_PAGE;
        body.querySelectorAll('[data-hist-kind]').forEach(function (c) { var on = c === b; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
        drawList();
      });
    });
    // School filter lives in the URL so hub / drill-in links land pre-filtered.
    body.querySelector('#hist-school').addEventListener('change', function (ev) {
      histState.school = ev.target.value; histState.shown = HIST_PAGE;
      history.replaceState(null, '', buildHash('history', { school: histState.school }));
      drawList();
    });
    body.querySelector('#hist-q').addEventListener('input', function (ev) { histState.q = ev.target.value; histState.shown = HIST_PAGE; drawList(); });
    var datesEl = body.querySelector('#hist-dates');
    body.querySelectorAll('[data-hist-range]').forEach(function (b) {
      b.addEventListener('click', function () {
        histState.range = b.dataset.histRange; histState.shown = HIST_PAGE;
        // First time into Custom: start from the past 30 days so the list isn't empty.
        if (histState.range === 'custom' && !histState.from && !histState.to) {
          histState.from = localISO(new Date(Date.now() - 29 * 86400000)); histState.to = localISO(new Date());
          body.querySelector('#hist-from').value = histState.from; body.querySelector('#hist-to').value = histState.to;
        }
        body.querySelectorAll('[data-hist-range]').forEach(function (c) { c.classList.toggle('on', c === b); });
        datesEl.hidden = histState.range !== 'custom';
        drawList();
      });
    });
    ['from', 'to'].forEach(function (k) {
      body.querySelector('#hist-' + k).addEventListener('change', function (ev) {
        histState[k] = ev.target.value; histState.shown = HIST_PAGE;
        // Keep the range the right way round if the dates cross.
        if (histState.from && histState.to && histState.from > histState.to) {
          var o = k === 'from' ? 'to' : 'from'; histState[o] = histState[k]; body.querySelector('#hist-' + o).value = histState[k];
        }
        drawList();
      });
    });
    drawList();
  };

  // ============================================================
  //  GROUP MODE — School Group Admin overview + school drill-in
  // ============================================================
  SCREEN.groupoverview = function (params, body) {
    var schools = ORG.schools.filter(function (s) { return s.groupId === GROUP.id && !s.archived; });
    var withComp = schools.filter(function (s) { return s.completion > 0; });
    var avg = withComp.length ? Math.round(sum(withComp, function (s) { return s.completion; }) / withComp.length) : 0;
    var rows = schools.map(function (s) {
      var last = ORG.server.lastChange(s.id);
      var lastCell = last && HU
        ? '<span title="' + esc(HU.fullDate(last.at)) + '">' + esc(HU.timeAgo(last.at)) + '</span> <span class="text-muted">· ' + esc(last.actor.name) + '</span>'
        : '<span class="text-muted">—</span>';
      return '<tr class="clickable" data-gopen="' + esc(s.id) + '"><td class="name">' + esc(s.name) + '<small>' + esc(s.city + ', ' + s.country) + '</small></td>' +
        '<td>' + statusChip(s.status) + '</td>' +
        '<td class="tl-num">' + s.students.toLocaleString() + '</td><td class="tl-num">' + (s.completion ? pct(s.completion) + '%' : '—') + '</td>' +
        '<td class="tl-lastcell">' + lastCell + '</td><td class="r text-muted">›</td></tr>';
    }).join('');
    body.innerHTML = screenHead(GROUP.name, schools.length + ' school' + (schools.length === 1 ? '' : 's') + ' in your group — what\'s happening, and what changed.') +
      '<div class="tl-kpis four">' + kpi(schools.length, 'Schools') + kpi(sum(schools, function (s) { return s.students; }).toLocaleString(), 'Students') +
        kpi(sum(schools, function (s) { return s.staff; }).toLocaleString(), 'Staff') + kpi(avg + '%', 'Avg. completion') + '</div>' +
      '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Schools</h3><p class="ui-mod-note">Open a school to see its assessment progress and change history.</p></div></div>' +
        (rows ? '<div class="ui-tablewrap"><table class="ui-table mw-760"><thead><tr><th>School</th><th>Status</th><th>Students</th><th>Completion</th><th>Last updated</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
              : '<div class="ui-empty">No schools in this group yet.</div>') + '</div>' +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Recent changes</h3><p class="ui-mod-note">Latest student-record and assessment changes across the group.</p></div>' +
        '<a class="btn-link" href="' + href('history', {}) + '">View all →</a></div>' +
        histList(ORG.server.history(scopeSchoolIds(), { limit: 8 }), { empty: 'No changes recorded in this group yet.' }) + '</div>';
    body.querySelectorAll('[data-gopen]').forEach(function (tr) { tr.addEventListener('click', function () { go('gschool', { id: tr.dataset.gopen }); }); });
  };

  // Read-only drill-in. Live schools link through to their leadership dashboard.
  SCREEN.gschool = function (params, body) {
    var s = ORG.byId(params.id);
    if (!s || s.groupId !== GROUP.id) { go('groupoverview', {}); return; }
    var d = ORG.server.schoolSummary(s.id);
    var dash = s.live
      ? '<a class="btn btn-primary btn-sm" style="text-decoration:none" href="admin.html?school=' + encodeURIComponent(s.created ? s.id : s.name) +
        '&email=' + encodeURIComponent(s.coordinator && s.coordinator.email ? s.coordinator.email : me.email) + '&from=group&group=' + encodeURIComponent(GROUP.id) + '">School dashboard →</a>'
      : '';
    body.innerHTML = crumbs([{ label: GROUP.name, screen: 'groupoverview' }, { label: s.name }]) +
      '<div class="tl-hub-head"><div><h1 class="ui-screen-title" style="margin-bottom:4px">' + esc(s.name) + '</h1>' +
        '<p class="ui-screen-sub m-0">' + esc(s.type) + ' · ' + esc(s.city + ', ' + s.country) + '</p>' +
        '<div class="tl-hub-last">' + lastLine(s.id) + '</div></div>' +
        (dash ? '<div class="tl-hub-actions">' + dash + '</div>' : '') + '</div>' +
      '<div class="tl-kpis four mt-3">' + kpi(s.gradeCount, 'Grades') + kpi(s.sectionCount, 'Sections') + kpi(s.students.toLocaleString(), 'Students') + kpi(s.staff, 'Staff') + '</div>' +
      '<div class="ui-card"><div class="ui-mod-h"><h3 class="ui-mod-title">Assessment progress</h3></div>' + phaseProgressHtml(d) + '</div>' +
      '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Change history</h3><p class="ui-mod-note">Who changed what at this school, newest first.</p></div>' +
        '<a class="btn-link" href="' + href('history', { school: s.id }) + '">Filter &amp; search →</a></div>' +
        histList(ORG.server.history([s.id], { limit: 30 }), { showSchool: false, empty: 'No changes recorded for this school yet.' }) + '</div>';
    wireCrumbs(body);
  };

  // Audit Trail (spec §8.4)
  SCREEN.audit = function (params, body) {
    var rows = ORG.audit.map(function (e) {
      var s = e.schoolId ? ORG.byId(e.schoolId) : null;
      return '<tr><td>' + timeAgo(e.at) + '</td><td class="name">' + esc(e.actor) + '</td><td>' + esc(actionLabelG(e.action)) + '</td><td>' + esc(e.entity) + (s ? ' <small>' + esc(s.name) + '</small>' : '') + '</td></tr>';
    }).join('');
    body.innerHTML = screenHead('Audit Trail', 'A permanent record of every admin action (it can’t be edited). Deletion Logs and Merge History are filtered views of it.',
        '<button class="btn btn-outline btn-sm" data-nav="deletion">Deletion Logs →</button>') +
      '<div class="ui-card"><div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    body.querySelectorAll('[data-nav]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.nav, {}); }); });
  };
  function actionLabelG(a) {
    return ({ 'year.start': 'Started academic year', 'template.publish': 'Published template', 'template.create': 'Created template', 'template.duplicate': 'Duplicated template', 'template.delete': 'Deleted template', 'template.edit': 'Edited template', 'template.archive': 'Archived template', 'template.unarchive': 'Restored template',
      'student.merge': 'Merged students', 'student.delete': 'Deleted students', 'student.add': 'Imported students', 'student.edit': 'Edited student',
      'student.approve': 'Approved new student', 'student.reject': 'Turned down new student', 'school.size': 'Set expected class size',
      'school.add': 'Added school', 'school.code': 'Changed school code', 'deployment.rules': 'Changed scheduling rules', 'school.archive': 'Archived school', 'school.delete': 'Deleted school', 'school.edit': 'Edited school', 'school.structure': 'Updated grades / sections', 'school.structure.auto': 'Auto-removed empty grade / section', 'role.change': 'Changed role',
      'deployment.create': 'Created deployment', 'deployment.end': 'Ended deployment',
      'observation.publish': 'Published observation phase', 'reflection.edit': 'Edited teacher reflection questions', 'reflection.reset': 'Reset teacher reflection questions', 'observation.access': 'Changed form access', 'selfguided.publish': 'Published self-guided game', 'selfguided.edit': 'Edited self-guided game',
      'group.create': 'Created group', 'group.rename': 'Renamed group', 'group.delete': 'Deleted group', 'group.archive': 'Archived group', 'group.unarchive': 'Restored group',
      'invitation.resend': 'Resent invitation', 'invitation.send': 'Sent invitation', 'invitation.revoke': 'Revoked invitation',
      'user.delete': 'Deleted user', 'user.remove': 'Removed from school', 'issue.status': 'Changed issue status' })[a] || a;
  }

  // Global search (spec: schools · students · users · invitations · deployments)
  SCREEN.search = function (params, body) {
    var q = (params.q || '').trim().toLowerCase();
    if (!q) { body.innerHTML = screenHead('Search', 'Type a query in the top bar.') + '<div class="ui-card"><div class="ui-empty">Search schools, students, users, invitations and deployments.</div></div>'; return; }
    var groups = [
      { title: 'Schools', rows: ORG.schools.filter(function (s) { return (s.name + ' ' + s.code).toLowerCase().indexOf(q) >= 0; }).slice(0, 8).map(function (s) { return { label: s.name, sub: s.code + ' · ' + s.groupName, go: ['school', { id: s.id }] }; }) },
      { title: 'Students', rows: ORG.server.studentDirectory().filter(function (r) { return (r.name + ' ' + r.admission).toLowerCase().indexOf(q) >= 0; }).slice(0, 8).map(function (r) { return { label: r.name, sub: r.admission, go: ['school', { id: r.schoolId, tab: 'students' }] }; }) },
      { title: 'Users', rows: ORG.users.filter(function (u) { return (u.name + ' ' + u.email).toLowerCase().indexOf(q) >= 0; }).slice(0, 8).map(function (u) { return { label: u.name, sub: u.email + ' · ' + u.role, go: ['users', { q: u.name }] }; }) },
      { title: 'Invitations', rows: ORG.invitations.filter(function (i) { return (i.name + ' ' + i.email).toLowerCase().indexOf(q) >= 0; }).slice(0, 6).map(function (i) { return { label: i.name, sub: i.email + ' · ' + i.status, go: ['invitations', { q: i.name }] }; }) },
      { title: 'Deployments', rows: ORG.deployments.filter(function (d) { return d.assessment.toLowerCase().indexOf(q) >= 0; }).slice(0, 6).map(function (d) { return { label: d.assessment, sub: d.phase + ' · ' + d.status, go: ['deployments', {}] }; }) },
    ].filter(function (g) { return g.rows.length; });
    var html = groups.length ? groups.map(function (g) {
      return '<div class="ui-card"><div class="ui-mod-h"><h3 class="ui-mod-title">' + g.title + ' <span class="tl-count">' + g.rows.length + '</span></h3></div>' +
        g.rows.map(function (r, i) { return '<button class="tl-searchrow" data-g="' + esc(g.title) + '" data-i="' + i + '"><b>' + esc(r.label) + '</b><span>' + esc(r.sub) + '</span></button>'; }).join('') + '</div>';
    }).join('') : '<div class="ui-card"><div class="ui-empty">Nothing matches “' + esc(params.q) + '”.</div></div>';
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
      : '<div class="ui-card mb-gap"><label class="field">School<select class="select" id="as-school"><option value="">— Select a school —</option>' +
          ORG.activeSchools().map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></label></div>';

    b.innerHTML = crumb + screenHead('Add Students' + (sc ? ' · ' + sc.name : ''), 'Manual entry or CSV import. Rows are validated before commit.') + schoolPicker +
      '<div class="ui-seg mb-4"><button data-mode="manual" class="' + (addState.mode === 'manual' ? 'on' : '') + '">Manual</button><button data-mode="csv" class="' + (addState.mode === 'csv' ? 'on' : '') + '">CSV import</button></div>' +
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
          '<td class="r"><button class="tl-rowact danger" data-drop="' + i + '" title="Remove from the batch" aria-label="Remove from the batch">' + ICONS.trash + '</button></td></tr>';
      }).join('') : '<tr><td colspan="4"><div class="ui-empty">No students staged yet — add one above.</div></td></tr>';
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
            return '<option value="' + esc(g.grade) + '"' + (g.grade === addState.grade ? ' selected' : '') + '>' + esc(gradeLbl(g.grade, g.base)) + '</option>';
          }).join('') + '</select>'
        : '<input class="input" id="m-grade" value="' + esc(addState.grade) + '" placeholder="Grade 1">';
      var sectionControl = grades.length
        ? '<select class="select" id="m-sec"' + (secs.length ? '' : ' disabled') + '>' +
            (secs.length ? '' : '<option value="">No sections yet</option>') +
            secs.map(function (s) { return '<option value="' + esc(s.name) + '"' + (s.name === addState.section ? ' selected' : '') + '>' + esc(s.name + (s.base && !sameName(s.name, s.base) ? ' (' + s.base + ')' : '')) + '</option>'; }).join('') +
          '</select>'
        : '<input class="input" id="m-sec" value="' + esc(addState.section) + '" placeholder="A">';

      el.innerHTML = '<div class="tl-stepcard"><div class="tl-stepnum">1</div><div class="ui-card"><div class="ui-mod-h"><h3 class="ui-mod-title">Add a student</h3></div>' +
        '<div class="tl-stack" style="max-width:520px">' +
          '<div class="tl-fieldrow"><label class="field flex-1">Grade' + gradeControl + '</label>' +
            '<label class="field" style="width:130px">Section' + sectionControl + '</label></div>' +
          '<label class="field">Full name<input class="input" id="m-name" placeholder="e.g. Aarav Sharma"></label>' +
          '<label class="field">Admission #<input class="input" id="m-adm" placeholder="ADM-1234"></label>' +
          '<div><button class="btn btn-outline btn-sm" id="m-add">+ Add to batch</button></div>' +
        '</div></div></div>' +
        '<div class="tl-stepcard mt-gap"><div class="tl-stepnum">2</div><div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Staged for import</h3><p class="ui-mod-note">' + addState.batch.length + ' student(s) ready.</p></div>' +
          (addState.batch.length ? '<button class="btn btn-primary btn-sm" id="m-import">Import ' + addState.batch.length + ' student(s)</button>' : '') + '</div>' +
          '<div class="ui-tablewrap"><table class="ui-table mw-520"><thead><tr><th>Name</th><th>Admission #</th><th>Grade/Section</th><th></th></tr></thead><tbody>' + batchRows + '</tbody></table></div></div></div>';
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
        if (grades.length && !secs.length) { toast(addState.grade + ' has no sections yet — add one in Grades & sections first.'); return; }
        if (!grades.length) { toast('This school has no grades yet — add them in Grades & sections first.'); return; }
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
      el.innerHTML = '<div class="ui-card"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Upload or paste a CSV</h3><p class="ui-mod-note">Columns: name, admission, grade, section. First row is the header. Grades and sections must already exist at the school.</p></div>' +
          '<div class="tl-inline-actions"><label class="btn btn-outline btn-sm">Upload .csv<input type="file" accept=".csv,text/csv" id="csv-file" class="hidden"></label>' +
          '<button class="btn-link" id="csv-template" title="A CSV with the right columns and this school’s real grades and sections">Download template</button>' +
          '<button class="btn-link" id="csv-sample">Insert sample</button></div></div>' +
          '<textarea class="input mono tl-csv-in" id="csv-in" rows="6" placeholder="' + esc(sample) + '"></textarea>' +
          '<div class="mt-3"><button class="btn btn-outline btn-sm" id="csv-validate">Validate</button></div></div>' +
        (prev ? '<div class="ui-card mt-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Validation preview</h3>' +
            '<p class="ui-mod-note"><span class="tl-valid-ok">' + prev.valid.length + ' valid</span>' + (prev.invalid.length ? ' · <span class="tl-valid-err">' + prev.invalid.length + ' with errors</span>' : '') + '</p></div>' +
            (prev.valid.length ? '<button class="btn btn-primary btn-sm" id="csv-import">Import ' + prev.valid.length + ' valid row(s)</button>' : '') + '</div>' +
          '<div class="ui-tablewrap"><table class="ui-table mw-560"><thead><tr><th>#</th><th>Name</th><th>Admission #</th><th>Grade/Section</th><th>Status</th></tr></thead><tbody>' +
            prev.all.map(function (r, i) {
              return '<tr class="' + (r.error ? 'tl-rowbad' : '') + '"><td class="tl-num">' + (i + 1) + '</td><td class="name">' + esc(r.name || '—') + '</td><td class="mono">' + esc(r.admission || '—') + '</td><td>' + esc((r.grade || '') + ' ' + (r.section || '')) + '</td><td>' + (r.error ? '<span class="tl-valid-err">' + esc(r.error) + '</span>' : '<span class="tl-valid-ok">OK</span>') + '</td></tr>';
            }).join('') + '</tbody></table></div></div>' : '');
      el.querySelector('#csv-sample').addEventListener('click', function () { document.getElementById('csv-in').value = sample; });
      // A chosen file lands in the box, then validates straight away.
      el.querySelector('#csv-file').addEventListener('change', function (e) {
        var f = e.target.files && e.target.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          document.getElementById('csv-in').value = String(rd.result || '').replace(/^\uFEFF/, '');
          addState.preview = parseCsv(document.getElementById('csv-in').value, currentAddSchool(sc)); renderAddPanel(sc, el);
          toast(f.name + ' loaded — check the rows below.');
        };
        rd.readAsText(f);
      });
      el.querySelector('#csv-template').addEventListener('click', function () {
        var school = currentAddSchool(sc), rows = [];
        var grades = school && tlUsesApi(school) ? window.TilliAPI.schoolStats(school.id).grades : ((school && school.structure && school.structure.grades) || []);
        grades.forEach(function (g) { g.sections.slice(0, 2).forEach(function (x) { rows.push(['Example Child ' + (rows.length + 1), 'ADM-' + (1001 + rows.length), g.grade, x.name]); }); });
        if (!rows.length) rows.push(['Example Child 1', 'ADM-1001', 'Grade 1', 'A']);
        downloadCsv((school ? school.id + '-' : '') + 'students-template.csv', ['name', 'admission', 'grade', 'section'], rows);
      });
      el.querySelector('#csv-validate').addEventListener('click', function () { addState.preview = parseCsv(document.getElementById('csv-in').value, currentAddSchool(sc)); renderAddPanel(sc, el); });
      var ci = el.querySelector('#csv-import'); if (ci) ci.addEventListener('click', function () { commitStudents(sc, addState.preview.valid.slice()); });
    }
  }

  // The school's real classes. An import row must name one of them — only upper /
  // lower case and extra spaces are forgiven ("grade 1  a" = "Grade 1 A"). Returns
  // the class's own spelling, or the reason the row can't go in.
  function classMatcher(school) {
    var squash = function (x) { return String(x || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
    var grades = school && tlUsesApi(school) && window.TilliAPI ? window.TilliAPI.schoolStats(school.id).grades
      : ((school && school.structure && school.structure.grades) || []);
    return function (grade, section) {
      var g = grades.filter(function (x) { return squash(x.grade) === squash(grade); })[0];
      if (!g) return { error: 'No ' + grade + ' at this school — add it in Grades & sections first' };
      if (!g.sections.length) return { error: g.grade + ' has no sections yet — add one in Grades & sections first' };
      if (!section) return g.sections.length === 1 ? { grade: g.grade, section: g.sections[0].name }
        : { error: 'Which section? ' + g.grade + ' has ' + g.sections.map(function (x) { return x.name; }).join(', ') };
      var sec = g.sections.filter(function (x) { return squash(x.name) === squash(section); })[0];
      return sec ? { grade: g.grade, section: sec.name } : { error: 'No ' + g.grade + ' ' + section + ' at this school — add it in Grades & sections first' };
    };
  }
  function parseCsv(text, school) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (lines.length) { var h = lines[0].toLowerCase(); if (h.indexOf('name') >= 0 && h.indexOf('admission') >= 0) lines.shift(); }
    var seen = {}, all = [], match = classMatcher(school);
    lines.forEach(function (line) {
      var c = line.split(',').map(function (x) { return x.trim(); });
      var row = { name: c[0] || '', admission: c[1] || '', grade: c[2] || '', section: c[3] || '' };
      if (!row.name) row.error = 'Missing name';
      else if (!row.admission) row.error = 'Missing admission #';
      else if (!row.grade) row.error = 'Missing grade';
      else if (seen[row.admission.toLowerCase()]) row.error = 'Duplicate in file';
      else {
        var m = match(row.grade, row.section);
        if (m.error) row.error = m.error;
        else { row.grade = m.grade; row.section = m.section; seen[row.admission.toLowerCase()] = true; }
      }
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
        if (res.persisted) ORG.refreshApiSchool(school.id);   // header counts without a reload
        if (res.persisted) {
          var msg = res.added + ' student(s) added to ' + school.name + '.';
          if (res.skipped) msg += ' ' + res.skipped + ' skipped (duplicate / conflict).';
          toast(msg);
          if (res.sized.length) { askClassSizes(school, res.sized, function () { go('school', { id: school.id, tab: 'students' }); }); return; }
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
    var actor = school.coordinator.email, added = 0, skipped = 0, before = {};
    rows.forEach(function (r) {
      var parts = String(r.name || '').trim().split(/\s+/);
      var first = parts.shift() || '', last = parts.join(' ');
      var secId = window.TilliAPI.ensureSection(school.id, r.grade || 'Grade 1', r.section || '');
      if (!before[secId]) before[secId] = window.TilliAPI.sectionRoom(school.id, secId);
      var out = window.TilliAPI.addStudent({ actorEmail: actor, school_id: school.id, section_id: secId,
        student_id: r.admission, first: first, last: last, grade: r.grade, section: r.section, source: 'admin' });
      if (out && (out.result === 'created' || out.result === 'merged')) added++; else skipped++;
    });
    // Classes whose expected size the import just set — the admin is asked to confirm each.
    var sized = Object.keys(before).map(function (id) { var a = window.TilliAPI.sectionRoom(school.id, id), b = before[id]; return a && b && a.expected !== b.expected && !a.confirmed ? a : null; }).filter(Boolean);
    return { persisted: true, added: added, skipped: skipped, sized: sized };
  }
  // "Grade 2 A now has 15 — is that the whole class?" after an import sets class sizes.
  function askClassSizes(school, rooms, after) {
    openModal('Is that the whole class?',
      '<p class="tl-muted">The import set these class sizes from the number of students in the file. Teachers can add up to the size; past it, each new child needs approval — so a half-imported class would block them.</p>' +
      '<div class="tl-stack">' + rooms.map(function (r, i) {
        return '<div class="tl-sizeask"><span><b>' + esc(r.name) + '</b> now has <b>' + r.added + '</b> student' + (r.added === 1 ? '' : 's') + '.</span>' +
          '<label class="tl-check"><input type="radio" name="sz-' + i + '" value="yes" checked> Yes, ' + r.added + ' is the whole class</label>' +
          '<label class="tl-check"><input type="radio" name="sz-' + i + '" value="no"> No, it should be <input type="number" min="1" class="input sm tl-sizein-n" data-szn="' + i + '" value="' + r.added + '" aria-label="Real size of ' + esc(r.name) + '"></label></div>';
      }).join('') + '</div>',
      function (close) {
        rooms.forEach(function (r, i) {
          var no = document.querySelector('input[name="sz-' + i + '"][value="no"]').checked;
          var n = no ? document.querySelector('[data-szn="' + i + '"]').value : r.added;
          window.TilliAPI.setSectionExpected(school.id, r.section_id, n, me.email);
        });
        ORG.server.logAudit(me.name, 'school.size', rooms.length + ' class size(s) confirmed after import', 'school', school.id);
        close(); toast('Class sizes saved.'); after();
      }, 'Save sizes');
    // Typing a number picks "No, it should be…".
    document.querySelectorAll('[data-szn]').forEach(function (inp) { inp.addEventListener('input', function () { document.querySelector('input[name="sz-' + inp.dataset.szn + '"][value="no"]').checked = true; }); });
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
        '<div class="ui-card span2"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Question bank</h3><p class="ui-mod-note">' + obs.questions.length + ' active questions, shared across all phases.</p></div>' +
          '<div class="tl-inline-actions"><button class="btn btn-outline btn-sm" id="ob-preview">Preview</button><button class="btn btn-outline btn-sm" id="ob-dlq">Download CSV</button></div></div>' +
          '<div class="tl-qbank">' + qRows + '</div></div>' +
        '<div class="ui-card span2"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Phase publishing</h3><p class="ui-mod-note">Pre / Mid / Post — publishing a phase makes it deployable.</p></div></div>' + phaseRows + '</div>' +
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
  //  TEACHER REFLECTION QUESTIONS — the one-time pre-training reflection every
  //  teacher completes during dashboard onboarding. Stored in the shared
  //  TilliAPI bank (db.config.reflection), so edits here reach the teacher app
  //  without a rebuild. Categories are fixed (5 — they map to the onboarding
  //  progress petals); questions are added / edited / reordered / removed per
  //  category. Edits are a local draft until "Save changes".
  // ============================================================
  var reflDraft = null, reflDirty = false;
  var REFL_TYPES = [['scale', 'Scale 1–5'], ['choice', 'Multiple choice'], ['text', 'Written answer']];
  SCREEN.reflection = function (p, b) {
    var API = window.TilliAPI;
    var reflCrumbs = crumbs([{ label: 'Templates', screen: 'templates' }, { label: 'Teacher Reflection Questions' }]);
    if (!API || !API.getReflectionConfig) { b.innerHTML = reflCrumbs + screenHead('Teacher Reflection Questions', 'Question store unavailable.'); wireCrumbs(b); return; }
    if (!reflDraft) { reflDraft = API.getReflectionConfig(); reflDirty = false; }
    var cats = reflDraft.cats || [], qs = reflDraft.questions || [];
    var n = 0;
    var catCards = cats.map(function (c) {
      var mine = qs.filter(function (q) { return q.cat === c.id; });
      var rows = mine.map(function (q, k) {
        n++;
        var gi = qs.indexOf(q);
        var typeSel = '<select class="input tl-refl-type" data-rq-type="' + gi + '">' + REFL_TYPES.map(function (t) {
          return '<option value="' + t[0] + '"' + (q.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select>';
        var extra = '';
        if (q.type === 'scale') {
          extra = '<div class="tl-refl-extra"><input class="input" data-rq="' + gi + '" data-rk="lo" value="' + esc(q.lo || '') + '" placeholder="1 = Strongly disagree" title="Label under 1 (blank = Strongly disagree)">' +
            '<input class="input" data-rq="' + gi + '" data-rk="hi" value="' + esc(q.hi || '') + '" placeholder="5 = Strongly agree" title="Label under 5 (blank = Strongly agree)">' +
            '<label class="tl-refl-rev" title="Tick when agreeing is the LESS healthy answer (e.g. &quot;I felt drained&quot;). The Teaching Mirror flips it so higher always means more of that strength."><input type="checkbox" data-rq-rev="' + gi + '"' + (q.reverse ? ' checked' : '') + '> Reverse-scored</label></div>';
        } else if (q.type === 'choice') {
          extra = '<div class="tl-refl-extra"><input class="input grow" data-rq-opts="' + gi + '" value="' + esc((q.options || []).join(', ')) + '" placeholder="Options, comma-separated (e.g. 0, 1–2, 3–4, 5+)"></div>';
        }
        return '<div class="tl-refl-q">' +
          '<span class="q-n">' + n + '</span>' +
          '<div class="tl-refl-body">' +
            '<textarea class="input tl-refl-text" rows="2" data-rq="' + gi + '" data-rk="q" placeholder="Question text">' + esc(q.q) + '</textarea>' +
            '<input class="input tl-refl-hint" data-rq="' + gi + '" data-rk="hint" value="' + esc(q.hint || '') + '" placeholder="Helper text shown under the question (optional)">' +
            '<div class="tl-refl-meta">' + typeSel + extra + '</div>' +
          '</div>' +
          '<div class="tl-refl-ctl">' +
            '<button class="tl-refl-ic" data-rq-move="' + gi + ':-1" title="Move up"' + (k === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button class="tl-refl-ic" data-rq-move="' + gi + ':1" title="Move down"' + (k === mine.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button class="tl-refl-ic del" data-rq-del="' + gi + '" title="Delete question">×</button>' +
          '</div></div>';
      }).join('') || '<div class="ui-empty" style="padding:12px">No questions in this category.</div>';
      return '<div class="ui-card tl-refl-cat"><div class="ui-mod-h"><div><h3 class="ui-mod-title"><span class="tl-refl-dot" style="background:' + esc(c.color) + '"></span>' + esc(c.name) + '</h3>' +
        '<p class="ui-mod-note">' + mine.length + ' question' + (mine.length === 1 ? '' : 's') + '</p></div>' +
        '<button class="btn btn-outline btn-sm" data-rq-add="' + esc(c.id) + '">+ Add question</button></div>' + rows + '</div>';
    }).join('');
    var saved = (reflDraft.updatedAt ? 'Last saved ' + timeAgo(reflDraft.updatedAt) + '. ' : '');
    b.innerHTML = reflCrumbs + screenHead('Teacher Reflection Questions',
        saved + 'The one-time teacher reflection in dashboard onboarding — ' + qs.length + ' questions across ' + cats.length + ' categories. Changes reach teachers the next time they open the reflection.',
        '<button class="btn btn-outline btn-sm" id="rq-reset">Reset to default</button>' +
        '<button class="btn btn-outline btn-sm" id="rq-discard"' + (reflDirty ? '' : ' disabled') + '>Discard</button>' +
        '<button class="btn btn-primary btn-sm" id="rq-save"' + (reflDirty ? '' : ' disabled') + '>' + (reflDirty ? 'Save changes' : 'Saved') + '</button>') +
      (reflDirty ? '<div class="tl-filterbanner">Unsaved changes — teachers still see the last saved version.</div>' : '') +
      catCards;
    wireCrumbs(b);

    function dirty() {
      if (reflDirty) return;
      reflDirty = true;
      var sv = b.querySelector('#rq-save'), dc = b.querySelector('#rq-discard');
      if (sv) { sv.disabled = false; sv.textContent = 'Save changes'; }
      if (dc) dc.disabled = false;
    }
    function rerender() { reflDirty = true; SCREEN.reflection(p, b); }
    // text fields patch the draft in place (no re-render → caret survives)
    b.querySelectorAll('[data-rq]').forEach(function (el) { el.addEventListener('input', function () {
      var q = qs[+el.dataset.rq]; if (!q) return; q[el.dataset.rk] = el.value; dirty();
    }); });
    b.querySelectorAll('[data-rq-opts]').forEach(function (el) { el.addEventListener('input', function () {
      var q = qs[+el.dataset.rqOpts]; if (!q) return;
      q.options = el.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean); dirty();
    }); });
    b.querySelectorAll('[data-rq-rev]').forEach(function (el) { el.addEventListener('change', function () {
      var q = qs[+el.dataset.rqRev]; if (q) { q.reverse = el.checked; dirty(); }
    }); });
    b.querySelectorAll('[data-rq-type]').forEach(function (el) { el.addEventListener('change', function () {
      var q = qs[+el.dataset.rqType]; if (!q) return;
      q.type = el.value;
      if (q.type === 'choice' && !(q.options && q.options.length)) q.options = ['Option 1', 'Option 2'];
      rerender();
    }); });
    b.querySelectorAll('[data-rq-add]').forEach(function (el) { el.addEventListener('click', function () {
      var cat = el.dataset.rqAdd, last = -1;
      qs.forEach(function (q, i) { if (q.cat === cat) last = i; });
      qs.splice(last + 1, 0, { id: '', cat: cat, type: 'scale', q: '' });
      rerender();
      var t = b.querySelectorAll('[data-rk="q"]'); var target = b.querySelector('[data-rq="' + (last + 1) + '"][data-rk="q"]');
      if (target) target.focus(); else if (t.length) t[t.length - 1].focus();
    }); });
    b.querySelectorAll('[data-rq-move]').forEach(function (el) { el.addEventListener('click', function () {
      var parts = el.dataset.rqMove.split(':'), i = +parts[0], dir = +parts[1], q = qs[i];
      // swap with the nearest question of the same category in that direction
      for (var j = i + dir; j >= 0 && j < qs.length; j += dir) {
        if (qs[j].cat === q.cat) { qs[i] = qs[j]; qs[j] = q; break; }
      }
      rerender();
    }); });
    b.querySelectorAll('[data-rq-del]').forEach(function (el) { el.addEventListener('click', function () {
      var i = +el.dataset.rqDel, q = qs[i]; if (!q) return;
      if (q.q && !confirm('Delete this question?\n\n“' + q.q + '”\n\nTeachers who already answered keep their answer on file.')) return;
      qs.splice(i, 1); rerender();
    }); });
    b.querySelector('#rq-save').addEventListener('click', function () {
      var empty = qs.filter(function (q) { return !String(q.q || '').trim(); }).length;
      if (empty && !confirm(empty + ' question' + (empty === 1 ? ' has' : 's have') + ' no text and will be dropped. Save anyway?')) return;
      // Keep the bank grouped by category order so teachers move through one
      // category at a time (a question added later doesn't jump to the end).
      var order = cats.map(function (c) { return c.id; });
      var sorted = qs.map(function (q, i) { return { q: q, i: i }; })
        .sort(function (a, c) { return (order.indexOf(a.q.cat) - order.indexOf(c.q.cat)) || (a.i - c.i); })
        .map(function (x) { return x.q; });
      var res = API.setReflectionConfig({ cats: cats, questions: sorted });
      if (!res.ok) { toast('Could not save — ' + (res.reason || 'unknown error')); return; }
      reflDraft = res.config; reflDirty = false;
      ORG.server.logAudit(me.name, 'reflection.edit', reflDraft.questions.length + ' questions', 'template');
      toast('Reflection questions saved — teachers see them next time.');
      SCREEN.reflection(p, b);
    });
    b.querySelector('#rq-discard').addEventListener('click', function () { reflDraft = null; SCREEN.reflection(p, b); });
    b.querySelector('#rq-reset').addEventListener('click', function () {
      if (!confirm('Reset the reflection to the original 10 questions? This replaces the saved bank for every teacher.')) return;
      reflDraft = API.resetReflectionConfig(); reflDirty = false;
      ORG.server.logAudit(me.name, 'reflection.reset', 'Default bank', 'template');
      toast('Reflection reset to the default questions.');
      SCREEN.reflection(p, b);
    });
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
  //  SHARE LINKS — per school (school → Assessments → Links to share)
  //  and per group (group page → Group links). The old Deployments →
  //  Master Links tab is gone; #/master-links forwards to All Schools.
  // ============================================================
  // Group links (#7) — Parent + Teacher only; Direct Assessment stays per
  // school because it runs on a classroom device.
  var GROUP_LINK_HUBS = [{ role: 'parent', label: 'Parent' }, { role: 'teacher', label: 'Teacher' }];
  function groupLinksHtml(g) {
    var n = ORG.schools.filter(function (s) { return s.groupId === g.id && !s.archived; }).length;
    return '<div class="tl-grouplinks"><div class="tl-grouplinks-h"><b>' + esc(g.name) + '</b><span>' + n + ' school' + (n === 1 ? '' : 's') + ' to pick from</span></div>' +
      GROUP_LINK_HUBS.map(function (h) {
        var url = ORG.groupLinkUrl(g, h.role);
        return '<div class="tl-linkrow"><div><b>' + h.label + ' link</b><span class="mono">' + esc(url) + '</span></div>' +
          '<div class="tl-inline-actions"><a class="btn btn-outline btn-sm" href="' + esc(ORG.groupLinkPreview(g, h.role)) + '" target="_blank" rel="noopener" style="text-decoration:none" title="Open the pick-your-school page this link leads to.">Open ↗</a>' +
          '<button class="btn btn-outline btn-sm" data-copy="' + esc(url) + '">Copy Link</button></div></div>';
      }).join('') + '</div>';
  }
  // Old #/master-links bookmarks: the links now live on each school's and group's page.
  SCREEN['master-links'] = function (p, b) { go('schools', {}); };

  // Results now live under Deployments (§6 merge). Keep the old #/results route
  // working by forwarding to the Deployments → Results tab, params preserved.
  SCREEN.results = function (p, b) { go('deployments', { tab: 'results', phase: p.phase, q: p.q }); };

  // ---- AI Assistant — intentionally cross-product; deferred per spec §10.1 ----
  // ============================================================
  //  KNOWLEDGE BASE → MANUALS  (#11) — short how-tos for the Tilli
  //  team, drafted from how this dashboard works. Edit the wording
  //  here; each step can deep-link into the dashboard.
  // ============================================================
  var MANUALS = [
    { id: 'onboarding', title: 'Onboarding a new school', keywords: 'onboard add new school wizard join code invite admin setup',
      summary: 'From signed MoU to a school that is ready for Baseline.',
      steps: [
        { text: 'Go to All Schools → + Add School. Fill in the profile (name, board, country then city), the rollout, grades & sections, and the school admin.', link: ['schools', {}, 'All Schools'] },
        { text: 'Review and create. The new school’s hub opens with its codes ready.' },
        { text: 'Staff & Access: share the school code — anyone who enters it joins as a Teacher, no invite needed. It’s the same code that’s in the school’s links. Invite the school admin if you skipped it in the wizard.' },
        { text: 'Students: add students by hand or import a CSV (rows are checked before anything is saved).' },
        { text: 'Assessments: plan the Baseline and deploy it when the school is ready.' },
      ] },
    { id: 'grades', title: 'Grades & sections', keywords: 'grade section class add remove empty auto delete 60 days add back structure',
      summary: 'Adding grades and sections, and the 60-day rule for empty ones.',
      steps: [
        { text: 'School hub → Settings → Manage grades / sections. Use “Add grade” or “+ Section”.' },
        { text: 'A grade or section with no students ' + ORG.emptyStructureTtlDays + ' days after it was added is removed automatically. Each one has its own clock.' },
        { text: 'Empty sections show how many days they have left (amber within ' + ORG.emptyStructureWarnDays + ' days), and the school card gets a warning flag.' },
        { text: 'If a school needs a removed one again, open the same dialog → Auto-removed → Add back. It gets a fresh ' + ORG.emptyStructureTtlDays + ' days.' },
      ] },
    { id: 'students', title: 'Adding, merging and deleting students', keywords: 'student add csv import merge duplicate delete remove roster',
      summary: 'Everything student-related lives inside the school.',
      steps: [
        { text: 'School hub → Students → + Add Students: manual entry or CSV import, validated before commit.' },
        { text: 'Merge Students: review suggested duplicates side by side and confirm by typing MERGE. Every merge is written to Merge History.' },
        { text: 'Delete: type DELETE to confirm. The deletion is recorded in Deletion Logs.', link: ['deletion', {}, 'Deletion Logs'] },
      ] },
    { id: 'templates', title: 'Templates: phases, versions and archiving', keywords: 'template version phase baseline midline endline draft publish history restore archive duplicate deploy which',
      summary: 'One template per assessment, with Baseline / Midline / Endline versions.',
      steps: [
        { text: 'Open a template and pick the phase you want: Baseline, Midline or Endline. Each phase has its own questions.', link: ['templates', {}, 'Templates'] },
        { text: 'Edit starts a draft. The live version doesn’t change until you Publish — then the draft becomes the next version (v2, v3 …).' },
        { text: 'History lists every version of a phase. Open an old one read-only, or Restore it as a new draft.' },
        { text: 'A deployment keeps the version it started with. Publishing a new version only affects windows that start afterwards.' },
        { text: 'Archive a whole template you no longer use: it moves to the Archived tab and can’t be picked for new deployments.' },
      ] },
    { id: 'deployments', title: 'Deployments and links', keywords: 'deploy deployment window link master group link parent teacher share url',
      summary: 'Getting assessments to schools, and the links people use.',
      steps: [
        { text: 'Deployments → + New deployment: pick the school, the template and phase (its live version is used), the window, and publish.', link: ['deployments', {}, 'Deployments'] },
        { text: 'Inside a school: Assessments tab → the phase timeline, the planner, and the Teacher / Student assessment logs.' },
        { text: 'Links to share: on the school’s Assessments tab — one each for parents, teachers and student assessments.', link: ['schools', {}, 'All Schools'] },
        { text: 'Group links: on the group’s page — one Parent link and one Teacher link for the whole group. People pick their school first, then carry on as usual.' },
      ] },
    { id: 'archiving', title: 'Archiving schools and groups', keywords: 'archive unarchive restore school group delete pause',
      summary: 'Pausing a school or a whole group without losing data.',
      steps: [
        { text: 'Archive a school: School hub → Settings → Archive school (type ARCHIVE). It leaves active lists; deployments and links are suspended; data is kept.' },
        { text: 'Archive a group: group page → Manage → Archive group. Every school in it is archived and the group admin sees an “archived” notice.' },
        { text: 'Un-archive the group to restore it. Only the schools archived with it come back — any archived on their own stay archived.' },
        { text: 'A school can only be deleted after it is archived. Archived items are on the All Schools → Archived tab.', link: ['schools', {}, 'All Schools'] },
      ] },
    { id: 'issues', title: 'Handling issue reports', keywords: 'issue bug problem report crash status resolve investigating school',
      summary: 'Triage what schools report.',
      steps: [
        { text: 'Issue Reports: filter by status and by school. The “Most open issues” strip shows which schools need attention first.', link: ['issues', {}, 'Issue Reports'] },
        { text: 'School cards show a red “open issues” chip — click it to open that school’s Issues & Logs.' },
        { text: 'Change status as you work: Open → Investigating → Resolved. Auto-crash reports are grouped by crash signature.' },
      ] },
    { id: 'exports', title: 'Exports (CSV)', keywords: 'csv export download excel spreadsheet list report',
      summary: 'Every download in one place.',
      steps: [
        { text: 'All Schools → ↓ Schools CSV — the current view (tab, country and search apply).', link: ['schools', {}, 'All Schools'] },
        { text: 'Group page → ↓ Assessments CSV and ↓ Staff CSV for the whole group.' },
        { text: 'School hub → Assessments → results CSV, and the Teacher assessment log CSV.' },
        { text: 'Deployments → Results → Download CSV.', link: ['deployments', { tab: 'results' }, 'Results'] },
        { text: 'Ask Tilli follow-up reports have their own CSV button.', link: ['ask-tilli', {}, 'Ask Tilli'] },
      ] },
    { id: 'ask-tilli', title: 'Using Ask Tilli', keywords: 'ask tilli chat question answer report follow up assistant',
      summary: 'Quick answers about completion, and follow-up reports.',
      steps: [
        { text: 'Pick what Tilli should answer about (whole portfolio, a group, a country or one school), then ask.', link: ['ask-tilli', {}, 'Ask Tilli'] },
        { text: 'Good questions: “Completion at Sunrise”, “How is Vidya Trust doing?”, “Which teachers haven’t started at Greenfield?”, “Follow-up report for schools below 50%”.' },
        { text: 'Follow-up reports list the schools, their coordinator’s email and teachers not started — download as CSV or copy as text.' },
      ] },
  ];
  function manualMatches(q) {
    var words = String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2 && ['how', 'the', 'can', 'and', 'for', 'what', 'where', 'does'].indexOf(w) < 0; });
    if (!words.length) return MANUALS.slice();
    return MANUALS.map(function (m) {
      var hay = (m.title + ' ' + m.keywords + ' ' + m.summary).toLowerCase();
      return { m: m, score: words.filter(function (w) { return hay.indexOf(w) >= 0; }).length };
    }).filter(function (x) { return x.score; }).sort(function (a, b) { return b.score - a.score; }).map(function (x) { return x.m; });
  }
  SCREEN.knowledge = function (params, body) {
    var kbTabs = '<div class="ui-tabs mb-gap"><button class="ui-tab' + (params.tab !== 'faq' ? ' on' : '') + '" data-kbtab="">Manuals <b>' + MANUALS.length + '</b></button>' +
      '<button class="ui-tab' + (params.tab === 'faq' ? ' on' : '') + '" data-kbtab="faq">FAQ <b>' + FAQS.length + '</b></button></div>';
    var wireKbTabs = function () { body.querySelectorAll('[data-kbtab]').forEach(function (b) { b.addEventListener('click', function () { go('knowledge', b.dataset.kbtab ? { tab: b.dataset.kbtab } : {}); }); }); };
    if (params.tab === 'faq') { renderFaqTab(params, body, kbTabs); wireKbTabs(); return; }
    var q = params.q || '';
    var list = manualMatches(q);
    var cur = MANUALS.find(function (m) { return m.id === params.a; }) || list[0] || MANUALS[0];
    var art = '<article class="tl-kb-art"><div class="ui-eyebrow">Manual</div><h2 class="tl-kb-title">' + esc(cur.title) + '</h2><p class="tl-muted">' + esc(cur.summary) + '</p>' +
      '<ol class="tl-kb-steps">' + cur.steps.map(function (st) {
        return '<li>' + esc(st.text) + (st.link ? ' <a class="btn-link" href="' + href(st.link[0], st.link[1]) + '">Open ' + esc(st.link[2]) + ' →</a>' : '') + '</li>';
      }).join('') + '</ol></article>';
    body.innerHTML = screenHead('Knowledge Base', 'Manuals and FAQs for the Tilli team — how to do the common jobs in this dashboard.') + kbTabs +
      '<div class="tl-kb"><aside class="ui-card tl-kb-side"><input class="input tl-kb-q" id="kb-q" placeholder="Search manuals…" value="' + esc(q) + '" aria-label="Search manuals">' +
        '<nav class="tl-kb-list">' + (list.length ? list.map(function (m) {
          return '<a class="tl-kb-item' + (m.id === cur.id ? ' on' : '') + '" href="' + href('knowledge', { a: m.id, q: q }) + '"><b>' + esc(m.title) + '</b><span>' + esc(m.summary) + '</span></a>';
        }).join('') : '<div class="ui-empty">No manual matches “' + esc(q) + '”.</div>') + '</nav></aside>' +
        '<div class="ui-card">' + art + '</div></div>';
    var qi = body.querySelector('#kb-q');
    qi.addEventListener('input', function () { var pos = qi.selectionStart; SCREEN.knowledge({ q: qi.value, a: params.a }, body); var nq = body.querySelector('#kb-q'); nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} });
    wireKbTabs();
  };
  // Knowledge Base → FAQ: searchable, grouped by topic. ?f=<id> opens one.
  function renderFaqTab(params, body, kbTabs) {
    var q = params.q || '';
    var list = q ? faqSearch(q).map(function (h) { return h.f; }) : FAQS;
    var groups = q ? '<div class="ui-card">' + (list.length ? list.map(function (f, i) { return faqItemHtml(f, i === 0 || f.id === params.f); }).join('') : '<div class="ui-empty">No FAQ matches “' + esc(q) + '”. Try Ask Tilli.</div>') + '</div>'
      : FAQ_TOPICS.map(function (t) {
          var fs = list.filter(function (f) { return f.topic === t; }); if (!fs.length) return '';
          return '<div class="ui-card mb-gap"><h3 class="ui-mod-title tl-faq-topic">' + esc(t) + '</h3>' + fs.map(function (f) { return faqItemHtml(f, f.id === params.f); }).join('') + '</div>';
        }).join('');
    body.innerHTML = screenHead('Knowledge Base', 'Manuals and FAQs for the Tilli team — how to do the common jobs in this dashboard.') + kbTabs +
      '<div class="tl-filters"><input class="input grow tl-filter-q" id="faq-q" placeholder="Search the FAQ…" value="' + esc(q) + '" aria-label="Search the FAQ">' +
        '<a class="btn btn-outline btn-sm" href="' + href('ask-tilli', {}) + '" style="text-decoration:none">Can’t find it? Ask Tilli →</a></div>' + groups;
    var qi = body.querySelector('#faq-q');
    qi.addEventListener('input', function () { var pos = qi.selectionStart; SCREEN.knowledge({ tab: 'faq', q: qi.value }, body); var nq = body.querySelector('#faq-q'); nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} });
    if (params.f) { var el = body.querySelector('#faq-' + params.f); if (el) el.scrollIntoView({ block: 'center' }); }
  }

  // ============================================================
  //  HELP (super admin) — ⓘ tooltips on titles / columns / KPIs,
  //  a Help button on every page (that page's FAQs + an ask box),
  //  and the FAQ list (Knowledge Base → FAQ, also used by Ask Tilli).
  //  Edit the wording in TIPS and FAQS below.
  // ============================================================
  // Visible text of a title, card heading, column header, KPI label or list
  // heading → what it means. Matched on the element's own text (counts ignored).
  var TIPS = {
    // screens
    'Control Room': 'Your start page: what needs the team’s attention right now, platform totals and the latest activity.',
    'Analytics': 'Portfolio-wide roll-ups — outcomes by country, curriculum boards and the completion ranking.',
    'All Schools': 'Every partner school, grouped by school group. Use the country switch, search, or the Archived tab.',
    'Change History': 'Every change to student records and assessments — by teachers, school admins, parents and the Tilli team. Filter by date range, type and school.',
    'Templates': 'One template per assessment. Each has a Baseline, Midline and Endline phase with its own questions and versions.',
    'Deployments': 'Assessments sent to schools, their results, and the links people use to take them.',
    'Teacher Reflection Questions': 'Questions teachers answer about themselves during dashboard onboarding. Edited here; not deployed.',
    'Users & Invitations': 'Everyone with a login (Users tab) and the invites sent to new school admins and teachers (Invitations tab).',
    'Users': 'Everyone with a login and their role. Change a role or remove access here.',
    'Invitations': 'Invites sent to school admins and teachers — pending, accepted or expired.',
    'Issue Reports': 'Problems reported from the apps, plus grouped auto-crash reports. Filter by status or school.',
    'Audit Trail': 'A permanent record of admin actions (archive, delete, publish…) by the Tilli team and the system — it can’t be edited.',
    'Deletion Logs': 'Read-only record of every deleted student — who deleted them and when.',
    'Merge Students': 'Combine duplicate student profiles. Suggestions never merge on their own — you always confirm.',
    'Knowledge Base': 'Manuals and FAQs for the Tilli team.',
    'Add Students': 'Add students by hand or paste a CSV. Rows are checked before anything is saved.',
    // cards
    'Needs attention': 'Queues that need action. Each card opens the filtered list behind its number.',
    'Recent activity': 'The 10 newest changes to student records and assessments across active schools. View all opens Change History.',
    'Outcomes by region': 'Average Social-Emotional and Cognitive band score (0–100) per country, across schools with results.',
    'Outcomes': 'Average Social-Emotional and Cognitive band score (0–100). Appears once a Midline or Endline is complete.',
    'Board mix': 'How many partner schools follow each curriculum board. A school with several boards counts under each one.',
    'Completion ranking': 'Schools — or school groups — ordered by assessment completion, highest first.',
    'Structure': 'Grades and sections with students added / expected. Teachers can add up to the expected size; more needs approval. Empty ones are removed automatically after ' + ORG.emptyStructureTtlDays + ' days.',
    'Class sizes': 'Expected class sizes across schools: new students a teacher asked to add over the size, and classes still missing students.',
    'Waiting for approval': 'A teacher added these children past their class’s expected size. They can already be assessed. Approve to confirm them (the class size goes up), or turn down a duplicate or a child who isn’t at the school.',
    'Scheduling rules': 'How Plan from calendar places Baseline, Midline and Endline. Changing a rule never moves dates that are already applied or deployed.',
    'Classes missing students': 'Classes with fewer students added than expected, with no expected size set, or with a size set automatically that no admin has confirmed. With no size set, teachers can’t add anyone without approval.',
    'Onboarding': 'Setup checks worked out automatically from the school’s data: missing students or staff, no live assessment, empty sections close to removal.',
    'Assessment progress': 'Each phase (Baseline, Midline, Endline): whether it’s deployed, its window and completion so far.',
    'Open issues': 'Unresolved problem reports from this school.',
    'Group links': 'One link per audience for the whole group — people pick their school first.',
    'School group links': 'One Parent and one Teacher link per group. People pick their school, then carry on as usual.',
    'Links to share': 'The links to send this school — parents, teachers and student assessments. Each opens straight into this school.',
    'School code': 'One code per school: it’s in every share link, and anyone who enters it joins the school as a Teacher — no invite needed.',
    'Staff at this school': 'School admins and teachers with access to this school.',
    'Teacher assessment log': 'Per teacher: Completed when every student in their sections is rated, In progress when some are, Not started when none are.',
    'Student assessment log': 'Per student: status of every student-facing (parent / direct) assessment deployed to the school.',
    'Student Directory': 'This school’s roster. 20 per page by default — change it with “Per page”.',
    'Merge history': 'Past merges. “0 re-linked” means no assessment data moved — worth a second look.',
    'Suggested duplicates': 'Profiles that look like the same child. Review each pair before merging.',
    'Deletion logs': 'Students deleted at this school, and by whom.',
    'Issue reports': 'Problem reports from this school’s users.',
    'Demo access & codes': 'Logins and codes for clicking through this demo school as each role.',
    // columns / KPIs / list headings
    'Completion': '% of expected assessment responses received (responses ÷ expected) across deployed assessments.',
    'Avg completion': 'Average completion of the group’s schools that have results. Schools still at MoU aren’t counted.',
    'Engagement': 'Recent use of Tilli: Active = steady use, Slowing = dropping off, Quiet = little or no use lately.',
    'Lowest school': 'The group’s school with the lowest completion — usually the first to follow up with.',
    'Responses': 'Responses received / responses expected.',
    'Chain': '⛓ = this assessment is chained after another and opens when the earlier one is done.',
    'Window': 'Start → end dates when the assessment is open.',
    'School Groups': 'Partner organisations that run more than one school.',
    'Active Schools': 'Schools that aren’t archived.',
    'Total Students': 'Students across all active schools.',
    'Staff Members': 'School group admins, school admins and teachers with an account, across active schools. Excludes the Tilli team and accounts with no role.',
    'School groups': 'Organisations running several schools. Open one to see its schools, links and CSVs.',
    'Independent schools': 'Schools that don’t belong to a school group.',
    'Archived groups': 'Groups archived as a whole — their schools are archived with them.',
    'Archived schools': 'Schools archived on their own. Their data is kept.',
  };
  var TIP_SELECTORS = '.ui-screen-title, .ui-mod-title, .ui-table th, .tl-kpi .lbl, .tl-listgroup-h';
  function ownText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return n.nodeValue.trim();
    return '';
  }
  function decorateTips(root) {
    if (GROUP) return;
    root.querySelectorAll(TIP_SELECTORS).forEach(function (el) {
      if (el.dataset.tipped) return;
      var key = ownText(el), t = TIPS[key];
      if (!t) return;
      el.dataset.tipped = '1';
      el.insertAdjacentHTML('beforeend', ' <span class="tl-tip" tabindex="0" role="button" aria-label="What does “' + esc(key) + '” mean?" data-tip="' + esc(t) + '">i</span>');
    });
  }
  // One floating bubble for every [data-tip] — positioned in JS so table /
  // card overflow never clips it. Hover or keyboard focus shows it; tap toggles.
  var tipBox = null, tipFor = null;
  function showTip(el) {
    if (!tipBox) { tipBox = document.createElement('div'); tipBox.className = 'tl-tipbox'; tipBox.setAttribute('role', 'tooltip'); document.body.appendChild(tipBox); }
    tipFor = el; tipBox.textContent = el.dataset.tip; tipBox.classList.add('show');
    var r = el.getBoundingClientRect(), b = tipBox.getBoundingClientRect(), pad = 8;
    var top = r.top - b.height - 8 < pad ? r.bottom + 8 : r.top - b.height - 8;
    var left = Math.min(window.innerWidth - b.width - pad, Math.max(pad, r.left + r.width / 2 - b.width / 2));
    tipBox.style.top = (top + window.scrollY) + 'px'; tipBox.style.left = (left + window.scrollX) + 'px';
  }
  function hideTip() { if (tipBox) tipBox.classList.remove('show'); tipFor = null; }
  function wireTips() {
    document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t && t !== tipFor) showTip(t); else if (!t && tipFor) hideTip(); });
    document.addEventListener('focusin', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); });
    document.addEventListener('focusout', hideTip);
    document.addEventListener('pointerdown', function (e) { if (tipFor && !(e.target.closest && e.target.closest('[data-tip]'))) hideTip(); });
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.tl-tip');
      if (!t) return;
      e.preventDefault(); e.stopPropagation();   // an ⓘ inside a link / clickable row shouldn't navigate
      showTip(t);   // tap shows it; tapping anywhere else hides it
    }, true);
    window.addEventListener('scroll', hideTip, true);
    // Screens re-render often (tabs, pagers, filters) — decorate whatever lands.
    var pending = false;
    new MutationObserver(function () { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; decorateTips(app); }); })
      .observe(app, { childList: true, subtree: true });
  }

  // ---- FAQ ----
  var FAQ_TOPICS = ['Numbers & data', 'Schools & groups', 'Students', 'Assessments & templates', 'Deployments & links', 'Issues & support', 'People & access', 'History & logs', 'Ask Tilli & help'];
  var FAQS = [
    { id: 'completion', topic: 'Numbers & data', q: 'What does “Completion” mean?', screens: ['analytics', 'schools', 'school', 'group', 'deployments'],
      a: 'The share of expected assessment responses a school has sent in: responses received ÷ responses expected, across the assessments deployed to it. 100% means everyone who was meant to respond has.' },
    { id: 'group-avg', topic: 'Numbers & data', q: 'How is a school group’s completion worked out?', screens: ['analytics', 'group'],
      a: 'It’s the plain average of the group’s schools that have some completion. Schools still at MoU aren’t counted, and big and small schools count the same.' },
    { id: 'outcomes', topic: 'Numbers & data', q: 'What do the Social-Emotional and Cognitive bars show?', screens: ['school', 'group', 'analytics'],
      a: 'The average band score (0–100) from the latest results. They appear once a Midline or Endline is complete — before that the card says there are no results yet.' },
    { id: 'engagement', topic: 'Numbers & data', q: 'What do Active, Slowing and Quiet mean?', screens: ['analytics', 'schools'],
      a: 'How much the school has used Tilli recently. Active = steady use, Slowing = use is dropping, Quiet = little or no use lately. Quiet schools are good follow-up candidates.' },
    { id: 'add-school', topic: 'Schools & groups', q: 'How do I add a new school?', screens: ['schools', 'controlroom'],
      a: 'All Schools → + Add School. The wizard asks for the profile, rollout, grades & sections and the school admin, then opens the new school’s page with its codes ready.' },
    { id: 'find-school', topic: 'Schools & groups', q: 'How do I find a school quickly?', screens: ['controlroom', 'schools'],
      a: 'Type in “Find a school” on the Control Room and pick it from the list. On All Schools you can also search by name or code, or use the country switch.' },
    { id: 'setup-flags', topic: 'Schools & groups', q: 'What do the warnings on a school (0 students, No active deployment…) mean?', screens: ['school', 'schools'],
      a: 'They’re setup checks worked out automatically from the school’s data — nobody ticks them off. They clear on their own once students or staff are added, or an assessment goes live.' },
    { id: 'empty-sections', topic: 'Schools & groups', q: 'Why is a grade or section about to be removed?', screens: ['school', 'schools'],
      a: 'Grades and sections with no students ' + ORG.emptyStructureTtlDays + ' days after they were added are removed automatically. If the school needs one again, open Settings → Manage grades / sections → Add back — it gets a fresh ' + ORG.emptyStructureTtlDays + ' days.' },
    { id: 'archive-vs-delete', topic: 'Schools & groups', q: 'What’s the difference between archiving and deleting a school?', screens: ['school', 'schools'],
      a: 'Archiving hides the school from active lists and pauses its deployments and links, but keeps all data — you can un-archive any time. Deleting removes it for good and is only allowed once it’s archived.' },
    { id: 'archive-group', topic: 'Schools & groups', q: 'What happens when I archive a school group?', screens: ['group', 'schools'],
      a: 'Every school in the group is archived with it and the group admin sees an “archived” notice. Un-archiving the group restores only the schools archived with it.' },
    { id: 'unarchive-blocked', topic: 'Schools & groups', q: 'Why can’t I un-archive a school?', screens: ['school', 'schools'],
      a: 'Its school group is archived. Un-archive the group first, or move the school to another group in Edit.' },
    { id: 'csv-students', topic: 'Students', q: 'How do I add a lot of students at once?', screens: ['school', 'add-students'],
      a: 'School page → Students → + Add Students → CSV import. Paste or upload the CSV; every row is checked and you see a preview before anything is saved.' },
    { id: 'merge', topic: 'Students', q: 'How are duplicate students merged?', screens: ['merge', 'school'],
      a: 'Merge Students lists likely duplicates. Review each pair side by side and confirm by typing MERGE — nothing merges automatically. Assessment data moves to the profile you keep.' },
    { id: 'deleted', topic: 'Students', q: 'Where can I see students who were deleted?', screens: ['deletion', 'school', 'audit'],
      a: 'Audit Trail → Deletion Logs for everyone, or a school’s Issues & Logs tab for that school. Each row shows who deleted the student and when.' },
    { id: 'per-page', topic: 'Students', q: 'Can I show more students per page?', screens: ['school'],
      a: 'Yes — under the Students list, change “Per page” to 20, 50 or 100. Your choice is remembered in this browser.' },
    { id: 'phase-status', topic: 'Assessments & templates', q: 'What do Scheduled, Live, Ended and Completed mean on a phase?', screens: ['school', 'deployments'],
      a: 'They come from the phase dates and real responses — nobody sets them by hand. Scheduled = deployed but the start date is ahead. Live = inside the dates. Ended = the end date has passed but not everyone finished. Completed = every expected response is in.' },
    { id: 'chain-order', topic: 'Assessments & templates', q: 'Does the order of assessments in a phase matter?', screens: ['school'],
      a: 'You decide per assessment. Each audience row has two groups: In order (a sequence — #2 only opens for a child once #1 is done; in the parent app later ones show “Locked — opens after …”) and Any time (open as soon as the phase is live). One audience can mix both. At school and at home each have one sequence that can mix audiences (e.g. teacher observation → direct task at school, parent survey → direct task at home), and they never wait on each other. Use ⋯ → “Add to the in-order sequence” / “Make it any time”, or drag between the two groups.' },
    { id: 'where-runs', topic: 'Assessments & templates', q: 'Can an assessment run at school or at home?', screens: ['school', 'templates', 'deployments'],
      a: 'It depends on the audience. Teacher assessments always run at school and parent assessments always at home. Student direct assessments can be either: at school the teacher runs it, at home a parent does it with the child (it shows in the parent app). Turning one on asks which; change it later from its ⋯ menu.' },
    { id: 'phase-dates', topic: 'Assessments & templates', q: 'How do I schedule a phase or change its dates?', screens: ['school'],
      a: 'Set the phase’s Start and End dates on its card, then Deploy phase. It shows as Scheduled until the start date, goes Live on it, and closes after the end date. You can change both dates any time — even after deploying — and the status updates itself.' },
    { id: 'add-assessment', topic: 'Assessments & templates', q: 'What’s the difference between “Deploy phase” and “+ Add assessment”?', screens: ['school'],
      a: 'Deploy phase sends a whole phase (Baseline, Midline or Endline) with all the assessments turned on in it. + Add assessment puts one more assessment from Templates into a phase — if that phase is already deployed, it joins straight away at the end of its audience’s chain.' },
    { id: 'which-template', topic: 'Assessments & templates', q: 'Which version does a deployment use?', screens: ['templates', 'deployments'],
      a: 'There’s one template per assessment — pick it and the phase. The deployment uses that phase’s live version and keeps it for the whole window, even if a newer version is published later.' },
    { id: 'archive-template', topic: 'Assessments & templates', q: 'What does archiving a template do?', screens: ['templates'],
      a: 'It moves to the Archived tab and can’t be picked for new deployments. Existing deployments and results aren’t touched, and you can un-archive it any time.' },
    { id: 'teacher-log', topic: 'Assessments & templates', q: 'How do I see which teachers haven’t finished?', screens: ['school', 'deployments'],
      a: 'School page → Assessments → Teacher assessment log. Each teacher shows Completed, In progress (x/y) or Not started for every teacher assessment. You can also ask Ask Tilli “who hasn’t completed at [school]”.' },
    { id: 'logs-diff', topic: 'Assessments & templates', q: 'What’s the difference between the Teacher and Student assessment logs?', screens: ['school'],
      a: 'The Teacher log has one row per teacher for teacher assessments. The Student log has one row per student for parent and direct (student) assessments.' },
    { id: 'links', topic: 'Deployments & links', q: 'Where do I find the links to send a school?', screens: ['school', 'group', 'deployments'],
      a: 'Open the school → Assessments → Links to share: one for parents, one for teachers and one for student assessments. For a school group, the group’s page has one Parent and one Teacher link for every school in it.' },
    { id: 'direct-link', topic: 'Deployments & links', q: 'Why is there no group link for Direct Assessment?', screens: ['school', 'group'],
      a: 'Student assessments run on a classroom device for one school, so each school has its own student link (on the school’s Assessments tab).' },
    { id: 'exports', topic: 'Deployments & links', q: 'How do I export data?', screens: ['schools', 'group', 'deployments', 'school'],
      a: 'All Schools → Schools CSV (the current view); a group page → Assessments CSV and Staff CSV; a school → Assessments → results CSV and Teacher assessment log CSV; Deployments → Results → Download CSV; Ask Tilli follow-up reports → CSV.' },
    { id: 'issue-count', topic: 'Issues & support', q: 'How are open issues counted on school cards?', screens: ['issues', 'schools'],
      a: 'Each open report from a person counts once. Auto-crash reports count once per crash type, however many times it happened.' },
    { id: 'issue-reply', topic: 'Issues & support', q: 'Can I reply to the person who reported an issue?', screens: ['issues'],
      a: 'Not from the dashboard yet. Change the status as you work (Open → Investigating → Resolved) and contact the reporter directly.' },
    { id: 'teacher-join', topic: 'People & access', q: 'How do teachers join a school?', screens: ['school', 'users', 'invitations'],
      a: 'Share the school code (School page → Staff & Access). Anyone who enters it joins as a Teacher. You can also send a named invitation.' },
    { id: 'group-admin', topic: 'People & access', q: 'What does a school group admin see?', screens: ['group', 'users'],
      a: 'A group overview, Change History and read-only school pages for their group only. Use “Group admin view →” on the group page to see exactly what they see.' },
    { id: 'history-range', topic: 'History & logs', q: 'How far back does Change History go?', screens: ['history'],
      a: 'It opens on the past 7 days. Switch to Past 30 days, a Custom range (From / To), or All time.' },
    { id: 'history-vs-audit', topic: 'History & logs', q: 'What’s the difference between Change History and the Audit Trail?', screens: ['history', 'audit'],
      a: 'Change History is every change to student records and assessments, by anyone. The Audit Trail is admin actions — archive, delete, publish, role changes — by the Tilli team and the system.' },
    { id: 'ask-tilli', topic: 'Ask Tilli & help', q: 'What can Ask Tilli answer?', screens: ['ask-tilli', 'controlroom'],
      a: 'Completion for a school, group, country or everyone; who hasn’t finished at a school; the lowest schools; follow-up reports with coordinator emails (CSV or copy); and how-to questions from the manuals and these FAQs.' },
    { id: 'help', topic: 'Ask Tilli & help', q: 'Where do I find help on a page?', screens: ['controlroom', 'knowledge'],
      a: 'Hover the ⓘ next to a title, column or number for a one-line explanation. The ? Help button at the top of each page lists that page’s FAQs and lets you ask a question.' },
  ];
  var FAQ_STOP = ['how', 'the', 'can', 'and', 'for', 'what', 'where', 'does', 'why', 'this', 'that', 'with', 'are', 'there', 'mean', 'means', 'do', 'is', 'my', 'our'];
  function faqWords(t) { return String(t || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2 && FAQ_STOP.indexOf(w) < 0; }); }
  // Score = words found in the question (2) or answer (1), plus a bonus for how
  // much of the FAQ's own question the user's words cover — so “what does
  // completion mean” lands on the Completion FAQ, not every FAQ mentioning it.
  function faqSearch(q) {
    var words = faqWords(q);
    if (!words.length) return [];
    return FAQS.map(function (f) {
      var qq = f.q.toLowerCase(), aa = (f.a + ' ' + f.topic).toLowerCase(), own = faqWords(f.q);
      var base = words.reduce(function (n, w) { return n + (qq.indexOf(w) >= 0 ? 2 : 0) + (aa.indexOf(w) >= 0 ? 1 : 0); }, 0);
      var cover = own.length ? own.filter(function (w) { return words.some(function (u) { return u.indexOf(w) === 0 || w.indexOf(u) === 0; }); }).length / own.length : 0;
      return { f: f, score: base ? base + Math.round(cover * 4) : 0 };
    }).filter(function (x) { return x.score; }).sort(function (a, b) { return b.score - a.score; });
  }
  function faqItemHtml(f, open) {
    return '<details class="tl-faq"' + (open ? ' open' : '') + ' id="faq-' + f.id + '"><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>';
  }
  var SCREEN_TITLES = { controlroom: 'Control Room', analytics: 'Analytics', schools: 'All Schools', group: 'School group', school: 'School page', history: 'Change History',
    templates: 'Templates', template: 'Template', deployments: 'Deployments', reflection: 'Teacher Reflection Questions', users: 'Users', invitations: 'Invitations', issues: 'Issue Reports',
    audit: 'Audit Trail', deletion: 'Deletion Logs', merge: 'Merge Students', 'add-students': 'Add Students', 'class-sizes': 'Class sizes', knowledge: 'Knowledge Base', student: 'Student report', observation: 'Observation Form' };

  // ---- Help panel (? Help on every page) ----
  function helpBtnHtml() { return GROUP ? '' : '<button class="btn btn-ghost btn-sm tl-help-btn" data-help title="Help and FAQs for this page" aria-label="Help for this page">?<span> Help</span></button>'; }
  function closeHelp() { var p = document.getElementById('tl-help'); if (p) p.remove(); document.removeEventListener('keydown', helpKey); }
  function helpKey(e) { if (e.key === 'Escape') closeHelp(); }
  function openHelp() {
    closeHelp();
    var r = currentRoute(), key = r.screen, title = SCREEN_TITLES[key] || 'This page';
    var list = FAQS.filter(function (f) { return f.screens.indexOf(key) >= 0; });
    if (!list.length) list = FAQS.filter(function (f) { return f.topic === 'Ask Tilli & help'; });
    var p = document.createElement('div'); p.id = 'tl-help'; p.className = 'tl-help';
    p.innerHTML = '<button class="tl-help-scrim" data-help-close aria-label="Close help"></button>' +
      '<aside class="tl-help-panel" role="dialog" aria-label="Help">' +
        '<div class="tl-help-h"><div><div class="ui-eyebrow">Help</div><h2>' + esc(title) + '</h2></div><button class="tl-help-x" data-help-close aria-label="Close">×</button></div>' +
        '<form class="tl-help-ask" data-help-ask><input class="input" placeholder="Ask a question about this dashboard…" aria-label="Ask a question"><button class="btn btn-primary btn-sm" type="submit">Ask</button></form>' +
        '<div class="tl-help-answer" id="tl-help-answer"></div>' +
        '<div class="tl-help-sec">Common questions here</div>' + list.map(function (f) { return faqItemHtml(f, false); }).join('') +
        '<div class="tl-help-foot"><a class="btn-link" href="' + href('knowledge', { tab: 'faq' }) + '" data-help-close>All FAQs →</a>' +
          '<a class="btn-link" href="' + href('knowledge', {}) + '" data-help-close>Manuals →</a>' +
          '<a class="btn-link" href="' + href('ask-tilli', {}) + '" data-help-close>Open Ask Tilli →</a></div>' +
      '</aside>';
    document.body.appendChild(p);
    p.querySelectorAll('[data-help-close]').forEach(function (b) { b.addEventListener('click', closeHelp); });
    document.addEventListener('keydown', helpKey);
    var inp = p.querySelector('[data-help-ask] input'), ans = p.querySelector('#tl-help-answer');
    function ask(q) {
      q = String(q || '').trim(); if (!q) return;
      // Same routing as Ask Tilli: dashboard questions → FAQ, data questions →
      // completion / who hasn't finished / reports.
      var a = platformAskAnswer(q, 'all');
      var html = '<div class="tl-help-tilli">' + a.html + (a.csv ? '<p class="tl-muted">Open this in Ask Tilli to download the CSV.</p>' : '') +
        (a.sugs && a.sugs.length ? '<div class="tl-ask-sugs">' + a.sugs.map(function (sq) { return '<button class="askx-sug" data-help-try="' + esc(sq) + '">' + esc(sq) + '</button>'; }).join('') + '</div>' : '') + '</div>';
      ans.innerHTML = html + '<button class="btn-link tl-help-more" data-help-more>Continue in Ask Tilli →</button>';
      ans.querySelectorAll('[data-help-try]').forEach(function (b) { b.addEventListener('click', function () { inp.value = b.dataset.helpTry; ask(inp.value); }); });
      ans.querySelectorAll('[data-askcsv],[data-askcopy]').forEach(function (b) { b.remove(); });
      ans.querySelectorAll('[data-askgo]').forEach(function (b) { b.addEventListener('click', function () { closeHelp(); go(b.dataset.askgo, b.dataset.askparams ? JSON.parse(b.dataset.askparams) : {}); }); });
      ans.querySelector('[data-help-more]').addEventListener('click', function () { closeHelp(); askp.chatId = null; go('ask-tilli', {}); askpSend(q); });
    }
    p.querySelector('[data-help-ask]').addEventListener('submit', function (e) { e.preventDefault(); ask(inp.value); });
    inp.focus();
  }
  function wireHelp() {
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-help]'); if (b) { e.preventDefault(); openHelp(); } });
  }

  // ============================================================
  //  ASK TILLI — platform team (#9 / #10). Scripted, rule-based
  //  answers over the portfolio data (same idea as the school
  //  admin's askAnswer in admin.js): completion for a school /
  //  group / country / everyone, who hasn't finished, lowest
  //  schools, follow-up reports (CSV / copy), and how-to links.
  //  Swap platformAskAnswer for a model call later.
  // ============================================================
  var ASKP_KEY = 'tilliMeasures.platformChats.' + (me.email || 'team');
  var askp = { chatId: null, scope: 'all', thinking: false, histCollapsed: false, histOpen: false };
  var pchats = (function () { try { var v = JSON.parse(localStorage.getItem(ASKP_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } })();
  function savePchats() { try { localStorage.setItem(ASKP_KEY, JSON.stringify(pchats)); } catch (e) { /* private mode — history won't persist */ } }
  function curPchat() { return pchats.find(function (c) { return c.id === askp.chatId; }) || null; }
  var alu = function (d, size) { return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var ALU = {
    spark: alu('<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>', 40),
    msg: alu('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 17),
    trash: alu('<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>', 17),
    plus: alu('<path d="M5 12h14M12 5v14"/>', 18),
    collapse: alu('<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>', 18),
    panel: alu('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>', 18),
    pin: alu('<path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>', 14),
    share: alu('<path d="M12 3v12M17 8l-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', 18),
    send: alu('<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.63l-19 6.5a.5.5 0 0 0-.02.93l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>', 20),
  };
  var ASK_FOLLOWUP_DEFAULT = 50;   // % completion under which a school goes on a follow-up report

  // ---- scope + entity matching ----
  function askScopeInfo(scope) {
    var k = String(scope || 'all'), id = k.slice(2);
    if (k.indexOf('s:') === 0 && ORG.byId(id)) return { kind: 'school', school: ORG.byId(id), label: ORG.byId(id).name };
    if (k.indexOf('g:') === 0) { var g = ORG.groupById(id); if (g && g.id === id) return { kind: 'group', group: g, label: g.name }; }
    if (k.indexOf('c:') === 0) return { kind: 'country', country: id, label: id };
    return { kind: 'all', label: 'Whole portfolio' };
  }
  function askFindSchool(ql) {
    var best = null, bestScore = 0, firstWord = {};
    ORG.schools.forEach(function (s) { var w = s.name.toLowerCase().split(' ')[0]; firstWord[w] = (firstWord[w] || 0) + 1; });
    ORG.schools.forEach(function (s) {
      var nm = s.name.toLowerCase(), w = nm.split(' ')[0], score = 0;
      if (ql.indexOf(nm) >= 0) score = 100 + nm.length;
      else if (ql.indexOf(s.code.toLowerCase()) >= 0) score = 90;
      else if (nm.split(' ').length > 1 && ql.indexOf(nm.split(' ').slice(0, 2).join(' ')) >= 0) score = 50;
      else if (w.length >= 5 && firstWord[w] === 1 && new RegExp('\\b' + w + '\\b').test(ql)) score = 20;
      if (score > bestScore) { bestScore = score; best = s; }
    });
    return best;
  }
  function askFindCountry(ql) {
    var cs = {}; ORG.schools.forEach(function (s) { if (s.country) cs[s.country] = 1; });
    return Object.keys(cs).find(function (c) { return ql.indexOf(c.toLowerCase()) >= 0; }) || null;
  }
  function askFindGroup(ql) {
    var q2 = ql.replace(/sri lanka/g, ' ');
    return ORG.groups.find(function (g) {
      if (g.id === 'g-none') return false;
      return q2.indexOf(g.name.toLowerCase()) >= 0 || (g.code && new RegExp('\\b' + g.code + '\\b').test(q2));
    }) || null;
  }
  // Schools a group / country / portfolio scope covers (active only).
  function askSchoolsFor(t) {
    return ORG.activeSchools().filter(function (s) {
      if (t.kind === 'group') return s.groupId === t.group.id;
      if (t.kind === 'country') return s.country === t.country;
      if (t.kind === 'school') return s.id === t.school.id;
      return true;
    });
  }
  // Schools with assessments running (any completion yet).
  function askRunning(list) { return list.filter(function (s) { return (s.completion || 0) > 0; }); }
  function askAvg(list) { var xs = askRunning(list); return xs.length ? Math.round(xs.reduce(function (a, s) { return a + (s.completion || 0); }, 0) / xs.length) : 0; }
  function askLinkBtn(screen, label, params) {
    return '<button class="btn-link" data-askgo="' + esc(screen) + '"' + (params ? ' data-askparams="' + esc(JSON.stringify(params)) + '"' : '') + '>' + esc(label) + ' →</button>';
  }
  function askSrc(txt) { return '<div class="tl-ask-src">' + esc(txt) + '</div>'; }
  function askTable(head, rows) {
    return '<div class="tl-ask-tbl"><table><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function askLatestTeacherCol(s) {
    var tr = teacherRosterFor(s, ORG.server.schoolSummary(s.id));
    if (!tr.cols.length) return null;
    var ci = tr.cols.length - 1;
    return { label: tr.cols[ci].label, teachers: tr.teachers.map(function (t) { return { name: t.name, email: t.email, sections: t.sections, cell: t.cells[ci] }; }) };
  }

  // ---- intents ----
  function askAnsSchool(s) {
    var res = ORG.results.filter(function (r) { return r.schoolId === s.id; });
    var rows = res.map(function (r) { return [esc(r.assessment), esc(r.audience), r.responses + ' / ' + r.expected, '<b>' + pct(r.completion) + '%</b>', esc(r.status)]; });
    // Schools on the shared store: one row per deployed phase × audience, live numbers.
    if ((s.created || s.live) && window.TilliAPI) {
      var API = window.TilliAPI, ids = API.studentsForSchool(s.id).map(function (x) { return x.student_id; });
      res = API.getDeployments(s.id).sort(function (a, b) { return TL_PHASES.indexOf(a.phase) - TL_PHASES.indexOf(b.phase); });
      rows = res.map(function (d) {
        var c = API.completionStats(s.id, d.phase, d.audience, ids), k = API.childrenDone(s.id, d.phase, ids, { audience: d.audience });
        return [esc(d.phase + ' · ' + (d.assessments || []).filter(function (a) { return !a.perTeacher; }).map(function (a) { return a.name; }).join(', ')), esc(d.audience), c.done + ' / ' + c.expected, '<b>' + (k.pct == null ? '—' : k.done + ' of ' + k.total) + '</b>', esc(d.status)];
      });
    }
    return '<p><b>' + esc(s.name) + '</b> is at <b>' + pct(s.completion || 0) + '%</b> completion overall.</p>' +
      (rows.length ? askTable(['Assessment', 'Audience', 'Responses', (s.created || s.live) && window.TilliAPI ? 'Children done' : 'Done', 'Status'], rows) : '<p>No assessments deployed here yet.</p>') +
      '<div class="tl-ask-acts">' + askLinkBtn('school', 'Open ' + s.name, { id: s.id, tab: 'assessments' }) + '</div>' + askSrc('From Deployments → Results · ' + res.length + ' deployment' + (res.length === 1 ? '' : 's'));
  }
  function askAnsSet(t) {
    var list = askSchoolsFor(t), run = askRunning(list);
    if (!list.length) return '<p>No active schools in ' + esc(t.label) + '.</p>';
    var low = run.slice().sort(function (a, b) { return (a.completion || 0) - (b.completion || 0); }).slice(0, 5);
    var bands = [[75, 101, 'on track (75%+)'], [50, 75, 'midway (50–74%)'], [0, 50, 'behind (under 50%)']].map(function (b) {
      var n = run.filter(function (s) { var c = s.completion || 0; return c >= b[0] && c < b[1]; }).length; return n + ' ' + b[2];
    });
    var notStarted = list.length - run.length;
    var link = t.kind === 'group' ? askLinkBtn('group', 'Open ' + t.label, { id: t.group.id }) : askLinkBtn('analytics', 'Open Analytics');
    return '<p><b>' + esc(t.label) + '</b>: average completion <b>' + askAvg(list) + '%</b> across ' + run.length + ' school' + (run.length === 1 ? '' : 's') + ' with assessments running' +
      (notStarted ? ' (' + notStarted + ' not started yet)' : '') + '.</p><p>' + bands.join(' · ') + '.</p>' +
      (low.length ? '<p>Lowest first:</p>' + askTable(['School', 'Done'], low.map(function (s) { return ['<button class="btn-link" data-askgo="school" data-askparams="' + esc(JSON.stringify({ id: s.id })) + '">' + esc(s.name) + '</button>', '<b>' + pct(s.completion || 0) + '%</b>']; })) : '') +
      '<div class="tl-ask-acts">' + link + '</div>' + askSrc('From school completion · n=' + run.length);
  }
  function askAnsWho(s) {
    var col = askLatestTeacherCol(s);
    var parts = ['<p>At <b>' + esc(s.name) + '</b>:</p>'];
    if (col) {
      var ns = col.teachers.filter(function (t) { return t.cell.status === 'Not started'; });
      var ip = col.teachers.filter(function (t) { return t.cell.status === 'In progress'; });
      parts.push('<p><b>' + ns.length + '</b> teacher' + (ns.length === 1 ? ' hasn’t' : 's haven’t') + ' started <b>' + esc(col.label) + '</b>' + (ip.length ? ', and ' + ip.length + ' ' + (ip.length === 1 ? 'is' : 'are') + ' part-way through' : '') + '.</p>');
      if (ns.length || ip.length) parts.push(askTable(['Teacher', 'Sections', 'Status'], ns.concat(ip).slice(0, 12).map(function (t) {
        return [esc(t.name) + '<br><small>' + esc(t.email) + '</small>', esc(t.sections.join(', ') || '—'), esc(t.cell.status) + (t.cell.status === 'In progress' ? ' · ' + t.cell.done + '/' + t.cell.expected : '')];
      })));
    } else parts.push('<p>No teacher assessments are deployed here yet.</p>');
    var fam = ORG.results.filter(function (r) { return r.schoolId === s.id && r.audience !== 'Teacher' && r.status !== 'Scheduled'; });
    if (fam.length) parts.push('<p>Students / parents still outstanding: ' + fam.map(function (r) { return esc(r.assessment) + ' <b>' + Math.max(0, r.expected - r.responses) + '</b> of ' + r.expected; }).join(' · ') + '.</p>');
    parts.push('<div class="tl-ask-acts">' + askLinkBtn('school', 'Open the teacher assessment log', { id: s.id, tab: 'assessments' }) + '</div>' + askSrc('From the school’s Teacher assessment log and Results'));
    return parts.join('');
  }
  // Follow-up report: schools under the threshold in scope → table + CSV/copy payload.
  function askAnsReport(t, threshold) {
    var list = askRunning(askSchoolsFor(t)).filter(function (s) { return (s.completion || 0) < threshold; })
      .sort(function (a, b) { return (a.completion || 0) - (b.completion || 0); });
    if (!list.length) return { html: '<p>Good news — no school in <b>' + esc(t.label) + '</b> is below ' + threshold + '% completion.</p>' };
    var rows = list.map(function (s) {
      var col = askLatestTeacherCol(s), ns = col ? col.teachers.filter(function (x) { return x.cell.status === 'Not started'; }).length : 0;
      return { s: s, ns: ns, issues: ORG.server.openIssueCount(s.id) };
    });
    var csv = { name: 'follow-up-' + t.label.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-below-' + threshold + '.csv',
      headers: ['School', 'Code', 'Group', 'Country', 'Completion %', 'Coordinator', 'Coordinator email', 'Teachers not started', 'Open issues'],
      rows: rows.map(function (r) { var s = r.s; return [s.name, s.code, s.groupName, s.country, s.completion || 0, s.coordinator ? s.coordinator.name : '', s.coordinator ? s.coordinator.email : '', r.ns, r.issues]; }) };
    var text = 'Follow-up: ' + t.label + ' — schools below ' + threshold + '% completion\n' + rows.map(function (r) {
      var s = r.s; return '• ' + s.name + ' — ' + (s.completion || 0) + '% — ' + (s.coordinator ? s.coordinator.name + ' <' + s.coordinator.email + '>' : 'no coordinator') + (r.ns ? ' — ' + r.ns + ' teacher' + (r.ns === 1 ? '' : 's') + ' not started' : '');
    }).join('\n');
    var shown = rows.slice(0, 10);
    var html = '<p><b>Follow-up report</b> — ' + rows.length + ' school' + (rows.length === 1 ? '' : 's') + ' in <b>' + esc(t.label) + '</b> below ' + threshold + '% completion:</p>' +
      askTable(['School', 'Done', 'Coordinator', 'Teachers not started'], shown.map(function (r) {
        var s = r.s; return ['<button class="btn-link" data-askgo="school" data-askparams="' + esc(JSON.stringify({ id: s.id })) + '">' + esc(s.name) + '</button>', '<b>' + pct(s.completion || 0) + '%</b>',
          s.coordinator ? esc(s.coordinator.name) + '<br><small>' + esc(s.coordinator.email) + '</small>' : '—', String(r.ns)];
      })) + (rows.length > shown.length ? '<p class="tl-ask-more">…and ' + (rows.length - shown.length) + ' more in the CSV.</p>' : '') +
      '<div class="tl-ask-acts"><button class="btn btn-outline btn-sm" data-askcsv>↓ Download CSV</button><button class="btn btn-outline btn-sm" data-askcopy>Copy as text</button></div>' +
      askSrc('From school completion, coordinators and Teacher assessment logs');
    return { html: html, csv: csv, text: text };
  }
  function askSuggestions(scope) {
    var t = askScopeInfo(scope);
    if (t.kind === 'school') return ['Completion at ' + t.label, 'Who hasn’t completed at ' + t.label + '?', 'Follow-up report for ' + t.label];
    if (t.kind === 'group' || t.kind === 'country') return ['How is ' + t.label + ' doing?', 'Lowest completion in ' + t.label, 'Follow-up report for ' + t.label + ' below 50%'];
    return ['What’s the completion at Sunrise Public School?', 'How is Vidya Trust doing?', 'Which teachers haven’t started at Greenfield?', 'Follow-up report for schools below 50%', 'Lowest completion in Sri Lanka', 'How do I archive a school group?'];
  }
  function platformAskAnswer(q, scope) {
    var ql = ' ' + String(q || '').toLowerCase() + ' ';
    var base = askScopeInfo(scope);
    var school = askFindSchool(ql), group = school ? null : askFindGroup(ql), country = (school || group) ? null : askFindCountry(ql);
    // What the question is about: a named entity wins over the picked scope.
    var target = school ? { kind: 'school', school: school, label: school.name }
      : group ? { kind: 'group', group: group, label: group.name }
      : country ? { kind: 'country', country: country, label: country } : base;
    var th = /(below|under|less than|lower than)\s*(\d{1,3})\s*%?/.exec(ql);
    var threshold = th ? Math.min(100, +th[2]) : ASK_FOLLOWUP_DEFAULT;

    // Questions about the dashboard itself (no school / group / country named) → FAQ.
    var faqTop = (school || group || country) ? null : faqSearch(q)[0];
    if (faqTop && faqTop.score >= 4 && /\b(what|why|how|where|can|does|is|which|when|difference|explain|meaning)\b/.test(ql)) {
      return { html: '<p><b>' + esc(faqTop.f.q) + '</b></p><p>' + esc(faqTop.f.a) + '</p><div class="tl-ask-acts">' + askLinkBtn('knowledge', 'More in the FAQ', { tab: 'faq', f: faqTop.f.id }) + '</div>' };
    }
    if (/\bhow (do|can|to|should)\b|\bwhere (do|can|is)\b|\bmanual|\bguide\b|\bsteps?\b/.test(ql)) {
      var ms = manualMatches(q).slice(0, 2);
      if (ms.length) return { html: '<p>Here’s the manual for that:</p>' + ms.map(function (m) {
        return '<div class="tl-ask-man"><b>' + esc(m.title) + '</b><ol>' + m.steps.slice(0, 3).map(function (st) { return '<li>' + esc(st.text) + '</li>'; }).join('') + '</ol>' + askLinkBtn('knowledge', 'Read the full manual', { a: m.id }) + '</div>';
      }).join('') };
    }
    if (/report|follow[ -]?up|chase|nudge|who (should|do) (we|i) (call|email|contact)/.test(ql)) return askAnsReport(target.kind === 'school' ? target : target, threshold);
    if (/who|which teachers?|not (yet )?(started|completed|done|finished)|haven.?t|hasn.?t|pending|outstanding|missing/.test(ql)) {
      if (target.kind === 'school') return { html: askAnsWho(target.school) };
      var lowS = askRunning(askSchoolsFor(target)).sort(function (a, b) { return (a.completion || 0) - (b.completion || 0); }).slice(0, 3);
      return { html: '<p>Which school? Teacher-level answers are per school. The lowest in <b>' + esc(target.label) + '</b> right now:</p>', sugs: lowS.map(function (s) { return 'Who hasn’t completed at ' + s.name + '?'; }) };
    }
    if (/lowest|behind|worst|weakest|at risk|struggl|bottom/.test(ql)) return { html: askAnsSet(target.kind === 'school' ? base : target) };
    if (/complet|progress|status|how (is|are)|doing|done|rate|%/.test(ql) || school || group || country) {
      return { html: target.kind === 'school' ? askAnsSchool(target.school) : askAnsSet(target) };
    }
    if (faqTop && faqTop.score >= 4) return { html: '<p><b>' + esc(faqTop.f.q) + '</b></p><p>' + esc(faqTop.f.a) + '</p><div class="tl-ask-acts">' + askLinkBtn('knowledge', 'More in the FAQ', { tab: 'faq', f: faqTop.f.id }) + '</div>' };
    return { html: '<p>I can answer completion questions for a school, a group, a country or the whole portfolio, list who hasn’t finished at a school, build follow-up reports, and point you to the manuals. Try one of these:</p>', sugs: askSuggestions(scope) };
  }

  function askpSend(text) {
    text = String(text || '').trim(); if (!text || askp.thinking) return;
    var c = curPchat();
    if (!c) { c = { id: 'c' + Date.now().toString(36), title: text.length > 60 ? text.slice(0, 59) + '…' : text, at: Date.now(), scope: askp.scope, thread: [] }; pchats.unshift(c); askp.chatId = c.id; }
    c.thread.push({ role: 'me', text: text }); c.at = Date.now(); savePchats();
    askp.thinking = true; render();
    setTimeout(function () {
      var a = platformAskAnswer(text, c.scope || 'all');
      c.thread.push({ role: 'tilli', html: a.html, sugs: a.sugs || null, csv: a.csv || null, text: a.text || null }); c.at = Date.now(); savePchats();
      askp.thinking = false;
      if (currentRoute().screen === 'ask-tilli') render();
    }, 600);
  }
  function askpExport() {
    var c = curPchat(); if (!c || !c.thread.length) return;
    var strip = function (h) { var d = document.createElement('div'); d.innerHTML = h; d.querySelectorAll('button').forEach(function (b) { b.remove(); }); return d.textContent.trim(); };
    var lines = ['Ask Tilli — ' + c.title, 'Answering about: ' + askScopeInfo(c.scope).label, 'Exported: ' + new Date().toLocaleString(), ''];
    c.thread.forEach(function (m) { lines.push((m.role === 'me' ? 'You' : 'Tilli') + ':', m.role === 'me' ? m.text : (m.text || strip(m.html)), ''); });
    var url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    var link = document.createElement('a'); link.href = url; link.download = 'ask-tilli-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  SCREEN['ask-tilli'] = function (params, body) {
    var c = curPchat(), weekAgo = Date.now() - 7 * 864e5;
    if (c) askp.scope = c.scope || askp.scope;
    var item = function (x) {
      return '<div class="askx-item' + (x.id === askp.chatId ? ' on' : '') + '">' +
        '<button class="askx-open focus" data-askx-open="' + esc(x.id) + '" title="' + esc(x.title) + '">' + ALU.msg + '<span>' + esc(x.title) + '</span></button>' +
        '<button class="askx-del focus" data-askx-del="' + esc(x.id) + '" aria-label="Delete chat: ' + esc(x.title) + '" title="Delete chat">' + ALU.trash + '</button></div>';
    };
    var grp = function (h, list) { return list.length ? '<div class="askx-gh">' + h + '</div>' + list.map(item).join('') : ''; };
    var recent = pchats.filter(function (x) { return x.at >= weekAgo; }), older = pchats.filter(function (x) { return x.at < weekAgo; });
    var opt = function (v, l) { return '<option value="' + esc(v) + '"' + (v === askp.scope ? ' selected' : '') + '>' + esc(l) + '</option>'; };
    var countries = {}; ORG.activeSchools().forEach(function (s) { if (s.country) countries[s.country] = 1; });
    var scopeOpts = opt('all', 'Whole portfolio') +
      '<optgroup label="School groups">' + ORG.activeGroups().filter(function (g) { return g.id !== 'g-none'; }).map(function (g) { return opt('g:' + g.id, g.name); }).join('') + '</optgroup>' +
      '<optgroup label="Countries">' + Object.keys(countries).sort().map(function (k) { return opt('c:' + k, k); }).join('') + '</optgroup>' +
      '<optgroup label="Schools">' + ORG.activeSchools().slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (s) { return opt('s:' + s.id, s.name); }).join('') + '</optgroup>';
    var thread = c ? c.thread : [];
    var bodyHTML = (thread.length || askp.thinking)
      ? '<div class="askx-thread">' + thread.map(function (m, i) {
          if (m.role === 'me') return '<div class="ask-msg user">' + esc(m.text) + '</div>';
          return '<div class="ask-msg tilli" data-msg="' + i + '">' + m.html +
            (m.sugs && m.sugs.length ? '<div class="tl-ask-sugs">' + m.sugs.map(function (sq) { return '<button class="askx-sug" data-askx-try="' + esc(sq) + '">' + esc(sq) + '</button>'; }).join('') + '</div>' : '') + '</div>';
        }).join('') + (askp.thinking ? '<div class="ask-msg tilli ask-typing"><span></span><span></span><span></span></div>' : '') + '</div>'
      : '<div class="askx-empty"><span class="askx-spark">' + ALU.spark + '</span>' +
          '<h2>Hi! I’m Tilli 👋</h2>' +
          '<p>Ask me how schools are doing, who hasn’t finished, or for a follow-up report — so you can answer a school POC straight away.</p>' +
          '<div class="askx-try"><div class="askx-try-h">Try asking:</div>' +
            askSuggestions(askp.scope).map(function (sq) { return '<button class="askx-sug focus" data-askx-try="' + esc(sq) + '">' + esc(sq) + '</button>'; }).join('') +
          '</div></div>';
    body.innerHTML = '<div class="askx' + (askp.histOpen ? ' hist-open' : '') + (askp.histCollapsed ? ' collapsed' : '') + '">' +
      '<aside class="askx-hist" aria-label="Chat history">' +
        '<div class="askx-hist-top"><button class="btn btn-primary block askx-new focus" data-askx-new>' + ALU.plus + ' New Chat</button>' +
          '<button class="askx-tool askx-collapse focus" data-askx-collapse aria-label="Hide chat history" title="Hide chat history">' + ALU.collapse + '</button></div>' +
        '<div class="askx-list">' + (pchats.length ? grp('This week', recent) + grp('Earlier', older) : '<div class="askx-none">No chats yet — ask your first question.</div>') + '</div>' +
        (pchats.length ? '<button class="askx-clear focus" data-askx-clear>' + ALU.trash + ' Clear all history</button>' : '') +
      '</aside>' +
      '<button class="askx-scrim" data-askx-hist aria-label="Close chat history"></button>' +
      '<section class="askx-main">' +
        '<div class="askx-scope">' +
          '<button class="askx-tool askx-histbtn focus" data-askx-hist aria-label="Show chat history" title="Show chat history">' + ALU.panel + '</button>' +
          '<label class="askx-scope-l" for="askp-scope-sel" title="Answering about">' + ALU.pin + '<span>Answering about</span></label>' +
          '<select id="askp-scope-sel" class="askx-select focus" data-askx-scope title="Questions that don’t name a school, group or country are answered for what you pick here">' + scopeOpts + '</select>' +
          '<div class="askx-tools"><button class="askx-tool focus" data-askx-export title="Export this chat as a text file" aria-label="Export this chat"' + (thread.length ? '' : ' disabled') + '>' + ALU.share + '</button></div>' +
        '</div>' +
        '<div class="askx-body">' + bodyHTML + '</div>' +
        '<div class="askx-foot"><form class="askx-compose" data-askx-form>' +
          '<input class="askx-input" placeholder="Ask about a school, a group or the whole portfolio…" autocomplete="off" aria-label="Message Ask Tilli">' +
          '<button class="askx-send" type="submit" aria-label="Send"' + (askp.thinking ? ' disabled' : '') + '>' + ALU.send + '</button></form>' +
          '<p class="askx-note">Scripted preview: answers are worked out from the dashboard’s own data.</p></div>' +
      '</section></div>';

    var ax = body.querySelector('.askx');
    var on = function (sel, fn, ev) { ax.querySelectorAll(sel).forEach(function (el) { el.addEventListener(ev || 'click', function (e) { fn(el, e); }); }); };
    var inp = ax.querySelector('.askx-input');
    var narrow = function () { return window.matchMedia('(max-width: 760px)').matches; };
    on('[data-askx-form]', function (f, e) { e.preventDefault(); askpSend(inp.value); }, 'submit');
    on('[data-askx-try]', function (b) { askpSend(b.dataset.askxTry); });
    on('[data-askx-new]', function () { askp.chatId = null; askp.histOpen = false; render(); });
    on('[data-askx-open]', function (b) { askp.chatId = b.dataset.askxOpen; askp.histOpen = false; render(); });
    on('[data-askx-del]', function (b) { pchats = pchats.filter(function (x) { return x.id !== b.dataset.askxDel; }); if (askp.chatId === b.dataset.askxDel) askp.chatId = null; savePchats(); render(); });
    on('[data-askx-clear]', function () { if (!confirm('Delete all your Ask Tilli chats? This can’t be undone.')) return; pchats = []; askp.chatId = null; savePchats(); render(); });
    on('[data-askx-scope]', function (sel) { askp.scope = sel.value; var cc = curPchat(); if (cc) { cc.scope = sel.value; savePchats(); } render(); }, 'change');
    on('[data-askx-export]', function () { askpExport(); });
    on('[data-askx-hist]', function () { if (narrow()) askp.histOpen = !askp.histOpen; else askp.histCollapsed = false; render(); });
    on('[data-askx-collapse]', function () { if (narrow()) askp.histOpen = false; else askp.histCollapsed = true; render(); });
    on('[data-askgo]', function (b) { var p = b.dataset.askparams ? JSON.parse(b.dataset.askparams) : {}; go(b.dataset.askgo, p); });
    on('[data-askcsv]', function (b) { var m = thread[+b.closest('[data-msg]').dataset.msg]; if (m && m.csv) downloadCsv(m.csv.name, m.csv.headers, m.csv.rows); });
    on('[data-askcopy]', function (b) { var m = thread[+b.closest('[data-msg]').dataset.msg]; if (m && m.text) copy(m.text, 'Report copied — paste it into an email or chat.'); });
    var bd = ax.querySelector('.askx-body'); bd.scrollTop = bd.scrollHeight;
    if (!askp.thinking) inp.focus();
  };

  // ============================================================
  //  CREATE FLOWS  (New Template / Deployment / Group)
  // ============================================================
  function openNewTemplate() {
    var audOpts = ['Teacher', 'Parent', 'Direct Assessment'].map(function (a) { return '<option>' + a + '</option>'; }).join('');
    openModal('New template', '<p class="tl-muted">Create an assessment template. <small class="tl-auditnote">Recorded in the Audit Trail.</small></p><div class="tl-stack">' +
      '<label class="field">Title<input class="input" id="nt-title" placeholder="e.g. Endline · Parent Report"></label>' +
      '<label class="field">Audience<select class="select" id="nt-aud">' + audOpts + '</select></label>' +

      '<label class="field">Description<input class="input" id="nt-desc" placeholder="Short description"></label>' +
      '</div>', function (close) {
        var title = (document.getElementById('nt-title').value || '').trim();
        if (!title) { toast('Title is required.'); return false; }
        var t = ORG.server.createTemplate({ title: title, audience: document.getElementById('nt-aud').value, desc: document.getElementById('nt-desc').value.trim() }, me.name);
        ORG.server.logAudit(me.name, 'template.create', t.title, 'template');
        close(); toast('Template “' + t.title + '” created — set up a phase to add questions.'); go('template', { id: t.id });
      }, 'Create template');
  }

  function openTemplateMenu(id) {
    var t = ORG.templates.find(function (x) { return x.id === id; }); if (!t) return;
    var onPage = currentRoute().screen === 'template';
    // Name as the title; phases under it; Edit-led actions; Archive + Delete set apart and quiet. × closes (no footer).
    openModal(t.title, '<div class="tl-tm-chips">' + audChip(t.audience) + tplPhasePills(t) + (t.archived ? statusPill('Archived', 'muted') : '') + '</div>' +
      '<div class="ws-review"><div class="ws-rev-row"><span>Created</span><b>' + esc(fmtMs(t.createdAt) + ' · ' + (t.createdBy || '—')) + '</b></div>' +
        '<div class="ws-rev-row"><span>Last edited</span><b>' + esc(fmtMs(t.updatedAt) + ' · ' + (t.updatedBy || '—')) + '</b></div></div>' +
      '<div class="tl-tm-main">' + (onPage ? '' : '<button class="btn btn-primary btn-sm" id="tm-open" title="Pick a phase to see or edit its questions">' + ICONS.edit + 'Open</button>') +
        '<button class="btn btn-' + (onPage ? 'primary' : 'outline') + ' btn-sm" id="tm-edit" title="Name, audience and description">Edit details</button>' +
        '<button class="btn btn-outline btn-sm" id="tm-dup" title="A new template whose phases start as drafts">Duplicate</button></div>' +
      '<div class="tl-tm-sub"><button class="btn-link" id="tm-arch" title="' + (t.archived ? 'Bring this template back to the active list.' : 'Hide the whole template from the active list and from new deployments. Nothing is deleted.') + '">' + (t.archived ? 'Un-archive' : 'Archive') + '</button>' +
        '<button class="btn-link danger tl-tm-del" id="tm-del" title="Delete permanently — you’ll be asked to confirm">' + ICONS.trash + 'Delete</button></div>', null);
    setTimeout(function () {
      var close = function () { document.getElementById('tl-modal-root').innerHTML = ''; };
      var op = document.getElementById('tm-open'); if (op) op.addEventListener('click', function () { close(); go('template', { id: t.id }); });
      document.getElementById('tm-edit').addEventListener('click', function () { openTemplateEditor(t); });
      document.getElementById('tm-dup').addEventListener('click', function () { var c = ORG.server.createTemplate({ title: t.title + ' (copy)', audience: t.audience, desc: t.desc }, me.name, t); ORG.server.logAudit(me.name, 'template.duplicate', c.title, 'template'); close(); toast('Duplicated — its phases start as drafts.'); go('template', { id: c.id }); });
      document.getElementById('tm-arch').addEventListener('click', function () {
        document.getElementById('tl-modal-root').innerHTML = '';
        var on = !t.archived;
        gated({ title: (on ? 'Archive ' : 'Un-archive ') + t.title,
          body: on ? '<p>Archived templates leave the active list and can’t be picked for new deployments. Existing deployments and results are untouched.</p>' : '<p>Bring <b>' + esc(t.title) + '</b> back to the active list.</p>',
          confirmLabel: on ? 'Archive template' : 'Un-archive', audit: { action: on ? 'template.archive' : 'template.unarchive', entity: t.title, entityType: 'template' },
          onConfirm: function () { ORG.server.archiveTemplate(t.id, on, me.name); toast('Template ' + (on ? 'archived.' : 'restored.')); go('templates', on ? {} : { view: 'archived' }); } });
      });
      document.getElementById('tm-del').addEventListener('click', function () { document.getElementById('tl-modal-root').innerHTML = ''; gated({ title: 'Delete template', danger: true, typed: 'DELETE', body: '<p>Delete <b>' + esc(t.title) + '</b>? This cannot be undone.</p>', confirmLabel: 'Delete template', audit: { action: 'template.delete', entity: t.title, entityType: 'template' }, onConfirm: function () { ORG.server.deleteTemplate(t.id); toast('Template deleted.'); go('templates', {}); } }); });
    }, 0);
  }

  // ---- Super-Admin editors (v1: full access — these actually write) ----
  function openTemplateEditor(t) {
    var audOpts = ['Teacher', 'Parent', 'Direct Assessment'].map(function (a) { return '<option' + (t.audience === a ? ' selected' : '') + '>' + a + '</option>'; }).join('');
    openModal('Edit template', '<div class="tl-stack">' +
      '<label class="field">Title<input class="input" id="et-title" value="' + esc(t.title) + '"></label>' +
      '<label class="field">Audience<select class="select" id="et-aud">' + audOpts + '</select></label>' +

      '<label class="field">Description<input class="input" id="et-desc" value="' + esc(t.desc) + '"></label>' +
      '</div>', function (close) {
        var title = (document.getElementById('et-title').value || '').trim(); if (!title) { toast('Title is required.'); return false; }
        ORG.server.updateTemplate(t.id, { title: title, audience: document.getElementById('et-aud').value, desc: document.getElementById('et-desc').value }, me.name);
        ORG.server.logAudit(me.name, 'template.edit', title, 'template');
        close(); toast('Template updated.'); tplAfterChange();
      }, 'Save changes');
  }

  function openSchoolEditor(s) {
    var groupOpts = ORG.groups.filter(function (g) { return !g.archived || g.id === s.groupId; }).map(function (g) { return '<option value="' + g.id + '"' + (s.groupId === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('');
    openModal('Edit school', '<div class="tl-stack">' +
      '<label class="field">School name<input class="input" id="es-name" value="' + esc(s.name) + '"></label>' +
      boardPickerHtml('es', boardStateFrom(schoolBoardList(s))) +
      '<label class="field">Type<input class="input" id="es-type" value="' + esc(s.type) + '"></label>' +
      '<div class="tl-fieldrow"><label class="field flex-1">Country *<select class="select" id="es-country">' + editCountryOpts(s.country) + '</select></label>' +
      '<label class="field flex-1">City *<select class="select" id="es-city">' + editCityOpts(s.country, s.city) + '</select></label></div>' +
      '<label class="field">Group<select class="select" id="es-group">' + groupOpts + '</select></label>' +
      '</div>', function (close) {
        var nm = (document.getElementById('es-name').value || '').trim(); if (!nm) { toast('School name is required.'); return false; }
        var bst = readBoardPicker('es'), bErr = boardError(bst); if (bErr) { toast(bErr); return false; }
        var country = (document.getElementById('es-country').value || '').trim(), city = (document.getElementById('es-city').value || '').trim();
        if (!country || !city) { toast('Country and city are required.'); return false; }
        ORG.server.updateSchool(s.id, { name: nm, boards: boardNames(bst), type: document.getElementById('es-type').value, city: city, country: country, region: country, groupId: document.getElementById('es-group').value });
        ORG.server.logAudit(me.name, 'school.edit', nm, 'school', s.id);
        close(); toast('School updated.'); go('school', { id: s.id });
      }, 'Save changes');
    wireBoardPicker('es');
    var esC = document.getElementById('es-country'), esCity = document.getElementById('es-city');
    esC.addEventListener('change', function () { esCity.innerHTML = editCityOpts(esC.value, ''); });
  }
  // Edit school uses the same Country → City lists as Add School; a value saved
  // before the lists existed stays selectable so nothing is lost on save.
  function editCountryOpts(cur) {
    var list = ADD_COUNTRIES.slice(); if (cur && list.indexOf(cur) < 0) list.push(cur);
    return list.map(function (c) { return '<option value="' + esc(c) + '"' + (c === cur ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
  }
  function editCityOpts(country, cur) {
    var list = (ADD_CITIES[country] || []).slice(); if (cur && list.indexOf(cur) < 0) list.push(cur);
    return '<option value="">Select a city…</option>' + list.map(function (c) { return '<option value="' + esc(c) + '"' + (c === cur ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
  }
  // A school's boards as a list — the array when we have it, else split the display string.
  function schoolBoardList(s) {
    if (Array.isArray(s.boards)) return s.boards.slice();
    return (s.board || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
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
      '<div class="tl-fieldrow"><label class="field flex-1">First name<input class="input" id="st-first" value="' + esc(st.first) + '"></label>' +
      '<label class="field flex-1">Last name<input class="input" id="st-last" value="' + esc(st.last) + '"></label></div>' +
      '<label class="field">Admission #<input class="input" id="st-adm" value="' + esc(st.adm) + '"></label>' +
      '<div class="tl-fieldrow"><label class="field flex-1">Grade<input class="input" id="st-grade" value="' + esc(st.grade) + '"></label>' +
      '<label class="field flex-1">Section<input class="input" id="st-sec" value="' + esc(st.section) + '"></label></div>' +
      '</div>', function (close) {
        var before = { first: st.first, last: st.last, adm: st.adm, grade: st.grade, section: st.section };
        st.first = document.getElementById('st-first').value; st.last = document.getElementById('st-last').value;
        st.adm = document.getElementById('st-adm').value; st.grade = document.getElementById('st-grade').value; st.section = document.getElementById('st-sec').value;
        ORG.server.logAudit(me.name, 'student.edit', st.first + ' ' + st.last, 'student', schoolId);
        // Field-level change record for the shared history (this demo roster isn't a guarded write yet).
        var changes = [['first', 'First name'], ['last', 'Last name'], ['adm', 'Admission #'], ['grade', 'Grade'], ['section', 'Section']]
          .filter(function (f) { return String(before[f[0]] || '').trim() !== String(st[f[0]] || '').trim(); })
          .map(function (f) { return { label: f[1], from: before[f[0]], to: st[f[0]] }; });
        if (changes.length && window.TilliAPI && window.TilliAPI.recordChange) {
          window.TilliAPI.recordChange({ school_id: schoolId, kind: 'student', action: 'student.edit', section_name: (st.grade + ' ' + st.section).trim(),
            students: [{ id: st.adm, name: (st.first + ' ' + st.last).trim() }], changes: changes });
        }
        close(); toast('Student updated.'); if (after) after();
      }, 'Save changes');
  }

  function openStructureEditor(s) {
    var ttl = ORG.emptyStructureTtlDays;
    // Days left before an empty section / section-less grade is auto-removed.
    var left = {};
    ORG.server.emptyStructure(s).forEach(function (x) { left[x.grade + '|' + (x.section || '')] = x.daysLeft; });
    function emptyTag(key) {
      var d = left[key]; if (d == null) return '';
      var soon = d <= ORG.emptyStructureWarnDays;
      return '<em class="tl-tree-ttl' + (soon ? ' soon' : '') + '" title="No students yet. Removed automatically in ' + d + ' day' + (d === 1 ? '' : 's') + ' unless students are added.">' + d + 'd left</em>';
    }
    var liveBoard = {};   // grade → board, read live (the org record's structure doesn't carry it)
    if (tlUsesApi(s)) window.TilliAPI.schoolStats(s.id).grades.forEach(function (x) { liveBoard[x.grade] = x.board; });
    var tree = s.structure.grades.length ? s.structure.grades.map(function (g) {
      var body = g.sections.length
        ? g.sections.map(function (sec) {
            // Expected size: teachers add up to it; past it, an admin approves.
            var room = roomFor(s.id, g.grade, sec.name);
            var sizeHtml = room
              ? ' <i>' + room.added + '</i><label class="tl-sizein" title="Expected students in ' + esc(g.grade + ' ' + sec.name) + '. Teachers can add up to this many; more needs an admin’s approval. Leave empty and teachers can’t add anyone without approval.">of' +
                  '<input type="number" min="0" class="ws-secnum" data-size-sec="' + esc(room.section_id) + '" value="' + (room.expected || '') + '" placeholder="—" aria-label="Expected students in ' + esc(g.grade + ' ' + sec.name) + '"></label>' +
                  (room.expected != null && !room.confirmed ? '<button class="btn-link tl-room-tag warn" data-size-ok="' + esc(room.section_id) + '" data-size-n="' + room.expected + '" title="Set automatically from the headcount. Confirm it if it’s right, or type the real size.">confirm</button>' : '') +
                  (room.pending ? '<em class="tl-room-tag pend">+' + room.pending + ' pending</em>' : '')
              : ' <i>' + sec.students + '</i>';
            return '<span class="tl-tree-sec"><input class="ws-secname" data-rs-grade="' + esc(g.grade) + '" data-rs="' + esc(sec.name) + '" value="' + esc(sec.name) + '" size="' + Math.max(1, sec.name.length) + '" aria-label="Section name — click to rename" title="Click to rename. The base stays the same.">' +
              baseTag(sec.name, sec.base, 'sec') + sizeHtml + emptyTag(g.grade + '|' + sec.name) + '</span>';
          }).join('')
        : '<span class="tl-tree-sec" title="Students and teachers are placed in sections — add a section to this grade before adding them.">No sections yet' + ((parseInt(g.students, 10) || 0) ? ' <i>' + parseInt(g.students, 10) + '</i>' : '') + emptyTag(g.grade + '|') + '</span>';
      var bl = schoolBoardList(s), gBoardSel = tlUsesApi(s) && bl.length > 1
        ? '<select class="select sm ws-gradeboard" data-sgboard="' + esc(g.grade) + '" aria-label="Board for ' + esc(g.grade) + '" title="Which board this grade follows. A school admin limited to one board only sees that board’s grades.">' +
            '<option value="">Board…</option>' + bl.map(function (b) { return '<option' + (b === liveBoard[g.grade] ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select>' : '';
      return '<div class="tl-tree-grade"><div class="ws-gradeid"><input class="ws-gradename" data-rg="' + esc(g.grade) + '" value="' + esc(g.grade) + '" aria-label="Grade name — click to rename" title="Click to rename. The base stays ' + esc(g.base || inferBase(g.grade) || 'the same') + '.">' +
        baseTag(g.grade, g.base || inferBase(g.grade)) + gBoardSel + '</div>' + body +
        '<button class="btn-link" data-addsec="' + esc(g.grade) + '">+ Section</button></div>';
    }).join('') : '<div class="ui-empty">No grades yet — add one below.</div>';
    // Grades/sections the daily job removed — one click puts them back with a fresh window.
    var removed = s.structure.removed || [];
    var removedHtml = removed.length ? '<div class="tl-tree-removed"><div class="ui-eyebrow">Auto-removed (empty ' + ttl + ' days)</div>' +
      removed.map(function (x, i) {
        var what = x.wholeGrade ? esc(x.grade) + (x.sections.length ? ' <small>(' + esc(x.sections.join(', ')) + ')</small>' : '') : esc(x.grade) + ' · ' + esc(x.sections.join(', '));
        return '<div class="tl-tree-removed-row"><span>' + what + ' <small>· removed ' + esc(fmtJoined(x.removedAt)) + '</small></span>' +
          '<button class="btn-link" data-restore="' + i + '" title="Add this back for the school. It gets a fresh ' + ttl + ' days to receive students.">Add back</button></div>';
      }).join('') + '</div>' : '';
    openModal('Grades & sections · ' + s.name,
      '<p class="tl-muted">Click a grade or section name to rename it — its base (in brackets) never changes. Empty grades and sections are removed automatically ' + ttl + ' days after they’re added; add them back below if needed.</p>' +
      '<p class="tl-muted">Each section shows students added <b>of</b> the expected size. Teachers can add up to that size; past it — or with no size set — a new child needs an admin’s approval.</p>' +
      '<div class="tl-tree mb-4">' + tree + '</div>' +
      (function () {
        var used = s.structure.grades.map(function (g) { return g.base || inferBase(g.grade); });
        var free = BASE_GRADES.filter(function (b) { return used.indexOf(b) < 0; });
        return free.length ? '<div class="ws-newgrade-row"><select class="select" id="sg-newbase" aria-label="Base grade" title="The fixed grade this maps to. Tilli and Ask Tilli use it even if the school renames the grade.">' +
            '<option value="">Base grade…</option>' + free.map(function (b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('') + '</select>' +
          '<input class="input grow" id="sg-newgrade" placeholder="School’s name for it (optional)" aria-label="School’s name for this grade">' +
          '<button class="btn btn-outline btn-sm" id="sg-addgrade">Add grade</button></div>' : '';
      })() +
      removedHtml,
      function (close) { close(); return true; }, 'Done');
    setTimeout(function () {
      document.querySelectorAll('[data-restore]').forEach(function (b) { b.addEventListener('click', function () {
        var x = ORG.server.restoreStructure(s.id, +b.dataset.restore); if (!x) return;
        var label = x.wholeGrade ? x.grade : x.grade + ' · ' + x.sections.join(', ');
        ORG.server.logAudit(me.name, 'school.structure', label + ' added back', 'school', s.id);
        toast(label + ' added back.'); openStructureEditor(s);
      }); });
      // Board per grade (multi-board schools) — saved on change.
      document.querySelectorAll('[data-sgboard]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          window.TilliAPI.setGradeBoard(s.id, sel.dataset.sgboard, sel.value);
          ORG.server.logAudit(me.name, 'school.structure', sel.dataset.sgboard + ' board → ' + (sel.value || 'not set'), 'school', s.id);
          toast(sel.dataset.sgboard + (sel.value ? ' follows ' + sel.value + '.' : ' has no board now.'));
        });
      });
      // "confirm" on a size the system set — saves it as checked.
      document.querySelectorAll('[data-size-ok]').forEach(function (b) { b.addEventListener('click', function () {
        var r = window.TilliAPI.setSectionExpected(s.id, b.dataset.sizeOk, b.dataset.sizeN, me.email);
        if (r.ok) toast(r.room.name + ': ' + r.room.expected + ' confirmed.');
        openStructureEditor(s);
      }); });
      // Expected class size — saved on change (blur / Enter).
      document.querySelectorAll('[data-size-sec]').forEach(function (inp) {
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
        inp.addEventListener('change', function () {
          var r = window.TilliAPI.setSectionExpected(s.id, inp.dataset.sizeSec, inp.value, me.email);
          if (!r.ok) { toast('Couldn’t save that size.'); return; }
          ORG.server.logAudit(me.name, 'school.size', r.room.name + ' → ' + (r.room.expected || 'not set'), 'school', s.id);
          toast(r.room.expected ? r.room.name + ' expects ' + r.room.expected + ' students.' : 'Size cleared — teachers in ' + r.room.name + ' now need approval to add.');
          openStructureEditor(s);
        });
      });
      // Inline rename (grade + section). Commit on blur / Enter; the base never changes.
      var RENAME_ERR = { exists: 'That name is already used in this school.', empty: 'The name can’t be empty.' };
      function wireRename(sel, run) {
        document.querySelectorAll(sel).forEach(function (inp) {
          inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } if (e.key === 'Escape') { inp.value = inp.defaultValue; inp.blur(); } });
          inp.addEventListener('change', function () {
            var nv = (inp.value || '').trim();
            if (nv === inp.defaultValue) return;
            var r = run(inp, nv);
            if (!r || !r.ok) { toast(RENAME_ERR[r && r.reason] || 'Couldn’t rename that.'); inp.value = inp.defaultValue; return; }
            toast('Renamed to “' + nv + '”.'); openStructureEditor(s);
          });
        });
      }
      wireRename('[data-rg]', function (inp, nv) {
        var r = ORG.server.renameGrade(s.id, inp.dataset.rg, nv);
        if (r.ok) ORG.server.logAudit(me.name, 'school.structure', 'grade ' + inp.dataset.rg + ' renamed to ' + nv, 'school', s.id);
        return r;
      });
      wireRename('[data-rs]', function (inp, nv) {
        var r = ORG.server.renameSection(s.id, inp.dataset.rsGrade, inp.dataset.rs, nv);
        if (r.ok) ORG.server.logAudit(me.name, 'school.structure', inp.dataset.rsGrade + ' section ' + inp.dataset.rs + ' renamed to ' + nv, 'school', s.id);
        return r;
      });
      document.querySelectorAll('.tl-tree .ws-secname').forEach(function (inp) { inp.addEventListener('input', function () { inp.size = Math.max(1, inp.value.length); }); });
      document.querySelectorAll('[data-addsec]').forEach(function (b) { b.addEventListener('click', function () {
        ORG.server.addSection(s.id, b.dataset.addsec); ORG.server.logAudit(me.name, 'school.structure', 'section added to ' + b.dataset.addsec, 'school', s.id); openStructureEditor(s);
      }); });
      var ag = document.getElementById('sg-addgrade'); if (ag) ag.addEventListener('click', function () {
        var base = document.getElementById('sg-newbase').value; if (!base) { toast('Pick the base grade it maps to.'); return; }
        var nm = (document.getElementById('sg-newgrade').value || '').trim() || base;
        if (s.structure.grades.some(function (g) { return g.grade.toLowerCase() === nm.toLowerCase(); })) { toast('A grade called “' + nm + '” already exists.'); return; }
        ORG.server.addGrade(s.id, nm, null, base); ORG.server.logAudit(me.name, 'school.structure', 'grade ' + gradeLbl(nm, base) + ' added', 'school', s.id); openStructureEditor(s);
      });
    }, 0);
  }

  function openNewDeployment(schoolId, afterHub) {
    var schoolOpts = '<option value="">— Select school —</option>' + ORG.activeSchools().map(function (s) { return '<option value="' + s.id + '"' + (s.id === schoolId ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('');
    // Non-archived templates, grouped per phase · audience — only phases with a
    // live version, which is the version the deployment starts on.
    var slots = {};
    ORG.templates.forEach(function (t) {
      if (t.archived) return;
      tplPhases(t).forEach(function (ph) { (slots[ph + ' · ' + t.audience] = slots[ph + ' · ' + t.audience] || []).push(t); });
    });
    var PH = ['Baseline', 'Midline', 'Endline'];
    var tplOpts = Object.keys(slots).sort(function (a, b) { return PH.indexOf(a.split(' · ')[0]) - PH.indexOf(b.split(' · ')[0]) || a.localeCompare(b); }).map(function (k) {
      var ts = slots[k].sort(function (a, b) { return a.title.localeCompare(b.title); });
      var ph = k.split(' · ')[0];
      return '<optgroup label="' + esc(k) + '">' + ts.map(function (t) {
        return '<option value="' + esc(t.title) + '" data-aud="' + esc(t.audience) + '" data-phase="' + esc(ph) + '">' + esc(t.title) + ' — v' + tplLive(t, ph).v + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    openModal('New deployment', '<p class="tl-muted">Deploy an assessment to a school. Status is derived from the window + publish state. <small class="tl-auditnote">Recorded in the Audit Trail.</small></p><div class="tl-stack">' +
      '<label class="field">School<select class="select" id="nd-school">' + schoolOpts + '</select></label>' +
      '<label class="field">Assessment<select class="select" id="nd-assess">' + tplOpts + '</select></label>' +
      '<div class="tl-fieldrow"><label class="field flex-1">Audience<select class="select" id="nd-aud"><option>Teacher</option><option>Parent</option><option>Direct Assessment</option></select></label>' +
      '<label class="field flex-1">Phase<select class="select" id="nd-phase"><option>Baseline</option><option>Midline</option><option>Endline</option></select></label></div>' +
      '<label class="field">Where it runs<select class="select" id="nd-mode"><option value="school">At school</option><option value="home">At home</option></select></label>' +
      '<p class="tl-muted tl-nd-where" id="nd-where"></p>' +
      '<div class="tl-fieldrow"><label class="field flex-1">Start<input class="input" type="date" id="nd-start" value="' + TODAY_ISO + '"></label>' +
      '<label class="field flex-1">End<input class="input" type="date" id="nd-end" value="' + isoPlus(14) + '"></label></div>' +
      '<div class="tl-toggle-row" style="border:none;padding:4px 0"><div class="tr-body"><b>Publish now</b><span>Unpublished deployments stay Scheduled.</span></div>' + switchHtml(true, ' id="nd-pub"') + '</div>' +
      '</div>', function (close) {
        var sid = document.getElementById('nd-school').value;
        if (!sid) { toast('Select a school.'); return false; }
        var assess = document.getElementById('nd-assess');
        var ndAud = document.getElementById('nd-aud').value, ndMode = document.getElementById('nd-mode').value;
        if ((WHERE_BY_AUD[ndAud] || []).indexOf(ndMode) < 0) ndMode = WHERE_BY_AUD[ndAud][0];
        var d = ORG.server.createDeployment({ schoolId: sid, assessment: assess.value || 'Assessment', audience: ndAud, mode: ndMode, phase: document.getElementById('nd-phase').value, start: document.getElementById('nd-start').value, end: document.getElementById('nd-end').value, published: document.getElementById('nd-pub').checked });
        var s = ORG.byId(sid);
        ORG.server.logAudit(me.name, 'deployment.create', d.assessment + ' (' + (s ? s.name : '') + ')', 'deployment', sid);
        close(); toast('Deployment created — ' + d.status + '.');
        if (afterHub) go('school', { id: sid, tab: 'assessments' }); else go('deployments', {});
      }, 'Create deployment');
    setTimeout(function () {
      var a = document.getElementById('nd-assess'); if (!a) return;
      var aud = document.getElementById('nd-aud'), md = document.getElementById('nd-mode'), wn = document.getElementById('nd-where');
      // Teacher → at school, parent → at home; only student direct can choose.
      var syncWhere = function () {
        var w = WHERE_BY_AUD[aud.value] || ['school'];
        md.disabled = w.length === 1; if (w.indexOf(md.value) < 0) md.value = w[0];
        wn.textContent = aud.value + ' assessments run ' + whereText(aud.value).toLowerCase() + (w.length > 1 ? ' — pick one.' : '.');
      };
      var sync = function () {
        var o = a.options[a.selectedIndex]; if (!o) return;
        if (o.dataset.aud) aud.value = o.dataset.aud;
        if (o.dataset.phase) document.getElementById('nd-phase').value = o.dataset.phase;
        syncWhere();
      };
      a.addEventListener('change', sync); aud.addEventListener('change', syncWhere); sync();
    }, 0);
  }

  function openNewGroup() {
    openModal('New school group', '<p class="tl-muted">Groups let you manage related schools together. <small class="tl-auditnote">Recorded in the Audit Trail.</small></p>' +
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
    return '<label class="ui-switch"><input type="checkbox"' + (checked ? ' checked' : '') + (attrs || '') + '><span class="track"></span><span class="thumb"></span></label>';
  }
  var SEL_KEYS = ['SEL', 'Self-Awareness', 'Self-Management', 'Social Awareness', 'Relationship Skills', 'Responsible Decisions'];
  function skillTagsHtml(skills) {
    return '<div class="tl-skilltags">' + skills.map(function (s) {
      var cls = s === 'Cognitive' || ['Working Memory', 'Inhibitory Control', 'Cognitive Flexibility'].indexOf(s) >= 0 ? 'info' : (SEL_KEYS.indexOf(s) >= 0 ? 'ok' : '');
      return '<span class="ui-chip ' + cls + '">' + esc(s) + '</span>';
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
  // Floating Ask Tilli + Need help bubbles (assets/float-help.js). Ask Tilli
  // routes to its nav destination — there's no platform-level chat yet.
  // Group mode has no Ask Tilli destination, so it gets the Need-help bubble only.
  if (window.TilliFloat) TilliFloat.mount(GROUP ? { role: 'School group admin' } : { role: 'Platform admin', askSub: 'Completion, follow-ups and how-tos', ask: function () { go('ask-tilli', {}); } });
  window.addEventListener('hashchange', function () { closeHelp(); hideTip(); render(); });
  if (!GROUP) { wireTips(); wireHelp(); }
  if (!location.hash) location.replace('#/' + HOME);
  render();
})();
