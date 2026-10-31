/* Pro Private - pin.js
   Ukurasa wa PIN: kuweka PIN mara ya kwanza (na kuirudia), na kuingiza PIN baada ya hapo.
   Ukikosea mara 5 unasubiri sekunde 30, kisha muda unaongezeka. */

(function () {
  'use strict';

  var PIN_LEN = 6;                 // urefu wa PIN mpya
  var MAX_TRIES = 5;
  var VAULT_PAGE = 'vault.html';

  var titleEl = document.getElementById('pinTitle');
  var subEl   = document.getElementById('pinSub');
  var dotsEl  = document.getElementById('pinDots');
  var msgEl   = document.getElementById('pinMsg');
  var padEl   = document.getElementById('pinPad');

  var mode = 'unlock';     // 'unlock' au 'create'
  var step = 'enter';      // 'enter' au 'confirm' (kwa create)
  var len = PIN_LEN;
  var entered = '';
  var firstPin = '';
  var busy = false;
  var lockLeft = 0;
  var timer = null;

  /* ---------- Hifadhi ya majaribio ---------- */
  function getLockLeft() {
    var until = parseInt(localStorage.getItem('pp_lock_until') || '0', 10);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  }

  function registerFail() {
    var f = parseInt(localStorage.getItem('pp_fails') || '0', 10) + 1;
    localStorage.setItem('pp_fails', String(f));
    if (f % MAX_TRIES === 0) {
      var secs = Math.min(3600, 30 * Math.pow(2, f / MAX_TRIES - 1));
      localStorage.setItem('pp_lock_until', String(Date.now() + secs * 1000));
    }
    return f;
  }

  function clearFails() {
    localStorage.removeItem('pp_fails');
    localStorage.removeItem('pp_lock_until');
  }

  /* ---------- UI ---------- */
  function vibrate(p) {
    if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} }
  }

  function showMsg(text, info) {
    msgEl.textContent = text || '';
    msgEl.className = 'pin-msg' + (info ? ' info' : '');
  }

  function buildDots() {
    dotsEl.innerHTML = '';
    for (var i = 0; i < len; i++) {
      var d = document.createElement('span');
      d.className = 'pin-dot';
      dotsEl.appendChild(d);
    }
  }

  function renderDots() {
    var dots = dotsEl.children;
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('filled', i < entered.length);
    }
  }

  function setTexts() {
    if (mode === 'unlock') {
      titleEl.textContent = 'Karibu tena';
      subEl.textContent = 'Ingiza PIN yako';
    } else if (step === 'enter') {
      titleEl.textContent = 'Weka PIN';
      subEl.textContent = 'Chagua PIN ya tarakimu ' + PIN_LEN;
    } else {
      titleEl.textContent = 'Rudia PIN';
      subEl.textContent = 'Weka PIN ile ile tena';
    }
  }

  function setDisabled(on) {
    padEl.classList.toggle('disabled', on);
  }

  function go() {
    location.replace(VAULT_PAGE);
  }

  /* ---------- Makosa ---------- */
  function fail(text) {
    busy = true;
    dotsEl.classList.add('shake', 'error');
    vibrate([60, 40, 60]);
    showMsg(text);
    setTimeout(function () {
      dotsEl.classList.remove('shake', 'error');
      entered = '';
      renderDots();
      busy = false;
    }, 450);
  }

  /* ---------- Kusubiri baada ya kukosea mara nyingi ---------- */
  function startLockCountdown() {
    lockLeft = getLockLeft();
    if (lockLeft <= 0) { setDisabled(false); return; }
    setDisabled(true);
    showMsg('Umekosea mara nyingi. Subiri sekunde ' + lockLeft + '...');
    clearInterval(timer);
    timer = setInterval(function () {
      lockLeft = getLockLeft();
      if (lockLeft <= 0) {
        clearInterval(timer);
        setDisabled(false);
        showMsg('Unaweza kujaribu tena.', true);
      } else {
        showMsg('Umekosea mara nyingi. Subiri sekunde ' + lockLeft + '...');
      }
    }, 1000);
  }

  /* ---------- Kutuma PIN ---------- */
  async function submit() {
    var pin = entered;

    try {
      if (mode === 'unlock') {
        var key = await PPCrypto.verifyPin(pin);
        if (key) {
          clearFails();
          vibrate(15);
          go();
          return;
        }
        var f = registerFail();
        if (f % MAX_TRIES === 0) {
          fail('PIN si sahihi.');
          setTimeout(startLockCountdown, 480);
        } else {
          fail('PIN si sahihi. Majaribio yaliyobaki: ' + (MAX_TRIES - (f % MAX_TRIES)));
        }
        return;
      }

      // mode === 'create'
      if (step === 'enter') {
        firstPin = pin;
        step = 'confirm';
        entered = '';
        renderDots();
        setTexts();
        showMsg('');
        busy = false;
        return;
      }

      // step === 'confirm'
      if (pin === firstPin) {
        await PPCrypto.setupPin(pin);
        vibrate(15);
        go();
        return;
      }
      firstPin = '';
      step = 'enter';
      setTexts();
      fail('PIN hazifanani. Anza tena.');

    } catch (e) {
      fail('Hitilafu imetokea. Jaribu tena.');
    }
  }

  /* ---------- Vitufe ---------- */
  function press(d) {
    if (busy || lockLeft > 0) return;
    if (entered.length >= len) return;
    entered += d;
    vibrate(8);
    renderDots();
    if (mode === 'unlock' || step === 'confirm') showMsg('');
    if (entered.length === len) {
      busy = true;
      setTimeout(submit, 120);
    }
  }

  function del() {
    if (busy || lockLeft > 0) return;
    entered = entered.slice(0, -1);
    renderDots();
  }

  padEl.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-key]');
    if (!btn) return;
    var k = btn.getAttribute('data-key');
    if (k === 'del') del(); else press(k);
  });

  // Kibodi ya kompyuta (kwa kujaribu)
  document.addEventListener('keydown', function (ev) {
    if (ev.key >= '0' && ev.key <= '9') press(ev.key);
    else if (ev.key === 'Backspace') del();
  });

  /* ---------- Kuanza ---------- */
  function start() {
    if (PPCrypto.hasPin()) {
      mode = 'unlock';
      len = PPCrypto.getPinLength() || PIN_LEN;
    } else {
      mode = 'create';
      step = 'enter';
      len = PIN_LEN;
    }
    buildDots();
    setTexts();

    if (mode === 'create') {
      showMsg('Ukisahau PIN, faili zako hazipatikani tena.', true);
    } else {
      startLockCountdown();
    }
  }

  function init() {
    if (!window.crypto || !window.crypto.subtle) {
      titleEl.textContent = 'Haiwezi kufunguka';
      subEl.textContent = '';
      showMsg('Fungua app kupitia https au localhost (si file://).');
      setDisabled(true);
      return;
    }

    if (PPCrypto.hasPin()) {
      PPCrypto.getSessionKey().then(function (k) {
        if (k) go(); else start();
      }, start);
    } else {
      start();
    }
  }

  init();
})();