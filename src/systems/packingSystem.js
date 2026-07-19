import { ACT_MAX } from "../data/gameData.js";

/* ============================================================
   행사 포장 — D-1에 내 방에서 미리 포장(미니게임)하면 행사 당일이 편하다.
   행동 슬롯 1 소모. 안 하면 당일 밤샘 포장 리스크(기존 랜덤)가 그대로.
   성과(mult)는 WorkGame 배율: 1.4 완벽 / 1.0 무난 / 0.7·0.5 대충.
   ============================================================ */

export const PACK_JOB = { icon: "📦", name: "행사 포장", game: { title: "굿즈 포장", hint: "박스가 닫히는 순간 테이프를 붙이자!", color: "#b98756" } };

export function canPackToday(s) {
  const ae = s.activeEvent;
  return !!(ae && (ae.startDay - s.day) === 1 && s.packedEventId !== ae.id
    && (s.actionsToday || 0) < ACT_MAX
    && s.boothApp && s.boothApp.submitted
    && ((s.goods || []).length > 0 || (s.orders || []).some(o => o.status === "making")));
}

export function doPack(s, mult) {
  if (!canPackToday(s)) return s;
  const stam = mult >= 1.4 ? 6 : mult >= 1 ? 9 : 12; // 손이 빠르면 덜 지친다
  return {
    ...s,
    packedEventId: s.activeEvent.id,
    packQuality: mult,
    actionsToday: (s.actionsToday || 0) + 1,
    stamina: Math.max(0, (s.stamina || 0) - stam),
    mentalHealth: Math.min(100, (s.mentalHealth || 0) + (mult >= 1 ? 3 : 0)), // 미리 끝내두면 마음이 놓인다
  };
}
