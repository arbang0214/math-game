// 게임 루프 UI (빌드 5단계) — game-core.js의 상태를 DOM에 그린다.
// 게임 규칙은 전부 game-core.js에 있고, 이 파일은 그리기·클릭 연결·실제 시계·최고점 저장만 한다.

import {
  createGame, answer, next, tick, comboMultiplier, MAX_HEARTS, TIME_LIMIT_MS,
} from './game-core.js';
import { answerText } from './problems.js';
import { fractionSegments } from './format.js';

const heartsEl = document.getElementById('hearts');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const timerFillEl = document.getElementById('timer-fill');
const promptEl = document.getElementById('prompt');
const questionEl = document.getElementById('question');
const choicesEl = document.getElementById('choices');
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

function choiceButton(choiceKey, text) {
  const btn = document.createElement('button');
  btn.className = 'choice';
  btn.dataset.choice = choiceKey;
  renderWithFractions(btn, text);
  return btn;
}

// 보기 버튼 만들기 — 이지선다(compare)는 2개 + vs, 사지선다는 2×2 그리드 4개
function renderChoices(problem) {
  choicesEl.textContent = '';
  const isCompare = problem.type === 'compare';
  choicesEl.classList.toggle('quad', !isCompare);
  if (isCompare) {
    const vs = document.createElement('span');
    vs.id = 'vs';
    vs.textContent = 'vs';
    choicesEl.append(
      choiceButton('left', problem.left.text),
      vs,
      choiceButton('right', problem.right.text),
    );
  } else {
    problem.choices.forEach((c, i) => choicesEl.append(choiceButton(String(i), c.text)));
  }
}

// render는 타이머 때문에 매 프레임 불리므로, 버튼은 문제가 바뀔 때만 다시 만든다
let renderedProblem = null;

function render() {
  heartsEl.textContent =
    '❤'.repeat(state.hearts) + '🤍'.repeat(MAX_HEARTS - state.hearts);
  const mult = comboMultiplier(state.combo);
  scoreEl.textContent =
    `⭐ ${state.score}` + (mult > 1 ? ` 🔥x${mult}` : '');
  timerFillEl.style.width = `${(state.timeLeftMs / TIME_LIMIT_MS) * 100}%`;

  if (state.problem !== renderedProblem) {
    renderedProblem = state.problem;
    promptEl.textContent = state.problem.prompt;
    questionEl.hidden = !state.problem.question;
    renderWithFractions(questionEl, state.problem.question ?? '');
    renderChoices(state.problem);
  }

  const answering = state.phase === 'question';
  for (const btn of choicesEl.querySelectorAll('button')) {
    btn.disabled = !answering;
  }
  nextBtn.hidden = state.phase !== 'feedback';
  gameoverEl.hidden = state.phase !== 'gameover';
  if (state.phase === 'gameover') {
    finalScoreEl.textContent = isNewBest
      ? `🎉 신기록! ${state.score}점`
      : `점수 ${state.score}점 · 최고점 ${best}점`;
  }

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
}

// 보기 클릭은 컨테이너 위임 한 곳에서 처리 — 사지선다는 인덱스 숫자로 변환해 넘긴다
choicesEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-choice]');
  if (!btn || state.phase !== 'question') return;
  const choice = btn.dataset.choice;
  update(answer(state, state.problem.type === 'compare' ? choice : Number(choice)));
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
