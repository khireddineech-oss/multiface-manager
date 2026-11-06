import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import {
  AccountAvatar,
  EmptyState,
  GradientButton,
  IconButton,
  InlineNotice,
  LabeledInput,
  ModalSheet,
  ScreenHeader,
} from '../components/UI';
import { isValidHttpsImageUrl } from '../lib/session';
import type { RootTabParamList, SavedAccount } from '../lib/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Accounts'>;

export default function AccountsScreen({ navigation }: Props) {
  const {
    accounts,
    theme,
    isRTL,
    t,
    preferences,
    refreshAccounts,
    updateAccount,
    deleteAccount,
  } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const editingAccount = accounts.find((account) => account.id === editingId);

  const openEditor = useCallback((account: SavedAccount) => {
    setEditingId(account.id);
    setNickname(account.nickname);
    setAvatarUrl(
      account.avatarSourceUrl || (!account.avatarIsLocal ? account.avatarUri : '') || '',
    );
    setRemovePhoto(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAccounts();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAccounts]);

  const handleUpdate = useCallback(async () => {
    if (!editingId) return;
    if (!nickname.trim()) {
      Alert.alert(t('editAccount'), t('nicknameRequired'));
      return;
    }
    if (!removePhoto && !isValidHttpsImageUrl(avatarUrl)) {
      Alert.alert(t('editAccount'), t('invalidUrl'));
      return;
    }
    setSaving(true);
    try {
      await updateAccount(editingId, {
        nickname,
        avatarUrl: removePhoto ? '' : avatarUrl,
        removeAvatar: removePhoto,
      });
      setEditingId(null);
      setNotice(t('accountUpdated'));
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
      }
    } catch {
      Alert.alert(t('editAccount'), t('genericError'));
    } finally {
      setSaving(false);
    }
  }, [avatarUrl, editingId, nickname, removePhoto, t, updateAccount]);

  const confirmDelete = useCallback(
    (account: SavedAccount) => {
      Alert.alert(
        t('deleteTitle', { name: account.nickname }),
        t('deleteBody'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: () => {
              setDeletingId(account.id);
              void deleteAccount(account.id)
                .then(() => {
                  setNotice(t('deleted', { name: account.nickname }));
                  if (Platform.OS !== 'web') {
                    void Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Warning,
                    ).catch(() => undefined);
                  }
                })
                .catch(() => Alert.alert(t('delete'), t('genericError')))
                .finally(() => setDeletingId(null));
            },
          },
        ],
      );
    },
    [deleteAccount, t],
  );

  const formatDate = useCallback(
    (date?: string) => {
      if (!date) return t('neverUsed');
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return t('neverUsed');
      return t('lastUsed', {
        date: parsed.toLocaleDateString(preferences.language === 'ar' ? 'ar' : 'en', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });
    },
    [preferences.language, t],
  );

  const listHeader = useMemo(
    () => (
      <>
        <ScreenHeader
          title={t('accountsTitle')}
          subtitle={t('accountsSubtitle')}
          icon="people-outline"
        />
        <View style={styles.summaryRow}>
          <View style={[styles.countPill, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="layers-outline" size={15} color={theme.primary} />
            <Text style={[styles.countText, { color: theme.textSecondary }]}>
              {t('savedAccounts', { count: accounts.length })}
            </Text>
          </View>
          <View style={styles.summarySecurity}>
            <Ionicons name="shield-checkmark-outline" size={15} color={theme.success} />
            <Text style={[styles.securityText, { color: theme.textMuted }]}>
              {t('privateOnDevice')}
            </Text>
          </View>
        </View>
        {Platform.OS === 'web' ? (
          <InlineNotice type="info" text={t('webAccountsNote')} />
        ) : null}
        {notice ? (
          <View style={styles.noticeWrap}>
            <InlineNotice type="success" text={notice} />
          </View>
        ) : null}
      </>
    ),
    [accounts.length, notice, t, theme],
  );

  const renderAccount = useCallback(
    ({ item, index }: { item: SavedAccount; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 55, 275)).duration(280)}>
        <Pressable
          onPress={() =>
            navigation.navigate('Browser', {
              accountId: item.id,
              requestId: Date.now(),
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`${item.nickname}. ${t('loginDirectly')}`}
          style={({ pressed }) => [
            styles.accountCard,
            {
              backgroundColor: pressed ? theme.surfacePressed : theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
              opacity: deletingId === item.id ? 0.45 : 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={styles.avatarColumn}>
            <AccountAvatar uri={item.avatarUri} nickname={item.nickname} size={56} />
            <View
              style={[
                styles.photoStatus,
                { backgroundColor: item.avatarUri ? theme.successSurface : theme.surfaceMuted },
              ]}
            >
              <Ionicons
                name={item.avatarUri ? 'image' : 'image-outline'}
                size={10}
                color={item.avatarUri ? theme.success : theme.textMuted}
              />
            </View>
          </View>
          <View style={styles.accountCopy}>
            <View style={styles.accountNameRow}>
              <Text numberOfLines={1} style={[styles.accountName, { color: theme.text }]}>
                {item.nickname}
              </Text>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={17}
                color={theme.textMuted}
              />
            </View>
            <Text style={[styles.loginHint, { color: theme.primary }]}>
              {t('loginDirectly')}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color={theme.textMuted} />
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {formatDate(item.lastUsedAt)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="shield-checkmark-outline" size={12} color={theme.textMuted} />
              <Text style={[styles.metaText, { color: theme.textMuted }]}>
                {t('cookiesCount', { count: item.cookieCount })}
                {'  •  '}
                {item.avatarUri
                  ? item.avatarIsLocal
                    ? t('localPhoto')
                    : t('linkedPhoto')
                  : t('noPhoto')}
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <IconButton
              icon="create-outline"
              onPress={() => openEditor(item)}
              label={t('edit')}
            />
            <IconButton
              icon="trash-outline"
              onPress={() => confirmDelete(item)}
              disabled={deletingId === item.id}
              label={t('delete')}
            />
          </View>
        </Pressable>
      </Animated.View>
    ),
    [confirmDelete, deletingId, formatDate, isRTL, navigation, openEditor, t, theme],
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor: theme.background, direction: isRTL ? 'rtl' : 'ltr' }]}
    >
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccount}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          accounts.length === 0 && styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={t('noAccountsTitle')}
            body={t('noAccountsBody')}
            action={
              <GradientButton
                title={t('addAccount')}
                icon="log-in-outline"
                onPress={() =>
                  navigation.navigate(
                    'Browser',
                    Platform.OS === 'web'
                      ? undefined
                      : { action: 'clear', requestId: Date.now() },
                  )
                }
              />
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={theme.primary}
            colors={[theme.primary]}
            title={t('refresh')}
            titleColor={theme.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={8}
      />

      <ModalSheet
        visible={Boolean(editingAccount)}
        title={t('editAccount')}
        subtitle={t('editSubtitle')}
        onClose={() => setEditingId(null)}
        dismissible={!saving}
      >
        <View style={styles.editorProfile}>
          <AccountAvatar
            uri={
              removePhoto
                ? undefined
                : editingAccount?.avatarIsLocal && avatarUrl === editingAccount.avatarSourceUrl
                  ? editingAccount.avatarUri
                  : avatarUrl || editingAccount?.avatarUri
            }
            nickname={nickname || '?'}
            size={62}
          />
          <View style={styles.editorProfileCopy}>
            <Text style={[styles.editorName, { color: theme.text }]}>
              {editingAccount?.profileName || editingAccount?.nickname}
            </Text>
            {editingAccount?.avatarUri && !removePhoto ? (
              <Pressable
                onPress={() => {
                  setRemovePhoto(true);
                  setAvatarUrl('');
                }}
                style={styles.removePhotoButton}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={14} color={theme.danger} />
                <Text style={[styles.removePhotoText, { color: theme.danger }]}>
                  {t('removePhoto')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <LabeledInput
          label={t('nickname')}
          icon="person-outline"
          value={nickname}
          onChangeText={setNickname}
          placeholder={t('nicknamePlaceholder')}
          autoCapitalize="words"
          maxLength={40}
          returnKeyType="next"
          editable={!saving}
        />
        <LabeledInput
          style={styles.secondInput}
          label={t('avatarUrlOptional')}
          icon="image-outline"
          value={avatarUrl}
          onChangeText={(value) => {
            setAvatarUrl(value);
            setRemovePhoto(false);
          }}
          placeholder="https://example.com/photo.jpg"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          onSubmitEditing={() => void handleUpdate()}
          editable={!saving}
        />
        <View style={styles.modalActions}>
          <View style={styles.modalAction}>
            <GradientButton
              title={t('cancel')}
              variant="secondary"
              onPress={() => setEditingId(null)}
              disabled={saving}
            />
          </View>
          <View style={styles.modalAction}>
            <GradientButton
              title={t('saveChanges')}
              icon="checkmark"
              onPress={() => void handleUpdate()}
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
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 26 },
  emptyListContent: { flexGrow: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 15, gap: 10 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 },
  countText: { fontSize: 12, fontWeight: '700' },
  summarySecurity: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  securityText: { fontSize: 10, fontWeight: '600' },
  noticeWrap: { marginTop: 12 },
  separator: { height: 12 },
  accountCard: { borderRadius: 22, borderWidth: 1, padding: 15, alignItems: 'center', gap: 12, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  avatarColumn: { alignItems: 'center' },
  photoStatus: { position: 'absolute', bottom: -1, end: -1, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accountCopy: { flex: 1, minWidth: 0 },
  accountNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accountName: { flex: 1, fontSize: 17, fontWeight: '800', letterSpacing: -0.25 },
  loginHint: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  metaText: { fontSize: 9.5, flex: 1, lineHeight: 14 },
  cardActions: { gap: 7 },
  editorProfile: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 20 },
  editorProfileCopy: { flex: 1 },
  editorName: { fontSize: 15, fontWeight: '800' },
  removePhotoButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, alignSelf: 'flex-start' },
  removePhotoText: { fontSize: 12, fontWeight: '700' },
  secondInput: { marginTop: 16 },
  modalActions: { flexDirection: 'row', gap: 11, marginTop: 22 },
  modalAction: { flex: 1 },
});
