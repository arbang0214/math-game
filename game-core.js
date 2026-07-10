// 게임 루프 상태 머신 (빌드 5단계: 문제 유형 확장)
// DOM 없음. 상태를 받아 새 상태를 돌려주는 순수 함수들 — Node에서 테스트 가능.
// 실제 시계는 UI가 갖고, 여기서는 tick(state, elapsedMs)로 흐른 시간을 주입받는다.
// 최고점 저장(localStorage)은 UI 몫 — 여기서는 score만 계산한다.
//
// 상태 흐름: question --answer/시간초과--> feedback --next--> question ...
//            하트가 0이 되면 feedback 대신 gameover (createGame으로만 재시작)

import { makeProblem, checkAnswer } from './problems.js';

export const MAX_HEARTS = 5;
export const TIME_LIMIT_MS = 12000; // 레벨 1 기준 제한시간
export const BASE_SCORE = 10;
export const COMBO_STEP = 3; // 연속 정답 이 개수마다 배율 +1
export const MAX_MULTIPLIER = 4;
export const LEVEL_SCORE_STEP = 100; // 이 점수마다 레벨 +1 (6단계)
export const TIME_STEP_MS = 500; // 레벨당 제한시간 감소량
export const TIME_MIN_MS = 8000; // 제한시간 하한

// 연속 정답 수(combo)에 따른 점수 배율: 1~2연속 ×1, 3~5연속 ×2, 6~8연속 ×3, 9연속부터 ×4
export function comboMultiplier(combo) {
  return Math.min(1 + Math.floor(combo / COMBO_STEP), MAX_MULTIPLIER);
}

// 점수 → 레벨: 0~99점 L1, 100~199점 L2, ... (레벨은 내려가지 않는다 — 점수가 안 깎이므로)
export function levelForScore(score) {
  return Math.floor(score / LEVEL_SCORE_STEP) + 1;
}

// 레벨 → 제한시간: 레벨당 TIME_STEP_MS씩 줄고 TIME_MIN_MS 밑으로는 안 내려간다
export function timeLimitForLevel(level) {
  return Math.max(TIME_LIMIT_MS - (level - 1) * TIME_STEP_MS, TIME_MIN_MS);
}

// 새 문제는 그 시점의 점수로 레벨을 정한다 — 문제 유형 비율·수 범위·제한시간이 레벨을 따른다
function newQuestion(score, rng) {
  const level = levelForScore(score);
  const timeLimitMs = timeLimitForLevel(level);
  return {
    phase: 'question',
    level,
    timeLimitMs, // UI가 타이머 바 비율을 이 값으로 계산한다 (상수 아님)
    problem: makeProblem(level, rng),
    lastResult: null, // 'correct' | 'wrong' | 'timeout' — feedback/gameover에서만 값이 있다
    lastGain: 0, // 직전 답으로 얻은 점수 — feedback에서 "+20" 표시용
    timeLeftMs: timeLimitMs,
  };
}

export function createGame(rng = Math.random) {
  return { ...newQuestion(0, rng), hearts: MAX_HEARTS, score: 0, combo: 0 };
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

// choice: compare는 'left'|'right', 사지선다는 보기 인덱스 0~3 (problems.js 참조)
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
  return { ...newQuestion(state.score, rng), hearts: state.hearts, score: state.score, combo: state.combo };
}
