// game-core.js 단위 테스트 — 실행: node test-game-core.js
import {
  createGame, answer, next, tick, MAX_HEARTS, TIME_LIMIT_MS,
} from './game-core.js';
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
test('처음 상태는 하트 가득, 타이머 가득', () => {
  const s = createGame(fakeRng([0, 0, 0, 0]));
  assert(s.hearts === MAX_HEARTS, `하트가 ${MAX_HEARTS}개가 아님: ${s.hearts}`);
  assert(s.timeLeftMs === TIME_LIMIT_MS, `타이머가 가득이 아님: ${s.timeLeftMs}`);
});

console.log('answer (결정적)');
test('정답을 고르면 feedback 단계 + correct, 하트 유지', () => {
  const s = createGame(fakeRng([0, 0, 0, 0])); // 답 left
  const after = answer(s, 'left');
  assert(after.phase === 'feedback', `phase가 feedback이 아님: ${after.phase}`);
  assert(after.lastResult === 'correct', `correct가 아님: ${after.lastResult}`);
  assert(after.hearts === MAX_HEARTS, `정답인데 하트가 줄었음: ${after.hearts}`);
});
test('오답을 고르면 feedback 단계 + wrong, 하트 1개 감소', () => {
  const s = createGame(fakeRng([0, 0, 0, 0])); // 답 left
  const after = answer(s, 'right');
  assert(after.phase === 'feedback', `phase가 feedback이 아님: ${after.phase}`);
  assert(after.lastResult === 'wrong', `wrong이 아님: ${after.lastResult}`);
  assert(after.hearts === MAX_HEARTS - 1, `하트가 1개 줄지 않음: ${after.hearts}`);
});
test('answer는 원래 상태를 바꾸지 않는다 (문제는 그대로)', () => {
  const s = createGame(fakeRng([0, 0, 0, 0]));
  const after = answer(s, 'left');
  assert(s.phase === 'question', '원본 상태가 바뀜');
  assert(s.hearts === MAX_HEARTS, '원본 하트가 바뀜');
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

console.log('tick (결정적)');
test('tick은 남은 시간을 줄이고 question 단계를 유지한다', () => {
  const s = createGame(fakeRng([0, 0, 0, 0]));
  const after = tick(s, 1000);
  assert(after.phase === 'question', `phase가 바뀌면 안 됨: ${after.phase}`);
  assert(after.timeLeftMs === TIME_LIMIT_MS - 1000, `시간이 안 줄었음: ${after.timeLeftMs}`);
  assert(after.hearts === MAX_HEARTS, `하트가 줄면 안 됨: ${after.hearts}`);
});
test('시간이 다 되면 timeout으로 feedback 단계 + 하트 1개 감소', () => {
  const s = createGame(fakeRng([0, 0, 0, 0]));
  const after = tick(s, TIME_LIMIT_MS);
  assert(after.phase === 'feedback', `phase가 feedback이 아님: ${after.phase}`);
  assert(after.lastResult === 'timeout', `timeout이 아님: ${after.lastResult}`);
  assert(after.hearts === MAX_HEARTS - 1, `하트가 1개 줄지 않음: ${after.hearts}`);
  assert(after.timeLeftMs === 0, `남은 시간이 0이어야 함: ${after.timeLeftMs}`);
});
test('제한시간을 넘겨도 남은 시간은 음수가 되지 않는다', () => {
  const s = createGame(fakeRng([0, 0, 0, 0]));
  const after = tick(s, TIME_LIMIT_MS + 5000);
  assert(after.timeLeftMs === 0, `음수가 되면 안 됨: ${after.timeLeftMs}`);
});
test('feedback 단계에서 tick은 상태를 그대로 둔다 (늦게 울린 시계 무시)', () => {
  const s = answer(createGame(fakeRng([0, 0, 0, 0])), 'left');
  const after = tick(s, 99999);
  assert(after === s, 'question 단계가 아니면 상태가 그대로여야 함');
});

console.log('next (결정적)');
test('next는 새 문제로 question 단계를 시작하고 하트·타이머를 이어간다', () => {
  const s = answer(createGame(fakeRng([0, 0, 0, 0])), 'right'); // 오답 → 하트 2개
  const after = next(s, fakeRng([0.9, 0.9, 0.9, 0.9]));
  assert(after.phase === 'question', `phase가 question이 아님: ${after.phase}`);
  assert(after.lastResult === null, `lastResult가 초기화 안 됨: ${after.lastResult}`);
  assert(after.problem !== s.problem, '새 문제가 아님');
  assert(after.hearts === MAX_HEARTS - 1, `하트가 유지 안 됨: ${after.hearts}`);
  assert(after.timeLeftMs === TIME_LIMIT_MS, `타이머가 리셋 안 됨: ${after.timeLeftMs}`);
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

console.log('gameover (결정적)');
test('오답 3번이면 gameover 단계', () => {
  let s = createGame(fakeRng([0, 0, 0, 0]));
  for (let i = 0; i < MAX_HEARTS; i++) {
    const wrong = s.problem.answer === 'left' ? 'right' : 'left';
    s = answer(s, wrong);
    if (i < MAX_HEARTS - 1) {
      assert(s.phase === 'feedback', `${i + 1}번째 오답: 아직 feedback이어야 함`);
      s = next(s, fakeRng([0, 0, 0, 0]));
    }
  }
  assert(s.phase === 'gameover', `phase가 gameover가 아님: ${s.phase}`);
  assert(s.hearts === 0, `하트가 0이 아님: ${s.hearts}`);
  assert(s.lastResult === 'wrong', `마지막 결과가 wrong이어야 함: ${s.lastResult}`);
});
test('시간 초과로도 gameover가 된다', () => {
  let s = createGame(fakeRng([0, 0, 0, 0]));
  for (let i = 0; i < MAX_HEARTS; i++) {
    s = tick(s, TIME_LIMIT_MS);
    if (i < MAX_HEARTS - 1) s = next(s, fakeRng([0, 0, 0, 0]));
  }
  assert(s.phase === 'gameover', `phase가 gameover가 아님: ${s.phase}`);
  assert(s.lastResult === 'timeout', `마지막 결과가 timeout이어야 함: ${s.lastResult}`);
});
test('gameover 단계에서 answer·next를 부르면 에러', () => {
  let s = createGame(fakeRng([0, 0, 0, 0]));
  s = answer(s, 'right');
  s = next(s, fakeRng([0, 0, 0, 0]));
  s = answer(s, s.problem.answer === 'left' ? 'right' : 'left');
  s = next(s, fakeRng([0, 0, 0, 0]));
  s = answer(s, s.problem.answer === 'left' ? 'right' : 'left'); // 하트 0 → gameover
  assert(s.phase === 'gameover', `준비 실패: ${s.phase}`);
  for (const fn of [() => answer(s, 'left'), () => next(s)]) {
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    assert(threw, 'gameover에서는 에러가 나야 함');
  }
});

console.log('게임 루프 (무작위 500회 속성 검사)');
test('무작위로 답하거나 시간을 흘려도 상태 불변식이 유지된다', () => {
  let s = createGame();
  for (let i = 0; i < 500; i++) {
    assert(s.phase === 'question' && s.lastResult === null, `${i}번째: question 상태가 이상함`);
    assert(s.hearts >= 1 && s.hearts <= MAX_HEARTS, `${i}번째: 하트 범위 밖 (${s.hearts})`);

    if (Math.random() < 0.3) {
      // 시간 초과 경로: 잘게 나눠 tick해도 정확히 timeout이 된다
      while (s.phase === 'question') {
        s = tick(s, 500 + Math.floor(Math.random() * 3000));
        assert(s.timeLeftMs >= 0, `${i}번째: 남은 시간이 음수 (${s.timeLeftMs})`);
      }
      assert(s.lastResult === 'timeout', `${i}번째: timeout이 아님 (${s.lastResult})`);
    } else {
      const heartsBefore = s.hearts;
      const choice = Math.random() < 0.5 ? 'left' : 'right';
      const correct = checkAnswer(s.problem, choice);
      s = answer(s, choice);
      assert(s.lastResult === (correct ? 'correct' : 'wrong'), `${i}번째: 판정 불일치`);
      assert(s.hearts === heartsBefore - (correct ? 0 : 1), `${i}번째: 하트 계산 틀림`);
    }

    assert(
      (s.phase === 'gameover') === (s.hearts === 0),
      `${i}번째: gameover와 하트 0이 안 맞음 (phase=${s.phase}, hearts=${s.hearts})`,
    );
    s = s.phase === 'gameover' ? createGame() : next(s);
  }
});

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail > 0 ? 1 : 0);
