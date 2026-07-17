import { useState, useRef, useEffect } from "react";
import { BOOTH_ITEMS, SAVE_KEY } from "../data/gameData.js";

/* ============================================================
   부스 플래너 (데스크톱 창 내부) — 이케아 가상배치 참고
   - 정면 평면 뷰 캔버스에 물품을 자유 드래그 배치 (좌표는 비율 0~1로 저장 → 창 크기 무관)
   - 좌: 카탈로그(부스 물품 / 직접 그린 현수막·패널) + 검색/정렬
   - 중앙: 배치 캔버스 + 정렬(앞/뒤/삭제) + 선택 물품 정보
   - 우: 배치된 물품 리스트 + 추가구매 총액 + 구매및저장
   - 구매및저장: 영수증 + 배치 캡처 + 물품 효과 정리 + 결제
   레이아웃은 localStorage(seoko_booth_layout)에 저장. (골드 차감은 데스크톱↔게임상태 연결 시)
   ============================================================ */

const LAYOUT_KEY = "seoko_booth_layout";
const KRW = (n) => "₩" + (n || 0).toLocaleString();
let _iid = 1;
const nextIid = () => "b" + (_iid++);

function loadArts() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function loadLayout() {
  try { const raw = localStorage.getItem(LAYOUT_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export default function BoothPlannerApp({ state, setState }) {
  const [placed, setPlaced] = useState(loadLayout);   // [{iid,kind:'item'|'art',refId,name,icon,img,price,fameBonus,sellBonus,x,y}]
  const [selected, setSelected] = useState(null);
  const [cat, setCat] = useState("items");            // items | art
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");       // name | price
  const [view, setView] = useState("edit");           // edit | checkout
  const [toast, setToast] = useState(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const gold = state ? state.gold : null;

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 1800); return () => clearTimeout(t); }, [toast]);

  const arts = loadArts();
  const catalog = cat === "items"
    ? BOOTH_ITEMS.filter(i => i.name.includes(query)).sort((a, b) => sortBy === "price" ? a.price - b.price : a.name.localeCompare(b.name))
    : arts.map(a => ({ id: a.id, name: a.name || "그림", img: a.thumb, price: 0, art: true })).filter(a => a.name.includes(query));

  const addItem = (c) => {
    const inst = c.art
      ? { iid: nextIid(), kind: "art", refId: c.id, name: c.name, img: c.img, price: 0, fameBonus: 0, sellBonus: 0, x: 0.5, y: 0.35 }
      : { iid: nextIid(), kind: "item", refId: c.id, name: c.name, icon: c.icon, price: c.price, fameBonus: c.fameBonus, sellBonus: c.sellBonus, x: 0.5, y: 0.6 };
    setPlaced(p => [...p, inst]);
    setSelected(inst.iid);
  };

  // 드래그 (비율 좌표)
  const onDown = (e, inst) => {
    e.stopPropagation();
    setSelected(inst.iid);
    const r = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    dragRef.current = { iid: inst.iid, dx: px - inst.x, dy: py - inst.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onMove = (e) => {
    if (!dragRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    let px = (e.clientX - r.left) / r.width - dragRef.current.dx;
    let py = (e.clientY - r.top) / r.height - dragRef.current.dy;
    px = Math.max(0, Math.min(1, px)); py = Math.max(0, Math.min(1, py));
    setPlaced(ps => ps.map(p => p.iid === dragRef.current.iid ? { ...p, x: px, y: py } : p));
  };
  const onUp = (e) => { dragRef.current = null; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ } };

  const reorder = (iid, dir) => setPlaced(ps => {
    const i = ps.findIndex(p => p.iid === iid); if (i < 0) return ps;
    const arr = [...ps]; const [it] = arr.splice(i, 1);
    if (dir === "front") arr.push(it); else if (dir === "back") arr.unshift(it);
    return arr;
  });
  const removeItem = (iid) => { setPlaced(ps => ps.filter(p => p.iid !== iid)); if (selected === iid) setSelected(null); };

  const selInst = placed.find(p => p.iid === selected) || null;
  // 보유 물건(이미 산 것) vs 추가구매(아직 없는 것) 구분. 보유는 무료 배치, 효과는 종류당 1번씩.
  const owned = new Set((state && state.boothItems) || []);
  const placedItemIds = [...new Set(placed.filter(p => p.kind === "item").map(p => p.refId))];
  const toBuyIds = placedItemIds.filter(id => !owned.has(id));
  const itemOf = (id) => BOOTH_ITEMS.find(b => b.id === id) || {};
  const total = toBuyIds.reduce((s, id) => s + (itemOf(id).price || 0), 0);           // 추가구매 총액(미보유만)
  const fameSum = placedItemIds.reduce((s, id) => s + (itemOf(id).fameBonus || 0), 0); // 효과는 배치된 종류당 1번
  const sellSum = placedItemIds.reduce((s, id) => s + (itemOf(id).sellBonus || 0), 0);
  const isOwned = (p) => p.kind === "item" && owned.has(p.refId);

  const saveLayout = () => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(placed)); } catch { /* noop */ } };
  const pay = () => {
    saveLayout();
    // 실제 게임 상태에 반영: 골드 차감(추가구매만) + 산 물건을 보유 목록에 편입 + 레이아웃 저장
    if (setState) {
      setState(s => ({ ...s, gold: (s.gold || 0) - total, boothItems: [...new Set([...(s.boothItems || []), ...placedItemIds])], boothLayout: placed }));
    }
    setToast(total > 0 ? `✦ 구매 및 저장 완료! (추가구매 ${KRW(total)})` : "✦ 저장 완료! (추가구매 없음)");
    setView("edit");
  };

  const sizeFor = (p) => p.kind === "art" ? 128 : 84;

  // 배치 캔버스(정면 평면 뷰). readonly면 드래그/선택 비활성.
  const Canvas = ({ readonly }) => (
    <div ref={readonly ? null : canvasRef} style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#e9e4f5 0%,#e9e4f5 62%,#c9bde8 62%,#b8a9dd 100%)", overflow: "hidden" }}
      onPointerDown={readonly ? undefined : () => setSelected(null)}>
      {/* 뒷벽/테이블 가이드 */}
      <div style={{ position: "absolute", left: "6%", right: "6%", top: "8%", height: "50%", border: "2px dashed rgba(124,58,237,0.25)", borderRadius: 8, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "62%", height: 6, background: "rgba(0,0,0,0.12)", pointerEvents: "none" }} />
      {placed.map(p => (
        <div key={p.iid}
          onPointerDown={readonly ? undefined : (e) => onDown(e, p)} onPointerMove={readonly ? undefined : onMove} onPointerUp={readonly ? undefined : onUp}
          style={{ position: "absolute", left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: "translate(-50%,-50%)", width: sizeFor(p), touchAction: "none", cursor: readonly ? "default" : "move", userSelect: "none" }}>
          {p.kind === "art"
            ? <img src={p.img} alt={p.name} draggable={false} style={{ width: "100%", display: "block", borderRadius: 4, border: `2px solid ${!readonly && selected === p.iid ? "#7c3aed" : "#fff"}`, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }} />
            : <div style={{ background: "#fff", borderRadius: 10, padding: "10px 6px", textAlign: "center", border: `2px solid ${!readonly && selected === p.iid ? "#7c3aed" : "#d5cdea"}`, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: 34, lineHeight: 1 }}>{p.icon}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 3, fontWeight: 700 }}>{p.name}</div>
            </div>}
        </div>
      ))}
      {!readonly && placed.length === 0 && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9a8fc0", fontSize: 15, pointerEvents: "none" }}>← 왼쪽 물품을 눌러 배치해보세요</div>}
    </div>
  );

  // ── 구매 및 저장 (영수증) ──
  if (view === "checkout") {
    const buyLines = toBuyIds.map(id => ({ name: itemOf(id).name, price: itemOf(id).price || 0 }));
    const ownedLines = placedItemIds.filter(id => owned.has(id)).map(id => ({ name: itemOf(id).name }));
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Noto Sans KR',sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #2a2a4a", background: "#12122a" }}>
          <button onClick={() => setView("edit")} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #2a2a4a", background: "transparent", color: "#9a8fc0", cursor: "pointer", fontSize: 13 }}>‹ 돌아가기</button>
          <div style={{ padding: "8px 16px", borderRadius: 8, background: "#1a1a3a", fontSize: 14, fontWeight: 800, color: "#ffd166" }}>💰 현재 재산 {gold != null ? KRW(gold) : "—"}</div>
        </div>
        <div style={{ flex: 1, display: "flex", gap: 20, padding: 24, overflow: "hidden" }}>
          {/* 영수증 */}
          <div style={{ width: 340, flexShrink: 0, background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14, padding: 22, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#c084fc", marginBottom: 4 }}>🧾 영수증</div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 14 }}>추가 구매 물품 (보유 물건은 무료)</div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {buyLines.map((g, i) => (
                <div key={"b" + i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #2a2a4a", fontSize: 13 }}>
                  <span style={{ color: "#c7c0e0" }}>{g.name}</span>
                  <span style={{ color: "#9a8fc0" }}>{KRW(g.price)}</span>
                </div>
              ))}
              {ownedLines.map((g, i) => (
                <div key={"o" + i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #2a2a4a", fontSize: 13 }}>
                  <span style={{ color: "#7a7a9a" }}>{g.name}</span>
                  <span style={{ color: "#06d6a0", fontSize: 12 }}>보유중 · 무료</span>
                </div>
              ))}
              {!buyLines.length && !ownedLines.length && <div style={{ color: "#555", fontSize: 12, padding: "12px 0" }}>배치된 부스 물품 없음</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #2a2a4a", marginTop: 8, fontSize: 16, fontWeight: 800 }}>
              <span>총 가격</span><span style={{ color: "#ffd166" }}>{KRW(total)}</span>
            </div>
            <button onClick={pay} disabled={gold != null && gold < total} style={{ marginTop: 12, padding: "13px", borderRadius: 10, border: "none", background: gold != null && gold < total ? "#333" : "linear-gradient(135deg,#7c3aed,#e94560)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: gold != null && gold < total ? "not-allowed" : "pointer" }}>{gold != null && gold < total ? "골드 부족" : "결제하기"}</button>
          </div>
          {/* 우: 배치 캡처 + 효과 정리 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ flex: 1, position: "relative", background: "#0a0a18", border: "1px solid #2a2a4a", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 12, top: 10, fontSize: 12, color: "#9a8fc0", zIndex: 2 }}>📸 배치 미리보기</div>
              <Canvas readonly />
            </div>
            <div style={{ height: 150, flexShrink: 0, background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#06d6a0", marginBottom: 12 }}>✨ 물품 효과 정리</div>
              <div style={{ display: "flex", gap: 30 }}>
                <div><div style={{ fontSize: 11, color: "#888" }}>인지도 보너스</div><div style={{ fontSize: 24, fontWeight: 800, color: "#4cc9f0" }}>+{Math.round(fameSum * 100)}%</div></div>
                <div><div style={{ fontSize: 11, color: "#888" }}>판매율 보너스</div><div style={{ fontSize: 24, fontWeight: 800, color: "#06d6a0" }}>+{Math.round(sellSum * 100)}%</div></div>
                <div><div style={{ fontSize: 11, color: "#888" }}>배치 물품</div><div style={{ fontSize: 24, fontWeight: 800, color: "#c084fc" }}>{placed.length}개</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 편집 ──
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Noto Sans KR',sans-serif", position: "relative" }}>
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #2a2a4a", background: "#12122a", fontSize: 15, fontWeight: 800, color: "#c084fc" }}>🏪 꿈의 부스를 만들어보자!</div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* 좌: 카탈로그 */}
        <div style={{ width: 240, flexShrink: 0, borderRight: "1px solid #2a2a4a", background: "#0f0f24", display: "flex", flexDirection: "column", padding: 12, gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setCat("items")} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: cat === "items" ? "#7c3aed" : "#1a1a3a", color: cat === "items" ? "#fff" : "#888" }}>부스 물품</button>
            <button onClick={() => setCat("art")} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: cat === "art" ? "#7c3aed" : "#1a1a3a", color: cat === "art" ? "#fff" : "#888" }}>현수막/패널</button>
          </div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="검색" style={{ padding: "8px 10px", background: "#0a0a18", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", fontSize: 12 }} />
          {cat === "items" && <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
            <button onClick={() => setSortBy("name")} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid #2a2a4a", background: sortBy === "name" ? "#2a1a4a" : "transparent", color: sortBy === "name" ? "#c084fc" : "#666", cursor: "pointer" }}>이름순</button>
            <button onClick={() => setSortBy("price")} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid #2a2a4a", background: sortBy === "price" ? "#2a1a4a" : "transparent", color: sortBy === "price" ? "#c084fc" : "#666", cursor: "pointer" }}>가격순</button>
          </div>}
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {catalog.length ? catalog.map(c => (
              <button key={c.id} onClick={() => addItem(c)} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 10, border: "1px solid #2a2a4a", background: "#12122a", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "#0a0a18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, overflow: "hidden" }}>{c.art ? <img src={c.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : c.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e0e0ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: c.art ? "#9a8fc0" : (owned.has(c.id) ? "#06d6a0" : "#9a8fc0") }}>{c.art ? "직접 그린 그림" : (owned.has(c.id) ? "✓ 보유중 · 무료" : KRW(c.price))}</div>
                </div>
              </button>
            )) : <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 20 }}>{cat === "art" ? "저장된 그림이 없어요" : "검색 결과 없음"}</div>}
          </div>
        </div>

        {/* 중앙: 캔버스 + 정렬 + 정보 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ flex: 1, position: "relative", margin: 12, borderRadius: 12, overflow: "hidden", border: "1px solid #2a2a4a" }}>
            <Canvas readonly={false} />
          </div>
          <div style={{ display: "flex", gap: 6, padding: "0 12px 8px", flexWrap: "wrap" }}>
            <button onClick={() => selInst && reorder(selInst.iid, "front")} disabled={!selInst} style={arrangeBtn(!selInst)}>⬆ 앞으로</button>
            <button onClick={() => selInst && reorder(selInst.iid, "back")} disabled={!selInst} style={arrangeBtn(!selInst)}>⬇ 뒤로</button>
            <button onClick={() => selInst && removeItem(selInst.iid)} disabled={!selInst} style={{ ...arrangeBtn(!selInst), color: selInst ? "#e94560" : "#444" }}>🗑 삭제</button>
          </div>
          <div style={{ display: "flex", gap: 12, margin: "0 12px 12px", padding: 12, background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 12, minHeight: 78, alignItems: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: 8, background: "#0a0a18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0, overflow: "hidden" }}>{selInst ? (selInst.kind === "art" ? <img src={selInst.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : selInst.icon) : "❓"}</div>
            <div style={{ flex: 1 }}>
              {selInst ? <>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selInst.name}</div>
                <div style={{ fontSize: 12, color: "#9a8fc0", marginTop: 4 }}>
                  {selInst.kind === "art" ? "직접 그린 그림 (무료 배치)" : <>{isOwned(selInst) ? <span style={{ color: "#06d6a0" }}>✓ 보유중 · 무료</span> : `가격 ${KRW(selInst.price)}`} · <span style={{ color: "#4cc9f0" }}>인지도 +{Math.round(selInst.fameBonus * 100)}%</span> · <span style={{ color: "#06d6a0" }}>판매율 +{Math.round(selInst.sellBonus * 100)}%</span></>}
                </div>
              </> : <div style={{ fontSize: 13, color: "#555" }}>물품을 선택하면 정보가 여기 표시돼요</div>}
            </div>
          </div>
        </div>

        {/* 우: 배치 목록 + 총액 + 구매저장 */}
        <div style={{ width: 240, flexShrink: 0, borderLeft: "1px solid #2a2a4a", background: "#0f0f24", display: "flex", flexDirection: "column", padding: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#ffd166", marginBottom: 8 }}>📋 배치된 물품 ({placed.length})</div>
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
            {placed.length ? [...placed].reverse().map(p => (
              <button key={p.iid} onClick={() => setSelected(p.iid)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, border: `1px solid ${selected === p.iid ? "#7c3aed" : "#2a2a4a"}`, background: selected === p.iid ? "#2a1a4a" : "#12122a", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 18, width: 22, textAlign: "center", flexShrink: 0 }}>{p.kind === "art" ? "🖼" : p.icon}</span>
                <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#c7c0e0" }}>{p.name}</span>
                <span style={{ fontSize: 15, color: "#e94560", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); removeItem(p.iid); }}>×</span>
              </button>
            )) : <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 16 }}>아직 배치한 물품이 없어요</div>}
          </div>
          <div style={{ borderTop: "1px solid #2a2a4a", marginTop: 8, paddingTop: 10 }}>
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
