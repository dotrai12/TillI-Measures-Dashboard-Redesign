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
  const bandOf = (pct) => (pct < 34 ? 'sprouting' : pct < 67 ? 'growing' : 'blooming');

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
    { key: 'mid',      label: 'Midline',  sub: 'Mid year',      date: 'Jun 18' },
    { key: 'post',     label: 'Endline',  sub: 'End of year',   date: 'Sep 24' },
  ];

  const PERSPECTIVES = [
    { key: 'teacher', label: 'Teacher', icon: '👩‍🏫' },
    { key: 'parent',  label: 'Parent',  icon: '🏠' },
    { key: 'student', label: 'Student', icon: '🧒' },
  ];

  // ---- the school ----
  // joinCode = the school code a self-registering teacher enters to verify
  // their school at sign-up (matches the code shown in the Platform Admin).
  // Two boards run side by side: `board` is the main one, `boards` lists all. With more than
  // one, invites ask for each teacher's board and the team table shows a Board column.
  const SCHOOL = { id: 'little-sprouts', name: 'Little Sprouts School', city: 'Bengaluru', country: 'India', term: 'Term One', joinCode: 'LSPR-2210',
    board: 'CBSE', boards: ['CBSE', 'IB'] };
  // Which board each section follows: sections D and E in every grade are the IB stream.
  const IB_SECTIONS = ['D', 'E'];
  const boardOf = (section) => (IB_SECTIONS.includes(section) ? 'IB' : 'CBSE');

  // ---- hand-written class teachers (more are generated with the placeholder sections below) ----
  const TEACHERS = [
    { id: 't-kga', name: 'Kavya Rao',      email: 'kavya.rao@littlesprouts.edu',      grade: 'Kindergarten', section: 'A', role: 'Class Teacher' },
    { id: 't-kgb', name: 'Nadia Fernando', email: 'nadia.fernando@littlesprouts.edu', grade: 'Kindergarten', section: 'B', role: 'Class Teacher' },
    { id: 't-g1a', name: 'Rohan Iyer',     email: 'rohan.iyer@littlesprouts.edu',     grade: 'Grade 1',      section: 'A', role: 'Class Teacher' },
    { id: 't-g1b', name: 'Dilani Perera',  email: 'dilani.perera@littlesprouts.edu',  grade: 'Grade 1',      section: 'B', role: 'Class Teacher' },
  ];

  // ---- roster: 24 hand-written students (6 per section); the school is padded to 6 × 5 × 30 below ----
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

  // ---- sections ----
  // Kavya Rao (t-kga) is the demo's logged-in teacher and owns BOTH Kindergarten
  // sections A + B so the "Compare my sections" Insights tab has 2 same-grade
  // sections to compare. Nadia stays in TEACHERS but doesn't own a section.
  const SECTION_DEFS = [
    { id: 'kg_a', name: 'Kindergarten A', grade: 'Kindergarten', section: 'A', teacherId: 't-kga', board: boardOf('A') },
    { id: 'kg_b', name: 'Kindergarten B', grade: 'Kindergarten', section: 'B', teacherId: 't-kga', board: boardOf('B') },
    { id: 'g1_a', name: 'Grade 1 A',      grade: 'Grade 1',      section: 'A', teacherId: 't-g1a', board: boardOf('A') },
    { id: 'g1_b', name: 'Grade 1 B',      grade: 'Grade 1',      section: 'B', teacherId: 't-g1b', board: boardOf('B') },
  ];

  // ---- placeholder school size: GRADES × SECTION_LETTERS × SECTION_SIZE ----
  // Generated (seeded, stable across reloads) so the demo school is a realistic
  // size: 6 grades × 5 sections × 30 children = 900 children, 30 sections.
  // The hand-written teachers, sections and 24 children above are untouched;
  // every generated section gets its own class teacher, every generated child
  // is flagged `filler: true`. Delete this block when the real roster arrives.
  const GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];
  const SECTION_SIZE = 30;
  const FILLER_GIRLS = ['Kiara', 'Navya', 'Tara', 'Meher', 'Ira', 'Siya', 'Anvi', 'Pari', 'Zara', 'Avni', 'Kavya', 'Ishita', 'Mahika', 'Rhea', 'Dinithi', 'Sanduni', 'Tharushi', 'Nisansala', 'Hiruni', 'Ama', 'Esha', 'Gauri', 'Larissa', 'Mira', 'Nila', 'Ojasvi', 'Pihu', 'Riddhi', 'Sara', 'Trisha', 'Uma', 'Vanya', 'Yashvi', 'Anika', 'Chathuri', 'Dulani', 'Ishara', 'Kaveesha', 'Lithmi', 'Methmi'];
  const FILLER_BOYS = ['Aarav', 'Advik', 'Ayaan', 'Krish', 'Rudra', 'Shaurya', 'Atharv', 'Kian', 'Veer', 'Yuvan', 'Hridaan', 'Laksh', 'Nihal', 'Om', 'Parth', 'Sehan', 'Kaveen', 'Thisal', 'Dinuka', 'Janith', 'Arnav', 'Darsh', 'Eshan', 'Harsh', 'Jai', 'Manav', 'Neil', 'Pranav', 'Rehan', 'Samar', 'Tanay', 'Udit', 'Vedant', 'Yash', 'Chamod', 'Hasith', 'Isuru', 'Lahiru', 'Minul', 'Ravin'];
  const FILLER_LASTS = ['Agarwal', 'Bhat', 'Chopra', 'Desai', 'Ghosh', 'Hegde', 'Kulkarni', 'Mehta', 'Naidu', 'Rao', 'Shetty', 'Thomas', 'Varma', 'Abeysekara', 'Dissanayake', 'Gunawardena', 'Herath', 'Karunaratne', 'Liyanage', 'Mendis', 'Ranasinghe', 'Senanayake', 'Weerasinghe', 'Kumara'];
  const FILLER_PARENTS = ['Anil', 'Bhavna', 'Chitra', 'Deepak', 'Geetha', 'Harini', 'Imran', 'Jaya', 'Kamal', 'Lalitha', 'Manoj', 'Nirmala', 'Prakash', 'Radha', 'Sanjay', 'Thilini', 'Upul', 'Vasanthi'];
  const FILLER_TEACHER_FIRSTS = ['Anita', 'Bharathi', 'Chandrika', 'Deepa', 'Farah', 'Gayathri', 'Hema', 'Indira', 'Jyothi', 'Kamala', 'Leela', 'Madhavi', 'Nalini', 'Padma', 'Revathi', 'Sharmila', 'Tanuja', 'Usha', 'Vidya', 'Arjun', 'Bhaskar', 'Dilan', 'Ganesh', 'Kasun', 'Mohan', 'Nimal', 'Ravi', 'Suresh'];
  (function padSchool() {
    const rnd = mulberry32(hashStr('filler-roster'));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const slug = (g) => (g === 'Kindergarten' ? 'kg' : 'g' + g.split(' ')[1]);
    // 1) sections + their class teachers
    const usedTeacher = new Set(TEACHERS.map((t) => t.name));
    GRADES.forEach((grade) => SECTION_LETTERS.forEach((section) => {
      if (SECTION_DEFS.some((sd) => sd.grade === grade && sd.section === section)) return;
      const id = slug(grade) + '_' + section.toLowerCase();
      let name; do { name = pick(FILLER_TEACHER_FIRSTS) + ' ' + pick(FILLER_LASTS); } while (usedTeacher.has(name));
      usedTeacher.add(name);
      const tid = 't-' + id.replace('_', '');
      TEACHERS.push({ id: tid, name, email: name.toLowerCase().replace(/\s+/g, '.') + '@littlesprouts.edu', grade, section, role: 'Class Teacher', filler: true });
      SECTION_DEFS.push({ id, name: grade + ' ' + section, grade, section, teacherId: tid, board: boardOf(section) });
    }));
    // 2) children: pad every section to SECTION_SIZE (unique full names; ADM per grade from 6001, 7001, …)
    const usedName = new Set(ROSTER.map((r) => r.first + ' ' + r.last));
    const nextAdm = {}; GRADES.forEach((g, i) => { nextAdm[g] = 6001 + i * 1000; });
    SECTION_DEFS.forEach(({ grade, section }) => {
      let have = ROSTER.filter((r) => r.grade === grade && r.section === section).length;
      while (have < SECTION_SIZE) {
        const gender = rnd() < 0.5 ? 'f' : 'm';
        let first, last;
        do { first = pick(gender === 'f' ? FILLER_GIRLS : FILLER_BOYS); last = pick(FILLER_LASTS); } while (usedName.has(first + ' ' + last));
        usedName.add(first + ' ' + last);
        const adm = 'ADM-' + nextAdm[grade]++;
        ROSTER.push({ adm, first, last, grade, section, gender,
          parentName: pick(FILLER_PARENTS) + ' ' + last,
          parentEmail: 'parent.' + adm.toLowerCase() + '@example.com', filler: true });
        have++;
      }
    });
  })();

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

  // ---- demo class mix: some classes mostly Blooming, some mostly Sprouting ----
  // Without this every child averages out to Growing and every class looks alike.
  // A per-grade + per-section tilt (score points) shifts the placeholder children
  // only; the 24 hand-written children keep their scores (parent.html agrees with
  // them) and Kindergarten A — the teacher demo's class — stays untilted.
  // Rough guide: tilt ≥ +14 → mostly Blooming, ≤ −20 → mostly Sprouting.
  const GRADE_TILT = { 'Kindergarten': 0, 'Grade 1': 8, 'Grade 2': -8, 'Grade 3': 14, 'Grade 4': -14, 'Grade 5': 4 };
  const SECTION_TILTS = [24, 0, -22, 10, -8];   // rotated per grade so it isn't always section A that blooms
  function classTilt(grade, section) {
    if (grade === 'Kindergarten' && section === 'A') return 0;
    const gi = GRADES.indexOf(grade), si = SECTION_LETTERS.indexOf(section);
    if (gi < 0 || si < 0) return 0;
    return (GRADE_TILT[grade] || 0) + SECTION_TILTS[(si + gi * 2) % SECTION_TILTS.length];
  }

  function buildSkills(stu) {
    // Placeholder kids seed by admission no. (first names can repeat across the pools).
    const post = currentSnapshot(stu.filler ? stu.adm : stu.first);
    const tilt = stu.filler ? classTilt(stu.grade, stu.section) : 0;
    const rnd = mulberry32(hashStr(stu.adm + ':assess'));
    return SKILLS.map((sk) => {
      const p = clamp(post[sk.key] + tilt, 2, 99);
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
  // teacher.html. School roles are Teacher, School admin and School group
  // admin only — there is no Principal / view-only role.
  const ADMINS = [
    {
      id: 'a-coord',
      name: 'Meera Krishnan',
      email: 'meera.krishnan@littlesprouts.edu',
      password: 'Tilli@Admin1',
      role: 'coordinator',            // 'coordinator' (School admin) | 'tilli' (full, internal)
      title: 'Programme Coordinator',
    },
    {
      // Tilli's own team — internal staff who log in to view a partner school.
      // Full (coordinator-level) access; the admin dashboard treats 'tilli'
      // like a coordinator but shows a "Tilli Team" badge.
      id: 'a-tilli',
      name: 'Tilli Team',
      email: 'team@tilli.org',
      password: 'Tilli@Team1',
      role: 'tilli',
      title: 'Tilli Team',
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
    tilli:       { email: 'team@tilli.org',               password: 'Tilli@Team1' },
  };
  const passwords = {
    'priya.menon@example.com': 'Tilli@Parent1',
    'kavya.rao@littlesprouts.edu': 'Tilli@Teacher1',
    'meera.krishnan@littlesprouts.edu': 'Tilli@Admin1',
    'team@tilli.org': 'Tilli@Team1',
  };

  // email → admin record (used by landing.js to route leadership logins).
  const findAdmin = (email) => {
    const e = String(email || '').toLowerCase();
    return ADMINS.find((a) => a.email.toLowerCase() === e) || null;
  };

  // ---- past classes (multi-year history) ----
  // Earlier school years a student spent at this school, oldest first. Each year
  // carries the class, the teacher, how many of its 3 assessment windows were
  // completed, every skill's [start-of-year, end-of-year] score (0–100), and the
  // teacher's end-of-year handover note. Only Anaya Menon (KG-A) has history in
  // the demo; every other student simply has none yet.
  const PAST_CLASSES = {
    'ADM-5001': [
      {
        year: '2024–25', grade: 'Nursery', section: 'A', teacher: 'Shalini Das', windowsDone: 3,
        skills: {
          emotion_awareness: [3, 8],    emotion_regulation: [6, 12],  empathy: [13, 20],
          relationship_skills: [15, 24], metacognition: [11, 18],     critical_thinking: [22, 30],
          working_memory: [12, 19],     planning: [24, 33],           cognitive_flexibility: [5, 10],
          inhibition_distraction: [19, 28], inhibition_response: [14, 22], attention: [13, 21],
        },
        note: 'Anaya took a few weeks to settle but now joins circle time happily. She loves puzzles and block play, and stays with a task much longer than at the start of the year. Naming her own feelings is still hard; she tends to go quiet when upset. Picture cards for feelings helped a lot.',
      },
      {
        year: '2025–26', grade: 'Pre-K', section: 'B', teacher: 'Farah Qureshi', windowsDone: 3,
        skills: {
          emotion_awareness: [10, 19],  emotion_regulation: [15, 24], empathy: [22, 33],
          relationship_skills: [27, 39], metacognition: [21, 31],     critical_thinking: [33, 46],
          working_memory: [22, 32],     planning: [36, 51],           cognitive_flexibility: [12, 20],
          inhibition_distraction: [31, 48], inhibition_response: [27, 41], attention: [24, 36],
        },
        note: 'A big year for friendships: Anaya now invites others into her games and takes turns well. Planning and focus are real strengths. Big feelings still come out as tears at transitions; a two-minute warning before changing activity works well. Keep building her feelings vocabulary.',
      },
    ],
  };
  const pastClassesFor = (adm) => (PAST_CLASSES[String(adm || '').toUpperCase()] || []).slice();

  window.TILLI_SCHOOL = {
    school: SCHOOL,
    skills: SKILLS, windows: WINDOWS, perspectives: PERSPECTIVES,
    teachers: TEACHERS, sections: SECTION_DEFS, students: STUDENTS,
    activeTeacherId: ACTIVE_TEACHER_ID,
    parents: PARENTS, admins: ADMINS, credentials, passwords,
    childrenForParent, findByAdm, findAdmin, pastClassesFor,
  };
})();
