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

  // Landing-page flower art (flower-band.js) keyed by the dashboard's plant
  // state, so student surfaces read as the same illustration family as the
  // landing band instead of the potted plant. Falls back to plantSVG if the
  // flower-band script didn't load. `px` = rendered height; `i` just varies the
  // idle sway so a list of them doesn't move in lockstep.
  const FLOWER_KIND = { blossoming: 'flower', growing: 'tulip', tending: 'sprout', waiting: 'sprout' };
  const FLOWER_PETALS = (window.TilliFlowerPetals && window.TilliFlowerPetals.length)
    ? window.TilliFlowerPetals : ['#E91E8C', '#FCC30B', '#7C4DFF', '#FF7043'];
  function flowerArt(state, px, i) {
    if (!window.flowerMarkup) return plantSVG(state, Math.round(px * 0.9), false, false);
    const kind = FLOWER_KIND[state] || 'flower';
    const petal = kind === 'sprout' ? null : FLOWER_PETALS[(i || 0) % FLOWER_PETALS.length];
    return window.flowerMarkup(kind, petal, px, i || 0);
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

  // ---------------- "My Garden" landing (spec: my-garden-landing-spec.md) ----------------
  // The four states the landing can render, keyed by S.windowState. `windowOpen`
  // decides the hero (open window → assessment CTA; else → Ask Tilli). `maturity`
  // selects the garden-scene variant. Copy here is verbatim from the spec; {N}/{n}
  // /{next} are filled at render time. Between-window is the default — it's the most
  // common state and the one that proves the "calm doorway" concept.
  const LANDING_STATES = {
    baseline: {
      windowOpen: true, winKey: 'baseline', maturity: 'seedling', week: 'week 1',
      caption: 'Freshly planted — this is where the year begins.',
      heroTitle: 'Baseline is open',
      heroBlurb: 'Set the starting point for all {N} children — the garden they grow from.',
      deadline: 'Apr 2',
    },
    between: {
      windowOpen: false, maturity: 'growing', week: 'week 14',
      caption: 'Your garden is resting — scores next update at {next}.',
    },
    midline: {
      windowOpen: true, winKey: 'mid', maturity: 'growing2', week: 'week 15',
      caption: 'Growing season — your garden has moved since baseline.',
      celebrate: '{n} of your plants have grown since baseline.',
      heroTitle: 'Midline is open',
      heroBlurb: 'See how far your class has come since baseline.',
      deadline: 'Jun 18',
    },
    endline: {
      windowOpen: true, winKey: 'post', maturity: 'bloom', week: 'week 30',
      caption: "Full bloom — the end of this year's journey.",
      celebrate: '{n} plants blossomed across the whole year.',
      heroTitle: 'Endline is open',
      heroBlurb: 'The final check-in — capture how far every child has travelled.',
      deadline: 'Sep 24',
    },
  };

  // "This week's idea" content set. Rotates weekly, independent of assessment data
  // (the primary reason to return between windows). Treat as pluggable — the rotation
  // is the point, not this exact list.
  const WEEK_IDEAS = [
    { t: 'Feelings weather check-in', d: 'Open the day by asking each child to name their inner weather — sunny, cloudy, or stormy. Thirty seconds each, no fixing, just naming.', ask: 'Give me a 5-minute "feelings weather" check-in routine to run at the start of the day with my class.' },
    { t: 'Two-minute calm corner', d: 'Set up a quiet corner with one soft object. When a child feels too big inside, they can visit for two slow breaths, then rejoin. Introduce it to the whole class first.', ask: 'Help me set up and introduce a simple two-minute calm corner for my class.' },
    { t: 'Kindness on paper', d: 'Each child draws or writes one kind thing a classmate did this week. Read a few aloud with no names attached to keep it light and safe.', ask: 'Give me a short "kindness on paper" activity that builds empathy in my class this week.' },
    { t: 'Name it to tame it', d: 'When a child is frustrated, help them put a word to the feeling before anything else — "you look really frustrated." Naming lowers the heat before you problem-solve.', ask: 'Coach me through using "name it to tame it" with a child who gets frustrated easily.' },
    { t: 'One-breath reset', d: 'Between two busy activities, lead a single shared deep breath — everyone in, everyone out. It costs ten seconds and resets the room.', ask: 'Suggest a few tiny 10-second reset routines I can use between activities.' },
    { t: 'Glow and grow', d: 'End the day with each child sharing one "glow" (something that went well) and, if they want, one "grow" (something to try tomorrow). Model it yourself first.', ask: 'Give me a simple end-of-day "glow and grow" reflection routine for my class.' },
  ];

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
      gardenLevel: 'landing', classModal: null, studentId: null,
      // A first-time class (built from onboarding) opens on Baseline — no prior
      // data to show; the demo dataset opens mid-year ('between'). Dev GUI switch overrides.
      windowState: ctx.data.fresh ? 'baseline' : 'between',
      rosterSearch: '', rosterSort: 'state', studentTab: 'overview',
      assessTab: 'todo', enter: { studentId: null, q: 0, ratings: {}, done: false },
      logsView: 'class', logsStudentId: null, logStudentSearch: '', logListSearch: '', logListFilter: 'all',
      insightsView: 'myclass', skillGroup: 'sel', compareGrade: null,
      add: { active: false, step: 'count', sectionId: null, count: '', total: 0, done: 0, first: '', last: '', adm: '', results: [] },
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

  function hasStudents() { return S.data.sections.some((s) => s.students && s.students.length); }

  // First-time teacher who reached the dashboard with no students yet. One calm
  // screen across every destination (except profile) with a single clear action.
  function emptyClassView() {
    return `<div class="dash-wrap" style="max-width:640px">
      <div class="empty-class">
        <div class="empty-plant">${flowerArt('waiting', 96, 0)}</div>
        <h1 class="empty-t">Your garden is ready — let's plant it 🌱</h1>
        <p class="empty-b">Add the students in your class and they'll appear here as seedlings, ready for their baseline. Nothing grows until you add a name.</p>
        <button class="btn btn-primary focus empty-cta" data-onb-add>Add your students</button>
      </div>
    </div>`;
  }

  function mainView() {
    if (S.nav === 'profile') return profilePanel();
    if (!hasStudents()) return emptyClassView();
    if (S.nav === 'garden') return S.gardenLevel === 'beds' ? bedsView() : S.gardenLevel === 'section' ? sectionGardenView() : landingView();
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

  // ================= My Garden: landing (state-driven doorway) =================
  // Spec: my-garden-landing-spec.md. One skeleton, four states. Not a live
  // dashboard — a calm doorway to Ask Tilli + the open assessment + one fresh
  // weekly idea. Applies the existing DS only; no new visual language.

  const fill = (tpl, map) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? map[k] : ''));
  const bandOfPct = (p) => (p < 34 ? 'Beginner' : p < 67 ? 'Learner' : 'Expert');
  function greetWord() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
  // Weekly rotation for "This week's idea" — independent of assessment data.
  function weekIdea() { const wk = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)); return WEEK_IDEAS[wk % WEEK_IDEAS.length]; }

  function landingData() {
    const sec = section();
    const stu = sec.students;
    const N = stu.length;
    // Band mix: three counts that sum to class size. No-data ("waiting") children
    // fold into "Ready to tend" so the sum always equals N (they need attention too).
    const blossoming = stu.filter((s) => s.state === 'blossoming').length;
    const growing = stu.filter((s) => s.state === 'growing').length;
    const tend = N - blossoming - growing;
    // Celebration = plants that genuinely grew since the last window. Never fabricated.
    const grown = stu.filter((s) => s.grewSincePre >= 8).length;
    // Tend cards name only the gently-struggling few (max 3), always with an action.
    const tending = stu.filter((s) => s.state === 'tending');
    // Data-grounded "down from X": children whose *baseline* overall band was Beginner.
    const baselineTend = stu.filter((s) => bandOfPct(s.overallPre) === 'Beginner').length;
    return { sec, stu, N, blossoming, growing, tend, grown, tending, nTend: tending.length, baselineTend };
  }

  // Progress for an open assessment window. Baseline uses the per-student `assess`
  // flag; mid/post read the full assessLog. Returns done/total + next ungraded child.
  function windowProgress(winKey) {
    const list = section().students;
    const notDone = list.filter((s) => {
      if (winKey === 'baseline') return s.assess !== 'done';
      const w = (s.assessLog || []).find((x) => x.key === winKey);
      return !w || w.status !== 'done';
    });
    return { done: list.length - notDone.length, total: list.length, next: notDone[0] || list[0] };
  }

  // Compose the calm garden scene from the existing plant art (no new illustration).
  // Maturity varies which plant states + sizes fill the row.
  function gardenScene(maturity) {
    const { isPhone } = bp();
    const recipes = {
      seedling: ['waiting', 'tending', 'waiting', 'tending', 'waiting', 'tending', 'waiting'],
      growing: ['tending', 'growing', 'growing', 'tending', 'growing', 'growing', 'tending'],
      growing2: ['growing', 'blossoming', 'growing', 'growing', 'blossoming', 'growing', 'blossoming'],
      bloom: ['blossoming', 'blossoming', 'growing', 'blossoming', 'blossoming', 'blossoming', 'growing'],
    };
    let arr = recipes[maturity] || recipes.growing;
    if (isPhone) arr = arr.filter((_, i) => i % 2 === 0); // thin the row on phones
    const base = maturity === 'seedling' ? (isPhone ? 44 : 54) : maturity === 'bloom' ? (isPhone ? 68 : 92) : (isPhone ? 58 : 76);
    const offs = [16, 2, 22, 6, 18, 0, 12];
    // Use the landing flower-band art: student state → bloom stage.
    const KIND = { blossoming: 'flower', growing: 'tulip', tending: 'sprout', waiting: 'sprout' };
    const PETALS = (window.TilliFlowerPetals || ['#E866B0', '#26BDE2', '#FCC30B', '#E91E8C']);
    const plants = arr.map((st, i) => {
      const scale = st === 'blossoming' ? 1.06 : st === 'growing' ? 0.92 : st === 'tending' ? 0.8 : 0.7;
      const px = Math.round(base * scale * 1.35); // flowers are taller/thinner than the old pots
      const kind = KIND[st] || 'flower';
      const petal = kind === 'sprout' ? null : PETALS[i % PETALS.length];
      const art = window.flowerMarkup ? window.flowerMarkup(kind, petal, px, i) : plantSVG(st, Math.round(base * scale), false, false);
      return `<span class="mg-plant" style="transform:translateY(${offs[i % offs.length]}px)">${art}</span>`;
    }).join('');
    return `<div class="mg-scene mg-scene-${maturity}" aria-hidden="true">
      <span class="mg-sun"></span>
      <div class="mg-plants">${plants}</div>
      <div class="mg-ground"></div>
    </div>`;
  }

  // Band-mix strip: distinguishable without colour (each has a glyph + word + count).
  function bandMix(ld, note) {
    const items = [
      ['Blossoming', ld.blossoming, '#EFA9B8', '✿'],
      ['Growing', ld.growing, '#56C02B', '❋'],
      ['Ready to tend', ld.tend, '#E8C4A8', '◗'],
    ];
    return `<div class="mg-bandmix" role="group" aria-label="Class band mix">
      ${items.map(([lb, ct, c, ic]) => `<div class="mg-band"><span class="mg-band-ic" style="color:${c}" aria-hidden="true">${ic}</span><span class="mg-band-n">${ct}</span><span class="mg-band-lb">${lb}</span></div>`).join('')}
      ${note ? `<div class="mg-band-note">${esc(note)}</div>` : ''}
    </div>`;
  }

  function heroWindow(st, N) {
    const pg = windowProgress(st.winKey);
    const pct = pg.total ? Math.round((pg.done / pg.total) * 100) : 0;
    const nextName = pg.next ? (pg.next.dispFirst || pg.next.first) : '';
    return `<section class="mg-hero mg-hero-window">
      <div class="mg-eyebrow">Do what you came for</div>
      <h2 class="mg-hero-t">${esc(st.heroTitle)}</h2>
      <p class="mg-hero-b">${esc(fill(st.heroBlurb, { N }))}</p>
      <div class="mg-prog"><span style="width:${pct}%"></span></div>
      <div class="mg-prog-row"><span><b>${pg.done}</b> of ${pg.total} children done</span><span class="mg-deadline">Window closes ${esc(st.deadline)}</span></div>
      <button class="btn btn-primary focus mg-hero-cta" data-continue-assess="${esc(pg.next ? pg.next.id : '')}">Continue → next: ${esc(nextName)}</button>
    </section>`;
  }

  function heroAsk(sec) {
    const n = sec.students.length;
    const starters = [
      ['An activity for a restless class', `Suggest a 10-minute activity to settle a restless ${sec.grade} class of about ${n} children, with limited materials.`],
      ["Help me plan tomorrow's lesson", `Help me plan tomorrow's lesson for my ${sec.grade} class. Ask me what to focus on, then give a simple structure.`],
      ['A calm-down idea for one child', `Give me a gentle calm-down idea I can use with one child who gets overwhelmed, in a ${sec.grade} classroom.`],
    ];
    return `<section class="mg-hero mg-hero-ask">
      <div class="mg-eyebrow">Do what you came for</div>
      <div class="mg-hero-askhead"><span class="mg-hero-askic">${chatIcon('#348C11')}</span><h2 class="mg-hero-t">Ask Tilli</h2></div>
      <p class="mg-hero-b">Your teaching changes every day — even when the scores don't.</p>
      <div class="mg-starters">${starters.map(([lb, pr]) => `<button class="mg-starter focus" data-ask-prompt="${esc(pr)}" data-ask-ctx="${esc(sec.name + ' · quick start')}"><span>${esc(lb)}</span><span class="mg-starter-ar" aria-hidden="true">→</span></button>`).join('')}</div>
    </section>`;
  }

  function weekIdeaSlot() {
    const wi = weekIdea();
    return `<section class="mg-idea">
      <div class="mg-idea-tag">This week's idea</div>
      <h3 class="mg-idea-t">${esc(wi.t)}</h3>
      <p class="mg-idea-d">${esc(wi.d)}</p>
      <button class="mg-idea-ask focus" data-ask-prompt="${esc(wi.ask)}" data-ask-ctx="${esc("This week's idea · " + wi.t)}">${chatIcon('#348C11')} Ask Tilli for more</button>
    </section>`;
  }

  function tendSlot(ld, state) {
    if (state === 'baseline') {
      return `<section class="mg-tend">
        <h3 class="mg-tend-h">Who could use you</h3>
        <div class="mg-tend-empty">Once baseline is in, this is where the 2–3 children who could use a little extra will appear.</div>
      </section>`;
    }
    const notes = {
      between: `Unchanged since baseline — the same ${ld.nTend} could use a little extra`,
      midline: `Down from ${ld.baselineTend} at baseline`,
      endline: `Down to ${ld.nTend} now, from ${ld.baselineTend} at baseline — look how far they've come`,
    };
    const cards = ld.tending.slice(0, 3).map((st) => `
      <div class="mg-tend-card">
        <div class="mg-tend-top"><span class="mg-tend-pl">${flowerArt('tending', 46, 0)}</span><span class="mg-tend-nm">${esc(st.dispFirst)}</span></div>
        <p class="mg-tend-reason">${esc(st.tendReason)}</p>
        <button class="btn-ask-a focus" data-ask-prompt="${esc('How can I gently support ' + st.name + ', a ' + st.grade + ' child working on ' + st.lowestSkill.name + '? Give me one small thing to try this week.')}" data-ask-ctx="${esc(st.first + ' · ' + st.lowestSkill.name)}">${chatIcon('#fff')} Ask Tilli for an idea</button>
      </div>`).join('');
    return `<section class="mg-tend">
      <div class="mg-tend-head"><h3 class="mg-tend-h">Who could use you</h3><span class="mg-tend-note">${esc(notes[state] || '')}</span></div>
      <div class="mg-tend-grid">${cards || `<div class="mg-tend-empty">Every child is on track right now — nothing to tend. 🌿</div>`}</div>
    </section>`;
  }

  function landingView() {
    const ld = landingData();
    const { sec, N } = ld;
    const state = S.windowState;
    const st = LANDING_STATES[state] || LANDING_STATES.between;
    const nextWindow = (S.data.windows.find((w) => w.key === 'mid') || {}).label || 'Mid-year';

    // Slot 4 — celebration only when the garden genuinely moved (never fabricated).
    const celebration = (st.celebrate && ld.grown > 0)
      ? `<div class="mg-celebrate">🌸 ${esc(fill(st.celebrate, { n: ld.grown }))}</div>` : '';

    // Slot 5 — band mix (hidden at baseline; there's no prior data to mix).
    let bandBlock;
    if (state === 'baseline') {
      bandBlock = `<div class="mg-bandmix mg-bandmix-empty">${N} children, ready to begin their year.</div>`;
    } else {
      const note = state === 'between' ? `Last measured at baseline · ${N} children`
        : state === 'midline' ? `Your ${sec.name} · ${N} children`
        : `The year's story · ${N} children`;
      bandBlock = bandMix(ld, note);
    }

    // Slot 6 — hero: open window → its assessment CTA; no window → nothing.
    const hero = st.windowOpen ? heroWindow(st, N) : '';

    return `<div class="dash-wrap mg-wrap">
      <div class="mg-greet">
        <div>
          <h1 class="mg-hello">${greetWord()}, ${esc(firstName())} 🌱</h1>
          <p class="mg-season">Your <b>${esc(sec.name)}</b> garden · ${esc(st.week)}</p>
        </div>
        <button class="dash-avatarbtn focus" data-nav="profile" title="Your profile & sign out" aria-label="Your profile">${esc(initials())}</button>
      </div>

      ${gardenScene(st.maturity)}
      <p class="mg-caption">${esc(fill(st.caption, { next: nextWindow }))}</p>
      ${celebration}
      ${bandBlock}

      ${hero}
      ${weekIdeaSlot()}
      ${tendSlot(ld, state)}
      ${stateSwitcherGUI()}
    </div>`;
  }

  // Dev-only landing-state switch (see spec build order: mock the current window
  // first). Not part of the teacher UI — a scaffold to preview all four states.
  function stateSwitcherGUI() {
    const opts = [
      ['baseline', 'Baseline', 'State A — start of year, Baseline window open. Seedlings, no prior data; band mix hidden; tend list empty.'],
      ['between', 'Between', 'State B — most of the year, no window open. Ask Tilli is the hero; garden is honestly "resting".'],
      ['midline', 'Midline', 'State C — mid-year window open. Garden has grown; celebration line appears.'],
      ['endline', 'Endline', 'State D — year end, Endline window open. Full bloom; biggest celebration.'],
    ];
    return `<div class="mg-gui" role="group" aria-label="Landing state (dev only)">
      <div class="mg-gui-h" title="Dev-only switch. Drives which of the 4 landing states renders (controls S.windowState). Not shown to teachers — bake or remove before ship.">Landing&nbsp;state <span class="mg-gui-star" title="Newly added control">*</span></div>
      <div class="mg-gui-opts">${opts.map(([v, lb, tip]) => `<button class="mg-gui-opt${S.windowState === v ? ' on' : ''}" data-window-state="${v}" title="${esc(tip)}">${lb}</button>`).join('')}</div>
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
        <button class="pg-plant" data-open-student="${esc(st.id)}" title="${esc(st.name)}">${flowerArt(st.state, sizeFor(st.state), i)}</button>
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
    const tendCards = tendList.map((st, i) => `
      <div class="tend-card">
        <div class="tend-top"><span class="pl">${flowerArt('tending', 52, i)}</span>
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
    return list.map((st, i) => `
      <button class="roster-row" data-open-student="${esc(st.id)}">
        <span class="rr-plant">${flowerArt(st.state, 46, i)}</span>
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

    // Brand-new student, no assessment recorded yet — skip the score tabs (they'd
    // all read 0%) and point the teacher at the one useful action: the baseline.
    if (stu.state === 'waiting') {
      return `<div class="dash-wrap" style="max-width:960px">
        <button class="link-back focus" data-back-roster>← All students</button>
        <div class="stu-head">
          <span class="stu-plant">${flowerArt('waiting', 76, 0)}</span>
          <div class="stu-meta">
            <h1 class="stu-name">${esc(stu.name)}</h1>
            <div class="stu-sub">${esc(stu.section)} · ${esc(stu.parentEmail)}</div>
            ${claimCodeLine(stu)}
          </div>
        </div>
        <div class="dash-card" style="text-align:center;padding:40px 28px;margin-top:16px">
          <div style="font-family:'Quicksand',sans-serif;font-weight:700;font-size:18px;color:var(--ink-900)">No assessment data yet</div>
          <p style="color:var(--ink-450);font-size:14px;margin:8px auto 0;max-width:420px;line-height:1.5">Once you complete ${esc(stu.dispFirst)}'s baseline, their skills, growth and perspectives will grow in here.</p>
          <button class="btn btn-primary focus" data-continue-assess="${esc(stu.id)}" style="margin-top:18px;padding:12px 22px">Start baseline for ${esc(stu.dispFirst)} →</button>
        </div>
      </div>`;
    }

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
        <span class="stu-plant">${flowerArt(stu.state, 76, 0)}</span>
        <div class="stu-meta">
          <h1 class="stu-name">${esc(stu.name)}</h1>
          <div class="stu-sub">${esc(stu.section)} · ${esc(stu.parentEmail)}</div>
          ${claimCodeLine(stu)}
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
    const celebrate = e.done ? `<div class="obs-celebrate">${flowerArt('growing', 90, 0)}<div class="msg">${esc(stu.first)}'s plant just got a little taller 🌱</div></div>` : '';
    return `<div class="obs-enter">
      <div class="obs-enter-head"><span class="pl">${flowerArt(stu.state, 46, 0)}</span><div><div class="nm">${esc(stu.first)}</div><div class="sub">${esc(sec.name)} · observation</div></div></div>
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
      detail = `<div class="logstu-head"><span class="pl">${flowerArt(active.state, 60, 0)}</span>
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

  // ================= Insights (teacher planning view) =================
  // Ownership + phase helpers ------------------------------------------------
  // Which teacher this dashboard opened as. Falls back to the onboarding teacher
  // object, then null (a fresh class where every section is already "mine").
  function activeTeacherId() { return (S.data && S.data.activeTeacherId) || (S.teacher && S.teacher.id) || null; }
  function mySections() {
    const tid = activeTeacherId();
    if (!tid) return S.data.sections;
    const owned = S.data.sections.filter((s) => s.teacherId === tid);
    return owned.length ? owned : S.data.sections; // fresh class → all are hers
  }
  // Grades where she owns 2+ sections → the only grades "Compare my sections"
  // offers. Never cross-grade, never another teacher's section.
  function comparableGrades() {
    const byGrade = {};
    mySections().forEach((s) => { (byGrade[s.grade] = byGrade[s.grade] || []).push(s); });
    return Object.keys(byGrade).filter((g) => byGrade[g].length >= 2).map((g) => ({ grade: g, sections: byGrade[g] }));
  }
  function canCompare() { return comparableGrades().length > 0; }

  // The 3 measurement windows in order, mapped to the skill fields they fill.
  function phaseMeta() {
    const w = {}; (S.data.windows || []).forEach((x) => { w[x.key] = x; });
    return [
      { win: 'baseline', field: 'pre',  meta: w.baseline || { label: 'Baseline', date: '' } },
      { win: 'mid',      field: 'mid',  meta: w.mid || { label: 'Mid-year', date: '' } },
      { win: 'post',     field: 'post', meta: w.post || { label: 'End of year', date: '' } },
    ];
  }
  // A phase is "measured" for a group of students when, on average, at least half
  // of each child's three perspectives are in for that window (spec: drive empty
  // states off assessLog, not off placeholder numbers). Baseline & Mid clear this;
  // the still-open End-of-year window does not, so it honestly reads "not yet".
  function phaseMeasured(winKey, students) {
    const assessed = students.filter((s) => s.state !== 'waiting' && Array.isArray(s.assessLog));
    if (!assessed.length) return false;
    let sum = 0, n = 0;
    assessed.forEach((s) => { const w = s.assessLog.find((x) => x.key === winKey); if (w) { sum += (w.doneCount || 0) / 3; n++; } });
    return n > 0 && (sum / n) >= 0.5;
  }
  function measuredMap(students) { const m = {}; phaseMeta().forEach((p) => { m[p.win] = phaseMeasured(p.win, students); }); return m; }
  function groupLabel(g) { return g === 'cog' ? 'Executive Function' : 'Social-Emotional'; }

  // Per-skill class stats for a set of students: phase averages, the three
  // perspective averages, and the plurality band (which summary box it lands in).
  function skillStatsFor(students) {
    const assessed = students.filter((s) => s.state !== 'waiting');
    return S.data.skills.map((sk) => {
      const arr = assessed.map((s) => s.skills.find((x) => x.key === sk.key)).filter(Boolean);
      const avg = (f) => Math.round(arr.reduce((a, x) => a + (x[f] || 0), 0) / (arr.length || 1));
      const counts = { Beginner: 0, Learner: 0, Expert: 0 };
      arr.forEach((x) => { if (counts[x.band] != null) counts[x.band]++; });
      // Plurality band. Ties resolve toward the lower band (→ "A place to focus").
      let plurality = 'Beginner';
      ['Beginner', 'Learner', 'Expert'].forEach((b) => { if (counts[b] > counts[plurality]) plurality = b; });
      const teacher = avg('teacher'), parent = avg('parent'), student = avg('student');
      return {
        key: sk.key, name: sk.name, group: sk.group,
        pre: avg('pre'), mid: avg('mid'), post: avg('post'),
        teacher, parent, student, gap: Math.max(teacher, parent, student) - Math.min(teacher, parent, student),
        counts, plurality, total: arr.length,
      };
    });
  }
  function toneOf(v) { return v < 34 ? 'focus' : v < 67 ? 'devel' : 'strong'; }

  function insightsView() {
    const scope = section();
    const meas = measuredMap(scope.students);
    // Before baseline exists at all → one calm whole-page state, no empty modules.
    if (!meas.baseline) return insPreBaseline(scope);

    if (S.insightsView === 'compare' && !canCompare()) S.insightsView = 'myclass';
    const view = ['myclass', 'perspectives', 'compare'].indexOf(S.insightsView) >= 0 ? S.insightsView : 'myclass';
    const tabDefs = [['myclass', 'My class'], ['perspectives', 'Perspectives']];
    if (canCompare()) tabDefs.push(['compare', 'Compare my sections']);
    const tabs = tabDefs.map(([k, l]) => `<button class="pill-tab intab${view === k ? ' on' : ''}" data-inview="${k}" role="tab" aria-selected="${view === k}">${l}</button>`).join('');

    const stats = skillStatsFor(scope.students);
    let body = '';
    if (view === 'myclass') body = insMyClass(stats, meas, scope);
    else if (view === 'perspectives') body = insPerspectives(stats, scope);
    else body = insCompare();

    return `<div class="dash-wrap" style="max-width:1040px">
      <h1 class="dash-h1">Insights</h1>
      <p class="dash-sub">A quiet place to plan — where ${esc(scope.name)} is strong, growing, and ready for focus.</p>
      <div class="log-tabs" role="tablist" style="margin-top:16px">${tabs}</div>
      ${body}
    </div>`;
  }

  // Whole-page pre-baseline state.
  function insPreBaseline(scope) {
    return `<div class="dash-wrap" style="max-width:640px">
      <h1 class="dash-h1">Insights</h1>
      <div class="empty-class">
        <div class="empty-plant">${flowerArt('waiting', 92, 0)}</div>
        <h2 class="empty-t">Your first insights arrive after baseline 🌱</h2>
        <p class="empty-b">Once ${esc(scope.name)} has its Baseline window in, this page fills with where your class is strong, where to focus, and how they grow across the year. Nothing to read yet — and that's honest, not broken.</p>
        <button class="btn btn-primary focus empty-cta" data-nav="assess">Go to Baseline</button>
      </div>
    </div>`;
  }

  // --- Sub-tab 1: My class ---------------------------------------------------
  function insMyClass(stats, meas, scope) {
    return `${bandSummaryCard(stats, scope)}
      ${progressCard(stats, meas)}
      ${breakdownCard(stats, meas)}`;
  }

  // a) Skill-band summary — the 3 headline boxes (sorts SKILLS, not children).
  function bandSummaryCard(stats, scope) {
    const boxes = [
      { tone: 'focus',  title: 'A place to focus', sub: 'Most children are at Beginner', list: stats.filter((s) => s.plurality === 'Beginner') },
      { tone: 'devel',  title: 'Developing',       sub: 'Most children are at Learner',  list: stats.filter((s) => s.plurality === 'Learner') },
      { tone: 'strong', title: 'Growing strong',   sub: 'Most children are at Expert',   list: stats.filter((s) => s.plurality === 'Expert') },
    ];
    const box = (b) => {
      const multi = b.list.length > 3;
      const body = b.list.length
        ? `<ul class="bs-skills${multi ? ' two-col' : ''}">${b.list.map((s) => `<li>${esc(s.name)}</li>`).join('')}</ul>`
        : `<div class="bs-none">Nothing sits here right now.</div>`;
      return `<div class="bs-box bs-${b.tone}${multi ? ' bs-wide' : ''}">
        <div class="bs-head"><span class="bs-count">${b.list.length}</span><div><div class="bs-title">${b.title}</div><div class="bs-sub">${b.sub}</div></div></div>
        ${body}
      </div>`;
    };
    return `<div class="dash-card ins-card" style="margin-top:16px">
      <div class="ins-h">Where ${esc(scope.name)} sits across the 12 skills</div>
      <div class="ins-sub">Grouped by where most children are right now — a place to start, never a grade.</div>
      <div class="bs-grid">${boxes.map(box).join('')}</div>
    </div>`;
  }

  // b) Progress over time — Baseline / Mid / End grouped columns per skill.
  function progressCard(stats, meas) {
    const phases = phaseMeta();
    const rows = stats.map((s) => {
      const cells = phases.map((p) => {
        if (!meas[p.win]) return `<div class="pot-cell pot-empty" title="${esc(p.meta.label)} not measured yet"><div class="pot-barwrap pot-hollow"></div><span class="pot-val">–</span><span class="pot-lab">${esc(shortWin(p.meta.label))}</span></div>`;
        const v = s[p.field];
        return `<div class="pot-cell"><div class="pot-barwrap"><div class="pot-bar bs-fill-${toneOf(v)}" style="height:${Math.max(6, v)}%"></div></div><span class="pot-val">${v}%</span><span class="pot-lab">${esc(shortWin(p.meta.label))}</span></div>`;
      }).join('');
      return `<div class="pot-skill"><div class="pot-name">${esc(s.name)}</div><div class="pot-cells">${cells}</div></div>`;
    }).join('');
    const pending = phases.filter((p) => !meas[p.win]);
    const note = pending.length
      ? `<div class="pot-note">🕒 ${pending.map((p) => `${esc(p.meta.label)}${p.meta.date ? ' opens ' + esc(p.meta.date) : ' hasn\'t opened yet'}`).join(' · ')}</div>` : '';
    return `<div class="dash-card ins-card" style="margin-top:16px">
      <div class="ins-h">Growth over time</div>
      <div class="ins-sub">Baseline → Mid-year → End of year, side by side, so movement is visible.</div>
      <div class="pot-list">${rows}</div>
      ${note}
      <div class="ins-foot"><button class="sc-ask focus" data-ask-ins="grow" style="width:auto;padding:10px 16px">Ask Tilli what to do with this →</button></div>
    </div>`;
  }
  function shortWin(label) { return label === 'Mid-year' ? 'Mid' : label === 'End of year' ? 'End' : 'Base'; }

  // c) Detailed skill breakdown — one card per skill, SEL / EF toggle.
  function breakdownCard(stats, meas) {
    const g = S.skillGroup === 'cog' ? 'cog' : 'sel';
    const toggle = `<div class="sb-toggle" role="tablist">
      <button class="pill-tab${g === 'sel' ? ' on' : ''}" data-skillgroup="sel" role="tab" aria-selected="${g === 'sel'}">Social-Emotional</button>
      <button class="pill-tab${g === 'cog' ? ' on' : ''}" data-skillgroup="cog" role="tab" aria-selected="${g === 'cog'}">Executive Function</button></div>`;
    const phases = phaseMeta();
    const cards = stats.filter((s) => s.group === g).map((s) => {
      const prog = phases.map((p) => meas[p.win]
        ? `<div class="scph"><span class="scph-l">${esc(shortWin(p.meta.label))}</span><span class="scph-v">${s[p.field]}%</span></div>`
        : `<div class="scph scph-empty"><span class="scph-l">${esc(shortWin(p.meta.label))}</span><span class="scph-v">—</span></div>`).join('');
      const persp = `<div class="scpv">
        <span title="How you rate the class">👩‍🏫 <b>${s.teacher}%</b> <em>Teacher</em></span>
        <span title="How parents rate at home">🏠 <b>${s.parent}%</b> <em>Parent</em></span>
        <span title="The children's own view">🧒 <b>${s.student}%</b> <em>Student</em></span></div>`;
      return `<button class="sb-card focus" data-ask="build" data-skill="${esc(s.name)}" data-band="${s.plurality}" aria-label="Ask Tilli how to build ${esc(s.name)}">
        <div class="sb-top"><span class="sb-name">${esc(s.name)}</span><span class="sb-tag sb-tag-${g}">${groupLabel(g)}</span></div>
        <div class="scprog">${prog}</div>
        ${persp}
        <span class="sb-ask">Ask Tilli how to build this →</span>
      </button>`;
    }).join('');
    return `<div class="dash-card ins-card" style="margin-top:16px">
      <div class="ins-h">Every skill, up close</div>
      <div class="ins-sub">Tap a skill for a Tilli idea to build it. Perspectives show how teacher, parent and child each see it.</div>
      ${toggle}
      <div class="sb-grid">${cards}</div>
    </div>`;
  }

  // --- Sub-tab 2: Perspectives ----------------------------------------------
  function insPerspectives(stats, scope) {
    const prompts = worthCloserLook(stats);
    const cards = stats.map((s) => `<div class="pv-card">
      <div class="pv-skill">${esc(s.name)}</div>
      <div class="pv-nums">
        <span class="pv-num"><i>👩‍🏫</i><b>${s.teacher}%</b><em>Teacher</em></span>
        <span class="pv-num"><i>🏠</i><b>${s.parent}%</b><em>Parent</em></span>
        <span class="pv-num"><i>🧒</i><b>${s.student}%</b><em>Student</em></span>
      </div></div>`).join('');
    return `<div class="persp-note">Teachers, parents and children each see a skill from where they stand. A difference isn't right or wrong — it's a clue about where the skill shows up. 🌤️</div>
      ${prompts}
      <div class="dash-card ins-card" style="margin-top:16px">
        <div class="ins-h">Every skill, three viewpoints</div>
        <div class="ins-sub">The same numbers from your skill cards, lined up to compare.</div>
        <div class="pv-grid">${cards}</div>
      </div>`;
  }
  // "Worth a closer look" — the few biggest, most meaningful gaps, reframed as
  // gentle prompts (never "you're wrong"), each ending in an Ask Tilli action.
  function worthCloserLook(stats) {
    const PERSP_NOUN = { teacher: 'you', parent: 'parents at home', student: 'the children themselves' };
    const picked = stats.map((s) => {
      const ps = [['teacher', s.teacher], ['parent', s.parent], ['student', s.student]];
      const hi = ps.reduce((a, b) => (b[1] > a[1] ? b : a));
      const lo = ps.reduce((a, b) => (b[1] < a[1] ? b : a));
      return Object.assign({}, s, { hiKey: hi[0], loKey: lo[0] });
    }).sort((a, b) => b.gap - a.gap).filter((s) => s.gap >= 12).slice(0, 3);
    if (!picked.length) return '';
    const items = picked.map((s) => {
      const line = `${cap(PERSP_NOUN[s.hiKey])} rate ${esc(s.name)} noticeably higher than ${PERSP_NOUN[s.loKey]} do. That's worth a closer look — a skill can simply show up differently at home, in play, or in class.`;
      return `<div class="wcl-item">
        <div class="wcl-skill">${esc(s.name)} <span class="wcl-gap">${s.gap} pts apart</span></div>
        <p class="wcl-text">${line}</p>
        <button class="sc-ask focus" data-ask="persp" data-skill="${esc(s.name)}" data-hi="${esc(s.hiKey)}" data-lo="${esc(s.loKey)}" style="width:auto;padding:9px 15px">Ask Tilli why this happens →</button>
      </div>`;
    }).join('');
    return `<div class="dash-card ins-card">
      <div class="ins-h">Worth a closer look</div>
      <div class="ins-sub">The few places your class's views differ most — each a conversation, never a correction.</div>
      <div class="wcl-list">${items}</div>
    </div>`;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // --- Sub-tab 3: Compare my sections (own sections, one grade, no benchmark) -
  function insCompare() {
    const grades = comparableGrades();
    if (!grades.length) return '';
    const active = grades.find((g) => g.grade === S.compareGrade) || grades[0];
    const gsel = grades.length > 1
      ? `<div class="log-tabs" style="margin:0 0 14px">${grades.map((g) => `<button class="pill-tab${g.grade === active.grade ? ' on' : ''}" data-cmpgrade="${esc(g.grade)}">${esc(g.grade)}</button>`).join('')}</div>` : '';
    const secs = active.sections;
    const secStats = secs.map((sec) => ({ sec, stats: skillStatsFor(sec.students) }));
    const cols = `repeat(${secs.length}, minmax(0,1fr))`;

    const head = `<div class="cmp2-row cmp2-head"><div class="cmp2-skill"></div><div class="cmp2-cells" style="grid-template-columns:${cols}">${secs.map((sec) => `<div class="cmp2-secname">${esc(sec.name)}</div>`).join('')}</div></div>`;
    const rows = S.data.skills.map((sk) => {
      const cells = secStats.map(({ stats }) => {
        const v = (stats.find((x) => x.key === sk.key) || {}).post || 0;
        return `<div class="cmp2-cell"><div class="cmp2-mini"><div class="bs-fill-${toneOf(v)}" style="width:${Math.max(4, v)}%"></div></div><span>${v}%</span></div>`;
      }).join('');
      return `<div class="cmp2-row"><div class="cmp2-skill">${esc(sk.name)}</div><div class="cmp2-cells" style="grid-template-columns:${cols}">${cells}</div></div>`;
    }).join('');

    // Curiosity prompts: biggest section-to-section differences, never a ranking.
    const diffs = S.data.skills.map((sk) => {
      const vals = secStats.map(({ sec, stats }) => ({ sec, v: (stats.find((x) => x.key === sk.key) || {}).post || 0 }));
      const hi = vals.reduce((a, b) => (b.v > a.v ? b : a));
      const lo = vals.reduce((a, b) => (b.v < a.v ? b : a));
      return { name: sk.name, gap: hi.v - lo.v, hi, lo };
    }).sort((a, b) => b.gap - a.gap).filter((d) => d.gap >= 10).slice(0, 3);
    const prompts = diffs.length ? `<div class="wcl-list" style="margin-top:16px">${diffs.map((d) => `<div class="wcl-item">
      <div class="wcl-skill">${esc(d.name)} <span class="wcl-gap">${esc(d.hi.sec.name)} +${d.gap}</span></div>
      <p class="wcl-text">${esc(d.hi.sec.name)} is ahead of ${esc(d.lo.sec.name)} on ${esc(d.name)}. What's working in ${esc(d.hi.sec.name)} that could help ${esc(d.lo.sec.name)}?</p>
      <button class="sc-ask focus" data-ask="cmp" data-skill="${esc(d.name)}" data-hi="${esc(d.hi.sec.name)}" data-lo="${esc(d.lo.sec.name)}" style="width:auto;padding:9px 15px">Ask Tilli for an activity to bring to ${esc(d.lo.sec.name)} →</button>
    </div>`).join('')}</div>` : '';

    return `<div class="persp-note" style="background:var(--wash-green);color:#3d6b2b">Two of your own classes, side by side. This is for learning from yourself — what's working in one room you could carry to the other. Never a ranking. 🌿</div>
      ${gsel}
      <div class="dash-card ins-card">
        <div class="ins-h">${esc(active.grade)} — section by section</div>
        <div class="ins-sub">Current level per skill. No grade average, no benchmark — just your rooms compared to each other.</div>
        <div class="cmp2-table">${head}${rows}</div>
      </div>
      ${prompts}`;
  }

  // Resolve this school's id once (S.teacher.school is the display name).
  function schoolId() {
    if (S._schoolId !== undefined) return S._schoolId;
    var sc = (window.TilliAPI && window.TilliAPI.resolveSchool) ? window.TilliAPI.resolveSchool(S.teacher.school || (S.data && S.data.school)) : null;
    S._schoolId = sc ? sc.school_id : null;
    return S._schoolId;
  }
  // The stable verification code the parent needs to claim this child (spec §5).
  // Looked up from the guard layer by admission number; shown to the teacher so
  // they can pass it on. Falls back to nothing if the child isn't in the store.
  function claimCodeLine(stu) {
    if (!stu || !stu.adm || !window.TilliAPI || !window.TilliAPI.getStudent) return '';
    const rec = window.TilliAPI.getStudent(schoolId(), stu.adm);
    if (!rec || !rec.claimCode) return '';
    return `<div class="stu-sub" style="margin-top:2px">Parent verification code:
      <span style="font-family:'Quicksand',sans-serif;font-weight:700;color:var(--green-700);background:#EAF7E3;border-radius:999px;padding:2px 10px;margin-left:4px">${esc(rec.claimCode)}</span></div>`;
  }

  // ================= Add student flow =================
  function openAddFlow() {
    S.add = { active: true, step: 'count', sectionId: S.sectionId, count: '', total: 0, done: 0, first: '', last: '', adm: '', results: [] };
    render();
  }
  // Persist one planted student through the dedupe guard (spec A4). Records the
  // outcome (created / merged / review) so the finish screen can summarise it and
  // show the parent verification codes for the new children.
  function persistPlantedStudent() {
    const a = S.add;
    const first = (a.first || '').trim(), last = (a.last || '').trim(), adm = (a.adm || '').trim();
    if (!window.TilliAPI || !window.TilliAPI.addStudent) { a.results.push({ name: (first + ' ' + last).trim(), result: 'created' }); return; }
    const sec = S.data.sections.find((x) => x.id === a.sectionId) || {};
    // DEMO: ensure this teacher has scope for the section (real system: scope is
    // granted by the Admin invite, spec A3). Keeps the guard's shape intact.
    const scope = window.TilliAPI.ensureTeacherScope(S.teacher.email, S.teacher.school, sec.grade, sec.section);
    const res = window.TilliAPI.addStudent({
      actorEmail: S.teacher.email, school_id: scope && scope.school_id, section_id: scope && scope.section_id,
      student_id: adm || ('TMP-' + Date.now()), first, last, grade: sec.grade, section: sec.section, source: 'manual',
    });
    a.results.push({
      name: (first + ' ' + last).trim(), result: res.result,
      claimCode: res.student && res.student.claimCode,
      matched: res.matched && res.matched.name,
    });
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
      const results = a.results || [];
      const created = results.filter((r) => r.result === 'created');
      const merged = results.filter((r) => r.result === 'merged');
      const review = results.filter((r) => r.result === 'review');
      // Dedupe outcome — surfaced so the teacher sees duplicates were prevented.
      const dedupeNote = (merged.length || review.length) ? `
        <div class="add-done-sub" style="background:#EAF4FF;border:1px solid #C9DEF6;border-radius:12px;padding:10px 14px;margin:0 auto 12px;max-width:340px;color:#33465e">
          ${merged.length ? `${merged.length} admission number${merged.length === 1 ? ' was' : 's were'} already on the roster — merged instead of duplicated.` : ''}
          ${review.length ? ` ${review.length} entr${review.length === 1 ? 'y looks' : 'ies look'} like an existing student — flagged for your admin to review.` : ''}
        </div>` : '';
      // Parent verification codes for the newly created children (spec §5).
      const codes = created.filter((r) => r.claimCode).map((r) =>
        `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #EFEAe0">
          <span style="font-weight:700;color:#4b463c">${esc(r.name)}</span>
          <span style="font-family:'Quicksand',sans-serif;font-weight:700;color:var(--green-700)">${esc(r.claimCode)}</span></div>`).join('');
      const codeCard = codes ? `
        <div style="background:#fff;border:1px solid #EFEAe0;border-radius:14px;padding:12px 16px;margin:0 auto 16px;max-width:340px;text-align:left">
          <div style="font-weight:800;font-size:12.5px;color:#8a8272;margin-bottom:4px">Parent verification codes</div>
          <div style="font-size:12px;color:#9a9284;margin-bottom:6px">Share each code with the child’s parent so they can securely link to them.</div>
          ${codes}
        </div>` : '';
      step = `<div class="add-center" style="padding:14px 0 4px">
        <div style="display:flex;justify-content:center;margin:6px 0 14px">${flowerArt('growing', 96, 0)}</div>
        <div class="add-done-title">${created.length || a.total} seeds planted 🌱</div>
        <p class="add-done-sub">Your ${esc(addGradeName())} bed is ready. Time to help them grow.</p>
        ${dedupeNote}
        ${codeCard}
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
      persistPlantedStudent();                 // dedupe guard runs here (spec A4)
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
    const empty = a.thread.length === 0 ? `<div class="ask-empty">${flowerArt('growing', 76, 0)}<div>Edit the prompt below and send — I’ll suggest something you can use today.</div></div>` : '';
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
      if (k === 'garden') { S.nav = 'garden'; S.gardenLevel = 'landing'; } else S.nav = k;
      S.studentId = null; render();
    }));
    root.querySelectorAll('[data-section]').forEach((b) => b.addEventListener('click', () => { S.sectionId = b.dataset.section; S.studentId = null; render(); }));
    root.querySelectorAll('[data-open-class]').forEach((b) => b.addEventListener('click', () => { S.classModal = b.dataset.openClass; render(); }));
    root.querySelectorAll('[data-back-beds]').forEach((b) => b.addEventListener('click', () => { S.gardenLevel = 'beds'; render(); }));
    // My Garden landing: dev state switch, hero/tend Ask-Tilli prompts, assess CTA, doorways.
    root.querySelectorAll('[data-window-state]').forEach((b) => b.addEventListener('click', () => { S.windowState = b.dataset.windowState; render(); }));
    root.querySelectorAll('[data-ask-prompt]').forEach((b) => b.addEventListener('click', () => openAsk(b.dataset.askCtx || '', b.dataset.askPrompt || '')));
    root.querySelectorAll('[data-continue-assess]').forEach((b) => b.addEventListener('click', () => { S.ask.open = false; S.nav = 'assess'; startEnter(b.dataset.continueAssess); }));
    root.querySelectorAll('[data-garden-level]').forEach((b) => b.addEventListener('click', () => { S.ask.open = false; S.nav = 'garden'; S.gardenLevel = b.dataset.gardenLevel; render(); }));
    root.querySelectorAll('[data-add-class]').forEach((b) => b.addEventListener('click', () => openAddFlow()));
    // Empty-state CTA → back to onboarding's "add students" step (re-mounts on finish).
    root.querySelectorAll('[data-onb-add]').forEach((b) => b.addEventListener('click', () => {
      if (window.TilliOnboarding && window.TilliOnboarding.addStudents) window.TilliOnboarding.addStudents();
      else openAddFlow();
    }));

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
    root.querySelectorAll('[data-skillgroup]').forEach((b) => b.addEventListener('click', () => { S.skillGroup = b.dataset.skillgroup; render(); }));
    root.querySelectorAll('[data-cmpgrade]').forEach((b) => b.addEventListener('click', () => { S.compareGrade = b.dataset.cmpgrade; render(); }));
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
      const skill = b.dataset.skill, band = b.dataset.band;
      const PN = { teacher: 'you (the teacher)', parent: 'parents at home', student: 'the children themselves' };
      if (b.dataset.ask === 'activity') openAsk(`${sec.name} · ${skill}`, `Suggest a 10-minute classroom activity to build ${skill} for a ${sec.grade} student currently at ${band} level. My class has ~${sec.students.length} students and limited materials.`);
      else if (b.dataset.ask === 'build') openAsk(`${sec.name} · ${skill}`, `Most of my ${sec.grade} class sit at ${band} level on ${skill}. Give me 2–3 practical, low-prep ways to build this skill across the whole class over the next few weeks.`);
      else if (b.dataset.ask === 'persp') openAsk(`${sec.name} · ${skill} · perspectives`, `On ${skill}, ${PN[b.dataset.hi] || b.dataset.hi} rate my ${sec.grade} class noticeably higher than ${PN[b.dataset.lo] || b.dataset.lo} do. Why might this happen, and what could I try — kindly, without assuming anyone is wrong?`);
      else if (b.dataset.ask === 'cmp') openAsk(`${b.dataset.hi} → ${b.dataset.lo} · ${skill}`, `In my ${sec.grade}, ${b.dataset.hi} is ahead of ${b.dataset.lo} on ${skill}. Give me one activity or routine that might be working in ${b.dataset.hi} that I could bring to ${b.dataset.lo}.`);
      else openAsk(`${sec.name} · ${skill}`, `Give me a whole-class ${sec.grade} activity to strengthen ${skill}. ${b.dataset.beg} of my students are at Beginner level in it.`);
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

  /* ===== Insights — teacher planning view ===== */
  /* Growth-tone fills (design-system band tones, never traffic-light red). */
  .bs-fill-focus { background: #E8C4A8; } .bs-fill-devel { background: #A9CE8C; } .bs-fill-strong { background: #EFA9B8; }

  /* a) Skill-band summary — the 3 headline boxes */
  .bs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 4px; }
  .bs-box { border-radius: 18px; padding: 16px 16px 18px; border: 1px solid transparent; }
  .bs-box.bs-wide { grid-column: span 2; }
  .bs-focus  { background: #FBF1E8; border-color: #EED8C2; }
  .bs-devel  { background: #F1F8EC; border-color: #D8E8CB; }
  .bs-strong { background: #FCEEF1; border-color: #F3D6DD; }
  .bs-head { display: flex; align-items: center; gap: 11px; margin-bottom: 12px; }
  .bs-count { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 26px; line-height: 1; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #fff; }
  .bs-focus .bs-count { color: #a06a44; } .bs-devel .bs-count { color: #4e6b43; } .bs-strong .bs-count { color: #b0546b; }
  .bs-title { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 15px; color: var(--ink-900); }
  .bs-sub { font-size: 11.5px; font-weight: 600; color: var(--ink-450); }
  .bs-skills { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .bs-skills.two-col { columns: 2; column-gap: 16px; display: block; }
  .bs-skills.two-col li { break-inside: avoid; margin-bottom: 6px; }
  .bs-skills li { font-size: 13px; font-weight: 700; color: #4e463a; padding-left: 14px; position: relative; }
  .bs-skills li::before { content: '•'; position: absolute; left: 0; color: var(--ink-300); }
  .bs-none { font-size: 12.5px; color: var(--ink-300); font-weight: 600; font-style: italic; }

  /* b) Progress over time — grouped columns per skill */
  .pot-list { display: flex; flex-direction: column; }
  .pot-skill { display: grid; grid-template-columns: 150px 1fr; gap: 14px; align-items: center; padding: 12px 0; border-top: 1px solid var(--line-200); }
  .pot-skill:first-child { border-top: none; }
  .pot-name { font-size: 13px; font-weight: 700; color: #4e463a; }
  .pot-cells { display: flex; gap: 16px; align-items: flex-end; }
  .pot-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 40px; }
  .pot-barwrap { height: 56px; width: 22px; background: var(--surface-100); border-radius: 6px; display: flex; align-items: flex-end; overflow: hidden; }
  .pot-hollow { border: 1px dashed #D9CFC0; background: transparent; }
  .pot-bar { width: 100%; border-radius: 6px 6px 0 0; transition: height .45s var(--ease); }
  .pot-val { font-size: 11px; font-weight: 800; color: var(--ink-450); }
  .pot-empty .pot-val { color: var(--ink-300); }
  .pot-lab { font-size: 10px; font-weight: 700; color: var(--ink-300); text-transform: uppercase; letter-spacing: .02em; }
  .pot-note { margin-top: 14px; font-size: 12.5px; font-weight: 600; color: var(--ink-450); background: var(--surface-100); border-radius: 10px; padding: 9px 13px; }

  /* c) Detailed skill breakdown */
  .sb-toggle { display: flex; gap: 6px; margin: 4px 0 16px; }
  .sb-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .sb-card { text-align: left; background: var(--surface-100); border: 1px solid var(--line-200); border-radius: 16px; padding: 14px 15px; cursor: pointer; font-family: 'Montserrat',sans-serif; transition: border-color .2s, transform .2s var(--ease); }
  .sb-card:hover { border-color: #CFE3BF; transform: translateY(-1px); }
  @media (prefers-reduced-motion: reduce) { .sb-card:hover { transform: none; } }
  .sb-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .sb-name { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 14.5px; color: var(--ink-900); }
  .sb-tag { font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 7px; white-space: nowrap; }
  .sb-tag-sel { background: #E7F0FA; color: #3f6377; } .sb-tag-cog { background: #EFEAF7; color: #6a5a93; }
  .scprog { display: flex; gap: 8px; margin-bottom: 10px; }
  .scph { flex: 1; background: #fff; border-radius: 9px; padding: 6px 4px; text-align: center; }
  .scph-l { display: block; font-size: 9.5px; font-weight: 700; color: var(--ink-300); text-transform: uppercase; }
  .scph-v { display: block; font-size: 13px; font-weight: 800; color: #4e463a; }
  .scph-empty .scph-v { color: var(--ink-300); }
  .scpv { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11.5px; color: var(--ink-450); font-weight: 600; }
  .scpv b { color: var(--ink-900); } .scpv em { font-style: normal; color: var(--ink-300); font-size: 10.5px; }
  .sb-ask { display: inline-block; margin-top: 11px; font-size: 12px; font-weight: 800; color: var(--green-700); }

  /* Perspectives */
  .pv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 4px; }
  .pv-card { background: var(--surface-100); border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .pv-skill { font-size: 13px; font-weight: 700; color: #4e463a; }
  .pv-nums { display: flex; gap: 12px; }
  .pv-num { display: flex; flex-direction: column; align-items: center; line-height: 1.25; }
  .pv-num i { font-style: normal; font-size: 13px; } .pv-num b { font-size: 13px; font-weight: 800; color: var(--ink-900); } .pv-num em { font-style: normal; font-size: 9.5px; font-weight: 700; color: var(--ink-300); text-transform: uppercase; }
  .wcl-list { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
  .wcl-item { background: var(--surface-100); border-radius: 14px; padding: 14px 16px; }
  .wcl-skill { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 14.5px; color: var(--ink-900); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .wcl-gap { font-size: 10.5px; font-weight: 800; color: var(--ink-450); background: #fff; border-radius: 7px; padding: 2px 8px; }
  .wcl-text { font-size: 13.5px; line-height: 1.5; color: var(--ink-450); margin: 6px 0 12px; }

  /* Compare my sections */
  .cmp2-table { display: flex; flex-direction: column; }
  .cmp2-row { display: grid; grid-template-columns: 150px 1fr; gap: 14px; align-items: center; padding: 9px 0; border-top: 1px solid var(--line-200); }
  .cmp2-head { border-top: none; padding-bottom: 4px; }
  .cmp2-skill { font-size: 12.5px; font-weight: 700; color: #4e463a; }
  .cmp2-cells { display: grid; gap: 12px; }
  .cmp2-secname { font-size: 11.5px; font-weight: 800; color: var(--ink-450); text-align: center; }
  .cmp2-cell { display: flex; align-items: center; gap: 8px; }
  .cmp2-mini { flex: 1; height: 12px; background: var(--surface-100); border-radius: 6px; overflow: hidden; }
  .cmp2-mini > div { height: 100%; border-radius: 6px; }
  .cmp2-cell span { font-size: 11.5px; font-weight: 800; color: var(--ink-450); width: 34px; text-align: right; }

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

  /* ================= My Garden — landing (state-driven doorway) ================= */
  .mg-wrap { max-width: 860px; display: flex; flex-direction: column; gap: 18px; }
  /* Slot 1 — greeting */
  .mg-greet { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .mg-hello { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: clamp(24px, 3.2vw, 32px); color: var(--green-700); margin: 0; }
  .mg-season { margin: 5px 0 0; font-size: 14.5px; color: var(--ink-450); }
  .mg-season b { color: var(--ink-900); }

  /* Slot 2 — garden scene (composed from existing plant art; presentational) */
  .mg-scene { position: relative; overflow: hidden; border-radius: var(--radius-card); border: 1px solid var(--line-200);
    background: linear-gradient(180deg, #E6F4F8 0%, #EAF5EC 52%, #F1FFEC 100%);
    height: clamp(200px, 20vh, 300px); box-shadow: inset 0 -30px 50px -30px rgba(78,140,66,.18); }
  .mg-sun { position: absolute; top: -46px; right: -46px; width: 150px; height: 150px; border-radius: 50%;
    background: radial-gradient(circle at 50% 50%, #FCE39A 0%, #FCD661 40%, #FBCB3E 60%, rgba(252,203,62,0) 70%); pointer-events: none; }
  .mg-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 26%;
    background: linear-gradient(180deg, rgba(155,222,29,.18), rgba(86,192,43,.28)); border-radius: 0 0 var(--radius-card) var(--radius-card); }
  .mg-plants { position: absolute; left: 0; right: 0; bottom: 8%; display: flex; align-items: flex-end; justify-content: center; gap: clamp(2px, 1.6vw, 14px); padding: 0 14px; }
  .mg-plant { display: inline-block; line-height: 0; }
  .mg-scene-seedling { background: linear-gradient(180deg, #EAF3F6 0%, #EEF6EC 60%, #F4FBEE 100%); }
  .mg-scene-bloom { background: linear-gradient(180deg, #FDEFF4 0%, #EAF5EC 50%, #F1FFEC 100%); box-shadow: inset 0 -30px 50px -30px rgba(224,102,176,.22); }

  /* Slot 3 — caption · Slot 4 — celebration */
  .mg-caption { margin: 0; font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 16px; color: var(--ink-700); text-align: center; }
  .mg-celebrate { align-self: center; background: var(--wash-pink); color: #b0546b; font-weight: 800; font-size: 14.5px; padding: 10px 18px; border-radius: var(--radius-pill); }

  /* Slot 5 — band mix (colour + glyph + word: distinguishable without colour) */
  .mg-bandmix { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px 22px; padding: 14px 18px; background: var(--surface-100); border: 1px solid var(--line-200); border-radius: 16px; }
  .mg-band { display: inline-flex; align-items: baseline; gap: 7px; }
  .mg-band-ic { font-size: 15px; line-height: 1; }
  .mg-band-n { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 20px; color: var(--ink-900); }
  .mg-band-lb { font-size: 13px; font-weight: 700; color: var(--ink-450); }
  .mg-band-note { flex-basis: 100%; text-align: center; font-size: 12px; color: var(--ink-300); font-weight: 700; }
  .mg-bandmix-empty { justify-content: center; font-weight: 700; color: var(--ink-450); font-size: 14.5px; }

  /* Slot 6 — hero (context-aware) */
  .mg-hero { border-radius: var(--radius-card); padding: 22px 24px; }
  .mg-hero-window { background: var(--wash-green); border: 1.5px solid #CDE9C0; }
  .mg-hero-ask { background: #fff; border: 1.5px solid var(--line-200); box-shadow: 0 10px 30px rgba(40,70,40,.06); }
  .mg-eyebrow { display: inline-flex; background: rgba(255,255,255,.7); color: var(--green-700); font-weight: 800; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; padding: 5px 11px; border-radius: var(--radius-pill); margin-bottom: 12px; }
  .mg-hero-ask .mg-eyebrow { background: var(--wash-green); }
  .mg-hero-t { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: clamp(20px, 2.6vw, 26px); color: var(--ink-900); margin: 0; }
  .mg-hero-b { margin: 8px 0 0; font-size: 14.5px; color: var(--ink-600); line-height: 1.5; }
  .mg-hero-askhead { display: flex; align-items: center; gap: 10px; }
  .mg-hero-askic { width: 34px; height: 34px; border-radius: 50%; background: var(--wash-green); display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .mg-prog { height: 9px; background: rgba(52,140,17,.14); border-radius: 5px; overflow: hidden; margin: 16px 0 8px; }
  .mg-prog > span { display: block; height: 100%; background: var(--green-500); border-radius: 5px; transition: width .3s var(--ease); }
  .mg-prog-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--ink-600); font-weight: 700; }
  .mg-prog-row b { color: var(--green-700); }
  .mg-deadline { color: var(--ink-300); }
  .mg-hero-cta { margin-top: 16px; width: 100%; padding: 15px; font-size: 16px; }
  .mg-starters { display: flex; flex-direction: column; gap: 9px; margin-top: 16px; }
  .mg-starter { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; text-align: left;
    border: 1.5px solid var(--line-200); background: var(--surface-100); border-radius: 14px; padding: 14px 16px; cursor: pointer;
    font-family: 'Montserrat',sans-serif; font-weight: 700; font-size: 14.5px; color: var(--ink-700); transition: border-color .15s, background .15s; }
  .mg-starter:hover { border-color: var(--green-500); background: var(--wash-green); }
  .mg-starter-ar { color: var(--green-600); font-weight: 800; }

  /* Slot 7 — this week's idea */
  .mg-idea { background: var(--wash-cyan); border: 1.5px solid #C4ECF6; border-radius: var(--radius-card); padding: 20px 22px; }
  .mg-idea-tag { display: inline-flex; background: #fff; color: var(--cyan-700); font-weight: 800; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; padding: 5px 11px; border-radius: var(--radius-pill); }
  .mg-idea-t { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 18px; color: var(--ink-900); margin: 12px 0 0; }
  .mg-idea-d { margin: 7px 0 0; font-size: 14px; color: var(--ink-600); line-height: 1.55; }
  .mg-idea-ask { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; background: #fff; border: 1.5px solid #C4ECF6; color: var(--cyan-700);
    font-family: 'Montserrat',sans-serif; font-weight: 700; font-size: 13.5px; padding: 10px 16px; border-radius: var(--radius-pill); cursor: pointer; transition: border-color .15s; }
  .mg-idea-ask:hover { border-color: var(--cyan-500); }

  /* Slot 8 — who could use you (tend cards) */
  .mg-tend-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  .mg-tend-h { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 18px; color: var(--ink-900); margin: 0; }
  .mg-tend-note { font-size: 12.5px; color: var(--ink-300); font-weight: 700; }
  .mg-tend-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .mg-tend-card { border: 1px solid var(--line-200); border-radius: 18px; background: #fff; padding: 15px; display: flex; flex-direction: column; gap: 9px; }
  .mg-tend-top { display: flex; align-items: center; gap: 10px; }
  .mg-tend-pl { line-height: 0; flex: none; }
  .mg-tend-nm { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: 16px; color: var(--ink-900); }
  .mg-tend-reason { margin: 0; font-size: 13px; color: var(--ink-600); line-height: 1.45; flex: 1; }
  .mg-tend-empty { background: var(--surface-100); border: 1px dashed var(--line-200); border-radius: 16px; padding: 20px; font-size: 13.5px; color: var(--ink-450); font-weight: 600; line-height: 1.5; }

  /* First-run empty state (no students yet) */
  .empty-class { text-align: center; padding: clamp(32px, 8vh, 72px) 20px; display: flex; flex-direction: column; align-items: center; }
  .empty-plant { margin-bottom: 10px; }
  .empty-t { font-family: 'Quicksand',sans-serif; font-weight: 700; font-size: clamp(20px, 3vw, 26px); color: var(--ink-900); margin: 0 0 10px; }
  .empty-b { color: var(--ink-450); font-size: 15px; line-height: 1.55; max-width: 420px; margin: 0 0 24px; }
  .empty-cta { padding: 13px 26px; }
  .btn-ask-a { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: none; cursor: pointer;
    background: var(--green-500); color: #fff; font-family: 'Montserrat',sans-serif; font-weight: 700; font-size: 13px; padding: 10px 12px; border-radius: var(--radius-pill); transition: background .15s; }
  .btn-ask-a:hover { background: var(--green-600); }

  /* Slot 9 — quiet doorways */
  .mg-doors { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 2px; }
  .mg-door { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line-200); border-radius: var(--radius-pill);
    padding: 10px 16px; cursor: pointer; font-family: 'Montserrat',sans-serif; font-weight: 700; font-size: 13px; color: var(--ink-600); transition: border-color .15s, color .15s; }
  .mg-door:hover { border-color: var(--green-500); color: var(--green-700); }

  /* Dev-only landing-state switch (scaffold; not teacher-facing) */
  .mg-gui { position: fixed; right: 16px; bottom: 16px; z-index: 45; background: rgba(20,28,20,.9); color: #fff;
    border-radius: 14px; padding: 10px 12px; box-shadow: 0 10px 30px rgba(0,0,0,.28); backdrop-filter: blur(4px); font-family: 'Montserrat',sans-serif; }
  .mg-gui-h { font-size: 10.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: #B9E8A6; margin-bottom: 7px; }
  .mg-gui-star { color: var(--yellow-500); }
  .mg-gui-opts { display: flex; gap: 5px; }
  .mg-gui-opt { border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: #E6EFE2; cursor: pointer;
    font-family: 'Montserrat',sans-serif; font-weight: 700; font-size: 11.5px; padding: 6px 10px; border-radius: 9px; transition: background .15s, border-color .15s; }
  .mg-gui-opt:hover { background: rgba(255,255,255,.14); }
  .mg-gui-opt.on { background: var(--green-500); border-color: var(--green-600); color: #fff; }

  @media (max-width: 640px) {
    .mg-tend-grid { grid-template-columns: 1fr; }
    .mg-gui { right: 10px; bottom: calc(78px + env(safe-area-inset-bottom)); left: 10px; }
    .mg-gui-opts { flex-wrap: wrap; }
    .mg-gui-opt { flex: 1; }
  }

  @media (max-width: 1023px) { .dash-main { padding: 22px 26px; } }
  @media (max-width: 640px) {
    .dash-main { padding: 16px 16px 90px; }
    .dash-header { padding: 12px 16px 6px; }
    .dash-h1 { font-size: 24px; }
    .two-col { grid-template-columns: 1fr; }
    .ask-panel { top: 12%; border-radius: 24px 24px 0 0; }
    /* Insights: reflow every multi-column grid to a single readable column. */
    .bs-grid { grid-template-columns: 1fr; }
    .bs-box.bs-wide { grid-column: auto; }
    .bs-skills.two-col { columns: 1; }
    .sb-grid, .pv-grid { grid-template-columns: 1fr; }
    .pot-skill, .cmp2-row { grid-template-columns: 96px 1fr; gap: 10px; }
    .pv-card { flex-direction: column; align-items: flex-start; gap: 8px; }
  }`;

  window.TilliDashboard = { mount };
})();
