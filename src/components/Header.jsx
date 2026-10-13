import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Printer, 
  Music, 
  Edit2, 
  Check, 
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Flame,
  AlertCircle
} from 'lucide-react';

export default function Header({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onSelectYearMonth,
  onResetToCurrentMonth,
  studioTitle,
  onUpdateStudioTitle,
  syncStatus, // 'online' | 'local' | 'error'
  onOpenFirebaseModal,
  onLoadSampleData
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(studioTitle);

  const handleTitleSubmit = () => {
    if (tempTitle.trim()) {
      onUpdateStudioTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const years = Array.from({ length: 7 }, (_, i) => year - 3 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="header-wrapper">
      <div className="header-top">
        {/* 스튜디오 브랜드 로고 & 타이틀 */}
        <div className="studio-brand">
          <div className="studio-icon-box">
            <Music size={24} />
          </div>
          <div className="studio-title-area">
            {isEditingTitle ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input 
                  type="text" 
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  autoFocus
                  style={{ fontSize: '1.1rem', fontWeight: '700', padding: '2px 8px' }}
                />
                <button 
                  className="btn-pill" 
                  onClick={handleTitleSubmit} 
                  title="저장"
                  style={{ padding: '4px 8px' }}
                >
                  <Check size={14} color="#EA580C" />
                </button>
              </div>
            ) : (
              <h1 className="studio-title" onClick={() => setIsEditingTitle(true)} style={{ cursor: 'pointer' }}>
                {studioTitle}
                <button 
                  className="icon-btn" 
                  onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                  title="스튜디오 이름 변경"
                >
                  <Edit2 size={13} />
                </button>
              </h1>
            )}
            <span className="studio-subtitle">실시간 레슨 일정 및 운영 통합 대시보드</span>
          </div>
        </div>

        {/* 우측 상단 액션 바 */}
        <div className="header-actions">
          {/* 파이어베이스 연결 상태 표시 (요청 1: 명확한 상태 및 색상 아이콘) */}
          {syncStatus === 'online' ? (
            <button 
              className="sync-badge online clickable"
              onClick={onOpenFirebaseModal}
              title="Firebase 실시간 동기화가 활성화되어 있습니다. 클릭하여 설정을 확인합니다."
            >
              <Flame size={15} color="#059669" />
              <span>🔥 Firebase 연결됨</span>
            </button>
          ) : syncStatus === 'error' ? (
            <button 
              className="sync-badge error clickable"
              onClick={onOpenFirebaseModal}
              title="Firestore 연결 또는 보안 규칙에 오류가 발생했습니다. 클릭하여 해결합니다."
            >
              <AlertCircle size={15} color="#DC2626" />
              <span>🚨 연결 오류 (설정 확인)</span>
            </button>
          ) : (
            <button 
              className="sync-badge local clickable"
              onClick={onOpenFirebaseModal}
              title="현재 브라우저 로컬 저장 모드입니다. 다른 사용자와 실시간 공유하려면 클릭하여 Firebase를 설정하세요."
            >
              <AlertTriangle size={15} color="#D97706" />
              <span>⚠️ 로컬 모드</span>
            </button>
          )}

          {/* Firebase 연동 버튼 */}
          <button 
            className="btn-pill" 
            onClick={onOpenFirebaseModal}
            title="Firebase Firestore 연동 및 보안 규칙 설정"
          >
            <Settings size={15} />
            <span>Firebase 설정</span>
          </button>

          {/* 샘플 데이터 불러오기 버튼 */}
          <button 
            className="btn-pill" 
            onClick={onLoadSampleData}
            title="기본 예시 레슨 및 메모 채우기"
          >
            <Sparkles size={15} color="#EA580C" />
            <span>샘플 로드</span>
          </button>

          {/* 인쇄 버튼 */}
          <button 
            className="btn-pill" 
            onClick={handlePrint}
            title="시간표 인쇄 및 PDF 저장"
          >
            <Printer size={15} />
            <span>인쇄 / PDF</span>
          </button>
        </div>
      </div>

      {/* 연월 네비게이터 & 빠른 이동 */}
      <div className="month-nav-bar">
        <div className="month-display-group">
          <button 
            className="month-btn-nav" 
            onClick={onPrevMonth}
            title="이전달 이동"
            aria-label="이전 달"
          >
            <ChevronLeft size={20} />
          </button>

          <h2 className="current-month-heading">
            <span>{year}년 {month}월 레슨 일정</span>
            <span className="current-month-badge">월간 시간표</span>
          </h2>

          <button 
            className="month-btn-nav" 
            onClick={onNextMonth}
            title="다음달 이동"
            aria-label="다음 달"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 연도/월 선택 드롭다운 및 이번달 바로가기 */}
        <div className="month-selector-controls">
          <select 
            className="select-compact"
            value={year}
            onChange={(e) => onSelectYearMonth(Number(e.target.value), month)}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>

          <select 
            className="select-compact"
            value={month}
            onChange={(e) => onSelectYearMonth(year, Number(e.target.value))}
          >
            {months.map(m => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>

          <button 
            className="btn-pill" 
            onClick={onResetToCurrentMonth}
            title="현재 달로 즉시 이동"
            style={{ padding: '7px 12px' }}
          >
            <RotateCcw size={13} />
            <span>이번달로</span>
          </button>
        </div>
      </div>
    </header>
  );
}
