import { rollItemParams } from "../utils/officialGoods.js";
import { addCollectionItem } from "./collectionSystem.js";
import { logTx } from "./bankSystem.js";

/* ============================================================
   온라인 가챠 — 장르 IP 모바일게임의 콜라보 가챠 (게임 속 게임).
   골드 = 과금. 결과는 덕질장 수집품으로. 천장(PITY) 30연 — SSR 확정 후 리셋.
   성향 통계 cat "gacha" — 회고록의 "가챠에 ₩N을 태웠다" 데이터 소스.
   ============================================================ */

export const GACHA_COST = 3000;   // 단챠
export const GACHA_TEN = 27000;   // 10연 (10% 할인)
export const PITY = 30;           // 천장

const RATES = [{ id: "N", w: 58 }, { id: "R", w: 30 }, { id: "SR", w: 9 }, { id: "SSR", w: 3 }];
function rollRarity() { const r = Math.random() * 100; let acc = 0; for (const x of RATES) { acc += x.w; if (r < acc) return x.id; } return "N"; }

export const canGacha = (s, n) => (s.gold || 0) >= (n === 10 ? GACHA_TEN : GACHA_COST);

// n연 가챠: 결과 아이템 배열과 새 상태. 천장 도달 시 SSR 확정.
export function doGacha(s, n) {
  const cost = n === 10 ? GACHA_TEN : GACHA_COST;
  if ((s.gold || 0) < cost) return { state: s, items: [] };
  let ns = logTx(s, -cost, `콜라보 가챠 ${n}연`, "🎰", "gacha");
  const items = []; let pity = ns.gachaPity || 0; let setDone = false;
  for (let i = 0; i < n; i++) {
    pity++;
    let rar = rollRarity();
    if (pity >= PITY) rar = "SSR"; // 천장
    if (rar === "SSR") pity = 0;
    const p = { ...rollItemParams(ns.genre, Math.floor(Math.random() * 2 ** 31)), rarity: rar };
    const g = addCollectionItem(ns, p); ns = g.state; if (g.setDone) setDone = true;
    items.push({ ...p, isNew: g.isNew });
  }
  ns = { ...ns, gachaPity: pity };
  return { state: ns, items, setDone };
}
