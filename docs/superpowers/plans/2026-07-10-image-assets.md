# 이미지 에셋 개편 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마스코트 토끼를 AI 생성 PNG(표정 4종 + 상황 컷 2장)로 교체하고 파스텔 배경 이미지를 적용한다.

**Architecture:** 표시 전용 변경. Task 1~2는 사용자 이미지 생성(컨트롤러가 프롬프트 제공·검수), Task 3~4는 코드 통합(index.html의 `#mascot`을 `<img>` 4장 겹침으로 교체 — `data-face` 전환 CSS/JS 무변경, 게임오버 컷은 `isNewBest` 분기 재사용, 배경은 그라데이션 폴백 유지). 스펙: `docs/superpowers/specs/2026-07-10-image-assets-design.md`

**Tech Stack:** 바닐라 HTML/CSS/JS, PNG 에셋 (assets/), AI 이미지 생성 도구(사용자 측)

## Global Constraints

- 외부 의존성 추가 금지, 순수 모듈(game-core.js, problems.js, format.js, leaderboard.js) 수정 금지
- 주석은 한국어
- 캐릭터 정체성 유지: 흰 토끼, 볼 통통, 반짝 단추 눈, 오른쪽 귀 밑 분홍 리본
- 이미지: 투명 배경 필수(배경 제거 후처리 없음), 표정 4종은 같은 구도(정면·같은 크기)
- `data-face` 값 4종(idle/happy/dizzy/worried)과 `.face face-*` 클래스, `#mascot`/`#gameover` id 유지 — game.js 표정 전환 코드 무변경
- 새 단위 테스트 없음 (표시 전용) — `npm test`(92개) 회귀 확인

---

### Task 1: 마스터 캐릭터 생성 (사용자와 함께)

**Files:**
- 없음 (산출물은 이미지 파일 1장 — 예: `D:\rabbit-master.png`)

**Interfaces:**
- Consumes: 없음
- Produces: 확정된 마스터 이미지 — Task 2의 모든 변형이 이 이미지를 레퍼런스로 생성됨

- [ ] **Step 1: 사용자에게 마스터 프롬프트 전달**

이미지 생성 도구(ChatGPT, 나노바나나 등 — **레퍼런스 이미지 기반 편집을 지원하는 도구**)에 아래 프롬프트로 생성 요청:

```
아주 귀여운 몽실몽실한 흰 아기 토끼 캐릭터 (어린이 수학 게임 마스코트).

A cute fluffy white baby rabbit mascot character for a kids' math game.
Chubby cheeks, big round glossy black button eyes with two sparkling
highlights, tiny pink nose, soft pink blush on the cheeks, long upright
ears with pale pink inner ears, a small pink ribbon bow at the base of
its right ear, plump pear-shaped body, tiny paws held together in front,
small feet. Soft 3D render style like a plush toy, pastel colors, gentle
lighting. Front facing, full body, centered composition.
Transparent background. 1024x1024.
```

- [ ] **Step 2: 검수 (마음에 들 때까지 이 단계에서만 반복)**

체크리스트 — 하나라도 어긋나면 프롬프트를 보정해 재생성:
1. 분홍 리본이 **오른쪽 귀 밑**에 있는가
2. 단추 눈에 반짝임이 있는가
3. 정면·전신·중앙 구도인가
4. **배경이 투명**한가 (체커보드/투명으로 보이는가 — 흰 배경이면 재생성)
5. 사용자가 "이 토끼다" 확정

---

### Task 2: 변형 6장 + 배경 생성 (사용자와 함께)

**Files:**
- Create: `assets/rabbit-idle.png` `assets/rabbit-happy.png` `assets/rabbit-dizzy.png` `assets/rabbit-worried.png` `assets/rabbit-cheer.png` `assets/rabbit-sad.png` `assets/background.png`

**Interfaces:**
- Consumes: Task 1의 마스터 이미지 (모든 변형 생성 시 **레퍼런스로 첨부**)
- Produces: `assets/` 폴더의 정규화된 파일 7개 — Task 3~4가 이 경로·이름을 그대로 사용

- [ ] **Step 1: 변형 프롬프트 전달 (마스터 이미지를 첨부하고 각각 생성)**

idle은 마스터 그대로 사용(별도 생성 불필요). 나머지는 마스터를 레퍼런스로:

- **happy** (정답): `Same character, same pose, framing and style. Now with a big bright open-mouth smile, joyful expression. Transparent background.`
- **dizzy** (오답): `Same character, same pose, framing and style. Dazed dizzy expression with swirly X-shaped eyes and a small open mouth, as if it got the answer wrong. Transparent background.`
- **worried** (초조): `Same character, same pose, framing and style. Anxious worried expression, raised inner eyebrows, a single sweat drop on its forehead. Transparent background.`
- **cheer** (신기록): `Same character, same style. Both arms raised high in a cheerful banzai pose, celebrating a new high score, big open smile. Full body, transparent background.`
- **sad** (게임오버): `Same character, same style. Ears drooping down, teary sad eyes, deflated slouching posture. Full body, transparent background.`
- **background** (배경, 레퍼런스 불필요): `Soft pastel sky background for a children's math game. Gentle fluffy clouds and tiny sparkling stars, vertical gradient from light blue at the top to soft cream at the bottom. Subtle and low-contrast so overlaid text stays readable. No characters, no text. Portrait orientation, 1024x1536.`

- [ ] **Step 2: 컷별 검수**

각 컷: 같은 캐릭터인가(리본·눈·체형), 투명 배경인가, 표정 4종(idle/happy/dizzy/worried)은 같은 구도인가. 탈락 컷만 재생성(마스터 유지). 배경: 저채도·저대비인가.

- [ ] **Step 3: assets/ 정규화·용량 확인·커밋**

사용자가 파일을 D:\ 등에 두면 `assets/` 폴더를 만들어 위 7개 이름으로 복사. 용량 확인(`ls -la assets/`) — 장당 1MB를 크게 넘으면 사용자에게 리사이즈 재요청(합계 수 MB 초과 방지).

```bash
git add assets/
git commit -m "feat: AI 생성 토끼 에셋 7종 추가 - 표정 4종 + 상황 컷 2종 + 배경"
```

---

### Task 3: 마스코트 표정 4종 통합

**Files:**
- Modify: `index.html` (`#mascot` 내부 SVG → `<img>` 4장)
- Modify: `style.css` (`#mascot` 겹침 배치, `#mascot svg` 규칙 교체)

**Interfaces:**
- Consumes: Task 2의 `assets/rabbit-{idle,happy,dizzy,worried}.png`
- Produces: `#mascot[data-face]` 전환 구조 유지 — game.js 무변경

- [ ] **Step 1: index.html — #mascot 교체**

`<div id="mascot" data-face="idle">` 블록 전체(내부 `<svg>...</svg>` 포함)를 다음으로 교체한다 (아래 `<div id="bubble">`은 그대로):

```html
      <!-- 리본 토끼 마스코트 — AI 생성 PNG 4장을 겹쳐 두고 data-face로 전환.
           img 태그는 display:none이어도 전부 로드되므로 전환 깜빡임이 없다 -->
      <div id="mascot" data-face="idle">
        <img class="face face-idle" src="assets/rabbit-idle.png" alt="">
        <img class="face face-happy" src="assets/rabbit-happy.png" alt="">
        <img class="face face-dizzy" src="assets/rabbit-dizzy.png" alt="">
        <img class="face face-worried" src="assets/rabbit-worried.png" alt="">
      </div>
```

- [ ] **Step 2: style.css — 겹침 배치로 교체**

기존 규칙:

```css
#mascot { width: 7rem; flex-shrink: 0; }
#mascot svg { display: block; width: 100%; }

/* 표정 4종은 SVG에 겹쳐 있고 data-face로 하나만 보인다 */
#mascot .face { display: none; }
#mascot[data-face="idle"] .face-idle,
#mascot[data-face="happy"] .face-happy,
#mascot[data-face="dizzy"] .face-dizzy,
#mascot[data-face="worried"] .face-worried { display: inline; }
```

다음으로 교체한다:

```css
#mascot { position: relative; width: 7rem; height: 7rem; flex-shrink: 0; }

/* 표정 4종 PNG를 같은 자리에 겹쳐 두고 data-face로 하나만 보인다 */
#mascot .face {
  display: none;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
#mascot[data-face="idle"] .face-idle,
#mascot[data-face="happy"] .face-happy,
#mascot[data-face="dizzy"] .face-dizzy,
#mascot[data-face="worried"] .face-worried { display: block; }
```

- [ ] **Step 3: 회귀 테스트**

Run: `npm test`
Expected: 92개 전부 통과, 실패 0

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: 마스코트를 AI 생성 PNG 4장 겹침으로 교체 - data-face 전환 유지"
```

---

### Task 4: 게임오버 컷 + 배경 통합

**Files:**
- Modify: `index.html` (게임오버 패널에 컷 img)
- Modify: `game.js` (isNewBest 분기로 src 지정)
- Modify: `style.css` (컷 크기, body 배경 이미지)

**Interfaces:**
- Consumes: Task 2의 `assets/rabbit-cheer.png`, `assets/rabbit-sad.png`, `assets/background.png`
- Produces: `#gameover-cut` — 이 태스크 안에서만 쓰임

- [ ] **Step 1: index.html — 게임오버 패널에 컷 추가**

`#gameover .panel` 안, `<p class="title">게임 오버</p>` **바로 앞**에 추가:

```html
      <img id="gameover-cut" alt="">
```

- [ ] **Step 2: game.js — 신기록/일반 분기로 src 지정**

DOM 참조 블록(`const gameoverEl = ...` 아래)에 추가:

```js
const gameoverCutEl = document.getElementById('gameover-cut');
```

`render()`의 게임오버 블록:

```js
  if (state.phase === 'gameover') {
    gameoverEl.classList.toggle('newbest', isNewBest);
```

다음으로 교체한다:

```js
  if (state.phase === 'gameover') {
    gameoverEl.classList.toggle('newbest', isNewBest);
    // 신기록이면 만세 컷, 아니면 시무룩 컷 (표시 전용 분기)
    gameoverCutEl.src = isNewBest ? 'assets/rabbit-cheer.png' : 'assets/rabbit-sad.png';
```

- [ ] **Step 3: style.css — 컷 크기 + 배경 이미지**

`#gameover .panel .title` 규칙 **앞**에 추가:

```css
#gameover-cut {
  display: block;
  width: 6rem;
  height: 6rem;
  object-fit: contain;
  margin: 0 auto 0.5rem;
}
```

`body`의 배경 선언:

```css
  background: linear-gradient(180deg, var(--sky) 0%, var(--cream) 100%) fixed;
```

다음으로 교체한다 (이미지 로드 전·실패 시 그라데이션이 그대로 보이는 폴백):

```css
  background:
    url('assets/background.png') center top / cover no-repeat fixed,
    linear-gradient(180deg, var(--sky) 0%, var(--cream) 100%) fixed;
```

- [ ] **Step 4: 회귀 테스트**

Run: `npm test`
Expected: 92개 전부 통과, 실패 0

- [ ] **Step 5: Commit**

```bash
git add index.html game.js style.css
git commit -m "feat: 게임오버 컷(신기록/일반) + 파스텔 배경 이미지 적용"
```

---

### Task 5: 최종 검증 + 문서 갱신 + 배포

**Files:**
- Modify: `CLAUDE.md` ("현재 상태"의 마스코트 항목 갱신)

**Interfaces:**
- Consumes: Task 1~4 전부
- Produces: 배포된 새 비주얼

- [ ] **Step 1: 브라우저 육안 확인 (사용자와 함께)**

로컬 서버(http://localhost:8000)에서:
1. 새 토끼 PNG가 보이고 표정 4종이 깜빡임 없이 전환되는가
2. 점프·흔들림 연출이 자연스러운가 (PNG여도 `#mascot` div 애니메이션은 동일)
3. 게임오버: 일반이면 시무룩 컷, 신기록이면 만세 컷
4. 배경 이미지가 깔리고 글자 가독성이 유지되는가, 모바일 폭(DevTools 375px)에서 크롭이 어색하지 않은가

- [ ] **Step 2: CLAUDE.md 갱신**

"현재 상태"의 마스코트 항목:

```markdown
- 마스코트 v8 리디자인 + 당근 목숨 완료(2026-07-08) — 토끼 SVG 좌표는
  사용자 확정값이라 임의 재설계 금지. 목숨은 `#carrot-icon` symbol +
  `renderHearts`의 `createElementNS` 방식. 스펙:
  `docs/superpowers/specs/2026-07-08-mascot-carrot-redesign-design.md`
```

다음으로 교체한다:

```markdown
- 마스코트는 AI 생성 PNG(assets/rabbit-*.png) — 표정 4종은 `data-face`로
  전환(img 4장 겹침), 게임오버 컷 2장은 `isNewBest` 분기. 스펙:
  `docs/superpowers/specs/2026-07-10-image-assets-design.md`. 당근 목숨은
  `#carrot-icon` SVG symbol + `renderHearts`의 `createElementNS` 방식 유지
```

- [ ] **Step 3: 최종 테스트 + Commit + 사용자 확인 후 푸시**

Run: `npm test` — Expected: 92개 통과

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md 현재 상태 갱신 - AI 생성 마스코트 에셋"
# 사용자 확인 후:
git push origin master
```
