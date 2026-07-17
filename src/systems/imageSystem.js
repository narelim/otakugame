import { IMG_DB, IMG_VER, POOL_MAX, FAN_ACCOUNTS, EVENT_MOTIF } from "../data/gameData.js";
import { pickOne } from "./tweetSystem.js";

export const EVENT_TYPES=FAN_ACCOUNTS.map(f=>f.eventType);

let _imgDbP=null;
export function imgDB(){
  if(_imgDbP)return _imgDbP;
  _imgDbP=new Promise((res,rej)=>{try{
    const r=indexedDB.open(IMG_DB,IMG_VER);
    r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains("imagePool"))db.createObjectStore("imagePool",{keyPath:"id"});if(!db.objectStoreNames.contains("bookmarks"))db.createObjectStore("bookmarks",{keyPath:"id"});};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  }catch(e){rej(e);}});
  return _imgDbP;
}
export function idbAll(store){return imgDB().then(db=>new Promise((res,rej)=>{const t=db.transaction(store,"readonly");const rq=t.objectStore(store).getAll();rq.onsuccess=()=>res(rq.result||[]);rq.onerror=()=>rej(rq.error);})).catch(()=>[]);}
export function idbPut(store,v){return imgDB().then(db=>new Promise((res,rej)=>{const t=db.transaction(store,"readwrite");t.objectStore(store).put(v);t.oncomplete=()=>res(true);t.onerror=()=>rej(t.error);})).catch(()=>false);}
export function idbDel(store,k){return imgDB().then(db=>new Promise((res)=>{const t=db.transaction(store,"readwrite");t.objectStore(store).delete(k);t.oncomplete=()=>res(true);t.onerror=()=>res(false);})).catch(()=>false);}
export function idbClear(store){return imgDB().then(db=>new Promise((res)=>{const t=db.transaction(store,"readwrite");t.objectStore(store).clear();t.oncomplete=()=>res(true);t.onerror=()=>res(false);})).catch(()=>false);}
// 실제 AI 생성 백엔드가 생기면 이 함수만 교체하면 됨 (현재는 로컬 캔버스 플레이스홀더 "사진")
export function generateImage(eventType,ctx){
  const m=EVENT_MOTIF[eventType]||EVENT_MOTIF.cosplay;
  const c=document.createElement("canvas");c.width=320;c.height=320;const x=c.getContext("2d");
  const g=x.createLinearGradient(0,0,320,320);g.addColorStop(0,m.g[0]);g.addColorStop(1,m.g[1]);x.fillStyle=g;x.fillRect(0,0,320,320);
  for(let i=0;i<18;i++){x.globalAlpha=0.06;x.fillStyle="#fff";x.beginPath();x.arc((i*97)%320,(i*151)%320,12+(i%4)*8,0,Math.PI*2);x.fill();}
  x.globalAlpha=1;x.textAlign="center";x.textBaseline="middle";
  x.font="118px serif";x.fillText(m.emoji,160,138);
  x.fillStyle="rgba(255,255,255,0.92)";x.font="bold 22px sans-serif";x.fillText(m.label,160,228);
  if(ctx&&ctx.genre){x.fillStyle="rgba(0,0,0,0.4)";x.font="15px sans-serif";x.fillText("#"+ctx.genre,160,258);}
  x.strokeStyle="rgba(255,255,255,0.6)";x.lineWidth=6;x.strokeRect(8,8,304,304);
  return c.toDataURL("image/jpeg",0.78);
}
export async function poolUnusedCount(){const all=await idbAll("imagePool");return all.filter(i=>!i.used).length;}
export async function prefetchImages(ctx,target){
  try{
    let all=await idbAll("imagePool");
    const used=all.filter(i=>i.used).sort((a,b)=>a.createdAt-b.createdAt);
    while(all.length>POOL_MAX&&used.length){const old=used.shift();await idbDel("imagePool",old.id);all=all.filter(i=>i.id!==old.id);}
    target=target||3;let unused=all.filter(i=>!i.used).length;
    while(unused<target&&all.length<POOL_MAX){
      const et=EVENT_TYPES[Math.floor(Math.random()*EVENT_TYPES.length)];
      const rec={id:"img_"+Date.now()+"_"+Math.floor(Math.random()*1e6),eventType:et,dataUrl:generateImage(et,ctx),createdAt:Date.now(),used:false};
      await idbPut("imagePool",rec);all.push(rec);unused++;
    }
  }catch(e){}
}
export async function popFromPool(eventType){
  try{const all=await idbAll("imagePool");let cand=all.filter(i=>!i.used&&(!eventType||i.eventType===eventType));if(!cand.length)cand=all.filter(i=>!i.used);const img=cand[0];if(!img)return null;img.used=true;await idbPut("imagePool",img);return img;}catch(e){return null;}
}
export function fanPostText(fan,state){
  const g=state.genre,gname=(g&&g.name)||"이 장르",tag=(g&&g.tags&&g.tags[0])||"덕질";
  const map={
    cosplay:[`${gname} 코스 입고 행사 다녀왔어요!! 🥹 #${tag}`,`드디어 ${gname} 코스 완성... 봐주세요🙏`],
    goods_haul:[`${gname} 굿즈 하울 ㅠㅠ 지갑 텅텅 #${tag}`,`이번 서코 ${gname} 굿즈 다 쓸어왔다🛍`],
    itabag:[`${gname} 이타백 또 늘었다... 행복해 💙`,`최애로 채운 이타백 자랑 #${tag}`],
    doujin_shelf:[`${gname} 회지 서재 정리 완료📚 장관이다`,`이번에 산 ${gname} 회지들 ㅎㅎ 추천!`],
  };
  return pickOne(map[fan.eventType]||map.cosplay);
}
