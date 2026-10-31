/* Pro Private - theme.js
   Inabadili black/white, inakumbuka chaguo, na inabadili rangi ya simu (theme-color).
   Weka <script src="js/theme.js"></script> ndani ya <head>. */

(function () {
  var KEY = 'pp_theme';
  var COLORS = { dark: '#0a0a0a', light: '#ffffff' };

  function getSaved() {
    try {
      var t = localStorage.getItem(KEY);
      if (t === 'dark' || t === 'light') return t;
    } catch (e) {}
    return 'dark';
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

  apply(getSaved());

  document.addEventListener('DOMContentLoaded', function () {
    apply(getSaved());
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', toggle);
    }
  });

  window.PPTheme = { get: getSaved, set: set, toggle: toggle };
})();