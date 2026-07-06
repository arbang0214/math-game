// 게임 루프 상태 머신 (빌드 3단계: 타이머 + 하트)
// DOM 없음. 상태를 받아 새 상태를 돌려주는 순수 함수들 — Node에서 테스트 가능.
// 실제 시계는 UI가 갖고, 여기서는 tick(state, elapsedMs)로 흐른 시간을 주입받는다.
//
// 상태 흐름: question --answer/시간초과--> feedback --next--> question ...
//            하트가 0이 되면 feedback 대신 gameover (createGame으로만 재시작)

import { makeComparisonProblem, checkAnswer } from './problems.js';

export const MAX_HEARTS = 3;
export const TIME_LIMIT_MS = 10000;

function newQuestion(rng) {
  return {
    phase: 'question',
    problem: makeComparisonProblem(rng),
    lastResult: null, // 'correct' | 'wrong' | 'timeout' — feedback/gameover에서만 값이 있다
    timeLeftMs: TIME_LIMIT_MS,
  };
}

export function createGame(rng = Math.random) {
  return { ...newQuestion(rng), hearts: MAX_HEARTS };
}

// 하트를 잃은 뒤의 단계: 남아 있으면 feedback, 다 잃었으면 gameover
function loseHeart(state, result) {
  const hearts = state.hearts - 1;
  return {
    ...state,
    hearts,
    phase: hearts === 0 ? 'gameover' : 'feedback',
    lastResult: result,
  };
}

// choice: 'left' | 'right'
export function answer(state, choice) {
  if (state.phase !== 'question') {
    throw new Error(`question 단계에서만 답할 수 있음 (현재: ${state.phase})`);
  }
  if (!checkAnswer(state.problem, choice)) return loseHeart(state, 'wrong');
  return { ...state, phase: 'feedback', lastResult: 'correct' };
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
  return { ...newQuestion(rng), hearts: state.hearts };
}
