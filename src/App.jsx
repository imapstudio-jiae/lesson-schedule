import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import NoticeBanner from './components/NoticeBanner';
import TimetableGrid from './components/TimetableGrid';
import LessonModal from './components/LessonModal';
import MemoCardsSection from './components/MemoCardsSection';
import MemoDetailModal from './components/MemoDetailModal';

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

  // 학생별 지난 수업 메모/진도 이력(History) 상태
  const [studentHistories, setStudentHistories] = useState(() => {
    try {
      const saved = localStorage.getItem('music_studio_student_histories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse student histories:', e);
    }
    return {
      '최수연': [
        { id: 'h-1', date: '2026.10.12 14:00', lessonType: '40분 정규 레슨', memo: '쇼팽 녹턴 9-2 도입부 루바토 및 페달링 점검', day: 'mon', time: '13:00' },
        { id: 'h-2', date: '2026.10.05 13:00', lessonType: '40분 정규 레슨', memo: '하농 38번 아르페지오 템포 112 완성, 악보 리딩 지도', day: 'mon', time: '13:00' }
      ],
      '박준혁': [
        { id: 'h-3', date: '2026.10.07 15:00', lessonType: '성인 그룹 레슨', memo: '재즈 기본 2-5-1 보이싱 텐션 코드 복습', day: 'mon', time: '14:30' }
      ],
      '윤채원': [
        { id: 'h-4', date: '2026.10.10 13:30', lessonType: '1시간 정규 레슨', memo: '발트슈타인 1악장 발전부 왼손 트릴 테크닉 릴리즈 훈련', day: 'fri', time: '13:00' }
      ]
    };
  });
  
  // 모달 상태 (레슨 등록/수정 모달 및 메모 세부 모달)
  const [lessonModalCell, setLessonModalCell] = useState(null);
  const [selectedMemoDetail, setSelectedMemoDetail] = useState(null); // { card, item }

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

        let loadedCards = parsed.memoCards ?? getDefaultMemoCards();
        // 첫 번째 카드가 '특수 일정'인 경우 '스튜디오 운영 To-Do'로 자동 마이그레이션
        if (Array.isArray(loadedCards) && loadedCards.length > 0) {
          if (loadedCards[0].title.includes('특수 일정')) {
            loadedCards[0] = { ...loadedCards[0], title: '스튜디오 운영 To-Do' };
          }
        }

        return {
          notice: currentNotice,
          lessons: parsed.lessons ?? {},
          memoCards: loadedCards
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

  // 학생별 지난 수업 이력 영구 저장 및 실시간 전파
  const persistStudentHistories = useCallback((newHistories) => {
    localStorage.setItem('music_studio_student_histories', JSON.stringify(newHistories));
    realtimeSync.broadcastUpdate('student_histories', newHistories);
    saveMonthDataToFirestore(studioId, 'student_histories', newHistories).catch(() => {});
  }, [studioId]);

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
      } else if (payloadKey === 'student_histories' && data) {
        setStudentHistories(data);
        localStorage.setItem('music_studio_student_histories', JSON.stringify(data));
      }
    });

    // 3. Firestore 실시간 리스너 자동 연결
    let unsubscribeFirestore = null;
    let unsubscribeHistoriesFirestore = null;
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

      unsubscribeHistoriesFirestore = subscribeToMonthData(
        studioId,
        'student_histories',
        (remoteHistories) => {
          if (remoteHistories && typeof remoteHistories === 'object') {
            setStudentHistories(remoteHistories);
            localStorage.setItem('music_studio_student_histories', JSON.stringify(remoteHistories));
          }
        },
        () => {}
      );
    } catch (e) {}

    return () => {
      if (unsubscribeSync) unsubscribeSync();
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeHistoriesFirestore) unsubscribeHistoriesFirestore();
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

  // 레슨 추가/수정 (메모 작성 시 학생별 지난 수업 이력도 함께 누적 저장)
  const handleSaveLesson = (cellKey, lessonData) => {
    setLessons((prevLessons) => {
      const updated = {
        ...prevLessons,
        [cellKey]: lessonData
      };
      persistMonthData(notice, updated, memoCards);
      return updated;
    });

    // 학생 이름과 메모가 있는 경우, 해당 학생의 진도 이력에 누적 기록
    if (lessonData.studentName && lessonData.memo && lessonData.memo.trim()) {
      const studentName = lessonData.studentName.trim();
      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setStudentHistories((prev) => {
        const list = prev[studentName] || [];
        // 직전 최신 항목과 메모 내용이 동일하다면 중복 추가 방지
        if (list.length > 0 && list[0].memo === lessonData.memo.trim()) {
          return prev;
        }

        const newHistory = {
          id: `hist-${Date.now()}`,
          date: dateStr,
          lessonType: lessonData.lessonType,
          memo: lessonData.memo.trim(),
          day: lessonData.day,
          time: lessonData.time
        };

        const updatedHistories = {
          ...prev,
          [studentName]: [newHistory, ...list]
        };

        persistStudentHistories(updatedHistories);
        return updatedHistories;
      });
    }
  };

  // 학생별 특정 수업 이력 삭제
  const handleDeleteStudentHistory = (studentName, historyId) => {
    setStudentHistories((prev) => {
      const list = prev[studentName] || [];
      const updatedList = list.filter((h) => h.id !== historyId);
      const updatedHistories = {
        ...prev,
        [studentName]: updatedList
      };
      persistStudentHistories(updatedHistories);
      return updatedHistories;
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

  // 메모 카드 또는 특정 항목의 세부 내용 저장 및 날짜별 이력 누적
  const handleSaveCardDetail = (cardId, itemId, detailNote, newHistoryItem) => {
    setMemoCards((prevCards) => {
      const updated = prevCards.map((c) => {
        if (c.id === cardId) {
          if (itemId) {
            // 특정 항목(item)에 세부 메모 및 이력 누적 저장
            const updatedItems = (c.items || []).map((it) => {
              if (it.id === itemId) {
                const prevHist = it.history || [];
                return {
                  ...it,
                  detailNote,
                  history: [newHistoryItem, ...prevHist]
                };
              }
              return it;
            });
            return {
              ...c,
              items: updatedItems
            };
          } else {
            // 카드 전체 레벨 세부 메모 및 이력 누적 저장
            const prevHistory = c.history || [];
            return {
              ...c,
              detailNote,
              history: [newHistoryItem, ...prevHistory]
            };
          }
        }
        return c;
      });
      persistMonthData(notice, lessons, updated);
      return updated;
    });
  };

  // 메모 카드 또는 특정 항목의 이력 항목 삭제
  const handleDeleteCardHistory = (cardId, itemId, historyId) => {
    setMemoCards((prevCards) => {
      const updated = prevCards.map((c) => {
        if (c.id === cardId) {
          if (itemId) {
            const updatedItems = (c.items || []).map((it) => {
              if (it.id === itemId) {
                return {
                  ...it,
                  history: (it.history || []).filter((h) => h.id !== historyId)
                };
              }
              return it;
            });
            return { ...c, items: updatedItems };
          } else {
            return {
              ...c,
              history: (c.history || []).filter((h) => h.id !== historyId)
            };
          }
        }
        return c;
      });
      persistMonthData(notice, lessons, updated);
      return updated;
    });
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
        onOpenDetailModal={(card, item = null) => setSelectedMemoDetail({ card, item })}
      />

      {/* 레슨 등록 및 수정 모달 (사용자가 일정 클릭 시에만 표시) */}
      <LessonModal
        isOpen={Boolean(lessonModalCell)}
        onClose={() => setLessonModalCell(null)}
        cellInfo={lessonModalCell}
        onSaveLesson={handleSaveLesson}
        onDeleteLesson={handleDeleteLesson}
        studentHistories={studentHistories}
        onDeleteStudentHistory={handleDeleteStudentHistory}
      />

      {/* 메모 카드 / 항목 세부 내용 & 날짜별 이력 관리 모달 */}
      {(() => {
        if (!selectedMemoDetail) return null;
        const currentCard = memoCards.find(c => c.id === selectedMemoDetail.card?.id) || selectedMemoDetail.card;
        const currentItem = selectedMemoDetail.item 
          ? (currentCard?.items || []).find(it => it.id === selectedMemoDetail.item.id) || selectedMemoDetail.item
          : null;

        return (
          <MemoDetailModal
            isOpen={Boolean(selectedMemoDetail)}
            onClose={() => setSelectedMemoDetail(null)}
            card={currentCard}
            activeItem={currentItem}
            onSaveCardDetail={handleSaveCardDetail}
            onDeleteCardHistory={handleDeleteCardHistory}
          />
        );
      })()}
    </div>
  );
}
