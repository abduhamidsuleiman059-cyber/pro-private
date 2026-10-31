/* Pro Private - vault.js
   Ukurasa mkuu: tabo (Picha, Video, Muziki), kuongeza faili, kuchagua na kufuta.
   Kila faili, jina lake na thumbnail yake vinafungwa (encrypted) kabla ya kuhifadhiwa. */

(function () {
  'use strict';

  var MAX_FILE_MB = 150;   // faili kubwa kuliko hili halikubaliwi (kulinda simu isizimike)

  var TABS = {
    photo: { title: 'Picha',  accept: 'image/*', prefix: 'image/', icon: '🖼️', empty: 'Hakuna picha bado' },
    video: { title: 'Video',  accept: 'video/*', prefix: 'video/', icon: '🎬', empty: 'Hakuna video bado' },
    audio: { title: 'Muziki', accept: 'audio/*', prefix: 'audio/', icon: '🎵', empty: 'Hakuna muziki bado' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var content = $('content');
  var fileInput = $('fileInput');
  var addBtn = $('addBtn');
  var selectBar = $('selectBar');

  var te = new TextEncoder();
  var td = new TextDecoder();

  var key = null;
  var tab = 'photo';
  var items = [];
  var urls = [];
  var loadToken = 0;
  var selecting = false;
  var selected = {};

  /* ---------- Zana ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function vibrate(p) {
    if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} }
  }

  function makeId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function fmtSize(b) {
    if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }

  function fmtDur(s) {
    s = Math.round(s || 0);
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  var toastTimer = null;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 4500);
  }

  function showProgress(text, name) {
    $('progress').classList.remove('hidden');
    $('progressText').textContent = text;
    $('progressName').textContent = name || '';
  }

  function hideProgress() {
    $('progress').classList.add('hidden');
  }

  async function encryptJSON(obj) {
    return PPCrypto.encrypt(key, te.encode(JSON.stringify(obj)));
  }

  /* ---------- Thumbnails na muda ---------- */
  async function drawThumb(source, w, h) {
    var max = 320;
    var scale = Math.min(1, max / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
    var blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.72); });
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  }

  async function photoThumb(file) {
    try {
      var bmp = await createImageBitmap(file);
      var t = await drawThumb(bmp, bmp.width, bmp.height);
      if (bmp.close) bmp.close();
      return t;
    } catch (e) {
      return null;
    }
  }

  function videoInfo(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var v = document.createElement('video');
      var dur = 0;
      var done = false;
      var to;

      v.muted = true;
      v.playsInline = true;
      v.preload = 'metadata';

      function finish(thumb) {
        if (done) return;
        done = true;
        clearTimeout(to);
        URL.revokeObjectURL(url);
        v.removeAttribute('src');
        resolve({ duration: dur, thumb: thumb || null });
      }

      v.onloadedmetadata = function () {
        dur = isFinite(v.duration) ? v.duration : 0;
        try { v.currentTime = Math.min(1, (dur / 2) || 0); } catch (e) { finish(null); }
      };
      v.onseeked = function () {
        drawThumb(v, v.videoWidth || 320, v.videoHeight || 320).then(finish, function () { finish(null); });
      };
      v.onerror = function () { finish(null); };
      to = setTimeout(function () { finish(null); }, 10000);
      v.src = url;
    });
  }

  function audioDuration(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var a = new Audio();
      var done = false;
      function finish(d) {
        if (done) return;
        done = true;
        URL.revokeObjectURL(url);
        resolve(d);
      }
      a.preload = 'metadata';
      a.onloadedmetadata = function () { finish(isFinite(a.duration) ? a.duration : 0); };
      a.onerror = function () { finish(0); };
      setTimeout(function () { finish(0); }, 6000);
      a.src = url;
    });
  }

  /* ---------- Kuongeza faili ---------- */
  async function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    if (!files.length) return;

    var t = TABS[tab];
    var ok = 0, skipped = 0, tooBig = 0, failed = 0, full = false;

    window.PPNoLock = true;
    try {
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        showProgress('Inaficha ' + (i + 1) + ' / ' + files.length, f.name);

        if (f.type && f.type.indexOf(t.prefix) !== 0) { skipped++; continue; }
        if (f.size > MAX_FILE_MB * 1048576) { tooBig++; continue; }

        try {
          var duration = 0;
          var thumb = null;

          if (tab === 'photo') {
            thumb = await photoThumb(f);
          } else if (tab === 'video') {
            var vi = await videoInfo(f);
            duration = vi.duration;
            thumb = vi.thumb;
          } else {
            duration = await audioDuration(f);
          }

          var meta = await encryptJSON({ name: f.name, mime: f.type || '', size: f.size, duration: duration });
          var thumbEnc = thumb ? await PPCrypto.encrypt(key, thumb) : null;
          var enc = await PPCrypto.encrypt(key, await f.arrayBuffer());
          var id = makeId();

          await PPDB.add(
            {
              id: id,
              type: tab,
              added: Date.now() + i,
              metaIv: meta.iv,
              meta: meta.data,
              thumbIv: thumbEnc ? thumbEnc.iv : null,
              thumb: thumbEnc ? thumbEnc.data : null
            },
            { id: id, iv: enc.iv, data: enc.data }
          );
          ok++;
        } catch (e) {
          if (e && e.name === 'QuotaExceededError') { full = true; break; }
          failed++;
        }
      }
    } finally {
      window.PPNoLock = false;
      hideProgress();
    }

    await load();

    var parts = [];
    if (ok) parts.push('Zimefichwa: ' + ok + '. Futa asili kwenye gallery ili zibaki siri.');
    if (tooBig) parts.push('Kubwa mno (zaidi ya ' + MAX_FILE_MB + ' MB): ' + tooBig + '.');
    if (skipped) parts.push('Aina isiyofaa: ' + skipped + '.');
    if (failed) parts.push('Zilizoshindwa: ' + failed + '.');
    if (full) parts.push('Nafasi ya simu imejaa.');
    toast(parts.join(' ') || 'Hakuna kilichoongezwa.');
  }

  /* ---------- Kupakia na kuonyesha ---------- */
  function revokeUrls() {
    urls.forEach(function (u) { URL.revokeObjectURL(u); });
    urls = [];
  }

  async function load() {
    var token = ++loadToken;
    var raw = await PPDB.list(tab);
    var out = [];

    for (var i = 0; i < raw.length; i++) {
      var r = raw[i];
      try {
        var m = JSON.parse(td.decode(await PPCrypto.decrypt(key, r.metaIv, r.meta)));
        var url = null;
        if (r.thumb) {
          var tb = await PPCrypto.decrypt(key, r.thumbIv, r.thumb);
          url = URL.createObjectURL(new Blob([tb], { type: 'image/jpeg' }));
        }
        out.push({
          id: r.id, added: r.added,
          name: m.name, size: m.size, duration: m.duration, mime: m.mime,
          thumbUrl: url
        });
      } catch (e) {}
    }

    if (token !== loadToken) {          // tabo ilibadilishwa wakati tunapakia
      out.forEach(function (o) { if (o.thumbUrl) URL.revokeObjectURL(o.thumbUrl); });
      return;
    }

    revokeUrls();
    out.forEach(function (o) { if (o.thumbUrl) urls.push(o.thumbUrl); });
    out.sort(function (a, b) { return b.added - a.added; });
    items = out;
    render();
  }

  function render() {
    var t = TABS[tab];
    $('sectionTitle').textContent = t.title;
    $('sectionCount').textContent = items.length ? items.length + ' faili' : '';
    content.innerHTML = '';
    content.classList.toggle('selecting', selecting);

    if (!items.length) {
      var empty = el('div', 'empty');
      empty.appendChild(el('div', 'big', t.icon));
      empty.appendChild(el('p', '', t.empty));
      empty.appendChild(el('p', 'muted mt-8', 'Bonyeza + kuongeza'));
      content.appendChild(empty);
      return;
    }

    if (tab === 'audio') {
      items.forEach(function (it) {
        var row = el('div', 'list-item audio-item');
        row.setAttribute('data-id', it.id);
        if (selected[it.id]) row.classList.add('selected');

        row.appendChild(el('div', 'audio-icon', '🎵'));
        var info = el('div', 'audio-info');
        info.appendChild(el('div', 'audio-name', it.name));
        info.appendChild(el('div', 'muted', fmtDur(it.duration) + ' · ' + fmtSize(it.size)));
        row.appendChild(info);
        row.appendChild(el('span', 'check', '✓'));
        content.appendChild(row);
      });
      return;
    }

    var grid = el('div', 'photo-grid');
    items.forEach(function (it) {
      var tile = el('div', 'tile');
      tile.setAttribute('data-id', it.id);
      if (selected[it.id]) tile.classList.add('selected');

      if (it.thumbUrl) {
        var img = document.createElement('img');
        img.src = it.thumbUrl;
        img.alt = '';
        img.draggable = false;
        tile.appendChild(img);
      } else {
        tile.appendChild(el('div', 'ph', t.icon));
      }

      if (tab === 'video') {
        tile.appendChild(el('div', 'play', '▶'));
        tile.appendChild(el('div', 'dur', fmtDur(it.duration)));
      }
      tile.appendChild(el('span', 'check', '✓'));
      grid.appendChild(tile);
    });
    content.appendChild(grid);
  }

  /* ---------- Tabo ---------- */
  function setTab(name) {
    if (!TABS[name]) name = 'photo';
    if (selecting) exitSelect();
    tab = name;
    try { history.replaceState(null, '', '#' + name); } catch (e) {}

    var btns = document.querySelectorAll('.bottom-nav [data-tab]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-tab') === name);
    }
    fileInput.accept = TABS[name].accept;
    items = [];
    render();
    load();
  }

  document.querySelector('.bottom-nav').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-tab]');
    if (b) setTab(b.getAttribute('data-tab'));
  });

  /* ---------- Kuchagua na kufuta ---------- */
  function selectedIds() {
    return Object.keys(selected);
  }

  function updateSelectUI() {
    var n = selectedIds().length;
    $('selCount').textContent = n + ' zimechaguliwa';
  }

  function enterSelect() {
    selecting = true;
    selected = {};
    selectBar.classList.remove('hidden');
    addBtn.classList.add('hidden');
    content.classList.add('selecting');
    updateSelectUI();
  }

  function exitSelect() {
    selecting = false;
    selected = {};
    selectBar.classList.add('hidden');
    addBtn.classList.remove('hidden');
    content.classList.remove('selecting');
    var all = content.querySelectorAll('.selected');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('selected');
  }

  function toggleSelect(id) {
    var node = content.querySelector('[data-id="' + id + '"]');
    if (selected[id]) {
      delete selected[id];
      if (node) node.classList.remove('selected');
    } else {
      selected[id] = true;
      if (node) node.classList.add('selected');
    }
    updateSelectUI();
    if (!selectedIds().length) exitSelect();
  }

  $('selCancel').addEventListener('click', exitSelect);

  $('selDelete').addEventListener('click', async function () {
    var ids = selectedIds();
    if (!ids.length) return;
    if (!confirm('Futa faili ' + ids.length + ' kabisa? Hili halirudishwi.')) return;
    try {
      await PPDB.remove(ids);
      toast('Zimefutwa: ' + ids.length);
    } catch (e) {
      toast('Imeshindwa kufuta.');
    }
    exitSelect();
    load();
  });

  /* ---------- Kugusa vitu (bonyeza kawaida = fungua, shikilia = chagua) ---------- */
  var pressTimer = null;
  var longFired = false;
  var startX = 0, startY = 0;

  function cancelPress() {
    clearTimeout(pressTimer);
    pressTimer = null;
  }

  content.addEventListener('pointerdown', function (ev) {
    var node = ev.target.closest('[data-id]');
    if (!node) return;
    longFired = false;
    startX = ev.clientX;
    startY = ev.clientY;
    cancelPress();
    pressTimer = setTimeout(function () {
      longFired = true;
      vibrate(20);
      if (!selecting) enterSelect();
      toggleSelect(node.getAttribute('data-id'));
    }, 450);
  });

  content.addEventListener('pointermove', function (ev) {
    if (pressTimer && (Math.abs(ev.clientX - startX) > 10 || Math.abs(ev.clientY - startY) > 10)) {
      cancelPress();
    }
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
    content.addEventListener(n, cancelPress);
  });

  content.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

  content.addEventListener('click', function (ev) {
    var node = ev.target.closest('[data-id]');
    if (!node) return;
    if (longFired) { longFired = false; return; }
    var id = node.getAttribute('data-id');
    if (selecting) {
      toggleSelect(id);
    } else if (tab === 'audio') {
      location.href = 'player.html?id=' + encodeURIComponent(id);
    } else {
      location.href = 'viewer.html?id=' + encodeURIComponent(id);
    }
  });

  /* ---------- Kitufe cha + ---------- */
  addBtn.addEventListener('click', function () {
    window.PPNoLock = true;                 // usifunge app wakati wa kuchagua faili
    setTimeout(function () { window.PPNoLock = false; }, 180000);
    fileInput.value = '';
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    var files = fileInput.files;
    if (files && files.length) {
      addFiles(files);
    } else {
      window.PPNoLock = false;
    }
  });

  fileInput.addEventListener('cancel', function () { window.PPNoLock = false; });

  /* ---------- Funga app ---------- */
  $('lockBtn').addEventListener('click', function () {
    PPCrypto.lock();
    location.replace('pin.html');
  });

  /* ---------- Kuanza ---------- */
  async function init() {
    try { key = await PPCrypto.getSessionKey(); } catch (e) {}
    if (!key) { location.replace('pin.html'); return; }

    var h = (location.hash || '').replace('#', '');
    setTab(TABS[h] ? h : 'photo');

    // Omba simu isifute data zetu ikijaa nafasi
    if (navigator.storage && navigator.storage.persist) {
      try { navigator.storage.persist(); } catch (e) {}
    }
  }

  init();
})();