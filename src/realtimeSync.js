// IMAP Studio 실시간 클라우드 & 로컬 자동 동기화 엔진
// 사용자의 수동 설정 없이 백엔드 연동을 완전 자동화합니다.

const SYNC_TOPIC = 'imap_studio_schedule_shared_sync_v1';
const NTFY_WS_URL = `wss://ntfy.sh/${SYNC_TOPIC}/ws`;
const NTFY_POST_URL = `https://ntfy.sh/${SYNC_TOPIC}`;

class RealtimeSyncManager {
  constructor() {
    this.broadcastChannel = null;
    this.ws = null;
    this.listeners = new Set();
    this.currentYearMonth = null;
    this.clientId = 'client_' + Math.random().toString(36).substring(2, 11);
    this.reconnectTimer = null;
    this.initLocalBroadcast();
    this.initCloudWebSocket();
  }

  // 1. 동일 기기 다중 탭 즉시 동기화 (BroadcastChannel)
  initLocalBroadcast() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('imap_studio_local_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, payloadKey, data, senderId } = event.data || {};
          if (senderId === this.clientId) return; // 내가 보낸 것은 무시
          if (type === 'SCHEDULE_SYNC' && payloadKey) {
            this.notifyListeners(payloadKey, data, 'local_broadcast');
          }
        };
      }
    } catch (err) {
      console.warn('[Sync] BroadcastChannel init warning:', err);
    }
  }

  // 2. 다른 기기 / 다른 사용자 간 실시간 클라우드 동기화 (WebSocket)
  initCloudWebSocket() {
    if (typeof window === 'undefined') return;

    try {
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
      }

      this.ws = new WebSocket(NTFY_WS_URL);

      this.ws.onopen = () => {
        console.log('[Cloud Sync] Connected to real-time sync network.');
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.event === 'message' && raw.message) {
            const parsedPayload = JSON.parse(raw.message);
            const { type, payloadKey, data, senderId } = parsedPayload || {};

            // 내가 직접 전송한 메시지는 무시하여 중복 반영 방지
            if (senderId === this.clientId) return;

            if (type === 'SCHEDULE_SYNC' && payloadKey && data) {
              console.log(`[Cloud Sync] Received real-time update from peer for ${payloadKey}`);
              this.notifyListeners(payloadKey, data, 'cloud_realtime');
            }
          }
        } catch (e) {
          // 비동기 파싱 에러 무시
        }
      };

      this.ws.onclose = () => {
        // 자동 재연결
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.initCloudWebSocket();
        }, 5000);
      };

      this.ws.onerror = (err) => {
        console.warn('[Cloud Sync] WebSocket notice:', err);
      };
    } catch (err) {
      console.warn('[Cloud Sync] Failed to connect WebSocket:', err);
    }
  }

  // 리스너 등록
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(payloadKey, data, source) {
    this.listeners.forEach((callback) => {
      try {
        callback({ payloadKey, data, source });
      } catch (e) {
        console.error('[Sync Callback Error]:', e);
      }
    });
  }

  // 데이터 변경 시 클라우드 및 로컬 탭에 동시 실시간 전파
  async broadcastUpdate(yearMonthKey, data) {
    const payload = {
      type: 'SCHEDULE_SYNC',
      payloadKey: yearMonthKey,
      data,
      senderId: this.clientId,
      timestamp: Date.now()
    };

    // 1. 로컬 다중 탭 동기화
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (err) {
        console.warn('[Sync] Local broadcast failed:', err);
      }
    }

    // 2. 다른 기기 사용자들을 위한 클라우드 실시간 전송
    try {
      fetch(NTFY_POST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Title': 'IMAP Studio Sync',
          'Tags': 'musical_note'
        },
        body: JSON.stringify(payload)
      }).catch((err) => {
        console.warn('[Cloud Sync] Peer push notice:', err);
      });
    } catch (err) {
      console.warn('[Cloud Sync] Push err:', err);
    }
  }
}

export const realtimeSync = new RealtimeSyncManager();
