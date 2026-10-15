import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  History,
  GripVertical,
  GripHorizontal
} from 'lucide-react';
import { COLOR_PALETTES } from '../constants';

// ─── 드래그 가능한 카드 내부 항목(row) ─────────────────────────────────────────
function SortableItem({ item, cardId, theme, onToggleItemCheck, onDeleteItemFromCard, onOpenDetailModal, isDraggingOver }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
  };

  const hasItemHistory = Boolean(item.detailNote || (item.history && item.history.length > 0));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`memo-item-row${isDragging ? ' is-dragging' : ''}`}
    >
      {/* 드래그 핸들 */}
      <div
        className="drag-handle"
        {...attributes}
        {...listeners}
        title="드래그하여 순서 변경"
      >
        <GripVertical size={14} />
      </div>

      {/* 체크박스 */}
      <div 
        className="memo-item-checkbox-wrap"
        onClick={(e) => {
          e.stopPropagation();
          onToggleItemCheck(cardId, item.id);
        }}
        title={item.checked ? '완료 해제' : '완료 체크'}
      >
        {item.checked ? (
          <CheckSquare size={17} color={theme.badge} />
        ) : (
          <Square size={17} color="var(--color-text-tertiary)" />
        )}
      </div>

      {/* 항목 텍스트 */}
      <span 
        className={`memo-item-text ${item.checked ? 'checked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetailModal && onOpenDetailModal(null, item);
        }}
        title="클릭하여 세부 메모 작성 및 날짜별 이력 보기"
      >
        {item.text}
      </span>

      {/* 우측 버튼들 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}>
        <button
          type="button"
          className={`memo-item-note-icon-btn ${hasItemHistory ? 'has-note' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetailModal && onOpenDetailModal(null, item);
          }}
          title={hasItemHistory 
            ? `세부 메모 및 누적 이력 (${item.history?.length || 0}건) 확인하기` 
            : '세부 메모 작성 및 날짜별 이력 남기기'}
        >
          <FileText size={13} />
          {item.history && item.history.length > 0 && (
            <span className="item-history-count-dot">
              {item.history.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className="icon-btn memo-item-del-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteItemFromCard(cardId, item.id);
          }}
          title="항목 삭제"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── 드래그 가능한 카드 전체 ────────────────────────────────────────────────────
function SortableCard({
  card,
  editingCardId,
  editingTitleText,
  colorPickerCardId,
  newItemInputs,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  setEditingTitleText,
  setColorPickerCardId,
  setNewItemInputs,
  onUpdateCardColor,
  onDeleteCard,
  onToggleItemCheck,
  onDeleteItemFromCard,
  onOpenDetailModal,
  onAddItemToCard,
  onReorderItems,
  isDragOverlay = false
}) {
  const theme = COLOR_PALETTES.find(c => c.id === card.color) || COLOR_PALETTES[0];
  const isEditing = editingCardId === card.id;
  const isPickingColor = colorPickerCardId === card.id;

  // 카드 자체 Sortable
  const {
    attributes: cardAttrs,
    listeners: cardListeners,
    setNodeRef: cardRef,
    transform,
    transition,
    isDragging: isCardDragging
  } = useSortable({ id: card.id });

  const cardStyle = isDragOverlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCardDragging ? 0.4 : 1,
  };

  // 카드 내부 항목 DnD 센서
  const itemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleItemDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = card.items || [];
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorderItems(card.id, reordered);
  };

  const handleNewItemSubmit = (e) => {
    e.preventDefault();
    const text = newItemInputs[card.id]?.trim();
    if (!text) return;
    onAddItemToCard(card.id, text);
    setNewItemInputs(prev => ({ ...prev, [card.id]: '' }));
  };

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      className={`memo-card-item${isCardDragging ? ' is-dragging' : ''}`}
    >
      {/* 카드 상단 헤더 */}
      <div className="memo-card-header" style={{ borderTop: `4px solid ${theme.badge}` }}>
        {/* 카드 드래그 핸들 */}
        <div
          className="card-drag-handle"
          {...cardAttrs}
          {...cardListeners}
          title="드래그하여 카드 순서 변경"
        >
          <GripHorizontal size={15} />
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
            <input
              type="text"
              className="memo-card-title-input"
              value={editingTitleText}
              onChange={(e) => setEditingTitleText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveTitle(card.id);
                if (e.key === 'Escape') onCancelEditTitle();
              }}
              autoFocus
            />
            <button 
              className="icon-btn" 
              onClick={() => onSaveTitle(card.id)}
              title="저장"
            >
              <Check size={14} color="var(--color-primary)" />
            </button>
            <button 
              className="icon-btn" 
              onClick={onCancelEditTitle}
              title="취소"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div 
            className="memo-card-title-display"
            onClick={() => onOpenDetailModal && onOpenDetailModal(card, null)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartEditTitle(card);
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

        {/* 카드 도구 버튼들 */}
        <div className="memo-card-tools">
          <button 
            className="icon-btn highlight-btn"
            onClick={() => onOpenDetailModal && onOpenDetailModal(card, null)}
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
            onClick={() => onStartEditTitle(card)}
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

      {/* 색상 선택기 */}
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

      {/* 항목 목록 (내부 DnD) */}
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
          <DndContext
            sensors={itemSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext
              items={(card.items || []).map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {(card.items || []).map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  cardId={card.id}
                  theme={theme}
                  onToggleItemCheck={onToggleItemCheck}
                  onDeleteItemFromCard={onDeleteItemFromCard}
                  onOpenDetailModal={(_, it) => onOpenDetailModal && onOpenDetailModal(card, it)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 새 항목 추가 폼 */}
      <form 
        className="memo-add-form"
        onSubmit={handleNewItemSubmit}
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
}

// ─── 메인 섹션 컴포넌트 ─────────────────────────────────────────────────────────
export default function MemoCardsSection({
  memoCards = [],
  onAddCard,
  onDeleteCard,
  onUpdateCardTitle,
  onUpdateCardColor,
  onAddItemToCard,
  onToggleItemCheck,
  onDeleteItemFromCard,
  onOpenDetailModal,
  onReorderCards,
  onReorderItems
}) {
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [colorPickerCardId, setColorPickerCardId] = useState(null);
  const [newItemInputs, setNewItemInputs] = useState({});
  const [activeCardId, setActiveCardId] = useState(null); // DragOverlay용

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

  const handleCancelEditTitle = () => {
    setEditingCardId(null);
    setEditingTitleText('');
  };

  // 카드 자체 DnD 센서
  const cardSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleCardDragStart = (event) => {
    setActiveCardId(event.active.id);
    // 색상 피커 닫기
    setColorPickerCardId(null);
  };

  const handleCardDragEnd = (event) => {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = memoCards.findIndex(c => c.id === active.id);
    const newIndex = memoCards.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(memoCards, oldIndex, newIndex);
    onReorderCards(reordered);
  };

  const activeCard = activeCardId ? memoCards.find(c => c.id === activeCardId) : null;

  const sharedCardProps = {
    editingCardId,
    editingTitleText,
    colorPickerCardId,
    newItemInputs,
    onStartEditTitle: handleStartEditTitle,
    onSaveTitle: handleSaveTitle,
    onCancelEditTitle: handleCancelEditTitle,
    setEditingTitleText,
    setColorPickerCardId,
    setNewItemInputs,
    onUpdateCardColor,
    onDeleteCard,
    onToggleItemCheck,
    onDeleteItemFromCard,
    onOpenDetailModal,
    onAddItemToCard,
    onReorderItems
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

      {/* 카드 그리드 (카드 자체 DnD) */}
      <DndContext
        sensors={cardSensors}
        collisionDetection={closestCenter}
        onDragStart={handleCardDragStart}
        onDragEnd={handleCardDragEnd}
      >
        <SortableContext
          items={memoCards.map(c => c.id)}
          strategy={rectSortingStrategy}
        >
          <div className="memo-cards-grid">
            {memoCards.map((card) => (
              <SortableCard
                key={card.id}
                card={card}
                {...sharedCardProps}
              />
            ))}
          </div>
        </SortableContext>

        {/* 드래그 오버레이 (유령 카드) */}
        <DragOverlay>
          {activeCard ? (
            <div
              className="memo-card-item drag-overlay-card"
              style={{
                borderTop: `4px solid ${(COLOR_PALETTES.find(c => c.id === activeCard.color) || COLOR_PALETTES[0]).badge}`,
                opacity: 0.92,
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                transform: 'rotate(1.5deg) scale(1.03)',
                cursor: 'grabbing'
              }}
            >
              <div className="memo-card-header">
                <div className="memo-card-title-display" style={{ cursor: 'grabbing' }}>
                  <span style={{ color: (COLOR_PALETTES.find(c => c.id === activeCard.color) || COLOR_PALETTES[0]).badge }}>●</span>
                  <span style={{ fontWeight: '700' }}>{activeCard.title}</span>
                </div>
              </div>
              <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                항목 {activeCard.items?.length || 0}개
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
