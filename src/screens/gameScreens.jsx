import { useState, useEffect, useRef } from "react";
import { DrawingApp } from "../components/DrawingApp.jsx";
import { GOODS_TYPES, BADGE_SHAPES, BOOTH_ITEMS, CP_TYPES, DAILY_ACTIONS, BOOTH_SIZES, SCALE_LABEL, PHONE_APPS, FAN_ACCOUNTS, MEDIA_LIST, MEDIA_GENRES, APPEARANCE_TAGS, PERSONALITY_TAGS, CONCEPT_TAGS, POSITION_TAGS, POPULARITY_TAGS, POP_TIP, VIBE_TAGS, BG_TAGS, AU_TAGS, GTYPE_LIST, ALLCHAR_MODES, CP_FIX, CP_STRENGTH, CP_CONTACT, CP_POP, MAX_SAVES, SAVE_KEY, ACT_MAX } from "../data/gameData.js";
import { starPath, heartPath, buildOutline } from "../utils/draw.js";
import { applyReadyOrders } from "../systems/goodsSystem.js";
import { switchActiveGenre, canAddGenre, generateGenreName, legacyFields } from "../systems/genreSystem.js";
import { generateEventSchedule, isEventDay, nearestUpcomingEvent, advanceDay, endOfDay } from "../systems/eventSystem.js";
import { logTx } from "../systems/bankSystem.js";
import { pushMessage } from "../systems/messageSystem.js";
import { idbAll, idbPut, idbDel, idbClear, prefetchImages, popFromPool, fanPostText } from "../systems/imageSystem.js";
import { pickOne, buildNpcRoster, saveRoster, getRoster, rosterEligible, npcPostText, makeTimelineUpdate } from "../systems/tweetSystem.js";
import { nextGameDate } from "../systems/snsEventSystem.js";

export function TitleScreen({onStart,onContinue,saveMeta}){
  const hasSave=!!(saveMeta&&saveMeta.state);
  const savedLabel=hasSave&&saveMeta.savedAt?new Date(saveMeta.savedAt).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):null;
  const savedDay=hasSave?(saveMeta.state.day||1):null;
  const handleNew=()=>{if(hasSave&&!window.confirm("새로 시작하면 기존 저장 데이터가 삭제돼요. 계속할까요?"))return;onStart();};
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(180deg,#0d0d1a,#1a0a2e)",fontFamily:"'Noto Sans KR',sans-serif",overflow:"hidden",position:"relative"}}>
    <style>{`@keyframes flt{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}} @keyframes shim{0%{background-position:0% 50%}100%{background-position:200% 50%}} @keyframes fup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    {[...Array(14)].map((_,i)=><div key={i} style={{position:"absolute",width:`${3+Math.random()*4}px`,height:`${3+Math.random()*4}px`,borderRadius:"50%",background:["#e94560","#7c3aed","#ffd166","#06d6a0"][i%4],left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,opacity:0.3+Math.random()*.5,animation:`flt ${2+Math.random()*4}s ease-in-out infinite`,animationDelay:`${Math.random()*2}s`}}/>)}
    <div style={{textAlign:"center",zIndex:1,padding:"32px"}}>
      <div style={{fontSize:"11px",letterSpacing:"6px",color:"#7c3aed",marginBottom:"12px",animation:"fup 0.5s ease"}}>✦ 동인 행사 시뮬레이터 ✦</div>
      <h1 style={{fontSize:"clamp(40px,10vw,72px)",fontWeight:"900",margin:"0 0 6px",background:"linear-gradient(135deg,#e94560,#7c3aed,#ffd166)",backgroundSize:"200%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"fup 0.7s ease, shim 3s linear infinite",lineHeight:1}}>서코의 신</h1>
      <div style={{fontSize:"13px",color:"#666",marginBottom:"36px",lineHeight:2,animation:"fup 0.9s ease"}}>현실에서 못 한 굿즈 제작을 여기서<br/><span style={{color:"#e94560"}}>직접 그린 그림</span>이 진짜 굿즈가 된다</div>
      <div style={{display:"flex",flexDirection:"column",gap:"12px",alignItems:"center"}}>
        {hasSave&&<button onClick={onContinue} style={{padding:"14px 44px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",fontSize:"16px",borderRadius:"50px",cursor:"pointer",boxShadow:"0 8px 32px rgba(124,58,237,0.5)",letterSpacing:"2px",animation:"fup 1.1s ease"}}>▶ 이어하기</button>}
        <button onClick={handleNew} style={hasSave
          ?{padding:"11px 36px",background:"transparent",border:"1px solid #7c3aed",color:"#c084fc",fontWeight:"700",fontSize:"14px",borderRadius:"50px",cursor:"pointer",letterSpacing:"2px",animation:"fup 1.2s ease"}
          :{padding:"14px 44px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",fontSize:"16px",borderRadius:"50px",cursor:"pointer",boxShadow:"0 8px 32px rgba(124,58,237,0.5)",letterSpacing:"2px",animation:"fup 1.1s ease"}}>✦ {hasSave?"새로 시작":"서클 시작하기"}</button>
      </div>
      {hasSave
        ?<div style={{marginTop:"20px",fontSize:"11px",color:"#555",animation:"fup 1.3s ease"}}>저장됨 · {savedDay}일차{savedLabel?` · ${savedLabel}`:""}</div>
        :<div style={{marginTop:"20px",fontSize:"11px",color:"#333",animation:"fup 1.3s ease"}}>초기 자금 ₩50,000 · 서코 D-30</div>}
      <button onClick={()=>{window.location.hash=window.location.hash==="#mobile"?"":"#mobile";}} style={{marginTop:"18px",background:"transparent",border:"1px dashed #333",color:"#555",fontSize:"11px",padding:"6px 14px",borderRadius:"8px",cursor:"pointer",animation:"fup 1.4s ease"}}>{window.location.hash==="#mobile"?"🖥 가로 데스크톱 모드로":"📱 세로 모바일 모드 (레거시)"}</button>
    </div>
  </div>);
}


export function GenreScreen({state,setState}){
  const g=state.genre;
  const blankChar=()=>({id:"c"+Date.now()+Math.floor(Math.random()*9999),name:"",appearanceTags:[],personalityTags:[],conceptTags:[],position:"",popularity:""});
  const freshDraft=()=>({name:"",media:"",mediaGenre:"",type:"",allcharMode:"",characters:[blankChar()],cp:null,vibes:[],background:"",description:"",nickname:"",birthday:null,famousLine:"",auTags:[]});
  const [editing,setEditing]=useState(!g);
  const [mode,setMode]=useState(g?"edit":"new");
  const [step,setStep]=useState(1);
  const [draft,setDraft]=useState(()=>(g&&g.characters)?{...g}:freshDraft());
  const [eChar,setEChar]=useState(null);

  const upd=(patch)=>setDraft(d=>({...d,...patch}));
  const tArr=(arr,v,max)=>arr.includes(v)?arr.filter(x=>x!==v):(arr.length<max?[...arr,v]:arr);
  const updChar=(id,patch)=>setDraft(d=>({...d,characters:d.characters.map(c=>c.id===id?{...c,...patch}:c)}));
  const togCharTag=(id,field,v,max)=>setDraft(d=>({...d,characters:d.characters.map(c=>c.id===id?{...c,[field]:tArr(c[field],v,max)}:c)}));
  const addChar=()=>{if(draft.characters.length>=5)return;const c=blankChar();setDraft(d=>({...d,characters:[...d.characters,c]}));setEChar(c.id);};
  const delChar=(id)=>setDraft(d=>({...d,characters:d.characters.filter(c=>c.id!==id)}));
  const setCp=(patch)=>setDraft(d=>({...d,cp:{...(d.cp||{type:"고정충",gongId:"",suId:"",fixStrength:"선호 있음",contact:"모름",cpPopularity:"해당없음"}),...patch}}));

  const startEdit=(m)=>{setMode(m);setDraft(m==="edit"&&g&&g.characters?{...g}:freshDraft());setStep(1);setEChar(null);setEditing(true);};
  const named=draft.characters.filter(c=>c.name.trim());
  const goNext=()=>{
    if(step===1&&!draft.media)return;
    if(step===2&&!draft.type)return;
    if(step===3&&!named.length)return;
    if(step===2&&draft.type==="CP"&&!draft.cp)setCp({});
    let ns=step+1;
    if(ns===4&&draft.type!=="CP")ns=5;
    if(ns>6){if(!draft.name.trim())upd({name:generateGenreName(draft)});setStep(7);return;}
    setStep(ns);
  };
  const goBack=()=>{if(step===7){setStep(6);return;}let ps=step-1;if(ps===4&&draft.type!=="CP")ps=3;if(ps<1)return;setStep(ps);};
  const save=()=>{
    const chars=draft.characters.filter(c=>c.name.trim());
    const finalName=(draft.name&&draft.name.trim())||generateGenreName({...draft,characters:chars});
    const base={...draft,characters:chars,name:finalName,...legacyFields({...draft,characters:chars,name:finalName})};
    const assigned=buildNpcRoster(base,30);saveRoster(finalName,assigned);
    setState(s=>{
      if(mode==="edit"&&s.activeGenreId){
        const genres=s.genres.map(g0=>g0.id===s.activeGenreId?{...g0,...base,assignedNPCs:assigned,eventSchedule:g0.eventSchedule&&g0.eventSchedule.length?g0.eventSchedule:generateEventSchedule({...g0,...base},s.day)}:g0);
        const active=genres.find(g0=>g0.id===s.activeGenreId);
        return {...s,genres,genre:active,npcRoster:assigned};
      }
      // 새 장르
      const first=(s.genres||[]).length===0;
      let genres=(s.genres||[]).map(g0=>g0.id===s.activeGenreId?{...g0,fame:s.fame,followers:s.followers,fanTrust:s.fanTrust,engagement:s.engagement,snsHistory:s.snsHistory}:g0);
      const id="genre_"+Date.now();
      const ng={...base,id,createdDay:s.day,isActive:true,fame:0,followers:0,fanTrust:50,engagement:50,assignedNPCs:assigned,imageTicketUsed:0,imageTicketMax:5,eventHistory:[],snsHistory:[]};
      ng.eventSchedule=generateEventSchedule(ng,s.day);
      genres=[...genres,ng];
      const cost=first?{}:{stamina:Math.max(0,(s.stamina||0)-20),mentalHealth:Math.max(0,(s.mentalHealth||0)-10)};
      return {...s,genres,activeGenreId:id,genre:ng,npcRoster:assigned,fame:0,followers:0,fanTrust:50,engagement:50,snsHistory:[],...cost};
    });
    setEditing(false);setStep(1);
  };

  const tagBtns=(list,sel,onTog,col)=>(<div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{list.map(o=>{const v=typeof o==="string"?o:o.t;const lbl=typeof o==="string"?o:`${o.e} ${o.t}`;const on=sel.includes(v);return<button key={v} onClick={()=>onTog(v)} style={{padding:"5px 11px",fontSize:"12px",background:on?col.bg:"#12122a",border:`1px solid ${on?col.bd:"#2a2a4a"}`,color:on?col.fg:"#777",borderRadius:"16px",cursor:"pointer"}}>{lbl}</button>;})}</div>);
  const lbl=(t)=><div style={{fontSize:"12px",color:"#888",marginBottom:"6px",marginTop:"4px"}}>{t}</div>;
  const blue={bg:"#1a2a4a",bd:"#4cc9f0",fg:"#4cc9f0"},purple={bg:"#2a1a4a",bd:"#a855f7",fg:"#c084fc"},pink={bg:"#2a1030",bd:"#e94560",fg:"#ff8fb0"};

  // ── 카드 뷰 ──
  if(!editing&&g)return(<div style={{height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{padding:"16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
        <div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc"}}>🎭 나의 장르 ({(state.genres||[]).length||1}개)</div>
        <div style={{display:"flex",gap:"5px"}}>
          <button onClick={()=>startEdit("edit")} style={{padding:"5px 12px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"6px",cursor:"pointer",fontSize:"12px"}}>수정</button>
          <button onClick={()=>{if(canAddGenre(state))startEdit("new");}} disabled={!canAddGenre(state)} title={!canAddGenre(state)?"최대 5개 / 체력30·멘탈40 필요":""} style={{padding:"5px 12px",background:canAddGenre(state)?"linear-gradient(135deg,#7c3aed,#e94560)":"#1a1a3a",border:"none",color:canAddGenre(state)?"#fff":"#555",borderRadius:"6px",cursor:canAddGenre(state)?"pointer":"not-allowed",fontSize:"12px",fontWeight:"700"}}>＋ 새 장르</button>
        </div>
      </div>
      {(state.genres||[]).length>1&&<div style={{display:"flex",gap:"6px",overflowX:"auto",marginBottom:"12px",paddingBottom:"2px"}}>
        {(state.genres||[]).map(gg=><button key={gg.id} onClick={()=>setState(s=>switchActiveGenre(s,gg.id))} style={{flexShrink:0,padding:"6px 12px",background:gg.id===state.activeGenreId?"#2a1a4a":"#12122a",border:`1px solid ${gg.id===state.activeGenreId?"#7c3aed":"#2a2a4a"}`,color:gg.id===state.activeGenreId?"#c084fc":"#888",borderRadius:"16px",cursor:"pointer",fontSize:"12px",fontWeight:"700",whiteSpace:"nowrap"}}>{gg.name} <span style={{fontSize:"9px",color:"#666"}}>·{(gg.id===state.activeGenreId?state.followers:gg.followers||0)}</span></button>)}
      </div>}
      {!canAddGenre(state)&&(state.genres||[]).length<5&&<div style={{fontSize:"10px",color:"#666",marginBottom:"10px"}}>💤 새 장르를 추가하려면 체력 30·멘탈 40 이상이 필요해요 (추가 시 체력 -20·멘탈 -10)</div>}
      <div style={{background:"linear-gradient(135deg,#12122a,#1a0a2e)",border:"1px solid #7c3aed",borderRadius:"16px",padding:"20px",marginBottom:"16px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-20px",right:"-20px",width:"100px",height:"100px",borderRadius:"50%",background:"radial-gradient(circle,#7c3aed22,transparent)",pointerEvents:"none"}}/>
        <div style={{fontSize:"22px",fontWeight:"900",marginBottom:"6px",color:"#ffd166"}}>{g.name}</div>
        {(g.media||g.type)&&<div style={{fontSize:"11px",color:"#4cc9f0",marginBottom:"8px"}}>{[g.media,g.mediaGenre,g.type].filter(Boolean).join(" · ")}</div>}
        <div style={{fontSize:"12px",color:"#888",marginBottom:"12px"}}>{g.chars}</div>
        {g.cpType&&g.cpType!=="none"&&<div style={{fontSize:"11px",padding:"3px 10px",background:"#2a1a4a",borderRadius:"20px",display:"inline-block",color:"#c084fc",marginBottom:"10px"}}>{CP_TYPES.find(ct=>ct.id===g.cpType)?.label}</div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"12px"}}>{(g.tags||[]).map(t=><span key={t} style={{fontSize:"11px",padding:"3px 10px",background:"#1a2a3a",border:"1px solid #3a5a7a",borderRadius:"20px",color:"#4cc9f0"}}>#{t}</span>)}</div>
        {g.nickname&&<div style={{fontSize:"11px",color:"#ffd166",marginBottom:"6px"}}>💕 애칭: {g.nickname}</div>}
        {g.desc&&<div style={{fontSize:"12px",color:"#aaa",lineHeight:1.7,borderTop:"1px solid #2a2a4a",paddingTop:"10px"}}>{g.desc}</div>}
      </div>
      {(g.characters&&g.characters.length>0)&&<div style={{marginBottom:"14px"}}>{g.characters.map(c=><div key={c.id} style={{padding:"10px 12px",background:"#12122a",border:"1px solid #2a2a4a",borderRadius:"10px",marginBottom:"6px"}}><div style={{fontSize:"13px",fontWeight:"700"}}>{c.name} {c.popularity&&<span style={{fontSize:"10px",color:"#888",fontWeight:"400"}}>· {c.popularity}</span>}</div><div style={{fontSize:"10px",color:"#666",marginTop:"3px"}}>{[...(c.appearanceTags||[]),...(c.personalityTags||[]),...(c.conceptTags||[])].join(" · ")}</div></div>)}</div>}
      <div style={{padding:"12px",background:"#12122a",borderRadius:"10px",border:"1px solid #2a2a4a",fontSize:"12px",color:"#888",lineHeight:1.8}}>💡 장르 정보가 SNS NPC 반응·계정 선택·굿즈 반응에 반영됩니다.</div>
    </div>
  </div>);

  // ── 위저드 ──
  const StepBar=()=>(<div style={{display:"flex",gap:"3px",padding:"10px 12px",background:"#12122a",borderBottom:"1px solid #2a2a4a",position:"sticky",top:0,zIndex:10}}>
    {[["①","매체"],["②","타입"],["③","캐릭터"],["④","CP"],["⑤","분위기"],["⑥","추가"]].map(([n,l],i)=>{const sn=i+1;const cpStep=sn===4;const dim=cpStep&&draft.type!=="CP";const cur=step===sn;return<div key={sn} style={{flex:1,textAlign:"center",padding:"4px 2px",borderRadius:"7px",background:cur?"#2a1a4a":"transparent",opacity:dim?0.35:1}}><div style={{fontSize:"13px",color:cur?"#c084fc":"#666"}}>{n}</div><div style={{fontSize:"8px",color:cur?"#c084fc":"#555",fontWeight:"700"}}>{l}</div></div>;})}
  </div>);
  const navBar=(canNext,nextLabel)=>(<div style={{display:"flex",gap:"8px",padding:"12px 14px",borderTop:"1px solid #2a2a4a",background:"#12122a",position:"sticky",bottom:0}}>
    <button onClick={goBack} disabled={step===1} style={{flex:1,padding:"11px",background:"transparent",border:"1px solid #3a3a6a",color:step===1?"#444":"#888",borderRadius:"10px",cursor:step===1?"not-allowed":"pointer",fontSize:"13px"}}>← 뒤로</button>
    {(step>=5&&step<=6)&&<button onClick={goNext} style={{flex:1,padding:"11px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"10px",cursor:"pointer",fontSize:"13px"}}>건너뛰기</button>}
    <button onClick={goNext} disabled={!canNext} style={{flex:2,padding:"11px",background:canNext?"linear-gradient(135deg,#7c3aed,#e94560)":"#1a1a3a",border:"none",color:canNext?"#fff":"#555",fontWeight:"700",fontSize:"13px",borderRadius:"10px",cursor:canNext?"pointer":"not-allowed"}}>{nextLabel||"다음 →"}</button>
  </div>);

  let body=null,canNext=true,nextLabel="다음 →";
  if(step===1){canNext=!!draft.media;const subs=MEDIA_GENRES[draft.media];
    body=<><div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc",marginBottom:"4px"}}>어떤 작품 분위기인가요?</div><div style={{fontSize:"11px",color:"#666",marginBottom:"14px"}}>실제 원작이 없어도 세계관 느낌으로 골라요</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"16px"}}>{MEDIA_LIST.map(m=><button key={m} onClick={()=>upd({media:m,mediaGenre:""})} style={{padding:"16px 6px",background:draft.media===m?"linear-gradient(135deg,#7c3aed,#e94560)":"#12122a",border:`1px solid ${draft.media===m?"#a855f7":"#2a2a4a"}`,color:draft.media===m?"#fff":"#aaa",borderRadius:"12px",cursor:"pointer",fontSize:"13px",fontWeight:"700"}}>{m}</button>)}</div>
      {subs&&<><div style={{fontSize:"12px",color:"#ffd166",marginBottom:"8px"}}>세부 장르</div><div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{subs.map(s=><button key={s} onClick={()=>upd({mediaGenre:s})} style={{padding:"6px 13px",fontSize:"12px",background:draft.mediaGenre===s?"#1a2a4a":"#12122a",border:`1px solid ${draft.mediaGenre===s?"#4cc9f0":"#2a2a4a"}`,color:draft.mediaGenre===s?"#4cc9f0":"#777",borderRadius:"16px",cursor:"pointer"}}>{s}</button>)}</div></>}</>;
  } else if(step===2){canNext=!!draft.type;
    body=<><div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc",marginBottom:"14px"}}>장르 타입</div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"14px"}}>{GTYPE_LIST.map(o=><button key={o.v} onClick={()=>upd({type:o.v,cp:o.v==="CP"?(draft.cp||{type:"고정충",gongId:"",suId:"",fixStrength:"선호 있음",contact:"모름",cpPopularity:"해당없음"}):null})} style={{padding:"14px",textAlign:"left",background:draft.type===o.v?"#2a1a4a":"#12122a",border:`1px solid ${draft.type===o.v?"#7c3aed":"#2a2a4a"}`,borderRadius:"12px",cursor:"pointer",color:draft.type===o.v?"#c084fc":"#aaa"}}><div style={{fontSize:"14px",fontWeight:"700"}}>{draft.type===o.v?"● ":"○ "}{o.v}</div><div style={{fontSize:"11px",color:"#777",marginTop:"2px",marginLeft:"16px"}}>{o.d}</div></button>)}</div>
      {draft.type==="올캐"&&<><div style={{fontSize:"12px",color:"#ffd166",marginBottom:"8px"}}>올캐 세부</div><div style={{display:"flex",flexDirection:"column",gap:"6px"}}>{ALLCHAR_MODES.map(m=><button key={m} onClick={()=>upd({allcharMode:m})} style={{padding:"9px 12px",textAlign:"left",background:draft.allcharMode===m?"#1a2a4a":"#12122a",border:`1px solid ${draft.allcharMode===m?"#4cc9f0":"#2a2a4a"}`,color:draft.allcharMode===m?"#4cc9f0":"#777",borderRadius:"8px",cursor:"pointer",fontSize:"12px"}}>{m}</button>)}</div></>}</>;
  } else if(step===3){canNext=!!named.length;
    body=<><div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc",marginBottom:"4px"}}>캐릭터 등록 ({draft.characters.length}/5)</div><div style={{fontSize:"11px",color:"#666",marginBottom:"14px"}}>게임 속에선 전부 공식 캐릭터예요</div>
      {draft.characters.map((c)=>(<div key={c.id} style={{marginBottom:"8px",background:"#12122a",border:`1px solid ${eChar===c.id?"#7c3aed":"#2a2a4a"}`,borderRadius:"12px",overflow:"hidden"}}>
        <div style={{display:"flex",gap:"8px",alignItems:"center",padding:"10px 12px"}}>
          <input value={c.name} onChange={e=>updChar(c.id,{name:e.target.value})} placeholder="캐릭터 이름 *" style={{flex:1,padding:"8px 10px",background:"#0d0d22",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"7px",fontSize:"13px",boxSizing:"border-box"}}/>
          <button onClick={()=>setEChar(eChar===c.id?null:c.id)} style={{padding:"6px 10px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#c084fc",borderRadius:"6px",cursor:"pointer",fontSize:"11px"}}>{eChar===c.id?"접기":"태그▾"}</button>
          {draft.characters.length>1&&<button onClick={()=>{delChar(c.id);if(eChar===c.id)setEChar(null);}} style={{padding:"6px 8px",background:"transparent",border:"none",color:"#e94560",cursor:"pointer",fontSize:"13px"}}>🗑</button>}
        </div>
        {eChar===c.id&&<div style={{padding:"4px 12px 12px",borderTop:"1px solid #2a2a4a",background:"#0d0d22"}}>
          {lbl(`외형 (${c.appearanceTags.length}/5)`)}{tagBtns(APPEARANCE_TAGS,c.appearanceTags,v=>togCharTag(c.id,"appearanceTags",v,5),blue)}
          {lbl(`성격 (${c.personalityTags.length}/3)`)}{tagBtns(PERSONALITY_TAGS,c.personalityTags,v=>togCharTag(c.id,"personalityTags",v,3),purple)}
          {lbl(`컨셉 (${c.conceptTags.length}/3)`)}{tagBtns(CONCEPT_TAGS,c.conceptTags,v=>togCharTag(c.id,"conceptTags",v,3),pink)}
          {lbl("원작 내 포지션")}{tagBtns(POSITION_TAGS,c.position?[c.position]:[],v=>updChar(c.id,{position:c.position===v?"":v}),blue)}
          {lbl("팬덤 규모")}{tagBtns(POPULARITY_TAGS,c.popularity?[c.popularity]:[],v=>updChar(c.id,{popularity:c.popularity===v?"":v}),purple)}
          {c.popularity&&<div style={{fontSize:"10px",color:"#666",marginTop:"5px"}}>ℹ️ {POP_TIP[c.popularity]}</div>}
        </div>}
      </div>))}
      {draft.characters.length<5&&<button onClick={addChar} style={{width:"100%",padding:"11px",background:"#1a1a3a",border:"1px dashed #3a3a6a",color:"#c084fc",borderRadius:"10px",cursor:"pointer",fontSize:"13px"}}>＋ 캐릭터 추가</button>}</>;
  } else if(step===4){const cp=draft.cp||{};canNext=!!cp.type;
    body=<><div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc",marginBottom:"14px"}}>CP 설정</div>
      {lbl("CP 유형")}<div style={{display:"flex",gap:"6px",marginBottom:"4px"}}>{CP_FIX.map(v=><button key={v} onClick={()=>setCp({type:v})} style={{flex:1,padding:"9px 4px",background:cp.type===v?"#2a1a4a":"#12122a",border:`1px solid ${cp.type===v?"#7c3aed":"#2a2a4a"}`,color:cp.type===v?"#c084fc":"#777",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>{v}</button>)}</div>
      {cp.type==="고정충"&&<>{lbl("누가 공인가요?")}<div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{named.map(c=><button key={c.id} onClick={()=>setCp({gongId:c.id,suId:cp.suId===c.id?"":cp.suId})} style={{padding:"6px 12px",background:cp.gongId===c.id?"#1a2a4a":"#12122a",border:`1px solid ${cp.gongId===c.id?"#4cc9f0":"#2a2a4a"}`,color:cp.gongId===c.id?"#4cc9f0":"#777",borderRadius:"16px",cursor:"pointer",fontSize:"12px"}}>{c.name||"이름없음"}</button>)}</div></>}
      {lbl("CP 상대(수)는?")}<div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>{named.filter(c=>c.id!==cp.gongId).map(c=><button key={c.id} onClick={()=>setCp({suId:c.id})} style={{padding:"6px 12px",background:cp.suId===c.id?"#2a1030":"#12122a",border:`1px solid ${cp.suId===c.id?"#e94560":"#2a2a4a"}`,color:cp.suId===c.id?"#ff8fb0":"#777",borderRadius:"16px",cursor:"pointer",fontSize:"12px"}}>{c.name||"이름없음"}</button>)}<button onClick={()=>setCp({suId:"dream"})} style={{padding:"6px 12px",background:cp.suId==="dream"?"#2a1030":"#12122a",border:`1px solid ${cp.suId==="dream"?"#e94560":"#2a2a4a"}`,color:cp.suId==="dream"?"#ff8fb0":"#777",borderRadius:"16px",cursor:"pointer",fontSize:"12px"}}>드림/불특정</button></div>
      {lbl("고집 강도")}{tagBtns(CP_STRENGTH,cp.fixStrength?[cp.fixStrength]:[],v=>setCp({fixStrength:v}),purple)}
      {lbl("원작 접점")}{tagBtns(CP_CONTACT,cp.contact?[cp.contact]:[],v=>setCp({contact:v}),blue)}
      {lbl("팬덤 내 CP 위치")}{tagBtns(CP_POP,cp.cpPopularity?[cp.cpPopularity]:[],v=>setCp({cpPopularity:v}),pink)}
      {cp.cpPopularity==="나 혼자 파는 중"&&<div style={{fontSize:"10px",color:"#666",marginTop:"5px"}}>ℹ️ 심해어·혼자 파는 NPC 비율이 늘어나요</div>}</>;
  } else if(step===5){
    body=<><div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc",marginBottom:"14px"}}>세계관 분위기</div>
      {lbl(`분위기 태그 (${draft.vibes.length}/3)`)}{tagBtns(VIBE_TAGS,draft.vibes,v=>upd({vibes:tArr(draft.vibes,v,3)}),pink)}
      {lbl("배경")}{tagBtns(BG_TAGS,draft.background?[draft.background]:[],v=>upd({background:draft.background===v?"":v}),blue)}
      {lbl(`자유 설명 (${(draft.description||"").length}/300, 선택)`)}<textarea value={draft.description} onChange={e=>upd({description:e.target.value.slice(0,300)})} rows={4} placeholder="세계관 설명, 특이한 설정, NPC가 기억해줬으면 하는 것" style={{width:"100%",padding:"10px 12px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"13px",resize:"none",boxSizing:"border-box",lineHeight:1.7}}/></>;
  } else if(step===6){
    body=<><div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc",marginBottom:"4px"}}>추가 정보</div><div style={{fontSize:"11px",color:"#666",marginBottom:"14px"}}>전부 선택사항 · 나중에 추가 가능</div>
      {lbl("팬덤 애칭/별명")}<input value={draft.nickname} onChange={e=>upd({nickname:e.target.value})} placeholder="예: 말랭이, 용룡" style={{width:"100%",padding:"9px 11px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"13px",boxSizing:"border-box"}}/>
      {lbl("생일 (생일카페 이벤트 트리거)")}<div style={{display:"flex",gap:"8px"}}>
        <select value={draft.birthday?draft.birthday.month:""} onChange={e=>upd({birthday:{month:Number(e.target.value)||null,day:draft.birthday?draft.birthday.day:null}})} style={{flex:1,padding:"9px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"13px"}}><option value="">월</option>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
        <select value={draft.birthday?draft.birthday.day:""} onChange={e=>upd({birthday:{month:draft.birthday?draft.birthday.month:null,day:Number(e.target.value)||null}})} style={{flex:1,padding:"9px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"13px"}}><option value="">일</option>{Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}일</option>)}</select>
      </div>
      {lbl("대표 명대사 (SNS 인용에 사용)")}<input value={draft.famousLine} onChange={e=>upd({famousLine:e.target.value})} placeholder="기억에 남는 대사" style={{width:"100%",padding:"9px 11px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"13px",boxSizing:"border-box"}}/>
      {lbl(`대표 AU 설정 (${draft.auTags.length}/2)`)}{tagBtns(AU_TAGS,draft.auTags,v=>upd({auTags:tArr(draft.auTags,v,2)}),purple)}</>;
  } else if(step===7){nextLabel="✦ 저장 → NPC 생성";
    body=<><div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc",marginBottom:"14px"}}>완성! 확인해주세요</div>
      {lbl("장르명 (수정 가능)")}<input value={draft.name} onChange={e=>upd({name:e.target.value})} style={{width:"100%",padding:"10px 12px",background:"#12122a",border:"1px solid #7c3aed",color:"#ffd166",borderRadius:"8px",fontSize:"15px",fontWeight:"700",boxSizing:"border-box",marginBottom:"12px"}}/>
      <div style={{background:"linear-gradient(135deg,#12122a,#1a0a2e)",border:"1px solid #7c3aed",borderRadius:"14px",padding:"16px"}}>
        <div style={{fontSize:"11px",color:"#4cc9f0",marginBottom:"8px"}}>{[draft.media,draft.mediaGenre,draft.type].filter(Boolean).join(" · ")}</div>
        {named.map(c=><div key={c.id} style={{fontSize:"13px",marginBottom:"4px"}}>👤 {c.name} <span style={{fontSize:"10px",color:"#888"}}>{c.popularity} {c.position}</span></div>)}
        {draft.cp&&draft.type==="CP"&&<div style={{fontSize:"11px",color:"#c084fc",marginTop:"6px"}}>CP: {draft.cp.type} · {draft.cp.cpPopularity}</div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginTop:"8px"}}>{draft.vibes.map(v=><span key={v} style={{fontSize:"11px",padding:"2px 9px",background:"#2a1030",borderRadius:"14px",color:"#ff8fb0"}}>{v}</span>)}{draft.auTags.map(v=><span key={v} style={{fontSize:"11px",padding:"2px 9px",background:"#2a1a4a",borderRadius:"14px",color:"#c084fc"}}>{v}</span>)}</div>
        {draft.description&&<div style={{fontSize:"11px",color:"#aaa",marginTop:"10px",lineHeight:1.6}}>{draft.description}</div>}
      </div>
      <div style={{fontSize:"11px",color:"#666",marginTop:"10px",textAlign:"center"}}>저장하면 이 장르에 맞는 NPC 15명이 생성돼요</div></>;
  }

  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <StepBar/>
    <div style={{flex:1,overflow:"auto",padding:"16px"}}>{body}</div>
    {step===7?<div style={{display:"flex",gap:"8px",padding:"12px 14px",borderTop:"1px solid #2a2a4a",background:"#12122a"}}><button onClick={goBack} style={{flex:1,padding:"11px",background:"transparent",border:"1px solid #3a3a6a",color:"#888",borderRadius:"10px",cursor:"pointer",fontSize:"13px"}}>← 뒤로</button><button onClick={save} disabled={!draft.name.trim()} style={{flex:2,padding:"11px",background:draft.name.trim()?"linear-gradient(135deg,#7c3aed,#e94560)":"#1a1a3a",border:"none",color:draft.name.trim()?"#fff":"#555",fontWeight:"700",fontSize:"14px",borderRadius:"10px",cursor:draft.name.trim()?"pointer":"not-allowed"}}>✦ 저장 → NPC 생성</button></div>:navBar(canNext,nextLabel)}
  </div>);
}


export function SNSScreen({state,setState,onOpenProfile}){
  const [loading,setLoading]=useState(false);
  const [banner,setBanner]=useState(null);
  const {fame,followers,following,genre,profile}=state;
  const tier=followers<10?{name:"무명",color:"#555",emoji:"🌑"}:followers<50?{name:"새싹",color:"#06d6a0",emoji:"🌱"}:followers<200?{name:"로컬",color:"#4cc9f0",emoji:"💧"}:followers<500?{name:"중견",color:"#ffd166",emoji:"⭐"}:followers<1000?{name:"핫작가",color:"#e94560",emoji:"🔥"}:{name:"레전드",color:"#c084fc",emoji:"👑"};
  const [bmarked,setBmarked]=useState({});
  const [feedTab,setFeedTab]=useState("all");
  const genresArr=state.genres||[];
  const multiG=genresArr.length>1;
  const tagFeed=(arr,gn)=>(arr||[]).map(p=>p._g?p:{...p,_g:gn});
  let feed;
  if(!multiG||feedTab==="all"){const an=(genre&&genre.name)||"";let all=tagFeed(state.snsHistory,an);genresArr.forEach(g=>{if(g.id!==state.activeGenreId)all=all.concat(tagFeed(g.snsHistory,g.name));});feed=all.sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,60);}
  else feed=tagFeed(state.snsHistory,(genre&&genre.name)||"");
  const ctx=()=>({genre:genre&&genre.name,character:genre&&genre.chars});
  useEffect(()=>{prefetchImages(ctx(),3);},[]);
  const refresh=async()=>{
    if(loading)return;setLoading(true);setBanner(null);
    setState(s=>({...s,flags:{...s.flags,recentPost:true}}));
    await new Promise(r=>setTimeout(r,550));
    const ts=new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
    const upd=makeTimelineUpdate(state);
    let posts=upd.hasNew?[...upd.posts]:[];
    if(Math.random()<0.7){const img=await popFromPool();if(img){
      const typeMap={cosplay:"cosplayer",goods_haul:"goods_collector",itabag:"goods_collector",doujin_shelf:"reviewer"};
      const roster=getRoster(state);let poster=null;
      if(roster){const want=typeMap[img.eventType];const cands=roster.filter(a=>a.type===want&&rosterEligible(a,state));if(cands.length)poster=pickOne(cands);}
      const fan=poster||FAN_ACCOUNTS.find(f=>f.eventType===img.eventType)||pickOne(FAN_ACCOUNTS);
      posts=[{id:Date.now()+Math.random(),from:fan.handle,name:poster?fan.name:undefined,avatar:fan.avatar,isFan:true,imageUrl:img.dataUrl,text:poster?npcPostText(poster,state,["cosplay_image_event","event_day","event_after"]):fanPostText(fan,state),likes:5+Math.floor(Math.random()*60),rt:Math.floor(Math.random()*25),followerDelta:0,mood:"good",timestamp:ts},...posts];
    }}
    if(posts.length){const delta=posts.reduce((a,p)=>a+(p.followerDelta||0),0);setState(s=>({...s,followers:Math.max(0,s.followers+delta),snsHistory:[...posts,...(s.snsHistory||[])].slice(0,40)}));setBanner({type:"new",n:posts.length});}
    else setBanner({type:"none"});
    prefetchImages(ctx(),3);
    setLoading(false);
  };
  const saveBookmark=async(post)=>{await idbPut("bookmarks",{id:String(post.id),imageUrl:post.imageUrl,from:post.from,avatar:post.avatar,text:post.text,savedAt:Date.now()});setBmarked(b=>({...b,[post.id]:true}));};
  const myHandle=(profile&&profile.handle&&profile.handle!=="@")?profile.handle:"@미설정";
  const myName=(profile&&profile.displayName)||"이름 없음";
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{padding:"12px 14px",background:"#12122a",borderBottom:"1px solid #2a2a4a",flexShrink:0}}>
      <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"8px"}}>
        <div style={{width:"42px",height:"42px",borderRadius:"50%",overflow:"hidden",background:"#2a2a4a",border:"2px solid #7c3aed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{profile&&profile.avatarData?<img src={profile.avatarData} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"20px"}}>👤</span>}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"14px",fontWeight:"700",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{myName}</div>
          <div style={{fontSize:"11px",color:"#888"}}>{myHandle}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px",flexShrink:0}}>
          <div style={{fontSize:"12px",color:tier.color,fontWeight:"700"}}>{tier.emoji} {tier.name}</div>
          {onOpenProfile&&<button onClick={onOpenProfile} style={{padding:"3px 9px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#c084fc",borderRadius:"14px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>내 계정 ✎</button>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"6px"}}>
        {[{label:"팔로워",value:followers.toLocaleString()},{label:"팔로잉",value:(following||0).toLocaleString()},{label:"인지도",value:fame+"pt"},{label:"장르",value:genre?genre.name:"미설정"}].map(({label,value})=><div key={label} style={{textAlign:"center",padding:"6px 2px",background:"#1a1a3a",borderRadius:"8px"}}><div style={{fontSize:"9px",color:"#555"}}>{label}</div><div style={{fontSize:"11px",fontWeight:"700",color:"#c084fc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div></div>)}
      </div>
    </div>
    {banner&&<div style={{padding:"8px 14px",fontSize:"12px",fontWeight:"700",textAlign:"center",background:banner.type==="new"?"#0a2a1a":"#161628",color:banner.type==="new"?"#06d6a0":"#888",borderBottom:"1px solid #2a2a4a"}}>{banner.type==="new"?`🆕 ${banner.n}개의 새 소식`:"방금 확인했어요 ✓"}</div>}
    {multiG&&<div style={{display:"flex",gap:"6px",overflowX:"auto",padding:"8px 12px",background:"#0f0f24",borderBottom:"1px solid #2a2a4a",flexShrink:0}}>
      <button onClick={()=>setFeedTab("all")} style={{flexShrink:0,padding:"5px 12px",background:feedTab==="all"?"#2a1a4a":"#12122a",border:`1px solid ${feedTab==="all"?"#7c3aed":"#2a2a4a"}`,color:feedTab==="all"?"#c084fc":"#888",borderRadius:"16px",cursor:"pointer",fontSize:"12px",fontWeight:"700",whiteSpace:"nowrap"}}>🌐 전체</button>
      {genresArr.map(gg=><button key={gg.id} onClick={()=>{setState(s=>switchActiveGenre(s,gg.id));setFeedTab(gg.id);}} style={{flexShrink:0,padding:"5px 12px",background:feedTab===gg.id?"#2a1a4a":"#12122a",border:`1px solid ${feedTab===gg.id?"#7c3aed":"#2a2a4a"}`,color:feedTab===gg.id?"#c084fc":"#888",borderRadius:"16px",cursor:"pointer",fontSize:"12px",fontWeight:"700",whiteSpace:"nowrap"}}>{gg.name}</button>)}
    </div>}
    <div style={{flex:1,overflow:"auto",padding:"10px 12px"}}>
      {!genre&&<div style={{padding:"12px",background:"#1a1a2e",border:"1px solid #3a3a6a",borderRadius:"10px",marginBottom:"10px",fontSize:"12px",color:"#888",textAlign:"center"}}>장르 탭에서 장르를 만들면<br/>더 실감나는 SNS 반응이 생성됩니다</div>}
      {(profile&&(!profile.handle||profile.handle==="@"))&&<div style={{padding:"10px 12px",background:"#1a1a2e",border:"1px solid #3a3a6a",borderRadius:"10px",marginBottom:"10px",fontSize:"12px",color:"#888",textAlign:"center"}}>👤 내계정 탭에서 프로필을 만들면<br/>내 포스트에 반영됩니다</div>}
      {followers===0&&feed.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:"#444"}}><div style={{fontSize:"32px",marginBottom:"8px"}}>🦗</div><div style={{fontSize:"13px"}}>아직 조용하네요...</div><div style={{fontSize:"11px",marginTop:"4px",color:"#333"}}>새로고침으로 소식을 확인해보세요</div></div>}
      {feed.map(post=><div key={post.id} style={{padding:"12px",marginBottom:"8px",background:post.isMine?"#161033":"#12122a",borderRadius:"12px",border:`1px solid ${post.isMine?"#7c3aed":post.mood==="great"?"#ffd16644":post.mood==="good"?"#06d6a044":post.mood==="bad"?"#e9456044":"#2a2a4a"}`}}>
        <div style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
          <div style={{width:"36px",height:"36px",borderRadius:"50%",overflow:"hidden",background:"#2a2a4a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>{post.isMine&&profile&&profile.avatarData?<img src={profile.avatarData} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{post.avatar||"👤"}</span>}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
              <div style={{fontSize:"12px",fontWeight:"700",color:post.isMine?"#ffd166":"#c084fc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{post.name?post.name:post.from}{post.official&&<span style={{color:"#4cc9f0"}}> ✔</span>}{post.name&&<span style={{color:"#555",fontWeight:"400"}}> {post.from}</span>}{post.isMine&&<span style={{color:"#7c3aed"}}> · 나</span>}</div>
              <div style={{display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>{feedTab==="all"&&multiG&&post._g&&<span style={{fontSize:"8px",padding:"1px 6px",background:"#1a2a4a",borderRadius:"8px",color:"#4cc9f0"}}>{post._g}</span>}<span style={{fontSize:"10px",color:"#444"}}>{post.timestamp}</span></div>
            </div>
            <div style={{fontSize:"13px",lineHeight:1.6,wordBreak:"break-all"}}>{post.text}</div>
            {post.imageUrl&&<img src={post.imageUrl} style={{width:"100%",borderRadius:"10px",marginTop:"8px",display:"block",border:"1px solid #2a2a4a"}}/>}
            <div style={{display:"flex",gap:"12px",marginTop:"8px",alignItems:"center"}}>
              <span style={{fontSize:"11px",color:"#e94560"}}>♥ {(post.likes||0).toLocaleString()}</span>
              <span style={{fontSize:"11px",color:"#4cc9f0"}}>🔁 {(post.rt||0).toLocaleString()}</span>
              {post.followerDelta!==0&&<span style={{fontSize:"11px",color:post.followerDelta>0?"#06d6a0":"#e94560",fontWeight:"700"}}>{post.followerDelta>0?"↑":"↓"} {Math.abs(post.followerDelta)}명</span>}
              {post.imageUrl&&<button onClick={()=>saveBookmark(post)} style={{marginLeft:"auto",padding:"3px 9px",background:bmarked[post.id]?"#2a1a4a":"#1a1a3a",border:`1px solid ${bmarked[post.id]?"#c084fc":"#3a3a6a"}`,color:bmarked[post.id]?"#c084fc":"#888",borderRadius:"12px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>{bmarked[post.id]?"🔖 저장됨":"🔖 북마크"}</button>}
            </div>
          </div>
        </div>
      </div>)}
    </div>
    <div style={{padding:"10px 12px",background:"#12122a",borderTop:"1px solid #2a2a4a",flexShrink:0}}>
      <button onClick={refresh} disabled={loading} style={{width:"100%",padding:"12px",background:loading?"#1a1a3a":"linear-gradient(135deg,#4cc9f0,#7c3aed)",border:"none",color:loading?"#555":"#fff",fontWeight:"700",fontSize:"14px",borderRadius:"10px",cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 16px rgba(76,201,240,0.3)"}}>{loading?"⏳ 새 소식 확인 중...":"🔄 새로고침 (새 소식 확인)"}</button>
    </div>
  </div>);
}

export function ProfileScreen({state,setState}){
  const p=state.profile||{handle:"@",displayName:"",bio:"",avatarData:null,joinedDay:1};
  const [form,setForm]=useState(p);
  const [drawing,setDrawing]=useState(false);
  const [saved,setSaved]=useState(false);
  useEffect(()=>{setForm(state.profile||{handle:"@",displayName:"",bio:"",avatarData:null,joinedDay:1});},[state.profile]);
  const save=()=>{let handle=(form.handle||"").trim();if(!handle.startsWith("@"))handle="@"+handle;setState(s=>({...s,profile:{...form,handle,joinedDay:form.joinedDay||s.day}}));setSaved(true);setTimeout(()=>setSaved(false),1600);};
  if(drawing)return<DrawingApp goodsType={{name:"프로필 아바타",id:"avatar"}} onComplete={img=>{setForm(f=>({...f,avatarData:img}));setDrawing(false);}} onCancel={()=>setDrawing(false)}/>;
  return(<div style={{height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{padding:"16px"}}>
      <div style={{fontSize:"15px",fontWeight:"700",color:"#c084fc",marginBottom:"16px"}}>👤 내 계정 설정</div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:"18px"}}>
        <div style={{width:"96px",height:"96px",borderRadius:"50%",overflow:"hidden",background:"#1a1a3a",border:"3px solid #7c3aed",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"8px"}}>{form.avatarData?<img src={form.avatarData} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"40px"}}>👤</span>}</div>
        <button onClick={()=>setDrawing(true)} style={{padding:"7px 16px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",borderRadius:"20px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>✏️ 아바타 그리기</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
        <div>
          <div style={{fontSize:"12px",color:"#888",marginBottom:"6px"}}>계정명 (핸들)</div>
          <input value={form.handle} onChange={e=>setForm(f=>({...f,handle:e.target.value}))} placeholder="@mycircle" style={{width:"100%",padding:"10px 12px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"14px",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{fontSize:"12px",color:"#888",marginBottom:"6px"}}>표시 이름</div>
          <input value={form.displayName} onChange={e=>setForm(f=>({...f,displayName:e.target.value}))} placeholder="예: 이브의 작업실" style={{width:"100%",padding:"10px 12px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"14px",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{fontSize:"12px",color:"#888",marginBottom:"6px"}}>한줄 소개 ({(form.bio||"").length}/50)</div>
          <input value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value.slice(0,50)}))} placeholder="자캐러 / 달달한 거 좋아해요" style={{width:"100%",padding:"10px 12px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"13px",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#666",padding:"4px 2px"}}><span>가입일</span><span>Day {form.joinedDay||state.day}부터</span></div>
        <button onClick={save} style={{padding:"13px",background:saved?"#06d6a0":"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",fontSize:"15px",borderRadius:"12px",cursor:"pointer",boxShadow:"0 4px 20px rgba(124,58,237,0.4)"}}>{saved?"✓ 저장됨!":"✦ 프로필 저장"}</button>
        <div style={{padding:"12px",background:"#12122a",borderRadius:"10px",border:"1px solid #2a2a4a",fontSize:"12px",color:"#888",lineHeight:1.8}}>💡 저장하면 SNS 탭 상단과 내 포스트에 프로필이 반영돼요. 아바타는 그림 앱(레이어 포함)으로 직접 그립니다.</div>
      </div>
    </div>
  </div>);
}

export function DailyScreen({state,setState}){
  const [log,setLog]=useState([]);
  const eventDay=isEventDay(state);
  const used=state.actionsToday||0;
  const phase=eventDay?{l:"🎪 행사 당일",c:"#e94560"}:used===0?{l:"🌅 오전",c:"#ffd166"}:used===1?{l:"☀️ 오후",c:"#ffd166"}:{l:"🌆 저녁 · 자유시간",c:"#4cc9f0"};
  const nextEv=nearestUpcomingEvent(state);
  const doAction=(action)=>{
    if(eventDay){setLog(l=>[{text:"🎪 행사 당일엔 행동할 수 없어요. 행사장 탭에서 참가하세요!",type:"bad",id:Date.now()},...l]);return;}
    if(used>=ACT_MAX){setLog(l=>[{text:"오늘 행동을 다 썼어요. 🌙 취침으로 다음 날로 넘기세요!",type:"neutral",id:Date.now()},...l]);return;}
    if(action.id==="official"||action.id==="newgoods"){if(Math.random()>0.4){setLog(l=>[{text:`${action.icon} 오늘은 ${action.name}이 없네... 내일 다시!`,type:"neutral",id:Date.now()},...l]);return;}}
    if(state.gold+action.gold<0){setLog(l=>[{text:`💸 돈 부족 (${action.name}: ₩${Math.abs(action.gold).toLocaleString()} 필요)`,type:"bad",id:Date.now()},...l]);return;}
    setState(s=>{let ns={...s,stamina:Math.max(0,Math.min(100,s.stamina+action.stamina)),mentalHealth:Math.max(0,Math.min(100,s.mentalHealth+action.mental)),actionsToday:(s.actionsToday||0)+1,imageTicket:action.id==="sleep"?Math.min(9,(s.imageTicket||0)+1):s.imageTicket};if(action.gold)ns=logTx(ns,action.gold,action.name,action.icon);return ns;});
    if(action.id==="sleep")prefetchImages({genre:state.genre&&state.genre.name,character:state.genre&&state.genre.chars},5);
    const msg=[`${action.icon} ${action.name}`,action.stamina!==0?`체력 ${action.stamina>0?"+":""}${action.stamina}%`:null,action.mental!==0?`멘탈 ${action.mental>0?"+":""}${action.mental}%`:null,action.gold!==0?`₩${action.gold.toLocaleString()}`:null].filter(Boolean).join(" · ");
    setLog(l=>[{text:msg,sub:action.desc,type:action.stamina>0||action.mental>0?"good":"neutral",id:Date.now()},...l]);
  };
  const sleep=()=>{
    if(eventDay){setLog(l=>[{text:"🎪 행사 당일엔 잘 수 없어요. 행사를 먼저 치르세요!",type:"bad",id:Date.now()},...l]);return;}
    const nd=state.day+1;const completed=(state.orders||[]).filter(o=>o.status==="making"&&o.readyDay<=nd);
    setState(s=>advanceDay({...s,stamina:Math.min(100,s.stamina+5),mentalHealth:Math.min(100,s.mentalHealth+5)}));
    setLog(l=>[{text:`🌙 Day ${nd} 시작! (체력·멘탈 +5)${completed.length?` 🏭 굿즈 ${completed.length}건 완성!`:""}`,sub:completed.length?"굿즈팩토리 재고에 추가됐어요":"푹 잤다",type:completed.length?"good":"neutral",id:Date.now()},...l]);
  };
  return(<div style={{height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{padding:"12px 14px",background:"#12122a",borderBottom:"1px solid #2a2a4a",position:"sticky",top:0,zIndex:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}><div style={{fontSize:"14px",fontWeight:"700",color:"#c084fc"}}>🌙 일상</div><div style={{fontSize:"11px",color:phase.c,fontWeight:"700"}}>Day {state.day} · {phase.l}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"5px"}}>
        {[{l:"💰",v:`₩${state.gold.toLocaleString()}`},{l:"⚡",v:`${state.stamina}%`,c:state.stamina<30?"#e94560":state.stamina<60?"#ffd166":"#06d6a0"},{l:"🧠",v:`${state.mentalHealth}%`,c:state.mentalHealth<30?"#e94560":state.mentalHealth<60?"#ffd166":"#06d6a0"},{l:"✨",v:`${state.fame}pt`}].map(({l,v,c="#c084fc"})=><div key={l} style={{textAlign:"center",padding:"5px 2px",background:"#1a1a3a",borderRadius:"7px"}}><div style={{fontSize:"12px"}}>{l}</div><div style={{fontSize:"10px",fontWeight:"700",color:c}}>{v}</div></div>)}
      </div>
      {[{val:state.stamina,c:"#06d6a0",label:"체력"},{val:state.mentalHealth,c:"#c084fc",label:"멘탈"}].map(({val,c,label})=><div key={label} style={{marginTop:"5px"}}><div style={{display:"flex",justifyContent:"space-between",fontSize:"9px",color:"#555",marginBottom:"2px"}}><span>{label}</span><span>{val}%</span></div><div style={{height:"4px",background:"#1a1a3a",borderRadius:"2px",overflow:"hidden"}}><div style={{height:"100%",width:`${val}%`,background:c,transition:"width 0.4s",borderRadius:"2px"}}/></div></div>)}
    </div>
    <div style={{padding:"14px"}}>
      {eventDay&&<div style={{padding:"12px",background:"linear-gradient(135deg,#2a0a2e,#3a0a1a)",border:"1px solid #e94560",borderRadius:"10px",marginBottom:"12px",fontSize:"13px",color:"#ff8fb0",lineHeight:1.7,fontWeight:"700",textAlign:"center"}}>🎪 오늘은 <b>{state.activeEvent&&state.activeEvent.name}</b> 당일!<br/><span style={{fontSize:"11px",color:"#e94560",fontWeight:"400"}}>행사장 탭에서 부스를 열고 참가하세요</span></div>}
      {nextEv&&!eventDay&&<div style={{padding:"9px 12px",background:"#12122a",border:"1px solid #2a2a4a",borderRadius:"8px",marginBottom:"12px",fontSize:"11px",color:"#888"}}>📅 다음 행사: <b style={{color:"#c084fc"}}>{nextEv.name}</b> D-{nextEv.startDay-state.day}</div>}
      {(state.stamina<30||state.mentalHealth<30)&&<div style={{padding:"10px 12px",background:"#2a0a0a",border:"1px solid #e94560",borderRadius:"8px",marginBottom:"12px",fontSize:"12px",color:"#e94560",lineHeight:1.7}}>⚠️ {state.stamina<30?"체력이 위험해요! ":""}{state.mentalHealth<30?"멘탈이 바닥났어요!":""}<br/>행사 전에 회복해두세요...</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}><div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166"}}>오늘 할 일</div><div style={{fontSize:"11px",color:used>=ACT_MAX?"#e94560":"#888"}}>행동 {used}/{ACT_MAX}</div></div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}>
        {DAILY_ACTIONS.map(action=>{
          const broke=action.gold<0&&state.gold<Math.abs(action.gold);
          const dis=eventDay||used>=ACT_MAX||broke;
          return(<button key={action.id} onClick={()=>doAction(action)} disabled={dis} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",background:"#12122a",border:`1px solid ${dis?"#1a1a2a":"#2a2a4a"}`,borderRadius:"12px",cursor:dis?"not-allowed":"pointer",color:dis?"#555":"#e0e0ff",textAlign:"left",width:"100%",opacity:dis?0.5:1}}>
            <div style={{fontSize:"24px",flexShrink:0}}>{action.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:"13px",fontWeight:"700",marginBottom:"2px"}}>{action.name}</div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {action.stamina!==0&&<span style={{fontSize:"10px",color:action.stamina>0?"#06d6a0":"#e94560"}}>체력 {action.stamina>0?"+":""}{action.stamina}</span>}
                {action.mental!==0&&<span style={{fontSize:"10px",color:action.mental>0?"#c084fc":"#e94560"}}>멘탈 {action.mental>0?"+":""}{action.mental}</span>}
                {action.gold!==0&&<span style={{fontSize:"10px",color:action.gold>0?"#ffd166":"#e94560"}}>{action.gold>0?"+":""}{action.gold.toLocaleString()}원</span>}
              </div>
            </div>
            {broke&&<div style={{fontSize:"10px",color:"#e94560",flexShrink:0}}>돈부족</div>}
          </button>);
        })}
      </div>
      <div style={{fontSize:"11px",color:"#555",marginBottom:"8px",textAlign:"center"}}>🎨 그림 그리기는 시간 소비 없이 자유롭게 (스튜디오)</div>
      <button onClick={sleep} disabled={eventDay} style={{width:"100%",padding:"13px",background:eventDay?"#1a1a2a":"linear-gradient(135deg,#4a86e8,#7c3aed)",border:"none",color:eventDay?"#555":"#fff",fontWeight:"700",borderRadius:"10px",cursor:eventDay?"not-allowed":"pointer",fontSize:"14px",marginBottom:"16px"}}>{eventDay?"🎪 행사 당일 — 넘기기 불가":"🌙 취침 (하루 넘기기 →)"}</button>
      {log.length>0&&<><div style={{fontSize:"12px",color:"#555",marginBottom:"8px"}}>활동 기록</div><div style={{display:"flex",flexDirection:"column",gap:"6px"}}>{log.slice(0,8).map(entry=><div key={entry.id} style={{padding:"8px 10px",background:"#12122a",borderRadius:"8px",borderLeft:`3px solid ${entry.type==="good"?"#06d6a0":entry.type==="bad"?"#e94560":"#2a2a4a"}`}}><div style={{fontSize:"12px"}}>{entry.text}</div>{entry.sub&&<div style={{fontSize:"10px",color:"#666",marginTop:"2px"}}>{entry.sub}</div>}</div>)}</div></>}
    </div>
  </div>);
}

export function StudioScreen({state,setState,onGoNext}){
  const [drawing,setDrawing]=useState(false);
  const [msg,setMsg]=useState(null);
  const [arts,setArts]=useState([]);
  const loadArts=()=>{try{const raw=localStorage.getItem(SAVE_KEY);setArts(raw?JSON.parse(raw):[]);}catch(e){setArts([]);}};
  useEffect(loadArts,[]);
  const handleComplete=(imageData)=>{
    let next;
    try{const raw=localStorage.getItem(SAVE_KEY);const list=raw?JSON.parse(raw):[];const rec={id:Date.now(),name:`그림 ${list.length+1}`,ratioId:"1:1",layers:[],thumb:imageData,ts:new Date().toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})};next=[rec,...list].slice(0,MAX_SAVES);localStorage.setItem(SAVE_KEY,JSON.stringify(next));setArts(next);}catch(e){}
    setState(s=>({...s,stamina:Math.max(0,s.stamina-10)}));
    setMsg({text:"✦ 갤러리에 저장됐어요! 📱 굿즈팩토리에서 굿즈로 만들 수 있어요",type:"ok"});
    setDrawing(false);
  };
  if(drawing)return<DrawingApp goodsType={{name:"새 그림",id:"art"}} onComplete={handleComplete} onCancel={()=>setDrawing(false)}/>;
  return(<div style={{height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"5px",padding:"10px",background:"#12122a",borderBottom:"1px solid #2a2a4a",position:"sticky",top:0,zIndex:10}}>
      {[{l:"💰",v:`₩${state.gold.toLocaleString()}`},{l:"⚡",v:`${state.stamina}%`},{l:"✨",v:`${state.fame}pt`},{l:"🧠",v:`${state.mentalHealth}%`}].map(({l,v})=><div key={l} style={{textAlign:"center",padding:"5px 2px",background:"#1a1a3a",borderRadius:"7px"}}><div style={{fontSize:"12px"}}>{l}</div><div style={{fontSize:"10px",fontWeight:"700",color:"#c084fc"}}>{v}</div></div>)}
    </div>
    <div style={{padding:"14px"}}>
      {msg&&<div style={{padding:"9px 12px",borderRadius:"8px",fontSize:"12px",marginBottom:"10px",background:msg.type==="ok"?"#0a2a1a":"#2a0a0a",border:`1px solid ${msg.type==="ok"?"#06d6a0":"#e94560"}`,color:msg.type==="ok"?"#06d6a0":"#e94560",lineHeight:1.6}}>{msg.text}</div>}
      <div style={{fontSize:"14px",fontWeight:"700",marginBottom:"4px",color:"#c084fc"}}>🎨 스튜디오</div>
      <div style={{fontSize:"11px",color:"#888",marginBottom:"12px",lineHeight:1.6}}>그림을 그려 갤러리에 저장하세요.<br/>저장한 그림은 📱 <b style={{color:"#e94560"}}>굿즈팩토리</b>에서 굿즈로 주문할 수 있어요.</div>
      {isEventDay(state)?<div style={{padding:"14px",marginBottom:"18px",background:"#1a1a2e",border:"1px dashed #e94560",borderRadius:"14px",fontSize:"12px",color:"#e94560",textAlign:"center",lineHeight:1.6}}>🎪 행사 당일엔 그림을 그릴 수 없어요<br/>행사장 탭에서 참가하세요</div>:<button onClick={()=>setDrawing(true)} style={{width:"100%",padding:"16px",marginBottom:"18px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",fontSize:"15px",borderRadius:"14px",cursor:"pointer",boxShadow:"0 4px 20px rgba(124,58,237,0.4)"}}>✏️ 새 그림 그리기</button>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
        <div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166"}}>🖼 내 그림 ({arts.length})</div>
        {arts.length>0&&<div style={{fontSize:"10px",color:"#555"}}>그림 앱 "세이브"도 여기 저장돼요</div>}
      </div>
      {arts.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",marginBottom:"18px"}}>
        {arts.map(a=><div key={a.id} style={{background:"#fff",borderRadius:"8px",overflow:"hidden",border:"1px solid #2a2a4a"}}><img src={a.thumb} style={{width:"100%",aspectRatio:"1",objectFit:"contain",display:"block"}}/></div>)}
      </div>:<div style={{textAlign:"center",padding:"30px 20px",color:"#444",marginBottom:"18px"}}><div style={{fontSize:"30px",marginBottom:"8px"}}>🖼</div><div style={{fontSize:"12px"}}>아직 그린 그림이 없어요</div></div>}
      <button onClick={onGoNext} style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",fontSize:"14px",borderRadius:"12px",cursor:"pointer",boxShadow:"0 4px 20px rgba(124,58,237,0.4)"}}>🏪 부스 꾸미러 가기 →</button>
    </div>
  </div>);
}

export function GoodsSprite({uid,type,img,cx,baseY,s,shape,outlined}){
  s=s||1;const cid="gc"+uid;
  if(type==="acrylic"||type==="keyring"){
    const w=(type==="keyring"?28:38)*s,h=(type==="keyring"?38:50)*s,baseH=6*s,x=cx-w/2,y=baseY-(type==="keyring"?0:baseH)-h;
    const ring=type==="keyring"
      ?<g><line x1={cx} y1={y} x2={cx} y2={y-5*s} stroke="#ffd166" strokeWidth={2*s}/><circle cx={cx} cy={y-8*s} r={4.5*s} fill="none" stroke="#ffd166" strokeWidth={2*s}/></g>
      :<g><rect x={cx-3*s} y={baseY-baseH-2} width={6*s} height={baseH+4} fill="#9a9a9a"/><ellipse cx={cx} cy={baseY} rx={w*0.42} ry={3*s} fill="#b478f0"/></g>;
    if(outlined&&img)return(<g>
      <ellipse cx={cx} cy={baseY+1} rx={w*0.5} ry={4*s} fill="rgba(0,0,0,0.26)"/>
      <image href={img} x={x-2*s} y={y-2*s} width={w+4*s} height={h+4*s} preserveAspectRatio="xMidYMid meet"/>
      {ring}
    </g>);
    const ix=x+3*s,iy=y+3*s,iw=w-6*s,ih=h-6*s;
    return(<g>
      <ellipse cx={cx} cy={baseY+1} rx={w*0.5} ry={4*s} fill="rgba(0,0,0,0.26)"/>
      <rect x={x} y={y} width={w} height={h} rx={8*s} fill="rgba(185,205,255,0.13)" stroke="#ffffff" strokeWidth={3*s}/>
      <clipPath id={cid}><rect x={ix} y={iy} width={iw} height={ih} rx={5*s}/></clipPath>
      {img?<image href={img} x={ix} y={iy} width={iw} height={ih} clipPath={`url(#${cid})`} preserveAspectRatio="xMidYMid slice"/>:<rect x={ix} y={iy} width={iw} height={ih} rx={5*s} fill="#33335a"/>}
      <rect x={x} y={y} width={w} height={h} rx={8*s} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1}/>
      {ring}
    </g>);
  }
  if(type==="badge"){
    const r=19*s,cy=baseY-r;const sh=shape||"circle";
    const shapeEl=(fill,stroke,sw)=>sh==="heart"?<path d={heartPath(cx,cy,r*1.15)} fill={fill} stroke={stroke} strokeWidth={sw}/>:sh==="star"?<path d={starPath(cx,cy,r*1.2)} fill={fill} stroke={stroke} strokeWidth={sw}/>:<circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw}/>;
    return(<g>
      <ellipse cx={cx} cy={baseY+1} rx={r*0.85} ry={3.5*s} fill="rgba(0,0,0,0.26)"/>
      {shapeEl("#ddd",null,0)}
      <clipPath id={cid}>{sh==="heart"?<path d={heartPath(cx,cy,r*1.15)}/>:sh==="star"?<path d={starPath(cx,cy,r*1.2)}/>:<circle cx={cx} cy={cy} r={r}/>}</clipPath>
      {img?<image href={img} x={cx-r*1.3} y={cy-r*1.3} width={r*2.6} height={r*2.6} clipPath={`url(#${cid})`} preserveAspectRatio="xMidYMid slice"/>:shapeEl("#33335a",null,0)}
      {shapeEl("none","#bbb",1.5*s)}
      <ellipse cx={cx-r*0.35} cy={cy-r*0.4} rx={r*0.28} ry={r*0.16} fill="rgba(255,255,255,0.5)" transform={`rotate(-30 ${cx-r*0.35} ${cy-r*0.4})`}/>
    </g>);
  }
  if(type==="doujinshi"){
    const w=34*s,h=48*s,x=cx-w/2,y=baseY-h,sp=5*s;
    return(<g>
      <ellipse cx={cx} cy={baseY+1} rx={w*0.62} ry={4*s} fill="rgba(0,0,0,0.26)"/>
      <polygon points={`${x+w},${y} ${x+w+sp},${y+sp} ${x+w+sp},${y+h+sp} ${x+w},${y+h}`} fill="#ececec"/>
      <polygon points={`${x},${y+h} ${x+w},${y+h} ${x+w+sp},${y+h+sp} ${x+sp},${y+h+sp}`} fill="#d2d2d2"/>
      <clipPath id={cid}><rect x={x} y={y} width={w} height={h}/></clipPath>
      {img?<image href={img} x={x} y={y} width={w} height={h} clipPath={`url(#${cid})`} preserveAspectRatio="xMidYMid slice"/>:<rect x={x} y={y} width={w} height={h} fill="#33335a"/>}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#222" strokeWidth={1}/>
      <line x1={x+4*s} y1={y} x2={x+4*s} y2={y+h} stroke="rgba(0,0,0,0.22)" strokeWidth={1.5*s}/>
    </g>);
  }
  const D=({postcard:{w:30,h:45,rx:2,op:1,border:"#fff"},sticker:{w:38,h:38,rx:11,op:1,border:"#fff"},photocard:{w:28,h:28,rx:3,op:1,border:"#fff"},clearfile:{w:36,h:51,rx:2,op:0.78,border:"#bcd"}})[type]||{w:32,h:46,rx:3,op:1,border:"#fff"};
  const w=D.w*s,h=D.h*s,x=cx-w/2,y=baseY-h,rx=D.rx*s,sticker=type==="sticker";
  return(<g opacity={D.op}>
    <ellipse cx={cx} cy={baseY+1} rx={w*0.6} ry={4*s} fill="rgba(0,0,0,0.26)"/>
    {sticker&&<rect x={x-2.5*s} y={y-2.5*s} width={w+5*s} height={h+5*s} rx={rx+2.5*s} fill="#fff"/>}
    <clipPath id={cid}><rect x={x} y={y} width={w} height={h} rx={rx} ry={rx}/></clipPath>
    {img?<image href={img} x={x} y={y} width={w} height={h} clipPath={`url(#${cid})`} preserveAspectRatio="xMidYMid slice"/>:<rect x={x} y={y} width={w} height={h} rx={rx} fill="#33335a"/>}
    <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={D.border} strokeWidth={1.2} opacity="0.7"/>
  </g>);
}

export function BoothViewer({goods,boothItems,genre,boothSize,sold}){
  const owned=boothItems||[];
  const hasBanner=owned.includes("banner"),hasStandL=owned.includes("stand_l"),hasStandS=owned.includes("stand_s"),hasPromo=owned.includes("promo"),hasCloth=owned.includes("cloth"),hasLight=owned.includes("light");
  const cfg=BOOTH_SIZES.find(b=>b.id===boothSize)||BOOTH_SIZES[0];
  const HW=cfg.hw,cx0=160,topY=92,HV=46,TH=24;
  const top=[cx0,topY],right=[cx0+HW,topY+HV],bottom=[cx0,topY+2*HV],left=[cx0-HW,topY+HV];
  const poly=(pts)=>pts.map(p=>p.join(",")).join(" ");
  const clothTop=hasCloth?"#3a2466":"#6b5a3a",clothSide=hasCloth?"#281646":"#4a3e28",clothSide2=hasCloth?"#1f1138":"#37301f";
  const items=goods.slice(0,5).map((g,i,arr)=>{
    const n=arr.length,frac=n===1?0.5:i/(n-1);
    const u=(frac-0.5)*1.15,v=(i%2===0?0.12:-0.22);
    const px=cx0+u*HW*0.78,py=topY+HV+v*HV+HV*0.18;
    const remain=sold!=null?Math.ceil(g.stock*(1-sold)):g.stock;
    return{g,px,py,remain};
  }).sort((a,b)=>a.py-b.py);
  return(<svg viewBox="0 0 320 250" style={{width:"100%",display:"block"}}>
    <defs>
      <linearGradient id="bvBanner" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7c3aed"/><stop offset="1" stopColor="#e94560"/></linearGradient>
      <radialGradient id="bvLight" cx="0.5" cy="0.2" r="0.85"><stop offset="0" stopColor="rgba(255,240,150,0.32)"/><stop offset="1" stopColor="rgba(255,240,150,0)"/></radialGradient>
    </defs>
    {hasLight&&<ellipse cx={cx0} cy={topY+HV} rx={HW*1.2} ry={HV*1.7} fill="url(#bvLight)"/>}
    {hasBanner?<g>
      <rect x={cx0-74} y={26} width={148} height={40} rx={5} fill="url(#bvBanner)"/>
      <text x={cx0} y={51} textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">✦ {(genre&&genre.name)||"MY CIRCLE"} ✦</text>
      <rect x={cx0-3} y={66} width={6} height={topY-66} fill="#555"/>
    </g>:<g><rect x={cx0-58} y={32} width={116} height={32} rx={5} fill="none" stroke="#2a2a4a" strokeDasharray="5 4"/><text x={cx0} y={52} textAnchor="middle" fontSize="9" fill="#444">현수막 없음</text></g>}
    <polygon points={poly([left,bottom,[bottom[0],bottom[1]+TH],[left[0],left[1]+TH]])} fill={clothSide}/>
    <polygon points={poly([bottom,right,[right[0],right[1]+TH],[bottom[0],bottom[1]+TH]])} fill={clothSide2}/>
    <polygon points={poly([top,right,bottom,left])} fill={clothTop} stroke="#000" strokeOpacity="0.25"/>
    {(hasStandL||hasStandS)&&<text x={cx0} y={topY+10} textAnchor="middle" fontSize="9" fill="#c084fc">{hasStandL?"🗃 대형 전시대":"🗄 소형 전시대"}</text>}
    {items.map(it=>(it.remain>0?<g key={it.g.id}>
      <GoodsSprite uid={it.g.id} type={it.g.type} img={it.g.imageData} cx={it.px} baseY={it.py} shape={it.g.shape} outlined={it.g.outlined}/>
      <rect x={it.px-13} y={it.py+4} width={26} height={12} rx={6} fill="rgba(0,0,0,0.65)"/><text x={it.px} y={it.py+13} textAnchor="middle" fontSize="8" fill="#ffd166">×{it.remain}</text>
    </g>:<text key={it.g.id} x={it.px} y={it.py} textAnchor="middle" fontSize="9" fill="#666">품절</text>))}
    {!goods.length&&<text x={cx0} y={topY+HV+6} textAnchor="middle" fontSize="11" fill="#555">진열할 굿즈가 없어요</text>}
    {hasPromo&&<g><rect x={cx0-HW-2} y={topY+2*HV-4} width={36} height={20} rx={4} fill="#0a2a1a" stroke="#06d6a0"/><text x={cx0-HW+16} y={topY+2*HV+9} textAnchor="middle" fontSize="8" fill="#06d6a0">🎁판촉</text></g>}
  </svg>);
}

export function BoothWalk({state,onBack}){
  const owned=state.boothItems||[];
  const hasBanner=owned.includes("banner"),hasLight=owned.includes("light"),hasCloth=owned.includes("cloth");
  const goods=state.goods||[];
  const tableGoods=goods.filter(g=>g.type!=="badge");
  const badges=goods.filter(g=>g.type==="badge");
  const VW=360,H=260;
  const SCENE=Math.max(VW,140+Math.max(1,tableGoods.length)*108+80);
  const [px,setPx]=useState(Math.round(SCENE/2));
  const moveRef=useRef(null);
  const clamp=(x)=>Math.max(40,Math.min(SCENE-40,x));
  const move=(d)=>setPx(x=>clamp(x+d*24));
  useEffect(()=>{const kd=(e)=>{if(e.key==="ArrowLeft"){e.preventDefault();move(-1);}else if(e.key==="ArrowRight"){e.preventDefault();move(1);}};window.addEventListener("keydown",kd);return()=>window.removeEventListener("keydown",kd);},[SCENE]);
  const startHold=(d)=>{move(d);if(moveRef.current)clearInterval(moveRef.current);moveRef.current=setInterval(()=>move(d),80);};
  const stopHold=()=>{if(moveRef.current){clearInterval(moveRef.current);moveRef.current=null;}};
  useEffect(()=>()=>stopHold(),[]);
  const cam=Math.max(0,Math.min(SCENE-VW,Math.round(px-VW/2)));
  const baseY=150,clothTop=hasCloth?"#3a2466":"#5a4a2e",clothFront=hasCloth?"#281646":"#3e3320";
  const span=SCENE-160;
  const bx=Math.round(SCENE/2-62);
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0a0a14",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#12122a",borderBottom:"1px solid #2a2a4a",flexShrink:0}}>
      <button onClick={onBack} style={{padding:"5px 12px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"6px",cursor:"pointer",fontSize:"12px"}}>← 나가기</button>
      <div style={{fontSize:"13px",fontWeight:"700",color:"#c084fc"}}>🚶 부스 둘러보기</div>
      <div style={{fontSize:"11px",color:"#888",maxWidth:"90px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(state.boothApp&&state.boothApp.name)||(state.genre&&state.genre.name)||"내 부스"}</div>
    </div>
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a14",overflow:"hidden",minHeight:0}}>
      <svg viewBox={`${cam} 0 ${VW} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{display:"block"}}>
        <defs>
          <linearGradient id="bwWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a1030"/><stop offset="1" stopColor="#14142a"/></linearGradient>
          <linearGradient id="bwBan" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7c3aed"/><stop offset="1" stopColor="#e94560"/></linearGradient>
          <radialGradient id="bwGlow" cx="0.5" cy="0.1" r="0.7"><stop offset="0" stopColor="rgba(255,240,150,0.25)"/><stop offset="1" stopColor="rgba(255,240,150,0)"/></radialGradient>
        </defs>
        <rect x={0} y={0} width={SCENE} height={162} fill="url(#bwWall)"/>
        <rect x={0} y={162} width={SCENE} height={H-162} fill="#20203a"/>
        <line x1={0} y1={162} x2={SCENE} y2={162} stroke="#000" strokeOpacity="0.3"/>
        {hasLight&&<rect x={0} y={0} width={SCENE} height={170} fill="url(#bwGlow)"/>}
        {hasBanner?<g><rect x={24} y={12} width={SCENE-48} height={34} rx={5} fill="url(#bwBan)"/><text x={SCENE/2} y={34} textAnchor="middle" fontSize="16" fontWeight="900" fill="#fff">✦ {(state.genre&&state.genre.name)||"MY CIRCLE"} ✦</text></g>:<rect x={24} y={12} width={SCENE-48} height={34} rx={5} fill="none" stroke="#2a2a4a" strokeDasharray="6 5"/>}
        {/* player (behind table) */}
        <g transform={`translate(${px},0)`}>
          <ellipse cx={0} cy={152} rx={16} ry={4} fill="rgba(0,0,0,0.3)"/>
          <rect x={-11} y={104} width={22} height={50} rx={10} fill="#7c3aed"/>
          <circle cx={0} cy={90} r={15} fill="#ffe0c2"/>
          <path d={`M -15,86 Q 0,66 15,86 Q 12,76 0,74 Q -12,76 -15,86 Z`} fill="#3a2a5a"/>
          <circle cx={-5} cy={91} r={1.8} fill="#222"/><circle cx={5} cy={91} r={1.8} fill="#222"/>
          <path d="M -4,97 Q 0,100 4,97" stroke="#c66" strokeWidth="1.4" fill="none"/>
        </g>
        {/* table */}
        <rect x={24} y={148} width={SCENE-48} height={8} fill={clothTop}/>
        <rect x={24} y={156} width={SCENE-48} height={48} fill={clothFront}/>
        <line x1={24} y1={148} x2={SCENE-24} y2={148} stroke="rgba(255,255,255,0.15)"/>
        {/* goods on table */}
        {tableGoods.map((g,i)=>{const gx=tableGoods.length<=1?Math.round(SCENE/2):Math.round(80+i*(span/(tableGoods.length-1)));return(<g key={g.id}>
          <text x={gx} y={70} textAnchor="middle" fontSize="9" fill="#555">{i+1}구역</text>
          <GoodsSprite uid={g.id} type={g.type} img={g.imageData} cx={gx} baseY={baseY} shape={g.shape} outlined={g.outlined}/>
          <rect x={gx-13} y={baseY+3} width={26} height={12} rx={6} fill="rgba(0,0,0,0.6)"/><text x={gx} y={baseY+12} textAnchor="middle" fontSize="8" fill="#ffd166">×{g.stock}</text>
        </g>);})}
        {!tableGoods.length&&<text x={SCENE/2} y={120} textAnchor="middle" fontSize="11" fill="#555">진열할 굿즈가 없어요</text>}
        {/* badge box */}
        <g>
          <rect x={bx} y={208} width={124} height={44} rx={6} fill="#12122a" stroke="#3a3a6a"/>
          <text x={bx+8} y={221} fontSize="9" fill="#c084fc">🔘 뱃지함</text>
          {badges.length?badges.slice(0,4).map((g,i)=><GoodsSprite key={g.id} uid={"bw"+g.id} type="badge" img={g.imageData} cx={bx+26+i*28} baseY={248} s={0.7} shape={g.shape}/>):<text x={bx+62} y={242} textAnchor="middle" fontSize="9" fill="#555">뱃지 없음</text>}
        </g>
      </svg>
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",background:"#12122a",borderTop:"1px solid #2a2a4a",flexShrink:0}}>
      <button onPointerDown={()=>startHold(-1)} onPointerUp={stopHold} onPointerLeave={stopHold} style={{width:"64px",height:"48px",borderRadius:"12px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#c084fc",fontSize:"22px",cursor:"pointer",touchAction:"none"}}>◀</button>
      <div style={{fontSize:"11px",color:"#666",textAlign:"center"}}>← → 또는 버튼으로<br/>부스를 걸어다녀요</div>
      <button onPointerDown={()=>startHold(1)} onPointerUp={stopHold} onPointerLeave={stopHold} style={{width:"64px",height:"48px",borderRadius:"12px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#c084fc",fontSize:"22px",cursor:"pointer",touchAction:"none"}}>▶</button>
    </div>
  </div>);
}

export function BoothScreen({state,setState,onGoEvent,onBack}){
  const [msg,setMsg]=useState(null);
  const [walk,setWalk]=useState(false);
  const owned=state.boothItems;
  const buy=(item)=>{if(state.gold<item.price){setMsg({text:"골드 부족!",type:"bad"});return;}if(owned.includes(item.id)){setMsg({text:"이미 보유 중!",type:"bad"});return;}setState(s=>({...s,gold:s.gold-item.price,boothItems:[...s.boothItems,item.id]}));setMsg({text:`✦ ${item.name} 구매!`,type:"ok"});};
  const totalFame=owned.reduce((a,id)=>a+(BOOTH_ITEMS.find(b=>b.id===id)?.fameBonus||0),0);
  const totalSell=owned.reduce((a,id)=>a+(BOOTH_ITEMS.find(b=>b.id===id)?.sellBonus||0),0);
  const hasBanner=owned.includes("banner"),hasStandL=owned.includes("stand_l"),hasStandS=owned.includes("stand_s"),hasPromo=owned.includes("promo"),hasCloth=owned.includes("cloth"),hasLight=owned.includes("light");
  const changeSize=(sz)=>{const cur=BOOTH_SIZES.find(b=>b.id===state.boothSize)||BOOTH_SIZES[0];const tgt=BOOTH_SIZES.find(b=>b.id===sz);if(sz===state.boothSize)return;if(tgt.tiles>cur.tiles){if(state.gold<tgt.price){setMsg({text:`골드 부족! (${tgt.name} ₩${tgt.price.toLocaleString()})`,type:"bad"});return;}setState(s=>({...s,gold:s.gold-tgt.price,boothSize:sz}));setMsg({text:`✦ ${tgt.name} 부스로 확장! (-₩${tgt.price.toLocaleString()})`,type:"ok"});}else{setState(s=>({...s,boothSize:sz}));setMsg({text:`${tgt.name} 부스로 변경`,type:"ok"});}};
  if(walk)return<BoothWalk state={state} onBack={()=>setWalk(false)}/>;
  return(<div style={{height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"#12122a",borderBottom:"1px solid #2a2a4a",position:"sticky",top:0,zIndex:10}}>
      <div style={{fontSize:"14px",fontWeight:"700",color:"#c084fc"}}>🏪 부스 꾸미기</div>
      <div style={{fontSize:"12px",color:"#ffd166",fontWeight:"700"}}>💰 ₩{state.gold.toLocaleString()}</div>
    </div>
    <div style={{padding:"14px"}}>
      {msg&&<div style={{padding:"8px 12px",borderRadius:"8px",fontSize:"12px",marginBottom:"10px",background:msg.type==="ok"?"#0a2a1a":"#2a0a0a",border:`1px solid ${msg.type==="ok"?"#06d6a0":"#e94560"}`,color:msg.type==="ok"?"#06d6a0":"#e94560"}}>{msg.text}</div>}
      <div style={{background:"linear-gradient(180deg,#16162e,#0f0f22)",border:"1px solid #3a3a6a",borderRadius:"12px",padding:"6px",marginBottom:"8px",position:"relative",overflow:"hidden"}}>
        <BoothViewer goods={state.goods} boothItems={owned} genre={state.genre} boothSize={state.boothSize}/>
      </div>
      <button onClick={()=>setWalk(true)} style={{width:"100%",padding:"10px",marginBottom:"10px",background:"#1a1a3a",border:"1px solid #7c3aed",color:"#c084fc",borderRadius:"10px",cursor:"pointer",fontSize:"13px",fontWeight:"700"}}>🚶 부스 둘러보기 (직접 걸어보기)</button>
      <div style={{display:"flex",gap:"6px",marginBottom:"14px"}}>
        {BOOTH_SIZES.map(sz=>{const sel=state.boothSize===sz.id;const cur=BOOTH_SIZES.find(b=>b.id===state.boothSize)||BOOTH_SIZES[0];const isUpgrade=sz.tiles>cur.tiles;return(
          <button key={sz.id} onClick={()=>changeSize(sz.id)} style={{flex:1,padding:"8px 4px",borderRadius:"9px",background:sel?"linear-gradient(135deg,#7c3aed,#e94560)":"#12122a",border:`1px solid ${sel?"#a855f7":"#2a2a4a"}`,color:sel?"#fff":"#aaa",cursor:"pointer",textAlign:"center"}}>
            <div style={{fontSize:"12px",fontWeight:"700"}}>{sz.name}</div>
            <div style={{fontSize:"8px",color:sel?"#ffe":"#666",marginTop:"2px"}}>{sz.desc}</div>
            {isUpgrade&&sz.price>0&&<div style={{fontSize:"9px",color:"#ffd166",marginTop:"3px"}}>₩{sz.price.toLocaleString()}</div>}
            {sel&&<div style={{fontSize:"9px",color:"#fff",marginTop:"3px"}}>● 사용중</div>}
          </button>);})}
      </div>
      {owned.length>0&&<div style={{display:"flex",gap:"8px",marginBottom:"14px"}}><div style={{flex:1,padding:"8px",background:"#1a0a2e",borderRadius:"8px",textAlign:"center",border:"1px solid #7c3aed"}}><div style={{fontSize:"9px",color:"#888"}}>인지도보너스</div><div style={{fontSize:"14px",fontWeight:"900",color:"#c084fc"}}>+{Math.round(totalFame*100)}%</div></div><div style={{flex:1,padding:"8px",background:"#0a2a1a",borderRadius:"8px",textAlign:"center",border:"1px solid #06d6a0"}}><div style={{fontSize:"9px",color:"#888"}}>판매율보너스</div><div style={{fontSize:"14px",fontWeight:"900",color:"#06d6a0"}}>+{Math.round(totalSell*100)}%</div></div></div>}
      <div style={{fontSize:"12px",fontWeight:"700",marginBottom:"8px",color:"#ffd166"}}>🛒 아이템 구매</div>
      <div style={{display:"flex",flexDirection:"column",gap:"7px",marginBottom:"16px"}}>
        {BOOTH_ITEMS.map(item=>{const isOwned=owned.includes(item.id);return(<div key={item.id} style={{display:"flex",gap:"10px",padding:"10px 12px",alignItems:"center",background:isOwned?"#0a1a2a":"#12122a",border:`1px solid ${isOwned?"#06d6a0":"#2a2a4a"}`,borderRadius:"10px"}}><div style={{fontSize:"22px",flexShrink:0}}>{item.icon}</div><div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:"700"}}>{item.name}</div><div style={{fontSize:"10px",color:"#666"}}>{item.desc}</div></div>{isOwned?<div style={{fontSize:"11px",color:"#06d6a0",fontWeight:"700",flexShrink:0}}>✓</div>:<button onClick={()=>buy(item)} style={{padding:"5px 10px",flexShrink:0,background:state.gold>=item.price?"linear-gradient(135deg,#7c3aed,#e94560)":"#1a1a2a",border:state.gold>=item.price?"none":"1px solid #333",color:state.gold>=item.price?"#fff":"#444",borderRadius:"7px",cursor:state.gold>=item.price?"pointer":"not-allowed",fontSize:"11px",fontWeight:"700",minWidth:"64px",textAlign:"center"}}>₩{item.price.toLocaleString()}</button>}</div>);})}
      </div>
      <div style={{display:"flex",gap:"10px"}}><button onClick={onBack} style={{flex:1,padding:"11px",background:"transparent",border:"1px solid #2a2a4a",color:"#888",borderRadius:"10px",cursor:"pointer",fontSize:"12px"}}>← 스튜디오</button><button onClick={onGoEvent} style={{flex:2,padding:"11px",background:"linear-gradient(135deg,#e94560,#7c3aed)",border:"none",color:"#fff",fontWeight:"700",fontSize:"13px",borderRadius:"10px",cursor:"pointer",boxShadow:"0 4px 20px rgba(233,69,96,0.4)"}}>🎪 행사장으로!</button></div>
    </div>
  </div>);
}

export function EventScreen({state,setState,onBack}){
  const [phase,setPhase]=useState("prep");
  const [log,setLog]=useState([]);
  const [result,setResult]=useState(null);
  const [sellAnim,setSellAnim]=useState(0);
  const animRef=useRef(null);
  useEffect(()=>()=>{if(animRef.current)clearInterval(animRef.current);},[]);
  const owned=state.boothItems;
  const totalFame=owned.reduce((a,id)=>a+(BOOTH_ITEMS.find(b=>b.id===id)?.fameBonus||0),0);
  const totalSell=owned.reduce((a,id)=>a+(BOOTH_ITEMS.find(b=>b.id===id)?.sellBonus||0),0);
  const runEvent=()=>{
    setPhase("event");
    setSellAnim(0);
    const t0=Date.now();
    if(animRef.current)clearInterval(animRef.current);
    animRef.current=setInterval(()=>{const p=Math.min(1,(Date.now()-t0)/2000);setSellAnim(p);if(p>=1){clearInterval(animRef.current);animRef.current=null;}},60);
    const evs=[];let goldEarned=0,fameEarned=0,staminaCost=25,mentalChange=0;const soldResults=[];
    evs.push({time:"D-1",text:"포장 시작!",type:"normal"});
    if(Math.random()>.5){evs.push({time:"새벽",text:"아직도 포장 중... 체력 -15",type:"warning"});staminaCost+=15;}
    else{evs.push({time:"밤",text:"일찍 완료! 체력 절약 ✨",type:"good"});}
    evs.push({time:"당일",text:`부스 세팅! (아이템 ${owned.length}개)`,type:"normal"});
    if(owned.includes("banner"))evs.push({time:"현수막",text:`"${state.genre?.name||"MY CIRCLE"}" 현수막에 눈길이!`,type:"good"});
    if(owned.includes("light"))evs.push({time:"조명",text:"LED 아래 굿즈가 반짝반짝",type:"good"});
    if(owned.includes("promo"))evs.push({time:"판촉대",text:"샘플 보고 손님이 멈췄다!",type:"good"});
    const nb=Math.random();
    if(nb>.65){evs.push({time:"옆부스",text:"초금손 대형 서클이 옆에?! 멘탈 -15",type:"warning"});mentalChange-=15;}
    else if(nb>.3){evs.push({time:"옆부스",text:"옆 작가분이 먼저 인사해줬다 🥺",type:"good"});mentalChange+=5;}
    else{evs.push({time:"옆부스",text:"합동 이벤트 제안! ✨",type:"great"});fameEarned+=10;mentalChange+=8;}
    const salesCap=(state.activeEvent&&state.activeEvent.maxSales)||99999;let soldTotal=0;
    state.goods.forEach(g=>{
      const rate=Math.min(1,0.25+Math.random()*0.55+(state.fame/2000)+totalSell);
      let sold=Math.min(g.stock,Math.floor(g.stock*rate));
      sold=Math.min(sold,Math.max(0,salesCap-soldTotal));soldTotal+=sold;
      const remaining=g.stock-sold;
      goldEarned+=sold*g.price;fameEarned+=Math.floor(sold*0.6*(1+totalFame));soldResults.push({id:g.id,sold,remaining});
      if(sold===g.stock)evs.push({time:g.name,text:`완판!!! 🎉 +₩${(sold*g.price).toLocaleString()}`,type:"great"});
      else if(sold>g.stock*.6)evs.push({time:g.name,text:`${sold}개 판매! +₩${(sold*g.price).toLocaleString()}`,type:"good"});
      else if(sold>0)evs.push({time:g.name,text:`${sold}개 판매... +₩${(sold*g.price).toLocaleString()}`,type:"normal"});
      else evs.push({time:g.name,text:"아무도 안 샀다... 😔",type:"warning"});
      if(remaining>0)evs.push({time:"재고",text:`${g.name} ${remaining}개 이월 →`,type:"neutral"});
    });
    setLog(evs);setResult({goldEarned,fameEarned,staminaCost,mentalChange,soldResults});
    setTimeout(()=>{
      setState(s=>{
        const updGoods=s.goods.map(g=>{const r=soldResults.find(x=>x.id===g.id);return r&&r.remaining>0?{...g,stock:r.remaining}:null;}).filter(Boolean);
        const soldOut=soldResults.some(r=>r.sold>0&&r.remaining===0);
        const aeId=s.activeEvent&&s.activeEvent.id;
        let ns={...s,fame:s.fame+fameEarned,followers:Math.max(0,s.followers+Math.floor(fameEarned*.1)),stamina:Math.max(0,s.stamina-staminaCost),mentalHealth:Math.max(0,Math.min(100,s.mentalHealth+mentalChange)),goods:updGoods,day:s.day+1,gameDate:nextGameDate(s.gameDate),activeEvent:null,boothApp:{...s.boothApp,submitted:false},appliedEvents:(s.appliedEvents||[]).filter(id=>id!==aeId),flags:{...s.flags,firstEvent:true,recentEvent:true,goodsSoldOut:soldOut},eventHistory:[...s.eventHistory,{day:s.day,goldEarned,fameEarned}]};
        ns=logTx(ns,goldEarned,`${(s.activeEvent&&s.activeEvent.name)||"행사"} 판매 수익`,"🎪");
        return endOfDay(ns);
      });setPhase("result");
    },2500);
  };
  if(phase==="prep")return(<div style={{height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",padding:"16px"}}>
    <div style={{fontSize:"18px",fontWeight:"900",color:"#e94560",marginBottom:"6px"}}>⭐ {(state.activeEvent&&state.activeEvent.name)||"서울코믹월드"}!</div>
    {state.activeEvent&&<div style={{fontSize:"10px",color:"#888",marginBottom:"4px"}}>{SCALE_LABEL[state.activeEvent.scale]||""} · 최대 판매 {state.activeEvent.maxSales}개{state.activeEvent.boothFee?` · 부스비 ₩${state.activeEvent.boothFee.toLocaleString()}`:""}</div>}
    <div style={{fontSize:"11px",color:"#888",marginBottom:"14px"}}>Day {state.day} · 굿즈 {state.goods.length}종 · 팔로워 {state.followers}명</div>
    {!(state.boothApp&&state.boothApp.submitted)&&<div style={{padding:"10px 12px",background:"#2a1a0a",border:"1px solid #ffd166",borderRadius:"10px",marginBottom:"12px",fontSize:"12px",color:"#ffd166",lineHeight:1.7}}>📱 아직 행사 신청 전이에요!<br/>📱 핸드폰 → <b>Majorland</b> 앱에서 부스 신청을 먼저 해주세요.</div>}
    {owned.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"12px",padding:"10px",background:"#12122a",borderRadius:"10px",border:"1px solid #2a2a4a"}}>{owned.map(id=>{const it=BOOTH_ITEMS.find(b=>b.id===id);return<span key={id} style={{fontSize:"11px",padding:"3px 8px",background:"#1a1a3a",borderRadius:"20px",color:"#c084fc"}}>{it.icon} {it.name}</span>;})}</div>}
    <div style={{display:"flex",gap:"8px",marginBottom:"14px"}}><div style={{flex:1,padding:"8px",background:"#1a0a2e",borderRadius:"8px",textAlign:"center"}}><div style={{fontSize:"9px",color:"#888"}}>인지도보너스</div><div style={{fontSize:"14px",fontWeight:"900",color:"#c084fc"}}>+{Math.round(totalFame*100)}%</div></div><div style={{flex:1,padding:"8px",background:"#0a2a1a",borderRadius:"8px",textAlign:"center"}}><div style={{fontSize:"9px",color:"#888"}}>판매율보너스</div><div style={{fontSize:"14px",fontWeight:"900",color:"#06d6a0"}}>+{Math.round(totalSell*100)}%</div></div></div>
    <div style={{display:"flex",flexDirection:"column",gap:"7px",marginBottom:"14px"}}>{state.goods.map(g=><div key={g.id} style={{display:"flex",gap:"10px",padding:"10px 12px",background:"#12122a",borderRadius:"10px",border:"1px solid #2a2a4a",alignItems:"center"}}><img src={g.imageData} style={{width:"44px",height:"44px",objectFit:"contain",background:"#fff",borderRadius:"6px",flexShrink:0}}/><div><div style={{fontWeight:"700",fontSize:"13px"}}>{g.name}</div><div style={{fontSize:"11px",color:"#888"}}>{g.stock}개 · ₩{g.price.toLocaleString()}</div></div></div>)}</div>
    <div style={{display:"flex",gap:"10px"}}><button onClick={onBack} style={{flex:1,padding:"11px",background:"transparent",border:"1px solid #2a2a4a",color:"#888",borderRadius:"10px",cursor:"pointer"}}>← 부스로</button><button onClick={runEvent} disabled={!(state.boothApp&&state.boothApp.submitted)||!state.goods.length} style={{flex:2,padding:"11px",background:((state.boothApp&&state.boothApp.submitted)&&state.goods.length)?"linear-gradient(135deg,#e94560,#7c3aed)":"#1a1a3a",border:"none",color:((state.boothApp&&state.boothApp.submitted)&&state.goods.length)?"#fff":"#555",fontWeight:"900",fontSize:"14px",borderRadius:"10px",cursor:((state.boothApp&&state.boothApp.submitted)&&state.goods.length)?"pointer":"not-allowed",boxShadow:((state.boothApp&&state.boothApp.submitted)&&state.goods.length)?"0 4px 20px rgba(233,69,96,0.4)":"none"}}>{(state.boothApp&&state.boothApp.submitted)?"🎪 행사 시작!":"🔒 신청 필요"}</button></div>
  </div>);
  return(<div style={{height:"100%",overflow:"auto",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",padding:"14px"}}>
    <div style={{fontSize:"16px",fontWeight:"900",color:"#ffd166",marginBottom:"10px"}}>📋 행사 리포트</div>
    <div style={{background:"linear-gradient(180deg,#16162e,#0f0f22)",border:"1px solid #3a3a6a",borderRadius:"12px",padding:"4px",marginBottom:"12px"}}>
      <BoothViewer goods={state.goods} boothItems={owned} genre={state.genre} boothSize={state.boothSize} sold={phase==="event"?sellAnim:0}/>
      {phase==="event"&&<div style={{textAlign:"center",fontSize:"11px",color:"#ffd166",paddingBottom:"4px"}}>🛒 판매 중... {Math.round(sellAnim*100)}%</div>}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:"5px",marginBottom:"14px"}}>{log.map((e,i)=><div key={i} style={{display:"flex",gap:"8px",padding:"6px 10px",background:"#12122a",borderRadius:"7px",borderLeft:`3px solid ${e.type==="great"?"#ffd166":e.type==="good"?"#06d6a0":e.type==="warning"?"#e94560":"#2a2a4a"}`}}><div style={{fontSize:"10px",color:"#555",minWidth:"44px",paddingTop:"1px"}}>{e.time}</div><div style={{fontSize:"12px",color:e.type==="great"?"#ffd166":e.type==="good"?"#06d6a0":e.type==="warning"?"#e94560":"#e0e0ff"}}>{e.text}</div></div>)}{phase==="event"&&<div style={{textAlign:"center",padding:"16px",color:"#7c3aed"}}>집계 중...</div>}</div>
    {phase==="result"&&result&&<>
      <div style={{padding:"14px",background:"#1a0a2e",borderRadius:"12px",border:"1px solid #7c3aed",marginBottom:"12px"}}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"#c084fc",marginBottom:"8px"}}>행사 결과</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>{[{l:"💰 수익",v:`+₩${result.goldEarned.toLocaleString()}`,c:"#ffd166"},{l:"✨ 인지도",v:`+${result.fameEarned}pt`,c:"#c084fc"},{l:"⚡ 체력",v:`-${result.staminaCost}%`,c:"#e94560"},{l:"🧠 멘탈",v:`${result.mentalChange>=0?"+":""}${result.mentalChange}%`,c:result.mentalChange>=0?"#06d6a0":"#e94560"}].map(({l,v,c})=><div key={l} style={{padding:"8px",background:"#12122a",borderRadius:"8px",textAlign:"center"}}><div style={{fontSize:"9px",color:"#666"}}>{l}</div><div style={{fontSize:"14px",fontWeight:"900",color:c}}>{v}</div></div>)}</div>
        {result.soldResults.some(r=>r.remaining>0)&&<div style={{marginTop:"8px",padding:"7px",background:"#0a0a1a",borderRadius:"7px"}}><div style={{fontSize:"10px",color:"#888",marginBottom:"3px"}}>📦 이월 재고</div>{result.soldResults.filter(r=>r.remaining>0).map(r=>{const g=state.goods.find(x=>x.id===r.id);return g?<div key={r.id} style={{fontSize:"11px",color:"#c084fc"}}>{g.name}: {r.remaining}개 →다음행사</div>:null;})}</div>}
      </div>
      <button onClick={onBack} style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",fontSize:"14px",borderRadius:"12px",cursor:"pointer",boxShadow:"0 4px 20px rgba(124,58,237,0.4)"}}>✦ 다음 준비하러 가기</button>
    </>}
  </div>);
}

export function StatusBar({onClose}){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),15000);return()=>clearInterval(t);},[]);
  const hh=now.getHours().toString().padStart(2,"0"),mm=now.getMinutes().toString().padStart(2,"0");
  return(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 16px",background:"#06060f",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",fontSize:"12px",flexShrink:0}}>
    <div style={{fontWeight:"700",letterSpacing:"0.5px"}}>{hh}:{mm}</div>
    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
      <span style={{fontSize:"11px"}}>📶</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:"2px",fontSize:"11px",color:"#06d6a0"}}>⚡<span style={{display:"inline-block",width:"20px",height:"10px",border:"1px solid #06d6a0",borderRadius:"2px",position:"relative"}}><span style={{position:"absolute",inset:"1px",right:"3px",background:"#06d6a0",borderRadius:"1px"}}/></span></span>
      {onClose&&<button onClick={onClose} style={{background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:"14px",padding:"0 2px"}}>▾</button>}
    </div>
  </div>);
}
export function HomeIndicator({onHome}){
  const y0=useRef(null);
  return(<div onPointerDown={e=>{y0.current=e.clientY;}} onPointerUp={e=>{onHome();}} style={{height:"28px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,background:"#06060f",touchAction:"none"}}>
    <div style={{width:"130px",height:"5px",borderRadius:"3px",background:"#555"}}/>
  </div>);
}
export function PhoneHome({state,onOpen}){
  const p=state.profile;
  return(<div style={{height:"100%",overflow:"auto",background:"radial-gradient(circle at 50% 0%,#1a0a2e,#0d0d1a)",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",padding:"18px 16px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"22px",padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:"14px"}}>
      <div style={{width:"40px",height:"40px",borderRadius:"50%",overflow:"hidden",background:"#2a2a4a",border:"2px solid #7c3aed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{p&&p.avatarData?<img src={p.avatarData} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"20px"}}>👤</span>}</div>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:"13px",fontWeight:"700"}}>{(p&&p.displayName)||"이름 없음"}</div><div style={{fontSize:"11px",color:"#888"}}>{(p&&p.handle&&p.handle!=="@")?p.handle:"@미설정"} · 팔로워 {state.followers.toLocaleString()}</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px 8px"}}>
      {PHONE_APPS.map(a=>(
        <button key={a.id} onClick={()=>onOpen(a.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"5px",background:"transparent",border:"none",cursor:"pointer",color:"#e0e0ff"}}>
          <div style={{width:"54px",height:"54px",borderRadius:"15px",background:`linear-gradient(145deg,${a.color},#12122a)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",boxShadow:"0 4px 12px rgba(0,0,0,0.4)"}}>{a.icon}</div>
          <span style={{fontSize:"10px",fontWeight:"700"}}>{a.name}</span>
        </button>
      ))}
    </div>
    <div style={{marginTop:"26px",textAlign:"center",fontSize:"10px",color:"#444"}}>아래 막대를 누르거나 위로 밀면 홈/닫기</div>
  </div>);
}
export function MatalkScreen(){
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif",padding:"30px",textAlign:"center"}}>
    <div style={{fontSize:"48px",marginBottom:"12px"}}>💬</div>
    <div style={{fontSize:"16px",fontWeight:"700",color:"#06d6a0",marginBottom:"8px"}}>Matalk</div>
    <div style={{fontSize:"13px",color:"#888",lineHeight:1.8}}>메신저 기능은 준비 중이에요.<br/>곧 작가 친구·NPC와 대화할 수 있어요!</div>
  </div>);
}
export function GalleryScreen(){
  const [tab,setTab]=useState("art");
  const [items,setItems]=useState([]);
  const [bmarks,setBmarks]=useState([]);
  const [zoom,setZoom]=useState(null);
  const [confirmClear,setConfirmClear]=useState(false);
  const loadArt=()=>{try{const raw=localStorage.getItem(SAVE_KEY);setItems(raw?JSON.parse(raw):[]);}catch(e){setItems([]);}};
  const loadBm=()=>{idbAll("bookmarks").then(b=>setBmarks((b||[]).sort((a,b2)=>b2.savedAt-a.savedAt)));};
  useEffect(()=>{loadArt();loadBm();},[]);
  const delArt=(id)=>{const next=items.filter(s=>s.id!==id);try{localStorage.setItem(SAVE_KEY,JSON.stringify(next));}catch(e){}setItems(next);if(zoom&&zoom.id===id)setZoom(null);};
  const delBm=(id)=>{idbDel("bookmarks",id).then(loadBm);if(zoom&&zoom.id===id)setZoom(null);};
  const clearCache=()=>{Promise.all([idbClear("imagePool"),idbClear("bookmarks")]).then(()=>{loadBm();setConfirmClear(false);});};
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{padding:"12px 14px 0",background:"#12122a",borderBottom:"1px solid #2a2a4a",flexShrink:0}}>
      <div style={{fontSize:"15px",fontWeight:"700",color:"#ffd166",marginBottom:"8px"}}>🖼 갤러리</div>
      <div style={{display:"flex",gap:"4px"}}>
        {[{id:"art",t:`내 그림 (${items.length})`},{id:"fan",t:`팬아트·인증 (${bmarks.length})`}].map(o=><button key={o.id} onClick={()=>setTab(o.id)} style={{flex:1,padding:"8px 4px",background:"transparent",border:"none",borderBottom:`2px solid ${tab===o.id?"#7c3aed":"transparent"}`,color:tab===o.id?"#c084fc":"#666",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>{o.t}</button>)}
      </div>
    </div>
    <div style={{flex:1,overflow:"auto",padding:"12px"}}>
      {tab==="art"?<>
        {!items.length&&<div style={{textAlign:"center",padding:"50px 20px",color:"#444"}}><div style={{fontSize:"36px",marginBottom:"10px"}}>🖼</div><div style={{fontSize:"13px"}}>저장된 그림이 없어요</div><div style={{fontSize:"11px",marginTop:"4px",color:"#333"}}>스튜디오에서 그림을 그려 저장하세요</div></div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
          {items.map(s=>(<div key={s.id} style={{background:"#12122a",borderRadius:"10px",border:"1px solid #2a2a4a",overflow:"hidden"}}>
            <div onClick={()=>setZoom({id:s.id,url:s.thumb,name:s.name,sub:`${s.ts||""} · ${s.ratioId} · 레이어 ${(s.layers||[]).length}`,kind:"art"})} style={{cursor:"pointer",background:"#fff"}}><img src={s.thumb} style={{width:"100%",aspectRatio:"1",objectFit:"contain",display:"block"}}/></div>
            <div style={{padding:"5px 6px"}}><div style={{fontSize:"10px",fontWeight:"700",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"3px"}}><span style={{fontSize:"8px",color:"#666"}}>{s.ratioId} · {(s.layers||[]).length}L</span><button onClick={()=>delArt(s.id)} style={{background:"transparent",border:"none",color:"#e94560",cursor:"pointer",fontSize:"11px",padding:0}}>🗑</button></div></div>
          </div>))}
        </div>
      </>:<>
        {!bmarks.length&&<div style={{textAlign:"center",padding:"50px 20px",color:"#444"}}><div style={{fontSize:"36px",marginBottom:"10px"}}>🔖</div><div style={{fontSize:"13px"}}>북마크한 게시물이 없어요</div><div style={{fontSize:"11px",marginTop:"4px",color:"#333"}}>SNS 이미지 게시물의 🔖 버튼으로 저장하세요</div></div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"8px"}}>
          {bmarks.map(b=>(<div key={b.id} style={{background:"#12122a",borderRadius:"10px",border:"1px solid #2a2a4a",overflow:"hidden"}}>
            <div onClick={()=>setZoom({id:b.id,url:b.imageUrl,name:b.from,sub:b.text,kind:"bm"})} style={{cursor:"pointer"}}><img src={b.imageUrl} style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/></div>
            <div style={{padding:"6px 8px"}}><div style={{fontSize:"11px",fontWeight:"700",color:"#c084fc"}}>{b.avatar} {b.from}</div><div style={{fontSize:"10px",color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.text}</div><button onClick={()=>delBm(b.id)} style={{marginTop:"3px",background:"transparent",border:"none",color:"#e94560",cursor:"pointer",fontSize:"10px",padding:0}}>🗑 삭제</button></div>
          </div>))}
        </div>
        <div style={{marginTop:"20px",paddingTop:"14px",borderTop:"1px solid #2a2a4a"}}>
          {!confirmClear?<button onClick={()=>setConfirmClear(true)} style={{width:"100%",padding:"10px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"10px",cursor:"pointer",fontSize:"12px"}}>🗑 이미지 캐시 전체 삭제</button>
          :<div style={{display:"flex",gap:"8px"}}><button onClick={()=>setConfirmClear(false)} style={{flex:1,padding:"10px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"10px",cursor:"pointer",fontSize:"12px"}}>취소</button><button onClick={clearCache} style={{flex:1,padding:"10px",background:"#2a0a0a",border:"1px solid #e94560",color:"#e94560",borderRadius:"10px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>정말 삭제</button></div>}
          <div style={{fontSize:"10px",color:"#555",marginTop:"6px",textAlign:"center"}}>이미지 풀 + 북마크가 모두 삭제됩니다</div>
        </div>
      </>}
    </div>
    {zoom&&<div onClick={()=>setZoom(null)} style={{position:"absolute",inset:0,zIndex:50,background:"rgba(0,0,0,0.88)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px"}}>
      <img src={zoom.url} style={{maxWidth:"100%",maxHeight:"68%",objectFit:"contain",background:zoom.kind==="art"?"#fff":"transparent",borderRadius:"8px",boxShadow:"0 8px 40px rgba(124,58,237,0.5)"}}/>
      <div style={{marginTop:"12px",fontSize:"13px",fontWeight:"700"}}>{zoom.name}</div>
      <div style={{fontSize:"11px",color:"#888",marginTop:"2px",maxWidth:"90%",textAlign:"center"}}>{zoom.sub}</div>
      <div style={{display:"flex",gap:"10px",marginTop:"16px"}}>
        <button onClick={()=>setZoom(null)} style={{padding:"9px 20px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#aaa",borderRadius:"10px",cursor:"pointer",fontSize:"13px"}}>닫기</button>
        <button onClick={()=>zoom.kind==="art"?delArt(zoom.id):delBm(zoom.id)} style={{padding:"9px 20px",background:"#2a0a0a",border:"1px solid #e94560",color:"#e94560",borderRadius:"10px",cursor:"pointer",fontSize:"13px"}}>🗑 삭제</button>
      </div>
    </div>}
  </div>);
}
export function MajorlandScreen({state,setState}){
  const [toast,setToast]=useState(null);
  const [applyingEvent,setApplyingEvent]=useState(null);
  const [boothName,setBoothName]=useState((state.boothApp&&state.boothApp.name)||"");
  const [boothDesc,setBoothDesc]=useState((state.boothApp&&state.boothApp.desc)||"");
  const [selSize,setSelSize]=useState(state.boothSize||"small");
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),2400);return()=>clearTimeout(t);},[toast]);
  const sched=((state.genre&&state.genre.eventSchedule)||[]).filter(e=>e.endDay>=state.day).slice(0,10);
  const applied=(state.appliedEvents||[]);
  const curSize=BOOTH_SIZES.find(b=>b.id===(state.boothSize||"small"))||BOOTH_SIZES[0];
  const openApply=(ev)=>{
    if((state.fame||0)<ev.minFame){setToast({t:`인지도 ${ev.minFame} 이상 필요해요`,bad:true});return;}
    if(ev.requiresApplication&&state.day>ev.applyBy){setToast({t:"접수가 마감된 행사예요",bad:true});return;}
    setBoothName((state.boothApp&&state.boothApp.name)||((state.genre&&state.genre.name)?state.genre.name+" 서클":""));
    setBoothDesc((state.boothApp&&state.boothApp.desc)||"");
    setSelSize(state.boothSize||"small");
    setApplyingEvent(ev);
  };
  const sizeCfg=BOOTH_SIZES.find(b=>b.id===selSize)||BOOTH_SIZES[0];
  const sizeUpCost=applyingEvent?(sizeCfg.tiles>curSize.tiles?sizeCfg.price:0):0;
  const totalFee=applyingEvent?(applyingEvent.boothFee+sizeUpCost):0;
  const confirmApply=()=>{
    const ev=applyingEvent;if(!ev)return;
    if(!boothName.trim()){setToast({t:"서클 이름을 입력해주세요",bad:true});return;}
    if((state.gold||0)<totalFee){setToast({t:`골드 부족 (₩${totalFee.toLocaleString()} 필요)`,bad:true});return;}
    setState(s=>{let ns={...s,boothSize:selSize,activeEvent:ev,boothApp:{name:boothName.trim(),desc:boothDesc.trim(),submitted:true},appliedEvents:[...(s.appliedEvents||[]),ev.id]};if(totalFee>0)ns=logTx(ns,-totalFee,`${ev.name} 부스 신청비`,"🎪");return pushMessage(ns,{from:"Majorland",avatar:"🎪",text:`[접수 완료] ${ev.name} 부스 신청이 접수되었습니다. D-${Math.max(0,ev.startDay-s.day)}, 준비 잘 하세요!`});});
    setApplyingEvent(null);
    setToast({t:`✓ ${ev.name} 신청 완료! 🏪 부스 꾸미고 🎪 행사장에서 참가하세요`,bad:false});
  };
  const ae=state.activeEvent;
  const stageInfo=(ev)=>{const d=ev.startDay-state.day;if(d<=0)return {t:"오늘 행사! 🎪 행사장 탭에서 참가하세요",c:"#06d6a0"};if(d===1)return {t:"D-1 · 포장 & 부스 배치 마무리",c:"#ffd166"};if(d<=5)return {t:`D-${d} · 아크릴·회지 추가 주문 마감 임박!`,c:"#e94560"};if(d<=7)return {t:`D-${d} · 굿즈 주문 마감 권장`,c:"#ffd166"};return {t:`D-${d} · 준비 기간`,c:"#888"};};

  const header=(<div style={{padding:"12px 14px",background:"linear-gradient(135deg,#e94560,#7c3aed)",flexShrink:0}}><div style={{fontSize:"16px",fontWeight:"900",color:"#fff"}}>🎪 Majorland</div><div style={{fontSize:"10px",color:"#ffe"}}>동인 행사 참가 신청 플랫폼 · {state.genre?state.genre.name:"장르 미설정"}</div></div>);

  // ── 부스 신청서 단계 ──
  if(applyingEvent){const ev=applyingEvent;const dday=ev.startDay-state.day;
    return(<div style={{height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
      {header}
      {toast&&<div style={{padding:"8px 14px",fontSize:"12px",textAlign:"center",background:toast.bad?"#2a0a0a":"#0a2a1a",color:toast.bad?"#e94560":"#06d6a0",borderBottom:"1px solid #2a2a4a"}}>{toast.t}</div>}
      <div style={{padding:"14px"}}>
        <button onClick={()=>setApplyingEvent(null)} style={{padding:"5px 12px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"6px",cursor:"pointer",fontSize:"12px",marginBottom:"12px"}}>← 일정으로</button>
        <div style={{padding:"12px",background:"#1a0a2e",border:"1px solid #7c3aed",borderRadius:"12px",marginBottom:"14px"}}>
          <div style={{fontSize:"15px",fontWeight:"800",color:"#ffd166"}}>{ev.name}</div>
          <div style={{fontSize:"11px",color:"#888",marginTop:"3px"}}>{SCALE_LABEL[ev.scale]||ev.scale} · {ev.days===2?"양일":"하루"} · D-{Math.max(0,dday)} · 최대 {ev.maxSales}개</div>
        </div>
        <div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166",marginBottom:"10px"}}>📋 부스 신청서</div>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          <div><div style={{fontSize:"11px",color:"#888",marginBottom:"5px"}}>서클(부스) 이름 *</div>
            <input value={boothName} onChange={e=>setBoothName(e.target.value)} placeholder="예: 이브의 작업실" style={{width:"100%",padding:"10px 12px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"14px",boxSizing:"border-box"}}/></div>
          <div><div style={{fontSize:"11px",color:"#888",marginBottom:"5px"}}>부스 설명 (한줄)</div>
            <input value={boothDesc} onChange={e=>setBoothDesc(e.target.value.slice(0,60))} placeholder="달달한 자캐 굿즈 팝니다" style={{width:"100%",padding:"10px 12px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",borderRadius:"8px",fontSize:"13px",boxSizing:"border-box"}}/></div>
          <div><div style={{fontSize:"11px",color:"#888",marginBottom:"5px"}}>부스 크기</div>
            <div style={{display:"flex",gap:"6px"}}>{BOOTH_SIZES.map(sz=>{const sel=selSize===sz.id;const up=sz.tiles>curSize.tiles;return(<button key={sz.id} onClick={()=>setSelSize(sz.id)} style={{flex:1,padding:"8px 4px",borderRadius:"8px",background:sel?"linear-gradient(135deg,#7c3aed,#e94560)":"#12122a",border:`1px solid ${sel?"#a855f7":"#2a2a4a"}`,color:sel?"#fff":"#aaa",cursor:"pointer"}}><div style={{fontSize:"12px",fontWeight:"700"}}>{sz.name}</div><div style={{fontSize:"8px",color:sel?"#ffe":"#666",marginTop:"2px"}}>{sz.tiles}칸</div>{up&&sz.price>0&&<div style={{fontSize:"8px",color:"#ffd166",marginTop:"2px"}}>+₩{sz.price.toLocaleString()}</div>}</button>);})}</div></div>
          <div style={{padding:"10px 12px",background:"#12122a",borderRadius:"8px",border:"1px solid #2a2a4a"}}>
            <div style={{fontSize:"10px",color:"#888",marginBottom:"6px"}}>제출 굿즈 ({state.goods.length}종)</div>
            {state.goods.length?<div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>{state.goods.map(g=><span key={g.id} style={{fontSize:"11px",padding:"3px 8px",background:"#1a1a3a",borderRadius:"14px",color:"#c084fc"}}>{g.name} {g.stock}개</span>)}</div>:<div style={{fontSize:"11px",color:"#e94560"}}>제작된 굿즈가 없어요 ⚠ (굿즈팩토리에서 주문)</div>}
          </div>
          <div style={{padding:"12px",background:"#1a0a2e",borderRadius:"10px",border:"1px solid #7c3aed"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"#888",marginBottom:"3px"}}><span>부스비</span><span>₩{ev.boothFee.toLocaleString()}</span></div>
            {sizeUpCost>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"#888",marginBottom:"3px"}}><span>부스 확장 ({sizeCfg.name})</span><span>₩{sizeUpCost.toLocaleString()}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"15px",fontWeight:"900",color:"#ffd166"}}><span>합계</span><span>₩{totalFee.toLocaleString()}</span></div>
          </div>
          <button onClick={confirmApply} disabled={(state.gold||0)<totalFee||!boothName.trim()} style={{padding:"14px",background:((state.gold||0)>=totalFee&&boothName.trim())?"linear-gradient(135deg,#7c3aed,#e94560)":"#1a1a3a",border:"none",color:((state.gold||0)>=totalFee&&boothName.trim())?"#fff":"#555",fontWeight:"700",fontSize:"15px",borderRadius:"12px",cursor:((state.gold||0)>=totalFee&&boothName.trim())?"pointer":"not-allowed"}}>✦ 부스 신청 완료</button>
        </div>
      </div>
    </div>);
  }

  // ── 일정/신청 메인 ──
  return(<div style={{height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    {header}
    {toast&&<div style={{padding:"8px 14px",fontSize:"12px",textAlign:"center",background:toast.bad?"#2a0a0a":"#0a2a1a",color:toast.bad?"#e94560":"#06d6a0",borderBottom:"1px solid #2a2a4a"}}>{toast.t}</div>}
    <div style={{padding:"14px"}}>
      {ae&&(()=>{const st=stageInfo(ae);return(<div style={{padding:"12px",background:"#1a0a2e",border:"1px solid #7c3aed",borderRadius:"12px",marginBottom:"14px"}}>
        <div style={{fontSize:"10px",color:"#888"}}>참가 신청한 행사 · 부스: {(state.boothApp&&state.boothApp.name)||"-"}</div>
        <div style={{fontSize:"14px",fontWeight:"800",color:"#c084fc",marginTop:"2px"}}>{ae.name}</div>
        <div style={{fontSize:"11px",color:st.c,fontWeight:"700",marginTop:"5px"}}>{st.t}</div>
        <div style={{fontSize:"10px",color:"#666",marginTop:"4px",lineHeight:1.6}}>① 굿즈팩토리에서 굿즈 주문 → ② 부스 탭에서 꾸미기 → ③ 🎪 행사장 탭에서 참가</div>
      </div>);})()}
      <div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166",marginBottom:"10px"}}>📅 다가오는 행사 일정</div>
      {!state.genre&&<div style={{fontSize:"12px",color:"#888",textAlign:"center",padding:"20px"}}>장르를 먼저 만들면 일정이 생성돼요</div>}
      {state.genre&&!sched.length&&<div style={{fontSize:"12px",color:"#888",textAlign:"center",padding:"20px"}}>예정된 행사가 없어요</div>}
      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"16px"}}>
        {sched.map(ev=>{const dday=ev.startDay-state.day;const isApplied=applied.includes(ev.id)||(ae&&ae.id===ev.id);const fameOk=(state.fame||0)>=ev.minFame;const deadlineClosed=ev.requiresApplication&&state.day>ev.applyBy;const isToday=dday<=0;
          return(<div key={ev.id} style={{padding:"11px 12px",background:"#12122a",border:`1px solid ${isApplied?"#06d6a0":"#2a2a4a"}`,borderRadius:"11px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"8px"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"13px",fontWeight:"700"}}>{ev.name}</div>
                <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginTop:"4px"}}>
                  <span style={{fontSize:"9px",padding:"2px 7px",background:"#1a1a3a",borderRadius:"10px",color:"#c084fc"}}>{SCALE_LABEL[ev.scale]||ev.scale}</span>
                  <span style={{fontSize:"9px",padding:"2px 7px",background:"#1a1a3a",borderRadius:"10px",color:"#888"}}>{ev.days===2?"양일":"하루"}</span>
                  <span style={{fontSize:"9px",padding:"2px 7px",background:"#1a1a3a",borderRadius:"10px",color:ev.boothFee?"#ffd166":"#06d6a0"}}>{ev.boothFee?`부스비 ₩${ev.boothFee.toLocaleString()}`:"부스비 무료"}</span>
                  <span style={{fontSize:"9px",padding:"2px 7px",background:"#1a1a3a",borderRadius:"10px",color:"#888"}}>최대 {ev.maxSales}개</span>
                  {ev.minFame>0&&<span style={{fontSize:"9px",padding:"2px 7px",background:"#1a1a3a",borderRadius:"10px",color:fameOk?"#888":"#e94560"}}>인지도 {ev.minFame}+</span>}
                </div>
              </div>
              <div style={{textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:"15px",fontWeight:"900",color:isToday?"#06d6a0":dday<=7?"#ffd166":"#888"}}>{isToday?"D-DAY":`D-${dday}`}</div>
                <div style={{fontSize:"8px",color:"#555"}}>{ev.dayOfWeek==="sat"?"토":"일"}</div>
              </div>
            </div>
            <div style={{marginTop:"8px"}}>
              {isApplied?<div style={{fontSize:"11px",color:"#06d6a0",fontWeight:"700",textAlign:"center"}}>✓ 신청 완료</div>
              :deadlineClosed?<div style={{fontSize:"11px",color:"#666",textAlign:"center"}}>접수 마감 (D-{ev.startDay-ev.applyBy}까지)</div>
              :<button onClick={()=>openApply(ev)} disabled={!fameOk} style={{width:"100%",padding:"8px",background:fameOk?"linear-gradient(135deg,#7c3aed,#e94560)":"#1a1a3a",border:"none",color:fameOk?"#fff":"#555",borderRadius:"8px",cursor:fameOk?"pointer":"not-allowed",fontSize:"12px",fontWeight:"700"}}>📋 부스 신청서 작성 →</button>}
            </div>
          </div>);})}
      </div>
      <div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166",marginBottom:"8px"}}>📦 재고 현황</div>
      {state.goods.length?state.goods.map(g=><div key={g.id} style={{display:"flex",gap:"10px",alignItems:"center",padding:"8px 10px",background:"#12122a",borderRadius:"9px",border:"1px solid #2a2a4a",marginBottom:"6px"}}><img src={g.imageData} style={{width:"34px",height:"34px",objectFit:"contain",background:"#fff",borderRadius:"5px",flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:"700"}}>{g.name}</div><div style={{fontSize:"10px",color:"#888"}}>₩{g.price.toLocaleString()}</div></div><div style={{fontSize:"13px",fontWeight:"900",color:g.stock>5?"#06d6a0":"#ffd166"}}>{g.stock}개</div></div>):<div style={{fontSize:"11px",color:"#555",padding:"8px"}}>재고 없음 (굿즈팩토리에서 주문)</div>}
    </div>
  </div>);
}
export function GoodsFactoryScreen({state,setState}){
  const [view,setView]=useState("menu");
  const [step,setStep]=useState(1);
  const [arts,setArts]=useState([]);
  const [artId,setArtId]=useState(null);
  const [gtype,setGtype]=useState(null);
  const [qty,setQty]=useState(0);
  const [size,setSize]=useState("M");
  const [shape,setShape]=useState("circle");
  const [outline,setOutline]=useState(true);
  const [toast,setToast]=useState(null);
  useEffect(()=>{try{const raw=localStorage.getItem(SAVE_KEY);setArts(raw?JSON.parse(raw):[]);}catch(e){setArts([]);}},[view]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),2200);return()=>clearTimeout(t);},[toast]);
  const t=gtype?GOODS_TYPES.find(x=>x.id===gtype):null;
  const art=arts.find(a=>a.id===artId);
  const total=t?t.cost*qty:0;
  const startOrder=()=>{setView("order");setStep(1);setArtId(null);setGtype(null);setQty(0);setSize("M");setShape("circle");setOutline(true);};
  const selType=(id)=>{const tt=GOODS_TYPES.find(x=>x.id===id);setGtype(id);setQty(tt.minQty);setOutline(!!tt.outline);if(tt.shapes)setShape(tt.shapes[0]);setStep(3);};
  const finalize=(snap,opts,quantity,goodsType,outlineImage)=>{
    const tt=GOODS_TYPES.find(x=>x.id===goodsType);
    const order={id:Date.now()+Math.random(),artworkId:opts.artworkId,artworkSnapshot:snap,goodsType,options:{size:opts.size,shape:tt.shapes?opts.shape:undefined,hasOutline:tt.outline?opts.hasOutline:false,price:tt.basePrice,outlineImage:outlineImage||undefined},quantity,totalCost:tt.cost*quantity,orderedDay:state.day,readyDay:state.day+tt.prodDays,status:"making"};
    setState(s=>{const ns=logTx(s,-order.totalCost,`굿즈 제작 · ${tt.name} ${quantity}개`,"🏭");return {...ns,orders:[order,...(ns.orders||[])]};});
    setToast({t:`🏭 제작 시작! ${tt.name} ${quantity}개 · D-${tt.prodDays} 후 완성`,bad:false});
    setView("history");
  };
  const daysToEvent=(state.activeEvent)?(state.activeEvent.startDay-state.day):Infinity;
  const placeOrder=()=>{
    if(!art||!t)return;
    if(isEventDay(state)){setToast({t:"🎪 행사 당일엔 주문할 수 없어요",bad:true});return;}
    if(state.gold<total){setToast({t:"골드 부족!",bad:true});return;}
    if(t.prodDays>daysToEvent){setToast({t:`제작 ${t.prodDays}일 → 신청 행사(D-${Math.max(0,daysToEvent)}) 전까지 못 받아요`,bad:true});return;}
    const opts={artworkId:artId,size,shape,hasOutline:outline};
    if(t.outline&&outline){setToast({t:"외곽선 추출 중...",bad:false});buildOutline(art.thumb,(o)=>finalize(art.thumb,opts,qty,gtype,o));}
    else finalize(art.thumb,opts,qty,gtype,null);
  };
  const reorder=(o)=>{
    const tt=GOODS_TYPES.find(x=>x.id===o.goodsType);if(!tt)return;
    if(state.gold<o.totalCost){setToast({t:"골드 부족!",bad:true});return;}
    finalize(o.artworkSnapshot,{artworkId:o.artworkId,size:o.options.size,shape:o.options.shape,hasOutline:o.options.hasOutline},o.quantity,o.goodsType,o.options.outlineImage);
  };
  const orders=state.orders||[];
  const making=orders.filter(o=>o.status==="making");
  const wrap=(body)=>(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#ff9f43,#e94560)",flexShrink:0}}><div style={{fontSize:"16px",fontWeight:"900",color:"#fff"}}>🏭 굿즈팩토리</div><div style={{fontSize:"10px",color:"#fff8"}}>내 그림을 굿즈로! · 💰 ₩{state.gold.toLocaleString()}</div></div>
    {toast&&<div style={{padding:"8px 14px",fontSize:"12px",textAlign:"center",background:toast.bad?"#2a0a0a":"#0a2a1a",color:toast.bad?"#e94560":"#06d6a0",borderBottom:"1px solid #2a2a4a"}}>{toast.t}</div>}
    <div style={{flex:1,overflow:"auto"}}>{body}</div>
  </div>);
  if(view==="menu")return wrap(<div style={{padding:"16px",display:"flex",flexDirection:"column",gap:"12px"}}>
    <button onClick={startOrder} style={{padding:"18px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",fontSize:"15px",borderRadius:"14px",cursor:"pointer",textAlign:"left"}}>🆕 새 주문하기<div style={{fontSize:"11px",color:"#fff9",fontWeight:"400",marginTop:"3px"}}>갤러리 그림으로 굿즈 제작</div></button>
    <button onClick={()=>setView("history")} style={{padding:"18px",background:"#12122a",border:"1px solid #3a3a6a",color:"#e0e0ff",fontWeight:"700",fontSize:"15px",borderRadius:"14px",cursor:"pointer",textAlign:"left"}}>📜 주문 내역 <span style={{color:"#888",fontSize:"12px"}}>({orders.length})</span><div style={{fontSize:"11px",color:"#888",fontWeight:"400",marginTop:"3px"}}>지난 주문에서 재주문</div></button>
    <div style={{padding:"14px",background:"#12122a",border:"1px solid #2a2a4a",borderRadius:"14px"}}>
      <div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166",marginBottom:"8px"}}>🚚 제작 중 ({making.length})</div>
      {making.length?making.map(o=>{const tt=GOODS_TYPES.find(x=>x.id===o.goodsType);const dleft=o.readyDay-state.day;return(<div key={o.id} style={{display:"flex",gap:"10px",alignItems:"center",padding:"8px",background:"#0d0d22",borderRadius:"9px",marginBottom:"6px"}}><img src={o.artworkSnapshot} style={{width:"34px",height:"34px",objectFit:"contain",background:"#fff",borderRadius:"5px"}}/><div style={{flex:1}}><div style={{fontSize:"12px",fontWeight:"700"}}>{tt?tt.name:o.goodsType} {o.quantity}개</div><div style={{fontSize:"10px",color:"#888"}}>주문 Day{o.orderedDay}</div></div><div style={{fontSize:"12px",fontWeight:"900",color:dleft<=0?"#06d6a0":"#ffd166"}}>{dleft<=0?"완성!":`D-${dleft}`}</div></div>);}):<div style={{fontSize:"11px",color:"#555"}}>제작 중인 굿즈가 없어요</div>}
      <div style={{fontSize:"10px",color:"#666",marginTop:"6px"}}>💡 일상 탭 "하루 마치기"로 날짜가 지나면 완성돼요</div>
    </div>
  </div>);
  if(view==="history")return wrap(<div style={{padding:"14px"}}>
    <button onClick={()=>setView("menu")} style={{padding:"5px 12px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"6px",cursor:"pointer",fontSize:"12px",marginBottom:"12px"}}>← 메뉴</button>
    {!orders.length&&<div style={{textAlign:"center",color:"#555",padding:"40px",fontSize:"12px"}}>주문 내역이 없어요</div>}
    {orders.map(o=>{const tt=GOODS_TYPES.find(x=>x.id===o.goodsType);const st=o.status==="making"?{t:`D-${Math.max(0,o.readyDay-state.day)} 제작중`,c:"#ffd166"}:{t:"완료",c:"#06d6a0"};return(<div key={o.id} style={{display:"flex",gap:"10px",alignItems:"center",padding:"10px",background:"#12122a",borderRadius:"10px",border:"1px solid #2a2a4a",marginBottom:"7px"}}>
      <img src={o.artworkSnapshot} style={{width:"40px",height:"40px",objectFit:"contain",background:"#fff",borderRadius:"6px",flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}><div style={{fontSize:"12px",fontWeight:"700"}}>{tt?tt.name:o.goodsType} {o.quantity}개{o.options&&o.options.hasOutline?" ✂️":""}{o.options&&o.options.shape?` (${o.options.shape})`:""}</div><div style={{fontSize:"10px",color:"#888"}}>₩{o.totalCost.toLocaleString()} · Day{o.orderedDay}</div><div style={{fontSize:"10px",color:st.c,fontWeight:"700"}}>{st.t}</div></div>
      <button onClick={()=>reorder(o)} style={{padding:"6px 10px",background:state.gold>=o.totalCost?"#7c3aed":"#1a1a2a",border:"none",color:state.gold>=o.totalCost?"#fff":"#555",borderRadius:"7px",cursor:state.gold>=o.totalCost?"pointer":"not-allowed",fontSize:"11px",fontWeight:"700",flexShrink:0}}>재주문</button>
    </div>);})}
  </div>);
  // order flow
  return wrap(<div style={{padding:"14px"}}>
    <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"14px"}}>
      <button onClick={()=>step>1?setStep(step-1):setView("menu")} style={{padding:"5px 12px",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#888",borderRadius:"6px",cursor:"pointer",fontSize:"12px"}}>←</button>
      <div style={{flex:1,display:"flex",gap:"4px"}}>{[1,2,3,4].map(n=><div key={n} style={{flex:1,height:"4px",borderRadius:"2px",background:step>=n?"#7c3aed":"#2a2a4a"}}/>)}</div>
      <div style={{fontSize:"11px",color:"#888"}}>{step}/4</div>
    </div>
    {step===1&&<><div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166",marginBottom:"10px"}}>1. 그림 선택</div>
      {!arts.length&&<div style={{textAlign:"center",color:"#555",padding:"30px",fontSize:"12px"}}>스튜디오에서 그림을 먼저 그려 저장하세요</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>{arts.map(a=><div key={a.id} onClick={()=>{setArtId(a.id);setStep(2);}} style={{background:"#fff",borderRadius:"8px",overflow:"hidden",border:`2px solid ${artId===a.id?"#7c3aed":"#2a2a4a"}`,cursor:"pointer"}}><img src={a.thumb} style={{width:"100%",aspectRatio:"1",objectFit:"contain",display:"block"}}/></div>)}</div></>}
    {step===2&&<><div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166",marginBottom:"10px"}}>2. 굿즈 종류</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"8px"}}>{GOODS_TYPES.map(g=><button key={g.id} onClick={()=>selType(g.id)} style={{padding:"12px 10px",textAlign:"left",background:"#12122a",border:`1px solid ${gtype===g.id?"#7c3aed":"#2a2a4a"}`,borderRadius:"12px",cursor:"pointer",color:"#e0e0ff"}}><div style={{fontSize:"20px"}}>{g.icon}</div><div style={{fontSize:"13px",fontWeight:"700",marginTop:"3px"}}>{g.name}</div><div style={{fontSize:"10px",color:"#666",marginTop:"2px"}}>₩{g.cost.toLocaleString()}/개 · 최소 {g.minQty}</div><div style={{fontSize:"10px",color:"#ffd166",marginTop:"2px"}}>제작 {g.prodDays}일</div></button>)}</div></>}
    {step===3&&t&&<><div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166",marginBottom:"10px"}}>3. 옵션 설정 · {t.name}</div>
      <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
        <div><div style={{fontSize:"11px",color:"#888",marginBottom:"6px"}}>수량 ({t.minQty}~{t.maxQty})</div>
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>{[-50,-10,10,50].map(d=><button key={d} onClick={()=>setQty(q=>Math.max(t.minQty,Math.min(t.maxQty,q+d)))} style={{flex:1,padding:"8px 0",background:"#1a1a3a",border:"1px solid #3a3a6a",color:"#c084fc",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>{d>0?"+":""}{d}</button>)}</div>
          <div style={{textAlign:"center",fontSize:"20px",fontWeight:"900",color:"#fff",marginTop:"8px"}}>{qty}개</div>
        </div>
        <div><div style={{fontSize:"11px",color:"#888",marginBottom:"6px"}}>크기</div><div style={{display:"flex",gap:"6px"}}>{["S","M","L"].map(o=><button key={o} onClick={()=>setSize(o)} style={{flex:1,padding:"8px",background:size===o?"#7c3aed":"#12122a",border:`1px solid ${size===o?"#a855f7":"#2a2a4a"}`,color:size===o?"#fff":"#888",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>{o}</button>)}</div></div>
        {t.outline&&<div><div style={{fontSize:"11px",color:"#888",marginBottom:"6px"}}>외곽 따기 (이미지 모양대로 컷)</div><div style={{display:"flex",gap:"6px"}}>{[{v:true,t:"✂️ ON"},{v:false,t:"⬜ OFF(사각)"}].map(o=><button key={String(o.v)} onClick={()=>setOutline(o.v)} style={{flex:1,padding:"8px",background:outline===o.v?"#7c3aed":"#12122a",border:`1px solid ${outline===o.v?"#a855f7":"#2a2a4a"}`,color:outline===o.v?"#fff":"#888",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>{o.t}</button>)}</div></div>}
        {t.shapes&&<div><div style={{fontSize:"11px",color:"#888",marginBottom:"6px"}}>모양</div><div style={{display:"flex",gap:"6px"}}>{t.shapes.map(sv=>{const lbl=BADGE_SHAPES.find(b=>b.v===sv);return<button key={sv} onClick={()=>setShape(sv)} style={{flex:1,padding:"8px",background:shape===sv?"#7c3aed":"#12122a",border:`1px solid ${shape===sv?"#a855f7":"#2a2a4a"}`,color:shape===sv?"#fff":"#888",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontWeight:"700"}}>{lbl?lbl.t:sv}</button>;})}</div></div>}
        <button onClick={()=>setStep(4)} disabled={qty<t.minQty} style={{padding:"13px",background:qty>=t.minQty?"linear-gradient(135deg,#7c3aed,#e94560)":"#1a1a3a",border:"none",color:qty>=t.minQty?"#fff":"#555",fontWeight:"700",fontSize:"14px",borderRadius:"12px",cursor:qty>=t.minQty?"pointer":"not-allowed"}}>견적 확인 →</button>
      </div></>}
    {step===4&&t&&art&&<><div style={{fontSize:"13px",fontWeight:"700",color:"#ffd166",marginBottom:"10px"}}>4. 견적 확인</div>
      <div style={{display:"flex",gap:"12px",alignItems:"center",padding:"12px",background:"#12122a",borderRadius:"12px",border:"1px solid #2a2a4a",marginBottom:"12px"}}>
        <img src={art.thumb} style={{width:"56px",height:"56px",objectFit:"contain",background:"#fff",borderRadius:"8px"}}/>
        <div style={{flex:1}}><div style={{fontSize:"14px",fontWeight:"700"}}>{t.icon} {t.name}</div><div style={{fontSize:"11px",color:"#888",marginTop:"2px"}}>{qty}개 · {size}{t.outline?` · ${outline?"외곽따기":"사각"}`:""}{t.shapes?` · ${shape}`:""}</div><div style={{fontSize:"11px",color:"#ffd166",marginTop:"2px"}}>제작 {t.prodDays}일 → Day{state.day+t.prodDays} 완성</div></div>
      </div>
      {state.activeEvent&&t.prodDays>daysToEvent&&<div style={{padding:"9px 12px",background:"#2a0a0a",border:"1px solid #e94560",borderRadius:"10px",marginBottom:"12px",fontSize:"11px",color:"#e94560",lineHeight:1.6}}>⚠️ 신청한 <b>{state.activeEvent.name}</b>(D-{Math.max(0,daysToEvent)}) 전까지 제작이 안 끝나요 (제작 {t.prodDays}일). 다음 행사용으로만 쓸 수 있어요.</div>}
      <div style={{padding:"12px",background:"#1a0a2e",borderRadius:"12px",border:"1px solid #7c3aed",marginBottom:"12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"#888",marginBottom:"4px"}}><span>단가 × 수량</span><span>₩{t.cost.toLocaleString()} × {qty}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:"16px",fontWeight:"900",color:"#ffd166"}}><span>총액</span><span>₩{total.toLocaleString()}</span></div>
        <div style={{fontSize:"10px",color:state.gold>=total?"#06d6a0":"#e94560",textAlign:"right",marginTop:"3px"}}>{state.gold>=total?`결제 후 ₩${(state.gold-total).toLocaleString()}`:"골드 부족!"}</div>
      </div>
      <button onClick={placeOrder} disabled={state.gold<total} style={{width:"100%",padding:"14px",background:state.gold>=total?"linear-gradient(135deg,#7c3aed,#e94560)":"#1a1a3a",border:"none",color:state.gold>=total?"#fff":"#555",fontWeight:"700",fontSize:"15px",borderRadius:"12px",cursor:state.gold>=total?"pointer":"not-allowed"}}>✦ 주문 완료 (제작 시작)</button>
    </>}
  </div>);
}

export function PhoneOverlay({state,setState,onClose}){
  const [app,setApp]=useState("home");
  const goHome=()=>{if(app!=="home")setApp("home");else onClose();};
  return(<div style={{position:"absolute",inset:0,zIndex:1000,background:"rgba(0,0,0,0.55)",display:"flex",flexDirection:"column"}}>
    <div style={{flex:1}} onClick={onClose}/>
    <div style={{height:"94%",display:"flex",flexDirection:"column",background:"#0d0d1a",borderTopLeftRadius:"22px",borderTopRightRadius:"22px",overflow:"hidden",boxShadow:"0 -8px 40px rgba(0,0,0,0.6)",border:"1px solid #2a2a4a"}}>
      <StatusBar onClose={onClose}/>
      <div style={{flex:1,overflow:"hidden",position:"relative"}}>
        {app==="home"&&<PhoneHome state={state} onOpen={setApp}/>}
        {app==="sns"&&<SNSScreen state={state} setState={setState} onOpenProfile={()=>setApp("profile")}/>}
        {app==="profile"&&<ProfileScreen state={state} setState={setState}/>}
        {app==="matalk"&&<MatalkScreen/>}
        {app==="gallery"&&<GalleryScreen/>}
        {app==="factory"&&<GoodsFactoryScreen state={state} setState={setState}/>}
        {app==="majorland"&&<MajorlandScreen state={state} setState={setState}/>}
        {app==="genre"&&<GenreScreen state={state} setState={setState}/>}
      </div>
      <HomeIndicator onHome={goHome}/>
    </div>
  </div>);
}
