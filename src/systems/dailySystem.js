import { ACT_MAX } from "../data/gameData.js";
import { isEventDay, advanceDay } from "./eventSystem.js";
import { logTx } from "./bankSystem.js";
import { prefetchImages } from "./imageSystem.js";
import { gainOfficialGoods } from "./collectionSystem.js";

// 일상 행동 로직 — 세로 DailyScreen과 데스크톱 내 방(MyRoomScreen)이 공유.
// 반환: {ok, state, text, sub?, type} — ok=false면 state 그대로, 안내 문구만.
export function performAction(s, action) {
  if (isEventDay(s)) return { ok: false, state: s, text: "🎪 행사 당일엔 행동할 수 없어요. 행사장에 가야 해요!", type: "bad" };
  if ((s.actionsToday || 0) >= ACT_MAX) return { ok: false, state: s, text: "오늘 행동을 다 썼어요. 🌙 자고 내일 하자!", type: "neutral" };
  if ((action.id === "official" || action.id === "newgoods") && Math.random() > 0.4) return { ok: false, state: s, text: `${action.icon} 오늘은 ${action.name}이 없네... 내일 다시!`, type: "neutral" };
  if (s.gold + action.gold < 0) return { ok: false, state: s, text: `💸 돈 부족 (${action.name}: ₩${Math.abs(action.gold).toLocaleString()} 필요)`, type: "bad" };
  let ns = { ...s, stamina: Math.max(0, Math.min(100, s.stamina + action.stamina)), mentalHealth: Math.max(0, Math.min(100, s.mentalHealth + action.mental)), actionsToday: (s.actionsToday || 0) + 1, imageTicket: action.id === "sleep" ? Math.min(9, (s.imageTicket || 0) + 1) : s.imageTicket };
  if (action.gold) ns = logTx(ns, action.gold, action.name, action.icon, "daily");
  if (action.id === "sleep") prefetchImages({ genre: s.genre && s.genre.name, character: s.genre && s.genre.chars }, 5);
  let text = [`${action.icon} ${action.name}`, action.stamina !== 0 ? `체력 ${action.stamina > 0 ? "+" : ""}${action.stamina}%` : null, action.mental !== 0 ? `멘탈 ${action.mental > 0 ? "+" : ""}${action.mental}%` : null, action.gold !== 0 ? `₩${action.gold.toLocaleString()}` : null].filter(Boolean).join(" · ");
  let sub = action.desc;
  // 공식 굿즈 구경 성공 → 덕질장 수집품 획득
  if (action.id === "newgoods") {
    const g = gainOfficialGoods(ns); ns = g.state;
    text += ` · 🎀 [${g.item.rarity}] ${g.item.name} 겟!`;
    sub = g.setDone ? "🎉 세트 완성! 덕질장을 확인하세요" : g.isNew ? "덕질장에 새 수집품이 등록됐어요" : "이미 있는 굿즈... 그래도 좋아 (스택 +1)";
  }
  return { ok: true, state: ns, text, sub, type: action.stamina > 0 || action.mental > 0 ? "good" : "neutral" };
}

// 취침(하루 넘기기). 반환: {ok, state, text, sub?, type, newDay?}
export function sleepDay(s) {
  if (isEventDay(s)) return { ok: false, state: s, text: "🎪 행사 당일엔 잘 수 없어요. 행사를 먼저 치르세요!", type: "bad" };
  const nd = s.day + 1;
  const completed = (s.orders || []).filter(o => o.status === "making" && o.readyDay <= nd).length;
  const ns = advanceDay({ ...s, stamina: Math.min(100, s.stamina + 5), mentalHealth: Math.min(100, s.mentalHealth + 5) });
  return { ok: true, state: ns, newDay: nd, text: `🌙 Day ${nd} 시작! (체력·멘탈 +5)${completed ? ` 🏭 굿즈 ${completed}건 완성!` : ""}`, sub: completed ? "굿즈팩토리 재고에 추가됐어요" : "푹 잤다", type: completed ? "good" : "neutral" };
}
