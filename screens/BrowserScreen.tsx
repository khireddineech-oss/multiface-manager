import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import BrowserEngine from '../components/BrowserEngine';
import type {
  BrowserEngineHandle,
  BrowserNavigationState,
} from '../components/browserTypes';
import {
  AccountAvatar,
  BrandMark,
  GradientButton,
  IconButton,
  InlineNotice,
  LabeledInput,
  ModalSheet,
} from '../components/UI';
import {
  checkCookieSupport,
  clearBrowserCookies,
  getFacebookSession,
  restoreFacebookSession,
  subscribeToCookieChanges,
} from '../lib/cookies';
import {
  cleanProfileName,
  FACEBOOK_HOME,
  FACEBOOK_PROFILE,
  isFacebookHost,
  isValidHttpsImageUrl,
  maskUserId,
} from '../lib/session';
import type {
  CookieSupport,
  FacebookSession,
  RootTabParamList,
} from '../lib/types';

const PROFILE_METADATA_SCRIPT = `
(function () {
  try {
    var imageMeta = document.querySelector('meta[property="og:image"]');
    var titleMeta = document.querySelector('meta[property="og:title"]');
    var title = titleMeta && titleMeta.content ? titleMeta.content : document.title;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      source: 'multi-facebook-profile-probe',
      avatarUrl: imageMeta && imageMeta.content ? imageMeta.content : '',
      profileName: title || '',
      pageUrl: window.location.href
    }));
  } catch (error) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      source: 'multi-facebook-profile-probe',
      avatarUrl: '',
      profileName: '',
      pageUrl: ''
    }));
  }
})();
true;
`;

type Props = BottomTabScreenProps<RootTabParamList, 'Browser'>;
type Notice = { text: string; type: 'info' | 'success' | 'warning' | 'error' };

const initialNavigation: BrowserNavigationState = {
  url: FACEBOOK_HOME,
  title: '',
  loading: true,
  canGoBack: false,
  canGoForward: false,
};

export default function BrowserScreen({ navigation, route }: Props) {
  const isFocused = useIsFocused();
  const {
    accounts,
    preferences,
    theme,
    isRTL,
    t,
    saveAccount,
    readAccountSession,
    markAccountUsed,
  } = useApp();
  const browserRef = useRef<BrowserEngineHandle>(null);
  const [uri, setUri] = useState(FACEBOOK_HOME);
  const [webKey, setWebKey] = useState(0);
  const [browserNavigation, setBrowserNavigation] =
    useState<BrowserNavigationState>(initialNavigation);
  const [loading, setLoading] = useState(Platform.OS !== 'web');
  const [webError, setWebError] = useState(false);
  const [support, setSupport] = useState<CookieSupport | null>(null);
  const [session, setSession] = useState<FacebookSession | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [operation, setOperation] = useState<'restore' | 'clear' | null>(null);
  const [pendingAccountName, setPendingAccountName] = useState('');
  const [saveVisible, setSaveVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileName, setProfileName] = useState<string | undefined>();
  const [probing, setProbing] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const sessionRef = useRef<FacebookSession | null>(null);
  const avatarUrlRef = useRef('');
  const activeAccountIdRef = useRef<string | null>(null);
  const operationRef = useRef<typeof operation>(null);
  const supportRef = useRef<CookieSupport | null>(null);
  const currentUrlRef = useRef(FACEBOOK_HOME);
  const refreshInFlightRef = useRef(false);
  const probeAttemptedUserRef = useRef<string | null>(null);
  const probingRef = useRef(false);
  const probeOriginRef = useRef(FACEBOOK_HOME);
  const probeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledRequestRef = useRef<number | null>(null);
  const initialDetectionDoneRef = useRef(false);
  const crashAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  sessionRef.current = session;
  avatarUrlRef.current = avatarUrl;
  activeAccountIdRef.current = activeAccountId;
  operationRef.current = operation;
  supportRef.current = support;

  const activeAccount = accounts.find((account) => account.id === activeAccountId);
  const canUseCookies = Platform.OS !== 'web' && support?.available === true;

  const stopProfileProbe = useCallback(() => {
    probingRef.current = false;
    setProbing(false);
    if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
    probeTimerRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void checkCookieSupport().then((result) => {
      if (mountedRef.current) setSupport(result);
    });
    return () => {
      mountedRef.current = false;
      if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, []);

  const refreshSession = useCallback(async (): Promise<FacebookSession | null> => {
    if (
      Platform.OS === 'web' ||
      supportRef.current?.available !== true ||
      refreshInFlightRef.current ||
      operationRef.current
    ) {
      return sessionRef.current;
    }
    refreshInFlightRef.current = true;
    if (!sessionRef.current) setDetecting(true);
    try {
      const detected = await getFacebookSession();
      if (!mountedRef.current) return detected;
      const previousUserId = sessionRef.current?.userId;
      sessionRef.current = detected;
      setSession(detected);

      const active = accounts.find(
        (account) => account.id === activeAccountIdRef.current,
      );
      if (detected && active && detected.userId !== active.userId) {
        activeAccountIdRef.current = null;
        setActiveAccountId(null);
      }
      if (detected && previousUserId !== detected.userId) {
        setAvatarUrl('');
        avatarUrlRef.current = '';
        setProfileName(undefined);
      }

      if (
        detected &&
        !activeAccountIdRef.current &&
        !avatarUrlRef.current &&
        probeAttemptedUserRef.current !== detected.userId
      ) {
        probeAttemptedUserRef.current = detected.userId;
        probingRef.current = true;
        setProbing(true);
        probeOriginRef.current = currentUrlRef.current || FACEBOOK_HOME;
        if (probeTimerRef.current) clearTimeout(probeTimerRef.current);
        probeTimerRef.current = setTimeout(stopProfileProbe, 9000);
        browserRef.current?.loadUrl(FACEBOOK_PROFILE);
      }
      return detected;
    } catch {
      // Navigation-level detection is deliberately quiet. The native support
      // banner explains unavailable engines; no session is fabricated on error.
      return sessionRef.current;
    } finally {
      refreshInFlightRef.current = false;
      if (mountedRef.current) setDetecting(false);
    }
  }, [accounts, stopProfileProbe]);

  useEffect(
    () => subscribeToCookieChanges(() => void refreshSession()),
    [refreshSession],
  );

  useEffect(() => {
    if (!support?.available || initialDetectionDoneRef.current) return;
    initialDetectionDoneRef.current = true;
    const timer = setTimeout(() => void refreshSession(), 350);
    return () => clearTimeout(timer);
  }, [support?.available, refreshSession]);

  const handleProfileMessage = useCallback(
    (data: string) => {
      if (data.length > 12000) return;
      try {
        const payload = JSON.parse(data) as {
          source?: string;
          avatarUrl?: string;
          profileName?: string;
          pageUrl?: string;
        };
        if (
          payload.source !== 'multi-facebook-profile-probe' ||
          !probingRef.current
        ) {
          return;
        }
        const name = cleanProfileName(payload.profileName);
        if (name) setProfileName(name);
        if (payload.avatarUrl) {
          const url = new URL(payload.avatarUrl);
          const host = url.hostname.toLowerCase();
          const trustedImageHost =
            isFacebookHost(host) ||
            host === 'fbcdn.net' ||
            host.endsWith('.fbcdn.net') ||
            host === 'fbsbx.com' ||
            host.endsWith('.fbsbx.com');
          if (url.protocol === 'https:' && trustedImageHost) {
            setAvatarUrl(url.toString());
            avatarUrlRef.current = url.toString();
          }
        }
        stopProfileProbe();
      } catch {
        // Only our small, structured profile-metadata message is accepted.
      }
    },
    [stopProfileProbe],
  );

  const scheduleRestoredSessionCheck = useCallback(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    expiryTimerRef.current = setTimeout(async () => {
      if (!activeAccountIdRef.current || operationRef.current) return;
      try {
        const verified = await getFacebookSession();
        if (verified) return;
      } catch {
        return;
      }
      if (mountedRef.current) {
        setNotice({ type: 'warning', text: t('sessionExpired') });
      }
    }, 4500);
  }, [t]);

  const handleLoadEnd = useCallback(
    async (url: string) => {
      currentUrlRef.current = url;
      setLoading(false);
      crashAttemptsRef.current = 0;
      const detected = await refreshSession();
      if (probingRef.current && url !== probeOriginRef.current) {
        setTimeout(() => {
          if (probingRef.current) {
            browserRef.current?.injectJavaScript(PROFILE_METADATA_SCRIPT);
          }
        }, 650);
      }
      if (activeAccountIdRef.current && !detected && !operationRef.current) {
        scheduleRestoredSessionCheck();
      } else if (detected && expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    },
    [refreshSession, scheduleRestoredSessionCheck],
  );

  const resetToLogin = useCallback(async () => {
    setOperation('clear');
    operationRef.current = 'clear';
    setNotice(null);
    stopProfileProbe();
    try {
      await clearBrowserCookies();
      probeAttemptedUserRef.current = null;
      sessionRef.current = null;
      activeAccountIdRef.current = null;
      setSession(null);
      setActiveAccountId(null);
      setAvatarUrl('');
      avatarUrlRef.current = '';
      setProfileName(undefined);
      setBrowserNavigation(initialNavigation);
      setUri(FACEBOOK_HOME);
      setWebError(false);
      setWebKey((value) => value + 1);
      return true;
    } catch {
      Alert.alert(t('browserError'), t('clearFailed'));
      return false;
    } finally {
      operationRef.current = null;
      if (mountedRef.current) setOperation(null);
    }
  }, [stopProfileProbe, t]);

  const handleSave = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      Alert.alert(t('saveAccount'), t('noSessionYet'));
      return;
    }
    if (!nickname.trim()) {
      Alert.alert(t('saveModalTitle'), t('nicknameRequired'));
      return;
    }
    if (!isValidHttpsImageUrl(avatarUrl)) {
      Alert.alert(t('saveModalTitle'), t('invalidUrl'));
      return;
    }
    setSaving(true);
    try {
      const result = await saveAccount({
        nickname,
        session: currentSession,
        avatarUrl: avatarUrl.trim() || undefined,
        profileName,
      });
      setSaveVisible(false);
      const cleared = await resetToLogin();
      if (cleared) {
        const base = result.updated
          ? t('updatedSuccess', { name: result.account.nickname })
          : t('savedSuccess', { name: result.account.nickname });
        const photoNote = result.account.avatarUri
          ? result.account.avatarIsLocal
            ? ` ${t('photoLocalNote')}`
            : ` ${t('photoLinkedNote')}`
          : '';
        setNotice({ type: 'success', text: `${base}${photoNote}` });
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
            () => undefined,
          );
        }
      } else {
        setNotice({
          type: 'warning',
          text: t('savedButClearFailed', { name: result.account.nickname }),
        });
      }
    } catch {
      Alert.alert(t('saveAccount'), t('saveFailed'));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [avatarUrl, nickname, profileName, resetToLogin, saveAccount, t]);

  const handleRestore = useCallback(
    async (accountId: string) => {
      const account = accounts.find((item) => item.id === accountId);
      if (!account) return;
      if (Platform.OS === 'web' || supportRef.current?.available !== true) {
        Alert.alert(
          t('nativeRequiredTitle'),
          supportRef.current?.reason === 'native-module'
            ? t('nativeModuleMissing')
            : t('nativeRequiredBody'),
        );
        return;
      }
      setPendingAccountName(account.nickname);
      setOperation('restore');
      operationRef.current = 'restore';
      setNotice(null);
      setWebError(false);
      stopProfileProbe();
      let restored = false;
      try {
        const savedSession = await readAccountSession(accountId);
        await restoreFacebookSession(savedSession);
        sessionRef.current = savedSession;
        activeAccountIdRef.current = accountId;
        setSession(savedSession);
        setActiveAccountId(accountId);
        setAvatarUrl(account.avatarSourceUrl || account.avatarUri || '');
        avatarUrlRef.current = account.avatarSourceUrl || account.avatarUri || '';
        setProfileName(account.profileName);
        setUri(FACEBOOK_HOME);
        setBrowserNavigation(initialNavigation);
        setWebKey((value) => value + 1);
        await markAccountUsed(accountId);
        restored = true;
        setNotice({
          type: 'success',
          text: t('restoreSuccess', { name: account.nickname }),
        });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
          () => undefined,
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        Alert.alert(
          t('accountsTitle'),
          code === 'SAVED_SESSION_NOT_FOUND'
            ? t('sessionMissing')
            : t('restoreFailed'),
        );
      } finally {
        operationRef.current = null;
        if (mountedRef.current) setOperation(null);
        if (restored) {
          setTimeout(async () => {
            const detected = await refreshSession();
            if (!detected) scheduleRestoredSessionCheck();
          }, 650);
        }
      }
    },
    [
      accounts,
      markAccountUsed,
      readAccountSession,
      refreshSession,
      scheduleRestoredSessionCheck,
      stopProfileProbe,
      t,
    ],
  );

  useEffect(() => {
    const requestId = route.params?.requestId;
    if (!requestId || handledRequestRef.current === requestId) return;
    handledRequestRef.current = requestId;
    const accountId = route.params?.accountId;
    const action = route.params?.action;
    navigation.setParams({ accountId: undefined, requestId: undefined, action: undefined });
    if (accountId) void handleRestore(accountId);
    if (action === 'clear') void resetToLogin();
  }, [handleRestore, navigation, resetToLogin, route.params]);

  const handleCrash = useCallback(() => {
    setLoading(false);
    if (preferences.crashRecovery && crashAttemptsRef.current < 2) {
      crashAttemptsRef.current += 1;
      setNotice({ type: 'info', text: t('recovering') });
      setWebError(false);
      setWebKey((value) => value + 1);
    } else {
      setWebError(true);
    }
  }, [preferences.crashRecovery, t]);

  const hostname = (() => {
    try {
      const host = new URL(browserNavigation.url).hostname;
      return isFacebookHost(host) ? host : 'facebook.com';
    } catch {
      return 'facebook.com';
    }
  })();

  const operationText =
    operation === 'restore'
      ? t('restoringSession', { name: pendingAccountName || activeAccount?.nickname || '' })
      : t('clearingBrowser');

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: theme.background, direction: isRTL ? 'rtl' : 'ltr' }]}
    >
      <View style={styles.topHeader}>
        <BrandMark size={43} />
        <View style={styles.brandCopy}>
          <Text style={[styles.brandName, { color: theme.text }]}>
            Multi <Text style={{ color: theme.primary }}>Facebook</Text>
          </Text>
          <Text style={[styles.brandTagline, { color: theme.textMuted }]}>
            {t('appTagline')}
          </Text>
        </View>
        <View style={[styles.privateBadge, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="shield-checkmark" size={14} color={theme.success} />
          <Text style={[styles.privateText, { color: theme.textSecondary }]}>
            {accounts.length}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {support?.reason === 'native-module' ? (
          <View style={styles.supportNotice}>
            <InlineNotice type="warning" text={t('nativeModuleMissing')} />
          </View>
        ) : null}

        <View
          style={[
            styles.browserCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={[styles.browserToolbar, { borderBottomColor: theme.border }]}>
            <View style={styles.navigationButtons}>
              <IconButton
                icon={isRTL ? 'chevron-forward' : 'chevron-back'}
                onPress={() => browserRef.current?.goBack()}
                disabled={!browserNavigation.canGoBack || Platform.OS === 'web'}
                label="Back"
              />
              <IconButton
                icon={isRTL ? 'chevron-back' : 'chevron-forward'}
                onPress={() => browserRef.current?.goForward()}
                disabled={!browserNavigation.canGoForward || Platform.OS === 'web'}
                label="Forward"
              />
            </View>
            <View style={[styles.addressPill, { backgroundColor: theme.surfaceMuted }]}>
              <Ionicons name="lock-closed" size={12} color={theme.success} />
              <Text numberOfLines={1} style={[styles.addressText, { color: theme.textSecondary }]}>
                {hostname}
              </Text>
            </View>
            <IconButton
              icon="reload"
              onPress={() => {
                setWebError(false);
                browserRef.current?.reload();
              }}
              disabled={Platform.OS === 'web'}
              label={t('retry')}
            />
          </View>
          {loading ? (
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loadingLine}
            />
          ) : null}
          <View style={styles.engineWrap}>
            {preferences.fastLogin || isFocused ? (
            <BrowserEngine
              key={webKey}
              ref={browserRef}
              uri={uri}
              fastLogin={preferences.fastLogin}
              onNavigationChange={(state) => {
                currentUrlRef.current = state.url || currentUrlRef.current;
                setBrowserNavigation(state);
              }}
              onLoadStart={() => {
                setLoading(true);
                setWebError(false);
              }}
              onLoadEnd={(url) => void handleLoadEnd(url)}
              onMessage={handleProfileMessage}
              onError={() => {
                setLoading(false);
                setWebError(true);
              }}
              onCrash={handleCrash}
            />
            ) : (
              <View style={[styles.pausedEngine, { backgroundColor: theme.backgroundElevated }]} />
            )}
            {loading && Platform.OS !== 'web' && (preferences.fastLogin || isFocused) ? (
              <View style={[styles.loadingOverlay, { backgroundColor: theme.backgroundElevated }]}>
                <ActivityIndicator color={theme.primary} size="large" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  {t('loadingFacebook')}
                </Text>
              </View>
            ) : null}
            {webError ? (
              <View style={[styles.errorOverlay, { backgroundColor: theme.backgroundElevated }]}>
                <View style={[styles.errorIcon, { backgroundColor: theme.dangerSurface }]}>
                  <Ionicons name="cloud-offline-outline" size={31} color={theme.danger} />
                </View>
                <Text style={[styles.errorTitle, { color: theme.text }]}>{t('browserError')}</Text>
                <Text style={[styles.errorBody, { color: theme.textSecondary }]}>
                  {t('browserErrorBody')}
                </Text>
                <GradientButton
                  title={t('retry')}
                  icon="reload"
                  compact
                  onPress={() => {
                    setWebError(false);
                    setWebKey((value) => value + 1);
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>

        {notice ? (
          <View style={styles.noticeWrap}>
            <InlineNotice
              type={notice.type}
              text={notice.text}
              icon={notice.type === 'success' ? 'checkmark-circle' : undefined}
            />
          </View>
        ) : null}

        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[
            styles.sessionCard,
            {
              backgroundColor: session ? theme.successSurface : theme.surface,
              borderColor: session ? theme.success : theme.border,
            },
          ]}
        >
          {operation ? (
            <View style={styles.operationRow}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.operationText, { color: theme.textSecondary }]}>
                {operationText}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.sessionTop}>
                {session ? (
                  <AccountAvatar
                    uri={activeAccount?.avatarUri || avatarUrl || undefined}
                    nickname={activeAccount?.nickname || profileName || 'F'}
                    size={40}
                    ring={false}
                  />
                ) : (
                  <View style={[styles.sessionIcon, { backgroundColor: theme.surfaceMuted }]}>
                    {detecting ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons name="key-outline" size={20} color={theme.textMuted} />
                    )}
                  </View>
                )}
                <View style={styles.sessionCopy}>
                  <Text style={[styles.sessionTitle, { color: theme.text }]}> 
                    {session
                      ? activeAccount
                        ? t('loggedInAs', { name: activeAccount.nickname })
                        : t('sessionDetected')
                      : detecting
                        ? t('detectingSession')
                        : t('noSession')}
                  </Text>
                  <Text numberOfLines={2} style={[styles.sessionBody, { color: theme.textSecondary }]}>
                    {session
                      ? activeAccount
                        ? t('restoredSession')
                        : `${t('sessionDetectedBody')}  •  ID ${maskUserId(session.userId)}`
                      : t('noSessionBody')}
                  </Text>
                </View>
                {session ? (
                  <Ionicons name="checkmark-circle" size={23} color={theme.success} />
                ) : null}
              </View>
              <View style={styles.saveButtonWrap}>
                <GradientButton
                  title={session && activeAccount ? t('addAnother') : t('saveAccount')}
                  icon={session && activeAccount ? 'add-circle-outline' : 'lock-closed-outline'}
                  onPress={() => {
                    if (session && activeAccount) {
                      void resetToLogin();
                    } else if (session && canUseCookies) {
                      setNickname('');
                      setSaveVisible(true);
                    } else if (session) {
                      Alert.alert(t('nativeRequiredTitle'), t('nativeRequiredBody'));
                    }
                  }}
                  disabled={!session || !canUseCookies || detecting}
                />
              </View>
            </>
          )}
        </Animated.View>
      </View>

      <ModalSheet
        visible={saveVisible}
        title={t('saveModalTitle')}
        subtitle={t('saveModalSubtitle')}
        onClose={() => setSaveVisible(false)}
        dismissible={!saving}
      >
        <View style={styles.modalProfileRow}>
          <AccountAvatar
            uri={avatarUrl || undefined}
            nickname={nickname || profileName || 'F'}
            size={62}
          />
          <View style={styles.modalProfileCopy}>
            <Text style={[styles.modalProfileTitle, { color: theme.text }]}> 
              {avatarUrl ? t('profileFound') : t('customPhoto')}
            </Text>
            <Text style={[styles.modalProfileBody, { color: theme.textSecondary }]}> 
              {probing ? t('profileDetecting') : t('avatarHint')}
            </Text>
          </View>
        </View>
        <LabeledInput
          label={t('nickname')}
          icon="person-outline"
          value={nickname}
          onChangeText={setNickname}
          placeholder={t('nicknamePlaceholder')}
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
          maxLength={40}
          editable={!saving}
        />
        <LabeledInput
          style={styles.secondInput}
          label={t('avatarUrlOptional')}
          icon="image-outline"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://example.com/photo.jpg"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          onSubmitEditing={() => void handleSave()}
          editable={!saving}
        />
        <View style={styles.modalActions}>
          <View style={styles.modalAction}>
            <GradientButton
              title={t('cancel')}
              variant="secondary"
              onPress={() => setSaveVisible(false)}
              disabled={saving}
            />
          </View>
          <View style={styles.modalAction}>
            <GradientButton
              title={saving ? t('saving') : t('ok')}
              icon="checkmark"
              onPress={() => void handleSave()}
              loading={saving}
              disabled={!nickname.trim()}
            />
          </View>
        </View>
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, gap: 11 },
  brandCopy: { flex: 1 },
  brandName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.45 },
  brandTagline: { fontSize: 10.5, marginTop: 2 },
  privateBadge: { height: 30, minWidth: 34, paddingHorizontal: 9, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  privateText: { fontSize: 12, fontWeight: '800' },
  content: { flex: 1, paddingHorizontal: 12, paddingBottom: 10 },
  supportNotice: { marginBottom: 9 },
  browserCard: { flex: 1, minHeight: 210, borderRadius: 22, borderWidth: 1, overflow: 'hidden', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  browserToolbar: { height: 50, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  navigationButtons: { flexDirection: 'row', gap: 4 },
  addressPill: { flex: 1, height: 34, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addressText: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  loadingLine: { height: 2, width: '100%' },
  engineWrap: { flex: 1, position: 'relative' },
  pausedEngine: { flex: 1 },
  loadingOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 13, zIndex: 2 },
  loadingText: { fontSize: 12, fontWeight: '600' },
  errorOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 3 },
  errorIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  errorTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  errorBody: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginBottom: 18, maxWidth: 310 },
  noticeWrap: { marginTop: 8 },
  sessionCard: { marginTop: 9, borderRadius: 20, borderWidth: 1, padding: 13 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sessionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sessionCopy: { flex: 1 },
  sessionTitle: { fontSize: 13, fontWeight: '800' },
  sessionBody: { fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  saveButtonWrap: { marginTop: 11 },
  operationRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11, paddingHorizontal: 10 },
  operationText: { flex: 1, fontSize: 12, lineHeight: 18 },
  modalProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 21 },
  modalProfileCopy: { flex: 1 },
  modalProfileTitle: { fontSize: 14, fontWeight: '800' },
  modalProfileBody: { fontSize: 11, lineHeight: 17, marginTop: 5 },
  secondInput: { marginTop: 16 },
  modalActions: { flexDirection: 'row', gap: 11, marginTop: 22 },
  modalAction: { flex: 1 },
});
