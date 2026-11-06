import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { createTheme, type AppTheme } from '../lib/theme';
import { translate, type TranslationKey } from '../lib/i18n';
import { createId, isValidHttpsImageUrl } from '../lib/session';
import { deleteAvatar, saveAvatar } from '../lib/avatars';
import {
  deleteSecureSession,
  readSecureSession,
  writeSecureSession,
} from '../lib/secureStorage';
import type {
  FacebookSession,
  Preferences,
  SaveAccountInput,
  SaveAccountResult,
  SavedAccount,
  ThemeMode,
} from '../lib/types';

const ACCOUNTS_KEY = '@multi-facebook/accounts-v1';
const PREFERENCES_KEY = '@multi-facebook/preferences-v1';

interface UpdateAccountInput {
  nickname: string;
  avatarUrl?: string;
  removeAvatar?: boolean;
}

interface AppContextValue {
  accounts: SavedAccount[];
  preferences: Preferences;
  theme: AppTheme;
  isReady: boolean;
  isRTL: boolean;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  updatePreferences: (patch: Partial<Preferences>) => Promise<void>;
  saveAccount: (input: SaveAccountInput) => Promise<SaveAccountResult>;
  updateAccount: (accountId: string, input: UpdateAccountInput) => Promise<SavedAccount>;
  deleteAccount: (accountId: string) => Promise<void>;
  clearAllAccounts: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  markAccountUsed: (accountId: string) => Promise<void>;
  readAccountSession: (accountId: string) => Promise<FacebookSession>;
}

const AppContext = createContext<AppContextValue | null>(null);

const parseAccounts = (raw: string | null): SavedAccount[] => {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter(
      (account): account is SavedAccount =>
        typeof account === 'object' &&
        account !== null &&
        typeof account.id === 'string' &&
        typeof account.userId === 'string' &&
        typeof account.nickname === 'string' &&
        typeof account.createdAt === 'string',
    );
  } catch {
    return [];
  }
};

const parsePreferences = (raw: string | null, fallback: Preferences): Preferences => {
  if (!raw) return fallback;
  try {
    const saved = JSON.parse(raw) as Partial<Preferences>;
    return {
      language: saved.language === 'ar' ? 'ar' : 'en',
      theme: saved.theme === 'light' ? 'light' : 'dark',
      fastLogin: saved.fastLogin !== false,
      crashRecovery: saved.crashRecovery !== false,
    };
  } catch {
    return fallback;
  }
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const initialPreferences = useRef<Preferences>({
    language: 'en',
    theme: colorScheme === 'light' ? 'light' : 'dark',
    fastLogin: true,
    crashRecovery: true,
  }).current;
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [isReady, setIsReady] = useState(false);
  const accountsRef = useRef<SavedAccount[]>([]);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  const persistAccounts = useCallback(async (next: SavedAccount[]) => {
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
    accountsRef.current = next;
    setAccounts(next);
  }, []);

  const refreshAccounts = useCallback(async () => {
    const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    const stored = parseAccounts(raw);
    accountsRef.current = stored;
    setAccounts(stored);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [storedAccounts, storedPreferences] = await Promise.all([
        AsyncStorage.getItem(ACCOUNTS_KEY).catch(() => null),
        AsyncStorage.getItem(PREFERENCES_KEY).catch(() => null),
      ]);
      if (!mounted) return;
      const parsedAccounts = parseAccounts(storedAccounts);
      accountsRef.current = parsedAccounts;
      setAccounts(parsedAccounts);
      setPreferences(parsePreferences(storedPreferences, initialPreferences));
      setIsReady(true);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [initialPreferences]);

  const updatePreferences = useCallback(
    async (patch: Partial<Preferences>) => {
      const next = { ...preferences, ...patch };
      setPreferences(next);
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    },
    [preferences],
  );

  const saveAccount = useCallback(
    async (input: SaveAccountInput): Promise<SaveAccountResult> => {
      const nickname = input.nickname.trim();
      if (!nickname) throw new Error('NICKNAME_REQUIRED');
      if (!isValidHttpsImageUrl(input.avatarUrl || '')) {
        throw new Error('INVALID_AVATAR_URL');
      }
      const current = accountsRef.current;
      const existing = current.find((account) => account.userId === input.session.userId);
      const id = existing?.id || createId();
      await writeSecureSession(id, input.session);
      const avatar = input.avatarUrl?.trim()
        ? await saveAvatar(nickname, id, input.avatarUrl)
        : existing
          ? {
              uri: existing.avatarUri,
              sourceUrl: existing.avatarSourceUrl,
              isLocal: existing.avatarIsLocal,
            }
          : null;
      const now = new Date().toISOString();
      const account: SavedAccount = {
        id,
        userId: input.session.userId,
        nickname: nickname.slice(0, 40),
        profileName: input.profileName || existing?.profileName,
        avatarUri: avatar?.uri,
        avatarSourceUrl: avatar?.sourceUrl,
        avatarIsLocal: avatar?.isLocal || false,
        cookieCount: input.session.cookies.length,
        createdAt: existing?.createdAt || now,
        lastUsedAt: existing?.lastUsedAt,
      };
      const next = existing
        ? current.map((item) => (item.id === id ? account : item))
        : [account, ...current];
      try {
        await persistAccounts(next);
      } catch (error) {
        if (!existing) {
          await deleteSecureSession(id).catch(() => undefined);
          await deleteAvatar(account.avatarUri, account.avatarIsLocal);
        }
        throw error;
      }
      if (
        existing?.avatarUri &&
        existing.avatarUri !== account.avatarUri
      ) {
        await deleteAvatar(existing.avatarUri, existing.avatarIsLocal);
      }
      return { account, updated: Boolean(existing) };
    },
    [persistAccounts],
  );

  const updateAccount = useCallback(
    async (accountId: string, input: UpdateAccountInput) => {
      const nickname = input.nickname.trim();
      if (!nickname) throw new Error('NICKNAME_REQUIRED');
      const current = accountsRef.current;
      const existing = current.find((account) => account.id === accountId);
      if (!existing) throw new Error('ACCOUNT_NOT_FOUND');
      const oldUrl = existing.avatarSourceUrl || (!existing.avatarIsLocal ? existing.avatarUri : '') || '';
      const requestedUrl = input.avatarUrl?.trim();
      if (requestedUrl && !isValidHttpsImageUrl(requestedUrl)) {
        throw new Error('INVALID_AVATAR_URL');
      }
      const shouldRemove = input.removeAvatar || requestedUrl === '';
      const shouldReplace =
        !shouldRemove && requestedUrl !== undefined && requestedUrl !== oldUrl;
      const avatar = shouldRemove
        ? null
        : shouldReplace
          ? await saveAvatar(nickname, accountId, requestedUrl)
          : {
              uri: existing.avatarUri,
              sourceUrl: existing.avatarSourceUrl,
              isLocal: existing.avatarIsLocal,
            };
      const updated: SavedAccount = {
        ...existing,
        nickname: nickname.slice(0, 40),
        avatarUri: avatar?.uri,
        avatarSourceUrl: avatar?.sourceUrl,
        avatarIsLocal: avatar?.isLocal || false,
      };
      await persistAccounts(
        current.map((account) => (account.id === accountId ? updated : account)),
      );
      if ((shouldRemove || shouldReplace) && existing.avatarUri !== updated.avatarUri) {
        await deleteAvatar(existing.avatarUri, existing.avatarIsLocal);
      }
      return updated;
    },
    [persistAccounts],
  );

  const deleteAccount = useCallback(
    async (accountId: string) => {
      const current = accountsRef.current;
      const account = current.find((item) => item.id === accountId);
      await deleteSecureSession(accountId);
      await deleteAvatar(account?.avatarUri, account?.avatarIsLocal);
      await persistAccounts(current.filter((item) => item.id !== accountId));
    },
    [persistAccounts],
  );

  const clearAllAccounts = useCallback(async () => {
    const current = accountsRef.current;
    for (const account of current) {
      await deleteSecureSession(account.id);
      await deleteAvatar(account.avatarUri, account.avatarIsLocal);
    }
    await persistAccounts([]);
  }, [persistAccounts]);

  const markAccountUsed = useCallback(
    async (accountId: string) => {
      const current = accountsRef.current;
      const next = current.map((account) =>
        account.id === accountId
          ? { ...account, lastUsedAt: new Date().toISOString() }
          : account,
      );
      await persistAccounts(next);
    },
    [persistAccounts],
  );

  const theme = useMemo(() => createTheme(preferences.theme), [preferences.theme]);
  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(preferences.language, key, values),
    [preferences.language],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      accounts,
      preferences,
      theme,
      isReady,
      isRTL: preferences.language === 'ar',
      t,
      updatePreferences,
      saveAccount,
      updateAccount,
      deleteAccount,
      clearAllAccounts,
      refreshAccounts,
      markAccountUsed,
      readAccountSession: readSecureSession,
    }),
    [
      accounts,
      preferences,
      theme,
      isReady,
      t,
      updatePreferences,
      saveAccount,
      updateAccount,
      deleteAccount,
      clearAllAccounts,
      refreshAccounts,
      markAccountUsed,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
};
