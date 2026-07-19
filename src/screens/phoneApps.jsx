import { useState, useEffect } from "react";
import { GOODS_TYPES, SAVE_KEY } from "../data/gameData.js";
import { idbAll, idbDel, idbClear } from "../systems/imageSystem.js";
import { threads } from "../systems/messageSystem.js";
import { JOBS, PAYDAY, DOW_NAMES, getJob, applyForJob, quitJob, daysToPayday, weekdayOf, workDaysLabel, monthlyEstimate, isWorkdayToday, hasWorkedToday, shiftWage, workShift, pendingWages } from "../systems/jobSystem.js";
import { isEventDay } from "../systems/eventSystem.js";
import WorkGame from "../components/WorkGame.jsx";
import { officialMockup, OFFICIAL_TYPES } from "../utils/officialGoods.js";
import { collectionSets, rarityOf } from "../systems/collectionSystem.js";

/* ============================================================
   핸드폰 전용 앱 화면들 (PhoneOS 안에서만 사용)
   - 기본 앱 (메시지·갤러리·캘린더): AppHeader 공용 — 순정 앱 느낌 통일
   - 서드파티 앱 (알바냥·은행·굿즈팩토리): 각자 브랜드 디자인
   ============================================================ */

const KRW=(n)=>"₩"+(n||0).toLocaleString();
const dateLabel=(m)=>m.date?`${m.date.month}/${m.date.day}`:`Day ${m.day||"?"}`;

function AppHeader({icon,title,color,sub}){
  return(<div style={{padding:"12px 16px",background:"#12122a",borderBottom:"1px solid #2a2a4a",flexShrink:0}}>
    <div style={{fontSize:"15px",fontWeight:"800",color}}>{icon} {title}</div>
    {sub&&<div style={{fontSize:"10px",color:"#666",marginTop:"2px"}}>{sub}</div>}
  </div>);
}
function Empty({icon,text,sub}){
  return(<div style={{textAlign:"center",padding:"56px 20px",color:"#444"}}>
    <div style={{fontSize:"38px",marginBottom:"10px"}}>{icon}</div>
    <div style={{fontSize:"13px",color:"#666"}}>{text}</div>
    {sub&&<div style={{fontSize:"11px",marginTop:"4px",color:"#333"}}>{sub}</div>}
  </div>);
}

/* ── 메시지 (구 maitalk): 게임 알림이 발신자별 스레드로 도착 ── */
export function MessagesApp({state,view,push,markRead}){
  const ths=threads(state);
  if(view){
    const th=ths.find(t=>t.from===view);
    return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <AppHeader icon={th?th.avatar:"💬"} title={view} color="#06d6a0"/>
      <div style={{flex:1,overflow:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
        {(th?th.msgs:[]).map(m=>(<div key={m.id} style={{display:"flex",gap:"8px",alignItems:"flex-end"}}>
          <div style={{width:"30px",height:"30px",borderRadius:"50%",background:"#1a1a3a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",flexShrink:0}}>{m.avatar}</div>
          <div style={{maxWidth:"75%"}}>
            <div style={{padding:"9px 12px",background:"#16223a",border:"1px solid #2a3a5a",borderRadius:"4px 14px 14px 14px",fontSize:"12px",lineHeight:1.7}}>{m.text}</div>
            <div style={{fontSize:"9px",color:"#555",marginTop:"3px"}}>{dateLabel(m)} · Day {m.day}</div>
          </div>
        </div>))}
        {!th&&<Empty icon="💬" text="메시지가 없어요"/>}
      </div>
      <div style={{padding:"9px 14px",borderTop:"1px solid #2a2a4a",fontSize:"10px",color:"#444",textAlign:"center",flexShrink:0}}>✍️ 답장(선택지) 기능은 준비 중이에요</div>
    </div>);
  }
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <AppHeader icon="💬" title="메시지" color="#06d6a0" sub="굿즈 완성·월급·행사 알림이 도착해요"/>
    <div style={{flex:1,overflow:"auto"}}>
      {!ths.length&&<Empty icon="💬" text="아직 받은 메시지가 없어요"/>}
      {ths.map(t=>{const last=t.msgs[t.msgs.length-1];return(
        <button key={t.from} onClick={()=>{markRead(t.from);push({app:"messages",view:t.from});}} style={{display:"flex",gap:"11px",alignItems:"center",width:"100%",padding:"12px 16px",background:"transparent",border:"none",borderBottom:"1px solid #16162e",cursor:"pointer",color:"#e0e0ff",textAlign:"left"}}>
          <div style={{width:"42px",height:"42px",borderRadius:"50%",background:"#1a1a3a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>{t.avatar}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:"13px",fontWeight:"700"}}>{t.from}</span><span style={{fontSize:"9px",color:"#555"}}>{dateLabel(last)}</span></div>
            <div style={{fontSize:"11px",color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:"2px"}}>{last.text}</div>
          </div>
          {t.unread>0&&<div style={{minWidth:"18px",height:"18px",borderRadius:"9px",background:"#e94560",color:"#fff",fontSize:"10px",fontWeight:"800",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",flexShrink:0}}>{t.unread}</div>}
        </button>);})}
    </div>
  </div>);
}

/* ── 갤러리 (기본 앱): 내 그림 + 북마크 이미지 ── */
export function GalleryApp(){
  const [tab,setTab]=useState("art");
  const [items,setItems]=useState(()=>{try{const raw=localStorage.getItem(SAVE_KEY);return raw?JSON.parse(raw):[];}catch{return [];}});
  const [bmarks,setBmarks]=useState([]);
  const [zoom,setZoom]=useState(null);
  const [confirmClear,setConfirmClear]=useState(false);
  const loadBm=()=>{idbAll("bookmarks").then(b=>setBmarks((b||[]).sort((a,b2)=>b2.savedAt-a.savedAt)));};
  useEffect(()=>{loadBm();},[]);
  const delArt=(id)=>{const next=items.filter(s=>s.id!==id);try{localStorage.setItem(SAVE_KEY,JSON.stringify(next));}catch{/* noop */}setItems(next);if(zoom&&zoom.id===id)setZoom(null);};
  const delBm=(id)=>{idbDel("bookmarks",id).then(loadBm);if(zoom&&zoom.id===id)setZoom(null);};
  const clearCache=()=>{Promise.all([idbClear("imagePool"),idbClear("bookmarks")]).then(()=>{loadBm();setConfirmClear(false);});};
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",position:"relative"}}>
    <AppHeader icon="🖼" title="갤러리" color="#ffd166" sub="내 그림 · 북마크 이미지"/>
    {/* 세그먼트 탭 — 순정 앱 톤 */}
    <div style={{display:"flex",gap:"4px",margin:"10px 14px",padding:"3px",background:"#12122a",borderRadius:"11px",flexShrink:0}}>
      {[{id:"art",t:`🎨 내 그림 (${items.length})`},{id:"fan",t:`🔖 북마크 (${bmarks.length})`}].map(o=>
        <button key={o.id} onClick={()=>setTab(o.id)} style={{flex:1,padding:"8px 4px",background:tab===o.id?"#2a2a4a":"transparent",border:"none",borderRadius:"9px",color:tab===o.id?"#ffd166":"#666",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>{o.t}</button>)}
    </div>
    <div style={{flex:1,overflow:"auto",padding:"0 14px 14px"}}>
      {tab==="art"?<>
        {!items.length&&<Empty icon="🖼" text="저장된 그림이 없어요" sub="스튜디오에서 그림을 그려 저장하세요"/>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"7px"}}>
          {items.map(s=>(<button key={s.id} onClick={()=>setZoom({id:s.id,url:s.thumb,name:s.name,sub:`${s.ts||""} · ${s.ratioId} · 레이어 ${(s.layers||[]).length}`,kind:"art"})} style={{padding:0,background:"#fff",borderRadius:"11px",border:"1px solid #2a2a4a",overflow:"hidden",cursor:"pointer"}}>
            <img src={s.thumb} style={{width:"100%",aspectRatio:"1",objectFit:"contain",display:"block"}}/>
          </button>))}
        </div>
      </>:<>
        {!bmarks.length&&<Empty icon="🔖" text="북마크한 이미지가 없어요" sub="mabo 이미지 포스트에서 🔖를 눌러 저장하세요"/>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"7px"}}>
          {bmarks.map(b=>(<button key={b.id} onClick={()=>setZoom({id:b.id,url:b.imageUrl,name:b.from,sub:b.text,kind:"bm"})} style={{padding:0,background:"#12122a",borderRadius:"11px",border:"1px solid #2a2a4a",overflow:"hidden",cursor:"pointer"}}>
            <img src={b.imageUrl} style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/>
          </button>))}
        </div>
        {bmarks.length>0&&<div style={{marginTop:"18px",paddingTop:"12px",borderTop:"1px solid #1a1a30"}}>
          {!confirmClear?<button onClick={()=>setConfirmClear(true)} style={{width:"100%",padding:"10px",background:"transparent",border:"1px solid #2a2a4a",color:"#555",borderRadius:"10px",cursor:"pointer",fontSize:"11px"}}>🗑 이미지 캐시 전체 삭제</button>
          :<div style={{display:"flex",gap:"8px"}}><button onClick={()=>setConfirmClear(false)} style={{flex:1,padding:"10px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"10px",cursor:"pointer",fontSize:"11px"}}>취소</button><button onClick={clearCache} style={{flex:1,padding:"10px",background:"#2a0a0a",border:"1px solid #e94560",color:"#e94560",borderRadius:"10px",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>정말 삭제</button></div>}
        </div>}
      </>}
    </div>
    {zoom&&<div onClick={()=>setZoom(null)} style={{position:"absolute",inset:0,zIndex:50,background:"rgba(0,0,0,0.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"18px"}}>
      <img src={zoom.url} style={{maxWidth:"100%",maxHeight:"64%",objectFit:"contain",background:zoom.kind==="art"?"#fff":"transparent",borderRadius:"10px",boxShadow:"0 8px 40px rgba(255,209,102,0.25)"}}/>
      <div style={{marginTop:"12px",fontSize:"13px",fontWeight:"700"}}>{zoom.name}</div>
      <div style={{fontSize:"10px",color:"#888",marginTop:"3px",maxWidth:"90%",textAlign:"center"}}>{zoom.sub}</div>
      <div style={{display:"flex",gap:"10px",marginTop:"14px"}}>
        <button onClick={e=>{e.stopPropagation();setZoom(null);}} style={{padding:"9px 20px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#aaa",borderRadius:"10px",cursor:"pointer",fontSize:"12px"}}>닫기</button>
        <button onClick={e=>{e.stopPropagation();zoom.kind==="art"?delArt(zoom.id):delBm(zoom.id);}} style={{padding:"9px 20px",background:"#2a0a0a",border:"1px solid #e94560",color:"#e94560",borderRadius:"10px",cursor:"pointer",fontSize:"12px"}}>🗑 삭제</button>
      </div>
    </div>}
  </div>);
}

/* ── 알바냥: 아르바이트 탐색·지원·퇴사 + 요일제 출근(미니게임) ── */
export function JobcatApp({state,setState}){
  const [confirmQuit,setConfirmQuit]=useState(false);
  const [working,setWorking]=useState(false);
  const [note,setNote]=useState(null);
  const cur=getJob(state);
  const gd=state.gameDate||{month:5,day:1};
  const eventDay=isEventDay(state);
  const today=weekdayOf(state.day);
  const workday=isWorkdayToday(state);
  const worked=hasWorkedToday(state);
  const lowSt=(state.stamina||0)<15;
  const noSlot=(state.actionsToday||0)>=2;
  const canWork=!!cur&&workday&&!worked&&!eventDay&&!lowSt&&!noSlot;
  const pending=pendingWages(state);
  useEffect(()=>{if(!note)return;const t=setTimeout(()=>setNote(null),2800);return()=>clearTimeout(t);},[note]);
  if(working&&cur)return <WorkGame job={cur} onCancel={()=>setWorking(false)} onDone={(mult,label)=>{const wage=shiftWage(cur,mult);setState(s=>workShift(s,mult));setWorking(false);setNote(`${label} 일당 ₩${wage.toLocaleString()} 적립! (월급날 정산)`);}}/>;
  const reason=!cur?"":worked?"오늘 근무 완료! 수고했다냥 🐾":!workday?`오늘(${DOW_NAMES[today]})은 휴무다냥 · 근무: ${workDaysLabel(cur)}요일`:eventDay?"행사 당일은 알바 휴무다냥!":noSlot?"오늘 행동력을 다 썼다냥... (출근도 시간이 든다냥)":lowSt?"체력이 부족하다냥... (15 이상 필요)":"";
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#171208",color:"#f0e8dc",fontFamily:"'Noto Sans KR',sans-serif"}}>
    {/* 알바냥 브랜드 헤더 — 고양이 마스코트 배너 */}
    <div style={{padding:"13px 16px 11px",background:"linear-gradient(135deg,#ff9f43,#e0702e)",flexShrink:0,display:"flex",gap:"11px",alignItems:"center"}}>
      <div style={{width:"46px",height:"46px",borderRadius:"50%",background:"#fff3e0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",border:"2.5px solid #fff",flexShrink:0,boxShadow:"0 3px 8px rgba(0,0,0,0.25)"}}>🐱</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"17px",fontWeight:"900",color:"#fff",display:"flex",alignItems:"center",gap:"6px"}}>알바냥<span style={{fontSize:"8px",background:"#fff",color:"#e0702e",borderRadius:"8px",padding:"2px 7px",fontWeight:"800"}}>동네알바 1위</span></div>
        <div style={{fontSize:"10px",color:"#ffe4c2",marginTop:"1px"}}>{canWork?"오늘은 근무일이다냥! 출근하라냥!":cur?"오늘도 일하는 집사, 멋지다냥!":"오늘도 좋은 알바 찾아준다냥~"}</div>
      </div>
      <span style={{fontSize:"22px",flexShrink:0,opacity:0.85}}>🐾</span>
    </div>
    <div style={{flex:1,overflow:"auto",padding:"14px"}}>
      {note&&<div style={{padding:"9px 12px",background:"#0a2a1a",border:"1px solid #06d6a0",borderRadius:"10px",marginBottom:"12px",fontSize:"11px",color:"#06d6a0",fontWeight:"700",textAlign:"center"}}>{note}</div>}
      {cur?(<div style={{padding:"14px",background:"linear-gradient(135deg,#2a1a0a,#1a0f22)",border:"1px solid #ff9f43",borderRadius:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"10px",color:"#ff9f43",fontWeight:"700",letterSpacing:"1px",marginBottom:"6px"}}>💼 재직 중</div>
        <div style={{fontSize:"15px",fontWeight:"800"}}>{cur.icon} {cur.name}</div>
        {/* 근무 요일 칩 (오늘 하이라이트) */}
        <div style={{display:"flex",gap:"4px",margin:"9px 0 7px"}}>
          {DOW_NAMES.map((d,i)=>{const on=cur.workDays.includes(i);const isToday=i===today;
            return <span key={d} style={{flex:1,textAlign:"center",padding:"5px 0",borderRadius:"7px",fontSize:"10px",fontWeight:"800",background:on?"#3a2410":"#1d1710",color:on?"#ffb763":"#5a4d3a",border:isToday?"1.5px solid #ffd166":"1.5px solid transparent"}}>{d}</span>;})}
        </div>
        <div style={{fontSize:"11px",color:"#a8987e",lineHeight:1.8}}>일당 {KRW(cur.dayWage)} (성과 ×0.5~1.4) · 체력 -{cur.staminaCost} · 멘탈 -{cur.mentalCost} · ⏳행동 1<br/>이번 달 적립 <b style={{color:"#ffd166"}}>{KRW(pending)}</b> · 월급날 {PAYDAY}일 (D-{daysToPayday(gd)})</div>
        <button onClick={()=>canWork&&setWorking(true)} disabled={!canWork} style={{width:"100%",marginTop:"11px",padding:"13px",borderRadius:"11px",border:"none",background:canWork?"linear-gradient(135deg,#ff9f43,#e94560)":"#241b0e",color:canWork?"#fff":"#6a5a42",fontWeight:"900",fontSize:"14px",cursor:canWork?"pointer":"not-allowed",boxShadow:canWork?"0 4px 16px rgba(255,159,67,0.4)":"none"}}>{canWork?"🕒 출근하기!":worked?"✓ 오늘 근무 완료":"🐾 오늘은 출근 못 한다냥"}</button>
        {reason&&!canWork&&<div style={{fontSize:"10px",color:"#8a7a5e",marginTop:"6px",textAlign:"center"}}>{reason}</div>}
        {!confirmQuit
          ?<button onClick={()=>setConfirmQuit(true)} style={{marginTop:"10px",padding:"7px 16px",background:"transparent",border:"1px solid #e94560",color:"#e94560",borderRadius:"9px",cursor:"pointer",fontSize:"11px",fontWeight:"700"}}>그만두기</button>
          :<div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
            <button onClick={()=>setConfirmQuit(false)} style={{flex:1,padding:"8px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"9px",cursor:"pointer",fontSize:"12px"}}>취소</button>
            <button onClick={()=>{setState(s=>quitJob(s));setConfirmQuit(false);}} style={{flex:1,padding:"8px",background:"#2a0a0a",border:"1px solid #e94560",color:"#e94560",borderRadius:"9px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>정말 그만두기 (적립 일당 소멸)</button>
          </div>}
      </div>):(
      <div style={{padding:"11px 13px",background:"#241b0e",border:"1px dashed #4a3a22",borderRadius:"11px",marginBottom:"14px",fontSize:"11px",color:"#c9b699",lineHeight:1.7}}>😿 지금은 백수다냥... 아래에서 알바를 골라보라냥.<br/><span style={{color:"#8a7a5e"}}>근무 요일에 출근(미니게임)하면 일당이 적립되고, 매월 {PAYDAY}일에 입금된다냥.</span></div>)}
      <div style={{fontSize:"12px",fontWeight:"700",color:"#ffd166",marginBottom:"8px"}}>📋 모집 중인 알바</div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {JOBS.map(j=>{
          const locked=(state.fame||0)<j.minFame;
          const isCur=cur&&cur.id===j.id;
          const dis=locked||!!cur;
          return(<div key={j.id} style={{display:"flex",gap:"11px",alignItems:"center",padding:"12px 13px",background:isCur?"#2b1d0c":"#211a10",border:`1px solid ${isCur?"#ff9f43":"#3a2f1e"}`,borderRadius:"12px",opacity:locked?0.55:1}}>
            <div style={{fontSize:"24px",flexShrink:0}}>{j.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"13px",fontWeight:"700"}}>{j.name}</div>
              <div style={{fontSize:"10px",color:"#666",marginTop:"2px",lineHeight:1.5}}>{j.desc}</div>
              <div style={{fontSize:"10px",color:"#ffd166",marginTop:"3px"}}>일당 {KRW(j.dayWage)} · {workDaysLabel(j)}요일 · 월 약 {KRW(monthlyEstimate(j))}{j.minFame>0&&<span style={{color:locked?"#e94560":"#06d6a0"}}> · 인지도 {j.minFame}+</span>}</div>
            </div>
            {isCur?<span style={{fontSize:"11px",color:"#ff9f43",fontWeight:"700",flexShrink:0}}>재직중</span>
            :locked?<span style={{fontSize:"10px",color:"#e94560",flexShrink:0}}>🔒</span>
            :<button onClick={()=>setState(s=>applyForJob(s,j.id))} disabled={dis} style={{padding:"7px 13px",background:dis?"#1a1a2a":"linear-gradient(135deg,#ff9f43,#e94560)",border:"none",color:dis?"#555":"#fff",borderRadius:"8px",cursor:dis?"not-allowed":"pointer",fontSize:"11px",fontWeight:"700",flexShrink:0}}>지원</button>}
          </div>);})}
      </div>
      <div style={{marginTop:"14px",fontSize:"10px",color:"#444",textAlign:"center",lineHeight:1.7}}>💡 근무 요일에 출근하면 미니게임 성과에 따라 일당이 ×0.5~1.4로 적립!<br/>출근 안 하면 그 날 일당은 없다냥. 행사 당일은 휴무.</div>
    </div>
  </div>);
}

/* ── 은행: 잔액 + 모든 거래 로그 (입금·출금) ── */
export function BankApp({state}){
  const txs=state.transactions||[];
  const job=getJob(state);
  const gd=state.gameDate||{month:5,day:1};
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0a0f1e",color:"#e2e8f6",fontFamily:"'Noto Sans KR',sans-serif"}}>
    {/* 모모뱅크 브랜드 헤더 — 핀테크 톤 */}
    <div style={{padding:"14px 16px",background:"#0b1530",borderBottom:"1px solid #1c2b55",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{width:"26px",height:"26px",borderRadius:"8px",background:"linear-gradient(135deg,#5b8cff,#2d5bff)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:"900",color:"#fff"}}>M</span>
        <span style={{fontSize:"15px",fontWeight:"900",color:"#fff",letterSpacing:"0.5px"}}>모모<span style={{color:"#5b8cff"}}>뱅크</span></span>
      </div>
      <span style={{fontSize:"9px",color:"#5b8cff",border:"1px solid #24397a",borderRadius:"10px",padding:"3px 9px",fontWeight:"700"}}>🔔 입출금 알림 ON</span>
    </div>
    <div style={{flex:1,overflow:"auto"}}>
      <div style={{margin:"14px",padding:"17px",background:"linear-gradient(135deg,#16296a,#0e1c48)",border:"1px solid #2a4390",borderRadius:"18px",boxShadow:"0 8px 24px rgba(45,91,255,0.18)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:"-24px",top:"-24px",width:"110px",height:"110px",borderRadius:"50%",background:"radial-gradient(circle,#5b8cff22,transparent)",pointerEvents:"none"}}/>
        <div style={{fontSize:"10px",color:"#8aa6f0",letterSpacing:"1px"}}>입출금 통장 <span style={{color:"#3d5aa8"}}>1002-{String((state.day||1)%1000).padStart(3,"0")}-서코</span></div>
        <div style={{fontSize:"27px",fontWeight:"900",color:"#fff",marginTop:"5px",fontVariantNumeric:"tabular-nums"}}>{KRW(state.gold)}</div>
        {job&&<div style={{fontSize:"10px",color:"#8aa6f0",marginTop:"7px"}}>💼 {job.name} 급여일: 매월 {PAYDAY}일 (D-{daysToPayday(gd)})</div>}
      </div>
      <div style={{padding:"0 14px 6px",fontSize:"12px",fontWeight:"700",color:"#ffd166"}}>거래내역 {txs.length?`(${txs.length})`:""}</div>
      {!txs.length&&<Empty icon="🧾" text="거래 내역이 없어요" sub="굿즈 주문·행사 수익·월급이 여기에 기록돼요"/>}
      {txs.map(tx=>(<div key={tx.id} style={{display:"flex",gap:"10px",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #101a36"}}>
        <div style={{fontSize:"18px",flexShrink:0}}>{tx.icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"12px",fontWeight:"700",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.label}</div>
          <div style={{fontSize:"9px",color:"#555",marginTop:"2px"}}>{tx.date?`${tx.date.month}월 ${tx.date.day}일`:""} · Day {tx.day}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:"13px",fontWeight:"800",color:tx.amount>0?"#06d6a0":"#e94560"}}>{tx.amount>0?"+":""}{KRW(tx.amount).replace("₩-","-₩")}</div>
          <div style={{fontSize:"9px",color:"#555"}}>잔액 {KRW(tx.balance)}</div>
        </div>
      </div>))}
    </div>
  </div>);
}

/* ── 굿즈팩토리(앱): 제작 진행현황만. 주문은 인터넷 › 굿즈컴퍼니 ── */
export function FactoryStatusApp({state}){
  const orders=state.orders||[];
  const making=orders.filter(o=>o.status==="making");
  const done=orders.filter(o=>o.status!=="making").slice(0,12);
  const row=(o,prog)=>{const t=GOODS_TYPES.find(x=>x.id===o.goodsType);const dleft=o.readyDay-state.day;
    return(<div key={o.id} style={{padding:"11px 12px",background:"#1c1710",border:"1px solid #3a2f1e",borderRadius:"12px",marginBottom:"8px"}}>
      <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
        <img src={o.artworkSnapshot} style={{width:"38px",height:"38px",objectFit:"contain",background:"#fff",borderRadius:"7px",flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"12px",fontWeight:"700"}}>{(t&&t.name)||o.goodsType} {o.quantity}개</div>
          <div style={{fontSize:"9px",color:"#666",marginTop:"2px"}}>{KRW(o.totalCost)} · 주문 Day {o.orderedDay}</div>
        </div>
        <div style={{fontSize:"12px",fontWeight:"900",color:prog!=null?(dleft<=0?"#06d6a0":"#ffd166"):"#06d6a0",flexShrink:0}}>{prog!=null?(dleft<=0?"완성!":`D-${dleft}`):"✓ 완료"}</div>
      </div>
      {prog!=null&&<div style={{marginTop:"8px",height:"6px",background:"#0d0b07",borderRadius:"3px",overflow:"hidden",border:"1px solid #2a2114"}}><div style={{height:"100%",width:`${Math.round(prog*100)}%`,background:"repeating-linear-gradient(45deg,#ffb347 0 6px,#e0702e 6px 12px)",borderRadius:"3px",transition:"width .4s"}}/></div>}
    </div>);};
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#12100c",color:"#ece5da",fontFamily:"'Noto Sans KR',sans-serif"}}>
    {/* 굿즈팩토리 브랜드 헤더 — 공장/인더스트리얼 톤 */}
    <div style={{flexShrink:0}}>
      <div style={{padding:"13px 16px",background:"#1a1408",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:"15px",fontWeight:"900",color:"#ffb347",letterSpacing:"-0.3px"}}>🏭 GOODS<span style={{color:"#fff"}}>FACTORY</span></div>
        <span style={{fontSize:"9px",color:"#8a7a5e",border:"1px solid #3a2f1e",borderRadius:"4px",padding:"3px 8px",fontFamily:"monospace"}}>제작 라인 모니터</span>
      </div>
      <div style={{height:"6px",background:"repeating-linear-gradient(45deg,#ffb347 0 10px,#1a1408 10px 20px)"}}/>
    </div>
    <div style={{flex:1,overflow:"auto",padding:"14px"}}>
      <div style={{padding:"10px 12px",background:"#1c1710",border:"1px dashed #4a3a22",borderRadius:"11px",marginBottom:"14px",fontSize:"11px",color:"#a8987e",lineHeight:1.6}}>🛒 새 주문은 <b style={{color:"#ffb347"}}>💻 인터넷 › 굿즈팩토리</b>에서만 가능해요.<br/>여기서는 제작 진행상황을 확인할 수 있어요.</div>
      <div style={{fontSize:"12px",fontWeight:"700",color:"#ffd166",marginBottom:"8px"}}>🚚 제작 중 ({making.length})</div>
      {!making.length&&<div style={{fontSize:"11px",color:"#555",marginBottom:"14px"}}>제작 중인 굿즈가 없어요</div>}
      {making.map(o=>row(o,Math.min(1,Math.max(0,(state.day-o.orderedDay)/Math.max(1,o.readyDay-o.orderedDay)))))}
      {done.length>0&&<><div style={{fontSize:"12px",fontWeight:"700",color:"#06d6a0",margin:"14px 0 8px"}}>✓ 완료된 주문</div>{done.map(o=>row(o,null))}</>}
    </div>
  </div>);
}

/* ── 덕질장 (기본 앱): 공식 굿즈 컬렉션 북 ── */
const RAR_ORDER={SSR:3,SR:2,R:1,N:0};
export function OfficialImg({item,style}){
  const [url,setUrl]=useState(null);
  const k=item&&(item.seed+":"+item.type);
  useEffect(()=>{let a=true;if(item)officialMockup(item).then(u=>{if(a)setUrl(u);});return()=>{a=false;};},[k]); // eslint-disable-line react-hooks/exhaustive-deps
  return url?<img src={url} alt="" draggable={false} style={style}/>:null;
}
export function CollectionApp({state}){
  const [zoom,setZoom]=useState(null);
  const col=state.collection||[];
  const sets=collectionSets(state);
  const uniq=col.length;
  const doneCnt=sets.filter(s=>s.done).length;
  const itemsFor=(set,type)=>col.filter(it=>it.char===set.char&&it.genreName===set.genreName&&it.type===type);
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",position:"relative"}}>
    <AppHeader icon="🎀" title="덕질장" color="#ff8fb0" sub="공식 굿즈 컬렉션 북"/>
    <div style={{display:"flex",gap:"6px",padding:"10px 14px 0",flexShrink:0}}>
      {[{l:"수집",v:`${uniq}종`},{l:"세트 완성",v:`${doneCnt}/${sets.length||0}`}].map(({l,v})=>
        <div key={l} style={{flex:1,padding:"7px 4px",background:"#12122a",borderRadius:"10px",textAlign:"center",border:"1px solid #2a2a4a"}}><div style={{fontSize:"9px",color:"#666"}}>{l}</div><div style={{fontSize:"13px",fontWeight:"800",color:"#ff8fb0"}}>{v}</div></div>)}
    </div>
    <div style={{flex:1,overflow:"auto",padding:"12px 14px"}}>
      {!col.length&&<Empty icon="🎀" text="아직 수집한 공식 굿즈가 없어요" sub="현생에서 '공식 굿즈 구경'을 하면 굿즈를 겟할 수 있어요 (지름신 주의)"/>}
      {sets.map(set=>(<div key={set.key} style={{marginBottom:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"7px",marginBottom:"7px"}}>
          <span style={{fontSize:"13px",fontWeight:"800"}}>{set.char}</span>
          <span style={{fontSize:"9px",color:"#666"}}>{set.genreName}</span>
          {set.done
            ?<span style={{marginLeft:"auto",fontSize:"9px",fontWeight:"800",color:"#1a1430",background:"linear-gradient(90deg,#ffd166,#ffb347)",padding:"2px 9px",borderRadius:"9px"}}>★ 세트 완성</span>
            :<span style={{marginLeft:"auto",fontSize:"9px",color:"#888"}}>{set.have.length}/{OFFICIAL_TYPES.length}</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"6px"}}>
          {OFFICIAL_TYPES.map(t=>{
            const its=itemsFor(set,t.type);
            if(!its.length)return(<div key={t.type} style={{aspectRatio:"1",background:"#101024",border:"1.5px dashed #2a2a4a",borderRadius:"10px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"2px"}}>
              <span style={{fontSize:"15px",opacity:0.4}}>❓</span><span style={{fontSize:"7px",color:"#444"}}>{t.name}</span>
            </div>);
            const best=[...its].sort((a,b)=>(RAR_ORDER[b.rarity]||0)-(RAR_ORDER[a.rarity]||0))[0];
            const cnt=its.reduce((s,x)=>s+(x.count||1),0);
            const rc=rarityOf(best.rarity).color;
            return(<button key={t.type} onClick={()=>setZoom(best)} style={{aspectRatio:"1",position:"relative",background:"#15152e",border:`1.5px solid ${rc}`,borderRadius:"10px",cursor:"pointer",padding:"6%",boxShadow:best.rarity==="SSR"?`0 0 10px ${rc}66`:"none"}}>
              <OfficialImg item={best} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
              <span style={{position:"absolute",top:2,left:4,fontSize:"7px",fontWeight:"900",color:rc}}>{best.rarity}</span>
              {cnt>1&&<span style={{position:"absolute",bottom:2,right:4,fontSize:"8px",color:"#888"}}>×{cnt}</span>}
            </button>);})}
        </div>
      </div>))}
      {col.length>0&&<div style={{fontSize:"10px",color:"#444",textAlign:"center",lineHeight:1.7,marginTop:"4px"}}>캐릭터별 5종을 모으면 세트 완성! (멘탈 +30)<br/>같은 굿즈는 ×스택으로 쌓여요</div>}
    </div>
    {zoom&&<div onClick={()=>setZoom(null)} style={{position:"absolute",inset:0,zIndex:50,background:"rgba(0,0,0,0.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <div style={{width:"72%",aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center"}}><OfficialImg item={zoom} style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",filter:zoom.rarity==="SSR"?"drop-shadow(0 0 18px rgba(255,209,102,0.6))":"none"}}/></div>
      <div style={{marginTop:"12px",fontSize:"14px",fontWeight:"800"}}><span style={{color:rarityOf(zoom.rarity).color}}>[{zoom.rarity}]</span> {zoom.name}</div>
      <div style={{fontSize:"10px",color:"#888",marginTop:"4px"}}>{zoom.genreName} 공식 · Day {zoom.day} 획득{(zoom.count||1)>1?` · ×${zoom.count}`:""}</div>
      <button onClick={()=>setZoom(null)} style={{marginTop:"14px",padding:"9px 22px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#aaa",borderRadius:"10px",cursor:"pointer",fontSize:"12px"}}>닫기</button>
    </div>}
  </div>);
}

/* ── 캘린더: 행사·월급일 표시 (30일/월, 절대일%7 요일) ── */
export function CalendarApp({state}){
  const gd=state.gameDate||{month:5,day:1};
  const [mOff,setMOff]=useState(0);
  const [selD,setSelD]=useState(null); // 보고 있는 달의 일(1~30)
  const viewMonth=(((gd.month-1+mOff)%12)+12)%12+1;
  const absOf=(d)=>state.day+mOff*30+(d-gd.day);
  const firstW=((absOf(1)%7)+7)%7; // 0=일 … 6=토
  const sched=(state.genre&&state.genre.eventSchedule)||[];
  const appliedIds=new Set([...(state.appliedEvents||[]),...(state.activeEvent?[state.activeEvent.id]:[])]);
  const fairsOf=(abs)=>sched.filter(e=>abs>=e.startDay&&abs<=e.endDay);
  const job=getJob(state);
  const move=(d)=>{setMOff(o=>Math.max(-3,Math.min(6,o+d)));setSelD(null);};
  const W=["일","월","화","수","목","금","토"];
  const cells=[...Array(firstW).fill(null),...Array.from({length:30},(_,i)=>i+1)];
  const selAbs=selD!=null?absOf(selD):null;
  const selFairs=selD!=null?fairsOf(selAbs):[];
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <AppHeader icon="📅" title="캘린더" color="#c084fc" sub="행사 일정 · 월급날"/>
    <div style={{flex:1,overflow:"auto",padding:"12px 14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
        <button onClick={()=>move(-1)} disabled={mOff<=-3} style={{width:"32px",height:"32px",borderRadius:"9px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:mOff<=-3?"#444":"#c084fc",cursor:mOff<=-3?"not-allowed":"pointer",fontSize:"14px"}}>‹</button>
        <div style={{fontSize:"16px",fontWeight:"900"}}>{viewMonth}월 {mOff===0&&<span style={{fontSize:"10px",color:"#7c3aed",fontWeight:"700"}}>이번 달</span>}</div>
        <button onClick={()=>move(1)} disabled={mOff>=6} style={{width:"32px",height:"32px",borderRadius:"9px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:mOff>=6?"#444":"#c084fc",cursor:mOff>=6?"not-allowed":"pointer",fontSize:"14px"}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"4px"}}>
        {W.map((w,i)=><div key={w} style={{textAlign:"center",fontSize:"10px",fontWeight:"700",color:i===0?"#e94560":i===6?"#4a86e8":"#666",padding:"3px 0"}}>{w}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
        {cells.map((d,i)=>{
          if(d==null)return<div key={"e"+i}/>;
          const abs=absOf(d);const w=((abs%7)+7)%7;
          const fairs=fairsOf(abs);
          const hasApplied=fairs.some(e=>appliedIds.has(e.id));
          const isPay=!!state.job&&d===PAYDAY;
          const isToday=abs===state.day;
          const past=abs<state.day;
          return(<button key={d} onClick={()=>setSelD(d)} style={{aspectRatio:"1",borderRadius:"9px",background:selD===d?"rgba(124,58,237,0.3)":isToday?"rgba(124,58,237,0.16)":"#12122a",border:`1.5px solid ${selD===d?"#c084fc":isToday?"#7c3aed":"#1e1e3a"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"2px",padding:"2px",opacity:past?0.45:1}}>
            <span style={{fontSize:"11px",fontWeight:isToday?"900":"700",color:w===0?"#e94560":w===6?"#4a86e8":"#e0e0ff"}}>{d}</span>
            <span style={{display:"flex",gap:"2px",height:"6px",alignItems:"center"}}>
              {fairs.length>0&&<span style={{width:"5px",height:"5px",borderRadius:"50%",background:hasApplied?"#ffd166":"#e94560"}}/>}
              {(state.fanEvents||[]).some(f=>f.day===abs)&&<span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#ff8fb0"}}/>}
              {!!job&&job.workDays.includes(w)&&<span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#ff9f43"}}/>}
              {isPay&&<span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#06d6a0"}}/>}
            </span>
          </button>);})}
      </div>
      <div style={{display:"flex",gap:"12px",margin:"10px 2px 12px",fontSize:"9px",color:"#666"}}>
        <span>● <span style={{color:"#e94560"}}>행사</span></span><span>● <span style={{color:"#ffd166"}}>신청</span></span><span>● <span style={{color:"#ff8fb0"}}>덕질</span></span><span>● <span style={{color:"#ff9f43"}}>근무</span></span><span>● <span style={{color:"#06d6a0"}}>월급</span></span>
      </div>
      {selD!=null&&<div style={{padding:"12px",background:"#12122a",border:"1px solid #2a2a4a",borderRadius:"12px"}}>
        <div style={{fontSize:"12px",fontWeight:"800",color:"#c084fc",marginBottom:"8px"}}>{viewMonth}월 {selD}일 {selAbs===state.day?"(오늘)":selAbs>state.day?`(D-${selAbs-state.day})`:"(지남)"}</div>
        {selFairs.length===0&&!(state.job&&selD===PAYDAY)&&<div style={{fontSize:"11px",color:"#555"}}>일정이 없어요</div>}
        {selFairs.map(e=>(<div key={e.id} style={{display:"flex",gap:"8px",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #1a1a30"}}>
          <span style={{fontSize:"15px"}}>🎪</span>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:"12px",fontWeight:"700"}}>{e.name}</div><div style={{fontSize:"9px",color:"#666"}}>{e.days===2?"양일":"하루"}{appliedIds.has(e.id)?" · ⭐ 신청함":e.requiresApplication?` · 접수 마감 Day ${e.applyBy}`:""}</div></div>
        </div>))}
        {(state.fanEvents||[]).filter(f=>f.day===selAbs).map((f,i)=>(<div key={"fe"+i} style={{display:"flex",gap:"8px",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #1a1a30"}}><span style={{fontSize:"15px"}}>{f.icon||"💖"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:"12px",fontWeight:"700",color:"#ff8fb0"}}>{f.name}</div><div style={{fontSize:"9px",color:"#666"}}>덕질 일정 · 예산 ₩{(f.cost||0).toLocaleString()} · 못 가면 슬퍼요</div></div></div>))}
        {state.ticketing&&state.ticketing.openDay===selAbs&&<div style={{display:"flex",gap:"8px",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #1a1a30"}}><span style={{fontSize:"15px"}}>🎫</span><div style={{fontSize:"12px",fontWeight:"700",color:"#e94560"}}>『{state.ticketing.name}』 티켓팅 오픈!</div></div>}
        {state.job&&selD===PAYDAY&&<div style={{display:"flex",gap:"8px",alignItems:"center",padding:"7px 0"}}><span style={{fontSize:"15px"}}>💼</span><div style={{fontSize:"12px",fontWeight:"700",color:"#06d6a0"}}>월급날</div></div>}
      </div>}
      <div style={{marginTop:"12px",fontSize:"10px",color:"#444",textAlign:"center",lineHeight:1.7}}>🚧 최애 생일·생일카페·팝업 같은 덕질 일정 추가는 준비 중!<br/>덕질 일정과 행사가 겹치는 날엔... 선택이 필요해질 거예요.</div>
    </div>
  </div>);
}
