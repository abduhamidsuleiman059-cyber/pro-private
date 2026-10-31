/* Pro Private - player.js
   Music player: cheza, simamisha, inayofuata/iliyotangulia, shuffle, repeat,
   na vitufe vya lock screen (Media Session). Muziki unaendelea hata skrini ikizimwa. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var audio = $('audio');
  var seek = $('seek');
  var playBtn = $('playBtn');

  var key = null;
  var ids = [];
  var index = 0;
  var cur = null;
  var curUrl = null;
  var token = 0;
  var seeking = false;
  var shuffle = false;
  var repeat = 0;                     // 0 = zima, 1 = zote, 2 = wimbo mmoja
  var REPEAT_ICONS = ['🔁', '🔁', '🔂'];

  function fmt(s) {
    s = Math.max(0, Math.round(s || 0));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function duration() {
    if (isFinite(audio.duration) && audio.duration > 0) return audio.duration;
    return (cur && cur.meta.duration) || 0;
  }

  function setPlayingUI() {
    var playing = !audio.paused;
    playBtn.textContent = playing ? '⏸' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Simamisha' : 'Cheza');
    window.PPNoLock = playing;        // muziki ukicheza, usifunge app
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }

  function updateProgress() {
    if (seeking) return;
    var d = duration();
    seek.value = d ? Math.min(1000, (audio.currentTime / d) * 1000) : 0;
    $('tCur').textContent = fmt(audio.currentTime);
  }

  /* ---------- Kupakia wimbo ---------- */
  async function loadTrack(i, autoplay) {
    var my = ++token;
    index = i;
    audio.pause();
    $('trackTitle').textContent = 'Inapakia...';

    var data = null;
    try { data = await PPMedia.load(key, ids[i]); } catch (e) {}
    if (my !== token) return;

    if (!data) {
      $('trackTitle').textContent = 'Faili halipatikani';
      return;
    }

    if (curUrl) URL.revokeObjectURL(curUrl);
    cur = data;
    curUrl = URL.createObjectURL(data.blob);
    audio.src = curUrl;

    $('trackTitle').textContent = data.meta.name;
    $('trackCount').textContent = (i + 1) + ' / ' + ids.length;
    $('tDur').textContent = fmt(data.meta.duration);
    $('tCur').textContent = '0:00';
    seek.value = 0;

    try { history.replaceState(null, '', '?id=' + encodeURIComponent(ids[i])); } catch (e) {}

    if ('mediaSession' in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: data.meta.name, artist: 'Pro Private' });
    }

    if (autoplay) {
      try { await audio.play(); } catch (e) {}   // simu ikikataa autoplay, mtu abonyeze ▶
    }
    setPlayingUI();
  }

  /* ---------- Kuruka nyimbo ---------- */
  function pickNext() {
    if (shuffle && ids.length > 1) {
      var n;
      do { n = Math.floor(Math.random() * ids.length); } while (n === index);
      return n;
    }
    var nx = index + 1;
    if (nx >= ids.length) return repeat === 1 ? 0 : -1;
    return nx;
  }

  function next(auto) {
    var n = pickNext();
    if (n < 0) {
      if (auto) { audio.currentTime = 0; setPlayingUI(); return; }
      n = 0;
    }
    loadTrack(n, true);
  }

  function prev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    var n = index - 1;
    if (n < 0) n = ids.length - 1;
    loadTrack(n, true);
  }

  function togglePlay() {
    if (!cur) return;
    if (audio.paused) { audio.play().catch(function () {}); }
    else { audio.pause(); }
  }

  /* ---------- Matukio ya audio ---------- */
  audio.addEventListener('play', setPlayingUI);
  audio.addEventListener('pause', setPlayingUI);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', function () {
    $('tDur').textContent = fmt(duration());
  });
  audio.addEventListener('ended', function () {
    if (repeat === 2) { audio.currentTime = 0; audio.play().catch(function () {}); }
    else { next(true); }
  });

  /* ---------- Seek ---------- */
  seek.addEventListener('input', function () {
    seeking = true;
    $('tCur').textContent = fmt((seek.value / 1000) * duration());
  });

  seek.addEventListener('change', function () {
    var d = duration();
    if (d > 0) audio.currentTime = (seek.value / 1000) * d;
    seeking = false;
  });

  /* ---------- Vitufe ---------- */
  playBtn.addEventListener('click', togglePlay);
  $('nextBtn').addEventListener('click', function () { next(false); });
  $('prevBtn').addEventListener('click', prev);

  $('shuffleBtn').addEventListener('click', function () {
    shuffle = !shuffle;
    this.classList.toggle('on', shuffle);
  });

  $('repeatBtn').addEventListener('click', function () {
    repeat = (repeat + 1) % 3;
    this.textContent = REPEAT_ICONS[repeat];
    this.classList.toggle('on', repeat > 0);
  });

  $('backBtn').addEventListener('click', function () {
    location.href = 'vault.html#audio';
  });

  $('saveBtn').addEventListener('click', async function () {
    if (!cur) return;
    var r = await PPMedia.saveToPhone(cur.blob, cur.meta.name);
    if (r === 'share') PPMedia.toast('Chagua mahali pa kuhifadhi kwenye simu.');
    else if (r === 'download') PPMedia.toast('Imehifadhiwa kwenye folder la Downloads.');
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.code === 'Space') { ev.preventDefault(); togglePlay(); }
    else if (ev.key === 'ArrowRight') next(false);
    else if (ev.key === 'ArrowLeft') prev();
  });

  /* ---------- Vitufe vya lock screen ---------- */
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    var set = function (name, fn) {
      try { navigator.mediaSession.setActionHandler(name, fn); } catch (e) {}
    };
    set('play', function () { audio.play().catch(function () {}); });
    set('pause', function () { audio.pause(); });
    set('previoustrack', prev);
    set('nexttrack', function () { next(false); });
  }

  /* ---------- Kuanza ---------- */
  async function init() {
    key = await PPMedia.requireKey();
    if (!key) return;

    var id = PPMedia.param('id');
    var item = id ? await PPDB.getItem(id) : null;
    if (!item || item.type !== 'audio') { location.replace('vault.html#audio'); return; }

    ids = await PPMedia.listIds('audio');
    var i = ids.indexOf(id);
    if (i < 0) { ids.unshift(id); i = 0; }

    setupMediaSession();
    loadTrack(i, true);
  }

  init();
})();