# 마스코트 토끼 리디자인 + 당근 목숨 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 비주얼 컴패니언에서 확정한 v8 토끼(볼 통통 소프트 + 단추 눈 + 표정 4종)로 마스코트를 교체하고, 목숨 하트를 당근 아이콘으로 바꾼다.

**Architecture:** 표시 전용 변경. index.html(마스코트 SVG 통째 교체 + 당근 symbol), style.css(하트→당근 규칙), game.js(renderHearts 내부만 당근 SVG 생성으로 교체). `data-face` 전환·연출 클래스·게임 규칙은 무변경. 스펙: `docs/superpowers/specs/2026-07-08-mascot-carrot-redesign-design.md`

**Tech Stack:** 바닐라 HTML/CSS/JS (ES Modules), 빌드 도구 없음

## Global Constraints

- 외부 의존성 추가 금지 (테스트 프레임워크 포함)
- 순수 모듈(game-core.js, problems.js, format.js) 수정 금지 — 표시 전용 변경만
- 주석·에러 메시지는 한국어
- 순수 로직 변경이 없으므로 새 단위 테스트 없음 — `npm test`(기존 76개) 회귀 확인으로 검증
- **SVG 좌표는 아래 코드 블록의 값을 그대로 옮긴다(재설계 금지)** — 사용자가 v1~v8 반복으로 확정한 값
- `.face face-idle/happy/dizzy/worried` 클래스명, `data-face` 값, 요소 id(`#mascot`, `#hearts`)는 유지 — game.js/style.css의 전환 코드가 그대로 동작해야 함

---

### Task 1: 마스코트 토끼 SVG 교체 (v8)

**Files:**
- Modify: `index.html:19-77` (`#mascot` 내부 `<svg>` 통째 교체)

**Interfaces:**
- Consumes: 없음
- Produces: `#mascot[data-face]` + `.face-*` 구조 유지 (game.js `mascotEl.dataset.face` 코드 무변경으로 동작). viewBox가 `0 0 100 112` → `0 0 140 152`로 바뀌지만 종횡비가 비슷해 CSS `#mascot { width: 7rem }`은 그대로 둔다.

- [ ] **Step 1: index.html — #mascot 교체**

`index.html`의 `<div id="mascot" data-face="idle">` 블록 전체(내부 `<svg>...</svg>` 포함)를 다음으로 교체한다:

```html
      <!-- 리본 토끼 마스코트 v2 — 표정 4종(.face-*)을 겹쳐 두고 data-face로 전환.
           지오메트리는 2026-07-08 리디자인 스펙에서 사용자가 확정한 값 -->
      <div id="mascot" data-face="idle">
        <svg viewBox="0 0 140 152" aria-hidden="true">
          <defs>
            <!-- 단추 눈(반짝임 2겹) — idle/happy/worried 공용 -->
            <g id="eyes-button">
              <circle cx="56" cy="78" r="5.2" fill="#3a3a3a"/>
              <circle cx="84" cy="78" r="5.2" fill="#3a3a3a"/>
              <circle cx="57.9" cy="76.1" r="1.8" fill="#ffffff"/>
              <circle cx="85.9" cy="76.1" r="1.8" fill="#ffffff"/>
              <circle cx="54.5" cy="80.4" r="0.8" fill="#ffffff"/>
              <circle cx="82.5" cy="80.4" r="0.8" fill="#ffffff"/>
            </g>
          </defs>
          <!-- 귀: 머리 위에 나란히, 속귀 연분홍 -->
          <ellipse cx="59" cy="27" rx="10" ry="26" fill="#ffffff" transform="rotate(-5 59 27)"/>
          <ellipse cx="81" cy="27" rx="10" ry="26" fill="#ffffff" transform="rotate(5 81 27)"/>
          <ellipse cx="59" cy="31" rx="5" ry="17" fill="#ffd9e3" transform="rotate(-5 59 27)"/>
          <ellipse cx="81" cy="31" rx="5" ry="17" fill="#ffd9e3" transform="rotate(5 81 27)"/>
          <!-- 몸통(서양배형) + 발 + 배 위에 모은 앞발(연한 음영) -->
          <ellipse cx="70" cy="126" rx="27" ry="23" fill="#ffffff"/>
          <ellipse cx="56" cy="143" rx="9" ry="5" fill="#ffffff"/>
          <ellipse cx="84" cy="143" rx="9" ry="5" fill="#ffffff"/>
          <ellipse cx="62" cy="117" rx="6.5" ry="5.5" fill="#f3ecf2" transform="rotate(15 62 117)"/>
          <ellipse cx="78" cy="117" rx="6.5" ry="5.5" fill="#f3ecf2" transform="rotate(-15 78 117)"/>
          <!-- 머리: 타원 + 볼 원 2개 + 턱 타원의 합집합으로 볼 통통 실루엣 -->
          <ellipse cx="70" cy="74" rx="33" ry="31" fill="#ffffff"/>
          <circle cx="48" cy="93" r="12" fill="#ffffff"/>
          <circle cx="92" cy="93" r="12" fill="#ffffff"/>
          <ellipse cx="70" cy="96" rx="28" ry="15" fill="#ffffff"/>
          <!-- 핑크 리본 (오른쪽 귀 밑) -->
          <g transform="rotate(14 94 46)">
            <path d="M94 46 L83 40 Q80 46 83 52 Z" fill="#ff6b9d"/>
            <path d="M94 46 L105 40 Q108 46 105 52 Z" fill="#ff6b9d"/>
            <circle cx="94" cy="46" r="4" fill="#ff4f8b"/>
          </g>
          <!-- 코와 볼터치는 모든 표정 공통 -->
          <ellipse cx="70" cy="87" rx="2.4" ry="1.9" fill="#ff9fb2"/>
          <ellipse cx="45" cy="92" rx="7.5" ry="4.8" fill="#ffc9d6" opacity="0.9"/>
          <ellipse cx="95" cy="92" rx="7.5" ry="4.8" fill="#ffc9d6" opacity="0.9"/>
          <!-- 표정: 기본 (단추 눈 + ω 입) -->
          <g class="face face-idle">
            <use href="#eyes-button"/>
            <path d="M64 92 Q67 95 70 92 Q73 95 76 92" stroke="#4a4a4a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          </g>
          <!-- 표정: 정답 (단추 눈 그대로 + 조그맣게 벌린 빨간 입) -->
          <g class="face face-happy">
            <use href="#eyes-button"/>
            <path d="M63 90 Q70 93 77 90 Q75.5 97.5 70 98 Q64.5 97.5 63 90 Z" fill="#e85550"/>
          </g>
          <!-- 표정: 오답/시간초과 (X자 눈 + 벌어진 입) -->
          <g class="face face-dizzy">
            <path d="M52 74 L60 82 M60 74 L52 82" stroke="#3a3a3a" stroke-width="2.8" stroke-linecap="round"/>
            <path d="M80 74 L88 82 M88 74 L80 82" stroke="#3a3a3a" stroke-width="2.8" stroke-linecap="round"/>
            <ellipse cx="70" cy="95" rx="3.4" ry="4.2" fill="#3a3a3a"/>
          </g>
          <!-- 표정: 초조 (처진 눈썹 + 단추 눈 + 물결 입 + 땀방울) -->
          <g class="face face-worried">
            <path d="M49 70 Q55 65.5 61 67.5" stroke="#3a3a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <path d="M79 67.5 Q85 65.5 91 70" stroke="#3a3a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <use href="#eyes-button"/>
            <path d="M63 92.5 Q66.5 90.5 70 92.5 Q73.5 94.5 77 92.5" stroke="#3a3a3a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <path d="M103 60 Q107 66 103 69 Q99 66 103 60" fill="#9ad8ff"/>
          </g>
        </svg>
      </div>
```

주의: 교체 범위는 `#mascot` div 하나다. 바로 아래의 `<div id="bubble">`은 건드리지 않는다. style.css의 `.face` 표시 규칙(`#mascot[data-face="..."] .face-...`)은 4종 모두 이미 존재하므로 CSS 수정은 없다.

- [ ] **Step 2: 회귀 테스트**

Run: `npm test`
Expected: 기존 테스트 전부 통과 (76개 — 36+32+8), 실패 0

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: 마스코트 토끼 v2 - 볼 통통 소프트 + 단추 눈 + 표정 4종 리디자인"
```

---

### Task 2: 당근 목숨 (하트 → 당근 아이콘)

**Files:**
- Modify: `index.html` (`<main id="game">` 바로 앞에 당근 symbol 정의 추가)
- Modify: `style.css` (`#hearts` 블록과 `.heart`/`.heart.off` 규칙 교체)
- Modify: `game.js` (`renderHearts` 내부를 당근 SVG 생성으로 교체)

**Interfaces:**
- Consumes: 없음 (Task 1과 독립 — 마스코트와 무관)
- Produces: `<symbol id="carrot-icon" viewBox="0 0 24 26">`(index.html), `.carrot`/`.carrot.off` 클래스(style.css), `renderHearts(hearts)` 시그니처·캐시(`renderedHearts`)·`#hearts`의 `role="img"`+`aria-label` 동작은 기존 그대로 유지

- [ ] **Step 1: index.html — 당근 symbol 추가**

`<body>` 바로 다음, `<main id="game">` 앞에 추가한다:

```html
  <!-- 당근 목숨 아이콘 — game.js renderHearts가 <use>로 참조한다 -->
  <svg style="display:none" aria-hidden="true">
    <symbol id="carrot-icon" viewBox="0 0 24 26">
      <g transform="rotate(8 12 13)">
        <path d="M10.5 7 Q7 3.5 4.5 4.5 Q7.5 6.5 9.5 8 Z" fill="#3fbf6f"/>
        <path d="M12 6.5 Q11.5 2 9 1 Q10 5 11 7.5 Z" fill="#4ade80"/>
        <path d="M13.5 7 Q16.5 3 19 4 Q16 6.5 14.5 8 Z" fill="#3fbf6f"/>
        <path d="M12 7 Q16.5 7 15.5 13.5 Q14.5 21 12 24.5 Q9.5 21 8.5 13.5 Q7.5 7 12 7 Z" fill="#ff8c42"/>
        <path d="M9.8 12 L13.6 11.4 M10.4 16 L13.2 15.5" stroke="#e0702a" stroke-width="1.1" stroke-linecap="round" fill="none"/>
      </g>
    </symbol>
  </svg>
```

`<span id="hearts" role="img"></span>`은 그대로 둔다 (id·role 유지).

- [ ] **Step 2: style.css — 하트 규칙을 당근 규칙으로 교체**

`#hearts` 블록과 `.heart` 규칙:

```css
#hearts {
  font-size: 1.6rem;
  letter-spacing: 2px;
  margin-right: auto; /* 레벨·점수 칩을 오른쪽으로 민다 */
}
/* 하트 글리프는 U+FE0E로 텍스트 렌더링을 강제해 CSS 색을 입힌다 (game.js) */
.heart { color: var(--red); text-shadow: 0 2px 0 rgba(0, 0, 0, 0.18); }
.heart.off { color: #d4d4d4; text-shadow: none; }
```

다음으로 교체한다:

```css
#hearts {
  display: inline-flex;
  gap: 3px;
  margin-right: auto; /* 레벨·점수 칩을 오른쪽으로 민다 */
}
/* 당근 목숨 아이콘 (#carrot-icon 참조는 game.js) — 잃은 목숨은 회색으로 바랜다 */
.carrot { width: 1.6rem; height: 1.75rem; }
.carrot.off { filter: grayscale(1); opacity: 0.4; }
```

- [ ] **Step 3: game.js — renderHearts를 당근 생성으로 교체**

기존 `renderHearts` 블록:

```js
// 하트 HUD — render는 매 프레임 불리므로 목숨 수가 바뀔 때만 다시 그린다
let renderedHearts = null;
function renderHearts(hearts) {
  if (hearts === renderedHearts) return;
  renderedHearts = hearts;
  heartsEl.setAttribute('aria-label', `목숨 ${hearts}개`);
  heartsEl.textContent = '';
  for (let i = 0; i < MAX_HEARTS; i++) {
    const h = document.createElement('span');
    h.className = i < hearts ? 'heart' : 'heart off';
    h.textContent = '♥︎'; // ♥ + 텍스트 프레젠테이션 강제(이모지 방지)
    heartsEl.append(h);
  }
}
```

다음으로 교체한다:

```js
// 당근 목숨 HUD — render는 매 프레임 불리므로 목숨 수가 바뀔 때만 다시 그린다.
// SVG 요소는 createElement가 아니라 createElementNS로 만들어야 그려진다.
const SVG_NS = 'http://www.w3.org/2000/svg';
let renderedHearts = null;
function renderHearts(hearts) {
  if (hearts === renderedHearts) return;
  renderedHearts = hearts;
  heartsEl.setAttribute('aria-label', `목숨 ${hearts}개`);
  heartsEl.textContent = '';
  for (let i = 0; i < MAX_HEARTS; i++) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', i < hearts ? 'carrot' : 'carrot off');
    svg.setAttribute('viewBox', '0 0 24 26');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#carrot-icon');
    svg.append(use);
    heartsEl.append(svg);
  }
}
```

- [ ] **Step 4: 회귀 테스트**

Run: `npm test`
Expected: 기존 테스트 전부 통과 (76개), 실패 0

- [ ] **Step 5: Commit**

```bash
git add index.html style.css game.js
git commit -m "feat: 목숨 표시를 하트에서 당근 아이콘으로 교체"
```

---

### Task 3: 마무리 — 육안 확인 + 배포

**Files:**
- 없음 (빌드 단계 항목이 아니므로 README 갱신 불필요)

**Interfaces:**
- Consumes: Task 1~2의 커밋
- Produces: origin/master 푸시 → GitHub Pages 자동 반영

- [ ] **Step 1: 전체 테스트 최종 확인**

Run: `npm test`
Expected: 76개 전부 통과

- [ ] **Step 2: 브라우저 육안 확인 (사용자와 함께)**

로컬 서버(http://localhost:8000)에서:
1. 새 토끼가 표시되고 표정 4종이 상황에 맞게 전환되는가 (기본 ω 입 / 정답 빨간 입 미소 / 오답 X눈 / 초조 눈썹+땀방울)
2. 기존 연출(jump·wobble·nervous·urgent 흔들림)이 새 SVG에서도 자연스러운가
3. 목숨이 당근 3개로 보이고, 잃으면 회색으로 바래고, 재시작 시 복원되는가
4. DevTools에서 `#hearts`의 `aria-label`이 목숨 수와 일치하는가

- [ ] **Step 3: 사용자 확인 후 푸시**

푸시하면 https://arbang0214.github.io/math-game/ 에 곧 반영되므로, **푸시 전에 사용자에게 확인**한다. 미푸시 상태인 분수 aria-label 커밋(93ae87e)도 함께 올라간다. 승인 시:

```bash
git push origin master
```
