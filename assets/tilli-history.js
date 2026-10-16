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

  var ROLE = { teacher: 'Teacher', admin: 'School admin', principal: 'Principal', parent: 'Parent', tilli: 'Tilli Team', group: 'Group admin', system: 'System' };
  var AUD = { 'Teacher': 'teacher observation', 'Parent': 'parent report', 'Direct Assessment': 'student assessment' };
  var NAMES_SHOWN = 8;   // bulk rows list this many children before "+N more"

  function roleLabel(r) { return ROLE[r] || ''; }

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
    var sec = e.section_name ? ' to <b>' + esc(e.section_name) + '</b>' : '';
    switch (e.action) {
      case 'student.add':        return hide ? 'added this student' + sec : 'added ' + subj + sec;
      case 'student.edit':       return hide ? 'edited the details' : 'edited ' + subj + '’s details';
      case 'student.offboard':   return hide ? 'marked as left the school' : 'marked ' + subj + ' as left the school';
      case 'parent.link':        return hide ? 'linked a parent' : 'linked a parent to ' + subj;
      case 'parent.unlink':      return hide ? 'removed a parent link' : 'removed a parent link from ' + subj;
      case 'teacher.reassign':   return 'changed the teacher for <b>' + esc(e.section_name || 'a section') + '</b>';
      case 'phase.deploy':       return 'deployed the <b>' + lane + '</b>';
      case 'phase.update':       return 'updated the <b>' + lane + '</b>';
      case 'phase.end':          return 'ended the <b>' + lane + '</b>';
      case 'phase.undeploy':     return 'withdrew the <b>' + lane + '</b>';
      case 'assessment.complete': return 'completed the <b>' + lane + '</b>' + (hide || !subj ? '' : ' for ' + subj);
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
    if (opts.showSection !== false && e.section_name && e.action !== 'student.add' && e.action !== 'teacher.reassign') meta.push(esc(e.section_name));
    var items = (e.action === 'assessment.complete' && (e.items || []).length > 1) ? '<div class="hist-names">' + esc(e.items.join(' · ')) + '</div>' : '';
    return '<div class="hist-item k-' + (e.kind === 'assessment' ? 'asm' : 'stu') + '">' +
      '<span class="hist-dot" aria-hidden="true"></span>' +
      '<div class="hist-body">' +
        '<div class="hist-line"><b class="hist-who">' + esc(who(e, opts)) + '</b> ' + sentenceHTML(e, opts) + '</div>' +
        changesHTML(e) + namesHTML(e) + items +
        '<div class="hist-meta">' + meta.join('<span class="hist-sep">·</span>') + '</div>' +
      '</div></div>';
  }

  // Events grouped under day headings, newest first.
  // opts: { me, hideStudent, showSchool, schoolName(id), showSection, empty, flat }
  function listHTML(events, opts) {
    opts = opts || {};
    if (!events || !events.length) return '<div class="hist-empty">' + esc(opts.empty || 'No changes recorded yet.') + '</div>';
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
    sentence: sentence, listHTML: listHTML, lastUpdatedHTML: lastUpdatedHTML, lastUpdatedText: lastUpdatedText, kindChipsHTML: kindChipsHTML,
  };
})();
