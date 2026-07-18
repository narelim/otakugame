import { useState, useRef, useEffect } from "react";
import { SAVE_KEY } from "../data/gameData.js";
import { BOOTH_VIEW_H, BOOTH_WIDTHS, BOOTH_ZONES, zoneOf, BOOTH_CATS, BOOTH_CATALOG, catalogItem, ART_POSTER_SIZES, ART_POSTER_MAX, artPosterSpec, goodsDisplaySpec, layoutBonuses, invFromLegacy, specFor, clampToZoneW, autoGoodsInstances } from "../data/boothData.js";
import { ItemVisual, GoodsImg } from "../components/BoothStage.jsx";
import { logTx } from "../systems/bankSystem.js";

/* ============================================================
   부스 플래너 v2 — "부.꾸" (마이홈 = 내 부스)
   - 실측(cm) 기반: 물품이 부스 폭 대비 실제 비율 크기로 배치됨
   - 존 제한: 상단 배너 / 뒷벽 / 테이블 위 / 테이블 앞 — 물품별 배치 가능 영역 고정
   - 종류별 최대 개수 제한, 효과는 배치 개수만큼 합산
   - 현수막은 갤러리의 내 그림을 인쇄 가능, 테이블보는 기성품(색·패턴 고정)
   레이아웃은 state.boothLayout({version:2,items:[...]})에 저장 → 세이브에 포함
   ============================================================ */

const KRW = (n) => "₩" + (n || 0).toLocaleString();
let _iid = 1;
const nextIid = () => "b" + Date.now().toString(36) + (_iid++);

function loadArts() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export default function BoothPlannerApp({ state, setState }) {
  const boothSize = (state && state.boothSize) || "small";
  const boothW = BOOTH_WIDTHS[boothSize] || 90;
  const genreName = state && state.genre && state.genre.name;
  const gold = state ? state.gold : null;
  const inv = (state && state.boothInv) || invFromLegacy(state && state.boothItems);

  const [placed, setPlaced] = useState(() => {
    const l = state && state.boothLayout;
    const items = (l && l.version === 2 && Array.isArray(l.items)) ? l.items : [];
    const goodsArr = (state && state.goods) || [];
    // 규격 변경(뷰 높이·존) 대비 재클램프 + 재고 없어진 굿즈 전시물 제거
    return items
      .filter(p => p.kind !== "goods" || goodsArr.some(g => String(g.id) === String(p.refId) && g.stock > 0))
      .map(p => { const c = specFor(p); return c ? { ...p, ...clampToZoneW(c, p.x, p.y, BOOTH_WIDTHS[(state && state.boothSize) || "small"] || 120) } : null; }).filter(Boolean);
  });
  const [selected, setSelected] = useState(null);
  const [cat, setCat] = useState("banner"); // 카테고리 id | "art"
  const [view, setView] = useState("edit"); // edit | checkout
  const [toast, setToast] = useState(null);
  const [dragZone, setDragZone] = useState(null); // 드래그 중 존 하이라이트
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2000); return () => clearTimeout(t); }, [toast]);

  const arts = loadArts();
  const countOf = (refId) => placed.filter(p => p.kind === "item" && p.refId === refId).length;
  const posterCount = placed.filter(p => p.kind === "art").length;
  // 제작 굿즈: 재고 있는 것만, 종류(굿즈 id)당 1개 전시. 직접 전시 안 하면 자동 전시.
  const stockedGoods = ((state && state.goods) || []).filter(g => g.stock > 0);
  const goodsById = (id) => stockedGoods.find(g => String(g.id) === String(id)) || null;
  const placedGoodsIds = new Set(placed.filter(p => p.kind === "goods").map(p => String(p.refId)));

  const clampToZone = (c, x, y) => clampToZoneW(c, x, y, boothW);

  const addItem = (c) => {
    if (cat === "goods") {
      if (placedGoodsIds.has(String(c.id))) { setToast("이미 전시 중인 굿즈예요 (종류당 1개)"); return; }
      const spec = goodsDisplaySpec(c.type);
      const z = zoneOf(spec.zone);
      const pos = clampToZone(spec, 0.5, (z.y0 + z.y1) / 2 / BOOTH_VIEW_H);
      const inst = { iid: nextIid(), kind: "goods", refId: c.id, gtype: c.type, name: c.name, ...pos };
      setPlaced(p => [...p, inst]); setSelected(inst.iid); return;
    }
    if (cat === "art") {
      if (posterCount >= ART_POSTER_MAX) { setToast(`포스터는 최대 ${ART_POSTER_MAX}장까지!`); return; }
      const pos = clampToZone(artPosterSpec("a3"), 0.5, 0.4);
      const inst = { iid: nextIid(), kind: "art", refId: c.id, name: c.name, img: c.img, size: "a3", ...pos };
      setPlaced(p => [...p, inst]); setSelected(inst.iid); return;
    }
    if (countOf(c.id) >= c.max) { setToast(`${c.name}은(는) 최대 ${c.max}개까지!`); return; }
    const z = zoneOf(c.zone);
    const pos = clampToZone(c, 0.5, (z.y0 + z.y1) / 2 / BOOTH_VIEW_H);
    const inst = { iid: nextIid(), kind: "item", refId: c.id, ...pos };
    // 테이블보는 1장: 기존 것을 교체
    setPlaced(p => { const base = catalogItem(c.id).cat === "cloth" ? p.filter(q => !(q.kind === "item" && (catalogItem(q.refId) || {}).cat === "cloth")) : p; return [...base, inst]; });
    setSelected(inst.iid);
  };

  const specOf = specFor;
  const onDown = (e, inst) => {
    e.stopPropagation(); setSelected(inst.iid);
    const r = stageRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    dragRef.current = { iid: inst.iid, dx: px - inst.x, dy: py - inst.y };
    setDragZone(specOf(inst).zone);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onMove = (e) => {
    const d = dragRef.current; // setState 업데이터는 지연 실행되므로 지금 시점 값을 캡처 (onUp이 먼저 비워도 안전)
    if (!d || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - d.dx;
    const py = (e.clientY - r.top) / r.height - d.dy;
    setPlaced(ps => ps.map(p => { if (p.iid !== d.iid) return p; const spec = specOf(p); if (!spec) return p; return { ...p, ...clampToZone(spec, px, py) }; }));
  };
  const onUp = (e) => { dragRef.current = null; setDragZone(null); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ } };

  const reorder = (iid, dir) => setPlaced(ps => { const i = ps.findIndex(p => p.iid === iid); if (i < 0) return ps; const arr = [...ps]; const [it] = arr.splice(i, 1); if (dir === "front") arr.push(it); else arr.unshift(it); return arr; });
  const removeItem = (iid) => { setPlaced(ps => ps.filter(p => p.iid !== iid)); if (selected === iid) setSelected(null); };
  const selInst = placed.find(p => p.iid === selected) || null;
  const selSpec = selInst ? specOf(selInst) : null;

  // 구매 계산: refId별 필요 수량 vs 보유 수량
  const needMap = {};
  placed.forEach(p => { if (p.kind === "item") needMap[p.refId] = (needMap[p.refId] || 0) + 1; });
  const buyLines = Object.entries(needMap).map(([id, need]) => { const c = catalogItem(id); const own = inv[id] || 0; const buy = Math.max(0, need - own); return { id, name: c.name, need, own: Math.min(own, need), buy, price: c.price, sum: buy * c.price }; });
  const total = buyLines.reduce((s, l) => s + l.sum, 0);
  const bonus = layoutBonuses({ version: 2, items: placed });

  const pay = () => {
    if (setState) {
      setState(s => {
        let ns = total > 0 ? logTx(s, -total, "부스 물품 구매", "🏪", "booth") : s;
        const newInv = { ...((ns.boothInv) || invFromLegacy(ns.boothItems)) };
        Object.entries(needMap).forEach(([id, need]) => { newInv[id] = Math.max(newInv[id] || 0, need); });
        return { ...ns, boothInv: newInv, boothLayout: { version: 2, boothSize, items: placed } };
      });
    }
    setToast(total > 0 ? `✦ 구매 및 저장 완료! (추가구매 ${KRW(total)})` : "✦ 저장 완료! (추가구매 없음)");
    setView("edit");
  };

  const catalog = cat === "art"
    ? arts.map(a => ({ id: a.id, name: a.name || "그림", img: a.thumb, art: true }))
    : cat === "goods"
      ? stockedGoods.map(g => ({ id: g.id, name: g.name, img: g.imageData, goods: true, type: g.type, stock: g.stock }))
      : BOOTH_CATALOG.filter(c => c.cat === cat);
  const catInfo = BOOTH_CATS.find(x => x.id === cat);

  // 자동 전시: 직접 전시하지 않은 재고 굿즈를 존별로 자동 배열 (저장 안 됨 — 항상 파생)
  const autoInstances = autoGoodsInstances(stockedGoods.filter(g => !placedGoodsIds.has(String(g.id))), boothW);

  // ── 스테이지 (실측 비율 부스 정면 뷰) — 렌더 함수 (컴포넌트 아님) ──
  const renderStage = (readonly) => {
    const zonePct = (z) => ({ top: `${z.y0 / BOOTH_VIEW_H * 100}%`, height: `${(z.y1 - z.y0) / BOOTH_VIEW_H * 100}%` });
    const tableZ = zoneOf("table"), frontZ = zoneOf("front");
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "10px 10px 0", background: "linear-gradient(180deg,#1c1830 0%,#262040 66%,#38315a 66%,#2e2848 100%)", overflow: "hidden", boxSizing: "border-box" }}>
        {/* 행사장 연출: 옆 부스 실루엣 + 바닥 */}
        <div style={{ position: "absolute", left: "-4%", bottom: "10%", width: "16%", height: "52%", background: "linear-gradient(180deg,#241f3a,#1d1930)", borderRadius: 6, opacity: 0.8, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: "-4%", bottom: "10%", width: "16%", height: "52%", background: "linear-gradient(180deg,#241f3a,#1d1930)", borderRadius: 6, opacity: 0.8, pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "10%", background: "linear-gradient(180deg,#403866,#332c52)", pointerEvents: "none" }} />
        <div ref={readonly ? null : stageRef} onPointerDown={readonly ? undefined : () => setSelected(null)}
          style={{ position: "relative", aspectRatio: `${boothW} / ${BOOTH_VIEW_H}`, maxWidth: "97%", maxHeight: "96%", width: boothW >= 240 ? "97%" : "auto", height: boothW >= 240 ? "auto" : "96%", marginBottom: "4%", background: "linear-gradient(180deg,#efeaf8 0%,#e6dff2 100%)", borderRadius: "8px 8px 4px 4px", boxShadow: "0 14px 50px rgba(0,0,0,0.55)" }}>
          {/* 배너봉 / 뒷벽 / 테이블 구조 */}
          <div style={{ position: "absolute", left: "2%", right: "2%", top: `${zoneOf("top").y1 / BOOTH_VIEW_H * 100}%`, height: 3, background: "#8a8098", borderRadius: 2 }} />
          <div style={{ position: "absolute", left: 0, right: 0, ...zonePct(zoneOf("wall")), background: "linear-gradient(180deg,#ded6ee,#d4cbe8)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, ...zonePct(tableZ), background: "linear-gradient(180deg,#cfc4e6 0%,#c3b6de 12%,#bfb2db 100%)", borderTop: "3px solid #a99ac9" }} />
          <div style={{ position: "absolute", left: 0, right: 0, ...zonePct(frontZ), background: "#b1a3d1", borderTop: "2px solid #9d8dc0" }} />
          {/* 드래그 중 존 하이라이트 */}
          {!readonly && dragZone && <div style={{ position: "absolute", left: 0, right: 0, ...zonePct(zoneOf(dragZone)), background: "rgba(124,58,237,0.12)", border: "2px dashed rgba(124,58,237,0.55)", zIndex: 5, pointerEvents: "none", boxSizing: "border-box" }} />}
          {/* 물품 (자동 전시 굿즈는 맨 아래 레이어, 직접 배치가 위) */}
          {[...autoInstances, ...placed].map(p => { const c = specOf(p); if (!c) return null;
            const rw = ((p.kind === "item" && c.fullWidth) ? boothW : c.w) / boothW * 100, rh = c.h / BOOTH_VIEW_H * 100;
            const interactive = !readonly && !p.auto;
            return (
              <div key={p.iid}
                onPointerDown={interactive ? (e) => onDown(e, p) : undefined} onPointerMove={interactive ? onMove : undefined} onPointerUp={interactive ? onUp : undefined}
                style={{ position: "absolute", left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${rw}%`, height: `${rh}%`, transform: "translate(-50%,-50%)", touchAction: "none", cursor: interactive ? "move" : "default", userSelect: "none", zIndex: p.auto ? 8 : 10, outline: !readonly && selected === p.iid ? "2.5px solid #7c3aed" : "none", outlineOffset: 2, borderRadius: 4, pointerEvents: p.auto ? "none" : "auto" }}>
                {p.kind === "art"
                  ? <img src={p.img} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", border: "3px solid #fff", boxSizing: "border-box", borderRadius: 3, boxShadow: "0 3px 10px rgba(0,0,0,0.3)" }} />
                  : p.kind === "goods"
                    ? <GoodsImg goods={goodsById(p.refId)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                    : <ItemVisual c={catalogItem(p.refId)} inst={p} genreName={genreName} />}
                {p.auto && !readonly && <span style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", fontSize: 8, padding: "1px 6px", borderRadius: 7, background: "rgba(13,13,26,0.65)", color: "#9a8fc0", whiteSpace: "nowrap", pointerEvents: "none" }}>자동</span>}
              </div>);
          })}
          {!readonly && placed.length === 0 && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9a8fc0", fontSize: 14, pointerEvents: "none", textAlign: "center" }}>← 왼쪽 카탈로그에서 물품을 골라<br />부스를 꾸며보세요</div>}
        </div>
        {/* 존 라벨 (스테이지 옆) */}
        {!readonly && <div style={{ position: "absolute", right: 8, top: 8, display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "#7a7295", pointerEvents: "none" }}>
          {BOOTH_ZONES.map(z => <span key={z.id} style={{ padding: "2px 8px", background: "rgba(13,13,26,0.55)", borderRadius: 8, color: dragZone === z.id ? "#c084fc" : "#8a80a8" }}>{z.name}</span>)}
        </div>}
      </div>
    );
  };

  // ── 결제 화면 ──
  if (view === "checkout") return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Noto Sans KR',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #2a2a4a", background: "#12122a" }}>
        <button onClick={() => setView("edit")} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #2a2a4a", background: "transparent", color: "#9a8fc0", cursor: "pointer", fontSize: 13 }}>‹ 돌아가기</button>
        <div style={{ padding: "8px 16px", borderRadius: 8, background: "#1a1a3a", fontSize: 14, fontWeight: 800, color: "#ffd166" }}>💰 현재 재산 {gold != null ? KRW(gold) : "—"}</div>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 20, padding: 24, overflow: "hidden" }}>
        <div style={{ width: 360, flexShrink: 0, background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#c084fc", marginBottom: 4 }}>🧾 영수증</div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 14 }}>보유 수량만큼은 무료, 초과분만 결제</div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {buyLines.map(l => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #2a2a4a", fontSize: 13, gap: 8 }}>
                <span style={{ color: "#c7c0e0", flex: 1 }}>{l.name} ×{l.need}{l.own > 0 && <span style={{ color: "#06d6a0", fontSize: 11 }}> (보유 {l.own})</span>}</span>
                <span style={{ color: l.buy ? "#9a8fc0" : "#06d6a0", flexShrink: 0 }}>{l.buy ? KRW(l.sum) : "무료"}</span>
              </div>))}
            {posterCount > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #2a2a4a", fontSize: 13 }}><span style={{ color: "#7a7a9a" }}>내 그림 포스터 ×{posterCount}</span><span style={{ color: "#06d6a0", fontSize: 12 }}>무료</span></div>}
            {placed.filter(p => p.kind === "goods").length > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #2a2a4a", fontSize: 13 }}><span style={{ color: "#7a7a9a" }}>굿즈 직접 전시 ×{placed.filter(p => p.kind === "goods").length}</span><span style={{ color: "#06d6a0", fontSize: 12 }}>무료</span></div>}
            {!buyLines.length && !posterCount && <div style={{ color: "#555", fontSize: 12, padding: "12px 0" }}>배치된 부스 물품 없음</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #2a2a4a", marginTop: 8, fontSize: 16, fontWeight: 800 }}>
            <span>총 가격</span><span style={{ color: "#ffd166" }}>{KRW(total)}</span>
          </div>
          <button onClick={pay} disabled={gold != null && gold < total} style={{ marginTop: 12, padding: "13px", borderRadius: 10, border: "none", background: gold != null && gold < total ? "#333" : "linear-gradient(135deg,#7c3aed,#e94560)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: gold != null && gold < total ? "not-allowed" : "pointer" }}>{gold != null && gold < total ? "골드 부족" : "결제하기"}</button>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div style={{ flex: 1, position: "relative", background: "#0a0a18", border: "1px solid #2a2a4a", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 12, top: 10, fontSize: 12, color: "#9a8fc0", zIndex: 20 }}>📸 배치 미리보기</div>
            {renderStage(true)}
          </div>
          <div style={{ height: 130, flexShrink: 0, background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#06d6a0", marginBottom: 12 }}>✨ 물품 효과 (개수만큼 합산)</div>
            <div style={{ display: "flex", gap: 30 }}>
              <div><div style={{ fontSize: 11, color: "#888" }}>인지도 보너스</div><div style={{ fontSize: 24, fontWeight: 800, color: "#4cc9f0" }}>+{Math.round(bonus.fame * 100)}%</div></div>
              <div><div style={{ fontSize: 11, color: "#888" }}>판매율 보너스</div><div style={{ fontSize: 24, fontWeight: 800, color: "#06d6a0" }}>+{Math.round(bonus.sell * 100)}%</div></div>
              <div><div style={{ fontSize: 11, color: "#888" }}>배치 물품</div><div style={{ fontSize: 24, fontWeight: 800, color: "#c084fc" }}>{placed.length}개</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── 편집 화면 ──
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Noto Sans KR',sans-serif", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid #2a2a4a", background: "#12122a" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#c084fc" }}>🏪 부.꾸 — 꿈의 부스를 만들어보자!</div>
        <div style={{ fontSize: 12, color: "#9a8fc0" }}>부스 {boothSize === "small" ? "1부스 (책상 120cm)" : boothSize === "medium" ? "2부스 (책상 240cm)" : "4부스 (책상 480cm)"} · 디스플레이 높이 상판 위 170cm · 실측 비율</div>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 좌: 카탈로그 */}
        <div style={{ width: 222, flexShrink: 0, borderRight: "1px solid #2a2a4a", background: "#0f0f24", display: "flex", flexDirection: "column", padding: 10, gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
            {[...BOOTH_CATS, { id: "goods", name: "굿즈", icon: "🧸", color: "#ffd166" }, { id: "art", name: "내 그림", icon: "🖼", color: "#9a8fc0" }].map(c => (
              <button key={c.id} onClick={() => setCat(c.id)} title={c.name} style={{ padding: "7px 0 5px", borderRadius: 8, border: `1px solid ${cat === c.id ? "#7c3aed" : "transparent"}`, cursor: "pointer", background: cat === c.id ? "#2a1a4a" : "#1a1a3a", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <span style={{ fontSize: 15 }}>{c.icon}</span><span style={{ fontSize: 8, fontWeight: 700, color: cat === c.id ? "#c084fc" : "#777" }}>{c.name}</span>
              </button>))}
          </div>
          <div style={{ fontSize: 10, color: "#666", lineHeight: 1.5, padding: "2px 2px 0" }}>
            {cat === "art" ? `🖼 갤러리 그림을 뒷벽 포스터로 (A4~B2 크기 선택) · 최대 ${ART_POSTER_MAX}장`
              : cat === "goods" ? "🧸 제작한 굿즈 직접 전시 (종류당 1개) · 안 하면 자동 전시"
                : `${catInfo.icon} ${catInfo.desc}`}
          </div>
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {catalog.length ? catalog.map(c => {
              const isGoods = !!c.goods;
              const goodsPlaced = isGoods && placedGoodsIds.has(String(c.id));
              const cnt = c.art ? posterCount : isGoods ? (goodsPlaced ? 1 : 0) : countOf(c.id);
              const maxN = c.art ? ART_POSTER_MAX : isGoods ? 1 : c.max;
              const full = cnt >= maxN;
              const own = (c.art || isGoods) ? 0 : (inv[c.id] || 0);
              const gspec = isGoods ? goodsDisplaySpec(c.type) : null;
              return (
                <button key={c.id} onClick={() => addItem(c)} disabled={full} style={{ display: "flex", alignItems: "center", gap: 9, padding: 8, borderRadius: 10, border: "1px solid #2a2a4a", background: "#12122a", cursor: full ? "not-allowed" : "pointer", textAlign: "left", opacity: full ? 0.45 : 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: (c.art || isGoods) ? "#fff" : "#0a0a18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, overflow: "hidden" }}>{(c.art || isGoods) ? <img src={c.img} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : c.icon}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e0e0ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "#9a8fc0" }}>{c.art ? "무료 배치" : isGoods ? <span style={{ color: goodsPlaced ? "#ffd166" : "#06d6a0" }}>{goodsPlaced ? "✓ 전시 중" : `재고 ${c.stock}개 · 무료 전시`}</span> : <>{own >= (countOf(c.id) + 1) ? <span style={{ color: "#06d6a0" }}>보유 · 무료</span> : KRW(c.price)} · {c.w}×{c.h}cm</>}</div>
                    {!c.art && !isGoods && <div style={{ fontSize: 9, color: "#666" }}>{zoneOf(c.zone).name} · <span style={{ color: cnt ? "#ffd166" : "#666" }}>{cnt}/{c.max}개</span></div>}
                    {isGoods && <div style={{ fontSize: 9, color: "#666" }}>{zoneOf(gspec.zone).name}에 전시</div>}
                  </div>
                </button>);
            }) : <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 20 }}>{cat === "art" ? "저장된 그림이 없어요" : cat === "goods" ? "재고 있는 굿즈가 없어요\n(굿즈컴퍼니에서 제작하세요)" : "물품이 없어요"}</div>}
          </div>
        </div>

        {/* 중앙: 스테이지 + 선택 정보 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ flex: 1, position: "relative", margin: 12, borderRadius: 12, overflow: "hidden", border: "1px solid #2a2a4a" }}>
            {renderStage(false)}
          </div>
          <div style={{ display: "flex", gap: 6, padding: "0 12px 8px", flexWrap: "wrap" }}>
            <button onClick={() => selInst && reorder(selInst.iid, "front")} disabled={!selInst} style={arrangeBtn(!selInst)}>⬆ 앞으로</button>
            <button onClick={() => selInst && reorder(selInst.iid, "back")} disabled={!selInst} style={arrangeBtn(!selInst)}>⬇ 뒤로</button>
            <button onClick={() => selInst && removeItem(selInst.iid)} disabled={!selInst} style={{ ...arrangeBtn(!selInst), color: selInst ? "#e94560" : "#444" }}>🗑 삭제</button>
            {selSpec && <span style={{ alignSelf: "center", fontSize: 11, color: "#7a7295", marginLeft: 6 }}>📍 {zoneOf(selSpec.zone).name} 영역에만 배치 가능 · {selSpec.fullWidth ? `부스 전체폭` : `${selSpec.w}×${selSpec.h}cm`}</span>}
          </div>
          <div style={{ display: "flex", gap: 12, margin: "0 12px 12px", padding: 12, background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 12, minHeight: 84, alignItems: "center" }}>
            {selInst ? (<>
              <div style={{ width: 56, height: 56, borderRadius: 8, background: selInst.kind === "goods" ? "#fff" : "#0a0a18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0, overflow: "hidden" }}>
                {selInst.kind === "art" ? <img src={selInst.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : selInst.kind === "goods" ? <GoodsImg goods={goodsById(selInst.refId)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : (selInst.artImg ? <img src={selInst.artImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : catalogItem(selInst.refId).icon)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{selInst.kind === "art" ? `내 그림 포스터 · ${selInst.name}` : selInst.kind === "goods" ? `굿즈 전시 · ${selInst.name}` : catalogItem(selInst.refId).name}</div>
                <div style={{ fontSize: 11, color: "#9a8fc0", marginTop: 3 }}>
                  {selInst.kind === "art" ? `${(ART_POSTER_SIZES.find(s => s.id === (selInst.size || "a3")) || {}).name || "A3"} 포스터 · 무료`
                    : selInst.kind === "goods" ? `재고 ${(goodsById(selInst.refId) || {}).stock || 0}개 · 종류당 1개 전시 · 무료 (전시 안 하면 자동 배치)`
                      : <>{catalogItem(selInst.refId).desc} · <span style={{ color: "#4cc9f0" }}>인지도 +{Math.round((catalogItem(selInst.refId).fameBonus || 0) * 100)}%</span> <span style={{ color: "#06d6a0" }}>판매율 +{Math.round((catalogItem(selInst.refId).sellBonus || 0) * 100)}%</span> (개당)</>}
                </div>
              </div>
              {/* 포스터 크기 선택 */}
              {selInst.kind === "art" && (
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 10, color: "#888", flexShrink: 0 }}>📐 크기:</span>
                  {ART_POSTER_SIZES.map(s => { const on = (selInst.size || "a3") === s.id;
                    return (<button key={s.id} onClick={() => setPlaced(ps => ps.map(p => p.iid === selInst.iid ? { ...p, size: s.id, ...clampToZone(artPosterSpec(s.id), p.x, p.y) } : p))} style={{ padding: "7px 11px", borderRadius: 7, border: `1.5px solid ${on ? "#7c3aed" : "#2a2a4a"}`, background: on ? "#2a1a4a" : "#12122a", color: on ? "#c084fc" : "#888", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{s.name}</button>); })}
                </div>)}
              {/* 현수막 인쇄: 갤러리 그림 적용 */}
              {selInst.kind === "item" && catalogItem(selInst.refId).printable && (
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, maxWidth: 300, overflow: "auto" }}>
                  <span style={{ fontSize: 10, color: "#888", flexShrink: 0 }}>🎨 인쇄:</span>
                  <button onClick={() => setPlaced(ps => ps.map(p => p.iid === selInst.iid ? { ...p, artImg: null } : p))} title="기본 디자인" style={{ width: 34, height: 34, borderRadius: 6, border: `2px solid ${!selInst.artImg ? "#7c3aed" : "#2a2a4a"}`, background: "linear-gradient(120deg,#7c3aed,#e94560,#ffd166)", cursor: "pointer", flexShrink: 0 }} />
                  {arts.slice(0, 8).map(a => (
                    <button key={a.id} onClick={() => setPlaced(ps => ps.map(p => p.iid === selInst.iid ? { ...p, artImg: a.thumb } : p))} title={a.name} style={{ width: 34, height: 34, borderRadius: 6, border: `2px solid ${selInst.artImg === a.thumb ? "#7c3aed" : "#2a2a4a"}`, padding: 0, background: "#fff", cursor: "pointer", overflow: "hidden", flexShrink: 0 }}>
                      <img src={a.thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>))}
                </div>)}
            </>) : <div style={{ fontSize: 13, color: "#555" }}>물품을 선택하면 정보가 여기 표시돼요 · 현수막은 선택 후 내 그림을 인쇄할 수 있어요</div>}
          </div>
        </div>

        {/* 우: 배치 목록 + 효과 + 결제 */}
        <div style={{ width: 210, flexShrink: 0, borderLeft: "1px solid #2a2a4a", background: "#0f0f24", display: "flex", flexDirection: "column", padding: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#ffd166", marginBottom: 8 }}>📋 배치된 물품 ({placed.length})</div>
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
            {placed.length ? [...placed].reverse().map(p => { const c = p.kind === "item" ? catalogItem(p.refId) : null;
              const icon = p.kind === "art" ? "🖼" : p.kind === "goods" ? "🧸" : (c && c.icon);
              const nm = p.kind === "item" ? (c && c.name) : p.name;
              return (
                <button key={p.iid} onClick={() => setSelected(p.iid)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, border: `1px solid ${selected === p.iid ? "#7c3aed" : "#2a2a4a"}`, background: selected === p.iid ? "#2a1a4a" : "#12122a", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 11.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#c7c0e0" }}>{nm}</span>
                  <span style={{ fontSize: 15, color: "#e94560", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); removeItem(p.iid); }}>×</span>
                </button>);
            }) : <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 16 }}>아직 배치한 물품이 없어요</div>}
            {autoInstances.length > 0 && <div style={{ fontSize: 10, color: "#666", padding: "6px 2px", lineHeight: 1.5 }}>🧸 자동 전시 {autoInstances.length}개 — 직접 배치하지 않은 재고 굿즈는 알아서 진열돼요</div>}
          </div>
          <div style={{ borderTop: "1px solid #2a2a4a", marginTop: 8, paddingTop: 10 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <div style={{ flex: 1, padding: "6px 4px", background: "#101a2e", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 9, color: "#666" }}>인지도</div><div style={{ fontSize: 14, fontWeight: 800, color: "#4cc9f0" }}>+{Math.round(bonus.fame * 100)}%</div></div>
              <div style={{ flex: 1, padding: "6px 4px", background: "#0e2018", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 9, color: "#666" }}>판매율</div><div style={{ fontSize: 14, fontWeight: 800, color: "#06d6a0" }}>+{Math.round(bonus.sell * 100)}%</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 4 }}><span>추가구매 총액</span></div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#ffd166", marginBottom: 10 }}>{KRW(total)}</div>
            <button onClick={() => setView("checkout")} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#e94560)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>🛒 구매 및 저장</button>
          </div>
        </div>
      </div>
      {toast && <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 10, background: "#0a2a1a", border: "1px solid #06d6a0", color: "#06d6a0", fontSize: 13, fontWeight: 700, zIndex: 100 }}>{toast}</div>}
    </div>
  );
}

const arrangeBtn = (disabled) => ({ padding: "7px 14px", borderRadius: 8, border: "1px solid #2a2a4a", background: "#12122a", color: disabled ? "#444" : "#c7c0e0", cursor: disabled ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700 });
