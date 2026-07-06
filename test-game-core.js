// game-core.js 단위 테스트 — 실행: node test-game-core.js
import { createGame, answer, next } from './game-core.js';
import { checkAnswer } from './problems.js';

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    fail++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// 정해진 수열을 순서대로 돌려주는 가짜 rng (결정적 테스트용)
function fakeRng(seq) {
  let i = 0;
  return () => {
    if (i >= seq.length) throw new Error('가짜 rng 수열이 바닥남');
    return seq[i++];
  };
}

console.log('createGame');
test('처음 상태는 question 단계, 문제 있음, lastResult 없음', () => {
  const s = createGame(fakeRng([0, 0, 0, 0])); // 1/2 vs 0.3, 답 left
  assert(s.phase === 'question', `phase가 question이 아님: ${s.phase}`);
  assert(s.problem.type === 'compare', `문제가 없음: ${JSON.stringify(s.problem)}`);
  assert(s.lastResult === null, `lastResult가 null이 아님: ${s.lastResult}`);
});

console.log('answer (결정적)');
test('정답을 고르면 feedback 단계 + correct', () => {
  const s = createGame(fakeRng([0, 0, 0, 0])); // 답 left
  const after = answer(s, 'left');
  assert(after.phase === 'feedback', `phase가 feedback이 아님: ${after.phase}`);
  assert(after.lastResult === 'correct', `correct가 아님: ${after.lastResult}`);
});
test('오답을 고르면 feedback 단계 + wrong', () => {
  const s = createGame(fakeRng([0, 0, 0, 0])); // 답 left
  const after = answer(s, 'right');
  assert(after.phase === 'feedback', `phase가 feedback이 아님: ${after.phase}`);
  assert(after.lastResult === 'wrong', `wrong이 아님: ${after.lastResult}`);
});
test('answer는 원래 상태를 바꾸지 않는다 (문제는 그대로)', () => {
  const s = createGame(fakeRng([0, 0, 0, 0]));
  const after = answer(s, 'left');
  assert(s.phase === 'question', '원본 상태가 바뀜');
  assert(after.problem === s.problem, 'feedback 단계에서 문제가 바뀌면 안 됨');
});
test('feedback 단계에서 answer를 부르면 에러', () => {
  const s = answer(createGame(fakeRng([0, 0, 0, 0])), 'left');
  let threw = false;
  try {
    answer(s, 'left');
  } catch {
    threw = true;
  }
  assert(threw, '에러가 나야 함');
});

console.log('next (결정적)');
test('next는 새 문제로 question 단계를 시작한다', () => {
  const s = answer(createGame(fakeRng([0, 0, 0, 0])), 'left');
  const after = next(s, fakeRng([0.9, 0.9, 0.9, 0.9]));
  assert(after.phase === 'question', `phase가 question이 아님: ${after.phase}`);
  assert(after.lastResult === null, `lastResult가 초기화 안 됨: ${after.lastResult}`);
  assert(after.problem !== s.problem, '새 문제가 아님');
});
test('question 단계에서 next를 부르면 에러', () => {
  const s = createGame(fakeRng([0, 0, 0, 0]));
  let threw = false;
  try {
    next(s);
  } catch {
    threw = true;
  }
  assert(threw, '에러가 나야 함');
});

console.log('게임 루프 (무작위 200회 속성 검사)');
test('answer→next를 반복해도 상태 흐름 불변식이 유지된다', () => {
  let s = createGame();
  for (let i = 0; i < 200; i++) {
    assert(s.phase === 'question' && s.lastResult === null, `${i}번째: question 상태가 이상함`);
    const choice = Math.random() < 0.5 ? 'left' : 'right';
    const expected = checkAnswer(s.problem, choice) ? 'correct' : 'wrong';
    s = answer(s, choice);
    assert(s.phase === 'feedback', `${i}번째: feedback으로 안 넘어감`);
    assert(s.lastResult === expected, `${i}번째: 판정 불일치 (${s.lastResult} ≠ ${expected})`);
    s = next(s);
  }
});

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail > 0 ? 1 : 0);
