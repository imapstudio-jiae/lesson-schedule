import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Trash2, 
  Calendar, 
  Copy, 
  FileText, 
  History, 
  Bookmark, 
  Clock 
} from 'lucide-react';
import { COLOR_PALETTES } from '../constants';

export default function MemoDetailModal({
  isOpen,
  onClose,
  card,
  onSaveCardDetail,
  onDeleteCardHistory
}) {
  const [detailNote, setDetailNote] = useState('');
  const [cardTitle, setCardTitle] = useState('');

  useEffect(() => {
    if (!isOpen || !card) return;
    setDetailNote(card.detailNote || '');
    setCardTitle(card.title || '운영 메모');
  }, [isOpen, card]);

  if (!isOpen || !card) return null;

  const theme = COLOR_PALETTES.find(c => c.id === card.color) || COLOR_PALETTES[0];
  const historyList = card.history || [];

  const handleSave = (e) => {
    e.preventDefault();
    const trimmedNote = detailNote.trim();
    if (!trimmedNote) {
      alert('세부 메모 내용을 입력해주세요.');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 새 이력 객체 생성
    const newHistoryItem = {
      id: `memo-hist-${Date.now()}`,
      date: dateStr,
      note: trimmedNote
    };

    onSaveCardDetail(card.id, trimmedNote, newHistoryItem);
    onClose();
  };

  const handleCopyHistory = (text) => {
    if (detailNote && detailNote.trim()) {
      if (confirm('현재 작성 중인 메모를 이전 메모 내용으로 교체하시겠습니까?')) {
        setDetailNote(text);
      }
    } else {
      setDetailNote(text);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card memo-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* 모달 상단 헤더 */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{ 
                display: 'inline-block', 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: theme.badge 
              }} 
            />
            <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>
              {card.title} - 세부 메모 & 진행 상황
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose} title="닫기">
            <X size={18} />
          </button>
        </div>

        {/* 안내 뱃지 */}
        <div style={{ 
          background: theme.bg, 
          borderColor: theme.border, 
          borderWidth: '1px', 
          borderStyle: 'solid', 
          padding: '10px 14px', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: theme.text,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Bookmark size={16} />
          <span>해당 카드의 세부 진행 사항을 작성하고 저장하면, 날짜별 이력으로 자동 누적됩니다.</span>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 세부 메모 / 진행 상황 입력 영역 */}
          <div className="modal-form-group">
            <label className="modal-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="var(--color-primary)" />
                <span style={{ fontWeight: '600' }}>세부 내용 및 진행 상황 메모 *</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                저장 시 작성 일시와 함께 이력에 기록
              </span>
            </label>
            <textarea
              className="memo-detail-textarea"
              value={detailNote}
              onChange={(e) => setDetailNote(e.target.value)}
              placeholder="예: 10월 조율사 방문 일정 조율 완료, 연습실 냉난방기 필터 교체 건 진행 중 등"
              rows={4}
              autoFocus
              required
            />
          </div>

          {/* 지난 메모 이력 보기 영역 */}
          <div className="memo-history-section">
            <div className="memo-history-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={15} color="var(--color-primary)" />
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>📜 지난 메모 이력 보기</span>
              </div>
              <span className="history-count-badge">
                {historyList.length}건
              </span>
            </div>

            <div className="memo-history-list-box">
              {historyList.length > 0 ? (
                <div className="history-list">
                  {historyList.map((item) => (
                    <div key={item.id} className="history-item-card">
                      <div className="history-item-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} color="var(--color-text-muted)" />
                          <span className="history-item-date">{item.date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn-history-action"
                            onClick={() => handleCopyHistory(item.note)}
                            title="이 메모 내용을 현재 입력창으로 가져오기"
                          >
                            <Copy size={12} />
                            <span>불러오기</span>
                          </button>
                          {onDeleteCardHistory && (
                            <button
                              type="button"
                              className="btn-history-delete"
                              onClick={() => {
                                if (confirm('이 메모 기록을 삭제하시겠습니까?')) {
                                  onDeleteCardHistory(card.id, item.id);
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
                        {item.note}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="history-empty-placeholder">
                  아직 기록된 지난 메모 이력이 없습니다. 세부 메모를 작성하고 [저장]을 누르면 작성 날짜별로 누적됩니다.
                </div>
              )}
            </div>
          </div>

          {/* 모달 하단 버튼 */}
          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <div />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-pill" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn-pill btn-primary">
                <Check size={14} />
                <span>저장 (이력 누적)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
