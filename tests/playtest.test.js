import { describe, it, expect } from "vitest";
import { INITIAL_STATE, DAILY_ACTIONS } from "../src/data/gameData.js";
import { generateEventSchedule, isEventDay, advanceDay, nearestAppliedEvent } from "../src/systems/eventSystem.js";
import { simulateEvent, commitEventResult } from "../src/systems/eventSim.js";
import { performAction, sleepDay } from "../src/systems/dailySystem.js";
import { applyForJob, workShift, isWorkdayToday, hasWorkedToday, pendingWages, shiftWage, getJob } from "../src/systems/jobSystem.js";
import { gainOfficialGoods } from "../src/systems/collectionSystem.js";
import { hiatusGenre, resumeGenre, closeGenre, refandomBonus, applyRefandom } from "../src/systems/endingSystem.js";
import { myPostTemplates, canPostToday, publishMyPost } from "../src/systems/myPostSystem.js";
import { logTx } from "../src/systems/bankSystem.js";
import { normalizeLoaded } from "../src/systems/genreSystem.js";

/* ============================================================
   로직 플레이테스트 — 실제 플레이 흐름을 시스템 함수로 시뮬레이션하고
   불변식(골드/체력/멘탈 범위, 직렬화 가능, 월급 정합성 등)을 검증한다.
   ============================================================ */

function mkGenre(day) {
  const g = {
    id: "g1", name: "카일×유노", type: "CP", media: "게임", mediaGenre: "RPG",
    characters: [
      { id: "c1", name: "카일", appearanceTags: ["은발"], personalityTags: ["쿨한"], conceptTags: [], position: "주인공", popularity: "메이저" },
      { id: "c2", name: "유노", appearanceTags: ["금발"], personalityTags: ["명랑"], conceptTags: [], position: "히로인", popularity: "중간" },
    ],
    cp: { type: "고정충", gongId: "c1", suId: "c2", fixStrength: "선호 있음", contact: "공식 접점 있음", cpPopularity: "메이저 CP" },
    vibes: ["달달"], background: "판타지", description: "", nickname: "", birthday: null, famousLine: "", auTags: [],
    chars: "카일, 유노", cpType: "fixed", tags: ["달달"], desc: "",
    createdDay: day, isActive: true, fame: 0, followers: 0, fanTrust: 50, engagement: 50,
    assignedNPCs: null, imageTicketUsed: 0, imageTicketMax: 5, eventHistory: [], snsHistory: [],
  };
  g.eventSchedule = generateEventSchedule(g, day);
  return g;
}
function newState() {
  const s = structuredClone(INITIAL_STATE);
  s.screen = "studio";
  const g = mkGenre(1);
  return { ...s, genres: [g], activeGenreId: "g1", genre: g };
}
function invariants(s, tag) {
  expect(Number.isFinite(s.gold), `${tag}: gold finite`).toBe(true);
  expect(s.gold, `${tag}: gold >= 0`).toBeGreaterThanOrEqual(0);
  expect(s.stamina, `${tag}: stamina >= 0`).toBeGreaterThanOrEqual(0);
  expect(s.stamina, `${tag}: stamina <= 100`).toBeLessThanOrEqual(100);
  expect(s.mentalHealth, `${tag}: mental >= 0`).toBeGreaterThanOrEqual(0);
  expect(s.mentalHealth, `${tag}: mental <= 100`).toBeLessThanOrEqual(100);
  expect(() => JSON.stringify(s), `${tag}: serializable`).not.toThrow();
}

describe("통합 플레이 시뮬레이션", () => {
  it("70일 시뮬 — 알바·다중 행사·판매·월급 정합성·불변식", () => {
    let s = newState();
    // 취업 + 판매 굿즈 준비
    s = applyForJob(s, "conv");
    expect(getJob(s)).toBeTruthy();
    s = {
      ...s, goods: [
        { id: 1, artworkId: "a", type: "postcard", name: "엽서", imageData: "x", baseImage: "x", price: 1500, cost: 300, stock: 120 },
        { id: 2, artworkId: "a", type: "acrylic", name: "아크릴", imageData: "x", baseImage: "x", price: 4000, cost: 1500, stock: 30, outlined: true },
      ],
    };
    // 행사 2개 연속 신청 (다중 신청 회귀 테스트)
    const applicable = s.genre.eventSchedule.filter(e => e.startDay > s.day + 2 && (!e.requiresApplication || e.applyBy >= s.day));
    expect(applicable.length).toBeGreaterThanOrEqual(2);
    const [evA, evB] = applicable;
    s = { ...s, appliedEvents: [evA.id, evB.id], boothApp: { name: "테스트부스", desc: "", submitted: true } };
    s = { ...s, activeEvent: nearestAppliedEvent(s) };
    expect(s.activeEvent.id).toBe(evA.id); // 먼저 시작하는 행사가 활성이어야 함

    let workEarned = 0, eventsDone = 0, firstEventChecked = false;
    for (let d = 0; d < 70; d++) {
      if (getJob(s) && isWorkdayToday(s) && !hasWorkedToday(s) && !isEventDay(s) && s.stamina >= 15) {
        workEarned += shiftWage(getJob(s), 1);
        s = workShift(s, 1);
      }
      if (isEventDay(s)) {
        const before = s.day;
        const sim = simulateEvent(s);
        s = commitEventResult(s, sim);
        eventsDone++;
        expect(s.day).toBe(before + 1);
        if (!firstEventChecked) {
          firstEventChecked = true;
          // 먼저 신청한 행사가 끝나면 다음 신청 행사가 자동 승계되어야 함
          if (evB.startDay >= s.day) {
            expect(s.activeEvent && s.activeEvent.id).toBe(evB.id);
            expect(s.boothApp.submitted).toBe(true);
          }
        }
      } else {
        s = advanceDay(s);
        s = { ...s, pendingSnsEvent: null }; // 유저가 이벤트 배너를 닫았다고 가정
      }
      invariants(s, `day ${s.day}`);
    }
    expect(eventsDone).toBeGreaterThanOrEqual(1);
    // 월급 정합성: 입금된 월급 합 + 아직 미정산 적립 = 총 근무 적립
    const salarySum = (s.transactions || []).filter(t => t.label.includes("월급")).reduce((a, t) => a + t.amount, 0);
    expect(salarySum + pendingWages(s)).toBe(workEarned);
    expect(salarySum).toBeGreaterThan(0);
    // 행사 수익이 거래로그·성향통계에 기록되어야 함
    expect((s.transactions || []).some(t => t.label.includes("판매 수익"))).toBe(true);
    expect((s.stats.earn.event || 0)).toBeGreaterThan(0);
    expect((s.stats.earn.job || 0)).toBe(salarySum);
    // 출근 알림이 근무일 아침마다 도착해야 함
    expect(s.messages.some(m => m.text.includes("출근 알림"))).toBe(true);
    // 요약 출력 (밸런스 관찰용)
    console.log(`[70일 요약] 최종 골드 ₩${s.gold.toLocaleString()} · 행사 ${eventsDone}회(수익 ₩${(s.stats.earn.event || 0).toLocaleString()}) · 월급 ₩${salarySum.toLocaleString()} · 팔로워 ${s.followers} · 인지도 ${s.fame} · 메시지 ${s.messages.length}건`);
    // 저장 왕복
    const loaded = normalizeLoaded(JSON.parse(JSON.stringify(s)));
    expect(loaded.gold).toBe(s.gold);
    expect(loaded.job.jobId).toBe("conv");
    expect(loaded.screen).not.toBe("title");
  });
});

describe("일상 행동 (dailySystem)", () => {
  it("골드 부족·행동 슬롯·취침 하루 진행", () => {
    let s = structuredClone(INITIAL_STATE); s.screen = "studio";
    const eat = DAILY_ACTIONS.find(a => a.id === "eat");
    expect(performAction({ ...s, gold: 1000 }, eat).ok).toBe(false);          // 돈 부족
    const r = performAction(s, eat);
    expect(r.ok).toBe(true);
    expect(r.state.gold).toBe(s.gold - 3000);
    expect(r.state.stats.spend.daily).toBe(3000);                              // 성향 통계
    expect(performAction({ ...r.state, actionsToday: 2 }, eat).ok).toBe(false); // ACT_MAX
    const sl = sleepDay(r.state);
    expect(sl.ok).toBe(true);
    expect(sl.state.day).toBe(r.state.day + 1);
  });
});

describe("덕질장 (collectionSystem)", () => {
  it("수집품 획득·레어도·세트 완성 보너스", () => {
    let s = newState(); s.mentalHealth = 40;
    let setDone = false;
    for (let i = 0; i < 600 && !setDone; i++) {
      const g = gainOfficialGoods(s); s = g.state;
      expect(["N", "R", "SR", "SSR"]).toContain(g.item.rarity);
      expect(["카일", "유노"]).toContain(g.item.char);
      if (g.setDone) setDone = true;
    }
    expect(s.collection.length).toBeGreaterThan(0);
    expect(setDone).toBe(true);
    expect(s.collectionSets.length).toBeGreaterThanOrEqual(1);
    expect(s.messages.some(m => m.text.includes("세트 완성"))).toBe(true);
    invariants(s, "collection");
  });
});

describe("장르 엔딩 (endingSystem)", () => {
  it("휴덕 → 복귀 감쇠 → 탈덕 회고록 → 복덕 보너스", () => {
    let s = newState();
    s = { ...s, followers: 500, fame: 120, snsHistory: [{ id: 1, from: "@fan", text: "레전드 포스트", likes: 99 }, { id: 2, from: "@me", isMine: true, text: "내가 쓴 근황", likes: 3 }] };
    // 휴덕: 작업세트가 장르에 보존되고 무장르 상태
    const h = hiatusGenre(s, "g1");
    expect(h.genre).toBe(null);
    expect(h.genres[0].status).toBe("hiatus");
    expect(h.genres[0].followers).toBe(500);
    // 복귀: 감쇠 (팔로워 70%, 인지도 80%)
    const rz = resumeGenre(h, "g1");
    expect(rz.genre.id).toBe("g1");
    expect(rz.followers).toBe(350);
    expect(rz.fame).toBe(96);
    // 탈덕: 회고록 보존 + 장르 제거 + 멘탈 +10
    const beforeMental = rz.mentalHealth;
    const c = closeGenre(rz, "g1", "done");
    expect(c.genres.length).toBe(0);
    expect(c.genre).toBe(null);
    expect(c.archive.length).toBe(1);
    const m = c.archive[0];
    expect(m.genreName).toBe("카일×유노");
    expect(m.followers).toBe(350);
    expect(m.highlights[0].text).toBe("내가 쓴 근황"); // 내 포스트가 ♥ 수와 무관하게 우선
    expect(m.highlights[0].mine).toBe(true);
    expect(m.highlights[1].text).toBe("레전드 포스트");
    expect(m.reason).toBe("done");
    expect(c.mentalHealth).toBe(Math.min(100, beforeMental + 10));
    expect(c.messages.some(x => x.text.includes("계정 정리"))).toBe(true);
    // 복덕: 같은 이름 재파기 → 팔로워 보너스 + 회고록 카운트
    const rb = refandomBonus(c, "카일×유노");
    expect(rb).toBeTruthy();
    expect(rb.followers).toBeGreaterThan(0);
    const ap = applyRefandom({ ...c, followers: 0 }, rb);
    expect(ap.followers).toBe(rb.followers);
    expect(ap.archive[0].refandomCount).toBe(1);
    expect(refandomBonus(c, "없는장르")).toBe(null);
    // 옛 장르 소식: 무장르 + 보관소 상태로 300일 → 최소 1회 등장
    let t = { ...c, pendingSnsEvent: null };
    let seen = 0;
    for (let i = 0; i < 300; i++) {
      t = advanceDay(t);
      if (t.pendingSnsEvent && t.pendingSnsEvent.event.id === "old_genre_news") seen++;
      t = { ...t, pendingSnsEvent: null };
      invariants(t, `old-news day ${t.day}`);
    }
    expect(seen).toBeGreaterThan(0);
    console.log(`[엔딩] 옛 장르 소식 300일 중 ${seen}회 등장 (기대 ~15회)`);
  });
});

describe("내 포스트 (myPostSystem)", () => {
  it("상황별 템플릿 노출·발행 보상·하루 1회 제한", () => {
    let s = newState();
    s = { ...s, activeEvent: s.genre.eventSchedule[0], goods: [{ id: 1, type: "postcard", name: "엽서", baseImage: "img", imageData: "img", price: 1500, stock: 10 }], wardrobe: ["hoodie", "sailor"], collection: [{ name: "카일 하트 캔뱃지" }] };
    const tpls = myPostTemplates(s);
    expect(tpls.map(t => t.id)).toEqual(expect.arrayContaining(["wip", "promo", "ootd", "haul"]));
    expect(tpls.find(t => t.id === "promo").imageUrl).toBe("img"); // 행사 홍보엔 대표 굿즈 이미지
    expect(canPostToday(s)).toBe(true);
    const before = s.followers;
    s = publishMyPost(s, tpls[0]);
    expect(s.snsHistory[0].isMine).toBe(true);
    expect(s.followers).toBeGreaterThan(before);
    expect(s.flags.recentPost).toBe(true);
    expect(canPostToday(s)).toBe(false); // 하루 1회
  });
});

describe("은행/성향 통계 (bankSystem)", () => {
  it("골드 바닥 클램프 + 카테고리 누적 + 잔액 기록", () => {
    let s = structuredClone(INITIAL_STATE);
    s = { ...s, gold: 1000 };
    s = logTx(s, -5000, "테스트 지출", "💸", "goods");
    expect(s.gold).toBe(0); // 현재 정책: 0 밑으로 내려가지 않음
    expect(s.stats.spend.goods).toBe(5000);
    expect(s.transactions[0].balance).toBe(0);
    s = logTx(s, 3000, "테스트 수입", "💰", "event");
    expect(s.gold).toBe(3000);
    expect(s.stats.earn.event).toBe(3000);
  });
});
