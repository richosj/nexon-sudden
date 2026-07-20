# 서든어택 21주년 이벤트 페이지

퍼블리싱 + Vue 3 프로토타입. 서버 연동 시 **넥슨 SA 플랫폼팀**이 `event.js`의 get/post 만 연결하면 되도록 구성했습니다.

| 항목 | 내용 |
|------|------|
| 이벤트 기간 | **2026.08.06(목) 점검 후 ~ 08.27(목) 점검 전** (21일) |
| 보상 수령 마감 | **2026.09.03(목) 정기점검 전** |
| 기획 기준 | 이벤트페이지 기획안 **v3.3** / 마케팅 기획안 v1.9 정합 |
| 프론트 명세 | 퍼블리셔 개발 명세서 v1.0 (본 README와 동일 계열) |
| 산출물 | `index.html` · `assets/scripts/*` · `assets/styles/style.css` · `assets/data/*.json` |
| 최종 갱신 | **2026-07-20** |

---

## 로컬 실행

```bash
npm install
npm run scss          # SCSS → style.css 1회
npm run dev           # SCSS watch
```

`file://` 로는 mock fetch가 막힐 수 있으니 **로컬 HTTP 서버**로 여세요.

```bash
npx serve .
```

스크립트 로드 순서 (변경 금지):

1. jQuery 3.x  
2. Vue 3 global (`vue.global.prod`)  
3. `assets/scripts/utils.js`  
4. `assets/scripts/control.js`  
5. `assets/scripts/event.js` ← 마지막 (`#app` mount)

`utils.js` / `control.js` 는 20주년 공용 원본 — **수정 없이 사용**.

---

## 최근 반영 요약 (2026-07-20)

개발 회신·기획안 v3.3 기준으로 아래를 반영했습니다.

### 1) 반응형 viewport

| 항목 | 변경 |
|------|------|
| `<meta viewport>` | `width=1920` → **`width=device-width, initial-scale=1`** |
| `--min-width` | 기본 `0` · **1200px 이상**에서만 `1200` (중간폭 가로 스크롤 방지) |
| EVENT3 패널 | `width: 1200px` → `width: 100%; max-width: 1200px` |

> 구 viewport(`width=1920`)에서는 레이아웃 폭이 항상 1920이라 `@include mo`(≤767)가 모바일에서 동작하지 않았습니다.

### 2) 기획안 v3.3 정책 (FE)

- 신청 **취소 시 일일 횟수 미복구**
- **재신청 시 이전 신청 자동 취소** (횟수 미복구)
- 유의사항 e1/e2/e3 문구 정합
- 추첨 스피커 **100명** 표기 · 듀오 닉네임 고정 안내
- 보상 수령 후 **듀오 결성** 안내 알럿

### 3) 의미 없는 클래스 정리

스타일 없거나 중복·플레이스홀더 잔여 클래스를 제거/정리했습니다.

| 조치 | 클래스 |
|------|--------|
| **HTML 제거** | `panel-glow`, `hero__title-slot`, `cal-wrap`, `section-block__bg`, `team-grid__head`, `caster-grid__head`, 단독 `img`, `img-slot` / `img-slot--circle` |
| **이름 변경** | `milestone__head-dummy` → `milestone__head-spacer` (flex 간격용, SCSS 동기화) |
| **JS 제거** | `step-list__item--done` (CSS 없음 → `stepItemClass`에서 `--active`만 반환) |

마크업은 **실제 스타일·동작에 쓰이는 BEM 클래스만** 유지합니다.

### 4) `event.js` JSDoc 주석 컨벤션

상태·핸들러·API에 **역할이 드러나는 블록 주석**을 달았습니다. (개발 인계용)

```js
/**
 * 유저 계정 정보
 * 로그인 여부, 인게임 캐릭터 존재 여부, 이벤트 제재 상태
 */
const user = reactive({
  login: true,
  character: true,
  penalty: false,
});

/**
 * '메달 발급받기' 버튼 클릭 핸들러
 * 로그인·캐릭터 존재 여부 및 참여 자격을 검증한 후, 메달 발급 API를 호출하여 내 코드를 부여
 */
async function clickIssueMedal() { ... }
```

동일 형식으로 `medal` / `attend` / `vault` / `ui`, get·post API, `clickSendRequest` · `clickDay` · `openVault` 등에도 주석이 있습니다.

---

## 개발자가 알아야 할 구조

### 데이터 흐름 (필수)

값을 미리 박아 두고 show/hide 하지 않습니다.

```
① 액션(클릭·로드) → ② get/post 수신 → ③ reactive 상태 세팅 → ④ 자동 렌더
```

`setup()` 블록: `[상태]` → `[정적 데이터]` → `[계산값]` → `[API]` → `[동작]` → `[초기화]`

### 파일 역할

| 파일 | 역할 |
|------|------|
| `assets/scripts/event.js` | Vue 앱 · 상태 · API stub · 클릭 핸들러 |
| `assets/scripts/utils.js` | `Utils.alert` / `confirm` / `bodyScroll` |
| `assets/scripts/control.js` | `data-scroll-active` 네비 · `pageScroll` |
| `assets/data/*.json` | API 응답 계약 mock (`rtnCode` / `message` / `result`) |

### 섹션

| id | 이벤트 |
|----|--------|
| `#event01` | 메달 합체 (phase 1~4) |
| `#event02` | 21일 듀오 출석 |
| `#event03` | 21주년 쇼케이스 (정적) |

### 상태 요약

- **`user`** — `login` · `character` · `penalty` → 참여 자격 `login && character && !penalty`
- **`medal`** — `phase`(1발급→2찾기→3대기→4완성) · `code` · `quota`(일 5회) · `received` · `matched` · `claimed`
- **`attend`** — `state[21]` (`0`미출석 · `1`출석 · `2`동반 · `4`보충) · `makeup` · `streak` · 마일스톤 claimed
- **`vault` / `ui`** — 보상함 드로어 · 유의사항(`event01`~`03`) · toast · MO 메뉴

`medal.side` (`L`/`R`) 는 **합체 연출용만**. 좌/우 매칭 제한 없음 (기획 v3.3).

---

## API 연동 지점 (`event.js`)

응답 권장 규격: `{ rtnCode, message, result }` — `rtnCode !== "0000"` 이면 `Utils.alert` 후 중단 (`fetchApi`).

| 함수 | 시점 | result (요약) |
|------|------|----------------|
| `getMedalState()` | 로드 | issued, code, side, phase, quota, matched, claimed, received, sentTo |
| `postIssueMedal()` | 발급 | code, side, received[] |
| `getPartner(code)` | 코드 조회 | found, nick, side, matchable, reason |
| `postSendRequest(p)` | 합체 신청 | ok (재신청 시 이전 신청 자동 취소) |
| `postAcceptMerge(p)` | 수락/완성 | matched, reward |
| `postClaimReward()` | EVENT1 기본 보상 | ok |
| `getAttendance()` | 로드·갱신 | state[21], todayIdx, makeup, streak, hasDuo, claimed[], msClaimed[], duoMsClaimed[] |
| `getVaultRewards()` | 보상함 오픈 | rewards[{name,date}] — **아직 stub** (`openVault` TODO) |

추가 TODO: 신청 취소 · 신청 거절 · 일별/일괄/마일스톤 보상 POST · 보충 출석 POST · SNS SDK.

mock 경로: `DATA_BASE = "./assets/data"` → 배포 시 API base URL로 교체.

---

## 프론트에 이미 반영된 정책 (서버와 동일해야 함)

### EVENT1 메달 합체

- 자격: 로그인 + SA 계정. 미충족 시 alert/confirm
- 신청 **1일 5회**, 매일 **오전 8시** 초기화 (초기화 시각은 서버)
- **신청 취소 시 횟수 미복구**
- **다른 상대 재신청 시 이전 신청 자동 취소** (횟수 미복구)
- 받은 신청 최대 10 · 최신/오래된 정렬 · 수락/거절
- 매칭·보상 수령은 `Utils.confirm` 2차 확인 (불가역)
- 확정 보상: 10만 경험치 + 리센느 멀티카운트 + 돌격 기간연장 영구제 (수령형)
- 추첨: 트윈 블루투스 스피커 **100명** · 1만 넥슨캐시 **2,100명** (종료 후 별도 지급)
- 듀오 닉네임은 **결성 시점 고정** (페이지 표시용)

### EVENT2 출석

- 판정: **게임 접속 1회** (웹 클릭 출석 아님) — UI는 배치 반영 + 「출석 갱신하기」(3분 쿨)
- 하루 기준: **08:00 ~ 다음날 07:59**
- 보충권: 동반 출석 일 +1(최대 5) · 3일 연속 +1(최대 5, 결석 시 streak 리셋)
- 보충(`state=4`) 날은 **연속·동반 집계 제외**
- 일자별·마일스톤·동반 5일 보상 모두 **페이지에서 「받기」** (자동지급 아님)
- 솔로 참여 가능 (`hasDuo` false 시 동반 UI 비활성)

### EVENT3 쇼케이스

- 정적 데이터(`showcase`) — 타임테이블 · 팀 · 중계진 · 시청 이벤트 5종
- 승부예측·N커넥트·드롭스 등은 **외부 링크/연동 슬롯** (실연동은 협의)

### 공통 UI

- 연관 이벤트 바로가기 **제외** (기획 변경)
- 공식 채널 4종: **홈페이지** · 페북 · 유튜브 · 인스타 (카페 → 홈)
- 내 보상함 전역 드로어 · 이벤트별 유의사항 모달 · toast

---

## 협의 · 확정 필요 사항

서버/기획/마케팅과 **아직 확정·협의가 필요한 항목**입니다. FE는 가정값·카피로만 두고 있습니다.

### 정책 · 매칭

| 항목 | 현황 / 질문 |
|------|-------------|
| 메달 발급 1회성·재발급 | 재발급 가능 여부 확정 필요 |
| 1:1 vs 1:N · 동시 수락 | 레이스 처리·어뷰징 룰 최종안 |
| 동일 명의 계정 듀오 차단 | 서버 검증 필수 (FE는 reason 표시만) |
| 본인·기매칭 코드 차단 | `getPartner.reason` 으로 안내 — 문구/코드 표 협의 |
| 좌/우 구분 | **매칭 제한 삭제** 확정. `side`는 연출만 |

### 출석 · 지급

| 항목 | 현황 / 질문 |
|------|-------------|
| 접속 로그 배치 연동 | 플랫폼팀 — 반영 주기·지연 UX |
| 일자별 보상 지급 방식 | 기획표: “(지급 방식 논의 필요)” — 웹 수령형으로 FE 구현됨 |
| 인게임 자동지급 여부 | 출석/마일스톤은 **수령형**으로 통일할지 |
| 동반·연속 보충권 서버 집계 | FE는 표시만 — 집계는 서버 계산값 사용 |
| SP·제작재료 30일 미수령 삭제 · SP 본인인증 | 지급/수령 API에서 처리 |

### 보상 카피 · 에셋

| 항목 | 현황 / 질문 |
|------|-------------|
| 일자별·마일스톤 보상명 | 기획안 보상표(변경안) 반영됨 — 최종 검수 |
| 동반 5일 보상명 | `도안_영구제 밀봉` — 유의사항 쪽 “(보상명)” 자리 확정 카피 |
| 쇼케이스 시청 이벤트 상세 보상 | 기획: “차주 화~수 전달 예정” — EVENT3 카피 업데이트 |
| 키비주얼·로고·캐리커쳐 | 확정 에셋 수급 · 슬롯 비율 |
| 슬로건·리드 카피 | 마케팅팀 최종본 |

### 외부 연동 · URL

| 항목 | 현황 / 질문 |
|------|-------------|
| SNS 공유 (카카오 등) | SDK·자동 이미지/문구 — TODO |
| SOOP / YouTube / 승부예측 URL | 최종 URL 확정 후 반영 |
| N커넥트·드롭스 | 선택 동의 플로우 · 보상 지급 주체 |
| 병영 수첩 링크 | 듀오 프로필 deep link 규격 |
| 공식 채널 URL | 홈/페북/유튜브/인스타 최종 검수 |

### 인프라 · CS

| 항목 | 현황 / 질문 |
|------|-------------|
| 세션 → `user` 주입 | 로그인·캐릭터·제재 판정 소스 |
| 보상함 `getVaultRewards` | 동기화 범위 (개발 리소스 최소화 원칙과 균형) |
| 당첨자 발표 | 9/3 게시판 URL |
| QA 범위 | 넥슨게임즈 QM 협의 |

---

## 개발 인계 체크리스트

- [ ] `event.js` get/post `TODO: API` → 실 엔드포인트
- [ ] `rtnCode` 비정상 시 `Utils.alert` (이미 `fetchApi` 패턴 있음)
- [ ] `user` 를 실세션 값으로 주입
- [ ] 메달 검증·quota·취소수복구 정책을 서버와 동일하게
- [ ] 출석 `state`/`makeup`/`streak`/`hasDuo` 를 서버 계산값으로 표시만
- [ ] 보상 POST 멱등성 · 수령기간(9/3 전) 서버 검증
- [ ] `getVaultRewards` 연결 후 `openVault`에서 수신→오픈
- [ ] 데모용 `demoGoStep` / 작업용 `medal_issued.json` 로드 제거·복구
- [ ] 외부 링크·SNS·승부예측 URL 최종 반영
- [ ] 유의사항·보상 라벨 최종 카피 검수

---

## SCSS · 마크업 규칙

```bash
npm run scss
```

- 진입점: `assets/styles/style.scss`
- 브레이크포인트: `partials/_breakpoints.scss` (`$bp-mo: 767px` 등) — 숫자는 여기만
- 디자인 토큰: `partials/_variables.scss`
- viewport: `width=device-width, initial-scale=1`
- PC 기준 → `@include mo` 로 모바일 1열 축소
- **의미 없는 클래스 추가 금지** — CSS/동작에 쓰이지 않는 클래스는 넣지 않음
- 레이아웃 spacer가 필요하면 `*-spacer`처럼 **역할이 드러나는 이름** 사용

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-20 | **클래스 정리** · **JSDoc 주석 컨벤션** 적용 · README「최근 반영 요약」정리 |
| 2026-07-20 | viewport `device-width` · `--min-width` 1200+ 전용 · EVENT3 max-width |
| 2026-07-20 | 기획안 v3.3 정책 (횟수 미복구·재신청 자동취소·유의사항·추첨 100명 등) · 개발/협의 섹션 |
| 2026-07-17 | 보상함·유의사항·SNS·toast·confirm 라벨 |
| 2026-07-13 | `index.html` 통일 · GitHub Pages |

---

문의·정책 충돌 시 **기획안 v3.3 + 본 README의 협의 표**를 우선하고, 프론트 가정값은 서버 최종안이 나오면 그에 맞춥니다.
