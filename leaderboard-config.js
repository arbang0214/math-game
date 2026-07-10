// Supabase 접속 정보 — anon key는 공개 전제(RLS가 방어선)라 커밋해도 된다.
// 두 값이 비어 있으면 리더보드 UI가 통째로 숨겨지고 게임은 그대로 동작한다.
export const LEADERBOARD_CONFIG = {
  url: '',     // 예: https://xxxx.supabase.co
  anonKey: '',
};
