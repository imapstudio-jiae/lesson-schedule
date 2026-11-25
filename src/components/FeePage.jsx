import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, X, Wallet } from 'lucide-react';
import { getSupabaseData, saveSupabaseData } from '../supabase';
import { realtimeSync } from '../realtimeSync';
import {
  defaultFeeData,
  normalizeFeeData,
  feeStorageKey,
  monthLabel,
  isSpecialStudent,
  todayStamp,
  formatDate,
  DEFAULT_SESSION_GOAL
} from '../feeDefaults';
import '../fee.css';

const nf = new Intl.NumberFormat('ko-KR');
const num = (n) => nf.format(Math.round(Number(n) || 0));
const won = (n) => `${num(n)}원`;
const signed = (n) => `${n < 0 ? '-' : '+'}${won(Math.abs(n))}`;
const clampRatio = (v) => Math.max(0, Math.min(100, Number(v) || 0));

const STATUS_LABEL = { unpaid: '미확인', paid: '입금완료', exempt: '면제' };

const EMPTY_STUDENT = {
  name: '',
  form: '1시간',
  freq: '정규 주 1회',
  rate: 160000,
  schedule: '',
  memo: '',
  sessions: { enabled: false, done: 0, goal: DEFAULT_SESSION_GOAL }
};

// 횟수 차감(4회권) 진행 회차 카운터 — 0/4회, +/−, 남은 N회 또는 4회 완료
function SessionCounter({ student, onChange }) {
  const sess = student.sessions || { enabled: false, done: 0, goal: DEFAULT_SESSION_GOAL };

  if (!sess.enabled) {
    return (
      <button
        type="button"
        className="fee-sess-idle"
        onClick={() => onChange({ enabled: true, done: 0, goal: DEFAULT_SESSION_GOAL })}
        title="횟수 차감제(4회권) 켜기"
        aria-label={`${student.name} 횟수 차감제 켜기`}
      >
        회차 관리
      </button>
    );
  }

  const done = Math.max(0, Number(sess.done) || 0);
  const goal = Math.max(1, Number(sess.goal) || DEFAULT_SESSION_GOAL);
  const complete = done >= goal;

  return (
    <div className={`fee-sess${complete ? ' complete' : ''}`}>
      <button
        type="button"
        className="fee-sess-btn"
        onClick={() => onChange({ ...sess, done: Math.max(0, done - 1), goal })}
        disabled={done <= 0}
        aria-label={`${student.name} 회차 차감`}
        title="회차 차감"
      >
        −
      </button>
      <span className="fee-sess-count"><b>{done}</b>/{goal}회</span>
      <button
        type="button"
        className="fee-sess-btn plus"
        onClick={() => onChange({ ...sess, done: Math.min(goal, done + 1), goal })}
        disabled={complete}
        aria-label={`${student.name} 회차 추가`}
        title="회차 추가"
      >
        +
      </button>
      <span className="fee-sess-state">{complete ? `${goal}회 완료` : `남은 ${goal - done}회`}</span>
    </div>
  );
}

function ScheduleText({ value }) {
  if (!value) return <span className="fee-muted">—</span>;
  const parts = String(value).split('·').map((p) => p.trim()).filter(Boolean);
  return (
    <span className="fee-times">
      {parts.map((p, i) => {
        const m = p.match(/^([월화수목금토일])\s*(.*)$/);
        return (
          <span className="fee-time" key={`${p}-${i}`}>
            {m ? (
              <>
                <span className={`fee-day${m[1] === '토' || m[1] === '일' ? ' weekend' : ''}`}>{m[1]}</span>
                <span className="fee-time-text">{m[2]}</span>
              </>
            ) : (
              <span className="fee-time-text">{p}</span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function StatusButton({ status, onClick }) {
  return (
    <button
      type="button"
      className={`fee-status ${status}`}
      onClick={onClick}
      title="누르면 확인 창이 뜹니다 · 미확인 → 입금완료 → 면제 순서"
    >
      <i className="fee-status-dot" />
      {STATUS_LABEL[status]}
    </button>
  );
}

// 다음 입금 상태 (미확인 → 입금완료 → 면제 → 미확인)
const nextStatusOf = (status) => {
  if (status === 'unpaid') return 'paid';
  if (status === 'paid') return 'exempt';
  return 'unpaid';
};

// 입금 상태 변경 확인 창 — 스크롤·터치 중 실수로 바뀌지 않도록 한 번 더 묻는다
function StatusConfirmModal({ student, ymLabel, onCancel, onConfirm }) {
  const next = nextStatusOf(student.status);
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const nextTone = next === 'paid' ? 'paid' : next === 'exempt' ? 'exempt' : 'unpaid';

  return (
    <div
      className="fee-modal-overlay fee-confirm-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="fee-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fee-confirm-title"
      >
        <p className="fee-confirm-kicker">입금 상태 변경</p>
        <h3 id="fee-confirm-title" className="fee-confirm-title">
          {student.name} 님 {ymLabel} 레슨비를
          <br />
          <span className={`fee-confirm-next ${nextTone}`}>‘{STATUS_LABEL[next]}’</span>(으)로 바꿀까요?
        </h3>
        <p className="fee-confirm-sub">
          지금 상태 <b>{STATUS_LABEL[student.status]}</b>
          {' → '}
          <b>{STATUS_LABEL[next]}</b>
          {next === 'paid' ? ' (입금일은 오늘로 저장돼요)' : ''}
        </p>
        <div className="fee-confirm-actions">
          <button
            type="button"
            className="fee-confirm-btn cancel"
            onClick={onCancel}
            ref={cancelRef}
          >
            아니요, 그대로 둘게요
          </button>
          <button type="button" className="fee-confirm-btn ok" onClick={onConfirm}>
            네, 바꿀게요
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentModal({ mode, initial, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_STUDENT, ...(initial || {}) }));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      name: form.name.trim(),
      rate: Math.max(0, Number(String(form.rate).replace(/[^\d]/g, '')) || 0),
      sessions: {
        enabled: !!form.sessions?.enabled,
        done: Math.max(0, Number(form.sessions?.done) || 0),
        goal: Math.max(1, Number(form.sessions?.goal) || DEFAULT_SESSION_GOAL)
      }
    });
  };

  return (
    <div className="fee-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="fee-modal" onSubmit={handleSubmit}>
        <div className="fee-modal-head">
          <h3>{mode === 'add' ? '학생 추가' : '학생 정보 수정'}</h3>
          <button type="button" className="fee-icon-btn" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </div>

        <div className="fee-field-grid">
          <label className="fee-field fee-field-wide">
            <span>학생 이름</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="예: 김재용"
              autoFocus
            />
          </label>

          <label className="fee-field">
            <span>수업 형태</span>
            <select value={form.form} onChange={(e) => set('form', e.target.value)}>
              <option value="1시간">1시간</option>
              <option value="40분">40분</option>
              <option value="30분">30분</option>
              <option value="예약제">예약제</option>
            </select>
          </label>

          <label className="fee-field">
            <span>수업 주기</span>
            <select value={form.freq} onChange={(e) => set('freq', e.target.value)}>
              {['정규 주 1회', '주 2회', '정규 주 2회', '예약제 · 비고정', '보강 · 성인 앙상블', '일시 수업'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>

          <label className="fee-field fee-field-wide">
            <span>수업 요일 · 시간</span>
            <input
              type="text"
              value={form.schedule}
              onChange={(e) => set('schedule', e.target.value)}
              placeholder="예: 화 14:00 · 토 15:10 (성인 앙상블)"
            />
          </label>

          <label className="fee-field">
            <span>레슨비 (원)</span>
            <input
              type="text"
              inputMode="numeric"
              value={num(form.rate)}
              onChange={(e) => set('rate', e.target.value.replace(/[^\d]/g, '').slice(0, 9))}
            />
          </label>

          <div className="fee-field fee-field-wide fee-sess-field">
            <label className="fee-sess-toggle">
              <input
                type="checkbox"
                checked={!!form.sessions?.enabled}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  sessions: {
                    enabled: e.target.checked,
                    done: Number(prev.sessions?.done) || 0,
                    goal: Number(prev.sessions?.goal) || DEFAULT_SESSION_GOAL
                  }
                }))}
              />
              <span>횟수 차감제 (4회권)</span>
            </label>
            {form.sessions?.enabled ? (
              <div className="fee-sess-inputs">
                <label className="fee-field">
                  <span>목표 회차</span>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={form.sessions?.goal ?? DEFAULT_SESSION_GOAL}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      sessions: {
                        enabled: true,
                        done: Number(prev.sessions?.done) || 0,
                        goal: Math.max(1, Math.min(52, Number(e.target.value) || DEFAULT_SESSION_GOAL))
                      }
                    }))}
                  />
                </label>
                <label className="fee-field">
                  <span>진행 회차</span>
                  <input
                    type="number"
                    min="0"
                    max="52"
                    value={form.sessions?.done ?? 0}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      sessions: {
                        enabled: true,
                        done: Math.max(0, Math.min(52, Number(e.target.value) || 0)),
                        goal: Number(prev.sessions?.goal) || DEFAULT_SESSION_GOAL
                      }
                    }))}
                  />
                </label>
              </div>
            ) : (
              <p className="fee-sess-hint">월 4회가 다 안 채워져 다음 달로 넘어가는 학생은 켜 두면 진행 회차가 클라우드에 저장됩니다.</p>
            )}
          </div>

          <label className="fee-field fee-field-wide">
            <span>메모</span>
            <textarea
              rows={2}
              value={form.memo}
              onChange={(e) => set('memo', e.target.value)}
              placeholder="교재 · 결석/보강 · 합주 포함 여부 등"
            />
          </label>
        </div>

        <div className="fee-modal-foot">
          {mode === 'edit' ? (
            <button
              type="button"
              className={`fee-btn danger${confirmDelete ? ' confirming' : ''}`}
              onClick={() => {
                if (confirmDelete) onDelete();
                else setConfirmDelete(true);
              }}
              onBlur={() => setConfirmDelete(false)}
            >
              <Trash2 size={14} />
              {confirmDelete ? '정말 삭제할까요?' : '삭제'}
            </button>
          ) : (
            <span />
          )}
          <div className="fee-modal-actions">
            <button type="button" className="fee-btn ghost" onClick={onClose}>취소</button>
            <button type="submit" className="fee-btn primary">{mode === 'add' ? '추가하기' : '저장하기'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FeePageActive({ year, month }) {
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const storageKey = feeStorageKey(ym);
  const ymLabel = monthLabel(ym);

  const [data, setData] = useState(() => defaultFeeData(ym));
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // { mode, student }
  const [toast, setToast] = useState('');
  const [newItem, setNewItem] = useState({ label: '', target: 'jiae', sign: '-', amount: '' });
  const [statusConfirm, setStatusConfirm] = useState(null); // 확인 창을 띄운 학생

  const dirtyRef = useRef(false);      // 저장 대기 중인 변경이 있는지
  const editedRef = useRef(false);     // 이번 달 화면에서 사용자가 직접 고쳤는지 (클라우드 덮어쓰기 방지)
  const toastTimer = useRef(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ── 데이터 불러오기: 로컬 즉시 → Supabase 클라우드 ──
  useEffect(() => {
    let cancelled = false;
    dirtyRef.current = false;
    editedRef.current = false;

    let local = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) local = JSON.parse(raw);
    } catch (e) {
      console.warn('[Fees] 로컬 데이터 파싱 실패:', e);
    }

    setData(normalizeFeeData(local, ym));
    setReady(true);

    getSupabaseData(storageKey).then((cloud) => {
      if (cancelled) return;
      if (cloud && Array.isArray(cloud.students) && !editedRef.current) {
        const normalized = normalizeFeeData(cloud, ym);
        setData(normalized);
        try {
          localStorage.setItem(storageKey, JSON.stringify(normalized));
        } catch (e) {}
      } else if (!cloud && local) {
        saveSupabaseData(storageKey, local).catch(() => {});
      }
    });

    const unsubscribe = realtimeSync.subscribe(({ payloadKey, data: incoming }) => {
      if (payloadKey !== storageKey || !incoming) return;
      if (editedRef.current) return;
      setData(normalizeFeeData(incoming, ym));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [ym, storageKey]);

  const apply = useCallback((updater) => {
    dirtyRef.current = true;
    editedRef.current = true;
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...next, updatedAt: Date.now() };
    });
  }, []);

  // ── 변경 시: 로컬 + Supabase + 실시간 동기화 (디바운스 600ms) ──
  useEffect(() => {
    if (!ready || !dirtyRef.current) return;
    const snapshot = data;
    const key = storageKey;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(snapshot));
      } catch (e) {}
      saveSupabaseData(key, snapshot).catch(() => {});
      realtimeSync.broadcastUpdate(key, snapshot);
      dirtyRef.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, [data, ready, storageKey]);

  // 다른 달로 이동하거나 탭을 닫는 순간에도 저장이 유실되지 않도록 즉시 반영
  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return;
      const snapshot = dataRef.current;
      if (!snapshot) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch (e) {}
      saveSupabaseData(storageKey, snapshot).catch(() => {});
      realtimeSync.broadcastUpdate(storageKey, snapshot);
      dirtyRef.current = false;
    };
  }, [storageKey]);

  // ── 계산 ──
  const calc = useMemo(() => {
    const students = data.students;
    const paid = students.filter((s) => s.status === 'paid');
    const unpaid = students.filter((s) => s.status === 'unpaid');
    const exempt = students.filter((s) => s.status === 'exempt');
    const sumOf = (list) => list.reduce((a, s) => a + (Number(s.rate) || 0), 0);

    const paidAmt = sumOf(paid);
    const unpaidAmt = sumOf(unpaid);
    const exemptAmt = sumOf(exempt);
    const total = paidAmt + unpaidAmt; // 청구 합계 — 참고 표시용
    const pct = total ? Math.round((paidAmt / total) * 100) : 0;

    const ratio = clampRatio(data.ratio);
    const homeFee = Number(data.homeFee.amount) || 0;
    const manageFee = data.manageFee.mode === 'auto'
      ? students.length * (Number(data.manageFee.unit) || 0)
      : Number(data.manageFee.amount) || 0;
    const baseExtra = homeFee + manageFee;

    const customJiae = data.items.filter((i) => i.target === 'jiae').reduce((a, i) => a + (Number(i.amount) || 0), 0);
    const customInung = data.items.filter((i) => i.target === 'inung').reduce((a, i) => a + (Number(i.amount) || 0), 0);

    // 레슨비 배분은 ‘입금완료(실입금)’ 금액만 기준 — 미확인·면제는 배분에서 빠지고,
    // 입금 확인으로 상태가 바뀌면 그 금액이 바로 배분에 들어온다.
    const lessonBase = paidAmt;
    const jiaeLesson = Math.round((lessonBase * ratio) / 100);
    const inungLesson = lessonBase - jiaeLesson;

    // 추가 정산은 입금액 위에 더 얹는 돈이 아니라 두 사람 몫 사이에서 옮기는 돈이다.
    //   홈페이지 개발·관리비 + 학생 관리비 + 지애 님 항목 → 인웅쌤 몫에서 차감해 지애 님 몫에 더함
    //   인웅쌤 항목 → 지애 님 몫에서 차감해 인웅쌤 몫에 더함
    // 그래서 두 사람 몫을 합하면 언제나 입금 확인 금액과 똑같아진다.
    const extraToJiae = baseExtra + customJiae;
    const transferToJiae = extraToJiae - customInung; // + 면 인웅쌤 → 지애, − 면 지애 → 인웅쌤
    const jiae = jiaeLesson + transferToJiae;
    const inung = inungLesson - transferToJiae;
    const grand = jiae + inung; // = lessonBase (입금 확인 금액)

    return {
      students, paid, unpaid, exempt, paidAmt, unpaidAmt, exemptAmt, total, lessonBase, pct,
      ratio, homeFee, manageFee, baseExtra, customJiae, customInung,
      jiaeLesson, inungLesson, jiae, inung, extraToJiae, transferToJiae, grand
    };
  }, [data]);

  const visibleStudents = useMemo(() => {
    let list = data.students;
    if (filter === 'unpaid') list = list.filter((s) => s.status === 'unpaid');
    else if (filter === 'paid') list = list.filter((s) => s.status === 'paid');
    else if (filter === 'exempt') list = list.filter((s) => s.status === 'exempt');
    else if (filter === 'special') list = list.filter(isSpecialStudent);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        [s.name, s.form, s.freq, s.schedule, s.memo].join(' ').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data.students, filter, query]);

  const visibleSum = visibleStudents.reduce((a, s) => a + (Number(s.rate) || 0), 0);

  // ── 학생 조작 ──
  const updateStudent = (id, patch) =>
    apply((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const cycleStatus = (id) =>
    apply((d) => ({
      ...d,
      students: d.students.map((s) => {
        if (s.id !== id) return s;
        if (s.status === 'unpaid') return { ...s, status: 'paid', paidDate: s.paidDate || todayStamp() };
        if (s.status === 'paid') return { ...s, status: 'exempt', paidDate: '' };
        return { ...s, status: 'unpaid', paidDate: '' };
      })
    }));

  // 배지 클릭 → 바로 바꾸지 않고 확인 창만 띄운다 (확인을 눌러야 변경)
  const requestStatusChange = (student) => setStatusConfirm(student);
  const closeStatusConfirm = useCallback(() => setStatusConfirm(null), []);

  const confirmStatusChange = () => {
    if (!statusConfirm) return;
    // 실시간 동기화로 상태가 바뀌었을 수 있으니 지금 데이터 기준으로 계산
    const current = dataRef.current?.students?.find((s) => s.id === statusConfirm.id) || statusConfirm;
    const next = nextStatusOf(current.status);
    setStatusConfirm(null);
    cycleStatus(current.id);
    showToast(`${current.name} 님을 ‘${STATUS_LABEL[next]}’(으)로 바꿨어요`);
  };

  const handleSaveStudent = (payload) => {
    if (editing?.mode === 'add') {
      apply((d) => ({
        ...d,
        students: [...d.students, { ...payload, id: `stu-${Date.now()}`, status: 'unpaid', paidDate: '' }]
      }));
      showToast('학생을 추가했어요');
    } else if (editing?.student) {
      updateStudent(editing.student.id, payload);
      showToast('학생 정보를 저장했어요');
    }
    setEditing(null);
  };

  const handleDeleteStudent = () => {
    const id = editing?.student?.id;
    if (!id) return;
    apply((d) => ({ ...d, students: d.students.filter((s) => s.id !== id) }));
    setEditing(null);
    showToast('학생을 삭제했어요');
  };

  // ── 추가/차감 항목 ──
  const handleAddItem = () => {
    const amount = Number(String(newItem.amount).replace(/[^\d]/g, ''));
    if (!newItem.label.trim() || !amount) {
      showToast('항목 이름과 금액을 입력해 주세요');
      return;
    }
    const value = newItem.sign === '-' ? -amount : amount;
    apply((d) => ({
      ...d,
      items: [...d.items, { id: `item-${Date.now()}`, label: newItem.label.trim(), target: newItem.target, amount: value }]
    }));
    setNewItem({ label: '', target: 'jiae', sign: '-', amount: '' });
    showToast('항목을 추가했어요');
  };

  const updateItem = (id, patch) =>
    apply((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const deleteItem = (id) =>
    apply((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const manageAuto = data.manageFee.mode === 'auto';

  return (
    <section className="fee-page">
      {/* 요약 카드 */}
      <div className="fee-summary">
        <div className="fee-stat">
          <div className="fee-stat-icon lav">👥</div>
          <div className="fee-stat-label">수강생</div>
          <div className="fee-stat-value">{calc.students.length}<span className="unit">명</span></div>
          <div className="fee-stat-sub">
            {[
              calc.students.filter((s) => s.form === '1시간').length ? `1시간 ${calc.students.filter((s) => s.form === '1시간').length}` : null,
              calc.students.filter((s) => s.form === '40분').length ? `40분 ${calc.students.filter((s) => s.form === '40분').length}` : null,
              calc.students.filter((s) => s.form === '예약제').length ? `예약제 ${calc.students.filter((s) => s.form === '예약제').length}` : null
            ].filter(Boolean).join(' · ') || '명단을 추가해 보세요'}
          </div>
        </div>

        <div className="fee-stat">
          <div className="fee-stat-icon mint">✅</div>
          <div className="fee-stat-label">입금 확인</div>
          <div className="fee-stat-value">{calc.paid.length}<span className="unit">명</span></div>
          <div className="fee-stat-sub">{won(calc.paidAmt)} · {calc.pct}%</div>
          <div className="fee-mini-bar"><i style={{ width: `${calc.pct}%` }} /></div>
        </div>

        <div className="fee-stat">
          <div className="fee-stat-icon coral">⏳</div>
          <div className="fee-stat-label">미확인 (미입금)</div>
          <div className="fee-stat-value">{calc.unpaid.length}<span className="unit">명</span></div>
          <div className="fee-stat-sub">{won(calc.unpaidAmt)} · 확인 필요</div>
        </div>

        <div className="fee-stat primary">
          <div className="fee-stat-icon">💰</div>
          <div className="fee-stat-label">이번 달 정산 합계</div>
          <div className="fee-stat-value">{num(calc.grand)}<span className="unit">원</span></div>
          <div className="fee-stat-sub">실입금 {num(calc.lessonBase)} 그대로 배분</div>
        </div>
      </div>

      {/* 안내 띠 */}
      <div className="fee-notice">
        <div className="fee-notice-title">💰 실제 단가 반영 · {Number(month)}월 안내</div>
        <p>
          <b>1시간 주 1회 160,000원</b> · <b>40분 주 2회 210,000원</b> · <b>1시간 주 2회 260,000원</b> 기준입니다.
          한수연 <b>150,000원</b>(1만 원 할인)처럼 학생별 단가는 표에서 바로 고칠 수 있어요.
          배분은 <b>지애 {calc.ratio}% · 인웅쌤 {100 - calc.ratio}%</b>로 나눈 뒤, 홈페이지 개발·관리비와 학생 관리비 같은 추가 정산은
          <b> 인웅쌤이 가져갈 몫에서 차감</b>해 지애 님 몫에 더합니다. 없는 돈을 더하는 게 아니라 두 사람 몫 사이에서 옮기는 것이라,
          두 사람 몫을 합하면 언제나 입금 확인 금액과 똑같습니다.
          레슨비 배분은 <b>입금 확인된 금액만</b> 기준으로 나누며, 미확인·면제는 배분에서 빠집니다(입금 확인되면 바로 반영).
          학생 관리비는 입금 여부와 상관없이 <b>등록된 전체 학생 수</b> 기준입니다.
          {data.note ? <> {data.note}</> : null}
        </p>
      </div>

      {/* 학생별 정산 */}
      <div className="fee-card">
        <div className="fee-card-head">
          <h3>👥 학생별 정산 <span className="fee-hint">{visibleStudents.length === data.students.length ? `${data.students.length}명 전원` : `${visibleStudents.length}명 표시`}</span></h3>
          <span className="fee-legend">배지를 누르면 확인 창에서 미확인 → 입금완료 → 면제 · 단가는 눌러서 바로 수정 · 회차는 +/−로 기록</span>
        </div>

        <div className="fee-rate-box">
          <span className="fee-rb-label">단가 기준</span>
          <span className="fee-rate-chip"><span>1시간 정규 · 주 1회</span><b>160,000원</b></span>
          <span className="fee-rate-chip"><span>40분 · 주 2회</span><b>210,000원</b></span>
          <span className="fee-rate-chip"><span>1시간 · 주 2회</span><b>260,000원</b></span>
          <span className="fee-rb-note">한수연 150,000(1만 원 할인) · 앙상블·합주는 포함</span>
        </div>

        <div className="fee-tool-row">
          <div className="fee-filters">
            {[
              { key: 'all', label: '전체', count: data.students.length },
              { key: 'unpaid', label: '미확인', count: calc.unpaid.length },
              { key: 'paid', label: '입금완료', count: calc.paid.length },
              { key: 'exempt', label: '면제', count: calc.exempt.length },
              { key: 'special', label: '예약제·보강', count: data.students.filter(isSpecialStudent).length }
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                className={`fee-chip${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} <b>{f.count}</b>
              </button>
            ))}
          </div>

          <div className="fee-tool-right">
            <label className="fee-search">
              <Search size={14} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름 · 메모 검색"
                aria-label="학생 검색"
              />
            </label>
            <button type="button" className="fee-btn primary" onClick={() => setEditing({ mode: 'add', student: null })}>
              <Plus size={14} />
              학생 추가
            </button>
          </div>
        </div>

        {/* 데스크톱 표 */}
        <div className="fee-table-wrap">
          <table className="fee-table">
            <thead>
              <tr>
                <th className="fee-col-no">No</th>
                <th>학생</th>
                <th>수업 요일 · 시간</th>
                <th>수업 형태</th>
                <th className="fee-col-sess">진행 회차</th>
                <th className="fee-col-rate">레슨비</th>
                <th>입금 상태</th>
                <th>입금일</th>
                <th>메모</th>
                <th className="fee-col-manage">관리</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="fee-empty">조건에 맞는 학생이 없어요. 필터를 바꾸거나 검색어를 지워 보세요.</td>
                </tr>
              ) : (
                visibleStudents.map((s) => (
                  <tr key={s.id}>
                    <td className="fee-col-no">{data.students.indexOf(s) + 1}</td>
                    <td className="fee-cell-name"><b>{s.name}</b></td>
                    <td><ScheduleText value={s.schedule} /></td>
                    <td>
                      <span className={`fee-badge form${s.form === '40분' ? ' m40' : ''}${s.form === '예약제' ? ' reserve' : ''}`}>{s.form}</span>
                      <span className="fee-form-sub">{s.freq}</span>
                    </td>
                    <td className="fee-col-sess">
                      <SessionCounter student={s} onChange={(sessions) => updateStudent(s.id, { sessions })} />
                    </td>
                    <td className="fee-col-rate">
                      <label className="fee-rate">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={num(s.rate)}
                          onChange={(e) => updateStudent(s.id, { rate: Number(e.target.value.replace(/[^\d]/g, '').slice(0, 9)) || 0 })}
                          onFocus={(e) => e.target.select()}
                          aria-label={`${s.name} 레슨비`}
                        />
                        <span>원</span>
                      </label>
                    </td>
                    <td><StatusButton status={s.status} onClick={() => requestStatusChange(s)} /></td>
                    <td className={`fee-cell-date${s.status === 'paid' ? '' : ' none'}`}>
                      {s.status === 'paid' ? (
                        <input
                          type="date"
                          className="fee-date-input"
                          value={s.paidDate || ''}
                          onChange={(e) => updateStudent(s.id, { paidDate: e.target.value })}
                          aria-label={`${s.name} 입금일`}
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="fee-cell-memo" title={s.memo}>{s.memo || '—'}</td>
                    <td className="fee-col-manage">
                      <button
                        type="button"
                        className="fee-icon-btn"
                        onClick={() => setEditing({ mode: 'edit', student: s })}
                        title="학생 정보 수정"
                        aria-label={`${s.name} 수정`}
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="fee-foot-label">표시 {visibleStudents.length}명 · 합계</td>
                <td className="fee-col-rate fee-foot-amount">{won(visibleSum)}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 모바일 카드 목록 */}
        <div className="fee-mobile-list">
          {visibleStudents.length === 0 ? (
            <p className="fee-empty">조건에 맞는 학생이 없어요.</p>
          ) : (
            visibleStudents.map((s) => (
              <div className="fee-student-card" key={s.id}>
                <div className="fee-student-top">
                  <b>{s.name}</b>
                  <button
                    type="button"
                    className="fee-icon-btn"
                    onClick={() => setEditing({ mode: 'edit', student: s })}
                    aria-label={`${s.name} 수정`}
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
                <div className="fee-student-meta">
                  <span className={`fee-badge form${s.form === '40분' ? ' m40' : ''}${s.form === '예약제' ? ' reserve' : ''}`}>{s.form}</span>
                  <span className="fee-form-sub">{s.freq}</span>
                </div>
                {s.schedule ? <div className="fee-student-times"><ScheduleText value={s.schedule} /></div> : null}
                <div className="fee-student-sess">
                  <span className="fee-student-sess-label">진행 회차</span>
                  <SessionCounter student={s} onChange={(sessions) => updateStudent(s.id, { sessions })} />
                </div>
                <div className="fee-student-bottom">
                  <label className="fee-rate">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={num(s.rate)}
                      onChange={(e) => updateStudent(s.id, { rate: Number(e.target.value.replace(/[^\d]/g, '').slice(0, 9)) || 0 })}
                      onFocus={(e) => e.target.select()}
                      aria-label={`${s.name} 레슨비`}
                    />
                    <span>원</span>
                  </label>
                  <StatusButton status={s.status} onClick={() => requestStatusChange(s)} />
                </div>
                {s.status === 'paid' ? (
                  <div className="fee-student-date">
                    <span>입금일</span>
                    <input
                      type="date"
                      className="fee-date-input"
                      value={s.paidDate || ''}
                      onChange={(e) => updateStudent(s.id, { paidDate: e.target.value })}
                      aria-label={`${s.name} 입금일`}
                    />
                  </div>
                ) : null}
                {s.memo ? <p className="fee-student-memo">{s.memo}</p> : null}
              </div>
            ))
          )}
          <div className="fee-mobile-total">표시 {visibleStudents.length}명 · 합계 <b>{won(visibleSum)}</b></div>
        </div>
      </div>

      {/* 하단: 정산 요약 */}
      <div className="fee-bottom">
        <div className="fee-card fee-payout">
          <div className="fee-card-head">
            <h3><Wallet size={16} /> 이번 달 정산 요약</h3>
            <span className="fee-hint">{ymLabel}</span>
          </div>

          <div className="fee-pay-lines">
            <div className="fee-pay-line"><span>청구 합계 (면제 제외) <small>참고</small></span><b>{won(calc.total)}</b></div>
            <div className="fee-pay-line paid"><span>입금 확인 <small>배분 기준</small></span><b>{won(calc.paidAmt)}</b></div>
            <div className="fee-pay-line unpaid"><span>아직 미확인 <small>배분 제외</small></span><b>{won(calc.unpaidAmt)}</b></div>
            <div className="fee-pay-line"><span>면제</span><b>{won(calc.exemptAmt)}{calc.exempt.length ? ` (${calc.exempt.length}명)` : ''}</b></div>
            <div className="fee-pay-line extra">
              <span>추가 정산 <small>{calc.transferToJiae === 0 ? '이동 없음' : (calc.transferToJiae > 0 ? '인웅쌤 몫에서 지애 님 몫으로' : '지애 님 몫에서 인웅쌤 몫으로')}</small></span>
              <b>{calc.transferToJiae === 0 ? won(0) : signed(Math.abs(calc.transferToJiae))}</b>
            </div>
            <div className="fee-pay-line grand"><span>최종 정산 합계 <small>입금 확인 금액과 동일</small></span><b>{won(calc.grand)}</b></div>
          </div>

          <div className="fee-progress"><i style={{ width: `${calc.pct}%` }} /></div>

          <div className="fee-split">
            <div className="fee-split-head">
              <span>배분</span>
              <span className="fee-tip">지애 {calc.ratio}% · 인웅쌤 {100 - calc.ratio}% · 입금 확인 금액 기준</span>
            </div>

            <div className="fee-split-row">
              <span className="fee-who">
                <span className="fee-avatar jiae">지</span>지애 님
                <span className="fee-ratio-wrap">
                  <input
                    className="fee-ratio-input"
                    inputMode="numeric"
                    value={data.ratio}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
                      apply((d) => ({ ...d, ratio: v === '' ? 0 : clampRatio(v) }));
                    }}
                    aria-label="지애 님 배분 비율"
                  />
                  %
                </span>
              </span>
              <span className="fee-split-amt">
                <b>{won(calc.jiae)}</b>
                <small>
                  레슨비 {calc.ratio}% {won(calc.jiaeLesson)}
                  {calc.transferToJiae !== 0 ? <><br />추가 정산 {signed(calc.transferToJiae)} <span className="fee-move">({calc.transferToJiae > 0 ? '인웅쌤 몫에서' : '인웅쌤 몫으로'})</span></> : null}
                </small>
              </span>
            </div>

            <div className="fee-split-row">
              <span className="fee-who">
                <span className="fee-avatar inung">인</span>인웅쌤
                <span className="fee-ratio-fixed">{100 - calc.ratio}%</span>
              </span>
              <span className="fee-split-amt">
                <b>{won(calc.inung)}</b>
                <small>
                  레슨비 {100 - calc.ratio}% {won(calc.inungLesson)}
                  {calc.transferToJiae !== 0 ? <><br />추가 정산 {signed(-calc.transferToJiae)} <span className="fee-move">({calc.transferToJiae > 0 ? '지애 님 몫으로' : '지애 님 몫에서'})</span></> : null}
                </small>
              </span>
            </div>

            <div className="fee-extra">
              <div className="fee-extra-title">
                <span>추가 정산 <em>{calc.transferToJiae >= 0 ? '인웅쌤 몫에서 차감해 지애 님 몫에 더함' : '지애 님 몫에서 차감해 인웅쌤 몫에 더함'}</em></span>
                <span className="fee-tag">몫 사이 이동</span>
              </div>

              <div className="fee-extra-row">
                <span>홈페이지 개발·관리비 <em>고정</em></span>
                <label className="fee-money-input">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={num(data.homeFee.amount)}
                    onChange={(e) => apply((d) => ({ ...d, homeFee: { amount: Number(e.target.value.replace(/[^\d]/g, '').slice(0, 9)) || 0 } }))}
                    aria-label="홈페이지 개발·관리비"
                  />
                  <span>원</span>
                </label>
              </div>

              <div className="fee-extra-row">
                <span>
                  학생 관리비{' '}
                  <button
                    type="button"
                    className={`fee-mode-toggle${manageAuto ? ' on' : ''}`}
                    onClick={() => apply((d) => ({
                      ...d,
                      manageFee: {
                        ...d.manageFee,
                        mode: d.manageFee.mode === 'auto' ? 'manual' : 'auto',
                        amount: d.manageFee.mode === 'auto'
                          ? d.students.length * (Number(d.manageFee.unit) || 0)
                          : d.manageFee.amount
                      }
                    }))}
                    title="자동(수강생 수 × 단가)과 직접 입력을 전환합니다"
                  >
                    {manageAuto ? '자동' : '직접 입력'}
                  </button>
                </span>
                {manageAuto ? (
                  <label className="fee-money-input">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={num(data.manageFee.unit)}
                      onChange={(e) => apply((d) => ({ ...d, manageFee: { ...d.manageFee, unit: Number(e.target.value.replace(/[^\d]/g, '').slice(0, 9)) || 0 } }))}
                      aria-label="학생 1명당 관리비"
                    />
                    <span>원 × {data.students.length}명</span>
                  </label>
                ) : (
                  <label className="fee-money-input">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={num(data.manageFee.amount)}
                      onChange={(e) => apply((d) => ({ ...d, manageFee: { ...d.manageFee, amount: Number(e.target.value.replace(/[^\d]/g, '').slice(0, 9)) || 0 } }))}
                      aria-label="학생 관리비 직접 입력"
                    />
                    <span>원</span>
                  </label>
                )}
              </div>

              <div className="fee-extra-row sub">
                <span>고정 항목 합계</span>
                <b>{signed(calc.baseExtra)}</b>
              </div>

              {data.items.length > 0 ? (
                <div className="fee-item-list">
                  {data.items.map((it) => (
                    <div className="fee-item-row" key={it.id}>
                      <input
                        className="fee-item-label"
                        type="text"
                        value={it.label}
                        onChange={(e) => updateItem(it.id, { label: e.target.value })}
                        aria-label="항목 이름"
                      />
                      <select
                        className="fee-item-target"
                        value={it.target}
                        onChange={(e) => updateItem(it.id, { target: e.target.value })}
                        aria-label="정산 대상"
                        title="지애 님 항목은 인웅쌤 몫에서 차감해 지애 님 몫에 더하고, 인웅쌤 항목은 반대로 옮깁니다"
                      >
                        <option value="jiae">지애 님</option>
                        <option value="inung">인웅쌤</option>
                      </select>
                      <label className="fee-money-input item">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={num(Math.abs(it.amount))}
                          onChange={(e) => {
                            const abs = Number(e.target.value.replace(/[^\d]/g, '').slice(0, 9)) || 0;
                            updateItem(it.id, { amount: it.amount < 0 ? -abs : abs });
                          }}
                          aria-label="항목 금액"
                        />
                        <span>원</span>
                      </label>
                      <button
                        type="button"
                        className={`fee-sign-btn ${it.amount < 0 ? 'minus' : 'plus'}`}
                        onClick={() => updateItem(it.id, { amount: -it.amount })}
                        title="+ / - 전환"
                      >
                        {it.amount < 0 ? '차감' : '추가'}
                      </button>
                      <button
                        type="button"
                        className="fee-icon-btn danger"
                        onClick={() => deleteItem(it.id)}
                        title="항목 삭제"
                        aria-label={`${it.label} 삭제`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="fee-item-add">
                <input
                  className="fee-item-label"
                  type="text"
                  placeholder="예: 인웅쌤 추가 수업비, 기타 정산"
                  value={newItem.label}
                  onChange={(e) => setNewItem((p) => ({ ...p, label: e.target.value }))}
                  aria-label="새 항목 이름"
                />
                <select
                  className="fee-item-target"
                  value={newItem.target}
                  onChange={(e) => setNewItem((p) => ({ ...p, target: e.target.value }))}
                  aria-label="새 항목 대상"
                  title="지애 님 항목은 인웅쌤 몫에서 차감해 지애 님 몫에 더하고, 인웅쌤 항목은 반대로 옮깁니다"
                >
                  <option value="jiae">지애 님</option>
                  <option value="inung">인웅쌤</option>
                </select>
                <label className="fee-money-input item">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={newItem.amount ? num(Number(newItem.amount)) : ''}
                    onChange={(e) => setNewItem((p) => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '').slice(0, 9) }))}
                    aria-label="새 항목 금액"
                  />
                  <span>원</span>
                </label>
                <select
                  className="fee-item-sign"
                  value={newItem.sign}
                  onChange={(e) => setNewItem((p) => ({ ...p, sign: e.target.value }))}
                  aria-label="추가 또는 차감"
                >
                  <option value="-">− 차감</option>
                  <option value="+">+ 추가</option>
                </select>
                <button type="button" className="fee-btn outline small" onClick={handleAddItem}>
                  <Plus size={13} />
                  추가
                </button>
              </div>

              <div className="fee-extra-row sum">
                <span>추가 정산 반영 합계 <em>{calc.transferToJiae >= 0 ? '인웅쌤 몫에서 차감' : '지애 님 몫에서 차감'}</em></span>
                <b>{signed(calc.transferToJiae)}</b>
              </div>
            </div>

            <div className="fee-final">
              <span className="fee-final-label">최종 정산 합계</span>
              <span className="fee-final-amounts">
                <span>지애<b>{won(calc.jiae)}</b></span>
                <span>인웅쌤<b>{won(calc.inung)}</b></span>
                <span>합계<b>{won(calc.grand)}</b></span>
              </span>
            </div>

            <div className="fee-split-foot">
              레슨비 {won(calc.lessonBase)}(입금 확인 기준)을 {calc.ratio}:{100 - calc.ratio} 비율로 나누고
              {calc.transferToJiae !== 0 ? `, 추가 정산 ${signed(Math.abs(calc.transferToJiae))}을 ${calc.transferToJiae > 0 ? '인웅쌤 몫에서 지애 님 몫으로' : '지애 님 몫에서 인웅쌤 몫으로'} 옮겨` : ''} 두 사람 몫 합계가 입금 확인 금액 {won(calc.grand)}과 같습니다
              {calc.unpaidAmt ? ` · 미확인 ${won(calc.unpaidAmt)}은 배분 제외` : ''}
              {' '}· 비율·단가·인원을 바꾸면 바로 다시 계산됩니다
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <StudentModal
          mode={editing.mode}
          initial={editing.student}
          onClose={() => setEditing(null)}
          onSave={handleSaveStudent}
          onDelete={handleDeleteStudent}
        />
      ) : null}

      {statusConfirm ? (
        <StatusConfirmModal
          student={data.students.find((s) => s.id === statusConfirm.id) || statusConfirm}
          ymLabel={ymLabel}
          onCancel={closeStatusConfirm}
          onConfirm={confirmStatusChange}
        />
      ) : null}

      {toast ? <div className="fee-toast">{toast}</div> : null}
    </section>
  );
}

// ── 정산 기능 시작 월 ──
// 2026년 10월까지는 학생별 비율·예외 변동이 많아 앱에서 정산하지 않는다.
// (입금 내역은 구글 시트 「2026년 1~10월 입금 내역」 탭에서 관리)
export const FEE_START_YM = '2026-11';

function FeeCutoffNotice({ ymLabel, onGoToMonth }) {
  return (
    <section className="fee-page">
      <div className="fee-cutoff">
        <div className="fee-cutoff-icon">💰</div>
        <p className="fee-cutoff-kicker">레슨비 정산 · {monthLabel(FEE_START_YM)}부터</p>
        <h3>2026년 11월부터 레슨비 정산 기능을 사용합니다</h3>
        <p className="fee-cutoff-desc">
          {ymLabel}까지는 학생별 비율과 예외가 많아 이 화면에서 정산 계산을 하지 않습니다.{' '}
          {ymLabel} 입금 내역은 구글 시트 <b>「2026년 1~10월 입금 내역」</b> 탭에서 확인해 주세요.
        </p>

        <ul className="fee-cutoff-list">
          <li><b>11월부터</b> 학생별 입금 상태·입금일과 배분, 추가·차감 항목을 이 화면에서 그대로 정리할 수 있어요.</li>
          <li><b>1~10월</b> 기록은 구글 시트에 순수 입금 내역(건수·금액·학생별·입금일·상태)으로 남아 있어요.</li>
        </ul>

        <div className="fee-cutoff-actions">
          <button
            type="button"
            className="fee-btn primary"
            onClick={() => onGoToMonth && onGoToMonth(2026, 11)}
          >
            2026년 11월로 이동
          </button>
        </div>
      </div>
    </section>
  );
}

export default function FeePage({ year, month, onGoToMonth }) {
  const ym = `${year}-${String(month).padStart(2, '0')}`;

  // 2026년 10월 이하: 정산 계산·표시·편집 없이 안내 카드만 보여 준다.
  if (ym < FEE_START_YM) {
    return <FeeCutoffNotice ymLabel={monthLabel(ym)} onGoToMonth={onGoToMonth} />;
  }

  return <FeePageActive year={year} month={month} />;
}
