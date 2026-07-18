// ============================================================
// 아바타 파츠 규격 — 슬롯제(skin/hair/hairColor/outfit/acc)
// Phase 3 교류회 도트 아바타와 같은 슬롯 체계를 쓰도록 설계 (파츠 id 유지)
// 렌더는 components/Avatar.jsx (SVG 치비), 구매는 인터넷 코디몰.
// ============================================================

export const SKINS = [
  { id: "s1", c: "#ffe3cf" }, { id: "s2", c: "#f6cdb2" }, { id: "s3", c: "#d9a67e" }, { id: "s4", c: "#a9764f" },
];
export const HAIR_STYLES = [
  { id: "bob", name: "단발" }, { id: "short", name: "숏컷" }, { id: "long", name: "긴머리" },
  { id: "twin", name: "트윈테일" }, { id: "pony", name: "포니테일" }, { id: "curly", name: "곱슬" },
];
export const HAIR_COLORS = ["#3a3340", "#6b4a35", "#c9973f", "#c0455a", "#7c3aed", "#4cc9f0", "#e8e4ee", "#ff8fb0"];

// 의상 — c: 본체색, d: 포인트색. price 0 = 기본 보유
export const OUTFITS = [
  { id: "hoodie",   name: "기본 후드티",     price: 0,     c: "#8a8fa8", d: "#6b7089", desc: "오타쿠의 국민복" },
  { id: "tshirt",   name: "굿즈 티셔츠",     price: 9000,  c: "#f2f2f6", d: "#e94560", desc: "최애 로고가 박혀있다" },
  { id: "track",    name: "츄리닝 세트",     price: 12000, c: "#3d4a7a", d: "#f2f2f6", desc: "마감 전투복" },
  { id: "knit",     name: "니트 스웨터",     price: 18000, c: "#d9a06b", d: "#b8814e", desc: "포근한 작업복" },
  { id: "sailor",   name: "세일러 유니폼",   price: 25000, c: "#2e3a66", d: "#f2f2f6", desc: "청춘 그 자체" },
  { id: "onepiece", name: "플레어 원피스",   price: 28000, c: "#e8b4c8", d: "#f6dce8", desc: "행사날 승부복" },
  { id: "suit",     name: "포멀 수트",       price: 39000, c: "#2b2b38", d: "#f2f2f6", desc: "어엿한 사회인 코스프레" },
  { id: "maid",     name: "클래식 메이드복", price: 45000, c: "#33334a", d: "#ffffff", desc: "찻집 이벤트용?" },
  { id: "parka",    name: "퍼 후드 파카",    price: 52000, c: "#7a9e8e", d: "#e8e4d8", desc: "겨울 행사 필수템" },
  { id: "cape",     name: "마법사 케이프",   price: 59000, c: "#4a2a7a", d: "#ffd166", desc: "코스프레의 세계로..." },
];
// 액세서리
export const ACCS = [
  { id: "catears",  name: "고양이 귀",     price: 8000,  c: "#8a6a4a", desc: "냥." },
  { id: "ribbon",   name: "왕리본",        price: 7000,  c: "#e94560", desc: "머리에 큰 리본" },
  { id: "glasses",  name: "동그란 안경",   price: 9000,  c: "#3a3340", desc: "지적인 척 가능" },
  { id: "headset",  name: "헤드폰",        price: 15000, c: "#4a4a5e", desc: "작업할 땐 음악" },
  { id: "beret",    name: "베레모",        price: 12000, c: "#c0455a", desc: "그림쟁이의 상징" },
  { id: "mask",     name: "마스크",        price: 5000,  c: "#f2f2f6", desc: "행사장 필수" },
  { id: "halo",     name: "천사 링",       price: 33000, c: "#ffd166", desc: "머리 위에 반짝" },
  { id: "crown",    name: "황금 왕관",     price: 99000, c: "#ffd166", desc: "서코의 신의 증표" },
];
export const outfitOf = (id) => OUTFITS.find(o => o.id === id) || OUTFITS[0];
export const accOf = (id) => ACCS.find(a => a.id === id) || null;
export const DEFAULT_AVATAR = { skin: "s1", hair: "bob", hairColor: "#6b4a35", outfit: "hoodie", acc: null };
