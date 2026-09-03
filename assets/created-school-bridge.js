/* ============================================================
   Tilli Measures — Created-school bridge
   ------------------------------------------------------------
   Makes the FULL leadership dashboard (admin-data.js + admin.js)
   run on a school created through the Add-School wizard, using
   only local data (TilliAPI, backed by localStorage).

   admin-data.js derives the entire dashboard from a single global,
   window.TILLI_SCHOOL, whose students carry per-skill
   baseline/mid/post + teacher/parent/student scores. A created
   school has a real roster in TilliAPI but no such scores, so here
   we synthesise a TILLI_SCHOOL-shaped object from TilliAPI (roster,
   sections, staff) + auto-generated SEL outcomes, and install it in
   place of the demo school BEFORE admin-data.js reads it.

   Load order (admin.html):
     school-data.js  → tilli-api.js → THIS → admin-data.js → admin.js

   For the demo school this file is a no-op (the demo TILLI_SCHOOL
   is left untouched). window.TILLI_CREATED signals downstream code
   (admin-data.js, admin.js) that the real assessment lifecycle —
   not the demo lifecycle dropdown — governs which points are shown.
   ============================================================ */
(function () {
  'use strict';

  var API = window.TilliAPI;
  if (!API || !API.resolveSchool) return;

  var qp = new URLSearchParams(location.search);
  var schoolParam = qp.get('school');
  if (!schoolParam) return;

  var sc = API.resolveSchool(schoolParam);
  // Only bridge wizard-created schools. The demo school keeps its own dataset.
  if (!sc || sc.source !== 'created') return;

  // Reuse the demo's canonical catalogues (the 12 skills, assessment windows,
  // rater perspectives). Created schools measure the same skills.
  var DEMO = window.TILLI_SCHOOL || {};
  var SKILLS = DEMO.skills || [];
  var WINDOWS = DEMO.windows || [];
  var PERSPECTIVES = DEMO.perspectives || [];
  if (!SKILLS.length) return;   // demo catalogue missing — leave the demo school in place

  var id = sc.school_id;

  // Generate (once) + persist local SEL scores, and read the REAL point lifecycle.
  var outcomes = API.outcomesForSchool(id, SKILLS);   // { student_id: [skill,...] }
  var pointStatus = API.pointStatusFor(id);           // { baseline|midline|endline: status }

  var apiStudents = API.studentsForSchool(id);
  var apiSections = API.sectionsForSchool(id);
  var apiStaff    = API.staffFor(id);

  // ---- teachers (staff → demo teacher shape). Email doubles as the id. ----
  var teachers = apiStaff.filter(function (u) { return u.role === 'teacher'; }).map(function (u, i) {
    var sec = apiSections.filter(function (s) { return s.section_id === u.section_id; })[0] || {};
    return { id: u.email || ('t-' + i), name: u.name, email: u.email || '',
      grade: sec.grade || '', section: sec.section || '', role: 'Class Teacher' };
  });

  // ---- sections (→ demo shape; teacherId = owning teacher's id/email) ----
  var sections = apiSections.map(function (s) {
    var owner = apiStaff.filter(function (u) { return u.role === 'teacher' && u.section_id === s.section_id; })[0];
    return { id: s.section_id, name: s.name || ((s.grade + ' ' + (s.section || '')).trim()),
      grade: s.grade, section: s.section, teacherId: owner ? (owner.email || null) : null };
  });

  // ---- students (→ demo shape, with generated .skills) ----
  var students = apiStudents.map(function (s) {
    var skills = outcomes[s.student_id] || [];
    var overallPct = skills.length ? Math.round(skills.reduce(function (a, x) { return a + x.pct; }, 0) / skills.length) : 0;
    var secDef = sections.filter(function (x) { return x.id === s.section_id; })[0] || {};
    var owner = teachers.filter(function (t) { return t.id === secDef.teacherId; })[0];
    return Object.assign({}, s, {
      adm: s.student_id,
      name: s.name || ((s.first || '') + ' ' + (s.last || '')).trim(),
      pronoun: s.gender === 'm' ? 'he' : 'she',
      teacherName: owner ? owner.name : '',
      overallPct: overallPct, band: '',
      skills: skills,
    });
  });

  // ---- admins: the school coordinator + whoever is logged in, so the full
  //      dashboard's identity lookup (TS.findAdmin) resolves to a coordinator. ----
  var coord = apiStaff.filter(function (u) { return u.role === 'coordinator'; })[0];
  var admins = [];
  if (coord) admins.push({ id: 'a-coord', name: coord.name, email: coord.email || '', role: 'coordinator', title: 'Coordinator' });
  var loginEmail = String(qp.get('email') || '').toLowerCase();
  if (loginEmail && !admins.some(function (a) { return a.email.toLowerCase() === loginEmail; }))
    admins.push({ id: 'a-you', name: (coord && coord.name) || 'Coordinator', email: loginEmail, role: 'coordinator', title: 'Coordinator' });
  if (!admins.length) admins.push({ id: 'a-coord', name: 'Coordinator', email: '', role: 'coordinator', title: 'Coordinator' });

  function childrenForParent(email) {
    var e = String(email || '').toLowerCase();
    return students.filter(function (s) { return String(s.parentEmail || '').toLowerCase() === e; });
  }
  function findByAdm(adm) {
    var q = String(adm || '').trim().toUpperCase();
    return students.filter(function (s) { return String(s.adm).toUpperCase() === q; })[0] || null;
  }
  function findAdmin(email) {
    var e = String(email || '').toLowerCase();
    return admins.filter(function (a) { return a.email.toLowerCase() === e; })[0] || admins[0] || null;
  }

  // ---- install as the dashboard's source of truth ----
  window.TILLI_SCHOOL = {
    school: { id: id, name: sc.name, city: sc.city || '', country: sc.country || '', term: sc.term || 'Term One' },
    skills: SKILLS, windows: WINDOWS, perspectives: PERSPECTIVES,
    teachers: teachers, sections: sections, students: students,
    activeTeacherId: teachers[0] ? teachers[0].id : null,
    parents: [], admins: admins, credentials: {}, passwords: {},
    childrenForParent: childrenForParent, findByAdm: findByAdm, findAdmin: findAdmin,
  };
  // Signals the full dashboard to use the REAL lifecycle (deploy + completion),
  // not the demo lifecycle dropdown, and to blank the hardcoded demo concern queue.
  window.TILLI_CREATED = { schoolId: id, pointStatus: pointStatus };
})();
