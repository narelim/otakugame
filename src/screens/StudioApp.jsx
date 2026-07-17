import { useState, useEffect } from "react";
import { DrawingApp } from "../components/DrawingApp.jsx";
import { GOODS_TYPES, DRAW_RATIOS, SAVE_KEY, MAX_SAVES } from "../data/gameData.js";

/* ============================================================
   가로 스튜디오 앱 (데스크톱 창 내부 전체화면)
   - feed: 저장된 그림 핀터레스트식 피드 + 새 그림 버튼 + 마스코트/설명
   - new:  새 그림 팝업 (이름 · 비율 · 굿즈별 캔버스 추천)
   - draw: 기존 DrawingApp 재사용
   그림 저장은 기존 게임과 동일한 localStorage(seoko_draw_saves) 사용.
   ============================================================ */

// 굿즈별 추천 비율 (canvas 크기 추천)
const GOODS_RATIO = {
  postcard: "2:3", photocard: "2:3", clearfile: "2:3",
  acrylic: "3:4", keyring: "8:12", doujinshi: "3:4",
  sticker: "1:1", badge: "1:1",
};

function loadArts() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export default function StudioApp({ setState } = {}) {
  const [view, setView] = useState("feed");
  const [arts, setArts] = useState(loadArts);
  const [zoom, setZoom] = useState(null);
  // 새 그림 팝업 상태
  const [name, setName] = useState("");
  const [ratioId, setRatioId] = useState("1:1");

  const refresh = () => setArts(loadArts());
  useEffect(() => { if (view === "feed") refresh(); }, [view]);

  const openNew = () => { setName(`그림 ${arts.length + 1}`); setRatioId("1:1"); setView("new"); };

  const handleComplete = (imageData) => {
    try {
      const list = loadArts();
      const rec = { id: Date.now(), name: name || `그림 ${list.length + 1}`, ratioId, layers: [], thumb: imageData, ts: new Date().toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) };
      const next = [rec, ...list].slice(0, MAX_SAVES);
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setArts(next);
    } catch { /* 저장 실패는 무시 */ }
    if (setState) setState(s => ({ ...s, stamina: Math.max(0, (s.stamina || 0) - 10) }));
    setView("feed");
  };

  const csz = DRAW_RATIOS.find(r => r.id === ratioId) || DRAW_RATIOS[0];

  // ── 그림판 ──
  if (view === "draw") {
    return <div style={{ height: "100%", background: "#0d0d1a" }}>
      <DrawingApp goodsType={{ name: name || "새 그림", id: "art" }} onComplete={handleComplete} onCancel={() => setView("feed")} />
    </div>;
  }

  return (
    <div style={{ height: "100%", display: "flex", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Noto Sans KR',sans-serif", position: "relative", overflow: "hidden" }}>
      {/* 좌측: 마스코트 + 설명 */}
      <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid #2a2a4a", background: "#0f0f24", display: "flex", flexDirection: "column", padding: 24, gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "24px 0", background: "linear-gradient(160deg,#1a1030,#12122a)", borderRadius: 18, border: "1px solid #2a2a4a" }}>
          <div style={{ fontSize: 72, filter: "drop-shadow(0 4px 12px rgba(124,58,237,0.5))" }}>🎨</div>
          <div style={{ fontSize: 13, color: "#9a8fc0", fontWeight: 700 }}>스튜디오 마스코트</div>
          <div style={{ fontSize: 11, color: "#555" }}>(캐릭터 · 코멘트 예정)</div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8, color: "#8a8aa8" }}>
          <b style={{ color: "#c084fc" }}>스튜디오</b>에서 그림을 그려 저장하면,<br />
          <b style={{ color: "#e94560" }}>굿즈컴퍼니</b>(인터넷)에서 굿즈로 만들 수 있어요.
        </div>
        <div style={{ marginTop: "auto", fontSize: 12, color: "#555" }}>내 그림 {arts.length}개 · 최대 {MAX_SAVES}개</div>
      </div>

      {/* 우측: 헤더 + 피드 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: 64, flexShrink: 0, borderBottom: "1px solid #2a2a4a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "#12122a" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#ffd166" }}>🖼 저장된 그림</div>
          <button onClick={openNew} style={{ padding: "11px 22px", background: "linear-gradient(135deg,#7c3aed,#e94560)", border: "none", color: "#fff", fontWeight: 800, fontSize: 14, borderRadius: 12, cursor: "pointer", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>✏️ 새 그림</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {arts.length
            ? <div style={{ columns: "5 200px", columnGap: 16 }}>
              {arts.map(a => (
                <div key={a.id} onClick={() => setZoom(a)} style={{ breakInside: "avoid", marginBottom: 16, background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #2a2a4a", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }}>
                  <img src={a.thumb} alt={a.name} style={{ width: "100%", display: "block" }} />
                  <div style={{ padding: "8px 10px", background: "#12122a", fontSize: 12, color: "#c7c0e0", display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    <span style={{ color: "#555", flexShrink: 0 }}>{a.ts}</span>
                  </div>
                </div>
              ))}
            </div>
            : <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#444", gap: 12 }}>
              <div style={{ fontSize: 60 }}>🖼</div>
              <div style={{ fontSize: 15 }}>아직 그린 그림이 없어요</div>
              <button onClick={openNew} style={{ marginTop: 8, padding: "12px 28px", background: "linear-gradient(135deg,#7c3aed,#e94560)", border: "none", color: "#fff", fontWeight: 800, fontSize: 14, borderRadius: 12, cursor: "pointer" }}>✏️ 첫 그림 그리기</button>
            </div>}
        </div>
      </div>

      {/* 새 그림 팝업 */}
      {view === "new" && (
        <div onClick={() => setView("feed")} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 720, background: "#12122a", border: "1.5px solid #2a2a4a", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#c084fc" }}>✏️ 새 그림</div>
            <div style={{ display: "flex", gap: 24 }}>
              {/* 비율 미리보기 */}
              <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, color: "#888" }}>비율 미리보기</div>
                <div style={{ width: 180, height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a18", borderRadius: 10, border: "1px solid #2a2a4a" }}>
                  <div style={{ width: Math.min(160, 160 * csz.w / Math.max(csz.w, csz.h)), height: Math.min(180, 180 * csz.h / Math.max(csz.w, csz.h)), background: "#fff", border: "2px solid #7c3aed", borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#c7c0e0" }}>{csz.id} · {csz.w}×{csz.h}</div>
              </div>
              {/* 옵션 */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>그림 이름</div>
                  <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "#0a0a18", border: "1px solid #2a2a4a", borderRadius: 8, color: "#fff", fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>비율</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {DRAW_RATIOS.map(r => (
                      <button key={r.id} onClick={() => setRatioId(r.id)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${ratioId === r.id ? "#c084fc" : "#2a2a4a"}`, background: ratioId === r.id ? "rgba(124,58,237,0.3)" : "transparent", color: ratioId === r.id ? "#fff" : "#9a8fc0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{r.id}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>굿즈별 캔버스 추천 <span style={{ color: "#555" }}>(클릭 시 비율 자동 설정)</span></div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {GOODS_TYPES.map(g => (
                      <button key={g.id} onClick={() => setRatioId(GOODS_RATIO[g.id] || "1:1")} title={`${GOODS_RATIO[g.id] || "1:1"} 추천`} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #2a2a4a", background: "transparent", color: "#9a8fc0", fontSize: 12, cursor: "pointer" }}>{g.icon} {g.name}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setView("feed")} style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid #2a2a4a", background: "transparent", color: "#9a8fc0", fontSize: 14, cursor: "pointer" }}>취소</button>
              <button onClick={() => setView("draw")} style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c3aed,#e94560)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>확인 → 그리기</button>
            </div>
          </div>
        </div>
      )}

      {/* 그림 확대 */}
      {zoom && (
        <div onClick={() => setZoom(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, flexDirection: "column", gap: 12 }}>
          <img src={zoom.thumb} alt={zoom.name} style={{ maxWidth: "70%", maxHeight: "80%", borderRadius: 8, boxShadow: "0 12px 48px rgba(0,0,0,0.6)" }} />
          <div style={{ color: "#c7c0e0", fontSize: 14, fontWeight: 700 }}>{zoom.name}</div>
        </div>
      )}
    </div>
  );
}
