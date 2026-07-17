import { NPC_ACCOUNTS, NPC_ROSTER_KEY, NPC_POOL, MEDIA_NPC_WEIGHT, TWEET_CATS, OFFICIAL_TYPES } from "../data/gameData.js";
import { buildVarCtx, genrePopCode } from "./genreSystem.js";

export const pickOne=(a)=>a[Math.floor(Math.random()*a.length)];
export function npcLine(npc,state){
  const g=state.genre,gname=(g&&g.name)||"요즘 장르",tag=(g&&g.tags&&g.tags[0])||"동인";
  if(npc.official)return pickOne(["📢 신규 이벤트 [별을 쫓는 밤] 개최! 신규 SSR 등장🔮","공식 뉴짤 투하🔥 다들 봤어요?","서버 점검 안내: 오늘 새벽 2~4시","신규 보이스 업데이트! 확인해주세요🎀"]);
  const fameHi=state.fame>=120,grew=state.followers>=80,me=(state.profile&&state.profile.displayName)||"그 신인";
  return pickOne([
    `${gname} 진짜 좋다... 요즘 이 장르 파는 중 #${tag}`,
    `신간 마감 중인데 손가락이 안 움직여 ㅠㅠ`,
    grew?`${me} 그림 봤어? 떡상각인데👀`:`요즘 새로 들어온 ${tag} 신인들 그림 좋더라`,
    `이번 서코 부스 배치 떴다! 다들 어디야?`,
    fameHi?`${gname} 요즘 화력 미쳤다🔥`:`조용한 장르도 나름의 맛이 있지...`,
  ]);
}

export function fillToken(tok,c){
  const t=tok.replace(/[{}]/g,"");const eng=/영어|영문/.test(t);
  if(/이모지/.test(t))return c.emoji;
  if(/성우/.test(t))return "최애성우";
  if(/행사/.test(t))return c.eventName;
  if(/cp/i.test(t)){if(/수/.test(t))return c.cpRight;if(/공/.test(t))return c.cpLeft;return eng?c.cpSlug:c.cpName;}
  if(/캐릭터/.test(t))return eng?c.charSlug:c.charName;
  if(/장르/.test(t))return eng?c.gslug:c.gname;
  return eng?c.gslug:c.gname;
}
export function fillVars(str,c){return (str||"").replace(/\{[^}]+\}/g,(m)=>fillToken(m,c));}

export function tweetVarAvailable(v,state){
  if(v==="{굿즈명}")return (state.goods||[]).length>0;
  if(v==="{cp명}")return !!(state.genre&&state.genre.type==="CP");
  return true; // 캐릭터명/장르명/행사명/부스명/태그는 fallback 으로 항상 채움
}
export function fillTweet(text,state){
  const c=buildVarCtx(state.genre);
  const goods=state.goods||[];
  const goodsName=goods.length?pickOne(goods).name:(c.gname+" 굿즈");
  const boothName=(state.boothApp&&state.boothApp.name&&state.boothApp.name.trim())||(state.profile&&state.profile.displayName)||(c.gname+" 부스");
  const ptags=(state.genre&&state.genre.characters&&state.genre.characters[0]&&state.genre.characters[0].personalityTags)||[];
  const tag=ptags.length?pickOne(ptags):pickOne(["매력","서사","비주얼","분위기"]);
  return (text||"")
    .replace(/\{\s*캐릭터명\s*(또는|or)\s*장르명\s*\}/g,()=>pickOne([c.charName,c.gname]))
    .replace(/\{\s*캐릭터명\s*\}/g,c.charName)
    .replace(/\{\s*장르명\s*\}/g,c.gname)
    .replace(/\{\s*굿즈명\s*\}/g,goodsName)
    .replace(/\{\s*부스명\s*\}/g,boothName)
    .replace(/\{\s*행사명\s*\}/g,c.eventName)
    .replace(/\{\s*태그\s*\}/g,tag)
    .replace(/\{\s*cp명\s*\}/g,c.cpName)
    .replace(/\{[^}]+\}/g,(m)=>fillToken(m,c)); // 잔여 토큰 안전 처리
}
// gameState, npc, trigger(s) → 적합한 템플릿 1개 채워서 반환. 없으면 null (호출부에서 fallback)
export function pickTweet(state,npc,triggers){
  if(!TWEET_CATS.length||!state||!state.genre||!npc)return null;
  const trigs=Array.isArray(triggers)?triggers:[triggers];
  const pop=genrePopCode(state.genre),fame=state.fame||0;
  const cands=TWEET_CATS.filter(cat=>
    (cat.triggers||[]).some(t=>trigs.includes(t)) &&
    (cat.npcTypes||[]).includes(npc.type) &&
    (!cat.popularityRequired||cat.popularityRequired===pop) &&
    fame>=(cat.minFame||0) &&
    (cat.requiredVars||[]).every(v=>tweetVarAvailable(v,state))
  );
  if(!cands.length)return null;
  const cat=pickOne(cands),tpl=pickOne(cat.templates||[]);
  if(!tpl)return null;
  return {text:fillTweet(tpl.text,state),mood:cat.mood,hasImage:!!cat.hasImage,catId:cat.id,tplId:tpl.id};
}
// LLM 백엔드가 생기면 이 함수 내부만 "장르에 맞는 15개 선택 + 변수 채우기" LLM 호출로 교체하면 됨
// (MEDIA_NPC_WEIGHT[genre.media] 가중치 + 필수 NPC 고정 + CP 솔로 보정을 LLM 프롬프트에 그대로 전달)
export function buildNpcRoster(genre,count){
  count=count||30;
  const c=buildVarCtx(genre);
  const filled=NPC_POOL.map(n=>{
    if(!n.hasVariables)return {...n};
    const f={...n};(n.variableFields||[]).forEach(fld=>{f[fld]=fillVars(n[fld],c);});
    if(f.handle&&!f.handle.startsWith("@"))f.handle="@"+f.handle;
    return f;
  });
  const byId={};filled.forEach(n=>{byId[n.id]=n;});
  const roster=[],seen=new Set();
  const add=(n)=>{if(n&&!seen.has(n.id)){seen.add(n.id);roster.push(n);}};
  ["event_alarm","zzal_storage","iamrealssipduk"].forEach(id=>add(byId[id]));  // 모든 장르 공통 고정
  filled.filter(n=>n.type==="friend_account").sort(()=>Math.random()-0.5).slice(0,2).forEach(n=>add(n));  // 교류회용 지인 계정
  const mw=(genre&&MEDIA_NPC_WEIGHT[genre.media])||null;
  const solo=!!(genre&&genre.cp&&genre.cp.cpPopularity==="나 혼자 파는 중");
  const scored=filled.filter(n=>!seen.has(n.id)).map(n=>{
    let w=1; if(mw&&mw[n.type])w+=mw[n.type]/10;
    if(solo&&(n.id==="alone_in_sea"||n.type==="story_teller"))w+=3;
    return {n,w:w*(0.4+Math.random())};
  }).sort((a,b)=>b.w-a.w);
  for(const s of scored){if(roster.length>=count)break;add(s.n);}
  return roster.slice(0,count);
}
export function saveRoster(genreName,roster){try{localStorage.setItem(NPC_ROSTER_KEY,JSON.stringify({genreName,roster}));}catch(e){}}
export function loadRoster(genreName){try{const raw=localStorage.getItem(NPC_ROSTER_KEY);if(!raw)return null;const o=JSON.parse(raw);if(genreName&&o.genreName!==genreName)return null;return o.roster;}catch(e){return null;}}
export function getRoster(state){if(state.npcRoster&&state.npcRoster.length)return state.npcRoster;return loadRoster((state.genre&&state.genre.name));}
export function rosterEligible(a,state){
  const fame=state.fame||0,submitted=!!(state.boothApp&&state.boothApp.submitted);
  switch(a.type){
    case "booth_operator": return submitted;
    case "official_info": case "translator": return fame>=50;
    case "event_organizer": return fame>=80;
    default: return true;
  }
}
export function rosterWeight(a,state){
  const submitted=!!(state.boothApp&&state.boothApp.submitted);
  switch(a.type){
    case "general": case "goods_collector": return 3;
    case "cosplayer": case "photographer": return submitted?3:1;
    case "booth_operator": return submitted?3:0;
    case "official_info": case "translator": case "event_organizer": return 2;
    default: return 2;
  }
}
export function pickRosterAccount(state){
  const roster=getRoster(state);if(!roster||!roster.length)return null;
  const pool=[];roster.filter(a=>rosterEligible(a,state)).forEach(a=>{const w=rosterWeight(a,state);for(let i=0;i<w;i++)pool.push(a);});
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
}
export function npcPostText(a,state,extraTrigs){
  // 1) tweet_templates 우선 (트리거 맥락 기반)
  const trigs=["daily","anytime","char_analysis_event"];
  if((state.goods||[]).length)trigs.push("goods_purchase","event_after","rt_event");
  if(state.boothApp&&state.boothApp.submitted)trigs.push("event_day","event_before","event_after");
  if(extraTrigs)extraTrigs.forEach(t=>trigs.push(t));
  const tw=pickTweet(state,a,trigs);
  if(tw)return tw.text;
  // 2) fallback: postStyle 기반
  const c=buildVarCtx(state.genre);const style=pickOne(a.postStyle||["일상"]);
  const tag=(state.genre&&state.genre.tags&&state.genre.tags[0])||"덕질";
  if(OFFICIAL_TYPES.includes(a.type))return pickOne([`[${style}] ${c.gname} 관련 안내드립니다 📢`,`${c.gname} ${style} 업데이트! 자세한 건 타래로 🔽`,`📢 ${style} — ${c.gname} 팬 여러분 확인 부탁드려요`]);
  if(a.type==="translator")return pickOne([`[번역] ${c.gname} ${style} 올렸어요. 오역 제보 환영🙏`,`${c.gname} 공식 ${style} 번역 타래 ⬇️`]);
  return pickOne([
    `[${style}] ${c.gname} ${pickOne(["진짜 좋다","최고임","요즘 이거밖에 안 봄","파면 팔수록 깊다"])} #${tag}`,
    `${style} 올렸어요! ${c.gname} ${pickOne(["봐주세요🙏","많관부","RT 환영"])}`,
    `${c.gname} ${style} 중... ${pickOne(["행복하다🥹","현생 안녕","지갑 안녕ㅠㅠ"])}`,
  ]);
}
export function makeTimelineUpdate(state){
  const {followers,fame,genre,profile}=state;
  const ts=new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
  const chance=0.4+Math.min(0.45,followers/400);
  if(Math.random()>chance)return{hasNew:false,posts:[],followerDelta:0};
  const posts=[];const gname=(genre&&genre.name)||"이 장르";const tag=(genre&&genre.tags&&genre.tags[0])||"동인";
  const mk=(o)=>posts.push({id:Date.now()+Math.random(),likes:0,rt:0,followerDelta:0,mood:"good",timestamp:ts,...o});
  const mkRoster=(a)=>{const official=OFFICIAL_TYPES.includes(a.type);mk({from:a.handle,name:a.name,avatar:a.avatar,isNpc:true,official,npcType:a.type,text:npcPostText(a,state),likes:Math.floor((a.followers||1000)*0.01*(0.4+Math.random())),rt:Math.floor((a.followers||1000)*0.003*(0.4+Math.random())),followerDelta:fame>40&&Math.random()<0.3?1+Math.floor(Math.random()*4):0,mood:official?"great":"good"});};
  const acct=pickRosterAccount(state);
  if(acct)mkRoster(acct);
  else if(Math.random()<0.65){const npc=pickOne(NPC_ACCOUNTS);mk({from:npc.handle,name:npc.name,avatar:npc.avatar,isNpc:true,official:npc.official,text:npcLine(npc,state),likes:Math.floor(npc.followers*0.01*(0.5+Math.random())),rt:Math.floor(npc.followers*0.003*(0.5+Math.random())),followerDelta:fame>40&&Math.random()<0.35?1+Math.floor(Math.random()*4):0,mood:npc.official?"great":"good"});}
  if(acct&&Math.random()<0.45){const a2=pickRosterAccount(state);if(a2&&a2.id!==acct.id)mkRoster(a2);}
  if(followers<10)mk({from:"@지나가던_덕후",avatar:"🌑",text:pickOne(["(아무도 RT를 안 해준다... 🦗)",`${gname}... 아직 아무도 모르는 장르인가`]),followerDelta:Math.random()<0.4?-1:0,mood:"bad"});
  else if(followers<50)mk({from:"@소소팬",avatar:"🌱",text:pickOne([`${gname} 발견했다!! 팔로우하고 갑니다 ><`,"그림체 취향저격... 잘 보고 가요!"]),likes:2+Math.floor(Math.random()*5),rt:Math.floor(Math.random()*2),followerDelta:1+Math.floor(Math.random()*3),mood:"good"});
  else if(followers<200)mk({from:"@로컬덕후",avatar:"💧",text:pickOne([`${gname} 신작 떴다 RT! #${tag}`,"이 작가님 요즘 폼 미쳤다..."]),likes:8+Math.floor(Math.random()*20),rt:3+Math.floor(Math.random()*8),followerDelta:2+Math.floor(Math.random()*6),mood:"great"});
  else mk({from:"@화력덕후",avatar:"🔥",text:pickOne([`${gname} 굿즈 실물 보고 기절함 😇 퀄 미쳤다`,"이번 신간 떡상 예약... 다들 사세요"]),likes:50+Math.floor(Math.random()*200),rt:20+Math.floor(Math.random()*100),followerDelta:5+Math.floor(Math.random()*20),mood:"great"});
  if(Math.random()<0.28)mk({from:(profile&&profile.handle)||"@me",name:(profile&&profile.displayName)||"나",isMine:true,text:pickOne([`${gname} 신작 올렸어요! 봐주세요 🙏 #${tag}`,"이번 서코 신상 굿즈 미리보기👀","오늘도 마감... 다들 화이팅"]),likes:Math.floor(followers*0.05*(0.4+Math.random())),rt:Math.floor(followers*0.02*Math.random()),mood:"good"});
  if(Math.random()<0.25)mk({from:"@요청러",avatar:"🙏",text:pickOne(["혹시 커미션 받으시나요?","최애 그려주실 수 있어요? ㅠㅠ"]),likes:1+Math.floor(Math.random()*3),mood:"good"});
  const followerDelta=posts.reduce((a,p)=>a+(p.followerDelta||0),0);
  return{hasNew:true,posts,followerDelta};
}
