// 은행 거래 로그. 골드 변동을 state.transactions에 남긴다 (최신순, 최대 300건).
// amount 양수=입금, 음수=출금. gold는 0 밑으로 내려가지 않는다(기존 applyEventDelta와 동일 정책).
// cat: 성향 통계 카테고리 (goods/event/booth/daily/job/gacha/market/etc) — 회고록·성향 칭호의 데이터 소스
export function logTx(state, amount, label, icon, cat){
  if(!amount)return state;
  const gold=Math.max(0,(state.gold||0)+amount);
  const tx={id:Date.now()+Math.random(),day:state.day,date:state.gameDate?{...state.gameDate}:null,amount,label,icon:icon||(amount>0?"💰":"💸"),balance:gold};
  const prev=(state.stats&&state.stats.spend&&state.stats)||{spend:{},earn:{}};
  const side=amount<0?"spend":"earn";const key=cat||"etc";
  const stats={...prev,[side]:{...prev[side],[key]:(prev[side][key]||0)+Math.abs(amount)}};
  return {...state,gold,stats,transactions:[tx,...(state.transactions||[])].slice(0,300)};
}
