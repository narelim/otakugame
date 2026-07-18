import NPC_POOL_BASE from "./npc_pool.json";
import FRIEND_ACCOUNTS from "./friend_accounts.json";
import TWEET_DATA from "./tweet_templates.json";
export { TWEET_DATA };
export const NPC_POOL=[...NPC_POOL_BASE,...FRIEND_ACCOUNTS];

export const GOODS_TYPES = [
  { id:"postcard",  name:"엽서",         icon:"🗒",  cost:300,  basePrice:1500, minQty:50,  maxQty:300, prodDays:2, outline:false },
  { id:"acrylic",   name:"아크릴 스탠드", icon:"🪆", cost:1500, basePrice:4000, minQty:10,  maxQty:100, prodDays:5, outline:true  },
  { id:"sticker",   name:"스티커",        icon:"⭐", cost:200,  basePrice:1000, minQty:100, maxQty:500, prodDays:2, outline:false },
  { id:"photocard", name:"포토카드",      icon:"🃏", cost:200,  basePrice:1000, minQty:100, maxQty:500, prodDays:2, outline:false },
  { id:"clearfile", name:"클리어파일",    icon:"📋", cost:800,  basePrice:2500, minQty:30,  maxQty:200, prodDays:3, outline:false },
  { id:"doujinshi", name:"회지",         icon:"📕", cost:2000, basePrice:5000, minQty:30,  maxQty:200, prodDays:7, outline:false },
  { id:"keyring",   name:"아크릴 키링",   icon:"🔑", cost:2000, basePrice:5000, minQty:10,  maxQty:100, prodDays:5, outline:true  },
  { id:"badge",     name:"뱃지",         icon:"🔘", cost:500,  basePrice:1500, minQty:50,  maxQty:300, prodDays:3, outline:false, shapes:["circle","heart","star"] },
];
export const BADGE_SHAPES=[{v:"circle",t:"⬤ 원형"},{v:"heart",t:"♥ 하트"},{v:"star",t:"★ 별"}];
export const BOOTH_ITEMS = [
  { id:"banner",  name:"현수막",    icon:"🪧", price:12000, desc:"인지도 +15%", fameBonus:0.15, sellBonus:0    },
  { id:"stand_s", name:"소형 전시대",icon:"🗄", price:8000,  desc:"판매율 +10%",fameBonus:0,    sellBonus:0.1  },
  { id:"stand_l", name:"대형 전시대",icon:"🗃", price:20000, desc:"판매율 +25%",fameBonus:0,    sellBonus:0.25 },
  { id:"promo",   name:"판촉대",    icon:"🎁", price:15000, desc:"유입 +20%",  fameBonus:0.1,  sellBonus:0.15 },
  { id:"cloth",   name:"테이블보",  icon:"🛍", price:5000,  desc:"첫인상 +5%", fameBonus:0.05, sellBonus:0.05 },
  { id:"light",   name:"LED 조명",  icon:"💡", price:18000, desc:"판매율 +20%",fameBonus:0.05, sellBonus:0.2  },
];
export const GENRE_TAGS = ["순애","뱀파이어","판타지","현대AU","왕족","학원","카페AU","헌터","악역영애","집착","쌍방","달달","먹먹","BL","GL","이형존재","초능력","역전이","하렘","역하렘","미래AU","복수","반전","속성차이","신분차이","계약","운명","연예계"];
export const CP_TYPES = [
  {id:"none",   label:"CP 없음 (단독장르)"},
  {id:"rev",    label:"리버시블"},
  {id:"fixed",  label:"고정충 (좌→우)"},
  {id:"fixed_r",label:"고정충 (우→좌)"},
  {id:"both",   label:"좌우고정충 (둘 다)"},
];
export const DAILY_ACTIONS = [
  { id:"sleep",   icon:"😴", name:"푹 쉬기",      stamina:+30, mental:+10, gold:0,     desc:"잠만 자도 세상이 달라진다" },
  { id:"eat",     icon:"🍱", name:"밥 먹기",       stamina:+15, mental:+8,  gold:-3000, desc:"컵라면 말고 제대로 된 밥" },
  { id:"exercise",icon:"🏃", name:"운동하기",      stamina:+25, mental:+15, gold:0,     desc:"몸이 건강해야 덕질도 한다" },
  { id:"shorts",  icon:"📱", name:"숏츠 보기",     stamina:-5,  mental:+5,  gold:0,     desc:"어? 벌써 3시간..." },
  { id:"recharge",icon:"📖", name:"원작 수혈",     stamina:-10, mental:+25, gold:-2000, desc:"역시 원작이 최고야..." },
  { id:"official",icon:"🎉", name:"공식 뉴짤 등장",stamina:0,   mental:+30, gold:0,     desc:"공식이 우릴 먹여살린다!!!" },
  { id:"newgoods",icon:"🛒", name:"공식 굿즈 구경", stamina:0,   mental:+20, gold:-8000, desc:"지름신이 강림했다" },
  { id:"collab",  icon:"☕", name:"작가 친구 만나기",stamina:-5,  mental:+20, gold:-5000, desc:"서로 덕질 수다. 최고의 힐링" },
];
export const PALETTE = ["#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#ffffff","#ff0000","#ff4500","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff","#ff00ff","#ff69b4","#e94560","#c084fc","#7c3aed","#06d6a0","#ffd166","#a52a2a","#8b4513","#d2691e","#f4a460","#daa520","#b8860b","#556b2f","#2f4f4f"];
export const BOOTH_SIZES=[
  {id:"small", name:"소형", tiles:1, hw:88,  price:0,     desc:"1칸 · 기본"},
  {id:"medium",name:"중형", tiles:2, hw:118, price:15000, desc:"2칸 · 진열 여유"},
  {id:"large", name:"대형", tiles:4, hw:150, price:40000, desc:"4칸 · 대형 서클"},
];
export const INITIAL_STATE = { screen:"title", day:1, gold:50000, stamina:100, fame:0, mentalHealth:100, followers:0, following:0, snsHistory:[], goods:[], boothItems:[], boothInv:null, boothLayout:null, boothSize:"small", genre:null, genres:[], activeGenreId:null, profile:{handle:"@",displayName:"",bio:"",avatarData:null,joinedDay:1}, boothApp:{name:"",desc:"",submitted:false}, orders:[], npcRoster:null, fanTrust:50, engagement:50, imageTicket:0, gameDate:{month:5,day:1}, actionsToday:0, lastEventId:null, pendingSnsEvent:null, activeEvent:null, appliedEvents:[], eventHistory:[], job:null, transactions:[], stats:{spend:{},earn:{}}, collection:[], collectionSets:[], avatar:{skin:"s1",hair:"bob",hairColor:"#6b4a35",outfit:"hoodie",acc:null}, wardrobe:["hoodie"], archive:[], lastMyPostDay:null, messages:[{id:1,from:"폰",avatar:"📱",text:"새 스마트폰 개통을 축하합니다! 굿즈 완성·월급·행사 알림이 이 메시지함으로 도착해요.",day:1,date:{month:5,day:1},read:false}], flags:{firstEvent:false,recentPost:false,recentEvent:false,recentGoodsRelease:false,goodsSoldOut:false,mailOrderActive:false} };

/* ===== 행사 시스템 ===== */
export const FAIR_EVENTS=[
  {id:"comic_land",name:"메이저 코믹랜드",scale:"large",days:2,boothFee:30000,maxSales:500,frequency:"monthly",requiresApplication:true,applicationDeadline:14,minFame:0},
  {id:"may_festa",name:"메이페스타",scale:"large",days:2,boothFee:25000,maxSales:400,frequency:"bimonthly",requiresApplication:true,applicationDeadline:14,minFame:0},
  {id:"world_major_contest",name:"월드 메이저 콘테스트",scale:"mega",days:2,boothFee:80000,maxSales:1000,frequency:"yearly",requiresApplication:true,applicationDeadline:30,minFame:50},
  {id:"genre_exchange",name:"{장르명}교류회",scale:"medium",days:1,boothFee:0,maxSales:10,maxParticipants:15,requiresApplication:false,productionCostMultiplier:1.5,minFame:10,announcement:true},
  {id:"cp_exchange",name:"{cp명}교류회",scale:"medium",days:1,boothFee:0,maxSales:10,maxParticipants:10,requiresApplication:false,productionCostMultiplier:1.5,cpRequired:true,minFame:5,announcement:true},
  {id:"genre_only",name:"{장르명}온리전",scale:"small",days:1,boothFee:0,maxSales:80,requiresApplication:false,minFame:20,announcement:true},
  {id:"cp_only",name:"{cp명}온리전",scale:"small",days:1,boothFee:0,maxSales:60,requiresApplication:false,cpRequired:true,minFame:15,announcement:true},
  {id:"cp_club",name:"{cp명}동아리",scale:"micro",days:1,boothFee:0,maxSales:20,maxParticipants:8,requiresApplication:false,productionCostMultiplier:1.3,cpRequired:true,minFame:0,announcement:true},
];
export const SCALE_LABEL={mega:"초대형",large:"대형",medium:"중형",small:"소형",micro:"초소형"};
export const PHONE_APPS=[
  {id:"sns",      icon:"🐦", name:"SNS",      color:"#4cc9f0"},
  {id:"matalk",   icon:"💬", name:"Matalk",   color:"#06d6a0"},
  {id:"gallery",  icon:"🖼", name:"갤러리",   color:"#ffd166"},
  {id:"factory",  icon:"🏭", name:"굿즈팩토리",color:"#ff9f43"},
  {id:"majorland",icon:"🎪", name:"Majorland",color:"#e94560"},
  {id:"genre",    icon:"🎭", name:"장르",     color:"#c084fc"},
];

/* ===== AI 이미지 시스템 (미리 생성 → IndexedDB 풀 → 이벤트 시 공개) ===== */
export const IMG_DB="seokoNoSin",IMG_VER=1,POOL_MAX=20;
export const FAN_ACCOUNTS=[
  {handle:"@hana_cos",     avatar:"🌸", style:"코스프레 인증", eventType:"cosplay"},
  {handle:"@goods_haul_k", avatar:"🛍", style:"굿즈 구매 인증", eventType:"goods_haul"},
  {handle:"@itabag_diary", avatar:"💙", style:"이타백 사진",   eventType:"itabag"},
  {handle:"@doujin_shelf", avatar:"📚", style:"회지 서재",     eventType:"doujin_shelf"},
];
export const EVENT_MOTIF={
  cosplay:     {emoji:"📸", g:["#ff9a9e","#fad0c4"], label:"코스프레 인증"},
  goods_haul:  {emoji:"🛍", g:["#a18cd1","#fbc2eb"], label:"굿즈 하울"},
  itabag:      {emoji:"💙", g:["#4facfe","#00f2fe"], label:"이타백"},
  doujin_shelf:{emoji:"📚", g:["#f6d365","#fda085"], label:"회지 서재"},
};

export const DRAW_RATIOS=[
  {id:"1:1",w:512,h:512},
  {id:"2:3",w:360,h:540},
  {id:"3:4",w:384,h:512},
  {id:"8:12",w:384,h:576},
  {id:"9:16",w:360,h:640},
];
export const BLEND_MODES=[
  {id:"source-over",label:"기본"},
  {id:"multiply",label:"곱하기"},
  {id:"screen",label:"스크린"},
  {id:"overlay",label:"오버레이"},
  {id:"lighter",label:"더하기(발광)"},
];
export const MAX_LAYERS=8;
export const MAX_SAVES=30;
export const SAVE_KEY="seoko_draw_saves";
export const TOOLS=[
  {id:"pen",icon:"✏️",name:"펜"},
  {id:"rect",icon:"⬛",name:"노트(사각형)"},
  {id:"pattern",icon:"🌫",name:"패턴붓"},
  {id:"eraser",icon:"🧹",name:"지우개"},
  {id:"eyedropper",icon:"💧",name:"스포이드"},
  {id:"move",icon:"✥",name:"이동(레이어)"},
  {id:"select",icon:"⬚",name:"선택"},
];

export const MEDIA_LIST=["게임","애니/만화","소설","버튜버","아이돌","오리지널","기타"];
export const MEDIA_GENRES={"게임":["RPG","리듬게임","연애SIM","액션","전략","기타"],"애니/만화":["배틀물","일상","이세계","로맨스","스포츠","공포","기타"],"소설":["판타지","로맨스","무협","현대물","SF","기타"],"버튜버":["개인","그룹/유닛"],"아이돌":["2D","3D혼합"],"오리지널":null,"기타":null};
export const MEDIA_NPC_WEIGHT={"게임":{gamer:40,official_info:30,translator:30},"애니/만화":{general:40,reviewer:30,cosplayer:30},"아이돌":{idol_fan:50,goods_collector:30,general:20},"버튜버":{vtuber_fan:50,general:30,goods_collector:20},"오리지널":{artist:40,general:40,archiver:20}};
export const APPEARANCE_TAGS=["은발","흑발","금발","적발","백발","컬러풀","장발","단발","묶음","특이한 머리","안경","뿔","꼬리","날개","가면","눈패치","큰키","작은키","근육","중성적","어려보임"];
export const PERSONALITY_TAGS=["츤데레","쿨한","다정한","카리스마","천연","얀데레","허당","과묵","명랑","냉혹","집착","순수","능글"];
export const CONCEPT_TAGS=["왕족","악마","천사","마법사","헌터","학생","사신","흡혈귀","용족","신","로봇","탐정","군인","교사","의사"];
export const POSITION_TAGS=["주인공","히로인","라이벌","서브캐","악역","엑스트라","선생님/어른","모름/해당없음"];
export const POPULARITY_TAGS=["메이저","중간","마이너","초마이너","나 혼자"];
export const POP_TIP={"메이저":"공식 굿즈 있음 · 반응 활발","중간":"적당한 팬덤","마이너":"소수 정예","초마이너":"거의 나뿐","나 혼자":"자급자족 서사"};
export const VIBE_TAGS=[{t:"달달",e:"🍯"},{t:"먹먹",e:"💧"},{t:"집착",e:"🔪"},{t:"순애",e:"🌸"},{t:"피폐",e:"🩸"},{t:"개그",e:"😂"},{t:"긴장감",e:"⚡"},{t:"힐링",e:"☕"},{t:"반전",e:"🌀"},{t:"감동",e:"😭"},{t:"설렘",e:"💓"},{t:"진지",e:"📖"},{t:"공포",e:"👻"},{t:"액션",e:"💥"},{t:"미스터리",e:"🔍"}];
export const BG_TAGS=["판타지","현대","미래/SF","역사","혼합","내가 만든 세계"];
export const AU_TAGS=["카페AU","현대AU","왕족AU","학원AU","헌터물","아포칼립스","우주","기타"];
export const GTYPE_LIST=[{v:"단일",d:"한 캐릭터에 집중"},{v:"CP",d:"두 캐릭터의 관계성"},{v:"올캐",d:"작품/그룹 전체"}];
export const ALLCHAR_MODES=["작품 전체 올캐","특정 그룹/유닛 올캐","올캐인데 최애 있음"];
export const CP_FIX=["고정충","리버시블","왼른 다 먹음"];
export const CP_STRENGTH=["무조건 고정","선호 있음","그냥 좋음"];
export const CP_CONTACT=["공식 접점 있음","내가 만든 설정","억지 CP","모름"];
export const CP_POP=["메이저 CP","마이너","나 혼자 파는 중","해당없음"];

export const NPC_ACCOUNTS=[
  {handle:"@tsunosuke_art",name:"츠노스케",avatar:"🎨",desc:"트위스트 성지순례 중. 말레우스왼 고정충.",followers:12400,following:203},
  {handle:"@yumemi_draw",name:"유메미",avatar:"🌙",desc:"자캐메이커. 악역영애 전문.",followers:8900,following:441},
  {handle:"@official_twst",name:"twisted wonderland",avatar:"🏫",desc:"트위스티드 원더랜드 공식. 이벤트 공지·뉴짤 투하 담당.",followers:280000,following:0,official:true},
  {handle:"@haru_oshi",name:"하루",avatar:"🌸",desc:"먹덕 겸 그림쟁이. 달달한 거 좋아해요.",followers:5600,following:892},
  {handle:"@kuro_zine",name:"쿠로",avatar:"🖤",desc:"앤솔 주최러. 마감은 신화 속 이야기.",followers:21000,following:120},
];

/* ===== npc_pool.json 기반 NPC 로스터 (장르 저장 시 선택 + 변수 치환) ===== */
export const NPC_ROSTER_KEY="seoko_npc_roster";

/* ===== tweet_templates.json 기반 포스트 선택 (LLM 없이) ===== */
export const TWEET_CATS=(TWEET_DATA&&TWEET_DATA.tweet_templates&&TWEET_DATA.tweet_templates.categories)||[];

export const OFFICIAL_TYPES=["official_info","event_organizer","event_reporter"];

export const ACT_MAX=2;
