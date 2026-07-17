// 유저 에셋(바탕화면 이미지 등) Blob 저장소 — IndexedDB. base64 인코딩 없이 원본 binary 그대로 보관(용량 절약).
const DB = "seokoAssets", VER = 1, STORE = "blobs";

let _p = null;
function db() {
  if (_p) return _p;
  _p = new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return _p;
}

// Blob 저장(성공 true / 실패 false)
export function putBlob(key, blob) {
  return db().then(d => new Promise((res, rej) => {
    const t = d.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(blob, key);
    t.oncomplete = () => res(true);
    t.onerror = () => rej(t.error);
  })).catch(() => false);
}

// Blob 읽기(없으면 null)
export function getBlob(key) {
  return db().then(d => new Promise((res) => {
    const t = d.transaction(STORE, "readonly");
    const rq = t.objectStore(STORE).get(key);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => res(null);
  })).catch(() => null);
}

// Blob 삭제
export function delBlob(key) {
  return db().then(d => new Promise((res) => {
    const t = d.transaction(STORE, "readwrite");
    t.objectStore(STORE).delete(key);
    t.oncomplete = () => res(true);
    t.onerror = () => res(false);
  })).catch(() => false);
}
