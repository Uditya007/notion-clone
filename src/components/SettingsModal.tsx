"use client";
import { useAppStore } from '@/store/useAppStore';
import styles from './Modals.module.css';
import { Settings, User, Globe, Moon, Monitor, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logoutUser } from '@/lib/auth';

export default function SettingsModal() {
  const { isSettingsOpen, setSettingsOpen, workspaceName, updateWorkspaceName } = useAppStore();
  const [activeTab, setActiveTab] = useState('account');
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    logoutUser();
    setSettingsOpen(false);
    router.push('/login');
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
          </div>
        </div>
        
        <div className={styles.settingsContent}>
          <div className={styles.settingsContentHeader}>
            <h3>{activeTab === 'account' ? 'My account' : activeTab === 'appearance' ? 'Appearance' : 'Language & region'}</h3>
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
                  <div className={styles.settingsLabel}>Name</div>
                  <div className={styles.settingsValue}>{user?.name || 'N/A'}</div>
                </div>
                <div className={styles.settingsRow}>
                  <button 
                    onClick={handleLogout}
                    style={{
                      background: 'transparent', 
                      color: '#ff4d4d', 
                      border: '1px solid #ff4d4d', 
                      padding: '8px 16px', 
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className={styles.settingsSection}>
                <div className={styles.settingsRow}>
                  <div className={styles.settingsLabel}>Theme</div>
                  <select className={styles.settingsSelect}>
                    <option>System (Dark)</option>
                    <option>Dark</option>
                    <option>Light</option>
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
          </div>
        </div>
      </div>
    </div>
  );
}
