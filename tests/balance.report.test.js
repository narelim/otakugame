import { describe, it, expect } from "vitest";
import { INITIAL_STATE, DAILY_ACTIONS, GOODS_TYPES } from "../src/data/gameData.js";
import { generateEventSchedule, isEventDay, advanceDay, nearestAppliedEvent } from "../src/systems/eventSystem.js";
import { simulateEvent, commitEventResult } from "../src/systems/eventSim.js";
import { performAction } from "../src/systems/dailySystem.js";
import { applyForJob, workShift, isWorkdayToday, hasWorkedToday, getJob } from "../src/systems/jobSystem.js";
import { gainOfficialGoods } from "../src/systems/collectionSystem.js";
import { myPostTemplates, canPostToday, publishMyPost } from "../src/systems/myPostSystem.js";
import { logTx } from "../src/systems/bankSystem.js";

/* ============================================================
   밸런스 리포트 시뮬 — "그럴듯한 플레이어" 200일. 검증용이 아니라 관찰용.
   npx vitest run tests/balance.report.test.js 로 실행하고 콘솔 표를 본다.
   ============================================================ */

let _seq = 1;
const A = (id) => DAILY_ACTIONS.find(a => a.id === id);

function mkGenre(day) {
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

function runSim(persona, DAYS = 200) {
  let s = structuredClone(INITIAL_STATE); s.screen = "studio";
  const g = mkGenre(1);
  s = { ...s, genres: [g], activeGenreId: "g1", genre: g };
  if (persona.job) s = applyForJob(s, persona.job);
  let boothBought = false;
  const orderedFor = new Set(); // eventId → 주문 완료 표시
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
    // ── 굿즈 주문 (행사별 1세트, 형편에 맞게) ──
    const ae = s.activeEvent;
    if (ae && !orderedFor.has(ae.id)) {
      const dTo = ae.startDay - s.day;
      if (dTo >= 3) {
        const want = Math.max(60, Math.min(300, Math.floor((s.followers || 0) * 1.5 + persona.orderBase)));
        const afford = Math.floor((s.gold * 0.65) / 300);
        const pcQty = Math.min(want, Math.max(0, afford));
        let before = s.gold;
        if (pcQty >= 50) s = orderGoods(s, "postcard", pcQty);
        if (persona.acrylic && dTo >= 6 && s.gold >= 40000) s = orderGoods(s, "acrylic", Math.min(40, Math.max(10, Math.floor(s.gold / 3000))));
        if (s.gold !== before) orderedFor.add(ae.id);
      }
    }
    // ── 알바 출근 ──
    if (getJob(s) && isWorkdayToday(s) && !hasWorkedToday(s) && !isEventDay(s) && s.stamina >= 20) {
      const r = Math.random(); const mult = r < 0.25 ? 1.4 : r < 0.85 ? 1.0 : 0.7;
      s = workShift(s, mult);
    }
    // ── 일상 행동 2회 (우선순위 정책) ──
    for (let k = 0; k < 2; k++) {
      let act = null;
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

function report(name, { s, series, note }) {
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
  console.log(`수입: 행사 ₩${(earn.event || 0).toLocaleString()} · 월급 ₩${(earn.job || 0).toLocaleString()} · 기타 ₩${(earn.etc || 0).toLocaleString()}`);
  console.log(`지출: 굿즈 ₩${(spend.goods || 0).toLocaleString()} · 행사비 ₩${(spend.event || 0).toLocaleString()} · 일상 ₩${(spend.daily || 0).toLocaleString()} · 부스 ₩${(spend.booth || 0).toLocaleString()}`);
  console.log(`최종: 골드 ₩${s.gold.toLocaleString()} · 팔로워 ${s.followers} · 인지도 ${s.fame} · 수집 ${(s.collection || []).length}종`);
}

describe("밸런스 리포트 (관찰용)", () => {
  it("성실형 vs 올인형 200일", () => {
    const diligent = runSim({ job: "conv", jobWhenBroke: null, boothBudget: 45000, orderBase: 80, acrylic: true, spendy: false });
    const allin = runSim({ job: null, jobWhenBroke: "logis", boothBudget: 45000, orderBase: 140, acrylic: true, spendy: true });
    report("성실형 (알바＋절약)", diligent);
    report("올인형 (무직→파산→상하차)", allin);
    expect(diligent.note.events).toBeGreaterThan(0);
  });
});
