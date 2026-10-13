import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

const STORAGE_KEY = 'music_studio_firebase_config';
const STUDIO_ID_KEY = 'music_studio_current_id';

// 환경 변수 또는 LocalStorage에서 Firebase 설정 불러오기
export function getStoredFirebaseConfig() {
  const localSaved = localStorage.getItem(STORAGE_KEY);
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse stored firebase config', e);
    }
  }

  // .env 환경변수 기본값 확인
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
    };
  }

  return null;
}

export function saveStoredFirebaseConfig(config) {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

export function getStoredStudioId() {
  return localStorage.getItem(STUDIO_ID_KEY) || 'main-studio';
}

export function saveStoredStudioId(id) {
  localStorage.setItem(STUDIO_ID_KEY, id || 'main-studio');
}

let currentApp = null;
let currentDb = null;

export function initFirebaseService() {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    currentApp = null;
    currentDb = null;
    return null;
  }

  try {
    if (!getApps().length) {
      currentApp = initializeApp(config);
    } else {
      currentApp = getApp();
    }
    currentDb = getFirestore(currentApp);
    console.log('[Firebase] Successfully initialized Firestore with project:', config.projectId);
    return currentDb;
  } catch (error) {
    console.error('[Firebase Init Error]:', error);
    currentApp = null;
    currentDb = null;
    return null;
  }
}

export function getDb() {
  if (!currentDb) {
    return initFirebaseService();
  }
  return currentDb;
}

// Firestore 에러 코드에 대응하는 사용자 친화적 한글 메시지
export function formatFirestoreError(error) {
  if (!error) return '알 수 없는 오류가 발생했습니다.';

  const code = error.code || '';
  const msg = error.message || String(error);

  if (code === 'permission-denied' || msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    return {
      type: 'permission',
      title: 'Firestore 보안 규칙(Rules) 권한 거부 (permission-denied)',
      description: 'Firebase Console의 Firestore Database > 규칙(Rules) 탭에서 allow read, write: if true; 로 설정되어 있는지 확인하세요.',
      raw: msg
    };
  }

  if (code === 'unavailable' || msg.includes('unavailable')) {
    return {
      type: 'network',
      title: 'Firestore 서버에 연결할 수 없음 (unavailable)',
      description: '인터넷 연결 상태 또는 Firebase 서비스 상태를 확인해주세요. 잠시 후 재시도됩니다.',
      raw: msg
    };
  }

  if (code === 'not-found' || msg.includes('not-found')) {
    return {
      type: 'not-found',
      title: '데이터베이스를 찾을 수 없음 (not-found)',
      description: 'Firebase Console에서 Cloud Firestore 데이터베이스가 생성되었는지 확인해주세요.',
      raw: msg
    };
  }

  if (code === 'invalid-argument') {
    return {
      type: 'argument',
      title: '잘못된 인자 또는 데이터 형식 (invalid-argument)',
      description: '저장하려는 데이터 형식이 올바르지 않습니다.',
      raw: msg
    };
  }

  return {
    type: 'unknown',
    title: `Firestore 연결 오류 (${code || '오류'})`,
    description: msg,
    raw: msg
  };
}

// 실시간 Firestore 구독 헬퍼
export function subscribeToMonthData(studioId, yearMonth, onData, onError) {
  const db = getDb();
  if (!db) return null;

  try {
    const docRef = doc(db, 'studios', studioId, 'months', yearMonth);
    const unsubscribe = onSnapshot(
      docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data());
        } else {
          onData(null); // 아직 문서 없음
        }
      }, 
      (error) => {
        const formatted = formatFirestoreError(error);
        console.error('[Firestore Realtime Sync Error]:', formatted.title, formatted.description, error);
        if (onError) onError(formatted);
      }
    );

    return unsubscribe;
  } catch (err) {
    const formatted = formatFirestoreError(err);
    console.error('[Firestore Listener Setup Error]:', formatted.title, formatted.description, err);
    if (onError) onError(formatted);
    return null;
  }
}

// Firestore에 월간 데이터 저장/업데이트
export async function saveMonthDataToFirestore(studioId, yearMonth, data) {
  const db = getDb();
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다. API Key와 Project ID를 확인해주세요.');
  }

  try {
    const docRef = doc(db, 'studios', studioId, 'months', yearMonth);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`[Firestore Save Success] Saved data for ${studioId}/${yearMonth}`);
  } catch (error) {
    const formatted = formatFirestoreError(error);
    console.error('[Firestore Save Error]:', formatted.title, formatted.description, error);
    throw formatted;
  }
}

// 실제 Firestore 연결 및 읽기/쓰기 권한 테스트 함수
export async function testFirestoreConnection(customConfig, customStudioId = 'main-studio') {
  let tempApp = null;
  try {
    const tempAppName = `test-app-${Date.now()}`;
    tempApp = initializeApp(customConfig, tempAppName);
    const tempDb = getFirestore(tempApp);

    const testDocRef = doc(tempDb, 'studios', customStudioId, 'system', '_connection_test');
    
    // 1. 쓰기 테스트
    await setDoc(testDocRef, {
      testTimestamp: Date.now(),
      clientInfo: 'Music Schedule App Connection Test'
    });

    // 2. 읽기 테스트
    const snap = await getDoc(testDocRef);
    if (!snap.exists()) {
      throw new Error('테스트 문서를 작성했으나 읽어오지 못했습니다.');
    }

    // 테스트 앱 정리
    await deleteApp(tempApp);

    return {
      success: true,
      message: 'Firestore 읽기 및 쓰기 권한 테스트를 모두 통과했습니다! 실시간 연동이 정상 작동합니다.'
    };
  } catch (error) {
    if (tempApp) {
      try { await deleteApp(tempApp); } catch (e) {}
    }
    const formatted = formatFirestoreError(error);
    return {
      success: false,
      error: formatted
    };
  }
}
