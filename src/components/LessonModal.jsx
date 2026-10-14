import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Check, 
  User, 
  Clock, 
  FileText, 
  Palette, 
  History, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Calendar 
} from 'lucide-react';
import { LESSON_TYPES, COLOR_PALETTES } from '../constants';

export default function LessonModal({
  isOpen,
  onClose,
  cellInfo, // { slotKey, dayKey, dayLabel, time, lesson }
  onSaveLesson,
  onDeleteLesson,
  studentHistories = {},
  onDeleteStudentHistory
}) {
  const [studentName, setStudentName] = useState('');
  const [lessonType, setLessonType] = useState('40분 정규 레슨');
  const [customType, setCustomType] = useState('');
  const [color, setColor] = useState('orange');
  const [memo, setMemo] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const existingLesson = cellInfo?.lesson ?? null;

  useEffect(() => {
    if (!isOpen || !cellInfo) return;

    if (existingLesson) {
      setStudentName(existingLesson.studentName || '');
      const type = existingLesson.lessonType || '40분 정규 레슨';
      if (LESSON_TYPES.includes(type)) {
        setLessonType(type);
        setCustomType('');
      } else {
        setLessonType('직접 입력');
        setCustomType(type);
      }
      setColor(existingLesson.color || 'orange');
      setMemo(existingLesson.memo || '');
    } else {
      setStudentName('');
      setLessonType('40분 정규 레슨');
      setColor('orange');
      setMemo('');
      setCustomType('');
    }
    setShowHistory(false);
  }, [isOpen, cellInfo, existingLesson]);

  if (!isOpen || !cellInfo) return null;

  // 현재 입력된 학생 이름 기준 지난 수업 이력 목록
  const trimmedName = studentName.trim();
  const currentStudentHistory = (trimmedName && studentHistories[trimmedName]) || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trimmedName) {
      alert('학생 이름을 입력해주세요.');
      return;
    }

    const finalType = lessonType === '직접 입력' 
      ? (customType.trim() || '직접 입력 레슨') 
      : lessonType;

    const lessonData = {
      id: existingLesson?.id || `lesson-${Date.now()}`,
      studentName: trimmedName,
      lessonType: finalType,
      color,
      memo: memo.trim(),
      day: cellInfo.dayKey,
      time: cellInfo.time,
    };

    onSaveLesson(cellInfo.slotKey, lessonData);
    onClose();
  };

  const handleDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!existingLesson) return;

    const student = existingLesson.studentName || '선택한';
    const confirmed = window.confirm(
      `'${student}' 학생의 레슨을 삭제하시겠습니까?\n\n삭제 후에는 복구할 수 없습니다.`
    );
    if (confirmed) {
      const targetSlotKey = cellInfo.slotKey || `${cellInfo.dayKey}-${cellInfo.time}`;
      onDeleteLesson(targetSlotKey, existingLesson.id);
      onClose();
    }
  };

  // 지난 수업 이력 메모를 현재 메모창에 복사
  const handleCopyHistoryMemo = (historyMemo) => {
    if (memo && memo.trim()) {
      if (confirm('현재 작성 중인 메모를 이전 수업 메모로 교체하시겠습니까?')) {
        setMemo(historyMemo);
      }
    } else {
      setMemo(historyMemo);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card lesson-modal-expanded" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <User size={20} color="var(--color-primary)" />
            <span>
              {existingLesson ? '레슨 정보 수정' : '새 레슨 일정 등록'}
            </span>
          </h3>
          <button className="icon-btn" onClick={onClose} title="닫기">
            <X size={18} />
          </button>
        </div>

        {/* 요일 및 시간대 안내 */}
        <div style={{ 
          background: 'var(--color-primary-subtle)', 
          padding: '10px 14px', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.88rem',
          color: 'var(--color-primary)',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Clock size={16} />
          <span>{cellInfo.dayLabel} {cellInfo.time} 타임</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 학생 이름 */}
          <div className="modal-form-group">
            <label className="modal-label">학생 이름 *</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="예: 최수연, 박준혁"
              autoFocus
              required
            />
          </div>

          {/* 수업 형태 / 시간 선택 (개편된 8개 옵션) */}
          <div className="modal-form-group">
            <label className="modal-label">수업 형태 / 시간</label>
            <select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value)}
            >
              {LESSON_TYPES.map((type, idx) => (
                <option key={idx} value={type}>{type}</option>
              ))}
            </select>

            {lessonType === '직접 입력' && (
              <input
                type="text"
                placeholder="수업 형태를 직접 입력하세요 (예: 입시 마스터 클래스 60분)"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                style={{ marginTop: '8px' }}
                autoFocus
              />
            )}
          </div>

          {/* 색상 태그 선택 */}
          <div className="modal-form-group">
            <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={14} />
              <span>레슨 카드 색상 태그</span>
            </label>
            <div className="color-picker-row">
              {COLOR_PALETTES.map((c) => (
                <div
                  key={c.id}
                  className={`color-radio-dot ${color === c.id ? 'selected' : ''}`}
                  style={{ backgroundColor: c.badge }}
                  onClick={() => setColor(c.id)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* 개별 메모 / 진도 사항 */}
          <div className="modal-form-group">
            <label className="modal-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} />
                <span>개별 메모 / 진도 사항</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                저장 시 학생별 수업 이력에 자동 누적
              </span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 쇼팽 에튀드 10-4 템포 점검, 체르니 30번 8마디 페달링 지도 등"
              rows={3}
            />
          </div>

          {/* 학생 지난 수업 이력 보기 (히스토리 아코디언 영역) */}
          <div className="student-history-accordion">
            <button
              type="button"
              className="history-accordion-toggle"
              onClick={() => setShowHistory(prev => !prev)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={16} color="var(--color-primary)" />
                <span style={{ fontWeight: '600' }}>
                  📜 {trimmedName ? `'${trimmedName}' 학생` : '학생'} 지난 수업 이력 보기
                </span>
                <span className="history-count-badge">
                  {currentStudentHistory.length}건
                </span>
              </div>
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showHistory && (
              <div className="history-accordion-content">
                {currentStudentHistory.length > 0 ? (
                  <div className="history-list">
                    {currentStudentHistory.map((item) => (
                      <div key={item.id} className="history-item-card">
                        <div className="history-item-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} color="var(--color-text-muted)" />
                            <span className="history-item-date">{item.date}</span>
                            <span className="history-item-type">{item.lessonType}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn-history-action"
                              onClick={() => handleCopyHistoryMemo(item.memo)}
                              title="이 메모를 현재 메모창으로 가져오기"
                            >
                              <Copy size={12} />
                              <span>불러오기</span>
                            </button>
                            {onDeleteStudentHistory && (
                              <button
                                type="button"
                                className="btn-history-delete"
                                onClick={() => {
                                  if (confirm('이 수업 기록을 삭제하시겠습니까?')) {
                                    onDeleteStudentHistory(trimmedName, item.id);
                                  }
                                }}
                                title="이 이력 삭제"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="history-item-memo">
                          {item.memo}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="history-empty-placeholder">
                    {trimmedName 
                      ? `'${trimmedName}' 학생의 기록된 이전 수업 메모가 아직 없습니다. 메모를 작성하고 [변경 저장]을 누르면 날짜별로 누적됩니다.`
                      : '학생 이름을 입력하시면 해당 학생의 지난 수업 메모 이력이 표시됩니다.'
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 모달 하단 버튼 액션 */}
          <div className="modal-actions">
            <div>
              {existingLesson && (
                <button
                  type="button"
                  className="btn-pill"
                  onClick={handleDelete}
                  style={{ color: '#DC2626', borderColor: '#FECACA' }}
                  title="이 레슨 삭제"
                >
                  <Trash2 size={14} />
                  <span>삭제</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-pill" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn-pill btn-primary">
                <Check size={14} />
                <span>{existingLesson ? '변경 저장' : '일정 등록'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
