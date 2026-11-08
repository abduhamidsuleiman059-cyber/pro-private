/* Pro Private - app.js
   Kazi za pamoja kwa kurasa zote:
   1. Kusajili service worker (ili app ifanye kazi offline na iweze kuinstalliwa)
   2. Kuficha skrini (blur) app ikienda nyuma
   3. Kufunga app kiotomatiki ukiiacha zaidi ya dakika 1 */

(function () {
  'use strict';

  var LOCK_AFTER_MS = 60 * 1000;
  var hiddenAt = 0;
  var onPinPage = /pin\.html$/.test(location.pathname);

  /* 1. Service worker */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        try { reg.update(); } catch (e) {}     // angalia toleo jipya kila app inapofunguka
      }).catch(function () {});
    });
  }

  /* 2 na 3. Faragha */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      hiddenAt = Date.now();
      if (!window.PPNoLock) document.body.classList.add('is-hidden');
      return;
    }

    if (
      hiddenAt &&
      !window.PPNoLock &&
      !onPinPage &&
      window.PPCrypto &&
      Date.now() - hiddenAt > LOCK_AFTER_MS
    ) {
      PPCrypto.lock();
      location.replace('pin.html');
      return;
    }

    document.body.classList.remove('is-hidden');
    hiddenAt = 0;
  });
})();