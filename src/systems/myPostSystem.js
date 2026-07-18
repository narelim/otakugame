/* ============================================================
   내 포스트 작성 — 자유 입력이 아니라 상황 맞춤 템플릿 중 선택.
   상황에 따라 목록이 달라진다: 마감 근황(항상) / 행사 참여 홍보(신청 행사
   있을 때, 대표 굿즈 이미지 첨부) / 새 옷 자랑(코디몰 구매 후) / 공식 굿즈
   자랑(덕질장 수집 후). 하루 1회 제한. 회고록 하이라이트는 내 포스트 우선.
   ============================================================ */

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 지금 상황에서 올릴 수 있는 포스트 템플릿 목록
export function myPostTemplates(state) {
  const t = [];
  t.push({ id: "wip", icon: "🫠", label: "마감 근황", text: pick(["원고 하는 중... 아직 살아있습니다 🫠", "마감이 나를 갈아넣지만 그래도 재밌다", "오늘도 스튜디오에서 밤샘각. 커피가 물이다", "선따는 중... 눈이 침침하다 (행복)"]) });
  const ev = state.activeEvent;
  if (ev && ev.startDay >= state.day) {
    const g = (state.goods || []).find(x => x.stock > 0);
    t.push({ id: "promo", icon: "🎪", label: "행사 참여 홍보", text: `『${ev.name}』 참가합니다! ${(state.boothApp && state.boothApp.name) || "저희 부스"}에서 만나요 🙌 신간·굿즈 준비 중!`, imageUrl: g ? (g.baseImage || g.imageData) : undefined });
  }
  if ((state.wardrobe || []).length > 1) t.push({ id: "ootd", icon: "👗", label: "새 옷 자랑", text: pick(["새 옷 샀다!! 이번 행사 때 입고 갈까 👗", "코디몰에서 질렀다... 후회는 없다", "오늘의 코디 기록. 덕질도 꾸미면서 해야지"]) });
  const col = state.collection || [];
  if (col.length) { const last = col[col.length - 1]; t.push({ id: "haul", icon: "🎀", label: "공식 굿즈 자랑", text: `공식 굿즈 겟!! ${last.name} 실물 미쳤다... 공식이 일을 한다` }); }
  return t;
}

export const canPostToday = (s) => s.lastMyPostDay !== s.day;

// 포스트 발행: 피드 맨 위 + 소소한 팔로워/호응 보상 + recentPost 플래그
export function publishMyPost(state, tpl) {
  const handle = (state.profile && state.profile.handle && state.profile.handle !== "@") ? state.profile.handle : "@me";
  const name = (state.profile && state.profile.displayName) || undefined;
  const likes = 3 + Math.floor(Math.random() * 12 + (state.followers || 0) * 0.06);
  const delta = 1 + Math.floor(Math.random() * 5);
  const post = { id: Date.now() + Math.random(), isMine: true, from: handle, name, avatar: "👤", text: tpl.text, imageUrl: tpl.imageUrl, likes, rt: Math.floor(likes * 0.4), followerDelta: delta, mood: "good", timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
  return {
    ...state,
    snsHistory: [post, ...(state.snsHistory || [])].slice(0, 40),
    followers: (state.followers || 0) + delta,
    engagement: Math.min(100, (state.engagement || 0) + 2),
    flags: { ...state.flags, recentPost: true },
    lastMyPostDay: state.day,
  };
}
