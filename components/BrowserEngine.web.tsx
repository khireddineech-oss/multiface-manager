import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import type { BrowserEngineHandle, BrowserEngineProps } from './browserTypes';

const BrowserEngine = forwardRef<BrowserEngineHandle, BrowserEngineProps>(
  function BrowserEngine(_props, _ref) {
    const { theme, t } = useApp();
    return (
      <View style={[styles.root, { backgroundColor: theme.backgroundElevated }]}>
        <LinearGradient colors={theme.heroGradient} style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="phone-portrait-outline" size={40} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{t('nativeRequiredTitle')}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {t('nativeRequiredBody')}
          </Text>
          <View style={[styles.fact, { backgroundColor: theme.surfaceMuted }]}>
            <Ionicons name="shield-checkmark" size={19} color={theme.success} />
            <Text style={[styles.factText, { color: theme.textSecondary }]}>
              {t('webEngineNote')}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

export default BrowserEngine;

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconWrap: { width: 82, height: 82, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 23, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  body: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 11, maxWidth: 440 },
  fact: { marginTop: 22, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 9, alignItems: 'flex-start', maxWidth: 440 },
  factText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
