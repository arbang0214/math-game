// 게임 루프 UI (빌드 2단계) — game-core.js의 상태를 DOM에 그린다.
// 게임 규칙은 전부 game-core.js에 있고, 이 파일은 그리기와 클릭 연결만 한다.

import { createGame, answer, next } from './game-core.js';

const promptEl = document.getElementById('prompt');
const leftBtn = document.getElementById('left');
const rightBtn = document.getElementById('right');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('next');

let state = createGame();

function render() {
  promptEl.textContent = state.problem.prompt;
  leftBtn.textContent = state.problem.left.text;
  rightBtn.textContent = state.problem.right.text;

  const answering = state.phase === 'question';
  leftBtn.disabled = !answering;
  rightBtn.disabled = !answering;
  nextBtn.hidden = answering;

  if (state.phase === 'feedback') {
    const answerText = state.problem[state.problem.answer].text;
    const correct = state.lastResult === 'correct';
    feedbackEl.textContent = correct ? '⭕ 정답!' : `❌ 오답! 정답은 ${answerText}`;
    feedbackEl.className = state.lastResult;
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

render();
