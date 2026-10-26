/* ============================================================
   Tilli Measures — School Admin (leadership) dashboard
   ------------------------------------------------------------
   One codebase, role-based views. This is the leadership surface
   (School admin; also opened by School group admins and the Tilli team),
   separate from the teacher dashboard.
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
  var PAL = window.TilliPalette;   // colour tokens (var() strings + css() resolver for SVG attributes)
  if (!AD || !TS) { document.getElementById('ad-app').innerHTML = '<div class="ad-err">Dashboard data failed to load.</div>'; return; }

  // ---------- identity / role ----------
  var qp = new URLSearchParams(location.search);
  var session = null; try { session = JSON.parse(localStorage.getItem('tilliMeasures.session') || 'null'); } catch (e) {}
  var email = qp.get('email') || (session && session.email) || (TS.admins[0] && TS.admins[0].email);
  var me = TS.findAdmin(email) || TS.admins[0];
  var role = (session && session.role) || (me && me.role) || 'coordinator';
  // Three school roles only: Teacher (teacher.html), School admin and School group admin.
  // Everyone who reaches this dashboard has full school-admin access.
  var isCoordinator = true;
  // Changes made here are logged under whoever is signed in. A Tilli / group
  // admin who drilled in keeps their own name, not the coordinator's.
  if (window.TilliAPI && window.TilliAPI.setHistoryActor) {
    var viaPlatform = session && (session.role === 'tilli' || session.role === 'group') && session.email;
    window.TilliAPI.setHistoryActor({ email: viaPlatform || email, name: viaPlatform ? '' : (me && me.name) || '',
      role: role === 'tilli' ? 'tilli' : role === 'group' ? 'group' : 'admin' });
  }

  var app = document.getElementById('ad-app');
  var modalRoot = document.getElementById('ad-modal-root');
  var toastEl = document.getElementById('ad-toast');

  // ---------- tiny utils ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Number-aware noun: countNoun(1,'child','children') → "1 child".
  function countNoun(n, singular, plural) { return n + ' ' + (Number(n) === 1 ? singular : plural); }
  function initials(name) { var p = String(name || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || ''); }
  function plural(n, s) { return n + ' ' + s + (n === 1 ? '' : 's'); }

  // ---------- grade / section display names ----------
  // Every grade and section keeps a fixed base (Grade 1, Grade 1A) however the
  // school renames it. Screens show the school's name with the base in brackets
  // when they differ — "Sunflowers (Grade 1)", "Sunflowers Rose (Grade 1A)" — and
  // the plain name otherwise. DISPLAY ONLY: keys, filters, data-* and anything
  // stored keep the school's raw names. Cached per render (each TilliAPI read
  // re-parses the local store).
  var lblCache = {};
  function lblMemo(k, fn) { return k in lblCache ? lblCache[k] : (lblCache[k] = fn()); }
  function gLbl(g) {
    var A = window.TilliAPI;
    if (g == null || g === '' || !A || !A.gradeLabel) return String(g == null ? '' : g);
    return lblMemo('g|' + g, function () { return A.gradeLabel(currentSchoolId(), g); });
  }
  // A grade list as stored on a user row ("Grade 1, Grade 2").
  function gradesLbl(str) { return String(str || '').split(/,\s*/).filter(Boolean).map(gLbl).join(', '); }
  // (grade, section) strings, or a section-shaped object → "Sunflowers Rose (Grade 1A)".
  // Students carry their own .name, so pass them as strings, not the object.
  function sLbl(grade, section) {
    if (grade && typeof grade === 'object') { section = grade.section; grade = grade.grade; }
    var A = window.TilliAPI, plain = ((grade || '') + ' ' + (section || '')).trim();
    if (!A || !A.sectionLabel) return plain;
    return lblMemo('s|' + grade + '|' + section, function () { return A.sectionLabel(currentSchoolId(), grade || '', section || ''); });
  }
  // Fixed bases: "Grade 1" / "Grade 1A" ('' when unknown).
  function baseG(g) { var A = window.TilliAPI; return A && A.baseGradeOf ? lblMemo('bg|' + g, function () { return A.baseGradeOf(currentSchoolId(), g) || ''; }) : ''; }
  function baseS(g, s) { var A = window.TilliAPI; return A && A.sectionBase ? lblMemo('bs|' + g + '|' + s, function () { return A.sectionBase(currentSchoolId(), g, s) || ''; }) : ''; }
  // Section letter alone, where the grade is already on screen: "A", or
  // "Rose (Grade 1A)" once the grade or section has been renamed.
  function secShort(g, s) {
    var b = baseS(g, s), squash = function (x) { return String(x || '').replace(/\s+/g, '').toLowerCase(); };
    return b && squash(b) !== squash(g + s) ? s + ' (' + b + ')' : String(s == null ? '' : s);
  }
  // A user row's section list ("A, B") read against its grade. A teacher spread
  // over several grades can't be paired letter-to-grade, so that list stays as stored.
  function userSecLbl(u) {
    var g = String(u.grade || ''), list = String(u.section || '');
    return /,/.test(g) ? list : list.split(/,\s*/).filter(Boolean).map(function (x) { return secShort(g, x); }).join(', ');
  }
  var SCREENS = ['overview', 'implementation', 'outcomes', 'roster', 'history', 'reports', 'asktilli'];

  var toastTimer;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200); }

  // ========================================================
  //  CREATED-SCHOOL COORDINATOR VIEW
  //  A wizard-created school has a real roster in the shared
  //  TilliAPI store but no SEL outcomes yet (it's fresh). The
  //  full demo dashboard below assumes ADMIN_DATA/TILLI_SCHOOL,
  //  so for created schools we render a focused, self-contained
  //  coordinator surface instead: roster + live assessment
  //  completion (WHO, not HOW — same governing rule). The whole
  //  demo dashboard is left untouched for the demo school.
  // ========================================================
  var CREATED = (window.TilliAPI && window.TilliAPI.resolveSchool && qp.get('school'))
    ? window.TilliAPI.resolveSchool(qp.get('school')) : null;
  // A created school now flows into the FULL leadership dashboard: the bridge
  // (created-school-bridge.js) has synthesised a real TILLI_SCHOOL/ADMIN_DATA for
  // it and set window.TILLI_CREATED. The focused single-column view below is kept
  // only as a fallback for when the bridge didn't run (e.g. catalogue missing).
  if (CREATED && CREATED.source === 'created' && !window.TILLI_CREATED) { renderCreatedCoordinator(CREATED); return; }

  function renderCreatedCoordinator(school) {
    var API = window.TilliAPI, id = school.school_id;
    var AUDS = [{ k: 'Teacher', label: 'Teacher' }, { k: 'Parent', label: 'Parent' }, { k: 'Direct Assessment', label: 'Student' }];
    var PHASES = ['Baseline', 'Midline', 'Endline'];
    app.style.display = 'block';

    function draw() {
      var students = API.studentsForSchool(id);
      var sections = API.sectionsForSchool(id);
      var staff = API.staffFor(id);
      var ids = students.map(function (s) { return s.student_id; });
      var stats = API.schoolStats(id);

      // per-phase overall + per-audience completion
      function laneCell(phase, aud) {
        var c = API.completionStats(id, phase, aud, ids);
        if (c.status === 'Not deployed') return '<td class="text-muted">—</td>';
        var pc = c.pct;
        return '<td><div class="cc-cell"><span class="cc-pct">' + pc + '%</span>' +
          '<span class="ui-meter"><span style="width:' + pc + '%"></span></span>' +
          '<small>' + c.done + '/' + c.expected + '</small></div></td>';
      }
      function phaseRow(phase) {
        var lanes = AUDS.map(function (a) { return API.completionStats(id, phase, a.k, ids); });
        var live = lanes.filter(function (c) { return c.status !== 'Not deployed'; });
        var done = live.reduce(function (a, c) { return a + c.done; }, 0);
        var exp = live.reduce(function (a, c) { return a + c.expected; }, 0);
        var overall = exp ? Math.round(done * 100 / exp) : null;
        var sched = live.filter(function (c) { return c.status === 'Scheduled'; })[0];
        var tag = !live.length ? '<span class="ui-chip">Not deployed</span>'
          : live.some(function (c) { return c.status === 'Live'; }) ? '<span class="ui-chip ok">Live</span>'
          : sched ? '<span class="ui-chip info">Scheduled · opens ' + esc(sched.start || '') + '</span>'
          : '<span class="ui-chip muted">Ended</span>';
        return '<tr><td><b>' + esc(phase) + '</b> ' + tag + '</td>' +
          AUDS.map(function (a) { return laneCell(phase, a.k); }).join('') +
          '<td><b>' + (overall == null ? '—' : overall + '%') + '</b></td></tr>';
      }

      var rosterRows = students.length ? students.map(function (s) {
        return '<tr><td class="name">' + esc(s.name) + '</td><td class="mono">' + esc(s.student_id) + '</td>' +
          '<td>' + esc(API.sectionLabel ? API.sectionLabel(id, s.grade, s.section) : s.grade + ' ' + s.section) + '</td><td class="mono">' + esc(s.claimCode) + '</td></tr>';
      }).join('') : '<tr><td colspan="4"><div class="ui-empty">No students yet.</div></td></tr>';

      var staffRows = staff.map(function (u) {
        var sec = u.section_id ? sections.find(function (x) { return x.section_id === u.section_id; }) : null;
        var secName = sec ? (API.sectionLabel ? API.sectionLabel(id, sec) : sec.name) : '';
        return '<tr><td class="name">' + esc(u.name) + '</td><td>' + (u.role === 'coordinator' ? 'School admin' : 'Teacher') + '</td>' +
          '<td>' + esc(secName || '—') + '</td><td class="mono">' + esc(u.email) + '</td></tr>';
      }).join('');

      app.innerHTML =
        '<div class="cc-wrap">' +
          '<div class="cc-top">' +
            '<div class="cc-brand"><img src="_ds/tilli/assets/logos/tilli-wordmark-crop.png" alt="Tilli"><span class="cc-div"></span><span class="cc-meas">Measures</span></div>' +
            '<div class="cc-topr"><span class="ui-chip ok">School admin · full access</span>' +
              '<button class="btn-line" id="cc-refresh" title="Re-read live completion">↻ Refresh</button>' +
              '<a class="btn-line" href="index.html" style="text-decoration:none">Log out</a></div>' +
          '</div>' +
          '<h1 class="ui-screen-title" style="margin:18px 0 2px">' + esc(school.name) + '</h1>' +
          '<p class="ui-screen-sub" style="margin:0 0 16px">' + esc((school.city || '') + (school.city ? ', ' : '') + (school.country || '')) +
            ' · School code <span class="mono">' + esc(school.code || id) + '</span></p>' +
          '<div class="ad-grid" style="grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">' +
            statCard(stats.students, 'Students') + statCard(stats.sections, 'Sections') +
            statCard(stats.teachers, 'Teachers') + statCard(overallPct(id, ids), 'Overall complete') +
          '</div>' +
          card('Assessment implementation', 'Completion by phase and audience — WHO has responded, updated live as teachers and parents finish. Deploy phases from the Platform Admin console.',
            '<div class="ui-tablewrap"><table class="ui-table mw-640 cc-table"><thead><tr><th>Phase</th><th>Teacher</th><th>Parent</th><th>Student</th><th>Overall</th></tr></thead><tbody>' +
            PHASES.map(phaseRow).join('') + '</tbody></table></div>') +
          card('Roster', stats.students + ' students · claim codes are what parents enter to link their child.',
            '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Name</th><th>Admission #</th><th>Grade/Section</th><th>Claim code</th></tr></thead><tbody>' + rosterRows + '</tbody></table></div>') +
          card('Staff', staff.length + ' members', '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Name</th><th>Role</th><th>Section</th><th>Email</th></tr></thead><tbody>' + staffRows + '</tbody></table></div>') +
        '</div>';
      var rb = document.getElementById('cc-refresh');
      if (rb) rb.addEventListener('click', function () { draw(); toast('Refreshed.'); });
    }
    function statCard(n, lbl) { return '<div class="ui-card tight"><div class="ui-kpi"><div class="num">' + esc(String(n)) + '</div><div class="lbl">' + esc(lbl) + '</div></div></div>'; }
    function overallPct(id, ids) {
      var done = 0, exp = 0;
      ['Baseline', 'Midline', 'Endline'].forEach(function (ph) {
        AUDS.forEach(function (a) { var c = API.completionStats(id, ph, a.k, ids); done += c.done; exp += c.expected; });
      });
      return (exp ? Math.round(done * 100 / exp) : 0) + '%';
    }
    // minimal styles for this view (scoped by cc- prefix)
    var st = document.createElement('style');
    // (buttons = .btn-line, Live/Ended = .ui-chip ok/muted, bar = .ui-meter — all shared)
    st.textContent = '.cc-wrap{max-width:1000px;margin:0 auto;padding:22px 26px}' +
      '.cc-top{display:flex;align-items:center;justify-content:space-between;gap:12px}' +
      '.cc-brand{display:flex;align-items:center;gap:10px}.cc-brand img{height:24px}' +
      '.cc-div{width:1px;height:20px;background:var(--line-200)}.cc-meas{font-weight:700;color:var(--ink-600)}' +
      '.cc-topr{display:flex;align-items:center;gap:10px}' +
      '.cc-table td,.cc-table th{vertical-align:middle}' +
      '.cc-cell{display:flex;align-items:center;gap:8px}.cc-pct{font-weight:700;min-width:34px}' +
      '.cc-cell .ui-meter{flex:1;max-width:90px;height:7px}' +
      '.cc-cell small{color:var(--ink-300);font-size:var(--fs-xs)}';
    document.head.appendChild(st);
    draw();
  }

  // ---------- hover info boxes (tooltips) ----------
  // The domain vocabulary this dashboard quietly assumes. Each string is
  // shown in a small dark bubble when its label is hovered/focused, so a
  // leader who visits a few times a year never has to remember the jargon.
  var TIP = {
    emerging: 'Just starting to appear — the child needs regular adult support and prompts to use this skill.',
    developing: 'Shows up often but is not consistent yet — used with the occasional reminder.',
    secure: 'Steady and independent — the child uses it reliably across everyday situations.',
    cadence: 'Skill outcomes are measured three times a year: Baseline (start), Midline (middle) and Endline (end). Dates are set by the Tilli team. This tag shows the point you are viewing and the next one due.',
    completion: 'How many students have finished the open assessment window. Completion only — never their scores.',
    smallN: 'With only a few children, one child moving band shifts the percentage a lot. Read small groups as a direction, not a verdict.',
    movement: 'For each skill: how many children moved up a band, held steady, or moved down since Baseline. "Net up" is ups minus downs.',
    perspective: 'The same skills rated from three viewpoints — teacher, parent and the child\'s own answers (average score out of 100). The skills where they disagree most are listed first.',
  };
  // Wrap an already-safe label so hovering it (and the little ⓘ) shows `text`.
  // `cls` adds tooltip modifiers, e.g. 'down', 'down end'.
  function withInfo(labelHTML, text, cls) {
    return '<span class="ui-tooltip help' + (cls ? ' ' + cls : '') + '" data-tip="' + esc(text) + '" tabindex="0">' +
      labelHTML + '<span class="ui-info" aria-hidden="true">i</span></span>';
  }

  // ---------- band rendering (shared by Outcomes + Reports) ----------
  // Look = .ui-bandbar (tilli.css), shared with the teacher dashboard. `hero` = the
  // one big bar per screen (22px); every other bar is the 14px default.
  // `targetSecure` (optional) draws a target marker on the bar (feedback §2):
  // Secure is the right-most segment, so an N% Blooming target sits at (100−N)%
  // from the left — the green block should reach that line.
  function bandBar(dist, hero, targetSecure) {
    var p = dist.pct;
    var bar = '<div class="ui-bandbar' + (hero ? ' hero' : '') + '" role="img" aria-label="' +
      AD.bands.map(function (b) { return b.label + ' ' + p[b.key] + '%'; }).join(', ') + '">' +
      AD.bands.map(function (b) { return p[b.key] > 0 ? '<span style="width:' + p[b.key] + '%;background:' + b.color + '"></span>' : ''; }).join('') +
      '</div>';
    if (targetSecure == null) return bar;
    var left = Math.max(0, Math.min(100, 100 - targetSecure));
    return '<div class="ad-barwrap">' + bar +
      '<span class="ad-bar-target" style="left:' + left + '%" title="Target: ' + targetSecure + '% Blooming"></span></div>';
  }
  // "62% Blooming · target 70% (8 pts to go)" — the text half of the benchmark.
  function targetDelta(actualSecure, targetSecure) {
    if (targetSecure == null) return '';
    var gap = targetSecure - actualSecure;
    return '<span class="ad-targetdelta' + (gap <= 0 ? ' met' : '') + '">Target ' + targetSecure + '% Blooming · ' +
      (gap <= 0 ? 'met' : gap + (gap === 1 ? ' pt to go' : ' pts to go')) + '</span>';
  }
  function bandLegend() {
    return '<div class="ui-legend">' + AD.bands.map(function (b) {
      return '<span class="ui-tooltip help" data-tip="' + esc(TIP[b.key] || '') + '" tabindex="0"><i style="background:' + b.color + '"></i>' + b.label + '</span>';
    }).join('') + '</div>';
  }
  // Cadence label — every periodic module carries one (spec §3).
  // Dates come from the Tilli platform planner; no dates → the point name alone.
  function pointLabel(pt) { var r = AD.pointRange(pt); return pt.label + (r ? ' · ' + r : ''); }
  function nextPoint() { return AD.openPoint || AD.points.find(function (p) { return p.status === 'upcoming'; }) || null; }
  function cadence(pointKey) {
    var pt = AD.points.find(function (p) { return p.key === pointKey; }) || AD.latestComplete;
    if (!pt) return '';   // no completed point yet (No-data lifecycle state)
    var next = nextPoint();
    return '<span class="ui-chip info ad-cadence ui-tooltip help end" data-tip="' + esc(TIP.cadence) + '" tabindex="0">' + esc(pointLabel(pt)) +
      (next ? '<span class="next">Next: ' + esc(pointLabel(next)) + '</span>' : '') +
      '<span class="ui-info" aria-hidden="true">i</span></span>';
  }
  // "n = 24 children" — and a caution when a group is too small to read as a verdict.
  var SMALL_N = 10;
  function nNote(n) {
    var line = '<span class="ad-n">n = ' + n + (n === 1 ? ' child' : ' children') + '</span>';
    if (n >= SMALL_N || n < 1) return line;
    return line + ' <span class="ui-chip warn ad-small ui-tooltip help" data-tip="' + esc(TIP.smallN) + '" tabindex="0">Small group — one child shifts this by ~' + Math.round(100 / n) + ' points</span>';
  }
  // Focus areas / Strengths pair (weakest + strongest skills by % Blooming).
  function gsPair(students, point, wrapCls) {
    var gs = AD.growthStrength(students, point, 2), em = AD.bandMeta('emerging'), se = AD.bandMeta('secure');
    var list = function (rows) { return '<ul>' + rows.map(function (x) { return '<li>' + esc(x.name) + '<span class="p">' + x.secure + '% blooming</span></li>'; }).join('') + '</ul>'; };
    return '<div class="' + (wrapCls || 'ad-grid two') + '">' +
      '<div class="ad-gs" style="--band:' + em.color + ';--bandwash:' + em.wash + '"><h4 class="ui-title md">Where to help next</h4>' + list(gs.growth) + '</div>' +
      '<div class="ad-gs" style="--band:' + se.color + ';--bandwash:' + se.wash + '"><h4 class="ui-title md">What’s going well</h4>' + list(gs.strength) + '</div></div>';
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
      return { label: pt.label, sub: AD.pointRange(pt), pct: d.pct, n: d.n };
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
      grid += '<text x="' + (x0 - 8) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="11" font-weight="700" fill="var(--ink-300)">' + v + '</text>';
    });
    // Three INDEPENDENT series (not stacked) — each band plots its own % 0–100
    // across the points, free to rise, fall and cross. Soft area under a bold line.
    // SVG presentation attributes can't read var(), so resolve each band's level token to hex.
    var SERIES = ['secure', 'developing', 'emerging'].map(function (k) { var m = AD.bandMeta(k); return { key: k, meta: m, hex: PAL.css(m.token) }; });
    var WHITE = PAL.css('--white');
    var areas = '', lines = '', dots = '';
    SERIES.forEach(function (s) {
      var top = rows.map(function (r, i) { return { x: xAt(i), y: yAt(r.pct[s.key]) }; });
      if (nPts >= 2) {
        // area: smooth line, then straight down to the baseline and back — translucent so overlaps read
        areas += '<path d="' + smoothD(top) + ' L' + top[top.length - 1].x.toFixed(1) + ' ' + y1 + ' L' + top[0].x.toFixed(1) + ' ' + y1 + ' Z" fill="' + s.hex + '" fill-opacity="0.14"/>';
        lines += '<path d="' + smoothD(top) + '" fill="none" stroke="' + s.hex + '" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round"/>';
      }
      top.forEach(function (p) { dots += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4.5" fill="' + WHITE + '" stroke="' + s.hex + '" stroke-width="2.75"/>'; });
    });
    // value labels — haloed so they stay legible wherever areas overlap.
    // Suppressed when there are many x-points (skills view) or they'd collide.
    var overlay = '';
    rows.forEach(function (r, i) {
      var x = xAt(i);
      if (showVals) SERIES.forEach(function (s) {
        var v = r.pct[s.key], y = yAt(v);
        overlay += '<text x="' + x + '" y="' + (y - 9) + '" text-anchor="middle" font-size="13" font-weight="700" paint-order="stroke" stroke="' + WHITE + '" stroke-width="3.5" stroke-linejoin="round" fill="' + s.hex + '">' + v + '%</text>';
      });
      if (rotate) {
        var short = r.label.length > 15 ? r.label.slice(0, 14).replace(/\s+$/, '') + '…' : r.label;
        overlay += '<text x="' + x + '" y="' + (y1 + 14) + '" text-anchor="end" transform="rotate(-32 ' + x + ' ' + (y1 + 14) + ')" font-size="11" font-weight="700" fill="var(--ink-450)"><title>' + esc(r.label) + '</title>' + esc(short) + '</text>';
      } else {
        overlay += '<text x="' + x + '" y="' + (y1 + 20) + '" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink-700)">' + esc(r.label) + '</text>';
        if (r.sub) overlay += '<text x="' + x + '" y="' + (y1 + 36) + '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink-300)">' + esc(r.sub) + '</text>';
      }
    });
    // faded ticks for points that aren't measured yet (time view only)
    var futTicks = opts.showFuture ? AD.points.filter(function (p) { return p.status !== 'complete'; }).map(function (p) {
      var r = AD.pointRange(p);
      return '<span class="ui-metachip dashed ad-progfut"><i>' + esc(p.label) + '</i>' + esc(p.status === 'open' ? 'collecting now' : (r || 'not yet measured')) + '</span>';
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
    var isDefault = !progSkill && progPeriod === 'all';
    return head + (isDefault ? '' : '<div class="ad-progcap">' + v.cap + '</div>') + '<div id="o-progchart" class="ad-progchart"></div>';
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

  // ---------- where views differ (teacher / parent / child) ----------
  // The three skills where the viewpoints disagree most, from the real
  // per-student perspective scores. Full skill names — no truncation.
  function viewsDifferBlock(students, limit) {
    var rows = AD.perspectiveGaps(students).slice(0, limit || 3);
    var cell = function (v) { return '<td class="ad-num">' + (v == null ? '—' : v) + '</td>'; };
    return '<div class="ui-tablewrap"><table class="ui-table ad-views"><thead><tr><th>Skill</th><th class="ad-num">Teacher</th><th class="ad-num">Parent</th><th class="ad-num">Child (self)</th><th class="ad-num">Gap</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td class="name">' + esc(r.name) + '</td>' + cell(r.teacher) + cell(r.parent) + cell(r.child) + '<td class="ad-num"><b>' + r.gap + '</b></td></tr>'; }).join('') +
      '</tbody></table></div><p class="ad-views-note">Average rating out of 100 from each viewpoint. Different views are normal — children often show different sides at home and at school.</p>';
  }

  // ---------- state components ----------
  function stEmpty(bigLine, sub, ok) {
    return '<div class="ui-empty' + (ok ? ' ok' : '') + '"><span class="big">' + esc(bigLine) + '</span>' + (sub ? esc(sub) : '') + '</div>';
  }
  function stError(what) {
    return '<div class="ad-err">' + esc(what) + '<br><button class="btn btn-outline btn-sm" data-retry="1">Retry</button></div>';
  }
  function skelLines(n) { var s = ''; for (var i = 0; i < (n || 3); i++) s += '<div class="skeleton ad-skel" style="width:' + (90 - i * 12) + '%"></div>'; return s; }
  function skelCard(title) { return '<div class="ui-card"><div class="ad-skel skeleton" style="width:40%;height:16px;margin-bottom:14px"></div>' + skelLines(4) + '</div>'; }
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
    search: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.63l-19 6.5a.5.5 0 0 0-.02.93l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/></svg>',
    asktilli: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z"/></svg>',
    overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    implementation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
    outcomes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    roster: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  };
  var NAV = [
    { key: 'overview', label: 'Overview' },   // Outcomes is reached from the Overview button, not the nav
    { key: 'roster', label: 'Roster' },
    { key: 'history', label: 'History' },
    { key: 'reports', label: 'Reports' },
    { key: 'asktilli', label: 'Ask Tilli' }, // live assistant — also reachable via the floating button
  ];
  // Outcomes lives under Overview, so Overview stays highlighted there.
  function navOn(key, screen) { return key === screen || (key === 'overview' && screen === 'outcomes'); }
  function navItems() { return NAV; }

  function chromeHTML(r) {
    var roleLabel = role === 'tilli' ? 'Tilli Team' : role === 'group' ? 'School group admin' : 'School admin';
    // "Updated 2 h ago by …" — the newest change anywhere in the school; opens History.
    var lastChip = (isCoordinator && window.TilliHistory)
      ? '<button class="ad-updated desk-only" data-nav="history">' + TilliHistory.lastUpdatedHTML(schoolHistory({ limit: 1 })[0], { me: email, prefix: 'Updated' }) + '</button>' : '';
    // Year picker once the school has more than one year with Tilli (spec §10.3).
    var yrs = AD.years || [], vy = AD.viewYear;
    var yearCtrl = yrs.length > 1
      ? '<label class="ad-year ad-yearpick" title="Switch year — past years are read-only"><select data-yearpick aria-label="Academic year">' +
          yrs.slice().reverse().map(function (y) { return '<option value="' + esc(y.id) + '"' + (vy && vy.id === y.id ? ' selected' : '') + '>' + esc(y.label) + (y.status === 'current' ? ' · current' : '') + '</option>'; }).join('') +
        '</select></label>'
      : '<span class="ad-year">' + esc(AD.academicYears[0]) + '</span>';
    yearCtrl += boardScopeChip();
    var side = '<aside class="ui-side dash-side">' +
      '<span class="lockup"><img src="_ds/tilli/assets/logos/tilli-wordmark-crop.png" alt="Tilli"><span class="divider"></span><span class="measures">Measures</span></span>' +
      '<nav class="ui-nav">' + navItems().filter(function (n) { return n.key !== 'asktilli'; }).map(function (n) {
        if (n.disabled) return '<button class="ui-nav-item disabled" data-navsoon="1" title="Coming soon to the leadership view"><span class="ic">' + ICONS[n.key] + '</span>' + esc(n.label) + '<span class="ui-tag ml-auto">Soon</span></button>';
        // Outcomes is a sub-item tucked under Overview: Overview is "on" on its own screen and
        // "open" (green text, no fill) while you're on Outcomes, which then gets the fill.
        if (n.key === 'overview') return '<button class="ui-nav-item' + (r.screen === 'overview' ? ' on' : r.screen === 'outcomes' ? ' open' : '') + '" data-nav="overview"><span class="ic">' + ICONS.overview + '</span>Overview</button>' +
          '<button class="ui-nav-item ad-nav-sub' + (r.screen === 'outcomes' ? ' on' : '') + '" data-nav="outcomes"' + (r.screen === 'outcomes' ? ' aria-current="page"' : '') + '><span class="ic">' + ICONS.outcomes + '</span>Outcomes</button>';
        return '<button class="ui-nav-item' + (navOn(n.key, r.screen) ? ' on' : '') + '" data-nav="' + n.key + '"><span class="ic">' + ICONS[n.key] + '</span>' + esc(n.label) + '</button>';
      }).join('') +
      // Ask Tilli is mostly asked from the Overview now, so its full screen gets a quieter link under the nav.
      '<button class="ad-nav-mini' + (r.screen === 'asktilli' ? ' on' : '') + '" data-nav="asktilli" title="Open Ask Tilli full screen, with your saved chats">' + ICONS.asktilli + '<span>Ask Tilli · full screen</span></button>' +
      '</nav>' +
      // Bottom-left stack, same on every dashboard: dev preview panel (placed by
      // placeStatePanel) above the profile, which opens the account menu.
      '<div class="ui-side-bottom"><div id="ad-dev-slot"></div>' +
        '<button class="ui-side-profile" id="ad-acct-btn" aria-label="Account menu" title="Leadership view · data updates 3× a year for outcomes, daily for activity.">' +
          '<span class="ui-avatar sm">' + esc(initials(me.name).toUpperCase()) + '</span>' +
          '<span class="meta"><b>' + esc(me.name) + '</b><span>' + esc(roleLabel) + '</span></span><span class="chev">⋯</span>' +
        '</button></div></aside>';

    var header = '<header class="ui-header dash-header">' +
      '<div><div class="ui-h-title">' + esc(AD.school.name) + '</div><div class="ui-h-sub desk-only">' + esc(AD.school.city + ', ' + AD.school.country) + '</div></div>' +
      '<div style="margin-left:auto;display:flex;align-items:center;gap:12px">' + lastChip + yearCtrl +
      // Phone only (sidebar hidden): the avatar stands in for the sidebar profile.
      '<button class="ui-avatar ad-acct-m" id="ad-acct-btn-m" aria-label="Account menu">' + esc(initials(me.name).toUpperCase()) + '</button></div></header>';

    var bottom = '<nav class="ui-bottomnav dash-bottomnav">' + navItems().filter(function (n) { return !n.disabled && n.key !== 'asktilli'; }).map(function (n) {
      return '<button class="' + (navOn(n.key, r.screen) ? 'on' : '') + '" data-nav="' + n.key + '">' + ICONS[n.key] + '<span>' + esc(n.label) + '</span></button>';
    }).join('') + '</nav>';

    return side + '<div class="ad-col"><div style="position:relative">' + header + '</div>' +
      '<main class="ad-main"><div class="ad-wrap"><div id="ad-main-body"></div></div></main></div>' + bottom;
  }

  function wireChrome() {
    app.querySelectorAll('[data-nav]').forEach(function (b) { b.addEventListener('click', function () { go(b.dataset.nav, {}); }); });
    app.querySelectorAll('[data-navsoon]').forEach(function (b) { b.addEventListener('click', function () { toast('Ask Tilli is coming to the leadership view soon.'); }); });
    ['ad-acct-btn', 'ad-acct-btn-m'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function (ev) { ev.stopPropagation(); openAcctMenu(b); });
    });
  }
  // Sidebar profile → menu opens upward from it; phone header avatar → downward, right-aligned.
  function placeAcctMenu(m, anchor) {
    var r = anchor.getBoundingClientRect();
    if (anchor.closest('.ui-side')) { m.style.left = r.left + 'px'; m.style.bottom = (window.innerHeight - r.top + 6) + 'px'; }
    else { m.style.right = Math.max(8, window.innerWidth - r.right) + 'px'; m.style.top = (r.bottom + 6) + 'px'; }
  }
  function openAcctMenu(anchor) {
    closeAcctMenu();
    var m = document.createElement('div');
    m.className = 'ui-menu ui-acct-menu ad-acct-menu'; m.id = 'ad-acct-menu';
    // Tilli Team drilled in from the internal platform — offer a way back to it.
    var fromTilli = qp.get('from') === 'tilli' || role === 'tilli';
    var fromGroup = qp.get('from') === 'group' && qp.get('group');
    // School years — the header picker is hidden on phones, so the years live here too.
    var yrs = AD.years || [], vy = AD.viewYear, boards = window.TILLI_CREATED && window.TILLI_CREATED.boards;
    var yearItems = yrs.length > 1 ? '<div class="ad-acct-sec">School year</div>' + yrs.slice().reverse().map(function (y) {
      var on = vy && vy.id === y.id;
      return '<button class="ui-menu-item' + (on ? ' on' : '') + '" data-amyear="' + esc(y.id) + '"' + (on ? ' aria-current="true"' : '') + '>' +
        (on ? '✓ ' : '') + esc(y.label) + (y.status === 'current' ? ' · current' : ' · read-only') + '</button>';
    }).join('') : '';
    m.innerHTML = '<div class="who"><b>' + esc(me.name) + '</b><span>' + esc(me.email) + '</span>' + (boards ? '<span>' + esc(boards.join(' + ')) + ' only</span>' : '') + '</div>' +
      (fromTilli ? '<button class="ui-menu-item" data-am="tilli">← Tilli platform</button>' : '') +
      (fromGroup ? '<button class="ui-menu-item" data-am="group">← Group view</button>' : '') +
      yearItems +
      '<button class="ui-menu-item" data-am="signout">Sign out</button>';
    document.body.appendChild(m);
    placeAcctMenu(m, anchor);
    if (fromTilli) m.querySelector('[data-am="tilli"]').addEventListener('click', function () { location.href = 'tilli.html?email=' + encodeURIComponent(me.email); });
    if (fromGroup) m.querySelector('[data-am="group"]').addEventListener('click', function () { location.href = 'tilli.html?group=' + encodeURIComponent(qp.get('group')); });
    m.querySelector('[data-am="signout"]').addEventListener('click', function () { try { localStorage.removeItem('tilliMeasures.session'); } catch (e) {} location.href = 'index.html'; });
    m.querySelectorAll('[data-amyear]').forEach(function (b) { b.addEventListener('click', function () { closeAcctMenu(); if (!(vy && vy.id === b.dataset.amyear)) switchYear(b.dataset.amyear); }); });
    setTimeout(function () { document.addEventListener('click', closeAcctMenu, { once: true }); }, 0);
  }
  function closeAcctMenu() { var m = document.getElementById('ad-acct-menu'); if (m) m.remove(); }

  // ⋮ menu on a Your team row. Fixed-position (outside the scrolling table) so it is
  // never clipped; opens below the button, or above it near the bottom of the screen.
  function openRowMenu(btn, u) {
    var wasOpen = btn.getAttribute('aria-expanded') === 'true';
    closeRowMenu(); if (wasOpen || !u) return;
    var invited = u.status === 'Invited';
    var m = document.createElement('div');
    m.className = 'ui-menu ad-rowmenu'; m.id = 'ad-rowmenu'; m.setAttribute('role', 'menu');
    m.innerHTML = '<button class="ui-menu-item" role="menuitem" data-rm="detail">View details</button>' +
      (invited && u.tempPassword ? '<button class="ui-menu-item" role="menuitem" data-rm="pw">Show password</button>' : '') +
      (invited ? '<button class="ui-menu-item" role="menuitem" data-rm="resend">Resend invite</button>' : '') +
      '<button class="ui-menu-item danger" role="menuitem" data-rm="revoke" title="Removes their access straight away">Revoke access</button>';
    document.body.appendChild(m);
    var r = btn.getBoundingClientRect(), h = m.offsetHeight;
    m.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
    m.style.top = (r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
    btn.setAttribute('aria-expanded', 'true'); btn.classList.add('on');
    var acts = {
      detail: function () { showUserDetail(u); },
      pw: function () { showInvitePassword(u); },
      resend: function () { resendInvite(u.email); },
      revoke: function () { toast('Access removed — they can no longer sign in.'); },
    };
    m.querySelectorAll('[data-rm]').forEach(function (x) { x.addEventListener('click', function () { closeRowMenu(); acts[x.dataset.rm](); }); });
    m.querySelector('.ui-menu-item').focus();
    setTimeout(function () {
      document.addEventListener('click', closeRowMenu, { once: true });
      window.addEventListener('scroll', closeRowMenu, { once: true, capture: true });
      document.addEventListener('keydown', rowMenuKey);
    }, 0);
  }
  function rowMenuKey(e) { if (e.key === 'Escape') { var b = document.querySelector('.ad-kebab.on'); closeRowMenu(); if (b) b.focus(); } }
  function closeRowMenu() {
    var m = document.getElementById('ad-rowmenu'); if (m) m.remove();
    document.querySelectorAll('.ad-kebab.on').forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-expanded', 'false'); });
    document.removeEventListener('keydown', rowMenuKey);
  }

  // ========================================================
  //  RENDER
  // ========================================================
  function render() {
    lastHash = location.hash; lblCache = {};
    var r = currentRoute();
    if ((r.screen === 'roster' || r.screen === 'history') && !isCoordinator) { go('overview', {}, { replace: true }); return; }
    if (r.screen === 'implementation') { go('overview', {}, { replace: true }); return; }   // Implementation removed from nav
    closeAcctMenu(); closeRowMenu();
    app.innerHTML = chromeHTML(r);
    app.classList.toggle('ask-mode', r.screen === 'asktilli');   // Ask Tilli is full-bleed, like the teacher view
    app.classList.toggle('ov-mode', r.screen === 'overview');    // Overview is full-bleed too: points left, dandelion panel right
    placeStatePanel();
    var body = document.getElementById('ad-main-body');
    if (!loadedScreens[r.screen]) {
      body.innerHTML = screenSkeleton();
      clearTimeout(loadTimer);
      loadTimer = setTimeout(function () { loadedScreens[r.screen] = true; render(); }, 340);
    } else {
      try { SCREEN[r.screen](r.params, body); }
      catch (e) { console.error(e); body.innerHTML = stError('This screen could not be built.'); }
      if (AD.pastYear) body.insertAdjacentHTML('afterbegin', pastYearBannerHTML());
      body.insertAdjacentHTML('afterbegin', boardScopeNoteHTML());
    }
    wireChrome();
    app.querySelectorAll('[data-yearpick]').forEach(function (sel) { sel.addEventListener('change', function () { switchYear(sel.value); }); });
    app.querySelectorAll('[data-yeargo]').forEach(function (b) { b.addEventListener('click', function () { switchYear(b.dataset.yeargo); }); });
    syncFab();
  }

  // ---- Past years (read-only) ----
  // The bridge builds the whole dashboard for ?year=<closed year id>, so a
  // switch reloads with that param (or without it for the current year).
  function switchYear(id) {
    var u = new URL(location.href), cur = AD.currentYear;
    if (!id || (cur && cur.id === id)) u.searchParams.delete('year'); else u.searchParams.set('year', id);
    location.assign(u.toString());
  }
  function pastYearBannerHTML() {
    var y = AD.viewYear, cur = AD.currentYear;
    return '<div class="ui-note info mb-3 ad-pastbanner"><span aria-hidden="true">📖</span><span>You’re looking at <b>' + esc(y.label) + '</b> — a closed year, read-only. Classes show the names they had that year.</span>' +
      (cur ? '<button class="btn btn-outline btn-sm" data-yeargo="' + esc(cur.id) + '">Back to ' + esc(cur.label) + '</button>' : '') + '</div>';
  }
  // The closed year just before the current one (for "see last year's results").
  function lastClosedYear() { var c = (AD.years || []).filter(function (y) { return y.status === 'closed'; }); return c[c.length - 1] || null; }
  // Empty state for Outcomes / Reports before this year's first point closes.
  function firstResultsEmpty(what) {
    var b0 = AD.pointRange(AD.points[0]), last = !AD.pastYear && lastClosedYear();
    if (!last) return stEmpty(what === 'reports' ? 'Nothing to share just yet.' : 'Nothing measured yet.',
      (what === 'reports' ? 'Your first reports are ready as soon as Baseline closes' : 'Your first results arrive once Baseline closes') + (b0 ? ' (' + b0 + ')' : '') + '.');
    return '<div class="ui-empty"><span class="big">Nothing from ' + esc(AD.viewYear ? AD.viewYear.label : 'this year') + ' yet.</span>' +
      'This year’s ' + (what === 'reports' ? 'reports are ready' : 'results arrive') + ' once Baseline closes' + esc(b0 ? ' (' + b0 + ')' : '') + '. ' +
      '<button class="btn-link" data-yeargo="' + esc(last.id) + '">See ' + esc(last.label) + ' ' + (what === 'reports' ? 'reports' : 'results') + ' →</button></div>';
  }

  // small helpers for building modules
  function card(title, note, bodyHTML, extraClass, headRight, tipText) {
    var titleHTML = tipText ? withInfo(esc(title), tipText) : esc(title);
    return '<div class="ui-card ' + (extraClass || '') + '">' +
      (title ? '<div class="ui-mod-h"><div><h3 class="ui-mod-title">' + titleHTML + '</h3>' + (note ? '<p class="ui-mod-note">' + note + '</p>' : '') + '</div>' + (headRight || '') + '</div>' : '') +
      bodyHTML + '</div>';
  }
  function screenHead(title, sub) { return '<h1 class="ui-screen-title">' + esc(title) + '</h1><p class="ui-screen-sub">' + esc(sub) + '</p>'; }
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
  // split into Social-Emotional / Cognitive buckets. Shared: the
  // Overview renders it whole-school; kept as a plain helper so scope/point
  // are passed in rather than closed over.
  function skillBandDistBody(students, point, gradeBand) {
    function distSkillRow(sk) {
      var d = AD.distribution(students, sk.key, point);
      // Only hand-written (authored) interpretation is shown — the generic
      // template would repeat the same sentence under every skill.
      var interp = AD.interpret(sk.key, gradeBand, point, AD.shapeOf(d));
      // School-scope rows carry the skill's Secure target so every bar has a "vs what?".
      var tgt = (AD.targetsSet && gradeBand === 'school') ? AD.skillSecureTarget(sk.key) : null;
      return '<div class="ad-skillrow"><div class="ad-skillname">' + esc(sk.name) + '</div>' +   // the bucket heading already names the group
        '<div>' + bandBar(d, false, tgt) + (tgt != null ? targetDelta(d.pct.secure, tgt) : '') +
        (interp.authored ? '<p class="ad-interp">' + esc(interp.text) + '</p>' : '') + '</div></div>';
    }
    function distBucket(title, groupKey) {
      var list = AD.skills.filter(function (s) { return s.group === groupKey; });
      return '<details class="ad-bucket" open>' +
        '<summary class="ad-bucket-sum"><span class="ad-bucket-chev">▾</span>' +
        '<span class="ad-bucket-title">' + esc(title) + '</span>' +
        '<span class="ad-bucket-count">' + list.length + ' skills</span></summary>' +
        '<div class="ad-bucket-body">' + list.map(distSkillRow).join('') + '</div></details>';
    }
    return distBucket('Social-Emotional', 'sel') +   // legend: once, on the school card above
      distBucket('Cognitive', 'cog');
  }

  // Verdict banner (feedback §1/§2/§3) — the answer before the evidence.
  // One headline (is it working + direction of travel), one sub-line
  // (adoption + children moved + window), and a pooled band bar with the
  // Secure target marked. Adapts to every lifecycle state.
  // ---------- Overview: the living dandelion school ----------
  // A force-directed dandelion: focus hub → its children → … → one dot per
  // child. The same shape repeats at every level (school › grade › section).
  // Focus lives in the URL (?grade= / ?section=) so browser Back walks up, and
  // node positions survive re-renders, so changing level is a glide, not a cut.
  // Beside it, a guided story (dot pager) written from the data; each step
  // highlights part of the dandelion and can pull groups apart to compare them.
  // Hubs: click one level down (or the centre, one up). Children are never
  // clickable; their names show on hover for coordinators only, and only in
  // Check-in mode unless leadershipStudentResultsVisible (no student results).
  var DL_CFG = {
    gradeDist: 120,      // school hub → grade hub
    sectionDist: 100,    // grade hub → section hub
    kidDist: 52,         // section hub → child dot
    sectionSpread: 140,  // fan of sections around their grade's outward direction (deg)
    kidSpread: 330,      // fan of children around their section (deg; 360 = full burst)
    rootAngle: 180,      // direction of the first branch from the centre (deg; 0 = right)
    kidJitter: 0.18,     // ± share of random variation in child spoke length
    asymmetry: 0.6,      // 0 = perfectly even fans, 1 = hubs wander off-angle and spokes vary in length
    kidScatter: 0.6,     // 0 = children evenly spaced round their section, 1 = clumped and gappy
    sectionGap: 36,      // minimum clear space between two class bursts (layout units)
    gradeGap: 40,        // minimum clear space between two grades' groups of classes (layout units)
    zoomMs: 900,         // camera glide when you click into a grade/section or step back
    contextOpacity: 0.05, // opacity of the parts outside the focused grade/section (barely there — just a hint of the rest)
    sectionLabelMax: 8,  // more sections than this → section names only appear once you zoom into a grade
    kidDotMax: 200,      // more children than this in view → classes show as summary hubs, no child dots
    classHubR: 12,       // radius of a class hub while its child dots are hidden (kept below the grade size)
    rootR: 24,           // school hub radius — biggest
    gradeR: 15,          // grade hub radius — kept below the school hub
    sectionR: 9,         // section hub radius — kept below the grade hub
    kidR: 4,             // child dot radius (at whole-school zoom)
    sizeBoost: 0.55,     // 0 = dots keep their on-screen size when zoomed in, 1 = they grow with the camera
    lineW: 1,            // spoke width
    childRule: 'mean',   // child colour: 'mean' = band of average score, 'mode' = most common band
    targetPull: 0.035,   // physics: pull of each node toward its dandelion position
    linkPull: 0.06,      // physics: spring strength of each spoke
    repel: 0.5,          // physics: push between overlapping nodes
    damping: 0.2,        // physics: velocity lost per frame (higher = calmer, slower glides)
    breatheAmp: 2.2,     // idle float distance (viewBox units; 0 = still)
    breatheSpeed: 0.7,   // idle float speed
    storySpread: 1.15,   // how far groups pull apart on story steps that compare them
    dimOpacity: 0.14,    // opacity of parts a story step is not about
    ringRule: 'majority', // hub colour: 'majority' = what most children are (tie → lower) · 'mix' = the largest share (same unless counts differ by rounding)
    blobAmp: 0,          // how irregular every dot and hub is (share of its radius; 0 = perfect circle)
    alive: true,         // orbs gently swell and slowly reshape, each at its own pace (off for reduced motion)
    alivePulse: 0.035,   // how much each orb swells and shrinks (±3.5% of its size)
    aliveMorph: 0.35,    // how fast an orb's outline slowly changes shape (radians / second)
    // Swarm: child dots behave like a swarm round their class hub (off for reduced motion)
    swarm: true,         // false = children sit still in their burst (just the idle float)
    swarmSpeed: 0.12,    // how fast a class's swarm circles its hub (radians / second; ~1 lap a minute)
    swarmBreath: 0.12,   // how much the swarm swells and tightens (share of the spoke length)
    swarmAlign: 0.04,    // how strongly each child matches its classmates' heading (flocking)
    swarmWander: 0.15,   // random jostle per frame (each child's own little wander)
    demoDaysLeft: 6,     // demo only (no window end date): days left in the open window — ≤ 3 raises the "closing soon" warning
    demoDaysSinceClose: 3, // demo only (no window end date): days since the last window closed — results for 14, then the activity
  };
  var DL_W = 600;   // viewBox width; height follows the tree's aspect

  // Scope from route params → { level, grade, sectionId }.
  function dlScope(params) {
    var sd = params.section && AD.sections.find(function (s) { return s.id === params.section; });
    if (sd) return { level: 'section', grade: sd.grade, sectionId: sd.id };
    if (params.grade && AD.grades.indexOf(params.grade) >= 0) return { level: 'grade', grade: params.grade };
    return { level: 'school' };
  }
  function dlModes() {
    var m = [];
    if (AD.openPoint) m.push('checkin');
    if (AD.latestComplete) m.push('results');
    return m;
  }
  function dlMode(params) {
    var m = dlModes();
    return m.indexOf(params.view) >= 0 ? params.view : m[0] || 'checkin';
  }
  function dlParamsFor(n) {
    if (n.type === 'grade') return { grade: n.id };
    if (n.type === 'section') return { grade: n.grade, section: n.id };
    return {};
  }
  function dlParamsForScope(scope) {
    if (scope.level === 'section') return { grade: scope.grade, section: scope.sectionId };
    if (scope.level === 'grade') return { grade: scope.grade };
    return {};
  }
  function dlUpParams(scope) { return scope.level === 'section' ? { grade: scope.grade } : {}; }

  // Tree for the focused node. Kid nodes carry their student.
  function dlTree(scope) {
    function kidNodes(sd) { return AD.studentsInSection(sd).map(function (s) { return { type: 'kid', id: s.adm, student: s, grade: sd.grade }; }); }
    // `name` is display text (base in brackets when renamed); `id` stays the key.
    function secNode(sd) { return { type: 'section', id: sd.id, name: sLbl(sd), grade: sd.grade, section: sd.section, teacher: AD.teacherFor(sd), children: kidNodes(sd) }; }
    function gradeNode(g) { return { type: 'grade', id: g, name: gLbl(g), children: AD.sections.filter(function (s) { return s.grade === g; }).map(secNode) }; }
    if (scope.level === 'section') return secNode(AD.sections.find(function (s) { return s.id === scope.sectionId; }));
    if (scope.level === 'grade') return gradeNode(scope.grade);
    return { type: 'school', id: 'school', name: (AD.school && AD.school.name) || 'Your school', children: AD.grades.map(gradeNode) };
  }
  function dlStudents(node) {
    if (node.type === 'kid') return [node.student];
    return node.children.reduce(function (a, c) { return a.concat(dlStudents(c)); }, []);
  }
  function dlKey(n) { return n.type + ':' + n.id; }
  function dlFocusKey(scope) { return scope.level === 'section' ? 'section:' + scope.sectionId : scope.level === 'grade' ? 'grade:' + scope.grade : 'school:school'; }
  function dlSubtree(n) { return [n].concat((n.children || []).reduce(function (a, c) { return a.concat(dlSubtree(c)); }, [])); }

  // Radial layout in world units, school hub at (0,0). Each child fans around its
  // parent's outward direction, so every subtree reads as its own burst.
  // `sep` stretches the focus hub's own ring (story steps that compare groups).
  function dlLayout(root, sep, focusKey) {
    var DIST = { grade: DL_CFG.gradeDist, section: DL_CFG.sectionDist, kid: DL_CFG.kidDist };
    var SPREAD = { grade: 360, section: DL_CFG.sectionSpread, kid: DL_CFG.kidSpread };
    var nodes = [];
    (function place(n, x, y, dir, depth, parent) {
      n.lx = x; n.ly = y; n.dir = dir; n.depth = depth; n.parent = parent; n.key = dlKey(n); nodes.push(n);
      var kids = n.children || [], k = kids.length; if (!k) return;
      var full = depth === 0;   // the focus hub's children ring all the way round
      var spread = full ? 360 : SPREAD[kids[0].type];
      // Seeded per node (stable across reloads and levels), so the asymmetry is organic, not random each paint.
      var wob = function (id, salt) { return (hashStr(id + salt) % 2000) / 1000 - 1; };   // −1…1
      if (kids[0].type === 'kid') spread *= 1 - 0.3 * DL_CFG.asymmetry * Math.abs(wob(n.id, ':fan'));
      var slot = spread / k;
      // Many sections on one grade: lengthen the grade→section spokes so neighbouring
      // class bursts fit side by side on the fan (arc between them ≥ burst + gap).
      var minD = kids[0].type === 'section' && k > 1 ? (2 * dlBurstR() + DL_CFG.sectionGap) / (slot * Math.PI / 180) : 0;
      kids.forEach(function (c, i) {
        var a = full ? DL_CFG.rootAngle + i * 360 / k : dir - spread / 2 + (i + 0.5) * slot;
        var d = Math.max(DIST[c.type], c.type === 'section' ? minD : 0) * (n.key === focusKey ? sep || 1 : 1);
        if (c.type === 'kid') {
          d *= 1 + DL_CFG.kidJitter * wob(c.id, '');
          a += DL_CFG.kidScatter * 0.5 * slot * wob(c.id, ':a');
        } else {
          a += DL_CFG.asymmetry * Math.min(40, slot * 0.35) * wob(c.id, ':a');
          d *= 1 + DL_CFG.asymmetry * 0.3 * wob(c.id, ':d');
        }
        var rad = a * Math.PI / 180;
        place(c, x + d * Math.cos(rad), y + d * Math.sin(rad), a, depth + 1, n);
      });
    })(root, 0, 0, DL_CFG.rootAngle, 0, null);
    dlSeparate(nodes);
    return nodes;
  }
  // Keep classes apart, and keep every grade's classes together:
  //  1) within each grade, push its class bursts (section + children, as one disc)
  //     apart and off the grade + school hubs, so two classes never read as one blob;
  //  2) then treat each whole grade (hub + classes + children) as one disc and push
  //     grade discs apart as rigid groups, so one grade's classes never mix in
  //     among another grade's.
  function dlBurstR() { return DL_CFG.kidDist * (1 + DL_CFG.kidJitter) + DL_CFG.kidR; }   // radius of one class burst
  function dlSeparate(nodes) {
    var R = dlBurstR(), root = nodes[0], gap = DL_CFG.sectionGap;
    var grades = nodes.filter(function (n) { return n.type === 'grade'; });
    function shift(n, dx, dy) { n.lx += dx; n.ly += dy; (n.children || []).forEach(function (c) { shift(c, dx, dy); }); }
    // Push b (and a, by 1 − share) apart along the line between them; the school hub never moves.
    function apart(a, b, min, share) {
      var dx = b.lx - a.lx, dy = b.ly - a.ly, d = Math.hypot(dx, dy);
      if (d >= min - 0.05) return false;   // tolerance so tiny residual pushes can't keep the loop alive
      if (d < 0.01) { dx = 1; dy = 0; d = 1; }
      var push = (min - d), ux = dx / d, uy = dy / d;
      if (a.depth > 0) shift(a, -ux * push * (1 - share), -uy * push * (1 - share));
      shift(b, ux * push * share, uy * push * share);
      return true;
    }
    var it, moved;
    // 1) classes within each grade (capped so a pathological config can't hang the page)
    for (it = 0; it < 600; it++) {
      moved = false;
      grades.forEach(function (g) {
        var secs = g.children || [];
        for (var i = 0; i < secs.length; i++) {
          for (var j = i + 1; j < secs.length; j++) moved = apart(secs[i], secs[j], 2 * R + gap, 0.5) || moved;
          moved = apart(g, secs[i], R + DL_CFG.gradeR + gap * 0.5, 1) || moved;
          moved = apart(root, secs[i], R + DL_CFG.rootR + gap * 0.5, 1) || moved;
        }
      });
      if (!moved) break;
    }
    // 2) whole grades as rigid discs: centre = mean of the grade hub and its classes,
    //    radius reaches the far edge of its furthest class burst. A grade only ever
    //    slides OUTWARD along its own spoke — never sideways — so it can't be pushed
    //    across the centre and end up with its classes fanned back over the school hub.
    var discs = grades.map(function (g) {
      var pts = [{ x: g.lx, y: g.ly, r: DL_CFG.gradeR }].concat((g.children || []).map(function (c) { return { x: c.lx, y: c.ly, r: R }; }));
      var cx = pts.reduce(function (a, p) { return a + p.x; }, 0) / pts.length, cy = pts.reduce(function (a, p) { return a + p.y; }, 0) / pts.length;
      var rad = g.dir * Math.PI / 180;
      return { g: g, ox: cx - g.lx, oy: cy - g.ly, ux: Math.cos(rad), uy: Math.sin(rad),
        r: pts.reduce(function (m, p) { return Math.max(m, Math.hypot(p.x - cx, p.y - cy) + p.r); }, 0) };
    });
    var out = function (D, by) { shift(D.g, D.ux * by, D.uy * by); };
    var rootClear = DL_CFG.rootR + DL_CFG.gradeGap * 0.5;
    for (it = 0; it < 600; it++) {
      moved = false;
      discs.forEach(function (D) {   // clear of the school hub
        var d = Math.hypot(D.g.lx + D.ox, D.g.ly + D.oy), need = D.r + rootClear;
        if (d < need - 0.05) { out(D, need - d); moved = true; }
      });
      for (var i = 0; i < discs.length; i++) for (var j = i + 1; j < discs.length; j++) {
        var A = discs[i], B = discs[j];
        var d2 = Math.hypot((B.g.lx + B.ox) - (A.g.lx + A.ox), (B.g.ly + B.oy) - (A.g.ly + A.oy)), min = A.r + B.r + DL_CFG.gradeGap;
        if (d2 >= min - 0.05) continue;
        var step = Math.max(0.5, (min - d2) / 2);   // both grades step out along their own spokes
        out(A, step); out(B, step);
        moved = true;
      }
      if (!moved) break;
    }
  }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // Bounding box of nodes (world units), with room for dots and labels.
  function dlBox(nodes) {
    var b = nodes.reduce(function (b, n) { return { x0: Math.min(b.x0, n.lx), y0: Math.min(b.y0, n.ly), x1: Math.max(b.x1, n.lx), y1: Math.max(b.y1, n.ly) }; },
      { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
    var m = 14 + DL_CFG.kidR * 2;
    return { x0: b.x0 - m, y0: b.y0 - m, x1: b.x1 + m, y1: b.y1 + m + 12 };   // + label room under the lowest hub
  }
  // Camera (viewBox) that shows the box at a fixed aspect, centred.
  function dlCamFit(box, aspect) {
    var w = box.x1 - box.x0, h = box.y1 - box.y0;
    if (h > w * aspect) w = h / aspect;
    h = w * aspect;
    return { x: (box.x0 + box.x1) / 2 - w / 2, y: (box.y0 + box.y1) / 2 - h / 2, w: w, h: h };
  }

  // Colours
  var DL_STATUS = {
    done:  { label: 'Assessed',    color: 'var(--status-done-dot)', ink: 'var(--green-700)' },
    draft: { label: 'In progress', color: 'var(--lvl-2)',           ink: 'var(--lvl-2-ink)' },
    none:  { label: 'Not started', color: 'var(--ink-300)',         ink: 'var(--ink-700)' },
  };
  function dlKidBand(st, pt) {
    var f = pt.scoreField;
    if (DL_CFG.childRule === 'mode') {
      var c = { emerging: 0, developing: 0, secure: 0 };
      st.skills.forEach(function (sk) { c[AD.bandOf(sk[f])]++; });
      return ['secure', 'developing', 'emerging'].reduce(function (b, k) { return c[k] > c[b] ? k : b; }, 'emerging');
    }
    return AD.bandOf(AD.meanScore(st, f));
  }
  // Pooled skill-reading distribution for any set of students.
  function dlDist(students, pointKey) {
    var c = { emerging: 0, developing: 0, secure: 0 }, n = 0;
    var f = AD.points.find(function (p) { return p.key === pointKey; }).scoreField;
    students.forEach(function (st) { st.skills.forEach(function (sk) { c[AD.bandOf(sk[f])]++; n++; }); });
    var p = function (x) { return n ? Math.round(x / n * 100) : 0; };
    return { n: n, counts: c, pct: { emerging: p(c.emerging), developing: p(c.developing), secure: p(c.secure) } };
  }
  function dlCheckinCounts(students) {
    var c = { done: 0, draft: 0, none: 0 };
    students.forEach(function (s) { c[AD.checkinStatus(s) || 'none']++; });
    return c;
  }
  // Segments [{color, share}] for a hub's donut ring + its tooltip line.
  // Hub colour (DL_CFG.ringRule): 'majority' = whatever most children in the group
  // are — their overall band in Results, their status in Check-in. A tie goes to the
  // lower band / less-finished status (the cautious reading). 'mix' = the shares (the
  // hub then takes the largest). The tooltip always lists the full counts.
  function dlMajority(order, counts) {   // `order` lowest → highest; strict > keeps the lower on a tie
    return order.reduce(function (best, k) { return best == null || counts[k] > counts[best] ? k : best; }, null);
  }
  function dlSummary(node, mode) {
    var studs = dlStudents(node), n = studs.length, mix = DL_CFG.ringRule === 'mix';
    if (mode === 'checkin') {
      var c = dlCheckinCounts(studs), top = dlMajority(['none', 'draft', 'done'], c);
      return { n: n, text: c.done + ' of ' + n + ' assessed' + (c.draft ? ' · ' + c.draft + ' in progress' : ''),
        segs: mix ? ['done', 'draft', 'none'].map(function (k) { return { color: DL_STATUS[k].color, share: n ? c[k] / n : 0 }; })
          : [{ color: DL_STATUS[top].color, share: n ? 1 : 0 }] };
    }
    var pt = AD.latestComplete, kc = { emerging: 0, developing: 0, secure: 0 };
    studs.forEach(function (st) { kc[dlKidBand(st, pt)]++; });
    var topB = dlMajority(['emerging', 'developing', 'secure'], kc);
    var text = 'Mostly ' + AD.bandMeta(topB).label + ' · ' + ['secure', 'developing', 'emerging'].map(function (k) { return kc[k] + ' ' + AD.bandMeta(k).label; }).join(' · ');
    if (mix) { var d = dlDist(studs, pt.key); return { n: n, text: text, segs: AD.bands.map(function (b) { return { color: b.color, share: d.n ? d.counts[b.key] / d.n : 0 }; }) }; }
    return { n: n, text: text, segs: [{ color: AD.bandMeta(topB).color, share: n ? 1 : 0 }] };
  }
  function dlArc(r, a0, a1) {
    if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
    return 'M' + (r * Math.cos(a0)).toFixed(2) + ' ' + (r * Math.sin(a0)).toFixed(2) + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + (r * Math.cos(a1)).toFixed(2) + ' ' + (r * Math.sin(a1)).toFixed(2);
  }
  // Hub drawn around (0,0); the group is translated each frame.
  // Organic dot: a closed, smooth outline whose radius wobbles a little round the
  // centre (two seeded waves), so no two dots are quite the same circle. Same seed →
  // same shape on every render. DL_CFG.blobAmp sets how irregular (0 = true circle).
  // `sec` (optional, seconds): the wobble slowly travels round the outline, so the orb gently reshapes.
  function dlBlobPath(r, seed, sec) {
    var amp = DL_CFG.blobAmp, N = 10, pts = [];
    if (!amp) { var q = r.toFixed(2); return 'M' + q + ' 0A' + q + ' ' + q + ' 0 1 1 -' + q + ' 0A' + q + ' ' + q + ' 0 1 1 ' + q + ' 0Z'; }   // perfect circle
    var h = hashStr(seed), p1 = (h % 628) / 100, p2 = ((h >>> 10) % 628) / 100, rot = ((h >>> 20) % 628) / 100;
    if (sec) { var v = DL_CFG.aliveMorph * (0.7 + (h % 600) / 1000); p1 += sec * v; p2 -= sec * v * 0.63; }   // own pace per orb
    for (var i = 0; i < N; i++) {
      var t = rot + i * Math.PI * 2 / N;
      var k = 1 + amp * (0.65 * Math.sin(2 * t + p1) + 0.35 * Math.sin(3 * t + p2));
      pts.push([r * k * Math.cos(t), r * k * Math.sin(t)]);
    }
    // Catmull-Rom through the points → cubic Béziers (smooth, closed)
    var f = function (v) { return v.toFixed(2); }, d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (var j = 0; j < N; j++) {
      var a = pts[(j - 1 + N) % N], b = pts[j], c = pts[(j + 1) % N], e = pts[(j + 2) % N];
      d += 'C' + f(b[0] + (c[0] - a[0]) / 6) + ' ' + f(b[1] + (c[1] - a[1]) / 6) + ' ' + f(c[0] - (e[0] - b[0]) / 6) + ' ' + f(c[1] - (e[1] - b[1]) / 6) + ' ' + f(c[0]) + ' ' + f(c[1]);
    }
    return d + 'Z';
  }
  // Hub = one solid organic blob in the colour of what most of its children are
  // (no ring). The white edge keeps it apart from same-coloured child dots.
  // Hub = one solid organic orb in the colour of what most of its children are.
  // The white edge keeps it apart from same-coloured child dots.
  function dlHubSVG(r, segs, seed) {
    var top = segs.reduce(function (b, x) { return !b || x.share > b.share ? x : b; }, null);
    return '<path data-blob-r="' + r.toFixed(2) + '" d="' + dlBlobPath(r, seed) + '" style="fill:' + (top && top.share > 0 ? top.color : 'var(--white)') + ';stroke:var(--white);stroke-width:' + Math.max(1.5, r * 0.12).toFixed(2) + '"/>';
  }
  // Can this hub be clicked from the current focus? Its children (one down), or the focus itself (one up).
  function dlNav(n, focusKey, scope) {
    if (n.type === 'kid') return null;
    if (n.key === focusKey) return scope.level === 'school' ? null : 'up';
    return n.parent && n.parent.key === focusKey ? 'down' : null;
  }
  // Hub size follows the hierarchy — school > grade > section > child — and the
  // order is enforced, so no tuning value can make a section outgrow its grade.
  function dlHubR(n) {
    var school = DL_CFG.rootR, grade = Math.min(DL_CFG.gradeR, school * 0.9);
    if (n.type === 'school') return school;
    if (n.type === 'grade') return grade;
    var sec = n.children && n.children[0] && n.children[0].hidden ? DL_CFG.classHubR : DL_CFG.sectionR;   // bigger while it stands in for its children
    return Math.max(DL_CFG.kidR * 1.3, Math.min(sec, grade * 0.85));
  }
  // One brand colour per grade, shared by the Roster cards and the dandelion
  // (--grade-1…6 on :root in admin.html; cycles past six grades).
  function gradeColor(g) { var i = AD.grades.indexOf(g); return 'var(--grade-' + ((i < 0 ? 0 : i) % 6 + 1) + ')'; }
  // Spoke = dotted line whose colour runs from the parent's colour to the child's
  // (a per-spoke gradient in screen-independent world units; dlDraw moves its ends
  // with the line every frame). Gradient defs are collected per render in dlSpokeDefs.
  var dlSpokeDefs = '';
  function dlSpokeSVG(n, i, cls, w) {
    var a = (n.parent && n.parent.color) || 'var(--ink-300)', b = n.color || a, id = 'dls' + i;
    dlSpokeDefs += '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:' + a + '"/><stop offset="1" style="stop-color:' + b + '"/></linearGradient>';
    return '<line class="dl-spoke ' + cls + '" data-dl-i="' + i + '" vector-effect="non-scaling-stroke" stroke-width="' + w + '" style="stroke:url(#' + id + ')"/>';
  }
  // School admins can see which child a dot is (hover, or click for a card with "Open profile"), in both modes.
  function dlKidNames(mode) { return isCoordinator; }

  // ---- the living graph ----
  // ONE whole-school layout (world units, school hub at 0,0). Every level is a
  // camera on it: clicking a grade or section eases the viewBox in on that
  // branch; nothing re-arranges. Parts outside the focus stay, faded, as context.
  // `pos` (world positions) and `cam` survive re-renders, so the router's full
  // page repaint continues the same picture instead of restarting it.
  var dlSim = { raf: 0, pos: {}, g: null, cam: null, camFrom: null, camTo: null, camT0: null };
  var DL_REDUCE = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function dandelionSVG(scope, mode) {
    dlSpokeDefs = '';
    var focusKey = dlFocusKey(scope), pt = AD.latestComplete, names = dlKidNames(mode), still = DL_REDUCE.matches;
    // Cameras are fitted to the spread-out arrangement so story steps stay in frame.
    var sbox = dlBox(dlLayout(dlTree({ level: 'school' }), DL_CFG.storySpread, 'school:school'));
    var aspect = Math.min(1, Math.max(0.62, (sbox.y1 - sbox.y0) / (sbox.x1 - sbox.x0)));
    var schoolCam = dlCamFit(sbox, aspect);
    var spread = dlLayout(dlTree({ level: 'school' }), DL_CFG.storySpread, focusKey);
    var camTo = dlCamFit(dlBox(dlSubtree(spread.find(function (n) { return n.key === focusKey; }))), aspect);
    var root = dlTree({ level: 'school' }), nodes = dlLayout(root, 1, focusKey);
    var focus = nodes.find(function (n) { return n.key === focusKey; }), inFocus = {};
    dlSubtree(focus).forEach(function (n) { inFocus[n.key] = true; });
    // Child-dot rule: dots only for the focused branch, and only when it has no more
    // than kidDotMax children. Otherwise each class shows as one bigger summary hub,
    // and its children burst out of it once you zoom in far enough.
    var showKids = dlKidsShown(scope);
    nodes.forEach(function (n) { n.hidden = n.type === 'kid' && (!showKids || !inFocus[n.key]); });
    var vis = nodes.filter(function (n) { return !n.hidden; });
    var lines = '', kids = '', hubs = '', labels = '';
    vis.forEach(function (n, i) {
      n.i = i; n.tx = n.lx; n.ty = n.ly;
      var prev = dlSim.pos[n.key], ctx = inFocus[n.key] ? '' : ' ctx';
      if (still) { n.x = n.tx; n.y = n.ty; }
      else if (prev) { n.x = prev.x; n.y = prev.y; }
      else if (n.parent) { n.x = n.parent.x + (Math.random() - 0.5); n.y = n.parent.y + (Math.random() - 0.5); }
      else { n.x = n.tx; n.y = n.ty; }
      n.vx = 0; n.vy = 0; n.ph = (hashStr(n.key) % 6283) / 1000;
      // swarm: each class circles one way (seeded by the class), each child at its own pace (0.75–1.25×)
      if (n.type === 'kid' && n.parent) n.swSpd = (hashStr(n.parent.key) % 2 ? 1 : -1) * (0.75 + (hashStr(n.key + ':sw') % 1000) / 2000);
      n.mass = n.type === 'kid' ? 1 : 1 + dlStudents(n).length;
      if (n.parent) n.rest = Math.hypot(n.tx - n.parent.tx, n.ty - n.parent.ty);
      if (n.type === 'kid') {
        n.base = DL_CFG.kidR;
        var fill, stroke = 'var(--white)', sw = 1.2, tip = '';
        if (mode === 'checkin') {
          var s = AD.checkinStatus(n.student) || 'none';
          fill = s === 'none' ? 'var(--white)' : DL_STATUS[s].color;
          if (s === 'none') { stroke = DL_STATUS.none.color; sw = Math.max(1, n.base * 0.35); }
          if (names) tip = '<b>' + esc(n.student.name) + '</b><span>' + DL_STATUS[s].label + '</span>';
        } else {
          var b = AD.bandMeta(dlKidBand(n.student, pt));
          fill = b.color;
          if (names) tip = '<b>' + esc(n.student.name) + '</b><span>' + esc(b.label) + ' overall</span>';
        }
        n.color = fill === 'var(--white)' ? DL_STATUS.none.color : fill;
        lines += dlSpokeSVG(n, i, 'kid' + ctx, DL_CFG.lineW * 0.6);
        kids += '<path class="dl-kid' + ctx + '" data-dl-i="' + i + '" data-blob-r="' + n.base + '" d="' + dlBlobPath(n.base, n.key) + '" style="fill:' + fill + ';stroke:' + stroke + ';stroke-width:' + sw + '"' +
          (tip && !ctx ? ' data-dl-tip="' + esc(tip) + '"' : '') + '/>';
        return;
      }
      var sum = dlSummary(n, mode), nav = ctx ? null : dlNav(n, focusKey, scope);
      n.base = dlHubR(n);
      var topSeg = sum.segs.reduce(function (b, x) { return !b || x.share > b.share ? x : b; }, null);
      n.color = topSeg && topSeg.share > 0 ? topSeg.color : 'var(--ink-300)';   // the hub's own colour (its spoke ends blend into it)
      var htip = '<b>' + esc(n.name) + '</b>' + (n.teacher ? '<span>' + esc(n.teacher) + '</span>' : '') +
        '<span>' + countNoun(sum.n, 'child', 'children') + (dlHubCounts(n) ? ' · ' + dlHubCounts(n) : '') + '</span>' +
        '<span>' + esc(sum.text) + '</span>' +
        (nav === 'down' ? '<em>Click to look closer</em>' : nav === 'up' ? '<em>Click to step back</em>' : '');
      if (n.parent) lines += dlSpokeSVG(n, i, 'hub' + ctx, n.type === 'section' ? DL_CFG.lineW : DL_CFG.lineW * 1.4);
      hubs += '<g class="dl-hub' + (nav ? ' nav' : '') + ctx + '" data-dl-i="' + i + '"' + (ctx ? '' : ' data-dl-tip="' + esc(htip) + '"') +
        (nav ? ' data-dl-nav="' + nav + '" tabindex="0" role="button" aria-label="' + esc((nav === 'up' ? 'Step back from ' : 'Look closer at ') + n.name + ', ' + sum.text) + '"' : '') + '>' +
        '<circle class="dl-hit" r="' + (n.base + 6) + '"/>' +
        dlHubSVG(n.base, sum.segs, n.key) + '</g>';
      var lbl = n.type === 'section' && scope.level !== 'school' && !ctx ? 'Section ' + secShort(n.grade, n.section) : n.name;
      // Big schools: at whole-school zoom (and for faded neighbours) show grade labels only.
      if (n.type === 'section' && (scope.level === 'school' || ctx) && AD.sections.length > DL_CFG.sectionLabelMax) return;
      labels += '<text class="dl-name d' + Math.min(n.depth, 2) + ctx + '" data-dl-i="' + i + '" font-size="' + (n.depth === 2 ? 11 : 13) + '" text-anchor="middle">' + esc(lbl) + '</text>';
    });
    dlSim.g = { nodes: vis, root: root, focusKey: focusKey, scope: scope, mode: mode, alpha: 1, schoolW: schoolCam.w, f: schoolCam.w / DL_W };
    // Ease from wherever the camera was (previous level) to this level's frame.
    dlSim.camTo = camTo;
    dlSim.camFrom = still || !dlSim.cam ? camTo : dlSim.cam;
    dlSim.cam = dlSim.camFrom; dlSim.camT0 = null;
    var c = dlSim.cam, focusName = scope.level === 'school' ? root.name : focus.name;
    return '<div class="dl-stage">' +
      '<svg class="dl-svg" viewBox="' + [c.x, c.y, c.w, c.h].map(function (v) { return v.toFixed(2); }).join(' ') + '" role="img" aria-label="' + esc(focusName + ': ' + dlSummary(focus, mode).text) + '">' +
        '<defs>' + dlSpokeDefs + '</defs><g class="dl-links">' + lines + '</g><g class="dl-nodes">' + kids + hubs + '</g><g class="dl-labels">' + labels + '</g></svg>' +
      '<div class="dl-tip" role="tooltip" hidden></div></div>';
  }

  // Move every node's target (story steps that pull groups apart) and wake the sim.
  function dlRetarget(sep) {
    var g = dlSim.g; if (!g) return;
    dlLayout(g.root, sep || 1, g.focusKey);
    g.nodes.forEach(function (n) {
      n.tx = n.lx; n.ty = n.ly;
      if (n.parent) n.rest = Math.hypot(n.tx - n.parent.tx, n.ty - n.parent.ty);
      if (DL_REDUCE.matches) { n.x = n.tx; n.y = n.ty; }
    });
    dlWake();
  }
  function dlWake() { var g = dlSim.g; if (!g) return; g.alpha = 1; if (!dlSim.raf) dlSim.raf = requestAnimationFrame(dlFrame); }

  // Camera: ease centre linearly and width on a log scale (feels like a steady zoom).
  function dlCamStep(t) {
    if (!dlSim.camTo) return false;
    if (dlSim.camT0 == null) dlSim.camT0 = t;
    var p = DL_CFG.zoomMs > 0 ? Math.min(1, (t - dlSim.camT0) / DL_CFG.zoomMs) : 1;
    var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    var a = dlSim.camFrom, b = dlSim.camTo;
    var w = Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * e), h = w * (b.h / b.w);
    var cx = a.x + a.w / 2 + ((b.x + b.w / 2) - (a.x + a.w / 2)) * e, cy = a.y + a.h / 2 + ((b.y + b.h / 2) - (a.y + a.h / 2)) * e;
    dlSim.cam = { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
    return p < 1;
  }
  // World units per base unit for dots/hubs (grows with zoom per sizeBoost), and for text (constant on screen).
  function dlScales() {
    var g = dlSim.g, z = g.schoolW / dlSim.cam.w;
    return { z: z, s: g.f * Math.pow(z, DL_CFG.sizeBoost - 1), ts: g.f / z };
  }

  function dlSwarmOn() { return DL_CFG.swarm && !DL_REDUCE.matches; }
  function dlTick(t, sc) {
    var g = dlSim.g, N = g.nodes, i, j, n;
    var amp = DL_REDUCE.matches ? 0 : DL_CFG.breatheAmp * sc.ts, spd = DL_CFG.breatheSpeed * t / 1000, gap = 2 * sc.ts;
    var swarm = dlSwarmOn(), sec = t / 1000, flock = {};
    if (swarm) for (i = 0; i < N.length; i++) {   // each class's average heading (last frame) — the flocking pull
      n = N[i]; if (n.type !== 'kid' || !n.parent) continue;
      var fk = flock[n.parent.key] || (flock[n.parent.key] = { vx: 0, vy: 0, k: 0 });
      fk.vx += n.vx; fk.vy += n.vy; fk.k++;
    }
    for (i = 0; i < N.length; i++) {
      n = N[i]; n.ax = 0; n.ay = 0; n.r = n.base * sc.s;
      if (swarm && n.type === 'kid' && n.parent) {
        // Swarm: the child's place in the burst slowly circles its (moving) hub, the
        // burst swells and tightens, classmates loosely match headings, plus a little jostle.
        var hp = n.parent, ang = DL_CFG.swarmSpeed * n.swSpd * sec;
        var ox = n.tx - hp.tx, oy = n.ty - hp.ty, ca = Math.cos(ang), sa = Math.sin(ang);
        var k = 1 + DL_CFG.swarmBreath * Math.sin(sec * 0.9 + n.ph);
        n.ax += (hp.x + (ox * ca - oy * sa) * k - n.x) * DL_CFG.targetPull;
        n.ay += (hp.y + (ox * sa + oy * ca) * k - n.y) * DL_CFG.targetPull;
        var fl = flock[hp.key];
        if (fl && fl.k > 1) { n.ax += (fl.vx / fl.k - n.vx) * DL_CFG.swarmAlign; n.ay += (fl.vy / fl.k - n.vy) * DL_CFG.swarmAlign; }
        n.ax += (Math.random() - 0.5) * DL_CFG.swarmWander * sc.ts; n.ay += (Math.random() - 0.5) * DL_CFG.swarmWander * sc.ts;
        continue;
      }
      var a = amp * (n.type === 'kid' ? 1 : n.depth === 0 ? 0.25 : 0.55);
      n.ax += (n.tx + a * Math.sin(spd + n.ph) - n.x) * DL_CFG.targetPull;
      n.ay += (n.ty + a * Math.cos(spd * 0.83 + n.ph * 1.3) - n.y) * DL_CFG.targetPull;
    }
    for (i = 0; i < N.length; i++) {   // spokes as springs; the lighter end moves more
      n = N[i]; var p = n.parent; if (!p) continue;
      var dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy) || 0.01;
      var f = (d - n.rest) / d * DL_CFG.linkPull, wn = p.mass / (p.mass + n.mass), wp = 1 - wn;
      n.ax -= dx * f * wn; n.ay -= dy * f * wn; p.ax += dx * f * wp; p.ay += dy * f * wp;
    }
    // Overlap push. Only nearby pairs are checked: nodes go into a grid of cells
    // one "largest overlap" wide, and each node looks at its own + 8 neighbouring
    // cells, so a 900-child school costs about what the 100-child demo does.
    var maxR = 0;
    for (i = 0; i < N.length; i++) if (N[i].r > maxR) maxR = N[i].r;
    var cell = 2 * maxR + gap, grid = {};
    for (i = 0; i < N.length; i++) {
      n = N[i]; n.gx = Math.floor(n.x / cell); n.gy = Math.floor(n.y / cell);
      var gk = n.gx + ',' + n.gy; (grid[gk] || (grid[gk] = [])).push(i);
    }
    for (i = 0; i < N.length; i++) {
      var A = N[i];
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
        var bucket = grid[(A.gx + ox) + ',' + (A.gy + oy)]; if (!bucket) continue;
        for (var q = 0; q < bucket.length; q++) {
          j = bucket[q]; if (j <= i) continue;
          var B = N[j], ex = B.x - A.x, ey = B.y - A.y, min = A.r + B.r + gap;
          if (Math.abs(ex) > min || Math.abs(ey) > min) continue;
          var e = Math.hypot(ex, ey) || 0.01; if (e >= min) continue;
          var push = (min - e) / e * DL_CFG.repel * 0.5;
          A.ax -= ex * push; A.ay -= ey * push; B.ax += ex * push; B.ay += ey * push;
        }
      }
    }
    var energy = 0;
    for (i = 0; i < N.length; i++) {
      n = N[i];
      if (n.fixed) { n.vx = n.vy = 0; continue; }
      n.vx = (n.vx + n.ax) * (1 - DL_CFG.damping); n.vy = (n.vy + n.ay) * (1 - DL_CFG.damping);
      n.x += n.vx; n.y += n.vy; energy += (n.vx * n.vx + n.vy * n.vy) / (sc.ts * sc.ts);
    }
    return energy;
  }
  // "Alive": each orb gently swells and shrinks (alivePulse) and slowly reshapes
  // (aliveMorph), every orb at its own pace. Off for reduced motion.
  function dlAliveOn() { return DL_CFG.alive && !DL_REDUCE.matches; }
  function dlDraw(sc, t) {
    var g = dlSim.g, svg = g.svg, N = g.nodes, c = dlSim.cam, f1 = function (v) { return v.toFixed(2); };
    var alive = dlAliveOn(), sec = (t != null ? t : performance.now()) / 1000;
    svg.setAttribute('viewBox', f1(c.x) + ' ' + f1(c.y) + ' ' + f1(c.w) + ' ' + f1(c.h));
    N.forEach(function (n) { dlSim.pos[n.key] = { x: n.x, y: n.y }; });
    var els = g.els;
    els.spokes.forEach(function (l, k) {
      var n = N[l.dataset.dlI], p = n.parent, gr = els.spokeGrads[k];
      var x1 = f1(p.x), y1 = f1(p.y), x2 = f1(n.x), y2 = f1(n.y);
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      if (gr) { gr.setAttribute('x1', x1); gr.setAttribute('y1', y1); gr.setAttribute('x2', x2); gr.setAttribute('y2', y2); }   // colour follows the ends
    });
    var tr = function (n, k) { return 'translate(' + f1(n.x) + ' ' + f1(n.y) + ') scale(' + k.toFixed(4) + ')'; };
    els.dots.forEach(function (el) {
      var n = N[el.dataset.dlI];
      el.setAttribute('transform', tr(n, sc.s * (alive ? 1 + DL_CFG.alivePulse * Math.sin(sec * 0.8 + n.ph * 2.3) : 1)));
    });
    // Reshape on every 3rd frame only — the change is slow, and it saves rebuilding ~250 outlines per frame.
    if (alive && DL_CFG.blobAmp > 0 && (dlSim.tick = (dlSim.tick || 0) + 1) % 3 === 0) els.blobs.forEach(function (b) { b.el.setAttribute('d', dlBlobPath(b.r, b.seed, sec)); });
    els.names.forEach(function (t) {
      var n = N[t.dataset.dlI];
      t.setAttribute('transform', 'translate(' + f1(n.x) + ' ' + f1(n.y + n.base * sc.s + 15 * sc.ts) + ') scale(' + sc.ts.toFixed(4) + ')');
    });
  }
  function dlFrame(t) {
    dlSim.raf = 0;
    var g = dlSim.g; if (!g || !g.svg || !g.svg.isConnected) return;
    var zooming = dlCamStep(t), sc = dlScales();
    var e = dlTick(t, sc); dlDraw(sc, t);
    g.alpha = e < 0.002 ? g.alpha * 0.9 : 1;
    var idle = DL_REDUCE.matches || (DL_CFG.breatheAmp <= 0 && !dlSwarmOn() && !dlAliveOn());   // a swarm / living orbs never rest
    if ((zooming || !(idle && g.alpha < 0.05)) && !document.hidden) dlSim.raf = requestAnimationFrame(dlFrame);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) dlWake(); });

  function dlStart(stage) {
    cancelAnimationFrame(dlSim.raf); dlSim.raf = 0;
    dlSim.g.svg = stage.querySelector('svg');
    // Looked up once per render, not every frame (900+ elements in a big school).
    var q = function (sel) { return Array.prototype.slice.call(dlSim.g.svg.querySelectorAll(sel)); };
    var spokes = q('.dl-spoke');
    dlSim.g.els = { spokes: spokes, spokeGrads: spokes.map(function (l) { return dlSim.g.svg.querySelector('#dls' + l.dataset.dlI); }), dots: q('.dl-kid, .dl-hub'), names: q('.dl-name'),
      blobs: q('[data-blob-r]').map(function (el) { var host = el.closest('[data-dl-i]'); return { el: el, r: +el.dataset.blobR, seed: dlSim.g.nodes[host.dataset.dlI].key }; }) };
    var sc = dlScales(); dlSim.g.nodes.forEach(function (n) { n.r = n.base * sc.s; });
    dlDraw(sc); dlWake();
  }

  // ---- the guided story: always at most 3 points, filled by priority ----
  // PRODUCT RULE (2026-10-20 — goes in the admin dev handoff, see the spec doc's
  // "Overview points" section):
  //   1. Warnings first, school-wide, whatever the zoom: window closing soon,
  //      sections not started / far behind, invites expiring or expired, setup
  //      gaps (section with no teacher, teacher with no section, new concerns).
  //      Up to all 3 slots.
  //   2. While a window is open: completion only (who's assessed, who's still to
  //      start) for the grade / section in view. Never results while collecting.
  //   3. Window closed, for DL_RESULTS_DAYS after it ends: results statistics for
  //      the scope in view, from a larger pool that rotates every day.
  //   4. After that: ONE activity point (weakest skill → an activity + a talking
  //      point for that class's teacher), below any warnings.
  // Each step: kind ('warn' | 'progress' | 'result' | 'activity'), eyebrow, head
  // (coloured key words), body, `hl` (node keys to light; ancestors added), `sep`.
  var DL_MAX_POINTS = 3, DL_RESULTS_DAYS = 14, DL_CLOSING_DAYS = 3;
  // Key words stay in the headline's own ink (no mid-sentence colour); the eyebrow carries the kind.
  function dlHl(text) { return '<em>' + esc(text) + '</em>'; }
  function dlKidKeys(list) { return list.map(function (s) { return 'kid:' + s.adm; }); }
  function dlSecKeys(sd) { return ['section:' + sd.id].concat(dlKidKeys(AD.studentsInSection(sd))); }
  function dlInBand(studs, skillKey, field, band) {
    return studs.filter(function (s) { var sk = s.skills.find(function (x) { return x.key === skillKey; }); return sk && AD.bandOf(sk[field]) === band; });
  }
  // Whole days (no end date set → the demo value DL_CFG.demoDaysLeft / demoDaysSinceClose).
  function dlToday() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function dlDateOf(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function dlDaysLeft() { var l = AD.openPoint ? AD.daysLeft(AD.openPoint) : null; return l != null ? l : DL_CFG.demoDaysLeft; }
  function dlDaysSinceClose() {
    var end = AD.latestComplete && dlDateOf(AD.latestComplete.end);
    return end ? Math.max(0, Math.round((dlToday() - end) / 864e5)) : DL_CFG.demoDaysSinceClose;
  }
  function dlPhase() {
    if (AD.openPoint) return 'collecting';
    if (!AD.latestComplete) return 'none';
    return dlDaysSinceClose() <= DL_RESULTS_DAYS ? 'results' : 'activity';
  }
  // Children with no completed check-in at a closed point. Created schools read
  // TilliAPI completions; the demo has none missing (every child has scores).
  function dlMissed(studs, pt) {
    var A = window.TilliAPI;
    if (!window.TILLI_CREATED || !A || !A.childStatus) return [];
    return studs.filter(function (s) { var st = A.childStatus(currentSchoolId(), pt.label, s.adm); return st && st !== 'done'; });
  }

  // Priority 1 — warnings for the whole school, most urgent first.
  function dlWarnings() {
    var out = [], warn = 'var(--warn-700)', op = AD.openPoint;
    if (op) {
      var left = dlDaysLeft(), notDone = AD.students.filter(function (s) { return AD.checkinStatus(s) !== 'done'; });
      if (left <= DL_CLOSING_DAYS && notDone.length) out.push({ kind: 'warn', eyebrow: op.label + ' closing soon',
        head: dlHl(op.label + (left === 0 ? ' closes today' : ' closes in ' + countNoun(left, 'day', 'days')), warn) + ' and ' + countNoun(notDone.length, 'child is', 'children are') + ' still to assess.',
        body: 'A nudge to the teachers now saves a scramble at the end.', hl: dlKidKeys(notDone) });
      var cs = AD.collectionStatus(), stalled = cs.rows.filter(function (r) { return r.flag === 'stalled'; }), slow = cs.rows.filter(function (r) { return r.flag === 'slow'; });
      var sdOf = function (r) { return AD.sections.find(function (x) { return x.id === r.id; }); };
      if (stalled.length) out.push({ kind: 'warn', eyebrow: 'Not started',
        head: stalled.length === 1 ? dlHl(sLbl(stalled[0]), warn) + ' hasn' + '’' + 't started ' + esc(op.label) + ' yet.' : dlHl(countNoun(stalled.length, 'section hasn', 'sections haven') + '’' + 't started', warn) + ' ' + esc(op.label) + ' yet.',
        body: stalled.length === 1 ? esc(stalled[0].teacher) + ' may need a hand getting going.' : stalled.slice(0, 4).map(function (r) { return esc(sLbl(r)) + ' (' + esc(r.teacher) + ')'; }).join(', ') + (stalled.length > 4 ? ' and more.' : '.'),
        hl: stalled.reduce(function (a, r) { return a.concat(dlSecKeys(sdOf(r))); }, []), sep: true });
      else if (slow.length && cs.lead) {
        var back = slow.reduce(function (b, r) { return !b || r.pct < b.pct ? r : b; }, null);
        out.push({ kind: 'warn', eyebrow: 'Falling behind',
          head: dlHl(sLbl(back), warn) + ' is at ' + back.pct + '% while ' + esc(sLbl(cs.lead)) + ' is at ' + cs.lead.pct + '%.',
          body: esc(back.teacher) + ' may need a hand or a little more time.' + (slow.length > 1 ? ' ' + countNoun(slow.length - 1, 'other section is', 'other sections are') + ' behind too.' : ''),
          hl: dlSecKeys(sdOf(back)).concat(dlSecKeys(sdOf(cs.lead))), sep: true });
      }
    }
    var inv = inviteAlerts();
    if (inv.length) out.push({ kind: 'warn', eyebrow: 'Invites',
      head: inv.length === 1 ? dlHl(inv[0].u.name, warn) + '’' + 's invite ' + inviteLeftText(inv[0].inf) + '.' : dlHl(inviteWhoText(inv), warn) + ' haven' + '’' + 't accepted their invites.',
      body: (inv.length === 1 ? (inv[0].inf.expired ? 'They can' + '’' + 't sign in until it' + '’' + 's resent.' : 'It runs out on ' + esc(fmtInvDate(inv[0].inf.expires)) + '.') : inviteSplitText(inv)) +
        ' <button type="button" class="btn-link dl-ptlink" data-goinvites>Resend from Your team →</button>' });
    var noTeacher = AD.sections.filter(function (sd) { return !AD.teachers.some(function (t) { return t.id === sd.teacherId; }); });
    // Only teachers who have joined count: someone still at "Invited" hasn't accepted yet
    // (their own warning is the invite expiry), and invites already carry a section.
    var invited = {}; seedUsers().forEach(function (u) { if (u.status === 'Invited') invited[String(u.email || '').toLowerCase()] = 1; });
    var noSection = AD.teachers.filter(function (t) { return !invited[String(t.email || '').toLowerCase()] && !AD.sections.some(function (sd) { return sd.teacherId === t.id; }); });
    var newConcerns = AD.concernCounts().New, gaps = [];
    if (noTeacher.length) gaps.push(noTeacher.length === 1 ? esc(sLbl(noTeacher[0])) + ' has no teacher' : countNoun(noTeacher.length, 'section has', 'sections have') + ' no teacher');
    if (noSection.length) gaps.push(noSection.length === 1 ? esc(noSection[0].name) + ' has no section' : countNoun(noSection.length, 'teacher has', 'teachers have') + ' no section');
    if (newConcerns) gaps.push(countNoun(newConcerns, 'new concern', 'new concerns') + ' to route');
    if (gaps.length) out.push({ kind: 'warn', eyebrow: 'Needs a look',
      head: dlHl(gaps.length === 1 ? 'One thing needs a look' : gaps.length + ' things need a look', warn) + ': ' + gaps[0] + '.',
      body: (gaps.length > 1 ? gaps.slice(1).join(' · ') + '. ' : '') +
        (newConcerns ? '<button type="button" class="btn-link dl-ptlink" data-dlconcerns>Open concerns →</button> ' : '') +
        (noTeacher.length || noSection.length ? '<button type="button" class="btn-link dl-ptlink" data-goroster>Open Roster →</button>' : ''),
      hl: noTeacher.length ? noTeacher.reduce(function (a, sd) { return a.concat(dlSecKeys(sd)); }, []) : null });
    return out;
  }

  // Priority 2 — completion for the scope in view, while a window is open.
  function dlProgressPool(scope, studs, secs) {
    var op = AD.openPoint, n = studs.length, c = dlCheckinCounts(studs), left = dlDaysLeft(), ink = 'var(--accent-ink)', out = [];
    out.push({ kind: 'progress', eyebrow: op.label + ' check-in',
      head: dlHl(c.done + ' of ' + n, DL_STATUS.done.ink) + ' children assessed' + (c.draft ? ', ' + dlHl(c.draft + ' in progress', DL_STATUS.draft.ink) : '') + '.',
      body: (c.done >= n ? 'Everyone is done' : Math.round(c.done / (n || 1) * 100) + '% complete') + ' · ' + countNoun(left, 'day', 'days') + ' left in the window.' +
        (deployedForText(op.label) ? ' Assessed = finished every ' + op.label + ' assessment deployed here (' + deployedForText(op.label) + ').' : ''),
      hl: dlKidKeys(studs.filter(function (s) { return AD.checkinStatus(s) !== 'none'; })) });
    var waiting = studs.filter(function (s) { return (AD.checkinStatus(s) || 'none') === 'none'; });
    if (waiting.length) out.push({ kind: 'progress', eyebrow: 'Still to start',
      head: dlHl(countNoun(waiting.length, 'child', 'children'), DL_STATUS.none.ink) + (waiting.length === 1 ? ' hasn' + '’' + 't' : ' haven' + '’' + 't') + ' been started yet.',
      body: dlKidsShown(scope) ? 'Hover a hollow dot to see who, so teachers can pick them up next.' : 'Look closer at a grade to see who, so teachers can pick them up next.',
      hl: dlKidKeys(waiting) });
    if (secs.length > 1) {
      var rows = AD.collectionStatus().rows.filter(function (r) { return secs.some(function (s) { return s.id === r.id; }); });
      var lead = rows.reduce(function (b, r) { return !b || r.pct > b.pct ? r : b; }, null), back = rows.reduce(function (b, r) { return !b || r.pct < b.pct ? r : b; }, null);
      if (lead && !rows.some(function (r) { return r.flag; })) out.push({ kind: 'progress', eyebrow: 'Moving together',
        head: 'Every section is within ' + dlHl((lead.pct - back.pct) + ' points', ink) + ' of the one furthest along.',
        body: esc(sLbl(lead)) + ' leads at ' + lead.pct + '%.', sep: true });
    }
    var drafts = studs.filter(function (s) { return AD.checkinStatus(s) === 'draft'; });
    if (drafts.length) out.push({ kind: 'progress', eyebrow: 'Almost there',
      head: dlHl(countNoun(drafts.length, 'child is', 'children are'), DL_STATUS.draft.ink) + ' part-way through.',
      body: 'Started but not finished — the quickest wins before the window closes.', hl: dlKidKeys(drafts) });
    return out;
  }

  // Priority 3 — results statistics for the scope in view (pool; rotates daily).
  function dlResultsPool(scope, studs, secs) {
    var pt = AD.latestComplete, d = dlDist(studs, pt.key), first = AD.completedPoints[0], out = [];
    var blm = AD.bandMeta('secure'), spr = AD.bandMeta('emerging'), n = studs.length;
    var line = AD.completedPoints.length < 2 ? 'Your starting point. Everything from here is growth you' + '’' + 'll be able to see.' : (function () {
      var delta = d.pct.secure - dlDist(studs, first.key).pct.secure;
      return delta > 0 ? 'Up ' + delta + ' points since ' + first.label + '.' : delta < 0 ? 'Down ' + Math.abs(delta) + ' points since ' + first.label + '. Dips happen mid-year.' : 'Holding steady since ' + first.label + '.';
    })();
    out.push({ kind: 'result', eyebrow: pt.label + ' results',
      head: dlHl(d.pct.secure + '%', blm.ink) + ' of skill ratings are ' + dlHl('Blooming', blm.ink) + '.', body: line + ' Each circle' + '’' + 's colour is the band most of its children are in.' });
    var bloomKids = studs.filter(function (s) { return dlKidBand(s, pt) === 'secure'; }), sproutKids = studs.filter(function (s) { return dlKidBand(s, pt) === 'emerging'; });
    out.push({ kind: 'result', tone: 'bloom', eyebrow: 'Children Blooming',
      head: dlHl(bloomKids.length + ' of ' + n + ' children', blm.ink) + ' are Blooming overall.',
      body: countNoun(sproutKids.length, 'child is', 'children are') + ' Sprouting overall and could use a little extra.', hl: dlKidKeys(bloomKids) });
    var missed = dlMissed(studs, pt);
    out.push({ kind: 'result', eyebrow: 'Who was assessed',
      head: missed.length ? dlHl(countNoun(missed.length, 'child was', 'children were'), DL_STATUS.none.ink) + ' missed in ' + esc(pt.label) + '.' : 'Every child was assessed in ' + dlHl(pt.label, blm.ink) + '.',
      body: missed.length ? 'Their results are missing from these numbers; the next window is a chance to include them.' : 'These numbers cover all ' + countNoun(n, 'child', 'children') + '.', hl: missed.length ? dlKidKeys(missed) : null });
    var gsAll = AD.growthStrength(studs, pt.key, 1), st = gsAll.strength[0], gr = gsAll.growth[0];
    var STRONG_PCT = 40;   // below this, the top skill is "furthest along", not something to celebrate
    if (st) out.push({ kind: 'result', tone: 'bloom', eyebrow: st.secure >= STRONG_PCT ? 'Strongest skill' : 'Furthest along',
      head: st.secure >= STRONG_PCT ? dlHl(st.name, blm.ink) + ' is the strongest skill: ' + st.secure + '% Blooming.' : dlHl(st.name, blm.ink) + ' is furthest along, at ' + st.secure + '% Blooming.',
      body: st.secure >= STRONG_PCT ? 'Worth celebrating with teachers and families.' : 'Every skill is early on; this is the best one to build from.',
      hl: dlKidKeys(dlInBand(studs, st.key, pt.scoreField, 'secure')) });
    if (gr) out.push({ kind: 'result', tone: 'sprout', eyebrow: 'Where to help next',
      head: dlHl(gr.name, spr.ink) + ' has the most children Sprouting: ' + gr.emerging + '%.', body: esc(AD.helpStep(gr.key)),
      hl: dlKidKeys(dlInBand(studs, gr.key, pt.scoreField, 'emerging')) });
    if (secs.length > 1) {
      var ranked = secs.map(function (x) { return { sd: x, pct: dlDist(AD.studentsInSection(x), pt.key).pct.secure }; }).sort(function (a, b) { return b.pct - a.pct; });
      var top = ranked[0], low = ranked[ranked.length - 1];
      out.push({ kind: 'result', tone: 'bloom', eyebrow: 'Furthest along',
        head: dlHl(sLbl(top.sd), blm.ink) + ' has the most Blooming, at ' + top.pct + '%.',
        body: esc(sLbl(low.sd)) + ' is at ' + low.pct + '%. Groups grow at different speeds; both are worth a look.',
        hl: dlSecKeys(top.sd).concat(dlSecKeys(low.sd)), sep: true });
    }
    if (AD.completedPoints.length >= 2) {
      var m = AD.overallBandMovement(studs), idx = { emerging: 0, developing: 1, secure: 2 };
      var up = studs.filter(function (x) { return idx[AD.bandOf(AD.meanScore(x, pt.scoreField))] > idx[AD.bandOf(AD.meanScore(x, first.scoreField))]; });
      out.push({ kind: 'result', tone: 'bloom', eyebrow: 'Since ' + first.label,
        head: dlHl(m.up + ' of ' + m.n + ' children', blm.ink) + ' moved up a band.',
        body: m.down ? countNoun(m.down, 'child', 'children') + ' moved down. Dips happen; a second look helps.' : 'No child moved down a band.', hl: dlKidKeys(up) });
    }
    return out;
  }

  // Priority 4 — one activity: the weakest grade/section + skill in view, and its teacher.
  function dlActivity(scope) {
    var pt = AD.latestComplete, best = null;
    var pct = function (studs, key) { return AD.distribution(studs, key, pt.key).pct.secure; };
    var groups = scope.level === 'school' ? AD.grades.map(function (g) { return { label: gLbl(g), grade: g, studs: AD.studentsInGrade(g) }; })
      : scope.level === 'grade' ? [{ label: gLbl(scope.grade), grade: scope.grade, studs: AD.studentsInGrade(scope.grade) }]
      : (function () { var sd = AD.sections.find(function (x) { return x.id === scope.sectionId; }); return [{ label: sLbl(sd), grade: sd.grade, sd: sd, studs: AD.studentsInSection(sd) }]; })();
    groups.forEach(function (g) { AD.skills.forEach(function (sk) { var v = pct(g.studs, sk.key); if (!best || v < best.v) best = { g: g, sk: sk, v: v }; }); });
    if (!best) return null;
    // The class to talk to: the section itself, or the section in that grade with the least Blooming in this skill.
    var sd = best.g.sd || AD.sections.filter(function (x) { return x.grade === best.g.grade; })
      .map(function (x) { return { sd: x, v: pct(AD.studentsInSection(x), best.sk.key) }; }).sort(function (a, b) { return a.v - b.v; })[0].sd;
    var teacher = AD.teacherFor(sd), act = AD.activityFor(best.sk.key), spr = AD.bandMeta('emerging');
    return { kind: 'activity', tone: 'sprout', eyebrow: 'Try this next',
      head: 'From ' + esc(pt.label) + ', ' + dlHl(best.g.label, spr.ink) + ' needs the most help with ' + dlHl(best.sk.name, spr.ink) + ' (' + best.v + '% Blooming).',
      body: '<b>Activity:</b> ' + esc(act.activity) + '<br><b>Talk it through with ' + esc(teacher) + '</b> (' + esc(sLbl(sd)) + '): ' + esc(act.talk) +
        (act.sample ? ' <span class="ui-tag dl-sample" title="Placeholder copy until the real activity library is connected">Sample</span>' : ''),
      hl: dlKidKeys(dlInBand(best.g.studs, best.sk.key, pt.scoreField, 'emerging')) };
  }

  // ---- The points (rule: spec §13) ----
  // All warnings share ONE card (the most urgent, "+ N more" expands the rest in
  // place); the other slots go to progress / results / the activity. Warnings are
  // school-wide; the rest follow the zoom.
  var dlWarnOpen = false;   // is the stacked warning card expanded?
  function dlStory(scope) {
    var root = dlTree(scope), studs = dlStudents(root), n = studs.length;
    var secs = AD.sections.filter(function (s) { return scope.level === 'school' || (scope.level === 'grade' ? s.grade === scope.grade : s.id === scope.sectionId); });
    var phase = dlPhase(), warns = dlWarnings(), steps = [], src;
    if (warns.length) steps.push(Object.assign({}, warns[0], { stack: warns }));   // one card for every warning
    var room = DL_MAX_POINTS - steps.length;
    if (phase === 'collecting') {
      steps = steps.concat(dlProgressPool(scope, studs, secs).slice(0, room));
      src = AD.openPoint.label + ' check-in · n = ' + n;
    } else if (phase === 'results') {
      var pool = dlResultsPool(scope, studs, secs), day = dlDaysSinceClose();
      for (var i = 0; i < Math.min(room, pool.length); i++) steps.push(pool[(day + i) % pool.length]);   // a different set each day
      src = AD.latestComplete.label + ' results · n = ' + n;
    } else if (phase === 'activity') {
      var a = dlActivity(scope);
      if (a) steps.push(a);   // the activity is only ever one point
      src = AD.latestComplete.label + ' results · n = ' + n;
    } else src = 'n = ' + n;
    steps.source = src;
    return steps;
  }

  var DL_WARN_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
  // All points as one list of cards. Hovering / focusing a card lights up its part
  // of the dandelion; clicking pins it (click again to unpin).
  var dlPinned = { key: '', i: -1 };
  function dlPointInner(x) {
    var label = x.tone ? '<span class="dl-tone">' + esc(x.eyebrow) + '</span>' : '<span>' + esc(x.eyebrow) + '</span>';   // good news = Blooming pill, needs help = Sprouting pill
    return '<p class="dl-pt-kind">' + (x.kind === 'warn' ? '<span class="dl-attn">' + DL_WARN_ICON + 'Needs attention</span>' : '') + label + '</p>' +
      '<p class="dl-pt-head">' + x.head + '</p><p class="dl-pt-body">' + x.body + '</p>';
  }
  function dlStoryHTML(steps) {
    return '<ul class="dl-points">' + steps.map(function (x, j) {
      var more = x.stack ? x.stack.length - 1 : 0;
      return '<li tabindex="0" class="' + (x.kind || '') + (x.tone ? ' tone-' + x.tone : '') + (more && dlWarnOpen ? ' open' : '') + '" data-dl-pt="' + j + '" aria-label="' + esc((x.kind === 'warn' ? 'Needs attention: ' : '') + x.eyebrow) + '">' +
        (more ? '<button type="button" class="dl-more" data-dl-more aria-expanded="' + dlWarnOpen + '">' + (dlWarnOpen ? 'Show less' : '+ ' + more + ' more') + '</button>' : '') +
        dlPointInner(x) +
        (more && dlWarnOpen ? x.stack.slice(1).map(function (w) { return '<div class="dl-stack-row">' + dlPointInner(w) + '</div>'; }).join('') : '') +
        '</li>';
    }).join('') + '</ul>';
  }
  // Light up a step's nodes (plus their ancestors) and dim the rest.
  function dlApplyStep(stage, step) {
    var g = dlSim.g; if (!g) return;
    var on = null;
    if (step.hl) {
      on = {};
      step.hl.forEach(function (k) { on[k] = true; });
      // Walk the full tree (not just drawn nodes): a hidden child's class hub still lights up.
      dlSubtree(g.root).forEach(function (n) { if (on[n.key]) for (var a = n.parent; a; a = a.parent) on[a.key] = true; });
    }
    stage.style.setProperty('--dl-dim', DL_CFG.dimOpacity);
    stage.style.setProperty('--dl-ctx', DL_CFG.contextOpacity);
    stage.querySelectorAll('[data-dl-i]:not(.ctx)').forEach(function (el) {
      var n = g.nodes[el.dataset.dlI];
      el.classList.toggle('dim', !!on && !on[n.key]);
    });
    dlRetarget(step.sep ? DL_CFG.storySpread : 1);
  }

  // ---- Ask Tilli, inside the Overview ----
  // "Ask Tilli" under the story swaps the story for a chat; closing brings the
  // story back. Each answer can move the dandelion (askAnswer's `dl`): zoom to
  // the grade / section the question names (whole school if none), and light
  // part of it. It never switches Check-in / Results, and answers replace the
  // URL instead of pushing, so Back doesn't step through them. The answer's
  // view only holds while the URL is the one it set — clicking a hub, a crumb
  // or the mode tabs drops it. The thread lives in memory for this page load.
  var dlAsk = { open: false, thread: [], thinking: false, view: null, viewHash: '', focus: false };
  function dlAskView() {
    var r = currentRoute();
    return dlAsk.open && dlAsk.view && buildHash(r.screen, r.params) === dlAsk.viewHash ? dlAsk.view : null;
  }
  // What the dandelion should be lighting right now: the answer's view (chat open) or the pinned story point.
  function dlCurrentStep(params) {
    if (dlAsk.open) return dlAskView() || {};
    return dlStory(dlScope(params))[dlPinned.i] || {};
  }
  function dlAskSugs() {
    var g = AD.grades[Math.min(1, AD.grades.length - 1)];
    return ['Is the programme working?', 'Where are we weakest?', 'How is ' + gLbl(g) + ' doing?',
      AD.openPoint ? 'Who still needs to finish?' : 'Draft a board paragraph'];
  }
  function dlAskThreadHTML() {
    var greet = '<div class="ask-msg tilli">Ask me about the whole school, or name a grade or section and I' + '’' + 'll zoom the dandelion there.</div>';
    var msgs = dlAsk.thread.map(function (m) {
      if (m.role === 'me') return '<div class="ask-msg user">' + esc(m.text) + '</div>';
      return '<div class="ask-msg tilli">' + m.html + (m.note ? '<div class="dla-note">' + esc(m.note) + '</div>' : '') + '</div>';
    }).join('');
    var sugs = !dlAsk.thread.length || dlAsk.thread[dlAsk.thread.length - 1].sugs
      ? '<div class="ask-sugs">' + dlAskSugs().map(function (x) { return '<button class="ui-filterchip" data-dla-sug="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>' : '';
    return greet + msgs + (dlAsk.thinking ? '<div class="ask-msg tilli ask-typing"><span></span><span></span><span></span></div>' : '') + sugs;
  }
  function dlAskHTML() {
    return '<div class="dla" id="dla">' +
      '<div class="dla-head"><span class="ui-icontile">' + ICONS.asktilli + '</span>' +
        '<div class="dla-hmeta"><b>Ask Tilli<span class="ui-tag cyan">Beta</span></b><span>Answers from your school' + '’' + 's data</span></div>' +
        '<button class="btn-icon bare" data-dla-close aria-label="Close Ask Tilli and show the story again" title="Close">×</button></div>' +
      '<div class="dla-thread" id="dla-thread" aria-live="polite">' + dlAskThreadHTML() + '</div>' +
      '<form class="ask-compose dla-compose" data-dla-form><input class="ask-input" id="dla-input" placeholder="Ask about your school, a grade or a section…" autocomplete="off" aria-label="Ask Tilli">' +
        '<button class="ask-sendbtn" type="submit" aria-label="Send">' + ICONS.send + '</button></form></div>';
  }
  function dlAskWireThread(card) {
    var th = card.querySelector('#dla-thread'); if (!th) return;
    th.scrollTop = th.scrollHeight;
    // onX handlers (not addEventListener): safe to re-wire without doubling up
    th.querySelectorAll('[data-dla-sug]').forEach(function (b) { b.onclick = function () { dlAskSend(b.dataset.dlaSug); }; });
    th.querySelectorAll('[data-askgo]').forEach(function (b) {
      b.onclick = function () { go(b.dataset.askgo, b.dataset.askparams ? JSON.parse(b.dataset.askparams) : {}); };
    });
  }
  function dlAskRefresh() {
    var card = document.getElementById('ov-dl'), th = card && card.querySelector('#dla-thread'); if (!th) return;
    th.innerHTML = dlAskThreadHTML(); dlAskWireThread(card);
  }
  function wireDlAsk(card, stage) {
    dlAskWireThread(card);
    card.querySelector('[data-dla-close]').onclick = dlAskClose;
    var form = card.querySelector('[data-dla-form]'), inp = card.querySelector('#dla-input');
    form.onsubmit = function (e) { e.preventDefault(); var v = inp.value; inp.value = ''; dlAskSend(v); };
    if (dlAsk.focus) { dlAsk.focus = false; inp.focus({ preventScroll: true }); }
    dlApplyStep(stage, dlAskView() || {});
  }
  function dlAskOpen() { dlAsk.open = true; dlAsk.focus = true; dlPinned.i = -1; render(); }
  function dlAskClose() { dlAsk.open = false; dlAsk.view = null; dlAsk.thinking = false; render(); }   // keeps the zoom, drops the answer's highlight
  function dlAskSend(text) {
    text = String(text || '').trim(); if (!text || dlAsk.thinking) return;
    dlAsk.thread.push({ role: 'me', text: text });
    dlAsk.thinking = true; dlAskRefresh();
    setTimeout(function () {
      var scopeKey = askScopeFromText(text), a = askAnswer(text, scopeKey);
      dlAsk.thinking = false;
      dlAsk.thread.push({ role: 'tilli', html: a.html, sugs: !!a.sugs, note: a.dl && a.dl.note });
      if (!dlAsk.open || currentRoute().screen !== 'overview') return;
      if (!a.dl) { dlAskRefresh(); return; }   // not understood — leave the view as it is
      var sd = AD.sections.find(function (x) { return x.id === scopeKey; });
      var next = a.dl.reset || scopeKey === 'school' ? {} : sd ? { grade: sd.grade, section: sd.id } : { grade: scopeKey };
      var cur = currentRoute().params; if (cur.view) next.view = cur.view;   // never switch Check-in / Results
      dlAsk.view = a.dl.reset ? null : a.dl; dlAsk.viewHash = buildHash('overview', next); dlAsk.focus = true;
      go('overview', next, { replace: true });   // replace: Back doesn't undo answers
    }, 600);
  }

  // Legend + what the ring colour means — under the points, so it's always in view.
  function dlKeyHTML(mode) {
    var note = DL_CFG.ringRule === 'mix' ? 'A circle' + '’' + 's colour is the ' + (mode === 'checkin' ? 'status' : 'band') + ' with the largest share in that group. Hover it for the full count.'
      : 'A circle' + '’' + 's colour is the ' + (mode === 'checkin' ? 'status' : 'band') + ' most children in that group are in. Hover it for the full count.';
    return '<div class="dl-key">' + dlLegendHTML(mode) + '<p class="dl-keynote">' + note + '</p></div>';
  }
  function dlLegendHTML(mode) {
    if (mode === 'checkin') return '<div class="ui-legend">' + ['done', 'draft', 'none'].map(function (k) {
      return '<span><i class="' + (k === 'none' ? 'ring' : '') + '" style="background:' + (k === 'none' ? 'var(--white)' : DL_STATUS[k].color) + '"></i>' + DL_STATUS[k].label + '</span>';
    }).join('') + '</div>';
    return bandLegend();
  }
  // Are child dots drawn at this level? Only when the focused branch has ≤ kidDotMax children.
  function dlKidsShown(scope) { return dlStudents(dlTree(scope)).length <= DL_CFG.kidDotMax; }

  // Headcounts for a school or grade hub — shown in its hover tooltip (they used to sit
  // under the dandelion). Staff = class teachers who own a section under the hub.
  function dlHubCounts(n) {
    if (n.type !== 'school' && n.type !== 'grade') return '';
    var secs = AD.sections.filter(function (s) { return n.type === 'school' || s.grade === n.id; });
    var t = secs.reduce(function (a, s) { if (a.indexOf(s.teacherId) < 0) a.push(s.teacherId); return a; }, []).length;
    return countNoun(t, 'teacher', 'teachers') + ' · ' + countNoun(secs.length, 'section', 'sections');
  }

  // Headcounts for the selected level (left column, under "Currently selected").
  function dlCountsHTML(scope) {
    var secs = AD.sections.filter(function (s) { return scope.level === 'school' || (scope.level === 'grade' ? s.grade === scope.grade : s.id === scope.sectionId); });
    var n = secs.reduce(function (a, s) { return a + AD.studentsInSection(s).length; }, 0);
    var t = secs.reduce(function (a, s) { if (a.indexOf(s.teacherId) < 0) a.push(s.teacherId); return a; }, []).length;
    var item = function (v, one, many) { return '<span><b>' + v + '</b> ' + (v === 1 ? one : many) + '</span>'; };
    return '<div class="dl-counts">' + item(n, 'Student', 'Students') + item(t, 'Teacher', 'Teachers') + item(secs.length, 'Section', 'Sections') + '</div>';
  }
  // Rotating suggestions inside the empty ask box (questions Tilli can answer from this
  // school's data). Shows "Or just ask Tilli" first, then a new suggestion every
  // DL_SUG_MS with a soft fade; hidden while the box is focused with text in it.
  var DL_SUG_MS = 3500, dlSugTimer = 0;
  function dlSugList() {
    var g = AD.grades, sd = AD.sections[Math.min(6, AD.sections.length - 1)];
    var list = ['How is ' + gLbl(g[1] || g[0]) + ' doing?', 'Is the programme working?', 'Where are we weakest?', 'What is our strongest skill?'];
    if (AD.openPoint) list.splice(2, 0, 'Who still needs to finish?');
    if (g[3]) list.push('How is ' + gLbl(g[3]) + ' doing?');
    if (sd) list.push('How is ' + sLbl(sd) + ' doing?');
    list.push('Which skill needs the most help?', 'Draft a board paragraph');
    return list;
  }
  function dlRotateSugs(form) {
    clearInterval(dlSugTimer);
    var el = form.querySelector('.dl-ask-sug'), inp = form.querySelector('input'), list = dlSugList(), i = -1;
    var sync = function () { form.classList.toggle('typing', !!inp.value); };
    inp.addEventListener('input', sync);
    var next = function () {
      if (!form.isConnected) { clearInterval(dlSugTimer); return; }
      if (inp.value) return;   // don't change it under someone who's typing
      i = (i + 1) % list.length;
      el.classList.add('out');
      setTimeout(function () { el.textContent = 'Try “' + list[i] + '”'; form.dataset.sug = list[i]; el.classList.remove('out'); }, DL_REDUCE.matches ? 0 : 250);
    };
    dlSugTimer = setInterval(next, DL_SUG_MS);
  }
  // One quiet line above the ask box: how to move around at this level.
  function dlHint(scope) {
    return scope.level === 'school' ? 'Tap a grade to see its children · drag to move'
      : scope.level === 'grade' ? 'Tap a section to look closer · tap empty space to step back'
      : 'Tap a child to see who it is · tap empty space to step back';
  }

  function dandelionHTML(params) {
    var modes = dlModes();
    if (!modes.length) return '<div class="ov-dl"><div class="dl-story"><h2 class="dl-headline">Nothing to show yet</h2><p class="dl-body">Your school appears here once the first check-in opens.</p></div></div>';
    var scope = dlScope(params), mode = dlMode(params), root = dlTree(scope);
    var crumbs = '<div class="ui-crumbs dl-crumbs">' + (scope.level === 'school' ? '<span class="cur">School</span>' : '<button data-dl-crumb="school">School</button>');
    if (scope.level !== 'school') crumbs += '<span class="sep">›</span>' + (scope.level === 'section' ? '<button data-dl-crumb="grade">' + esc(gLbl(scope.grade)) + '</button>' : '<span class="cur">' + esc(gLbl(scope.grade)) + '</span>');
    if (scope.level === 'section') crumbs += '<span class="sep">›</span><span class="cur">' + esc(root.name) + '</span>';
    crumbs += '</div>';
    var seg = modes.length > 1 ? '<div class="ui-seg dl-seg" role="tablist" aria-label="What the dandelion shows">' + modes.map(function (m) {
      return '<button role="tab" aria-selected="' + (m === mode) + '" class="' + (m === mode ? 'on' : '') + '" data-dl-mode="' + m + '">' + (m === 'checkin' ? 'Check-in' : 'Results') + '</button>';
    }).join('') + '</div>' : '';
    var steps = dlStory(scope), key = JSON.stringify([dlParamsForScope(scope), mode]);
    if (dlPinned.key !== key) dlPinned = { key: key, i: -1 };
    var outLink = '<button class="btn-link dl-out" data-tooutcomes="1">See outcomes →</button>';
    // Left: what's selected (follows the zoom), its headcounts + source, then the cards.
    var sd = scope.level === 'section' ? AD.sections.find(function (x) { return x.id === scope.sectionId; }) : null;
    var selName = scope.level === 'school' ? root.name : scope.level === 'grade' ? gLbl(scope.grade) : root.name;
    var selSub = scope.level === 'school' ? [AD.school.city, AD.school.country].filter(Boolean).join(', ')
      : scope.level === 'grade' ? AD.school.name : (sd ? 'Teacher: ' + AD.teacherFor(sd) : '');
    var selected = '<div class="dl-sel"><p class="dl-sel-eyebrow">Currently selected</p><h2 class="dl-sel-name">' + esc(selName) + '</h2>' +
      (selSub ? '<p class="dl-sel-sub">' + esc(selSub) + '</p>' : '') + '</div>' + dlCountsHTML(scope) +
      '<p class="dl-source">' + esc(steps.source || '') + '</p>';
    // Right: hint + "Or just ask Tilli" box above the dandelion, legend under it.
    var ask = '<form class="dl-ask" data-dl-askform role="search"><span class="dl-ask-ic" aria-hidden="true">' + ICONS.search + '</span>' +
      '<input class="dl-ask-input" id="dl-ask-input" autocomplete="off" aria-label="Ask Tilli about your school — press Enter to ask the suggested question">' +
      '<span class="dl-ask-sug" aria-hidden="true">Or just ask Tilli</span></form>';
    var head = (scope.level !== 'school' || seg) ? '<div class="dl-head">' + (scope.level !== 'school' ? crumbs : '') + seg + '</div>' : '';
    return '<div class="ov-dl' + (dlAsk.open ? ' asking' : '') + '" id="ov-dl">' +
      '<div class="dl-story' + (dlAsk.open ? ' asking' : '') + '" id="dl-story">' + (dlAsk.open ? dlAskHTML() :
        selected + dlStoryHTML(steps) + '<div class="dl-actions">' + outLink + '</div>') + '</div>' +
      '<div class="dl-viz">' + head + '<p class="dl-hint">' + esc(dlHint(scope)) + '</p>' + ask +
        '<div id="dl-viz">' + dandelionSVG(scope, mode) + '</div>' + dlKeyHTML(mode) + '</div>' +
    '</div>';
  }

  function wireDandelion(body, params) {
    var card = body.querySelector('#ov-dl'); if (!card) return;
    var scope = dlScope(params), mode = dlMode(params);
    card.querySelectorAll('[data-dl-crumb]').forEach(function (b) {
      b.addEventListener('click', function () { go('overview', Object.assign(b.dataset.dlCrumb === 'school' ? {} : { grade: scope.grade }, params.view ? { view: mode } : {})); });
    });
    card.querySelectorAll('[data-dl-mode]').forEach(function (b) {
      b.addEventListener('click', function () { go('overview', Object.assign({}, dlParamsForScope(scope), { view: b.dataset.dlMode }), { replace: true }); });
    });
    card.querySelectorAll('[data-dla-open]').forEach(function (b) { b.addEventListener('click', dlAskOpen); });
    // "Or just ask Tilli": the question opens the chat in the left column (the cards step
    // aside) and the dandelion zooms to whatever the answer is about.
    var askForm = card.querySelector('[data-dl-askform]');
    if (askForm) dlRotateSugs(askForm);
    if (askForm) askForm.addEventListener('submit', function (e) {
      e.preventDefault(); var q = askForm.querySelector('input').value.trim() || askForm.dataset.sug || ''; if (!q) return;   // empty box → ask the suggestion showing
      dlAsk.open = true; dlAsk.focus = true; dlPinned.i = -1; render(); dlAskSend(q);
    });
    card.querySelectorAll('[data-tooutcomes]').forEach(function (b) {
      b.addEventListener('click', function () { go('outcomes', Object.assign(AD.latestComplete ? { point: AD.latestComplete.key } : {}, dlParamsForScope(scope))); });
    });
    wireStory(card, scope, mode);
    wireGraph(card, params);
  }
  function wireStory(card, scope, mode) {
    var story = card.querySelector('#dl-story'), stage = card.querySelector('.dl-stage');
    if (dlAsk.open) { wireDlAsk(card, stage); return; }   // chat stands in for the story
    var steps = dlStory(scope);
    var pts = story.querySelectorAll('[data-dl-pt]'), NONE = {};
    // Links inside a point act on their own (they don't pin the point).
    story.querySelectorAll('[data-goinvites]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); go('roster', { tab: 'team' }); }; });
    story.querySelectorAll('[data-goroster]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); go('roster', { tab: 'team' }); }; });
    story.querySelectorAll('[data-dlconcerns]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); openConcernQueue('New'); }; });
    // "+ N more" on the warning card expands / collapses the other warnings in place.
    story.querySelectorAll('[data-dl-more]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); dlWarnOpen = !dlWarnOpen; render(); }; });
    function light(i) {
      pts.forEach(function (li) { li.classList.toggle('on', +li.dataset.dlPt === i); li.classList.toggle('pinned', +li.dataset.dlPt === dlPinned.i); });
      dlApplyStep(stage, i >= 0 ? steps[i] : NONE);
    }
    function rest() { light(dlPinned.i); }
    // onX handlers (not addEventListener) so re-wiring never doubles them
    pts.forEach(function (li) {
      var i = +li.dataset.dlPt;
      li.onmouseenter = li.onfocus = function () { light(i); };
      li.onmouseleave = li.onblur = rest;
      li.onclick = function () { dlPinned.i = dlPinned.i === i ? -1 : i; rest(); };
      li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.onclick(); } };
    });
    rest();
  }
  function wireGraph(card, params) {
    var scope = dlScope(params), mode = dlMode(params), stage = card.querySelector('.dl-stage');
    var svg = stage.querySelector('svg'), tipEl = stage.querySelector('.dl-tip'), drag = null;
    dlStart(stage);
    function toSvg(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
    function showTip(el) {
      if (!el.dataset.dlTip) return;
      var n = dlSim.g.nodes[el.dataset.dlI], box = stage.getBoundingClientRect(), p = svg.createSVGPoint();
      p.x = n.x; p.y = n.y; p = p.matrixTransform(svg.getScreenCTM());
      tipEl.innerHTML = el.dataset.dlTip; tipEl.hidden = false;
      var py = p.y - box.top;
      tipEl.style.left = (p.x - box.left) + 'px'; tipEl.style.top = py + 'px';
      tipEl.classList.toggle('below', py < 90);
    }
    function hideTip() { if (!pinned) tipEl.hidden = true; }
    // Click a child dot → a card that stays open: who it is + "Open profile" (the student pop-up).
    var pinned = null;
    function unpin() { pinned = null; tipEl.classList.remove('pinned'); tipEl.hidden = true; }
    function pinKid(el) {
      if (pinned === el) { unpin(); return; }
      var n = dlSim.g.nodes[el.dataset.dlI], st = n.student; if (!st || !dlKidNames(mode)) return;
      pinned = null; showTip(el);
      tipEl.innerHTML += '<span>' + esc(st.adm) + ' · ' + esc(sLbl(st.grade, st.section)) + '</span>' +
        '<button type="button" class="dl-tip-open" data-open-stu="' + esc(st.adm) + '">Open profile →</button>';
      tipEl.classList.add('pinned'); pinned = el;
      tipEl.querySelector('[data-open-stu]').onclick = function (e) { e.stopPropagation(); var adm = this.dataset.openStu; unpin(); openStudentHistory(adm); };
    }
    function navigate(el) {
      var nav = el.dataset.dlNav, n = dlSim.g.nodes[el.dataset.dlI];
      var next = nav === 'up' ? dlUpParams(scope) : dlParamsFor(n);
      if (params.view) next.view = mode;
      hideTip(); go('overview', next);
    }
    stage.querySelectorAll('.dl-hub:not(.ctx), .dl-kid:not(.ctx)').forEach(function (el) {
      el.addEventListener('pointerenter', function () { if (!drag && !pinned) showTip(el); });
      el.addEventListener('pointerleave', hideTip);
      el.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var n = dlSim.g.nodes[el.dataset.dlI], p = toSvg(e);
        drag = { el: el, n: n, ox: n.x - p.x, oy: n.y - p.y, moved: false, sx: e.clientX, sy: e.clientY };
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', function (e) {
        if (!drag || drag.el !== el) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
        drag.moved = true; unpin(); hideTip(); stage.classList.add('dragging');
        var p = toSvg(e); drag.n.fixed = true; drag.n.x = p.x + drag.ox; drag.n.y = p.y + drag.oy; dlWake();
      });
      function end() {
        if (!drag || drag.el !== el) return;
        var d = drag; drag = null; d.n.fixed = false; stage.classList.remove('dragging'); dlWake();
        if (!d.moved && el.dataset.dlNav) { unpin(); navigate(el); }
        else if (!d.moved && el.classList.contains('dl-kid')) pinKid(el);
      }
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      if (el.dataset.dlNav) {
        el.addEventListener('focus', function () { showTip(el); }); el.addEventListener('blur', hideTip);
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(el); } });
      }
    });
    // Empty-space click: first closes an open child card; otherwise, when zoomed in,
    // steps back one level (the faded rest of the school counts as empty space).
    if (scope.level !== 'school') stage.classList.add('can-up');
    stage.addEventListener('click', function (e) {
      if (e.button !== 0 || e.target.closest('.dl-tip, .dl-hub:not(.ctx), .dl-kid:not(.ctx)')) return;
      if (pinned) { unpin(); return; }
      if (scope.level === 'school') return;
      var next = dlUpParams(scope); if (params.view) next.view = mode;
      hideTip(); go('overview', next);
    });
  }

  // Overview = the living dandelion + its guided story, free-flowing on the page (no cards).
  SCREEN.overview = function (params, body) {
    body.innerHTML = codeChangedHTML() + yearNoticeHTML() + completionRuleNoteHTML() + dandelionHTML(params);   // invite / setup warnings live in the 3 points (dlWarnings)
    wireDandelion(body, params);
    body.querySelectorAll('[data-yearsee]').forEach(function (b) { b.addEventListener('click', showYearMigration); });
    var rd = body.querySelector('[data-ruledismiss]');
    if (rd) rd.addEventListener('click', function () { try { localStorage.setItem(RULE_KEY + '.' + currentSchoolId() + '.' + email, '1'); } catch (e) {} render(); });
    body.querySelectorAll('[data-relink]').forEach(function (b) { b.addEventListener('click', function () { try { navigator.clipboard.writeText(b.dataset.relink); } catch (e) {} toast('Link copied.'); }); });
    var yd = body.querySelector('[data-yeardismiss]');
    if (yd) yd.addEventListener('click', function () { TilliAPI.dismissYearNotice(currentSchoolId(), email); render(); });
  };

  var cmpTwo = { a: null, b: null };  // "Compare two sections" picker state (Outcomes) — any two sections, school-wide
  var progSkill = '';                 // "Progress over time" chart — '' = all skills, else a skill key
  var progPeriod = 'all';             // "Progress over time" chart — 'all' = time on x-axis, else a point key = skills on x-axis

  // ========================================================
  //  3) OUTCOMES  (spec §5.3) — periodic data only
  // ========================================================
  SCREEN.outcomes = function (params, body) {
    // No completed assessment point yet (No-data lifecycle state): every
    // outcome module needs at least one measured point, so show one calm
    // empty state instead of the full skill grid.
    if (!AD.completedPoints.length) {
      var b0 = AD.pointRange(AD.points[0]);
      body.innerHTML = screenHead('Outcomes', 'How your children are growing — always as groups, never individual results.') +
        card('Skill outcomes', null, firstResultsEmpty('outcomes'), 'span2');
      return;
    }
    // scope from filters (School → Grade → Section)
    var grade = params.grade || '';
    var section = params.section || '';
    var point = params.point && AD.completedPoints.some(function (p) { return p.key === params.point; }) ? params.point : AD.latestComplete.key;
    var level = section ? 'section' : grade ? 'grade' : 'school';
    var allGrades = level === 'school' && params.view === 'grades';   // School › All grades: one card per grade
    var scope = { level: level, grade: grade, sectionId: section };
    var students = AD.scopeStudents(scope);

    // breadcrumb (terminates at section — no student level exists)
    // Two tabs at the top: School (whole-school overview) · All grades (one card per grade).
    // Inside a grade / section the All grades tab stays selected and a short trail shows where you are.
    var onGrades = allGrades || level !== 'school';
    var tabs = '<div class="ui-tabs ad-rostertabs" role="tablist" aria-label="Outcomes">' +
      '<button class="ui-tab' + (onGrades ? '' : ' on') + '" role="tab" aria-selected="' + !onGrades + '" data-scope="school">School</button>' +
      '<button class="ui-tab' + (onGrades ? ' on' : '') + '" role="tab" aria-selected="' + onGrades + '" data-scope="grades">All grades</button></div>';
    var crumbs = tabs;
    if (grade) crumbs += '<div class="ui-crumbs"><button data-scope="grades">All grades</button><span class="sep">›</span>' + (section ? '<button data-scope="grade">' + esc(gLbl(grade)) + '</button>' : '<span class="cur">' + esc(gLbl(grade)) + '</span>');
    if (section) { var sd = AD.sections.find(function (s) { return s.id === section; }); crumbs += '<span class="sep">›</span><span class="cur">' + esc(sd ? sLbl(sd) : '') + '</span>'; }
    if (grade) crumbs += '</div>';

    // scope + point controls
    var gradeOpts = [{ v: '', t: 'Whole school' }].concat(AD.grades.map(function (g) { return { v: g, t: gLbl(g) }; }));
    var secOpts = [{ v: '', t: grade ? 'All sections' : 'Pick a grade first' }].concat(AD.sections.filter(function (s) { return !grade || s.grade === grade; }).map(function (s) { return { v: s.id, t: sLbl(s) }; }));
    var pointOpts = AD.completedPoints.map(function (p) { return { v: p.key, t: pointLabel(p) }; });
    var filters = '<div class="ad-filters">' +
      selectWrap('o-grade', gradeOpts, grade, 'Grade') +
      selectWrap('o-section', secOpts, section, 'Section') +
      '<span style="width:1px;height:26px;background:var(--line-200)"></span>' +
      selectWrap('o-point', pointOpts, point, 'Assessment point') + '</div>';

    // Module 4: progress over time — one stacked-area chart tracing the
    // band mix across completed points; selector switches pooled / single skill.
    var progBody = '<div id="o-prog"' + (level === 'school' ? ' class="no-legend"' : '') + '>' + progOverTimeHTML(students) + '</div>';

    // Grade/section navigator — the mockup's "See your school as grades"
    // → "Look deeper into [grade]" drill. Sits above the skill detail.
    var navCards = '';
    // No outer box: the title sits on the page and the grade cards follow directly.
    if (allGrades) navCards = '<div class="mb-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Your school, grade by grade</h3>' +
      '<p class="ui-mod-note">' + esc((AD.points.find(function (p) { return p.key === point; }) || AD.latestComplete).label) + ' results. Open a grade to see its sections. ' + nNote(students.length) + '</p></div></div>' + gradeNavHTML(point) + '</div>';
    else if (level === 'school') {
      // Whole school first: the same card a grade gets (headline + band bar + 2 skills to
      // help next / going well), with "View all grades" to open the grade-by-grade view.
      var sd0 = distAllSkills(students, point), sPt = AD.points.find(function (p) { return p.key === point; }) || AD.latestComplete;
      navCards = '<div class="mb-gap"><div class="ui-card tight ad-gradebreak ad-schoolsnap">' +
        '<div class="gb-head"><div>' +   // no title: the header names the school and the tab says "School"
          '<div class="ui-meta gb-meta">' + plural(students.length, 'student') + ' · ' + plural(AD.grades.length, 'grade') + ' · ' + plural(AD.sections.length, 'section') + '</div></div>' +
          '</div>' +
        '<div class="gb-snap"><div class="ui-kpi"><div class="num">' + sd0.pct.secure + '%</div>' +
          '<div class="lbl">' + esc(AD.bandMeta('secure').label) + ' at ' + esc(sPt ? sPt.label : '') + '</div></div>' +
          '<div class="gb-bar">' + bandBar(sd0) + '<div style="margin-top:10px">' + bandLegend() + '</div></div></div>' +
        gsPair(students, point, 'ad-grid two gb-gs') + '</div></div>';
    }
    else if (level === 'grade') {
      // Headline snapshot from the grade card (school view): % Blooming + band bar,
      // sitting above the section navigator so the drill opens on the same summary.
      var gStuds = AD.studentsInGrade(grade), gSecs = AD.sections.filter(function (s) { return s.grade === grade; });
      var gd = distAllSkills(gStuds, point), seMeta = AD.bandMeta('secure');
      var gPt = AD.points.find(function (p) { return p.key === point; }) || AD.latestComplete;
      var snap = '<div class="ad-gradesnap">' +
        '<div class="ui-kpi"><div class="num">' + gd.pct.secure + '%</div>' +
          '<div class="lbl">' + esc(seMeta.label) + ' at ' + esc(gPt ? gPt.label : '') + '</div></div>' +
        '<div class="gs-bar">' + bandBar(gd, true) + '<div style="margin-top:10px">' + bandLegend() + '</div></div></div>';
      var gNote = plural(gSecs.length, 'section') + ' · Open a section for its full skill view. ' + nNote(gStuds.length);
      navCards = '<div class="mb-gap">' + card(gLbl(grade), gNote, snap + sectionNavHTML(grade, point), 'span2') + '</div>';
    }

    // Focus areas / Strengths (grade + section scope). Section scope also
    // carries the n= / small-group note, since a section is usually < 10 children.
    var gsCard = '';
    if (level !== 'school') {
      gsCard = (level === 'section' ? '<div class="ad-scope-n mb-3">' + nNote(students.length) + '</div>' : '') +
        gsPair(students, point, 'ad-grid two mb-gap');
    }

    // Where teacher / parent / child views differ — section scope only.
    var viewsCard = (level === 'section') ? card('Where views differ', 'How teachers, parents and the children themselves see the same skills — a gap is a conversation worth having.', viewsDifferBlock(students, 3), '', '', TIP.perspective) : '';

    // Compare two sections — pick ANY two sections school-wide and read their
    // skill-band distributions side by side at the selected point. Independent
    // of the scope filters above (kept in module state, not the URL). Re-renders
    // in place on change so it never yanks the page back to the top.
    // Nothing is pre-selected — the user picks both classes. Only clear a
    // selection if it points at a section that no longer exists.
    var validIds = AD.sections.map(function (s) { return s.id; });
    if (cmpTwo.a && validIds.indexOf(cmpTwo.a) < 0) cmpTwo.a = null;
    if (cmpTwo.b && validIds.indexOf(cmpTwo.b) < 0) cmpTwo.b = null;
    function cmp2Options(sel, side) {
      return '<option value=""' + (sel ? '' : ' selected') + ' disabled>Select section ' + (side === 'a' ? 'A' : 'B') + '…</option>' +
        AD.sections.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === sel ? ' selected' : '') + '>' + esc(sLbl(s)) + '</option>'; }).join('');
    }
    // Single-word standing for one skill in one class: whichever band most of
    // the children sit in. Used for the little status chip on each skill row.
    function cmpSkillVerdict(d) {
      var p = d.pct;
      if (p.secure >= p.developing && p.secure >= p.emerging) return { label: 'Blooming', lvl: AD.bandMeta('secure').lvl };
      if (p.emerging >= p.developing && p.emerging >= p.secure) return { label: 'Sprouting', lvl: AD.bandMeta('emerging').lvl };
      return { label: 'Growing', lvl: AD.bandMeta('developing').lvl };
    }
    // One class column: picker on top, then (once picked) growth/strength,
    // a skill-band-bar list, and the multi-perspective radar — the full
    // section read, so two classes can be scanned side by side.
    function cmpColHTML(side) {
      var selId = cmpTwo[side], otherId = cmpTwo[side === 'a' ? 'b' : 'a'];
      var sec = AD.sections.find(function (s) { return s.id === selId; });
      var picker = '<label class="select-wrap cmp-select"><select class="select" id="o-class' + side + '" title="Section to show in this column">' + cmp2Options(selId, side) + '</select></label>';
      var inner;
      if (!sec) {
        return '<div class="cmp-col">' + picker + '</div>';   // empty until picked; one shared hint sits above both columns
      } else if (selId === otherId) {
        inner = stEmpty('Already shown.', 'This section is on the other side — pick a different one to compare.');
      } else {
        var studs = AD.studentsInSection(sec);
        var gsBlock = '<div class="ad-scope-n mb-3">' + nNote(studs.length) + '</div>' + gsPair(studs, point, 'cmp-gs');
        var skillList = '<div class="cmp-skills">' + AD.skills.map(function (sk) {
          var d = AD.distribution(studs, sk.key, point), v = cmpSkillVerdict(d);
          return '<div class="cmp-skillrow"><span class="cmp-sk-name">' + esc(sk.name) + '</span>' +
            '<div class="cmp-sk-bar">' + bandBar(d) + '</div>' +
            '<span class="ui-bandword lvl-' + v.lvl + ' cmp-sk-status">' + v.label + '</span></div>';
        }).join('') + '</div>';
        inner = gsBlock + '<div class="cmp-legend">' + bandLegend() + '</div>' + skillList +
          '<div class="cmp-views"><div class="ui-eyebrow dark mb-2">Where views differ</div>' + viewsDifferBlock(studs, 3) + '</div>';
      }
      return '<div class="cmp-col">' + picker + '<div class="ui-card cmp-body">' + inner + '</div></div>';
    }
    function cmp2HTML() {
      var hint = !cmpTwo.a || !cmpTwo.b ? '<p class="ui-mod-note">Pick two sections to see their strengths, focus areas and skill bands side by side.</p>' : '';
      return '<div class="cmp-head"><h2 class="ui-title xl">Compare two sections</h2>' + hint + '</div>' +
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
    var progCard = card('Progress over time', 'How the mix of Sprouting, Growing and Blooming shifts through the year.', progBody);
    // Progress over time only once there's a "time": from the moment the second
    // assessment point (Midline) opens. With Baseline alone there's nothing to trace.
    var showProg = AD.points.length > 1 && AD.points[1].status !== 'upcoming';
    var midRow = '';
    if (level === 'section') midRow = showProg ? '<div class="ad-grid two mt-gap">' + progCard + viewsCard + '</div>' : '<div class="mt-gap">' + viewsCard + '</div>';
    else if (level === 'school' && !allGrades && showProg) midRow = '<div class="mt-gap">' + progCard + '</div>';

    // Skill band distribution — whole school, at the chosen point (moved here from Overview).
    var distCard = level === 'school' && !allGrades ? '<div class="mt-gap">' +
      card('Skill by skill', 'Where children across the school are on each skill right now.', skillBandDistBody(students, point, 'school'), 'span2', '<div>' + cadence(point) + '</div>') + '</div>' : '';

    body.innerHTML = screenHead('Outcomes', 'How your children are growing — always as groups, never individual results.') +
      crumbs + navCards + gsCard +
      (level === 'school' ? distCard + midRow : midRow + distCard) +   // school: skill by skill, then progress over time
      (level === 'school' && !allGrades ? '<div id="o-cmp2" class="mt-gap">' + cmp2HTML() + '</div>' : '');

    // wiring
    body.querySelectorAll('[data-gradenav]').forEach(function (b) { b.addEventListener('click', function () { setParams({ grade: b.dataset.gradenav, section: '', point: point }); }); });
    body.querySelectorAll('[data-sectionnav]').forEach(function (b) { b.addEventListener('click', function () { setParams({ grade: grade, section: b.dataset.sectionnav, point: point }); }); });
    body.querySelectorAll('[data-scope]').forEach(function (b) { b.addEventListener('click', function () { var lv = b.dataset.scope; if (lv === 'school') setParams({ point: point }); else if (lv === 'grades') setParams({ view: 'grades', point: point }); else if (lv === 'grade') setParams({ grade: grade, point: point }); }); });
    body.querySelectorAll('[data-allgrades]').forEach(function (b) { b.addEventListener('click', function () { setParams({ view: 'grades', point: point }, false); }); });
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
  // Grade breakdown (school scope) — each grade in the Overview snapshot format:
  // % Blooming headline + band bar, then Focus areas / Strengths, plus a
  // drill-in link. Section cards (grade scope) stay as the compact navigator.
  function gradeNavHTML(point) {
    var ptObj = AD.points.find(function (p) { return p.key === point; }) || AD.latestComplete;
    var ptLabel = ptObj ? ptObj.label : '';
    var se = AD.bandMeta('secure');
    return '<div class="mb-3">' + bandLegend() + '</div>' +
      '<div class="ad-gradebreaks">' + AD.grades.map(function (g) {
        var studs = AD.studentsInGrade(g), secs = AD.sections.filter(function (s) { return s.grade === g; });
        var d = distAllSkills(studs, point);
        return '<div class="ui-card tight ad-gradebreak">' +
          '<div class="gb-head"><div><div class="ui-title">' + esc(gLbl(g)) + '</div>' +
            '<div class="ui-meta gb-meta">' + plural(studs.length, 'student') + ' · ' + plural(secs.length, 'section') + '</div></div>' +
            '<button class="btn-link" data-gradenav="' + esc(g) + '" aria-label="View ' + esc(gLbl(g)) + '">View →</button></div>' +
          '<div class="gb-snap"><div class="ui-kpi"><div class="num">' + d.pct.secure + '%</div>' +
            '<div class="lbl">' + esc(se.label) + '</div></div>' +
            '<div class="gb-bar">' + bandBar(d) + '</div></div>' +
          gsPair(studs, point, 'ad-grid two gb-gs') + '</div>';
      }).join('') + '</div>';
  }
  function sectionNavHTML(grade, point) {
    return '<div class="ad-navcards">' + AD.sections.filter(function (s) { return s.grade === grade; }).map(function (s) {
      var studs = AD.studentsInSection(s), d = distAllSkills(studs, point);
      return '<button class="ui-card tight link ad-navcard" data-sectionnav="' + esc(s.id) + '"><div class="nc-top"><span class="ui-title md">' + esc(sLbl(s)) + '</span><span class="text-muted">›</span></div>' +
        '<div class="ui-meta nc-meta">' + plural(studs.length, 'student') + (studs.length < SMALL_N ? ' · small group' : '') + '</div>' + bandBar(d) + pctLine(d) + '</button>';
    }).join('') + '</div>';
  }

  // ========================================================
  //  4) ROSTER  (spec §5.4) — coordinator only. Identity, never SEL.
  // ========================================================
  var teamView = { q: '', sort: '', dir: 1 };   // Your team tab: search text + sort column/direction (kept while you move around)
  SCREEN.roster = function (params, body) {
    // Grade-select-first: one clickable box per grade. Tapping a box opens the
    // grade's roster (students + teacher-per-section) in a popup. Fast global
    // "find one child" search now lives inside each grade popup.
    var gradeCards = !AD.grades.length ? stEmpty('No grades yet.', 'Students appear here once enrolment is imported.') :
      '<div class="ad-navcards">' + AD.grades.map(function (g) {
        var studs = AD.studentsInGrade(g);
        var secs = AD.sections.filter(function (s) { return s.grade === g; });
        var teacherLine = '<div class="nc-pcts">' + secs.map(function (s) {
          var rm = AD.pastYear ? null : apiRoom(s);
          return '<span>' + esc(secShort(s.grade, s.section)) + ' · ' + esc(AD.teacherFor(s)) + (rm ? ' · <span class="ad-room' + roomTone(rm) + '" title="Students added / expected">' + esc(roomText(rm)) + '</span>' : '') + '</span>';
        }).join('') + '</div>';
        // Each grade's own colour — the same one its hub has on the dandelion.
        return '<button class="ui-card tight link ad-navcard ad-gradecard" style="--grade-c:' + gradeColor(g) + '" data-graderoster="' + esc(g) + '">' +
          '<div class="nc-top"><span class="ui-title md">' + esc(gLbl(g)) + '</span><span class="text-muted">›</span></div>' +
          '<div class="ui-meta nc-meta">' + plural(studs.length, 'student') + '</div>' +   // sections are listed below, so no section count
          teacherLine + '</button>';
      }).join('') + '</div>';
    var listBody = gradeCards;

    // user management
    var users = seedUsers();
    var multiBoard = schoolBoards().length > 1;
    // No box, no heading: the tab names it. Cells that don't apply stay empty rather than "—".
    // Search (name or email) + click a column head to sort A→Z / Z→A. Only the rows
    // redraw, so the search box keeps focus. Row buttons carry the index into `users`.
    var sortHead = function (key, label) {
      var on = teamView.sort === key;
      return '<th class="ad-sortth"><button class="ad-sortbtn' + (on ? ' on' : '') + '" data-teamsort="' + key + '" title="Sort by ' + label.toLowerCase() + ' (A–Z, click again for Z–A)"' +
        ' aria-label="Sort by ' + label.toLowerCase() + '"' + (on ? ' aria-sort="' + (teamView.dir > 0 ? 'ascending' : 'descending') + '"' : '') + '>' +
        esc(label) + '<span class="ad-sortic" aria-hidden="true">' + (on ? (teamView.dir > 0 ? '▲' : '▼') : '↕') + '</span></button></th>';
    };
    // Status chip; hover or tap (it takes focus) shows when the invite went out and when it expires.
    var statusCellHTML = function (u) {
      var inf = inviteInfo(u), acct = (window.TilliAPI && TilliAPI.getAccount) ? TilliAPI.getAccount(u.email) : null, tip, chip;
      if (u.status === 'Active') {
        tip = acct && acct.activatedAt ? 'Joined ' + fmtInvDate(acct.activatedAt) + (acct.createdAt ? ' · invited ' + fmtInvDate(acct.createdAt) : '') : 'Has signed in — invite accepted.';
        chip = '<span class="ui-chip active"><span class="dot"></span>Active</span>';
      } else {
        tip = inf ? 'Invite sent ' + fmtInvDate(inf.sent) + ' · ' + (inf.expired ? 'expired ' : 'expires ') + fmtInvDate(inf.expires) + (inf.expired ? '' : ' (' + countNoun(inf.left, 'day', 'days') + ' left)') : 'Invite sent — date not recorded.';
        chip = inf && inf.expired ? '<span class="ui-chip danger"><span class="dot"></span>Expired</span>'
          : inf && inf.soon ? '<span class="ui-chip slowing"><span class="dot"></span>Expires in ' + countNoun(inf.left, 'day', 'days') + '</span>'
          : '<span class="ui-chip slowing"><span class="dot"></span>Invited</span>';
      }
      return '<span class="ui-tooltip ad-statustip end" data-tip="' + esc(tip) + '" tabindex="0" aria-label="' + esc(u.status + '. ' + tip) + '">' + chip + '</span>';
    };
    var userRowHTML = function (u, i) {
      var isTeacher = /teacher/i.test(u.role || '');
      var dash = '';
      var boardCell = multiBoard ? '<td>' + (u.board ? esc(u.board) : dash) + '</td>' : '';
      return '<tr><td class="name"><button class="btn-link text-strong" data-userdetail="' + i + '" style="font:inherit;text-align:left" title="View details">' + esc(u.name) + '</button></td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td>' +
        // Invited teachers add their own sections after accepting, so they show nothing here yet;
        // "No section yet" is only for a teacher who has joined and still has none.
        '<td>' + (isTeacher && u.grade ? esc(gradesLbl(u.grade)) : isTeacher && u.status === 'Active' ? '<span class="text-muted nowrap">No section yet</span>' : dash) + '</td>' +
        '<td>' + (isTeacher && u.section ? esc(userSecLbl(u)) : dash) + '</td>' + boardCell +
        '<td>' + statusCellHTML(u) + '</td>' +
        // Row actions live in a ⋮ menu (View details, Show password, Resend, Revoke).
        '<td class="text-right ad-useracts">' + (isSelf(u) ? '<span class="text-muted">You</span>' :
          '<button class="ad-kebab" data-rowmenu="' + i + '" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ' + esc(u.name) + '" title="Actions">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>') + '</td></tr>';
    };
    var colCount = 7 + (multiBoard ? 1 : 0);
    var userRowsHTML = function () {
      var q = teamView.q.trim().toLowerCase();
      var rows = users.map(function (u, i) { return { u: u, i: i }; }).filter(function (r) {
        return !q || String(r.u.name || '').toLowerCase().indexOf(q) >= 0 || String(r.u.email || '').toLowerCase().indexOf(q) >= 0;
      });
      if (teamView.sort) {
        var k = teamView.sort;
        rows.sort(function (a, b) {
          var x = String(a.u[k] || ''), y = String(b.u[k] || '');
          if (!x !== !y) return x ? -1 : 1;   // blanks always last, whichever direction
          return x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) * teamView.dir || a.i - b.i;
        });
      }
      return rows.length ? rows.map(function (r) { return userRowHTML(r.u, r.i); }).join('')
        : '<tr><td colspan="' + colCount + '" class="text-muted ad-teamnone">No one matches “' + esc(teamView.q.trim()) + '”.</td></tr>';
    };
    // The one school code: teachers join with it, and it's in every link the school shares.
    var scRec = window.TilliAPI && currentSchoolId() ? TilliAPI.resolveSchool(currentSchoolId()) : null;
    var codeStrip = scRec && scRec.code ? '<div class="ad-codestrip mb-3"><div><b>School code</b> <span class="ad-num">' + esc(scRec.code) + '</span>' +
        '<span class="text-muted">Teachers enter it to join as a teacher — it’s also in every link you share.</span></div>' +
        '<button class="btn btn-outline btn-sm" data-codecopy="' + esc(scRec.code) + '">Copy</button>' +
        '<button class="btn-link" data-coderegen title="Use this if the code was shared outside the school">Regenerate</button></div>' : '';
    var userBody = codeStrip + '<div class="row mb-3 ad-teamtop">' +
        '<input class="input ad-teamq" id="team-q" type="search" placeholder="Search by name or email…" value="' + esc(teamView.q) + '" aria-label="Search your team by name or email">' +
        '<button class="btn btn-cyan btn-sm" data-invite="1">+ Invite teachers</button></div>' +
      '<div class="ui-tablewrap"><table class="ui-table mw-640 ad-teamtable"><thead><tr>' + sortHead('name', 'Name') + sortHead('email', 'Email') + '<th>Role</th>' + sortHead('grade', 'Grade') + '<th>Section</th>' +
        (multiBoard ? sortHead('board', 'Board') : '') + '<th>Status</th><th></th></tr></thead><tbody id="team-rows">' + userRowsHTML() + '</tbody></table></div>';

    // Two tabs — Students / Your team. The tab lives in the URL (?tab=team) so a
    // refresh or a shared link lands on the same one; switching replaces history.
    var tab = params.tab === 'team' && !AD.pastYear ? 'team' : 'students';
    var tabBtn = function (key, label, n) {
      return '<button class="ui-tab' + (tab === key ? ' on' : '') + '" role="tab" aria-selected="' + (tab === key) + '" data-rostertab="' + key + '">' + esc(label) + ' <span class="ad-tabn">' + n + '</span></button>';
    };
    // The tab already names the list and its count, so no card title / count line repeats it.
    var waiting = AD.pastYear ? [] : waitingKids();
    var waitingBody = waiting.length ? '<div class="ui-card ad-waiting mb-gap"><div class="ui-mod-h"><div><h3 class="ui-mod-title">Waiting for your approval</h3>' +
        '<p class="ui-mod-note">A teacher added ' + plural(waiting.length, 'new student') + ' past the class size. They can already be assessed — approve to confirm, or turn down a duplicate.</p></div></div>' +
        '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Student</th><th>Section</th><th>Added by</th><th>Class size</th><th></th></tr></thead><tbody>' +
        waiting.map(function (st, i) {
          var rm = st.room;
          return '<tr><td class="name">' + esc(st.name) + ' <span class="ad-num text-muted">' + esc(st.student_id) + '</span></td><td>' + esc(gLbl(st.grade)) + ' · ' + esc(secShort(st.grade, st.section)) + '</td>' +
            '<td>' + esc(st.requestedByName) + '</td><td>' + (rm ? esc(roomText(rm)) : '—') + '</td>' +
            '<td class="text-right nowrap"><button class="btn btn-cyan btn-sm" data-kidok="' + i + '">Approve</button> <button class="btn-link" data-kidno="' + i + '">Turn down</button></td></tr>';
        }).join('') + '</tbody></table></div></div>' : '';
    var panel = tab === 'team'
      ? inviteAlertHTML(true) + userBody
      : waitingBody + listBody +
        // Year-end only — kept quiet so it isn't mistaken for an everyday action.
        (AD.pastYear ? '' : yearEndHTML());
    body.innerHTML = screenHead('Roster', SHOW_STUDENT_STAGE ? 'Names and sections — plus a temporary developmental-stage column (see the note in Students).' : 'Your children and teachers — names and sections only, never assessment results.') +
      '<div class="ui-tabs ad-rostertabs" role="tablist" aria-label="Roster">' + tabBtn('students', 'Students', AD.students.length) +
        (AD.pastYear ? '' : tabBtn('team', 'Your team', users.length).replace('</button>', (inviteAlerts().length ? '<i class="ad-tabalert" title="An invite is about to expire"></i>' : '') + '</button>')) + '</div>' +
      panel;
    // NOTE: Duplicate review queue (spec §5.4.5) sits behind the near-match config
    // flag, which is OFF for this school — so the module is intentionally absent.

    // wiring
    body.querySelectorAll('[data-rostertab]').forEach(function (b) {
      b.addEventListener('click', function () { setParams(b.dataset.rostertab === 'team' ? { tab: 'team' } : {}); });
    });
    body.querySelectorAll('[data-graderoster]').forEach(function (b) { b.addEventListener('click', function () { openGradeRoster(b.dataset.graderoster); }); });
    body.querySelectorAll('[data-kidok]').forEach(function (b) { b.addEventListener('click', function () { decideKid(waiting[+b.dataset.kidok], true); }); });
    body.querySelectorAll('[data-kidno]').forEach(function (b) { b.addEventListener('click', function () { decideKid(waiting[+b.dataset.kidno], false); }); });
    body.querySelectorAll('[data-yearask]').forEach(function (b) { b.addEventListener('click', askNewYear); });
    body.querySelectorAll('[data-codecopy]').forEach(function (b) { b.addEventListener('click', function () { try { navigator.clipboard.writeText(b.dataset.codecopy); } catch (e) {} toast('School code copied.'); }); });
    body.querySelectorAll('[data-coderegen]').forEach(function (b) { b.addEventListener('click', regenSchoolCode); });
    body.querySelectorAll('[data-yearsee]').forEach(function (b) { b.addEventListener('click', showYearMigration); });
    body.querySelectorAll('[data-invite]').forEach(function (b) { b.addEventListener('click', inviteUser); });
    function wireUserRows(root) {
      root.querySelectorAll('[data-rowmenu]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.stopPropagation(); openRowMenu(b, users[+b.dataset.rowmenu]); }); });
      root.querySelectorAll('[data-userdetail]').forEach(function (b) { b.addEventListener('click', function () { showUserDetail(users[+b.dataset.userdetail]); }); });
    }
    wireUserRows(body);
    body.querySelectorAll('[data-resend-email]').forEach(function (b) { b.addEventListener('click', function () { resendInvite(b.dataset.resendEmail.split(',')); }); });
    var teamRows = body.querySelector('#team-rows');
    function redrawUserRows() { teamRows.innerHTML = userRowsHTML(); wireUserRows(teamRows); }
    var teamQ = body.querySelector('#team-q');
    if (teamQ) teamQ.addEventListener('input', function () { teamView.q = teamQ.value; redrawUserRows(); });
    body.querySelectorAll('[data-teamsort]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.teamsort;
        teamView.dir = teamView.sort === k ? -teamView.dir : 1; teamView.sort = k;
        body.querySelectorAll('[data-teamsort]').forEach(function (x) {
          var on = x.dataset.teamsort === k;
          x.classList.toggle('on', on);
          if (on) x.setAttribute('aria-sort', teamView.dir > 0 ? 'ascending' : 'descending'); else x.removeAttribute('aria-sort');
          x.querySelector('.ad-sortic').textContent = on ? (teamView.dir > 0 ? '▲' : '▼') : '↕';
        });
        redrawUserRows();
      });
    });
  };

  // ========================================================
  //  4b) HISTORY — coordinator only. Every change to student
  //  records and assessments: who, when, what changed. No
  //  scores ever appear (the log never carries them).
  // ========================================================
  var HIST_PAGE = 60;   // rows shown per "Show more" step
  // range: '7' | '30' (past N days, counted back from now) | 'custom' (from/to, yyyy-mm-dd, whole days)
  var histState = { kind: '', q: '', shown: HIST_PAGE, range: '7', from: '', to: '' };
  var HIST_RANGES = [['7', 'Past 7 days'], ['30', 'Past 30 days'], ['custom', 'Custom range']];
  function histBounds() {
    if (histState.range !== 'custom') return { since: Date.now() - (+histState.range) * 864e5, until: null };
    var d = function (v, end) { if (!v) return null; var t = new Date(v + (end ? 'T23:59:59.999' : 'T00:00:00')).getTime(); return isNaN(t) ? null : t; };
    return { since: d(histState.from, false), until: d(histState.to, true) };
  }
  function histRangeLabel() {
    if (histState.range !== 'custom') return 'in the past ' + histState.range + ' days';
    return histState.from && histState.to ? 'between ' + histState.from + ' and ' + histState.to : histState.from ? 'since ' + histState.from : histState.to ? 'up to ' + histState.to : 'in this range';
  }
  // Everything that matches the current range + type + search, newest first.
  function histFiltered() {
    var b = histBounds(), f = { kind: histState.kind, q: histState.q };
    if (b.since) f.since = b.since;
    var list = schoolHistory(f);
    return b.until ? list.filter(function (e) { return e.at <= b.until; }) : list;
  }
  // CSV of exactly what the list shows (all of it, not just the loaded page).
  function exportHistoryCSV(list) {
    var HU = window.TilliHistory; if (!HU || !list.length) return;
    var two = function (n) { return (n < 10 ? '0' : '') + n; };
    var lines = ['# Tilli Measures change history · ' + AD.school.name + ' · ' + histRangeLabel() + (histState.kind ? ' · ' + histState.kind : '') + (histState.q ? ' · search "' + histState.q + '"' : '') + ' · Generated ' + genStamp(),
      'Date,Time,Who,Role,What happened,Student(s),Section,Base section,Field changes'];
    list.forEach(function (e) {
      var d = new Date(e.at), a = e.actor || {};
      lines.push([d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()), two(d.getHours()) + ':' + two(d.getMinutes()),
        a.name || a.email || '', HU.roleLabel(a.role), HU.sentence(e, {}),
        (e.students || []).map(function (x) { return (x.name || '') + (x.id ? ' (' + x.id + ')' : ''); }).join('; '),
        e.section_name || '',
        e.section_id && window.TilliAPI && TilliAPI.sectionBase ? TilliAPI.sectionBase(currentSchoolId(), e.section_id) : '',
        (e.changes || []).map(function (c) { return c.label + ': ' + (c.from == null ? '' : c.from) + ' → ' + (c.to == null ? '' : c.to); }).join('; ')
      ].map(csvCell).join(','));
    });
    var url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));   // BOM so Excel reads → and names correctly
    var link = document.createElement('a'); link.href = url; link.download = 'tilli-history-' + (histState.range === 'custom' ? 'custom' : 'past-' + histState.range + '-days') + '-' + genStamp() + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    toast('Downloaded ' + countNoun(list.length, 'change', 'changes') + ' as CSV.');
  }
  SCREEN.history = function (params, body) {
    var HU = window.TilliHistory;
    if (!HU) { body.innerHTML = stError('History'); return; }
    body.innerHTML = screenHead('History', 'A clear record of every change at ' + AD.school.name + ' — who made it, when, and what changed.') +
      // Free on the page, no card: date range + download, then type + search, then the dated list.
      '<div class="hist-range">' +
        '<div class="ui-seg" role="radiogroup" aria-label="Date range">' + HIST_RANGES.map(function (r) {
          return '<button type="button" role="radio" aria-checked="' + (histState.range === r[0]) + '" class="' + (histState.range === r[0] ? 'on' : '') + '" data-hist-range="' + r[0] + '">' + r[1] + '</button>';
        }).join('') + '</div>' +
        '<span class="hist-dates" id="hist-dates"' + (histState.range === 'custom' ? '' : ' hidden') + '>' +
          '<label>From <input type="date" class="input sm" id="hist-from" value="' + esc(histState.from) + '"></label>' +
          '<label>To <input type="date" class="input sm" id="hist-to" value="' + esc(histState.to) + '"></label></span>' +
        '<button type="button" class="btn btn-outline btn-sm hist-csv" id="hist-csv" title="Download every change shown below (all pages) as a CSV file">Download CSV</button>' +
      '</div>' +
      '<div class="hist-tools">' + HU.kindChipsHTML(histState.kind) +
        '<input class="input hist-q" id="hist-q" placeholder="Search a student, staff member or section…" value="' + esc(histState.q) + '" aria-label="Search history">' +
        '<span class="hist-count" id="hist-count"></span></div>' +
      '<div id="hist-list"></div>';

    var listEl = body.querySelector('#hist-list'), countEl = body.querySelector('#hist-count'), csvBtn = body.querySelector('#hist-csv');
    csvBtn.addEventListener('click', function () { exportHistoryCSV(histFiltered()); });
    body.querySelectorAll('[data-hist-range]').forEach(function (b) {
      b.addEventListener('click', function () {
        histState.range = b.dataset.histRange; histState.shown = HIST_PAGE;
        body.querySelectorAll('[data-hist-range]').forEach(function (c) { var on = c === b; c.classList.toggle('on', on); c.setAttribute('aria-checked', on); });
        body.querySelector('#hist-dates').hidden = histState.range !== 'custom';
        if (histState.range === 'custom' && !histState.from) body.querySelector('#hist-from').focus();
        drawList();
      });
    });
    [['#hist-from', 'from'], ['#hist-to', 'to']].forEach(function (x) {
      body.querySelector(x[0]).addEventListener('change', function (ev) { histState[x[1]] = ev.target.value; histState.shown = HIST_PAGE; drawList(); });
    });
    function drawList() {
      var all = histFiltered();
      var more = all.length - histState.shown;
      csvBtn.disabled = !all.length;
      listEl.innerHTML = HU.listHTML(all.slice(0, histState.shown), { me: email,
          empty: histState.q ? 'No changes match “' + histState.q + '” ' + histRangeLabel() + '.' : 'No changes ' + histRangeLabel() + '.' }) +
        (more > 0 ? '<button class="btn btn-outline btn-sm hist-morebtn" id="hist-more">Show ' + Math.min(HIST_PAGE, more) + ' more</button>' : '');
      countEl.textContent = countNoun(all.length, 'change', 'changes');
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
    body.querySelector('#hist-q').addEventListener('input', function (ev) { histState.q = ev.target.value; histState.shown = HIST_PAGE; drawList(); });
    drawList();
  };

  // This school's change history for the signed-in viewer. A Tilli / group
  // admin who drilled in without a school membership reads it platform-scoped.
  function schoolHistory(filter) {
    var A = window.TilliAPI, sid = currentSchoolId();
    if (!A || !A.historyFor || !sid) return [];
    var list = A.historyFor(email, sid, filter || {});
    if (list == null && (role === 'tilli' || role === 'group') && A.historyAcross) list = A.historyAcross([sid], filter || {});
    // Board-scoped admin: drop changes to other boards' classes (school-wide ones stay).
    var sc = boardScope();
    if (sc) list = (list || []).filter(function (e) { return !e.section_id || sc.indexOf(e.section_id) >= 0; });
    return list || [];
  }
  // Section ids this admin may see, or null for every board.
  function boardScope() { return window.TILLI_CREATED && window.TILLI_CREATED.scope || null; }
  function boardScopeChip() {
    var b = window.TILLI_CREATED && window.TILLI_CREATED.boards;
    return b ? '<span class="ad-year" title="You see only ' + esc(b.join(' + ')) + ' grades, children and results.">' + esc(b.join(' + ')) + ' only</span>' : '';
  }
  // Scoped to boards, but no grade is tagged with them yet → say why it's empty.
  function boardScopeNoteHTML() {
    var b = window.TILLI_CREATED && window.TILLI_CREATED.boards;
    if (!b || AD.sections.length) return '';
    return '<div class="ui-note warn mb-3"><span aria-hidden="true">⚠️</span><span>Your access is limited to <b>' + esc(b.join(' + ')) + '</b>, but no grade at your school is set to ' + (b.length === 1 ? 'that board' : 'those boards') + ' yet. Ask the Tilli team to set each grade’s board.</span></div>';
  }

  // Re-reveal one invited teacher's still-valid temporary password (relayable
  // until they set their own). Mirrors the platform-admin invitation receipt.
  function showInvitePassword(u) {
    if (!u || !u.tempPassword) { toast('No temporary password to show.'); return; }
    openModal(modalHead('Temporary password') +
      '<p class="ui-mod-note mb-3">Relay this one-time password to <b>' + esc(u.name) + '</b>. It stops working the moment they set their own — the row then reads <b>Active</b>.</p>' +
      '<div class="row ui-inset">' +
        '<span class="mono" style="font-size:var(--fs-lg);font-weight:700;letter-spacing:.08em">' + esc(u.tempPassword) + '</span>' +
        '<button class="btn btn-outline btn-sm ml-auto" data-copypw="' + esc(u.tempPassword) + '">Copy</button></div>' +
      '<div class="ui-modal-foot"><button class="btn btn-primary btn-sm" data-mclose="1">Done</button></div>');
    var cp = document.querySelector('[data-copypw]');
    if (cp) cp.addEventListener('click', function () { try { navigator.clipboard.writeText(cp.dataset.copypw); } catch (e) {} toast('Password copied.'); });
  }

  // Full detail for one row, opened by clicking the name. Reads the authoritative
  // account from TilliAPI when one exists (real dates + invited-by), falling back
  // to the row's own fields for bridged/demo staff.
  function showUserDetail(u) {
    if (!u) return;
    var acct = (window.TilliAPI && TilliAPI.getAccount) ? TilliAPI.getAccount(u.email) : null;
    var isTeacher = /teacher/i.test(u.role || '');
    var invited = u.status === 'Invited';
    var boards = schoolBoards();
    var board = u.board || (acct && acct.board) || (isTeacher && boards.length === 1 ? boards[0] : '');
    var invitedAt = u.invitedAt || (acct && acct.createdAt) || null;
    var activatedAt = acct && acct.activatedAt;
    // resolve the inviter's email to a friendlier name if we recognise it
    var byEmail = acct && acct.invitedBy, byName = byEmail;
    if (byEmail) { var m = seedUsers().filter(function (x) { return String(x.email || '').toLowerCase() === byEmail; })[0]; if (m) byName = m.name; }

    function row(label, valueHTML) {
      return '<div style="display:flex;justify-content:space-between;gap:16px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line-200)">' +
        '<span class="ui-eyebrow dark">' + label + '</span>' +
        '<span class="text-strong text-right" style="font-weight:700;font-size:var(--fs-sm)">' + valueHTML + '</span></div>';
    }
    var statusChip = u.status === 'Active'
      ? '<span class="ui-chip active"><span class="dot"></span>Active</span>'
      : '<span class="ui-chip slowing"><span class="dot"></span>Invited</span>';

    var pwRow = '';
    if (invited && u.tempPassword)
      pwRow = row('Temporary password',
        '<span class="mono" style="letter-spacing:.06em">' + esc(u.tempPassword) + '</span>' +
        ' <button class="btn-link" data-copypw="' + esc(u.tempPassword) + '">Copy</button>');
    else if (!invited && acct)
      pwRow = row('Temporary password', '<span class="text-muted" style="font-weight:600">Used — set their own</span>');

    var rows = row('Email', esc(u.email)) + row('Role', esc(u.role));
    if (isTeacher) { rows += row('Grade', u.grade ? esc(gradesLbl(u.grade)) : '—') + row('Section', u.section ? esc(userSecLbl(u)) : '—'); }
    if (board) rows += row('Board', esc(board));
    rows += row('Status', statusChip);
    if (invitedAt) rows += row('Date of invite', esc(fmtInvDate(invitedAt)));
    if (activatedAt) rows += row('Activated', esc(fmtInvDate(activatedAt)));
    if (byName) rows += row('Invited by', esc(byName));
    rows += pwRow;

    var actions = '<div class="ui-modal-foot">' +
      (invited ? '<button class="btn btn-outline btn-sm" data-udresend="1">Resend</button>' : '') +
      (isSelf(u) ? '' : '<button class="btn btn-danger-outline btn-sm" data-udrevoke="1">Revoke</button>') +
      '<button class="btn btn-primary btn-sm" data-mclose="1">Done</button></div>';

    openModal(modalHead(esc(u.name)) +
      (invited ? '<p class="ui-mod-note mb-3">Invited — relay the temporary password below. The status turns <b>Active</b> once they sign in and set their own.</p>' : '') +
      '<div>' + rows + '</div>' + actions);

    var cp = document.querySelector('[data-copypw]');
    if (cp) cp.addEventListener('click', function () { try { navigator.clipboard.writeText(cp.dataset.copypw); } catch (e) {} toast('Password copied.'); });
    var rs = document.querySelector('[data-udresend]');
    if (rs) rs.addEventListener('click', function () { toast('Invitation resent.'); });
    var rv = document.querySelector('[data-udrevoke]');
    if (rv) rv.addEventListener('click', function () { closeModal(); toast('Access removed — they can no longer sign in.'); });
  }
  // ---- Expected class size — teachers add up to it; past it, the child waits for an admin ----
  function apiRoom(sec) { return window.TilliAPI && TilliAPI.sectionRoom && currentSchoolId() ? TilliAPI.sectionRoom(currentSchoolId(), sec.id) : null; }
  function waitingKids() {
    var list = window.TilliAPI && TilliAPI.pendingStudents && currentSchoolId() ? TilliAPI.pendingStudents(currentSchoolId()) : [], sc = boardScope();
    return sc ? list.filter(function (k) { return sc.indexOf(k.section_id) >= 0; }) : list;
  }
  function roomText(rm) { return rm.expected == null ? rm.added + ' · no size set' : rm.added + ' of ' + rm.expected + (rm.pending ? ' +' + rm.pending + ' waiting' : ''); }
  function roomTone(rm) { return rm.expected == null ? ' warn' : rm.added < rm.expected ? ' short' : ''; }
  function decideKid(st, approve) {
    var nm = st.name || st.student_id;
    if (approve) {
      var r = TilliAPI.decideStudent(st.school_id, st.student_id, true, email);
      toast(r.ok ? nm + ' approved' + (r.room && r.room.expected ? ' — ' + secShort(st.grade, st.section) + ' now expects ' + r.room.expected + '.' : '.') : 'That request was already handled.');
      render(); return;
    }
    var ov = openModal(modalHead('Turn down ' + nm + '?') +
      '<p class="mb-4">' + esc(nm) + ' (' + esc(st.student_id) + ') will be removed from ' + esc(gLbl(st.grade)) + ' · ' + esc(secShort(st.grade, st.section)) + '. Do this when the child is a duplicate or isn’t at your school. Anything already recorded for them is removed too.</p>' +
      '<div class="row" style="gap:8px;justify-content:flex-end"><button class="btn btn-outline btn-sm" data-mclose="1">Cancel</button><button class="btn btn-danger btn-sm" data-kidgo>Turn down</button></div>');
    ov.querySelector('[data-kidgo]').addEventListener('click', function () {
      TilliAPI.decideStudent(st.school_id, st.student_id, false, email);
      var i = AD.students.findIndex(function (x) { return String(x.adm).toUpperCase() === String(st.student_id).toUpperCase(); });
      if (i >= 0) AD.students.splice(i, 1);
      closeModal(); toast(nm + ' turned down and removed.'); render();
    });
  }

  // ---- Grade roster popup (grade-select-first) — students + teacher per section ----
  function openGradeRoster(grade) {
    var secs = AD.sections.filter(function (s) { return s.grade === grade; });
    var rows = AD.rosterRows().filter(function (r) { return r.grade === grade; });

    // Teacher-per-section: editable inline. Writes back to the shared AD.sections
    // object, so the roster screen's Teacher–section assignment card stays in sync.
    var teacherBlock = '<div class="row wrap mb-4" style="gap:10px 16px">' +
      secs.map(function (s) {
        var opts = AD.teachers.map(function (t) { return '<option value="' + t.id + '"' + (t.id === s.teacherId ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
        var rm = AD.pastYear ? null : apiRoom(s);
        // Expected size: teachers can add up to it; past it (or with none set) a new child waits for approval.
        var size = rm ? '<label class="ad-sizein" title="Expected students in ' + esc(secShort(s.grade, s.section)) + '. Teachers can add up to this many; more waits for your approval. Leave empty and every new child needs approval.">' +
            '<span>' + rm.added + ' of</span><input type="number" min="0" class="input sm" data-grsize="' + esc(s.id) + '" value="' + (rm.expected || '') + '" placeholder="—" aria-label="Expected students in ' + esc(secShort(s.grade, s.section)) + '"></label>' : '';
        return '<div class="row" style="gap:8px">' +
          '<span class="ui-metachip" style="padding:7px 13px"><b>' + esc(secShort(s.grade, s.section)) + '</b></span>' +
          '<label class="select-wrap" style="min-width:180px"><select class="select sm" data-grteacher="' + esc(s.id) + '"' + (AD.pastYear ? ' disabled' : '') + '>' + opts + '</select></label>' + size + '</div>';
      }).join('') + '</div>';

    var waitingIds = waitingKids().map(function (x) { return String(x.student_id).toUpperCase(); });
    var tableHTML = '<div class="ui-tablewrap"><table class="ui-table mw-640"><thead><tr><th>Name</th><th>Student ID</th><th>Section</th><th>Parent email</th>' + (SHOW_STUDENT_STAGE ? '<th>Developmental stage</th>' : '') + '</tr></thead><tbody id="gr-tbody">' +
      rows.map(function (r) {
        var stageCell = SHOW_STUDENT_STAGE ? '<td>' + (r.stage ? '<span class="ui-badge lvl-' + r.stage.lvl + '"><span class="d"></span>' + esc(r.stage.label) + '</span>' : '<span class="text-muted">not yet measured</span>') + '</td>' : '';
        return '<tr class="clickable" data-stuhist="' + esc(r.adm) + '" title="See ' + esc(r.first || r.name) + '\'s status and class history" data-nm="' + esc((r.name + ' ' + r.adm).toLowerCase()) + '" data-sec="' + esc(r.section) + '"><td class="name">' + esc(r.name) + (waitingIds.indexOf(String(r.adm).toUpperCase()) >= 0 ? ' <span class="ad-room short" title="Added past the class size — waiting for approval on the Roster page">Waiting</span>' : '') + '</td><td class="ad-num">' + esc(r.adm) + '</td><td>' + esc(secShort(r.grade, r.section)) + '</td><td>' + esc(r.parentEmail) + '</td>' + stageCell + '</tr>';
      }).join('') + '</tbody></table></div>';

    openModal(modalHead(gLbl(grade) + ' · roster') +
      '<p class="ui-mod-note mb-3">' + plural(rows.length, 'student') + ' · ' + plural(secs.length, 'section') + '. ' + (SHOW_STUDENT_STAGE ? 'Identity, enrolment and a temporary stage column.' : 'Identity and enrolment only — no SEL results.') + '</p>' +
      (SHOW_STUDENT_STAGE ? '<div class="ui-note mt-3"><span aria-hidden="true">⚠️</span><span><b>Temporary:</b> the developmental-stage column shows an individual child\'s SEL result, which leadership is not normally shown (spec §2). It is behind a flag and will be removed.</span></div>' : '') +
      '<div class="ui-eyebrow dark mb-2">Teachers</div>' + teacherBlock +
      '<div class="row wrap mb-3" style="gap:8px">' +
        '<button type="button" class="ui-filterchip on" data-secfilter="" aria-pressed="true">All sections</button>' +
        secs.map(function (s) { return '<button type="button" class="ui-filterchip" data-secfilter="' + esc(s.section) + '" aria-pressed="false">Section ' + esc(secShort(s.grade, s.section)) + '</button>'; }).join('') +
      '</div>' +
      '<input class="input mb-3" id="gr-q" placeholder="Search name or student ID…" style="max-width:280px" aria-label="Search students in ' + esc(gLbl(grade)) + '">' +
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

    modalRoot.querySelectorAll('[data-grsize]').forEach(function (inp) {
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
      inp.addEventListener('change', function () {
        var r = TilliAPI.setSectionExpected(currentSchoolId(), inp.dataset.grsize, inp.value, email);
        if (!r.ok) { toast('Couldn’t save that size.'); return; }
        toast(r.room.expected ? r.room.name + ' expects ' + r.room.expected + ' students.' : 'Size cleared — new children in ' + r.room.name + ' now need your approval.');
        render(); openGradeRoster(grade);
      });
    });
    modalRoot.querySelectorAll('[data-grteacher]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var sec = AD.sections.find(function (x) { return x.id === sel.dataset.grteacher; });
        var prevId = sec && sec.teacherId;
        if (sec) sec.teacherId = sel.value;
        if (sec && prevId !== sel.value && window.TilliAPI && TilliAPI.recordChange) {
          var tName = function (id) { var t = AD.teachers.find(function (x) { return x.id === id; }); return t ? t.name : '—'; };
          TilliAPI.recordChange({ school_id: currentSchoolId(), section_id: sec.id, section_name: sec.name || (sec.grade + ' ' + sec.section),
            kind: 'student', action: 'teacher.reassign', actorEmail: email, changes: [{ label: 'Teacher', from: tName(prevId), to: tName(sel.value) }] });
        }
        toast('Teacher reassigned. Section history is unchanged.');
      });
    });
    modalRoot.querySelectorAll('[data-stuhist]').forEach(function (tr) {
      tr.addEventListener('click', function () { openStudentHistory(tr.dataset.stuhist); });
    });
  }

  // ---- Student details (leadership) — a second pop-up stacked over the grade roster ----
  // Top: this child's status at each assessment point (completion + overall band).
  // Below: two tabs — Class history (who taught them, each year, handover notes)
  // and Record changes (every edit, parent link and completion).
  // Closing it (×, Esc, or a click outside) returns to the roster underneath.
  var stuTab = 'history';   // last tab used, kept between children
  function openStudentHistory(adm) {
    var r = AD.rosterRows().find(function (x) { return x.adm === adm; });
    var st = AD.students.find(function (x) { return x.adm === adm; });
    if (!r) return;
    var sec = AD.sections.find(function (x) { return x.grade === r.grade && x.section === r.section; });
    var teacher = sec && AD.teachers.find(function (t) { return t.id === sec.teacherId; });
    var past = (TS && TS.pastClassesFor) ? TS.pastClassesFor(adm) : [];

    // Status per point: complete → Completed + band; open → this child's check-in; upcoming → dates.
    var stageCard = function (pt) {
      var status, band = null, cls = '';
      if (pt.status === 'complete') { status = 'Completed'; cls = 'done'; }
      else if (pt.status === 'open') {
        var c = st ? AD.checkinStatus(st) || 'none' : 'none';
        status = c === 'done' ? 'Completed' : c === 'draft' ? 'In progress' : 'Not started';
        cls = c === 'done' ? 'done' : c === 'draft' ? 'prog' : 'none';
      } else { var rg = AD.pointRange(pt); status = 'Not open yet' + (rg ? ' · ' + rg : ''); cls = 'later'; }
      if (st && cls === 'done') band = AD.bandMeta(AD.bandOf(AD.meanScore(st, pt.scoreField)));
      return '<div class="ad-stage ' + cls + '">' +
        '<div class="ad-stage-h">' + esc(pt.label) + (pt.status === 'open' ? '<span class="ui-tag cyan">Open now</span>' : '') + '</div>' +
        '<div class="ad-stage-s">' + esc(status) + '</div>' +
        (band ? '<span class="ui-badge lvl-' + band.lvl + '"><span class="d"></span>' + esc(band.label) + '</span>' : '<span class="ad-stage-none">' + (cls === 'later' ? 'No result yet' : 'Result after completion') + '</span>') +
        '</div>';
    };
    var stages = '<div class="ui-eyebrow dark mb-2">Current status</div><div class="ad-stages">' + AD.points.map(stageCard).join('') + '</div>';

    var row = function (o) {
      return '<div class="ad-hist-row">' +
        '<span class="ui-dot' + (o.now ? '' : ' text-muted') + '" style="' + (o.now ? 'color:var(--green-500)' : '') + '"></span>' +
        '<div class="flex-1">' +
          '<div class="row wrap" style="gap:8px"><b class="ad-hist-t">' + esc(o.cls) + '</b><span class="text-muted ad-hist-y">' + esc(o.year) + '</span>' + (o.now ? '<span class="ui-chip ok">Current class</span>' : '') + '</div>' +
          '<div class="ad-hist-sub">Teacher: ' + esc(o.teacher) + ' · ' + esc(o.done) + '</div>' +
          (o.note ? '<div class="ui-inset ad-hist-note"><span class="ui-eyebrow mb-1">Handover note from ' + esc(o.teacher) + '</span><p>' + esc(o.note) + '</p></div>' : '') +
        '</div></div>';
    };
    var rows = [row({ now: true, cls: sLbl(r.grade, r.section), year: AD.academicYears[0], teacher: teacher ? teacher.name : '—', done: 'in progress' })]
      .concat(past.slice().reverse().map(function (y) {
        return row({ cls: sLbl(y.grade, y.section), year: y.year, teacher: y.teacher, done: y.windowsDone + ' of 3 assessments completed', note: y.note });
      })).join('');
    var historyPane = '<div class="ui-card sm">' + rows + '</div>' +
      (past.length ? '' : '<p class="ui-mod-note mt-3">No earlier classes on Tilli for this child.</p>');

    var HU = window.TilliHistory, stuHist = HU ? schoolHistory({ student_id: adm }) : [];
    var changesPane = HU
      ? '<div class="row mb-2" style="justify-content:flex-end">' + HU.lastUpdatedHTML(stuHist[0], { me: email }) + '</div>' +
        '<div class="ui-card sm">' + HU.listHTML(stuHist, { me: email, hideStudent: true, showSection: false, empty: 'No changes recorded for ' + (r.first || r.name) + ' yet.' }) + '</div>'
      : '<p class="ui-mod-note">Record changes aren' + '’' + 't available here.</p>';

    var tabBtn = function (key, label, n) {
      return '<button type="button" class="ui-tab' + (stuTab === key ? ' on' : '') + '" role="tab" aria-selected="' + (stuTab === key) + '" data-stutab="' + key + '">' + esc(label) +
        (n != null ? ' <span class="ad-tabn">' + n + '</span>' : '') + '</button>';
    };

    closeStudentPopup();
    var ov = document.createElement('div'); ov.className = 'overlay ad-stack'; ov.id = 'ad-stack';
    ov.innerHTML = '<div class="ui-modal-card wide" role="dialog" aria-modal="true" aria-label="' + esc(r.name) + '">' +
      '<button class="dialog-close focus" data-stuclose aria-label="Close and go back to the roster">×</button>' +
      modalHead(r.name) +
      '<p class="ui-mod-note mb-4">' + esc(r.adm) + ' · ' + esc(sLbl(r.grade, r.section)) + ' · ' + plural(past.length + 1, 'year') + ' at ' + esc(AD.school.name) + '</p>' +
      stages +
      '<div class="ui-tabs ad-stutabs" role="tablist" aria-label="' + esc(r.name) + ' details">' + tabBtn('history', 'Class history', past.length + 1) + tabBtn('changes', 'Record changes', stuHist.length) + '</div>' +
      '<div id="ad-stupane">' + (stuTab === 'changes' ? changesPane : historyPane) + '</div>' +
      '<div class="ui-note mt-3"><span aria-hidden="true">🔒</span><span>Bands show this child' + '’' + 's overall level at each point. Per-skill scores and answers stay with the class teacher.</span></div>' +
      '</div>';
    modalRoot.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeStudentPopup(); });
    ov.querySelector('[data-stuclose]').addEventListener('click', closeStudentPopup);
    ov.querySelectorAll('[data-stutab]').forEach(function (b) {
      b.addEventListener('click', function () {
        stuTab = b.dataset.stutab;
        ov.querySelectorAll('[data-stutab]').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
        ov.querySelector('#ad-stupane').innerHTML = stuTab === 'changes' ? changesPane : historyPane;
      });
    });
    document.addEventListener('keydown', stuEsc, true);
    ov.querySelector('[data-stuclose]').focus();
  }
  // Esc closes only the top pop-up (capture phase, so the roster's own Esc handler never sees it).
  function stuEsc(e) { if (e.key === 'Escape' && document.getElementById('ad-stack')) { e.stopPropagation(); closeStudentPopup(); } }
  function closeStudentPopup() {
    var ov = document.getElementById('ad-stack'); if (ov) ov.remove();
    document.removeEventListener('keydown', stuEsc, true);
  }

  // This school's id (created schools resolve to a TilliAPI school_id; the demo
  // school uses its fixed id). Used to scope invites + read invited accounts.
  function currentSchoolId() { return (AD && AD.school && AD.school.id) || (TS && TS.school && TS.school.id) || null; }

  // Board(s) this school runs. A per-teacher board is only *asked for* when the
  // school runs more than one; with a single board it is applied automatically.
  // Reads an explicit `boards` array first (forward-compatible with multi-board
  // schools), then falls back to the school's single `board`.
  function schoolBoards() {
    var s = (AD && AD.school) || {}, arr = null;
    if (Array.isArray(s.boards)) arr = s.boards;
    else if (window.TilliAPI && TilliAPI.resolveSchool && currentSchoolId()) {
      var sc = TilliAPI.resolveSchool(currentSchoolId());
      if (sc) arr = Array.isArray(sc.boards) ? sc.boards : (sc.board ? [sc.board] : null);
    }
    if (!arr && s.board) arr = [s.board];
    return (arr || []).filter(Boolean);
  }

  // Reconcile a base staff list with the accounts TilliAPI has actually minted
  // for this school. An invited teacher shows as Invited until they set their own
  // password (mustReset clears → Active), and carries its grade/section/board +
  // the one-time temp password so the receipt can be re-shown.
  function isSelf(u) { return !!u && String(u.email || '').toLowerCase() === String(email || '').toLowerCase(); }
  function mergeAccounts(list) {
    var sid = currentSchoolId(), byEmail = {};
    list.forEach(function (u) { byEmail[String(u.email || '').toLowerCase()] = u; });
    var accts = (window.TilliAPI && TilliAPI.listAccounts) ? TilliAPI.listAccounts() : [];
    accts.forEach(function (a) {
      if (!a.email) return;
      if (sid && a.school_id && a.school_id !== sid) return;   // other schools' invites
      var e = a.email.toLowerCase();
      var status = a.mustReset ? 'Invited' : 'Active';
      var meta = { status: status, grade: a.grade || '', section: a.section || '',
        invitedAt: a.createdAt || null, tempPassword: a.mustReset ? a.tempPassword : null };
      if (a.board || !byEmail[e]) meta.board = a.board || '';   // don't blank a board the section mapping already gave
      if (byEmail[e]) Object.assign(byEmail[e], meta);   // update known staff with live status
      else {                                             // brand-new invited teacher
        var role = a.role || 'Teacher';
        list.push(Object.assign({ name: a.name || a.email.split('@')[0], email: a.email, role: role }, meta));
        byEmail[e] = list[list.length - 1];
      }
    });
    return list;
  }

  // ---- Invite dates + expiry ----
  // An invite is valid for INVITE_DAYS from when it was sent (same 14 days as the
  // Tilli platform's invitations). Within INVITE_WARN_DAYS of expiring — or once
  // expired — it raises an alert on Your team and on the Overview.
  var INVITE_DAYS = 14, INVITE_WARN_DAYS = 2, DAY_MS = 864e5;
  var inviteResentAt = {};   // email → when "Resend" was pressed this session (restarts the clock)
  function inviteInfo(u) {
    if (!u || u.status !== 'Invited') return null;
    var sent = inviteResentAt[String(u.email || '').toLowerCase()] || u.invitedAt;
    if (!sent) return null;
    var expires = sent + INVITE_DAYS * DAY_MS, left = Math.ceil((expires - Date.now()) / DAY_MS);
    return { sent: sent, expires: expires, left: left, expired: left <= 0, soon: left > 0 && left <= INVITE_WARN_DAYS };
  }
  function inviteLeftText(inf) { return inf.expired ? 'expired' : 'expires in ' + countNoun(inf.left, 'day', 'days'); }
  // Several invites → name the most urgent one + a count ("Nadia Fernando and 4 more"),
  // and split the rest into expiring vs already expired.
  function inviteWhoText(list) { return list.length === 1 ? list[0].u.name : list[0].u.name + ' and ' + (list.length - 1) + ' more'; }
  function inviteSplitText(list) {
    var gone = list.filter(function (x) { return x.inf.expired; }).length, soon = list.length - gone, bits = [];
    if (soon) bits.push(soon + (soon === 1 ? ' expires' : ' expire') + ' within ' + countNoun(INVITE_WARN_DAYS, 'day', 'days'));
    if (gone) bits.push(gone + (gone === 1 ? ' has' : ' have') + ' already expired');
    return bits.join(' · ') + '.';
  }
  // Invites that need attention now (expiring within INVITE_WARN_DAYS, or expired).
  function inviteAlerts() {
    return seedUsers().map(function (u) { return { u: u, inf: inviteInfo(u) }; })
      .filter(function (x) { return x.inf && (x.inf.soon || x.inf.expired); })
      .sort(function (a, b) { return a.inf.expires - b.inf.expires; });
  }
  // One warning line for the Overview / Your team. `onTeam` swaps the link for Resend buttons.
  function inviteAlertHTML(onTeam) {
    var list = inviteAlerts(); if (!list.length) return '';
    var one = list.length === 1, x = list[0];
    var msg = one
      ? '<b>' + esc(x.u.name) + '</b>' + '’' + 's invite ' + inviteLeftText(x.inf) + (x.inf.expired ? '' : ' (' + esc(fmtInvDate(x.inf.expires)) + ')') + '.'
      : '<b>' + esc(inviteWhoText(list)) + '</b> haven' + '’' + 't accepted their invites. ' + inviteSplitText(list);
    var act = onTeam
      ? '<button class="btn-link" data-resend-email="' + esc(list.map(function (y) { return y.u.email; }).join(',')) + '">' + (one ? 'Resend' : 'Resend all ' + list.length) + '</button>'
      : '<button class="btn-link" data-goinvites="1">Review invites →</button>';
    return '<div class="ui-note warn ad-invalert" role="status"><span aria-hidden="true">⏳</span><span>' + msg + ' ' + act + '</span></div>';
  }
  function resendInvite(emails) {   // one address or a list
    var list = [].concat(emails).filter(Boolean);
    list.forEach(function (e) { inviteResentAt[String(e).toLowerCase()] = Date.now(); });
    toast((list.length > 1 ? list.length + ' invitations resent' : 'Invitation resent') + ' — valid for another ' + INVITE_DAYS + ' days.');
    render();
  }

  function seedUsers() {
    // Created schools: show THIS school's real staff (coordinator + teachers),
    // bridged from TilliAPI into window.TILLI_SCHOOL. Pre-existing staff read as
    // Active; freshly invited teachers get their live status via mergeAccounts.
    if (window.TILLI_CREATED) {
      var TS = window.TILLI_SCHOOL || {}, seen = {}, out = [];
      (TS.admins || []).forEach(function (a) {
        var e = String(a.email || '').toLowerCase();
        if (!e || seen[e]) return; seen[e] = 1;
        out.push({ name: a.name, email: a.email,
          role: 'School admin', status: 'Active' });
      });
      (TS.teachers || []).forEach(function (t) {
        var e = String(t.email || '').toLowerCase();
        if (!e || seen[e]) return; seen[e] = 1;
        out.push({ name: t.name, email: t.email, role: 'Teacher', status: 'Active',
          grade: t.grade || '', section: t.section || '' });
      });
      return mergeAccounts(out);
    }
    // Demo school: leadership + every teacher, with grade/section read from the
    // live section → teacher mapping (the same source the section cards use), so
    // the two never disagree. A joined teacher with no section shows "No section yet";
    // an invited one shows nothing (they add their own sections after accepting).
    // Demo: Nadia's invite went out 12 days ago, so it is 2 days from expiring (shows the alert).
    // In a calm demo stage (Midline open) it went out 3 days ago, so it isn't close to expiring.
    var INVITED = { 'nadia.fernando@littlesprouts.edu': Date.now() - (AD.demoCalm && AD.demoCalm() ? 3 : 12) * DAY_MS };
    var demo = ((window.TILLI_SCHOOL || {}).admins || []).filter(function (a) { return a.role !== 'tilli'; }).map(function (a) {
      return { name: a.name, email: a.email, role: a.role === 'group' ? 'School group admin' : 'School admin', status: INVITED[a.email] ? 'Invited' : 'Active', invitedAt: INVITED[a.email] || null };
    });
    AD.teachers.forEach(function (t) {
      var secs = AD.sections.filter(function (sd) { return sd.teacherId === t.id; });
      var grades = secs.reduce(function (acc, sd) { if (acc.indexOf(sd.grade) < 0) acc.push(sd.grade); return acc; }, []);
      var tboards = secs.reduce(function (acc, sd) { if (sd.board && acc.indexOf(sd.board) < 0) acc.push(sd.board); return acc; }, []);
      demo.push({ name: t.name, email: t.email, role: 'Teacher', status: INVITED[t.email] ? 'Invited' : 'Active', invitedAt: INVITED[t.email] || null,
        grade: grades.join(', '), section: secs.map(function (sd) { return sd.section; }).join(', '), board: tboards.join(', ') });
    });
    return mergeAccounts(demo);
  }

  // ========================================================
  //  5) REPORTS  (spec §5.5) — both roles
  // ========================================================
  SCREEN.reports = function (params, body) {
    // Nothing measured yet → nothing to report (No-data lifecycle state).
    if (!AD.completedPoints.length) {
      body.innerHTML = screenHead('Reports', 'Ready-to-share updates for your board and families — never individual children.') +
        card('Reports', null, firstResultsEmpty('reports'), 'span2');
      return;
    }
    var scope = params.rscope || 'school';        // school | <grade>
    var point = params.rpoint || AD.latestComplete.key;
    var scopeOpts = [{ v: 'school', t: 'Whole school' }].concat(AD.grades.map(function (g) { return { v: g, t: gLbl(g) }; }));
    var pointOpts = AD.completedPoints.map(function (p) { return { v: p.key, t: pointLabel(p) }; });

    var summaryBody = '<p class="ui-mod-note mb-3">One page for your board or management committee: sections taking part, children assessed, skill-by-skill results and progress since Baseline. Groups only — no individual children, no teacher comparisons.</p>' +
      '<div class="ad-filters">' + selectWrap('rp-scope', scopeOpts, scope, 'Scope') + selectWrap('rp-point', pointOpts, point, 'Assessment point') + '</div>' +
      '<button class="btn btn-primary btn-sm" data-genpdf="1">Generate leadership summary</button>';

    var newsletter = newsletterText(scope, point);
    var newsBody = '<p class="ui-mod-note mb-3">Warm, plain words for families — no scores or jargon. Make it yours before you copy it.</p>' +
      '<textarea class="ad-copyblock" id="rp-news">' + esc(newsletter) + '</textarea>' +
      '<div class="row mt-3"><button class="btn btn-cyan btn-sm" data-copynews="1">Copy to clipboard</button><button class="btn btn-outline btn-sm" data-regennews="1">Regenerate</button></div>';

    var csvBody = '<p class="ui-mod-note mb-3">For your own records or a deeper look in a spreadsheet. Each file is stamped with the assessment point and today’s date. Results are group-level only — individual children’s results are never exported.</p>' +
      '<div style="display:flex;flex-direction:column;gap:10px;max-width:420px">' +
      (isCoordinator ? '<button class="btn btn-outline btn-sm" data-csv="roster" style="justify-content:space-between">Roster CSV <span class="text-muted">names and sections, no scores</span></button>' : '') +
      '<button class="btn btn-outline btn-sm" data-csv="outcomes" style="justify-content:space-between">Aggregate outcomes CSV <span class="text-muted">section level and above</span></button>' +
      '</div>';

    body.innerHTML = screenHead('Reports', 'Ready-to-share updates for your board and families — never individual children.') +
      card('Leadership summary (PDF)', null, summaryBody, 'span2') +
      '<div class="mt-gap">' + card('A paragraph for your newsletter', null, newsBody) + '</div>' +
      '<div class="mt-gap">' + card('Spreadsheet exports (CSV)', null, csvBody) + '</div>';

    body.querySelector('#rp-scope').addEventListener('change', function (e) { setParams({ rscope: e.target.value, rpoint: point }); });
    body.querySelector('#rp-point').addEventListener('change', function (e) { setParams({ rscope: scope, rpoint: e.target.value }); });
    body.querySelector('[data-genpdf]').addEventListener('click', function () { generateSummary(scope, point); });
    body.querySelector('[data-copynews]').addEventListener('click', function () { var t = document.getElementById('rp-news'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) {} toast('Newsletter paragraph copied.'); });
    body.querySelector('[data-regennews]').addEventListener('click', function () { newsVariant++; document.getElementById('rp-news').value = newsletterText(scope, point); toast('Regenerated.'); });
    body.querySelectorAll('[data-csv]').forEach(function (b) { b.addEventListener('click', function () { exportCSV(b.dataset.csv, scope, point); }); });
  };

  // ---------- Reports helpers ----------
  function scopeStudentsForReport(scope) { return scope === 'school' ? AD.students : AD.studentsInGrade(scope); }
  function genStamp() { var d = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function sectionsInScope(scope) { return AD.sections.filter(function (s) { return scope === 'school' || s.grade === scope; }); }

  // Plain, parent-facing paragraph. "Regenerate" rotates between three
  // wordings; the closing line follows the point (Endline closes the year).
  var newsVariant = 0;
  function newsletterText(scope, point) {
    var pt = AD.points.find(function (p) { return p.key === point; });
    var where = scope === 'school' ? 'across the school' : 'in ' + gLbl(scope);
    var secs = sectionsInScope(scope).length;
    var idx = AD.points.indexOf(pt), next = AD.points[idx + 1];
    var close = next ? 'we look forward to sharing more after our ' + next.label + ' check-in.' : 'we look forward to building on this next year.';
    var opens = [
      'This term, our children continued their social-emotional and thinking-skills journey with Tilli ' + where + '. ',
      'Alongside reading and numbers, our children have been building everyday life skills with Tilli ' + where + '. ',
      'A quick update on Tilli, the programme that helps our children grow social-emotional and thinking skills ' + where + '. ',
    ];
    var mids = [
      'All ' + secs + ' of our sections took part, and our teachers checked in at ' + pt.label + ' to see how everyone is growing. ',
      'Every one of our ' + secs + ' sections joined in, and at ' + pt.label + ' our teachers took stock of how the children are doing. ',
      'Our teachers in all ' + secs + ' sections completed the ' + pt.label + ' check-in this term. ',
    ];
    var v = newsVariant % 3;
    return opens[v] + mids[v] +
      'Many children are becoming more confident at naming their feelings, settling into routines, and staying with a task — the everyday building blocks that help them thrive. ' +
      'We are proud of how our classrooms are making space for these skills, and ' + close;
  }

  function generateSummary(scope, point) {
    // Open the tab synchronously inside the click (so pop-up blockers allow it),
    // show "Preparing…", then fill it after a short simulated generation.
    var w = window.open('', '_blank');
    if (!w) { toast('Your browser blocked the summary tab — allow pop-ups for this site.'); return; }
    try { w.document.write('<!doctype html><title>Preparing…</title><p style="font-family:Arial,sans-serif;padding:32px;color:#5B6170">Preparing your leadership summary…</p>'); } catch (e) {}
    setTimeout(function () { openSummaryDoc(scope, point, w); }, 900);
  }
  function openSummaryDoc(scope, point, w) {
    var pt = AD.points.find(function (p) { return p.key === point; });
    var students = scopeStudentsForReport(scope);
    var secs = sectionsInScope(scope);
    var scopeName = scope === 'school' ? AD.school.name : gLbl(scope);
    var skillRows = AD.skills.map(function (sk) {
      var d = AD.distribution(students, sk.key, point);
      var m = point !== 'baseline' ? AD.movement(students, sk.key, point) : null;
      return '<tr><td>' + esc(sk.name) + '</td><td>' + miniBar(d) + '</td><td style="white-space:nowrap">' + (m ? '▲' + m.up + ' / ▼' + m.down : '—') + '</td></tr>';
    }).join('');
    // The popup is a separate window WITHOUT tilli.css, so its CSS stays self-contained:
    // sizes use the type-scale values (11/13/15/24) and colours are the tokens resolved to hex here.
    var C = PRINT_COLOURS();
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Tilli Measures — Leadership summary</title>' +
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:' + C.ink + ';margin:0;padding:32px;max-width:820px}h1{font-size:24px;margin:0 0 2px}.sub{color:' + C.soft + ';font-size:13px;margin:0 0 18px}.meta{font-size:13px;color:' + C.muted + ';margin-bottom:18px}' +
      'table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:7px 8px;border-bottom:1px solid ' + C.line + ';text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:' + C.soft + '}' +
      '.tiles{display:flex;gap:24px;margin:16px 0 22px}.tile b{display:block;font-size:24px}.tile span{font-size:13px;color:' + C.soft + '}.leg{font-size:11px;color:' + C.soft + ';margin-top:10px}.print{margin:20px 0;text-align:center}' +
      '.mini{display:inline-flex;width:200px;height:14px;border-radius:4px;overflow:hidden;vertical-align:middle}.mini i{display:block;height:100%}.mini-l{font-size:11px;color:' + C.soft + '}' +
      '.print button{padding:10px 22px;font-size:15px;border:none;border-radius:999px;background:' + C.green + ';color:' + C.white + ';font-weight:700;cursor:pointer}@media print{.print{display:none}}</style></head><body>' +
      '<h1>' + esc(scopeName) + ' — Leadership summary</h1><p class="sub">Social-emotional & cognitive skills · Tilli Measures</p>' +
      '<p class="meta">Assessment point: <b>' + esc(pointLabel(pt)) + '</b> · Generated ' + genStamp() + '</p>' +
      '<div class="tiles"><div class="tile"><b>' + secs.length + '</b><span>sections running</span></div><div class="tile"><b>' + students.length + '</b><span>students assessed</span></div><div class="tile"><b>' + AD.completedPoints.length + '</b><span>assessment points complete</span></div></div>' +
      '<table><thead><tr><th>Skill</th><th>Band distribution (Sprouting / Growing / Blooming)</th><th>Movement</th></tr></thead><tbody>' + skillRows + '</tbody></table>' +
      '<p class="leg">Bands: Sprouting (blue) · Growing (amber) · Blooming (green). Figures are group distributions — no individual results are shown. No section-level teacher attribution.</p>' +
      '<div class="print"><button onclick="window.print()">Print / Save as PDF</button></div></body></html>';
    try { w.document.open(); w.document.write(html); w.document.close(); } catch (e) { toast('The summary tab was closed.'); }
  }
  // Token hex for the print popup (resolved here because the popup has no tilli.css).
  function PRINT_COLOURS() {
    return { ink: PAL.css('--ink-900'), soft: PAL.css('--ink-450'), muted: PAL.css('--ink-300'), line: PAL.css('--line-200'),
      green: PAL.css('--green-500'), white: PAL.css('--white') };
  }
  function miniBar(d) {
    var p = d.pct;
    return '<span class="mini">' + AD.bands.map(function (b) {
      return '<i style="width:' + p[b.key] + '%;background:' + PAL.css(b.token) + '"></i>';
    }).join('') + '</span> <span class="mini-l">' + p.secure + '% blooming</span>';
  }
  function exportCSV(kind, scope, point) {
    var pt = AD.points.find(function (p) { return p.key === point; });
    var lines = [], name;
    var header = '# Tilli Measures export · ' + (scope === 'school' ? AD.school.name : gLbl(scope)) + ' · Assessment point: ' + pt.label + ' · Generated ' + genStamp();
    if (kind === 'roster') {
      name = 'roster';
      lines.push(header); lines.push('Student ID,Name,Grade,Base grade,Section,Base section,Enrolment,Parent claim');
      AD.rosterRows().forEach(function (r) { if (scope !== 'school' && r.grade !== scope) return; lines.push([r.adm, r.name, r.grade, baseG(r.grade), r.section, baseS(r.grade, r.section), r.enrolment, r.claim].map(csvCell).join(',')); });
    } else {
      name = 'aggregate-outcomes';
      lines.push(header); lines.push('Scope,Base grade/section,Level,Skill,Sprouting %,Growing %,Blooming %');
      var scopes = [];
      if (scope === 'school') { scopes.push({ label: AD.school.name, base: '', level: 'School', students: AD.students }); AD.grades.forEach(function (g) { scopes.push({ label: g, base: baseG(g), level: 'Grade', students: AD.studentsInGrade(g) }); }); }
      else scopes.push({ label: scope, base: baseG(scope), level: 'Grade', students: AD.studentsInGrade(scope) });
      AD.sections.filter(function (s) { return scope === 'school' || s.grade === scope; }).forEach(function (s) { scopes.push({ label: s.name, base: baseS(s.grade, s.section), level: 'Section', students: AD.studentsInSection(s) }); });
      scopes.forEach(function (sc) { AD.skills.forEach(function (sk) { var d = AD.distribution(sc.students, sk.key, point); lines.push([sc.label, sc.base, sc.level, sk.name, d.pct.emerging, d.pct.developing, d.pct.secure].map(csvCell).join(',')); }); });
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
  // Suggestions follow the season: "who still needs to finish?" only while a window is open.
  function askSugs() {
    return ['Is the programme working?', 'Where are we weakest?',
      AD.openPoint ? 'Who still needs to finish?' : 'When is the next assessment?',
      'Draft a board paragraph'];
  }
  function askGreeting() {
    return [{ role: 'tilli', sugs: true,
      html: 'Hi ' + esc((me.name || 'there').split(' ')[0]) + " — I'm Tilli. Ask me whether the programme is working, where to focus, how the current assessment window is going, or for a paragraph you can share with your board." }];
  }
  function askEnsure() { if (!askState.messages) askState.messages = askGreeting(); }
  function askLink(screen, label, params) {
    return '<button class="btn-link mt-2" data-askgo="' + esc(screen) + '"' +
      (params ? ' data-askparams="' + esc(JSON.stringify(params)) + '"' : '') + '>' + esc(label) + ' →</button>';
  }
  // Where a number came from — so an answer can be checked against the dashboard.
  function srcTag(screenLabel, pt, n) {
    return '<div class="ask-src">From ' + esc(screenLabel) + (pt ? ' · ' + esc(pointLabel(pt)) : '') + (n != null ? ' · n=' + n : '') + '</div>';
  }
  // Short, plain committee paragraph built from the same numbers as the Overview.
  function boardParagraph(v) {
    if (!v.hasOutcomes) return 'Tilli Measures is running across all ' + AD.sections.length + ' of our sections. The ' + (v.openPoint ? v.openPoint.label : 'Baseline') + ' assessment is under way; the first results will be available once it closes.';
    var s = 'Tilli Measures is running across all ' + AD.sections.length + ' sections (' + AD.students.length + ' children). ' +
      'At ' + v.point.label + ', ' + v.pctSecure + '% of skill ratings were at the Blooming level';
    if (v.deltaSecure != null) s += ', ' + (v.deltaSecure >= 0 ? 'up ' : 'down ') + Math.abs(v.deltaSecure) + ' points since Baseline' + (v.movementAvail ? ', with ' + v.childrenUp + ' of ' + v.childrenN + ' children moving up a band' : '');
    var gs = AD.growthStrength(AD.students, v.point.key, 1);
    return s + '. Our strongest area is ' + gs.strength[0].name + '; we are focusing next on ' + gs.growth[0].name + '. Results are reported for groups only — never individual children.';
  }
  // Keyword responder over the real data reads. Returns { html, sugs, dl }.
  // Order matters: report/board before "parent", counts only on "how many".
  // `dl` tells the Overview dandelion what to show for this answer (the full
  // screen and floating panel ignore it): { reset } = whole school, nothing lit;
  // otherwise zoom to the answer's scope, light `hl` (node keys; none = nothing
  // dimmed) and caption it with `note`. No `dl` = leave the view as it is.
  // Skill answers only zoom. A real model would return this same shape.
  // "Answering about" scope: whole school, one grade, or one section.
  function askScopeData(scope) {
    var sec = AD.sections.find(function (x) { return x.id === scope; });
    if (sec) return { label: sLbl(sec), tag: ' · ' + sLbl(sec), students: AD.studentsInSection(sec), match: function (a) { return a.id === sec.id; } };
    if (scope && AD.grades.indexOf(scope) >= 0) return { label: gLbl(scope), tag: ' · ' + gLbl(scope), students: AD.studentsInGrade(scope), match: function (a) { return a.grade === scope; } };
    return { label: 'Whole school', tag: '', students: AD.students, match: function () { return true; } };
  }
  // Everyday words for skills whose names people won't type exactly.
  var ASK_SKILL_ALIASES = { planning: ['planning', 'organising', 'organizing'], inhibition_distraction: ['distraction', 'distracted'],
    inhibition_response: ['self control', 'impulse'], emotion_regulation: ['regulation', 'calming down'], cognitive_flexibility: ['flexib'] };
  // Which grade or section a question names ("how is Grade 2 B doing?", "kg a",
  // "grade 3"). Sections first, so "Grade 2 B" doesn't stop at "Grade 2".
  // Returns a section id, a grade name, or 'school' when none is named.
  function askScopeFromText(q) {
    var t = ' ' + q.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ') + ' ';
    var rx = function (s) { return s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ +/g, ' *'); };
    var aliases = function (g) {
      var a = [rx(g)], m = /^grade (\d+)$/i.exec(g);
      if (m) a.push('class *' + m[1], 'g' + m[1]);
      if (/^kindergarten$/i.test(g)) a.push('kg', 'kinder');
      return a;
    };
    // A grade answers to its own name AND its fixed base ("Sunflowers" also matches "grade 1").
    var gradeAliases = function (g) { var b = baseG(g); return aliases(g).concat(b && b.toLowerCase() !== String(g).toLowerCase() ? aliases(b) : []); };
    var secHit = function (list, letter) { return !!letter && list.some(function (a) { return new RegExp('\\b' + a + ' *-? *' + rx(letter) + '\\b').test(t); }); };
    var sec = AD.sections.find(function (sd) {
      if (secHit(gradeAliases(sd.grade), sd.section)) return true;
      // ...and its fixed base section: "grade 1a" still finds "Sunflowers Rose" (base Grade 1A).
      var bg = baseG(sd.grade), code = baseS(sd.grade, sd.section);
      return !!bg && code.indexOf(bg) === 0 && secHit(aliases(bg), code.slice(bg.length).trim());
    });
    if (sec) return sec.id;
    var g = AD.grades.find(function (gr) { return gradeAliases(gr).some(function (a) { return new RegExp('\\b' + a + '\\b').test(t); }); });
    return g || 'school';
  }
  function askAnswer(q, scope) {
    var t = ' ' + q.toLowerCase() + ' ';
    var v = AD.leadershipVerdict();
    var sc = askScopeData(scope);
    if (sc.tag && v.hasOutcomes) {   // re-read the headline numbers for the chosen scope
      v.n = sc.students.length;
      v.pctSecure = AD.pooledSecurePct(sc.students, v.point.key);
      v.deltaSecure = AD.completedPoints.length >= 2 ? v.pctSecure - AD.pooledSecurePct(sc.students, AD.completedPoints[0].key) : null;
      var mv = AD.overallBandMovement(sc.students);
      v.childrenUp = mv.up; v.childrenN = mv.n; v.movementAvail = mv.avail;
    }
    var RESET = { reset: true };
    var kidKeys = function (list) { return list.map(function (s) { return 'kid:' + s.adm; }); };
    // Children in scope whose rating in one skill sits in `band` at the latest point.
    var inBand = function (key, band) {
      return sc.students.filter(function (s) { var sk = s.skills.find(function (x) { return x.key === key; }); return sk && AD.bandOf(sk[v.point.scoreField]) === band; });
    };
    if (/board|committee|report|pdf|newsletter|share|present|draft|paragraph/.test(t)) {
      return { dl: RESET, html: 'Here’s a paragraph you can paste or adapt:<blockquote class="ask-quote">' + esc(boardParagraph(v)) + '</blockquote>' +
        (v.hasOutcomes ? srcTag('Overview', v.point, v.n) : '') + 'The <b>Reports</b> screen has the one-page PDF and a parent newsletter version. ' + askLink('reports', 'Go to Reports') };
    }
    if (/finish|complet|window|still to|behind on|who still|assessed|happening|running/.test(t)) {
      if (!AD.openPoint) {
        var nx = nextPoint();
        if (!nx) return { dl: RESET, html: 'No window is open — all three assessment points are complete for this year.' };
        var r = AD.pointRange(nx);
        return { dl: RESET, html: 'No assessment window is open right now. Next is <b>' + esc(nx.label) + '</b>' + (r ? ' (' + esc(r) + ')' : ' — dates not scheduled yet') + '.' };
      }
      var rows = AD.windowProgress().filter(sc.match).sort(function (a, b) { return (a.completion.done / (a.completion.total || 1)) - (b.completion.done / (b.completion.total || 1)); });
      var open = rows.filter(function (a) { return a.completion.done < a.completion.total; });
      var done = rows.reduce(function (a, x) { return a + x.completion.done; }, 0), total = rows.reduce(function (a, x) { return a + x.completion.total; }, 0);
      var left = AD.daysLeft(AD.openPoint);
      var s1 = '<b>' + done + ' of ' + total + '</b> students are assessed for ' + esc(AD.openPoint.label) + (left != null ? ' (' + countNoun(left, 'day', 'days') + ' left)' : '') + '. ';
      s1 += open.length ? open.length + ' of ' + rows.length + ' sections are still finishing — furthest behind is <b>' + esc(sLbl(open[0])) + '</b> at ' + open[0].completion.done + ' of ' + open[0].completion.total + '.' : 'Every section is complete.';
      var waiting = sc.students.filter(function (s) { return AD.checkinStatus(s) !== 'done'; });
      return { dl: { hl: kidKeys(waiting), note: waiting.length ? 'Lit up: children not assessed yet' : '' },
        html: s1 + srcTag('Overview · window progress' + sc.tag, AD.openPoint, total) + askLink('overview', 'Open the Overview') };
    }
    if (/next assessment|next window|when is|when does|schedule|dates?/.test(t)) {
      var np = nextPoint();
      if (!np) return { dl: RESET, html: 'All three assessment points are complete for this year.' };
      var nr = AD.pointRange(np);
      return { dl: RESET, html: (np.status === 'open' ? 'The <b>' + esc(np.label) + '</b> window is open now' : 'Next is <b>' + esc(np.label) + '</b>') + (nr ? ' — ' + esc(nr) + '.' : '. Dates haven’t been scheduled yet; the Tilli team sets them.') };
    }
    // One named skill ("how is empathy?") — its band split for the scope.
    var namedSkill = AD.skills.find(function (sk) {
      // "Focus (Distraction)" is matched by its aliases only — "where should we focus?" is not a skill question.
      var names = (/\(/.test(sk.name) ? [] : [sk.name, sk.key.replace(/_/g, ' ')]).concat(ASK_SKILL_ALIASES[sk.key] || []);
      return names.some(function (a) { return t.indexOf(a.toLowerCase()) >= 0; });
    });
    if (namedSkill && v.hasOutcomes && !/board|committee/.test(t)) {
      var sp = inBand(namedSkill.key, 'emerging'), bl = inBand(namedSkill.key, 'secure'), sn = sc.students.length || 1;
      return { dl: {},
        html: 'In <b>' + esc(namedSkill.name) + '</b>, <b>' + Math.round(bl.length / sn * 100) + '%</b> of children are Blooming and ' + Math.round(sp.length / sn * 100) + '% are Sprouting' + (sc.tag ? ' in ' + esc(sc.label) : '') + ' at ' + esc(v.point.label) + '. ' +
          esc(AD.helpStep(namedSkill.key)) + srcTag('Outcomes' + sc.tag, v.point, v.n) + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/work|secure|outcome|result|improv|progress|effect|how (is|are|’s|'s) [^?]*(doing|going)/.test(t)) {
      if (!v.hasOutcomes) return { dl: RESET, html: 'Nothing is measured yet — the ' + esc(v.openPoint ? v.openPoint.label : 'Baseline') + ' window is still collecting. Skill outcomes appear once it closes.' };
      var s = '<b>' + v.pctSecure + '%</b> of skill ratings are Blooming at ' + esc(v.point.label) + (sc.tag ? ' in ' + esc(sc.label) : '') + '.';
      if (v.deltaSecure != null) { s += ' That is ' + (v.deltaSecure >= 0 ? 'up ' : 'down ') + Math.abs(v.deltaSecure) + ' points since Baseline'; if (v.movementAvail) s += ', and ' + v.childrenUp + ' of ' + countNoun(v.childrenN, 'child', 'children') + ' moved up a band'; s += '.'; }
      else s += ' This is your starting point — movement appears after the next assessment.';
      if (v.targetSecure != null) { var gap = v.targetSecure - v.pctSecure; s += ' Your target is ' + v.targetSecure + '% (' + (gap <= 0 ? 'met' : gap + (gap === 1 ? ' point to go' : ' points to go')) + ').'; }
      var up = [];
      if (AD.completedPoints.length >= 2) {
        var bi = { emerging: 0, developing: 1, secure: 2 }, f0 = AD.completedPoints[0].scoreField;
        up = sc.students.filter(function (st) { return bi[AD.bandOf(AD.meanScore(st, v.point.scoreField))] > bi[AD.bandOf(AD.meanScore(st, f0))]; });
      }
      return { dl: { hl: up.length ? kidKeys(up) : null, note: up.length ? 'Lit up: children who moved up a band since ' + AD.completedPoints[0].label : '' },
        html: s + srcTag('Outcomes' + sc.tag, v.point, v.n) + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/weak|lowest|struggl|focus|behind|room to grow|which skill/.test(t)) {
      if (!v.hasOutcomes) return { dl: RESET, html: 'Skill areas appear once the first assessment window closes.' };
      var gg = AD.growthStrength(sc.students, v.point.key, 3);
      return { dl: {},
        html: 'Where to help next (lowest % Blooming): ' + gg.growth.map(function (x) { return '<b>' + esc(x.name) + '</b> (' + x.secure + '%)'; }).join(', ') + '. These grow best with short, frequent practice — a few minutes most days.' + srcTag('Outcomes' + sc.tag, v.point, v.n) + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/strong|strength|best|highest|good at|doing well/.test(t)) {
      if (!v.hasOutcomes) return { dl: RESET, html: 'Skill areas appear once the first assessment window closes.' };
      var gs = AD.growthStrength(sc.students, v.point.key, 3);
      return { dl: {},
        html: 'What’s going well: ' + gs.strength.map(function (x) { return '<b>' + esc(x.name) + '</b> (' + x.secure + '% Blooming)'; }).join(', ') + '.' + srcTag('Outcomes' + sc.tag, v.point, v.n) + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/concern|flag|risk|worried|counsel|wellbeing|well-being/.test(t)) {
      var c = AD.concernCounts();
      return { dl: RESET, html: 'There ' + (c.New === 1 ? 'is ' : 'are ') + '<b>' + c.New + '</b> new concern' + (c.New === 1 ? '' : 's') + ' waiting to be routed, ' + c.Routed + ' with the counsellor, and ' + c.Closed + ' closed. ' +
        'Open the concern queue to see the children’s names and route them.' };
    }
    if (/target|goal|benchmark|on track/.test(t)) {
      if (v.targetSecure == null) return { dl: {}, html: 'Your school hasn\'t set targets. For now, compare against Baseline — movement since Baseline is on Outcomes. ' + askLink('outcomes', 'See Outcomes', v.point ? { point: v.point.key } : {}) };
      if (!v.hasOutcomes) return { dl: RESET, html: 'Targets compare against measured outcomes, which appear once the first window closes.' };
      var gap2 = v.targetSecure - v.pctSecure;
      return { dl: {}, html: 'Your Blooming target is <b>' + v.targetSecure + '%</b> across all skills. You are at ' + v.pctSecure + '% — ' + (gap2 <= 0 ? 'target met.' : gap2 + ' points to go.') + ' ' + askLink('outcomes', 'See Outcomes', { point: v.point.key }) };
    }
    if (/how many|student count|roster|enrol|class list/.test(t)) {
      var tw = AD.teachers.filter(function (x) { return AD.sections.some(function (sd) { return sd.teacherId === x.id; }); }).length;
      return { dl: RESET, html: 'Your school has <b>' + AD.students.length + '</b> students across <b>' + AD.sections.length + '</b> sections, taught by <b>' + tw + '</b> teachers. ' + (isCoordinator ? askLink('roster', 'Open Roster') : '') };
    }
    if (/band|emerging|developing|sprouting|blooming|what does|how do i read|meaning|explain|help/.test(t)) {
      return { dl: RESET, html: 'Skills are grouped into three developmental bands: <b>Sprouting</b> (needs adult prompts), <b>Growing</b> (used with reminders), and <b>Blooming</b> (steady and independent). Leadership only ever sees group distributions — never an individual child\'s score.' };
    }
    return { html: 'I can help with whether it’s working, focus areas, the current assessment window, and a board-ready paragraph. Try one of these:', sugs: true };
  }
  function askMsgHTML(m) {
    if (m.role === 'me') return '<div class="ask-msg user">' + esc(m.text) + '</div>';
    var s = '<div class="ask-msg tilli">' + m.html + '</div>';
    if (m.sugs) s += '<div class="ask-sugs">' + askSugs().map(function (x) { return '<button class="ui-filterchip" data-asksug="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>';
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
    var a = askAnswer(text, 'school');
    askState.messages.push({ role: 'tilli', html: a.html, sugs: !!a.sugs });
    askRefresh();
  }
  function askFootHTML(idBase) {
    return '<div class="ask-foot"><div class="ask-compose"><input class="ask-input" id="' + idBase + '-input" placeholder="Ask about your data…" aria-label="Ask Tilli"><button class="ask-sendbtn" id="' + idBase + '-send" aria-label="Send">' + ICONS.send + '</button></div></div>';
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
      '<div class="ask-head"><span class="ui-icontile">' + ICONS.asktilli + '</span>' +
      '<div class="ask-hmeta"><div class="t">Ask Tilli<span class="ui-tag cyan">Beta</span></div><div class="s">Answers from your school\'s data</div></div>' +
      '<button class="btn-icon bare" data-askclose="1" aria-label="Close Ask Tilli">×</button></div>' +
      '<div class="ask-body" id="ask-panel-body"></div>' + askFootHTML('ask-panel');
    document.body.appendChild(p);
    askState.open = true; syncFab();
    var body = document.getElementById('ask-panel-body'); body.innerHTML = askThreadHTML(); body.scrollTop = body.scrollHeight; askWireBody(body);
    p.querySelector('[data-askclose]').addEventListener('click', askClosePanel);
    askWireFoot('ask-panel');
    var inp = document.getElementById('ask-panel-input'); if (inp) inp.focus();
  }
  function askClosePanel() { var p = document.getElementById('ask-panel'); if (p) p.remove(); askState.open = false; syncFab(); }

  // ---------- Ask Tilli full screen — same layout as the teacher view ----------
  // Chat history (this week / earlier), an "Answering about" scope picker,
  // minimise-to-panel + export, the empty state with suggestions, and the
  // composer with the research note. Chats persist per person in this browser.
  var ASKX_KEY = 'tilliMeasures.adminChats.' + String(email || '').toLowerCase();
  var askx = { chatId: null, scope: 'school', thinking: false, histCollapsed: false, histOpen: false, exportConfirm: false };
  var chats = (function () { try { var v = JSON.parse(localStorage.getItem(ASKX_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } })();
  function saveAskx() { try { localStorage.setItem(ASKX_KEY, JSON.stringify(chats)); } catch (e) { /* private mode — history won't persist */ } }
  function curChat() { return chats.find(function (c) { return c.id === askx.chatId; }) || null; }
  var lu = function (d, size) { return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var SPARK = '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>';
  var LU = {
    sparkLg: lu(SPARK, 40),
    min: lu('<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>', 18),
    share: lu('<path d="M12 3v12M17 8l-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', 18),
    msg: lu('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 17),
    trash: lu('<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>', 17),
    pin: lu('<path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>', 14),
    send: lu('<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.63l-19 6.5a.5.5 0 0 0-.02.93l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>', 20),
    plus: lu('<path d="M5 12h14M12 5v14"/>', 18),
    panel: lu('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>', 18),
    collapse: lu('<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>', 18),
  };
  function askxSend(text) {
    text = String(text || '').trim(); if (!text || askx.thinking) return;
    var c = curChat();
    if (!c) { c = { id: 'c' + Date.now().toString(36), title: text.length > 60 ? text.slice(0, 59) + '…' : text, at: Date.now(), scope: askx.scope, thread: [] }; chats.unshift(c); askx.chatId = c.id; }
    c.thread.push({ role: 'me', text: text }); c.at = Date.now(); saveAskx();
    askx.thinking = true; render();
    setTimeout(function () {
      var a = askAnswer(text, c.scope || 'school');
      c.thread.push({ role: 'tilli', html: a.html }); c.at = Date.now(); saveAskx();
      askx.thinking = false;
      if (currentRoute().screen === 'asktilli') render();
    }, 700);
  }
  function askxExport() {
    var c = curChat(); if (!c || !c.thread.length) return;
    var strip = function (h) { var d = document.createElement('div'); d.innerHTML = h; d.querySelectorAll('button').forEach(function (b) { b.remove(); }); return d.textContent.trim(); };
    var lines = ['Ask Tilli — ' + c.title, 'Answering about: ' + askScopeData(c.scope).label, 'Exported: ' + new Date().toLocaleString(), ''];
    c.thread.forEach(function (m) { lines.push((m.role === 'me' ? 'You' : 'Tilli') + ':', m.role === 'me' ? m.text : strip(m.html), ''); });
    var url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    var link = document.createElement('a'); link.href = url; link.download = 'ask-tilli-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  SCREEN.asktilli = function (params, body) {
    var c = curChat(), weekAgo = Date.now() - 7 * 864e5;
    var item = function (x) {
      return '<div class="askx-item' + (x.id === askx.chatId ? ' on' : '') + '">' +
        '<button class="askx-open focus" data-askx-open="' + esc(x.id) + '" title="' + esc(x.title) + '">' + LU.msg + '<span>' + esc(x.title) + '</span></button>' +
        '<button class="askx-del focus" data-askx-del="' + esc(x.id) + '" aria-label="Delete chat: ' + esc(x.title) + '" title="Delete chat">' + LU.trash + '</button></div>';
    };
    var group = function (h, list) { return list.length ? '<div class="askx-gh">' + h + '</div>' + list.map(item).join('') : ''; };
    var recent = chats.filter(function (x) { return x.at >= weekAgo; }), older = chats.filter(function (x) { return x.at < weekAgo; });
    var scopeOpts = [['school', 'Whole school']].concat(AD.grades.map(function (g) { return [g, gLbl(g)]; })).concat(AD.sections.map(function (x) { return [x.id, sLbl(x)]; }))
      .map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === askx.scope ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
    var firstName = (me && me.name ? String(me.name).replace(/^[A-Z]\.\s*/, '').split(' ')[0] : '') || '';
    var thread = c ? c.thread : [];
    var bodyHTML = (thread.length || askx.thinking)
      ? '<div class="askx-thread">' + thread.map(function (m) { return m.role === 'me' ? '<div class="ask-msg user">' + esc(m.text) + '</div>' : '<div class="ask-msg tilli">' + m.html + '</div>'; }).join('') +
          (askx.thinking ? '<div class="ask-msg tilli ask-typing"><span></span><span></span><span></span></div>' : '') + '</div>'
      : '<div class="askx-empty"><span class="askx-spark">' + LU.sparkLg + '</span>' +
          '<h2>Hi' + (firstName ? ' ' + esc(firstName) : '') + '! I' + "'" + 'm Tilli 👋</h2>' +
          '<p>I can help you see how your school is doing, where to help next, and what to share with your board.</p>' +
          '<div class="askx-try"><div class="askx-try-h">Try asking:</div>' +
            askSugs().map(function (q) { return '<button class="askx-sug focus" data-askx-try="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') +
          '</div></div>';
    var exportPop = askx.exportConfirm && c ? '<div class="askx-pop" role="dialog" aria-label="Export chat"><p>This will download the whole chat <b>“' + esc(c.title) + '”</b> as a text file.</p>' +
      '<div class="askx-pop-act"><button class="btn btn-ghost btn-sm focus" data-askx-export-cancel>Cancel</button><button class="btn btn-primary btn-sm focus" data-askx-export-go>Download</button></div></div>' : '';
    body.innerHTML = '<div class="askx' + (askx.histOpen ? ' hist-open' : '') + (askx.histCollapsed ? ' collapsed' : '') + '">' +
      '<aside class="askx-hist" aria-label="Chat history">' +
        '<div class="askx-hist-top"><button class="btn btn-primary block askx-new focus" data-askx-new>' + LU.plus + ' New Chat</button>' +
          '<button class="askx-tool askx-collapse focus" data-askx-collapse aria-label="Hide chat history" title="Hide chat history">' + LU.collapse + '</button></div>' +
        '<div class="askx-list">' + (chats.length ? group('This week', recent) + group('Earlier', older) : '<div class="askx-none">No chats yet — ask your first question.</div>') + '</div>' +
        (chats.length ? '<button class="askx-clear focus" data-askx-clear>' + LU.trash + ' Clear all history</button>' : '') +
      '</aside>' +
      '<button class="askx-scrim" data-askx-hist aria-label="Close chat history"></button>' +
      '<section class="askx-main">' +
        '<div class="askx-scope">' +
          '<button class="askx-tool askx-histbtn focus" data-askx-hist aria-label="Show chat history" title="Show chat history">' + LU.panel + '</button>' +
          '<label class="askx-scope-l" for="askx-scope-sel" title="Answering about">' + LU.pin + '<span>Answering about</span></label>' +
          '<select id="askx-scope-sel" class="askx-select focus" data-askx-scope title="Tilli\u2019s answers only use data from what you pick here">' + scopeOpts + '</select>' +
          '<div class="askx-tools">' +
            '<button class="askx-tool focus" data-askx-min title="Minimise to side panel" aria-label="Minimise to side panel">' + LU.min + '</button>' +
            '<div class="askx-export-wrap"><button class="askx-tool focus" data-askx-export title="Export this chat" aria-label="Export this chat"' + (thread.length ? '' : ' disabled') + '>' + LU.share + '</button>' + exportPop + '</div>' +
          '</div></div>' +
        '<div class="askx-body">' + bodyHTML + '</div>' +
        '<div class="askx-foot"><form class="askx-compose" data-askx-form>' +
          '<input class="askx-input" placeholder="Ask about your school…" autocomplete="off" aria-label="Message Ask Tilli">' +
          '<button class="askx-send" type="submit" aria-label="Send"' + (askx.thinking ? ' disabled' : '') + '>' + LU.send + '</button></form>' +
          '<p class="askx-note">Questions and prompts asked from the AI tool will be analysed by our research team for improvement, safeguarding and research purposes.</p></div>' +
      '</section></div>';

    var ax = body.querySelector('.askx');
    var on = function (sel, fn, ev) { ax.querySelectorAll(sel).forEach(function (el) { el.addEventListener(ev || 'click', function (e) { fn(el, e); }); }); };
    var inp = ax.querySelector('.askx-input');
    on('[data-askx-form]', function (f, e) { e.preventDefault(); askxSend(inp.value); }, 'submit');
    on('[data-askx-try]', function (b) { askxSend(b.dataset.askxTry); });
    on('[data-askx-new]', function () { askx.chatId = null; askx.histOpen = false; render(); });
    on('[data-askx-open]', function (b) { askx.chatId = b.dataset.askxOpen; var cc = curChat(); if (cc) askx.scope = cc.scope || 'school'; askx.histOpen = false; render(); });
    on('[data-askx-del]', function (b) { chats = chats.filter(function (x) { return x.id !== b.dataset.askxDel; }); if (askx.chatId === b.dataset.askxDel) askx.chatId = null; saveAskx(); render(); });
    on('[data-askx-clear]', function () { if (!confirm('Delete all your Ask Tilli chats? This can\u2019t be undone.')) return; chats = []; askx.chatId = null; saveAskx(); render(); });
    on('[data-askx-scope]', function (sel) { askx.scope = sel.value; var cc = curChat(); if (cc) { cc.scope = sel.value; saveAskx(); } render(); }, 'change');
    on('[data-askx-min]', function () { go('overview', {}); askOpenPanel(); });
    on('[data-askx-export]', function () { askx.exportConfirm = !askx.exportConfirm; render(); });
    on('[data-askx-export-cancel]', function () { askx.exportConfirm = false; render(); });
    on('[data-askx-export-go]', function () { askx.exportConfirm = false; askxExport(); render(); });
    on('[data-askx-hist]', function () { if (window.matchMedia('(max-width: 760px)').matches) askx.histOpen = !askx.histOpen; else askx.histCollapsed = false; render(); });
    on('[data-askx-collapse]', function () { if (window.matchMedia('(max-width: 760px)').matches) askx.histOpen = false; else askx.histCollapsed = true; render(); });
    on('[data-asktgo], [data-askgo]', function (b) { var p = b.dataset.askparams ? JSON.parse(b.dataset.askparams) : {}; go(b.dataset.askgo, p); });
    var bd = ax.querySelector('.askx-body'); bd.scrollTop = bd.scrollHeight;
    if (!askx.thinking) inp.focus();
  };

  // Floating Ask Tilli bubble (shared stack, assets/float-help.js) — hidden while
  // the panel is open or the user is already on the Ask Tilli screen.
  function buildFab() {
    // On the Overview the bubble opens the chat beside the dandelion; everywhere else, the pop-up.
    var ask = function () { if (currentRoute().screen === 'overview') { askClosePanel(); dlAskOpen(); } else askOpenPanel(); };
    if (window.TilliFloat) TilliFloat.mount({ role: 'School admin', ask: ask, askSub: 'Quick answers about your school\u2019s data' });
    syncFab();
  }
  function syncFab() {
    var scr = currentRoute().screen;
    // Overview has its own Ask Tilli button beside the points, so the floating bubble steps aside there.
    if (window.TilliFloat) TilliFloat.hideAsk(askState.open || scr === 'asktilli' || scr === 'overview');
  }

  // ========================================================
  //  MODALS + FLOWS
  // ========================================================
  function openModal(html, opts) {
    closeModal();
    var ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'ad-overlay';
    ov.innerHTML = '<div class="ui-modal-card ' + (opts && opts.wide ? 'xwide' : 'wide') + '" role="dialog" aria-modal="true"><button class="dialog-close focus" data-mclose="1" aria-label="Close">×</button>' + html + '</div>';
    modalRoot.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
    ov.querySelectorAll('[data-mclose]').forEach(function (b) { b.addEventListener('click', closeModal); });
    document.addEventListener('keydown', escClose);
    return ov;
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal() { closeStudentPopup(); var ov = document.getElementById('ad-overlay'); if (ov) ov.remove(); document.removeEventListener('keydown', escClose); }
  function modalHead(title) { return '<div class="ui-modal-h"><h3>' + esc(title) + '</h3></div>'; }

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
      return '<div class="ui-card sm ad-concern"><div class="top"><div><div class="who">' + esc(c.student) + '</div><div class="ui-meta meta">' + esc(c.section) + ' · ' + esc(c.teacher) + ' · ' + esc(c.date) + '</div></div><span class="ui-chip ' + ({ new: 'info', routed: 'warn', closed: 'muted' }[st] || '') + '">' + esc(c.status) + (c.routed_to ? ' → ' + esc(c.routed_to) : '') + '</span></div>' +
        '<p class="note">' + esc(c.note) + '</p>' +
        (c.outcome ? '<div class="ui-inset outcome"><b>Outcome:</b> ' + esc(c.outcome) + '</div>' : '') +
        (c.status === 'New' ? '<div class="actions"><button class="btn btn-cyan btn-sm" data-route="' + c.id + '">Route to counsellor</button><button class="btn btn-outline btn-sm" data-handle="' + c.id + '">Handle internally</button></div>' :
         c.status === 'Routed' ? '<div class="actions"><button class="btn btn-outline btn-sm" data-close="' + c.id + '">Close with outcome</button></div>' : '') +
        '</div>';
    }).join('') || stEmpty('No concerns in this view.', 'Nothing to route right now.', true);

    openModal(modalHead('Concern queue') +
      '<p class="ui-mod-note mb-3">A routing queue, never an alarm. Names are visible to you as coordinator.</p>' +
      '<div class="row wrap mb-4" style="gap:8px">' + chips + '</div>' + body, { wide: true });

    modalRoot.querySelectorAll('[data-cfilter]').forEach(function (b) { b.addEventListener('click', function () { openConcernQueue(b.dataset.cfilter); }); });
    modalRoot.querySelectorAll('[data-route]').forEach(function (b) { b.addEventListener('click', function () { routeConcern(b.dataset.route, 'Counsellor'); }); });
    modalRoot.querySelectorAll('[data-handle]').forEach(function (b) { b.addEventListener('click', function () { routeConcern(b.dataset.handle, 'Handled internally'); }); });
    modalRoot.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeConcern(b.dataset.close); }); });
  }
  function routeConcern(id, to) {
    var c = AD.concerns.find(function (x) { return x.id === id; }); if (!c) return;
    openModal(modalHead('Route: ' + c.student) +
      '<p class="ui-mod-note mb-3">Routing to <b>' + esc(to) + '</b> requires a note.</p>' +
      '<textarea class="ad-copyblock sm" id="route-note" placeholder="Add a short note for whoever picks this up…"></textarea>' +
      '<div class="ui-modal-foot"><button class="btn btn-outline btn-sm" data-back="1">Back</button><button class="btn btn-primary btn-sm" id="route-go">Confirm routing</button></div>');
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
      '<p class="ui-mod-note mb-3">Closed concerns stay in the queue, filterable.</p>' +
      '<textarea class="ad-copyblock sm" id="close-note" placeholder="Outcome note…"></textarea>' +
      '<div class="ui-modal-foot"><button class="btn btn-outline btn-sm" data-back="1">Back</button><button class="btn btn-primary btn-sm" id="close-go">Close concern</button></div>');
    modalRoot.querySelector('[data-back]').addEventListener('click', function () { openConcernQueue(); });
    document.getElementById('close-go').addEventListener('click', function () {
      var v = document.getElementById('close-note').value.trim(); if (!v) { toast('Add an outcome note to close.'); return; }
      c.status = 'Closed'; c.outcome = v; toast('Concern closed.'); openConcernQueue();
    });
  }

  // ---- User invite ----
  // ---- Invite teachers (single + bulk text/CSV) ----------------------------
  // Coordinators add teachers one at a time or in bulk by pasting rows / uploading
  // a CSV. Each row is grade, section, teacher name, email (+ board when the school
  // runs several). Sending mints a real TilliAPI invite per row, and the receipt
  // shows the date + one-time temporary password to relay. Rows stay Invited until
  // the teacher sets their own password, at which point the roster reads Active.
  var inv;   // { step:'form'|'result', rows:[...], results:[...] }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function fmtInvDate(ms) { if (!ms) return '—'; try { return new Date(ms).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return '—'; } }
  function blankInvRow() { return { grade: '', section: '', name: '', email: '', board: '' }; }

  function inviteUser() {
    inv = { step: 'form', rows: [blankInvRow(), blankInvRow(), blankInvRow()], results: [] };
    renderInvite();
  }

  function inviteInputCell(val, key, i, ph) {
    return '<td style="padding:3px 5px"><input class="input sm" data-invk="' + key + '" data-invi="' + i + '" value="' + esc(val || '') + '" placeholder="' + esc(ph) + '"' +
      (key === 'grade' ? ' list="inv-grades"' : key === 'section' ? ' list="inv-secs"' : key === 'email' ? ' type="email"' : '') +
      '></td>';
  }
  function inviteRowHTML(r, i, boards) {
    var boardCell = '';
    if (boards.length > 1) {
      boardCell = '<td style="padding:3px 5px"><label class="select-wrap"><select class="select sm" data-invk="board" data-invi="' + i + '">' +
        '<option value="">Board…</option>' + boards.map(function (b) { return '<option value="' + esc(b) + '"' + (r.board === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') +
        '</select></label></td>';
    }
    return '<tr>' + inviteInputCell(r.grade, 'grade', i, 'e.g. Grade 1') + inviteInputCell(r.section, 'section', i, 'A') +
      inviteInputCell(r.name, 'name', i, 'Full name') + inviteInputCell(r.email, 'email', i, 'name@school.edu') + boardCell +
      '<td style="padding:3px 2px;text-align:center"><button type="button" class="btn-link text-muted" data-invrm="' + i + '" title="Remove row" style="font-size:var(--fs-md)">×</button></td></tr>';
  }

  function collectInviteRows() {
    document.querySelectorAll('[data-invk]').forEach(function (el) {
      var r = inv.rows[+el.dataset.invi]; if (r) r[el.dataset.invk] = el.value.trim();
    });
  }

  // Parse pasted/CSV text → rows. Columns are positional:
  // grade, section, name, email[, board]. A header line is detected and skipped.
  function parseInvitePaste(text) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (line, idx) {
      if (!line.trim()) return;
      var cols = line.split(/\t|,/).map(function (c) { return c.trim(); });
      var joined = line.toLowerCase();
      if (idx === 0 && /email/.test(joined) && /(grade|name|section)/.test(joined)) return;  // header
      if (!cols.some(function (c) { return c; })) return;
      out.push({ grade: cols[0] || '', section: cols[1] || '', name: cols[2] || '', email: cols[3] || '', board: cols[4] || '' });
    });
    return out;
  }

  function renderInvite() {
    var boards = schoolBoards();
    if (inv.step === 'result') return renderInviteResult(boards);

    var gradeList = (AD.grades || []);
    var secList = []; (AD.sections || []).forEach(function (s) { if (secList.indexOf(s.section) < 0) secList.push(s.section); });
    function th(t) { return '<th>' + t + '</th>'; }
    var boardHead = boards.length > 1 ? th('Board') : '';

    var boardNote = boards.length === 1
      ? '<div class="ui-note mb-3"><span aria-hidden="true">🏷️</span><span>All invites use this school\'s board <b>' + esc(boards[0]) + '</b>.</span></div>'
      : boards.length > 1
        ? '<div class="ui-note mb-3"><span aria-hidden="true">🏷️</span><span>This school runs multiple boards — pick each teacher\'s board.</span></div>' : '';

    openModal(modalHead('Invite teachers') +
      '<p class="ui-mod-note mb-3">Add teachers one row at a time, or paste rows / upload a CSV. Each becomes an invite with a one-time temporary password.</p>' +
      boardNote +
      '<datalist id="inv-grades">' + gradeList.map(function (g) { return '<option value="' + esc(g) + '" label="' + esc(gLbl(g)) + '">'; }).join('') + '</datalist>' +
      '<datalist id="inv-secs">' + secList.map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>' +
      '<div class="ui-tablewrap"><table class="ui-table compact mw-520"><thead><tr>' +
        th('Grade') + th('Section') + th('Teacher name') + th('Email') + boardHead + '<th></th>' +
      '</tr></thead><tbody id="inv-rows">' + inv.rows.map(function (r, i) { return inviteRowHTML(r, i, boards); }).join('') + '</tbody></table></div>' +
      '<button type="button" class="btn btn-outline btn-sm mt-3" id="inv-addrow">+ Add teacher</button>' +
      // Bulk paste / CSV
      '<details class="mt-4"><summary style="cursor:pointer;font-weight:700;font-size:var(--fs-sm);color:var(--accent-ink)">Paste rows or upload a CSV</summary>' +
        '<p class="ui-mod-note" style="margin:8px 0">One teacher per line — <b>grade, section, name, email' + (boards.length > 1 ? ', board' : '') + '</b> (comma or tab separated). A header row is ignored.</p>' +
        '<textarea class="input sm mono" id="inv-paste" rows="4" placeholder="Grade 1, A, Priya Sharma, priya@school.edu' + (boards.length > 1 ? ', CBSE' : '') + '"></textarea>' +
        '<div class="row wrap mt-2">' +
          '<button type="button" class="btn btn-outline btn-sm" id="inv-loadpaste">Load into table</button>' +
          '<label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0">Upload CSV<input type="file" id="inv-file" accept=".csv,text/csv,text/plain" hidden></label>' +
          '<span class="ui-mod-note" id="inv-parsehint"></span>' +
        '</div></details>' +
      '<div class="ui-modal-foot row">' +
        '<span class="ui-mod-note" id="inv-count" style="margin-right:auto"></span>' +
        '<button class="btn btn-outline btn-sm" data-mclose="1">Cancel</button>' +
        '<button class="btn btn-primary btn-sm" id="inv-send">Send invites</button></div>',
      { wide: true });

    // live-collect on typing so state survives add/remove/import
    document.getElementById('inv-rows').addEventListener('input', function (e) {
      var el = e.target; if (el.dataset && el.dataset.invk) { var r = inv.rows[+el.dataset.invi]; if (r) r[el.dataset.invk] = el.value.trim(); }
    });
    document.querySelectorAll('[data-invrm]').forEach(function (b) {
      b.addEventListener('click', function () { collectInviteRows(); inv.rows.splice(+b.dataset.invrm, 1); if (!inv.rows.length) inv.rows.push(blankInvRow()); renderInvite(); });
    });
    document.getElementById('inv-addrow').addEventListener('click', function () { collectInviteRows(); inv.rows.push(blankInvRow()); renderInvite(); });

    function importText(text) {
      var parsed = parseInvitePaste(text);
      if (!parsed.length) { toast('No rows found to import.'); return; }
      collectInviteRows();
      // drop the empty starter rows, then append the imported ones
      inv.rows = inv.rows.filter(function (r) { return r.grade || r.section || r.name || r.email; }).concat(parsed);
      renderInvite();
      toast(parsed.length + (parsed.length === 1 ? ' row' : ' rows') + ' loaded.');
    }
    document.getElementById('inv-loadpaste').addEventListener('click', function () { importText(document.getElementById('inv-paste').value); });
    document.getElementById('inv-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { importText(rd.result); }; rd.readAsText(f);
    });
    document.getElementById('inv-send').addEventListener('click', sendInvites);
  }

  function sendInvites() {
    collectInviteRows();
    var boards = schoolBoards();
    // keep only rows with any content
    var filled = inv.rows.filter(function (r) { return r.grade || r.section || r.name || r.email; });
    if (!filled.length) { toast('Add at least one teacher.'); return; }
    // validate
    var bad = filled.filter(function (r) {
      return !r.name || !EMAIL_RE.test(r.email) || !r.grade || !r.section || (boards.length > 1 && !r.board);
    });
    if (bad.length) { toast(bad.length + (bad.length === 1 ? ' row is' : ' rows are') + ' incomplete — check name, email, grade, section' + (boards.length > 1 ? ', board' : '') + '.'); return; }
    // duplicate emails within the batch
    var seen = {}, dupe = null;
    filled.forEach(function (r) { var e = r.email.toLowerCase(); if (seen[e]) dupe = r.email; seen[e] = 1; });
    if (dupe) { toast('Duplicate email in this batch: ' + dupe); return; }
    // Don't re-invite someone who is already active — it would reset their login.
    var active = {}; seedUsers().forEach(function (u) { if (u.status === 'Active') active[String(u.email || '').toLowerCase()] = 1; });
    var already = filled.filter(function (r) { return active[r.email.toLowerCase()]; });
    if (already.length) { toast(already.length === 1 ? (already[0].email + ' is already an active user.') : (already.length + ' of these are already active users.')); return; }

    var sid = currentSchoolId();
    inv.results = filled.map(function (r) {
      var board = boards.length > 1 ? r.board : (boards[0] || '');
      var res = (window.TilliAPI && TilliAPI.createInvite) ? TilliAPI.createInvite({
        email: r.email, role: 'Teacher', school_id: sid, invitedBy: (me && me.email) || null,
        name: r.name, grade: r.grade, section: r.section, board: board,
      }) : { ok: true, email: r.email, tempPassword: '—', createdAt: Date.now() };
      return { name: r.name, email: r.email, grade: r.grade, section: r.section, board: board,
        tempPassword: res && res.ok ? res.tempPassword : 'error', createdAt: (res && res.createdAt) || Date.now(),
        ok: !!(res && res.ok) };
    });
    inv.step = 'result';
    renderInvite();
  }

  function renderInviteResult(boards) {
    // The receipt always carries board when the school's board is known.
    var multi = boards.length >= 1, rows = inv.results;
    function th(t) { return '<th>' + t + '</th>'; }
    function td(t, mono) { return '<td' + (mono ? ' class="mono" style="font-weight:700;letter-spacing:.04em"' : '') + '>' + t + '</td>'; }
    var head = '<tr>' + th('Grade') + th('Section') + th('Teacher') + th('Email') + (multi ? th('Board') : '') + th('Invited') + th('Temp password') + '</tr>';
    var bodyRows = rows.map(function (r) {
      return '<tr>' + td(esc(gLbl(r.grade))) + td(esc(secShort(r.grade, r.section))) + td(esc(r.name)) + td(esc(r.email)) +
        (multi ? td(esc(r.board || '—')) : '') + td(fmtInvDate(r.createdAt)) +
        td(r.ok ? esc(r.tempPassword) : '<span class="text-danger">failed</span>', r.ok) + '</tr>';
    }).join('');
    var okCount = rows.filter(function (r) { return r.ok; }).length;

    openModal(modalHead('Invites sent · ' + okCount) +
      '<p class="ui-mod-note mb-3">Relay each temporary password to the teacher. Each stays <b>Invited</b> until they sign in and set their own password — then the roster shows <b>Active</b>.</p>' +
      '<div class="ui-tablewrap"><table class="ui-table compact mw-640"><thead>' + head + '</thead><tbody>' + bodyRows + '</tbody></table></div>' +
      '<div class="ui-modal-foot"><button class="btn btn-outline btn-sm" id="inv-copyall">Copy all</button><button class="btn btn-primary btn-sm" id="inv-done">Done</button></div>',
      { wide: true });

    document.getElementById('inv-copyall').addEventListener('click', function () {
      var header = ['Grade', 'Section', 'Teacher', 'Email'].concat(multi ? ['Board'] : []).concat(['Invited', 'Temp password']);
      var lines = [header.join('\t')].concat(inv.results.map(function (r) {
        return [r.grade, r.section, r.name, r.email].concat(multi ? [r.board] : []).concat([fmtInvDate(r.createdAt), r.tempPassword]).join('\t');
      }));
      try { navigator.clipboard.writeText(lines.join('\n')); toast('Copied ' + inv.results.length + ' rows.'); } catch (e) { toast('Copy failed.'); }
    });
    document.getElementById('inv-done').addEventListener('click', function () { closeModal(); render(); });
  }

  // ---- Year-end: only the Tilli team starts a new year ----
  // Before Tilli has started this year: "Ask Tilli to start next year" (a request
  // on Tilli's Control Room). Once Tilli has started it — and until this year's
  // windows have all ended — the strip shows "See grade migration" instead.
  function yearState() {
    var A = window.TilliAPI, sid = currentSchoolId();
    if (!A || !A.currentYear || !sid) return null;
    var cur = A.currentYear(sid); if (!cur) return null;
    var rd = A.yearReadiness(sid), finished = rd.ended.length && !rd.live.length && !rd.scheduled.length;
    return { cur: cur, request: A.yearRequest(sid), finished: finished };
  }
  function yearEndHTML() {
    var ys = yearState(); if (!ys) return '';
    var req = ys.request && ys.request.status === 'open' ? ys.request : null;
    var strip = function (text, btn) { return '<div class="ad-yearend mt-gap"><div><b>Year-end</b><span>' + text + '</span></div>' + btn + '</div>'; };
    if (req) return strip('You asked on ' + fmtInvDate(req.at) + ' to start the next year. The Tilli team will start it and move children up — you’ll get a notice here.',
      '<button class="btn btn-outline btn-sm" disabled>Requested</button>');
    if (ys.cur.rollover && !ys.finished) return strip('Tilli started ' + esc(ys.cur.label) + ' on ' + fmtInvDate(ys.cur.startedAt) + ' and moved children up from ' + esc(ys.cur.rollover.from) + '.',
      '<button class="btn btn-outline btn-sm" data-yearsee="1">See grade migration</button>');
    return strip('When ' + esc(ys.cur.label) + ' ends, ask the Tilli team to start the next year. They move children up a grade and keep this year’s results.',
      (ys.cur.rollover ? '<button class="btn-link" data-yearsee="1">Last migration</button> ' : '') + '<button class="btn btn-outline btn-sm" data-yearask="1">Ask Tilli to start next year</button>');
  }
  function regenSchoolCode() {
    var ov = openModal(modalHead('Regenerate the school code?') +
      '<p class="mb-4">Your school gets a new code. <b>Every link and code you’ve shared stops working now</b> — for parents, teachers and student assessments. Teachers and parents already signed in aren’t affected.</p>' +
      '<div class="row" style="gap:8px;justify-content:flex-end"><button class="btn btn-outline btn-sm" data-mclose="1">Cancel</button><button class="btn btn-danger btn-sm" data-regengo>Regenerate now</button></div>');
    ov.querySelector('[data-regengo]').addEventListener('click', function () {
      var r = TilliAPI.regenerateSchoolCode(currentSchoolId(), email);
      closeModal(); toast(r.ok ? 'New school code: ' + r.code + '. Share it with your teachers again.' : 'Couldn’t change the code.'); render();
    });
  }
  function askNewYear() {
    var r = TilliAPI.requestNewYear(currentSchoolId(), email);
    toast(r.ok ? 'Request sent — the Tilli team will start the next year.' : 'Only a school admin can ask for this.');
    render();
  }
  // What the last rollover did, per base grade.
  function migrationTableHTML(ro) {
    var verb = { promote: 'Moved up to', retain: 'Stayed in', graduate: 'Graduated' };
    return '<div class="ui-tablewrap"><table class="ui-table mw-520"><thead><tr><th>From</th><th>What happened</th><th class="text-right">Students</th></tr></thead><tbody>' +
      ro.grades.map(function (g) {
        return '<tr><td class="name">' + esc(g.from) + '</td><td>' + esc(verb[g.action] || g.action) + (g.action === 'graduate' ? '' : ' ' + esc(g.to)) + '</td><td class="text-right ad-num">' + g.students + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function showYearMigration() {
    var ys = yearState(); if (!ys || !ys.cur.rollover) return;
    var ro = ys.cur.rollover;
    openModal(modalHead('Grade migration · ' + ro.from + ' → ' + ys.cur.label) +
      '<p class="ui-mod-note mb-3">Started by the Tilli team on ' + fmtInvDate(ys.cur.startedAt) + ': ' + ro.moved.promoted + ' moved up, ' + ro.moved.retained + ' stayed, ' + ro.moved.graduated + ' graduated. ' +
        esc(ro.from) + ' results stay attached to each child and their class that year.</p>' + migrationTableHTML(ro) +
      '<p class="ui-mod-note mt-3">Something wrong — a child in the wrong class? Use <b>Need help?</b> to tell the Tilli team.</p>');
  }
  // Which audiences a phase was deployed to, in words: "teacher, parent and student".
  // A child counts as done only when every one of those is finished.
  function deployedForText(phase) {
    var A = window.TilliAPI, sid = currentSchoolId(); if (!window.TILLI_CREATED || !A || !sid) return '';
    var NAME = { 'Teacher': 'teacher', 'Parent': 'parent', 'Direct Assessment': 'student' }, auds = [];
    A.getDeployments(sid).forEach(function (d) {
      if (String(d.phase) !== String(phase) || d.notRun) return;
      if ((d.assessments || []).some(function (a) { return !a.perTeacher; }) && auds.indexOf(NAME[d.audience]) < 0) auds.push(NAME[d.audience]);
    });
    auds.sort(function (a, b) { return ['teacher', 'parent', 'student'].indexOf(a) - ['teacher', 'parent', 'student'].indexOf(b); });
    return auds.length > 1 ? auds.slice(0, -1).join(', ') + ' and ' + auds[auds.length - 1] : (auds[0] || '');
  }
  // One-time note on how completion is counted (it reads lower than the old per-lane %).
  var RULE_KEY = 'tilliMeasures.completionRuleSeen';
  function completionRuleNoteHTML() {
    if (AD.pastYear || !AD.openPoint) return '';
    var who = deployedForText(AD.openPoint.label); if (!who) return '';
    try { if (localStorage.getItem(RULE_KEY + '.' + currentSchoolId() + '.' + email)) return ''; } catch (e) { /* no storage → show it */ }
    return '<div class="ui-note info mb-3 ad-yearnotice"><span aria-hidden="true">ℹ️</span><span><b>How completion is counted:</b> a child is complete once they’ve finished every assessment deployed to your school — for ' +
      esc(AD.openPoint.label) + ' that’s the ' + esc(who) + ' assessment' + (who.indexOf(' and ') >= 0 ? 's' : '') + '. Children with only some done show as in progress, so the number can read lower than per-assessment counts.</span>' +
      '<button class="dialog-close" data-ruledismiss aria-label="Dismiss">×</button></div>';
  }
  // For a week after the school code changes: the new code + the links to re-share.
  function codeChangedHTML() {
    var A = window.TilliAPI, sc = A && currentSchoolId() ? A.resolveSchool(currentSchoolId()) : null;
    if (AD.pastYear || !sc || !sc.codeChangedAt || Date.now() - sc.codeChangedAt > 7 * 86400000) return '';
    var slug = String(sc.code).toLowerCase(), base = 'https://measures.tilli.app/' + slug + '/';
    var link = function (lbl, path) { return '<span class="ad-relink"><b>' + lbl + '</b> <span class="ad-num">' + esc(base + path) + '</span> <button class="btn-link" data-relink="' + esc(base + path) + '">Copy</button></span>'; };
    return '<div class="ui-note warn mb-3"><span aria-hidden="true">🔑</span><span><b>Your school code changed on ' + fmtInvDate(sc.codeChangedAt) + ' to ' + esc(sc.code) + '.</b> Old links and the old code no longer work — re-share these:<br>' +
      link('Parents', 'parent') + link('Teachers & school admins', 'teacher') + link('Student assessments', 'direct') + '</span></div>';
  }
  // Shown on Overview once, after Tilli starts a new year.
  function yearNoticeHTML() {
    if (AD.pastYear) return '';
    var A = window.TilliAPI, n = A && A.yearNotice && currentSchoolId() ? A.yearNotice(currentSchoolId(), email) : null;
    if (!n) return '';
    return '<div class="ui-note info mb-3 ad-yearnotice"><span aria-hidden="true">🌱</span><span><b>' + esc(n.year) + ' has started.</b> The Tilli team moved children up from ' + esc(n.rollover.from) + ': ' +
      n.rollover.moved.promoted + ' moved up, ' + n.rollover.moved.retained + ' stayed, ' + n.rollover.moved.graduated + ' graduated. ' +
      '<button class="btn-link" data-yearsee="1">See grade migration</button></span><button class="dialog-close" data-yeardismiss aria-label="Dismiss">×</button></div>';
  }
  // ============================================================
  //  PREVIEW-STATE TOGGLE  (demo / dev tooling — NOT part of the
  //  shipped leadership UI). Lets you see the coordinator dashboard
  //  at every stage of a school's assessment year by flipping the
  //  lifecycle state in ADMIN_DATA, then re-rendering. Docks in the
  //  sidebar's bottom stack (re-placed after each render). Delete this block (and
  //  the LIFECYCLE_STATES layer in admin-data.js) to ship.
  // ============================================================
  // Kept as a module reference: render() rebuilds #ad-app (including the
  // sidebar slot it docks into), so the node is re-placed after every paint.
  var statePanel = null;
  var DEV_COLLAPSED_KEY = 'tilliMeasures.devPanelCollapsed';   // shared with the teacher dashboard
  function devCollapsed() { try { return localStorage.getItem(DEV_COLLAPSED_KEY) === '1'; } catch (e) { return false; } }
  function buildStatePanel() {
    if (statePanel) return;
    statePanel = document.createElement('div');
    statePanel.className = 'ui-devpanel ad-statepanel' + (devCollapsed() ? ' collapsed' : '');
    statePanel.id = 'ad-statepanel';
    statePanel.setAttribute('role', 'group'); statePanel.setAttribute('aria-label', 'Preview stage (dev only)');
    renderStatePanel();
  }
  // Docked in the sidebar's bottom stack when the sidebar shows; floating otherwise (≤860px).
  function placeStatePanel() {
    if (!statePanel) return;
    var slot = document.getElementById('ad-dev-slot');
    var docked = slot && getComputedStyle(slot.closest('.ui-side')).display !== 'none';
    statePanel.classList.toggle('float', !docked);
    (docked ? slot : document.body).appendChild(statePanel);
  }
  function renderStatePanel() {
    var wrap = statePanel; if (!wrap) return;
    var active = AD.lifecycleState;
    var collapsed = wrap.classList.contains('collapsed');
    wrap.innerHTML =
      '<button class="ui-devpanel-head" data-sptoggle="1" title="See the coordinator dashboard at each point of a school\'s year. Not shown to real users. Click to show / hide.">' +
        '<span class="ui-devpanel-title">Preview stage</span>' +
        '<span class="ui-devpanel-chev">' + (collapsed ? '▸' : '▾') + '</span>' +
      '</button>' +
      '<div class="ui-devpanel-body">' +
        AD.lifecycleStates.map(function (s) {
          return '<button class="ui-devpanel-btn' + (s.key === active ? ' on' : '') + '" data-spstate="' + esc(s.key) + '" title="' + esc(s.hint) + '">' +
            '<span class="ui-devpanel-dot"></span>' + esc(s.label) + '</button>';
        }).join('') +
      '</div>';
    wrap.querySelector('[data-sptoggle]').addEventListener('click', function () {
      wrap.classList.toggle('collapsed');
      try { localStorage.setItem(DEV_COLLAPSED_KEY, wrap.classList.contains('collapsed') ? '1' : '0'); } catch (e) {}
      renderStatePanel();
    });
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
  window.matchMedia('(max-width: 860px)').addEventListener('change', placeStatePanel);

  // ---------- boot ----------
  buildStatePanel();
  buildFab();
  if (!location.hash) go('overview', {}, { replace: true }); else render();
})();
