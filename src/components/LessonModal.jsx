import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, User, Clock, FileText, Palette } from 'lucide-react';
import { LESSON_TYPES, COLOR_PALETTES } from '../constants';

export default function LessonModal({
  isOpen,
  onClose,
  cellInfo, // { slotKey, dayKey, dayLabel, time, lesson }
  onSaveLesson,
  onDeleteLesson
}) {
  // 모든 훅은 조건부 return 이전에 선언해야 함
  const [studentName, setStudentName] = useState('');
  const [lessonType, setLessonType] = useState('40분 정규 레슨');
  const [customType, setCustomType] = useState('');
  const [color, setColor] = useState('orange');
  const [memo, setMemo] = useState('');

  const existingLesson = cellInfo?.lesson ?? null;

  useEffect(() => {
    if (!isOpen || !cellInfo) return;

    if (existingLesson) {
      setStudentName(existingLesson.studentName || '');
      setLessonType(existingLesson.lessonType || '40분 정규 레슨');
      setColor(existingLesson.color || 'orange');
      setMemo(existingLesson.memo || '');
      setCustomType('');
    } else {
      setStudentName('');
      setLessonType('40분 정규 레슨');
      setColor('orange');
      setMemo('');
      setCustomType('');
    }
  }, [isOpen, cellInfo, existingLesson]);

  // 모달이 닫혀 있거나 cellInfo 없으면 렌더링 안함
  if (!isOpen || !cellInfo) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert('학생 이름을 입력해주세요.');
      return;
    }

    const finalType = lessonType === '직접 입력' ? (customType.trim() || '개인 레슨') : lessonType;

    const lessonData = {
      id: existingLesson?.id || `lesson-${Date.now()}`,
      studentName: studentName.trim(),
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
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

          {/* 수업 형태 / 시간 선택 */}
          <div className="modal-form-group">
            <label className="modal-label">수업 형태 / 시간</label>
            <select
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value)}
            >
              {LESSON_TYPES.map((t, idx) => (
                <option key={idx} value={t.label}>{t.label}</option>
              ))}
              <option value="직접 입력">직접 입력...</option>
            </select>

            {lessonType === '직접 입력' && (
              <input
                type="text"
                placeholder="수업 형태 직접 입력 (예: 재즈피아노 45분)"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                style={{ marginTop: '6px' }}
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

          {/* 개별 메모 */}
          <div className="modal-form-group">
            <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} />
              <span>개별 메모 / 진도 사항</span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 체르니 30번 5페이지 점검, 페달링 테크닉, 상담 예정 등"
              rows={3}
            />
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
