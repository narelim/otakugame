import { useState } from "react";
import { GOODS_TYPES } from "../data/gameData.js";
import { threads } from "../systems/messageSystem.js";
import { JOBS, PAYDAY, getJob, applyForJob, quitJob, daysToPayday } from "../systems/jobSystem.js";

/* ============================================================
   핸드폰 전용 앱 화면들 (PhoneOS 안에서만 사용)
   메시지 · 알바냥 · 은행 · 굿즈팩토리(진행현황) · 캘린더
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

/* ── 알바냥: 아르바이트 탐색·지원·퇴사 (근무 활동 화면은 추후) ── */
export function JobcatApp({state,setState}){
  const [confirmQuit,setConfirmQuit]=useState(false);
  const cur=getJob(state);
  const gd=state.gameDate||{month:5,day:1};
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <AppHeader icon="🐱" title="알바냥" color="#ff9f43" sub="동네 알바 찾기는 알바냥이 최고다냥!"/>
    <div style={{flex:1,overflow:"auto",padding:"14px"}}>
      {cur?(<div style={{padding:"14px",background:"linear-gradient(135deg,#2a1a0a,#1a0f22)",border:"1px solid #ff9f43",borderRadius:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"10px",color:"#ff9f43",fontWeight:"700",letterSpacing:"1px",marginBottom:"6px"}}>💼 재직 중</div>
        <div style={{fontSize:"15px",fontWeight:"800"}}>{cur.icon} {cur.name}</div>
        <div style={{fontSize:"11px",color:"#888",marginTop:"4px",lineHeight:1.7}}>월급 {KRW(cur.pay)} (만근 기준) · 근무 {Math.max(0,state.day-state.job.startedDay)}일차<br/>다음 월급날: 매월 {PAYDAY}일 (D-{daysToPayday(gd)})</div>
        {!confirmQuit
          ?<button onClick={()=>setConfirmQuit(true)} style={{marginTop:"10px",padding:"8px 16px",background:"transparent",border:"1px solid #e94560",color:"#e94560",borderRadius:"9px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>그만두기</button>
          :<div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
            <button onClick={()=>setConfirmQuit(false)} style={{flex:1,padding:"8px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"9px",cursor:"pointer",fontSize:"12px"}}>취소</button>
            <button onClick={()=>{setState(s=>quitJob(s));setConfirmQuit(false);}} style={{flex:1,padding:"8px",background:"#2a0a0a",border:"1px solid #e94560",color:"#e94560",borderRadius:"9px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>정말 그만두기</button>
          </div>}
      </div>):(
      <div style={{padding:"11px 13px",background:"#12122a",border:"1px solid #2a2a4a",borderRadius:"11px",marginBottom:"14px",fontSize:"11px",color:"#888",lineHeight:1.7}}>😿 지금은 백수다냥... 아래에서 알바를 골라보라냥.<br/><span style={{color:"#555"}}>월급은 매월 {PAYDAY}일, 근무일수만큼 은행에 입금된다냥.</span></div>)}
      <div style={{fontSize:"12px",fontWeight:"700",color:"#ffd166",marginBottom:"8px"}}>📋 모집 중인 알바</div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {JOBS.map(j=>{
          const locked=(state.fame||0)<j.minFame;
          const isCur=cur&&cur.id===j.id;
          const dis=locked||!!cur;
          return(<div key={j.id} style={{display:"flex",gap:"11px",alignItems:"center",padding:"12px 13px",background:isCur?"#1a1408":"#12122a",border:`1px solid ${isCur?"#ff9f43":"#2a2a4a"}`,borderRadius:"12px",opacity:locked?0.55:1}}>
            <div style={{fontSize:"24px",flexShrink:0}}>{j.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"13px",fontWeight:"700"}}>{j.name}</div>
              <div style={{fontSize:"10px",color:"#666",marginTop:"2px",lineHeight:1.5}}>{j.desc}</div>
              <div style={{fontSize:"10px",color:"#ffd166",marginTop:"3px"}}>월급 {KRW(j.pay)}{j.minFame>0&&<span style={{color:locked?"#e94560":"#06d6a0"}}> · 인지도 {j.minFame}+</span>}</div>
            </div>
            {isCur?<span style={{fontSize:"11px",color:"#ff9f43",fontWeight:"700",flexShrink:0}}>재직중</span>
            :locked?<span style={{fontSize:"10px",color:"#e94560",flexShrink:0}}>🔒</span>
            :<button onClick={()=>setState(s=>applyForJob(s,j.id))} disabled={dis} style={{padding:"7px 13px",background:dis?"#1a1a2a":"linear-gradient(135deg,#ff9f43,#e94560)",border:"none",color:dis?"#555":"#fff",borderRadius:"8px",cursor:dis?"not-allowed":"pointer",fontSize:"11px",fontWeight:"700",flexShrink:0}}>지원</button>}
          </div>);})}
      </div>
      <div style={{marginTop:"14px",fontSize:"10px",color:"#444",textAlign:"center",lineHeight:1.7}}>🚧 알바 근무(미니게임) 화면은 추후 업데이트!<br/>지금은 재직 중이면 월급날에 자동으로 입금돼요.</div>
    </div>
  </div>);
}

/* ── 은행: 잔액 + 모든 거래 로그 (입금·출금) ── */
export function BankApp({state}){
  const txs=state.transactions||[];
  const job=getJob(state);
  const gd=state.gameDate||{month:5,day:1};
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <AppHeader icon="🏦" title="모모뱅크" color="#4a86e8" sub="내 계좌 · 거래내역"/>
    <div style={{flex:1,overflow:"auto"}}>
      <div style={{margin:"14px",padding:"16px",background:"linear-gradient(135deg,#0f1a3a,#141232)",border:"1px solid #4a86e8",borderRadius:"16px"}}>
        <div style={{fontSize:"10px",color:"#7a9ae0",letterSpacing:"1px"}}>입출금 통장</div>
        <div style={{fontSize:"26px",fontWeight:"900",color:"#fff",marginTop:"4px"}}>{KRW(state.gold)}</div>
        {job&&<div style={{fontSize:"10px",color:"#7a9ae0",marginTop:"6px"}}>💼 {job.name} 급여일: 매월 {PAYDAY}일 (D-{daysToPayday(gd)})</div>}
      </div>
      <div style={{padding:"0 14px 6px",fontSize:"12px",fontWeight:"700",color:"#ffd166"}}>거래내역 {txs.length?`(${txs.length})`:""}</div>
      {!txs.length&&<Empty icon="🧾" text="거래 내역이 없어요" sub="굿즈 주문·행사 수익·월급이 여기에 기록돼요"/>}
      {txs.map(tx=>(<div key={tx.id} style={{display:"flex",gap:"10px",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #16162e"}}>
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
    return(<div key={o.id} style={{padding:"11px 12px",background:"#12122a",border:"1px solid #2a2a4a",borderRadius:"12px",marginBottom:"8px"}}>
      <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
        <img src={o.artworkSnapshot} style={{width:"38px",height:"38px",objectFit:"contain",background:"#fff",borderRadius:"7px",flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"12px",fontWeight:"700"}}>{(t&&t.name)||o.goodsType} {o.quantity}개</div>
          <div style={{fontSize:"9px",color:"#666",marginTop:"2px"}}>{KRW(o.totalCost)} · 주문 Day {o.orderedDay}</div>
        </div>
        <div style={{fontSize:"12px",fontWeight:"900",color:prog!=null?(dleft<=0?"#06d6a0":"#ffd166"):"#06d6a0",flexShrink:0}}>{prog!=null?(dleft<=0?"완성!":`D-${dleft}`):"✓ 완료"}</div>
      </div>
      {prog!=null&&<div style={{marginTop:"8px",height:"5px",background:"#1a1a3a",borderRadius:"3px",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round(prog*100)}%`,background:"linear-gradient(90deg,#ff9f43,#e94560)",borderRadius:"3px",transition:"width .4s"}}/></div>}
    </div>);};
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <AppHeader icon="🏭" title="굿즈팩토리" color="#ff9f43" sub="주문 진행현황 확인"/>
    <div style={{flex:1,overflow:"auto",padding:"14px"}}>
      <div style={{padding:"10px 12px",background:"#12122a",border:"1px dashed #3a3a6a",borderRadius:"11px",marginBottom:"14px",fontSize:"11px",color:"#888",lineHeight:1.6}}>🛒 새 주문은 <b style={{color:"#c084fc"}}>💻 인터넷 › 굿즈컴퍼니</b>에서만 가능해요.<br/>여기서는 제작 진행상황을 확인할 수 있어요.</div>
      <div style={{fontSize:"12px",fontWeight:"700",color:"#ffd166",marginBottom:"8px"}}>🚚 제작 중 ({making.length})</div>
      {!making.length&&<div style={{fontSize:"11px",color:"#555",marginBottom:"14px"}}>제작 중인 굿즈가 없어요</div>}
      {making.map(o=>row(o,Math.min(1,Math.max(0,(state.day-o.orderedDay)/Math.max(1,o.readyDay-o.orderedDay)))))}
      {done.length>0&&<><div style={{fontSize:"12px",fontWeight:"700",color:"#06d6a0",margin:"14px 0 8px"}}>✓ 완료된 주문</div>{done.map(o=>row(o,null))}</>}
    </div>
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
              {isPay&&<span style={{width:"5px",height:"5px",borderRadius:"50%",background:"#06d6a0"}}/>}
            </span>
          </button>);})}
      </div>
      <div style={{display:"flex",gap:"12px",margin:"10px 2px 12px",fontSize:"9px",color:"#666"}}>
        <span>● <span style={{color:"#e94560"}}>행사</span></span><span>● <span style={{color:"#ffd166"}}>신청한 행사</span></span><span>● <span style={{color:"#06d6a0"}}>월급날</span></span>
      </div>
      {selD!=null&&<div style={{padding:"12px",background:"#12122a",border:"1px solid #2a2a4a",borderRadius:"12px"}}>
        <div style={{fontSize:"12px",fontWeight:"800",color:"#c084fc",marginBottom:"8px"}}>{viewMonth}월 {selD}일 {selAbs===state.day?"(오늘)":selAbs>state.day?`(D-${selAbs-state.day})`:"(지남)"}</div>
        {selFairs.length===0&&!(state.job&&selD===PAYDAY)&&<div style={{fontSize:"11px",color:"#555"}}>일정이 없어요</div>}
        {selFairs.map(e=>(<div key={e.id} style={{display:"flex",gap:"8px",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #1a1a30"}}>
          <span style={{fontSize:"15px"}}>🎪</span>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:"12px",fontWeight:"700"}}>{e.name}</div><div style={{fontSize:"9px",color:"#666"}}>{e.days===2?"양일":"하루"}{appliedIds.has(e.id)?" · ⭐ 신청함":e.requiresApplication?` · 접수 마감 Day ${e.applyBy}`:""}</div></div>
        </div>))}
        {state.job&&selD===PAYDAY&&<div style={{display:"flex",gap:"8px",alignItems:"center",padding:"7px 0"}}><span style={{fontSize:"15px"}}>💼</span><div style={{fontSize:"12px",fontWeight:"700",color:"#06d6a0"}}>월급날</div></div>}
      </div>}
      <div style={{marginTop:"12px",fontSize:"10px",color:"#444",textAlign:"center",lineHeight:1.7}}>🚧 최애 생일·생일카페·팝업 같은 덕질 일정 추가는 준비 중!<br/>덕질 일정과 행사가 겹치는 날엔... 선택이 필요해질 거예요.</div>
    </div>
  </div>);
}
