/* ======================================================================
   Keep pop-ups open through a reload — shared by every app page.
   ----------------------------------------------------------------------
   A reload must not close anything or lose what was typed (walkthrough
   B1.3). Rather than teach ~100 pop-ups to rebuild themselves, this
   remembers HOW the pop-up was opened and replays it:
     • a capture-phase click listener notes the control clicked last
       (its tag + id / data-* / href / aria-label, or its text);
     • when a pop-up (.overlay or .ui-scrim) appears right after that
       click, the control is saved with the page address, per tab
       (sessionStorage);
     • whatever is typed in the pop-up is saved as it changes;
     • a pop-up opened from inside another is one more level, so a
       chain (group menu → Rename) replays in order;
     • closing the pop-up clears it.
   On load, once the page has drawn, the saved control is found and
   clicked again, then the typed values are put back (firing input /
   change, so the app's own state follows).
   Never kept: passwords and files; pop-ups marked data-keep="own"
   (they restore themselves, e.g. Add School) or data-keep="no"; and
   pop-ups opened by a control that does something (Save, Send,
   Approve, Remove…) — replaying that click would do it twice.
   ====================================================================== */
(function () {
  var KEY = 'tilliMeasures.keepOpen.' + location.pathname;
  var MODAL = '.overlay, .ui-scrim';
  // A control whose click does something — never replayed.
  var ACTION_WORDS = /^(save|create|send|submit|confirm|approve|turn down|decline|delete|remove|revoke|regenerate|archive|un-archive|end|finish|done|yes|deploy|apply|add students|enter my garden|sign in|sign up|log in|continue as)/i;
  var ACTION_IDS = { 'tl-save': 1, 'tl-ok': 1 };
  var WAIT_MS = 2500;      // how long a replayed click may take to show its pop-up
  var CLICK_FRESH_MS = 1500;   // a pop-up this soon after a click was opened by it

  // { href, open: [kind…] (what's on screen), levels: [{ sig, values: { key: { sig, v, c } } }] (the clicks
  // to replay — can be longer than open when a pop-up replaced the one it was opened from) }
  var state = read();
  var restoring = true, lastClick = null;

  function read() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save() {
    try { if (state && state.levels.length) sessionStorage.setItem(KEY, JSON.stringify(state)); else sessionStorage.removeItem(KEY); }
    catch (e) { /* private mode: pop-ups just won't survive a reload */ }
  }
  function clear() { state = null; save(); }

  // ---------- which pop-ups are open ----------
  function openModals() {
    return Array.prototype.slice.call(document.querySelectorAll(MODAL)).filter(function (m) {
      return !m.parentElement || !m.parentElement.closest(MODAL);   // outermost only
    });
  }
  function skipped(m) { return !!(m.closest('[data-keep]') || m.querySelector('[data-keep="own"], [data-keep="no"]')); }
  // A pop-up's identity survives a re-render: its heading, else its classes.
  function kindOf(m) {
    var h = m.querySelector('h1, h2, h3, [role="dialog"] [class*="title"]');
    return (m.className || '') + '|' + (h ? h.textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : '');
  }

  // ---------- control signatures ----------
  function attrsOf(el) {
    var o = {}, any = false;
    Array.prototype.forEach.call(el.attributes, function (a) {
      if (a.name === 'id' || a.name === 'name' || a.name === 'href' || (a.name.indexOf('data-') === 0 && a.name !== 'data-tip')) { o[a.name] = a.value; any = true; }
    });
    if (!any && el.getAttribute('aria-label')) o['aria-label'] = el.getAttribute('aria-label');
    return o;
  }
  var textOf = function (el) { return (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80); };
  function candidates(sig, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sig.tag)).filter(function (e) {
      for (var k in sig.attrs) if (e.getAttribute(k) !== sig.attrs[k]) return false;
      return !sig.text || textOf(e) === sig.text;
    });
  }
  function sigOf(el, scope) {
    var attrs = attrsOf(el), sig = { tag: el.tagName.toLowerCase(), attrs: attrs, text: Object.keys(attrs).length ? '' : textOf(el) };
    sig.idx = Math.max(0, candidates(sig, scope).indexOf(el));
    return sig;
  }
  function find(sig, scope) { var l = candidates(sig, scope); return l[sig.idx] || l[0] || null; }
  // The control a click belongs to: the nearest button / link / thing with a data-* hook.
  function controlOf(t) {
    for (var el = t; el && el !== document.body; el = el.parentElement) {
      if (/^(BUTTON|A|SUMMARY|LABEL)$/.test(el.tagName) || el.getAttribute('role') === 'button') return el;
      if (Array.prototype.some.call(el.attributes, function (a) { return a.name.indexOf('data-') === 0; })) return el;
    }
    return null;
  }
  function isAction(el) {
    return !!(ACTION_IDS[el.id] || ACTION_WORDS.test(textOf(el)) || ACTION_WORDS.test(el.getAttribute('aria-label') || '') || ACTION_WORDS.test(el.getAttribute('title') || ''));
  }

  document.addEventListener('click', function (e) {
    var el = controlOf(e.target); if (!el) { lastClick = null; return; }
    var inM = el.closest(MODAL);
    lastClick = { sig: sigOf(el, inM || document), inModal: !!inM, action: isAction(el), at: Date.now(), used: false };
  }, true);

  // ---------- typed values ----------
  function topModal() { var l = openModals().filter(function (m) { return !skipped(m); }); return l[l.length - 1] || null; }
  function onField(e) {
    if (restoring || !state || !state.levels.length) return;
    var f = e.target, m = topModal();
    if (!m || !m.contains(f) || !/^(INPUT|SELECT|TEXTAREA)$/.test(f.tagName) || f.type === 'password' || f.type === 'file') return;
    var sig = sigOf(f, m), lvl = state.levels[state.levels.length - 1];
    lvl.values[JSON.stringify(sig)] = { sig: sig, v: f.value, c: f.checked };
    save();
  }
  document.addEventListener('input', onField, true);
  document.addEventListener('change', onField, true);

  // ---------- open / close bookkeeping ----------
  function track() {
    if (restoring) return;
    var open = openModals();
    if (open.some(skipped)) { if (state) clear(); return; }
    var kinds = open.map(kindOf), had = state ? state.open : [];
    if (!kinds.length) { if (state) clear(); return; }
    if (kinds.join('\n') === had.join('\n')) return;   // the same pop-ups, re-drawn
    if (state && kinds.length < had.length && kinds.every(function (k, i) { return k === had[i]; })) {   // the top one(s) closed
      state.levels = state.levels.slice(0, state.levels.length - (had.length - kinds.length)); state.open = kinds; save(); return;
    }
    var fresh = lastClick && !lastClick.used && Date.now() - lastClick.at < CLICK_FRESH_MS;
    if (!fresh || lastClick.action) { clear(); return; }   // opened by code, or by a control that does something
    lastClick.used = true;
    var lvl = { sig: lastClick.sig, values: {} };
    if (lastClick.inModal && state && state.levels.length) state.levels.push(lvl);   // opened from inside one (stacked or replacing it)
    else state = { levels: [lvl] };
    state.open = kinds; state.href = location.href;
    save();
  }

  // ---------- replay after a reload ----------
  function waitFor(test, done) {
    var t0 = Date.now();
    (function tick() { var r = test(); if (r || Date.now() - t0 > WAIT_MS) done(r); else setTimeout(tick, 50); })();
  }
  function put(values, scope) {
    Object.keys(values || {}).forEach(function (k) {
      var x = values[k], f = find(x.sig, scope() || document); if (!f) return;
      if (f.type === 'checkbox' || f.type === 'radio') { if (f.checked === !!x.c) return; f.checked = !!x.c; }
      else { if (f.value === x.v) return; f.value = x.v; }
      f.dispatchEvent(new Event('input', { bubbles: true }));
      f.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  function restore() {
    var saved = state;
    if (!saved || !saved.levels || !saved.levels.length || saved.href !== location.href) { state = null; save(); return finish(); }
    var i = 0;
    (function step() {
      if (i >= saved.levels.length) return finish();
      var lvl = saved.levels[i], scope = i ? topModal() : document;
      waitFor(function () { return find(lvl.sig, scope || document); }, function (el) {
        if (!el) return finish();
        var before = openModals().map(kindOf).join('\n');
        el.click();
        waitFor(function () { return openModals().map(kindOf).join('\n') !== before && topModal(); }, function (m) {
          if (!m) return finish();
          put(lvl.values, topModal);
          i++; step();
        });
      });
    })();
    function finish() {
      // Rebuild the record from what's open now (the replay made the same chain),
      // with the typed values carried over.
      state = saved && saved.href === location.href ? saved : null;
      if (state) { state.levels = state.levels.slice(0, i); state.open = openModals().map(kindOf); if (!state.open.length || !i) state = null; }
      save();
      restoring = false;
      new MutationObserver(track).observe(document.body, { childList: true, subtree: true });
    }
  }
  // After the app's first draw.
  window.addEventListener('load', function () { setTimeout(restore, 60); });
})();
