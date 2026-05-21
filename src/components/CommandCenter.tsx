"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Pause, RotateCcw, CheckSquare, Plus, FileText, ArrowRight, Activity, Terminal, Calendar, Inbox, CheckCircle2 } from 'lucide-react';
import styles from './CommandCenter.module.css';
import { useAppStore } from '@/store/useAppStore';

export default function CommandCenter() {
  const [pages, setPages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isCreatingBlank, setIsCreatingBlank] = useState(false);

  // Pomodoro Focus Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { setActivePage, setAIPanelOpen } = useAppStore();

  useEffect(() => {
    fetchPages();
    fetchTasks();
    fetchGoogleStatus();
  }, []);

  // Pomodoro Ticker
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            alert("✦ Focus session complete! Time to take a short break.");
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const fetchPages = async () => {
    try {
      const res = await fetch('/api/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/google/connect');
      if (res.ok) {
        const data = await res.json();
        setGoogleConnected(data.connected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = commandInput.trim() || "Build workspace: General Operations Hub";
    setIsProcessingCommand(true);

    try {
      if (query.toLowerCase().startsWith('create task:') || query.toLowerCase().startsWith('add task:')) {
        const title = query.split(':')[1]?.trim();
        if (!title) throw new Error("Please specify task title");

        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        });

        if (res.ok) {
          alert(`✦ Task created: "${title}"`);
          fetchTasks();
          setCommandInput('');
        } else {
          throw new Error("Failed to create task");
        }
      } else {
        // Workspace Builder Command
        const desc = query.toLowerCase().startsWith('build workspace:') || query.toLowerCase().startsWith('create workspace:')
          ? query.split(':')[1]?.trim()
          : query;

        alert("✦ AI Workspace Builder initiated. Spawning your new environment, please wait...");
        const res = await fetch('/api/workspace-builder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: desc })
        });

        const data = await res.json();
        if (res.ok && data.firstPageId) {
          setActivePage(data.firstPageId);
          alert(`✦ Workspace ready! Created ${data.createdCount} pages.`);
        } else {
          throw new Error(data.error || "Failed to generate workspace");
        }
      }
    } catch (err: any) {
      alert(`Command Error: ${err.message}`);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  const handleCreateBlankPage = async () => {
    setIsCreatingBlank(true);
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Welcome Document', type: 'editor', content: '<p>Start writing here...</p>', icon: '📄' })
      });
      if (res.ok) {
        const newPage = await res.json();
        setActivePage(newPage.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingBlank(false);
    }
  };

  const handlePillClick = (preset: string) => {
    setCommandInput(preset);
  };

  // Metrics
  const activeTaskCount = tasks.filter(t => !t.completed).length;
  const recentPages = [...pages]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4);

  const getTaskPriority = (title: string) => {
    if (title.includes('🔴') || title.toLowerCase().includes('high')) return 'high';
    if (title.includes('🟡') || title.toLowerCase().includes('medium')) return 'medium';
    return 'low';
  };

  const highPriorityTasks = tasks
    .filter(t => !t.completed && getTaskPriority(t.title) === 'high')
    .slice(0, 3);
  const mediumPriorityTasks = tasks
    .filter(t => !t.completed && getTaskPriority(t.title) === 'medium')
    .slice(0, 3);

  const displayedMatrixTasks = [...highPriorityTasks, ...mediumPriorityTasks].slice(0, 4);

  // If there are zero pages, show the beautiful Welcome Onboarding screen
  if (pages.length === 0) {
    return (
      <div className={styles.welcomeContainer}>
        <div className={styles.welcomeContent}>
          <div className={styles.welcomeEmoji}>🌱</div>
          <h1 className={styles.welcomeTitle}>Welcome to Cora</h1>
          <p className={styles.welcomeSubtitle}>
            Your premium, AI-guided writing canvas. Cora blends the clean hierarchy of Notion with the cozy, responsive intelligence of NotebookLM. Let's create something wonderful.
          </p>
          
          <div className={styles.welcomeFeatures}>
            <div className={`${styles.featureCard} ${styles.aiCard}`} onClick={() => handleCommandSubmit({ preventDefault: () => {} } as any)}>
              <span className={styles.featureIcon}>✦</span>
              <h3>Build with AI</h3>
              <p>Tell Cora what you are working on, and she will generate a complete customized workspace of wikis, files, and trackers.</p>
              <button className={styles.featureBtn} onClick={(e) => { e.stopPropagation(); handleCommandSubmit({ preventDefault: () => {} } as any); }}>
                Spawning AI ➔
              </button>
            </div>

            <div className={styles.featureCard} onClick={handleCreateBlankPage}>
              <span className={styles.featureIcon}>📄</span>
              <h3>Start blank</h3>
              <p>Begin with a clean canvas. Perfect for drafting quick thoughts, operational wikis, or custom checklists.</p>
              <button className={styles.featureBtn} disabled={isCreatingBlank}>
                {isCreatingBlank ? 'Creating...' : 'Create blank page ➔'}
              </button>
            </div>

            <div className={styles.featureCard} onClick={() => setActivePage('templates')}>
              <span className={styles.featureIcon}>🎨</span>
              <h3>Use template</h3>
              <p>Explore our library of designer setups built for sprints, CRM databases, or weekly reviews.</p>
              <button className={styles.featureBtn}>
                Browse library ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Upper header with real-time stats ticker */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>
            <Activity className={styles.sparkle} size={26} />
            Command Center
          </h1>
          <div className={styles.tagline}>Bloomberg terminal grade workspace controller and metrics overview.</div>
        </div>

        <div className={styles.tickerTape}>
          <div className={styles.tickerItem}>
            <div className={styles.tickerDot} />
            <span>TASKS OVERVIEW: {activeTaskCount} INCOMPLETE</span>
          </div>
          <div className={styles.tickerItem}>
            <div className={`${styles.tickerDot} ${googleConnected ? '' : styles.tickerDotAlert}`} />
            <span>GOOGLE CONNECT: {googleConnected ? 'SECURE' : 'DISCONNECTED'}</span>
          </div>
          <div className={styles.tickerItem}>
            <div className={styles.tickerDot} />
            <span>PAGES LOADED: {pages.length} ACTIVE</span>
          </div>
        </div>
      </div>

      {/* AI Command Console */}
      <div className={styles.aiCommandBar}>
        <form onSubmit={handleCommandSubmit} className={styles.aiInputWrapper}>
          <Terminal size={18} style={{ color: 'var(--primary)' }} />
          <input
            className={styles.aiInput}
            placeholder={isProcessingCommand ? "✦ AI Executing command..." : "Enter workspace command (e.g., 'Create task: Call Rahul' or 'Build workspace: Hiring board')..."}
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            disabled={isProcessingCommand}
          />
          <button type="submit" className={styles.aiSubmitBtn} disabled={isProcessingCommand}>
            <ArrowRight size={18} />
          </button>
        </form>
        <div className={styles.quickPills}>
          <button className={styles.pill} onClick={() => handlePillClick("Create task: Review project schedule")}>+ Add Task</button>
          <button className={styles.pill} onClick={() => handlePillClick("Build workspace: Startup CRM Dashboard")}>✦ Build Startup CRM</button>
          <button className={styles.pill} onClick={() => handlePillClick("Build workspace: GST & Finance Tracker")}>✦ Build Finance Tracker</button>
        </div>
      </div>

      {/* Dashboard Grid Layout */}
      <div className={styles.grid}>
        {/* Pomodoro Focus Timer */}
        <div className={`${styles.widget} ${styles.col4}`}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Focus Mode Clock</span>
            <Activity size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div className={styles.pomodoroBody}>
            <div className={styles.timeDisplay}>{formatTime(timeLeft)}</div>
            <div className={styles.pomodoroControls}>
              <button 
                className={`${styles.timerBtn} ${isTimerRunning ? styles.timerBtnActive : ''}`} 
                onClick={() => setIsTimerRunning(!isTimerRunning)}
              >
                {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
              </button>
              <button className={styles.timerBtn} onClick={() => { setIsTimerRunning(false); setTimeLeft(25 * 60); }}>
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Task Priority Matrix */}
        <div className={`${styles.widget} ${styles.col8}`}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Priority Matrix Radar</span>
            <CheckSquare size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div className={styles.taskMatrix}>
            {displayedMatrixTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No high or medium priority tasks found. Use AI scan to prioritize tasks!
              </div>
            ) : (
              displayedMatrixTasks.map((t) => {
                const priority = getTaskPriority(t.title);
                return (
                  <div key={t.id} className={styles.taskItem}>
                    <span className={styles.taskTitle}>{t.title}</span>
                    <span className={`${styles.taskBadge} ${priority === 'high' ? styles.highBadge : styles.mediumBadge}`}>
                      {priority}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Items widget */}
        <div className={`${styles.widget} ${styles.col6}`}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Recently Updated Pages</span>
            <FileText size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div className={styles.recentGrid}>
            {recentPages.map((p) => (
              <div key={p.id} className={styles.recentCard} onClick={() => setActivePage(p.id)}>
                <span style={{ fontSize: '18px' }}>{p.icon || '📄'}</span>
                <div className={styles.recentInfo}>
                  <span className={styles.recentTitle}>{p.title || 'Untitled'}</span>
                  <span className={styles.recentTime}>{new Date(p.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Google Widgets Status Widget */}
        <div className={`${styles.widget} ${styles.col6}`}>
          <div className={styles.widgetHeader}>
            <span className={styles.widgetTitle}>Google Ecosystem Link</span>
            <Activity size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Inbox size={18} style={{ color: googleConnected ? '#10b981' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Gmail Integration</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: googleConnected ? '#10b981' : 'var(--text-muted)', marginLeft: 'auto' }}>
                {googleConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={18} style={{ color: googleConnected ? '#10b981' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Google Calendar Sync</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: googleConnected ? '#10b981' : 'var(--text-muted)', marginLeft: 'auto' }}>
                {googleConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Connecting your Google Ecosystem synchronizes inbox messages and schedules appointments automatically. Go to Settings or Inbox to bind accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
