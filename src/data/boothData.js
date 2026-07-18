// ============================================================
// 부스 플래너 v2 데이터 — 실측(cm) 기반 배치
// 부스 정면 뷰 = 폭 BOOTH_W(부스 크기별) × 높이 BOOTH_VIEW_H(210cm 고정)
// 존 4개: 상단 배너(top) / 뒷벽(wall) / 테이블 위(table) / 테이블 앞(front)
// 효과는 배치 "개수만큼 합산" — 최대 개수(max)가 자연 상한
// ============================================================

// 실제 서코 규정 참고: 디스플레이 높이 = 책상 상판 위 170cm 이하, 너비 = 책상 너비 이내(1부스 120cm / 2부스 240cm)
// 정면 뷰 = 디스플레이 170cm + 책상(상판~바닥) 75cm ≈ 245cm
export const BOOTH_VIEW_H = 245; // 정면 뷰 총 높이(cm)
export const BOOTH_WIDTHS = { small: 120, medium: 240, large: 480 }; // 부스 크기별 책상 너비(cm): 1부스/2부스/4부스

// 존: y는 위에서부터 cm. 물품은 자기 존 안에서만 드래그 가능. (top+wall = 규정상 디스플레이 170cm)
export const BOOTH_ZONES = [
  { id: "top",   name: "상단 배너", y0: 0,   y1: 45,  desc: "부스 위 공간 — 가로 현수막·가랜드" },
  { id: "wall",  name: "뒷벽",     y0: 45,  y1: 172, desc: "그물망 랙·포스터·클립 조명" },
  { id: "table", name: "테이블 위", y0: 172, y1: 204, desc: "진열대·판촉대·LED 스트립" },
  { id: "front", name: "테이블 앞", y0: 204, y1: 245, desc: "테이블보·앞면 현수막" },
];
export const zoneOf = (id) => BOOTH_ZONES.find(z => z.id === id);

// 카테고리: 종류별 설명 + 색 (카탈로그 그룹핑용)
export const BOOTH_CATS = [
  { id: "banner",  name: "현수막",   icon: "🪧", color: "#e94560", desc: "내 그림 인쇄 가능 · 위/테이블 앞" },
  { id: "cloth",   name: "테이블보", icon: "🧵", color: "#c084fc", desc: "색·패턴 고정 기성품 · 1장만" },
  { id: "net",     name: "그물망 랙", icon: "🕸", color: "#4cc9f0", desc: "뒷벽 걸이 진열 (구 대형 전시대)" },
  { id: "display", name: "진열대",   icon: "🪜", color: "#06d6a0", desc: "테이블 위 계단식 (구 소형 전시대)" },
  { id: "promo",   name: "판촉대",   icon: "🎁", color: "#ffd166", desc: "테이블 위 스탠드·바구니" },
  { id: "light",   name: "조명",     icon: "💡", color: "#ff9f43", desc: "스트립·클립등·가랜드" },
];

// 물품 카탈로그 — w/h(cm), zone, max(최대 배치 수), 효과(개당), printable(내 그림 인쇄)
export const BOOTH_CATALOG = [
  // 현수막 (1부스 책상 너비 120cm 이내 규격)
  { id: "banner_top_w", cat: "banner", name: "상단 현수막 · 와이드", icon: "🪧", zone: "top",   w: 115, h: 42, price: 18000, max: 1, fameBonus: 0.10, sellBonus: 0,    printable: true, desc: "부스 얼굴. 책상 너비 꽉 채움" },
  { id: "banner_top_m", cat: "banner", name: "상단 현수막 · 중형",   icon: "🪧", zone: "top",   w: 88,  h: 40, price: 13000, max: 2, fameBonus: 0.08, sellBonus: 0,    printable: true, desc: "여백을 살린 상단 배너" },
  { id: "banner_top_s", cat: "banner", name: "상단 현수막 · 소형",   icon: "🪧", zone: "top",   w: 58,  h: 36, price: 10000, max: 2, fameBonus: 0.05, sellBonus: 0,    printable: true, desc: "나란히 걸기 좋은 반쪽 배너" },
  { id: "banner_front", cat: "banner", name: "앞면 현수막",          icon: "🖼", zone: "front", w: 70,  h: 38, price: 12000, max: 2, fameBonus: 0.05, sellBonus: 0.02, printable: true, desc: "테이블 앞에 거는 천 배너" },
  // 테이블보 (색/패턴 고정 — 유저 커스텀 불가)
  { id: "cloth_purple", cat: "cloth", name: "테이블보 · 라벤더",     icon: "🟪", zone: "front", w: 0, h: 40, price: 5000, max: 1, fameBonus: 0,    sellBonus: 0.03, fullWidth: true, pattern: { kind: "solid",  a: "#b9a5e8" },              desc: "무난한 단색" },
  { id: "cloth_pink",   cat: "cloth", name: "테이블보 · 벚꽃핑크",   icon: "🩷", zone: "front", w: 0, h: 40, price: 5000, max: 1, fameBonus: 0,    sellBonus: 0.03, fullWidth: true, pattern: { kind: "solid",  a: "#f2b8cf" },              desc: "화사한 단색" },
  { id: "cloth_navy",   cat: "cloth", name: "테이블보 · 네이비",     icon: "🟦", zone: "front", w: 0, h: 40, price: 5000, max: 1, fameBonus: 0,    sellBonus: 0.03, fullWidth: true, pattern: { kind: "solid",  a: "#3d4a7a" },              desc: "굿즈가 돋보이는 어두운 톤" },
  { id: "cloth_check",  cat: "cloth", name: "테이블보 · 레드체크",   icon: "🏁", zone: "front", w: 0, h: 40, price: 7000, max: 1, fameBonus: 0.01, sellBonus: 0.04, fullWidth: true, pattern: { kind: "check",  a: "#d94f4f", b: "#f5eaea" }, desc: "피크닉 감성 체크" },
  { id: "cloth_stripe", cat: "cloth", name: "테이블보 · 스트라이프", icon: "🦓", zone: "front", w: 0, h: 40, price: 7000, max: 1, fameBonus: 0.01, sellBonus: 0.04, fullWidth: true, pattern: { kind: "stripe", a: "#7c8ce0", b: "#eef0fb" }, desc: "산뜻한 줄무늬" },
  { id: "cloth_lace",   cat: "cloth", name: "테이블보 · 화이트레이스", icon: "🤍", zone: "front", w: 0, h: 40, price: 9000, max: 1, fameBonus: 0.02, sellBonus: 0.05, fullWidth: true, pattern: { kind: "lace",  a: "#fdfbf7", b: "#e8dcc8" }, desc: "고급스러운 레이스" },
  // 그물망 랙 (구 대형 전시대)
  { id: "net_half", cat: "net", name: "그물망 랙 · 반면",   icon: "🕸", zone: "wall", w: 60,  h: 90,  price: 12000, max: 2, fameBonus: 0.02, sellBonus: 0.08, desc: "키링·뱃지 걸이 진열" },
  { id: "net_tall", cat: "net", name: "그물망 랙 · 세로형", icon: "🕸", zone: "wall", w: 45,  h: 120, price: 10000, max: 2, fameBonus: 0.02, sellBonus: 0.06, desc: "옆에 세우는 길쭉한 랙" },
  { id: "net_full", cat: "net", name: "그물망 랙 · 전면",   icon: "🕸", zone: "wall", w: 110, h: 100, price: 20000, max: 1, fameBonus: 0.04, sellBonus: 0.13, desc: "뒷벽을 꽉 채우는 진열벽" },
  // 진열대 (구 소형 전시대)
  { id: "disp_tier2", cat: "display", name: "계단식 진열대 · 2단",   icon: "🪜", zone: "table", w: 34, h: 22, price: 8000,  max: 2, fameBonus: 0,    sellBonus: 0.07, desc: "굿즈가 한눈에 들어온다" },
  { id: "disp_tier3", cat: "display", name: "계단식 진열대 · 3단",   icon: "🪜", zone: "table", w: 44, h: 30, price: 14000, max: 2, fameBonus: 0.01, sellBonus: 0.10, desc: "회지·엽서 대량 진열" },
  { id: "disp_wide",  cat: "display", name: "와이드 진열대 · 2단",   icon: "🗄", zone: "table", w: 62, h: 26, price: 12000, max: 2, fameBonus: 0.01, sellBonus: 0.09, desc: "옆으로 긴 저단 진열" },
  // 판촉대
  { id: "promo_acryl",  cat: "promo", name: "아크릴 스탠드 판촉대", icon: "🎁", zone: "table", w: 18, h: 24, price: 6000, max: 3, fameBonus: 0.01, sellBonus: 0.03, desc: "신간·추천 굿즈 강조" },
  { id: "promo_basket", cat: "promo", name: "판촉 바구니",          icon: "🧺", zone: "table", w: 28, h: 14, price: 5000, max: 2, fameBonus: 0,    sellBonus: 0.04, desc: "집어가기 좋은 세일 코너" },
  { id: "promo_easel",  cat: "promo", name: "미니 이젤 안내판",     icon: "🖼", zone: "table", w: 24, h: 30, price: 7000, max: 2, fameBonus: 0.02, sellBonus: 0.02, desc: "가격표·신간 안내" },
  // 조명
  { id: "light_strip",   cat: "light", name: "LED 스트립바",   icon: "💡", zone: "table", w: 60,  h: 5,  price: 13000, max: 2, fameBonus: 0.01, sellBonus: 0.07, desc: "테이블 가장자리 라인 조명" },
  { id: "light_clip",    cat: "light", name: "클립 스팟등",     icon: "🔦", zone: "wall",  w: 12,  h: 16, price: 9000,  max: 2, fameBonus: 0.04, sellBonus: 0.01, desc: "포스터를 비추는 집중 조명" },
  { id: "light_garland", cat: "light", name: "앵두전구 가랜드", icon: "✨", zone: "top",   w: 110, h: 10, price: 11000, max: 1, fameBonus: 0.06, sellBonus: 0,    desc: "부스 전체가 반짝반짝" },
];
export const catalogItem = (id) => BOOTH_CATALOG.find(c => c.id === id) || null;

// 포스터(내 그림, 뒷벽) — 사이즈 선택 가능 (실제 인쇄 규격)
export const ART_POSTER_SIZES = [
  { id: "a4", name: "A4", w: 21, h: 30 },
  { id: "a3", name: "A3", w: 30, h: 42 },
  { id: "a2", name: "A2", w: 42, h: 59 },
  { id: "b2", name: "B2", w: 51, h: 72 },
];
export const ART_POSTER_MAX = 6;
export const artPosterSpec = (sizeId) => { const s = ART_POSTER_SIZES.find(x => x.id === sizeId) || ART_POSTER_SIZES[1]; return { ...s, zone: "wall" }; };

// 제작 굿즈 전시 규격(cm) — 실물 크기 + 여백(목업의 링/받침 포함). 걸이류는 뒷벽, 나머지는 테이블 위.
// 종류당 1개만 직접 전시 가능. 전시 안 한 재고 굿즈는 자동 전시된다.
export const GOODS_DISPLAY = {
  postcard:  { w: 11,  h: 16, zone: "table" },
  photocard: { w: 6.5, h: 10, zone: "table" },
  sticker:   { w: 10,  h: 10, zone: "wall"  },
  clearfile: { w: 23,  h: 32, zone: "table" },
  acrylic:   { w: 10,  h: 16, zone: "table" },
  keyring:   { w: 7,   h: 11, zone: "wall"  },
  badge:     { w: 7,   h: 7,  zone: "wall"  },
  doujinshi: { w: 19,  h: 27, zone: "table" },
};
export const goodsDisplaySpec = (type) => ({ ...(GOODS_DISPLAY[type] || GOODS_DISPLAY.postcard) });

// 배치물 스펙: 카탈로그 물품 / 내 그림 포스터(사이즈 선택) / 제작 굿즈 전시
export const specFor = (p) => p.kind === "art" ? artPosterSpec(p.size) : p.kind === "goods" ? goodsDisplaySpec(p.gtype) : catalogItem(p.refId);

// 존 안으로 중심좌표 클램프 (비율계: x=부스폭, y=BOOTH_VIEW_H)
export function clampToZoneW(c, x, y, boothW) {
  const z = zoneOf(c.zone);
  const rw = Math.min(1, (c.fullWidth ? boothW : c.w) / boothW), rh = Math.min(1, c.h / BOOTH_VIEW_H);
  const x2 = c.fullWidth ? 0.5 : Math.max(rw / 2, Math.min(1 - rw / 2, x));
  const yMin = z.y0 / BOOTH_VIEW_H + rh / 2, yMax = Math.max(yMin, z.y1 / BOOTH_VIEW_H - rh / 2);
  return { x: x2, y: Math.max(yMin, Math.min(yMax, y)) };
}

// 미전시 재고 굿즈 자동 진열 (테이블 위 한 줄 + 뒷벽 한 줄)
export function autoGoodsInstances(autoGoods, boothW) {
  const mk = (arr, yR) => arr.map((g, i) => { const spec = goodsDisplaySpec(g.type); const n = arr.length; const x = n === 1 ? 0.5 : 0.13 + 0.74 * i / (n - 1); return { iid: "auto_" + g.id, kind: "goods", auto: true, refId: g.id, gtype: g.type, name: g.name, ...clampToZoneW(spec, x, yR, boothW) }; });
  return [
    ...mk(autoGoods.filter(g => goodsDisplaySpec(g.type).zone === "table"), 0.77),
    ...mk(autoGoods.filter(g => goodsDisplaySpec(g.type).zone === "wall"), 0.60),
  ];
}

// 구 BOOTH_ITEMS 보유분 → v2 카탈로그 대응 (기존 세이브 이관)
export const LEGACY_ITEM_MAP = { banner: "banner_top_w", stand_s: "disp_tier2", stand_l: "net_full", promo: "promo_acryl", cloth: "cloth_purple", light: "light_strip" };

// v2 레이아웃({version:2, items:[{iid,kind,refId,x,y,artImg?}]})의 효과 합산 (개수만큼)
export function layoutBonuses(layout) {
  const items = (layout && layout.version === 2 && layout.items) || [];
  let fame = 0, sell = 0;
  items.forEach(p => { if (p.kind !== "item") return; const c = catalogItem(p.refId); if (c) { fame += c.fameBonus || 0; sell += c.sellBonus || 0; } });
  return { fame, sell, count: items.length };
}

// 행사 계산용 부스 보너스: v2 레이아웃 우선, 없으면 레거시 boothItems(종류당 1회) 폴백
export function boothBonuses(state, legacyItems) {
  const l = state && state.boothLayout;
  if (l && l.version === 2) { const b = layoutBonuses(l); return { fame: b.fame, sell: b.sell }; }
  const owned = (state && state.boothItems) || [];
  let fame = 0, sell = 0;
  owned.forEach(id => { const it = (legacyItems || []).find(b => b.id === id); if (it) { fame += it.fameBonus || 0; sell += it.sellBonus || 0; } });
  return { fame, sell };
}

// 레거시 보유 목록 → v2 보유 개수 맵 초기값
export function invFromLegacy(boothItems) {
  const inv = {};
  (boothItems || []).forEach(id => { const nid = LEGACY_ITEM_MAP[id]; if (nid) inv[nid] = Math.max(inv[nid] || 0, 1); });
  return inv;
}
