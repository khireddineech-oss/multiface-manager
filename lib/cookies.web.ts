import type { CookieSupport, FacebookSession } from './types';

export const checkCookieSupport = async (): Promise<CookieSupport> => ({
  available: false,
  reason: 'web',
});

export const getFacebookSession = async (): Promise<FacebookSession | null> => null;

export const clearBrowserCookies = async (): Promise<never> => {
  throw new Error('WEB_COOKIE_ACCESS_UNSUPPORTED');
};

export const restoreFacebookSession = async (): Promise<never> => {
  throw new Error('WEB_COOKIE_ACCESS_UNSUPPORTED');
};

export const subscribeToCookieChanges = (_listener: () => void) => () => undefined;
