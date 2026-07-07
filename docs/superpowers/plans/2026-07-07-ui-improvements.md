# UI 개선 3종 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플레이 테스트에서 나온 UI 개선 3건 — 보기 영역 중앙 배치, 토끼 단계적 초조 연출, 하트 가시성 — 을 표시 계층만 수정해 반영한다.

**Architecture:** 게임 규칙(game-core.js, problems.js)은 손대지 않는다. index.html(마크업), style.css(스타일·keyframes), game.js(클래스/`data-face` 토글, 하트 렌더링)만 수정. 스펙: `docs/superpowers/specs/2026-07-07-ui-improvements-design.md`

**Tech Stack:** 바닐라 HTML/CSS/JS (ES Modules), 빌드 도구 없음

## Global Constraints

- 외부 의존성 추가 금지 (테스트 프레임워크 포함)
- 로직과 DOM 분리 — 이번 변경은 전부 표시 전용이므로 순수 모듈(game-core.js, problems.js, format.js)을 수정하면 안 된다
- 주석·에러 메시지는 한국어
- 순수 로직 변경이 없으므로 **새 단위 테스트 없음** — 각 태스크는 `npm test`(기존 76개, 회귀 확인) + 브라우저 육안 확인으로 검증한다
- 브라우저 확인 방법: ES Modules는 file://로 열면 차단되므로 로컬 정적 서버로 연다. 예: `python -m http.server 8000` (또는 `npx http-server -p 8000 -c-1`) 실행 후 http://localhost:8000 접속

---

### Task 1: 보기 영역 항상 중앙 배치 (#answer-area 래퍼)

**Files:**
- Modify: `index.html:68-71` (보기·피드백·다음 버튼을 래퍼로 감싼다)
- Modify: `style.css:160-167` (`#choices`의 `margin-top: auto`를 래퍼의 `margin-block: auto`로 교체)

**Interfaces:**
- Consumes: 없음
- Produces: `<div id="answer-area">` — 이후 태스크는 이 래퍼에 의존하지 않는다 (game.js는 계속 `#choices`, `#feedback`, `#next`를 id로 찾으므로 JS 수정 없음)

- [ ] **Step 1: index.html — 래퍼 추가**

`index.html`의 아래 부분을:

```html
    <p id="question" hidden></p>
    <div id="choices"><!-- 보기 버튼은 game.js가 문제 유형에 맞춰 그린다 --></div>
    <p id="feedback"></p>
    <button id="next" hidden>다음 문제</button>
```

다음으로 교체한다:

```html
    <p id="question" hidden></p>
    <!-- 보기+피드백+다음 묶음 — 남는 세로 공간의 중앙에 배치 (style.css #answer-area) -->
    <div id="answer-area">
      <div id="choices"><!-- 보기 버튼은 game.js가 문제 유형에 맞춰 그린다 --></div>
      <p id="feedback"></p>
      <button id="next" hidden>다음 문제</button>
    </div>
```

- [ ] **Step 2: style.css — auto 마진을 래퍼로 이동**

`style.css`의 `#choices` 블록 시작 부분을:

```css
#choices {
  width: 100%;
  margin-top: auto; /* 하단 엄지 존으로 */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
}
```

다음으로 교체한다:

```css
/* 보기+피드백+다음 묶음 — 문제 아래 남는 세로 공간의 중앙에.
   개별 요소에 auto 마진을 주면 #next가 hidden일 때 마진이 사라져
   단계마다 위치가 튄다 — 반드시 래퍼가 갖는다. */
#answer-area {
  width: 100%;
  margin-block: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
#choices {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
}
```

- [ ] **Step 3: 회귀 테스트**

Run: `npm test`
Expected: 기존 테스트 전부 통과 (76개 — 36+32+8), 실패 0

- [ ] **Step 4: 브라우저 육안 확인**

로컬 서버로 열어 확인:
1. 이지선다(compare) 문제에서 보기 2개가 화면 바닥이 아니라 문제 아래 남는 공간의 중앙쯤에 온다
2. 사지선다(2×2 그리드)에서도 묶음이 중앙에 온다 — 문제 유형이 바뀌어도 위치가 크게 튀지 않는다
3. 답을 고르면 피드백 문구가 보기 바로 아래에, "다음 문제" 버튼이 그 아래에 나타난다 (바닥에 떨어져 있지 않다)
4. 창 폭을 640px 미만(모바일 시뮬레이션)으로 줄여도 동일하게 중앙 배치

- [ ] **Step 5: Commit**

```bash
git add index.html style.css
git commit -m "feat: 보기 영역을 남는 공간 중앙에 배치 - #answer-area 래퍼"
```

---

### Task 2: 토끼 단계적 초조 연출 (worried 표정 + 2단계 흔들림)

**Files:**
- Modify: `index.html:57-62` (face-dizzy 그룹 뒤에 face-worried 그룹 추가)
- Modify: `style.css:123-127` (표정 전환 선택자), `style.css:345-349` (keyframes), `style.css:363-365` (애니메이션 클래스), `style.css:387-394` (reduced-motion)
- Modify: `game.js:159-222` (`render()` — nervous/urgent 클래스와 worried 표정 토글)

**Interfaces:**
- Consumes: 없음 (Task 1과 독립)
- Produces: `#mascot[data-face="worried"]`, `#mascot.nervous`(느린 흔들림), `#mascot.urgent`(빠른 흔들림, 기존 강화) — 전부 이 태스크 안에서만 쓰인다

- [ ] **Step 1: index.html — face-worried 표정 추가**

`index.html`의 face-dizzy 그룹:

```html
          <!-- 표정: 오답/시간초과 (X자 눈 + 벌어진 입) -->
          <g class="face face-dizzy">
            <path d="M35 66 L43 74 M43 66 L35 74" stroke="#4a4a4a" stroke-width="2.6" stroke-linecap="round"/>
            <path d="M57 66 L65 74 M65 66 L57 74" stroke="#4a4a4a" stroke-width="2.6" stroke-linecap="round"/>
            <ellipse cx="50" cy="82" rx="3.2" ry="4" fill="#4a4a4a"/>
          </g>
```

바로 뒤에 다음 그룹을 추가한다 (`</g>`와 `</svg>` 사이):

```html
          <!-- 표정: 초조 (안쪽이 올라간 눈썹 + 물결 입 + 땀방울) — 시간이 얼마 안 남았을 때 -->
          <g class="face face-worried">
            <path d="M33 64 Q39 60 44 62" stroke="#4a4a4a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <path d="M56 62 Q61 60 67 64" stroke="#4a4a4a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <circle cx="39" cy="71" r="3.4" fill="#4a4a4a"/>
            <circle cx="61" cy="71" r="3.4" fill="#4a4a4a"/>
            <circle cx="40.2" cy="69.8" r="1.1" fill="#ffffff"/>
            <circle cx="62.2" cy="69.8" r="1.1" fill="#ffffff"/>
            <path d="M45 81 Q47.5 79 50 81 Q52.5 83 55 81" stroke="#4a4a4a" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M79 56 Q83 62 79 65 Q75 62 79 56" fill="#9ad8ff"/>
          </g>
```

- [ ] **Step 2: style.css — 표정 선택자에 worried 추가**

표정 전환 규칙을:

```css
#mascot[data-face="idle"] .face-idle,
#mascot[data-face="happy"] .face-happy,
#mascot[data-face="dizzy"] .face-dizzy { display: inline; }
```

다음으로 교체한다:

```css
#mascot[data-face="idle"] .face-idle,
#mascot[data-face="happy"] .face-happy,
#mascot[data-face="dizzy"] .face-dizzy,
#mascot[data-face="worried"] .face-worried { display: inline; }
```

- [ ] **Step 3: style.css — 흔들림 2단계 (nervous 신설 + urgent 강화)**

기존 keyframes:

```css
@keyframes urgent-wiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
```

다음으로 교체한다:

```css
/* 노란불(시간 60% 이하): 느리고 작은 흔들림 */
@keyframes nervous-wiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-1.5deg); }
  75% { transform: rotate(1.5deg); }
}
/* 빨간불(시간 30% 이하): 빠르고 큰 흔들림 */
@keyframes urgent-wiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-4deg); }
  75% { transform: rotate(4deg); }
}
```

애니메이션 클래스 줄:

```css
#mascot.urgent { animation: urgent-wiggle 0.5s ease-in-out infinite; }
```

다음으로 교체한다:

```css
#mascot.nervous { animation: nervous-wiggle 1.1s ease-in-out infinite; }
#mascot.urgent { animation: urgent-wiggle 0.35s ease-in-out infinite; }
```

- [ ] **Step 4: style.css — reduced-motion에 nervous 추가**

모션 최소화 블록의 선택자 목록을:

```css
  #game.shake, #mascot.jump, #mascot.wobble, #mascot.urgent,
```

다음으로 교체한다 (흔들림만 끄고 표정 변화는 유지된다):

```css
  #game.shake, #mascot.jump, #mascot.wobble, #mascot.nervous, #mascot.urgent,
```

- [ ] **Step 5: game.js — 단계 판정 토글**

`render()`의 이 줄을:

```js
  mascotEl.classList.toggle('urgent', state.phase === 'question' && ratio <= 0.3);
```

다음으로 교체한다 (경계값은 타이머 바의 warn/danger와 동일하게 맞춘다):

```js
  // 토끼 초조 단계는 타이머 바 색 단계(warn/danger)와 같은 경계를 쓴다
  const inQuestion = state.phase === 'question';
  mascotEl.classList.toggle('nervous', inQuestion && ratio <= 0.6 && ratio > 0.3);
  mascotEl.classList.toggle('urgent', inQuestion && ratio <= 0.3);
```

그리고 표정 분기의 이 부분을:

```js
  if (state.phase === 'question') {
    mascotEl.dataset.face = 'idle';
  } else if (state.lastResult === 'correct' || (state.phase === 'gameover' && isNewBest)) {
```

다음으로 교체한다:

```js
  if (state.phase === 'question') {
    // 시간이 얼마 안 남으면(노란불부터) 초조한 표정
    mascotEl.dataset.face = ratio <= 0.6 ? 'worried' : 'idle';
  } else if (state.lastResult === 'correct' || (state.phase === 'gameover' && isNewBest)) {
```

- [ ] **Step 6: 회귀 테스트**

Run: `npm test`
Expected: 기존 테스트 전부 통과, 실패 0

- [ ] **Step 7: 브라우저 육안 확인**

1. 문제가 나오면 토끼는 기본 표정, 흔들림 없음
2. 타이머가 노랑으로 바뀌는 순간(60%) 토끼가 초조 표정(눈썹·물결 입·땀방울)으로 바뀌고 천천히 작게 흔들린다
3. 타이머가 빨강(30%)이 되면 흔들림이 빠르고 커진다 (표정은 초조 유지)
4. 정답을 맞히면 웃는 표정 + 점프, 오답이면 어질어질 표정 — 기존 연출 그대로
5. OS 모션 최소화 설정(또는 DevTools에서 `prefers-reduced-motion: reduce` 에뮬레이션)에서 흔들림은 없고 표정 변화만 남는다

- [ ] **Step 8: Commit**

```bash
git add index.html style.css game.js
git commit -m "feat: 토끼 단계적 초조 연출 - worried 표정 + 노랑/빨강 2단계 흔들림"
```

---

### Task 3: 하트 가시성 개선 (빨간 하트 + aria-label)

**Files:**
- Modify: `index.html:12` (`#hearts`에 `role="img"` 부여)
- Modify: `style.css:64-68` (`#hearts` 크기), `.heart` 스타일 신설
- Modify: `game.js:159-165` (`render()` — 문자열 대신 span 하트, 값이 바뀔 때만 재구성)

**Interfaces:**
- Consumes: 없음 (Task 1·2와 독립)
- Produces: `.heart` / `.heart.off` 클래스 — 이 태스크 안에서만 쓰인다

- [ ] **Step 1: index.html — hearts에 role 부여**

```html
      <span id="hearts"></span>
```

다음으로 교체한다 (aria-label은 game.js가 목숨 수에 맞춰 갱신):

```html
      <span id="hearts" role="img"></span>
```

- [ ] **Step 2: style.css — 하트 색·크기**

`#hearts` 블록을:

```css
#hearts {
  font-size: 1.4rem;
  letter-spacing: 2px;
  margin-right: auto; /* 레벨·점수 칩을 오른쪽으로 민다 */
}
```

다음으로 교체한다:

```css
#hearts {
  font-size: 1.6rem;
  letter-spacing: 2px;
  margin-right: auto; /* 레벨·점수 칩을 오른쪽으로 민다 */
}
/* 하트 글리프는 U+FE0E로 텍스트 렌더링을 강제해 CSS 색을 입힌다 (game.js) */
.heart { color: var(--red); text-shadow: 0 2px 0 rgba(0, 0, 0, 0.18); }
.heart.off { color: #d4d4d4; text-shadow: none; }
```

- [ ] **Step 3: game.js — span 하트 렌더링**

`render()` 첫 부분:

```js
  heartsEl.textContent =
    '❤'.repeat(state.hearts) + '🤍'.repeat(MAX_HEARTS - state.hearts);
```

다음으로 교체한다:

```js
  renderHearts(state.hearts);
```

그리고 `render()` 함수 정의 **앞**(`let renderedProblem = null;` 근처)에 다음을 추가한다:

```js
// 하트 HUD — render는 매 프레임 불리므로 목숨 수가 바뀔 때만 다시 그린다
let renderedHearts = null;
function renderHearts(hearts) {
  if (hearts === renderedHearts) return;
  renderedHearts = hearts;
  heartsEl.setAttribute('aria-label', `목숨 ${hearts}개`);
  heartsEl.textContent = '';
  for (let i = 0; i < MAX_HEARTS; i++) {
    const h = document.createElement('span');
    h.className = i < hearts ? 'heart' : 'heart off';
    h.textContent = '♥︎'; // ♥ + 텍스트 프레젠테이션 강제(이모지 방지)
    heartsEl.append(h);
  }
}
```

- [ ] **Step 4: 회귀 테스트**

Run: `npm test`
Expected: 기존 테스트 전부 통과, 실패 0

- [ ] **Step 5: 브라우저 육안 확인**

1. 하트가 선명한 빨강으로, 이전보다 크게 보인다 (진회색 아님)
2. 오답/시간초과로 목숨을 잃으면 잃은 하트가 연회색으로 바뀐다
3. 다시 시작하면 하트가 전부 빨강으로 복원된다
4. DevTools 요소 검사에서 `#hearts`에 `role="img"`와 `aria-label="목숨 N개"`가 있고 N이 실제 목숨 수와 일치한다

- [ ] **Step 6: Commit**

```bash
git add index.html style.css game.js
git commit -m "feat: 하트 HUD 가시성 개선 - 빨간 텍스트 하트 + aria-label"
```

---

### Task 4: 마무리 — README/CLAUDE.md 갱신 없음 확인 + 배포 반영

**Files:**
- 없음 (문서 변경 불필요 — 빌드 단계 항목이 아니고, CLAUDE.md 현재 상태에도 영향 없음)

**Interfaces:**
- Consumes: Task 1~3의 커밋 3개
- Produces: origin/master 푸시 → GitHub Pages 자동 반영

- [ ] **Step 1: 전체 테스트 최종 확인**

Run: `npm test`
Expected: 76개 전부 통과

- [ ] **Step 2: 사용자 확인 후 푸시**

푸시하면 https://arbang0214.github.io/math-game/ 에 곧 반영되므로, **푸시 전에 사용자에게 확인**한다. 승인 시:

```bash
git push origin master
```
