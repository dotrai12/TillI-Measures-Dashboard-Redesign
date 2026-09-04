/* ============================================================
   Tilli Measures — landing "Get started" flow
   role → school → email → (login | signup) → child select
   Teacher path routes to the teacher dashboard.
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
  function saveAccount(email) {
    const a = loadAccounts();
    a[email.toLowerCase()] = true;
    try { localStorage.setItem(ACCT_KEY, JSON.stringify(a)); } catch (e) {}
  }

  // ---- state ----
  const state = {
    // start|role|school|email|checking|login|signup|children|childLoading|childForm|childVerify|childConfirm
    step: 'start',
    role: null,
    school: '', schoolQuery: '', schoolListOpen: false,
    email: '', password: '',
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
  const gIcon = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
    <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"/>
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
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
  // School leadership accounts (coordinator / principal) resolve by email —
  // the "School" role card is shared with teachers; the email decides which
  // dashboard opens (spec: "Route by email/account", like the teacher path).
  const admin = (window.TILLI_SCHOOL && window.TILLI_SCHOOL.findAdmin) ? window.TILLI_SCHOOL.findAdmin : () => null;

  function go() {
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
      && s !== 'childLoading' && s !== 'childVerify' && s !== 'childConfirm';

    // Flower controls live only on the "Add your child" screen.
    if (s !== 'childForm') removeFlowerGUI();

    if (s === 'start') { root.innerHTML = ''; prevAuthStep = null; return; }
    if (s === 'children') { root.innerHTML = childSelectView(); wire(); return; }
    if (s === 'childLoading') { root.innerHTML = childLoadingView(); wireLoader(); return; }
    if (s === 'childForm') { root.innerHTML = childFormView(); wire(); applyFlowers(); return; }
    if (s === 'childVerify') { root.innerHTML = childVerifyView(); wire(); return; }
    if (s === 'childConfirm') { root.innerHTML = childConfirmView(); wire(); return; }
    if (authOpen) { renderAuth(); }
  }

  // ===== AUTH DIALOG =====
  // The backdrop is built once and kept in the DOM for the whole auth flow.
  // Only the white card is swapped between steps: the outgoing card is pinned
  // in place and slid out while the incoming card slides in from the side.
  const AUTH_ORDER = { role: 0, school: 1, email: 2, checking: 3, login: 4, signup: 4, setpw: 5 };
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
    else if (s === 'signup') inner = loginView(true);
    else if (s === 'setpw') inner = setPwView();

    return `<div class="dialog" role="dialog" aria-label="Get started with Tilli Measures">
        ${showBack ? `<button class="btn-ghost dialog-back focus" data-act="back">&#8592; Back</button>` : ''}
        <button class="dialog-close focus" data-act="close" aria-label="Close">&#215;</button>
        <div style="display:flex;justify-content:center;margin:10px 0 14px">
          <img src="${LOGO}" alt="Tilli" style="height:26px;width:auto;display:block">
        </div>
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

    const back = (AUTH_ORDER[state.step] ?? 99) < (AUTH_ORDER[prevAuthStep] ?? -1);

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
      <button class="focus" data-role="${role}" style="display:flex;align-items:center;gap:16px;border:2px solid ${accent};background:#fff;border-radius:24px;padding:18px;cursor:pointer;transition:transform .2s var(--ease)" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='none'">
        <span style="flex:none;width:56px;height:56px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center"><img src="${DS}icons/${icon}" alt="" aria-hidden="true" style="width:52%;height:auto"></span>
        <span style="text-align:left">
          <span style="display:block;font-weight:700;font-size:17px;color:var(--ink-700)">${label}</span>
          <span style="display:block;font-family:'Quicksand',sans-serif;font-weight:600;font-size:13px;color:var(--ink-450);margin-top:3px">${sub}</span>
        </span>
      </button>`;
    return `
      <h2 style="font-weight:700;font-size:24px;text-align:center;margin:0 0 6px">Who are you?</h2>
      <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:14.5px;color:var(--ink-600);text-align:center;margin:0 0 22px">We'll set up the right garden for you.</p>
      <div style="display:flex;flex-direction:column;gap:14px">
        ${card('#FCC30B', 'family.png', 'Parent / Home', "Follow your child's assessments", 'parent')}
        ${card('#26BDE2', 'graduation-cap.png', 'School', 'See your whole class garden', 'teacher')}
        ${card('#56C02B', 'sparkle.png', 'Tilli Team', 'Internal view across the school', 'tilli')}
      </div>`;
  }

  function schoolView() {
    const isTeacher = state.role !== 'parent';   // teacher + Tilli Team see the school-facing wording
    const q = (state.schoolQuery || '').trim().toLowerCase();
    // Only search once the user has typed enough — no full-list-on-focus.
    const enoughChars = q.length >= SCHOOL_MIN_CHARS;
    const ALL = schoolNames();
    const matches = enoughChars ? ALL.filter((x) => x.toLowerCase().includes(q)) : [];
    const exactish = ALL.some((x) => x.toLowerCase() === q);
    const canContinue = !!(state.school || state.schoolQuery.trim());
    const listItems = matches.map((name) => `
      <button role="option" class="focus school-opt" data-school="${esc(name)}" style="width:100%;text-align:left;border:none;border-radius:8px;padding:11px 13px;cursor:pointer;font-family:'Quicksand',sans-serif;font-weight:600;font-size:14.5px;color:var(--ink-900);display:flex;align-items:center;gap:10px;background:${state.school === name ? '#F1FFEC' : 'transparent'}">
        <span style="width:7px;height:7px;border-radius:50%;background:#56C02B;flex:none"></span>${esc(name)}
      </button>`).join('');
    const hint = !enoughChars
      ? `<div style="padding:12px 13px;font-family:'Quicksand',sans-serif;font-weight:600;font-size:13.5px;color:var(--ink-300)">Type at least ${SCHOOL_MIN_CHARS} letters to search&#8230;</div>`
      : '';
    const noMatch = enoughChars && !exactish && matches.length === 0;

    return `
      <h2 style="font-weight:700;font-size:22px;text-align:center;margin:0 0 6px;text-wrap:balance">${isTeacher ? 'Select your school' : 'Which school does your child go to?'}</h2>
      <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:14.5px;color:var(--ink-600);text-align:center;margin:0 0 20px">Start typing to find it in the list.</p>
      <div style="position:relative">
        <input id="school-input" class="input focus" value="${esc(state.schoolQuery)}" placeholder="Select school" aria-label="Search school" autocomplete="off" style="padding-right:40px" autofocus>
        <span aria-hidden="true" style="position:absolute;right:15px;top:24px;transform:translateY(-50%);color:var(--ink-300);font-size:12px">&#9662;</span>
        ${state.schoolListOpen ? `
          <div role="listbox" style="margin-top:8px;background:#fff;border:1px solid var(--line-200);border-radius:16px;box-shadow:0 2px 10px rgba(20,20,20,.06);max-height:200px;overflow-y:auto;padding:6px">
            ${hint}
            ${listItems}
            ${noMatch ? `<div style="padding:12px 13px;font-family:'Quicksand',sans-serif;font-weight:600;font-size:13.5px;color:var(--ink-300)">No match &#8212; <span style="color:#56C02B">use &#8220;${esc(state.schoolQuery)}&#8221;</span></div>` : ''}
          </div>` : ''}
      </div>
      <button class="btn btn-primary block focus" data-act="school-continue" ${canContinue ? '' : 'disabled'} style="margin-top:16px">Continue &#8594;</button>`;
  }

  function emailView() {
    const isTilli = state.role === 'tilli';
    const pill = isTilli
      ? `<span class="pill-info">Tilli Team &#183; internal</span>`
      : `<span class="pill-info">${esc(state.school)}</span>`;
    const hint = isTilli
      ? 'Demo: use team@tilli.org to sign in to the internal platform.'
      : 'Demo: use parent@tilli.edu or teacher@tilli.edu to sign in, or any new email to sign up.';
    return `
      <h2 style="font-weight:700;font-size:24px;text-align:center;margin:0 0 10px">Enter your email</h2>
      <p style="text-align:center;margin:0 0 20px">${pill}</p>
      <form id="email-form" style="display:flex;flex-direction:column;gap:14px">
        <input id="email-input" class="input focus" type="email" required value="${esc(state.email)}" placeholder="you@email.com" aria-label="Email address" autofocus>
        <button type="submit" class="btn btn-primary block focus">Enter &#8594;</button>
      </form>
      <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:12px;color:var(--ink-300);text-align:center;margin:14px 0 0">${hint}</p>`;
  }

  function checkingView() {
    return `
      <div style="text-align:center;padding:24px 0 14px">
        <div class="spinner" style="margin:0 auto 18px"></div>
        <p style="font-family:'Quicksand',sans-serif;font-weight:700;font-size:15px;color:var(--ink-600);margin:0">Checking if your account exists&#8230;</p>
        <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:13px;color:var(--ink-300);margin:6px 0 0;word-break:break-all">${esc(state.email)}</p>
      </div>`;
  }

  function loginView(isSignup) {
    const verb = isSignup ? 'Create' : 'Enter';
    return `
      <h2 style="font-weight:700;font-size:23px;text-align:center;margin:0 0 8px">${isSignup ? 'Create your Tilli account' : 'Enter your Tilli account'}</h2>
      <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:13.5px;color:var(--ink-600);text-align:center;margin:0 0 20px;word-break:break-all">${esc(state.email)}</p>
      <button class="focus" data-act="google" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid var(--line-200);background:#fff;color:var(--ink-700);font-weight:700;font-size:14.5px;padding:14px;border-radius:999px;cursor:pointer;transition:border-color .2s" onmouseover="this.style.borderColor='#26BDE2'" onmouseout="this.style.borderColor='#ECEEF2'">${gIcon} ${verb} via Google</button>
      <div style="display:flex;align-items:center;gap:10px;margin:18px 0;color:var(--ink-300);font-family:'Quicksand',sans-serif;font-size:12px;font-weight:700"><span style="flex:1;height:1px;background:var(--line-200)"></span>OR<span style="flex:1;height:1px;background:var(--line-200)"></span></div>
      <form id="pw-form" class="${state.shake ? 'tm-shake' : ''}" style="display:flex;flex-direction:column;gap:14px">
        <div style="position:relative">
          <input id="pw-input" class="input focus ${state.errs.pw ? 'err' : ''}" type="password" required placeholder="${isSignup ? 'Create a password' : 'Enter your password'}" aria-label="Password" value="${esc(state.password)}" style="padding-right:44px">
          <button type="button" id="pw-toggle" class="focus" aria-label="Show password" aria-pressed="false" title="Show password" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:none;background:none;cursor:pointer;color:var(--ink-450);border-radius:8px">${eyeIcon(false)}</button>
        </div>
        ${state.errs.pw ? `<p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:13px;color:#B22447;margin:0">That password doesn't match this account. Please try again.</p>` : ''}
        ${isSignup ? '' : `<button type="button" data-act="forgot" class="focus" style="align-self:flex-end;margin-top:-4px;border:none;background:none;padding:0;cursor:pointer;font-family:'Quicksand',sans-serif;font-weight:700;font-size:13px;color:var(--ink-450);text-decoration:underline;text-underline-offset:2px">Forgot password?</button>`}
        ${!isSignup && state.forgotSent ? `<p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:12.5px;color:var(--ink-600);margin:0;line-height:1.5">To reset your password, contact your school admin — they can re-send an invite that lets you set a new one.</p>` : ''}
        <button type="submit" class="btn btn-primary block focus">${verb} via password &#8594;</button>
      </form>`;
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
      ? `<p style="font-family:'Quicksand',sans-serif;font-weight:700;font-size:13px;color:var(--ink-450);text-align:center;margin:-14px 0 20px">Joining as <span style="color:var(--ink-700)">${esc(roleLabel)}</span>${sc && sc.name ? ` for <span style="color:var(--ink-700)">${esc(sc.name)}</span>` : ''}</p>`
      : '';
    return `
      <h2 style="font-weight:700;font-size:23px;text-align:center;margin:0 0 8px">Set your password</h2>
      <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:13.5px;color:var(--ink-600);text-align:center;margin:0 0 20px;word-break:break-all">${esc(state.email)}</p>
      ${joinLine}
      <form id="setpw-form" class="${state.shake ? 'tm-shake' : ''}" style="display:flex;flex-direction:column;gap:14px">
        <input id="np-input" class="input focus ${e.np ? 'err' : ''}" type="password" required placeholder="New password (min 6 characters)" aria-label="New password" value="${esc(state.password)}">
        <input id="np-confirm" class="input focus ${e.np ? 'err' : ''}" type="password" required placeholder="Confirm new password" aria-label="Confirm new password">
        ${e.np ? `<p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:13px;color:#B22447;margin:0">${esc(e.np)}</p>` : ''}
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
      return `<button class="focus child-card" data-child-idx="${i}" style="text-align:left;border:2px solid ${done ? '#56C02B' : '#ECEEF2'};background:#fff;border-radius:24px;padding:20px 24px;cursor:pointer;min-width:220px;transition:transform .2s var(--ease)" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='none'">
        <span style="display:flex;align-items:center;gap:12px">
          <span style="flex:none;width:40px;height:40px;border-radius:50%;background:${done ? '#56C02B' : '#FCC30B'};display:flex;align-items:center;justify-content:center"><img src="${DS}icons/smiley.png" alt="" aria-hidden="true" style="width:55%;height:auto"></span>
          <span style="font-weight:700;font-size:19px;color:var(--ink-700)">${esc(k.name)}</span>
        </span>
        <span style="display:block;margin-top:10px;font-family:'Quicksand',sans-serif;font-weight:700;font-size:12px;color:${done ? '#3F9E1D' : '#5B6170'}">${esc(k.status)}</span>
      </button>`;
    }).join('');

    return `<div class="sheet">
      <div style="width:100%;max-width:660px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:clamp(20px,3.4vh,32px)">
          ${brandMark}
          <span class="pill-info" style="margin-left:auto">${esc(state.school)}</span>
        </div>
        <h1 style="font-weight:700;letter-spacing:-.01em;font-size:clamp(24px,3vw,36px);line-height:1.14;margin:0 0 8px;text-wrap:balance">Select the child you want to know more about</h1>
        <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:15px;color:var(--ink-600);margin:0 0 clamp(20px,3vh,28px)">${sub}</p>
        <div style="display:flex;flex-wrap:wrap;gap:16px">
          ${kids}
          <button class="focus" data-act="add-child" style="border:2px dashed #ECEEF2;background:#fff;border-radius:24px;padding:22px 26px;cursor:pointer;font-weight:700;font-size:16px;color:#56C02B;min-width:170px;transition:transform .2s var(--ease),border-color .2s" onmouseover="this.style.borderColor='#56C02B';this.style.transform='translateY(-4px)'" onmouseout="this.style.borderColor='#ECEEF2';this.style.transform='none'">+ add child</button>
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

  // ===== B1 — enter the child's admission number. REVEAL NOTHING =====
  // We never tell the parent whether the id exists (spec §5 B1 / acceptance #6);
  // any id simply advances to the second-factor step.
  function childFormView() {
    const c = state.child, e = state.errs;
    return `<div class="sheet">
      <div style="width:100%;max-width:520px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:clamp(20px,3.4vh,30px)">
          ${brandMark}
          <button class="btn-ghost focus" data-act="child-back" style="margin-left:auto">&#8592; Back</button>
        </div>
        <h1 style="font-weight:700;letter-spacing:-.01em;font-size:clamp(24px,3vw,34px);margin:0 0 8px">Add your child</h1>
        <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:15px;color:var(--ink-600);margin:0 0 24px">Enter your child&#39;s admission number. We&#39;ll ask for a verification code next to keep their information private.</p>
        <form id="child-form" class="${state.shake ? 'tm-shake' : ''}" style="display:flex;flex-direction:column;gap:16px;background:#fff;border:1px solid var(--line-200);border-radius:24px;padding:clamp(20px,3vw,28px)">
          <label class="field">Admission number *
            <input id="cf-adm" class="input focus ${e.adm ? 'err' : ''}" value="${esc(c.adm)}" placeholder="Enter admission number of your child" autofocus>
          </label>
          <button type="submit" class="btn btn-primary block focus" style="margin-top:4px">Continue &#8594;</button>
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
      <div style="display:flex;align-items:flex-start;gap:10px;background:#FDECEF;border:1px solid #F6C9D3;border-radius:14px;padding:13px 15px">
        <span aria-hidden="true" style="flex:none;font-size:16px;line-height:1.3">&#9888;&#65039;</span>
        <span style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:13.5px;color:#B22447;line-height:1.5">
          ${locked
            ? `Too many attempts. For your child&#39;s safety, please try again in about ${mins} minute${mins === 1 ? '' : 's'}.`
            : `Those details don&#39;t match. Check the admission number and code your school gave you, and try again.`}</span>
      </div>` : '';
    return `<div class="sheet">
      <div style="width:100%;max-width:520px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:clamp(20px,3.4vh,30px)">
          ${brandMark}
          <button class="btn-ghost focus" data-act="child-back" style="margin-left:auto">&#8592; Back</button>
        </div>
        <h1 style="font-weight:700;letter-spacing:-.01em;font-size:clamp(24px,3vw,34px);margin:0 0 8px">Verify it&#39;s your child</h1>
        <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:15px;color:var(--ink-600);margin:0 0 24px">Enter the verification code your school shared for this child. This keeps every child&#39;s information private.</p>
        <form id="verify-form" class="${state.shake ? 'tm-shake' : ''}" style="display:flex;flex-direction:column;gap:16px;background:#fff;border:1px solid var(--line-200);border-radius:24px;padding:clamp(20px,3vw,28px)">
          <label class="field">Verification code *
            <input id="cf-code" class="input focus ${(e.code || e.mismatch) ? 'err' : ''}" value="${esc(cl.code)}" placeholder="e.g. TIL-AB12" autocomplete="off" ${locked ? 'disabled' : 'autofocus'}>
          </label>
          ${banner}
          <button type="submit" class="btn btn-primary block focus" style="margin-top:4px" ${locked ? 'disabled' : ''}>Verify &#8594;</button>
        </form>
        <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:12.5px;color:var(--ink-300);text-align:center;margin:16px 0 0">Don&#39;t have a code? Ask your child&#39;s teacher or school office.</p>
      </div>
    </div>`;
  }

  // ===== B3 — reveal + confirm (only reached after a correct second factor) =====
  function childConfirmView() {
    // Details come from the verified reveal, never from a client-side roster lookup.
    const m = state.claim.reveal || state.match || {};
    const full = (m.name || `${m.first || ''} ${m.last || ''}`).trim();
    const gradeSection = [m.grade, m.section && 'Section ' + m.section].filter(Boolean).join(', ');
    return `<div class="sheet">
      <div style="width:100%;max-width:520px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:clamp(20px,3.4vh,30px)">
          ${brandMark}
          <button class="btn-ghost focus" data-act="child-back" style="margin-left:auto">&#8592; Back</button>
        </div>
        <h1 style="font-weight:700;letter-spacing:-.01em;font-size:clamp(24px,3vw,34px);margin:0 0 8px">We found your child</h1>
        <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:15px;color:var(--ink-600);margin:0 0 24px">Please confirm this is the right student.</p>
        <div style="background:#fff;border:2px solid #56C02B;border-radius:24px;padding:clamp(22px,3vw,28px);text-align:center">
          <span style="display:inline-flex;width:56px;height:56px;border-radius:50%;background:#56C02B;align-items:center;justify-content:center;margin:0 0 14px"><img src="${DS}icons/smiley.png" alt="" aria-hidden="true" style="width:55%;height:auto"></span>
          <p class="pill-info" style="display:inline-block;margin:0 0 14px">Admission code &middot; ${esc(m.student_id || m.adm)}</p>
          <p style="font-weight:700;font-size:clamp(20px,2.6vw,26px);color:var(--ink-900);margin:0 0 4px">${esc(full)}</p>
          <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:14.5px;color:var(--ink-600);margin:0">${esc(gradeSection)}</p>
          <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:13.5px;color:var(--green-700);margin:16px 0 0;line-height:1.5">Understand <b>${esc(full)}</b> with Tilli Measures.</p>
        </div>
        <button class="btn btn-primary block focus" data-act="confirm-child" style="margin-top:18px">Yes, that's my child &#8594;</button>
        <button class="focus" data-act="not-child" style="display:block;width:100%;background:none;border:none;cursor:pointer;font-family:'Quicksand',sans-serif;font-weight:700;font-size:13.5px;color:var(--ink-450);text-decoration:underline;margin-top:14px">Not your child? Click here</button>
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
        // Tilli Team is internal — it doesn't belong to a school, so skip the
        // school picker and go straight to the email/password step.
        if (role === 'tilli') {
          set({ step: 'email', role, school: 'Tilli Internal', schoolQuery: '', schoolListOpen: false, email: '', password: '' });
          return;
        }
        set({ step: 'school', role, school: '', schoolQuery: '', schoolListOpen: false });
      }));

    scope.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (ev) => handleAct(b.dataset.act, ev)));

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
          const exists = !!loadAccounts()[email.toLowerCase()] || !!invitedAccount(email);
          set({ step: exists ? 'login' : 'signup' });
        }, 900);
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
        if (state.step === 'signup') saveAccount(state.email);
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
        // beginClaim returns the same shape whether or not the child exists.
        const res = (window.TilliAPI && window.TilliAPI.beginClaim)
          ? window.TilliAPI.beginClaim(state.school, typed)
          : { ok: true, challengeId: null, factor: 'code' };
        set({
          step: 'childVerify',
          claim: { challengeId: res.challengeId, factor: res.factor || 'code', code: '', reveal: null, token: null, retryAt: 0 },
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
        set({ step: 'email', school: sVal, schoolListOpen: false, email: '', password: '' });
        break;
      }
      case 'google':
        if (state.step === 'signup') saveAccount(state.email);
        go();
        break;
      case 'forgot':
        set({ forgotSent: true });
        break;
      case 'add-child':
        set({ step: 'childLoading', child: { first: '', last: '', adm: '', grade: '', section: '' }, match: null,
              claim: { challengeId: null, factor: 'code', code: '', reveal: null, token: null, retryAt: 0 }, errs: {} });
        break;
      case 'child-back':
        // confirm → back to the code step; verify → back to the id; form → child list.
        if (state.step === 'childConfirm') set({ step: 'childVerify', errs: {} });
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
    if (s === 'school') set({ step: 'role' });
    // Tilli Team skipped the school step, so its email screen goes back to role.
    else if (s === 'email') set({ step: state.role === 'tilli' ? 'role' : 'school' });
    else set({ step: 'email', password: '' });
  }

  // ---- boot ----
  document.getElementById('get-started').addEventListener('click', () =>
    set({ step: 'role', role: null, school: '', schoolQuery: '', schoolListOpen: false }));
})();
