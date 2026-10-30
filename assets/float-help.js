/* ============================================================
   Floating bubbles — bottom-right, shared by every role page.
     · Ask Tilli  (chat bubble) — every role except parents. Each page
       passes its own `ask` handler (its own panel / screen).
     · Need help? (? bubble)    — every role. Opens a small contact card.
   Styles live in tilli.css (.tf-*). Pages lift the stack above their
   mobile bottom nav by setting --tf-bottom / --tf-right.
   Either bubble drags the whole stack; on release it snaps to the nearest
   corner, remembered per browser (localStorage 'tilliMeasures.floatPos').

   TilliFloat.mount({ role, ask })  — idempotent; later calls merge, so a
                                      page can add `ask` once its app boots.
   TilliFloat.hideAsk(bool)         — e.g. while the Ask panel is open.
   TilliFloat.attach(el)            — re-parent the stack into `el` (needed when
                                      the app root is its own stacking context).
   TilliFloat.setAskOpen(bool)      — the page's chat is open: Ask bubble shows ×.
   TilliFloat.anchor()              — { corner, box } of the bubbles, to pin a chat to.
   window 'tillifloat:move' event   — fired whenever the stack moves / snaps.
   ============================================================ */
(function () {
  var HELP_EMAIL = 'info@tillikids.com';
  // Help text follows the page's language (i18n.js) when the page loads it.
  function L(key, en) { var I = window.TilliI18n; return I ? I.t(key, en) : en; }
  function A(key, en) { return L(key, en).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg>',
  };

  var opts = { role: '', ask: null };
  var askHidden = false;
  var askOpen = false;      // a page's chat is open → the Ask bubble shows × and closes it
  var el = null;

  // ---- drag to move: either bubble drags the whole stack, then snaps ----
  // The stack lives in one of four corners: br (CSS home) · bl · tr · tl. A
  // drag moves it freely (translate offset from home, so pages' --tf-bottom /
  // --tf-right still apply); release glides it to the nearest corner. The
  // corner — not pixels — is remembered, so it survives resizes.
  var POS_KEY = 'tilliMeasures.floatPos';
  var DRAG_THRESHOLD = 6;   // px a press must travel before it's a drag (less = a normal tap / click)
  var EDGE = 8;             // px always kept between the bubbles and the viewport edge while dragging
  var SNAP_TOP = 84;        // px from the top in the top corners — clears page headers / top bars
  var SNAP_MS = 420;        // corner glide duration (ms)
  var SNAP_EASE = 'cubic-bezier(.22, 1.12, .36, 1)';   // fast start, soft landing with a ~2% settle past the corner
  var corner = loadCorner();
  var pos = { x: 0, y: 0 }; // current translate offset (px)
  var drag = null, suppressClick = false, snapTimer = null;

  function loadCorner() {
    try { var p = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); if (p && /^(br|bl|tr|tl)$/.test(p.corner)) return p.corner; } catch (e) {}
    return 'br';
  }
  function saveCorner() { try { localStorage.setItem(POS_KEY, JSON.stringify({ corner: corner })); } catch (e) {} }
  // Union of the visible bubbles (labels / card excluded), in viewport px.
  function bubbleBox() {
    var box = null;
    el.querySelectorAll('.tf-bubble').forEach(function (b) {
      if (!b.offsetParent) return;
      var r = b.getBoundingClientRect();
      box = box ? { l: Math.min(box.l, r.left), t: Math.min(box.t, r.top), r: Math.max(box.r, r.right), b: Math.max(box.b, r.bottom) }
                : { l: r.left, t: r.top, r: r.right, b: r.bottom };
    });
    return box;
  }
  function setTransform(x, y) {
    pos = { x: Math.round(x), y: Math.round(y) };
    el.style.transform = (pos.x || pos.y) ? 'translate(' + pos.x + 'px,' + pos.y + 'px)' : '';
    // Pages anchor their chat to the bubble; tell them where it's heading.
    window.dispatchEvent(new CustomEvent('tillifloat:move', { detail: { corner: corner, dragging: !!(drag && drag.moved) } }));
  }
  // Labels and the help card flip sides when the stack is on the left / top.
  function setSides(left, top) { el.classList.toggle('tf-left', left); el.classList.toggle('tf-top', top); }
  // Free move while dragging, clamped so every bubble stays on screen.
  function place(x, y) {
    var box = bubbleBox();
    if (box) {
      var home = { l: box.l - pos.x, t: box.t - pos.y, r: box.r - pos.x, b: box.b - pos.y };
      x = Math.min(Math.max(x, EDGE - home.l), window.innerWidth - EDGE - home.r);
      y = Math.min(Math.max(y, EDGE - home.t), window.innerHeight - EDGE - home.b);
    }
    setTransform(x, y);
    var now = bubbleBox();
    if (now) setSides((now.l + now.r) / 2 < window.innerWidth / 2, (now.t + now.b) / 2 < window.innerHeight / 2);
  }
  // Put the stack in corner c. The side gap matches the page's own --tf-right
  // (left corners mirror it); top corners sit SNAP_TOP down.
  function snapTo(c, animate) {
    if (!el) return;
    corner = c;
    setSides(c.charAt(1) === 'l', c.charAt(0) === 't');
    var box = bubbleBox(); if (!box) return;
    var cs = getComputedStyle(el);
    var gapR = parseFloat(cs.right) || 22, gapB = parseFloat(cs.bottom) || 22;
    var home = { l: box.l - pos.x, t: box.t - pos.y, r: box.r - pos.x, b: box.b - pos.y };
    var x = c.charAt(1) === 'l' ? gapR - home.l : (window.innerWidth - gapR) - home.r;
    var y = c.charAt(0) === 't' ? SNAP_TOP - home.t : (window.innerHeight - gapB) - home.b;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animate && !reduce) {
      clearTimeout(snapTimer);
      el.style.transition = 'transform ' + SNAP_MS + 'ms ' + SNAP_EASE;
      snapTimer = setTimeout(function () { el.style.transition = ''; }, SNAP_MS + 40);
    }
    setTransform(x, y);
  }
  function nearestCorner() {
    var b = bubbleBox(); if (!b) return corner;
    var cx = (b.l + b.r) / 2, cy = (b.t + b.b) / 2;
    return (cy < window.innerHeight / 2 ? 't' : 'b') + (cx < window.innerWidth / 2 ? 'l' : 'r');
  }
  function bindDrag() {
    el.addEventListener('pointerdown', function (e) {
      var b = e.target.closest('.tf-bubble');
      if (!b || e.button !== 0) return;
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false, b: b };
    });
    document.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        drag.moved = true; el.classList.add('dragging'); setPop(false);
        clearTimeout(snapTimer); el.style.transition = '';
        try { drag.b.setPointerCapture(e.pointerId); } catch (err) {}
      }
      place(drag.ox + dx, drag.oy + dy);
    });
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      if (drag.moved) {
        // The release would also fire a click on the bubble — swallow that one.
        suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
        el.classList.remove('dragging');
        snapTo(nearestCorner(), true); saveCorner();
      }
      drag = null;
    }
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    el.addEventListener('click', function (e) { if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; } }, true);
    window.addEventListener('resize', function () { snapTo(corner, false); });
  }

  function mailto(subject) {
    return 'mailto:' + HELP_EMAIL + '?subject=' + encodeURIComponent(subject + (opts.role ? ' (' + opts.role + ')' : ''));
  }

  function popHTML() {
    return '<div class="tf-pop" id="tf-pop" role="dialog" aria-label="' + A('help.need', 'Need help?') + '" hidden>' +
      '<div class="tf-pop-h"><b>' + A('help.need', 'Need help?') + '</b><button class="tf-pop-x" data-tf-close aria-label="' + A('help.close', 'Close') + '">×</button></div>' +
      '<p class="tf-pop-sub">' + A('help.sub', 'Questions about the dashboard, or something not working? The Tilli team is happy to help.') + '</p>' +
      '<a class="tf-pop-item" href="' + mailto('Tilli Measures — help') + '">' + ICON.mail + '<span><b>' + A('help.email', 'Email the Tilli team') + '</b><small>' + HELP_EMAIL + '</small></span></a>' +
      '<a class="tf-pop-item" href="' + mailto('Tilli Measures — problem report') + '">' + ICON.flag + '<span><b>' + A('help.report', 'Report a problem') + '</b><small>' + A('help.reportSub', 'Tell us what happened and where') + '</small></span></a>' +
      (opts.ask ? '<button class="tf-pop-item" data-tf-ask>' + ICON.chat + '<span><b>Ask Tilli</b><small>' + String(opts.askSub || 'Quick answers about your class and data').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</small></span></button>' : '') +
    '</div>';
  }

  function build() {
    if (!el) {
      el = document.createElement('div');
      el.className = 'tf-stack';
      el.id = 'tf-stack';
      document.body.appendChild(el);
      // Outside click / Esc closes the help card.
      document.addEventListener('click', function (ev) {
        // Phones: the ? in the page's top bar opens the same help card (F18).
        var top = ev.target.closest && ev.target.closest('[data-tf-tophelp]');
        if (top) { setPop(document.getElementById('tf-pop').hidden); return; }
        if (el && !el.contains(ev.target)) setPop(false);
      });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') setPop(false); });
      bindDrag();
    }
    el.innerHTML =
      (opts.ask ? '<div class="tf-row tf-row-ask"' + (askHidden ? ' hidden' : '') + '>' +
        '<span class="tf-label" aria-hidden="true">Ask Tilli</span>' +
        '<button class="tf-bubble tf-ask" data-tf-ask aria-label="' + (askOpen ? 'Close Ask Tilli' : 'Ask Tilli') + '" aria-expanded="' + askOpen + '" title="Ask Tilli — your assistant · drag to move">' +
          '<span class="tf-ic-chat">' + ICON.chat + '</span><span class="tf-ic-close">' + ICON.close + '</span></button></div>' : '') +
      '<div class="tf-row">' +
        '<span class="tf-label" aria-hidden="true">' + A('help.need', 'Need help?') + '</span>' +
        '<button class="tf-bubble tf-help" data-tf-help aria-label="' + A('help.need', 'Need help?') + '" aria-expanded="false" aria-controls="tf-pop" title="' + A('help.bubbleTitle', 'Need help? Contact the Tilli team · drag to move') + '">' + ICON.help + '</button></div>' +
      popHTML();
    // Re-apply the saved spot once laid out (also re-clamps for this viewport).
    requestAnimationFrame(function () { snapTo(corner, false); });

    el.querySelectorAll('[data-tf-ask]').forEach(function (b) {
      b.addEventListener('click', function () { setPop(false); if (opts.ask) opts.ask(); });
    });
    el.querySelector('[data-tf-help]').addEventListener('click', function () { setPop(document.getElementById('tf-pop').hidden); });
    el.querySelector('[data-tf-close]').addEventListener('click', function () { setPop(false); });
  }

  function setPop(open) {
    var pop = el && document.getElementById('tf-pop'); if (!pop) return;
    pop.hidden = !open;
    el.querySelector('[data-tf-help]').setAttribute('aria-expanded', open ? 'true' : 'false');
    el.classList.toggle('pop-open', !!open);
  }

  function mount(o) {
    o = o || {};
    if ('role' in o) opts.role = o.role;
    if ('ask' in o) opts.ask = typeof o.ask === 'function' ? o.ask : null;
    if ('askSub' in o) opts.askSub = o.askSub;   // subtitle under "Ask Tilli" (role-specific wording)
    if (document.body) build();
    else document.addEventListener('DOMContentLoaded', build, { once: true });
  }

  function hideAsk(hide) {
    askHidden = !!hide;
    var row = el && el.querySelector('.tf-row-ask');
    if (row) row.hidden = askHidden;
    if (el && !drag) snapTo(corner, false);   // bubble set changed → re-seat in its corner
  }

  // A page's chat opened / closed → Ask bubble flips to × (and back).
  function setAskOpen(open) {
    askOpen = !!open;
    if (!el) return;
    el.classList.toggle('ask-open', askOpen);
    var b = el.querySelector('.tf-ask');
    if (b) { b.setAttribute('aria-expanded', askOpen); b.setAttribute('aria-label', askOpen ? 'Close Ask Tilli' : 'Ask Tilli'); }
  }
  // Where the bubbles are (viewport px) + which corner — for anchoring a chat to them.
  function anchor() {
    if (!el || !el.isConnected) return null;
    var box = bubbleBox(); if (!box) return null;
    // Mid-glide: report where the stack is heading, not where it is this frame.
    var t = getComputedStyle(el).transform, cx = 0, cy = 0;
    if (t && t !== 'none') { try { var m = new DOMMatrixReadOnly(t); cx = m.m41; cy = m.m42; } catch (e) {} }
    var dx = pos.x - cx, dy = pos.y - cy;
    return { corner: drag && drag.moved ? nearestCorner() : corner, box: { l: box.l + dx, r: box.r + dx, t: box.t + dy, b: box.b + dy } };
  }

  function attach(parent) {
    if (!el) build();
    if (parent && el.parentNode !== parent) parent.appendChild(el);
  }

  window.TilliFloat = { mount: mount, hideAsk: hideAsk, attach: attach, setAskOpen: setAskOpen, anchor: anchor };
})();
