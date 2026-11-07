/* Pro Private - theme.js
   1) Inabadili black/white, inakumbuka chaguo, na inabadili rangi ya simu (theme-color).
   2) Inabadilisha emoji zote (🔒 ☀️ 🌙 ⚙️ 🖼️ 🎬 🎵 ⬇️ ⬆️ ...) kuwa icons za kisasa (SVG),
      kwenye kila ukurasa, hata zile zinazochorwa na JavaScript baadaye.
   Weka <script src="js/theme.js"></script> ndani ya <head> ili isiwe na mweko. */

(function () {
  'use strict';

  /* =========================================================
     A. ICONS
     ========================================================= */
  var P = {
    lock: '<rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/>',
    unlock: '<rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 9.5-2.2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 10.5 5.2-3.3a.5.5 0 0 1 .8.42v8.76a.5.5 0 0 1-.8.42L16 13.5"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    play: '<path d="M7 4.6v14.8a1 1 0 0 0 1.52.85l12-7.4a1 1 0 0 0 0-1.7l-12-7.4A1 1 0 0 0 7 4.6z" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1.2" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.2" fill="currentColor"/>',
    prev: '<path d="M19 5.5v13a1 1 0 0 1-1.55.83L8 13.1a1.2 1.2 0 0 1 0-2.2l9.45-6.23A1 1 0 0 1 19 5.5z" fill="currentColor"/><path d="M5 5v14"/>',
    next: '<path d="M5 5.5v13a1 1 0 0 0 1.55.83L16 13.1a1.2 1.2 0 0 0 0-2.2L6.55 4.67A1 1 0 0 0 5 5.5z" fill="currentColor"/><path d="M19 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkcircle: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    chevleft: '<path d="m15 18-6-6 6-6"/>',
    backspace: '<path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m18 9-6 6M12 9l6 6"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.14-1.5l5.78-7a4 4 0 0 1 3.14-1.5H22"/><path d="M2 6h1.97a4 4 0 0 1 3.14 1.5l.97 1.18"/><path d="M22 18h-6.03a4 4 0 0 1-3.14-1.5l-.97-1.18"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/>',
    headphones: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h3zM3 15a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H3z"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'
  };

  // emoji -> jina la icon
  var MAP = {
    '🔒': 'lock', '🔐': 'lock', '🔑': 'lock', '🔓': 'unlock',
    '☀': 'sun', '🌞': 'sun', '🌙': 'moon', '🌛': 'moon',
    '⚙': 'settings', '🛠': 'settings',
    '🖼': 'image', '📷': 'image', '📸': 'image', '🌄': 'image',
    '🎬': 'video', '🎥': 'video', '📹': 'video',
    '🎵': 'music', '🎶': 'music', '🎼': 'music',
    '🎧': 'headphones',
    '⬇': 'download', '📥': 'download', '💾': 'download', '⏬': 'download',
    '⬆': 'upload', '📤': 'upload', '⏫': 'upload',
    '✕': 'close', '✖': 'close', '❌': 'close', '✗': 'close',
    '🗑': 'trash',
    '▶': 'play', '⏯': 'play',
    '⏸': 'pause',
    '⏮': 'prev', '⏪': 'prev',
    '⏭': 'next', '⏩': 'next',
    '✓': 'check', '✔': 'check',
    '✅': 'checkcircle',
    '←': 'back', '‹': 'chevleft',
    '⌫': 'backspace', '⌦': 'backspace',
    '🔁': 'repeat', '🔂': 'repeat', '🔀': 'shuffle',
    '🔊': 'volume', '🔉': 'volume', '🔇': 'mute',
    '📁': 'folder', '📂': 'folder',
    '🛡': 'shield',
    '🔍': 'search'
  };

  var keys = Object.keys(MAP);
  var RE = new RegExp('(' + keys.join('|') + ')[\\uFE0E\\uFE0F]?', 'g');
  var QUICK = new RegExp('(' + keys.join('|') + ')');

  function svg(name) {
    var s = document.createElement('span');
    s.className = 'ico ico-' + name;
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML =
      '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" ' +
      'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false">' +
      P[name] + '</svg>';
    return s;
  }

  function convertText(node) {
    var text = node.nodeValue;
    if (!text || !QUICK.test(text)) return;
    var frag = document.createDocumentFragment();
    var last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      frag.appendChild(svg(MAP[m[1]]));
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, TITLE: 1, OPTION: 1, SVG: 1, NOSCRIPT: 1 };

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      var p = root.parentNode;
      if (p && !SKIP[p.nodeName.toUpperCase()]) convertText(root);
      return;
    }
    if (root.nodeType !== 1 || SKIP[root.nodeName.toUpperCase()]) return;
    if (!QUICK.test(root.textContent || '')) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var pn = n.parentNode && n.parentNode.nodeName.toUpperCase();
        return SKIP[pn] ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var list = [], n;
    while ((n = walker.nextNode())) list.push(n);
    list.forEach(convertText);
  }

  function startIcons() {
    scan(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        if (mu.type === 'characterData') { scan(mu.target); return; }
        for (var i = 0; i < mu.addedNodes.length; i++) scan(mu.addedNodes[i]);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  var SELF = document.currentScript && document.currentScript.src;

  function sibling(rel) {
    return SELF ? SELF.replace(/js\/theme\.js(\?.*)?$/, rel) : rel;
  }

  // Pakia css/icons.css (njia yake inatoka mahali theme.js ilipo)
  (function loadCss() {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = sibling('css/icons.css');
    document.head.appendChild(l);
  })();

  // Ukurasa wa player: pakia majina safi ya nyimbo (js/songname.js)
  if (/player\.html$/i.test(location.pathname) && !window.PPSong) {
    var sn = document.createElement('script');
    sn.src = sibling('js/songname.js');
    sn.async = true;
    document.head.appendChild(sn);
  }

  /* =========================================================
     B. THEME (black / white)
     ========================================================= */
  var KEY = 'pp_theme';
  var COLORS = { dark: '#0a0a0a', light: '#ffffff' };

  function getSaved() {
    try {
      var t = localStorage.getItem(KEY);
      if (t === 'dark' || t === 'light') return t;
    } catch (e) {}
    return 'dark'; // chaguo la kwanza: nyeusi
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', COLORS[theme]);

    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      // jua kwenye theme nyeusi (bonyeza kwenda nyeupe), mwezi kwenye nyeupe
      btns[i].textContent = theme === 'dark' ? '☀️' : '🌙';
      btns[i].setAttribute('aria-label', theme === 'dark' ? 'Theme nyeupe' : 'Theme nyeusi');
    }
  }

  function set(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    apply(theme);
  }

  function toggle() {
    set(getSaved() === 'dark' ? 'light' : 'dark');
  }

  // Tumia mara moja (kabla ukurasa haujachorwa)
  apply(getSaved());

  document.addEventListener('DOMContentLoaded', function () {
    apply(getSaved());
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', toggle);
    }
    startIcons();
  });

  window.PPTheme = { get: getSaved, set: set, toggle: toggle };
})();