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

- 빌드 5단계(문제 유형 확장) 완료 — 테스트 58개 통과(31+27). 6단계(레벨/난이도
  곡선) 착수 전. 스펙: `docs/specs/problem-types.md`
- 문제 유형 3종: `compare`(이지선다, answer `'left'|'right'`),
  `arithmetic`·`equivalent`(사지선다, `choices` 4개 + answer 인덱스 0~3).
  `checkAnswer`는 `choice === answer` 비교 하나로 두 형태를 모두 처리 —
  이 공존 방식을 바꾸지 말 것
- 점수 규칙: 정답당 `BASE_SCORE`(10) × 배율, 연속 정답 `COMBO_STEP`(3)개마다
  배율 +1, 상한 `MAX_MULTIPLIER`(4). 오답/시간초과 시 콤보만 리셋, 점수 유지
- 최고점은 localStorage 키 `math-game.best` — 저장/읽기는 game.js에만 있음
- 제한시간은 유형과 무관하게 10초 고정 (`TIME_LIMIT_MS`) — 레벨별 단축,
  유형별 시간/배점 차등, 유형 혼합 비율(현재 균등 1/3)은 6단계에서
- 전체 리더보드는 서버가 필요하며 **아직 설계되지 않음** — 관련 코드를
  미리 만들거나 구조를 가정하지 말 것. MVP는 localStorage 최고점만 사용
