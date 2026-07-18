import { logTx } from "./bankSystem.js";
import { pushMessage } from "./messageSystem.js";

// 아르바이트: 알바냥 앱에서 탐색/지원/퇴사. 실제 근무 활동 화면은 추후 별도 추가.
// 지금은 재직 중이면 매월 PAYDAY일에 근무일수 비례 월급이 은행으로 입금된다.
export const PAYDAY=25;
export const JOBS=[
  {id:"flyer", icon:"📮",name:"전단지 배포",       pay:90000, minFame:0, desc:"동네 한 바퀴 돌면 끝. 몸은 힘들어도 마음은 편하다."},
  {id:"cafe",  icon:"☕",name:"카페 홀 알바",      pay:150000,minFame:0, desc:"라떼아트는 못 하지만 서빙은 자신 있다."},
  {id:"conv",  icon:"🏪",name:"편의점 야간 알바",  pay:180000,minFame:0, desc:"새벽엔 한산해서 폰질 가능. 대신 밤샘 각오."},
  {id:"logis", icon:"📦",name:"물류센터 상하차",   pay:260000,minFame:0, desc:"고수익 보장. 하지만 어깨가 남아나질 않는다."},
  {id:"tutor", icon:"✏️",name:"미술학원 보조강사", pay:220000,minFame:30,desc:"그림 좀 그린다고 소문나야 갈 수 있는 자리."},
  {id:"assist",icon:"🖋",name:"프로 작가 어시",    pay:320000,minFame:80,desc:"업계 인맥은 덤. 상당한 인지도가 필요하다."},
];
export function getJob(state){return state&&state.job?(JOBS.find(j=>j.id===state.job.jobId)||null):null;}
export function applyForJob(state,jobId){
  const j=JOBS.find(x=>x.id===jobId);if(!j||state.job)return state;
  let ns={...state,job:{jobId,startedDay:state.day,lastPaidDay:null}};
  ns=pushMessage(ns,{from:"알바냥",avatar:"🐱",text:`[합격냥!] ${j.name}에 채용됐다냥. 월급 ₩${j.pay.toLocaleString()}(만근 기준)은 매월 ${PAYDAY}일에 입금된다냥!`});
  return ns;
}
export function quitJob(state){
  const j=getJob(state);
  let ns={...state,job:null};
  if(j)ns=pushMessage(ns,{from:"알바냥",avatar:"🐱",text:`${j.name}을(를) 그만뒀다냥. 다음 알바도 알바냥에서 찾아보라냥~`});
  return ns;
}
// 다음 월급일까지 남은 일수 (게임 달력 30일 기준)
export function daysToPayday(gameDate){const d=(gameDate&&gameDate.day)||1;return d<=PAYDAY?PAYDAY-d:30-d+PAYDAY;}
// 하루 진행 직후 호출: 매월 PAYDAY일에 근무일수 비례(30일=만근) 월급 입금 + 입금 메시지
export function processPayday(state){
  if(!state.job)return state;
  const gd=state.gameDate;if(!gd||gd.day!==PAYDAY)return state;
  const j=getJob(state);if(!j)return state;
  const since=state.job.lastPaidDay!=null?state.job.lastPaidDay:state.job.startedDay;
  const worked=Math.max(0,Math.min(30,state.day-since));
  if(worked<=0)return state;
  const amount=Math.max(1000,Math.round(j.pay*worked/30/1000)*1000);
  let ns={...state,job:{...state.job,lastPaidDay:state.day}};
  ns=logTx(ns,amount,`${j.name} 월급 (근무 ${worked}일)`,"💼","job");
  ns=pushMessage(ns,{from:"모모뱅크",avatar:"🏦",text:`[입금] ${j.name} 급여 ₩${amount.toLocaleString()}이 입금되었습니다. (근무 ${worked}일)`});
  return ns;
}
