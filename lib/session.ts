import type { SessionCookie } from './types';

export const FACEBOOK_HOME = 'https://www.facebook.com/';
export const FACEBOOK_PROFILE = 'https://www.facebook.com/me';

export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const isFacebookHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  return host === 'facebook.com' || host.endsWith('.facebook.com');
};

export const isValidHttpsImageUrl = (value: string) => {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
};

export const maskUserId = (userId: string) => {
  if (userId.length < 7) return '••••••';
  return `•••• ${userId.slice(-4)}`;
};

export const hasSessionCredentials = (cookies: SessionCookie[]) => {
  const user = cookies.find((cookie) => cookie.name === 'c_user' && cookie.value);
  const token = cookies.find((cookie) => cookie.name === 'xs' && cookie.value);
  return Boolean(user && token);
};

export const cleanProfileName = (value?: string) => {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\s*[|–-]\s*Facebook\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  return cleaned || undefined;
};
