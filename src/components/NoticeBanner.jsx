import React, { useState, useEffect } from 'react';
import { Megaphone, Edit3, Check, X } from 'lucide-react';

export default function NoticeBanner({ 
  year, 
  month, 
  noticeText, 
  onSaveNotice 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(noticeText || '');

  // 외부(Firestore 실시간 업데이트 등)에서 noticeText가 바뀔 때 동기화
  useEffect(() => {
    if (!isEditing) {
      setEditText(noticeText || '');
    }
  }, [noticeText, isEditing]);

  const handleStartEdit = () => {
    setEditText(noticeText || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    onSaveNotice(editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(noticeText || '');
    setIsEditing(false);
  };

  return (
    <section className="notice-card" aria-label="운영 안내문">
      <div className="notice-header">
        <div className="notice-title-wrap">
          <Megaphone size={18} />
          <span>{year}년 {month}월 스튜디오 운영 안내사항</span>
        </div>

        {!isEditing ? (
          <button 
            className="notice-edit-btn" 
            onClick={handleStartEdit}
            title="운영 안내문 문구 수정"
          >
            <Edit3 size={13} />
            <span>수정</span>
          </button>
        ) : (
          <div className="notice-edit-actions">
            <button 
              className="btn-pill" 
              onClick={handleCancel}
              style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            >
              <X size={13} />
              <span>취소</span>
            </button>
            <button 
              className="btn-pill btn-primary" 
              onClick={handleSave}
              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            >
              <Check size={13} />
              <span>저장 및 공유</span>
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <textarea
          className="notice-textarea"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="이번 달 레슨 운영 안내, 휴원 일정, 준비사항 등을 자유롭게 입력하세요 (실시간 공유됩니다)."
          autoFocus
        />
      ) : (
        <div className="notice-content">
          {noticeText ? noticeText : (
            <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              등록된 운영 안내문이 없습니다. 우측 '수정' 버튼을 눌러 공지사항을 작성해보세요.
            </span>
          )}
        </div>
      )}
    </section>
  );
}
