import { INITIAL_STATE, DAILY_ACTIONS, GOODS_TYPES } from "../src/data/gameData.js";
import { generateEventSchedule, isEventDay, advanceDay, nearestAppliedEvent } from "../src/systems/eventSystem.js";
import { simulateEvent, commitEventResult } from "../src/systems/eventSim.js";
import { performAction } from "../src/systems/dailySystem.js";
import { applyForJob, workShift, isWorkdayToday, hasWorkedToday, getJob } from "../src/systems/jobSystem.js";
import { canPackToday, doPack } from "../src/systems/packingSystem.js";
import { canWorkCommission, doCommission } from "../src/systems/commissionSystem.js";
import { myPostTemplates, canPostToday, publishMyPost } from "../src/systems/myPostSystem.js";
import { logTx } from "../src/systems/bankSystem.js";

/* ============================================================
   밸런스 시뮬 헬퍼 — "그럴듯한 플레이어" 정책 + 리포트/집계.
   balance.report.test.js(관찰용 리포트)가 사용한다. 검증용 아님.
   ============================================================ */

let _seq = 1;
const A = (id) => DAILY_ACTIONS.find(a => a.id === id);

export function mkGenre(day) {
  const g = {
    id: "g1", name: "카일×유노", type: "CP", media: "게임", mediaGenre: "RPG",
    characters: [
      { id: "c1", name: "카일", appearanceTags: ["은발"], personalityTags: [], conceptTags: [], position: "주인공", popularity: "메이저" },
      { id: "c2", name: "유노", appearanceTags: ["금발"], personalityTags: [], conceptTags: [], position: "히로인", popularity: "중간" },
    ],
    cp: { type: "고정충", gongId: "c1", suId: "c2", cpPopularity: "메이저 CP" },
    vibes: ["달달"], chars: "카일, 유노", cpType: "fixed", tags: ["달달"], desc: "",
    createdDay: day, fame: 0, followers: 0, fanTrust: 50, engagement: 50,
    assignedNPCs: null, eventHistory: [], snsHistory: [],
  };
  g.eventSchedule = generateEventSchedule(g, day);
  return g;
}

function orderGoods(s, typeId, qty) {
  const t = GOODS_TYPES.find(x => x.id === typeId);
  const cost = t.cost * qty;
  if (s.gold < cost) return s;
  const order = { id: "sim_o" + (_seq++), artworkId: "a1", artworkSnapshot: "img", goodsType: typeId, options: { price: t.basePrice }, quantity: qty, totalCost: cost, orderedDay: s.day, readyDay: s.day + t.prodDays, status: "making" };
  let ns = logTx(s, -cost, `굿즈 제작·${t.name}`, "🏭", "goods");
  return { ...ns, orders: [order, ...(ns.orders || [])] };
}
function applyEvent(s, ev) {
  let ns = { ...s, appliedEvents: [...(s.appliedEvents || []), ev.id], boothApp: { name: "시뮬부스", desc: "", submitted: true } };
  ns = { ...ns, activeEvent: nearestAppliedEvent(ns) || ev };
  if (ev.boothFee > 0) ns = logTx(ns, -ev.boothFee, `${ev.name} 부스 신청비`, "🎪", "event");
  return ns;
}

export function runSim(persona, DAYS = 200) {
  let s = structuredClone(INITIAL_STATE); s.screen = "studio";
  const g = mkGenre(1);
  s = { ...s, genres: [g], activeGenreId: "g1", genre: g };
  if (persona.job) s = applyForJob(s, persona.job);
  let boothBought = false;
  const orderedFor = new Set(); // eventId → 주문 검토 완료 표시
  const series = []; const note = { events: 0, sellouts: 0, goodsKinds: 0, broke: 0, lowMental: 0, lowStamina: 0, minGold: Infinity, minGoldDay: 0 };

  for (let d = 0; d < DAYS; d++) {
    // ── 파산하면 결국 알바를 구한다 (현실적 회복 행동) ──
    if (!getJob(s) && s.gold < 15000 && persona.jobWhenBroke) s = applyForJob(s, persona.jobWhenBroke);
    // ── 부스 투자 (1회) ──
    if (!boothBought && s.gold >= persona.boothBudget + 30000) {
      s = logTx(s, -persona.boothBudget, "부스 물품 구매", "🏪", "booth");
      s = { ...s, boothLayout: { version: 2, boothSize: "small", items: [{ iid: "b1", kind: "item", refId: "banner_top_w", x: .5, y: .08 }, { iid: "b2", kind: "item", refId: "disp_tier3", x: .5, y: .75 }, { iid: "b3", kind: "item", refId: "light_strip", x: .5, y: .72 }] } };
      boothBought = true;
    }
    // ── 행사 신청: 20일 내 신청 가능 행사 ──
    const cand = (s.genre.eventSchedule || []).filter(e => !(s.appliedEvents || []).includes(e.id) && e.startDay > s.day + 2 && e.startDay <= s.day + 20 && (s.fame || 0) >= e.minFame && (!e.requiresApplication || e.applyBy >= s.day));
    if (cand.length && s.gold >= (cand[0].boothFee || 0) + 5000) s = applyEvent(s, cand[0]);
    // ── 굿즈 주문 (행사별 1회 검토): 지난 행사 판매량을 기준으로, 이월 재고만큼 덜 주문.
    //    완판했으면 다음엔 늘려 본다 — 실제 서클의 재고 감각 ──
    const ae = s.activeEvent;
    if (ae && !orderedFor.has(ae.id)) {
      const dTo = ae.startDay - s.day;
      if (dTo >= 3) {
        const stockOf = (t) => (s.goods || []).filter(x => x.type === t).reduce((a, x) => a + x.stock, 0) + (s.orders || []).filter(o => o.status === "making" && o.goodsType === t).reduce((a, o) => a + o.quantity, 0);
        // 지난 행사 판매율 좋았으면 증량, 안 팔렸으면 감량 (실제 서클의 재고 감각)
        const ramp = note.lastSoldOut ? 1.4 : note.lastRatio >= 0.75 ? 1.2 : note.lastRatio >= 0.5 ? 1.05 : 0.95;
        let want = note.lastSold == null
          ? Math.max(60, Math.min(300, Math.floor((s.followers || 0) * 1.5 + persona.orderBase)))
          : Math.max(60, Math.min(300, Math.round(note.lastSold * ramp)));
        if (ae.maxSales && ae.maxSales <= 30) want = Math.min(want, 60); // 소규모 교류회엔 조금만 챙겨간다
        const need = want - stockOf("postcard");
        const afford = Math.floor((s.gold * 0.65) / 300);
        const pcQty = Math.min(need, Math.max(0, afford));
        let before = s.gold;
        if (pcQty >= 50) s = orderGoods(s, "postcard", pcQty);
        if (persona.acrylic && dTo >= 6 && s.gold >= 40000 && stockOf("acrylic") < 15 && !(ae.maxSales && ae.maxSales <= 30)) s = orderGoods(s, "acrylic", Math.min(40, Math.max(10, Math.floor(s.gold / 3000))));
        // 재고가 이미 충분하면 "안 산다"도 결정 완료. 돈이 없어 못 샀으면 내일 다시 검토
        if (s.gold !== before || need < 50) orderedFor.add(ae.id);
      }
    }
    // ── 포장 (행사 D-1 최우선 — 행동 1 소요) ──
    if (canPackToday(s)) { const r = Math.random(); s = doPack(s, r < 0.25 ? 1.4 : r < 0.85 ? 1.0 : 0.7); }
    // ── 알바 출근 (행동 1 소요) ──
    if (getJob(s) && isWorkdayToday(s) && !hasWorkedToday(s) && !isEventDay(s) && s.stamina >= 20) {
      const r = Math.random(); const mult = r < 0.25 ? 1.4 : r < 0.85 ? 1.0 : 0.7;
      s = workShift(s, mult);
    }
    // ── 커미션 (기한 마지막 날엔 무조건, 아니면 컨디션 좋을 때 — 행동 1 소요) ──
    if (canWorkCommission(s)) {
      const urgent = s.commission.expiresDay - s.day <= 0;
      if (urgent || (s.stamina >= 45 && s.mentalHealth >= 40)) { const r = Math.random(); s = doCommission(s, r < 0.25 ? 1.4 : r < 0.85 ? 1.0 : 0.7); }
    }
    // ── 일상 행동 2회 (우선순위 정책) ──
    for (let k = 0; k < 2; k++) {
      let act;
      if (s.stamina < 45) act = A("sleep");
      else if (s.mentalHealth < 45) act = s.gold > 12000 ? A("recharge") : A("shorts");
      else if (persona.spendy && s.gold > 30000 && Math.random() < 0.5) act = A("newgoods");
      else act = [A("eat"), A("exercise"), A("shorts")][Math.floor(Math.random() * 3)];
      const r = performAction(s, act);
      if (r.ok) s = r.state;
    }
    // ── 포스트 ──
    if (canPostToday(s)) { const t = myPostTemplates(s); s = publishMyPost(s, t[Math.floor(Math.random() * t.length)]); }
    // ── 하루 마감 ──
    if (isEventDay(s)) {
      const sim = simulateEvent(s);
      sim.soldResults.forEach(r => { note.goodsKinds++; if (r.sold > 0 && r.remaining === 0) note.sellouts++; });
      // 판매 감각 갱신 (다음 주문량의 기준) — 소규모 교류회는 표본이 아니라 제외
      if (!(s.activeEvent && s.activeEvent.maxSales <= 30)) {
        const soldSum = sim.soldResults.reduce((a, r) => a + r.sold, 0);
        const stockSum = sim.soldResults.reduce((a, r) => a + r.sold + r.remaining, 0);
        note.lastSold = soldSum;
        note.lastRatio = stockSum ? soldSum / stockSum : 0;
        note.lastSoldOut = sim.soldResults.some(r => r.sold > 0 && r.remaining === 0);
      }
      s = commitEventResult(s, sim); note.events++;
    } else {
      s = advanceDay(s); s = { ...s, pendingSnsEvent: null };
    }
    // ── 기록 ──
    if (s.gold < note.minGold) { note.minGold = s.gold; note.minGoldDay = s.day; }
    if (s.gold < 3000) note.broke++;
    if (s.mentalHealth < 30) note.lowMental++;
    if (s.stamina < 20) note.lowStamina++;
    series.push({ day: s.day, gold: s.gold, st: s.stamina, mh: s.mentalHealth, fame: s.fame, fol: s.followers });
  }
  return { s, series, note };
}

export function report(name, { s, series, note }) {
  const pickEvery = (n) => series.filter((_, i) => i % n === n - 1);
  const line = (label, fn) => `${label.padEnd(4)} ${pickEvery(20).map(p => String(fn(p)).padStart(6)).join("")}`;
  const earn = s.stats.earn, spend = s.stats.spend;
  console.log(`\n━━ [${name}] 200일 리포트 ━━`);
  console.log(`day   ${pickEvery(20).map(p => String(p.day).padStart(6)).join("")}`);
  console.log(line("골드k", p => Math.round(p.gold / 1000)));
  console.log(line("멘탈", p => p.mh));
  console.log(line("체력", p => p.st));
  console.log(line("인지", p => p.fame));
  console.log(line("팔로", p => p.fol));
  console.log(`행사 ${note.events}회 (평균 수익 ₩${note.events ? Math.round((earn.event || 0) / note.events).toLocaleString() : 0}) · 완판 ${note.sellouts}/${note.goodsKinds}종 · 최저골드 ₩${note.minGold.toLocaleString()}(Day ${note.minGoldDay}) · 골드<3천 ${note.broke}일 · 멘탈<30 ${note.lowMental}일 · 체력<20 ${note.lowStamina}일`);
  console.log(`수입: 행사 ₩${(earn.event || 0).toLocaleString()} · 월급 ₩${(earn.job || 0).toLocaleString()} · 커미션 ₩${(earn.commission || 0).toLocaleString()} · 기타 ₩${(earn.etc || 0).toLocaleString()}`);
  console.log(`지출: 굿즈 ₩${(spend.goods || 0).toLocaleString()} · 행사비 ₩${(spend.event || 0).toLocaleString()} · 일상 ₩${(spend.daily || 0).toLocaleString()} · 부스 ₩${(spend.booth || 0).toLocaleString()}`);
  console.log(`최종: 골드 ₩${s.gold.toLocaleString()} · 팔로워 ${s.followers} · 인지도 ${s.fame} · 수집 ${(s.collection || []).length}종`);
}

// N회 반복 집계 — 랜덤 편차를 줄여 전/후 비교를 안정화한다
export function aggregate(name, persona, N = 5, DAYS = 200) {
  const runs = Array.from({ length: N }, () => runSim(persona, DAYS));
  const nums = (fn) => runs.map(fn);
  const mean = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  const fmt = (a) => `${mean(a).toLocaleString()} (${Math.min(...a).toLocaleString()}~${Math.max(...a).toLocaleString()})`;
  const finalGold = nums(r => r.s.gold);
  const goldAt = (day) => nums(r => { const p = r.series.find(q => q.day >= day); return p ? p.gold : r.s.gold; });
  const mhMin = nums(r => Math.min(...r.series.map(p => p.mh)));
  const mhAvg = nums(r => Math.round(r.series.reduce((a, p) => a + p.mh, 0) / r.series.length));
  const mhBand = nums(r => Math.round(100 * r.series.filter(p => p.mh >= 40 && p.mh <= 90).length / r.series.length));
  const earlyMin = nums(r => Math.min(...r.series.filter(p => p.day <= 50).map(p => p.gold)));
  const selloutPct = nums(r => r.note.goodsKinds ? Math.round(100 * r.note.sellouts / r.note.goodsKinds) : 0);
  const selloutPerEv = nums(r => r.note.events ? Math.round(10 * r.note.sellouts / r.note.events) / 10 : 0);
  const events = nums(r => r.note.events);
  console.log(`\n── [${name}] ${N}회 집계 (평균 (최소~최대)) ──`);
  console.log(`최종골드 ₩${fmt(finalGold)} · Day50 ₩${fmt(goldAt(50))} · Day100 ₩${fmt(goldAt(100))}`);
  console.log(`멘탈: 최저 ${fmt(mhMin)} · 평균 ${fmt(mhAvg)} · 40~90 체류 ${fmt(mhBand)}%`);
  console.log(`완판: 종 기준 ${fmt(selloutPct)}% · 행사당 ${selloutPerEv.map(x => x).join("/")}종 · 행사 ${fmt(events)}회 · 초반(≤50일) 최저골드 ₩${fmt(earlyMin)}`);
  return runs;
}
