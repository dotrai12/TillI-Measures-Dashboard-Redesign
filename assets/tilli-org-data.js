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
  var addDays = function (n) { return new Date(TODAY.getTime() + n * DAY); };
  var iso = function (d) { return new Date(d).toISOString().slice(0, 10); };

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
  var GROUPS = [
    { id: 'g-none',       name: 'No group' },
    { id: 'g-vidya',      name: 'Vidya Trust' },
    { id: 'g-lanka',      name: 'Lanka Learning Network' },
    { id: 'g-brightpath', name: 'BrightPath Foundation' },
    { id: 'g-metro',      name: 'Metro Public Schools' },
  ];

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

  // ---- Hand-authored "hero" schools (cover every Control-Room example case) ----
  var HERO = [
    { id: 'little-sprouts', live: true, name: 'Little Sprouts School', code: 'LSPR-2210', type: 'Independent school',
      city: 'Bengaluru', country: 'India', region: 'India', board: 'CBSE', groupId: 'g-none',
      students: liveStudents, staff: liveTeachers, coordinator: liveCoord, joined: 'Apr 2025',
      stage: 'midline', status: 'active', sessionsPerWeek: 96, completion: 71, sel: 64, cog: 61 },
    { id: 'greenfield', name: 'Greenfield International School', code: 'GRNF-4041', type: 'IB World School',
      city: 'Mumbai', country: 'India', region: 'India', board: 'IB', groupId: 'g-vidya',
      students: 540, staff: 32, coordinator: { name: 'Rita Fernandes', email: 'rita.f@greenfield.edu' }, joined: 'Jan 2025',
      stage: 'endline', status: 'active', sessionsPerWeek: 512, completion: 88, sel: 69, cog: 66 },
    { id: 'sunrise', name: 'Sunrise Public School', code: 'SNRS-1180', type: 'CBSE school',
      city: 'Delhi', country: 'India', region: 'India', board: 'CBSE', groupId: 'g-metro',
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
    // ---- Onboarding stalls: 0 students (feeds the Control Room "0 students" card) ----
    { id: 'asian-grammar', name: 'Asian Grammar School', code: 'ARUG-4164', type: 'Independent school',
      city: 'Hyderabad', country: 'India', region: 'India', board: 'CBSE', groupId: 'g-none',
      students: 0, staff: 2, coordinator: { name: 'Farah Sheikh', email: 'farah.s@asiangrammar.edu' }, joined: 'Aug 2025',
      stage: 'onboarding', status: 'quiet', sessionsPerWeek: 0, completion: 0, sel: null, cog: null },
    { id: 'compassion-intl', name: 'Compassion International', code: 'CMPS-9032', type: 'NGO programme',
      city: 'Kolkata', country: 'India', region: 'India', board: 'National', groupId: 'g-brightpath',
      students: 0, staff: 0, coordinator: { name: 'David Roy', email: 'david.roy@compassion.org' }, joined: 'Aug 2025',
      stage: 'mou', status: 'quiet', sessionsPerWeek: 0, completion: 0, sel: null, cog: null },
    { id: 'royal-colombo', name: 'Royal College Colombo', code: 'RYCL-5521', type: 'National school',
      city: 'Colombo', country: 'Sri Lanka', region: 'Sri Lanka', board: 'National', groupId: 'g-lanka',
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
    var struct = makeStructure(r, s.students);
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

  // ---- Assessment templates (some Draft — feeds the "Draft assessments" card) ----
  var TEMPLATES = [
    { id: 'tpl-base-t', title: 'Baseline · Teacher Report', audience: 'Teacher', phase: 'Baseline', status: 'Published', desc: '21-item teacher observation, start of term.' },
    { id: 'tpl-base-p', title: 'Baseline · Parent Report', audience: 'Parent', phase: 'Baseline', status: 'Published', desc: 'Home-context parent survey.' },
    { id: 'tpl-mid-t', title: 'Midline · Teacher Report', audience: 'Teacher', phase: 'Midline', status: 'Draft', desc: 'Mid-term teacher self-report.' },
    { id: 'tpl-end-t', title: 'Endline · Teacher Report', audience: 'Teacher', phase: 'Endline', status: 'Draft', desc: 'End-of-term teacher self-report.' },
    { id: 'tpl-direct-emt', title: 'EMT · Direct Assessment', audience: 'Direct Assessment', phase: 'Baseline', status: 'Published', desc: 'Gamified executive-function task.' },
    { id: 'tpl-direct-hf', title: 'Hearts & Flowers', audience: 'Direct Assessment', phase: 'Midline', status: 'Published', desc: 'Inhibition / flexibility task.' },
  ];

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
  var DEPLOYMENTS = buildDeployments();

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
    { id: 'sg-emt1', name: 'EMT 1', full: 'Early Math Task · Level 1', skills: ['Cognitive', 'Working Memory'], status: 'Published', questions: 18, desc: 'Number sense and counting under time pressure.' },
    { id: 'sg-emt2', name: 'EMT 2', full: 'Early Math Task · Level 2', skills: ['Cognitive', 'Working Memory'], status: 'Published', questions: 22, desc: 'Comparison and simple operations.' },
    { id: 'sg-emt4', name: 'EMT 4', full: 'Early Math Task · Level 4', skills: ['Cognitive', 'Cognitive Flexibility'], status: 'Draft', questions: 24, desc: 'Applied problem solving; advanced tier.' },
    { id: 'sg-hf', name: 'Hearts & Flowers', full: 'Hearts & Flowers', skills: ['Cognitive', 'Inhibitory Control', 'Cognitive Flexibility'], status: 'Published', questions: 48, desc: 'Classic inhibition / flexibility switching task.' },
    { id: 'sg-mem', name: 'Memory Game', full: 'Memory Game', skills: ['Cognitive', 'Working Memory'], status: 'Published', questions: 20, desc: 'Visuospatial working-memory span task.' },
  ];

  // ---- Master Links (§6.5): three hub entry points + a global "entry points only" toggle ----
  var MASTER_LINKS = {
    hideChained: true, // "Entry points only / hide chained follow-up assessments"
    hubs: [
      { key: 'parent', label: 'Parent', slug: 'parent' },
      { key: 'teacher', label: 'Teacher', slug: 'teacher' },
      { key: 'direct', label: 'Direct Assessment', slug: 'direct' },
    ],
  };
  function masterLinkUrl(schoolCode, slug) { return 'https://measures.tilli.app/' + String(schoolCode).toLowerCase() + '/' + slug; }

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

  // Onboarding flags for a single school (mirrors Control-Room logic, scoped).
  function schoolFlags(s) {
    var f = [];
    if (!s.archived && s.students === 0) f.push({ key: 'no-students', label: '0 students' });
    if (!s.archived && s.staff === 0)    f.push({ key: 'no-staff',    label: '0 staff' });
    var live = DEPLOYMENTS.some(function (d) { return d.schoolId === s.id && d.status === 'Live'; });
    if (!s.archived && !live)            f.push({ key: 'no-deployment', label: 'No active deployment' });
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
      var d = daysFromNow(i.expires);
      return i.status === 'Expired' || (d >= 0 && d <= 7);
    });
    var draftTpls = TEMPLATES.filter(function (t) { return t.status === 'Draft'; });
    var depsAttn = DEPLOYMENTS.filter(function (d) {
      if (d.status === 'Live') return daysFromNow(d.end) <= 3;
      if (d.status === 'Scheduled') return daysFromNow(d.start) < 0; // start passed, not flipped
      return false;
    });

    var cards = [
      { key: 'issues', label: 'Open issues', count: openIssues.length, severity: 3, deeplink: '#/issues?status=open' },
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
      { key: 'staff', label: 'Staff Members', value: sum(act, function (s) { return s.staff; }), delta: 18, deeplink: '#/users?kind=staff' },
    ];

    return { cards: cards, stats: stats, recent: recentActivity(20) };
  }

  function actionLabel(a) {
    return ({
      'template.publish': 'published template', 'template.create': 'created template',
      'template.duplicate': 'duplicated template', 'template.delete': 'deleted template', 'template.edit': 'edited template',
      'student.merge': 'merged students', 'student.delete': 'deleted students', 'student.add': 'imported students', 'student.edit': 'edited student',
      'school.add': 'added school', 'school.archive': 'archived school', 'school.edit': 'edited school', 'school.structure': 'updated grades / sections',
      'role.change': 'changed role', 'deployment.create': 'created deployment', 'deployment.end': 'ended deployment',
      'observation.publish': 'published observation phase', 'observation.access': 'changed form access',
      'selfguided.publish': 'published self-guided game', 'selfguided.edit': 'edited self-guided game',
      'group.create': 'created group', 'group.rename': 'renamed group', 'group.delete': 'deleted group',
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
  function schoolSummary(id) {
    var s = byId(id); if (!s) return null;
    var deps = DEPLOYMENTS.filter(function (d) { return d.schoolId === id; });
    var phaseState = ['Baseline', 'Midline', 'Endline'].map(function (ph) {
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
    var g = { id: id, name: name };
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
    var name = String(input.name || '').trim();
    var slugBase = normName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'school';
    var id = slugBase, n = 1;
    while (byId(id)) { id = slugBase + '-' + (++n); }

    var grades = (input.grades || []).map(function (g) {
      return { grade: g.grade, students: Math.max(0, parseInt(g.students, 10) || 0), sections: (g.sections || []).map(function (sec) {
        return { name: sec.name, students: Math.max(0, parseInt(sec.students, 10) || 0) };
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
      board: input.board || 'Other', groupId: group.id, groupName: group.name,
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
        delivery: 'Email sent', created: iso(TODAY), expires: iso(addDays(14)) });
    }
    return s;
  }
  function createTemplate(t) {
    var tpl = { id: 'tpl-' + Date.now(), title: t.title, audience: t.audience, phase: t.phase,
      status: t.status || 'Draft', desc: t.desc || '' };
    TEMPLATES.unshift(tpl);
    return tpl;
  }
  function publishTemplate(id, publish) {
    var t = TEMPLATES.find(function (x) { return x.id === id; }); if (!t) return null;
    t.status = publish ? 'Published' : 'Draft'; return t;
  }
  function deleteTemplate(id) { var i = TEMPLATES.findIndex(function (x) { return x.id === id; }); if (i >= 0) TEMPLATES.splice(i, 1); }
  function createDeployment(d) {
    var dep = { id: 'dep-' + Date.now(), schoolId: d.schoolId, assessment: d.assessment, audience: d.audience,
      phase: d.phase, type: d.type || 'Observation', start: d.start, end: d.end,
      published: d.published !== false, chain: !!d.chain, gamified: !!d.gamified };
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
  function updateTemplate(id, patch) {
    var t = TEMPLATES.find(function (x) { return x.id === id; }); if (!t) return null;
    ['title', 'audience', 'phase', 'status', 'desc'].forEach(function (k) { if (patch[k] != null) t[k] = patch[k]; });
    return t;
  }
  function renameGroup(id, name) {
    var g = GROUPS.find(function (x) { return x.id === id; }); if (!g) return null;
    g.name = name; SCHOOLS.forEach(function (s) { if (s.groupId === id) s.groupName = name; }); return g;
  }
  function deleteGroup(id) {
    if (id === 'g-none') return;
    SCHOOLS.forEach(function (s) { if (s.groupId === id) { s.groupId = 'g-none'; s.groupName = 'No group'; } });
    var i = GROUPS.findIndex(function (g) { return g.id === id; }); if (i >= 0) GROUPS.splice(i, 1);
  }
  function updateSchool(id, patch) {
    var s = byId(id); if (!s) return null;
    ['name', 'type', 'city', 'country', 'region'].forEach(function (k) { if (patch[k] != null) s[k] = patch[k]; });
    if (patch.groupId != null) { s.groupId = patch.groupId; s.groupName = (GROUPS.find(function (g) { return g.id === patch.groupId; }) || GROUPS[0]).name; }
    return s;
  }
  function setUserRole(email, role) { var u = USERS.find(function (x) { return x.email === email; }); if (u) u.role = role; return u; }
  function recomputeStructure(s) {
    s.structure.sections = s.structure.grades.reduce(function (a, g) { return a + g.sections.length; }, 0);
    s.gradeCount = s.structure.grades.length; s.sectionCount = s.structure.sections;
  }
  function addSection(schoolId, gradeName) {
    var s = byId(schoolId); if (!s) return null;
    var g = s.structure.grades.find(function (x) { return x.grade === gradeName; }); if (!g) return null;
    g.sections.push({ name: String.fromCharCode(65 + g.sections.length), students: 0 });
    recomputeStructure(s); return s;
  }
  function addGrade(schoolId, name) {
    var s = byId(schoolId); if (!s) return null;
    if (!s.structure.grades.some(function (g) { return g.grade === name; })) {
      s.structure.grades.push({ grade: name, sections: [{ name: 'A', students: 0 }] });
      recomputeStructure(s);
    }
    return s;
  }
  function updateGame(id, patch) {
    var g = SELF_GUIDED.find(function (x) { return x.id === id; }); if (!g) return null;
    ['name', 'full', 'desc', 'status'].forEach(function (k) { if (patch[k] != null) g[k] = patch[k]; });
    if (patch.questions != null) g.questions = patch.questions;
    return g;
  }

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
    groupById: groupById, activeSchools: activeSchools, people: people,
    // raw entities (list screens)
    users: USERS, invitations: INVITATIONS, issues: ISSUES, templates: TEMPLATES,
    deployments: DEPLOYMENTS, deletionLogs: DELETION_LOGS, duplicates: DUPLICATES,
    mergeHistory: MERGE_HISTORY, health: HEALTH, audit: AUDIT,
    observation: OBSERVATION, selfGuided: SELF_GUIDED, masterLinks: MASTER_LINKS, results: RESULTS,
    roles: ROLES,
    // helpers the client needs but must not re-derive
    daysFromNow: daysFromNow, iso: iso, normName: normName, masterLinkUrl: masterLinkUrl,
    // server-computed views
    server: {
      controlRoom: controlRoom,
      schoolSummary: schoolSummary,
      schoolFlags: schoolFlags,
      studentDirectory: studentDirectory,
      recentActivity: recentActivity,
      logAudit: logAudit,
      // §9 write helpers (gated in the client, computed here)
      createGroup: createGroup, createSchool: createSchool,
      createTemplate: createTemplate, publishTemplate: publishTemplate, deleteTemplate: deleteTemplate,
      createDeployment: createDeployment, endDeployment: endDeployment,
      setObsPhasePublish: setObsPhasePublish, setObsAccess: setObsAccess,
      setObsAccessAll: setObsAccessAll, obsAccessCount: obsAccessCount,
      // Super-Admin edits
      updateTemplate: updateTemplate, renameGroup: renameGroup, deleteGroup: deleteGroup,
      updateSchool: updateSchool, setUserRole: setUserRole,
      addSection: addSection, addGrade: addGrade, updateGame: updateGame,
    },
  };
})();
