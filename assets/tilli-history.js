/* ============================================================
   Tilli Measures — CHANGE HISTORY renderer  (window.TilliHistory)
   ------------------------------------------------------------
   Shared by the teacher, school-admin and platform / group-admin
   apps so a change reads the same everywhere. Pure string builders:
   events come from TilliAPI.historyFor / historyAcross (or
   TILLI_ORG.server.history for the portfolio); each app wires its
   own clicks. Styles: .hist-* in assets/tilli.css.
   ============================================================ */
(function () {
  'use strict';

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var low = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };

  var ROLE = { teacher: 'Teacher', admin: 'School admin', parent: 'Parent', tilli: 'Tilli Team', group: 'School group admin', system: 'System' };
  var AUD = { 'Teacher': 'teacher observation', 'Parent': 'parent report', 'Direct Assessment': 'student assessment' };
  var NAMES_SHOWN = 8;   // bulk rows list this many children before "+N more"
  var BURST_MS = 30 * 60000;   // summary mode: same person + same edit within this gap → one "N×" row
  var INLINE_MAX = 48;         // summary mode: before→after longer than this collapses to "<field> changed"
  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  function roleLabel(r) { return ROLE[r] || ''; }
  // Section as shown: the name it had when the change happened (the stored
  // snapshot), plus the fixed base in brackets when they differ — so a row from
  // before a rename still reads "Grade 1 A", and one after reads "Rose (Grade 1A)".
  function secName(e) {
    var A = window.TilliAPI, shown = e.section_name || '';
    if (!shown || !e.section_id || !A || !A.sectionBase) return shown;
    var base = A.sectionBase(e.school_id, e.section_id);
    return base && base.replace(/\s+/g, '').toLowerCase() !== shown.replace(/\s+/g, '').toLowerCase() ? shown + ' (' + base + ')' : shown;
  }

  function timeAgo(ms) {
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'just now';
    var m = Math.floor(s / 60); if (m < 60) return m + ' min ago';
    var h = Math.floor(m / 60); if (h < 24) return h + ' h ago';
    var d = Math.floor(h / 24); if (d === 1) return 'yesterday';
    if (d < 7) return d + ' days ago';
    return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fullDate(ms) {
    return new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function dayLabel(ms) {
    var d = new Date(ms), t = new Date();
    var start = function (x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
    var diff = Math.round((start(t) - start(d)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // "Kavya Rao" or "You" when the viewer made the change.
  function who(e, opts) {
    var a = e.actor || {};
    if (opts && opts.me && a.email && low(a.email) === low(opts.me)) return 'You';
    return a.name || a.email || 'Someone';
  }
  // The child(ren) the event is about: a name, "N students", or e.count for
  // portfolio rows that only know a headcount.
  function subjectHTML(e) {
    var st = e.students || [];
    if (st.length === 1) return '<b>' + esc(st[0].name || st[0].id) + '</b>';
    var n = st.length || e.count || 0;
    return n ? '<b>' + n + ' student' + (n === 1 ? '' : 's') + '</b>' : '';
  }

  // What happened, as a phrase that follows the actor's name. opts.hideStudent
  // drops the child's name (used inside one child's own panel).
  function sentenceHTML(e, opts) {
    opts = opts || {};
    if (e.label) return esc(e.label);
    var subj = subjectHTML(e), hide = opts.hideStudent && (e.students || []).length === 1;
    var lane = esc(e.phase || '') + ' ' + esc(AUD[e.audience] || low(e.audience));
    var sec = e.section_name ? ' to <b>' + esc(secName(e)) + '</b>' : '';
    switch (e.action) {
      case 'student.add':        return hide ? 'added this student' + sec : 'added ' + subj + sec;
      case 'student.edit':       return hide ? 'edited the details' : 'edited ' + subj + '’s details';
      case 'student.offboard':   return hide ? 'marked as left the school' : 'marked ' + subj + ' as left the school';
      case 'parent.link':        return hide ? 'linked a parent' : 'linked a parent to ' + subj;
      case 'parent.unlink':      return hide ? 'removed a parent link' : 'removed a parent link from ' + subj;
      case 'teacher.reassign':   return 'changed the teacher for <b>' + esc(secName(e) || 'a section') + '</b>';
      case 'phase.deploy':       return 'deployed the <b>' + lane + '</b>';
      case 'phase.update':       return 'updated the <b>' + lane + '</b>';
      case 'phase.end':          return 'ended the <b>' + lane + '</b>';
      case 'phase.undeploy':     return 'withdrew the <b>' + lane + '</b>';
      case 'assessment.complete': return 'completed the <b>' + lane + '</b>' + (hide || !subj ? '' : ' for ' + subj);
      case 'year.start':         return 'started the <b>' + esc(((e.changes || [])[0] || {}).to || 'new') + '</b> academic year';
    }
    return esc(e.action || 'made a change');
  }
  // Plain-text version (titles / tooltips).
  function sentence(e, opts) { return sentenceHTML(e, opts).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

  function changesHTML(e) {
    var ch = e.changes || [];
    if (!ch.length) return '';
    return '<ul class="hist-changes">' + ch.map(function (c) {
      var from = c.from == null ? '' : String(c.from), to = c.to == null ? '' : String(c.to);
      var val = !from ? '<span class="hist-set">set to</span> <b class="hist-to">' + esc(to) + '</b>'
        : !to ? '<s class="hist-from">' + esc(from) + '</s> <span class="hist-set">removed</span>'
        : '<s class="hist-from">' + esc(from) + '</s> <span class="hist-arw" aria-label="changed to">→</span> <b class="hist-to">' + esc(to) + '</b>';
      return '<li><span class="hist-k">' + esc(c.label) + '</span> ' + val + '</li>';
    }).join('') + '</ul>';
  }
  function namesHTML(e) {
    var st = e.students || [];
    if (st.length < 2) return '';
    var shown = st.slice(0, NAMES_SHOWN).map(function (s) { return esc(s.name || s.id); }).join(', ');
    var more = st.length > NAMES_SHOWN ? ' <span class="hist-more">+' + (st.length - NAMES_SHOWN) + ' more</span>' : '';
    return '<div class="hist-names">' + shown + more + '</div>';
  }

  function itemHTML(e, opts) {
    opts = opts || {};
    var meta = ['<time datetime="' + new Date(e.at).toISOString() + '" title="' + esc(fullDate(e.at)) + '">' + esc(timeAgo(e.at)) + '</time>'];
    var rl = roleLabel(e.actor && e.actor.role); if (rl) meta.push(esc(rl));
    if (opts.showSchool && opts.schoolName) { var sn = opts.schoolName(e.school_id); if (sn) meta.push(esc(sn)); }
    if (opts.showSection !== false && e.section_name && e.action !== 'student.add' && e.action !== 'teacher.reassign') meta.push(esc(secName(e)));
    var items = (e.action === 'assessment.complete' && (e.items || []).length > 1) ? '<div class="hist-names">' + esc(e.items.join(' · ')) + '</div>' : '';
    return '<div class="hist-item k-' + (e.kind === 'assessment' ? 'asm' : 'stu') + '">' +
      '<span class="hist-dot" aria-hidden="true"></span>' +
      '<div class="hist-body">' +
        '<div class="hist-line"><b class="hist-who">' + esc(who(e, opts)) + '</b> ' + sentenceHTML(e, opts) + '</div>' +
        changesHTML(e) + namesHTML(e) + items +
        '<div class="hist-meta">' + meta.join('<span class="hist-sep">·</span>') + '</div>' +
      '</div></div>';
  }

  // ---------- summary mode (opts.summary) ----------
  // One line per row; the full detail opens on click. Repeated edits by the
  // same person to the same thing collapse into one "N×" row.

  function clock(ms) { return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function splitList(v) { return String(v).split(/\s*,\s*/).filter(Boolean); }
  // A comma list → "A, B" (≤2 names) or "3 assessments".
  function listPhrase(names, label) {
    return names.length <= 2 ? names.map(esc).join(', ') : names.length + ' ' + esc(low(label));
  }
  // The short form of one change, for the collapsed row.
  function inlineChangeHTML(changes) {
    var ch = changes || [];
    if (!ch.length) return '';
    if (ch.length > 1) return ch.length + ' fields changed';
    var c = ch[0], from = c.from == null ? '' : String(c.from), to = c.to == null ? '' : String(c.to);
    if (from.indexOf(',') >= 0 || to.indexOf(',') >= 0) {          // list fields: say what was added / removed
      var a = splitList(from), b = splitList(to);
      var added = b.filter(function (x) { return a.indexOf(x) < 0; }), removed = a.filter(function (x) { return b.indexOf(x) < 0; });
      var out = [];
      if (added.length) out.push('added <b>' + listPhrase(added, c.label) + '</b>');
      if (removed.length) out.push('removed <b>' + listPhrase(removed, c.label) + '</b>');
      if (out.length) return out.join(' · ');
    }
    if (!from) return 'set ' + esc(low(c.label)) + ' to <b>' + esc(to) + '</b>';
    if (!to) return 'cleared ' + esc(low(c.label));
    if (from.length + to.length > INLINE_MAX) return esc(c.label) + ' changed';
    return esc(from) + ' <span class="hist-arw" aria-label="changed to">→</span> <b>' + esc(to) + '</b>';
  }
  // Burst net effect: each field's first "from" and last "to" (events are newest-first).
  function netChanges(group) {
    var byLabel = {}, order = [];
    group.slice().reverse().forEach(function (e) {
      (e.changes || []).forEach(function (c) {
        if (!byLabel[c.label]) { byLabel[c.label] = { label: c.label, from: c.from, to: c.to }; order.push(c.label); }
        else byLabel[c.label].to = c.to;
      });
    });
    return order.map(function (k) { return byLabel[k]; }).filter(function (c) { return String(c.from || '') !== String(c.to || ''); });
  }
  function burstKey(e) {
    var a = e.actor || {};
    return [low(a.email || a.name), e.action, e.school_id, e.label || '', e.phase || '', e.audience || '', e.section_name || '',
      (e.students || []).map(function (x) { return x.id || x.name; }).join(',')].join('|');
  }
  // Adjacent events (same day) that are one editing burst → arrays of events.
  function bursts(events) {
    var out = [];
    events.forEach(function (e) {
      var g = out[out.length - 1], last = g && g[g.length - 1];
      if (last && burstKey(last) === burstKey(e) && last.at - e.at <= BURST_MS && dayLabel(last.at) === dayLabel(e.at)) g.push(e);
      else out.push([e]);
    });
    return out;
  }
  function metaHTML(e, opts) {
    var meta = ['<time datetime="' + new Date(e.at).toISOString() + '">' + esc(fullDate(e.at)) + '</time>'];
    var rl = roleLabel(e.actor && e.actor.role); if (rl) meta.push(esc(rl));
    if (opts.schoolName) { var sn = opts.schoolName(e.school_id); if (sn) meta.push(esc(sn)); }
    if (e.section_name && e.action !== 'student.add' && e.action !== 'teacher.reassign') meta.push(esc(secName(e)));
    return '<div class="hist-meta">' + meta.join('<span class="hist-sep">·</span>') + '</div>';
  }
  var sumSeq = 0;
  function summaryItemHTML(group, opts) {
    var e = group[0], n = group.length, id = 'hist-d-' + (++sumSeq);
    var inline = inlineChangeHTML(n > 1 ? netChanges(group) : e.changes);
    var school = opts.showSchool && opts.schoolName ? opts.schoolName(e.school_id) : '';
    var line = '<b class="hist-who">' + esc(who(e, opts)) + '</b> ' + sentenceHTML(e, opts) +
      (n > 1 ? ' <span class="hist-times" title="' + n + ' edits within ' + (BURST_MS / 60000) + ' min">' + n + '×</span>' : '') +
      (inline ? '<span class="hist-inline">' + inline + '</span>' : '') +
      (school ? '<span class="hist-where">· ' + esc(school) + '</span>' : '');
    var items = (e.action === 'assessment.complete' && (e.items || []).length > 1) ? '<div class="hist-names">' + esc(e.items.join(' · ')) + '</div>' : '';
    var detail = n > 1
      ? '<ol class="hist-subs">' + group.map(function (x) {
          return '<li><time datetime="' + new Date(x.at).toISOString() + '" title="' + esc(fullDate(x.at)) + '">' + esc(clock(x.at)) + '</time>' +
            '<div class="hist-sub-body">' + (changesHTML(x) || '<span class="hist-set">no field changes recorded</span>') + namesHTML(x) + '</div></li>';
        }).join('') + '</ol>'
      : changesHTML(e) + namesHTML(e) + items;
    return '<div class="hist-item hist-sum k-' + (e.kind === 'assessment' ? 'asm' : 'stu') + '">' +
      '<span class="hist-dot" aria-hidden="true"></span>' +
      '<div class="hist-body">' +
        '<button type="button" class="hist-sumrow" data-hist-toggle aria-expanded="false" aria-controls="' + id + '">' +
          '<span class="hist-line">' + line + '</span>' +
          '<time class="hist-when" datetime="' + new Date(e.at).toISOString() + '" title="' + esc(fullDate(e.at)) + '">' + esc(timeAgo(e.at)) + '</time>' +
          '<span class="hist-chev" aria-hidden="true">' + CHEVRON + '</span>' +
        '</button>' +
        '<div class="hist-detail" id="' + id + '" hidden>' + detail + metaHTML(e, opts) + '</div>' +
      '</div></div>';
  }
  // "7 changes · ● 3 student records · ● 4 assessments" — counts come from
  // opts.all (the full filtered list) so a paged-in day still shows its true total.
  function dayHeadHTML(label, counts) {
    var parts = [];
    if (counts.stu) parts.push('<span class="hist-dk k-stu"><i aria-hidden="true"></i>' + counts.stu + ' student record' + (counts.stu === 1 ? '' : 's') + '</span>');
    if (counts.asm) parts.push('<span class="hist-dk k-asm"><i aria-hidden="true"></i>' + counts.asm + ' assessment' + (counts.asm === 1 ? '' : 's') + '</span>');
    var total = counts.stu + counts.asm;
    return '<div class="hist-dayhead"><span class="hist-day">' + esc(label) + '</span>' +
      '<span class="hist-daysum"><b>' + total + ' change' + (total === 1 ? '' : 's') + '</b>' + parts.join('') + '</span>' +
      '<button type="button" class="btn-link hist-expandall" data-hist-expandall aria-expanded="false">Expand all</button></div>';
  }
  function summaryListHTML(events, opts) {
    var counts = {};
    (opts.all || events).forEach(function (e) {
      var d = dayLabel(e.at), c = counts[d] || (counts[d] = { stu: 0, asm: 0 });
      if (e.kind === 'assessment') c.asm++; else c.stu++;
    });
    var out = '', cur = null;
    bursts(events).forEach(function (g) {
      var d = dayLabel(g[0].at);
      if (d !== cur) { out += (cur ? '</div></div>' : '') + '<div class="hist-dayblock">' + dayHeadHTML(d, counts[d] || { stu: 0, asm: 0 }) + '<div class="hist-list">'; cur = d; }
      out += summaryItemHTML(g, opts);
    });
    return out + '</div></div>';
  }
  function setRowOpen(btn, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.closest('.hist-item').classList.toggle('open', open);
    var d = document.getElementById(btn.getAttribute('aria-controls')); if (d) d.hidden = !open;
  }
  // Wire row toggles + per-day "Expand all" once on a container whose
  // innerHTML is redrawn (delegated, so redraws need no re-wiring).
  function wireSummary(root) {
    if (!root || root.dataset.histWired) return;
    root.dataset.histWired = '1';
    root.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-hist-toggle]');
      if (t && root.contains(t)) { setRowOpen(t, t.getAttribute('aria-expanded') !== 'true'); return; }
      var all = ev.target.closest('[data-hist-expandall]');
      if (all && root.contains(all)) {
        var open = all.getAttribute('aria-expanded') !== 'true';
        all.closest('.hist-dayblock').querySelectorAll('[data-hist-toggle]').forEach(function (b) { setRowOpen(b, open); });
        all.setAttribute('aria-expanded', open ? 'true' : 'false');
        all.textContent = open ? 'Collapse all' : 'Expand all';
      }
    });
  }

  // Events grouped under day headings, newest first.
  // opts: { me, hideStudent, showSchool, schoolName(id), showSection, empty, flat,
  //         summary (one-line rows + day totals; wire with wireSummary), all (full list for day totals) }
  function listHTML(events, opts) {
    opts = opts || {};
    if (!events || !events.length) return '<div class="hist-empty">' + esc(opts.empty || 'No changes recorded yet.') + '</div>';
    if (opts.summary) return summaryListHTML(events, opts);
    if (opts.flat) return '<div class="hist-list">' + events.map(function (e) { return itemHTML(e, opts); }).join('') + '</div>';
    var out = '', cur = null;
    events.forEach(function (e) {
      var d = dayLabel(e.at);
      if (d !== cur) { out += (cur ? '</div>' : '') + '<div class="hist-day">' + esc(d) + '</div><div class="hist-list">'; cur = d; }
      out += itemHTML(e, opts);
    });
    return out + '</div>';
  }

  // One-line "Last updated 2 h ago by Kavya Rao" for headers. opts.fallback
  // replaces the default text when nothing is on record.
  function lastUpdatedHTML(e, opts) {
    opts = opts || {};
    if (!e) return '<span class="hist-last none">' + esc(opts.fallback || 'No changes recorded yet') + '</span>';
    var tip = fullDate(e.at) + ' — ' + who(e, opts) + ' ' + sentence(e, opts);
    return '<span class="hist-last" title="' + esc(tip) + '">' + esc(opts.prefix || 'Last updated') + ' <b>' + esc(timeAgo(e.at)) + '</b> by ' + esc(who(e, opts)) + '</span>';
  }

  // Plain-text "Last updated 2 h ago by Kavya Rao" — for hover tooltips (.hist-tip).
  function lastUpdatedText(e, opts) {
    opts = opts || {};
    if (!e) return opts.fallback || 'No changes recorded yet';
    return (opts.prefix || 'Last updated') + ' ' + timeAgo(e.at) + ' by ' + who(e, opts);
  }

  // All / Student records / Assessments chips. Apps wire [data-hist-kind].
  function kindChipsHTML(active, cls) {
    return [['', 'All changes'], ['student', 'Student records'], ['assessment', 'Assessments']].map(function (k) {
      var on = (active || '') === k[0];
      return '<button type="button" class="ui-filterchip ' + (cls || '') + (on ? ' on' : '') + '" data-hist-kind="' + k[0] + '" aria-pressed="' + on + '">' + k[1] + '</button>';
    }).join('');
  }

  window.TilliHistory = {
    roleLabel: roleLabel, timeAgo: timeAgo, fullDate: fullDate,
    sentence: sentence, listHTML: listHTML, wireSummary: wireSummary, lastUpdatedHTML: lastUpdatedHTML, lastUpdatedText: lastUpdatedText, kindChipsHTML: kindChipsHTML,
  };
})();
