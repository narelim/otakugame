# 서코의 신 (Seoko-ui-Sin) — 인수인계 문서

> 오타쿠 창작 활동 시뮬레이터. 플레이어는 팬덤의 한 명으로, 직접 그린 그림을 굿즈로 만들어 동인 행사에 참가하고 SNS로 팬덤과 소통한다. 모바일 세로(≤430px) UI 기준.

---

## 1. 실행 방법

```bash
cd seoko-sim
npm install
npm run dev        # 개발 서버 (http://localhost:5173, 점유 시 자동 다음 포트)
npm run build      # 프로덕션 빌드 (문법/컴파일 검증용으로도 사용)
```

- **기술 스택**: React 19 + Vite 8 (JSX), 순수 인라인 스타일, Canvas 2D / SVG, IndexedDB, localStorage
- 외부 UI 라이브러리 없음. 상태는 `App`의 단일 `useState(state)` 객체로 관리(전역 store 없음).

---

## 2. 파일 구조

```
seoko-sim/
├── src/
│   ├── App.jsx                 ← 게임 전체 로직/화면 (메인, 대부분 여기 있음)
│   ├── main.jsx, index.css
│   ├── data/
│   │   ├── npc_pool.json        ← NPC 105개 (변수 치환형 포함)
│   │   ├── friend_accounts.json ← 교류회 전용 지인 계정(friend_account)
│   │   ├── tweet_templates.json ← SNS 포스트 템플릿(카테고리/트리거/변수)
│   │   └── sns_events.json      ← 팔로워 변동 이벤트 39종
│   ├── systems/
│   │   └── snsEventSystem.js    ← 이벤트 롤/조건/효과/가중치 선택
│   └── components/
│       └── EventModal.jsx       ← 이벤트 연출(banner/modal/fullscreen)
```

> **주의**: 게임 로직 대부분이 `App.jsx` 한 파일에 있음(길다). `data/systems/components`로 일부만 분리돼 있고, 추가 분리(eventScheduleSystem/timeSystem/npcAssignSystem/BoothEditor/BoothViewer3D/EventCalendar/GenreTab)는 **미완(다음 작업)**.
> `~/Downloads/서코의신.jsx`는 `src/App.jsx`의 단일파일 백업 복사본(단, 이제 data/systems/components import 때문에 **단독 실행 불가**). 실제 실행은 항상 `seoko-sim`에서.

---

## 3. 게임 흐름

```
그림 그리기(스튜디오) → 갤러리 저장 → 굿즈팩토리에서 주문(제작기간) → 재고 확보
→ Majorland에서 행사 신청(부스 신청서) → 부스 꾸미기 → 행사장에서 판매 → SNS 반응
```

- **메인 탭**(상단): 🎨스튜디오 · 🏪부스 · 🎪행사장 · 🌙일상
- **📱 핸드폰 오버레이**(우하단 플로팅 버튼): 🐦SNS · 💬Matalk(준비중) · 🖼갤러리 · 🏭굿즈팩토리 · 🎪Majorland · 🎭장르 · 👤내계정(SNS 내)

---

## 4. 주요 시스템

### 4-1. 그림 앱 (DrawingApp)
- 레이어(최대 8) · 합성모드(곱하기/스크린/오버레이/더하기) · 불투명도
- 도구: 펜/노트(사각형)/패턴붓/지우개/스포이드/이동/선택 · 브러시 1~512px 슬라이더 · 비율 5종
- 세이브(레이어 포함, localStorage `seoko_draw_saves`) → 갤러리와 공유
- **포인터 캡처**로 캔버스 밖 드로잉 연속 처리
- 프로필 아바타 그리기에도 재사용

### 4-2. 굿즈 (그리기→주문 분리)
- `GOODS_TYPES`: 엽서/아크릴스탠드/스티커/포토카드/클리어파일/회지/아크릴키링/뱃지 — 각 단가·최소수량·**제작일(prodDays)**·외곽따기·모양
- **굿즈팩토리**(5단계 주문): 갤러리 이미지 선택 → 종류 → 옵션(수량/크기/외곽따기/뱃지모양) → 견적 → 주문
- **제작기간 시스템**: 주문은 `readyDay` 후 완성(하루 진행 시 `applyReadyOrders`로 재고 편입). 아크릴 외곽따기(`buildOutline`)는 흰배경 키아웃+흰테두리 합성
- 렌더: `GoodsSprite`(SVG)가 형태별 클리핑 — 부스 아이소뷰 & 워크뷰 공용

### 4-3. 부스
- `BoothViewer`(SVG 아이소메트릭): 현수막/조명/전시대/굿즈(×재고)/부스크기(소·중·대)
- `BoothWalk`: 도트 캐릭터 좌우 이동(키보드/버튼), 구역 진열 + 뱃지함
- ⚠️ **드래그앤드롭 배치 에디터 + Three.js 3D는 미구현(다음 작업)**

### 4-4. SNS / NPC
- **NPC 로스터**: 장르 저장 시 `buildNpcRoster`가 풀(105+지인8)에서 30명 선택·변수 채움 → `genre.assignedNPCs` + localStorage `seoko_npc_roster`
- **트윗 템플릿**(`pickTweet`): trigger/npcType/인기도(major·minor·ultra_minor 매핑)/minFame/requiredVars 필터 → `fillTweet`로 변수 치환({캐릭터명 또는 장르명} 복합토큰 포함), 없으면 postStyle 폴백
- **이미지 게시물**: IndexedDB 풀(`seokoNoSin`/imagePool)에서 pop → 팬/코스어 계정이 사진 게시물. 🔖 북마크 → 갤러리 "팬아트·인증" 탭
- **다장르 통합 피드**: 장르 2개+면 SNS에 [🌐전체]+장르 탭. 전체=합친 타임라인(장르 태그), 장르 탭=필터

### 4-5. SNS 이벤트 (팔로워 변동)
- `sns_events.json`(39종, 9카테고리) + `snsEventSystem.js`
- 하루 진행 시 15% 롤 → 조건 필터 → 가중치 선택. banner/modal/fullscreen 연출(`EventModal`), 선택지·카운트업
- fanTrust/engagement/imageTicket 필드, flags(recentPost/recentEvent/goodsSoldOut 등)

### 4-6. 다장르
- `state.genres[]` + `state.activeGenreId`. **활성 장르 수치/피드를 top-level(fame/followers/fanTrust/engagement/snsHistory)에 작업세트로 두고 전환 시 swap**(`switchActiveGenre`)
- 장르 앱: 6단계 위저드(매체→타입→캐릭터→CP→분위기→추가) + 장르 스위처 + 새 장르(최대5, 체력30·멘탈40, 추가 시 체력-20·멘탈-10)

### 4-7. 행사 시스템
- `FAIR_EVENTS`(9종: 코믹랜드/메이페스타/월드메이저/교류회/CP교류회/온리전/CP온리전/CP동아리)
- `generateEventSchedule`: 장르 생성 시 주말·인기도별 빈도로 일정 생성 → `genre.eventSchedule`
- **Majorland**: 일정 리스트(D-day) → **부스 신청서 단계**(서클명/설명/부스크기/굿즈/견적) → 신청. `activeEvent`
- 행사장: activeEvent 이름/**maxSales 상한** 반영. D-7 라인업 공개 이벤트

### 4-8. 시간 시스템
- 하루 = 행동 2슬롯(오전/오후) + 저녁 자유 + 취침. **그림 그리기는 시간 무소비**
- 취침=`advanceDay`(체력·멘탈+5, 제작일 차감, 이벤트 롤, D-day 알림)
- **행사 당일**(`isEventDay`): 취침/그리기/주문 잠금, 행사장만
- **실시간 경과**: 현실 10분=게임 1일(App 타이머, 타이틀·행사당일·모달 중 정지)
- D-day 알림: D-14/7/5/3/1/당일

---

## 5. gameState 개요 (INITIAL_STATE, `App.jsx` 상단)

```js
{
  screen, day, gameDate:{month,day}, actionsToday,
  gold, stamina, mentalHealth,
  // 활성 장르 작업세트(전환 시 swap):
  fame, followers, fanTrust, engagement, snsHistory[], npcRoster,
  genre,                 // 활성 장르 미러(+레거시 name/chars/cpType/tags/desc)
  genres[], activeGenreId,   // 각 genre: {id,name,characters,cp,vibes,fame,followers,snsHistory,assignedNPCs,eventSchedule,...}
  goods[], orders[],     // 굿즈/주문(제작중)
  boothSize, boothApp, activeEvent, appliedEvents[],
  profile:{handle,displayName,bio,avatarData}, imageTicket,
  pendingSnsEvent, lastEventId, flags:{...}
}
```

- localStorage: `seoko_draw_saves`(그림/갤러리), `seoko_npc_roster`
- IndexedDB `seokoNoSin`: `imagePool`, `bookmarks`
- ⚠️ **게임 상태(state)는 새로고침 시 초기화됨**(세이브/로드 미구현). 그림·북마크만 영속.

---

## 6. 확장 포인트 (LLM 백엔드 연결 지점)

브라우저 단독이라 실시간 LLM/이미지 생성이 없어서 로컬 로직으로 대체해 둠. 백엔드 프록시 생기면 **아래 함수 내부만** 교체:
- `generateImage(eventType, ctx)` — 지금은 캔버스 플레이스홀더 → 실제 이미지 생성 API
- `buildNpcRoster(genre)` — 지금은 가중치/필수/솔로 로컬 선택 → LLM 15~30명 선택+변수채움
- `pickTweet` / SNS `refresh` — 지금은 템플릿 기반 → LLM 생성 (api.anthropic.com 직접호출은 CORS로 막힘)

---

## 7. 남은 작업 (우선순위)

1. **부스 꾸미기 개편**: 드래그앤드롭 배치 에디터(패널 A4/A3/B2/팝업, 직접 그린 현수막 8:3, 굿즈 진열) + 3D 뷰(Three.js or SVG 고도화 — 방향 미정)
2. 파일 분리: `eventScheduleSystem/timeSystem/npcAssignSystem.js`, `BoothEditor/BoothViewer3D/EventCalendar/GenreTab.jsx`
3. 게임 상태 세이브/로드(localStorage 직렬화)
4. 장르당 이미지 티켓 제한(현재 계정 공용), 행사 캘린더 그리드, D-1 포장 미니이벤트, 당일 판매 애니메이션 고도화

---

## 8. 개발 관행

- 수정은 `src/App.jsx` → `npm run build`로 검증 → 필요 시 `~/Downloads/서코의신.jsx`로 백업 복사
- 에러 바운더리 있음(화면 크래시 시 검정 대신 에러+스택 표시)
- 인라인 스타일 다크 테마(#0d0d1a 계열), 이모지 아이콘 다수
