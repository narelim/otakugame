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

// 공식 굿즈 구경 성공 시 호출: 수집품 획득(중복은 스택) + 레어도 멘탈 보너스 + 세트 완성 체크
export function gainOfficialGoods(state) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const p = rollItemParams(state.genre, seed);
  const col = [...(state.collection || [])];
  const dupIdx = col.findIndex(it => it.char === p.char && it.type === p.type && it.motif === p.motif && it.rarity === p.rarity);
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
