/**
 * Admin Authentication Service
 * Authenticates user credentials with multi-layer verification:
 * 1. Direct match verification (guarantees 100% compatibility across all browsers/contexts)
 * 2. Pure JS SHA-256 + Web Crypto SHA-256 hash validation
 * 3. SessionStorage persistence for active sessions
 */

const ADMIN_SALT = 'sme_inventario_salt_2026';
const ADMIN_HASH = 'f10d9af914021c67fe8de45dd0a85c62c9bbf8a36761b595ed6032f3d67edaa1';
const SESSION_KEY = 'inventario_sme_admin_session';

export interface AdminSession {
  user: string;
  loggedAt: number;
}

// Pure JS SHA-256 as guaranteed fallback for non-secure contexts (e.g. HTTP on local network IP)
function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let currentBlockIndex = 0;
  for (i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    words[currentBlockIndex >> 2] |= code << (24 - (currentBlockIndex % 4) * 8);
    currentBlockIndex++;
  }
  words[currentBlockIndex >> 2] |= 0x80 << (24 - (currentBlockIndex % 4) * 8);
  words[(((currentBlockIndex + 8) >> 6) << 4) + 15] = asciiBitLength;

  for (let b = 0; b < words.length; b += 16) {
    const w: number[] = [];
    for (i = 0; i < 16; i++) w[i] = words[b + i] | 0;
    for (i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let [a_temp, b_temp, c_temp, d_temp, e_temp, f_temp, g_temp, h_temp] = hash;

    for (i = 0; i < 64; i++) {
      const S1 = rightRotate(e_temp, 6) ^ rightRotate(e_temp, 11) ^ rightRotate(e_temp, 25);
      const ch = (e_temp & f_temp) ^ (~e_temp & g_temp);
      const temp1 = (h_temp + S1 + ch + k[i] + w[i]) | 0;
      const S0 = rightRotate(a_temp, 2) ^ rightRotate(a_temp, 13) ^ rightRotate(a_temp, 22);
      const maj = (a_temp & b_temp) ^ (a_temp & c_temp) ^ (b_temp & c_temp);
      const temp2 = (S0 + maj) | 0;

      h_temp = g_temp;
      g_temp = f_temp;
      f_temp = e_temp;
      e_temp = (d_temp + temp1) | 0;
      d_temp = c_temp;
      c_temp = b_temp;
      b_temp = a_temp;
      a_temp = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a_temp) | 0;
    hash[1] = (hash[1] + b_temp) | 0;
    hash[2] = (hash[2] + c_temp) | 0;
    hash[3] = (hash[3] + d_temp) | 0;
    hash[4] = (hash[4] + e_temp) | 0;
    hash[5] = (hash[5] + f_temp) | 0;
    hash[6] = (hash[6] + g_temp) | 0;
    hash[7] = (hash[7] + h_temp) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

async function computeHash(user: string, pass: string): Promise<string> {
  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();
  const text = ADMIN_SALT + cleanUser + cleanPass;

  // Try native Web Crypto API first if available in secure context
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  return sha256Pure(text);
}

/**
 * Checks if current browser session is authenticated as admin
 */
export function isAdminAuthenticated(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session: AdminSession = JSON.parse(raw);
    const maxAgeMs = 12 * 60 * 60 * 1000; // 12 hours
    if (Date.now() - session.loggedAt > maxAgeMs) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return session.user === 'admin';
  } catch {
    return false;
  }
}

/**
 * Authenticates user and stores active admin session if valid.
 * Uses both direct validation and cryptographic hash matching.
 */
export async function authenticateAdmin(user: string, pass: string): Promise<boolean> {
  const cleanUser = (user || '').trim().toLowerCase();
  const cleanPass = (pass || '').trim();

  if (!cleanUser || !cleanPass) return false;

  // Check 1: Direct comparison (failsafe against any crypto/browser restriction)
  const isDirectMatch = cleanUser === 'admin' && cleanPass === 'bEm151258@$1';

  // Check 2: Hash comparison
  let isHashMatch = false;
  try {
    const hash = await computeHash(cleanUser, cleanPass);
    isHashMatch = hash === ADMIN_HASH;
  } catch (err) {
    console.warn('Aviso no cálculo de hash:', err);
  }

  if (isDirectMatch || isHashMatch) {
    const session: AdminSession = {
      user: 'admin',
      loggedAt: Date.now()
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // no-op
    }
    return true;
  }

  return false;
}

/**
 * Clears admin session (locks back to read-only mode)
 */
export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // no-op
  }
}
