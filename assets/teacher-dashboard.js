/* ============================================================
   Tilli Measures — teacher dashboard (Phase 2)
   Ported from the "Teacher Dashboard" prototype into the live
   design system. Mounted by teacher.js after onboarding via
   window.TilliDashboard.mount(root, { data, teacher }).

   Slice 1 (this file): shell (sidebar / header / section chips /
   profile), My Garden (beds overview + class modal + section
   garden), Ask Tilli (draggable sun + panel). Students,
   Assess (Observations + Completion merged, sub-tabs To-do / Enter /
   Completed) and Insights render an in-shell panel.
   ============================================================ */
(function () {
  'use strict';

  // ---------------- plant art (ported from Bloom.dc.html / Plant.dc.html) ----------------
  // Bloom: the small flower used on the garden beds. state ∈ expert|learner|beginner.
  function bloomSVG(rawState, color, size, seed) {
    const state = rawState === 'blossoming' ? 'expert' : rawState === 'growing' ? 'learner'
      : (rawState === 'tending' || rawState === 'waiting' || rawState === 'beginner') ? 'beginner'
      : (rawState || 'learner');
    seed = Math.abs(Number(seed) || 0) % 97;
    const r = (k) => { const v = Math.sin((seed + 1) * (k * 12.9898 + 4.1414)) * 43758.5453; return v - Math.floor(v); };
    const shape = Math.floor(r(2) * 3) % 3;
    const rot = (r(4) * 360).toFixed(0);
    let inner = '';
    if (state === 'expert') {
      let petals = '';
      if (shape === 0) petals = [0, 72, 144, 216, 288].map((a) => `<g transform="rotate(${a} 50 50)"><ellipse cx="50" cy="22" rx="17" ry="24"></ellipse></g>`).join('');
      else if (shape === 1) petals = [0, 60, 120, 180, 240, 300].map((a) => `<g transform="rotate(${a} 50 50)"><ellipse cx="50" cy="26" rx="15" ry="21"></ellipse></g>`).join('');
      else petals = [0, 72, 144, 216, 288].map((a) => `<g transform="rotate(${a} 50 50)"><path d="M50 50 C34 44 30 20 42 10 C54 4 62 26 50 50 Z"></path></g>`).join('');
      inner = `<g><g fill="currentColor">${petals}</g><circle cx="50" cy="50" r="15" fill="#FFFFFF" opacity="0.55"></circle><circle cx="50" cy="50" r="11" fill="#F2CE7B"></circle></g>`;
    } else if (state === 'learner') {
      const petals = [0, 72, 144, 216, 288].map((a) => `<g transform="rotate(${a} 50 50)"><ellipse cx="50" cy="31" rx="13" ry="18"></ellipse></g>`).join('');
      inner = `<g><g fill="currentColor">${petals}</g><circle cx="50" cy="50" r="9.5" fill="#FFFFFF" opacity="0.5"></circle><circle cx="50" cy="50" r="6.5" fill="#F2CE7B"></circle></g>`;
    } else {
      inner = `<g><path d="M50 78 C38 74 36 62 44 56" stroke="#4E8C42" stroke-width="7" stroke-linecap="round" fill="none"></path><ellipse cx="50" cy="46" rx="19" ry="24" fill="currentColor"></ellipse><path d="M31 52 C36 62 44 68 52 69" stroke="#4E8C42" stroke-width="8" stroke-linecap="round" fill="none"></path></g>`;
    }
    return `<span style="display:inline-block;line-height:0;color:${color || '#FFFFFF'};transform:rotate(${rot}deg);filter:drop-shadow(0 1px 1px rgba(70,100,60,.28))">
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">${inner}</svg></span>`;
  }

  // Plant: the potted plant used in the section garden / roster / student header.
  function plantSVG(state, size, face, grew) {
    size = Number(size) || 96;
    face = face !== false && size >= 52;
    grew = (grew === true) && (state === 'blossoming' || state === 'growing');
    const h = Math.round(size * 1.25);
    const faceBloss = face ? `<g><circle cx="53" cy="52" r="2.6" fill="#3A3A3A"></circle><circle cx="67" cy="52" r="2.6" fill="#3A3A3A"></circle><path d="M54 60 Q60 65 66 60" stroke="#3A3A3A" stroke-width="2.4" fill="none" stroke-linecap="round"></path><circle cx="48" cy="58" r="2.4" fill="#EFA9B8" opacity="0.6"></circle><circle cx="72" cy="58" r="2.4" fill="#EFA9B8" opacity="0.6"></circle></g>` : '';
    const faceGrow = face ? `<g><circle cx="52" cy="62" r="2.7" fill="#3A3A3A"></circle><circle cx="68" cy="62" r="2.7" fill="#3A3A3A"></circle><path d="M53 70 Q60 75 67 70" stroke="#3A3A3A" stroke-width="2.4" fill="none" stroke-linecap="round"></path><circle cx="47" cy="68" r="2.3" fill="#EFA9B8" opacity="0.5"></circle><circle cx="73" cy="68" r="2.3" fill="#EFA9B8" opacity="0.5"></circle></g>` : '';
    const faceTend = face ? `<g><path d="M50 82 Q53 85 56 82" stroke="#3A3A3A" stroke-width="2.2" fill="none" stroke-linecap="round"></path><path d="M64 82 Q67 85 70 82" stroke="#3A3A3A" stroke-width="2.2" fill="none" stroke-linecap="round"></path><path d="M55 89 Q60 92 65 89" stroke="#3A3A3A" stroke-width="2.2" fill="none" stroke-linecap="round"></path></g>` : '';
    const faceWait = face ? `<g><path d="M56 96 Q57.5 98 59 96" stroke="#3A3A3A" stroke-width="1.6" fill="none" stroke-linecap="round"></path><path d="M61 96 Q62.5 98 64 96" stroke="#3A3A3A" stroke-width="1.6" fill="none" stroke-linecap="round"></path></g>` : '';
    let body = '';
    if (state === 'blossoming') {
      body = `<g><ellipse cx="60" cy="70" rx="52" ry="52" fill="url(#glowP)"></ellipse><path d="M60 112 Q57 86 60 58" stroke="#6E9863" stroke-width="5.5" fill="none" stroke-linecap="round"></path><path d="M60 92 Q40 86 33 70 Q52 68 60 84 Z" fill="#9DBE8D"></path><path d="M60 100 Q82 96 90 80 Q70 76 60 92 Z" fill="#7FAE72"></path><ellipse cx="60" cy="52" rx="23" ry="24" fill="#9DBE8D"></ellipse><ellipse cx="60" cy="52" rx="23" ry="24" fill="#DCE8D4" opacity="0.25"></ellipse><g><circle cx="60" cy="30" r="9" fill="#F6D5D9"></circle><circle cx="74" cy="40" r="9" fill="#F6D5D9"></circle><circle cx="46" cy="40" r="9" fill="#F6D5D9"></circle><circle cx="69" cy="55" r="8.5" fill="#EFA9B8" opacity="0.85"></circle><circle cx="51" cy="55" r="8.5" fill="#EFA9B8" opacity="0.85"></circle><circle cx="60" cy="44" r="7.5" fill="#F2CE7B"></circle></g>${faceBloss}</g>`;
    } else if (state === 'growing') {
      body = `<g><ellipse cx="60" cy="80" rx="46" ry="46" fill="url(#glowG)"></ellipse><path d="M60 112 Q58 92 60 68" stroke="#6E9863" stroke-width="5.5" fill="none" stroke-linecap="round"></path><path d="M60 98 Q38 92 30 74 Q51 72 60 90 Z" fill="#9DBE8D"></path><path d="M60 104 Q84 99 92 82 Q71 78 60 96 Z" fill="#7FAE72"></path><ellipse cx="60" cy="62" rx="24" ry="25" fill="#9DBE8D"></ellipse><path d="M60 40 Q68 48 60 62 Q52 48 60 40 Z" fill="#7FAE72"></path>${faceGrow}</g>`;
    } else if (state === 'tending') {
      body = `<g><path d="M60 112 Q59 100 60 88" stroke="#9DBE8D" stroke-width="5" fill="none" stroke-linecap="round"></path><path d="M60 100 Q44 96 38 84 Q54 82 60 96 Z" fill="#B7CFA9"></path><ellipse cx="60" cy="82" rx="18" ry="19" fill="#B7CFA9"></ellipse><path d="M60 66 Q66 72 60 82 Q54 72 60 66 Z" fill="#9DBE8D"></path>${faceTend}<g transform="translate(84 40)"><circle cx="6" cy="8" r="15" fill="#D9E9F2"></circle><path d="M-1 4 h10 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 -3 -3 v-5 a3 3 0 0 1 3 -3 Z" fill="#A7CDE2"></path><path d="M9 5 l7 -3 v3 Z" fill="#A7CDE2"></path><path d="M-3 7 q-5 -2 -6 3" stroke="#A7CDE2" stroke-width="2" fill="none" stroke-linecap="round"></path><path d="M-8 11 l-1 4 M-6 12 l0 4 M-4 12 l1 4" stroke="#A7CDE2" stroke-width="1.6" stroke-linecap="round"></path></g></g>`;
    } else {
      body = `<g><circle cx="90" cy="34" r="10" fill="#F9E6B3"></circle><path d="M90 18 v-6 M90 56 v6 M74 34 h-6 M106 34 h6 M79 23 l-4 -4 M101 45 l4 4 M101 23 l4 -4 M79 45 l-4 4" stroke="#F2CE7B" stroke-width="2" stroke-linecap="round"></path><path d="M60 112 Q60 104 60 96" stroke="#9DBE8D" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="1 5"></path><path d="M60 100 Q50 98 46 90 Q56 89 60 98 Z" fill="#C9DBBD"></path><path d="M60 100 Q70 98 74 90 Q64 89 60 98 Z" fill="#C9DBBD"></path><ellipse cx="60" cy="97" rx="6" ry="6.5" fill="#B7CFA9"></ellipse>${faceWait}</g>`;
    }
    const pot = `<g><path d="M41 111 L79 111 L74 139 Q73 145 67 145 L53 145 Q47 145 46 139 Z" fill="#E8C4A8"></path><path d="M41 111 L79 111 L77.5 119 L42.5 119 Z" fill="#DBB08C"></path><rect x="37" y="105" width="46" height="11" rx="5.5" fill="#E3B896"></rect><ellipse cx="60" cy="110.5" rx="20" ry="4.2" fill="#B08968"></ellipse></g>`;
    const sparkle = grew ? `<g fill="#F2CE7B"><path d="M26 44 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z"></path><path d="M96 66 l1.2 3.4 3.4 1.2 -3.4 1.2 -1.2 3.4 -1.2 -3.4 -3.4 -1.2 3.4 -1.2 Z" fill="#EFA9B8"></path><circle cx="40" cy="24" r="2.2" fill="#F6D5D9"></circle></g>` : '';
    return `<span style="display:inline-block;line-height:0"><svg width="${size}" height="${h}" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
      <defs><radialGradient id="glowG" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#DCE8D4" stop-opacity="0.9"></stop><stop offset="100%" stop-color="#DCE8D4" stop-opacity="0"></stop></radialGradient><radialGradient id="glowP" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#F6D5D9" stop-opacity="0.95"></stop><stop offset="100%" stop-color="#F6D5D9" stop-opacity="0"></stop></radialGradient></defs>
      ${body}${pot}${sparkle}</svg></span>`;
  }

  // ---------------- constants ----------------
  const PALETTE = ['#FFFFFF', '#F0A84A', '#EFA9B8', '#5AA9E6', '#A99BD6', '#E4756B'];
  const TO_BLOOM = { blossoming: 'expert', growing: 'learner', tending: 'beginner', waiting: 'beginner' };
  const BAND_CHIP = {
    Beginner: { bg: '#F3E1D2', fg: '#a06a44' },
    Learner: { bg: '#DCE8D4', fg: '#4e6b43' },
    Expert: { bg: '#F6D5D9', fg: '#b0546b' },
  };
  const STATE_DOT = { blossoming: '#EFA9B8', growing: '#56C02B', tending: '#E8C4A8', waiting: '#A7CDE2' };

  // One source of truth for both nav surfaces (desktop side rail + mobile
  // bottom bar). `short` is the compact label the bottom bar shows; `center`
  // marks Ask Tilli as the raised primary action. Order = spec order intent.
  // Observations + Completion are now one destination ("Assess"); Analysis is
  // renamed to Insights everywhere.
  const NAV = [
    { key: 'garden', label: 'My Garden', short: 'My' },
    { key: 'students', label: 'Students', short: 'Students' },
    { key: 'ask', label: 'Ask Tilli', short: 'Ask Tilli', center: true },
    { key: 'assess', label: 'Assess', short: 'Assess' },
    { key: 'insights', label: 'Insights', short: 'Insights' },
  ];
  const NAV_ICON = {
    garden: '<path d="M12 21v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 13C12 9 9 6 5 6c0 4 3 7 7 7Z" fill="currentColor" opacity=".55"/><path d="M12 14c0-3 3-6 7-6 0 4-3 6-7 6Z" fill="currentColor"/>',
    students: '<circle cx="9" cy="8" r="3.2" fill="currentColor"/><circle cx="17" cy="9" r="2.6" fill="currentColor" opacity=".55"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 14c2.5 0 4.5 1.8 4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".55"/>',
    assess: '<rect x="5" y="3.5" width="14" height="17" rx="3" stroke="currentColor" stroke-width="2"/><path d="M8.5 9l1.6 1.6L13 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 15h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    logs: '<rect x="3.5" y="4" width="17" height="16" rx="3" stroke="currentColor" stroke-width="2"/><path d="M3.5 9.5h17M9 4v16" stroke="currentColor" stroke-width="2"/><circle cx="14.6" cy="13" r="1.3" fill="currentColor"/><circle cx="17.6" cy="13" r="1.3" fill="currentColor" opacity=".5"/><circle cx="14.6" cy="16.5" r="1.3" fill="currentColor" opacity=".5"/><circle cx="17.6" cy="16.5" r="1.3" fill="currentColor"/>',
    insights: '<path d="M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="6" y="11" width="3.4" height="6" rx="1.5" fill="currentColor" opacity=".55"/><rect x="11.3" y="7" width="3.4" height="10" rx="1.5" fill="currentColor"/><rect x="16.6" y="13" width="3.4" height="4" rx="1.5" fill="currentColor" opacity=".55"/>',
    ask: '<path d="M4 6.5C4 5 5 4 6.5 4h11C19 4 20 5 20 6.5v7c0 1.5-1 2.5-2.5 2.5H10l-4 3.5V16H6.5C5 16 4 15 4 13.5v-7Z" fill="currentColor"/><circle cx="9" cy="10" r="1.2" fill="#fff"/><circle cx="12" cy="10" r="1.2" fill="#fff"/><circle cx="15" cy="10" r="1.2" fill="#fff"/>',
  };

  // ---------------- module state ----------------
  let S = null;
  let root = null;
  // Browser/phone back-button support: the app never changes the URL, so we mirror
  // each "screen" into the history stack. render() pushes an entry when the screen
  // changes; the popstate handler replays a snapshot back into S. See syncHistory().
  let lastNavKey = null;
  let historyReady = false;
  let suppressPush = false; // true while restoring from popstate — don't re-push
  let popBound = false;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function firstName() { return ((S.teacher.demo && S.teacher.demo.name || '').trim().split(/\s+/)[0]) || 'there'; }
  function initials() {
    const parts = ((S.teacher.demo && S.teacher.demo.name || '').trim().split(/\s+/)).filter(Boolean);
    if (!parts.length) return 'T';
    return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  // Virtual "All grades" section: every student across every grade, so roster /
  // assess / insights / section-garden all work unchanged when 'all' is picked.
  function allSection() {
    return { id: 'all', name: 'All grades', grade: 'mixed-grade', students: S.data.sections.flatMap((s) => s.students) };
  }
  function section() {
    if (S.sectionId === 'all' && S.data.sections.length > 1) return allSection();
    return S.data.sections.find((s) => s.id === S.sectionId) || S.data.sections[0];
  }
  function sectionIdOfStudent(sid) { const s = S.data.sections.find((sec) => sec.students.some((st) => st.id === sid)); return s ? s.id : S.sectionId; }
  function openStudent(sid) { S.classModal = null; S.sectionId = sectionIdOfStudent(sid); S.studentId = sid; S.studentTab = 'overview'; S.nav = 'students'; render(); }
  const bestOf = (stu) => [...stu.skills].sort((a, b) => b.pct - a.pct)[0].name;
  const weakOf = (stu) => [...stu.skills].sort((a, b) => a.pct - b.pct)[0].name;
  function bandLine(stu) {
    if (stu.state === 'waiting') return 'Need more data — complete assessment';
    if (stu.state === 'tending') return 'Beginner — start by focusing on ' + stu.lowestSkill.name;
    if (stu.state === 'growing') return 'Learner';
    return 'Expert';
  }
  function chipHTML(chips) {
    return [['Beginner', chips.beginner], ['Learner', chips.learner], ['Expert', chips.expert]]
      .map(([label, count]) => {
        const c = BAND_CHIP[label];
        return `<span style="background:${c.bg};color:${c.fg};font-weight:700;font-size:11px;padding:4px 8px;border-radius:8px;white-space:nowrap">${count} ${label}</span>`;
      }).join('');
  }
  function classSkills() {
    const sec = section();
    return S.data.skills.map((sk) => {
      const arr = sec.students.filter((s) => s.state !== 'waiting').map((s) => s.skills.find((x) => x.key === sk.key));
      const n = arr.length || 1;
      const now = Math.round(arr.reduce((a, x) => a + x.post, 0) / n);
      const pre = Math.round(arr.reduce((a, x) => a + x.pre, 0) / n);
      const gap = Math.round(arr.reduce((a, x) => a + x.gap, 0) / n);
      const beginner = arr.filter((x) => x.band === 'Beginner').length;
      const learner = arr.filter((x) => x.band === 'Learner').length;
      const expert = arr.filter((x) => x.band === 'Expert').length;
      return { key: sk.key, name: sk.name, group: sk.group, now, pre, gap, beginner, learner, expert, total: arr.length };
    });
  }
  const STATUS_META = {
    done: { label: 'Complete', bg: '#DCE8D4', fg: '#4e6b43', dot: '#348C11' },
    in_progress: { label: 'In progress', bg: '#FCF1D2', fg: '#a98424', dot: '#F2CE7B' },
    pending: { label: 'Not started', bg: '#F3ECDD', fg: '#9a9284', dot: '#d8cfba' },
  };

  // ---------------- mount ----------------
  function mount(mountEl, ctx) {
    root = mountEl;
    S = {
      data: ctx.data, teacher: ctx.teacher || {},
      nav: 'garden', sectionId: (ctx.data.sections[0] || {}).id,
      gardenLevel: 'beds', classModal: null, studentId: null,
      rosterSearch: '', rosterSort: 'state', studentTab: 'overview',
      assessTab: 'todo', enter: { studentId: null, q: 0, ratings: {}, done: false },
      logsView: 'class', logsStudentId: null, logStudentSearch: '', logListSearch: '', logListFilter: 'all',
      insightsView: 'growing',
      add: { active: false, step: 'count', sectionId: null, count: '', total: 0, done: 0, first: '', last: '', adm: '' },
      vw: window.innerWidth,
      ask: { open: false, context: '', prompt: '', thread: [] },
      gardener: (ctx.teacher && ctx.teacher.demo && ctx.teacher.demo.gender === 'Male') ? 'm' : 'f',
    };
    injectCSS();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { S.vw = window.innerWidth; render(); }, 120); });
    bindBackButton();
    render();
  }

  function bp() { const w = S.vw; return { isPhone: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 }; }

  // ---------------- back-button / history ----------------
  // The fields that define "which screen you're on". Sub-tabs (studentTab,
  // rosterSort, etc.) are intentionally excluded — they're not back-worthy steps.
  function navState() {
    return { nav: S.nav, gardenLevel: S.gardenLevel, sectionId: S.sectionId, studentId: S.studentId, classModal: S.classModal, askOpen: S.ask.open };
  }
  function navKey() { const s = navState(); return [s.nav, s.gardenLevel, s.sectionId, s.studentId, s.classModal, s.askOpen].join('|'); }

  // Called on every render: seed the first entry, then push a new history entry
  // whenever the screen changed (unless we're mid-restore from a back/forward).
  function syncHistory() {
    const key = navKey();
    if (!historyReady) { history.replaceState({ tilliNav: navState() }, ''); historyReady = true; lastNavKey = key; return; }
    if (suppressPush || key === lastNavKey) { lastNavKey = key; return; }
    history.pushState({ tilliNav: navState() }, '');
    lastNavKey = key;
  }

  function bindBackButton() {
    if (popBound) return; // mount can run more than once; only one listener
    popBound = true;
    window.addEventListener('popstate', (e) => {
      const st = e.state && e.state.tilliNav;
      if (!st || !S) return; // outside our stack — let the browser leave the app
      suppressPush = true;
      S.nav = st.nav; S.gardenLevel = st.gardenLevel; S.sectionId = st.sectionId;
      S.studentId = st.studentId; S.classModal = st.classModal; S.ask.open = st.askOpen;
      render();
      suppressPush = false;
    });
  }

  // ---------------- render ----------------
  function render() {
    syncHistory();
    const { isPhone, isDesktop } = bp();
    const sideWide = isDesktop;
    const showSidebar = !isPhone;
    const active = S.ask.open ? 'ask' : S.nav;

    const navBtns = NAV.map((it) => {
      const on = it.key === active;
      return `<button class="dash-navbtn${on ? ' on' : ''}" data-nav="${it.key}" title="${esc(it.label)}"${on ? ' aria-current="page"' : ''}>
        <span class="ic"><svg width="21" height="21" viewBox="0 0 24 24" fill="none">${NAV_ICON[it.key]}</svg></span>
        ${sideWide ? `<span class="lb">${esc(it.label)}</span>` : ''}
      </button>`;
    }).join('');

    const sidebar = showSidebar ? `
      <aside class="dash-side${sideWide ? '' : ' narrow'}">
        <div class="dash-brand">
          <span class="dash-logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21V11" stroke="#348C11" stroke-width="2" stroke-linecap="round"/><path d="M12 11C12 7 9 4 5 4c0 4 3 7 7 7Z" fill="#9BDE1D"/><path d="M12 13c0-3 3-6 7-6 0 4-3 6-7 6Z" fill="#56C02B"/></svg></span>
          ${sideWide ? `<span class="dash-word">Tilli<span style="color:var(--green-500)"> Measures</span></span>` : ''}
        </div>
        <nav class="dash-nav">${navBtns}</nav>
        <button class="dash-profilebtn" data-nav="profile">
          <span class="dash-avatar">${esc(initials())}</span>
          ${sideWide ? `<span class="dash-prof-meta"><b>${esc((S.teacher.demo && S.teacher.demo.name) || 'Teacher')}</b><span>Teacher</span></span>` : ''}
        </button>
      </aside>` : '';

    const bottomNav = isPhone ? `
      <nav class="dash-bottomnav" aria-label="Primary">
        ${NAV.map((it) => {
          const on = it.key === active;
          // Ask Tilli is the raised primary action: always accent-treated,
          // never carries the quiet "current tab" state the other four use.
          if (it.center) {
            return `<button class="dash-bnav center" data-nav="${it.key}" aria-label="${esc(it.label)}">
              <span class="dash-fab"><svg width="26" height="26" viewBox="0 0 24 24" fill="none">${NAV_ICON[it.key]}</svg></span>
              <span class="lb">${esc(it.short)}</span>
            </button>`;
          }
          return `<button class="dash-bnav${on ? ' on' : ''}" data-nav="${it.key}"${on ? ' aria-current="page"' : ''}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">${NAV_ICON[it.key]}</svg>
            <span class="lb">${esc(it.short)}</span>
          </button>`;
        }).join('')}
      </nav>` : '';

    // Section picker persists across all five destinations (spec). Only the
    // profile panel — which isn't one of the five — hides it.
    const showChips = S.nav !== 'profile';
    // "All" appears only when there's more than one grade to combine.
    const allChip = S.data.sections.length > 1
      ? `<button class="dash-chip${S.sectionId === 'all' ? ' on' : ''}" data-section="all">All</button>` : '';
    const chips = showChips ? `<div class="dash-chips">${allChip}${S.data.sections.map((sec) => {
      const on = sec.id === S.sectionId;
      return `<button class="dash-chip${on ? ' on' : ''}" data-section="${sec.id}">${esc(sec.name)}</button>`;
    }).join('')}</div>` : '';

    root.innerHTML = `
      <div class="dash">
        ${sidebar}
        <div class="dash-col">
          <header class="dash-header">${chips}</header>
          <main class="dash-main">${mainView()}</main>
        </div>
        ${bottomNav}
        ${S.ask.open ? askPanel() : ''}
        ${S.classModal ? classModalView() : ''}
        ${addModal()}
      </div>`;
    wire();
  }

  function mainView() {
    if (S.nav === 'garden') return S.gardenLevel === 'beds' ? bedsView() : sectionGardenView();
    if (S.nav === 'profile') return profilePanel();
    if (S.nav === 'students') return S.studentId ? studentDetailView() : rosterView();
    if (S.nav === 'assess') return assessView();
    if (S.nav === 'insights') return insightsView();
    return placeholder('My Garden', '');
  }

  function placeholder(title, sub) {
    return `<div class="dash-wrap" style="max-width:820px">
      <h1 class="dash-h1">${esc(title)}</h1>
      ${sub ? `<p class="dash-sub">${esc(sub)}</p>` : ''}
      <div class="dash-card" style="text-align:center;padding:48px 28px;margin-top:16px">
        <div style="margin:0 auto 14px;width:64px;height:64px;border-radius:50%;background:var(--wash-green);display:flex;align-items:center;justify-content:center">${bloomSVG('learner', '#56C02B', 34, 4)}</div>
        <div style="font-family:'Quicksand',sans-serif;font-weight:700;font-size:18px;color:var(--ink-900)">Coming in the next update</div>
        <p style="color:var(--ink-450);font-size:14px;margin:6px 0 0">This section is being planted. The garden is ready to explore now.</p>
        <button class="btn btn-primary focus" data-nav="garden" style="margin-top:18px;padding:12px 22px">Go to My Garden</button>
      </div>
    </div>`;
  }

  // ---------------- My Garden: beds overview ----------------
  function computeBeds() {
    const secs = S.data.sections;
    const { isPhone, isDesktop, isTablet } = bp();
    const scale = 1;
    const avail = Math.min(1180, S.vw - (isDesktop ? 300 : isTablet ? 250 : 44));
    const cols = isPhone ? 1 : 2;
    const maxW = secs.length <= 2 ? 560 : 460;
    const bedW = Math.max(240, Math.min(maxW, Math.floor((avail - 26 * (cols - 1)) / cols)));
    const bushH = Math.round(bedW * 0.38);
    const pad = Math.round(bushH * 0.4);
    const svgH = bushH + pad;
    const dome = (t) => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.55);
    const surfaceY = (t) => pad + bushH - (0.3 + 0.7 * dome(t)) * bushH;

    const beds = secs.map((sec, si) => {
      const color = PALETTE[si % PALETTE.length];
      const rnd = (a, b) => { const v = Math.sin((si * 31 + a * 7 + 1) * (b * 12.9898 + 4.1414)) * 43758.5453; return v - Math.floor(v); };
      const mk = (level, r0, fill, key) => {
        const cnt = Math.max(4, Math.round(bedW / (bushH * 0.36)));
        const out = [];
        for (let i = 0; i < cnt; i++) {
          const t = (i + 0.5) / cnt;
          const r = Math.round(r0 * (0.62 + 0.38 * dome(t)) * (0.88 + rnd(i + key, 7) * 0.26));
          const span = Math.max(1, bedW - 2 * r);
          const cx = Math.round(r + t * span + (rnd(i + key, 3) - 0.5) * (span / cnt) * 0.4);
          const cy = Math.round(pad + bushH - level * (0.3 + 0.7 * dome(t)) * bushH + (rnd(i + key, 5) - 0.5) * bushH * 0.07);
          out.push({ cx: Math.min(bedW - r, Math.max(r, cx)), cy: Math.max(r, Math.min(svgH, cy)), r, fill });
        }
        return out;
      };
      const lobesBack = [...mk(0.92, bushH * 0.25, '#A7CE68', 1), ...mk(0.66, bushH * 0.28, '#93C155', 40)];
      const lobesFront = [...mk(0.38, bushH * 0.3, '#7FB246', 80), ...mk(0.14, bushH * 0.26, '#6DA03B', 120)];
      const sprigs = [];
      for (let i = 0; i < 14; i++) {
        const t = (i + 0.5) / 14;
        const x = Math.round(t * bedW + (rnd(i, 11) - 0.5) * 30);
        const sy = surfaceY(t);
        const y = Math.round(sy + (svgH - sy) * (0.2 + rnd(i, 13) * 0.6));
        sprigs.push(`M${x} ${y} q5 -7 10 -2`);
      }
      const baseFor = (st) => (st === 'expert' ? 0.34 : st === 'learner' ? 0.23 : 0.15);
      const states = sec.students.map((stu) => TO_BLOOM[stu.state] || 'learner');
      const place = (mult) => {
        const items = states.map((st, i) => ({ i, st, size: Math.max(14, Math.round(bushH * baseFor(st) * mult)) }));
        const order = [...items].sort((p, q) => q.size - p.size);
        let seedN = si * 7919 + 13;
        const rng = () => { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return seedN / 0x7fffffff; };
        const placed = [];
        for (const it of order) {
          const rad = it.size / 2;
          let ok = false;
          for (let tries = 0; tries < 260 && !ok; tries++) {
            const t = 0.04 + rng() * 0.92;
            const cx = t * bedW;
            if (cx - rad < 2 || cx + rad > bedW - 2) continue;
            const sy = surfaceY(t);
            const yMin = sy + rad * 0.85;
            const yMax = svgH - rad * 0.8;
            if (yMax <= yMin) continue;
            const cy = yMin + rng() * (yMax - yMin);
            let clash = false;
            for (const p of placed) { if (Math.hypot(p.cx - cx, p.cy - cy) < (p.size / 2 + rad) * 1.04) { clash = true; break; } }
            if (!clash) { placed.push(Object.assign({}, it, { cx, cy })); ok = true; }
          }
          if (!ok) return null;
        }
        return placed;
      };
      let placed = null;
      for (let mult = scale, k = 0; k < 9 && !placed; k++, mult *= 0.9) placed = place(mult);
      if (!placed) placed = place(0.42) || [];
      const byIndex = [];
      placed.forEach((p) => { byIndex[p.i] = p; });
      const plants = sec.students.map((stu, i) => {
        const p = byIndex[i] || { size: 16, cx: bedW / 2, cy: svgH * 0.6 };
        const size = p.size;
        const st = states[i];
        return {
          state: st, color, size, seed: (i * 7 + si * 13) % 97,
          name: stu.name, bandLabel: st === 'expert' ? 'Expert' : st === 'learner' ? 'Learner' : 'Beginner',
          goodSkill: bestOf(stu), helpSkill: weakOf(stu),
          left: Math.round(p.cx - size / 2), bottom: Math.round(svgH - p.cy - size / 2), z: 10 + Math.round(p.cy),
        };
      });
      return {
        isAdd: false, id: sec.id, name: sec.name, count: sec.students.length, plants,
        bedW, svgH, viewBox: '0 0 ' + bedW + ' ' + svgH,
        baseTop: Math.round(pad + bushH * 0.72), baseH: Math.round(bushH * 0.28), baseX: Math.round(bushH * 0.24), baseW: Math.round(bedW - bushH * 0.48),
        lobesBack, lobesFront, sprigs,
      };
    });
    beds.push({ isAdd: true, bedW, svgH });
    return beds;
  }

  function bedsView() {
    const beds = computeBeds();
    const bedsHTML = beds.map((bd) => {
      if (bd.isAdd) {
        return `<button class="bed-wrap" data-add-class="1">
          <div class="bed-stage" style="width:${bd.bedW}px;height:${bd.svgH}px">
            <div class="bed-add"><span class="plus">+</span><span>Plant a new bush</span></div>
          </div></button>`;
      }
      const circles = (arr) => arr.map((lo) => `<circle cx="${lo.cx}" cy="${lo.cy}" r="${lo.r}" fill="${lo.fill}"></circle>`).join('');
      const sprigs = bd.sprigs.map((d) => `<path d="${d}" stroke="#5F9134" stroke-width="2" stroke-linecap="round" opacity="0.45" fill="none"></path>`).join('');
      const plants = bd.plants.map((pl) => `
        <div class="bed-plant" style="left:${pl.left}px;bottom:${pl.bottom}px;z-index:${pl.z}">
          ${bloomSVG(pl.state, pl.color, pl.size, pl.seed)}
          <div class="bed-tip">
            <div class="nm">${esc(pl.name)}</div>
            <div class="bl">${esc(pl.bandLabel)}</div>
            <div class="rw"><b style="color:#4e6b43">Good at</b> <span>${esc(pl.goodSkill)}</span></div>
            <div class="rw"><b style="color:#a5762a">Needs help</b> <span>${esc(pl.helpSkill)}</span></div>
          </div>
        </div>`).join('');
      return `<button class="bed-wrap" data-open-class="${bd.id}">
        <div class="bed-stage" style="width:${bd.bedW}px;height:${bd.svgH}px">
          <svg width="${bd.bedW}" height="${bd.svgH}" viewBox="${bd.viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;left:0;bottom:0;z-index:1;overflow:visible;clip-path:inset(-400px -400px 0 -400px)">
            ${circles(bd.lobesBack)}
            <rect x="${bd.baseX}" y="${bd.baseTop}" width="${bd.baseW}" height="${bd.baseH}" rx="26" fill="#74A83E"></rect>
            ${circles(bd.lobesFront)}
            ${sprigs}
          </svg>
          ${plants}
        </div>
        <div class="bed-label"><span class="nm">${esc(bd.name)}</span><span class="ct">${bd.count} students</span></div>
      </button>`;
    }).join('');

    const key = [
      { state: 'beginner', title: 'Beginner', desc: 'a tiny bud', size: 18 },
      { state: 'learner', title: 'Learner', desc: 'a small flower', size: 26 },
      { state: 'expert', title: 'Expert', desc: 'a big open flower', size: 38 },
    ].map((k) => `<div class="bed-key-item">${bloomSVG(k.state, '#5AA9E6', k.size, 5)}<span><b>${k.title}</b> · ${k.desc}</span></div>`).join('');

    return `<div class="dash-wrap garden-beds">
      <div class="garden-head">
        <div>
          <h1 class="dash-h1" style="color:var(--green-700)">My garden</h1>
          <p class="dash-sub">Good morning, ${esc(firstName())} 🌱 — every bloom is one of your students. Pick a bush to tend.</p>
        </div>
        <div class="garden-head-right">
          <button class="dash-avatarbtn focus" data-nav="profile" title="Your profile & sign out" aria-label="Your profile">${esc(initials())}</button>
          ${gardenerSVG()}
        </div>
      </div>
      <div class="beds-grid">${bedsHTML}</div>
      <div class="bed-key">${key}</div>
    </div>`;
  }

  function gardenerSVG() {
    const hair = S.gardener === 'm'
      ? `<path d="M47 46 q2 -26 27 -26 q25 0 27 26 q-10 -10 -27 -10 q-17 0 -27 10 Z" fill="#4A3B2E"></path>`
      : `<g><path d="M47 48 q0 -30 27 -30 q27 0 27 30 q0 -14 -27 -14 q-27 0 -27 14 Z" fill="#5B4636"></path><path d="M100 52 q12 14 6 34 q-8 -4 -10 -18" fill="#5B4636"></path></g>`;
    return `<div class="gardener" aria-hidden="true"><svg width="92" height="132" viewBox="0 0 148 212" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="74" cy="203" rx="40" ry="7" fill="#000" opacity="0.06"></ellipse>
      <path d="M56 118 Q52 156 50 198" stroke="#6D5B4B" stroke-width="9" stroke-linecap="round"></path>
      <path d="M92 118 Q96 156 98 198" stroke="#6D5B4B" stroke-width="9" stroke-linecap="round"></path>
      <path d="M44 200 h20 M84 200 h20" stroke="#4A3F35" stroke-width="9" stroke-linecap="round"></path>
      <path d="M48 78 h52 q10 0 10 12 v28 q0 10 -10 10 h-52 q-10 0 -10 -10 v-28 q0 -12 10 -12 Z" fill="#56C02B"></path>
      <path d="M62 78 v42 M86 78 v42" stroke="#49A524" stroke-width="3"></path>
      <path d="M38 86 Q22 104 20 128" stroke="#FCC30B" stroke-width="9" stroke-linecap="round"></path>
      <path d="M110 86 Q126 102 128 122" stroke="#FCC30B" stroke-width="9" stroke-linecap="round"></path>
      <path d="M46 84 h56 v-6 q0 -8 -8 -8 h-40 q-8 0 -8 8 Z" fill="#FCC30B"></path>
      <circle cx="74" cy="48" r="27" fill="#F6DFC8"></circle>
      ${hair}
      <ellipse cx="74" cy="32" rx="46" ry="11" fill="#E8B96F"></ellipse>
      <path d="M50 32 q0 -20 24 -20 q24 0 24 20 Z" fill="#FCC30B"></path>
      <path d="M50 30 q24 8 48 0" stroke="#E8912D" stroke-width="4" stroke-linecap="round" fill="none"></path>
      <circle cx="64" cy="48" r="3" fill="#3A3A3A"></circle><circle cx="84" cy="48" r="3" fill="#3A3A3A"></circle>
      <path d="M66 58 q8 6 16 0" stroke="#3A3A3A" stroke-width="2.6" stroke-linecap="round" fill="none"></path>
      <circle cx="56" cy="55" r="4" fill="#EFA9B8" opacity="0.5"></circle><circle cx="92" cy="55" r="4" fill="#EFA9B8" opacity="0.5"></circle>
      <g transform="translate(112 118)"><path d="M0 4 h20 a4 4 0 0 1 4 4 v12 a5 5 0 0 1 -5 5 h-18 a5 5 0 0 1 -5 -5 v-12 a4 4 0 0 1 4 -4 Z" fill="#26BDE2"></path><path d="M20 6 l10 -5 v6 Z" fill="#26BDE2"></path><path d="M-4 8 q-8 -3 -9 5" stroke="#26BDE2" stroke-width="3" stroke-linecap="round" fill="none"></path></g>
    </svg></div>`;
  }

  // ---------------- class roster modal ----------------
  function classModalView() {
    const sec = S.data.sections.find((s) => s.id === S.classModal);
    if (!sec) return '';
    const idx = S.data.sections.findIndex((s) => s.id === S.classModal);
    const color = PALETTE[idx % PALETTE.length];
    const rows = [...sec.students].sort((a, b) => a.name.localeCompare(b.name)).map((stu, i) => {
      const st = TO_BLOOM[stu.state] || 'learner';
      const size = st === 'expert' ? 34 : st === 'learner' ? 26 : 20;
      const label = st === 'expert' ? 'Expert' : st === 'learner' ? 'Learner' : 'Beginner';
      return `<button class="cm-row" data-open-student="${esc(stu.id)}">
        <span class="cm-bloom">${bloomSVG(st, color, size, (i * 11) % 97)}</span>
        <span class="cm-info"><span class="nm">${esc(stu.name)}</span>
          <span class="sk"><span><b>Good at</b> ${esc(bestOf(stu))}</span><span style="color:#a5762a"><b>Needs help</b> ${esc(weakOf(stu))}</span></span></span>
        <span class="cm-band">${label}</span>
      </button>`;
    }).join('');
    return `<div class="cm-backdrop" data-close-modal>
      <div class="cm-card" data-stop>
        <div class="cm-head">
          <div><div class="cm-title">${esc(sec.name)}</div><div class="cm-sub">${sec.students.length} students · one bloom each</div></div>
          <button class="cm-x" data-close-modal>✕</button>
        </div>
        <div class="cm-list">${rows}</div>
        <div class="cm-foot"><button class="btn btn-primary focus" data-open-bed="${esc(sec.id)}" style="padding:12px 20px">Open ${esc(sec.name)} garden →</button></div>
      </div>
    </div>`;
  }

  // ---------------- My Garden: section view ----------------
  function sectionGardenView() {
    const sec = section();
    const { isPhone } = bp();
    const order = { tending: 0, waiting: 1, growing: 2, blossoming: 3 };
    const sorted = [...sec.students].sort((a, b) => order[a.state] - order[b.state]);
    const sizeFor = (st) => ({ blossoming: isPhone ? 74 : 88, growing: isPhone ? 66 : 80, tending: isPhone ? 60 : 72, waiting: isPhone ? 54 : 64 }[st]);
    const offs = ['10px', '0px', '16px', '6px', '20px', '2px', '12px'];
    const plantCol = (isPhone ? 72 : 94) + 'px';

    const bed = sorted.map((st, i) => `
      <div class="pg-cell" style="transform:translateY(${offs[i % offs.length]})">
        <button class="pg-plant" data-open-student="${esc(st.id)}" title="${esc(st.name)}">${plantSVG(st.state, sizeFor(st.state), !isPhone, st.grewSincePre > 8)}</button>
        <div class="pg-tip">
          <div class="nm">${esc(st.name)}</div><div class="sl">${esc(bandLine(st))}</div>
          <div class="ch">${chipHTML(st.chips)}</div>
          <div class="vw">View ${esc(st.dispFirst)} →</div>
        </div>
      </div>`).join('');

    const legend = [
      { title: 'Expert', desc: 'thriving overall', dot: '#EFA9B8' },
      { title: 'Learner', desc: 'on track', dot: '#56C02B' },
      { title: 'Beginner', desc: 'start with one focus skill', dot: '#E8C4A8' },
      { title: 'Need more data', desc: 'complete assessment', dot: '#A7CDE2' },
    ].map((l) => `<div class="pg-legend-item"><span class="dot" style="background:${l.dot}"></span><span><b>${l.title}</b> · ${l.desc}</span></div>`).join('');

    const blossomed = sec.students.filter((s) => s.state === 'blossoming').length;
    const cs = classSkills().filter((c) => c.total > 0);
    const top = [...cs].sort((a, b) => b.now - a.now).slice(0, 2);
    const low = [...cs].sort((a, b) => a.now - b.now).slice(0, 3);
    const grade = sec.grade;

    const tendList = sorted.filter((st) => st.state === 'tending').slice(0, 3);
    const nTend = sorted.filter((st) => st.state === 'tending').length;
    const tendCards = tendList.map((st) => `
      <div class="tend-card">
        <div class="tend-top"><span class="pl">${plantSVG('tending', 52, false, false)}</span>
          <span><span class="nm">${esc(st.dispFirst)}</span><span class="bd">${esc(st.band)} overall</span></span></div>
        <p class="reason">${esc(st.tendReason)}</p>
        <button class="btn-ask-a focus" data-ask="activity" data-skill="${esc(st.lowestSkill.name)}" data-band="${esc(st.lowestSkill.band)}">
          ${chatIcon('#fff')} Ask Tilli for an activity</button>
        <button class="tend-see focus" data-open-student="${esc(st.id)}">See ${esc(st.dispFirst)}'s skills →</button>
      </div>`).join('');

    const highlights = top.map((t) => `<span class="hl-chip">${esc(t.name)} · ${t.now}%</span>`).join('');
    const growingRows = low.map((l) => `
      <div class="grow-row"><div class="gm"><div class="nm">${esc(l.name)}</div><div class="sub">${l.beginner} students at Beginner level</div></div>
      <button class="grow-ask focus" data-ask="class" data-skill="${esc(l.name)}" data-beg="${l.beginner}">Ask Tilli for a class activity</button></div>`).join('');

    return `<div class="dash-wrap section-garden">
      <button class="link-back focus" data-back-beds>← My garden</button>
      <div class="garden-head" style="margin-bottom:6px">
        <div>
          <h1 class="dash-h1">Good morning, ${esc(firstName())} 🌱</h1>
          <p class="dash-sub">Your <b style="color:var(--ink-900)">${esc(sec.name)}</b> garden, week 14.</p>
        </div>
        <div class="blossom-pill">${sunSmall()} ${blossomed} student${blossomed === 1 ? '' : 's'} reached Expert since baseline</div>
      </div>

      <section class="plant-bed">
        <div class="pg-grid" style="grid-template-columns:repeat(auto-fill,minmax(${plantCol},1fr))">${bed}</div>
        <div class="pg-legend">${legend}</div>
      </section>

      <section style="margin-top:26px">
        <h2 class="dash-h2">🌱 ${nTend} student${nTend === 1 ? '' : 's'} at Beginner — start here</h2>
        <div class="tend-grid">${tendCards || '<p class="dash-sub">No students need tending right now — lovely. 🌼</p>'}</div>
      </section>

      <div class="two-col" style="margin-top:26px">
        <section class="hl-card">
          <div class="eyebrow" style="color:#c07689">Garden highlights</div>
          <p style="margin:0 0 14px;font-size:15px;color:#7a5560;line-height:1.45">Your class's strongest skills right now:</p>
          <div class="hl-chips">${highlights}</div>
          <button class="hl-more focus" data-nav="insights">See all in Insights →</button>
        </section>
        <section class="grow-card">
          <div class="eyebrow" style="color:#9a8f5a">Growing areas</div>
          <div class="grow-list">${growingRows}</div>
        </section>
      </div>
    </div>`;
  }

  // ---------------- Students: roster ----------------
  function rosterList() {
    const sec = section();
    let list = sec.students.filter((st) => st.name.toLowerCase().includes(S.rosterSearch.toLowerCase()));
    const order = { tending: 0, waiting: 1, growing: 2, blossoming: 3 };
    if (S.rosterSort === 'state') list.sort((a, b) => order[a.state] - order[b.state]);
    else if (S.rosterSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => b.grewSincePre - a.grewSincePre);
    if (!list.length) return '<p class="dash-sub" style="padding:8px 2px">No students match “' + esc(S.rosterSearch) + '”.</p>';
    return list.map((st) => `
      <button class="roster-row" data-open-student="${esc(st.id)}">
        <span class="rr-plant">${plantSVG(st.state, 46, false, false)}</span>
        <span class="rr-info"><span class="nm">${esc(st.name)}</span><span class="sl">${esc(bandLine(st))}</span></span>
        <span class="rr-chips">${chipHTML(st.chips)}</span>
      </button>`).join('');
  }

  function rosterView() {
    const sec = section();
    const sortTabs = [['state', 'State'], ['name', 'Name'], ['growth', 'Growth']]
      .map(([k, l]) => `<button class="pill-tab rsort${S.rosterSort === k ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('');
    return `<div class="dash-wrap" style="max-width:900px">
      <h1 class="dash-h1">Students</h1>
      <p class="dash-sub">${esc(sec.name)} · ${sec.students.length} students</p>
      <div class="roster-tools">
        <div class="roster-search">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="#9AA3AF" stroke-width="2"/><path d="M16 16l4 4" stroke="#9AA3AF" stroke-width="2" stroke-linecap="round"/></svg>
          <input id="roster-search" value="${esc(S.rosterSearch)}" placeholder="Search a student…" autocomplete="off">
        </div>
        <div class="roster-sort"><span>Sort</span>${sortTabs}</div>
      </div>
      <div id="roster-list" class="roster-list">${rosterList()}</div>
    </div>`;
  }

  function refreshRoster() {
    const listEl = root.querySelector('#roster-list');
    if (!listEl) return;
    listEl.innerHTML = rosterList();
    listEl.querySelectorAll('[data-open-student]').forEach((b) => b.addEventListener('click', () => openStudent(b.dataset.openStudent)));
  }

  // ---------------- Students: detail ----------------
  function studentDetailView() {
    const sec = section();
    const stu = sec.students.find((x) => x.id === S.studentId);
    if (!stu) { S.studentId = null; return rosterView(); }
    const tab = S.studentTab;
    const tabBtn = [['overview', 'Overview'], ['skills', 'Skills'], ['perspectives', 'Perspectives'], ['history', 'History']]
      .map(([k, l]) => `<button class="pill-tab stab${tab === k ? ' on' : ''}" data-stab="${k}">${l}</button>`).join('');

    let panel = '';
    if (tab === 'overview') panel = stuOverview(stu);
    else if (tab === 'skills') panel = stuSkills(stu);
    else if (tab === 'perspectives') panel = stuPerspectives(stu);
    else panel = stuHistory(stu);

    return `<div class="dash-wrap" style="max-width:960px">
      <button class="link-back focus" data-back-roster>← All students</button>
      <div class="stu-head">
        <span class="stu-plant">${plantSVG(stu.state, 76, true, stu.grewSincePre > 8)}</span>
        <div class="stu-meta">
          <h1 class="stu-name">${esc(stu.name)}</h1>
          <div class="stu-sub">${esc(stu.section)} · ${esc(stu.parentEmail)}</div>
          <div class="stu-chips">${chipHTML(stu.chips)}</div>
        </div>
      </div>
      <div class="stu-tabs">${tabBtn}</div>
      ${panel}
    </div>`;
  }

  function stuOverview(stu) {
    const midAvg = Math.round(stu.skills.reduce((a, x) => a + x.mid, 0) / stu.skills.length);
    return `
      <div class="two-col">
        <div class="hl-card">
          <div class="eyebrow" style="color:#c07689">🌸 Something that grew</div>
          <p style="margin:0 0 14px;font-size:15.5px;color:#7a5560;line-height:1.45">${esc(stu.celebrateLine)}</p>
          <button class="hl-more focus" data-ask-stu="grew" style="background:rgba(255,255,255,.75);color:#a24d63;border-radius:11px;padding:10px 14px">Ask Tilli to keep it growing →</button>
        </div>
        <div class="grow-card">
          <div class="eyebrow" style="color:#9a8f5a">🪴 Start by focusing on</div>
          <p style="margin:0 0 14px;font-size:15.5px;color:#6a6153;line-height:1.45">${esc(stu.tendReason)}.</p>
          <button class="btn-ask-a focus" data-ask-stu="tend" style="display:inline-flex;width:auto">Ask Tilli for an activity →</button>
        </div>
      </div>
      <div class="dash-card" style="padding:20px 22px;margin-top:16px">
        <div style="font-weight:800;font-size:15px;margin-bottom:2px">Overall growth</div>
        <div style="font-size:12.5px;color:var(--ink-300);margin-bottom:14px">Band across Pre · Mid · Post assessment windows</div>
        ${trendSVG([stu.overallPre, midAvg, stu.overallPct])}
      </div>`;
  }

  function stuSkills(stu) {
    const wcol = { Beginner: '#E8C4A8', Learner: '#B7CFA9', Expert: '#EFA9B8' };
    const bandName = (v) => (v < 34 ? 'Beginner' : v < 67 ? 'Learner' : 'Expert');
    const card = (sk) => {
      const c = BAND_CHIP[sk.band];
      const win = (label, val) => `<div style="flex:1;text-align:center"><div style="height:44px;display:flex;align-items:flex-end;justify-content:center"><div style="width:16px;border-radius:6px 6px 3px 3px;background:${wcol[bandName(val)]};height:${Math.max(6, Math.round(val * 0.4))}px"></div></div><div style="font-size:10px;color:var(--ink-300);font-weight:700;margin-top:4px">${label}</div><div style="font-size:10.5px;color:#6a6153;font-weight:700">${val}</div></div>`;
      return `<div class="skill-card">
        <div class="sc-head"><div class="nm">${esc(sk.name)}</div><span class="sc-band" style="background:${c.bg};color:${c.fg}">${sk.band}</span></div>
        <div class="sc-bars">${win('Pre', sk.pre)}${win('Mid', sk.mid)}${win('Post', sk.post)}</div>
        <div class="sc-persp"><span>👩‍🏫 ${sk.teacher}%</span><span>🏠 ${sk.parent}%</span><span>🧒 ${sk.student}%</span></div>
        <button class="sc-ask focus" data-ask-skill="${esc(sk.name)}" data-band="${esc(sk.band)}">Ask Tilli about ${esc(sk.name.split(' ')[0])}</button>
      </div>`;
    };
    const group = (grp, title) => {
      const cards = stu.skills.filter((sk) => sk.group === grp).map(card).join('');
      return `<div style="margin-bottom:22px"><h3 class="sg-title">${title}</h3><div class="skill-grid">${cards}</div></div>`;
    };
    return group('sel', 'Social-Emotional') + group('cog', 'Cognitive');
  }

  function stuPerspectives(stu) {
    const rows = [...stu.skills].sort((a, b) => b.gap - a.gap).slice(0, 6).map((sk) => `
      <div class="gap-row">
        <div class="gm"><div class="nm">${esc(sk.name)}</div><div class="sub">T ${sk.teacher} · P ${sk.parent} · S ${sk.student}</div></div>
        <div class="gap-right">
          ${sk.gap >= 22 ? '<span class="gap-badge">Worth a conversation</span>' : ''}
          <button class="gap-ask focus" data-ask-skill="${esc(sk.name)}" data-band="${esc(sk.band)}" title="Talk this through with Tilli">${chatIcon('#B9A9DC')}</button>
        </div>
      </div>`).join('');
    return `
      <div class="persp-note">Different views can mean a skill shows up differently at home and at school. Gaps aren't problems — they're conversations worth having. 🌤️</div>
      <div class="two-col">
        <div class="dash-card" style="padding:18px;text-align:center">
          <div style="font-weight:800;font-size:14px;margin-bottom:6px">Three perspectives</div>
          ${radarSVG(stu)}
          <div style="display:flex;justify-content:center;gap:14px;margin-top:10px;font-size:11.5px;font-weight:700"><span style="color:#49A524">● Teacher</span><span style="color:#B9A9DC">● Parent</span><span style="color:#7FB7D6">● Student</span></div>
        </div>
        <div class="dash-card" style="padding:6px 8px">${rows}</div>
      </div>`;
  }

  function stuHistory(stu) {
    const rows = [
      { title: 'Post assessment', meta: 'Teacher observation · week 14', status: 'In progress', dot: '#F2CE7B', color: '#a98424' },
      { title: 'Mid assessment', meta: 'Teacher · Parent report · complete', status: 'Done', dot: '#56C02B', color: '#5c8150' },
      { title: 'Baseline (Pre)', meta: 'Teacher · Parent · Student-direct', status: 'Done', dot: '#56C02B', color: '#5c8150' },
      { title: 'Enrolled', meta: 'Added to ' + stu.section, status: '—', dot: '#A7CDE2', color: 'var(--ink-300)' },
    ].map((h) => `<div class="hist-row"><span class="dot" style="background:${h.dot}"></span><div class="hm"><div class="nm">${esc(h.title)}</div><div class="sub">${esc(h.meta)}</div></div><div class="st" style="color:${h.color}">${esc(h.status)}</div></div>`).join('');
    return `<div class="dash-card" style="padding:8px 20px">${rows}</div>`;
  }

  // ---------------- charts ----------------
  function trendSVG(vals) {
    const W = 520, H = 120, pad = 30;
    const xs = [pad, W / 2, W - pad];
    const y = (v) => H - pad - (v / 100) * (H - pad * 2);
    const labels = ['Pre', 'Mid', 'Post'];
    let dots = '', txt = '', band = '';
    vals.forEach((v, i) => {
      dots += `<circle cx="${xs[i]}" cy="${y(v)}" r="5.5" fill="#49A524"/>`;
      txt += `<text x="${xs[i]}" y="${H - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#9AA3AF" font-family="Montserrat">${labels[i]}</text>`;
      txt += `<text x="${xs[i]}" y="${y(v) - 13}" text-anchor="middle" font-size="12" font-weight="800" fill="#4e6b43" font-family="Montserrat">${v}%</text>`;
    });
    [33, 67].forEach((b) => { band += `<line x1="${pad}" y1="${y(b)}" x2="${W - pad}" y2="${y(b)}" stroke="#ECEEF2" stroke-width="1.5" stroke-dasharray="4 5"/>`; });
    const pts = vals.map((v, i) => xs[i] + ',' + y(v));
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px" xmlns="http://www.w3.org/2000/svg">${band}<polyline points="${pts.join(' ')}" fill="none" stroke="#56C02B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}${txt}</svg>`;
  }

  function radarSVG(stu) {
    const skills = stu.skills, n = skills.length, cx = 140, cy = 130, R = 100;
    const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const poly = (accessor, color, fill) => {
      const pts = skills.map((sk, i) => { const r = (accessor(sk) / 100) * R; return (cx + r * Math.cos(ang(i))) + ',' + (cy + r * Math.sin(ang(i))); });
      return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${color}" stroke-width="2"/>`;
    };
    let grid = '';
    [0.33, 0.66, 1].forEach((f) => { const pts = skills.map((sk, i) => (cx + R * f * Math.cos(ang(i))) + ',' + (cy + R * f * Math.sin(ang(i)))); grid += `<polygon points="${pts.join(' ')}" fill="none" stroke="#ECEEF2" stroke-width="1"/>`; });
    return `<svg viewBox="0 0 280 260" width="100%" style="max-width:280px" xmlns="http://www.w3.org/2000/svg">${grid}${poly((sk) => sk.parent, '#B9A9DC', 'rgba(185,169,220,.18)')}${poly((sk) => sk.student, '#7FB7D6', 'rgba(127,183,214,.18)')}${poly((sk) => sk.teacher, '#49A524', 'rgba(86,192,43,.22)')}</svg>`;
  }

  function chatIcon(fill) { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6.5C4 5 5 4 6.5 4h11C19 4 20 5 20 6.5v7c0 1.5-1 2.5-2.5 2.5H10l-4 3.5V16H6.5C5 16 4 15 4 13.5v-7Z" fill="${fill}"/></svg>`; }
  function sunSmall() { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="#F2CE7B"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" stroke="#F2CE7B" stroke-width="2" stroke-linecap="round"/></svg>`; }

  function ringSVG(done, total) {
    const R = 34, C = 2 * Math.PI * R, frac = total ? done / total : 0;
    return `<svg width="92" height="92" viewBox="0 0 92 92" xmlns="http://www.w3.org/2000/svg"><circle cx="46" cy="46" r="${R}" fill="none" stroke="#ECEEF2" stroke-width="9"/><circle cx="46" cy="46" r="${R}" fill="none" stroke="#56C02B" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 46 46)"/><text x="46" y="50" text-anchor="middle" font-size="19" font-weight="800" fill="#4e6b43" font-family="Montserrat">${done}/${total}</text></svg>`;
  }

  // ================= Observations =================
  const OBS_ANCHORS = {
    emotion_awareness: 'Notices and names their own feelings in the moment.',
    emotion_regulation: 'Calms down and recovers after being upset, with support.',
    empathy: 'Notices when a classmate is upset and responds kindly.',
    relationship_skills: 'Joins play and takes turns with peers.',
    metacognition: 'Talks about how they solved a problem or what was tricky.',
    critical_thinking: "Asks 'why' and gives reasons for their thinking.",
    working_memory: 'Follows a two-step instruction without reminders.',
    planning: 'Gathers what they need before starting a task.',
    cognitive_flexibility: 'Switches between activities without much fuss.',
    inhibition_distraction: "Stays with a task when there's noise nearby.",
    inhibition_response: 'Waits for their turn instead of calling out.',
    attention: 'Stays focused through a short group activity.',
  };
  const STAR_LABELS = ['Emerging', 'Beginner', 'Growing', 'Expert'];

  // Merged destination: Observations + Completion are now one "Assess" place
  // with three sub-tabs — To-do (the journey/what's next), Enter (record an
  // observation), Completed (who has finished each window).
  function assessView() {
    const sec = section();
    const tab = S.assessTab || 'todo';
    const subTabs = [['todo', 'To-do'], ['enter', 'Enter'], ['completed', 'Completed']]
      .map(([k, l]) => `<button class="pill-tab atab${tab === k ? ' on' : ''}" data-assesstab="${k}">${l}</button>`).join('');
    let body, subtitle;
    if (tab === 'enter') { body = obsEnter(); subtitle = sec.name + ' · recording an observation'; }
    else if (tab === 'completed') { body = assessCompleted(); subtitle = "Who has finished each assessment window — and who's still waiting."; }
    else { body = obsVine(); subtitle = "Your class's assessment journey grows as each window is complete. Tend the glowing window next."; }
    return `<div class="dash-wrap" style="max-width:1080px">
      <h1 class="dash-h1" style="color:var(--green-700)">Assess</h1>
      <p class="dash-sub" style="max-width:560px">${esc(subtitle)}</p>
      <div class="log-tabs" style="margin-top:16px">${subTabs}</div>
      <div style="margin-top:16px">${body}</div>
    </div>`;
  }

  function obsVine() {
    const sec = section();
    const nStu = sec.students.length;
    const journey = [
      { key: 'pre', title: 'Pre-training survey', meta: 'Completed · Apr 2', body: 'Your baseline reflection on the class.', st: 'done' },
      { key: 'base', title: 'Baseline observations', meta: 'Completed · Apr 18', body: 'All ' + nStu + ' students observed', st: 'done' },
      { key: 'post', title: 'Post-training survey', meta: 'Due Apr 25', body: 'Reflect on your class after training', st: 'active' },
      { key: 'm18', title: '18-week check-in', meta: 'Locked', body: '', st: 'locked' },
      { key: 'mid', title: 'Mid-year report', meta: 'Locked', body: '', st: 'locked' },
      { key: 'm36', title: '36-week check-in', meta: 'Locked', body: '', st: 'locked' },
      { key: 'end', title: 'End-of-year report', meta: 'Locked', body: '', st: 'locked' },
    ];
    const flower = '<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="12" r="6.4" fill="#EFA9B8"/><circle cx="31.5" cy="19" r="6.4" fill="#EFA9B8"/><circle cx="27.8" cy="30" r="6.4" fill="#EFA9B8"/><circle cx="16.2" cy="30" r="6.4" fill="#EFA9B8"/><circle cx="12.5" cy="19" r="6.4" fill="#EFA9B8"/><circle cx="22" cy="22" r="6.6" fill="#F2CE7B"/></svg>';
    const sprout = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 21v-8" stroke="#348C11" stroke-width="2" stroke-linecap="round"/><path d="M12 13C12 9 9 6 5 6c0 4 3 7 7 7Z" fill="#9BDE1D"/><path d="M12 14c0-3 3-6 7-6 0 4-3 6-7 6Z" fill="#56C02B"/></svg>';
    const lock = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="10.5" width="14" height="9.5" rx="2.4" fill="#b0a794"/><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="#b0a794" stroke-width="2"/></svg>';
    const nodes = journey.map((j) => {
      const dn = j.st === 'done', active = j.st === 'active', locked = j.st === 'locked';
      const isBase = j.key === 'base';
      const clickable = active || dn;
      const dataAttr = active || (dn && isBase) ? 'data-obs-continue="1"' : dn ? 'data-obs-report="1"' : '';
      const marker = dn ? flower : active ? `<div class="obs-marker active">${sprout}</div>` : `<div class="obs-marker lock">${lock}</div>`;
      const badge = dn ? 'Complete' : active ? 'Active' : 'Locked';
      const cta = j.key === 'post' ? 'Start survey →' : (dn && isBase) ? 'Open baseline observations →' : '';
      return `<div class="obs-row">
        <div class="obs-node">${marker}</div>
        <button class="obs-card ${j.st}" ${dataAttr} ${clickable ? '' : 'disabled'}>
          <div class="obs-card-top"><div class="obs-card-title">${esc(j.title)}</div><span class="obs-badge ${j.st}">${badge}</span></div>
          <div class="obs-meta">${esc(j.meta)}</div>
          ${j.body ? `<div class="obs-body">${esc(j.body)}</div>` : ''}
          ${cta ? `<span class="obs-cta ${active ? 'active' : ''}">${cta}</span>` : ''}
        </button>
      </div>`;
    }).join('');
    return `<div class="obs-vine">${vineSVG(journey.length)}<div class="obs-nodes">${nodes}</div></div>`;
  }

  function vineSVG(n) {
    const rowH = 152, W = 72, H = rowH * n, cx = 36;
    const ys = Array.from({ length: n }, (_, i) => i * rowH + 30);
    let d = 'M ' + cx + ' 0';
    ys.forEach((y, i) => { const p = i === 0 ? 0 : ys[i - 1]; const dir = i % 2 ? -1 : 1; d += ' C ' + (cx + dir * 20) + ' ' + (p + (y - p) * 0.35) + ', ' + (cx + dir * 20) + ' ' + (y - (y - p) * 0.35) + ', ' + cx + ' ' + y; });
    d += ' L ' + cx + ' ' + H;
    let leaves = '';
    ys.forEach((y, i) => { if (i === 0) return; const my = (ys[i - 1] + y) / 2; const dir = i % 2 ? -1 : 1; leaves += '<path d="M ' + cx + ' ' + my + ' q ' + (dir * 15) + ' -7 ' + (dir * 26) + ' 3 q ' + (-dir * 12) + ' 7 ' + (-dir * 26) + ' -3 z" fill="#A9C79A"/>'; });
    return `<div class="obs-vine-svg" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${d}" stroke="#8FB37E" stroke-width="4.5" stroke-linecap="round"/>${leaves}</svg></div>`;
  }

  function obsEnter() {
    const sec = section();
    const e = S.enter;
    const stu = (e.studentId && sec.students.find((x) => x.id === e.studentId)) || sec.students[0];
    const skills = S.data.skills, sk = skills[e.q];
    const dots = skills.map((_, i) => `<div class="obs-dot" style="background:${i < e.q ? '#56C02B' : i === e.q ? '#F2CE7B' : '#EAE3D3'}"></div>`).join('');
    const stars = STAR_LABELS.map((lbl, i) => {
      const picked = e.ratings[sk.key] === i + 1;
      const st = Array.from({ length: 4 }, (_, j) => `<svg width="15" height="15" viewBox="0 0 24 24" fill="${j <= i ? '#F2CE7B' : '#EAE3D3'}"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/></svg>`).join('');
      return `<button class="obs-star${picked ? ' on' : ''}" data-star="${i + 1}"><div class="row">${st}</div><div class="lb">${lbl}</div></button>`;
    }).join('');
    const celebrate = e.done ? `<div class="obs-celebrate">${plantSVG('growing', 90, false, true)}<div class="msg">${esc(stu.first)}'s plant just got a little taller 🌱</div></div>` : '';
    return `<div class="obs-enter">
      <div class="obs-enter-head"><span class="pl">${plantSVG(stu.state, 46, false, false)}</span><div><div class="nm">${esc(stu.first)}</div><div class="sub">${esc(sec.name)} · observation</div></div></div>
      <div class="obs-dots">${dots}</div>
      <div class="obs-q">Question ${e.q + 1} of 12 · ${sk.group === 'sel' ? 'Social-Emotional' : 'Cognitive'}</div>
      <div class="obs-skill">${esc(sk.name)}</div>
      <p class="obs-anchor">${esc(OBS_ANCHORS[sk.key])}</p>
      <div class="obs-stars">${stars}</div>
      <div class="obs-nav"><button class="obs-prev focus" data-enter-prev>← Back</button><button class="btn btn-primary focus" data-enter-next style="padding:11px 22px">${e.q >= 11 ? 'Finish 🌱' : 'Next →'}</button></div>
    </div>${celebrate}`;
  }

  function startEnter(id) { S.assessTab = 'enter'; S.enter = { studentId: id, q: 0, ratings: {}, done: false }; render(); }
  function continueAssess() { const sec = section(); const nxt = sec.students.find((s) => s.assess !== 'done'); startEnter(nxt ? nxt.id : sec.students[0].id); }

  // ================= Assess · Completed sub-tab (was "Completion logs") =====
  // Body only — the h1/subtitle/sub-tabs now live in assessView(). Keeps its
  // own inner By-class / By-student / List tabs.
  function assessCompleted() {
    const view = S.logsView;
    const tabs = [['class', 'By class'], ['student', 'By student'], ['list', 'List']]
      .map(([k, l]) => `<button class="pill-tab logtab${view === k ? ' on' : ''}" data-logview="${k}">${l}</button>`).join('');
    const legend = `<div class="log-legend">
      <span><span class="d" style="background:#348C11"></span>Complete</span>
      <span><span class="d" style="background:#F2CE7B"></span>In progress</span>
      <span><span class="d" style="background:#d8cfba"></span>Not started</span>
      <span style="color:var(--ink-300)">· 👩‍🏫 Teacher &nbsp; 🏠 Parent &nbsp; 🧒 Student</span></div>`;
    const body = view === 'class' ? logsByClass() : view === 'student' ? logsByStudent() : logsList();
    return `<div class="log-tabs">${tabs}</div>${legend}${body}`;
  }

  function logsByClass() {
    const sec = section();
    const windows = S.data.windows;
    const order = { tending: 0, waiting: 1, growing: 2, blossoming: 3 };
    const cards = windows.map((w, wi) => {
      const done = sec.students.filter((st) => st.assessLog[wi].status === 'done').length;
      const total = sec.students.length;
      const all = done === total;
      return `<div class="win-card"><div class="ring">${ringSVG(done, total)}</div><div class="wc-meta"><div class="wc-label">${esc(w.label)}</div><div class="wc-sub">${esc(w.sub)} · ${esc(w.date)}</div><span class="wc-badge" style="background:${all ? '#DCE8D4' : '#FCF1D2'};color:${all ? '#4e6b43' : '#a98424'}">${all ? 'All complete 🌸' : (total - done) + ' still to go'}</span></div></div>`;
    }).join('');
    const head = windows.map((w) => `<div class="mtx-h"><div class="l">${esc(w.label)}</div><div class="s">${esc(w.sub)}</div></div>`).join('');
    const sorted = [...sec.students].sort((a, b) => (order[a.state] - order[b.state]) || a.name.localeCompare(b.name));
    const rows = sorted.map((st) => {
      const cells = st.assessLog.map((w) => {
        const ss = STATUS_META[w.status];
        const persp = w.persp.map((p) => `<span title="${esc(p.label + (p.done ? ' · done' : ' · pending'))}" style="opacity:${p.done ? 1 : 0.25}">${p.icon}</span>`).join('');
        return `<div class="mtx-cell" style="background:${ss.bg}"><div class="cl" style="color:${ss.fg}">${ss.label}</div><div class="cp">${persp}</div></div>`;
      }).join('');
      return `<button class="mtx-row" data-log-open="${esc(st.id)}"><div class="mtx-name"><span class="dot" style="background:${STATE_DOT[st.state]}"></span><span>${esc(st.dispFirst)}</span></div>${cells}</button>`;
    }).join('');
    const strip = S.data.sections.map((s) => {
      const n = s.students.length;
      const winDone = s.students.reduce((a, st) => a + st.windowsDone, 0);
      const fully = s.students.filter((st) => st.windowsDone === 3).length;
      const pct = Math.round((winDone / (3 * n)) * 100);
      const on = s.id === S.sectionId;
      return `<button class="strip-card${on ? ' on' : ''}" data-section="${s.id}"><div class="strip-top"><span class="nm">${esc(s.name)}</span><span class="pct">${pct}%</span></div><div class="strip-bar"><div style="width:${pct}%"></div></div><div class="strip-cap">${fully} of ${n} fully assessed</div></button>`;
    }).join('');
    return `<div class="win-cards">${cards}</div>
      <div class="mtx-wrap"><div class="mtx"><div class="mtx-head"><div class="mtx-corner">Student</div>${head}</div>${rows}</div></div>
      <div class="log-strip-title">Your classes at a glance</div>
      <div class="strip-grid">${strip}</div>`;
  }

  function logsByStudent() {
    const sec = section();
    const order = { tending: 0, waiting: 1, growing: 2, blossoming: 3 };
    const sorted = [...sec.students].sort((a, b) => (order[a.state] - order[b.state]) || a.name.localeCompare(b.name));
    const q = S.logStudentSearch.toLowerCase();
    const picked = S.logsStudentId && sec.students.find((x) => x.id === S.logsStudentId);
    const active = picked || sorted[0];
    const chips = sec.students.filter((st) => st.name.toLowerCase().includes(q)).map((st) => {
      const on = active && st.id === active.id;
      return `<button class="stu-pick${on ? ' on' : ''}" data-log-pick="${esc(st.id)}">${esc(st.dispFirst)}</button>`;
    }).join('');
    let detail = '';
    if (active) {
      const pct = Math.round((active.perspDone / 9) * 100);
      const timeline = active.assessLog.map((w) => {
        const ss = STATUS_META[w.status];
        const persp = w.persp.map((p) => `<div class="tl-persp" style="background:${p.done ? '#F3F7EF' : 'var(--surface-100)'};border-color:${p.done ? '#DCE8D4' : 'var(--line-200)'}"><span style="font-size:16px">${p.icon}</span><div><div class="nm">${esc(p.label)}</div><div class="st" style="color:${p.done ? '#5c8150' : 'var(--ink-300)'}">${p.done ? 'Done · ' + w.date : 'Waiting'}</div></div></div>`).join('');
        return `<div class="tl-row"><div class="tl-dot-wrap"><div class="tl-dot" style="background:${ss.dot};box-shadow:0 0 0 4px ${ss.bg}"></div><div class="tl-line"></div></div>
          <div class="tl-card"><div class="tl-top"><div><div class="l">${esc(w.label)}</div><div class="s">${esc(w.sub)} · ${esc(w.date)}</div></div><span class="tl-badge" style="background:${ss.bg};color:${ss.fg}">${ss.label}${w.status === 'done' ? '' : ' · ' + w.doneCount + '/3'}</span></div>
          <div class="tl-persps">${persp}</div>
          ${w.status !== 'done' ? `<button class="btn-ask-a focus" data-log-continue="${esc(active.id)}" style="margin-top:14px;display:inline-flex;width:auto">Continue this assessment →</button>` : ''}</div></div>`;
      }).join('');
      detail = `<div class="logstu-head"><span class="pl">${plantSVG(active.state, 60, false, false)}</span>
        <div class="m"><h2 class="stu-name" style="font-size:22px">${esc(active.name)}</h2><div class="stu-sub">${esc(sec.name)} · ${active.perspDone} of 9 check-ins done</div><div class="logstu-bar"><div style="width:${pct}%"></div></div></div>
        <button class="sc-ask focus" data-open-student="${esc(active.id)}" style="width:auto;padding:10px 15px">Open full profile →</button></div>
        <div class="tl">${timeline}</div>`;
    }
    return `<div class="roster-search" style="margin-bottom:12px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="#9AA3AF" stroke-width="2"/><path d="M16 16l4 4" stroke="#9AA3AF" stroke-width="2" stroke-linecap="round"/></svg><input id="log-stu-search" value="${esc(S.logStudentSearch)}" placeholder="Find a student…" autocomplete="off"></div>
      <div class="stu-picker">${chips}</div>${detail}`;
  }

  function logsList() {
    const sec = section();
    const q = S.logListSearch.toLowerCase();
    const filter = S.logListFilter;
    const filters = [['all', 'All'], ['pending', 'Pending'], ['complete', 'Complete']]
      .map(([k, l]) => `<button class="pill-tab logfilter${filter === k ? ' on' : ''}" data-logfilter="${k}">${l}</button>`).join('');
    let rows = sec.students.filter((st) => st.name.toLowerCase().includes(q));
    if (filter === 'pending') rows = rows.filter((st) => st.windowsDone < 3);
    else if (filter === 'complete') rows = rows.filter((st) => st.windowsDone === 3);
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const body = rows.length ? rows.map((st) => {
      const cells = st.assessLog.map((w) => { const ss = STATUS_META[w.status]; return `<div><span class="list-pill" style="background:${ss.bg};color:${ss.fg}"><span class="d" style="background:${ss.dot}"></span>${ss.label}</span></div>`; }).join('');
      const pct = Math.round((st.windowsDone / 3) * 100);
      return `<button class="list-row" data-log-open="${esc(st.id)}"><div class="list-name"><span class="dot" style="background:${STATE_DOT[st.state]}"></span><span>${esc(st.name)}</span></div>${cells}<div class="list-prog"><div class="pb"><div style="width:${pct}%"></div></div><span>${st.windowsDone}/3</span></div></button>`;
    }).join('') : '<div class="list-empty">No students match that filter 🌱</div>';
    return `<div class="roster-tools">
      <div class="roster-search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="#9AA3AF" stroke-width="2"/><path d="M16 16l4 4" stroke="#9AA3AF" stroke-width="2" stroke-linecap="round"/></svg><input id="log-list-search" value="${esc(S.logListSearch)}" placeholder="Search a student…" autocomplete="off"></div>
      <div class="roster-sort"><span>Show</span>${filters}</div></div>
      <div class="list-table"><div class="list-head"><div>Student</div><div>Baseline</div><div>Mid-year</div><div>End of year</div><div style="text-align:right">Progress</div></div>${body}</div>`;
  }

  // ================= Insights (was "Analysis") =================
  function insightsView() {
    const view = S.insightsView;
    const tabs = [['growing', "How we're growing"], ['perspectives', 'Perspectives'], ['compare', 'Compare sections']]
      .map(([k, l]) => `<button class="pill-tab intab${view === k ? ' on' : ''}" data-inview="${k}">${l}</button>`).join('');
    const cs = classSkills();
    let body = '';
    if (view === 'growing') body = insGrowing(cs);
    else if (view === 'perspectives') body = insPerspectives(cs);
    else body = insCompare();
    return `<div class="dash-wrap" style="max-width:1040px">
      <h1 class="dash-h1">Insights</h1>
      <div class="log-tabs" style="margin-top:16px">${tabs}</div>
      ${body}
    </div>`;
  }

  function insGrowing(cs) {
    const barCol = bp().isPhone ? '96px' : '150px';
    const grow = cs.map((c) => {
      const color = c.now < 34 ? '#B08968' : c.now < 67 ? '#56C02B' : '#EFA9B8';
      return `<div class="ins-row" style="grid-template-columns:${barCol} 1fr"><div class="ins-name">${esc(c.name)}</div><div class="ins-track"><div class="ins-fill" style="width:${c.now}%;background:${color}"><span>${c.now}%</span></div><div class="ins-pre" style="left:${c.pre}%"></div></div></div>`;
    }).join('');
    const dist = cs.map((c) => { const t = c.total || 1; return `<div class="ins-row" style="grid-template-columns:${barCol} 1fr"><div class="ins-name">${esc(c.name)}</div><div class="dist-bar"><div style="width:${c.beginner / t * 100}%;background:#E8C4A8"></div><div style="width:${c.learner / t * 100}%;background:#B7CFA9"></div><div style="width:${c.expert / t * 100}%;background:#EFA9B8"></div></div></div>`; }).join('');
    return `<div class="dash-card ins-card">
      <div class="ins-h">How is my class growing?</div><div class="ins-sub">Average skill score · Pre → Now</div>
      <div class="ins-bars">${grow}</div>
      <div class="ins-key"><span><span class="pre-mark"></span>Baseline</span><span><span class="now-mark"></span>Now</span></div>
      <div class="ins-foot"><button class="sc-ask focus" data-ask-ins="grow" style="width:auto;padding:10px 16px">Ask Tilli what to do with this →</button></div>
    </div>
    <div class="dash-card ins-card" style="margin-top:16px">
      <div class="ins-h">Where the class stands</div><div class="ins-sub">Band distribution · soil → sprout → blossom</div>
      <div class="ins-bars">${dist}</div>
      <div class="ins-key"><span style="color:#b08968">● Beginner</span><span style="color:#4e6b43">● Learner</span><span style="color:#c07689">● Expert</span></div>
    </div>`;
  }

  function insPerspectives(cs) {
    const barCol = bp().isPhone ? '96px' : '150px';
    const gaps = [...cs].sort((a, b) => b.gap - a.gap).map((c) => `<div class="ins-row" style="grid-template-columns:${barCol} 1fr auto"><div class="ins-name">${esc(c.name)}</div><div class="ins-track" style="height:18px"><div class="ins-fill" style="width:${Math.min(100, c.gap * 2.2)}%;background:${c.gap >= 22 ? '#B9A9DC' : '#7FB7D6'}"></div></div><div class="gap-pts">${c.gap} pts</div></div>`).join('');
    return `<div class="persp-note">Where teachers, parents and students see a skill differently across the class. Bigger gaps are simply worth a conversation. 🌤️</div>
      <div class="dash-card ins-card"><div class="ins-h">Perspective gaps by skill</div><div class="ins-bars" style="margin-top:14px">${gaps}</div>
      <div class="ins-foot"><button class="sc-ask focus" data-ask-ins="gap" style="width:auto;padding:10px 16px">Ask Tilli what to do with this →</button></div></div>`;
  }

  function insCompare() {
    const rows = S.data.sections.map((s) => {
      const assessed = s.students.filter((x) => x.state !== 'waiting');
      const t = assessed.length || 1;
      const beg = assessed.filter((x) => x.band === 'Beginner').length;
      const learn = assessed.filter((x) => x.band === 'Learner').length;
      const exp = assessed.filter((x) => x.band === 'Expert').length;
      const blossom = s.students.filter((x) => x.state === 'blossoming').length;
      return `<div><div class="cmp-top"><div class="nm">${esc(s.name)}</div><div class="sub">${s.students.length} students · ${blossom} blossoming</div></div><div class="cmp-bar"><div style="width:${beg / t * 100}%;background:#E8C4A8"></div><div style="width:${learn / t * 100}%;background:#B7CFA9"></div><div style="width:${exp / t * 100}%;background:#EFA9B8"></div></div></div>`;
    }).join('');
    return `<div class="dash-card ins-card"><div class="ins-h">How do my sections compare?</div><div class="ins-sub">Each garden bed = one section · band distribution</div>
      <div class="cmp-list">${rows}</div>
      <div class="ins-key"><span style="color:#b08968">● Beginner</span><span style="color:#4e6b43">● Learner</span><span style="color:#c07689">● Expert</span></div></div>`;
  }

  // ================= Add student flow =================
  function openAddFlow() {
    S.add = { active: true, step: 'count', sectionId: S.sectionId, count: '', total: 0, done: 0, first: '', last: '', adm: '' };
    render();
  }
  function addGradeName() { const s = S.data.sections.find((x) => x.id === S.add.sectionId); return s ? s.name : 'your class'; }
  function potHTML(done) {
    const sprouts = Array.from({ length: Math.min(done, 14) }, (_, i) => `<span style="width:6px;height:${14 + (i % 4) * 7}px;background:${i % 2 ? '#8FB57E' : '#56C02B'};border-radius:5px 5px 0 0;align-self:end"></span>`).join('');
    const seed = done > 0 ? '<span class="pot-seed"></span>' : '';
    return `<div class="pot">${seed}<div class="pot-bed">${sprouts}</div><div class="pot-rim"></div><div class="pot-body"></div></div>`;
  }
  function addModal() {
    if (!S.add.active) return '';
    const a = S.add;
    let step = '';
    if (a.step === 'count') {
      const canNext = !!a.count && parseInt(a.count, 10) >= 1;
      step = `<div class="add-center">
        <div class="add-title">How many students do you have in<br>${esc(addGradeName())}?</div>
        <div class="add-pot">${potHTML(a.done)}</div>
        <input id="add-count" class="add-count" value="${esc(a.count)}" inputmode="numeric" placeholder="Type a number…">
        <div style="margin-top:22px"><button class="btn btn-primary focus" data-add-to-entry ${canNext ? '' : 'disabled'}>Start planting →</button></div>
      </div>`;
    } else if (a.step === 'entry') {
      const pct = a.total ? Math.round((a.done / a.total) * 100) : 0;
      const canPlant = !!a.first.trim();
      step = `<div class="add-progress">${a.done} / ${a.total} completed</div>
        <div class="add-pbar"><div style="width:${pct}%"></div></div>
        <div class="add-pot">${potHTML(a.done)}</div>
        <div class="add-fields">
          <div class="add-names"><input id="add-first" value="${esc(a.first)}" placeholder="First name"><input id="add-last" value="${esc(a.last)}" placeholder="Last name"></div>
          <input id="add-adm" value="${esc(a.adm)}" placeholder="Admission number">
        </div>
        <div style="margin-top:20px"><button class="btn btn-primary block focus" data-add-plant ${canPlant ? '' : 'disabled'}>${a.done + 1 >= a.total ? 'Plant last seed 🌱' : 'Plant seed → next'}</button></div>`;
    } else {
      step = `<div class="add-center" style="padding:14px 0 4px">
        <div style="display:flex;justify-content:center;margin:6px 0 14px">${plantSVG('growing', 96, false, true)}</div>
        <div class="add-done-title">${a.total} seeds planted 🌱</div>
        <p class="add-done-sub">Your ${esc(addGradeName())} bed is ready. Time to help them grow.</p>
        <button class="btn btn-primary focus" data-add-finish>Go to my garden →</button>
      </div>`;
    }
    return `<div class="add-backdrop">
      <div class="add-card">
        <div class="add-top"><button class="add-back focus" data-add-back>← Back</button><button class="add-x focus" data-add-close>×</button></div>
        <div class="add-eyebrow">Adding flowers</div>
        ${step}
      </div>
    </div>`;
  }

  function wireAddFlow() {
    if (!S.add.active) return;
    // count input: sanitize + toggle Start button without re-render (keep caret)
    const cnt = root.querySelector('#add-count');
    if (cnt) cnt.addEventListener('input', (e) => {
      const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
      S.add.count = v; e.target.value = v;
      const btn = root.querySelector('[data-add-to-entry]');
      if (btn) btn.disabled = !(v && parseInt(v, 10) >= 1);
    });
    // entry text fields: patch in place
    [['add-first', 'first'], ['add-last', 'last'], ['add-adm', 'adm']].forEach(([id, key]) => {
      const el = root.querySelector('#' + id);
      if (el) el.addEventListener('input', (e) => {
        S.add[key] = e.target.value;
        if (key === 'first') { const btn = root.querySelector('[data-add-plant]'); if (btn) btn.disabled = !S.add.first.trim(); }
      });
    });
    const toEntry = root.querySelector('[data-add-to-entry]');
    if (toEntry) toEntry.addEventListener('click', () => {
      const n = parseInt(S.add.count, 10) || 0; if (n < 1) return;
      S.add = Object.assign({}, S.add, { step: 'entry', total: n, done: 0, first: '', last: '', adm: '' }); render();
    });
    const plant = root.querySelector('[data-add-plant]');
    if (plant) plant.addEventListener('click', () => {
      if (!S.add.first.trim()) return;
      const nd = S.add.done + 1;
      if (nd >= S.add.total) S.add = Object.assign({}, S.add, { done: nd, step: 'done' });
      else S.add = Object.assign({}, S.add, { done: nd, first: '', last: '', adm: '' });
      render();
    });
    const back = root.querySelector('[data-add-back]');
    if (back) back.addEventListener('click', () => {
      if (S.add.step === 'entry') S.add = Object.assign({}, S.add, { step: 'count' });
      else S.add = Object.assign({}, S.add, { active: false });
      render();
    });
    root.querySelectorAll('[data-add-close]').forEach((b) => b.addEventListener('click', () => { S.add = Object.assign({}, S.add, { active: false }); render(); }));
    const fin = root.querySelector('[data-add-finish]');
    if (fin) fin.addEventListener('click', () => { S.sectionId = S.add.sectionId || S.sectionId; S.add = Object.assign({}, S.add, { active: false }); S.nav = 'garden'; S.gardenLevel = 'section'; render(); });
  }

  // ---------------- Ask Tilli ----------------
  function askPanel() {
    const a = S.ask;
    const thread = a.thread.map((m) => `<div class="ask-msg ${m.role}">${esc(m.text)}</div>`).join('');
    const empty = a.thread.length === 0 ? `<div class="ask-empty">${plantSVG('growing', 76, false, false)}<div>Edit the prompt below and send — I’ll suggest something you can use today.</div></div>` : '';
    return `<div class="ask-scrim" data-close-ask></div>
      <div class="ask-panel">
        <div class="ask-head">
          <span class="ask-ic">${chatIcon('#348C11')}</span>
          <div class="ask-hmeta"><div class="t">Ask Tilli</div><div class="s">Your teaching assistant</div></div>
          <button class="ask-x" data-close-ask>×</button>
        </div>
        <div class="ask-body">
          ${a.context ? `<div class="ask-ctx">From: ${esc(a.context)}</div>` : ''}
          ${thread}${empty}
        </div>
        <div class="ask-foot">
          <textarea class="ask-input" rows="4" placeholder="Ask me anything about your class or a student…">${esc(a.prompt)}</textarea>
          <button class="btn btn-primary block focus" data-send-ask>Send to Tilli 🌿</button>
        </div>
      </div>`;
  }
  function openAsk(context, prompt) { S.ask = { open: true, context: context || '', prompt: prompt || '', thread: [] }; render(); }

  // ---------------- Profile (minimal) ----------------
  function profilePanel() {
    const d = S.teacher.demo || {};
    const rows = [
      ['Name', d.name], ['Email', S.teacher.email], ['School', d.school || S.teacher.school],
      ['Location', [d.city, d.country].filter(Boolean).join(', ')],
      ['Years teaching', d.years], ['Education', d.edu],
    ].filter((r) => r[1]).map((r) => `<div class="pf-row"><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('');
    return `<div class="dash-wrap" style="max-width:640px">
      <h1 class="dash-h1">Your profile</h1>
      <p class="dash-sub">From your one-time reflection setup.</p>
      <div class="dash-card" style="margin-top:16px;padding:8px 20px">${rows}</div>
      <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap">
        <button class="btn btn-ghost focus" data-redo style="padding:12px 20px">Redo reflection</button>
        <a class="btn focus" href="index.html" style="padding:12px 20px;text-decoration:none;background:#FBE7EA;color:#c0435c;font-weight:700">↩ Sign out</a>
      </div>
    </div>`;
  }

  // ---------------- wiring ----------------
  function wire() {
    root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.nav;
      if (k === 'ask') { openAsk('', 'Ask me anything about your class or a student.'); return; }
      S.ask.open = false;
      if (k === 'garden') { S.nav = 'garden'; S.gardenLevel = 'beds'; } else S.nav = k;
      S.studentId = null; render();
    }));
    root.querySelectorAll('[data-section]').forEach((b) => b.addEventListener('click', () => { S.sectionId = b.dataset.section; S.studentId = null; render(); }));
    root.querySelectorAll('[data-open-class]').forEach((b) => b.addEventListener('click', () => { S.classModal = b.dataset.openClass; render(); }));
    root.querySelectorAll('[data-back-beds]').forEach((b) => b.addEventListener('click', () => { S.gardenLevel = 'beds'; render(); }));
    root.querySelectorAll('[data-add-class]').forEach((b) => b.addEventListener('click', () => openAddFlow()));

    // class modal
    root.querySelectorAll('[data-close-modal]').forEach((b) => b.addEventListener('click', (e) => { if (e.target === b) { S.classModal = null; render(); } }));
    const cmStop = root.querySelector('[data-stop]');
    if (cmStop) cmStop.addEventListener('click', (e) => e.stopPropagation());
    root.querySelectorAll('[data-open-bed]').forEach((b) => b.addEventListener('click', () => { S.sectionId = b.dataset.openBed; S.classModal = null; S.nav = 'garden'; S.gardenLevel = 'section'; render(); }));
    root.querySelectorAll('[data-open-student]').forEach((b) => b.addEventListener('click', () => openStudent(b.dataset.openStudent)));

    // students: live roster filter + sort (rebuild just the list, keep caret)
    const rs = root.querySelector('#roster-search');
    if (rs) rs.addEventListener('input', (e) => { S.rosterSearch = e.target.value; refreshRoster(); });
    root.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
      S.rosterSort = b.dataset.sort;
      root.querySelectorAll('.rsort').forEach((x) => x.classList.toggle('on', x.dataset.sort === S.rosterSort));
      refreshRoster();
    }));
    // students: detail tabs, back, and ask buttons
    root.querySelectorAll('[data-stab]').forEach((b) => b.addEventListener('click', () => { S.studentTab = b.dataset.stab; render(); }));
    root.querySelectorAll('[data-back-roster]').forEach((b) => b.addEventListener('click', () => { S.studentId = null; render(); }));
    root.querySelectorAll('[data-ask-stu]').forEach((b) => b.addEventListener('click', () => {
      const stu = section().students.find((x) => x.id === S.studentId); if (!stu) return;
      if (b.dataset.askStu === 'grew') openAsk(`${stu.first} · ${stu.topGrower.name}`, `${stu.first} is doing well in ${stu.topGrower.name}. How can I keep this growing and help ${stu.first} stretch further?`);
      else openAsk(`${stu.first} · ${stu.lowestSkill.name}`, `How can I support ${stu.name}, a ${stu.grade} student at ${stu.lowestSkill.band} level in ${stu.lowestSkill.name}? Teacher score ${stu.lowestSkill.teacher}%, parent ${stu.lowestSkill.parent}%, student-direct ${stu.lowestSkill.student}%.`);
    }));
    root.querySelectorAll('[data-ask-skill]').forEach((b) => b.addEventListener('click', () => {
      const stu = section().students.find((x) => x.id === S.studentId); if (!stu) return;
      openAsk(`${stu.first} · ${b.dataset.askSkill}`, `How can I support ${stu.name}, a ${stu.grade} student at ${b.dataset.band} level in ${b.dataset.askSkill}?`);
    }));

    // assess: sub-tabs + observation flow
    root.querySelectorAll('[data-assesstab]').forEach((b) => b.addEventListener('click', () => { S.assessTab = b.dataset.assesstab; render(); }));
    root.querySelectorAll('[data-obs-back]').forEach((b) => b.addEventListener('click', () => { S.assessTab = 'todo'; render(); }));
    root.querySelectorAll('[data-obs-continue]').forEach((b) => b.addEventListener('click', () => continueAssess()));
    root.querySelectorAll('[data-obs-report]').forEach((b) => b.addEventListener('click', () => { S.assessTab = 'completed'; render(); }));
    root.querySelectorAll('[data-star]').forEach((b) => b.addEventListener('click', () => {
      const sk = S.data.skills[S.enter.q];
      S.enter = Object.assign({}, S.enter, { ratings: Object.assign({}, S.enter.ratings, { [sk.key]: +b.dataset.star }) });
      render();
    }));
    root.querySelectorAll('[data-enter-prev]').forEach((b) => b.addEventListener('click', () => { S.enter = Object.assign({}, S.enter, { q: Math.max(0, S.enter.q - 1), done: false }); render(); }));
    root.querySelectorAll('[data-enter-next]').forEach((b) => b.addEventListener('click', () => {
      if (S.enter.q >= 11) S.enter = Object.assign({}, S.enter, { done: true });
      else S.enter = Object.assign({}, S.enter, { q: S.enter.q + 1, done: false });
      render();
    }));

    // logs
    root.querySelectorAll('[data-logview]').forEach((b) => b.addEventListener('click', () => { S.logsView = b.dataset.logview; render(); }));
    root.querySelectorAll('[data-log-open]').forEach((b) => b.addEventListener('click', () => { S.logsView = 'student'; S.logsStudentId = b.dataset.logOpen; render(); }));
    root.querySelectorAll('[data-log-pick]').forEach((b) => b.addEventListener('click', () => { S.logsStudentId = b.dataset.logPick; render(); }));
    root.querySelectorAll('[data-logfilter]').forEach((b) => b.addEventListener('click', () => { S.logListFilter = b.dataset.logfilter; render(); }));
    root.querySelectorAll('[data-log-continue]').forEach((b) => b.addEventListener('click', () => { S.nav = 'assess'; startEnter(b.dataset.logContinue); }));
    const lss = root.querySelector('#log-stu-search');
    if (lss) lss.addEventListener('input', (e) => { S.logStudentSearch = e.target.value; S._refocus = 'log-stu-search'; render(); });
    const lls = root.querySelector('#log-list-search');
    if (lls) lls.addEventListener('input', (e) => { S.logListSearch = e.target.value; S._refocus = 'log-list-search'; render(); });

    // insights
    root.querySelectorAll('[data-inview]').forEach((b) => b.addEventListener('click', () => { S.insightsView = b.dataset.inview; render(); }));
    root.querySelectorAll('[data-ask-ins]').forEach((b) => b.addEventListener('click', () => {
      const sec = section();
      if (b.dataset.askIns === 'grow') openAsk(`${sec.name} · class growth`, `My ${sec.name} class data shows most skills rising since baseline, with a few still at Beginner level. What are 2–3 practical next steps?`);
      else openAsk(`${sec.name} · perspective gaps`, `My ${sec.name} class shows notable gaps between teacher, parent and student views on some skills. What are 2–3 practical next steps to reconcile these kindly?`);
    }));

    // add student flow
    wireAddFlow();

    // ask tilli
    root.querySelectorAll('[data-close-ask]').forEach((b) => b.addEventListener('click', () => { S.ask.open = false; render(); }));
    const ai = root.querySelector('.ask-input');
    if (ai) ai.addEventListener('input', (e) => { S.ask.prompt = e.target.value; });
    const send = root.querySelector('[data-send-ask]');
    if (send) send.addEventListener('click', () => {
      const p = (S.ask.prompt || '').trim(); if (!p) return;
      S.ask.thread = S.ask.thread.concat([{ role: 'user', text: p },
        { role: 'tilli', text: "Here's a warm, practical idea you can try today — open with a 3-minute feelings check-in, then a paired activity, and close with one sentence of specific praise. Want me to tailor it to your materials?" }]);
      S.ask.prompt = '';
      render();
    });
    root.querySelectorAll('[data-ask]').forEach((b) => b.addEventListener('click', () => {
      const sec = section();
      if (b.dataset.ask === 'activity') openAsk(`${sec.name} · ${b.dataset.skill}`, `Suggest a 10-minute classroom activity to build ${b.dataset.skill} for a ${sec.grade} student currently at ${b.dataset.band} level. My class has ~${sec.students.length} students and limited materials.`);
      else openAsk(`${sec.name} · ${b.dataset.skill}`, `Give me a whole-class ${sec.grade} activity to strengthen ${b.dataset.skill}. ${b.dataset.beg} of my students are at Beginner level in it.`);
    }));

    // profile redo → hand back to onboarding (teacher.js owns that)
    const redo = root.querySelector('[data-redo]');
    if (redo) redo.addEventListener('click', () => {
      const onb = document.getElementById('onb'); const dash = document.getElementById('dash-root');
      if (window.TilliOnboarding && window.TilliOnboarding.replay) window.TilliOnboarding.replay();
      else { if (dash) dash.style.display = 'none'; if (onb) onb.style.display = ''; location.reload(); }
    });

    // restore focus after a re-render triggered by a search field (keeps typing smooth)
    if (S._refocus) {
      const el = root.querySelector('#' + S._refocus);
      S._refocus = null;
      if (el) { try { el.focus(); const v = el.value.length; el.setSelectionRange(v, v); } catch (e) {} }
    }
  }

  // ---------------- styles ----------------
  function injectCSS() {
    if (document.getElementById('dash-css')) return;
    const el = document.createElement('style');
    el.id = 'dash-css';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  const CSS = `
  #dash-root { position: fixed; inset: 0; overflow: auto; background: #fff; }
  .dash { min-height: 100vh; min-height: 100dvh; display: flex; background: #fff; color: var(--ink-900); }
  .dash-side { width: 224px; flex: none; background: #fff; border-right: 1px solid var(--line-200); padding: 22px 16px; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; height: 100dvh; }
  .dash-side.narrow { width: 76px; padding: 22px 10px; align-items: center; }
  .dash-brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px 22px; }
  .dash-logo { width: 34px; height: 34px; border-radius: 11px; background: var(--wash-green); display: flex; align-items: center; justify-content: center; flex: none; }
  .dash-word { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 17px; color: var(--ink-900); }
  .dash-nav { display: flex; flex-direction: column; gap: 5px; width: 100%; }
  .dash-navbtn { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 13px; border: none; cursor: pointer; background: none; color: var(--ink-450); font-family: 'Montserrat',sans-serif; font-weight: 700; font-size: 14.5px; width: 100%; transition: background .15s, color .15s; }
  .dash-side.narrow .dash-navbtn { justify-content: center; padding: 11px; }
  .dash-navbtn:hover { background: var(--surface-100); }
  .dash-navbtn.on { background: var(--wash-green); color: var(--green-700); }
  .dash-navbtn .ic { display: flex; flex: none; }
  .dash-profilebtn { margin-top: auto; display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 10px 8px; border-radius: 13px; width: 100%; font-family: 'Montserrat',sans-serif; }
  .dash-side.narrow .dash-profilebtn { justify-content: center; }
  .dash-profilebtn:hover { background: var(--surface-100); }
  .dash-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--pink-400); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex: none; }
  .dash-prof-meta { display: flex; flex-direction: column; text-align: left; line-height: 1.15; }
  .dash-prof-meta b { font-size: 13px; color: var(--ink-900); }
  .dash-prof-meta span { font-size: 11px; color: var(--ink-300); }
  .dash-col { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
  .dash-header { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,.9); backdrop-filter: blur(8px); padding: 14px 30px 6px; border-bottom: 1px solid var(--line-200); }
  .dash-header:empty { display: none; }
  .dash-chips { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 4px; scrollbar-width: none; }
  .dash-chips::-webkit-scrollbar { display: none; }
  .dash-chip { flex: none; border: none; cursor: pointer; padding: 8px 15px; border-radius: 20px; font-weight: 700; font-size: 13.5px; font-family: 'Montserrat',sans-serif; background: #fff; color: var(--ink-450); box-shadow: inset 0 0 0 1px var(--line-200); white-space: nowrap; }
  .dash-chip.on { background: var(--green-500); color: #fff; box-shadow: none; }
  .dash-main { flex: 1; padding: 28px 40px; max-width: 1500px; width: 100%; margin: 0 auto; }
  .dash-wrap { max-width: 1180px; margin: 0 auto; width: 100%; }
  .dash-h1 { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 30px; margin: 0; color: var(--ink-900); }
  .dash-h2 { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 18px; margin: 0 0 14px; }
  .dash-sub { margin: 6px 0 0; color: var(--ink-450); font-size: 15px; }
  .dash-card { background: #fff; border: 1px solid var(--line-200); border-radius: var(--radius-card); }
  .link-back { background: none; border: none; color: var(--green-700); font-weight: 700; font-size: 13.5px; cursor: pointer; padding: 0; margin-bottom: 12px; font-family: 'Montserrat',sans-serif; }
  .eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .4px; text-transform: uppercase; margin-bottom: 8px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* garden beds */
  .garden-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .garden-head-right { display: flex; align-items: center; gap: 14px; }
  .dash-avatarbtn { width: 42px; height: 42px; border-radius: 50%; background: var(--pink-400); color: #fff; border: none; cursor: pointer; font-family: 'Montserrat',sans-serif; font-weight: 800; font-size: 15px; flex: none; box-shadow: 0 3px 10px rgba(0,0,0,.12); }
  .dash-avatarbtn:hover { filter: brightness(1.05); }
  .gardener { flex: none; animation: tdFloat 4.6s ease-in-out infinite; }
  @keyframes tdFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @media (prefers-reduced-motion: reduce) { .gardener { animation: none; } }
  .beds-grid { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: center; gap: 12px 26px; padding: 8px 0; }
  .bed-wrap { display: flex; flex-direction: column; align-items: center; background: none; border: none; padding: 0; cursor: pointer; font-family: 'Montserrat',sans-serif; }
  .bed-stage { position: relative; flex: none; }
  .bed-plant { position: absolute; }
  .bed-plant:hover { z-index: 500 !important; }
  .bed-tip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); z-index: 600; width: 212px; background: #fff; border: 1px solid var(--line-200); border-radius: 14px; box-shadow: 0 12px 28px rgba(40,70,40,.2); padding: 11px 13px; text-align: left; opacity: 0; visibility: hidden; transition: opacity .12s; pointer-events: none; }
  .bed-plant:hover .bed-tip { opacity: 1; visibility: visible; }
  .bed-tip .nm { font-weight: 800; font-size: 14px; color: var(--ink-900); }
  .bed-tip .bl { font-size: 11px; color: var(--ink-300); font-weight: 700; letter-spacing: .3px; text-transform: uppercase; margin: 2px 0 7px; }
  .bed-tip .rw { font-size: 12.5px; color: #6a6153; margin-top: 4px; }
  .bed-label { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 10px; }
  .bed-label .nm { background: #fff; border: 1.5px solid var(--line-200); border-radius: 12px; padding: 7px 18px; font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 15.5px; color: var(--ink-900); box-shadow: 0 3px 10px rgba(80,90,80,.06); }
  .bed-label .ct { font-size: 12.5px; color: var(--ink-300); font-weight: 600; }
  .bed-add { position: absolute; left: 0; bottom: 0; width: 100%; height: 56px; border-radius: 28px 28px 16px 16px; display: flex; align-items: center; justify-content: center; gap: 10px; background: var(--wash-green); border: 2.5px dashed var(--green-500); color: var(--green-700); font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 15px; }
  .bed-add .plus { width: 30px; height: 30px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; line-height: 1; }
  .bed-key { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 26px; margin-top: 22px; padding-top: 18px; border-top: 1.5px dashed rgba(86,192,43,.35); }
  .bed-key-item { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #4e6b43; }
  .bed-key-item b { color: var(--ink-900); }

  /* class modal */
  .cm-backdrop { position: fixed; inset: 0; z-index: 600; background: rgba(30,40,30,.42); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .cm-card { width: min(680px,100%); max-height: 82vh; display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line-200); border-radius: 24px; box-shadow: 0 24px 60px rgba(40,50,40,.28); overflow: hidden; }
  .cm-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px 24px 16px; border-bottom: 1px solid var(--line-200); }
  .cm-title { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 22px; color: var(--ink-900); }
  .cm-sub { font-size: 13px; color: var(--ink-300); font-weight: 600; margin-top: 3px; }
  .cm-x { background: var(--surface-100); border: none; border-radius: 11px; width: 34px; height: 34px; font-size: 17px; color: var(--ink-450); cursor: pointer; flex: none; }
  .cm-list { overflow: auto; padding: 8px 10px 4px; }
  .cm-row { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; background: none; border: none; border-radius: 14px; padding: 11px 14px; cursor: pointer; font-family: 'Montserrat',sans-serif; }
  .cm-row:hover { background: var(--surface-100); }
  .cm-bloom { flex: none; width: 42px; height: 42px; border-radius: 50%; background: var(--wash-green); display: flex; align-items: center; justify-content: center; }
  .cm-info { flex: 1; min-width: 0; }
  .cm-info .nm { font-weight: 800; font-size: 15px; color: var(--ink-900); }
  .cm-info .sk { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 4px; font-size: 12.5px; color: #4e6b43; }
  .cm-band { flex: none; font-size: 12px; font-weight: 700; color: var(--ink-300); }
  .cm-foot { padding: 14px 24px 20px; border-top: 1px solid var(--line-200); }

  /* section garden */
  .blossom-pill { display: flex; align-items: center; gap: 9px; background: var(--wash-yellow); color: #8a6a1f; padding: 9px 15px; border-radius: 14px; font-weight: 600; font-size: 13.5px; }
  .plant-bed { position: relative; margin: 18px 0 8px; padding: 26px 20px 30px; border-radius: 28px; background: linear-gradient(180deg,#EAF1E4 0%,#DCE8D4 62%,#D6E2CD 100%); overflow: hidden; }
  .pg-grid { display: grid; gap: 2px 4px; align-items: end; position: relative; z-index: 1; }
  .pg-cell { position: relative; display: flex; flex-direction: column; align-items: center; }
  .pg-plant { background: none; border: none; cursor: pointer; padding: 0; line-height: 0; transition: transform .18s; }
  .pg-plant:hover { transform: translateY(-3px); }
  .pg-tip { position: absolute; bottom: calc(100% - 8px); left: 50%; transform: translateX(-50%); z-index: 20; background: #fff; border: 1px solid var(--line-200); border-radius: 14px; box-shadow: 0 10px 26px rgba(40,70,40,.18); padding: 12px 14px; width: 186px; opacity: 0; visibility: hidden; transition: opacity .12s; pointer-events: none; }
  .pg-cell:hover .pg-tip { opacity: 1; visibility: visible; }
  .pg-tip .nm { font-weight: 800; font-size: 14px; margin-bottom: 3px; }
  .pg-tip .sl { font-size: 11.5px; color: var(--ink-300); margin-bottom: 8px; }
  .pg-tip .ch { display: flex; gap: 5px; margin-bottom: 9px; flex-wrap: wrap; }
  .pg-tip .vw { font-size: 12.5px; font-weight: 700; color: var(--green-700); }
  .pg-legend { display: flex; flex-wrap: wrap; gap: 14px 22px; margin-top: 22px; padding-top: 16px; border-top: 1.5px dashed rgba(86,192,43,.35); position: relative; z-index: 1; }
  .pg-legend-item { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: #4e6b43; }
  .pg-legend-item b { color: var(--ink-900); }
  .pg-legend-item .dot { width: 11px; height: 11px; border-radius: 50%; flex: none; }
  .tend-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 14px; }
  .tend-card { background: #fff; border: 1px solid var(--line-200); border-radius: 20px; padding: 16px; display: flex; flex-direction: column; box-shadow: 0 3px 12px rgba(80,90,80,.05); }
  .tend-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .tend-top .pl { flex: none; }
  .tend-top .nm { font-weight: 800; font-size: 16px; line-height: 1.1; display: block; }
  .tend-top .bd { font-size: 11.5px; color: var(--ink-300); font-weight: 600; }
  .tend-card .reason { margin: 2px 0 14px; font-size: 14px; color: #6a6153; line-height: 1.4; }
  .btn-ask-a { margin-top: auto; background: var(--green-500); color: #fff; border: none; border-radius: 12px; padding: 11px 14px; font-weight: 700; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; font-family: 'Montserrat',sans-serif; }
  .btn-ask-a:hover { background: var(--green-600); }
  .tend-see { background: none; border: none; color: var(--green-700); font-weight: 700; font-size: 12.5px; cursor: pointer; margin-top: 8px; font-family: 'Montserrat',sans-serif; }
  .hl-card { background: linear-gradient(160deg,#FDEEF0,#F6D5D9); border-radius: 20px; padding: 20px 22px; }
  .hl-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .hl-chip { background: rgba(255,255,255,.7); color: #a24d63; font-weight: 700; font-size: 13.5px; padding: 8px 13px; border-radius: 11px; }
  .hl-more { background: none; border: none; color: #b56178; font-weight: 700; font-size: 13px; cursor: pointer; padding: 0; font-family: 'Montserrat',sans-serif; }
  .grow-card { background: var(--surface-100); border: 1px solid var(--line-200); border-radius: 20px; padding: 20px 22px; }
  .grow-list { display: flex; flex-direction: column; gap: 10px; }
  .grow-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .grow-row .nm { font-weight: 700; font-size: 14.5px; }
  .grow-row .sub { font-size: 12px; color: var(--ink-300); }
  .grow-ask { background: var(--wash-yellow); color: #8a6a1f; border: none; border-radius: 10px; padding: 8px 12px; font-weight: 700; font-size: 12px; cursor: pointer; white-space: nowrap; font-family: 'Montserrat',sans-serif; }

  /* ask tilli */
  .ask-scrim { position: fixed; inset: 0; z-index: 60; background: rgba(30,40,30,.28); }
  .ask-panel { position: fixed; z-index: 61; top: 0; right: 0; bottom: 0; width: 420px; max-width: 100%; background: #fff; display: flex; flex-direction: column; box-shadow: -8px 0 40px rgba(40,70,40,.18); }
  .ask-head { display: flex; align-items: center; gap: 10px; padding: 18px 20px; border-bottom: 1px solid var(--line-200); }
  .ask-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--wash-green); display: flex; align-items: center; justify-content: center; flex: none; }
  .ask-hmeta { flex: 1; } .ask-hmeta .t { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 17px; } .ask-hmeta .s { font-size: 11.5px; color: var(--ink-300); }
  .ask-x { background: var(--surface-100); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; color: var(--ink-450); }
  .ask-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
  .ask-ctx { align-self: flex-start; background: var(--wash-green); color: var(--green-700); font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 10px; }
  .ask-msg { max-width: 85%; padding: 10px 14px; font-size: 13.5px; line-height: 1.45; }
  .ask-msg.user { align-self: flex-end; background: var(--green-500); color: #fff; border-radius: 14px 14px 4px 14px; }
  .ask-msg.tilli { align-self: flex-start; background: var(--surface-100); color: var(--ink-700); border-radius: 14px 14px 14px 4px; }
  .ask-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; margin: auto 0; text-align: center; color: var(--ink-300); font-size: 13.5px; max-width: 240px; align-self: center; line-height: 1.5; }
  .ask-foot { padding: 14px 18px 18px; border-top: 1px solid var(--line-200); }
  .ask-input { width: 100%; border: 1px solid var(--line-200); border-radius: 14px; padding: 12px 14px; font-size: 13.5px; color: var(--ink-900); resize: none; outline: none; background: #fff; line-height: 1.45; font-family: 'Montserrat',sans-serif; }
  .ask-input:focus { border-color: var(--cyan-500); }
  .ask-foot .btn { margin-top: 10px; }

  /* students: roster */
  .pill-tab { border: none; cursor: pointer; padding: 8px 14px; border-radius: 11px; font-weight: 700; font-size: 13px; font-family: 'Montserrat',sans-serif; background: #fff; color: var(--ink-450); box-shadow: inset 0 0 0 1px var(--line-200); white-space: nowrap; }
  .pill-tab.on { background: var(--ink-900); color: #fff; box-shadow: none; }
  .roster-tools { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0 16px; }
  .roster-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 9px; background: #fff; border: 1px solid var(--line-200); border-radius: 13px; padding: 10px 14px; }
  .roster-search input { border: none; outline: none; background: none; font-size: 14.5px; width: 100%; font-family: 'Montserrat',sans-serif; color: var(--ink-900); }
  .roster-sort { display: flex; gap: 6px; align-items: center; }
  .roster-sort > span { font-size: 12.5px; color: var(--ink-300); font-weight: 600; }
  .roster-list { display: flex; flex-direction: column; gap: 9px; }
  .roster-row { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid var(--line-200); border-radius: 16px; padding: 10px 16px 10px 10px; cursor: pointer; text-align: left; font-family: 'Montserrat',sans-serif; transition: box-shadow .15s; }
  .roster-row:hover { box-shadow: 0 5px 16px rgba(80,90,80,.1); }
  .rr-plant { flex: none; }
  .rr-info { flex: 1; min-width: 0; }
  .rr-info .nm { font-weight: 800; font-size: 15.5px; display: block; }
  .rr-info .sl { font-size: 12px; color: var(--ink-300); font-weight: 600; }
  .rr-chips { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }

  /* students: detail */
  .stu-head { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; background: #fff; border: 1px solid var(--line-200); border-radius: 22px; padding: 18px 22px; margin-bottom: 16px; }
  .stu-plant { flex: none; }
  .stu-meta { flex: 1; min-width: 180px; }
  .stu-name { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 26px; margin: 0; }
  .stu-sub { font-size: 13px; color: var(--ink-300); font-weight: 600; margin: 3px 0 9px; }
  .stu-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .stu-tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 18px; scrollbar-width: none; }
  .stu-tabs::-webkit-scrollbar { display: none; }
  .sg-title { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 16px; margin: 0 0 12px; color: var(--ink-900); }
  .skill-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap: 12px; }
  .skill-card { background: #fff; border: 1px solid var(--line-200); border-radius: 16px; padding: 14px 15px; }
  .sc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
  .sc-head .nm { font-weight: 700; font-size: 14px; line-height: 1.2; }
  .sc-band { font-weight: 700; font-size: 11px; padding: 4px 9px; border-radius: 8px; white-space: nowrap; flex: none; }
  .sc-bars { display: flex; gap: 8px; margin-bottom: 12px; }
  .sc-persp { display: flex; justify-content: space-between; font-size: 11px; color: var(--ink-450); border-top: 1px dashed var(--line-200); padding-top: 9px; margin-bottom: 11px; }
  .sc-ask { width: 100%; background: var(--wash-green); color: var(--green-700); border: none; border-radius: 9px; padding: 8px; font-weight: 700; font-size: 12px; cursor: pointer; font-family: 'Montserrat',sans-serif; }
  .sc-ask:hover { background: #E4EFD7; }
  .persp-note { background: var(--wash-cyan); border-radius: 18px; padding: 16px 20px; margin-bottom: 16px; font-size: 14px; color: #3f6377; line-height: 1.5; }
  .gap-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 12px; border-bottom: 1px solid var(--line-200); }
  .gap-row:last-child { border-bottom: none; }
  .gap-row .nm { font-weight: 700; font-size: 13.5px; }
  .gap-row .sub { font-size: 11px; color: var(--ink-300); }
  .gap-right { display: flex; align-items: center; gap: 8px; flex: none; }
  .gap-badge { background: #CDE9E4; color: #2f7a6e; font-weight: 700; font-size: 11px; padding: 5px 9px; border-radius: 9px; }
  .gap-ask { background: none; border: none; cursor: pointer; padding: 4px; }
  .hist-row { display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--line-200); align-items: flex-start; }
  .hist-row:last-child { border-bottom: none; }
  .hist-row .dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 4px; flex: none; }
  .hist-row .hm { flex: 1; } .hist-row .hm .nm { font-weight: 700; font-size: 14.5px; } .hist-row .hm .sub { font-size: 12.5px; color: var(--ink-300); }
  .hist-row .st { font-size: 12.5px; font-weight: 700; }

  /* profile */
  .pf-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--line-200); }
  .pf-row:last-child { border-bottom: none; }
  .pf-row .k { font-size: 13px; color: var(--ink-300); font-weight: 700; }
  .pf-row .v { font-size: 14.5px; color: var(--ink-900); font-weight: 600; text-align: right; }

  /* observations */
  .obs-back { background: var(--surface-100); color: var(--ink-450); border: none; border-radius: 11px; padding: 9px 15px; font-weight: 700; font-size: 13px; cursor: pointer; font-family: 'Montserrat',sans-serif; margin-bottom: 14px; }
  .obs-vine { position: relative; max-width: 640px; }
  .obs-vine-svg { position: absolute; left: 0; top: 0; pointer-events: none; }
  .obs-nodes { position: relative; z-index: 1; }
  .obs-row { display: flex; gap: 16px; min-height: 152px; }
  .obs-node { width: 72px; flex: none; display: flex; align-items: flex-start; justify-content: center; padding-top: 7px; }
  .obs-marker { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .obs-marker.active { background: #FBEAC2; box-shadow: 0 0 0 5px rgba(242,206,123,.28); }
  .obs-marker.lock { width: 38px; height: 38px; background: #EAE3D3; margin-top: 3px; }
  .obs-card { flex: 1; min-width: 0; text-align: left; border: none; border-radius: 18px; padding: 15px 18px; font-family: 'Montserrat',sans-serif; color: var(--ink-900); cursor: pointer; background: #fff; box-shadow: inset 0 0 0 1px var(--line-200); }
  .obs-card.active { background: #FFF7E9; box-shadow: 0 0 0 2px #F2CE7B, 0 12px 28px rgba(232,145,45,.14); }
  .obs-card.locked { background: var(--surface-100); opacity: .72; cursor: default; }
  .obs-card:disabled { cursor: default; }
  .obs-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .obs-card-title { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 16.5px; }
  .obs-card.locked .obs-card-title { color: var(--ink-300); }
  .obs-badge { flex: none; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 8px; white-space: nowrap; background: #EDE7DA; color: #9a9284; }
  .obs-badge.done { background: #DCE8D4; color: #4e6b43; }
  .obs-badge.active { background: #F7DFAE; color: #95601a; }
  .obs-meta { font-size: 12.5px; color: var(--ink-300); font-weight: 600; margin-top: 3px; }
  .obs-body { font-size: 14px; color: #6a6153; margin-top: 8px; }
  .obs-cta { display: inline-flex; margin-top: 12px; background: #DCE8D4; color: #4e6b43; border-radius: 11px; padding: 9px 16px; font-weight: 700; font-size: 13.5px; }
  .obs-cta.active { background: var(--green-500); color: #fff; }
  .obs-enter { background: #fff; border: 1px solid var(--line-200); border-radius: 22px; padding: 22px 24px; }
  .obs-enter-head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
  .obs-enter-head .pl { flex: none; }
  .obs-enter-head .nm { font-weight: 800; font-size: 16px; }
  .obs-enter-head .sub { font-size: 12px; color: var(--ink-300); font-weight: 600; }
  .obs-dots { display: flex; gap: 5px; margin: 14px 0 18px; }
  .obs-dot { flex: 1; height: 5px; border-radius: 3px; }
  .obs-q { font-size: 12.5px; color: var(--ink-300); font-weight: 700; margin-bottom: 4px; }
  .obs-skill { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 20px; margin-bottom: 6px; }
  .obs-anchor { margin: 0 0 20px; font-size: 14.5px; color: #6a6153; line-height: 1.5; }
  .obs-stars { display: grid; grid-template-columns: repeat(auto-fit,minmax(130px,1fr)); gap: 10px; }
  .obs-star { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; cursor: pointer; border: 2px solid var(--line-200); background: #fff; border-radius: 14px; padding: 13px 15px; font-family: 'Montserrat',sans-serif; color: var(--ink-900); min-height: 58px; }
  .obs-star .row { display: flex; gap: 2px; }
  .obs-star .lb { font-weight: 700; font-size: 14px; }
  .obs-star.on { border-color: var(--green-500); background: var(--wash-green); }
  .obs-nav { display: flex; justify-content: space-between; margin-top: 22px; }
  .obs-prev { background: var(--surface-100); color: var(--ink-450); border: none; border-radius: 11px; padding: 11px 18px; font-weight: 700; font-size: 13.5px; cursor: pointer; font-family: 'Montserrat',sans-serif; }
  .obs-celebrate { text-align: center; padding: 26px; margin-top: 16px; background: #FDEEF0; border-radius: 22px; }
  .obs-celebrate .msg { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 19px; color: #a24d63; margin-top: 8px; }
  .rep-table { background: #fff; border: 1px solid var(--line-200); border-radius: 20px; overflow: hidden; }
  .rep-head, .rep-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 8px; padding: 13px 18px; align-items: center; }
  .rep-head { background: var(--surface-100); font-size: 12px; font-weight: 800; color: var(--ink-450); text-transform: uppercase; letter-spacing: .3px; }
  .rep-row { border-top: 1px solid var(--line-200); }
  .rep-row .nm { font-weight: 700; font-size: 14px; } .rep-row .wn { font-size: 13px; color: var(--ink-450); }
  .rep-pill { font-weight: 700; font-size: 12px; padding: 5px 11px; border-radius: 9px; display: inline-block; }

  /* logs */
  .log-headrow { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
  .log-tabs { display: flex; gap: 6px; margin: 18px 0; flex-wrap: wrap; }
  .log-legend { display: flex; flex-wrap: wrap; gap: 10px 20px; margin-bottom: 18px; font-size: 12.5px; font-weight: 700; color: #6a6153; }
  .log-legend span { display: flex; align-items: center; gap: 7px; }
  .log-legend .d { width: 11px; height: 11px; border-radius: 50%; flex: none; }
  .win-cards { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 14px; margin-bottom: 20px; }
  .win-card { background: #fff; border: 1px solid var(--line-200); border-radius: 20px; padding: 18px 20px; display: flex; align-items: center; gap: 16px; }
  .win-card .ring { flex: none; }
  .wc-label { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 16px; }
  .wc-sub { font-size: 12px; color: var(--ink-300); font-weight: 600; margin: 2px 0 6px; }
  .wc-badge { display: inline-block; font-weight: 700; font-size: 11.5px; padding: 4px 10px; border-radius: 9px; }
  .mtx-wrap { background: #fff; border: 1px solid var(--line-200); border-radius: 20px; padding: 8px; overflow-x: auto; }
  .mtx { min-width: 520px; }
  .mtx-head, .mtx-row { display: grid; grid-template-columns: minmax(116px,1.4fr) repeat(3, minmax(88px,1fr)); gap: 8px; }
  .mtx-head { padding: 10px 12px 12px; }
  .mtx-corner { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .3px; color: var(--ink-300); align-self: end; }
  .mtx-h { text-align: center; } .mtx-h .l { font-weight: 800; font-size: 13px; color: #4e463a; } .mtx-h .s { font-size: 11px; color: var(--ink-300); }
  .mtx-row { width: 100%; text-align: left; background: none; border: none; border-top: 1px solid #F3ECDD; padding: 8px 12px; cursor: pointer; font-family: 'Montserrat',sans-serif; align-items: center; }
  .mtx-row:hover { background: var(--surface-100); }
  .mtx-name { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .mtx-name .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .mtx-name span:last-child { font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mtx-cell { border-radius: 12px; padding: 8px 10px; }
  .mtx-cell .cl { font-weight: 800; font-size: 11px; margin-bottom: 5px; }
  .mtx-cell .cp { display: flex; gap: 6px; font-size: 13px; line-height: 1; }
  .log-strip-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; color: var(--ink-300); margin: 24px 0 12px; }
  .strip-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 12px; }
  .strip-card { text-align: left; cursor: pointer; border: 1px solid var(--line-200); background: #fff; border-radius: 18px; padding: 16px 18px; font-family: 'Montserrat',sans-serif; }
  .strip-card.on { border: 2px solid var(--green-500); background: var(--wash-green); padding: 15px 17px; }
  .strip-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; }
  .strip-top .nm { font-weight: 800; font-size: 14.5px; } .strip-top .pct { font-size: 12px; font-weight: 700; color: var(--green-700); }
  .strip-bar { height: 9px; border-radius: 5px; background: var(--line-200); overflow: hidden; margin-bottom: 9px; }
  .strip-bar > div { height: 100%; background: var(--green-500); border-radius: 5px; }
  .strip-cap { font-size: 11.5px; color: var(--ink-300); font-weight: 600; }
  .stu-picker { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 18px; scrollbar-width: none; }
  .stu-picker::-webkit-scrollbar { display: none; }
  .stu-pick { flex: none; border: none; cursor: pointer; padding: 8px 15px; border-radius: 20px; font-weight: 700; font-size: 13px; font-family: 'Montserrat',sans-serif; white-space: nowrap; background: #fff; color: var(--ink-450); box-shadow: inset 0 0 0 1px var(--line-200); }
  .stu-pick.on { background: var(--green-500); color: #fff; box-shadow: none; }
  .logstu-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; background: #fff; border: 1px solid var(--line-200); border-radius: 22px; padding: 16px 20px; margin-bottom: 16px; }
  .logstu-head .m { flex: 1; min-width: 160px; }
  .logstu-bar { height: 8px; border-radius: 5px; background: var(--line-200); overflow: hidden; max-width: 260px; margin-top: 8px; }
  .logstu-bar > div { height: 100%; background: var(--green-500); border-radius: 5px; }
  .tl { display: flex; flex-direction: column; gap: 14px; }
  .tl-row { display: flex; gap: 14px; }
  .tl-dot-wrap { display: flex; flex-direction: column; align-items: center; flex: none; padding-top: 4px; }
  .tl-dot { width: 15px; height: 15px; border-radius: 50%; }
  .tl-line { flex: 1; width: 2px; background: var(--line-200); margin-top: 4px; }
  .tl-card { flex: 1; background: #fff; border: 1px solid var(--line-200); border-radius: 18px; padding: 16px 18px; margin-bottom: 2px; }
  .tl-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .tl-top .l { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 16px; } .tl-top .s { font-size: 12px; color: var(--ink-300); }
  .tl-badge { font-weight: 700; font-size: 12px; padding: 5px 12px; border-radius: 10px; white-space: nowrap; }
  .tl-persps { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 8px; }
  .tl-persp { display: flex; align-items: center; gap: 9px; border: 1px solid var(--line-200); border-radius: 12px; padding: 9px 11px; }
  .tl-persp .nm { font-weight: 700; font-size: 13px; } .tl-persp .st { font-size: 11.5px; font-weight: 700; }
  .list-table { background: #fff; border: 1px solid var(--line-200); border-radius: 20px; overflow: hidden; overflow-x: auto; }
  .list-head, .list-row { display: grid; grid-template-columns: 1.8fr 1.1fr 1.1fr 1.1fr 1fr; gap: 10px; min-width: 640px; align-items: center; }
  .list-head { padding: 13px 20px; background: var(--surface-100); font-size: 12px; font-weight: 800; color: var(--ink-450); text-transform: uppercase; letter-spacing: .3px; }
  .list-row { width: 100%; text-align: left; padding: 12px 20px; border: none; border-top: 1px solid var(--line-200); cursor: pointer; font-family: 'Montserrat',sans-serif; background: none; }
  .list-row:hover { background: var(--surface-100); }
  .list-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .list-name .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .list-name span:last-child { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list-pill { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 11.5px; padding: 4px 10px; border-radius: 9px; white-space: nowrap; }
  .list-pill .d { width: 7px; height: 7px; border-radius: 50%; flex: none; }
  .list-prog { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .list-prog .pb { width: 52px; height: 7px; border-radius: 4px; background: var(--line-200); overflow: hidden; }
  .list-prog .pb > div { height: 100%; background: var(--green-500); border-radius: 4px; }
  .list-prog span { font-size: 12px; font-weight: 800; color: #6a6153; width: 26px; text-align: right; }
  .list-empty { padding: 26px; text-align: center; color: var(--ink-300); font-weight: 600; }

  /* insights */
  .ins-card { padding: 20px 22px; }
  .ins-h { font-weight: 800; font-size: 16px; font-family: 'Quicksand',sans-serif; }
  .ins-sub { font-size: 12.5px; color: var(--ink-300); margin-bottom: 18px; }
  .ins-bars { display: flex; flex-direction: column; gap: 13px; }
  .ins-row { display: grid; gap: 12px; align-items: center; }
  .ins-name { font-size: 13px; font-weight: 700; color: #4e463a; }
  .ins-track { position: relative; height: 22px; background: var(--surface-100); border-radius: 11px; overflow: hidden; }
  .ins-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 11px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; }
  .ins-fill span { font-size: 11px; font-weight: 800; color: #fff; }
  .ins-pre { position: absolute; top: -2px; bottom: -2px; width: 3px; background: #8a7a5f; opacity: .55; border-radius: 2px; }
  .dist-bar { display: flex; height: 20px; border-radius: 10px; overflow: hidden; background: var(--surface-100); }
  .ins-key { display: flex; gap: 18px; margin-top: 16px; font-size: 11.5px; font-weight: 700; color: var(--ink-300); align-items: center; }
  .pre-mark { display: inline-block; width: 3px; height: 13px; background: #8a7a5f; opacity: .6; border-radius: 2px; margin-right: 6px; }
  .now-mark { display: inline-block; width: 13px; height: 9px; background: var(--green-500); border-radius: 3px; margin-right: 6px; }
  .ins-foot { border-top: 1px dashed var(--line-200); margin-top: 16px; padding-top: 14px; }
  .gap-pts { font-size: 12px; font-weight: 800; color: var(--ink-450); width: 56px; text-align: right; }
  .cmp-list { display: flex; flex-direction: column; gap: 16px; }
  .cmp-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .cmp-top .nm { font-weight: 800; font-size: 14px; } .cmp-top .sub { font-size: 12px; color: var(--ink-300); font-weight: 600; }
  .cmp-bar { display: flex; height: 24px; border-radius: 12px; overflow: hidden; background: var(--surface-100); }

  /* add student modal */
  .add-backdrop { position: fixed; inset: 0; z-index: 70; background: rgba(30,40,30,.32); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .add-card { width: 100%; max-width: 520px; max-height: calc(100vh - 40px); overflow-y: auto; background: #fff; border-radius: 26px; padding: 28px 26px; box-shadow: 0 24px 60px rgba(40,50,40,.3); }
  .add-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .add-back { background: var(--surface-100); border: none; color: var(--ink-450); border-radius: 10px; padding: 7px 12px; font-weight: 700; font-size: 12.5px; cursor: pointer; font-family: 'Montserrat',sans-serif; }
  .add-x { background: none; border: none; font-size: 22px; color: var(--ink-300); cursor: pointer; line-height: 1; }
  .add-eyebrow { text-align: center; font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 15px; color: var(--green-700); }
  .add-center { text-align: center; margin-top: 18px; }
  .add-title { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 22px; line-height: 1.3; margin-bottom: 20px; }
  .add-pot { display: flex; justify-content: center; margin: 8px 0; }
  .add-count { width: 220px; text-align: center; border: 2px solid var(--line-200); border-radius: 14px; padding: 13px 16px; font-size: 16px; font-weight: 700; font-family: 'Montserrat',sans-serif; color: var(--ink-900); outline: none; background: var(--surface-100); }
  .add-count:focus { border-color: var(--green-500); }
  .add-progress { text-align: center; font-size: 12.5px; color: var(--ink-300); font-weight: 700; margin-top: 4px; }
  .add-pbar { height: 7px; border-radius: 4px; background: var(--line-200); overflow: hidden; max-width: 260px; margin: 8px auto 0; }
  .add-pbar > div { height: 100%; background: var(--green-500); border-radius: 4px; transition: width .3s; }
  .add-fields { display: flex; flex-direction: column; gap: 10px; }
  .add-names { display: flex; gap: 10px; flex-wrap: wrap; }
  .add-fields input { flex: 1; min-width: 130px; border: 1px solid var(--line-200); border-radius: 13px; padding: 12px 14px; font-size: 14.5px; font-family: 'Montserrat',sans-serif; color: var(--ink-900); outline: none; background: var(--surface-100); }
  .add-fields input:focus { border-color: var(--green-500); }
  .add-done-title { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 21px; color: #4e6b43; }
  .add-done-sub { margin: 8px 0 20px; font-size: 14.5px; color: var(--ink-450); line-height: 1.5; }
  .pot { position: relative; width: 150px; height: 134px; }
  .pot-seed { position: absolute; left: 50%; top: 2px; margin-left: -8px; width: 16px; height: 21px; border-radius: 50%; background: #F2CE7B; box-shadow: inset -2px -2px 0 rgba(0,0,0,.06); }
  .pot-bed { position: absolute; left: 0; right: 0; bottom: 60px; display: flex; justify-content: center; gap: 4px; height: 48px; align-items: end; }
  .pot-rim { position: absolute; left: 50%; bottom: 46px; margin-left: -52px; width: 104px; height: 20px; border-radius: 6px; background: #C77E4E; }
  .pot-body { position: absolute; left: 50%; bottom: 4px; margin-left: -49px; width: 98px; height: 50px; background: #B96E42; clip-path: polygon(4% 0, 96% 0, 84% 100%, 16% 100%); }

  /* bottom nav (mobile) — four quiet tabs + raised Ask Tilli in the centre */
  .dash-bottomnav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; align-items: flex-end; background: #fff; border-top: 1px solid var(--line-200); padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); }
  .dash-bnav { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; background: none; border: none; cursor: pointer; color: var(--ink-300); font-family: 'Montserrat',sans-serif; font-weight: 700; font-size: 10px; padding: 4px 2px; min-height: 44px; }
  .dash-bnav .lb { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Quiet active state: colour + weight only, deliberately softer than the centre button. */
  .dash-bnav.on { color: var(--green-700); }
  .dash-bnav.on .lb { font-weight: 800; }
  /* Raised centre action (Ask Tilli): overlaps the top edge, carries the sole accent. */
  .dash-bnav.center { color: var(--green-700); }
  .dash-bnav.center .dash-fab { display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; margin-top: -26px; border-radius: 50%; background: var(--green-500); color: #fff; box-shadow: 0 6px 18px rgba(52,140,17,.36); border: 3px solid #fff; }
  .dash-bnav.center .lb { color: var(--green-700); font-weight: 800; }
  .dash-bnav.center:active .dash-fab { transform: scale(.94); }
  @media (prefers-reduced-motion: reduce) { .dash-bnav.center:active .dash-fab { transform: none; } }

  @media (max-width: 1023px) { .dash-main { padding: 22px 26px; } }
  @media (max-width: 640px) {
    .dash-main { padding: 16px 16px 90px; }
    .dash-header { padding: 12px 16px 6px; }
    .dash-h1 { font-size: 24px; }
    .two-col { grid-template-columns: 1fr; }
    .ask-panel { top: 12%; border-radius: 24px 24px 0 0; }
  }`;

  window.TilliDashboard = { mount };
})();
