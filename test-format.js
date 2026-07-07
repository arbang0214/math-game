// format.js 단위 테스트 — 실행: node test-format.js
import { fractionSegments } from './format.js';
import { makeProblem, answerText } from './problems.js';

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

// 세그먼트 배열 비교 — 구조가 단순하므로 JSON 직렬화로 충분
function assertSegments(actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  assert(a === e, `기대 ${e}, 실제 ${a}`);
}

console.log('fractionSegments (결정적)');
test('"3/5"는 분수 세그먼트 하나', () => {
  assertSegments(fractionSegments('3/5'), [{ type: 'fraction', num: 3, den: 5 }]);
});
test('"0.7"은 텍스트 그대로', () => {
  assertSegments(fractionSegments('0.7'), [{ type: 'text', text: '0.7' }]);
});
test('"3/5 + 1/5"는 분수·텍스트·분수', () => {
  assertSegments(fractionSegments('3/5 + 1/5'), [
    { type: 'fraction', num: 3, den: 5 },
    { type: 'text', text: ' + ' },
    { type: 'fraction', num: 1, den: 5 },
  ]);
});
test('"정답은 3/4"는 텍스트 + 분수', () => {
  assertSegments(fractionSegments('정답은 3/4'), [
    { type: 'text', text: '정답은 ' },
    { type: 'fraction', num: 3, den: 4 },
  ]);
});
test('"12/15"처럼 두 자리 숫자도 분수 하나로', () => {
  assertSegments(fractionSegments('12/15'), [{ type: 'fraction', num: 12, den: 15 }]);
});
test('빈 문자열은 빈 배열', () => {
  assertSegments(fractionSegments(''), []);
});

console.log('fractionSegments (무작위 속성)');
test('무작위 문제 500개의 모든 표시 문자열: 세그먼트를 도로 이으면 원문과 같다', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeProblem();
    const texts = [p.prompt, answerText(p)];
    if (p.question) texts.push(p.question);
    if (p.type === 'compare') texts.push(p.left.text, p.right.text);
    else texts.push(...p.choices.map((c) => c.text));
    for (const t of texts) {
      const joined = fractionSegments(t)
        .map((s) => (s.type === 'text' ? s.text : `${s.num}/${s.den}`))
        .join('');
      assert(joined === t, `"${t}" 재조합 결과가 "${joined}"`);
    }
  }
});

test('무작위 문제 500개: 분수 보기는 자기 분자·분모 그대로, 소수 보기는 텍스트 세그먼트 하나', () => {
  for (let i = 0; i < 500; i++) {
    const p = makeProblem();
    const values = p.type === 'compare' ? [p.left, p.right] : p.choices;
    for (const v of values) {
      const segs = fractionSegments(v.text);
      if (v.kind === 'fraction') {
        assertSegments(segs, [{ type: 'fraction', num: v.num, den: v.den }]);
      } else {
        assertSegments(segs, [{ type: 'text', text: v.text }]);
      }
    }
  }
});

console.log(`\nformat: ${pass}개 통과, ${fail}개 실패`);
if (fail > 0) process.exit(1);
