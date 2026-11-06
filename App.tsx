import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { AppProvider, useApp } from './context/AppContext';
import BrowserScreen from './screens/BrowserScreen';
import AccountsScreen from './screens/AccountsScreen';
import SettingsScreen from './screens/SettingsScreen';
import { BrandMark } from './components/UI';
import type { RootTabParamList } from './lib/types';

const Tab = createBottomTabNavigator<RootTabParamList>();

function AppShell() {
  const { theme, isReady, isRTL, t } = useApp();

  const navigationTheme: NavigationTheme = {
    dark: theme.dark,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.danger,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium: { fontFamily: 'System', fontWeight: '500' },
      bold: { fontFamily: 'System', fontWeight: '700' },
      heavy: { fontFamily: 'System', fontWeight: '800' },
    },
  };

  if (!isReady) {
    return (
      <LinearGradient colors={theme.heroGradient} style={styles.loadingRoot}>
        <BrandMark size={70} />
        <Text style={[styles.loadingBrand, { color: theme.text }]}>Multi Facebook</Text>
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.appRoot, { backgroundColor: theme.background, direction: isRTL ? 'rtl' : 'ltr' }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          initialRouteName="Browser"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: theme.textMuted,
            tabBarLabelStyle: styles.tabLabel,
            tabBarStyle: [
              styles.tabBar,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                height: Platform.OS === 'ios' ? 82 : 69,
                paddingBottom: Platform.OS === 'ios' ? 20 : 9,
              },
            ],
            tabBarIcon: ({ color, focused, size }) => {
              const icons = {
                Browser: focused ? 'globe' : 'globe-outline',
                Accounts: focused ? 'people' : 'people-outline',
                Settings: focused ? 'settings' : 'settings-outline',
              } as const;
              return (
                <View
                  style={[
                    styles.tabIconWrap,
                    { backgroundColor: focused ? theme.surfaceMuted : 'transparent' },
                  ]}
                >
                  <Ionicons name={icons[route.name]} size={focused ? size + 1 : size} color={color} />
                </View>
              );
            },
          })}
        >
          <Tab.Screen
            name="Browser"
            component={BrowserScreen}
            options={{
              title: t('browser'),
              lazy: false,
            }}
          />
          <Tab.Screen
            name="Accounts"
            component={AccountsScreen}
            options={{ title: t('accounts') }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: t('settings') }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.appRoot}>
      <SafeAreaProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingBrand: { fontSize: 25, fontWeight: '800', letterSpacing: -0.7, marginTop: 20 },
  loader: { marginTop: 24 },
  tabBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7, elevation: 14, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -5 } },
  tabLabel: { fontSize: 10, fontWeight: '700', marginTop: -1 },
  tabIconWrap: { width: 46, height: 30, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
