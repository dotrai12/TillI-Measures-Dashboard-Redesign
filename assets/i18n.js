/* ============================================================
   Tilli Measures — languages + the shared word list (window.TilliI18n)
   ------------------------------------------------------------
   Every app shows screen text through t(key). English lives here;
   translations live in TilliAPI (edited on Tilli → Translations) and
   are shown ONLY once a person has approved them — anything else, or
   anything whose English has changed since, shows in English.

   Language: the person's own pick (saved on their account, and on the
   device before sign-in) → else the browser's language if we have it →
   else English. Load after tilli-api.js.

   Phase 6A: the groundwork + the consent screens. Each later phase adds
   its app's strings to STRINGS (and drafts to DRAFTS).
   ============================================================ */
(function () {
  'use strict';

  var LANGS = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  ];
  var CODES = LANGS.map(function (l) { return l.code; });
  var DEVICE_KEY = 'tilliMeasures.lang';
  var LOCALE = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', si: 'si-LK' };   // dates + numbers

  // English originals by key. area = where it shows (the Translations screen filters by it).
  var STRINGS = {
    'lang.label': { area: 'Everywhere', en: 'Language' },
    'consent.agreeAll': { area: 'Parent consent', en: 'I agree to all of the above' },
    'consent.required': { area: 'Parent consent', en: 'Required' },
    'consent.optional': { area: 'Parent consent', en: 'Optional' },
    'consent.continue': { area: 'Parent consent', en: 'Continue' },
    'consent.notNow': { area: 'Parent consent', en: 'Not now' },
    'consent.notNowLogout': { area: 'Parent consent', en: 'Not now — log out' },
    'consent.tickRequired': { area: 'Parent consent', en: 'Tick the required box to continue. You can come back and do it later.' },
    'consent.changeLater': { area: 'Parent consent', en: 'You can change this any time from your profile.' },
    'consent.privacy': { area: 'Parent consent', en: 'Read the full privacy notice' },
    'consent.save': { area: 'Parent consent', en: 'Save' },
    'consent.savesNow': { area: 'Parent consent', en: 'Changes save straight away.' },
    'consent.stopsApp': { area: 'Parent consent', en: 'Without the required box, the parent app stops until you tick it again.' },
    'consent.oneThing': { area: 'Parent consent', en: 'One thing first' },
    'consent.backProfile': { area: 'Parent consent', en: 'Back to profile' },
    'consent.yourProfile': { area: 'Parent consent', en: 'Your profile' },
  };
  // The consent wording itself is content (TilliAPI.consentConfig) — read live
  // so a new version's English shows up here for translating.
  function dynamicStrings() {
    var out = {}, A = window.TilliAPI;
    if (!A || !A.consentConfig) return out;
    var c = A.consentConfig();
    out['consent.title'] = { area: 'Parent consent', en: c.title };
    out['consent.intro'] = { area: 'Parent consent', en: c.intro };
    c.items.forEach(function (it) { out['consent.item.' + it.id] = { area: 'Parent consent', en: it.text }; });
    return out;
  }
  function catalog() {
    var all = Object.assign({}, STRINGS, dynamicStrings());
    return Object.keys(all).map(function (k) { return { key: k, en: all[k].en, area: all[k].area }; });
  }

  // Machine drafts (written by Claude, 27 Oct 2026) — what "Draft with Ask Tilli"
  // fills in. They still need a person to check and approve them.
  var DRAFTS = {
    hi: {
      'lang.label': 'भाषा',
      'consent.agreeAll': 'मैं ऊपर दी गई सभी बातों से सहमत हूँ',
      'consent.required': 'ज़रूरी', 'consent.optional': 'वैकल्पिक', 'consent.continue': 'आगे बढ़ें',
      'consent.notNow': 'अभी नहीं', 'consent.notNowLogout': 'अभी नहीं — लॉग आउट करें',
      'consent.tickRequired': 'आगे बढ़ने के लिए ज़रूरी बॉक्स पर निशान लगाएँ। आप बाद में भी आकर ऐसा कर सकते हैं।',
      'consent.changeLater': 'आप इसे कभी भी अपनी प्रोफ़ाइल से बदल सकते हैं।',
      'consent.privacy': 'पूरी गोपनीयता सूचना पढ़ें', 'consent.save': 'सेव करें',
      'consent.savesNow': 'बदलाव तुरंत सेव हो जाते हैं।',
      'consent.stopsApp': 'ज़रूरी बॉक्स के बिना, पैरेंट ऐप तब तक बंद रहेगा जब तक आप फिर से निशान नहीं लगाते।',
      'consent.oneThing': 'पहले एक बात', 'consent.backProfile': 'प्रोफ़ाइल पर वापस जाएँ', 'consent.yourProfile': 'आपकी प्रोफ़ाइल',
      'consent.title': 'शुरू करने से पहले',
      'consent.intro': 'Tilli Measures आपके बच्चे के स्कूल को यह समझने में मदद करता है कि बच्चे कैसे बढ़ रहे हैं — उनकी भावनाएँ, दोस्ती और ध्यान। कृपया इसे पढ़ें और नीचे चुनें। (अस्थायी शब्द — अंतिम पाठ जल्द आएगा।)',
      'consent.item.collect': 'मैं सहमत हूँ कि मेरे जवाब और मेरे बच्चे की चेक-इन जानकारी Tilli और मेरे बच्चे के स्कूल द्वारा मेरे बच्चे की पढ़ाई और भलाई में मदद के लिए इकट्ठा और इस्तेमाल की जा सकती है।',
      'consent.item.research': 'Tilli कार्यक्रम को बेहतर बनाने वाले शोध के लिए मेरे बच्चे की जानकारी, नाम हटाकर, इस्तेमाल कर सकता है।',
      'consent.item.contact': 'Tilli मेरे बच्चे के चेक-इन के बारे में मुझसे ईमेल या WhatsApp पर संपर्क कर सकता है।',
    },
    ta: {
      'lang.label': 'மொழி',
      'consent.agreeAll': 'மேலே உள்ள அனைத்திற்கும் நான் ஒப்புக்கொள்கிறேன்',
      'consent.required': 'கட்டாயம்', 'consent.optional': 'விருப்பத்தேர்வு', 'consent.continue': 'தொடரவும்',
      'consent.notNow': 'இப்போது வேண்டாம்', 'consent.notNowLogout': 'இப்போது வேண்டாம் — வெளியேறு',
      'consent.tickRequired': 'தொடர, கட்டாயப் பெட்டியில் குறியிடவும். பின்னர் வந்தும் இதைச் செய்யலாம்.',
      'consent.changeLater': 'உங்கள் சுயவிவரத்திலிருந்து இதை எப்போது வேண்டுமானாலும் மாற்றலாம்.',
      'consent.privacy': 'முழு தனியுரிமை அறிவிப்பைப் படிக்கவும்', 'consent.save': 'சேமி',
      'consent.savesNow': 'மாற்றங்கள் உடனே சேமிக்கப்படும்.',
      'consent.stopsApp': 'கட்டாயப் பெட்டி இல்லாமல், நீங்கள் மீண்டும் குறியிடும் வரை பெற்றோர் செயலி நிறுத்தப்படும்.',
      'consent.oneThing': 'முதலில் ஒரு விஷயம்', 'consent.backProfile': 'சுயவிவரத்திற்குத் திரும்பு', 'consent.yourProfile': 'உங்கள் சுயவிவரம்',
      'consent.title': 'தொடங்கும் முன்',
      'consent.intro': 'குழந்தைகள் எப்படி வளர்கிறார்கள் — அவர்களின் உணர்வுகள், நட்புகள், கவனம் — என்பதை உங்கள் குழந்தையின் பள்ளி புரிந்துகொள்ள Tilli Measures உதவுகிறது. இதைப் படித்து, கீழே தேர்வு செய்யவும். (தற்காலிக வார்த்தைகள் — இறுதி உரை விரைவில் வரும்.)',
      'consent.item.collect': 'என் பதில்களும் என் குழந்தையின் சரிபார்ப்புத் தகவல்களும், என் குழந்தையின் கற்றலுக்கும் நலனுக்கும் உதவ, Tilli மற்றும் என் குழந்தையின் பள்ளியால் சேகரிக்கப்பட்டுப் பயன்படுத்தப்படலாம் என்பதை நான் ஒப்புக்கொள்கிறேன்.',
      'consent.item.research': 'திட்டத்தை மேம்படுத்தும் ஆராய்ச்சிக்காக, பெயர்கள் நீக்கப்பட்ட நிலையில், என் குழந்தையின் தகவல்களை Tilli பயன்படுத்தலாம்.',
      'consent.item.contact': 'என் குழந்தையின் சரிபார்ப்புகள் குறித்து Tilli என்னை மின்னஞ்சல் அல்லது WhatsApp மூலம் தொடர்புகொள்ளலாம்.',
    },
    si: {
      'lang.label': 'භාෂාව',
      'consent.agreeAll': 'ඉහත සියල්ලට මම එකඟ වෙමි',
      'consent.required': 'අනිවාර්ය', 'consent.optional': 'විකල්ප', 'consent.continue': 'ඉදිරියට යන්න',
      'consent.notNow': 'දැන් නොවේ', 'consent.notNowLogout': 'දැන් නොවේ — ඉවත් වන්න',
      'consent.tickRequired': 'ඉදිරියට යාමට අනිවාර්ය කොටුව සලකුණු කරන්න. ඔබට පසුවද පැමිණ මෙය කළ හැක.',
      'consent.changeLater': 'ඔබගේ පැතිකඩෙන් ඔබට මෙය ඕනෑම වේලාවක වෙනස් කළ හැක.',
      'consent.privacy': 'සම්පූර්ණ රහස්‍යතා දැන්වීම කියවන්න', 'consent.save': 'සුරකින්න',
      'consent.savesNow': 'වෙනස්කම් වහාම සුරැකේ.',
      'consent.stopsApp': 'අනිවාර්ය කොටුව නොමැතිව, ඔබ නැවත සලකුණු කරන තුරු දෙමාපිය යෙදුම නතර වේ.',
      'consent.oneThing': 'මුලින්ම එක දෙයක්', 'consent.backProfile': 'පැතිකඩට ආපසු', 'consent.yourProfile': 'ඔබගේ පැතිකඩ',
      'consent.title': 'ආරම්භ කිරීමට පෙර',
      'consent.intro': 'ළමයින් වර්ධනය වන ආකාරය — ඔවුන්ගේ හැඟීම්, මිත්‍රත්වය සහ අවධානය — තේරුම් ගැනීමට Tilli Measures ඔබගේ දරුවාගේ පාසලට උදව් කරයි. කරුණාකර මෙය කියවා පහතින් තෝරන්න. (තාවකාලික වචන — අවසාන පාඨය ඉක්මනින් ලැබේ.)',
      'consent.item.collect': 'මගේ දරුවාගේ ඉගෙනීමට සහ යහපැවැත්මට සහාය වීම සඳහා, මගේ පිළිතුරු සහ මගේ දරුවාගේ පරීක්ෂණ තොරතුරු Tilli සහ මගේ දරුවාගේ පාසල විසින් එකතු කර භාවිත කළ හැකි බවට මම එකඟ වෙමි.',
      'consent.item.research': 'වැඩසටහන වැඩිදියුණු කරන පර්යේෂණ සඳහා, නම් ඉවත් කර, Tilli හට මගේ දරුවාගේ තොරතුරු භාවිත කළ හැක.',
      'consent.item.contact': 'මගේ දරුවාගේ පරීක්ෂණ ගැන Tilli හට ඊමේල් හෝ WhatsApp හරහා මා හා සම්බන්ධ විය හැක.',
    },
  };

  // ---------- which language ----------
  function signedInEmail() {
    try { var s = JSON.parse(localStorage.getItem('tilliMeasures.session') || 'null'); return s && s.email ? String(s.email).toLowerCase() : ''; } catch (e) { return ''; }
  }
  function known(code) { return CODES.indexOf(code) >= 0 ? code : null; }
  // The browser's preferred languages, first one we have (hi-IN → hi).
  function detect() {
    var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (var i = 0; i < list.length; i++) { var c = known(String(list[i] || '').toLowerCase().split('-')[0]); if (c) return c; }
    return 'en';
  }
  function devicePick() { try { return known(localStorage.getItem(DEVICE_KEY)); } catch (e) { return null; } }
  // A shared device (the student assessment page): its own language on this
  // device only — never the signed-in teacher's account choice.
  var scopeKey = null;
  function deviceOnly(name) { scopeKey = DEVICE_KEY + '.' + name; document.documentElement.lang = current(); }
  function current() {
    if (scopeKey) { var v = null; try { v = known(localStorage.getItem(scopeKey)); } catch (e) { /* no storage */ } return v || detect(); }
    var A = window.TilliAPI, e = signedInEmail();
    return (e && A && A.userLang && known(A.userLang(e))) || devicePick() || detect();
  }
  // email: whose account to save it on (defaults to whoever is signed in).
  function setLang(code, email) {
    code = known(code) || 'en';
    if (scopeKey) { try { localStorage.setItem(scopeKey, code); } catch (e) { /* convenience */ } document.documentElement.lang = code; return code; }
    try { localStorage.setItem(DEVICE_KEY, code); } catch (e) { /* device pick is a convenience */ }
    var A = window.TilliAPI, e = String(email || signedInEmail()).toLowerCase();
    if (e && A && A.setUserLang) A.setUserLang(e, code);
    document.documentElement.lang = code;
    return code;
  }

  // ---------- text ----------
  function englishOf(key, fallback) { var s = STRINGS[key] || dynamicStrings()[key]; return s ? s.en : (fallback != null ? fallback : key); }
  // t(key[, english][, vars]) — the approved translation in the current language,
  // else the English. {name} placeholders are filled from vars.
  function t(key, english, vars) {
    if (english && typeof english === 'object') { vars = english; english = null; }
    var en = englishOf(key, english), lang = current(), out = en, A = window.TilliAPI;
    if (lang !== 'en' && A && A.translationsFor) {
      var rec = (cacheFor(lang))[key];
      if (rec && rec.status === 'approved' && rec.src === en) out = rec.text;
    }
    return vars ? out.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : out;
  }
  var cache = {};
  function cacheFor(lang) { return cache[lang] || (cache[lang] = window.TilliAPI.translationsFor(lang)); }
  function refresh() { cache = {}; }
  function fmtDate(v, opts) {
    var d = v instanceof Date ? v : new Date(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v);
    try { return d.toLocaleDateString(LOCALE[current()] || 'en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d.toDateString(); }
  }

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  // ---------- the switcher ----------
  // A small select in each dashboard (sign-in, parent + teacher profile, school
  // admin account menu, student assessment page). Each language in its own script.
  function switcherHTML(cls) {
    var cur = current();
    return '<label class="lang-switch' + (cls ? ' ' + cls : '') + '"><span class="lang-switch-ic" aria-hidden="true">🌐</span>' +
      '<select data-langswitch aria-label="' + esc(t('lang.label')) + '">' +
      LANGS.map(function (l) { return '<option value="' + l.code + '"' + (l.code === cur ? ' selected' : '') + '>' + l.native + '</option>'; }).join('') +
      '</select></label>';
  }
  // onChange(code) — default reloads so every screen redraws in the new language.
  function wire(root, onChange) {
    (root || document).querySelectorAll('[data-langswitch]').forEach(function (sel) {
      if (sel.dataset.langwired) return; sel.dataset.langwired = '1';
      sel.addEventListener('change', function () { setLang(sel.value); refresh(); (onChange || function () { location.reload(); })(sel.value); });
    });
  }

  document.documentElement.lang = current();
  window.TilliI18n = { LANGS: LANGS, CODES: CODES, catalog: catalog, drafts: DRAFTS, current: current, detect: detect,
    setLang: setLang, deviceOnly: deviceOnly, t: t, refresh: refresh, fmtDate: fmtDate, switcherHTML: switcherHTML, wire: wire };
})();
