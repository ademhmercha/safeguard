import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { api } from '../lib/api';

// ─── App session tracking ────────────────────────────────────────────────────

interface AppSession {
  appName: string;
  packageName: string;
  startedAt: string;
}

let currentSession: AppSession | null = null;

export async function onAppForeground(appName: string, packageName: string) {
  // Close previous session first
  await onAppBackground();

  currentSession = { appName, packageName, startedAt: new Date().toISOString() };
}

export async function onAppBackground() {
  if (!currentSession) return;

  const endedAt = new Date();
  const startedAt = new Date(currentSession.startedAt);
  const durationSecs = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

  const childProfileId = await AsyncStorage.getItem('childProfileId');
  if (childProfileId && durationSecs > 3) {
    await api.post('/activity/app-session', {
      childProfileId,
      appName: currentSession.appName,
      packageName: currentSession.packageName,
      startedAt: currentSession.startedAt,
      endedAt: endedAt.toISOString(),
      durationSecs,
    }).catch(() => null);
  }

  currentSession = null;
}

// ─── Browser visit reporting ─────────────────────────────────────────────────

interface BrowserVisit {
  url: string;
  domain: string;
  title?: string;
  visitedAt: string;
  browserApp?: string;
}

const pendingVisits: BrowserVisit[] = [];

export function trackBrowserVisit(url: string, title?: string, browserApp?: string) {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    pendingVisits.push({ url, domain, title, visitedAt: new Date().toISOString(), browserApp });
    // Flush every 10 visits
    if (pendingVisits.length >= 10) flushBrowserVisits();
  } catch {
    // invalid URL, skip
  }
}

export async function flushBrowserVisits() {
  if (pendingVisits.length === 0) return;
  const childProfileId = await AsyncStorage.getItem('childProfileId');
  if (!childProfileId) return;

  const batch = pendingVisits.splice(0, pendingVisits.length);
  await api.post('/activity/browser-visits/batch', {
    childProfileId,
    visits: batch,
  }).catch(() => {
    // re-queue on failure
    pendingVisits.unshift(...batch);
  });
}

// ─── Search term tracking ────────────────────────────────────────────────────

const pendingSearches: { searchTerm: string; sourceApp: string; searchedAt: string }[] = [];

export function trackSearchTerm(searchTerm: string, sourceApp: string) {
  const trimmed = searchTerm.trim();
  if (!trimmed || trimmed.length < 2) return;
  pendingSearches.push({ searchTerm: trimmed, sourceApp, searchedAt: new Date().toISOString() });
}

export async function flushSearchTerms() {
  if (pendingSearches.length === 0) return;
  const childProfileId = await AsyncStorage.getItem('childProfileId');
  if (!childProfileId) return;

  const batch = pendingSearches.splice(0, pendingSearches.length);
  await api.post('/activity/search-terms/batch', {
    childProfileId,
    terms: batch,
  }).catch(() => {
    pendingSearches.unshift(...batch);
  });
}

// ─── Full flush (called on background sync) ──────────────────────────────────

export async function flushAllPending() {
  await Promise.allSettled([flushBrowserVisits(), flushSearchTerms()]);
}

// ─── AppState listener to auto-track foreground/background ──────────────────

export function setupAppStateTracking(getCurrentAppInfo: () => { appName: string; packageName: string } | null) {
  let lastState: AppStateStatus = AppState.currentState;

  const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
    if (lastState.match(/inactive|background/) && next === 'active') {
      const info = getCurrentAppInfo();
      if (info) await onAppForeground(info.appName, info.packageName);
    }

    if (next.match(/inactive|background/)) {
      await onAppBackground();
      await flushAllPending();
    }

    lastState = next;
  });

  return () => sub.remove();
}
