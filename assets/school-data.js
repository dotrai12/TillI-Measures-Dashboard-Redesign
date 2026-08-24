/* ============================================================
   Tilli Measures — DUMMY SCHOOL (single source of truth)
   ------------------------------------------------------------
   Purpose: one self-contained, fake dataset the whole prototype
   can read. Loaded as a plain <script> (NOT a module) so both the
   classic scripts (landing.js, parent.html inline) and the ES
   module (dashboard-data.js) can read it via `window.TILLI_SCHOOL`.

   >>> This is 100% dummy data. A developer will later replace the
   >>> object below with the real school's data / API response.

   ------------------------------------------------------------
   LOGIN CREDENTIALS (dummy)
   ------------------------------------------------------------
   PARENT  → priya.menon@example.com        / Tilli@Parent1
             Linked to 2 children in different grades:
               • Anaya Menon   — Kindergarten A — ADM-5001
               • Vivaan Menon  — Grade 1 A      — ADM-5101
   TEACHER → kavya.rao@littlesprouts.edu     / Tilli@Teacher1
             Class teacher of Kindergarten A.

   School to pick on the login screen: "Little Sprouts School"
   (Note: passwords are enforced ONLY for the accounts listed in
    `credentials` below. The pre-existing demo accounts
    parent@tilli.edu / teacher@tilli.edu still accept any password.)
   ============================================================ */
(function () {
  'use strict';

  // ---- deterministic RNG so scores are stable across reloads ----
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const bandOf = (pct) => (pct < 34 ? 'seedling' : pct < 67 ? 'sprouting' : 'blooming');

  // ---- the 12 measured skills (6 SEL + 6 cognitive) ----
  const SKILLS = [
    { key: 'emotion_awareness',     name: 'Emotion Awareness',     group: 'sel' },
    { key: 'emotion_regulation',    name: 'Emotion Regulation',    group: 'sel' },
    { key: 'empathy',               name: 'Empathy',               group: 'sel' },
    { key: 'relationship_skills',   name: 'Relationship Skills',   group: 'sel' },
    { key: 'metacognition',         name: 'Metacognition',         group: 'sel' },
    { key: 'critical_thinking',     name: 'Critical Thinking',     group: 'sel' },
    { key: 'working_memory',        name: 'Working Memory',        group: 'cog' },
    { key: 'planning',              name: 'Planning & Organizing', group: 'cog' },
    { key: 'cognitive_flexibility', name: 'Cognitive Flexibility', group: 'cog' },
    { key: 'inhibition_distraction',name: 'Focus (Distraction)',   group: 'cog' },
    { key: 'inhibition_response',   name: 'Self-control',          group: 'cog' },
    { key: 'attention',             name: 'Attention',             group: 'cog' },
  ];

  const WINDOWS = [
    { key: 'baseline', label: 'Baseline', sub: 'Start of year', date: 'Apr 2' },
    { key: 'mid',      label: 'Mid-year', sub: 'Week 8',        date: 'Jun 18' },
    { key: 'post',     label: 'End of year', sub: 'Week 14',    date: 'Sep 24' },
  ];

  const PERSPECTIVES = [
    { key: 'teacher', label: 'Teacher', icon: '👩‍🏫' },
    { key: 'parent',  label: 'Parent',  icon: '🏠' },
    { key: 'student', label: 'Student', icon: '🧒' },
  ];

  // ---- the school ----
  const SCHOOL = { id: 'little-sprouts', name: 'Little Sprouts School', city: 'Bengaluru', country: 'India', term: 'Term One' };

  // ---- 4 class teachers (one per section) ----
  const TEACHERS = [
    { id: 't-kga', name: 'Kavya Rao',      email: 'kavya.rao@littlesprouts.edu',      grade: 'Kindergarten', section: 'A', role: 'Class Teacher' },
    { id: 't-kgb', name: 'Nadia Fernando', email: 'nadia.fernando@littlesprouts.edu', grade: 'Kindergarten', section: 'B', role: 'Class Teacher' },
    { id: 't-g1a', name: 'Rohan Iyer',     email: 'rohan.iyer@littlesprouts.edu',     grade: 'Grade 1',      section: 'A', role: 'Class Teacher' },
    { id: 't-g1b', name: 'Dilani Perera',  email: 'dilani.perera@littlesprouts.edu',  grade: 'Grade 1',      section: 'B', role: 'Class Teacher' },
  ];

  // ---- roster: 24 students (12 per grade, 6 per section) ----
  // The linked parent (Priya Menon) owns the two `parentEmail: priya.menon@example.com` kids.
  const ROSTER = [
    // Kindergarten A
    { adm: 'ADM-5001', first: 'Anaya',  last: 'Menon',          grade: 'Kindergarten', section: 'A', gender: 'f', parentName: 'Priya Menon',        parentEmail: 'priya.menon@example.com' },
    { adm: 'ADM-5002', first: 'Ishaan', last: 'Sharma',         grade: 'Kindergarten', section: 'A', gender: 'm', parentName: 'Rahul Sharma',       parentEmail: 'rahul.sharma@example.com' },
    { adm: 'ADM-5003', first: 'Saanvi', last: 'Reddy',          grade: 'Kindergarten', section: 'A', gender: 'f', parentName: 'Latha Reddy',        parentEmail: 'latha.reddy@example.com' },
    { adm: 'ADM-5004', first: 'Sahan',  last: 'Perera',         grade: 'Kindergarten', section: 'A', gender: 'm', parentName: 'Dinesh Perera',      parentEmail: 'dinesh.perera@example.com' },
    { adm: 'ADM-5005', first: 'Aria',   last: 'Nair',           grade: 'Kindergarten', section: 'A', gender: 'f', parentName: 'Anjali Nair',        parentEmail: 'anjali.nair@example.com' },
    { adm: 'ADM-5006', first: 'Kabir',  last: 'Fernando',       grade: 'Kindergarten', section: 'A', gender: 'm', parentName: 'Shanika Fernando',   parentEmail: 'shanika.fernando@example.com' },
    // Kindergarten B
    { adm: 'ADM-5007', first: 'Diya',    last: 'Iyer',          grade: 'Kindergarten', section: 'B', gender: 'f', parentName: 'Meena Iyer',         parentEmail: 'meena.iyer@example.com' },
    { adm: 'ADM-5008', first: 'Reyansh', last: 'Gupta',         grade: 'Kindergarten', section: 'B', gender: 'm', parentName: 'Vikram Gupta',       parentEmail: 'vikram.gupta@example.com' },
    { adm: 'ADM-5009', first: 'Nethmi',  last: 'Silva',         grade: 'Kindergarten', section: 'B', gender: 'f', parentName: 'Chamari Silva',      parentEmail: 'chamari.silva@example.com' },
    { adm: 'ADM-5010', first: 'Vihaan',  last: 'Patel',         grade: 'Kindergarten', section: 'B', gender: 'm', parentName: 'Nikhil Patel',       parentEmail: 'nikhil.patel@example.com' },
    { adm: 'ADM-5011', first: 'Hasini',  last: 'Bandara',       grade: 'Kindergarten', section: 'B', gender: 'f', parentName: 'Nuwan Bandara',      parentEmail: 'nuwan.bandara@example.com' },
    { adm: 'ADM-5012', first: 'Aadhya',  last: 'Rao',           grade: 'Kindergarten', section: 'B', gender: 'f', parentName: 'Sneha Rao',          parentEmail: 'sneha.rao@example.com' },
    // Grade 1 A
    { adm: 'ADM-5101', first: 'Vivaan',  last: 'Menon',         grade: 'Grade 1', section: 'A', gender: 'm', parentName: 'Priya Menon',        parentEmail: 'priya.menon@example.com' },
    { adm: 'ADM-5102', first: 'Myra',    last: 'Joshi',         grade: 'Grade 1', section: 'A', gender: 'f', parentName: 'Kiran Joshi',        parentEmail: 'kiran.joshi@example.com' },
    { adm: 'ADM-5103', first: 'Dhruv',   last: 'Verma',         grade: 'Grade 1', section: 'A', gender: 'm', parentName: 'Pooja Verma',        parentEmail: 'pooja.verma@example.com' },
    { adm: 'ADM-5104', first: 'Senuri',  last: 'Jayawardena',   grade: 'Grade 1', section: 'A', gender: 'f', parentName: 'Ishara Jayawardena', parentEmail: 'ishara.jaya@example.com' },
    { adm: 'ADM-5105', first: 'Arjun',   last: 'Pillai',        grade: 'Grade 1', section: 'A', gender: 'm', parentName: 'Deepa Pillai',       parentEmail: 'deepa.pillai@example.com' },
    { adm: 'ADM-5106', first: 'Oshadi',  last: 'Wickramasinghe',grade: 'Grade 1', section: 'A', gender: 'f', parentName: 'Kasun Wickrama',     parentEmail: 'kasun.wickrama@example.com' },
    // Grade 1 B
    { adm: 'ADM-5107', first: 'Riya',     last: 'Das',          grade: 'Grade 1', section: 'B', gender: 'f', parentName: 'Sourav Das',         parentEmail: 'sourav.das@example.com' },
    { adm: 'ADM-5108', first: 'Ravindu',  last: 'Kumar',        grade: 'Grade 1', section: 'B', gender: 'm', parentName: 'Suresh Kumar',       parentEmail: 'suresh.kumar@example.com' },
    { adm: 'ADM-5109', first: 'Prisha',   last: 'Wijesinghe',   grade: 'Grade 1', section: 'B', gender: 'f', parentName: 'Malsha Wijesinghe',  parentEmail: 'malsha.wije@example.com' },
    { adm: 'ADM-5110', first: 'Neel',     last: 'Kapoor',       grade: 'Grade 1', section: 'B', gender: 'm', parentName: 'Ritu Kapoor',        parentEmail: 'ritu.kapoor@example.com' },
    { adm: 'ADM-5111', first: 'Amaya',    last: 'Rajapaksa',    grade: 'Grade 1', section: 'B', gender: 'f', parentName: 'Tharaka Rajapaksa',  parentEmail: 'tharaka.raja@example.com' },
    { adm: 'ADM-5112', first: 'Tharindu', last: 'Silva',        grade: 'Grade 1', section: 'B', gender: 'm', parentName: 'Ruwan Silva',        parentEmail: 'ruwan.silva@example.com' },
  ];

  // ---- sections (derived) ----
  // Kavya Rao (t-kga) is the demo's logged-in teacher and owns BOTH Kindergarten
  // sections (A + B) so the "Compare my sections" Insights tab has 2 same-grade
  // sections to compare. Nadia stays in TEACHERS but no longer owns a section.
  const SECTION_DEFS = [
    { id: 'kg_a', name: 'Kindergarten A', grade: 'Kindergarten', section: 'A', teacherId: 't-kga' },
    { id: 'kg_b', name: 'Kindergarten B', grade: 'Kindergarten', section: 'B', teacherId: 't-kga' },
    { id: 'g1_a', name: 'Grade 1 A',      grade: 'Grade 1',      section: 'A', teacherId: 't-g1a' },
    { id: 'g1_b', name: 'Grade 1 B',      grade: 'Grade 1',      section: 'B', teacherId: 't-g1b' },
  ];

  // Which teacher the demo dashboard opens as (the "selected" teacher).
  const ACTIVE_TEACHER_ID = 't-kga';

  // ---- assessment engine: per skill → baseline/mid/post + 3 perspectives ----
  // Seeded by admission number so every reload is identical.
  // `post` (current) is aligned to parent.html's name-seeded garden so the
  // parent dashboard and this dataset agree on the headline number.
  function currentSnapshot(first) {
    // Mirrors parent.html buildSkills(): base tilt + per-skill jitter.
    const rnd = mulberry32(hashStr(first + ':garden'));
    const base = 40 + rnd() * 26;
    const out = {};
    SKILLS.forEach((sk) => { out[sk.key] = Math.round(clamp(base + (rnd() - 0.5) * 60, 6, 98)); });
    return out;
  }

  function buildSkills(stu) {
    const post = currentSnapshot(stu.first);
    const rnd = mulberry32(hashStr(stu.adm + ':assess'));
    return SKILLS.map((sk) => {
      const p = post[sk.key];
      const growth = Math.round(rnd() * 22);                 // improvement since baseline
      const mid = clamp(p - Math.round(growth * 0.55), 2, 99);
      const pre = clamp(mid - Math.round(growth * 0.45), 2, 99);
      const teacher = clamp(p + Math.round((rnd() - 0.5) * 12), 2, 100);
      const parent  = clamp(p + Math.round((rnd() - 0.4) * 22), 2, 100);
      const student = clamp(p + Math.round((rnd() - 0.55) * 26), 2, 100);
      return {
        key: sk.key, name: sk.name, group: sk.group,
        pct: p, band: bandOf(p),
        baseline: pre, mid, post: p,
        teacher, parent, student,
        gap: Math.max(teacher, parent, student) - Math.min(teacher, parent, student),
      };
    });
  }

  // ---- assemble students with scores ----
  const STUDENTS = ROSTER.map((r) => {
    // Resolve the teacher through the section's owner (teacherId) rather than a
    // grade+section match, so a teacher who owns multiple sections is respected.
    const secDef = SECTION_DEFS.find((sd) => sd.grade === r.grade && sd.section === r.section);
    const teacher = secDef ? TEACHERS.find((t) => t.id === secDef.teacherId) : null;
    const skills = buildSkills(r);
    const overallPct = Math.round(skills.reduce((a, s) => a + s.pct, 0) / skills.length);
    return Object.assign({}, r, {
      name: r.first + ' ' + r.last,
      pronoun: r.gender === 'm' ? 'he' : 'she',
      teacherName: teacher ? teacher.name : '',
      overallPct, band: bandOf(overallPct),
      skills,
    });
  });

  // ---- school leadership (admin dashboard) ----
  // The Coordinator/Admin sees the whole school. Routed by email at login
  // (landing.js) to admin.html, the same way the teacher is routed to
  // teacher.html. A Principal (view-only) can be added here later with
  // role:'principal'; the admin dashboard already understands both roles.
  const ADMINS = [
    {
      id: 'a-coord',
      name: 'Meera Krishnan',
      email: 'meera.krishnan@littlesprouts.edu',
      password: 'Tilli@Admin1',
      role: 'coordinator',            // 'coordinator' (full) | 'principal' (view-only)
      title: 'Programme Coordinator',
    },
  ];

  // ---- the ONE parent that logs in, linked to 2 kids in different grades ----
  const PARENTS = [
    {
      name: 'Priya Menon',
      email: 'priya.menon@example.com',
      password: 'Tilli@Parent1',
      children: ['ADM-5001', 'ADM-5101'], // Anaya (KG A) + Vivaan (Grade 1 A)
    },
  ];

  // Convenience: children objects for a parent email (used by the parent view).
  function childrenForParent(email) {
    const e = String(email || '').toLowerCase();
    const p = PARENTS.find((x) => x.email.toLowerCase() === e);
    const admList = p ? p.children : STUDENTS.filter((s) => s.parentEmail.toLowerCase() === e).map((s) => s.adm);
    return admList.map((adm) => STUDENTS.find((s) => s.adm === adm)).filter(Boolean);
  }

  const findByAdm = (adm) => {
    const q = String(adm || '').trim().toUpperCase();
    return q ? STUDENTS.find((s) => s.adm.toUpperCase() === q) || null : null;
  };

  // Accounts + passwords the app should honour (email → password).
  const credentials = {
    parent:      { email: 'priya.menon@example.com',      password: 'Tilli@Parent1' },
    teacher:     { email: 'kavya.rao@littlesprouts.edu',  password: 'Tilli@Teacher1' },
    coordinator: { email: 'meera.krishnan@littlesprouts.edu', password: 'Tilli@Admin1' },
  };
  const passwords = {
    'priya.menon@example.com': 'Tilli@Parent1',
    'kavya.rao@littlesprouts.edu': 'Tilli@Teacher1',
    'meera.krishnan@littlesprouts.edu': 'Tilli@Admin1',
  };

  // email → admin record (used by landing.js to route leadership logins).
  const findAdmin = (email) => {
    const e = String(email || '').toLowerCase();
    return ADMINS.find((a) => a.email.toLowerCase() === e) || null;
  };

  window.TILLI_SCHOOL = {
    school: SCHOOL,
    skills: SKILLS, windows: WINDOWS, perspectives: PERSPECTIVES,
    teachers: TEACHERS, sections: SECTION_DEFS, students: STUDENTS,
    activeTeacherId: ACTIVE_TEACHER_ID,
    parents: PARENTS, admins: ADMINS, credentials, passwords,
    childrenForParent, findByAdm, findAdmin,
  };
})();
