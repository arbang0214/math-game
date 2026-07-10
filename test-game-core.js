// game-core.js 단위 테스트 — 실행: node test-game-core.js
import {
  createGame, answer, next, tick, comboMultiplier, levelForScore, timeLimitForLevel,
  MAX_HEARTS, TIME_LIMIT_MS, BASE_SCORE, COMBO_STEP, MAX_MULTIPLIER,
  LEVEL_SCORE_STEP, TIME_STEP_MS, TIME_MIN_MS,
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
  const s = createGame(fakeRng([0, 0, 0, 0, 0])); // 1/2 vs 0.3, 답 left
  assert(s.phase === 'question', `phase가 question이 아님: ${s.phase}`);
  assert(s.problem.type === 'compare', `문제가 없음: ${JSON.stringify(s.problem)}`);
  assert(s.lastResult === null, `lastResult가 null이 아님: ${s.lastResult}`);
});
test('처음 상태는 하트 가득, 타이머 가득', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0]));
  assert(s.hearts === MAX_HEARTS, `하트가 ${MAX_HEARTS}개가 아님: ${s.hearts}`);
  assert(s.timeLeftMs === TIME_LIMIT_MS, `타이머가 가득이 아님: ${s.timeLeftMs}`);
});

console.log('answer (결정적)');
test('정답을 고르면 feedback 단계 + correct, 하트 유지', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0])); // 답 left
  const after = answer(s, 'left');
  assert(after.phase === 'feedback', `phase가 feedback이 아님: ${after.phase}`);
  assert(after.lastResult === 'correct', `correct가 아님: ${after.lastResult}`);
  assert(after.hearts === MAX_HEARTS, `정답인데 하트가 줄었음: ${after.hearts}`);
});
test('오답을 고르면 feedback 단계 + wrong, 하트 1개 감소', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0])); // 답 left
  const after = answer(s, 'right');
  assert(after.phase === 'feedback', `phase가 feedback이 아님: ${after.phase}`);
  assert(after.lastResult === 'wrong', `wrong이 아님: ${after.lastResult}`);
  assert(after.hearts === MAX_HEARTS - 1, `하트가 1개 줄지 않음: ${after.hearts}`);
});
test('answer는 원래 상태를 바꾸지 않는다 (문제는 그대로)', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0]));
  const after = answer(s, 'left');
  assert(s.phase === 'question', '원본 상태가 바뀜');
  assert(s.hearts === MAX_HEARTS, '원본 하트가 바뀜');
  assert(after.problem === s.problem, 'feedback 단계에서 문제가 바뀌면 안 됨');
});
test('feedback 단계에서 answer를 부르면 에러', () => {
  const s = answer(createGame(fakeRng([0, 0, 0, 0, 0])), 'left');
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
  const s = createGame(fakeRng([0, 0, 0, 0, 0]));
  const after = tick(s, 1000);
  assert(after.phase === 'question', `phase가 바뀌면 안 됨: ${after.phase}`);
  assert(after.timeLeftMs === TIME_LIMIT_MS - 1000, `시간이 안 줄었음: ${after.timeLeftMs}`);
  assert(after.hearts === MAX_HEARTS, `하트가 줄면 안 됨: ${after.hearts}`);
});
test('시간이 다 되면 timeout으로 feedback 단계 + 하트 1개 감소', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0]));
  const after = tick(s, TIME_LIMIT_MS);
  assert(after.phase === 'feedback', `phase가 feedback이 아님: ${after.phase}`);
  assert(after.lastResult === 'timeout', `timeout이 아님: ${after.lastResult}`);
  assert(after.hearts === MAX_HEARTS - 1, `하트가 1개 줄지 않음: ${after.hearts}`);
  assert(after.timeLeftMs === 0, `남은 시간이 0이어야 함: ${after.timeLeftMs}`);
});
test('제한시간을 넘겨도 남은 시간은 음수가 되지 않는다', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0]));
  const after = tick(s, TIME_LIMIT_MS + 5000);
  assert(after.timeLeftMs === 0, `음수가 되면 안 됨: ${after.timeLeftMs}`);
});
test('feedback 단계에서 tick은 상태를 그대로 둔다 (늦게 울린 시계 무시)', () => {
  const s = answer(createGame(fakeRng([0, 0, 0, 0, 0])), 'left');
  const after = tick(s, 99999);
  assert(after === s, 'question 단계가 아니면 상태가 그대로여야 함');
});

console.log('next (결정적)');
test('next는 새 문제로 question 단계를 시작하고 하트·타이머를 이어간다', () => {
  const s = answer(createGame(fakeRng([0, 0, 0, 0, 0])), 'right'); // 오답 → 하트 2개
  const after = next(s, fakeRng([0, 0.9, 0.9, 0.9, 0.9]));
  assert(after.phase === 'question', `phase가 question이 아님: ${after.phase}`);
  assert(after.lastResult === null, `lastResult가 초기화 안 됨: ${after.lastResult}`);
  assert(after.problem !== s.problem, '새 문제가 아님');
  assert(after.hearts === MAX_HEARTS - 1, `하트가 유지 안 됨: ${after.hearts}`);
  assert(after.timeLeftMs === TIME_LIMIT_MS, `타이머가 리셋 안 됨: ${after.timeLeftMs}`);
});
test('question 단계에서 next를 부르면 에러', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0]));
  let threw = false;
  try {
    next(s);
  } catch {
    threw = true;
  }
  assert(threw, '에러가 나야 함');
});

console.log('gameover (결정적)');
test(`오답 ${MAX_HEARTS}번이면 gameover 단계`, () => {
  let s = createGame(fakeRng([0, 0, 0, 0, 0]));
  for (let i = 0; i < MAX_HEARTS; i++) {
    const wrong = s.problem.answer === 'left' ? 'right' : 'left';
    s = answer(s, wrong);
    if (i < MAX_HEARTS - 1) {
      assert(s.phase === 'feedback', `${i + 1}번째 오답: 아직 feedback이어야 함`);
      s = next(s, fakeRng([0, 0, 0, 0, 0]));
    }
  }
  assert(s.phase === 'gameover', `phase가 gameover가 아님: ${s.phase}`);
  assert(s.hearts === 0, `하트가 0이 아님: ${s.hearts}`);
  assert(s.lastResult === 'wrong', `마지막 결과가 wrong이어야 함: ${s.lastResult}`);
});
test('시간 초과로도 gameover가 된다', () => {
  let s = createGame(fakeRng([0, 0, 0, 0, 0]));
  for (let i = 0; i < MAX_HEARTS; i++) {
    s = tick(s, TIME_LIMIT_MS);
    if (i < MAX_HEARTS - 1) s = next(s, fakeRng([0, 0, 0, 0, 0]));
  }
  assert(s.phase === 'gameover', `phase가 gameover가 아님: ${s.phase}`);
  assert(s.lastResult === 'timeout', `마지막 결과가 timeout이어야 함: ${s.lastResult}`);
});
test('gameover 단계에서 answer·next를 부르면 에러', () => {
  let s = createGame(fakeRng([0, 0, 0, 0, 0]));
  for (let i = 0; i < MAX_HEARTS; i++) {
    s = answer(s, s.problem.answer === 'left' ? 'right' : 'left');
    if (i < MAX_HEARTS - 1) s = next(s, fakeRng([0, 0, 0, 0, 0]));
  }
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

console.log('점수·콤보 (결정적)');
test('처음 상태는 점수 0, 콤보 0', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0]));
  assert(s.score === 0, `점수가 0이 아님: ${s.score}`);
  assert(s.combo === 0, `콤보가 0이 아님: ${s.combo}`);
});
test('comboMultiplier 경계값: 3연속마다 +1, 최대 4배', () => {
  const cases = [[0, 1], [1, 1], [2, 1], [3, 2], [5, 2], [6, 3], [8, 3], [9, 4], [30, 4]];
  for (const [combo, mult] of cases) {
    assert(
      comboMultiplier(combo) === mult,
      `콤보 ${combo}의 배율이 ${mult}이 아님: ${comboMultiplier(combo)}`,
    );
  }
});
test('정답이면 콤보 +1, 기본 점수 획득', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0])); // 답 left
  const after = answer(s, 'left');
  assert(after.combo === 1, `콤보가 1이 아님: ${after.combo}`);
  assert(after.score === BASE_SCORE, `점수가 ${BASE_SCORE}이 아님: ${after.score}`);
  assert(after.lastGain === BASE_SCORE, `lastGain이 ${BASE_SCORE}이 아님: ${after.lastGain}`);
});
test('3연속 정답이면 세 번째부터 배율 2배 (10+10+20=40)', () => {
  let s = createGame(fakeRng([0, 0, 0, 0, 0]));
  for (let i = 0; i < COMBO_STEP; i++) {
    s = answer(s, s.problem.answer);
    if (i < COMBO_STEP - 1) s = next(s, fakeRng([0, 0, 0, 0, 0]));
  }
  assert(s.combo === 3, `콤보가 3이 아님: ${s.combo}`);
  assert(s.lastGain === BASE_SCORE * 2, `세 번째 획득이 2배가 아님: ${s.lastGain}`);
  assert(s.score === BASE_SCORE * 4, `누적 점수가 40이 아님: ${s.score}`);
});
test('오답이면 콤보만 0으로 리셋되고 점수는 유지된다', () => {
  let s = createGame(fakeRng([0, 0, 0, 0, 0]));
  s = answer(s, s.problem.answer); // 정답 → 10점, 콤보 1
  s = next(s, fakeRng([0, 0, 0, 0, 0]));
  const wrong = s.problem.answer === 'left' ? 'right' : 'left';
  s = answer(s, wrong);
  assert(s.combo === 0, `콤보가 리셋 안 됨: ${s.combo}`);
  assert(s.score === BASE_SCORE, `점수가 깎이면 안 됨: ${s.score}`);
  assert(s.lastGain === 0, `오답의 lastGain은 0이어야 함: ${s.lastGain}`);
});
test('시간 초과도 콤보를 리셋하고 점수는 유지한다', () => {
  let s = createGame(fakeRng([0, 0, 0, 0, 0]));
  s = answer(s, s.problem.answer);
  s = next(s, fakeRng([0, 0, 0, 0, 0]));
  s = tick(s, TIME_LIMIT_MS);
  assert(s.combo === 0, `콤보가 리셋 안 됨: ${s.combo}`);
  assert(s.score === BASE_SCORE, `점수가 깎이면 안 됨: ${s.score}`);
  assert(s.lastGain === 0, `시간 초과의 lastGain은 0이어야 함: ${s.lastGain}`);
});
test('next는 점수·콤보를 다음 문제로 이어간다', () => {
  let s = createGame(fakeRng([0, 0, 0, 0, 0]));
  s = answer(s, s.problem.answer);
  s = next(s, fakeRng([0, 0.9, 0.9, 0.9, 0.9]));
  assert(s.score === BASE_SCORE, `점수가 유지 안 됨: ${s.score}`);
  assert(s.combo === 1, `콤보가 유지 안 됨: ${s.combo}`);
});
test('gameover가 되어도 점수는 남아 있다 (최고점 표시용)', () => {
  let s = createGame(fakeRng([0, 0, 0, 0, 0]));
  s = answer(s, s.problem.answer); // 10점
  s = next(s, fakeRng([0, 0, 0, 0, 0]));
  for (let i = 0; i < MAX_HEARTS; i++) {
    const wrong = s.problem.answer === 'left' ? 'right' : 'left';
    s = answer(s, wrong);
    if (s.phase === 'feedback') s = next(s, fakeRng([0, 0, 0, 0, 0]));
  }
  assert(s.phase === 'gameover', `준비 실패: ${s.phase}`);
  assert(s.score === BASE_SCORE, `게임오버 후 점수가 사라짐: ${s.score}`);
});

console.log('사지선다 문제 (결정적)');
// [0.6, 0, ...] → 레벨 1 가중치(compare 0.5)에서 0.6은 arithmetic frac-add:
// 1/2 + 1/3, 정답 5/6이 0번 보기
const MC_SEQ = [0.6, 0, 0, 0, 0, 0, 0];
test('사지선다에서 정답 인덱스를 고르면 correct + 점수·콤보 증가', () => {
  const s = createGame(fakeRng(MC_SEQ));
  assert(s.problem.type === 'arithmetic', `준비 실패: ${s.problem.type}`);
  const after = answer(s, s.problem.answer);
  assert(after.lastResult === 'correct', `correct가 아님: ${after.lastResult}`);
  assert(after.score === BASE_SCORE, `점수가 ${BASE_SCORE}이 아님: ${after.score}`);
  assert(after.combo === 1, `콤보가 1이 아님: ${after.combo}`);
  assert(after.hearts === MAX_HEARTS, `정답인데 하트가 줄었음: ${after.hearts}`);
});
test('사지선다에서 오답 인덱스를 고르면 하트 감소 + 콤보 리셋, 점수 유지', () => {
  let s = createGame(fakeRng(MC_SEQ));
  s = answer(s, s.problem.answer); // 정답 → 10점, 콤보 1
  s = next(s, fakeRng(MC_SEQ));
  const wrongIndex = (s.problem.answer + 1) % 4;
  const after = answer(s, wrongIndex);
  assert(after.lastResult === 'wrong', `wrong이 아님: ${after.lastResult}`);
  assert(after.hearts === MAX_HEARTS - 1, `하트가 1개 줄지 않음: ${after.hearts}`);
  assert(after.combo === 0, `콤보가 리셋 안 됨: ${after.combo}`);
  assert(after.score === BASE_SCORE, `점수가 유지 안 됨: ${after.score}`);
});

console.log('레벨/제한시간 (결정적)');
test('levelForScore 경계값: 100점마다 레벨 +1', () => {
  const cases = [[0, 1], [99, 1], [100, 2], [199, 2], [200, 3], [1000, 11]];
  for (const [score, level] of cases) {
    assert(levelForScore(score) === level, `점수 ${score}의 레벨이 ${level}이 아님: ${levelForScore(score)}`);
  }
});
test('timeLimitForLevel: 레벨당 0.5초 감소, 하한 8초', () => {
  const cases = [[1, 12000], [2, 11500], [5, 10000], [9, 8000], [10, 8000], [99, 8000]];
  for (const [level, ms] of cases) {
    assert(timeLimitForLevel(level) === ms, `L${level} 제한시간이 ${ms}가 아님: ${timeLimitForLevel(level)}`);
  }
});
test('처음 상태는 레벨 1, 제한시간 10초', () => {
  const s = createGame(fakeRng([0, 0, 0, 0, 0]));
  assert(s.level === 1, `레벨이 1이 아님: ${s.level}`);
  assert(s.timeLimitMs === TIME_LIMIT_MS, `제한시간이 다름: ${s.timeLimitMs}`);
  assert(s.timeLeftMs === s.timeLimitMs, '타이머가 제한시간으로 시작하지 않음');
});
test('점수 100이면 다음 문제부터 레벨 2 + 제한시간 9.5초', () => {
  // 플레이로 100점을 만드는 대신 feedback 상태를 직접 구성한다 (next는 phase만 본다)
  const s = {
    phase: 'feedback', hearts: MAX_HEARTS, score: LEVEL_SCORE_STEP, combo: 3,
    problem: null, lastResult: 'correct', lastGain: 20, timeLeftMs: 0,
    level: 1, timeLimitMs: TIME_LIMIT_MS,
  };
  const after = next(s, fakeRng([0, 0, 0, 0, 0]));
  assert(after.level === 2, `레벨이 2가 아님: ${after.level}`);
  assert(after.timeLimitMs === TIME_LIMIT_MS - TIME_STEP_MS, `제한시간이 다름: ${after.timeLimitMs}`);
  assert(after.timeLeftMs === after.timeLimitMs, '타이머가 새 제한시간으로 리셋되지 않음');
  assert(after.score === LEVEL_SCORE_STEP, '점수가 유지되지 않음');
});

console.log('레벨/제한시간 (무작위 500회 속성 검사)');
test('점수가 커질수록 제한시간은 단조 감소하고 항상 [하한, 10초] 안이다', () => {
  let prevLimit = Infinity;
  for (let i = 0; i < 500; i++) {
    const score = i * 7; // 오름차순 점수 표본
    const limit = timeLimitForLevel(levelForScore(score));
    assert(limit >= TIME_MIN_MS && limit <= TIME_LIMIT_MS, `범위 밖: 점수 ${score} → ${limit}`);
    assert(limit <= prevLimit, `단조 감소 위반: 점수 ${score}에서 ${prevLimit} → ${limit}`);
    prevLimit = limit;
  }
});

console.log('점수·콤보 (무작위 500회 속성 검사)');
test('무작위 플레이에서 점수·콤보가 기대 계산과 항상 일치한다', () => {
  let s = createGame();
  let expScore = 0;
  let expCombo = 0;
  for (let i = 0; i < 500; i++) {
    if (Math.random() < 0.2) {
      while (s.phase === 'question') s = tick(s, 1000 + Math.floor(Math.random() * 4000));
      expCombo = 0;
    } else {
      const choice = s.problem.type === 'compare'
        ? (Math.random() < 0.5 ? 'left' : 'right')
        : Math.floor(Math.random() * 4);
      const correct = checkAnswer(s.problem, choice);
      s = answer(s, choice);
      if (correct) {
        expCombo += 1;
        expScore += BASE_SCORE * comboMultiplier(expCombo);
      } else {
        expCombo = 0;
      }
    }
    assert(s.combo === expCombo, `${i}번째: 콤보 불일치 (기대 ${expCombo}, 실제 ${s.combo})`);
    assert(s.score === expScore, `${i}번째: 점수 불일치 (기대 ${expScore}, 실제 ${s.score})`);
    assert(
      Number.isInteger(s.score) && s.score >= 0,
      `${i}번째: 점수가 0 이상 정수가 아님 (${s.score})`,
    );
    assert(
      s.lastGain <= BASE_SCORE * MAX_MULTIPLIER,
      `${i}번째: 획득 점수가 상한 초과 (${s.lastGain})`,
    );
    if (s.phase === 'gameover') {
      s = createGame();
      expScore = 0;
      expCombo = 0;
    } else {
      s = next(s);
    }
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
      const choice = s.problem.type === 'compare'
        ? (Math.random() < 0.5 ? 'left' : 'right')
        : Math.floor(Math.random() * 4);
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
