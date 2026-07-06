// 게임 루프 UI (빌드 4단계) — game-core.js의 상태를 DOM에 그린다.
// 게임 규칙은 전부 game-core.js에 있고, 이 파일은 그리기·클릭 연결·실제 시계·최고점 저장만 한다.

import {
  createGame, answer, next, tick, comboMultiplier, MAX_HEARTS, TIME_LIMIT_MS,
} from './game-core.js';

const heartsEl = document.getElementById('hearts');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const timerFillEl = document.getElementById('timer-fill');
const promptEl = document.getElementById('prompt');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('next');
const gameoverEl = document.getElementById('gameover');
const restartBtn = document.getElementById('restart');

// 최고점: localStorage (사생활 보호 모드 등에서 막혀 있으면 이번 세션만 기억)
const BEST_KEY = 'math-game.best';
function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // 저장 실패해도 게임은 계속되어야 한다
  }
}

let state = createGame();
let best = loadBest();
let isNewBest = false;

// 상태 교체 지점을 한 곳으로 모아 gameover 진입 시에만 최고점을 갱신한다
function update(newState) {
  const wasOver = state.phase === 'gameover';
  state = newState;
  if (!wasOver && state.phase === 'gameover') {
    isNewBest = state.score > best;
    if (isNewBest) {
      best = state.score;
      saveBest(best);
    }
  }
  render();
}

function render() {
  heartsEl.textContent =
    '❤'.repeat(state.hearts) + '🖤'.repeat(MAX_HEARTS - state.hearts);
  const mult = comboMultiplier(state.combo);
  scoreEl.textContent =
    `점수: ${state.score}` + (mult > 1 ? ` 🔥x${mult}` : '');
  timerFillEl.style.width = `${(state.timeLeftMs / TIME_LIMIT_MS) * 100}%`;

  promptEl.textContent = state.problem.prompt;
  leftBtn.textContent = state.problem.left.text;
  rightBtn.textContent = state.problem.right.text;

  const answering = state.phase === 'question';
  leftBtn.disabled = !answering;
  rightBtn.disabled = !answering;
  nextBtn.hidden = state.phase !== 'feedback';
  gameoverEl.hidden = state.phase !== 'gameover';
  if (state.phase === 'gameover') {
    finalScoreEl.textContent = isNewBest
      ? `🎉 신기록! ${state.score}점`
      : `점수 ${state.score}점 · 최고점 ${best}점`;
  }

  if (state.phase === 'feedback' || state.phase === 'gameover') {
    const answerText = state.problem[state.problem.answer].text;
    if (state.lastResult === 'correct') {
      feedbackEl.textContent = `⭕ 정답! +${state.lastGain}`;
    } else if (state.lastResult === 'timeout') {
      feedbackEl.textContent = `⏰ 시간 초과! 정답은 ${answerText}`;
    } else {
      feedbackEl.textContent = `❌ 오답! 정답은 ${answerText}`;
    }
    feedbackEl.className = state.lastResult === 'correct' ? 'correct' : 'wrong';
  } else {
    feedbackEl.textContent = '';
    feedbackEl.className = '';
  }
}

leftBtn.addEventListener('click', () => {
  update(answer(state, 'left'));
});
rightBtn.addEventListener('click', () => {
  update(answer(state, 'right'));
});
nextBtn.addEventListener('click', () => {
  update(next(state));
});
restartBtn.addEventListener('click', () => {
  update(createGame());
});

// 실제 시계: 매 프레임 흐른 시간을 core에 주입한다.
// 탭 전환 등으로 프레임이 오래 멈췄을 때 한 번에 시간이 다 깎이지 않도록 상한을 둔다.
let lastTs = null;
function frame(ts) {
  const elapsed = lastTs === null ? 0 : Math.min(ts - lastTs, 250);
  lastTs = ts;
  if (state.phase === 'question' && elapsed > 0) {
    update(tick(state, elapsed));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

render();
