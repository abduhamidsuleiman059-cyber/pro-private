/* Pro Private - backup.js
   Nakala ya faili zote (zikiwa bado zimefungwa) kwenye faili moja: .ppbak
   Kurudisha: inahitaji PIN ya nakala hiyo, kisha kila faili linafungwa upya
   kwa ufunguo wa simu ya sasa. */

(function () {
  'use strict';

  var MAGIC = 'PPBACKUP1';
  var te = new TextEncoder();
  var td = new TextDecoder();

  function u32(n) {
    var b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n, false);
    return b;
  }

  function dateStamp() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ---------- Kutengeneza nakala ---------- */
  async function exportAll(onProgress) {
    var items = await PPDB.list();
    if (!items.length) return null;

    var info = PPCrypto.getWrapInfo();
    var hdr = te.encode(JSON.stringify({
      v: 1,
      created: Date.now(),
      count: items.length,
      salt: info.salt,
      wrap: info.wrap,
      len: info.len
    }));

    var parts = [te.encode(MAGIC), u32(hdr.length), hdr];

    for (var i = 0; i < items.length; i++) {
      if (onProgress) onProgress(i + 1, items.length);
      var it = items[i];
      var rec = await PPDB.getBlob(it.id);
      if (!rec) continue;

      var json = te.encode(JSON.stringify({
        id: it.id,
        type: it.type,
        added: it.added,
        metaIv: PPCrypto.toB64(it.metaIv),
        meta: PPCrypto.toB64(it.meta),
        thumbIv: it.thumbIv ? PPCrypto.toB64(it.thumbIv) : null,
        thumb: it.thumb ? PPCrypto.toB64(it.thumb) : null,
        blobIv: PPCrypto.toB64(rec.iv),
        blobLen: rec.data.byteLength
      }));

      parts.push(u32(json.length), json, rec.data);
    }

    return new Blob(parts, { type: 'application/octet-stream' });
  }

  function download(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'pro-private-nakala-' + dateStamp() + '.ppbak';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  /* ---------- Kurudisha nakala ---------- */
  // Inarudisha { ok, reason?, added, skipped, failed, err }
  async function importFile(file, backupPin, currentKey, onProgress) {
    var pos = 0;

    async function read(n) {
      var buf = new Uint8Array(await file.slice(pos, pos + n).arrayBuffer());
      if (buf.length < n) throw new Error('short');
      pos += n;
      return buf;
    }

    async function readU32() {
      return new DataView((await read(4)).buffer).getUint32(0, false);
    }

    var magic;
    try { magic = td.decode(await read(MAGIC.length)); } catch (e) { return { ok: false, reason: 'format' }; }
    if (magic !== MAGIC) return { ok: false, reason: 'format' };

    var hdr;
    try { hdr = JSON.parse(td.decode(await read(await readU32()))); } catch (e) { return { ok: false, reason: 'format' }; }

    var bkey = await PPCrypto.unwrapFromInfo(hdr, backupPin);
    if (!bkey) return { ok: false, reason: 'pin' };

    var added = 0, skipped = 0, failed = 0, lastErr = '';
    var fromB64 = PPCrypto.fromB64;

    for (var i = 0; i < hdr.count; i++) {
      if (onProgress) onProgress(i + 1, hdr.count);

      var m, data;
      try {
        m = JSON.parse(td.decode(await read(await readU32())));
        data = await read(m.blobLen);
      } catch (e) {
        failed += hdr.count - i;        // faili limekatika, hatuwezi kuendelea
        lastErr = 'Faili la nakala limekatika.';
        break;
      }

      try {
        if (await PPDB.getItem(m.id)) { skipped++; continue; }

        var metaPlain = await PPCrypto.decrypt(bkey, fromB64(m.metaIv), fromB64(m.meta));
        var newMeta = await PPCrypto.encrypt(currentKey, metaPlain);

        var newThumb = null;
        if (m.thumb) {
          var thumbPlain = await PPCrypto.decrypt(bkey, fromB64(m.thumbIv), fromB64(m.thumb));
          newThumb = await PPCrypto.encrypt(currentKey, thumbPlain);
        }

        var plain = await PPCrypto.decrypt(bkey, fromB64(m.blobIv), data);
        var newBlob = await PPCrypto.encrypt(currentKey, plain);

        await PPDB.add(
          {
            id: m.id,
            type: m.type,
            added: m.added,
            metaIv: newMeta.iv,
            meta: newMeta.data,
            thumbIv: newThumb ? newThumb.iv : null,
            thumb: newThumb ? newThumb.data : null
          },
          { id: m.id, iv: newBlob.iv, data: newBlob.data }
        );
        added++;
      } catch (e) {
        failed++;
        lastErr = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));
      }
    }

    return { ok: true, added: added, skipped: skipped, failed: failed, err: lastErr };
  }

  window.PPBackup = {
    exportAll: exportAll,
    download: download,
    importFile: importFile
  };
})();