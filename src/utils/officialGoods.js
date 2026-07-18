import { starPath, heartPath } from "./draw.js";
import { goodsMockup } from "./goodsMockup.js";

/* ============================================================
   공식 굿즈 절차 생성 (AI 아님) — 장르에 "최대한" 맞추는 방법:
   캐릭터 외형 태그 → 컬러 팔레트, 분위기 태그 → 모티프 패턴을 뽑아
   심볼+패턴+타이포 스타일의 공식 굿즈 아트를 시드 기반으로 그린다.
   세이브에는 시드/파라미터만 저장하고 이미지는 열 때마다 재생성(캐시).
   ============================================================ */

// 시드 RNG (mulberry32) — 같은 시드는 항상 같은 디자인
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 외형 태그 → 헤어 팔레트 [진한색, 밝은색]
const HAIR_PAL = { "은발": ["#8f9ab0", "#d7dde8"], "흑발": ["#33334a", "#5a5a74"], "금발": ["#e0a93f", "#f8e08e"], "적발": ["#c04040", "#f08a8a"], "백발": ["#b8b8c8", "#f4f4f8"], "컬러풀": ["#7c3aed", "#4cc9f0"] };
// 분위기 태그 → 모티프
const VIBE_MOTIF = { "달달": "heart", "설렘": "heart", "순애": "flower", "힐링": "cloud", "먹먹": "drop", "감동": "drop", "피폐": "thorn", "집착": "chain", "개그": "dot", "긴장감": "bolt", "액션": "bolt", "반전": "swirl", "진지": "diamond", "공포": "moon", "미스터리": "key" };
const MOTIF_NAME = { heart: "하트", flower: "플라워", cloud: "구름", drop: "레인", thorn: "가시덤불", chain: "체인", dot: "도트", bolt: "라이트닝", swirl: "스월", diamond: "다이아", moon: "문라이트", key: "시크릿", star: "스타" };
export const OFFICIAL_TYPES = [
  { type: "badge", name: "캔뱃지" }, { type: "photocard", name: "포토카드" }, { type: "acrylic", name: "아크릴 스탠드" }, { type: "keyring", name: "키링" }, { type: "sticker", name: "스티커" },
];
export const RARITIES = [
  { id: "N", w: 60, color: "#9aa0ae", mental: 0 }, { id: "R", w: 25, color: "#4cc9f0", mental: 3 }, { id: "SR", w: 12, color: "#c084fc", mental: 6 }, { id: "SSR", w: 3, color: "#ffd166", mental: 12 },
];

// 장르+시드 → 수집품 파라미터 (이미지는 저장 안 함)
export function rollItemParams(genre, seed) {
  const rng = mulberry32(seed);
  const chars = (genre && genre.characters && genre.characters.length) ? genre.characters : [{ name: (genre && genre.name) || "미지의 최애", appearanceTags: [] }];
  const ch = chars[Math.floor(rng() * chars.length)];
  const hairTag = (ch.appearanceTags || []).find(t => HAIR_PAL[t]);
  const pal = HAIR_PAL[hairTag] || ["#7c3aed", "#c9b8f0"];
  const vibes = (genre && genre.vibes) || [];
  const motif = VIBE_MOTIF[vibes.find(v => VIBE_MOTIF[v])] || (rng() < 0.5 ? "star" : "dot");
  const t = OFFICIAL_TYPES[Math.floor(rng() * OFFICIAL_TYPES.length)];
  const r = rng() * 100; let acc = 0, rarity = "N";
  for (const rr of RARITIES) { acc += rr.w; if (r < acc) { rarity = rr.id; break; } }
  const shape = t.type === "badge" ? (motif === "heart" ? "heart" : motif === "star" ? "star" : "circle") : undefined;
  return { seed, char: ch.name || "최애", motif, pal, type: t.type, typeName: t.name, rarity, shape, genreName: (genre && genre.name) || "?", name: `${ch.name || "최애"} ${MOTIF_NAME[motif]} ${t.name}` };
}

// 모티프 도형 그리기
function drawMotif(ctx, m, x, y, r, color, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.fillStyle = color; ctx.strokeStyle = color;
  if (m === "heart") ctx.fill(new Path2D(heartPath(0, 0, r)));
  else if (m === "star") ctx.fill(new Path2D(starPath(0, 0, r)));
  else if (m === "flower") { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, r * 0.42, 0, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill(); }
  else if (m === "cloud") { [[0, 0, 0.55], [-0.5, 0.15, 0.4], [0.5, 0.15, 0.4]].forEach(([dx, dy, s]) => { ctx.beginPath(); ctx.arc(dx * r, dy * r, r * s, 0, Math.PI * 2); ctx.fill(); }); }
  else if (m === "drop") { ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.9, r * 0.2, 0, r); ctx.quadraticCurveTo(-r * 0.9, r * 0.2, 0, -r); ctx.fill(); }
  else if (m === "bolt") { ctx.beginPath(); ctx.moveTo(-r * 0.2, -r); ctx.lineTo(r * 0.45, -r * 0.15); ctx.lineTo(r * 0.05, -r * 0.05); ctx.lineTo(r * 0.25, r); ctx.lineTo(-r * 0.45, r * 0.05); ctx.lineTo(-r * 0.05, -r * 0.08); ctx.closePath(); ctx.fill(); }
  else if (m === "diamond") { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, 0); ctx.closePath(); ctx.fill(); }
  else if (m === "moon") { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(r * 0.45, -r * 0.2, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }
  else if (m === "chain") { ctx.lineWidth = r * 0.28; [[-r * 0.45, 0], [r * 0.45, 0]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(dx, dy, r * 0.42, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); }); }
  else if (m === "thorn") { ctx.lineWidth = r * 0.18; ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0.3, Math.PI * 2 - 0.3); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); ctx.lineTo(Math.cos(a + 0.35) * r * 1.05, Math.sin(a + 0.35) * r * 1.05); ctx.stroke(); } }
  else if (m === "swirl") { ctx.lineWidth = r * 0.2; ctx.beginPath(); for (let a = 0; a < Math.PI * 4; a += 0.2) { const rr = r * a / (Math.PI * 4); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); }
  else if (m === "key") { ctx.lineWidth = r * 0.2; ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -r * 0.05); ctx.lineTo(0, r); ctx.moveTo(0, r * 0.6); ctx.lineTo(r * 0.35, r * 0.6); ctx.moveTo(0, r); ctx.lineTo(r * 0.35, r); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill(); } // dot
  ctx.restore();
}

// 공식 굿즈 아트(정사각 560) — 패턴 + 중앙 엠블럼 + 캐릭터명 밴드
function drawArt(p) {
  const S = 560, c = document.createElement("canvas"); c.width = S; c.height = S; const ctx = c.getContext("2d");
  const rng = mulberry32(p.seed + 7);
  const [dark, light] = p.pal;
  const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  // 대각 밝은 띠
  ctx.save(); ctx.translate(S * 0.5, S * 0.5); ctx.rotate(-0.5); ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(-S, -S * 0.16, S * 2, S * 0.32); ctx.restore();
  // 흩뿌린 모티프 패턴
  for (let i = 0; i < 15; i++) {
    const x = rng() * S, y = rng() * S, r = S * (0.03 + rng() * 0.05);
    drawMotif(ctx, p.motif, x, y, r, `rgba(255,255,255,${0.14 + rng() * 0.2})`, rng() * Math.PI);
  }
  // 중앙 엠블럼
  ctx.beginPath(); ctx.arc(S / 2, S * 0.44, S * 0.24, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.stroke();
  drawMotif(ctx, p.motif, S / 2, S * 0.44, S * 0.13, "#ffffff", 0);
  // 캐릭터명 밴드
  ctx.fillStyle = "rgba(20,15,40,0.55)"; ctx.fillRect(0, S * 0.72, S, S * 0.15);
  ctx.fillStyle = "#fff"; ctx.font = `900 ${S * 0.085}px 'Noto Sans KR',sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(p.char, S / 2, S * 0.795, S * 0.9);
  ctx.font = `700 ${S * 0.035}px 'Noto Sans KR',sans-serif`; ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`${p.genreName} OFFICIAL`, S / 2, S * 0.92, S * 0.9);
  return c.toDataURL("image/png");
}

// 수집품 → 실물 목업 dataURL (아트 생성 → 기존 goodsMockup 파이프라인 재사용, 캐시 포함)
const artCache = new Map();
export function officialMockup(item) {
  const key = "off_" + item.seed + "_" + item.type;
  let art = artCache.get(key);
  if (!art) { art = drawArt(item); artCache.set(key, art); }
  return goodsMockup({ id: key, type: item.type, shape: item.shape, baseImage: art, imageData: art });
}
