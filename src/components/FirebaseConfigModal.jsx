import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  ShieldCheck, 
  Activity,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { 
  getStoredFirebaseConfig, 
  saveStoredFirebaseConfig, 
  getStoredStudioId, 
  saveStoredStudioId,
  initFirebaseService,
  testFirestoreConnection
} from '../firebase';

const FIRESTORE_SIMPLE_RULE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

const FIRESTORE_STUDIO_RULE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /studios/{studio}/{allPaths=**} {
      allow read, write: if true;
    }
  }
}`;

export default function FirebaseConfigModal({
  isOpen,
  onClose,
  onConfigSaved
}) {
  if (!isOpen) return null;

  const [rawJson, setRawJson] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [studioId, setStudioId] = useState('main-studio');
  
  const [message, setMessage] = useState(null);
  const [copiedRuleType, setCopiedRuleType] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const existing = getStoredFirebaseConfig();
    if (existing) {
      setApiKey(existing.apiKey || '');
      setProjectId(existing.projectId || '');
      setAuthDomain(existing.authDomain || '');
      setStorageBucket(existing.storageBucket || '');
      setMessagingSenderId(existing.messagingSenderId || '');
      setAppId(existing.appId || '');
    }
    setStudioId(getStoredStudioId());
  }, [isOpen]);

  // Firebase 콘솔 설정 복사/붙여넣기 파싱
  const handleParseRaw = () => {
    try {
      let text = rawJson.trim();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        text = match[0];
      }
      
      const extractField = (key) => {
        const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`);
        const found = text.match(regex);
        return found ? found[1] : '';
      };

      const extractedApiKey = extractField('apiKey');
      const extractedProjectId = extractField('projectId');
      const extractedAuthDomain = extractField('authDomain');
      const extractedStorageBucket = extractField('storageBucket');
      const extractedMessagingSenderId = extractField('messagingSenderId');
      const extractedAppId = extractField('appId');

      if (extractedApiKey) setApiKey(extractedApiKey);
      if (extractedProjectId) setProjectId(extractedProjectId);
      if (extractedAuthDomain) setAuthDomain(extractedAuthDomain);
      if (extractedStorageBucket) setStorageBucket(extractedStorageBucket);
      if (extractedMessagingSenderId) setMessagingSenderId(extractedMessagingSenderId);
      if (extractedAppId) setAppId(extractedAppId);

      setMessage({ type: 'success', text: 'Firebase 설정이 자동으로 채워졌습니다!' });
      setRawJson('');
    } catch (err) {
      setMessage({ type: 'error', text: '파싱에 실패했습니다. 형식(JSON/객체)을 확인해주세요.' });
    }
  };

  // 보안 규칙 클립보드 복사 함수 (요청 3)
  const handleCopyRule = (ruleText, ruleType) => {
    navigator.clipboard.writeText(ruleText).then(() => {
      setCopiedRuleType(ruleType);
      setTimeout(() => {
        setCopiedRuleType(null);
      }, 2500);
    }).catch(err => {
      console.error('Failed to copy rule:', err);
    });
  };

  // 실시간 연결 및 권한 테스트 실행
  const handleTestConnection = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setMessage({ type: 'error', text: '테스트를 위해 API Key와 Project ID를 먼저 입력해주세요.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const config = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    const res = await testFirestoreConnection(config, studioId.trim() || 'main-studio');
    setIsTesting(false);
    setTestResult(res);
  };

  // 설정 저장
  const handleSave = () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setMessage({ type: 'error', text: '최소한 API Key와 Project ID는 필수입니다.' });
      return;
    }

    const config = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    saveStoredFirebaseConfig(config);
    saveStoredStudioId(studioId.trim() || 'main-studio');
    initFirebaseService();

    if (onConfigSaved) onConfigSaved();
    setMessage({ type: 'success', text: 'Firebase 설정이 저장되었습니다! 실시간 동기화가 활성화됩니다.' });
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // 로컬 모드로 전환 (연결 해제)
  const handleDisconnect = () => {
    if (confirm('Firebase 설정을 삭제하고 브라우저 로컬 저장 모드로 전환하시겠습니까?')) {
      saveStoredFirebaseConfig(null);
      initFirebaseService();
      if (onConfigSaved) onConfigSaved();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <Flame size={22} color="#EA580C" />
            <span>Firebase Firestore 실시간 연동 & 보안 규칙</span>
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
          회원가입 없이, <strong>Firebase 콘솔의 웹 앱 설정</strong>을 입력하고 <strong>보안 규칙을 간편 공유용으로 허용</strong>하면 원장님과 실시간으로 완벽하게 동기화됩니다.
        </p>

        {message && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: message.type === 'success' ? '#047857' : '#B91C1C',
            border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* 간편 자동 파싱 박스 */}
        <div style={{
          background: 'var(--color-bg-subtle)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            ⚡ Firebase 콘솔 설정 복사/붙여넣기 (빠른 자동 완성)
          </label>
          <textarea
            rows={2}
            placeholder={`Firebase 콘솔에서 복사한 코드 전체를 붙여넣으세요.\n예: const firebaseConfig = { apiKey: "...", projectId: "..." };`}
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
          />
          <button 
            type="button" 
            className="btn-pill"
            onClick={handleParseRaw}
            style={{ alignSelf: 'flex-start', padding: '5px 12px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={12} />
            <span>설정 값 자동 채우기</span>
          </button>
        </div>

        {/* 세부 필드 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="modal-form-group">
            <label className="modal-label">스튜디오 룸 ID (공유 키) *</label>
            <input
              type="text"
              value={studioId}
              onChange={(e) => setStudioId(e.target.value)}
              placeholder="main-studio"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="modal-form-group">
              <label className="modal-label">API Key *</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
              />
            </div>
            <div className="modal-form-group">
              <label className="modal-label">Project ID *</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-music-studio-app"
              />
            </div>
          </div>
        </div>

        {/* 연결 및 권한 테스트 결과 박스 */}
        {testResult && (
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.86rem',
            backgroundColor: testResult.success ? '#ECFDF5' : '#FEF2F2',
            color: testResult.success ? '#065F46' : '#991B1B',
            border: `1.5px solid ${testResult.success ? '#10B981' : '#EF4444'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              {testResult.success ? <CheckCircle2 size={18} color="#059669" /> : <AlertCircle size={18} color="#DC2626" />}
              <span>{testResult.success ? '연결 및 권한 테스트 통과!' : testResult.error.title}</span>
            </div>
            <div style={{ fontSize: '0.82rem', lineHeight: '1.45' }}>
              {testResult.success ? testResult.message : testResult.error.description}
            </div>
            {!testResult.success && testResult.error.raw && (
              <div style={{ fontSize: '0.75rem', color: '#B91C1C', fontFamily: 'monospace', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: '4px' }}>
                {testResult.error.raw}
              </div>
            )}
          </div>
        )}

        {/* 요청 3: Firestore 보안 규칙 설정 안내 및 복사 버튼 */}
        <div style={{
          background: '#FFFBEB',
          border: '1.5px solid #FCD34D',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#92400E', fontSize: '0.9rem' }}>
              <ShieldCheck size={18} color="#D97706" />
              <span>Firestore 보안 규칙 (간편 공유용 설정)</span>
            </div>
            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noreferrer"
              style={{ fontSize: '0.78rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
            >
              <span>Firebase 콘솔 바로가기</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#78350F', lineHeight: '1.45' }}>
            Firebase Console &gt; <strong>Firestore Database</strong> &gt; <strong>규칙(Rules)</strong> 탭에 아래 규칙을 붙여넣고 <strong>[게시(Publish)]</strong>를 누르면 로그인 없이 실시간 동기화가 가능합니다:
          </p>

          {/* 전체 허용 규칙 코드 블록 & 복사 버튼 */}
          <div style={{ position: 'relative' }}>
            <pre style={{
              background: '#1C1917',
              color: '#34D399',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontFamily: 'monospace',
              lineHeight: '1.4',
              overflowX: 'auto'
            }}>{FIRESTORE_SIMPLE_RULE}</pre>
            <button
              type="button"
              className="btn-pill"
              onClick={() => handleCopyRule(FIRESTORE_SIMPLE_RULE, 'simple')}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '4px 10px',
                fontSize: '0.76rem',
                backgroundColor: copiedRuleType === 'simple' ? '#059669' : 'white',
                color: copiedRuleType === 'simple' ? 'white' : '#1C1917'
              }}
            >
              {copiedRuleType === 'simple' ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedRuleType === 'simple' ? '복사 완료!' : '규칙 복사'}</span>
            </button>
          </div>
        </div>

        {/* 하단 모달 액션 버튼 */}
        <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn-pill"
              onClick={handleTestConnection}
              disabled={isTesting}
              style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#C7D2FE' }}
              title="현재 설정으로 Firestore 읽기/쓰기가 되는지 바로 테스트"
            >
              <Activity size={14} className={isTesting ? 'spin-icon' : ''} />
              <span>{isTesting ? '테스트 중...' : '⚡ 연결 & 권한 테스트'}</span>
            </button>

            <button 
              type="button" 
              className="btn-pill"
              onClick={handleDisconnect}
              style={{ color: '#DC2626', borderColor: '#FECACA' }}
              title="Firebase 연동을 해제하고 브라우저 로컬 저장으로 전환"
            >
              연결 해제 (로컬 모드)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-pill" onClick={onClose}>
              닫기
            </button>
            <button 
              type="button" 
              className="btn-pill btn-primary"
              onClick={handleSave}
            >
              <Check size={14} />
              <span>연동 저장 및 동기화</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
