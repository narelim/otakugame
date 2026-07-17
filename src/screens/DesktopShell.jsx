import { useState, useEffect, useRef, useCallback } from "react";
import { putBlob, getBlob, delBlob } from "../systems/assetStore.js";
import { nearestUpcomingEvent, isEventDay } from "../systems/eventSystem.js";
import { resolveChoice, applyEventDelta } from "../systems/snsEventSystem.js";
import EventModal from "../components/EventModal.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import StudioApp from "./StudioApp.jsx";
import InternetApp from "./InternetApp.jsx";
import BoothPlannerApp from "./BoothPlannerApp.jsx";
import PhoneOS from "./PhoneOS.jsx";
import { unreadCount } from "../systems/messageSystem.js";
import { DailyScreen, EventScreen, GalleryScreen } from "./gameScreens.jsx";

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

/* ============================================================
   가로(1920×1080) 데스크톱 셸 — "게임 화면 = 내 컴퓨터" 컨셉. 기본 진입 화면.
   세로/탭 게임은 #mobile 라우트의 레거시로 남아 같은 state를 공유.
   앱 타일 → 전체화면 창으로 게임 로직 연결 (maitalk은 준비중 플레이스홀더).
   ============================================================ */

const STAGE_W = 1920, STAGE_H = 1080;

// 1920×1080 고정 스테이지를 창 크기에 맞춰 통째로 스케일(레터박스). 어떤 기기든 디자인 그대로 유지.
function Stage({ children }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#05050c", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "center center", position: "relative", flexShrink: 0, fontFamily: "'Noto Sans KR',sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

const DESKTOP_APPS = [
  { id: "internet", icon: "🌐", name: "인터넷",      side: "left",  sub: "메이저랜드 · 굿즈컴퍼니" },
  { id: "studio",   icon: "🎨", name: "스튜디오",     side: "right", sub: "그림 그리기" },
  { id: "booth",    icon: "🏪", name: "부스 planner", side: "right", sub: "부스 꾸미기" },
  { id: "gallery",  icon: "🖼", name: "갤러리",       side: "right", sub: "작품 보관" },
];

// 바탕화면 앱 타일
function AppTile({ app, x, y, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => onOpen(app.id)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute", left: x, top: y, width: 172, height: 128,
        background: hover ? "rgba(124,58,237,0.28)" : "rgba(13,13,26,0.55)",
        backdropFilter: "blur(8px)", border: `1.5px solid ${hover ? "#c084fc" : "rgba(124,58,237,0.35)"}`,
        borderRadius: 18, cursor: "pointer", color: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
        transition: "all .16s ease", boxShadow: hover ? "0 10px 30px rgba(124,58,237,0.4)" : "0 4px 14px rgba(0,0,0,0.3)",
        transform: hover ? "translateY(-3px)" : "none",
      }}>
      <span style={{ fontSize: 46, lineHeight: 1 }}>{app.icon}</span>
      <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 1 }}>{app.name}</span>
      <span style={{ fontSize: 11, color: "#9a8fc0" }}>{app.sub}</span>
    </button>
  );
}

const TASKBAR_H = 64;
const PHONE_W = 390, PHONE_H = 840;

// 앱별 실제 화면 연결. 없으면 "준비중" 플레이스홀더.
function appContent(id, state, setState) {
  if (id === "studio") return <StudioApp state={state} setState={setState} />;
  if (id === "internet") return <InternetApp state={state} setState={setState} />;
  if (id === "booth") return <BoothPlannerApp state={state} setState={setState} />;
  if (id === "gallery") return <GalleryScreen />;
  return null;
}

// 앱 창(window) — 전체화면. 상단 타이틀바(앱명 + X), 하단 작업표시줄은 항상 아래 유지.
function AppWindow({ app, onClose, state, setState }) {
  if (!app) return null;
  const content = appContent(app.id, state, setState);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: STAGE_W, height: STAGE_H - TASKBAR_H, background: "#12122a", display: "flex", flexDirection: "column", overflow: "hidden", animation: "winIn .16s ease", zIndex: 40 }}>
      <div style={{ height: 46, background: "#0a0a18", borderBottom: "1px solid #2a2a4a", display: "flex", alignItems: "center", padding: "0 18px", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>{app.icon}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#e0e0ff", flex: 1 }}>{app.name}</span>
        <button onClick={onClose} title="닫기 (Esc)" style={{ width: 34, height: 34, borderRadius: 8, background: "transparent", border: "none", color: "#e94560", fontSize: 20, cursor: "pointer", fontWeight: 700 }}>✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <ErrorBoundary key={app.id}>
          {content || (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#555" }}>
              <span style={{ fontSize: 72, opacity: 0.5 }}>{app.icon}</span>
              <span style={{ fontSize: 17, color: "#7a7a9a" }}>{app.name} — 준비중</span>
              <span style={{ fontSize: 12, color: "#444" }}>여기에 실제 화면이 전체화면으로 연결됩니다</span>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default function DesktopShell({ state, setState }) {
  const [openApp, setOpenApp] = useState(null);
  const [wallpaper, setWallpaper] = useState(null); // objectURL
  const [powerMenu, setPowerMenu] = useState(false);
  const [powerMode, setPowerMode] = useState(null); // null | "daily" | "event" (컴퓨터 끄고 현생)
  const [statusOpen, setStatusOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const fileRef = useRef(null);
  const urlRef = useRef(null);

  // 저장된 바탕화면 불러오기
  useEffect(() => {
    let alive = true;
    getBlob("wallpaper").then(blob => {
      if (alive && blob) { const u = URL.createObjectURL(blob); urlRef.current = u; setWallpaper(u); }
    });
    return () => { alive = false; if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, []);

  // 실시간 시계
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  // Tab = 상태보드 토글 (PC). 모바일은 이식 시 핸들 버튼 추가.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Tab") { e.preventDefault(); setStatusOpen(v => !v); }
      if (e.key === "Escape") { setOpenApp(null); setPowerMenu(false); setPhoneOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pickWallpaper = useCallback((e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    putBlob("wallpaper", f);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const u = URL.createObjectURL(f); urlRef.current = u; setWallpaper(u);
    e.target.value = "";
  }, []);
  const resetWallpaper = () => { delBlob("wallpaper"); if (urlRef.current) URL.revokeObjectURL(urlRef.current); urlRef.current = null; setWallpaper(null); };

  const openAppObj = DESKTOP_APPS.find(a => a.id === openApp) || null;
  const leftApps = DESKTOP_APPS.filter(a => a.side === "left");
  const rightApps = DESKTOP_APPS.filter(a => a.side === "right");
  const hhmm = clock.toTimeString().slice(0, 5);
  // 실제 게임 상태 기반 값
  const gd = state.gameDate || { month: 5, day: 1 };
  const dateLabel = `${MONTHS[(gd.month - 1) % 12]} ${gd.day}일 · ${state.day || 1}일차`;
  const upcoming = nearestUpcomingEvent(state);
  const dday = upcoming ? Math.max(0, upcoming.startDay - (state.day || 1)) : null;
  const eventDay = isEventDay(state);
  const unread = unreadCount(state);

  return (
    <Stage>
      <style>{`@keyframes winIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* 바탕화면 배경 */}
      <div style={{ position: "absolute", inset: 0, background: wallpaper ? `#000 center/cover no-repeat url(${wallpaper})` : "linear-gradient(140deg,#0d0d1a 0%,#1a0a2e 55%,#2a1240 100%)" }}>
        {!wallpaper && [...Array(20)].map((_, i) => <div key={i} style={{ position: "absolute", width: 4 + (i % 4) * 3, height: 4 + (i % 4) * 3, borderRadius: "50%", background: ["#e94560", "#7c3aed", "#ffd166", "#06d6a0"][i % 4], left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`, opacity: 0.35 }} />)}
      </div>

      {/* 좌측 앱 */}
      {leftApps.map((a, i) => <AppTile key={a.id} app={a} x={48} y={100 + i * 152} onOpen={setOpenApp} />)}
      {/* 우측 앱 */}
      {rightApps.map((a, i) => <AppTile key={a.id} app={a} x={STAGE_W - 48 - 172} y={100 + i * 152} onOpen={setOpenApp} />)}

      {/* 상단 중앙: 다가오는 일정 카운트다운 */}
      <div style={{ position: "absolute", left: (STAGE_W - 900) / 2, top: 100, width: 900, height: 172, background: "rgba(13,13,26,0.55)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(124,58,237,0.35)", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff" }}>
        <div style={{ fontSize: 13, letterSpacing: 4, color: "#9a8fc0" }}>📅 다가오는 일정</div>
        {upcoming
          ? <div style={{ fontSize: 40, fontWeight: 900, background: "linear-gradient(135deg,#e94560,#7c3aed,#ffd166)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{upcoming.name} <span style={{ fontSize: 30 }}>{dday === 0 ? "D-DAY" : `D-${dday}`}</span></div>
          : <div style={{ fontSize: 28, fontWeight: 800, color: "#555" }}>예정된 일정이 없어요</div>}
        <div style={{ fontSize: 13, color: "#666" }}>{upcoming ? "인터넷 › 메이저랜드에서 신청하세요" : "장르를 만들면 행사 일정이 생겨요"}</div>
      </div>

      {/* 앱 창 (전체화면) — 작업표시줄 위쪽 영역을 덮음 */}
      <AppWindow app={openAppObj} onClose={() => setOpenApp(null)} state={state} setState={setState} />
      <input ref={fileRef} type="file" accept="image/*" onChange={pickWallpaper} style={{ display: "none" }} />

      {/* 하단 리본 = 데스크톱 작업표시줄 (데스크톱·앱 위에 항상 유지) */}
      <div style={{ position: "absolute", left: 0, top: STAGE_H - TASKBAR_H, width: STAGE_W, height: TASKBAR_H, background: "rgba(8,8,18,0.92)", backdropFilter: "blur(10px)", borderTop: "1px solid #2a2a4a", display: "flex", alignItems: "center", padding: "0 20px", gap: 14, zIndex: 50 }}>
        {/* 좌: 전원 */}
        <button onClick={() => setPowerMenu(true)} title="컴퓨터 끄기" style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(233,69,96,0.15)", border: "1px solid #e94560", color: "#e94560", fontSize: 22, cursor: "pointer", flexShrink: 0 }}>⏻</button>
        {openApp && <button onClick={() => setOpenApp(null)} title="바탕화면 보기" style={{ height: 40, padding: "0 14px", borderRadius: 10, background: "rgba(124,58,237,0.18)", border: "1px solid #7c3aed", color: "#c084fc", fontSize: 13, cursor: "pointer", fontWeight: 700, flexShrink: 0 }}>🖥 바탕화면</button>}
        <div style={{ width: 1, height: 30, background: "#2a2a4a", flexShrink: 0 }} />
        {/* 중앙: 앱 바로가기 (핀 고정 느낌) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          {DESKTOP_APPS.map(a => (
            <button key={a.id} onClick={() => setOpenApp(a.id)} title={a.name}
              style={{ width: 44, height: 44, borderRadius: 10, background: openApp === a.id ? "rgba(124,58,237,0.3)" : "transparent", border: openApp === a.id ? "1px solid #c084fc" : "1px solid transparent", color: "#fff", fontSize: 22, cursor: "pointer", flexShrink: 0 }}>{a.icon}</button>
          ))}
        </div>
        {/* 우: 배경변경 · 핸드폰 · 시계 */}
        <button onClick={() => fileRef.current && fileRef.current.click()} title="바탕화면 변경" style={{ width: 40, height: 40, borderRadius: 10, background: "transparent", border: "1px solid #2a2a4a", color: "#9a8fc0", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>🖼</button>
        {wallpaper && <button onClick={resetWallpaper} title="기본 배경" style={{ height: 30, padding: "0 10px", borderRadius: 8, background: "transparent", border: "1px solid #2a2a4a", color: "#555", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>기본값</button>}
        <button onClick={() => setPhoneOpen(v => !v)} title="핸드폰" style={{ position: "relative", width: 44, height: 44, borderRadius: 12, background: "linear-gradient(145deg,#7c3aed,#e94560)", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", flexShrink: 0, boxShadow: "0 4px 14px rgba(124,58,237,0.5)" }}>📱
          {unread > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, background: "#e94560", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", border: "2px solid #08081a" }}>{unread > 99 ? "99+" : unread}</span>}
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", color: "#c7c0e0", flexShrink: 0, minWidth: 110 }}>
          <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{hhmm}</span>
          <span style={{ fontSize: 11, color: "#666" }}>{dateLabel}</span>
        </div>
      </div>

      {/* 상태보드 (Tab) — 상단에서 슬라이드 */}
      <div style={{ position: "absolute", left: "50%", top: statusOpen ? 24 : -140, transform: "translateX(-50%)", width: 720, height: 96, background: "rgba(10,10,24,0.92)", border: "1.5px solid #2a2a4a", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "space-around", transition: "top .28s cubic-bezier(.4,1.3,.5,1)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", zIndex: 60 }}>
        {[["💰", "골드", "₩" + (state.gold || 0).toLocaleString(), "#ffd166"], ["⚡", "체력", `${state.stamina ?? 0}`, "#06d6a0"], ["⭐", "인지도", `${state.fame ?? 0}`, "#4cc9f0"], ["🧠", "멘탈", `${state.mentalHealth ?? 0}`, "#c084fc"]].map(([ic, la, va, co]) =>
          <div key={la} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 22 }}>{ic}</span>
            <span style={{ fontSize: 11, color: "#666" }}>{la}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: co }}>{va}</span>
          </div>)}
        <div style={{ position: "absolute", right: 16, bottom: 6, fontSize: 10, color: "#444" }}>Tab 으로 열고 닫기</div>
      </div>

      {/* 핸드폰 — 아래에서 올라오고, 집어넣으면 내려간다 */}
      <div style={{ position: "absolute", right: 56, bottom: phoneOpen ? TASKBAR_H + 14 : -(PHONE_H + 80), width: PHONE_W, height: PHONE_H, transition: "bottom .35s cubic-bezier(.4,1.15,.5,1)", zIndex: 55 }}>
        <PhoneOS state={state} setState={setState} onClose={() => setPhoneOpen(false)} />
      </div>

      {/* 전원 메뉴 */}
      {powerMenu && (
        <div onClick={() => setPowerMenu(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, background: "#12122a", border: "1.5px solid #2a2a4a", borderRadius: 20, padding: 28, textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>⏻</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>컴퓨터를 끄고 나갈까요?</div>
            <div style={{ fontSize: 13, color: "#7a7a9a", marginBottom: 22, lineHeight: 1.6 }}>PC를 끄면 현생을 살 수 있어요.<br />일상을 보내거나, 행사날이면 행사장에 갈 수 있어요.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setPowerMenu(false); setPowerMode("daily"); }} style={{ padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c3aed,#e94560)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>🌙 일상 보내기</button>
              <button disabled={!eventDay} onClick={() => { if (eventDay) { setPowerMenu(false); setPowerMode("event"); } }} style={{ padding: "13px", borderRadius: 12, border: `1px solid ${eventDay ? "#e94560" : "#2a2a4a"}`, background: eventDay ? "rgba(233,69,96,0.15)" : "transparent", color: eventDay ? "#e94560" : "#444", fontWeight: 700, fontSize: 15, cursor: eventDay ? "pointer" : "not-allowed" }}>🎪 행사장 가기 {eventDay ? `(${(state.activeEvent && state.activeEvent.name) || "행사"} 당일!)` : "(오늘 행사 없음)"}</button>
              <button onClick={() => setPowerMenu(false)} style={{ padding: "11px", borderRadius: 12, border: "1px solid #2a2a4a", background: "transparent", color: "#9a8fc0", fontSize: 14, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 현생 모드: 컴퓨터 끄고 일상/행사장 (기존 화면 재사용, 세로 화면이라 중앙 정렬) */}
      {powerMode && (
        <div style={{ position: "absolute", inset: 0, zIndex: 90, background: "#05050c", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#0a0a18", borderBottom: "1px solid #2a2a4a" }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: powerMode === "event" ? "#e94560" : "#c084fc" }}>{powerMode === "event" ? "🎪 행사장" : "🌙 현생 (컴퓨터 꺼짐)"}</span>
            <button onClick={() => setPowerMode(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #7c3aed", background: "rgba(124,58,237,0.15)", color: "#c084fc", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⏻ 컴퓨터 켜기</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <div style={{ width: "100%", maxWidth: powerMode === "event" ? 680 : 480, height: "100%" }}>
              <ErrorBoundary key={powerMode}>
                {powerMode === "daily"
                  ? <DailyScreen state={state} setState={setState} />
                  : <EventScreen state={state} setState={setState} onBack={() => setPowerMode(null)} />}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}

      {/* SNS/행사 이벤트 모달 (데스크톱에서도 동작) */}
      {state.pendingSnsEvent && <EventModal data={state.pendingSnsEvent}
        onChoice={(idx) => setState(s => { const pe = s.pendingSnsEvent; if (!pe) return s; const r = resolveChoice(pe.event, idx); let ns = applyEventDelta(s, r.delta); return { ...ns, pendingSnsEvent: { event: pe.event, result: r.delta, needsChoice: false, chosen: true }, flags: { ...ns.flags, wantNewGenre: r.createGenreTrigger || ns.flags.wantNewGenre } }; })}
        onClose={() => setState(s => ({ ...s, pendingSnsEvent: null }))} />}
    </Stage>
  );
}
