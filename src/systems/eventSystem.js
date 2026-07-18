import { FAIR_EVENTS, GOODS_TYPES } from "../data/gameData.js";
import { buildVarCtx, genrePopCode } from "./genreSystem.js";
import { applyReadyOrders } from "./goodsSystem.js";
import { processDailyEvents, applyEventDelta, nextGameDate } from "./snsEventSystem.js";
import { pushMessage } from "./messageSystem.js";
import { processPayday, getJob, isWorkdayToday } from "./jobSystem.js";

export function resolveEventName(type,genre){const c=buildVarCtx(genre);return (type.name||"").replace(/\{장르명\}/g,c.gname).replace(/\{cp명\}/g,c.cpName);}
export function eventWeekendDay(day){for(let i=0;i<14;i++){const w=(day+i)%7;if(w===6)return {day:day+i,dow:"sat"};if(w===0)return {day:day+i,dow:"sun"};}return {day,dow:"sat"};}
export function generateEventSchedule(genre,startDay){
  const pop=genrePopCode(genre);const out=[];let uid=1;const horizon=startDay+200;
  const T=(id)=>FAIR_EVENTS.find(e=>e.id===id);
  const add=(type,day)=>{if(!type)return;if(type.cpRequired&&!(genre&&genre.cp))return;const wk=eventWeekendDay(day);const sd=wk.day;out.push({id:"evt_"+startDay+"_"+(uid++),eventTypeId:type.id,name:resolveEventName(type,genre),scale:type.scale,days:type.days,startDay:sd,endDay:sd+(type.days-1),dayOfWeek:wk.dow,status:"upcoming",boothFee:type.boothFee||0,maxSales:type.maxSales,minFame:type.minFame||0,requiresApplication:!!type.requiresApplication,applyBy:sd-(type.applicationDeadline||0),announcement:!!type.announcement,productionCostMultiplier:type.productionCostMultiplier||1});};
  let d=startDay+12;while(d<horizon){add(T("comic_land"),d);d+=35;}
  d=startDay+26;while(d<horizon){add(T("may_festa"),d);d+=70;}
  add(T("world_major_contest"),startDay+90);
  const onlyInt=pop==="major"?60:pop==="minor"?90:0;
  const exInt=pop==="major"?90:pop==="minor"?180:240;
  if(onlyInt){d=startDay+20;while(d<horizon){add(T("genre_only"),d);if(genre&&genre.cp)add(T("cp_only"),d+30);d+=onlyInt;}}
  d=startDay+40;while(d<horizon){add(T("genre_exchange"),d);if(genre&&genre.cp){add(T("cp_exchange"),d+18);add(T("cp_club"),d+46);}d+=exInt;}
  out.sort((a,b)=>a.startDay-b.startDay);
  const seen={};out.forEach(e=>{while(seen[e.startDay]){e.startDay+=7;e.endDay+=7;}seen[e.startDay]=true;});
  return out.slice(0,40);
}
export function isEventDay(s){const ev=s&&s.activeEvent;return !!(ev&&s.day>=ev.startDay&&s.day<=ev.endDay);}
// 신청한 행사(appliedEvents) 중 가장 가까운 것 — 다중 신청 시 activeEvent는 항상 이 값이어야 함
export function nearestAppliedEvent(s){
  const ids=s.appliedEvents||[];
  return ((s.genre&&s.genre.eventSchedule)||[]).filter(e=>ids.includes(e.id)&&e.endDay>=s.day).sort((a,b)=>a.startDay-b.startDay)[0]||null;
}
export function nearestUpcomingEvent(s){if(s.activeEvent&&s.activeEvent.startDay>=s.day)return s.activeEvent;const sc=((s.genre&&s.genre.eventSchedule)||[]).filter(e=>e.startDay>=s.day).sort((a,b)=>a.startDay-b.startDay);return sc[0]||s.activeEvent||null;}
export function dDayNotice(s){const ev=nearestUpcomingEvent(s);if(!ev)return null;const d=ev.startDay-s.day;const map={14:`${ev.name} 접수 시작! 지금 신청하세요`,7:"굿즈 주문 마감이 다가오고 있어요",5:"아크릴·회지는 오늘까지만 주문 가능해요",3:"행사까지 3일! 포장 준비를 시작해요",1:"내일이 행사! 부스 배치를 확정해요",0:`${ev.name} 당일! 파이팅!`};return map[d]?{dday:d,msg:map[d],name:ev.name}:null;}
// 날짜가 넘어간 직후의 공통 처리: 주문 완성(+메시지) → 월급일 입금. 취침/실시간/행사 정산이 공유.
export function endOfDay(s){
  const done=(s.orders||[]).filter(o=>o.status==="making"&&o.readyDay<=s.day);
  let ns=applyReadyOrders(s);
  if(done.length){
    const names=done.map(o=>{const t=GOODS_TYPES.find(x=>x.id===o.goodsType);return `${(t&&t.name)||o.goodsType} ${o.quantity}개`;}).join(", ");
    ns=pushMessage(ns,{from:"굿즈팩토리",avatar:"🏭",text:`[제작 완료] 주문하신 ${names} 제작이 끝났어요! 재고에 추가됐습니다.`});
  }
  ns=processPayday(ns);
  // 출근 알림: 오늘이 근무일이면 아침에 알바냥이 알려준다 (행사 당일은 휴무라 제외)
  const j=getJob(ns);
  if(j&&isWorkdayToday(ns)&&!isEventDay(ns))ns=pushMessage(ns,{from:"알바냥",avatar:"🐱",text:`[출근 알림] 오늘은 ${j.name} 근무일이다냥! 📱 알바냥 앱에서 출근하라냥 (일당 ₩${j.dayWage.toLocaleString()}~)`});
  return ns;
}
// 하루 진행(취침/실시간 공용): 주문완료 + 날짜 + 이벤트(라인업>D-day알림>랜덤)
export function advanceDay(s){
  let ns=endOfDay({...s,day:s.day+1,gameDate:nextGameDate(s.gameDate),actionsToday:0});
  const lineup=((ns.genre&&ns.genre.eventSchedule)||[]).find(e=>e.announcement&&(e.startDay-ns.day)===7);
  const notice=dDayNotice(ns);
  if(lineup){const delta={followers:5+Math.floor(Math.random()*16),fame:3,mental:10};ns=applyEventDelta(ns,delta);ns={...ns,pendingSnsEvent:{event:{id:"lineup_announced",name:"라인업 공개",icon:"📣",presentation:"banner",message:`${lineup.name} 라인업이 공개됐다. 탐라에 설레는 분위기가 흐른다.`},result:delta,needsChoice:false}};}
  else if(notice){ns={...ns,pendingSnsEvent:{event:{id:"dday_notice",name:notice.dday===0?"행사 당일":`D-${notice.dday}`,icon:notice.dday===0?"🎪":"📅",presentation:notice.dday<=1?"modal":"banner",message:notice.msg},result:{},needsChoice:false}};}
  else if((ns.archive||[]).length&&Math.random()<0.05){
    // 탈덕한 옛 장르의 소식이 간간히 흘러들어온다 (아련함 = 멘탈 +5)
    const mem=ns.archive[Math.floor(Math.random()*ns.archive.length)];
    const texts=[`타임라인에 ${mem.genreName} 공식 소식이 흘러들어왔다. 아련하다...`,`${mem.genreName} 2차 창작이 리트윗으로 돌아왔다. 그땐 그랬지...`,`누군가 ${mem.genreName} 굿즈 나눔을 하고 있다. 잠깐 멈칫했다.`,`${mem.genreName} 신규 팬이 유입되고 있다는 소문. 좋은 곳이었지, 거기.`];
    const delta={mental:5};ns=applyEventDelta(ns,delta);
    ns={...ns,pendingSnsEvent:{event:{id:"old_genre_news",name:"옛 장르의 소식",icon:"🍂",presentation:"banner",message:texts[Math.floor(Math.random()*texts.length)]},result:delta,needsChoice:false}};
  }
  else{const ev=processDailyEvents(ns);if(ev){if(ev.needsChoice){ns={...ns,pendingSnsEvent:{event:ev.event,needsChoice:true},lastEventId:ev.event.id};}else{ns=applyEventDelta(ns,ev.delta);ns={...ns,pendingSnsEvent:{event:ev.event,result:ev.delta,needsChoice:false},lastEventId:ev.event.id};}}}
  return ns;
}
