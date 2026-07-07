// 문제 생성기 — 크기 비교(이지선다), 연산·약분/통분(사지선다) (빌드 5단계)
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

// choice: compare는 'left'|'right', 사지선다는 보기 인덱스 0~3
// (answer 필드가 같은 형이라 두 형태 모두 === 비교 하나로 처리된다)
export function checkAnswer(problem, choice) {
  return choice === problem.answer;
}

// 정답 보기의 표기 — UI가 문제 유형별로 분기하지 않게 하는 헬퍼
export function answerText(problem) {
  if (problem.type === 'compare') return problem[problem.answer].text;
  return problem.choices[problem.answer].text;
}

// ---------- 사지선다 공통 도우미 ----------

// 분자·분모가 1 이상일 때만 유효한 오답 후보로 인정한다
function fractionCandidate(num, den) {
  return num >= 1 && den >= 1 ? makeFraction(num, den) : null;
}

function decimalCandidate(tenths) {
  return tenths >= 1 ? makeDecimal(tenths) : null;
}

// 정답 1개 + 오답 후보 목록으로 사지선다 보기를 만든다.
// 후보를 순서대로 검사해 (값·표기가 정답 및 서로 간에 중복 없음) 3개를 채택하고,
// 모자라면 fallback(m)이 돌려주는 후보(m = 0, 1, 2, ...)를 이어서 검사한다.
// rng 호출: ① 정답 위치(0~3) — 오답 선별에는 rng를 쓰지 않는다.
function buildChoices(rng, answerValue, candidates, fallback) {
  const wrongs = [];
  const taken = (v) =>
    [answerValue, ...wrongs].some((w) => compareValues(w, v) === 0 || w.text === v.text);
  for (let i = 0; wrongs.length < 3; i++) {
    const cand = i < candidates.length ? candidates[i] : fallback(i - candidates.length);
    if (cand !== null && !taken(cand)) wrongs.push(cand);
  }
  const answer = randInt(rng, 0, 3);
  const choices = [];
  let w = 0;
  for (let i = 0; i < 4; i++) choices.push(i === answer ? answerValue : wrongs[w++]);
  return { choices, answer };
}

// ---------- arithmetic: 분수/소수 덧셈·뺄셈 (사지선다) ----------

const ARITHMETIC_VARIANTS = ['frac-add', 'frac-sub', 'dec-add', 'dec-sub'];

// 연산 문제. rng 호출 순서: ① 변형 → 이후는 변형별 생성기 주석 참조
export function makeArithmeticProblem(rng = Math.random) {
  const variant = pick(rng, ARITHMETIC_VARIANTS);
  return variant.startsWith('frac')
    ? makeFractionArithmetic(rng, variant)
    : makeDecimalArithmetic(rng, variant);
}

// 분모가 다른 진분수끼리의 덧셈/뺄셈. 결과는 항상 0 < 값 < 1의 기약분수.
// rng 호출 순서: ① 분모 b ② 분모 d ③ 분자 a ④ 분자 c ⑤ 정답 위치
function makeFractionArithmetic(rng, variant) {
  const isAdd = variant === 'frac-add';
  const b = pick(rng, DENOMINATORS);
  const d = pick(rng, DENOMINATORS.filter((x) => x !== b));

  // 결과가 진분수(덧셈)/양수(뺄셈)가 되도록 유효한 분자만 열거해서 뽑는다 (재추출 없음)
  const aCands = [];
  for (let a = 1; a < b; a++) {
    if (isAdd ? a * d < b * (d - 1) : a * d > b) aCands.push(a);
  }
  const a = pick(rng, aCands);
  const cCands = [];
  for (let c = 1; c < d; c++) {
    if (isAdd ? c * b < d * (b - a) : c * b < a * d) cCands.push(c);
  }
  const c = pick(rng, cCands);

  const num = isAdd ? a * d + c * b : a * d - c * b;
  const den = b * d;
  const g = gcd(num, den);
  const answerValue = makeFraction(num / g, den / g);
  const { num: p, den: q } = answerValue;

  const { choices, answer } = buildChoices(
    rng,
    answerValue,
    [
      // 분모끼리도 연산해 버리는 흔한 실수
      fractionCandidate(isAdd ? a + c : a - c, isAdd ? b + d : b - d),
      // 통분 후 분자 계산 실수
      fractionCandidate(p + 1, q),
      fractionCandidate(p - 1, q),
    ],
    (m) => fractionCandidate(p + 2 + m, q),
  );
  return {
    type: 'arithmetic',
    variant,
    prompt: '계산 결과를 고르세요',
    question: `${a}/${b} ${isAdd ? '+' : '−'} ${c}/${d}`,
    choices,
    answer,
  };
}

// 소수 첫째 자리끼리의 덧셈/뺄셈 — 전부 tenths 정수 연산 (부동소수점 없음).
// rng 호출 순서: ① x ② y ③ 정답 위치
function makeDecimalArithmetic(rng, variant) {
  const isAdd = variant === 'dec-add';
  const x = randInt(rng, isAdd ? 1 : 2, 9); // 뺄셈은 y 후보가 있도록 x ≥ 2
  const yCands = [];
  for (let y = 1; y <= 9; y++) {
    if (isAdd || y < x) yCands.push(y);
  }
  const y = pick(rng, yCands);
  const s = isAdd ? x + y : x - y;
  const answerValue = makeDecimal(s);

  const { choices, answer } = buildChoices(
    rng,
    answerValue,
    [1, -1, 2, -2, 3, -3].map((t) => decimalCandidate(s + t)),
    (m) => decimalCandidate(s + 4 + m),
  );
  return {
    type: 'arithmetic',
    variant,
    prompt: '계산 결과를 고르세요',
    question: `${makeDecimal(x).text} ${isAdd ? '+' : '−'} ${makeDecimal(y).text}`,
    choices,
    answer,
  };
}

// ---------- equivalent: 약분/통분 (사지선다) ----------

const EQUIVALENT_VARIANTS = ['simplify', 'expand'];
const EQUIVALENT_MULTIPLIERS = [2, 3, 4];

// 재료가 되는 기약분수 후보: d ∈ {2,3,4,5}, 1 ≤ n < d, gcd(n,d) = 1
const BASE_FRACTIONS = [];
for (const d of [2, 3, 4, 5]) {
  for (let n = 1; n < d; n++) {
    if (gcd(n, d) === 1) BASE_FRACTIONS.push([n, d]);
  }
}

// 약분(기약분수 만들기)/통분(동치 분수 찾기) 문제.
// rng 호출 순서: ① 변형 ② 기약분수 n/d ③ 배수 k ④ 정답 위치
export function makeEquivalentProblem(rng = Math.random) {
  const variant = pick(rng, EQUIVALENT_VARIANTS);
  const [n, d] = pick(rng, BASE_FRACTIONS);
  const k = pick(rng, EQUIVALENT_MULTIPLIERS);

  // 오답은 모두 기준 분수와 값이 달라야 한다 ("정답이 둘"이 되면 안 됨) —
  // buildChoices가 정답값과 같은 후보를 걸러 이를 보장한다.
  if (variant === 'simplify') {
    const answerValue = makeFraction(n, d);
    const { choices, answer } = buildChoices(
      rng,
      answerValue,
      [
        fractionCandidate(n * k - 1, d * k - 1), // 분자·분모에서 같은 수를 빼는 실수
        fractionCandidate(n + 1, d),
        fractionCandidate(n, d + 1),
      ],
      (m) => fractionCandidate(n + 2 + m, d),
    );
    return {
      type: 'equivalent',
      variant,
      prompt: '기약분수로 나타내세요',
      question: `${n * k}/${d * k}`,
      choices,
      answer,
    };
  }

  // expand: 정답은 일부러 약분하지 않은 nk/dk
  const answerValue = makeFraction(n * k, d * k);
  const { choices, answer } = buildChoices(
    rng,
    answerValue,
    [
      fractionCandidate(n + 1, d + 1), // 분자·분모에 같은 수를 더하는 실수
      fractionCandidate(n * k + 1, d * k),
      fractionCandidate(n * k, d * k + 1),
    ],
    (m) => fractionCandidate(n * k + 2 + m, d * k),
  );
  return {
    type: 'equivalent',
    variant,
    prompt: '크기가 같은 분수를 고르세요',
    question: `${n}/${d}`,
    choices,
    answer,
  };
}

// ---------- 최상위 진입점 ----------

const PROBLEM_TYPES = ['compare', 'arithmetic', 'equivalent'];

// 매 문제의 유형을 고른다. rng 호출 순서: ① 유형(균등 1/3) → 이후 각 생성기에 위임
export function makeProblem(rng = Math.random) {
  const type = pick(rng, PROBLEM_TYPES);
  if (type === 'compare') return makeComparisonProblem(rng);
  if (type === 'arithmetic') return makeArithmeticProblem(rng);
  return makeEquivalentProblem(rng);
}
