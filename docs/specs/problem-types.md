# 빌드 5단계 스펙 — 문제 유형 확장 (연산 사지선다, 약분/통분)

작성일: 2026-07-06. 구현 전 설계 문서.
기존 `compare`(크기 비교, 이지선다)에 두 유형을 추가한다:

| type | 내용 | 입력 방식 |
|---|---|---|
| `compare` (기존) | 분수 vs 소수 크기 비교 | 이지선다 (왼쪽/오른쪽) |
| `arithmetic` (신규) | 분수/소수 덧셈·뺄셈 | 사지선다 |
| `equivalent` (신규) | 약분(기약분수 만들기) / 통분(동치 분수 찾기) | 사지선다 |

범위 밖: 레벨별 시간 단축·난이도 곡선(6단계), 리더보드(8단계), 대분수 표기(아래 "결과 범위 제약"으로 회피).

---

## 1. 문제 생성 규칙

### 1.0 공통 원칙

- 모든 생성 함수는 `rng = Math.random`을 마지막 파라미터로 받는다 (컨벤션 2).
  fakeRng 테스트를 위해 **rng 호출 순서를 함수 주석에 명시**한다.
- 값 비교·동치 판정은 전부 유리수 `{n, d}` 교차곱 정수 연산으로 한다 (컨벤션 3).
  기존 `compareValues`를 재사용한다.
- 조건을 만족하는 값을 "재추출"하지 않는다. 기존 `makeComparisonProblem`처럼
  **유효 후보를 먼저 열거한 뒤 rng로 하나 고르는** 방식을 쓴다
  (fakeRng 수열 길이가 입력에 따라 달라지지 않게).
- 사지선다의 오답 3개는 rng 없이 **결정적 후보 풀**에서 필터로 뽑는다.
  rng는 정답 보기의 위치(0~3)를 정하는 데만 쓴다. 오답은 후보 풀 순서대로
  나머지 칸을 채운다.

### 1.1 최상위 진입점: `makeProblem(rng)`

- 첫 rng 호출로 유형을 균등 선택: `compare` / `arithmetic` / `equivalent` 각 1/3.
- 이후 해당 유형의 생성기에 위임한다.
- `game-core.js`의 `newQuestion`은 `makeComparisonProblem` 대신 이 함수를 호출한다.
- `makeComparisonProblem`은 그대로 export 유지 (기존 테스트 회귀 방지).

### 1.2 `arithmetic` — 연산 (사지선다)

변형(variant) 4가지, rng로 균등 선택:

#### (a) 분수 덧셈 `frac-add` / 분수 뺄셈 `frac-sub`

- 분모: 기존 `DENOMINATORS = [2, 3, 4, 5, 6, 8]`에서 서로 **다른** 두 개
  b, d를 뽑는다 (통분이 반드시 필요하도록).
- 분자: a, c 모두 "후보 열거 → rng 선택" 방식. 재추출 없음:
  - 덧셈: a는 `a/b < 1 − 1/d`인 것만 후보로 열거, c는 `a/b + c/d < 1`인 것만
    (진분수 결과 — 대분수 표기 회피), c ≥ 1
  - 뺄셈: a는 `a/b > 1/d`인 것만 후보로 열거, c는 `a/b − c/d > 0`인 것만
    (음수·0 금지), c ≥ 1
- 정답: 통분 후 계산한 뒤 `gcd`로 **기약분수**로 만든 값.
- 문제 표시: `question = "a/b + c/d"` (뺄셈은 `−`).

**오답 후보 풀** (순서대로 검사, 조건 통과한 것 3개 채택):

1. 분모끼리도 연산하는 실수: 덧셈 `(a+c)/(b+d)`, 뺄셈 `(a−c)/(b−d)`
   — 분자·분모가 1 이상일 때만 후보로 인정
2. 분자 계산 실수: 정답이 p/q(기약)일 때 `(p+1)/q`
3. 분자 계산 실수: `(p−1)/q` (분자 ≥ 1일 때만)
4. fallback: `(p+2)/q`, `(p+3)/q`, … (앞이 탈락한 만큼)

채택 조건(필터): 분자·분모 모두 1 이상, **값이 정답 및 이미 채택된 오답과
다름**(`compareValues !== 0`), 표기(`text`)도 중복 없음.

#### (b) 소수 덧셈 `dec-add` / 소수 뺄셈 `dec-sub`

- 피연산자: tenths 정수 x, y ∈ 1..9 (즉 0.1~0.9).
  - 덧셈: 제약 없음 (합 최대 1.8 — `makeDecimal(18)` → `"1.8"`로 표기 가능)
  - 뺄셈: x > y가 되도록 y 후보를 열거해서 뽑는다 (차 ≥ 0.1)
- 정답: `makeDecimal(x ± y)` — 전부 tenths 정수 연산, 부동소수점 없음.
- 문제 표시: `question = "0.x + 0.y"`.

**오답 후보 풀**: 정답 tenths를 s라 할 때 `s+1, s−1, s+2, s−2, s+3, s−3` 순.
채택 조건: tenths ≥ 1, 값·표기 중복 없음. (s ≥ 2이므로 항상 3개 확보 가능)

### 1.3 `equivalent` — 약분/통분 (사지선다)

변형 2가지, rng로 균등 선택. 공통 재료: **기약분수** n/d
(d ∈ {2, 3, 4, 5}, 1 ≤ n < d, gcd(n, d) = 1 — 후보 열거 후 rng 선택),
배수 k ∈ {2, 3, 4}.

#### (a) 약분 `simplify` — "기약분수로 나타내면?"

- 문제 표시: `question = "nk/dk"` (예: k=3, n/d=2/3이면 `"6/9"`),
  prompt는 "기약분수로 나타내세요".
- 정답: `n/d`.

**오답 후보 풀** (순서대로):

1. 같은 수를 빼는 실수: `(nk−1)/(dk−1)`
2. 분자만 실수: `(n+1)/d`
3. 분모만 실수: `n/(d+1)`
4. fallback: `(n+2)/d`, `(n+3)/d`, …

채택 조건: 분자·분모 1 이상, **값이 정답(= 문제에 표시된 값)과 다름**,
값·표기가 서로 중복 없음.
주의: `n(k′)/d(k′)` 형태(덜 약분된 동치 분수)는 값이 정답과 같으므로
오답으로 **금지** — 인덱스 채점이라 논리적으로는 가능하지만 "정답이 둘"로
보여 게임이 억울해진다.

#### (b) 통분/동치 찾기 `expand` — "크기가 같은 분수는?"

- 문제 표시: `question = "n/d"`, prompt는 "크기가 같은 분수를 고르세요".
- 정답: `nk/dk`.

**오답 후보 풀** (순서대로):

1. 같은 수를 더하는 실수: `(n+1)/(d+1)`
2. 분자만 곱한 실수: `(nk+1)/(dk)` — (nk/d는 가분수가 될 수 있어 대신 ±1 사용)
3. `(nk)/(dk+1)`
4. fallback: `(n+2)/(d+2)`, `(nk+2)/(dk)`, …

채택 조건: 분자·분모 1 이상, **n/d와 동치가 아님**(교차곱), 값·표기 중복 없음.

---

## 2. 데이터 구조 — compare와의 공존

### 2.1 문제 객체

기존 `compare`는 **변경하지 않는다** (기존 테스트·UI 회귀 방지):

```js
// 이지선다 (기존 그대로)
{ type: 'compare', prompt, left, right, answer: 'left' | 'right' }
```

신규 사지선다는 공통 형태 하나를 쓴다:

```js
{
  type: 'arithmetic' | 'equivalent',
  variant: 'frac-add' | 'frac-sub' | 'dec-add' | 'dec-sub'   // arithmetic
         | 'simplify' | 'expand',                             // equivalent
  prompt: '계산 결과를 고르세요' 등,      // 상단 안내문
  question: '2/3 + 1/6' 등,              // 화면 중앙에 크게 표시할 산식/분수
  choices: [v0, v1, v2, v3],             // makeFraction/makeDecimal 값 객체 (text 포함)
  answer: 0 | 1 | 2 | 3,                 // 정답 보기 인덱스
}
```

핵심: **`answer`가 compare에서는 `'left'|'right'`, 사지선다에서는 인덱스**라서
기존 `checkAnswer(problem, choice) { return choice === problem.answer }`가
**수정 없이 두 형태 모두 처리한다.** `game-core.js`의 `answer(state, choice)`도
choice를 그대로 통과시키므로 로직 변경이 없다.

### 2.2 problems.js 추가 export

- `makeProblem(rng)` — §1.1
- `makeArithmeticProblem(rng)`, `makeEquivalentProblem(rng)` — 개별 테스트용
- `answerText(problem)` — 정답 표기 헬퍼. UI가 유형별로 분기하지 않도록:

```js
export function answerText(problem) {
  if (problem.type === 'compare') return problem[problem.answer].text;
  return problem.choices[problem.answer].text;
}
```

### 2.3 game-core.js 변경점

- import를 `makeComparisonProblem` → `makeProblem`으로 교체 (`newQuestion` 한 곳).
- 상태 머신, 점수/콤보, 타이머 규칙은 **변경 없음**. 제한시간은 유형과 무관하게
  `TIME_LIMIT_MS`(10초) 고정 유지 (CLAUDE.md — 레벨별 조정은 6단계).

---

## 3. UI 변경점 (index.html / game.js)

### 3.1 레이아웃

- `#prompt` 아래에 `#question` 요소 추가: 사지선다의 산식/분수를 크게 표시.
  compare에서는 빈 문자열(숨김).
- `#choices`는 문제 유형에 따라 두 모드로 렌더링:
  - **이지선다(compare)**: 기존 그대로 — 버튼 2개 + 가운데 `vs`.
  - **사지선다**: 버튼 4개를 2×2 그리드로. `vs`는 숨김.
    글자 수가 길어지므로(`13/24` 등) 사지선다 버튼은 폰트를 한 단계 줄인다
    (예: 2.5rem → 1.8rem).

```
❤❤❤        점수: 12          ❤❤❤        점수: 12
██████░░░░                     ██████░░░░
 더 큰 쪽을 고르세요            계산 결과를 고르세요
                                    2/3 + 1/6
  [ 3/4 ]  vs  [ 0.7 ]         [ 5/6 ]   [ 3/9 ]
                               [ 4/6 ]   [ 7/6 ]
```

### 3.2 game.js

- 고정 `#left`/`#right` 버튼 참조 대신, 매 문제마다 `#choices` 안의 버튼을
  다시 그린다 (또는 버튼 4개를 미리 두고 2개/4개를 토글 — 구현 시 선택).
- 클릭 핸들러는 `#choices` 컨테이너에 위임 한 곳: 버튼의 `dataset.choice`
  (`'left'`/`'right'` 또는 `'0'`~`'3'`)를 읽어 `answer(state, choice)`에 넘긴다.
  사지선다는 `Number()`로 변환해서 넘긴다 (`answer`는 `===` 비교).
- 피드백의 정답 표시는 `state.problem[state.problem.answer].text` 직접 접근을
  `answerText(state.problem)`으로 교체 (유형 분기 제거).
- 최고점/타이머/하트 렌더링은 변경 없음.

---

## 4. 테스트 계획

컨벤션 4에 따라 각 생성기에 (a) fakeRng 결정적 테스트 + (b) 무작위 500회
속성 검사를 함께 작성한다. 속성 검증의 값 비교는 전부 `compareValues`
(정수 교차곱)로 한다.

### 4.1 test-problems.js 추가

**makeArithmeticProblem — 결정적 (fakeRng)**
- 정해진 수열로 특정 문제(예: `1/2 + 1/3` → 정답 `5/6`)가 나오는지: question
  문자열, choices 4개 표기, answer 인덱스까지 고정 검증. 변형 4가지 각 1개 이상.

**makeArithmeticProblem — 속성 (500회)**
- 정답 보기의 값이 테스트가 **독립적으로 재계산**한 값과 일치
  (분수: `(a·d ± c·b) / (b·d)`를 교차곱으로 비교, 소수: tenths 정수 합/차)
- 분수 변형: 정답이 기약분수(`gcd(num, den) === 1`), 값이 0 < v < 1
- 소수 변형: 모든 보기 tenths ≥ 1
- 보기 4개의 값이 전부 서로 다름 + 표기도 전부 서로 다름
- 뺄셈 결과가 항상 양수
- answer 인덱스가 500회 동안 0~3 전부 등장 (위치 편향 방지)

**makeEquivalentProblem — 결정적 (fakeRng)**
- simplify: 예) `6/9` 표시 → 정답 `2/3`, 오답 3개 표기까지 고정 검증
- expand: 예) `2/3` 표시 → 정답 `6/9` 검증

**makeEquivalentProblem — 속성 (500회)**
- 정답 보기가 기준 분수와 동치 (교차곱 = 0)
- 오답 3개는 기준 분수와 동치가 **아님** — "정답이 둘" 방지의 핵심 검사
- simplify: 정답이 기약분수, 문제에 표시된 분수는 기약이 아님(k ≥ 2)
- 보기 4개 값·표기 중복 없음, 분자·분모 전부 ≥ 1

**makeProblem — 속성 (500회)**
- 세 type(`compare`/`arithmetic`/`equivalent`)이 전부 등장
- type별 스키마 검증: compare는 `left/right/answer('left'|'right')`,
  사지선다는 `choices.length === 4`이고 `answer`가 0~3 정수

**checkAnswer / answerText**
- 사지선다에서 정답 인덱스 → true, 다른 인덱스 → false
- `answerText`가 compare/사지선다 양쪽에서 올바른 표기를 돌려줌

### 4.2 test-game-core.js 추가

- fakeRng로 사지선다 문제가 나오는 게임을 만들고:
  - 정답 인덱스로 `answer(state, k)` → correct, 점수 +BASE_SCORE×배율, 콤보 +1
  - 오답 인덱스 → 하트 −1, 콤보 리셋, 점수 유지
- compare 문제 기반 기존 테스트가 그대로 통과 (회귀 없음) — fakeRng 수열은
  `makeProblem`의 유형 선택 호출이 추가된 만큼 앞에 값을 하나 덧붙여 보정

### 4.3 수동 확인 (브라우저)

- 이지선다 ↔ 사지선다 전환 시 레이아웃 깨짐 없음 (vs 표시/숨김, 그리드)
- 사지선다에서 시간 초과 시 피드백에 정답 표기가 올바르게 나옴

---

## 5. 미결사항 (이번 단계에서는 기본값으로 진행)

- **사지선다 제한시간**: 연산 문제가 비교보다 오래 걸리지만, 이번 단계에서는
  10초 고정 유지. 유형별/레벨별 시간은 6단계에서 함께 설계.
- **유형별 배점 차등**: 없음 — 전 유형 `BASE_SCORE` 동일. 난이도 곡선(6단계)에서 재검토.
- **유형 혼합 비율**: 균등 1/3 고정. 레벨에 따른 비율 변화도 6단계 소관.
