/* Pro Private - crypto.js
   Encryption ya kweli kwa PIN (AES-GCM 256, ufunguo unatoka kwenye PIN kwa PBKDF2).
   PIN yenyewe haihifadhiwi popote. Tunahifadhi "kipimo" kilichofungwa kwa ufunguo,
   na PIN sahihi tu ndiyo inaweza kukifungua.

   Muhimu: inafanya kazi kwenye https au localhost tu (si file://). */

(function () {
  'use strict';

  var ITERATIONS = 200000;
  var CHECK_TEXT = 'pro-private-ok';

  var K_SALT  = 'pp_salt';
  var K_CHECK = 'pp_check';
  var K_LEN   = 'pp_len';
  var K_SESSION = 'pp_key';   // sessionStorage: inapotea app ikifungwa

  var enc = new TextEncoder();
  var dec = new TextDecoder();

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

  /* ---------- Ufunguo kutoka kwenye PIN ---------- */
  async function deriveKey(pin, saltBytes) {
    var base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /* ---------- Funga / fungua data (kwa faili baadaye) ---------- */
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

  /* ---------- Session (ufunguo unabaki wakati app iko wazi) ---------- */
  async function saveSession(key) {
    var raw = await crypto.subtle.exportKey('raw', key);
    sessionStorage.setItem(K_SESSION, toB64(raw));
  }

  async function getSessionKey() {
    var s = sessionStorage.getItem(K_SESSION);
    if (!s) return null;
    try {
      return await crypto.subtle.importKey('raw', fromB64(s), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
    } catch (e) {
      return null;
    }
  }

  function lock() {
    sessionStorage.removeItem(K_SESSION);
  }

  /* ---------- PIN ---------- */
  function hasPin() {
    return localStorage.getItem(K_CHECK) !== null && localStorage.getItem(K_SALT) !== null;
  }

  function getPinLength() {
    return parseInt(localStorage.getItem(K_LEN) || '0', 10);
  }

  async function setupPin(pin) {
    var salt = random(16);
    var key = await deriveKey(pin, salt);
    var e = await encrypt(key, enc.encode(CHECK_TEXT));

    localStorage.setItem(K_SALT, toB64(salt));
    localStorage.setItem(K_CHECK, JSON.stringify({ iv: toB64(e.iv), data: toB64(e.data) }));
    localStorage.setItem(K_LEN, String(pin.length));

    await saveSession(key);
    return key;
  }

  // Inarudisha ufunguo kama PIN ni sahihi, vinginevyo null
  async function verifyPin(pin) {
    var salt = fromB64(localStorage.getItem(K_SALT));
    var chk = JSON.parse(localStorage.getItem(K_CHECK));
    var key = await deriveKey(pin, salt);
    try {
      var out = await decrypt(key, fromB64(chk.iv), fromB64(chk.data));
      if (dec.decode(out) === CHECK_TEXT) {
        await saveSession(key);
        return key;
      }
    } catch (e) {}
    return null;
  }

  window.PPCrypto = {
    hasPin: hasPin,
    getPinLength: getPinLength,
    setupPin: setupPin,
    verifyPin: verifyPin,
    getSessionKey: getSessionKey,
    lock: lock,
    encrypt: encrypt,
    decrypt: decrypt
  };
})();