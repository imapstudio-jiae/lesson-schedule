import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  CheckSquare, 
  Square, 
  Palette, 
  Bookmark,
  Sparkles,
  FileText,
  History
} from 'lucide-react';
import { COLOR_PALETTES } from '../constants';

export default function MemoCardsSection({
  memoCards = [],
  onAddCard,
  onDeleteCard,
  onUpdateCardTitle,
  onUpdateCardColor,
  onAddItemToCard,
  onToggleItemCheck,
  onDeleteItemFromCard,
  onOpenDetailModal
}) {
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [colorPickerCardId, setColorPickerCardId] = useState(null);
  const [newItemInputs, setNewItemInputs] = useState({}); // { [cardId]: string }

  const handleStartEditTitle = (card) => {
    setEditingCardId(card.id);
    setEditingTitleText(card.title);
  };

  const handleSaveTitle = (cardId) => {
    if (editingTitleText.trim()) {
      onUpdateCardTitle(cardId, editingTitleText.trim());
    }
    setEditingCardId(null);
  };

  const handleNewItemSubmit = (cardId, e) => {
    e.preventDefault();
    const text = newItemInputs[cardId]?.trim();
    if (!text) return;

    onAddItemToCard(cardId, text);
    setNewItemInputs(prev => ({ ...prev, [cardId]: '' }));
  };

  const getColorTheme = (colorId) => {
    return COLOR_PALETTES.find(c => c.id === colorId) || COLOR_PALETTES[0];
  };

  return (
    <section className="memo-section" aria-label="하단 운영 메모 카드 영역">
      <div className="memo-section-header">
        <div className="memo-section-title-wrap">
          <Bookmark size={20} color="var(--color-primary)" />
          <h3 className="memo-section-title">월간 주요 공지 및 운영 메모 카드</h3>
          <span className="memo-badge-count">{memoCards.length}개 카드</span>
        </div>

        <button 
          className="btn-pill btn-primary"
          onClick={onAddCard}
          title="새로운 메모 카드 추가"
        >
          <Plus size={16} />
          <span>새 메모 카드 추가</span>
        </button>
      </div>

      {/* 동적 메모 카드 그리드 */}
      <div className="memo-cards-grid">
        {memoCards.map((card) => {
          const theme = getColorTheme(card.color);
          const isEditing = editingCardId === card.id;
          const isPickingColor = colorPickerCardId === card.id;

          return (
            <div 
              key={card.id} 
              className="memo-card-item"
              style={{
                borderTop: `4px solid ${theme.badge}`,
              }}
            >
              {/* 카드 상단 헤더 */}
              <div className="memo-card-header">
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                    <input
                      type="text"
                      className="memo-card-title-input"
                      value={editingTitleText}
                      onChange={(e) => setEditingTitleText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle(card.id)}
                      autoFocus
                    />
                    <button 
                      className="icon-btn" 
                      onClick={() => handleSaveTitle(card.id)}
                      title="저장"
                    >
                      <Check size={14} color="var(--color-primary)" />
                    </button>
                    <button 
                      className="icon-btn" 
                      onClick={() => setEditingCardId(null)}
                      title="취소"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="memo-card-title-display"
                    onClick={() => onOpenDetailModal && onOpenDetailModal(card)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartEditTitle(card);
                    }}
                    title="클릭하여 세부 메모 및 날짜별 이력 보기 (더블클릭 시 제목 변경)"
                    style={{ cursor: 'pointer' }}
                  >
                    <span style={{ color: theme.badge }}>●</span>
                    <span style={{ fontWeight: '700' }}>{card.title}</span>
                    {card.history && card.history.length > 0 && (
                      <span className="card-history-mini-badge" title={`누적된 지난 이력: ${card.history.length}건`}>
                        <History size={11} />
                        <span>{card.history.length}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* 카드 상단 도구 (세부 모달 열기, 색상, 제목 수정, 카드 삭제) */}
                <div className="memo-card-tools">
                  <button 
                    className="icon-btn highlight-btn"
                    onClick={() => onOpenDetailModal && onOpenDetailModal(card)}
                    title="세부 메모 & 작성 날짜별 이력 모달 열기"
                  >
                    <FileText size={14} color="var(--color-primary)" />
                  </button>
                  <button 
                    className="icon-btn" 
                    onClick={() => setColorPickerCardId(isPickingColor ? null : card.id)}
                    title="카드 색상 변경"
                  >
                    <Palette size={14} />
                  </button>
                  <button 
                    className="icon-btn" 
                    onClick={() => handleStartEditTitle(card)}
                    title="카드 제목 변경"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    className="icon-btn danger" 
                    onClick={() => {
                      if (confirm(`'${card.title}' 메모 카드를 삭제하시겠습니까?`)) {
                        onDeleteCard(card.id);
                      }
                    }}
                    title="카드 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* 색상 선택기 팝오버 (열렸을 때) */}
              {isPickingColor && (
                <div style={{ 
                  background: 'var(--color-bg-subtle)', 
                  padding: '8px 10px', 
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px'
                }}>
                  {COLOR_PALETTES.map((c) => (
                    <div
                      key={c.id}
                      className={`color-radio-dot ${card.color === c.id ? 'selected' : ''}`}
                      style={{ backgroundColor: c.badge, width: '22px', height: '22px' }}
                      onClick={() => {
                        onUpdateCardColor(card.id, c.id);
                        setColorPickerCardId(null);
                      }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}

              {/* 메모 항목 체크리스트 / 목록 */}
              <div className="memo-items-list">
                {(!card.items || card.items.length === 0) ? (
                  <div style={{ 
                    color: 'var(--color-text-tertiary)', 
                    fontSize: '0.84rem', 
                    padding: '16px 8px',
                    textAlign: 'center' 
                  }}>
                    아직 등록된 메모 항목이 없습니다.
                  </div>
                ) : (
                  card.items.map((item) => {
                    const hasItemHistory = Boolean(item.detailNote || (item.history && item.history.length > 0));

                    return (
                      <div key={item.id} className="memo-item-row">
                        {/* 1. 네모 체크박스 영역 클릭: e.stopPropagation()으로 팝업 차단, 단순 완료/미완료 토글만 동작 */}
                        <div 
                          className="memo-item-checkbox-wrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleItemCheck(card.id, item.id);
                          }}
                          title={item.checked ? "완료 해제" : "완료 체크"}
                        >
                          {item.checked ? (
                            <CheckSquare size={17} color={theme.badge} />
                          ) : (
                            <Square size={17} color="var(--color-text-tertiary)" />
                          )}
                        </div>

                        {/* 2. 항목 글자 텍스트 영역 클릭: 세부 내용 모달(팝업) 열기 */}
                        <span 
                          className={`memo-item-text ${item.checked ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetailModal && onOpenDetailModal(card, item);
                          }}
                          title="클릭하여 세부 메모 작성 및 날짜별 이력 보기"
                        >
                          {item.text}
                        </span>

                        {/* 3. 시각적 피드백: 항목 우측 끝 은은한 📝 메모 아이콘 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
                          <button
                            type="button"
                            className={`memo-item-note-icon-btn ${hasItemHistory ? 'has-note' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDetailModal && onOpenDetailModal(card, item);
                            }}
                            title={hasItemHistory 
                              ? `세부 메모 및 누적 이력 (${item.history?.length || 0}건) 확인하기` 
                              : "세부 메모 작성 및 날짜별 이력 남기기"}
                          >
                            <FileText size={13} />
                            {item.history && item.history.length > 0 && (
                              <span className="item-history-count-dot">
                                {item.history.length}
                              </span>
                            )}
                          </button>

                          {/* 항목 삭제 버튼 */}
                          <button
                            type="button"
                            className="icon-btn memo-item-del-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItemFromCard(card.id, item.id);
                            }}
                            title="항목 삭제"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* 새 항목 추가 입력 줄 */}
              <form 
                className="memo-add-form"
                onSubmit={(e) => handleNewItemSubmit(card.id, e)}
              >
                <input
                  type="text"
                  className="memo-add-input"
                  placeholder="+ 새 항목 입력 후 Enter..."
                  value={newItemInputs[card.id] || ''}
                  onChange={(e) => setNewItemInputs({
                    ...newItemInputs,
                    [card.id]: e.target.value
                  })}
                />
                <button type="submit" className="memo-add-btn">
                  추가
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </section>
  );
}
