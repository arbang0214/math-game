# math-game

초등 5~6학년 대상 분수/소수 타임어택 웹 게임.
기획 상세(게임 규칙, 문제 유형, 빌드 단계)는 `README.md` 참조 — 이 파일에는 코드 작성 규칙만 적는다.

## 기술 스택

- 바닐라 HTML/CSS/JS (ES Modules), 빌드 도구 없음
- **외부 의존성 추가 금지** — 테스트 프레임워크 포함. 필요해 보이면 먼저 물어볼 것
- 배포 대상: GitHub Pages (정적 파일로 완결되어야 함)

## 프로젝트 구조

- `problems.js` — 문제 생성·정답 판정 순수 로직 (DOM·네트워크 없음)
- `test-problems.js` — problems.js 단위 테스트 (자체 테스트 러너)
- `game-core.js` — 게임 루프 상태 머신 순수 로직 (question ↔ feedback 전이)
- `test-game-core.js` — game-core.js 단위 테스트
- `index.html` / `game.js` — UI. DOM 그리기와 클릭 연결만, 규칙은 game-core.js에
- `format.js` — 표시용 포맷 순수 로직 (문자열 속 분수를 세그먼트로 분해)
- `test-format.js` — format.js 단위 테스트
- `style.css` — 팝 카툰 테마·연출 CSS (규칙 없음, 표시 전용)

## 코드 컨벤션

1. **로직과 DOM 분리**: 게임 로직(문제 생성, 판정, 점수/콤보 계산, 타이머 규칙)은
   DOM 없는 순수 모듈로 작성한다. Node에서 `node test-*.js`로 테스트 가능해야 한다.
   DOM 조작은 UI 파일에만 둔다.
2. **무작위성은 주입한다**: 무작위가 필요한 함수는 `rng = Math.random`을 마지막
   파라미터로 받는다. 테스트에서는 fakeRng로 결정적 검증을 한다.
3. **수 비교는 정수 연산으로**: 분수/소수 값 비교에 부동소수점을 쓰지 않는다.
   `compareValues`처럼 유리수 {n, d}로 바꿔 정수 곱셈으로 비교한다.
4. **테스트는 두 겹으로**: 새 로직에는 (a) fakeRng 기반 결정적 테스트와
   (b) 무작위 반복 속성 검사(예: 500회)를 함께 작성한다.
5. 주석, 테스트 이름, 에러 메시지는 한국어로 쓴다.

## 명령어

- 테스트: `npm test`

## 작업 방식

- README의 "빌드 단계"를 한 번에 한 단계씩 진행한다. 여러 단계를 한꺼번에
  구현하지 말 것.
- 한 단계가 끝나면 README의 체크박스(⬜→✅)를 갱신한다.

## 현재 상태 / 미결사항

- 빌드 8단계(전체 리더보드)까지 완료 — 테스트 97개 통과(36+32+8+21).
  공개 URL: https://arbang0214.github.io/math-game/ (origin/master root에서
  자동 배포 — master에 push하면 곧 반영됨). 5단계 스펙:
  `docs/specs/problem-types.md`
- 화면 디자인 개편(팝 카툰 테마 + 리본 토끼 마스코트) 완료 — 스펙:
  `docs/superpowers/specs/2026-07-07-visual-redesign-design.md`
- 마스코트는 AI 생성 PNG(assets/rabbit-*.png, 원본 1024×1536) — 표정 4종은
  `data-face`로 전환(img 4장 겹침), 게임오버 컷 2장은 `isNewBest` 분기. 스펙:
  `docs/superpowers/specs/2026-07-10-image-assets-design.md`. 당근 목숨은
  `#carrot-icon` SVG symbol + `renderHearts`의 `createElementNS` 방식 유지.
  **미결**: 토끼 PNG 6장 합계 ~13MB — 축소(512px)하면 흐릿하다는 피드백이
  있었음. 줄이려면 샤픈 후처리나 WebP 변환 검토 필요
- 문제 유형 3종: `compare`(이지선다, answer `'left'|'right'`),
  `arithmetic`·`equivalent`(사지선다, `choices` 4개 + answer 인덱스 0~3).
  `checkAnswer`는 `choice === answer` 비교 하나로 두 형태를 모두 처리 —
  이 공존 방식을 바꾸지 말 것
- 점수 규칙: 정답당 `BASE_SCORE`(10) × 배율, 연속 정답 `COMBO_STEP`(3)개마다
  배율 +1, 상한 `MAX_MULTIPLIER`(4). 오답/시간초과 시 콤보만 리셋, 점수 유지
- 최고점은 localStorage 키 `math-game.best` — 저장/읽기는 game.js에만 있음
- 레벨: 점수 `LEVEL_SCORE_STEP`(100)마다 +1. 제한시간은 기본
  `TIME_LIMIT_MS`(12초)에서 레벨당 `TIME_STEP_MS`(0.5초)씩 감소, 하한
  `TIME_MIN_MS`(8초) — UI는 상수가 아니라 `state.timeLimitMs`를 읽는다.
  목숨은 `MAX_HEARTS`(5). 유형 혼합 비율·분모/배수 범위도 레벨을 따름
  (problems.js의 `*ForLevel` 함수들, 생성기 시그니처는 `(level, rng)`)
- 유형별 시간/배점 차등은 **미결** (6단계 범위에서 의도적으로 제외)
- 전체 리더보드(8단계): Supabase 무료 플랜 — 스키마·RLS는
  `docs/superpowers/specs/2026-07-10-leaderboard-design.md`. 순수 로직은
  `leaderboard.js`, 접속 정보는 `leaderboard-config.js`(anon key 공개 전제,
  비어 있으면 UI 숨김). 무료 플랜 7일 정지 방지용 keepalive cron이
  `.github/workflows/supabase-keepalive.yml`에 있음
- 화면 흐름: 시작 → 플레이 → 게임오버(다시 시작/순위 확인/게임 종료) →
  리더보드/엔딩. 전환은 game.js `showScreen()` 단일 경로, 시작 전엔 타이머
  정지(`screen === 'playing'` 게이트). 점수 등록은 **TOP 10 진입 가능할
  때만**(`qualifiesForTop`, 게임오버 시 조회 후 비동기 판정). 스펙:
  `docs/superpowers/specs/2026-07-10-screen-flow-design.md`
