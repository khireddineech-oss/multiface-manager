import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Linking, StyleSheet } from 'react-native';
import WebView, { type WebViewNavigation } from 'react-native-webview';
import { useApp } from '../context/AppContext';
import { isFacebookHost } from '../lib/session';
import type { BrowserEngineHandle, BrowserEngineProps } from './browserTypes';

const BrowserEngine = forwardRef<BrowserEngineHandle, BrowserEngineProps>(
  function BrowserEngine(
    {
      uri,
      fastLogin,
      onNavigationChange,
      onLoadStart,
      onLoadEnd,
      onMessage,
      onError,
      onCrash,
    },
    ref,
  ) {
    const webViewRef = useRef<WebView>(null);
    const { theme } = useApp();

    useImperativeHandle(ref, () => ({
      reload: () => webViewRef.current?.reload(),
      goBack: () => webViewRef.current?.goBack(),
      goForward: () => webViewRef.current?.goForward(),
      loadUrl: (url: string) =>
        webViewRef.current?.injectJavaScript(
          `window.location.href = ${JSON.stringify(url)}; true;`,
        ),
      injectJavaScript: (script: string) => webViewRef.current?.injectJavaScript(script),
    }));

    const updateNavigation = (state: WebViewNavigation) => {
      onNavigationChange({
        url: state.url,
        title: state.title,
        loading: state.loading,
        canGoBack: state.canGoBack,
        canGoForward: state.canGoForward,
      });
    };

    return (
      <WebView
        ref={webViewRef}
        source={{ uri }}
        style={[styles.webview, { backgroundColor: theme.backgroundElevated }]}
        originWhitelist={['https://*', 'about:blank']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled={fastLogin}
        cacheMode={fastLogin ? 'LOAD_DEFAULT' : 'LOAD_NO_CACHE'}
        androidLayerType={fastLogin ? 'hardware' : 'none'}
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        mixedContentMode="never"
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        injectedJavaScriptForMainFrameOnly
        webviewDebuggingEnabled={__DEV__}
        onNavigationStateChange={updateNavigation}
        onLoadStart={(event) => {
          updateNavigation(event.nativeEvent);
          onLoadStart();
        }}
        onLoadEnd={(event) => {
          onLoadEnd(event.nativeEvent.url);
        }}
        onMessage={(event) => onMessage(event.nativeEvent.data)}
        onError={onError}
        onContentProcessDidTerminate={onCrash}
        onRenderProcessGone={onCrash}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url === 'about:blank' || request.url.startsWith('data:')) return true;
          try {
            const url = new URL(request.url);
            if (url.protocol === 'https:' && isFacebookHost(url.hostname)) return true;
            if (request.isTopFrame && url.protocol === 'https:') {
              // External destinations never enter the session-bearing WebView.
              void Linking.openURL(request.url).catch(() => undefined);
            }
          } catch {
            // Custom schemes and malformed URLs stay blocked.
          }
          return false;
        }}
      />
    );
  },
);

export default BrowserEngine;

const styles = StyleSheet.create({
  webview: { flex: 1 },
});
