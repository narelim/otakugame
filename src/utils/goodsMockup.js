import { starPath, heartPath } from "./draw.js";

/* ============================================================
   굿즈 목업 자동 생성 (Canvas 2D — AI 아님)
   유저 그림을 실물처럼: 광택 스윕, 아크릴 받침, 금속 키링, 뱃지 돔 하이라이트,
   회지 페이지 단면, 스티커 다이컷+박리 코너, 클리어파일 비닐 시트 질감.
   goodsMockup(goods) → Promise<dataURL(png, 투명배경)>. 결과는 메모리 캐시.
   ============================================================ */

const S = 26;            // px per cm (출력 해상도)
const cache = new Map(); // key: goods.id + 이미지 길이 (그림 바뀌면 재생성)

function cnv(w, h) { const c = document.createElement("canvas"); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
// 잘림 없이 채우기(cover)
function cover(ctx, img, x, y, w, h) { const ir = img.width / img.height, r = w / h; let sw, sh, sx, sy; if (ir > r) { sh = img.height; sw = sh * r; sx = (img.width - sw) / 2; sy = 0; } else { sw = img.width; sh = sw / r; sx = 0; sy = (img.height - sh) / 2; } ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); }
// 대각 광택 스윕
function gloss(ctx, x, y, w, h, a = 0.16) { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0.30, "rgba(255,255,255,0)"); g.addColorStop(0.44, `rgba(255,255,255,${a})`); g.addColorStop(0.50, `rgba(255,255,255,${a * 0.5})`); g.addColorStop(0.58, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
// 부드러운 바닥 그림자
function shadow(ctx, on) { if (on) { ctx.shadowColor = "rgba(18,14,40,0.38)"; ctx.shadowBlur = S * 0.45; ctx.shadowOffsetY = S * 0.22; } else { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; } }

// ── 종류별 렌더러 (cm 단위 실측) ──
function drawCard(img, wCm, hCm, { radius = 0.25, border = 0.32, glossA = 0.17 } = {}) {
  const pad = S, w = wCm * S, h = hCm * S, c = cnv(w + pad * 2, h + pad * 2), x = pad, y = pad, ctx = c.getContext("2d");
  shadow(ctx, true); ctx.fillStyle = "#fff"; rr(ctx, x, y, w, h, radius * S); ctx.fill(); shadow(ctx, false);
  const b = border * S; ctx.save(); rr(ctx, x + b, y + b, w - b * 2, h - b * 2, Math.max(1, (radius - 0.1) * S)); ctx.clip();
  cover(ctx, img, x + b, y + b, w - b * 2, h - b * 2); gloss(ctx, x, y, w, h, glossA); ctx.restore();
  ctx.strokeStyle = "rgba(30,20,60,0.10)"; ctx.lineWidth = 1; rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius * S); ctx.stroke();
  return c;
}
function drawClearfile(img, wCm, hCm) {
  const pad = S, w = wCm * S, h = hCm * S, c = cnv(w + pad * 2, h + pad * 2), x = pad, y = pad, ctx = c.getContext("2d");
  shadow(ctx, true); ctx.fillStyle = "#f4f6fb"; rr(ctx, x, y, w, h, 0.2 * S); ctx.fill(); shadow(ctx, false);
  ctx.save(); rr(ctx, x, y, w, h, 0.2 * S); ctx.clip();
  cover(ctx, img, x, y, w, h);
  // 비닐 시트 질감: 세로 광, 대각 광, 하단 접합선
  const v = ctx.createLinearGradient(x, y, x + w, y); v.addColorStop(0, "rgba(255,255,255,0.16)"); v.addColorStop(0.12, "rgba(255,255,255,0.02)"); v.addColorStop(0.9, "rgba(255,255,255,0.02)"); v.addColorStop(1, "rgba(255,255,255,0.2)");
  ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
  gloss(ctx, x, y, w, h, 0.22);
  ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = Math.max(1, 0.06 * S);
  ctx.beginPath(); ctx.moveTo(x + w * 0.965, y + h * 0.02); ctx.lineTo(x + w * 0.965, y + h * 0.98); ctx.stroke(); // 오른쪽 웰딩 라인
  ctx.restore();
  ctx.strokeStyle = "rgba(120,140,190,0.45)"; ctx.lineWidth = 1.2; rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 0.2 * S); ctx.stroke();
  return c;
}
function drawSticker(img, wCm, hCm) {
  const pad = S * 1.2, w = wCm * S, h = hCm * S, c = cnv(w + pad * 2, h + pad * 2), ctx = c.getContext("2d");
  ctx.translate(c.width / 2, c.height / 2); ctx.rotate(-4 * Math.PI / 180); ctx.translate(-w / 2, -h / 2);
  const cut = 0.34 * S, r = 0.9 * S;
  shadow(ctx, true); ctx.fillStyle = "#fff"; rr(ctx, -cut, -cut, w + cut * 2, h + cut * 2, r + cut); ctx.fill(); shadow(ctx, false); // 다이컷 흰 테두리
  ctx.save(); rr(ctx, 0, 0, w, h, r); ctx.clip(); cover(ctx, img, 0, 0, w, h); gloss(ctx, 0, 0, w, h, 0.13); ctx.restore();
  // 박리(peel) 코너
  const p = 0.85 * S, px = w + cut, py = h + cut;
  ctx.save(); ctx.beginPath(); ctx.moveTo(px - p, py); ctx.lineTo(px, py - p); ctx.lineTo(px, py); ctx.closePath();
  const pg = ctx.createLinearGradient(px - p, py, px, py - p); pg.addColorStop(0, "#cfcfdd"); pg.addColorStop(0.5, "#ffffff"); pg.addColorStop(1, "#e8e8f2");
  ctx.shadowColor = "rgba(18,14,40,0.3)"; ctx.shadowBlur = 3; ctx.fillStyle = pg; ctx.fill(); ctx.restore();
  return c;
}
function drawAcrylic(img, wCm, hCm, { ring = false } = {}) {
  const pad = S * 1.1, w = wCm * S, h = hCm * S, baseH = ring ? 0 : 1.1 * S, ringR = ring ? 0.85 * S : 0;
  const c = cnv(w + pad * 2, h + baseH + ringR * 2.4 + pad * 2), ctx = c.getContext("2d");
  const x = pad, yTop = pad + ringR * 2.4, artH = h - baseH;
  // 스탠드 받침 (아크릴 기둥 느낌)
  if (!ring) {
    const bw = w * 0.72, bx = x + (w - bw) / 2, by = yTop + artH - 0.15 * S;
    shadow(ctx, true);
    const bg = ctx.createLinearGradient(bx, by, bx, by + baseH); bg.addColorStop(0, "rgba(195,222,255,0.85)"); bg.addColorStop(0.5, "rgba(150,185,235,0.55)"); bg.addColorStop(1, "rgba(120,150,210,0.65)");
    ctx.fillStyle = bg; rr(ctx, bx, by, bw, baseH, 0.25 * S); ctx.fill(); shadow(ctx, false);
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx + 2, by + 1.5); ctx.lineTo(bx + bw - 2, by + 1.5); ctx.stroke();
  }
  // 본체(외곽컷 이미지) — contain으로 세워서
  const ir = img.width / img.height; let aw = w, ah = aw / ir; if (ah > artH) { ah = artH; aw = ah * ir; }
  const ax = x + (w - aw) / 2, ay = yTop + (artH - ah);
  shadow(ctx, true); ctx.drawImage(img, ax, ay, aw, ah); shadow(ctx, false);
  // 아크릴 광 줄기 (기울어진 밝은 띠)
  ctx.save(); ctx.beginPath(); ctx.rect(ax, ay, aw, ah); ctx.clip();
  ctx.translate(ax + aw * 0.28, ay); ctx.rotate(9 * Math.PI / 180);
  const st = ctx.createLinearGradient(0, 0, aw * 0.16, 0); st.addColorStop(0, "rgba(255,255,255,0)"); st.addColorStop(0.5, "rgba(255,255,255,0.20)"); st.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = st; ctx.fillRect(0, -ah * 0.2, aw * 0.16, ah * 1.6); ctx.restore();
  // 키링 금속 고리
  if (ring) {
    const cxr = x + w / 2, cyr = pad + ringR;
    const mg = ctx.createLinearGradient(cxr - ringR, cyr - ringR, cxr + ringR, cyr + ringR); mg.addColorStop(0, "#f2f2f6"); mg.addColorStop(0.45, "#9fa3ae"); mg.addColorStop(0.55, "#e8e9ee"); mg.addColorStop(1, "#8d919c");
    ctx.lineWidth = 0.24 * S; ctx.strokeStyle = mg; ctx.beginPath(); ctx.arc(cxr, cyr, ringR, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 0.1 * S; ctx.strokeStyle = "#b9bdc8"; ctx.beginPath(); ctx.arc(cxr, cyr + ringR * 1.55, 0.28 * S, 0, Math.PI * 2); ctx.stroke(); // 그림에 뚫린 구멍
  }
  return c;
}
function drawBadge(img, dCm, shape) {
  const pad = S, d = dCm * S, r = d / 2, c = cnv(d + pad * 2, d + pad * 2), ctx = c.getContext("2d");
  const cx = pad + r, cy = pad + r;
  const path = shape === "heart" ? new Path2D(heartPath(cx, cy, r * 1.05)) : shape === "star" ? new Path2D(starPath(cx, cy, r * 1.1)) : (() => { const p = new Path2D(); p.arc(cx, cy, r, 0, Math.PI * 2); return p; })();
  shadow(ctx, true); ctx.fillStyle = "#e2e2ea"; ctx.fill(path); shadow(ctx, false);
  ctx.save(); ctx.clip(path); cover(ctx, img, cx - r * 1.25, cy - r * 1.25, r * 2.5, r * 2.5);
  // 가장자리 어두워지는 곡면 + 돔 하이라이트
  const edge = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 1.06); edge.addColorStop(0, "rgba(0,0,0,0)"); edge.addColorStop(1, "rgba(20,15,50,0.22)");
  ctx.fillStyle = edge; ctx.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
  ctx.beginPath(); ctx.ellipse(cx - r * 0.38, cy - r * 0.45, r * 0.34, r * 0.18, -0.6, 0, Math.PI * 2);
  const hi = ctx.createLinearGradient(cx - r * 0.7, cy - r * 0.7, cx, cy); hi.addColorStop(0, "rgba(255,255,255,0.55)"); hi.addColorStop(1, "rgba(255,255,255,0.05)");
  ctx.fillStyle = hi; ctx.fill(); ctx.restore();
  ctx.lineWidth = Math.max(1.2, 0.07 * S); ctx.strokeStyle = "#c3c4cf"; ctx.stroke(path);
  return c;
}
function drawBook(img, wCm, hCm) {
  const pad = S * 1.1, w = wCm * S, h = hCm * S, pageW = 0.35 * S, c = cnv(w + pageW + pad * 2, h + pageW + pad * 2), ctx = c.getContext("2d");
  ctx.translate(c.width / 2, c.height / 2); ctx.rotate(-1.6 * Math.PI / 180); ctx.translate(-(w + pageW) / 2, -(h + pageW) / 2);
  // 페이지 뭉치 (오른쪽·아래 단면)
  shadow(ctx, true); ctx.fillStyle = "#eceadf"; ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(w + pageW, pageW); ctx.lineTo(w + pageW, h + pageW); ctx.lineTo(pageW, h + pageW); ctx.lineTo(0, h); ctx.lineTo(w, h); ctx.closePath(); ctx.fill(); shadow(ctx, false);
  ctx.strokeStyle = "rgba(120,110,90,0.35)"; ctx.lineWidth = 0.8;
  for (let i = 1; i <= 3; i++) { const t = pageW * i / 4; ctx.beginPath(); ctx.moveTo(w + t, t + 1); ctx.lineTo(w + t, h + t - 1); ctx.stroke(); }
  // 표지
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); cover(ctx, img, 0, 0, w, h);
  const sp = ctx.createLinearGradient(0, 0, w * 0.12, 0); sp.addColorStop(0, "rgba(0,0,0,0.28)"); sp.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sp; ctx.fillRect(0, 0, w * 0.12, h); // 책등 음영
  gloss(ctx, 0, 0, w, h, 0.10); ctx.restore();
  ctx.strokeStyle = "rgba(40,30,20,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  return c;
}

function render(goods, img) {
  const t = goods.type, shape = goods.shape;
  if (t === "postcard") return drawCard(img, 10, 14.8);
  if (t === "photocard") return drawCard(img, 5.5, 8.5, { radius: 0.45, border: 0.22, glossA: 0.22 });
  if (t === "clearfile") return drawClearfile(img, 22, 31);
  if (t === "sticker") return drawSticker(img, 8, 8);
  if (t === "acrylic") return drawAcrylic(img, 9, 14);
  if (t === "keyring") return drawAcrylic(img, 5.5, 7.5, { ring: true });
  if (t === "badge") return drawBadge(img, 5.8, shape);
  if (t === "doujinshi") return drawBook(img, 18.2, 25.7);
  return drawCard(img, 10, 14.8);
}

// goods → 목업 dataURL. 실패 시 원본 이미지로 폴백.
export function goodsMockup(goods) {
  const key = String(goods.id) + ":" + ((goods.imageData || "").length || 0);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  return new Promise((res) => {
    try {
      const img = new Image();
      // 아크릴·키링은 외곽컷 이미지(imageData), 그 외는 원화(baseImage) 우선
      const useOutline = goods.type === "acrylic" || goods.type === "keyring";
      img.onload = () => { try { const url = render(goods, img).toDataURL("image/png"); cache.set(key, url); res(url); } catch { res(goods.imageData || goods.baseImage || null); } };
      img.onerror = () => res(goods.imageData || goods.baseImage || null);
      img.src = (useOutline ? (goods.imageData || goods.baseImage) : (goods.baseImage || goods.imageData)) || "";
    } catch { res(goods.imageData || goods.baseImage || null); }
  });
}
