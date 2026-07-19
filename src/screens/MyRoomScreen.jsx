import { useState, useEffect } from "react";
import { DAILY_ACTIONS, SAVE_KEY, ACT_MAX } from "../data/gameData.js";
import { performAction, sleepDay } from "../systems/dailySystem.js";
import { isEventDay, nearestUpcomingEvent } from "../systems/eventSystem.js";
import { getJob, isWorkdayToday, hasWorkedToday } from "../systems/jobSystem.js";
import { canPackToday, doPack, PACK_JOB } from "../systems/packingSystem.js";
import { doCommission, COMMISSION_JOB } from "../systems/commissionSystem.js";
import { canTicket, resolveTicketing, TICKET_JOB, enterRaffle, todaysFanEvent, attendFanEvent } from "../systems/fanEventSystem.js";
import { unreadCount } from "../systems/messageSystem.js";
import WorkGame from "../components/WorkGame.jsx";
import { GoodsImg } from "../components/BoothStage.jsx";
import Avatar from "../components/Avatar.jsx";
import PhoneOS from "./PhoneOS.jsx";

/* ============================================================
   현생 — 내 방 1인칭 (데스크톱 전원 끄기 → 현생)
   가구를 클릭해서 하루를 보낸다: 침대(휴식/취침) 냉장고(밥) 책장(원작 수혈)
   굿즈선반(공식 굿즈 구경) 폰(숏츠/뉴짤/폰 열기) 현관(외출/행사장) 컴퓨터(데스크톱 복귀)
   시간대(오전→오후→저녁)에 따라 창밖과 방 조명이 변한다. 로직은 dailySystem 공유.
   ============================================================ */

const A = (id) => DAILY_ACTIONS.find(a => a.id === id);
function loadFirstArt() { try { const raw = localStorage.getItem(SAVE_KEY); const arr = raw ? JSON.parse(raw) : []; return arr[0] ? arr[0].thumb : null; } catch { return null; } }

// 클릭 가능한 가구 핫스팟 (호버 시 라벨 + 하이라이트)
function Hotspot({ x, y, w, h, bottom, label, icon, onClick, dim, z, children, pulse }) {
  const [hov, setHov] = useState(false);
  const pos = bottom != null ? { left: x, bottom, width: w, height: h } : { left: x, top: y, width: w, height: h };
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: "absolute", ...pos, cursor: onClick ? "pointer" : "default", zIndex: z || 5, opacity: dim ? 0.75 : 1 }}>
      {children}
      {onClick && (hov || pulse) && <div style={{ position: "absolute", inset: -4, borderRadius: 12, outline: `2.5px solid ${pulse ? "#e94560" : "rgba(255,209,102,0.85)"}`, background: pulse ? "rgba(233,69,96,0.10)" : "rgba(255,209,102,0.09)", pointerEvents: "none" }} />}
      {onClick && hov && <div style={{ position: "absolute", left: "50%", top: -30, transform: "translateX(-50%)", padding: "4px 12px", background: "rgba(15,12,30,0.92)", border: "1px solid #ffd16688", borderRadius: 14, fontSize: 12, fontWeight: 800, color: "#ffd166", whiteSpace: "nowrap", zIndex: 50, pointerEvents: "none" }}>{icon} {label}</div>}
    </div>
  );
}

export default function MyRoomScreen({ state, setState, onGoEvent, onPowerOn }) {
  const [toast, setToast] = useState(null);
  const [menu, setMenu] = useState(null);      // {title, opts:[{icon,label,desc,run,disabled}]}
  const [dawn, setDawn] = useState(null);      // 취침 전환 연출 {day}
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [minigame, setMinigame] = useState(null); // "pack" | "commission"
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const used = state.actionsToday || 0;
  const eventDay = isEventDay(state);
  const tod = eventDay ? "noon" : used === 0 ? "morning" : used === 1 ? "noon" : "night";
  const night = tod === "night";
  const nextEv = nearestUpcomingEvent(state);
  const job = getJob(state);
  const workToday = isWorkdayToday(state) && !hasWorkedToday(state) && !eventDay;
  const unread = unreadCount(state);
  const poster = loadFirstArt();
  const shelfGoods = (state.goods || []).filter(g => g.stock > 0).slice(0, 3);

  const run = (action) => {
    setMenu(null);
    const r = performAction(state, action);
    if (r.ok) setState(() => r.state);
    setToast(r);
  };
  const doSleep = () => {
    setMenu(null);
    const r = sleepDay(state);
    if (!r.ok) { setToast(r); return; }
    setDawn({ day: r.newDay });
    setTimeout(() => { setState(() => r.state); setToast(r); setDawn(null); }, 1300);
  };
  const openMenu = (title, opts) => setMenu({ title, opts });

  // 시간대별 색
  const sky = tod === "morning" ? "linear-gradient(180deg,#8fd3ff,#dff3ff)" : tod === "noon" ? "linear-gradient(180deg,#ffb35e,#ffe3b0)" : "linear-gradient(180deg,#0d1440,#28336b)";
  const wall = night ? "linear-gradient(180deg,#312b4e,#3a3358)" : tod === "noon" ? "linear-gradient(180deg,#f2e3cd,#eedabf)" : "linear-gradient(180deg,#f2ece1,#ece2d2)";
  const floor = night ? "linear-gradient(180deg,#4a3d5c,#3c3050)" : "linear-gradient(180deg,#caa27a,#b78e66)";
  const phaseLabel = eventDay ? "🎪 행사 당일" : tod === "morning" ? "🌅 오전" : tod === "noon" ? "☀️ 오후" : "🌙 저녁 · 자유시간";

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", fontFamily: "'Noto Sans KR',sans-serif", userSelect: "none" }}>
      {/* ── 방 배경 ── */}
      <div style={{ position: "absolute", inset: 0, background: wall }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "30%", background: floor, borderTop: night ? "3px solid #2c2440" : "3px solid #9a7450" }} />
      {night && <div style={{ position: "absolute", inset: 0, background: "rgba(18,16,52,0.35)", pointerEvents: "none", zIndex: 3 }} />}
      {/* 스탠드 조명 (밤) */}
      {night && <div style={{ position: "absolute", left: "58%", top: "18%", width: "26%", height: "50%", background: "radial-gradient(ellipse at center, rgba(255,214,140,0.30), transparent 65%)", pointerEvents: "none", zIndex: 3 }} />}

      {/* ── 냉장고 (밥 먹기) ── */}
      <Hotspot x="1.5%" y="20%" w="8.5%" h="46%" label="밥 먹기 (-₩3,000)" icon="🍱" onClick={() => run(A("eat"))}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#dfe6ee,#c3ccd8)", borderRadius: 10, border: "2px solid #a8b2c0" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: "34%", height: 2, background: "#a8b2c0" }} />
          <div style={{ position: "absolute", right: "12%", top: "14%", width: 4, height: "14%", background: "#8894a4", borderRadius: 2 }} />
          <div style={{ position: "absolute", right: "12%", top: "42%", width: 4, height: "20%", background: "#8894a4", borderRadius: 2 }} />
          <div style={{ position: "absolute", left: "12%", top: "6%", fontSize: 13 }}>🧲</div>
        </div>
      </Hotspot>

      {/* ── 창문 (시간대) ── */}
      <div style={{ position: "absolute", left: "13%", top: "9%", width: "16%", height: "33%", borderRadius: 8, border: night ? "5px solid #221d38" : "5px solid #b99d78", background: sky, boxShadow: night ? "0 0 26px rgba(80,100,220,0.25)" : "inset 0 0 20px rgba(255,255,255,0.4)", zIndex: 4, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 4, background: night ? "#221d38" : "#b99d78" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 4, background: night ? "#221d38" : "#b99d78" }} />
        {night && [14, 38, 66, 82].map((l, i) => <span key={i} style={{ position: "absolute", left: `${l}%`, top: `${12 + i * 16}%`, width: 3, height: 3, borderRadius: "50%", background: "#fff", opacity: 0.85 }} />)}
        {tod === "morning" && <span style={{ position: "absolute", right: "12%", top: "12%", width: 22, height: 22, borderRadius: "50%", background: "#fff6c9", boxShadow: "0 0 18px #fff6c9" }} />}
        {tod === "noon" && <span style={{ position: "absolute", left: "10%", top: "18%", width: 24, height: 24, borderRadius: "50%", background: "#ff8f5e", boxShadow: "0 0 20px #ff8f5e" }} />}
      </div>

      {/* ── 벽 포스터 (갤러리 첫 그림) ── */}
      {poster && <div style={{ position: "absolute", left: "31.5%", top: "9%", width: "8%", zIndex: 4, transform: "rotate(-1.5deg)" }}>
        <img src={poster} alt="" style={{ width: "100%", display: "block", border: "4px solid #fff", borderRadius: 3, boxShadow: "0 4px 14px rgba(0,0,0,0.3)", opacity: night ? 0.8 : 1 }} />
      </div>}

      {/* ── 책장 (원작 수혈) ── */}
      <Hotspot x="41%" y="12%" w="11.5%" h="54%" label="원작 수혈 (-₩2,000)" icon="📖" onClick={() => run(A("recharge"))}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#8a6844,#75563a)", borderRadius: 8, border: "2px solid #5e4530", padding: "6%", display: "flex", flexDirection: "column", gap: "5%" }}>
          {[0, 1, 2, 3].map(r => <div key={r} style={{ flex: 1, background: "#4a3524", borderRadius: 3, display: "flex", alignItems: "flex-end", gap: "3%", padding: "4% 5%" }}>
            {["#e94560", "#4cc9f0", "#ffd166", "#7c3aed", "#06d6a0", "#ff9f43"].slice(0, 4 + (r % 3)).map((c, i) => <span key={i} style={{ flex: 1, height: `${70 + ((r + i) % 3) * 12}%`, background: c, borderRadius: "2px 2px 0 0", opacity: night ? 0.7 : 0.92 }} />)}
          </div>)}
        </div>
      </Hotspot>

      {/* ── 굿즈 선반 (공식 굿즈 구경) ── */}
      <Hotspot x="55%" y="10%" w="14%" h="24%" label="공식 굿즈 구경 (-₩8,000)" icon="🛒" onClick={() => run(A("newgoods"))}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: "8%" }}>
          {[0, 1].map(r => <div key={r} style={{ flex: 1, background: night ? "#3f3654" : "#e7dcc9", border: `2px solid ${night ? "#2c2440" : "#c4b294"}`, borderRadius: 6, display: "flex", alignItems: "flex-end", justifyContent: "space-around", padding: "3% 6%", boxShadow: "0 4px 8px rgba(0,0,0,0.15)" }}>
            {r === 0
              ? shelfGoods.length ? shelfGoods.map(g => <div key={g.id} style={{ width: "26%", height: "88%", display: "flex", alignItems: "flex-end" }}><GoodsImg goods={g} style={{ width: "100%", maxHeight: "100%", objectFit: "contain" }} /></div>) : <span style={{ fontSize: 15, opacity: 0.7 }}>🫙 🧸 🎀</span>
              : <span style={{ fontSize: 15, opacity: 0.85, letterSpacing: 4 }}>🧸 🎀 🐰</span>}
          </div>)}
        </div>
      </Hotspot>

      {/* ── 행사 포장 박스 (D-1에만 등장) ── */}
      {canPackToday(state) && <Hotspot x="52.5%" bottom="4.5%" w="6%" h="13%" z={7} pulse label="행사 굿즈 포장하기 (행동 1)" icon="📦" onClick={() => setMinigame("pack")}>
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", left: "8%", bottom: 0, width: "84%", height: "52%", background: "#c9a06b", border: "2px solid #a87f4c", borderRadius: 4 }}>
            <div style={{ position: "absolute", left: "44%", top: 0, bottom: 0, width: "12%", background: "#e8d5b8" }} />
          </div>
          <div style={{ position: "absolute", left: "18%", bottom: "50%", width: "64%", height: "46%", background: "#d9b07c", border: "2px solid #b8905c", borderRadius: 4, transform: "rotate(-4deg)" }}>
            <div style={{ position: "absolute", left: "44%", top: 0, bottom: 0, width: "12%", background: "#f0e0c4" }} />
          </div>
        </div>
      </Hotspot>}

      {/* ── 책상 + 컴퓨터 + 폰 ── */}
      <div style={{ position: "absolute", left: "58%", top: "38%", width: "26%", height: "34%", zIndex: 5 }}>
        {/* 책상 */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "58%", height: "10%", background: night ? "#5a4668" : "#a97c52", borderRadius: 4, boxShadow: "0 3px 6px rgba(0,0,0,0.25)" }} />
        <div style={{ position: "absolute", left: "6%", top: "68%", width: "5%", height: "32%", background: night ? "#4a3a56" : "#8a6540" }} />
        <div style={{ position: "absolute", right: "6%", top: "68%", width: "5%", height: "32%", background: night ? "#4a3a56" : "#8a6540" }} />
        {/* 모니터 = 컴퓨터 켜기 */}
        <Hotspot x="16%" y="0%" w="46%" h="58%" label="컴퓨터 켜기 (게임으로)" icon="🖥" onClick={() => onPowerOn && onPowerOn()}>
          <div style={{ position: "absolute", inset: 0, background: "#16121f", borderRadius: 8, border: "3px solid #0c0a14", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: "7%", borderRadius: 4, background: "linear-gradient(135deg,#1a0a2e,#2a1240)", boxShadow: "inset 0 0 18px rgba(124,58,237,0.55)" }} />
            <span style={{ position: "relative", fontSize: 17, color: "#c084fc", textShadow: "0 0 12px #7c3aed" }}>⏻</span>
          </div>
          <div style={{ position: "absolute", left: "42%", top: "98%", width: "16%", height: "18%", background: "#0c0a14" }} />
        </Hotspot>
        {/* 커미션 태블릿 (의뢰가 있을 때만) */}
        {state.commission && <Hotspot x="0%" y="30%" w="14%" h="26%" pulse label={`커미션 작업 (₩${state.commission.amount.toLocaleString()} · D-${Math.max(0, state.commission.expiresDay - state.day)})`} icon="🎨" onClick={() => {
          if ((state.actionsToday || 0) >= ACT_MAX) { setToast({ text: "오늘 행동을 다 썼어요... 내일 꼭 작업하자 (기한 주의!)", type: "bad" }); return; }
          if ((state.stamina || 0) < 15) { setToast({ text: "체력이 부족해요 (15 이상 필요)", type: "bad" }); return; }
          setMinigame("commission");
        }}>
          <div style={{ position: "absolute", inset: 0, background: "#1e1a2e", border: "2px solid #0c0a14", borderRadius: 5, transform: "rotate(8deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, filter: "drop-shadow(0 0 4px rgba(124,58,237,0.8))" }}>🎨</span>
          </div>
        </Hotspot>}
        {/* 폰 스탠드 */}
        <Hotspot x="70%" y="34%" w="14%" h="24%" label="핸드폰" icon="📱" pulse={canTicket(state) || !!state.raffleOffer} onClick={() => openMenu("📱 핸드폰", [
          ...(canTicket(state) ? [{ icon: "🎫", label: `티켓팅 도전! 『${state.ticketing.name}』`, desc: "오늘 정오 오픈 · 광클 타이밍 승부 · 행동 1 소요", run: () => { setMenu(null); setMinigame("ticket"); } }] : []),
          ...(state.raffleOffer ? [{ icon: "🎁", label: "응모 이벤트 참여 (무료 · 원클릭)", desc: "결과는 며칠 뒤 메시지로 도착", run: () => { setMenu(null); setState(s => enterRaffle(s)); setToast({ text: "🎁 응모 완료! 두근두근...", type: "good" }); } }] : []),
          { icon: "📱", label: "폰 열기 (앱 사용)", desc: unread ? `안 읽은 메시지 ${unread}개` : "SNS·알바냥·은행…", run: () => { setMenu(null); setPhoneOpen(true); } },
          { icon: "📱", label: A("shorts").name, desc: `${A("shorts").desc} (멘탈 +${A("shorts").mental}·체력 ${A("shorts").stamina})`, run: () => run(A("shorts")) },
          { icon: "🎉", label: A("official").name, desc: "공식이 우릴 먹여살린다! (확률)", run: () => run(A("official")) },
        ])}>
          <div style={{ position: "absolute", inset: 0, background: "#1a1626", borderRadius: 5, border: "2px solid #0c0a14", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, filter: night ? "brightness(1.4)" : "none" }}>📱</span>
            {unread > 0 && <span style={{ position: "absolute", top: -6, right: -6, minWidth: 15, height: 15, borderRadius: 8, background: "#e94560", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread}</span>}
          </div>
        </Hotspot>
      </div>

      {/* ── 침대 (휴식/취침) ── */}
      <Hotspot x="2%" bottom="4%" w="25%" h="26%" label="침대" icon="😴" z={6} onClick={() => openMenu("🛏 침대", [
        { icon: "😴", label: `${A("sleep").name} (행동 1회)`, desc: `${A("sleep").desc} · 체력 +${A("sleep").stamina} 멘탈 +${A("sleep").mental}`, run: () => run(A("sleep")) },
        { icon: "🌙", label: "취침 — 하루 마무리", desc: "다음 날로 넘어가요 (체력·멘탈 +5)", run: doSleep },
      ])}>
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "58%", background: night ? "#57496e" : "#c9b8e8", borderRadius: "10px 10px 6px 6px", border: `2px solid ${night ? "#3c3050" : "#a48fd0"}` }} />
          <div style={{ position: "absolute", left: "4%", right: "30%", bottom: "26%", height: "44%", background: night ? "#6a5a88" : "#e2d6f8", borderRadius: 10, border: `2px solid ${night ? "#4a3a66" : "#bfa8ea"}` }} />
          <div style={{ position: "absolute", right: "5%", bottom: "40%", width: "22%", height: "26%", background: "#fff", borderRadius: 8, border: "2px solid #ddd", transform: "rotate(-4deg)" }} />
          <span style={{ position: "absolute", left: "10%", top: "8%", fontSize: 14, opacity: night ? 1 : 0 }}>💤</span>
        </div>
      </Hotspot>

      {/* ── 러그 + 나(아바타) ── */}
      <div style={{ position: "absolute", left: "34%", bottom: "5%", width: "20%", height: "12%", background: night ? "radial-gradient(ellipse, #5a4a72, #4a3d5c)" : "radial-gradient(ellipse, #e8b4c8, #d99cb4)", borderRadius: "50%", opacity: 0.9, zIndex: 4 }} />
      <div title="나 (코디는 인터넷 › 코디몰에서)" style={{ position: "absolute", left: "40%", bottom: "8%", height: "26%", zIndex: 6, filter: night ? "brightness(0.82)" : "none" }}>
        <Avatar avatar={state.avatar} />
      </div>

      {/* ── 현관문 (외출/행사장) ── */}
      <Hotspot x="87.5%" y="10%" w="10.5%" h="58%" label={eventDay ? "행사장으로 출발!" : todaysFanEvent(state) ? `오늘 『${todaysFanEvent(state).name}』!` : "외출하기"} icon={eventDay ? "🎪" : todaysFanEvent(state) ? "💖" : "🚪"} pulse={eventDay || !!todaysFanEvent(state)} onClick={() => {
        if (eventDay) { onGoEvent && onGoEvent(); return; }
        const fe = todaysFanEvent(state);
        openMenu("🚪 외출", [
          ...(fe ? [{ icon: fe.icon || "💖", label: `${fe.name} 가기 (₩${(fe.cost || 0).toLocaleString()} · 행동 1)`, desc: "오늘이 그날! 안 가면 표가 아깝다... (현장 한정 굿즈 확률)", run: () => {
            setMenu(null);
            if ((state.actionsToday || 0) >= ACT_MAX) { setToast({ text: "오늘 행동을 다 썼어요... 이대로면 못 간다!", type: "bad" }); return; }
            if ((state.gold || 0) < fe.cost) { setToast({ text: `지갑이 가볍다... (₩${fe.cost.toLocaleString()} 필요)`, type: "bad" }); return; }
            setState(s => attendFanEvent(s));
            setToast({ text: `${fe.icon || "💖"} 『${fe.name}』 최고였다...!! 오늘을 위해 살았다 (멘탈 +${fe.mental})`, type: "good" });
          } }] : []),
          { icon: "🏃", label: A("exercise").name, desc: `${A("exercise").desc} · 체력 +${A("exercise").stamina} 멘탈 +${A("exercise").mental}`, run: () => run(A("exercise")) },
          { icon: "☕", label: A("collab").name, desc: `${A("collab").desc} (-₩5,000)`, run: () => run(A("collab")) },
          ...(job && workToday ? [{ icon: "🐱", label: `알바 출근은 폰으로!`, desc: `오늘 ${job.name} 근무일 — 📱 알바냥 앱에서 출근`, run: () => { setMenu(null); setPhoneOpen(true); } }] : []),
        ]);
      }}>
        <div style={{ position: "absolute", inset: 0, background: night ? "linear-gradient(180deg,#4e3f60,#443552)" : "linear-gradient(180deg,#b98a5c,#a87a4e)", borderRadius: "8px 8px 0 0", border: `3px solid ${night ? "#332a44" : "#8a6540"}` }}>
          <div style={{ position: "absolute", inset: "7% 12%", border: `2px solid ${night ? "#3c3050" : "#96703f"}`, borderRadius: 6 }} />
          <div style={{ position: "absolute", left: "16%", top: "48%", width: 9, height: 9, borderRadius: "50%", background: "#ffd166", boxShadow: "0 0 6px rgba(255,209,102,0.6)" }} />
          {eventDay && <span style={{ position: "absolute", left: "50%", top: "-14%", transform: "translateX(-50%)", fontSize: 18 }}>🎪</span>}
        </div>
      </Hotspot>

      {/* ── HUD (상단) ── */}
      <div style={{ position: "absolute", left: "50%", top: 12, transform: "translateX(-50%)", display: "flex", gap: 8, alignItems: "center", zIndex: 40, background: "rgba(15,12,30,0.82)", border: "1px solid #2a2a4a", borderRadius: 14, padding: "8px 16px" }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#ffd166" }}>Day {state.day}</span>
        <span style={{ fontSize: 11, color: "#c084fc", fontWeight: 700 }}>{phaseLabel}</span>
        <span style={{ width: 1, height: 14, background: "#2a2a4a" }} />
        <span style={{ fontSize: 11, color: "#ffd166" }}>💰 ₩{(state.gold || 0).toLocaleString()}</span>
        <span style={{ fontSize: 11, color: state.stamina < 30 ? "#e94560" : "#06d6a0" }}>⚡ {state.stamina}%</span>
        <span style={{ fontSize: 11, color: state.mentalHealth < 30 ? "#e94560" : "#c084fc" }}>🧠 {state.mentalHealth}%</span>
        <span style={{ width: 1, height: 14, background: "#2a2a4a" }} />
        <span style={{ fontSize: 11, color: used >= ACT_MAX ? "#e94560" : "#9a8fc0" }}>행동 {used}/{ACT_MAX}</span>
        {nextEv && !eventDay && <span style={{ fontSize: 11, color: "#9a8fc0" }}>📅 {nextEv.name} D-{nextEv.startDay - state.day}</span>}
      </div>

      {/* ── 토스트 ── */}
      {toast && <div style={{ position: "absolute", left: "50%", bottom: 26, transform: "translateX(-50%)", zIndex: 60, background: toast.type === "bad" ? "rgba(42,10,10,0.95)" : toast.type === "good" ? "rgba(10,42,26,0.95)" : "rgba(22,22,40,0.95)", border: `1px solid ${toast.type === "bad" ? "#e94560" : toast.type === "good" ? "#06d6a0" : "#3a3a6a"}`, borderRadius: 12, padding: "10px 20px", textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: toast.type === "bad" ? "#ff8fb0" : toast.type === "good" ? "#06d6a0" : "#c7c0e0" }}>{toast.text}</div>
        {toast.sub && <div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>{toast.sub}</div>}
      </div>}

      {/* ── 선택 메뉴 ── */}
      {menu && <div onClick={() => setMenu(null)} style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(8,6,20,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 360, background: "#14112a", border: "1px solid #3a3a6a", borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#ffd166", marginBottom: 12 }}>{menu.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {menu.opts.map((o, i) => (
              <button key={i} onClick={o.run} style={{ display: "flex", gap: 11, alignItems: "center", padding: "11px 13px", borderRadius: 11, border: "1px solid #2a2a4a", background: "#1a1733", color: "#e0e0ff", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{o.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{o.label}</span>
                  {o.desc && <span style={{ display: "block", fontSize: 10, color: "#8a80a8", marginTop: 2 }}>{o.desc}</span>}
                </span>
              </button>))}
            <button onClick={() => setMenu(null)} style={{ padding: 9, borderRadius: 10, border: "1px solid #2a2a4a", background: "transparent", color: "#666", cursor: "pointer", fontSize: 12 }}>취소</button>
          </div>
        </div>
      </div>}

      {/* ── 포장/커미션 미니게임 ── */}
      {minigame && <div style={{ position: "absolute", inset: 0, zIndex: 85, background: "rgba(5,5,15,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 380, height: 520, borderRadius: 20, overflow: "hidden", border: "1px solid #3a3a6a", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
          <WorkGame job={minigame === "pack" ? PACK_JOB : minigame === "ticket" ? TICKET_JOB : COMMISSION_JOB}
            subtitle={minigame === "pack" ? "행사 전날 · 내 방" : minigame === "ticket" ? `『${state.ticketing ? state.ticketing.name : ""}』 서버 오픈!` : `${state.commission ? state.commission.from : ""}님 의뢰 작업 중`}
            doneLabel={minigame === "pack" ? "📦 포장 끝! (행동 1 소요)" : minigame === "ticket" ? "🎫 결제 시도!! (행동 1 소요)" : "🎨 납품하기 (행동 1 소요)"}
            cancelLabel="나중에"
            onCancel={() => setMinigame(null)}
            onDone={(mult, label) => {
              if (minigame === "pack") { setState(s => doPack(s, mult)); setToast({ text: `📦 포장 완료! ${label} — 내일 행사가 든든하다`, type: "good" }); }
              else if (minigame === "ticket") {
                const r = resolveTicketing(state, mult);
                setState(() => r.state);
                setToast(r.ok ? { text: `🎫 예매 성공!! 『${r.ticket.name}』 캘린더 확인!`, type: "good" } : { text: "🎫 서버가 터졌다... 예매 실패 (메루마켓에 양도표가 뜰지도)", type: "bad" });
              }
              else { const pay = Math.max(1000, Math.round((state.commission ? state.commission.amount : 0) * mult / 100) * 100); setState(s => doCommission(s, mult)); setToast({ text: `🎨 커미션 납품! ${label} +₩${pay.toLocaleString()}`, type: "good" }); }
              setMinigame(null);
            }} />
        </div>
      </div>}

      {/* ── 취침 전환 ── */}
      {dawn && <div style={{ position: "absolute", inset: 0, zIndex: 90, background: "#05050c", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, animation: "roomFade 1.3s ease" }}>
        <style>{`@keyframes roomFade{0%{opacity:0}25%{opacity:1}80%{opacity:1}100%{opacity:0.9}}`}</style>
        <span style={{ fontSize: 34 }}>🌙</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#c084fc" }}>Day {dawn.day}</span>
        <span style={{ fontSize: 11, color: "#555" }}>새로운 아침이 밝았다...</span>
      </div>}

      {/* ── 핸드폰 오버레이 ── */}
      <div style={{ position: "absolute", right: 26, bottom: phoneOpen ? 18 : -760, width: 340, height: "min(700px, 88%)", transition: "bottom .35s cubic-bezier(.4,1.15,.5,1)", zIndex: 80 }}>
        <PhoneOS state={state} setState={setState} onClose={() => setPhoneOpen(false)} />
      </div>
      {!phoneOpen && <button onClick={() => setPhoneOpen(true)} style={{ position: "absolute", right: 22, bottom: 20, width: 50, height: 50, borderRadius: "50%", background: "linear-gradient(145deg,#7c3aed,#e94560)", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", zIndex: 75, boxShadow: "0 5px 16px rgba(124,58,237,0.5)" }}>📱
        {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: "#e94560", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", border: "2px solid #171225" }}>{unread}</span>}
      </button>}
    </div>
  );
}
