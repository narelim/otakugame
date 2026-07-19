import { useState, useRef, useEffect } from "react";

/* ============================================================
   출근 미니게임 — 타이밍 바 3라운드 (알바별 스킨은 job.game으로)
   커서가 좌우로 왕복 → 탭해서 멈춤. 중앙 PERFECT(2점) / 주변 GOOD(1점).
   라운드마다 속도 상승. 총점 → 일당 배율: 5+ ×1.4 / 3+ ×1.0 / 1+ ×0.7 / 0 ×0.5
   ============================================================ */

const ROUNDS = 3;
const PERFECT_W = 0.14, GOOD_W = 0.4; // 판정 폭 (중앙 기준 비율)
const SPEEDS = [0.9, 1.25, 1.65];     // 왕복/초
const nowMs = () => performance.now();

const multOf = (score) => score >= 5 ? 1.4 : score >= 3 ? 1.0 : score >= 1 ? 0.7 : 0.5;
const gradeLabel = (score) => score >= 5 ? "완벽한 근무! 🌟" : score >= 3 ? "무난한 하루 👍" : score >= 1 ? "아슬아슬... 💦" : "혼났다... 😵";

export default function WorkGame({ job, onDone, onCancel, subtitle, doneLabel, cancelLabel }) {
  const g = job.game || { title: "근무", hint: "타이밍에 맞춰 탭!", color: "#ff9f43" };
  const [round, setRound] = useState(0);          // 0..ROUNDS-1, ROUNDS면 결과
  const [pos, setPos] = useState(0);              // 커서 위치 0~1
  const [hits, setHits] = useState([]);           // 라운드별 {pts,label}
  const [flash, setFlash] = useState(null);       // 판정 플래시
  const runRef = useRef(null);                    // {t0, speed, raf, stopped}
  const done = round >= ROUNDS;
  const score = hits.reduce((s, h) => s + h.pts, 0);

  // 라운드 시작: rAF로 커서 왕복 (삼각파)
  useEffect(() => {
    if (done) return;
    const run = { t0: nowMs(), speed: SPEEDS[round] || 1, raf: 0, stopped: false };
    runRef.current = run;
    const tick = () => {
      if (run.stopped) return;
      const t = (nowMs() - run.t0) / 1000 * run.speed;
      const tri = 1 - Math.abs((t % 2) - 1); // 0→1→0 왕복
      setPos(tri);
      run.raf = requestAnimationFrame(tick);
    };
    run.raf = requestAnimationFrame(tick);
    return () => { run.stopped = true; cancelAnimationFrame(run.raf); };
  }, [round, done]);

  const tap = () => {
    const run = runRef.current; if (!run || run.stopped) return;
    run.stopped = true; cancelAnimationFrame(run.raf);
    const d = Math.abs(pos - 0.5) * 2; // 중앙에서의 거리 0~1
    const hit = d <= PERFECT_W ? { pts: 2, label: "PERFECT!" } : d <= GOOD_W ? { pts: 1, label: "GOOD" } : { pts: 0, label: "MISS..." };
    setHits(h => [...h, hit]); setFlash(hit);
    setTimeout(() => { setFlash(null); setRound(r => r + 1); }, 700);
  };

  const box = { background: "#12122a", border: "1px solid #2a2a4a", borderRadius: 14 };
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#0d0d1a", color: "#e0e0ff", fontFamily: "'Noto Sans KR',sans-serif" }}>
      <div style={{ padding: "13px 16px", background: `linear-gradient(135deg,${g.color},#1a1430)`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{job.icon} {g.title}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{subtitle || `${job.name} 출근 중`}</div>
        </div>
        {!done && <button onClick={onCancel} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.4)", background: "transparent", color: "#fff", fontSize: 11, cursor: "pointer" }}>{cancelLabel || "조퇴"}</button>}
      </div>

      {!done ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 18px", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#9a8fc0" }}>ROUND {round + 1} / {ROUNDS}</div>
            <div style={{ fontSize: 13, color: "#c7c0e0", marginTop: 4 }}>{g.hint}</div>
          </div>
          {/* 타이밍 바 */}
          <div style={{ position: "relative", height: 52, ...box, overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(0.5 - GOOD_W / 2) * 100}%`, width: `${GOOD_W * 100}%`, background: "rgba(255,209,102,0.16)" }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(0.5 - PERFECT_W / 2) * 100}%`, width: `${PERFECT_W * 100}%`, background: `${g.color}55`, borderLeft: `1px solid ${g.color}`, borderRight: `1px solid ${g.color}` }} />
            <div style={{ position: "absolute", top: 3, bottom: 3, left: `${pos * 100}%`, width: 4, marginLeft: -2, background: "#fff", borderRadius: 2, boxShadow: `0 0 10px ${g.color}` }} />
            {flash && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: flash.pts === 2 ? "#ffd166" : flash.pts === 1 ? "#06d6a0" : "#e94560", background: "rgba(13,13,26,0.55)" }}>{flash.label}</div>}
          </div>
          <button onClick={tap} disabled={!!flash} style={{ padding: 18, borderRadius: 14, border: "none", background: flash ? "#1a1a3a" : `linear-gradient(135deg,${g.color},#7c3aed)`, color: "#fff", fontWeight: 900, fontSize: 17, cursor: flash ? "default" : "pointer", boxShadow: flash ? "none" : `0 4px 18px ${g.color}66` }}>탭!</button>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {Array.from({ length: ROUNDS }, (_, i) => <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: hits[i] ? (hits[i].pts === 2 ? "#ffd166" : hits[i].pts === 1 ? "#06d6a0" : "#e94560") : "#2a2a4a" }} />)}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 20px", gap: 14, textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>{score >= 5 ? "🌟" : score >= 3 ? "😊" : score >= 1 ? "😅" : "😵"}</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#ffd166" }}>{gradeLabel(score)}</div>
          <div style={{ fontSize: 12, color: "#9a8fc0" }}>판정 {hits.map(h => h.label).join(" · ")}<br />일당 배율 ×{multOf(score)}</div>
          <button onClick={() => onDone(multOf(score), gradeLabel(score), score)} style={{ padding: 15, borderRadius: 13, border: "none", background: "linear-gradient(135deg,#ff9f43,#e94560)", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>{doneLabel || "💼 퇴근! (일당 적립)"}</button>
        </div>
      )}
    </div>
  );
}
