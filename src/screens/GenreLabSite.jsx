import { useState } from "react";
import { CP_TYPES, MEDIA_LIST, MEDIA_GENRES, APPEARANCE_TAGS, PERSONALITY_TAGS, CONCEPT_TAGS, POSITION_TAGS, POPULARITY_TAGS, POP_TIP, VIBE_TAGS, BG_TAGS, AU_TAGS, GTYPE_LIST, ALLCHAR_MODES, CP_FIX, CP_STRENGTH, CP_CONTACT, CP_POP } from "../data/gameData.js";
import { switchActiveGenre, canAddGenre, generateGenreName, legacyFields } from "../systems/genreSystem.js";
import { generateEventSchedule } from "../systems/eventSystem.js";
import { buildNpcRoster, saveRoster } from "../systems/tweetSystem.js";
import { CLOSE_REASONS, hiatusGenre, resumeGenre, closeGenre, refandomBonus, applyRefandom } from "../systems/endingSystem.js";

/* ============================================================
   장르연구소 GenreLab — 인터넷 브라우저 속 "덕질 장르 정의 서비스" 사이트
   기존 GenreScreen(세로/다크)의 로직을 그대로 옮기고, 밝은 웹 서비스 톤으로 리뉴얼.
   위저드: ①매체 ②타입 ③캐릭터 ④CP ⑤분위기 ⑥추가 ⑦확인 → 저장 시 NPC 로스터 생성
   ============================================================ */

const T={text:"#2c2542",mut:"#8a80a8",dim:"#b6aed0",bd:"#e6ddf6",pri:"#7c3aed",acc:"#e94560"};
const blue={bg:"#e8f4fd",bd:"#7cc7ee",fg:"#0f7bb0"},purple={bg:"#f1e8ff",bd:"#c9a8f5",fg:"#7c3aed"},pink={bg:"#ffe9f0",bd:"#f2a5b8",fg:"#d13a5a"};
const card={background:"#fff",border:`1px solid ${T.bd}`,borderRadius:16,boxShadow:"0 2px 12px rgba(124,58,237,0.07)"};
const inputSt={width:"100%",padding:"10px 13px",background:"#fff",border:"1px solid #d9d0ee",color:T.text,borderRadius:9,fontSize:14,boxSizing:"border-box"};

export default function GenreLabSite({state,setState}){
  const g=state.genre;
  const blankChar=()=>({id:"c"+Date.now()+Math.floor(Math.random()*9999),name:"",appearanceTags:[],personalityTags:[],conceptTags:[],position:"",popularity:""});
  const freshDraft=()=>({name:"",media:"",mediaGenre:"",type:"",allcharMode:"",characters:[blankChar()],cp:null,vibes:[],background:"",description:"",nickname:"",birthday:null,famousLine:"",auTags:[]});
  const [editing,setEditing]=useState(!g);
  const [mode,setMode]=useState(g?"edit":"new");
  const [step,setStep]=useState(1);
  const [draft,setDraft]=useState(()=>(g&&g.characters)?{...g}:freshDraft());
  const [eChar,setEChar]=useState(null);
  const [ending,setEnding]=useState(null);      // null | "hiatus" | "close" — 계정 정리 모달
  const [reasonSel,setReasonSel]=useState(null); // 탈덕 사유

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
      const first=(s.genres||[]).length===0;
      let genres=(s.genres||[]).map(g0=>g0.id===s.activeGenreId?{...g0,fame:s.fame,followers:s.followers,fanTrust:s.fanTrust,engagement:s.engagement,snsHistory:s.snsHistory}:g0);
      const id="genre_"+Date.now();
      const ng={...base,id,createdDay:s.day,isActive:true,fame:0,followers:0,fanTrust:50,engagement:50,assignedNPCs:assigned,imageTicketUsed:0,imageTicketMax:5,eventHistory:[],snsHistory:[],statsAt:JSON.parse(JSON.stringify(s.stats||{spend:{},earn:{}}))};
      ng.eventSchedule=generateEventSchedule(ng,s.day);
      genres=[...genres,ng];
      const cost=first?{}:{stamina:Math.max(0,(s.stamina||0)-20),mentalHealth:Math.max(0,(s.mentalHealth||0)-10)};
      let out={...s,genres,activeGenreId:id,genre:ng,npcRoster:assigned,fame:0,followers:0,fanTrust:50,engagement:50,snsHistory:[],...cost};
      // 복덕(재파기): 탈덕했던 장르를 다시 파면 옛 팬이 알아본다
      const rb=refandomBonus(out,finalName);
      if(rb)out=applyRefandom(out,rb);
      return out;
    });
    setEditing(false);setStep(1);
  };

  const tagBtns=(list,sel,onTog,col)=>(<div style={{display:"flex",flexWrap:"wrap",gap:7}}>{list.map(o=>{const v=typeof o==="string"?o:o.t;const lb=typeof o==="string"?o:`${o.e} ${o.t}`;const on=sel.includes(v);return<button key={v} onClick={()=>onTog(v)} style={{padding:"6px 13px",fontSize:13,background:on?col.bg:"#fff",border:`1px solid ${on?col.bd:T.bd}`,color:on?col.fg:T.mut,borderRadius:18,cursor:"pointer",fontWeight:on?700:400}}>{lb}</button>;})}</div>);
  const lbl=(t)=><div style={{fontSize:13,color:T.mut,margin:"14px 0 7px",fontWeight:700}}>{t}</div>;
  const siteHeader=(<div style={{textAlign:"center",padding:"26px 0 18px"}}>
    <div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"12px 34px",background:"linear-gradient(135deg,#7c3aed,#a855f7)",borderRadius:16,color:"#fff",fontWeight:900,fontSize:26,letterSpacing:1,boxShadow:"0 6px 20px rgba(124,58,237,0.35)"}}>🧪 장르연구소</div>
    <div style={{fontSize:13,color:T.mut,marginTop:9}}>GenreLab — 내가 파는 장르를 정의하는 실험실</div>
  </div>);

  // ── 휴덕 중 목록 + 기록 보관소 (카드 뷰/위저드 하단 공용) ──
  const hiatusList=(state.genres||[]).filter(x=>x.status==="hiatus");
  const archive=state.archive||[];
  const archiveSection=(<>
    {hiatusList.length>0&&<div style={{marginTop:18}}>
      <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:10}}>😴 휴덕 중 <span style={{color:T.dim,fontSize:12}}>({hiatusList.length})</span></div>
      {hiatusList.map(hg=>(<div key={hg.id} style={{...card,padding:"14px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:800,color:T.text}}>{hg.name}</div>
          <div style={{fontSize:11,color:T.mut,marginTop:2}}>Day {hg.hiatusDay}부터 휴덕 · 팔로워 {(hg.followers||0).toLocaleString()} 보존 중</div>
        </div>
        <button onClick={()=>setState(s=>resumeGenre(s,hg.id))} style={{padding:"9px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>복귀하기</button>
      </div>))}
      <div style={{fontSize:11,color:T.dim,marginTop:4}}>복귀 시 팔로워 70% · 인지도 80%만 남아요 (팬들도 기다리다 지쳐요)</div>
    </div>}
    {archive.length>0&&<div style={{marginTop:18}}>
      <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:10}}>🗄 기록 보관소 <span style={{color:T.pri}}>({archive.length})</span> <span style={{fontSize:11,color:T.dim,fontWeight:400}}>— 끝난 덕질은 사라지지 않고 여기 남는다</span></div>
      {[...archive].reverse().map(m=>(<div key={m.id} style={{...card,padding:18,marginBottom:10,background:"linear-gradient(135deg,#fff,#faf6ef)"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:16,fontWeight:900,color:"#6a5a3e"}}>{m.genreName}</span>
          <span style={{fontSize:11,color:T.dim}}>{m.media}</span>
          <span style={{marginLeft:"auto",fontSize:12,color:T.mut,fontWeight:700}}>{m.reasonIcon} {m.reasonLabel}</span>
        </div>
        <div style={{fontSize:12,color:T.mut,marginTop:6,lineHeight:1.7}}>Day {m.createdDay} ~ {m.closedDay} · <b>{m.days}일의 덕질</b> · 행사 {m.events}회 · 총 판매 ₩{(m.totalSales||0).toLocaleString()} · 팔로워 {(m.followers||0).toLocaleString()} · 인지도 {m.fame}pt{m.refandomCount?<span style={{color:T.acc}}> · 🔁 복덕 {m.refandomCount}회</span>:null}</div>
        {(m.goldAtClose!=null||m.spendTop&&m.spendTop.length>0)&&<div style={{fontSize:12,color:"#8a7a5e",marginTop:5,lineHeight:1.7}}>
          {m.goldAtClose!=null&&<>💰 지갑에 ₩{m.goldAtClose.toLocaleString()}을 남기고 떠났다</>}
          {m.spendTop&&m.spendTop.length>0&&<> · 그동안 태운 곳: {m.spendTop.map(x=>`${x.label} ₩${x.amount.toLocaleString()}`).join(" · ")}</>}
        </div>}
        {m.highlights&&m.highlights.length>0&&<div style={{marginTop:10,borderTop:`1px dashed ${T.bd}`,paddingTop:9}}>
          <div style={{fontSize:10,color:T.dim,marginBottom:4}}>그때의 타임라인</div>
          {m.highlights.map((h,i)=><div key={i} style={{fontSize:12,color:"#7a6a52",lineHeight:1.8}}>💬 "{h.text}" <span style={{color:T.dim,fontSize:10}}>— {h.from} · ♥{h.likes}</span></div>)}
        </div>}
      </div>))}
      <div style={{fontSize:11,color:T.dim}}>💡 같은 이름의 장르를 다시 만들면(복덕) 옛 팬 일부가 알아봐요.</div>
    </div>}
  </>);

  // ── 계정 정리 모달 ──
  const endingModal=ending&&g&&(<div onClick={()=>{setEnding(null);setReasonSel(null);}} style={{position:"fixed",inset:0,zIndex:90,background:"rgba(30,20,60,0.45)",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:440,background:"#fff",borderRadius:20,padding:26,boxShadow:"0 20px 60px rgba(30,20,60,0.35)"}}>
      {ending==="hiatus"?(<>
        <div style={{fontSize:18,fontWeight:900,color:T.text,marginBottom:8}}>😴 {g.name} — 휴덕할까요?</div>
        <div style={{fontSize:13,color:T.mut,lineHeight:1.9,marginBottom:18}}>계정은 그대로 두고 활동만 쉽니다.<br/>언제든 복귀할 수 있지만, 쉬는 동안 <b>팔로워 30%·인지도 20%가 떠나요.</b></div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setEnding(null)} style={{flex:1,padding:12,borderRadius:11,border:`1px solid ${T.bd}`,background:"#fff",color:T.mut,fontWeight:700,cursor:"pointer"}}>취소</button>
          <button onClick={()=>{setState(s=>hiatusGenre(s,g.id));setEnding(null);}} style={{flex:2,padding:12,borderRadius:11,border:"none",background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",fontWeight:800,cursor:"pointer"}}>😴 휴덕한다</button>
        </div>
      </>):(<>
        <div style={{fontSize:18,fontWeight:900,color:T.text,marginBottom:6}}>🍂 {g.name} — 계정을 정리할까요?</div>
        <div style={{fontSize:13,color:T.mut,lineHeight:1.8,marginBottom:14}}>{g.name}에서의 시간이 <b>회고록으로 보관소에 영구히 남고</b>, 계정은 닫힙니다.<br/>사유를 골라주세요 — 회고록에 함께 기록돼요.</div>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
          {CLOSE_REASONS.map(r=>(<button key={r.id} onClick={()=>setReasonSel(r.id)} style={{padding:"11px 14px",borderRadius:11,textAlign:"left",border:`1.5px solid ${reasonSel===r.id?T.pri:T.bd}`,background:reasonSel===r.id?purple.bg:"#fff",color:reasonSel===r.id?T.pri:T.mut,fontSize:13,fontWeight:700,cursor:"pointer"}}>{r.icon} {r.label}</button>))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>{setEnding(null);setReasonSel(null);}} style={{flex:1,padding:12,borderRadius:11,border:`1px solid ${T.bd}`,background:"#fff",color:T.mut,fontWeight:700,cursor:"pointer"}}>더 팔래요</button>
          <button disabled={!reasonSel} onClick={()=>{setState(s=>closeGenre(s,g.id,reasonSel));setEnding(null);setReasonSel(null);}} style={{flex:2,padding:12,borderRadius:11,border:"none",background:reasonSel?"linear-gradient(135deg,#b98756,#8a6a3e)":"#eee6f8",color:reasonSel?"#fff":T.dim,fontWeight:800,cursor:reasonSel?"pointer":"not-allowed"}}>🍂 계정 정리 (탈덕)</button>
        </div>
      </>)}
    </div>
  </div>);

  // ── 카드 뷰 (나의 장르) ──
  if(!editing&&g)return(<div style={{minHeight:"100%",background:"linear-gradient(180deg,#faf7ff,#f1eafd)",fontFamily:"'Noto Sans KR',sans-serif",padding:"0 40px 60px"}}>
    {siteHeader}
    <div style={{maxWidth:760,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:T.text}}>📚 나의 장르 <span style={{color:T.pri}}>({(state.genres||[]).length||1}개)</span></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>startEdit("edit")} style={{padding:"8px 18px",background:"#fff",border:`1px solid ${T.bd}`,color:T.mut,borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:700}}>수정</button>
          <button onClick={()=>{if(canAddGenre(state))startEdit("new");}} disabled={!canAddGenre(state)} title={!canAddGenre(state)?"최대 5개 / 체력30·멘탈40 필요":""} style={{padding:"8px 18px",background:canAddGenre(state)?"linear-gradient(135deg,#7c3aed,#e94560)":"#eee6f8",border:"none",color:canAddGenre(state)?"#fff":T.dim,borderRadius:9,cursor:canAddGenre(state)?"pointer":"not-allowed",fontSize:13,fontWeight:700}}>＋ 새 장르</button>
        </div>
      </div>
      {(state.genres||[]).filter(x=>x.status!=="hiatus").length>1&&<div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:14,paddingBottom:2}}>
        {(state.genres||[]).filter(x=>x.status!=="hiatus").map(gg=><button key={gg.id} onClick={()=>setState(s=>switchActiveGenre(s,gg.id))} style={{flexShrink:0,padding:"7px 15px",background:gg.id===state.activeGenreId?purple.bg:"#fff",border:`1px solid ${gg.id===state.activeGenreId?purple.bd:T.bd}`,color:gg.id===state.activeGenreId?T.pri:T.mut,borderRadius:18,cursor:"pointer",fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>{gg.name} <span style={{fontSize:10,color:T.dim}}>·{(gg.id===state.activeGenreId?state.followers:gg.followers||0)}</span></button>)}
      </div>}
      {!canAddGenre(state)&&(state.genres||[]).length<5&&<div style={{fontSize:12,color:T.dim,marginBottom:12}}>💤 새 장르를 추가하려면 체력 30·멘탈 40 이상이 필요해요 (추가 시 체력 -20·멘탈 -10)</div>}
      <div style={{...card,background:"linear-gradient(135deg,#fff,#f6efff)",padding:26,marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-26,right:-26,width:130,height:130,borderRadius:"50%",background:"radial-gradient(circle,#7c3aed18,transparent)",pointerEvents:"none"}}/>
        <div style={{fontSize:26,fontWeight:900,marginBottom:6,color:T.pri}}>{g.name}</div>
        {(g.media||g.type)&&<div style={{fontSize:12,color:blue.fg,marginBottom:8,fontWeight:700}}>{[g.media,g.mediaGenre,g.type].filter(Boolean).join(" · ")}</div>}
        <div style={{fontSize:13,color:T.mut,marginBottom:12}}>{g.chars}</div>
        {g.cpType&&g.cpType!=="none"&&<div style={{fontSize:12,padding:"4px 12px",background:purple.bg,borderRadius:20,display:"inline-block",color:T.pri,marginBottom:10,fontWeight:700}}>{CP_TYPES.find(ct=>ct.id===g.cpType)?.label}</div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{(g.tags||[]).map(t=><span key={t} style={{fontSize:12,padding:"4px 12px",background:blue.bg,border:`1px solid ${blue.bd}`,borderRadius:20,color:blue.fg}}>#{t}</span>)}</div>
        {g.nickname&&<div style={{fontSize:12,color:"#b98700",marginBottom:6}}>💕 애칭: {g.nickname}</div>}
        {g.desc&&<div style={{fontSize:13,color:"#5c5478",lineHeight:1.8,borderTop:`1px solid ${T.bd}`,paddingTop:12}}>{g.desc}</div>}
        <div style={{display:"flex",gap:8,marginTop:14,borderTop:`1px dashed ${T.bd}`,paddingTop:12}}>
          <span style={{fontSize:11,color:T.dim,alignSelf:"center",marginRight:"auto"}}>이 장르, 계속 팔까...?</span>
          <button onClick={()=>setEnding("hiatus")} style={{padding:"8px 16px",borderRadius:9,border:`1px solid ${T.bd}`,background:"#fff",color:T.mut,fontSize:12,fontWeight:700,cursor:"pointer"}}>😴 휴덕</button>
          <button onClick={()=>setEnding("close")} style={{padding:"8px 16px",borderRadius:9,border:"1px solid #d9c5a8",background:"#faf6ef",color:"#8a6a3e",fontSize:12,fontWeight:700,cursor:"pointer"}}>🍂 계정 정리 (탈덕)</button>
        </div>
      </div>
      {(g.characters&&g.characters.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>{g.characters.map(c=><div key={c.id} style={{...card,padding:"12px 15px"}}><div style={{fontSize:14,fontWeight:700,color:T.text}}>{c.name} {c.popularity&&<span style={{fontSize:11,color:T.mut,fontWeight:400}}>· {c.popularity}</span>}</div><div style={{fontSize:11,color:T.dim,marginTop:4,lineHeight:1.6}}>{[...(c.appearanceTags||[]),...(c.personalityTags||[]),...(c.conceptTags||[])].join(" · ")||"태그 미설정"}</div></div>)}</div>}
      <div style={{...card,padding:"13px 16px",fontSize:13,color:T.mut,lineHeight:1.8}}>💡 장르 정보가 mabo NPC 반응·계정 선택·굿즈 반응에 반영됩니다.</div>
      {archiveSection}
    </div>
    {endingModal}
  </div>);

  // ── 위저드 ──
  const stepBar=(<div style={{display:"flex",gap:5,marginBottom:18}}>
    {[["①","매체"],["②","타입"],["③","캐릭터"],["④","CP"],["⑤","분위기"],["⑥","추가"]].map(([n,l],i)=>{const sn=i+1;const cpStep=sn===4;const dim=cpStep&&draft.type!=="CP";const cur=step===sn;const done=step>sn;return<div key={sn} style={{flex:1,textAlign:"center",padding:"8px 2px",borderRadius:10,background:cur?"#fff":"transparent",border:`1px solid ${cur?purple.bd:"transparent"}`,opacity:dim?0.35:1,boxShadow:cur?"0 2px 10px rgba(124,58,237,0.15)":"none"}}><div style={{fontSize:14,color:cur?T.pri:done?"#9d8fc8":T.dim}}>{done?"✓":n}</div><div style={{fontSize:9,color:cur?T.pri:T.dim,fontWeight:700}}>{l}</div></div>;})}
  </div>);
  const navBar=(canNext,nextLabel)=>(<div style={{display:"flex",gap:10,padding:"16px 0 0",marginTop:18,borderTop:`1px solid ${T.bd}`}}>
    <button onClick={goBack} disabled={step===1} style={{flex:1,padding:12,background:"#fff",border:`1px solid ${T.bd}`,color:step===1?T.dim:T.mut,borderRadius:11,cursor:step===1?"not-allowed":"pointer",fontSize:14,fontWeight:700}}>← 뒤로</button>
    {(step>=5&&step<=6)&&<button onClick={goNext} style={{flex:1,padding:12,background:"#fff",border:`1px solid ${T.bd}`,color:T.mut,borderRadius:11,cursor:"pointer",fontSize:14}}>건너뛰기</button>}
    <button onClick={goNext} disabled={!canNext} style={{flex:2,padding:12,background:canNext?"linear-gradient(135deg,#7c3aed,#e94560)":"#eee6f8",border:"none",color:canNext?"#fff":T.dim,fontWeight:700,fontSize:14,borderRadius:11,cursor:canNext?"pointer":"not-allowed"}}>{nextLabel||"다음 →"}</button>
  </div>);
  const h2=(t,sub)=><><div style={{fontSize:17,fontWeight:800,color:T.text,marginBottom:sub?4:16}}>{t}</div>{sub&&<div style={{fontSize:12,color:T.mut,marginBottom:16}}>{sub}</div>}</>;

  let body=null,canNext=true,nextLabel="다음 →";
  if(step===1){canNext=!!draft.media;const subs=MEDIA_GENRES[draft.media];
    body=<>{h2("어떤 작품 분위기인가요?","실제 원작이 없어도 세계관 느낌으로 골라요")}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:16}}>{MEDIA_LIST.map(m=><button key={m} onClick={()=>upd({media:m,mediaGenre:""})} style={{padding:"17px 6px",background:draft.media===m?"linear-gradient(135deg,#7c3aed,#a855f7)":"#fff",border:`1px solid ${draft.media===m?"#a855f7":T.bd}`,color:draft.media===m?"#fff":T.mut,borderRadius:13,cursor:"pointer",fontSize:14,fontWeight:700}}>{m}</button>)}</div>
      {subs&&<>{lbl("세부 장르")}{tagBtns(subs,draft.mediaGenre?[draft.mediaGenre]:[],v=>upd({mediaGenre:draft.mediaGenre===v?"":v}),blue)}</>}</>;
  } else if(step===2){canNext=!!draft.type;
    body=<>{h2("장르 타입")}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:16}}>{GTYPE_LIST.map(o=><button key={o.v} onClick={()=>upd({type:o.v,cp:o.v==="CP"?(draft.cp||{type:"고정충",gongId:"",suId:"",fixStrength:"선호 있음",contact:"모름",cpPopularity:"해당없음"}):null})} style={{padding:16,textAlign:"left",background:draft.type===o.v?purple.bg:"#fff",border:`1.5px solid ${draft.type===o.v?T.pri:T.bd}`,borderRadius:13,cursor:"pointer",color:draft.type===o.v?T.pri:T.mut}}><div style={{fontSize:15,fontWeight:800}}>{draft.type===o.v?"● ":"○ "}{o.v}</div><div style={{fontSize:11,color:T.mut,marginTop:3}}>{o.d}</div></button>)}</div>
      {draft.type==="올캐"&&<>{lbl("올캐 세부")}{tagBtns(ALLCHAR_MODES,draft.allcharMode?[draft.allcharMode]:[],v=>upd({allcharMode:draft.allcharMode===v?"":v}),blue)}</>}</>;
  } else if(step===3){canNext=!!named.length;
    body=<>{h2(`캐릭터 등록 (${draft.characters.length}/5)`,"게임 속에선 전부 공식 캐릭터예요")}
      {draft.characters.map((c)=>(<div key={c.id} style={{...card,marginBottom:9,border:`1.5px solid ${eChar===c.id?T.pri:T.bd}`,overflow:"hidden"}}>
        <div style={{display:"flex",gap:9,alignItems:"center",padding:"11px 13px"}}>
          <input value={c.name} onChange={e=>updChar(c.id,{name:e.target.value})} placeholder="캐릭터 이름 *" style={{...inputSt,flex:1,width:"auto"}}/>
          <button onClick={()=>setEChar(eChar===c.id?null:c.id)} style={{padding:"9px 14px",background:purple.bg,border:`1px solid ${purple.bd}`,color:T.pri,borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,flexShrink:0}}>{eChar===c.id?"접기":"태그▾"}</button>
          {draft.characters.length>1&&<button onClick={()=>{delChar(c.id);if(eChar===c.id)setEChar(null);}} style={{padding:"7px 9px",background:"transparent",border:"none",color:T.acc,cursor:"pointer",fontSize:14,flexShrink:0}}>🗑</button>}
        </div>
        {eChar===c.id&&<div style={{padding:"2px 14px 14px",borderTop:`1px solid ${T.bd}`,background:"#fbf9ff"}}>
          {lbl(`외형 (${c.appearanceTags.length}/5)`)}{tagBtns(APPEARANCE_TAGS,c.appearanceTags,v=>togCharTag(c.id,"appearanceTags",v,5),blue)}
          {lbl(`성격 (${c.personalityTags.length}/3)`)}{tagBtns(PERSONALITY_TAGS,c.personalityTags,v=>togCharTag(c.id,"personalityTags",v,3),purple)}
          {lbl(`컨셉 (${c.conceptTags.length}/3)`)}{tagBtns(CONCEPT_TAGS,c.conceptTags,v=>togCharTag(c.id,"conceptTags",v,3),pink)}
          {lbl("원작 내 포지션")}{tagBtns(POSITION_TAGS,c.position?[c.position]:[],v=>updChar(c.id,{position:c.position===v?"":v}),blue)}
          {lbl("팬덤 규모")}{tagBtns(POPULARITY_TAGS,c.popularity?[c.popularity]:[],v=>updChar(c.id,{popularity:c.popularity===v?"":v}),purple)}
          {c.popularity&&<div style={{fontSize:11,color:T.mut,marginTop:6}}>ℹ️ {POP_TIP[c.popularity]}</div>}
        </div>}
      </div>))}
      {draft.characters.length<5&&<button onClick={addChar} style={{width:"100%",padding:12,background:"#fff",border:`1.5px dashed ${purple.bd}`,color:T.pri,borderRadius:11,cursor:"pointer",fontSize:14,fontWeight:700}}>＋ 캐릭터 추가</button>}</>;
  } else if(step===4){const cp=draft.cp||{};canNext=!!cp.type;
    body=<>{h2("CP 설정")}
      {lbl("CP 유형")}<div style={{display:"flex",gap:8}}>{CP_FIX.map(v=><button key={v} onClick={()=>setCp({type:v})} style={{flex:1,padding:"11px 4px",background:cp.type===v?purple.bg:"#fff",border:`1.5px solid ${cp.type===v?T.pri:T.bd}`,color:cp.type===v?T.pri:T.mut,borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700}}>{v}</button>)}</div>
      {cp.type==="고정충"&&<>{lbl("누가 공인가요?")}{tagBtns(named.map(c=>c.name||"이름없음"),named.filter(c=>c.id===cp.gongId).map(c=>c.name||"이름없음"),v=>{const c=named.find(x=>(x.name||"이름없음")===v);if(c)setCp({gongId:c.id,suId:cp.suId===c.id?"":cp.suId});},blue)}</>}
      {lbl("CP 상대(수)는?")}<div style={{display:"flex",flexWrap:"wrap",gap:7}}>{named.filter(c=>c.id!==cp.gongId).map(c=><button key={c.id} onClick={()=>setCp({suId:c.id})} style={{padding:"6px 13px",background:cp.suId===c.id?pink.bg:"#fff",border:`1px solid ${cp.suId===c.id?pink.bd:T.bd}`,color:cp.suId===c.id?pink.fg:T.mut,borderRadius:18,cursor:"pointer",fontSize:13}}>{c.name||"이름없음"}</button>)}<button onClick={()=>setCp({suId:"dream"})} style={{padding:"6px 13px",background:cp.suId==="dream"?pink.bg:"#fff",border:`1px solid ${cp.suId==="dream"?pink.bd:T.bd}`,color:cp.suId==="dream"?pink.fg:T.mut,borderRadius:18,cursor:"pointer",fontSize:13}}>드림/불특정</button></div>
      {lbl("고집 강도")}{tagBtns(CP_STRENGTH,cp.fixStrength?[cp.fixStrength]:[],v=>setCp({fixStrength:v}),purple)}
      {lbl("원작 접점")}{tagBtns(CP_CONTACT,cp.contact?[cp.contact]:[],v=>setCp({contact:v}),blue)}
      {lbl("팬덤 내 CP 위치")}{tagBtns(CP_POP,cp.cpPopularity?[cp.cpPopularity]:[],v=>setCp({cpPopularity:v}),pink)}
      {cp.cpPopularity==="나 혼자 파는 중"&&<div style={{fontSize:11,color:T.mut,marginTop:6}}>ℹ️ 심해어·혼자 파는 NPC 비율이 늘어나요</div>}</>;
  } else if(step===5){
    body=<>{h2("세계관 분위기")}
      {lbl(`분위기 태그 (${draft.vibes.length}/3)`)}{tagBtns(VIBE_TAGS,draft.vibes,v=>upd({vibes:tArr(draft.vibes,v,3)}),pink)}
      {lbl("배경")}{tagBtns(BG_TAGS,draft.background?[draft.background]:[],v=>upd({background:draft.background===v?"":v}),blue)}
      {lbl(`자유 설명 (${(draft.description||"").length}/300, 선택)`)}<textarea value={draft.description} onChange={e=>upd({description:e.target.value.slice(0,300)})} rows={4} placeholder="세계관 설명, 특이한 설정, NPC가 기억해줬으면 하는 것" style={{...inputSt,resize:"none",lineHeight:1.7}}/></>;
  } else if(step===6){
    body=<>{h2("추가 정보","전부 선택사항 · 나중에 추가 가능")}
      {lbl("팬덤 애칭/별명")}<input value={draft.nickname} onChange={e=>upd({nickname:e.target.value})} placeholder="예: 말랭이, 용룡" style={inputSt}/>
      {lbl("생일 (생일카페 이벤트 트리거)")}<div style={{display:"flex",gap:9}}>
        <select value={draft.birthday?draft.birthday.month:""} onChange={e=>upd({birthday:{month:Number(e.target.value)||null,day:draft.birthday?draft.birthday.day:null}})} style={{...inputSt,flex:1,width:"auto"}}><option value="">월</option>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}월</option>)}</select>
        <select value={draft.birthday?draft.birthday.day:""} onChange={e=>upd({birthday:{month:draft.birthday?draft.birthday.month:null,day:Number(e.target.value)||null}})} style={{...inputSt,flex:1,width:"auto"}}><option value="">일</option>{Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}일</option>)}</select>
      </div>
      {lbl("대표 명대사 (mabo 인용에 사용)")}<input value={draft.famousLine} onChange={e=>upd({famousLine:e.target.value})} placeholder="기억에 남는 대사" style={inputSt}/>
      {lbl(`대표 AU 설정 (${draft.auTags.length}/2)`)}{tagBtns(AU_TAGS,draft.auTags,v=>upd({auTags:tArr(draft.auTags,v,2)}),purple)}</>;
  } else if(step===7){nextLabel="✦ 저장 → NPC 생성";
    body=<>{h2("완성! 확인해주세요")}
      {lbl("장르명 (수정 가능)")}<input value={draft.name} onChange={e=>upd({name:e.target.value})} style={{...inputSt,border:`1.5px solid ${T.pri}`,color:T.pri,fontSize:16,fontWeight:800,marginBottom:12}}/>
      <div style={{...card,background:"linear-gradient(135deg,#fff,#f6efff)",padding:18}}>
        <div style={{fontSize:12,color:blue.fg,marginBottom:8,fontWeight:700}}>{[draft.media,draft.mediaGenre,draft.type].filter(Boolean).join(" · ")}</div>
        {named.map(c=><div key={c.id} style={{fontSize:14,marginBottom:4,color:T.text}}>👤 {c.name} <span style={{fontSize:11,color:T.mut}}>{c.popularity} {c.position}</span></div>)}
        {draft.cp&&draft.type==="CP"&&<div style={{fontSize:12,color:T.pri,marginTop:6,fontWeight:700}}>CP: {draft.cp.type} · {draft.cp.cpPopularity}</div>}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>{draft.vibes.map(v=><span key={v} style={{fontSize:12,padding:"3px 11px",background:pink.bg,borderRadius:15,color:pink.fg}}>{v}</span>)}{draft.auTags.map(v=><span key={v} style={{fontSize:12,padding:"3px 11px",background:purple.bg,borderRadius:15,color:T.pri}}>{v}</span>)}</div>
        {draft.description&&<div style={{fontSize:12,color:"#5c5478",marginTop:10,lineHeight:1.7}}>{draft.description}</div>}
      </div>
      <div style={{fontSize:12,color:T.mut,marginTop:12,textAlign:"center"}}>저장하면 이 장르에 맞는 NPC 15명이 생성돼요</div></>;
  }

  return(<div style={{minHeight:"100%",background:"linear-gradient(180deg,#faf7ff,#f1eafd)",fontFamily:"'Noto Sans KR',sans-serif",padding:"0 40px 60px",color:T.text}}>
    {siteHeader}
    <div style={{maxWidth:760,margin:"0 auto"}}>
      {g&&<button onClick={()=>{setEditing(false);setStep(1);}} style={{marginBottom:12,padding:"7px 15px",background:"#fff",border:`1px solid ${T.bd}`,color:T.mut,borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:700}}>← 나의 장르로</button>}
      {stepBar}
      <div style={{...card,padding:24}}>
        {body}
        {step===7
          ?<div style={{display:"flex",gap:10,padding:"16px 0 0",marginTop:18,borderTop:`1px solid ${T.bd}`}}>
            <button onClick={goBack} style={{flex:1,padding:12,background:"#fff",border:`1px solid ${T.bd}`,color:T.mut,borderRadius:11,cursor:"pointer",fontSize:14,fontWeight:700}}>← 뒤로</button>
            <button onClick={save} disabled={!draft.name.trim()} style={{flex:2,padding:12,background:draft.name.trim()?"linear-gradient(135deg,#7c3aed,#e94560)":"#eee6f8",border:"none",color:draft.name.trim()?"#fff":T.dim,fontWeight:700,fontSize:14,borderRadius:11,cursor:draft.name.trim()?"pointer":"not-allowed"}}>✦ 저장 → NPC 생성</button>
          </div>
          :navBar(canNext,nextLabel)}
      </div>
      {archiveSection}
    </div>
  </div>);
}
