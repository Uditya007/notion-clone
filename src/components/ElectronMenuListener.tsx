'use client';

import { useEffect } from 'react';
import { useElectron } from '@/hooks/useElectron';
import { useAppStore } from '@/store/useAppStore';

/**
 * Invisible component that listens for Electron main-process menu events
 * (Cmd+N, Cmd+Shift+M, Cmd+F, etc.) and dispatches them into the React app.
 * Renders nothing — mount once inside the workspace layout.
 */
export default function ElectronMenuListener() {
  const { on, isElectron } = useElectron();
  const { setActivePage, addToast, isDocAIPanelOpen, setDocAIPanelOpen } = useAppStore();

  useEffect(() => {
    if (!isElectron) return;

    // Cmd+N — New Page
    const offNewPage = on('create-new-page', () => {
      window.dispatchEvent(new CustomEvent('create-new-meeting-note'));
    });

    // Cmd+F — Open Search
    const offSearch = on('open-search', () => {
      window.dispatchEvent(new CustomEvent('open-command-palette'));
    });

    // Cmd+Shift+A — Toggle AI Panel
    const offAI = on('toggle-ai-panel', () => {
      setDocAIPanelOpen(!isDocAIPanelOpen);
    });

    // Cmd+\ — Toggle Sidebar
    const offSidebar = on('toggle-sidebar', () => {
      window.dispatchEvent(new CustomEvent('toggleSidebar'));
    });

    // Cmd+Shift+M — New Meeting Note
    const offMeeting = on('open-meeting-recorder', () => {
      window.dispatchEvent(new CustomEvent('create-new-meeting-note'));
    });

    // Cmd+Shift+E — Export Markdown
    const offExport = on('export-markdown', () => {
      window.dispatchEvent(new CustomEvent('cora-export-markdown'));
    });

    // Cmd+, — Settings
    const offSettings = on('open-settings', () => {
      window.dispatchEvent(new CustomEvent('open-settings'));
    });

    return () => {
      offNewPage();
      offSearch();
      offAI();
      offSidebar();
      offMeeting();
      offExport();
      offSettings();
    };
  }, [isElectron, on, setActivePage, addToast, isDocAIPanelOpen, setDocAIPanelOpen]);

  return null;
}
