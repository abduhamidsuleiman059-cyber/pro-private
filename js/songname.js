/* Pro Private - songname.js
   Majina safi ya nyimbo: cleanSongName(fileName) -> { title, artist }
   Inatumika na orodha ya muziki (vault.js) na ukurasa wa player (inajiweka yenyewe).
   Pia ina getGradientForLetter(letter) kwa rangi 3 za kisanduku cha herufi. */

(function () {
  'use strict';

  var EXT = /\.(mp3|m4a|m4b|wav|ogg|oga|opus|aac|flac|wma|amr|3gp|aiff?|mid|webm|mp4)$/i;
  var NOISE = ['remix', 'official', 'audio', 'video', 'lyrics', 'lyric', 'lyrical', 'hq', 'hd', 'mp3', 'music'];
  var LOWER = { ft: 1, feat: 1, x: 1, vs: 1 };
  var UPPER = { dj: 1, mc: 1, tz: 1, uk: 1, usa: 1, ost: 1 };
  var UNKNOWN_ARTIST = 'Haijulikani';

  var GRADS = [
    ['#ff5f6d', '#ffc371', '#ff3cac'],
    ['#4facfe', '#00f2fe', '#7b61ff'],
    ['#43e97b', '#38f9d7', '#11998e'],
    ['#fa709a', '#fee140', '#f78ca0'],
    ['#a18cd1', '#fbc2eb', '#6a11cb'],
    ['#f7971e', '#ffd200', '#ff512f'],
    ['#00c6ff', '#0072ff', '#7f00ff'],
    ['#ee0979', '#ff6a00', '#7928ca'],
    ['#11998e', '#38ef7d', '#0575e6'],
    ['#f857a6', '#ff5858', '#7f53ac']
  ];

  /* ---------- Rangi 3 kwa kila herufi ---------- */
  function getGradientForLetter(letter) {
    var c = String(letter || '?').charAt(0).toUpperCase().charCodeAt(0) || 0;
    var g = GRADS[c % GRADS.length];
    return 'linear-gradient(135deg, ' + g[0] + ' 0%, ' + g[1] + ' 52%, ' + g[2] + ' 100%)';
  }

  function firstLetter(text) {
    var m = null;
    try { m = String(text || '').match(/[\p{L}\p{N}]/u); } catch (e) { m = String(text || '').match(/[A-Za-z0-9]/); }
    return m ? m[0].toUpperCase() : '';
  }

  /* ---------- Kusafisha ---------- */
  function isNoise(w) {
    return NOISE.indexOf(String(w).toLowerCase().replace(/[^a-z0-9]/g, '')) !== -1;
  }

  function tidySeg(seg) {
    return String(seg || '')
      .replace(/_+/g, ' ')
      .replace(/\s*[-\u2013\u2014]{2,}\s*/g, ' ')
      .replace(/\s+[-\u2013\u2014]+|[-\u2013\u2014]+\s+/g, ' ')
      .replace(/^[\s\-\u2013\u2014.,]+|[\s\-\u2013\u2014.,]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tcWord(w) {
    if (!w) return w;
    var bare = w.toLowerCase().replace(/\.$/, '');
    if (LOWER[bare]) return bare + (w.charAt(w.length - 1) === '.' ? '.' : '');
    if (UPPER[bare]) return w.toUpperCase();
    // neno lenye herufi kubwa na ndogo mchanganyiko (Al, McDonald) linabaki lilivyo
    if (w !== w.toLowerCase() && w !== w.toUpperCase()) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }

  function titleCase(str) {
    return String(str || '').split(' ').map(function (word) {
      return word.split('-').map(tcWord).join('-');
    }).join(' ');
  }

  function stripNoiseWords(title) {
    var words = title.split(' ').filter(Boolean);
    while (words.length > 1 && isNoise(words[0])) words.shift();
    while (words.length > 1 && isNoise(words[words.length - 1])) words.pop();
    return words.join(' ');
  }

  function cleanSongName(fileName) {
    var raw = String(fileName || '');
    var s = raw.replace(EXT, '').trim();

    // majina ya simu yenye UUID/hex yanabaki yalivyo
    if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(s) || /^[0-9a-f]{20,}$/i.test(s)) {
      return { title: s, artist: UNKNOWN_ARTIST, hasArtist: false, base: s };
    }

    // (128k) [256k] 128kbps
    s = s.replace(/[\(\[\{]\s*\d{2,3}\s*k(?:bps)?\s*[\)\]\}]/gi, ' ');
    s = s.replace(/[\s_\-]+\d{2,3}\s?k(?:bps)?\s*$/i, '');
    s = s.replace(/\b\d{2,3}\s?kbps\b/gi, ' ');

    // mabano yenye maneno ya takataka tu: (Official Audio), [Lyrics]
    s = s.replace(/[\(\[\{]([^\)\]\}]*)[\)\]\}]/g, function (all, inner) {
      var ws = inner.split(/[\s_\-]+/).filter(Boolean);
      var onlyNoise = ws.length > 0 && ws.every(function (w) {
        return isNoise(w) || /^(new|full|song|version|download|free)$/i.test(w);
      });
      return onlyNoise ? ' ' : ' ' + inner + ' ';
    });

    // namba ya wimbo mwanzoni: "01. ", "02) ", "03 - "
    s = s.replace(/^\s*\d{1,3}\s*(?:[.)]|\s[-\u2013\u2014])\s+/, '');

    var artist = '';
    var title = '';
    var run = s.match(/_{3,}/);

    if (run) {
      artist = tidySeg(s.slice(0, run.index));
      title = tidySeg(s.slice(run.index + run[0].length));
    } else {
      var flat = s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      var sep = flat.match(/\s+[-\u2013\u2014]+\s+/);
      if (sep) {
        artist = tidySeg(flat.slice(0, sep.index));
        title = tidySeg(flat.slice(sep.index + sep[0].length));
      } else {
        title = tidySeg(flat);
      }
    }

    if (!title && artist) { title = artist; artist = ''; }

    title = stripNoiseWords(title);
    if (!title) title = tidySeg(raw.replace(EXT, '')) || 'Wimbo';

    title = titleCase(title);
    artist = artist ? titleCase(stripNoiseWords(artist)) : '';

    return {
      title: title,
      artist: artist || UNKNOWN_ARTIST,
      hasArtist: !!artist,
      base: tidySeg(raw.replace(EXT, ''))
    };
  }

  /* ---------- Utafutaji: puuza herufi kubwa/ndogo, _ na - ---------- */
  function norm(s) {
    var t = String(s || '').toLowerCase();
    try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return t.replace(/[_\-\u2013\u2014]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function haystack(song) {
    return norm(song.title + ' ' + (song.hasArtist ? song.artist : '') + ' ' + song.base);
  }

  function matches(hay, query) {
    var tokens = norm(query).split(' ').filter(Boolean);
    for (var i = 0; i < tokens.length; i++) {
      if (hay.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  window.PPSong = {
    parse: cleanSongName,
    cleanSongName: cleanSongName,
    getGradientForLetter: getGradientForLetter,
    firstLetter: firstLetter,
    norm: norm,
    haystack: haystack,
    matches: matches
  };
  window.cleanSongName = cleanSongName;
  window.getGradientForLetter = getGradientForLetter;

  /* =========================================================
     Ukurasa wa player: badilisha jina ghafi kuwa Title + Artist
     (bila kugusa player.html wala player.js)
     ========================================================= */
  if (!/player\.html$/i.test(location.pathname)) return;

  var rawName = '';
  var song = null;
  var applying = false;

  function applyToPage() {
    if (!song || !rawName || applying || !document.body) return;
    applying = true;
    try {
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) {
        var p = n.parentNode && n.parentNode.nodeName;
        if (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA') continue;
        if (n.nodeValue && n.nodeValue.indexOf(rawName) !== -1) nodes.push(n);
      }
      nodes.forEach(function (node) {
        node.nodeValue = node.nodeValue.split(rawName).join(song.title);
        var el = node.parentNode;
        if (el && el.textContent.trim() === song.title) {
          var next = el.nextElementSibling;
          if (!next || !next.classList.contains('song-artist')) {
            var a = document.createElement('div');
            a.className = 'song-artist';
            a.textContent = song.artist;
            el.parentNode.insertBefore(a, el.nextSibling);
          }
        }
      });
    } finally {
      applying = false;
    }
  }

  async function startPlayer() {
    var id = new URLSearchParams(location.search).get('id');
    if (!id) return;

    var tries = 0;
    while ((!window.PPCrypto || !window.PPDB) && tries++ < 100) {
      await new Promise(function (r) { setTimeout(r, 150); });
    }
    if (!window.PPCrypto || !window.PPDB) return;

    try {
      var key = await PPCrypto.getSessionKey();
      var item = await PPDB.getItem(id);
      if (!key || !item) return;
      var meta = JSON.parse(new TextDecoder().decode(await PPCrypto.decrypt(key, item.metaIv, item.meta)));
      rawName = meta.name || '';
      song = cleanSongName(rawName);
    } catch (e) { return; }

    applyToPage();
    new MutationObserver(applyToPage).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startPlayer);
  else startPlayer();
})();