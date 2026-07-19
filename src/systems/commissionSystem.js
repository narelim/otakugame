import { ACT_MAX } from "../data/gameData.js";
import { logTx } from "./bankSystem.js";
import { pushMessage } from "./messageSystem.js";

/* ============================================================
   커미션(외주) — 월급날 전의 부수익 루트. 인지도 10+면 가끔 의뢰 메시지가
   도착하고, 기한(3일) 안에 내 방 책상에서 작업(미니게임)하면 보수가 입금된다.
   행동 슬롯 1 + 체력 15 소모. 성향 통계 cat "commission".
   ============================================================ */

export const COMMISSION_JOB = { icon: "🎨", name: "커미션 작업", game: { title: "커미션 일러스트", hint: "의뢰 사양에 딱 맞는 순간에 펜을!", color: "#7c3aed" } };
const CLIENTS = ["@ruki_fan", "@min_collector", "@white_novel", "@subin_vt", "@daily_haru", "@mochi_gugu"];
const ASKS = ["SD 일러 1컷 부탁드려요!", "프로필용 반신 일러 가능할까요?", "자캐 커플 일러 의뢰하고 싶어요 🙏", "헤더용 일러 한 장만..!"];

// 하루 시작 시 호출: 의뢰가 없으면 확률적으로 새 의뢰 도착 (인지도가 높을수록 보수 상승)
export function maybeOfferCommission(s) {
  if (s.commission || (s.fame || 0) < 10) return s;
  if (Math.random() >= 0.10) return s;
  const amount = Math.min(45000, 5000 + Math.round((s.fame || 0) * 25 / 100) * 100 + Math.floor(Math.random() * 8) * 500);
  const from = CLIENTS[Math.floor(Math.random() * CLIENTS.length)];
  const c = { amount, from, offeredDay: s.day, expiresDay: s.day + 3 };
  const ns = { ...s, commission: c };
  return pushMessage(ns, { from: "커미션 의뢰", avatar: "🎨", text: `[의뢰] ${from}님: "그림체가 취향이에요! ${ASKS[Math.floor(Math.random() * ASKS.length)]}" 보수 ₩${amount.toLocaleString()} · 기한 3일 (내 방 🎨 태블릿에서 작업)` });
}

// 기한 만료 처리
export function expireCommission(s) {
  if (!s.commission || s.day <= s.commission.expiresDay) return s;
  const c = s.commission;
  return pushMessage({ ...s, commission: null }, { from: "커미션 의뢰", avatar: "🎨", text: `[취소] 기한이 지나 ${c.from}님의 의뢰가 취소됐어요... (₩${c.amount.toLocaleString()} 날림 😢)` });
}

export const canWorkCommission = (s) => !!(s.commission && (s.actionsToday || 0) < ACT_MAX && (s.stamina || 0) >= 15);

// 작업 완료: 성과 배율만큼 보수 입금
export function doCommission(s, mult) {
  if (!canWorkCommission(s)) return s;
  const c = s.commission;
  const pay = Math.max(1000, Math.round(c.amount * mult / 100) * 100);
  let ns = { ...s, commission: null, actionsToday: (s.actionsToday || 0) + 1, stamina: Math.max(0, (s.stamina || 0) - 15) };
  ns = logTx(ns, pay, `커미션 · ${c.from} 의뢰`, "🎨", "commission");
  const line = mult >= 1.4 ? `"우와아 기대 이상이에요!! 보너스 드렸어요 🙏"` : mult >= 1 ? `"감사합니다! 소중히 쓸게요 🥰"` : `"아... 넵 감사합니다..." (보수 일부만 지급)`;
  return pushMessage(ns, { from: "커미션 의뢰", avatar: "🎨", text: `[완료] ${c.from}: ${line} (+₩${pay.toLocaleString()})` });
}
