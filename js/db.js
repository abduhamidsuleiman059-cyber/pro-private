/* Pro Private - db.js
   Hifadhi ya faili ndani ya simu (IndexedDB).
   Stores mbili:
   - items: taarifa ndogo (jina lililofungwa, thumbnail iliyofungwa)
   - blobs: faili lenyewe lililofungwa (kubwa)
   Zimetenganishwa ili kuorodhesha picha kusiwe kunapakia video nzima. */

(function () {
  'use strict';

  var DB_NAME = 'pro-private-db';
  var DB_VERSION = 1;
  var db = null;

  function open() {
    if (db) return Promise.resolve(db);
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains('items')) {
          var s = d.createObjectStore('items', { keyPath: 'id' });
          s.createIndex('type', 'type', { unique: false });
        }
        if (!d.objectStoreNames.contains('blobs')) {
          d.createObjectStore('blobs', { keyPath: 'id' });
        }
      };
      r.onsuccess = function () { db = r.result; resolve(db); };
      r.onerror = function () { reject(r.error); };
    });
  }

  function tx(stores, mode) {
    return open().then(function (d) { return d.transaction(stores, mode); });
  }

  function finished(t) {
    return new Promise(function (resolve, reject) {
      t.oncomplete = function () { resolve(); };
      t.onerror = function () { reject(t.error); };
      t.onabort = function () { reject(t.error); };
    });
  }

  function request(r) {
    return new Promise(function (resolve, reject) {
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  // Weka faili jipya: item (taarifa) + blob (faili lililofungwa)
  function add(item, blob) {
    return tx(['items', 'blobs'], 'readwrite').then(function (t) {
      t.objectStore('items').put(item);
      t.objectStore('blobs').put(blob);
      return finished(t);
    });
  }

  // Orodha ya items (bila faili lenyewe). type: 'photo' | 'video' | 'audio' (au hakuna = zote)
  function list(type) {
    return tx(['items'], 'readonly').then(function (t) {
      var s = t.objectStore('items');
      return request(type ? s.index('type').getAll(type) : s.getAll());
    });
  }

  function getItem(id) {
    return tx(['items'], 'readonly').then(function (t) {
      return request(t.objectStore('items').get(id));
    });
  }

  function getBlob(id) {
    return tx(['blobs'], 'readonly').then(function (t) {
      return request(t.objectStore('blobs').get(id));
    });
  }

  // Futa faili moja au zaidi (ids = array)
  function remove(ids) {
    return tx(['items', 'blobs'], 'readwrite').then(function (t) {
      ids.forEach(function (id) {
        t.objectStore('items').delete(id);
        t.objectStore('blobs').delete(id);
      });
      return finished(t);
    });
  }

  // Futa kila kitu (kwa settings baadaye)
  function clearAll() {
    return tx(['items', 'blobs'], 'readwrite').then(function (t) {
      t.objectStore('items').clear();
      t.objectStore('blobs').clear();
      return finished(t);
    });
  }

  window.PPDB = {
    add: add,
    list: list,
    getItem: getItem,
    getBlob: getBlob,
    remove: remove,
    clearAll: clearAll
  };
})();