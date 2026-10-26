/* ============================================================
   Tilli Measures — INTERNAL ORG DATA  (Tilli Platform Admin)
   ------------------------------------------------------------
   This file is the MOCK "server" for the internal platform admin.
   Per the build spec (§1.1 "server computes, client renders"), the
   client must not re-derive business logic. So everything the UI
   needs — queues, counts, tier/status derivations, filtered views,
   duplicate detection, a per-school summary — is COMPUTED HERE and
   handed to tilli-admin.js as structured objects via `TILLI_ORG`.

   >>> 100% dummy data. A developer replaces the raw arrays / the
   >>> generator below with the real partner list / API responses.
   >>> One school ("Little Sprouts School") is flagged live:true and
   >>> links to the real per-school dashboard (admin.html); the rest
   >>> are portfolio-only.

   Shape is backward-compatible with the previous version: the old
   Analytics / Access screens still read schools[].{sel,cog,
   completion,sessionsPerWeek,region,board,coordinator}, people(),
   stages, status, stageIndex/stageMeta/byId. New capability is added
   under TILLI_ORG.server.* and richer per-school fields.
   ============================================================ */
(function () {
  'use strict';

  // Fixed "today" so the mock is deterministic (CLAUDE currentDate).
  var TODAY = new Date('2026-08-27T00:00:00');
  var DAY = 86400000;
  var daysFromNow = function (d) { return Math.round((new Date(d) - TODAY) / DAY); };
  // Days until an invitation expires. Invitations sent from this browser (real: true)
  // are dated from the real day, so they count from today; sample ones from the demo date.
  var inviteDaysLeft = function (i) { return i.real ? Math.round((new Date(i.expires) - new Date(new Date().toDateString())) / DAY) : daysFromNow(i.expires); };
  var addDays = function (n) { return new Date(TODAY.getTime() + n * DAY); };
  var iso = function (d) { return new Date(d).toISOString().slice(0, 10); };

  // Grades / sections that still have no students this many days after they
  // were added are removed automatically (daily system job). Each grade and
  // section keeps its own clock (addedAt), so one a school asks to add back
  // gets a fresh window instead of being removed again the next day.
  var EMPTY_STRUCTURE_TTL_DAYS = 60;
  var EMPTY_STRUCTURE_WARN_DAYS = 14;   // flag the school this close to removal
  var SYSTEM_ACTOR = 'System / Service Role';
  var MONTH_IDX = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  // 'Aug 2025' → '2025-08-01' (the mock only knows the month a school joined).
  function joinedISO(j) {
    var m = /^([A-Z][a-z]{2}) (\d{4})$/.exec(String(j || ''));
    return m && MONTH_IDX[m[1]] != null ? iso(new Date(Date.UTC(+m[2], MONTH_IDX[m[1]], 1))) : iso(TODAY);
  }

  // Tiny seeded PRNG so generated schools are stable across reloads.
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var pick = function (r, arr) { return arr[Math.floor(r() * arr.length)]; };
  var between = function (r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); };
  var normName = function (s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); };

  // ---- Rollout stages, in order (carried from the previous surface) ----
  var STAGES = [
    { key: 'mou',        label: 'MoU signed',  short: 'MoU' },
    { key: 'onboarding', label: 'Onboarding',  short: 'Onboarding' },
    { key: 'baseline',   label: 'Baseline',    short: 'Baseline' },
    { key: 'midline',    label: 'Midline',     short: 'Midline' },
    { key: 'endline',    label: 'Endline',     short: 'Endline' },
    { key: 'renewed',    label: 'Renewed',     short: 'Renewed' },
  ];
  var STAGE_ORDER = STAGES.map(function (s) { return s.key; });

  // ---- Engagement status meta (chip colour + attention triage) ----
  var STATUS = {
    active:  { label: 'Active',  chip: 'active'  },
    slowing: { label: 'Slowing', chip: 'slowing' },
    quiet:   { label: 'Quiet',   chip: 'quiet'   },
  };

  // Pull the one live school's real counts from the detailed dataset so the
  // portfolio and the drill-in agree on headline numbers.
  var TS = window.TILLI_SCHOOL;
  var liveStudents = TS ? TS.students.length : 24;
  var liveTeachers = TS ? TS.teachers.length : 4;
  var liveCoord = TS && TS.admins && TS.admins[0]
    ? { name: TS.admins[0].name, email: TS.admins[0].email }
    : { name: 'Meera Krishnan', email: 'meera.krishnan@littlesprouts.edu' };

  // ---- School groups (parallels the current admin's group chips) ----
  // code: stable public slug used in group links (measures.tilli.app/g/<code>/…).
  var GROUPS = [
    { id: 'g-none',       name: 'No group',               code: '' },
    { id: 'g-vidya',      name: 'Vidya Trust',            code: 'vidya' },
    { id: 'g-lanka',      name: 'Lanka Learning Network', code: 'lanka' },
    { id: 'g-brightpath', name: 'BrightPath Foundation',  code: 'brightpath' },
    { id: 'g-metro',      name: 'Metro Public Schools',   code: 'metro' },
  ];
  GROUPS.forEach(function (g) { g.archived = false; g.archivedAt = null; });

  // Build a plausible grades/sections tree for a school of `n` students.
  function makeStructure(r, n) {
    if (n === 0) return { grades: [], sections: 0 };
    var gradePool = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
    var gCount = Math.min(gradePool.length, Math.max(1, Math.round(n / 90)));
    var grades = [];
    var remaining = n, sectionTotal = 0;
    for (var i = 0; i < gCount; i++) {
      var secCount = between(r, 1, 3);
      var sections = [];
      for (var j = 0; j < secCount; j++) {
        var cnt = i === gCount - 1 && j === secCount - 1 ? remaining : Math.max(0, Math.round(remaining / (gCount - i) / (secCount - j)));
        remaining -= cnt; sectionTotal++;
        sections.push({ name: String.fromCharCode(65 + j), students: Math.max(0, cnt) });
      }
      grades.push({ grade: gradePool[i], sections: sections });
    }
    return { grades: grades, sections: sectionTotal };
  }
  // Give every grade/section without a clock the school's creation date.
  function stampStructure(struct, addedAt) {
    struct.grades.forEach(function (g) {
      if (!g.addedAt) g.addedAt = addedAt;
      g.sections.forEach(function (sec) { if (!sec.addedAt) sec.addedAt = addedAt; });
    });
    return struct;
  }
  // First letter not already used in this grade (A, B, … — survives gaps left by removals).
  function nextSectionName(g) {
    for (var c = 0; c < 26; c++) {
      var n = String.fromCharCode(65 + c);
      if (!g.sections.some(function (sec) { return sec.name === n || sec.base === n; })) return n;
    }
    return String(g.sections.length + 1);
  }

  // ---- Hand-authored "hero" schools (cover every Control-Room example case) ----
  var HERO = [
    { id: 'little-sprouts', live: true, name: 'Little Sprouts School', code: 'LSPR-2210', type: 'Independent school',
      city: 'Bengaluru', country: 'India', region: 'India', board: 'CBSE', groupId: 'g-none',
      students: liveStudents, staff: liveTeachers, coordinator: liveCoord, joined: 'Apr 2025',
      stage: 'midline', status: 'active', sessionsPerWeek: 96, completion: 71, sel: 64, cog: 61 },
    // emptySections: demo-only extra empty sections added `ago` days before TODAY
    // (12 → still inside the window; 75 → already auto-removed at load).
    { id: 'greenfield', name: 'Greenfield International School', code: 'GRNF-4041', type: 'IB World School',
      city: 'Mumbai', country: 'India', region: 'India', board: 'IB', groupId: 'g-vidya', emptySections: [{ ago: 12 }],
      students: 540, staff: 32, coordinator: { name: 'Rita Fernandes', email: 'rita.f@greenfield.edu' }, joined: 'Jan 2025',
      stage: 'endline', status: 'active', sessionsPerWeek: 512, completion: 88, sel: 69, cog: 66 },
    { id: 'sunrise', name: 'Sunrise Public School', code: 'SNRS-1180', type: 'CBSE school',
      city: 'Delhi', country: 'India', region: 'India', board: 'CBSE', groupId: 'g-metro', emptySections: [{ ago: 75 }],
      students: 820, staff: 45, coordinator: { name: 'Anil Mehta', email: 'anil.mehta@sunrisepublic.edu' }, joined: 'Jul 2025',
      stage: 'baseline', status: 'active', sessionsPerWeek: 610, completion: 42, sel: 58, cog: 55 },
    { id: 'lotus-valley', name: 'Lotus Valley School', code: 'LOTS-3390', type: 'CBSE school',
      city: 'Gurugram', country: 'India', region: 'India', board: 'CBSE', groupId: 'g-metro',
      students: 610, staff: 38, coordinator: { name: 'Pooja Malhotra', email: 'pooja.m@lotusvalley.edu' }, joined: 'Feb 2025',
      stage: 'midline', status: 'slowing', sessionsPerWeek: 214, completion: 63, sel: 60, cog: 57 },
    { id: 'banyan-tree', name: 'Banyan Tree School', code: 'BNYN-7712', type: 'ICSE school',
      city: 'Chennai', country: 'India', region: 'India', board: 'ICSE', groupId: 'g-vidya',
      students: 430, staff: 27, coordinator: { name: 'Suresh Raman', email: 'suresh.r@banyantree.edu' }, joined: 'Jan 2025',
      stage: 'endline', status: 'active', sessionsPerWeek: 388, completion: 84, sel: 67, cog: 63 },
    // 3rd year with Tilli — two archived years in the shared store (TilliAPI.yearsFor).
    { id: 'heritage-oaks', name: 'Heritage Oaks School', code: 'HROK-4410', type: 'CBSE school',
      city: 'Bengaluru', country: 'India', region: 'India', board: 'CBSE', groupId: 'g-none',
      students: 56, staff: 5, coordinator: { name: 'Nandini Rao', email: 'admin@heritageoaks.edu' }, joined: 'Jun 2024',
      stage: 'baseline', status: 'active', sessionsPerWeek: 142, completion: 60, sel: 64, cog: 61 },
    // ---- Onboarding stalls: 0 students (feeds the Control Room "0 students" card) ----
    // seedGrades: grades/sections set up in the wizard but never filled. Asian
    // Grammar is 50 days in (auto-removal warning); Royal College is long past it.
    { id: 'asian-grammar', name: 'Asian Grammar School', code: 'ARUG-4164', type: 'Independent school',
      city: 'Hyderabad', country: 'India', region: 'India', board: 'CBSE', groupId: 'g-none',
      createdAt: iso(addDays(-50)), seedGrades: [['Grade 1', ['A', 'B']], ['Grade 2', ['A']]],
      students: 0, staff: 2, coordinator: { name: 'Farah Sheikh', email: 'farah.s@asiangrammar.edu' }, joined: 'Jul 2026',
      stage: 'onboarding', status: 'quiet', sessionsPerWeek: 0, completion: 0, sel: null, cog: null },
    { id: 'compassion-intl', name: 'Compassion International', code: 'CMPS-9032', type: 'NGO programme',
      city: 'Kolkata', country: 'India', region: 'India', board: 'National', groupId: 'g-brightpath',
      students: 0, staff: 0, coordinator: { name: 'David Roy', email: 'david.roy@compassion.org' }, joined: 'Aug 2025',
      stage: 'mou', status: 'quiet', sessionsPerWeek: 0, completion: 0, sel: null, cog: null },
    { id: 'royal-colombo', name: 'Royal College Colombo', code: 'RYCL-5521', type: 'National school',
      city: 'Colombo', country: 'Sri Lanka', region: 'Sri Lanka', board: 'National', groupId: 'g-lanka',
      seedGrades: [['Grade 1', ['A', 'B']], ['Grade 2', ['A', 'B']]],
      students: 0, staff: 3, coordinator: { name: 'Nimal Gunasekara', email: 'nimal.g@royalcollege.lk' }, joined: 'Jul 2025',
      stage: 'onboarding', status: 'quiet', sessionsPerWeek: 0, completion: 0, sel: null, cog: null },
    // ---- Sri Lanka spread ----
    { id: 'colombo-kids', name: 'Colombo Kids Academy', code: 'CLMB-6604', type: 'Independent school',
      city: 'Colombo', country: 'Sri Lanka', region: 'Sri Lanka', board: 'Cambridge', groupId: 'g-lanka',
      students: 300, staff: 22, coordinator: { name: 'Dilani Perera', email: 'dilani.p@colombokids.lk' }, joined: 'Jun 2025',
      stage: 'onboarding', status: 'active', sessionsPerWeek: 58, completion: 8, sel: null, cog: null },
    { id: 'kandy-hill', name: 'Kandy Hill School', code: 'KNDY-8890', type: 'National school',
      city: 'Kandy', country: 'Sri Lanka', region: 'Sri Lanka', board: 'National', groupId: 'g-lanka',
      students: 260, staff: 18, coordinator: { name: 'Nuwan Bandara', email: 'nuwan.b@kandyhill.lk' }, joined: 'Jul 2025',
      stage: 'baseline', status: 'quiet', sessionsPerWeek: 34, completion: 31, sel: 54, cog: 52 },
    { id: 'riverside', name: 'Riverside Primary', code: 'RVSD-2245', type: 'Independent school',
      city: 'Galle', country: 'Sri Lanka', region: 'Sri Lanka', board: 'Cambridge', groupId: 'g-lanka',
      students: 210, staff: 16, coordinator: { name: 'Ishara Jaya', email: 'ishara.j@riverside.lk' }, joined: 'Mar 2025',
      stage: 'midline', status: 'slowing', sessionsPerWeek: 88, completion: 66, sel: 62, cog: 59 },
    { id: 'marigold', name: 'Marigold Learning Centre', code: 'MRGD-5150', type: 'ICSE school',
      city: 'Pune', country: 'India', region: 'India', board: 'ICSE', groupId: 'g-none',
      students: 190, staff: 14, coordinator: { name: 'Neha Kulkarni', email: 'neha.k@marigold.edu' }, joined: 'Aug 2025',
      stage: 'mou', status: 'quiet', sessionsPerWeek: 0, completion: 0, sel: null, cog: null },
    // ---- One archived school (Active/Archived tabs) ----
    { id: 'old-oak', name: 'Old Oak Montessori', code: 'OLDK-3301', type: 'Montessori', archived: true,
      city: 'Jaipur', country: 'India', region: 'India', board: 'ICSE', groupId: 'g-none',
      students: 120, staff: 9, coordinator: { name: 'Rekha Sharma', email: 'rekha.s@oldoak.edu' }, joined: 'Sep 2024',
      stage: 'endline', status: 'quiet', sessionsPerWeek: 0, completion: 79, sel: 61, cog: 58 },
  ];

  // ---- Generate the remaining schools to reach a realistic portfolio (~61) ----
  var CITIES_IN = [['Ahmedabad','India'],['Nagpur','India'],['Kochi','India'],['Bhopal','India'],['Indore','India'],['Surat','India'],['Lucknow','India'],['Patna','India'],['Coimbatore','India'],['Vadodara','India'],['Mysuru','India'],['Nashik','India']];
  var CITIES_LK = [['Negombo','Sri Lanka'],['Jaffna','Sri Lanka'],['Matara','Sri Lanka'],['Kurunegala','Sri Lanka'],['Batticaloa','Sri Lanka']];
  var NAME_A = ['Silver','Maple','Cedar','Harmony','Bright','Rainbow','Little','Green','Blue','Golden','Crescent','Meadow','Sunbeam','Orchard','Willow','Lakeside','Hillcrest','Star','Pearl','Jasmine'];
  var NAME_B = ['Oak','Hearts','Minds','Scholars','Academy','Gardens','Public School','International','Vidyalaya','Grammar','Kids','Learning','Montessori','Primary','High School'];
  var BOARDS = ['CBSE','ICSE','IB','Cambridge','National','State Board'];
  var TYPES = ['Independent school','CBSE school','ICSE school','Montessori','National school','Government-aided'];
  var COORD_FIRST = ['Anita','Rahul','Sanjay','Meena','Vijay','Kavya','Arun','Deepa','Ramesh','Sunita','Kasun','Amara','Sanduni','Tharindu','Nadeesha'];
  var COORD_LAST = ['Sharma','Nair','Reddy','Iyer','Das','Fernando','Perera','Silva','Kumar','Rao','Menon','Bandara','Jaya','Gupta','Pillai'];

  function generate(count) {
    var r = rng(20260827);
    var out = [];
    for (var i = 0; i < count; i++) {
      var lk = r() < 0.28;
      var city = pick(r, lk ? CITIES_LK : CITIES_IN);
      var nm = pick(r, NAME_A) + ' ' + pick(r, NAME_B);
      var zero = r() < 0.05;
      var n = zero ? 0 : between(r, 90, 900);
      var stageKey = pick(r, zero ? ['mou', 'onboarding'] : STAGE_ORDER);
      var hasOutcome = ['midline', 'endline', 'renewed'].indexOf(stageKey) >= 0 && !zero;
      var st = zero ? 'quiet' : pick(r, ['active', 'active', 'active', 'slowing', 'quiet']);
      var cf = pick(r, COORD_FIRST), cl = pick(r, COORD_LAST);
      var slug = 'gen-' + i + '-' + nm.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
      out.push({
        id: slug, name: nm, code: (nm.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'SCHL') + '-' + between(r, 1000, 9999),
        type: pick(r, TYPES), city: city[0], country: city[1], region: city[1], board: pick(r, BOARDS),
        groupId: pick(r, ['g-none', 'g-none', 'g-vidya', 'g-lanka', 'g-brightpath', 'g-metro']),
        students: n, staff: n === 0 ? between(r, 0, 3) : Math.max(1, Math.round(n / 22)),
        coordinator: { name: cf + ' ' + cl, email: (cf + '.' + cl).toLowerCase() + '@' + slug.split('-').slice(-1)[0] + '.edu' },
        joined: pick(r, ['Jan 2025','Feb 2025','Mar 2025','Apr 2025','May 2025','Jun 2025','Jul 2025','Aug 2025']),
        stage: stageKey, status: st,
        sessionsPerWeek: st === 'quiet' ? between(r, 0, 20) : between(r, 40, 600),
        completion: zero ? 0 : (stageKey === 'mou' ? 0 : between(r, 10, 95)),
        sel: hasOutcome ? between(r, 50, 72) : null, cog: hasOutcome ? between(r, 48, 70) : null,
      });
    }
    return out;
  }

  var SCHOOLS = HERO.concat(generate(48));

  // Attach derived structure + a stable per-section counts tree to each school.
  SCHOOLS.forEach(function (s, i) {
    if (s.archived == null) s.archived = false;
    if (s.groupId == null) s.groupId = 'g-none';
    var r = rng(1000 + i);
    if (!s.createdAt) s.createdAt = joinedISO(s.joined);
    var struct = s.seedGrades
      ? { grades: s.seedGrades.map(function (g) { return { grade: g[0], sections: g[1].map(function (n) { return { name: n, students: 0 }; }) }; }), sections: 0 }
      : makeStructure(r, s.students);
    stampStructure(struct, s.createdAt);
    (s.emptySections || []).forEach(function (x) {
      var g = struct.grades[0]; if (!g) return;
      g.sections.push({ name: nextSectionName(g), students: 0, addedAt: iso(addDays(-x.ago)) });
    });
    struct.sections = struct.grades.reduce(function (a, g) { return a + g.sections.length; }, 0);
    s.structure = struct;
    s.gradeCount = struct.grades.length;
    s.sectionCount = struct.sections;
    s.groupName = (GROUPS.find(function (g) { return g.id === s.groupId; }) || GROUPS[0]).name;
  });

  // ---------- derived helpers (unchanged public surface) ----------
  var stageIndex = function (key) { return STAGE_ORDER.indexOf(key); };
  var stageMeta = function (key) { return STAGES.find(function (s) { return s.key === key; }) || STAGES[0]; };
  var byId = function (id) { return SCHOOLS.find(function (s) { return s.id === id; }) || null; };
  var groupById = function (id) { return GROUPS.find(function (g) { return g.id === id; }) || GROUPS[0]; };
  var activeSchools = function () { return SCHOOLS.filter(function (s) { return !s.archived; }); };

  // ---- Bridge: schools created via the Add-School wizard live in the shared
  // TilliAPI store (localStorage), so they persist across reloads AND are
  // visible to the teacher/parent/coordinator apps. Build a portfolio record
  // from a materialised TilliAPI school so it renders on the hub like any other.
  function buildOrgRecordFromApi(api) {
    var st = window.TilliAPI.schoolStats(api.school_id);
    var grades = st.grades.map(function (g) {
      return { grade: g.grade, base: g.base || '', board: g.board || null, students: 0, sections: g.sections.map(function (sec) { return { id: sec.id, name: sec.name, base: sec.base || sec.name, students: sec.students }; }) };
    });
    var coord = st.coordinator ? { name: st.coordinator.name, email: st.coordinator.email } : { name: '—', email: '' };
    var grp = (api.group_id && GROUPS.find(function (g) { return g.id === api.group_id; })) || GROUPS[0];
    return {
      id: api.school_id, live: true, created: true, code: api.code || api.school_id,
      name: api.name, type: 'Independent school',
      city: api.city || '', country: api.country || '', region: api.country || '',
      board: api.board || 'Other', boards: api.boards || null, groupId: grp.id, groupName: grp.name,
      students: st.students, staff: st.staff, coordinator: coord,
      joinCode: api.joinCode || '',
      joined: 'Sep 2025', stage: 'baseline', status: 'active',
      sessionsPerWeek: 0, completion: 0, sel: null, cog: null, archived: false,
      createdAt: iso(api.createdAt || TODAY),
      structure: stampStructure({ grades: grades, sections: st.sections }, iso(api.createdAt || TODAY)),
      gradeCount: grades.length, sectionCount: st.sections,
    };
  }
  // On load, pull any previously-created schools out of the shared store so the
  // portfolio survives a reload (the org layer itself has no persistence).
  function hydrateCreatedSchools() {
    if (!window.TilliAPI || !window.TilliAPI.listSchools) return;
    window.TilliAPI.listSchools().forEach(function (api) {
      if (api.source !== 'created') return;
      var hero = byId(api.school_id);
      if (!hero) { SCHOOLS.unshift(buildOrgRecordFromApi(api)); return; }
      // A portfolio school that now has full data in the shared store (the
      // seeded demo schools): take its roster, staff and structure from the
      // store, keep its portfolio identity (type, stage, outcomes, joined).
      if (!api.seeded) return;
      var rec = buildOrgRecordFromApi(api);
      ['live', 'created', 'seeded', 'students', 'staff', 'coordinator', 'code', 'joinCode', 'structure', 'gradeCount', 'sectionCount'].forEach(function (k) { hero[k] = rec[k]; });
      hero.seeded = true; hero.completion = apiCompletion(api.school_id);
      SEEDED_IDS[api.school_id] = 1;
    });
  }
  var SEEDED_IDS = {};
  // After a roster change (import, approve / turn down a new child) the hub's
  // header counts are re-read from the store — no reload needed.
  function refreshApiSchool(id) {
    var rec0 = byId(id), api = window.TilliAPI && window.TilliAPI.resolveSchool(id);
    if (!rec0 || !api || api.source !== 'created') return;
    var rec = buildOrgRecordFromApi(api);
    ['students', 'staff', 'structure', 'gradeCount', 'sectionCount'].forEach(function (k) { rec0[k] = rec[k]; });
    rec0.completion = apiCompletion(id);
  }
  // Overall completion: children fully done, pooled over the phases that have opened.
  function apiCompletion(id) {
    var API = window.TilliAPI, done = 0, total = 0, opened = {};
    API.getDeployments(id).forEach(function (d) { if (d.status !== 'Scheduled') opened[d.phase] = 1; });
    Object.keys(opened).forEach(function (ph) { var k = API.childrenDone(id, ph); done += k.done; total += k.total; });
    return total ? Math.round(done * 100 / total) : 0;
  }

  // ============================================================
  //  GLOBAL ENTITIES  (mock rows the queues + list screens read)
  // ============================================================

  // ---- Users (roles incl. 'none' — the dead accounts the queue flags) ----
  var ROLES = ['Super Admin', 'School Group Admin', 'School Admin', 'Teacher', 'none'];
  function buildUsers() {
    var users = [];
    // coordinators become School Admins
    SCHOOLS.forEach(function (s, i) {
      users.push({ id: 'u-coord-' + i, name: s.coordinator.name, email: s.coordinator.email,
        role: 'School Admin', schoolId: s.archived ? s.id : s.id, sections: [] });
    });
    // Little Sprouts real teachers
    if (TS && TS.teachers) TS.teachers.forEach(function (t, i) {
      users.push({ id: 'u-t-' + i, name: t.name, email: t.email, role: 'Teacher',
        schoolId: 'little-sprouts', sections: [t.grade + ' ' + t.section] });
    });
    // a handful of Tilli-team super admins
    ['Meera Krishnan', 'Masoomi Shah', 'Ishani Rao'].forEach(function (nm, i) {
      users.push({ id: 'u-sa-' + i, name: nm, email: nm.toLowerCase().replace(/\s+/g, '.') + '@tilli.org', role: 'Super Admin', schoolId: null, sections: [] });
    });
    // dead accounts: role none, no school (feeds "Users with no role")
    var deadFirst = ['Test','Demo','Old','Pilot','Temp','Unused','Legacy','Spare'];
    for (var i = 0; i < 14; i++) {
      users.push({ id: 'u-none-' + i, name: deadFirst[i % deadFirst.length] + ' Account ' + (i + 1),
        email: 'noreply+' + i + '@example.com', role: 'none', schoolId: null, sections: [] });
    }
    return users;
  }
  var USERS = buildUsers();

  // School staff = school-side accounts (not the Tilli team, not dead accounts).
  // Staff tied to an archived school drop out, matching "Active Schools".
  var STAFF_ROLES = ['School Group Admin', 'School Admin', 'Teacher'];
  function isSchoolStaff(u) {
    if (STAFF_ROLES.indexOf(u.role) < 0) return false;
    var sc = u.schoolId ? byId(u.schoolId) : null;
    return !sc || !sc.archived;
  }

  // ---- Invitations (some expiring within 7 days, some already expired) ----
  function buildInvitations() {
    var inv = [];
    var mk = function (id, name, email, role, schoolId, status, createdOffset, expiresOffset, delivery) {
      return { id: id, name: name, email: email, role: role, schoolId: schoolId, status: status,
        delivery: delivery || 'Email sent', created: iso(addDays(createdOffset)), expires: iso(addDays(expiresOffset)) };
    };
    inv.push(mk('inv-nmajs', 'NMAJS Admin', 'admin@nmajs.edu', 'School Admin', 'asian-grammar', 'Expired', -40, -10));
    inv.push(mk('inv-royal', 'Nimal Gunasekara', 'nimal.g@royalcollege.lk', 'School Admin', 'royal-colombo', 'Account Created', -20, 4));
    inv.push(mk('inv-comp', 'David Roy', 'david.roy@compassion.org', 'School Admin', 'compassion-intl', 'Account Created', -18, 2));
    inv.push(mk('inv-mari', 'Neha Kulkarni', 'neha.k@marigold.edu', 'School Admin', 'marigold', 'Expired', -35, -6));
    inv.push(mk('inv-green-t', 'New Teacher', 'teacher@greenfield.edu', 'Teacher', 'greenfield', 'Account Created', -6, 6));
    inv.push(mk('inv-sun-t', 'Pending Teacher', 'pending@sunrisepublic.edu', 'Teacher', 'sunrise', 'Activated', -30, 30));
    inv.push(mk('inv-lotus', 'Coord Two', 'coord2@lotusvalley.edu', 'School Admin', 'lotus-valley', 'Account Created', -3, 3));
    return inv;
  }
  var INVITATIONS = buildInvitations();

  // Build an Invitations-table row from a TilliAPI account (created via the
  // Platform Admin "New invitation" flow). status maps: an account still on its
  // temp password reads "Account Created"; once the user sets their own it flips
  // to "Activated". Expiry is 14 days from when the invite was minted.
  var TITLES = function (s) { return String(s || '').replace(/(^|[\s.])([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); }); };
  function invFromAccount(acct) {
    var local = String(acct.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
    var created = acct.createdAt ? new Date(acct.createdAt) : TODAY;
    var expires = new Date(created.getTime() + 14 * DAY);
    return {
      id: 'inv-acct-' + String(acct.email || '').toLowerCase(),
      name: TITLES(local) || acct.email, email: acct.email, role: acct.role || 'School Admin',
      schoolId: acct.school_id || null, groupId: acct.group_id || null,
      status: acct.status === 'active' ? 'Activated' : 'Account Created',
      delivery: 'Email sent', created: iso(created), expires: iso(expires), real: !!acct.createdAt,
    };
  }
  // Fold any accounts provisioned in a previous session (persisted in TilliAPI)
  // into the list so they survive a reload.
  if (window.TilliAPI && window.TilliAPI.listAccounts) {
    window.TilliAPI.listAccounts().forEach(function (acct) {
      if (!INVITATIONS.some(function (i) { return i.email === acct.email; })) INVITATIONS.push(invFromAccount(acct));
    });
  }
  // Insert (or refresh) an invitation row live, without a reload. Called by the
  // admin app right after TilliAPI.createInvite succeeds.
  function addInvitation(acct) {
    var row = invFromAccount(acct);
    var i = INVITATIONS.findIndex(function (x) { return x.email === row.email; });
    if (i >= 0) INVITATIONS[i] = row; else INVITATIONS.unshift(row);
    return row;
  }

  // Now that USERS/INVITATIONS exist, fold in any schools created in a previous
  // session (persisted in the shared TilliAPI store) and mirror their
  // coordinators into the People roster + invitations list.
  hydrateCreatedSchools();
  SCHOOLS.forEach(function (s) {
    if (!s.created || !s.coordinator || !s.coordinator.email) return;
    if (!USERS.some(function (u) { return u.email === s.coordinator.email && u.schoolId === s.id; })) {
      USERS.push({ id: 'u-admin-' + s.id, name: s.coordinator.name, email: s.coordinator.email, role: 'School Admin', schoolId: s.id, sections: [] });
    }
  });

  // ---- Issue reports (open / investigating / resolved + Auto-Crash burst) ----
  function buildIssues() {
    var issues = [];
    var pages = ['Assessment player', 'Login', 'Parent report', 'Teacher dashboard', 'Master link', 'Student roster'];
    var devices = ['iPad · Safari', 'Windows · Chrome', 'Android · Chrome', 'Mac · Chrome'];
    var r = rng(777);
    for (var i = 0; i < 22; i++) {
      var s = pick(r, SCHOOLS.filter(function (x) { return !x.archived; }));
      issues.push({ id: 'iss-' + i, reporter: pick(r, COORD_FIRST) + ' ' + pick(r, COORD_LAST),
        email: 'reporter' + i + '@example.com', role: pick(r, ['School Admin', 'Teacher', 'Coordinator']),
        schoolId: s.id, gradeSection: 'Grade ' + between(r, 1, 5) + ' ' + pick(r, ['A', 'B', 'C']),
        page: pick(r, pages), device: pick(r, devices), date: iso(addDays(-between(r, 0, 25))),
        status: pick(r, ['open', 'open', 'open', 'investigating', 'resolved']) });
    }
    // Auto-crash burst from one device (grouped/collapsible in the UI)
    for (var j = 0; j < 13; j++) {
      issues.push({ id: 'iss-crash-' + j, reporter: 'Auto-Crash', email: 'system', role: 'Auto-Crash',
        schoolId: 'sunrise', gradeSection: '', page: 'Assessment player', device: 'iPad · Safari 17.2',
        date: iso(addDays(-between(rng(9 + j), 0, 3))), status: 'open', autoCrash: true, crashSig: 'player-null-ref-0x8f' });
    }
    return issues;
  }
  var ISSUES = buildIssues();

  // ---- Assessment templates ----
  // One template per assessment. Each phase (Baseline / Midline / Endline) has
  // its own published versions (v1, v2 … — the last one is live) and at most
  // one working draft. A template as a whole is only Active or Archived.
  // `plan` (demo seed) is turned into t.slots once the question banks exist.
  function tplMeta(createdAgo, by, editedAgo, editor) {
    var at = function (d) { return d == null ? null : TODAY.getTime() - d * DAY; };
    return { createdAt: at(createdAgo), createdBy: by, updatedAt: at(editedAgo), updatedBy: editor || by, archived: false };
  }
  var TEMPLATES = [
    { id: 'tpl-teacher-report', title: 'Teacher Report', audience: 'Teacher', desc: 'The class teacher’s observation of each child.', meta: tplMeta(400, 'Meera Krishnan', 3, 'Masoomi Shah'),
      plan: { Baseline: { versions: [['teacher2025', 380, 'Meera Krishnan', '2025 cohort'], ['teacher', 9, 'Masoomi Shah']] },
              Midline: { draft: ['teacher', 3, 'Masoomi Shah'] }, Endline: { draft: ['teacher', 14, 'Masoomi Shah'] } } },
    { id: 'tpl-parent-report', title: 'Parent Report', audience: 'Parent', desc: 'Home-context parent survey.', meta: tplMeta(52, 'Meera Krishnan', 30),
      plan: { Baseline: { versions: [['parent', 30, 'Meera Krishnan']] } } },
    { id: 'tpl-direct-emt', title: 'EMT · Emotion Matching Task', audience: 'Direct Assessment', desc: 'The child matches faces to feelings.', meta: tplMeta(120, 'Ishani Rao', 60),
      plan: { Baseline: { versions: [['emt', 60, 'Ishani Rao']] } } },
    { id: 'tpl-direct-checkin', title: 'My School Check-in', audience: 'Direct Assessment', desc: 'IDELA’s school-safety and teacher-support questions, split out. Runs at home when parents take part, else at school — where no teacher runs it for their own class.', meta: tplMeta(1, 'Ishani Rao', 1),
      plan: { Baseline: { versions: [['checkin', 1, 'Ishani Rao']] }, Midline: { versions: [['checkin', 1, 'Ishani Rao']] }, Endline: { versions: [['checkin', 1, 'Ishani Rao']] } } },
    { id: 'tpl-direct-hf', title: 'Hearts & Flowers', audience: 'Direct Assessment', desc: 'Inhibition / flexibility task.', meta: tplMeta(120, 'Ishani Rao', 75),
      plan: { Baseline: { versions: [['hf', 75, 'Ishani Rao']] }, Midline: { versions: [['hf', 75, 'Ishani Rao']] } } },
  ];
  var TPL_PHASES = ['Baseline', 'Midline', 'Endline'];
  // ---- Question banks (DEMO content) — what each template asks, in order.
  // Each bank becomes builder questions (see bankQuestions): an opening
  // Section Break, then one Multiple Choice per item with scored options and
  // the skills it evaluates. Templates made with "New template" start empty.
  var TB_SKILL_OF = { 'Emotion awareness': 'Emotion Awareness', 'Emotion regulation': 'Emotion Regulation', 'Empathy': 'Empathy',
    'Relationship skills': 'Relationship Skills', 'Metacognition': 'Metacognition', 'Critical thinking': 'Critical Thinking',
    'Working Memory': 'Working Memory', 'Planning': 'Planning and Organization', 'Cognitive Flexibility': 'Cognitive Flexibility',
    'Attention': 'Attention', 'Distraction': 'Inhibition (Distraction)', 'Inhibitory Control': 'Inhibition (Response)' };
  var FREQ = [['Rarely', 1], ['Sometimes', 2], ['Often', 3], ['Almost always', 4]];
  var TPL_TEACHER_OBS = { intro: 'Think about the last few weeks. For each statement, choose how often you’ve seen this child do it.',
    options: FREQ.concat([['Haven’t seen yet', null]]), scoring: 'map', items: [
    ['Notices and names their own feelings in the moment.', 'Emotion awareness'],
    ['Recognises how a classmate is feeling from their face or voice.', 'Emotion awareness'],
    ['Calms down and recovers after being upset, with support.', 'Emotion regulation'],
    ['Copes with small disappointments (losing a game, waiting) without a big outburst.', 'Emotion regulation'],
    ['Notices when a classmate is upset and responds kindly.', 'Empathy'],
    ['Offers help or comfort without being asked.', 'Empathy'],
    ['Joins play and takes turns with peers.', 'Relationship skills'],
    ['Works out small disagreements with words.', 'Relationship skills'],
    ['Talks about how they solved a problem or what was tricky.', 'Metacognition'],
    ['Notices a mistake and tries a different way.', 'Metacognition'],
    ['Asks “why” and gives reasons for their thinking.', 'Critical thinking'],
    ['Compares two choices and picks one with a reason.', 'Critical thinking'],
    ['Follows a two-step instruction without reminders.', 'Working Memory'],
    ['Remembers what they were doing after a short interruption.', 'Working Memory'],
    ['Gathers what they need before starting a task.', 'Planning'],
    ['Breaks a bigger task into steps (first…, then…).', 'Planning'],
    ['Switches between activities without much fuss.', 'Cognitive Flexibility'],
    ['Stays with a task when there’s noise nearby.', 'Distraction'],
    ['Waits for their turn instead of calling out.', 'Inhibitory Control'],
    ['Stops an action when asked to.', 'Inhibitory Control'],
    ['Stays focused through a short group activity.', 'Attention'],
  ] };
  var TPL_PARENT = { intro: 'Think about your child at home over the last few weeks. Choose how often each statement is true.',
    options: FREQ, scoring: 'map', items: [
    ['My child can tell me how they are feeling.', 'Emotion awareness'],
    ['My child calms down within a few minutes after being upset.', 'Emotion regulation'],
    ['My child notices when someone at home is sad or hurt.', 'Empathy'],
    ['My child plays with siblings or friends and takes turns.', 'Relationship skills'],
    ['My child keeps trying when something is hard.', 'Metacognition'],
    ['My child follows a two-step instruction at home (“wash your hands, then come to eat”).', 'Working Memory'],
    ['My child gets ready for routines (bath, bed, school) with few reminders.', 'Planning'],
    ['My child can wait for something they want.', 'Inhibitory Control'],
    ['My child moves from play to another activity without a big fuss.', 'Cognitive Flexibility'],
    ['My child talks about their day at school.', 'Relationship skills'],
    ['My child asks questions about how things work.', 'Critical thinking'],
    ['My child helps with small jobs at home.', 'Planning'],
  ] };
  // Direct items: [text, skill, index of the correct option]
  var FACES = [['Happy'], ['Sad'], ['Angry'], ['Scared']];
  var TPL_EMT = { intro: 'Read each question aloud. The child taps one of the four faces.', options: FACES, scoring: 'correct', items: [
    ['Which face looks happy?', 'Emotion awareness', 0], ['Which face looks sad?', 'Emotion awareness', 1],
    ['Which face looks angry?', 'Emotion awareness', 2], ['Which face looks scared?', 'Emotion awareness', 3],
    ['Find the face that feels the same as this one (happy).', 'Emotion awareness', 0], ['Find the face that feels the same as this one (scared).', 'Emotion awareness', 3],
    ['This child dropped their ice cream. How do they feel?', 'Empathy', 1], ['This child got a present. How do they feel?', 'Empathy', 0],
  ] };
  var TPL_HF = { intro: 'Show the practice rounds first, then run each block without stopping.', timed: 2,
    options: [['Tapped the correct side'], ['Tapped the wrong side'], ['No tap in time']], scoring: 'correct', items: [
    ['Practice: a heart appears — tap the same side.', 'Inhibitory Control', 0],
    ['Hearts block — 12 trials, tap the same side as the heart.', 'Inhibitory Control', 0],
    ['Practice: a flower appears — tap the opposite side.', 'Inhibitory Control', 0],
    ['Flowers block — 12 trials, tap the opposite side.', 'Inhibitory Control', 0],
    ['Mixed block — 33 trials, hearts and flowers mixed.', 'Cognitive Flexibility', 0],
  ] };
  // Not graded — feedback on the school, so no scores or skills.
  var TPL_CHECKIN = { intro: 'Ask each question somewhere calm and private. There are no right or wrong answers, and this part isn’t scored.',
    options: [['Yes', null], ['Sometimes', null], ['No', null]], scoring: 'none', items: [
    ['Do you feel safe at school?'], ['When you need help, does your teacher help you?'], ['Do you have a friend at school?'],
    ['Do you like coming to school?'], ['Do the grown-ups at school listen to you?'], ['Is anyone at school unkind to you?'],
    ['Do you feel happy in your classroom?'],
  ] };
  var TPL_BANKS = { teacher: TPL_TEACHER_OBS, parent: TPL_PARENT, emt: TPL_EMT, hf: TPL_HF, checkin: TPL_CHECKIN,
    // the 2025 cohort's version had 18 items
    teacher2025: Object.assign({}, TPL_TEACHER_OBS, { items: TPL_TEACHER_OBS.items.slice(0, 18) }) };
  // A builder question. type: 'section' | 'mc' | 'text'.
  function newQuestion(id, type, f) {
    return Object.assign({ id: id, type: type, title: '', desc: '', required: true, options: type === 'mc' ? [{ text: '', score: null }] : [],
      noneOfAbove: false, timed: false, seconds: 30, videoUrl: '', audioUrl: '', media: [], cond: null,
      scoring: type === 'mc' ? 'map' : 'none', skills: [], tr: {} }, f || {});
  }
  function bankQuestions(key, pre) {
    var b = TPL_BANKS[key]; if (!b) return [];
    var out = [newQuestion(pre + '-s0', 'section', { title: 'Before you start', desc: b.intro })];
    b.items.forEach(function (x, i) {
      out.push(newQuestion(pre + '-q' + (i + 1), 'mc', {
        title: x[0], scoring: b.scoring, timed: !!b.timed, seconds: b.timed || 30, skills: x[1] && TB_SKILL_OF[x[1]] ? [TB_SKILL_OF[x[1]]] : [],
        options: b.options.map(function (o, oi) { return { text: o[0], score: b.scoring === 'correct' ? (oi === x[2] ? 1 : 0) : (o[1] == null ? null : o[1]) }; }) }));
    });
    return out;
  }
  // Deep copy of a set of questions under new ids; conditions follow the copies.
  function copyQuestions(qs, prefix) {
    var ids = {}, out = (qs || []).map(function (q, i) { var c = JSON.parse(JSON.stringify(q)); c.id = prefix + '-q' + i; ids[q.id] = c.id; return c; });
    out.forEach(function (c) { if (c.cond) c.cond = ids[c.cond.q] ? { q: ids[c.cond.q], opt: c.cond.opt } : null; });
    return out;
  }
  // ---- Phase slots: { versions: [{ v, questions, publishedAt, publishedBy, note }], draft: { questions, from, updatedAt, updatedBy } | null }
  function slotOf(t, ph) { t.slots = t.slots || {}; return t.slots[ph] || (t.slots[ph] = { versions: [], draft: null }); }
  function liveVersion(t, ph) { var v = slotOf(t, ph).versions; return v.length ? v[v.length - 1] : null; }
  // Derived fields other screens read: phases with a live version, a status
  // ('Published' once anything is live) and when it was last published.
  function syncTemplate(t) {
    t.phases = TPL_PHASES.filter(function (ph) { return liveVersion(t, ph); });
    t.phase = t.phases[0] || null;
    t.status = t.phases.length ? 'Published' : 'Draft';
    t.hasDraft = TPL_PHASES.some(function (ph) { return slotOf(t, ph).draft; });
    t.publishedAt = TPL_PHASES.reduce(function (m, ph) { var lv = liveVersion(t, ph); return lv && lv.publishedAt > m ? lv.publishedAt : m; }, null);
  }
  TEMPLATES.forEach(function (t) {
    Object.assign(t, t.meta); delete t.meta; t.langs = [];
    var at = function (d) { return TODAY.getTime() - d * DAY; };
    TPL_PHASES.forEach(function (ph) {
      var plan = (t.plan || {})[ph], slot = slotOf(t, ph), pre = t.id + '-' + ph.toLowerCase();
      if (!plan) return;
      (plan.versions || []).forEach(function (x, i) {
        slot.versions.push({ v: i + 1, questions: bankQuestions(x[0], pre + '-v' + (i + 1)), publishedAt: at(x[1]), publishedBy: x[2], note: x[3] || '' });
      });
      if (plan.draft) slot.draft = { questions: bankQuestions(plan.draft[0], pre + '-d'), from: slot.versions.length || null, updatedAt: at(plan.draft[1]), updatedBy: plan.draft[2] };
    });
    delete t.plan; syncTemplate(t);
  });

  // ---- Deployments (status server-derived from window + publish state) ----
  function deriveDeploymentStatus(d) {
    if (!d.published) return 'Scheduled';
    var startIn = daysFromNow(d.start), endIn = daysFromNow(d.end);
    if (startIn > 0) return 'Scheduled';
    if (endIn < 0) return 'Ended';
    return 'Live';
  }
  function buildDeployments() {
    var deps = [];
    var r = rng(555);
    var named = ['greenfield', 'sunrise', 'lotus-valley', 'banyan-tree', 'colombo-kids', 'kandy-hill', 'riverside', 'little-sprouts'];
    named.forEach(function (sid, i) {
      var phase = pick(r, ['Baseline', 'Midline', 'Endline']);
      var startOff = between(r, -30, 5), endOff = startOff + between(r, 7, 30);
      deps.push({ id: 'dep-' + i, schoolId: sid, assessment: phase + ' · Teacher Report', audience: 'Teacher',
        phase: phase, type: 'Observation', start: iso(addDays(startOff)), end: iso(addDays(endOff)),
        published: r() > 0.2, chain: r() > 0.6, gamified: false });
    });
    // one gamified, one scheduled-but-overdue, one ending-soon
    deps.push({ id: 'dep-g', schoolId: 'greenfield', assessment: 'EMT · Direct Assessment', audience: 'Direct Assessment',
      phase: 'Midline', type: 'Self-Guided', start: iso(addDays(-4)), end: iso(addDays(2)), published: true, chain: true, gamified: true });
    deps.push({ id: 'dep-overdue', schoolId: 'sunrise', assessment: 'Baseline · Parent Report', audience: 'Parent',
      phase: 'Baseline', type: 'Observation', start: iso(addDays(-2)), end: iso(addDays(20)), published: false, chain: false, gamified: false });
    deps.forEach(function (d) { d.status = deriveDeploymentStatus(d); });
    return deps;
  }
  // Seeded schools deploy through the shared store — drop their old portfolio rows.
  var DEPLOYMENTS = buildDeployments().filter(function (d) { return !SEEDED_IDS[d.schoolId]; });

  // ---- Observation Form (§6.2): shared question bank + phase publish state + per-school access ----
  var SEL_SKILLS = ['Self-Awareness', 'Self-Management', 'Social Awareness', 'Relationship Skills', 'Responsible Decisions', 'Working Memory', 'Inhibitory Control', 'Cognitive Flexibility'];
  function buildObservation() {
    var stems = [
      'Names their own emotions accurately', 'Recognises how others are feeling', 'Waits for their turn without prompting',
      'Stays with a task until it is finished', 'Calms down after being upset', 'Asks for help when stuck',
      'Shares materials with peers', 'Follows multi-step instructions', 'Adapts when plans change',
      'Expresses disagreement respectfully', 'Includes others in play', 'Keeps trying after a mistake',
      'Remembers classroom routines', 'Resists distractions during work', 'Considers consequences before acting',
      'Shows empathy toward a hurt peer', 'Sets a simple goal and works toward it', 'Manages frustration during hard tasks',
      'Listens without interrupting', 'Offers to help a classmate', 'Reflects on their own behaviour',
    ];
    var r = rng(4242);
    var questions = stems.map(function (t, i) { return { id: 'q-' + (i + 1), text: t, skill: SEL_SKILLS[i % SEL_SKILLS.length], active: true }; });
    // Seed per-school access: ~44 of the active schools have this form's Pre phase.
    var actIds = activeSchools().map(function (s) { return s.id; });
    var access = {}; actIds.forEach(function (id, i) { access[id] = (rng(90 + i)() > 0.28); });
    return {
      questions: questions,
      phases: [
        { key: 'Pre', label: 'Pre / Baseline', published: true },
        { key: 'Mid', label: 'Mid / Midline', published: true },
        { key: 'Post', label: 'Post / Endline', published: false },
      ],
      access: access,
    };
  }
  var OBSERVATION = buildObservation();

  // ---- Self-Guided assessments (§6.3): gamified instruments ----
  var SELF_GUIDED = [
    { id: 'sg-emt1', name: 'EMT 1', full: 'Emotion Matching Task · Level 1', skills: ['SEL', 'Self-Awareness'], status: 'Published', questions: 18, desc: 'Match a face to the feeling it shows.' },
    { id: 'sg-emt2', name: 'EMT 2', full: 'Emotion Matching Task · Level 2', skills: ['SEL', 'Social Awareness'], status: 'Published', questions: 22, desc: 'Find two faces that show the same feeling.' },
    { id: 'sg-emt4', name: 'EMT 4', full: 'Emotion Matching Task · Level 4', skills: ['SEL', 'Social Awareness'], status: 'Draft', questions: 24, desc: 'Say how a character feels in a short story.' },
    { id: 'sg-hf', name: 'Hearts & Flowers', full: 'Hearts & Flowers', skills: ['Cognitive', 'Inhibitory Control', 'Cognitive Flexibility'], status: 'Published', questions: 48, desc: 'Classic inhibition / flexibility switching task.' },
    { id: 'sg-mem', name: 'Memory Game', full: 'Memory Game', skills: ['Cognitive', 'Working Memory'], status: 'Published', questions: 20, desc: 'Visuospatial working-memory span task.' },
  ];

  // ---- Share links: one per school per audience (school → Assessments → Links to share) ----
  // The parent (home) link carries the school's name slug, NOT its code: the code
  // also signs teachers up, so it must never travel home with families. Staff and
  // student-assessment links keep the code.
  function masterLinkUrl(school, slug) {
    var key = slug === 'parent' ? school.id : school.code;
    return 'https://measures.tilli.app/' + String(key).toLowerCase() + '/' + slug;
  }
  // One link for a whole school group: opens a pick-your-school page listing the
  // group's active schools, then continues to that school's normal flow.
  function groupLinkUrl(group, slug) { return 'https://measures.tilli.app/g/' + group.code + '/' + slug; }
  // Local prototype of that page (index.html reads ?group=&as=).
  function groupLinkPreview(group, role) { return 'index.html?group=' + encodeURIComponent(group.code) + '&as=' + role; }

  // ---- Results & Data (§6.6, formerly "AMES Data"): one inspectable row per deployment ----
  function buildResults() {
    var r = rng(2468);
    return DEPLOYMENTS.map(function (d, i) {
      var s = byId(d.schoolId);
      var expected = s ? Math.max(1, Math.round(s.students * (d.audience === 'Teacher' ? 0.05 : 0.9))) : 0;
      var responses = d.status === 'Scheduled' ? 0 : between(rng(30 + i), Math.round(expected * 0.2), expected);
      return { id: 'res-' + i, schoolId: d.schoolId, assessment: d.assessment, phase: d.phase, audience: d.audience,
        type: d.type, responses: responses, expected: expected,
        completion: expected ? Math.round(responses / expected * 100) : 0,
        updated: d.status === 'Scheduled' ? '—' : iso(addDays(-between(rng(60 + i), 0, 10))), status: d.status };
    });
  }
  var RESULTS = buildResults();

  // ---- Deletion logs (human vs System / Service Role) ----
  function buildDeletionLogs() {
    var logs = [];
    var r = rng(333);
    for (var i = 0; i < 18; i++) {
      var s = pick(r, SCHOOLS);
      var human = r() > 0.4;
      logs.push({ id: 'del-' + i, deletedAt: iso(addDays(-between(r, 0, 60))),
        studentName: pick(r, ['Aarav', 'Diya', 'Kabir', 'Sara', 'Vihaan', 'Anaya']) + ' ' + pick(r, COORD_LAST),
        code: 'ADM-' + between(r, 5000, 5999), gradeSection: 'Grade ' + between(r, 1, 5) + ' ' + pick(r, ['A', 'B']),
        schoolId: s.id, deletedBy: human ? pick(r, ['Meera Krishnan', 'Masoomi Shah']) : 'System / Service Role' });
    }
    return logs;
  }
  var DELETION_LOGS = buildDeletionLogs();

  // ---- Duplicate students (per §4.3 rule: same admission-# OR same normalised
  //      name within a school; suggestions only, never auto-merged) ----
  function buildDuplicatePairs() {
    // Seed a couple of believable dupes inside Little Sprouts (has a real roster).
    var pairs = [];
    if (TS && TS.students && TS.students.length > 3) {
      var a = TS.students[0], b = TS.students[1];
      pairs.push({
        schoolId: 'little-sprouts', reason: 'same-name',
        master: { id: a.adm, name: a.first + ' ' + a.last, admission: a.adm, gradeSection: a.grade + ' ' + a.section, assessments: 6 },
        duplicate: { id: a.adm + '-dup', name: (a.first + ' ' + a.last).toUpperCase(), admission: a.adm.replace('ADM-', 'ADM'), gradeSection: a.grade + ' ' + a.section, assessments: 0 },
      });
      pairs.push({
        schoolId: 'little-sprouts', reason: 'same-admission',
        master: { id: b.adm, name: b.first + ' ' + b.last, admission: b.adm, gradeSection: b.grade + ' ' + b.section, assessments: 4 },
        duplicate: { id: b.adm + '-dup', name: b.first + ' ' + b.last.slice(0, 3), admission: b.adm, gradeSection: b.grade + ' B', assessments: 2 },
      });
    }
    return pairs;
  }
  var DUPLICATES = buildDuplicatePairs();

  // ---- Merge history (incl. the "0 re-linked" data smell to surface) ----
  var MERGE_HISTORY = [
    { id: 'mh-1', date: iso(addDays(-3)), schoolId: 'little-sprouts', master: 'Anaya Menon', duplicate: 'ANAYA MENON', relinked: 6, skipped: 0 },
    { id: 'mh-2', date: iso(addDays(-9)), schoolId: 'greenfield', master: 'Rhea Kapoor', duplicate: 'Rhea K.', relinked: 0, skipped: 0 },
    { id: 'mh-3', date: iso(addDays(-15)), schoolId: 'sunrise', master: 'Kabir Shah', duplicate: 'Kabir S', relinked: 0, skipped: 0 },
    { id: 'mh-4', date: iso(addDays(-22)), schoolId: 'banyan-tree', master: 'Sara Raman', duplicate: 'sara raman', relinked: 3, skipped: 1 },
  ];

  // ---- Health monitor state ----
  var HEALTH = {
    state: 'healthy', // 'healthy' | 'degraded' | 'down'
    since: iso(addDays(-2)),
    incidents: [
      { at: iso(addDays(-2)), state: 'healthy', note: 'Recovered — assessment API latency normal.' },
      { at: iso(addDays(-2)), state: 'degraded', note: 'Elevated latency on assessment submissions (18m).' },
      { at: iso(addDays(-14)), state: 'healthy', note: 'No incidents.' },
    ],
  };

  // ---- Audit trail (§8.4 minimal — append-only feed of gated actions) ----
  var AUDIT = [
    { at: TODAY.getTime() - 3600e3 * 2,  actor: 'Meera Krishnan', action: 'template.publish', entity: 'Baseline · Teacher Report', entityType: 'template' },
    { at: TODAY.getTime() - 3600e3 * 5,  actor: 'Masoomi Shah',   action: 'student.merge',     entity: 'Anaya Menon ← ANAYA MENON', entityType: 'student', schoolId: 'little-sprouts' },
    { at: TODAY.getTime() - 3600e3 * 27, actor: 'System / Service Role', action: 'student.delete', entity: '4 students', entityType: 'student', schoolId: 'sunrise' },
    { at: TODAY.getTime() - 3600e3 * 30, actor: 'Ishani Rao',     action: 'school.add',        entity: 'Compassion International', entityType: 'school', schoolId: 'compassion-intl' },
    { at: TODAY.getTime() - 3600e3 * 49, actor: 'Meera Krishnan', action: 'role.change',       entity: 'Rita Fernandes → School Admin', entityType: 'user' },
    { at: TODAY.getTime() - 3600e3 * 52, actor: 'Meera Krishnan', action: 'deployment.create', entity: 'Midline · EMT (Greenfield)', entityType: 'deployment', schoolId: 'greenfield' },
    { at: TODAY.getTime() - 3600e3 * 70, actor: 'Ishani Rao',     action: 'invitation.resend', entity: 'admin@nmajs.edu', entityType: 'invitation' },
  ];
  // audit log is mutable at runtime (gated actions append here in the demo)
  function logAudit(actor, action, entity, entityType, schoolId) {
    AUDIT.unshift({ at: TODAY.getTime(), actor: actor || 'Tilli Team', action: action, entity: entity, entityType: entityType, schoolId: schoolId });
  }

  // ============================================================
  //  SERVER-COMPUTED VIEWS  (client renders these; never re-derives)
  // ============================================================
  var sum = function (arr, f) { return arr.reduce(function (a, x) { return a + (f ? f(x) : x); }, 0); };

  // ---- Empty grade / section auto-removal ----
  function sectionHeadcount(g) { return g.sections.length ? sum(g.sections, function (x) { return x.students || 0; }) : (parseInt(g.students, 10) || 0); }
  function removalDueMs(item) { return new Date(item.addedAt).getTime() + EMPTY_STRUCTURE_TTL_DAYS * DAY; }
  function structureDaysLeft(item) { return Math.max(0, Math.min(EMPTY_STRUCTURE_TTL_DAYS, Math.ceil((removalDueMs(item) - TODAY.getTime()) / DAY))); }
  // Empty sections (and section-less empty grades) still inside their window.
  function emptyStructure(s) {
    var out = [];
    ((s.structure && s.structure.grades) || []).forEach(function (g) {
      if (g.sections.length) g.sections.forEach(function (sec) { if (!sec.students) out.push({ grade: g.grade, section: sec.name, daysLeft: structureDaysLeft(sec) }); });
      else if (!sectionHeadcount(g)) out.push({ grade: g.grade, section: null, daysLeft: structureDaysLeft(g) });
    });
    return out;
  }
  // The daily job, run once at load against TODAY. Removes expired empty
  // sections; a grade goes too once it has no sections and no students left.
  // Each removal is logged to the audit trail (dated when it was due) and kept
  // on structure.removed so the hub can offer "Add back".
  function pruneEmptyStructure(s) {
    if (s.created || s.archived || !s.structure) return;   // created schools live in TilliAPI — see tracker
    var removed = s.structure.removed || (s.structure.removed = []);
    var now = TODAY.getTime();
    s.structure.grades = s.structure.grades.filter(function (g) {
      var gone = g.sections.filter(function (sec) { return !sec.students && removalDueMs(sec) <= now; });
      var keep = g.sections.filter(function (sec) { return gone.indexOf(sec) < 0; });
      var wholeGrade = !keep.length && !sectionHeadcount({ sections: [], students: g.students }) && removalDueMs(g) <= now;
      if (!gone.length && !wholeGrade) return true;
      var dueMs = Math.max.apply(null, gone.map(removalDueMs).concat(wholeGrade ? [removalDueMs(g)] : []));
      var names = gone.map(function (x) { return x.name; });
      removed.push({ grade: g.grade, sections: names, wholeGrade: wholeGrade, removedAt: iso(dueMs) });
      AUDIT.push({ at: dueMs, actor: SYSTEM_ACTOR, action: 'school.structure.auto', entityType: 'school', schoolId: s.id,
        entity: (wholeGrade ? g.grade : g.grade + ' · ' + names.join(', ')) + ' (empty ' + EMPTY_STRUCTURE_TTL_DAYS + ' days)' });
      g.sections = keep;
      return !wholeGrade;
    });
    recomputeStructure(s);
  }
  SCHOOLS.forEach(pruneEmptyStructure);
  AUDIT.sort(function (a, b) { return b.at - a.at; });

  // Open issues for a school: each human report counts once, auto-crash reports
  // count once per crash signature (they're grouped the same way on Issue Reports).
  function openIssueCount(schoolId) {
    var sigs = {}, n = 0;
    ISSUES.forEach(function (i) {
      if (i.schoolId !== schoolId || i.status !== 'open') return;
      if (i.autoCrash) { if (!sigs[i.crashSig]) { sigs[i.crashSig] = 1; n++; } } else n++;
    });
    return n;
  }

  // Onboarding flags for a single school (mirrors Control-Room logic, scoped).
  function schoolFlags(s) {
    var f = [];
    if (!s.archived && s.students === 0) f.push({ key: 'no-students', label: '0 students' });
    if (!s.archived && s.staff === 0)    f.push({ key: 'no-staff',    label: '0 staff' });
    // Live / created schools deploy through the shared store; everyone else through the portfolio list.
    var live = ((s.live || s.created) && window.TilliAPI)
      ? window.TilliAPI.getDeployments(s.id).some(function (d) { return d.status === 'Live'; })
      : DEPLOYMENTS.some(function (d) { return d.schoolId === s.id && d.status === 'Live'; });
    if (!s.archived && !live)            f.push({ key: 'no-deployment', label: 'No active deployment' });
    var soon = s.archived ? [] : emptyStructure(s).filter(function (x) { return x.daysLeft <= EMPTY_STRUCTURE_WARN_DAYS; });
    if (soon.length) {
      var first = Math.min.apply(null, soon.map(function (x) { return x.daysLeft; }));
      f.push({ key: 'empty-structure', label: soon.length + ' empty section' + (soon.length === 1 ? '' : 's') + ' · auto-remove in ' + first + ' day' + (first === 1 ? '' : 's') });
    }
    return f;
  }

  // Control Room: needs-attention queue cards + stats + recent activity.
  function controlRoom() {
    var act = activeSchools();
    var openIssues = ISSUES.filter(function (i) { return i.status === 'open'; });
    var zeroStudents = act.filter(function (s) { return s.students === 0; });
    var noRole = USERS.filter(function (u) { return u.role === 'none' && !u.schoolId; });
    var expiringInv = INVITATIONS.filter(function (i) {
      if (i.status === 'Activated') return false;
      var d = inviteDaysLeft(i);
      return i.status === 'Expired' || (d >= 0 && d <= 7);
    });
    var draftTpls = TEMPLATES.filter(function (t) { return t.hasDraft && !t.archived; });   // a phase draft waiting to be published
    var depsAttn = DEPLOYMENTS.filter(function (d) {
      if (d.status === 'Live') return daysFromNow(d.end) <= 3;
      if (d.status === 'Scheduled') return daysFromNow(d.start) < 0; // start passed, not flipped
      return false;
    });

    // Class sizes (shared roster store): new students a teacher asked to add over
    // the expected size, and classes still short of it or with no size set.
    var API = window.TilliAPI, pendingKids = [], shortClasses = [];
    var yearReqs = API && API.openYearRequests ? API.openYearRequests() : [];
    var calQ = API && API.calendarQueue ? API.calendarQueue() : [];
    if (API && API.pendingStudents) {
      pendingKids = API.pendingStudents();
      act.forEach(function (s) { API.schoolRooms(s.id).forEach(function (r) { if (r.expected == null || !r.confirmed || r.added < r.expected) shortClasses.push(r); }); });
    }

    var cards = [
      { key: 'issues', label: 'Open issues', count: openIssues.length, severity: 3, deeplink: '#/issues?status=open' },
      { key: 'year-requests', label: 'Schools asking to start next year', count: yearReqs.length, severity: 2,
        deeplink: yearReqs.length === 1 ? '#/school?id=' + encodeURIComponent(yearReqs[0].school_id) + '&tab=assessments' : '#/schools?flag=year-request' },
      { key: 'calendars', label: 'School calendars to review', count: calQ.length, severity: 2,
        deeplink: calQ.length === 1 ? '#/school?id=' + encodeURIComponent(calQ[0].school_id) + '&tab=assessments' : '#/schools?flag=calendar' },
      { key: 'student-requests', label: 'New students to approve', count: pendingKids.length, severity: 2, deeplink: '#/class-sizes' },
      { key: 'short-classes', label: 'Classes missing students', count: shortClasses.length, severity: 1, deeplink: '#/class-sizes?view=classes' },
      { key: 'zero-students', label: 'Schools with 0 students', count: zeroStudents.length, severity: 2, deeplink: '#/schools?flag=zero-students', items: zeroStudents.map(function (s) { return { id: s.id, label: s.name }; }) },
      { key: 'no-role', label: 'Users with no role', count: noRole.length, severity: 1, deeplink: '#/users?role=none' },
      { key: 'invites', label: 'Expiring / expired invitations', count: expiringInv.length, severity: 2, deeplink: '#/invitations?filter=attention' },
      { key: 'duplicates', label: 'Duplicate students detected', count: DUPLICATES.length, severity: 2, deeplink: '#/merge?suggested=1' },
      { key: 'drafts', label: 'Draft assessments', count: draftTpls.length, severity: 1, deeplink: '#/templates?status=Draft' },
      { key: 'deployments', label: 'Deployments needing attention', count: depsAttn.length, severity: 2, deeplink: '#/deployments?filter=attention' },
    ];
    // health floats to the top when not healthy; otherwise severity desc, then count desc.
    cards.sort(function (a, b) { return (b.severity - a.severity) || (b.count - a.count); });

    var stats = [
      { key: 'groups', label: 'School Groups', value: GROUPS.filter(function (g) { return g.id !== 'g-none'; }).length, delta: 1 },
      { key: 'schools', label: 'Active Schools', value: act.length, delta: 3, deeplink: '#/schools' },
      { key: 'students', label: 'Total Students', value: sum(act, function (s) { return s.students; }), delta: 412 },
      { key: 'staff', label: 'Staff Members', value: USERS.filter(isSchoolStaff).length, deeplink: '#/users?kind=staff' },
    ];

    return { cards: cards, stats: stats };
  }

  function actionLabel(a) {
    return ({
      'template.publish': 'published template', 'template.create': 'created template',
      'template.duplicate': 'duplicated template', 'template.delete': 'deleted template', 'template.edit': 'edited template',
      'template.archive': 'archived template', 'template.unarchive': 'restored template',
      'student.merge': 'merged students', 'student.delete': 'deleted students', 'student.add': 'imported students', 'student.edit': 'edited student',
      'student.approve': 'approved new student', 'student.reject': 'turned down new student', 'school.size': 'set expected class size',
      'school.add': 'added school', 'school.code': 'changed school code', 'deployment.rules': 'changed scheduling rules', 'year.start': 'started academic year', 'school.archive': 'archived school', 'school.delete': 'deleted school', 'school.edit': 'edited school', 'school.structure': 'updated grades / sections', 'school.structure.auto': 'auto-removed empty',
      'role.change': 'changed role', 'deployment.create': 'created deployment', 'deployment.end': 'ended deployment',
      'observation.publish': 'published observation phase', 'observation.access': 'changed form access',
      'selfguided.publish': 'published self-guided game', 'selfguided.edit': 'edited self-guided game',
      'group.create': 'created group', 'group.rename': 'renamed group', 'group.delete': 'deleted group',
      'group.archive': 'archived group', 'group.unarchive': 'restored group',
      'invitation.resend': 'resent invitation', 'invitation.send': 'sent invitation', 'invitation.revoke': 'revoked invitation',
    })[a] || a;
  }
  function recentActivity(n) {
    return AUDIT.slice(0, n).map(function (e) {
      return { at: e.at, actor: e.actor, action: e.action, actionLabel: actionLabel(e.action),
        entity: e.entity, entityType: e.entityType, schoolId: e.schoolId };
    });
  }

  // Single-school summary (the §4.2 "GET /schools/:id/summary" object).
  // Created schools compute EVERYTHING from the shared TilliAPI store (real
  // roster + real deploy/completion), so the platform-admin hub agrees with
  // what teachers/parents actually did.
  function createdSchoolSummary(s) {
    var API = window.TilliAPI, id = s.id;
    var studentIds = API.studentsForSchool(id).map(function (x) { return x.student_id; });
    var AUDS = ['Teacher', 'Parent', 'Direct Assessment'];
    var phaseState = ['Baseline', 'Midline', 'Endline'].map(function (ph) {
      var lanes = AUDS.map(function (a) { return API.completionStats(id, ph, a, studentIds); })
                      .filter(function (c) { return c.status !== 'Not deployed'; });
      if (!lanes.length) return { phase: ph, deployed: false, status: null, window: null, completion: null };
      var done = lanes.reduce(function (a, c) { return a + c.done; }, 0);
      var exp = lanes.reduce(function (a, c) { return a + c.expected; }, 0);
      var anyLive = lanes.some(function (c) { return c.status === 'Live'; });
      var allSched = lanes.every(function (c) { return c.status === 'Scheduled'; });
      var first = lanes[0], kids = API.childrenDone(id, ph, studentIds);
      return { phase: ph, deployed: true, status: anyLive ? 'Live' : (allSched ? 'Scheduled' : 'Ended'),
        window: first.start ? first.start + ' → ' + first.end : null, completion: kids.pct || 0, kidsDone: kids.done, kidsTotal: kids.total };
    });
    var staff = API.staffFor(id);
    var secs = API.sectionsForSchool(id);
    var secName = function (secId) { var x = secs.find(function (v) { return v.section_id === secId; }); return x ? x.name : null; };
    var staff_users = staff.map(function (u) {
      return { name: u.name, email: u.email, role: u.role === 'coordinator' ? 'School Admin' : 'Teacher',
        schoolId: id, sections: u.section_id ? [secName(u.section_id)].filter(Boolean) : [] };
    });
    return {
      school: s, structure: s.structure, assessment_progress: phaseState,
      flags: schoolFlags(s),
      counts: { students: s.students, staff: s.staff,
        openIssues: 0, invitations: INVITATIONS.filter(function (i) { return i.schoolId === id; }).length,
        deployments: API.getDeployments(id).length, deletions: 0 },
      staff_users: staff_users,
      invitations: INVITATIONS.filter(function (i) { return i.schoolId === id; }),
      issues: [], deployments: [], deletions: [], duplicates: [],
    };
  }
  function schoolSummary(id) {
    var s = byId(id); if (!s) return null;
    if (s.created && window.TilliAPI) return createdSchoolSummary(s);
    // The live demo school deploys through the shared store, like created schools —
    // its old portfolio row would contradict what the planner shows.
    var deps = s.live && window.TilliAPI ? [] : DEPLOYMENTS.filter(function (d) { return d.schoolId === id; });
    var apiProgress = s.live && window.TilliAPI ? createdSchoolSummary(s).assessment_progress : null;
    var phaseState = apiProgress || ['Baseline', 'Midline', 'Endline'].map(function (ph) {
      var d = deps.filter(function (x) { return x.phase === ph; }).sort(function (a, b) { return (b.status === 'Live') - (a.status === 'Live'); })[0];
      return { phase: ph, deployed: !!d, status: d ? d.status : null,
        window: d ? d.start + ' → ' + d.end : null,
        completion: d ? (ph === 'Baseline' ? s.completion : Math.max(0, s.completion - 15)) : null };
    });
    return {
      school: s,
      structure: s.structure,
      assessment_progress: phaseState,
      flags: schoolFlags(s),
      counts: {
        students: s.students, staff: s.staff,
        openIssues: ISSUES.filter(function (i) { return i.schoolId === id && i.status === 'open'; }).length,
        invitations: INVITATIONS.filter(function (i) { return i.schoolId === id; }).length,
        deployments: deps.length,
        deletions: DELETION_LOGS.filter(function (d) { return d.schoolId === id; }).length,
      },
      // lazy-loaded tab data (mock returns it all; a real API would page it)
      staff_users: USERS.filter(function (u) { return u.schoolId === id; }),
      invitations: INVITATIONS.filter(function (i) { return i.schoolId === id; }),
      issues: ISSUES.filter(function (i) { return i.schoolId === id; }),
      deployments: deps,
      deletions: DELETION_LOGS.filter(function (d) { return d.schoolId === id; }),
      duplicates: DUPLICATES.filter(function (d) { return d.schoolId === id; }),
    };
  }

  // Student directory: a global roster. Real rosters only exist for the live
  // school; the rest are synthesised on demand from counts (lookup-only).
  function studentDirectory() {
    var rows = [];
    if (TS && TS.students) TS.students.forEach(function (st) {
      rows.push({ name: st.first + ' ' + st.last, admission: st.adm, schoolId: 'little-sprouts',
        gradeSection: st.grade + ' ' + st.section });
    });
    return rows; // Phase 1: directory shows the one school with a real roster.
  }

  // ---- Write helpers (§9 gated actions; v1 always-pass). Server owns derivation. ----
  function createGroup(name) {
    var id = 'g-' + normName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + GROUPS.length;
    var base = normName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group', code = base, n = 1;
    while (GROUPS.some(function (x) { return x.code === code; })) code = base + '-' + (++n);
    var g = { id: id, name: name, code: code, archived: false, archivedAt: null };
    GROUPS.push(g);
    return g;
  }
  // Real "POST /schools" for the Add-School wizard. Builds a live SCHOOLS
  // record (structure, code, group, optional first admin) so the new school
  // renders on its hub, in the portfolio, and in Control-Room stats.
  function makeSchoolCode(name) {
    var base = String(name || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    while (base.length < 4) base += 'X';
    var code, tries = 0;
    do { code = base + '-' + (1000 + Math.floor(Math.random() * 9000)); tries++; }
    while (SCHOOLS.some(function (s) { return s.code === code; }) && tries < 60);
    return code;
  }
  function createSchool(input) {
    input = input || {};

    // Preferred path: materialise a REAL school (roster + claim codes + a
    // teacher per section + a coordinator + join code) in the shared TilliAPI
    // store, so the teacher/parent/coordinator apps can all consume it. Falls
    // back to the old in-memory-only record if TilliAPI isn't present.
    if (window.TilliAPI && window.TilliAPI.createSchoolFull) {
      var res = window.TilliAPI.createSchoolFull({
        name: input.name, board: input.board, boards: input.boards, city: input.city, country: input.country,
        grades: input.grades, admin: input.admin, yearStart: input.yearStart, yearEnd: input.yearEnd,
        groupId: input.groupId && input.groupId !== 'g-none' ? input.groupId : null,
      });
      if (res && res.ok) {
        var api = window.TilliAPI.resolveSchool(res.school_id);
        var s = buildOrgRecordFromApi(api);
        var group = GROUPS.find(function (g) { return g.id === input.groupId; }) || GROUPS[0];
        s.groupId = group.id; s.groupName = group.name;
        if (input.stage) s.stage = input.stage;
        if (input.joined) s.joined = input.joined;
        s.claimSamples = res.claimSamples;   // stashed for the runbook panel on the hub
        SCHOOLS.unshift(s);
        USERS.push({ id: 'u-admin-' + s.id, name: res.coordinator.name, email: res.coordinator.email,
          role: 'School Admin', schoolId: s.id, sections: [] });
        INVITATIONS.unshift({ id: 'inv-' + s.id, name: res.coordinator.name, email: res.coordinator.email,
          role: 'School Admin', schoolId: s.id, status: 'Account Created',
          delivery: 'Email sent', created: iso(new Date()), expires: iso(new Date(Date.now() + 14 * DAY)), real: true });   // real date, not the demo date
        return s;
      }
    }

    // ---- fallback: original in-memory record (no shared store) ----
    var name = String(input.name || '').trim();
    var slugBase = normName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'school';
    var id = slugBase, n = 1;
    while (byId(id)) { id = slugBase + '-' + (++n); }

    var grades = (input.grades || []).map(function (g) {
      return { grade: g.grade, base: g.base || '', students: Math.max(0, parseInt(g.students, 10) || 0), sections: (g.sections || []).map(function (sec) {
        return { name: sec.name, base: sec.base || sec.name, students: Math.max(0, parseInt(sec.students, 10) || 0) };
      }) };
    }).filter(function (g) { return g.grade; });
    var sectionTotal = grades.reduce(function (a, g) { return a + g.sections.length; }, 0);
    // A sectionless grade contributes its own grade-level count; otherwise the
    // sections carry the students.
    var studentTotal = grades.reduce(function (a, g) {
      return a + (g.sections.length ? g.sections.reduce(function (b, sec) { return b + sec.students; }, 0) : g.students);
    }, 0);

    var group = GROUPS.find(function (g) { return g.id === input.groupId; }) || GROUPS[0];
    var admin = (input.admin && String(input.admin.email || '').trim()) ? input.admin : null;

    var s = {
      id: id, live: false, code: makeSchoolCode(name), name: name,
      type: input.type || 'Independent school',
      city: input.city || '', country: input.country || '', region: input.country || '',
      board: input.board || 'Other', boards: input.boards || null, groupId: group.id, groupName: group.name,
      students: studentTotal, staff: admin ? 1 : 0,
      coordinator: admin ? { name: (admin.name || admin.email).trim(), email: admin.email.trim() }
                         : { name: '—', email: '' },
      joined: input.joined || 'Sep 2025',
      stage: input.stage || 'onboarding', status: 'active',
      sessionsPerWeek: 0, completion: 0, sel: null, cog: null, archived: false,
      structure: { grades: grades, sections: sectionTotal },
      gradeCount: grades.length, sectionCount: sectionTotal,
    };
    SCHOOLS.unshift(s);

    if (admin) {
      USERS.push({ id: 'u-admin-' + id, name: (admin.name || admin.email).trim(), email: admin.email.trim(),
        role: 'School Admin', schoolId: id, sections: [] });
      INVITATIONS.unshift({ id: 'inv-' + id, name: (admin.name || admin.email).trim(), email: admin.email.trim(),
        role: 'School Admin', schoolId: id, status: 'Account Created',
        delivery: 'Email sent', created: iso(new Date()), expires: iso(new Date(Date.now() + 14 * DAY)), real: true });   // real date, not the demo date
    }
    return s;
  }
  // Template writes stamp who/when (actor = the signed-in Tilli team member).
  function touchTemplate(t, actor) { t.updatedAt = Date.now(); t.updatedBy = actor || 'Tilli Team'; }
  // New template: no phases set up yet. Duplicate (src): each phase's live
  // version (else its draft) becomes a draft of the copy — nothing is live.
  function createTemplate(t, actor, src) {
    var now = Date.now();
    var tpl = { id: 'tpl-' + now, title: t.title, audience: t.audience, desc: t.desc || '', createdAt: now, createdBy: actor || 'Tilli Team',
      updatedAt: now, updatedBy: actor || 'Tilli Team', archived: false, langs: src ? (src.langs || []).slice() : [], slots: {} };
    if (src) TPL_PHASES.forEach(function (ph) {
      var from = liveVersion(src, ph) || slotOf(src, ph).draft;
      if (from) slotOf(tpl, ph).draft = { questions: copyQuestions(from.questions, tpl.id + '-' + ph.toLowerCase()), from: null, updatedAt: now, updatedBy: actor || 'Tilli Team' };
    });
    syncTemplate(tpl);
    TEMPLATES.unshift(tpl);
    return tpl;
  }
  function tplById(id) { return TEMPLATES.find(function (x) { return x.id === id; }); }
  // Start (or keep) a draft of a phase — a copy of the live version, or empty.
  function startDraft(id, ph, actor) {
    var t = tplById(id); if (!t) return null;
    var slot = slotOf(t, ph);
    if (!slot.draft) {
      var lv = liveVersion(t, ph);
      slot.draft = { questions: lv ? copyQuestions(lv.questions, t.id + '-' + ph.toLowerCase() + '-' + Date.now().toString(36)) : [], from: lv ? lv.v : null, updatedAt: Date.now(), updatedBy: actor || 'Tilli Team' };
      syncTemplate(t);
    }
    return slot.draft;
  }
  // Replace a phase's draft with a copy of another phase (its live version, else its draft).
  function copyPhaseIntoDraft(id, ph, srcPh, actor) {
    var t = tplById(id); if (!t) return null;
    var src = liveVersion(t, srcPh) || slotOf(t, srcPh).draft; if (!src) return null;
    var slot = slotOf(t, ph);
    slot.draft = { questions: copyQuestions(src.questions, t.id + '-' + ph.toLowerCase() + '-' + Date.now().toString(36)), from: slot.draft ? slot.draft.from : null, updatedAt: Date.now(), updatedBy: actor || 'Tilli Team' };
    syncTemplate(t); touchTemplate(t, actor); return slot.draft;
  }
  // Draft → the next version, which becomes live for NEW deployments
  // (windows already running keep the version they started with).
  function publishDraft(id, ph, actor) {
    var t = tplById(id); if (!t) return null;
    var slot = slotOf(t, ph); if (!slot.draft) return null;
    var ver = { v: slot.versions.length + 1, questions: slot.draft.questions, publishedAt: Date.now(), publishedBy: actor || 'Tilli Team', note: '' };
    slot.versions.push(ver); slot.draft = null;
    syncTemplate(t); touchTemplate(t, actor); return ver;
  }
  function discardDraft(id, ph, actor) {
    var t = tplById(id); if (!t) return;
    slotOf(t, ph).draft = null; syncTemplate(t); touchTemplate(t, actor);
  }
  // An old version comes back as the draft (replacing any draft in progress).
  function restoreVersion(id, ph, v, actor) {
    var t = tplById(id); if (!t) return null;
    var slot = slotOf(t, ph), old = slot.versions.find(function (x) { return x.v === v; }); if (!old) return null;
    slot.draft = { questions: copyQuestions(old.questions, t.id + '-' + ph.toLowerCase() + '-r' + Date.now().toString(36)), from: v, restoredFrom: v, updatedAt: Date.now(), updatedBy: actor || 'Tilli Team' };
    syncTemplate(t); touchTemplate(t, actor); return slot.draft;
  }
  function archiveTemplate(id, on, actor) {
    var t = TEMPLATES.find(function (x) { return x.id === id; }); if (!t) return null;
    t.archived = !!on; touchTemplate(t, actor); return t;
  }
  function deleteTemplate(id) { var i = TEMPLATES.findIndex(function (x) { return x.id === id; }); if (i >= 0) TEMPLATES.splice(i, 1); }
  function createDeployment(d) {
    var dep = { id: 'dep-' + Date.now(), schoolId: d.schoolId, assessment: d.assessment, audience: d.audience,
      phase: d.phase, type: d.type || 'Observation', start: d.start, end: d.end,
      published: d.published !== false, chain: !!d.chain, gamified: !!d.gamified,
      mode: d.mode || (d.audience === 'Parent' ? 'home' : 'school') };
    dep.status = deriveDeploymentStatus(dep);
    DEPLOYMENTS.unshift(dep);
    return dep;
  }
  function endDeployment(id) {
    var d = DEPLOYMENTS.find(function (x) { return x.id === id; }); if (!d) return null;
    d.end = iso(TODAY); d.published = true; d.status = 'Ended'; return d;
  }
  function setObsPhasePublish(key, published) {
    var p = OBSERVATION.phases.find(function (x) { return x.key === key; }); if (p) p.published = published; return p;
  }
  function setObsAccess(schoolId, granted) { OBSERVATION.access[schoolId] = granted; }
  function setObsAccessAll(granted) { activeSchools().forEach(function (s) { OBSERVATION.access[s.id] = granted; }); }
  function obsAccessCount() { return activeSchools().filter(function (s) { return OBSERVATION.access[s.id]; }).length; }

  // ---- Super-Admin edit helpers (v1 has full access; these do the real write) ----
  function updateTemplate(id, patch, actor) {
    var t = TEMPLATES.find(function (x) { return x.id === id; }); if (!t) return null;
    ['title', 'audience', 'desc'].forEach(function (k) { if (patch[k] != null) t[k] = patch[k]; });
    touchTemplate(t, actor);
    return t;
  }
  function renameGroup(id, name) {
    var g = GROUPS.find(function (x) { return x.id === id; }); if (!g) return null;
    g.name = name; SCHOOLS.forEach(function (s) { if (s.groupId === id) s.groupName = name; }); return g;
  }
  // Archive / restore a whole group. Archiving takes every school in it down
  // with it (marked archivedByGroup); restoring brings back only those, so a
  // school that was archived on its own beforehand stays archived.
  function archiveGroup(id, on) {
    var g = GROUPS.find(function (x) { return x.id === id; }); if (!g || id === 'g-none') return null;
    g.archived = !!on; g.archivedAt = on ? iso(Date.now()) : null;
    SCHOOLS.forEach(function (s) {
      if (s.groupId !== id) return;
      if (on && !s.archived) { s.archived = true; s.archivedByGroup = true; }
      else if (!on && s.archivedByGroup) { s.archived = false; s.archivedByGroup = false; }
    });
    return g;
  }
  var activeGroups = function () { return GROUPS.filter(function (g) { return !g.archived; }); };
  var groupByCode = function (code) { return GROUPS.find(function (g) { return g.code && g.code === code; }) || null; };
  function deleteGroup(id) {
    if (id === 'g-none') return;
    SCHOOLS.forEach(function (s) {
      if (s.groupId !== id) return;
      s.groupId = 'g-none'; s.groupName = 'No group';
      if (s.created && window.TilliAPI && window.TilliAPI.setSchoolGroup) window.TilliAPI.setSchoolGroup(s.id, null);
    });
    var i = GROUPS.findIndex(function (g) { return g.id === id; }); if (i >= 0) GROUPS.splice(i, 1);
  }
  // Permanently remove a school. Guarded: only an already-archived school can
  // be deleted, so this can never fire on a live one. Also strips its users and
  // invitations so no orphan roster rows linger.
  function deleteSchool(id) {
    var i = SCHOOLS.findIndex(function (s) { return s.id === id; });
    if (i < 0) return false;
    if (!SCHOOLS[i].archived) return false;   // must archive first
    SCHOOLS.splice(i, 1);
    for (var u = USERS.length - 1; u >= 0; u--) { if (USERS[u].schoolId === id) USERS.splice(u, 1); }
    for (var v = INVITATIONS.length - 1; v >= 0; v--) { if (INVITATIONS[v].schoolId === id) INVITATIONS.splice(v, 1); }
    return true;
  }
  function updateSchool(id, patch) {
    var s = byId(id); if (!s) return null;
    ['name', 'type', 'city', 'country', 'region'].forEach(function (k) { if (patch[k] != null) s[k] = patch[k]; });
    if (Array.isArray(patch.boards) && patch.boards.length) {
      s.boards = patch.boards.slice(); s.board = s.boards.join(', ');
      if (s.created && window.TilliAPI && window.TilliAPI.setSchoolBoards) window.TilliAPI.setSchoolBoards(s.id, s.boards);
    }
    if (patch.groupId != null) {
      s.groupId = patch.groupId; s.groupName = (GROUPS.find(function (g) { return g.id === patch.groupId; }) || GROUPS[0]).name;
      if (s.created && window.TilliAPI && window.TilliAPI.setSchoolGroup) window.TilliAPI.setSchoolGroup(s.id, patch.groupId);
    }
    return s;
  }
  function setUserRole(email, role) { var u = USERS.find(function (x) { return x.email === email; }); if (u) u.role = role; return u; }
  function recomputeStructure(s) {
    s.structure.sections = s.structure.grades.reduce(function (a, g) { return a + g.sections.length; }, 0);
    s.gradeCount = s.structure.grades.length; s.sectionCount = s.structure.sections;
  }
  // New grades/sections start their own empty-structure clock today.
  function addSection(schoolId, gradeName, sectionName) {
    var s = byId(schoolId); if (!s) return null;
    var g = s.structure.grades.find(function (x) { return x.grade === gradeName; }); if (!g) return null;
    var nm = sectionName && !g.sections.some(function (x) { return x.name === sectionName; }) ? sectionName : nextSectionName(g);
    g.sections.push({ name: nm, base: nm, students: 0, addedAt: iso(TODAY) });
    recomputeStructure(s); return s;
  }
  // base = fixed grade (TilliAPI.BASE_GRADES) the school's name maps to.
  function addGrade(schoolId, name, sectionNames, base) {
    var s = byId(schoolId); if (!s) return null;
    if (!s.structure.grades.some(function (g) { return g.grade === name; })) {
      s.structure.grades.push({ grade: name, base: base || '', addedAt: iso(TODAY),
        sections: (sectionNames && sectionNames.length ? sectionNames : ['A']).map(function (n) { return { name: n, base: n, students: 0, addedAt: iso(TODAY) }; }) });
      recomputeStructure(s);
    }
    return s;
  }
  // Rename a grade / section. The base is locked first so it never changes.
  // Created schools live in TilliAPI (students + invites carry the names too);
  // their structure is re-read from there so the hub matches.
  function inferBase(name) { return window.TilliAPI && window.TilliAPI.inferBaseGrade ? window.TilliAPI.inferBaseGrade(name) : ''; }
  function refreshCreatedStructure(s) {
    var fresh = buildOrgRecordFromApi(window.TilliAPI.resolveSchool(s.id));
    s.structure = fresh.structure; s.gradeCount = fresh.gradeCount; s.sectionCount = fresh.sectionCount;
  }
  function renameGrade(schoolId, oldName, newName) {
    var s = byId(schoolId); newName = String(newName || '').trim();
    if (!s || !newName) return { ok: false, reason: 'empty' };
    if (s.created && window.TilliAPI && window.TilliAPI.renameGrade) {
      var r = window.TilliAPI.renameGrade(schoolId, oldName, newName);
      if (r.ok) refreshCreatedStructure(s);
      return r;
    }
    var g = s.structure.grades.find(function (x) { return x.grade === oldName; }); if (!g) return { ok: false, reason: 'not_found' };
    if (s.structure.grades.some(function (x) { return x !== g && x.grade.toLowerCase() === newName.toLowerCase(); })) return { ok: false, reason: 'exists' };
    if (!g.base) g.base = inferBase(g.grade);
    g.sections.forEach(function (sec) { if (!sec.base) sec.base = sec.name; });
    g.grade = newName; return { ok: true };
  }
  function renameSection(schoolId, gradeName, oldSec, newSec) {
    var s = byId(schoolId); newSec = String(newSec || '').trim();
    if (!s || !newSec) return { ok: false, reason: 'empty' };
    var g = s.structure.grades.find(function (x) { return x.grade === gradeName; }); if (!g) return { ok: false, reason: 'not_found' };
    var sec = g.sections.find(function (x) { return x.name === oldSec; }); if (!sec) return { ok: false, reason: 'not_found' };
    if (g.sections.some(function (x) { return x !== sec && x.name.toLowerCase() === newSec.toLowerCase(); })) return { ok: false, reason: 'exists' };
    if (s.created && window.TilliAPI && window.TilliAPI.renameSection && sec.id) {
      var r = window.TilliAPI.renameSection(schoolId, sec.id, newSec);
      if (r.ok) refreshCreatedStructure(s);
      return r;
    }
    if (!g.base) g.base = inferBase(g.grade);
    if (!sec.base) sec.base = sec.name;
    sec.name = newSec; return { ok: true };
  }
  // Put back a grade/section the system auto-removed (school asked for it again).
  function restoreStructure(schoolId, idx) {
    var s = byId(schoolId); if (!s || !s.structure.removed) return null;
    var x = s.structure.removed[idx]; if (!x) return null;
    var g = s.structure.grades.find(function (v) { return v.grade === x.grade; });
    if (!g) addGrade(schoolId, x.grade, x.sections);
    else x.sections.forEach(function (n) { addSection(schoolId, x.grade, n); });
    s.structure.removed.splice(idx, 1);
    return x;
  }
  function updateGame(id, patch) {
    var g = SELF_GUIDED.find(function (x) { return x.id === id; }); if (!g) return null;
    ['name', 'full', 'desc', 'status'].forEach(function (k) { if (patch[k] != null) g[k] = patch[k]; });
    if (patch.questions != null) g.questions = patch.questions;
    return g;
  }

  // ============================================================
  //  CHANGE HISTORY (portfolio view — Tilli team + School Group Admin)
  //  Live schools (the demo + wizard-created) keep a real log in TilliAPI.
  //  Portfolio-only schools have no store, so they get a small deterministic
  //  sample (roster import, deploys, completions, an edit) plus any gated
  //  student / deployment actions from the audit trail. Never carries scores.
  // ============================================================
  var PORTFOLIO_HISTORY = null;   // built lazily on first read
  var HISTORY_PHASES = ['baseline', 'midline', 'endline'];
  var AUDIT_HISTORY_KIND = { student: 'student', deployment: 'assessment', phase: 'assessment' };
  function buildPortfolioHistory() {
    var out = [], now = Date.now(), DAY_MS = 86400000;
    var team = { email: 'team@tilli.org', name: 'Tilli Team', role: 'tilli' };
    SCHOOLS.forEach(function (s, i) {
      if (s.live || s.archived || !s.students) return;
      var r = rng(7000 + i);
      var coord = { email: s.coordinator.email, name: s.coordinator.name, role: 'admin' };
      var teacher = { email: '', name: pick(r, COORD_FIRST) + ' ' + pick(r, COORD_LAST), role: 'teacher' };
      var g0 = s.structure.grades[0], sec0 = g0 && g0.sections[0];
      var secName = g0 ? g0.grade + (sec0 ? ' ' + sec0.name : '') : '';
      var stage = STAGE_ORDER.indexOf(s.stage);
      var ev = function (daysAgo, e) {
        e.id = 'ph-' + s.id + '-' + out.length; e.at = now - Math.round(daysAgo * DAY_MS); e.school_id = s.id;
        e.section_id = null; e.section_name = e.section_name || ''; e.students = []; e.changes = e.changes || []; e.items = e.items || [];
        out.push(e);
      };
      ev(between(r, 40, 60), { kind: 'student', action: 'student.add', count: s.students, label: 'imported the roster · ' + s.students.toLocaleString() + ' students', actor: coord });
      HISTORY_PHASES.forEach(function (ph, k) {
        if (stage < STAGE_ORDER.indexOf(ph)) return;
        var P = ph.charAt(0).toUpperCase() + ph.slice(1), base = 36 - k * 12;
        ev(base + r() * 2, { kind: 'assessment', action: 'phase.deploy', phase: P, audience: 'Teacher', actor: team, changes: [{ label: 'Assessments', from: '', to: 'Teacher observation' }] });
        ev(base - 4 - r() * 3, { kind: 'assessment', action: 'assessment.complete', phase: P, audience: 'Teacher', section_name: secName, items: ['Teacher observation'], actor: teacher,
          count: Math.max(1, Math.round(s.students * (0.2 + r() * 0.5) / Math.max(1, s.sectionCount))) });
      });
      if (r() < 0.6 && g0 && g0.sections.length > 1) ev(0.5 + r() * 9, { kind: 'student', action: 'student.edit', label: 'moved ' + pick(r, COORD_FIRST) + ' ' + pick(r, COORD_LAST).charAt(0) + '. between sections', section_name: g0.grade, actor: coord,
        changes: [{ label: 'Section', from: g0.grade + ' ' + g0.sections[0].name, to: g0.grade + ' ' + g0.sections[1].name }] });
    });
    return out;
  }
  // Gated student / deployment actions from the audit trail, as history rows.
  function auditAsHistory() {
    return AUDIT.filter(function (e) { return e.schoolId && AUDIT_HISTORY_KIND[e.entityType]; }).map(function (e, i) {
      return { id: 'au-' + i + '-' + e.at, at: e.at, school_id: e.schoolId, section_id: null, section_name: '', students: [], changes: [], items: [],
        kind: AUDIT_HISTORY_KIND[e.entityType], action: e.action, label: actionLabel(e.action) + ' · ' + e.entity,
        actor: { email: '', name: e.actor, role: /system/i.test(e.actor) ? 'system' : 'tilli' } };
    });
  }
  // History across a set of schools, newest first (the §4.2-style server view).
  // filter: { kind, q, student_id, limit }
  function historyAcrossSchools(schoolIds, filter) {
    var f = filter || {}, ids = {}, live = [];
    (schoolIds || []).forEach(function (id) { ids[id] = 1; });
    var liveIds = (schoolIds || []).filter(function (id) { var s = byId(id); return s && s.live; });
    if (liveIds.length && window.TilliAPI && window.TilliAPI.historyAcross)
      live = window.TilliAPI.historyAcross(liveIds, { kind: f.kind, q: f.q, student_id: f.student_id });
    if (!PORTFOLIO_HISTORY) PORTFOLIO_HISTORY = buildPortfolioHistory();
    var q = normName(f.q);
    var mock = f.student_id ? [] : PORTFOLIO_HISTORY.concat(auditAsHistory()).filter(function (e) {
      var s = byId(e.school_id);
      if (!ids[e.school_id] || !s || s.live) return false;
      if (f.kind && e.kind !== f.kind) return false;
      if (q && normName([e.label, e.actor.name, e.section_name, e.phase, e.audience, s.name].join(' ')).indexOf(q) < 0) return false;
      return true;
    });
    var all = live.concat(mock).sort(function (a, b) { return b.at - a.at; });
    return f.limit ? all.slice(0, f.limit) : all;
  }
  function lastChange(schoolId) { return historyAcrossSchools([schoolId], { limit: 1 })[0] || null; }

  // ---- People roster (backward-compat for the carried-over Access screen) ----
  function people() {
    return USERS.filter(function (u) { return u.role !== 'none'; }).map(function (u) {
      var s = u.schoolId ? byId(u.schoolId) : null;
      return { name: u.name, email: u.email, role: u.role, school: s ? s.name : (u.role === 'Super Admin' ? 'Tilli Team' : '—'),
        schoolId: u.schoolId, status: 'Active' };
    });
  }

  // ============================================================
  window.TILLI_ORG = {
    // public surface (unchanged names)
    stages: STAGES, stageOrder: STAGE_ORDER, status: STATUS,
    schools: SCHOOLS, groups: GROUPS,
    stageIndex: stageIndex, stageMeta: stageMeta, byId: byId,
    groupById: groupById, activeSchools: activeSchools, people: people, isSchoolStaff: isSchoolStaff,
    activeGroups: activeGroups, groupByCode: groupByCode,
    // raw entities (list screens)
    users: USERS, invitations: INVITATIONS, issues: ISSUES, templates: TEMPLATES,
    deployments: DEPLOYMENTS, deletionLogs: DELETION_LOGS, duplicates: DUPLICATES,
    mergeHistory: MERGE_HISTORY, health: HEALTH, audit: AUDIT,
    observation: OBSERVATION, selfGuided: SELF_GUIDED, results: RESULTS,
    roles: ROLES,
    // helpers the client needs but must not re-derive
    daysFromNow: daysFromNow, inviteDaysLeft: inviteDaysLeft, refreshApiSchool: refreshApiSchool, iso: iso, normName: normName, masterLinkUrl: masterLinkUrl,
    groupLinkUrl: groupLinkUrl, groupLinkPreview: groupLinkPreview,
    emptyStructureTtlDays: EMPTY_STRUCTURE_TTL_DAYS, emptyStructureWarnDays: EMPTY_STRUCTURE_WARN_DAYS,
    // server-computed views
    server: {
      controlRoom: controlRoom,
      schoolSummary: schoolSummary,
      schoolFlags: schoolFlags, openIssueCount: openIssueCount,
      studentDirectory: studentDirectory,
      recentActivity: recentActivity,
      logAudit: logAudit,
      history: historyAcrossSchools, lastChange: lastChange,
      // §9 write helpers (gated in the client, computed here)
      createGroup: createGroup, createSchool: createSchool,
      createTemplate: createTemplate, deleteTemplate: deleteTemplate, archiveTemplate: archiveTemplate,
      newQuestion: newQuestion, touchTemplate: touchTemplate, slotOf: slotOf, liveVersion: liveVersion, startDraft: startDraft,
      copyPhaseIntoDraft: copyPhaseIntoDraft, publishDraft: publishDraft, discardDraft: discardDraft, restoreVersion: restoreVersion, TPL_PHASES: TPL_PHASES,
      createDeployment: createDeployment, endDeployment: endDeployment,
      setObsPhasePublish: setObsPhasePublish, setObsAccess: setObsAccess,
      setObsAccessAll: setObsAccessAll, obsAccessCount: obsAccessCount,
      // Super-Admin edits
      updateTemplate: updateTemplate, renameGroup: renameGroup, deleteGroup: deleteGroup, archiveGroup: archiveGroup,
      updateSchool: updateSchool, deleteSchool: deleteSchool, setUserRole: setUserRole,
      addSection: addSection, addGrade: addGrade, renameGrade: renameGrade, renameSection: renameSection, updateGame: updateGame,
      emptyStructure: emptyStructure, restoreStructure: restoreStructure,
      addInvitation: addInvitation,
    },
  };
})();
