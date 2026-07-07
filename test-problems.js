// problems.js 단위 테스트 — 실행: node test-problems.js
import {
  gcd,
  compareValues,
  makeFraction,
  makeDecimal,
  makeComparisonProblem,
  makeArithmeticProblem,
  makeEquivalentProblem,
  makeProblem,
  checkAnswer,
  answerText,
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

// ---------- 빌드 5단계: 사지선다 (docs/specs/problem-types.md) ----------

// "a/b" 또는 "0.x" 표기를 유리수 {n, d}로 파싱한다 (독립 재계산용)
function parseValue(text) {
  if (text.includes('/')) {
    const [n, d] = text.split('/').map(Number);
    return { n, d };
  }
  return { n: Math.round(Number(text) * 10), d: 10 };
}

// 값 객체 → 유리수 {n, d}
function toRat(v) {
  return v.kind === 'fraction' ? { n: v.num, d: v.den } : { n: v.tenths, d: 10 };
}

// 교차곱 동치 판정 (부동소수점 없음)
function sameRat(a, b) {
  return a.n * b.d === b.n * a.d;
}

// 보기 4개의 값·표기가 전부 서로 다른지 검사
function assertChoicesDistinct(p) {
  assert(p.choices.length === 4, `보기가 4개가 아님: ${p.choices.length}`);
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      assert(
        !sameRat(toRat(p.choices[i]), toRat(p.choices[j])),
        `보기 값 중복: ${p.choices[i].text} = ${p.choices[j].text} (${p.question})`,
      );
      assert(
        p.choices[i].text !== p.choices[j].text,
        `보기 표기 중복: ${p.choices[i].text} (${p.question})`,
      );
    }
  }
}

console.log('makeArithmeticProblem (결정적)');
test('rng 전부 0이면 1/2 + 1/3, 정답 5/6이 0번 보기', () => {
  const p = makeArithmeticProblem(fakeRng([0, 0, 0, 0, 0, 0]));
  assert(p.type === 'arithmetic' && p.variant === 'frac-add', `변형이 다름: ${p.variant}`);
  assert(p.question === '1/2 + 1/3', `산식이 다름: ${p.question}`);
  assert(p.answer === 0, `정답 위치가 0이 아님: ${p.answer}`);
  const texts = p.choices.map((c) => c.text).join(',');
  assert(texts === '5/6,2/5,6/6,4/6', `보기가 다름: ${texts}`);
});
test('분수 뺄셈: 1/2 − 1/3, 정답 1/6', () => {
  const p = makeArithmeticProblem(fakeRng([0.25, 0, 0, 0, 0, 0]));
  assert(p.variant === 'frac-sub', `변형이 다름: ${p.variant}`);
  assert(p.question === '1/2 − 1/3', `산식이 다름: ${p.question}`);
  const texts = p.choices.map((c) => c.text).join(',');
  assert(texts === '1/6,2/6,3/6,4/6', `보기가 다름: ${texts}`);
  assert(p.answer === 0, `정답 위치가 0이 아님: ${p.answer}`);
});
test('소수 덧셈: 0.1 + 0.1, 정답 0.2', () => {
  const p = makeArithmeticProblem(fakeRng([0.5, 0, 0, 0]));
  assert(p.variant === 'dec-add', `변형이 다름: ${p.variant}`);
  assert(p.question === '0.1 + 0.1', `산식이 다름: ${p.question}`);
  const texts = p.choices.map((c) => c.text).join(',');
  assert(texts === '0.2,0.3,0.1,0.4', `보기가 다름: ${texts}`);
});
test('소수 뺄셈: 0.2 − 0.1, 정답 0.1 (tenths 0 이하 오답은 걸러짐)', () => {
  const p = makeArithmeticProblem(fakeRng([0.75, 0, 0, 0]));
  assert(p.variant === 'dec-sub', `변형이 다름: ${p.variant}`);
  assert(p.question === '0.2 − 0.1', `산식이 다름: ${p.question}`);
  const texts = p.choices.map((c) => c.text).join(',');
  assert(texts === '0.1,0.2,0.3,0.4', `보기가 다름: ${texts}`);
});
test('마지막 rng가 0.9면 정답이 3번 보기로 간다', () => {
  const p = makeArithmeticProblem(fakeRng([0, 0, 0, 0, 0, 0.9]));
  assert(p.answer === 3, `정답 위치가 3이 아님: ${p.answer}`);
  const texts = p.choices.map((c) => c.text).join(',');
  assert(texts === '2/5,6/6,4/6,5/6', `보기가 다름: ${texts}`);
});

console.log('makeArithmeticProblem (무작위 500회 속성 검사)');
test('정답 보기가 독립 재계산한 값과 일치하고, 뺄셈 결과는 항상 양수', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeArithmeticProblem();
    const isSub = p.question.includes('−');
    const [l, r] = p.question.split(isSub ? ' − ' : ' + ').map(parseValue);
    const expected = {
      n: isSub ? l.n * r.d - r.n * l.d : l.n * r.d + r.n * l.d,
      d: l.d * r.d,
    };
    assert(expected.n > 0, `결과가 양수가 아님: ${p.question}`);
    assert(
      sameRat(expected, toRat(p.choices[p.answer])),
      `정답 불일치: ${p.question} → ${p.choices[p.answer].text}`,
    );
  }
});
test('분수 변형은 기약 진분수 정답, 소수 변형은 모든 보기 tenths ≥ 1', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeArithmeticProblem();
    const ans = p.choices[p.answer];
    if (p.variant.startsWith('frac')) {
      assert(ans.kind === 'fraction', `정답이 분수가 아님: ${ans.text}`);
      assert(gcd(ans.num, ans.den) === 1, `정답이 기약이 아님: ${ans.text}`);
      assert(ans.num >= 1 && ans.num < ans.den, `정답이 진분수가 아님: ${ans.text}`);
    } else {
      for (const c of p.choices) {
        assert(c.kind === 'decimal' && c.tenths >= 1, `보기 범위 밖: ${c.text}`);
      }
    }
  }
});
test('보기 4개의 값·표기가 전부 서로 다르다', () => {
  for (let i = 0; i < 500; i++) assertChoicesDistinct(makeArithmeticProblem());
});
test('정답 위치가 500회 동안 0~3 전부 등장한다 (위치 편향 없음)', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(makeArithmeticProblem().answer);
  assert(seen.size === 4, `등장한 위치: ${[...seen].sort().join(',')}`);
});

console.log('makeEquivalentProblem (결정적)');
test('약분: 6/9 → 정답 2/3, 오답은 같은 수 빼기·분자/분모 실수', () => {
  const p = makeEquivalentProblem(fakeRng([0, 0.25, 0.34, 0]));
  assert(p.type === 'equivalent' && p.variant === 'simplify', `변형이 다름: ${p.variant}`);
  assert(p.question === '6/9', `문제 분수가 다름: ${p.question}`);
  assert(p.answer === 0, `정답 위치가 0이 아님: ${p.answer}`);
  const texts = p.choices.map((c) => c.text).join(',');
  assert(texts === '2/3,5/8,3/3,2/4', `보기가 다름: ${texts}`);
});
test('통분(동치 찾기): 1/2 → 정답 2/4', () => {
  const p = makeEquivalentProblem(fakeRng([0.5, 0, 0, 0]));
  assert(p.variant === 'expand', `변형이 다름: ${p.variant}`);
  assert(p.question === '1/2', `기준 분수가 다름: ${p.question}`);
  const texts = p.choices.map((c) => c.text).join(',');
  assert(texts === '2/4,2/3,3/4,2/5', `보기가 다름: ${texts}`);
});

console.log('makeEquivalentProblem (무작위 500회 속성 검사)');
test('정답만 기준 분수와 동치이고 오답 3개는 동치가 아니다 (정답이 둘 방지)', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeEquivalentProblem();
    const base = parseValue(p.question);
    p.choices.forEach((c, idx) => {
      const eq = sameRat(base, toRat(c));
      if (idx === p.answer) assert(eq, `정답이 동치가 아님: ${p.question} vs ${c.text}`);
      else assert(!eq, `오답이 기준과 동치임: ${p.question} vs ${c.text}`);
    });
  }
});
test('simplify는 기약분수가 정답이고 문제의 분수는 기약이 아니다', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeEquivalentProblem();
    if (p.variant !== 'simplify') continue;
    const ans = p.choices[p.answer];
    const base = parseValue(p.question);
    assert(gcd(ans.num, ans.den) === 1, `정답이 기약이 아님: ${ans.text}`);
    assert(gcd(base.n, base.d) >= 2, `문제 분수가 이미 기약임: ${p.question}`);
  }
});
test('보기 값·표기 중복 없음, 분자·분모 전부 1 이상', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeEquivalentProblem();
    assertChoicesDistinct(p);
    for (const c of p.choices) {
      assert(c.num >= 1 && c.den >= 1, `분자·분모 범위 밖: ${c.text}`);
    }
  }
});

console.log('makeProblem (결정적)');
test('첫 rng로 유형을 고른다: 0→compare, 0.34→arithmetic, 0.67→equivalent', () => {
  const c = makeProblem(fakeRng([0, 0, 0, 0, 0]));
  assert(c.type === 'compare' && c.left.text === '1/2', `compare가 아님: ${c.type}`);
  const a = makeProblem(fakeRng([0.34, 0, 0, 0, 0, 0, 0]));
  assert(a.type === 'arithmetic' && a.question === '1/2 + 1/3', `arithmetic이 아님: ${a.type}`);
  const e = makeProblem(fakeRng([0.67, 0, 0, 0, 0]));
  assert(e.type === 'equivalent' && e.question === '2/4', `equivalent가 아님: ${e.type}`);
});

console.log('makeProblem (무작위 500회 속성 검사)');
test('세 유형이 전부 등장하고, 유형별 스키마가 맞는다', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const p = makeProblem();
    seen.add(p.type);
    if (p.type === 'compare') {
      assert(
        p.left && p.right && (p.answer === 'left' || p.answer === 'right'),
        `compare 스키마 깨짐: ${JSON.stringify(p)}`,
      );
    } else {
      assert(
        p.choices.length === 4 && Number.isInteger(p.answer) && p.answer >= 0 && p.answer <= 3,
        `사지선다 스키마 깨짐: ${JSON.stringify(p)}`,
      );
      assert(typeof p.question === 'string' && p.question.length > 0, 'question이 비었음');
    }
  }
  assert(seen.size === 3, `등장한 유형: ${[...seen].join(',')}`);
});

console.log('checkAnswer / answerText (사지선다)');
test('사지선다: 정답 인덱스면 true, 다른 인덱스면 false', () => {
  const p = makeArithmeticProblem(fakeRng([0, 0, 0, 0, 0, 0])); // 정답 5/6이 0번
  assert(checkAnswer(p, 0) === true, '정답인데 false');
  assert(checkAnswer(p, 1) === false, '오답인데 true');
  assert(checkAnswer(p, '0') === false, '문자열 인덱스는 오답이어야 함 (=== 비교)');
});
test('answerText: compare와 사지선다 양쪽에서 정답 표기를 돌려준다', () => {
  const c = makeComparisonProblem(fakeRng([0, 0, 0, 0])); // 1/2 vs 0.3, 답 left
  assert(answerText(c) === '1/2', `compare 정답 표기 다름: ${answerText(c)}`);
  const a = makeArithmeticProblem(fakeRng([0, 0, 0, 0, 0, 0]));
  assert(answerText(a) === '5/6', `사지선다 정답 표기 다름: ${answerText(a)}`);
});

console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail > 0 ? 1 : 0);
