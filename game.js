// 게임 루프 UI (빌드 3단계) — game-core.js의 상태를 DOM에 그린다.
// 게임 규칙은 전부 game-core.js에 있고, 이 파일은 그리기·클릭 연결·실제 시계만 한다.

import {
  createGame, answer, next, tick, MAX_HEARTS, TIME_LIMIT_MS,
} from './game-core.js';

const heartsEl = document.getElementById('hearts');
const timerFillEl = document.getElementById('timer-fill');
const promptEl = document.getElementById('prompt');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('next');
const gameoverEl = document.getElementById('gameover');
const restartBtn = document.getElementById('restart');

let state = createGame();

function render() {
  heartsEl.textContent =
    '❤'.repeat(state.hearts) + '🖤'.repeat(MAX_HEARTS - state.hearts);
  timerFillEl.style.width = `${(state.timeLeftMs / TIME_LIMIT_MS) * 100}%`;

  promptEl.textContent = state.problem.prompt;
  leftBtn.textContent = state.problem.left.text;
  rightBtn.textContent = state.problem.right.text;

  const answering = state.phase === 'question';
  leftBtn.disabled = !answering;
  rightBtn.disabled = !answering;
  nextBtn.hidden = state.phase !== 'feedback';
  gameoverEl.hidden = state.phase !== 'gameover';

  if (state.phase === 'feedback' || state.phase === 'gameover') {
    const answerText = state.problem[state.problem.answer].text;
    if (state.lastResult === 'correct') {
      feedbackEl.textContent = '⭕ 정답!';
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
  state = answer(state, 'left');
  render();
});
rightBtn.addEventListener('click', () => {
  state = answer(state, 'right');
  render();
});
nextBtn.addEventListener('click', () => {
  state = next(state);
  render();
});
restartBtn.addEventListener('click', () => {
  state = createGame();
  render();
});

// 실제 시계: 매 프레임 흐른 시간을 core에 주입한다.
// 탭 전환 등으로 프레임이 오래 멈췄을 때 한 번에 시간이 다 깎이지 않도록 상한을 둔다.
let lastTs = null;
function frame(ts) {
  const elapsed = lastTs === null ? 0 : Math.min(ts - lastTs, 250);
  lastTs = ts;
  if (state.phase === 'question' && elapsed > 0) {
    state = tick(state, elapsed);
    render();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

render();
