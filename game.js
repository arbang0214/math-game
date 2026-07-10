// 게임 루프 UI (빌드 6단계) — game-core.js의 상태를 DOM에 그린다.
// 게임 규칙은 전부 game-core.js에 있고, 이 파일은 그리기·클릭 연결·실제 시계·최고점 저장만 한다.

import {
  createGame, answer, next, tick, comboMultiplier, MAX_HEARTS,
} from './game-core.js';
import { answerText } from './problems.js';
import { fractionSegments } from './format.js';
import { LEADERBOARD_CONFIG } from './leaderboard-config.js';
import {
  validateNickname, isConfigured, buildSubmitRequest, buildTopRequest, parseTopResponse,
} from './leaderboard.js';

const heartsEl = document.getElementById('hearts');
const levelEl = document.getElementById('level');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const timerFillEl = document.getElementById('timer-fill');
const promptEl = document.getElementById('prompt');
const questionEl = document.getElementById('question');
const choicesEl = document.getElementById('choices');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('next');
const gameoverEl = document.getElementById('gameover');
const gameoverCutEl = document.getElementById('gameover-cut');
const restartBtn = document.getElementById('restart');
const startScreenEl = document.getElementById('start-screen');
const startGameBtn = document.getElementById('start-game');

const gameEl = document.getElementById('game');
const mascotEl = document.getElementById('mascot');

const leaderboardEl = document.getElementById('leaderboard');
const rankingEl = document.getElementById('ranking');
const nicknameEl = document.getElementById('nickname');
const submitScoreBtn = document.getElementById('submit-score');
const lbStatusEl = document.getElementById('lb-status');

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

// ---------- 리더보드 (fetch 실행과 그리기만 — 규칙은 leaderboard.js) ----------

// 마지막 닉네임 기억 (최고점과 같은 localStorage 패턴)
const NICK_KEY = 'math-game.nickname';
function loadNickname() {
  try {
    return localStorage.getItem(NICK_KEY) || '';
  } catch {
    return '';
  }
}
function saveNickname(name) {
  try {
    localStorage.setItem(NICK_KEY, name);
  } catch {
    // 저장 실패해도 게임은 계속되어야 한다
  }
}

let scoreSubmitted = false; // 게임당 1회 등록

// TOP 10 조회·그리기 — 실패해도 게임 진행에는 영향이 없다.
// 겹쳐 호출되면(게임오버 진입 직후 등록 등) 늦게 도착한 이전 응답을 세대 번호로 버린다.
let rankingGen = 0;
async function refreshRanking() {
  const gen = ++rankingGen;
  lbStatusEl.textContent = '불러오는 중...';
  rankingEl.textContent = '';
  try {
    const { url, options } = buildTopRequest(LEADERBOARD_CONFIG);
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = parseTopResponse(await res.json());
    if (gen !== rankingGen) return; // 더 새로운 조회가 시작됨 — 이 응답은 버린다
    lbStatusEl.textContent = rows.length === 0 ? '아직 등록된 점수가 없어요' : '';
    for (const row of rows) {
      const li = document.createElement('li');
      li.textContent = `${row.nickname} — ${row.score}점`; // 순위 번호는 ol이 붙인다
      rankingEl.append(li);
    }
  } catch {
    if (gen !== rankingGen) return;
    lbStatusEl.textContent = '순위를 불러오지 못했어요';
  }
}

// 점수 등록 — 성공하면 버튼을 잠그고 목록을 갱신한다
async function submitScore() {
  const checked = validateNickname(nicknameEl.value);
  if (!checked.ok) {
    lbStatusEl.textContent = checked.reason;
    return;
  }
  submitScoreBtn.disabled = true;
  lbStatusEl.textContent = '등록 중...';
  try {
    const { url, options } = buildSubmitRequest(LEADERBOARD_CONFIG, {
      nickname: checked.nickname,
      score: state.score,
    });
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    scoreSubmitted = true;
    saveNickname(checked.nickname);
    await refreshRanking();
    lbStatusEl.textContent = '등록 완료!';
  } catch {
    lbStatusEl.textContent = '등록에 실패했어요';
    submitScoreBtn.disabled = false; // 재시도 허용
  }
}

let state = createGame();
let best = loadBest();
let isNewBest = false;

// 직전에 고른 보기 — 결과 공개 때 .picked 표시용 (UI 전용 상태)
let lastChoice = null;

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

// 상태 교체 지점을 한 곳으로 모아 gameover 진입 시에만 최고점을 갱신한다
function update(newState) {
  const prevState = state;
  state = newState;
  if (prevState.phase !== 'gameover' && state.phase === 'gameover') {
    showScreen('gameover');
    isNewBest = state.score > best;
    if (isNewBest) {
      best = state.score;
      saveBest(best);
    }
    // 게임오버에 들어올 때마다 리더보드를 새로 준비한다
    if (isConfigured(LEADERBOARD_CONFIG)) {
      scoreSubmitted = false;
      submitScoreBtn.disabled = false;
      nicknameEl.value = loadNickname();
      refreshRanking();
    }
  }
  playEffects(prevState, state);
  render();
}

// 같은 연출을 연달아 틀 수 있도록 클래스를 뗐다 붙인다 (리플로우로 재시작)
function playOnce(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

// 떠오르며 사라지는 일회성 텍스트 (+점수, LEVEL UP 등)
function spawnFloating(text, className) {
  // 모션 최소화 설정에선 애니메이션이 돌지 않아 animationend가 오지 않는다 — 아예 만들지 않는다
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  gameEl.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// 상태 전이 순간에만 트는 일회성 연출
function playEffects(prev, cur) {
  // 새 문제로 넘어오면서 레벨이 올랐으면 레벨업 연출
  if (cur.phase === 'question' && prev.level !== undefined && cur.level > prev.level) {
    playOnce(levelEl, 'pulse');
    spawnFloating(`LEVEL UP! Lv.${cur.level}`, 'float-score float-level');
  }
  if (prev.phase !== 'question' || cur.phase === 'question') return;
  if (cur.lastResult === 'correct') {
    playOnce(mascotEl, 'jump');
    spawnFloating(`+${cur.lastGain}`, 'float-score');
    const picked = choicesEl.querySelector(`[data-choice="${lastChoice}"]`);
    if (picked) playOnce(picked, 'pop');
  } else if (cur.phase === 'gameover' && isNewBest) {
    // 신기록 게임오버: 실패 연출 대신 축하 점프 (스펙: "신기록이면 축하 점프")
    playOnce(mascotEl, 'jump');
  } else {
    playOnce(gameEl, 'shake');
    playOnce(mascotEl, 'wobble');
  }
  if (comboMultiplier(cur.combo) > comboMultiplier(prev.combo)) {
    playOnce(scoreEl, 'pulse');
  }
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
    // 스크린리더가 "3 5"가 아니라 "5분의 3"으로 읽도록 — 하트 HUD와 같은 role="img" 패턴
    frac.setAttribute('role', 'img');
    frac.setAttribute('aria-label', `${seg.den}분의 ${seg.num}`);
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

// 당근 목숨 HUD — render는 매 프레임 불리므로 목숨 수가 바뀔 때만 다시 그린다.
// SVG 요소는 createElement가 아니라 createElementNS로 만들어야 그려진다.
const SVG_NS = 'http://www.w3.org/2000/svg';
let renderedHearts = null;
function renderHearts(hearts) {
  if (hearts === renderedHearts) return;
  renderedHearts = hearts;
  heartsEl.setAttribute('aria-label', `목숨 ${hearts}개`);
  heartsEl.textContent = '';
  for (let i = 0; i < MAX_HEARTS; i++) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', i < hearts ? 'carrot' : 'carrot off');
    svg.setAttribute('viewBox', '0 0 24 26');
    // 컨테이너(#hearts)가 role="img"라 자식은 원래 프레젠테이션 처리되지만, 스크린리더 방어용
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#carrot-icon');
    svg.append(use);
    heartsEl.append(svg);
  }
}

function render() {
  renderHearts(state.hearts);
  levelEl.textContent = `Lv.${state.level}`;
  const mult = comboMultiplier(state.combo);
  scoreEl.textContent =
    `⭐ ${state.score}` + (mult > 1 ? ` 🔥x${mult}` : '');
  // 제한시간은 레벨마다 다르므로 상수가 아니라 상태에서 읽는다
  const ratio = state.timeLeftMs / state.timeLimitMs;
  timerFillEl.style.width = `${ratio * 100}%`;
  timerFillEl.classList.toggle('warn', ratio <= 0.6 && ratio > 0.3);
  timerFillEl.classList.toggle('danger', ratio <= 0.3);
  // 토끼 초조 단계는 타이머 바 색 단계(warn/danger)와 같은 경계를 쓴다
  const inQuestion = state.phase === 'question';
  mascotEl.classList.toggle('nervous', inQuestion && ratio <= 0.6 && ratio > 0.3);
  mascotEl.classList.toggle('urgent', inQuestion && ratio <= 0.3);

  if (state.problem !== renderedProblem) {
    renderedProblem = state.problem;
    promptEl.textContent = state.problem.prompt;
    questionEl.hidden = !state.problem.question;
    renderWithFractions(questionEl, state.problem.question ?? '');
    renderChoices(state.problem);
  }

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
  nextBtn.hidden = state.phase !== 'feedback';
  if (state.phase === 'gameover') {
    gameoverEl.classList.toggle('newbest', isNewBest);
    // 신기록이면 만세 컷, 아니면 시무룩 컷 (표시 전용 분기)
    gameoverCutEl.src = isNewBest ? 'assets/rabbit-cheer.png' : 'assets/rabbit-sad.png';
    finalScoreEl.textContent = isNewBest
      ? `🎉 신기록! ${state.score}점`
      : `점수 ${state.score}점 · 최고점 ${best}점`;
  }

  // 토끼 표정: 문제 중엔 기본, 정답·신기록은 웃음, 그 외 결과는 어질어질
  if (state.phase === 'question') {
    // 시간이 얼마 안 남으면(노란불부터) 초조한 표정
    mascotEl.dataset.face = ratio <= 0.6 ? 'worried' : 'idle';
  } else if (state.lastResult === 'correct' || (state.phase === 'gameover' && isNewBest)) {
    mascotEl.dataset.face = 'happy';
  } else {
    mascotEl.dataset.face = 'dizzy';
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
  lastChoice = choice;
  update(answer(state, state.problem.type === 'compare' ? choice : Number(choice)));
});
nextBtn.addEventListener('click', () => {
  lastChoice = null;
  update(next(state));
});
restartBtn.addEventListener('click', startGame);
startGameBtn.addEventListener('click', startGame);

// 등록 중(버튼 비활성)이거나 이미 등록했으면 무시 — Enter 연타로 인한 이중 POST 방지
function trySubmitScore() {
  if (scoreSubmitted || submitScoreBtn.disabled) return;
  submitScore();
}
submitScoreBtn.addEventListener('click', trySubmitScore);
nicknameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') trySubmitScore();
});

// 실제 시계: 매 프레임 흐른 시간을 core에 주입한다.
// 탭 전환 등으로 프레임이 오래 멈췄을 때 한 번에 시간이 다 깎이지 않도록 상한을 둔다.
let lastTs = null;
function frame(ts) {
  const elapsed = lastTs === null ? 0 : Math.min(ts - lastTs, 250);
  lastTs = ts;
  // 시작·게임오버 등 오버레이가 떠 있는 동안에는 타이머가 흐르지 않는다
  if (screen === 'playing' && state.phase === 'question' && elapsed > 0) {
    update(tick(state, elapsed));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 설정이 비어 있으면 리더보드 섹션을 통째로 숨긴다 (Supabase 셋업 전에도 게임은 동작)
leaderboardEl.hidden = !isConfigured(LEADERBOARD_CONFIG);

showScreen('start');
render();
