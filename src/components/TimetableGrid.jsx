import React from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { DAYS_OF_WEEK, TIME_SLOTS, COLOR_PALETTES } from '../constants';

export default function TimetableGrid({
  lessons = {},
  onSelectCell,
  year,
  month
}) {
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

  // 총 등록된 레슨 수 계산
  const totalLessons = Object.keys(lessons).length;

  return (
    <section className="timetable-section" aria-label="메인 레슨 시간표">
      {/* 시간표 헤더 상태 표시줄 */}
      <div className="timetable-header-bar">
        <div className="timetable-header-title">
          <Calendar size={18} color="var(--color-primary)" />
          <span>주간 레슨 시간표 (월~토)</span>
        </div>

        <div className="timetable-stats">
          <div className="stat-item">
            <Clock size={15} />
            <span>운영 시간: <strong>06:00 ~ 20:00 (30분 단위)</strong></span>
          </div>
          <div className="stat-item">
            <span>이번 달 배정 레슨: <span className="stat-count">{totalLessons}</span>건</span>
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

                    return (
                      <td
                        key={slotKey}
                        className="slot-cell"
                        onClick={() => onSelectCell({
                          slotKey,
                          dayKey: day.key,
                          dayLabel: day.label,
                          time,
                          lesson
                        })}
                      >
                        {lesson ? (
                          (() => {
                            const style = getColorStyle(lesson.color);
                            return (
                              <div 
                                className="lesson-card"
                                style={{
                                  backgroundColor: style.backgroundColor,
                                  borderColor: style.borderColor,
                                  borderLeftColor: style.borderLeftColor,
                                  borderLeftWidth: '4px',
                                  borderLeftStyle: 'solid'
                                }}
                                title={`${lesson.studentName} (${lesson.lessonType}) - ${lesson.memo || '메모 없음'}`}
                              >
                                <div className="lesson-card-header">
                                  <span className="student-name" style={{ color: style.color }}>
                                    {lesson.studentName}
                                  </span>
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
                                {lesson.memo && (
                                  <p className="lesson-card-memo">
                                    {lesson.memo}
                                  </p>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="cell-empty-placeholder">
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
