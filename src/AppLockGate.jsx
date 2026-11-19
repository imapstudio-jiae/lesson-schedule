import React, { useCallback, useState } from 'react';
import App from './App';
import LockScreen from './components/LockScreen';
import { isUnlocked, lockStudio } from './lockAuth';

// 잠금 해제 전에는 App(시간표·정산) 자체를 마운트하지 않아
// Supabase/Firestore 조회가 일어나지 않고 데이터가 화면에 노출되지 않습니다.
export default function AppLockGate() {
  const [unlocked, setUnlocked] = useState(isUnlocked);

  const handleUnlock = useCallback(() => {
    setUnlocked(true);
  }, []);

  const handleLock = useCallback(() => {
    lockStudio();
    setUnlocked(false);
  }, []);

  if (!unlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return <App onLock={handleLock} />;
}
