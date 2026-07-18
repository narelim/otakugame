import { useState, useEffect } from "react";
import { BOOTH_VIEW_H, BOOTH_WIDTHS, zoneOf, catalogItem, specFor, clampToZoneW, autoGoodsInstances } from "../data/boothData.js";
import { goodsMockup } from "../utils/goodsMockup.js";

/* ============================================================
   부스 비주얼 공유 컴포넌트 — 부.꾸(편집)와 행사 당일(관람)이 같은 그림을 그린다.
   - ItemVisual / GoodsImg: 물품·굿즈 목업 렌더
   - BoothScene: 읽기 전용 부스 정면 뷰 (state.boothLayout 기반, children=오버레이)
   스펙/클램프/자동진열 계산은 data/boothData.js에 있음 (비컴포넌트 유틸).
   ============================================================ */

// 테이블보 패턴 → CSS background
function patternCSS(p) {
  if (!p) return { background: "#b9a5e8" };
  if (p.kind === "solid") return { background: p.a };
  if (p.kind === "stripe") return { background: `repeating-linear-gradient(90deg, ${p.a} 0 14px, ${p.b} 14px 28px)` };
  if (p.kind === "check") return { background: `${p.a} repeating-linear-gradient(0deg, ${p.b}55 0 10px, transparent 10px 20px), repeating-linear-gradient(90deg, ${p.b}55 0 10px, transparent 10px 20px)`, backgroundColor: p.a };
  if (p.kind === "lace") return { background: `radial-gradient(circle at 8px 8px, ${p.b} 2.5px, transparent 3px) 0 0/22px 22px, ${p.a}`, backgroundColor: p.a };
  return { background: p.a };
}

// 물품 비주얼 (실측 박스 안을 종류별로 그림)
export function ItemVisual({ c, inst, genreName }) {
  const base = { width: "100%", height: "100%", borderRadius: 4, boxSizing: "border-box" };
  if (c.cat === "banner") {
    if (inst.artImg) return <img src={inst.artImg} alt="" draggable={false} style={{ ...base, objectFit: "cover", display: "block", border: "2px solid #fff", boxShadow: "0 3px 10px rgba(0,0,0,0.3)" }} />;
    return <div style={{ ...base, background: "linear-gradient(120deg,#7c3aed,#e94560,#ffd166)", border: "2px solid #fff", boxShadow: "0 3px 10px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><span style={{ color: "#fff", fontWeight: 900, fontSize: 12, textShadow: "0 1px 3px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>{genreName || "MY CIRCLE"}</span></div>;
  }
  if (c.cat === "cloth") return <div style={{ ...base, ...patternCSS(c.pattern), border: "1px solid rgba(0,0,0,0.15)", borderRadius: "0 0 6px 6px", boxShadow: "inset 0 6px 8px rgba(0,0,0,0.12)" }} />;
  if (c.cat === "net") return <div style={{ ...base, background: "repeating-linear-gradient(0deg, #9aa5b8 0 1.5px, transparent 1.5px 11px), repeating-linear-gradient(90deg, #9aa5b8 0 1.5px, transparent 1.5px 11px)", border: "2.5px solid #7f8b9e", borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)" }} />;
  if (c.cat === "display") { const tiers = c.id === "disp_tier3" ? 3 : 2;
    return <div style={{ ...base, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>{Array.from({ length: tiers }, (_, i) => <div key={i} style={{ height: `${100 / tiers}%`, width: `${100 - (tiers - 1 - i) * (36 / tiers)}%`, alignSelf: "center", background: "linear-gradient(180deg,#f6f1e8,#d9cfbc)", border: "1px solid #b8ab90", borderRadius: 2 }} />)}</div>; }
  if (c.id === "promo_acryl") return <div style={{ ...base, background: "linear-gradient(180deg,rgba(190,225,255,0.5),rgba(140,180,230,0.35))", border: "1.5px solid rgba(120,160,210,0.8)", borderRadius: "3px 3px 5px 5px" }} />;
  if (c.id === "promo_basket") return <div style={{ ...base, background: "repeating-linear-gradient(45deg,#caa06a 0 4px,#a87f4c 4px 8px)", border: "2px solid #8a6437", borderRadius: "4px 4px 8px 8px" }} />;
  if (c.id === "promo_easel") return <div style={{ ...base, background: "linear-gradient(180deg,#fdfaf3,#efe8d8)", border: "2px solid #b8ab90", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8a7a5e", fontWeight: 700 }}>NEW!</div>;
  if (c.id === "light_strip") return <div style={{ ...base, background: "linear-gradient(90deg,#fff6c9,#ffe98a,#fff6c9)", borderRadius: 3, boxShadow: "0 0 12px 4px rgba(255,225,120,0.75)" }} />;
  if (c.id === "light_clip") return <div style={{ ...base, background: "#3a3f4c", borderRadius: "40% 40% 20% 20%", boxShadow: "0 10px 14px 2px rgba(255,240,180,0.5)", border: "1px solid #23272f" }} />;
  if (c.id === "light_garland") return <div style={{ ...base, background: "radial-gradient(circle at 6px 55%, #ffd166 3px, transparent 4px) 0 0/16px 100% repeat-x", filter: "drop-shadow(0 0 5px rgba(255,209,102,0.9))" }} />;
  return <div style={{ ...base, background: "#fff", border: "1.5px solid #cbbfe5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{c.icon}</div>;
}

// 굿즈 목업 이미지 (Canvas 자동 생성 → 비동기 로드)
export function GoodsImg({ goods, style }) {
  const [url, setUrl] = useState(null);
  const gid = goods && goods.id;
  useEffect(() => { let a = true; if (goods) goodsMockup(goods).then(u => { if (a) setUrl(u); }); return () => { a = false; }; }, [gid]); // eslint-disable-line react-hooks/exhaustive-deps
  return url ? <img src={url} alt="" draggable={false} style={style} /> : null;
}

// 읽기 전용 부스 정면 뷰. goodsOverride로 연출용 재고(감소) 반영, children은 손님 등 오버레이.
export function BoothScene({ state, goodsOverride, children, style }) {
  const boothW = BOOTH_WIDTHS[(state && state.boothSize) || "small"] || 120;
  const genreName = state && state.genre && state.genre.name;
  const goodsArr = goodsOverride || ((state && state.goods) || []);
  const stocked = goodsArr.filter(g => g.stock > 0);
  const goodsById = (id) => goodsArr.find(g => String(g.id) === String(id)) || null;
  const layoutItems = ((state && state.boothLayout && state.boothLayout.version === 2) ? state.boothLayout.items : [])
    .filter(p => p.kind !== "goods" || stocked.some(g => String(g.id) === String(p.refId)));
  const placedIds = new Set(layoutItems.filter(p => p.kind === "goods").map(p => String(p.refId)));
  const autos = autoGoodsInstances(stocked.filter(g => !placedIds.has(String(g.id))), boothW);
  const zonePct = (z) => ({ top: `${z.y0 / BOOTH_VIEW_H * 100}%`, height: `${(z.y1 - z.y0) / BOOTH_VIEW_H * 100}%` });
  return (
    <div style={{ position: "relative", aspectRatio: `${boothW} / ${BOOTH_VIEW_H}`, background: "linear-gradient(180deg,#efeaf8 0%,#e6dff2 100%)", borderRadius: "8px 8px 4px 4px", boxShadow: "0 14px 50px rgba(0,0,0,0.55)", ...style }}>
      <div style={{ position: "absolute", left: "2%", right: "2%", top: `${zoneOf("top").y1 / BOOTH_VIEW_H * 100}%`, height: 3, background: "#8a8098", borderRadius: 2 }} />
      <div style={{ position: "absolute", left: 0, right: 0, ...zonePct(zoneOf("wall")), background: "linear-gradient(180deg,#ded6ee,#d4cbe8)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, ...zonePct(zoneOf("table")), background: "linear-gradient(180deg,#cfc4e6 0%,#c3b6de 12%,#bfb2db 100%)", borderTop: "3px solid #a99ac9" }} />
      <div style={{ position: "absolute", left: 0, right: 0, ...zonePct(zoneOf("front")), background: "#b1a3d1", borderTop: "2px solid #9d8dc0" }} />
      {[...autos, ...layoutItems].map(p => {
        const c = specFor(p); if (!c) return null;
        const pos = clampToZoneW(c, p.x, p.y, boothW);
        const rw = ((p.kind === "item" && c.fullWidth) ? boothW : c.w) / boothW * 100, rh = c.h / BOOTH_VIEW_H * 100;
        return (
          <div key={p.iid} style={{ position: "absolute", left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, width: `${rw}%`, height: `${rh}%`, transform: "translate(-50%,-50%)", zIndex: p.auto ? 8 : 10, pointerEvents: "none" }}>
            {p.kind === "art"
              ? <img src={p.img} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", border: "3px solid #fff", boxSizing: "border-box", borderRadius: 3, boxShadow: "0 3px 10px rgba(0,0,0,0.3)" }} />
              : p.kind === "goods"
                ? <GoodsImg goods={goodsById(p.refId)} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                : <ItemVisual c={catalogItem(p.refId)} inst={p} genreName={genreName} />}
          </div>);
      })}
      {children}
    </div>
  );
}
