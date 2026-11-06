import React, { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import type { AppTheme } from '../lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function ScalePressable({
  children,
  onPress,
  disabled,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: object;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.975, { damping: 18, stiffness: 350 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 350 });
      }}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={style}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

export function BrandMark({ size = 46 }: { size?: number }) {
  return (
    <LinearGradient
      colors={['#4C7DFF', '#6657E8', '#9A62F4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.brandMark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.31,
        },
      ]}
    >
      <View style={[styles.brandOrbit, { width: size * 0.7, height: size * 0.7 }]} />
      <Ionicons name="layers" size={size * 0.49} color="#FFFFFF" />
    </LinearGradient>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
}) {
  const { theme } = useApp();
  return (
    <LinearGradient
      colors={theme.heroGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.screenHeader, { borderColor: theme.border }]}
    >
      <View style={[styles.headerGlow, { backgroundColor: theme.primary }]} />
      <View style={[styles.headerIcon, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={icon} size={25} color={theme.primary} />
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
    </LinearGradient>
  );
}

export function AccountAvatar({
  uri,
  nickname,
  size = 54,
  ring = true,
}: {
  uri?: string;
  nickname: string;
  size?: number;
  ring?: boolean;
}) {
  const { theme } = useApp();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const initial = nickname.trim().charAt(0).toUpperCase() || '?';
  const image = uri && !failed ? (
    <Image
      source={{ uri }}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      transition={180}
      onError={() => setFailed(true)}
      accessibilityLabel={`${nickname} profile`}
    />
  ) : (
    <View
      style={[
        styles.avatarFallback,
        { backgroundColor: theme.surfaceMuted },
      ]}
    >
      <Text style={[styles.avatarInitial, { color: theme.primary, fontSize: size * 0.37 }]}>
        {initial}
      </Text>
    </View>
  );

  if (!ring) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
        }}
      >
        {image}
      </View>
    );
  }
  return (
    <LinearGradient
      colors={['#5C8DFF', '#9B68ED']}
      style={{
        width: size + 4,
        height: size + 4,
        borderRadius: (size + 4) / 2,
        padding: 2,
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: theme.surface,
        }}
      >
        {image}
      </View>
    </LinearGradient>
  );
}

export function GradientButton({
  title,
  icon,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  compact = false,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  compact?: boolean;
}) {
  const { theme } = useApp();
  const inactive = disabled || loading;
  const content = (
    <View style={[styles.buttonContent, compact && styles.buttonCompact]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : theme.text}
        />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={compact ? 17 : 19}
          color={
            variant === 'primary'
              ? '#FFFFFF'
              : variant === 'danger'
                ? theme.danger
                : theme.text
          }
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          compact ? styles.buttonTextCompact : styles.buttonText,
          {
            color:
              variant === 'primary'
                ? '#FFFFFF'
                : variant === 'danger'
                  ? theme.danger
                  : theme.text,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
  return (
    <ScalePressable
      onPress={onPress}
      disabled={inactive}
      accessibilityLabel={title}
      style={{ opacity: inactive ? 0.38 : 1 }}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            compact && styles.buttonOuterCompact,
            { shadowColor: theme.primaryStrong },
          ]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            compact && styles.buttonOuterCompact,
            {
              backgroundColor:
                variant === 'danger' ? theme.dangerSurface : theme.surfaceMuted,
              borderColor: variant === 'danger' ? theme.danger : theme.border,
              borderWidth: 1,
            },
          ]}
        >
          {content}
        </View>
      )}
    </ScalePressable>
  );
}

export function IconButton({
  icon,
  onPress,
  disabled = false,
  label,
  active = false,
}: {
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  label: string;
  active?: boolean;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: active || pressed ? theme.surfacePressed : theme.surfaceMuted,
          opacity: disabled ? 0.3 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={19} color={active ? theme.primary : theme.textSecondary} />
    </Pressable>
  );
}

export function InlineNotice({
  text,
  type = 'info',
  icon,
}: {
  text: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: IconName;
}) {
  const { theme } = useApp();
  const palette = {
    info: { color: theme.primary, background: theme.surfaceMuted, defaultIcon: 'information-circle' as IconName },
    success: { color: theme.success, background: theme.successSurface, defaultIcon: 'checkmark-circle' as IconName },
    warning: { color: theme.warning, background: theme.warningSurface, defaultIcon: 'warning' as IconName },
    error: { color: theme.danger, background: theme.dangerSurface, defaultIcon: 'alert-circle' as IconName },
  }[type];
  return (
    <Animated.View
      entering={FadeInDown.duration(240)}
      style={[styles.notice, { backgroundColor: palette.background }]}
    >
      <Ionicons name={icon || palette.defaultIcon} size={19} color={palette.color} />
      <Text style={[styles.noticeText, { color: palette.color }]}>{text}</Text>
    </Animated.View>
  );
}

export function ModalSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  dismissible = true,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const { theme, isRTL } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => dismissible && onClose()}
    >
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: theme.overlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => dismissible && onClose()}
          accessibilityLabel="Close dialog"
        />
        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          style={[
            styles.modalSheet,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.border,
              marginBottom: Math.max(insets.bottom, 18),
              direction: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        >
          <View style={[styles.modalHandle, { backgroundColor: theme.borderBright }]} />
          <View style={styles.modalHeadingRow}>
            <View style={styles.flex1}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="close" onPress={onClose} disabled={!dismissible} label="Close" />
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function LabeledInput({
  label,
  icon,
  style,
  ...props
}: TextInputProps & { label: string; icon: IconName }) {
  const { theme, isRTL } = useApp();
  return (
    <View style={style}>
      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.surfaceMuted,
            borderColor: theme.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={theme.textMuted} />
        <TextInput
          {...props}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          style={[
            styles.input,
            {
              color: theme.text,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          ]}
        />
      </View>
    </View>
  );
}

export function SettingRow({
  icon,
  title,
  body,
  value,
  onValueChange,
}: {
  icon: IconName;
  title: string;
  body: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { theme, isRTL } = useApp();
  return (
    <View style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.settingIcon, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name={icon} size={21} color={theme.primary} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.settingBody, { color: theme.textSecondary }]}>{body}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.borderBright, true: theme.primary }}
        thumbColor="#FFFFFF"
        accessibilityLabel={title}
      />
    </View>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: IconName }[];
  onChange: (value: T) => void;
  label: string;
}) {
  const { theme, isRTL } = useApp();
  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.segmented,
        {
          backgroundColor: theme.surfaceMuted,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              {
                backgroundColor: selected ? theme.surface : 'transparent',
                shadowColor: theme.shadow,
                shadowOpacity: selected ? 0.14 : 0,
              },
            ]}
          >
            {option.icon ? (
              <Ionicons
                name={option.icon}
                size={16}
                color={selected ? theme.primary : theme.textMuted}
              />
            ) : null}
            <Text
              style={[
                styles.segmentText,
                { color: selected ? theme.text : theme.textMuted },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { theme } = useApp();
  return (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const { theme } = useApp();
  return (
    <View style={styles.emptyState}>
      <LinearGradient colors={theme.heroGradient} style={[styles.emptyIcon, { borderColor: theme.border }]}>
        <Ionicons name={icon} size={38} color={theme.primary} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>{body}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export const cardStyle = (theme: AppTheme) => ({
  backgroundColor: theme.surface,
  borderColor: theme.border,
  shadowColor: theme.shadow,
});

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  brandMark: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#5768E9',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  brandOrbit: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    transform: [{ translateX: 8 }, { translateY: -8 }],
  },
  screenHeader: {
    minHeight: 118,
    borderRadius: 25,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    right: -45,
    top: -65,
    opacity: 0.09,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  screenSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '800' },
  button: {
    minHeight: 52,
    borderRadius: 17,
    overflow: 'hidden',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  buttonContent: {
    minHeight: 52,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.05 },
  buttonOuterCompact: { minHeight: 42, borderRadius: 14, elevation: 0, shadowOpacity: 0 },
  buttonCompact: { minHeight: 42, paddingHorizontal: 14, gap: 6 },
  buttonTextCompact: { fontSize: 13, fontWeight: '700' },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    marginHorizontal: 12,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: '92%',
  },
  modalHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 17 },
  modalHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  modalTitle: { fontSize: 23, fontWeight: '800', letterSpacing: -0.45 },
  modalSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 7 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginStart: 3 },
  inputWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 13 },
  settingRow: { alignItems: 'flex-start', gap: 12, padding: 17 },
  settingIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingCopy: { flex: 1, paddingTop: 1 },
  settingTitle: { fontSize: 15, fontWeight: '700' },
  settingBody: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  segmented: { borderRadius: 15, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segmentText: { fontSize: 13, fontWeight: '700' },
  sectionWrap: { marginTop: 23 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.25, textTransform: 'uppercase', marginBottom: 9, marginStart: 5 },
  sectionCard: {
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyState: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 42 },
  emptyIcon: { width: 82, height: 82, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 21 },
  emptyTitle: { fontSize: 21, fontWeight: '800', textAlign: 'center', letterSpacing: -0.35 },
  emptyBody: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10, maxWidth: 340 },
  emptyAction: { marginTop: 22, minWidth: 210 },
});
