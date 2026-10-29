/* ============================================================
   Tilli Measures — teacher onboarding / self-reflection flow
   intro → demographics (4 steps) → greeting → self-assessment
        → profile done → add students → enter garden
   One-time and mandatory: the dashboard stays locked until a teacher has
   finished it once (TeacherStore `onboarded`). The reflection questions come
   from the shared bank in TilliAPI (editable in the Platform Admin).
   Vanilla state machine (no framework), rendered into #onb-root.
   Ported from the "Teacher Dashboard" prototype into the live
   design system. Phase 1 = onboarding; the dashboard slots in at
   finishOnboard() later.
   ============================================================ */
(function () {
  'use strict';

  // ---------- persistence (demo: localStorage; swap these 4 fns for an API) ----------
  // The whole onboarding payload for a teacher is stored under one key, so a
  // developer can replace load/save with a couple of fetch() calls later.
  const STORE_PREFIX = 'tilliMeasures.teacher.';
  const TeacherStore = {
    key(email) { return STORE_PREFIX + String(email || 'anon').toLowerCase(); },
    load(email) {
      try { return JSON.parse(localStorage.getItem(this.key(email)) || 'null'); }
      catch (e) { return null; }
    },
    save(email, data) {
      try { localStorage.setItem(this.key(email), JSON.stringify(data)); } catch (e) {}
    },
    isOnboarded(email) { const d = this.load(email); return !!(d && d.onboarded); },
  };

  // ---------- content (self-report questions + option banks) ----------
  // The reflection bank (Tilli Pre-Training Teacher Self Report — 5 sections)
  // lives in TilliAPI so the Platform Admin can edit it without a rebuild.
  // CATS = [{ id, name, color }]; SELF = questions with `cat` resolved to an
  // index into CATS. Answers are keyed by question id (see answerKey).
  const REFLECTION = (function () {
    try { if (window.TilliAPI && window.TilliAPI.getReflectionConfig) return window.TilliAPI.getReflectionConfig(); }
    catch (e) {}
    return { cats: [], questions: [] };
  })();
  const CATS = REFLECTION.cats || [];
  const SELF = (REFLECTION.questions || []).map((q) =>
    Object.assign({}, q, { cat: Math.max(0, CATS.findIndex((c) => c.id === q.cat)) }));
  const answerKey = (i) => (SELF[i] ? SELF[i].id : String(i));
  // Answers saved before the bank moved to TilliAPI were keyed by array index
  // (0–9). Re-key them onto the original 10 question ids.
  const LEGACY_IDS = ['q01', 'q02', 'q03', 'q04', 'q05', 'q06', 'q07', 'q08', 'q09', 'q10'];
  function migrateAnswers(a) {
    if (!a) return {};
    if (!Object.keys(a).some((k) => /^\d+$/.test(k))) return a;
    const out = {};
    Object.keys(a).forEach((k) => { out[/^\d+$/.test(k) && LEGACY_IDS[+k] ? LEGACY_IDS[+k] : k] = a[k]; });
    return out;
  }

  const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
  const EDU_LEVELS = ['High school', 'Diploma / Certificate', "Bachelor's degree", "Master's degree", 'Doctorate'];
  const RES_SUFF = ['Not sufficient', 'Somewhat sufficient', 'Mostly sufficient', 'Fully sufficient'];
  const DEMO_GRADES = ['Pre-school', 'Pre-Kindergarten', 'UKG', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  const DEMO_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const DEMO_SUBJECTS = ['Language', 'Mathematics', 'Science', 'Social-Emotional Learning (SEL)', 'Art', 'Other'];
  const DEMO_RESOURCES = ['Books', 'Internet', 'Smartphone', 'Laptop / Computer', 'Projector', 'Smart board', 'Teaching materials', 'Other'];
  const COUNTRIES = [
    { name: 'India', flag: '🇮🇳', cities: ['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi', 'Lucknow', 'Chandigarh'] },
    { name: 'Sri Lanka', flag: '🇱🇰', cities: ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Kurunegala', 'Matara', 'Batticaloa'] },
    { name: 'Bangladesh', flag: '🇧🇩', cities: ['Dhaka', 'Chattogram', 'Khulna', 'Sylhet', 'Rajshahi'] },
    { name: 'Nepal', flag: '🇳🇵', cities: ['Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar'] },
    { name: 'Pakistan', flag: '🇵🇰', cities: ['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Peshawar'] },
    { name: 'United Arab Emirates', flag: '🇦🇪', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'] },
    { name: 'Singapore', flag: '🇸🇬', cities: ['Singapore'] },
    { name: 'United States', flag: '🇺🇸', cities: ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Boston', 'Seattle'] },
    { name: 'United Kingdom', flag: '🇬🇧', cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Edinburgh'] },
    { name: 'Australia', flag: '🇦🇺', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'] },
    { name: 'Canada', flag: '🇨🇦', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'] },
    { name: 'Kenya', flag: '🇰🇪', cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'] },
  ];
  // Five brand ring/petal colours — the one copy lives in TilliPalette (tilli-api.js).
  const PETAL_COLORS = (window.TilliPalette && window.TilliPalette.RING_PETALS) || [];
  // Padlock on read-only fields; colour comes from .onb-locked svg (currentColor).
  const LOCK_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.4" fill="currentColor"></rect><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" stroke-width="2"></path></svg>';

  // ---------- URL context (passed from the landing signup flow) ----------
  const params = new URLSearchParams(location.search);
  const ctx = {
    school: params.get('school') || 'Little Sprouts School',
    email: (params.get('email') || '').trim(),
    isNew: params.get('new') === '1',
  };

  // ---------- state ----------
  const blankDemo = () => ({
    step: 1, name: '', gender: '', age: '', years: '', edu: '',
    school: ctx.school, country: '', city: '', countryOpen: false, cityOpen: false,
    gradesSel: {}, secs: {}, subjects: {}, resSuff: '', resources: {},
    // "My class isn't here": the open form + what was sent to the school admin.
    askOpen: false, askGrade: '', askOther: false, askSection: '', askNote: '', classAsked: false,
  });
  // `students` holds structured records { first, last, adm, grade, section, uid }
  // (not display strings) so each add can run through the dedupe guard — the
  // committed set the garden reads. Legacy one-by-one fields (first/last/adm/
  // note) are kept for the old single-add path.
  // `groups` is the editable sheet: grade·section is picked ONCE per group, and
  // each group lists its students [{ first, last, adm }]. `issues` flags rows the
  // dedupe guard bounced on the last commit, keyed 'g-i'.
  const blankRoster = () => ({ method: null, grade: '', first: '', last: '', adm: '', groups: [], students: [], note: null, issues: {}, csvMsg: '', picMsg: '' });

  const state = {
    phase: 'intro',   // intro | demo | greet | assess | done | roster | complete
    openSelect: null, // id of the currently-open custom dropdown (only one at a time)
    onboarded: false, // true once the one-time setup has been completed
    joinedAt: null,   // first completion (ISO) — "Joined Tilli Measures" on the profile
    observations: {}, // { [windowKey]: { [adm]: { ratings, at } } } — teacher observations
    // Unfinished observations, saved on every rating tap so an interrupted child
    // resumes where the teacher left off. Same shape as `observations`; an entry
    // is removed once that child's observation is finished.
    obsDrafts: {},
    // Every completed reflection, oldest first — the Teaching Mirror timeline.
    // { id, kind: 'pre' | 'post' | 'retake', label, at (ISO), answers }
    reflections: [],
    reflectOnly: null, // { kind, label, prevAnswers } while re-taking just the reflection
    replaying: false,  // "Redo reflection" (full setup replay) in progress
    startNav: null,    // dashboard page to open on the next mount (e.g. 'profile')
    selfQ: 0,
    selfAnswers: {},
    demo: blankDemo(),
    roster: blankRoster(),
  };

  const root = document.getElementById('onb-root');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  function set(patch) { Object.assign(state, patch); render(); }
  function setDemo(patch) { state.demo = Object.assign({}, state.demo, patch); render(); }
  function setRoster(patch) { state.roster = Object.assign({}, state.roster, patch); render(); }

  // Guards the one-time dashboard mount. Declared here (not next to
  // enterDashboard) so boot() below can call enterDashboard without a TDZ error.
  // `dashboardRosterSig` remembers which roster the mounted dashboard was built
  // from, so returning to add students (empty-state CTA) re-mounts with the new kids.
  let dashboardMounted = false;
  let dashboardRosterSig = null;
  function rosterSig() {
    try { return (state.roster.students || []).map((s) => (s.adm || '') + '|' + s.first + '|' + s.last).join(','); }
    catch (e) { return ''; }
  }

  // ---------- invite / platform context ----------
  // When a teacher was invited into a created school, the Tilli platform already
  // knows their name, their school (with city/country) and the grades/sections
  // they were provisioned for. We pull that here to pre-fill onboarding so they
  // only confirm/adjust, and to seed their garden with students already on file.
  const INVITE = (function () {
    if (!window.TilliAPI) return null;
    const school = window.TilliAPI.resolveSchool ? window.TilliAPI.resolveSchool(ctx.school) : null;
    const acct = (window.TilliAPI.getAccount && ctx.email) ? window.TilliAPI.getAccount(ctx.email) : null;
    if (!school && !acct) return null;
    let sections = [];
    try { if (window.TilliAPI.sectionsForTeacher && school) sections = window.TilliAPI.sectionsForTeacher(ctx.email, school.school_id) || []; } catch (e) {}
    return { school: school || null, acct: acct || null, sections: sections };
  })();

  // ---------- school structure (Platform Admin provisioning) ----------
  // The grades/sections a school was set up with on the platform. The demographic
  // step must only offer THESE — a teacher cannot claim to teach a grade/section
  // the school doesn't have. Built from the school's own section records, so
  // renamed grades ("Sunflowers") and sections ("Rose") come through as named,
  // ordered by their fixed base grade (Nursery → Grade 12). Keys stay `gi` (index
  // into GRADES) and `gi-<section name>`. Null only when we have no school on file
  // (standalone demo), in which case we fall back to DEMO_GRADES / DEMO_SECTIONS.
  // A real school with no classes yet gets an empty list — the teacher can only
  // ask their school admin to add their class.
  const NO_CLASSES = { grades: [], secsByGi: {} };
  const SCHOOL_STRUCT = (function () {
    const A = window.TilliAPI;
    if (!INVITE || !INVITE.school || !A || !A.sectionsForSchool) return null;
    let secs = [];
    try { secs = A.sectionsForSchool(INVITE.school.school_id) || []; } catch (e) { return NO_CLASSES; }
    if (!secs.length) return NO_CLASSES;
    const bases = A.BASE_GRADES || [];
    const baseRank = (s) => { const i = bases.indexOf(s.base_grade || (A.baseGradeOf ? A.baseGradeOf(INVITE.school.school_id, s.grade) : '')); return i < 0 ? 999 : i; };
    const letterOf = (s) => String(s.base_section || s.section || '');
    const grades = [], rank = {}, secsByName = {};
    secs.forEach(function (s) {
      const g = String(s.grade || '').trim(); if (!g) return;
      if (grades.indexOf(g) < 0) { grades.push(g); rank[g] = baseRank(s); }
      const sx = String(s.section || '').trim(); if (!sx) return;
      (secsByName[g] = secsByName[g] || []);
      if (!secsByName[g].some((x) => x.name === sx)) secsByName[g].push({ name: sx, letter: letterOf(s) });
    });
    if (!grades.length) return NO_CLASSES;
    grades.sort((a, b) => (rank[a] - rank[b]) || a.localeCompare(b));
    const secsByGi = {};
    grades.forEach((g, gi) => { secsByGi[gi] = (secsByName[g] || []).sort((a, b) => a.letter.localeCompare(b.letter)).map((x) => x.name); });
    return { grades: grades, secsByGi: secsByGi };
  })();
  // The grade list the sign-up step offers: the school's own, else the demo ladder.
  const GRADES = SCHOOL_STRUCT ? SCHOOL_STRUCT.grades : DEMO_GRADES;

  // Grade indices (into GRADES) the teacher may pick from, and the sections
  // allowed under a given grade. Fall back to the full demo universe when the
  // school has no structure on file.
  function allowedGradeIdx() { return GRADES.map((_, i) => i); }
  function allowedSecs(gi) { return SCHOOL_STRUCT ? (SCHOOL_STRUCT.secsByGi[gi] || []) : DEMO_SECTIONS; }

  // ---------- base grades (display only) ----------
  // A school can rename "Grade 1" → "Sunflowers"; labels keep the school's name
  // and add the fixed base in brackets when it differs. Values / keys stay raw.
  const SCHOOL_ID = INVITE && INVITE.school ? INVITE.school.school_id : null;
  const sameName = (a, b) => String(a || '').toLowerCase().replace(/\s+/g, '') === String(b || '').toLowerCase().replace(/\s+/g, '');
  function gradeShown(grade) { const A = window.TilliAPI; return A && A.gradeLabel ? A.gradeLabel(SCHOOL_ID, grade) : String(grade || ''); }
  function secBase(grade, sx) { const A = window.TilliAPI; return A && A.sectionBase && grade ? A.sectionBase(SCHOOL_ID, grade, sx || '') : ''; }
  // Section letter on its own ("A", or "Rose (Grade 1A)").
  function sxShown(grade, sx) { const b = secBase(grade, sx); return b && !sameName(b, grade + sx) ? sx + ' (' + b + ')' : sx; }
  // "Grade 1 · Section A" picker value → its label.
  function gsShown(gs) {
    if (!gs) return gs;
    const p = splitGS(gs), b = p[1] ? secBase(p[0], p[1]) : '';
    if (!p[1]) return gradeShown(p[0]);
    return b && !sameName(b, p[0] + p[1]) ? gs + ' (' + b + ')' : gs;
  }

  // Pre-fill the demographic step from what the platform already knows. Every
  // field stays editable — the teacher just checks and changes anything wrong.
  function prefillDemo(d) {
    if (!INVITE) return d;
    if (INVITE.acct && INVITE.acct.name) d.name = INVITE.acct.name;
    if (INVITE.school) {
      d.school = INVITE.school.name || d.school;
      if (INVITE.school.country) d.country = INVITE.school.country;
      if (INVITE.school.city) d.city = INVITE.school.city;
    }
    // Grades + sections: prefer the teacher's provisioned sections, else the
    // single grade/section carried on their invite. Map grade names → GRADES;
    // unrecognised grades are simply left for the teacher to pick.
    const pairs = (INVITE.sections || []).map((s) => [s.grade, s.section]);
    if (!pairs.length && INVITE.acct && INVITE.acct.grade) pairs.push([INVITE.acct.grade, INVITE.acct.section]);
    pairs.forEach(function (p) {
      const gi = GRADES.findIndex((x) => x.toLowerCase() === String(p[0] || '').toLowerCase());
      if (gi < 0) return;
      d.gradesSel[gi] = true;
      const sx = p[1] ? allowedSecs(gi).find((x) => x.toLowerCase() === String(p[1]).toLowerCase()) : '';
      if (sx) d.secs[gi + '-' + sx] = true;
    });
    return d;
  }

  // Students the platform already has for this teacher, mapped into the
  // onboarding roster shape so the garden is populated on day one. Only the
  // teacher's own classes: the ones they were invited into, or (self-sign-up)
  // the grade · section picks from step 3 — never the whole school.
  function platformRoster(picks) {
    try {
      if (!INVITE || !INVITE.school || !window.TilliAPI.studentsForSchool) return {};
      const secIds = (INVITE.sections || []).map((s) => s.section_id);
      const want = picks || [];
      if (!secIds.length && !want.length) return {};
      let studs = window.TilliAPI.studentsForSchool(INVITE.school.school_id) || [];
      studs = studs.filter((s) => (want.length
        ? want.indexOf((s.grade || '') + ' · Section ' + (s.section || '')) >= 0
        : secIds.indexOf(s.section_id) >= 0));
      const rows = studs.map(function (s) {
        const parts = String(s.name || '').trim().split(' ');
        return {
          gs: (s.grade || '') + (s.section ? ' · Section ' + s.section : ''),
          first: s.first || parts[0] || '', last: s.last || parts.slice(1).join(' ') || '',
          adm: s.adm || s.student_id || '',
        };
      });
      return rows.length ? { groups: rowsToGroups(rows) } : {};
    } catch (e) { return {}; }
  }

  // ---------- the school's own records (API schools) ----------
  // Observations are kept per school year, so a new year starts clean and last
  // year's ratings aren't shown as this year's Baseline.
  const YEAR_ID = (function () {
    try {
      const A = window.TilliAPI;
      if (!SCHOOL_ID || !A || !A.yearsFor) return 'default';
      const cur = (A.yearsFor(SCHOOL_ID) || []).find((y) => y.status === 'current');
      return cur ? cur.id : 'default';
    } catch (e) { return 'default'; }
  })();
  // This teacher's classes and children as the school has them now — so admin
  // changes (placements, new children, children who left, promotions) reach the
  // dashboard. Null when the teacher isn't a member of an API school (standalone
  // demo), which keeps their own saved roster.
  function schoolClasses() {
    const A = window.TilliAPI;
    if (!SCHOOL_ID || !A || !A.roleOf || A.roleOf(ctx.email, SCHOOL_ID) !== 'teacher') return null;
    const secs = A.sectionsForTeacher(ctx.email, SCHOOL_ID) || [];
    const ids = secs.map((x) => x.section_id);
    const students = (A.studentsForSchool(SCHOOL_ID) || []).filter((x) => ids.indexOf(x.section_id) >= 0).map((x) => {
      const parts = String(x.name || '').trim().split(' ');
      return { first: x.first || parts[0] || '', last: x.last || parts.slice(1).join(' ') || '', adm: x.student_id || x.adm || '',
        grade: x.grade || '', section: x.section || '', uid: x.uid || null };
    });
    return { sections: secs.map((x) => ({ grade: x.grade, section: x.section })), students };
  }

  // ---------- boot: resume or start ----------
  // Older saves stored the sheet as flat rows with a per-row `gs`; regroup them.
  function rowsToGroups(rows) {
    const by = {}, order = [];
    (rows || []).forEach((r) => {
      const gs = r.gs || '';
      if (!by[gs]) { by[gs] = { gs, rows: [] }; order.push(gs); }
      by[gs].rows.push({ first: r.first || '', last: r.last || '', adm: r.adm || '' });
    });
    return order.map((gs) => by[gs]);
  }
  // Entering "Add your students": drop sheet groups for classes the teacher no
  // longer picks, and pre-fill the picked classes the sheet doesn't have yet.
  function syncRosterToPicks() {
    const picks = gradeSectionOpts();
    const r = state.roster;
    const kept = (r.groups || []).filter((g) => !g.gs || picks.indexOf(g.gs) >= 0);
    const have = kept.map((g) => g.gs);
    const fresh = (platformRoster(picks.filter((gs) => have.indexOf(gs) < 0)).groups || []);
    state.roster = Object.assign({}, r, { groups: kept.filter((g) => g.gs || g.rows.some((x) => x.first || x.adm)).concat(fresh) });
  }
  function loadRoster(saved) {
    const r = Object.assign(blankRoster(), saved || {});
    if ((!r.groups || !r.groups.length) && r.rows && r.rows.length) r.groups = rowsToGroups(r.rows);
    delete r.rows;
    r.issues = {};
    return r;
  }

  (function boot() {
    const saved = TeacherStore.load(ctx.email);
    // The one-time setup is mandatory: only a teacher who has finished it before
    // goes straight to the dashboard. Everyone else (new, invited, or returning
    // without a saved setup) runs it once, pre-filled from the platform.
    consumeNewFlag();
    if (saved && saved.onboarded) {
      // Saves from before per-year storage hold one flat set — it belongs to this year.
      const byYear = saved.obsByYear || {};
      if (!saved.obsByYear && (saved.observations || saved.obsDrafts)) byYear[YEAR_ID] = { observations: saved.observations || {}, obsDrafts: saved.obsDrafts || {} };
      state.obsByYear = byYear;
      const mine = byYear[YEAR_ID] || {};
      Object.assign(state, { phase: 'complete', onboarded: true,
        joinedAt: saved.joinedAt || saved.completedAt || null, observations: mine.observations || {},
        obsDrafts: mine.obsDrafts || {} });
      if (saved.demo) state.demo = Object.assign(blankDemo(), saved.demo);
      state.selfAnswers = migrateAnswers(saved.selfAnswers);
      // Saves from before the timeline hold one answer set — that's the first mirror.
      state.reflections = (saved.reflections || []).map((r) => Object.assign({}, r, { answers: migrateAnswers(r.answers) }));
      if (!state.reflections.length && Object.keys(state.selfAnswers).length) {
        state.reflections = [snapshot('pre', state.selfAnswers, state.joinedAt || saved.completedAt)];
      }
      state.roster = loadRoster(saved.roster);
      render();
      return;
    }
    state.demo = prefillDemo(blankDemo());
    state.roster = loadRoster(platformRoster());
    render();
  })();

  function persist(extra) {
    const obsByYear = Object.assign({}, state.obsByYear || {}, { [YEAR_ID]: { observations: state.observations, obsDrafts: state.obsDrafts } });
    state.obsByYear = obsByYear;
    const payload = Object.assign({
      email: ctx.email, school: ctx.school,
      demo: state.demo, selfAnswers: state.selfAnswers, roster: state.roster,
      onboarded: state.onboarded, joinedAt: state.joinedAt, obsByYear,
      reflections: state.reflections,
    }, extra || {});
    TeacherStore.save(ctx.email, payload);
  }

  // ============================================================
  //  RENDER
  // ============================================================
  function render() {
    const p = state.phase;
    if (p === 'intro') root.innerHTML = card(introView(), { back: false });
    else if (p === 'demo') root.innerHTML = card(demoView(), { back: false }) + askPopupHTML();
    else if (p === 'greet') root.innerHTML = card(greetView(), { back: false });
    else if (p === 'assess') root.innerHTML = card(assessView(), { back: true });
    else if (p === 'done') root.innerHTML = card(doneView(), { back: false });
    else if (p === 'roster') root.innerHTML = card(rosterView(), { back: true });
    else if (p === 'complete') { enterDashboard(); return; }
    wire();
  }

  // ---- hand off to the dashboard (Phase 2) ----
  // Hides the onboarding garden background, loads the sample data, and mounts
  // the dashboard once. The developer swaps buildAllData() for a real fetch.
  // (dashboardMounted is declared above boot() so a returning, already-onboarded
  //  teacher can mount straight from boot without hitting a TDZ error.)
  function enterDashboard() {
    const onb = document.getElementById('onb');
    const dashRoot = document.getElementById('dash-root');
    if (onb) onb.style.display = 'none';
    if (dashRoot) dashRoot.style.display = '';
    if (!dashRoot) return;
    // render() calls this on every 'complete' render; only (re)mount when the
    // roster actually changed — otherwise it's a no-op so typing/nav stays smooth.
    // API school: the school's records win over the copy saved at onboarding.
    const live = schoolClasses();
    if (live) {
      const before = rosterSig();
      state.roster = Object.assign({}, state.roster, { students: live.students });
      if (rosterSig() !== before) persist();
    }
    const sig = rosterSig() + '#' + (live ? live.sections.map((x) => x.grade + ' ' + x.section).join(',') : '');
    if (dashboardMounted && sig === dashboardRosterSig) return;
    dashboardMounted = true;
    dashboardRosterSig = sig;
    const teacher = {
      email: ctx.email, school: ctx.school,
      demo: state.demo, selfAnswers: state.selfAnswers, roster: state.roster,
      reflection: { cats: CATS, questions: SELF }, joinedAt: state.joinedAt,
      observations: state.observations, obsDrafts: state.obsDrafts, reflections: state.reflections,
      startNav: state.startNav,
    };
    state.startNav = null;
    // dashboard-data.js is loaded as a classic <script> in teacher.html, so it
    // works under file:// too (no ES-module fetch). It exposes window.buildAllData.
    // Pass this teacher's own roster so the dashboard shows THEIR students.
    try {
      if (window.TilliDashboard && window.buildAllData) {
        window.TilliDashboard.mount(dashRoot, { data: window.buildAllData({ roster: state.roster, sections: live ? live.sections : null }), teacher });
      } else {
        throw new Error('dashboard scripts not loaded (TilliDashboard/buildAllData missing)');
      }
    } catch (err) {
      console.error('dashboard load failed', err);
      dashRoot.innerHTML = '<div class="text-center text-body" style="padding:48px">Could not load your dashboard. Please refresh.</div>';
    }
  }

  // white flow card wrapper (+ optional back button)
  function card(inner, opts) {
    const hasBack = !!(opts && opts.back);
    const back = hasBack
      ? `<button class="btn-ghost onb-back focus" data-act="onb-back">&#8592; Back</button>` : '';
    return `<div class="onb-card${hasBack ? ' has-back' : ''}">${back}${inner}</div>`;
  }

  // ---- petal cluster (celebration mark) ----
  // Outline-only circles: coloured ring, white fill, sized smaller than the old
  // solid discs. `cen` holds each circle's CENTRE (top,left); the render offsets
  // by half the diameter so shrinking the discs leaves every centre in place.
  function petals(size, filled) {
    const s = size === 'lg' ? 30 : 22;      // circle diameter (was 44 / 33, solid)
    const bw = size === 'lg' ? 3.5 : 3;     // outline thickness
    const wrap = size === 'lg' ? 130 : 96;
    const cen = size === 'lg'
      ? [[25, 65], [53, 103], [96, 87], [96, 43], [53, 27]]
      : [[18.5, 47.5], [39.5, 75.5], [71.5, 63.5], [71.5, 31.5], [39.5, 19.5]];
    // `filled` = solid coloured discs (used for the "done" celebration);
    // default = coloured outline on a white fill.
    const spans = cen.map((c, i) => {
      const bg = filled ? PETAL_COLORS[i] : 'var(--white)';
      return `<span style="top:${c[0] - s / 2}px;left:${c[1] - s / 2}px;width:${s}px;height:${s}px;background:${bg};border:${bw}px solid ${PETAL_COLORS[i]};animation-delay:${0.3 + i * 0.1}s"></span>`;
    }).join('');
    return `<div class="onb-petals" style="width:${wrap}px;height:${wrap}px">${spans}</div>`;
  }

  // ============================================================
  //  SCREENS
  // ============================================================

  // ---- intro (reflection quote) ----
  function introView() {
    return `<div class="ui-empty onb-hero">
      <div class="onb-kicker mb-3">You can not pour from an empty cup</div>
      <h1 class="ui-empty-t">Before you know your class,<br>you must know yourself.</h1>
      <div class="actions"><button class="btn btn-primary focus" data-act="intro-next">Begin reflection &#8594;</button></div>
    </div>`;
  }

  // ---- demographics (4 steps) ----
  function demoTitle(step) {
    return step === 1 ? 'Tell us about yourself'
      : step === 2 ? 'Tell us about your school'
      : step === 3 ? 'Tell us about yourself as a teacher'
      : 'About your classroom';
  }
  // Custom dropdown — replaces the native <select>, whose OS-drawn option list
  // can't be styled or positioned and mis-renders (tiny / detached from the field)
  // when the page is scaled. `scope` routes a pick to the right state slice:
  // 'demo' → state.demo[id] (default), 'roster' → state.roster[id]. Only one
  // dropdown is open at a time, tracked by state.openSelect === id.
  function selectField(label, id, value, options, placeholder, scope) {
    scope = scope || 'demo';
    const open = state.openSelect === id;
    const opts = options.map((o) =>
      `<button type="button" class="ui-menu-item onb-sel-opt focus${value === o ? ' on' : ''}" data-sel-scope="${scope}" data-sel-id="${esc(id)}" data-sel-val="${esc(o)}"><span>${esc(o)}</span>${value === o ? '<span class="onb-sel-tick">✓</span>' : ''}</button>`).join('');
    return `<div>
      <label class="onb-label">${esc(label)}</label>
      <div class="onb-sel${open ? ' open' : ''}">
        <button type="button" class="input onb-sel-trigger focus${value ? '' : ' is-placeholder'}" data-sel-toggle="${esc(id)}"><span class="onb-sel-val">${esc(value || placeholder)}</span></button>
        ${open ? `<div class="ui-menu onb-sel-menu">${opts}</div>` : ''}
      </div>
    </div>`;
  }

  function demoView() {
    const d = state.demo;
    return `
      <span class="ui-eyebrow pill mb-3">Demographic questions</span>
      <div class="onb-steprow">
        <h2 class="ui-title xl onb-title">${esc(demoTitle(d.step))}</h2>
        <span class="onb-step">Step ${d.step} of 4</span>
      </div>
      <div class="ui-meter mt-3 mb-3"><span style="width:${(d.step / 4) * 100}%"></span></div>
      <p class="onb-help">This one-time setup unlocks your dashboard. All fields are required.</p>
      ${d.step === 1 ? demoStep1() : d.step === 2 ? demoStep2() : d.step === 3 ? demoStep3() : demoStep4()}
      ${d.step === 3 && !demoValid() ? `<p class="onb-nexthint">${Object.keys(d.gradesSel).length ? 'Pick at least one section in each grade you picked.' : 'Pick the grades you teach, or ask for your class if it isn&rsquo;t listed.'}</p>` : ''}
      <div class="onb-actions${d.step === 3 && !demoValid() ? ' hinted' : ''}">
        <button class="btn btn-ghost focus" data-act="onb-back" style="padding:13px">Back</button>
        <button class="btn btn-primary grow focus" data-act="demo-next"${demoValid() ? '' : ' disabled'}>${d.step === 4 ? 'Finish &amp; Continue' : 'Next'}</button>
      </div>`;
  }

  function demoStep1() {
    const d = state.demo;
    const emailRow = ctx.email
      ? `<div><label class="onb-label">Email</label>
          <div class="onb-locked"><span>${esc(ctx.email)}</span>
            ${LOCK_SVG}
          </div></div>` : '';
    return `<div class="onb-fields">
      <div><label class="onb-label">Full Name *</label>
        <input class="input focus" data-demo="name" value="${esc(d.name)}" placeholder="Enter your full name"></div>
      ${emailRow}
      ${selectField('Gender *', 'gender', d.gender, GENDERS, 'Select gender')}
      <div class="onb-grid2">
        <div><label class="onb-label">Age *</label>
          <input class="input focus" data-demo="age" inputmode="numeric" value="${esc(d.age)}"></div>
        <div><label class="onb-label">Years in Teaching *</label>
          <input class="input focus" data-demo="years" inputmode="numeric" value="${esc(d.years)}"></div>
      </div>
      ${selectField('Highest Education Level *', 'edu', d.edu, EDU_LEVELS, 'Select education level')}
    </div>`;
  }

  function demoStep2() {
    const d = state.demo;
    const country = COUNTRIES.find((c) => c.name === d.country);
    const flag = country ? country.flag : '';
    const cQuery = d.country.trim().toLowerCase();
    const cMatches = COUNTRIES.filter((c) => c.name.toLowerCase().includes(cQuery));
    const cityQuery = d.city.trim().toLowerCase();
    const cityMatches = country ? country.cities.filter((ct) => ct.toLowerCase().includes(cityQuery)) : [];

    const countryMenu = d.countryOpen ? `<div class="ui-menu onb-ac-menu">
      ${cMatches.map((c) => `<button class="ui-menu-item focus" data-country="${esc(c.name)}">${c.flag} ${esc(c.name)}</button>`).join('')}
      ${cMatches.length === 0 ? '<div class="onb-ac-empty">No matches — keep typing to use your own</div>' : ''}
    </div>` : '';
    const cityMenu = d.cityOpen ? `<div class="ui-menu onb-ac-menu">
      ${cityMatches.map((ct) => `<button class="ui-menu-item focus" data-city="${esc(ct)}">${esc(ct)}</button>`).join('')}
      ${cityMatches.length === 0 ? `<div class="onb-ac-empty">${country ? 'No matches — keep typing to use your own' : 'Pick a country first'}</div>` : ''}
    </div>` : '';

    return `<div class="onb-fields">
      <div><label class="onb-label">School</label>
        <div class="onb-locked"><span>${esc(d.school)}</span>
          ${LOCK_SVG}
        </div></div>
      <div class="onb-grid2">
        <div class="onb-ac"><label class="onb-label">Country *</label>
          <input class="input focus" data-demo-ac="country" value="${esc(d.country)}" placeholder="Search country…" style="padding-right:38px" autocomplete="off">
          <span class="onb-ac-flag">${flag}</span>
          ${countryMenu}
        </div>
        <div class="onb-ac"><label class="onb-label">City *</label>
          <input class="input focus" data-demo-ac="city" value="${esc(d.city)}" placeholder="${d.country ? 'Search city…' : 'Select country first'}" autocomplete="off">
          ${cityMenu}
        </div>
      </div>
    </div>`;
  }

  function demoStep3() {
    const d = state.demo;
    const gradePills = allowedGradeIdx().map((gi) =>
      `<button class="ui-filterchip solid focus${d.gradesSel[gi] ? ' on' : ''}" data-grade="${gi}">${esc(gradeShown(GRADES[gi]))}</button>`).join('');
    const hasGrades = Object.keys(d.gradesSel).length > 0;
    const secCards = !hasGrades ? '' : allowedGradeIdx().map((gi) => {
      const name = GRADES[gi];
      if (!d.gradesSel[gi]) return '';
      const gradeSecs = allowedSecs(gi);
      const count = gradeSecs.filter((sx) => d.secs[gi + '-' + sx]).length;
      const secs = gradeSecs.map((sx) => {
        const on = !!d.secs[gi + '-' + sx];
        return `<button class="onb-check focus" data-sec="${gi}-${esc(sx)}"><span class="ui-check${on ? ' on' : ''}">${on ? '✓' : ''}</span>${esc(sxShown(name, sx))}</button>`;
      }).join('');
      return `<div class="ui-card sm subtle onb-seccard">
        <div class="onb-sechead"><span style="font-size:var(--fs-sm);font-weight:700;color:var(--ink-700)">${esc(gradeShown(name))}</span>
          ${count ? `<span class="ui-chip ok">${count} selected</span>` : ''}</div>
        <div class="onb-secgrid">${secs}</div>
      </div>`;
    }).join('');
    const noClasses = !GRADES.length;
    return `<div class="onb-fields loose">
      ${noClasses ? `<div class="ui-note warn">Your school hasn&rsquo;t added its classes yet. Ask your school admin to add yours &mdash; you can finish setting up meanwhile.</div>` : `<div>
        <label class="onb-label spaced">Grades you teach *</label>
        <div class="onb-pills">${gradePills}${INVITE && INVITE.school && !d.classAsked ? `<button type="button" class="ui-filterchip solid onb-askchip focus" data-act="ask-open" title="Your grade or section isn't listed? Ask your school admin to add it">＋ My class isn&rsquo;t here</button>` : ''}</div>
      </div>
      ${hasGrades ? `<div>
        <label class="onb-label spaced">Sections you teach in each grade *</label>
        ${secCards}
      </div>` : ''}`}
      ${classAskHTML(noClasses)}
    </div>`;
  }

  // "My class isn't here" — the teacher can't create a class; this asks the
  // school admin (and the Tilli team sees it too). Not shown for a standalone demo.
  // The form is a small pop-up (askPopupHTML); the step only shows what was sent.
  function classAskHTML(noClasses) {
    const d = state.demo;
    if (!INVITE || !INVITE.school) return '';
    if (d.classAsked) return `<div>
      <div class="ui-note ok onb-asked" role="status"><span aria-hidden="true">✓</span><span class="grow">Asked your school admin for <b>${esc(askedClass() || 'your class')}</b></span><button type="button" class="onb-undo focus" data-act="ask-undo">Undo</button></div>
      <p class="onb-askedsub">You can finish setting up now. You&rsquo;ll add your students once they&rsquo;ve placed you in your class.</p>
    </div>`;
    if (noClasses) return `<div class="ui-note warn"><span>Your school hasn&rsquo;t added its classes yet. Ask your school admin to add yours &mdash; you can finish setting up meanwhile.</span></div>
      <div><button type="button" class="ui-filterchip solid onb-askchip focus" data-act="ask-open">＋ Ask for your class</button></div>`;
    return '';   // the "＋ My class isn't here" chip sits at the end of the grade chips
  }
  function askedClass() { const d = state.demo; return [d.askGrade.trim(), d.askSection.trim()].filter(Boolean).join(' · '); }
  // Grade = the school's grades + "Another grade…" (typed), so "Grade 7" / "Gr 7" / "7"
  // don't reach the admin as three different classes.
  function askPopupHTML() {
    const d = state.demo;
    if (!d.askOpen || state.phase !== 'demo' || d.step !== 3) return '';
    const other = d.askOther || !GRADES.length;
    const opts = `<option value=""${!other && !d.askGrade ? ' selected' : ''} disabled>Pick a grade</option>` +
      GRADES.map((g) => `<option value="${esc(g)}"${!other && d.askGrade === g ? ' selected' : ''}>${esc(gradeShown(g))}</option>`).join('') +
      `<option value="__other"${other ? ' selected' : ''}>Another grade…</option>`;
    return `<div class="overlay onb-askovl" data-ask-ovl data-keep="own">
      <div class="ui-modal-card onb-askcard" role="dialog" aria-modal="true" aria-labelledby="onb-ask-t">
        <h3 class="ui-title md" id="onb-ask-t">Ask for your class</h3>
        <p class="onb-help">Your school admin adds it and places you in it. The Tilli team sees it too.</p>
        <div class="onb-grid2">
          <div><label class="onb-label" for="onb-ask-grade">Grade *</label>
            ${GRADES.length ? `<select class="select focus" id="onb-ask-grade" data-ask-grade>${opts}</select>` : ''}
            ${other ? `<input class="input focus${GRADES.length ? ' mt-2' : ''}" ${GRADES.length ? '' : 'id="onb-ask-grade" '}data-demo="askGrade" value="${esc(d.askGrade)}" placeholder="e.g. Grade 7" aria-label="Grade">` : ''}</div>
          <div><label class="onb-label" for="onb-ask-sec">Section</label>
            <input class="input focus" id="onb-ask-sec" data-demo="askSection" value="${esc(d.askSection)}" placeholder="e.g. B"></div>
        </div>
        <label class="onb-label mt-3" for="onb-ask-note">Note for your admin (optional)</label>
        <textarea class="input focus onb-asknote" id="onb-ask-note" rows="2" data-demo="askNote" placeholder="e.g. I take this class for English">${esc(d.askNote)}</textarea>
        <div class="onb-ovl-acts">
          <button type="button" class="btn btn-outline focus" data-act="ask-cancel">Cancel</button>
          <button type="button" class="btn btn-primary onb-asksend focus" data-act="ask-send">Send to admin</button>
        </div>
      </div>
    </div>`;
  }
  function sendClassRequest() {
    const d = state.demo, A = window.TilliAPI;
    if (!d.askGrade.trim()) {
      const g = document.getElementById('onb-ask-grade');
      if (g) { g.classList.add('err'); g.focus(); }
      return;
    }
    try { if (A && A.requestClass) A.requestClass({ email: ctx.email, school_id: INVITE.school.school_id, name: d.name, grade: d.askGrade.trim(), section: d.askSection.trim(), note: d.askNote.trim() }); } catch (e) {}
    setDemo({ classAsked: true, askOpen: false });
  }
  function undoClassRequest() {
    const A = window.TilliAPI;
    try { if (A && A.withdrawClassRequest) A.withdrawClassRequest(ctx.email, INVITE.school.school_id); } catch (e) {}
    setDemo({ classAsked: false });   // the form keeps what they typed, for a quick re-send
  }

  function demoStep4() {
    const d = state.demo;
    const subjects = DEMO_SUBJECTS.map((label) => {
      const on = !!d.subjects[label];
      return `<button class="onb-check focus" data-subject="${esc(label)}"><span class="ui-check${on ? ' on' : ''}">${on ? '✓' : ''}</span>${esc(label)}</button>`;
    }).join('');
    const resources = DEMO_RESOURCES.map((label) => {
      const on = !!d.resources[label];
      return `<button class="onb-check focus" data-resource="${esc(label)}"><span class="ui-check${on ? ' on' : ''}">${on ? '✓' : ''}</span>${esc(label)}</button>`;
    }).join('');
    return `<div class="onb-fields loose">
      <div><label class="onb-label">Subjects you teach *</label>
        <div class="onb-checkgrid">${subjects}</div></div>
      ${selectField('Resource Sufficiency *', 'resSuff', d.resSuff, RES_SUFF, 'Select…')}
      <div><label class="onb-label">Classroom Resources *</label>
        <div class="onb-checkgrid">${resources}</div></div>
    </div>`;
  }

  function demoValid() {
    const d = state.demo;
    if (d.step === 1) return !!(d.name.trim() && d.gender && d.age.trim() && d.years.trim() && d.edu);
    if (d.step === 2) return !!(d.school && d.country.trim() && d.city.trim());
    if (d.step === 3) {
      const sel = Object.keys(d.gradesSel);
      if (!sel.length) return !!d.classAsked;
      return sel.every((gi) => allowedSecs(gi).some((sx) => d.secs[gi + '-' + sx]));
    }
    return Object.keys(d.subjects).length > 0 && !!d.resSuff && Object.keys(d.resources).length > 0;
  }

  // ---- greeting ----
  function greetView() {
    const first = (state.demo.name || '').trim().split(/\s+/)[0] || 'there';
    if (state.reflectOnly) {
      return `<div class="ui-empty onb-hero">
        ${petals('sm')}
        <h1 class="ui-empty-t">Time for your ${esc(state.reflectOnly.label.toLowerCase())} reflection, ${esc(first)}</h1>
        <p class="ui-empty-b">The same ${SELF.length} questions as before. Your Teaching Mirror will keep both, so you can see how you&rsquo;ve changed.</p>
        <div class="actions"><button class="btn btn-primary focus" data-act="greet-next">Begin reflection &#8594;</button></div>
        <div class="mt-3"><button class="onb-quiet focus" data-act="reflect-cancel">Not now — back to my dashboard</button></div>
      </div>`;
    }
    return `<div class="ui-empty onb-hero">
      ${petals('sm')}
      <h1 class="ui-empty-t">Hi ${esc(first)}, it&rsquo;s nice to meet you!</h1>
      <p class="ui-empty-b">A short reflection helps Tilli understand you — about ${Math.max(1, Math.round(SELF.length * 0.3))} minutes, ${SELF.length} quick questions.</p>
      <div class="actions"><button class="btn btn-primary focus" data-act="greet-next">Begin reflection &#8594;</button></div>
    </div>`;
  }

  // ---- self-assessment ----
  function assessView() {
    const i = state.selfQ, q = SELF[i], ak = answerKey(i);
    // Section progress ring — exactly 5 outline circles, one per self-assessment
    // category, matching the celebration petal cluster (same 5 brand colours).
    // Each fills once every question in its category is answered; the current
    // category shows a coloured ring as a "you are here" cue before it fills.
    const R = 22, D = 11;
    const dots = CATS.map((c, ci) => {
      const done = SELF.every((sq, k) => sq.cat !== ci || selfAnswered(k));
      const cur = ci === q.cat;
      const col = PETAL_COLORS[ci % PETAL_COLORS.length];
      const bg = done ? col : 'var(--white)';
      const bd = done || cur ? col : 'var(--line-200)';
      const ang = (ci / CATS.length) * Math.PI * 2 - Math.PI / 2;
      const cx = 28 + Math.cos(ang) * R - D / 2, cy = 28 + Math.sin(ang) * R - D / 2;
      return `<span style="left:${cx}px;top:${cy}px;width:${D}px;height:${D}px;background:${bg};border-color:${bd}"></span>`;
    }).join('');
    // category chips (highlight the current one)
    const cats = CATS.map((c, ci) => {
      const on = ci === q.cat;
      // c.color is admin-editable reflection data (tilli-api) — stays dynamic.
      const style = on ? `background:${c.color};color:var(--ink-700)` : 'color:var(--ink-300)';
      return `<span class="ui-chip" style="${style}">${esc(c.name)}</span>`;
    }).join('');

    let body = '';
    if (q.type === 'scale') {
      const cur = state.selfAnswers[ak];
      const btns = [1, 2, 3, 4, 5].map((n) =>
        `<button class="onb-scale-btn focus${cur === n ? ' on' : ''}" data-scale="${n}">${n}</button>`).join('');
      body = `<div class="onb-scale">${btns}</div>
        <div class="onb-scale-ends"><span>${esc(q.lo || 'Strongly disagree')}</span><span>${esc(q.hi || 'Strongly agree')}</span></div>`;
    } else if (q.type === 'choice') {
      const cur = state.selfAnswers[ak];
      body = `<div class="onb-choices">${(q.options || []).map((o) =>
        `<button class="ui-pick onb-choice focus${cur === o ? ' on' : ''}" data-choice="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    } else {
      body = `<textarea class="onb-textarea focus" data-self-text rows="4" placeholder="Take a breath and write freely…">${esc(state.selfAnswers[ak] || '')}</textarea>`;
    }

    return `
      <div class="onb-dots">${dots}</div>
      <div class="onb-catrow">${cats}</div>
      <div class="onb-qnum">Question ${i + 1} of ${SELF.length}</div>
      <h2 class="ui-title onb-question">${esc(q.q)}</h2>
      ${q.hint ? `<p class="onb-qhint">${esc(q.hint)}</p>` : ''}
      ${body}
      <div class="row end mt-5">
        <button class="btn btn-primary focus" data-act="self-next"${selfAnswered(i) ? '' : ' disabled'} style="padding:13px 30px">${i >= SELF.length - 1 ? 'Finish reflection' : 'Next'} &#8594;</button>
      </div>`;
  }
  function selfAnswered(i) {
    const a = state.selfAnswers[answerKey(i)];
    return typeof a === 'string' ? !!a.trim() : a != null;
  }

  // ---- profile done ----
  function doneView() {
    return `<div class="ui-empty onb-hero">
      ${petals('lg', true)}
      <h1 class="ui-empty-t">Amazing! Your profile is created</h1>
      <p class="ui-empty-b">Now let&rsquo;s meet your class.</p>
      <div class="actions"><button class="btn btn-primary focus" data-act="to-roster">Add my students &#8594;</button></div>
    </div>`;
  }

  // ---- add students ----
  // The grade · section pairs the teacher selected in step 3 — the options for
  // each sheet row's grade column.
  function gradeSectionOpts() {
    const d = state.demo, out = [];
    Object.keys(d.gradesSel).sort((a, b) => a - b).forEach((gi) => {
      allowedSecs(gi).forEach((sx) => { if (d.secs[gi + '-' + sx]) out.push(GRADES[gi] + ' · Section ' + sx); });
    });
    return out;
  }
  const blankRow = () => ({ first: '', last: '', adm: '' });
  const blankGroup = (gs) => ({ gs: gs || '', rows: [blankRow()] });
  const rowComplete = (r) => !!(r.first.trim() && r.last.trim() && r.adm.trim());
  function sheetValid() { return (state.roster.groups || []).some((g) => g.gs && g.rows.some(rowComplete)); }
  function splitGS(gs) { const p = String(gs || '').split(' · Section '); return [(p[0] || '').trim(), (p[1] || '').trim()]; }
  // First grade·section not already taken by another group (for a new group).
  function nextFreeGS() {
    const used = (state.roster.groups || []).map((g) => g.gs);
    return gradeSectionOpts().find((o) => used.indexOf(o) < 0) || '';
  }

  // Grade·section picker for a whole group of students. Uses the same custom
  // .onb-sel dropdown as the rest of onboarding (native <select> mis-renders
  // when the page is scaled). Open state: state.openSelect === 'grpgs-<gi>'.
  function gsSelect(gi, current, opts) {
    const id = 'grpgs-' + gi;
    const open = state.openSelect === id;
    const all = opts.slice();
    if (current && all.indexOf(current) < 0) all.unshift(current);   // keep an off-list value visible
    const menu = all.map((o) =>
      `<button type="button" class="ui-menu-item onb-sel-opt focus${o === current ? ' on' : ''}" data-gs-opt="${gi}" data-gs-val="${esc(o)}"><span>${esc(gsShown(o))}</span>${o === current ? '<span class="onb-sel-tick">✓</span>' : ''}</button>`).join('');
    return `<div class="onb-sel${open ? ' open' : ''}">
      <button type="button" class="input onb-sel-trigger focus${current ? '' : ' is-placeholder'}" data-gs-toggle="${gi}" aria-label="Grade and section for this group"><span class="onb-sel-val">${esc(current ? gsShown(current) : 'Choose grade · section')}</span></button>
      ${open ? `<div class="ui-menu onb-sel-menu">${menu}</div>` : ''}
    </div>`;
  }

  // "Add your students" — a method chooser (manual sheet / CSV / picture), then
  // the chosen entry surface. Manual is an editable sheet (one row per child),
  // pre-filled from the platform for invited teachers. Committed on "Enter my
  // garden". `r.method` null = chooser; onbBack resets it to null to go back.
  function rosterView() {
    const r = state.roster;
    const head = (sub) => `
      <div class="text-center" style="margin-bottom:${sub ? 18 : 20}px">
        <div class="onb-kicker mb-2">Let&rsquo;s create your garden</div>
        <h2 class="ui-title xl onb-title">Add your students</h2>
        ${sub ? `<p class="onb-help" style="margin-top:6px">${sub}</p>` : ''}
      </div>`;

    // --- no class yet: they asked their school admin in step 3 ---
    if (!gradeSectionOpts().length && state.demo.classAsked) {
      return head('') + `
        <div class="ui-note">Your school admin has been asked to add your class. Once they&rsquo;ve placed you in it, its students appear in your garden &mdash; nothing to add now.</div>
        <div class="text-center mt-4"><button class="btn btn-primary focus" data-act="roster-skip">Enter my garden &#8594;</button></div>`;
    }

    // --- entry: choose how to add students ---
    if (!r.method) {
      const preN = (r.groups || []).reduce((a, g) => a + g.rows.filter((x) => x.first || x.adm).length, 0);
      return head(preN ? `${preN} student${preN === 1 ? '' : 's'} on file — pick &ldquo;Type them in&rdquo; to review &amp; edit them.` : '') + `
        <div class="onb-methods">
          <button class="onb-method focus" data-method="sheet"><span class="ic">🌱</span><span class="lb">Type them in</span></button>
          <button class="onb-method focus" data-method="csv"><span class="ic">📄</span><span class="lb">Upload a CSV</span></button>
          <button class="onb-method focus" data-method="pic"><span class="ic">📷</span><span class="lb">Upload a picture</span></button>
        </div>`;
    }

    // --- CSV upload ---
    if (r.method === 'csv') {
      return head('') + `
        <label class="onb-drop">
          <input type="file" accept=".csv" data-roster-csv class="hidden">
          <div class="onb-drop-ic">📄</div>
          <div class="onb-drop-t">Upload a CSV</div>
          <div class="onb-drop-s">Columns: first name, last name, grade, section</div>
        </label>
        ${r.csvMsg ? `<div class="ui-note ok mt-3">${esc(r.csvMsg)}</div>` : ''}
        <div class="onb-actions tight">
          <button class="btn btn-primary grow focus" data-act="roster-finish"${r.csvMsg ? '' : ' disabled'}>Enter my garden &#8594;</button>
        </div>`;
    }

    // --- picture upload ---
    if (r.method === 'pic') {
      return head('') + `
        <div class="onb-grid2">
          <label class="onb-drop compact">
            <input type="file" accept="image/*" data-roster-pic class="hidden">
            <div class="onb-drop-ic">🖼️</div>
            <div class="onb-drop-t">Upload a picture</div>
          </label>
          <label class="onb-drop compact">
            <input type="file" accept="image/*" capture="environment" data-roster-pic class="hidden">
            <div class="onb-drop-ic">📷</div>
            <div class="onb-drop-t">Take a picture</div>
          </label>
        </div>
        <div class="text-muted text-center" style="font-size:var(--fs-sm);margin-top:10px">Snap your class register — we&rsquo;ll read the names for you.</div>
        ${r.picMsg ? `<div class="ui-note ok mt-3">${esc(r.picMsg)}</div>` : ''}
        <div class="onb-actions tight">
          <button class="btn btn-primary grow focus" data-act="roster-finish"${r.picMsg ? '' : ' disabled'}>Enter my garden &#8594;</button>
        </div>`;
    }

    // --- manual: editable sheet (r.method === 'sheet') ---
    // Grade · section is chosen ONCE per group; the group's students sit under it.
    const opts = gradeSectionOpts();
    if (!r.groups || !r.groups.length) r.groups = [blankGroup(opts[0] || '')];   // always show one group
    r.groups.forEach((g) => { if (!g.rows.length) g.rows.push(blankRow()); });
    const prefilled = r.groups.some((g) => g.rows.some((x) => x.first || x.adm));
    const issues = r.issues || {};

    const header = `<div class="roster-head"><span>First name</span><span>Last name</span><span>Admission #</span><span></span></div>`;
    const groupsHTML = r.groups.map((g, gi) => {
      const taken = r.groups.filter((_, k) => k !== gi).map((x) => x.gs);
      const gopts = opts.filter((o) => taken.indexOf(o) < 0);
      const n = g.rows.filter(rowComplete).length;
      const rowsHTML = g.rows.map((row, i) => {
        const iss = issues[gi + '-' + i];
        const note = iss ? `<div class="roster-issue">${esc(iss.text)}${iss.kind === 'name_dup'
          ? ` <button class="roster-issue-btn focus" data-rowforce="${gi}-${i}">Different child — add anyway</button>`
          : iss.kind === 'over_limit' ? ` <button class="roster-issue-btn focus" data-rowreq="${gi}-${i}">Send for approval</button>` : ''}</div>` : '';
        return `<div class="roster-sheet-row${iss ? ' has-issue' : ''}">
          <input class="input focus" data-rowk="first" data-rowg="${gi}" data-rowi="${i}" value="${esc(row.first)}" placeholder="First name" aria-label="First name, student ${i + 1}">
          <input class="input focus" data-rowk="last" data-rowg="${gi}" data-rowi="${i}" value="${esc(row.last)}" placeholder="Last name" aria-label="Last name, student ${i + 1}">
          <input class="input focus" data-rowk="adm" data-rowg="${gi}" data-rowi="${i}" value="${esc(row.adm)}" placeholder="Admission #" aria-label="Admission number, student ${i + 1}">
          <button class="btn-icon bare roster-del focus" data-rowdel="${gi}-${i}" title="Remove student ${i + 1}" aria-label="Remove student ${i + 1}">&times;</button>
        </div>${note}`;
      }).join('');
      return `<section class="ui-card sm roster-group">
        <div class="roster-group-head">
          <div class="roster-group-gs">${gsSelect(gi, g.gs, gopts)}</div>
          <span class="roster-group-n">${n} ${n === 1 ? 'student' : 'students'}</span>
          ${r.groups.length > 1 ? `<button class="onb-quiet del focus" data-groupdel="${gi}" title="Remove this section and its students">Remove</button>` : ''}
        </div>
        ${g.gs ? `<p class="add-room">${esc(roomLineFor(g.gs))}</p>` : ''}
        <div class="roster-sheet">${header}${rowsHTML}</div>
        <button class="btn-dashed mt-2 focus" data-rowadd="${gi}">+ Add student</button>
      </section>`;
    }).join('');
    const canAddGroup = !opts.length || r.groups.length < opts.length;

    return head(prefilled ? 'We&rsquo;ve pre-filled the students on file — check, edit, or add more below.' : 'Pick the grade &amp; section once, then add its students. Add another section if you teach more than one.') + `
      ${opts.length ? '' : '<div class="ui-note ok mt-3 mb-3">Tip: pick the grades &amp; sections you teach in the previous step and they&rsquo;ll appear in the grade · section picker.</div>'}
      ${Object.keys(issues).length ? '<div class="ui-note warn mt-3 mb-3">A few students need a quick check before we can plant them — see the highlighted rows.</div>' : ''}
      ${groupsHTML}
      ${canAddGroup ? '<button class="btn btn-ghost block mt-1 focus" data-groupadd>+ Add another section</button>' : ''}
      <div class="text-center mt-4">
        <button class="btn btn-primary focus" data-act="roster-finish"${sheetValid() ? '' : ' disabled'}>Enter my garden &#8594;</button>
      </div>`;
  }

  // Commit the sheet: funnel every complete row through the dedupe guard (best
  // effort), then hand the committed students to the garden.
  // Rows the guard bounces (same name / taken admission #) are flagged in place
  // and block finishing until the teacher resolves them.
  function commitSheet() {
    const issues = {}, students = [], seen = {}, picks = gradeSectionOpts();
    (state.roster.groups || []).forEach((g, gi) => {
      if (!g.gs || (picks.length && picks.indexOf(g.gs) < 0)) return;   // only the classes picked in step 3
      const gs = splitGS(g.gs), grade = gs[0], section = gs[1];
      g.rows.forEach((row, i) => {
        if (!rowComplete(row)) return;
        const first = row.first.trim(), last = row.last.trim(), adm = row.adm.trim();
        let res = null, scope = null;
        try {
          if (window.TilliAPI && window.TilliAPI.addStudent) {
            scope = window.TilliAPI.ensureTeacherScope(ctx.email, ctx.school, grade, section);
            if (!scope && INVITE && INVITE.school) { issues[gi + '-' + i] = { kind: 'no_class', text: noClassText(g.gs) }; return; }
            res = window.TilliAPI.addStudent({
              actorEmail: ctx.email, school_id: scope && scope.school_id, section_id: scope && scope.section_id,
              student_id: adm, first, last, grade, section, source: 'manual', force: row.force || null, request: !!row.request,
            });
          }
        } catch (e) {}
        if (res && res.result === 'over_limit') {
          issues[gi + '-' + i] = { kind: 'over_limit', text: overLimitText(res.room) };
          return;
        }
        if (res && res.result === 'name_dup') {
          issues[gi + '-' + i] = { kind: 'name_dup', text: `“${first} ${last}” has the same name as a student already on file (#${res.matched.student_id}).` };
          return;
        }
        if (res && res.result === 'id_conflict') {
          issues[gi + '-' + i] = { kind: 'id_conflict', text: `#${adm} already belongs to ${res.existing.name}. Two children can’t share an admission number — use a different one.` };
          return;
        }
        if (seen[normAdm(adm)]) return;
        seen[normAdm(adm)] = true;
        const uid = (res && res.student && res.student.uid)
          || (scope && window.TilliAPI.makeUid ? window.TilliAPI.makeUid(scope.school_id, adm) : null);
        students.push({ first, last, adm, grade, section, uid });
      });
    });
    // Only children past the class size are holding things up → one pop-up decides
    // for all of them (it used to need a small "Send for approval" per row, then
    // Enter my garden again, with nothing saying so).
    const keys = Object.keys(issues);
    if (keys.length && keys.every((k) => issues[k].kind === 'over_limit')) { askOverLimit(keys, issues); return; }
    if (keys.length) { setRoster({ issues }); return; }
    state.roster = Object.assign({}, state.roster, { students, issues: {} });
    finishOnboard();
  }
  function askOverLimit(keys, issues) {
    const pair = (v) => String(v).split('-').map(Number);   // "gi-i" issue key → [group, row]
    const rowOf = (k) => { const [gi, i] = pair(k); const g = state.roster.groups[gi]; return g && g.rows[i]; };
    const names = keys.map((k) => { const r = rowOf(k); return r ? (r.first + ' ' + r.last).trim() : ''; }).filter(Boolean);
    const who = names.length === 1 ? `<b>${esc(names[0])}</b> is` : `<b>${names.length} children</b> (${esc(names.join(', '))}) are`;
    const close = () => { const o = document.getElementById('onb-ovl'); if (o) o.remove(); };
    close();
    const ov = document.createElement('div');
    ov.className = 'overlay'; ov.id = 'onb-ovl'; ov.dataset.keep = 'no';
    ov.innerHTML = `<div class="ui-modal-card" role="dialog" aria-modal="true" aria-label="Over your class size">
      <h3 class="ui-title md">Over your class size</h3>
      <p>${who} past your class size. Send ${names.length === 1 ? 'them' : 'them all'} to your school admin for approval? You can still assess ${names.length === 1 ? 'them' : 'them'} meanwhile.</p>
      <div class="onb-ovl-acts">
        <button class="btn btn-outline focus" data-ovl="cancel">Cancel</button>
        <button class="btn btn-outline focus" data-ovl="remove">Remove ${names.length === 1 ? esc(names[0].split(' ')[0]) : 'them'}</button>
        <button class="btn btn-primary focus" data-ovl="send">Send &amp; enter my garden</button>
      </div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => {
      const act = e.target.dataset && e.target.dataset.ovl;
      if (e.target === ov || act === 'cancel') { close(); setRoster({ issues }); return; }
      if (act === 'send') { keys.forEach((k) => { const r = rowOf(k); if (r) r.request = true; }); close(); commitSheet(); }
      if (act === 'remove') {
        // Remove from the end so earlier indexes stay right.
        keys.map(pair).sort((a, b) => a[0] - b[0] || b[1] - a[1]).forEach(([gi, i]) => { const g = state.roster.groups[gi]; if (g) g.rows.splice(i, 1); });
        close(); commitSheet();
      }
    });
  }

  // Expected class size for a "Grade · Section" pick — set by the school admin or
  // Tilli. Teachers add up to it; past it, a child waits for an admin's approval.
  function roomLineFor(gsLabel) {
    const gs = splitGS(gsLabel), A = window.TilliAPI;
    const rm = A && A.sectionRoom ? A.sectionRoom(ctx.school, gs[0], gs[1]) : null;
    if (!rm || rm.expected == null) return 'Your school hasn’t set a class size here yet — new children go to your school admin for approval.';
    if (rm.left) return `${rm.added} of ${rm.expected} students on file · ${rm.left} ${rm.left === 1 ? 'place' : 'places'} left.`;
    return `All ${rm.expected} students are on file. Anyone new goes to your school admin for approval.`;
  }
  function noClassText(gsLabel) { return `Your school doesn’t have ${gsShown(gsLabel)} yet — ask your school admin to add it.`; }
  function overLimitText(rm) {
    return rm && rm.expected != null
      ? `Your class is full (${rm.expected} of ${rm.expected}). Send this child to your school admin for approval — you can still assess them meanwhile.`
      : 'No class size is set here yet. Send this child to your school admin for approval — you can still assess them meanwhile.';
  }

  // Renders the feedback note under the add-student button. For the two
  // conflict kinds it also renders the resolution buttons (data-act handled in
  // handleAct). Colours: green = added, blue = updated, amber = needs a decision.
  function rosterNoteHTML(n) {
    if (!n) return '';
    const tone = { created: 'ok', merged: 'info', name_dup: 'info', id_conflict: 'warn', over_limit: 'warn', requested: 'info', info: '' };
    const mod = tone[n.kind] != null ? tone[n.kind] : '';
    const wrap = (inner) => `<div class="onb-note-acts">${inner}</div>`;
    const choiceBtn = (act, label) => `<button class="btn-line focus" data-act="${act}">${label}</button>`;
    let actions = '';
    if (n.kind === 'name_dup') {
      actions = wrap(
        choiceBtn('roster-ignore-add', '<b>Add anyway</b>') +
        choiceBtn('roster-dismiss-note', 'Cancel')
      );
    } else if (n.kind === 'over_limit') {
      actions = wrap(
        choiceBtn('roster-request-add', '<b>Send for approval</b>') +
        choiceBtn('roster-dismiss-note', 'Cancel')
      );
    } else if (n.kind === 'id_conflict') {
      const ex = n.existing || {}, inc = n.incoming || {};
      const exNm = esc(ex.name || 'Existing student');
      const incNm = esc(((inc.first || '') + ' ' + (inc.last || '')).trim() || 'New student');
      actions = wrap(
        choiceBtn('roster-conflict-keep', `Keep <b>${exNm}</b>`) +
        choiceBtn('roster-conflict-replace', `Use <b>${incNm}</b>`)
      );
    }
    return `<div class="ui-note ${mod} mt-3${actions ? ' onb-note-col' : ''}"><div>${esc(n.text)}</div>${actions}</div>`;
  }

  // A student can only be added once every field is filled: first name,
  // last name and admission number (grade & section is gated separately above).
  function rosterAddValid() {
    const r = state.roster;
    return !!(r.first.trim() && r.last.trim() && r.adm.trim());
  }

  // Add a student through the dedupe guard (spec A4). Every add-path funnels
  // through TilliAPI.addStudent. Two conflicts are surfaced for the teacher to
  // resolve inline (never auto-resolved): same NAME different number (name_dup),
  // and same NUMBER different child (id_conflict). `force` carries the teacher's
  // choice back to the API: 'name' = add anyway, 'replace' = give the number to
  // the new child.
  function addRosterStudent(r, force, request) {
    const label = r.grade || '';
    const parts = label.split(' · Section ');
    const grade = (parts[0] || '').trim();
    const section = (parts[1] || '').trim();
    const first = r.first.trim(), last = r.last.trim(), adm = r.adm.trim();

    let res = null;
    if (window.TilliAPI && window.TilliAPI.addStudent) {
      // DEMO: give this teacher scope over the section they picked (real system:
      // scope comes from the Admin invite, spec A3), then add within it.
      const scope = window.TilliAPI.ensureTeacherScope(ctx.email, ctx.school, grade, section);
      if (!scope && INVITE && INVITE.school) { setRoster({ note: { kind: 'info', text: noClassText(label) } }); return; }
      res = window.TilliAPI.addStudent({
        actorEmail: ctx.email, school_id: scope && scope.school_id,
        section_id: scope && scope.section_id,
        student_id: adm, first, last, grade, section, source: 'manual', force: force || null, request: !!request,
      });
    }

    // Past the class size (or none set) → ask before sending the child for approval.
    if (res && res.result === 'over_limit') {
      setRoster({ note: { kind: 'over_limit', force: force || null, text: overLimitText(res.room) } });
      return;
    }

    // Same name, different admission number → ask before adding a possible duplicate.
    if (res && res.result === 'name_dup') {
      setRoster({ note: { kind: 'name_dup',
        text: `“${first} ${last}” has the same name as a student already on your list (#${res.matched.student_id}). If these are two different children, add them anyway.` } });
      return;
    }
    // Same admission number, different child → teacher chooses who keeps the number.
    if (res && res.result === 'id_conflict') {
      setRoster({ note: { kind: 'id_conflict', adm, existing: res.existing, incoming: res.incoming,
        text: `Admission number #${adm} already belongs to ${res.existing.name}. Two children can’t share it — who should keep #${adm}?` } });
      return;
    }
    // Merged: idempotent re-add (same name+number) OR the teacher chose "replace"
    // on a conflict → the number now belongs to the new child; update that row.
    if (res && res.result === 'merged') {
      const s = res.student || {};
      const nm = ((s.first || first) + ' ' + (s.last || last)).trim();
      const idx = r.students.findIndex((x) => normAdm(x.adm) === normAdm(adm));
      let students;
      if (idx >= 0) {
        students = r.students.slice();
        students[idx] = Object.assign({}, students[idx], { first: s.first || first, last: s.last || last, claimCode: s.claimCode || students[idx].claimCode });
      } else {
        students = r.students.concat([{ first, last, adm, grade, section, claimCode: s.claimCode }]);
      }
      setRoster({ students, first: '', last: '', adm: '', note: { kind: 'merged',
        text: force === 'replace' ? `#${adm} now belongs to ${nm}. 🌱` : `#${adm} was already on your list — updated that student instead of duplicating.` } });
      return;
    }
    // Created (or API unavailable → local add) → one new record.
    const rec = { first, last, adm, grade, section, claimCode: res && res.student && res.student.claimCode };
    const sent = res && res.result === 'requested';
    setRoster({ students: r.students.concat([rec]), first: '', last: '', adm: '', note: sent
      ? { kind: 'requested', text: `${first} planted 🌱 — sent to your school admin for approval. You can assess them meanwhile.` }
      : { kind: 'created', text: `${first} planted 🌱` } });
  }
  const normAdm = (s) => String(s == null ? '' : s).trim().toUpperCase();

  // ============================================================
  //  WIRING
  // ============================================================
  function wire() {
    // generic actions
    root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => handleAct(b.dataset.act)));
    // Ask-for-your-class pop-up: grade dropdown (or typed), backdrop / Escape cancel, focus inside.
    const askOvl = root.querySelector('[data-ask-ovl]');
    if (askOvl) {
      const gs = askOvl.querySelector('[data-ask-grade]');
      if (gs) gs.addEventListener('change', () => setDemo(gs.value === '__other' ? { askOther: true, askGrade: '' } : { askOther: false, askGrade: gs.value }));
      askOvl.addEventListener('click', (e) => { if (e.target === askOvl) setDemo({ askOpen: false }); });
      askOvl.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDemo({ askOpen: false }); });
      if (!askOvl.contains(document.activeElement)) {
        const first = state.demo.askOther ? askOvl.querySelector('[data-demo="askGrade"]') : (askOvl.querySelector('[data-ask-grade]') || askOvl.querySelector('[data-demo="askGrade"]'));
        if (first) { if (first.tagName === 'INPUT') focusEnd(first); else first.focus(); }
      }
    }

    // demo text inputs (gender / education are custom dropdowns — see [data-sel-*] below).
    // Patched in place (no re-render) so the caret is preserved while typing.
    root.querySelectorAll('[data-demo]').forEach((el) => {
      const key = el.dataset.demo;
      el.addEventListener('input', (e) => {
        let v = e.target.value;
        if (key === 'age' || key === 'years') { v = v.replace(/[^0-9]/g, '').slice(0, 2); el.value = v; }
        state.demo[key] = v; refreshDemoNext();
      });
    });

    // custom dropdowns (gender / education / resource sufficiency / roster grade)
    root.querySelectorAll('[data-sel-toggle]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = b.dataset.selToggle;
        set({ openSelect: state.openSelect === id ? null : id });
      }));
    root.querySelectorAll('[data-sel-val]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const scope = b.dataset.selScope, key = b.dataset.selId, val = b.dataset.selVal;
        state.openSelect = null;
        if (scope === 'roster') setRoster({ [key]: val }); else setDemo({ [key]: val });
      }));
    // If an open menu would overflow below the viewport, flip it above the field.
    const openMenu = root.querySelector('.onb-sel-menu');
    if (openMenu) {
      const trg = openMenu.parentElement.querySelector('.onb-sel-trigger');
      const r = trg.getBoundingClientRect();
      if (window.innerHeight - r.bottom < openMenu.offsetHeight + 16 && r.top > openMenu.offsetHeight + 16) {
        openMenu.classList.add('up');
      }
    }

    // country / city autocomplete
    root.querySelectorAll('[data-demo-ac]').forEach((el) => {
      const key = el.dataset.demoAc;
      el.addEventListener('input', (e) => {
        if (key === 'country') setDemo({ country: e.target.value, countryOpen: true, city: '', cityOpen: false });
        else setDemo({ city: e.target.value, cityOpen: true, countryOpen: false });
      });
      el.addEventListener('focus', () => {
        if (key === 'country') setDemo({ countryOpen: true, cityOpen: false });
        else setDemo({ cityOpen: true, countryOpen: false });
      });
    });
    root.querySelectorAll('[data-country]').forEach((b) =>
      b.addEventListener('click', () => setDemo({ country: b.dataset.country, countryOpen: false, city: '', cityOpen: false })));
    root.querySelectorAll('[data-city]').forEach((b) =>
      b.addEventListener('click', () => setDemo({ city: b.dataset.city, cityOpen: false })));

    // grade pills + section / subject / resource checkboxes
    root.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => toggleGrade(+b.dataset.grade)));
    root.querySelectorAll('[data-sec]').forEach((b) => b.addEventListener('click', () => toggleIn('secs', b.dataset.sec)));
    root.querySelectorAll('[data-subject]').forEach((b) => b.addEventListener('click', () => toggleIn('subjects', b.dataset.subject)));
    root.querySelectorAll('[data-resource]').forEach((b) => b.addEventListener('click', () => toggleIn('resources', b.dataset.resource)));

    // self-assessment answers
    root.querySelectorAll('[data-scale]').forEach((b) => b.addEventListener('click', () => selfPick(+b.dataset.scale)));
    root.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => selfPick(b.dataset.choice)));
    const ta = root.querySelector('[data-self-text]');
    if (ta) {
      ta.addEventListener('input', (e) => {
        state.selfAnswers[answerKey(state.selfQ)] = e.target.value;
        const nx = root.querySelector('[data-act="self-next"]');
        if (nx) nx.disabled = !selfAnswered(state.selfQ);
      });
      focusEnd(ta);
    }

    // roster inputs
    root.querySelectorAll('[data-roster]').forEach((el) => {
      const key = el.dataset.roster;
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, (e) => {
        if (el.tagName !== 'SELECT' && (key === 'first' || key === 'last' || key === 'adm')) {
          state.roster[key] = e.target.value;
          const add = root.querySelector('[data-act="roster-add"]');
          if (add) add.disabled = !rosterAddValid();
          return;
        }
        setRoster({ [key]: e.target.value });
      });
    });
    root.querySelectorAll('[data-method]').forEach((b) => b.addEventListener('click', () => setRoster({ method: b.dataset.method })));

    // student sheet — patched in place so carets survive typing; add/remove rerender
    function syncFinish() { const f = root.querySelector('[data-act="roster-finish"]'); if (f) f.disabled = !sheetValid(); }
    const groups = state.roster.groups || [];
    const pair = (v) => String(v).split('-').map(Number);
    root.querySelectorAll('[data-rowk]').forEach((el) => {
      el.addEventListener('input', (e) => {
        const g = groups[+el.dataset.rowg], i = +el.dataset.rowi, k = el.dataset.rowk;
        if (g && g.rows[i]) {
          g.rows[i][k] = e.target.value;
          delete g.rows[i].force; delete g.rows[i].request;   // edited → re-check on commit
          if (state.roster.issues) delete state.roster.issues[el.dataset.rowg + '-' + i];
        }
        syncFinish();
      });
    });
    // one grade·section dropdown per group (open one at a time via openSelect)
    root.querySelectorAll('[data-gs-toggle]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = 'grpgs-' + b.dataset.gsToggle;
        set({ openSelect: state.openSelect === id ? null : id });
      }));
    root.querySelectorAll('[data-gs-opt]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = groups[+b.dataset.gsOpt];
        if (g) g.gs = b.dataset.gsVal;
        set({ openSelect: null });   // rerenders → new value + closed menu
      }));
    root.querySelectorAll('[data-rowadd]').forEach((b) => b.addEventListener('click', () => {
      const g = groups[+b.dataset.rowadd]; if (!g) return;
      g.rows.push(blankRow()); render();
      const ins = root.querySelectorAll(`[data-rowg="${b.dataset.rowadd}"][data-rowk="first"]`);
      if (ins.length) ins[ins.length - 1].focus();
    }));
    root.querySelectorAll('[data-rowdel]').forEach((b) => b.addEventListener('click', () => {
      const [gi, i] = pair(b.dataset.rowdel), g = groups[gi]; if (!g) return;
      g.rows.splice(i, 1);
      if (!g.rows.length) g.rows.push(blankRow());
      state.roster.issues = {};
      render();
    }));
    const grpAdd = root.querySelector('[data-groupadd]');
    if (grpAdd) grpAdd.addEventListener('click', () => { groups.push(blankGroup(nextFreeGS())); render(); });
    root.querySelectorAll('[data-groupdel]').forEach((b) => b.addEventListener('click', () => {
      groups.splice(+b.dataset.groupdel, 1);
      state.roster.issues = {};
      render();
    }));
    // "Different child — add anyway" on a same-name row → force past the name check
    root.querySelectorAll('[data-rowforce]').forEach((b) => b.addEventListener('click', () => {
      const [gi, i] = pair(b.dataset.rowforce), g = groups[gi];
      if (g && g.rows[i]) g.rows[i].force = 'name';
      delete state.roster.issues[b.dataset.rowforce];
      render();
    }));
    // "Send for approval" on a row past the class size → add it as Pending
    root.querySelectorAll('[data-rowreq]').forEach((b) => b.addEventListener('click', () => {
      const [gi, i] = pair(b.dataset.rowreq), g = groups[gi];
      if (g && g.rows[i]) g.rows[i].request = true;
      delete state.roster.issues[b.dataset.rowreq];
      render();
    }));

    const csv = root.querySelector('[data-roster-csv]');
    if (csv) csv.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const n = Math.max(0, String(rd.result).trim().split(/\r?\n/).length - 1);
        setRoster({ csvMsg: '✓ ' + f.name + ' — ' + n + (n === 1 ? ' student' : ' students') + ' ready to plant' });
      };
      rd.readAsText(f);
    });
    root.querySelectorAll('[data-roster-pic]').forEach((pic) => pic.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      setRoster({ picMsg: "✓ Picture received — we'll read the names and plant them in " + (state.roster.grade || 'your garden') + '.' });
    }));

    // keep focus on the name/first field at the start of a fresh text step
    const firstText = root.querySelector('.onb-card input.input[data-demo="name"], .onb-card input.input[data-roster="first"]');
    if (firstText && !document.activeElement.closest('.onb-card')) { /* no autosteal */ }
  }

  function refreshDemoNext() {
    const nx = root.querySelector('[data-act="demo-next"]');
    if (nx) nx.disabled = !demoValid();
  }
  function focusEnd(el) {
    try { el.focus(); const v = el.value.length; el.setSelectionRange(v, v); } catch (e) {}
  }

  // ---- state mutations ----
  function toggleGrade(gi) {
    const g = Object.assign({}, state.demo.gradesSel);
    const secs = Object.assign({}, state.demo.secs);
    if (g[gi]) { delete g[gi]; allowedSecs(gi).forEach((sx) => delete secs[gi + '-' + sx]); }
    else g[gi] = true;
    setDemo({ gradesSel: g, secs });
  }
  function toggleIn(mapKey, item) {
    const m = Object.assign({}, state.demo[mapKey]);
    if (m[item]) delete m[item]; else m[item] = true;
    setDemo({ [mapKey]: m });
  }
  function selfPick(v) {
    state.selfAnswers = Object.assign({}, state.selfAnswers, { [answerKey(state.selfQ)]: v });
    render();
  }

  // ---- navigation ----
  function handleAct(act) {
    switch (act) {
      case 'intro-next': set({ phase: 'demo' }); break;
      case 'demo-next': {
        if (!demoValid()) return;
        const d = state.demo;
        if (d.step < 4) setDemo({ step: d.step + 1, countryOpen: false, cityOpen: false });
        else set({ phase: 'greet' });
        break;
      }
      case 'greet-next': set(SELF.length ? { phase: 'assess', selfQ: 0 } : { phase: 'done' }); break;
      case 'self-next': {
        if (!selfAnswered(state.selfQ)) return;
        if (state.selfQ >= SELF.length - 1) {
          if (state.reflectOnly) finishReflectionOnly();
          else set({ phase: 'done' });
        } else set({ selfQ: state.selfQ + 1 });
        break;
      }
      case 'to-roster': syncRosterToPicks(); set({ phase: 'roster' }); break;
      case 'ask-open': setDemo({ askOpen: true }); break;
      case 'ask-cancel': setDemo({ askOpen: false }); break;
      case 'ask-send': sendClassRequest(); break;
      case 'ask-undo': undoClassRequest(); break;
      case 'roster-add': {
        const r = state.roster;
        if (!rosterAddValid()) return;   // all fields (first, last, admission #) required
        addRosterStudent(r);
        break;
      }
      // Conflict resolution (buttons live inside the note — see rosterNoteHTML):
      case 'roster-ignore-add': addRosterStudent(state.roster, 'name'); break;       // two kids, same name → add anyway
      case 'roster-request-add': addRosterStudent(state.roster, (state.roster.note || {}).force, true); break;   // past the class size → Pending
      case 'roster-conflict-replace': addRosterStudent(state.roster, 'replace'); break; // give the number to the new child
      case 'roster-conflict-keep': {                                                 // existing child keeps the number
        const n = state.roster.note || {}; const inc = n.incoming || {};
        const incNm = ((inc.first || '') + ' ' + (inc.last || '')).trim();
        setRoster({ adm: '', note: { kind: 'info',
          text: `${(n.existing && n.existing.name) || 'The existing student'} keeps #${n.adm}. Enter a different admission number for “${incNm}”.` } });
        break;
      }
      case 'roster-dismiss-note': setRoster({ note: null }); break;
      case 'roster-finish': {
        const m = state.roster.method;
        // CSV / picture are demo stubs (no real parse yet) — just enter the garden.
        // Manual sheet funnels its rows through the dedupe guard before finishing.
        if (m === 'csv' || m === 'pic') finishOnboard();
        else commitSheet();
        break;
      }
      case 'roster-skip': state.roster = Object.assign({}, state.roster, { groups: [], students: [] }); finishOnboard(); break;
      case 'replay': replayOnboarding(); break;
      case 'reflect-cancel': {
        // Leave without saving: put the previous answers back.
        state.selfAnswers = (state.reflectOnly && state.reflectOnly.prevAnswers) || state.selfAnswers;
        state.reflectOnly = null; state.startNav = 'profile';
        set({ phase: 'complete' });
        break;
      }
      case 'onb-back': onbBack(); break;
    }
  }

  function onbBack() {
    const p = state.phase;
    if (p === 'demo') {
      const d = state.demo;
      if (d.step > 1) setDemo({ step: d.step - 1, countryOpen: false, cityOpen: false });
      else set({ phase: 'intro' });
    } else if (p === 'assess') {
      if (state.selfQ > 0) set({ selfQ: state.selfQ - 1 });
      else set({ phase: 'greet' });
    } else if (p === 'roster') {
      const r = state.roster;
      if (r.method) setRoster({ method: null, csvMsg: '', picMsg: '' });
      else set({ phase: 'done' });
    }
  }

  // One dated answer set on the Teaching Mirror timeline.
  function snapshot(kind, answers, at) {
    const LABEL = { pre: 'Pre-training', post: 'Post-training', retake: 'Retaken reflection' };
    return { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), kind, label: LABEL[kind] || 'Reflection',
      at: at || new Date().toISOString(), answers: Object.assign({}, answers) };
  }
  // Reflection-only run (e.g. the post-training survey): save a new snapshot
  // and go back to the profile, where the Mirror shows it.
  // Mirror a self-report into the shared store so the admin views can see it
  // (the full answers stay in this teacher's own saved state too).
  function shareSelfReport(kind) {
    try {
      const A = window.TilliAPI, sc = A && A.resolveSchool ? A.resolveSchool(ctx.school) : null;
      if (sc && A.saveSelfReport) A.saveSelfReport(sc.school_id, ctx.email, kind, state.selfAnswers);
    } catch (e) {}
  }
  // The name typed in "About yourself" becomes the teacher's name everywhere (Tilli + school dashboards).
  function shareName() {
    try { const A = window.TilliAPI, nm = state.demo && state.demo.name; if (A && A.setDisplayName && nm) A.setDisplayName(ctx.email, nm); } catch (e) {}
  }
  function finishReflectionOnly() {
    const ro = state.reflectOnly;
    state.reflections = state.reflections.concat([snapshot(ro.kind, state.selfAnswers)]);
    shareSelfReport(ro.kind);
    state.reflectOnly = null;
    state.startNav = 'profile';
    persist();
    set({ phase: 'complete' });
  }
  function finishOnboard() {
    const now = new Date().toISOString();
    state.onboarded = true;
    if (!state.joinedAt) state.joinedAt = now;   // first completion only — redo keeps it
    // The first finished setup is the first mirror; a full "Redo reflection" adds one.
    if (Object.keys(state.selfAnswers).length && (state.replaying || !state.reflections.length)) {
      const kind = state.reflections.length ? 'retake' : 'pre';
      state.reflections = state.reflections.concat([snapshot(kind, state.selfAnswers, now)]);
      shareSelfReport(kind);
    }
    shareName();
    if (state.replaying) state.startNav = 'profile';
    state.replaying = false;
    persist({ completedAt: now });
    // `new=1` is a one-shot sign-up flag. Consume it here so a page reload no
    // longer forces the reflection intro — a returning/reloading teacher whose
    // onboarding is saved now boots straight into the dashboard. (To redo the
    // reflection on purpose, use "Redo reflection" in the profile panel.)
    consumeNewFlag();
    set({ phase: 'complete' });
  }

  // Drops ?new=1 from the address bar without a navigation, and flips ctx.isNew
  // so boot()'s "already-onboarded → dashboard" check passes on the next reload.
  function consumeNewFlag() {
    if (!ctx.isNew) return;
    ctx.isNew = false;
    try {
      const u = new URL(location.href);
      u.searchParams.delete('new');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  // Return to the reflection flow from the dashboard (profile → "Redo reflection").
  function replayOnboarding() {
    const onb = document.getElementById('onb');
    const dashRoot = document.getElementById('dash-root');
    if (dashRoot) dashRoot.style.display = 'none';
    if (onb) onb.style.display = '';
    dashboardMounted = false;   // re-mount on finish so the profile shows the new answers
    state.replaying = true;
    set({ phase: 'intro', selfQ: 0 });
  }
  // Re-take ONLY the reflection questions (no demographics / roster) — used by
  // the post-training survey. Starts blank; finishing adds a mirror snapshot.
  function takeReflection(kind, label) {
    const onb = document.getElementById('onb');
    const dashRoot = document.getElementById('dash-root');
    if (dashRoot) dashRoot.style.display = 'none';
    if (onb) onb.style.display = '';
    dashboardMounted = false;   // re-mount after so the Mirror shows the new snapshot
    state.reflectOnly = { kind: kind || 'post', label: label || 'Post-training', prevAnswers: state.selfAnswers };
    state.selfAnswers = {};
    set({ phase: 'greet', selfQ: 0 });
  }
  // Jump straight to the "add students" step (used by the dashboard empty state
  // when a teacher landed with no students). Finishing re-mounts the dashboard
  // with the new roster via enterDashboard's signature check.
  function goToAddStudents() {
    const onb = document.getElementById('onb');
    const dashRoot = document.getElementById('dash-root');
    if (dashRoot) dashRoot.style.display = 'none';
    if (onb) onb.style.display = '';
    setRoster({ method: null, csvMsg: '', picMsg: '', note: null, issues: {} });
    set({ phase: 'roster' });
  }

  // ---- hooks the dashboard calls (it owns its own in-memory data) ----
  // Students the teacher added from inside the dashboard. Saved to this
  // teacher's roster (and its sheet groups) WITHOUT re-mounting the dashboard.
  function appendStudents(list) {
    const r = state.roster;
    const students = (r.students || []).slice();
    const groups = r.groups || (r.groups = []);
    (list || []).forEach((s) => {
      if (!s || !(s.first || '').trim()) return;
      if (s.adm && students.some((x) => normAdm(x.adm) === normAdm(s.adm))) return;
      students.push({ first: s.first, last: s.last || '', adm: s.adm || '', grade: s.grade || '', section: s.section || '', uid: s.uid || null });
      const gs = (s.grade || '') + (s.section ? ' · Section ' + s.section : '');
      let g = groups.find((x) => x.gs === gs);
      if (!g) { g = { gs, rows: [] }; groups.push(g); }
      g.rows = g.rows.filter(rowComplete);
      g.rows.push({ first: s.first, last: s.last || '', adm: s.adm || '' });
    });
    state.roster = Object.assign({}, r, { students, groups });
    persist();
    dashboardRosterSig = rosterSig();   // dashboard already shows them — don't re-mount
  }
  // Student profile "Edit" → new name / UID for one child (matched by admission #).
  function updateStudent(adm, p) {
    const key = normAdm(adm); if (!key) return;
    const r = state.roster;
    const students = (r.students || []).map((s) => (normAdm(s.adm) === key ? Object.assign({}, s, p) : s));
    (r.groups || []).forEach((g) => g.rows.forEach((row) => {
      if (normAdm(row.adm) === key) { if (p.first != null) row.first = p.first; if (p.last != null) row.last = p.last; }
    }));
    state.roster = Object.assign({}, r, { students });
    persist();
    dashboardRosterSig = rosterSig();   // dashboard already updated itself — don't re-mount
  }
  // Profile "Edit details" → merge into the demographic record.
  function updateDemo(patch) {
    state.demo = Object.assign({}, state.demo, patch || {});
    persist();
    return state.demo;
  }
  // A finished teacher observation for one student in one window.
  function saveObservation(winKey, adm, ratings) {
    if (!winKey || !adm) return;
    const w = Object.assign({}, state.observations[winKey]);
    w[adm] = { ratings: Object.assign({}, ratings), at: new Date().toISOString() };
    state.observations = Object.assign({}, state.observations, { [winKey]: w });
    const d = Object.assign({}, state.obsDrafts[winKey]);   // finished → no longer a draft
    delete d[adm];
    state.obsDrafts = Object.assign({}, state.obsDrafts, { [winKey]: d });
    persist();
  }
  // An unfinished observation — called on every rating tap. Empty ratings clear it.
  function saveObservationDraft(winKey, adm, ratings) {
    if (!winKey || !adm) return;
    const d = Object.assign({}, state.obsDrafts[winKey]);
    if (ratings && Object.keys(ratings).length) d[adm] = { ratings: Object.assign({}, ratings), at: new Date().toISOString() };
    else delete d[adm];
    state.obsDrafts = Object.assign({}, state.obsDrafts, { [winKey]: d });
    persist();
  }
  window.TilliOnboarding = {
    replay: replayOnboarding, addStudents: goToAddStudents,
    appendStudents, updateDemo, saveObservation, saveObservationDraft, updateStudent, takeReflection,
    options: { genders: GENDERS, education: EDU_LEVELS },
  };

  // close autocomplete menus / custom dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (state.phase === 'demo' && !e.target.closest('.onb-ac') && (state.demo.countryOpen || state.demo.cityOpen)) {
      setDemo({ countryOpen: false, cityOpen: false });
      return;
    }
    if (state.openSelect && !e.target.closest('.onb-sel')) set({ openSelect: null });
  });
})();
