import { useState, useRef, useEffect } from "react";
import { INITIAL_STATE } from "./data/gameData.js";
import { normalizeLoaded } from "./systems/genreSystem.js";
import { isEventDay, advanceDay } from "./systems/eventSystem.js";
import { prefetchImages } from "./systems/imageSystem.js";
import EventModal from "./components/EventModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { resolveChoice, applyEventDelta } from "./systems/snsEventSystem.js";
import { writeSave, readSave, clearSave } from "./systems/saveSystem.js";
import DesktopShell from "./screens/DesktopShell.jsx";
import { TitleScreen, StudioScreen, BoothScreen, EventScreen, DailyScreen, PhoneOverlay } from "./screens/gameScreens.jsx";

export default function App(){
  const [state,setState]=useState(INITIAL_STATE);
  const [phoneOpen,setPhoneOpen]=useState(false);
  const [saveMeta,setSaveMeta]=useState(null); // 세이브 존재 시 {savedAt,version,state}
  const bootedRef=useRef(false);
  useEffect(()=>{prefetchImages({genre:state.genre&&state.genre.name,character:state.genre&&state.genre.chars},2);},[]);
  // 부팅: 기존 세이브 확인(타이틀의 "이어하기" 노출용)
  useEffect(()=>{readSave().then(rec=>{setSaveMeta(rec);}).finally(()=>{bootedRef.current=true;});},[]);
  // 자동 저장: state 변경 시 디바운스 후 IndexedDB에 기록(타이틀·부팅 전 제외)
  useEffect(()=>{
    if(!bootedRef.current||state.screen==="title")return;
    const t=setTimeout(()=>{writeSave(state);},800);
    return ()=>clearTimeout(t);
  },[state]);
  // 실시간 경과: 현실 10분 = 게임 1일 (행사 당일·타이틀·모달 중엔 멈춤)
  useEffect(()=>{const t=setInterval(()=>{setState(s=>{if(s.screen==="title"||isEventDay(s)||s.pendingSnsEvent)return s;return advanceDay(s);});},600000);return()=>clearInterval(t);},[]);
  // 라우트: 기본 = 가로 데스크톱. #mobile = 레거시 세로 탭 게임(같은 state 공유).
  const [hash,setHash]=useState(()=>typeof window!=="undefined"?window.location.hash:"");
  useEffect(()=>{const f=()=>setHash(window.location.hash);window.addEventListener("hashchange",f);return()=>window.removeEventListener("hashchange",f);},[]);
  const mobileMode=hash==="#mobile";
  const continueGame=()=>{if(saveMeta&&saveMeta.state)setState(normalizeLoaded(saveMeta.state));};
  const newGame=()=>{clearSave();setSaveMeta(null);setState({...INITIAL_STATE,screen:"studio"});};
  const closeSnsEvent=()=>setState(s=>({...s,pendingSnsEvent:null}));
  const chooseSnsEvent=(idx)=>setState(s=>{const pe=s.pendingSnsEvent;if(!pe)return s;const r=resolveChoice(pe.event,idx);let ns=applyEventDelta(s,r.delta);ns={...ns,pendingSnsEvent:{event:pe.event,result:r.delta,needsChoice:false,chosen:true},flags:{...ns.flags,wantNewGenre:r.createGenreTrigger||ns.flags.wantNewGenre}};return ns;});
  // 타이틀: 데스크톱/모바일 공통 진입점 (전체화면)
  if(state.screen==="title")return(<div style={{width:"100%",height:"100vh",maxWidth:mobileMode?"430px":"none",margin:"0 auto"}}><TitleScreen onStart={newGame} onContinue={continueGame} saveMeta={saveMeta}/></div>);
  // 기본: 가로 데스크톱 셸
  if(!mobileMode)return <DesktopShell state={state} setState={setState}/>;
  // 레거시: 세로 모바일 탭 게임
  const TABS=[{id:"studio",label:"🎨",name:"스튜디오"},{id:"booth",label:"🏪",name:"부스"},{id:"event",label:"🎪",name:"행사장"},{id:"daily",label:"🌙",name:"일상"}];
  return(<div style={{width:"100%",height:"100vh",maxWidth:"430px",margin:"0 auto",display:"flex",flexDirection:"column",background:"#0d0d1a",position:"relative",overflow:"hidden"}}>
    <div style={{display:"flex",background:"#0a0a18",borderBottom:"1px solid #2a2a4a",flexShrink:0}}>
      {TABS.map(tab=><button key={tab.id} onClick={()=>setState(s=>({...s,screen:tab.id}))} style={{flex:1,padding:"8px 2px 5px",background:"transparent",border:"none",borderBottom:"2px solid",borderBottomColor:state.screen===tab.id?"#7c3aed":"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"1px"}}><span style={{fontSize:"16px"}}>{tab.label}</span><span style={{fontSize:"8px",color:state.screen===tab.id?"#c084fc":"#444",fontFamily:"'Noto Sans KR',sans-serif",fontWeight:"700"}}>{tab.name}</span></button>)}
    </div>
    <div style={{flex:1,overflow:"hidden",position:"relative"}}>
      <ErrorBoundary key={state.screen}>
        {state.screen==="studio"&&<StudioScreen state={state} setState={setState} onGoNext={()=>setState(s=>({...s,screen:"booth"}))}/>}
        {state.screen==="booth"&&<BoothScreen state={state} setState={setState} onGoEvent={()=>setState(s=>({...s,screen:"event"}))} onBack={()=>setState(s=>({...s,screen:"studio"}))}/>}
        {state.screen==="event"&&<EventScreen state={state} setState={setState} onBack={()=>setState(s=>({...s,screen:"booth"}))}/>}
        {state.screen==="daily"&&<DailyScreen state={state} setState={setState}/>}
      </ErrorBoundary>
    </div>
    {!phoneOpen&&<button onClick={()=>setPhoneOpen(true)} style={{position:"absolute",right:"14px",bottom:"16px",width:"54px",height:"54px",borderRadius:"50%",background:"linear-gradient(145deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontSize:"24px",cursor:"pointer",boxShadow:"0 6px 20px rgba(124,58,237,0.6)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>📱</button>}
    {phoneOpen&&<ErrorBoundary><PhoneOverlay state={state} setState={setState} onClose={()=>setPhoneOpen(false)}/></ErrorBoundary>}
    {state.pendingSnsEvent&&<EventModal data={state.pendingSnsEvent} onChoice={chooseSnsEvent} onClose={closeSnsEvent}/>}
  </div>);
}
