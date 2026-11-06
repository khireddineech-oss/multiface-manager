export interface BrowserNavigationState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BrowserEngineHandle {
  reload: () => void;
  goBack: () => void;
  goForward: () => void;
  loadUrl: (url: string) => void;
  injectJavaScript: (script: string) => void;
}

export interface BrowserEngineProps {
  uri: string;
  fastLogin: boolean;
  onNavigationChange: (state: BrowserNavigationState) => void;
  onLoadStart: () => void;
  onLoadEnd: (url: string) => void;
  onMessage: (data: string) => void;
  onError: () => void;
  onCrash: () => void;
}
