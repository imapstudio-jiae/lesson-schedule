// 요일 정의 (총 6개 요일, 시간 컬럼과 합쳐 총 7열)
export const DAYS_OF_WEEK = [
  { key: 'mon', label: '월요일', short: '월' },
  { key: 'tue', label: '화요일', short: '화' },
  { key: 'wed', label: '수요일', short: '수' },
  { key: 'thu', label: '목요일', short: '목' },
  { key: 'fri', label: '금요일', short: '금' },
  { key: 'sat', label: '토요일', short: '토' },
];

// 오후 1시(13:00) ~ 오후 8시(20:00) (30분 단위 슬롯 생성)
export function generateTimeSlots(startHour = 13, endHour = 20) {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    const hh = String(hour).padStart(2, '0');
    slots.push(`${hh}:00`);
    if (hour < endHour) {
      slots.push(`${hh}:30`);
    }
  }
  return slots;
}

export const TIME_SLOTS = generateTimeSlots(13, 20);

// 기본 레슨 유형 프리셋
export const LESSON_TYPES = [
  { label: '40분 정규 레슨', duration: '40분' },
  { label: '성인그룹 (40분)', duration: '40분' },
  { label: '30분 기초/원포인트', duration: '30분' },
  { label: '50분 집중 레슨', duration: '50분' },
  { label: '60분 마스터/입시', duration: '60분' },
  { label: '보강 / 테스트', duration: '40분' },
];

// 카드 및 레슨 뱃지 색상 팔레트 (연한 민트 & 라벤더 보라 테마와 어우러지는 파스텔 팔레트)
export const COLOR_PALETTES = [
  { id: 'orange', name: '소프트 살구', bg: '#FFF5F0', border: '#FED7C3', text: '#B84A28', badge: '#EA673E' },
  { id: 'peach', name: '웜 코랄', bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', badge: '#E11D48' },
  { id: 'mint', name: '클리어 민트', bg: '#F0FDFA', border: '#99F6E4', text: '#0F766E', badge: '#14B8A6' },
  { id: 'lavender', name: '소프트 라벤더', bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9', badge: '#8B5CF6' },
  { id: 'sage', name: '세이지 그린', bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', badge: '#16A34A' },
  { id: 'sky', name: '스카이 블루', bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1', badge: '#0284C7' },
  { id: 'amber', name: '골든 허니', bg: '#FEFCE8', border: '#FDE047', text: '#A16207', badge: '#CA8A04' },
  { id: 'stone', name: '웜 그레이', bg: '#F5F5F4', border: '#D6D3D1', text: '#44403C', badge: '#78716C' },
];

// 기본 초기 4개 메모 카드 템플릿
export function getDefaultMemoCards() {
  return [
    {
      id: 'card-special-schedule',
      title: '특수 일정 / 최수연',
      color: 'orange',
      items: [
        { id: 'item-1', text: '10/12 (토) 실기 콩쿠르 대비 모의 리허설 (14:00)', checked: false },
        { id: 'item-2', text: '쇼팽 에튀드 Op.10 No.4 템포 120 메트로놈 점검', checked: true },
        { id: 'item-3', text: '학부모 상담 및 레슨 동영상 피드백 전달', checked: false },
      ]
    },
    {
      id: 'card-band-rehearsal',
      title: '학생 밴드 연습곡',
      color: 'sky',
      items: [
        { id: 'item-4', text: 'DAY6 - 한 페이지가 될 수 있게 (키: F Major)', checked: false },
        { id: 'item-5', text: '아이유 - 너랑 나 (건반 아르페지오 및 신스 라인)', checked: true },
        { id: 'item-6', text: '매주 수요일 저녁 7시 합주실 세팅 확인', checked: false },
      ]
    },
    {
      id: 'card-duo-practice',
      title: '듀오 / 선생님과 연습',
      color: 'sage',
      items: [
        { id: 'item-7', text: '브람스 헝가리 무곡 제5번 4-hands 파트 분배', checked: true },
        { id: 'item-8', text: '페달 릴리즈 타이밍 및 프레이징 호흡 맞추기', checked: false },
        { id: 'item-9', text: '녹음 모니터링 후 밸런스 피드백 체크', checked: false },
      ]
    },
    {
      id: 'card-events-notes',
      title: '이벤트 및 기타 특이사항',
      color: 'lavender',
      items: [
        { id: 'item-10', text: '10월 가을 정기 연주회 신청 접수 마감 (10/25까지)', checked: false },
        { id: 'item-11', text: '1번/2번 피아노 조율 및 액션 점검 예정 (10/18)', checked: true },
        { id: 'item-12', text: '스튜디오 음료대 및 악보 바인더 보충', checked: false },
      ]
    }
  ];
}

// 기본 운영 안내문 텍스트
export function getDefaultNotice(yearMonthStr) {
  return `${yearMonthStr} 스튜디오 운영 안내사항입니다.`;
}

// 2026년 10월 등 초기 샘플 레슨 데이터 (13:00~20:00 범위 기준)
export function getDefaultLessons() {
  return {
    'mon-13:00': {
      id: 'l-1',
      studentName: '최수연',
      lessonType: '40분 정규 레슨',
      duration: '40분',
      color: 'orange',
      memo: '쇼팽 녹턴 9-2 도입부 루바토 연습',
      day: 'mon',
      time: '13:00'
    },
    'mon-14:30': {
      id: 'l-2',
      studentName: '박준혁',
      lessonType: '성인그룹 (40분)',
      duration: '40분',
      color: 'sage',
      memo: '재즈 코드 보이싱 II-V-I 패턴',
      day: 'mon',
      time: '14:30'
    },
    'tue-15:00': {
      id: 'l-3',
      studentName: '이지은',
      lessonType: '40분 정규 레슨',
      duration: '40분',
      color: 'sky',
      memo: '하농 39번 스케일 및 체르니 30번',
      day: 'tue',
      time: '15:00'
    },
    'wed-14:00': {
      id: 'l-4',
      studentName: '김도윤',
      lessonType: '50분 집중 레슨',
      duration: '50분',
      color: 'lavender',
      memo: '예고 실기 대비 바흐 평균율 프렐류드',
      day: 'wed',
      time: '14:00'
    },
    'wed-16:30': {
      id: 'l-5',
      studentName: '한서아',
      lessonType: '30분 기초/원포인트',
      duration: '30분',
      color: 'peach',
      memo: '바이엘 4권 양손 아티큘레이션',
      day: 'wed',
      time: '16:30'
    },
    'thu-17:00': {
      id: 'l-6',
      studentName: '강태우',
      lessonType: '성인그룹 (40분)',
      duration: '40분',
      color: 'amber',
      memo: '영화 OST 연주곡 (인터스텔라 테마)',
      day: 'thu',
      time: '17:00'
    },
    'fri-13:00': {
      id: 'l-7',
      studentName: '윤채원',
      lessonType: '60분 마스터/입시',
      duration: '60분',
      color: 'orange',
      memo: '베토벤 소나타 발트슈타인 1악장',
      day: 'fri',
      time: '13:00'
    },
    'sat-13:00': {
      id: 'l-8',
      studentName: '임서진',
      lessonType: '40분 정규 레슨',
      duration: '40분',
      color: 'sky',
      memo: '듀오 앙상블 파트 리허설',
      day: 'sat',
      time: '13:00'
    },
    'sat-14:30': {
      id: 'l-9',
      studentName: '밴드 앙상블팀',
      lessonType: '성인그룹 (40분)',
      duration: '60분',
      color: 'sage',
      memo: '합주실 A룸 단체 세션',
      day: 'sat',
      time: '14:30'
    }
  };
}
