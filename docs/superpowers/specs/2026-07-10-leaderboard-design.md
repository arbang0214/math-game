# 전체 리더보드 설계 (빌드 8단계, 2026-07-10)

게임오버 화면에서 닉네임을 등록하고 전체 TOP 10을 보는 기능.
백엔드는 Supabase 무료 플랜(서버 코드 0줄), 점수 위조 방어는 DB 제약 수준,
개인정보는 닉네임만 수집한다.

## 결정 사항 (브레인스토밍 확정)

- 기능 범위: **TOP 10 + 닉네임 등록** (내 순위·주간 리셋은 범위 밖)
- 백엔드: **Supabase** (무료 플랜, anon key는 공개 전제 — RLS가 방어선)
- 조작 방지: **DB 제약 + 규칙 검증** — insert만 허용, CHECK로 형식·상한 검증.
  개발자 도구로 그럴듯한 위조는 가능함을 인정하는 현실적 타협
- 무료 플랜의 7일 무활동 일시정지 대응: **GitHub Actions 깨우기 cron** (주 2회)

## 아키텍처

```
[게임 (GitHub Pages)] --fetch--> [Supabase PostgREST] --> [scores 테이블]
[GitHub Actions cron (주 2회)] --curl GET--> (DB 활동 유지용 조회)
```

## Supabase 스키마 + 보안 (SQL 에디터에 1회 실행)

```sql
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  -- 닉네임: 한글/영문/숫자 1~8자 (서버측 최종 검증)
  nickname text not null check (nickname ~ '^[가-힣a-zA-Z0-9]{1,8}$'),
  -- 점수: 게임 규칙상 항상 10의 배수 (BASE_SCORE 10 × 배율) — 규칙 위반 점수는 거부
  score integer not null check (score >= 0 and score <= 100000 and score % 10 = 0),
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

-- 익명 사용자는 등록과 조회만 가능. 수정/삭제 정책은 만들지 않는다(= 차단).
create policy "anon_insert_scores" on public.scores
  for insert to anon with check (true);
create policy "anon_select_scores" on public.scores
  for select to anon using (true);
```

저장 데이터는 닉네임·점수·시각뿐 — IP, 기기정보 등 개인정보 저장 없음.

## REST 호출 (SDK 없이 fetch)

- 등록: `POST {url}/rest/v1/scores`
  - 헤더: `apikey: {anonKey}`, `Authorization: Bearer {anonKey}`,
    `Content-Type: application/json`, `Prefer: return=minimal`
  - 바디: `{"nickname":"...","score":123}`
- TOP 10: `GET {url}/rest/v1/scores?select=nickname,score&order=score.desc,created_at.asc&limit=10`
  - 헤더: `apikey`, `Authorization` 동일
  - 동점은 먼저 등록한 쪽이 위. 순위는 응답 배열 인덱스 + 1 (동점 공동 순위 없음)

## 프론트 구조 (로직/DOM 분리)

- **`leaderboard.js` (신규, 순수 로직)** — DOM·네트워크 없음, `node test-leaderboard.js` 가능:
  - `validateNickname(raw)` → `{ok: true, nickname}` | `{ok: false, reason}` —
    trim 후 `^[가-힣a-zA-Z0-9]{1,8}$` (DB CHECK와 동일 규칙, 상수로 공유)
  - `isConfigured(config)` → url·anonKey 둘 다 비어있지 않으면 true
  - `buildSubmitRequest(config, {nickname, score})` → `{url, options}` (fetch 인자)
  - `buildTopRequest(config, limit = 10)` → `{url, options}`
  - `parseTopResponse(json)` → `[{rank, nickname, score}]` — 배열인지·필드 형식
    검증, 형식이 어긋난 항목은 버림. rank는 인덱스+1
- **`leaderboard-config.js` (신규)** — `{ url: '', anonKey: '' }` 상수.
  **비어 있으면 리더보드 UI 전체 숨김** — Supabase 설정 전/포크 저장소에서도
  게임은 그대로 동작
- **`game.js`** — fetch 실행 + 게임오버 패널 렌더만 추가 (규칙 없음)
- **`index.html` / `style.css`** — 게임오버 패널에 리더보드 마크업·스타일

## 게임오버 UI 흐름

1. 게임오버 진입 시(설정된 경우만): "불러오는 중..." → TOP 10 목록 렌더.
   실패 시 "순위를 불러오지 못했어요" 한 줄, 게임 진행엔 영향 없음
2. 닉네임 입력(input, maxlength 8) + "등록" 버튼.
   마지막 닉네임은 localStorage `math-game.nickname`으로 기억
3. 등록 성공 → TOP 10 다시 조회·갱신, 버튼 비활성(게임당 1회).
   실패 → "등록에 실패했어요" 문구, 버튼은 다시 활성(재시도 허용)
4. 입력란 아래 고정 안내: **"실명 말고 별명을 써 주세요"** (초등 대상)
5. 0점도 등록 가능 (막을 이유 없음)

## GitHub Actions 깨우기 cron

- `.github/workflows/supabase-keepalive.yml` — `cron: '0 0 * * 1,4'`(월·목 UTC)
  + `workflow_dispatch`(수동 실행). TOP 1 조회 curl 한 번으로 DB 활동 기록 →
  무료 플랜 7일 무활동 일시정지 방지
- URL·anon key는 공개 전제이므로 워크플로 파일에 평문으로 둔다
  (leaderboard-config.js와 같은 값)

## 테스트 (`test-leaderboard.js` 신규, npm test 편입)

- 결정적: validateNickname 유효/무효 케이스(한글·영문·숫자·trim·특수문자·9자·빈
  문자열·공백만), buildSubmitRequest/buildTopRequest의 url·헤더·바디 형태,
  parseTopResponse(정상/빈 배열/형식 오류 항목 섞임/배열 아님)
- 속성 검사(500회): 무작위 문자열 → validate 통과분은 항상 정규식 만족·1~8자,
  무작위 유효 입력 → buildSubmitRequest 바디가 JSON round-trip 되고 url이
  config.url로 시작
- fetch 실행·DOM은 순수 모듈 밖 — 브라우저 육안 확인으로 검증
- `package.json`의 test 스크립트에 `&& node test-leaderboard.js` 추가

## 사용자 셋업 절차 (구현과 병행, 1회)

1. https://supabase.com 가입 → New project (리전 Northeast Asia 권장)
2. SQL Editor에서 위 SQL 실행
3. Settings → API에서 **Project URL**과 **anon public key** 복사
4. 두 값을 `leaderboard-config.js`와 keepalive 워크플로에 기입

## 범위 제외

- 내 순위 표시, 주간 리셋, 금칙어 필터, 중복 닉네임 제한, 서버측 플레이 검증
- 점수 규칙·게임 로직 변경 없음 (game-core.js, problems.js, format.js 무변경)
