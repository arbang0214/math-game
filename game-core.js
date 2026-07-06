// 빌드 4단계: 점수+콤보
// 게임 루프 상태 머신 (빌드 4단계: 점수 + 콤보)
// DOM 없음. 상태를 받아 새 상태를 돌려주는 순수 함수들 — Node에서 테스트 가능.
// 실제 시계는 UI가 갖고, 여기서는 tick(state, elapsedMs)로 흐른 시간을 주입받는다.
// 최고점 저장(localStorage)은 UI 몫 — 여기서는 score만 계산한다.
//
// 상태 흐름: question --answer/시간초과--> feedback --next--> question ...
//            하트가 0이 되면 feedback 대신 gameover (createGame으로만 재시작)

import { makeComparisonProblem, checkAnswer } from './problems.js';

export const MAX_HEARTS = 3;
export const TIME_LIMIT_MS = 10000;
export const BASE_SCORE = 10;
export const COMBO_STEP = 3; // 연속 정답 이 개수마다 배율 +1
export const MAX_MULTIPLIER = 4;

// 연속 정답 수(combo)에 따른 점수 배율: 1~2연속 ×1, 3~5연속 ×2, 6~8연속 ×3, 9연속부터 ×4
export function comboMultiplier(combo) {
  return Math.min(1 + Math.floor(combo / COMBO_STEP), MAX_MULTIPLIER);
}

function newQuestion(rng) {
  return {
    phase: 'question',
    problem: makeComparisonProblem(rng),
    lastResult: null, // 'correct' | 'wrong' | 'timeout' — feedback/gameover에서만 값이 있다
    lastGain: 0, // 직전 답으로 얻은 점수 — feedback에서 "+20" 표시용
    timeLeftMs: TIME_LIMIT_MS,
  };
}

export function createGame(rng = Math.random) {
  return { ...newQuestion(rng), hearts: MAX_HEARTS, score: 0, combo: 0 };
}

// 하트를 잃은 뒤의 단계: 남아 있으면 feedback, 다 잃었으면 gameover. 콤보는 끊긴다.
function loseHeart(state, result) {
  const hearts = state.hearts - 1;
  return {
    ...state,
    hearts,
    phase: hearts === 0 ? 'gameover' : 'feedback',
    lastResult: result,
    combo: 0,
    lastGain: 0,
  };
}

// choice: 'left' | 'right'
export function answer(state, choice) {
  if (state.phase !== 'question') {
    throw new Error(`question 단계에서만 답할 수 있음 (현재: ${state.phase})`);
  }
  if (!checkAnswer(state.problem, choice)) return loseHeart(state, 'wrong');
  const combo = state.combo + 1;
  const gained = BASE_SCORE * comboMultiplier(combo);
  return {
    ...state,
    phase: 'feedback',
    lastResult: 'correct',
    combo,
    score: state.score + gained,
    lastGain: gained,
  };
}

// 흐른 시간을 반영한다. question 단계가 아니면 시계가 늦게 울린 것이므로 무시한다.
export function tick(state, elapsedMs) {
  if (state.phase !== 'question') return state;
  const timeLeftMs = state.timeLeftMs - elapsedMs;
  if (timeLeftMs > 0) return { ...state, timeLeftMs };
  return loseHeart({ ...state, timeLeftMs: 0 }, 'timeout');
}

export function next(state, rng = Math.random) {
  if (state.phase !== 'feedback') {
    throw new Error(`feedback 단계에서만 다음 문제로 넘어갈 수 있음 (현재: ${state.phase})`);
  }
  return { ...newQuestion(rng), hearts: state.hearts, score: state.score, combo: state.combo };
}
