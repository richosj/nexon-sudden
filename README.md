# nexon-sudden

서든어택 21주년 이벤트 페이지 — 퍼블리싱 + Vue 기능 프로토타입

> **최종 갱신:** 2026-07-12  
> 작업 기준 HTML: `main.html` (디자인 + 기능) · 기능 참고: `update.html`

---

## 로컬 실행

```bash
npm install
npm run dev          # SCSS watch
npm run scss         # SCSS 1회 빌드
npm run build        # SCSS compressed 빌드
```

로컬 확인 시 정적 서버로 열어 주세요. (`file://`은 fetch 목업 API가 동작하지 않을 수 있음)

```bash
npx serve .
# 또는 Live Server 등으로 http://localhost 기준 접속
```

---

## 배포

GitHub Pages — `main` push 시 Actions에서 SCSS 빌드 후 루트(`index.html`) 배포  
`dist/` 폴더는 사용하지 않습니다.

---

## 파일 구조

```
main.html                 ← 메인 페이지 (디자인 + Vue 바인딩)
update.html               ← 기능 프로토타입 (구버전 마크업, 참고용)
assets/
  data/                   ← API 목업 JSON
    medal.json
    medal_issued.json
    partner.json
    attendance.json
    vault.json
  scripts/
    event.js              ← Vue 3 setup() — 이벤트 로직
    control.js            ← 스크롤·팝업·data-scroll-* 
    utils.js              ← Utils.alert / confirm
  styles/
    style.scss            ← SCSS 진입점
    style.css             ← 빌드 결과 (.gitignore)
    partials/
      _variables.scss
      _layout.scss
      _components.scss
      _hero.scss
      _functional.scss    ← 기능 (앵커·disabled·출석 상태·메달 플로우)
      _modals.scss        ← 보상함·유의사항 모달
      _event.scss
      events/
        _event01.scss     ← 메달 합체 (step-list, reward-cards)
        _event02.scss     ← 출석 (cal-card 기본 박스 스타일)
        _event03.scss
        ...
  images/
```

---

## HTML · 섹션 id

| id | 영역 |
|---|---|
| `#event01` | EVENT1 · 메달 합체 |
| `#event01-reward` | EVENT1 · 보상 안내 |
| `#event02` | EVENT2 · 21일 출석 |
| `#event03` | EVENT3 · 쇼케이스 |

상단 nav · 히어로 CTA는 `data-scroll-active` / `data-scroll-to` 로 스크롤 (`control.js` `pageScroll`).

---

## 스크립트 역할

### `control.js`

- `pageScroll.to(target)` — sticky topbar 높이(`--scroll-offset`) 보정 후 스크롤
- `pageScroll.initHash()` — URL 해시(`#event02` 등) 진입 시 해당 섹션 이동
- `[data-scroll-active]` — nav 클릭 + 스크롤 구간별 `is-active` 토글
- `[data-scroll-to]` — 단일 타겟 스크롤
- `bodyScroll.show()` / `hide()` — 모달·드로어 시 body 잠금

### `event.js` (Vue 3)

`.wrap`에 mount. **data + function** 구조로 API 연동 준비.

| 상태 객체 | 설명 |
|---|---|
| `user` | 로그인·캐릭터·제재 |
| `medal` | 메달 발급·코드·phase·신청·매칭 |
| `attend` | 21일 출석·보충권·마일스톤 |
| `vault` | 보상함 드로어 |
| `ui` | 유의사항 팝업 키 |

| 주요 함수 | 설명 |
|---|---|
| `clickIssueMedal()` | 메달 발급 |
| `lookupLive()` / `clickSendRequest()` | 코드 조회·합체 신청 |
| `clickAcceptReceived()` | 받은 신청 수락 |
| `clickClaimReward()` | 완성 보상 수령 |
| `clickDay()` | 일별 보상 / 보충 출석 |
| `clickRefreshAttendance()` | 출석 갱신 (3분 쿨) |
| `claimAllDaily()` | 일괄 수령 |
| `clickClaimMilestone()` / `clickClaimDuoMilestone()` | 마일스톤 |
| `openVault()` / `closeVault()` | 보상함 |
| `openNotice(key)` / `closeNotice()` | 유의사항 (`event01`~`event03`) |

API 연동 지점은 `getMedalState`, `postIssueMedal`, `getAttendance` 등 `TODO: API` 주석 참고.

---

## SCSS 규칙

- **디자인** → `events/_event0x.scss` (Figma 기준 border·background·레이아웃)
- **기능** → `_functional.scss` (상태 modifier, disabled, scroll-margin, 메달 플로우)
- **모달** → `_modals.scss` (보상함 드로어, 유의사항 팝업)
- `_functional.scss`에서 **기본 박스 스타일(border/background)을 덮어쓰지 않음** — modifier만 추가

### 출석 카드 (`.cal-card`)

| 파일 | 담당 |
|---|---|
| `_event02.scss` | 기본 박스 — `border: 1px solid var(--border-card)`, `background: var(--bg-card)` |
| `_functional.scss` | `--active`, `--done`, `--duo`, `--makeup`, `--makeable` 상태만 |

---

## 기능 체크리스트 (개발 회신 반영)

- [x] 앵커 스크롤 — `scroll-margin-top` + topbar offset
- [x] URL 해시 진입 (`#event02` 등)
- [x] 스크롤 방식 통일 — `data-scroll-active` / `data-scroll-to`
- [x] disabled·완료 시 hover/클릭 차단 (CSS + JS)
- [x] BEM 클래스 · 의미 있는 section id
- [x] Vue `:key` 고유값 (`st.id`, `d.id`, …)
- [x] 유의사항 · 보상함 모달
- [x] JSDoc 주석 (`event.js`)
- [x] 목 mock JSON + get/post 함수 분리

### 출석 헤더 아바타 (`.att-head__avatar`)

- HTML `<img src="./assets/images/att_head_avatar_bg.png">` 로 표시
- 파일명 **`att_head_avatar_bg.png`** — `assets/images/` 에 위치해야 함

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-07-12 | `main.html` Vue 기능 연결, `_functional.scss` 추가 |
| 2026-07-12 | 출석 카드 CSS 수정 — `_functional.scss`에서 border/background 리셋 제거 |
| 2026-07-12 | 모달 Teleport(`body`) · `_modals.scss` 통합 (보상함/유의사항/Utils.alert) |

---

## 주의

- SCSS 수정 후 `npm run scss` 또는 `npm run dev`로 `style.css` 재빌드 필요
- `style.css`는 gitignore — 배포는 CI에서 빌드
