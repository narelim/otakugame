import { rollItemParams, OFFICIAL_TYPES, RARITIES } from "../utils/officialGoods.js";
import { pushMessage } from "./messageSystem.js";

/* ============================================================
   덕질장(공식 굿즈 수집) — "공식 굿즈 구경" 성공 시 수집품 획득.
   state.collection: [{...params, count, day}] (이미지는 시드로 재생성 — 세이브 가벼움)
   세트: 캐릭터별 공식 굿즈 5종(캔뱃지·포카·아크릴·키링·스티커) 모으면 완성 보너스.
   ============================================================ */

export const rarityOf = (id) => RARITIES.find(r => r.id === id) || RARITIES[0];
const setKey = (it) => `${it.genreName}::${it.char}`;

// 캐릭터별 세트 현황: [{key, genreName, char, have:[type...], done}]
export function collectionSets(state) {
  const map = new Map();
  (state.collection || []).forEach(it => {
    const k = setKey(it);
    const e = map.get(k) || { key: k, genreName: it.genreName, char: it.char, have: new Set() };
    e.have.add(it.type); map.set(k, e);
  });
  return [...map.values()].map(e => ({ ...e, have: [...e.have], done: OFFICIAL_TYPES.every(t => e.have.has(t.type)) }));
}

// 수집품 1개 추가 (중복은 스택) + 레어도 멘탈 보너스 + 세트 완성 체크.
// 공식 굿즈 구경·가챠·메루마켓·응모 당첨이 전부 이 함수를 통해 덕질장에 들어온다.
export function addCollectionItem(state, p) {
  const col = [...(state.collection || [])];
  // name까지 일치해야 같은 슬롯 — 일반 굿즈는 이름이 파라미터로 결정되어 동작 동일하고,
  // 특별판(전설의·주최 특전·성지 한정)은 별도 칸을 가진다 (₩30만 가보가 "이미 있는 굿즈 +1"이 되지 않게)
  const dupIdx = col.findIndex(it => it.char === p.char && it.type === p.type && it.motif === p.motif && it.rarity === p.rarity && (it.name || "") === (p.name || ""));
  let isNew = false;
  if (dupIdx >= 0) col[dupIdx] = { ...col[dupIdx], count: (col[dupIdx].count || 1) + 1 };
  else { col.push({ ...p, count: 1, day: state.day }); isNew = true; }
  const rar = rarityOf(p.rarity);
  let ns = { ...state, collection: col, mentalHealth: Math.max(0, Math.min(100, (state.mentalHealth || 0) + rar.mental)) };
  // 세트 완성 체크 (새로 완성된 것만)
  const doneBefore = new Set(state.collectionSets || []);
  const nowDone = collectionSets(ns).filter(s => s.done).map(s => s.key);
  const fresh = nowDone.filter(k => !doneBefore.has(k));
  if (fresh.length) {
    ns = { ...ns, collectionSets: [...doneBefore, ...fresh], mentalHealth: Math.min(100, ns.mentalHealth + 30) };
    fresh.forEach(k => { const ch = k.split("::")[1]; ns = pushMessage(ns, { from: "덕질장", avatar: "🎀", text: `[세트 완성!] ${ch} 공식 굿즈 5종을 전부 모았어요! 최고의 팬이에요 🎉 (멘탈 +30)` }); });
  } else {
    ns = { ...ns, collectionSets: [...doneBefore] };
  }
  return { state: ns, item: p, isNew, setDone: fresh.length > 0 };
}

// 공식 굿즈 구경 성공 시 호출: 랜덤 수집품 획득
export function gainOfficialGoods(state) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const p = rollItemParams(state.genre, seed);
  return addCollectionItem(state, p);
}
