import { logTx } from "./bankSystem.js";
import { pushMessage } from "./messageSystem.js";

// 아르바이트: 알바냥 앱에서 탐색/지원/퇴사. 요일제 출근 — 근무 요일에 출근(미니게임)해야
// 일당이 적립되고, 매월 PAYDAY일에 적립된 일당의 합이 월급으로 입금된다.
// 요일 규칙: 절대일 day%7 → 0=일 1=월 … 6=토 (행사 요일 체계와 동일)
export const PAYDAY=25;
export const DOW_NAMES=["일","월","화","수","목","금","토"];
export const JOBS=[
  {id:"flyer", icon:"📮",name:"전단지 배포",       dayWage:10500,workDays:[2,6],  staminaCost:10,minFame:0, desc:"동네 한 바퀴 돌면 끝. 몸은 힘들어도 마음은 편하다.",
    game:{title:"전단지 타이밍 배포",hint:"행인이 앞을 지날 때 딱 맞춰 건네자!",color:"#ff9f43"}},
  {id:"cafe",  icon:"☕",name:"카페 홀 알바",      dayWage:11500,workDays:[1,3,5],staminaCost:12,minFame:0, desc:"라떼아트는 못 하지만 서빙은 자신 있다.",
    game:{title:"라떼 붓기",hint:"우유를 딱 알맞은 순간에 멈추자!",color:"#b98756"}},
  {id:"conv",  icon:"🏪",name:"편의점 야간 알바",  dayWage:14000,workDays:[2,4,0],staminaCost:14,minFame:0, desc:"새벽엔 한산해서 폰질 가능. 대신 밤샘 각오.",
    game:{title:"바코드 스캔",hint:"상품이 판정선에 올 때 스캔!",color:"#4cc9f0"}},
  {id:"logis", icon:"📦",name:"물류센터 상하차",   dayWage:30500,workDays:[3,6],  staminaCost:22,minFame:0, desc:"고수익 보장. 하지만 어깨가 남아나질 않는다.",
    game:{title:"박스 받기",hint:"박스가 중앙에 올 때 받아내자!",color:"#e0702e"}},
  {id:"tutor", icon:"✏️",name:"미술학원 보조강사", dayWage:25500,workDays:[2,4],  staminaCost:10,minFame:30,desc:"그림 좀 그린다고 소문나야 갈 수 있는 자리.",
    game:{title:"첨삭 포인트",hint:"고칠 곳을 정확한 순간에 짚자!",color:"#c084fc"}},
  {id:"assist",icon:"🖋",name:"프로 작가 어시",    dayWage:37500,workDays:[5,6],  staminaCost:16,minFame:80,desc:"업계 인맥은 덤. 상당한 인지도가 필요하다.",
    game:{title:"스크린톤 붙이기",hint:"칸에 딱 맞는 순간 톤을 붙이자!",color:"#e94560"}},
];
export const weekdayOf=(day)=>((day%7)+7)%7;
export const monthlyEstimate=(j)=>Math.round(j.dayWage*j.workDays.length*30/7/1000)*1000; // 만근 기준 예상 월급
export const workDaysLabel=(j)=>j.workDays.map(d=>DOW_NAMES[d]).join("·");
export function getJob(state){return state&&state.job?(JOBS.find(j=>j.id===state.job.jobId)||null):null;}
export const isWorkdayToday=(state)=>{const j=getJob(state);return !!j&&j.workDays.includes(weekdayOf(state.day));};
export const hasWorkedToday=(state)=>!!(state.job&&(state.job.attend||[]).some(a=>a.day===state.day));
export const shiftWage=(j,mult)=>Math.round(j.dayWage*mult/100)*100;
// 이번 정산 기간에 적립된 일당 합
export function pendingWages(state){
  if(!state.job)return 0;
  const since=state.job.lastPaidDay!=null?state.job.lastPaidDay:state.job.startedDay;
  return (state.job.attend||[]).filter(a=>a.day>since).reduce((s,a)=>s+a.wage,0);
}
export function applyForJob(state,jobId){
  const j=JOBS.find(x=>x.id===jobId);if(!j||state.job)return state;
  let ns={...state,job:{jobId,startedDay:state.day,lastPaidDay:null,attend:[]}};
  ns=pushMessage(ns,{from:"알바냥",avatar:"🐱",text:`[합격냥!] ${j.name}에 채용됐다냥. 근무는 매주 ${workDaysLabel(j)}요일, 일당 ₩${j.dayWage.toLocaleString()}이다냥. 출근한 만큼 매월 ${PAYDAY}일에 입금된다냥!`});
  return ns;
}
export function quitJob(state){
  const j=getJob(state);
  let ns={...state,job:null};
  if(j)ns=pushMessage(ns,{from:"알바냥",avatar:"🐱",text:`${j.name}을(를) 그만뒀다냥. 다음 알바도 알바냥에서 찾아보라냥~`});
  return ns;
}
// 출근(미니게임 종료 후 호출): 일당 적립 + 체력 소모. 하루 1회.
export function workShift(state,mult){
  const j=getJob(state);if(!j||hasWorkedToday(state)||!isWorkdayToday(state))return state;
  const wage=shiftWage(j,mult);
  return {...state,
    job:{...state.job,attend:[...(state.job.attend||[]),{day:state.day,wage}]},
    stamina:Math.max(0,(state.stamina||0)-j.staminaCost),
  };
}
// 다음 월급일까지 남은 일수 (게임 달력 30일 기준)
export function daysToPayday(gameDate){const d=(gameDate&&gameDate.day)||1;return d<=PAYDAY?PAYDAY-d:30-d+PAYDAY;}
// 하루 진행 직후 호출: 매월 PAYDAY일에 적립 일당 합산 입금
export function processPayday(state){
  if(!state.job)return state;
  const gd=state.gameDate;if(!gd||gd.day!==PAYDAY)return state;
  const j=getJob(state);if(!j)return state;
  const amount=pendingWages(state);
  const shifts=(state.job.attend||[]).filter(a=>a.day>(state.job.lastPaidDay!=null?state.job.lastPaidDay:state.job.startedDay)).length;
  let ns={...state,job:{...state.job,lastPaidDay:state.day,attend:[]}};
  if(amount<=0)return pushMessage(ns,{from:"알바냥",avatar:"🐱",text:"이번 달 출근 기록이 없다냥... 월급도 없다냥 😿 근무 요일에 알바냥 앱에서 출근하라냥!"});
  ns=logTx(ns,amount,`${j.name} 월급 (출근 ${shifts}회)`,"💼","job");
  ns=pushMessage(ns,{from:"모모뱅크",avatar:"🏦",text:`[입금] ${j.name} 급여 ₩${amount.toLocaleString()}이 입금되었습니다. (출근 ${shifts}회)`});
  return ns;
}
