/* ============================================================
   Floating bubbles — bottom-right, shared by every role page.
     · Ask Tilli  (chat bubble) — every role except parents. Each page
       passes its own `ask` handler (its own panel / screen).
     · Need help? (? bubble)    — every role. Opens a small contact card.
   Styles live in tilli.css (.tf-*). Pages lift the stack above their
   mobile bottom nav by setting --tf-bottom / --tf-right.

   TilliFloat.mount({ role, ask })  — idempotent; later calls merge, so a
                                      page can add `ask` once its app boots.
   TilliFloat.hideAsk(bool)         — e.g. while the Ask panel is open.
   TilliFloat.attach(el)            — re-parent the stack into `el` (needed when
                                      the app root is its own stacking context).
   ============================================================ */
(function () {
  var HELP_EMAIL = 'info@tillikids.com';

  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg>',
  };

  var opts = { role: '', ask: null };
  var askHidden = false;
  var el = null;

  function mailto(subject) {
    return 'mailto:' + HELP_EMAIL + '?subject=' + encodeURIComponent(subject + (opts.role ? ' (' + opts.role + ')' : ''));
  }

  function popHTML() {
    return '<div class="tf-pop" id="tf-pop" role="dialog" aria-label="Need help?" hidden>' +
      '<div class="tf-pop-h"><b>Need help?</b><button class="tf-pop-x" data-tf-close aria-label="Close">×</button></div>' +
      '<p class="tf-pop-sub">Questions about the dashboard, or something not working? The Tilli team is happy to help.</p>' +
      '<a class="tf-pop-item" href="' + mailto('Tilli Measures — help') + '">' + ICON.mail + '<span><b>Email the Tilli team</b><small>' + HELP_EMAIL + '</small></span></a>' +
      '<a class="tf-pop-item" href="' + mailto('Tilli Measures — problem report') + '">' + ICON.flag + '<span><b>Report a problem</b><small>Tell us what happened and where</small></span></a>' +
      (opts.ask ? '<button class="tf-pop-item" data-tf-ask>' + ICON.chat + '<span><b>Ask Tilli</b><small>Quick answers about your class and data</small></span></button>' : '') +
    '</div>';
  }

  function build() {
    if (!el) {
      el = document.createElement('div');
      el.className = 'tf-stack';
      el.id = 'tf-stack';
      document.body.appendChild(el);
      // Outside click / Esc closes the help card.
      document.addEventListener('click', function (ev) { if (el && !el.contains(ev.target)) setPop(false); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') setPop(false); });
    }
    el.innerHTML =
      (opts.ask ? '<div class="tf-row tf-row-ask"' + (askHidden ? ' hidden' : '') + '>' +
        '<span class="tf-label" aria-hidden="true">Ask Tilli</span>' +
        '<button class="tf-bubble tf-ask" data-tf-ask aria-label="Ask Tilli" title="Ask Tilli — your assistant">' + ICON.chat + '</button></div>' : '') +
      '<div class="tf-row">' +
        '<span class="tf-label" aria-hidden="true">Need help?</span>' +
        '<button class="tf-bubble tf-help" data-tf-help aria-label="Need help?" aria-expanded="false" aria-controls="tf-pop" title="Need help? Contact the Tilli team">' + ICON.help + '</button></div>' +
      popHTML();

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
    if (document.body) build();
    else document.addEventListener('DOMContentLoaded', build, { once: true });
  }

  function hideAsk(hide) {
    askHidden = !!hide;
    var row = el && el.querySelector('.tf-row-ask');
    if (row) row.hidden = askHidden;
  }

  function attach(parent) {
    if (!el) build();
    if (parent && el.parentNode !== parent) parent.appendChild(el);
  }

  window.TilliFloat = { mount: mount, hideAsk: hideAsk, attach: attach };
})();
