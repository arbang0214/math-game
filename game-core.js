// 게임 루프 상태 머신 (빌드 2단계)
// DOM 없음. 상태를 받아 새 상태를 돌려주는 순수 함수들 — Node에서 테스트 가능.
//
// 상태 흐름: question(문제 풀이 중) --answer--> feedback(정답/오답 표시) --next--> question ...

import { makeComparisonProblem, checkAnswer } from './problems.js';

export function createGame(rng = Math.random) {
  return {
    phase: 'question',
    problem: makeComparisonProblem(rng),
    lastResult: null, // 'correct' | 'wrong' — feedback 단계에서만 값이 있다
  };
}

// choice: 'left' | 'right'
export function answer(state, choice) {
  if (state.phase !== 'question') {
    throw new Error(`question 단계에서만 답할 수 있음 (현재: ${state.phase})`);
  }
  const correct = checkAnswer(state.problem, choice);
  return {
    ...state,
    phase: 'feedback',
    lastResult: correct ? 'correct' : 'wrong',
  };
}

export function next(state, rng = Math.random) {
  if (state.phase !== 'feedback') {
    throw new Error(`feedback 단계에서만 다음 문제로 넘어갈 수 있음 (현재: ${state.phase})`);
  }
  return createGame(rng);
}
