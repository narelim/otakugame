import { useState, useEffect } from "react";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import MaboApp from "./maboApp.jsx";
import { MessagesApp, GalleryApp, JobcatApp, BankApp, FactoryStatusApp, CalendarApp } from "./phoneApps.jsx";
import { unreadCount, markThreadRead } from "../systems/messageSystem.js";
import { isEventDay } from "../systems/eventSystem.js";

/* ============================================================
   PhoneOS — 데스크톱 셸의 핸드폰 (아래에서 올라오는 오버레이 안에 렌더)
   - 상단: 폰 상태바 (시계·안테나·배터리 꾸밈요소, 배터리는 행동량 따라 감소)
   - 홈: 앱 아이콘 + 하단 앱이름 그리드
   - 하단: 가상 버튼 3개 — 집어넣기(폰 내리기) · 홈화면 · 뒤로가기
   - 뒤로가기: 앱 내 전 화면 → 앱 첫 화면 → 홈. 홈에서는 비활성.
   ============================================================ */

const APPS=[
  {id:"mabo",    icon:"🐦",name:"mabo",     color:"#4cc9f0"},
  {id:"messages",icon:"💬",name:"메시지",    color:"#06d6a0"},
  {id:"gallery", icon:"🖼",name:"갤러리",    color:"#ffd166"},
  {id:"jobcat",  icon:"🐱",name:"알바냥",    color:"#ff9f43"},
  {id:"bank",    icon:"🏦",name:"은행",      color:"#4a86e8"},
  {id:"factory", icon:"🏭",name:"굿즈팩토리", color:"#e94560"},
  {id:"calendar",icon:"📅",name:"캘린더",    color:"#c084fc"},
];

function NavBtn({label,icon,onClick,disabled}){
  return(<button onClick={onClick} disabled={disabled} style={{flex:1,height:"100%",background:"transparent",border:"none",cursor:disabled?"not-allowed":"pointer",color:disabled?"#333":"#9a8fc0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"2px"}}>
    <span style={{fontSize:"16px",lineHeight:1}}>{icon}</span>
    <span style={{fontSize:"8px",fontWeight:"700",fontFamily:"'Noto Sans KR',sans-serif"}}>{label}</span>
  </button>);
}

function PhoneStatusBar({state}){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),15000);return()=>clearInterval(t);},[]);
  const hh=now.getHours().toString().padStart(2,"0"),mm=now.getMinutes().toString().padStart(2,"0");
  // 꾸밈요소지만 살짝 살아있게: 행동할수록 배터리가 닳고, 행사날은 반나절 만에 방전 직전
  const battery=isEventDay(state)?34:Math.max(18,96-(state.actionsToday||0)*23);
  const battC=battery<=34?"#e94560":battery<=55?"#ffd166":"#06d6a0";
  return(<div style={{height:"34px",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:"#06060f",color:"#e0e0ff",fontSize:"11px",flexShrink:0}}>
    <span style={{fontWeight:"800",fontVariantNumeric:"tabular-nums"}}>{hh}:{mm}</span>
    <span style={{display:"flex",alignItems:"center",gap:"7px"}}>
      <span style={{fontSize:"9px",color:"#666",letterSpacing:"0.5px"}}>DUCK 5G</span>
      <span style={{display:"inline-flex",alignItems:"flex-end",gap:"1.5px",height:"10px"}}>{[4,6,8,10].map(h=><span key={h} style={{width:"3px",height:h,background:"#e0e0ff",borderRadius:"1px"}}/>)}</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:"3px"}}>
        <span style={{fontSize:"9px",color:battC,fontWeight:"700"}}>{battery}%</span>
        <span style={{display:"inline-block",width:"20px",height:"10px",border:`1px solid ${battC}`,borderRadius:"2.5px",position:"relative"}}>
          <span style={{position:"absolute",top:"1.5px",bottom:"1.5px",left:"1.5px",width:`${Math.max(1,(battery/100)*15)}px`,background:battC,borderRadius:"1px"}}/>
          <span style={{position:"absolute",right:"-3px",top:"2.5px",width:"2px",height:"4px",background:battC,borderRadius:"0 1px 1px 0"}}/>
        </span>
      </span>
    </span>
  </div>);
}

function HomeScreen({state,onOpen,badgeOf}){
  const p=state.profile;
  return(<div style={{height:"100%",overflow:"auto",background:"radial-gradient(circle at 50% 0%,#1a0a2e,#0d0d1a)",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",padding:"18px 18px 10px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"20px",padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:"14px"}}>
      <div style={{width:"38px",height:"38px",borderRadius:"50%",overflow:"hidden",background:"#2a2a4a",border:"2px solid #7c3aed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{p&&p.avatarData?<img src={p.avatarData} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"19px"}}>👤</span>}</div>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:"13px",fontWeight:"700"}}>{(p&&p.displayName)||"이름 없음"}</div><div style={{fontSize:"10px",color:"#888"}}>{(p&&p.handle&&p.handle!=="@")?p.handle:"@미설정"} · 팔로워 {(state.followers||0).toLocaleString()}</div></div>
      <div style={{fontSize:"10px",color:"#ffd166",fontWeight:"700",flexShrink:0}}>💰 ₩{(state.gold||0).toLocaleString()}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"18px 10px"}}>
      {APPS.map(a=>{const b=badgeOf(a.id);return(
        <button key={a.id} onClick={()=>onOpen(a.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"7px",background:"transparent",border:"none",cursor:"pointer",color:"#e0e0ff",padding:0}}>
          <span style={{position:"relative",width:"62px",height:"62px",borderRadius:"17px",background:`linear-gradient(145deg,${a.color},#12122a)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"30px",boxShadow:"0 5px 14px rgba(0,0,0,0.45)"}}>
            {a.icon}
            {b>0&&<span style={{position:"absolute",top:"-5px",right:"-5px",minWidth:"19px",height:"19px",borderRadius:"10px",background:"#e94560",color:"#fff",fontSize:"10px",fontWeight:"800",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",border:"2px solid #0d0d1a"}}>{b>99?"99+":b}</span>}
          </span>
          <span style={{fontSize:"11px",fontWeight:"700"}}>{a.name}</span>
        </button>);})}
    </div>
  </div>);
}

export default function PhoneOS({state,setState,onClose}){
  const [stack,setStack]=useState([]); // [{app,view?}] — 비어있으면 홈
  const push=(scr)=>setStack(st=>[...st,scr]);
  const back=()=>setStack(st=>st.length?st.slice(0,-1):st);
  const home=()=>setStack([]);
  const top=stack[stack.length-1]||null;
  const unread=unreadCount(state);
  const making=(state.orders||[]).filter(o=>o.status==="making").length;
  const badgeOf=(id)=>id==="messages"?unread:id==="factory"?making:0;
  const markRead=(from)=>setState(s=>markThreadRead(s,from));

  let content;
  if(!top)content=<HomeScreen state={state} onOpen={(id)=>push({app:id})} badgeOf={badgeOf}/>;
  else if(top.app==="mabo")content=<MaboApp state={state} setState={setState} view={top.view} push={push}/>;
  else if(top.app==="messages")content=<MessagesApp state={state} view={top.view} push={push} markRead={markRead}/>;
  else if(top.app==="gallery")content=<GalleryApp/>;
  else if(top.app==="jobcat")content=<JobcatApp state={state} setState={setState}/>;
  else if(top.app==="bank")content=<BankApp state={state}/>;
  else if(top.app==="factory")content=<FactoryStatusApp state={state}/>;
  else if(top.app==="calendar")content=<CalendarApp state={state}/>;

  return(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:"#0a0a18",border:"1.5px solid #2a2a4a",borderRadius:"30px",overflow:"hidden",boxShadow:"0 24px 70px rgba(0,0,0,0.7)"}}>
    <PhoneStatusBar state={state}/>
    <div style={{flex:1,minHeight:0,overflow:"hidden",position:"relative"}}>
      <ErrorBoundary key={top?`${top.app}:${top.view||""}`:"home"}>{content}</ErrorBoundary>
    </div>
    <div style={{height:"50px",display:"flex",alignItems:"stretch",background:"#06060f",borderTop:"1px solid #1e1e3a",flexShrink:0}}>
      <NavBtn label="집어넣기" icon="▼" onClick={onClose}/>
      <NavBtn label="홈화면" icon="⬤" onClick={home} disabled={!top}/>
      <NavBtn label="뒤로가기" icon="◀" onClick={back} disabled={!top}/>
    </div>
  </div>);
}
