/* ============================================================
   Tilli Measures — landing "Get started" flow
   Parent:  role → school → email → (login | signup) → child select
   School:  role → email → (login | school → school code → signup)
            The email decides who you are (teacher / school admin / group admin);
            only a brand-new email picks a school and proves it with the code.
   Vanilla state machine, no framework. Renders into #flow-root.
   ============================================================ */
(function () {
  const DS = '_ds/tilli/assets/';
  const LOGO = DS + 'logos/tilli-wordmark-crop.png';
  const ACCT_KEY = 'tilliMeasures.accounts';

  const SCHOOLS = [
    'Little Sprouts School', 'Greenfield International School', 'Sunrise Public School',
    'Meadow Montessori', 'Bright Beginnings Academy', 'Lotus Valley School',
    'Riverside Primary', 'Banyan Tree School', 'Marigold Learning Centre',
    'Colombo Kids Academy', 'Kandy Hill School', "St. Mary's Convent",
  ];
  // Schools created in the Platform Admin wizard live in the shared TilliAPI
  // store; fold their names into the picker so teachers/parents/coordinators can
  // select them at login. (De-duped against the demo list above by name.)
  function schoolNames() {
    let created = [];
    if (window.TilliAPI && window.TilliAPI.listSchools) {
      created = window.TilliAPI.listSchools()
        .filter((s) => s.source === 'created').map((s) => s.name);
    }
    const seen = {}, out = [];
    created.concat(SCHOOLS).forEach((n) => { const k = n.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(n); } });
    return out;
  }
  const GRADES = ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
  // Minimum characters before the school dropdown reveals any matches —
  // below this the list just shows a "keep typing" hint (no full school list).
  const SCHOOL_MIN_CHARS = 3;

  // ---- roster the school uploaded (demo stand-in for the school's student list) ----
  // Admission numbers are matched case-insensitively after trimming.
  // Prefer the dummy-school dataset (school-data.js → window.TILLI_SCHOOL);
  // fall back to a tiny inline roster if that file isn't loaded.
  const ROSTER = (window.TILLI_SCHOOL && window.TILLI_SCHOOL.students)
    ? window.TILLI_SCHOOL.students.map((s) => ({ adm: s.adm, first: s.first, last: s.last, grade: s.grade, section: s.section }))
    : [
      { adm: 'ADM-2041', first: 'Aarav', last: 'Sharma',   grade: 'Grade 1', section: 'A' },
      { adm: 'ADM-2044', first: 'Meera', last: 'Nair',     grade: 'Grade 3', section: 'B' },
      { adm: 'ADM-2050', first: 'Kabir', last: 'Fernando', grade: 'Grade 2', section: 'C' },
      { adm: 'ADM-2058', first: 'Isha',  last: 'Perera',   grade: 'Grade 4', section: 'A' },
      { adm: 'ADM-2063', first: 'Rohan', last: 'Mendis',   grade: 'Kindergarten', section: 'B' },
    ];
  const normAdm = (s) => String(s == null ? '' : s).trim().toUpperCase();
  const findStudent = (adm) => {
    const q = normAdm(adm);
    return q ? ROSTER.find((r) => normAdm(r.adm) === q) || null : null;
  };

  // ---- flower trio placement (GUI-controllable) on the "Add your child" screen ----
  const FLOWER_CFG = { offsetX: 16, offsetY: 240, scale: 1.1, spacing: 86, baseX: 40, groundY: 140 };
  const FLOWER_DEFAULTS = Object.assign({}, FLOWER_CFG);
  const FLOWER_CONTROLS = [
    { key: 'offsetX', label: 'Flower Offset X', min: -240, max: 240, step: 1,    tip: 'Horizontal shift of the whole flower trio, in pixels. Negative moves left.' },
    { key: 'offsetY', label: 'Flower Offset Y', min: -200, max: 240, step: 1,    tip: 'Vertical shift of the whole flower trio, in pixels. Negative moves up.' },
    { key: 'scale',   label: 'Flower Scale',    min: 0.4,  max: 2,   step: 0.05, tip: 'Overall size multiplier for the flower trio (1 = default size).' },
    { key: 'spacing', label: 'Flower Spacing',  min: 30,   max: 140, step: 1,    tip: 'Horizontal gap between adjacent flowers, in SVG units. Larger spreads them apart.' },
    { key: 'baseX',   label: 'Flower Base X',   min: 0,    max: 200, step: 1,    tip: 'X-position of the leftmost (bloom) flower within the SVG, in SVG units.' },
    { key: 'groundY', label: 'Flower Ground Y', min: 60,   max: 140, step: 1,    tip: 'Baseline the flowers stand on. Larger values sit the flowers lower.' },
  ];
  function applyFlowers() {
    const host = document.getElementById('cf-flowers');
    if (host && window.renderMiniFlowers) window.renderMiniFlowers(host, FLOWER_CFG);
  }
  function ensureFlowerGUI() {
    if (document.getElementById('flower-gui')) return;
    const panel = document.createElement('div');
    panel.id = 'flower-gui';
    panel.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;background:#fff;border:1px solid #ECEEF2;border-radius:14px;box-shadow:0 12px 30px rgba(20,20,20,.14);padding:14px 16px;width:252px;font-family:Montserrat,sans-serif';
    const row = (c) => `
      <label title="${esc(c.tip)}" style="display:block;margin:10px 0 0;cursor:ns-resize">
        <span style="display:flex;justify-content:space-between;align-items:baseline;font-size:11.5px;font-weight:700;color:#F0A84A">
          <span>${esc(c.label)} <span title="Newly added control" style="color:#F0A84A">*</span></span>
          <span data-fg-val="${c.key}" style="color:#5B6170;font-weight:600;font-family:'Quicksand',sans-serif">${FLOWER_CFG[c.key]}</span>
        </span>
        <input type="range" data-fg-input="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${FLOWER_CFG[c.key]}" style="width:100%;accent-color:#56C02B;margin-top:3px">
      </label>`;
    const btn = 'font-family:Montserrat,sans-serif;font-weight:700;font-size:12px;border-radius:999px;padding:7px 14px;cursor:pointer';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
        <b style="font-size:13px;color:#1e2230">Flower controls</b>
        <button data-fg="reset" title="Reset all flower controls to their default values" style="${btn};border:1px solid #ECEEF2;background:#fff;color:#5B6170">Reset</button>
      </div>
      ${FLOWER_CONTROLS.map(row).join('')}
      <button data-fg="copy" title="Copy the current flower values to the clipboard as JSON, ready to bake in" style="${btn};border:none;background:#56C02B;color:#fff;width:100%;margin-top:14px">Copy values</button>`;
    document.body.appendChild(panel);

    const refresh = () => {
      FLOWER_CONTROLS.forEach((c) => {
        const inp = panel.querySelector(`[data-fg-input="${c.key}"]`);
        const val = panel.querySelector(`[data-fg-val="${c.key}"]`);
        if (inp) inp.value = FLOWER_CFG[c.key];
        if (val) val.textContent = FLOWER_CFG[c.key];
      });
    };
    panel.querySelectorAll('[data-fg-input]').forEach((inp) => inp.addEventListener('input', (ev) => {
      const key = inp.dataset.fgInput;
      FLOWER_CFG[key] = parseFloat(ev.target.value);
      const val = panel.querySelector(`[data-fg-val="${key}"]`);
      if (val) val.textContent = FLOWER_CFG[key];
      applyFlowers();
    }));
    panel.querySelector('[data-fg="reset"]').addEventListener('click', () => { Object.assign(FLOWER_CFG, FLOWER_DEFAULTS); refresh(); applyFlowers(); });
    panel.querySelector('[data-fg="copy"]').addEventListener('click', (ev) => {
      const txt = JSON.stringify(FLOWER_CFG);
      try { navigator.clipboard.writeText(txt); } catch (e) {}
      const b = ev.currentTarget; const old = b.textContent; b.textContent = 'Copied ✓';
      setTimeout(() => { b.textContent = old; }, 1200);
    });
  }
  function removeFlowerGUI() {
    const g = document.getElementById('flower-gui');
    if (g) g.remove();
  }

  // ---- account store (demo: teacher@tilli.edu / parent@tilli.edu pre-exist) ----
  // The dummy-school accounts (school-data.js) are also seeded as existing.
  const SCHOOL_PW = (window.TILLI_SCHOOL && window.TILLI_SCHOOL.passwords) || {};
  function loadAccounts() {
    let a = {};
    try { a = JSON.parse(localStorage.getItem(ACCT_KEY) || '{}'); } catch (e) {}
    if (!a['teacher@tilli.edu']) a['teacher@tilli.edu'] = true;
    if (!a['parent@tilli.edu']) a['parent@tilli.edu'] = true;
    Object.keys(SCHOOL_PW).forEach((e) => { if (!a[e]) a[e] = true; });
    return a;
  }
  // Does this email have an invited account? (checked separately so we can force
  // the temp-password gate + first-login reset).
  function invitedAccount(email) {
    return (window.TilliAPI && window.TilliAPI.getAccount) ? window.TilliAPI.getAccount(email) : null;
  }
  // Accounts listed in SCHOOL_PW require their exact password; invited accounts
  // require their temp/own password (via TilliAPI); everything else keeps the
  // loose demo behaviour (any non-empty password works).
  function passwordOk(email, pw) {
    const acct = invitedAccount(email);
    if (acct) return window.TilliAPI.checkPassword(email, pw).ok;
    const want = SCHOOL_PW[String(email || '').toLowerCase()];
    return want == null ? true : pw === want;
  }
  // `meta` ({ role, school }) lets a self-signed-up teacher be found by email
  // alone next time (School path is email-first). Older entries are just `true`.
  function saveAccount(email, meta) {
    const a = loadAccounts();
    a[email.toLowerCase()] = meta || true;
    try { localStorage.setItem(ACCT_KEY, JSON.stringify(a)); } catch (e) {}
  }

  // ---- state ----
  const state = {
    // start|role|school|email|checking|login|schoolcode|signup|children|childLoading|childForm|childVerify|childConfirm
    step: 'start',
    role: null,
    school: '', schoolQuery: '', schoolListOpen: false,
    email: '', password: '',
    schoolCode: '',      // teacher self-sign-up: the code that verifies the picked school
    codeSchool: null,    // the verified school record
    found: null,         // School path: what the email resolved to ({ kind:'school'|'group', school })
    kids: [],
    child: { first: '', last: '', adm: '', grade: '', section: '' },
    match: null,          // roster student matched by admission number (legacy fallback)
    // Secure parent claim (spec §5, verify-before-reveal). B1 collects the id,
    // B2 the second factor; nothing about the child is known until verify passes.
    claim: { challengeId: null, factor: 'code', code: '', reveal: null, token: null, retryAt: 0 },
    errs: {}, shake: false,
    forgotSent: false,   // "Forgot password?" clicked on the login screen
  };
  const SESSION_KEY = 'tilliMeasures.session';
  // Records who is signed in for the downstream pages (parent.html reads this
  // instead of trusting a URL param — spec §5 downstream hardening).
  function setSession(role, email) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify({ role, email: String(email || '').toLowerCase() })); } catch (e) {}
  }
  let checkTimer, shakeTimer, loadTimer;

  const root = document.getElementById('flow-root');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  function set(patch) { Object.assign(state, patch); render(); }

  // ---- google icon markup ----
  // Google's brand colours — illustration art, kept exact.
  const GOOGLE = { blue: '#4285F4', green: '#34A853', yellow: '#FBBC05', red: '#EA4335' };
  const gIcon = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="${GOOGLE.blue}" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
    <path fill="${GOOGLE.green}" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
    <path fill="${GOOGLE.yellow}" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"/>
    <path fill="${GOOGLE.red}" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
  </svg>`;

  // eye (password hidden) / eye-off (password visible) toggle icon
  const eyeIcon = (shown) => shown
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

  const brandMark = `<span class="lockup">
    <img src="${LOGO}" alt="Tilli">
    <span class="divider"></span>
    <span class="measures">Measures</span>
  </span>`;

  // ---- navigation actions ----
  // School admin accounts resolve by email —
  // the "School" role card is shared with teachers; the email decides which
  // dashboard opens (spec: "Route by email/account", like the teacher path).
  const admin = (window.TILLI_SCHOOL && window.TILLI_SCHOOL.findAdmin) ? window.TILLI_SCHOOL.findAdmin : () => null;
  // Demo School Group Admin logins → group id ('*' = anyone else). Invited group
  // admins carry their own group_id on the account instead.
  const DEMO_GROUP_ADMINS = { 'group@vidyatrust.org': 'g-vidya', 'group@lankalearning.lk': 'g-lanka', '*': 'g-vidya' };

  // School path (blue card) is email-first: does this email already belong to a
  // school or a school group? Returns { kind:'group' } | { kind:'school', school }
  // | null (new → pick school + school code). Checked in order: group admins,
  // staff memberships in any school, invited school accounts, demo leadership,
  // then teachers who self-signed-up on this device.
  const DEMO_SCHOOL = (window.TILLI_SCHOOL && window.TILLI_SCHOOL.school && window.TILLI_SCHOOL.school.name) || 'Little Sprouts School';
  function lookupSchoolAccount(email) {
    const e = String(email || '').trim().toLowerCase();
    if (!e) return null;
    const API = window.TilliAPI;
    const acct = invitedAccount(e);
    if ((acct && acct.group_id && !acct.school_id) || DEMO_GROUP_ADMINS[e]) return { kind: 'group' };
    if (API && API.listSchools && API.roleOf) {
      const sc = API.listSchools().find((x) => { const r = API.roleOf(e, x.school_id); return r && r !== 'parent'; });
      if (sc) return { kind: 'school', school: sc.name };
    }
    if (acct && acct.school_id) {
      const sc = API && API.resolveSchool ? API.resolveSchool(acct.school_id) : null;
      if (sc) return { kind: 'school', school: sc.name };
    }
    if (admin(e)) return { kind: 'school', school: DEMO_SCHOOL };
    const saved = loadAccounts()[e];
    if (saved && typeof saved === 'object' && saved.role === 'teacher') return { kind: 'school', school: saved.school || DEMO_SCHOOL };
    if (e === 'teacher@tilli.edu' || (saved === true && SCHOOL_PW[e] && e !== 'team@tilli.org' && !/example\.com$/.test(e))) return { kind: 'school', school: DEMO_SCHOOL };
    return null;
  }

  // A school-path email that turned out to be a group admin opens the group view.
  function enterFound() { if (state.role === 'teacher' && state.found && state.found.kind === 'group') state.role = 'group'; }

  function go() {
    // Parents agree to the consent (current version) before anything else —
    // the parent app, adding a child, or a session. Not ticking the required box
    // doesn't lock them out for good; they just can't go on until they do.
    if (state.role === 'parent' && window.TilliAPI && window.TilliAPI.needsConsent && window.TilliAPI.needsConsent(state.email)) {
      const prev = window.TilliAPI.consentFor(state.email);
      set({ step: 'consent', consentPick: Object.assign({}, prev && prev.items), errs: {} });
      return;
    }
    // A session link (pre / post outside the phases) goes straight into that
    // session — never to a dashboard. Parents don't add a child for it.
    const SL = state.sessionLink;
    if (SL && (state.role === 'parent' || state.role === 'teacher')) {
      setSession(state.role === 'parent' ? 'parent' : 'teacher', state.email);
      window.location.href = 'assess.html?session=' + encodeURIComponent(SL.id) + '&part=' + encodeURIComponent(SL.part)
        + '&email=' + encodeURIComponent(state.email);
      return;
    }
    // "New" = the teacher is activating an account: a fresh signup (create
    // password) OR a temp-password holder who just set their own (setpw). Both
    // should land in onboarding; a returning "enter password" login should not.
    const isNew = state.step === 'signup' || state.step === 'setpw';
    // Tilli Team → the internal managing platform (NOT a single school).
    // A cross-school portfolio, analytics and ops surface lives at tilli.html.
    if (state.role === 'tilli') {
      setSession('tilli', state.email);
      window.location.href = 'tilli.html?email=' + encodeURIComponent(state.email);
      return;
    }
    // School Group Admin → the group view of the platform console. The group
    // comes from their invitation; demo emails (and any other) fall back to Vidya Trust.
    if (state.role === 'group') {
      const acct = invitedAccount(state.email);
      const gid = (acct && acct.group_id) || DEMO_GROUP_ADMINS[state.email.toLowerCase()] || DEMO_GROUP_ADMINS['*'];
      setSession('group', state.email);
      window.location.href = 'tilli.html?group=' + encodeURIComponent(gid) + '&email=' + encodeURIComponent(state.email);
      return;
    }
    if (state.role === 'teacher') {
      // A created school (from the wizard) lives in the shared store. Route by
      // the account's REAL role there: coordinator → admin dashboard, teacher →
      // teacher dashboard, anyone else with the join code → teacher self-join.
      const created = (window.TilliAPI && window.TilliAPI.resolveSchool)
        ? window.TilliAPI.resolveSchool(state.school) : null;
      if (created && created.source === 'created') {
        const role = window.TilliAPI.roleOf(state.email, created.school_id);
        if (role === 'admin') {
          setSession('coordinator', state.email);
          window.location.href = 'admin.html?school=' + encodeURIComponent(created.school_id)
            + '&email=' + encodeURIComponent(state.email) + '&from=login';
          return;
        }
        setSession('teacher', state.email);
        let turl = 'teacher.html?school=' + encodeURIComponent(created.school_id)
          + '&email=' + encodeURIComponent(state.email);
        if (role !== 'teacher' || isNew) turl += '&new=1';   // unknown email → onboard/self-join
        window.location.href = turl;
        return;
      }
      // Leadership email → admin dashboard (never the onboarding flow).
      const a = admin(state.email);
      if (a) {
        setSession(a.role || 'coordinator', state.email);
        window.location.href = 'admin.html?school=' + encodeURIComponent(state.school)
          + '&email=' + encodeURIComponent(state.email);
        return;
      }
      // New teachers run the self-reflection onboarding; returning teachers
      // whose onboarding is already saved skip straight to their dashboard.
      let url = 'teacher.html?school=' + encodeURIComponent(state.school)
        + '&email=' + encodeURIComponent(state.email);
      if (isNew) url += '&new=1';
      window.location.href = url;
      return;
    }
    // Parent is now signed in — record it for the downstream page.
    setSession('parent', state.email);
    // Pull the logged-in parent's linked children from the guard layer
    // (active ParentLinks only — spec §7 "own children"). This reflects any
    // child the parent has securely claimed, and it persists across reloads.
    const linked = (window.TilliAPI && window.TilliAPI.childrenForParent)
      ? window.TilliAPI.childrenForParent(state.email)
      : [];
    let kids;
    if (linked.length) {
      kids = linked.map((s, i) => ({
        name: s.first,
        status: i === 0 ? 'assessment complete' : 'assessment pending',
        meta: { grade: s.grade, section: s.section, adm: s.student_id || s.adm },
      }));
    } else if (isNew) {
      kids = [];
    } else {
      // Fallback demo children (used by the generic parent@tilli.edu account).
      kids = [
        { name: 'Aarav', status: 'assessment complete', meta: { grade: 'Grade 1', section: 'A', adm: 'ADM-2041' } },
        { name: 'Meera', status: 'assessment pending',  meta: { grade: 'Grade 3', section: 'B', adm: 'ADM-2044' } },
      ];
    }
    set({ step: 'children', kids });
  }
  function goHome(childName, meta) {
    let url = 'parent.html?school=' + encodeURIComponent(state.school) + '&child=' + encodeURIComponent(childName);
    if (meta) {
      if (meta.grade) url += '&grade=' + encodeURIComponent(meta.grade);
      if (meta.section) url += '&section=' + encodeURIComponent(meta.section);
      if (meta.adm) url += '&adm=' + encodeURIComponent(meta.adm);
    }
    window.location.href = url;
  }

  // ---- render ----
  function render() {
    const s = state.step;
    const authOpen = s !== 'start' && s !== 'children' && s !== 'childForm'
      && s !== 'childLoading' && s !== 'childVerify' && s !== 'childConfirm' && s !== 'consent';

    // Flower controls live only on the "Add your child" screen.
    if (s !== 'childForm') removeFlowerGUI();

    if (s === 'start') { root.innerHTML = ''; prevAuthStep = null; return; }
    if (s === 'children') { root.innerHTML = childSelectView(); wire(); return; }
    if (s === 'childLoading') { root.innerHTML = childLoadingView(); wireLoader(); return; }
    if (s === 'childForm') { root.innerHTML = childFormView(); wire(); applyFlowers(); return; }
    if (s === 'childVerify') { root.innerHTML = childVerifyView(); wire(); return; }
    if (s === 'childConfirm') { root.innerHTML = childConfirmView(); wire(); return; }
    if (s === 'consent') { root.innerHTML = consentView(); wire(); return; }
    if (authOpen) { renderAuth(); }
  }

  // ===== AUTH DIALOG =====
  // The backdrop is built once and kept in the DOM for the whole auth flow.
  // Only the white card is swapped between steps: the outgoing card is pinned
  // in place and slid out while the incoming card slides in from the side.
  const AUTH_ORDER = { role: 0, school: 1, email: 2, checking: 3, login: 4, schoolcode: 4, signup: 6, setpw: 5 };
  // School path runs email-first, so its school picker comes after the email check.
  const AUTH_ORDER_SCHOOL = { role: 0, email: 1, checking: 2, login: 3, school: 3, schoolcode: 3, confirmschool: 4, signup: 5, setpw: 4 };
  const authOrder = (step) => (state.role === 'teacher' ? AUTH_ORDER_SCHOOL : AUTH_ORDER)[step];
  let prevAuthStep = null;
  let slideCleanup = null;

  function dialogCard() {
    const s = state.step;
    // No Back on the forced first-login reset — the temp password is spent.
    const showBack = s !== 'role' && s !== 'checking' && s !== 'setpw';
    let inner = '';

    if (s === 'role') inner = roleView();
    else if (s === 'school') inner = schoolView();
    else if (s === 'email') inner = emailView();
    else if (s === 'checking') inner = checkingView();
    else if (s === 'login') inner = loginView(false);
    else if (s === 'schoolcode') inner = schoolCodeView();
    else if (s === 'confirmschool') inner = confirmSchoolView();
    else if (s === 'signup') inner = loginView(true);
    else if (s === 'setpw') inner = setPwView();

    return `<div class="dialog" role="dialog" aria-label="Get started with Tilli Measures">
        ${showBack ? `<button class="btn-ghost dialog-back focus" data-act="back">&#8592; Back</button>` : ''}
        <button class="dialog-close focus" data-act="close" aria-label="Close">&#215;</button>
        <div class="dlg-logo"><img src="${LOGO}" alt="Tilli"></div>
        ${state.sessionLink && s !== 'role' ? `<p class="text-center" style="margin:-4px 0 14px"><span class="pill-info">You&rsquo;re taking: ${esc(state.sessionLink.name)}${state.sessionLink.partLabel ? ' · ' + esc(state.sessionLink.partLabel) : ''}</span></p>` : ''}
        ${inner}
      </div>`;
  }

  function renderAuth() {
    let ov = root.querySelector('.overlay');
    const firstOpen = !ov;
    if (firstOpen) {
      root.innerHTML = '<div class="overlay" data-close-overlay></div>';
      ov = root.querySelector('.overlay');
      ov.addEventListener('click', (ev) => { if (ev.target === ov) closeAuth(); });
    }

    const tmp = document.createElement('div');
    tmp.innerHTML = dialogCard();
    const newDialog = tmp.firstElementChild;
    const oldDialog = ov.querySelector('.dialog:not([data-leaving])');

    // Same-step re-render (typing in / opening the school list) — swap the
    // card's contents in place, no slide. It's the same popup, just updated.
    if (!firstOpen && oldDialog && state.step === prevAuthStep) {
      oldDialog.replaceWith(newDialog);
      wire(newDialog);
      return;
    }

    if (firstOpen || !oldDialog) {
      ov.appendChild(newDialog);
      prevAuthStep = state.step;
      wire(newDialog);
      return;
    }

    // wrap up any transition still in flight before starting a new one
    if (slideCleanup) slideCleanup();

    const back = (authOrder(state.step) ?? 99) < (authOrder(prevAuthStep) ?? -1);

    // pin the outgoing card so the incoming one gets centered on its own
    const ol = oldDialog.offsetLeft, ot = oldDialog.offsetTop, ow = oldDialog.offsetWidth;
    oldDialog.setAttribute('data-leaving', '');
    oldDialog.style.position = 'absolute';
    oldDialog.style.left = ol + 'px';
    oldDialog.style.top = ot + 'px';
    oldDialog.style.width = ow + 'px';
    oldDialog.style.margin = '0';
    oldDialog.style.pointerEvents = 'none';
    oldDialog.classList.add(back ? 'dlg-out-right' : 'dlg-out-left');

    newDialog.classList.add(back ? 'dlg-in-left' : 'dlg-in-right');
    ov.appendChild(newDialog);

    let done = false;
    slideCleanup = function () {
      if (done) return;
      done = true;
      if (oldDialog.parentNode) oldDialog.parentNode.removeChild(oldDialog);
      slideCleanup = null;
    };
    oldDialog.addEventListener('animationend', slideCleanup, { once: true });
    setTimeout(slideCleanup, 420); // safety net (reduced motion / rapid clicks)

    prevAuthStep = state.step;
    wire(newDialog);
  }

  function roleView() {
    const card = (accent, icon, label, sub, role) => `
      <button class="ui-card outline lift role-card focus" data-role="${role}" style="border-color:${accent}">
        <span class="ic-circle" style="background:${accent}"><img src="${DS}icons/${icon}" alt="" aria-hidden="true"></span>
        <span>
          <span class="lbl">${label}</span>
          <span class="sub">${sub}</span>
        </span>
      </button>`;
    return `
      <h2 class="dlg-title">Who are you?</h2>
      <p class="dlg-sub">We'll set up the right garden for you.</p>
      <div class="stack">
        ${card('var(--yellow-500)', 'family.png', 'Parent / Home', "Follow your child's assessments", 'parent')}
        ${card('var(--cyan-500)', 'graduation-cap.png', 'School', 'See your whole class garden', 'teacher')}
        ${card('var(--green-500)', 'sparkle.png', 'Tilli Team', 'Internal view across the school', 'tilli')}
      </div>`;
  }

  function schoolView() {
    const isTeacher = state.role !== 'parent';   // teacher + Tilli Team see the school-facing wording
    const q = (state.schoolQuery || '').trim().toLowerCase();
    // Group link: the list is just that group's schools, so show it all up front.
    const GL = state.groupLink;
    // Only search once the user has typed enough — no full-list-on-focus.
    const enoughChars = GL ? true : q.length >= SCHOOL_MIN_CHARS;
    const ALL = GL ? GL.schools : schoolNames();
    const matches = enoughChars ? ALL.filter((x) => x.toLowerCase().includes(q)) : [];
    const exactish = ALL.some((x) => x.toLowerCase() === q);
    const canContinue = !!(state.school || state.schoolQuery.trim());
    const listItems = matches.map((name) => `
      <button role="option" class="ui-menu-item school-opt focus${state.school === name ? ' on' : ''}" data-school="${esc(name)}">
        <span class="ui-dot sm"></span>${esc(name)}
      </button>`).join('');
    const hint = !enoughChars
      ? `<div class="dlg-hint">Type at least ${SCHOOL_MIN_CHARS} letters to search&#8230;</div>`
      : '';
    const noMatch = enoughChars && !exactish && matches.length === 0;

    // School path: we only get here for an email with no account yet.
    const sub = GL
      ? `This link was shared by <b>${esc(GL.name)}</b>. Pick your school to continue.`
      : state.role === 'teacher'
        ? `No account yet for <b class="break-all">${esc(state.email)}</b>. Pick your school to join it.`
        : 'Start typing to find it in the list.';
    return `
      <h2 class="dlg-title">${GL ? `Pick your school in ${esc(GL.name)}` : isTeacher ? 'Select your school' : 'Which school does your child go to?'}</h2>
      <p class="dlg-sub">${sub}</p>
      <div>
        <span class="select-wrap">
          <input id="school-input" class="input focus" value="${esc(state.schoolQuery)}" placeholder="Select school" aria-label="Search school" autocomplete="off" style="padding-right:40px" autofocus>
        </span>
        ${state.schoolListOpen ? `
          <div role="listbox" class="ui-menu school-menu">
            ${hint}
            ${listItems}
            ${noMatch ? `<div class="dlg-hint">No match &#8212; <span style="color:var(--green-500)">use &#8220;${esc(state.schoolQuery)}&#8221;</span></div>` : ''}
          </div>` : ''}
      </div>
      <button class="btn btn-primary block focus mt-4" data-act="school-continue" ${canContinue ? '' : 'disabled'}>Continue &#8594;</button>`;
  }

  function emailView() {
    const isTilli = state.role === 'tilli', isGroup = state.role === 'group';
    const pill = isTilli
      ? `<span class="pill-info">Tilli Team &#183; internal</span>`
      : isGroup ? `<span class="pill-info">School group</span>`
      : state.role === 'teacher' ? `<span class="pill-info">School &#183; teachers, admins &amp; school groups</span>`
      : `<span class="pill-info">${esc(state.school)}</span>`;
    const hint = isTilli
      ? 'Demo: use team@tilli.org to sign in to the internal platform.'
      : isGroup ? 'Demo: use group@vidyatrust.org (Vidya Trust) or group@lankalearning.lk (Lanka Learning Network).'
      : state.role === 'teacher'
        ? 'Demo: teacher@tilli.edu (teacher), meera.krishnan@littlesprouts.edu (school admin) or group@vidyatrust.org (school group) sign in. Any new email signs up — Little Sprouts school code: LSPR-2210.'
        : 'Demo: use parent@tilli.edu or teacher@tilli.edu to sign in, or any new email to sign up.';
    return `
      <h2 class="dlg-title">Enter your email</h2>
      <p class="text-center" style="margin:0 0 20px">${pill}</p>
      <form id="email-form" class="dlg-form">
        <input id="email-input" class="input focus" type="email" required value="${esc(state.email)}" placeholder="you@email.com" aria-label="Email address" autofocus>
        <button type="submit" class="btn btn-primary block focus">Enter &#8594;</button>
      </form>
      <p class="dlg-hint text-center" style="margin-top:14px">${hint}</p>`;
  }

  function checkingView() {
    return `
      <div style="text-align:center;padding:24px 0 14px">
        <div class="spinner" style="margin:0 auto 18px"></div>
        <p class="dlg-sub" style="font-weight:700;margin:0">Checking if your account exists&#8230;</p>
        <p class="dlg-hint break-all" style="margin-top:6px">${esc(state.email)}</p>
      </div>`;
  }

  function loginView(isSignup) {
    const verb = isSignup ? 'Create' : 'Enter';
    return `
      <h2 class="dlg-title">${isSignup ? 'Create your Tilli account' : 'Enter your Tilli account'}</h2>
      <p class="dlg-sub break-all">${esc(state.email)}</p>
      ${state.role === 'teacher' && state.school ? `<p class="text-center" style="margin:-10px 0 18px"><span class="pill-info">${isSignup ? 'Joining ' : ''}${esc(state.school)}</span></p>` : ''}
      <button class="btn-ghost md btn-google focus" data-act="google">${gIcon} ${verb} via Google</button>
      <div class="or-rule">OR</div>
      <form id="pw-form" class="dlg-form ${state.shake ? 'tm-shake' : ''}">
        <div style="position:relative">
          <input id="pw-input" class="input focus ${state.errs.pw ? 'err' : ''}" type="password" required placeholder="${isSignup ? 'Create a password' : 'Enter your password'}" aria-label="Password" value="${esc(state.password)}" style="padding-right:44px">
          <button type="button" id="pw-toggle" class="focus" aria-label="Show password" aria-pressed="false" title="Show password" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:none;background:none;cursor:pointer;color:var(--ink-450);border-radius:var(--radius-sm)">${eyeIcon(false)}</button>
        </div>
        ${state.errs.pw ? `<p class="err-text">That password doesn't match this account. Please try again.</p>` : ''}
        ${isSignup ? '' : `<button type="button" data-act="forgot" class="btn-link muted focus" style="align-self:flex-end;margin-top:-4px">Forgot password?</button>`}
        ${!isSignup && state.forgotSent ? `<p class="dlg-hint" style="color:var(--ink-600);line-height:1.5">To reset your password, contact your school admin — they can re-send an invite that lets you set a new one.</p>` : ''}
        <button type="submit" class="btn btn-primary block focus">${verb} via password &#8594;</button>
      </form>`;
  }

  // ===== School sign-up (new email, School role) =====
  // The school code decides the school — no search — then the teacher confirms it.
  function schoolCodeView() {
    const e = state.errs.code;
    return `
      <h2 class="dlg-title">Enter your school code</h2>
      <p class="dlg-sub">Your school admin can share it with you. It tells us which school you&rsquo;re joining.</p>
      <form id="code-form" class="dlg-form ${state.shake ? 'tm-shake' : ''}">
        <input id="code-input" class="input focus ${e ? 'err' : ''}" required value="${esc(state.schoolCode)}" placeholder="e.g. ABCD-1234" aria-label="School code" autocomplete="off" autocapitalize="characters" spellcheck="false" style="text-align:center;letter-spacing:.12em;font-weight:700;text-transform:uppercase" autofocus>
        ${e ? `<p class="err-text text-center">${esc(e)}</p>` : ''}
        <button type="submit" class="btn btn-primary block focus">Verify &#8594;</button>
      </form>`;
  }
  // "Is this your school?" — after the code, before the password. Name, place
  // and board(s), so a teacher with the wrong code never joins the wrong school.
  function confirmSchoolView() {
    const sc = state.codeSchool || {};
    const place = [sc.city, sc.country].filter(Boolean).join(', ');
    const boards = (sc.boards && sc.boards.length ? sc.boards : [sc.board]).filter(Boolean).join(' · ');
    return `
      <h2 class="dlg-title">Is this your school?</h2>
      <div class="dlg-schoolcard">
        <b>${esc(sc.name || '')}</b>
        ${place ? `<span>${esc(place)}</span>` : ''}
        ${boards ? `<span>${esc(boards)}</span>` : ''}
      </div>
      <div class="dlg-form">
        <button class="btn btn-primary block focus" data-act="confirm-school">Yes, that&rsquo;s my school &#8594;</button>
        <button class="btn-link muted focus" data-act="not-my-school" style="align-self:center">Not my school</button>
      </div>`;
  }
  // First-login password reset — shown once, right after an invited account
  // signs in with its temporary password. They set their own password here.
  function setPwView() {
    const e = state.errs;
    // Invited accounts carry their role + school_id; surface "joining as … for …"
    // so the person knows which invite they're accepting before setting a password.
    const acct = invitedAccount(state.email);
    const sc = acct && acct.school_id && window.TilliAPI && window.TilliAPI.resolveSchool
      ? window.TilliAPI.resolveSchool(acct.school_id) : null;
    const roleLabel = acct && acct.role ? String(acct.role).replace(/\b\w/g, (c) => c.toUpperCase()) : '';
    const joinLine = roleLabel
      ? `<p class="dlg-hint text-center" style="font-weight:700;color:var(--ink-450);margin:-14px 0 20px">Joining as <span style="color:var(--ink-700)">${esc(roleLabel)}</span>${sc && sc.name ? ` for <span style="color:var(--ink-700)">${esc(sc.name)}</span>` : ''}</p>`
      : '';
    return `
      <h2 class="dlg-title">Set your password</h2>
      <p class="dlg-sub break-all">${esc(state.email)}</p>
      ${joinLine}
      <form id="setpw-form" class="dlg-form ${state.shake ? 'tm-shake' : ''}">
        <input id="np-input" class="input focus ${e.np ? 'err' : ''}" type="password" required placeholder="New password (min 6 characters)" aria-label="New password" value="${esc(state.password)}">
        <input id="np-confirm" class="input focus ${e.np ? 'err' : ''}" type="password" required placeholder="Confirm new password" aria-label="Confirm new password">
        ${e.np ? `<p class="err-text">${esc(e.np)}</p>` : ''}
        <button type="submit" class="btn btn-primary block focus">Set password &amp; continue &#8594;</button>
      </form>`;
  }

  // ===== CHILD SELECT (parent) =====
  function childSelectView() {
    const sub = state.kids.length
      ? 'Tap a child to see how their garden is growing.'
      : 'Add your first child to get started.';
    const kids = state.kids.map((k, i) => {
      const done = k.status.indexOf('complete') >= 0;
      return `<button class="ui-card outline lift child-card focus${done ? ' done' : ''}" data-child-idx="${i}">
        <span class="head">
          <span class="ic-circle sm${done ? '' : ' yellow'}"><img src="${DS}icons/smiley.png" alt="" aria-hidden="true"></span>
          <span class="nm">${esc(k.name)}</span>
        </span>
        <span class="st">${esc(k.status)}</span>
      </button>`;
    }).join('');

    return `<div class="sheet">
      <div class="sheet-wrap wide">
        <div class="sheet-head wrap">
          ${brandMark}
          <span class="pill-info ml-auto">${esc(state.school)}</span>
        </div>
        <h1 class="sheet-title">Select the child you want to know more about</h1>
        <p class="sheet-sub">${sub}</p>
        <div style="display:flex;flex-wrap:wrap;gap:16px">
          ${kids}
          <button class="ui-card outline lift add-child-tile focus" data-act="add-child">+ add child</button>
        </div>
      </div>
    </div>`;
  }

  // ===== ADD CHILD — short "getting the notepad" loading screen =====
  const PENCILS = [
    encodeURI('assets/Pencil Yellow.webp'),
    encodeURI('assets/Pencil Green.webp'),
    encodeURI('assets/Pencil Blue.webp'),
  ];
  const LOADING_MS = 2400; // how long the notepad screen lingers before the form
  // Pencil/text size & placement are baked in .pencil-load-wrap (tilli.css).

  function childLoadingView() {
    const pics = PENCILS.map((src, i) =>
      `<img class="pencil pencil-${i + 1}" src="${src}" alt="" draggable="false">`).join('');
    return `<div class="sheet">
      <div class="pencil-load-wrap">
        <div class="pencil-loader">${pics}</div>
        <p class="pencil-load-msg">Getting our notepad to note down your child&#39;s details&hellip;</p>
      </div>
    </div>`;
  }

  function wireLoader() {
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => set({ step: 'childForm' }), LOADING_MS);
  }

  // ===== Parent consent (before the parent app) =====
  // Wording + version live in TilliAPI.consentConfig. The required box gates
  // Continue; optional ones never do. Re-shown when the version changes.
  function consentView() {
    const cfg = window.TilliAPI.consentConfig(), pick = state.consentPick || {};
    const ready = cfg.items.every((it) => !it.required || pick[it.id]);
    const rows = cfg.items.map((it) => `<label class="consent-row${it.required ? ' req' : ''}">
        <input type="checkbox" data-consent="${esc(it.id)}"${pick[it.id] ? ' checked' : ''}>
        <span>${esc(it.text)}${it.required ? ' <b class="consent-tag">Required</b>' : ' <span class="consent-tag opt">Optional</span>'}</span>
      </label>`).join('');
    return `<div class="sheet">
      <div class="sheet-wrap">
        <div class="sheet-head">${brandMark}<button class="btn-ghost focus ml-auto" data-act="consent-later">Not now</button></div>
        <h1 class="sheet-title">${esc(cfg.title)}</h1>
        <p class="sheet-sub">${esc(cfg.intro)}</p>
        <div class="ui-card roomy sheet-form">
          ${rows}
          ${cfg.privacyUrl ? `<a class="btn-link" href="${esc(cfg.privacyUrl)}" target="_blank" rel="noopener">Read the full privacy notice</a>` : ''}
          <p class="dlg-hint">${ready ? 'You can change this any time from your profile.' : 'Tick the required box to continue. You can come back and do it later.'}</p>
          <button class="btn btn-primary block focus" data-act="consent-ok"${ready ? '' : ' disabled'}>Continue &#8594;</button>
        </div>
      </div>
    </div>`;
  }

  // ===== Enter the child's admission number =====
  // Parents need no code (decided 26 Oct 2026): a matching admission number goes
  // straight to "Is this your child?". The old code step (childVerifyView) is kept
  // but no longer reached.
  function childFormView() {
    const c = state.child, e = state.errs;
    return `<div class="sheet">
      <div class="sheet-wrap">
        <div class="sheet-head">
          ${brandMark}
          <button class="btn-ghost focus ml-auto" data-act="child-back">&#8592; Back</button>
        </div>
        <h1 class="sheet-title">Add your child</h1>
        <p class="sheet-sub">Enter your child&#39;s admission number at ${esc(state.school || 'their school')}. You&#39;ll check it&#39;s the right child next.</p>
        <form id="child-form" class="ui-card roomy sheet-form ${state.shake ? 'tm-shake' : ''}">
          <label class="field">Admission number *
            <input id="cf-adm" class="input focus ${e.adm || e.notfound || e.locked ? 'err' : ''}" value="${esc(c.adm)}" placeholder="Enter admission number of your child" autofocus>
          </label>
          ${e.notfound ? `<p class="err-text">We can&#39;t find that admission number at ${esc(state.school)}. Check it on a school letter or ask the school office.</p>` : ''}
          ${e.locked ? `<p class="err-text">Too many tries — please wait a few minutes, then try again.</p>` : ''}
          <button type="submit" class="btn btn-primary block focus mt-1">Continue &#8594;</button>
        </form>
        <div id="cf-flowers" style="width:min(264px,70%);margin:clamp(28px,5vh,52px) auto 0"></div>
      </div>
    </div>`;
  }

  // ===== B2 — second factor (verification code). Verify BEFORE reveal =====
  // A wrong id and a wrong code look identical here (spec §5 B2 / acceptance #8):
  // the same generic message, and after N tries the attempt is locked.
  function childVerifyView() {
    const e = state.errs, cl = state.claim;
    const locked = !!e.locked;
    const mins = locked ? Math.max(1, Math.ceil((cl.retryAt - Date.now()) / 60000)) : 0;
    const banner = (e.mismatch || locked) ? `
      <div class="ui-note danger">
        <span aria-hidden="true" style="flex:none;font-size:var(--fs-md);line-height:1.3">&#9888;&#65039;</span>
        <span>
          ${locked
            ? `Too many attempts. For your child&#39;s safety, please try again in about ${mins} minute${mins === 1 ? '' : 's'}.`
            : `Those details don&#39;t match. Check the admission number and code your school gave you, and try again.`}</span>
      </div>` : '';
    return `<div class="sheet">
      <div class="sheet-wrap">
        <div class="sheet-head">
          ${brandMark}
          <button class="btn-ghost focus ml-auto" data-act="child-back">&#8592; Back</button>
        </div>
        <h1 class="sheet-title">Verify it&#39;s your child</h1>
        <p class="sheet-sub">Enter the verification code your school shared for this child. This keeps every child&#39;s information private.</p>
        <form id="verify-form" class="ui-card roomy sheet-form ${state.shake ? 'tm-shake' : ''}">
          <label class="field">Verification code *
            <input id="cf-code" class="input focus ${(e.code || e.mismatch) ? 'err' : ''}" value="${esc(cl.code)}" placeholder="e.g. TIL-AB12" autocomplete="off" ${locked ? 'disabled' : 'autofocus'}>
          </label>
          ${banner}
          <button type="submit" class="btn btn-primary block focus mt-1" ${locked ? 'disabled' : ''}>Verify &#8594;</button>
        </form>
        <p class="dlg-hint text-center" style="margin-top:16px">Don&#39;t have a code? Ask your child&#39;s teacher or school office.</p>
      </div>
    </div>`;
  }

  // "Grade 1, Section A" — or, once the school has renamed the class, its name
  // with the fixed base in brackets: "Sunflowers Rose (Grade 1A)".
  function classMeta(m) {
    const A = window.TilliAPI;
    const plain = [m.grade, m.section && 'Section ' + m.section].filter(Boolean).join(', ');
    const sc = A && A.sectionLabel && A.resolveSchool ? A.resolveSchool(state.school) : null;
    if (!sc || !m.grade) return plain;
    if (!m.section) return A.gradeLabel(sc.school_id, m.grade);
    const label = A.sectionLabel(sc.school_id, m.grade, m.section), base = A.sectionBase(sc.school_id, m.grade, m.section);
    return base && label.endsWith(' (' + base + ')') ? label : plain;
  }

  // ===== B3 — reveal + confirm (only reached after a correct second factor) =====
  function childConfirmView() {
    // Details come from the verified reveal, never from a client-side roster lookup.
    const m = state.claim.reveal || state.match || {};
    const full = (m.name || `${m.first || ''} ${m.last || ''}`).trim();
    const gradeSection = classMeta(m);
    return `<div class="sheet">
      <div class="sheet-wrap">
        <div class="sheet-head">
          ${brandMark}
          <button class="btn-ghost focus ml-auto" data-act="child-back">&#8592; Back</button>
        </div>
        <h1 class="sheet-title">We found your child</h1>
        <p class="sheet-sub">Please confirm this is the right student.</p>
        <div class="ui-card outline roomy confirm-card">
          <span class="ic-circle" style="margin:0 0 14px"><img src="${DS}icons/smiley.png" alt="" aria-hidden="true"></span>
          <p class="pill-info" style="display:inline-block;margin:0 0 14px">Admission number &middot; ${esc(m.student_id || m.adm)}</p>
          <p style="font-weight:700;font-size:var(--fs-xl);color:var(--ink-900);margin:0 0 4px">${esc(full)}</p>
          <p class="dlg-sub" style="margin:0">${esc(gradeSection)}</p>
          <p class="dlg-hint" style="color:var(--green-700);margin-top:16px;line-height:1.5">Understand <b>${esc(full)}</b> with Tilli Measures.</p>
        </div>
        <button class="btn btn-primary block focus" data-act="confirm-child" style="margin-top:18px">Yes, that's my child &#8594;</button>
        <button class="btn-link muted link-center focus" data-act="not-child">Not your child? Click here</button>
      </div>
    </div>`;
  }

  // ---- event wiring (delegated per render) ----
  function wire(scope) {
    scope = scope || root;
    // buttons with data-act / data-role / data-child etc.
    scope.querySelectorAll('[data-role]').forEach((b) =>
      b.addEventListener('click', () => {
        const role = b.dataset.role;
        state.groupLink = null;   // picking a role by hand leaves any group-link scope
        state.sessionLink = null; // …and any session link
        // Tilli Team is internal — it doesn't belong to a school, so skip the
        // school picker and go straight to the email/password step.
        // Same for a School Group Admin: their scope is a group, not one school.
        if (role === 'tilli' || role === 'group') {
          set({ step: 'email', role, school: role === 'tilli' ? 'Tilli Internal' : 'School group', schoolQuery: '', schoolListOpen: false, email: '', password: '' });
          return;
        }
        // School (teachers, school admins, group admins): email first — it decides
        // whether this is a sign-in or a new teacher joining a school.
        if (role === 'teacher') {
          set({ step: 'email', role, school: '', schoolQuery: '', schoolListOpen: false, email: '', password: '', found: null });
          return;
        }
        set({ step: 'school', role, school: '', schoolQuery: '', schoolListOpen: false });
      }));

    scope.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (ev) => handleAct(b.dataset.act, ev)));
    scope.querySelectorAll('[data-consent]').forEach((cb) => cb.addEventListener('change', () => {
      state.consentPick = Object.assign({}, state.consentPick, { [cb.dataset.consent]: cb.checked });
      render();
    }));

    // school input
    const si = scope.querySelector('#school-input');
    if (si) {
      si.addEventListener('input', (ev) => set({ schoolQuery: ev.target.value, school: '', schoolListOpen: true }));
      si.addEventListener('focus', () => { if (!state.schoolListOpen) set({ schoolListOpen: true }); });
      restoreCaret(si);
    }
    scope.querySelectorAll('.school-opt').forEach((b) =>
      b.addEventListener('click', () => set({ school: b.dataset.school, schoolQuery: b.dataset.school, schoolListOpen: false })));

    // email form
    const ef = scope.querySelector('#email-form');
    if (ef) {
      const ei = scope.querySelector('#email-input');
      ei.addEventListener('input', (ev) => { state.email = ev.target.value; });
      ef.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const email = (ei.value || '').trim();
        if (!email) return;
        set({ email, step: 'checking', password: '', forgotSent: false });
        clearTimeout(checkTimer);
        checkTimer = setTimeout(() => {
          // School path: the email alone finds the account (teacher, school admin
          // or group admin). New email → school code → "Is this your school?" →
          // create password. School users never search for their school.
          if (state.role === 'teacher') {
            const found = lookupSchoolAccount(email);
            if (found) set({ step: 'login', found, school: found.school || '' });
            else set({ step: 'schoolcode', found: null, school: '', schoolCode: '', codeSchool: null, errs: {} });
            return;
          }
          const exists = !!loadAccounts()[email.toLowerCase()] || !!invitedAccount(email);
          set({ step: exists ? 'login' : 'signup' });
        }, 900);
      });
    }

    // school code form (teacher self-sign-up)
    const cfm = scope.querySelector('#code-form');
    if (cfm) {
      const ci = scope.querySelector('#code-input');
      ci.addEventListener('input', (ev) => {
        state.schoolCode = ev.target.value;
        if (state.errs.code) { state.errs = {}; ev.target.classList.remove('err'); }
      });
      cfm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const code = (ci.value || '').trim();
        if (!code) return;
        // The code alone finds the school. Never says which school a wrong code is for.
        const sc = window.TilliAPI && window.TilliAPI.resolveSchoolCode ? window.TilliAPI.resolveSchoolCode(code) : null;
        const GL = state.groupLink;
        const msg = !sc ? 'We don’t recognise that code. Codes change sometimes — ask your school office for the current one.'
          : GL && GL.schools.indexOf(sc.name) < 0 ? `That code isn’t for a school in ${GL.name}. Check it with your school office.`
          : state.sessionLink && sc.school_id !== state.sessionLink.schoolId ? `This session is for ${state.sessionLink.schoolName}. Use that school’s code.` : '';
        if (msg) {
          set({ errs: { code: msg }, shake: true, schoolCode: code });
          clearTimeout(shakeTimer);
          shakeTimer = setTimeout(() => set({ shake: false }), 450);
          return;
        }
        set({ step: 'confirmschool', codeSchool: sc, school: '', schoolCode: code, errs: {} });
      });
    }

    // password form
    const pf = scope.querySelector('#pw-form');
    if (pf) {
      const pi = scope.querySelector('#pw-input');
      // show / hide password toggle
      const pt = scope.querySelector('#pw-toggle');
      if (pt) pt.addEventListener('click', () => {
        const show = pi.type === 'password';
        pi.type = show ? 'text' : 'password';
        pt.innerHTML = eyeIcon(show);
        pt.setAttribute('aria-pressed', String(show));
        pt.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        pt.setAttribute('title', show ? 'Hide password' : 'Show password');
        pi.focus();
      });
      pi.addEventListener('input', (ev) => {
        state.password = ev.target.value;
        if (state.errs.pw) { state.errs = {}; ev.target.classList.remove('err'); }
      });
      pf.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const pw = (pi.value || '').trim();
        if (!pw) return;
        // Login (existing account): enforce a known password when one is set.
        if (state.step === 'login' && !passwordOk(state.email, pw)) {
          set({ errs: { pw: true }, shake: true });
          clearTimeout(shakeTimer);
          shakeTimer = setTimeout(() => set({ shake: false }), 450);
          return;
        }
        // Invited accounts signing in with their temp password must choose their
        // own password before continuing.
        const acct = state.step === 'login' ? invitedAccount(state.email) : null;
        if (acct && acct.mustReset) { set({ step: 'setpw', password: '', errs: {} }); return; }
        if (state.step === 'signup') saveAccount(state.email, state.role === 'teacher' ? { role: 'teacher', school: state.school } : null);
        enterFound();
        go();
      });
    }

    // first-login password reset (invited accounts)
    const sf = scope.querySelector('#setpw-form');
    if (sf) {
      const np = scope.querySelector('#np-input');
      const nc = scope.querySelector('#np-confirm');
      np.addEventListener('input', (ev) => { state.password = ev.target.value; if (state.errs.np) { state.errs = {}; np.classList.remove('err'); nc.classList.remove('err'); } });
      sf.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const pw = (np.value || '').trim();
        const cf = (nc.value || '').trim();
        const fail = (msg) => {
          set({ errs: { np: msg }, shake: true });
          clearTimeout(shakeTimer);
          shakeTimer = setTimeout(() => set({ shake: false }), 450);
        };
        if (pw.length < 6) return fail('Use at least 6 characters.');
        if (pw !== cf) return fail("Those passwords don't match.");
        const res = window.TilliAPI.setPassword(state.email, pw);
        if (!res.ok) return fail('Could not set the password. Try again.');
        saveAccount(state.email);   // mark known for the loose-demo account map too
        enterFound();
        go();
      });
    }

    // child select cards
    scope.querySelectorAll('.child-card').forEach((b) => b.addEventListener('click', () => {
      const k = state.kids[+b.dataset.childIdx];
      goHome(k.name, k.meta || {});
    }));

    // child form — B1: submit the admission number. We reveal NOTHING here;
    // any id opens a claim challenge and advances to the second factor.
    const cf = scope.querySelector('#child-form');
    if (cf) {
      const adm = scope.querySelector('#cf-adm');
      if (adm) adm.addEventListener('input', (ev) => {
        state.child.adm = ev.target.value;
        if (state.errs.adm) { state.errs = {}; ev.target.classList.remove('err'); }
      });
      cf.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const typed = (state.child.adm || '').trim();
        if (!typed) {
          set({ errs: { adm: true }, shake: true });
          clearTimeout(shakeTimer);
          shakeTimer = setTimeout(() => set({ shake: false }), 450);
          return;
        }
        const res = (window.TilliAPI && window.TilliAPI.claimByAdmission)
          ? window.TilliAPI.claimByAdmission(state.school, typed, state.email)
          : { ok: false, error: 'not_found' };
        if (!res.ok) {
          set({ errs: res.error === 'locked' ? { locked: true } : { notfound: true }, shake: true });
          clearTimeout(shakeTimer);
          shakeTimer = setTimeout(() => set({ shake: false }), 450);
          return;
        }
        set({
          step: 'childConfirm',
          claim: { challengeId: null, factor: null, code: '', reveal: res.child, token: res.claimToken, retryAt: 0 },
          errs: {},
        });
      });
    }

    // verify form — B2: submit the second factor. Wrong id and wrong code are
    // indistinguishable; on success we get the reveal + a one-shot claim token.
    const vf = scope.querySelector('#verify-form');
    if (vf) {
      const ci = scope.querySelector('#cf-code');
      if (ci) ci.addEventListener('input', (ev) => {
        state.claim.code = ev.target.value;
        if (state.errs.code || state.errs.mismatch) { state.errs = {}; ev.target.classList.remove('err'); }
      });
      vf.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const code = (state.claim.code || '').trim();
        if (!code) {
          set({ errs: { code: true }, shake: true });
          clearTimeout(shakeTimer);
          shakeTimer = setTimeout(() => set({ shake: false }), 450);
          return;
        }
        const res = (window.TilliAPI && window.TilliAPI.verifyClaim)
          ? window.TilliAPI.verifyClaim(state.claim.challengeId, code)
          : { ok: false, error: 'mismatch' };
        if (res.ok) {
          state.claim.reveal = res.child;
          state.claim.token = res.claimToken;
          set({ step: 'childConfirm', errs: {} });
          return;
        }
        // Failure — generic. 'locked' shows a cool-down; everything else is "doesn't match".
        const locked = res.error === 'locked';
        state.claim.retryAt = res.retryAt || 0;
        set({ errs: locked ? { locked: true } : { mismatch: true }, shake: true });
        clearTimeout(shakeTimer);
        shakeTimer = setTimeout(() => set({ shake: false }), 450);
      });
    }
  }

  // keep caret at end of school input across re-renders while typing
  let caretPos = null;
  function restoreCaret(input) {
    input.focus();
    const v = input.value.length;
    try { input.setSelectionRange(v, v); } catch (e) {}
  }

  function handleAct(act, ev) {
    switch (act) {
      case 'close': closeAuth(); break;
      case 'back': authBack(); break;
      case 'school-continue': {
        const sVal = (state.school || state.schoolQuery).trim();
        if (!sVal) return;
        // School path already has the email — the picked school is proven with its code next.
        if (state.role === 'teacher') set({ step: 'schoolcode', school: sVal, schoolListOpen: false, schoolCode: '', codeSchool: null, errs: {} });
        else set({ step: 'email', school: sVal, schoolListOpen: false, email: '', password: '' });
        break;
      }
      case 'google':
        if (state.step === 'signup') saveAccount(state.email, state.role === 'teacher' ? { role: 'teacher', school: state.school } : null);
        enterFound();
        go();
        break;
      case 'forgot':
        set({ forgotSent: true });
        break;
      case 'consent-ok': {
        const cfg = window.TilliAPI.consentConfig(), pick = state.consentPick || {};
        if (!cfg.items.every((it) => !it.required || pick[it.id])) return;
        window.TilliAPI.saveConsent(state.email, pick);
        go();
        break;
      }
      case 'consent-later':
        // Not banned — they can sign in again and agree whenever they're ready.
        try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
        set({ step: 'start', role: null, email: '', password: '', errs: {} });
        break;
      case 'confirm-school':
        set({ step: 'signup', school: (state.codeSchool || {}).name || '', password: '', errs: {} });
        break;
      case 'not-my-school':
        set({ step: 'schoolcode', codeSchool: null, schoolCode: '', errs: { code: 'That code is for a different school. Check it with your school office.' } });
        break;
      case 'pick-school-again':
        set({ step: 'school', school: '', schoolQuery: '', schoolListOpen: false, schoolCode: '', codeSchool: null, errs: {} });
        break;
      case 'add-child':
        set({ step: 'childLoading', child: { first: '', last: '', adm: '', grade: '', section: '' }, match: null,
              claim: { challengeId: null, factor: 'code', code: '', reveal: null, token: null, retryAt: 0 }, errs: {} });
        break;
      case 'child-back':
        // confirm → back to the code step; verify → back to the id; form → child list.
        if (state.step === 'childConfirm') set({ step: 'childForm', errs: {} });
        else if (state.step === 'childVerify') set({ step: 'childForm', errs: {} });
        else set({ step: 'children', errs: {} });
        break;
      case 'confirm-child': {
        // B3 — create the ParentLink (never a student), then enter the garden.
        const m = state.claim.reveal;
        if (!m) return;
        if (window.TilliAPI && window.TilliAPI.confirmClaim && state.claim.token) {
          window.TilliAPI.confirmClaim(state.claim.token, state.email);
        }
        setSession('parent', state.email);
        goHome(m.first || m.name, { grade: m.grade, section: m.section, adm: m.student_id || m.adm });
        break;
      }
      case 'not-child':
        // Discard the reveal and start a fresh claim.
        set({ step: 'childForm', match: null, child: { first: '', last: '', adm: '', grade: '', section: '' },
              claim: { challengeId: null, factor: 'code', code: '', reveal: null, token: null, retryAt: 0 }, errs: {} });
        break;
    }
  }

  function closeAuth() { clearTimeout(checkTimer); clearTimeout(loadTimer); set({ step: 'start' }); }
  function authBack() {
    clearTimeout(checkTimer);
    const s = state.step;
    const schoolPath = state.role === 'teacher';
    // School path runs email → code → confirm school → password; back walks it in reverse.
    if (s === 'school') set(schoolPath ? { step: 'email', schoolListOpen: false } : { step: 'role' });
    // Tilli Team / School Group / School skip the school step before email, so email goes back to role.
    else if (s === 'email') set({ step: state.role === 'parent' ? 'school' : 'role' });
    else if (s === 'signup' && schoolPath) set({ step: 'confirmschool', password: '', errs: {} });
    else if (s === 'confirmschool') set({ step: 'schoolcode', errs: {} });
    else if (s === 'schoolcode') set({ step: 'email', errs: {} });
    else set({ step: 'email', password: '', errs: {}, found: null });
  }

  // ---- boot ----
  document.getElementById('get-started').addEventListener('click', () =>
    set({ step: 'role', role: null, school: '', schoolQuery: '', schoolListOpen: false, groupLink: null }));

  // School-group link (index.html?group=<code>&as=parent|teacher, from Platform
  // Admin → a group's page → Group links): skip the role step and limit the school
  // picker to that group's active schools. Parents land on the picker; teachers
  // keep their email-first flow and meet the same short list if they're new.
  // Session link (index.html?session=<id>&part=pre|post|once, from Tilli → a
  // school's Sessions): the role comes from who the session is for and the
  // school is already known, so parents skip the school picker.
  (function openSessionLink() {
    const qp = new URLSearchParams(location.search);
    const id = qp.get('session'), A = window.TilliAPI;
    if (!id || !A || !A.getSession) return;
    const ss = A.getSession(id); if (!ss) return;
    const part = ss.parts[qp.get('part')] ? qp.get('part') : Object.keys(ss.parts)[0];
    const sc = A.resolveSchool(ss.school_id) || {};
    state.sessionLink = { id: ss.id, part, name: ss.name, partLabel: ss.prePost ? A.SESSION_PART_LABEL[part] : '', schoolId: ss.school_id, schoolName: sc.name || '' };
    if (ss.audience === 'Parent') set({ step: 'email', role: 'parent', school: sc.name || '', schoolQuery: sc.name || '', schoolListOpen: false, email: '', password: '', found: null });
    else set({ step: 'email', role: 'teacher', school: '', email: '', password: '', found: null });
  })();

  (function openGroupLink() {
    const qp = new URLSearchParams(location.search);
    const code = qp.get('group'), as = qp.get('as');
    const ORG = window.TILLI_ORG;
    if (!code || !ORG || !ORG.groupByCode || (as !== 'parent' && as !== 'teacher')) return;
    const g = ORG.groupByCode(code);
    if (!g || g.archived) return;
    const schools = ORG.schools.filter((s) => s.groupId === g.id && !s.archived).map((s) => s.name).sort();
    if (!schools.length) return;
    const groupLink = { name: g.name, schools };
    if (as === 'parent') set({ step: 'school', role: 'parent', groupLink, school: '', schoolQuery: '', schoolListOpen: true });
    else set({ step: 'email', role: 'teacher', groupLink, school: '', schoolQuery: '', schoolListOpen: false, email: '', password: '', found: null });
  })();
})();
