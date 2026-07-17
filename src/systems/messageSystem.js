// 핸드폰 메시지함. 게임 내 알림(굿즈 완성·월급·행사 신청 등)이 발신자(from)별 스레드로 쌓인다.
// 답장(선택지)·멀티플레이 대화 로그는 이후 확장 지점.
export function pushMessage(state,{from,avatar,text}){
  const m={id:Date.now()+Math.random(),from,avatar:avatar||"💬",text,day:state.day,date:state.gameDate?{...state.gameDate}:null,read:false};
  return {...state,messages:[...(state.messages||[]),m].slice(-300)};
}
export function unreadCount(state){return (state.messages||[]).filter(m=>!m.read).length;}
export function markThreadRead(state,from){
  if(!(state.messages||[]).some(m=>m.from===from&&!m.read))return state;
  return {...state,messages:state.messages.map(m=>m.from===from?{...m,read:true}:m)};
}
// 발신자별 스레드 목록(최근 메시지 순)
export function threads(state){
  const map=new Map();
  (state.messages||[]).forEach(m=>{
    const t=map.get(m.from)||{from:m.from,avatar:m.avatar,msgs:[],unread:0};
    t.msgs.push(m);if(!m.read)t.unread++;t.avatar=m.avatar;
    map.set(m.from,t);
  });
  return [...map.values()].sort((a,b)=>(b.msgs[b.msgs.length-1].id||0)-(a.msgs[a.msgs.length-1].id||0));
}
