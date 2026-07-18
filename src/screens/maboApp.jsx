import { useState, useEffect } from "react";
import { FAN_ACCOUNTS } from "../data/gameData.js";
import { prefetchImages, popFromPool, fanPostText, idbAll, idbPut, idbDel } from "../systems/imageSystem.js";
import { pickOne, getRoster, rosterEligible, npcPostText, makeTimelineUpdate } from "../systems/tweetSystem.js";
import { switchActiveGenre } from "../systems/genreSystem.js";
import { ProfileScreen } from "./gameScreens.jsx";

/* ============================================================
   mabo — 핸드폰 SNS 앱 (트위터풍 리뉴얼)
   - 상단 헤더: 내 프사(누르면 내 화면) + 등급 + 닉네임/핸들 + 팔로잉·팔로워·인지도·장르
   - "다 확인 / 새 소식" 슬림 바 → 탭하면 새로고침
   - 내 화면: 같은 헤더 + 한줄소개 + 북마크한 포스트 (+ 프로필 편집)
   view: undefined=피드 | "me"=내 화면 | "edit"=프로필 편집
   ============================================================ */

const AC="#4cc9f0"; // mabo 브랜드 컬러

function tierOf(followers){
  return followers<10?{name:"무명",color:"#555",emoji:"🌑"}
    :followers<50?{name:"새싹",color:"#06d6a0",emoji:"🌱"}
    :followers<200?{name:"로컬",color:"#4cc9f0",emoji:"💧"}
    :followers<500?{name:"중견",color:"#ffd166",emoji:"⭐"}
    :followers<1000?{name:"핫작가",color:"#e94560",emoji:"🔥"}
    :{name:"레전드",color:"#c084fc",emoji:"👑"};
}

// 헤더 — 목업: [내 프사][등급/닉네임 핸들/팔로잉 팔로워 인지도 장르]
function MaboHeader({state,onAvatar,me}){
  const {followers,following,fame,genre,profile}=state;
  const tier=tierOf(followers||0);
  const myHandle=(profile&&profile.handle&&profile.handle!=="@")?profile.handle:"@미설정";
  const myName=(profile&&profile.displayName)||"이름 없음";
  return(<div style={{padding:"12px 14px 10px",background:"linear-gradient(180deg,#0e1a2e,#0d1424)",borderBottom:`1px solid #1c2c44`,flexShrink:0}}>
    <div style={{display:"flex",gap:"11px",alignItems:"center",marginBottom:"9px"}}>
      <button onClick={onAvatar} title={me?"내 화면":"내 화면 열기"} style={{width:"48px",height:"48px",borderRadius:"50%",overflow:"hidden",background:"#152238",border:`2.5px solid ${me?AC:"#2a3f5c"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",padding:0}}>
        {profile&&profile.avatarData?<img src={profile.avatarData} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"22px"}}>👤</span>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"14px",fontWeight:"800",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{myName}</span>
          <span style={{fontSize:"9px",fontWeight:"800",color:tier.color,border:`1px solid ${tier.color}55`,background:`${tier.color}18`,borderRadius:"10px",padding:"1px 7px",flexShrink:0}}>{tier.emoji} {tier.name}</span>
        </div>
        <div style={{fontSize:"11px",color:"#6b7f9e",marginTop:"1px"}}>{myHandle}</div>
      </div>
      {!me&&<span style={{fontSize:"9px",color:"#3d5372",flexShrink:0}}>프사를 누르면<br/>내 화면 ↖</span>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1.4fr",gap:"5px"}}>
      {[{l:"팔로잉",v:(following||0).toLocaleString()},{l:"팔로워",v:(followers||0).toLocaleString()},{l:"인지도",v:(fame||0)+"pt"},{l:"장르",v:genre?genre.name:"미설정"}].map(({l,v})=>
        <div key={l} style={{textAlign:"center",padding:"6px 3px",background:"#101d33",borderRadius:"9px",border:"1px solid #1c2c44"}}>
          <div style={{fontSize:"8px",color:"#4a5f80"}}>{l}</div>
          <div style={{fontSize:"11px",fontWeight:"800",color:AC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
        </div>)}
    </div>
  </div>);
}

function PostCard({post,profile,multiG,showGenreTag,onBookmark,bookmarked}){
  return(<div style={{padding:"12px 14px",borderBottom:"1px solid #14202f",background:post.isMine?"#0f1a2c":"transparent"}}>
    <div style={{display:"flex",gap:"9px",alignItems:"flex-start"}}>
      <div style={{width:"38px",height:"38px",borderRadius:"50%",overflow:"hidden",background:"#152238",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"19px",flexShrink:0}}>
        {post.isMine&&profile&&profile.avatarData?<img src={profile.avatarData} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{post.avatar||"👤"}</span>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px"}}>
          <div style={{fontSize:"12px",fontWeight:"700",color:post.isMine?"#ffd166":"#e0e8f5",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {post.name?post.name:post.from}{post.official&&<span style={{color:AC}}> ✔</span>}
            <span style={{color:"#4a5f80",fontWeight:"400",fontSize:"11px"}}> {post.name?post.from:""}{post.isMine?" · 나":""}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>
            {showGenreTag&&multiG&&post._g&&<span style={{fontSize:"8px",padding:"1px 6px",background:"#0f2438",borderRadius:"8px",color:AC}}>{post._g}</span>}
            <span style={{fontSize:"10px",color:"#3d5372"}}>{post.timestamp}</span>
          </div>
        </div>
        <div style={{fontSize:"13px",lineHeight:1.6,wordBreak:"break-all",color:"#cfdaeb"}}>{post.text}</div>
        {post.imageUrl&&<img src={post.imageUrl} style={{width:"100%",borderRadius:"12px",marginTop:"8px",display:"block",border:"1px solid #1c2c44"}}/>}
        <div style={{display:"flex",gap:"14px",marginTop:"8px",alignItems:"center"}}>
          <span style={{fontSize:"11px",color:"#e94560"}}>♥ {(post.likes||0).toLocaleString()}</span>
          <span style={{fontSize:"11px",color:AC}}>🔁 {(post.rt||0).toLocaleString()}</span>
          {post.followerDelta!==0&&post.followerDelta!=null&&<span style={{fontSize:"11px",color:post.followerDelta>0?"#06d6a0":"#e94560",fontWeight:"700"}}>{post.followerDelta>0?"↑":"↓"} {Math.abs(post.followerDelta)}명</span>}
          {post.imageUrl&&onBookmark&&<button onClick={()=>onBookmark(post)} style={{marginLeft:"auto",padding:"3px 9px",background:bookmarked?"#0f2438":"transparent",border:`1px solid ${bookmarked?AC:"#2a3f5c"}`,color:bookmarked?AC:"#6b7f9e",borderRadius:"12px",cursor:"pointer",fontSize:"10px",fontWeight:"700"}}>{bookmarked?"🔖 저장됨":"🔖"}</button>}
        </div>
      </div>
    </div>
  </div>);
}

// 내 화면 — 헤더 + 한줄소개 + 북마크한 포스트
function MyPage({state,push}){
  const [bmarks,setBmarks]=useState([]);
  const load=()=>{idbAll("bookmarks").then(b=>setBmarks((b||[]).sort((a,b2)=>b2.savedAt-a.savedAt)));};
  useEffect(()=>{load();},[]);
  const del=(id)=>{idbDel("bookmarks",id).then(load);};
  const bio=(state.profile&&state.profile.bio)||"";
  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0b1220",color:"#e0e8f5",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <MaboHeader state={state} me onAvatar={()=>push({app:"mabo",view:"edit"})}/>
    <div style={{padding:"10px 14px",borderBottom:"1px solid #14202f",display:"flex",gap:"8px",alignItems:"center",flexShrink:0}}>
      <div style={{flex:1,fontSize:"12px",color:bio?"#cfdaeb":"#3d5372",lineHeight:1.6}}>{bio||"한줄소개가 없어요. 프로필을 꾸며보세요!"}</div>
      <button onClick={()=>push({app:"mabo",view:"edit"})} style={{padding:"5px 12px",background:"transparent",border:`1px solid ${AC}55`,color:AC,borderRadius:"14px",cursor:"pointer",fontSize:"10px",fontWeight:"700",flexShrink:0}}>프로필 편집 ✎</button>
    </div>
    <div style={{padding:"9px 14px 5px",fontSize:"11px",fontWeight:"800",color:"#6b7f9e",flexShrink:0}}>🔖 북마크한 포스트 ({bmarks.length})</div>
    <div style={{flex:1,overflow:"auto"}}>
      {!bmarks.length&&<div style={{textAlign:"center",padding:"46px 20px",color:"#3d5372"}}><div style={{fontSize:"32px",marginBottom:"8px"}}>🔖</div><div style={{fontSize:"12px"}}>북마크한 포스트가 없어요</div><div style={{fontSize:"10px",marginTop:"4px",color:"#2a3a52"}}>피드의 이미지 포스트에서 🔖를 눌러 저장하세요</div></div>}
      {bmarks.map(b=>(<div key={b.id} style={{padding:"12px 14px",borderBottom:"1px solid #14202f"}}>
        <div style={{display:"flex",gap:"9px",alignItems:"flex-start"}}>
          <div style={{width:"34px",height:"34px",borderRadius:"50%",background:"#152238",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"17px",flexShrink:0}}>{b.avatar||"👤"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"12px",fontWeight:"700",color:"#e0e8f5",marginBottom:"3px"}}>{b.from}</div>
            <div style={{fontSize:"12px",color:"#cfdaeb",lineHeight:1.55,wordBreak:"break-all"}}>{b.text}</div>
            {b.imageUrl&&<img src={b.imageUrl} style={{width:"100%",borderRadius:"12px",marginTop:"7px",display:"block",border:"1px solid #1c2c44"}}/>}
            <button onClick={()=>del(b.id)} style={{marginTop:"7px",padding:"3px 10px",background:"transparent",border:"1px solid #3a2030",color:"#e94560",borderRadius:"12px",cursor:"pointer",fontSize:"10px"}}>🗑 북마크 해제</button>
          </div>
        </div>
      </div>))}
    </div>
  </div>);
}

export default function MaboApp({state,setState,view,push}){
  const [loading,setLoading]=useState(false);
  const [banner,setBanner]=useState(null);
  const [bmarked,setBmarked]=useState({});
  const [feedTab,setFeedTab]=useState("all");
  const {genre,profile}=state;
  const genresArr=state.genres||[];
  const multiG=genresArr.length>1;

  if(view==="edit")return <ProfileScreen state={state} setState={setState}/>;
  if(view==="me")return <MyPage state={state} push={push}/>;

  const tagFeed=(arr,gn)=>(arr||[]).map(p=>p._g?p:{...p,_g:gn});
  let feed;
  if(!multiG||feedTab==="all"){const an=(genre&&genre.name)||"";let all=tagFeed(state.snsHistory,an);genresArr.forEach(g=>{if(g.id!==state.activeGenreId)all=all.concat(tagFeed(g.snsHistory,g.name));});feed=all.sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,60);}
  else feed=tagFeed(state.snsHistory,(genre&&genre.name)||"");

  const ctx=()=>({genre:genre&&genre.name,character:genre&&genre.chars});
  const refresh=async()=>{
    if(loading)return;setLoading(true);setBanner(null);
    setState(s=>({...s,flags:{...s.flags,recentPost:true}}));
    await new Promise(r=>setTimeout(r,550));
    const ts=new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
    const upd=makeTimelineUpdate(state);
    let posts=upd.hasNew?[...upd.posts]:[];
    if(Math.random()<0.7){const img=await popFromPool();if(img){
      const typeMap={cosplay:"cosplayer",goods_haul:"goods_collector",itabag:"goods_collector",doujin_shelf:"reviewer"};
      const roster=getRoster(state);let poster=null;
      if(roster){const want=typeMap[img.eventType];const cands=roster.filter(a=>a.type===want&&rosterEligible(a,state));if(cands.length)poster=pickOne(cands);}
      const fan=poster||FAN_ACCOUNTS.find(f=>f.eventType===img.eventType)||pickOne(FAN_ACCOUNTS);
      posts=[{id:Date.now()+Math.random(),from:fan.handle,name:poster?fan.name:undefined,avatar:fan.avatar,isFan:true,imageUrl:img.dataUrl,text:poster?npcPostText(poster,state,["cosplay_image_event","event_day","event_after"]):fanPostText(fan,state),likes:5+Math.floor(Math.random()*60),rt:Math.floor(Math.random()*25),followerDelta:0,mood:"good",timestamp:ts},...posts];
    }}
    if(posts.length){const delta=posts.reduce((a,p)=>a+(p.followerDelta||0),0);setState(s=>({...s,followers:Math.max(0,s.followers+delta),snsHistory:[...posts,...(s.snsHistory||[])].slice(0,40)}));setBanner({type:"new",n:posts.length});}
    else setBanner({type:"none"});
    prefetchImages(ctx(),3);
    setLoading(false);
  };
  const saveBookmark=async(post)=>{await idbPut("bookmarks",{id:String(post.id),imageUrl:post.imageUrl,from:post.from,avatar:post.avatar,text:post.text,savedAt:Date.now()});setBmarked(b=>({...b,[post.id]:true}));};

  return(<div style={{height:"100%",display:"flex",flexDirection:"column",background:"#0b1220",color:"#e0e8f5",fontFamily:"'Noto Sans KR',sans-serif"}}>
    <MaboHeader state={state} onAvatar={()=>push({app:"mabo",view:"me"})}/>
    {/* 다 확인 / 새 소식 바 */}
    <button onClick={refresh} disabled={loading} style={{padding:"9px 14px",background:banner&&banner.type==="new"?"#07231a":"#0e1a2e",border:"none",borderBottom:"1px solid #14202f",color:loading?"#3d5372":banner&&banner.type==="new"?"#06d6a0":AC,cursor:loading?"wait":"pointer",fontSize:"12px",fontWeight:"700",flexShrink:0,textAlign:"center"}}>
      {loading?"⏳ 새 소식 확인 중...":banner&&banner.type==="new"?`🆕 ${banner.n}개의 새 소식`:banner&&banner.type==="none"?"다 확인했어요 ✓ (탭해서 다시 확인)":"🔄 탭해서 새 소식 확인"}
    </button>
    {multiG&&<div style={{display:"flex",gap:"6px",overflowX:"auto",padding:"8px 12px",background:"#0d1626",borderBottom:"1px solid #14202f",flexShrink:0}}>
      <button onClick={()=>setFeedTab("all")} style={{flexShrink:0,padding:"4px 12px",background:feedTab==="all"?"#0f2438":"transparent",border:`1px solid ${feedTab==="all"?AC:"#1c2c44"}`,color:feedTab==="all"?AC:"#6b7f9e",borderRadius:"15px",cursor:"pointer",fontSize:"11px",fontWeight:"700",whiteSpace:"nowrap"}}>🌐 전체</button>
      {genresArr.map(gg=><button key={gg.id} onClick={()=>{setState(s=>switchActiveGenre(s,gg.id));setFeedTab(gg.id);}} style={{flexShrink:0,padding:"4px 12px",background:feedTab===gg.id?"#0f2438":"transparent",border:`1px solid ${feedTab===gg.id?AC:"#1c2c44"}`,color:feedTab===gg.id?AC:"#6b7f9e",borderRadius:"15px",cursor:"pointer",fontSize:"11px",fontWeight:"700",whiteSpace:"nowrap"}}>{gg.name}</button>)}
    </div>}
    <div style={{flex:1,overflow:"auto"}}>
      {!genre&&<div style={{margin:"10px 14px",padding:"11px",background:"#0e1a2e",border:"1px solid #1c2c44",borderRadius:"11px",fontSize:"11px",color:"#6b7f9e",textAlign:"center",lineHeight:1.7}}>💻 인터넷 › 장르연구소에서 장르를 만들면<br/>더 실감나는 반응이 생성돼요</div>}
      {(profile&&(!profile.handle||profile.handle==="@"))&&<div style={{margin:"10px 14px",padding:"11px",background:"#0e1a2e",border:"1px solid #1c2c44",borderRadius:"11px",fontSize:"11px",color:"#6b7f9e",textAlign:"center",lineHeight:1.7}}>👤 프사를 눌러 프로필을 만들면<br/>내 포스트에 반영돼요</div>}
      {(state.followers||0)===0&&feed.length===0&&<div style={{textAlign:"center",padding:"46px 20px",color:"#3d5372"}}><div style={{fontSize:"32px",marginBottom:"8px"}}>🦗</div><div style={{fontSize:"13px"}}>아직 조용하네요...</div><div style={{fontSize:"11px",marginTop:"4px",color:"#2a3a52"}}>위의 바를 탭해 새 소식을 확인해보세요</div></div>}
      {feed.map(post=><PostCard key={post.id} post={post} profile={profile} multiG={multiG} showGenreTag={feedTab==="all"} onBookmark={saveBookmark} bookmarked={!!bmarked[post.id]}/>)}
    </div>
  </div>);
}
