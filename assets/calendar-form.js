/* ============================================================
   Tilli Measures — School calendar form (shared)
   ------------------------------------------------------------
   One editable form for a school's calendar — terms, exam blocks
   (optionally per board) and holidays — plus "upload a PDF or
   photo", which fills the form for someone to check. Used by the
   Tilli platform admin (Plan from calendar, Add School, group
   page, Start new year) and the school admin's School calendar.

     var f = TilliCalendarForm.mount(el, cal, { boards, onUpload(file) → cal });
     f.read()  → { terms, exams, holidays }
     f.meta()  → { source:'typed'|'upload', fileName }
   ============================================================ */
(function () {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var KINDS = [
    { key: 'terms', title: 'Terms', add: '+ Add term', name: 'e.g. Term 1', hint: 'When the school is open. Breaks between terms count as closed.' },
    { key: 'exams', title: 'Exam blocks', add: '+ Add exam block', name: 'e.g. Final exams', hint: 'Assessment windows never overlap these.', board: true },
    { key: 'holidays', title: 'Holidays', add: '+ Add holiday', name: 'e.g. Diwali break', hint: 'A window that crosses one is stretched by those days.' },
  ];
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

    function rowHtml(k, r, i) {
      var bad = r.start && r.end && r.end < r.start;
      return '<div class="cal-row' + (bad ? ' bad' : '') + '">' +
        '<input class="input sm cal-n" data-cal="' + k.key + '" data-i="' + i + '" data-f="name" value="' + esc(r.name) + '" placeholder="' + esc(k.name) + '" aria-label="' + esc(k.title) + ' name">' +
        '<button type="button" class="cal-x" data-calx="' + k.key + '" data-i="' + i + '" aria-label="Remove">×</button>' +
        '<input class="input sm cal-s" type="date" data-cal="' + k.key + '" data-i="' + i + '" data-f="start" value="' + esc(r.start) + '" aria-label="Starts">' +
        '<span class="cal-to" aria-hidden="true">→</span>' +
        '<input class="input sm cal-e" type="date" data-cal="' + k.key + '" data-i="' + i + '" data-f="end" value="' + esc(r.end) + '" aria-label="Ends">' +
        (k.board && boards.length > 1 ? '<select class="select sm cal-b" data-cal="' + k.key + '" data-i="' + i + '" data-f="board" aria-label="Board" title="Only matters in a multi-board school: which board sits these exams.">' +
          '<option value="">All boards</option>' + boards.map(function (b) { return '<option' + (b === r.board ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select>' : '') +
        (bad ? '<span class="cal-err">Ends before it starts.</span>' : '') + '</div>';
    }
    function render() {
      el.innerHTML =
        '<div class="cal-upload"><label class="btn btn-outline btn-sm">Upload a PDF or photo<input type="file" accept=".pdf,image/*" class="hidden" data-calfile></label>' +
          '<span class="cal-muted">We read the dates into the form below — check every one before sending.</span></div>' +
        (st.readNote ? '<div class="ui-note warn cal-readnote"><span aria-hidden="true">🔍</span><span>' + esc(st.readNote) + '</span></div>' : '') +
        KINDS.map(function (k) {
          return '<div class="cal-kind"><div class="cal-kind-h"><b>' + k.title + '</b><span class="cal-muted">' + esc(k.hint) + '</span></div>' +
            st[k.key].map(function (r, i) { return rowHtml(k, r, i); }).join('') +
            '<button type="button" class="btn-link cal-add" data-caladd="' + k.key + '">' + k.add + '</button></div>';
        }).join('');
      wire();
    }
    function wire() {
      el.querySelectorAll('[data-cal]').forEach(function (inp) {
        inp.addEventListener('input', function () { st[inp.dataset.cal][+inp.dataset.i][inp.dataset.f] = inp.value; });
        inp.addEventListener('change', function () { st[inp.dataset.cal][+inp.dataset.i][inp.dataset.f] = inp.value; if (inp.type === 'date') render(); if (opts.onChange) opts.onChange(); });
      });
      el.querySelectorAll('[data-caladd]').forEach(function (b) { b.addEventListener('click', function () { st[b.dataset.caladd].push(blank()); render(); }); });
      el.querySelectorAll('[data-calx]').forEach(function (b) { b.addEventListener('click', function () { st[b.dataset.calx].splice(+b.dataset.i, 1); if (!st.terms.length) st.terms.push(blank()); render(); if (opts.onChange) opts.onChange(); }); });
      var f = el.querySelector('[data-calfile]');
      if (f) f.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0]; if (!file || !opts.onUpload) return;
        var got = opts.onUpload(file);
        if (!got) return;
        load(got); st.source = 'upload'; st.fileName = file.name;
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
