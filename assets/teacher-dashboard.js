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

  // Shared colour maps (tilli-api.js) — levels, perspectives, status, petals, growth series.
  const TP = window.TilliPalette;

  // ---------------- ART palette ----------------
  // Every exact-hex illustration colour in this file lives here (plant / bloom /
  // gardener / bed-bush / vine SVG art, the add-flow pot, and the garden scene
  // gradients used by the CSS template below). UI chrome uses tilli.css tokens;
  // the only UI reader is STATE_DOT.blossoming, which mirrors the bloom petal.
  const ART = {
    white: '#FFFFFF', face: '#3A3A3A', blush: '#EFA9B8', petalPale: '#F6D5D9', pollen: '#F2CE7B',
    budLeaf: '#4E8C42', bloomShadow: 'rgba(70,100,60,.28)',
    stem: '#6E9863', leafLight: '#9DBE8D', leafMid: '#7FAE72', leafPale: '#B7CFA9', leafSeed: '#C9DBBD', glowGreen: '#DCE8D4',
    water: '#D9E9F2', can: '#A7CDE2', sunPale: '#F9E6B3',
    pot: '#E8C4A8', potBand: '#DBB08C', potRim: '#E3B896', soil: '#B08968',
    // garden-bed bushes + the bloom colour each bed gets (was PALETTE)
    bushBack: '#A7CE68', bushBack2: '#93C155', bushFront: '#7FB246', bushFront2: '#6DA03B', bushBase: '#74A83E', sprig: '#5F9134',
    bedBlooms: ['#FFFFFF', '#F0A84A', '#EFA9B8', '#5AA9E6', '#A99BD6', '#E4756B'],
    keyBloom: '#5AA9E6',
    // gardener
    hairM: '#4A3B2E', hairF: '#5B4636', shadow: '#000', trousers: '#6D5B4B', boots: '#4A3F35', skin: '#F6DFC8',
    green: '#56C02B', shirtSeam: '#49A524', yellow: '#FCC30B', brim: '#E8B96F', hatBand: '#E8912D', cyan: '#26BDE2',
    // sprout (sidebar logo + journey marker), journey vine, lock
    sproutStem: '#348C11', sproutLime: '#9BDE1D', vineStem: '#8FB37E', vineLeaf: '#A9C79A', lock: '#B0A794',
    // add-student pot
    potSprout: '#8FB57E', potSeedShade: 'rgba(0,0,0,.06)', clayRim: '#C77E4E', clayBody: '#B96E42',
    // garden scene backdrops (CSS template)
    bedGround: 'linear-gradient(180deg,#EAF1E4 0%,#DCE8D4 62%,#D6E2CD 100%)',
    sky: 'linear-gradient(180deg, #E6F4F8 0%, #EAF5EC 52%, #F1FFEC 100%)',
    skySeedling: 'linear-gradient(180deg, #EAF3F6 0%, #EEF6EC 60%, #F4FBEE 100%)',
    skyBloom: 'linear-gradient(180deg, #FDEFF4 0%, #EAF5EC 50%, #F1FFEC 100%)',
    skyGlow: 'rgba(78,140,66,.18)', skyBloomGlow: 'rgba(224,102,176,.22)',
    ground: 'linear-gradient(180deg, rgba(155,222,29,.18), rgba(86,192,43,.28))',
    highlight: 'linear-gradient(160deg,#FDEEF0,#F6D5D9)',
  };

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
      inner = `<g><g fill="currentColor">${petals}</g><circle cx="50" cy="50" r="15" fill="${ART.white}" opacity="0.55"></circle><circle cx="50" cy="50" r="11" fill="${ART.pollen}"></circle></g>`;
    } else if (state === 'learner') {
      const petals = [0, 72, 144, 216, 288].map((a) => `<g transform="rotate(${a} 50 50)"><ellipse cx="50" cy="31" rx="13" ry="18"></ellipse></g>`).join('');
      inner = `<g><g fill="currentColor">${petals}</g><circle cx="50" cy="50" r="9.5" fill="${ART.white}" opacity="0.5"></circle><circle cx="50" cy="50" r="6.5" fill="${ART.pollen}"></circle></g>`;
    } else {
      inner = `<g><path d="M50 78 C38 74 36 62 44 56" stroke="${ART.budLeaf}" stroke-width="7" stroke-linecap="round" fill="none"></path><ellipse cx="50" cy="46" rx="19" ry="24" fill="currentColor"></ellipse><path d="M31 52 C36 62 44 68 52 69" stroke="${ART.budLeaf}" stroke-width="8" stroke-linecap="round" fill="none"></path></g>`;
    }
    return `<span style="display:inline-block;line-height:0;color:${color || ART.white};transform:rotate(${rot}deg);filter:drop-shadow(0 1px 1px ${ART.bloomShadow})">
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">${inner}</svg></span>`;
  }

  // Plant: the potted plant used in the section garden / roster / student header.
  function plantSVG(state, size, face, grew) {
    size = Number(size) || 96;
    face = face !== false && size >= 52;
    grew = (grew === true) && (state === 'blossoming' || state === 'growing');
    const h = Math.round(size * 1.25);
    const faceBloss = face ? `<g><circle cx="53" cy="52" r="2.6" fill="${ART.face}"></circle><circle cx="67" cy="52" r="2.6" fill="${ART.face}"></circle><path d="M54 60 Q60 65 66 60" stroke="${ART.face}" stroke-width="2.4" fill="none" stroke-linecap="round"></path><circle cx="48" cy="58" r="2.4" fill="${ART.blush}" opacity="0.6"></circle><circle cx="72" cy="58" r="2.4" fill="${ART.blush}" opacity="0.6"></circle></g>` : '';
    const faceGrow = face ? `<g><circle cx="52" cy="62" r="2.7" fill="${ART.face}"></circle><circle cx="68" cy="62" r="2.7" fill="${ART.face}"></circle><path d="M53 70 Q60 75 67 70" stroke="${ART.face}" stroke-width="2.4" fill="none" stroke-linecap="round"></path><circle cx="47" cy="68" r="2.3" fill="${ART.blush}" opacity="0.5"></circle><circle cx="73" cy="68" r="2.3" fill="${ART.blush}" opacity="0.5"></circle></g>` : '';
    const faceTend = face ? `<g><path d="M50 82 Q53 85 56 82" stroke="${ART.face}" stroke-width="2.2" fill="none" stroke-linecap="round"></path><path d="M64 82 Q67 85 70 82" stroke="${ART.face}" stroke-width="2.2" fill="none" stroke-linecap="round"></path><path d="M55 89 Q60 92 65 89" stroke="${ART.face}" stroke-width="2.2" fill="none" stroke-linecap="round"></path></g>` : '';
    const faceWait = face ? `<g><path d="M56 96 Q57.5 98 59 96" stroke="${ART.face}" stroke-width="1.6" fill="none" stroke-linecap="round"></path><path d="M61 96 Q62.5 98 64 96" stroke="${ART.face}" stroke-width="1.6" fill="none" stroke-linecap="round"></path></g>` : '';
    let body = '';
    if (state === 'blossoming') {
      body = `<g><ellipse cx="60" cy="70" rx="52" ry="52" fill="url(#glowP)"></ellipse><path d="M60 112 Q57 86 60 58" stroke="${ART.stem}" stroke-width="5.5" fill="none" stroke-linecap="round"></path><path d="M60 92 Q40 86 33 70 Q52 68 60 84 Z" fill="${ART.leafLight}"></path><path d="M60 100 Q82 96 90 80 Q70 76 60 92 Z" fill="${ART.leafMid}"></path><ellipse cx="60" cy="52" rx="23" ry="24" fill="${ART.leafLight}"></ellipse><ellipse cx="60" cy="52" rx="23" ry="24" fill="${ART.glowGreen}" opacity="0.25"></ellipse><g><circle cx="60" cy="30" r="9" fill="${ART.petalPale}"></circle><circle cx="74" cy="40" r="9" fill="${ART.petalPale}"></circle><circle cx="46" cy="40" r="9" fill="${ART.petalPale}"></circle><circle cx="69" cy="55" r="8.5" fill="${ART.blush}" opacity="0.85"></circle><circle cx="51" cy="55" r="8.5" fill="${ART.blush}" opacity="0.85"></circle><circle cx="60" cy="44" r="7.5" fill="${ART.pollen}"></circle></g>${faceBloss}</g>`;
    } else if (state === 'growing') {
      body = `<g><ellipse cx="60" cy="80" rx="46" ry="46" fill="url(#glowG)"></ellipse><path d="M60 112 Q58 92 60 68" stroke="${ART.stem}" stroke-width="5.5" fill="none" stroke-linecap="round"></path><path d="M60 98 Q38 92 30 74 Q51 72 60 90 Z" fill="${ART.leafLight}"></path><path d="M60 104 Q84 99 92 82 Q71 78 60 96 Z" fill="${ART.leafMid}"></path><ellipse cx="60" cy="62" rx="24" ry="25" fill="${ART.leafLight}"></ellipse><path d="M60 40 Q68 48 60 62 Q52 48 60 40 Z" fill="${ART.leafMid}"></path>${faceGrow}</g>`;
    } else if (state === 'tending') {
      body = `<g><path d="M60 112 Q59 100 60 88" stroke="${ART.leafLight}" stroke-width="5" fill="none" stroke-linecap="round"></path><path d="M60 100 Q44 96 38 84 Q54 82 60 96 Z" fill="${ART.leafPale}"></path><ellipse cx="60" cy="82" rx="18" ry="19" fill="${ART.leafPale}"></ellipse><path d="M60 66 Q66 72 60 82 Q54 72 60 66 Z" fill="${ART.leafLight}"></path>${faceTend}<g transform="translate(84 40)"><circle cx="6" cy="8" r="15" fill="${ART.water}"></circle><path d="M-1 4 h10 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 -3 -3 v-5 a3 3 0 0 1 3 -3 Z" fill="${ART.can}"></path><path d="M9 5 l7 -3 v3 Z" fill="${ART.can}"></path><path d="M-3 7 q-5 -2 -6 3" stroke="${ART.can}" stroke-width="2" fill="none" stroke-linecap="round"></path><path d="M-8 11 l-1 4 M-6 12 l0 4 M-4 12 l1 4" stroke="${ART.can}" stroke-width="1.6" stroke-linecap="round"></path></g></g>`;
    } else {
      body = `<g><circle cx="90" cy="34" r="10" fill="${ART.sunPale}"></circle><path d="M90 18 v-6 M90 56 v6 M74 34 h-6 M106 34 h6 M79 23 l-4 -4 M101 45 l4 4 M101 23 l4 -4 M79 45 l-4 4" stroke="${ART.pollen}" stroke-width="2" stroke-linecap="round"></path><path d="M60 112 Q60 104 60 96" stroke="${ART.leafLight}" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="1 5"></path><path d="M60 100 Q50 98 46 90 Q56 89 60 98 Z" fill="${ART.leafSeed}"></path><path d="M60 100 Q70 98 74 90 Q64 89 60 98 Z" fill="${ART.leafSeed}"></path><ellipse cx="60" cy="97" rx="6" ry="6.5" fill="${ART.leafPale}"></ellipse>${faceWait}</g>`;
    }
    const pot = `<g><path d="M41 111 L79 111 L74 139 Q73 145 67 145 L53 145 Q47 145 46 139 Z" fill="${ART.pot}"></path><path d="M41 111 L79 111 L77.5 119 L42.5 119 Z" fill="${ART.potBand}"></path><rect x="37" y="105" width="46" height="11" rx="5.5" fill="${ART.potRim}"></rect><ellipse cx="60" cy="110.5" rx="20" ry="4.2" fill="${ART.soil}"></ellipse></g>`;
    const sparkle = grew ? `<g fill="${ART.pollen}"><path d="M26 44 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z"></path><path d="M96 66 l1.2 3.4 3.4 1.2 -3.4 1.2 -1.2 3.4 -1.2 -3.4 -3.4 -1.2 3.4 -1.2 Z" fill="${ART.blush}"></path><circle cx="40" cy="24" r="2.2" fill="${ART.petalPale}"></circle></g>` : '';
    return `<span style="display:inline-block;line-height:0"><svg width="${size}" height="${h}" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
      <defs><radialGradient id="glowG" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${ART.glowGreen}" stop-opacity="0.9"></stop><stop offset="100%" stop-color="${ART.glowGreen}" stop-opacity="0"></stop></radialGradient><radialGradient id="glowP" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${ART.petalPale}" stop-opacity="0.95"></stop><stop offset="100%" stop-color="${ART.petalPale}" stop-opacity="0"></stop></radialGradient></defs>
      ${body}${pot}${sparkle}</svg></span>`;
  }

  // Landing-page flower art (flower-band.js) keyed by the dashboard's plant
  // state, so student surfaces read as the same illustration family as the
  // landing band instead of the potted plant. Falls back to plantSVG if the
  // flower-band script didn't load. `px` = rendered height; `i` just varies the
  // idle sway so a list of them doesn't move in lockstep.
  const FLOWER_KIND = { blossoming: 'flower', growing: 'tulip', tending: 'sprout', waiting: 'sprout' };
  const FLOWER_PETALS = (window.TilliFlowerPetals && window.TilliFlowerPetals.length)
    ? window.TilliFlowerPetals : TP.PETALS;
  function flowerArt(state, px, i) {
    if (!window.flowerMarkup) return plantSVG(state, Math.round(px * 0.9), false, false);
    const kind = FLOWER_KIND[state] || 'flower';
    const petal = kind === 'sprout' ? null : FLOWER_PETALS[(i || 0) % FLOWER_PETALS.length];
    return window.flowerMarkup(kind, petal, px, i || 0);
  }

  // ---------------- constants ----------------
  const TO_BLOOM = { blossoming: 'expert', growing: 'learner', tending: 'beginner', waiting: 'beginner' };
  // Plant-state dot colours (completion matrices, list, band mix). Blossoming keeps
  // the bloom-petal art colour; the rest are UI tokens (tending = Beginner level).
  const STATE_DOT = { blossoming: ART.blush, growing: 'var(--green-500)', tending: 'var(--lvl-1-soft)', waiting: 'var(--ink-300)' };
  const SEARCH_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  // Clock-with-arrow (change history) — the student header's small History button.
  const HIST_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/></svg>';

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
    ask: '<path d="M4 6.5C4 5 5 4 6.5 4h11C19 4 20 5 20 6.5v7c0 1.5-1 2.5-2.5 2.5H10l-4 3.5V16H6.5C5 16 4 15 4 13.5v-7Z" fill="currentColor"/><circle cx="9" cy="10" r="1.2" style="fill:var(--white)"/><circle cx="12" cy="10" r="1.2" style="fill:var(--white)"/><circle cx="15" cy="10" r="1.2" style="fill:var(--white)"/>',
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
      heroBlurb: 'Set the starting point for all {N} {kids} — the garden they grow from.',
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
  let floatBound = false;   // Ask-chat ↔ floating-bubble listeners bound (once)
  // Screen-transition gating: only a genuine destination change (not a modal
  // open, sub-tab, or in-place edit) plays the fade+zoom. See render().
  let lastScreenKey = null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Number-aware noun. countNoun(1,'child','children') → "1 child"; nounFor is just the word.
  function nounFor(n, singular, plural) { return Number(n) === 1 ? singular : plural; }
  function countNoun(n, singular, plural) { return n + ' ' + nounFor(n, singular, plural); }

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
  function openStudent(sid) { S.stuEdit = null; S.classModal = null; S.sectionId = sectionIdOfStudent(sid); S.studentId = sid; S.studentTab = 'overview'; S.nav = 'students'; render(); }
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
      .map(([label, count]) => `<span class="ui-badge lvl-${TP.levelOf(label).n}">${count} ${label}</span>`).join('');
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
  // Completion status: colours (bg/fg/dot var() strings + the .ui-badge modifier
  // in `cls`) come from TilliPalette.STATUS; the labels are this dashboard's wording.
  const STATUS_LABEL = { done: 'Complete', in_progress: 'In progress', pending: 'Not started' };
  const STATUS_META = {};
  Object.keys(STATUS_LABEL).forEach((k) => { STATUS_META[k] = Object.assign({ label: STATUS_LABEL[k] }, TP.STATUS[k]); });

  // ---------------- data: real class + preview overlay ----------------
  // S.baseData = the teacher's real class. S.data = what every page renders:
  // the real class in 'baseline', or the dev preview overlay (dashboard-data.js
  // previewData) for the other states — with the teacher's saved observations
  // applied on top either way. Call rebuildData() after either one changes.
  const WIN_OF_STATE = { baseline: 'baseline', midline: 'mid', endline: 'post' };
  const PHASE_OF_WIN = { baseline: 'Baseline', mid: 'Midline', post: 'Endline' };
  function activeWindowKey() { return WIN_OF_STATE[S.windowState] || null; }
  function rebuildData() {
    const D = window.TilliDashData;
    const d = (D && S.windowState !== 'baseline') ? D.previewData(S.baseData, S.windowState) : S.baseData;
    S.data = applyObservations(d);
  }
  function logOf(st, wk) { return (st.assessLog || []).find((w) => w.key === wk); }
  function teacherDone(st, wk) {
    const w = logOf(st, wk); const p = w && w.persp.find((x) => x.key === 'teacher');
    return !!(p && p.done);
  }
  function markTeacherDone(st, wk) {
    const D = window.TilliDashData; const w = logOf(st, wk);
    if (!D || !w) return;
    const i = w.persp.findIndex((x) => x.key === 'teacher'); if (i < 0) return;
    w.persp[i] = D.perspEntry(w.persp[i], w.persp[i].totalParts || 1);
    D.finishWindow(w); D.finishLog(st);
    if (wk === 'baseline') st.assess = 'done';
  }
  function applyObservations(d) {
    const obs = (S.teacher && S.teacher.observations) || {};
    Object.keys(obs).forEach((wk) => d.sections.forEach((sec) => sec.students.forEach((st) => {
      if (obs[wk] && obs[wk][st.adm || st.id] && !teacherDone(st, wk)) markTeacherDone(st, wk);
    })));
    return d;
  }

  // ---------------- mount ----------------
  function mount(mountEl, ctx) {
    root = mountEl;
    S = {
      data: ctx.data, baseData: ctx.data, teacher: ctx.teacher || {},
      nav: (ctx.teacher && ctx.teacher.startNav) || 'garden', sectionId: (ctx.data.sections[0] || {}).id,
      mirrorIdx: null,   // Teaching Mirror timeline: selected snapshot (null = latest)
      gardenLevel: 'landing', classModal: null, studentId: null,
      // A first-time class (built from onboarding) opens on Baseline — no prior
      // data to show; the demo dataset opens mid-year ('between'). Dev GUI switch overrides.
      windowState: ctx.data.fresh ? 'baseline' : 'between',
      rosterSearch: '', rosterSort: 'name', studentTab: 'overview',
      assessTab: 'todo', enter: { studentId: null, q: 0, ratings: {}, done: false },
      logsView: 'class', logsWin: null,   // By class: picked window key | 'all' | null (= default window)
      logsStudentId: null, logStudentSearch: '', logListSearch: '', logListFilter: 'all',
      insightsView: 'myclass', skillGroup: 'sel', compareGrade: null,
      ovBand: null, ovSkill: null,
      growthFilter: 'overview', growthTable: false,   // Insights → Growth over time line chart   // Insights → Class Skill Overview: box filter + expanded skill
      add: { active: false, step: 'count', sectionId: null, count: '', total: 0, done: 0, first: '', last: '', adm: '', results: [] },
      histOpen: false, histKind: '',   // Students → class change-history modal + its kind filter
      vw: window.innerWidth,
      select: { on: false, ids: {}, busy: '', err: '' },     // Students → multi-select for parent PDFs
      profileEdit: false, profileDraft: null,
      // Ask Tilli: one live conversation shared by the side panel (floating
      // bubble / in-card prompts) and the full screen (nav). `chats` = history.
      ask: { open: false, context: '', prompt: '', thread: [], thinking: false, chatId: null, scope: 'all', histOpen: false,
        histCollapsed: !!loadAskHist().collapsed, histW: loadAskHist().w || null },   // full-screen history column: hidden? / dragged width
      chats: [], askReturn: 'garden',
      gardener: (ctx.teacher && ctx.teacher.demo && ctx.teacher.demo.gender === 'Male') ? 'm' : 'f',
    };
    rebuildData();
    S.chats = loadChats() || seedChats();
    // Every change this teacher makes is logged under their name (change history).
    if (window.TilliAPI && window.TilliAPI.setHistoryActor && S.teacher.email) {
      window.TilliAPI.setHistoryActor({ email: S.teacher.email, name: (S.teacher.demo && S.teacher.demo.name) || '', role: 'teacher' });
    }
    injectCSS();
    // Floating Ask Tilli bubble joins the Need-help bubble teacher.html mounted.
    // The Ask bubble toggles the chat window (it shows × while open).
    if (window.TilliFloat) TilliFloat.mount({ ask: () => { if (S.ask.open) { S.ask.open = false; render(); } else openAsk('', ''); } });
    if (!floatBound) {   // mount can run more than once; bind these once
      floatBound = true;
      // The chat is pinned to the bubble — follow it while it's dragged / snapped.
      window.addEventListener('tillifloat:move', (e) => { if (S && S.ask.open) positionAskPop(e.detail && e.detail.dragging); });
      window.addEventListener('resize', () => { if (S && S.ask.open) positionAskPop(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S && S.ask.open && S.nav !== 'ask') { S.ask.open = false; render(); } });
    }
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
  // Which destination we're on, for transition gating. Deliberately excludes
  // modals (classModal/ask) and sub-tabs so those swap instantly — only moving
  // between the five screens (or a student) plays the animation.
  function screenKey() { return [S.nav, S.gardenLevel, S.sectionId, S.studentId].join('|'); }

  // render() decides whether this repaint is a "screen change" worth animating,
  // then paints. The actual DOM build lives in paintDom(); the View Transitions
  // API cross-fades the old screen into the new one with a subtle zoom (styled
  // in tilli.css). Falls back to a plain paint where the API is unsupported or
  // the user prefers reduced motion. History stays synchronous (outside the
  // transition) so the back button is never out of step with a fast tap.
  function render() {
    syncHistory();
    const key = screenKey();
    const changed = lastScreenKey !== null && key !== lastScreenKey;
    lastScreenKey = key;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (changed && !reduce && document.startViewTransition) document.startViewTransition(paintDom);
    else paintDom();
  }

  function paintDom() {
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
          <span class="dash-logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21V11" stroke="${ART.sproutStem}" stroke-width="2" stroke-linecap="round"/><path d="M12 11C12 7 9 4 5 4c0 4 3 7 7 7Z" fill="${ART.sproutLime}"/><path d="M12 13c0-3 3-6 7-6 0 4-3 6-7 6Z" fill="${ART.green}"/></svg></span>
          ${sideWide ? `<span class="dash-word">Tilli<span style="color:var(--green-500)"> Measures</span></span>` : ''}
        </div>
        <nav class="dash-nav">${navBtns}</nav>
        <button class="dash-profilebtn" data-nav="profile">
          <span class="ui-avatar sm dash-avatar">${esc(initials())}</span>
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
    const showChips = S.nav !== 'profile' && S.nav !== 'ask';
    // "All" appears only when there's more than one grade to combine.
    const allChip = S.data.sections.length > 1
      ? `<button class="ui-filterchip solid${S.sectionId === 'all' ? ' on' : ''}" data-section="all">All</button>` : '';
    const chips = showChips ? `<div class="dash-chips">${allChip}${S.data.sections.map((sec) => {
      const on = sec.id === S.sectionId;
      return `<button class="ui-filterchip solid${on ? ' on' : ''}" data-section="${sec.id}">${esc(sec.name)}</button>`;
    }).join('')}</div>` : '';

    const askHadFocus = !!(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('ask-input'));
    root.innerHTML = `
      <div class="dash">
        ${sidebar}
        <div class="dash-col${S.nav === 'ask' ? ' ask-mode' : ''}">
          ${S.nav === 'ask' ? '' : `<header class="dash-header">${chips}</header>`}
          <main class="dash-main${S.nav === 'ask' ? ' ask-mode' : ''}">${mainView()}</main>
        </div>
        ${bottomNav}
        ${S.ask.open ? askPanel() : ''}
        ${S.classModal ? classModalView() : ''}
        ${S.histOpen ? histModalView() : ''}
        ${addModal()}
        ${stateSwitcherGUI()}
      </div>`;
    // Phone: the bottom nav's raised centre button already is Ask Tilli.
    if (window.TilliFloat) {
      TilliFloat.hideAsk(isPhone || S.nav === 'ask');
      TilliFloat.setAskOpen(S.ask.open && !isPhone && S.nav !== 'ask');
      // #dash-root is position:fixed (its own stacking context), so the stack must
      // live inside it to sit *under* the Ask panel / modals rather than over them.
      TilliFloat.attach(root);
    }
    if (S.ask.open) {
      positionAskPop();
      const ab = root.querySelector('.ask-body'); if (ab) ab.scrollTop = ab.scrollHeight;   // newest message in view
      const ai = root.querySelector('.ask-input');
      if (ai && (S.ask._popIn || askHadFocus)) { ai.focus(); const n = ai.value.length; try { ai.setSelectionRange(n, n); } catch (e) {} }
    }
    S.ask._popIn = false;   // the grow-from-the-bubble animation plays once per open
    wire();
  }

  function hasStudents() { return S.data.sections.some((s) => s.students && s.students.length); }

  // First-time teacher who reached the dashboard with no students yet. One calm
  // screen across every destination (except profile) with a single clear action.
  function emptyClassView() {
    return `<div class="dash-wrap" style="max-width:640px">
      <div class="ui-empty empty-hero">
        <div class="empty-plant">${flowerArt('waiting', 96, 0)}</div>
        <h1 class="ui-empty-t">Your garden is ready — let's plant it 🌱</h1>
        <p class="ui-empty-b">Add the students in your class and they'll appear here as seedlings, ready for their baseline. Nothing grows until you add a name.</p>
        <div class="actions"><button class="btn btn-primary md focus" data-onb-add>Add your students</button></div>
      </div>
    </div>`;
  }

  function mainView() {
    if (S.nav === 'profile') return profilePanel();
    if (S.nav === 'ask') return askScreenView();
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
      <div class="ui-card ui-empty empty-card mt-4">
        <div class="empty-badge">${bloomSVG('learner', 'var(--green-500)', 34, 4)}</div>
        <div class="ui-empty-t">Coming in the next update</div>
        <p class="ui-empty-b">This section is being planted. The garden is ready to explore now.</p>
        <div class="actions"><button class="btn btn-primary md focus" data-nav="garden">Go to My Garden</button></div>
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
    const PETALS = window.TilliFlowerPetals || TP.PETALS;
    const plants = arr.map((st, i) => {
      const scale = st === 'blossoming' ? 1.06 : st === 'growing' ? 0.92 : st === 'tending' ? 0.8 : 0.7;
      const px = Math.round(base * scale * 1.35); // flowers are taller/thinner than the old pots
      const kind = KIND[st] || 'flower';
      const petal = kind === 'sprout' ? null : PETALS[i % PETALS.length];
      const art = window.flowerMarkup ? window.flowerMarkup(kind, petal, px, i) : plantSVG(st, Math.round(base * scale), false, false);
      return `<span class="mg-plant" style="transform:translateY(${offs[i % offs.length]}px)">${art}</span>`;
    }).join('');
    return `<div class="mg-scene mg-scene-${maturity}" aria-hidden="true">
      <span class="sun mg-sun"></span>
      <div class="mg-plants">${plants}</div>
      <div class="mg-ground"></div>
    </div>`;
  }

  // Band-mix strip: distinguishable without colour (each has a glyph + word + count).
  function bandMix(ld, note) {
    const items = [
      ['Blossoming', ld.blossoming, STATE_DOT.blossoming, '✿'],
      ['Growing', ld.growing, STATE_DOT.growing, '❋'],
      ['Ready to tend', ld.tend, STATE_DOT.tending, '◗'],
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
      <div class="ui-eyebrow pill">Do what you came for</div>
      <h2 class="mg-hero-t">${esc(st.heroTitle)}</h2>
      <p class="mg-hero-b">${esc(fill(st.heroBlurb, { N, kids: nounFor(N, 'child', 'children') }))}</p>
      <div class="ui-meter mg-prog"><span style="width:${pct}%"></span></div>
      <div class="mg-prog-row"><span><b>${pg.done}</b> of ${pg.total} ${nounFor(pg.total, 'child', 'children')} done</span><span class="mg-deadline">Window closes ${esc(st.deadline)}</span></div>
      <button class="btn btn-primary block focus mg-hero-cta" data-continue-assess="${esc(pg.next ? pg.next.id : '')}">Continue → next: ${esc(nextName)}</button>
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
      <div class="ui-eyebrow pill">Do what you came for</div>
      <div class="mg-hero-askhead"><span class="mg-hero-askic">${chatIcon('var(--green-700)')}</span><h2 class="mg-hero-t">Ask Tilli</h2></div>
      <p class="mg-hero-b">Your teaching changes every day — even when the scores don't.</p>
      <div class="mg-starters">${starters.map(([lb, pr]) => `<button class="mg-starter focus" data-ask-prompt="${esc(pr)}" data-ask-ctx="${esc(sec.name + ' · quick start')}"><span>${esc(lb)}</span><span class="mg-starter-ar" aria-hidden="true">→</span></button>`).join('')}</div>
    </section>`;
  }

  function weekIdeaSlot() {
    const wi = weekIdea();
    return `<section class="mg-idea">
      <div class="ui-eyebrow pill">This week's idea</div>
      <h3 class="mg-idea-t">${esc(wi.t)}</h3>
      <p class="mg-idea-d">${esc(wi.d)}</p>
      <button class="mg-idea-ask focus" data-ask-prompt="${esc(wi.ask)}" data-ask-ctx="${esc("This week's idea · " + wi.t)}">${chatIcon('var(--green-700)')} Ask Tilli for more</button>
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
        <button class="btn-ask-a focus" data-ask-prompt="${esc('How can I gently support ' + st.name + ', a ' + st.grade + ' child working on ' + st.lowestSkill.name + '? Give me one small thing to try this week.')}" data-ask-ctx="${esc(st.first + ' · ' + st.lowestSkill.name)}">${chatIcon('var(--white)')} Ask Tilli for an idea</button>
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
      bandBlock = `<div class="mg-bandmix mg-bandmix-empty">${countNoun(N, 'child', 'children')}, ready to begin their year.</div>`;
    } else {
      const note = state === 'between' ? `Last measured at baseline · ${countNoun(N, 'child', 'children')}`
        : state === 'midline' ? `Your ${sec.name} · ${countNoun(N, 'child', 'children')}`
        : `The year's story · ${countNoun(N, 'child', 'children')}`;
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
    </div>`;
  }

  // Dev-only state switch, shown on EVERY page (rendered from paintDom). Drives
  // S.windowState → the landing variant AND the preview data every other page
  // reads (rebuildData). Not part of the teacher UI — a scaffold for review.
  function stateSwitcherGUI() {
    const opts = [
      ['baseline', 'Baseline', 'State A — start of year, Baseline window open. Seedlings, no prior data; band mix hidden; tend list empty.'],
      ['between', 'Between', 'State B — most of the year, no window open. Ask Tilli is the hero; garden is honestly "resting".'],
      ['midline', 'Midline', 'State C — mid-year window open. Garden has grown; celebration line appears.'],
      ['endline', 'Endline', 'State D — year end, Endline window open. Full bloom; biggest celebration.'],
    ];
    return `<div class="mg-gui" role="group" aria-label="Landing state (dev only)">
      <div class="mg-gui-h" title="Dev-only switch, on every page. Previews the whole dashboard in each assessment state (controls S.windowState → landing variant + preview data overlay). Not shown to teachers — bake or remove before ship.">Preview&nbsp;state <span class="mg-gui-star" title="Now on every page">*</span></div>
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
      const color = ART.bedBlooms[si % ART.bedBlooms.length];
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
      const lobesBack = [...mk(0.92, bushH * 0.25, ART.bushBack, 1), ...mk(0.66, bushH * 0.28, ART.bushBack2, 40)];
      const lobesFront = [...mk(0.38, bushH * 0.3, ART.bushFront, 80), ...mk(0.14, bushH * 0.26, ART.bushFront2, 120)];
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
      const sprigs = bd.sprigs.map((d) => `<path d="${d}" stroke="${ART.sprig}" stroke-width="2" stroke-linecap="round" opacity="0.45" fill="none"></path>`).join('');
      const plants = bd.plants.map((pl) => `
        <div class="bed-plant" style="left:${pl.left}px;bottom:${pl.bottom}px;z-index:${pl.z}">
          ${bloomSVG(pl.state, pl.color, pl.size, pl.seed)}
          <div class="ui-tip bed-tip">
            <div class="nm">${esc(pl.name)}</div>
            <div class="ui-eyebrow bl">${esc(pl.bandLabel)}</div>
            <div class="rw"><b class="td-good">Good at</b> <span>${esc(pl.goodSkill)}</span></div>
            <div class="rw"><b class="td-help">Needs help</b> <span>${esc(pl.helpSkill)}</span></div>
          </div>
        </div>`).join('');
      return `<button class="bed-wrap" data-open-class="${bd.id}">
        <div class="bed-stage" style="width:${bd.bedW}px;height:${bd.svgH}px">
          <svg width="${bd.bedW}" height="${bd.svgH}" viewBox="${bd.viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;left:0;bottom:0;z-index:1;overflow:visible;clip-path:inset(-400px -400px 0 -400px)">
            ${circles(bd.lobesBack)}
            <rect x="${bd.baseX}" y="${bd.baseTop}" width="${bd.baseW}" height="${bd.baseH}" rx="26" fill="${ART.bushBase}"></rect>
            ${circles(bd.lobesFront)}
            ${sprigs}
          </svg>
          ${plants}
        </div>
        <div class="bed-label"><span class="nm">${esc(bd.name)}</span><span class="ct">${countNoun(bd.count, 'student', 'students')}</span></div>
      </button>`;
    }).join('');

    const key = [
      { state: 'beginner', title: 'Beginner', desc: 'a tiny bud', size: 18 },
      { state: 'learner', title: 'Learner', desc: 'a small flower', size: 26 },
      { state: 'expert', title: 'Expert', desc: 'a big open flower', size: 38 },
    ].map((k) => `<span>${bloomSVG(k.state, ART.keyBloom, k.size, 5)}<span class="lg-t"><b>${k.title}</b> · ${k.desc}</span></span>`).join('');

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
      <div class="ui-legend garden-key">${key}</div>
    </div>`;
  }

  function gardenerSVG() {
    const hair = S.gardener === 'm'
      ? `<path d="M47 46 q2 -26 27 -26 q25 0 27 26 q-10 -10 -27 -10 q-17 0 -27 10 Z" fill="${ART.hairM}"></path>`
      : `<g><path d="M47 48 q0 -30 27 -30 q27 0 27 30 q0 -14 -27 -14 q-27 0 -27 14 Z" fill="${ART.hairF}"></path><path d="M100 52 q12 14 6 34 q-8 -4 -10 -18" fill="${ART.hairF}"></path></g>`;
    return `<div class="gardener" aria-hidden="true"><svg width="92" height="132" viewBox="0 0 148 212" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="74" cy="203" rx="40" ry="7" fill="${ART.shadow}" opacity="0.06"></ellipse>
      <path d="M56 118 Q52 156 50 198" stroke="${ART.trousers}" stroke-width="9" stroke-linecap="round"></path>
      <path d="M92 118 Q96 156 98 198" stroke="${ART.trousers}" stroke-width="9" stroke-linecap="round"></path>
      <path d="M44 200 h20 M84 200 h20" stroke="${ART.boots}" stroke-width="9" stroke-linecap="round"></path>
      <path d="M48 78 h52 q10 0 10 12 v28 q0 10 -10 10 h-52 q-10 0 -10 -10 v-28 q0 -12 10 -12 Z" fill="${ART.green}"></path>
      <path d="M62 78 v42 M86 78 v42" stroke="${ART.shirtSeam}" stroke-width="3"></path>
      <path d="M38 86 Q22 104 20 128" stroke="${ART.yellow}" stroke-width="9" stroke-linecap="round"></path>
      <path d="M110 86 Q126 102 128 122" stroke="${ART.yellow}" stroke-width="9" stroke-linecap="round"></path>
      <path d="M46 84 h56 v-6 q0 -8 -8 -8 h-40 q-8 0 -8 8 Z" fill="${ART.yellow}"></path>
      <circle cx="74" cy="48" r="27" fill="${ART.skin}"></circle>
      ${hair}
      <ellipse cx="74" cy="32" rx="46" ry="11" fill="${ART.brim}"></ellipse>
      <path d="M50 32 q0 -20 24 -20 q24 0 24 20 Z" fill="${ART.yellow}"></path>
      <path d="M50 30 q24 8 48 0" stroke="${ART.hatBand}" stroke-width="4" stroke-linecap="round" fill="none"></path>
      <circle cx="64" cy="48" r="3" fill="${ART.face}"></circle><circle cx="84" cy="48" r="3" fill="${ART.face}"></circle>
      <path d="M66 58 q8 6 16 0" stroke="${ART.face}" stroke-width="2.6" stroke-linecap="round" fill="none"></path>
      <circle cx="56" cy="55" r="4" fill="${ART.blush}" opacity="0.5"></circle><circle cx="92" cy="55" r="4" fill="${ART.blush}" opacity="0.5"></circle>
      <g transform="translate(112 118)"><path d="M0 4 h20 a4 4 0 0 1 4 4 v12 a5 5 0 0 1 -5 5 h-18 a5 5 0 0 1 -5 -5 v-12 a4 4 0 0 1 4 -4 Z" fill="${ART.cyan}"></path><path d="M20 6 l10 -5 v6 Z" fill="${ART.cyan}"></path><path d="M-4 8 q-8 -3 -9 5" stroke="${ART.cyan}" stroke-width="3" stroke-linecap="round" fill="none"></path></g>
    </svg></div>`;
  }

  // ---------------- class roster modal ----------------
  function classModalView() {
    const sec = S.data.sections.find((s) => s.id === S.classModal);
    if (!sec) return '';
    const idx = S.data.sections.findIndex((s) => s.id === S.classModal);
    const color = ART.bedBlooms[idx % ART.bedBlooms.length];
    const rows = [...sec.students].sort((a, b) => a.name.localeCompare(b.name)).map((stu, i) => {
      const st = TO_BLOOM[stu.state] || 'learner';
      const size = st === 'expert' ? 34 : st === 'learner' ? 26 : 20;
      const label = st === 'expert' ? 'Expert' : st === 'learner' ? 'Learner' : 'Beginner';
      return `<button class="cm-row" data-open-student="${esc(stu.id)}">
        <span class="cm-bloom">${bloomSVG(st, color, size, (i * 11) % 97)}</span>
        <span class="cm-info"><span class="nm">${esc(stu.name)}</span>
          <span class="sk"><span><b>Good at</b> ${esc(bestOf(stu))}</span><span class="td-help"><b>Needs help</b> ${esc(weakOf(stu))}</span></span></span>
        <span class="cm-band">${label}</span>
      </button>`;
    }).join('');
    return `<div class="ui-scrim cm-backdrop" data-close-modal>
      <div class="ui-modal-card cm-card" data-stop>
        <div class="cm-head">
          <div><div class="cm-title">${esc(sec.name)}</div><div class="cm-sub">${countNoun(sec.students.length, 'student', 'students')} · one bloom each</div></div>
          <button class="btn-icon" data-close-modal>✕</button>
        </div>
        <div class="cm-list">${rows}</div>
        <div class="cm-foot"><button class="btn btn-primary md focus" data-open-bed="${esc(sec.id)}">Open ${esc(sec.name)} garden →</button></div>
      </div>
    </div>`;
  }

  // ---------------- change history ----------------
  // Reads go through TilliAPI.historyFor, which scopes to this teacher's
  // sections. The student/section hints only matter for the demo fallback (a
  // sample-class login with no membership row) and are ignored otherwise.
  function teacherHistory(filter) {
    const A = window.TilliAPI, sid = schoolId();
    if (!A || !A.historyFor || !sid) return [];
    const secs = S.baseData.sections || [];
    const hints = { students: secs.flatMap((x) => x.students).map((st) => st.adm).filter(Boolean), sections: secs.map((x) => x.name) };
    return A.historyFor(S.teacher.email, sid, Object.assign(hints, filter || {})) || [];
  }
  // An event belongs to a dashboard section if it names one of its children,
  // carries its section name, or is school-wide (e.g. a phase being deployed).
  function inSection(e, sec) {
    const stu = e.students || [];
    if (!e.section_id && !stu.length) return true;
    const adms = new Set(sec.students.map((st) => String(st.adm || '').toUpperCase()));
    return stu.some((s) => adms.has(s.id)) || (!!e.section_name && e.section_name.toLowerCase() === String(sec.name).toLowerCase());
  }
  function sectionHistory(sec, kind) {
    const list = teacherHistory(kind ? { kind } : {});
    return sec.id === 'all' ? list : list.filter((e) => inSection(e, sec));
  }
  function studentHistory(stu) { return stu && stu.adm ? teacherHistory({ student_id: stu.adm }) : []; }
  function histOpts(extra) { return Object.assign({ me: S.teacher.email }, extra || {}); }

  // "Record changes" card on a student's page — every edit / link / completion.
  function stuChangesCard(stu) {
    const HU = window.TilliHistory; if (!HU) return '';
    return `<div class="ui-card mt-4 stu-changes">
      <div class="stu-changes-h"><div style="font-weight:800;font-size:var(--fs-md)">Record changes</div>
        <span class="dash-sub">Who changed ${esc(stu.dispFirst || stu.first)}'s record, and what changed.</span></div>
      ${HU.listHTML(studentHistory(stu), histOpts({ hideStudent: true, showSection: false, empty: 'No changes recorded for ' + (stu.dispFirst || stu.first) + ' yet.' }))}
    </div>`;
  }

  // Class history modal (Students → "History"): the open section, or all of them.
  function histModalView() {
    const HU = window.TilliHistory; if (!HU) return '';
    const sec = section();
    const list = sectionHistory(sec, S.histKind);
    return `<div class="ui-scrim cm-backdrop" data-close-hist>
      <div class="ui-modal-card cm-card hist-card" data-stop role="dialog" aria-label="Change history">
        <div class="cm-head">
          <div><div class="cm-title">Change history</div><div class="cm-sub">${esc(sec.name)} · student records and assessments, newest first</div></div>
          <button class="btn-icon" data-close-hist aria-label="Close">✕</button>
        </div>
        <div class="hist-tools">${HU.kindChipsHTML(S.histKind, 'dark')}<span class="hist-count">${countNoun(list.length, 'change', 'changes')}</span></div>
        <div class="hist-scroll">${HU.listHTML(list, histOpts({ showSection: sec.id === 'all', empty: 'Nothing has changed in ' + sec.name + ' yet.' }))}</div>
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
        <div class="ui-tip pg-tip">
          <div class="nm">${esc(st.name)}</div><div class="sl">${esc(bandLine(st))}</div>
          <div class="ch">${chipHTML(st.chips)}</div>
          <div class="vw">View ${esc(st.dispFirst)} →</div>
        </div>
      </div>`).join('');

    const legend = [
      { title: 'Expert', desc: 'thriving overall', dot: TP.level(3).soft },
      { title: 'Learner', desc: 'on track', dot: TP.level(2).soft },
      { title: 'Beginner', desc: 'start with one focus skill', dot: TP.level(1).soft },
      { title: 'Need more data', desc: 'complete assessment', dot: STATE_DOT.waiting },
    ].map((l) => `<span><i class="round" style="background:${l.dot}"></i><span class="lg-t"><b>${l.title}</b> · ${l.desc}</span></span>`).join('');

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
          ${chatIcon('var(--white)')} Ask Tilli for an activity</button>
        <button class="btn-link mt-2 focus" data-open-student="${esc(st.id)}">See ${esc(st.dispFirst)}'s skills →</button>
      </div>`).join('');

    const highlights = top.map((t) => `<span class="hl-chip">${esc(t.name)} · ${t.now}%</span>`).join('');
    const growingRows = low.map((l) => `
      <div class="grow-row"><div class="gm"><div class="nm">${esc(l.name)}</div><div class="sub">${countNoun(l.beginner, 'student', 'students')} at Beginner level</div></div>
      <button class="btn-soft grow-ask focus" data-ask="class" data-skill="${esc(l.name)}" data-beg="${l.beginner}">Ask Tilli for a class activity</button></div>`).join('');

    return `<div class="dash-wrap section-garden">
      <button class="btn-link mb-3 focus" data-back-beds>← My garden</button>
      <div class="garden-head" style="margin-bottom:6px">
        <div>
          <h1 class="dash-h1">Good morning, ${esc(firstName())} 🌱</h1>
          <p class="dash-sub">Your <b style="color:var(--ink-900)">${esc(sec.name)}</b> garden, week 14.</p>
        </div>
        <div class="blossom-pill">${sunSmall()} ${blossomed} student${blossomed === 1 ? '' : 's'} reached Expert since baseline</div>
      </div>

      <section class="plant-bed">
        <div class="pg-grid" style="grid-template-columns:repeat(auto-fill,minmax(${plantCol},1fr))">${bed}</div>
        <div class="ui-legend garden-key">${legend}</div>
      </section>

      <section style="margin-top:26px">
        <h2 class="ui-title mb-3">🌱 ${nTend} student${nTend === 1 ? '' : 's'} at Beginner — start here</h2>
        <div class="tend-grid">${tendCards || '<p class="dash-sub">No students need tending right now — lovely. 🌼</p>'}</div>
      </section>

      <div class="two-col" style="margin-top:26px">
        <section class="hl-card">
          <div class="ui-eyebrow mb-2">Garden highlights</div>
          <p class="td-lead">Your class's strongest skills right now:</p>
          <div class="hl-chips">${highlights}</div>
          <button class="hl-more focus" data-nav="insights">See all in Insights →</button>
        </section>
        <section class="grow-card">
          <div class="ui-eyebrow mb-2">Growing areas</div>
          <div class="grow-list">${growingRows}</div>
        </section>
      </div>
    </div>`;
  }

  // ---------------- Students: roster ----------------
  function rosterFiltered() {
    const sec = section();
    const list = sec.students.filter((st) => st.name.toLowerCase().includes(S.rosterSearch.toLowerCase()));
    const order = { tending: 0, waiting: 1, growing: 2, blossoming: 3 };
    if (S.rosterSort === 'state') list.sort((a, b) => order[a.state] - order[b.state]);
    else if (S.rosterSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => b.grewSincePre - a.grewSincePre);
    return list;
  }
  function rosterList() {
    const list = rosterFiltered();
    if (!list.length) return '<p class="dash-sub" style="padding:8px 2px">No students match “' + esc(S.rosterSearch) + '”.</p>';
    const picking = S.select.on;
    return list.map((st, i) => {
      const on = !!S.select.ids[st.id];
      const act = picking ? `data-pick-stu="${esc(st.id)}" aria-pressed="${on}"` : `data-open-student="${esc(st.id)}"`;
      return `<button class="roster-row${picking ? ' picking' : ''}${on ? ' picked' : ''}" ${act}>
        ${picking ? `<span class="rr-check${on ? ' on' : ''}" aria-hidden="true">${on ? '✓' : ''}</span>` : ''}
        <span class="rr-plant">${flowerArt(st.state, 46, i)}</span>
        <span class="rr-info"><span class="nm">${esc(st.name)} ${uidChip(st, true)}</span><span class="sl">${esc(bandLine(st))}</span></span>
        <span class="rr-chips">${chipHTML(st.chips)}</span>
      </button>`;
    }).join('');
  }

  // Multi-select bar (Students → "Parent reports"): pick children, download one
  // PDF per child for their parent.
  function selectBar() {
    const sel = S.select;
    if (!sel.on) return '';
    const vis = rosterFiltered();
    const n = Object.keys(sel.ids).length;
    const allOn = vis.length > 0 && vis.every((st) => sel.ids[st.id]);
    return `<div class="sel-bar">
      <button class="sel-all focus" data-sel-all><span class="rr-check${allOn ? ' on' : ''}">${allOn ? '✓' : ''}</span>Select all</button>
      <span class="sel-n">${n} selected</span>
      ${sel.err ? `<span class="sel-err">${esc(sel.err)}</span>` : ''}
      <span class="sel-sp"></span>
      <button class="btn btn-ghost focus" data-sel-cancel>Cancel</button>
      <button class="btn btn-primary sm focus" data-sel-pdf${n && !sel.busy ? '' : ' disabled'}>${sel.busy ? esc(sel.busy) : `⬇ Download ${n === 1 ? 'PDF' : 'PDFs'}${n ? ' (' + n + ')' : ''}`}</button>
    </div>`;
  }

  function rosterView() {
    const sec = section();
    const sortTabs = [['state', 'State'], ['name', 'Name'], ['growth', 'Growth']]
      .map(([k, l]) => `<button class="ui-filterchip dark rsort${S.rosterSort === k ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('');
    const HU = window.TilliHistory;
    const tip = HU ? HU.lastUpdatedText(sectionHistory(sec)[0], histOpts()) : '';
    return `<div class="dash-wrap" style="max-width:900px">
      <div class="roster-titlebar">
        <div>
          <h1 class="dash-h1">Students</h1>
          <p class="dash-sub">${esc(sec.name)} · ${countNoun(sec.students.length, 'student', 'students')}</p>
        </div>
        <div class="roster-actions">
          ${HU ? `<button class="btn-line hist-tip focus" data-class-hist data-tip="${esc(tip)}" aria-label="History · ${esc(tip)}">🕘 History</button>` : ''}
          ${S.select.on ? '' : '<button class="btn-line focus" data-sel-start title="Select students and download a PDF report for each, ready to share with parents">☑ Parent reports</button>'}
          <button class="btn-line primary focus" data-add-students title="Add students to one of your grades · sections">+ Add students</button>
        </div>
      </div>
      ${selectBar()}
      <div class="roster-tools">
        <div class="roster-search">
          ${SEARCH_ICON}
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
    listEl.querySelectorAll('[data-pick-stu]').forEach((b) => b.addEventListener('click', () => togglePick(b.dataset.pickStu)));
  }
  function togglePick(id) {
    const ids = Object.assign({}, S.select.ids);
    if (ids[id]) delete ids[id]; else ids[id] = true;
    S.select = Object.assign({}, S.select, { ids, err: '' });
    render();
  }

  // ---------------- parent report PDFs ----------------
  // html2pdf.js (jsPDF + html2canvas) is loaded lazily from cdnjs the first time
  // a teacher downloads. One A4 PDF per selected child. Layout is a placeholder
  // until the sample parent PDF arrives — edit reportHTML() to match it.
  const PDF_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  let pdfLibP = null;
  function loadPdfLib() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (pdfLibP) return pdfLibP;
    pdfLibP = new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = PDF_LIB_URL;
      sc.onload = () => (window.html2pdf ? res(window.html2pdf) : rej(new Error('html2pdf missing')));
      sc.onerror = () => { pdfLibP = null; rej(new Error('PDF library failed to load')); };
      document.head.appendChild(sc);
    });
    return pdfLibP;
  }
  function reportFileName(stu) {
    return ((stu.first || '') + '-' + (stu.last || '')).replace(/[^A-Za-z0-9-]+/g, '').replace(/^-|-$/g, '') + '-Tilli-report.pdf';
  }
  async function downloadReports() {
    const all = S.data.sections.flatMap((x) => x.students);
    const list = Object.keys(S.select.ids).map((id) => all.find((st) => st.id === id)).filter(Boolean);
    if (!list.length || S.select.busy) return;
    try {
      S.select = Object.assign({}, S.select, { busy: 'Loading…', err: '' }); render();
      const h2p = await loadPdfLib();
      for (let i = 0; i < list.length; i++) {
        S.select = Object.assign({}, S.select, { busy: `Preparing ${i + 1} of ${list.length}…` }); render();
        const el = document.createElement('div');
        el.className = 'pr';
        el.innerHTML = reportHTML(list[i]);
        await h2p().set({
          margin: [12, 0, 12, 0], filename: reportFileName(list[i]),
          image: { type: 'jpeg', quality: 0.96 },
          html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.pr-card', '.pr-tip', '.pr-summary', '.pr-note', 'tr', '.pr-sec', '.pr-foot'] },
        }).from(el).save();
      }
      S.select = { on: false, ids: {}, busy: '', err: '' };
    } catch (err) {
      console.error('report PDF failed', err);
      S.select = Object.assign({}, S.select, { busy: '', err: 'Couldn’t create the PDFs — check your connection and try again.' });
    }
    render();
  }
  // ---------------- parent report content (matches Tilli_Parent Report_Example.pdf) ----------------
  const REPORT_CONTACT = 'sonali@tillikids.com';   // footer contact on every parent report
  const REPORT_SITE = 'www.tillikids.com';
  const SKILL_WHY = {
    emotion_awareness: 'Helps children understand what they and others feel — the foundation of all social connection.',
    emotion_regulation: 'Builds the ability to stay calm under pressure and recover from frustration or disappointment.',
    empathy: 'Enables children to consider other perspectives, essential for kindness and conflict resolution.',
    relationship_skills: 'Supports healthy friendships and teamwork through communication and cooperation.',
    metacognition: 'Teaches children to think about their own thinking — a key driver of learning and growth.',
    critical_thinking: 'Develops the ability to reason, question, and evaluate information independently.',
    attention: 'The ability to focus and filter distractions — foundational for learning in any setting.',
    working_memory: 'Holding and using information in mind while completing tasks — crucial for problem solving.',
    cognitive_flexibility: 'Adapting thinking when situations change — supports resilience and creative problem solving.',
    planning: 'Setting goals and breaking them into steps — key for academic and personal success.',
    inhibition_distraction: 'Resisting distractions to stay on task, supporting self-directed focus.',
    inhibition_response: 'Pausing before acting impulsively — builds thoughtful, careful decision making.',
  };
  // Snapshot-summary phrasing: what the strength looks like / what growing it means.
  const SKILL_STRENGTH = {
    emotion_awareness: 'picks up on feelings in themselves and others with real confidence',
    emotion_regulation: 'stays steady when things get hard and bounces back from frustration',
    empathy: 'notices how others feel and responds with kindness',
    relationship_skills: 'joins in, shares and works well with other children',
    metacognition: 'talks about how they solved a problem and what was tricky',
    critical_thinking: 'asks "why" and gives reasons for their thinking',
    attention: 'stays focused and filters out distractions well',
    working_memory: 'holds instructions in mind and follows them through',
    cognitive_flexibility: 'switches between ideas and activities with ease',
    planning: 'thinks ahead and organises the steps of a task',
    inhibition_distraction: 'keeps going with a task even when there is noise around',
    inhibition_response: 'pauses before reacting and makes careful choices',
  };
  const SKILL_GROW = {
    emotion_awareness: 'helping {name} put a name to feelings as they happen',
    emotion_regulation: 'helping {name} find a calm-down routine for big feelings',
    empathy: 'helping {name} notice how other people might be feeling',
    relationship_skills: 'helping {name} practise taking turns and joining in',
    metacognition: 'helping {name} pause and reflect on how they think and learn',
    critical_thinking: 'helping {name} explain the "why" behind their ideas',
    attention: 'helping {name} stay with one thing a little longer',
    working_memory: 'helping {name} hold a few steps in mind at once',
    cognitive_flexibility: 'helping {name} adjust when plans change',
    planning: 'helping {name} break tasks into small first steps',
    inhibition_distraction: 'helping {name} keep focus when there are distractions',
    inhibition_response: 'helping {name} stop and think before acting',
  };
  // "What you can do at home" — one tip per skill; the report picks the tips
  // for the child's lowest skills.
  const SKILL_TIPS = {
    emotion_awareness: ['Name emotions out loud', '💛', 'When you notice a feeling at home, say it aloud — "I’m feeling a bit frustrated right now." This makes emotions normal and visible, which helps {name} do the same.'],
    emotion_regulation: ['Make a calm-down plan', '🌊', 'Together, pick two things that help when feelings get big — three slow breaths, a hug, a quiet corner. Practise them when {name} is calm so they’re ready when needed.'],
    empathy: ['Wonder about others', '🤝', 'While reading or watching something together, pause and ask: "How do you think they feel right now? Why?" It builds the habit of seeing through someone else’s eyes.'],
    relationship_skills: ['Play turn-taking games', '🎲', 'Board games, cards or building together give {name} easy practice in waiting, sharing and handling winning and losing kindly.'],
    metacognition: ['Ask "what were you thinking?"', '🌸', 'After a decision or problem, ask: "What was going through your mind?" or "Would you do anything differently next time?" This is the simplest way to build metacognition.'],
    critical_thinking: ['Ask "how do you know?"', '🔍', 'When {name} shares an idea, gently ask "How do you know?" or "What makes you think that?" and listen to the reasoning — no right answers needed.'],
    attention: ['One thing at a time', '🎯', 'Set up short, screen-free moments for one activity — a puzzle, a drawing, a story. Gradually stretch the time, and notice out loud when {name} stays with it.'],
    working_memory: ['Two-step jobs', '🧺', 'Give simple two-step requests — "Put your shoes away, then bring your book." As {name} gets them right, add a third step.'],
    cognitive_flexibility: ['Play "what else could it be?"', '🔄', 'Pick an everyday object and take turns thinking of new uses for it. Silly ideas count — it trains {name}’s thinking to bend when things change.'],
    planning: ['Plan together before big tasks', '💜', 'Before homework or a project, ask: "What’s the first step? What comes after?" Planning out loud, with you, is exactly how organisation skills grow.'],
    inhibition_distraction: ['Create a focus spot', '📚', 'Choose one quiet spot for homework or reading, away from the TV and toys. A predictable space makes it easier for {name} to tune out distractions.'],
    inhibition_response: ['Celebrate the pause', '🌿', 'When {name} stops before reacting — even for a second — notice it. "I saw you take a breath there. That was really thoughtful." Small moments build big habits.'],
  };
  // Home-tip card fills cycle through the report palette (--report-* on .pr).
  const REPORT_TIP_BG = ['var(--report-peach)', 'var(--report-mint)', 'var(--report-yellow)', 'var(--report-pink)'];

  function reportTerm() {
    const sc = window.TILLI_SCHOOL && window.TILLI_SCHOOL.school;
    const yr = new Date().getFullYear();
    return (sc && sc.term ? sc.term : 'Term') + ', ' + yr;
  }
  // One child's parent report — content + structure follow the Tilli parent
  // report example: header, hello, 01 lenses + levels, 02 the 12 skills,
  // 03 skill levels, 04 snapshot summary, 05 what you can do at home, footer.
  function reportHTML(stu) {
    const d = S.teacher.demo || {};
    const school = d.school || S.teacher.school || '';
    const teacher = d.name || 'your class teacher';
    const name = stu.first || stu.name;
    const nm = (t) => esc(String(t).replace(/\{name\}/g, name));
    const waiting = stu.state === 'waiting';
    const uid = uidOf(stu);
    const sec = (n, title, tone) => `<div class="pr-sec pr-sec-${tone}"><span class="pr-num">${n}</span><span class="pr-sect">${title}</span></div>`;
    const groupHead = (g) => g === 'sel' ? '<div class="pr-gh">💜 Social-Emotional Learning</div>' : '<div class="pr-gh">🧠 Cognitive Skills</div>';
    const SKILLS = S.data.skills;
    const whyTable = (g) => `${groupHead(g)}<table class="pr-tbl"><thead><tr><th>Skill</th><th>Why it matters</th></tr></thead><tbody>${
      SKILLS.filter((k) => k.group === g).map((k, i) => `<tr${i % 2 ? ' class="alt"' : ''}><td class="pr-sk">${esc(k.name)}</td><td>${esc(SKILL_WHY[k.key] || '')}</td></tr>`).join('')}</tbody></table>`;
    const lvlClass = (b) => 'pr-lv pr-lv-' + String(b || '').toLowerCase();
    const levelTable = (g) => `${groupHead(g)}<table class="pr-tbl pr-lvtbl"><thead><tr><th>Skill</th><th>Level</th></tr></thead><tbody>${
      stu.skills.filter((k) => k.group === g).map((k) => `<tr><td>${esc(k.name)}</td><td class="${lvlClass(k.band)}">${esc(k.band)}</td></tr>`).join('')}</tbody></table>`;
    // Snapshot summary: biggest strength, two developing well, one to grow.
    let summary = '';
    if (!waiting) {
      const sorted = [...stu.skills].sort((a, b) => b.pct - a.pct);
      const top = sorted[0], low = sorted[sorted.length - 1];
      const mid = sorted.filter((k) => k !== top && k !== low && k.band !== 'Beginner').slice(0, 2);
      summary = `✨ ${esc(name)}&rsquo;s biggest strength is <b>${esc(top.name)}</b> — ${esc(name)} ${esc(SKILL_STRENGTH[top.key] || 'shows real confidence here')}.`
        + (mid.length ? ` ${esc(name)}&rsquo;s ${mid.map((k) => '<b>' + esc(k.name) + '</b>').join(' and ')} ${mid.length > 1 ? 'are' : 'is'} developing well.` : '')
        + ` The area where ${esc(name)} will grow the most with extra support right now is <b>${esc(low.name)}</b> — ${nm(SKILL_GROW[low.key] || 'with gentle, regular practice')}.`;
    }
    // Home tips for the 4 lowest skills (or a balanced default before baseline).
    const tipKeys = waiting ? ['emotion_awareness', 'metacognition', 'inhibition_response', 'planning']
      : [...stu.skills].sort((a, b) => a.pct - b.pct).slice(0, 4).map((k) => k.key);
    const tips = tipKeys.map((k, i) => { const t = SKILL_TIPS[k]; return t ? `<div class="pr-tip" style="background:${REPORT_TIP_BG[i % REPORT_TIP_BG.length]}">
        <div class="pr-tipt">${nm(t[0])} ${t[1]}</div><div class="pr-tipb">${nm(t[2])}</div></div>` : ''; }).join('');
    return `<div class="pr-head">
        <div class="pr-logo">tilli <span>PARENT REPORT</span></div>
        <div class="pr-headr">${esc(school)}<br>${esc(reportTerm())} · ${REPORT_SITE}</div>
      </div>
      <div class="pr-hero">
        <h1>Hello, <span>${esc(name)}&rsquo;s family</span> 👋</h1>
        <div class="pr-meta">${esc(stu.section || '')}${uid ? ' · ' + esc(uid) : ''} · Teacher: ${esc(teacher)}${school ? ' · ' + esc(school) : ''}</div>
        <p>This report brings together what we&rsquo;ve seen across three different lenses — your survey as a parent, ${esc(name)}&rsquo;s direct assessment, and their teacher&rsquo;s observations — to give you a full picture of how ${esc(name)} is growing.</p>
      </div>

      ${sec('01', 'How we look at your child&rsquo;s development 🌸', 'peach')}
      <p class="pr-p">We look at your child through three different lenses. Each one tells us something the others can&rsquo;t — and together they give us the fullest picture.</p>
      <div class="pr-3">
        <div class="pr-card" style="background:var(--report-peach)"><div class="pr-ct">🏠 Parent Survey</div>What you observe at home — your child&rsquo;s behaviour, emotions, and relationships in everyday life.</div>
        <div class="pr-card" style="background:var(--report-mint)"><div class="pr-ct">📝 Student Assessment</div>Direct tasks completed by your child that measure skills like attention, memory, and reasoning.</div>
        <div class="pr-card" style="background:var(--report-lav)"><div class="pr-ct">🍎 Teacher Survey</div>What the teacher observes in the classroom — focus, self-regulation, and social behaviour.</div>
      </div>
      <p class="pr-p">These three perspectives are combined to give each skill a level. Here&rsquo;s what each level means:</p>
      <div class="pr-3">
        <div class="pr-card pr-lvcard pr-lvb"><div class="pr-ct">Beginner</div>This skill is emerging. Consistent practice and support will help it grow.</div>
        <div class="pr-card pr-lvcard pr-lvl"><div class="pr-ct">Learner</div>Developing well. Showing this skill in many situations — keep building!</div>
        <div class="pr-card pr-lvcard pr-lve"><div class="pr-ct">Expert</div>Strong and consistent — really shining in this area!</div>
      </div>
      <hr class="pr-hr">

      ${sec('02', 'The 12 skills we look at 🌿', 'mint')}
      <p class="pr-p">These skills shape how children learn, relate to others, and navigate the world. Research shows they matter just as much as academic ability for long-term wellbeing and happiness.</p>
      ${whyTable('sel')}
      ${whyTable('cog')}
      <hr class="pr-hr">

      ${sec('03', esc(name) + '&rsquo;s skill levels 💜', 'lav')}
      ${waiting
        ? `<div class="pr-note">${esc(name)}&rsquo;s first assessment is still in progress. Their skill levels will appear here once Baseline is complete.</div>`
        : `<p class="pr-p">Here&rsquo;s where ${esc(name)} is right now across all 12 skills, based on the combined view from you, their teacher, and their own assessment.</p>
           ${levelTable('sel')}${levelTable('cog')}`}
      <hr class="pr-hr">

      ${sec('04', 'Snapshot summary ✨', 'yellow')}
      <div class="pr-summary">${waiting ? `✨ Once ${esc(name)}&rsquo;s Baseline is complete, this summary will highlight their biggest strength and where they&rsquo;ll grow the most with a little extra support.` : summary}</div>
      <hr class="pr-hr">

      ${sec('05', 'What you can do at home 🏠', 'pink')}
      <p class="pr-p">Small, consistent moments at home make a real difference. Here are a few things to try this term:</p>
      ${tips}

      <div class="pr-foot">
        <div><b>tilli</b> · ${esc(school)} · ${esc(reportTerm())}</div>
        <div>${REPORT_SITE} · ${REPORT_CONTACT}</div>
        <div class="pr-conf">Confidential — for family use only</div>
      </div>`;
  }

  // ---------------- Students: detail ----------------
  // Student header card — name, class, UID — with inline "Edit" for name + UID.
  function stuHead(stu, plantState, extra) {
    const ed = S.stuEdit && S.stuEdit.id === stu.id ? S.stuEdit : null;
    if (ed) {
      return `<div class="stu-head">
        <span class="stu-plant">${flowerArt(plantState, 76, 0)}</span>
        <div class="stu-meta stu-editform">
          <div class="stu-edit-grid">
            <label><span class="ui-eyebrow mb-1">First name</span><input class="input td-in focus" data-stu-edit="first" value="${esc(ed.first)}" placeholder="First name"></label>
            <label><span class="ui-eyebrow mb-1">Last name</span><input class="input td-in focus" data-stu-edit="last" value="${esc(ed.last)}" placeholder="Last name"></label>
            <label title="The child's unique Tilli Measures code. Letters, numbers and hyphens; must not be used by another student."><span class="ui-eyebrow mb-1">Student UID</span><input class="input td-in td-uid focus" data-stu-edit="uid" value="${esc(ed.uid)}" placeholder="TM-XXXXXX" maxlength="20" autocapitalize="characters" spellcheck="false"></label>
          </div>
          ${ed.err ? `<div class="err-text mt-2">${esc(ed.err)}</div>` : ''}
          <div class="stu-edit-actions">
            <button class="btn btn-primary md focus" data-stu-save>Save</button>
            <button class="btn btn-ghost md focus" data-stu-cancel>Cancel</button>
          </div>
        </div>
      </div>`;
    }
    // "Last updated …" stays out of the way: a small clock that shows it on
    // hover / focus and, on tap, jumps to the History tab's Record changes.
    const HU = window.TilliHistory;
    const tip = HU ? HU.lastUpdatedText(studentHistory(stu)[0], histOpts()) : '';
    const histBtn = HU ? `<button class="hist-peek hist-tip focus" data-stu-hist data-tip="${esc(tip)}" aria-label="History · ${esc(tip)}">${HIST_ICON}</button>` : '';
    return `<div class="stu-head">
      <span class="stu-plant">${flowerArt(plantState, 76, 0)}</span>
      <div class="stu-meta">
        <h1 class="stu-name">${esc(stu.name)}</h1>
        <div class="stu-sub">${esc(stu.section)} · ${esc(stu.parentEmail)}</div>
        ${uidLine(stu)}
        ${extra || ''}
      </div>
      <div class="stu-headbtns">
        ${histBtn}
        <button class="btn-line stu-editbtn focus" data-stu-editstart title="Edit this student's name and UID">✎ Edit</button>
      </div>
    </div>`;
  }
  const UID_ERR = {
    name_required: 'A first name is required.',
    uid_format: 'UID can use letters, numbers and hyphens (3–20 characters).',
    uid_taken: 'That UID is already used by another student.',
    not_found: 'This student isn’t on file at your school yet — the name was updated here only.',
  };
  // Apply the edit to the API record, the dashboard's real class and the
  // teacher's saved roster. Returns an error message, or '' on success.
  function saveStudentEdit() {
    const ed = S.stuEdit; if (!ed) return '';
    const first = ed.first.trim(), last = ed.last.trim(), uid = ed.uid.trim().toUpperCase();
    if (!first) return UID_ERR.name_required;
    if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(uid)) return UID_ERR.uid_format;
    const base = S.baseData.sections.flatMap((x) => x.students).find((x) => x.id === ed.id);
    if (!base) return '';
    const A = window.TilliAPI, sid = schoolId();
    if (A && A.updateStudent && sid && base.adm) {
      const res = A.updateStudent(sid, base.adm, { first, last, uid }, S.teacher.email);
      if (!res.ok && res.reason !== 'not_found') return UID_ERR[res.reason] || 'Could not save — try again.';
    } else if (S.baseData.sections.some((x) => x.students.some((o) => o.id !== base.id && String(o.uid || '').toUpperCase() === uid))) {
      return UID_ERR.uid_taken;
    }
    Object.assign(base, { first, last, name: (first + ' ' + last).trim(), uid,
      initials: ((first[0] || '') + (last[0] || '')).toUpperCase() || '?' });
    const sec = S.baseData.sections.find((x) => x.students.indexOf(base) >= 0);
    if (sec) {
      const counts = {};
      sec.students.forEach((o) => { counts[o.first] = (counts[o.first] || 0) + 1; });
      sec.students.forEach((o) => { o.dispFirst = counts[o.first] > 1 ? o.first + ' ' + (o.last[0] || '') + '.' : o.first; });
    }
    if (window.TilliOnboarding && window.TilliOnboarding.updateStudent && base.adm) {
      window.TilliOnboarding.updateStudent(base.adm, { first, last, uid });
    }
    rebuildData();
    return '';
  }

  function studentDetailView() {
    const sec = section();
    const stu = sec.students.find((x) => x.id === S.studentId);
    if (!stu) { S.studentId = null; return rosterView(); }

    // Brand-new student, no assessment recorded yet — skip the score tabs (they'd
    // all read 0%) and point the teacher at the one useful action: the baseline.
    if (stu.state === 'waiting') {
      return `<div class="dash-wrap" style="max-width:960px">
        <button class="btn-link mb-3 focus" data-back-roster>← All students</button>
        ${stuHead(stu, 'waiting', pastHeaderChips(stu, false))}
        <div class="ui-card ui-empty empty-card mt-4">
          <div class="ui-empty-t">No assessment data yet</div>
          <p class="ui-empty-b">Once you complete ${esc(stu.dispFirst)}'s baseline, their skills, growth and perspectives will grow in here.</p>
          <div class="actions"><button class="btn btn-primary md focus" data-continue-assess="${esc(stu.id)}">Start baseline for ${esc(stu.dispFirst)} →</button></div>
        </div>
        ${stuChangesCard(stu)}
        ${stuPastHistory(stu, false)}
      </div>`;
    }

    const tab = S.studentTab;
    const tabBtn = [['overview', 'Overview'], ['skills', 'Skills'], ['perspectives', 'Perspectives'], ['history', 'History']]
      .map(([k, l]) => `<button class="ui-filterchip dark stab${tab === k ? ' on' : ''}" data-stab="${k}">${l}</button>`).join('');

    let panel = '';
    if (tab === 'overview') panel = stuOverview(stu);
    else if (tab === 'skills') panel = stuSkills(stu);
    else if (tab === 'perspectives') panel = stuPerspectives(stu);
    else panel = stuHistory(stu);

    return `<div class="dash-wrap" style="max-width:960px">
      <button class="btn-link mb-3 focus" data-back-roster>← All students</button>
      ${stuHead(stu, stu.state, `<div class="stu-chips">${chipHTML(stu.chips)}</div>${pastHeaderChips(stu, true)}`)}
      <div class="stu-tabs">${tabBtn}</div>
      ${panel}
    </div>`;
  }

  function stuOverview(stu) {
    const midAvg = Math.round(stu.skills.reduce((a, x) => a + x.mid, 0) / stu.skills.length);
    return `
      <div class="two-col">
        <div class="hl-card">
          <div class="ui-eyebrow mb-2">🌸 Something that grew</div>
          <p class="td-lead">${esc(stu.celebrateLine)}</p>
          <button class="hl-more boxed focus" data-ask-stu="grew">Ask Tilli to keep it growing →</button>
        </div>
        <div class="grow-card">
          <div class="ui-eyebrow mb-2">🪴 Start by focusing on</div>
          <p class="td-lead">${esc(stu.tendReason)}.</p>
          <button class="btn-ask-a inline focus" data-ask-stu="tend">Ask Tilli for an activity →</button>
        </div>
      </div>
      <div class="ui-card mt-4">
        <div style="font-weight:800;font-size:var(--fs-md);margin-bottom:2px">Overall growth</div>
        <div style="font-size:var(--fs-sm);color:var(--ink-300);margin-bottom:14px">Band across Pre · Mid · Post assessment windows</div>
        ${trendSVG([stu.overallPre, midAvg, stu.overallPct])}
      </div>`;
  }

  function stuSkills(stu) {
    const bandName = (v) => (v < 34 ? 'Beginner' : v < 67 ? 'Learner' : 'Expert');
    const card = (sk) => {
      const win = (label, val) => `<div class="scw"><div class="scw-col"><div class="scw-bar" style="background:${TP.levelOf(bandName(val)).soft};height:${Math.max(6, Math.round(val * 0.4))}px"></div></div><div class="scw-l">${label}</div><div class="scw-v">${val}</div></div>`;
      return `<div class="skill-card">
        <div class="sc-head"><div class="nm">${esc(sk.name)}</div><span class="ui-badge lvl-${TP.levelOf(sk.band).n}">${sk.band}</span></div>
        <div class="sc-bars">${win('Pre', sk.pre)}${win('Mid', sk.mid)}${win('Post', sk.post)}</div>
        <div class="sc-persp"><span>👩‍🏫 ${sk.teacher}%</span><span>🏠 ${sk.parent}%</span><span>🧒 ${sk.student}%</span></div>
        <button class="btn-soft green sc-full focus" data-ask-skill="${esc(sk.name)}" data-band="${esc(sk.band)}">Ask Tilli about ${esc(sk.name.split(' ')[0])}</button>
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
          ${sk.gap >= 22 ? '<span class="ui-badge gap-badge">Worth a conversation</span>' : ''}
          <button class="gap-ask focus" data-ask-skill="${esc(sk.name)}" data-band="${esc(sk.band)}" title="Talk this through with Tilli">${chatIcon('var(--green-500)')}</button>
        </div>
      </div>`).join('');
    return `
      <div class="persp-note">Different views can mean a skill shows up differently at home and at school. Gaps aren't problems — they're conversations worth having. 🌤️</div>
      <div class="two-col">
        <div class="ui-card" style="padding:18px;text-align:center">
          <div style="font-weight:800;font-size:var(--fs-md);margin-bottom:6px">Three perspectives</div>
          ${radarSVG(stu)}
          <div class="ui-legend persp-legend"><span><i class="round" style="background:var(--persp-teacher)"></i>Teacher</span><span><i class="round" style="background:var(--persp-parent)"></i>Parent</span><span><i class="round" style="background:var(--persp-student)"></i>Student</span></div>
        </div>
        <div class="ui-card" style="padding:6px 8px">${rows}</div>
      </div>`;
  }

  function stuHistory(stu) {
    const ST = TP.STATUS;
    const rows = [
      { title: 'Post assessment', meta: 'Teacher observation · week 14', status: 'In progress', dot: ST.in_progress.dot, color: ST.in_progress.fg },
      { title: 'Mid assessment', meta: 'Teacher · Parent report · complete', status: 'Done', dot: ST.done.dot, color: ST.done.fg },
      { title: 'Baseline (Pre)', meta: 'Teacher · Parent · Student-direct', status: 'Done', dot: ST.done.dot, color: ST.done.fg },
      { title: 'Enrolled', meta: 'Added to ' + stu.section, status: '—', dot: STATE_DOT.waiting, color: 'var(--ink-300)' },
    ].map((h) => `<div class="hist-row"><span class="dot" style="background:${h.dot}"></span><div class="hm"><div class="nm">${esc(h.title)}</div><div class="sub">${esc(h.meta)}</div></div><div class="st" style="color:${h.color}">${esc(h.status)}</div></div>`).join('');
    const past = stuPastHistory(stu, true);
    return past + (past ? `<h3 class="ui-title hist-sec-h">This year · ${esc(stu.section)}</h3>` : '') + `<div class="ui-card td-rows">${rows}</div>` + stuChangesCard(stu);
  }

  // ---------------- Students: previous classes (multi-year history) ----------------
  // Earlier school years come from TILLI_SCHOOL.pastClassesFor(adm): per year the
  // class, teacher, windows completed, each skill's [start, end] score and the
  // teacher's handover note. Levels use the same thresholds as this year.
  const levelName = (v) => (v < 34 ? 'Beginner' : v < 67 ? 'Learner' : 'Expert');
  function pastClasses(stu) {
    const TS = window.TILLI_SCHOOL;
    return TS && TS.pastClassesFor && stu.adm ? TS.pastClassesFor(stu.adm) : [];
  }
  // Overall score for a past year: mean of every skill's start (i=0) or end (i=1) score.
  function pastYearAvg(y, i) {
    const v = Object.keys(y.skills).map((k) => y.skills[k][i]);
    return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  }
  const levelBadge = (band) => `<span class="ui-badge lvl-${TP.levelOf(band).n}">${band}</span>`;

  // Student header: one overall level per earlier class, newest first. When
  // `linked`, each chip opens the History tab (reuses the [data-stab] wiring).
  function pastHeaderChips(stu, linked) {
    const past = pastClasses(stu);
    if (!past.length) return '';
    const chip = (y) => {
      const inner = `<span class="pc-cls">${esc(y.grade)} ${esc(y.section)} · ${esc(y.year)}</span>${levelBadge(levelName(pastYearAvg(y, 1)))}`;
      return linked
        ? `<button class="stu-past-chip focus" data-stab="history" title="See ${esc(stu.dispFirst || stu.first)}'s full history">${inner}</button>`
        : `<span class="stu-past-chip">${inner}</span>`;
    };
    return `<div class="stu-past"><span class="ui-eyebrow">Previous classes</span>${past.slice().reverse().map(chip).join('')}</div>`;
  }

  // Tiny per-skill trend line for the history table.
  function sparkSVG(vals) {
    const W = 84, H = 26, pad = 4;
    // Scale to this skill's own range (min 20 pts) so small year-on-year moves stay visible.
    const mid = (Math.min(...vals) + Math.max(...vals)) / 2, span = Math.max(20, Math.max(...vals) - Math.min(...vals));
    const pts = vals.map((v, i) => [pad + (i * (W - pad * 2)) / Math.max(1, vals.length - 1), H / 2 - ((v - mid) / span) * (H - pad * 2)]);
    const last = pts[pts.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" style="stroke:var(--green-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="3" style="fill:var(--green-600)"/></svg>`;
  }

  // Full multi-year history: overall trend, skill-by-skill table, one card per
  // earlier class with its handover note. `withNow` adds this year's column
  // (off when the child has no data yet this year).
  function stuPastHistory(stu, withNow) {
    const past = pastClasses(stu);
    if (!past.length) return '';
    const cols = past.map((y) => ({ label: y.grade, sub: y.year, val: (k) => (y.skills[k] ? y.skills[k][1] : 0) }));
    if (withNow) cols.push({ label: stu.grade, sub: 'This year', now: true, val: (k) => { const sk = stu.skills.find((x) => x.key === k); return sk ? sk.pct : 0; } });
    const overall = cols.map((c) => Math.round(stu.skills.reduce((a, sk) => a + c.val(sk.key), 0) / stu.skills.length));

    const head = `<tr><th>Skill</th>${cols.map((c) => `<th${c.now ? ' class="now"' : ''}>${esc(c.label)}<small>${esc(c.sub)}</small></th>`).join('')}<th>Trend</th></tr>`;
    const rows = stu.skills.map((sk) => {
      const vals = cols.map((c) => c.val(sk.key));
      return `<tr><td class="name">${esc(sk.name)}</td>${vals.map((v, i) => `<td${cols[i].now ? ' class="now"' : ''}><span class="hs-cell">${levelBadge(levelName(v))}<b>${v}</b></span></td>`).join('')}<td>${sparkSVG(vals)}</td></tr>`;
    }).join('');

    const cards = past.slice().reverse().map((y) => {
      const start = pastYearAvg(y, 0), end = pastYearAvg(y, 1);
      return `<div class="ui-card sm past-year">
        <div class="py-head">
          <div><div class="py-t">${esc(y.grade)} ${esc(y.section)} · ${esc(y.year)}</div>
          <div class="py-sub">Teacher: ${esc(y.teacher)} · ${y.windowsDone} of 3 assessments completed</div></div>
          ${levelBadge(levelName(end))}
        </div>
        <div class="py-grow">Overall <b>${start}%</b> → <b>${end}%</b> across the year</div>
        <div class="py-note"><span class="ui-eyebrow mb-1">Handover note from ${esc(y.teacher)}</span><p>${esc(y.note)}</p></div>
      </div>`;
    }).join('');

    return `
      <h3 class="ui-title hist-sec-h">Across the years</h3>
      <div class="ui-card">
        <div class="ui-mod-note mb-3">Overall score at the end of each class${withNow ? ', and where ' + esc(stu.dispFirst || stu.first) + ' is this year' : ''}</div>
        ${trendSVG(overall, cols.map((c) => c.label))}
      </div>
      <h3 class="ui-title hist-sec-h">Skill by skill</h3>
      <div class="ui-card pad0"><div class="ui-tablewrap"><table class="ui-table hist-table mw-640"><thead>${head}</thead><tbody>${rows}</tbody></table></div></div>
      <h3 class="ui-title hist-sec-h">Class by class</h3>
      <div class="past-years">${cards}</div>`;
  }

  // ---------------- charts ----------------
  function trendSVG(vals, labels) {
    const W = 520, H = 120, pad = 30;
    labels = labels || ['Pre', 'Mid', 'Post'];
    // Keep the end labels inside the viewBox when they are long (e.g. "Kindergarten").
    const padX = Math.max(pad, Math.max(...labels.map((l) => String(l).length)) * 4.2);
    const xs = vals.map((_, i) => padX + (i * (W - padX * 2)) / Math.max(1, vals.length - 1));
    const y = (v) => H - pad - (v / 100) * (H - pad * 2);
    let dots = '', txt = '', band = '';
    vals.forEach((v, i) => {
      dots += `<circle cx="${xs[i]}" cy="${y(v)}" r="5.5" style="fill:var(--green-600)"/>`;
      txt += `<text class="svg-t" x="${xs[i]}" y="${H - 6}" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--ink-300)">${labels[i]}</text>`;
      txt += `<text class="svg-t" x="${xs[i]}" y="${y(v) - 13}" text-anchor="middle" font-size="13" font-weight="800" style="fill:var(--green-700)">${v}%</text>`;
    });
    [33, 67].forEach((b) => { band += `<line x1="${pad}" y1="${y(b)}" x2="${W - pad}" y2="${y(b)}" style="stroke:var(--line-200)" stroke-width="1.5" stroke-dasharray="4 5"/>`; });
    const pts = vals.map((v, i) => xs[i] + ',' + y(v));
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px" xmlns="http://www.w3.org/2000/svg">${band}<polyline points="${pts.join(' ')}" fill="none" style="stroke:var(--green-500)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}${txt}</svg>`;
  }

  function radarSVG(stu) {
    const skills = stu.skills, n = skills.length, cx = 140, cy = 130, R = 100;
    const ang = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
    // Perspective colours: resolved hex for the stroke attribute, translucent
    // var()-based fill via style (SVG attributes can't read var()).
    const poly = (accessor, key, pct) => {
      const pts = skills.map((sk, i) => { const r = (accessor(sk) / 100) * R; return (cx + r * Math.cos(ang(i))) + ',' + (cy + r * Math.sin(ang(i))); });
      return `<polygon points="${pts.join(' ')}" style="fill:color-mix(in srgb, var(--persp-${key}) ${pct}%, transparent)" stroke="${TP.perspHex(key)}" stroke-width="2"/>`;
    };
    let grid = '';
    [0.33, 0.66, 1].forEach((f) => { const pts = skills.map((sk, i) => (cx + R * f * Math.cos(ang(i))) + ',' + (cy + R * f * Math.sin(ang(i)))); grid += `<polygon points="${pts.join(' ')}" fill="none" style="stroke:var(--line-200)" stroke-width="1"/>`; });
    return `<svg viewBox="0 0 280 260" width="100%" style="max-width:280px" xmlns="http://www.w3.org/2000/svg">${grid}${poly((sk) => sk.parent, 'parent', 18)}${poly((sk) => sk.student, 'student', 18)}${poly((sk) => sk.teacher, 'teacher', 22)}</svg>`;
  }

  function chatIcon(fill) { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6.5C4 5 5 4 6.5 4h11C19 4 20 5 20 6.5v7c0 1.5-1 2.5-2.5 2.5H10l-4 3.5V16H6.5C5 16 4 15 4 13.5v-7Z" style="fill:${fill}"/></svg>`; }
  function sunSmall() { return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="${ART.pollen}"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" stroke="${ART.pollen}" stroke-width="2" stroke-linecap="round"/></svg>`; }

  function ringSVG(done, total) {
    const R = 34, C = 2 * Math.PI * R, frac = total ? done / total : 0;
    return `<svg width="92" height="92" viewBox="0 0 92 92" xmlns="http://www.w3.org/2000/svg"><circle cx="46" cy="46" r="${R}" fill="none" style="stroke:var(--line-200)" stroke-width="9"/><circle cx="46" cy="46" r="${R}" fill="none" style="stroke:var(--green-500)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 46 46)"/><text class="svg-t" x="46" y="50" text-anchor="middle" font-size="18" font-weight="800" style="fill:var(--green-700)">${done}/${total}</text></svg>`;
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
    // No "Enter" chip: recording an observation opens from To-do (Start / Continue),
    // so To-do stays highlighted while it's open.
    const onTab = tab === 'enter' ? 'todo' : tab;
    const subTabs = [['todo', 'To-do'], ['completed', 'Tracker']]
      .map(([k, l]) => `<button class="ui-filterchip dark atab${onTab === k ? ' on' : ''}" data-assesstab="${k}">${l}</button>`).join('');
    let body, subtitle;
    if (tab === 'enter') { body = obsEnter(); subtitle = sec.name + ' · recording an observation'; }
    else if (tab === 'completed') { body = assessCompleted(); subtitle = "Who has finished each assessment window — and who's still waiting."; }
    else { body = obsVine(); subtitle = "Your class's assessment journey grows as each window is complete. Tend the glowing window next."; }
    return `<div class="dash-wrap" style="max-width:1080px">
      <h1 class="dash-h1" style="color:var(--green-700)">Assess</h1>
      <p class="dash-sub" style="max-width:560px">${esc(subtitle)}</p>
      <div class="log-tabs mt-4">${subTabs}</div>
      <div class="mt-4">${body}</div>
    </div>`;
  }

  function obsVine() {
    const sec = section();
    const nStu = sec.students.length;
    // The journey follows the preview state: every step before the state's
    // current step is complete, the current one is active, later ones locked.
    // Observation steps (baseline / mid / end) read the class's real teacher
    // progress for that window and show as complete once everyone is observed.
    const ORDER = ['pre', 'base', 'post', 'm18', 'mid', 'm36', 'end'];
    const CURRENT = { baseline: 'base', between: 'm18', midline: 'mid', endline: 'end' };
    const OBS_WIN = { base: 'baseline', mid: 'mid', end: 'post' };
    const cur = ORDER.indexOf(CURRENT[S.windowState] || 'base');
    const win = (k) => (S.data.windows || []).find((w) => w.key === k) || {};
    const DEF = {
      pre: { title: 'Pre-training survey', done: 'Completed · Apr 2', due: 'Due Apr 2', body: 'Your baseline reflection on the class.' },
      base: { title: 'Baseline observations', done: 'Completed · Apr 18', due: 'Due ' + (win('baseline').date || 'Apr 2') },
      post: { title: 'Post-training survey', done: 'Completed · Apr 25', due: 'Due Apr 25', body: 'Reflect on your class after training' },
      m18: { title: '18-week check-in', done: 'Completed · Week 18', due: 'Due · Week 18', body: 'A quick check-in on how your class is settling' },
      mid: { title: 'Mid-year report', done: 'Completed · ' + (win('mid').date || 'Jun 18'), due: 'Due ' + (win('mid').date || 'Jun 18') },
      m36: { title: '36-week check-in', done: 'Completed · Week 36', due: 'Due · Week 36', body: 'A quick check-in before the year closes' },
      end: { title: 'End-of-year report', done: 'Completed · ' + (win('post').date || 'Sep 24'), due: 'Due ' + (win('post').date || 'Sep 24') },
    };
    // Surveys follow the teacher's real reflections: the first Mirror is the
    // pre-training survey; the post-training survey is done only once they've
    // actually re-taken the reflection (it's never assumed done by the preview).
    const snaps = mirrorSnapshots();
    const postSnap = snaps.find((r) => r.kind === 'post' && !r.sample);
    const shortDate = (iso) => { const t = new Date(iso); return isNaN(t) ? '' : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
    if (snaps[0] && snaps[0].at) DEF.pre.done = 'Completed · ' + shortDate(snaps[0].at);
    if (postSnap) DEF.post.done = 'Completed · ' + shortDate(postSnap.at);
    const journey = ORDER.map((key, i) => {
      const d = DEF[key];
      let st = i < cur ? 'done' : i === cur ? 'active' : 'locked';
      if (key === 'post') st = postSnap ? 'done' : i <= cur ? 'active' : 'locked';
      let body = d.body || '';
      const wk = OBS_WIN[key];
      if (wk && st !== 'locked') {
        const done = nStu - pendingIn(sec.students, wk);
        if (st === 'active' && nStu && done === nStu) st = 'done';
        body = st === 'done' && done === nStu ? 'All ' + countNoun(nStu, 'student', 'students') + ' observed'
          : done + ' of ' + countNoun(nStu, 'student', 'students') + ' observed';
      }
      if (key === 'post' && st === 'done') body = 'Your Teaching Mirror now shows how you’ve changed';
      return { key, title: d.title, meta: st === 'done' ? d.done : st === 'active' ? d.due : 'Locked', body: st === 'locked' ? '' : body, st, obs: !!wk };
    });
    const flower = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="12" r="6.4" fill="${ART.blush}"/><circle cx="31.5" cy="19" r="6.4" fill="${ART.blush}"/><circle cx="27.8" cy="30" r="6.4" fill="${ART.blush}"/><circle cx="16.2" cy="30" r="6.4" fill="${ART.blush}"/><circle cx="12.5" cy="19" r="6.4" fill="${ART.blush}"/><circle cx="22" cy="22" r="6.6" fill="${ART.pollen}"/></svg>`;
    const sprout = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 21v-8" stroke="${ART.sproutStem}" stroke-width="2" stroke-linecap="round"/><path d="M12 13C12 9 9 6 5 6c0 4 3 7 7 7Z" fill="${ART.sproutLime}"/><path d="M12 14c0-3 3-6 7-6 0 4-3 6-7 6Z" fill="${ART.green}"/></svg>`;
    const lock = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="10.5" width="14" height="9.5" rx="2.4" fill="${ART.lock}"/><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="${ART.lock}" stroke-width="2"/></svg>`;
    const nodes = journey.map((j) => {
      const dn = j.st === 'done', active = j.st === 'active';
      const clickable = active || dn;
      const dataAttr = (j.key === 'post' && active) ? 'data-take-reflection="post"'
        : (j.key === 'pre' || j.key === 'post') && dn ? 'data-nav="profile"'
        : active ? 'data-obs-continue="1"' : dn ? 'data-obs-report="1"' : '';
      const marker = dn ? flower : active ? `<div class="obs-marker active">${sprout}</div>` : `<div class="obs-marker lock">${lock}</div>`;
      const badge = dn ? 'Complete' : active ? 'Active' : 'Locked';
      const what = j.title.replace(/ (observations|report)$/, '').toLowerCase();
      const cta = active ? (j.obs ? 'Continue ' + what + ' observations →' : j.key.charAt(0) === 'm' ? 'Start check-in →' : 'Start survey →')
        : (dn && j.obs) ? 'See who&rsquo;s complete →'
        : (dn && (j.key === 'pre' || j.key === 'post')) ? 'See my Teaching Mirror →' : '';
      return `<div class="obs-row">
        <div class="obs-node">${marker}</div>
        <button class="obs-card ${j.st}" ${dataAttr} ${clickable ? '' : 'disabled'}>
          <div class="obs-card-top"><div class="obs-card-title">${esc(j.title)}</div><span class="ui-badge ${dn ? 'done' : active ? 'prog' : 'pend'}">${badge}</span></div>
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
    ys.forEach((y, i) => { if (i === 0) return; const my = (ys[i - 1] + y) / 2; const dir = i % 2 ? -1 : 1; leaves += '<path d="M ' + cx + ' ' + my + ' q ' + (dir * 15) + ' -7 ' + (dir * 26) + ' 3 q ' + (-dir * 12) + ' 7 ' + (-dir * 26) + ' -3 z" fill="' + ART.vineLeaf + '"/>'; });
    return `<div class="obs-vine-svg" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${d}" stroke="${ART.vineStem}" stroke-width="4.5" stroke-linecap="round"/>${leaves}</svg></div>`;
  }

  function obsEnter() {
    const sec = section();
    const e = S.enter;
    const wk = activeWindowKey() || 'baseline';
    const winLabel = ((S.data.windows || []).find((w) => w.key === wk) || {}).label || 'Baseline';
    const left = pendingIn(sec.students, wk);
    if (e.allDone && left > 0 && !e.studentId) e.allDone = false;
    if (e.allDone) {
      return `<div class="obs-alldone">
        <div class="pl">${flowerArt('blossoming', 96, 0)}</div>
        <div class="t">Every child is observed for ${esc(winLabel)} 🌸</div>
        <p>${e.justDone ? esc(e.justDone) + '&rsquo;s observation is saved. ' : ''}No pending teacher observations left.</p>
        <button class="btn btn-primary md focus" data-assesstab="completed">See who&rsquo;s complete →</button>
      </div>`;
    }
    const stu = (e.studentId && sec.students.find((x) => x.id === e.studentId)) || sec.students[0];
    const skills = S.data.skills, sk = skills[e.q], nQ = skills.length;
    const saved = e.justDone ? `<div class="ui-note ok mb-3"><span>✓ ${esc(e.justDone)}&rsquo;s observation is saved — next up: <b>${esc(stu.dispFirst || stu.first)}</b></span></div>` : '';
    // Class progress for this window — completed vs still pending.
    const total = sec.students.length, doneN = total - left;
    const progress = `<div class="obs-prog" title="Teacher observations for ${esc(winLabel)} in ${esc(sec.name)}">
        <div class="obs-prog-txt"><b>${doneN}</b> out of <b>${total}</b> completed <span class="obs-prog-pend">· ${left} pending</span></div>
        <div class="ui-meter obs-prog-bar"><div style="width:${total ? Math.round((doneN / total) * 100) : 0}%"></div></div>
      </div>`;
    const dots = skills.map((_, i) => `<div class="obs-dot" style="background:${i < e.q ? 'var(--green-500)' : i === e.q ? 'var(--lvl-2-soft)' : 'var(--line-200)'}"></div>`).join('');
    const stars = STAR_LABELS.map((lbl, i) => {
      const picked = e.ratings[sk.key] === i + 1;
      const st = Array.from({ length: 4 }, (_, j) => `<svg width="15" height="15" viewBox="0 0 24 24" style="fill:${j <= i ? 'var(--lvl-2-soft)' : 'var(--line-200)'}"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/></svg>`).join('');
      return `<button class="obs-star${picked ? ' on' : ''}" data-star="${i + 1}"><div class="row">${st}</div><div class="lb">${lbl}</div></button>`;
    }).join('');
    const celebrate = e.done ? `<div class="obs-celebrate">${flowerArt('growing', 90, 0)}<div class="msg">${esc(stu.first)}'s plant just got a little taller 🌱</div></div>` : '';
    return `${saved}<div class="obs-enter">
      <div class="obs-enter-head"><span class="pl">${flowerArt(stu.state, 46, 0)}</span><div><div class="nm">${esc(stu.first)}</div><div class="sub">${esc(sec.name)} · ${esc(winLabel)} observation</div></div>${progress}</div>
      <div class="obs-dots">${dots}</div>
      <div class="obs-q">Question ${e.q + 1} of ${nQ} · ${sk.group === 'sel' ? 'Social-Emotional' : 'Cognitive'}</div>
      <div class="obs-skill">${esc(sk.name)}</div>
      <p class="obs-anchor">${esc(OBS_ANCHORS[sk.key])}</p>
      <div class="obs-stars">${stars}</div>
      <div class="obs-nav"><button class="btn-soft focus" data-enter-prev>← Back</button><button class="btn btn-primary md focus" data-enter-next>${e.q >= nQ - 1 ? (left > 1 ? 'Finish → next child' : 'Finish 🌱') : 'Next →'}</button></div>
    </div>${celebrate}`;
  }

  function startEnter(id) { S.assessTab = 'enter'; S.enter = { studentId: id, q: 0, ratings: {}, done: false }; render(); }
  function continueAssess() {
    const sec = section(); const wk = activeWindowKey() || 'baseline';
    const nxt = sec.students.find((s) => !teacherDone(s, wk));
    startEnter(nxt ? nxt.id : sec.students[0].id);
  }
  function pendingIn(list, wk) { return list.filter((s) => !teacherDone(s, wk)).length; }
  // Next child still waiting on a teacher observation in this window: the rest of
  // the current section first (roster order, wrapping), then the other sections.
  function nextPending(curId, wk) {
    const list = section().students;
    const at = list.findIndex((s) => s.id === curId);
    const ordered = list.slice(at + 1).concat(list.slice(0, Math.max(0, at)));
    const hit = ordered.find((s) => s.id !== curId && !teacherDone(s, wk));
    if (hit) return { stu: hit, sectionId: S.sectionId };
    if (S.sectionId === 'all') return null;
    for (const other of S.data.sections) {
      if (other.id === S.sectionId) continue;
      const h = other.students.find((s) => !teacherDone(s, wk));
      if (h) return { stu: h, sectionId: other.id };
    }
    return null;
  }
  // Finish → save this child's observation, then move straight on to the next
  // child with a pending observation until there are none left.
  function finishObservation() {
    const e = S.enter, wk = activeWindowKey() || 'baseline';
    const sec = section();
    const stu = (e.studentId && sec.students.find((x) => x.id === e.studentId)) || sec.students[0];
    if (!stu) return;
    markTeacherDone(stu, wk);
    const key = stu.adm || stu.id;
    const obs = Object.assign({}, S.teacher.observations);
    obs[wk] = Object.assign({}, obs[wk], { [key]: { ratings: Object.assign({}, e.ratings), at: new Date().toISOString() } });
    S.teacher.observations = obs;
    if (window.TilliOnboarding && window.TilliOnboarding.saveObservation) window.TilliOnboarding.saveObservation(wk, key, e.ratings);
    recordTeacherCompletion(stu, wk);
    const who = stu.dispFirst || stu.first;
    const next = nextPending(stu.id, wk);
    if (next) { S.sectionId = next.sectionId; S.enter = { studentId: next.stu.id, q: 0, ratings: {}, done: false, justDone: who }; }
    else S.enter = { studentId: null, q: 0, ratings: {}, done: false, allDone: true, justDone: who };
    render();
  }
  // Mirror the completion into the shared lifecycle store (Teacher lane) so the
  // school/platform admin dashboards count it. Best effort — no-op without a school.
  function recordTeacherCompletion(stu, wk) {
    try {
      const A = window.TilliAPI, sid = schoolId(), phase = PHASE_OF_WIN[wk];
      if (!A || !A.markComplete || !sid || !stu.adm || !phase) return;
      const dep = (A.getDeployments ? A.getDeployments(sid) : []).find((d) => d.phase === phase && d.audience === 'Teacher');
      const list = (dep && dep.assessments && dep.assessments.length) ? dep.assessments : [{ id: 'teacher-observation' }];
      list.forEach((a) => A.markComplete(sid, phase, 'Teacher', stu.adm, a.id, S.teacher.email));
    } catch (err) {}
  }

  // ================= Assess · Completed sub-tab (was "Completion logs") =====
  // Body only — the h1/subtitle/sub-tabs now live in assessView(). Keeps its
  // own inner By-class / By-student / List tabs.
  function assessCompleted() {
    const view = S.logsView;
    const tabs = [['class', 'By class'], ['student', 'By student'], ['list', 'List']]
      .map(([k, l]) => `<button class="ui-filterchip dark logtab${view === k ? ' on' : ''}" data-logview="${k}">${l}</button>`).join('');
    const legend = `<div class="ui-legend log-legend">
      <span><i class="round" style="background:${STATUS_META.done.dot}"></i>Complete</span>
      <span><i class="round" style="background:${STATUS_META.in_progress.dot}"></i>In progress</span>
      <span><i class="round" style="background:${STATUS_META.pending.dot}"></i>Not started</span>
      <span style="color:var(--ink-300)">· 👩‍🏫 Teacher &nbsp; 🏠 Parent &nbsp; 🧒 Student</span></div>`;
    const body = view === 'class' ? logsByClass() : view === 'student' ? logsByStudent() : logsList();
    // History opens the class change-history modal pre-filtered to assessments;
    // hover shows when this class's assessment activity last changed.
    const HU = window.TilliHistory;
    const tip = HU ? HU.lastUpdatedText(sectionHistory(section(), 'assessment')[0], histOpts()) : '';
    const histBtn = HU ? `<button class="btn-line hist-tip focus" data-assess-hist data-tip="${esc(tip)}" aria-label="Assessment history · ${esc(tip)}">🕘 History</button>` : '';
    return `<div class="log-tabs-row"><div class="log-tabs">${tabs}</div>
      <div class="log-actions">${histBtn}
      <button class="btn-line focus" data-csv title="Download the whole assessment log — one row per student, one column per assessment and window">⬇ Download CSV</button></div></div>${legend}${body}`;
  }

  // ---- By class: pick a window (cards) → that window's Completed rate table.
  // "See all windows together" swaps the table for the 3-window matrix.
  // A window is unlocked once it's been deployed: by Tilli (TilliAPI), by the
  // preview state, or because any child already has progress in it.
  const PREVIEW_UNLOCK = { baseline: ['baseline'], between: ['baseline'], midline: ['baseline', 'mid'], endline: ['baseline', 'mid', 'post'] };
  const WIN_OF_PHASE = { Baseline: 'baseline', Midline: 'mid', Endline: 'post' };
  function unlockedWindows(sec) {
    const set = new Set(PREVIEW_UNLOCK[S.windowState] || ['baseline']);
    const A = window.TilliAPI, sid = schoolId();
    if (A && A.getDeployments && sid) A.getDeployments(sid).forEach((d) => { if (WIN_OF_PHASE[d.phase]) set.add(WIN_OF_PHASE[d.phase]); });
    (S.data.windows || []).forEach((w, wi) => {
      if (sec.students.some((st) => ((st.assessLog[wi] || {}).persp || []).some((p) => p.done || p.doneParts > 0))) set.add(w.key);
    });
    return set;
  }
  // S.logsWin: a window key, 'all', or null → default (the open window, else the latest unlocked one).
  function logsWindowKey(unlocked) {
    if (S.logsWin === 'all') return 'all';
    if (S.logsWin && unlocked.has(S.logsWin)) return S.logsWin;
    const act = activeWindowKey();
    if (act && unlocked.has(act)) return act;
    const keys = (S.data.windows || []).map((w) => w.key).filter((k) => unlocked.has(k));
    return keys[keys.length - 1] || 'baseline';
  }
  function winCardsHTML(sec, unlocked, cur) {
    return (S.data.windows || []).map((w, wi) => {
      const total = sec.students.length;
      const done = sec.students.filter((st) => (st.assessLog[wi] || {}).status === 'done').length;
      const locked = !unlocked.has(w.key), on = cur === w.key;
      const all = total > 0 && done === total;
      const badge = locked ? '<span class="ui-badge wc-lock">🔒 Not deployed yet</span>'
        : `<span class="ui-badge ${all ? 'done' : 'prog'}">${all ? 'All complete 🌸' : (total - done) + ' still to go'}</span>`;
      const tip = locked ? w.label + ' opens here once Tilli deploys it.' : 'Show each child’s ' + w.label + ' completion';
      return `<button class="win-card pick${on ? ' on' : ''}${locked ? ' locked' : ''}" data-logwin="${w.key}" aria-pressed="${on}"${locked ? ' aria-disabled="true"' : ''} title="${esc(tip)}">
        <div class="ring">${ringSVG(locked ? 0 : done, total)}</div>
        <div class="wc-meta"><div class="wc-label">${esc(w.label)}</div><div class="wc-sub">${esc(w.sub)} · ${esc(w.date)}</div>${badge}</div></button>`;
    }).join('');
  }
  function logsByClass() {
    const sec = section();
    const unlocked = unlockedWindows(sec);
    const cur = logsWindowKey(unlocked);
    const allOn = cur === 'all';
    const toggle = `<div class="win-pick-foot"><button class="ui-filterchip dark${allOn ? ' on' : ''}" data-logwin="${allOn ? '' : 'all'}" aria-pressed="${allOn}" title="${allOn ? 'Back to one window at a time' : 'Compare Baseline, Mid-year and End of year side by side'}">⊞ See all windows together</button></div>`;
    return `<div class="win-cards">${winCardsHTML(sec, unlocked, allOn ? null : cur)}</div>${toggle}` +
      (allOn ? logsAllWindows(sec) : logsSingleWindow(cur));
  }
  // All three windows side by side (the matrix) — behind "See all windows together".
  function logsAllWindows(sec) {
    const windows = S.data.windows;
    const order = { tending: 0, waiting: 1, growing: 2, blossoming: 3 };
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
      return `<button class="strip-card${on ? ' on' : ''}" data-section="${s.id}"><div class="strip-top"><span class="nm">${esc(s.name)}</span><span class="pct">${pct}%</span></div><div class="ui-meter strip-bar"><div style="width:${pct}%"></div></div><div class="strip-cap">${fully} of ${n} fully assessed</div></button>`;
    }).join('');
    return `<div class="mtx-wrap"><div class="mtx"><div class="mtx-head"><div class="ui-eyebrow mtx-corner">Student</div>${head}</div>${rows}</div></div>
      <div class="ui-eyebrow log-strip-title">Your classes at a glance</div>
      <div class="strip-grid">${strip}</div>`;
  }

  // One window: each child's completion per informant (Teacher · Parent · Student).
  function logsSingleWindow(wk) {
    const sec = section();
    const w = (S.data.windows || []).find((x) => x.key === wk) || { label: wk, sub: '', date: '' };
    const P = S.data.perspectives || [];
    const tick = '<svg class="cr-tick" width="20" height="20" viewBox="0 0 24 24" aria-label="Complete"><circle cx="12" cy="12" r="11" style="fill:var(--green-500)"/><path d="M7 12.5l3.2 3.2L17 9" style="stroke:var(--white)" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const head = P.map((p) => `<div class="cr-h" title="${esc(p.label === 'Parent' ? 'Parent questionnaires (home)' : p.label === 'Student' ? 'Student direct tasks' : 'Teacher observation')}"><span class="ic">${p.icon}</span><span class="ui-eyebrow lb">${esc(p.label === 'Parent' ? 'Parent (Home)' : p.label)}</span></div>`).join('');
    const order = { tending: 0, waiting: 1, growing: 2, blossoming: 3 };
    const sorted = [...sec.students].sort((a, b) => (order[a.state] - order[b.state]) || a.name.localeCompare(b.name));
    const rows = sorted.map((st) => {
      const lw = logOf(st, wk) || { persp: [] };
      const cells = P.map((p) => {
        const e = lw.persp.find((x) => x.key === p.key) || { doneParts: 0, totalParts: 1, done: false };
        // zero = nothing started yet → muted, so started / finished cells stand out.
        return `<div class="cr-cell${e.done ? ' done' : e.doneParts ? '' : ' zero'}"><b>${e.doneParts}/${e.totalParts}</b>${e.done ? tick : ''}</div>`;
      }).join('');
      return `<button class="cr-row" data-log-open="${esc(st.id)}"><div class="mtx-name"><span class="dot" style="background:${STATE_DOT[st.state]}"></span><span>${esc(st.dispFirst)}</span></div>${cells}</button>`;
    }).join('');
    const strip = S.data.sections.map((s) => {
      const n = s.students.length;
      const fully = s.students.filter((st) => (logOf(st, wk) || {}).status === 'done').length;
      const pct = n ? Math.round((fully / n) * 100) : 0;
      const on = s.id === S.sectionId;
      return `<button class="strip-card${on ? ' on' : ''}" data-section="${s.id}"><div class="strip-top"><span class="nm">${esc(s.name)}</span><span class="pct">${pct}%</span></div><div class="ui-meter strip-bar"><div style="width:${pct}%"></div></div><div class="strip-cap">${fully} of ${n} complete for ${esc(w.label)}</div></button>`;
    }).join('');
    return `<div class="cr-wrap">
        <div class="cr-title">Completed rate <span>· ${esc(w.label)} — ${esc(w.sub)}</span></div>
        <div class="cr"><div class="cr-head"><div class="ui-eyebrow mtx-corner">Student</div>${head}</div>${rows}</div>
      </div>
      <div class="ui-eyebrow log-strip-title">Your classes at a glance</div>
      <div class="strip-grid">${strip}</div>`;
  }

  // Whole assessment log → CSV, in the platform's "assessment-logs" export
  // format: one row per student, one column per instrument × window
  // ("Memory Game (PRE)"), values Completed / In Progress / Not Started.
  // Each informant's parts (INFORMANT_PARTS) map, in order, onto the
  // instruments below — keep the list lengths in step with INFORMANT_PARTS.
  const CSV_INSTRUMENTS = {
    student: ['Student IDELA Direct Assessment', 'Emotion Matching Task', 'Memory Game', 'Hearts & Flowers', 'Emotion Matching Task 2'],
    parent: ['Parent Assessment Demographic + Foundational Skills (IND)', 'Parent Behavioral Survey'],
    teacher: ['Behavioral Report'],
  };
  const CSV_PHASE = { baseline: 'PRE', mid: 'MID', post: 'POST' };
  function downloadCSV() {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const wins = S.data.windows || [];
    const order = ['student', 'parent', 'teacher'];
    const instruments = (key, n) => {
      const list = CSV_INSTRUMENTS[key] || [];
      return Array.from({ length: n }, (_, i) => list[i] || (key.charAt(0).toUpperCase() + key.slice(1) + ' Assessment ' + (i + 1)));
    };
    // Column plan from the first student's log (every student shares the shape).
    const any = S.data.sections.flatMap((x) => x.students).find((st) => st.assessLog);
    const cols = [];
    wins.forEach((w) => {
      const lw = any && any.assessLog.find((x) => x.key === w.key);
      order.forEach((k) => {
        const pe = lw && lw.persp.find((x) => x.key === k);
        const n = (pe && pe.totalParts) || (CSV_INSTRUMENTS[k] || []).length || 1;
        instruments(k, n).forEach((name, i) => cols.push({ win: w.key, key: k, i, label: name + ' (' + (CSV_PHASE[w.key] || w.label) + ')' }));
      });
    });
    const sc = window.TilliAPI && window.TilliAPI.resolveSchool ? window.TilliAPI.resolveSchool(S.teacher.school || '') : null;
    const board = (sc && sc.board) || '';
    const cell = (st, c) => {
      const lw = (st.assessLog || []).find((x) => x.key === c.win);
      const pe = lw && lw.persp.find((x) => x.key === c.key);
      const done = pe ? (pe.doneParts != null ? pe.doneParts : (pe.done ? (pe.totalParts || 1) : 0)) : 0;
      const total = (pe && pe.totalParts) || 1;
      if (c.i < done) return 'Completed';
      if (c.i === done && done > 0 && done < total) return 'In Progress';
      return 'Not Started';
    };
    const rows = [];
    S.data.sections.forEach((sec) => {
      const gs = (sec.grade || '') + (sec.section ? ' - ' + sec.section : '');
      [...sec.students].sort((a, b) => (a.last || '').localeCompare(b.last || '') || (a.first || '').localeCompare(b.first || ''))
        .forEach((st) => rows.push([gs, board, st.adm || '', st.name].concat(cols.map((c) => cell(st, c)))));
    });
    const head = ['Grade + Section', 'Board', 'Admission Number', 'Student Name'].concat(cols.map((c) => c.label));
    const csv = [head].concat(rows).map((r) => r.map(q).join(',')).join('\n') + '\n';
    const file = String((sc && sc.name) || S.teacher.school || 'Tilli').trim().replace(/[^A-Za-z0-9]+/g, '_') + '-assessment-logs.csv';
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), file);
  }
  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
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
      return `<button class="ui-filterchip solid${on ? ' on' : ''}" data-log-pick="${esc(st.id)}">${esc(st.dispFirst)}</button>`;
    }).join('');
    let detail = '';
    if (active) {
      const pct = Math.round((active.perspDone / 9) * 100);
      const timeline = active.assessLog.map((w) => {
        const ss = STATUS_META[w.status];
        const persp = w.persp.map((p) => `<div class="tl-persp${p.done ? ' done' : ''}"><span class="ic">${p.icon}</span><div><div class="nm">${esc(p.label)}</div><div class="st">${p.done ? 'Done · ' + w.date : 'Waiting'}</div></div></div>`).join('');
        return `<div class="tl-row"><div class="tl-dot-wrap"><div class="tl-dot" style="background:${ss.dot};box-shadow:0 0 0 4px ${ss.bg}"></div><div class="tl-line"></div></div>
          <div class="tl-card"><div class="tl-top"><div><div class="l">${esc(w.label)}</div><div class="s">${esc(w.sub)} · ${esc(w.date)}</div></div><span class="ui-badge ${ss.cls}">${ss.label}${w.status === 'done' ? '' : ' · ' + w.doneCount + '/3'}</span></div>
          <div class="tl-persps">${persp}</div>
          ${w.status !== 'done' ? `<button class="btn-ask-a inline focus" data-log-continue="${esc(active.id)}">Continue this assessment →</button>` : ''}</div></div>`;
      }).join('');
      detail = `<div class="logstu-head"><span class="pl">${flowerArt(active.state, 60, 0)}</span>
        <div class="m"><h2 class="stu-name" style="font-size:var(--fs-xl)">${esc(active.name)}</h2><div class="stu-sub">${esc(sec.name)} · ${active.perspDone} of 9 check-ins done</div><div class="ui-meter logstu-bar"><div style="width:${pct}%"></div></div></div>
        <button class="btn-soft green focus" data-open-student="${esc(active.id)}">Open full profile →</button></div>
        <div class="tl">${timeline}</div>`;
    }
    return `<div class="roster-search mb-3">${SEARCH_ICON}<input id="log-stu-search" value="${esc(S.logStudentSearch)}" placeholder="Find a student…" autocomplete="off"></div>
      <div class="stu-picker">${chips}</div>${detail}`;
  }

  function logsList() {
    const sec = section();
    const q = S.logListSearch.toLowerCase();
    const filter = S.logListFilter;
    const filters = [['all', 'All'], ['pending', 'Pending'], ['complete', 'Complete']]
      .map(([k, l]) => `<button class="ui-filterchip dark logfilter${filter === k ? ' on' : ''}" data-logfilter="${k}">${l}</button>`).join('');
    let rows = sec.students.filter((st) => st.name.toLowerCase().includes(q));
    if (filter === 'pending') rows = rows.filter((st) => st.windowsDone < 3);
    else if (filter === 'complete') rows = rows.filter((st) => st.windowsDone === 3);
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const body = rows.length ? rows.map((st) => {
      const cells = st.assessLog.map((w) => { const ss = STATUS_META[w.status]; return `<div><span class="ui-badge ${ss.cls}"><span class="d"></span>${ss.label}</span></div>`; }).join('');
      const pct = Math.round((st.windowsDone / 3) * 100);
      return `<button class="list-row" data-log-open="${esc(st.id)}"><div class="list-name"><span class="dot" style="background:${STATE_DOT[st.state]}"></span><span>${esc(st.name)}</span></div>${cells}<div class="list-prog"><div class="ui-meter pb"><div style="width:${pct}%"></div></div><span>${st.windowsDone}/3</span></div></button>`;
    }).join('') : '<div class="ui-empty">No students match that filter 🌱</div>';
    return `<div class="roster-tools">
      <div class="roster-search">${SEARCH_ICON}<input id="log-list-search" value="${esc(S.logListSearch)}" placeholder="Search a student…" autocomplete="off"></div>
      <div class="roster-sort"><span>Show</span>${filters}</div></div>
      <div class="list-table"><div class="ui-eyebrow dark list-head"><div>Student</div><div>Baseline</div><div>Mid-year</div><div>End of year</div><div class="text-right">Progress</div></div>${body}</div>`;
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
    // No baseline yet → show the overview on clearly-labelled sample data (the
    // 'between' preview of this class) instead of an empty page. To confirm with
    // product; insPreBaseline stays as the fallback.
    if (!meas.baseline && window.TilliDashData && !S._insSample) {
      const real = S.data;
      S.data = window.TilliDashData.previewData(S.baseData, 'between');
      S._insSample = true;
      try { return insightsView(); } finally { S.data = real; S._insSample = false; }
    }
    if (!meas.baseline) return insPreBaseline(scope);

    if (S.insightsView === 'compare' && !canCompare()) S.insightsView = 'myclass';
    const view = ['myclass', 'perspectives', 'compare'].indexOf(S.insightsView) >= 0 ? S.insightsView : 'myclass';
    const tabDefs = [['myclass', 'My class'], ['perspectives', 'Perspectives']];
    if (canCompare()) tabDefs.push(['compare', 'Compare my sections']);
    const tabs = tabDefs.map(([k, l]) => `<button class="ui-filterchip dark intab${view === k ? ' on' : ''}" data-inview="${k}" role="tab" aria-selected="${view === k}">${l}</button>`).join('');

    const stats = skillStatsFor(scope.students);
    let body = '';
    if (view === 'myclass') body = insMyClass(stats, meas, scope);
    else if (view === 'perspectives') body = insPerspectives(stats, scope);
    else body = insCompare();

    return `<div class="dash-wrap" style="max-width:1040px">
      <h1 class="dash-h1">Insights</h1>
      <p class="dash-sub">A quiet place to plan — where ${esc(scope.name)} is strong, growing, and ready for focus.</p>
      ${S._insSample ? '<div class="ui-note sample mt-3">🌱 Sample view — your class&rsquo;s real insights replace this once Baseline is complete.</div>' : ''}
      <div class="log-tabs mt-4" role="tablist">${tabs}</div>
      ${body}
    </div>`;
  }

  // Whole-page pre-baseline state.
  function insPreBaseline(scope) {
    return `<div class="dash-wrap" style="max-width:640px">
      <h1 class="dash-h1">Insights</h1>
      <div class="ui-empty empty-hero">
        <div class="empty-plant">${flowerArt('waiting', 92, 0)}</div>
        <h2 class="ui-empty-t">Your first insights arrive after baseline 🌱</h2>
        <p class="ui-empty-b">Once ${esc(scope.name)} has its Baseline window in, this page fills with where your class is strong, where to focus, and how they grow across the year. Nothing to read yet — and that's honest, not broken.</p>
        <div class="actions"><button class="btn btn-primary md focus" data-nav="assess">Go to Baseline</button></div>
      </div>
    </div>`;
  }

  // --- Sub-tab 1: My class ---------------------------------------------------
  function insMyClass(stats, meas, scope) {
    // Growth over time + Every skill up close only make sense once there is a
    // second point to compare: Midline (or later) deployed or assessed.
    const later = S.windowState === 'midline' || S.windowState === 'endline' || meas.mid || meas.post;
    return `${classOverviewCard(stats, scope)}
      ${later ? progressCard(stats, meas) + breakdownCard(stats, meas) : ''}`;
  }

  // a) Class Skill Overview — per skill, how the class splits across
  // Beginner / Learner / Expert. The 3 boxes count SKILLS by their largest
  // group; tap a box to filter, tap a skill row for the student breakdown.
  const OV_BANDS = [
    { band: 'Beginner', label: 'Needs attention', n: 1 },
    { band: 'Learner', label: 'Developing', n: 2 },
    { band: 'Expert', label: 'Strong', n: 3 },
  ];
  function classOverviewCard(stats, scope) {
    const N = scope.students.length;
    const notAssessed = scope.students.filter((s) => s.state === 'waiting').length;
    const meta = (b) => OV_BANDS.find((x) => x.band === b) || OV_BANDS[1];
    const boxes = OV_BANDS.map((b) => {
      const n = stats.filter((s) => s.plurality === b.band).length;
      const on = S.ovBand === b.band;
      return `<button class="ov-box ov-l${b.n}${on ? ' on' : ''}${S.ovBand && !on ? ' dim' : ''} focus" data-ov-band="${b.band}" aria-pressed="${on}" title="${on ? 'Show all skills' : 'Show only skills where most students are ' + b.band}">
        <span class="ov-count">${n}</span>
        <span class="ov-title">${b.label}</span>
        <span class="ov-sub">Most students are ${b.band}</span>
      </button>`;
    }).join('');
    const rank = { Beginner: 0, Learner: 1, Expert: 2 };
    const rows = stats
      .filter((s) => !S.ovBand || s.plurality === S.ovBand)
      .sort((a, b) => (rank[a.plurality] - rank[b.plurality]) || ((b.counts.Beginner / (b.total || 1)) - (a.counts.Beginner / (a.total || 1))) || ((a.counts.Expert / (a.total || 1)) - (b.counts.Expert / (b.total || 1))))
      .map((s) => {
        const t = s.total || 1, m = meta(s.plurality), open = S.ovSkill === s.key;
        const seg = (b, n) => s.counts[b] ? `<span class="ov-seg" style="width:${(s.counts[b] / t) * 100}%;background:var(--lvl-${n})" title="${s.counts[b]} ${b}"></span>` : '';
        return `<div class="ov-row${open ? ' open' : ''}">
          <button class="ov-rowbtn focus" data-ov-skill="${esc(s.key)}" aria-expanded="${open}">
            <span class="ov-name">${esc(s.name)}</span>
            <span class="ov-bar">${seg('Beginner', 1)}${seg('Learner', 2)}${seg('Expert', 3)}</span>
            <span class="ov-status ov-st-l${m.n}"><i></i>${m.label}</span>
            <span class="ov-chev" aria-hidden="true">›</span>
          </button>
          ${open ? ovBreakdown(s, scope) : ''}
        </div>`;
      }).join('') || '<div class="ui-empty">No skills in this group right now.</div>';
    return `<div class="ui-card ins-card ov mt-4">
      <div class="ov-headrow">
        <div>
          <div class="ov-h">Class Skill Overview</div>
          <div class="ov-lead">How your class is doing on each skill</div>
          <p class="ov-desc">For every skill, we grouped your students into Beginner, Learner, and Expert. The colour is whichever group is largest, so green means most of your class is at Expert, not all of them.</p>
        </div>
        <span class="ov-scope"><i></i>${esc(scope.name)} · ${countNoun(N, 'student', 'students')}</span>
      </div>
      <div class="ov-boxes">${boxes}</div>
      ${notAssessed ? `<div class="ov-note">${countNoun(notAssessed, 'student', 'students')} not assessed yet</div>` : ''}
      <div class="ov-hint">👆 <b>Tap a box</b> to see just those skills · <b>tap a skill</b> for the student breakdown</div>
      <div class="ui-legend ov-legend"><span><i style="background:var(--lvl-1)"></i>Beginner</span><span><i style="background:var(--lvl-2)"></i>Learner</span><span><i style="background:var(--lvl-3)"></i>Expert</span></div>
      <div class="ov-list">${rows}</div>
    </div>`;
  }
  // Which students sit in each band for one skill (assessed students only).
  function ovBreakdown(stat, scope) {
    const by = { Beginner: [], Learner: [], Expert: [] };
    scope.students.filter((s) => s.state !== 'waiting').forEach((st) => {
      const sk = st.skills.find((x) => x.key === stat.key);
      if (sk && by[sk.band]) by[sk.band].push(st);
    });
    const col = (b) => {
      const m = OV_BANDS.find((x) => x.band === b);
      const list = by[b].sort((x, y) => x.name.localeCompare(y.name));
      return `<div class="ov-bcol">
        <div class="ov-bh"><i style="background:var(--lvl-${m.n})"></i>${b} <span>${list.length}</span></div>
        ${list.length ? list.map((st) => `<button class="ov-stu focus" data-open-student="${esc(st.id)}" title="Open ${esc(st.name)}">${esc(st.name)}</button>`).join('') : '<div class="ov-bnone">—</div>'}
      </div>`;
    };
    return `<div class="ov-break">${col('Beginner')}${col('Learner')}${col('Expert')}
      <div class="ov-bfoot"><button class="btn-soft green focus" data-ask="build" data-skill="${esc(stat.name)}" data-band="${stat.plurality}">Ask Tilli how to build ${esc(stat.name)} →</button></div>
    </div>`;
  }

  // b) Growth over time — ONE line chart, filtered: Overview (SEL vs EF
  // averages), a whole group (its 6 skills), or a single skill against the
  // class average. Windows not measured yet have no point (the line stops).
  // Colours: validated categorical slots, fixed per entity (never by rank).
  const GROWTH_COLORS = TP.GROWTH;   // exact-hex chart series (TilliPalette)
  function growthSeries(stats, meas) {
    const phases = phaseMeta();
    const f = S.growthFilter || 'overview';
    const avg = (list, field) => Math.round(list.reduce((a, x) => a + (x[field] || 0), 0) / (list.length || 1));
    const vals = (fn) => phases.map((p) => (meas[p.win] ? fn(p.field) : null));
    const group = (g) => stats.filter((x) => x.group === g);
    if (f === 'sel' || f === 'cog') {
      return group(f).map((x, i) => ({ name: x.name, color: GROWTH_COLORS[i % GROWTH_COLORS.length], vals: vals((fl) => x[fl]) }));
    }
    const one = stats.find((x) => x.key === f);
    if (one) {
      return [
        { name: one.name, color: GROWTH_COLORS[0], vals: vals((fl) => one[fl]) },
        { name: 'Class average (all skills)', color: TP.css('--ink-300'), dashed: true, vals: vals((fl) => avg(stats, fl)) },
      ];
    }
    return [
      { name: 'Social-Emotional', color: GROWTH_COLORS[0], vals: vals((fl) => avg(group('sel'), fl)) },
      { name: 'Executive Function', color: GROWTH_COLORS[1], vals: vals((fl) => avg(group('cog'), fl)) },
    ];
  }
  const GROWTH_GEO = { W: 680, H: 300, L: 46, R: 150, T: 18, B: 46 };
  function growthX(i) { const g = GROWTH_GEO; return g.L + 30 + i * ((g.W - g.L - g.R - 60) / 2); }
  function growthY(v) { const g = GROWTH_GEO; return g.T + (1 - v / 100) * (g.H - g.T - g.B); }
  function growthSVG(series, phases, meas, partial) {
    const g = GROWTH_GEO, x = growthX, y = growthY;
    let grid = '';
    [0, 33, 67, 100].forEach((v) => {
      grid += `<line x1="${g.L}" x2="${g.W - g.R + 20}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line-200)" stroke-width="1"${v === 33 || v === 67 ? ' stroke-dasharray="4 5"' : ''}/>`;
      grid += `<text class="svg-t" x="${g.L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" style="fill:var(--ink-300)" font-weight="600">${v}%</text>`;
    });
    // band names sit in the left gutter of each zone (recessive)
    [['Beginner', 16], ['Learner', 50], ['Expert', 84]].forEach(([lb, v]) => {
      grid += `<text class="svg-t" x="${g.L + 6}" y="${y(v) + 4}" font-size="11" style="fill:var(--ink-300);opacity:.6" font-weight="700" letter-spacing=".04em">${lb.toUpperCase()}</text>`;
    });
    const axis = phases.map((p, i) => {
      const on = meas[p.win];
      return `${on ? '' : `<line x1="${x(i)}" x2="${x(i)}" y1="${g.T}" y2="${g.H - g.B}" style="stroke:var(--line-200)" stroke-width="1.5" stroke-dasharray="3 5"/>`}
        <text class="svg-t" x="${x(i)}" y="${g.H - g.B + 20}" text-anchor="middle" font-size="13" font-weight="700" style="fill:${on ? 'var(--ink-600)' : 'var(--ink-300)'}">${esc(p.meta.label)}</text>
        ${on && !(partial && partial[p.win]) ? '' : `<text class="svg-t" x="${x(i)}" y="${g.H - g.B + 35}" text-anchor="middle" font-size="11" font-weight="600" style="fill:${on ? 'var(--lvl-2-ink)' : 'var(--ink-300)'}">${on ? 'in progress' : 'not yet'}</text>`}`;
    }).join('');
    const lines = series.map((sr) => {
      const pts = sr.vals.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
      const d = pts.map((pt, k) => (k ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
      const dots = pts.map((pt) => `<circle cx="${pt[0]}" cy="${pt[1]}" r="5" fill="${sr.color}" style="stroke:var(--white)" stroke-width="2"/>`).join('');
      return `<g>${pts.length > 1 ? `<path d="${d}" fill="none" stroke="${sr.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${sr.dashed ? ' stroke-dasharray="5 5"' : ''}/>` : ''}${dots}</g>`;
    }).join('');
    // Direct labels at each line's last point (≤ 4 series), nudged apart.
    let labels = '';
    if (series.length <= 4) {
      const ends = series.map((sr) => {
        let li = -1; sr.vals.forEach((v, i) => { if (v != null) li = i; });
        return li < 0 ? null : { sr, i: li, yy: y(sr.vals[li]) };
      }).filter(Boolean).sort((a, b) => a.yy - b.yy);
      for (let k = 1; k < ends.length; k++) if (ends[k].yy - ends[k - 1].yy < 15) ends[k].yy = ends[k - 1].yy + 15;
      labels = ends.map((e) => `<text class="svg-t" x="${x(e.i) + 12}" y="${e.yy + 4}" font-size="11" font-weight="700" style="fill:var(--ink-700)">${esc(e.sr.name)} · ${e.sr.vals[e.i]}%</text>`).join('');
    }
    return `<svg class="gr-svg" viewBox="0 0 ${g.W} ${g.H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Growth over time line chart">
      ${grid}${axis}
      <line class="gr-cross" x1="0" x2="0" y1="${g.T}" y2="${g.H - g.B}" style="stroke:var(--ink-300)" stroke-width="1" visibility="hidden"/>
      ${lines}${labels}
      <rect class="gr-hit" x="${g.L}" y="0" width="${g.W - g.L - g.R + 40}" height="${g.H - g.B + 10}" fill="transparent"/>
    </svg>`;
  }
  function progressCard(stats, measured) {
    const phases = phaseMeta();
    const f = S.growthFilter || 'overview';
    // Plot a window once it's measured, or while it's the open window (in progress).
    const live = activeWindowKey();
    const meas = {}, partial = {};
    phases.forEach((p) => { meas[p.win] = !!measured[p.win] || live === p.win; partial[p.win] = !measured[p.win] && live === p.win; });
    const series = growthSeries(stats, meas);
    S._growth = { series, phases: phases.map((p) => p.meta.label) };   // read by the hover layer (wire)
    const pill = (k, l) => `<button class="ui-filterchip dark${f === k ? ' on' : ''}" data-growth="${k}">${l}</button>`;
    const isSkill = !['overview', 'sel', 'cog'].includes(f);
    const skillSel = `<select class="ui-filterchip dark gr-select focus" data-growth-skill aria-label="Show one skill">
        <option value=""${isSkill ? '' : ' selected'}>One skill…</option>
        ${stats.map((x) => `<option value="${esc(x.key)}"${f === x.key ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}
      </select>`;
    const legend = series.length >= 2 ? `<div class="ui-legend gr-legend">${series.map((sr) =>
      `<span><i style="border-top:2px ${sr.dashed ? 'dashed' : 'solid'} ${sr.color}"></i>${esc(sr.name)}</span>`).join('')}</div>` : '';
    const table = `<table class="ui-table compact gr-table"><thead><tr><th>${isSkill || f === 'overview' ? 'Series' : 'Skill'}</th>${phases.map((p) => `<th>${esc(p.meta.label)}</th>`).join('')}</tr></thead>
      <tbody>${series.map((sr) => `<tr><td><i style="background:${sr.color}"></i>${esc(sr.name)}</td>${sr.vals.map((v) => `<td>${v == null ? '—' : v + '%'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const pending = phases.filter((p) => !meas[p.win]);
    const note = pending.length
      ? `<div class="ui-note mt-3">🕒 ${pending.map((p) => `${esc(p.meta.label)}${p.meta.date ? ' opens ' + esc(p.meta.date) : ' hasn\'t opened yet'}`).join(' · ')}</div>` : '';
    return `<div class="ui-card ins-card mt-4">
      <div class="ins-h">Growth over time</div>
      <div class="ins-sub">Class average per skill at Baseline → Mid-year → End of year. Filter to compare groups or follow one skill.</div>
      <div class="gr-filters">
        ${pill('overview', 'Overview')}${pill('sel', 'Social-Emotional')}${pill('cog', 'Executive Function')}${skillSel}
        <button class="gr-view focus" data-growth-table title="Switch between the chart and a table of the same numbers">${S.growthTable ? '📈 Chart view' : '▦ Table view'}</button>
      </div>
      ${S.growthTable ? table : `${legend}<div class="gr-wrap" tabindex="0" aria-label="Growth chart — use left and right arrows to read each window">${growthSVG(series, phases, meas, partial)}<div class="ui-tip gr-tip" hidden></div></div>`}
      ${note}
      <div class="ins-foot"><button class="btn-soft green focus" data-ask-ins="grow">Ask Tilli what to do with this →</button></div>
    </div>`;
  }
  // Hover / keyboard readout: crosshair snaps to the nearest window, one tooltip
  // lists every series there (values lead). Built with textContent.
  function wireGrowth() {
    const wrap = root.querySelector('.gr-wrap');
    const G = S._growth;
    if (!wrap || !G) return;
    const svg = wrap.querySelector('svg'), cross = svg.querySelector('.gr-cross'), tip = wrap.querySelector('.gr-tip');
    const show = (i) => {
      const xs = growthX(i);
      cross.setAttribute('x1', xs); cross.setAttribute('x2', xs); cross.setAttribute('visibility', 'visible');
      tip.textContent = '';
      const h = document.createElement('div'); h.className = 'ui-eyebrow gr-tip-h'; h.textContent = G.phases[i]; tip.appendChild(h);
      G.series.map((sr) => ({ sr, v: sr.vals[i] })).sort((a, b) => (b.v == null ? -1 : b.v) - (a.v == null ? -1 : a.v)).forEach(({ sr, v }) => {
        const row = document.createElement('div'); row.className = 'gr-tip-r';
        const key = document.createElement('i'); key.style.borderTop = '2px ' + (sr.dashed ? 'dashed ' : 'solid ') + sr.color;
        const val = document.createElement('b'); val.textContent = v == null ? 'not yet' : v + '%';
        const nm = document.createElement('span'); nm.textContent = sr.name;
        row.appendChild(key); row.appendChild(val); row.appendChild(nm); tip.appendChild(row);
      });
      tip.hidden = false;
      const box = svg.getBoundingClientRect(), scale = box.width / GROWTH_GEO.W;
      const left = xs * scale + 14;
      tip.style.left = (left + tip.offsetWidth > box.width ? xs * scale - tip.offsetWidth - 14 : left) + 'px';
      tip.style.top = '8px';
      wrap.dataset.i = i;
    };
    const hide = () => { cross.setAttribute('visibility', 'hidden'); tip.hidden = true; };
    const nearest = (clientX) => {
      const box = svg.getBoundingClientRect(), sx = (clientX - box.left) * (GROWTH_GEO.W / box.width);
      let best = 0; [0, 1, 2].forEach((i) => { if (Math.abs(growthX(i) - sx) < Math.abs(growthX(best) - sx)) best = i; });
      return best;
    };
    svg.querySelector('.gr-hit').addEventListener('pointermove', (e) => show(nearest(e.clientX)));
    svg.addEventListener('pointerleave', hide);
    wrap.addEventListener('focus', () => show(+(wrap.dataset.i || 0)));
    wrap.addEventListener('blur', hide);
    wrap.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      show(Math.max(0, Math.min(2, +(wrap.dataset.i || 0) + (e.key === 'ArrowRight' ? 1 : -1))));
    });
  }
  function shortWin(label) { return label === 'Mid-year' ? 'Mid' : label === 'End of year' ? 'End' : 'Base'; }

  // c) Detailed skill breakdown — one card per skill, SEL / EF toggle.
  function breakdownCard(stats, meas) {
    const g = S.skillGroup === 'cog' ? 'cog' : 'sel';
    const toggle = `<div class="sb-toggle" role="tablist">
      <button class="ui-filterchip dark${g === 'sel' ? ' on' : ''}" data-skillgroup="sel" role="tab" aria-selected="${g === 'sel'}">Social-Emotional</button>
      <button class="ui-filterchip dark${g === 'cog' ? ' on' : ''}" data-skillgroup="cog" role="tab" aria-selected="${g === 'cog'}">Executive Function</button></div>`;
    const phases = phaseMeta();
    const cards = stats.filter((s) => s.group === g).map((s) => {
      const prog = phases.map((p) => meas[p.win]
        ? `<div class="scph"><span class="scph-l">${esc(shortWin(p.meta.label))}</span><span class="scph-v">${s[p.field]}%</span></div>`
        : `<div class="scph scph-empty"><span class="scph-l">${esc(shortWin(p.meta.label))}</span><span class="scph-v">—</span></div>`).join('');
      return `<button class="sb-card focus" data-ask="build" data-skill="${esc(s.name)}" data-band="${s.plurality}" aria-label="Ask Tilli how to build ${esc(s.name)}">
        <div class="sb-top"><span class="sb-name">${esc(s.name)}</span><span class="ui-tag ${g === 'sel' ? 'cyan' : 'sb-tag-cog'}">${groupLabel(g)}</span></div>
        <div class="scprog">${prog}</div>
        <span class="sb-ask">Ask Tilli how to build this →</span>
      </button>`;
    }).join('');
    return `<div class="ui-card ins-card mt-4">
      <div class="ins-h">Every skill, up close</div>
      <div class="ins-sub">Tap a skill for a Tilli idea to build it.</div>
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
      <div class="ui-card ins-card mt-4">
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
        <button class="btn-soft green focus" data-ask="persp" data-skill="${esc(s.name)}" data-hi="${esc(s.hiKey)}" data-lo="${esc(s.loKey)}">Ask Tilli why this happens →</button>
      </div>`;
    }).join('');
    return `<div class="ui-card ins-card">
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
      ? `<div class="log-tabs">${grades.map((g) => `<button class="ui-filterchip dark${g.grade === active.grade ? ' on' : ''}" data-cmpgrade="${esc(g.grade)}">${esc(g.grade)}</button>`).join('')}</div>` : '';
    const secs = active.sections;
    const secStats = secs.map((sec) => ({ sec, stats: skillStatsFor(sec.students) }));
    const cols = `repeat(${secs.length}, minmax(0,1fr))`;

    const head = `<div class="cmp2-row cmp2-head"><div class="cmp2-skill"></div><div class="cmp2-cells" style="grid-template-columns:${cols}">${secs.map((sec) => `<div class="cmp2-secname">${esc(sec.name)}</div>`).join('')}</div></div>`;
    const rows = S.data.skills.map((sk) => {
      const cells = secStats.map(({ stats }) => {
        const v = (stats.find((x) => x.key === sk.key) || {}).post || 0;
        return `<div class="cmp2-cell"><div class="ui-meter light cmp2-mini"><div class="bs-fill-${toneOf(v)}" style="width:${Math.max(4, v)}%"></div></div><span>${v}%</span></div>`;
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
    const prompts = diffs.length ? `<div class="wcl-list mt-4">${diffs.map((d) => `<div class="wcl-item">
      <div class="wcl-skill">${esc(d.name)} <span class="wcl-gap">${esc(d.hi.sec.name)} +${d.gap}</span></div>
      <p class="wcl-text">${esc(d.hi.sec.name)} is ahead of ${esc(d.lo.sec.name)} on ${esc(d.name)}. What's working in ${esc(d.hi.sec.name)} that could help ${esc(d.lo.sec.name)}?</p>
      <button class="btn-soft green focus" data-ask="cmp" data-skill="${esc(d.name)}" data-hi="${esc(d.hi.sec.name)}" data-lo="${esc(d.lo.sec.name)}">Ask Tilli for an activity to bring to ${esc(d.lo.sec.name)} →</button>
    </div>`).join('')}</div>` : '';

    return `<div class="persp-note green">Two of your own classes, side by side. This is for learning from yourself — what's working in one room you could carry to the other. Never a ranking. 🌿</div>
      ${gsel}
      <div class="ui-card ins-card">
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
  // The child's unique Tilli Measures code. Carried on the roster record when
  // known, else looked up / derived from the guard layer by admission number.
  function uidOf(stu) {
    if (!stu) return '';
    if (stu.uid) return stu.uid;
    let u = '';
    try {
      const A = window.TilliAPI, sid = schoolId();
      if (A && sid && stu.adm) {
        const rec = A.getStudent ? A.getStudent(sid, stu.adm) : null;
        u = (rec && rec.uid) || (A.makeUid ? A.makeUid(sid, stu.adm) : '');
      }
    } catch (e) {}
    if (u) stu.uid = u;
    return u;
  }
  function uidChip(stu, small) {
    const u = uidOf(stu);
    return u ? `<span class="ui-tag green uid-chip${small ? ' sm' : ''}" title="Student UID — this child's unique Tilli Measures code">${esc(u)}</span>` : '';
  }
  function uidLine(stu) {
    const chip = uidChip(stu);
    return chip ? `<div class="stu-sub stu-uid">Student UID ${chip}</div>` : '';
  }

  // ================= Add student flow =================
  // Grade · section is chosen once for the whole batch (an existing section, or
  // a new one). Every planted child lands in it — in the dashboard right away
  // and in the teacher's saved roster (TilliOnboarding.appendStudents).
  function openAddFlow() {
    const secs = S.baseData.sections;
    const sid = (S.sectionId && S.sectionId !== 'all' && secs.some((x) => x.id === S.sectionId)) ? S.sectionId : ((secs[0] || {}).id || 'new');
    S.add = { active: true, step: 'count', from: S.nav, sectionId: sid, newGrade: '', newSection: '', count: '', total: 0, done: 0, first: '', last: '', adm: '', results: [] };
    render();
  }
  // The base-data section this batch goes into; creates it for "+ New".
  function ensureAddSection() {
    const a = S.add, secs = S.baseData.sections;
    if (a.sectionId !== 'new') return secs.find((x) => x.id === a.sectionId) || secs[0];
    const grade = (a.newGrade || '').trim() || 'My class', sx = (a.newSection || '').trim().toUpperCase();
    let sec = secs.find((x) => x.grade === grade && (x.section || '') === sx);
    if (!sec) {
      sec = { id: 'sec_' + Date.now().toString(36), name: sx ? grade + ' ' + sx : grade, grade, section: sx, n: 0, students: [] };
      secs.push(sec);
    }
    a.sectionId = sec.id;
    return sec;
  }
  function addSectionOK() { const a = S.add; return a.sectionId !== 'new' || !!(a.newGrade || '').trim(); }
  // Persist one planted student through the dedupe guard (spec A4). Records the
  // outcome (created / merged / review) so the finish screen can summarise it and
  // show the parent verification codes for the new children.
  function persistPlantedStudent() {
    const a = S.add;
    const first = (a.first || '').trim(), last = (a.last || '').trim();
    const adm = (a.adm || '').trim() || ('TMP-' + Date.now());
    const name = (first + ' ' + last).trim();
    const sec = ensureAddSection();
    let res = null;
    if (window.TilliAPI && window.TilliAPI.addStudent) {
      // DEMO: ensure this teacher has scope for the section (real system: scope is
      // granted by the Admin invite, spec A3). Keeps the guard's shape intact.
      const scope = window.TilliAPI.ensureTeacherScope(S.teacher.email, S.teacher.school, sec.grade, sec.section);
      res = window.TilliAPI.addStudent({
        actorEmail: S.teacher.email, school_id: scope && scope.school_id, section_id: scope && scope.section_id,
        student_id: adm, first, last, grade: sec.grade, section: sec.section, source: 'manual',
      });
    }
    const result = (res && res.ok) ? res.result : 'created';
    const rec = (res && res.student) || {};
    const uid = rec.uid || null;
    a.results.push({ name, result, uid, matched: res && res.matched && res.matched.name });
    // Same name / taken admission number → the guard didn't create a record; don't plant.
    if (result !== 'created' && result !== 'merged') return;
    const id = rec.student_id || adm;
    if (S.baseData.sections.some((x) => x.students.some((st) => st.id === id))) return;
    const D = window.TilliDashData;
    if (D) {
      sec.students.push(D.buildFreshStudent(sec, { first, last, adm: id, uid }));
      sec.n = sec.students.length;
      const firstCounts = {};
      sec.students.forEach((st) => { firstCounts[st.first] = (firstCounts[st.first] || 0) + 1; });
      sec.students.forEach((st) => { st.dispFirst = firstCounts[st.first] > 1 ? st.first + ' ' + (st.last[0] || '') + '.' : st.first; });
    }
    if (window.TilliOnboarding && window.TilliOnboarding.appendStudents) {
      window.TilliOnboarding.appendStudents([{ first, last, adm: id, grade: sec.grade, section: sec.section, uid }]);
    }
    rebuildData();
  }
  function addGradeName() {
    const a = S.add;
    if (a.sectionId === 'new') return ((a.newGrade || '').trim() + ' ' + (a.newSection || '').trim().toUpperCase()).trim() || 'a new section';
    const s = S.baseData.sections.find((x) => x.id === a.sectionId); return s ? s.name : 'your class';
  }
  function potHTML(done) {
    const sprouts = Array.from({ length: Math.min(done, 14) }, (_, i) => `<span class="pot-sprout" style="height:${14 + (i % 4) * 7}px;background:${i % 2 ? ART.potSprout : ART.green}"></span>`).join('');
    const seed = done > 0 ? '<span class="pot-seed"></span>' : '';
    return `<div class="pot">${seed}<div class="pot-bed">${sprouts}</div><div class="pot-rim"></div><div class="pot-body"></div></div>`;
  }
  function addModal() {
    if (!S.add.active) return '';
    const a = S.add;
    let step = '';
    if (a.step === 'count') {
      const canNext = !!a.count && parseInt(a.count, 10) >= 1 && addSectionOK();
      const secChips = S.baseData.sections.map((x) =>
        `<button class="ui-filterchip focus${a.sectionId === x.id ? ' on' : ''}" data-add-sec="${esc(x.id)}">${esc(x.name)}</button>`).join('');
      const secPick = `<div class="add-secpick">
          <div class="ui-eyebrow mb-2">Grade · section</div>
          <div class="add-secchips">${secChips}<button class="ui-filterchip focus${a.sectionId === 'new' ? ' on' : ''}" data-add-sec="new">+ New</button></div>
          ${a.sectionId === 'new' ? `<div class="add-newsec"><input id="add-new-grade" class="input td-in" value="${esc(a.newGrade)}" placeholder="Grade (e.g. Grade 1)"><input id="add-new-section" class="input td-in" value="${esc(a.newSection)}" placeholder="Section (e.g. A)" maxlength="3"></div>` : ''}
        </div>`;
      step = `${secPick}<div class="add-center">
        <div class="add-title">How many students are you adding to<br>${esc(addGradeName())}?</div>
        <div class="add-pot">${potHTML(a.done)}</div>
        <input id="add-count" class="add-count" value="${esc(a.count)}" inputmode="numeric" placeholder="Type a number…">
        <div class="mt-5"><button class="btn btn-primary focus" data-add-to-entry ${canNext ? '' : 'disabled'}>Start planting →</button></div>
      </div>`;
    } else if (a.step === 'entry') {
      const pct = a.total ? Math.round((a.done / a.total) * 100) : 0;
      const canPlant = !!a.first.trim();
      step = `<div class="add-progress">${a.done} / ${a.total} completed</div>
        <div class="ui-meter add-pbar"><div style="width:${pct}%"></div></div>
        <div class="add-pot">${potHTML(a.done)}</div>
        <div class="add-fields">
          <div class="add-names"><input id="add-first" class="input td-in" value="${esc(a.first)}" placeholder="First name"><input id="add-last" class="input td-in" value="${esc(a.last)}" placeholder="Last name"></div>
          <input id="add-adm" class="input td-in" value="${esc(a.adm)}" placeholder="Admission number">
        </div>
        <div class="mt-5"><button class="btn btn-primary block focus" data-add-plant ${canPlant ? '' : 'disabled'}>${a.done + 1 >= a.total ? 'Plant last seed 🌱' : 'Plant seed → next'}</button></div>`;
    } else {
      const results = a.results || [];
      const created = results.filter((r) => r.result === 'created');
      const merged = results.filter((r) => r.result === 'merged');
      const review = results.filter((r) => r.result === 'review');
      const clash = results.filter((r) => r.result === 'name_dup' || r.result === 'id_conflict');
      // Dedupe outcome — surfaced so the teacher sees duplicates were prevented.
      const dedupeNote = (merged.length || review.length || clash.length) ? `
        <div class="ui-note info add-note">
          ${merged.length ? `${merged.length} admission number${merged.length === 1 ? ' was' : 's were'} already on the roster — merged instead of duplicated.` : ''}
          ${review.length ? ` ${review.length} entr${review.length === 1 ? 'y looks' : 'ies look'} like an existing student — flagged for your admin to review.` : ''}
          ${clash.length ? ` ${clash.length} not added (${clash.map((r) => esc(r.name)).join(', ')}) — same name or admission number as a student already on file.` : ''}
        </div>` : '';
      // Student UIDs for the newly planted children.
      const codes = created.concat(merged).filter((r) => r.uid).map((r) =>
        `<div class="add-uid-row">
          <span>${esc(r.name)}</span>
          <span class="uid-chip">${esc(r.uid)}</span></div>`).join('');
      const codeCard = codes ? `
        <div class="add-uids">
          <div class="add-uids-h">Student UIDs</div>
          ${codes}
        </div>` : '';
      step = `<div class="add-center" style="padding:14px 0 4px">
        <div style="display:flex;justify-content:center;margin:6px 0 14px">${flowerArt('growing', 96, 0)}</div>
        <div class="add-done-title">${created.length + merged.length} ${created.length + merged.length === 1 ? 'seed' : 'seeds'} planted 🌱</div>
        <p class="add-done-sub">Your ${esc(addGradeName())} bed is ready. Time to help them grow.</p>
        ${dedupeNote}
        ${codeCard}
        <button class="btn btn-primary focus" data-add-finish>${a.from === 'students' ? 'Back to students →' : 'Go to my garden →'}</button>
      </div>`;
    }
    return `<div class="ui-scrim add-backdrop">
      <div class="ui-modal-card add-card">
        <div class="add-top"><button class="btn-soft focus" data-add-back>← Back</button><button class="btn-icon bare focus" data-add-close>×</button></div>
        <div class="add-eyebrow">Adding flowers</div>
        ${step}
      </div>
    </div>`;
  }

  function wireAddFlow() {
    if (!S.add.active) return;
    // count input: sanitize + toggle Start button without re-render (keep caret)
    const syncStart = () => { const btn = root.querySelector('[data-add-to-entry]'); if (btn) btn.disabled = !(S.add.count && parseInt(S.add.count, 10) >= 1 && addSectionOK()); };
    const cnt = root.querySelector('#add-count');
    if (cnt) cnt.addEventListener('input', (e) => {
      const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
      S.add.count = v; e.target.value = v;
      syncStart();
    });
    root.querySelectorAll('[data-add-sec]').forEach((b) => b.addEventListener('click', () => { S.add.sectionId = b.dataset.addSec; render(); }));
    [['add-new-grade', 'newGrade'], ['add-new-section', 'newSection']].forEach(([id, key]) => {
      const el = root.querySelector('#' + id);
      if (el) el.addEventListener('input', (e) => { S.add[key] = e.target.value; syncStart(); });
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
      const n = parseInt(S.add.count, 10) || 0; if (n < 1 || !addSectionOK()) return;
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
    if (fin) fin.addEventListener('click', () => {
      S.sectionId = S.add.sectionId || S.sectionId;
      if (S.add.from === 'students') { S.nav = 'students'; S.studentId = null; }
      else { S.nav = 'garden'; S.gardenLevel = 'section'; }
      S.add = Object.assign({}, S.add, { active: false });
      render();
    });
  }

  // ---------------- Ask Tilli ----------------
  function askPanel() {
    const a = S.ask;
    const thread = a.thread.map((m) => `<div class="ask-msg ${m.role}">${fmtMsg(m.text)}</div>`).join('');
    // While "thinking", a shimmering three-dot bubble stands in for Tilli's reply
    // so the assistant reads as considering the question, not answering instantly.
    const typing = a.thinking ? `<div class="ask-msg tilli ask-typing"><span></span><span></span><span></span></div>` : '';
    const empty = a.thread.length === 0 && !a.thinking ? `<div class="ask-empty">${flowerArt('growing', 76, 0)}<div>Edit the prompt below and send — I’ll suggest something you can use today.</div></div>` : '';
    // Chat window that grows out of the floating Ask bubble and stays pinned
    // to it (positionAskPop). Phones keep a bottom sheet over a scrim.
    return `<div class="ui-scrim ask-scrim" data-close-ask></div>
      <div class="ask-panel${a._popIn ? ' pop-in' : ''}" role="dialog" aria-label="Ask Tilli">
        <div class="ask-head">
          <span class="ask-ic">${chatIcon('var(--green-700)')}</span>
          <div class="ask-hmeta"><div class="t">Ask Tilli</div><div class="s">Your teaching assistant</div></div>
          <button class="btn-icon" data-ask-expand title="Open full screen" aria-label="Open Ask Tilli full screen">${LU.max}</button>
          <button class="btn-icon" data-close-ask aria-label="Close Ask Tilli">×</button>
        </div>
        <div class="ask-body">
          ${a.context ? `<div class="ui-badge ask-ctx">From: ${esc(a.context)}</div>` : ''}
          ${thread}${typing}${empty}
        </div>
        <div class="ask-foot">
          <div class="ask-compose">
            <textarea class="ask-input" rows="1" placeholder="Ask about your class or a student…" aria-label="Message Ask Tilli">${esc(a.prompt)}</textarea>
            <button class="ask-sendbtn focus" data-send-ask aria-label="Send to Tilli" title="Send (Enter)"${a.thinking ? ' disabled' : ''}>${LU.send}</button>
          </div>
        </div>
      </div>`;
  }
  // Pin the chat window to the bubble's corner: above the bubbles in a bottom
  // corner, below them in a top one, lined up with their outer edge.
  const ASK_POP_GAP = 14;   // px between the chat window and the bubbles
  const ASK_INPUT_MAX = 120;   // px the composer can grow to before it scrolls
  function positionAskPop(dragging) {
    const p = root && root.querySelector('.ask-panel'); if (!p) return;
    const A = window.TilliFloat && TilliFloat.anchor ? TilliFloat.anchor() : null;
    if (bp().isPhone || !A) { p.style.cssText = ''; p.dataset.from = 'br'; return; }
    const c = A.corner, box = A.box, W = window.innerWidth, H = window.innerHeight, st = p.style;
    p.classList.toggle('following', !!dragging);   // no easing while it tracks a drag
    st.left = c[1] === 'l' ? Math.max(8, box.l) + 'px' : 'auto';
    st.right = c[1] === 'r' ? Math.max(8, W - box.r) + 'px' : 'auto';
    if (c[0] === 'b') { st.top = 'auto'; st.bottom = (H - box.t + ASK_POP_GAP) + 'px'; st.maxHeight = Math.max(240, box.t - ASK_POP_GAP - 16) + 'px'; }
    else { st.bottom = 'auto'; st.top = (box.b + ASK_POP_GAP) + 'px'; st.maxHeight = Math.max(240, H - box.b - ASK_POP_GAP - 16) + 'px'; }
    p.dataset.from = c;
  }
  // Side panel (floating bubble + every in-card "Ask Tilli…" button): always a fresh chat.
  function openAsk(context, prompt) {
    newChat();
    Object.assign(S.ask, { open: true, _popIn: true, context: context || '', prompt: prompt || '', scope: S.sectionId || 'all' });
    render();
  }
  // ---------------- Ask Tilli: shared chat engine ----------------
  // The live conversation (S.ask.thread) is mirrored into a saved history
  // (S.chats, localStorage) that the full screen lists, reopens and deletes.
  // Replies are demo answers computed from the class data in scope.
  const CHATS_KEY = 'tilliMeasures.askChats';
  // Chat-history column: width (drag the right edge) + collapsed state, remembered per browser.
  const ASK_HIST_KEY = 'tilliMeasures.askHistPanel';
  const ASKX_HIST_MIN = 220;   // narrowest the history column can be dragged (px)
  const ASKX_HIST_MAX = 480;   // widest the history column can be dragged (px)
  function loadAskHist() { try { const v = JSON.parse(localStorage.getItem(ASK_HIST_KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function saveAskHist() { try { localStorage.setItem(ASK_HIST_KEY, JSON.stringify({ w: S.ask.histW || null, collapsed: !!S.ask.histCollapsed })); } catch (e) { /* private mode — just won't persist */ } }
  const ASK_TRY = [
    'Which students need help with empathy?',
    "What's the biggest skill gap in my class?",
    'Show me students struggling with self-regulation',
    'Give me a 10-minute activity for this week',
  ];
  const lu = (d, size) => `<svg width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const LU = {
    spark: lu('<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>', 22),
    sparkLg: lu('<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>', 40),
    min: lu('<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>', 18),
    max: lu('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>', 16),
    share: lu('<path d="M12 3v12M17 8l-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', 18),
    msg: lu('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', 17),
    trash: lu('<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>', 17),
    pin: lu('<path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>', 14),
    send: lu('<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.63l-19 6.5a.5.5 0 0 0-.02.93l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>', 20),
    plus: lu('<path d="M5 12h14M12 5v14"/>', 18),
    panel: lu('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>', 18),
  };

  function loadChats() { try { const v = JSON.parse(localStorage.getItem(CHATS_KEY) || 'null'); return Array.isArray(v) ? v : null; } catch (e) { return null; } }
  function saveChats() { try { localStorage.setItem(CHATS_KEY, JSON.stringify(S.chats)); } catch (e) { /* private mode — history just won't persist */ } }
  // Demo history so the list isn't empty on first visit (only saved once something changes).
  function seedChats() {
    const day = 864e5, now = Date.now();
    return [[ASK_TRY[1], 1], [ASK_TRY[0], 3], [ASK_TRY[2], 12], [ASK_TRY[3], 20]].map(([q, ago], i) => ({
      id: 'seed' + i, title: q, at: new Date(now - ago * day).toISOString(), scope: 'all',
      thread: [{ role: 'user', text: q }, { role: 'tilli', text: askReply(q, 'all') }],
    }));
  }

  function scopeSection(scope) { return S.data.sections.find((x) => x.id === scope); }
  function scopeName(scope) { const sec = scopeSection(scope); return sec ? sec.name : 'All my classes'; }
  function scopeStudents(scope) {
    const sec = scopeSection(scope);
    return (sec ? sec.students : S.data.sections.flatMap((x) => x.students)).filter((st) => st.state !== 'waiting');
  }

  // Message text: **bold** + line breaks, everything else escaped.
  function fmtMsg(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }

  const SKILL_WORDS = [['empathy', 'empathy'], ['self-regulation', 'emotion_regulation'], ['regulat', 'emotion_regulation'], ['calm', 'emotion_regulation'],
    ['emotion awareness', 'emotion_awareness'], ['feeling', 'emotion_awareness'], ['friend', 'relationship_skills'], ['relationship', 'relationship_skills'],
    ['teamwork', 'relationship_skills'], ['metacogn', 'metacognition'], ['critical', 'critical_thinking'], ['memory', 'working_memory'], ['planning', 'planning'],
    ['organi', 'planning'], ['flexib', 'cognitive_flexibility'], ['distract', 'inhibition_distraction'], ['impuls', 'inhibition_response'], ['attention', 'attention']];
  function askReply(q, scope) {
    const t = q.toLowerCase(), where = scopeName(scope), kids = scopeStudents(scope);
    if (/activity|idea|game|lesson|routine/.test(t) && !SKILL_WORDS.some(([w]) => t.includes(w))) {
      return "Here's a warm, practical idea you can try today — open with a **3-minute feelings check-in**, then a **paired activity** where partners take turns naming one thing that was tricky this week, and close with one sentence of specific praise.\n\nWant me to tailor it to a skill or a group of students?";
    }
    if (!kids.length) return `I don't have assessment results for ${where} yet. Once the Baseline is complete I can point to specific students and skills — until then, ask me for activities or ideas any time.`;
    const hit = SKILL_WORDS.find(([w]) => t.includes(w));
    if (hit) {
      const sk = S.data.skills.find((x) => x.key === hit[1]);
      const rows = kids.map((st) => ({ st, x: st.skills.find((k) => k.key === sk.key) })).filter((r) => r.x).sort((a, b) => a.x.pct - b.x.pct);
      const beg = rows.filter((r) => r.x.band === 'Beginner');
      const list = (beg.length ? beg : rows.slice(0, 3)).slice(0, 6).map((r) => `• ${r.st.name} — ${r.x.band} (${r.x.pct}%)`).join('\n');
      const head = beg.length
        ? `In ${where}, **${countNoun(beg.length, 'student', 'students')}** ${nounFor(beg.length, 'is', 'are')} at Beginner in **${sk.name}**:`
        : `Nobody in ${where} is at Beginner in **${sk.name}** — these students have the most room to grow:`;
      return `${head}\n${list}${beg.length > 6 ? `\n…and ${beg.length - 6} more.` : ''}\n\nWant a 10-minute ${sk.name} activity you can run with them this week?`;
    }
    const stats = skillStatsFor(kids).filter((x) => x.total);
    if (!stats.length) return `I couldn't find skill results for ${where} yet.`;
    if (/strength|strong|best|well/.test(t)) {
      const top = [...stats].sort((a, b) => b.counts.Expert - a.counts.Expert)[0];
      return `${where}'s biggest strength is **${top.name}** — ${top.counts.Expert} of ${top.total} students are already at Expert. Celebrate it out loud, and use it as a bridge into the skills that are still growing.`;
    }
    if (/gap|weak|lowest|struggl|focus|need|help|support/.test(t)) {
      const [a, b] = [...stats].sort((x, y) => y.counts.Beginner - x.counts.Beginner);
      return `The biggest skill gap in ${where} is **${a.name}** — ${a.counts.Beginner} of ${a.total} students are at Beginner.` +
        (b ? ` Next is **${b.name}** (${b.counts.Beginner} at Beginner).` : '') +
        `\n\nA small daily routine aimed at ${a.name} will move the most children. Want me to suggest one?`;
    }
    return `Good question. Looking at ${where}, I can tell you which students need support in a skill, where the biggest gaps are, or suggest an activity — try asking about a specific skill like **empathy** or **attention**.`;
  }

  function newChat() { Object.assign(S.ask, { chatId: null, thread: [], thinking: false, prompt: '', context: '', histOpen: false }); }
  function loadChat(id) {
    const c = S.chats.find((x) => x.id === id); if (!c) return;
    Object.assign(S.ask, { chatId: c.id, thread: c.thread.slice(), scope: c.scope || 'all', thinking: false, prompt: '', context: '', histOpen: false });
  }
  function deleteChat(id) { S.chats = S.chats.filter((x) => x.id !== id); saveChats(); if (S.ask.chatId === id) newChat(); }
  // Writes the live thread into history (creating the chat on its first message), newest first.
  function storeChat() {
    const a = S.ask;
    let c = S.chats.find((x) => x.id === a.chatId);
    if (!c) { c = { id: 'c' + Date.now().toString(36), title: a.thread[0].text }; a.chatId = c.id; }
    Object.assign(c, { thread: a.thread.slice(), scope: a.scope, at: new Date().toISOString() });
    S.chats = [c].concat(S.chats.filter((x) => x !== c));
    saveChats();
    return c;
  }
  function sendAsk(text) {
    const p = (text || '').trim(); if (!p || S.ask.thinking) return;
    // Question shows at once + a "thinking" bubble; the reply lands after a short beat.
    S.ask.thread = S.ask.thread.concat([{ role: 'user', text: p }]);
    S.ask.prompt = ''; S.ask.thinking = true;
    const chat = storeChat();
    render();
    setTimeout(() => {
      chat.thread = chat.thread.concat([{ role: 'tilli', text: askReply(p, chat.scope) }]);
      chat.at = new Date().toISOString(); saveChats();
      if (S.ask.chatId !== chat.id) return;   // switched chats mid-think — reply is saved, just not shown
      S.ask.thinking = false; S.ask.thread = chat.thread.slice();
      if (S.ask.open || S.nav === 'ask') render();
    }, 900);
  }
  function exportChat() {
    const a = S.ask; if (!a.thread.length) return;
    const c = S.chats.find((x) => x.id === a.chatId);
    const lines = [`Ask Tilli — ${c ? c.title : 'Chat'}`, `Scope: ${scopeName(a.scope)}`, `Exported: ${new Date().toLocaleString()}`, ''];
    a.thread.forEach((m) => lines.push((m.role === 'user' ? 'You' : 'Tilli') + ':', m.text.replace(/\*\*/g, ''), ''));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url; link.download = `ask-tilli-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Small confirm under the Export button: names the chat, then Download / Cancel.
  const EXPORT_TITLE_MAX = 60;   // longer chat titles are cut with "…" in the confirm (the file keeps the full title)
  function exportConfirmPop() {
    const c = S.chats.find((x) => x.id === S.ask.chatId);
    const t = c ? c.title : 'this chat';
    const short = t.length > EXPORT_TITLE_MAX ? t.slice(0, EXPORT_TITLE_MAX - 1).trimEnd() + '…' : t;
    return `<div class="askx-pop" role="dialog" aria-label="Export chat">
      <p>This will download the whole chat <b title="${esc(t)}">“${esc(short)}”</b> as a text file.</p>
      <div class="askx-pop-act">
        <button class="btn btn-ghost btn-sm focus" data-askx-export-cancel>Cancel</button>
        <button class="btn btn-primary btn-sm focus" data-askx-export-go>Download</button>
      </div>
    </div>`;
  }

  // ---------------- Ask Tilli: full screen (nav destination) ----------------
  function askScreenView() {
    const a = S.ask, weekAgo = Date.now() - 7 * 864e5;
    const item = (c) => `<div class="askx-item${c.id === a.chatId ? ' on' : ''}">
        <button class="askx-open focus" data-askx-open="${esc(c.id)}" title="${esc(c.title)}">${LU.msg}<span>${esc(c.title)}</span></button>
        <button class="askx-del focus" data-askx-del="${esc(c.id)}" aria-label="Delete chat: ${esc(c.title)}" title="Delete chat">${LU.trash}</button>
      </div>`;
    const group = (h, list) => list.length ? `<div class="askx-gh">${h}</div>${list.map(item).join('')}` : '';
    const recent = S.chats.filter((c) => +new Date(c.at) >= weekAgo), older = S.chats.filter((c) => +new Date(c.at) < weekAgo);
    const opts = [['all', 'All my classes']].concat(S.data.sections.map((x) => [x.id, x.name]))
      .map(([v, l]) => `<option value="${esc(v)}"${v === a.scope ? ' selected' : ''}>${esc(l)}</option>`).join('');
    const body = (a.thread.length || a.thinking)
      ? `<div class="askx-thread">${a.thread.map((m) => `<div class="ask-msg ${m.role}">${fmtMsg(m.text)}</div>`).join('')}${a.thinking ? '<div class="ask-msg tilli ask-typing"><span></span><span></span><span></span></div>' : ''}</div>`
      : `<div class="askx-empty">
          <span class="askx-spark">${LU.sparkLg}</span>
          <h2>Hi! I'm Tilli 👋</h2>
          <p>I can help you understand your students' skills and create personalised learning plans.</p>
          <div class="askx-try"><div class="askx-try-h">Try asking:</div>
            ${ASK_TRY.map((q) => `<button class="askx-sug focus" data-askx-try="${esc(q)}">${esc(q)}</button>`).join('')}
          </div>
        </div>`;
    // History column: « hides it (desktop) / closes the drawer (narrow); the
    // header's panel button brings it back. Its right edge drags to resize.
    const histW = a.histW ? Math.max(ASKX_HIST_MIN, Math.min(ASKX_HIST_MAX, a.histW)) : null;
    const collapseIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>';
    return `<div class="askx${a.histOpen ? ' hist-open' : ''}${a.histCollapsed ? ' collapsed' : ''}"${histW ? ` style="--askx-hist-w:${histW}px"` : ''}>
      <aside class="askx-hist" aria-label="Chat history">
        <div class="askx-hist-top">
          <button class="btn btn-primary block askx-new focus" data-askx-new>${LU.plus} New Chat</button>
          <button class="askx-tool askx-collapse focus" data-askx-collapse aria-label="Hide chat history" title="Hide chat history">${collapseIcon}</button>
        </div>
        <div class="askx-list">${S.chats.length ? group('This week', recent) + group('Earlier', older) : '<div class="askx-none">No chats yet — ask your first question.</div>'}</div>
        ${S.chats.length ? `<button class="askx-clear focus" data-askx-clear>${LU.trash} Clear all history</button>` : ''}
        <div class="askx-resize focus" role="separator" aria-orientation="vertical" aria-label="Resize chat history" tabindex="0"
          aria-valuemin="${ASKX_HIST_MIN}" aria-valuemax="${ASKX_HIST_MAX}"${histW ? ` aria-valuenow="${histW}"` : ''} title="Drag to resize · double-click to reset"></div>
      </aside>
      <button class="askx-scrim" data-askx-hist aria-label="Close chat history"></button>
      <section class="askx-main">
        <!-- One toolbar row: show-history · scope picker · minimise / export -->
        <div class="askx-scope">
          <button class="askx-tool askx-histbtn focus" data-askx-hist aria-label="Show chat history" aria-expanded="${!a.histCollapsed}" title="Show chat history">${LU.panel}</button>
          <label class="askx-scope-l" for="askx-scope-sel" title="Answering about">${LU.pin}<span>Answering about</span></label>
          <select id="askx-scope-sel" class="askx-select focus" data-askx-scope title="Tilli's answers only use data from the classes picked here">${opts}</select>
          <div class="askx-tools">
            <button class="askx-tool focus" data-askx-min title="Minimise to side panel" aria-label="Minimise to side panel">${LU.min}</button>
            <div class="askx-export-wrap">
              <button class="askx-tool focus" data-askx-export title="Export this chat" aria-label="Export this chat" aria-haspopup="dialog" aria-expanded="${!!a.exportConfirm}"${a.thread.length ? '' : ' disabled'}>${LU.share}</button>
              ${a.exportConfirm ? exportConfirmPop() : ''}
            </div>
          </div>
        </div>
        <div class="askx-body">${body}</div>
        <div class="askx-foot">
          <form class="askx-compose" data-askx-form>
            <input class="askx-input" placeholder="Ask about your students…" value="${esc(a.prompt)}" autocomplete="off" aria-label="Message Ask Tilli">
            <button class="askx-send" type="submit" aria-label="Send"${a.thinking ? ' disabled' : ''}>${LU.send}</button>
          </form>
          <p class="askx-note">Questions and prompts asked from the AI tool will be analysed by our research team for improvement, safeguarding and research purposes.</p>
        </div>
      </section>
    </div>`;
  }
  function wireAskScreen() {
    const ax = root.querySelector('.askx'); if (!ax) return;
    const on = (sel, fn, ev) => ax.querySelectorAll(sel).forEach((b) => b.addEventListener(ev || 'click', (e) => fn(b, e)));
    const inp = ax.querySelector('.askx-input');
    inp.addEventListener('input', () => { S.ask.prompt = inp.value; });
    on('[data-askx-form]', (f, e) => { e.preventDefault(); sendAsk(inp.value); }, 'submit');
    on('[data-askx-try]', (b) => sendAsk(b.dataset.askxTry));
    on('[data-askx-new]', () => { newChat(); render(); });
    on('[data-askx-open]', (b) => { loadChat(b.dataset.askxOpen); render(); });
    on('[data-askx-del]', (b) => { deleteChat(b.dataset.askxDel); render(); });
    on('[data-askx-clear]', () => {
      if (!confirm('Delete all your Ask Tilli chats? This can’t be undone.')) return;
      S.chats = []; saveChats(); newChat(); render();
    });
    on('[data-askx-scope]', (sel) => {
      S.ask.scope = sel.value;
      const c = S.chats.find((x) => x.id === S.ask.chatId); if (c) { c.scope = sel.value; saveChats(); }
      render();
    }, 'change');
    on('[data-askx-min]', () => { S.nav = S.askReturn || 'garden'; S.ask.open = true; render(); });
    // Export → confirm popover (toggle) → Download runs exportChat. Esc / outside click closes.
    const closeExport = () => { if (S.ask.exportConfirm) { S.ask.exportConfirm = false; render(); } };
    on('[data-askx-export]', () => { S.ask.exportConfirm = !S.ask.exportConfirm; render(); });
    on('[data-askx-export-cancel]', closeExport);
    on('[data-askx-export-go]', () => { S.ask.exportConfirm = false; exportChat(); render(); });
    if (S.ask.exportConfirm) {
      const go = ax.querySelector('[data-askx-export-go]'); if (go) go.focus();
      ax.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeExport(); });
      ax.addEventListener('click', (e) => { if (!e.target.closest('.askx-export-wrap')) closeExport(); });
    }
    // Narrow screens: the history is a drawer (histOpen). Desktop: a column that
    // can be hidden (histCollapsed, remembered) and resized by its right edge.
    const narrow = () => window.innerWidth <= 760;
    on('[data-askx-hist]', () => {
      if (narrow()) S.ask.histOpen = !S.ask.histOpen;
      else { S.ask.histCollapsed = false; saveAskHist(); }
      render();
    });
    on('[data-askx-collapse]', () => {
      if (narrow()) S.ask.histOpen = false;
      else { S.ask.histCollapsed = true; saveAskHist(); }
      render();
    });
    const hz = ax.querySelector('.askx-resize'), aside = ax.querySelector('.askx-hist');
    if (hz && aside) {
      // Live-resize by writing the CSS var straight onto .askx (no re-render mid-drag).
      const setW = (w) => {
        w = Math.round(Math.max(ASKX_HIST_MIN, Math.min(ASKX_HIST_MAX, w)));
        S.ask.histW = w; ax.style.setProperty('--askx-hist-w', w + 'px'); hz.setAttribute('aria-valuenow', w);
      };
      hz.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const left = aside.getBoundingClientRect().left;
        hz.setPointerCapture(e.pointerId); hz.classList.add('dragging'); document.body.style.userSelect = 'none';
        const move = (ev) => setW(ev.clientX - left);
        const up = () => {
          hz.removeEventListener('pointermove', move); hz.removeEventListener('pointerup', up); hz.removeEventListener('pointercancel', up);
          hz.classList.remove('dragging'); document.body.style.userSelect = ''; saveAskHist();
        };
        hz.addEventListener('pointermove', move); hz.addEventListener('pointerup', up); hz.addEventListener('pointercancel', up);
      });
      hz.addEventListener('dblclick', () => { S.ask.histW = null; ax.style.removeProperty('--askx-hist-w'); hz.removeAttribute('aria-valuenow'); saveAskHist(); });
      hz.addEventListener('keydown', (e) => {   // ←/→ resize (Shift = bigger steps)
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const step = e.shiftKey ? 48 : 16;
        setW(aside.getBoundingClientRect().width + (e.key === 'ArrowRight' ? step : -step)); saveAskHist();
      });
    }
    const bd = ax.querySelector('.askx-body'); bd.scrollTop = bd.scrollHeight;
    if (!bp().isPhone) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }

  // ---------------- Profile ----------------
  function fmtDate(iso) {
    const t = iso ? new Date(iso) : null;
    return t && !isNaN(t) ? t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  }
  // Grades · sections this teacher teaches = the sections of their class.
  function gradesTaught() { return (S.baseData.sections || []).filter((x) => x.students && x.students.length).map((x) => x.name); }

  // Teaching Mirror — the teacher's own reflection answers played back: average
  // 1–5 per category (reverse-worded items flipped so higher = more of that
  // strength), plus their written reflections.
  // Snapshots on the Mirror timeline (oldest first). Older saves only have
  // selfAnswers — treat that as the single first mirror.
  function mirrorSnapshots() {
    let list = (S.teacher.reflections || []).filter((r) => r && r.answers);
    if (!list.length) {
      const A = S.teacher.selfAnswers || {};
      list = Object.keys(A).length ? [{ id: 'only', kind: 'pre', label: 'Pre-training', at: S.teacher.joinedAt, answers: A }] : [];
    }
    // Preview states past Baseline: until the real post-training survey is done,
    // add a clearly-labelled sample "After training" mirror built from the first.
    if (list.length && S.windowState !== 'baseline' && !list.some((r) => r.kind === 'post')) {
      list = list.concat([samplePostMirror(list[0])]);
    }
    return list;
  }
  // Sample after-training answers: each 1–5 item moves 0–2 steps toward the
  // healthy end (deterministic per question), choices step up one option,
  // written answers get example text. Dated three weeks after the first mirror.
  const SAMPLE_WORDS = {
    q04: 'A parent meeting got tense. I paused, took three slow breaths and named what I was feeling before I answered — it changed the whole conversation.',
    q09: 'We start every morning with a feelings check-in circle, and mistakes get a "great try!" from the whole class.',
  };
  function samplePostMirror(first) {
    const R = S.teacher.reflection || { questions: [] };
    const A = first.answers || {}, out = {};
    (R.questions || []).forEach((q) => {
      const v = A[q.id];
      if (q.type === 'scale' && typeof v === 'number') {
        let h = 0; for (let i = 0; i < q.id.length; i++) h = (h * 31 + q.id.charCodeAt(i)) >>> 0;
        const step = [1, 2, 1, 0, 1][h % 5];
        out[q.id] = q.reverse ? Math.max(1, v - step) : Math.min(5, v + step);
      } else if (q.type === 'choice' && q.options && q.options.length) {
        const i = q.options.indexOf(v);
        out[q.id] = q.options[Math.min(q.options.length - 1, Math.max(0, i) + 1)];
      } else if (q.type === 'text') {
        out[q.id] = SAMPLE_WORDS[q.id] || 'I notice how my students are feeling much sooner now, and I respond more calmly.';
      }
    });
    const base = first.at ? new Date(first.at) : new Date();
    const at = new Date((isNaN(base) ? Date.now() : base.getTime()) + 21 * 24 * 60 * 60 * 1000);
    at.setHours(15, 10, 0, 0);
    return { id: 'sample-post', kind: 'post', label: 'Post-training', sample: true, at: at.toISOString(), answers: out };
  }
  function mirrorName(snap, i) {
    if (i === 0) return 'My first Teaching Mirror';
    return snap.kind === 'post' ? 'After training' : snap.kind === 'retake' ? 'Retaken reflection' : 'Teaching Mirror ' + (i + 1);
  }
  function fmtDateTime(iso) {
    const t = iso ? new Date(iso) : null;
    return t && !isNaN(t) ? t.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Date not recorded';
  }
  function mirrorAverages(answers) {
    const R = S.teacher.reflection || { cats: [], questions: [] };
    return (R.cats || []).map((c, ci) => {
      const vals = (R.questions || []).filter((q) => q.cat === ci && q.type === 'scale' && typeof answers[q.id] === 'number')
        .map((q) => (q.reverse ? 6 - answers[q.id] : answers[q.id]));
      return { c, avg: vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null };
    });
  }
  function mirrorCard() {
    const R = S.teacher.reflection || { cats: [], questions: [] };
    const snaps = mirrorSnapshots();
    const head = `<div class="mir-head"><div><div class="mir-t">🪞 Your Teaching Mirror</div><div class="mir-s">How you described yourself in each reflection — switch between them to see how you&rsquo;ve changed.</div></div></div>`;
    if (!snaps.length) {
      return `<div class="ui-card mir">${head}<p class="mir-empty">Finish your reflection to see your Teaching Mirror.</p></div>`;
    }
    const idx = S.mirrorIdx == null || S.mirrorIdx >= snaps.length ? snaps.length - 1 : S.mirrorIdx;
    const snap = snaps[idx], A = snap.answers || {};
    const cats = mirrorAverages(A);
    const prev = idx > 0 ? mirrorAverages(snaps[idx - 1].answers || {}) : null;
    // Timeline switcher: one stop per snapshot, each with its local date + time.
    const stops = snaps.map((r, i) => `<button class="mir-stop${i === idx ? ' on' : ''} focus" data-mirror-idx="${i}" aria-pressed="${i === idx}">
        <span class="mir-dot"></span><span class="mir-sn">${esc(mirrorName(r, i))}${r.sample ? ' <em class="ui-tag lvl mir-sample">Sample</em>' : ''}</span><span class="mir-sd">${esc(fmtDateTime(r.at))}</span></button>`).join('');
    const timeline = `<div class="mir-tl">
        <button class="mir-nav focus" data-mirror-step="-1"${idx === 0 ? ' disabled' : ''} aria-label="Previous mirror">‹</button>
        <div class="mir-stops">${stops}</div>
        <button class="mir-nav focus" data-mirror-step="1"${idx === snaps.length - 1 ? ' disabled' : ''} aria-label="Next mirror">›</button>
      </div>`;
    const bars = cats.map(({ c, avg }, ci) => {
      const p = prev && prev[ci] ? prev[ci].avg : null;
      const d = avg != null && p != null ? Math.round((avg - p) * 10) / 10 : null;
      const delta = d == null ? '' : `<span class="mir-d ${d > 0 ? 'up' : d < 0 ? 'down' : ''}" title="Change since ${esc(mirrorName(snaps[idx - 1], idx - 1))}">${d > 0 ? '▲ +' + d.toFixed(1) : d < 0 ? '▼ ' + d.toFixed(1) : '='}</span>`;
      return `<div class="mir-row" title="${esc(c.name)} — average of your 1–5 answers">
        <span class="mir-lb">${esc(c.name)}</span>
        <span class="ui-meter light mir-track"><span style="width:${avg == null ? 0 : Math.round((avg / 5) * 100)}%;background:${esc(c.color || 'var(--lvl-3-soft)')}"></span></span>
        <span class="mir-v">${avg == null ? '—' : avg.toFixed(1)}${delta}</span></div>`;
    }).join('');
    const facts = (R.questions || []).filter((q) => q.type === 'choice' && A[q.id]).map((q) =>
      `<div class="mir-fact"><span>${esc(q.q)}</span><b>${esc(A[q.id])}</b></div>`).join('');
    const words = (R.questions || []).filter((q) => q.type === 'text' && String(A[q.id] || '').trim()).map((q) =>
      `<blockquote class="mir-q"><div class="mir-qq">${esc(q.q)}</div>“${esc(String(A[q.id]).trim())}”</blockquote>`).join('');
    const sampleNote = snap.sample ? `<div class="ui-note sample mir-samplenote"><span>This is a <b>sample</b> of what your Mirror could look like after training. Take the post-training survey to see your real one.</span>
        <button class="btn-line primary focus" data-take-reflection="post">Take the post-training survey →</button></div>` : '';
    return `<div class="ui-card mir">${head}
      ${timeline}
      ${sampleNote}
      <div class="mir-bars">${bars}</div>
      <div class="mir-scale">Out of 5 · higher = more of that strength</div>
      ${facts}${words ? `<div class="mir-words">${words}</div>` : ''}
    </div>`;
  }

  function profileEditView() {
    const d = S.profileDraft || {};
    const O = (window.TilliOnboarding && window.TilliOnboarding.options) || {};
    const sel = (key, list) => {
      const opts = (list && list.length ? list : [d[key]]).filter((x) => x != null && x !== '');
      if (d[key] && opts.indexOf(d[key]) < 0) opts.unshift(d[key]);
      return `<select class="input td-in pf-in focus" data-pf="${key}">${d[key] ? '' : '<option value="" selected>Select…</option>'}${opts.map((o) => `<option${o === d[key] ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    };
    const txt = (key, ph, num) => `<input class="input td-in pf-in focus" data-pf="${key}" value="${esc(d[key] || '')}" placeholder="${esc(ph)}"${num ? ' inputmode="numeric"' : ''}>`;
    const row = (label, ctrl) => `<label class="pf-row pf-edit"><span class="k">${label}</span>${ctrl}</label>`;
    return `<div class="dash-wrap" style="max-width:720px">
      <h1 class="dash-h1">Edit your details</h1>
      <p class="dash-sub">Changes save to your profile right away.</p>
      <div class="ui-card td-rows mt-4">
        ${row('Name', txt('name', 'Your full name'))}
        <div class="pf-row"><span class="k">Email</span><span class="v">${esc(S.teacher.email || '')} 🔒</span></div>
        ${row('Gender', sel('gender', O.genders))}
        ${row('Age', txt('age', 'Age', true))}
        ${row('Years teaching', txt('years', 'Years', true))}
        ${row('Education', sel('edu', O.education))}
        ${row('Country', txt('country', 'Country'))}
        ${row('City', txt('city', 'City'))}
      </div>
      <div class="td-btnrow">
        <button class="btn btn-primary md focus" data-pf-save${(d.name || '').trim() ? '' : ' disabled'}>Save changes</button>
        <button class="btn btn-ghost md focus" data-pf-cancel>Cancel</button>
      </div>
    </div>`;
  }

  function profilePanel() {
    if (S.profileEdit) return profileEditView();
    const d = S.teacher.demo || {};
    const rows = [
      ['Name', d.name], ['Email', S.teacher.email], ['School', d.school || S.teacher.school],
      ['Location', [d.city, d.country].filter(Boolean).join(', ')],
      ['Gender', d.gender], ['Age', d.age],
      ['Years teaching', d.years], ['Education', d.edu],
      ['Grades taught', gradesTaught().join(', ')],
      ['Joined Tilli Measures', fmtDate(S.teacher.joinedAt)],
    ].filter((r) => r[1]).map((r) => `<div class="pf-row"><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('');
    return `<div class="dash-wrap" style="max-width:720px">
      <div class="pf-titlebar">
        <div><h1 class="dash-h1">Your profile</h1>
        <p class="dash-sub">From your one-time setup — keep it up to date.</p></div>
        <button class="btn-line focus" data-pf-edit title="Edit your name, age, experience, education and location">✎ Edit details</button>
      </div>
      <div class="ui-card td-rows mt-4">${rows}</div>
      ${mirrorCard()}
      <div class="td-btnrow">
        <button class="btn btn-ghost md focus" data-redo>Redo reflection</button>
        <a class="btn btn-danger-outline td-btn-md focus" href="index.html">↩ Sign out</a>
      </div>
    </div>`;
  }

  // ---------------- wiring ----------------
  function wire() {
    root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.nav;
      if (k === 'ask') {   // nav → full-screen Ask Tilli (the floating bubble opens the side panel)
        if (S.nav !== 'ask') { S.askReturn = S.nav === 'profile' ? 'garden' : S.nav; newChat(); }
        S.ask.open = false; S.nav = 'ask'; render(); return;
      }
      S.ask.open = false;
      if (k === 'garden') { S.nav = 'garden'; S.gardenLevel = 'landing'; } else S.nav = k;
      if (k !== 'students' && !S.select.busy) S.select = { on: false, ids: {}, busy: '', err: '' };
      if (k !== 'profile') S.profileEdit = false;
      S.studentId = null; render();
    }));
    root.querySelectorAll('[data-section]').forEach((b) => b.addEventListener('click', () => { S.sectionId = b.dataset.section; S.studentId = null; render(); }));
    root.querySelectorAll('[data-open-class]').forEach((b) => b.addEventListener('click', () => { S.classModal = b.dataset.openClass; render(); }));
    root.querySelectorAll('[data-back-beds]').forEach((b) => b.addEventListener('click', () => { S.gardenLevel = 'beds'; render(); }));
    // My Garden landing: dev state switch, hero/tend Ask-Tilli prompts, assess CTA, doorways.
    root.querySelectorAll('[data-window-state]').forEach((b) => b.addEventListener('click', () => {
      S.windowState = b.dataset.windowState;
      S.enter = { studentId: null, q: 0, ratings: {}, done: false };
      rebuildData(); render();
    }));
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
    // students: + Add students, multi-select → parent report PDFs
    root.querySelectorAll('[data-add-students]').forEach((b) => b.addEventListener('click', () => openAddFlow()));
    root.querySelectorAll('[data-pick-stu]').forEach((b) => b.addEventListener('click', () => togglePick(b.dataset.pickStu)));
    const selStart = root.querySelector('[data-sel-start]');
    if (selStart) selStart.addEventListener('click', () => { S.select = { on: true, ids: {}, busy: '', err: '' }; render(); });
    const selCancel = root.querySelector('[data-sel-cancel]');
    if (selCancel) selCancel.addEventListener('click', () => { if (S.select.busy) return; S.select = { on: false, ids: {}, busy: '', err: '' }; render(); });
    const selAll = root.querySelector('[data-sel-all]');
    if (selAll) selAll.addEventListener('click', () => {
      const vis = rosterFiltered(); const ids = Object.assign({}, S.select.ids);
      const allOn = vis.every((st) => ids[st.id]);
      vis.forEach((st) => { if (allOn) delete ids[st.id]; else ids[st.id] = true; });
      S.select = Object.assign({}, S.select, { ids, err: '' }); render();
    });
    const selPdf = root.querySelector('[data-sel-pdf]');
    if (selPdf) selPdf.addEventListener('click', () => { downloadReports(); });

    // students: change history — class modal (+ kind filter) and the student's
    // "Last updated" line, which jumps to the History tab where its changes live.
    root.querySelectorAll('[data-class-hist]').forEach((b) => b.addEventListener('click', () => { S.histKind = ''; S.histOpen = true; render(); }));
    root.querySelectorAll('[data-assess-hist]').forEach((b) => b.addEventListener('click', () => { S.histKind = 'assessment'; S.histOpen = true; render(); }));
    root.querySelectorAll('[data-close-hist]').forEach((b) => b.addEventListener('click', (e) => { if (e.target === b) { S.histOpen = false; render(); } }));
    root.querySelectorAll('[data-hist-kind]').forEach((b) => b.addEventListener('click', () => { S.histKind = b.dataset.histKind; render(); }));
    root.querySelectorAll('[data-stu-hist]').forEach((b) => b.addEventListener('click', () => {
      S.studentTab = 'history'; render();
      const card = root.querySelector('.stu-changes'); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    // students: detail tabs, back, and ask buttons
    root.querySelectorAll('[data-stab]').forEach((b) => b.addEventListener('click', () => { S.studentTab = b.dataset.stab; render(); }));
    root.querySelectorAll('[data-back-roster]').forEach((b) => b.addEventListener('click', () => { S.studentId = null; S.stuEdit = null; render(); }));
    // students: edit name + UID
    const seStart = root.querySelector('[data-stu-editstart]');
    if (seStart) seStart.addEventListener('click', () => {
      const stu = section().students.find((x) => x.id === S.studentId); if (!stu) return;
      S.stuEdit = { id: stu.id, first: stu.first || '', last: stu.last || '', uid: uidOf(stu) || '', err: '' };
      render();
      const f = root.querySelector('[data-stu-edit="first"]'); if (f) f.focus();
    });
    root.querySelectorAll('[data-stu-edit]').forEach((el) => el.addEventListener('input', (e) => {
      if (!S.stuEdit) return;
      let v = e.target.value;
      if (el.dataset.stuEdit === 'uid') { v = v.toUpperCase().replace(/[^A-Z0-9-]/g, ''); el.value = v; }
      S.stuEdit[el.dataset.stuEdit] = v;
    }));
    root.querySelectorAll('[data-stu-edit]').forEach((el) => el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const sv = root.querySelector('[data-stu-save]'); if (sv) sv.click(); }
      else if (e.key === 'Escape') { S.stuEdit = null; render(); }
    }));
    const seSave = root.querySelector('[data-stu-save]');
    if (seSave) seSave.addEventListener('click', () => {
      const err = saveStudentEdit();
      if (err) { S.stuEdit.err = err; render(); return; }
      S.stuEdit = null; render();
    });
    const seCancel = root.querySelector('[data-stu-cancel]');
    if (seCancel) seCancel.addEventListener('click', () => { S.stuEdit = null; render(); });
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
      if (S.enter.q >= S.data.skills.length - 1) { finishObservation(); return; }
      S.enter = Object.assign({}, S.enter, { q: S.enter.q + 1, done: false });
      render();
    }));

    // logs
    root.querySelectorAll('[data-logview]').forEach((b) => b.addEventListener('click', () => { S.logsView = b.dataset.logview; render(); }));
    // By class: window cards (locked ones ignore the click) + "See all windows together" toggle.
    root.querySelectorAll('[data-logwin]').forEach((b) => b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') return;
      S.logsWin = b.dataset.logwin || null; render();
    }));
    root.querySelectorAll('[data-log-open]').forEach((b) => b.addEventListener('click', () => { S.logsView = 'student'; S.logsStudentId = b.dataset.logOpen; render(); }));
    root.querySelectorAll('[data-log-pick]').forEach((b) => b.addEventListener('click', () => { S.logsStudentId = b.dataset.logPick; render(); }));
    root.querySelectorAll('[data-logfilter]').forEach((b) => b.addEventListener('click', () => { S.logListFilter = b.dataset.logfilter; render(); }));
    root.querySelectorAll('[data-log-continue]').forEach((b) => b.addEventListener('click', () => { S.nav = 'assess'; startEnter(b.dataset.logContinue); }));
    const lss = root.querySelector('#log-stu-search');
    if (lss) lss.addEventListener('input', (e) => { S.logStudentSearch = e.target.value; S._refocus = 'log-stu-search'; render(); });
    const lls = root.querySelector('#log-list-search');
    if (lls) lls.addEventListener('input', (e) => { S.logListSearch = e.target.value; S._refocus = 'log-list-search'; render(); });

    const csv = root.querySelector('[data-csv]');
    if (csv) csv.addEventListener('click', downloadCSV);

    // insights
    root.querySelectorAll('[data-inview]').forEach((b) => b.addEventListener('click', () => { S.insightsView = b.dataset.inview; render(); }));
    root.querySelectorAll('[data-growth]').forEach((b) => b.addEventListener('click', () => { S.growthFilter = b.dataset.growth; render(); }));
    const grSel = root.querySelector('[data-growth-skill]');
    if (grSel) grSel.addEventListener('change', () => { S.growthFilter = grSel.value || 'overview'; render(); });
    const grTbl = root.querySelector('[data-growth-table]');
    if (grTbl) grTbl.addEventListener('click', () => { S.growthTable = !S.growthTable; render(); });
    wireGrowth();
    root.querySelectorAll('[data-ov-band]').forEach((b) => b.addEventListener('click', () => { S.ovBand = S.ovBand === b.dataset.ovBand ? null : b.dataset.ovBand; S.ovSkill = null; render(); }));
    root.querySelectorAll('[data-ov-skill]').forEach((b) => b.addEventListener('click', () => { S.ovSkill = S.ovSkill === b.dataset.ovSkill ? null : b.dataset.ovSkill; render(); }));
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
    if (ai) ai.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAsk(S.ask.prompt); } });   // Shift+Enter = new line
    // Composer grows with its text, up to ASK_INPUT_MAX px, then scrolls.
    const fitAi = () => { if (!ai) return; ai.style.height = 'auto'; ai.style.height = Math.min(ai.scrollHeight, ASK_INPUT_MAX) + 'px'; };
    if (ai) { fitAi(); ai.addEventListener('input', (e) => { S.ask.prompt = e.target.value; fitAi(); }); }
    const send = root.querySelector('[data-send-ask]');
    if (send) send.addEventListener('click', () => sendAsk(S.ask.prompt));
    root.querySelectorAll('[data-ask-expand]').forEach((b) => b.addEventListener('click', () => {
      if (S.nav !== 'ask') S.askReturn = S.nav === 'profile' ? 'garden' : S.nav;
      S.ask.open = false; S.nav = 'ask'; render();
    }));
    wireAskScreen();
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

    // profile: Teaching Mirror timeline
    root.querySelectorAll('[data-mirror-idx]').forEach((b) => b.addEventListener('click', () => { S.mirrorIdx = +b.dataset.mirrorIdx; render(); }));
    root.querySelectorAll('[data-mirror-step]').forEach((b) => b.addEventListener('click', () => {
      const n = mirrorSnapshots().length, cur = S.mirrorIdx == null ? n - 1 : S.mirrorIdx;
      S.mirrorIdx = Math.max(0, Math.min(n - 1, cur + +b.dataset.mirrorStep)); render();
    }));
    // Assess → Post-training survey: re-take the reflection (adds a Mirror snapshot)
    root.querySelectorAll('[data-take-reflection]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.TilliOnboarding && window.TilliOnboarding.takeReflection) window.TilliOnboarding.takeReflection(b.dataset.takeReflection, 'Post-training');
    }));
    // profile: edit details
    const pfEdit = root.querySelector('[data-pf-edit]');
    if (pfEdit) pfEdit.addEventListener('click', () => {
      const d = S.teacher.demo || {};
      S.profileDraft = { name: d.name || '', gender: d.gender || '', age: d.age || '', years: d.years || '', edu: d.edu || '', country: d.country || '', city: d.city || '' };
      S.profileEdit = true; render();
    });
    root.querySelectorAll('[data-pf]').forEach((el) => {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', (e) => {
        const k = el.dataset.pf; let v = e.target.value;
        if (k === 'age' || k === 'years') { v = v.replace(/[^0-9]/g, '').slice(0, 2); el.value = v; }
        S.profileDraft[k] = v;
        const save = root.querySelector('[data-pf-save]');
        if (save) save.disabled = !(S.profileDraft.name || '').trim();
      });
    });
    const pfSave = root.querySelector('[data-pf-save]');
    if (pfSave) pfSave.addEventListener('click', () => {
      const patch = Object.assign({}, S.profileDraft, { name: (S.profileDraft.name || '').trim() });
      if (!patch.name) return;
      S.teacher.demo = (window.TilliOnboarding && window.TilliOnboarding.updateDemo)
        ? window.TilliOnboarding.updateDemo(patch) : Object.assign({}, S.teacher.demo, patch);
      S.gardener = S.teacher.demo.gender === 'Male' ? 'm' : 'f';
      S.profileEdit = false; S.profileDraft = null; render();
    });
    const pfCancel = root.querySelector('[data-pf-cancel]');
    if (pfCancel) pfCancel.addEventListener('click', () => { S.profileEdit = false; S.profileDraft = null; render(); });

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
  /* Page-only styles for the teacher dashboard. Tokens + shared ui-* / btn-*
     components come from tilli.css; illustration hex comes from ART (top of file). */
  #dash-root { position: fixed; inset: 0; overflow: auto; background: var(--white); }
  .dash { min-height: 100vh; min-height: 100dvh; display: flex; background: var(--white); color: var(--ink-900); }
  .dash-side { width: 224px; flex: none; background: var(--white); border-right: 1px solid var(--line-200); padding: 22px 16px; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; height: 100dvh; }
  .dash-side.narrow { width: 76px; padding: 22px 10px; align-items: center; }
  .dash-brand { display: flex; align-items: center; gap: 10px; padding: 6px 8px 22px; }
  .dash-logo { width: 34px; height: 34px; border-radius: var(--radius-md); background: var(--wash-green); display: flex; align-items: center; justify-content: center; flex: none; }
  .dash-word { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); color: var(--ink-900); }
  .dash-nav { display: flex; flex-direction: column; gap: 5px; width: 100%; }
  .dash-navbtn { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: var(--radius-md); border: none; cursor: pointer; background: none; color: var(--ink-450); font-family: var(--font-body); font-weight: 700; font-size: var(--fs-md); width: 100%; transition: background .15s, color .15s; }
  .dash-side.narrow .dash-navbtn { justify-content: center; padding: 11px; }
  .dash-navbtn:hover { background: var(--surface-100); }
  .dash-navbtn.on { background: var(--wash-green); color: var(--green-700); }
  .dash-navbtn .ic { display: flex; flex: none; }
  .dash-profilebtn { margin-top: auto; display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 10px 8px; border-radius: var(--radius-md); width: 100%; font-family: var(--font-body); }
  .dash-side.narrow .dash-profilebtn { justify-content: center; }
  .dash-profilebtn:hover { background: var(--surface-100); }
  /* .ui-avatar.sm, kept in the teacher's pink identity colour (same as .dash-avatarbtn) */
  .dash-avatar { background: var(--pink-400); color: var(--white); }
  .dash-prof-meta { display: flex; flex-direction: column; text-align: left; line-height: 1.15; }
  .dash-prof-meta b { font-size: var(--fs-sm); color: var(--ink-900); }
  .dash-prof-meta span { font-size: var(--fs-xs); color: var(--ink-300); }
  .dash-col { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; }
  .dash-header { position: sticky; top: 0; z-index: 30; background: color-mix(in srgb, var(--white) 90%, transparent); backdrop-filter: blur(8px); padding: 14px 30px 6px; border-bottom: 1px solid var(--line-200); }
  .dash-header:empty { display: none; }
  .dash-chips { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 4px; scrollbar-width: none; }
  .dash-chips::-webkit-scrollbar { display: none; }
  .dash-chips .ui-filterchip, .stu-picker .ui-filterchip { flex: none; }
  .dash-main { flex: 1; padding: 28px 40px; max-width: 1500px; width: 100%; margin: 0 auto; }
  .dash-wrap { max-width: 1180px; margin: 0 auto; width: 100%; }
  .dash-h1 { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-2xl); margin: 0; color: var(--ink-900); }
  .dash-sub { margin: 6px 0 0; color: var(--ink-450); font-size: var(--fs-md); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* page-local helpers */
  .td-rows { padding: 8px 20px; }                                   /* ui-card holding .pf-row / .hist-row lists */
  .td-btnrow { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 18px; }
  .td-btn-md { padding: 12px 20px; font-size: var(--fs-md); text-decoration: none; display: inline-block; }
  .td-btn-md.btn-danger-outline:hover { color: var(--danger-700); }   /* beat tilli.css a:hover on the sign-out link */
  .td-in { padding: 10px 12px; background: var(--surface-100); }    /* .input variant: compact, soft fill */
  .td-in:focus { background: var(--white); }
  .td-uid { font-family: var(--font-heading); font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .td-good { color: var(--green-700); }
  .td-help { color: var(--warn-700); }
  .td-lead { margin: 0 0 14px; font-size: var(--fs-md); color: var(--ink-450); line-height: 1.45; }
  .svg-t { font-family: var(--font-body); }
  .ui-legend .lg-t { display: inline; font-weight: 600; }
  .btn-soft.green:hover { background: color-mix(in srgb, var(--green-500) 14%, var(--white)); }

  /* garden beds */
  .garden-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .garden-head-right { display: flex; align-items: center; gap: 14px; }
  .dash-avatarbtn { width: 42px; height: 42px; border-radius: 50%; background: var(--pink-400); color: var(--white); border: none; cursor: pointer; font-family: var(--font-body); font-weight: 800; font-size: var(--fs-md); flex: none; box-shadow: var(--shadow-card); }
  .dash-avatarbtn:hover { filter: brightness(1.05); }
  .gardener { flex: none; animation: tdFloat 4.6s ease-in-out infinite; }
  @keyframes tdFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @media (prefers-reduced-motion: reduce) { .gardener { animation: none; } }
  .beds-grid { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: center; gap: 12px 26px; padding: 8px 0; }
  .bed-wrap { display: flex; flex-direction: column; align-items: center; background: none; border: none; padding: 0; cursor: pointer; font-family: var(--font-body); }
  .bed-stage { position: relative; flex: none; }
  .bed-plant { position: absolute; }
  .bed-plant:hover { z-index: 500 !important; }
  .bed-tip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); z-index: 600; width: 212px; text-align: left; opacity: 0; visibility: hidden; transition: opacity .12s; pointer-events: none; }
  .bed-plant:hover .bed-tip { opacity: 1; visibility: visible; }
  .bed-tip .bl { margin: 2px 0 7px; }
  .bed-tip .rw { font-size: var(--fs-sm); color: var(--ink-450); margin-top: 4px; }
  .bed-label { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 10px; }
  .bed-label .nm { background: var(--white); border: 1.5px solid var(--line-200); border-radius: var(--radius-md); padding: 7px 18px; font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); color: var(--ink-900); box-shadow: var(--shadow-card); }
  .bed-label .ct { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; }
  .bed-add { position: absolute; left: 0; bottom: 0; width: 100%; height: 56px; border-radius: var(--radius-card) var(--radius-card) var(--radius-lg) var(--radius-lg); display: flex; align-items: center; justify-content: center; gap: 10px; background: var(--wash-green); border: 2.5px dashed var(--green-500); color: var(--green-700); font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); }
  .bed-add .plus { width: 30px; height: 30px; border-radius: 50%; background: var(--white); display: flex; align-items: center; justify-content: center; font-size: var(--fs-lg); line-height: 1; }
  /* bed key + section-garden legend (ui-legend) */
  .garden-key { gap: 10px 26px; margin-top: 22px; padding-top: 16px; border-top: 1.5px dashed color-mix(in srgb, var(--green-500) 35%, transparent); position: relative; z-index: 1; }
  .garden-key b { color: var(--ink-900); }

  /* class modal (ui-scrim + ui-modal-card). z-index stays above the bed plants' hover stack. */
  .cm-backdrop { z-index: 600; }
  .cm-card { max-width: 680px; max-height: 82vh; display: flex; flex-direction: column; padding: 0; overflow: hidden; border: 1px solid var(--line-200); }
  .cm-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px 24px 16px; border-bottom: 1px solid var(--line-200); }
  .cm-title { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-xl); color: var(--ink-900); }
  .cm-sub { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; margin-top: 3px; }
  .cm-list { overflow: auto; padding: 8px 10px 4px; }
  /* change history: class modal, "Last updated" line, student "Record changes" card */
  .hist-card .hist-tools { padding: 14px 24px 0; margin-bottom: 4px; }
  .hist-scroll { overflow: auto; padding: 4px 24px 20px; }
  .stu-headbtns { align-self: flex-start; display: flex; align-items: center; gap: 8px; }
  .log-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .stu-changes-h { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin-bottom: 10px; }
  .cm-row { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; background: none; border: none; border-radius: var(--radius-md); padding: 11px 14px; cursor: pointer; font-family: var(--font-body); }
  .cm-row:hover { background: var(--surface-100); }
  .cm-bloom { flex: none; width: 42px; height: 42px; border-radius: 50%; background: var(--wash-green); display: flex; align-items: center; justify-content: center; }
  .cm-info { flex: 1; min-width: 0; }
  .cm-info .nm { font-weight: 800; font-size: var(--fs-md); color: var(--ink-900); }
  .cm-info .sk { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 4px; font-size: var(--fs-sm); color: var(--green-700); }
  .cm-band { flex: none; font-size: var(--fs-sm); font-weight: 700; color: var(--ink-300); }
  .cm-foot { padding: 14px 24px 20px; border-top: 1px solid var(--line-200); }

  /* section garden */
  .blossom-pill { display: flex; align-items: center; gap: 9px; background: var(--wash-yellow); color: var(--lvl-2-ink); padding: 9px 15px; border-radius: var(--radius-md); font-weight: 600; font-size: var(--fs-sm); }
  .plant-bed { position: relative; margin: 18px 0 8px; padding: 26px 20px 30px; border-radius: var(--radius-card); background: ${ART.bedGround}; overflow: hidden; }
  .pg-grid { display: grid; gap: 2px 4px; align-items: end; position: relative; z-index: 1; }
  .pg-cell { position: relative; display: flex; flex-direction: column; align-items: center; }
  .pg-plant { background: none; border: none; cursor: pointer; padding: 0; line-height: 0; transition: transform .18s; }
  .pg-plant:hover { transform: translateY(-3px); }
  .pg-tip { position: absolute; bottom: calc(100% - 8px); left: 50%; transform: translateX(-50%); z-index: 20; padding: 12px 14px; width: 186px; opacity: 0; visibility: hidden; transition: opacity .12s; pointer-events: none; }
  .pg-cell:hover .pg-tip { opacity: 1; visibility: visible; }
  .pg-tip .nm { margin-bottom: 3px; }
  .pg-tip .sl { font-size: var(--fs-xs); color: var(--ink-300); margin-bottom: 8px; }
  .pg-tip .ch { display: flex; gap: 5px; margin-bottom: 9px; flex-wrap: wrap; }
  .pg-tip .vw { font-size: var(--fs-sm); font-weight: 700; color: var(--green-700); }
  .tend-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 14px; }
  .tend-card { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-xl); padding: 16px; display: flex; flex-direction: column; box-shadow: var(--shadow-card); }
  .tend-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .tend-top .pl { flex: none; }
  .tend-top .nm { font-weight: 800; font-size: var(--fs-md); line-height: 1.1; display: block; }
  .tend-top .bd { font-size: var(--fs-xs); color: var(--ink-300); font-weight: 600; }
  .tend-card .reason { margin: 2px 0 14px; font-size: var(--fs-md); color: var(--ink-450); line-height: 1.4; }
  /* Primary "Ask Tilli" action inside cards. margin-top:auto pins it to the card bottom in flex-column cards. */
  .btn-ask-a { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: auto; border: none; cursor: pointer;
    background: var(--green-500); color: var(--white); font-family: var(--font-body); font-weight: 700; font-size: var(--fs-sm); padding: 10px 12px; border-radius: var(--radius-pill); transition: background .15s; }
  .btn-ask-a:hover { background: var(--green-600); }
  .btn-ask-a.inline { width: auto; }
  .hl-card { background: ${ART.highlight}; border-radius: var(--radius-xl); padding: 20px 22px; }
  .hl-card .ui-eyebrow { color: var(--pink-600); }
  .hl-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .hl-chip { background: color-mix(in srgb, var(--white) 70%, transparent); color: var(--pink-600); font-weight: 700; font-size: var(--fs-sm); padding: 8px 13px; border-radius: var(--radius-md); }
  .hl-more { background: none; border: none; color: var(--pink-600); font-weight: 700; font-size: var(--fs-sm); cursor: pointer; padding: 0; font-family: var(--font-body); }
  .hl-more.boxed { background: color-mix(in srgb, var(--white) 75%, transparent); border-radius: var(--radius-md); padding: 10px 14px; }
  .grow-card { background: var(--surface-100); border: 1px solid var(--line-200); border-radius: var(--radius-xl); padding: 20px 22px; }
  .grow-card .ui-eyebrow { color: var(--lvl-2-ink); }
  .grow-list { display: flex; flex-direction: column; gap: 10px; }
  .grow-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .grow-row .nm { font-weight: 700; font-size: var(--fs-md); }
  .grow-row .sub { font-size: var(--fs-sm); color: var(--ink-300); }
  .grow-ask { background: var(--wash-yellow); color: var(--lvl-2-ink); white-space: nowrap; }   /* .btn-soft, Learner-amber variant */

  /* ask tilli — chat window pinned to the floating bubble (positionAskPop sets
     its left/right/top/bottom + max-height; these are the no-anchor fallbacks). */
  .ask-panel {
    --ask-pop-w: 380px;   /* chat window width */
    --ask-pop-h: 560px;   /* chat window height (capped by the space beside the bubble) */
    position: fixed; z-index: 61; right: 22px; bottom: 104px; width: var(--ask-pop-w); max-width: calc(100vw - 16px); height: var(--ask-pop-h);
    background: var(--white); display: flex; flex-direction: column; overflow: hidden;
    border: 1px solid var(--line-200); border-radius: var(--radius-xl); box-shadow: var(--shadow-modal);
    transition: left .42s cubic-bezier(.22, 1.12, .36, 1), right .42s cubic-bezier(.22, 1.12, .36, 1), top .42s cubic-bezier(.22, 1.12, .36, 1), bottom .42s cubic-bezier(.22, 1.12, .36, 1);
  }
  .ask-panel.following { transition: none; }   /* tracking a drag 1:1 */
  /* Grows out of the bubble: origin is the corner the bubble sits in. */
  .ask-panel[data-from="br"] { transform-origin: bottom right; } .ask-panel[data-from="bl"] { transform-origin: bottom left; }
  .ask-panel[data-from="tr"] { transform-origin: top right; }    .ask-panel[data-from="tl"] { transform-origin: top left; }
  .ask-panel.pop-in { animation: askPopIn .26s cubic-bezier(.22, 1.12, .36, 1) both; }
  @keyframes askPopIn { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .ask-panel { transition: none; } .ask-panel.pop-in { animation: none; } }
  .ask-scrim { display: none; }   /* desktop/tablet: no dimming — it's a chat, not a modal */
  .ask-head { display: flex; align-items: center; gap: 10px; padding: 12px 12px 12px 16px; border-bottom: 1px solid var(--line-200); }
  .ask-ic { width: 34px; height: 34px; border-radius: var(--radius-md); background: var(--wash-green); display: flex; align-items: center; justify-content: center; flex: none; }
  .ask-hmeta { flex: 1; } .ask-hmeta .t { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); } .ask-hmeta .s { font-size: var(--fs-xs); color: var(--ink-300); }
  .ask-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
  .ask-ctx { align-self: flex-start; white-space: normal; --badge-bg: var(--wash-green); --badge-fg: var(--green-700); }   /* .ui-badge */
  .ask-msg { max-width: 85%; padding: 10px 14px; font-size: var(--fs-sm); line-height: 1.45; }
  .ask-msg.user { align-self: flex-end; background: var(--green-500); color: var(--white); border-radius: 14px 14px 4px 14px; }
  .ask-msg.tilli { align-self: flex-start; background: var(--surface-100); color: var(--ink-700); border-radius: 14px 14px 14px 4px; }
  .ask-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; margin: auto 0; text-align: center; color: var(--ink-300); font-size: var(--fs-sm); max-width: 240px; align-self: center; line-height: 1.5; }
  .ask-foot { padding: 10px 12px 12px; border-top: 1px solid var(--line-200); }
  .ask-compose { display: flex; align-items: flex-end; gap: 8px; }
  .ask-input { flex: 1; min-width: 0; border: 1px solid var(--line-200); border-radius: var(--radius-md); padding: 10px 12px; font-size: var(--fs-sm); color: var(--ink-900); resize: none; outline: none; background: var(--white); line-height: 1.45; font-family: var(--font-body); }
  .ask-input:focus { border-color: var(--focus); }
  .ask-sendbtn { flex: none; width: 40px; height: 40px; display: grid; place-items: center; border: none; border-radius: var(--radius-md); background: var(--green-500); color: var(--white); cursor: pointer; }
  .ask-sendbtn:hover:not(:disabled) { background: var(--green-600); }
  .ask-sendbtn:disabled { opacity: .5; cursor: default; }
  /* ask tilli (full screen — nav destination) */
  .dash-col.ask-mode { height: 100vh; height: 100dvh; }
  .dash-main.ask-mode { padding: 0; max-width: none; display: flex; min-height: 0; }
  .askx {
    /* --- tunable visual parameters --- */
    --askx-hist-w: 300px;     /* width of the chat-history column */
    --askx-max: 760px;        /* max width of the thread, suggestions and composer */
    --askx-foot-pr: 84px;     /* composer right padding — keeps Send clear of the Need-help bubble */
    flex: 1; min-width: 0; min-height: 0; display: flex; position: relative; background: var(--white);
  }
  .askx-hist { width: var(--askx-hist-w); flex: none; display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--line-200); background: var(--surface-100); }
  /* .askx-hist prefix outranks tilli.css's .btn.block { width:100% }, which with the
     16px margins pushed the button 32px past the column into the chat header. */
  .askx-hist .askx-new { margin: 0; width: auto; flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .askx-hist { position: relative; }
  .askx-hist-top { display: flex; align-items: center; gap: 8px; padding: 16px; }
  .askx-collapse { color: var(--ink-450); }
  /* Drag handle on the column's right edge: an 8px hit area, a 2px green line on hover / drag / focus. */
  .askx-resize { position: absolute; top: 0; bottom: 0; right: -4px; width: 8px; z-index: 3; cursor: col-resize; touch-action: none; }
  .askx-resize::after { content: ''; position: absolute; top: 0; bottom: 0; left: 3px; width: 2px; background: transparent; transition: background .15s; }
  .askx-resize:hover::after, .askx-resize.dragging::after, .askx-resize:focus-visible::after { background: var(--green-500); }
  .askx-resize:focus-visible { outline: none; }
  @media (min-width: 761px) {
    .askx.collapsed .askx-hist { display: none; }
    .askx.collapsed .askx-histbtn { display: grid; }
  }
  .askx-list { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 10px 12px; border-top: 1px solid var(--line-200); }
  .askx-gh { font-size: var(--fs-xs); font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--ink-450); padding: 16px 8px 6px; }
  .askx-item { display: flex; align-items: center; border-radius: var(--radius-md); }
  .askx-item:hover { background: var(--white); }
  .askx-item.on { background: var(--white); box-shadow: inset 3px 0 0 var(--green-500); }
  .askx-open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 11px 8px 11px 10px; background: none; border: none; cursor: pointer; font: inherit; font-size: var(--fs-sm); font-weight: 600; color: var(--ink-900); text-align: left; }
  .askx-open svg { flex: none; color: var(--ink-450); }
  .askx-open span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .askx-del { flex: none; display: grid; place-items: center; padding: 8px; margin-right: 4px; background: none; border: none; cursor: pointer; color: var(--ink-300); border-radius: var(--radius-xs); }
  .askx-del:hover { color: var(--danger-700); background: var(--danger-wash); }
  /* Delete appears on the row you're pointing at (or the open chat) — a column of
     bins on every row read as noise and invited mis-taps. Always shown on touch. */
  .askx-del { opacity: 0; transition: opacity .12s; }
  .askx-item:hover .askx-del, .askx-item.on .askx-del, .askx-del:focus-visible { opacity: 1; }
  @media (hover: none) { .askx-del { opacity: 1; } }
  .askx-none { padding: 18px 8px; font-size: var(--fs-sm); color: var(--ink-300); }
  .askx-clear { display: flex; align-items: center; gap: 9px; padding: 14px 20px; background: none; border: none; border-top: 1px solid var(--line-200); cursor: pointer; font: inherit; font-size: var(--fs-sm); font-weight: 600; color: var(--ink-450); text-align: left; }
  .askx-clear:hover { color: var(--danger-700); }
  .askx-scrim { display: none; }
  .askx-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
  .askx-tools { margin-left: auto; flex: none; display: flex; gap: 8px; }   /* minimise + export, pushed to the right of the scope row */
  /* Export confirm popover — hangs under the Export button, right-aligned. */
  .askx-export-wrap { position: relative; }
  .askx-pop { position: absolute; top: calc(100% + 8px); right: 0; z-index: 20; width: 270px; max-width: calc(100vw - 32px); background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-md); box-shadow: 0 10px 28px rgba(20, 20, 20, .14); padding: 14px 14px 12px; }
  .askx-pop p { margin: 0; font-size: var(--fs-sm); line-height: 1.45; color: var(--ink-700); overflow-wrap: anywhere; }
  .askx-pop p b { color: var(--ink-900); font-weight: 700; }
  .askx-pop-act { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  .askx-tool { width: 42px; height: 42px; flex: none; display: grid; place-items: center; background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-md); color: var(--ink-700); cursor: pointer; }
  .askx-tool:hover:not(:disabled) { background: var(--surface-100); }
  .askx-tool:disabled { opacity: .4; cursor: default; }
  .askx-histbtn { display: none; }
  /* Scope: one row — label + picker (the old "Currently scoped to" line only repeated the picker). */
  .askx-scope { display: flex; align-items: center; gap: 10px; padding: 10px 24px; border-bottom: 1px solid var(--line-200); }
  .askx-scope-l { flex: none; display: flex; align-items: center; gap: 6px; font-size: var(--fs-xs); font-weight: 700; color: var(--ink-450); }
  .askx-select {
    flex: 1; min-width: 0; max-width: 340px; appearance: none; -webkit-appearance: none; cursor: pointer;
    border: 1px solid var(--line-200); border-radius: var(--radius-md); padding: 11px 40px 11px 14px;
    font: inherit; font-size: var(--fs-sm); font-weight: 600; color: var(--ink-900);
    background: var(--white) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235B6170' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 14px center / 16px;
  }
  .askx-select:focus { outline: none; border-color: var(--focus); }
  .askx-body { flex: 1; min-height: 0; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; background: var(--surface-100); }
  .askx-thread { width: 100%; max-width: var(--askx-max); margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
  .askx-thread .ask-msg { font-size: var(--fs-md); line-height: 1.55; }
  .askx-thread .ask-msg.tilli { background: var(--white); border: 1px solid var(--line-200); }
  .askx-empty { margin: auto; width: 100%; max-width: var(--askx-max); display: flex; flex-direction: column; align-items: center; text-align: center; }
  .askx-spark { width: 92px; height: 92px; border-radius: 50%; background: var(--wash-green); color: var(--green-600); display: grid; place-items: center; margin-bottom: 18px; }
  .askx-empty h2 { margin: 0; font-family: var(--font-heading); font-size: var(--fs-xl); color: var(--ink-900); }
  .askx-empty p { margin: 10px 0 0; max-width: 520px; font-size: var(--fs-md); line-height: 1.55; color: var(--ink-450); }
  .askx-try { width: 100%; margin-top: 34px; display: flex; flex-direction: column; gap: 8px; text-align: left; }
  .askx-try-h { font-size: var(--fs-sm); font-weight: 700; color: var(--ink-450); margin-bottom: 2px; }
  .askx-sug { text-align: left; padding: 12px 16px; background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-md); cursor: pointer; font: inherit; font-size: var(--fs-sm); font-weight: 600; color: var(--ink-900); }
  .askx-sug:hover { border-color: var(--green-500); background: var(--wash-green); }
  .askx-foot { padding: 14px var(--askx-foot-pr) 10px 24px; border-top: 1px solid var(--line-200); background: var(--white); }
  .askx-compose { max-width: var(--askx-max); margin: 0 auto; display: flex; gap: 10px; }
  .askx-input { flex: 1; min-width: 0; padding: 13px 16px; border: 1.5px solid var(--line-200); border-radius: var(--radius-md); outline: none; background: var(--white); font: inherit; font-size: var(--fs-md); color: var(--ink-900); }
  .askx-input:focus { border-color: var(--green-500); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green-500) 18%, transparent); }
  .askx-send { width: 50px; flex: none; display: grid; place-items: center; border: none; border-radius: var(--radius-md); background: var(--green-500); color: var(--white); cursor: pointer; }
  .askx-send:hover:not(:disabled) { background: var(--green-600); }
  .askx-send:disabled { opacity: .5; cursor: default; }
  .askx-note { max-width: var(--askx-max); margin: 8px auto 0; text-align: center; font-size: var(--fs-xs); line-height: 1.4; color: var(--ink-300); }
  @media (max-width: 1023px) { .askx { --askx-hist-w: 250px; } }
  /* Narrow: history becomes a slide-in drawer behind the header button. */
  @media (max-width: 760px) {
    .askx-hist { position: absolute; z-index: 5; top: 0; bottom: 0; left: 0; width: min(300px, 86%); transform: translateX(-102%); transition: transform .2s var(--ease); box-shadow: var(--shadow-modal); }
    .askx.hist-open .askx-hist { transform: none; }
    .askx.hist-open .askx-scrim { display: block; position: absolute; inset: 0; z-index: 4; border: none; background: color-mix(in srgb, var(--ink-900) 28%, transparent); }
    .askx-histbtn { display: grid; }
    .askx-resize { display: none; }   /* drawer width is fixed on narrow screens */
    .askx-scope { padding: 8px 14px; gap: 8px; }
    .askx-scope-l span { display: none; }   /* phones: just the pin, so picker + tools fit one row */
    .askx-body { padding: 16px 14px; }
    .askx-foot { padding: 10px var(--askx-foot-pr) 8px 14px; }
    .askx-try { margin-top: 22px; }
  }
  @media (max-width: 639px) {
    .dash-main.ask-mode { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
    .askx { --askx-foot-pr: 66px; }
  }
  @media (prefers-reduced-motion: reduce) { .askx-hist { transition: none; } }

  /* students: roster */
  .roster-tools { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0 16px; }
  .roster-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 9px; background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-md); padding: 10px 14px; }
  .roster-search svg { flex: none; color: var(--ink-300); }
  .roster-search input { border: none; outline: none; background: none; font-size: var(--fs-md); width: 100%; font-family: var(--font-body); color: var(--ink-900); }
  .roster-sort { display: flex; gap: 6px; align-items: center; }
  .roster-sort > span { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; }
  .roster-list { display: flex; flex-direction: column; gap: 9px; }
  .roster-row { display: flex; align-items: center; gap: 14px; background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-lg); padding: 10px 16px 10px 10px; cursor: pointer; text-align: left; font-family: var(--font-body); transition: box-shadow .15s; }
  .roster-row:hover { box-shadow: var(--shadow-hover); }
  .rr-plant { flex: none; }
  .rr-info { flex: 1; min-width: 0; }
  .rr-info .nm { font-weight: 800; font-size: var(--fs-md); display: block; }
  .rr-info .sl { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; }
  .rr-chips { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }

  /* students: detail */
  .stu-head { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-card); padding: 18px 22px; margin-bottom: 16px; }
  .stu-plant { flex: none; }
  .stu-meta { flex: 1; min-width: 180px; }
  .stu-name { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-xl); margin: 0; }
  .stu-sub { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; margin: 3px 0 9px; }
  .stu-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .stu-tabs { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 18px; scrollbar-width: none; }
  .stu-tabs::-webkit-scrollbar { display: none; }
  .sg-title { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); margin: 0 0 12px; color: var(--ink-900); }
  .skill-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap: 12px; }
  .skill-card { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-lg); padding: 14px 15px; }
  .sc-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
  .sc-head .nm { font-weight: 700; font-size: var(--fs-md); line-height: 1.2; }
  .sc-head .ui-badge { flex: none; }
  .sc-bars { display: flex; gap: 8px; margin-bottom: 12px; }
  .scw { flex: 1; text-align: center; }
  .scw-col { height: 44px; display: flex; align-items: flex-end; justify-content: center; }
  .scw-bar { width: 16px; border-radius: var(--radius-xs) var(--radius-xs) 3px 3px; }
  .scw-l { font-size: var(--fs-xs); color: var(--ink-300); font-weight: 700; margin-top: 4px; }
  .scw-v { font-size: var(--fs-xs); color: var(--ink-450); font-weight: 700; }
  .sc-persp { display: flex; justify-content: space-between; font-size: var(--fs-xs); color: var(--ink-450); border-top: 1px dashed var(--line-200); padding-top: 9px; margin-bottom: 11px; }
  .sc-full { width: 100%; justify-content: center; }
  .persp-note { background: var(--wash-cyan); border-radius: var(--radius-lg); padding: 16px 20px; margin-bottom: 16px; font-size: var(--fs-md); color: var(--info-ink); line-height: 1.5; }
  .persp-note.green { background: var(--wash-green); color: var(--green-700); }
  .persp-legend { justify-content: center; margin-top: 10px; }
  .gap-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 12px; border-bottom: 1px solid var(--line-200); }
  .gap-row:last-child { border-bottom: none; }
  .gap-row .nm { font-weight: 700; font-size: var(--fs-sm); }
  .gap-row .sub { font-size: var(--fs-xs); color: var(--ink-300); }
  .gap-right { display: flex; align-items: center; gap: 8px; flex: none; }
  .gap-badge { --badge-bg: var(--wash-cyan); --badge-fg: var(--cyan-700); }
  .gap-ask { background: none; border: none; cursor: pointer; padding: 4px; }
  .hist-row { display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--line-200); align-items: flex-start; }
  .hist-row:last-child { border-bottom: none; }
  .hist-row .dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 4px; flex: none; }
  .hist-row .hm { flex: 1; } .hist-row .hm .nm { font-weight: 700; font-size: var(--fs-md); } .hist-row .hm .sub { font-size: var(--fs-sm); color: var(--ink-300); }
  .hist-row .st { font-size: var(--fs-sm); font-weight: 700; }
  /* Previous classes — header chips + multi-year History tab */
  .stu-past { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  .stu-past-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--surface-100); border: 1px solid var(--line-200); border-radius: var(--radius-pill); padding: 4px 6px 4px 12px; font-family: var(--font-body); font-weight: 700; font-size: var(--fs-xs); color: var(--ink-600); }
  .stu-past-chip .pc-cls { white-space: nowrap; }
  button.stu-past-chip { cursor: pointer; transition: border-color .15s; }
  button.stu-past-chip:hover { border-color: var(--green-500); }
  .hist-sec-h { margin: 22px 0 10px; }
  .hist-sec-h:first-child { margin-top: 0; }
  .hist-table th small { font-weight: 600; }
  .hist-table th.now, .hist-table td.now { background: var(--wash-green); }
  .hs-cell { display: inline-flex; align-items: center; gap: 8px; }
  .hs-cell b { font-size: var(--fs-sm); color: var(--ink-900); font-variant-numeric: tabular-nums; }
  .past-years { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
  .py-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .py-t { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); color: var(--ink-900); }
  .py-sub { font-weight: 600; font-size: var(--fs-sm); color: var(--ink-300); margin-top: 2px; }
  .py-grow { font-weight: 600; font-size: var(--fs-sm); color: var(--ink-450); margin: 10px 0; }
  .py-grow b { color: var(--green-700); }
  .py-note { background: var(--surface-100); border-radius: var(--radius-md); padding: 10px 12px; }
  .py-note p { margin: 0; font-weight: 600; font-size: var(--fs-sm); color: var(--ink-600); line-height: 1.55; }

  /* profile */
  .pf-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--line-200); }
  .pf-row:last-child { border-bottom: none; }
  .pf-row .k { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 700; }
  .pf-row .v { font-size: var(--fs-md); color: var(--ink-900); font-weight: 600; text-align: right; }

  /* observations */
  .obs-vine { position: relative; max-width: 640px; }
  .obs-vine-svg { position: absolute; left: 0; top: 0; pointer-events: none; }
  .obs-nodes { position: relative; z-index: 1; }
  .obs-row { display: flex; gap: 16px; min-height: 152px; }
  .obs-node { width: 72px; flex: none; display: flex; align-items: flex-start; justify-content: center; padding-top: 7px; }
  .obs-marker { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .obs-marker.active { background: var(--lvl-2-wash); box-shadow: 0 0 0 5px color-mix(in srgb, var(--lvl-2-soft) 28%, transparent); }
  .obs-marker.lock { width: 38px; height: 38px; background: var(--line-200); margin-top: 3px; }
  .obs-card { flex: 1; min-width: 0; text-align: left; border: none; border-radius: var(--radius-lg); padding: 15px 18px; font-family: var(--font-body); color: var(--ink-900); cursor: pointer; background: var(--white); box-shadow: inset 0 0 0 1px var(--line-200); }
  .obs-card.active { background: var(--warn-wash); box-shadow: 0 0 0 2px var(--lvl-2-soft), 0 12px 28px color-mix(in srgb, var(--orange-500) 14%, transparent); }
  .obs-card.locked { background: var(--surface-100); opacity: .72; cursor: default; }
  .obs-card:disabled { cursor: default; }
  .obs-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .obs-card-top .ui-badge { flex: none; }
  .obs-card-title { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); }
  .obs-card.locked .obs-card-title { color: var(--ink-300); }
  .obs-meta { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; margin-top: 3px; }
  .obs-body { font-size: var(--fs-md); color: var(--ink-450); margin-top: 8px; }
  .obs-cta { display: inline-flex; margin-top: 12px; background: var(--wash-green); color: var(--green-700); border-radius: var(--radius-md); padding: 9px 16px; font-weight: 700; font-size: var(--fs-sm); }
  .obs-cta.active { background: var(--green-500); color: var(--white); }
  .obs-enter { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-card); padding: 22px 24px; }
  .obs-enter-head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
  .obs-enter-head .pl { flex: none; }
  .obs-enter-head .nm { font-weight: 800; font-size: var(--fs-md); }
  .obs-enter-head .sub { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; }
  .obs-prog { margin-left: auto; min-width: 190px; text-align: right; }
  .obs-prog-txt { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-450); }
  .obs-prog-txt b { color: var(--ink-900); font-weight: 800; }
  .obs-prog-pend { color: var(--lvl-2-ink); font-weight: 700; }
  .obs-prog-bar { margin-top: 6px; }
  @media (max-width: 640px) { .obs-enter-head { flex-wrap: wrap; } .obs-prog { margin-left: 0; width: 100%; text-align: left; } }
  .obs-dots { display: flex; gap: 5px; margin: 14px 0 18px; }
  .obs-dot { flex: 1; height: 5px; border-radius: 3px; }
  .obs-q { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 700; margin-bottom: 4px; }
  .obs-skill { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); margin-bottom: 6px; }
  .obs-anchor { margin: 0 0 20px; font-size: var(--fs-md); color: var(--ink-450); line-height: 1.5; }
  .obs-stars { display: grid; grid-template-columns: repeat(auto-fit,minmax(130px,1fr)); gap: 10px; }
  .obs-star { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; cursor: pointer; border: 2px solid var(--line-200); background: var(--white); border-radius: var(--radius-md); padding: 13px 15px; font-family: var(--font-body); color: var(--ink-900); min-height: 58px; }
  .obs-star .row { display: flex; gap: 2px; }
  .obs-star .lb { font-weight: 700; font-size: var(--fs-md); }
  .obs-star.on { border-color: var(--green-500); background: var(--wash-green); }
  .obs-nav { display: flex; justify-content: space-between; margin-top: 22px; }
  .obs-celebrate { text-align: center; padding: 26px; margin-top: 16px; background: var(--wash-pink); border-radius: var(--radius-card); }
  .obs-celebrate .msg { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); color: var(--pink-600); margin-top: 8px; }

  /* logs */
  .log-tabs { display: flex; gap: 6px; margin-bottom: 18px; flex-wrap: wrap; }
  .log-legend { gap: 10px 20px; margin: 0 0 18px; }
  .win-cards { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 14px; margin-bottom: 20px; }
  .win-card { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-xl); padding: 18px 20px; display: flex; align-items: center; gap: 16px; }
  .win-card .ring { flex: none; }
  /* Pickable window cards (Assess → Tracker → By class) */
  .win-card.pick { width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer; transition: border-color .15s, box-shadow .15s, background .15s; }
  .win-card.pick:hover:not(.locked) { border-color: var(--green-500); }
  .win-card.pick.on { border-color: var(--green-500); box-shadow: 0 0 0 3px var(--wash-green); }
  .win-card.pick.locked { cursor: not-allowed; background: var(--surface-100); }
  .win-card.pick.locked .ring, .win-card.pick.locked .wc-label, .win-card.pick.locked .wc-sub { opacity: .5; }
  .wc-lock { background: var(--white); border: 1px solid var(--line-200); color: var(--ink-450); }
  .win-pick-foot { display: flex; justify-content: flex-end; margin: -6px 0 16px; }
  .wc-label { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); }
  .wc-sub { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; margin: 2px 0 6px; }
  .mtx-wrap { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-xl); padding: 8px; overflow-x: auto; }
  .mtx { min-width: 520px; }
  .mtx-head, .mtx-row { display: grid; grid-template-columns: minmax(116px,1.4fr) repeat(3, minmax(88px,1fr)); gap: 8px; }
  .mtx-head { padding: 10px 12px 12px; }
  .mtx-corner { align-self: end; }
  .mtx-h { text-align: center; } .mtx-h .l { font-weight: 800; font-size: var(--fs-sm); color: var(--ink-700); } .mtx-h .s { font-size: var(--fs-xs); color: var(--ink-300); }
  .mtx-row { width: 100%; text-align: left; background: none; border: none; border-top: 1px solid var(--line-200); padding: 8px 12px; cursor: pointer; font-family: var(--font-body); align-items: center; }
  .mtx-row:hover { background: var(--surface-100); }
  .mtx-name { display: flex; align-items: center; gap: 9px; min-width: 0; }
  .mtx-name .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .mtx-name span:last-child { font-weight: 700; font-size: var(--fs-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mtx-cell { border-radius: var(--radius-md); padding: 8px 10px; }
  .mtx-cell .cl { font-weight: 800; font-size: var(--fs-xs); margin-bottom: 5px; }
  .mtx-cell .cp { display: flex; gap: 6px; font-size: var(--fs-sm); line-height: 1; }
  .log-strip-title { margin: 24px 0 12px; }
  .strip-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 12px; }
  .strip-card { text-align: left; cursor: pointer; border: 1px solid var(--line-200); background: var(--white); border-radius: var(--radius-lg); padding: 16px 18px; font-family: var(--font-body); }
  .strip-card.on { border: 2px solid var(--green-500); background: var(--wash-green); padding: 15px 17px; }
  .strip-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; }
  .strip-top .nm { font-weight: 800; font-size: var(--fs-md); } .strip-top .pct { font-size: var(--fs-sm); font-weight: 700; color: var(--green-700); }
  .strip-bar { margin-bottom: 9px; }
  .strip-cap { font-size: var(--fs-xs); color: var(--ink-300); font-weight: 600; }
  .stu-picker { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 18px; scrollbar-width: none; }
  .stu-picker::-webkit-scrollbar { display: none; }
  .logstu-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-card); padding: 16px 20px; margin-bottom: 16px; }
  .logstu-head .m { flex: 1; min-width: 160px; }
  .logstu-bar { max-width: 260px; margin-top: 8px; }
  .tl { display: flex; flex-direction: column; gap: 14px; }
  .tl-row { display: flex; gap: 14px; }
  .tl-dot-wrap { display: flex; flex-direction: column; align-items: center; flex: none; padding-top: 4px; }
  .tl-dot { width: 15px; height: 15px; border-radius: 50%; }
  .tl-line { flex: 1; width: 2px; background: var(--line-200); margin-top: 4px; }
  .tl-card { flex: 1; background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-lg); padding: 16px 18px; margin-bottom: 2px; }
  .tl-card .btn-ask-a { margin-top: 14px; }
  .tl-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .tl-top .l { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); } .tl-top .s { font-size: var(--fs-sm); color: var(--ink-300); }
  .tl-persps { display: grid; grid-template-columns: repeat(auto-fit,minmax(150px,1fr)); gap: 8px; }
  .tl-persp { display: flex; align-items: center; gap: 9px; background: var(--surface-100); border: 1px solid var(--line-200); border-radius: var(--radius-md); padding: 9px 11px; }
  .tl-persp.done { background: var(--wash-green); border-color: var(--lvl-3-wash); }
  .tl-persp .ic { font-size: var(--fs-md); }
  .tl-persp .nm { font-weight: 700; font-size: var(--fs-sm); } .tl-persp .st { font-size: var(--fs-xs); font-weight: 700; color: var(--ink-300); }
  .tl-persp.done .st { color: var(--green-700); }
  .list-table { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-xl); overflow: hidden; overflow-x: auto; }
  .list-table .list-head, .list-row { display: grid; grid-template-columns: 1.8fr 1.1fr 1.1fr 1.1fr 1fr; gap: 10px; min-width: 640px; align-items: center; }
  .list-table .list-head { padding: 13px 20px; background: var(--surface-100); }
  .list-row { width: 100%; text-align: left; padding: 12px 20px; border: none; border-top: 1px solid var(--line-200); cursor: pointer; font-family: var(--font-body); background: none; }
  .list-row:hover { background: var(--surface-100); }
  .list-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .list-name .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .list-name span:last-child { font-weight: 700; font-size: var(--fs-md); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list-prog { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .list-prog .pb { width: 52px; height: 7px; }
  .list-prog span { font-size: var(--fs-sm); font-weight: 800; color: var(--ink-450); width: 26px; text-align: right; }

  /* insights */
  .ins-h { font-weight: 800; font-size: var(--fs-md); font-family: var(--font-heading); }
  .ins-sub { font-size: var(--fs-sm); color: var(--ink-300); margin-bottom: 18px; }
  .ins-foot { border-top: 1px dashed var(--line-200); margin-top: 16px; padding-top: 14px; }
  /* Level-tone fills for the Compare mini meters (never traffic-light red). */
  .ui-meter > .bs-fill-focus { background: var(--lvl-1-soft); } .ui-meter > .bs-fill-devel { background: var(--lvl-2-soft); } .ui-meter > .bs-fill-strong { background: var(--lvl-3-soft); }

  /* c) Detailed skill breakdown */
  .sb-toggle { display: flex; gap: 6px; margin: 4px 0 16px; }
  .sb-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .sb-card { text-align: left; background: var(--surface-100); border: 1px solid var(--line-200); border-radius: var(--radius-lg); padding: 14px 15px; cursor: pointer; font-family: var(--font-body); transition: border-color .2s, transform .2s var(--ease); }
  .sb-card:hover { border-color: color-mix(in srgb, var(--green-500) 35%, var(--white)); transform: translateY(-1px); }
  @media (prefers-reduced-motion: reduce) { .sb-card:hover { transform: none; } }
  .sb-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
  .sb-name { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); color: var(--ink-900); }
  .sb-tag-cog { background: color-mix(in srgb, var(--violet-500) 12%, var(--white)); color: color-mix(in srgb, var(--violet-500) 75%, var(--ink-900)); }   /* .ui-tag, violet */
  .scprog { display: flex; gap: 8px; margin-bottom: 10px; }
  .scph { flex: 1; background: var(--white); border-radius: var(--radius-sm); padding: 6px 4px; text-align: center; }
  .scph-l { display: block; font-size: var(--fs-xs); font-weight: 700; color: var(--ink-300); text-transform: uppercase; }
  .scph-v { display: block; font-size: var(--fs-sm); font-weight: 800; color: var(--ink-700); }
  .scph-empty .scph-v { color: var(--ink-300); }
  .sb-ask { display: inline-block; margin-top: 11px; font-size: var(--fs-sm); font-weight: 800; color: var(--green-700); }

  /* Perspectives */
  .pv-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 4px; }
  .pv-card { background: var(--surface-100); border-radius: var(--radius-md); padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .pv-skill { font-size: var(--fs-sm); font-weight: 700; color: var(--ink-700); }
  .pv-nums { display: flex; gap: 12px; }
  .pv-num { display: flex; flex-direction: column; align-items: center; line-height: 1.25; }
  .pv-num i { font-style: normal; font-size: var(--fs-sm); } .pv-num b { font-size: var(--fs-sm); font-weight: 800; color: var(--ink-900); } .pv-num em { font-style: normal; font-size: var(--fs-xs); font-weight: 700; color: var(--ink-300); text-transform: uppercase; }
  .wcl-list { display: flex; flex-direction: column; gap: 12px; }
  .wcl-item { background: var(--surface-100); border-radius: var(--radius-md); padding: 14px 16px; }
  .wcl-skill { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); color: var(--ink-900); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .wcl-gap { font-size: var(--fs-xs); font-weight: 800; color: var(--ink-450); background: var(--white); border-radius: var(--radius-xs); padding: 2px 8px; }
  .wcl-text { font-size: var(--fs-sm); line-height: 1.5; color: var(--ink-450); margin: 6px 0 12px; }

  /* Compare my sections */
  .cmp2-table { display: flex; flex-direction: column; }
  .cmp2-row { display: grid; grid-template-columns: 150px 1fr; gap: 14px; align-items: center; padding: 9px 0; border-top: 1px solid var(--line-200); }
  .cmp2-head { border-top: none; padding-bottom: 4px; }
  .cmp2-skill { font-size: var(--fs-sm); font-weight: 700; color: var(--ink-700); }
  .cmp2-cells { display: grid; gap: 12px; }
  .cmp2-secname { font-size: var(--fs-xs); font-weight: 800; color: var(--ink-450); text-align: center; }
  .cmp2-cell { display: flex; align-items: center; gap: 8px; }
  .cmp2-mini { flex: 1; height: 12px; }
  .cmp2-cell span { font-size: var(--fs-xs); font-weight: 800; color: var(--ink-450); width: 34px; text-align: right; }

  /* add student modal (ui-scrim + ui-modal-card; sits above the Ask panel) */
  .add-backdrop { z-index: 70; }
  .add-card { max-width: 520px; }
  .add-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .add-eyebrow { text-align: center; font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); color: var(--green-700); }
  .add-center { text-align: center; margin-top: 18px; }
  .add-title { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-xl); line-height: 1.3; margin-bottom: 20px; }
  .add-pot { display: flex; justify-content: center; margin: 8px 0; }
  .add-count { width: 220px; text-align: center; border: 2px solid var(--line-200); border-radius: var(--radius-md); padding: 13px 16px; font-size: var(--fs-md); font-weight: 700; font-family: var(--font-body); color: var(--ink-900); outline: none; background: var(--surface-100); }
  .add-count:focus { border-color: var(--focus); }
  .add-progress { text-align: center; font-size: var(--fs-sm); color: var(--ink-300); font-weight: 700; margin-top: 4px; }
  .add-pbar { max-width: 260px; margin: 8px auto 0; }
  .add-fields { display: flex; flex-direction: column; gap: 10px; }
  .add-names { display: flex; gap: 10px; flex-wrap: wrap; }
  .add-names .input { flex: 1; min-width: 130px; }
  .add-done-title { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-xl); color: var(--green-700); }
  .add-done-sub { margin: 8px 0 20px; font-size: var(--fs-md); color: var(--ink-450); line-height: 1.5; }
  .add-note { margin: 0 auto 12px; max-width: 340px; }
  .add-uids { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-md); padding: 12px 16px; margin: 0 auto 16px; max-width: 340px; text-align: left; }
  .add-uids-h { font-weight: 800; font-size: var(--fs-sm); color: var(--ink-450); margin-bottom: 6px; }
  .add-uid-row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--line-200); }
  .add-uid-row > span:first-child { font-weight: 700; color: var(--ink-700); }
  .pot { position: relative; width: 150px; height: 134px; }
  .pot-seed { position: absolute; left: 50%; top: 2px; margin-left: -8px; width: 16px; height: 21px; border-radius: 50%; background: ${ART.pollen}; box-shadow: inset -2px -2px 0 ${ART.potSeedShade}; }
  .pot-bed { position: absolute; left: 0; right: 0; bottom: 60px; display: flex; justify-content: center; gap: 4px; height: 48px; align-items: end; }
  .pot-sprout { width: 6px; border-radius: var(--radius-xs) var(--radius-xs) 0 0; align-self: end; }
  .pot-rim { position: absolute; left: 50%; bottom: 46px; margin-left: -52px; width: 104px; height: 20px; border-radius: var(--radius-xs); background: ${ART.clayRim}; }
  .pot-body { position: absolute; left: 50%; bottom: 4px; margin-left: -49px; width: 98px; height: 50px; background: ${ART.clayBody}; clip-path: polygon(4% 0, 96% 0, 84% 100%, 16% 100%); }

  /* bottom nav (mobile) — four quiet tabs + raised Ask Tilli in the centre */
  @media (max-width: 639px) { :root { --tf-bottom: 82px; } }   /* lift floating Need-help bubble above it */
  .dash-bottomnav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; align-items: flex-end; background: var(--white); border-top: 1px solid var(--line-200); padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); }
  .dash-bnav { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; background: none; border: none; cursor: pointer; color: var(--ink-300); font-family: var(--font-body); font-weight: 700; font-size: var(--fs-xs); padding: 4px 2px; min-height: 44px; }
  .dash-bnav .lb { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Quiet active state: colour + weight only, deliberately softer than the centre button. */
  .dash-bnav.on { color: var(--green-700); }
  .dash-bnav.on .lb { font-weight: 800; }
  /* Raised centre action (Ask Tilli): overlaps the top edge, carries the sole accent. */
  .dash-bnav.center { color: var(--green-700); }
  .dash-bnav.center .dash-fab { display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; margin-top: -26px; border-radius: 50%; background: var(--green-500); color: var(--white); box-shadow: 0 6px 18px color-mix(in srgb, var(--green-700) 36%, transparent); border: 3px solid var(--white); }
  .dash-bnav.center .lb { color: var(--green-700); font-weight: 800; }
  .dash-bnav.center:active .dash-fab { transform: scale(.94); }
  @media (prefers-reduced-motion: reduce) { .dash-bnav.center:active .dash-fab { transform: none; } }

  /* ================= My Garden — landing (state-driven doorway) ================= */
  .mg-wrap { max-width: 860px; display: flex; flex-direction: column; gap: 18px; }
  /* Slot 1 — greeting */
  .mg-greet { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .mg-hello { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-2xl); color: var(--green-700); margin: 0; }
  .mg-season { margin: 5px 0 0; font-size: var(--fs-md); color: var(--ink-450); }
  .mg-season b { color: var(--ink-900); }

  /* Slot 2 — garden scene (composed from existing plant art; presentational) */
  .mg-scene { position: relative; overflow: hidden; border-radius: var(--radius-card); border: 1px solid var(--line-200);
    background: ${ART.sky};
    height: clamp(200px, 20vh, 300px); box-shadow: inset 0 -30px 50px -30px ${ART.skyGlow}; }
  .mg-sun { top: -46px; right: -46px; width: 150px; height: 150px; }   /* .sun (tilli.css) */
  .mg-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 26%;
    background: ${ART.ground}; border-radius: 0 0 var(--radius-card) var(--radius-card); }
  .mg-plants { position: absolute; left: 0; right: 0; bottom: 8%; display: flex; align-items: flex-end; justify-content: center; gap: clamp(2px, 1.6vw, 14px); padding: 0 14px; }
  .mg-plant { display: inline-block; line-height: 0; }
  .mg-scene-seedling { background: ${ART.skySeedling}; }
  .mg-scene-bloom { background: ${ART.skyBloom}; box-shadow: inset 0 -30px 50px -30px ${ART.skyBloomGlow}; }

  /* Slot 3 — caption · Slot 4 — celebration */
  .mg-caption { margin: 0; font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); color: var(--ink-700); text-align: center; }
  .mg-celebrate { align-self: center; background: var(--wash-pink); color: var(--pink-600); font-weight: 800; font-size: var(--fs-md); padding: 10px 18px; border-radius: var(--radius-pill); }

  /* Slot 5 — band mix (colour + glyph + word: distinguishable without colour) */
  .mg-bandmix { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px 22px; padding: 14px 18px; background: var(--surface-100); border: 1px solid var(--line-200); border-radius: var(--radius-lg); }
  .mg-band { display: inline-flex; align-items: baseline; gap: 7px; }
  .mg-band-ic { font-size: var(--fs-md); line-height: 1; }
  .mg-band-n { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); color: var(--ink-900); }
  .mg-band-lb { font-size: var(--fs-sm); font-weight: 700; color: var(--ink-450); }
  .mg-band-note { flex-basis: 100%; text-align: center; font-size: var(--fs-sm); color: var(--ink-300); font-weight: 700; }
  .mg-bandmix-empty { justify-content: center; font-weight: 700; color: var(--ink-450); font-size: var(--fs-md); }

  /* Slot 6 — hero (context-aware) */
  .mg-hero { border-radius: var(--radius-card); padding: 22px 24px; }
  .mg-hero-window { background: var(--wash-green); border: 1.5px solid color-mix(in srgb, var(--green-500) 25%, var(--white)); }
  .mg-hero-ask { background: var(--white); border: 1.5px solid var(--line-200); box-shadow: var(--shadow-pop); }
  .mg-hero .ui-eyebrow { margin-bottom: 12px; }
  .mg-hero-window .ui-eyebrow.pill { background: color-mix(in srgb, var(--white) 70%, transparent); }
  .mg-hero-t { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-xl); color: var(--ink-900); margin: 0; }
  .mg-hero-b { margin: 8px 0 0; font-size: var(--fs-md); color: var(--ink-600); line-height: 1.5; }
  .mg-hero-askhead { display: flex; align-items: center; gap: 10px; }
  .mg-hero-askic { width: 34px; height: 34px; border-radius: 50%; background: var(--wash-green); display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .mg-prog { background: color-mix(in srgb, var(--green-700) 14%, transparent); margin: 16px 0 8px; }
  .mg-prog-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: var(--fs-sm); color: var(--ink-600); font-weight: 700; }
  .mg-prog-row b { color: var(--green-700); }
  .mg-deadline { color: var(--ink-300); }
  .mg-hero-cta { margin-top: 16px; }
  .mg-starters { display: flex; flex-direction: column; gap: 9px; margin-top: 16px; }
  .mg-starter { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; text-align: left;
    border: 1.5px solid var(--line-200); background: var(--surface-100); border-radius: var(--radius-md); padding: 14px 16px; cursor: pointer;
    font-family: var(--font-body); font-weight: 700; font-size: var(--fs-md); color: var(--ink-700); transition: border-color .15s, background .15s; }
  .mg-starter:hover { border-color: var(--green-500); background: var(--wash-green); }
  .mg-starter-ar { color: var(--green-600); font-weight: 800; }

  /* Slot 7 — this week's idea */
  .mg-idea { background: var(--wash-cyan); border: 1.5px solid color-mix(in srgb, var(--cyan-500) 25%, var(--white)); border-radius: var(--radius-card); padding: 20px 22px; }
  .mg-idea .ui-eyebrow.pill { background: var(--white); color: var(--cyan-700); }
  .mg-idea-t { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); color: var(--ink-900); margin: 12px 0 0; }
  .mg-idea-d { margin: 7px 0 0; font-size: var(--fs-md); color: var(--ink-600); line-height: 1.55; }
  .mg-idea-ask { display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; background: var(--white); border: 1.5px solid color-mix(in srgb, var(--cyan-500) 25%, var(--white)); color: var(--cyan-700);
    font-family: var(--font-body); font-weight: 700; font-size: var(--fs-sm); padding: 10px 16px; border-radius: var(--radius-pill); cursor: pointer; transition: border-color .15s; }
  .mg-idea-ask:hover { border-color: var(--cyan-500); }

  /* Slot 8 — who could use you (tend cards) */
  .mg-tend-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
  .mg-tend-h { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); color: var(--ink-900); margin: 0; }
  .mg-tend-note { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 700; }
  .mg-tend-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .mg-tend-card { border: 1px solid var(--line-200); border-radius: var(--radius-lg); background: var(--white); padding: 15px; display: flex; flex-direction: column; gap: 9px; }
  .mg-tend-top { display: flex; align-items: center; gap: 10px; }
  .mg-tend-pl { line-height: 0; flex: none; }
  .mg-tend-nm { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-md); color: var(--ink-900); }
  .mg-tend-reason { margin: 0; font-size: var(--fs-sm); color: var(--ink-600); line-height: 1.45; flex: 1; }
  .mg-tend-empty { background: var(--surface-100); border: 1px dashed var(--line-200); border-radius: var(--radius-lg); padding: 20px; font-size: var(--fs-sm); color: var(--ink-450); font-weight: 600; line-height: 1.5; }

  /* Empty states (ui-empty): first-run / pre-baseline hero, and in-card ones */
  .empty-hero { padding: clamp(32px, 8vh, 72px) 20px; }
  .empty-hero .ui-empty-t { font-size: var(--fs-xl); margin-bottom: 10px; }
  .empty-plant { margin-bottom: 10px; }
  .empty-card { padding: 44px 28px; }
  .empty-badge { margin: 0 auto 14px; width: 64px; height: 64px; border-radius: 50%; background: var(--wash-green); display: flex; align-items: center; justify-content: center; }

  /* Dev-only landing-state switch (scaffold; not teacher-facing) */
  /* Top-right so it clears the floating Ask Tilli / Need help bubbles (bottom-right). */
  .mg-gui { position: fixed; right: 16px; top: 12px; z-index: 45; background: rgba(20,28,20,.9); color: #fff;
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
    .mg-gui { right: 10px; top: calc(8px + env(safe-area-inset-top)); left: 10px; }
    .mg-gui-opts { flex-wrap: wrap; }
    .mg-gui-opt { flex: 1; }
  }

  /* ---- teacher feedback build: UID, students actions, PDFs, completed rate, mirror ---- */
  .uid-chip { vertical-align: middle; font-family: var(--font-heading); font-size: var(--fs-sm); }   /* .ui-tag.green */
  .uid-chip.sm { font-size: var(--fs-xs); margin-left: 6px; }
  .stu-uid { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
  .stu-editbtn { align-self: flex-start; }
  .stu-edit-grid { display: grid; grid-template-columns: 1fr 1fr 0.9fr; gap: 10px; }
  .stu-edit-actions { display: flex; gap: 8px; margin-top: 12px; }
  @media (max-width: 640px) { .stu-edit-grid { grid-template-columns: 1fr; } }

  .roster-titlebar, .pf-titlebar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .roster-actions { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 4px; }
  .sel-bar { position: sticky; top: 8px; z-index: 5; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 14px;
    background: var(--white); border: 1.5px solid var(--green-500); border-radius: var(--radius-lg); padding: 10px 12px; box-shadow: var(--shadow-hover); }
  .sel-all { display: inline-flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; font-family: var(--font-body); font-weight: 700; font-size: var(--fs-sm); color: var(--ink-700); }
  .sel-n { font-size: var(--fs-sm); font-weight: 700; color: var(--ink-300); }
  .sel-err { font-size: var(--fs-sm); font-weight: 700; color: var(--danger-700); }
  .sel-sp { flex: 1; }
  .rr-check { flex: none; width: 22px; height: 22px; border-radius: var(--radius-xs); border: 2px solid var(--line-200); background: var(--white); color: var(--white);
    display: inline-flex; align-items: center; justify-content: center; font-size: var(--fs-sm); font-weight: 800; }
  .rr-check.on { background: var(--green-500); border-color: var(--green-500); }
  .roster-row.picked { border-color: var(--green-500); background: var(--wash-green); }

  .add-secpick { margin-top: 12px; }
  .add-secchips { display: flex; gap: 6px; flex-wrap: wrap; }
  .add-newsec { display: flex; gap: 8px; margin-top: 10px; }
  .add-newsec .input { flex: 1; min-width: 0; }
  .add-newsec .input:last-child { flex: 0 0 110px; }

  .obs-alldone { text-align: center; background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-card); padding: 30px 24px; }
  .obs-alldone .t { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); color: var(--ink-900); margin-top: 10px; }
  .obs-alldone p { color: var(--ink-450); font-size: var(--fs-md); margin: 8px 0 18px; }

  .log-tabs-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin: 18px 0; }
  .log-tabs-row > .log-tabs { margin: 0; }
  .cr-wrap { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-xl); padding: 8px; overflow-x: auto; }
  /* Lighter type throughout: one bold-ish title, quiet headers, regular-weight figures. */
  .cr-title { text-align: left; font-weight: 700; font-size: var(--fs-md); color: var(--ink-900); padding: 14px 12px 2px; }
  .cr-title span { font-weight: 500; color: var(--ink-300); font-size: var(--fs-sm); }
  .cr { min-width: 420px; }
  .cr-head, .cr-row { display: grid; grid-template-columns: minmax(120px,1.6fr) repeat(3, minmax(84px,1fr)); }
  .cr-head { padding: 10px 12px; align-items: end; }
  .cr-h { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .cr-h .ic { font-size: var(--fs-lg); line-height: 1; }
  .cr-h .lb, .cr .mtx-corner { font-weight: 600; letter-spacing: .06em; color: var(--ink-300); }
  .cr-row { width: 100%; background: none; border: none; border-top: 1px solid var(--line-200); padding: 10px 12px; cursor: pointer; text-align: left; font-family: var(--font-body); align-items: center; }
  .cr-row:hover { background: var(--surface-100); }
  .cr-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 44px; justify-content: center; }
  .cr-cell b { font-size: var(--fs-sm); font-weight: 600; color: var(--ink-700); font-variant-numeric: tabular-nums; }
  .cr-cell.zero b { font-weight: 500; color: var(--ink-300); }
  .cr-cell.done b { color: var(--green-700); }
  .cr-row .mtx-name span:last-child { font-weight: 600; color: var(--ink-700); }

  /* Insights → Growth over time (line chart) */
  .gr-filters { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
  .gr-select:has(option:checked:not([value=""])) { background: var(--ink-900); color: var(--white); border-color: var(--ink-900); }   /* .ui-filterchip.dark on a <select> */
  .gr-view { margin-left: auto; border: none; background: none; cursor: pointer; font-family: var(--font-body); font-weight: 700; font-size: var(--fs-sm); color: var(--ink-450); padding: 6px 8px; border-radius: var(--radius-sm); }
  .gr-view:hover { background: var(--surface-100); color: var(--ink-900); }
  .gr-legend { margin: 0 0 8px; }
  .gr-legend i { width: 16px; height: 0; border-radius: 0; }
  .gr-wrap { position: relative; outline: none; border-radius: var(--radius-md); }
  .gr-wrap:focus-visible { box-shadow: 0 0 0 2px var(--focus); }
  .gr-svg { display: block; overflow: visible; }
  .gr-tip { position: absolute; z-index: 3; min-width: 170px; max-width: 260px; padding: 9px 12px; pointer-events: none; }
  .gr-tip-h { margin-bottom: 5px; }
  .gr-tip-r { display: flex; align-items: center; gap: 8px; font-size: var(--fs-sm); padding: 2px 0; }
  .gr-tip-r i { flex: none; width: 14px; height: 0; }
  .gr-tip-r b { font-weight: 800; color: var(--ink-900); min-width: 46px; }
  .gr-tip-r span { color: var(--ink-450); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gr-table td { font-weight: 600; color: var(--ink-900); }   /* .ui-table.compact */
  .gr-table td i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 8px; vertical-align: -1px; }

  /* Insights → Class Skill Overview (level tokens: 1 Beginner · 2 Learner · 3 Expert) */
  .ov-headrow { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  .ov-h { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-xl); color: var(--ink-900); }
  .ov-lead { font-size: var(--fs-sm); font-weight: 700; color: var(--ink-450); margin-top: 4px; }
  .ov-desc { font-size: var(--fs-sm); color: var(--ink-450); margin: 4px 0 0; max-width: 620px; line-height: 1.5; }
  .ov-scope { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--line-200); border-radius: var(--radius-pill); padding: 8px 14px; font-size: var(--fs-sm); font-weight: 700; color: var(--ink-900); background: var(--white); white-space: nowrap; }
  .ov-scope i { width: 9px; height: 9px; border-radius: 50%; background: var(--cyan-500); }
  .ov-boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
  .ov-box { text-align: left; border-radius: var(--radius-md); padding: 16px 18px; cursor: pointer; font-family: var(--font-body); border: 2px solid; display: flex; flex-direction: column; gap: 2px; transition: box-shadow .15s, opacity .15s; }
  .ov-box:hover { box-shadow: var(--shadow-hover); }
  .ov-box.on { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink-900) 12%, transparent); }
  .ov-box.dim { opacity: .5; }
  .ov-l1 { background: var(--lvl-1-wash); border-color: var(--lvl-1); } .ov-l1 .ov-count { color: var(--lvl-1-ink); }
  .ov-l2 { background: var(--lvl-2-wash); border-color: var(--lvl-2); } .ov-l2 .ov-count { color: var(--lvl-2-ink); }
  .ov-l3 { background: var(--lvl-3-wash); border-color: var(--lvl-3); } .ov-l3 .ov-count { color: var(--lvl-3-ink); }
  .ov-count { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-2xl); line-height: 1.1; }
  .ov-title { font-weight: 800; font-size: var(--fs-md); color: var(--ink-900); }
  .ov-sub { font-size: var(--fs-sm); color: var(--ink-450); font-weight: 600; }
  .ov-note { font-size: var(--fs-sm); color: var(--ink-450); font-weight: 600; margin-top: 10px; }
  .ov-hint { font-size: var(--fs-sm); color: var(--ink-450); margin-top: 16px; } .ov-hint b { color: var(--ink-900); }
  .ov-legend { gap: 8px 18px; margin: 12px 0 14px; }
  .ov-legend i, .ov-bh i { width: 12px; height: 12px; border-radius: 3px; }
  .ov-list { border: 1px solid var(--line-200); border-radius: var(--radius-lg); padding: 4px 10px; }
  .ov-row + .ov-row { border-top: 1px solid var(--line-200); }
  .ov-rowbtn { width: 100%; display: grid; grid-template-columns: minmax(150px, 220px) 1fr 130px 16px; gap: 16px; align-items: center; background: none; border: none; cursor: pointer; padding: 13px 8px; font-family: var(--font-body); text-align: left; border-radius: var(--radius-sm); }
  .ov-rowbtn:hover { background: var(--surface-100); }
  .ov-name { font-weight: 700; font-size: var(--fs-md); color: var(--ink-900); }
  .ov-bar { display: flex; height: 24px; border-radius: var(--radius-xs); overflow: hidden; background: var(--surface-100); }
  .ov-seg { height: 100%; }
  .ov-status { justify-self: end; display: inline-flex; align-items: center; gap: 7px; font-size: var(--fs-sm); font-weight: 700; }
  .ov-status i { width: 9px; height: 9px; border-radius: 50%; }
  .ov-st-l1 { color: var(--lvl-1-ink); } .ov-st-l1 i { background: var(--lvl-1); }
  .ov-st-l2 { color: var(--lvl-2-ink); } .ov-st-l2 i { background: var(--lvl-2); }
  .ov-st-l3 { color: var(--lvl-3-ink); } .ov-st-l3 i { background: var(--lvl-3); }
  .ov-chev { color: var(--ink-300); font-size: var(--fs-lg); line-height: 1; transition: transform .15s; }
  .ov-row.open .ov-chev { transform: rotate(90deg); }
  .ov-break { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 4px 8px 16px; }
  .ov-bcol { background: var(--surface-100); border-radius: var(--radius-md); padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
  .ov-bh { display: flex; align-items: center; gap: 7px; font-size: var(--fs-sm); font-weight: 800; color: var(--ink-700); margin-bottom: 2px; }
  .ov-bh span { color: var(--ink-300); }
  .ov-stu { background: var(--white); border: 1px solid var(--line-200); border-radius: var(--radius-pill); padding: 4px 11px; font-family: var(--font-body); font-size: var(--fs-sm); font-weight: 600; color: var(--ink-700); cursor: pointer; }
  .ov-stu:hover { border-color: var(--green-500); color: var(--green-700); }
  .ov-bnone { color: var(--ink-300); font-size: var(--fs-sm); }
  .ov-bfoot { grid-column: 1 / -1; }
  @media (max-width: 760px) {
    .ov-boxes, .ov-break { grid-template-columns: 1fr; }
    .ov-rowbtn { grid-template-columns: 1fr auto 16px; gap: 8px 10px; }
    .ov-bar { grid-column: 1 / -1; grid-row: 2; }
  }

  .pf-edit { cursor: default; }
  .pf-in { flex: 0 1 260px; min-width: 0; text-align: right; }   /* .input.td-in */
  .mir { margin-top: 16px; padding: 18px 22px; }
  .mir-t { font-family: var(--font-heading); font-weight: 700; font-size: var(--fs-lg); color: var(--ink-900); }
  .mir-s { font-size: var(--fs-sm); color: var(--ink-300); font-weight: 600; margin-top: 2px; }
  .mir-empty { color: var(--ink-450); font-size: var(--fs-md); margin: 12px 0 2px; }
  .mir-bars { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
  .mir-row { display: grid; grid-template-columns: 140px 1fr auto; gap: 12px; align-items: center; }
  .mir-lb { font-size: var(--fs-sm); font-weight: 700; color: var(--ink-700); }
  .mir-track { height: 12px; }
  .mir-v { font-size: var(--fs-sm); font-weight: 800; color: var(--ink-700); text-align: right; white-space: nowrap; }
  .mir-d { margin-left: 8px; font-size: var(--fs-xs); font-weight: 800; color: var(--ink-300); }
  .mir-d.up { color: var(--green-700); } .mir-d.down { color: var(--danger-700); }
  .mir-tl { display: flex; align-items: stretch; gap: 8px; margin-top: 16px; }
  .mir-nav { flex: none; width: 34px; border: 1px solid var(--line-200); background: var(--white); border-radius: var(--radius-sm); cursor: pointer; font-size: var(--fs-lg); color: var(--ink-450); }
  .mir-nav:disabled { opacity: .35; cursor: default; }
  .mir-stops { flex: 1; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
  .mir-stops::-webkit-scrollbar { display: none; }
  .mir-stop { flex: 0 0 auto; min-width: 150px; display: grid; grid-template-columns: 12px 1fr; column-gap: 8px; align-items: center; text-align: left;
    background: var(--surface-100); border: 1.5px solid transparent; border-radius: var(--radius-md); padding: 9px 12px; cursor: pointer; font-family: var(--font-body); }
  .mir-stop.on { background: var(--wash-green); border-color: var(--green-500); }
  .mir-dot { grid-row: 1 / 3; width: 10px; height: 10px; border-radius: 50%; background: var(--line-200); }
  .mir-stop.on .mir-dot { background: var(--green-500); }
  .mir-sn { font-size: var(--fs-sm); font-weight: 800; color: var(--ink-900); }
  .mir-sd { font-size: var(--fs-xs); font-weight: 600; color: var(--ink-300); }
  .mir-sample { font-style: normal; margin-left: 4px; vertical-align: 1px; }   /* .ui-tag.lvl */
  .mir-samplenote { align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 12px; }   /* .ui-note.sample */
  .mir-scale { font-size: var(--fs-xs); color: var(--ink-300); font-weight: 600; margin-top: 8px; text-align: right; }
  .mir-fact { display: flex; justify-content: space-between; gap: 14px; font-size: var(--fs-sm); color: var(--ink-450); border-top: 1px solid var(--line-200); padding-top: 10px; margin-top: 12px; }
  .mir-fact b { color: var(--ink-900); white-space: nowrap; }
  .mir-words { display: grid; gap: 10px; margin-top: 12px; }
  .mir-q { margin: 0; background: var(--surface-100); border-radius: var(--radius-md); padding: 12px 14px; font-size: var(--fs-md); color: var(--ink-700); line-height: 1.5; font-style: italic; }
  .mir-qq { font-style: normal; font-size: var(--fs-xs); font-weight: 700; color: var(--ink-300); margin-bottom: 4px; }
  @media (max-width: 640px) { .mir-row { grid-template-columns: 1fr auto; } .mir-lb { grid-column: 1 / -1; } }

  /* parent report PDF (A4 portrait). html2pdf clones .pr into an overlay inside THIS
     document, so tilli.css tokens resolve here. The report keeps its own lavender
     palette, declared once below as --report-*; level colours use the --lvl-* tokens.
     Keep color-mix() out of .pr — html2canvas can't parse it. */
  .pr {
    /* Pin the large type steps so a PDF made on a phone isn't shrunk by the mobile breakpoint. */
    --fs-lg: 18px; --fs-xl: 24px; --fs-2xl: 32px;
    --report-ink: #2C2A3A; --report-body: #3A3850; --report-navy: #3B3170; --report-indigo: #4A3FB0;
    --report-violet: #5B4BC4; --report-purple: #6B5CD6; --report-muted: #8C8AA0; --report-faint: #6B6880;
    --report-lav: #EEEAFD; --report-lav-strong: #C8BFF1; --report-alt: #F4F1FE;
    --report-line: #ECEAF3; --report-line-soft: #F1F0F6; --report-line-foot: #D9D5EE;
    --report-peach: #FBEFE6;  --report-peach-num: #F6D5BE;  --report-peach-ink: #7A4A2A;
    --report-mint: #E6F4EC;   --report-mint-num: #C3E5D1;   --report-mint-ink: #2B6B47;
    --report-yellow: #FDF9E8; --report-yellow-num: #FBEAB0; --report-yellow-ink: #7A5D00; --report-yellow-line: #F2CF6B;
    --report-pink: #F9E8EF;   --report-pink-num: #F2BFD3;   --report-pink-ink: #8A2A52;
    --report-serif: Georgia, 'Times New Roman', serif;
    width: 214mm; font-family: var(--font-body); color: var(--report-ink); background: var(--white); font-size: var(--fs-xs); line-height: 1.6;
  }
  .pr-head { display: flex; justify-content: space-between; align-items: center; padding: 4px 14mm 14px; }
  .pr-logo { font-family: var(--report-serif); font-weight: 700; font-size: var(--fs-xl); color: var(--report-navy); letter-spacing: -.5px; }
  .pr-logo span { font-family: var(--font-body); font-size: var(--fs-xs); font-weight: 500; letter-spacing: .08em; color: var(--report-navy); margin-left: 10px; vertical-align: 4px; }
  .pr-headr { text-align: right; font-size: var(--fs-xs); color: var(--report-navy); line-height: 1.6; }
  .pr-hero { background: var(--report-lav); padding: 18px 14mm 20px; margin-bottom: 18px; }
  .pr-hero h1 { font-family: var(--report-serif); font-weight: 700; font-size: var(--fs-xl); color: var(--report-navy); margin: 0 0 6px; }
  .pr-hero h1 span { color: var(--report-violet); }
  .pr-meta { font-size: var(--fs-xs); color: var(--report-muted); margin-bottom: 10px; }
  .pr-hero p { margin: 0; font-size: var(--fs-sm); color: var(--report-body); line-height: 1.7; }
  .pr > :not(.pr-head):not(.pr-hero) { margin-left: 14mm; margin-right: 14mm; }
  .pr-sec { display: flex; align-items: stretch; border-radius: var(--radius-sm); overflow: hidden; margin: 18px 14mm 12px; page-break-inside: avoid; page-break-after: avoid; }
  .pr-num { flex: none; width: 34px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: var(--fs-sm); }
  .pr-sect { flex: 1; padding: 10px 14px; font-weight: 700; font-size: var(--fs-md); color: var(--report-indigo); }
  .pr-sec-peach { background: var(--report-peach); } .pr-sec-peach .pr-num { background: var(--report-peach-num); color: var(--report-peach-ink); }
  .pr-sec-mint { background: var(--report-mint); } .pr-sec-mint .pr-num { background: var(--report-mint-num); color: var(--report-mint-ink); }
  .pr-sec-lav { background: var(--report-lav); } .pr-sec-lav .pr-num { background: var(--report-lav-strong); color: var(--white); }
  .pr-sec-yellow { background: var(--report-yellow); } .pr-sec-yellow .pr-num { background: var(--report-yellow-num); color: var(--report-yellow-ink); }
  .pr-sec-pink { background: var(--report-pink); } .pr-sec-pink .pr-num { background: var(--report-pink-num); color: var(--report-pink-ink); }
  .pr-p { margin: 0 0 12px; font-size: var(--fs-xs); }
  .pr-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; page-break-inside: avoid; }
  .pr-card { border-radius: var(--radius-sm); padding: 12px 12px 14px; font-size: var(--fs-xs); color: var(--report-body); line-height: 1.55; }
  .pr-ct { font-weight: 700; font-size: var(--fs-sm); color: var(--report-violet); margin-bottom: 6px; }
  .pr-lvcard { border-top: 3px solid; }
  .pr-lvb { background: var(--lvl-1-wash); border-color: var(--lvl-1); } .pr-lvb .pr-ct { color: var(--lvl-1-ink); }
  .pr-lvl { background: var(--lvl-2-wash); border-color: var(--lvl-2-soft); } .pr-lvl .pr-ct { color: var(--lvl-2-ink); }
  .pr-lve { background: var(--lvl-3-wash); border-color: var(--lvl-3-soft); } .pr-lve .pr-ct { color: var(--lvl-3-ink); }
  .pr-hr { border: none; border-top: 1px solid var(--report-line); margin: 18px 0 0 !important; }
  .pr-gh { font-weight: 700; font-size: var(--fs-sm); color: var(--report-indigo); margin: 14px 0 6px; page-break-after: avoid; }
  .pr-tbl { width: 100%; border-collapse: collapse; font-size: var(--fs-xs); margin-bottom: 6px; }
  .pr-tbl th { text-align: left; font-size: var(--fs-xs); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--report-navy); padding: 7px 10px; border-bottom: 1px solid var(--report-line); }
  .pr-tbl td { padding: 8px 10px; border-bottom: 1px solid var(--report-line-soft); vertical-align: top; }
  .pr-tbl tr { page-break-inside: avoid; }
  .pr-tbl tr.alt td { background: var(--report-alt); }
  .pr-sk { width: 34%; color: var(--report-purple); font-weight: 600; }
  .pr-lvtbl th:last-child, .pr-lvtbl td:last-child { text-align: center; width: 30%; }
  .pr-lv { font-weight: 700; font-size: var(--fs-xs); }
  .pr-lv-beginner { color: var(--lvl-1-ink); } .pr-lv-learner { color: var(--lvl-2-ink); } .pr-lv-expert { color: var(--lvl-3-ink); }
  .pr-summary, .pr-note { background: var(--report-yellow); border-left: 3px solid var(--report-yellow-line); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 12px 16px; font-size: var(--fs-sm); line-height: 1.75; page-break-inside: avoid; }
  .pr-tip { border-left: 3px solid var(--report-lav-strong); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 11px 16px 12px; margin-bottom: 9px; page-break-inside: avoid; }
  .pr-tipt { font-weight: 700; font-size: var(--fs-sm); color: var(--report-purple); margin-bottom: 4px; }
  .pr-tipb { font-size: var(--fs-xs); color: var(--report-body); line-height: 1.65; }
  .pr-foot { margin-top: 22px !important; border-top: 1px solid var(--report-line-foot); padding-top: 12px; text-align: center; font-size: var(--fs-xs); color: var(--report-body); line-height: 1.8; page-break-inside: avoid; }
  .pr-foot b { color: var(--report-navy); }
  .pr-conf { font-size: var(--fs-xs); color: var(--report-faint); }

  @media (max-width: 1023px) { .dash-main { padding: 22px 26px; } }
  @media (max-width: 640px) {
    .dash-main { padding: 16px 16px 90px; }
    .dash-header { padding: 12px 16px 6px; }
    .two-col { grid-template-columns: 1fr; }
    /* Phones: the bubble lives in the bottom nav, so the chat is a bottom sheet over a scrim. */
    .ask-panel { top: 12%; left: 0; right: 0; bottom: 0; width: auto; max-width: none; height: auto; border-radius: var(--radius-card) var(--radius-card) 0 0; transform-origin: bottom center; }
    .ask-scrim { display: block; background: color-mix(in srgb, var(--ink-900) 28%, transparent); }
    /* Insights: reflow every multi-column grid to a single readable column. */
    .sb-grid, .pv-grid { grid-template-columns: 1fr; }
    .cmp2-row { grid-template-columns: 96px 1fr; gap: 10px; }
    .pv-card { flex-direction: column; align-items: flex-start; gap: 8px; }
  }`;

  window.TilliDashboard = { mount };
})();
