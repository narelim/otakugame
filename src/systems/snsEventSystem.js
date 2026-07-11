import EVENTS_DATA from "../data/sns_events.json";

export const SNS_EVENTS = (EVENTS_DATA && EVENTS_DATA.events) || [];

const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// 효과(범위/고정) → 실제 수치 delta
export function applyEffects(effects) {
  const delta = {};
  for (const [k, v] of Object.entries(effects || {})) {
    if (v && typeof v === "object" && v.min !== undefined) delta[k] = rng(v.min, v.max);
    else delta[k] = v;
  }
  return delta;
}

export function checkConditions(conditions, state) {
  const c = conditions || {};
  const flags = state.flags || {};
  if (c.minFame && (state.fame || 0) < c.minFame) return false;
  if (c.minFollowers && (state.followers || 0) < c.minFollowers) return false;
  if (c.cpExists && !(state.genre && state.genre.cp)) return false;
  if (c.recentEventParticipated && !flags.recentEvent) return false;
  if (c.recentPostExists && !flags.recentPost) return false;
  if (c.goodsCount && (state.goods || []).length < c.goodsCount) return false;
  if (c.minGenres && (state.genres || []).length < c.minGenres) return false;
  if (c.goodsSoldOut && !flags.goodsSoldOut) return false;
  if (c.mailOrderActive && !flags.mailOrderActive) return false;
  if (c.genreType === "official_fandom") {
    const media = state.genre && state.genre.media;
    if (!state.genre || media === "오리지널" || media === "기타") return false;
  }
  if (c.character_birthday) {
    const today = state.gameDate;
    const bday = state.genre && state.genre.characters && state.genre.characters[0] && state.genre.characters[0].birthday;
    if (!today || !bday || bday.month !== today.month || bday.day !== today.day) return false;
  }
  return true;
}

// delta를 gameState에 반영한 새 상태 반환 (clamp 포함)
export function applyEventDelta(state, delta) {
  if (!delta) return state;
  const clamp = (x) => Math.max(0, Math.min(100, x));
  const ns = { ...state };
  if (delta.followers) ns.followers = Math.max(0, (ns.followers || 0) + delta.followers);
  if (delta.fame) ns.fame = Math.max(0, (ns.fame || 0) + delta.fame);
  if (delta.mental) ns.mentalHealth = clamp((ns.mentalHealth || 0) + delta.mental);
  if (delta.stamina) ns.stamina = clamp((ns.stamina || 0) + delta.stamina);
  if (delta.fanTrust) ns.fanTrust = clamp((ns.fanTrust || 0) + delta.fanTrust);
  if (delta.engagement) ns.engagement = clamp((ns.engagement || 0) + delta.engagement);
  if (delta.imageTicket) ns.imageTicket = Math.max(0, (ns.imageTicket || 0) + delta.imageTicket);
  if (delta.gold) ns.gold = Math.max(0, (ns.gold || 0) + delta.gold);
  // sales/focus 등은 직접 추적 필드가 없어 무시(향후 확장 지점)
  return ns;
}

export function weightedRandom(list, excludeId) {
  let pool = list;
  if (excludeId && list.length > 1) {
    const f = list.filter((e) => e.id !== excludeId);
    if (f.length) pool = f;
  }
  const total = pool.reduce((a, e) => a + (e.probability || 0.05), 0);
  if (total <= 0) return pool[0] || null;
  let r = Math.random() * total;
  for (const e of pool) {
    r -= (e.probability || 0.05);
    if (r <= 0) return e;
  }
  return pool[pool.length - 1] || null;
}

// 하루 시작 시 호출. 발생 시 {event, needsChoice, delta}, 없으면 null
export function processDailyEvents(state) {
  if (Math.random() > 0.15) return null; // 오늘 이벤트 발생 여부
  const eligible = SNS_EVENTS.filter((e) => {
    if (e.imageEventTrigger && (state.imageTicket || 0) <= 0) return false; // 이미지 트리거는 티켓 필요
    return checkConditions(e.conditions, state);
  });
  if (!eligible.length) return null;
  const ev = weightedRandom(eligible, state.lastEventId);
  if (!ev) return null;
  if (ev.choices && ev.choices.length) return { event: ev, needsChoice: true, delta: null };
  const delta = applyEffects(ev.effects);
  if (ev.imageEventTrigger && (state.imageTicket || 0) > 0) {
    delta.imageTicket = (delta.imageTicket || 0) - 1;
    delta.__imageEvent = ev.imageEventTrigger;
  }
  return { event: ev, needsChoice: false, delta };
}

export function resolveChoice(event, idx) {
  const ch = (event.choices || [])[idx];
  if (!ch) return { delta: {}, createGenreTrigger: false, label: "" };
  return { delta: applyEffects(ch.effects), createGenreTrigger: !!ch.createGenreTrigger, label: ch.label };
}

// 30일/월 단순 달력 진행
export function nextGameDate(date) {
  const d = date || { month: 5, day: 1 };
  let day = d.day + 1, month = d.month;
  if (day > 30) { day = 1; month += 1; }
  if (month > 12) month = 1;
  return { month, day };
}
