import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Trash2, 
  Copy, 
  FileText, 
  History, 
  Bookmark, 
  Clock,
  Edit2,
  Save
} from 'lucide-react';
import { COLOR_PALETTES } from '../constants';

export default function MemoDetailModal({
  isOpen,
  onClose,
  card,
  activeItem = null,
  onSaveCardDetail,
  onDeleteCardHistory,
  onUpdateItemTitle,
  onUpdateCardTitle,
  onEditCardHistory    // 이력 항목 내용 수정 콜백
}) {
  const [detailNote, setDetailNote] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState('');

  // 이력 인라인 수정 상태
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editingHistoryText, setEditingHistoryText] = useState('');

  const targetNote = activeItem ? (activeItem.detailNote || '') : (card?.detailNote || '');
  const historyList = activeItem ? (activeItem.history || []) : (card?.history || []);

  useEffect(() => {
    if (!isOpen || !card) return;
    setDetailNote(targetNote);
    setIsEditingTitle(false);
    setEditingTitleText('');
    setEditingHistoryId(null);
    setEditingHistoryText('');
  }, [isOpen, card, activeItem]);

  if (!isOpen || !card) return null;

  const theme = COLOR_PALETTES.find(c => c.id === card.color) || COLOR_PALETTES[0];
  const titleText = activeItem ? activeItem.text : card.title;
  const subCategoryText = activeItem ? `${card.title} 항목` : '운영 메모 카드';

  // ─── 제목 수정 ───────────────────────────────────────────────
  const handleStartEditTitle = () => {
    setEditingTitleText(titleText);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmed = editingTitleText.trim();
    if (!trimmed) return;
    if (activeItem && onUpdateItemTitle) {
      onUpdateItemTitle(card.id, activeItem.id, trimmed);
    } else if (!activeItem && onUpdateCardTitle) {
      onUpdateCardTitle(card.id, trimmed);
    }
    setIsEditingTitle(false);
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditingTitleText('');
  };

  // ─── 새 메모 저장 (빈칸 허용) ────────────────────────────────
  const handleSave = (e) => {
    e.preventDefault();

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const noteToSave = detailNote; // 빈칸도 그대로 허용

    const newHistoryItem = {
      id: `memo-hist-${Date.now()}`,
      date: dateStr,
      note: noteToSave
    };

    onSaveCardDetail(card.id, activeItem?.id || null, noteToSave, newHistoryItem);
    onClose();
  };

  // ─── 불러오기 ────────────────────────────────────────────────
  const handleCopyHistory = (text) => {
    if (detailNote && detailNote.trim()) {
      if (confirm('현재 작성 중인 메모를 이전 메모 내용으로 교체하시겠습니까?')) {
        setDetailNote(text);
      }
    } else {
      setDetailNote(text);
    }
  };

  // ─── 이력 인라인 수정 ─────────────────────────────────────────
  const handleStartEditHistory = (item) => {
    setEditingHistoryId(item.id);
    setEditingHistoryText(item.note);
  };

  const handleSaveHistoryEdit = (historyItemId) => {
    if (onEditCardHistory) {
      onEditCardHistory(card.id, activeItem?.id || null, historyItemId, editingHistoryText);
    }
    setEditingHistoryId(null);
    setEditingHistoryText('');
  };

  const handleCancelHistoryEdit = () => {
    setEditingHistoryId(null);
    setEditingHistoryText('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card memo-detail-modal" onClick={(e) => e.stopPropagation()}>

        {/* 모달 상단 헤더 */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <span 
              style={{ 
                display: 'inline-block', 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: theme.badge,
                flexShrink: 0
              }} 
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                {subCategoryText}
              </div>

              {isEditingTitle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <input
                    type="text"
                    className="memo-card-title-input"
                    value={editingTitleText}
                    onChange={(e) => setEditingTitleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') handleCancelEditTitle();
                    }}
                    autoFocus
                    style={{ flex: 1, fontSize: '1rem', fontWeight: '700' }}
                  />
                  <button type="button" className="icon-btn" onClick={handleSaveTitle} title="제목 저장">
                    <Check size={14} color="var(--color-primary)" />
                  </button>
                  <button type="button" className="icon-btn" onClick={handleCancelEditTitle} title="취소">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 className="modal-title" style={{ fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                    {titleText}
                  </h3>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handleStartEditTitle}
                    title={activeItem ? '항목 제목 수정' : '카드 제목 수정'}
                    style={{ flexShrink: 0, opacity: 0.65 }}
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="닫기">
            <X size={18} />
          </button>
        </div>

        {/* 상단 안내 배너 */}
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
          <span>
            {activeItem 
              ? `'${activeItem.text}' 항목의 세부 진행 메모를 작성하고 저장하면 날짜별 이력으로 자동 누적됩니다.`
              : '해당 카드의 세부 진행 사항을 작성하고 저장하면, 날짜별 이력으로 자동 누적됩니다.'}
          </span>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 세부 메모 입력 영역 */}
          <div className="modal-form-group">
            <label className="modal-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="var(--color-primary)" />
                <span style={{ fontWeight: '600' }}>세부 메모 및 진행 상황 기록</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                저장 시 작성 일시와 함께 이력에 누적
              </span>
            </label>
            <textarea
              className="memo-detail-textarea"
              value={detailNote}
              onChange={(e) => setDetailNote(e.target.value)}
              placeholder="예: Love Story 도입부 페달링 릴리즈 점검, 진행 상황 및 관련 세부 메모 입력... (빈칸으로 저장 가능)"
              rows={4}
              autoFocus={!isEditingTitle}
            />
          </div>

          {/* 지난 메모 이력 */}
          <div className="memo-history-section">
            <div className="memo-history-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={15} color="var(--color-primary)" />
                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>📜 지난 메모 이력</span>
              </div>
              <span className="history-count-badge">{historyList.length}건</span>
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
                          {/* 불러오기 (수정 중이 아닐 때만) */}
                          {editingHistoryId !== item.id && (
                            <button
                              type="button"
                              className="btn-history-action"
                              onClick={() => handleCopyHistory(item.note)}
                              title="이 메모 내용을 현재 입력창으로 가져오기"
                            >
                              <Copy size={12} />
                              <span>불러오기</span>
                            </button>
                          )}

                          {/* 수정 버튼 */}
                          {editingHistoryId === item.id ? (
                            <>
                              <button
                                type="button"
                                className="btn-history-action btn-history-save"
                                onClick={() => handleSaveHistoryEdit(item.id)}
                                title="수정 내용 저장"
                              >
                                <Save size={12} />
                                <span>저장</span>
                              </button>
                              <button
                                type="button"
                                className="btn-history-action"
                                onClick={handleCancelHistoryEdit}
                                title="수정 취소"
                              >
                                <X size={12} />
                                <span>취소</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn-history-action"
                              onClick={() => handleStartEditHistory(item)}
                              title="이 이력 내용 수정"
                            >
                              <Edit2 size={12} />
                              <span>수정</span>
                            </button>
                          )}

                          {/* 삭제 버튼 */}
                          {onDeleteCardHistory && editingHistoryId !== item.id && (
                            <button
                              type="button"
                              className="btn-history-delete"
                              onClick={() => {
                                if (confirm('이 메모 기록을 삭제하시겠습니까?')) {
                                  onDeleteCardHistory(card.id, activeItem?.id || null, item.id);
                                }
                              }}
                              title="이 이력 삭제"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 이력 내용 - 수정 중이면 textarea, 아니면 텍스트 */}
                      {editingHistoryId === item.id ? (
                        <textarea
                          className="history-item-edit-textarea"
                          value={editingHistoryText}
                          onChange={(e) => setEditingHistoryText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') handleCancelHistoryEdit();
                            // Ctrl+Enter로도 저장
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveHistoryEdit(item.id);
                          }}
                          rows={3}
                          autoFocus
                        />
                      ) : (
                        <div className="history-item-memo">
                          {item.note || <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>(빈 메모)</span>}
                        </div>
                      )}
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

          {/* 하단 버튼 */}
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
