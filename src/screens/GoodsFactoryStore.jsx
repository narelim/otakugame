import { useState, useEffect } from "react";
import { GOODS_TYPES, SAVE_KEY, BADGE_SHAPES } from "../data/gameData.js";
import { buildOutline } from "../utils/draw.js";
import { isEventDay } from "../systems/eventSystem.js";
import { logTx } from "../systems/bankSystem.js";

/* ============================================================
   굿즈팩토리 — 가로/밝은 웹 주문 페이지 (인터넷 사이트 톤에 맞춤)
   기존 GoodsFactoryScreen(세로)의 주문 로직을 그대로 재현. 세로 버전은 유지.
   흐름: 그림 선택 → 종류 → 옵션 → 견적/주문. + 주문 내역(제작중/재주문)
   ============================================================ */

const KRW = (n) => "₩" + (n || 0).toLocaleString();
const SIZES = ["S", "M", "L"];
let _seq = 0; // 주문 id 시퀀스 (렌더 순수성 위해 Date.now/random 미사용)

function loadArts() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

const STEPS = [["그림 선택", "🖼"], ["종류", "📦"], ["옵션", "⚙️"], ["견적·주문", "🧾"]];

export default function GoodsFactoryStore({ state, setState }) {
  const [tab, setTab] = useState("order");   // order | history
  const [step, setStep] = useState(1);
  const [arts, setArts] = useState(loadArts);
  const [artId, setArtId] = useState(null);
  const [gtype, setGtype] = useState(null);
  const [qty, setQty] = useState(0);
  const [size, setSize] = useState("M");
  const [shape, setShape] = useState("circle");
  const [outline, setOutline] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => { setArts(loadArts()); }, [tab]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t); }, [toast]);

  const t = gtype ? GOODS_TYPES.find(x => x.id === gtype) : null;
  const art = arts.find(a => a.id === artId);
  const total = t ? t.cost * qty : 0;
  const gold = state ? state.gold : 0;
  const orders = (state && state.orders) || [];
  const making = orders.filter(o => o.status === "making");
  const daysToEvent = (state && state.activeEvent) ? (state.activeEvent.startDay - state.day) : Infinity;

  const selType = (id) => { const tt = GOODS_TYPES.find(x => x.id === id); setGtype(id); setQty(tt.minQty); setOutline(!!tt.outline); if (tt.shapes) setShape(tt.shapes[0]); setStep(3); };
  const resetOrder = () => { setStep(1); setArtId(null); setGtype(null); setQty(0); setSize("M"); setShape("circle"); setOutline(true); };

  const finalize = (snap, opts, quantity, goodsType, outlineImage) => {
    const tt = GOODS_TYPES.find(x => x.id === goodsType);
    const order = { id: "ord_" + (++_seq) + "_" + orders.length, artworkId: opts.artworkId, artworkSnapshot: snap, goodsType, options: { size: opts.size, shape: tt.shapes ? opts.shape : undefined, hasOutline: tt.outline ? opts.hasOutline : false, price: tt.basePrice, outlineImage: outlineImage || undefined }, quantity, totalCost: tt.cost * quantity, orderedDay: state.day, readyDay: state.day + tt.prodDays, status: "making" };
    setState(s => { const ns = logTx(s, -order.totalCost, `굿즈 제작 · ${tt.name} ${quantity}개`, "🏭", "goods"); return { ...ns, orders: [order, ...(ns.orders || [])] }; });
    setToast({ t: `🏭 제작 시작! ${tt.name} ${quantity}개 · D-${tt.prodDays} 후 완성`, bad: false });
    resetOrder(); setTab("history");
  };
  const placeOrder = () => {
    if (!art || !t) return;
    if (isEventDay(state)) { setToast({ t: "🎪 행사 당일엔 주문할 수 없어요", bad: true }); return; }
    if (gold < total) { setToast({ t: "골드 부족!", bad: true }); return; }
    if (t.prodDays > daysToEvent) { setToast({ t: `제작 ${t.prodDays}일 → 신청 행사(D-${Math.max(0, daysToEvent)}) 전까지 못 받아요`, bad: true }); return; }
    const opts = { artworkId: artId, size, shape, hasOutline: outline };
    if (t.outline && outline) { setToast({ t: "외곽선 추출 중...", bad: false }); buildOutline(art.thumb, (o) => finalize(art.thumb, opts, qty, gtype, o)); }
    else finalize(art.thumb, opts, qty, gtype, null);
  };
  const reorder = (o) => {
    const tt = GOODS_TYPES.find(x => x.id === o.goodsType); if (!tt) return;
    if (gold < o.totalCost) { setToast({ t: "골드 부족!", bad: true }); return; }
    finalize(o.artworkSnapshot, { artworkId: o.artworkId, size: o.options.size, shape: o.options.shape, hasOutline: o.options.hasOutline }, o.quantity, o.goodsType, o.options.outlineImage);
  };

  const canNext = (step === 1 && artId) || (step === 2 && gtype);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#f4f7fb", color: "#1a3ba8", fontFamily: "'Noto Sans KR',sans-serif" }}>
      {/* 상단바 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", background: "#fff", borderBottom: "1px solid #e0e6f0", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setTab("order")} style={topTab(tab === "order")}>🆕 새 주문</button>
          <button onClick={() => setTab("history")} style={topTab(tab === "history")}>📜 주문 내역 ({orders.length})</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {making.length > 0 && <span style={{ fontSize: 12, color: "#2d5bff", fontWeight: 700 }}>🚚 제작중 {making.length}건</span>}
          <span style={{ fontSize: 14, fontWeight: 800, color: "#1a3ba8" }}>💰 {KRW(gold)}</span>
        </div>
      </div>
      {toast && <div style={{ padding: "9px 20px", fontSize: 13, textAlign: "center", background: toast.bad ? "#fdecef" : "#eafaf1", color: toast.bad ? "#d64560" : "#1e8e5a", borderBottom: "1px solid #e0e6f0", flexShrink: 0 }}>{toast.t}</div>}

      {tab === "history" ? (
        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            {!orders.length && <div style={{ textAlign: "center", color: "#98a", padding: 60, fontSize: 14 }}>주문 내역이 없어요</div>}
            {orders.map(o => { const tt = GOODS_TYPES.find(x => x.id === o.goodsType); const dleft = o.readyDay - state.day; const done = o.status !== "making"; return (
              <div key={o.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: 14, background: "#fff", borderRadius: 12, border: "1px solid #e0e6f0", marginBottom: 10 }}>
                <img src={o.artworkSnapshot} alt="" style={{ width: 52, height: 52, objectFit: "contain", background: "#f4f7fb", borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a3ba8" }}>{tt ? tt.name : o.goodsType} {o.quantity}개{o.options && o.options.hasOutline ? " ✂️" : ""}{o.options && o.options.shape ? ` (${o.options.shape})` : ""}</div>
                  <div style={{ fontSize: 12, color: "#889" }}>{KRW(o.totalCost)} · Day {o.orderedDay}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: done ? "#1e8e5a" : "#2d5bff" }}>{done ? "완료" : (dleft <= 0 ? "완성!" : `D-${dleft} 제작중`)}</div>
                </div>
                <button onClick={() => reorder(o)} disabled={gold < o.totalCost} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: gold >= o.totalCost ? "#2d5bff" : "#dde3ee", color: gold >= o.totalCost ? "#fff" : "#aab", fontWeight: 700, fontSize: 13, cursor: gold >= o.totalCost ? "pointer" : "not-allowed", flexShrink: 0 }}>재주문</button>
              </div>
            ); })}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* 좌: 단계 스텝퍼 */}
          <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid #e0e6f0", background: "#fff", padding: "24px 16px" }}>
            {STEPS.map(([label, ic], i) => { const n = i + 1; const active = step === n; const done = step > n; return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", borderRadius: 10, marginBottom: 4, background: active ? "#e8f0fe" : "transparent" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: active ? "#2d5bff" : done ? "#a9c2ff" : "#dde3ee", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{done ? "✓" : n}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: active ? "#1a3ba8" : "#889" }}>{ic} {label}</span>
              </div>
            ); })}
          </div>

          {/* 중앙: 단계 내용 */}
          <div style={{ flex: 1, overflow: "auto", padding: 28, minWidth: 0 }}>
            {step === 1 && (arts.length ? (
              <div>
                <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>어떤 그림으로 만들까요?</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 14 }}>
                  {arts.map(a => (
                    <button key={a.id} onClick={() => setArtId(a.id)} style={{ padding: 0, borderRadius: 12, overflow: "hidden", border: `3px solid ${artId === a.id ? "#2d5bff" : "#e0e6f0"}`, background: "#fff", cursor: "pointer" }}>
                      <img src={a.thumb} alt={a.name} style={{ width: "100%", display: "block", aspectRatio: "1", objectFit: "contain", background: "#fff" }} />
                      <div style={{ padding: "6px 8px", fontSize: 11, color: "#667", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : <div style={{ textAlign: "center", color: "#98a", padding: 60 }}>🎨 스튜디오에서 먼저 그림을 그려주세요</div>)}

            {step === 2 && (
              <div>
                <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>굿즈 종류를 선택하세요</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14 }}>
                  {GOODS_TYPES.map(g => (
                    <button key={g.id} onClick={() => selType(g.id)} style={{ padding: 18, borderRadius: 14, border: `2px solid ${gtype === g.id ? "#2d5bff" : "#e0e6f0"}`, background: "#fff", cursor: "pointer", textAlign: "left" }}>
                      <div style={{ fontSize: 34 }}>{g.icon}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a3ba8", marginTop: 6 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: "#889", marginTop: 4 }}>단가 {KRW(g.cost)} · 최소 {g.minQty}개</div>
                      <div style={{ fontSize: 12, color: "#2d5bff", marginTop: 2 }}>제작 {g.prodDays}일{g.outline ? " · 외곽따기" : ""}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && t && (
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                <div style={{ width: 240, flexShrink: 0 }}>
                  <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e0e6f0", padding: 16, textAlign: "center" }}>
                    {art && <img src={art.thumb} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain", background: "#f4f7fb", borderRadius: 8 }} />}
                    <div style={{ fontSize: 14, fontWeight: 800, marginTop: 10 }}>{t.icon} {t.name}</div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>옵션</h2>
                  <label style={lbl}>수량: <b style={{ color: "#2d5bff" }}>{qty}개</b> <span style={{ color: "#aab", fontWeight: 400 }}>({t.minQty}~{t.maxQty})</span></label>
                  <input type="range" min={t.minQty} max={t.maxQty} step={10} value={qty} onChange={e => setQty(Number(e.target.value))} style={{ width: "100%", accentColor: "#2d5bff", marginBottom: 20 }} />
                  <label style={lbl}>사이즈</label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {SIZES.map(s => <button key={s} onClick={() => setSize(s)} style={chip(size === s)}>{s}</button>)}
                  </div>
                  {t.shapes && <>
                    <label style={lbl}>모양</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                      {t.shapes.map(sh => <button key={sh} onClick={() => setShape(sh)} style={chip(shape === sh)}>{(BADGE_SHAPES.find(b => b.v === sh) || {}).t || sh}</button>)}
                    </div>
                  </>}
                  {t.outline && <>
                    <label style={lbl}>외곽 따기</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                      <button onClick={() => setOutline(true)} style={chip(outline)}>✂️ 외곽 따기</button>
                      <button onClick={() => setOutline(false)} style={chip(!outline)}>사각형</button>
                    </div>
                  </>}
                  <button onClick={() => setStep(4)} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "#2d5bff", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>견적 보기 →</button>
                </div>
              </div>
            )}

            {step === 4 && t && art && (
              <div style={{ maxWidth: 560 }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>🧾 견적 확인</h2>
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e0e6f0", padding: 24 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
                    <img src={art.thumb} alt="" style={{ width: 64, height: 64, objectFit: "contain", background: "#f4f7fb", borderRadius: 8 }} />
                    <div><div style={{ fontSize: 16, fontWeight: 800 }}>{t.icon} {t.name} {qty}개</div><div style={{ fontSize: 13, color: "#889", marginTop: 4 }}>{size} 사이즈{t.shapes ? ` · ${shape}` : ""}{t.outline && outline ? " · 외곽따기" : ""}</div></div>
                  </div>
                  {[["단가", KRW(t.cost)], ["수량", `${qty}개`], ["예상 판매가", KRW(t.basePrice) + " / 개"], ["제작 기간", `${t.prodDays}일 (D-${t.prodDays} 후 완성)`]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px dashed #e0e6f0", fontSize: 14 }}><span style={{ color: "#889" }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span></div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 4px", fontSize: 18, fontWeight: 900 }}><span>제작 비용</span><span style={{ color: "#2d5bff" }}>{KRW(total)}</span></div>
                  <button onClick={placeOrder} disabled={gold < total} style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 10, border: "none", background: gold < total ? "#dde3ee" : "#2d5bff", color: gold < total ? "#aab" : "#fff", fontWeight: 800, fontSize: 16, cursor: gold < total ? "not-allowed" : "pointer" }}>{gold < total ? "골드 부족" : "주문하기"}</button>
                </div>
              </div>
            )}
          </div>

          {/* 우: 하단 네비 (다음/이전) */}
          {step < 3 && (
            <div style={{ width: 140, flexShrink: 0, borderLeft: "1px solid #e0e6f0", background: "#fff", padding: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 }}>
              {step > 1 && <button onClick={() => setStep(step - 1)} style={{ padding: 10, borderRadius: 8, border: "1px solid #dde3ee", background: "#fff", color: "#889", cursor: "pointer", fontSize: 13 }}>← 이전</button>}
              <button onClick={() => { if (step === 1 && artId) setStep(2); }} disabled={!canNext} style={{ padding: 12, borderRadius: 8, border: "none", background: canNext ? "#2d5bff" : "#dde3ee", color: canNext ? "#fff" : "#aab", fontWeight: 800, fontSize: 14, cursor: canNext ? "pointer" : "not-allowed" }}>{step === 1 ? "다음 →" : "종류 선택"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const topTab = (active) => ({ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: active ? "#2d5bff" : "#eef2f9", color: active ? "#fff" : "#667" });
const lbl = { display: "block", fontSize: 13, fontWeight: 700, color: "#556", marginBottom: 8 };
const chip = (active) => ({ padding: "8px 16px", borderRadius: 20, border: `1px solid ${active ? "#2d5bff" : "#dde3ee"}`, background: active ? "#e8f0fe" : "#fff", color: active ? "#2d5bff" : "#889", fontWeight: 700, fontSize: 13, cursor: "pointer" });
