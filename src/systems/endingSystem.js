import { pushMessage } from "./messageSystem.js";

/* ============================================================
   장르 엔딩 = 계정 정리(졸업). 게임 오버가 아니라 플레이어의 선택.
   - 휴덕: 계정 유지, 활동만 쉼 → 복귀 시 수치 일부 감쇠
   - 탈덕(close): 사유 선택 → 회고록(memoir)을 기록 보관소(archive)에 영구 보존
   - 복덕(재파기): 같은 이름의 장르를 다시 만들면 옛 팬이 알아봄(팔로워 보너스)
   - 옛 장르 소식: archive가 있으면 SNS에 간간히 흘러들어옴 (eventSystem에서)
   ============================================================ */

export const CLOSE_REASONS = [
  { id: "done",     icon: "🏁", label: "원작 완결까지 함께했다 (완주)" },
  { id: "newlove",  icon: "💘", label: "새 장르에 최애가 생겼다" },
  { id: "official", icon: "💢", label: "공식이 미쳤다... (나쁜 쪽으로)" },
  { id: "busy",     icon: "💼", label: "현생이 너무 바빠졌다" },
  { id: "natural",  icon: "🍂", label: "그냥... 때가 된 것 같다" },
];

// 활성 장르의 top-level 작업세트(팔로워 등)를 장르 객체로 되돌린 genres 배열
function stashWorkingSet(s) {
  return (s.genres || []).map(g => g.id === s.activeGenreId ? { ...g, fame: s.fame, followers: s.followers, fanTrust: s.fanTrust, engagement: s.engagement, snsHistory: s.snsHistory } : g);
}
// target을 활성으로 세우거나(없으면 무장르 상태) 작업세트 복원
function activate(s, genres, target) {
  if (!target) return { ...s, genres, activeGenreId: null, genre: null, npcRoster: null, fame: 0, followers: 0, fanTrust: 50, engagement: 50, snsHistory: [] };
  return { ...s, genres, activeGenreId: target.id, genre: target, npcRoster: target.assignedNPCs || null, fame: target.fame || 0, followers: target.followers || 0, fanTrust: target.fanTrust != null ? target.fanTrust : 50, engagement: target.engagement != null ? target.engagement : 50, snsHistory: target.snsHistory || [] };
}

// 회고록 생성 (g는 작업세트가 반영된 장르 객체)
export function buildMemoir(s, g, reason) {
  const createdDay = g.createdDay || 1;
  const evs = (s.eventHistory || []).filter(e => e.day >= createdDay && e.day <= s.day);
  const highlights = [...(g.snsHistory || [])].filter(p => p.text).sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3).map(p => ({ from: p.from, text: p.text, likes: p.likes || 0 }));
  return {
    id: "mem_" + g.id, genreId: g.id, genreName: g.name, media: [g.media, g.mediaGenre, g.type].filter(Boolean).join(" · "),
    createdDay, closedDay: s.day, days: Math.max(1, s.day - createdDay + 1),
    events: evs.length, totalSales: evs.reduce((a, e) => a + (e.goldEarned || 0), 0),
    followers: g.followers || 0, fame: g.fame || 0, highlights,
    reason: reason.id, reasonIcon: reason.icon, reasonLabel: reason.label,
    refandomCount: 0,
  };
}

// 휴덕 — 계정은 남고 활동만 쉼
export function hiatusGenre(s, genreId) {
  const genres = stashWorkingSet(s).map(g => g.id === genreId ? { ...g, status: "hiatus", hiatusDay: s.day } : g);
  const g = genres.find(x => x.id === genreId); if (!g) return s;
  let ns = (genreId === s.activeGenreId)
    ? activate(s, genres, genres.find(x => x.id !== genreId && x.status !== "hiatus") || null)
    : { ...s, genres };
  return pushMessage(ns, { from: "mabo", avatar: "🐦", text: `[휴덕] ${g.name} 계정을 잠시 쉬어갑니다. 타임라인은 그대로 둘게요. 언제든 돌아와요 🌙` });
}

// 복귀 — 감쇠: 팔로워 70% · 인지도 80% · 팬신뢰 -10
export function resumeGenre(s, genreId) {
  const genres = stashWorkingSet(s).map(g => g.id === genreId ? { ...g, status: undefined, followers: Math.floor((g.followers || 0) * 0.7), fame: Math.floor((g.fame || 0) * 0.8), fanTrust: Math.max(0, (g.fanTrust != null ? g.fanTrust : 50) - 10) } : g);
  const t = genres.find(x => x.id === genreId); if (!t) return s;
  const ns = activate(s, genres, t);
  return pushMessage(ns, { from: "mabo", avatar: "🐦", text: `[복귀] ${t.name} 계정 활동 재개! 오랜만이라 타임라인이 낯설다... (쉬는 동안 팔로워 일부가 떠났어요)` });
}

// 탈덕(졸업) — 계정 close, 회고록을 보관소로. 시원섭섭 멘탈 +10
export function closeGenre(s, genreId, reasonId) {
  const reason = CLOSE_REASONS.find(r => r.id === reasonId) || CLOSE_REASONS[4];
  const stashed = stashWorkingSet(s);
  const g = stashed.find(x => x.id === genreId); if (!g) return s;
  const memoir = buildMemoir({ ...s, genres: stashed }, g, reason);
  const genres = stashed.filter(x => x.id !== genreId);
  let ns = (genreId === s.activeGenreId)
    ? activate({ ...s }, genres, genres.find(x => x.status !== "hiatus") || null)
    : { ...s, genres };
  ns = { ...ns, archive: [...(s.archive || []), memoir], mentalHealth: Math.min(100, (ns.mentalHealth || 0) + 10) };
  return pushMessage(ns, { from: "mabo", avatar: "🐦", text: `[계정 정리] ${g.name}, ${memoir.days}일간의 덕질이 끝났습니다. ${reason.icon} "${reason.label}" — 회고록이 장르연구소 보관소에 남았어요. 수고했어요, 정말로.` });
}

// 복덕(재파기) 보너스: 같은 이름의 회고록이 있으면 {memoir, followers}
export function refandomBonus(s, newGenreName) {
  const mem = (s.archive || []).find(m => m.genreName === (newGenreName || "").trim());
  if (!mem) return null;
  return { memoir: mem, followers: Math.min(300, Math.floor((mem.followers || 0) * 0.15) + 5) };
}
// 복덕 적용: 새 장르 생성 직후 호출 (팔로워 보너스 + 회고록 카운트 + 메시지)
export function applyRefandom(s, bonus) {
  const archive = (s.archive || []).map(m => m.id === bonus.memoir.id ? { ...m, refandomCount: (m.refandomCount || 0) + 1 } : m);
  let ns = { ...s, archive, followers: (s.followers || 0) + bonus.followers };
  return pushMessage(ns, { from: "mabo", avatar: "🐦", text: `[회귀 감지] "${bonus.memoir.genreName}"... 다시 돌아오셨군요? 예전 팬 ${bonus.followers}명이 새 계정을 알아봤어요. 흑역사가 발굴될지도 모르니 조심 🔥` });
}
