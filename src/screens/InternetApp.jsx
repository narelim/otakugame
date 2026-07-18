import { useState, useEffect } from "react";
import { BOOTH_SIZES, SCALE_LABEL } from "../data/gameData.js";
import { nearestAppliedEvent } from "../systems/eventSystem.js";
import { logTx } from "../systems/bankSystem.js";
import { pushMessage } from "../systems/messageSystem.js";
import GoodsFactoryStore from "./GoodsFactoryStore.jsx";
import GenreLabSite from "./GenreLabSite.jsx";
import CodiMallSite from "./CodiMallSite.jsx";

/* ============================================================
   인터넷 앱 (데스크톱 창 내부) — 브라우저 메타포
   - home: 북마크 사이트(메이저랜드·굿즈팩토리) + 계정 메뉴(내정보/장르/지갑/활동기록)
   - 메이저랜드 / 굿즈팩토리: 서로 "다른 회사"처럼 완전히 다른 사이트 디자인
   - 내정보: 구글 프로필풍 (이름·친구코드 복사·저장) — 친구코드는 향후 교류회(멀티) 초대용
   브라우저 내부는 밝은 웹 톤으로 어두운 OS와 대비.
   기존에 연결 예정인 로직(메이저랜드 부스신청 / 굿즈팩토리 굿즈제작)은 자리만 잡아둠.
   ============================================================ */

const FRIEND_CODE_KEY = "seoko_friend_code";
const PROFILE_KEY = "seoko_web_profile";

// 뒤로/홈 버튼이 붙는 공통 사이트 프레임
function Site({ onHome, children }) {
  return (
    <div style={{ position: "relative", height: "100%", overflow: "auto" }}>
      <button onClick={onHome} title="뒤로" style={{ position: "absolute", left: 14, top: 14, width: 34, height: 34, borderRadius: 8, border: "1px solid #ccc", background: "#fff", color: "#555", fontSize: 16, cursor: "pointer", zIndex: 5 }}>‹</button>
      {children}
      <button onClick={onHome} title="브라우저 홈" style={{ position: "absolute", right: 18, bottom: 18, width: 40, height: 40, borderRadius: "50%", border: "1px solid #ccc", background: "#fff", color: "#666", fontSize: 18, cursor: "pointer", zIndex: 5, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>⌂</button>
    </div>
  );
}

// ── 메이저랜드 행사 정보/부스 신청 — 사이트 톤(라이트·웜)에 맞춘 리뉴얼 ──
const ML = { pri: "#ff6b6b", deep: "#d94f5c", mut: "#b08085", bd: "#ffd9d9", card: { background: "#fff", border: "1px solid #ffd9d9", borderRadius: 16, boxShadow: "0 3px 14px rgba(255,107,107,0.1)" } };
const DOW = { sat: "토", sun: "일" };

function MajorlandEvents({ state, setState, mode, goApply }) {
  const [toast, setToast] = useState(null);
  const [applying, setApplying] = useState(null);
  const [boothName, setBoothName] = useState((state.boothApp && state.boothApp.name) || "");
  const [boothDesc, setBoothDesc] = useState((state.boothApp && state.boothApp.desc) || "");
  const [selSize, setSelSize] = useState(state.boothSize || "small");
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const sched = ((state.genre && state.genre.eventSchedule) || []).filter(e => e.endDay >= state.day).slice(0, 10);
  const applied = state.appliedEvents || [];
  const curSize = BOOTH_SIZES.find(b => b.id === (state.boothSize || "small")) || BOOTH_SIZES[0];
  const ae = state.activeEvent;

  const openApply = (ev) => {
    if ((state.fame || 0) < ev.minFame) { setToast({ t: `인지도 ${ev.minFame} 이상 필요해요`, bad: true }); return; }
    if (ev.requiresApplication && state.day > ev.applyBy) { setToast({ t: "접수가 마감된 행사예요", bad: true }); return; }
    setBoothName((state.boothApp && state.boothApp.name) || ((state.genre && state.genre.name) ? state.genre.name + " 서클" : ""));
    setBoothDesc((state.boothApp && state.boothApp.desc) || "");
    setSelSize(state.boothSize || "small");
    setApplying(ev);
  };
  const sizeCfg = BOOTH_SIZES.find(b => b.id === selSize) || BOOTH_SIZES[0];
  const sizeUpCost = applying ? (sizeCfg.tiles > curSize.tiles ? sizeCfg.price : 0) : 0;
  const totalFee = applying ? (applying.boothFee + sizeUpCost) : 0;
  const confirmApply = () => {
    const ev = applying; if (!ev) return;
    if (!boothName.trim()) { setToast({ t: "서클 이름을 입력해주세요", bad: true }); return; }
    if ((state.gold || 0) < totalFee) { setToast({ t: `골드 부족 (₩${totalFee.toLocaleString()} 필요)`, bad: true }); return; }
    setState(s => { const applied = [...(s.appliedEvents || []), ev.id]; const act = nearestAppliedEvent({ ...s, appliedEvents: applied }) || ev; let ns = { ...s, boothSize: selSize, activeEvent: act, boothApp: { name: boothName.trim(), desc: boothDesc.trim(), submitted: true }, appliedEvents: applied }; if (totalFee > 0) ns = logTx(ns, -totalFee, `${ev.name} 부스 신청비`, "🎪", "event"); return pushMessage(ns, { from: "Majorland", avatar: "🎪", text: `[접수 완료] ${ev.name} 부스 신청이 접수되었습니다. D-${Math.max(0, ev.startDay - s.day)}, 준비 잘 하세요!` }); });
    setApplying(null);
    setToast({ t: `✓ ${ev.name} 신청 완료! 부스 planner에서 꾸미고 행사날 참가하세요`, bad: false });
  };
  const stageInfo = (ev) => { const d = ev.startDay - state.day; if (d <= 0) return { t: "오늘 행사 당일! ⏻ 컴퓨터를 끄고 행사장으로", c: "#1e8e3e" }; if (d === 1) return { t: "D-1 · 포장 & 부스 배치 마무리", c: "#c98a00" }; if (d <= 5) return { t: `D-${d} · 아크릴·회지 추가 주문 마감 임박!`, c: ML.deep }; if (d <= 7) return { t: `D-${d} · 굿즈 주문 마감 권장`, c: "#c98a00" }; return { t: `D-${d} · 준비 기간`, c: "#999" }; };
  const toastBox = toast && <div style={{ padding: "10px 16px", borderRadius: 10, marginBottom: 14, fontSize: 13, fontWeight: 700, textAlign: "center", background: toast.bad ? "#fdeaea" : "#e8f6ec", color: toast.bad ? ML.deep : "#1e8e3e", border: `1px solid ${toast.bad ? "#f5c2c2" : "#bfe3c9"}` }}>{toast.t}</div>;

  // ── 신청서 ──
  if (applying) { const ev = applying; const dday = ev.startDay - state.day;
    return (<div style={{ maxWidth: 640, margin: "0 auto" }}>
      {toastBox}
      <button onClick={() => setApplying(null)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${ML.bd}`, background: "#fff", color: ML.mut, cursor: "pointer", fontSize: 13, marginBottom: 14 }}>← 행사 목록으로</button>
      <div style={{ ...ML.card, padding: 22, marginBottom: 16, background: "linear-gradient(135deg,#fff,#fff3ee)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: ML.pri, display: "inline-block", padding: "3px 12px", borderRadius: 12, marginBottom: 8 }}>{SCALE_LABEL[ev.scale] || ev.scale}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#3d2b2e" }}>{ev.name}</div>
        <div style={{ fontSize: 13, color: ML.mut, marginTop: 5 }}>{ev.days === 2 ? "양일" : "하루"} 행사 · D-{Math.max(0, dday)} ({DOW[ev.dayOfWeek] || ""}요일 시작) · 최대 판매 {ev.maxSales}개</div>
      </div>
      <div style={{ ...ML.card, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: ML.deep, marginBottom: 16 }}>📋 부스 신청서</div>
        <div style={{ fontSize: 12, color: ML.mut, marginBottom: 6, fontWeight: 700 }}>서클(부스) 이름 *</div>
        <input value={boothName} onChange={e => setBoothName(e.target.value)} placeholder="예: 이브의 작업실" style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", border: "1px solid #eccfcf", borderRadius: 9, fontSize: 15, marginBottom: 16, color: "#3d2b2e" }} />
        <div style={{ fontSize: 12, color: ML.mut, marginBottom: 6, fontWeight: 700 }}>부스 설명 (한줄)</div>
        <input value={boothDesc} onChange={e => setBoothDesc(e.target.value.slice(0, 60))} placeholder="달달한 자캐 굿즈 팝니다" style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", border: "1px solid #eccfcf", borderRadius: 9, fontSize: 14, marginBottom: 16, color: "#3d2b2e" }} />
        <div style={{ fontSize: 12, color: ML.mut, marginBottom: 8, fontWeight: 700 }}>부스 크기</div>
        <div style={{ display: "flex", gap: 9, marginBottom: 18 }}>
          {BOOTH_SIZES.map(sz => { const sel = selSize === sz.id; const up = sz.tiles > curSize.tiles;
            return (<button key={sz.id} onClick={() => setSelSize(sz.id)} style={{ flex: 1, padding: "12px 6px", borderRadius: 11, cursor: "pointer", textAlign: "center", background: sel ? "linear-gradient(135deg,#ff6b6b,#ffa94d)" : "#fff", border: `1.5px solid ${sel ? ML.pri : ML.bd}`, color: sel ? "#fff" : "#8a6a6e" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{sz.name}</div>
              <div style={{ fontSize: 10, marginTop: 2, color: sel ? "#ffeede" : ML.mut }}>{sz.desc}</div>
              <div style={{ fontSize: 10, marginTop: 3, fontWeight: 700, color: sel ? "#fff" : up && sz.price > 0 ? "#c98a00" : "#1e8e3e" }}>{up && sz.price > 0 ? `업그레이드 ₩${sz.price.toLocaleString()}` : "보유 크기"}</div>
            </button>); })}
        </div>
        <div style={{ background: "#fff6f2", border: `1px solid ${ML.bd}`, borderRadius: 11, padding: 15, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: ML.mut, marginBottom: 4 }}><span>부스 참가비</span><span>₩{(applying.boothFee || 0).toLocaleString()}</span></div>
          {sizeUpCost > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: ML.mut, marginBottom: 4 }}><span>부스 확장 ({sizeCfg.name})</span><span>₩{sizeUpCost.toLocaleString()}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 900, color: "#3d2b2e", borderTop: "1px dashed #eccfcf", paddingTop: 8, marginTop: 4 }}><span>총 결제액</span><span style={{ color: ML.deep }}>₩{totalFee.toLocaleString()}</span></div>
          <div style={{ fontSize: 11, color: (state.gold || 0) >= totalFee ? "#1e8e3e" : ML.deep, textAlign: "right", marginTop: 4 }}>{(state.gold || 0) >= totalFee ? `결제 후 잔액 ₩${((state.gold || 0) - totalFee).toLocaleString()}` : "골드 부족!"}</div>
        </div>
        <button onClick={confirmApply} style={{ width: "100%", padding: 14, borderRadius: 11, border: "none", background: "linear-gradient(135deg,#ff6b6b,#ffa94d)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(255,107,107,0.35)" }}>✦ 신청 제출</button>
      </div>
    </div>);
  }

  // ── 부스 신청(현황) 탭 ──
  if (mode === "apply") {
    return (<div style={{ maxWidth: 640, margin: "0 auto" }}>
      {toastBox}
      {ae ? (<div style={{ ...ML.card, padding: 24, background: "linear-gradient(135deg,#fff,#fff3ee)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#1e8e3e", background: "#e8f6ec", display: "inline-block", padding: "3px 12px", borderRadius: 12, marginBottom: 10 }}>✓ 신청 완료</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#3d2b2e" }}>{ae.name}</div>
        <div style={{ fontSize: 13, color: ML.mut, marginTop: 4 }}>{SCALE_LABEL[ae.scale] || ""} · 부스명 "{(state.boothApp && state.boothApp.name) || "미정"}" · {curSize.name} 부스</div>
        <div style={{ marginTop: 14, padding: "11px 15px", borderRadius: 10, background: "#fff", border: `1px solid ${ML.bd}`, fontSize: 14, fontWeight: 700, color: stageInfo(ae).c }}>{stageInfo(ae).t}</div>
        <div style={{ fontSize: 12, color: ML.mut, marginTop: 12, lineHeight: 1.8 }}>💡 준비 순서: 🎨 스튜디오에서 그림 → 🏭 굿즈컴퍼니에서 제작 → 🏪 부스 planner로 꾸미기 → 행사 당일 ⏻ 행사장 가기</div>
      </div>) : (<div style={{ ...ML.card, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎪</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#3d2b2e", marginBottom: 6 }}>신청한 행사가 없어요</div>
        <div style={{ fontSize: 13, color: ML.mut, marginBottom: 18 }}>행사 정보에서 참가할 행사를 골라 신청하세요</div>
        <button onClick={goApply} style={{ padding: "11px 26px", borderRadius: 22, border: "none", background: ML.pri, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>행사 정보 보러가기</button>
      </div>)}
    </div>);
  }

  // ── 행사 정보 탭 (일정 리스트) ──
  return (<div style={{ maxWidth: 760, margin: "0 auto" }}>
    {toastBox}
    {!state.genre && <div style={{ ...ML.card, padding: 30, textAlign: "center", color: ML.mut, fontSize: 14, lineHeight: 1.8 }}>🧪 <b style={{ color: "#7c3aed" }}>장르연구소</b>에서 장르를 만들면<br />내 장르의 행사 일정이 열려요</div>}
    {sched.map(ev => { const dday = ev.startDay - state.day; const isApplied = applied.includes(ev.id) || (ae && ae.id === ev.id);
      const closed = ev.requiresApplication && state.day > ev.applyBy; const lackFame = (state.fame || 0) < ev.minFame;
      return (<div key={ev.id} style={{ ...ML.card, padding: "18px 22px", marginBottom: 12, display: "flex", alignItems: "center", gap: 18, opacity: closed && !isApplied ? 0.6 : 1 }}>
        <div style={{ width: 74, flexShrink: 0, textAlign: "center", padding: "10px 0", borderRadius: 12, background: dday <= 0 ? "#e8f6ec" : "#fff3ee", border: `1px solid ${dday <= 0 ? "#bfe3c9" : ML.bd}` }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: dday <= 0 ? "#1e8e3e" : ML.deep }}>{dday <= 0 ? "D-DAY" : `D-${dday}`}</div>
          <div style={{ fontSize: 10, color: ML.mut }}>{DOW[ev.dayOfWeek] || ""}요일 · {ev.days === 2 ? "양일" : "하루"}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: ev.scale === "mega" ? "#9b30c9" : ev.scale === "large" ? ML.pri : ev.scale === "medium" ? "#ffa94d" : "#8fbf6e", padding: "2px 9px", borderRadius: 10 }}>{SCALE_LABEL[ev.scale] || ev.scale}</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#3d2b2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.name}</span>
          </div>
          <div style={{ fontSize: 12, color: ML.mut }}>
            참가비 {ev.boothFee ? `₩${ev.boothFee.toLocaleString()}` : "무료"} · 최대 판매 {ev.maxSales}개
            {ev.minFame > 0 && <span style={{ color: lackFame ? ML.deep : "#1e8e3e" }}> · 인지도 {ev.minFame}+ {lackFame ? "(부족)" : "✓"}</span>}
            {ev.requiresApplication && <span style={{ color: closed ? ML.deep : "#c98a00" }}> · 접수 {closed ? "마감됨" : `~Day ${ev.applyBy}`}</span>}
          </div>
        </div>
        {isApplied
          ? <span style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 20, background: "#e8f6ec", color: "#1e8e3e", fontSize: 13, fontWeight: 800 }}>✓ 신청완료</span>
          : <button onClick={() => openApply(ev)} disabled={closed || lackFame} style={{ flexShrink: 0, padding: "10px 22px", borderRadius: 20, border: "none", cursor: closed || lackFame ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 13, background: closed || lackFame ? "#f0e2e2" : "linear-gradient(135deg,#ff6b6b,#ffa94d)", color: closed || lackFame ? "#b99" : "#fff", boxShadow: closed || lackFame ? "none" : "0 3px 10px rgba(255,107,107,0.3)" }}>{closed ? "접수마감" : lackFame ? "🔒 인지도" : "신청하기"}</button>}
      </div>); })}
    {state.genre && !sched.length && <div style={{ ...ML.card, padding: 30, textAlign: "center", color: ML.mut, fontSize: 14 }}>예정된 행사가 없어요</div>}
  </div>);
}

// ── 메이저랜드: 행사/축제 사이트 (로고 중앙, 따뜻한 톤) ──
function Majorland({ onHome, state, setState }) {
  const [tab, setTab] = useState("events");
  const NAV = [["about", "About ML"], ["events", "행사 정보"], ["apply", "부스 신청"], ["qna", "Q&A"]];
  return (
    <Site onHome={onHome}>
      <div style={{ minHeight: "100%", background: "linear-gradient(180deg,#fff5f0,#ffe8ef)", fontFamily: "'Noto Sans KR',sans-serif", padding: "20px 40px 60px" }}>
        <div style={{ textAlign: "center", padding: "18px 0 22px" }}>
          <div style={{ display: "inline-block", padding: "14px 40px", background: "linear-gradient(135deg,#ff6b6b,#ffa94d)", borderRadius: 16, color: "#fff", fontWeight: 900, fontSize: 30, letterSpacing: 2, boxShadow: "0 6px 20px rgba(255,107,107,0.4)" }}>🎪 MAJORLAND</div>
          <div style={{ fontSize: 13, color: "#c0656e", marginTop: 8 }}>모두의 동인 행사 · 메이저랜드{state && state.genre ? ` · ${state.genre.name}` : ""}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "10px 22px", borderRadius: 24, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: tab === id ? "#ff6b6b" : "#fff", color: tab === id ? "#fff" : "#e07a86", boxShadow: tab === id ? "0 4px 12px rgba(255,107,107,0.35)" : "0 1px 4px rgba(0,0,0,0.08)" }}>{label}</button>
          ))}
        </div>
        {(tab === "events" || tab === "apply")
          ? <MajorlandEvents key={tab} state={state} setState={setState} mode={tab} goApply={() => setTab("events")} />
          : <div style={{ maxWidth: 820, margin: "0 auto", background: "#fff", borderRadius: 18, border: "1px solid #ffd9d9", minHeight: 300, padding: 32, boxShadow: "0 4px 20px rgba(255,107,107,0.12)" }}>
            {tab === "about" && <div><h2 style={{ color: "#ff6b6b", margin: "0 0 12px" }}>About ML</h2><p style={{ color: "#777", lineHeight: 1.8 }}>메이저랜드는 서클과 팬이 만나는 국내 최대 동인 행사 플랫폼입니다. (소개 페이지 — 콘텐츠 예정)</p></div>}
            {tab === "qna" && <div><h2 style={{ color: "#ff6b6b", margin: "0 0 12px" }}>Q&A</h2><p style={{ color: "#999" }}>자주 묻는 질문 (준비중)</p></div>}
          </div>}
      </div>
    </Site>
  );
}

// ── 굿즈팩토리: 제조 기업 사이트 (로고 좌측, 파란/깔끔 톤) ──
function GoodsFactory({ onHome, state, setState }) {
  const [tab, setTab] = useState("intro");
  const NAV = [["intro", "회사 소개"], ["make", "굿즈 제작"], ["hire", "채용 정보"], ["mypage", "마이페이지"]];
  return (
    <Site onHome={onHome}>
      <div style={{ minHeight: "100%", background: "#f4f7fb", fontFamily: "'Noto Sans KR',sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", background: "#fff", borderBottom: "2px solid #2d5bff", paddingLeft: 60 }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: "#1a3ba8", letterSpacing: -0.5 }}>🏭 GOODS<span style={{ color: "#2d5bff" }}>FACTORY</span></div>
          <div style={{ display: "flex", gap: 4 }}>
            {NAV.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 700, fontSize: 13, color: tab === id ? "#2d5bff" : "#667", borderBottom: `2px solid ${tab === id ? "#2d5bff" : "transparent"}` }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "32px 40px 60px" }}>
          {tab === "make"
            ? <div style={{ maxWidth: 1100, margin: "0 auto", height: 560, background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e0e6f0", boxShadow: "0 2px 12px rgba(45,91,255,0.12)" }}><GoodsFactoryStore state={state} setState={setState} /></div>
            : <div style={{ maxWidth: 900, margin: "0 auto", background: "#fff", borderRadius: 10, border: "1px solid #e0e6f0", minHeight: 300, padding: 32, boxShadow: "0 2px 12px rgba(45,91,255,0.08)" }}>
              {tab === "intro" && <div><h2 style={{ color: "#1a3ba8", margin: "0 0 12px" }}>회사 소개</h2><p style={{ color: "#667", lineHeight: 1.8 }}>굿즈팩토리는 소량 주문부터 대량 생산까지, 당신의 그림을 실물 굿즈로 만들어드립니다. (기업 소개 — 콘텐츠 예정)</p></div>}
              {tab === "hire" && <div><h2 style={{ color: "#1a3ba8", margin: "0 0 12px" }}>채용 정보</h2><p style={{ color: "#889" }}>함께할 인재를 찾습니다 (준비중)</p></div>}
              {tab === "mypage" && <div><h2 style={{ color: "#1a3ba8", margin: "0 0 12px" }}>마이페이지</h2><p style={{ color: "#889" }}>주문 내역·제작 현황이 여기 표시됩니다 (준비중)</p></div>}
            </div>}
        </div>
      </div>
    </Site>
  );
}

// ── 계정 페이지 (구글 프로필풍) — 내정보/장르/지갑/활동기록 ──
function Account({ onHome, go, initialMenu, state }) {
  const [menu, setMenu] = useState(initialMenu || "profile");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const MENU = [["profile", "내 정보"], ["genre", "장르"], ["wallet", "지갑"], ["activity", "활동 기록"]];

  useEffect(() => {
    try {
      let c = localStorage.getItem(FRIEND_CODE_KEY);
      if (!c) { c = "SEOKO-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000); localStorage.setItem(FRIEND_CODE_KEY, c); }
      setCode(c);
      const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      if (p.name) setName(p.name);
    } catch { /* 무시 */ }
  }, []);

  const copyCode = () => { try { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* 무시 */ } };
  const save = () => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name })); } catch { /* 무시 */ } setSaved(true); setTimeout(() => setSaved(false), 1400); };

  return (
    <Site onHome={onHome}>
      <div style={{ display: "flex", minHeight: "100%", background: "#fff", fontFamily: "'Noto Sans KR',sans-serif", paddingTop: 8 }}>
        <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid #eee", padding: "56px 12px 12px" }}>
          {MENU.map(([id, label]) => (
            <button key={id} onClick={() => setMenu(id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 18px", marginBottom: 4, border: "none", borderRadius: 24, cursor: "pointer", fontSize: 14, fontWeight: 600, background: menu === id ? "#e8f0fe" : "transparent", color: menu === id ? "#1a73e8" : "#5f6368" }}>{label}</button>
          ))}
        </div>
        <div style={{ flex: 1, padding: "40px 48px" }}>
          {menu === "profile" ? (
            <div style={{ maxWidth: 560 }}>
              <h1 style={{ fontSize: 26, color: "#202124", fontWeight: 500, margin: "0 0 6px" }}>내 정보</h1>
              <p style={{ color: "#5f6368", fontSize: 14, margin: "0 0 28px" }}>서코의 신에서 사용하는 내 프로필 정보</p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 28 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg,#a18cd1,#fbc2eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, color: "#fff" }}>{name ? name[0] : "🙂"}</div>
                  <button title="프로필 사진 수정" style={{ position: "absolute", right: -4, bottom: -4, width: 30, height: 30, borderRadius: "50%", border: "2px solid #fff", background: "#1a73e8", color: "#fff", fontSize: 13, cursor: "pointer" }}>✎</button>
                </div>
              </div>
              <label style={{ display: "block", fontSize: 12, color: "#5f6368", marginBottom: 6 }}>내 이름</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="이름을 입력하세요" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: "1px solid #dadce0", borderRadius: 8, fontSize: 15, marginBottom: 20, color: "#202124" }} />
              <label style={{ display: "block", fontSize: 12, color: "#5f6368", marginBottom: 6 }}>친구코드 <span style={{ color: "#9aa0a6" }}>(교류회 초대에 사용)</span></label>
              <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
                <div style={{ flex: 1, padding: "12px 14px", background: "#f1f3f4", borderRadius: 8, fontSize: 15, fontWeight: 700, color: "#202124", fontFamily: "monospace", letterSpacing: 1 }}>{code || "……"}</div>
                <button onClick={copyCode} style={{ padding: "0 18px", borderRadius: 8, border: "1px solid #dadce0", background: copied ? "#e6f4ea" : "#fff", color: copied ? "#1e8e3e" : "#1a73e8", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{copied ? "복사됨 ✓" : "복사"}</button>
              </div>
              <button onClick={save} style={{ padding: "12px 32px", borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>{saved ? "저장됨 ✓" : "저장"}</button>
            </div>
          ) : menu === "genre" ? (
            <div style={{ maxWidth: 560 }}>
              <h1 style={{ fontSize: 26, color: "#202124", fontWeight: 500, margin: "0 0 6px" }}>장르</h1>
              <p style={{ color: "#5f6368", fontSize: 14, margin: "0 0 20px" }}>장르 생성·수정·전환은 전문 서비스 <b>장르연구소</b>에서 관리해요.</p>
              <button onClick={() => go && go("genrelab")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", borderRadius: 14, border: "1px solid #e0d5f5", background: "linear-gradient(135deg,#faf7ff,#f1eafd)", cursor: "pointer", boxShadow: "0 2px 12px rgba(124,58,237,0.1)" }}>
                <span style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🧪</span>
                <span style={{ textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: 16, fontWeight: 800, color: "#7c3aed" }}>장르연구소 바로가기</span>
                  <span style={{ display: "block", fontSize: 12, color: "#8a80a8", marginTop: 2 }}>내가 파는 장르를 정의하는 실험실 · 현재 {(state && state.genres && state.genres.length) || 0}개 보유</span>
                </span>
              </button>
            </div>
          ) : (
            <div style={{ maxWidth: 560 }}>
              <h1 style={{ fontSize: 26, color: "#202124", fontWeight: 500, margin: "0 0 6px" }}>{MENU.find(m => m[0] === menu)?.[1]}</h1>
              <p style={{ color: "#5f6368", fontSize: 14 }}>
                {menu === "wallet" && "골드·수입/지출 내역이 여기 표시됩니다. (준비중)"}
                {menu === "activity" && "그림·굿즈·행사 활동 기록이 여기 표시됩니다. (준비중)"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Site>
  );
}

// ── 브라우저 홈 (북마크 + 계정 메뉴) ──
function Home({ go }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bookmark = (icon, label, target, bg) => (
    <button onClick={() => go(target)} style={{ width: 150, height: 150, borderRadius: 20, border: "1px solid #ddd", background: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <div style={{ width: 68, height: 68, borderRadius: 16, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>{icon}</div>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#444" }}>{label}</span>
    </button>
  );
  const ACCT = [["profile", "내 정보"], ["genre", "장르"], ["wallet", "지갑"], ["activity", "활동 기록"]];
  return (
    <div style={{ height: "100%", background: "linear-gradient(180deg,#eef1f6,#e3e8f0)", fontFamily: "'Noto Sans KR',sans-serif", position: "relative" }}>
      {/* 계정 메뉴 (우상단) */}
      <div style={{ position: "absolute", right: 20, top: 16, zIndex: 10 }}>
        <button onClick={() => setMenuOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 24, border: "1px solid #ccd", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#555", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#a18cd1,#fbc2eb)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🙂</span>
          내 정보 ▾
        </button>
        {menuOpen && (
          <div style={{ marginTop: 6, background: "#fff", borderRadius: 12, border: "1px solid #e0e0e0", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: 150 }}>
            {ACCT.map(([id, label]) => (
              <button key={id} onClick={() => { setMenuOpen(false); go("acct:" + id); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#444" }}>{label}</button>
            ))}
          </div>
        )}
      </div>
      {/* 북마크 사이트 */}
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{ fontSize: 13, color: "#889", letterSpacing: 4 }}>🔖 즐겨찾기</div>
        <div style={{ display: "flex", gap: 32 }}>
          {bookmark("🎪", "메이저랜드", "majorland", "linear-gradient(135deg,#ff6b6b,#ffa94d)")}
          {bookmark("🏭", "굿즈팩토리", "factory", "linear-gradient(135deg,#2d5bff,#6ba3ff)")}
          {bookmark("🧪", "장르연구소", "genrelab", "linear-gradient(135deg,#7c3aed,#a855f7)")}
          {bookmark("👗", "코디몰", "codimall", "linear-gradient(135deg,#ff5e8a,#ffa4c0)")}
        </div>
      </div>
    </div>
  );
}

export default function InternetApp({ state, setState } = {}) {
  const [route, setRoute] = useState("home"); // home | majorland | factory | acct:<menu>
  const go = (r) => setRoute(r);
  const home = () => setRoute("home");

  if (route === "majorland") return <Majorland onHome={home} state={state} setState={setState} />;
  if (route === "factory") return <GoodsFactory onHome={home} state={state} setState={setState} />;
  if (route === "genrelab") return <Site onHome={home}><GenreLabSite state={state} setState={setState} /></Site>;
  if (route === "codimall") return <Site onHome={home}><CodiMallSite state={state} setState={setState} /></Site>;
  if (route.startsWith("acct:")) return <Account onHome={home} go={go} initialMenu={route.slice(5)} state={state} />;
  return <Home go={go} />;
}
