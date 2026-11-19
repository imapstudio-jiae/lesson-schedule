// ── 레슨비 정산 · 월별 기본값 (구글 시트 「레슨비」 14명 명단 + 실제 단가) ──
// 1시간 정규(주 1회) 160,000 / 40분 주 2회 210,000 / 1시간 주 2회 260,000
// 한수연 150,000 (1만 원 할인) → 합계 2,530,000원 · 전원 미확인

export const RATE_STANDARD = { h1: 160000, m40: 210000, h2: 260000 };
export const DEFAULT_RATIO = 60; // 지애 님 배분 비율(%)
export const DEFAULT_HOME_FEE = 100000; // 홈페이지 개발·관리비
export const DEFAULT_MANAGE_UNIT = 10000; // 학생 1명당 관리비
export const DEFAULT_SESSION_GOAL = 4; // 횟수 차감(4회권) 기본 목표 회차

// 예전 저장 데이터의 이름 오타 보정 (김유나 → 정유나)
const LEGACY_NAME_FIX = { 김유나: '정유나' };

const T = {
  ens: '성인 앙상블',
  jam: '학생 합주2'
};

const ROSTER = [
  { name: '김재용', form: '1시간', freq: '정규 주 1회', rate: 160000, schedule: `화 14:00 · 토 15:10 (${T.ens})`,
    memo: '교재4권(바람의 시, 시바의 여왕, 네버엔딩 스토리, 황혼) · 토 15:10 성인 앙상블 포함' },
  { name: '김준오', form: '40분', freq: '주 2회', rate: 210000, schedule: `목 16:30 · 토 13:00 (${T.jam})`,
    memo: '교재2권 스모크 온더 워터 · 토 13:00 학생 합주2 포함' },
  { name: '박준희', form: '40분', freq: '주 2회', rate: 210000, schedule: `수 15:30 · 토 13:00 (${T.jam})`,
    memo: '교재2권 · 토 13:00 학생 합주2 포함' },
  { name: '윤하준', form: '1시간', freq: '정규 주 2회', rate: 260000, schedule: '화 16:30 · 금 19:30',
    memo: '교회 반주곡 위주 · 유튜브 악보 병행' },
  { name: '황용하', form: '40분', freq: '주 2회', rate: 210000, schedule: '화 16:30 · 토 14:00',
    memo: '교재1권 찬송가 반주' },
  { name: '최수연', form: '1시간', freq: '예약제 · 비고정', rate: 160000, schedule: `수 16:00 (예약) · 토 15:10 (${T.ens})`,
    memo: '곽진언 「일종의 고백」 · 수업 기록 11/18(수) 16:00 1회 · 성인 앙상블 포함', trackSessions: true },
  { name: '최성현', form: '1시간', freq: '정규 주 1회', rate: 160000, schedule: `목 15:30 · 토 13:00 (${T.jam})`,
    memo: '링링 / 검정치마 · 솔로 공연 예정곡 · 학생 합주2 포함' },
  { name: '박채린', form: '1시간', freq: '정규 주 1회', rate: 160000, schedule: `목 15:30 · 토 13:00 (${T.jam})`,
    memo: '합주곡 연습 위주 · 교재 병행 · 학생 합주2 포함' },
  { name: '이안', form: '40분', freq: '주 2회', rate: 210000, schedule: `목 16:00 · 토 13:00 (${T.jam})`,
    memo: '개인 희망곡 · 토 13:00 학생 합주2 포함' },
  { name: '박은정', form: '1시간', freq: '보강 · 성인 앙상블', rate: 160000, schedule: `목 18:30 (보강) · 토 15:10 (${T.ens})`,
    memo: '반주 「사랑밖에 난 몰라」 · 교재는 6월부터 휴지 중 · 성인 앙상블 포함' },
  { name: '신서정', form: '1시간', freq: '정규 주 1회', rate: 160000, schedule: '토 11:00',
    memo: '11월 둘째 주 결석 → 보강 잡기로 함' },
  { name: '박서현', form: '1시간', freq: '정규 주 1회', rate: 160000, schedule: '토 12:00',
    memo: '11/11 엄지손가락 부상으로 결석 연락' },
  { name: '정유나', form: '1시간', freq: '정규 주 1회', rate: 160000, schedule: `토 13:00 (${T.jam})`,
    memo: '학생 합주 포함 · 1시간 정규 160,000원' },
  { name: '한수연', form: '1시간', freq: '정규 주 1회', rate: 150000, schedule: `토 13:00 (${T.jam})`,
    memo: '1만 원 할인(1시간 정규 160,000원 기준) · 토 13:00 합주 멤버' }
];

// 12월은 일정만 12월 기준으로 바꾼 명단 (금액·인원 동일)
const DECEMBER_OVERRIDES = {
  김재용: '교재4권 · 12/12(토) 성인 앙상블 음악회 · 성인 앙상블 포함',
  김준오: '교재2권 · 토 13:00 학생 합주2 포함',
  박준희: '교재2권 · 토 13:00 학생 합주2 포함',
  최수연: '12월 수업일은 그때그때 예약 · 12/5·12/12 그룹 수업 · 성인 앙상블 포함',
  최성현: '링링 / 검정치마 · 솔로 공연 예정곡 · 학생 합주2 포함',
  박채린: '합주곡 연습 위주 · 교재 병행 · 학생 합주2 포함',
  이안: '개인 희망곡 · 토 13:00 학생 합주2 포함',
  박은정: '12/12(토) 성인 앙상블 음악회 참여 · 성인 앙상블 포함',
  신서정: '11월 결석분 보강 여부 확인',
  박서현: '손가락 회복 후 복귀 예정'
};

const DECEMBER_TIMES = {
  김재용: `화 14:00 · 토 15:10 (${T.ens})`,
  최수연: `토 15:10 (${T.ens})`,
  정유나: `토 13:00 (${T.jam})`,
  한수연: `토 13:00 (${T.jam})`
};

function makeId(prefix, i) {
  return `${prefix}-${i + 1}`;
}

function defaultSessions(tracked) {
  return { enabled: !!tracked, done: 0, goal: DEFAULT_SESSION_GOAL };
}

function buildStudents(ym) {
  const isDecember = ym === '2026-12';
  return ROSTER.map((r, i) => ({
    id: makeId('stu', i),
    name: r.name,
    form: r.form,
    freq: r.freq,
    rate: r.rate,
    schedule: (isDecember && DECEMBER_TIMES[r.name]) || r.schedule,
    memo: isDecember ? (DECEMBER_OVERRIDES[r.name] ?? r.memo) : r.memo,
    sessions: defaultSessions(r.trackSessions),
    status: 'unpaid',
    paidDate: ''
  }));
}

// 다른 달(새 달)은 같은 명단·단가로 시작하되 메모/입금 상태는 비움
function buildFreshMonthStudents() {
  return ROSTER.map((r, i) => ({
    id: makeId('stu', i),
    name: r.name,
    form: r.form,
    freq: r.freq,
    rate: r.rate,
    schedule: r.schedule,
    memo: '',
    sessions: defaultSessions(r.trackSessions),
    status: 'unpaid',
    paidDate: ''
  }));
}

export const MONTH_NOTES = {
  '2026-11': '11월 기준 명단입니다. 성인 앙상블(최수연·박은정·김재용)과 학생 합주2(토 13:00)는 따로 금액을 잡지 않고 해당 학생 행에 ‘포함’으로 표시해 중복 청구가 없습니다.',
  '2026-12': '12월 예정 명단입니다. 12/5(토)·12/12(토) 성인 그룹 수업이 15:10~16:10으로 잡히고, 12/12(토) 성인 앙상블은 음악회로 진행됩니다.'
};

export function monthLabel(ym) {
  const [y, m] = String(ym).split('-');
  return `${y}년 ${Number(m)}월`;
}

export function defaultFeeData(ym) {
  const known = ym === '2026-11' || ym === '2026-12';
  const students = known ? buildStudents(ym) : buildFreshMonthStudents();
  return {
    version: 1,
    month: ym,
    ratio: DEFAULT_RATIO,
    homeFee: { amount: DEFAULT_HOME_FEE },
    manageFee: { mode: 'auto', unit: DEFAULT_MANAGE_UNIT, amount: students.length * DEFAULT_MANAGE_UNIT },
    items: [], // { id, label, target: 'jiae' | 'inung', amount: ± }
    students,
    note: MONTH_NOTES[ym] ?? '',
    updatedAt: 0
  };
}

// 저장된 데이터 보정 (예전/부분 데이터도 안전하게 열리도록)
export function normalizeFeeData(raw, ym) {
  const base = defaultFeeData(ym);
  if (!raw || typeof raw !== 'object') return base;

  const students = Array.isArray(raw.students) && raw.students.length
    ? raw.students.map((s, i) => {
        const name = LEGACY_NAME_FIX[s.name] || s.name || '';
        const tracked = s.sessions?.enabled === true || (!s.sessions && ROSTER[i]?.trackSessions);
        const done = Math.max(0, Math.round(Number(s.sessions?.done) || 0));
        const goal = Math.max(1, Math.round(Number(s.sessions?.goal) || DEFAULT_SESSION_GOAL));
        return {
          id: s.id || makeId('stu', i),
          name,
          form: s.form || '1시간',
          freq: s.freq || '정규 주 1회',
          rate: Number.isFinite(Number(s.rate)) ? Number(s.rate) : 0,
          schedule: s.schedule || '',
          memo: s.memo || '',
          sessions: { enabled: tracked, done, goal },
          status: s.status === 'paid' || s.status === 'exempt' ? s.status : 'unpaid',
          paidDate: s.paidDate || ''
        };
      })
    : base.students;

  const ratioNum = Number(raw.ratio);
  return {
    version: 1,
    month: ym,
    ratio: Number.isFinite(ratioNum) ? Math.max(0, Math.min(100, ratioNum)) : DEFAULT_RATIO,
    homeFee: {
      amount: Number.isFinite(Number(raw.homeFee?.amount)) ? Number(raw.homeFee.amount) : DEFAULT_HOME_FEE
    },
    manageFee: {
      mode: raw.manageFee?.mode === 'manual' ? 'manual' : 'auto',
      unit: Number.isFinite(Number(raw.manageFee?.unit)) ? Number(raw.manageFee.unit) : DEFAULT_MANAGE_UNIT,
      amount: Number.isFinite(Number(raw.manageFee?.amount))
        ? Number(raw.manageFee.amount)
        : students.length * DEFAULT_MANAGE_UNIT
    },
    items: Array.isArray(raw.items)
      ? raw.items
          .filter((it) => it && it.label != null)
          .map((it, i) => ({
            id: it.id || `item-${i + 1}`,
            label: it.label,
            target: it.target === 'inung' ? 'inung' : 'jiae',
            amount: Number(it.amount) || 0
          }))
      : [],
    students,
    note: typeof raw.note === 'string' ? raw.note : base.note,
    updatedAt: Number(raw.updatedAt) || 0
  };
}

export function feeStorageKey(ym) {
  return `fees_${ym}`;
}

export function isSpecialStudent(s) {
  return s.form === '예약제' || s.freq.includes('예약') || s.freq.includes('보강');
}

export function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  if (!m || !d) return iso;
  return `${Number(m)}/${Number(d)}`;
}
