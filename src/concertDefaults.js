// ── 🎤 공연 기획 · 기본값 & 데이터 보정 ──
// 공연별 셋리스트(순서·출연자·곡명·형태·상태·비고)를 클라우드에 함께 저장한다.
// 학생 전화번호 등 개인정보는 넣지 않는다.

export const CONCERT_STORAGE_KEY = 'concerts_v1'; // Supabase studio_schedule key
export const CONCERT_LOCAL_KEY = 'imap_concerts_v1'; // 브라우저 로컬 캐시

export const PERFORMANCE_FORMS = ['솔로', '듀엣', '앙상블', '밴드', '특별무대', '이벤트'];
export const PERFORMANCE_STATUSES = ['확정', '후보', '미정'];

let seq = 0;
function newId(prefix) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

function item(performer, form, song, status, memo = '') {
  return { id: newId('item'), performer, form, song, status, memo };
}

export function defaultConcerts() {
  return {
    version: 1,
    activeShowId: 'show-2026-12-12',
    shows: [
      {
        id: 'show-2026-12-12',
        title: '2026-12-12 작은 발표회',
        date: '2026-12-12',
        meta: '학생 3명 · 가족 약 15명',
        expectedTime: '',
        note: '',
        items: [
          item('학생 1', '솔로', '곡명 미정', '미정'),
          item('학생 2', '솔로', '곡명 미정', '미정'),
          item('학생 3', '솔로', '곡명 미정', '미정'),
          item('학생 3명', '앙상블', '앙상블 1', '미정'),
          item('지애 님·인웅쌤 포함 5명', '앙상블', '앙상블 2', '미정'),
          item('지애 님', '특별무대', '댄스 믹스: 애창 〈미련이 춤을 춰〉 1절 + 김건모 〈첫인상〉 1절', '후보', '약 1분 30초 내외 · 음원 믹스 예정'),
          item('인웅쌤 리드·관객 다 같이', '이벤트', '관객 다 같이 노래', '확정', '인웅쌤 반주 및 리드')
        ]
      },
      {
        id: 'show-2027-02-final',
        title: '2월 말 정기 공연',
        date: '',
        meta: '약 20곡 · 예상 약 2시간',
        expectedTime: '약 2시간',
        note: '전체 약 20곡 내외 예상',
        items: [
          item('서현·준호', '듀엣', '할아버지의 낡은 시계', '후보', '1곡 · 곡명 확인 필요'),
          item('황용하 님', '솔로', '곡명 미정', '미정', '개인 무대 1곡 예상'),
          item('신서정 님', '솔로', '곡명 미정', '미정', '개인 무대 1곡 예상'),
          item('김재용 님', '솔로', '곡명 미정', '미정', '개인 무대 1곡 예상'),
          item('최수연 님', '솔로', '곡명 미정', '미정', '개인 무대 1곡 예상'),
          item('박은정 님', '솔로', '곡명 미정', '미정', '개인 무대 1곡 예상'),
          item('성인 기타 앙상블', '앙상블', '약 2곡', '미정'),
          item('학생 밴드', '밴드', '사랑하게 될 거야', '확정', '기본 곡'),
          item('학생 밴드', '밴드', 'Smoke on the Water', '확정', '기본 곡'),
          item('학생 밴드', '밴드', 'Love Story', '확정', '기본 곡'),
          item('학생 밴드', '밴드', 'Enter Sandman', '후보', '추가 후보'),
          item('학생 밴드', '밴드', 'Drowning', '후보', '추가 후보'),
          item('학생 밴드', '밴드', '신해철 곡 (그대에게? 확인 필요)', '후보', '추가 후보'),
          item('학생 밴드', '밴드', 'DAY6 - Welcome to the Show', '후보', '추가 후보'),
          item('학생 2~3명', '솔로', '노래·기타 솔로 (약 2~3곡)', '미정'),
          item('지애 님·인웅 님', '듀엣', '선생님 듀엣 또는 솔로 (2~3곡)', '미정'),
          item('진행 아이디어', '이벤트', '중간중간 간단한 상품 나눠 주는 이벤트 시간', '후보', '구체 안 추후 결정 · 전체 약 20곡 내외 / 약 2시간 예상')
        ]
      }
    ],
    updatedAt: 0
  };
}

const FORM_ALIASES = {
  '개인무대': '솔로',
  '특별': '특별무대'
};

function normalizeStatus(v) {
  if (PERFORMANCE_STATUSES.includes(v)) return v;
  if (v === '확정곡') return '확정';
  return '미정';
}

function normalizeForm(v) {
  if (PERFORMANCE_FORMS.includes(v)) return v;
  return FORM_ALIASES[v] || '솔로';
}

function normalizeShow(show, index) {
  const items = Array.isArray(show?.items)
    ? show.items
        .filter((it) => it && (it.performer != null || it.song != null))
        .map((it, i) => ({
          id: it.id || newId('item'),
          performer: String(it.performer ?? ''),
          form: normalizeForm(it.form),
          song: String(it.song ?? ''),
          status: normalizeStatus(it.status),
          memo: String(it.memo ?? '')
        }))
    : [];

  return {
    id: show?.id || newId('show'),
    title: String(show?.title || `공연 ${index + 1}`),
    date: String(show?.date || ''),
    meta: String(show?.meta || ''),
    expectedTime: String(show?.expectedTime || ''),
    note: String(show?.note || ''),
    items
  };
}

export function normalizeConcerts(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.shows) || raw.shows.length === 0) {
    return defaultConcerts();
  }
  const shows = raw.shows.map(normalizeShow);
  const activeShowId = shows.some((s) => s.id === raw.activeShowId) ? raw.activeShowId : shows[0].id;
  return { version: 1, activeShowId, shows, updatedAt: Number(raw.updatedAt) || 0 };
}

export function summarizeShow(show) {
  const items = show?.items || [];
  const total = items.length;
  const confirmed = items.filter((it) => it.status === '확정').length;
  const candidate = items.filter((it) => it.status === '후보').length;
  const pending = items.filter((it) => it.status === '미정').length;
  return { total, confirmed, candidate, pending };
}

export function formatShowDate(date) {
  if (!date) return '';
  const [y, m, d] = String(date).split('-');
  if (!m || !d) return date;
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  const day = Number.isNaN(dt.getDay()) ? '' : `(${dayNames[dt.getDay()]})`;
  return `${Number(y)}.${Number(m)}.${Number(d)} ${day}`.trim();
}

export function buildKakaoText(show) {
  const { total, confirmed, candidate, pending } = summarizeShow(show);
  const L = [];
  L.push(`[IMAP Studio] ${show.title}`);
  const head = [];
  if (show.date) head.push(formatShowDate(show.date));
  if (show.meta) head.push(show.meta);
  if (show.expectedTime) head.push(`예상 ${show.expectedTime}`);
  if (head.length) L.push(head.join(' · '));
  L.push('');
  L.push(`총 ${total}항목 · 확정 ${confirmed} · 후보 ${candidate} · 미정 ${pending}`);
  L.push('');
  (show.items || []).forEach((it, i) => {
    const parts = [`${i + 1}.`, it.performer || '출연자 미정', `(${it.form})`, '—', it.song || '곡명 미정', `[${it.status}]`];
    L.push(parts.join(' '));
    if (it.memo) L.push(`   · ${it.memo}`);
  });
  if (show.note) {
    L.push('');
    L.push(`※ ${show.note}`);
  }
  return L.join('\n');
}

export { newId };
