'use client';

import { useCallback } from 'react';

// ── Type definition for the Electron API exposed via preload.js ──
interface ElectronAPI {
  isMacOS: boolean;
  isDesktop: boolean;
  platform: string;
  toggleAlwaysOnTop: (enable: boolean) => Promise<boolean>;
  exportLocalMarkdown: (data: { title: string; content: string }) => Promise<{ success: boolean; filePath?: string }>;
  getDesktopInfo: () => Promise<{ platform: string; arch: string; version: string; documentsDir: string }>;
  shareContent: (data: { title: string; text: string; url?: string }) => Promise<{ success: boolean; method?: string }>;
  setBadgeCount: (count: number) => Promise<number>;
  showNotification: (data: { title: string; body: string; silent?: boolean }) => Promise<void>;
  revealInFinder: (filePath: string) => Promise<boolean>;
  getSystemTheme: () => Promise<'dark' | 'light'>;
  closeMeetingHud: () => Promise<void>;
  startSystemRecording: () => Promise<{ success: boolean; outputPath: string }>;
  stopSystemRecording: (outputPath: string) => Promise<{ success: boolean; base64: string; mimeType: string; error?: string }>;
  openMeetingInCora: (pageId: string) => Promise<void>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

/**
 * Hook to access Electron native features from React components.
 * Returns no-ops when running in the browser (non-Electron).
 */
export function useElectron() {
  const isElectron = typeof window !== 'undefined' && !!window.electron;
  const isMacOS = isElectron && window.electron!.isMacOS;

  /** Subscribe to an IPC channel from the main process. Returns an unsubscribe function. */
  const on = useCallback(
    (channel: string, callback: (...args: unknown[]) => void) => {
      if (isElectron) window.electron!.on(channel, callback);
      return () => {
        if (isElectron) window.electron!.off(channel, callback);
      };
    },
    [isElectron]
  );

  /** Show a native macOS notification. */
  const showNotification = useCallback(
    (title: string, body: string, silent = false) => {
      if (isElectron) window.electron!.showNotification({ title, body, silent });
    },
    [isElectron]
  );

  /** Set the dock badge count (macOS). */
  const setBadgeCount = useCallback(
    (count: number) => {
      if (isElectron) window.electron!.setBadgeCount(count);
    },
    [isElectron]
  );

  /** Export a document as Markdown via native save dialog. */
  const exportMarkdown = useCallback(
    async (title: string, content: string) => {
      if (!isElectron) return null;
      return window.electron!.exportLocalMarkdown({ title, content });
    },
    [isElectron]
  );

  /** Share content via macOS share sheet (clipboard fallback). */
  const shareContent = useCallback(
    async (title: string, text: string, url?: string) => {
      if (!isElectron) return null;
      return window.electron!.shareContent({ title, text, url });
    },
    [isElectron]
  );

  /** Reveal a file in Finder. */
  const revealInFinder = useCallback(
    async (filePath: string) => {
      if (!isElectron) return false;
      return window.electron!.revealInFinder(filePath);
    },
    [isElectron]
  );

  /** Get the current system theme (dark/light). */
  const getSystemTheme = useCallback(async () => {
    if (!isElectron) return 'dark' as const;
    return window.electron!.getSystemTheme();
  }, [isElectron]);

  /** Close active meeting HUD. */
  const closeMeetingHud = useCallback(async () => {
    if (isElectron) await window.electron!.closeMeetingHud();
  }, [isElectron]);

  /** Start recording system input. */
  const startSystemRecording = useCallback(async () => {
    if (!isElectron) return { success: false, outputPath: '' };
    return window.electron!.startSystemRecording();
  }, [isElectron]);

  /** Stop recording system input and retrieve audio. */
  const stopSystemRecording = useCallback(async (outputPath: string) => {
    if (!isElectron) return { success: false, base64: '', mimeType: '', error: 'Not in desktop mode' };
    return window.electron!.stopSystemRecording(outputPath);
  }, [isElectron]);

  /** Open main app window and focus a page. */
  const openMeetingInCora = useCallback(async (pageId: string) => {
    if (isElectron) await window.electron!.openMeetingInCora(pageId);
  }, [isElectron]);

  return {
    isElectron,
    isMacOS,
    on,
    showNotification,
    setBadgeCount,
    exportMarkdown,
    shareContent,
    revealInFinder,
    getSystemTheme,
    closeMeetingHud,
    startSystemRecording,
    stopSystemRecording,
    openMeetingInCora
  };
}
