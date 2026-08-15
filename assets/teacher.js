/* ============================================================
   Tilli Measures — teacher onboarding / self-reflection flow
   intro → demographics (4 steps) → greeting → self-assessment
        → profile done → add students → enter garden
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
  // Drawn from the Tilli Pre-Training Teacher Self Report — 5 sections.
  // Replaceable: edit CATS + SELF to swap in the final question bank.
  const CATS = [
    { name: 'Mindsets', color: '#F2CE7B' },
    { name: 'SEL Competencies', color: '#9DBE8D' },
    { name: 'Practices', color: '#A7CDE2' },
    { name: 'Climate', color: '#F6C6D2' },
    { name: 'Wellbeing', color: '#F0B97D' },
  ];
  const SELF = [
    { cat: 0, type: 'scale', q: 'Social Emotional Learning belongs in everyday teaching.', hint: 'Woven into academic lessons, routines and behaviour support — not a separate subject or one-time activity.' },
    { cat: 0, type: 'scale', q: 'When a student misbehaves, I look for the reason before I respond.' },
    { cat: 1, type: 'scale', q: 'In the last two weeks, I calmed myself when I felt a strong emotion at work.' },
    { cat: 1, type: 'text', q: 'Describe a recent situation at work where you felt a strong emotion. What did you do to calm or manage yourself?' },
    { cat: 1, type: 'scale', q: 'I have a reliable way to recover after a hard day.' },
    { cat: 2, type: 'scale', q: 'In the last 3–4 weeks, I checked in on how students were feeling.' },
    { cat: 2, type: 'choice', q: 'In a typical week, how many SEL activities do you run?', hint: 'Emotion check-ins, reflection exercises, conflict-resolution talks, mindfulness, collaborative games…', options: ['0', '1–2', '3–4', '5+'] },
    { cat: 3, type: 'scale', q: 'Students in my classroom feel safe.', hint: 'Able to participate, make mistakes, express themselves and ask for help without fear.' },
    { cat: 3, type: 'text', q: 'What is one thing you do that helps create a safe classroom environment?' },
    { cat: 4, type: 'scale', q: 'Over the last two weeks, I felt emotionally drained by work.', lo: 'Never', hi: 'Always' },
  ];

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
  const PETAL_COLORS = ['#FCC30B', '#26BDE2', '#F99B1C', '#E866B0', '#56C02B'];

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
  });
  // `students` holds structured records { first, last, adm, grade, section, claimCode }
  // (not display strings) so each add can run through the dedupe guard. `note`
  // carries the result of the last add (created / merged / flagged for review).
  const blankRoster = () => ({ method: null, grade: '', first: '', last: '', adm: '', students: [], note: null, csvMsg: '', picMsg: '' });

  const state = {
    phase: 'intro',   // intro | demo | greet | assess | done | roster | complete
    openSelect: null, // id of the currently-open custom dropdown (only one at a time)
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

  // ---------- boot: resume or start ----------
  (function boot() {
    const saved = TeacherStore.load(ctx.email);
    // Returning, already-onboarded teacher (and not explicitly re-doing) → dashboard.
    if (saved && saved.onboarded && !ctx.isNew) {
      Object.assign(state, { phase: 'complete' });
      if (saved.demo) state.demo = Object.assign(blankDemo(), saved.demo);
      if (saved.selfAnswers) state.selfAnswers = saved.selfAnswers;
      if (saved.roster) state.roster = Object.assign(blankRoster(), saved.roster);
    }
    render();
  })();

  function persist(extra) {
    const payload = Object.assign({
      email: ctx.email, school: ctx.school,
      demo: state.demo, selfAnswers: state.selfAnswers, roster: state.roster,
    }, extra || {});
    TeacherStore.save(ctx.email, payload);
  }

  // ============================================================
  //  RENDER
  // ============================================================
  function render() {
    const p = state.phase;
    if (p === 'intro') root.innerHTML = card(introView(), { back: false });
    else if (p === 'demo') root.innerHTML = card(demoView(), { back: true });
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
    const sig = rosterSig();
    if (dashboardMounted && sig === dashboardRosterSig) return;
    dashboardMounted = true;
    dashboardRosterSig = sig;
    const teacher = {
      email: ctx.email, school: ctx.school,
      demo: state.demo, selfAnswers: state.selfAnswers, roster: state.roster,
    };
    // dashboard-data.js is loaded as a classic <script> in teacher.html, so it
    // works under file:// too (no ES-module fetch). It exposes window.buildAllData.
    // Pass this teacher's own roster so the dashboard shows THEIR students.
    try {
      if (window.TilliDashboard && window.buildAllData) {
        window.TilliDashboard.mount(dashRoot, { data: window.buildAllData({ roster: state.roster }), teacher });
      } else {
        throw new Error('dashboard scripts not loaded (TilliDashboard/buildAllData missing)');
      }
    } catch (err) {
      console.error('dashboard load failed', err);
      dashRoot.innerHTML = '<div style="padding:48px;text-align:center;font-family:Montserrat,sans-serif;color:#545454">Could not load your dashboard. Please refresh.</div>';
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
      const bg = filled ? PETAL_COLORS[i] : '#fff';
      return `<span style="top:${c[0] - s / 2}px;left:${c[1] - s / 2}px;width:${s}px;height:${s}px;background:${bg};border:${bw}px solid ${PETAL_COLORS[i]};animation-delay:${0.3 + i * 0.1}s"></span>`;
    }).join('');
    return `<div class="onb-petals" style="width:${wrap}px;height:${wrap}px">${spans}</div>`;
  }

  // ============================================================
  //  SCREENS
  // ============================================================

  // ---- intro (reflection quote) ----
  function introView() {
    return `<div style="text-align:center;padding:10px 0">
      <div style="font-style:italic;font-weight:700;font-size:14px;color:var(--ink-300);margin-bottom:14px">You can not pour from an empty cup</div>
      <h1 style="font-family:'Quicksand',sans-serif;font-weight:700;font-size:clamp(22px,3vw,27px);line-height:1.35;margin:0 0 28px;color:var(--ink-900)">Before you know your class,<br>you must know yourself.</h1>
      <button class="btn btn-primary focus" data-act="intro-next">Begin reflection &#8594;</button>
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
      `<button type="button" class="onb-sel-opt focus${value === o ? ' on' : ''}" data-sel-scope="${scope}" data-sel-id="${esc(id)}" data-sel-val="${esc(o)}"><span>${esc(o)}</span>${value === o ? '<span class="onb-sel-tick">✓</span>' : ''}</button>`).join('');
    return `<div>
      <label class="onb-label">${esc(label)}</label>
      <div class="onb-sel${open ? ' open' : ''}">
        <button type="button" class="onb-sel-trigger focus${value ? '' : ' is-placeholder'}" data-sel-toggle="${esc(id)}"><span class="onb-sel-val">${esc(value || placeholder)}</span></button>
        ${open ? `<div class="onb-sel-menu">${opts}</div>` : ''}
      </div>
    </div>`;
  }

  function demoView() {
    const d = state.demo;
    return `
      <span class="onb-eyebrow">Demographic questions</span>
      <div class="onb-steprow">
        <h2 class="onb-title">${esc(demoTitle(d.step))}</h2>
        <span class="onb-step">Step ${d.step} of 4</span>
      </div>
      <div class="onb-progress"><span style="width:${(d.step / 4) * 100}%"></span></div>
      <p class="onb-help">This one-time setup unlocks your dashboard. All fields are required.</p>
      ${d.step === 1 ? demoStep1() : d.step === 2 ? demoStep2() : d.step === 3 ? demoStep3() : demoStep4()}
      <div class="onb-actions">
        <button class="btn btn-ghost focus" data-act="onb-back" style="padding:13px">Back</button>
        <button class="btn btn-primary grow focus" data-act="demo-next"${demoValid() ? '' : ' disabled'}>${d.step === 4 ? 'Finish &amp; Continue' : 'Next'}</button>
      </div>`;
  }

  function demoStep1() {
    const d = state.demo;
    const emailRow = ctx.email
      ? `<div><label class="onb-label">Email</label>
          <div class="onb-locked"><span style="overflow:hidden;text-overflow:ellipsis">${esc(ctx.email)}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.4" fill="#b0b7c3"></rect><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="#b0b7c3" stroke-width="2"></path></svg>
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

    const countryMenu = d.countryOpen ? `<div class="onb-ac-menu">
      ${cMatches.map((c) => `<button class="onb-ac-opt focus" data-country="${esc(c.name)}">${c.flag} ${esc(c.name)}</button>`).join('')}
      ${cMatches.length === 0 ? '<div class="onb-ac-empty">No matches — keep typing to use your own</div>' : ''}
    </div>` : '';
    const cityMenu = d.cityOpen ? `<div class="onb-ac-menu">
      ${cityMatches.map((ct) => `<button class="onb-ac-opt focus" data-city="${esc(ct)}">${esc(ct)}</button>`).join('')}
      ${cityMatches.length === 0 ? `<div class="onb-ac-empty">${country ? 'No matches — keep typing to use your own' : 'Pick a country first'}</div>` : ''}
    </div>` : '';

    return `<div class="onb-fields">
      <div><label class="onb-label">School</label>
        <div class="onb-locked"><span style="overflow:hidden;text-overflow:ellipsis">${esc(d.school)}</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9.5" rx="2.4" fill="#b0b7c3"></rect><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="#b0b7c3" stroke-width="2"></path></svg>
        </div></div>
      <div class="onb-grid2">
        <div class="onb-ac"><label class="onb-label">Country *</label>
          <input class="input focus" data-demo-ac="country" value="${esc(d.country)}" placeholder="Search country…" style="padding-right:38px" autocomplete="off">
          <span class="onb-ac-flag" style="top:38px">${flag}</span>
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
    const gradePills = DEMO_GRADES.map((name, gi) =>
      `<button class="onb-pill focus${d.gradesSel[gi] ? ' on' : ''}" data-grade="${gi}">${esc(name)}</button>`).join('');
    const hasGrades = Object.keys(d.gradesSel).length > 0;
    const secCards = !hasGrades ? '' : DEMO_GRADES.map((name, gi) => {
      if (!d.gradesSel[gi]) return '';
      const count = DEMO_SECTIONS.filter((sx) => d.secs[gi + '-' + sx]).length;
      const secs = DEMO_SECTIONS.map((sx) => {
        const on = !!d.secs[gi + '-' + sx];
        return `<button class="onb-check focus" data-sec="${gi}-${sx}"><span class="onb-box${on ? ' on' : ''}">${on ? '✓' : ''}</span>${sx}</button>`;
      }).join('');
      return `<div class="onb-seccard">
        <div class="onb-sechead"><span style="font-size:13.5px;font-weight:800;color:var(--ink-700)">${esc(name)}</span>
          ${count ? `<span class="onb-badge">${count} selected</span>` : ''}</div>
        <div class="onb-secgrid">${secs}</div>
      </div>`;
    }).join('');
    return `<div class="onb-fields" style="gap:18px">
      <div>
        <label class="onb-label" style="margin-bottom:8px">Grades you teach *</label>
        <div class="onb-pills">${gradePills}</div>
      </div>
      ${hasGrades ? `<div>
        <label class="onb-label" style="margin-bottom:8px">Sections you teach in each grade *</label>
        ${secCards}
      </div>` : ''}
    </div>`;
  }

  function demoStep4() {
    const d = state.demo;
    const subjects = DEMO_SUBJECTS.map((label) => {
      const on = !!d.subjects[label];
      return `<button class="onb-check focus" data-subject="${esc(label)}"><span class="onb-box${on ? ' on' : ''}">${on ? '✓' : ''}</span>${esc(label)}</button>`;
    }).join('');
    const resources = DEMO_RESOURCES.map((label) => {
      const on = !!d.resources[label];
      return `<button class="onb-check focus" data-resource="${esc(label)}"><span class="onb-box${on ? ' on' : ''}">${on ? '✓' : ''}</span>${esc(label)}</button>`;
    }).join('');
    return `<div class="onb-fields" style="gap:18px">
      <div><label class="onb-label" style="margin-bottom:6px">Subjects you teach *</label>
        <div class="onb-checkgrid">${subjects}</div></div>
      ${selectField('Resource Sufficiency *', 'resSuff', d.resSuff, RES_SUFF, 'Select…')}
      <div><label class="onb-label" style="margin-bottom:6px">Classroom Resources *</label>
        <div class="onb-checkgrid">${resources}</div></div>
    </div>`;
  }

  function demoValid() {
    const d = state.demo;
    if (d.step === 1) return !!(d.name.trim() && d.gender && d.age.trim() && d.years.trim() && d.edu);
    if (d.step === 2) return !!(d.school && d.country.trim() && d.city.trim());
    if (d.step === 3) {
      const sel = Object.keys(d.gradesSel);
      return sel.length > 0 && sel.every((gi) => DEMO_SECTIONS.some((sx) => d.secs[gi + '-' + sx]));
    }
    return Object.keys(d.subjects).length > 0 && !!d.resSuff && Object.keys(d.resources).length > 0;
  }

  // ---- greeting ----
  function greetView() {
    const first = (state.demo.name || '').trim().split(/\s+/)[0] || 'there';
    return `<div style="text-align:center;padding:16px 0">
      ${petals('sm')}
      <h1 style="font-family:'Quicksand',sans-serif;font-weight:700;font-size:clamp(22px,3vw,26px);margin:0 0 10px;color:var(--ink-900)">Hi ${esc(first)}, it&rsquo;s nice to meet you!</h1>
      <p style="color:var(--ink-450);font-size:15.5px;line-height:1.5;margin:0 0 28px">Let&rsquo;s get you to understand yourself deeper.</p>
      <button class="btn btn-primary focus" data-act="greet-next">Begin reflection &#8594;</button>
    </div>`;
  }

  // ---- self-assessment ----
  function assessView() {
    const i = state.selfQ, q = SELF[i];
    // Section progress ring — exactly 5 outline circles, one per self-assessment
    // category, matching the celebration petal cluster (same 5 brand colours).
    // Each fills once every question in its category is answered; the current
    // category shows a coloured ring as a "you are here" cue before it fills.
    const R = 22, D = 11;
    const dots = CATS.map((c, ci) => {
      const done = SELF.every((sq, k) => sq.cat !== ci || selfAnswered(k));
      const cur = ci === q.cat;
      const col = PETAL_COLORS[ci];
      const bg = done ? col : '#fff';
      const bd = done || cur ? col : 'var(--line-200)';
      const ang = (ci / CATS.length) * Math.PI * 2 - Math.PI / 2;
      const cx = 28 + Math.cos(ang) * R - D / 2, cy = 28 + Math.sin(ang) * R - D / 2;
      return `<span style="position:absolute;box-sizing:border-box;left:${cx}px;top:${cy}px;width:${D}px;height:${D}px;border-radius:50%;background:${bg};border:2px solid ${bd};transition:all .2s"></span>`;
    }).join('');
    // category chips (highlight the current one)
    const cats = CATS.map((c, ci) => {
      const on = ci === q.cat;
      const style = on
        ? `background:${c.color};color:#3a3a3a`
        : 'background:var(--surface-100);color:var(--ink-300)';
      return `<span class="onb-cat" style="${style}">${esc(c.name)}</span>`;
    }).join('');

    let body = '';
    if (q.type === 'scale') {
      const cur = state.selfAnswers[i];
      const btns = [1, 2, 3, 4, 5].map((n) =>
        `<button class="onb-scale-btn focus${cur === n ? ' on' : ''}" data-scale="${n}">${n}</button>`).join('');
      body = `<div class="onb-scale">${btns}</div>
        <div class="onb-scale-ends"><span>${esc(q.lo || 'Strongly disagree')}</span><span>${esc(q.hi || 'Strongly agree')}</span></div>`;
    } else if (q.type === 'choice') {
      const cur = state.selfAnswers[i];
      body = `<div class="onb-choices">${q.options.map((o) =>
        `<button class="onb-choice focus${cur === o ? ' on' : ''}" data-choice="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
    } else {
      body = `<textarea class="onb-textarea focus" data-self-text rows="4" placeholder="Take a breath and write freely…">${esc(state.selfAnswers[i] || '')}</textarea>`;
    }

    return `
      <div class="onb-dots">${dots}</div>
      <div class="onb-catrow">${cats}</div>
      <div class="onb-qnum">Question ${i + 1} of ${SELF.length}</div>
      <h2 class="onb-question">${esc(q.q)}</h2>
      ${q.hint ? `<p class="onb-qhint">${esc(q.hint)}</p>` : ''}
      ${body}
      <div style="display:flex;justify-content:flex-end;margin-top:20px">
        <button class="btn btn-primary focus" data-act="self-next"${selfAnswered(i) ? '' : ' disabled'} style="padding:13px 30px">${i >= SELF.length - 1 ? 'Finish reflection' : 'Next'} &#8594;</button>
      </div>`;
  }
  function selfAnswered(i) {
    const a = state.selfAnswers[i];
    return typeof a === 'string' ? !!a.trim() : a != null;
  }

  // ---- profile done ----
  function doneView() {
    return `<div style="text-align:center;padding:12px 0">
      ${petals('lg', true)}
      <h1 style="font-family:'Quicksand',sans-serif;font-weight:700;font-size:clamp(22px,3vw,26px);margin:0 0 8px;color:var(--ink-900)">Amazing! Your profile is created</h1>
      <p style="color:var(--ink-450);font-size:15px;margin:0 0 26px">Now let&rsquo;s meet your class.</p>
      <button class="btn btn-primary focus" data-act="to-roster">Add my students &#8594;</button>
    </div>`;
  }

  // ---- add students ----
  function rosterView() {
    const r = state.roster;
    if (!r.method) {
      return `
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-style:italic;font-weight:700;font-size:13px;color:var(--ink-300);margin-bottom:6px">Let&rsquo;s create your garden</div>
          <h2 class="onb-title">Add your students</h2>
        </div>
        <div class="onb-methods">
          <button class="onb-method focus" data-method="one"><span class="ic">🌱</span><span class="lb">Add one by one</span></button>
          <button class="onb-method focus" data-method="csv"><span class="ic">📄</span><span class="lb">Upload a CSV</span></button>
          <button class="onb-method focus" data-method="pic"><span class="ic">📷</span><span class="lb">Upload a picture</span></button>
        </div>`;
    }

    // grade selector needed for one-by-one and picture methods
    const needsGrade = r.method === 'one' || r.method === 'pic';
    const gradeOpts = [];
    const d = state.demo;
    Object.keys(d.gradesSel).sort((a, b) => a - b).forEach((gi) => {
      DEMO_SECTIONS.forEach((sx) => { if (d.secs[gi + '-' + sx]) gradeOpts.push(DEMO_GRADES[gi] + ' · Section ' + sx); });
    });
    const gradeSel = needsGrade
      ? `<div style="margin-bottom:16px">${selectField('Grade & section *', 'grade', r.grade, gradeOpts, 'Select the grade', 'roster')}</div>`
      : '';
    const showBody = !needsGrade || !!r.grade;

    let body = '';
    if (showBody && r.method === 'one') {
      // Each chip shows the child + the stable verification code the parent needs
      // to claim them (spec §5 second factor). Teacher hands this to the parent.
      const chips = r.students.map((c) => {
        const nm = (c.first + ' ' + c.last).trim() + (c.adm ? ' · #' + c.adm : '');
        const code = c.claimCode ? `<span class="onb-chip-code" style="margin-left:6px;font-family:'Quicksand',sans-serif;font-weight:700;font-size:11px;color:var(--green-700);background:#EAF7E3;border-radius:999px;padding:2px 8px">${esc(c.claimCode)}</span>` : '';
        return `<span class="onb-chip">🌱 ${esc(nm)}${code}</span>`;
      }).join('');
      const note = rosterNoteHTML(r.note);
      body = `
        <div class="onb-grid2" style="margin-bottom:12px">
          <input class="input focus" data-roster="first" value="${esc(r.first)}" placeholder="First name *">
          <input class="input focus" data-roster="last" value="${esc(r.last)}" placeholder="Last name *">
        </div>
        <input class="input focus" data-roster="adm" value="${esc(r.adm)}" placeholder="Admission number *" style="margin-bottom:12px">
        <button class="btn btn-primary block focus" data-act="roster-add"${rosterAddValid() ? '' : ' disabled'}>+ Add student</button>
        ${note}
        ${r.students.length ? `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:16px 0 8px">
            <span style="font-weight:800;font-size:13px;color:var(--ink-700)">Your students</span>
            <span class="onb-badge">${r.students.length} students</span>
          </div>
          <div class="onb-chips">${chips}</div>` : ''}`;
    } else if (showBody && r.method === 'csv') {
      body = `
        <label class="onb-drop">
          <input type="file" accept=".csv" data-roster-csv style="display:none">
          <div style="font-size:24px;margin-bottom:6px">📄</div>
          <div style="font-weight:800;font-size:14px;color:var(--ink-700)">Upload a CSV</div>
          <div style="font-size:12.5px;color:var(--ink-300);margin-top:4px">Columns: first name, last name, grade, section</div>
        </label>
        ${r.csvMsg ? `<div class="onb-note">${esc(r.csvMsg)}</div>` : ''}`;
    } else if (showBody && r.method === 'pic') {
      body = `
        <div class="onb-grid2">
          <label class="onb-drop" style="padding:22px 12px">
            <input type="file" accept="image/*" data-roster-pic style="display:none">
            <div style="font-size:22px;margin-bottom:6px">🖼️</div>
            <div style="font-weight:800;font-size:13.5px;color:var(--ink-700)">Upload a picture</div>
          </label>
          <label class="onb-drop" style="padding:22px 12px">
            <input type="file" accept="image/*" capture="environment" data-roster-pic style="display:none">
            <div style="font-size:22px;margin-bottom:6px">📷</div>
            <div style="font-weight:800;font-size:13.5px;color:var(--ink-700)">Take a picture</div>
          </label>
        </div>
        <div style="font-size:12.5px;color:var(--ink-300);margin-top:10px;text-align:center">Snap your class register — we&rsquo;ll read the names for you.</div>
        ${r.picMsg ? `<div class="onb-note">${esc(r.picMsg)}</div>` : ''}`;
    }

    const canFinish = r.method === 'one' ? r.students.length > 0 : r.method === 'csv' ? !!r.csvMsg : !!r.picMsg;
    return `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-style:italic;font-weight:700;font-size:13px;color:var(--ink-300);margin-bottom:6px">Let&rsquo;s create your garden</div>
        <h2 class="onb-title">Add your students</h2>
      </div>
      ${gradeSel}
      ${body}
      <div class="onb-actions">
        <button class="btn btn-primary grow focus" data-act="roster-finish"${canFinish ? '' : ' disabled'}>Enter my garden &#8594;</button>
      </div>`;
  }

  // Renders the feedback note under the add-student button. For the two
  // conflict kinds it also renders the resolution buttons (data-act handled in
  // handleAct). Colours: green = added, blue = updated, amber = needs a decision.
  function rosterNoteHTML(n) {
    if (!n) return '';
    const pal = {
      created: ['#EAF7E3', '#BEE6AC'], merged: ['#EAF4FF', '#C9DEF6'],
      name_dup: ['#EAF4FF', '#C9DEF6'], id_conflict: ['#FFF4E5', '#F6D9A8'],
      info: ['#EEF1F4', '#D8DEE6'],
    };
    const [bg, bd] = pal[n.kind] || pal.info;
    const wrap = (inner) => `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:11px">${inner}</div>`;
    const choiceBtn = (act, label) => `<button class="focus" data-act="${act}" style="flex:1;min-width:150px;cursor:pointer;background:#fff;border:1.5px solid var(--line-200);border-radius:10px;padding:11px 12px;font-family:'Montserrat',sans-serif;font-weight:700;font-size:13px;color:var(--ink-700)">${label}</button>`;
    let actions = '';
    if (n.kind === 'name_dup') {
      actions = wrap(
        choiceBtn('roster-ignore-add', '<b>Add anyway</b>') +
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
    return `<div class="onb-note" style="margin-top:12px;background:${bg};border:1px solid ${bd};color:var(--ink-700)">${esc(n.text)}${actions}</div>`;
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
  function addRosterStudent(r, force) {
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
      res = window.TilliAPI.addStudent({
        actorEmail: ctx.email, school_id: scope && scope.school_id,
        section_id: scope && scope.section_id,
        student_id: adm, first, last, grade, section, source: 'manual', force: force || null,
      });
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
    setRoster({ students: r.students.concat([rec]), first: '', last: '', adm: '', note: { kind: 'created', text: `${first} planted 🌱` } });
  }
  const normAdm = (s) => String(s == null ? '' : s).trim().toUpperCase();

  // ============================================================
  //  WIRING
  // ============================================================
  function wire() {
    // generic actions
    root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => handleAct(b.dataset.act)));

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
        state.selfAnswers[state.selfQ] = e.target.value;
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
    const csv = root.querySelector('[data-roster-csv]');
    if (csv) csv.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const n = Math.max(0, String(rd.result).trim().split(/\r?\n/).length - 1);
        setRoster({ csvMsg: '✓ ' + f.name + ' — ' + n + ' students ready to plant' });
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
    if (g[gi]) { delete g[gi]; DEMO_SECTIONS.forEach((sx) => delete secs[gi + '-' + sx]); }
    else g[gi] = true;
    setDemo({ gradesSel: g, secs });
  }
  function toggleIn(mapKey, item) {
    const m = Object.assign({}, state.demo[mapKey]);
    if (m[item]) delete m[item]; else m[item] = true;
    setDemo({ [mapKey]: m });
  }
  function selfPick(v) {
    state.selfAnswers = Object.assign({}, state.selfAnswers, { [state.selfQ]: v });
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
      case 'greet-next': set({ phase: 'assess', selfQ: 0 }); break;
      case 'self-next': {
        if (!selfAnswered(state.selfQ)) return;
        if (state.selfQ >= SELF.length - 1) set({ phase: 'done' });
        else set({ selfQ: state.selfQ + 1 });
        break;
      }
      case 'to-roster': set({ phase: 'roster' }); break;
      case 'roster-add': {
        const r = state.roster;
        if (!rosterAddValid()) return;   // all fields (first, last, admission #) required
        addRosterStudent(r);
        break;
      }
      // Conflict resolution (buttons live inside the note — see rosterNoteHTML):
      case 'roster-ignore-add': addRosterStudent(state.roster, 'name'); break;       // two kids, same name → add anyway
      case 'roster-conflict-replace': addRosterStudent(state.roster, 'replace'); break; // give the number to the new child
      case 'roster-conflict-keep': {                                                 // existing child keeps the number
        const n = state.roster.note || {}; const inc = n.incoming || {};
        const incNm = ((inc.first || '') + ' ' + (inc.last || '')).trim();
        setRoster({ adm: '', note: { kind: 'info',
          text: `${(n.existing && n.existing.name) || 'The existing student'} keeps #${n.adm}. Enter a different admission number for “${incNm}”.` } });
        break;
      }
      case 'roster-dismiss-note': setRoster({ note: null }); break;
      case 'roster-finish': finishOnboard(); break;
      case 'replay': replayOnboarding(); break;
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

  function finishOnboard() {
    persist({ onboarded: true, completedAt: new Date().toISOString() });
    set({ phase: 'complete' });
  }

  // Return to the reflection flow from the dashboard (profile → "Redo reflection").
  function replayOnboarding() {
    const onb = document.getElementById('onb');
    const dashRoot = document.getElementById('dash-root');
    if (dashRoot) dashRoot.style.display = 'none';
    if (onb) onb.style.display = '';
    set({ phase: 'intro', selfQ: 0 });
  }
  // Jump straight to the "add students" step (used by the dashboard empty state
  // when a teacher landed with no students). Finishing re-mounts the dashboard
  // with the new roster via enterDashboard's signature check.
  function goToAddStudents() {
    const onb = document.getElementById('onb');
    const dashRoot = document.getElementById('dash-root');
    if (dashRoot) dashRoot.style.display = 'none';
    if (onb) onb.style.display = '';
    setRoster({ method: null, csvMsg: '', picMsg: '', note: null });
    set({ phase: 'roster' });
  }
  window.TilliOnboarding = { replay: replayOnboarding, addStudents: goToAddStudents };

  // close autocomplete menus / custom dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (state.phase === 'demo' && !e.target.closest('.onb-ac') && (state.demo.countryOpen || state.demo.cityOpen)) {
      setDemo({ countryOpen: false, cityOpen: false });
      return;
    }
    if (state.openSelect && !e.target.closest('.onb-sel')) set({ openSelect: null });
  });
})();
