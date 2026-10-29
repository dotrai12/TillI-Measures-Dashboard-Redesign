/* ============================================================
   DD/MM/YYYY date fields — loaded by every page that has date inputs.
   A native <input type="date"> shows the browser's own format (MM/DD/YYYY on
   a US-English browser) and HTML can't change that. So each date input turns
   into a text field that shows and takes DD/MM/YYYY, while its `.value` still
   reads and writes ISO (YYYY-MM-DD) — the code that builds and reads these
   fields doesn't change.
     · Typing: the slashes fill in. Incomplete or impossible date → value ''.
     · Calendar: a click anywhere in the field (or Alt+↓ / F4) opens a small
       DD/MM calendar pop-up (Monday first); min / max days are greyed out, and
       the months either side fill the empty cells in a lighter tone.
     · Fields added later (innerHTML re-renders) convert themselves.
   Converted fields carry data-dmy; styles live in tilli.css (input[data-dmy]).
   ============================================================ */
(function () {
  var NATIVE = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoToDmy(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function dmyToIso(t) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((t || '').trim()); if (!m) return '';
    var d = +m[1], mo = +m[2], y = +m[3], dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? y + '-' + pad(mo) + '-' + pad(d) : '';
  }
  function text(el) { return NATIVE.get.call(el); }
  function fire(el) { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }

  function onType(e) {
    var el = this, t = text(el), atEnd = el.selectionStart === t.length;
    var next = t.replace(/[.\-\s]/g, '/').replace(/[^\d\/]/g, '').replace(/\/{2,}/g, '/');
    if (/^\d{8}$/.test(next)) next = next.slice(0, 2) + '/' + next.slice(2, 4) + '/' + next.slice(4);   // pasted 01062026
    // Slash after a 2-digit day / month, unless the person is deleting.
    else if (atEnd && !(e.inputType && e.inputType.indexOf('delete') === 0) && (/^\d{2}$/.test(next) || /^\d{1,2}\/\d{2}$/.test(next))) next += '/';
    if (next !== t) NATIVE.set.call(el, next);
    el.classList.remove('dmy-bad');
  }
  function onBlur() {
    var el = this, t = text(el).trim(), iso = dmyToIso(t);
    if (iso) NATIVE.set.call(el, isoToDmy(iso));   // 1/6/2026 → 01/06/2026
    var bad = !!t && !iso;
    el.classList.toggle('dmy-bad', bad);
    if (bad) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }

  // Calendar pop-up (one, shared). Opens on any click in a date field; picking a
  // day fills the field. Focus stays in the field, so typing still works.
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  var cal = null, calFor = null, calY = 0, calM = 0;
  function isoOf(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function todayIso() { var t = new Date(); return isoOf(t.getFullYear(), t.getMonth(), t.getDate()); }
  function outOfRange(v, el) { var mn = el.getAttribute('min') || '', mx = el.getAttribute('max') || ''; return (mn && v < mn) || (mx && v > mx); }

  function openCal(el) {
    if (el.disabled || el.readOnly) return;
    if (!cal) {
      cal = document.createElement('div');
      cal.className = 'dmy-cal'; cal.hidden = true;
      cal.setAttribute('role', 'dialog'); cal.setAttribute('aria-label', 'Choose a date');
      cal.addEventListener('mousedown', function (e) { e.preventDefault(); });   // keep focus in the field
      cal.addEventListener('click', onCalClick);
      document.body.appendChild(cal);
      window.addEventListener('resize', closeCal);
      document.addEventListener('scroll', function (e) { if (!cal.hidden && !cal.contains(e.target)) place(); }, true);
    }
    calFor = el;
    showMonth(el.value || el.getAttribute('min') && todayIso() < el.getAttribute('min') && el.getAttribute('min') || todayIso());
    cal.hidden = false; place();
  }
  function closeCal() { if (cal) cal.hidden = true; calFor = null; }
  function showMonth(iso) { calY = +iso.slice(0, 4); calM = +iso.slice(5, 7) - 1; drawCal(); }

  function drawCal() {
    var sel = calFor.value, today = todayIso(), lead = (new Date(calY, calM, 1).getDay() + 6) % 7, days = new Date(calY, calM + 1, 0).getDate(), cells = '';
    // Days from the months either side fill the empty cells, lighter but still pickable.
    var cell = function (y, m, d, other) {
      var t = new Date(y, m, d), v = isoOf(t.getFullYear(), t.getMonth(), t.getDate());
      return '<button type="button" tabindex="-1" data-day="' + v + '" class="' + (other ? 'other' : '') + (v === sel ? ' sel' : '') + (v === today ? ' today' : '') + '"' + (outOfRange(v, calFor) ? ' disabled' : '') + '>' + t.getDate() + '</button>';
    };
    for (var i = lead; i > 0; i--) cells += cell(calY, calM, 1 - i, true);
    for (var d = 1; d <= days; d++) cells += cell(calY, calM, d, false);
    var trail = (7 - (lead + days) % 7) % 7;
    for (var j = 1; j <= trail; j++) cells += cell(calY, calM, days + j, true);
    var nav = function (step, label, sym) { return '<button type="button" tabindex="-1" data-nav="' + step + '" aria-label="' + label + '" title="' + label + '">' + sym + '</button>'; };
    cal.innerHTML = '<div class="dmy-cal-h">' + nav(-12, 'Previous year', '«') + nav(-1, 'Previous month', '‹') +
        '<b>' + MONTHS[calM] + ' ' + calY + '</b>' + nav(1, 'Next month', '›') + nav(12, 'Next year', '»') + '</div>' +
      '<div class="dmy-cal-g">' + DOW.map(function (w) { return '<i>' + w + '</i>'; }).join('') + cells + '</div>' +
      '<div class="dmy-cal-f"><button type="button" tabindex="-1" data-today' + (outOfRange(today, calFor) ? ' disabled' : '') + '>Today</button>' +
        '<button type="button" tabindex="-1" data-clear>Clear</button></div>';
  }
  function place() {
    if (!calFor || !calFor.isConnected) { closeCal(); return; }
    var r = calFor.getBoundingClientRect(), h = cal.offsetHeight, w = cal.offsetWidth;
    var top = r.bottom + 6; if (top + h > innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;   // no room below → open above
    cal.style.top = top + 'px'; cal.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  }
  function pick(el, iso) {
    el.value = iso; el.classList.remove('dmy-bad'); el.removeAttribute('aria-invalid');
    closeCal(); fire(el);
  }
  function onCalClick(e) {
    var b = e.target.closest('button'); if (!b || b.disabled || !calFor) return;
    if (b.dataset.nav) { var t = new Date(calY, calM + +b.dataset.nav, 1); calY = t.getFullYear(); calM = t.getMonth(); drawCal(); place(); }
    else if (b.dataset.day) pick(calFor, b.dataset.day);
    else if (b.hasAttribute('data-today')) pick(calFor, todayIso());
    else if (b.hasAttribute('data-clear')) pick(calFor, '');
  }

  function convert(el) {
    if (el.dataset.dmy) return;
    var iso = text(el);
    el.type = 'text';
    el.dataset.dmy = '1';
    el.setAttribute('inputmode', 'numeric'); el.setAttribute('autocomplete', 'off');
    el.maxLength = 10; el.size = 10;
    if (!el.placeholder) el.placeholder = 'DD/MM/YYYY';
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: function () { return dmyToIso(text(this)); },
      set: function (v) { NATIVE.set.call(this, isoToDmy(v)); }
    });
    el.value = iso;
    el.addEventListener('input', onType);
    el.addEventListener('blur', onBlur);
    el.addEventListener('click', function () { if (calFor !== el) openCal(el); });
    el.addEventListener('blur', function () { if (calFor === el) closeCal(); });
    el.addEventListener('keydown', function (e) {
      if ((e.altKey && e.key === 'ArrowDown') || e.key === 'F4') { e.preventDefault(); openCal(el); }
      else if (e.key === 'Escape' && calFor === el) { e.preventDefault(); e.stopPropagation(); closeCal(); }   // close the calendar, not the modal
    });
    // Typed a full date while the calendar is open → jump to it.
    el.addEventListener('input', function () { if (calFor === el) { var v = el.value; if (v) showMonth(v); else drawCal(); } });
  }

  function scan(root) {
    if (root.matches && root.matches('input[type="date"]')) convert(root);
    if (root.querySelectorAll) root.querySelectorAll('input[type="date"]').forEach(convert);
  }
  new MutationObserver(function (muts) {
    muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan(document);
})();
