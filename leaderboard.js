// 전체 리더보드 순수 로직 — DOM·네트워크 없음 (fetch 실행은 game.js).
// Supabase PostgREST를 SDK 없이 호출하기 위한 검증·요청 생성·응답 해석만 담당한다.

// 닉네임 규칙: 한글/영문/숫자 1~8자 — DB의 CHECK 제약과 반드시 동일해야 한다 (스펙 참조)
const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{1,8}$/;

// 닉네임 검증 — 통과 시 trim된 닉네임을 돌려준다
export function validateNickname(raw) {
  if (typeof raw !== 'string') return { ok: false, reason: '닉네임을 입력해 주세요' };
  const nickname = raw.trim();
  if (nickname.length === 0) return { ok: false, reason: '닉네임을 입력해 주세요' };
  if (!NICKNAME_RE.test(nickname)) {
    return { ok: false, reason: '한글/영문/숫자 1~8자만 쓸 수 있어요' };
  }
  return { ok: true, nickname };
}

// 설정이 채워졌는지 — 비어 있으면 리더보드 UI를 아예 숨긴다 (game.js)
export function isConfigured(config) {
  return Boolean(config && config.url && config.anonKey);
}

// 공통 인증 헤더 — anon key는 공개 전제 (RLS가 방어선)
function authHeaders(config) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
  };
}

// 점수 등록 요청 — fetch(url, options)에 그대로 넘길 인자를 만든다
export function buildSubmitRequest(config, { nickname, score }) {
  return {
    url: `${config.url}/rest/v1/scores`,
    options: {
      method: 'POST',
      headers: {
        ...authHeaders(config),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ nickname, score }),
    },
  };
}

// TOP N 조회 요청 — 점수 내림차순, 동점은 먼저 등록한 쪽이 위
export function buildTopRequest(config, limit = 10) {
  const query = `select=nickname,score&order=score.desc,created_at.asc&limit=${limit}`;
  return {
    url: `${config.url}/rest/v1/scores?${query}`,
    options: { method: 'GET', headers: authHeaders(config) },
  };
}

// 서버 응답(JSON 배열)을 [{rank, nickname, score}]로 — 형식이 어긋난 항목은 버린다
export function parseTopResponse(json) {
  if (!Array.isArray(json)) return [];
  return json
    .filter((row) => row && typeof row === 'object'
      && typeof row.nickname === 'string'
      && Number.isInteger(row.score))
    .map((row, i) => ({ rank: i + 1, nickname: row.nickname, score: row.score }));
}
