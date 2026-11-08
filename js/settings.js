/* Pro Private - settings.js
   Sakinisha app, badili PIN, nakala (backup), hifadhi, futa data zote. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var key = null;
  var importFile = null;

  /* ---------- Zana ---------- */
  var toastTimer = null;
  function toast(text) {
    var t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 4500);
  }

  function showProgress(text) {
    $('progress').classList.remove('hidden');
    $('progressText').textContent = text;
  }

  function hideProgress() {
    $('progress').classList.add('hidden');
  }

  function fmtSize(b) {
    if (!b) return '0 KB';
    if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / 1048576).toFixed(1) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }

  function validPin(v) {
    return /^\d{4,8}$/.test(v);
  }

  /* ---------- Taarifa za hifadhi ---------- */
  async function refreshInfo() {
    await refreshCounts();
    await refreshUsage();
  }

  // Idadi ya faili kwa kila aina
  async function refreshCounts() {
    try {
      var all = await PPDB.list();
      var c = { photo: 0, video: 0, audio: 0 };
      all.forEach(function (it) { if (c[it.type] !== undefined) c[it.type]++; });
      $('infoCount').textContent = 'Picha ' + c.photo + ' · Video ' + c.video + ' · Muziki ' + c.audio;
    } catch (e) {
      $('infoCount').textContent = 'Imeshindwa kusoma hifadhi.';
    }
  }

  // Jumla ya ukubwa wa faili zako + nafasi iliyobaki
  async function refreshUsage() {
    try {
      var tdec = new TextDecoder();
      var list = await PPDB.list();
      var total = 0;
      for (var i = 0; i < list.length; i++) {
        try {
          var mm = JSON.parse(tdec.decode(await PPCrypto.decrypt(key, list[i].metaIv, list[i].meta)));
          total += mm.size || 0;
        } catch (e) {}
      }

      var line = 'Faili zako: ' + fmtSize(total) + '.';
      var pct = 0;

      if (navigator.storage && navigator.storage.estimate) {
        var est = await navigator.storage.estimate();
        if (est && est.quota) {
          var left = Math.max(0, est.quota - est.usage);
          line += ' Nafasi iliyotumika na app: ' + fmtSize(est.usage) + '. Imebaki ~ ' + Math.round(left / 1048576).toLocaleString('en-US') + ' MB.';
          pct = Math.min(100, (est.usage / est.quota) * 100);
        }
      }

      $('infoStorage').textContent = line;
      var fill = $('usageFill');
      if (fill) fill.style.width = Math.max(pct, total ? 2 : 0) + '%';
    } catch (e) {}
  }

  /* ---------- Funga app ---------- */
  $('lockBtn').addEventListener('click', function () {
    PPCrypto.lock();
    location.replace('pin.html');
  });

  /* ---------- Badili PIN ---------- */
  $('pinForm').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var oldP = $('oldPin').value;
    var newP = $('newPin').value;
    var conf = $('confPin').value;

    if (!oldP) { toast('Weka PIN ya sasa.'); return; }
    if (!validPin(newP)) { toast('PIN mpya iwe tarakimu 4 hadi 8.'); return; }
    if (newP !== conf) { toast('PIN mpya hazifanani.'); return; }

    showProgress('Inabadili PIN...');
    var ok = false;
    try { ok = await PPCrypto.changePin(oldP, newP); } catch (e) {}
    hideProgress();

    if (!ok) { toast('PIN ya sasa si sahihi.'); return; }

    $('oldPin').value = '';
    $('newPin').value = '';
    $('confPin').value = '';
    toast('PIN imebadilishwa. Tumia PIN mpya wakati ujao.');
  });

  /* ---------- Tengeneza nakala ---------- */
  $('exportBtn').addEventListener('click', async function () {
    window.PPNoLock = true;
    showProgress('Inatengeneza nakala...');
    try {
      var blob = await PPBackup.exportAll(function (i, n) {
        showProgress('Inatengeneza nakala ' + i + ' / ' + n);
      });
      if (!blob) {
        toast('Hakuna faili za kuhifadhi bado.');
      } else {
        PPBackup.download(blob);
        toast('Nakala imetengenezwa. Ihifadhi mahali salama.');
      }
    } catch (e) {
      toast('Imeshindwa kutengeneza nakala. Huenda nafasi haitoshi.');
    } finally {
      hideProgress();
      setTimeout(function () { window.PPNoLock = false; }, 1500);
    }
  });

  /* ---------- Rudisha nakala ---------- */
  $('importBtn').addEventListener('click', function () {
    window.PPNoLock = true;
    setTimeout(function () { window.PPNoLock = false; }, 180000);
    $('importInput').value = '';
    $('importInput').click();
  });

  $('importInput').addEventListener('change', function () {
    window.PPNoLock = false;
    var f = this.files && this.files[0];
    if (!f) return;
    importFile = f;
    $('importName').textContent = 'Faili: ' + f.name + ' (' + fmtSize(f.size) + ')';
    $('importForm').classList.remove('hidden');
    $('importPin').value = '';
    $('importPin').focus();
  });

  $('importInput').addEventListener('cancel', function () { window.PPNoLock = false; });

  $('importForm').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var pin = $('importPin').value;
    if (!importFile) { toast('Chagua faili la nakala kwanza.'); return; }
    if (!pin) { toast('Weka PIN ya nakala hiyo.'); return; }

    window.PPNoLock = true;
    showProgress('Inarudisha...');
    var res = null;
    try {
      res = await PPBackup.importFile(importFile, pin, key, function (i, n) {
        showProgress('Inarudisha ' + i + ' / ' + n);
      });
    } catch (e) {
      res = { ok: false, reason: 'error', err: String((e && e.message) || e) };
    }
    hideProgress();
    window.PPNoLock = false;

    if (!res.ok) {
      if (res.reason === 'pin') toast('PIN ya nakala hiyo si sahihi.');
      else if (res.reason === 'format') toast('Hili si faili sahihi la nakala ya Pro Private.');
      else toast('Imeshindwa kurudisha nakala: ' + (res.err || ''));
      return;
    }

    $('importForm').classList.add('hidden');
    $('importPin').value = '';
    importFile = null;

    var parts = ['Zimerudishwa: ' + res.added + '.'];
    if (res.skipped) parts.push('Zilizokuwepo tayari: ' + res.skipped + '.');
    if (res.failed) parts.push('Zilizoshindwa: ' + res.failed + ' (' + (res.err || 'sababu haijulikani') + ').');
    toast(parts.join(' '));
    refreshInfo();
  });

  /* ---------- Futa data zote ---------- */
  $('wipeForm').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var pin = $('wipePin').value;
    if (!pin) { toast('Weka PIN yako kuthibitisha.'); return; }

    var k = null;
    try { k = await PPCrypto.verifyPin(pin); } catch (e) {}
    if (!k) { toast('PIN si sahihi.'); return; }

    if (!confirm('Futa faili zote na PIN kabisa? Hili halirudishwi.')) return;

    try {
      await PPDB.clearAll();
    } catch (e) {
      toast('Imeshindwa kufuta.');
      return;
    }
    PPCrypto.wipe();
    location.replace('pin.html');
  });

  /* ---------- Sakinisha kama App ---------- */
  var deferredInstall = null;
  var installBtn = $('installBtn');
  var installHint = $('installHint');

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function updateInstallUI() {
    if (isStandalone()) {
      installBtn.classList.add('hidden');
      installHint.textContent = 'Tayari umesakinisha Pro Private kama app. ✅';
      return;
    }
    installBtn.classList.remove('hidden');
    if (isIOS()) {
      installHint.textContent = 'iPhone: bonyeza kitufe cha Share kwenye Safari, kisha "Add to Home Screen".';
    } else if (deferredInstall) {
      installHint.textContent = 'Itaingia kwenye orodha ya apps zako na kufunguka bila address bar ya browser.';
    } else {
      installHint.textContent = 'Bonyeza kitufe hapa chini. Kama hakitoi dirisha, tumia menyu ya browser (⋮) kisha "Install app" au "Add to Home screen".';
    }
  }

  window.addEventListener('beforeinstallprompt', function (ev) {
    ev.preventDefault();
    deferredInstall = ev;
    updateInstallUI();
  });

  window.addEventListener('appinstalled', function () {
    deferredInstall = null;
    toast('Pro Private imesakinishwa kama app.');
    updateInstallUI();
  });

  installBtn.addEventListener('click', async function () {
    if (!deferredInstall) {
      toast(isIOS() ? 'Tumia Share → Add to Home Screen.' : 'Tumia menyu ya browser (⋮) → Install app.');
      return;
    }
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) {}
    deferredInstall = null;
    updateInstallUI();
  });

  updateInstallUI();

  /* ---------- Offline: hali na kusasisha ---------- */
  var offlineStatus = $('offlineStatus');

  function askWorker(reg) {
    return new Promise(function (resolve) {
      var worker = reg.active;
      if (!worker) { resolve(null); return; }
      var ch = new MessageChannel();
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 3000);
      ch.port1.onmessage = function (ev) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(ev.data);
      };
      try { worker.postMessage({ type: 'status' }, [ch.port2]); }
      catch (e) { done = true; clearTimeout(timer); resolve(null); }
    });
  }

  async function refreshOffline(attempt) {
    attempt = attempt || 0;
    if (!('serviceWorker' in navigator)) {
      offlineStatus.textContent = 'Browser hii haiungi offline.';
      return;
    }

    var reg = null;
    try { reg = await navigator.serviceWorker.getRegistration(); } catch (e) {}

    var st = null;
    if (reg && reg.active) st = await askWorker(reg);

    // Bado inajiandaa: subiri kidogo kisha angalia tena
    var updating = !!(reg && (reg.installing || reg.waiting));
    var preparing = updating || (!reg || !reg.active) || (st && st.cached < st.total);
    if (preparing && attempt < 12 && navigator.onLine) {
      offlineStatus.textContent = 'Inajiandaa offline... tafadhali subiri.';
      setTimeout(function () { refreshOffline(attempt + 1); }, 1500);
      return;
    }

    if (!reg || !reg.active) {
      offlineStatus.textContent = 'Offline bado haijawashwa. Unganisha mtandao, kisha bonyeza "Sasisha app".';
    } else if (!st) {
      offlineStatus.textContent = 'Toleo la zamani la offline linatumika. Unganisha mtandao kisha bonyeza "Sasisha app".';
    } else if (st.cached === st.total) {
      offlineStatus.textContent = 'Offline iko tayari ✅ (' + st.version + ', faili ' + st.cached + '/' + st.total + ').';
    } else {
      offlineStatus.textContent = 'Offline haijakamilika (' + st.cached + '/' + st.total + '). Unganisha mtandao kisha bonyeza "Sasisha app".';
    }
  }

  $('refreshAppBtn').addEventListener('click', async function () {
    if (!('serviceWorker' in navigator)) { toast('Browser hii haiungi offline.'); return; }

    // Hakikisha mtandao upo kabla ya kufuta nakala za zamani
    var online = false;
    try {
      var r = await fetch('sw.js', { cache: 'no-store' });
      online = r && r.ok;
    } catch (e) {}
    if (!online) { toast('Unganisha mtandao kwanza, kisha jaribu tena.'); return; }

    showProgress('Inasasisha app...');
    try {
      var regs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < regs.length; i++) await regs[i].unregister();

      var names = await caches.keys();
      for (var j = 0; j < names.length; j++) {
        if (names[j].indexOf('pro-private-') === 0) await caches.delete(names[j]);
      }
    } catch (e) {
      hideProgress();
      toast('Imeshindwa kusasisha. Jaribu tena ukiwa na mtandao mzuri.');
      return;
    }

    // Pakia ukurasa upya kutoka mtandaoni: service worker mpya inasajiliwa na kuhifadhi faili zote
    location.reload();
  });

  /* ---------- Kuanza ---------- */
  async function init() {
    try { key = await PPCrypto.getSessionKey(); } catch (e) {}
    if (!key) { location.replace('pin.html'); return; }
    refreshInfo();
    refreshOffline();
  }

  init();
})();