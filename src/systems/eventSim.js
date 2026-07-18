import { BOOTH_ITEMS } from "../data/gameData.js";
import { boothBonuses } from "../data/boothData.js";
import { logTx } from "./bankSystem.js";
import { endOfDay } from "./eventSystem.js";
import { nextGameDate } from "./snsEventSystem.js";

/* ============================================================
   행사 당일 시뮬레이션 — 계산(simulateEvent)과 상태 반영(commitEventResult)을 분리.
   레거시 EventScreen(즉시 연출)과 데스크톱 EventDayScreen(라이브 연출)이 공유한다.
   ============================================================ */

// 부스에 특정 계열 물품이 있는지 (레거시 보유목록 + 부.꾸 v2 레이아웃 둘 다 인정)
function hasDeco(state, legacyId, v2prefix) {
  if ((state.boothItems || []).includes(legacyId)) return true;
  const l = state.boothLayout;
  return !!(l && l.version === 2 && l.items.some(p => p.kind === "item" && String(p.refId).startsWith(v2prefix)));
}

// 행사 하루 결과 계산 (state는 변경하지 않음)
export function simulateEvent(state) {
  const { fame: totalFame, sell: totalSell } = boothBonuses(state, BOOTH_ITEMS);
  const decoCount = (state.boothLayout && state.boothLayout.version === 2) ? state.boothLayout.items.length : (state.boothItems || []).length;
  const evs = []; let goldEarned = 0, fameEarned = 0, staminaCost = 25, mentalChange = 0; const soldResults = [];
  evs.push({ time: "D-1", text: "포장 시작!", type: "normal" });
  if (Math.random() > .5) { evs.push({ time: "새벽", text: "아직도 포장 중... 체력 -15", type: "warning" }); staminaCost += 15; }
  else { evs.push({ time: "밤", text: "일찍 완료! 체력 절약 ✨", type: "good" }); }
  evs.push({ time: "당일", text: `부스 세팅! (배치물 ${decoCount}개)`, type: "normal" });
  if (hasDeco(state, "banner", "banner_")) evs.push({ time: "현수막", text: `"${(state.genre && state.genre.name) || "MY CIRCLE"}" 현수막에 눈길이!`, type: "good" });
  if (hasDeco(state, "light", "light_")) evs.push({ time: "조명", text: "LED 아래 굿즈가 반짝반짝", type: "good" });
  if (hasDeco(state, "promo", "promo_")) evs.push({ time: "판촉대", text: "샘플 보고 손님이 멈췄다!", type: "good" });
  const nb = Math.random();
  if (nb > .65) { evs.push({ time: "옆부스", text: "초금손 대형 서클이 옆에?! 멘탈 -15", type: "warning" }); mentalChange -= 15; }
  else if (nb > .3) { evs.push({ time: "옆부스", text: "옆 작가분이 먼저 인사해줬다 🥺", type: "good" }); mentalChange += 5; }
  else { evs.push({ time: "옆부스", text: "합동 이벤트 제안! ✨", type: "great" }); fameEarned += 10; mentalChange += 8; }
  const salesCap = (state.activeEvent && state.activeEvent.maxSales) || 99999; let soldTotal = 0;
  state.goods.forEach(g => {
    const rate = Math.min(1, 0.25 + Math.random() * 0.55 + (state.fame / 2000) + totalSell);
    let sold = Math.min(g.stock, Math.floor(g.stock * rate));
    sold = Math.min(sold, Math.max(0, salesCap - soldTotal)); soldTotal += sold;
    const remaining = g.stock - sold;
    goldEarned += sold * g.price; fameEarned += Math.floor(sold * 0.6 * (1 + totalFame)); soldResults.push({ id: g.id, sold, remaining });
    if (sold === g.stock) evs.push({ time: g.name, text: `완판!!! 🎉 +₩${(sold * g.price).toLocaleString()}`, type: "great" });
    else if (sold > g.stock * .6) evs.push({ time: g.name, text: `${sold}개 판매! +₩${(sold * g.price).toLocaleString()}`, type: "good" });
    else if (sold > 0) evs.push({ time: g.name, text: `${sold}개 판매... +₩${(sold * g.price).toLocaleString()}`, type: "normal" });
    else evs.push({ time: g.name, text: "아무도 안 샀다... 😔", type: "warning" });
    if (remaining > 0) evs.push({ time: "재고", text: `${g.name} ${remaining}개 이월 →`, type: "neutral" });
  });
  return { evs, goldEarned, fameEarned, staminaCost, mentalChange, soldResults, totalFame, totalSell };
}

// 시뮬 결과를 게임 상태에 반영: 재고/수치/다음날 진행 + 거래로그 + endOfDay(주문완성·월급)
export function commitEventResult(s, r) {
  const { goldEarned, fameEarned, staminaCost, mentalChange, soldResults } = r;
  const updGoods = s.goods.map(g => { const x = soldResults.find(q => q.id === g.id); return x && x.remaining > 0 ? { ...g, stock: x.remaining } : null; }).filter(Boolean);
  const soldOut = soldResults.some(x => x.sold > 0 && x.remaining === 0);
  const aeId = s.activeEvent && s.activeEvent.id;
  let ns = { ...s, fame: s.fame + fameEarned, followers: Math.max(0, s.followers + Math.floor(fameEarned * .1)), stamina: Math.max(0, s.stamina - staminaCost), mentalHealth: Math.max(0, Math.min(100, s.mentalHealth + mentalChange)), goods: updGoods, day: s.day + 1, gameDate: nextGameDate(s.gameDate), activeEvent: null, boothApp: { ...s.boothApp, submitted: false }, appliedEvents: (s.appliedEvents || []).filter(id => id !== aeId), flags: { ...s.flags, firstEvent: true, recentEvent: true, goodsSoldOut: soldOut }, eventHistory: [...s.eventHistory, { day: s.day, goldEarned, fameEarned }] };
  ns = logTx(ns, goldEarned, `${(s.activeEvent && s.activeEvent.name) || "행사"} 판매 수익`, "🎪", "event");
  return endOfDay(ns);
}
