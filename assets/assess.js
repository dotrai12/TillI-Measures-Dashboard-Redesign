/* ============================================================
   Tilli Measures — STUDENT DIRECT-ASSESSMENT page (assess.html)
   ------------------------------------------------------------
   Opened from the school's student master link on each child's
   device. A teacher signs in with the school code + their email
   (no password), picks a class, then runs the direct assessments
   that happen AT SCHOOL for each child. It never links to a
   dashboard, so a child can't wander into one.

   Own-class rule (TilliAPI.checkinAtSchool): while My School
   Check-in runs at school in the open phase, the teacher's own
   class is greyed out — another teacher assesses it.

   Steps: code → email → pick → class → run → done
   (a teacher already signed in on this device skips code + email).
   ============================================================ */
(function () {
  'use strict';

  var A = window.TilliAPI;
  var SESSION_KEY = 'tilliMeasures.session';            // the dashboards' sign-in (read only)
  var ASSESS_KEY = 'tilliMeasures.assessSession';       // this page's own sign-in
  var AUD = 'Direct Assessment';
  var app = document.getElementById('app');

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeJSON(key, v) { try { if (v) localStorage.setItem(key, JSON.stringify(v)); else localStorage.removeItem(key); } catch (e) { /* private window: stays signed in for this page view only */ } }

  var S = { step: 'code', school: null, email: '', viaDashboard: false, phase: null, sectionId: null, studentId: null, itemId: null, err: '', code: '' };

  // ---------- boot: who's already signed in on this device? ----------
  function boot() {
    if (!A) { app.innerHTML = '<div class="as-wrap"><div class="as-card narrow"><p>Assessments are unavailable right now.</p></div></div>'; return; }
    var own = readJSON(ASSESS_KEY);
    if (own && own.email && own.school_id && A.isTeacherAt(own.email, own.school_id)) return signedIn(own.school_id, own.email, false);
    // A teacher dashboard already open on this device → skip the code + email.
    var dash = readJSON(SESSION_KEY);
    if (dash && dash.email) {
      var ids = A.teacherSchools(dash.email);
      if (ids.length) return signedIn(ids[0], dash.email, true);
    }
    S.step = 'code'; render();
  }
  function signedIn(schoolId, email, viaDashboard) {
    S.school = A.resolveSchool(schoolId); S.email = String(email).toLowerCase(); S.viaDashboard = viaDashboard;
    if (!viaDashboard) writeJSON(ASSESS_KEY, { email: S.email, school_id: schoolId });
    S.phase = A.liveDirectPhase(schoolId);
    S.step = S.phase ? 'pick' : 'noopen'; S.err = '';
    render();
  }

  // ---------- data helpers ----------
  function items() { return A.directAtSchool(S.school.school_id, S.phase); }
  function ruleOn() { return A.checkinAtSchool(S.school.school_id, S.phase); }
  function kidsOf(sectionId) {
    return A.studentsForSchool(S.school.school_id).filter(function (st) { return st.section_id === sectionId; })
      .sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }
  // Only the steps that run at school — home ones belong to the parent.
  function stepsFor(st) { return A.chainFor(S.school.school_id, S.phase, AUD, st.student_id).filter(function (x) { return x.mode === 'school'; }); }
  function classDone(sectionId) {
    var ids = kidsOf(sectionId).map(function (k) { return k.student_id; }), its = items().map(function (i) { return i.id; });
    return A.itemCompletion(S.school.school_id, S.phase, AUD, ids, its);
  }
  function sectionName(id) { var s = A.sectionsForSchool(S.school.school_id).find(function (x) { return x.section_id === id; }); return s ? s.name : ''; }

  // ---------- views ----------
  function topBar() {
    var who = S.school ? esc(S.school.name) + (S.email ? '<br>' + esc(S.email) : '') : '';
    var fin = S.step !== 'code' && S.step !== 'email' && S.step !== 'done' ? ' <button class="btn btn-outline btn-sm" data-finish title="End this session on this device">Finish</button>' : '';
    return '<header class="as-top"><span class="lockup">Tilli Measures · Student assessments</span><span class="as-who">' + who + '</span>' + fin + '</header>';
  }
  function codeView() {
    return '<div class="as-card narrow"><h1 class="as-h1">Enter your school code</h1>' +
      '<p class="as-sub">This makes sure the assessment is run by your school. A teacher signs in next.</p>' +
      '<form data-form="code"><label class="as-field">School code<input class="input as-code" id="as-code" value="' + esc(S.code) + '" placeholder="e.g. ABCD-1234" autocomplete="off" autocapitalize="characters" spellcheck="false" autofocus></label>' +
      (S.err ? '<p class="as-err">' + esc(S.err) + '</p>' : '') +
      '<button class="btn btn-primary block" type="submit">Continue</button></form>' +
      '<p class="as-hint">Demo codes: BNYN-7712 (Banyan Tree) · LOTS-3390 (Lotus Valley) · KNDY-8890 (Kandy Hill) · CLMB-6604 (Colombo Kids).</p></div>';
  }
  function emailView() {
    return '<div class="as-card narrow"><h1 class="as-h1">Teacher sign-in</h1>' +
      '<p class="as-sub">' + esc(S.school.name) + ' · Only teachers can run student assessments.</p>' +
      '<form data-form="email"><label class="as-field">Your email<input class="input" id="as-email" type="email" value="' + esc(S.email) + '" placeholder="name@school.edu" autocomplete="email" autofocus></label>' +
      (S.err ? '<p class="as-err">' + esc(S.err) + '</p>' : '') +
      '<button class="btn btn-primary block" type="submit">Continue</button></form>' +
      '<p class="as-hint"><button class="btn-link" data-go="code">← Use a different school code</button></p></div>';
  }
  function noOpenView() {
    return '<div class="as-card narrow"><h1 class="as-h1">Nothing to assess right now</h1>' +
      '<p class="as-sub">No student assessments are open at ' + esc(S.school.name) + ' at the moment. They appear here once a phase is live.</p></div>';
  }
  function pickView() {
    var secs = A.assessableSections(S.email, S.school.school_id, S.phase), on = ruleOn();
    var own = secs.filter(function (x) { return x.own; }).map(function (x) { return x.name; });
    var rule = on
      ? '<div class="as-rule">My School Check-in runs at school this phase, so you can’t assess your own class' + (own.length ? ' (' + esc(own.join(', ')) + ')' : '') + '. Another teacher assesses it — pick a different class.</div>'
      : '';
    var chips = items().map(function (i) { return '<span class="ui-chip info">' + esc(i.name) + '</span>'; }).join('');
    var tiles = secs.map(function (x) {
      var c = classDone(x.section_id), pct = c.expected ? Math.round(c.done * 100 / c.expected) : 0;
      var why = x.blocked ? 'Your class — another teacher assesses it' : (x.own ? 'Your class' : '');
      return '<button class="as-class" data-section="' + esc(x.section_id) + '"' + (x.blocked ? ' disabled aria-disabled="true" title="You can’t assess your own class while My School Check-in runs at school."' : '') + '>' +
        '<b>' + esc(x.name) + '</b><span>' + x.students + ' children · ' + pct + '% done</span>' +
        (why ? '<span class="as-own">' + esc(why) + '</span>' : '') + '</button>';
    }).join('') || '<p class="as-sub">This school has no classes yet.</p>';
    return '<h1 class="as-h1">Pick a class to assess</h1><p class="as-sub">' + esc(S.phase) + ' · these run at school:</p>' +
      '<div class="as-items">' + chips + '</div>' + rule + '<div class="as-classes">' + tiles + '</div>';
  }
  function classView() {
    var kids = kidsOf(S.sectionId);
    var rows = kids.map(function (st) {
      var steps = stepsFor(st), next = steps.find(function (x) { return x.state === 'open'; });
      var chips = steps.map(function (x) {
        var cls = x.state === 'done' ? 'ok' : x.state === 'locked' ? 'muted' : 'info';
        var tip = x.state === 'locked' ? 'Opens once “' + x.after + '” is done' : x.state === 'done' ? 'Done' : 'Ready';
        return '<span class="ui-chip ' + cls + '" title="' + esc(tip) + '">' + (x.state === 'done' ? '✓ ' : '') + esc(x.name) + '</span>';
      }).join('');
      var btn = next ? '<button class="btn btn-primary sm" data-start="' + esc(st.student_id) + '" data-item="' + esc(next.id) + '">Start ' + esc(next.name) + '</button>'
        : (steps.length && steps.every(function (x) { return x.state === 'done'; }) ? '<span class="ui-chip ok">All done</span>' : '<span class="ui-chip muted">Waiting</span>');
      return '<div class="as-kid"><span class="as-kid-name">' + esc(st.name) + '<small>' + esc(st.student_id) + '</small></span><span class="as-steps">' + chips + '</span>' + btn + '</div>';
    }).join('') || '<p class="as-sub">No children in this class.</p>';
    return '<button class="btn-link as-back" data-go="pick">← All classes</button>' +
      '<h1 class="as-h1">' + esc(sectionName(S.sectionId)) + '</h1><p class="as-sub">' + esc(S.phase) + ' · start each child’s next assessment on their device, or here.</p>' +
      '<div class="as-card"><div class="as-kids">' + rows + '</div></div>';
  }
  function runView() {
    var st = A.getStudent(S.school.school_id, S.studentId), it = items().find(function (x) { return x.id === S.itemId; }) || {};
    return '<div class="as-run" role="dialog" aria-label="' + esc(it.name || 'Assessment') + '">' +
      '<div class="as-run-top"><h1 class="as-h1">' + esc(it.name || 'Assessment') + '</h1><span class="ui-chip info">' + esc(st ? st.first || st.name : '') + '</span></div>' +
      '<div class="as-run-body">The assessment runs here on the child’s screen.<br>(Prototype — mark it complete when the child finishes.)</div>' +
      (S.err ? '<p class="as-err">' + esc(S.err) + '</p>' : '') +
      '<div class="as-run-foot"><button class="btn btn-outline md" data-go="class">Stop</button><button class="btn btn-primary md" data-complete>Mark complete</button></div></div>';
  }
  function doneView() {
    return '<div class="as-card narrow"><h1 class="as-h1">Session finished</h1>' +
      '<p class="as-sub">You’re signed out of student assessments on this device. Hand it back to the child or the next teacher.</p>' +
      '<button class="btn btn-primary block" data-restart>Start again</button></div>';
  }

  function render() {
    var body = { code: codeView, email: emailView, noopen: noOpenView, pick: pickView, 'class': classView, run: runView, done: doneView }[S.step]();
    app.innerHTML = topBar() + '<main class="as-wrap">' + (S.step === 'run' ? classView() : '') + body + '</main>';
  }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'as-toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  // ---------- actions ----------
  app.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target.dataset.form;
    if (f === 'code') {
      S.code = document.getElementById('as-code').value.trim();
      var sc = A.resolveSchoolCode(S.code);
      if (!sc) { S.err = 'That code doesn’t match a school. Check it with your school office.'; return render(); }
      S.school = sc; S.err = ''; S.step = 'email'; render();
    } else if (f === 'email') {
      var em = document.getElementById('as-email').value.trim().toLowerCase();
      S.email = em;
      if (!em) { S.err = 'Enter your email.'; return render(); }
      if (!A.isTeacherAt(em, S.school.school_id)) {
        S.err = A.teacherSchools(em).length ? 'You’re a teacher at a different school — check the school code.' : 'Only teachers at ' + S.school.name + ' can run student assessments.';
        return render();
      }
      signedIn(S.school.school_id, em, false);
    }
  });
  app.addEventListener('click', function (e) {
    var t = e.target.closest('button, a'); if (!t) return;
    if (t.dataset.go) { S.err = ''; S.step = t.dataset.go; if (t.dataset.go === 'code') { S.school = null; S.email = ''; } render(); return; }
    if (t.dataset.section && !t.disabled) { S.sectionId = t.dataset.section; S.step = 'class'; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.start) { S.studentId = t.dataset.start; S.itemId = t.dataset.item; S.err = ''; S.step = 'run'; render(); return; }
    if (t.hasAttribute('data-complete')) {
      var res = A.markComplete(S.school.school_id, S.phase, AUD, S.studentId, S.itemId, S.email);
      if (res === true) { S.step = 'class'; render(); toast('Saved.'); return; }
      S.err = res && res.error === 'own_class' ? 'This child is in your own class — another teacher has to run this while My School Check-in runs at school.'
        : res && res.error === 'locked' ? 'Do “' + res.after + '” first.'
        : res && (res.error === 'closed' || res.error === 'not_open') ? 'This phase isn’t open right now.' : 'Couldn’t save — try again.';
      render(); return;
    }
    if (t.hasAttribute('data-finish')) { writeJSON(ASSESS_KEY, null); S.step = 'done'; render(); return; }
    if (t.hasAttribute('data-restart')) { S = { step: 'code', school: null, email: '', viaDashboard: false, phase: null, sectionId: null, studentId: null, itemId: null, err: '', code: '' }; boot(); }
  });

  boot();
})();
