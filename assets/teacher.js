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
  const blankRoster = () => ({ method: null, grade: '', first: '', last: '', adm: '', students: [], csvMsg: '', picMsg: '' });

  const state = {
    phase: 'intro',   // intro | demo | greet | assess | done | roster | complete
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
  let dashboardMounted = false;
  function enterDashboard() {
    const onb = document.getElementById('onb');
    const dashRoot = document.getElementById('dash-root');
    if (onb) onb.style.display = 'none';
    if (dashRoot) dashRoot.style.display = '';
    if (dashboardMounted || !dashRoot) return;
    dashboardMounted = true;
    const teacher = {
      email: ctx.email, school: ctx.school,
      demo: state.demo, selfAnswers: state.selfAnswers, roster: state.roster,
    };
    import('./dashboard-data.js')
      .then((m) => {
        if (window.TilliDashboard) window.TilliDashboard.mount(dashRoot, { data: m.buildAllData(), teacher });
      })
      .catch((err) => {
        console.error('dashboard load failed', err);
        dashRoot.innerHTML = '<div style="padding:48px;text-align:center;font-family:Montserrat,sans-serif;color:#545454">Could not load your dashboard. Please refresh.</div>';
      });
  }

  // white flow card wrapper (+ optional back button)
  function card(inner, opts) {
    const back = opts && opts.back
      ? `<button class="btn-ghost onb-back focus" data-act="onb-back">&#8592; Back</button>` : '';
    return `<div class="onb-card">${back}${inner}</div>`;
  }

  // ---- petal cluster (celebration mark) ----
  function petals(size) {
    const r = size === 'lg' ? 44 : 33;
    const wrap = size === 'lg' ? 130 : 96;
    const pos = size === 'lg'
      ? [[3, 43], [31, 81], [74, 65], [74, 21], [31, 5]]
      : [[2, 31], [23, 59], [55, 47], [55, 15], [23, 3]];
    const spans = pos.map((xy, i) =>
      `<span style="top:${xy[0]}px;left:${xy[1]}px;width:${r}px;height:${r}px;background:${PETAL_COLORS[i]};animation-delay:${0.3 + i * 0.1}s"></span>`).join('');
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
  function selectField(label, id, value, options, placeholder) {
    const opts = ['<option value="">' + esc(placeholder) + '</option>']
      .concat(options.map((o) => `<option value="${esc(o)}"${value === o ? ' selected' : ''}>${esc(o)}</option>`)).join('');
    return `<div>
      <label class="onb-label">${esc(label)}</label>
      <div class="select-wrap"><select class="select focus" data-demo="${id}">${opts}</select></div>
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
      ${selectField('School *', 'school', d.school, [ctx.school].concat(['Sunrise Academy', 'Green Valley Public School', 'Lakeview International'].filter((x) => x !== ctx.school)), 'Select school')}
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
    // section progress dots
    const dots = SELF.map((sq, idx) => {
      const answered = selfAnswered(idx);
      const cur = idx === i;
      const bg = cur ? CATS[q.cat].color : answered ? '#C9D6BE' : 'var(--line-200)';
      const ang = (idx / SELF.length) * Math.PI * 2 - Math.PI / 2;
      const R = 22, cx = 28 + Math.cos(ang) * R - 4, cy = 28 + Math.sin(ang) * R - 4;
      return `<span style="position:absolute;left:${cx}px;top:${cy}px;width:8px;height:8px;border-radius:50%;background:${bg};transition:all .2s"></span>`;
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
      ${petals('lg')}
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
    const gradeSel = needsGrade ? `
      <label class="onb-label">Grade &amp; section *</label>
      <div class="select-wrap" style="margin-bottom:16px"><select class="select focus" data-roster="grade">
        <option value="">Select the grade</option>
        ${gradeOpts.map((o) => `<option value="${esc(o)}"${r.grade === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}
      </select></div>` : '';
    const showBody = !needsGrade || !!r.grade;

    let body = '';
    if (showBody && r.method === 'one') {
      const chips = r.students.map((c) => `<span class="onb-chip">🌱 ${esc(c)}</span>`).join('');
      body = `
        <div class="onb-grid2" style="margin-bottom:12px">
          <input class="input focus" data-roster="first" value="${esc(r.first)}" placeholder="First name">
          <input class="input focus" data-roster="last" value="${esc(r.last)}" placeholder="Last name">
        </div>
        <input class="input focus" data-roster="adm" value="${esc(r.adm)}" placeholder="Admission number" style="margin-bottom:12px">
        <button class="btn btn-primary block focus" data-act="roster-add"${r.first.trim() ? '' : ' disabled'}>+ Add student</button>
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

  // ============================================================
  //  WIRING
  // ============================================================
  function wire() {
    // generic actions
    root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => handleAct(b.dataset.act)));

    // demo text/select inputs
    root.querySelectorAll('[data-demo]').forEach((el) => {
      const key = el.dataset.demo;
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, (e) => {
        let v = e.target.value;
        if (key === 'age' || key === 'years') v = v.replace(/[^0-9]/g, '').slice(0, 2);
        // numeric inputs: patch without full re-render to keep the caret
        if ((key === 'age' || key === 'years') && el.tagName !== 'SELECT') {
          state.demo[key] = v; el.value = v; refreshDemoNext(); return;
        }
        if (el.tagName !== 'SELECT') { state.demo[key] = v; refreshDemoNext(); return; }
        setDemo({ [key]: v });
      });
    });

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
          if (add) add.disabled = !state.roster.first.trim();
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
        if (!r.first.trim()) return;
        const nm = (r.first + ' ' + r.last).trim() + (r.adm.trim() ? ' · #' + r.adm.trim() : '');
        setRoster({ students: r.students.concat(nm), first: '', last: '', adm: '' });
        break;
      }
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
  window.TilliOnboarding = { replay: replayOnboarding };

  // close autocomplete menus on outside click
  document.addEventListener('click', (e) => {
    if (state.phase !== 'demo') return;
    if (!e.target.closest('.onb-ac') && (state.demo.countryOpen || state.demo.cityOpen)) {
      setDemo({ countryOpen: false, cityOpen: false });
    }
  });
})();
