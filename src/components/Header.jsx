import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Edit2, 
  Check, 
  RotateCcw
} from 'lucide-react';

// 세련되고 감각적인 현대적 3D 네온 글래스 음표 심볼
function ModernMusicLogo() {
  return (
    <svg 
      className="modern-music-icon-svg" 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '30px', height: '30px' }}
    >
      <defs>
        {/* 본체 음표 멀티스톱 그라디언트 */}
        <linearGradient id="noteBodyGrad" x1="12" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#EDE9FE" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </linearGradient>

        {/* 상단 연결 빔 하이라이트 그라디언트 */}
        <linearGradient id="beamGrad" x1="18" y1="10" x2="38" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#A7F3D0" />
          <stop offset="100%" stopColor="#6EE7B7" />
        </linearGradient>

        {/* 사운드웨이브 이퀄라이저 그라디언트 */}
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0.2)" />
        </linearGradient>

        {/* 글로우 필터 */}
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 배경 은은한 오디오 비트 펄스 링 */}
      <circle cx="24" cy="24" r="21" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx="24" cy="24" r="16" fill="rgba(255, 255, 255, 0.08)" />

      {/* 사운드 이퀄라이저 주파수 바 (배경 음향감 연출) */}
      <rect x="7" y="21" width="2.2" height="6" rx="1.1" fill="url(#waveGrad)" />
      <rect x="11" y="17" width="2.2" height="14" rx="1.1" fill="url(#waveGrad)" opacity="0.6" />
      <rect x="37" y="18" width="2.2" height="12" rx="1.1" fill="url(#waveGrad)" opacity="0.6" />
      <rect x="41" y="22" width="2.2" height="5" rx="1.1" fill="url(#waveGrad)" opacity="0.4" />

      {/* 연결 빔 16분 음표 본체 (Double Beamed Sixteenth Note) */}
      {/* 왼쪽 음표 헤드 (입체 회전 타원) */}
      <ellipse cx="16.5" cy="33.5" rx="4.8" ry="3.6" transform="rotate(-22 16.5 33.5)" fill="url(#noteBodyGrad)" filter="url(#softGlow)" />
      {/* 오른쪽 음표 헤드 */}
      <ellipse cx="32.5" cy="28.5" rx="4.8" ry="3.6" transform="rotate(-22 32.5 28.5)" fill="url(#noteBodyGrad)" filter="url(#softGlow)" />

      {/* 음표 기둥 (Stems) */}
      <rect x="19.2" y="12" width="2.6" height="21.5" rx="1.3" fill="url(#noteBodyGrad)" />
      <rect x="35.2" y="7" width="2.6" height="21.5" rx="1.3" fill="url(#noteBodyGrad)" />

      {/* 메인 상단 연결 빔 (Top Primary Beam) */}
      <path 
        d="M19.2 14.5L37.8 9.5V6.8L19.2 11.8V14.5Z" 
        fill="url(#beamGrad)" 
      />

      {/* 세컨더리 16분 연결 빔 (Secondary Lower Beam) */}
      <path 
        d="M19.2 18.5L37.8 13.5V11.2L19.2 16.2V18.5Z" 
        fill="url(#beamGrad)" 
        opacity="0.9"
      />

      {/* 음표 헤드 광택 하이라이트 (Specular highlights) */}
      <ellipse cx="15.2" cy="32.5" rx="2" ry="1.2" transform="rotate(-30 15.2 32.5)" fill="#FFFFFF" opacity="0.9" />
      <ellipse cx="31.2" cy="27.5" rx="2" ry="1.2" transform="rotate(-30 31.2 27.5)" fill="#FFFFFF" opacity="0.9" />

      {/* 멜로디 스파클 스타 (Brilliance sparkle) */}
      <path 
        d="M39.5 4L40.2 6.2L42.5 7L40.2 7.8L39.5 10L38.8 7.8L36.5 7L38.8 6.2L39.5 4Z" 
        fill="#FFFFFF" 
        opacity="0.95"
      />
    </svg>
  );
}

export default function Header({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onSelectYearMonth,
  onResetToCurrentMonth,
  studioTitle,
  onUpdateStudioTitle,
  syncStatus = 'online',
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
          <div className="studio-icon-box" title="IMAP Studio">
            <ModernMusicLogo />
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
                  <Check size={14} color="#0D9488" />
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
          {/* 완전 자동화된 실시간 클라우드 공유 상태 표시 */}
          <div 
            className="sync-badge online"
            title="클라우드 및 모든 사용자 기기 간에 일정이 실시간으로 자동 공유됩니다. (별도 설정 불필요)"
          >
            <span className="sync-pulse-dot"></span>
            <span>실시간 클라우드 자동 동기화</span>
          </div>

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
