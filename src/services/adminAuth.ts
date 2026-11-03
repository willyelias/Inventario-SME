/**
 * Admin Authentication Service
 * Uses SHA-256 cryptographic hashing with salt so the plaintext password
 * is NEVER stored in the repository, bundle, or localStorage.
 */

const ADMIN_SALT = 'sme_inventario_salt_2026';
const ADMIN_HASH = 'dee2c0fc52c43f273d4669aa56e8a90cfb0612bfcdd7c7448de2f43c3171a514';
const SESSION_KEY = 'inventario_sme_admin_session';

export interface AdminSession {
  user: string;
  loggedAt: number;
}

/**
 * Computes SHA-256 hash using the native browser Web Crypto API
 */
async function computeHash(user: string, pass: string): Promise<string> {
  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();
  const text = ADMIN_SALT + cleanUser + cleanPass;
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks if current browser session is authenticated as admin
 */
export function isAdminAuthenticated(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const session: AdminSession = JSON.parse(raw);
    // Session is valid for 8 hours
    const maxAgeMs = 8 * 60 * 60 * 1000;
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
 * Authenticates user and stores active admin session if valid
 */
export async function authenticateAdmin(user: string, pass: string): Promise<boolean> {
  try {
    const hash = await computeHash(user, pass);
    if (hash === ADMIN_HASH) {
      const session: AdminSession = {
        user: 'admin',
        loggedAt: Date.now()
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Erro na validação de credenciais:', err);
    return false;
  }
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
