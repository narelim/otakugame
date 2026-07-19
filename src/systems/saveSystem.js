// 게임 상태 세이브/로드 (IndexedDB)
// - 전체 gameState는 굿즈/아바타 base64 이미지를 포함해 커질 수 있어 localStorage(~5MB) 대신 IndexedDB 사용.
// - 그림 세이브(seoko_draw_saves)·NPC 로스터·이미지풀/북마크는 기존 저장소를 그대로 사용(여기서 안 건드림).
const DB = "seokoSave", VER = 1, STORE = "slots";
export const MAIN_SLOT = "main";
export const SAVE_VERSION = 8; // state 구조가 바뀌면 올리고 migrate()에 단계 추가

let _p = null;
function db() {
  if (_p) return _p;
  _p = new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "slot" });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  return _p;
}

// 세이브 기록. 저장 성공 시 true, 실패 시 false(throw 안 함).
export function writeSave(state, slot = MAIN_SLOT) {
  return db().then(d => new Promise((res, rej) => {
    const rec = { slot, version: SAVE_VERSION, savedAt: Date.now(), state };
    const t = d.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(rec);
    t.oncomplete = () => res(true);
    t.onerror = () => rej(t.error);
  })).catch(() => false);
}

// 세이브 읽기. 존재하면 {state, version, savedAt}(마이그레이션 적용), 없으면 null.
export function readSave(slot = MAIN_SLOT) {
  return db().then(d => new Promise((res) => {
    const t = d.transaction(STORE, "readonly");
    const rq = t.objectStore(STORE).get(slot);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => res(null);
  })).then(rec => (rec && rec.state) ? migrate(rec) : null).catch(() => null);
}

// 세이브 삭제.
export function clearSave(slot = MAIN_SLOT) {
  return db().then(d => new Promise((res) => {
    const t = d.transaction(STORE, "readwrite");
    t.objectStore(STORE).delete(slot);
    t.oncomplete = () => res(true);
    t.onerror = () => res(false);
  })).catch(() => false);
}

// 구버전 저장본 → 최신 구조 보정. 구조 변경 시 단계별로 누적 적용.
function migrate(rec) {
  let state = rec.state;
  if ((rec.version || 1) < 2) state = { job: null, transactions: [], messages: [], ...state }; // v2: 알바·은행·메시지
  if ((rec.version || 1) < 3) state = { boothInv: null, boothLayout: null, ...state };          // v3: 부스 플래너 v2 (실측·개수)
  if ((rec.version || 1) < 4) state = { stats: { spend: {}, earn: {} }, ...state };             // v4: 성향 통계
  if ((rec.version || 1) < 5) state = { collection: [], collectionSets: [], ...state };         // v5: 덕질장(공식 굿즈 수집)
  if ((rec.version || 1) < 6) state = { avatar: { skin: "s1", hair: "bob", hairColor: "#6b4a35", outfit: "hoodie", acc: null }, wardrobe: ["hoodie"], ...state }; // v6: 아바타·옷장
  if ((rec.version || 1) < 7) state = { archive: [], ...state };                                // v7: 장르 엔딩(기록 보관소)
  if ((rec.version || 1) < 8) state = { ticketing: null, fanEvents: [], raffleOffer: null, rafflePending: null, gachaPity: 0, scalperTicket: null, marketBought: null, ...state }; // v8: 메루마켓·티켓팅·응모·가챠
  return { state, version: rec.version, savedAt: rec.savedAt };
}
