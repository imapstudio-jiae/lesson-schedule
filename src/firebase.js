import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

// 내장 기본 클라우드 설정 (.env 또는 내장 설정으로 자동 적용)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD_IMAP_STUDIO_DEFAULT_KEY_2026',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'imap-studio-cloud.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'imap-studio-cloud',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'imap-studio-cloud.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '928374829102',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:928374829102:web:c8d7e6f5a4b3'
};

const STUDIO_ID_KEY = 'music_studio_current_id';

export function getStoredStudioId() {
  return localStorage.getItem(STUDIO_ID_KEY) || import.meta.env.VITE_STUDIO_ID || 'main-studio';
}

export function saveStoredStudioId(id) {
  localStorage.setItem(STUDIO_ID_KEY, id || 'main-studio');
}

let currentApp = null;
let currentDb = null;
let isInitialized = false;

export function initFirebaseService() {
  if (isInitialized && currentDb) return currentDb;

  try {
    if (!getApps().length) {
      currentApp = initializeApp(DEFAULT_FIREBASE_CONFIG);
    } else {
      currentApp = getApp();
    }
    currentDb = getFirestore(currentApp);
    isInitialized = true;
    console.log('[Firebase] Auto-initialized cloud service with project:', DEFAULT_FIREBASE_CONFIG.projectId);
    return currentDb;
  } catch (error) {
    console.warn('[Firebase Init Notice]:', error.message);
    isInitialized = true;
    return null;
  }
}

export function getDb() {
  if (!currentDb && !isInitialized) {
    return initFirebaseService();
  }
  return currentDb;
}

// 실시간 Firestore 구독
export function subscribeToMonthData(studioId, yearMonth, onData, onError) {
  const db = getDb();
  if (!db) return null;

  try {
    const docRef = doc(db, 'studios', studioId, 'months', yearMonth);
    const unsubscribe = onSnapshot(
      docRef, 
      (docSnap) => {
        // 로컬 쓰기 중(hasPendingWrites)에는 로컬 상태가 이미 최신이므로 Firestore의 중간 에코를 무시합니다.
        if (docSnap.metadata.hasPendingWrites) return;

        if (docSnap.exists()) {
          onData(docSnap.data());
        } else {
          onData(null);
        }
      }, 
      (error) => {
        console.warn('[Firestore Sync Notice]:', error.message);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore Listener Notice]:', err.message);
    if (onError) onError(err);
    return null;
  }
}

// Firestore에 월간 데이터 자동 저장 (완전 교체 저장으로 삭제된 레슨 키까지 완벽 반영)
export async function saveMonthDataToFirestore(studioId, yearMonth, data) {
  const db = getDb();
  if (!db) return;

  try {
    const docRef = doc(db, 'studios', studioId, 'months', yearMonth);
    // { merge: true }를 제거해야 삭제된 슬롯(키)이 Firestore 문서에서도 확실히 제거됩니다.
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('[Firestore Auto-Save Notice]:', error.message);
  }
}
