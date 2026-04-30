import React, { useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { trackSearchTerm } from '../services/activityTracker';
import { api } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  initialUrl?: string;
  onClose?: () => void;
}

const SEARCH_PATTERNS = [
  /[?&]q=([^&]+)/i,
  /[?&]search_query=([^&]+)/i,
  /[?&]query=([^&]+)/i,
];

function extractSearchTerm(url: string): string | null {
  for (const pattern of SEARCH_PATTERNS) {
    const match = url.match(pattern);
    if (match) return decodeURIComponent(match[1].replace(/\+/g, ' '));
  }
  return null;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default function MonitoredWebView({ initialUrl = 'https://www.google.com', onClose }: Props) {
  const webViewRef = useRef<WebView>(null);
  const lastUrlRef = useRef('');

  async function handleNavigationChange(nav: WebViewNavigation) {
    const { url, title } = nav;
    if (!url || url === 'about:blank' || url === lastUrlRef.current) return;
    if (url.startsWith('about:')) return;

    lastUrlRef.current = url;

    const domain = extractDomain(url);
    if (!domain) return;

    const childProfileId = await AsyncStorage.getItem('childProfileId');
    if (!childProfileId) return;

    // Track search terms
    const searchTerm = extractSearchTerm(url);
    if (searchTerm) {
      const source = domain.includes('youtube') ? 'YouTube' : domain.includes('google') ? 'Google' : domain;
      trackSearchTerm(searchTerm, source);
    }

    try {
      const { data } = await api.post('/activity/browser-visit', {
        childProfileId,
        url,
        domain,
        title: title || undefined,
        browserApp: 'SafeGuard Browser',
      });

      if (data.isBlocked) {
        // Stop navigation and go back
        webViewRef.current?.stopLoading();
        webViewRef.current?.goBack();
        Alert.alert(
          'Site blocked',
          `${domain} is blocked by your parent.`,
          [{ text: 'OK' }]
        );
      }
    } catch {
      // fail silently — don't interrupt browsing on network error
    }
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        onNavigationStateChange={handleNavigationChange}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
