export type Language = 'en' | 'ar';
export type ThemeMode = 'dark' | 'light';

export interface Preferences {
  language: Language;
  theme: ThemeMode;
  fastLogin: boolean;
  crashRecovery: boolean;
}

export interface SessionCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  version?: string;
  expires?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  maxAge?: number;
}

export interface FacebookSession {
  userId: string;
  cookies: SessionCookie[];
  capturedAt: string;
}

export interface SavedAccount {
  id: string;
  userId: string;
  nickname: string;
  profileName?: string;
  avatarUri?: string;
  avatarSourceUrl?: string;
  avatarIsLocal: boolean;
  cookieCount: number;
  createdAt: string;
  lastUsedAt?: string;
}

export interface SaveAccountInput {
  nickname: string;
  session: FacebookSession;
  avatarUrl?: string;
  profileName?: string;
}

export interface SaveAccountResult {
  account: SavedAccount;
  updated: boolean;
}

export interface CookieSupport {
  available: boolean;
  reason?: 'web' | 'native-module';
}

export type RootTabParamList = {
  Browser: { accountId?: string; requestId?: number; action?: 'clear' } | undefined;
  Accounts: undefined;
  Settings: undefined;
};
