import { ACT_MAX } from "../data/gameData.js";
import { logTx } from "./bankSystem.js";
import { pushMessage } from "./messageSystem.js";
import { addCollectionItem } from "./collectionSystem.js";
import { rollItemParams } from "../utils/officialGoods.js";

/* ============================================================
   덕질 일정(팬 이벤트) — 티켓팅·응모·참석. "특정 날짜에 발생, 시간(행동) 소요" 원칙.
   - 티켓팅: 공지(D-2) → 오픈일에 광클 미니게임 → 성공 시 캘린더 등록 / 실패 시 메루마켓 양도표
   - 참석: 당일 현관문으로 외출 (행동 1 + 입장료) → 멘탈 대회복 + 현장 한정 굿즈 확률
   - 놓침: 행사와 겹치거나 안 가면 멘탈 타격 — 설계된 선택 압박
   - 응모: 무료 원클릭 → 며칠 뒤 결과 메시지 (15% 당첨)
   ============================================================ */

export const TICKET_JOB = { icon: "🎫", name: "티켓팅", game: { title: "피켓팅 대전", hint: "서버 오픈 순간을 노려라! 타이밍이 전부다", color: "#e94560" } };
const FE_TYPES = [
  { id: "popup",   label: "팝업스토어",   icon: "🛍", cost: 12000, mental: 22 },
  { id: "bdcafe",  label: "생일카페",     icon: "🎂", cost: 9000,  mental: 20 },
  { id: "concert", label: "콜라보 콘서트", icon: "🎤", cost: 15000, mental: 28 },
];
const evName = (genre, t) => { const ch = genre && genre.characters && genre.characters[0]; return `${(ch && ch.name) || (genre && genre.name) || "최애"} ${t.label}`; };

// ── 티켓팅 ──
export function maybeOfferTicketing(s) {
  if (s.ticketing || !s.genre) return s;
  if (Math.random() >= 0.06) return s;
  const t = FE_TYPES[Math.floor(Math.random() * FE_TYPES.length)];
  const tk = { type: t.id, icon: t.icon, name: evName(s.genre, t), openDay: s.day + 2, eventDay: s.day + 6 + Math.floor(Math.random() * 6), cost: t.cost, mental: t.mental };
  return pushMessage({ ...s, ticketing: tk }, { from: "티켓팅 알림", avatar: "🎫", text: `[공지] 『${tk.name}』 예매 오픈 확정! Day ${tk.openDay} 정오, 서버 전쟁 예상. 그날 폰(내 방)에서 도전하세요! (행사일: Day ${tk.eventDay})` });
}
export const canTicket = (s) => !!(s.ticketing && s.day === s.ticketing.openDay && (s.actionsToday || 0) < ACT_MAX);
// 광클 미니게임 결과로 성공 판정: 풀퍼펙트(×1.4)는 확정, 그 아래는 확률
export function resolveTicketing(s, mult) {
  if (!canTicket(s)) return { state: s, ok: false };
  const tk = s.ticketing;
  const p = mult >= 1.4 ? 1.0 : mult >= 1 ? 0.55 : mult >= 0.7 ? 0.25 : 0.08;
  let ns = { ...s, ticketing: null, actionsToday: (s.actionsToday || 0) + 1 };
  if (Math.random() < p) {
    ns = { ...ns, fanEvents: [...(ns.fanEvents || []), { day: tk.eventDay, name: tk.name, icon: tk.icon, cost: tk.cost, mental: tk.mental }] };
    ns = pushMessage(ns, { from: "티켓팅 알림", avatar: "🎫", text: `[성공!!] 『${tk.name}』 예매 성공 🎉 Day ${tk.eventDay} 캘린더에 등록! (입장·굿즈 예산 ₩${tk.cost.toLocaleString()})` });
    return { state: ns, ok: true, ticket: tk };
  }
  ns = { ...ns, mentalHealth: Math.max(0, (ns.mentalHealth || 0) - 6), scalperTicket: { name: tk.name, icon: tk.icon, eventDay: tk.eventDay, cost: tk.cost, mental: tk.mental, price: tk.cost * 3 + 20000 } };
  ns = pushMessage(ns, { from: "티켓팅 알림", avatar: "🎫", text: `[실패] 서버가 터졌다... 『${tk.name}』 전석 매진 😭 (멘탈 -6) 메루마켓에 양도 표가 올라온 모양인데... 프리미엄이 붙었다.` });
  return { state: ns, ok: false, ticket: tk };
}
export function expireTicketing(s) {
  if (!s.ticketing || s.day <= s.ticketing.openDay) return s;
  const tk = s.ticketing;
  return pushMessage({ ...s, ticketing: null }, { from: "티켓팅 알림", avatar: "🎫", text: `『${tk.name}』 예매 기간이 지났어요... 다음 기회에.` });
}

// ── 셀프 기획: 생일카페 주최 / 성지순례 여행 (한 번에 큰돈, 필수 아님) ──
export const HOST_COST = 120000;  // 대관 + 특전 제작
export const TRIP_COST = 250000;  // 교통 + 숙소 + 성지 굿즈 예산
export const hasSelfPlan = (s) => (s.fanEvents || []).some(f => f.hosted || f.trip);
// 생일카페 주최: 선결제 → 7일 뒤 오픈. 방문자(인지도 기반)만큼 팔로워·인지도, 주최 특전 수집품
export function planHostedCafe(s) {
  if (!s.genre || (s.gold || 0) < HOST_COST || hasSelfPlan(s)) return s;
  const ch = s.genre.characters && s.genre.characters[0];
  const name = `${(ch && ch.name) || s.genre.name} 생일카페`;
  let ns = logTx(s, -HOST_COST, `『${name}』 대관·특전 제작 (주최)`, "🎂", "hosting");
  ns = { ...ns, fanEvents: [...(ns.fanEvents || []), { day: s.day + 7, name, icon: "🎂", cost: 0, mental: 25, hosted: true }] };
  return pushMessage(ns, { from: "티켓팅 알림", avatar: "🎂", text: `[주최 확정] 내가 여는 『${name}』 — Day ${s.day + 7} 오픈! 대관과 특전 준비 완료. mabo에 홍보 포스트를 올려두면 좋을지도?` });
}
// 성지순례 여행: 선결제 → 5일 뒤 출발. 멘탈 대충전 + 성지 한정 기념품 확정
export function planTrip(s) {
  if (!s.genre || (s.gold || 0) < TRIP_COST || hasSelfPlan(s)) return s;
  const name = `${s.genre.name} 성지순례 여행`;
  let ns = logTx(s, -TRIP_COST, `『${name}』 예약 (교통·숙소)`, "✈️", "trip");
  ns = { ...ns, fanEvents: [...(ns.fanEvents || []), { day: s.day + 5, name, icon: "✈️", cost: 0, mental: 40, trip: true }] };
  return pushMessage(ns, { from: "티켓팅 알림", avatar: "✈️", text: `[예약 완료] 『${name}』 — Day ${s.day + 5} 출발! 캐리어부터 꺼내자. 통장은 이미 출발했다...` });
}

// ── 참석/놓침 ──
export const todaysFanEvent = (s) => (s.fanEvents || []).find(f => f.day === s.day) || null;
export function attendFanEvent(s) {
  const fe = todaysFanEvent(s);
  if (!fe || (s.actionsToday || 0) >= ACT_MAX || (s.gold || 0) < fe.cost) return s;
  let ns = { ...s, fanEvents: s.fanEvents.filter(f => f !== fe), actionsToday: (s.actionsToday || 0) + 1, stamina: Math.max(0, (s.stamina || 0) - (fe.trip ? 14 : 8)) };
  if (fe.cost > 0) ns = logTx(ns, -fe.cost, `${fe.name} 입장·현장 굿즈`, fe.icon, "ticket");
  ns = { ...ns, mentalHealth: Math.min(100, (ns.mentalHealth || 0) + fe.mental) };
  if (fe.hosted) {
    // 주최: 방문자 수 = 인지도 기반 → 팔로워·인지도 보상 + 주최 특전(SR 확정)
    const visitors = 8 + Math.floor((ns.fame || 0) / 12 * (0.7 + Math.random() * 0.6));
    const p = { ...rollItemParams(ns.genre, Math.floor(Math.random() * 2 ** 31)), rarity: "SR" };
    const g = addCollectionItem(ns, { ...p, name: `${p.name} (주최 특전)` }); ns = g.state;
    ns = { ...ns, followers: (ns.followers || 0) + Math.floor(visitors * 0.6), fame: (ns.fame || 0) + Math.floor(visitors * 0.3) };
    return pushMessage(ns, { from: "티켓팅 알림", avatar: "🎂", text: `『${fe.name}』 대성황!! 방문자 ${visitors}명, 특전도 순삭 🎉 "주최자님 감사해요"라는 말에 눈물이... (팔로워 +${Math.floor(visitors * 0.6)}, 멘탈 +${fe.mental})` });
  }
  if (fe.trip) {
    // 여행: 성지 한정 기념품 확정 + 자랑거리
    const p = rollItemParams(ns.genre, Math.floor(Math.random() * 2 ** 31));
    const g = addCollectionItem(ns, { ...p, name: `${p.name} (성지 한정)` }); ns = g.state;
    ns = { ...ns, fame: (ns.fame || 0) + 5 };
    return pushMessage(ns, { from: "티켓팅 알림", avatar: "✈️", text: `『${fe.name}』에서 돌아왔다. 성지의 공기 그 자체가 힐링... ${p.name}도 겟 (멘탈 +${fe.mental}, 몸은 녹초)` });
  }
  if (Math.random() < 0.5) {
    const p = rollItemParams(ns.genre, Math.floor(Math.random() * 2 ** 31));
    const g = addCollectionItem(ns, p); ns = g.state;
    ns = pushMessage(ns, { from: "티켓팅 알림", avatar: fe.icon, text: `[전리품] 『${fe.name}』 현장 한정 ${p.name} 겟! 오길 잘했다...` });
  }
  return pushMessage(ns, { from: "티켓팅 알림", avatar: fe.icon, text: `『${fe.name}』 다녀왔다. 오늘을 위해 살았다... (멘탈 +${fe.mental})` });
}
export function missFanEvents(s) {
  const missed = (s.fanEvents || []).filter(f => f.day < s.day);
  if (!missed.length) return s;
  let ns = { ...s, fanEvents: s.fanEvents.filter(f => f.day >= s.day) };
  missed.forEach(f => {
    if (f.hosted) {
      // 주최자가 잠수 — 최악의 사고
      ns = { ...ns, mentalHealth: Math.max(0, (ns.mentalHealth || 0) - 15), fanTrust: Math.max(0, (ns.fanTrust || 0) - 10) };
      ns = pushMessage(ns, { from: "티켓팅 알림", avatar: "🎂", text: `내가 주최한 『${f.name}』에 내가 못 갔다... 참가자들에게 뭐라고 하지 (멘탈 -15, 팬신뢰 -10)` });
    } else {
      ns = { ...ns, mentalHealth: Math.max(0, (ns.mentalHealth || 0) - 8) };
      ns = pushMessage(ns, { from: "티켓팅 알림", avatar: "🎫", text: `『${f.name}』에 결국 못 갔다... 어렵게 구한 표였는데 (멘탈 -8)` });
    }
  });
  return ns;
}

// ── 응모 ──
export function maybeOfferRaffle(s) {
  if (s.raffleOffer || s.rafflePending || !s.genre) return s;
  if (Math.random() >= 0.08) return s;
  return pushMessage({ ...s, raffleOffer: { prizeSeed: Math.floor(Math.random() * 2 ** 31) } }, { from: "응모 이벤트", avatar: "🎁", text: `[이벤트] 공식 RT 응모 이벤트 진행 중! 폰(내 방)에서 원클릭 응모 (무료) — 굿즈 추첨!` });
}
export function enterRaffle(s) {
  if (!s.raffleOffer) return s;
  const r = { ...s.raffleOffer, resultDay: s.day + 2 + Math.floor(Math.random() * 3) };
  return pushMessage({ ...s, raffleOffer: null, rafflePending: r }, { from: "응모 이벤트", avatar: "🎁", text: `응모 완료! 결과는 Day ${r.resultDay} 발표. 두근두근...` });
}
export function resolveRaffle(s) {
  if (!s.rafflePending || s.day < s.rafflePending.resultDay) return s;
  const r = s.rafflePending;
  let ns = { ...s, rafflePending: null };
  if (Math.random() < 0.15) {
    const p = rollItemParams(ns.genre, r.prizeSeed);
    const up = { ...p, rarity: p.rarity === "N" ? "R" : p.rarity }; // 경품은 최소 R급
    const g = addCollectionItem(ns, up); ns = g.state;
    ns = { ...ns, mentalHealth: Math.min(100, (ns.mentalHealth || 0) + 15) };
    return pushMessage(ns, { from: "응모 이벤트", avatar: "🎁", text: `[당첨!!] ${up.name} 당첨을 축하합니다!! 🎉 로또보다 기쁘다 (멘탈 +15)` });
  }
  ns = { ...ns, mentalHealth: Math.max(0, (ns.mentalHealth || 0) - 2) };
  return pushMessage(ns, { from: "응모 이벤트", avatar: "🎁", text: "아쉽게도 이번엔 당첨되지 않으셨습니다... (멘탈 -2) 다음 기회에!" });
}
