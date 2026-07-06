// 문제 생성기 — 분수/소수 크기 비교 (빌드 1단계)
// DOM·네트워크 없음. 브라우저와 Node 양쪽에서 동작하는 순수 로직.

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

// 분수·소수를 공통 유리수 {n, d}로 바꿔 정수 연산만으로 비교한다 (부동소수점 오차 없음)
function toRational(value) {
  if (value.kind === 'fraction') return { n: value.num, d: value.den };
  if (value.kind === 'decimal') return { n: value.tenths, d: 10 };
  throw new Error(`알 수 없는 값 종류: ${value.kind}`);
}

// a < b → -1, a === b → 0, a > b → 1
export function compareValues(a, b) {
  const ra = toRational(a);
  const rb = toRational(b);
  const left = ra.n * rb.d;
  const right = rb.n * ra.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function makeFraction(num, den) {
  return { kind: 'fraction', num, den, text: `${num}/${den}` };
}

// tenths: 소수 첫째 자리까지의 값을 10배한 정수 (0.7 → 7)
export function makeDecimal(tenths) {
  return { kind: 'decimal', tenths, text: (tenths / 10).toString() };
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

const DENOMINATORS = [2, 3, 4, 5, 6, 8];

// 크기 비교 문제: 분수 vs 소수, 값이 같은 경우는 내지 않는다.
// 두 값의 차이가 0.25 이하가 되도록 골라 눈대중으로 못 맞히게 한다.
export function makeComparisonProblem(rng = Math.random) {
  const den = pick(rng, DENOMINATORS);
  const num = randInt(rng, 1, den - 1);
  const fraction = makeFraction(num, den);

  const candidates = [];
  for (let tenths = 1; tenths <= 9; tenths++) {
    const isEqual = num * 10 === tenths * den;
    const isClose = Math.abs(num / den - tenths / 10) <= 0.25 + 1e-9;
    if (!isEqual && isClose) candidates.push(tenths);
  }
  const decimal = makeDecimal(pick(rng, candidates));

  const fractionOnLeft = rng() < 0.5;
  const left = fractionOnLeft ? fraction : decimal;
  const right = fractionOnLeft ? decimal : fraction;
  const answer = compareValues(left, right) > 0 ? 'left' : 'right';

  return { type: 'compare', prompt: '더 큰 쪽을 고르세요', left, right, answer };
}

// choice: 'left' | 'right'
export function checkAnswer(problem, choice) {
  return choice === problem.answer;
}
