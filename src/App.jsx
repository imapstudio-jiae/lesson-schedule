import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import NoticeBanner from './components/NoticeBanner';
import TimetableGrid from './components/TimetableGrid';
import LessonModal from './components/LessonModal';
import MemoCardsSection from './components/MemoCardsSection';

import { 
  getStoredStudioId, 
  subscribeToMonthData, 
  saveMonthDataToFirestore 
} from './firebase';

import { 
  getDefaultMemoCards, 
  getDefaultNotice, 
  getDefaultLessons 
} from './constants';

import { realtimeSync } from './realtimeSync';

export default function App() {
  // 현재 날짜 기준
  const initialDate = new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() + 1);

  // 스튜디오 기본 정보
  const [studioId, setStudioId] = useState(getStoredStudioId());
  const [studioTitle, setStudioTitle] = useState(() => {
    const saved = localStorage.getItem('music_studio_title');
    if (!saved || saved.includes('스튜디오') || saved.includes('시간표') || saved === '라르고 음악 스튜디오' || saved === 'IMAP 음악 스튜디오') {
      try {
        localStorage.setItem('music_studio_title', 'IMAP Studio');
      } catch (e) {
        console.warn('LocalStorage access error:', e);
      }
      return 'IMAP Studio';
    }
    return saved;
  });

  // 현재 월 포맷 (YYYY-MM)
  const yearMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const yearMonthLabel = `${currentYear}년 ${currentMonth}월`;

  // 월별 스케줄 데이터 상태
  const [notice, setNotice] = useState('');
  const [lessons, setLessons] = useState({});
  const [memoCards, setMemoCards] = useState([]);
  
  // 모달 상태 (레슨 등록/수정 모달만 유지)
  const [lessonModalCell, setLessonModalCell] = useState(null);

  // 무한 업데이트 루프 방지용 플래그
  const isRemoteUpdating = useRef(false);

  // 로컬 스토리지 키 생성
  const getStorageKey = useCallback((ym) => {
    return `studio_${studioId}_month_${ym}`;
  }, [studioId]);

  // 월별 초기 데이터 불러오기 (로컬 캐시)
  const loadLocalMonthData = useCallback((ym, ymLabel) => {
    const raw = localStorage.getItem(getStorageKey(ym));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        let currentNotice = parsed.notice ?? getDefaultNotice(ymLabel);
        if (typeof currentNotice === 'string' && currentNotice.includes('•')) {
          currentNotice = getDefaultNotice(ymLabel);
        }
        return {
          notice: currentNotice,
          lessons: parsed.lessons ?? {},
          memoCards: parsed.memoCards ?? getDefaultMemoCards()
        };
      } catch (e) {
        console.error(e);
      }
    }

    // 2026-10 등 최초 진입 시 풍성한 샘플 데이터 제공
    return {
      notice: getDefaultNotice(ymLabel),
      lessons: ym === '2026-10' ? getDefaultLessons() : {},
      memoCards: getDefaultMemoCards()
    };
  }, [getStorageKey]);

  // 데이터 변경 시 로컬 저장 + 실시간 클라우드 브로드캐스트 + Firestore 백엔드 자동 저장
  const persistMonthData = useCallback(async (newNotice, newLessons, newCards) => {
    const dataToSave = {
      notice: newNotice,
      lessons: newLessons,
      memoCards: newCards,
      updatedAt: Date.now()
    };

    // 1. 로컬스토리지 즉시 영구 저장
    localStorage.setItem(getStorageKey(yearMonthKey), JSON.stringify(dataToSave));

    // 2. 다른 사용자 및 탭으로 실시간 클라우드 자동 전파 (별도 설정 전혀 불필요)
    realtimeSync.broadcastUpdate(yearMonthKey, dataToSave);

    // 3. Firestore 백엔드에도 백그라운드 자동 저장 시도
    saveMonthDataToFirestore(studioId, yearMonthKey, dataToSave).catch(() => {});
  }, [yearMonthKey, studioId, getStorageKey]);

  // 월 변경 및 실시간 동기화 엔진 리스너 등록
  useEffect(() => {
    // 1. 로컬 캐시 즉시 렌더링
    const initial = loadLocalMonthData(yearMonthKey, yearMonthLabel);
    setNotice(initial.notice);
    setLessons(initial.lessons);
    setMemoCards(initial.memoCards);

    // 2. 실시간 클라우드 & 로컬 동기화 수신 구독
    const unsubscribeSync = realtimeSync.subscribe(({ payloadKey, data }) => {
      if (payloadKey === yearMonthKey && data) {
        isRemoteUpdating.current = true;
        setNotice(data.notice ?? '');
        setLessons(data.lessons ?? {});
        setMemoCards(data.memoCards ?? []);
        localStorage.setItem(getStorageKey(yearMonthKey), JSON.stringify(data));
        setTimeout(() => { isRemoteUpdating.current = false; }, 100);
      }
    });

    // 3. Firestore 실시간 리스너 자동 연결
    let unsubscribeFirestore = null;
    try {
      unsubscribeFirestore = subscribeToMonthData(
        studioId,
        yearMonthKey,
        (remoteData) => {
          if (remoteData) {
            isRemoteUpdating.current = true;
            setNotice(remoteData.notice ?? '');
            setLessons(remoteData.lessons ?? {});
            setMemoCards(remoteData.memoCards ?? []);
            localStorage.setItem(getStorageKey(yearMonthKey), JSON.stringify(remoteData));
            setTimeout(() => { isRemoteUpdating.current = false; }, 100);
          }
        },
        () => {}
      );
    } catch (e) {}

    return () => {
      if (unsubscribeSync) unsubscribeSync();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [yearMonthKey, studioId, loadLocalMonthData, yearMonthLabel, getStorageKey]);

  // 월 이동 핸들러
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectYearMonth = (year, month) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const handleResetToCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  // 스튜디오 이름 변경
  const handleUpdateStudioTitle = (title) => {
    setStudioTitle(title);
    localStorage.setItem('music_studio_title', title);
  };

  // 공지사항 변경
  const handleSaveNotice = (text) => {
    setNotice(text);
    persistMonthData(text, lessons, memoCards);
  };

  // 레슨 추가/수정
  const handleSaveLesson = (cellKey, lessonData) => {
    setLessons((prevLessons) => {
      const updated = {
        ...prevLessons,
        [cellKey]: lessonData
      };
      persistMonthData(notice, updated, memoCards);
      return updated;
    });
  };

  // 레슨 삭제 (슬롯 키 및 레슨 ID 양방향 검사로 완벽 삭제)
  const handleDeleteLesson = (cellKey, lessonId) => {
    setLessons((prevLessons) => {
      const updated = { ...prevLessons };
      if (cellKey && updated[cellKey]) {
        delete updated[cellKey];
      }
      if (lessonId) {
        Object.keys(updated).forEach((key) => {
          if (updated[key]?.id === lessonId) {
            delete updated[key];
          }
        });
      }
      // 최신 상태를 로컬스토리지, 실시간 채널, Firestore에 즉시 영구 저장
      persistMonthData(notice, updated, memoCards);
      return updated;
    });
  };

  // 레슨 드래그 앤 드롭 이동 핸들러 (빈 슬롯 이동 및 다른 레슨과의 맞교환 지원)
  const handleMoveLesson = (sourceSlotKey, targetSlotKey, targetDayKey, targetTime) => {
    if (!sourceSlotKey || !targetSlotKey || sourceSlotKey === targetSlotKey) return;

    setLessons((prevLessons) => {
      const sourceLesson = prevLessons[sourceSlotKey];
      if (!sourceLesson) return prevLessons;

      const updated = { ...prevLessons };
      const targetExistingLesson = updated[targetSlotKey];

      // 타겟 슬롯에 소스 레슨의 요일/시간을 갱신하여 배치
      updated[targetSlotKey] = {
        ...sourceLesson,
        day: targetDayKey,
        time: targetTime
      };

      // 타겟 슬롯에 이미 레슨이 있던 경우: 두 레슨의 위치를 맞교환(Swap)
      if (targetExistingLesson) {
        const [sourceDayKey, sourceTime] = sourceSlotKey.split('-');
        updated[sourceSlotKey] = {
          ...targetExistingLesson,
          day: sourceDayKey,
          time: sourceTime
        };
      } else {
        // 빈 슬롯으로 이동한 경우: 기존 슬롯 데이터 제거
        delete updated[sourceSlotKey];
      }

      // 로컬스토리지, 실시간 채널, Firestore에 최신 상태 즉각 영구 저장
      persistMonthData(notice, updated, memoCards);
      return updated;
    });
  };

  // 메모 카드 추가
  const handleAddMemoCard = () => {
    const newCard = {
      id: `card-${Date.now()}`,
      title: '새 메모 카드',
      color: 'amber',
      items: [
        { id: `item-${Date.now()}`, text: '새로운 메모 또는 체크 항목을 입력하세요.', checked: false }
      ]
    };
    const updated = [...memoCards, newCard];
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  // 메모 카드 삭제
  const handleDeleteMemoCard = (cardId) => {
    const updated = memoCards.filter(c => c.id !== cardId);
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  // 메모 카드 제목 수정
  const handleUpdateCardTitle = (cardId, newTitle) => {
    const updated = memoCards.map(c => c.id === cardId ? { ...c, title: newTitle } : c);
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  // 메모 카드 색상 변경
  const handleUpdateCardColor = (cardId, newColor) => {
    const updated = memoCards.map(c => c.id === cardId ? { ...c, color: newColor } : c);
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  // 메모 카드 항목 추가
  const handleAddItemToCard = (cardId, text) => {
    const updated = memoCards.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          items: [...(c.items || []), { id: `item-${Date.now()}`, text, checked: false }]
        };
      }
      return c;
    });
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  // 메모 카드 항목 체크박스 토글
  const handleToggleItemCheck = (cardId, itemId) => {
    const updated = memoCards.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          items: (c.items || []).map(item => item.id === itemId ? { ...item, checked: !item.checked } : item)
        };
      }
      return c;
    });
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  // 메모 카드 항목 삭제
  const handleDeleteItemFromCard = (cardId, itemId) => {
    const updated = memoCards.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          items: (c.items || []).filter(item => item.id !== itemId)
        };
      }
      return c;
    });
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  // 샘플 데이터 복원
  const handleLoadSampleData = () => {
    if (confirm('현재 월에 예시 레슨 일정과 4개 기본 메모 카드를 불러오시겠습니까?')) {
      const sampleLessons = getDefaultLessons();
      const sampleCards = getDefaultMemoCards();
      const sampleNotice = getDefaultNotice(yearMonthLabel);
      setNotice(sampleNotice);
      setLessons(sampleLessons);
      setMemoCards(sampleCards);
      persistMonthData(sampleNotice, sampleLessons, sampleCards);
    }
  };

  return (
    <div className="app-container">
      {/* 1. 상단 헤더 & 연월 네비게이터 (설정 모달 없이 자동 실시간 동기화 상태 표시) */}
      <Header
        year={currentYear}
        month={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onSelectYearMonth={handleSelectYearMonth}
        onResetToCurrentMonth={handleResetToCurrentMonth}
        studioTitle={studioTitle}
        onUpdateStudioTitle={handleUpdateStudioTitle}
        onLoadSampleData={handleLoadSampleData}
      />

      {/* 2. 상단 운영 안내문 (수정 가능, 실시간 자동 공유) */}
      <NoticeBanner
        year={currentYear}
        month={currentMonth}
        noticeText={notice}
        onSaveNotice={handleSaveNotice}
      />

      {/* 3. 메인 시간표 Grid (시간 + 월~토 7열, 13:00~20:00 30분 슬롯 및 드래그앤드롭 이동) */}
      <TimetableGrid
        lessons={lessons}
        onSelectCell={(cellInfo) => setLessonModalCell(cellInfo)}
        onMoveLesson={handleMoveLesson}
        year={currentYear}
        month={currentMonth}
      />

      {/* 4. 하단 동적 메모 카드 영역 (완전 편집 가능, 실시간 자동 공유) */}
      <MemoCardsSection
        memoCards={memoCards}
        onAddCard={handleAddMemoCard}
        onDeleteCard={handleDeleteMemoCard}
        onUpdateCardTitle={handleUpdateCardTitle}
        onUpdateCardColor={handleUpdateCardColor}
        onAddItemToCard={handleAddItemToCard}
        onToggleItemCheck={handleToggleItemCheck}
        onDeleteItemFromCard={handleDeleteItemFromCard}
      />

      {/* 레슨 등록 및 수정 모달 (사용자가 일정 클릭 시에만 표시) */}
      <LessonModal
        isOpen={Boolean(lessonModalCell)}
        onClose={() => setLessonModalCell(null)}
        cellInfo={lessonModalCell}
        onSaveLesson={handleSaveLesson}
        onDeleteLesson={handleDeleteLesson}
      />
    </div>
  );
}
