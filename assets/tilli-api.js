/* ============================================================
   Tilli Measures — MOCK BACKEND / GUARD LAYER  (window.TilliAPI)
   ============================================================
   WHAT THIS IS
   ------------------------------------------------------------
   This is the SUBSTITUTE for the real backend. It implements every
   security guard from tilli-measures-identity-access-spec.md as a
   plain function, backed by localStorage so it behaves like a real
   system across reloads. The UI (landing.js, teacher.js,
   teacher-dashboard.js, parent.html) talks ONLY to these functions —
   never to window.TILLI_SCHOOL directly for anything security-relevant.

   >>> FOR THE DEVELOPER WIRING THE REAL BACKEND:
   >>> Every function marked  // SERVER-SIDE:  is a guard that MUST be
   >>> enforced on the server (the spec §1.2, §8). Replace the *body*
   >>> of each function with a real `fetch(...)` to your API. Keep the
   >>> function names, arguments, and return shapes identical and the
   >>> whole UI keeps working unchanged. Do NOT trust the client to
   >>> enforce these — this file only *simulates* server enforcement.

   Spec mapping:
     addStudent .............. Flow A / A4  (dedupe-on-add, merge, near-match flag)
     beginClaim / verifyClaim / confirmClaim ... Flow B / B1–B3 (verify-before-reveal)
     offboardStudent / revokeParentLink / reassignTeacher ... Flow C (Admin-only)
     verifySchool / inviteAdmin / inviteTeacher / acceptInvite ... Flow A / A1–A3
   ============================================================ */
/* ============================================================
   TilliPalette — the ONE place JS reads colours from.
   CSS custom properties in assets/tilli.css are the source of truth;
   these maps hold var() strings for use in style="" / innerHTML, and
   css(name) resolves a token to its hex for SVG presentation
   attributes (fill="…"), which cannot read var().
   Exact-hex art/chart palettes (petals, growth lines) live here too so
   they are defined once instead of copied into every renderer.
   ============================================================ */
(function () {
  function css(name) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (v) return v;
    } catch (e) {}
    return '';
  }
  // Level index 1..4 → token set. Labels map onto the index via levelOf().
  function level(n) {
    return { strong: 'var(--lvl-' + n + ')', soft: 'var(--lvl-' + n + '-soft)', wash: 'var(--lvl-' + n + '-wash)', ink: 'var(--lvl-' + n + '-ink)', n: n };
  }
  var LEVEL_INDEX = {
    beginner: 1, emerging: 1, seedling: 1, sprouting: 1,
    learner: 2, developing: 2, growing: 2,
    expert: 3, secure: 3, proficient: 3, blooming: 3,
    advanced: 4,
  };
  window.TilliPalette = {
    css: css,
    level: level,
    levelOf: function (label) { return level(LEVEL_INDEX[String(label || '').toLowerCase()] || 1); },
    PERSPECTIVE: { teacher: 'var(--persp-teacher)', parent: 'var(--persp-parent)', student: 'var(--persp-student)', studentDirect: 'var(--persp-student)' },
    // Resolved hex (for SVG attributes / rgba math)
    perspHex: function (k) { return css('--persp-' + (k === 'studentDirect' ? 'student' : k)); },
    STATUS: {
      done:        { bg: 'var(--status-done-bg)', fg: 'var(--status-done-fg)', dot: 'var(--status-done-dot)', cls: 'done' },
      in_progress: { bg: 'var(--status-prog-bg)', fg: 'var(--status-prog-fg)', dot: 'var(--status-prog-dot)', cls: 'prog' },
      pending:     { bg: 'var(--status-pend-bg)', fg: 'var(--status-pend-fg)', dot: 'var(--status-pend-dot)', cls: 'pend' },
    },
    // Brand petal palette for every flower illustration (flower band, garden, mini trios).
    PETALS: ['#E866B0', '#26BDE2', '#FCC30B', '#E91E8C'],
    // Onboarding progress-ring petals (five brand colours).
    RING_PETALS: ['#FCC30B', '#26BDE2', '#F99B1C', '#E866B0', '#56C02B'],
    // Growth-over-time chart series (distinct, colour-blind-safe set) + reference line.
    GROWTH: ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300'],
    GROWTH_REF: 'var(--ink-300)',
  };
})();

(function () {
  'use strict';

  var STORE_KEY   = 'tilliMeasures.api.v1';
  var SEED_VER    = 6;                 // bump to force a re-seed after data-shape changes (6: demo school 6 grades × 5 sections × 30 kids)

  // Claim-flow tuning (spec §5 B2: rate-limit + lock).
  var MAX_ATTEMPTS = 5;                // lock after this many wrong second-factors
  var LOCK_MS      = 15 * 60 * 1000;   // 15-minute lockout

  /* ---------- tiny deterministic RNG (stable claim codes / DOBs) ---------- */
  function hashStr(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
  function seeded(adm, salt){ return hashStr(String(adm)+':'+salt); }

  // Stable claim code for a child — does NOT change while the child is at the
  // school (per product decision). Tilli shares it with school/teacher/parent.
  function makeClaimCode(adm){
    var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no I/O/0/1 ambiguity
    var h = seeded(adm, 'claim'); var out = '';
    for (var i=0;i<4;i++){ out += abc[h % abc.length]; h = Math.floor(h/abc.length) ^ (h<<3); h>>>=0; }
    return 'TIL-' + out;
  }
  // Student UID — the child's unique Tilli Measures code, shown to teachers on
  // the roster + profile. Seeded by school::admission so it is stable for the
  // life of the record AND unique across schools (makeClaimCode is seeded by
  // admission number alone, so two schools' "A101" would collide).
  function makeUid(schoolId, adm){
    var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var h = hashStr(String(schoolId||'').trim().toLowerCase()+'::'+String(adm||'').trim().toUpperCase()+':uid'); var out = '';
    for (var i=0;i<6;i++){ out += abc[h % abc.length]; h = Math.floor(h/abc.length) ^ (h<<5); h>>>=0; }
    return 'TM-' + out;
  }
  // Stable plausible DOB (used only when a school's second factor is 'dob' | 'both').
  function makeDob(adm, grade){
    var h = seeded(adm, 'dob');
    var baseYear = /kinder/i.test(grade||'') ? 2020 : 2019;   // ~5yo vs ~6yo demo
    var month = (h % 12) + 1; var day = ((h>>4) % 28) + 1;
    return baseYear + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');
  }

  /* ---------- teacher pre-training reflection (editable question bank) ----------
     The one-time teacher reflection shown during onboarding. Stored in the
     shared DB (db.config.reflection) so the Platform Admin "Reflection
     questions" screen can edit it and every teacher app reads the same bank.
     Each question carries a stable `id`; teacher answers are keyed by it, so
     edits / reorders never shift answers onto the wrong question.
     cat = category id. type: 'scale' (1–5, lo/hi end labels) | 'choice'
     (options[]) | 'text'. Categories are fixed at 5 (they map onto the 5 petal
     colours of the onboarding progress ring). */
  var DEFAULT_REFLECTION = {
    cats: [
      { id:'mindsets',  name:'Mindsets',         color:'#F2CE7B' },
      { id:'sel',       name:'SEL Competencies', color:'#9DBE8D' },
      { id:'practices', name:'Practices',        color:'#A7CDE2' },
      { id:'climate',   name:'Climate',          color:'#F6C6D2' },
      { id:'wellbeing', name:'Wellbeing',        color:'#F0B97D' },
    ],
    questions: [
      { id:'q01', cat:'mindsets',  type:'scale',  q:'Social Emotional Learning belongs in everyday teaching.', hint:'Woven into academic lessons, routines and behaviour support — not a separate subject or one-time activity.' },
      { id:'q02', cat:'mindsets',  type:'scale',  q:'When a student misbehaves, I look for the reason before I respond.' },
      { id:'q03', cat:'sel',       type:'scale',  q:'In the last two weeks, I calmed myself when I felt a strong emotion at work.' },
      { id:'q04', cat:'sel',       type:'text',   q:'Describe a recent situation at work where you felt a strong emotion. What did you do to calm or manage yourself?' },
      { id:'q05', cat:'sel',       type:'scale',  q:'I have a reliable way to recover after a hard day.' },
      { id:'q06', cat:'practices', type:'scale',  q:'In the last 3–4 weeks, I checked in on how students were feeling.' },
      { id:'q07', cat:'practices', type:'choice', q:'In a typical week, how many SEL activities do you run?', hint:'Emotion check-ins, reflection exercises, conflict-resolution talks, mindfulness, collaborative games…', options:['0','1–2','3–4','5+'] },
      { id:'q08', cat:'climate',   type:'scale',  q:'Students in my classroom feel safe.', hint:'Able to participate, make mistakes, express themselves and ask for help without fear.' },
      { id:'q09', cat:'climate',   type:'text',   q:'What is one thing you do that helps create a safe classroom environment?' },
      { id:'q10', cat:'wellbeing', type:'scale',  q:'Over the last two weeks, I felt emotionally drained by work.', lo:'Never', hi:'Always', reverse:true },
    ],
  };
  function clone(o){ return JSON.parse(JSON.stringify(o)); }

  /* ---------- string helpers ---------- */
  function norm(s){ return String(s==null?'':s).trim(); }
  function up(s){ return norm(s).toUpperCase(); }
  function low(s){ return norm(s).toLowerCase(); }
  function keyOf(schoolId, studentId){ return low(schoolId)+'::'+up(studentId); }
  function fullName(s){ return norm(s.first)+' '+norm(s.last); }
  function levenshtein(a,b){
    a=up(a); b=up(b); var m=a.length,n=b.length; if(!m)return n; if(!n)return m;
    var d=[]; for(var i=0;i<=m;i++)d[i]=[i]; for(var j=0;j<=n;j++)d[0][j]=j;
    for(i=1;i<=m;i++)for(j=1;j<=n;j++){ var c=a[i-1]===b[j-1]?0:1;
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c); }
    return d[m][n];
  }

  /* ---------- persistence (the fake "database") ---------- */
  function blankDB(){
    return {
      seedVer: SEED_VER,
      schools: {},            // school_id -> { school_id, name, board, verified, status, claimMethod }
      sections: {},           // section_id -> { section_id, school_id, grade, section, name, teacherId, expected }
                              //   expected = how many children the admins say the class has (null = not set)
      teacherMemberships: [], // { user_id(email), school_id, section_ids[], status }
      adminMemberships: [],   // { user_id(email), school_id, role:'admin', status }
      students: {},           // keyOf() -> record (see seedFromSchool)
      parentLinks: [],        // { parent_user_id(email), school_id, student_id, status, verified_at }
      claimChallenges: {},    // challengeId -> { school_id, student_id, exists, created }
      claimTokens: {},        // claimToken  -> { school_id, student_id, created }
      attempts: {},           // keyOf() -> { count, lockedUntil }
      reviewQueue: [],        // near-match flags awaiting Admin (spec A4 / §9.2)
      invites: [],            // { token, school_id, email, role, section_ids[], used }
      // ---- NEW (cross-app assessment lifecycle) ----
      // deployments[school_id]['<phase>|<audience>'] = { phase, audience,
      //   deployed, status:'Live'|'Ended', window, assessments:[{id,name}],
      //   deployedAt, endedAt }.  Written by Platform Admin's planner; READ by
      //   the teacher + parent apps to know what to surface.
      deployments: {},
      // completions[school_id]['<phase>|<audience>|<studentId>|<assessId>'] =
      //   { by, at }.  Written when a teacher/parent/student finishes one item;
      //   the source of truth for every completion % across all four apps.
      completions: {},
      staff: {},              // school_id -> [{ name, email, role:'coordinator'|'teacher', section_id }]  (display names)
      createdSchools: [],     // ids of schools made via createSchoolFull (portfolio hydration)
      // Sign-in accounts provisioned by the Platform Admin "New invitation" flow.
      // email(lower) -> { email, role, school_id, tempPassword, password, mustReset,
      //   status:'invited'|'active', invitedBy, createdAt, activatedAt }
      accounts: {},
      // outcomes[school_id][student_id] = [{ key,name,group,pct,band,baseline,mid,post,
      //   teacher,parent,student,gap }]. Prototype SEL scores, auto-generated the first
      //   time a created school's dashboard is opened; a developer swaps this for real
      //   scored-assessment results. Completion (WHO) gates which points are shown.
      outcomes: {},
    };
  }
  function read(){
    try { var raw = localStorage.getItem(STORE_KEY); if(raw){ var db=JSON.parse(raw); if(db&&db.seedVer===SEED_VER) return db; } }
    catch(e){}
    return null;
  }
  function write(db){ try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch(e){} return db; }

  /* ---------- seed from the dummy dataset (window.TILLI_SCHOOL) ---------- */
  function seedFromSchool(){
    var db = blankDB();
    var SRC = window.TILLI_SCHOOL;
    if (!SRC) return write(db);   // no dataset loaded yet — empty but valid

    var sc = SRC.school;
    db.schools[sc.id] = {
      school_id: sc.id, name: sc.name, board: sc.board || 'CBSE', boards: sc.boards || null,
      city: sc.city || '', country: sc.country || '',
      code: sc.joinCode || '', joinCode: sc.joinCode || '',   // one school code: links + teacher self-sign-up
      verified: true,                 // Tilli verified this demo school (spec A1)
      status: 'active',
      claimMethod: 'code',            // spec §9.1 per-school setting: default to claim code
    };

    (SRC.sections||[]).forEach(function(s){
      db.sections[s.id] = { section_id:s.id, school_id:sc.id, grade:s.grade, section:s.section, name:s.name, teacherId:s.teacherId };
    });

    // Teacher memberships — each seeded teacher is scoped to THEIR sections only (spec A3).
    (SRC.teachers||[]).forEach(function(t){
      var secs = (SRC.sections||[]).filter(function(s){ return s.teacherId===t.id; });
      db.teacherMemberships.push({ user_id: low(t.email), school_id: sc.id, section_ids: secs.map(function(s){ return s.id; }), status:'active' });
    });

    // Mock Admin so the Flow-C guards are testable in the data layer.
    // (School roles: Teacher, School admin, School group admin — no Principal.)
    db.adminMemberships.push({ user_id:'admin@littlesprouts.edu', school_id:sc.id, role:'admin', status:'active' });

    // Students — one canonical record per (school_id, student_id). student_id = admission no.
    (SRC.students||SRC.roster||[]).forEach(function(r){
      var secDef = (SRC.sections||[]).find(function(s){ return s.grade===r.grade && s.section===r.section; });
      var rec = {
        student_id: up(r.adm), school_id: sc.id,
        section_id: secDef ? secDef.id : null,
        first: r.first, last: r.last, name: r.first+' '+r.last,
        grade: r.grade, section: r.section, gender: r.gender,
        dob: makeDob(r.adm, r.grade),
        claimCode: makeClaimCode(r.adm),
        uid: makeUid(sc.id, r.adm),
        parentName: r.parentName || '', parentEmail: low(r.parentEmail||''),
        status: 'active',                       // 'active' | 'left'  (spec §3.2)
        source: 'seed', createdAt: null,
      };
      db.students[keyOf(sc.id, rec.student_id)] = rec;
    });

    // Parent links — the one demo parent, already verified against their children.
    (SRC.parents||[]).forEach(function(p){
      (p.children||[]).forEach(function(adm){
        db.parentLinks.push({ parent_user_id: low(p.email), school_id: sc.id, student_id: up(adm), status:'active', verified_at: 'seed' });
      });
    });

    return write(db);
  }

  /* ---------- four fully-populated demo schools ----------
     Real roster, teachers, parents, deployments, completions and teacher
     self-reports in this shared store, so every app tells the same story:
       banyan-tree   all phases — Baseline + Midline ended, Endline live now
       lotus-valley  Baseline ended, Midline live, Endline not deployed
       kandy-hill    Baseline live only
       colombo-kids  Baseline, Midline and Endline all scheduled (future)
     Dates are relative to the day it seeds. Runs once per browser
     (db.heroSeedVer) — bump HERO_SEED_VER to re-seed. Logins: Demo-Logins.md. */
  var HERO_SEED_VER = 2;   // 2: + Heritage Oaks (a school in its 3rd year)
  var HERO_SECTION_SIZE = 14;   // children per class (kept small: every lookup re-reads the store)
  var HERO_PHASES = ['Baseline', 'Midline', 'Endline'];
  var HERO_WIN = { Baseline: 'baseline', Midline: 'mid', Endline: 'post' };
  // Same ids/names the platform-admin planner uses, so its cards line up.
  var HERO_ITEMS = {
    Baseline: { Teacher: [['baselineteacher0', 'Pre-training', 1], ['baselineteacher1', 'Post-training', 1], ['baselineteacher2', 'Teacher observational report on student foundational skills']],
      Parent: [['baselineparent0', 'Home SEL Survey']], 'Direct Assessment': [['baselinedirect0', 'IDELA'], ['baselinedirect1', 'Hearts & Flowers']] },
    Midline: { Teacher: [['midlineteacher0', 'SEL Observation'], ['midlineteacher1', 'EF Observation']],
      Parent: [['midlineparent0', 'Home SEL Survey'], ['midlineparent1', 'Routines Report']], 'Direct Assessment': [['midlinedirect0', 'EMT 1'], ['midlinedirect1', 'EMT 2']] },
    Endline: { Teacher: [['endlineteacher0', 'SEL Observation'], ['endlineteacher1', 'EF Observation']],
      Parent: [['endlineparent0', 'Home SEL Survey'], ['endlineparent1', 'Routines Report']], 'Direct Assessment': [['endlinedirect0', 'EMT 1'], ['endlinedirect1', 'EMT 2']] },
  };
  // plan: phase → [start offset days, end offset days, share of students done]
  var HERO_SCHOOLS = [
    { id: 'banyan-tree', name: 'Banyan Tree School', code: 'BNYN-7712', board: 'ICSE', city: 'Chennai', country: 'India', group_id: 'g-vidya',
      domain: 'banyantree.edu', prefix: 'BT', admin: ['Suresh Raman', 'suresh.r@banyantree.edu'],
      classes: [['Grade 1', 'A'], ['Grade 1', 'B'], ['Grade 2', 'A'], ['Grade 3', 'A']],
      plan: { Baseline: [-150, -125, 0.94], Midline: [-75, -50, 0.88], Endline: [-8, 14, 0.45] } },
    { id: 'lotus-valley', name: 'Lotus Valley School', code: 'LOTS-3390', board: 'CBSE', city: 'Gurugram', country: 'India', group_id: 'g-metro',
      domain: 'lotusvalley.edu', prefix: 'LV', admin: ['Pooja Malhotra', 'pooja.m@lotusvalley.edu'],
      classes: [['Kindergarten', 'A'], ['Grade 1', 'A'], ['Grade 2', 'A'], ['Grade 2', 'B']],
      plan: { Baseline: [-95, -70, 0.9], Midline: [-6, 16, 0.5] } },
    { id: 'kandy-hill', name: 'Kandy Hill School', code: 'KNDY-8890', board: 'National', city: 'Kandy', country: 'Sri Lanka', group_id: 'g-lanka',
      domain: 'kandyhill.lk', prefix: 'KH', admin: ['Nuwan Bandara', 'nuwan.b@kandyhill.lk'],
      classes: [['Grade 1', 'A'], ['Grade 2', 'A'], ['Grade 3', 'A'], ['Grade 4', 'A']],
      plan: { Baseline: [-5, 17, 0.42] } },
    { id: 'colombo-kids', name: 'Colombo Kids Academy', code: 'CLMB-6604', board: 'Cambridge', city: 'Colombo', country: 'Sri Lanka', group_id: 'g-lanka',
      domain: 'colombokids.lk', prefix: 'CK', admin: ['Dilani Perera', 'dilani.p@colombokids.lk'],
      classes: [['Kindergarten', 'A'], ['Grade 1', 'A'], ['Grade 1', 'B'], ['Grade 2', 'A']],
      plan: { Baseline: [12, 33, 0], Midline: [100, 121, 0], Endline: [190, 211, 0] } },
    // 3rd year with Tilli: two archived years (Jun → May) + this year's Baseline live.
    // Last year Grade 2 was called "Tulips"; Midline moved to template v2 last year.
    { id: 'heritage-oaks', name: 'Heritage Oaks School', code: 'HROK-4410', board: 'CBSE', city: 'Bengaluru', country: 'India', group_id: null,
      domain: 'heritageoaks.edu', prefix: 'HO', admin: ['Nandini Rao', 'admin@heritageoaks.edu'], joined: '2024-06-01',
      classes: [['Grade 1', 'A'], ['Grade 2', 'A'], ['Grade 3', 'A'], ['Grade 4', 'A']],
      plan: { Baseline: [-25, 12, 0.6], Midline: [60, 81, 0] },
      pastYears: 2, renamed: { yearsBack: 1, base: 'Grade 2', name: 'Tulips' } },
  ];
  var HERO_FIRST_F = ['Aanya', 'Diya', 'Ira', 'Kavya', 'Meera', 'Navya', 'Riya', 'Saanvi', 'Tara', 'Zara', 'Dinithi', 'Sanduni', 'Hiruni', 'Nethmi'];
  var HERO_FIRST_M = ['Aarav', 'Arjun', 'Dhruv', 'Ishaan', 'Kabir', 'Reyansh', 'Vihaan', 'Yash', 'Advik', 'Kian', 'Kaveen', 'Thisal', 'Sehan', 'Dinuka'];
  var HERO_LAST = ['Sharma', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Rao', 'Shah', 'Desai', 'Pillai', 'Verma', 'Perera', 'Fernando', 'Silva', 'Jayasuriya', 'Wickramasinghe', 'Bandara'];
  var HERO_TEACHERS = ['Anita', 'Deepa', 'Farah', 'Kavitha', 'Lakshmi', 'Nalini', 'Priya', 'Revathi', 'Shalini', 'Geetha', 'Ishara', 'Nadeesha', 'Tharushi', 'Chamari', 'Rohan', 'Vikram'];
  var HERO_TEXT = ['Children who name their feelings settle faster after recess.', 'Group work helps the quieter ones speak up.', 'I want more short calm-down routines.', 'Morning check-ins have made a real difference.', 'Some days the class is restless after lunch.'];
  var DAY_MS = 86400000;

  function heroISO(ms){ var t = new Date(ms), p = function(x){ return (x<10?'0':'')+x; }; return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate()); }
  // Pre/Post-training survey answers keyed like the reflection bank (q01–q10).
  function heroReflection(R){
    var a = {};
    (DEFAULT_REFLECTION.questions || []).forEach(function(q){
      if (q.type === 'scale') a[q.id] = 2 + Math.floor(R() * 4);
      else if (q.type === 'choice') a[q.id] = q.options[1 + Math.floor(R() * (q.options.length - 1))];
      else a[q.id] = HERO_TEXT[Math.floor(R() * HERO_TEXT.length)];
    });
    return a;
  }
  // Past academic years for a hero school (see ACADEMIC YEARS below): each
  // archived year has its own lanes (all Ended), completions, outcomes, class
  // names and who sat where. Children step back one base grade per year;
  // today's youngest class wasn't at the school yet.
  function seedHeroYears(db, H, id, classes, team, now, history){
    var R = schoolRng(id + ':years'), skills = (window.TILLI_SCHOOL && window.TILLI_SCHOOL.skills) || [];
    var t = new Date(now), y0 = t.getMonth() >= 5 ? t.getFullYear() : t.getFullYear() - 1;   // years run Jun → May
    var span = function(y){ var a = y + '-06-01', b = (y + 1) + '-05-31'; return { start: a, end: b, label: yearLabel(a, b) }; };
    var WIN = { Baseline: ['-07-01', '-07-21', 0], Midline: ['-10-15', '-11-05', 0], Endline: ['-02-10', '-03-02', 1] };
    var bases = classes.map(function(cl){ var sec = db.sections[cl.secId]; sec.base_grade = inferBaseGrade(sec.grade); sec.base_section = sec.section; return sec.base_grade; });
    db.years = db.years || {}; db.archive = db.archive || {}; db.archive[id] = db.archive[id] || {};
    var list = [];
    for (var k = H.pastYears; k >= 1; k--){
      var y = y0 - k, sp = span(y), yid = yearId(sp.label);
      var secSnap = {}, enrol = {}, deps = {}, comps = {}, outs = {};
      classes.forEach(function(cl){
        var sec = db.sections[cl.secId], renamed = H.renamed && H.renamed.yearsBack === k && H.renamed.base === sec.base_grade;
        var g = renamed ? H.renamed.name : sec.grade;
        secSnap[cl.secId] = { grade: g, section: sec.section, name: g + ' ' + sec.section, base_grade: sec.base_grade, base_section: sec.base_section };
      });
      // Who sat where that year: today's Grade N A was Grade N-k A.
      var teacherOf = {};
      classes.forEach(function(cl){
        var pb = BASE_GRADES[BASE_GRADES.indexOf(db.sections[cl.secId].base_grade) - k];
        var pi = bases.indexOf(pb); if (pi < 0) return;
        var past = classes[pi], snap = secSnap[past.secId];
        cl.kids.forEach(function(r){ enrol[r.student_id] = { grade: snap.grade, section: snap.section, section_id: past.secId, status: 'active' }; teacherOf[r.student_id] = past.teacher; });
      });
      HERO_PHASES.forEach(function(ph){
        var w = WIN[ph], yy = y + w[2], start = yy + w[0], end = yy + w[1];
        Object.keys(HERO_ITEMS[ph]).forEach(function(aud){
          var items = HERO_ITEMS[ph][aud].map(function(x, xi){
            var mode = aud === 'Parent' ? 'home' : aud === 'Teacher' ? 'school' : (xi % 2 ? 'home' : 'school');
            var it = { id: x[0], name: x[1], mode: mode, version: k === 1 && ph === 'Midline' ? 2 : 1 };
            if (x[2]) it.perTeacher = true;
            return it;
          });
          deps[ph + '|' + aud] = { phase: ph, audience: aud, deployed: true, status: 'Ended', window: start + ' → ' + end, start: start, end: end,
            assessments: items, deployedAt: Date.parse(start) - 7 * DAY_MS, endedAt: Date.parse(end + 'T18:00:00') };
          var rate = 0.84 + R() * 0.12;
          Object.keys(enrol).forEach(function(sid){
            if (R() > rate) return;
            var st = db.students[keyOf(id, sid)] || {}, by = aud === 'Parent' ? st.parentEmail : teacherOf[sid].email;
            var at = Date.parse(start) + Math.floor(R() * 18) * DAY_MS;
            items.filter(function(x){ return !x.perTeacher; }).forEach(function(x, xi){ comps[ph + '|' + aud + '|' + sid + '|' + x.id] = { by: low(by), at: at + xi * 3600000 }; });
          });
        });
        history.push({ at: Date.parse(start) - 7 * DAY_MS, school_id: id, section_id: null, section_name: '', students: [], kind: 'assessment', action: 'phase.deploy',
          phase: ph, audience: 'Teacher', changes: [{ label: 'Window', from: '', to: start + ' → ' + end }], items: [], actor: team });
      });
      // Results that year: the same generator, a little lower for each year back.
      if (skills.length) Object.keys(enrol).forEach(function(sid){
        var st = db.students[keyOf(id, sid)] || {}, shift = 7 * k;
        outs[sid] = genSkills({ first: st.first, student_id: sid + ':' + yid }, skills).map(function(sk){
          var o = Object.assign({}, sk);
          ['pct', 'baseline', 'mid', 'post', 'teacher', 'parent', 'student'].forEach(function(f){ o[f] = _clamp(o[f] - shift, 2, 99); });
          o.band = _band(o.pct); return o;
        });
      });
      db.archive[id][yid] = { deployments: deps, completions: comps, outcomes: outs, selfReports: {}, sections: secSnap, enrolments: enrol, closedAt: Date.parse(sp.end + 'T18:00:00') };
      list.push({ id: yid, label: sp.label, start: sp.start, end: sp.end, status: 'closed', startedAt: Date.parse(sp.start), startedBy: team.email, closedAt: Date.parse(sp.end + 'T18:00:00') });
    }
    var cur = span(y0);
    list.push({ id: yearId(cur.label), label: cur.label, start: cur.start, end: cur.end, status: 'current', startedAt: Date.parse(cur.start), startedBy: team.email });
    list.forEach(function(yr, i){
      if (!i) return;
      history.push({ at: yr.startedAt, school_id: id, section_id: null, section_name: '', students: [], items: [], kind: 'assessment', action: 'year.start',
        changes: [{ label: 'Academic year', from: list[i - 1].label, to: yr.label }], actor: team });
    });
    db.years[id] = list;
  }
  function seedHeroSchools(db){
    var now = Date.now();
    if (!db.selfReports) db.selfReports = {};
    var accts = {}; try { accts = JSON.parse(localStorage.getItem('tilliMeasures.accounts') || '{}') || {}; } catch (e) {}
    var team = { email: 'team@tilli.org', name: 'Tilli Team', role: 'tilli' };

    HERO_SCHOOLS.forEach(function(H){
      if (db.schools[H.id]) return;   // never overwrite a school that's already in the store
      var R = schoolRng(H.id + ':hero'), id = H.id;
      var firstStart = Math.min.apply(null, HERO_PHASES.filter(function(ph){ return H.plan[ph]; }).map(function(ph){ return H.plan[ph][0]; }));
      var created = H.joined ? Date.parse(H.joined + 'T09:00:00') : now + (firstStart - 30) * DAY_MS;
      db.schools[id] = { school_id: id, name: H.name, board: H.board, city: H.city, country: H.country,
        verified: true, status: 'active', claimMethod: 'code', joinCode: H.code, code: H.code,
        source: 'created', seeded: true, createdAt: created, group_id: H.group_id };
      var admin = { name: H.admin[0], email: low(H.admin[1]), role: 'admin' };
      db.adminMemberships.push({ user_id: admin.email, school_id: id, role: 'admin', name: admin.name, status: 'active' });
      db.staff[id] = [{ name: admin.name, email: admin.email, role: 'coordinator', section_id: null }];
      db.deployments[id] = {}; db.completions[id] = {}; db.selfReports[id] = {};
      if (db.createdSchools.indexOf(id) < 0) db.createdSchools.push(id);

      // Classes: one teacher each; students with a parent each.
      var usedT = {}, classes = H.classes.map(function(c, ci){
        var secId = 'sec_' + id + '_' + slugify(c[0] + '_' + c[1]);
        var tn; do { tn = HERO_TEACHERS[Math.floor(R() * HERO_TEACHERS.length)] + ' ' + HERO_LAST[Math.floor(R() * HERO_LAST.length)]; } while (usedT[tn]);
        usedT[tn] = 1;
        var teacher = { name: tn, email: tn.toLowerCase().replace(/\s+/g, '.') + '@' + H.domain, role: 'teacher' };
        db.sections[secId] = { section_id: secId, school_id: id, grade: c[0], section: c[1], name: c[0] + ' ' + c[1], teacherId: teacher.email, expected: HERO_SECTION_SIZE };
        db.teacherMemberships.push({ user_id: teacher.email, school_id: id, section_ids: [secId], status: 'active' });
        db.staff[id].push({ name: tn, email: teacher.email, role: 'teacher', section_id: secId });
        var kids = [];
        for (var k = 0; k < HERO_SECTION_SIZE; k++){
          var girl = R() < 0.5, first = (girl ? HERO_FIRST_F : HERO_FIRST_M)[Math.floor(R() * 14)], last = HERO_LAST[Math.floor(R() * HERO_LAST.length)];
          var adm = H.prefix + '-' + (1001 + ci * 100 + k);
          // The first two children of the first class belong to the demo parents.
          var pEmail = ci === 0 && k < 2 ? 'parent' + (k + 1) + '@' + H.domain : 'parent.' + adm.toLowerCase() + '@example.com';
          var rec = { student_id: up(adm), school_id: id, section_id: secId, first: first, last: last, name: first + ' ' + last,
            grade: c[0], section: c[1], gender: girl ? 'f' : 'm', dob: makeDob(adm, c[0]), claimCode: makeClaimCode(adm),
            uid: makeUid(id, adm), parentName: HERO_FIRST_F[Math.floor(R() * 14)] + ' ' + last, parentEmail: pEmail,
            status: 'active', source: 'seed', createdAt: created };
          db.students[keyOf(id, adm)] = rec;
          db.parentLinks.push({ parent_user_id: pEmail, school_id: id, student_id: up(adm), status: 'active', verified_at: created + 5 * DAY_MS });
          if (ci === 0 && k < 2) accts[pEmail] = true;   // returning parent login on the landing page
          kids.push(rec);
        }
        // One teacher per school lags behind — a realistic follow-up case.
        return { secId: secId, teacher: teacher, kids: kids, pace: ci === H.classes.length - 1 ? 0.35 : 1 };
      });

      // Deployments + completions, phase by phase.
      var history = [], obsByTeacher = {};
      classes.forEach(function(cl){
        history.push({ at: created + 3 * DAY_MS, school_id: id, section_id: cl.secId, section_name: db.sections[cl.secId].name,
          students: cl.kids.map(function(r){ return { id: r.student_id, name: r.name }; }), kind: 'student', action: 'student.add',
          changes: [{ label: 'Source', from: '', to: 'CSV import' }], items: [], actor: admin });
        obsByTeacher[cl.teacher.email] = { baseline: {}, mid: {}, post: {} };
      });
      HERO_PHASES.forEach(function(ph){
        var pl = H.plan[ph]; if (!pl) return;
        var start = now + pl[0] * DAY_MS, end = now + pl[1] * DAY_MS, rate = pl[2];
        var open = start <= now, liveNow = open && end >= now, upto = Math.min(now, end);
        // Deployed a week before it opens — or, for a window still ahead, a little before today (never in the future).
        var depAt = Math.min(start - 7 * DAY_MS, now - (HERO_PHASES.indexOf(ph) + 1) * 3 * 3600000);
        Object.keys(HERO_ITEMS[ph]).forEach(function(aud){
          var items = HERO_ITEMS[ph][aud].map(function(x, xi){
            var mode = aud === 'Parent' ? 'home' : aud === 'Teacher' ? 'school' : (xi % 2 ? 'home' : 'school');
            return x[2] ? { id: x[0], name: x[1], perTeacher: true, mode: mode } : { id: x[0], name: x[1], mode: mode };
          });
          db.deployments[id][ph + '|' + aud] = { phase: ph, audience: aud, deployed: true, status: 'Live', window: heroISO(start) + ' → ' + heroISO(end),
            start: heroISO(start), end: heroISO(end), assessments: items, deployedAt: depAt, endedAt: null };
          history.push({ at: depAt, school_id: id, section_id: null, section_name: '', students: [], kind: 'assessment', action: 'phase.deploy',
            phase: ph, audience: aud, changes: [{ label: 'Window', from: '', to: heroISO(start) + ' → ' + heroISO(end) }], items: items.map(function(x){ return x.name; }), actor: team });
          if (!open) return;
          var perStudent = items.filter(function(x){ return !x.perTeacher; });
          classes.forEach(function(cl, ci){
            var done = [];
            cl.kids.forEach(function(r, k){
              var u = R(), n;
              // Demo children: #1 has done everything; #2 hasn't started the live phase.
              if (ci === 0 && k === 0) n = perStudent.length;
              else if (ci === 0 && k === 1) n = liveNow ? 0 : perStudent.length;
              else if (aud === 'Teacher') n = u < rate * cl.pace ? perStudent.length : 0;   // a teacher rates a child in one go
              else n = u < rate ? perStudent.length : (u < rate + 0.15 && perStudent.length > 1 ? 1 : 0);   // part-way through the chain
              if (!n) return;
              var at = start + Math.floor(R() * Math.max(DAY_MS, upto - start));
              var by = aud === 'Parent' ? r.parentEmail : cl.teacher.email;
              perStudent.slice(0, n).forEach(function(x, xi){ db.completions[id][ph + '|' + aud + '|' + r.student_id + '|' + x.id] = { by: low(by), at: at + xi * 3600000 }; });
              if (aud === 'Teacher') obsByTeacher[cl.teacher.email][HERO_WIN[ph]][r.student_id] = at;
              done.push({ id: r.student_id, name: r.name });
            });
            if (done.length) history.push({ at: upto - Math.floor(R() * 2 * DAY_MS), school_id: id, section_id: cl.secId, section_name: db.sections[cl.secId].name,
              students: done, kind: 'assessment', action: 'assessment.complete', phase: ph, audience: aud, changes: [], items: perStudent.map(function(x){ return x.name; }),
              actor: aud === 'Parent' ? { email: 'parents', name: 'Parents', role: 'parent' } : { email: cl.teacher.email, name: cl.teacher.name, role: 'teacher' } });
          });
        });
      });

      // Teacher self-report (Pre / Post-training) + each teacher's own saved app state.
      var base = H.plan.Baseline, baseEnded = base && now + base[1] * DAY_MS < now, baseOpen = base && now + base[0] * DAY_MS <= now;
      classes.forEach(function(cl, ci){
        var t = cl.teacher, joined = created + (6 + ci) * DAY_MS, reps = [];
        var pre = heroReflection(R);
        reps.push({ kind: 'pre', at: joined, answers: pre });
        // Post-training once Baseline's over (the lagging teacher hasn't); one early bird while it's live.
        if ((baseEnded && cl.pace === 1) || (baseOpen && !baseEnded && ci === 0)) reps.push({ kind: 'post', at: Math.min(now, now + (base[0] + 10) * DAY_MS), answers: heroReflection(R) });
        db.selfReports[id][t.email] = reps;
        history.push({ at: joined, school_id: id, section_id: cl.secId, section_name: db.sections[cl.secId].name, students: [], kind: 'assessment', action: 'assessment.complete',
          phase: 'Baseline', audience: 'Teacher', changes: [], items: ['Pre-training'], actor: { email: t.email, name: t.name, role: 'teacher' } });
        var key = 'tilliMeasures.teacher.' + t.email;
        if (localStorage.getItem(key) != null) return;   // keep any real progress
        var gi = ['Pre-school', 'Pre-Kindergarten', 'UKG', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'].indexOf(db.sections[cl.secId].grade), sec = db.sections[cl.secId];
        var observations = {};
        Object.keys(obsByTeacher[t.email]).forEach(function(w){
          var m = obsByTeacher[t.email][w], o = {};
          Object.keys(m).forEach(function(adm){
            var ratings = {}; for (var q = 1; q <= 21; q++) ratings['q' + (q < 10 ? '0' : '') + q] = R() < 0.05 ? 'na' : 2 + Math.floor(R() * 3);
            o[adm] = { ratings: ratings, at: new Date(m[adm]).toISOString() };
          });
          if (Object.keys(o).length) observations[w] = o;
        });
        var secsSel = {}; secsSel[gi + '-' + sec.section] = true; var gradesSel = {}; gradesSel[gi] = true;
        try { localStorage.setItem(key, JSON.stringify({
          email: t.email, school: id, onboarded: true, joinedAt: new Date(joined).toISOString(), completedAt: new Date(joined).toISOString(),
          demo: { step: 4, name: t.name, gender: 'Female', age: String(28 + Math.floor(R() * 15)), years: String(3 + Math.floor(R() * 12)), edu: "Bachelor's degree",
            school: H.name, country: H.country, city: H.city, countryOpen: false, cityOpen: false, gradesSel: gradesSel, secs: secsSel,
            subjects: { 'Language': true, 'Social-Emotional Learning (SEL)': true }, resSuff: 'Mostly sufficient', resources: { 'Books': true, 'Teaching materials': true } },
          selfAnswers: reps[reps.length - 1].answers,
          reflections: reps.map(function(x, i){ return { id: 'r' + id.slice(0, 3) + ci + i, kind: x.kind, label: x.kind === 'pre' ? 'Pre-training' : 'Post-training', at: new Date(x.at).toISOString(), answers: x.answers }; }),
          roster: { method: null, grade: '', first: '', last: '', adm: '', note: null, issues: {}, csvMsg: '', picMsg: '',
            students: cl.kids.map(function(r){ return { first: r.first, last: r.last, adm: r.student_id, grade: r.grade, section: r.section, uid: r.uid }; }),
            groups: [{ gs: sec.grade + ' · Section ' + sec.section, rows: cl.kids.map(function(r){ return { first: r.first, last: r.last, adm: r.student_id }; }) }] },
          observations: observations, obsDrafts: {} })); } catch (e) {}
      });
      if (H.pastYears) seedHeroYears(db, H, id, classes, team, now, history);
      history.forEach(function(e, i){ e.id = 'h_hero_' + id + '_' + i; db.history.push(e); });
    });
    db.history.sort(function(a, b){ return a.at - b.at; });
    if (db.history.length > HISTORY_CAP) db.history.splice(0, db.history.length - HISTORY_CAP);
    try { localStorage.setItem('tilliMeasures.accounts', JSON.stringify(accts)); } catch (e) {}
  }

  /* ---------- teacher self-report (Pre / Post-training), per teacher ----------
     Shared so the admin views can see who has done it. The teacher app mirrors
     each new reflection here; Pre/Post-training items (perTeacher) count per
     teacher, not per student. */
  function saveSelfReport(schoolId, email, kind, answers){
    if (!schoolId || !email) return false;
    var db = getDB(); if (!db.selfReports) db.selfReports = {};
    var bySchool = db.selfReports[schoolId] || (db.selfReports[schoolId] = {});
    (bySchool[low(email)] = bySchool[low(email)] || []).push({ kind: kind, at: Date.now(), answers: clone(answers || {}) });
    write(db); return true;
  }
  // → { email: { pre: ms|null, post: ms|null, count } } for a school.
  function selfReportsFor(schoolId){
    var db = getDB(), m = (db.selfReports && db.selfReports[schoolId]) || {}, out = {};
    Object.keys(m).forEach(function(e){
      var last = function(k){ var x = m[e].filter(function(r){ return r.kind === k; }).slice(-1)[0]; return x ? x.at : null; };
      out[e] = { pre: last('pre'), post: last('post'), count: m[e].length };
    });
    return out;
  }

  function getDB(){
    var db = read() || seedFromSchool();
    // Lazy migration: stores written before the invitation/accounts feature
    // won't carry `accounts`. Add it without bumping SEED_VER (which would wipe
    // created schools).
    if (!db.accounts){ db.accounts = {}; write(db); }
    if (!db.outcomes){ db.outcomes = {}; write(db); }
    // Stores seeded before the demo school had a join code / location: copy them in.
    var SRC = window.TILLI_SCHOOL && window.TILLI_SCHOOL.school;
    var seededSc = SRC && db.schools[SRC.id];
    if (seededSc && (!seededSc.joinCode && SRC.joinCode)){
      seededSc.joinCode = SRC.joinCode; seededSc.city = seededSc.city || SRC.city || ''; seededSc.country = seededSc.country || SRC.country || '';
      write(db);
    }
    if (!db.config){ db.config = {}; }
    if (!db.config.reflection){ db.config.reflection = clone(DEFAULT_REFLECTION); write(db); }
    // Change history arrived later: add it (plus the demo school's sample
    // events) without bumping SEED_VER. Same pass backfills the demo school's
    // real staff memberships so history (and every role check) can scope them.
    if (!db.history){ backfillSeedMemberships(db); seedHistory(db); write(db); }
    if (!db.selfReports){ db.selfReports = {}; write(db); }
    // The four fully-populated demo schools (after history, which re-seeds itself).
    if (db.heroSeedVer !== HERO_SEED_VER){ seedHeroSchools(db); db.heroSeedVer = HERO_SEED_VER; write(db); }
    // History can't be in the future: older seeds dated a scheduled window's deploy
    // a week before it opens, which put it above "Today". Pull those back.
    if (!db.histFutureFix){
      var nowMs = Date.now();
      (db.history || []).forEach(function(e, i){ if (e.at > nowMs) e.at = nowMs - (i % 12 + 1) * 3600000; });
      (db.history || []).sort(function(x, y){ return x.at - y.at; });
      Object.keys(db.deployments).forEach(function(sid){ Object.keys(db.deployments[sid] || {}).forEach(function(k){ var d = db.deployments[sid][k]; if (d.deployedAt > nowMs) d.deployedAt = nowMs; }); });
      db.histFutureFix = 1; write(db);
    }
    // One school code: the separate teacher join code is folded into it.
    if (!db.oneCodeVer){
      Object.keys(db.schools).forEach(function(id){ var sc = db.schools[id]; if (sc.code) sc.joinCode = sc.code; else if (sc.joinCode) sc.code = sc.joinCode; });
      db.oneCodeVer = 1; write(db);
    }
    // Expected class sizes arrived later: a class that predates them is taken
    // to be complete as it stands (its current headcount; none if empty).
    if (!db.expectedVer){
      var heads = {};
      Object.keys(db.students).forEach(function(k){ var s = db.students[k]; if (s.section_id && s.status!=='left' && s.status!=='graduated') heads[s.section_id] = (heads[s.section_id] || 0) + 1; });
      Object.keys(db.sections).forEach(function(id){ var sec = db.sections[id]; if (sec.expected === undefined) sec.expected = heads[id] || null; });
      db.expectedVer = 1; write(db);
    }
    // Sizes the system set itself (from headcount / seed data) are "not confirmed"
    // until an admin saves one. Wizard-created schools typed theirs in, so they count.
    if (db.expectedVer < 2){
      Object.keys(db.sections).forEach(function(id){
        var sec = db.sections[id], sc = db.schools[sec.school_id] || {};
        if (sec.expectedConfirmed === undefined) sec.expectedConfirmed = !!(sec.expected > 0 && sc.source === 'created' && !sc.seeded);
      });
      db.expectedVer = 2; write(db);
    }
    // Older deployments don't say where each assessment runs: teachers at
    // school, parents at home, student direct alternating school / home
    // (the same default the platform-admin planner shows).
    if (!db.modeFillVer){
      Object.keys(db.deployments).forEach(function(sid){
        Object.keys(db.deployments[sid] || {}).forEach(function(k){
          var d = db.deployments[sid][k];
          (d.assessments || []).forEach(function(a, i){ if (!a.mode) a.mode = d.audience === 'Parent' ? 'home' : d.audience === 'Teacher' ? 'school' : (i % 2 ? 'home' : 'school'); });
        });
      });
      db.modeFillVer = 1; write(db);
    }
    return db;
  }

  /* ---------- role resolution (spec §2, §7) ---------- */
  // SERVER-SIDE: role/scope is derived from the authenticated session, never
  // from anything the client sends. Here we look it up in the fake DB.
  function roleOf(db, email, schoolId){
    var e = low(email);
    if (!e) return null;
    var a = db.adminMemberships.find(function(m){ return m.user_id===e && m.school_id===schoolId && m.status==='active'; });
    if (a) return a.role;                        // 'admin'
    var t = db.teacherMemberships.find(function(m){ return m.user_id===e && m.school_id===schoolId && m.status==='active'; });
    if (t) return 'teacher';
    if (db.parentLinks.some(function(l){ return l.parent_user_id===e && l.school_id===schoolId && l.status==='active'; })) return 'parent';
    return null;
  }
  function teacherScope(db, email, schoolId){
    var m = db.teacherMemberships.find(function(x){ return x.user_id===low(email) && x.school_id===schoolId && x.status==='active'; });
    return m ? m.section_ids.slice() : [];
  }

  function resolveSchool(nameOrId){
    var db = getDB();
    var q = low(nameOrId);
    var byId = db.schools[nameOrId] || db.schools[low(nameOrId)];
    if (byId) return byId;
    var ids = Object.keys(db.schools);
    for (var i=0;i<ids.length;i++){ if (low(db.schools[ids[i]].name)===q) return db.schools[ids[i]]; }
    return null;
  }

  function newId(prefix){
    // Not security-sensitive — just an opaque handle for the demo.
    return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random()*1e6).toString(36);
  }

  /* ======================================================================
     FLOW A — ROSTER + DEDUPE  (spec §4)
     ====================================================================== */

  // DEMO ONLY — grant the onboarding teacher scope over the section they picked.
  // In the real system a teacher NEVER self-grants scope; it comes from the
  // Admin's invite (spec A3). Replace this with "accept invite" server-side.
  // Only an existing class: a teacher never creates one (the school admin or Tilli
  // adds it) — no match returns null and the row isn't added.
  function ensureTeacherScope(email, schoolNameOrId, grade, section){
    var db = getDB();
    var school = resolveSchool(schoolNameOrId);
    if (!school){ return null; }
    var sid = school.school_id;
    var found = findSection(db, sid, grade, section);
    if (!found) return null;
    var secId = found.section_id;
    var m = teacherMembershipFor(db, email, sid, 'code');
    if (m.section_ids.indexOf(secId) < 0) m.section_ids.push(secId);
    m.status = 'active';
    write(db);
    return { school_id:sid, section_id:secId };
  }
  // A teacher's membership at a school, made on first need. `via` records how they
  // joined ('code' = self-sign-up with the school code, 'invite' = invited), with
  // the date — so a code regenerate can list who joined with the old code.
  function teacherMembershipFor(db, email, schoolId, via){
    var m = db.teacherMemberships.find(function(x){ return x.user_id===low(email) && x.school_id===schoolId; });
    if (!m){ m = { user_id:low(email), school_id:schoolId, section_ids:[], status:'active', via:via||'code', joinedAt:Date.now() }; db.teacherMemberships.push(m); }
    return m;
  }

  /* ---------- "My class isn't listed" (teacher → school admin + Tilli) ----------
     A teacher whose class isn't on the platform asks for it at sign-up. Open
     until they're placed in any class, or an admin marks it done. */
  function requestClass(input){
    var db = getDB(); input = input || {};
    var sc = resolveSchool(input.school_id); if (!sc) return { ok:false, reason:'not_found' };
    var sid = sc.school_id, e = low(input.email); if (!e) return { ok:false, reason:'missing-email' };
    teacherMembershipFor(db, e, sid, 'code');
    db.classRequests = db.classRequests || [];
    var r = { id: newId('creq'), school_id: sid, email: e, name: norm(input.name) || e,
      grade: norm(input.grade), section: norm(input.section), note: norm(input.note), at: Date.now(), status: 'open' };
    db.classRequests.push(r);
    logHistory(db, { school_id: sid, section_id: null, section_name: '', students: [], kind: 'student', action: 'class.request',
      changes: [{ label: 'Class asked for', from: '', to: ((r.grade + ' ' + r.section).trim() || 'not given') + ' · ' + r.name }], actor: actorFor(db, e, sid) });
    write(db);
    return { ok:true, request: clone(r) };
  }
  // Open requests (school_id omitted = every school, for Tilli's Control Room).
  function classRequests(schoolId){
    var db = getDB();
    return (db.classRequests || []).filter(function(r){
      return r.status === 'open' && (!schoolId || r.school_id === schoolId) && !teacherScope(db, r.email, r.school_id).length;
    }).map(function(r){ var o = clone(r); o.school_name = (db.schools[r.school_id] || {}).name || r.school_id; return o; });
  }
  function resolveClassRequest(id, actorEmail){
    var db = getDB(), r = (db.classRequests || []).find(function(x){ return x.id === id; });
    if (!r) return { ok:false, reason:'not_found' };
    var role = roleOf(db, actorEmail, r.school_id);
    if (role === 'teacher' || role === 'parent') return { ok:false, reason:'not-authorized' };
    r.status = 'done'; r.doneAt = Date.now(); r.doneBy = low(actorEmail);
    write(db);
    return { ok:true };
  }

  // Teachers who joined with the school code in the `days` days before `until`
  // (default now) — listed after a code regenerate (until = when it changed) so
  // an admin can check everyone who used the old code belongs.
  function recentCodeJoiners(schoolId, days, until){
    var db = getDB(), end = until || Date.now(), since = end - (days || 30) * 864e5;
    return db.teacherMemberships.filter(function(m){
      return m.school_id === schoolId && m.status === 'active' && m.via === 'code' && (m.joinedAt || 0) >= since && (m.joinedAt || 0) <= end;
    }).map(function(m){
      var a = db.accounts[m.user_id] || {};
      return { email: m.user_id, name: nameFor(db, m.user_id, schoolId) || a.name || m.user_id, joinedAt: m.joinedAt,
        classes: m.section_ids.map(function(id){ return (db.sections[id] || {}).name; }).filter(Boolean) };
    });
  }
  // Remove a teacher's access to a school (Tilli or the school admin).
  function removeTeacherAccess(schoolId, email, actorEmail){
    var db = getDB(), role = roleOf(db, actorEmail, schoolId);
    if (role === 'teacher' || role === 'parent') return { ok:false, reason:'not-authorized' };
    var m = db.teacherMemberships.find(function(x){ return x.user_id===low(email) && x.school_id===schoolId; });
    if (!m) return { ok:false, reason:'not_found' };
    m.status = 'removed'; m.removedAt = Date.now();
    db.staff[schoolId] = (db.staff[schoolId] || []).filter(function(u){ return low(u.email) !== low(email); });
    logHistory(db, { school_id: schoolId, section_id: null, section_name: '', students: [], kind: 'student', action: 'teacher.remove',
      changes: [{ label: 'Teacher access', from: nameFor(db, email, schoolId) || low(email), to: 'removed' }], actor: actorFor(db, actorEmail, schoolId) });
    write(db);
    return { ok:true };
  }

  // Sections a teacher is allowed to touch (spec §4 A3/A4 scope).
  function sectionsForTeacher(email, schoolId){
    var db = getDB();
    var ids = teacherScope(db, email, schoolId);
    return ids.map(function(id){ return db.sections[id]; }).filter(Boolean);
  }

  // Roster the actor is entitled to see (verify-before-reveal does NOT apply to
  // a teacher for their own sections — they own that roster). Includes claimCode
  // so the teacher can hand it to the parent.
  function listRoster(email, schoolId, opts){
    var db = getDB(); opts = opts||{};
    var role = roleOf(db, email, schoolId);
    var all = Object.keys(db.students).map(function(k){ return db.students[k]; })
                    .filter(function(s){ return s.school_id===schoolId; });
    var scoped;
    if (role==='admin') scoped = all;                                    // whole school (spec §7)
    else if (role==='teacher'){ var mine = teacherScope(db, email, schoolId);
      scoped = all.filter(function(s){ return mine.indexOf(s.section_id)>=0; }); }  // own sections only
    else scoped = [];                                                    // parents don't list rosters
    if (!opts.includeLeft) scoped = scoped.filter(function(s){ return s.status!=='left'; });
    return scoped.map(pubStudent);
  }

  // SERVER-SIDE (spec A4): dedupe-on-add. All three add-paths (manual / CSV /
  // photo) funnel through here so the guard can't be bypassed.
  //   result: 'created' | 'merged' | 'denied'
  //         | 'name_dup'    -> same name, different admission number (teacher confirms)
  //         | 'id_conflict' -> same admission number, different child (teacher picks owner)
  //   input.force: 'name'    -> create despite a same-name match
  //                'replace'  -> on id_conflict, overwrite the record's identity
  function addStudent(input){
    var db = getDB();
    input = input || {};
    var schoolId = input.school_id;
    var actor    = low(input.actorEmail);
    var role     = roleOf(db, actor, schoolId);
    var sectionId= input.section_id;

    // GUARD: only a teacher (own sections) or admin may create a student (spec §7).
    if (role!=='teacher' && role!=='admin')
      return { ok:false, result:'denied', reason:'not-authorized' };
    if (role==='teacher' && teacherScope(db, actor, schoolId).indexOf(sectionId) < 0)
      return { ok:false, result:'denied', reason:'section-out-of-scope' };  // spec A4 scope

    var sid = up(input.student_id);
    if (!sid) return { ok:false, result:'denied', reason:'missing-student-id' };
    var k = keyOf(schoolId, sid);

    var inName = (norm(input.first)+' '+norm(input.last)).trim();
    var sameName = function(c){ return low(fullName(c)) === low(inName); };

    // 1) EXACT admission-number match (school_id, student_id).
    if (db.students[k]){
      var ex = db.students[k];
      // (a) Same number AND same name -> the same child re-entered (idempotent);
      //     fill any blanks. Same path the teacher takes after choosing REPLACE.
      if (input.force==='replace' || sameName(ex)){
        var before = Object.assign({}, ex);
        if (input.force==='replace'){ ex.first = norm(input.first); ex.last = norm(input.last); }
        ['first','last','dob','gender','parentName','parentEmail','section_id','grade','section'].forEach(function(f){
          if (!norm(ex[f]) && norm(input[f])) ex[f] = input[f];
        });
        ex.name = norm(ex.first)+' '+norm(ex.last);
        var filled = diffFields(before, ex, STUDENT_FIELDS);
        if (filled.length) logHistory(db, studentEvent(db, ex, 'student.edit', actor, { changes: filled }));
        write(db);
        return { ok:true, result:'merged', student:Object.assign({}, ex) };
      }
      // (b) Same number, DIFFERENT child -> two kids can't share a number. The
      //     teacher picks who keeps it (resolve via force:'replace' or a new id).
      return { ok:true, result:'id_conflict',
               existing:{ name:ex.name, first:ex.first, last:ex.last, student_id:ex.student_id },
               incoming:{ first:norm(input.first), last:norm(input.last), student_id:sid } };
    }

    // 2) SAME NAME as an existing child, but a DIFFERENT admission number.
    //    Often two real children who share a name -> let the teacher confirm with
    //    "Ignore and add" (force:'name' skips this check and creates the record).
    if (input.force!=='name'){
      var candidates = Object.keys(db.students).map(function(x){ return db.students[x]; })
                             .filter(function(s){ return s.school_id===schoolId; });
      for (var i=0;i<candidates.length;i++){
        if (sameName(candidates[i])){
          return { ok:true, result:'name_dup',
                   matched:{ name:candidates[i].name, student_id:candidates[i].student_id },
                   incoming:{ first:norm(input.first), last:norm(input.last), student_id:sid } };
        }
      }
    }

    // 3) Genuinely new. A teacher fills their class up to the size the admins
    //    set; past it (or with no size set) the child only goes in as Pending
    //    when the teacher asks (input.request) — a school admin or Tilli then
    //    approves or turns it down. Pending children can be assessed meanwhile.
    var sec = db.sections[sectionId], pending = false;
    if (role==='teacher' && sec){
      var room = roomIn(db, sec);
      if (room.full){
        if (!input.request)
          return { ok:true, result:'over_limit', room:room,
                   incoming:{ first:norm(input.first), last:norm(input.last), student_id:sid } };
        pending = true;
      }
    }
    var rec = {
      student_id: sid, school_id: schoolId, section_id: sectionId,
      first: norm(input.first), last: norm(input.last), name: (norm(input.first)+' '+norm(input.last)).trim(),
      grade: input.grade || (db.sections[sectionId]&&db.sections[sectionId].grade) || '',
      section: input.section || (db.sections[sectionId]&&db.sections[sectionId].section) || '',
      gender: input.gender || '', dob: input.dob || '',
      claimCode: makeClaimCode(sid),           // stable code the teacher hands to the parent
      uid: makeUid(schoolId, sid),             // student's unique Tilli Measures code
      parentName: norm(input.parentName), parentEmail: low(input.parentEmail),
      status:'active', source: input.source||'manual', createdAt: Date.now(),
    };
    if (pending){ rec.approval = 'pending'; rec.requestedBy = actor; rec.requestedAt = rec.createdAt; }
    db.students[k] = rec;
    logHistory(db, studentEvent(db, rec, pending ? 'student.request' : 'student.add', actor, { source: rec.source }));
    // An admin's add is the class list itself: the expected size never sits below it.
    if (role==='admin' && sec){ var have = roomIn(db, sec).added; if (!(sec.expected >= have)){ sec.expected = have; sec.expectedConfirmed = false; } }
    write(db);
    return { ok:true, result: pending ? 'requested' : 'created', student:Object.assign({}, rec) };
  }

  // Bulk add (CSV / photo OCR rows) — same dedupe guard per row, returns a summary
  // so the UI can show a confirm/review step on bulk import (spec A4 detail).
  function addStudentsBulk(actorEmail, schoolId, sectionId, rows, source){
    var summary = { created:[], merged:[], conflicts:[], denied:[] };
    (rows||[]).forEach(function(r){
      var res = addStudent(Object.assign({ actorEmail:actorEmail, school_id:schoolId, section_id:sectionId, source:source||'csv' }, r));
      if (res.result==='created') summary.created.push(res.student);
      else if (res.result==='merged') summary.merged.push(res.student);
      else if (res.result==='requested') (summary.requested = summary.requested || []).push(res.student);
      else if (res.result==='name_dup' || res.result==='id_conflict' || res.result==='over_limit') summary.conflicts.push(res);
      else summary.denied.push({ row:r, reason:res.reason });
    });
    return { ok:true, summary:summary };
  }

  /* ---------- EXPECTED CLASS SIZE (roster completeness) ----------
     Tilli, group and school admins set how many children each section has.
     Teachers add freely up to that; past it, a new child is a Pending request
     any admin can approve (the size goes up) or turn down (the record goes).
     Rooms count every child still at school, Pending ones included. */
  function findSection(db, schoolId, grade, section){
    return schoolSections(db, schoolId).filter(function(s){ return low(s.grade)===low(grade) && low(s.section||'')===low(section||''); })[0] || null;
  }
  function kidsIn(db, sectionId){
    return Object.keys(db.students).map(function(k){ return db.students[k]; })
      .filter(function(s){ return s.section_id===sectionId && s.status!=='left' && s.status!=='graduated'; });
  }
  function roomIn(db, sec){
    var kids = kidsIn(db, sec.section_id), pending = kids.filter(function(s){ return s.approval==='pending'; }).length;
    var exp = sec.expected > 0 ? sec.expected : null;
    return { section_id: sec.section_id, name: sec.name, expected: exp, added: kids.length - pending, pending: pending,
      confirmed: exp != null && sec.expectedConfirmed !== false,   // false = set automatically, an admin hasn't checked it
      total: kids.length, left: exp == null ? 0 : Math.max(0, exp - kids.length),
      full: exp == null || kids.length >= exp };   // full = a teacher can't add without approval
  }
  // sectionRoom(schoolId, sectionId) or sectionRoom(schoolId, grade, section).
  // The school may be passed by id or name (the teacher apps carry the name).
  function sectionRoom(schoolId, sectionOrGrade, section){
    var sc = resolveSchool(schoolId); if (!sc) return null;
    var db = getDB(), sid = sc.school_id, sec = section === undefined ? db.sections[sectionOrGrade] : findSection(db, sid, sectionOrGrade, section);
    return sec && sec.school_id===sid ? roomIn(db, sec) : null;
  }
  function schoolRooms(schoolId){ var db = getDB(); return schoolSections(db, schoolId).map(function(s){ return roomIn(db, s); }); }
  // SERVER-SIDE: Tilli / group / school admins only — never a teacher or parent.
  function setSectionExpected(schoolId, sectionId, n, actorEmail){
    var db = getDB(), sec = db.sections[sectionId];
    if (!sec || sec.school_id!==schoolId) return { ok:false, reason:'not_found' };
    var role = roleOf(db, actorEmail, schoolId);
    if (role==='teacher' || role==='parent') return { ok:false, reason:'not-authorized' };
    var v = parseInt(n, 10); v = v > 0 ? v : null;
    var was = sec.expected > 0 ? sec.expected : null;
    if (v != null && sec.expectedConfirmed === false){ sec.expectedConfirmed = true; write(db); }   // saving a size = an admin checked it
    if (v !== was){
      sec.expected = v; sec.expectedConfirmed = v != null;
      logHistory(db, { school_id:schoolId, section_id:sec.section_id, section_name:sec.name, students:[], kind:'student', action:'section.expected',
        changes:[{ label:'Expected students', from: was == null ? 'Not set' : String(was), to: v == null ? 'Not set' : String(v) }],
        actor: actorFor(db, actorEmail, schoolId) });
      write(db);
    }
    return { ok:true, room: roomIn(db, sec) };
  }
  // Pending children — one school, or every school (the Tilli Control Room).
  function pendingStudents(schoolId){
    var db = getDB();
    return Object.keys(db.students).map(function(k){ return db.students[k]; })
      .filter(function(s){ return s.approval==='pending' && s.status!=='left' && (!schoolId || s.school_id===schoolId); })
      .sort(function(a, b){ return (a.requestedAt || 0) - (b.requestedAt || 0); })
      .map(function(s){
        var o = pubStudent(s), sec = db.sections[s.section_id], sc = db.schools[s.school_id];
        o.section_name = sec ? sec.name : norm((s.grade||'')+' '+(s.section||''));
        o.school_name = sc ? sc.name : s.school_id;
        o.requestedByName = nameFor(db, s.requestedBy, s.school_id) || s.requestedBy || '';
        o.room = sec ? roomIn(db, sec) : null;
        return o;
      });
  }
  // SERVER-SIDE: any admin (school, group or Tilli). Approve → the child is
  // confirmed and the class size grows to fit; turn down → the record is removed.
  function decideStudent(schoolId, studentId, approve, actorEmail){
    var db = getDB(), k = keyOf(schoolId, studentId), rec = db.students[k];
    if (!rec || rec.approval!=='pending') return { ok:false, reason:'not_found' };
    var role = roleOf(db, actorEmail, schoolId);
    if (role==='teacher' || role==='parent') return { ok:false, reason:'not-authorized' };
    var sec = db.sections[rec.section_id];
    if (approve){
      delete rec.approval; rec.approvedBy = low(actorEmail); rec.approvedAt = Date.now();
      if (sec){ var have = roomIn(db, sec).added; if (!(sec.expected >= have)) sec.expected = have; }
      logHistory(db, studentEvent(db, rec, 'student.approve', actorEmail));
    } else {
      logHistory(db, studentEvent(db, rec, 'student.reject', actorEmail));
      delete db.students[k];
      db.parentLinks = db.parentLinks.filter(function(l){ return !(l.school_id===schoolId && l.student_id===up(studentId)); });
    }
    write(db);
    return { ok:true, room: sec ? roomIn(db, sec) : null };
  }

  /* ======================================================================
     FLOW B — SECURE PARENT CLAIM  (spec §5, verify-before-reveal)
     ====================================================================== */

  // B1 — parent enters the child's student_id. REVEAL NOTHING (spec B1,
  // acceptance #6): the response is identical whether or not the id exists.
  function _beginClaim(schoolNameOrId, studentId){
    var db = getDB();
    var school = resolveSchool(schoolNameOrId);
    var sid = up(studentId);
    // Note whether it exists ONLY server-side; never surface it.
    var exists = !!(school && db.students[keyOf(school.school_id, sid)]);
    var challengeId = newId('chal');
    db.claimChallenges[challengeId] = { school_id: school?school.school_id:null, student_id: sid, exists: exists, created: Date.now() };
    write(db);
    // Uniform response — no name, grade, section, or exists/doesn't-exist signal.
    return { ok:true, challengeId: challengeId, next:'second-factor', factor: school ? school.claimMethod : 'code' };
  }

  function _attemptKey(schoolId, sid){ return keyOf(schoolId||'?', sid); }

  // B2 — parent enters the second factor (claim code, or DOB per school setting).
  // SERVER-SIDE: rate-limit + lock; wrong-id and wrong-factor return the SAME
  // generic error; never confirm existence (spec B2 / acceptance #8).
  function _verifyClaim(challengeId, secondFactor){
    var db = getDB();
    var ch = db.claimChallenges[challengeId];
    if (!ch) return { ok:false, error:'expired' };            // challenge unknown/old — restart
    var ak = _attemptKey(ch.school_id, ch.student_id);
    var at = db.attempts[ak] || { count:0, lockedUntil:0 };

    if (at.lockedUntil && Date.now() < at.lockedUntil){
      write(db);
      return { ok:false, error:'locked', retryAt: at.lockedUntil };   // rate-limit lock (allowed to say "locked")
    }

    var GENERIC = { ok:false, error:'mismatch' };             // the ONLY failure the caller can see
    var school  = ch.school_id ? db.schools[ch.school_id] : null;
    var stu     = (ch.school_id) ? db.students[keyOf(ch.school_id, ch.student_id)] : null;

    var pass = false;
    if (stu && stu.status==='active' && school){
      var f = norm(secondFactor);
      var method = school.claimMethod || 'code';
      var codeOk = up(f) === up(stu.claimCode);
      var dobOk  = norm(f) === norm(stu.dob);
      pass = method==='code' ? codeOk : method==='dob' ? dobOk : (codeOk||dobOk);
    }

    if (!pass){
      at.count += 1;
      if (at.count >= MAX_ATTEMPTS){ at.lockedUntil = Date.now() + LOCK_MS; at.count = 0; }
      db.attempts[ak] = at; write(db);
      return GENERIC;                                         // identical for not-found & wrong-factor
    }

    // Success — issue a one-shot claim token; reveal is gated behind THIS.
    db.attempts[ak] = { count:0, lockedUntil:0 };
    var token = newId('claim');
    db.claimTokens[token] = { school_id: ch.school_id, student_id: ch.student_id, created: Date.now() };
    delete db.claimChallenges[challengeId];
    write(db);
    // B3 reveal — only now do we return the child's details, for confirmation.
    return { ok:true, claimToken: token, child: { name:stu.name, first:stu.first, grade:stu.grade, section:stu.section, school:school.name, student_id:stu.student_id } };
  }

  // B3 — parent confirms it's the right child -> create the ParentLink.
  // SERVER-SIDE: a claim LINKS, it never creates a student (spec B3 / acceptance #10).
  function _confirmClaim(claimToken, parentEmail){
    var db = getDB();
    var tk = db.claimTokens[claimToken];
    if (!tk) return { ok:false, error:'expired' };
    var stu = db.students[keyOf(tk.school_id, tk.student_id)];
    if (!stu || stu.status==='left') return { ok:false, error:'unavailable' };
    var e = low(parentEmail);
    var existing = db.parentLinks.find(function(l){ return l.parent_user_id===e && l.school_id===tk.school_id && l.student_id===tk.student_id; });
    var wasActive = !!(existing && existing.status==='active');
    if (existing){ existing.status='active'; existing.verified_at = existing.verified_at||Date.now(); }
    else db.parentLinks.push({ parent_user_id:e, school_id:tk.school_id, student_id:tk.student_id, status:'active', verified_at:Date.now() });
    if (!wasActive) logHistory(db, studentEvent(db, stu, 'parent.link', e, { changes: [{ label:'Parent', from:'', to:e }] }));
    delete db.claimTokens[claimToken];
    write(db);
    return { ok:true, linked:{ student_id:stu.student_id, name:stu.name, grade:stu.grade, section:stu.section } };
  }

  // Children a parent is linked to (active links only). Replaces the old
  // hardcoded/URL-trusting lookup in parent.html (spec §7 "own children only").
  function childrenForParent(parentEmail, schoolId){
    var db = getDB();
    var e = low(parentEmail);
    return db.parentLinks
      .filter(function(l){ return l.parent_user_id===e && l.status==='active' && (!schoolId || l.school_id===schoolId); })
      .map(function(l){ var s = db.students[keyOf(l.school_id, l.student_id)]; return s && s.status!=='left' ? Object.assign({}, s) : null; })
      .filter(Boolean);
  }

  /* ======================================================================
     FLOW C — LIFECYCLE & REVOKE  (spec §6, Admin-only; data-layer only in v1)
     ====================================================================== */

  // SERVER-SIDE: only an Admin may offboard. Student set 'left', parent links
  // revoked, record RETAINED (never deleted) — spec §6 / acceptance #11, #13.
  function offboardStudent(actorEmail, schoolId, studentId){
    var db = getDB();
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok:false, error:'not-authorized' };
    var s = db.students[keyOf(schoolId, studentId)];
    if (!s) return { ok:false, error:'not-found' };
    var wasStatus = s.status, revoked = 0;
    s.status = 'left';
    db.parentLinks.forEach(function(l){ if (l.school_id===schoolId && l.student_id===up(studentId) && l.status!=='revoked'){ l.status='revoked'; revoked++; } });
    var ch = [{ label:'Status', from: wasStatus==='left' ? 'Left' : 'Active', to:'Left' }];
    if (revoked) ch.push({ label:'Parent links', from: revoked + ' active', to:'revoked' });
    logHistory(db, studentEvent(db, s, 'student.offboard', actorEmail, { changes: ch }));
    write(db);
    return { ok:true, student_id:s.student_id, status:'left' };
  }

  // SERVER-SIDE: Admin-only. Link revoked; student record untouched (spec §6).
  function revokeParentLink(actorEmail, schoolId, studentId, parentEmail){
    var db = getDB();
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok:false, error:'not-authorized' };
    var l = db.parentLinks.find(function(x){ return x.school_id===schoolId && x.student_id===up(studentId) && x.parent_user_id===low(parentEmail) && x.status==='active'; });
    if (!l) return { ok:false, error:'not-found' };
    l.status = 'revoked';
    var stu = db.students[keyOf(schoolId, studentId)];
    if (stu) logHistory(db, studentEvent(db, stu, 'parent.unlink', actorEmail, { changes: [{ label:'Parent', from:l.parent_user_id, to:'' }] }));
    write(db);
    return { ok:true };
  }

  // SERVER-SIDE: Admin-only. Move a departing teacher's sections to another
  // teacher; roster/student data stays with the school (spec §6 / acceptance #12).
  function reassignTeacher(actorEmail, schoolId, fromEmail, toEmail, sectionIds){
    var db = getDB();
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok:false, error:'not-authorized' };
    var from = db.teacherMemberships.find(function(m){ return m.user_id===low(fromEmail) && m.school_id===schoolId; });
    var to   = db.teacherMemberships.find(function(m){ return m.user_id===low(toEmail) && m.school_id===schoolId; });
    if (!from) return { ok:false, error:'from-not-found' };
    if (!to){ to = { user_id:low(toEmail), school_id:schoolId, section_ids:[], status:'active' }; db.teacherMemberships.push(to); }
    var move = (sectionIds && sectionIds.length) ? sectionIds : from.section_ids.slice();
    move.forEach(function(id){ if (to.section_ids.indexOf(id)<0) to.section_ids.push(id); var i=from.section_ids.indexOf(id); if(i>=0) from.section_ids.splice(i,1); });
    if (from.section_ids.length===0) from.status='revoked';   // departed teacher's access revoked
    move.forEach(function(id){
      var sec = db.sections[id];
      logHistory(db, { school_id:schoolId, section_id:id, section_name: sec ? sec.name : '', kind:'student', action:'teacher.reassign',
        actor: actorFor(db, actorEmail, schoolId),
        changes:[{ label:'Teacher', from: nameFor(db, fromEmail, schoolId), to: nameFor(db, toEmail, schoolId) }] });
    });
    write(db);
    return { ok:true, from:from.section_ids, to:to.section_ids };
  }

  /* ======================================================================
     FLOW A — INVITES & VERIFICATION  (spec §4 A1–A3, closed trust chain)
     Data-layer only in v1 (no admin/Tilli UI yet).
     ====================================================================== */

  // SERVER-SIDE (spec A1): only Tilli staff mark a school verified.
  function verifySchool(actorRole, schoolId){
    var db = getDB();
    if (actorRole !== 'tilli') return { ok:false, error:'not-authorized' };
    if (!db.schools[schoolId]) return { ok:false, error:'not-found' };
    db.schools[schoolId].verified = true; write(db);
    return { ok:true };
  }

  // SERVER-SIDE (spec A2): invite-only, and only into a VERIFIED school.
  function inviteAdmin(actorRole, schoolId, email){
    var db = getDB();
    if (actorRole !== 'tilli') return { ok:false, error:'not-authorized' };
    var sc = db.schools[schoolId];
    if (!sc || !sc.verified) return { ok:false, error:'school-not-verified' };  // no admin into an unverified school
    var inv = { token:newId('inv'), school_id:schoolId, email:low(email), role:'admin', section_ids:[], used:false };
    db.invites.push(inv); write(db);
    return { ok:true, invite:inv };
  }

  // SERVER-SIDE (spec A3): Admin invites teachers, each scoped to section(s).
  function inviteTeacher(actorEmail, schoolId, email, sectionIds){
    var db = getDB();
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok:false, error:'not-authorized' };
    var inv = { token:newId('inv'), school_id:schoolId, email:low(email), role:'teacher', section_ids:(sectionIds||[]).slice(), used:false };
    db.invites.push(inv); write(db);
    return { ok:true, invite:inv };
  }

  // Accept an invite -> creates the scoped membership. No open self-signup: an
  // account can only join a school through a matching invite token (spec §5, A2/A3).
  function acceptInvite(token, email){
    var db = getDB();
    var inv = db.invites.find(function(x){ return x.token===token && !x.used; });
    if (!inv) return { ok:false, error:'invalid-invite' };
    if (low(email) !== inv.email) return { ok:false, error:'email-mismatch' };
    if (inv.role==='admin') db.adminMemberships.push({ user_id:inv.email, school_id:inv.school_id, role:'admin', status:'active' });
    else db.teacherMemberships.push({ user_id:inv.email, school_id:inv.school_id, section_ids:inv.section_ids.slice(), status:'active', via:'invite', joinedAt:Date.now() });
    inv.used = true; write(db);
    return { ok:true, role:inv.role, school_id:inv.school_id, section_ids:inv.section_ids };
  }

  /* ======================================================================
     ACCOUNTS — Platform Admin "New invitation" (temp password → first-login reset)
     ----------------------------------------------------------------------
     Real (for the demo) sign-in accounts. createInvite mints a one-time
     temporary password the admin relays to the recipient; on first sign-in
     the account is flagged mustReset, so the login flow forces the user to
     choose their own password (setPassword) before continuing. When the
     invite carries a school + a school-scoped role, we also create the
     matching membership so the app routes them to the right dashboard.
     ====================================================================== */
  function makeTempPassword(){
    // Readable one-time code: 3 letters + 4 digits (no lookalikes).
    var abc='ABCDEFGHJKMNPQRSTUVWXYZ', dig='23456789', out='';
    for (var i=0;i<3;i++) out += abc[Math.floor(Math.random()*abc.length)];
    for (var j=0;j<4;j++) out += dig[Math.floor(Math.random()*dig.length)];
    return out;
  }
  // Map the Platform Admin role label to an internal membership role.
  function membershipRoleFor(label){
    var r = low(label);
    if (r.indexOf('teacher')>=0) return 'teacher';
    if (r.indexOf('school admin')>=0 || r==='admin' || r.indexOf('coordinator')>=0) return 'admin';
    return null;   // Super Admin / School Group Admin → account only, no per-school membership
  }
  function createInvite(input){
    input = input || {};
    var db = getDB();
    var email = low(input.email);
    if (!email) return { ok:false, error:'missing-email' };
    var temp = makeTempPassword();
    var acct = {
      email: email, role: input.role || 'Super Admin', school_id: input.school_id || null,
      group_id: input.group_id || null,   // School Group Admin → which group's view they open
      tempPassword: temp, password: null, mustReset: true, status: 'invited',
      invitedBy: low(input.invitedBy) || null, createdAt: Date.now(), activatedAt: null,
      // Optional roster metadata carried by teacher invites (grade/section/board),
      // so the school dashboard can render the full invite receipt + user table.
      name: input.name || null, grade: input.grade || null,
      section: input.section || null, board: input.board || null,
      // School admins in a multi-board school: null = every board, else the boards they may see.
      boards: Array.isArray(input.boards) && input.boards.length ? input.boards.slice() : null,
    };
    db.accounts[email] = acct;

    // Best-effort: give a school-scoped invite the membership its dashboard needs
    // so first login routes correctly (created schools resolve role via roleOf).
    var mRole = membershipRoleFor(acct.role);
    if (acct.school_id && mRole==='admin' && !db.adminMemberships.some(function(m){ return m.user_id===email && m.school_id===acct.school_id; }))
      db.adminMemberships.push({ user_id:email, school_id:acct.school_id, role:'admin', status:'active', boards:acct.boards });
    if (acct.school_id && mRole==='teacher' && !db.teacherMemberships.some(function(m){ return m.user_id===email && m.school_id===acct.school_id; }))
      db.teacherMemberships.push({ user_id:email, school_id:acct.school_id, section_ids:[], status:'active', via:'invite', joinedAt:Date.now() });

    write(db);
    return { ok:true, email:email, tempPassword:temp, role:acct.role, school_id:acct.school_id,
      name:acct.name, grade:acct.grade, section:acct.section, board:acct.board, createdAt:acct.createdAt };
  }
  function getAccount(email){ var a = getDB().accounts[low(email)]; return a ? Object.assign({}, a) : null; }
  function listAccounts(){ var db = getDB(); return Object.keys(db.accounts).map(function(k){ return Object.assign({}, db.accounts[k]); }); }
  // Validate a sign-in attempt. Returns { ok, mustReset } on success. Only
  // accounts we minted are enforced here; the loose demo default lives in the
  // login flow for everyone else.
  function checkPassword(email, pw){
    var a = getDB().accounts[low(email)];
    if (!a) return { ok:false, error:'no-account' };
    var want = a.mustReset ? a.tempPassword : a.password;
    if (want == null) return { ok:false, error:'no-password' };
    if (norm(pw) !== want) return { ok:false, error:'mismatch' };
    return { ok:true, mustReset:!!a.mustReset, role:a.role, school_id:a.school_id };
  }
  // First-login reset (or any later change): store the user's own password and
  // clear the one-time temp + mustReset flag.
  function setPassword(email, newPw){
    var db = getDB();
    var a = db.accounts[low(email)];
    if (!a) return { ok:false, error:'no-account' };
    if (norm(newPw).length < 6) return { ok:false, error:'too-short' };
    a.password = norm(newPw); a.tempPassword = null; a.mustReset = false;
    a.status = 'active'; a.activatedAt = a.activatedAt || Date.now();
    write(db);
    return { ok:true };
  }

  /* ---------- read helpers the UI needs ---------- */
  // Public copy of a student record. `uid` is derived when a record predates
  // the UID field (deterministic, so the value never changes).
  function pubStudent(s){ var o=Object.assign({},s); if(!o.uid) o.uid=makeUid(o.school_id,o.student_id); return o; }
  // Teacher edits a child's name and/or UID. The UID must stay unique across
  // every school (compared case-insensitively against stored + derived UIDs).
  var UID_RE = /^[A-Z0-9][A-Z0-9-]{2,19}$/;
  function updateStudent(schoolId, studentId, patch, actorEmail){
    var db = getDB(); var k = keyOf(schoolId, studentId); var rec = db.students[k];
    if (!rec) return { ok:false, reason:'not_found' };
    patch = patch || {};
    var first = patch.first != null ? norm(patch.first) : rec.first;
    var last  = patch.last  != null ? norm(patch.last)  : rec.last;
    if (!first) return { ok:false, reason:'name_required' };
    var uid = patch.uid != null ? up(patch.uid) : (rec.uid || makeUid(rec.school_id, rec.student_id));
    if (!UID_RE.test(uid)) return { ok:false, reason:'uid_format' };
    var clash = Object.keys(db.students).some(function(x){
      if (x === k) return false;
      var s = db.students[x]; return up(s.uid || makeUid(s.school_id, s.student_id)) === uid;
    });
    if (clash) return { ok:false, reason:'uid_taken' };
    var before = pubStudent(rec);
    rec.first = first; rec.last = last; rec.name = (first+' '+last).trim(); rec.uid = uid;
    var changes = diffFields(before, rec, STUDENT_FIELDS);
    if (changes.length) logHistory(db, studentEvent(db, rec, 'student.edit', actorEmail, { changes: changes }));
    write(db);
    return { ok:true, student: pubStudent(rec) };
  }
  function getStudent(schoolId, studentId){ var db=getDB(); var s=db.students[keyOf(schoolId,studentId)]; return s?pubStudent(s):null; }
  function schoolSettings(schoolNameOrId){ var sc=resolveSchool(schoolNameOrId); return sc?{ claimMethod:sc.claimMethod, verified:sc.verified }:null; }
  function reviewQueue(actorEmail, schoolId){ var db=getDB(); if(roleOf(db,actorEmail,schoolId)!=='admin') return []; return db.reviewQueue.filter(function(f){return f.school_id===schoolId;}); }

  /* ======================================================================
     NEW — FULL SCHOOL MATERIALIZATION  (Platform Admin "Add school")
     ----------------------------------------------------------------------
     The Add-School wizard captures grade/section *counts* only. To let the
     teacher & parent apps actually run assessments, a created school needs a
     real roster: named students with admission numbers + claim codes, one
     teacher per section, and a coordinator. We generate that deterministically
     (stable across reloads via a per-school seeded RNG) and write it straight
     into the shared DB so every other app can consume it.
     ====================================================================== */
  function slugify(s){ return low(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'school'; }
  // Deterministic per-school RNG so the same wizard input always yields the
  // same roster (names/adm numbers) — no surprises on reload.
  function schoolRng(seedStr){ var s = hashStr(seedStr) || 1; return function(){ s = (Math.imul(s,1664525) + 1013904223) >>> 0; return s/4294967296; }; }

  // input: { name, board, city, country, grades:[{grade, students, sections:[{name,students}]}],
  //          admin:{name,email} }  (shape produced by the wizard's draft object)
  // Returns a runbook-friendly summary (codes the user needs to click through).
  function createSchoolFull(input){
    input = input || {};
    var db = getDB();
    var name = norm(input.name) || 'New School';
    var baseId = slugify(name), id = baseId, n = 1;
    while (db.schools[id]) { id = baseId + '-' + (++n); }
    var R = schoolRng(id);

    var code = (up(name).replace(/[^A-Z]/g,'').slice(0,4) || 'SCHL');
    while (code.length < 4) code += 'X';
    code = code + '-' + (1000 + Math.floor(R()*9000));
    var joinCode = code;   // one school code does everything (links, teacher sign-up, student assessments)

    db.schools[id] = {
      school_id:id, name:name, board:input.board||'CBSE',
      boards: Array.isArray(input.boards) && input.boards.length ? input.boards.slice() : null,
      city:input.city||'', country:input.country||'',
      verified:true, status:'active', claimMethod:'code',
      joinCode:joinCode, code:code, source:'created', createdAt:Date.now(),
      group_id: input.groupId || null,   // persisted so the school stays in its group after a reload
    };
    db.staff[id] = [];

    // Coordinator (school admin) — from the wizard, or generated.
    var coordEmail = low(input.admin && input.admin.email) || ('coordinator@' + baseId + '.edu');
    var coordName  = norm(input.admin && input.admin.name) || 'School Coordinator';
    var coordBoards = input.admin && Array.isArray(input.admin.boards) && input.admin.boards.length ? input.admin.boards.slice() : null;   // null = every board
    db.adminMemberships.push({ user_id:coordEmail, school_id:id, role:'admin', name:coordName, status:'active', boards:coordBoards });
    db.staff[id].push({ name:coordName, email:coordEmail, role:'coordinator', section_id:null });

    // Normalise grades: a grade with no explicit sections but a count becomes
    // one section 'A' carrying that count.
    var grades = (input.grades||[]).map(function(g){
      var secs = (g.sections||[]).slice();
      if (!secs.length && (parseInt(g.students,10)||0) > 0) secs = [{ name:'A', students:parseInt(g.students,10)||0 }];
      return { grade:g.grade, base:g.base || inferBaseGrade(g.grade), board:g.board || null, sections:secs };
    }).filter(function(g){ return g.grade; });
    // A grade added without sections is kept (it shows in Structure); students
    // and teachers attach to sections, so it holds nobody until one is added.
    db.schools[id].emptyGrades = grades.filter(function(g){ return !g.sections.length; }).map(function(g){ return { grade:g.grade, base:g.base, board:g.board }; });

    var teachers = [];
    grades.forEach(function(g){
      g.sections.forEach(function(sec){
        var secId = 'sec_' + id + '_' + slugify(g.grade + '_' + sec.name);
        // Sections are created WITHOUT a teacher. Teachers don't exist until a
        // Tilli/school admin invites one (inviteTeacher) or a teacher self-joins
        // with the school code (resolveJoinCode → ensureTeacherScope). The old
        // "one teacher per section" auto-seed was removed per product rule.
        db.sections[secId] = { section_id:secId, school_id:id, grade:g.grade, section:sec.name,
          name:(g.grade+' '+sec.name).trim(), teacherId:null,
          base_grade: g.base || '', base_section: sec.base || sec.name, board: g.board || null,
          expected: (parseInt(sec.students,10) || 0) > 0 ? parseInt(sec.students,10) : null,
          expectedConfirmed: (parseInt(sec.students,10) || 0) > 0 };

        // Students are NOT seeded here either — the section is created empty so
        // the coordinator can add students via the roster / CSV flow and
        // experience the real onboarding. The wizard's per-section count is
        // kept as the class's expected size: teachers can add up to it.
      });
    });

    db.deployments[id] = {};
    db.completions[id] = {};
    // This academic year, as entered in Add School (else yearsIn() guesses later).
    if (input.yearStart && input.yearEnd && input.yearEnd > input.yearStart){
      var yl = yearLabel(input.yearStart, input.yearEnd);
      (db.years = db.years || {})[id] = [{ id: yearId(yl), label: yl, start: input.yearStart, end: input.yearEnd, status: 'current', startedAt: Date.now(), startedBy: '' }];
    }
    if (db.createdSchools.indexOf(id) < 0) db.createdSchools.push(id);
    write(db);

    // A few claim samples for the runbook (first student of each section).
    var claimSamples = Object.keys(db.students).map(function(k){ return db.students[k]; })
      .filter(function(s){ return s.school_id===id; }).slice(0,6)
      .map(function(s){ return { adm:s.student_id, name:s.name, grade:s.grade, section:s.section, claimCode:s.claimCode }; });

    return { ok:true, school_id:id, name:name, code:code, joinCode:joinCode,
      claimMethod:'code',
      coordinator:{ name:coordName, email:coordEmail },
      teachers:teachers,
      studentCount:Object.keys(db.students).filter(function(k){ return db.students[k].school_id===id; }).length,
      claimSamples:claimSamples };
  }

  // Teacher self-join by the school join code (spec: teacher enters code, is
  // added as staff). Returns the school so the app can route to it. Section
  // scope is granted separately (ensureTeacherScope) when they pick a class.
  function resolveJoinCode(codeStr){ return resolveSchoolCode(codeStr); }
  // Teacher self-sign-up: the teacher picked a school, then proves it with that
  // school's code. Case / spaces / hyphens are ignored. Never reveals which
  // school a wrong code belongs to.
  function verifySchoolCode(schoolNameOrId, codeStr){
    var sc = resolveSchool(schoolNameOrId);
    if (!sc) return { ok:false, reason:'unknown_school' };
    var clean = function(x){ return up(x).replace(/[^A-Z0-9]/g,''); };
    if (!sc.code) return { ok:false, reason:'no_code' };
    if (!clean(codeStr) || clean(codeStr)!==clean(sc.code)) return { ok:false, reason:'mismatch' };
    return { ok:true, school:Object.assign({}, sc) };
  }
  // SERVER-SIDE: Tilli team or the school's admin. A new code replaces the old
  // one at once — every link and code shared before stops working.
  function regenerateSchoolCode(schoolId, actorEmail){
    var db = getDB(), sc = db.schools[schoolId];
    if (!sc) return { ok:false, reason:'not_found' };
    var role = roleOf(db, actorEmail, schoolId);
    if (role==='teacher' || role==='parent') return { ok:false, reason:'not-authorized' };
    var prefix = (up(sc.name).replace(/[^A-Z]/g,'').slice(0,4) || 'SCHL'); while (prefix.length < 4) prefix += 'X';
    var taken = function(c){ return Object.keys(db.schools).some(function(k){ return up(db.schools[k].code)===c; }); };
    var old = sc.code, code;
    do { code = prefix + '-' + (1000 + Math.floor(Math.random() * 9000)); } while (code === up(old) || taken(code));
    sc.code = sc.joinCode = code; sc.codeChangedAt = Date.now();   // the school dashboard shows a re-share banner for a week
    logHistory(db, { school_id:schoolId, section_id:null, section_name:'', students:[], kind:'student', action:'school.code',
      changes:[{ label:'School code', from: old || '', to: code }], actor: actorFor(db, actorEmail, schoolId) });
    write(db);
    return { ok:true, code:code, old:old };
  }
  function listSchools(){ var db=getDB(); return Object.keys(db.schools).map(function(k){ return Object.assign({}, db.schools[k]); }); }
  // Platform Admin moves a created school between groups (null / 'g-none' = no group).
  function setSchoolGroup(schoolId, groupId){
    var db = getDB(); var sc = db.schools[schoolId];
    if (!sc) return false;
    sc.group_id = (groupId && groupId !== 'g-none') ? groupId : null; write(db);
    return true;
  }
  // Board(s) edited from the platform admin. `board` stays the display string.
  function setSchoolBoards(schoolId, boards){
    var db = getDB(); var sc = db.schools[schoolId];
    if (!sc || !Array.isArray(boards) || !boards.length) return false;
    sc.boards = boards.slice(); sc.board = boards.join(', '); write(db);
    return true;
  }
  function staffFor(schoolId){ var db=getDB(); return (db.staff[schoolId]||[]).slice(); }
  // Active teachers at a school + the sections they own (read-only, for the
  // platform admin's per-teacher assessment log). Name comes from the account,
  // else the seeded demo roster, else the email.
  function teachersFor(schoolId){
    var db = getDB(), seed = (window.TILLI_SCHOOL && window.TILLI_SCHOOL.teachers) || [];
    return db.teacherMemberships.filter(function(m){ return m.school_id===schoolId && m.status==='active'; }).map(function(m){
      var acct = db.accounts && db.accounts[m.user_id];
      var t = seed.find(function(x){ return low(x.email)===m.user_id; });
      var st = (db.staff[schoolId] || []).find(function(x){ return low(x.email)===m.user_id; });
      return { email:m.user_id, name:(acct && acct.name) || (st && st.name) || (t && t.name) || m.user_id, section_ids:(m.section_ids||[]).slice() };
    });
  }
  // Unscoped roster for portfolio / coordinator DISPLAY (not a security path —
  // parent claim + teacher scope still go through the guarded functions above).
  function studentsForSchool(schoolId, opts){ var db=getDB(); opts=opts||{};
    return Object.keys(db.students).map(function(k){ return db.students[k]; })
      .filter(function(s){ return s.school_id===schoolId && (opts.includeLeft || (s.status!=='left' && s.status!=='graduated')); })
      .map(pubStudent); }
  /* ======================================================================
     BASE GRADES — every grade/section keeps a fixed base (Grade 1, Grade 1A)
     however the school renames it. Ask Tilli, matching and promotion read the
     base; screens show the school's name with the base in brackets when they
     differ: "Sunflowers (Grade 1)", "Rose (Grade 1A)".
     ====================================================================== */
  var BASE_GRADES = ['Nursery', 'LKG', 'UKG'].concat(Array.apply(null, Array(12)).map(function(_, i){ return 'Grade ' + (i + 1); }));
  var BASE_EARLY = { 'playgroup':'Nursery', 'pre-nursery':'Nursery', 'prenursery':'Nursery', 'nursery':'Nursery', 'pre-k':'Nursery', 'prek':'Nursery',
    'lkg':'LKG', 'ukg':'UKG', 'kg':'UKG', 'kindergarten':'UKG' };
  // Best guess for names that never had a base stored (demo data, CSV imports).
  function inferBaseGrade(name){
    var n = low(name);
    if (BASE_EARLY[n]) return BASE_EARLY[n];
    var m = n.match(/^(?:grade|class|std|standard|year|gr)?\.?\s*(\d{1,2})$/);
    if (m && +m[1] >= 1 && +m[1] <= 12) return 'Grade ' + (+m[1]);
    return '';
  }
  function baseGradeIn(db, schoolId, grade){
    var hit = Object.keys(db.sections).map(function(k){ return db.sections[k]; })
      .filter(function(s){ return s.school_id===schoolId && low(s.grade)===low(grade) && s.base_grade; })[0];
    return hit ? hit.base_grade : inferBaseGrade(grade);
  }
  function baseGradeOf(schoolId, grade){ return baseGradeIn(getDB(), schoolId, grade); }
  // "Grade 1" + "A" → "Grade 1A"; "LKG" + "A" → "LKG A".
  function baseSectionCode(baseGrade, letter){
    if (!baseGrade) return '';
    return baseGrade + (/\d$/.test(baseGrade) ? '' : ' ') + (letter || '');
  }
  function sameName(a, b){ return low(a).replace(/\s+/g, '') === low(b).replace(/\s+/g, ''); }
  // "Sunflowers (Grade 1)" — or just the name when it already is the base.
  function gradeLabel(schoolId, grade, base){
    var b = base != null ? base : baseGradeOf(schoolId, grade);
    return b && !sameName(b, grade) ? grade + ' (' + b + ')' : String(grade == null ? '' : grade);
  }
  // Fixed base code for a section ("Grade 1A"), from (grade, section) strings or a section_id.
  function sectionBase(schoolId, grade, section){
    var db = getDB(), rec = section === undefined ? db.sections[grade] : Object.keys(db.sections).map(function(k){ return db.sections[k]; })
      .filter(function(s){ return s.school_id===schoolId && low(s.grade)===low(grade) && low(s.section||'')===low(section); })[0];
    if (rec) return baseSectionCode(rec.base_grade || baseGradeOf(schoolId, rec.grade), rec.base_section || rec.section);
    return baseSectionCode(baseGradeOf(schoolId, grade), section);
  }
  // A section record ({grade, section, name, base_grade, base_section}), a
  // section_id, or (grade, section) strings → "Rose (Grade 1A)" / "Grade 1 A".
  function sectionLabel(schoolId, sec, section){
    var rec = sec;
    if (typeof sec === 'string' && section === undefined) rec = getDB().sections[sec] || { name: sec };
    else if (typeof sec === 'string') {
      var db = getDB();
      rec = Object.keys(db.sections).map(function(k){ return db.sections[k]; })
        .filter(function(s){ return s.school_id===schoolId && low(s.grade)===low(sec) && low(s.section||'')===low(section); })[0]
        || { grade: sec, section: section };
    }
    rec = rec || {};
    var shown = rec.name || ((rec.grade || '') + ' ' + (rec.section || '')).trim();
    var bg = rec.base_grade || (rec.grade != null ? baseGradeOf(schoolId || rec.school_id, rec.grade) : '');
    var code = baseSectionCode(bg, rec.base_section || rec.section);
    return code && !sameName(code, shown) ? shown + ' (' + code + ')' : shown;
  }

  // Rename a grade / section. The base is locked in first (stored if it was only
  // inferred), so Ask Tilli and matching keep knowing what it really is. Students
  // and teacher invites carry the names as text, so they're renamed too.
  function lockBase(db, sec){
    if (!sec.base_grade) sec.base_grade = baseGradeIn(db, sec.school_id, sec.grade);
    if (!sec.base_section) sec.base_section = sec.section || '';
  }
  function schoolSections(db, schoolId){ return Object.keys(db.sections).map(function(k){ return db.sections[k]; }).filter(function(s){ return s.school_id===schoolId; }); }
  // Grades kept without any section (see createSchoolFull) — once a section
  // exists for the grade, the section is the record and this entry is ignored.
  function emptyGradesOf(db, schoolId){
    var sc = db.schools[schoolId], secs = schoolSections(db, schoolId);
    return ((sc && sc.emptyGrades) || []).filter(function(g){ return !secs.some(function(x){ return low(x.grade)===low(g.grade); }); });
  }
  function renameGrade(schoolId, oldGrade, newGrade){
    var db = getDB(); newGrade = norm(newGrade);
    if (!newGrade) return { ok:false, reason:'empty' };
    var secs = schoolSections(db, schoolId);
    var hit = secs.filter(function(s){ return low(s.grade)===low(oldGrade); });
    var bare = emptyGradesOf(db, schoolId).filter(function(g){ return low(g.grade)===low(oldGrade); })[0];
    if (!hit.length && bare){
      if (low(oldGrade)!==low(newGrade) && (secs.some(function(s){ return low(s.grade)===low(newGrade); }) || emptyGradesOf(db, schoolId).some(function(g){ return low(g.grade)===low(newGrade); })))
        return { ok:false, reason:'exists' };
      bare.grade = newGrade; write(db); return { ok:true };
    }
    if (!hit.length) return { ok:false, reason:'not_found' };
    if (low(oldGrade)!==low(newGrade) && secs.some(function(s){ return low(s.grade)===low(newGrade); })) return { ok:false, reason:'exists' };
    hit.forEach(function(s){ lockBase(db, s); s.grade = newGrade; s.name = (newGrade + ' ' + (s.section||'')).trim(); });
    Object.keys(db.students).forEach(function(k){ var st = db.students[k]; if (st.school_id===schoolId && low(st.grade)===low(oldGrade)) st.grade = newGrade; });
    Object.keys(db.accounts).forEach(function(k){ var a = db.accounts[k]; if (a.school_id===schoolId && low(a.grade)===low(oldGrade)) a.grade = newGrade; });
    write(db); return { ok:true };
  }
  function renameSection(schoolId, sectionId, newSection){
    var db = getDB(); newSection = norm(newSection); var sec = db.sections[sectionId];
    if (!sec || sec.school_id!==schoolId) return { ok:false, reason:'not_found' };
    if (!newSection) return { ok:false, reason:'empty' };
    if (schoolSections(db, schoolId).some(function(s){ return s!==sec && low(s.grade)===low(sec.grade) && low(s.section)===low(newSection); })) return { ok:false, reason:'exists' };
    var old = sec.section; lockBase(db, sec);
    sec.section = newSection; sec.name = (sec.grade + ' ' + newSection).trim();
    Object.keys(db.students).forEach(function(k){ var st = db.students[k]; if (st.school_id===schoolId && st.section_id===sectionId) st.section = newSection; });
    Object.keys(db.accounts).forEach(function(k){ var a = db.accounts[k]; if (a.school_id===schoolId && low(a.grade)===low(sec.grade) && low(a.section)===low(old)) a.section = newSection; });
    write(db); return { ok:true };
  }

  /* ---------- Boards per grade + board-scoped school admins ----------
     In a multi-board school each GRADE has a board (its sections inherit it).
     A school admin sees every board (boards null) or only the boards they were
     given. Leadership never sees another board's classes, children or results. */
  function schoolBoardsIn(db, schoolId){ var sc = db.schools[schoolId] || {}; return Array.isArray(sc.boards) && sc.boards.length ? sc.boards : (sc.board ? String(sc.board).split(/\s*,\s*/) : []); }
  // The section's board; a single-board school's sections are that board without tagging.
  function boardOfSec(db, sec){
    if (sec.board) return sec.board;
    var b = schoolBoardsIn(db, sec.school_id); return b.length === 1 ? b[0] : null;
  }
  function setGradeBoard(schoolId, grade, board){
    var db = getDB(), n = 0;
    schoolSections(db, schoolId).forEach(function(s){ if (low(s.grade)===low(grade)){ s.board = board || null; n++; } });
    emptyGradesOf(db, schoolId).forEach(function(g){ if (low(g.grade)===low(grade)){ g.board = board || null; n++; } });
    if (n) write(db);
    return { ok: !!n };
  }
  // null = every board; ['CBSE'] = only those. Tilli staff (no membership) see everything.
  function adminBoards(schoolId, email){
    var db = getDB(), e = low(email);
    var m = db.adminMemberships.find(function(x){ return x.user_id===e && x.school_id===schoolId && x.status==='active'; });
    var b = (m && m.boards) || (db.accounts[e] && db.accounts[e].school_id===schoolId && db.accounts[e].boards) || null;
    return b && b.length ? b.slice() : null;
  }
  // Tilli changes which boards a school admin sees (null / [] = every board).
  function setAdminBoards(schoolId, email, boards, actorEmail){
    var db = getDB(), e = low(email);
    var m = db.adminMemberships.find(function(x){ return x.user_id===e && x.school_id===schoolId; });
    if (!m) return { ok:false, reason:'not_found' };
    if (!isTilliActor(db, actorEmail)) return { ok:false, reason:'not-authorized' };   // Tilli only
    var before = m.boards && m.boards.length ? m.boards.join(' + ') : 'All boards';
    m.boards = Array.isArray(boards) && boards.length ? boards.slice() : null;
    if (db.accounts[e]) db.accounts[e].boards = m.boards;
    logHistory(db, { school_id: schoolId, section_id: null, section_name: '', students: [], kind: 'student', action: 'admin.boards',
      changes: [{ label: 'Board access · ' + (nameFor(db, e, schoolId) || e), from: before, to: m.boards ? m.boards.join(' + ') : 'All boards' }], actor: actorFor(db, actorEmail, schoolId) });
    write(db);
    return { ok:true, boards: m.boards };
  }
  // Multi-board schools: grades with no board yet. A board-limited admin can't see
  // these classes until Tilli tags them (Grades & sections).
  function untaggedGrades(schoolId){
    var db = getDB();
    if (schoolBoardsIn(db, schoolId).length < 2) return [];
    var out = [];
    schoolSections(db, schoolId).forEach(function(s){ if (!s.board && out.indexOf(s.grade) < 0) out.push(s.grade); });
    emptyGradesOf(db, schoolId).forEach(function(g){ if (!g.board && out.indexOf(g.grade) < 0) out.push(g.grade); });
    return out;
  }
  // Section ids a school admin may see (null = all of them).
  function sectionsInScope(schoolId, email){
    var boards = adminBoards(schoolId, email); if (!boards) return null;
    var db = getDB();
    return schoolSections(db, schoolId).filter(function(s){ return boards.indexOf(boardOfSec(db, s)) >= 0; }).map(function(s){ return s.section_id; });
  }

  // Grade/section structure + counts, for the org portfolio hub.
  function schoolStats(schoolId){
    var secs = sectionsForSchool(schoolId);
    var studs = studentsForSchool(schoolId);
    var byGrade = {};
    secs.forEach(function(sec){
      var mine = studs.filter(function(s){ return s.section_id===sec.section_id; });
      (byGrade[sec.grade] = byGrade[sec.grade] || []).push({ name:sec.section, id:sec.section_id, base:sec.base_section || sec.section,
        students: mine.length, expected: sec.expected > 0 ? sec.expected : null,
        pending: mine.filter(function(s){ return s.approval==='pending'; }).length });
    });
    var dbx = getDB(), gradeBoard = function(g){ var sec = schoolSections(dbx, schoolId).filter(function(x){ return low(x.grade)===low(g); })[0]; return sec ? boardOfSec(dbx, sec) : null; };
    var grades = Object.keys(byGrade).map(function(g){ return { grade:g, base:baseGradeOf(schoolId, g), board:gradeBoard(g), sections:byGrade[g] }; })
      .concat(emptyGradesOf(dbx, schoolId).map(function(g){ return { grade:g.grade, base:g.base, board:g.board || null, sections:[] }; }))
      .sort(function(p, q){ var at = function(b){ var i = BASE_GRADES.indexOf(b); return i < 0 ? 999 : i; }; return at(p.base) - at(q.base); });
    var staff = staffFor(schoolId);
    return { students:studs.length, sections:secs.length, grades:grades,
      staff:staff.length, teachers:staff.filter(function(x){return x.role==='teacher';}).length,
      coordinator: (staff.find(function(x){return x.role==='coordinator';})||null) };
  }
  function sectionsForSchool(schoolId){ var db=getDB(); return Object.keys(db.sections).map(function(k){ return db.sections[k]; }).filter(function(s){ return s.school_id===schoolId; }).map(function(s){ return Object.assign({},s); }); }
  // Resolve a section by grade+section name, creating it (empty, no teacher) if it
  // doesn't exist. Used by the roster/CSV import so students land under a real
  // section even for grade/section combos the wizard didn't pre-create.
  function ensureSection(schoolId, grade, section){
    var db = getDB(); grade = norm(grade); section = norm(section);
    var found = findSection(db, schoolId, grade, section);
    if (found) return found.section_id;
    var secId = 'sec_' + schoolId + '_' + slugify(grade + '_' + (section||'na'));
    if (!db.sections[secId]){
      var sib = schoolSections(db, schoolId).filter(function(x){ return low(x.grade)===low(grade); })[0];
      db.sections[secId] = { section_id:secId, school_id:schoolId, grade:grade, section:section,
        name:(grade+' '+(section||'')).trim(), teacherId:null,
        base_grade: baseGradeIn(db, schoolId, grade), base_section: section, board: (sib && sib.board) || null };
      write(db);
    }
    return secId;
  }

  /* ======================================================================
     NEW — ASSESSMENT DEPLOYMENT + COMPLETION  (the end of the flow)
     ====================================================================== */
  function depKey(phase, audience){ return phase + '|' + audience; }
  // Status every app sees is worked out from the window, not stored:
  // Scheduled before the start date, Live during it, Ended after the end date
  // (or once ended by hand). The stored status stays 'Live' / 'Ended'.
  function todayLocalISO(){ var t=new Date(), p=function(x){ return (x<10?'0':'')+x; }; return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate()); }
  function effectiveStatus(d){
    if (!d) return 'Not deployed';
    if (d.status==='Ended') return 'Ended';
    var t = todayLocalISO();
    if (d.start && t < d.start) return 'Scheduled';
    if (d.end && t > d.end) return 'Ended';
    return 'Live';
  }
  function compKey(phase, audience, studentId, assessId){ return phase + '|' + audience + '|' + up(studentId) + '|' + assessId; }

  // Platform Admin deploys one phase/audience lane (Baseline|Teacher, etc.).
  function deployPhase(schoolId, phase, audience, opts){
    var db = getDB(); opts = opts||{};
    if (!db.deployments[schoolId]) db.deployments[schoolId] = {};
    var k = depKey(phase, audience);
    var prev = db.deployments[schoolId][k];
    db.deployments[schoolId][k] = {
      phase:phase, audience:audience, deployed:true, status:'Live',
      window:opts.window||'', start:opts.start||'', end:opts.end||'',
      assessments:(opts.assessments||[]).slice(),
      // In order (true) / any order (false); unset = the audience default (see isChained).
      chained: typeof opts.chained === 'boolean' ? opts.chained : (prev ? prev.chained : undefined),
      deployedAt:Date.now(), endedAt:null,
    };
    // The planner re-saves every lane on each deploy, so only log real changes.
    var cur = db.deployments[schoolId][k], names = function(d){ return (d.assessments||[]).map(function(a){ return a.name||a.id; }).join(', '); };
    var ch = [];
    if (!prev || prev.window !== cur.window) ch.push({ label:'Window', from: prev ? prev.window : '', to: cur.window });
    if (!prev || names(prev) !== names(cur)) ch.push({ label:'Assessments', from: prev ? names(prev) : '', to: names(cur) });
    var ord = function(d){ return isChained(d) ? 'In order' : 'Any order'; };
    if (prev && ord(prev) !== ord(cur)) ch.push({ label:'Order', from: ord(prev), to: ord(cur) });
    if (prev && prev.status !== 'Live') ch.push({ label:'Status', from: prev.status, to:'Live' });
    if (ch.length) logHistory(db, phaseEvent(db, schoolId, prev && prev.status === 'Live' ? 'phase.update' : 'phase.deploy', phase, audience, ch));
    write(db);
    return Object.assign({}, db.deployments[schoolId][k]);
  }
  function endPhase(schoolId, phase, audience){
    var db = getDB(); var k = depKey(phase, audience);
    var d = db.deployments[schoolId] && db.deployments[schoolId][k];
    if (!d) return null;
    if (d.status !== 'Ended') logHistory(db, phaseEvent(db, schoolId, 'phase.end', phase, audience, [{ label:'Status', from:d.status, to:'Ended' }]));
    d.status = 'Ended'; d.endedAt = Date.now(); write(db);
    return Object.assign({}, d);
  }
  function undeployPhase(schoolId, phase, audience){
    var db = getDB(); var k = depKey(phase, audience);
    if (db.deployments[schoolId] && db.deployments[schoolId][k]) {
      logHistory(db, phaseEvent(db, schoolId, 'phase.undeploy', phase, audience, [{ label:'Status', from:db.deployments[schoolId][k].status, to:'Not deployed' }]));
      delete db.deployments[schoolId][k]; write(db);
    }
    return true;
  }
  function getDeployments(schoolId){
    var db = getDB(); var m = db.deployments[schoolId]||{};
    return Object.keys(m).map(function(k){ return Object.assign({}, m[k], { status: effectiveStatus(m[k]) }); });
  }
  // What a teacher/parent should see: live lanes for their audience
  // (includeEnded → every deployed lane, Scheduled and Ended too).
  function deploymentsFor(schoolId, audience, opts){
    opts = opts||{};
    return getDeployments(schoolId).filter(function(d){
      return d.audience===audience && (opts.includeEnded ? true : d.status==='Live');
    });
  }
  // Default when an assessment carries no flag of its own: teacher assessments
  // are in order; parent and student direct ones are any time.
  function isChained(d){ return d && (d.chained == null ? d.audience === 'Teacher' : !!d.chained); }
  function isOrdered(dep, a){ return a.ordered != null ? !!a.ordered : isChained(dep); }
  var AUD_RANK = { 'Teacher': 0, 'Parent': 1, 'Direct Assessment': 2 };
  // Chain: each place (school / home) has ONE sequence across audiences, so a
  // direct task can follow a teacher observation at school or a parent survey
  // at home. An in-order assessment opens for a child once every in-order
  // assessment before it in the same place is done for that child; any-time
  // ones are always open. Places never wait on each other.
  // → [{ id, name, state:'done'|'open'|'locked', after, ordered, mode }] for one audience.
  function chainFor(schoolId, phase, audience, studentId){
    var db = getDB(), all = db.deployments[schoolId] || {}, comp = db.completions[schoolId] || {};
    var prog = (db.inProgress && db.inProgress[schoolId]) || {};
    var dep = all[depKey(phase, audience)];
    // Per-teacher items (the teacher's own Pre/Post-training survey) aren't part of a child's chain.
    var mine = ((dep && dep.assessments) || []).filter(function(a){ return !a.perTeacher; });
    var seqs = {};
    Object.keys(all).forEach(function(k){
      var d = all[k]; if (d.phase !== phase) return;
      (d.assessments || []).forEach(function(a, i){
        if (a.perTeacher || !isOrdered(d, a)) return;
        (seqs[a.mode || ''] = seqs[a.mode || ''] || []).push({ a: a, aud: d.audience, pos: a.pos != null ? a.pos : (AUD_RANK[d.audience] || 0) * 100 + i });
      });
    });
    Object.keys(seqs).forEach(function(m){ seqs[m].sort(function(x, y){ return x.pos - y.pos; }); });
    return mine.map(function(a){
      var done = !!comp[compKey(phase, audience, studentId, a.id)], ord = isOrdered(dep, a), place = a.mode || '';
      var started = !done && prog[compKey(phase, audience, studentId, a.id)];
      // startedMode: where an unfinished run began — it's finished there even if
      // the assessment has since moved (e.g. My School Check-in after a parent-setting change).
      var out = { id: a.id, name: a.name || a.id, state: done ? 'done' : 'open', after: null, ordered: ord, mode: place, startedMode: started ? started.mode : null };
      if (!ord) return out;
      var seq = seqs[place] || [], idx = -1;
      seq.forEach(function(x, i){ if (x.a.id === a.id && x.aud === audience) idx = i; });
      if (idx > 0) out.after = seq[idx - 1].a.name || seq[idx - 1].a.id;
      if (!done && seq.slice(0, Math.max(0, idx)).some(function(x){ return !comp[compKey(phase, x.aud, studentId, x.a.id)]; })) out.state = 'locked';
      return out;
    });
  }
  /* ---------- My School Check-in + the own-class rule ----------
     IDELA's "do you feel safe / does your teacher help you" questions are a
     separate direct assessment, My School Check-in. Where it runs follows the
     school's "Parents take part" setting (home when they do, school when they
     don't). While it runs AT SCHOOL in a phase, no teacher may run any student
     direct assessment at school for their own class in that phase — another
     teacher does it via the student direct-assessment link (assess.html). */
  var CHECKIN_NAME = 'My School Check-in';
  function isCheckin(a){ return !!a && low(a.name) === low(CHECKIN_NAME); }
  // Default: parents take part (unset = true).
  function parentsTakePart(schoolId){ var sc = getDB().schools[schoolId]; return !sc || sc.parentsTakePart !== false; }
  function setParentsTakePart(schoolId, on){
    var db = getDB(), sc = db.schools[schoolId]; if (!sc) return false;
    sc.parentsTakePart = !!on; write(db); return true;
  }
  function directLane(schoolId, phase){ var all = getDB().deployments[schoolId] || {}; return all[depKey(phase, 'Direct Assessment')] || null; }
  // The rule is on for a phase when My School Check-in is deployed there, at school.
  function checkinAtSchool(schoolId, phase){
    var lane = directLane(schoolId, phase);
    return !!lane && (lane.assessments || []).some(function(a){ return isCheckin(a) && a.mode === 'school'; });
  }
  // Direct assessments run at school in a phase → [{ id, name, mode }].
  function directAtSchool(schoolId, phase){
    var lane = directLane(schoolId, phase);
    return lane ? (lane.assessments || []).filter(function(a){ return a.mode === 'school'; }).map(function(a){ return { id:a.id, name:a.name||a.id, mode:a.mode }; }) : [];
  }
  // The live phase with student direct assessments at school (null = none open).
  function liveDirectPhase(schoolId){
    var d = getDeployments(schoolId).filter(function(x){ return x.audience === 'Direct Assessment' && x.status === 'Live'; })
      .find(function(x){ return (x.assessments || []).some(function(a){ return a.mode === 'school'; }); });
    return d ? d.phase : null;
  }
  // The rule needs another class to swap with: a school with a single class
  // (one grade, one section) is exempt — its teacher runs everything.
  function ownClassRuleOn(schoolId, phase){ return checkinAtSchool(schoolId, phase) && sectionsForSchool(schoolId).length > 1; }
  function isOwnClassBlocked(schoolId, phase, email, studentId){
    if (!email || !ownClassRuleOn(schoolId, phase)) return false;
    var db = getDB(), stu = db.students[keyOf(schoolId, studentId)];
    return !!stu && teacherScope(db, email, schoolId).indexOf(stu.section_id) >= 0;
  }
  // Every section of the school, flagged for one teacher: own (theirs) and
  // blocked (theirs while the rule is on) → [{ section_id, name, grade, own, blocked, students }].
  function assessableSections(email, schoolId, phase){
    var db = getDB(), mine = teacherScope(db, email, schoolId), on = ownClassRuleOn(schoolId, phase);
    var counts = {};
    Object.keys(db.students).forEach(function(k){ var st = db.students[k]; if (st.school_id === schoolId && st.status !== 'left') counts[st.section_id] = (counts[st.section_id] || 0) + 1; });
    return sectionsForSchool(schoolId).map(function(sec){
      var own = mine.indexOf(sec.section_id) >= 0;
      return { section_id:sec.section_id, name:sec.name, grade:sec.grade, own:own, blocked:own && on, students:counts[sec.section_id] || 0 };
    }).sort(function(a, b){ return String(a.name).localeCompare(String(b.name), undefined, { numeric:true }); });
  }
  // A run has begun (the child is part-way through). Recorded so that if the
  // assessment moves place mid-run it's still finished where it started.
  function startAssessment(schoolId, phase, audience, studentId, assessId, byEmail){
    var db = getDB(), lane = db.deployments[schoolId] && db.deployments[schoolId][depKey(phase, audience)];
    var item = lane && (lane.assessments || []).find(function(x){ return x.id === assessId; });
    if (!item) return false;
    if (!db.inProgress) db.inProgress = {};
    var m = db.inProgress[schoolId] || (db.inProgress[schoolId] = {}), k = compKey(phase, audience, studentId, assessId);
    if (!m[k]) m[k] = { by: low(byEmail || ''), at: Date.now(), mode: item.mode || '' };
    write(db); return true;
  }
  // Direct results recorded AT SCHOOL by the child's own class teacher in a
  // phase. Kept, but flagged once the own-class rule is on (and counted in the
  // warning before it's turned on) → [{ student_id, name, assessId, item, by, at }].
  function ownClassResults(schoolId, phase){
    var db = getDB(), lane = directLane(schoolId, phase); if (!lane) return [];
    var atSchool = {}; (lane.assessments || []).forEach(function(a){ if (a.mode === 'school') atSchool[a.id] = a.name || a.id; });
    var comp = db.completions[schoolId] || {}, out = [], pre = phase + '|Direct Assessment|';
    Object.keys(comp).forEach(function(k){
      if (k.indexOf(pre) !== 0) return;
      var parts = k.split('|'), sid = parts[2], aid = parts[3], by = comp[k].by;
      if (!atSchool[aid] || !by) return;
      var stu = db.students[keyOf(schoolId, sid)];
      if (stu && teacherScope(db, by, schoolId).indexOf(stu.section_id) >= 0)
        out.push({ student_id: stu.student_id, name: stu.name, assessId: aid, item: atSchool[aid], by: by, at: comp[k].at });
    });
    return out;
  }

  // Student-link sign-in: school code → school. Accepts the school's public
  // code (e.g. BNYN-7712) or its teacher join code; case / spaces / hyphens ignored.
  function resolveSchoolCode(codeStr){
    var db = getDB(), clean = function(x){ return up(x).replace(/[^A-Z0-9]/g,''); }, q = clean(codeStr);
    if (!q) return null;
    var ids = Object.keys(db.schools);
    for (var i=0;i<ids.length;i++){ var sc = db.schools[ids[i]]; if (sc.code && clean(sc.code)===q) return Object.assign({}, sc); }
    return null;
  }
  // Schools where this email is an active teacher (the student link only lets teachers in).
  function teacherSchools(email){
    var db = getDB(), e = low(email);
    return db.teacherMemberships.filter(function(m){ return m.user_id===e && m.status==='active'; }).map(function(m){ return m.school_id; });
  }
  function isTeacherAt(email, schoolId){ return roleOf(getDB(), email, schoolId) === 'teacher'; }

  // Completion over a chosen set of a lane's assessments (e.g. just the ones
  // run at home) — per-teacher items excluded, as in completionStats.
  function itemCompletion(schoolId, phase, audience, studentIds, itemIds){
    var db = getDB(), dep = db.deployments[schoolId] && db.deployments[schoolId][depKey(phase, audience)];
    var items = ((dep && dep.assessments) || []).filter(function(a){ return !a.perTeacher && itemIds.indexOf(a.id) >= 0; });
    var comp = db.completions[schoolId] || {}, done = 0;
    (studentIds || []).forEach(function(sid){ items.forEach(function(a){ if (comp[compKey(phase, audience, sid, a.id)]) done++; }); });
    return { done: done, expected: (studentIds || []).length * items.length };
  }

  // A teacher/parent/student finishes one assessment item for one student.
  function markComplete(schoolId, phase, audience, studentId, assessId, byEmail){
    var db = getDB();
    // Only inside the open window, and only in chain order. (No deployment =
    // nothing to check — the teacher demo records against a default item.)
    var lane = db.deployments[schoolId] && db.deployments[schoolId][depKey(phase, audience)];
    if (lane){
      var st = effectiveStatus(lane);
      if (st !== 'Live') return { error: st === 'Scheduled' ? 'not_open' : 'closed', status: st };
      var item = (lane.assessments||[]).find(function(x){ return x.id===assessId; });
      if (item && item.perTeacher) return true;   // counted per teacher via saveSelfReport, not per child
      var link = chainFor(schoolId, phase, audience, studentId).find(function(x){ return x.id===assessId; });
      if (link && link.state === 'locked') return { error: 'locked', after: link.after };
      // Own-class rule: with My School Check-in at school, a teacher can't
      // record a direct assessment at school for a child in their own class.
      if (audience === 'Direct Assessment' && item && item.mode === 'school' && isOwnClassBlocked(schoolId, phase, byEmail, studentId))
        return { error: 'own_class' };
    }
    if (!db.completions[schoolId]) db.completions[schoolId] = {};
    var ck = compKey(phase, audience, studentId, assessId), already = !!db.completions[schoolId][ck];
    db.completions[schoolId][ck] = { by:low(byEmail||''), at:Date.now() };
    if (db.inProgress && db.inProgress[schoolId]) delete db.inProgress[schoolId][ck];
    var stu = db.students[keyOf(schoolId, studentId)];
    if (!already && stu){
      var dep = db.deployments[schoolId] && db.deployments[schoolId][depKey(phase, audience)];
      var a = dep && (dep.assessments||[]).find(function(x){ return x.id===assessId; });
      logHistory(db, studentEvent(db, stu, 'assessment.complete', byEmail, { kind:'assessment', phase:phase, audience:audience, items:[ (a && a.name) || assessId ] }));
    }
    write(db);
    return true;
  }
  function isComplete(schoolId, phase, audience, studentId, assessId){
    var db = getDB();
    return !!(db.completions[schoolId] && db.completions[schoolId][compKey(phase, audience, studentId, assessId)]);
  }
  // When a student's lane (e.g. Midline|Parent) was last completed: the latest
  // timestamp across that lane's items, or null if nothing is recorded.
  function completedAt(schoolId, phase, audience, studentId){
    var db = getDB(), all = db.completions[schoolId] || {}, pre = phase + '|' + audience + '|' + up(studentId) + '|', at = null;
    Object.keys(all).forEach(function(k){ if (k.indexOf(pre) === 0 && all[k].at && (!at || all[k].at > at)) at = all[k].at; });
    return at;
  }
  // Completion for a lane, over a given set of student ids (the scope that must
  // respond). expected = students × assessments in the lane.
  function completionStats(schoolId, phase, audience, studentIds){
    var db = getDB();
    return statsFrom(db.deployments[schoolId] || {}, db.completions[schoolId] || {}, phase, audience, studentIds);
  }
  // Same count over any year's lanes + completions (current store or an archived year).
  function statsFrom(deps, comp, phase, audience, studentIds){
    var dep = deps[depKey(phase, audience)];
    // Per-student items only — a teacher's own Pre/Post-training survey is counted per teacher (selfReportsFor).
    var assessments = ((dep && dep.assessments) || []).filter(function(a){ return !a.perTeacher; });
    var ids = studentIds || [];
    var expected = ids.length * assessments.length;
    var done = 0;
    ids.forEach(function(sid){ assessments.forEach(function(a){ if (comp[compKey(phase, audience, sid, a.id)]) done++; }); });
    return { done:done, expected:expected, pct: expected ? Math.round(done*100/expected) : 0,
      assessments:assessments.length, students:ids.length,
      status: effectiveStatus(dep), start: dep ? dep.start : '', end: dep ? dep.end : '' };
  }

  /* ---------- Children fully done (THE completion number) ----------
     PRODUCT RULE (agreed 19 Oct 2026): a child is Completed when they've done
     EVERY per-child assessment deployed for the phase (all audiences; teachers'
     own Pre/Post-training surveys don't count); In progress = at least one;
     Not started = none. Every completion % in every app reads this.
     filter (optional): { audience, mode:'school'|'home' } narrows the items —
     e.g. one lane, or what runs at school. */
  function phaseItems(deps, phase, filter){
    filter = filter || {}; var out = [];
    Object.keys(deps).forEach(function(k){
      var d = deps[k]; if (d.phase !== phase || d.notRun) return;
      if (filter.audience && d.audience !== filter.audience) return;
      (d.assessments || []).forEach(function(a){
        if (a.perTeacher) return;
        if (filter.mode && (a.mode || (d.audience === 'Parent' ? 'home' : 'school')) !== filter.mode) return;
        out.push({ audience: d.audience, id: a.id });
      });
    });
    return out;
  }
  function childStatusFrom(items, comp, phase, sid){
    if (!items.length) return null;
    var got = items.filter(function(it){ return comp[compKey(phase, it.audience, sid, it.id)]; }).length;
    return got >= items.length ? 'done' : got ? 'draft' : 'none';
  }
  function childrenDoneFrom(deps, comp, phase, ids, filter){
    var items = phaseItems(deps, phase, filter), r = { done: 0, draft: 0, none: 0, total: (ids || []).length, items: items.length };
    if (!items.length) { r.none = r.total; r.pct = null; return r; }
    (ids || []).forEach(function(sid){ r[childStatusFrom(items, comp, phase, sid)]++; });
    r.pct = r.total ? Math.round(r.done * 100 / r.total) : 0;
    return r;
  }
  // Current year. ids default to every child at the school.
  function childrenDone(schoolId, phase, ids, filter){
    var db = getDB();
    return childrenDoneFrom(db.deployments[schoolId] || {}, db.completions[schoolId] || {}, phase,
      ids || studentsForSchool(schoolId).map(function(x){ return x.student_id; }), filter);
  }
  // One child: 'done' | 'draft' | 'none' (null = nothing deployed for the phase).
  function childStatus(schoolId, phase, studentId, filter){
    var db = getDB();
    return childStatusFrom(phaseItems(db.deployments[schoolId] || {}, phase, filter), db.completions[schoolId] || {}, phase, up(studentId));
  }

  /* ======================================================================
     ACADEMIC YEARS — a school runs Baseline → Midline → Endline once per year.
     ----------------------------------------------------------------------
     The CURRENT year lives where it always has (deployments / completions /
     outcomes / selfReports), so every reader keeps working unchanged. Starting
     a new year (Tilli team only) snapshots all of it into db.archive[school]
     [yearId] — read-only from then on — and moves students up by base grade.
       db.years[school]   = [{ id, label, start, end, status:'current'|'closed', … }]
       db.archive[school][yearId] = { deployments, completions, outcomes,
         selfReports, sections:{id→{grade,section,name,base_grade,base_section}},
         enrolments:{student_id→{grade,section,section_id,status}}, closedAt }
     Dates are free per school (set when the year starts, editable after).
     ====================================================================== */
  var PHASE_FIELD = { Baseline: 'baseline', Midline: 'mid', Endline: 'post' };
  function isoAddDays(iso, n){ var t = new Date(iso + 'T00:00:00'); t.setDate(t.getDate() + n); return heroISO(t.getTime()); }
  // "2026-06-01" → "2027-05-31" → "2026–27" (a Jan–Dec year reads "2026").
  function yearLabel(start, end){
    var a = +String(start).slice(0, 4), b = +String(end).slice(0, 4);
    return a === b ? String(a) : a + '–' + String(b).slice(2);
  }
  function yearId(label){ return String(label).replace(/[^0-9A-Za-z]+/g, '-'); }
  function yearsIn(db, schoolId){
    if (!db.years) db.years = {};
    if (!db.years[schoolId] && db.schools[schoolId]){
      // First read for this school: one current year, from its earliest window.
      var starts = Object.keys(db.deployments[schoolId] || {}).map(function(k){ return db.deployments[schoolId][k].start; }).filter(Boolean).sort();
      var sc = db.schools[schoolId];
      // Nothing to go on → the Jun–May year we're in (editable: dates are free per school).
      var t = todayLocalISO(), junStart = (+t.slice(5, 7) >= 6 ? t.slice(0, 4) : String(+t.slice(0, 4) - 1)) + '-06-01';
      var start = starts[0] || (sc.createdAt ? heroISO(sc.createdAt) : junStart);
      var end = isoAddDays(isoAddDays(start, 0).replace(/^(\d{4})/, function(y){ return String(+y + 1); }), -1);
      var label = yearLabel(start, end);
      db.years[schoolId] = [{ id: yearId(label), label: label, start: start, end: end, status: 'current', startedAt: sc.createdAt || Date.now(), startedBy: '' }];
      write(db);
    }
    return db.years[schoolId] || [];
  }
  function currentIn(db, schoolId){ return yearsIn(db, schoolId).filter(function(y){ return y.status === 'current'; })[0] || null; }
  function yearsFor(schoolId){ return clone(yearsIn(getDB(), schoolId)); }
  function currentYear(schoolId){ var y = currentIn(getDB(), schoolId); return y ? Object.assign({}, y) : null; }
  function setYearDates(schoolId, id, patch){
    var db = getDB(), y = yearsIn(db, schoolId).filter(function(x){ return x.id === id; })[0];
    if (!y) return { ok: false, reason: 'not_found' };
    var start = patch.start || y.start, end = patch.end || y.end;
    if (start > end) return { ok: false, reason: 'dates' };
    var label = norm(patch.label) || y.label;
    if (yearsIn(db, schoolId).some(function(x){ return x !== y && low(x.label) === low(label); })) return { ok: false, reason: 'label_taken' };
    y.start = start; y.end = end; y.label = label; write(db);
    return { ok: true, year: Object.assign({}, y) };
  }
  // The archived snapshot for a past year (null for the current one).
  function archiveIn(db, schoolId, id){ return (db.archive && db.archive[schoolId] && db.archive[schoolId][id]) || null; }
  function yearArchive(schoolId, id){ var a = archiveIn(getDB(), schoolId, id); return a ? clone(a) : null; }
  // A year's lanes: the live store for the current year, the snapshot otherwise.
  function deploymentsIn(schoolId, id){
    var db = getDB(), a = archiveIn(db, schoolId, id);
    if (!a) return getDeployments(schoolId);
    return Object.keys(a.deployments || {}).map(function(k){ var d = a.deployments[k]; return Object.assign({}, d, { status: d.notRun ? 'Not run' : 'Ended' }); });
  }
  function enrolledIn(db, schoolId, id){
    var a = archiveIn(db, schoolId, id);
    if (a) return Object.keys(a.enrolments || {});
    return studentsForSchool(schoolId).map(function(s){ return s.student_id; });
  }
  function completionStatsIn(schoolId, id, phase, audience, studentIds){
    var db = getDB(), a = archiveIn(db, schoolId, id);
    if (!a) return completionStats(schoolId, phase, audience, studentIds || enrolledIn(db, schoolId, id));
    var st = statsFrom(a.deployments || {}, a.completions || {}, phase, audience, studentIds || enrolledIn(db, schoolId, id));
    var dep = (a.deployments || {})[depKey(phase, audience)];
    st.status = dep ? (dep.notRun ? 'Not run' : 'Ended') : 'Not deployed';
    return st;
  }
  function outcomesIn(schoolId, id){
    var db = getDB(), a = archiveIn(db, schoolId, id);
    return clone(a ? (a.outcomes || {}) : ((db.outcomes || {})[schoolId] || {}));
  }
  // Everything the platform admin shows for one year, in one read.
  function yearSummary(schoolId, id){
    var db = getDB(), years = yearsIn(db, schoolId), y = years.filter(function(x){ return x.id === id; })[0] || currentIn(db, schoolId);
    if (!y) return null;
    var a = archiveIn(db, schoolId, y.id), current = !a;
    var deps = a ? (a.deployments || {}) : (db.deployments[schoolId] || {});
    var comps = a ? (a.completions || {}) : (db.completions[schoolId] || {});
    var outs = a ? (a.outcomes || {}) : ((db.outcomes || {})[schoolId] || {});
    var ids = enrolledIn(db, schoolId, y.id);
    var phases = ['Baseline', 'Midline', 'Endline'].map(function(ph){
      var lanes = Object.keys(deps).map(function(k){ return deps[k]; }).filter(function(d){ return d.phase === ph; }).map(function(d){
        var st = statsFrom(deps, comps, ph, d.audience, ids), kids = childrenDoneFrom(deps, comps, ph, ids, { audience: d.audience });
        // done / expected = responses (child × assessment); pct = children fully done in this lane.
        return { audience: d.audience, start: d.start || '', end: d.end || '', window: d.window || '',
          status: current ? effectiveStatus(d) : (d.notRun ? 'Not run' : 'Ended'),
          assessments: (d.assessments || []).map(function(x){ return { name: x.name, version: x.version || 1, perTeacher: !!x.perTeacher }; }),
          done: st.done, expected: st.expected, kidsDone: kids.done, kidsTotal: kids.total, pct: kids.pct };
      });
      var done = lanes.reduce(function(n, l){ return n + l.done; }, 0), exp = lanes.reduce(function(n, l){ return n + l.expected; }, 0);
      var kids = childrenDoneFrom(deps, comps, ph, ids);
      // Which per-child assessments ran — growth is only compared between phases that match.
      var instruments = {}; lanes.forEach(function(l){ l.assessments.forEach(function(x){ if (!x.perTeacher) instruments[x.name] = 1; }); });
      var versions = {}; lanes.forEach(function(l){ l.assessments.forEach(function(x){ versions['v' + x.version] = 1; }); });
      // Skill averages only once a phase has finished (current outcomes hold all three points up front).
      var finished = lanes.length && lanes.every(function(l){ return l.status === 'Ended'; });
      var vals = [], byGroup = { sel: [], cog: [] };
      if (finished) Object.keys(outs).forEach(function(sid){ (outs[sid] || []).forEach(function(sk){ var v = sk[PHASE_FIELD[ph]]; if (typeof v === 'number'){ vals.push(v); if (byGroup[sk.group]) byGroup[sk.group].push(v); } }); });
      var avg = function(xs){ return xs.length ? Math.round(xs.reduce(function(n, v){ return n + v; }, 0) / xs.length) : null; };
      return { phase: ph, lanes: lanes, done: done, expected: exp, pct: lanes.length ? kids.pct : null, kidsDone: kids.done, kidsTotal: kids.total,
        instruments: Object.keys(instruments).sort(),
        avgSkill: avg(vals), avgSel: avg(byGroup.sel), avgCog: avg(byGroup.cog),   // 0–100 skill scores
        versions: Object.keys(versions).sort() };
    });
    // Classes as they were that year (renamed ones carry their base in brackets).
    var secs = a ? a.sections || {} : (function(){ var o = {}; schoolSections(db, schoolId).forEach(function(x){ o[x.section_id] = x; }); return o; })();
    var counts = {};
    if (a) Object.keys(a.enrolments || {}).forEach(function(sid){ var e = a.enrolments[sid]; counts[e.section_id] = (counts[e.section_id] || 0) + 1; });
    else studentsForSchool(schoolId).forEach(function(x){ counts[x.section_id] = (counts[x.section_id] || 0) + 1; });
    var classes = Object.keys(secs).map(function(k){
      var x = secs[k], shown = x.name || ((x.grade || '') + ' ' + (x.section || '')).trim();
      var code = baseSectionCode(x.base_grade || inferBaseGrade(x.grade), x.base_section || x.section);
      return { id: k, label: code && !sameName(code, shown) ? shown + ' (' + code + ')' : shown, base: x.base_grade || inferBaseGrade(x.grade), students: counts[k] || 0 };
    }).filter(function(c){ return c.students; }).sort(function(p, q){ return BASE_GRADES.indexOf(p.base) - BASE_GRADES.indexOf(q.base) || p.label.localeCompare(q.label); });
    return { year: Object.assign({}, y), current: current, students: ids.length, phases: phases, classes: classes };
  }
  // What's still open this year + who sits in which base grade (for the new-year wizard).
  function yearReadiness(schoolId){
    var db = getDB(), deps = db.deployments[schoolId] || {};
    var lanes = Object.keys(deps).map(function(k){ return { phase: deps[k].phase, audience: deps[k].audience, status: effectiveStatus(deps[k]), start: deps[k].start, end: deps[k].end }; });
    var grades = {};
    studentsForSchool(schoolId).forEach(function(st){
      var sec = db.sections[st.section_id] || {};
      var b = sec.base_grade || baseGradeIn(db, schoolId, st.grade) || st.grade;
      var g = grades[b] || (grades[b] = { base: b, names: {}, students: 0 });
      g.names[st.grade] = 1; g.students++;
    });
    var list = Object.keys(grades).map(function(b){ var g = grades[b]; return { base: b, names: Object.keys(g.names), students: g.students, next: BASE_GRADES[BASE_GRADES.indexOf(b) + 1] || null }; })
      .sort(function(p, q){ return BASE_GRADES.indexOf(p.base) - BASE_GRADES.indexOf(q.base); });
    return { year: currentYear(schoolId), live: lanes.filter(function(l){ return l.status === 'Live'; }), scheduled: lanes.filter(function(l){ return l.status === 'Scheduled'; }),
      ended: lanes.filter(function(l){ return l.status === 'Ended'; }), grades: list };
  }
  /* ======================================================================
     SCHOOL CALENDAR → suggested Baseline / Midline / Endline windows
     ----------------------------------------------------------------------
     One calendar per school per academic year: terms, exam blocks (each can
     name a board) and holidays. The school admin enters or uploads it and
     sends it; the Tilli team reviews the suggested windows and applies them
     as DRAFT phase dates — nothing is ever deployed or moved automatically.
       db.calendars[school][yearId] = { terms[], exams[], holidays[], status:
         'draft'|'submitted'|'applied', source, fileName, applied:{phase:{start,end}}, … }
     Windows are school-wide, so they avoid every exam block (a board-tagged
     one is named in the reason).
     ====================================================================== */
  var DEFAULT_SCHED_RULES = { baselineWeeksIn: 2, windowWeeks: 3, midlineWeeksIn: 2, midlineGapWeeks: 10, endlineBufferWeeks: 2 };
  function schedulingRules(){ var db = getDB(); return Object.assign({}, DEFAULT_SCHED_RULES, (db.config || {}).schedRules || {}); }
  function setSchedulingRules(patch){
    var db = getDB(), cur = schedulingRules();
    Object.keys(DEFAULT_SCHED_RULES).forEach(function(k){ var v = parseInt(patch && patch[k], 10); if (v >= 0 && v <= 52) cur[k] = v; });
    if (cur.windowWeeks < 1) cur.windowWeeks = 1;
    db.config = db.config || {}; db.config.schedRules = cur; write(db);
    return clone(cur);
  }
  function calYearId(db, schoolId, yearId){ return yearId || ((currentIn(db, schoolId) || {}).id) || ''; }
  function calendarFor(schoolId, yearId){
    var db = getDB(), y = calYearId(db, schoolId, yearId), c = ((db.calendars || {})[schoolId] || {})[y];
    return c ? clone(c) : null;
  }
  function cleanBlocks(list){
    return (list || []).filter(function(r){ return r && r.start && r.end && r.end >= r.start; })
      .map(function(r){ return { name: norm(r.name), start: r.start, end: r.end, board: r.board || null }; })
      .sort(function(a, b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  }
  // opts: { yearId, status:'draft'|'submitted', source:'typed'|'upload', fileName }
  function saveCalendar(schoolId, cal, actorEmail, opts){
    opts = opts || {}; cal = cal || {};
    var db = getDB(), y = calYearId(db, schoolId, opts.yearId); if (!y) return { ok:false, reason:'no_year' };
    var role = roleOf(db, actorEmail, schoolId);
    if (role === 'teacher' || role === 'parent') return { ok:false, reason:'not-authorized' };
    db.calendars = db.calendars || {}; var byS = db.calendars[schoolId] = db.calendars[schoolId] || {}, prev = byS[y] || {};
    var rec = { terms: cleanBlocks(cal.terms), exams: cleanBlocks(cal.exams), holidays: cleanBlocks(cal.holidays),
      source: opts.source || prev.source || 'typed', fileName: opts.fileName || prev.fileName || null,
      status: opts.status || (prev.status === 'applied' ? 'applied' : prev.status) || 'draft',
      updatedAt: Date.now(), updatedBy: low(actorEmail),
      submittedAt: prev.submittedAt || null, submittedBy: prev.submittedBy || null, submittedByName: prev.submittedByName || null,
      applied: prev.applied || null, appliedAt: prev.appliedAt || null };
    if (!rec.terms.length) return { ok:false, reason:'no_terms' };
    if (opts.status === 'submitted'){ rec.submittedAt = Date.now(); rec.submittedBy = low(actorEmail); rec.submittedByName = nameFor(db, actorEmail, schoolId) || low(actorEmail); }
    byS[y] = rec;
    logHistory(db, { school_id: schoolId, section_id: null, section_name: '', students: [], kind: 'assessment', action: opts.status === 'submitted' ? 'calendar.submit' : 'calendar.save',
      changes: [{ label: 'School calendar', from: '', to: rec.terms.length + ' terms · ' + rec.exams.length + ' exam blocks · ' + rec.holidays.length + ' holidays' }], actor: actorFor(db, actorEmail, schoolId) });
    write(db);
    return { ok:true, calendar: clone(rec) };
  }
  // Tilli applies suggested dates as drafts (only phases not deployed yet).
  function applyCalendarDates(schoolId, dates, actorEmail, yearId){
    var db = getDB(), y = calYearId(db, schoolId, yearId), rec = ((db.calendars || {})[schoolId] || {})[y];
    if (!rec) return { ok:false, reason:'no_calendar' };
    rec.applied = Object.assign({}, rec.applied || {}, dates || {}); rec.status = 'applied'; rec.appliedAt = Date.now(); rec.appliedBy = low(actorEmail);
    logHistory(db, { school_id: schoolId, section_id: null, section_name: '', students: [], kind: 'assessment', action: 'calendar.apply',
      changes: Object.keys(dates || {}).map(function(ph){ return { label: ph, from: '', to: dates[ph].start + ' → ' + dates[ph].end }; }), actor: actorFor(db, actorEmail, schoolId) });
    write(db);
    return { ok:true };
  }
  function dayCount(a, b){ return Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / DAY_MS) + 1; }
  function overlapDays(a0, a1, b0, b1){ var s0 = a0 > b0 ? a0 : b0, s1 = a1 < b1 ? a1 : b1; return s0 <= s1 ? dayCount(s0, s1) : 0; }
  function examLabel(e){ return (e.name || 'exams') + (e.board ? ' (' + e.board + ')' : ''); }
  // Gaps between consecutive terms count as holidays (school is closed).
  function closedBlocks(cal){
    var out = cleanBlocks(cal.holidays);
    for (var i = 1; i < cal.terms.length; i++){
      var a = isoAddDays(cal.terms[i - 1].end, 1), b = isoAddDays(cal.terms[i].start, -1);
      if (a <= b) out.push({ name: 'the break after ' + (cal.terms[i - 1].name || 'Term ' + i), start: a, end: b });
    }
    return out;
  }
  // Window of `len` days from `start`, moved past exams / closed days and stretched over holidays.
  function placeForward(cal, closed, start, len, notes){
    for (var guard = 0; guard < 30; guard++){
      var inBlock = closed.concat(cal.exams).filter(function(b){ return start >= b.start && start <= b.end; })[0];
      if (inBlock){ start = isoAddDays(inBlock.end, 1); notes.push('moved past ' + (inBlock.board !== undefined && cal.exams.indexOf(inBlock) >= 0 ? examLabel(inBlock) : inBlock.name)); continue; }
      var end = isoAddDays(start, len - 1), extra = 0, hols = [];
      closed.forEach(function(h){ var d = overlapDays(start, end, h.start, h.end); if (d){ extra += d; hols.push(h.name); } });
      if (extra) end = isoAddDays(end, extra);
      var ex = cal.exams.filter(function(e){ return overlapDays(start, end, e.start, e.end); })[0];
      if (ex){ start = isoAddDays(ex.end, 1); notes.push('moved past ' + examLabel(ex)); continue; }
      if (extra) notes.push('stretched ' + extra + ' day' + (extra === 1 ? '' : 's') + ' over ' + hols.join(', '));
      return { start: start, end: end };
    }
    return null;
  }
  // Window of `len` days ending on `end`, moved earlier past exams / closed days.
  function placeBackward(cal, closed, end, len, notes){
    for (var guard = 0; guard < 30; guard++){
      var inBlock = closed.concat(cal.exams).filter(function(b){ return end >= b.start && end <= b.end; })[0];
      if (inBlock){ end = isoAddDays(inBlock.start, -1); notes.push('ends before ' + (cal.exams.indexOf(inBlock) >= 0 ? examLabel(inBlock) : inBlock.name)); continue; }
      var start = isoAddDays(end, -(len - 1)), extra = 0, hols = [];
      closed.forEach(function(h){ var d = overlapDays(start, end, h.start, h.end); if (d){ extra += d; hols.push(h.name); } });
      if (extra) start = isoAddDays(start, -extra);
      var ex = cal.exams.filter(function(e){ return overlapDays(start, end, e.start, e.end); }).pop();
      if (ex){ end = isoAddDays(ex.start, -1); notes.push('ends before ' + examLabel(ex)); continue; }
      if (extra) notes.push('stretched ' + extra + ' day' + (extra === 1 ? '' : 's') + ' over ' + hols.join(', '));
      return { start: start, end: end };
    }
    return null;
  }
  function fmtShort(iso){ var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return (+iso.slice(8, 10)) + ' ' + m[+iso.slice(5, 7) - 1]; }
  // → { Baseline:{start,end,reason}, Midline:…, Endline:…, problems:[] } from a calendar.
  function suggestWindows(schoolId, cal){
    var db = getDB(); cal = cal || calendarFor(schoolId); if (!cal) return null;
    cal = { terms: cleanBlocks(cal.terms), exams: cleanBlocks(cal.exams), holidays: cleanBlocks(cal.holidays) };
    var R = schedulingRules(), len = R.windowWeeks * 7, closed = closedBlocks(cal), out = { problems: [] };
    var yr = currentIn(db, schoolId) || {}, terms = cal.terms.length ? cal.terms : [{ name: 'the year', start: yr.start, end: yr.end }];
    var t1 = terms[0], last = terms[terms.length - 1];
    // Baseline: a few weeks into Term 1, once children have settled.
    var n1 = [R.baselineWeeksIn + ' week' + (R.baselineWeeksIn === 1 ? '' : 's') + ' after ' + (t1.name || 'Term 1') + ' starts (' + fmtShort(t1.start) + ')'];
    var b = placeForward(cal, closed, isoAddDays(t1.start, R.baselineWeeksIn * 7), len, n1);
    if (b){ out.Baseline = { start: b.start, end: b.end, reason: n1.join(' · ') }; if (b.end > t1.end) out.problems.push('Baseline runs past the end of ' + (t1.name || 'Term 1') + '.'); }
    // Midline: into the middle term, and long enough after Baseline to show growth.
    var mid = terms.length >= 2 ? terms[Math.floor(terms.length / 2)] : null, n2 = [];
    var fromTerm = mid ? isoAddDays(mid.start, R.midlineWeeksIn * 7) : isoAddDays(t1.start, Math.round(dayCount(t1.start, last.end) / 2));
    var fromGap = b ? isoAddDays(b.end, R.midlineGapWeeks * 7 + 1) : fromTerm;
    var mStart = fromGap > fromTerm ? fromGap : fromTerm;
    n2.push(fromGap > fromTerm ? R.midlineGapWeeks + ' weeks after Baseline ends, so there’s growth to measure'
      : mid ? R.midlineWeeksIn + ' week' + (R.midlineWeeksIn === 1 ? '' : 's') + ' into ' + (mid.name || 'the middle term') + ' (' + fmtShort(mid.start) + ')' : 'halfway through the year');
    var m = placeForward(cal, closed, mStart, len, n2);
    if (m) out.Midline = { start: m.start, end: m.end, reason: n2.join(' · ') };
    // Endline: finished a couple of weeks before the final exams (or the last term's end).
    var finals = cal.exams.filter(function(e){ return !m || e.start > m.end; }).pop(), n3 = [];
    var anchor = finals ? finals.start : isoAddDays(last.end, 1);
    n3.push(R.endlineBufferWeeks + ' week' + (R.endlineBufferWeeks === 1 ? '' : 's') + ' before ' + (finals ? examLabel(finals) + ' (' + fmtShort(finals.start) + ')' : 'the end of ' + (last.name || 'the year') + ' (' + fmtShort(last.end) + ')'));
    var e = placeBackward(cal, closed, isoAddDays(anchor, -(R.endlineBufferWeeks * 7) - 1), len, n3);
    if (e) out.Endline = { start: e.start, end: e.end, reason: n3.join(' · ') };
    if (m && e && e.start <= m.end) out.problems.push('Midline and Endline overlap — the year is too short for these rules. Adjust the dates by hand.');
    if (b && m && m.start <= b.end) out.problems.push('Baseline and Midline overlap.');
    return out;
  }
  // Deployed (scheduled or live) windows that now clash with the calendar's exams.
  function calendarConflicts(schoolId){
    var cal = calendarFor(schoolId); if (!cal) return [];
    var deps = getDeployments(schoolId), seen = {}, out = [], sug = null;
    deps.forEach(function(d){
      if (seen[d.phase] || !d.start || !d.end || (d.status !== 'Scheduled' && d.status !== 'Live')) return; seen[d.phase] = 1;
      var ex = cleanBlocks(cal.exams).filter(function(x){ return overlapDays(d.start, d.end, x.start, x.end); })[0];
      if (!ex) return;
      out.push({ phase: d.phase, start: d.start, end: d.end, status: d.status, exam: ex, suggestion: shiftPastExams(schoolId, cal, d) });
    });
    return out;
  }
  // The smallest move that clears the exams: same length, pushed just past them
  // (never before tomorrow); Endline is pulled earlier instead when that still
  // leaves it in the future, so it keeps finishing before the year's end.
  function shiftPastExams(schoolId, cal, d){
    cal = { terms: cleanBlocks(cal.terms), exams: cleanBlocks(cal.exams), holidays: cleanBlocks(cal.holidays) };
    var closed = closedBlocks(cal), len = dayCount(d.start, d.end), tomorrow = isoAddDays(todayLocalISO(), 1), notes = [];
    if (d.phase === 'Endline'){
      var back = placeBackward(cal, closed, d.end, len, notes);
      if (back && back.start >= tomorrow) return back;
    }
    var from = d.start > tomorrow ? d.start : tomorrow;
    return placeForward(cal, closed, from, len, notes);
  }
  // Control Room: calendars waiting for Tilli, and schools whose windows now clash.
  function calendarQueue(){
    var db = getDB(), out = [];
    Object.keys(db.calendars || {}).forEach(function(sid){
      var y = calYearId(db, sid), c = (db.calendars[sid] || {})[y]; if (!c) return;
      var clash = calendarConflicts(sid).length;
      if (c.status === 'submitted' || clash) out.push({ school_id: sid, school_name: (db.schools[sid] || {}).name || sid, status: c.status, conflicts: clash });
    });
    return out;
  }
  // PROTOTYPE: "reading" an uploaded calendar. Returns plausible terms / exams /
  // holidays for the school's current year (shaped by country) for someone to
  // check. A developer swaps this for real extraction (Ask Tilli reading the file).
  function readCalendarFile(schoolId, fileName){
    var db = getDB(), sc = db.schools[schoolId] || {}, yr = currentIn(db, schoolId); if (!yr) return null;
    var total = dayCount(yr.start, yr.end), at = function(f){ return isoAddDays(yr.start, Math.round(total * f)); };
    var block = function(name, a, b){ return { name: name, start: at(a), end: at(b) }; };
    var two = /jordan/i.test(sc.country || '');
    var fest = /jordan/i.test(sc.country || '') ? 'Eid break' : /sri lanka/i.test(sc.country || '') ? 'Vesak holidays' : 'Diwali break';
    var cal = two
      ? { terms: [block('Term 1', 0, 0.45), block('Term 2', 0.52, 0.95)],
          exams: [block('Mid-term exams', 0.22, 0.24), block('Term 1 exams', 0.41, 0.45), block('Final exams', 0.88, 0.95)],
          holidays: [block(fest, 0.64, 0.66)] }
      : { terms: [block('Term 1', 0, 0.32), block('Term 2', 0.36, 0.64), block('Term 3', 0.68, 0.92)],
          exams: [block('Half-yearly exams', 0.29, 0.32), block('Final exams', 0.85, 0.92)],
          holidays: [block(fest, 0.45, 0.47)] };
    cal.source = 'upload'; cal.fileName = fileName || 'calendar';
    return cal;
  }

  /* ---------- Year-end requests (school → Tilli) ----------
     Only the Tilli team starts a new year. A school admin asks for it; the
     request shows on Tilli's Control Room and closes when the year starts.
     The school admin then sees a notice + "See grade migration". */
  function requestNewYear(schoolId, actorEmail){
    var db = getDB(), cur = currentIn(db, schoolId);
    if (!cur) return { ok: false, reason: 'not_found' };
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok: false, reason: 'not-authorized' };
    db.yearRequests = db.yearRequests || {};
    var open = db.yearRequests[schoolId];
    if (open && open.status === 'open') return { ok: true, request: clone(open) };
    var r = db.yearRequests[schoolId] = { school_id: schoolId, year: cur.label, by: low(actorEmail), byName: nameFor(db, actorEmail, schoolId), at: Date.now(), status: 'open' };
    logHistory(db, { school_id: schoolId, section_id: null, section_name: '', students: [], kind: 'assessment', action: 'year.request',
      changes: [{ label: 'Academic year', from: cur.label, to: 'next year' }], actor: actorFor(db, actorEmail, schoolId) });
    write(db);
    return { ok: true, request: clone(r) };
  }
  function yearRequest(schoolId){ var r = (getDB().yearRequests || {})[schoolId]; return r ? clone(r) : null; }
  function openYearRequests(){
    var db = getDB(), all = db.yearRequests || {};
    return Object.keys(all).map(function(k){ return all[k]; }).filter(function(r){ return r.status === 'open'; })
      .map(function(r){ var o = clone(r); o.school_name = (db.schools[r.school_id] || {}).name || r.school_id; return o; });
  }
  // The current year's rollover, while this admin hasn't dismissed its notice.
  function yearNotice(schoolId, email){
    var db = getDB(), cur = currentIn(db, schoolId);
    if (!cur || !cur.rollover) return null;
    if ((cur.noticeSeen || []).indexOf(low(email)) >= 0) return null;
    return { year: cur.label, startedAt: cur.startedAt, rollover: clone(cur.rollover) };
  }
  function dismissYearNotice(schoolId, email){
    var db = getDB(), cur = currentIn(db, schoolId); if (!cur) return;
    cur.noticeSeen = (cur.noticeSeen || []).concat([low(email)]); write(db);
  }

  // Close the current year and open the next. opts: { label, start, end,
  // gradeActions:{ 'Grade 1':'promote'|'retain'|'graduate' }, endOpen, actorEmail }.
  function startNewYear(schoolId, opts){
    var db = getDB(); opts = opts || {};
    var cur = currentIn(db, schoolId); if (!cur) return { ok: false, reason: 'not_found' };
    // SERVER-SIDE: Tilli team only — school staff ask Tilli instead (requestNewYear).
    if (roleOf(db, opts.actorEmail, schoolId)) return { ok: false, reason: 'not-authorized' };
    var start = opts.start, end = opts.end, label = norm(opts.label) || (start && end ? yearLabel(start, end) : '');
    if (!start || !end || start > end) return { ok: false, reason: 'dates' };
    if (start <= cur.start) return { ok: false, reason: 'before_current' };
    if (yearsIn(db, schoolId).some(function(x){ return low(x.label) === low(label); })) return { ok: false, reason: 'label_taken' };
    var deps = db.deployments[schoolId] || {}, now = Date.now();
    var live = Object.keys(deps).filter(function(k){ return effectiveStatus(deps[k]) === 'Live'; });
    if (live.length && !opts.endOpen) return { ok: false, reason: 'open_lanes', lanes: live };
    live.forEach(function(k){ deps[k].status = 'Ended'; deps[k].endedAt = now; });
    Object.keys(deps).forEach(function(k){ if (effectiveStatus(deps[k]) === 'Scheduled') deps[k].notRun = true; });

    // 1) Snapshot the closing year (classes + who sat where, as they were).
    var secs = schoolSections(db, schoolId), secSnap = {}, enrol = {};
    secs.forEach(function(x){ lockBase(db, x); secSnap[x.section_id] = { grade: x.grade, section: x.section, name: x.name, base_grade: x.base_grade, base_section: x.base_section }; });
    var studs = Object.keys(db.students).map(function(k){ return db.students[k]; }).filter(function(x){ return x.school_id === schoolId && x.status !== 'left' && x.status !== 'graduated'; });
    studs.forEach(function(x){ enrol[x.student_id] = { grade: x.grade, section: x.section, section_id: x.section_id, status: x.status }; });
    if (!db.archive) db.archive = {};
    (db.archive[schoolId] = db.archive[schoolId] || {})[cur.id] = { deployments: clone(deps), completions: clone(db.completions[schoolId] || {}),
      outcomes: clone((db.outcomes || {})[schoolId] || {}), selfReports: clone((db.selfReports || {})[schoolId] || {}),
      sections: secSnap, enrolments: enrol, closedAt: now };
    cur.status = 'closed'; cur.closedAt = now;

    // 2) Fresh year: no lanes, completions or results yet.
    db.deployments[schoolId] = {}; db.completions[schoolId] = {};
    if (db.inProgress) db.inProgress[schoolId] = {};
    if (db.outcomes) db.outcomes[schoolId] = {};
    if (db.selfReports) db.selfReports[schoolId] = {};

    // 3) Move children by base grade (Grade 1 A → Grade 2 A, whatever the school calls them).
    var acts = opts.gradeActions || {}, moved = { promoted: 0, retained: 0, graduated: 0 }, byGrade = {};
    var tally = function(from, act, to){ var k = from + '|' + act; (byGrade[k] = byGrade[k] || { from: from, action: act, to: to || '', students: 0 }).students++; };
    studs.forEach(function(x){
      var sec = db.sections[x.section_id] || {};
      var b = sec.base_grade || baseGradeIn(db, schoolId, x.grade), nb = BASE_GRADES[BASE_GRADES.indexOf(b) + 1];
      var act = acts[b] || (nb ? 'promote' : 'graduate');
      if (act === 'retain' || !b){ moved.retained++; tally(b || x.grade, 'retain', b || x.grade); return; }
      if (act === 'graduate' || !nb){ x.status = 'graduated'; moved.graduated++; tally(b, 'graduate'); return; }
      tally(b, 'promote', nb);
      var letter = sec.base_section || sec.section || 'A';
      var target = secs.filter(function(t){ return t.base_grade === nb && low(t.base_section) === low(letter); })[0]
        || secs.filter(function(t){ return t.base_grade === nb; })[0];
      if (!target){
        var id = 'sec_' + schoolId + '_' + slugify(nb + '_' + letter);
        // A new class keeps a board: the next grade's own, else the class the children came from.
        var nbBoard = (secs.filter(function(t){ return t.base_grade === nb && t.board; })[0] || {}).board || sec.board || null;
        target = db.sections[id] = { section_id: id, school_id: schoolId, grade: nb, section: letter, name: nb + ' ' + letter, teacherId: null, base_grade: nb, base_section: letter, board: nbBoard };
        secs.push(target);
      }
      x.section_id = target.section_id; x.grade = target.grade; x.section = target.section; moved.promoted++;
    });
    // Expected sizes follow the children: a class that received a moved-up class
    // expects that many; one left empty (e.g. the new intake grade) keeps last
    // year's size as its starting guess until an admin changes it.
    var intake = {};
    studs.forEach(function(x){ if (x.status !== 'graduated') intake[x.section_id] = (intake[x.section_id] || 0) + 1; });
    secs.forEach(function(t){ if (intake[t.section_id]){ t.expected = intake[t.section_id]; t.expectedConfirmed = false; } });

    // 4) The new current year.
    var y = { id: yearId(label), label: label, start: start, end: end, status: 'current', startedAt: now, startedBy: low(opts.actorEmail),
      // What the rollover did — the school admin's "See grade migration" reads this.
      rollover: { from: cur.label, moved: moved, grades: Object.keys(byGrade).map(function(k){ return byGrade[k]; })
        .sort(function(p, q){ return BASE_GRADES.indexOf(p.from) - BASE_GRADES.indexOf(q.from); }) } };
    db.years[schoolId].push(y);
    // A school's open "please start next year" request is now answered.
    var req = (db.yearRequests || {})[schoolId];
    if (req && req.status === 'open'){ req.status = 'done'; req.doneAt = now; req.doneYear = label; }
    logHistory(db, { school_id: schoolId, section_id: null, section_name: '', students: [], items: [], kind: 'assessment', action: 'year.start',
      changes: [{ label: 'Academic year', from: cur.label, to: label }], actor: actorFor(db, opts.actorEmail, schoolId) });
    write(db);
    return { ok: true, year: Object.assign({}, y), closed: Object.assign({}, cur), moved: moved };
  }

  /* ======================================================================
     NEW — PROTOTYPE SEL OUTCOMES (auto-generated; local only)
     ----------------------------------------------------------------------
     Created schools carry a real roster + real completion but no scored
     results. For the working prototype we synthesize per-student, per-skill
     scores (baseline/mid/post + teacher/parent/student perspectives) with the
     SAME deterministic algorithm the demo dataset uses (school-data.js
     buildSkills), so a created school's dashboard reads exactly like the demo
     one. Scores are generated once and persisted to localStorage; a developer
     replaces genSkills()/outcomesForSchool() with real assessment results.
     pointStatusFor() gates WHICH points are shown, from REAL completion — a
     point becomes 'complete' only once its phase is fully completed (or ended).
     ====================================================================== */
  function _hashStr(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function _mulberry32(a){ return function(){ a|=0; a=(a+0x6d2b79f5)|0; var t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
  function _clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
  function _band(p){ return p<34?'sprouting':p<67?'growing':'blooming'; }
  // Mirror of school-data.js buildSkills(): a plausible year-long trajectory
  // (baseline < mid < post, with per-skill jitter) + 3 rater perspectives,
  // seeded off the student id so every reload is identical.
  function genSkills(student, skills){
    var first = student.first || String(student.name||'').split(' ')[0] || student.student_id || '';
    var seedId = student.student_id || student.adm || first;
    var rndS = _mulberry32(_hashStr(first+':garden'));
    var base = 40 + rndS()*26; var post = {};
    skills.forEach(function(sk){ post[sk.key] = Math.round(_clamp(base+(rndS()-0.5)*60,6,98)); });
    var rnd = _mulberry32(_hashStr(seedId+':assess'));
    return skills.map(function(sk){
      var p = post[sk.key];
      var growth = Math.round(rnd()*22);
      var mid = _clamp(p-Math.round(growth*0.55),2,99);
      var pre = _clamp(mid-Math.round(growth*0.45),2,99);
      var teacher = _clamp(p+Math.round((rnd()-0.5)*12),2,100);
      var parent  = _clamp(p+Math.round((rnd()-0.4)*22),2,100);
      var studentP= _clamp(p+Math.round((rnd()-0.55)*26),2,100);
      return { key:sk.key, name:sk.name, group:sk.group, pct:p, band:_band(p),
        baseline:pre, mid:mid, post:p, teacher:teacher, parent:parent, student:studentP,
        gap:Math.max(teacher,parent,studentP)-Math.min(teacher,parent,studentP) };
    });
  }
  // Generate (once) + persist + return outcomes for every current student.
  // `skills` is the 12-skill catalogue (passed in so this layer needn't own it).
  function outcomesForSchool(schoolId, skills){
    if (!skills || !skills.length) return (getDB().outcomes||{})[schoolId] || {};
    var db = getDB(); db.outcomes = db.outcomes || {};
    var store = db.outcomes[schoolId] = db.outcomes[schoolId] || {};
    var changed = false;
    studentsForSchool(schoolId).forEach(function(s){
      if (!store[s.student_id]){ store[s.student_id] = genSkills(s, skills); changed = true; }
    });
    if (changed) write(db);
    return store;
  }
  // Per assessment point (baseline/midline/endline) → 'upcoming'|'open'|'complete',
  // derived from REAL deployments + completion. 'complete' (bands appear) only when
  // every deployed lane of that phase is 100% complete, or the phase was ended.
  function pointStatusFor(schoolId){
    var ids = studentsForSchool(schoolId).map(function(s){ return s.student_id; });
    var db = getDB(); var deps = db.deployments[schoolId] || {};
    var PH = [['baseline','Baseline'],['midline','Midline'],['endline','Endline']];
    var AUD = ['Teacher','Parent','Direct Assessment'];
    var out = {};
    PH.forEach(function(pr){
      // Scheduled lanes haven't opened yet — they don't count until their start date.
      var lanes = AUD.map(function(a){ return deps[pr[1]+'|'+a]; }).filter(function(d){ return d && effectiveStatus(d) !== 'Scheduled'; });
      if (!lanes.length){ out[pr[0]] = 'upcoming'; return; }
      // 'complete' (bands appear) as soon as ANY deployed lane is ended or 100%
      // complete — so one audience finishing (e.g. a teacher bulk-marking their
      // class) publishes that point, rather than needing every lane to finish.
      var done = lanes.some(function(d){
        if (effectiveStatus(d)==='Ended') return true;
        var c = completionStats(schoolId, pr[1], d.audience, ids);
        return c.expected>0 && c.done>=c.expected;
      });
      out[pr[0]] = done ? 'complete' : 'open';
    });
    return out;
  }

  /* ---------- reflection question bank (Platform Admin editable) ---------- */
  function getReflectionConfig(){ return clone(getDB().config.reflection); }
  // Replaces the whole bank. Keeps the 5 fixed categories; drops questions with
  // no text; gives any new question a fresh stable id.
  function setReflectionConfig(cfg){
    if (!cfg || !Array.isArray(cfg.questions)) return { ok:false, reason:'bad_config' };
    var db = getDB(); var cats = db.config.reflection.cats;
    var catIds = cats.map(function(c){ return c.id; });
    var used = {}; var n = 0;
    var qs = cfg.questions.filter(function(q){ return q && norm(q.q); }).map(function(q){
      var id = norm(q.id); if (!id || used[id]) { do { id = 'q' + Date.now().toString(36) + (n++); } while (used[id]); }
      used[id] = true;
      var type = ['scale','choice','text'].indexOf(q.type)>=0 ? q.type : 'scale';
      var out = { id:id, cat: catIds.indexOf(q.cat)>=0 ? q.cat : catIds[0], type:type, q:norm(q.q) };
      if (norm(q.hint)) out.hint = norm(q.hint);
      if (type==='scale'){ if (norm(q.lo)) out.lo = norm(q.lo); if (norm(q.hi)) out.hi = norm(q.hi); if (q.reverse) out.reverse = true; }
      if (type==='choice') out.options = (q.options||[]).map(norm).filter(Boolean);
      return out;
    });
    db.config.reflection = { cats: cats, questions: qs, updatedAt: Date.now() };
    write(db);
    return { ok:true, config: clone(db.config.reflection) };
  }
  function resetReflectionConfig(){ var db=getDB(); db.config.reflection = clone(DEFAULT_REFLECTION); write(db); return clone(db.config.reflection); }

  /* ======================================================================
     CHANGE HISTORY — append-only log of student-record + assessment events
     ----------------------------------------------------------------------
     Every guarded write above records one event: who did it, when, to which
     student(s) / section, and a field-level list of what changed (old → new).
     Teachers, school admins, group admins and the Tilli team all read the
     same log, each through a scoped reader (historyFor / historyAcross).

     Event shape:
       { id, at, school_id, section_id, section_name,
         students:[{id,name}],            // [] for school-wide events
         kind:'student'|'assessment', action, phase?, audience?,
         changes:[{label,from,to}], items:[string],
         actor:{email,name,role} }        // role: teacher|admin|parent|tilli|group|system

     NEVER put scores / SEL levels in an event: leadership reads this log and
     must only ever see WHO, not HOW (admin spec §2).
     ====================================================================== */
  var HISTORY_CAP = 1500;                  // oldest events drop off past this many (keeps localStorage small)
  var HISTORY_COALESCE_MS = 2 * 60 * 1000; // same person repeating the same add / completion in one section within this window → one row
  var STUDENT_FIELDS = [
    ['first','First name'], ['last','Last name'], ['uid','Student UID'], ['grade','Grade'], ['section','Section'],
    ['parentName','Parent name'], ['parentEmail','Parent email'], ['dob','Date of birth'], ['gender','Gender'],
  ];

  // The signed-in user for this page. Each app sets it once at boot; it wins
  // over the actorEmail a call passes (e.g. a Tilli CSV import runs under the
  // coordinator's email to pass the guard, but Tilli Team did it).
  // SERVER-SIDE: the real actor comes from the authenticated session.
  var historyActor = null;
  function setHistoryActor(a){ historyActor = (a && a.email) ? { email:low(a.email), name:norm(a.name), role:a.role||'' } : null; }

  function nameFor(db, email, schoolId){
    var e = low(email); if (!e) return '';
    var st = (db.staff[schoolId]||[]).find(function(x){ return low(x.email)===e; });
    if (st && st.name) return st.name;
    var am = db.adminMemberships.find(function(m){ return m.user_id===e && m.name; });
    if (am) return am.name;
    var SRC = window.TILLI_SCHOOL;
    if (SRC){
      var p = [].concat(SRC.teachers||[], SRC.admins||[], SRC.parents||[]).find(function(x){ return low(x.email)===e; });
      if (p && p.name) return p.name;
    }
    var acct = db.accounts[e]; if (acct && acct.name) return acct.name;
    var kid = Object.keys(db.students).map(function(k){ return db.students[k]; }).find(function(s){ return s.parentEmail===e && s.parentName; });
    if (kid) return kid.parentName;
    return e.split('@')[0];
  }
  // The Tilli team (Super Admin accounts / @tilli.org), whatever school memberships it also holds.
  function isTilliActor(db, email){
    var e = low(email), lbl = low(db.accounts[e] && db.accounts[e].role);
    return lbl.indexOf('super') >= 0 || /@tilli\.org$/.test(e);
  }
  function roleKeyFor(db, email, schoolId){
    var e = low(email), r = roleOf(db, e, schoolId);
    if (r==='admin') return 'admin';
    if (r) return r;
    var lbl = low(db.accounts[e] && db.accounts[e].role);
    if (lbl.indexOf('group')>=0) return 'group';
    if (lbl.indexOf('super')>=0 || /@tilli\.org$/.test(e)) return 'tilli';
    if (lbl.indexOf('teacher')>=0) return 'teacher';
    if (lbl.indexOf('admin')>=0) return 'admin';
    return '';
  }
  function actorFor(db, email, schoolId){
    var h = historyActor, e = low((h && h.email) || email);
    if (!e) return { email:'', name:'System', role:'system' };
    return { email:e, name:(h && h.name) || nameFor(db, e, schoolId), role:(h && h.role) || roleKeyFor(db, e, schoolId) };
  }
  // Field-level diff of two student records → [{label, from, to}].
  function diffFields(before, after, fields){
    var out = [];
    fields.forEach(function(f){
      var a = norm(before[f[0]]), b = norm(after[f[0]]);
      if (a !== b) out.push({ label:f[1], from:a, to:b });
    });
    return out;
  }
  function studentEvent(db, rec, action, actorEmail, extra){
    var sec = rec.section_id && db.sections[rec.section_id];
    return Object.assign({
      school_id: rec.school_id, section_id: rec.section_id || null,
      section_name: sec ? sec.name : norm((rec.grade||'')+' '+(rec.section||'')),
      students: [{ id: up(rec.student_id), name: rec.name || fullName(rec) }],
      kind: 'student', action: action, actor: actorFor(db, actorEmail, rec.school_id),
    }, extra || {});
  }
  function phaseEvent(db, schoolId, action, phase, audience, changes){
    return { school_id:schoolId, section_id:null, section_name:'', students:[], kind:'assessment',
      action:action, phase:phase, audience:audience, changes:changes||[], actor:actorFor(db, null, schoolId) };
  }

  // Bulk adds and back-to-back completions fold into one row instead of
  // flooding the log with one line per child.
  function coalesceKey(e){
    if (e.action==='assessment.complete') return [e.action, e.actor.email, e.school_id, e.section_id||'', e.phase, e.audience].join('|');
    if (e.action==='student.add') return [e.action, e.actor.email, e.school_id, e.section_id||''].join('|');
    return null;
  }
  function logHistory(db, e){
    if (!db.history) db.history = [];
    e.at = e.at || Date.now();
    e.students = e.students || []; e.changes = e.changes || []; e.items = e.items || [];
    var key = coalesceKey(e);
    if (key){
      for (var i = db.history.length - 1; i >= 0; i--){
        var p = db.history[i];
        if (e.at - p.at > HISTORY_COALESCE_MS) break;
        if (coalesceKey(p) !== key) continue;
        e.students.forEach(function(s){ if (!p.students.some(function(x){ return x.id===s.id; })) p.students.push(s); });
        e.items.forEach(function(it){ if (p.items.indexOf(it) < 0) p.items.push(it); });
        p.at = e.at;
        db.history.splice(i, 1); db.history.push(p);   // keep it the newest row
        return p;
      }
    }
    e.id = newId('h');
    db.history.push(e);
    if (db.history.length > HISTORY_CAP) db.history.splice(0, db.history.length - HISTORY_CAP);
    return e;
  }
  // For UI-side edits that don't go through a guarded write yet (e.g. the
  // leadership roster's teacher reassignment, the demo roster editor).
  // SERVER-SIDE: these become real writes that log for themselves.
  function recordChange(evt){
    if (!evt || !evt.school_id) return null;
    var db = getDB(), e = clone(evt);
    e.actor = actorFor(db, e.actorEmail, e.school_id); delete e.actorEmail;
    e.kind = e.kind || 'student';
    e.students = (e.students||[]).map(function(s){ return { id:up(s.id), name:norm(s.name) }; });
    // Pin a student event to the child's section so teacher scoping applies.
    if (!e.section_id && e.students.length){
      var rec = db.students[keyOf(e.school_id, e.students[0].id)];
      if (rec && rec.section_id){ e.section_id = rec.section_id; e.section_name = e.section_name || (db.sections[rec.section_id]||{}).name || ''; }
    }
    var out = logHistory(db, e); write(db);
    return clone(out);
  }

  function historyMatches(e, f){
    if (f.kind && e.kind !== f.kind) return false;
    if (f.student_id){ var id = up(f.student_id); if (!(e.students||[]).some(function(s){ return s.id===id; })) return false; }
    if (f.section_id && e.section_id !== f.section_id) return false;
    if (f.since && e.at < f.since) return false;
    if (f.q){
      var hay = low([ (e.students||[]).map(function(s){ return s.name+' '+s.id; }).join(' '),
        e.actor && e.actor.name, e.actor && e.actor.email, e.section_name, e.phase, e.audience,
        (e.items||[]).join(' '), (e.changes||[]).map(function(c){ return c.from+' '+c.to; }).join(' ') ].join(' '));
      if (hay.indexOf(low(f.q)) < 0) return false;
    }
    return true;
  }
  function historyPage(list, f){
    var out = list.filter(function(e){ return historyMatches(e, f); }).sort(function(a, b){ return b.at - a.at; });
    if (f.limit) out = out.slice(0, f.limit);
    return out.map(clone);
  }
  // One school's history, scoped by the caller's role there (spec §7):
  // admin → whole school; teacher → their sections + school-wide
  // assessment events. Returns null when the caller has no role at the school.
  // filter: { kind, student_id, section_id, since, q, limit }
  // SERVER-SIDE: scope comes from the session, never from the client.
  function historyFor(actorEmail, schoolId, filter){
    var db = getDB(), f = filter || {};
    var all = (db.history||[]).filter(function(e){ return e.school_id===schoolId; });
    var role = roleOf(db, actorEmail, schoolId);
    if (role==='admin') return historyPage(all, f);
    if (role==='teacher'){
      var mine = teacherScope(db, actorEmail, schoolId);
      var myKids = Object.keys(db.students).map(function(k){ return db.students[k]; })
        .filter(function(s){ return s.school_id===schoolId && mine.indexOf(s.section_id) >= 0; }).map(function(s){ return up(s.student_id); });
      return historyPage(all.filter(function(e){
        if (e.section_id) return mine.indexOf(e.section_id) >= 0;
        var stu = e.students || [];   // no section: school-wide, or one of their own children
        return !stu.length || stu.some(function(s){ return myKids.indexOf(s.id) >= 0; });
      }), f);
    }
    // DEMO ONLY: a sample-class teacher with no membership row (e.g.
    // teacher@tilli.edu) is scoped to the students/sections their dashboard
    // was built from (f.students / f.sections). A real server never trusts this.
    if (f.students && f.students.length){
      var ids = f.students.map(up), names = (f.sections||[]).map(low);
      return historyPage(all.filter(function(e){
        var stu = e.students || [];
        if (!e.section_id && !stu.length) return true;
        return stu.some(function(s){ return ids.indexOf(s.id) >= 0; }) || (e.section_name && names.indexOf(low(e.section_name)) >= 0);
      }), f);
    }
    return null;
  }
  // Several schools at once — Tilli team (all) and School Group Admin (their
  // group's schools). SERVER-SIDE: the platform layer checks the caller's role
  // and group before passing schoolIds.
  function historyAcross(schoolIds, filter){
    var ids = {}; (schoolIds||[]).forEach(function(id){ ids[id] = 1; });
    return historyPage((getDB().history||[]).filter(function(e){ return ids[e.school_id]; }), filter || {});
  }

  // One-time: give the demo school's real staff (TILLI_SCHOOL) the memberships
  // their dashboards assume — the coordinator wasn't seeded and teachers only
  // got their first section — so role checks resolve for them.
  function backfillSeedMemberships(db){
    var SRC = window.TILLI_SCHOOL;
    if (!SRC || !SRC.school || !db.schools[SRC.school.id]) return;
    var sid = SRC.school.id;
    (SRC.teachers||[]).forEach(function(t){
      var e = low(t.email);
      var secIds = Object.keys(db.sections).filter(function(k){ return db.sections[k].school_id===sid && db.sections[k].teacherId===t.id; });
      var m = db.teacherMemberships.find(function(x){ return x.user_id===e && x.school_id===sid; });
      if (!m){ m = { user_id:e, school_id:sid, section_ids:[], status:'active' }; db.teacherMemberships.push(m); }
      secIds.forEach(function(id){ if (m.section_ids.indexOf(id) < 0) m.section_ids.push(id); });
    });
    (SRC.admins||[]).forEach(function(a){
      var e = low(a.email);
      if (db.adminMemberships.some(function(m){ return m.user_id===e && m.school_id===sid; })) return;
      db.adminMemberships.push({ user_id:e, school_id:sid, role:'admin', name:a.name, status:'active' });
    });
  }
  // Sample history for the demo school so every role has something to read on
  // first open: roster import, Baseline deploy, a few edits, parent links and
  // completions, spread over the last five weeks. Never contains scores.
  function seedHistory(db){
    db.history = [];
    var SRC = window.TILLI_SCHOOL;
    if (!SRC || !SRC.school || !db.schools[SRC.school.id]) return;
    var sid = SRC.school.id, now = Date.now(), DAY = 86400000;
    var person = function(p, role){ return p ? { email:low(p.email), name:p.name, role:role } : { email:'', name:'System', role:'system' }; };
    var coord = person((SRC.admins||[]).find(function(a){ return a.role==='coordinator'; }), 'admin');
    var team = { email:'team@tilli.org', name:'Tilli Team', role:'tilli' };
    var teacherOf = function(sec){ return person((SRC.teachers||[]).find(function(t){ return t.id===sec.teacherId; }), 'teacher'); };
    var studs = Object.keys(db.students).map(function(k){ return db.students[k]; }).filter(function(s){ return s.school_id===sid; });
    var secs = Object.keys(db.sections).map(function(k){ return db.sections[k]; }).filter(function(s){ return s.school_id===sid; });
    var inSec = function(sec){ return studs.filter(function(s){ return s.section_id===sec.section_id; }); };
    var ref = function(s){ return { id:up(s.student_id), name:s.name }; };
    var onSec = function(sec, e){ e.section_id = sec.section_id; e.section_name = sec.name; return e; };
    var add = function(daysAgo, e){
      e.id = 'h_seed_' + db.history.length; e.at = now - Math.round(daysAgo * DAY); e.school_id = sid;
      e.section_id = e.section_id || null; e.section_name = e.section_name || '';
      e.students = e.students || []; e.changes = e.changes || []; e.items = e.items || [];
      db.history.push(e);
    };

    secs.forEach(function(sec){
      var list = inSec(sec);
      if (list.length) add(34, onSec(sec, { kind:'student', action:'student.add', source:'csv', students:list.map(ref), actor:coord }));
    });
    add(28.2, { kind:'assessment', action:'phase.deploy', phase:'Baseline', audience:'Teacher', actor:team, changes:[{ label:'Assessments', from:'', to:'Teacher observation' }] });
    add(28.2, { kind:'assessment', action:'phase.deploy', phase:'Baseline', audience:'Parent', actor:team, changes:[{ label:'Assessments', from:'', to:'Parent report' }] });

    var s0 = secs[0], s1 = secs[1], s2 = secs[2] || secs[secs.length - 1];
    var a = s0 && inSec(s0)[0];
    if (a && a.parentEmail) add(24.6, onSec(s0, { kind:'student', action:'student.edit', students:[ref(a)], actor:teacherOf(s0), changes:[{ label:'Parent email', from:'', to:a.parentEmail }] }));
    (SRC.parents||[]).forEach(function(p){
      (p.children||[]).forEach(function(adm, i){
        var s = db.students[keyOf(sid, adm)]; if (!s) return;
        var sec = db.sections[s.section_id];
        add(20.3 - i * 0.01, { kind:'student', action:'parent.link', section_id:s.section_id, section_name:sec ? sec.name : '',
          students:[ref(s)], actor:person(p, 'parent'), changes:[{ label:'Parent', from:'', to:low(p.email) }] });
      });
    });
    if (s0) add(13.8, onSec(s0, { kind:'assessment', action:'assessment.complete', phase:'Baseline', audience:'Teacher', students:inSec(s0).slice(0, 4).map(ref), items:['Teacher observation'], actor:teacherOf(s0) }));
    if (s2 && s2 !== s0) add(11.5, onSec(s2, { kind:'assessment', action:'assessment.complete', phase:'Baseline', audience:'Teacher', students:inSec(s2).slice(0, 3).map(ref), items:['Teacher observation'], actor:teacherOf(s2) }));
    var parent = (SRC.parents||[])[0], pc = parent && db.students[keyOf(sid, (parent.children||[])[0])];
    if (pc) add(8.9, { kind:'assessment', action:'assessment.complete', phase:'Baseline', audience:'Parent', section_id:pc.section_id,
      section_name:(db.sections[pc.section_id]||{}).name || '', students:[ref(pc)], items:['Parent report'], actor:person(parent, 'parent') });
    var b = s2 && inSec(s2)[1];
    if (b) add(5.7, onSec(s2, { kind:'student', action:'student.edit', students:[ref(b)], actor:teacherOf(s2),
      changes:[{ label:'Student UID', from:'TM-' + up(b.student_id).replace(/[^A-Z0-9]/g, '').slice(-4), to:b.uid || makeUid(sid, b.student_id) }] }));
    var c = s1 && inSec(s1)[2];
    if (c && c.last && c.last.length > 3){
      var m = Math.ceil(c.last.length / 2);
      add(1.2, onSec(s1, { kind:'student', action:'student.edit', students:[ref(c)], actor:coord,
        changes:[{ label:'Last name', from:c.last.slice(0, m) + c.last.charAt(m - 1) + c.last.slice(m), to:c.last }] }));
    }
    db.history.sort(function(x, y){ return x.at - y.at; });
  }

  /* ---------- dev utilities ---------- */
  function reset(){ try{ localStorage.removeItem(STORE_KEY); }catch(e){} return seedFromSchool(); }
  function _dump(){ return getDB(); }

  /* ---------- public surface ---------- */
  window.TilliAPI = {
    // Flow A — roster
    ensureTeacherScope: ensureTeacherScope,   // DEMO helper (see note above)
    requestClass: requestClass,
    classRequests: classRequests,
    resolveClassRequest: resolveClassRequest,
    recentCodeJoiners: recentCodeJoiners,
    removeTeacherAccess: removeTeacherAccess,
    sectionsForTeacher: sectionsForTeacher,
    listRoster: listRoster,
    addStudent: addStudent,
    addStudentsBulk: addStudentsBulk,
    reviewQueue: reviewQueue,
    // Boards per grade + board-scoped school admins
    setGradeBoard: setGradeBoard,
    adminBoards: adminBoards,
    setAdminBoards: setAdminBoards,
    untaggedGrades: untaggedGrades,
    sectionsInScope: sectionsInScope,
    // Completion = children fully done (one rule for every app)
    childrenDone: childrenDone,
    childStatus: childStatus,
    // Expected class size — teachers add up to it; past it, admins approve
    sectionRoom: sectionRoom,
    schoolRooms: schoolRooms,
    setSectionExpected: setSectionExpected,
    pendingStudents: pendingStudents,
    decideStudent: decideStudent,
    // Flow B — parent claim (verify before reveal)
    beginClaim: function(schoolNameOrId, studentId){ return _beginClaim(schoolNameOrId, studentId); },
    verifyClaim: function(challengeId, secondFactor){ return _verifyClaim(challengeId, secondFactor); },
    confirmClaim: function(claimToken, parentEmail){ return _confirmClaim(claimToken, parentEmail); },
    childrenForParent: childrenForParent,
    // Flow C — lifecycle (Admin-only)
    offboardStudent: offboardStudent,
    revokeParentLink: revokeParentLink,
    reassignTeacher: reassignTeacher,
    // Flow A — invites / verification
    verifySchool: verifySchool,
    inviteAdmin: inviteAdmin,
    inviteTeacher: inviteTeacher,
    acceptInvite: acceptInvite,
    // Accounts — Platform Admin invitation → temp password → first-login reset
    createInvite: createInvite,
    getAccount: getAccount,
    listAccounts: listAccounts,
    checkPassword: checkPassword,
    setPassword: setPassword,
    // reads + config
    getStudent: getStudent,
    updateStudent: updateStudent,
    makeUid: makeUid,
    getReflectionConfig: getReflectionConfig,
    setReflectionConfig: setReflectionConfig,
    resetReflectionConfig: resetReflectionConfig,
    schoolSettings: schoolSettings,
    resolveSchool: function(x){ var s=resolveSchool(x); return s?Object.assign({},s):null; },
    roleOf: function(email, schoolId){ return roleOf(getDB(), email, schoolId); },
    // NEW — full school creation + directory (Platform Admin "Add school")
    createSchoolFull: createSchoolFull,
    resolveJoinCode: resolveJoinCode,
    regenerateSchoolCode: regenerateSchoolCode,
    verifySchoolCode: verifySchoolCode,
    // My School Check-in + own-class rule (student direct link)
    CHECKIN_NAME: CHECKIN_NAME,
    parentsTakePart: parentsTakePart,
    setParentsTakePart: setParentsTakePart,
    checkinAtSchool: checkinAtSchool,
    directAtSchool: directAtSchool,
    liveDirectPhase: liveDirectPhase,
    isOwnClassBlocked: isOwnClassBlocked,
    ownClassRuleOn: ownClassRuleOn,
    startAssessment: startAssessment,
    ownClassResults: ownClassResults,
    assessableSections: assessableSections,
    resolveSchoolCode: resolveSchoolCode,
    teacherSchools: teacherSchools,
    isTeacherAt: isTeacherAt,
    listSchools: listSchools,
    staffFor: staffFor, teachersFor: teachersFor,
    sectionsForSchool: sectionsForSchool,
    ensureSection: ensureSection,
    studentsForSchool: studentsForSchool,
    schoolStats: schoolStats,
    // NEW — assessment lifecycle (deploy → complete → stats)
    deployPhase: deployPhase,
    endPhase: endPhase,
    undeployPhase: undeployPhase,
    getDeployments: getDeployments, effectiveStatus: effectiveStatus, chainFor: chainFor,
    saveSelfReport: saveSelfReport, selfReportsFor: selfReportsFor, itemCompletion: itemCompletion,
    deploymentsFor: deploymentsFor,
    markComplete: markComplete,
    isComplete: isComplete,
    completedAt: completedAt,
    completionStats: completionStats,
    // NEW — prototype SEL outcomes (local, auto-generated) + point lifecycle
    outcomesForSchool: outcomesForSchool,
    pointStatusFor: pointStatusFor,
    // NEW — change history (who changed what, when) + group membership
    setHistoryActor: setHistoryActor,
    recordChange: recordChange,
    historyFor: historyFor,
    historyAcross: historyAcross,
    setSchoolGroup: setSchoolGroup,
    // base grades (fixed identity behind a renamed grade / section)
    BASE_GRADES: BASE_GRADES,
    inferBaseGrade: inferBaseGrade,
    baseGradeOf: baseGradeOf,
    baseSectionCode: baseSectionCode,
    gradeLabel: gradeLabel,
    sectionLabel: sectionLabel,
    sectionBase: sectionBase,
    // academic years (current year in the live store; past years archived, read-only)
    yearsFor: yearsFor,
    currentYear: currentYear,
    setYearDates: setYearDates,
    yearArchive: yearArchive,
    deploymentsIn: deploymentsIn,
    completionStatsIn: completionStatsIn,
    outcomesIn: outcomesIn,
    yearSummary: yearSummary,
    yearReadiness: yearReadiness,
    startNewYear: startNewYear,
    // School calendar → suggested windows
    schedulingRules: schedulingRules,
    setSchedulingRules: setSchedulingRules,
    calendarFor: calendarFor,
    saveCalendar: saveCalendar,
    applyCalendarDates: applyCalendarDates,
    suggestWindows: suggestWindows,
    calendarConflicts: calendarConflicts,
    calendarQueue: calendarQueue,
    readCalendarFile: readCalendarFile,
    requestNewYear: requestNewYear,
    yearRequest: yearRequest,
    openYearRequests: openYearRequests,
    yearNotice: yearNotice,
    dismissYearNotice: dismissYearNotice,
    renameGrade: renameGrade,
    renameSection: renameSection,
    setSchoolBoards: setSchoolBoards,
    // dev
    reset: reset,
    _dump: _dump,
  };
})();
