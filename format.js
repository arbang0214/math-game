// 표시용 포맷 순수 로직 — DOM·네트워크 없음, Node에서 테스트 가능.
// 문자열 속 "3/5" 같은 "정수/정수" 패턴을 분수 세그먼트로 쪼갠다.
// UI가 세로 분수 표기로 그리기 위한 표시 전용 변환이며 정답 판정과 무관하다.

export function fractionSegments(text) {
  const segments = [];
  const re = /(\d+)\/(\d+)/g;
  let last = 0;
  for (let m; (m = re.exec(text)) !== null; ) {
    if (m.index > last) segments.push({ type: 'text', text: text.slice(last, m.index) });
    segments.push({ type: 'fraction', num: Number(m[1]), den: Number(m[2]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
  return segments;
}
