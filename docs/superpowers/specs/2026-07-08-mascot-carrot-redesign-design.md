# 마스코트 토끼 리디자인 + 당근 목숨 설계 (2026-07-08)

플레이 후 피드백: 토끼 캐릭터를 통째로 더 귀엽게, 목숨 하트를 당근으로.
비주얼 컴패니언으로 v1~v8 반복 끝에 사용자가 확정한 디자인을 기록한다.
전부 표시 전용 변경 — 게임 규칙(game-core.js, problems.js, format.js)은 건드리지 않는다.

## 확정된 토끼 디자인 (v8)

레퍼런스(사용자 제공 rabbit1.png — 몽실한 3D 인형풍 흰 토끼)의 문법을 반영:

- **비율**: 머리가 전체의 절반 이상, 아래로 통통한 배(서양배형) 몸통,
  앞발은 배 위에 모은 연한 음영(`#f3ecf2`), 작은 발
- **얼굴형**: 정원이 아니라 볼이 옆으로 부푼 형태 (머리 타원 + 볼 원 2개 +
  턱 타원의 합집합 — 테두리 없는 흰 면이라 이음새가 안 보임)
- **귀**: 머리 위에 나란히 곧게 선 긴 귀, 속귀 연분홍(`#ffd9e3`)
- **눈**: 반짝임 2겹(큰 하이라이트 + 작은 점) 들어간 동그란 단추 눈(`#3a3a3a`)
- **코**: 작은 분홍 타원(`#ff9fb2`), **볼터치**: 눈 아래 은은하게(`#ffc9d6`)
- **리본**: 오른쪽 귀 밑 핑크 리본 유지 (기존 정체성 계승)
- **렌더링**: 테두리(스트로크) 없음, 소프트 플랫

### 표정 4종 (전환 메커니즘은 기존과 동일: `data-face` + `.face-*`)

| face | 눈 | 입 | 추가 요소 |
|---|---|---|---|
| idle | 단추 눈 | ω 입 (스트로크) | — |
| happy | 단추 눈 (변화 없음 — 사용자 요구) | 조그맣게 벌린 미소, 안쪽 빨강 `#e85550` (가로 14) | — |
| dizzy | X자 눈 | 벌어진 입 (타원 `#3a3a3a`) | — |
| worried | 단추 눈 | 물결 입 | 처진 눈썹 + 땀방울 `#9ad8ff` |

### 확정 SVG 지오메트리 (viewBox `0 0 140 152`)

공통(base): 귀 2 + 속귀 2, 몸통 `ellipse(70,126,27,23)`, 발 2, 앞발 음영 2,
머리 `ellipse(70,74,33,31)` + 볼 `circle(48,93,12)`/`circle(92,93,12)` +
턱 `ellipse(70,96,28,15)`, 리본(rotate 14, 중심 94,46), 코, 볼터치.
표정별 지오메트리는 브레인스토밍 산출물
`.superpowers/brainstorm/120-1783475843/content/rabbit-v8.html`의
`#base`/`#eyes-button`/`#face-*` 심볼과 동일하게 옮긴다 (좌표 재설계 금지 —
사용자가 픽셀 단위로 확정한 값).

## 마스코트 교체 방식

- `index.html`의 `#mascot` 내부 SVG를 통째로 교체. viewBox가
  `0 0 100 112` → `0 0 140 152`로 바뀌지만 종횡비가 비슷해(0.89→0.92)
  `#mascot { width: 7rem }` 그대로 둔다.
- `.face face-idle/happy/dizzy/worried` 클래스명과 `data-face` 전환 로직을
  그대로 유지 → **game.js·style.css의 표정 전환 코드는 무변경**.
- 코·볼터치·리본은 base(공통)에 두고, 표정 그룹에는 눈·입(·눈썹·땀방울)만.
  (기존과 달리 happy도 단추 눈을 쓰므로 눈을 공통에 둘 수도 있으나,
  dizzy가 X자 눈이라 눈은 표정 그룹에 둔다 — 기존 구조와 동일.)

## 당근 목숨 (하트 → 당근)

- `index.html`의 숨김 SVG(`display:none`)에 `<symbol id="carrot-icon" viewBox="0 0 24 26">`
  정의: 초록 잎 3갈래(`#4ade80`, `#3fbf6f`) + 주황 몸통(`#ff8c42`) +
  결 스트로크(`#e0702a`), 전체 rotate(8).
  지오메트리는 `.superpowers/brainstorm/120-1783475843/content/carrot-hud.html`의
  `#carrot` 심볼과 동일.
- `game.js`의 `renderHearts`: span 하트 대신 당근 SVG를 생성 —
  `document.createElementNS('http://www.w3.org/2000/svg', 'svg')` +
  `<use href="#carrot-icon">`. 클래스 `carrot` / 잃은 목숨 `carrot off`.
  목숨 수가 바뀔 때만 재구성하는 캐시(`renderedHearts`)와
  `aria-label="목숨 N개"`(컨테이너 `#hearts`, `role="img"`)는 유지.
- `style.css`: `.heart`/`.heart.off` 규칙 삭제, 대신
  `.carrot { width: 1.6rem; height: auto; }`,
  `.carrot.off { filter: grayscale(1); opacity: 0.4; }`.
  `#hearts`의 `font-size`는 더 이상 크기를 좌우하지 않으므로 정리
  (flex 정렬로 교체: `display: inline-flex; gap: 3px;`).
- 요소 id `#hearts`는 유지한다 (game.js·CSS 참조 최소 변경).

## 테스트 / 검증

- 순수 로직 무변경 → 새 단위 테스트 없음. `npm test`(76개) 회귀 확인.
- 브라우저 육안 확인:
  1. 새 토끼가 base 자세로 표시되고 표정 4종(기본/정답/오답/초조)이 상황에
     맞게 전환되는가 (정답 시 빨간 입 미소, 초조 시 눈썹+땀방울)
  2. 기존 연출(jump/wobble/nervous/urgent 흔들림)이 새 SVG에서도 동작하는가
  3. 목숨이 당근 3개로 표시되고, 잃으면 회색으로 바래는가, 재시작 시 복원되는가
  4. `#hearts`의 `aria-label`이 목숨 수와 일치하는가

## 범위 제외

- 게임 규칙·점수·타이머 변경 없음
- 당근 획득/개수 증가 같은 새 메커니즘 없음 (표시 교체만)
- 전체 리더보드(빌드 8단계)는 여전히 미설계
