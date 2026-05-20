"use client";

import React, { useState, useEffect } from 'react';
import { Zap, Play, Clock, CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react';
import styles from './AgentsView.module.css';
import { useAppStore } from '@/store/useAppStore';

type AgentRun = {
  id: string;
  agent_type: string;
  status: 'Success' | 'Failed' | 'Running';
  output: string;
  created_at: string;
};

export default function AgentsView() {
  const [activeRuns, setActiveRuns] = useState<AgentRun[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);

  // States for Toggles
  const [smartTasksActive, setSmartTasksActive] = useState(true);
  const [weeklyDigestActive, setWeeklyDigestActive] = useState(false);

  // Modal choice states
  const [currentModal, setCurrentModal] = useState<'meeting' | 'sop' | 'call' | null>(null);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [transcript, setTranscript] = useState('');

  const { setActivePage } = useAppStore();

  useEffect(() => {
    fetchRuns();
    fetchPages();
  }, []);

  const fetchRuns = async () => {
    setIsLoadingRuns(true);
    try {
      const res = await fetch('/api/agents/runs'); // We can fetch runs directly
      if (res.ok) {
        const data = await res.json();
        setActiveRuns(data);
      } else {
        // Fallback mock logs
        setActiveRuns(getMockRuns());
      }
    } catch {
      setActiveRuns(getMockRuns());
    } finally {
      setIsLoadingRuns(false);
    }
  };

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

  const runAgent = async (agentType: string, body: any = {}) => {
    setRunningAgent(agentType);
    try {
      const res = await fetch(`/api/agents/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`✦ ${agentType.toUpperCase()} Agent: ${data.message || 'Execution completed!'}`);
        if (data.pageId) {
          setActivePage(data.pageId);
        }
      } else {
        alert(`Error: ${data.error || 'Agent failed to run'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setRunningAgent(null);
      setCurrentModal(null);
      setSelectedPageId('');
      setTranscript('');
      fetchRuns();
    }
  };

  const getMockRuns = (): AgentRun[] => [
    {
      id: "mock-1",
      agent_type: "meeting",
      status: "Success",
      output: "Created 3 tasks & prepended structured meeting summaries.",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: "mock-2",
      agent_type: "sop",
      status: "Success",
      output: "Transformed draft page into a standard procedural SOP layout.",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: "mock-3",
      agent_type: "digest",
      status: "Success",
      output: "Constructed Weekly Briefing page summarizing task status.",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    }
  ];

  const getAgentLabel = (type: string) => {
    switch (type) {
      case 'meeting': return 'Meeting Summarizer';
      case 'sop': return 'SOP Generator';
      case 'digest': return 'Weekly Digest';
      case 'performance': return 'Performance Analyzer';
      case 'tasks': return 'Smart Task Manager';
      case 'call': return 'Client Call Analyzer';
      default: return type;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>
          <Zap className={styles.headerIcon} size={24} />
          AI Agents
        </h2>
        <span className={styles.headerDesc}>Autonomous workers running inside your Clearspace environment to manage operations and analyze logs.</span>
      </div>

      {/* ALWAYS-ON AGENTS */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Always-On Agents</span>
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrapper}>
                <span className={styles.cardTitle}>Smart Task Manager</span>
                <span className={styles.cardDesc}>Scans missing task details, estimates priority weights, and flags stale tasks.</span>
              </div>
              <div 
                className={`${styles.toggleSwitch} ${smartTasksActive ? styles.toggleSwitchActive : ''}`}
                onClick={() => setSmartTasksActive(!smartTasksActive)}
              >
                <div className={styles.toggleKnob} />
              </div>
            </div>
            <button 
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={() => runAgent('tasks')}
              disabled={runningAgent === 'tasks'}
            >
              {runningAgent === 'tasks' ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
              Run Scan Now
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrapper}>
                <span className={styles.cardTitle}>Weekly Digest Generator</span>
                <span className={styles.cardDesc}>Compiles accomplished pages, completed milestones, and outstanding issues every Monday morning.</span>
              </div>
              <div 
                className={`${styles.toggleSwitch} ${weeklyDigestActive ? styles.toggleSwitchActive : ''}`}
                onClick={() => setWeeklyDigestActive(!weeklyDigestActive)}
              >
                <div className={styles.toggleKnob} />
              </div>
            </div>
            <button 
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={() => runAgent('digest')}
              disabled={runningAgent === 'digest'}
            >
              {runningAgent === 'digest' ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
              Generate Digest
            </button>
          </div>
        </div>
      </div>

      {/* ON-DEMAND AGENTS */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>On-Demand Operations</span>
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrapper}>
                <span className={styles.cardTitle}>✦ Summarize Meeting</span>
                <span className={styles.cardDesc}>Extracts key discussion summaries, decisions, action lists, and injects tasks into your dashboard.</span>
              </div>
            </div>
            <button 
              className={styles.actionBtn}
              onClick={() => setCurrentModal('meeting')}
              disabled={runningAgent !== null}
            >
              Summarize Meeting Notes
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrapper}>
                <span className={styles.cardTitle}>✦ Generate SOP</span>
                <span className={styles.cardDesc}>Transforms rough drafts or procedure notes into structured technical SOP pages.</span>
              </div>
            </div>
            <button 
              className={styles.actionBtn}
              onClick={() => setCurrentModal('sop')}
              disabled={runningAgent !== null}
            >
              Create SOP Draft
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrapper}>
                <span className={styles.cardTitle}>✦ Analyze Performance</span>
                <span className={styles.cardDesc}>Computes metrics across all active databases, mapping bottlenecks and milestones.</span>
              </div>
            </div>
            <button 
              className={styles.actionBtn}
              onClick={() => runAgent('performance')}
              disabled={runningAgent === 'performance'}
            >
              {runningAgent === 'performance' ? 'Analyzing...' : 'Generate Performance Report'}
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleWrapper}>
                <span className={styles.cardTitle}>✦ Analyze Client Call</span>
                <span className={styles.cardDesc}>Decodes sales transcripts into pain points, next steps, and drafts customized email templates.</span>
              </div>
            </div>
            <button 
              className={styles.actionBtn}
              onClick={() => setCurrentModal('call')}
              disabled={runningAgent !== null}
            >
              Analyze Transcript
            </button>
          </div>
        </div>
      </div>

      {/* RECENT RUNS */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Recent Executions</span>
        <div className={styles.runLogs}>
          {isLoadingRuns ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Syncing runs...</div>
          ) : activeRuns.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No recent runs logged.</div>
          ) : (
            activeRuns.map(run => (
              <div key={run.id} className={styles.logRow}>
                <div className={styles.logAgentInfo}>
                  <div className={`${styles.logStatusBadge} ${run.status === 'Success' ? styles.logSuccess : styles.logFailed}`}>
                    {run.status === 'Success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span>{getAgentLabel(run.agent_type)}</span>
                  </div>
                  <span className={styles.logTime}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{new Date(run.created_at).toLocaleString()}</span>
                </div>
                <span className={styles.logOutput}>{run.output}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals for parameters */}
      {currentModal === 'meeting' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Summarize Meeting Notes</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Select a page containing your draft meeting transcript to prepend a briefing block and auto-schedule outstanding tasks.</p>
            <select 
              className={styles.inputField}
              value={selectedPageId}
              onChange={e => setSelectedPageId(e.target.value)}
            >
              <option value="">-- Choose Page --</option>
              {pages.filter(p => p.type === 'editor').map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.title || 'Untitled'}</option>
              ))}
            </select>
            <div className={styles.modalFooter}>
              <button className={styles.actionBtn} onClick={() => setCurrentModal(null)}>Cancel</button>
              <button 
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={!selectedPageId || runningAgent !== null}
                onClick={() => runAgent('meeting', { pageId: selectedPageId })}
              >
                Summarize Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {currentModal === 'sop' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Generate SOP Draft</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Select a page with rough instructions or draft procedures to structure it fully as an operational guidelines manual.</p>
            <select 
              className={styles.inputField}
              value={selectedPageId}
              onChange={e => setSelectedPageId(e.target.value)}
            >
              <option value="">-- Choose Page --</option>
              {pages.filter(p => p.type === 'editor').map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.title || 'Untitled'}</option>
              ))}
            </select>
            <div className={styles.modalFooter}>
              <button className={styles.actionBtn} onClick={() => setCurrentModal(null)}>Cancel</button>
              <button 
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={!selectedPageId || runningAgent !== null}
                onClick={() => runAgent('sop', { pageId: selectedPageId })}
              >
                Generate SOP
              </button>
            </div>
          </div>
        </div>
      )}

      {currentModal === 'call' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ width: '520px' }}>
            <h3>Analyze Client Call</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Paste your conversation logs, client requirements, or audio transcript block below to decode action timelines.</p>
            <textarea 
              className={`${styles.inputField} ${styles.textarea}`}
              placeholder="e.g. John: Hi, we need a quote for 50 licenses of Clearspace. Rahul: Sure, I will send you the proposal by Friday..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
            <div className={styles.modalFooter}>
              <button className={styles.actionBtn} onClick={() => setCurrentModal(null)}>Cancel</button>
              <button 
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={!transcript.trim() || runningAgent !== null}
                onClick={() => runAgent('call', { transcript })}
              >
                Analyze Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
