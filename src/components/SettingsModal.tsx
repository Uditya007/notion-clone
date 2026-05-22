"use client";

import { useAppStore } from '@/store/useAppStore';
import styles from './Modals.module.css';
import { User, LogOut, Check, Settings, Monitor, Lock, Bell, Palette, Globe, X, Sparkles } from "lucide-react";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, addToast, aiModel, setAIModel } = useAppStore();
  const [activeTab, setActiveTab] = useState('account');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [theme, setTheme] = useState('dark');
  const [isMigrating, setIsMigrating] = useState(false);

  const handleFixContent = async () => {
    setIsMigrating(true);
    try {
      const res = await fetch('/api/admin/fix-content');
      if (res.ok) {
        const data = await res.json();
        addToast(`Fixed ${data.fixed} pages`, 'success');
      } else {
        addToast('Failed to run migration', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('An error occurred during page formatting', 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        if (data?.workspace_name) {
          setWorkspaceName(data.workspace_name);
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch("/api/google/connect");
      if (res.ok) {
        const data = await res.json();
        setIsGoogleConnected(data.connected);
        setGoogleEmail(data.email || "");
      }
    } catch (err) {
      console.error("Error loading Google connection status:", err);
    }
  };

  const updateWorkspaceName = async (name: string) => {
    setWorkspaceName(name);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceName: name }),
      });
    } catch (err) {
      console.error("Failed to update workspace name:", err);
    }
  };

  useEffect(() => {
    if (isSettingsOpen) {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
      });
      fetchProfile();
      fetchGoogleStatus();
      
      const savedTheme = localStorage.getItem('cora-theme') || 'dark';
      setTheme(savedTheme);
    }
  }, [isSettingsOpen]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('cora-theme', newTheme);
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSettingsOpen(false);
    router.push('/login');
  };

  const handleConnectGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  };

  const handleDisconnectGoogle = async () => {
    try {
      const res = await fetch('/api/google/connect', { method: 'DELETE' });
      if (res.ok) {
        setIsGoogleConnected(false);
        setGoogleEmail("");
      }
    } catch (err) {
      console.error("Failed to disconnect Google account:", err);
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setSettingsOpen(false)}>
      <div className={styles.settingsModal} onClick={e => e.stopPropagation()}>
        <div className={styles.settingsSidebar}>
          <div className={styles.settingsSidebarHeader}>Settings</div>
          <div className={styles.settingsNav}>
            <button 
              className={`${styles.settingsNavItem} ${activeTab === 'account' ? styles.settingsNavActive : ''}`}
              onClick={() => setActiveTab('account')}
            >
              <User size={16} /> My account
            </button>
            <button 
              className={`${styles.settingsNavItem} ${activeTab === 'appearance' ? styles.settingsNavActive : ''}`}
              onClick={() => setActiveTab('appearance')}
            >
              <Monitor size={16} /> Appearance
            </button>
            <button 
              className={`${styles.settingsNavItem} ${activeTab === 'language' ? styles.settingsNavActive : ''}`}
              onClick={() => setActiveTab('language')}
            >
              <Globe size={16} /> Language & region
            </button>
            <button 
              className={`${styles.settingsNavItem} ${activeTab === 'ai' ? styles.settingsNavActive : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={16} /> AI Settings
            </button>
          </div>
        </div>
        
        <div className={styles.settingsContent}>
          <div className={styles.settingsContentHeader}>
            <h3>
              {activeTab === 'account' 
                ? 'My account' 
                : activeTab === 'appearance' 
                ? 'Appearance' 
                : activeTab === 'ai'
                ? 'AI Settings'
                : 'Language & region'}
            </h3>
            <button className={styles.closeBtn} onClick={() => setSettingsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className={styles.settingsBody}>
            {activeTab === 'account' && (
              <div className={styles.settingsSection}>
                <div className={styles.settingsRow}>
                  <div className={styles.settingsLabel}>Workspace Name</div>
                  <input 
                    className={styles.settingsInput}
                    value={workspaceName}
                    onChange={(e) => updateWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                  />
                </div>
                <div className={styles.settingsRow}>
                  <div className={styles.settingsLabel}>Email</div>
                  <div className={styles.settingsValue}>{user?.email || 'N/A'}</div>
                </div>
                <div className={styles.settingsRow}>
                  <div className={styles.settingsLabel}>User ID</div>
                  <div className={styles.settingsValue}>{user?.id || 'N/A'}</div>
                </div>
                <div className={styles.settingsRow}>
                  <button 
                    onClick={handleLogout}
                    className={styles.logoutBtn}
                  >
                    Log out
                  </button>
                </div>

                <div className={styles.settingsSubSection}>
                  <h3 className={styles.settingsSubSectionTitle}>Connected Apps</h3>
                  
                  <div className={styles.settingItem}>
                    <div>
                      <div className={styles.settingLabel}>
                        <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="var(--black)"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--gray-700)"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="var(--gray-400)"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--gray-500)"/>
                        </svg>
                        Google Account
                      </div>
                      <div className={styles.settingDesc}>
                        {isGoogleConnected ? `Connected as ${googleEmail}` : 'Connect your Google account to sync Calendar and Gmail.'}
                      </div>
                      {isGoogleConnected && (
                        <div className={styles.settingBadges}>
                          <span className={styles.settingBadge}>Calendar ✓</span>
                          <span className={styles.settingBadge}>Gmail ✓</span>
                        </div>
                      )}
                    </div>
                    
                    {isGoogleConnected ? (
                      <button 
                        onClick={handleDisconnectGoogle}
                        className={styles.settingBtn}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button 
                        onClick={handleConnectGoogle}
                        className={styles.settingBtnPrimary}
                      >
                        Connect Google
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.settingsSubSection}>
                  <h3 className={styles.settingsSubSectionTitle}>Administrative Tools</h3>
                  <div className={styles.settingItem}>
                    <div>
                      <div className={styles.settingLabel}>
                        <Settings size={16} /> Fix Page Formatting
                      </div>
                      <div className={styles.settingDesc}>
                        Formats and cleans up old markdown pages into standard interactive rich text.
                      </div>
                    </div>
                    <button 
                      onClick={handleFixContent}
                      disabled={isMigrating}
                      className={styles.settingBtnPrimary}
                    >
                      {isMigrating ? 'Running...' : 'Fix formatting'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className={styles.settingsSection}>
                <div className={styles.settingsRow}>
                  <div className={styles.settingsLabel}>Theme</div>
                  <select 
                    className={styles.settingsSelect}
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value)}
                  >
                    <option value="system">System Preference</option>
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'language' && (
              <div className={styles.settingsSection}>
                <div className={styles.settingsRow}>
                  <div className={styles.settingsLabel}>Language</div>
                  <select className={styles.settingsSelect}>
                    <option>English</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className={styles.settingsSection}>
                <div className={styles.settingsRow}>
                  <div className={styles.settingsLabel}>Default AI Model</div>
                  <select 
                    className={styles.settingsSelect}
                    value={aiModel}
                    onChange={(e) => setAIModel(e.target.value)}
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended: Ultra-fast & Economical)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Highest Intelligence - Reasoning & Coding)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard Speed)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Standard Intelligence)</option>
                  </select>
                </div>

                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-light)',
                  background: 'rgba(255, 255, 255, 0.02)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '12px',
                    fontSize: '14px'
                  }}>
                    <Sparkles size={16} style={{ color: '#eab308' }} />
                    <span>Gemini Core Models Guide</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: '1.5' }}>
                    <div style={{ borderLeft: '3.5px solid #10b981', paddingLeft: '10px' }}>
                      <strong style={{ color: '#10b981', display: 'block', marginBottom: '2px' }}>Gemini 2.5 Flash</strong>
                      <span style={{ color: 'var(--text-muted)' }}>Highly optimized for high-speed interactions. Best for daily writing assistance, instant page summaries, workspace search, and automated operations.</span>
                    </div>

                    <div style={{ borderLeft: '3.5px solid #3b82f6', paddingLeft: '10px' }}>
                      <strong style={{ color: '#3b82f6', display: 'block', marginBottom: '2px' }}>Gemini 2.5 Pro</strong>
                      <span style={{ color: 'var(--text-muted)' }}>Tailored for high-complexity cognitive reasoning. Best for structured workspace architecture planning, writing code, and complex automation workflows.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
