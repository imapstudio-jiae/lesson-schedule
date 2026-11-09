// Supabase 영구 클라우드 스토리지 서비스
// 복잡한 SDK 없이 가볍고 안전한 REST API로 완벽 연동합니다.

const SUPABASE_URL = 'https://kntrffydktjflvgttnlt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WBNiCS21h_NTVBLOnKNJiw_o0R8BPc3';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates'
};

// 특정 키의 데이터 조회 (GET)
export async function getSupabaseData(key) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/studio_schedule?key=eq.${encodeURIComponent(key)}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) {
      console.warn(`[Supabase GET Error] ${res.status}:`, await res.text());
      return null;
    }

    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].data;
    }
    return null;
  } catch (err) {
    console.warn('[Supabase GET Network Error]:', err);
    return null;
  }
}

// 특정 키의 데이터 저장 (UPSERT)
export async function saveSupabaseData(key, data) {
  try {
    const payload = {
      key,
      data,
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/studio_schedule`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`[Supabase SAVE Error] ${res.status}:`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase SAVE Network Error]:', err);
    return false;
  }
}

