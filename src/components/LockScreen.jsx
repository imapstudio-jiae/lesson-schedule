import React, { useEffect, useRef, useState } from 'react';
import { verifyPassword, rememberUnlock } from '../lockAuth';
import '../lock.css';

export default function LockScreen({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (checking) return;

    if (!value.trim()) {
      setError('비밀번호를 입력해 주세요.');
      inputRef.current?.focus();
      return;
    }

    setChecking(true);
    const ok = await verifyPassword(value);
    setChecking(false);

    if (ok) {
      rememberUnlock();
      setError('');
      onUnlock?.();
      return;
    }

    setError('비밀번호가 맞지 않습니다.');
    setValue('');
    setShake(true);
    window.setTimeout(() => setShake(false), 520);
    inputRef.current?.focus();
  };

  return (
    <div className="lock-page">
      <form
        className={`lock-card${shake ? ' lock-shake' : ''}`}
        onSubmit={handleSubmit}
        aria-label="IMAP Studio 잠금 해제"
      >
        <div className="lock-badge" aria-hidden="true">
          <span className="lock-badge-icon">🔒</span>
        </div>

        <h1 className="lock-title">IMAP Studio</h1>
        <p className="lock-subtitle">스튜디오 내부 전용 시간표</p>

        <label className="lock-label" htmlFor="lock-password">
          비밀번호
        </label>
        <input
          id="lock-password"
          ref={inputRef}
          className="lock-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="비밀번호를 입력하세요"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError('');
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'lock-error' : undefined}
          disabled={checking}
        />

        <p id="lock-error" className="lock-error" role="alert" aria-live="polite">
          {error}
        </p>

        <button type="submit" className="lock-submit" disabled={checking}>
          {checking ? '확인 중…' : '잠금 해제'}
        </button>

        <p className="lock-footnote">IMAP Studio · 내부용</p>
      </form>
    </div>
  );
}
