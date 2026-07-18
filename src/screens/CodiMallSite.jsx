import { useState, useEffect } from "react";
import { SKINS, HAIR_STYLES, HAIR_COLORS, OUTFITS, ACCS, outfitOf, accOf, DEFAULT_AVATAR } from "../data/avatarData.js";
import Avatar from "../components/Avatar.jsx";
import { logTx } from "../systems/bankSystem.js";

/* ============================================================
   코디몰 CODI:MALL — 인터넷 아바타 코스튬 쇼핑몰 (의류몰 톤: 화이트+블랙+핑크)
   의상/액세서리 구매(골드, 성향통계 cat "style") · 입어보기 미리보기 · 피팅룸(무료 커스텀)
   ============================================================ */

const KRW = (n) => "₩" + (n || 0).toLocaleString();
const PINK = "#ff5e8a";

export default function CodiMallSite({ state, setState }) {
  const [tab, setTab] = useState("outfit"); // outfit | acc | fitting
  const [preview, setPreview] = useState(null); // {slot, id}
  const [toast, setToast] = useState(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t); }, [toast]);

  const av = { ...DEFAULT_AVATAR, ...(state.avatar || {}) };
  const wardrobe = state.wardrobe || ["hoodie"];
  const owned = (id) => wardrobe.includes(id);
  const shown = preview ? { ...av, [preview.slot]: preview.id } : av;
  const setAv = (patch) => setState(s => ({ ...s, avatar: { ...DEFAULT_AVATAR, ...(s.avatar || {}), ...patch } }));
  const equip = (slot, id) => { setAv({ [slot]: id }); setPreview(null); setToast({ t: "착용 완료!", ok: true }); };
  const buy = (item, slot) => {
    if ((state.gold || 0) < item.price) { setToast({ t: "골드가 부족해요...", ok: false }); return; }
    setState(s => { let ns = logTx(s, -item.price, `코디몰 · ${item.name}`, "👗", "style"); return { ...ns, wardrobe: [...new Set([...(ns.wardrobe || ["hoodie"]), item.id])], avatar: { ...DEFAULT_AVATAR, ...(ns.avatar || {}), [slot]: item.id } }; });
    setPreview(null); setToast({ t: `${item.name} 구매 & 착용! 💕`, ok: true });
  };
  const previewItem = preview ? (preview.slot === "outfit" ? outfitOf(preview.id) : accOf(preview.id)) : null;
  const items = tab === "outfit" ? OUTFITS : ACCS;
  const slot = tab === "outfit" ? "outfit" : "acc";

  const card = { background: "#fff", border: "1px solid #eee", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" };
  const swatch = (on) => ({ width: 30, height: 30, borderRadius: "50%", border: on ? `3px solid ${PINK}` : "2px solid #ddd", cursor: "pointer", padding: 0 });

  return (
    <div style={{ minHeight: "100%", background: "#f7f7f9", fontFamily: "'Noto Sans KR',sans-serif", color: "#222" }}>
      {/* 헤더 */}
      <div style={{ background: "#17171d", padding: "16px 40px 0", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingLeft: 30 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>CODI<span style={{ color: PINK }}>:</span>MALL</span>
          <span style={{ fontSize: 12, color: "#9a9aa8" }}>오타쿠도 꾸민다 👗 아바타 코스튬 전문몰</span>
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: "#ffd166" }}>💰 {KRW(state.gold)}</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 12, paddingLeft: 30 }}>
          {[["outfit", "👕 의상"], ["acc", "🎀 액세서리"], ["fitting", "🪞 피팅룸"]].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setPreview(null); }} style={{ padding: "10px 22px", border: "none", borderRadius: "10px 10px 0 0", cursor: "pointer", fontSize: 13, fontWeight: 800, background: tab === id ? "#f7f7f9" : "#26262e", color: tab === id ? "#17171d" : "#9a9aa8" }}>{label}</button>))}
        </div>
      </div>
      {toast && <div style={{ position: "sticky", top: 8, zIndex: 30, margin: "10px auto 0", width: "fit-content", padding: "9px 22px", borderRadius: 20, fontSize: 13, fontWeight: 800, background: toast.ok ? "#e8f6ec" : "#fdeaea", color: toast.ok ? "#1e8e3e" : "#d13a5a", border: `1px solid ${toast.ok ? "#bfe3c9" : "#f5c2c2"}` }}>{toast.t}</div>}

      <div style={{ display: "flex", gap: 22, padding: "22px 40px 60px", maxWidth: 1240, margin: "0 auto", alignItems: "flex-start" }}>
        {/* ── 좌: 상품/피팅룸 ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tab !== "fitting" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 14 }}>
              {items.map(it => {
                const has = owned(it.id) || it.price === 0;
                const worn = av[slot] === it.id;
                return (
                  <button key={it.id} onClick={() => setPreview({ slot, id: it.id })} style={{ ...card, padding: "14px 10px 12px", cursor: "pointer", textAlign: "center", outline: preview && preview.id === it.id ? `2.5px solid ${PINK}` : "none", position: "relative" }}>
                    {worn && <span style={{ position: "absolute", top: 8, left: 8, fontSize: 9, fontWeight: 800, color: "#fff", background: PINK, padding: "2px 8px", borderRadius: 9 }}>착용중</span>}
                    {has && !worn && <span style={{ position: "absolute", top: 8, left: 8, fontSize: 9, fontWeight: 800, color: "#1e8e3e", background: "#e8f6ec", padding: "2px 8px", borderRadius: 9 }}>보유</span>}
                    <div style={{ height: 130, display: "flex", justifyContent: "center" }}><Avatar avatar={{ ...av, [slot]: it.id }} /></div>
                    <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>{it.name}</div>
                    <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{it.desc}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: has ? "#1e8e3e" : PINK, marginTop: 5 }}>{it.price === 0 ? "기본 제공" : has ? "구매 완료" : KRW(it.price)}</div>
                  </button>);
              })}
              {tab === "acc" && av.acc && <button onClick={() => equip("acc", null)} style={{ ...card, padding: 14, cursor: "pointer", textAlign: "center", border: "1.5px dashed #ccc" }}>
                <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.4 }}>🚫</div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6 }}>액세서리 해제</div>
                <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>깔끔하게 벗기</div>
              </button>}
            </div>
          ) : (
            <div style={{ ...card, padding: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 4 }}>🪞 피팅룸 <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>— 기본 커스텀은 전부 무료</span></div>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 700, margin: "16px 0 8px" }}>피부 톤</div>
              <div style={{ display: "flex", gap: 8 }}>{SKINS.map(s => <button key={s.id} onClick={() => setAv({ skin: s.id })} style={{ ...swatch(av.skin === s.id), background: s.c }} />)}</div>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 700, margin: "18px 0 8px" }}>헤어 스타일</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {HAIR_STYLES.map(h => <button key={h.id} onClick={() => setAv({ hair: h.id })} style={{ padding: "4px 6px", borderRadius: 10, border: av.hair === h.id ? `2.5px solid ${PINK}` : "1.5px solid #ddd", background: "#fff", cursor: "pointer" }}>
                  <div style={{ height: 74, width: 52 }}><Avatar avatar={{ ...av, hair: h.id }} /></div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: av.hair === h.id ? PINK : "#666" }}>{h.name}</div>
                </button>)}
              </div>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 700, margin: "18px 0 8px" }}>헤어 컬러</div>
              <div style={{ display: "flex", gap: 8 }}>{HAIR_COLORS.map(c => <button key={c} onClick={() => setAv({ hairColor: c })} style={{ ...swatch(av.hairColor === c), background: c }} />)}</div>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 700, margin: "18px 0 8px" }}>내 옷장 (보유 의상)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {OUTFITS.filter(o => owned(o.id) || o.price === 0).map(o => <button key={o.id} onClick={() => setAv({ outfit: o.id })} style={{ padding: "7px 14px", borderRadius: 16, border: av.outfit === o.id ? `2px solid ${PINK}` : "1.5px solid #ddd", background: av.outfit === o.id ? "#fff0f5" : "#fff", color: av.outfit === o.id ? PINK : "#555", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{o.name}</button>)}
                {ACCS.filter(a => owned(a.id)).map(a => <button key={a.id} onClick={() => setAv({ acc: av.acc === a.id ? null : a.id })} style={{ padding: "7px 14px", borderRadius: 16, border: av.acc === a.id ? `2px solid ${PINK}` : "1.5px dashed #ccc", background: av.acc === a.id ? "#fff0f5" : "#fff", color: av.acc === a.id ? PINK : "#888", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🎀 {a.name}</button>)}
              </div>
            </div>
          )}
        </div>

        {/* ── 우: 내 아바타 프리뷰 ── */}
        <div style={{ width: 300, flexShrink: 0, position: "sticky", top: 16 }}>
          <div style={{ ...card, padding: 18, textAlign: "center", background: "linear-gradient(180deg,#fff,#fff5f8)" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: preview ? PINK : "#444", marginBottom: 6 }}>{preview ? "👀 입어보는 중..." : "내 아바타"}</div>
            <div style={{ height: 300, display: "flex", justifyContent: "center" }}><Avatar avatar={shown} /></div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 8, lineHeight: 1.7 }}>
              👕 {outfitOf(shown.outfit).name}{shown.acc ? ` · 🎀 ${(accOf(shown.acc) || {}).name}` : ""}
            </div>
            {preview && previewItem && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {(owned(previewItem.id) || previewItem.price === 0)
                  ? <button onClick={() => equip(preview.slot, preview.id)} style={{ padding: 12, borderRadius: 11, border: "none", background: "#17171d", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>착용하기</button>
                  : <button onClick={() => buy(previewItem, preview.slot)} style={{ padding: 12, borderRadius: 11, border: "none", background: (state.gold || 0) >= previewItem.price ? `linear-gradient(135deg,${PINK},#e94560)` : "#eee", color: (state.gold || 0) >= previewItem.price ? "#fff" : "#aaa", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>{KRW(previewItem.price)} 구매하고 착용</button>}
                <button onClick={() => setPreview(null)} style={{ padding: 9, borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#888", fontSize: 12, cursor: "pointer" }}>벗기 (미리보기 취소)</button>
              </div>)}
          </div>
          <div style={{ fontSize: 10, color: "#aaa", textAlign: "center", marginTop: 10, lineHeight: 1.7 }}>아바타는 내 방과 행사 부스에 등장해요.<br />(추후: 온라인 교류회 도트 아바타와 연동)</div>
        </div>
      </div>
    </div>
  );
}
