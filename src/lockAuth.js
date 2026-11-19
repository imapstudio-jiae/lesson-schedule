// IMAP Studio — 스튜디오 내부 전용 잠금 게이트
// 비밀번호는 코드에 평문으로 두지 않고 SHA-256 해시만 비교합니다.

// '202424' 의 SHA-256 해시
const PASSWORD_SHA256 = 'b7269371ab5633b0b3f7a1febd07c1347496eaf375136b8e5b01014c86dd2a86';

const STORAGE_KEY = 'imap_studio_unlocked';
const UNLOCK_TOKEN = `v1:${PASSWORD_SHA256}`;

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x, n) {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

// crypto.subtle 을 쓸 수 없는 환경(비보안 컨텍스트 등)을 위한 순수 JS SHA-256
function sha256Bytes(bytes) {
  const len = bytes.length;
  const total = (((len + 1 + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[len] = 0x80;

  const view = new DataView(buf.buffer);
  const bitLen = len * 8;
  view.setUint32(total - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(total - 4, bitLen >>> 0);

  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < total; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);

    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return Array.from(H)
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    try {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      // 아래 순수 JS 구현으로 대체
    }
  }

  return sha256Bytes(bytes);
}

// 입력한 비밀번호가 맞는지 해시끼리 비교
export async function verifyPassword(input) {
  if (typeof input !== 'string' || input.length === 0) return false;
  const hashed = await sha256Hex(input);
  return hashed === PASSWORD_SHA256;
}

// 이 기기/브라우저에서 잠금이 풀려 있는지
export function isUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEY) === UNLOCK_TOKEN;
  } catch (e) {
    return false;
  }
}

// 잠금 해제 상태 저장 (새로고침·재방문 시 다시 묻지 않음)
export function rememberUnlock() {
  try {
    localStorage.setItem(STORAGE_KEY, UNLOCK_TOKEN);
  } catch (e) {
    // 저장할 수 없는 브라우저에서는 이번 세션 동안만 열린 상태로 둡니다.
  }
}

// 다시 잠그기
export function lockStudio() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // 무시
  }
}
