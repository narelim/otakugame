# 서코의 신 — 정식 게임 개발 로드맵

> 결정된 방향: **웹 기반 유지**(React + Vite). Unity 재작성 안 함 — 핵심인 그림 앱(Canvas 2D)을 살리기 위함.
> 최종 목표: **Steam(PC) + 모바일(iOS/Android)**. 온라인 교류회(2D 도트 아바타, 게더타운형) + AI API 연동.

---

## 아키텍처 (목표 형태)

```
[클라이언트]  React (UI · 그림앱 · SNS · 굿즈)          ← 현재 코드 대부분 유지
        +  PixiJS 레이어 (교류회 플로어: 2D 도트 아바타)  ← 신규
        │
        │  Electron 으로 감싸 → Steam
        │  Capacitor 로 감싸 → iOS/Android
        ▼
[백엔드]  Node + Colyseus (실시간 룸: 교류회)
        +  AI 프록시 (Claude API 호출 · 레이트리밋 · 캐싱)
        +  DB (계정 · 세이브 · 굿즈/부스 데이터)
```

기술 선정 근거:
- **PixiJS**: 게더타운도 쓰는 2D WebGL 렌더러. 도트 아바타 공유 공간에 적합.
- **Colyseus**: Node 기반 authoritative 멀티플레이 룸 서버. 교류회 방(room) 모델에 직결.
- **Electron / Capacitor**: 웹 코드 하나로 Steam + 모바일 커버. 그림 앱 재작성 0.
- **AI 프록시 필수**: API 키 노출·CORS 때문에 클라 직접 호출 불가. 멀티용 백엔드가 겸함.

---

## Phase 0 — 기반공사 ✅ (완료)

정식 게임의 토대. 멀티/AI 붙이기 전에 반드시 튼튼하게.

- [x] **세이브/로드** — IndexedDB 자동저장(디바운스 800ms) + 타이틀 "이어하기" (`systems/saveSystem.js`)
- [x] **코드 구조 정리** — App.jsx 1,830줄 → systems/screens/components 분리 (App.jsx는 60줄 라우팅 셸)
- [x] **가로 풀화면 레이아웃** — 기본 진입 = 가로 데스크톱 셸(1920×1080 스케일 스테이지). 세로 모바일은 `#mobile` 레거시 라우트로 유지(같은 state 공유). maitalk 앱은 준비중 플레이스홀더.
- [x] **에러/안정성** — 공용 `ErrorBoundary`(App·데스크톱 앱창·폰·현생 모드에 적용), 세이브 버전 필드 + `migrate()` 훅 + `normalizeLoaded()` 누락 필드 보정

## Phase 1 — 게임성 완성 (싱글플레이)

- [x] 부스 꾸미기 개편 (부.꾸): 실측(cm) 기반 드래그 배치 에디터 — 존 4개(상단배너/뒷벽/테이블위/테이블앞), 종류별 최대 개수, 효과 개수 합산, 테이블보 기성품·현수막 내그림 인쇄, 전시대→그물망랙·계단식진열대 재해석 (`data/boothData.js` + `BoothPlannerApp.jsx`)
- [ ] 콘텐츠 볼륨 확장 + 밸런싱 (골드/체력/멘탈/인기도 곡선)
- [ ] 튜토리얼 / 온보딩
- [ ] 사운드 · 폴리싱 · 연출 고도화

## Phase 2 — AI 연동

- [ ] 백엔드 프록시 서버 (Node) — Claude API 안전 호출
- [ ] `generateImage` → 실제 이미지 생성 (팬아트/굿즈)
- [ ] `buildNpcRoster` / `pickTweet` → LLM 기반 NPC·트윗 생성
- [ ] 비용 통제: 레이트리밋 · 캐싱 · imageTicket 소비 설계

## Phase 3 — 멀티플레이 교류회 (메타버스)

- [ ] Colyseus 룸 서버 (교류회 = room)
- [ ] PixiJS 2D 도트 아바타 플로어 (이동/충돌/부스 배치)
- [ ] 계정/인증 · 남의 부스 방문·구경 · 실시간 채팅
- [ ] 굿즈/부스 데이터 서버 동기화

## Phase 4 — 출시 패키징

- [ ] Electron 래핑 + Steamworks (도전과제/클라우드세이브) → Steam
- [ ] Capacitor 래핑 → iOS/Android 스토어
- [ ] 빌드/배포 파이프라인, 스토어 심사 대응

---

## 개발 관행 (업데이트)
- 수정 후 `npm run build`로 검증. 베이스라인: 빌드 성공(~540KB, 2026-07 기준).
- state에 `saveVersion` 필드 두고, 로드 시 구버전 마이그레이션.
- 큰 UI 변경 전 코드 분리 우선 → 유지보수/멀티 확장 대비.
