// Node 환경 스텁 — 시스템 로직은 브라우저 API 없이 돌아가야 한다.
// (imageSystem 등은 내부 try/catch로 indexedDB/document 부재를 스스로 삼킨다)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
