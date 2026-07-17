import { useState, useRef, useEffect, Component } from "react";
import { INITIAL_STATE } from "./data/gameData.js";
import { normalizeLoaded } from "./systems/genreSystem.js";
import { isEventDay, advanceDay } from "./systems/eventSystem.js";
import { prefetchImages } from "./systems/imageSystem.js";
import EventModal from "./components/EventModal.jsx";
import { resolveChoice, applyEventDelta } from "./systems/snsEventSystem.js";
import { writeSave, readSave, clearSave } from "./systems/saveSystem.js";
import DesktopShell from "./screens/DesktopShell.jsx";
import { TitleScreen, StudioScreen, BoothScreen, EventScreen, DailyScreen, PhoneOverlay } from "./screens/gameScreens.jsx";

class ErrorBoundary extends Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(err){return {err};}
  componentDidCatch(err,info){console.error("[서코의신] 렌더 오류:",err,info);}
  render(){
    if(this.state.err)return(<div style={{padding:"24px",height:"100%",overflow:"auto",background:"#0d0d1a",color:"#e0e0ff",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <div style={{fontSize:"32px",marginBottom:"10px"}}>😵</div>
      <div style={{fontSize:"15px",fontWeight:"700",color:"#e94560",marginBottom:"8px"}}>화면 오류가 발생했어요</div>
      <div style={{fontSize:"12px",color:"#888",marginBottom:"12px",lineHeight:1.7}}>이 화면을 그리는 중 문제가 생겼어요. 아래 내용을 알려주시면 고칠 수 있어요.</div>
      <pre style={{fontSize:"11px",color:"#ffd166",background:"#1a1a3a",padding:"10px",borderRadius:"8px",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{String(this.state.err&&this.state.err.stack||this.state.err)}</pre>
      <button onClick={()=>this.setState({err:null})} style={{marginTop:"12px",padding:"10px 18px",background:"linear-gradient(135deg,#7c3aed,#e94560)",border:"none",color:"#fff",fontWeight:"700",borderRadius:"10px",cursor:"pointer"}}>다시 시도</button>
    </div>);
    return this.props.children;
  }
}

export default function App(){
  const [state,setState]=useState(INITIAL_STATE);
  const [phoneOpen,setPhoneOpen]=useState(false);
  const [saveMeta,setSaveMeta]=useState(null); // 세이브 존재 시 {savedAt,version,state}
  const [booted,setBooted]=useState(false);
  const bootedRef=useRef(false);
  useEffect(()=>{prefetchImages({genre:state.genre&&state.genre.name,character:state.genre&&state.genre.chars},2);},[]);
  // 부팅: 기존 세이브 확인(타이틀의 "이어하기" 노출용)
  useEffect(()=>{readSave().then(rec=>{setSaveMeta(rec);}).finally(()=>{bootedRef.current=true;setBooted(true);});},[]);
  // 자동 저장: state 변경 시 디바운스 후 IndexedDB에 기록(타이틀·부팅 전 제외)
  useEffect(()=>{
    if(!bootedRef.current||state.screen==="title")return;
    const t=setTimeout(()=>{writeSave(state);},800);
    return ()=>clearTimeout(t);
  },[state]);
  // 실시간 경과: 현실 10분 = 게임 1일 (행사 당일·타이틀·모달 중엔 멈춤)
  useEffect(()=>{const t=setInterval(()=>{setState(s=>{if(s.screen==="title"||isEventDay(s)||s.pendingSnsEvent)return s;return advanceDay(s);});},600000);return()=>clearInterval(t);},[]);
  // #desktop 라우트: 가로 데스크톱 셸 (세로 탭 게임과 같은 state를 공유하는 다른 껍데기)
  const [hash,setHash]=useState(()=>typeof window!=="undefined"?window.location.hash:"");
  useEffect(()=>{const f=()=>setHash(window.location.hash);window.addEventListener("hashchange",f);return()=>window.removeEventListener("hashchange",f);},[]);
  const desktopBootedRef=useRef(false);
  // 데스크톱 진입 시 게임을 실제로 부팅: 세이브 있으면 이어하기, 없으면 새 게임(세이브 덮어쓰기 방지)
  useEffect(()=>{
    if(hash!=="#desktop"){desktopBootedRef.current=false;return;}
    if(!booted||desktopBootedRef.current)return;
    desktopBootedRef.current=true;
    if(state.screen==="title"){
      if(saveMeta&&saveMeta.state)setState(normalizeLoaded(saveMeta.state));
      else setState(s=>({...s,screen:"studio"}));
    }
  },[hash,booted,saveMeta,state.screen]);
  if(hash==="#desktop")return <DesktopShell state={state} setState={setState}/>;
  const continueGame=()=>{if(saveMeta&&saveMeta.state)setState(normalizeLoaded(saveMeta.state));};
  const newGame=()=>{clearSave();setSaveMeta(null);setState({...INITIAL_STATE,screen:"studio"});};
  const closeSnsEvent=()=>setState(s=>({...s,pendingSnsEvent:null}));
  const chooseSnsEvent=(idx)=>setState(s=>{const pe=s.pendingSnsEvent;if(!pe)return s;const r=resolveChoice(pe.event,idx);let ns=applyEventDelta(s,r.delta);ns={...ns,pendingSnsEvent:{event:pe.event,result:r.delta,needsChoice:false,chosen:true},flags:{...ns.flags,wantNewGenre:r.createGenreTrigger||ns.flags.wantNewGenre}};return ns;});
  if(state.screen==="title")return(<div style={{width:"100%",height:"100vh",maxWidth:"430px",margin:"0 auto"}}><TitleScreen onStart={newGame} onContinue={continueGame} saveMeta={saveMeta}/></div>);
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
