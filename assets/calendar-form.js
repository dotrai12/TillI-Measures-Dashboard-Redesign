/* ============================================================
   Tilli Measures — School calendar form (shared)
   ------------------------------------------------------------
   One editable form for a school's calendar — terms, exam blocks
   (optionally per board) and holidays — plus "upload a PDF or
   photo", which fills the form for someone to check. Used by the
   Tilli platform admin (Plan from calendar, Add School, group
   page, Start new year) and the school admin's School calendar.

     var f = TilliCalendarForm.mount(el, cal, { boards, onUpload(file) → cal,
       year: { start, end }, windows: [{ label, start, end }], choose, onChange });
     year / windows (optional) draw the year-at-a-glance bar: terms, exams,
     holidays — plus the assessment windows once Tilli has set them.
     f.read()  → { terms, exams, holidays }
     f.meta()  → { source:'typed'|'upload', fileName }
   ============================================================ */
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // one / many: the count beside each section title ("3 terms").
  var KINDS = [
    { key: 'terms', title: 'Terms', one: 'term', many: 'terms', add: '+ Add term', name: 'e.g. Term 1', hint: 'when the school is open' },
    { key: 'exams', title: 'Exams', one: 'exam block', many: 'exam blocks', add: '+ Add exam block', name: 'e.g. Final exams', hint: 'assessments never land on these', board: true },
    { key: 'holidays', title: 'Holidays', one: 'holiday', many: 'holidays', add: '+ Add holiday', name: 'e.g. Diwali break', hint: 'a window over one is stretched by those days' },
  ];
  var DAY = 864e5;
  function isoMs(iso) { return Date.parse(iso + 'T00:00:00'); }
  function lengthText(a, b) {
    if (!a || !b || b < a) return '';
    var d = Math.round((isoMs(b) - isoMs(a)) / DAY) + 1;
    return d < 14 ? d + (d === 1 ? ' day' : ' days') : Math.round(d / 7) + ' wks';
  }
  function blank() { return { name: '', start: '', end: '', board: '' }; }

  function mount(el, cal, opts) {
    opts = opts || {};
    var boards = opts.boards || [];
    var st = { terms: [], exams: [], holidays: [], source: 'typed', fileName: null, readNote: '' };
    function load(c) {
      c = c || {};
      KINDS.forEach(function (k) { st[k.key] = (c[k.key] || []).map(function (r) { return { name: r.name || '', start: r.start || '', end: r.end || '', board: r.board || '' }; }); });
      if (!st.terms.length) st.terms.push(blank());
      st.source = c.source || st.source; st.fileName = c.fileName || st.fileName;
    }
    load(cal);

    // One line per block: name · starts → ends · length · board (exams, multi-board) · ×.
    function rowHtml(k, r, i) {
      var bad = r.start && r.end && r.end < r.start, withBoard = boards.length > 1;
      return '<div class="cal-row' + (withBoard ? ' has-board' : '') + (bad ? ' bad' : '') + '">' +
        '<input class="input sm cal-n" data-cal="' + k.key + '" data-i="' + i + '" data-f="name" value="' + esc(r.name) + '" placeholder="' + esc(k.name) + '" aria-label="' + esc(k.title) + ' name">' +
        '<input class="input sm cal-s" type="date" data-cal="' + k.key + '" data-i="' + i + '" data-f="start" value="' + esc(r.start) + '" aria-label="Starts">' +
        '<span class="cal-to" aria-hidden="true">→</span>' +
        '<input class="input sm cal-e" type="date" data-cal="' + k.key + '" data-i="' + i + '" data-f="end" value="' + esc(r.end) + '" aria-label="Ends">' +
        '<span class="cal-len">' + esc(lengthText(r.start, r.end)) + '</span>' +
        (withBoard ? (k.board ? '<label class="select-wrap cal-bw"><select class="select sm cal-b" data-cal="' + k.key + '" data-i="' + i + '" data-f="board" aria-label="Board" title="Only matters in a multi-board school: which board sits these exams.">' +
          '<option value="">All boards</option>' + boards.map(function (b) { return '<option' + (b === r.board ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></label>' : '<span></span>') : '') +
        '<button type="button" class="cal-x" data-calx="' + k.key + '" data-i="' + i + '" aria-label="Remove">×</button>' +
        (bad ? '<span class="cal-err">Ends before it starts.</span>' : '') + '</div>';
    }
    // Year at a glance: terms (tall, light), holidays and exams (thin, on top), and the
    // assessment windows Tilli set in a lane underneath — so clashes show at once.
    function yearBarHtml() {
      var all = [];
      KINDS.forEach(function (k) { st[k.key].forEach(function (r) { if (r.start && r.end && r.end >= r.start) all.push(r); }); });
      var y = opts.year && opts.year.start && opts.year.end ? opts.year : null;
      if (!y && all.length) y = { start: all.map(function (r) { return r.start; }).sort()[0], end: all.map(function (r) { return r.end; }).sort().pop() };
      if (!y || !all.length) return '';
      var t0 = isoMs(y.start), span = Math.max(1, isoMs(y.end) - t0 + DAY);
      var place = function (a, b) { var l = Math.max(0, Math.min(100, (isoMs(a) - t0) / span * 100)), r = Math.max(0, Math.min(100, (isoMs(b) + DAY - t0) / span * 100)); return 'left:' + l.toFixed(2) + '%;width:' + Math.max(0.6, r - l).toFixed(2) + '%'; };
      var bars = '';
      ['terms', 'holidays', 'exams'].forEach(function (k) {
        st[k].forEach(function (r) { if (r.start && r.end && r.end >= r.start) bars += '<span class="cal-yb-' + k + '" style="' + place(r.start, r.end) + '" title="' + esc((r.name || '') + ' · ' + lengthText(r.start, r.end)) + '"></span>'; });
      });
      var wins = (opts.windows || []).filter(function (w) { return w.start && w.end; });
      var lane = wins.length ? '<div class="cal-yb-lane">' + wins.map(function (w) { return '<span class="cal-yb-win" style="' + place(w.start, w.end) + '" title="' + esc(w.label) + '">' + esc(w.label) + '</span>'; }).join('') + '</div>' : '';
      var months = [], d = new Date(t0);
      d.setDate(1); if (d.getTime() < t0) d.setMonth(d.getMonth() + 1);
      for (var n = 0; n < 13 && d.getTime() < t0 + span; n++) { months.push('<span style="left:' + ((d.getTime() - t0) / span * 100).toFixed(2) + '%">' + d.toLocaleDateString('en-GB', { month: 'short' }) + '</span>'); d.setMonth(d.getMonth() + 1); }
      return '<div class="cal-yb" role="img" aria-label="The year at a glance: terms, exams and holidays' + (wins.length ? ', and the assessment windows' : '') + '">' +
          '<div class="cal-yb-track">' + bars + '</div>' + lane + '<div class="cal-yb-months" aria-hidden="true">' + months.join('') + '</div>' +
          '<div class="cal-yb-key" aria-hidden="true"><span><i class="k-terms"></i>Terms</span><span><i class="k-exams"></i>Exams</span><span><i class="k-holidays"></i>Holidays</span>' + (wins.length ? '<span><i class="k-win"></i>Assessment windows</span>' : '') + '</div>' +
        '</div>';
    }
    // opts.choose (school page, nothing saved yet): first pick one of three ways —
    // type it, a PDF, or a photo. An upload is read into the form to check.
    var mode = opts.choose && !cal ? 'choose' : 'form';
    function chooseHtml() {
      var opt = function (m, label, sub) { return '<button type="button" class="cal-opt" data-calmode="' + m + '"><b>' + label + '</b><span>' + sub + '</span></button>'; };
      var up = mode === 'pdf' || mode === 'photo';
      return '<p class="cal-muted cal-choose-h">How would you like to add your calendar?</p>' +
        '<div class="cal-opts">' + opt('form', 'Enter dates manually', 'Type your terms, exams and holidays') + opt('pdf', 'Upload a PDF', 'We read the dates for you to check') + opt('photo', 'Upload a photo', 'A clear photo of the calendar') + '</div>' +
        (up ? '<div class="cal-upload"><label class="btn btn-cyan btn-sm">' + (mode === 'pdf' ? 'Choose the PDF' : 'Choose the photo') + '<input type="file" accept="' + (mode === 'pdf' ? '.pdf,application/pdf' : 'image/*') + '" class="hidden" data-calfile></label>' +
          '<span class="cal-muted">We read the dates into a form for you to check before sending.</span></div>' : '');
    }
    function render() {
      if (mode !== 'form') { el.innerHTML = chooseHtml(); wire(); return; }
      // One status line instead of an upload hint + a warning banner: read from a file →
      // say so (file name trimmed) with "Replace file"; typed → a quiet "Fill from a file".
      var fromFile = st.source === 'upload' && st.fileName;
      var withBoard = boards.length > 1;
      el.innerHTML =
        '<div class="cal-upload">' + (fromFile
          ? '<span class="cal-pill">Read from your file · check each date</span><span class="cal-file" title="' + esc(st.fileName) + '">' + esc(st.fileName) + '</span>'
          : '<span class="cal-muted">Typing it in? Or</span>') +
          '<label class="btn-link cal-replace">' + (fromFile ? 'Replace file' : 'fill it from a PDF or photo') + '<input type="file" accept=".pdf,image/*" class="hidden" data-calfile></label></div>' +
        yearBarHtml() +
        KINDS.map(function (k) {
          var n = st[k.key].filter(function (r) { return r.start && r.end; }).length;
          return '<div class="cal-kind"><div class="cal-kind-h"><i class="cal-sq k-' + k.key + '" aria-hidden="true"></i><b>' + k.title + '</b>' +
              (n ? '<span class="cal-count">' + n + ' ' + (n === 1 ? k.one : k.many) + '</span>' : '') + '<span class="cal-muted">· ' + esc(k.hint) + '</span></div>' +
            '<div class="cal-row cal-head' + (withBoard ? ' has-board' : '') + '" aria-hidden="true"><span>Name</span><span>Starts</span><span></span><span>Ends</span><span>Length</span>' + (withBoard ? '<span>' + (k.board ? 'Board' : '') + '</span>' : '') + '<span></span></div>' +
            st[k.key].map(function (r, i) { return rowHtml(k, r, i); }).join('') +
            '<button type="button" class="cal-add" data-caladd="' + k.key + '">' + k.add + '</button></div>';
        }).join('');
      wire();
    }
    function wire() {
      el.querySelectorAll('[data-cal]').forEach(function (inp) {
        inp.addEventListener('input', function () { st[inp.dataset.cal][+inp.dataset.i][inp.dataset.f] = inp.value; if (opts.onChange) opts.onChange(); });
        inp.addEventListener('change', function () { st[inp.dataset.cal][+inp.dataset.i][inp.dataset.f] = inp.value; if (inp.dataset.dmy) render(); if (opts.onChange) opts.onChange(); });
      });
      el.querySelectorAll('[data-caladd]').forEach(function (b) { b.addEventListener('click', function () { st[b.dataset.caladd].push(blank()); render(); if (opts.onChange) opts.onChange(); }); });
      el.querySelectorAll('[data-calx]').forEach(function (b) { b.addEventListener('click', function () { st[b.dataset.calx].splice(+b.dataset.i, 1); if (!st.terms.length) st.terms.push(blank()); render(); if (opts.onChange) opts.onChange(); }); });
      el.querySelectorAll('[data-calmode]').forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.calmode; render(); }); });
      var f = el.querySelector('[data-calfile]');
      if (f) f.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0]; if (!file || !opts.onUpload) return;
        var got = opts.onUpload(file);
        if (!got) return;
        load(got); st.source = 'upload'; st.fileName = file.name; mode = 'form';
        st.readNote = 'We read these dates from ' + file.name + '. Check every one against the real calendar before sending.';
        render(); if (opts.onChange) opts.onChange();
      });
    }
    render();
    return {
      read: function () {
        var out = {};
        KINDS.forEach(function (k) { out[k.key] = st[k.key].filter(function (r) { return r.start && r.end; }).map(function (r) { return { name: r.name.trim() || (k.key === 'terms' ? 'Term' : k.key === 'exams' ? 'Exams' : 'Holiday'), start: r.start, end: r.end, board: r.board || null }; }); });
        return out;
      },
      meta: function () { return { source: st.source, fileName: st.fileName }; },
      hasErrors: function () { return KINDS.some(function (k) { return st[k.key].some(function (r) { return r.start && r.end && r.end < r.start; }); }); },
    };
  }

  window.TilliCalendarForm = { mount: mount };
})();
