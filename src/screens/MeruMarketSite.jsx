import { useState, useEffect } from "react";
import { marketListings, buyListing, boughtToday, sellStock, sellDupe, stockClearancePay, PRICE_BASE, DUPE_RATE } from "../systems/marketSystem.js";
import { rarityOf } from "../systems/collectionSystem.js";
import { OfficialImg } from "./phoneApps.jsx";
import { GoodsImg } from "../components/BoothStage.jsx";

/* ============================================================
   메루마켓 MERU MARKET — 중고장터 사이트 (민트+화이트, 당근/메루카리 톤)
   프리미엄 매물(덕질장 구멍 메우기·머니싱크) / 내 재고 떨이 / 중복 처분
   ============================================================ */

const KRW = (n) => "₩" + (n || 0).toLocaleString();
const MINT = "#00b493";

export default function MeruMarketSite({ state, setState }) {
  const [tab, setTab] = useState("buy"); // buy | sell | dupe
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null); // {kind:"buy"|"stock"|"dupe", ...}
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const listings = marketListings(state);
  const dupes = (state.collection || []).map((it, i) => ({ it, i })).filter(x => (x.it.count || 1) > 1);
  const stock = (state.goods || []).filter(g => g.stock > 0);

  const card = { background: "#fff", border: "1px solid #e2ece8", borderRadius: 14, boxShadow: "0 2px 10px rgba(0,120,90,0.06)" };
  const doToast = (t, ok = true) => setToast({ t, ok });

  return (
    <div style={{ minHeight: "100%", background: "#f4faf8", fontFamily: "'Noto Sans KR',sans-serif", color: "#223" }}>
      {/* 헤더 */}
      <div style={{ background: "#fff", borderBottom: `3px solid ${MINT}`, padding: "16px 40px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingLeft: 30 }}>
          <span style={{ fontSize: 25, fontWeight: 900, color: MINT }}>♻️ MERU<span style={{ color: "#223" }}>MARKET</span></span>
          <span style={{ fontSize: 12, color: "#7a9a90" }}>덕후의 물건은 돌고 돈다 — 절판 굿즈 · 양도 · 떨이</span>
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: "#b98700" }}>💰 {KRW(state.gold)}</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 12, paddingLeft: 30 }}>
          {[["buy", `🛒 오늘의 매물 (${listings.length})`], ["sell", `📦 내 재고 팔기 (${stock.length})`], ["dupe", `♻️ 중복 처분 (${dupes.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "10px 20px", border: "none", borderRadius: "10px 10px 0 0", cursor: "pointer", fontSize: 13, fontWeight: 800, background: tab === id ? "#f4faf8" : "#e8f2ee", color: tab === id ? MINT : "#7a9a90" }}>{label}</button>))}
        </div>
      </div>
      {toast && <div style={{ position: "sticky", top: 8, zIndex: 30, margin: "10px auto 0", width: "fit-content", padding: "9px 22px", borderRadius: 20, fontSize: 13, fontWeight: 800, background: toast.ok ? "#e2f6ef" : "#fdeaea", color: toast.ok ? "#0a8a6a" : "#d13a5a", border: `1px solid ${toast.ok ? "#b0e0d0" : "#f5c2c2"}` }}>{toast.t}</div>}

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "22px 40px 60px" }}>
        {/* ── 오늘의 매물 ── */}
        {tab === "buy" && <>
          <div style={{ fontSize: 11, color: "#7a9a90", marginBottom: 12 }}>매물은 매일 자정 로테이션 · 특가엔 이유가 있을지도... (가품 주의) · 구매한 굿즈는 🎀 덕질장으로</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
            {listings.map(l => {
              const sold = boughtToday(state, l.key);
              const rc = l.item ? rarityOf(l.item.rarity).color : "#ffd166";
              return (
                <div key={l.key} style={{ ...card, padding: 14, position: "relative", outline: l.fake ? "2px dashed #e94560" : l.legend ? "2.5px solid #ffd166" : "none", boxShadow: l.legend ? "0 0 18px rgba(255,209,102,0.35)" : card.boxShadow, background: l.legend ? "linear-gradient(135deg,#fff,#fffaf0)" : "#fff" }}>
                  {l.fake && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9, fontWeight: 900, color: "#fff", background: "#e94560", padding: "2px 8px", borderRadius: 9 }}>특가!! 급처 🔥</span>}
                  {l.legend && <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9, fontWeight: 900, color: "#5b4400", background: "linear-gradient(90deg,#ffd166,#ffb347)", padding: "2px 8px", borderRadius: 9 }}>✨ 전설의 절판품</span>}
                  {l.ticket
                    ? <div style={{ height: 130, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}><span style={{ fontSize: 44 }}>🎫</span><span style={{ fontSize: 12, fontWeight: 800, color: "#d13a5a" }}>양도 티켓 (프리미엄)</span></div>
                    : <div style={{ height: 130, display: "flex", justifyContent: "center", padding: 4 }}><OfficialImg item={l.item} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /></div>}
                  <div style={{ fontSize: 13, fontWeight: 800, marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.ticket ? `『${l.ticket.name}』 Day ${l.ticket.eventDay}` : l.item.name}</div>
                  <div style={{ fontSize: 10, color: "#7a9a90", marginTop: 3 }}>
                    {l.ticket ? "예매 실패자의 눈물의 양도" : <><span style={{ color: rc, fontWeight: 900 }}>[{l.item.rarity}]</span> · {l.cond.label} · 절판 공식</>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: l.fake ? "#e94560" : "#223" }}>{KRW(l.price)}</span>
                    <button disabled={sold || state.gold < l.price} onClick={() => setConfirm({ kind: "buy", l })}
                      style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 9, border: "none", fontWeight: 800, fontSize: 12, cursor: sold || state.gold < l.price ? "not-allowed" : "pointer", background: sold ? "#eee" : state.gold < l.price ? "#eee" : MINT, color: sold || state.gold < l.price ? "#aaa" : "#fff" }}>{sold ? "품절" : "구매"}</button>
                  </div>
                </div>);
            })}
          </div>
        </>}

        {/* ── 내 재고 팔기 ── */}
        {tab === "sell" && <>
          <div style={{ fontSize: 11, color: "#7a9a90", marginBottom: 12 }}>이월 재고를 원가의 60%에 즉시 떨이 (손절) — 재고 박스가 사라지면 마음도 가벼워져요 (멘탈 +3)</div>
          {!stock.length && <div style={{ ...card, padding: 40, textAlign: "center", color: "#9ab5ab", fontSize: 13 }}>팔 재고가 없어요. 완판의 증거! 👍</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stock.map(g => (
              <div key={g.id} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 52, height: 52, flexShrink: 0 }}><GoodsImg goods={g} style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{g.name} <span style={{ fontSize: 11, color: "#7a9a90", fontWeight: 400 }}>재고 {g.stock}개 · 정가 {KRW(g.price)}</span></div>
                  <div style={{ fontSize: 11, color: "#0a8a6a", marginTop: 3 }}>떨이 예상가 {KRW(stockClearancePay(g))}</div>
                </div>
                <button onClick={() => setConfirm({ kind: "stock", g })} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: MINT, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>전량 떨이</button>
              </div>))}
          </div>
        </>}

        {/* ── 중복 처분 ── */}
        {tab === "dupe" && <>
          <div style={{ fontSize: 11, color: "#7a9a90", marginBottom: 12 }}>덕질장의 중복 수집품(×2 이상)을 시세 {Math.round(DUPE_RATE * 100)}%에 처분 — 1개는 소장용으로 남겨둬요</div>
          {!dupes.length && <div style={{ ...card, padding: 40, textAlign: "center", color: "#9ab5ab", fontSize: 13 }}>중복 수집품이 없어요</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dupes.map(({ it, i }) => {
              const n = it.count - 1;
              const pay = Math.max(100, Math.round((PRICE_BASE[it.rarity] || 12000) * DUPE_RATE * n / 100) * 100);
              return (
                <div key={i} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 52, height: 52, flexShrink: 0 }}><OfficialImg item={it} style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}><span style={{ color: rarityOf(it.rarity).color }}>[{it.rarity}]</span> {it.name} <span style={{ fontSize: 11, color: "#7a9a90", fontWeight: 400 }}>×{it.count}</span></div>
                    <div style={{ fontSize: 11, color: "#0a8a6a", marginTop: 3 }}>{n}개 처분 시 {KRW(pay)}</div>
                  </div>
                  <button onClick={() => setConfirm({ kind: "dupe", i, it, pay, n })} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: MINT, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>처분</button>
                </div>);
            })}
          </div>
        </>}
      </div>

      {/* ── 확인 모달 ── */}
      {confirm && <div onClick={() => setConfirm(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(20,40,35,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 400, background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 20px 60px rgba(0,60,45,0.3)" }}>
          {confirm.kind === "buy" && <>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>{confirm.l.ticket ? `양도 티켓을 살까요?` : `${confirm.l.item.name}`}</div>
            <div style={{ fontSize: 13, color: "#7a9a90", lineHeight: 1.8, marginBottom: 16 }}>{KRW(confirm.l.price)} 결제됩니다.{confirm.l.fake ? <b style={{ color: "#e94560" }}><br />...근데 이 가격, 좀 수상하지 않아요?</b> : confirm.l.legend ? <b style={{ color: "#b98700" }}><br />박물관급 진품. 평생에 한 번 볼까 말까 한 물건이에요.</b> : confirm.l.ticket ? " 정가의 3배지만... 못 가는 것보단 낫죠." : " 절판템은 오늘 놓치면 끝이에요."}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: 12, borderRadius: 11, border: "1px solid #ddd", background: "#fff", color: "#888", fontWeight: 700, cursor: "pointer" }}>참는다</button>
              <button onClick={() => { setState(s => buyListing(s, confirm.l)); setConfirm(null); doToast(confirm.l.fake ? "결제 완료... 제발 진품이길 🙏" : "구매 완료! 메시지를 확인하세요 📦"); }} style={{ flex: 2, padding: 12, borderRadius: 11, border: "none", background: MINT, color: "#fff", fontWeight: 800, cursor: "pointer" }}>{KRW(confirm.l.price)} 결제</button>
            </div>
          </>}
          {confirm.kind === "stock" && <>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>{confirm.g.name} {confirm.g.stock}개 전량 떨이</div>
            <div style={{ fontSize: 13, color: "#7a9a90", lineHeight: 1.8, marginBottom: 16 }}>정가의 45%만 받아요. 다음 행사에 들고 갈 수도 있는데... 정말 팔까요?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: 12, borderRadius: 11, border: "1px solid #ddd", background: "#fff", color: "#888", fontWeight: 700, cursor: "pointer" }}>안고 간다</button>
              <button onClick={() => { setState(s => sellStock(s, confirm.g.id)); setConfirm(null); doToast("떨이 완료! 속이 시원하다 📦→💰"); }} style={{ flex: 2, padding: 12, borderRadius: 11, border: "none", background: MINT, color: "#fff", fontWeight: 800, cursor: "pointer" }}>떨이로 판다</button>
            </div>
          </>}
          {confirm.kind === "dupe" && <>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>{confirm.it.name} 중복 {confirm.n}개 처분</div>
            <div style={{ fontSize: 13, color: "#7a9a90", lineHeight: 1.8, marginBottom: 16 }}>{KRW(confirm.pay)}을 받고 1개만 남겨요. 리셀 논란은... 중고 처분이니 괜찮겠죠?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: 12, borderRadius: 11, border: "1px solid #ddd", background: "#fff", color: "#888", fontWeight: 700, cursor: "pointer" }}>다 소장한다</button>
              <button onClick={() => { setState(s => sellDupe(s, confirm.i)); setConfirm(null); doToast(`처분 완료 +${KRW(confirm.pay)}`); }} style={{ flex: 2, padding: 12, borderRadius: 11, border: "none", background: MINT, color: "#fff", fontWeight: 800, cursor: "pointer" }}>처분한다</button>
            </div>
          </>}
        </div>
      </div>}
    </div>
  );
}
