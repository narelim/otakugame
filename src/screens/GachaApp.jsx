import { useState } from "react";
import { doGacha, canGacha, GACHA_COST, GACHA_TEN, PITY } from "../systems/gachaSystem.js";
import { rarityOf } from "../systems/collectionSystem.js";
import { OfficialImg } from "./phoneApps.jsx";

/* ============================================================
   가챠 (폰 앱) — 장르 IP 모바일게임의 콜라보 픽업 가챠. 게임 속 게임.
   골드가 곧 과금... 천장 30연. 결과는 🎀 덕질장으로.
   ============================================================ */

const KRW = (n) => "₩" + (n || 0).toLocaleString();

export default function GachaApp({ state, setState }) {
  const [result, setResult] = useState(null); // {items, setDone}
  const [rolling, setRolling] = useState(false);
  const pity = state.gachaPity || 0;
  const banner = (state.genre && state.genre.name) || "오리지널";

  const pull = (n) => {
    if (rolling || !canGacha(state, n)) return;
    setRolling(true);
    // 연출: 잠깐 굴리는 척 → 결과
    const r = doGacha(state, n);
    setTimeout(() => { setState(() => r.state); setResult({ items: r.items, setDone: r.setDone }); setRolling(false); }, 900);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#12081f,#1d0f33)", color: "#eee6ff", fontFamily: "'Noto Sans KR',sans-serif", position: "relative" }}>
      {/* 게임앱풍 헤더 */}
      <div style={{ padding: "13px 16px", background: "linear-gradient(135deg,#5b21b6,#9b30c9)", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>🎰 판타지아 커넥트 <span style={{ fontSize: 8, background: "#ffd166", color: "#5b21b6", borderRadius: 8, padding: "2px 6px", fontWeight: 800, verticalAlign: "middle" }}>콜라보</span></div>
        <div style={{ fontSize: 10, color: "#e0c8ff", marginTop: 2 }}>「{banner}」 픽업 가챠 개최 중!</div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
        {/* 픽업 배너 */}
        <div style={{ borderRadius: 14, padding: "18px 14px", textAlign: "center", background: "linear-gradient(135deg,#2a1250,#451a70)", border: "1px solid #6d28d9", marginBottom: 12, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(255,209,102,0.15), transparent 60%)", pointerEvents: "none" }} />
          <div style={{ fontSize: 26 }}>✨🎁✨</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#ffd166", marginTop: 4 }}>「{banner}」 한정 굿즈 픽업!</div>
          <div style={{ fontSize: 10, color: "#b79aea", marginTop: 4 }}>SSR 3% · SR 9% · 획득 굿즈는 덕질장으로</div>
        </div>
        {/* 천장 게이지 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#b79aea", marginBottom: 4 }}>
            <span>천장까지</span><span style={{ fontWeight: 800, color: "#ffd166" }}>{PITY - pity}연 (SSR 확정)</span>
          </div>
          <div style={{ height: 8, background: "#1a0d2e", borderRadius: 4, overflow: "hidden", border: "1px solid #3a2258" }}>
            <div style={{ height: "100%", width: `${pity / PITY * 100}%`, background: "linear-gradient(90deg,#9b30c9,#ffd166)", transition: "width .4s" }} />
          </div>
        </div>
        {/* 뽑기 버튼 */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => pull(1)} disabled={rolling || !canGacha(state, 1)} style={{ flex: 1, padding: "14px 4px", borderRadius: 13, border: "1px solid #6d28d9", background: canGacha(state, 1) ? "#2a1250" : "#1a1226", color: canGacha(state, 1) ? "#e0c8ff" : "#5a4a78", fontWeight: 800, fontSize: 13, cursor: canGacha(state, 1) && !rolling ? "pointer" : "not-allowed" }}>1회<br /><span style={{ fontSize: 11, color: "#ffd166" }}>{KRW(GACHA_COST)}</span></button>
          <button onClick={() => pull(10)} disabled={rolling || !canGacha(state, 10)} style={{ flex: 2, padding: "14px 4px", borderRadius: 13, border: "none", background: canGacha(state, 10) ? "linear-gradient(135deg,#9b30c9,#e94560)" : "#1a1226", color: canGacha(state, 10) ? "#fff" : "#5a4a78", fontWeight: 900, fontSize: 14, cursor: canGacha(state, 10) && !rolling ? "pointer" : "not-allowed", boxShadow: canGacha(state, 10) ? "0 4px 16px rgba(155,48,201,0.4)" : "none" }}>✨ 10연 뽑기<br /><span style={{ fontSize: 11 }}>{KRW(GACHA_TEN)} <s style={{ opacity: .6 }}>{KRW(GACHA_COST * 10)}</s></span></button>
        </div>
        <div style={{ fontSize: 9, color: "#5a4a78", textAlign: "center", marginTop: 10, lineHeight: 1.7 }}>💸 과금은 계획적으로. 이건 게임 속 게임이니까 괜찮아... 괜찮겠지?<br />뽑은 굿즈 자랑은 mabo ✍️에서</div>
      </div>

      {/* 굴리는 중 */}
      {rolling && <div style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(10,4,22,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <style>{`@keyframes gspin{from{transform:rotate(0) scale(1)}50%{transform:rotate(180deg) scale(1.25)}to{transform:rotate(360deg) scale(1)}}`}</style>
        <span style={{ fontSize: 46, animation: "gspin 0.9s ease infinite" }}>🔮</span>
        <span style={{ fontSize: 12, color: "#b79aea", fontWeight: 700 }}>소환 중...</span>
      </div>}

      {/* 결과 */}
      {result && <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(10,4,22,0.94)", display: "flex", flexDirection: "column", padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#ffd166", textAlign: "center", margin: "8px 0 12px", flexShrink: 0 }}>
          {result.items.some(i => i.rarity === "SSR") ? "🌈 SSR!!! 오늘 운세 다 씀" : result.items.some(i => i.rarity === "SR") ? "✨ SR 등장!" : "소환 결과"}
          {result.setDone && <div style={{ fontSize: 11, color: "#06d6a0", marginTop: 4 }}>🎉 세트 완성! 덕질장을 확인하세요</div>}
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: result.items.length > 1 ? "repeat(2,1fr)" : "1fr", gap: 8 }}>
            {result.items.map((it, i) => { const rc = rarityOf(it.rarity).color;
              return (<div key={i} style={{ background: "#160b28", border: `1.5px solid ${rc}`, borderRadius: 12, padding: 8, textAlign: "center", boxShadow: it.rarity === "SSR" ? `0 0 14px ${rc}88` : "none" }}>
                <div style={{ height: 78, display: "flex", justifyContent: "center" }}><OfficialImg item={it} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /></div>
                <div style={{ fontSize: 10, fontWeight: 800, marginTop: 5 }}><span style={{ color: rc }}>[{it.rarity}]</span> {it.name}{it.isNew && <span style={{ color: "#06d6a0" }}> NEW!</span>}</div>
              </div>);})}
          </div>
        </div>
        <button onClick={() => setResult(null)} style={{ flexShrink: 0, marginTop: 10, padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#9b30c9,#e94560)", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>확인 (덕질장에 등록됨)</button>
      </div>}
    </div>
  );
}
