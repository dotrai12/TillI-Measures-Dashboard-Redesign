/* ============================================================
   Tilli Measures — School Admin (leadership) data layer
   ------------------------------------------------------------
   Builds everything the leadership dashboard renders, derived
   from the shared dummy school (window.TILLI_SCHOOL) plus a few
   admin-only streams that don't exist at the student level
   (section activity, raised concerns, targets, interpretation
   copy). Loaded as a plain <script>; exposes window.ADMIN_DATA.

   >>> 100% dummy data. A developer swaps this for real API calls.

   IMPORTANT — two data cadences share this dashboard (spec §3):
     • CONTINUOUS  → activity, completion, concerns  (live/daily)
     • PERIODIC    → skill bands & movement          (3× / year)
   They are kept in separate shapes here so a continuous metric is
   never accidentally plotted on a periodic timeline.
   ============================================================ */
(function () {
  'use strict';

  var TS = window.TILLI_SCHOOL;
  if (!TS) { console.error('[admin-data] TILLI_SCHOOL not loaded'); return; }

  // ---- deterministic RNG (same primitives as the rest of the prototype) ----
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  // ---------------------------------------------------------------
  //  Band vocabulary — the ONE site-wide scale (Sprouting / Growing /
  //  Blooming), same words and same 34 / 67 cut-offs as the teacher and
  //  parent views, so a child reads at the same level on every screen.
  //  Internal keys stay emerging/developing/secure; only labels changed.
  //  Thresholds map a 0–100 skill score onto a band.
  // ---------------------------------------------------------------
  //  Colours come from the unified skill-level scale (tilli.css --lvl-*):
  //  Sprouting = level 1, Growing = level 2, Blooming = level 3. `color`/`wash`
  //  are var() strings for style=""; `token` is the custom-property name so SVG
  //  attributes (which can't read var()) can resolve it via TilliPalette.css().
  var PAL = window.TilliPalette;
  function bandColours(n) { var l = PAL.level(n); return { lvl: n, token: '--lvl-' + n, color: l.strong, wash: l.wash, ink: l.ink }; }
  var BANDS = [
    Object.assign({ key: 'emerging',   label: 'Sprouting' },   bandColours(1)),
    Object.assign({ key: 'developing', label: 'Growing' }, bandColours(2)),
    Object.assign({ key: 'secure',     label: 'Blooming' },     bandColours(3)),
  ];
  var BAND_EMERGING_MAX = 34;   // score < 34  → Sprouting
  var BAND_DEVELOPING_MAX = 67; // 34–66       → Growing; ≥67 → Blooming
  function bandOf(pct) { return pct < BAND_EMERGING_MAX ? 'emerging' : pct < BAND_DEVELOPING_MAX ? 'developing' : 'secure'; }
  function bandMeta(key) { return BANDS.find(function (b) { return b.key === key; }); }

  // ---------------------------------------------------------------
  //  Assessment points (periodic). Named markers — never "Term 1/2/3"
  //  (spec §3). Their DATES are not hard-coded: the Tilli team sets each
  //  window's start/end in the platform planner (tilli.html), which writes
  //  them to the shared TilliAPI deployments; readPointDates() picks them
  //  up here. No dates set → labels show the point name only.
  // ---------------------------------------------------------------
  var POINTS = [
    { key: 'baseline', label: 'Baseline', scoreField: 'baseline', status: 'upcoming', start: '', end: '' },
    { key: 'midline',  label: 'Midline',  scoreField: 'mid',      status: 'upcoming', start: '', end: '' },
    { key: 'endline',  label: 'Endline',  scoreField: 'post',     status: 'upcoming', start: '', end: '' },
  ];
  var SCHOOL_ID = (window.TILLI_CREATED && window.TILLI_CREATED.schoolId) || (TS.school && TS.school.id) || null;
  function readPointDates() {
    var API = window.TilliAPI;
    if (!API || !API.getDeployments || !SCHOOL_ID) return;
    var deps = [];
    try { deps = API.getDeployments(SCHOOL_ID) || []; } catch (e) {}
    POINTS.forEach(function (p) {
      var d = deps.find(function (x) { return String(x.phase || '').toLowerCase() === p.key && (x.start || x.end); });
      p.start = d ? d.start || '' : ''; p.end = d ? d.end || '' : '';
    });
  }
  readPointDates();
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function parseISO(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function fmtDay(d, withYear) { return d.getDate() + ' ' + MON[d.getMonth()] + (withYear ? ' ' + d.getFullYear() : ''); }
  // "4 Jul – 18 Jul 2026" (or just "from 4 Jul 2026" / "" when not scheduled).
  function pointRange(pt) {
    var a = parseISO(pt && pt.start), b = parseISO(pt && pt.end);
    if (a && b) return fmtDay(a, a.getFullYear() !== b.getFullYear()) + ' – ' + fmtDay(b, true);
    if (a) return 'from ' + fmtDay(a, true);
    if (b) return 'until ' + fmtDay(b, true);
    return '';
  }
  // Whole days until the window's end date (null when no end date is set).
  function daysLeft(pt) {
    var b = parseISO(pt && pt.end); if (!b) return null;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((b - now) / 86400000));
  }

  // ---------------------------------------------------------------
  //  LIFECYCLE STATES  (preview / demo tooling — NOT shipped state).
  //  The whole dashboard's "what data exists yet" is a function of
  //  each assessment point's status. These named states let the
  //  coordinator dashboard be previewed at every stage of a school's
  //  year. The GUI toggle in admin.js flips between them (persisted in
  //  localStorage). 100% presentational — a real deployment derives
  //  these statuses from the backend, not from a dropdown.
  //
  //    status per point:  upcoming | open | complete
  // ---------------------------------------------------------------
  var LIFECYCLE_STATES = [
    { key: 'nodata',   label: 'Baseline open', hint: 'Programme just started. The Baseline window is open; nothing has been measured yet, so every outcome view is empty.',
      status: { baseline: 'open',     midline: 'upcoming', endline: 'upcoming' } },
    { key: 'baseline', label: 'Baseline done', hint: 'Baseline is complete. The first skill bands appear; movement still waits on a second point.',
      status: { baseline: 'complete', midline: 'upcoming', endline: 'upcoming' } },
    { key: 'between',  label: 'Midline open',  hint: 'The Midline window is open and collecting. Baseline results stay visible alongside a live completion count.',
      status: { baseline: 'complete', midline: 'open',     endline: 'upcoming' } },
    { key: 'midline',  label: 'Midline done',  hint: 'Baseline + Midline complete. Movement since Baseline now populates.',
      status: { baseline: 'complete', midline: 'complete', endline: 'upcoming' } },
    { key: 'endline',  label: 'Endline done',  hint: 'All three points complete. The full-year arc is filled in and no window is open.',
      status: { baseline: 'complete', midline: 'complete', endline: 'complete' } },
  ];
  var LIFECYCLE_DEFAULT = 'endline';
  function readLifecycleKey() {
    try { var k = localStorage.getItem('tilliMeasures.lifecycleState'); if (k && LIFECYCLE_STATES.some(function (s) { return s.key === k; })) return k; } catch (e) {}
    return LIFECYCLE_DEFAULT;
  }

  // Recomputed whenever the lifecycle state changes.
  var COMPLETED_POINTS, LATEST_COMPLETE, OPEN_POINT, ACTIVE_LIFECYCLE;
  function applyLifecycle(key) {
    var st = LIFECYCLE_STATES.find(function (s) { return s.key === key; }) ||
             LIFECYCLE_STATES.find(function (s) { return s.key === LIFECYCLE_DEFAULT; });
    ACTIVE_LIFECYCLE = st.key;
    POINTS.forEach(function (p) { p.status = st.status[p.key] || 'upcoming'; });
    // Created schools: the REAL assessment lifecycle (deployments + completion,
    // via TilliAPI) overrides the demo lifecycle dropdown. Re-pinned on every
    // applyLifecycle call so flipping the dev dropdown can't desync a real school.
    if (window.TILLI_CREATED && window.TILLI_CREATED.pointStatus) {
      var ps = window.TILLI_CREATED.pointStatus;
      POINTS.forEach(function (p) { p.status = ps[p.key] || 'upcoming'; });
    }
    COMPLETED_POINTS = POINTS.filter(function (p) { return p.status === 'complete'; });
    LATEST_COMPLETE = COMPLETED_POINTS[COMPLETED_POINTS.length - 1] || null;
    OPEN_POINT = POINTS.find(function (p) { return p.status === 'open'; }) || null;
  }
  applyLifecycle(readLifecycleKey());

  var SKILLS = TS.skills;                 // shared source of truth (12 skills)
  var SECTIONS = TS.sections.slice();     // 30 sections (6 grades × 5)
  var STUDENTS = TS.students;             // 900 students (30 per section) w/ per-skill baseline/mid/post
  var TEACHERS = TS.teachers;
  var GRADES = SECTIONS.reduce(function (acc, s) { if (acc.indexOf(s.grade) < 0) acc.push(s.grade); return acc; }, []);

  function teacherFor(sectionDef) { var t = TEACHERS.find(function (x) { return x.id === sectionDef.teacherId; }); return t ? t.name : '—'; }
  function studentsInSection(secDef) { return STUDENTS.filter(function (s) { return s.grade === secDef.grade && s.section === secDef.section; }); }
  function studentsInGrade(grade) { return STUDENTS.filter(function (s) { return s.grade === grade; }); }

  // ---------------------------------------------------------------
  //  PERIODIC: band distribution for a set of students, one skill,
  //  one assessment point. Returns counts + percentages per band.
  // ---------------------------------------------------------------
  function distribution(students, skillKey, pointKey) {
    var pt = POINTS.find(function (p) { return p.key === pointKey; });
    var field = pt ? pt.scoreField : 'post';
    var counts = { emerging: 0, developing: 0, secure: 0 };
    students.forEach(function (st) {
      var sk = st.skills.find(function (x) { return x.key === skillKey; });
      if (!sk) return;
      counts[bandOf(sk[field])]++;
    });
    var n = students.length || 1;
    return {
      n: students.length,
      counts: counts,
      pct: {
        emerging: Math.round((counts.emerging / n) * 100),
        developing: Math.round((counts.developing / n) * 100),
        secure: Math.round((counts.secure / n) * 100),
      },
    };
  }

  // Shape of a distribution — used to key interpretation copy (spec §5.3.2).
  function shapeOf(dist) {
    var p = dist.pct;
    if (p.secure >= 55) return 'mostly_secure';
    if (p.emerging >= 55) return 'mostly_emerging';
    if (p.emerging >= 30 && p.secure >= 30 && p.developing < 30) return 'bimodal';
    return 'balanced';
  }

  // ---------------------------------------------------------------
  //  PERIODIC: net band movement Baseline → latest complete point,
  //  per skill, for a set of students. Band movement, not score
  //  deltas (spec §5.3.3). Zero movement while Baseline is the latest.
  // ---------------------------------------------------------------
  var BAND_INDEX = { emerging: 0, developing: 1, secure: 2 };
  function movement(students, skillKey, pointKey) {
    var up = 0, same = 0, down = 0;
    var toPt = (pointKey && POINTS.find(function (p) { return p.key === pointKey; })) || LATEST_COMPLETE || POINTS[0];
    var toField = toPt.scoreField;
    students.forEach(function (st) {
      var sk = st.skills.find(function (x) { return x.key === skillKey; });
      if (!sk) return;
      var a = BAND_INDEX[bandOf(sk.baseline)];
      var b = BAND_INDEX[bandOf(sk[toField])];
      if (b > a) up++; else if (b < a) down++; else same++;
    });
    return { up: up, same: same, down: down, n: students.length, net: up - down };
  }

  // ---------------------------------------------------------------
  //  ASSESSMENT WINDOW PROGRESS — per section, how many students are
  //  done for the window that's open. The only "is it happening?" signal
  //  Tilli Measures really has (there is no day-to-day activity data).
  //  Created schools read real completion from TilliAPI; the demo school
  //  uses a stable seeded count.
  // ---------------------------------------------------------------
  // Per-child check-in state for the open window: 'done' | 'draft' | 'none'
  // (null when no window is open). PRODUCT RULE (agreed 2026-10-19; goes in the
  // admin dev handoff):
  //   Completed   ('done')  — the child has completed EVERY assessment deployed to the school.
  //   In progress ('draft') — the child has started or completed AT LEAST ONE deployed assessment.
  //   Not started ('none')  — none of the deployed assessments has been completed.
  // Created schools: counted from TilliAPI completions on the open window's
  // Teacher lane ("started but not completed" isn't visible here — teacher
  // drafts live in the teacher's browser). Demo school: a seeded share of each
  // section is done (same count the section rows show), a seeded share of the
  // rest are in progress.
  var DRAFT_SHARE = 0.35;
  var CHECKIN_CACHE = {};   // demo school only: seeded, so stable per section × window (900 children → called a lot)
  function sectionCheckins(secDef) {
    var students = studentsInSection(secDef), out = {};
    if (!OPEN_POINT) return out;
    var ck = secDef.id + '|' + OPEN_POINT.key;
    if (!window.TILLI_CREATED && CHECKIN_CACHE[ck]) return CHECKIN_CACHE[ck];
    var API = window.TilliAPI;
    if (window.TILLI_CREATED && API && API.completionStats) {
      students.forEach(function (s) {
        var c = API.completionStats(SCHOOL_ID, OPEN_POINT.label, 'Teacher', [s.adm]);
        out[s.adm] = c.expected && c.done >= c.expected ? 'done' : c.done > 0 ? 'draft' : 'none';
      });
      return out;
    }
    var rnd = mulberry32(hashStr(secDef.id + ':' + OPEN_POINT.key + ':progress'));
    var done = Math.round(students.length * (0.3 + rnd() * 0.7));
    var rank = function (s) { return hashStr(s.adm + ':' + OPEN_POINT.key + ':order'); };
    students.slice().sort(function (a, b) { return rank(a) - rank(b); }).forEach(function (s, i) {
      out[s.adm] = i < done ? 'done' : mulberry32(hashStr(s.adm + ':' + OPEN_POINT.key + ':draft'))() < DRAFT_SHARE ? 'draft' : 'none';
    });
    return (CHECKIN_CACHE[ck] = out);
  }
  function checkinStatus(student) {
    if (!OPEN_POINT) return null;
    var sd = SECTIONS.find(function (s) { return s.grade === student.grade && s.section === student.section; });
    return sd ? sectionCheckins(sd)[student.adm] || 'none' : 'none';
  }

  function sectionProgress(secDef) {
    var students = studentsInSection(secDef);
    var total = students.length;
    var st = sectionCheckins(secDef);
    var done = students.filter(function (s) { return st[s.adm] === 'done'; }).length;
    return {
      id: secDef.id, name: secDef.name, grade: secDef.grade, section: secDef.section,
      teacher: teacherFor(secDef), n: total,
      completion: { done: Math.min(done, total), total: total },
    };
  }
  // Recomputed per call so it always follows the open window.
  function windowProgress() { return OPEN_POINT ? SECTIONS.map(sectionProgress) : []; }
  function progressFor(id) { return windowProgress().find(function (a) { return a.id === id; }); }

  // Is data being collected? Each section is compared with the furthest-along
  // section (not the school average), so one slow class is visible even when
  // the rest are bunched together. 'stalled' = nothing in yet while others
  // have started; 'slow' = COLLECT_GAP_PTS or more behind the leader.
  var COLLECT_GAP_PTS = 15;
  function collectionStatus() {
    var rows = windowProgress().map(function (a) {
      return Object.assign({}, a, { pct: a.completion.total ? Math.round(a.completion.done / a.completion.total * 100) : 0 });
    });
    var lead = rows.reduce(function (b, r) { return !b || r.pct > b.pct ? r : b; }, null);
    rows.forEach(function (r) {
      r.flag = !lead || !lead.pct || r === lead ? null
        : r.completion.done === 0 ? 'stalled'
        : lead.pct - r.pct >= COLLECT_GAP_PTS ? 'slow' : null;
    });
    var done = rows.reduce(function (s, r) { return s + r.completion.done; }, 0);
    var total = rows.reduce(function (s, r) { return s + r.completion.total; }, 0);
    return { rows: rows, lead: lead, done: done, total: total, allDone: total > 0 && done >= total, gapPts: COLLECT_GAP_PTS };
  }

  // ---------------------------------------------------------------
  //  CONTINUOUS: teacher-raised concerns queue (spec §6.4).
  //  The school admin sees names + notes
  //  (enforced in the UI layer). `routed_to` accommodates the open
  //  counsellor decision (spec §11.1) either way.
  // ---------------------------------------------------------------
  var CONCERNS = [
    { id: 'c1', adm: 'ADM-5002', student: 'Ishaan Sharma', section: 'Kindergarten A', teacher: 'Kavya Rao',
      date: 'Aug 12, 2026', note: 'Withdrawn during group activities for the past two weeks; not settling after drop-off.',
      status: 'New', routed_to: null, outcome: null },
    { id: 'c2', adm: 'ADM-5010', student: 'Vihaan Patel', section: 'Kindergarten B', teacher: 'Kavya Rao',
      date: 'Aug 9, 2026', note: 'Frequent conflict with peers at play; asked for support strategies.',
      status: 'Routed', routed_to: 'Counsellor', outcome: null },
    { id: 'c3', adm: 'ADM-5105', student: 'Arjun Pillai', section: 'Grade 1 A', teacher: 'Rohan Iyer',
      date: 'Aug 4, 2026', note: 'Struggling to focus in longer sessions; parent flagged sleep changes at home.',
      status: 'Routed', routed_to: 'Counsellor', outcome: null },
    { id: 'c4', adm: 'ADM-5108', student: 'Ravindu Kumar', section: 'Grade 1 B', teacher: 'Dilani Perera',
      date: 'Jul 28, 2026', note: 'Low participation; possible hearing difficulty — recommended a check.',
      status: 'Closed', routed_to: 'Handled internally', outcome: 'Seated at front, family arranging a hearing test. Improving.' },
    { id: 'c5', adm: 'ADM-5006', student: 'Kabir Fernando', section: 'Kindergarten A', teacher: 'Kavya Rao',
      date: 'Jul 22, 2026', note: 'Big emotional reactions to transitions; settling plan needed.',
      status: 'Closed', routed_to: 'Counsellor', outcome: 'Counsellor met family; visual timetable in place. Resolved.' },
  ];
  // Created schools have no raised concerns yet, and the demo entries above point
  // at demo students that don't exist in a real roster — so start empty for them.
  if (window.TILLI_CREATED) CONCERNS = [];
  function concernCounts() {
    return {
      New: CONCERNS.filter(function (c) { return c.status === 'New'; }).length,
      Routed: CONCERNS.filter(function (c) { return c.status === 'Routed'; }).length,
      Closed: CONCERNS.filter(function (c) { return c.status === 'Closed'; }).length,
    };
  }

  // ---------------------------------------------------------------
  //  PERIODIC: targets (spec §6.3). Meant to be SET by the coordinator per
  //  grade × skill at Baseline, for Endline — no "Set targets" flow exists yet.
  //  These values are a PLACEHOLDER FORMULA (Baseline Blooming + 18 pts), not
  //  school-set goals, so they stay OFF (TARGETS_SET=false) until a real source
  //  exists. With the flag off every target module is absent (spec §6.3.5).
  // ---------------------------------------------------------------
  function buildTargets() {
    var t = {};
    GRADES.forEach(function (g) {
      t[g] = {};
      SKILLS.forEach(function (sk) {
        var base = distribution(studentsInGrade(g), sk.key, 'baseline').pct;
        var secure = clamp(base.secure + 18, 0, 100);
        var developing = clamp(base.developing, 0, 100 - secure);
        var emerging = clamp(100 - secure - developing, 0, 100);
        t[g][sk.key] = { emerging: emerging, developing: developing, secure: secure };
      });
    });
    return t;
  }
  var TARGETS = buildTargets();
  var TARGETS_SET = false; // true = show the placeholder targets above (demo only — not real goals)

  // ---------------------------------------------------------------
  //  Interpretation copy (spec §5.3.2 / §9). Content, not code —
  //  keyed by (skill, gradeBand, point, shape). Developmental
  //  phrasing only; never empirical, never cross-school. A missing
  //  key falls back to a shape-generic developmental line; if even
  //  that is missing, a visible placeholder is returned (authored:false).
  // ---------------------------------------------------------------
  // {skill} is filled with the skill's own name so a page of 12 skills reads as
  // twelve distinct notes, not one line pasted twelve times. Still developmental
  // and non-empirical (authored:false) — never a stand-in for signed-off copy.
  var SHAPE_GENERIC = {
    mostly_emerging: 'Most children here are still sprouting in {skill} — common at this age, and it responds well to short, frequent, playful practice.',
    balanced: 'Children are spread across the stages for {skill} — developmentally typical for this age group. Growth here comes in uneven spurts, so steady practice matters more than quick jumps.',
    bimodal: 'For {skill}, the group splits into two clusters. Small-group activities that meet children where they are tend to help the sprouting group catch up.',
    mostly_secure: 'Most children are blooming in {skill}. Keeping it lively with slightly harder challenges helps it hold as they grow.',
  };
  var SKILL_NAME = {};
  SKILLS.forEach(function (sk) { SKILL_NAME[sk.key] = sk.name; });
  function fillSkill(tpl, skillKey) {
    var nm = SKILL_NAME[skillKey] || 'this skill';
    return String(tpl).replace(/\{skill\}/g, nm);
  }
  // A few authored, skill-specific lines (stand-in for Masoomi's signed-off table).
  var AUTHORED = {
    emotion_regulation: {
      mostly_emerging: 'Children at this stage are still learning to name and settle big feelings. Predictable routines and calm-down corners make the biggest difference now.',
    },
    attention: {
      mostly_secure: 'Children here can hold attention well for their age. Varying task length keeps this strength stretching rather than plateauing.',
    },
  };
  // "Where to help next" — one small classroom step per skill for the children
  // still Sprouting. DRAFT copy (stand-in until Masoomi signs off); keep the
  // steps short, concrete and doable without extra materials.
  var HELP_STEPS = {
    emotion_awareness:      'Start the day with a quick feelings check-in — children point to a face that matches how they feel.',
    emotion_regulation:     'Practise one calm-down move together (like "smell the flower, blow the candle") before it' + '’' + 's needed.',
    empathy:                'During story time, pause and ask "How do you think they feel right now?"',
    relationship_skills:    'Pair children for a two-minute share — one talks, one listens, then swap.',
    metacognition:          'After an activity, ask "What helped you?" and let two or three children answer.',
    critical_thinking:      'Ask "Why do you think that?" once a day and wait for a full answer.',
    working_memory:         'Give two-step instructions ("Pick up your pencil, then stand up") and build to three.',
    planning:               'Before a task, ask children to say their first step out loud.',
    cognitive_flexibility:  'Play a quick rule-switch game — clap on red, stamp on blue, then swap the rules.',
    inhibition_distraction: 'Use a "freeze" signal during busy moments and praise the children who stop quickly.',
    inhibition_response:    'Play "Simon says" for a few minutes — waiting for the cue builds self-control.',
    attention:              'Break tasks into short chunks with a quick movement break in between.',
  };
  function helpStep(skillKey) { return HELP_STEPS[skillKey] || '[Help step pending sign-off]'; }

  function interpret(skillKey, gradeBand, pointKey, shape) {
    var a = AUTHORED[skillKey] && AUTHORED[skillKey][shape];
    if (a) return { text: a, authored: true };
    var g = SHAPE_GENERIC[shape];
    if (g) return { text: fillSkill(g, skillKey), authored: false };
    return { text: 'Interpretation for this skill is pending sign-off and will appear here.', authored: false, placeholder: true };
  }

  // ---------------------------------------------------------------
  //  DERIVED READS added for the mockup-inspired modules.
  // ---------------------------------------------------------------

  // Mean 0–100 score for a set of students on one skill, at one point.
  function avgScore(students, skillKey, field) {
    var sum = 0, n = 0;
    students.forEach(function (st) { var sk = st.skills.find(function (x) { return x.key === skillKey; }); if (sk) { sum += sk[field]; n++; } });
    return n ? sum / n : 0;
  }

  // Group every skill by the band MOST children sit in, school-wide
  // (the mockup's "colour is whichever group is largest" rule). Powers
  // the Overview skill-summary cards. Periodic → carries a cadence label.
  function schoolSkillGroups(pointKey) {
    var groups = { emerging: [], developing: [], secure: [] };
    SKILLS.forEach(function (sk) {
      var p = distribution(STUDENTS, sk.key, pointKey).pct;
      var dom = (p.secure >= p.developing && p.secure >= p.emerging) ? 'secure' : (p.emerging >= p.developing ? 'emerging' : 'developing');
      groups[dom].push({ key: sk.key, name: sk.name, pct: p });
    });
    return groups;
  }

  // Areas of growth (lowest Secure %) and strength (highest Secure %)
  // for a scope, at a point. Aggregate only — never per child.
  function growthStrength(students, pointKey, topN) {
    var n = topN || 2;
    var rows = SKILLS.map(function (sk) { var d = distribution(students, sk.key, pointKey); return { key: sk.key, name: sk.name, secure: d.pct.secure, emerging: d.pct.emerging }; });
    return {
      growth: rows.slice().sort(function (a, b) { return (a.secure - b.secure) || (b.emerging - a.emerging); }).slice(0, n),
      strength: rows.slice().sort(function (a, b) { return b.secure - a.secure; }).slice(0, n),
    };
  }

  // Teacher / parent / child (self) ratings per skill for a scope, from the
  // real per-student perspective scores. Sorted by the widest gap first —
  // where the three views disagree most is the useful part.
  function perspectiveGaps(students) {
    var avg = function (sk, f) { var s = 0, n = 0; students.forEach(function (st) { var x = st.skills.find(function (y) { return y.key === sk.key; }); if (x && x[f] != null) { s += x[f]; n++; } }); return n ? Math.round(s / n) : null; };
    return SKILLS.map(function (sk) {
      var t = avg(sk, 'teacher'), p = avg(sk, 'parent'), c = avg(sk, 'student');
      var vals = [t, p, c].filter(function (v) { return v != null; });
      return { key: sk.key, name: sk.name, teacher: t, parent: p, child: c,
        gap: vals.length > 1 ? Math.max.apply(null, vals) - Math.min.apply(null, vals) : 0 };
    }).sort(function (a, b) { return b.gap - a.gap; });
  }

  // A single child's overall developmental stage = band of their mean
  // score at a point.
  // >>> SPEC CONFLICT (§2): this is an INDIVIDUAL child's SEL result,
  //     which leadership is not meant to see. It is computed here but
  //     only rendered when the UI flag SHOW_STUDENT_STAGE is on. Flip
  //     that flag (admin.js) off to restore the privacy wall.
  function studentStage(student, pointKey) {
    var pt = POINTS.find(function (p) { return p.key === pointKey; }) || LATEST_COMPLETE;
    var sum = 0, n = 0;
    student.skills.forEach(function (sk) { sum += sk[pt.scoreField]; n++; });
    return bandMeta(bandOf(n ? sum / n : 0));
  }

  // ---------------------------------------------------------------
  //  Roster (identity only — never SEL). Parent-claim status derived
  //  from the linked-parent data; enrolment all active for the demo.
  // ---------------------------------------------------------------
  var CLAIMED_ADM = (TS.parents || []).reduce(function (acc, p) { return acc.concat(p.children || []); }, []);
  function rosterRows() {
    return STUDENTS.map(function (s, i) {
      var claimed = CLAIMED_ADM.indexOf(s.adm) >= 0;
      // Deterministic invite state for the unclaimed ones.
      var invited = !claimed && (hashStr(s.adm) % 3 !== 0);
      return {
        adm: s.adm, name: s.name, first: s.first, last: s.last,
        grade: s.grade, section: s.section,
        parentEmail: s.parentEmail || '—',
        enrolment: 'Enrolled',
        claim: claimed ? 'Claimed' : invited ? 'Invited' : 'Not invited',
        // Individual stage — gated in the UI (spec §2). See studentStage().
        // null before any point is complete (the "No data" lifecycle state).
        stage: LATEST_COMPLETE ? studentStage(s, LATEST_COMPLETE.key) : null,
      };
    });
  }

  // ---------------------------------------------------------------
  //  LEADERSHIP VERDICT  (feedback §1/§2/§3) — the one-line answer at
  //  the top of Overview: is it happening, is it working, and where is
  //  it against target. All derived; never invents a number.
  // ---------------------------------------------------------------
  // % of skill×student readings that are Secure, pooled across all skills.
  function pooledSecurePct(students, pointKey) {
    var pt = POINTS.find(function (p) { return p.key === pointKey; }); if (!pt) return null;
    var f = pt.scoreField, secure = 0, tot = 0;
    students.forEach(function (st) { st.skills.forEach(function (sk) { tot++; if (bandOf(sk[f]) === 'secure') secure++; }); });
    return tot ? Math.round((secure / tot) * 100) : 0;
  }
  function meanScore(student, field) { var s = 0, n = 0; student.skills.forEach(function (sk) { s += sk[field]; n++; }); return n ? s / n : 0; }
  // Per-child overall band movement, Baseline → latest complete point.
  // Counts CHILDREN (not skill readings), so the headline can say
  // "18 of 24 children moved up a band" honestly.
  function overallBandMovement(students) {
    if (!LATEST_COMPLETE || !COMPLETED_POINTS.length) return { up: 0, down: 0, same: 0, n: 0, avail: false };
    var toF = LATEST_COMPLETE.scoreField, fromF = COMPLETED_POINTS[0].scoreField;
    if (toF === fromF) return { up: 0, down: 0, same: 0, n: students.length, avail: false };
    var up = 0, down = 0, same = 0;
    students.forEach(function (st) {
      var a = BAND_INDEX[bandOf(meanScore(st, fromF))], b = BAND_INDEX[bandOf(meanScore(st, toF))];
      if (b > a) up++; else if (b < a) down++; else same++;
    });
    return { up: up, down: down, same: same, n: students.length, avail: true };
  }
  // Enrolment-weighted Secure target for one skill, school-wide.
  function skillSecureTarget(skillKey) {
    var sum = 0, cnt = 0;
    GRADES.forEach(function (g) { var n = studentsInGrade(g).length; sum += TARGETS[g][skillKey].secure * n; cnt += n; });
    return cnt ? Math.round(sum / cnt) : 0;
  }
  // Enrolment-weighted Secure target pooled across every skill, school-wide —
  // the single number the pooled band bars compare against.
  function pooledSecureTarget() {
    var sum = 0, cnt = 0;
    GRADES.forEach(function (g) { var n = studentsInGrade(g).length; SKILLS.forEach(function (sk) { sum += TARGETS[g][sk.key].secure * n; cnt += n; }); });
    return cnt ? Math.round(sum / cnt) : 0;
  }
  function leadershipVerdict() {
    var v = {
      openPoint: OPEN_POINT, openDaysLeft: OPEN_POINT ? daysLeft(OPEN_POINT) : null, n: STUDENTS.length,
      hasOutcomes: !!LATEST_COMPLETE, point: LATEST_COMPLETE,
      pctSecure: null, targetSecure: null, deltaSecure: null,
      childrenUp: 0, childrenDown: 0, childrenN: 0, movementAvail: false,
    };
    if (LATEST_COMPLETE) {
      v.pctSecure = pooledSecurePct(STUDENTS, LATEST_COMPLETE.key);
      v.targetSecure = TARGETS_SET ? pooledSecureTarget() : null;
      if (COMPLETED_POINTS.length >= 2) {
        v.deltaSecure = v.pctSecure - pooledSecurePct(STUDENTS, COMPLETED_POINTS[0].key);
        var m = overallBandMovement(STUDENTS);
        v.childrenUp = m.up; v.childrenDown = m.down; v.childrenN = m.n; v.movementAvail = m.avail;
      }
    }
    return v;
  }

  // ---- academic year (single year → header shows a static label, no selector) ----
  var ACADEMIC_YEARS = ['2026–27'];

  window.ADMIN_DATA = {
    school: TS.school, schoolId: SCHOOL_ID,
    academicYears: ACADEMIC_YEARS,
    bands: BANDS, bandOf: bandOf, bandMeta: bandMeta,
    bandThresholds: { emergingMax: BAND_EMERGING_MAX, developingMax: BAND_DEVELOPING_MAX },
    points: POINTS, completedPoints: COMPLETED_POINTS, latestComplete: LATEST_COMPLETE,
    openPoint: OPEN_POINT, pointRange: pointRange, daysLeft: daysLeft,
    // lifecycle preview state (demo tooling; see LIFECYCLE_STATES above)
    lifecycleStates: LIFECYCLE_STATES, lifecycleState: ACTIVE_LIFECYCLE,
    setLifecycleState: function (key) {
      applyLifecycle(key);
      try { localStorage.setItem('tilliMeasures.lifecycleState', ACTIVE_LIFECYCLE); } catch (e) {}
      var AD = window.ADMIN_DATA;
      AD.points = POINTS; AD.completedPoints = COMPLETED_POINTS;
      AD.latestComplete = LATEST_COMPLETE; AD.openPoint = OPEN_POINT;
      AD.lifecycleState = ACTIVE_LIFECYCLE;
      return ACTIVE_LIFECYCLE;
    },
    skills: SKILLS, sections: SECTIONS, grades: GRADES, teachers: TEACHERS, students: STUDENTS,
    // Per-school flag (spec §2). Default false; toggled by Tilli staff only.
    // The UI it unlocks is deferred (§11/§12); real enforcement + the access
    // log live server-side and cannot be represented in this static prototype.
    leadershipStudentResultsVisible: false,
    // selectors
    studentsInSection: studentsInSection, studentsInGrade: studentsInGrade,
    teacherFor: teacherFor,
    scopeStudents: function (scope) {
      if (!scope || scope.level === 'school') return STUDENTS;
      if (scope.level === 'grade') return studentsInGrade(scope.grade);
      if (scope.level === 'section') { var sd = SECTIONS.find(function (s) { return s.id === scope.sectionId; }); return sd ? studentsInSection(sd) : []; }
      return STUDENTS;
    },
    // periodic
    distribution: distribution, movement: movement, shapeOf: shapeOf, interpret: interpret,
    targets: TARGETS, targetsSet: TARGETS_SET,
    // leadership verdict + targets (feedback §1/§2/§3)
    leadershipVerdict: leadershipVerdict, pooledSecurePct: pooledSecurePct,
    pooledSecureTarget: pooledSecureTarget, skillSecureTarget: skillSecureTarget,
    overallBandMovement: overallBandMovement,
    // mockup-inspired derived reads
    schoolSkillGroups: schoolSkillGroups, growthStrength: growthStrength,
    perspectiveGaps: perspectiveGaps, studentStage: studentStage, helpStep: helpStep,
    // assessment window progress (only while a window is open)
    windowProgress: windowProgress, progressFor: progressFor, collectionStatus: collectionStatus,
    sectionCheckins: sectionCheckins, checkinStatus: checkinStatus, meanScore: meanScore,
    concerns: CONCERNS, concernCounts: concernCounts,
    // roster
    rosterRows: rosterRows,
  };
})();
