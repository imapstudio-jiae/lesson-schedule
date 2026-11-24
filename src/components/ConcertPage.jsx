import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, X, Pencil } from 'lucide-react';
import { getSupabaseData, saveSupabaseData } from '../supabase';
import { realtimeSync } from '../realtimeSync';
import {
  CONCERT_STORAGE_KEY,
  CONCERT_LOCAL_KEY,
  PERFORMANCE_FORMS,
  PERFORMANCE_STATUSES,
  defaultConcerts,
  normalizeConcerts,
  summarizeShow,
  formatShowDate,
  buildKakaoText,
  newId
} from '../concertDefaults';
import '../concert.css';

const STATUS_CLASS = { '확정': 'confirmed', '후보': 'candidate', '미정': 'pending' };
const EMPTY_ITEM = { performer: '', form: '솔로', song: '', status: '미정', memo: '' };
const EMPTY_SHOW = { title: '', date: '', meta: '' };

function nextStatus(status) {
  const i = PERFORMANCE_STATUSES.indexOf(status);
  return PERFORMANCE_STATUSES[(i + 1) % PERFORMANCE_STATUSES.length];
}

function StatusBadge({ status, onClick, name }) {
  return (
    <button
      type="button"
      className={`concert-status ${STATUS_CLASS[status] || 'pending'}`}
      onClick={onClick}
      title="누를 때마다 확정 → 후보 → 미정 순서로 바뀝니다"
      aria-label={`${name || '항목'} 상태 ${status}, 눌러서 변경`}
    >
      <i aria-hidden="true" />
      {status}
    </button>
  );
}

// 공연 추가 / 정보 수정 폼
function ShowForm({ mode, initial, onCancel, onSubmit, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY_SHOW, ...(initial || {}) });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title.trim(),
      date: form.date || '',
      meta: form.meta.trim()
    });
  };

  return (
    <form className="concert-show-form" onSubmit={submit}>
      <div className="concert-show-form-head">
        <b>{mode === 'add' ? '새 공연 추가' : '공연 정보 수정'}</b>
        <button type="button" className="concert-icon-btn" onClick={onCancel} aria-label="닫기">
          <X size={16} />
        </button>
      </div>

      <div className="concert-show-fields">
        <label className="concert-field wide">
          <span>공연 이름</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="예: 2027년 봄 정기 공연"
            autoFocus
          />
        </label>
        <label className="concert-field">
          <span>날짜 (선택)</span>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label className="concert-field wide">
          <span>규모 · 메모 (선택)</span>
          <input
            type="text"
            value={form.meta}
            onChange={(e) => set('meta', e.target.value)}
            placeholder="예: 학생 5명 · 가족 약 25명"
          />
        </label>
      </div>

      <div className="concert-show-form-foot">
        {mode === 'edit' && onDelete ? (
          <button
            type="button"
            className={`concert-btn danger${confirmDelete ? ' confirming' : ''}`}
            onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 size={14} />
            {confirmDelete ? '정말 삭제할까요?' : '공연 삭제'}
          </button>
        ) : (
          <span />
        )}
        <div className="concert-show-form-actions">
          <button type="button" className="concert-btn ghost" onClick={onCancel}>취소</button>
          <button type="submit" className="concert-btn primary">{mode === 'add' ? '공연 만들기' : '저장'}</button>
        </div>
      </div>
    </form>
  );
}

export default function ConcertPage() {
  const [data, setData] = useState(() => defaultConcerts());
  const [ready, setReady] = useState(false);
  const [showEditor, setShowEditor] = useState(null); // { mode: 'add' | 'edit' }
  const [draft, setDraft] = useState(EMPTY_ITEM);
  const [toast, setToast] = useState('');

  const dirtyRef = useRef(false);
  const editedRef = useRef(false);
  const dataRef = useRef(data);
  const toastTimer = useRef(null);
  dataRef.current = data;

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── 불러오기: 로컬 즉시 → 클라우드 ──
  useEffect(() => {
    let cancelled = false;
    dirtyRef.current = false;
    editedRef.current = false;

    let local = null;
    try {
      const raw = localStorage.getItem(CONCERT_LOCAL_KEY);
      if (raw) local = JSON.parse(raw);
    } catch (e) {
      console.warn('[Concerts] 로컬 데이터 파싱 실패:', e);
    }
    const initial = normalizeConcerts(local);
    setData(initial);
    setReady(true);

    getSupabaseData(CONCERT_STORAGE_KEY).then((cloud) => {
      if (cancelled) return;
      if (cloud && Array.isArray(cloud.shows) && cloud.shows.length && !editedRef.current) {
        const normalized = normalizeConcerts(cloud);
        setData(normalized);
        try {
          localStorage.setItem(CONCERT_LOCAL_KEY, JSON.stringify(normalized));
        } catch (e) {}
      } else if (!cloud) {
        // 클라우드에 아직 없으면 지금 화면(기본 셋리스트)을 첫 데이터로 올린다
        const snapshot = local ? normalizeConcerts(local) : initial;
        try {
          localStorage.setItem(CONCERT_LOCAL_KEY, JSON.stringify(snapshot));
        } catch (e) {}
        saveSupabaseData(CONCERT_STORAGE_KEY, snapshot).catch(() => {});
      }
    });

    const unsubscribe = realtimeSync.subscribe(({ payloadKey, data: incoming }) => {
      if (payloadKey !== CONCERT_STORAGE_KEY || !incoming) return;
      if (editedRef.current) return;
      setData(normalizeConcerts(incoming));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const apply = useCallback((updater) => {
    dirtyRef.current = true;
    editedRef.current = true;
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...next, updatedAt: Date.now() };
    });
  }, []);

  // ── 변경 시: 로컬 + 클라우드 + 실시간 동기화 (700ms 디바운스) ──
  useEffect(() => {
    if (!ready || !dirtyRef.current) return;
    const snapshot = data;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(CONCERT_LOCAL_KEY, JSON.stringify(snapshot));
      } catch (e) {}
      saveSupabaseData(CONCERT_STORAGE_KEY, snapshot).catch(() => {});
      realtimeSync.broadcastUpdate(CONCERT_STORAGE_KEY, snapshot);
      dirtyRef.current = false;
    }, 700);
    return () => clearTimeout(timer);
  }, [data, ready]);

  // 탭을 옮기거나 닫는 순간에도 저장 유실 없이 반영
  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return;
      const snapshot = dataRef.current;
      if (!snapshot) return;
      try {
        localStorage.setItem(CONCERT_LOCAL_KEY, JSON.stringify(snapshot));
      } catch (e) {}
      saveSupabaseData(CONCERT_STORAGE_KEY, snapshot).catch(() => {});
      realtimeSync.broadcastUpdate(CONCERT_STORAGE_KEY, snapshot);
      dirtyRef.current = false;
    };
  }, []);

  const activeShow = useMemo(
    () => data.shows.find((s) => s.id === data.activeShowId) || data.shows[0],
    [data]
  );
  const stats = useMemo(() => summarizeShow(activeShow), [activeShow]);

  const selectShow = (showId) => apply((d) => ({ ...d, activeShowId: showId }));

  const updateShow = (showId, patch) =>
    apply((d) => ({
      ...d,
      shows: d.shows.map((s) => (s.id === showId ? { ...s, ...patch } : s))
    }));

  const updateItem = (showId, itemId, patch) =>
    apply((d) => ({
      ...d,
      shows: d.shows.map((s) =>
        s.id === showId
          ? { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
          : s
      )
    }));

  const moveItem = (showId, index, dir) =>
    apply((d) => ({
      ...d,
      shows: d.shows.map((s) => {
        if (s.id !== showId) return s;
        const target = index + dir;
        if (target < 0 || target >= s.items.length) return s;
        const items = [...s.items];
        [items[index], items[target]] = [items[target], items[index]];
        return { ...s, items };
      })
    }));

  const deleteItem = (showId, itemId) =>
    apply((d) => ({
      ...d,
      shows: d.shows.map((s) =>
        s.id === showId ? { ...s, items: s.items.filter((it) => it.id !== itemId) } : s
      )
    }));

  const addItem = (showId, payload) =>
    apply((d) => ({
      ...d,
      shows: d.shows.map((s) =>
        s.id === showId ? { ...s, items: [...s.items, { ...payload, id: newId('item') }] } : s
      )
    }));

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!activeShow) return;
    if (!draft.performer.trim() && !draft.song.trim()) {
      showToast('출연자나 곡명을 먼저 적어 주세요');
      return;
    }
    addItem(activeShow.id, {
      performer: draft.performer.trim(),
      form: draft.form,
      song: draft.song.trim(),
      status: draft.status,
      memo: draft.memo.trim()
    });
    setDraft({ ...EMPTY_ITEM, form: draft.form, status: '미정' });
    showToast('셋리스트에 항목을 추가했어요');
  };

  const handleAddShow = (payload) => {
    const id = newId('show');
    apply((d) => ({
      ...d,
      activeShowId: id,
      shows: [...d.shows, { id, ...payload, expectedTime: '', note: '', items: [] }]
    }));
    setShowEditor(null);
    showToast('새 공연을 만들었어요');
  };

  const handleEditShow = (payload) => {
    if (!activeShow) return;
    updateShow(activeShow.id, payload);
    setShowEditor(null);
    showToast('공연 정보를 저장했어요');
  };

  const handleDeleteShow = () => {
    if (!activeShow || data.shows.length <= 1) {
      showToast('공연은 최소 한 개는 남겨 두어야 해요');
      setShowEditor(null);
      return;
    }
    const id = activeShow.id;
    apply((d) => {
      const shows = d.shows.filter((s) => s.id !== id);
      return { ...d, shows, activeShowId: shows[0].id };
    });
    setShowEditor(null);
    showToast('공연을 삭제했어요');
  };

  const copyText = async (text, message) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(message);
        return;
      }
      throw new Error('clipboard unavailable');
    } catch (err) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(message);
      } catch (e) {
        showToast('복사하지 못했어요. 문구를 길게 눌러 복사해 주세요.');
      }
    }
  };

  if (!activeShow) return null;

  const kakaoText = buildKakaoText(activeShow);

  return (
    <section className="concert-page">
      {/* 공연 선택 */}
      <div className="concert-showbar">
        <div className="concert-show-tabs" role="tablist" aria-label="공연 선택">
          {data.shows.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === activeShow.id}
              className={`concert-show-tab${s.id === activeShow.id ? ' active' : ''}`}
              onClick={() => selectShow(s.id)}
            >
              <b>{s.title}</b>
              <span>
                {[formatShowDate(s.date), s.meta].filter(Boolean).join(' · ') || '규모 미정'}
                {' · '}{s.items.length}항목
              </span>
            </button>
          ))}
        </div>

        <div className="concert-showbar-actions">
          <button
            type="button"
            className="concert-btn outline"
            onClick={() => setShowEditor({ mode: 'edit' })}
          >
            <Pencil size={14} />
            공연 정보
          </button>
          <button
            type="button"
            className="concert-btn primary"
            onClick={() => setShowEditor({ mode: 'add' })}
          >
            <Plus size={14} />
            새 공연
          </button>
        </div>
      </div>

      {showEditor ? (
        <ShowForm
          mode={showEditor.mode}
          initial={
            showEditor.mode === 'edit'
              ? { title: activeShow.title, date: activeShow.date, meta: activeShow.meta }
              : EMPTY_SHOW
          }
          onCancel={() => setShowEditor(null)}
          onSubmit={showEditor.mode === 'edit' ? handleEditShow : handleAddShow}
          onDelete={showEditor.mode === 'edit' ? handleDeleteShow : null}
        />
      ) : null}

      {/* 요약 */}
      <div className="concert-summary">
        <div className="concert-stat">
          <div className="concert-stat-label">총 항목</div>
          <div className="concert-stat-value">{stats.total}<span className="unit">개</span></div>
          <div className="concert-stat-sub">{activeShow.title}</div>
        </div>
        <div className="concert-stat">
          <div className="concert-stat-label">확정</div>
          <div className="concert-stat-value ok">{stats.confirmed}<span className="unit">개</span></div>
          <div className="concert-stat-sub">무대에 올라가는 순서</div>
        </div>
        <div className="concert-stat">
          <div className="concert-stat-label">후보 · 미정</div>
          <div className="concert-stat-value hold">{stats.candidate + stats.pending}<span className="unit">개</span></div>
          <div className="concert-stat-sub">후보 {stats.candidate} · 미정 {stats.pending}</div>
        </div>
        <div className="concert-stat time">
          <div className="concert-stat-label">예상 공연 시간</div>
          <input
            type="text"
            className="concert-time-input"
            value={activeShow.expectedTime}
            onChange={(e) => updateShow(activeShow.id, { expectedTime: e.target.value })}
            placeholder="예: 약 40분"
            aria-label="예상 공연 시간"
          />
          <div className="concert-stat-sub">
            {activeShow.meta ? activeShow.meta : '규모 메모를 적어 두면 함께 보여요'}
          </div>
        </div>
      </div>

      {/* 셋리스트 */}
      <div className="concert-card">
        <div className="concert-card-head">
          <div>
            <h3>🎤 셋리스트</h3>
            <p className="concert-card-hint">
              순서는 ↑↓로 바꾸고, 상태 배지를 누르면 <b>확정 → 후보 → 미정</b>으로 바뀝니다. 글자는 눌러서 바로 고칠 수 있어요.
            </p>
          </div>
          <button
            type="button"
            className="concert-btn green"
            onClick={() => copyText(kakaoText, '카톡 요약을 복사했어요 ✓')}
          >
            <Copy size={14} />
            카톡 요약 복사
          </button>
        </div>

        {/* 데스크톱 표 */}
        <div className="concert-table-wrap">
          <table className="concert-table">
            <thead>
              <tr>
                <th className="c-no">순서</th>
                <th className="c-performer">출연자</th>
                <th className="c-song">곡명</th>
                <th className="c-form">형태</th>
                <th className="c-status">상태</th>
                <th className="c-memo">비고 · 메모</th>
                <th className="c-manage">관리</th>
              </tr>
            </thead>
            <tbody>
              {activeShow.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="concert-empty">
                    아직 항목이 없어요. 아래 <b>새 항목 추가</b>에서 첫 순서를 넣어 보세요.
                  </td>
                </tr>
              ) : (
                activeShow.items.map((it, index) => (
                  <tr key={it.id} className={it.status === '확정' ? 'is-confirmed' : ''}>
                    <td className="c-no">
                      <div className="concert-order">
                        <b>{index + 1}</b>
                        <div className="concert-order-btns">
                          <button
                            type="button"
                            onClick={() => moveItem(activeShow.id, index, -1)}
                            disabled={index === 0}
                            aria-label={`${index + 1}번 위로`}
                            title="위로"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(activeShow.id, index, 1)}
                            disabled={index === activeShow.items.length - 1}
                            aria-label={`${index + 1}번 아래로`}
                            title="아래로"
                          >
                            <ArrowDown size={13} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="c-performer">
                      <input
                        className="concert-input"
                        type="text"
                        value={it.performer}
                        onChange={(e) => updateItem(activeShow.id, it.id, { performer: e.target.value })}
                        placeholder="출연자"
                        aria-label={`${index + 1}번 출연자`}
                      />
                    </td>
                    <td className="c-song">
                      <input
                        className="concert-input song"
                        type="text"
                        value={it.song}
                        onChange={(e) => updateItem(activeShow.id, it.id, { song: e.target.value })}
                        placeholder="곡명"
                        aria-label={`${index + 1}번 곡명`}
                      />
                    </td>
                    <td className="c-form">
                      <select
                        className="concert-select"
                        value={it.form}
                        onChange={(e) => updateItem(activeShow.id, it.id, { form: e.target.value })}
                        aria-label={`${index + 1}번 형태`}
                      >
                        {PERFORMANCE_FORMS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                    <td className="c-status">
                      <StatusBadge
                        status={it.status}
                        name={`${index + 1}번 ${it.song || it.performer}`}
                        onClick={() => updateItem(activeShow.id, it.id, { status: nextStatus(it.status) })}
                      />
                    </td>
                    <td className="c-memo">
                      <input
                        className="concert-input memo"
                        type="text"
                        value={it.memo}
                        onChange={(e) => updateItem(activeShow.id, it.id, { memo: e.target.value })}
                        placeholder="비고"
                        aria-label={`${index + 1}번 비고`}
                      />
                    </td>
                    <td className="c-manage">
                      <button
                        type="button"
                        className="concert-icon-btn danger"
                        onClick={() => deleteItem(activeShow.id, it.id)}
                        aria-label={`${index + 1}번 항목 삭제`}
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 목록 */}
        <div className="concert-mobile">
          {activeShow.items.length === 0 ? (
            <p className="concert-empty">아직 항목이 없어요. 아래에서 첫 순서를 넣어 보세요.</p>
          ) : (
            activeShow.items.map((it, index) => (
              <div className={`concert-item-card${it.status === '확정' ? ' is-confirmed' : ''}`} key={it.id}>
                <div className="concert-item-top">
                  <span className="concert-item-no">{index + 1}</span>
                  <input
                    className="concert-input performer"
                    type="text"
                    value={it.performer}
                    onChange={(e) => updateItem(activeShow.id, it.id, { performer: e.target.value })}
                    placeholder="출연자"
                    aria-label={`${index + 1}번 출연자`}
                  />
                  <div className="concert-order-btns">
                    <button
                      type="button"
                      onClick={() => moveItem(activeShow.id, index, -1)}
                      disabled={index === 0}
                      aria-label={`${index + 1}번 위로`}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(activeShow.id, index, 1)}
                      disabled={index === activeShow.items.length - 1}
                      aria-label={`${index + 1}번 아래로`}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteItem(activeShow.id, it.id)}
                      aria-label={`${index + 1}번 항목 삭제`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <input
                  className="concert-input song"
                  type="text"
                  value={it.song}
                  onChange={(e) => updateItem(activeShow.id, it.id, { song: e.target.value })}
                  placeholder="곡명"
                  aria-label={`${index + 1}번 곡명`}
                />

                <div className="concert-item-meta">
                  <select
                    className="concert-select"
                    value={it.form}
                    onChange={(e) => updateItem(activeShow.id, it.id, { form: e.target.value })}
                    aria-label={`${index + 1}번 형태`}
                  >
                    {PERFORMANCE_FORMS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <StatusBadge
                    status={it.status}
                    name={`${index + 1}번 ${it.song || it.performer}`}
                    onClick={() => updateItem(activeShow.id, it.id, { status: nextStatus(it.status) })}
                  />
                </div>

                <input
                  className="concert-input memo"
                  type="text"
                  value={it.memo}
                  onChange={(e) => updateItem(activeShow.id, it.id, { memo: e.target.value })}
                  placeholder="비고 · 메모"
                  aria-label={`${index + 1}번 비고`}
                />
              </div>
            ))
          )}
        </div>

        {/* 새 항목 추가 */}
        <form className="concert-add-form" onSubmit={handleAddItem}>
          <div className="concert-add-title">
            <Plus size={14} />
            새 항목 추가
          </div>
          <div className="concert-add-fields">
            <label className="concert-field">
              <span>출연자</span>
              <input
                type="text"
                value={draft.performer}
                onChange={(e) => setDraft((p) => ({ ...p, performer: e.target.value }))}
                placeholder="예: 학생 2명"
              />
            </label>
            <label className="concert-field song">
              <span>곡명</span>
              <input
                type="text"
                value={draft.song}
                onChange={(e) => setDraft((p) => ({ ...p, song: e.target.value }))}
                placeholder="예: Love Story"
              />
            </label>
            <label className="concert-field">
              <span>형태</span>
              <select
                value={draft.form}
                onChange={(e) => setDraft((p) => ({ ...p, form: e.target.value }))}
              >
                {PERFORMANCE_FORMS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="concert-field">
              <span>상태</span>
              <select
                value={draft.status}
                onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
              >
                {PERFORMANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="concert-field memo">
              <span>비고 · 메모</span>
              <input
                type="text"
                value={draft.memo}
                onChange={(e) => setDraft((p) => ({ ...p, memo: e.target.value }))}
                placeholder="예: 음원 믹스 예정"
              />
            </label>
            <button type="submit" className="concert-btn primary add">
              <Plus size={14} />
              추가
            </button>
          </div>
        </form>

        <p className="concert-foot">
          {ready ? '클라우드에 자동 저장 중 · 지애 님과 인웅쌤이 함께 보고 고칠 수 있어요' : '불러오는 중'}
          {activeShow.note ? ` · ${activeShow.note}` : ''}
        </p>
      </div>

      {toast ? <div className="concert-toast">{toast}</div> : null}
    </section>
  );
}
