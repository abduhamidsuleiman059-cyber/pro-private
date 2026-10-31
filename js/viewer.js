/* Pro Private - viewer.js
   Kuona picha (zoom kwa vidole viwili, bonyeza mara mbili, swipe kushoto/kulia)
   na kucheza video. Pia: rudisha kwenye simu, futa. */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage');

  var key = null;
  var type = 'photo';
  var ids = [];
  var index = 0;
  var cur = null;
  var curUrl = null;
  var token = 0;

  var scale = 1, tx = 0, ty = 0;

  /* ---------- Kuonyesha ---------- */
  function applyTransform() {
    var img = stage.querySelector('img');
    if (img) img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
  }

  function resetZoom() {
    scale = 1; tx = 0; ty = 0;
    applyTransform();
  }

  function updateArrows() {
    var many = ids.length > 1;
    $('prevBtn').classList.toggle('hidden', !many);
    $('nextBtn').classList.toggle('hidden', !many);
  }

  async function show(i) {
    var my = ++token;
    index = i;
    resetZoom();

    stage.innerHTML = '';
    var loading = document.createElement('div');
    loading.className = 'loading';
    loading.textContent = 'Inafungua...';
    stage.appendChild(loading);

    var data = null;
    try { data = await PPMedia.load(key, ids[i]); } catch (e) {}
    if (my !== token) return;

    if (!data) {
      loading.textContent = 'Faili halipatikani';
      return;
    }

    if (curUrl) URL.revokeObjectURL(curUrl);
    cur = data;
    curUrl = URL.createObjectURL(data.blob);

    $('viewTitle').textContent = data.meta.name;
    $('viewCount').textContent = (i + 1) + ' / ' + ids.length;
    updateArrows();

    stage.innerHTML = '';
    stage.classList.toggle('is-video', type === 'video');

    if (type === 'video') {
      var v = document.createElement('video');
      v.src = curUrl;
      v.controls = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.autoplay = true;
      stage.appendChild(v);
    } else {
      var img = document.createElement('img');
      img.src = curUrl;
      img.alt = '';
      img.draggable = false;
      stage.appendChild(img);
    }

    try { history.replaceState(null, '', '?id=' + encodeURIComponent(ids[i])); } catch (e) {}
  }

  function navigate(d) {
    var n = index + d;
    if (n < 0 || n >= ids.length) return;
    show(n);
  }

  /* ---------- Gesture za picha ---------- */
  var pts = {};
  var startDist = 0, startScale = 1;
  var panStart = { x: 0, y: 0 };
  var swipeStartX = 0, swipeStartY = 0;
  var moved = false;
  var lastTap = 0;

  function count() { return Object.keys(pts).length; }

  function twoPoints() {
    var k = Object.keys(pts);
    return [pts[k[0]], pts[k[1]]];
  }

  function dist(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function toggleZoom() {
    if (scale > 1) { resetZoom(); }
    else { scale = 2.5; tx = 0; ty = 0; applyTransform(); }
  }

  stage.addEventListener('pointerdown', function (ev) {
    if (type !== 'photo') return;
    try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
    pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };

    if (count() === 2) {
      var p = twoPoints();
      startDist = dist(p[0], p[1]);
      startScale = scale;
      moved = true;
    } else if (count() === 1) {
      panStart = { x: ev.clientX - tx, y: ev.clientY - ty };
      swipeStartX = ev.clientX;
      swipeStartY = ev.clientY;
      moved = false;
    }
  });

  stage.addEventListener('pointermove', function (ev) {
    if (type !== 'photo' || !pts[ev.pointerId]) return;
    pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };

    if (count() === 2) {
      var p = twoPoints();
      var d = dist(p[0], p[1]);
      if (startDist > 0) {
        scale = Math.min(5, Math.max(1, startScale * d / startDist));
        if (scale === 1) { tx = 0; ty = 0; }
        applyTransform();
      }
      moved = true;
    } else if (count() === 1) {
      if (scale > 1) {
        tx = ev.clientX - panStart.x;
        ty = ev.clientY - panStart.y;
        applyTransform();
      }
      if (Math.abs(ev.clientX - swipeStartX) > 10 || Math.abs(ev.clientY - swipeStartY) > 10) moved = true;
    }
  });

  function endPointer(ev) {
    if (type !== 'photo' || !pts[ev.pointerId]) return;
    var wasSingle = count() === 1;
    delete pts[ev.pointerId];

    if (wasSingle) {
      var dx = ev.clientX - swipeStartX;
      var dy = ev.clientY - swipeStartY;

      if (scale === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        navigate(dx < 0 ? 1 : -1);
      } else if (!moved) {
        var now = Date.now();
        if (now - lastTap < 300) { toggleZoom(); lastTap = 0; }
        else { lastTap = now; }
      }
    } else if (count() === 1) {
      // kidole kimoja kimebaki baada ya pinch: endelea kusogeza bila kuruka
      var k = Object.keys(pts)[0];
      panStart = { x: pts[k].x - tx, y: pts[k].y - ty };
      swipeStartX = pts[k].x;
      swipeStartY = pts[k].y;
      moved = true;
    }
  }

  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  /* ---------- Vitufe ---------- */
  function back() {
    location.href = 'vault.html#' + type;
  }

  $('backBtn').addEventListener('click', back);
  $('prevBtn').addEventListener('click', function () { navigate(-1); });
  $('nextBtn').addEventListener('click', function () { navigate(1); });

  $('saveBtn').addEventListener('click', async function () {
    if (!cur) return;
    var r = await PPMedia.saveToPhone(cur.blob, cur.meta.name);
    if (r === 'share') PPMedia.toast('Chagua "Save" ili iende kwenye gallery.');
    else if (r === 'download') PPMedia.toast('Imehifadhiwa kwenye folder la Downloads.');
  });

  $('delBtn').addEventListener('click', async function () {
    if (!cur) return;
    if (!confirm('Futa faili hili kabisa? Hili halirudishwi.')) return;
    try {
      await PPDB.remove([ids[index]]);
    } catch (e) {
      PPMedia.toast('Imeshindwa kufuta.');
      return;
    }
    ids.splice(index, 1);
    if (!ids.length) { back(); return; }
    show(Math.min(index, ids.length - 1));
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft') navigate(-1);
    else if (ev.key === 'ArrowRight') navigate(1);
    else if (ev.key === 'Escape') back();
  });

  /* ---------- Kuanza ---------- */
  async function init() {
    key = await PPMedia.requireKey();
    if (!key) return;

    var id = PPMedia.param('id');
    var item = id ? await PPDB.getItem(id) : null;
    if (!item || item.type === 'audio') { location.replace('vault.html'); return; }

    type = item.type;
    ids = await PPMedia.listIds(type);
    var i = ids.indexOf(id);
    if (i < 0) { ids.unshift(id); i = 0; }
    show(i);
  }

  init();
})();