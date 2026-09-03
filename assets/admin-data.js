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

  // "Today" for the demo — matches the project's current date so relative
  // ("4 days ago") and countdown ("opens in 68 days") labels read sensibly.
  var TODAY = new Date('2026-08-18T09:00:00');

  // ---------------------------------------------------------------
  //  Band vocabulary — NEUTRAL, developmental. Deliberately NOT the
  //  teacher/parent garden words (seedling/sprouting/blooming): the
  //  leadership surface carries no garden metaphor (spec §1, §9).
  //  Thresholds map a 0–100 skill score onto a band.
  // ---------------------------------------------------------------
  var BANDS = [
    { key: 'emerging',   label: 'Emerging',   color: '#F0A84A', wash: '#FFF1DC' },
    { key: 'developing', label: 'Developing', color: '#26BDE2', wash: '#DFF6FE' },
    { key: 'secure',     label: 'Secure',     color: '#56C02B', wash: '#E9F8E1' },
  ];
  var BAND_EMERGING_MAX = 40;   // score < 40  → Emerging
  var BAND_DEVELOPING_MAX = 70; // 40–69       → Developing; ≥70 → Secure
  function bandOf(pct) { return pct < BAND_EMERGING_MAX ? 'emerging' : pct < BAND_DEVELOPING_MAX ? 'developing' : 'secure'; }
  function bandMeta(key) { return BANDS.find(function (b) { return b.key === key; }); }

  // ---------------------------------------------------------------
  //  Assessment points (periodic). Named markers only — never dated
  //  ticks, never "Term 1/2/3" (spec §3). Baseline + Midline are
  //  complete (so band distribution + movement have real data);
  //  Endline is the window that's OPEN right now (continuous
  //  completion is live, but no bands exist for it yet).
  // ---------------------------------------------------------------
  var POINTS = [
    { key: 'baseline', label: 'Baseline', month: 'April 2026',     scoreField: 'baseline', status: 'upcoming' },
    { key: 'midline',  label: 'Midline',  month: 'July 2026',      scoreField: 'mid',      status: 'upcoming' },
    { key: 'endline',  label: 'Endline',  month: 'September 2026', scoreField: 'post',     status: 'upcoming' },
  ];
  var ENDLINE_CLOSES = 'Sep 24, 2026';
  var ENDLINE_OPENS_IN_DAYS = 6; // for the Overview status line countdown

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
    { key: 'nodata',   label: 'No data',    hint: 'Programme just started. The Baseline window is open; nothing has been measured yet, so every outcome view is empty.',
      status: { baseline: 'open',     midline: 'upcoming', endline: 'upcoming' } },
    { key: 'baseline', label: 'Baseline',   hint: 'Baseline is complete. The first skill bands appear; movement still waits on a second point.',
      status: { baseline: 'complete', midline: 'upcoming', endline: 'upcoming' } },
    { key: 'between',  label: 'In between', hint: 'The Midline window is open and collecting. Baseline results stay visible alongside a live completion count.',
      status: { baseline: 'complete', midline: 'open',     endline: 'upcoming' } },
    { key: 'midline',  label: 'Midline',    hint: 'Baseline + Midline complete. Movement since Baseline and target-vs-actual now populate.',
      status: { baseline: 'complete', midline: 'complete', endline: 'upcoming' } },
    { key: 'endline',  label: 'Endline',    hint: 'All three points complete. The full-year arc is filled in and no window is open.',
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
  var SECTIONS = TS.sections.slice();     // 4 sections
  var STUDENTS = TS.students;             // 24 students w/ per-skill baseline/mid/post
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
  //  deltas (spec §5.3.3).
  // ---------------------------------------------------------------
  var BAND_INDEX = { emerging: 0, developing: 1, secure: 2 };
  function movement(students, skillKey) {
    var up = 0, same = 0, down = 0;
    students.forEach(function (st) {
      var sk = st.skills.find(function (x) { return x.key === skillKey; });
      if (!sk) return;
      var a = BAND_INDEX[bandOf(sk.baseline)];
      var b = BAND_INDEX[bandOf(sk.mid)];
      if (b > a) up++; else if (b < a) down++; else same++;
    });
    return { up: up, same: same, down: down, n: students.length, net: up - down };
  }

  // ---------------------------------------------------------------
  //  CONTINUOUS: per-section activity. Seeded so the demo is stable.
  //  One section is deliberately Quiet (>21d) and one Slowing, so the
  //  Overview "Quiet sections" module (the most important one) has
  //  something real to show.
  // ---------------------------------------------------------------
  var QUIET_THRESHOLD_DAYS = 21;   // configurable per school (spec §5.1.2)
  var SLOWING_THRESHOLD_DAYS = 7;

  // Hand-tuned last-activity per section id so the states are legible.
  var LAST_ACTIVITY_DAYS = { kg_a: 2, kg_b: 11, g1_a: 4, g1_b: 28 };

  function sectionActivity(secDef) {
    var rnd = mulberry32(hashStr(secDef.id + ':activity'));
    var students = studentsInSection(secDef);
    var days = LAST_ACTIVITY_DAYS[secDef.id] != null ? LAST_ACTIVITY_DAYS[secDef.id] : Math.floor(rnd() * 30);
    // 12 weeks of Ask Tilli sessions; quieter sections trail off at the end.
    var weeks = [];
    var baseVol = 6 + Math.floor(rnd() * 8);
    for (var w = 0; w < 12; w++) {
      var decay = days > QUIET_THRESHOLD_DAYS && w > 8 ? 0.15 : days > SLOWING_THRESHOLD_DAYS && w > 9 ? 0.5 : 1;
      weeks.push(Math.max(0, Math.round((baseVol + (rnd() - 0.5) * 6) * decay)));
    }
    var sessions30 = weeks.slice(8).reduce(function (a, b) { return a + b; }, 0);
    var supportAnswered = Math.round(sessions30 * (0.6 + rnd() * 0.3));
    // Endline (open window) completion — how many of this section's students done.
    var done = Math.round(students.length * (days > QUIET_THRESHOLD_DAYS ? 0.25 : days > SLOWING_THRESHOLD_DAYS ? 0.6 : 0.9 - rnd() * 0.15));
    var status = days >= QUIET_THRESHOLD_DAYS ? 'quiet' : days >= SLOWING_THRESHOLD_DAYS ? 'slowing' : 'active';
    return {
      id: secDef.id, name: secDef.name, grade: secDef.grade, section: secDef.section,
      teacher: teacherFor(secDef), n: students.length,
      lastActivityDays: days, weeks: weeks, sessions30: sessions30,
      supportAnswered: supportAnswered,
      completion: { done: Math.min(done, students.length), total: students.length },
      status: status,
    };
  }
  var ACTIVITY = SECTIONS.map(sectionActivity);
  var activityFor = function (id) { return ACTIVITY.find(function (a) { return a.id === id; }); };

  // Endline (open window) completion across the school.
  function windowCompletion() {
    var done = ACTIVITY.reduce(function (a, s) { return a + s.completion.done; }, 0);
    var total = ACTIVITY.reduce(function (a, s) { return a + s.completion.total; }, 0);
    var sectionsComplete = ACTIVITY.filter(function (s) { return s.completion.done >= s.completion.total; }).length;
    return { students: { done: done, total: total }, sections: { done: sectionsComplete, total: ACTIVITY.length } };
  }

  // ---------------------------------------------------------------
  //  CONTINUOUS: teacher-raised concerns queue (spec §6.4).
  //  Coordinator sees names + notes; a principal would see counts only
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
  //  PERIODIC: targets (spec §6.3). Set per grade × skill at Baseline,
  //  for Endline. Optional — present here so Target-vs-actual renders.
  //  Target = lift the Baseline distribution toward Secure.
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
  var TARGETS_SET = true; // flip to false to exercise the "no targets" absent-module path

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
    mostly_emerging: 'Most children here are at an emerging stage for {skill} — common at this age, and it responds well to short, frequent, playful practice.',
    balanced: 'Children are spread across the stages for {skill} — developmentally typical for this age group. Growth here comes in uneven spurts, so steady practice matters more than quick jumps.',
    bimodal: 'For {skill}, the group splits into two clusters. Small-group activities that meet children where they are tend to help the emerging group catch up.',
    mostly_secure: 'Most children are secure in {skill}. Keeping it lively with slightly harder challenges helps it hold as they grow.',
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

  // MOCK: three assessment perspectives (Teacher / Parent / Student-Direct)
  // per skill, for a scope. The real product carries three streams; the
  // prototype has a single (student) reading, so we synthesise three
  // deterministically around it — students self-rate highest, parents
  // next, teachers most conservative. Swap for the real per-perspective
  // API when it exists.
  function perspectiveRadar(students, pointKey) {
    var pt = POINTS.find(function (p) { return p.key === pointKey; }) || LATEST_COMPLETE;
    var field = pt.scoreField;
    return SKILLS.map(function (sk) {
      var base = avgScore(students, sk.key, field);
      var j = mulberry32(hashStr(sk.key + ':persp'));
      return {
        key: sk.key, name: sk.name,
        studentDirect: clamp(Math.round(base + 6 + j() * 8), 0, 100),
        parent: clamp(Math.round(base + 2 + j() * 6), 0, 100),
        teacher: clamp(Math.round(base - 4 - j() * 6), 0, 100),
      };
    });
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
  //  Overview status line — one sentence, "generated server-side"
  //  (spec §5.1.1). No metaphor, no encouragement, no exclamation.
  // ---------------------------------------------------------------
  function statusLine() {
    var active = ACTIVITY.filter(function (a) { return a.status !== 'quiet'; }).length;
    var quiet = ACTIVITY.length - active;
    var parts = [active + ' of ' + ACTIVITY.length + ' sections are active.'];
    if (quiet > 0) {
      var quietMax = Math.max.apply(null, ACTIVITY.filter(function (a) { return a.status === 'quiet'; }).map(function (a) { return a.lastActivityDays; }));
      parts.push(quiet + ' section' + (quiet === 1 ? ' has' : 's have') + ' had no activity in ' + quietMax + '+ days.');
    }
    parts.push('Endline assessment closes in ' + ENDLINE_OPENS_IN_DAYS + ' days.');
    return parts.join(' ');
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
    var sectionsActive = ACTIVITY.filter(function (a) { return a.status !== 'quiet'; }).length;
    var v = {
      sectionsActive: sectionsActive, sectionsTotal: ACTIVITY.length,
      openPoint: OPEN_POINT, endlineInDays: ENDLINE_OPENS_IN_DAYS,
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
    today: TODAY,
    school: TS.school,
    academicYears: ACADEMIC_YEARS,
    bands: BANDS, bandOf: bandOf, bandMeta: bandMeta,
    bandThresholds: { emergingMax: BAND_EMERGING_MAX, developingMax: BAND_DEVELOPING_MAX },
    points: POINTS, completedPoints: COMPLETED_POINTS, latestComplete: LATEST_COMPLETE,
    openPoint: OPEN_POINT, endlineCloses: ENDLINE_CLOSES,
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
    quietThresholdDays: QUIET_THRESHOLD_DAYS,
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
    perspectiveRadar: perspectiveRadar, studentStage: studentStage,
    // continuous
    activity: ACTIVITY, activityFor: activityFor, windowCompletion: windowCompletion,
    concerns: CONCERNS, concernCounts: concernCounts,
    // roster / overview
    rosterRows: rosterRows, statusLine: statusLine,
  };
})();
