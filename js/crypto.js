/* Pro Private - crypto.js (toleo la 2)
   - Faili zote zinafungwa kwa UFUNGUO MKUU wa nasibu (AES-GCM 256).
   - Ufunguo mkuu unafungwa kwa PIN (PBKDF2) na kuhifadhiwa. PIN yenyewe haihifadhiwi.
   - Kubadili PIN = kufunga upya ufunguo mkuu tu, faili hazigusiwi.
   Inafanya kazi kwenye https au localhost tu (si file://). */

(function () {
  'use strict';

  var ITERATIONS = 200000;
  var K_SALT = 'pp_salt';
  var K_WRAP = 'pp_wrap';
  var K_LEN = 'pp_len';
  var K_SESSION = 'pp_key';      // sessionStorage: inapotea app ikifungwa

  var enc = new TextEncoder();

  /* ---------- Zana ndogo ---------- */
  function toB64(buf) {
    var bytes = new Uint8Array(buf);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function fromB64(str) {
    var s = atob(str);
    var bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  }

  function random(n) {
    return crypto.getRandomValues(new Uint8Array(n));
  }

  /* ---------- Funga / fungua data ---------- */
  // data: ArrayBuffer au Uint8Array. Inarudisha { iv, data } (zote Uint8Array)
  async function encrypt(key, data) {
    var iv = random(12);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data);
    return { iv: iv, data: new Uint8Array(ct) };
  }

  // Inarudisha ArrayBuffer
  async function decrypt(key, iv, data) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
  }

  /* ---------- PIN -> ufunguo wa kufunga ufunguo mkuu ---------- */
  async function pinKey(pin, saltBytes) {
    var base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function importMaster(raw) {
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  }

  async function wrapMaster(master, pin, saltBytes) {
    var pk = await pinKey(pin, saltBytes);
    var raw = await crypto.subtle.exportKey('raw', master);
    var e = await encrypt(pk, raw);
    return { iv: toB64(e.iv), data: toB64(e.data) };
  }

  // Inarudisha ufunguo mkuu kama PIN ni sahihi, vinginevyo null
  async function unwrapMaster(wrap, pin, saltBytes) {
    try {
      var pk = await pinKey(pin, saltBytes);
      var raw = await decrypt(pk, fromB64(wrap.iv), fromB64(wrap.data));
      return await importMaster(raw);
    } catch (e) {
      return null;
    }
  }

  /* ---------- Session ---------- */
  async function saveSession(master) {
    var raw = await crypto.subtle.exportKey('raw', master);
    sessionStorage.setItem(K_SESSION, toB64(raw));
  }

  async function getSessionKey() {
    var s = sessionStorage.getItem(K_SESSION);
    if (!s) return null;
    try {
      return await importMaster(fromB64(s));
    } catch (e) {
      return null;
    }
  }

  function lock() {
    sessionStorage.removeItem(K_SESSION);
  }

  /* ---------- PIN ---------- */
  function hasPin() {
    return localStorage.getItem(K_WRAP) !== null && localStorage.getItem(K_SALT) !== null;
  }

  function getPinLength() {
    return parseInt(localStorage.getItem(K_LEN) || '0', 10);
  }

  async function setupPin(pin) {
    var salt = random(16);
    var master = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    var wrap = await wrapMaster(master, pin, salt);

    localStorage.setItem(K_SALT, toB64(salt));
    localStorage.setItem(K_WRAP, JSON.stringify(wrap));
    localStorage.setItem(K_LEN, String(pin.length));

    await saveSession(master);
    return master;
  }

  async function verifyPin(pin) {
    var salt = fromB64(localStorage.getItem(K_SALT));
    var wrap = JSON.parse(localStorage.getItem(K_WRAP));
    var master = await unwrapMaster(wrap, pin, salt);
    if (!master) return null;
    await saveSession(master);
    return master;
  }

  // Badili PIN: inarudisha true kama PIN ya zamani ni sahihi
  async function changePin(oldPin, newPin) {
    var salt = fromB64(localStorage.getItem(K_SALT));
    var wrap = JSON.parse(localStorage.getItem(K_WRAP));
    var master = await unwrapMaster(wrap, oldPin, salt);
    if (!master) return false;

    var newSalt = random(16);
    var newWrap = await wrapMaster(master, newPin, newSalt);

    localStorage.setItem(K_SALT, toB64(newSalt));
    localStorage.setItem(K_WRAP, JSON.stringify(newWrap));
    localStorage.setItem(K_LEN, String(newPin.length));
    await saveSession(master);
    return true;
  }

  /* ---------- Kwa backup ---------- */
  function getWrapInfo() {
    return {
      salt: localStorage.getItem(K_SALT),
      wrap: JSON.parse(localStorage.getItem(K_WRAP)),
      len: getPinLength()
    };
  }

  // info = { salt, wrap } kutoka kwenye faili la backup
  function unwrapFromInfo(info, pin) {
    return unwrapMaster(info.wrap, pin, fromB64(info.salt));
  }

  // Futa kila kitu cha PIN na session (data ya faili inafutwa na PPDB.clearAll)
  function wipe() {
    ['pp_salt', 'pp_wrap', 'pp_len', 'pp_check', 'pp_fails', 'pp_lock_until'].forEach(function (k) {
      localStorage.removeItem(k);
    });
    sessionStorage.removeItem(K_SESSION);
  }

  window.PPCrypto = {
    hasPin: hasPin,
    getPinLength: getPinLength,
    setupPin: setupPin,
    verifyPin: verifyPin,
    changePin: changePin,
    getSessionKey: getSessionKey,
    lock: lock,
    wipe: wipe,
    encrypt: encrypt,
    decrypt: decrypt,
    getWrapInfo: getWrapInfo,
    unwrapFromInfo: unwrapFromInfo,
    toB64: toB64,
    fromB64: fromB64
  };
})();