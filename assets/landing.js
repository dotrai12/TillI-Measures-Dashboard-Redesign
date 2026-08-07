/* ============================================================
   Tilli Measures — landing "Get started" flow
   role → school → email → (login | signup) → child select
   Teacher path routes to the teacher dashboard.
   Vanilla state machine, no framework. Renders into #flow-root.
   ============================================================ */
(function () {
  const DS = '_ds/tilli-new-design-system-4928e3a5-55df-4bf0-a054-def8ad040436/assets/';
  const LOGO = DS + 'logos/tilli-wordmark-crop.png';
  const ACCT_KEY = 'tilliMeasures.accounts';

  const SCHOOLS = [
    'Little Sprouts School', 'Greenfield International School', 'Sunrise Public School',
    'Meadow Montessori', 'Bright Beginnings Academy', 'Lotus Valley School',
    'Riverside Primary', 'Banyan Tree School', 'Marigold Learning Centre',
    'Colombo Kids Academy', 'Kandy Hill School', "St. Mary's Convent",
  ];
  const GRADES = ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

  // ---- account store (demo: teacher@tilli.edu / parent@tilli.edu pre-exist) ----
  function loadAccounts() {
    let a = {};
    try { a = JSON.parse(localStorage.getItem(ACCT_KEY) || '{}'); } catch (e) {}
    if (!a['teacher@tilli.edu']) a['teacher@tilli.edu'] = true;
    if (!a['parent@tilli.edu']) a['parent@tilli.edu'] = true;
    return a;
  }
  function saveAccount(email) {
    const a = loadAccounts();
    a[email.toLowerCase()] = true;
    try { localStorage.setItem(ACCT_KEY, JSON.stringify(a)); } catch (e) {}
  }

  // ---- state ----
  const state = {
    step: 'start', // start|role|school|email|checking|login|signup|children|childForm
    role: null,
    school: '', schoolQuery: '', schoolListOpen: false,
    email: '', password: '',
    kids: [],
    child: { first: '', last: '', adm: '', grade: '', section: '' },
    errs: {}, shake: false,
  };
  let checkTimer, shakeTimer;

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

  const brandMark = `<img src="${LOGO}" alt="Tilli" style="height:26px;width:auto;display:block">
    <span class="measures">Measures</span>`;

  // ---- navigation actions ----
  function go() {
    if (state.role === 'teacher') {
      window.location.href = 'teacher.html?school=' + encodeURIComponent(state.school);
      return;
    }
    const isNew = state.step === 'signup';
    const kids = isNew ? [] : [
      { name: 'Aarav', status: 'assessment complete' },
      { name: 'Meera', status: 'assessment pending' },
    ];
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
    const authOpen = s !== 'start' && s !== 'children' && s !== 'childForm';

    if (s === 'start') { root.innerHTML = ''; return; }
    if (s === 'children') { root.innerHTML = childSelectView(); wire(); return; }
    if (s === 'childForm') { root.innerHTML = childFormView(); wire(); return; }
    if (authOpen) { root.innerHTML = authDialog(); wire(); }
  }

  // ===== AUTH DIALOG =====
  function authDialog() {
    const s = state.step;
    const showBack = s !== 'role' && s !== 'checking';
    let inner = '';

    if (s === 'role') inner = roleView();
    else if (s === 'school') inner = schoolView();
    else if (s === 'email') inner = emailView();
    else if (s === 'checking') inner = checkingView();
    else if (s === 'login') inner = loginView(false);
    else if (s === 'signup') inner = loginView(true);

    return `<div class="overlay" data-close-overlay>
      <div class="dialog" role="dialog" aria-label="Get started with Tilli Measures">
        ${showBack ? `<button class="btn-ghost dialog-back focus" data-act="back">&#8592; Back</button>` : ''}
        <button class="dialog-close focus" data-act="close" aria-label="Close">&#215;</button>
        <div style="display:flex;justify-content:center;margin:10px 0 14px">
          <img src="${LOGO}" alt="Tilli" style="height:26px;width:auto;display:block">
        </div>
        ${inner}
      </div>
    </div>`;
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
      </div>`;
  }

  function schoolView() {
    const isTeacher = state.role === 'teacher';
    const q = (state.schoolQuery || '').trim().toLowerCase();
    const matches = q ? SCHOOLS.filter((x) => x.toLowerCase().includes(q)) : SCHOOLS;
    const exactish = SCHOOLS.some((x) => x.toLowerCase() === q);
    const canContinue = !!(state.school || state.schoolQuery.trim());
    const listItems = matches.map((name) => `
      <button role="option" class="focus school-opt" data-school="${esc(name)}" style="width:100%;text-align:left;border:none;border-radius:8px;padding:11px 13px;cursor:pointer;font-family:'Quicksand',sans-serif;font-weight:600;font-size:14.5px;color:var(--ink-900);display:flex;align-items:center;gap:10px;background:${state.school === name ? '#F1FFEC' : 'transparent'}">
        <span style="width:7px;height:7px;border-radius:50%;background:#56C02B;flex:none"></span>${esc(name)}
      </button>`).join('');
    const noMatch = q && !exactish && matches.length === 0;

    return `
      <h2 style="font-weight:700;font-size:22px;text-align:center;margin:0 0 6px;text-wrap:balance">${isTeacher ? 'Select your school' : 'Which school does your child go to?'}</h2>
      <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:14.5px;color:var(--ink-600);text-align:center;margin:0 0 20px">Start typing to find it in the list.</p>
      <div style="position:relative">
        <input id="school-input" class="input focus" value="${esc(state.schoolQuery)}" placeholder="Select school" aria-label="Search school" autocomplete="off" style="padding-right:40px" autofocus>
        <span aria-hidden="true" style="position:absolute;right:15px;top:24px;transform:translateY(-50%);color:var(--ink-300);font-size:12px">&#9662;</span>
        ${state.schoolListOpen ? `
          <div role="listbox" style="margin-top:8px;background:#fff;border:1px solid var(--line-200);border-radius:16px;box-shadow:0 2px 10px rgba(20,20,20,.06);max-height:200px;overflow-y:auto;padding:6px">
            ${listItems}
            ${noMatch ? `<div style="padding:12px 13px;font-family:'Quicksand',sans-serif;font-weight:600;font-size:13.5px;color:var(--ink-300)">No match &#8212; <span style="color:#56C02B">use &#8220;${esc(state.schoolQuery)}&#8221;</span></div>` : ''}
          </div>` : ''}
      </div>
      <button class="btn btn-primary block focus" data-act="school-continue" ${canContinue ? '' : 'disabled'} style="margin-top:16px">Continue &#8594;</button>`;
  }

  function emailView() {
    return `
      <h2 style="font-weight:700;font-size:24px;text-align:center;margin:0 0 10px">Enter your email</h2>
      <p style="text-align:center;margin:0 0 20px"><span class="pill-info">${esc(state.school)}</span></p>
      <form id="email-form" style="display:flex;flex-direction:column;gap:14px">
        <input id="email-input" class="input focus" type="email" required value="${esc(state.email)}" placeholder="you@email.com" aria-label="Email address" autofocus>
        <button type="submit" class="btn btn-primary block focus">Enter &#8594;</button>
      </form>
      <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:12px;color:var(--ink-300);text-align:center;margin:14px 0 0">Demo: use parent@tilli.edu or teacher@tilli.edu to sign in, or any new email to sign up.</p>`;
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
      <form id="pw-form" style="display:flex;flex-direction:column;gap:14px">
        <input id="pw-input" class="input focus" type="password" required placeholder="${isSignup ? 'Create a password' : 'Enter your password'}" aria-label="Password" value="${esc(state.password)}">
        <button type="submit" class="btn btn-primary block focus">${verb} via password &#8594;</button>
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

  // ===== ADD CHILD FORM =====
  function childFormView() {
    const c = state.child, e = state.errs;
    const opt = (arr, val) => arr.map((x) => `<option value="${esc(x)}" ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('');
    return `<div class="sheet">
      <div style="width:100%;max-width:520px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:clamp(20px,3.4vh,30px)">
          ${brandMark}
          <button class="btn-ghost focus" data-act="child-back" style="margin-left:auto">&#8592; Back</button>
        </div>
        <h1 style="font-weight:700;letter-spacing:-.01em;font-size:clamp(24px,3vw,34px);margin:0 0 8px">Add child details</h1>
        <p style="font-family:'Quicksand',sans-serif;font-weight:600;font-size:15px;color:var(--ink-600);margin:0 0 24px">Tell us a little about your child.</p>
        <form id="child-form" class="${state.shake ? 'tm-shake' : ''}" style="display:flex;flex-direction:column;gap:16px;background:#fff;border:2px solid #26BDE2;border-radius:24px;padding:clamp(20px,3vw,28px)">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">
            <label class="field">First name *
              <input id="cf-first" class="input focus ${e.first ? 'err' : ''}" value="${esc(c.first)}" placeholder="Enter first name" autofocus>
            </label>
            <label class="field">Last name *
              <input id="cf-last" class="input focus ${e.last ? 'err' : ''}" value="${esc(c.last)}" placeholder="Enter last name">
            </label>
          </div>
          <label class="field">Student admission number *
            <input id="cf-adm" class="input focus ${e.adm ? 'err' : ''}" value="${esc(c.adm)}" placeholder="Enter student admission number">
          </label>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">
            <label class="field">Grade
              <span class="select-wrap">
                <select id="cf-grade" class="select focus"><option value="">Select grade</option>${opt(GRADES, c.grade)}</select>
              </span>
            </label>
            <label class="field">Section
              <span class="select-wrap">
                <select id="cf-section" class="select focus"><option value="">Select section</option>${opt(SECTIONS, c.section)}</select>
              </span>
            </label>
          </div>
          <button type="submit" class="btn btn-primary block focus" style="margin-top:4px">Add child &#8594;</button>
        </form>
      </div>
    </div>`;
  }

  // ---- event wiring (delegated per render) ----
  function wire() {
    // buttons with data-act / data-role / data-child etc.
    root.querySelectorAll('[data-role]').forEach((b) =>
      b.addEventListener('click', () => set({ step: 'school', role: b.dataset.role, school: '', schoolQuery: '', schoolListOpen: false })));

    root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (ev) => handleAct(b.dataset.act, ev)));

    // overlay click-to-close (only on backdrop)
    const ov = root.querySelector('[data-close-overlay]');
    if (ov) ov.addEventListener('click', (ev) => { if (ev.target === ov) closeAuth(); });

    // school input
    const si = root.querySelector('#school-input');
    if (si) {
      si.addEventListener('input', (ev) => set({ schoolQuery: ev.target.value, school: '', schoolListOpen: true }));
      si.addEventListener('focus', () => { if (!state.schoolListOpen) set({ schoolListOpen: true }); });
      restoreCaret(si);
    }
    root.querySelectorAll('.school-opt').forEach((b) =>
      b.addEventListener('click', () => set({ school: b.dataset.school, schoolQuery: b.dataset.school, schoolListOpen: false })));

    // email form
    const ef = root.querySelector('#email-form');
    if (ef) {
      const ei = root.querySelector('#email-input');
      ei.addEventListener('input', (ev) => { state.email = ev.target.value; });
      ef.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const email = (ei.value || '').trim();
        if (!email) return;
        set({ email, step: 'checking', password: '' });
        clearTimeout(checkTimer);
        checkTimer = setTimeout(() => {
          const exists = !!loadAccounts()[email.toLowerCase()];
          set({ step: exists ? 'login' : 'signup' });
        }, 900);
      });
    }

    // password form
    const pf = root.querySelector('#pw-form');
    if (pf) {
      const pi = root.querySelector('#pw-input');
      pi.addEventListener('input', (ev) => { state.password = ev.target.value; });
      pf.addEventListener('submit', (ev) => {
        ev.preventDefault();
        if (!(pi.value || '').trim()) return;
        if (state.step === 'signup') saveAccount(state.email);
        go();
      });
    }

    // child select cards
    root.querySelectorAll('.child-card').forEach((b) => b.addEventListener('click', () => {
      const k = state.kids[+b.dataset.childIdx];
      const meta = k.name === 'Aarav'
        ? { grade: 'Grade 1', section: 'A', adm: 'ADM-2041' }
        : { grade: 'Grade 3', section: 'B', adm: 'ADM-2044' };
      goHome(k.name, meta);
    }));

    // child form
    const cf = root.querySelector('#child-form');
    if (cf) {
      const bind = (id, key) => { const el = root.querySelector(id); if (el) el.addEventListener('input', (ev) => { state.child[key] = ev.target.value; }); };
      bind('#cf-first', 'first'); bind('#cf-last', 'last'); bind('#cf-adm', 'adm');
      const g = root.querySelector('#cf-grade'); if (g) g.addEventListener('change', (ev) => { state.child.grade = ev.target.value; });
      const sec = root.querySelector('#cf-section'); if (sec) sec.addEventListener('change', (ev) => { state.child.section = ev.target.value; });
      cf.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const c = state.child;
        const errs = { first: !c.first.trim(), last: !c.last.trim(), adm: !c.adm.trim() };
        if (errs.first || errs.last || errs.adm) {
          set({ errs, shake: true });
          clearTimeout(shakeTimer);
          shakeTimer = setTimeout(() => set({ shake: false }), 450);
          return;
        }
        goHome(c.first.trim(), { grade: c.grade, section: c.section, adm: c.adm.trim() });
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
      case 'add-child':
        set({ step: 'childForm', child: { first: '', last: '', adm: '', grade: '', section: '' }, errs: {} });
        break;
      case 'child-back': set({ step: 'children' }); break;
    }
  }

  function closeAuth() { clearTimeout(checkTimer); set({ step: 'start' }); }
  function authBack() {
    clearTimeout(checkTimer);
    const s = state.step;
    if (s === 'school') set({ step: 'role' });
    else if (s === 'email') set({ step: 'school' });
    else set({ step: 'email', password: '' });
  }

  // ---- boot ----
  document.getElementById('get-started').addEventListener('click', () =>
    set({ step: 'role', role: null, school: '', schoolQuery: '', schoolListOpen: false }));
})();
