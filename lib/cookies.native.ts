import { Platform } from 'react-native';
import type {
  Cookie,
  CookieManagerError,
  IOSCookieStoreOptions,
} from '@preeternal/react-native-cookie-manager';
import type {
  CookieSupport,
  FacebookSession,
  SessionCookie,
} from './types';
import { hasSessionCredentials } from './session';

type Manager = typeof import('@preeternal/react-native-cookie-manager').default;

const FACEBOOK_URLS = [
  'https://www.facebook.com/',
  'https://m.facebook.com/',
] as const;

let cachedManager: Manager | undefined;

const getManager = (): Manager => {
  if (cachedManager) return cachedManager;
  try {
    // Lazy loading keeps Expo Go and the web preview from crashing at startup.
    // The real session engine is available in Android/iOS development builds.
    const module = require('@preeternal/react-native-cookie-manager') as {
      default: Manager;
    };
    cachedManager = module.default;
    return cachedManager;
  } catch {
    throw new Error('NATIVE_COOKIE_MODULE_UNAVAILABLE');
  }
};

const iosOptions = (): IOSCookieStoreOptions | undefined =>
  Platform.OS === 'ios' ? { iosCookieStore: 'webKit' } : undefined;

const normalizeCookie = (cookie: Cookie): SessionCookie | null => {
  if (!cookie || typeof cookie.name !== 'string' || typeof cookie.value !== 'string') {
    return null;
  }
  const domain = cookie.domain?.toLowerCase();
  if (
    domain &&
    domain !== 'facebook.com' &&
    !domain.endsWith('.facebook.com')
  ) {
    return null;
  }

  const normalized: SessionCookie = {
    name: cookie.name,
    value: cookie.value,
  };
  if (cookie.path) normalized.path = cookie.path;
  if (domain) normalized.domain = domain;
  if (cookie.version) normalized.version = cookie.version;
  if (cookie.expires) normalized.expires = cookie.expires;
  if (typeof cookie.secure === 'boolean') normalized.secure = cookie.secure;
  if (typeof cookie.httpOnly === 'boolean') normalized.httpOnly = cookie.httpOnly;
  if (typeof cookie.maxAge === 'number' && Number.isFinite(cookie.maxAge)) {
    normalized.maxAge = cookie.maxAge;
  }
  const sameSite = cookie.sameSite?.toLowerCase();
  if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
    normalized.sameSite = sameSite;
  }
  return normalized;
};

const cookieKey = (cookie: SessionCookie) =>
  `${cookie.name}|${cookie.domain || ''}|${cookie.path || '/'}`;

export const checkCookieSupport = async (): Promise<CookieSupport> => {
  try {
    getManager();
    return { available: true };
  } catch {
    return { available: false, reason: 'native-module' };
  }
};

export const getFacebookSession = async (): Promise<FacebookSession | null> => {
  const manager = getManager();
  const results = await Promise.allSettled(
    FACEBOOK_URLS.map((url) => manager.getAsArray(url, iosOptions())),
  );
  const merged = new Map<string, SessionCookie>();
  let successfulRead = false;

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    successfulRead = true;
    for (const rawCookie of result.value) {
      const cookie = normalizeCookie(rawCookie);
      if (cookie) merged.set(cookieKey(cookie), cookie);
    }
  }

  if (!successfulRead) {
    const rejected = results.find((result) => result.status === 'rejected');
    throw rejected?.reason || new Error('COOKIE_READ_FAILED');
  }

  const cookies = Array.from(merged.values());
  const userCookie = cookies.find(
    (cookie) => cookie.name === 'c_user' && Boolean(cookie.value),
  );
  if (!userCookie || !hasSessionCredentials(cookies)) return null;

  return {
    userId: userCookie.value,
    cookies,
    capturedAt: new Date().toISOString(),
  };
};

export const clearBrowserCookies = async () => {
  const manager = getManager();
  await manager.clearAllStores();
  await manager.flush();
};

const cookieOrigin = (cookie: SessionCookie) => {
  const domain = cookie.domain?.replace(/^\./, '');
  return domain === 'm.facebook.com'
    ? 'https://m.facebook.com/'
    : 'https://www.facebook.com/';
};

const isCookieManagerError = (error: unknown): error is CookieManagerError =>
  typeof error === 'object' && error !== null && 'code' in error;

export const restoreFacebookSession = async (session: FacebookSession) => {
  if (!hasSessionCredentials(session.cookies)) {
    throw new Error('SAVED_SESSION_INVALID');
  }
  const manager = getManager();
  await clearBrowserCookies();

  let restoredCount = 0;
  let skippedCount = 0;
  for (const cookie of session.cookies) {
    const essential = cookie.name === 'c_user' || cookie.name === 'xs';
    try {
      await manager.set(cookieOrigin(cookie), cookie, iosOptions());
      restoredCount += 1;
    } catch (error) {
      // A persisted cookie with an outdated expiry format can still be restored
      // as a browser-session cookie. Never disable structural validation.
      if (cookie.expires && isCookieManagerError(error) && error.code === 'invalid_cookie') {
        try {
          const { expires: _expires, ...withoutExpiry } = cookie;
          await manager.set(cookieOrigin(cookie), withoutExpiry, iosOptions());
          restoredCount += 1;
          continue;
        } catch {
          // Handled by the essential-cookie check below.
        }
      }
      if (essential) throw new Error('SESSION_COOKIE_RESTORE_FAILED');
      skippedCount += 1;
    }
  }

  await manager.flush();
  const verification = await getFacebookSession();
  if (!verification || verification.userId !== session.userId) {
    throw new Error('SESSION_RESTORE_VERIFICATION_FAILED');
  }
  return { restoredCount, skippedCount };
};

export const subscribeToCookieChanges = (listener: () => void) => {
  if (Platform.OS !== 'ios') return () => undefined;
  try {
    const subscription = getManager().addCookieChangeListener(listener);
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
};
