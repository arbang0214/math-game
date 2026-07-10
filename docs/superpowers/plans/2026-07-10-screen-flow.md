# 화면 흐름 재설계 + 밸런스 조정 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시작/리더보드/엔딩 화면을 신설하고 게임오버 팝업을 버튼 허브(다시 시작/순위 확인/게임 종료)로 개편하며, 목숨 5개·제한시간 12초(하한 8초)·당근 2rem로 조정한다.

**Architecture:** 오버레이 4개(`#start-screen`/`#gameover`/`#leaderboard-screen`/`#ending-screen`)를 game.js의 `showScreen()`이 hidden 토글로 전환. 게임 tick은 `screen === 'playing'`일 때만. 점수 등록은 신기록일 때만(게임오버 팝업의 닉네임+확인 → 리더보드 화면 이동). 게임 규칙 변경은 game-core.js 상수 3개뿐. 스펙: `docs/superpowers/specs/2026-07-10-screen-flow-design.md`

**Tech Stack:** 바닐라 HTML/CSS/JS (ES Modules)

## Global Constraints

- 외부 의존성 추가 금지. problems.js·format.js·leaderboard.js 무변경. game-core.js는 상수 3개(MAX_HEARTS 5, TIME_LIMIT_MS 12000, TIME_MIN_MS 8000)만 변경
- 주석·문구는 한국어. 화면 문구는 정확히: 시작 "친구들아, 분수와 소수로 즐거운 게임 해보자!" / 엔딩 "언제든 다시 놀러와!"
- 화면 전환은 표시 전용 → game.js에만. `showScreen(name)` 외 다른 경로로 오버레이 hidden을 만지지 않는다
- 점수 등록은 신기록(isNewBest)이고 `isConfigured()`일 때만 노출. Supabase 미설정이면 [순위 확인]·등록 UI 숨김
- 검증: `npm test`(92개 — Task 1에서 테스트 기대값 갱신 포함) + 브라우저 흐름 순회

---

### Task 1: 밸런스 상수 + 테스트 갱신 + 당근 확대

**Files:**
- Modify: `test-game-core.js` (277행 부근 timeLimitForLevel 기대값)
- Modify: `game-core.js:11-18` (상수 3개)
- Modify: `style.css` (`.carrot` 크기)

**Interfaces:**
- Consumes: 없음
- Produces: `MAX_HEARTS = 5`, `TIME_LIMIT_MS = 12000`, `TIME_MIN_MS = 8000` — UI는 이미 상수·상태를 참조하므로 후속 태스크에 영향 없음

- [ ] **Step 1: 테스트 기대값을 새 밸런스로 먼저 갱신 (RED)**

`test-game-core.js`의 timeLimitForLevel 케이스:

```js
  const cases = [[1, 10000], [2, 9500], [5, 8000], [9, 6000], [10, 6000], [99, 6000]];
```

다음으로 교체한다 (기본 12000, 레벨당 -500, 하한 8000 기준):

```js
  const cases = [[1, 12000], [2, 11500], [5, 10000], [9, 8000], [10, 8000], [99, 8000]];
```

- [ ] **Step 2: 실패 확인**

Run: `node test-game-core.js`
Expected: FAIL — timeLimitForLevel 케이스들이 기존 상수(10000/6000) 기준 값과 불일치

- [ ] **Step 3: game-core.js 상수 변경 (GREEN)**

```js
export const MAX_HEARTS = 3;
```
→
```js
export const MAX_HEARTS = 5;
```

```js
export const TIME_LIMIT_MS = 10000; // 레벨 1 기준 제한시간
```
→
```js
export const TIME_LIMIT_MS = 12000; // 레벨 1 기준 제한시간
```

```js
export const TIME_MIN_MS = 6000; // 제한시간 하한
```
→
```js
export const TIME_MIN_MS = 8000; // 제한시간 하한
```

- [ ] **Step 4: style.css — 당근 확대**

```css
.carrot { width: 1.6rem; height: 1.75rem; }
```
→ (viewBox 24:26 비율 유지)
```css
.carrot { width: 2rem; height: 2.17rem; }
```

- [ ] **Step 5: 전체 테스트**

Run: `npm test`
Expected: 92개 전부 통과 (하트 관련 테스트는 MAX_HEARTS를 참조하므로 자동 적응)

- [ ] **Step 6: Commit**

```bash
git add test-game-core.js game-core.js style.css
git commit -m "feat: 밸런스 완화 - 목숨 5개, 제한시간 12초(하한 8초), 당근 HUD 확대"
```

---

### Task 2: 화면 매니저 + 시작 화면

**Files:**
- Modify: `index.html` (`<main id="game">` 뒤, `#gameover` 앞에 `#start-screen` 추가)
- Modify: `style.css` (오버레이·패널 선택자 일반화 + 시작 화면 스타일)
- Modify: `game.js` (showScreen 도입, tick 게이트, startGame)

**Interfaces:**
- Consumes: 없음
- Produces: `showScreen(name)`과 `screenEls` 객체(이후 태스크가 `leaderboard`/`ending` 키 추가), `startGame()` (이후 태스크의 [다시 시작] 버튼들이 사용), `screen` 변수 ('start'|'playing'|'gameover'|…)

- [ ] **Step 1: index.html — 시작 화면 추가**

`</main>` 바로 뒤, `<div id="gameover" hidden>` 앞에 추가한다:

```html
  <!-- 시작 화면 — 접속 시 처음 보이는 오버레이 (hidden 없음), 전환은 game.js showScreen -->
  <div id="start-screen">
    <div class="panel">
      <img class="screen-rabbit" src="assets/rabbit-idle.png" alt="">
      <p class="screen-bubble">친구들아, 분수와 소수로<br>즐거운 게임 해보자!</p>
      <button id="start-game">게임 시작</button>
    </div>
  </div>
```

- [ ] **Step 2: style.css — 오버레이·패널 선택자 일반화 + 시작 화면 스타일**

(a) 오버레이 규칙의 선택자를 확장한다 (규칙 내용은 그대로):

```css
#gameover {
```
→
```css
#gameover, #start-screen, #leaderboard-screen, #ending-screen {
```

```css
#gameover[hidden] { display: none; }
```
→
```css
#gameover[hidden], #start-screen[hidden],
#leaderboard-screen[hidden], #ending-screen[hidden] { display: none; }
```

(b) 패널 규칙을 오버레이 공용으로 (규칙 내용 그대로, 선택자만):

- `#gameover .panel {` → `.panel {`
- `#gameover .panel-body { overflow-y: auto; }` → `.panel-body { overflow-y: auto; }`
- `#gameover .panel .title {` → `.panel .title {`

(`#gameover.newbest .panel`/`::before`/`::after`는 신기록 전용이므로 그대로 둔다)

(c) 시작 버튼: `#restart` 규칙 2개의 선택자에 `#start-game`을 추가한다:

- `#restart {` → `#restart, #start-game {`
- `#restart:active {` → `#restart:active, #start-game:active {`

(d) 오버레이 공용 요소 스타일을 `.panel` 규칙 뒤에 추가한다:

```css
/* 시작·엔딩 화면의 토끼와 대사 */
.screen-rabbit {
  display: block;
  width: 8rem;
  height: 12rem;
  object-fit: contain;
  margin: 0 auto 0.6rem;
}
.screen-bubble {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 1.2rem;
  line-height: 1.5;
}
```

- [ ] **Step 3: game.js — 화면 매니저 도입**

(a) DOM 참조 블록(`const gameoverCutEl = ...` 아래)에 추가:

```js
const startScreenEl = document.getElementById('start-screen');
const startGameBtn = document.getElementById('start-game');
```

(b) `let lastChoice = null;` 아래에 화면 매니저 추가:

```js
// ---------- 화면 전환 (표시 전용) ----------
// 오버레이를 hidden 토글로 전환한다. 'playing'은 오버레이가 없는 상태.
// 이후 leaderboard/ending 화면이 이 객체에 키를 추가한다.
const screenEls = {
  start: startScreenEl,
  gameover: gameoverEl,
};
let screen = 'start';
function showScreen(name) {
  screen = name;
  for (const [key, el] of Object.entries(screenEls)) el.hidden = key !== name;
}

// 새 게임 시작 — 어느 화면의 [다시 시작]이든 여기로 모인다
function startGame() {
  lastChoice = null;
  showScreen('playing');
  update(createGame());
}
```

(c) `update()`의 게임오버 전이 블록 맨 앞에 화면 전환 추가:

```js
  if (prevState.phase !== 'gameover' && state.phase === 'gameover') {
```
바로 다음 줄에:
```js
    showScreen('gameover');
```

(d) `render()`에서 화면 매니저와 겹치는 줄 제거:

```js
  gameoverEl.hidden = state.phase !== 'gameover';
```
이 한 줄을 삭제한다 (오버레이 표시는 showScreen 전담).

(e) `restartBtn` 리스너를 startGame으로 교체:

```js
restartBtn.addEventListener('click', () => {
  lastChoice = null;
  update(createGame());
});
```
→
```js
restartBtn.addEventListener('click', startGame);
startGameBtn.addEventListener('click', startGame);
```

(f) `frame()`의 tick 조건에 화면 게이트 추가:

```js
  if (state.phase === 'question' && elapsed > 0) {
```
→
```js
  // 시작·게임오버 등 오버레이가 떠 있는 동안에는 타이머가 흐르지 않는다
  if (screen === 'playing' && state.phase === 'question' && elapsed > 0) {
```

(g) 파일 끝 `render();` 앞에 초기 화면 지정 추가:

```js
showScreen('start');
```

- [ ] **Step 4: 회귀 테스트**

Run: `npm test`
Expected: 92개 전부 통과

- [ ] **Step 5: Commit**

```bash
git add index.html style.css game.js
git commit -m "feat: 시작 화면 + 화면 매니저 - 게임 시작 전 타이머 정지"
```

---

### Task 3: 게임오버 팝업 개편 + 리더보드 화면 분리

**Files:**
- Modify: `index.html` (#gameover 패널 개편, #leaderboard-screen 신설)
- Modify: `style.css` (버튼 행·보조 버튼, 기존 리더보드 스타일 정리)
- Modify: `game.js` (신기록 등록 흐름, 리더보드 화면 진입, 버튼 연결)

**Interfaces:**
- Consumes: Task 2의 `showScreen`/`screenEls`/`startGame`
- Produces: `showLeaderboard()` (Task 4의 화면에서도 재사용 없음 — 게임오버·신기록 경로 전용), `#quit-game`/`#lb-quit` 버튼 (Task 4가 리스너 연결)

- [ ] **Step 1: index.html — 게임오버 패널 개편**

`#gameover .panel-body` 안의 `#leaderboard` div 전체(`<div id="leaderboard" hidden>`부터 그 닫는 `</div>`까지)를 삭제하고, 그 자리에 다음을 넣는다:

```html
      <!-- 신기록일 때만 보이는 등록 폼 — 확인 시 리더보드 화면으로 이동 (game.js) -->
      <div id="newbest-form" hidden>
        <div class="lb-form">
          <input id="nickname" maxlength="8" placeholder="별명 (1~8자)" aria-label="별명" autocomplete="off">
          <button id="submit-score">확인</button>
        </div>
        <p class="lb-hint">실명 말고 별명을 써 주세요</p>
        <p id="submit-status"></p>
      </div>
```

그리고 `<button id="restart">다시 시작</button>`을 다음으로 교체한다:

```html
      <div class="btn-row">
        <button id="restart">다시 시작</button>
        <button id="show-ranking" class="btn-sub">순위 확인</button>
        <button id="quit-game" class="btn-sub">게임 종료</button>
      </div>
```

- [ ] **Step 2: index.html — 리더보드 화면 신설**

`#gameover` 오버레이 닫는 `</div>` 뒤에 추가한다:

```html
  <div id="leaderboard-screen" hidden>
    <div class="panel">
      <div class="panel-body">
        <p class="title">🏆 전체 TOP 10</p>
        <ol id="ranking"></ol>
        <p id="lb-status"></p>
      </div>
      <div class="btn-row">
        <button id="lb-restart">다시 시작</button>
        <button id="lb-quit" class="btn-sub">게임 종료</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: style.css — 버튼 행·보조 버튼 추가, 리더보드 규칙 정리**

(a) `#leaderboard { margin: 0 0 1rem; }`와 `#leaderboard[hidden] { display: none; }`,
`#leaderboard .lb-title { ... }` 규칙을 삭제한다 (요소가 사라짐).
`#ranking`/`#lb-status`/`.lb-form`/`#nickname`/`#submit-score`/`.lb-hint` 규칙은
새 화면에서 그대로 쓰므로 유지한다.

(b) 리더보드 스타일 섹션에 추가:

```css
/* 게임오버·리더보드 화면의 버튼 행 */
.btn-row {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 0.4rem;
}
/* 보조 버튼 — 주 버튼(핑크)과 구분되는 하늘색 */
.btn-sub {
  font-family: inherit;
  font-size: 1.05rem;
  font-weight: 800;
  padding: 0.7rem 1.3rem;
  border: none;
  border-radius: 999px;
  background: #fff;
  color: #2a6bb0;
  border: 3px solid var(--sky-border);
  cursor: pointer;
  box-shadow: 0 4px 0 var(--sky-shadow);
}
.btn-sub:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--sky-shadow); }
#newbest-form { margin: 0 0 0.8rem; }
#newbest-form[hidden] { display: none; }
#submit-status {
  min-height: 1.2rem;
  margin: 0.3rem 0 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #6b7280;
}
```

- [ ] **Step 4: game.js — 신기록 등록 흐름 + 리더보드 화면**

(a) DOM 참조 갱신 — 기존 `const leaderboardEl = document.getElementById('leaderboard');`를 삭제하고 다음으로 교체/추가:

```js
const newbestFormEl = document.getElementById('newbest-form');
const submitStatusEl = document.getElementById('submit-status');
const leaderboardScreenEl = document.getElementById('leaderboard-screen');
const showRankingBtn = document.getElementById('show-ranking');
const lbRestartBtn = document.getElementById('lb-restart');
```

(`rankingEl`/`nicknameEl`/`submitScoreBtn`/`lbStatusEl` 참조는 id가 유지되므로 그대로)

(b) `screenEls`에 리더보드 키 추가:

```js
const screenEls = {
  start: startScreenEl,
  gameover: gameoverEl,
};
```
→
```js
const screenEls = {
  start: startScreenEl,
  gameover: gameoverEl,
  leaderboard: leaderboardScreenEl,
};
```

(c) 리더보드 화면 진입 함수를 `refreshRanking` 아래에 추가:

```js
// 리더보드 화면 진입 — 들어갈 때마다 새로 조회한다
function showLeaderboard() {
  showScreen('leaderboard');
  refreshRanking();
}
```

(d) `update()`의 게임오버 전이 블록에서 기존 리더보드 준비 부분을:

```js
    // 게임오버에 들어올 때마다 리더보드를 새로 준비한다
    if (isConfigured(LEADERBOARD_CONFIG)) {
      scoreSubmitted = false;
      submitScoreBtn.disabled = false;
      nicknameEl.value = loadNickname();
      refreshRanking();
    }
```

다음으로 교체한다:

```js
    // 신기록 + Supabase 설정 시에만 등록 폼 노출. 등록이 곧 순위 이동이라 [순위 확인]은 숨긴다
    const canSubmit = isNewBest && isConfigured(LEADERBOARD_CONFIG);
    newbestFormEl.hidden = !canSubmit;
    showRankingBtn.hidden = !isConfigured(LEADERBOARD_CONFIG) || canSubmit;
    if (canSubmit) {
      scoreSubmitted = false;
      submitScoreBtn.disabled = false;
      nicknameEl.value = loadNickname();
      submitStatusEl.textContent = '';
    }
```

(e) `submitScore()`의 상태 표시를 `submitStatusEl`로 바꾸고, 성공 시 리더보드 화면으로 이동:

```js
async function submitScore() {
  const checked = validateNickname(nicknameEl.value);
  if (!checked.ok) {
    submitStatusEl.textContent = checked.reason;
    return;
  }
  submitScoreBtn.disabled = true;
  submitStatusEl.textContent = '등록 중...';
  try {
    const { url, options } = buildSubmitRequest(LEADERBOARD_CONFIG, {
      nickname: checked.nickname,
      score: state.score,
    });
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    scoreSubmitted = true;
    saveNickname(checked.nickname);
    showLeaderboard(); // 등록 성공 → 바로 순위 화면
  } catch {
    submitStatusEl.textContent = '등록에 실패했어요';
    submitScoreBtn.disabled = false; // 재시도 허용
  }
}
```

(기존 submitScore 전체를 위로 교체. `lbStatusEl`은 이제 리더보드 화면 조회 상태 전용)

(f) 리스너 추가 (`nicknameEl.addEventListener` 블록 아래):

```js
showRankingBtn.addEventListener('click', showLeaderboard);
lbRestartBtn.addEventListener('click', startGame);
```

(g) 파일 끝의 초기화 줄 삭제:

```js
// 설정이 비어 있으면 리더보드 섹션을 통째로 숨긴다 (Supabase 셋업 전에도 게임은 동작)
leaderboardEl.hidden = !isConfigured(LEADERBOARD_CONFIG);
```
이 두 줄을 삭제한다 (노출 제어가 update()의 canSubmit/showRankingBtn 분기로 이동).

- [ ] **Step 5: 회귀 테스트**

Run: `npm test`
Expected: 92개 전부 통과

- [ ] **Step 6: Commit**

```bash
git add index.html style.css game.js
git commit -m "feat: 게임오버 버튼 허브 + 리더보드 독립 화면 - 신기록만 등록"
```

---

### Task 4: 엔딩 화면 + 게임 종료 연결

**Files:**
- Modify: `index.html` (#ending-screen 신설)
- Modify: `style.css` (처음으로 버튼)
- Modify: `game.js` (ending 키·종료 리스너)

**Interfaces:**
- Consumes: Task 2의 `showScreen`/`screenEls`, Task 3의 `#quit-game`/`#lb-quit`
- Produces: 없음 (흐름 완결)

- [ ] **Step 1: index.html — 엔딩 화면**

`#leaderboard-screen` 닫는 `</div>` 뒤에 추가한다:

```html
  <div id="ending-screen" hidden>
    <div class="panel">
      <img class="screen-rabbit" src="assets/rabbit-cheer.png" alt="">
      <p class="screen-bubble">언제든 다시 놀러와!</p>
      <button id="go-home" class="btn-sub">처음으로</button>
    </div>
  </div>
```

- [ ] **Step 2: game.js — ending 연결**

(a) DOM 참조 추가:

```js
const endingScreenEl = document.getElementById('ending-screen');
const quitGameBtn = document.getElementById('quit-game');
const lbQuitBtn = document.getElementById('lb-quit');
const goHomeBtn = document.getElementById('go-home');
```

(b) `screenEls`에 `ending: endingScreenEl,` 키 추가.

(c) 리스너 추가:

```js
quitGameBtn.addEventListener('click', () => showScreen('ending'));
lbQuitBtn.addEventListener('click', () => showScreen('ending'));
goHomeBtn.addEventListener('click', () => showScreen('start'));
```

- [ ] **Step 3: 회귀 테스트 + Commit**

Run: `npm test` — Expected: 92개 통과

```bash
git add index.html game.js
git commit -m "feat: 엔딩 화면 - 게임 종료 시 토끼 인사 + 처음으로 버튼"
```

---

### Task 5: 최종 검증 + 문서 갱신 + 배포

**Files:**
- Modify: `CLAUDE.md` ("현재 상태"의 레벨·리더보드 항목 갱신)

- [ ] **Step 1: 브라우저 흐름 순회 (사용자와 함께)**

1. 접속 → 시작 화면(토끼+대사), 뒤에서 타이머가 안 도는지(시작 후 첫 문제가 12초 풀로 시작)
2. 플레이 → 당근 5개(2rem) 표시, 모바일 폭에서 HUD 안 겹침
3. 일반 게임오버 → [다시 시작][순위 확인][게임 종료] 3버튼, 등록 폼 없음
4. [순위 확인] → 리더보드 화면(조회) → [다시 시작] 동작
5. 신기록 게임오버 → 등록 폼+[확인] (순위 확인 버튼은 숨김) → 등록 → 리더보드 자동 이동
6. [게임 종료] → 엔딩(토끼+"언제든 다시 놀러와!") → [처음으로] → 시작 화면
7. 잘못된 닉네임 에러, 등록 실패 시 재시도

- [ ] **Step 2: CLAUDE.md 갱신**

- 레벨 항목의 "하한 `TIME_MIN_MS`(6초)"를 "(8초)"로, 필요 시 기본 시간 언급 갱신
- 리더보드 항목에 "등록은 신기록일 때만, 화면 흐름은
  `docs/superpowers/specs/2026-07-10-screen-flow-design.md`" 추가

- [ ] **Step 3: 최종 테스트 + Commit + 사용자 확인 후 푸시**

Run: `npm test` — Expected: 92개 통과

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 현재 상태 갱신 - 화면 흐름·밸런스"
# 사용자 확인 후:
git push origin master
```
