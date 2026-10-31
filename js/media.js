/* Pro Private - media.js
   Zana za pamoja: kupakia faili lililofungwa, orodha ya ids, kurudisha kwenye simu, toast. */

(function () {
  'use strict';

  var td = new TextDecoder();
  var DEFAULT_MIME = { photo: 'image/jpeg', video: 'video/mp4', audio: 'audio/mpeg' };

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  async function requireKey() {
    var k = null;
    try { k = await PPCrypto.getSessionKey(); } catch (e) {}
    if (!k) { location.replace('pin.html'); return null; }
    return k;
  }

  // Ids za aina moja, mpya kwanza (mpangilio ule ule wa vault)
  async function listIds(type) {
    var raw = await PPDB.list(type);
    raw.sort(function (a, b) { return b.added - a.added; });
    return raw.map(function (r) { return r.id; });
  }

  // Inarudisha { item, meta, blob } au null
  async function load(key, id) {
    var item = await PPDB.getItem(id);
    if (!item) return null;
    var rec = await PPDB.getBlob(id);
    if (!rec) return null;

    var meta = JSON.parse(td.decode(await PPCrypto.decrypt(key, item.metaIv, item.meta)));
    var buf = await PPCrypto.decrypt(key, rec.iv, rec.data);
    var blob = new Blob([buf], { type: meta.mime || DEFAULT_MIME[item.type] });
    return { item: item, meta: meta, blob: blob };
  }

  // Rudisha faili kwenye simu: Share (Save to Gallery) au Download
  async function saveToPhone(blob, name) {
    window.PPNoLock = true;
    try {
      var file = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: name });
          return 'share';
        } catch (e) {
          if (e && e.name === 'AbortError') return 'cancel';
        }
      }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      return 'download';
    } finally {
      setTimeout(function () { window.PPNoLock = false; }, 1500);
    }
  }

  var toastTimer = null;
  function toast(text) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3500);
  }

  window.PPMedia = {
    param: param,
    requireKey: requireKey,
    listIds: listIds,
    load: load,
    saveToPhone: saveToPhone,
    toast: toast
  };
})();