import { INITIAL_STATE } from "../data/gameData.js";
import { pickOne } from "./tweetSystem.js";

// 로드한 세이브를 최신 INITIAL_STATE 스키마에 맞춰 보정(누락 필드 채움 + 진입 상태 정리)
export function normalizeLoaded(loaded){
  const s={...INITIAL_STATE,...loaded};
  s.flags={...INITIAL_STATE.flags,...(loaded.flags||{})};
  s.profile={...INITIAL_STATE.profile,...(loaded.profile||{})};
  s.gameDate={...INITIAL_STATE.gameDate,...(loaded.gameDate||{})};
  if(s.screen==="title")s.screen="studio";   // 타이틀에서 시작하지 않도록
  s.pendingSnsEvent=null;                     // 로드 직후 이벤트 모달은 닫힌 상태로
  return s;
}
// 다장르: 활성 장르의 수치/피드는 top-level(state.fame/followers/fanTrust/engagement/snsHistory)에 작업세트로 두고, 전환 시 swap
export function switchActiveGenre(s,id){
  if(id===s.activeGenreId)return s;
  const genres=(s.genres||[]).map(g=>g.id===s.activeGenreId?{...g,fame:s.fame,followers:s.followers,fanTrust:s.fanTrust,engagement:s.engagement,snsHistory:s.snsHistory}:g);
  const t=genres.find(g=>g.id===id);if(!t)return s;
  return {...s,genres,activeGenreId:id,genre:t,npcRoster:t.assignedNPCs||null,fame:t.fame||0,followers:t.followers||0,fanTrust:t.fanTrust!=null?t.fanTrust:50,engagement:t.engagement!=null?t.engagement:50,snsHistory:t.snsHistory||[]};
}
export function canAddGenre(s){return (s.genres||[]).length<5 && (s.stamina||0)>=30 && (s.mentalHealth||0)>=40;}

export function generateGenreName(g){
  if(g.type==="CP"&&g.cp){const gong=(g.characters||[]).find(c=>c.id===g.cp.gongId),su=(g.characters||[]).find(c=>c.id===g.cp.suId);if(gong&&su)return `${gong.name}×${su.name}`;}
  if(g.type==="단일"&&g.characters&&g.characters[0]&&g.characters[0].name)return g.characters[0].name;
  if(g.type==="올캐")return `${g.media||""} 올캐`.trim();
  return (g.characters&&g.characters[0]&&g.characters[0].name)||"새 장르";
}
export function legacyFields(g){
  const chars=(g.characters||[]).map(c=>c.name).filter(Boolean).join(", ");
  let cpType="none";
  if(g.type==="CP"&&g.cp)cpType=g.cp.type==="리버시블"?"rev":g.cp.type==="왼른 다 먹음"?"both":"fixed";
  const tags=[...(g.vibes||[]),...(g.auTags||[])].slice(0,4);
  return {chars,cpType,tags,desc:g.description||""};
}

export function slugify(s){const ascii=((s||"").match(/[a-zA-Z0-9]+/g)||[]).join("");return ascii.toLowerCase();}
export function buildVarCtx(genre){
  const gname=(genre&&genre.name)||"우리장르";
  let chars=[];
  if(genre&&genre.characters&&genre.characters.length)chars=genre.characters.map(c=>c.name).filter(Boolean);
  else chars=(((genre&&genre.chars)||"").split(/[,/·×x]|\s+/).map(x=>x.trim()).filter(Boolean));
  const charName=chars[0]||gname;
  let cpLeft=chars[0]||charName,cpRight=chars[1]||charName;
  if(genre&&genre.cp){const gong=(genre.characters||[]).find(c=>c.id===genre.cp.gongId),su=(genre.characters||[]).find(c=>c.id===genre.cp.suId);if(gong)cpLeft=gong.name;if(su&&su.name)cpRight=su.name;}
  const cpName=(cpLeft&&cpRight&&cpLeft!==cpRight)?`${cpLeft}×${cpRight}`:charName;
  return {gname,gslug:slugify(gname)||"genre",charName,charSlug:slugify(charName)||"oshi",cpName,cpLeft,cpRight,cpSlug:slugify(cpName)||"cp",emoji:pickOne(["⭐","💙","🌙","🔥","🌸","🖤","💜","✨","🎀"]),eventName:"서코"};
}

export function genrePopCode(genre){
  if(!genre)return "minor";
  if(genre.type==="CP"&&genre.cp&&genre.cp.cpPopularity){const m={"메이저 CP":"major","마이너":"minor","나 혼자 파는 중":"ultra_minor"}[genre.cp.cpPopularity];if(m)return m;}
  const p=(genre.characters&&genre.characters[0]&&genre.characters[0].popularity)||"";
  return ({"메이저":"major","중간":"major","마이너":"minor","초마이너":"ultra_minor","나 혼자":"ultra_minor"})[p]||"minor";
}
