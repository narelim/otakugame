import { describe, it, expect } from "vitest";
import { runSim, report, aggregate } from "./balanceSim.js";

/* ============================================================
   밸런스 리포트 시뮬 — "그럴듯한 플레이어" 200일. 검증용이 아니라 관찰용.
   npx vitest run tests/balance.report.test.js 로 실행하고 콘솔 표를 본다.
   시뮬 정책·리포트 본체는 balanceSim.js (랜덤 편차 때문에 5회 집계도 같이 본다).
   ============================================================ */

const PERSONAS = {
  diligent: { job: "conv", jobWhenBroke: null, boothBudget: 45000, orderBase: 80, acrylic: true, spendy: false, sellLeftovers: true },
  allin: { job: null, jobWhenBroke: "logis", boothBudget: 45000, orderBase: 140, acrylic: true, spendy: true, sellLeftovers: true },
};

describe("밸런스 리포트 (관찰용)", () => {
  it("성실형 vs 올인형 200일", () => {
    const diligent = runSim(PERSONAS.diligent);
    const allin = runSim(PERSONAS.allin);
    report("성실형 (알바＋절약)", diligent);
    report("올인형 (무직→파산→상하차)", allin);
    aggregate("성실형", PERSONAS.diligent, 5);
    aggregate("올인형", PERSONAS.allin, 5);
    expect(diligent.note.events).toBeGreaterThan(0);
  });
});
