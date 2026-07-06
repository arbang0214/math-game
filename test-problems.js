// problems.js 단위 테스트 — 실행: node test-problems.js
import {
  gcd,
  compareValues,
  makeFraction,
  makeDecimal,
  makeComparisonProblem,
  checkAnswer,
} from './problems.js';

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

console.log('gcd');
test('gcd(6, 8) = 2', () => assert(gcd(6, 8) === 2, `got ${gcd(6, 8)}`));
test('gcd(3, 4) = 1 (서로소)', () => assert(gcd(3, 4) === 1, `got ${gcd(3, 4)}`));
test('gcd(10, 5) = 5 (배수 관계)', () => assert(gcd(10, 5) === 5, `got ${gcd(10, 5)}`));

console.log('compareValues');
test('3/4 > 0.7', () => {
  assert(compareValues(makeFraction(3, 4), makeDecimal(7)) === 1, '3/4가 커야 함');
});
test('1/3 < 0.4', () => {
  assert(compareValues(makeFraction(1, 3), makeDecimal(4)) === -1, '0.4가 커야 함');
});
test('1/2 = 0.5', () => {
  assert(compareValues(makeFraction(1, 2), makeDecimal(5)) === 0, '같아야 함');
});

console.log('makeComparisonProblem (결정적)');
test('rng가 전부 0이면 1/2 vs 0.3, 답은 왼쪽 분수', () => {
  const p = makeComparisonProblem(fakeRng([0, 0, 0, 0]));
  assert(p.left.kind === 'fraction', `왼쪽이 분수가 아님: ${p.left.kind}`);
  assert(p.left.text === '1/2', `왼쪽이 1/2가 아님: ${p.left.text}`);
  assert(p.right.text === '0.3', `오른쪽이 0.3이 아님: ${p.right.text}`);
  assert(p.answer === 'left', `답이 left가 아님: ${p.answer}`);
});
test('분수 자리 배치 rng가 0.9면 분수가 오른쪽', () => {
  const p = makeComparisonProblem(fakeRng([0, 0, 0, 0.9]));
  assert(p.right.kind === 'fraction', `오른쪽이 분수가 아님: ${p.right.kind}`);
  assert(p.left.kind === 'decimal', `왼쪽이 소수가 아님: ${p.left.kind}`);
});

console.log('makeComparisonProblem (무작위 500회 속성 검사)');
test('두 값이 절대 같지 않다', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeComparisonProblem();
    assert(compareValues(p.left, p.right) !== 0, `같은 값이 나옴: ${p.left.text} vs ${p.right.text}`);
  }
});
test('answer는 항상 실제로 큰 쪽을 가리킨다', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeComparisonProblem();
    const bigger = compareValues(p.left, p.right) > 0 ? 'left' : 'right';
    assert(p.answer === bigger, `${p.left.text} vs ${p.right.text}: answer=${p.answer}, 실제=${bigger}`);
  }
});
test('항상 분수 하나 + 소수 하나', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeComparisonProblem();
    const kinds = [p.left.kind, p.right.kind].sort().join(',');
    assert(kinds === 'decimal,fraction', `구성이 이상함: ${kinds}`);
  }
});
test('분수는 진분수, 소수는 0.1~0.9, 차이는 0.25 이하', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeComparisonProblem();
    const f = p.left.kind === 'fraction' ? p.left : p.right;
    const d = p.left.kind === 'decimal' ? p.left : p.right;
    assert(f.num >= 1 && f.num < f.den, `진분수가 아님: ${f.text}`);
    assert(d.tenths >= 1 && d.tenths <= 9, `소수 범위 밖: ${d.text}`);
    const diff = Math.abs(f.num / f.den - d.tenths / 10);
    assert(diff <= 0.25 + 1e-9, `차이가 너무 큼(${diff.toFixed(2)}): ${f.text} vs ${d.text}`);
  }
});

console.log('checkAnswer');
test('정답 선택이면 true, 반대면 false', () => {
  const p = makeComparisonProblem(fakeRng([0, 0, 0, 0])); // 1/2 vs 0.3, 답 left
  assert(checkAnswer(p, 'left') === true, '정답인데 false');
  assert(checkAnswer(p, 'right') === false, '오답인데 true');
});

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail > 0 ? 1 : 0);
