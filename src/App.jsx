import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import NoticeBanner from './components/NoticeBanner';
import TimetableGrid from './components/TimetableGrid';
import LessonModal from './components/LessonModal';
import MemoCardsSection from './components/MemoCardsSection';
import FirebaseConfigModal from './components/FirebaseConfigModal';

import { 
  getDb, 
  getStoredStudioId, 
  subscribeToMonthData, 
  saveMonthDataToFirestore 
} from './firebase';

import { 
  getDefaultMemoCards, 
  getDefaultNotice, 
  getDefaultLessons 
} from './constants';

import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export default function App() {
  // 현재 날짜 기준 (2026년 10월 등)
  const initialDate = new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth() + 1);

  // 스튜디오 기본 정보
  const [studioId, setStudioId] = useState(getStoredStudioId());
  const [studioTitle, setStudioTitle] = useState(() => {
    return localStorage.getItem('music_studio_title') || '라르고 음악 스튜디오';
  });

  // 현재 월 포맷 (YYYY-MM)
  const yearMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const yearMonthLabel = `${currentYear}년 ${currentMonth}월`;

  // 월별 스케줄 데이터 상태
  const [notice, setNotice] = useState('');
  const [lessons, setLessons] = useState({});
  const [memoCards, setMemoCards] = useState([]);
  
  // 상태 관리: Firebase 연결 여부, 에러 객체, 모달 상태
  const [syncStatus, setSyncStatus] = useState('local'); // 'online' | 'local' | 'error'
  const [firestoreError, setFirestoreError] = useState(null); // { title, description, raw, type }
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [lessonModalCell, setLessonModalCell] = useState(null);

  // 무한 업데이트 루프 방지용 플래그
  const isRemoteUpdating = useRef(false);

  // BroadcastChannel (로컬 다중 탭 실시간 동기화)
  const broadcastChannelRef = useRef(null);

  useEffect(() => {
    try {
      broadcastChannelRef.current = new BroadcastChannel('music_studio_channel');
      broadcastChannelRef.current.onmessage = (event) => {
        const { type, payloadKey, data } = event.data || {};
        if (type === 'DATA_UPDATE' && payloadKey === yearMonthKey) {
          isRemoteUpdating.current = true;
          setNotice(data.notice ?? '');
          setLessons(data.lessons ?? {});
          setMemoCards(data.memoCards ?? []);
          setTimeout(() => { isRemoteUpdating.current = false; }, 100);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [yearMonthKey]);

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
        return {
          notice: parsed.notice ?? getDefaultNotice(ymLabel),
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

  // 데이터 변경 시 로컬 저장 + Firestore 저장 + Broadcast 전송
  const persistMonthData = useCallback(async (newNotice, newLessons, newCards) => {
    const dataToSave = {
      notice: newNotice,
      lessons: newLessons,
      memoCards: newCards,
      updatedAt: Date.now()
    };

    // 1. 로컬스토리지 백업
    localStorage.setItem(getStorageKey(yearMonthKey), JSON.stringify(dataToSave));

    // 2. 다른 탭 브로드캐스트
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'DATA_UPDATE',
        payloadKey: yearMonthKey,
        data: dataToSave
      });
    }

    // 3. Firestore 실시간 전송
    const db = getDb();
    if (db) {
      try {
        await saveMonthDataToFirestore(studioId, yearMonthKey, dataToSave);
        setFirestoreError(null);
        setSyncStatus('online');
      } catch (error) {
        console.error('[Firestore Save Error Caught]:', error);
        setFirestoreError(error);
        setSyncStatus('error');
      }
    }
  }, [yearMonthKey, studioId, getStorageKey]);

  // 월이 변경되거나 Firebase 설정 시 Firestore 실시간 구독
  useEffect(() => {
    const db = getDb();
    if (!db) {
      setSyncStatus('local');
      setFirestoreError(null);
    }

    // 초기 로컬 데이터 즉시 로드
    const initial = loadLocalMonthData(yearMonthKey, yearMonthLabel);
    setNotice(initial.notice);
    setLessons(initial.lessons);
    setMemoCards(initial.memoCards);

    // Firestore 실시간 구독 설정
    let unsubscribe = null;
    if (db) {
      unsubscribe = subscribeToMonthData(
        studioId,
        yearMonthKey,
        (remoteData) => {
          // 성공 수신 시 에러 초기화 및 online 상태 유지
          setFirestoreError(null);
          setSyncStatus('online');

          if (remoteData) {
            isRemoteUpdating.current = true;
            setNotice(remoteData.notice ?? '');
            setLessons(remoteData.lessons ?? {});
            setMemoCards(remoteData.memoCards ?? []);
            // 로컬에도 최신 캐시 저장
            localStorage.setItem(getStorageKey(yearMonthKey), JSON.stringify(remoteData));
            setTimeout(() => { isRemoteUpdating.current = false; }, 100);
          } else {
            // 문서가 아직 없으면 현재 초기 데이터 업로드 시도
            persistMonthData(initial.notice, initial.lessons, initial.memoCards);
          }
        },
        (error) => {
          console.error('[Firestore Snapshot Listener Error Caught]:', error);
          setFirestoreError(error);
          setSyncStatus('error');
        }
      );
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [yearMonthKey, studioId, loadLocalMonthData, yearMonthLabel, getStorageKey, persistMonthData]);

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

  const handleSelectYearMonth = (y, m) => {
    setCurrentYear(y);
    setCurrentMonth(m);
  };

  const handleResetToCurrentMonth = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
  };

  // 스튜디오 이름 변경
  const handleUpdateStudioTitle = (title) => {
    setStudioTitle(title);
    localStorage.setItem('music_studio_title', title);
  };

  // 1. 공지사항 저장
  const handleSaveNotice = (newNotice) => {
    setNotice(newNotice);
    persistMonthData(newNotice, lessons, memoCards);
  };

  // 2. 레슨 등록 / 수정
  const handleSaveLesson = (slotKey, lessonData) => {
    const updatedLessons = {
      ...lessons,
      [slotKey]: lessonData
    };
    setLessons(updatedLessons);
    persistMonthData(notice, updatedLessons, memoCards);
  };

  // 3. 레슨 삭제
  const handleDeleteLesson = (slotKey) => {
    const updatedLessons = { ...lessons };
    delete updatedLessons[slotKey];
    setLessons(updatedLessons);
    persistMonthData(notice, updatedLessons, memoCards);
  };

  // 4. 하단 메모 카드 핸들러들
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

  const handleDeleteMemoCard = (cardId) => {
    const updated = memoCards.filter(c => c.id !== cardId);
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  const handleUpdateCardTitle = (cardId, newTitle) => {
    const updated = memoCards.map(c => c.id === cardId ? { ...c, title: newTitle } : c);
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  const handleUpdateCardColor = (cardId, newColor) => {
    const updated = memoCards.map(c => c.id === cardId ? { ...c, color: newColor } : c);
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  const handleAddItemToCard = (cardId, itemText) => {
    const updated = memoCards.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          items: [
            ...(c.items || []),
            { id: `item-${Date.now()}`, text: itemText, checked: false }
          ]
        };
      }
      return c;
    });
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

  const handleToggleItemCheck = (cardId, itemId) => {
    const updated = memoCards.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          items: (c.items || []).map(item => 
            item.id === itemId ? { ...item, checked: !item.checked } : item
          )
        };
      }
      return c;
    });
    setMemoCards(updated);
    persistMonthData(notice, lessons, updated);
  };

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

  // 샘플 데이터 불러오기
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
      {/* 1. 상단 헤더 & 연월 네비게이터 */}
      <Header
        year={currentYear}
        month={currentMonth}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onSelectYearMonth={handleSelectYearMonth}
        onResetToCurrentMonth={handleResetToCurrentMonth}
        studioTitle={studioTitle}
        onUpdateStudioTitle={handleUpdateStudioTitle}
        syncStatus={syncStatus}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onLoadSampleData={handleLoadSampleData}
      />

      {/* 1-1. Firestore 연결/권한 에러 발생 시 나타나는 알림 배너 (요청 2) */}
      {firestoreError && (
        <div className="error-alert-banner" role="alert">
          <div className="error-alert-content">
            <ShieldAlert size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>🚨 {firestoreError.title}</strong>
              <p>{firestoreError.description}</p>
              {firestoreError.raw && (
                <div style={{ fontSize: '0.76rem', color: '#B91C1C', marginTop: '4px', fontFamily: 'monospace' }}>
                  에러 로그: {firestoreError.raw}
                </div>
              )}
            </div>
          </div>
          <div className="error-alert-actions">
            <button 
              className="btn-pill" 
              onClick={() => setIsFirebaseModalOpen(true)}
              style={{ background: '#DC2626', color: 'white', borderColor: '#DC2626' }}
            >
              보안 규칙 & 설정 열기
            </button>
            <button 
              className="icon-btn" 
              onClick={() => setFirestoreError(null)}
              title="알림 닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 2. 상단 운영 안내문 (수정 가능, 실시간 공유) */}
      <NoticeBanner
        year={currentYear}
        month={currentMonth}
        noticeText={notice}
        onSaveNotice={handleSaveNotice}
      />

      {/* 3. 메인 시간표 Grid (시간 + 월~토 7열, 06:00~20:00 30분 슬롯) */}
      <TimetableGrid
        lessons={lessons}
        onSelectCell={(cellInfo) => setLessonModalCell(cellInfo)}
        year={currentYear}
        month={currentMonth}
      />

      {/* 4. 하단 동적 메모 카드 영역 (완전 편집 가능, 기본 4개 카드 제공) */}
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

      {/* 레슨 등록 및 수정 모달 */}
      <LessonModal
        isOpen={Boolean(lessonModalCell)}
        onClose={() => setLessonModalCell(null)}
        cellInfo={lessonModalCell}
        onSaveLesson={handleSaveLesson}
        onDeleteLesson={handleDeleteLesson}
      />

      {/* Firebase 연동 및 보안 규칙 설정 모달 */}
      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onConfigSaved={() => {
          setStudioId(getStoredStudioId());
          const db = getDb();
          setSyncStatus(db ? 'online' : 'local');
        }}
      />
    </div>
  );
}
