import React, { useState, type ReactNode } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import {
  GradientButton,
  InlineNotice,
  ScreenHeader,
  SectionCard,
  SegmentedControl,
  SettingRow,
} from '../components/UI';
import type { Language, Preferences, ThemeMode } from '../lib/types';

function InfoRow({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const { theme, isRTL } = useApp();
  return (
    <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.infoIcon, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={icon} size={21} color={theme.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={[styles.infoTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.infoBody, { color: theme.textSecondary }]}>{body}</Text>
        {children}
      </View>
    </View>
  );
}

function Divider() {
  const { theme } = useApp();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

export default function SettingsScreen() {
  const {
    accounts,
    preferences,
    theme,
    isRTL,
    t,
    updatePreferences,
    clearAllAccounts,
  } = useApp();
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const changePreferences = (patch: Partial<Preferences>) => {
    void updatePreferences(patch).catch(() => {
      Alert.alert(t('settings'), t('genericError'));
    });
  };

  const confirmClearAll = () => {
    Alert.alert(t('clearAllTitle'), t('clearAllBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('clearAll'),
        style: 'destructive',
        onPress: () => {
          setClearing(true);
          void clearAllAccounts()
            .then(() => setNotice(t('allCleared')))
            .catch(() => Alert.alert(t('clearAll'), t('genericError')))
            .finally(() => setClearing(false));
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: theme.background, direction: isRTL ? 'rtl' : 'ltr' }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={t('settingsTitle')}
          subtitle={t('settingsSubtitle')}
          icon="options-outline"
        />
        {notice ? (
          <View style={styles.notice}>
            <InlineNotice type="success" text={notice} />
          </View>
        ) : null}

        <SectionCard title={t('appearance')}>
          <View style={styles.preferenceBlock}>
            <View style={styles.preferenceLabelRow}>
              <Ionicons name="language-outline" size={19} color={theme.primary} />
              <Text style={[styles.preferenceLabel, { color: theme.text }]}>{t('language')}</Text>
            </View>
            <SegmentedControl<Language>
              value={preferences.language}
              onChange={(language) => changePreferences({ language })}
              label={t('language')}
              options={[
                { value: 'en', label: t('english') },
                { value: 'ar', label: t('arabic') },
              ]}
            />
          </View>
          <Divider />
          <View style={styles.preferenceBlock}>
            <View style={styles.preferenceLabelRow}>
              <Ionicons name="color-palette-outline" size={19} color={theme.primary} />
              <Text style={[styles.preferenceLabel, { color: theme.text }]}>{t('theme')}</Text>
            </View>
            <SegmentedControl<ThemeMode>
              value={preferences.theme}
              onChange={(mode) => changePreferences({ theme: mode })}
              label={t('theme')}
              options={[
                { value: 'dark', label: t('dark'), icon: 'moon-outline' },
                { value: 'light', label: t('light'), icon: 'sunny-outline' },
              ]}
            />
          </View>
        </SectionCard>

        <SectionCard title={t('performance')}>
          <SettingRow
            icon="flash-outline"
            title={t('fastLogin')}
            body={t('fastLoginBody')}
            value={preferences.fastLogin}
            onValueChange={(fastLogin) => changePreferences({ fastLogin })}
          />
          <Divider />
          <SettingRow
            icon="medkit-outline"
            title={t('crashRecovery')}
            body={t('crashRecoveryBody')}
            value={preferences.crashRecovery}
            onValueChange={(crashRecovery) => changePreferences({ crashRecovery })}
          />
        </SectionCard>

        <SectionCard title={t('privacy')}>
          <InfoRow
            icon="lock-closed-outline"
            title={t('secureStorage')}
            body={t('secureStorageBody')}
          />
          <Divider />
          <InfoRow
            icon="phone-portrait-outline"
            title={t('localOnly')}
            body={t('localOnlyBody')}
          />
          <Divider />
          <InfoRow
            icon="construct-outline"
            title={t('nativeBuild')}
            body={t('nativeBuildBody')}
          >
            <View style={[styles.runtimePill, { backgroundColor: theme.surfaceMuted }]}>
              <View style={[styles.runtimeDot, { backgroundColor: Platform.OS === 'web' ? theme.warning : theme.success }]} />
              <Text style={[styles.runtimeText, { color: theme.textMuted }]}>
                {t('nativeRuntime', { platform: Platform.OS })}
              </Text>
            </View>
          </InfoRow>
          <Divider />
          <View style={styles.dangerBlock}>
            <Text style={[styles.sessionHint, { color: theme.textSecondary }]}>
              {t('sessionHint')}
            </Text>
            <GradientButton
              title={t('clearAll')}
              icon="trash-outline"
              variant="danger"
              onPress={confirmClearAll}
              loading={clearing}
              disabled={accounts.length === 0}
            />
          </View>
        </SectionCard>

        <SectionCard title={t('about')}>
          <InfoRow icon="information-circle-outline" title="Multi Facebook" body={t('aboutBody')} />
        </SectionCard>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={17} color={theme.textMuted} />
          <Text style={[styles.footerText, { color: theme.textMuted }]}>{t('independent')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 34 },
  notice: { marginTop: 13 },
  preferenceBlock: { padding: 17, gap: 13 },
  preferenceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preferenceLabel: { fontSize: 14, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 17 },
  infoRow: { padding: 17, gap: 12, alignItems: 'flex-start' },
  infoIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '700' },
  infoBody: { fontSize: 12, lineHeight: 19, marginTop: 5 },
  runtimePill: { marginTop: 11, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  runtimeDot: { width: 6, height: 6, borderRadius: 3 },
  runtimeText: { fontSize: 10, fontWeight: '600' },
  dangerBlock: { padding: 17, gap: 15 },
  sessionHint: { fontSize: 11, lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8, paddingHorizontal: 22, paddingTop: 25 },
  footerText: { flex: 1, fontSize: 10.5, lineHeight: 17, textAlign: 'center', maxWidth: 390 },
});
