# 화면 디자인 개선 (팝 카툰 + 리본 토끼) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 분수/소수 타임어택 게임 화면을 팝 카툰 테마 + 리본 토끼 마스코트 + 아케이드 연출로 개편한다 (스펙: `docs/superpowers/specs/2026-07-07-visual-redesign-design.md`).

**Architecture:** 게임 규칙 로직(game-core.js, problems.js)은 불변. 신설 `style.css`가 테마·레이아웃·애니메이션을 전담하고, `game.js`는 상태에 따라 CSS 클래스를 토글만 한다. 문자열 속 분수를 세로 표기로 바꾸는 표시용 파서만 순수 모듈 `format.js`로 새로 만든다.

**Tech Stack:** 바닐라 HTML/CSS/JS (ES Modules), 외부 의존성 없음, GitHub Pages 정적 배포.

## Global Constraints

- **외부 의존성 추가 금지** — 라이브러리·웹폰트·테스트 프레임워크 전부. 시스템 폰트만 사용
- `game-core.js`, `problems.js`, `test-problems.js`, `test-game-core.js`는 **수정 금지**
- 게임 로직은 DOM 없는 순수 모듈로, `node test-*.js`로 테스트 가능해야 함
- 주석·테스트 이름·에러 메시지는 한국어
- `checkAnswer`의 `choice === answer` 공존 방식 변경 금지
- 제한시간 10초 고정(`TIME_LIMIT_MS`), 점수 규칙 변경 금지 — 이번 작업은 표시 계층만
- 양(크기)을 드러내는 그림(피자 조각·막대 등) 금지 — 비교 문제 정답 노출 방지
- 테스트 실행: `npm test` (성공 시 전 테스트 ✅, 실패 시 exit code ≠ 0)
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: format.js — 표시용 분수 세그먼트 파서 (TDD)

**Files:**
- Create: `format.js`
- Test: `test-format.js` (신규)
- Modify: `package.json` (test 스크립트에 test-format.js 추가)

**Interfaces:**
- Consumes: `problems.js`의 `makeProblem`, `answerText` (속성 검사에서만 사용)
- Produces: `fractionSegments(text: string) → Array<{type:'text', text:string} | {type:'fraction', num:number, den:number}>`
  — Task 3의 game.js가 import한다. `"3/5 + 1/5"` → `[분수, ' + ', 분수]`처럼 쪼갠다. 표시 전용이며 정답 판정과 무관.

- [ ] **Step 1: 실패하는 테스트 작성**

`test-format.js` 전체 내용:

```js
// format.js 단위 테스트 — 실행: node test-format.js
import { fractionSegments } from './format.js';
import { makeProblem, answerText } from './problems.js';

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    fail++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 세그먼트 배열 비교 — 구조가 단순하므로 JSON 직렬화로 충분
function assertSegments(actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  assert(a === e, `기대 ${e}, 실제 ${a}`);
}

console.log('fractionSegments (결정적)');
test('"3/5"는 분수 세그먼트 하나', () => {
  assertSegments(fractionSegments('3/5'), [{ type: 'fraction', num: 3, den: 5 }]);
});
test('"0.7"은 텍스트 그대로', () => {
  assertSegments(fractionSegments('0.7'), [{ type: 'text', text: '0.7' }]);
});
test('"3/5 + 1/5"는 분수·텍스트·분수', () => {
  assertSegments(fractionSegments('3/5 + 1/5'), [
    { type: 'fraction', num: 3, den: 5 },
    { type: 'text', text: ' + ' },
    { type: 'fraction', num: 1, den: 5 },
  ]);
});
test('"정답은 3/4"는 텍스트 + 분수', () => {
  assertSegments(fractionSegments('정답은 3/4'), [
    { type: 'text', text: '정답은 ' },
    { type: 'fraction', num: 3, den: 4 },
  ]);
});
test('"12/15"처럼 두 자리 숫자도 분수 하나로', () => {
  assertSegments(fractionSegments('12/15'), [{ type: 'fraction', num: 12, den: 15 }]);
});
test('빈 문자열은 빈 배열', () => {
  assertSegments(fractionSegments(''), []);
});

console.log('fractionSegments (무작위 속성)');
test('무작위 문제 500개의 모든 표시 문자열: 세그먼트를 도로 이으면 원문과 같다', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeProblem();
    const texts = [p.prompt, answerText(p)];
    if (p.question) texts.push(p.question);
    if (p.type === 'compare') texts.push(p.left.text, p.right.text);
    else texts.push(...p.choices.map((c) => c.text));
    for (const t of texts) {
      const joined = fractionSegments(t)
        .map((s) => (s.type === 'text' ? s.text : `${s.num}/${s.den}`))
        .join('');
      assert(joined === t, `"${t}" 재조합 결과가 "${joined}"`);
    }
  }
});

console.log(`\nformat: ${pass}개 통과, ${fail}개 실패`);
if (fail > 0) process.exit(1);
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `node test-format.js`
Expected: FAIL — `Cannot find module ... format.js` 류의 에러로 종료

- [ ] **Step 3: 최소 구현 작성**

`format.js` 전체 내용:

```js
// 표시용 포맷 순수 로직 — DOM·네트워크 없음, Node에서 테스트 가능.
// 문자열 속 "3/5" 같은 "정수/정수" 패턴을 분수 세그먼트로 쪼갠다.
// UI가 세로 분수 표기로 그리기 위한 표시 전용 변환이며 정답 판정과 무관하다.

export function fractionSegments(text) {
  const segments = [];
  const re = /(\d+)\/(\d+)/g;
  let last = 0;
  for (let m; (m = re.exec(text)) !== null; ) {
    if (m.index > last) segments.push({ type: 'text', text: text.slice(last, m.index) });
    segments.push({ type: 'fraction', num: Number(m[1]), den: Number(m[2]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node test-format.js`
Expected: PASS — `format: 7개 통과, 0개 실패`

- [ ] **Step 5: npm test에 편입**

`package.json`의 scripts를 다음으로 수정:

```json
"scripts": {
  "test": "node test-problems.js && node test-game-core.js && node test-format.js"
}
```

Run: `npm test`
Expected: 기존 58개 + 신규 7개 = 총 65개 전부 ✅, exit code 0

- [ ] **Step 6: 커밋**

```bash
git add format.js test-format.js package.json
git commit -m "feat: 표시용 분수 세그먼트 파서 format.js 추가

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: style.css 신설 + index.html 개편 (테마·토끼·레이아웃)

**Files:**
- Create: `style.css`
- Modify: `index.html` (전체 교체)

**Interfaces:**
- Consumes: 없음 (순수 마크업/스타일)
- Produces: game.js(Task 3, 4)가 의존하는 DOM/클래스 계약 —
  - 기존 ID 전부 유지: `#hearts #score #timer-bar #timer-fill #prompt #question #choices #feedback #next #gameover #final-score #restart`
  - 신규: `#game`(메인 컨테이너), `#mascot`(`data-face="idle|happy|dizzy"`로 표정 전환), `#bubble`(말풍선, 내부에 `#prompt`), `#gameover > .panel`
  - 연출용 클래스(CSS만 정의, JS 토글은 Task 4): `#game.shake`, `#mascot.jump`, `#mascot.wobble`, `#mascot.urgent`, `#score.pulse`, `.choice.pop`, `.choice.is-answer`, `.choice.picked`, `#timer-fill.warn`, `#timer-fill.danger`, `.float-score`, `#gameover.newbest`
  - 분수 표기용 클래스(Task 3가 생성): `.frac > .num + .den`

- [ ] **Step 1: style.css 작성**

`style.css` 전체 내용:

```css
/* 팝 카툰 테마 — 색·레이아웃·연출(애니메이션) 전부 여기.
   게임 규칙은 game-core.js에, 클래스 토글은 game.js에 있다. */

:root {
  --ink: #3d3d3d;
  --ink-soft: #4a4a4a;
  --pink: #ff8fab;
  --pink-deep: #ff4f8b;
  --pink-pale: #ffd3e0;
  --pink-border: #ffb3c1;
  --sky: #cdeaff;
  --sky-border: #a8d8ff;
  --sky-shadow: #cde8ff;
  --cream: #fff6fa;
  --yellow: #ffd93d;
  --yellow-deep: #7a4a00;
  --green: #4ade80;
  --green-pale: #b9f0c9;
  --green-deep: #1a7f37;
  --red: #ff5252;
  --red-pale: #ffc9c9;
  --red-deep: #d1242f;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, var(--sky) 0%, var(--cream) 100%) fixed;
  font-family: 'Trebuchet MS', 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  color: var(--ink);
  -webkit-tap-highlight-color: transparent;
}

/* 모바일 세로: 화면을 꽉 채우고 보기 버튼을 하단 엄지 존으로 민다 */
#game {
  position: relative;
  width: 100%;
  max-width: 28rem;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 1rem 1.25rem;
}
@media (min-width: 640px) {
  #game { min-height: 34rem; } /* PC에선 세로로 무한히 늘어나지 않게 */
}

/* ---------- HUD ---------- */

#hud {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
#hearts {
  font-size: 1.4rem;
  letter-spacing: 2px;
}
#score {
  background: #fff;
  border-radius: 999px;
  padding: 0.25rem 0.9rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--yellow-deep);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1);
}

#timer-bar {
  width: 100%;
  height: 0.9rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  overflow: hidden;
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.08);
}
#timer-fill {
  height: 100%;
  width: 100%;
  border-radius: 999px;
  background: var(--green);
  transition: width 0.1s linear;
}
#timer-fill.warn { background: var(--yellow); }
#timer-fill.danger {
  background: var(--red);
  animation: blink 0.4s ease-in-out infinite alternate;
}

/* ---------- 마스코트 + 말풍선 ---------- */

#stage {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 1.2rem;
}
#mascot { width: 7rem; flex-shrink: 0; }
#mascot svg { display: block; width: 100%; }

/* 표정 3종은 SVG에 겹쳐 있고 data-face로 하나만 보인다 */
#mascot .face { display: none; }
#mascot[data-face="idle"] .face-idle,
#mascot[data-face="happy"] .face-happy,
#mascot[data-face="dizzy"] .face-dizzy { display: inline; }

#bubble {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 0.7rem 1rem;
  font-weight: 700;
  color: #555;
  max-width: 14rem;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.08);
}
#bubble::before { /* 말풍선 꼬리 */
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  border: 8px solid transparent;
  border-right-color: #fff;
  border-left: 0;
}
#bubble p { margin: 0; }

/* ---------- 문제 / 보기 ---------- */

#question {
  font-size: 2rem;
  font-weight: 800;
  margin: 1rem 0 0;
}
#question[hidden] { display: none; }

#choices {
  width: 100%;
  margin-top: auto; /* 하단 엄지 존으로 */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
}
#choices.quad {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
#choices.quad .choice { font-size: 1.5rem; }

.choice {
  --shadow-color: var(--pink-pale);
  font-family: inherit;
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--ink);
  min-height: 4.5rem;
  min-width: 6.5rem;
  padding: 0.8rem 1rem;
  background: #fff;
  border: 3px solid var(--pink-border);
  border-radius: 20px;
  box-shadow: 0 6px 0 var(--shadow-color);
  cursor: pointer;
  transition: transform 0.05s;
}
.choice:nth-of-type(even) {
  --shadow-color: var(--sky-shadow);
  border-color: var(--sky-border);
}
.choice:not(:disabled):active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 var(--shadow-color);
}
.choice:disabled { cursor: default; opacity: 0.55; }
/* 결과 공개: 정답 버튼은 초록, 내가 고른 오답은 빨강 — disabled여도 또렷하게 */
.choice.is-answer {
  opacity: 1;
  border-color: var(--green);
  --shadow-color: var(--green-pale);
}
.choice.picked:not(.is-answer) {
  opacity: 1;
  border-color: var(--red);
  --shadow-color: var(--red-pale);
}

#vs {
  background: var(--yellow);
  color: var(--yellow-deep);
  font-weight: 900;
  font-size: 0.95rem;
  border-radius: 999px;
  padding: 0.4rem 0.6rem;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.12);
}

/* 세로 분수 표기 — game.js의 renderWithFractions가 만든다 */
.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: middle;
  line-height: 1.1;
  margin: 0 0.15em;
}
.frac .num { padding: 0 0.3em; }
.frac .den { border-top: 0.12em solid currentColor; padding: 0 0.3em; }

/* ---------- 피드백 / 다음 ---------- */

#feedback {
  font-size: 1.25rem;
  font-weight: 800;
  min-height: 2.2rem;
  margin: 0.8rem 0 0;
  text-align: center;
}
#feedback.correct { color: var(--green-deep); }
#feedback.wrong { color: var(--red-deep); }

#next {
  font-family: inherit;
  font-size: 1.2rem;
  font-weight: 800;
  padding: 0.7rem 2.4rem;
  margin-top: 0.6rem;
  border: none;
  border-radius: 999px;
  background: var(--pink-deep);
  color: white;
  cursor: pointer;
  box-shadow: 0 5px 0 var(--pink);
}
#next:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--pink); }
#next[hidden] { display: none; }

/* ---------- 게임 오버 ---------- */

#gameover {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(61, 61, 61, 0.45);
}
#gameover[hidden] { display: none; }
#gameover .panel {
  position: relative;
  background: #fff;
  border-radius: 24px;
  padding: 1.5rem 2.2rem;
  text-align: center;
  box-shadow: 0 8px 0 rgba(0, 0, 0, 0.15);
}
#gameover .panel .title {
  font-size: 1.7rem;
  font-weight: 900;
  margin: 0 0 0.7rem;
}
#final-score {
  font-size: 1.15rem;
  font-weight: 700;
  color: #374151;
  margin: 0 0 1rem;
}
#restart {
  font-family: inherit;
  font-size: 1.2rem;
  font-weight: 800;
  padding: 0.7rem 2.4rem;
  border: none;
  border-radius: 999px;
  background: var(--pink-deep);
  color: white;
  cursor: pointer;
  box-shadow: 0 5px 0 var(--pink);
}
#restart:active { transform: translateY(3px); box-shadow: 0 2px 0 var(--pink); }
/* 신기록: 패널이 통통 튀고 별이 반짝인다 */
#gameover.newbest .panel { animation: pop 0.5s ease; }
#gameover.newbest .panel::before,
#gameover.newbest .panel::after {
  content: '⭐';
  position: absolute;
  top: -0.9rem;
  font-size: 1.6rem;
  animation: twinkle 0.8s ease-in-out infinite alternate;
}
#gameover.newbest .panel::before { left: -0.7rem; }
#gameover.newbest .panel::after { right: -0.7rem; animation-delay: 0.4s; }

/* ---------- 연출 keyframes (클래스 토글은 game.js) ---------- */

@keyframes blink { from { opacity: 1; } to { opacity: 0.45; } }
@keyframes pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}
@keyframes jump {
  0%, 100% { transform: translateY(0); }
  35% { transform: translateY(-18px); }
  55% { transform: translateY(-14px); }
  75% { transform: translateY(-2px); }
}
@keyframes wobble {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-8deg); }
  50% { transform: rotate(7deg); }
  75% { transform: rotate(-4deg); }
}
@keyframes urgent-wiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
@keyframes float-up {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, -3rem); }
}
@keyframes twinkle { from { opacity: 0.4; } to { opacity: 1; } }

.choice.pop { animation: pop 0.35s ease; }
#game.shake { animation: shake 0.4s ease; }
#mascot.jump { animation: jump 0.55s ease; }
#mascot.wobble { animation: wobble 0.6s ease; }
#mascot.urgent { animation: urgent-wiggle 0.5s ease-in-out infinite; }
#score.pulse { animation: pulse 0.4s ease; }

.float-score {
  position: absolute;
  top: 32%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 2rem;
  font-weight: 900;
  color: var(--green-deep);
  pointer-events: none;
  animation: float-up 0.9s ease forwards;
}

/* 큰 모션이 부담스러운 사용자 배려 */
@media (prefers-reduced-motion: reduce) {
  #game.shake, #mascot.jump, #mascot.wobble, #mascot.urgent,
  #timer-fill.danger, #score.pulse, .choice.pop,
  #gameover.newbest .panel,
  #gameover.newbest .panel::before, #gameover.newbest .panel::after {
    animation: none;
  }
  .float-score { display: none; }
}
```

- [ ] **Step 2: index.html 개편**

`index.html` 전체 내용 (인라인 `<style>` 제거, 리본 토끼 SVG는 확정 시안 그대로):

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>분수/소수 타임어택</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main id="game">
    <div id="hud">
      <span id="hearts"></span>
      <span id="score"></span>
    </div>
    <div id="timer-bar"><div id="timer-fill"></div></div>

    <div id="stage">
      <!-- 리본 토끼 마스코트 — 표정 3종(.face-*)을 겹쳐 두고 data-face로 전환 -->
      <div id="mascot" data-face="idle">
        <svg viewBox="0 0 100 112" aria-hidden="true">
          <!-- 귀: 왼쪽 쫑긋, 오른쪽 살짝 접힘 -->
          <g transform="rotate(-6 38 26)">
            <ellipse cx="38" cy="26" rx="9.5" ry="23" fill="#ffffff"/>
            <ellipse cx="38" cy="29" rx="5" ry="15" fill="#ffd3e0"/>
          </g>
          <g transform="rotate(14 63 28)">
            <ellipse cx="63" cy="28" rx="9.5" ry="22" fill="#ffffff"/>
            <ellipse cx="63" cy="31" rx="5" ry="14" fill="#ffd3e0"/>
          </g>
          <!-- 몸통(머리와 한 덩어리) -->
          <ellipse cx="50" cy="74" rx="33" ry="31" fill="#ffffff"/>
          <!-- 핑크 리본 (오른쪽 귀 밑) -->
          <g transform="rotate(10 68 46)">
            <path d="M68 46 L57 40 Q54 46 57 52 Z" fill="#ff6b9d"/>
            <path d="M68 46 L79 40 Q82 46 79 52 Z" fill="#ff6b9d"/>
            <circle cx="68" cy="46" r="4" fill="#ff4f8b"/>
          </g>
          <!-- 코와 볼은 모든 표정 공통 -->
          <ellipse cx="50" cy="76" rx="2.2" ry="1.7" fill="#ff8fab"/>
          <ellipse cx="30" cy="77" rx="5" ry="3.6" fill="#ffc2d4" opacity="0.8"/>
          <ellipse cx="70" cy="77" rx="5" ry="3.6" fill="#ffc2d4" opacity="0.8"/>
          <!-- 표정: 기본 (점 눈 + ω 입) -->
          <g class="face face-idle">
            <circle cx="39" cy="70" r="3.4" fill="#4a4a4a"/>
            <circle cx="61" cy="70" r="3.4" fill="#4a4a4a"/>
            <circle cx="40.2" cy="68.8" r="1.1" fill="#ffffff"/>
            <circle cx="62.2" cy="68.8" r="1.1" fill="#ffffff"/>
            <path d="M46 80 Q48 83 50 80 Q52 83 54 80" stroke="#4a4a4a" stroke-width="2" fill="none" stroke-linecap="round"/>
          </g>
          <!-- 표정: 정답 (눈웃음 + 함박웃음) -->
          <g class="face face-happy">
            <path d="M34 70 Q39 64 44 70" stroke="#4a4a4a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
            <path d="M56 70 Q61 64 66 70" stroke="#4a4a4a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
            <path d="M43 80 Q50 88 57 80" stroke="#4a4a4a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
          </g>
          <!-- 표정: 오답/시간초과 (X자 눈 + 벌어진 입) -->
          <g class="face face-dizzy">
            <path d="M35 66 L43 74 M43 66 L35 74" stroke="#4a4a4a" stroke-width="2.6" stroke-linecap="round"/>
            <path d="M57 66 L65 74 M65 66 L57 74" stroke="#4a4a4a" stroke-width="2.6" stroke-linecap="round"/>
            <ellipse cx="50" cy="82" rx="3.2" ry="4" fill="#4a4a4a"/>
          </g>
        </svg>
      </div>
      <div id="bubble"><p id="prompt"></p></div>
    </div>

    <p id="question" hidden></p>
    <div id="choices"><!-- 보기 버튼은 game.js가 문제 유형에 맞춰 그린다 --></div>
    <p id="feedback"></p>
    <button id="next" hidden>다음 문제</button>

    <div id="gameover" hidden>
      <div class="panel">
        <p class="title">게임 오버</p>
        <p id="final-score"></p>
        <button id="restart">다시 시작</button>
      </div>
    </div>
  </main>
  <script type="module" src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: 로직 불변 확인**

Run: `npm test`
Expected: 65개 전부 ✅ (이 태스크는 로직을 건드리지 않으므로 그대로 통과)

- [ ] **Step 4: 브라우저 수동 확인**

로컬 정적 서버로 열기 (ES Modules는 file://에서 안 됨):
Run: `python -m http.server 8000` (또는 사용 가능한 아무 정적 서버) 후 http://localhost:8000 접속
Expected: 그라데이션 배경, 상단 HUD·타이머 바, 리본 토끼 + 말풍선(문제 문구), 하단 보기 버튼(팝 스타일). 이지선다·사지선다 모두 진행 가능. 분수는 아직 "3/5" 텍스트(다음 태스크에서 세로 표기).

- [ ] **Step 5: 커밋**

```bash
git add style.css index.html
git commit -m "feat: 팝 카툰 테마 style.css 신설 + 리본 토끼 마크업

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: game.js — 세로 분수 렌더링 + HUD 표기 손질

**Files:**
- Modify: `game.js`

**Interfaces:**
- Consumes: Task 1의 `fractionSegments(text)`, Task 2의 `.frac/.num/.den` CSS
- Produces: `renderWithFractions(el, text)` — Task 4의 피드백 렌더링도 이 함수를 쓴다

- [ ] **Step 1: import 추가와 렌더 헬퍼 작성**

`game.js` 상단 import 아래에 추가:

```js
import { fractionSegments } from './format.js';
```

`choiceButton` 함수 위에 헬퍼 추가:

```js
// 문자열 속 "3/5"를 세로 분수 마크업(.frac)으로 바꿔 el 안에 그린다
function renderWithFractions(el, text) {
  el.textContent = '';
  for (const seg of fractionSegments(text)) {
    if (seg.type === 'text') {
      el.append(seg.text);
      continue;
    }
    const frac = document.createElement('span');
    frac.className = 'frac';
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = seg.num;
    const den = document.createElement('span');
    den.className = 'den';
    den.textContent = seg.den;
    frac.append(num, den);
    el.append(frac);
  }
}
```

- [ ] **Step 2: 보기 버튼·문제·피드백을 세그먼트 렌더링으로 교체**

`choiceButton`의 `btn.textContent = text;`를 다음으로 교체:

```js
  renderWithFractions(btn, text);
```

`render()`에서 하트/점수 표기를 교체 (빈 하트는 🤍, 점수 칩은 ⭐):

```js
  heartsEl.textContent =
    '❤'.repeat(state.hearts) + '🤍'.repeat(MAX_HEARTS - state.hearts);
  const mult = comboMultiplier(state.combo);
  scoreEl.textContent =
    `⭐ ${state.score}` + (mult > 1 ? ` 🔥x${mult}` : '');
```

`render()`의 prompt/question 처리를 문제가 바뀔 때만 그리도록 교체 — 기존

```js
  promptEl.textContent = state.problem.prompt;
  questionEl.textContent = state.problem.question ?? '';
  questionEl.hidden = !state.problem.question;
  if (state.problem !== renderedProblem) {
    renderedProblem = state.problem;
    renderChoices(state.problem);
  }
```

를 다음으로:

```js
  if (state.problem !== renderedProblem) {
    renderedProblem = state.problem;
    promptEl.textContent = state.problem.prompt;
    questionEl.hidden = !state.problem.question;
    renderWithFractions(questionEl, state.problem.question ?? '');
    renderChoices(state.problem);
  }
```

`render()`의 피드백 메시지 3분기를 문자열로 모아 한 번에 렌더링:

```js
  if (state.phase === 'feedback' || state.phase === 'gameover') {
    const msg =
      state.lastResult === 'correct' ? `⭕ 정답! +${state.lastGain}`
      : state.lastResult === 'timeout' ? `⏰ 시간 초과! 정답은 ${answerText(state.problem)}`
      : `❌ 오답! 정답은 ${answerText(state.problem)}`;
    renderWithFractions(feedbackEl, msg);
    feedbackEl.className = state.lastResult === 'correct' ? 'correct' : 'wrong';
  } else {
    feedbackEl.textContent = '';
    feedbackEl.className = '';
  }
```

- [ ] **Step 3: 테스트와 수동 확인**

Run: `npm test`
Expected: 65개 전부 ✅

브라우저 확인 (정적 서버):
Expected: 보기 버튼·문제·피드백의 분수가 전부 세로 표기(분자/가로줄/분모). 소수는 그대로. 하트가 ❤/🤍, 점수 칩이 `⭐ 0` 형태.

- [ ] **Step 4: 커밋**

```bash
git add game.js
git commit -m "feat: 분수 세로 표기 렌더링 + HUD 하트·점수 칩 표기

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: game.js — 아케이드 연출 클래스 토글

**Files:**
- Modify: `game.js`

**Interfaces:**
- Consumes: Task 2의 연출 클래스 계약 전부 (`#game.shake`, `#mascot.jump/.wobble/.urgent`, `#mascot[data-face]`, `#score.pulse`, `.choice.pop/.is-answer/.picked`, `#timer-fill.warn/.danger`, `.float-score`, `#gameover.newbest`), Task 3의 `renderWithFractions`
- Produces: 없음 (최종 소비자)

- [ ] **Step 1: 요소 참조와 선택 추적 추가**

`game.js` 요소 참조 목록에 추가:

```js
const gameEl = document.getElementById('game');
const mascotEl = document.getElementById('mascot');
```

상태 변수 근처(`let renderedProblem = null;` 위)에 추가:

```js
// 직전에 고른 보기 — 결과 공개 때 .picked 표시용 (UI 전용 상태)
let lastChoice = null;
```

- [ ] **Step 2: 일회성 연출 도우미와 playEffects 추가**

`update` 함수 아래에 추가:

```js
// 같은 연출을 연달아 틀 수 있도록 클래스를 뗐다 붙인다 (리플로우로 재시작)
function playOnce(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function spawnFloatingScore(gain) {
  const el = document.createElement('span');
  el.className = 'float-score';
  el.textContent = `+${gain}`;
  gameEl.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// question → feedback/gameover 전이 순간에만 트는 일회성 연출
function playEffects(prev, cur) {
  if (prev.phase !== 'question' || cur.phase === 'question') return;
  if (cur.lastResult === 'correct') {
    playOnce(mascotEl, 'jump');
    spawnFloatingScore(cur.lastGain);
    const picked = choicesEl.querySelector(`[data-choice="${lastChoice}"]`);
    if (picked) playOnce(picked, 'pop');
  } else {
    playOnce(gameEl, 'shake');
    playOnce(mascotEl, 'wobble');
  }
  if (comboMultiplier(cur.combo) > comboMultiplier(prev.combo)) {
    playOnce(scoreEl, 'pulse');
  }
}
```

- [ ] **Step 3: update에서 연출 호출**

기존 `update`를 다음으로 교체 (구조 동일, `playEffects` 호출만 추가):

```js
function update(newState) {
  const prevState = state;
  state = newState;
  if (prevState.phase !== 'gameover' && state.phase === 'gameover') {
    isNewBest = state.score > best;
    if (isNewBest) {
      best = state.score;
      saveBest(best);
    }
  }
  playEffects(prevState, state);
  render();
}
```

- [ ] **Step 4: render에 상태 클래스 반영 추가**

타이머 줄을 다음으로 교체 (경고색 + 마스코트 초조):

```js
  const ratio = state.timeLeftMs / TIME_LIMIT_MS;
  timerFillEl.style.width = `${ratio * 100}%`;
  timerFillEl.classList.toggle('warn', ratio <= 0.6 && ratio > 0.3);
  timerFillEl.classList.toggle('danger', ratio <= 0.3);
  mascotEl.classList.toggle('urgent', state.phase === 'question' && ratio <= 0.3);
```

버튼 disabled 루프를 다음으로 교체 (결과 공개 표시 포함):

```js
  const answering = state.phase === 'question';
  const showResult = !answering;
  for (const btn of choicesEl.querySelectorAll('button')) {
    btn.disabled = !answering;
    btn.classList.toggle(
      'is-answer',
      showResult && btn.dataset.choice === String(state.problem.answer),
    );
    btn.classList.toggle(
      'picked',
      showResult && lastChoice !== null && btn.dataset.choice === lastChoice,
    );
  }
```

`gameoverEl.hidden = ...` 아래의 gameover 분기를 다음으로 교체 (신기록 클래스 + 토끼 표정):

```js
  gameoverEl.hidden = state.phase !== 'gameover';
  if (state.phase === 'gameover') {
    gameoverEl.classList.toggle('newbest', isNewBest);
    finalScoreEl.textContent = isNewBest
      ? `🎉 신기록! ${state.score}점`
      : `점수 ${state.score}점 · 최고점 ${best}점`;
  }

  // 토끼 표정: 문제 중엔 기본, 정답·신기록은 웃음, 그 외 결과는 어질어질
  if (state.phase === 'question') {
    mascotEl.dataset.face = 'idle';
  } else if (state.lastResult === 'correct' || (state.phase === 'gameover' && isNewBest)) {
    mascotEl.dataset.face = 'happy';
  } else {
    mascotEl.dataset.face = 'dizzy';
  }
```

- [ ] **Step 5: 클릭 핸들러에서 선택 기록**

choices 클릭 핸들러를 다음으로 교체 (`lastChoice` 기록 추가):

```js
choicesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-choice]');
  if (!btn || state.phase !== 'question') return;
  const choice = btn.dataset.choice;
  lastChoice = choice;
  update(answer(state, state.problem.type === 'compare' ? choice : Number(choice)));
});
```

next/restart 핸들러에서 초기화 추가:

```js
nextBtn.addEventListener('click', () => {
  lastChoice = null;
  update(next(state));
});
restartBtn.addEventListener('click', () => {
  lastChoice = null;
  update(createGame());
});
```

- [ ] **Step 6: 테스트와 수동 확인**

Run: `npm test`
Expected: 65개 전부 ✅

브라우저 확인 (정적 서버):
- 정답: 고른 버튼 팝 + 초록 강조, `+점수` 플로팅, 토끼 점프+눈웃음
- 오답: 화면 흔들림, 내 버튼 빨강 + 정답 버튼 초록, 토끼 X눈 어질
- 시간초과: 흔들림 + 정답 버튼 초록 (picked 없음), 토끼 X눈
- 3연속 정답 순간: 점수 칩 🔥x2 펄스
- 남은 시간 3초 이하: 타이머 빨강 점멸 + 토끼 초조 흔들림
- 게임오버: 오버레이 패널. 신기록이면 ⭐ 반짝 + 패널 팝 + 토끼 웃음

- [ ] **Step 7: 커밋**

```bash
git add game.js
git commit -m "feat: 아케이드 연출 - 토끼 리액션·타이머 경고·콤보 펄스·결과 강조

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 최종 검증 (스펙 체크리스트)

**Files:**
- Modify: 없음 (검증만; 문제 발견 시 해당 파일 수정 후 개별 커밋)

**Interfaces:**
- Consumes: 전체 결과물
- Produces: 검증 완료 보고

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 65개 전부 ✅, exit code 0

- [ ] **Step 2: 로직 파일 불변 확인**

Run: `git diff 8527520 --stat -- game-core.js problems.js test-game-core.js test-problems.js`
Expected: 출력 없음 (4개 파일 변경 0)

- [ ] **Step 3: 스펙의 수동 체크리스트 수행**

정적 서버로 접속해 스펙 `docs/superpowers/specs/2026-07-07-visual-redesign-design.md`의 체크리스트 확인:

1. 이지선다/사지선다 각각 정답·오답·시간초과 연출
2. 콤보 배율 상승 연출, 오답 시 콤보 리셋 표시(🔥 배지 사라짐)
3. 게임오버(일반/신기록) 화면 — localStorage `math-game.best` 갱신 확인
4. 반응형: 브라우저 개발자 도구로 모바일 세로(폭 390px)와 PC 폭 확인
5. 개발자 도구 렌더링 탭에서 `prefers-reduced-motion: reduce` 에뮬레이션 → 흔들림·점멸·플로팅 점수가 꺼지는지

Expected: 5항목 전부 통과. 문제 발견 시 수정 → 재확인 → 커밋

- [ ] **Step 4: README 상태 갱신 여부 확인**

이 작업은 README의 "빌드 단계"(6단계: 레벨/난이도)가 아니므로 체크박스 갱신 없음.
CLAUDE.md의 "현재 상태"도 로직 미변경이므로 그대로 둔다 (변경했다면 이 단계에서 확인).

Expected: 갱신 대상 없음 확인
