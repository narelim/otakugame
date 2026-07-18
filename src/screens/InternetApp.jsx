import { useState, useEffect } from "react";
import { MajorlandScreen } from "./gameScreens.jsx";
import GoodsFactoryStore from "./GoodsFactoryStore.jsx";
import GenreLabSite from "./GenreLabSite.jsx";

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

// ── 메이저랜드: 행사/축제 사이트 (로고 중앙, 따뜻한 톤) ──
function Majorland({ onHome, state, setState }) {
  const [tab, setTab] = useState("about");
  const NAV = [["about", "About ML"], ["events", "행사 정보"], ["apply", "부스 신청"], ["qna", "Q&A"]];
  return (
    <Site onHome={onHome}>
      <div style={{ minHeight: "100%", background: "linear-gradient(180deg,#fff5f0,#ffe8ef)", fontFamily: "'Noto Sans KR',sans-serif", padding: "20px 40px 60px" }}>
        <div style={{ textAlign: "center", padding: "18px 0 22px" }}>
          <div style={{ display: "inline-block", padding: "14px 40px", background: "linear-gradient(135deg,#ff6b6b,#ffa94d)", borderRadius: 16, color: "#fff", fontWeight: 900, fontSize: 30, letterSpacing: 2, boxShadow: "0 6px 20px rgba(255,107,107,0.4)" }}>🎪 MAJORLAND</div>
          <div style={{ fontSize: 13, color: "#c0656e", marginTop: 8 }}>모두의 동인 행사 · 메이저랜드</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "10px 22px", borderRadius: 24, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, background: tab === id ? "#ff6b6b" : "#fff", color: tab === id ? "#fff" : "#e07a86", boxShadow: tab === id ? "0 4px 12px rgba(255,107,107,0.35)" : "0 1px 4px rgba(0,0,0,0.08)" }}>{label}</button>
          ))}
        </div>
        {(tab === "events" || tab === "apply")
          ? <div style={{ maxWidth: 900, margin: "0 auto", height: 560, background: "#0d0d1a", borderRadius: 16, overflow: "hidden", border: "1px solid #ffd9d9", boxShadow: "0 4px 20px rgba(255,107,107,0.15)" }}><MajorlandScreen state={state} setState={setState} /></div>
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
  if (route.startsWith("acct:")) return <Account onHome={home} go={go} initialMenu={route.slice(5)} state={state} />;
  return <Home go={go} />;
}
