import { useState, useRef, useEffect } from "react";
import { BoothScene } from "../components/BoothStage.jsx";
import { simulateEvent, commitEventResult } from "../systems/eventSim.js";
import { SCALE_LABEL } from "../data/gameData.js";

/* ============================================================
   행사 당일 라이브 (데스크톱) — 내가 꾸민 부스(부.꾸 레이아웃)가 그대로 무대.
   준비 → 라이브(오픈→피크→마감→정리, 손님·구매 말풍선·재고 감소·골드 티커) → 정산.
   계산은 eventSim.simulateEvent 한 번, 연출은 그 결과를 타임라인에 뿌리는 것.
   ============================================================ */

const LIVE_MS = 36000;
const PHASES = [
  { id: "open",  name: "🔔 오픈",     t0: 0,    t1: 0.20 },
  { id: "peak",  name: "🔥 피크타임", t0: 0.20, t1: 0.65 },
  { id: "close", name: "🌆 마감 임박", t0: 0.65, t1: 0.92 },
  { id: "wrap",  name: "📦 정리",     t0: 0.92, t1: 1.01 },
];
const BUYER_LINES = ["이거 주세요!", "포카 남았나요?", "실물이 더 예뻐요…", "현금 되나요?", "전부 주세요!!", "작가님 팬이에요 🥺", "친구 것도 살게요", "아 미쳤다 이거", "회지 아직 있죠?!"];
const PASSER_LINES = ["지도가 어디…", "줄이 왜 이렇게 길어", "다음 부스 가자", "여기 뭐 팔지?"];
const KRW = (n) => "₩" + (n || 0).toLocaleString();
// 모듈 레벨 헬퍼 (컴파일러 순수성 규칙 — 랜덤/시계는 렌더 밖에서)
const nowMs = () => Date.now();
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const randHue = () => Math.floor(Math.random() * 360);

// 판매 계획: 굿즈별 판매량을 최대 6번의 구매 순간으로 쪼개 페이즈 가중 배치 (피크 60%)
function buildPurchasePlan(sim, goods) {
  const purchases = [];
  sim.soldResults.forEach(r => {
    if (r.sold <= 0) return; const g = goods.find(x => x.id === r.id); if (!g) return;
    const chunks = Math.min(6, r.sold); const base = Math.floor(r.sold / chunks); let rem = r.sold - base * chunks;
    for (let i = 0; i < chunks; i++) {
      const qty = base + (rem-- > 0 ? 1 : 0);
      const rr = Math.random(); const ph = rr < 0.6 ? PHASES[1] : rr < 0.8 ? PHASES[0] : PHASES[2];
      const t = (ph.t0 + Math.random() * (Math.min(ph.t1, 1) - ph.t0)) * LIVE_MS;
      purchases.push({ t, goodsId: g.id, name: g.name, qty, amount: qty * g.price });
    }
  });
  return purchases.sort((a, b) => a.t - b.t);
}

export default function EventDayScreen({ state, setState, onExit }) {
  const [view, setView] = useState("prep"); // prep | live | result
  const [now, setNow] = useState(0);
  const [goldLive, setGoldLive] = useState(0);
  const [visitors, setVisitors] = useState(0);
  const [ticker, setTicker] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [sim, setSim] = useState(null);
  const planRef = useRef(null);
  const timerRef = useRef(null);
  const idRef = useRef(1);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const ev = state.activeEvent;
  const ready = !!(state.boothApp && state.boothApp.submitted) && state.goods.length > 0;
  const progress = Math.min(1, now / LIVE_MS);
  const phase = PHASES.find(p => progress >= p.t0 && progress < p.t1) || PHASES[PHASES.length - 1];

  const pushTicker = (e) => setTicker(t => [{ ...e, id: idRef.current++ }, ...t].slice(0, 7));
  const spawnCustomer = (buyText) => {
    const id = idRef.current++;
    const c = { id, hue: randHue(), x: rand(0.1, 0.9), bubble: buyText || (chance(0.3) ? pick(PASSER_LINES) : null), buy: !!buyText };
    setCustomers(cs => [...cs.slice(-13), c]);
    setTimeout(() => setCustomers(cs => cs.filter(x => x.id !== id)), buyText ? 2600 : 1900);
  };
  const doPurchase = (p) => {
    setStockMap(m => ({ ...m, [String(p.goodsId)]: Math.max(0, (m[String(p.goodsId)] ?? 0) - p.qty) }));
    setGoldLive(g => g + p.amount);
    setVisitors(v => v + 1);
    spawnCustomer(pick(BUYER_LINES));
    pushTicker({ time: "판매", text: `${p.name} ${p.qty}개 +${KRW(p.amount)}`, type: "good" });
  };

  const start = () => {
    const s = simulateEvent(state); setSim(s);
    const purchases = buildPurchasePlan(s, state.goods);
    const intro = s.evs.filter(e => !/판매|완판|안 샀다|이월/.test(e.text));
    planRef.current = { purchases, intro, pi: 0, ii: 0, nextAmbient: 1200 };
    setStockMap(Object.fromEntries(state.goods.map(g => [String(g.id), g.stock])));
    setGoldLive(0); setVisitors(0); setTicker([]); setCustomers([]); setNow(0);
    setView("live");
    const t0 = nowMs();
    timerRef.current = setInterval(() => {
      const el = nowMs() - t0; setNow(el);
      const plan = planRef.current;
      while (plan.ii < plan.intro.length && el > (plan.ii + 1) * 1200) { pushTicker(plan.intro[plan.ii]); plan.ii++; }
      while (plan.pi < plan.purchases.length && plan.purchases[plan.pi].t <= el) { doPurchase(plan.purchases[plan.pi]); plan.pi++; }
      if (el >= plan.nextAmbient) { spawnCustomer(null); const pk = el / LIVE_MS; plan.nextAmbient = el + (pk > 0.2 && pk < 0.65 ? 650 : 1500) + rand(0, 700); }
      if (el >= LIVE_MS) { clearInterval(timerRef.current); timerRef.current = null; setTimeout(() => setView("result"), 500); }
    }, 120);
  };
  const finish = () => { setState(x => commitEventResult(x, sim)); onExit(); };
  const skip = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } if (!sim) return; setGoldLive(sim.goldEarned); setStockMap(Object.fromEntries(sim.soldResults.map(r => [String(r.id), r.remaining]))); setView("result"); };

  // 연출용 재고 반영 굿즈 배열
  const goodsLive = view === "live" ? state.goods.map(g => ({ ...g, stock: stockMap[String(g.id)] ?? g.stock })) : state.goods;

  // 손님 오버레이 (BoothScene children)
  const customerLayer = (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 30 }}>
      <style>{`@keyframes cPop{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      {customers.map(c => (
        <div key={c.id} style={{ position: "absolute", left: `${c.x * 100}%`, bottom: "-3%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", animation: "cPop .3s ease", zIndex: 30 }}>
          {c.bubble && <div style={{ marginBottom: 4, padding: "4px 9px", background: c.buy ? "#fff" : "rgba(255,255,255,0.85)", borderRadius: 10, fontSize: 11, fontWeight: 700, color: c.buy ? "#7c3aed" : "#6a6285", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>{c.bubble}</div>}
          <div style={{ width: 15, height: 15, borderRadius: "50%", background: `hsl(${c.hue} 42% 76%)`, border: "1px solid rgba(0,0,0,0.12)" }} />
          <div style={{ width: 23, height: 24, borderRadius: "8px 8px 3px 3px", background: `hsl(${c.hue} 38% 52%)`, marginTop: -2 }} />
        </div>))}
    </div>
  );

  // 공통 레이아웃 래퍼 (행사장 배경)
  const wrap = (content, side) => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#171225 0%,#221b38 62%,#33294f 62%,#2b2344 100%)", color: "#e0e0ff", fontFamily: "'Noto Sans KR',sans-serif", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 22px", background: "rgba(10,8,22,0.75)", borderBottom: "1px solid #2a2a4a", flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#ffd166" }}>🎪 {(ev && ev.name) || "행사 당일"}</div>
        {ev && <span style={{ fontSize: 11, color: "#9a8fc0" }}>{SCALE_LABEL[ev.scale] || ""} · 최대 판매 {ev.maxSales}개</span>}
        {view === "live" && <>
          <div style={{ flex: 1, maxWidth: 460, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 8, background: "#1a1530", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg,#7c3aed,#e94560,#ffd166)", transition: "width .12s linear" }} /></div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#c084fc", whiteSpace: "nowrap" }}>{phase.name}</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#ffd166", fontVariantNumeric: "tabular-nums" }}>💰 +{KRW(goldLive)}</span>
            <span style={{ fontSize: 12, color: "#06d6a0" }}>🛍 구매 {visitors}팀</span>
            <button onClick={skip} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #3a3a6a", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer" }}>⏩ 결과로</button>
          </div>
        </>}
        {view !== "live" && <button onClick={onExit} style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 8, border: "1px solid #3a3a6a", background: "transparent", color: "#9a8fc0", fontSize: 12, cursor: "pointer" }}>‹ 부스 접기 (나가기)</button>}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 18, padding: "16px 22px 0" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }}>
          {/* 옆 부스 실루엣 + 바닥 */}
          <div style={{ position: "absolute", left: "-3%", bottom: "6%", width: "14%", height: "48%", background: "linear-gradient(180deg,#241f3a,#1d1930)", borderRadius: 6, opacity: 0.85 }} />
          <div style={{ position: "absolute", right: "-3%", bottom: "6%", width: "14%", height: "48%", background: "linear-gradient(180deg,#241f3a,#1d1930)", borderRadius: 6, opacity: 0.85 }} />
          {content}
        </div>
        {side}
      </div>
    </div>
  );

  // ── 정산 ──
  if (view === "result" && sim) {
    const leftovers = sim.soldResults.filter(r => r.remaining > 0).map(r => ({ ...r, g: state.goods.find(x => x.id === r.id) })).filter(x => x.g);
    return wrap(
      <BoothScene state={state} keeper={state.avatar} goodsOverride={state.goods.map(g => { const r = sim.soldResults.find(x => x.id === g.id); return { ...g, stock: r ? r.remaining : g.stock }; })} style={{ height: "92%", marginBottom: "3%" }} />,
      <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16, overflow: "auto" }}>
        <div style={{ background: "#1a0a2e", border: "1px solid #7c3aed", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#c084fc", marginBottom: 12 }}>📋 행사 결과</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[{ l: "💰 수익", v: `+${KRW(sim.goldEarned)}`, c: "#ffd166" }, { l: "✨ 인지도", v: `+${sim.fameEarned}pt`, c: "#c084fc" }, { l: "⚡ 체력", v: `-${sim.staminaCost}%`, c: "#e94560" }, { l: "🧠 멘탈", v: `${sim.mentalChange >= 0 ? "+" : ""}${sim.mentalChange}%`, c: sim.mentalChange >= 0 ? "#06d6a0" : "#e94560" }].map(({ l, v, c }) =>
              <div key={l} style={{ padding: "10px 8px", background: "#12122a", borderRadius: 10, textAlign: "center" }}><div style={{ fontSize: 10, color: "#666" }}>{l}</div><div style={{ fontSize: 17, fontWeight: 900, color: c }}>{v}</div></div>)}
          </div>
          {leftovers.length > 0 && <div style={{ marginTop: 10, padding: 10, background: "#0a0a1a", borderRadius: 9 }}>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>📦 이월 재고 (다음 행사로)</div>
            {leftovers.map(x => <div key={x.id} style={{ fontSize: 11, color: "#c084fc" }}>{x.g.name}: {x.remaining}개</div>)}
          </div>}
        </div>
        <div style={{ background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14, padding: 14, flex: 1, overflow: "auto", minHeight: 80 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#9a8fc0", marginBottom: 8 }}>오늘의 기록</div>
          {sim.evs.map((e, i) => <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 11.5 }}><span style={{ color: "#555", minWidth: 48, flexShrink: 0 }}>{e.time}</span><span style={{ color: e.type === "great" ? "#ffd166" : e.type === "good" ? "#06d6a0" : e.type === "warning" ? "#e94560" : "#c7c0e0" }}>{e.text}</span></div>)}
        </div>
        <button onClick={finish} style={{ padding: 15, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c3aed,#e94560)", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.45)" }}>✦ 정산하고 하루 마무리</button>
      </div>
    );
  }

  // ── 라이브 ──
  if (view === "live") {
    return wrap(
      <BoothScene state={state} keeper={state.avatar} goodsOverride={goodsLive} style={{ height: "92%", marginBottom: "3%" }}>{customerLayer}</BoothScene>,
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
        <div style={{ background: "rgba(18,18,42,0.85)", border: "1px solid #2a2a4a", borderRadius: 14, padding: 13, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#9a8fc0", marginBottom: 8, flexShrink: 0 }}>📣 현장 상황</div>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 6 }}>
            {ticker.map(e => <div key={e.id} style={{ padding: "7px 10px", background: "#0e0e22", borderRadius: 9, borderLeft: `3px solid ${e.type === "great" ? "#ffd166" : e.type === "good" ? "#06d6a0" : e.type === "warning" ? "#e94560" : "#3a3a6a"}`, fontSize: 11.5, color: "#d5cdea" }}><span style={{ color: "#555", marginRight: 6 }}>{e.time}</span>{e.text}</div>)}
            {!ticker.length && <div style={{ fontSize: 11, color: "#555", textAlign: "center", padding: 16 }}>행사장이 열리기를 기다리는 중...</div>}
          </div>
        </div>
        <div style={{ background: "rgba(18,18,42,0.85)", border: "1px solid #2a2a4a", borderRadius: 14, padding: 13, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9a8fc0", marginBottom: 7 }}>📦 실시간 재고</div>
          {state.goods.map(g => { const left = stockMap[String(g.id)] ?? g.stock; const p = g.stock ? left / g.stock : 0;
            return (<div key={g.id} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 2 }}><span style={{ color: "#c7c0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>{g.name}</span><span style={{ color: left === 0 ? "#ffd166" : "#888", fontWeight: 700 }}>{left === 0 ? "완판! 🎉" : `${left}/${g.stock}`}</span></div>
              <div style={{ height: 4, background: "#0e0e22", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${p * 100}%`, background: p > 0.5 ? "#06d6a0" : p > 0.2 ? "#ffd166" : "#e94560", transition: "width .3s" }} /></div>
            </div>);})}
        </div>
      </div>
    );
  }

  // ── 준비 (프리뷰) ──
  return wrap(
    <BoothScene state={state} keeper={state.avatar} style={{ height: "92%", marginBottom: "3%" }} />,
    <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
      <div style={{ background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#ffd166", marginBottom: 6 }}>오늘은 행사 당일! 🎪</div>
        <div style={{ fontSize: 12, color: "#9a8fc0", lineHeight: 1.8 }}>내가 꾸민 부스가 그대로 펼쳐졌어요.<br />준비물을 확인하고 부스를 오픈하세요.</div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
          <div style={{ color: (state.boothApp && state.boothApp.submitted) ? "#06d6a0" : "#e94560" }}>{(state.boothApp && state.boothApp.submitted) ? "✓" : "✗"} 부스 신청 {(state.boothApp && state.boothApp.submitted) ? `— "${state.boothApp.name}"` : "(메이저랜드에서 신청 필요)"}</div>
          <div style={{ color: state.goods.length ? "#06d6a0" : "#e94560" }}>{state.goods.length ? "✓" : "✗"} 판매 굿즈 {state.goods.length ? `${state.goods.length}종 · 총 ${state.goods.reduce((a, g) => a + g.stock, 0)}개` : "(굿즈컴퍼니에서 제작 필요)"}</div>
        </div>
      </div>
      <button onClick={start} disabled={!ready} style={{ padding: 16, borderRadius: 12, border: "none", background: ready ? "linear-gradient(135deg,#e94560,#7c3aed)" : "#1a1a3a", color: ready ? "#fff" : "#555", fontWeight: 900, fontSize: 16, cursor: ready ? "pointer" : "not-allowed", boxShadow: ready ? "0 4px 22px rgba(233,69,96,0.45)" : "none" }}>{ready ? "🔔 부스 오픈!" : "🔒 준비가 덜 됐어요"}</button>
      <div style={{ fontSize: 10, color: "#555", textAlign: "center", lineHeight: 1.7 }}>행사는 오픈 → 피크 → 마감 순으로 진행돼요.<br />전시하지 않은 재고 굿즈도 자동으로 진열됩니다.</div>
    </div>
  );
}
