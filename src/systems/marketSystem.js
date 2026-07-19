import { rollItemParams } from "../utils/officialGoods.js";
import { addCollectionItem } from "./collectionSystem.js";
import { logTx } from "./bankSystem.js";
import { pushMessage } from "./messageSystem.js";

/* ============================================================
   메루마켓(중고장터) — 후반 머니싱크 + 이월 재고 판로.
   - 프리미엄 매물: 절판 공식 굿즈가 일일 로테이션(시드 결정적)으로 올라옴 → 덕질장 구멍 메우기
   - 특가 매물: 싸지만 가품 리스크 (사기꾼)
   - 양도 티켓: 피켓팅 실패 시 프리미엄 가격으로 등장 (fanEventSystem 연동)
   - 내 재고 떨이: 이월 재고를 원가 60%에 즉시 처분 (이월 멘탈 타격의 해소 선택지 — 손절)
   - 중복 수집품 처분: 스택 초과분을 시세 10%에
   ============================================================ */

export const PRICE_BASE = { N: 12000, R: 26000, SR: 62000, SSR: 150000 };
function m32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 오늘의 매물 6개 — day 시드로 결정적 (state 저장 불필요, 자정마다 로테이션)
export function marketListings(s) {
  const rng = m32(1234567 + (s.day || 1) * 97);
  const out = [];
  for (let i = 0; i < 6; i++) {
    const seed = Math.floor(rng() * 2 ** 31);
    const p = rollItemParams(s.genre, seed);
    const cond = rng() < 0.35 ? { id: "B", label: "B급 · 사용감", mult: 0.62 } : { id: "A", label: "A급 · 미개봉급", mult: 1 };
    const fake = i === 5 && rng() < 0.5; // 마지막 슬롯은 반확률로 수상한 특가
    const base = PRICE_BASE[p.rarity] || 12000;
    const price = Math.round(base * cond.mult * (0.85 + rng() * 0.4) / 100) * 100;
    out.push({ key: `${s.day}_${i}`, item: p, cond, price: fake ? Math.round(price * 0.45 / 100) * 100 : price, fake });
  }
  // 전설의 절판품: 10% 확률로 등장하는 초고가 진품 (후반 골드의 목적지)
  if (rng() < 0.10) {
    const p = { ...rollItemParams(s.genre, Math.floor(rng() * 2 ** 31)), rarity: "SSR" };
    out.push({ key: `${s.day}_legend`, item: { ...p, name: `전설의 ${p.name}` }, cond: { id: "S", label: "S급 · 박물관급", mult: 1 }, price: 300000 + Math.round(rng() * 20) * 10000, legend: true });
  }
  if (s.scalperTicket) out.unshift({ key: "scalper_" + s.scalperTicket.eventDay, ticket: s.scalperTicket, price: s.scalperTicket.price });
  return out;
}

export function boughtToday(s, key) { return !!(s.marketBought && s.marketBought.day === s.day && s.marketBought.keys.includes(key)); }

// 매물 구매: 수집품(또는 양도 티켓) 획득. 가품 매물은 55% 확률로 사기.
export function buyListing(s, l) {
  if (boughtToday(s, l.key) || (s.gold || 0) < l.price) return s;
  const bought = (s.marketBought && s.marketBought.day === s.day) ? s.marketBought.keys : [];
  let ns = logTx(s, -l.price, l.ticket ? `메루마켓 · ${l.ticket.name} 양도 티켓` : `메루마켓 · ${l.item.name}`, "♻️", "market");
  ns = { ...ns, marketBought: { day: s.day, keys: [...bought, l.key] } };
  if (l.ticket) {
    ns = { ...ns, scalperTicket: null, fanEvents: [...(ns.fanEvents || []), { day: l.ticket.eventDay, name: l.ticket.name, icon: l.ticket.icon, cost: l.ticket.cost, mental: l.ticket.mental }] };
    return pushMessage(ns, { from: "메루마켓", avatar: "♻️", text: `[거래 완료] 『${l.ticket.name}』 양도 티켓 확보! Day ${l.ticket.eventDay} — 지갑은 아프지만 간다.` });
  }
  if (l.fake && Math.random() < 0.55) {
    ns = { ...ns, mentalHealth: Math.max(0, (ns.mentalHealth || 0) - 10) };
    return pushMessage(ns, { from: "메루마켓", avatar: "♻️", text: `[사기] 도착한 ${l.item.name}... 가품이다!!! 판매자는 잠적했다 (멘탈 -10) 특가엔 이유가 있었어...` });
  }
  const g = addCollectionItem(ns, l.item); ns = g.state;
  if (l.legend) {
    ns = { ...ns, mentalHealth: Math.min(100, (ns.mentalHealth || 0) + 10) };
    return pushMessage(ns, { from: "메루마켓", avatar: "♻️", text: `[거래 완료] ${l.item.name}... 실존했구나. 손이 떨린다. 이건 가보다 (멘탈 +10)` });
  }
  return pushMessage(ns, { from: "메루마켓", avatar: "♻️", text: `[거래 완료] ${l.item.name} 도착! 포장이 야무지다 👍 덕질장에 등록됐어요.` });
}

// 이월 재고 떨이: 해당 굿즈 전량을 원가의 60%에 즉시 처분 — 확실한 손절 (재고가 사라져 속이 시원 → 멘탈 +3)
// 주의: 판매가 기준으로 잡으면 원가(판매가의 20~40%)를 넘어 "제작→즉시 떨이" 무한 차익이 열린다
export const CLEARANCE_RATE = 0.6; // 원가 대비 회수율
export function stockClearancePay(g) { const unit = g.cost != null ? g.cost : Math.round((g.price || 0) * 0.2); return Math.max(100, Math.round(g.stock * unit * CLEARANCE_RATE / 100) * 100); }
export function sellStock(s, goodsId) {
  const g = (s.goods || []).find(x => String(x.id) === String(goodsId));
  if (!g || g.stock <= 0) return s;
  const pay = stockClearancePay(g);
  let ns = { ...s, goods: s.goods.filter(x => x !== g), mentalHealth: Math.min(100, (s.mentalHealth || 0) + 3) };
  ns = logTx(ns, pay, `메루마켓 떨이 · ${g.name} ${g.stock}개`, "📦", "market");
  return pushMessage(ns, { from: "메루마켓", avatar: "♻️", text: `[판매 완료] ${g.name} ${g.stock}개가 떨이로 나갔다 (+₩${pay.toLocaleString()}) 재고 박스가 사라지니 속이 다 시원하다!` });
}

// 중복 수집품 처분: 스택 초과분(count-1)을 시세 10%에
// 주의: 25%였을 땐 가챠 기대가치(뽑기당 시세 ₩27,435)의 환전이 단가(₩2,700)를 넘어 "가챠→중복팔이" 무한 골드가 열렸음. 10% ≈ 손익 0
export const DUPE_RATE = 0.10;
export function sellDupe(s, ci) {
  const it = (s.collection || [])[ci];
  if (!it || (it.count || 1) < 2) return s;
  const n = it.count - 1;
  const pay = Math.max(100, Math.round((PRICE_BASE[it.rarity] || 12000) * DUPE_RATE * n / 100) * 100);
  const col = s.collection.map((x, i) => i === ci ? { ...x, count: 1 } : x);
  let ns = { ...s, collection: col };
  return logTx(ns, pay, `메루마켓 · ${it.name} 중복 ${n}개 처분`, "♻️", "market");
}
