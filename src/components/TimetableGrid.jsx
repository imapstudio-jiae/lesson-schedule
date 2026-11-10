import React, { useState, useRef } from 'react';
import { Plus, Calendar, Clock, GripVertical, FileText } from 'lucide-react';
import { DAYS_OF_WEEK, TIME_SLOTS, COLOR_PALETTES } from '../constants';

export default function TimetableGrid({
  lessons = {},
  onSelectCell,
  onMoveLesson,
  year,
  month,
  highlightedSlotKeys = []
}) {
  const [draggedSlotKey, setDraggedSlotKey] = useState(null);
  const [dragOverSlotKey, setDragOverSlotKey] = useState(null);
  const isDraggingRef = useRef(false);

  // 색상 ID로 팔레트 객체 찾기
  const getColorStyle = (colorId) => {
    const pal = COLOR_PALETTES.find(c => c.id === colorId) || COLOR_PALETTES[0];
    return {
      backgroundColor: pal.bg,
      borderColor: pal.border,
      borderLeftColor: pal.badge,
      color: pal.text,
      badgeBg: pal.border,
      badgeText: pal.text,
    };
  };

  // 시간표 카드에서 공간을 적게 차지하도록 수업 형태를 직관적으로 축약
  const formatCompactLessonType = (type) => {
    if (!type) return '';
    if (type.includes('40분')) return '40분';
    if (type.includes('1시간') || type.includes('60분')) return '1시간';
    if (type.includes('합주')) return '합주';
    if (type.includes('성인 그룹')) return '성인';
    if (type.includes('학생 그룹')) return '그룹';
    if (type.includes('보강')) return '보강';
    if (type.includes('녹음')) return '녹음';
    return type.length > 3 ? type.slice(0, 3) : type;
  };


  // 드래그 시작
  const handleDragStart = (e, slotKey) => {
    isDraggingRef.current = true;
    setDraggedSlotKey(slotKey);
    e.dataTransfer.setData('text/plain', slotKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedSlotKey(null);
    setDragOverSlotKey(null);
    // 드래그 종료 직후 클릭 이벤트가 모달을 띄우지 않도록 짧은 지연 후 리셋
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);
  };

  // 드롭 대상 오버
  const handleDragOver = (e, slotKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlotKey !== slotKey) {
      setDragOverSlotKey(slotKey);
    }
  };

  // 드롭 대상 이탈
  const handleDragLeave = (e, slotKey) => {
    // 자식 엘리먼트로 이동하는 경우가 아닌 실제 셀 이탈 시에만 해제
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverSlotKey === slotKey) {
      setDragOverSlotKey(null);
    }
  };

  // 드롭 처리
  const handleDrop = (e, targetSlotKey, targetDayKey, targetTime) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData('text/plain') || draggedSlotKey;

    if (sourceKey && sourceKey !== targetSlotKey && onMoveLesson) {
      onMoveLesson(sourceKey, targetSlotKey, targetDayKey, targetTime);
    }

    setDraggedSlotKey(null);
    setDragOverSlotKey(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 120);
  };

  // ===== 스마트폰 모바일 터치 드래그 앤 드롭 지원 =====
  const touchTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const isTouchDraggingRef = useRef(false);
  const touchSlotSourceRef = useRef(null);

  const handleTouchStart = (e, slotKey) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    touchSlotSourceRef.current = slotKey;
    isTouchDraggingRef.current = false;

    // 180ms 동안 누르고 있으면 드래그 모드 활성화 (단순 탭과 구분)
    touchTimerRef.current = setTimeout(() => {
      isTouchDraggingRef.current = true;
      isDraggingRef.current = true;
      setDraggedSlotKey(slotKey);
      if (navigator.vibrate) {
        try { navigator.vibrate(35); } catch (err) {}
      }
    }, 180);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // 아직 드래그 모드가 아닌 상태에서 손가락이 10px 이상 움직이면 일반 화면 스크롤 허용
    if (!isTouchDraggingRef.current) {
      if (dx > 10 || dy > 10) {
        clearTimeout(touchTimerRef.current);
      }
      return;
    }

    // 드래그 모드 활성화 시 화면 스크롤 방지
    if (e.cancelable) e.preventDefault();

    // 현재 손가락 위치에 있는 셀 탐색
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotCell = targetEl?.closest('.slot-cell');
    if (slotCell) {
      const overKey = slotCell.getAttribute('data-slot-key');
      if (overKey && overKey !== dragOverSlotKey) {
        setDragOverSlotKey(overKey);
      }
    } else {
      setDragOverSlotKey(null);
    }
  };

  const handleTouchEnd = (e) => {
    clearTimeout(touchTimerRef.current);

    if (isTouchDraggingRef.current && touchSlotSourceRef.current) {
      const touch = e.changedTouches[0];
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const slotCell = targetEl?.closest('.slot-cell');

      if (slotCell) {
        const targetSlotKey = slotCell.getAttribute('data-slot-key');
        const targetDayKey = slotCell.getAttribute('data-day-key');
        const targetTime = slotCell.getAttribute('data-time');

        if (targetSlotKey && targetSlotKey !== touchSlotSourceRef.current && onMoveLesson) {
          onMoveLesson(touchSlotSourceRef.current, targetSlotKey, targetDayKey, targetTime);
        }
      }
    }

    setDraggedSlotKey(null);
    setDragOverSlotKey(null);
    touchSlotSourceRef.current = null;

    setTimeout(() => {
      isTouchDraggingRef.current = false;
      isDraggingRef.current = false;
    }, 120);
  };

  return (
    <section className="timetable-section" aria-label="메인 레슨 시간표">
      {/* 시간표 헤더 상태 표시줄 */}
      <div className="timetable-header-bar">
        <div className="timetable-header-title">
          <Calendar size={18} color="var(--color-primary)" />
          <span>주간 레슨 시간표 (월~토)</span>
        </div>

        <div className="timetable-stats">
          <div className="stat-item drag-hint-badge" title="레슨 카드를 드래그하여 다른 요일/시간으로 이동할 수 있습니다.">
            <GripVertical size={14} />
            <span>카드 드래그 이동 가능</span>
          </div>
          <div className="stat-item">
            <Clock size={15} />
            <span>운영 시간: <strong>11:00 ~ 19:00 (30분 단위)</strong></span>
          </div>
        </div>
      </div>

      {/* 스크롤 가능한 7개 열 테이블 그리드 */}
      <div className="timetable-scroll-wrap">
        <table className="timetable-table">
          <colgroup>
            <col style={{ width: '84px', minWidth: '84px' }} />
            {DAYS_OF_WEEK.map((day) => (
              <col key={day.key} style={{ width: 'calc((100% - 84px) / 6)' }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" style={{ width: '84px' }}>시간</th>
              {DAYS_OF_WEEK.map((day) => (
                <th 
                  key={day.key} 
                  scope="col"
                  className={day.key === 'sat' ? 'col-day-sat' : ''}
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => {
              const isHourMark = time.endsWith(':00');

              return (
                <tr key={time}>
                  {/* 첫 번째 열: 시간 */}
                  <td className="time-cell">
                    <span className={isHourMark ? 'time-hour-mark' : 'time-half-mark'}>
                      {time}
                    </span>
                  </td>

                  {/* 6개 요일 열: 월요일 ~ 토요일 (총 7열) */}
                  {DAYS_OF_WEEK.map((day) => {
                    const slotKey = `${day.key}-${time}`;
                    const lesson = lessons[slotKey];
                    const isDraggingThis = draggedSlotKey === slotKey;
                    const isDragTarget = dragOverSlotKey === slotKey && draggedSlotKey !== slotKey;

                    const isHighlighted = highlightedSlotKeys?.includes(slotKey);

                    return (
                      <td
                        key={slotKey}
                        data-slot-key={slotKey}
                        data-day-key={day.key}
                        data-time={time}
                        className={`slot-cell ${isDragTarget ? 'slot-cell-drop-target' : ''} ${isDraggingThis ? 'slot-cell-dragging' : ''} ${isHighlighted ? 'slot-cell-highlighted' : ''}`}
                        onDragOver={(e) => handleDragOver(e, slotKey)}
                        onDragEnter={(e) => handleDragOver(e, slotKey)}
                        onDragLeave={(e) => handleDragLeave(e, slotKey)}
                        onDrop={(e) => handleDrop(e, slotKey, day.key, time)}
                        onClick={() => {
                          if (isDraggingRef.current) return;
                          onSelectCell({
                            slotKey,
                            dayKey: day.key,
                            dayLabel: day.label,
                            time,
                            lesson
                          });
                        }}
                      >
                        {lesson ? (
                          (() => {
                            const style = getColorStyle(lesson.color);
                            const hasMemo = Boolean(lesson.memo && lesson.memo.trim());

                            return (
                              <div 
                                className={`lesson-card ${isDraggingThis ? 'is-dragging' : ''} ${isHighlighted ? 'lesson-card-highlighted' : ''}`}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, slotKey)}
                                onDragEnd={handleDragEnd}
                                onTouchStart={(e) => handleTouchStart(e, slotKey)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                style={{
                                  backgroundColor: style.backgroundColor,
                                  borderColor: style.borderColor,
                                  borderLeftColor: style.borderLeftColor,
                                  borderLeftWidth: '4px',
                                  borderLeftStyle: 'solid'
                                }}
                                title={`${lesson.studentName} (${lesson.lessonType})${hasMemo ? `\n• 메모: ${lesson.memo}` : ''}\n* 클릭하여 세부 정보 수정 및 지난 수업 이력 확인\n* 마우스 드래그로 다른 요일/시간 이동`}
                              >
                                <div className="lesson-card-header">
                                  <div className="lesson-card-student-wrap">
                                    <span className="card-drag-handle" title="드래그하여 이동">
                                      <GripVertical size={12} />
                                    </span>
                                    <span className="student-name" style={{ color: style.color }}>
                                      {lesson.studentName}
                                    </span>
                                    {hasMemo && (
                                      <span className="card-memo-indicator" title={`작성된 메모: ${lesson.memo}`}>
                                        <FileText size={11} />
                                      </span>
                                    )}
                                  </div>
                                  {lesson.lessonType && (
                                    <span 
                                      className="lesson-type-badge" 
                                      title={lesson.lessonType}
                                      style={{ 
                                        backgroundColor: style.badgeBg,
                                        color: style.badgeText
                                      }}
                                    >
                                      {formatCompactLessonType(lesson.lessonType)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className={`cell-empty-placeholder ${isDragTarget ? 'placeholder-drop-ready' : ''}`}>
                            <Plus size={16} />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
