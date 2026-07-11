import { useState, useEffect, useRef } from "react";

const LABELS = { followers: "팔로워", fame: "인지도", mental: "멘탈", stamina: "체력", fanTrust: "팬 신뢰", engagement: "반응률", imageTicket: "이미지 티켓", gold: "골드", sales: "판매", focus: "집중" };
const fmt = (k, v) => {
  const name = LABELS[k] || k;
  const unit = k === "followers" ? "명" : (k === "fame" ? "pt" : (k === "gold" ? "원" : (["mental", "stamina", "fanTrust", "engagement"].includes(k) ? "%" : "개")));
  return `${name} ${v > 0 ? "+" : ""}${v.toLocaleString()}${unit}`;
};
const deltaRows = (delta) => Object.entries(delta || {})
  .filter(([k, v]) => k[0] !== "_" && typeof v === "number" && v !== 0)
  .map(([k, v]) => ({ k, v, txt: fmt(k, v) }));

function CountUp({ to, dur = 1400 }) {
  const [n, setN] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf.current = setTimeout(tick, 40);
    };
    tick();
    return () => { if (raf.current) clearTimeout(raf.current); };
  }, [to]);
  return <span>{n > 0 ? "+" : ""}{n.toLocaleString()}</span>;
}

export default function EventModal({ data, onChoice, onClose }) {
  const { event, result, needsChoice } = data;
  const pres = event.presentation || "modal";

  // 배너: 3초 후 자동 닫힘
  useEffect(() => {
    if (pres === "banner" && !needsChoice) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [pres, needsChoice]);

  // fullscreen 진동 연출 (모바일)
  useEffect(() => {
    if (pres === "fullscreen") { try { if (navigator.vibrate) navigator.vibrate([0, 60, 40, 80]); } catch (e) {} }
  }, [pres]);

  const rows = deltaRows(result);

  if (pres === "banner" && !needsChoice) {
    return (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2000, background: "linear-gradient(90deg,#1a0a2e,#2a1a4a)", borderBottom: "1px solid #7c3aed", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", fontFamily: "'Noto Sans KR',sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }} onClick={onClose}>
        <span style={{ fontSize: "20px" }}>{event.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "12px", color: "#e0e0ff", lineHeight: 1.5 }}>{event.message}</div>
          {rows.length > 0 && <div style={{ fontSize: "11px", color: "#c084fc", fontWeight: "700", marginTop: "2px" }}>{rows.map(r => r.txt).join(" · ")}</div>}
        </div>
      </div>
    );
  }

  if (pres === "fullscreen") {
    const follow = (result && result.followers) || 0;
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 2000, background: "radial-gradient(circle at 50% 35%,#2a0a4a,#0a0a18)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px", fontFamily: "'Noto Sans KR',sans-serif", textAlign: "center" }}>
        <div style={{ fontSize: "60px", marginBottom: "16px", animation: "fsPulse 1.2s ease-in-out infinite" }}>{event.icon}</div>
        <style>{`@keyframes fsPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
        <div style={{ fontSize: "18px", fontWeight: "900", color: "#ffd166", marginBottom: "10px" }}>{event.name}</div>
        <div style={{ fontSize: "13px", color: "#cfcfff", lineHeight: 1.7, marginBottom: "24px", maxWidth: "320px" }}>{event.message}</div>
        {follow > 0 && <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "12px", color: "#888" }}>팔로워가 늘고 있어...</div><div style={{ fontSize: "44px", fontWeight: "900", color: "#06d6a0" }}><CountUp to={follow} /><span style={{ fontSize: "20px" }}>명</span></div></div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "26px" }}>
          {rows.filter(r => r.k !== "followers").map(r => <span key={r.k} style={{ fontSize: "13px", padding: "5px 12px", background: "rgba(124,58,237,0.25)", border: "1px solid #7c3aed", borderRadius: "20px", color: "#e0e0ff", fontWeight: "700" }}>{r.txt}</span>)}
        </div>
        <button onClick={onClose} style={{ padding: "13px 40px", background: "linear-gradient(135deg,#7c3aed,#e94560)", border: "none", color: "#fff", fontWeight: "700", fontSize: "15px", borderRadius: "50px", cursor: "pointer", boxShadow: "0 8px 32px rgba(124,58,237,0.5)" }}>확인</button>
      </div>
    );
  }

  // modal (기본)
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Noto Sans KR',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "340px", background: "linear-gradient(135deg,#16162e,#1a0a2e)", border: "1px solid #7c3aed", borderRadius: "18px", padding: "22px", boxShadow: "0 12px 48px rgba(0,0,0,0.6)" }}>
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "40px", marginBottom: "6px" }}>{event.icon}</div>
          <div style={{ fontSize: "15px", fontWeight: "800", color: "#ffd166" }}>{event.name}</div>
        </div>
        <div style={{ fontSize: "13px", color: "#d8d8ff", lineHeight: 1.7, marginBottom: "16px", textAlign: "center" }}>{event.message}</div>

        {needsChoice ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(event.choices || []).map((ch, i) => (
              <button key={i} onClick={() => onChoice(i)} style={{ padding: "12px 14px", textAlign: "left", background: "#12122a", border: "1px solid #3a3a6a", color: "#e0e0ff", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>{ch.label}</button>
            ))}
          </div>
        ) : (
          <>
            {rows.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
                {rows.map(r => <span key={r.k} style={{ fontSize: "14px", padding: "6px 14px", borderRadius: "20px", fontWeight: "800", background: r.v > 0 ? "#0a2a1a" : "#2a0a0a", border: `1px solid ${r.v > 0 ? "#06d6a0" : "#e94560"}`, color: r.v > 0 ? "#06d6a0" : "#e94560" }}>{r.txt}</span>)}
              </div>
            ) : <div style={{ textAlign: "center", color: "#888", fontSize: "12px", marginBottom: "16px" }}>—</div>}
            <button onClick={onClose} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#7c3aed,#e94560)", border: "none", color: "#fff", fontWeight: "700", fontSize: "14px", borderRadius: "12px", cursor: "pointer" }}>확인</button>
          </>
        )}
      </div>
    </div>
  );
}
