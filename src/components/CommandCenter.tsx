"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Pause, RotateCcw, CheckSquare, Plus, FileText, ArrowRight, Activity, Terminal, Calendar, Inbox } from 'lucide-react';
import styles from './CommandCenter.module.css';
import { useAppStore } from '@/store/useAppStore';

export default function CommandCenter() {
  const [pages, setPages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

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
    const query = commandInput.trim();
    if (!query) return;

    setIsProcessingCommand(true);
    setCommandInput('');

    try {
      // 1. Task Creation Command
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
        } else {
          throw new Error("Failed to create task");
        }
      }
      // 2. Workspace Builder Command
      else if (query.toLowerCase().startsWith('build workspace:') || query.toLowerCase().startsWith('create workspace:')) {
        const desc = query.split(':')[1]?.trim();
        if (!desc) throw new Error("Please describe the workspace");

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
      // 3. Fallback General AI query
      else {
        setAIPanelOpen(true);
        alert(`✦ Directing query to Clearspace AI Panel: "${query}"`);
      }
    } catch (err: any) {
      alert(`Command Error: ${err.message}`);
    } finally {
      setIsProcessingCommand(false);
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
          <Terminal size={18} style={{ color: '#a855f7' }} />
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
            <Activity size={16} style={{ color: '#a855f7' }} />
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
            <CheckSquare size={16} style={{ color: '#a855f7' }} />
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
            <FileText size={16} style={{ color: '#a855f7' }} />
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
            <Activity size={16} style={{ color: '#a855f7' }} />
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
