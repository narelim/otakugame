# 밸런싱 핸드오프 — 서코의 신

> 이 문서는 밸런싱 작업을 맡는 세션(Claude)을 위한 단독 브리핑입니다.
> 게임 전체 맥락은 `ROADMAP.md` 참조. 여기엔 밸런싱에 필요한 것만 담습니다.

## 0. 목표 (우선순위 순)

1. **후반 골드 인플레 해소** — Day 100+ 수익 폭주를 체감 곡선으로 (아래 관찰 ①)
2. **멘탈을 살아있는 자원으로** — 현재 200일 내내 100 고정 (관찰 ②)
3. **완판 쾌감 복구** — 현재 완판이 사실상 발생 불가 (관찰 ③)
4. 초반~중반 자금 긴장(Day 50~80 바닥권)은 **건강하니 유지** — 초반을 더 어렵게 만들지 말 것

## 1. 검증 도구 (필수 워크플로)

```bash
npm run build   # 빌드 검증 (개발 관행)
npm test        # 로직 플레이테스트 7종 — 정합성 불변식. 절대 깨지면 안 됨
# 밸런스 곡선 시뮬 (관찰용 리포트, 200일 × 페르소나 2종):
npx vitest run tests/balance.report.test.js --reporter=verbose --silent=false
```

**작업 루프**: 수치 수정 → `npm test` 통과 확인 → 밸런스 시뮬로 전/후 곡선 비교 → 커밋 메시지에 전후 요약 포함.
시뮬 리포트 읽는 법: 20일 간격 골드(k)/멘탈/체력/인지/팔로워 표 + 행사 횟수·평균 수익·완판율·최저골드·수입/지출 카테고리.
시뮬의 플레이 정책 자체(`tests/balance.report.test.js`)는 "그럴듯한 플레이어"로 유지하되, 새 시스템을 추가하면 정책에도 반영할 것.

## 2. 관찰 결과 (2026-07 시뮬, 상세는 ROADMAP 밸런싱 항목)

| # | 문제 | 원인 | 처방 후보 |
|---|---|---|---|
| ① | 후반 골드 인플레 (200일 240~280만, 소비처 없음) | 판매율의 `fame/2000` 항과 `fameEarned`가 상호 증폭 (눈덩이) | fame 기여 캡 `min(0.25, fame/2000)` · fameEarned 체감(√ 또는 로그) · 후반 머니싱크는 백로그 콘텐츠(메루카리·아바타 고가템) 몫 |
| ② | 멘탈 200일 내내 100 | 원작수혈 ₩2,000에 +25가 과효율, 감소원 희소(옆부스 -15뿐) | 행사 D-7~D-1 마감 압박 멘탈 -3~5/일(메시지 연출과 함께) · 이월 재고 발생 시 멘탈 타격 · 알바 멘탈 소모. **강도는 유저와 상의된 바 없음 — 약하게 시작 권장** |
| ③ | 완판 0/30종 | 이월 재고가 재주문과 같은 goods로 스택되어 stock이 계속 증가 | 판매율 ≥0.97 시 전량 판매 처리 · (콘텐츠) 이월 재고 떨이/메루카리 처분 |
| ④ | 초반 긴장 (최저 ₩100~1,400) | — | **유지** (건드리지 말 것) |
| ⑤ | 후반 알바 수입 비중 급감 | 행사 수익이 커져서 | 의도된 구조 (초반 안전망). 방치 가능 |

## 3. 수치·수식 위치 지도

| 영역 | 파일 | 내용 |
|---|---|---|
| **행사 판매 시뮬** | `src/systems/eventSim.js` | ★핵심. `rate = min(1, 0.25 + rand*0.55 + fame/2000 + sellBonus)`, `fameEarned += floor(sold*0.6*(1+fameBonus))`, salesCap(행사 maxSales), 포장 체력/옆부스 멘탈 이벤트. **레거시·데스크톱이 공유하므로 여기만 고치면 양쪽 적용** |
| 굿즈 원가/판매가/제작일 | `src/data/gameData.js` `GOODS_TYPES` | 엽서 300/1500, 아크릴 1500/4000 등. 마진이 곧 행사 수익의 근원 |
| 행사 정의 | `src/data/gameData.js` `FAIR_EVENTS` | 부스비·maxSales·주기·minFame. 스케줄 생성은 `eventSystem.generateEventSchedule` |
| 부스 보너스 | `src/data/boothData.js` `BOOTH_CATALOG` | 물품 개당 fame/sell 보너스, **개수 합산**(`layoutBonuses`). 현 최대 sell 대략 +0.5~0.6 |
| 알바 | `src/systems/jobSystem.js` | `JOBS`(dayWage·workDays·staminaCost·minFame), `PAYDAY=25`, 성과배율은 `components/WorkGame.jsx`(×0.5~1.4) |
| 일상 행동 | `src/data/gameData.js` `DAILY_ACTIONS`, `ACT_MAX=2` | 체력/멘탈/골드 델타. 로직은 `systems/dailySystem.js` |
| SNS 랜덤 이벤트 델타 | `src/data/sns_events.json` + `systems/snsEventSystem.js` | 확률 15%/일, 팔로워/멘탈/골드 효과. `applyEventDelta`가 클램프(0~100, gold≥0) |
| 수집 보상 | `src/systems/collectionSystem.js` | 레어도 멘탈 +0/3/6/12, 세트 완성 +30. 획득 비용은 DAILY_ACTIONS의 newgoods(-8,000, 성공률 40%) |
| 내 포스트 보상 | `src/systems/myPostSystem.js` | 팔로워 +1~5/일, engagement +2 |
| 초기값 | `src/data/gameData.js` `INITIAL_STATE` | 골드 50,000 · 체력/멘탈 100 |
| 하루 길이 | `src/screens/DesktopShell.jsx` `DAY_MS=360000` | 현실 6분=1일 (밸런스보단 UX — 조정 시 유저 상의) |
| 거래 로그·성향 통계 | `src/systems/bankSystem.js` `logTx(s,amount,label,icon,cat)` | 새 수입/지출을 만들면 반드시 cat 지정 |

## 4. 제약 (어기면 안 됨)

- `npm test`의 정합성 검증(월급 합산, 다중 행사 승계, 불변식)은 **약화 금지**. 밸런스 수치만 바뀌면 테스트는 그대로 통과함.
- state 필드를 추가하면 `INITIAL_STATE`에 기본값 + `saveSystem.js`의 `SAVE_VERSION`/`migrate()` 규칙 준수 (기존 세이브 호환).
- UI/시스템 구조 변경은 범위 밖 — 수치·수식·데이터만. 새 머니싱크 콘텐츠(메루카리 등)는 별도 작업이므로 만들지 말 것.
- 콘텐츠 볼륨 확장(sns_events.json 대량 추가 등)도 별도 트랙 — 밸런싱과 섞지 말 것.
- 커밋: 한국어, 논리 단위 분리, 커밋 메시지에 시뮬 전/후 핵심 수치 포함. 각 커밋 전 `npm run build` + `npm test`.
- 초반(Day 1~50) 곡선을 지금보다 어렵게 만들지 말 것 (목표 4).

## 5. 완료 기준 (제안)

- 200일 시뮬에서: 최종 골드 60만~120만 구간, 멘탈이 40~90 사이를 오르내림(바닥 0일은 아니어도 압박 체감), 완판이 행사당 0~2종 발생, Day 50 이전 곡선은 현재와 유사.
- `npm test` 7/7 유지, 빌드 통과.
