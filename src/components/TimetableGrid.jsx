import React, { useState, useRef } from 'react';
import { Plus, Calendar, Clock, GripVertical, FileText } from 'lucide-react';
import { DAYS_OF_WEEK, TIME_SLOTS, COLOR_PALETTES } from '../constants';

export default function TimetableGrid({
  lessons = {},
  onSelectCell,
  onMoveLesson,
  year,
  month
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
            <span>운영 시간: <strong>13:00 ~ 20:00 (30분 단위)</strong></span>
          </div>
        </div>
      </div>

      {/* 스크롤 가능한 7개 열 테이블 그리드 */}
      <div className="timetable-scroll-wrap">
        <table className="timetable-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '90px' }}>시간</th>
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

                    return (
                      <td
                        key={slotKey}
                        className={`slot-cell ${isDragTarget ? 'slot-cell-drop-target' : ''} ${isDraggingThis ? 'slot-cell-dragging' : ''}`}
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
                                className={`lesson-card ${isDraggingThis ? 'is-dragging' : ''}`}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, slotKey)}
                                onDragEnd={handleDragEnd}
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
                                        <FileText size={12} />
                                      </span>
                                    )}
                                  </div>
                                  <span 
                                    className="lesson-type-badge" 
                                    style={{ 
                                      backgroundColor: style.badgeBg,
                                      color: style.badgeText
                                    }}
                                  >
                                    {lesson.lessonType}
                                  </span>
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
