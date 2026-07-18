import { BOOTH_ITEMS } from "../data/gameData.js";
import { boothBonuses } from "../data/boothData.js";
import { logTx } from "./bankSystem.js";
import { endOfDay, nearestAppliedEvent } from "./eventSystem.js";
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
  // 수요 모델: 내 부스 앞에 서는 손님 수 = 인지도(체감 곡선) × 행사 규모 × 부스 fame 보너스 × 그날 운.
  // 재고를 아무리 쌓아도 손님 이상은 못 판다 — 후반 "만들수록 무한정 팔리는" 인플레 차단.
  const SCALE_MULT = { mega: 1.3, large: 1.1, medium: 1.0, small: 0.8, micro: 0.6 };
  const sc = (state.activeEvent && state.activeEvent.scale) || "small";
  const fameDraw = 70 + 100 * (state.fame / (state.fame + 500));
  const demand = Math.floor(fameDraw * (SCALE_MULT[sc] || 1) * (0.8 + Math.random() * 0.4) * (1 + totalFame));
  const salesCap = Math.min((state.activeEvent && state.activeEvent.maxSales) || 99999, demand); let soldTotal = 0;
  state.goods.forEach(g => {
    // fame 기여는 +0.25에서 캡 (fame 눈덩이 차단), 판매율 0.95 이상이면 전량 완판 처리
    const rate = Math.min(1, 0.25 + Math.random() * 0.55 + Math.min(0.25, state.fame / 2000) + totalSell);
    let sold = rate >= 0.95 ? g.stock : Math.min(g.stock, Math.floor(g.stock * rate));
    sold = Math.min(sold, Math.max(0, salesCap - soldTotal)); soldTotal += sold;
    const remaining = g.stock - sold;
    goldEarned += sold * g.price; fameEarned += Math.floor(Math.sqrt(sold) * 2.2 * (1 + totalFame)); soldResults.push({ id: g.id, sold, remaining });
    if (sold === g.stock) evs.push({ time: g.name, text: `완판!!! 🎉 +₩${(sold * g.price).toLocaleString()}`, type: "great" });
    else if (sold > g.stock * .6) evs.push({ time: g.name, text: `${sold}개 판매! +₩${(sold * g.price).toLocaleString()}`, type: "good" });
    else if (sold > 0) evs.push({ time: g.name, text: `${sold}개 판매... +₩${(sold * g.price).toLocaleString()}`, type: "normal" });
    else evs.push({ time: g.name, text: "아무도 안 샀다... 😔", type: "warning" });
    if (remaining > 0) evs.push({ time: "재고", text: `${g.name} ${remaining}개 이월 →`, type: "neutral" });
  });
  // 이월 재고가 생기면 철수길 마음이 무겁다 (종당 -3, 최대 -9)
  const leftoverKinds = soldResults.filter(x => x.remaining > 0).length;
  if (leftoverKinds > 0) { const hit = Math.min(9, leftoverKinds * 3); mentalChange -= hit; evs.push({ time: "철수", text: `남은 재고 박스 ${leftoverKinds}종을 싸며... 멘탈 -${hit}`, type: "warning" }); }
  return { evs, goldEarned, fameEarned, staminaCost, mentalChange, soldResults, totalFame, totalSell };
}

// 시뮬 결과를 게임 상태에 반영: 재고/수치/다음날 진행 + 거래로그 + endOfDay(주문완성·월급)
export function commitEventResult(s, r) {
  const { goldEarned, fameEarned, staminaCost, mentalChange, soldResults } = r;
  const updGoods = s.goods.map(g => { const x = soldResults.find(q => q.id === g.id); return x && x.remaining > 0 ? { ...g, stock: x.remaining } : null; }).filter(Boolean);
  const soldOut = soldResults.some(x => x.sold > 0 && x.remaining === 0);
  const aeId = s.activeEvent && s.activeEvent.id;
  let ns = { ...s, fame: s.fame + fameEarned, followers: Math.max(0, s.followers + Math.floor(fameEarned * .1)), stamina: Math.max(0, s.stamina - staminaCost), mentalHealth: Math.max(0, Math.min(100, s.mentalHealth + mentalChange)), goods: updGoods, day: s.day + 1, gameDate: nextGameDate(s.gameDate), activeEvent: null, boothApp: { ...s.boothApp, submitted: false }, appliedEvents: (s.appliedEvents || []).filter(id => id !== aeId), flags: { ...s.flags, firstEvent: true, recentEvent: true, goodsSoldOut: soldOut }, eventHistory: [...s.eventHistory, { day: s.day, goldEarned, fameEarned }] };
  // 다중 신청 지원: 끝난 행사를 빼고도 신청해둔 행사가 남아있으면 그 행사가 다음 활성 행사가 된다 (신청 상태 유지)
  const nxt = nearestAppliedEvent(ns);
  if (nxt) ns = { ...ns, activeEvent: nxt, boothApp: { ...ns.boothApp, submitted: true } };
  ns = logTx(ns, goldEarned, `${(s.activeEvent && s.activeEvent.name) || "행사"} 판매 수익`, "🎪", "event");
  return endOfDay(ns);
}
