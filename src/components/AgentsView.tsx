"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, Play, Clock, CheckCircle2, XCircle, Sparkles, Loader2, 
  Plus, Edit2, Trash2, ChevronDown, ChevronUp, ExternalLink, 
  Settings, Layers, BookOpen, AlertCircle, Calendar, MessageSquare, 
  FileText, CheckSquare, Database, Mail, Info, Send
} from 'lucide-react';
import { marked } from 'marked';
import styles from './AgentsView.module.css';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase/client';

type AgentRun = {
  id: string;
  agent_id?: string;
  agent_type: string;
  status: 'running' | 'completed' | 'failed';
  input?: any;
  output?: string;
  output_page_id?: string;
  error?: string;
  started_at: string;
  completed_at?: string;
  duration?: string;
  // Computed client-side fields
  agent_name?: string;
  agent_icon?: string;
};

type CustomAgent = {
  id: string;
  name: string;
  description: string;
  icon: string;
  trigger_type: string;
  trigger_config: any;
  action_type: string;
  action_config: any;
  output_type: string;
  output_config: any;
  is_active: boolean;
  last_run_at?: string;
  run_count: number;
};

const BUILT_IN_AGENTS = [
  {
    type: 'meeting',
    name: 'Meeting Summarizer',
    icon: '📋',
    description: 'Paste a transcript → extracts decisions, creates tasks automatically.',
    status: 'Ready',
    lastRun: '2 hours ago'
  },
  {
    type: 'sop',
    name: 'SOP Generator',
    icon: '📄',
    description: 'Converts any page into a structured standard operating procedure.',
    status: 'Ready',
    lastRun: '1 day ago'
  },
  {
    type: 'digest',
    name: 'Weekly Digest',
    icon: '📊',
    description: 'Every Monday: summarizes your week, highlights priorities.',
    status: 'Ready',
    lastRun: '4 days ago'
  },
  {
    type: 'performance',
    name: 'Performance Analyzer',
    icon: '📈',
    description: 'Analyzes your tasks and gives productivity insights.',
    status: 'Ready',
    lastRun: '1 hour ago'
  },
  {
    type: 'tasks',
    name: 'Smart Task Manager',
    icon: '✅',
    description: 'Auto-assigns due dates and priority to new tasks.',
    status: 'Ready',
    lastRun: '23 mins ago'
  },
  {
    type: 'call',
    name: 'Client Call Analyzer',
    icon: '📞',
    description: 'Paste a call transcript → extracts action items and drafts follow-up.',
    status: 'Ready',
    lastRun: '3 hours ago'
  }
];

const GALLERY_TEMPLATES = [
  {
    id: "tpl-bug-triage",
    name: "Bug Triage Agent",
    icon: "🐛",
    description: "Categorizes severity and assigns priority to incoming bug entries.",
    trigger_type: "database_row_added",
    trigger_config: {},
    action_type: "analyze_data",
    action_config: {},
    output_type: "database_row",
    output_config: {},
    details: "Automatically inspects new bugs, searches workspace history, resolves critical severity factors, and writes recommended priority tags back to the database row.",
    used_count: "340 teams"
  },
  {
    id: "tpl-email-digest",
    name: "Email Digest Agent",
    icon: "📧",
    description: "Summarizes Gmail inbox threads and builds a daily briefing bulletin.",
    trigger_type: "schedule",
    trigger_config: { time: "08:00", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
    action_type: "summarize_pages",
    action_config: {},
    output_type: "new_page",
    output_config: { title: "Daily Briefing — {{date}}" },
    details: "Reads recent inbox summaries, filters irrelevant messages, and compiles workspace schedules and client requests into a clean daily planner.",
    used_count: "520 teams"
  },
  {
    id: "tpl-client-report",
    name: "Client Report Agent",
    icon: "💼",
    description: "Reads active project draft pages and drafts weekly client status updates.",
    trigger_type: "schedule",
    trigger_config: { time: "17:00", days: ["friday"] },
    action_type: "draft_report",
    action_config: {},
    output_type: "new_page",
    output_config: { title: "Client Weekly Status — {{date}}" },
    details: "Compiles all pages edited this week, parses completed tasks, formats clear, professional highlights, and pre-fills email templates ready for sending.",
    used_count: "280 teams"
  },
  {
    id: "tpl-okr-progress",
    name: "OKR Progress Agent",
    icon: "🎯",
    description: "Scans OKR trackers, computes status progress, and highlights blockages.",
    trigger_type: "schedule",
    trigger_config: { time: "09:00", days: ["monday"] },
    action_type: "analyze_data",
    action_config: {},
    output_type: "new_page",
    output_config: { title: "OKR Sprint Overview — {{date}}" },
    details: "Aggregates task progress across all connected database items, computes percentage gains, highlights stagnant priorities, and formats progress charts in clean markdown.",
    used_count: "190 teams"
  },
  {
    id: "tpl-social-media",
    name: "Social Media Agent",
    icon: "📱",
    description: "Reads blog posts or research pages and generates copy-ready social posts.",
    trigger_type: "manual",
    trigger_config: {},
    action_type: "custom_prompt",
    action_config: { prompt: "Generate 3 highly engaging LinkedIn posts and 5 tweet ideas based on these product specs, following an authoritative yet casual tone." },
    output_type: "new_page",
    output_config: { title: "Social Content Drafts — {{date}}" },
    details: "Extracts key value propositions from any draft page, transforms them into punchy highlights, appends hashtags, and creates calendar blocks ready for publishing.",
    used_count: "410 teams"
  },
  {
    id: "tpl-research-agent",
    name: "Research Agent",
    icon: "🔍",
    description: "Queries workspace data, pulls web inputs, and structures briefings.",
    trigger_type: "manual",
    trigger_config: {},
    action_type: "custom_prompt",
    action_config: { prompt: "Analyze all client feedback pages and generate a structured research review of competitive feature requests." },
    output_type: "new_page",
    output_config: { title: "Structured Competitor Review — {{date}}" },
    details: "Combines local pages and task data into a unified context, queries intelligence parameters, and parses them into organized pros, cons, and recommendations.",
    used_count: "230 teams"
  },
  {
    id: "tpl-sales-pipeline",
    name: "Sales Pipeline Agent",
    icon: "📊",
    description: "Monitors deal pipelines and formats executive CRM status summaries.",
    trigger_type: "schedule",
    trigger_config: { time: "09:00", days: ["monday", "wednesday", "friday"] },
    action_type: "analyze_data",
    action_config: {},
    output_type: "new_page",
    output_config: { title: "Pipeline Sales Summary — {{date}}" },
    details: "Parses active CRM database records, highlights stagnating deals, lists top active values, and estimates revenue forecast warnings automatically.",
    used_count: "160 teams"
  },
  {
    id: "tpl-content-calendar",
    name: "Content Calendar Agent",
    icon: "✍️",
    description: "Scans draft lists and automatically formats next week's editorial calendar.",
    trigger_type: "schedule",
    trigger_config: { time: "18:00", days: ["sunday"] },
    action_type: "draft_report",
    action_config: {},
    output_type: "new_page",
    output_config: { title: "Editorial Content Calendar — {{date}}" },
    details: "Reads active idea tags, schedules dates, maps content pillars, and pre-generates draft outline structures to speed up writer velocity.",
    used_count: "290 teams"
  },
  {
    id: "tpl-sprint-planning",
    name: "Sprint Planning Agent",
    icon: "🚀",
    description: "Analyzes pending backlogs and draft structured task sprint guidelines.",
    trigger_type: "schedule",
    trigger_config: { time: "09:00", days: ["monday"] },
    action_type: "analyze_data",
    action_config: {},
    output_type: "new_page",
    output_config: { title: "Sprint Guidelines — {{date}}" },
    details: "Cross-checks user story databases, computes developer velocity, selects high-priority tickets, and outlines standard sprint scope goals.",
    used_count: "175 teams"
  },
  {
    id: "tpl-meeting-prep",
    name: "Meeting Prep Agent",
    icon: "📋",
    description: "Scans upcoming event items and aggregates related preparation profiles.",
    trigger_type: "schedule",
    trigger_config: { time: "08:00", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
    action_type: "summarize_pages",
    action_config: {},
    output_type: "inbox_notification",
    output_config: {},
    details: "Pulls calendar meeting items, scans names against workspace contacts, aggregates recent messages/documents, and outputs high-fidelity briefing reports.",
    used_count: "310 teams"
  }
];

const EMOJI_OPTIONS = ['⚡', '📊', '📋', '🎯', '🔍', '📱', '💼', '🚀', '🐛', '📧', '✍️', '🤖'];
const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' }
];

export default function AgentsView() {
  const [activeTab, setActiveTab] = useState<'my-agents' | 'gallery' | 'history'>('my-agents');
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [runHistory, setRunHistory] = useState<AgentRun[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [databases, setDatabases] = useState<any[]>([]);
  
  // Loading States
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Quick Run Panel States
  const [selectedBuiltInAgent, setSelectedBuiltInAgent] = useState<any | null>(null);
  const [quickRunPanelOpen, setQuickRunPanelOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | '30days'>('week');
  const [clientName, setClientName] = useState('');
  const [quickRunContext, setQuickRunContext] = useState('');
  
  // Custom Run Status Steps
  const [panelProgressStep, setPanelProgressStep] = useState<number>(0);
  const [panelProgressText, setPanelProgressText] = useState<string>('');
  const [isRunningAgentInPanel, setIsRunningAgentInPanel] = useState(false);
  const [panelOutputPreview, setPanelOutputPreview] = useState<string>('');
  const [panelCreatedPageId, setPanelCreatedPageId] = useState<string>('');

  // Expandable gallery template IDs
  const [expandedGalleryIds, setExpandedGalleryIds] = useState<string[]>([]);
  // Expandable run history log IDs
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);

  // Custom Agent Builder Modal States
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3>(1);
  const [builderLoading, setBuilderLoading] = useState(false);
  
  // Step 1: Basics
  const [agentName, setAgentName] = useState('');
  const [agentIcon, setAgentIcon] = useState('⚡');
  const [agentDescription, setAgentDescription] = useState('');
  
  // Step 2: Trigger
  const [triggerType, setTriggerType] = useState('manual');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleDays, setScheduleDays] = useState<string[]>([]);
  const [triggerDatabaseId, setTriggerDatabaseId] = useState('');
  
  // Step 3: Action & Output
  const [actionType, setActionType] = useState('summarize_pages');
  const [customPrompt, setCustomPrompt] = useState('');
  const [outputType, setOutputType] = useState('new_page');
  const [outputPageTitle, setOutputPageTitle] = useState('');
  const [outputParentId, setOutputParentId] = useState('');
  const [outputDatabaseId, setOutputDatabaseId] = useState('');
  const [isVariablesExpanded, setIsVariablesExpanded] = useState(false);

  const { setActivePage, addToast } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomAgents();
    fetchRunHistory();
    fetchPages();
    fetchDatabases();
  }, []);

  // Supabase Realtime Listener for Live Run History
  useEffect(() => {
    let channel: any;
    
    const getUserIdAndSubscribe = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      channel = supabase
        .channel('realtime:agent-runs')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'agent_runs',
          filter: `user_id=eq.${session.user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRun = payload.new as AgentRun;
            setRunHistory(prev => [newRun, ...prev]);
            addToast(`⚡ Agent run started: ${getAgentLabel(newRun.agent_type)}`, "info");
          }
          if (payload.eventType === 'UPDATE') {
            const updatedRun = payload.new as AgentRun;
            setRunHistory(prev => prev.map(run => run.id === updatedRun.id ? updatedRun : run));
            
            if (updatedRun.status === 'completed') {
              addToast(`✅ Agent completed: ${getAgentLabel(updatedRun.agent_type)}`, "success");
            } else if (updatedRun.status === 'failed') {
              addToast(`❌ Agent failed: ${getAgentLabel(updatedRun.agent_type)}`, "error");
            }
          }
        })
        .subscribe();
    };

    getUserIdAndSubscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Close panel on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Do not close if click was inside an active modal overlay
        const target = event.target as HTMLElement;
        if (!target.closest(`.${styles.modalOverlay}`)) {
          setQuickRunPanelOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCustomAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const res = await fetch('/api/agents/custom');
      if (res.ok) {
        const data = await res.json();
        setCustomAgents(data || []);
      }
    } catch (err) {
      console.error("Error fetching custom agents:", err);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const fetchRunHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/agents/runs');
      if (res.ok) {
        const data = await res.json();
        setRunHistory(data || []);
      }
    } catch (err) {
      console.error("Error fetching run history:", err);
    } finally {
      setIsLoadingHistory(false);
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
      console.error("Error fetching pages:", err);
    }
  };

  const fetchDatabases = async () => {
    try {
      const res = await fetch('/api/databases');
      if (res.ok) {
        const data = await res.json();
        setDatabases(data || []);
      }
    } catch (err) {
      console.error("Error fetching databases:", err);
    }
  };

  const getAgentLabel = (type: string) => {
    if (type === 'custom') return 'Custom Agent';
    const builtIn = BUILT_IN_AGENTS.find(a => a.type === type);
    if (builtIn) return builtIn.name;
    const custom = customAgents.find(c => c.id === type);
    return custom ? custom.name : type;
  };

  const getAgentIcon = (type: string) => {
    if (type === 'custom') return '🤖';
    const builtIn = BUILT_IN_AGENTS.find(a => a.type === type);
    if (builtIn) return builtIn.icon;
    const custom = customAgents.find(c => c.id === type);
    return custom ? custom.icon : '⚡';
  };

  const toggleAgentActive = async (agent: CustomAgent) => {
    try {
      const res = await fetch(`/api/agents/custom/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !agent.is_active })
      });
      if (res.ok) {
        setCustomAgents(prev => prev.map(a => a.id === agent.id ? { ...a, is_active: !a.is_active } : a));
        addToast(`✦ ${agent.name} is now ${!agent.is_active ? 'active' : 'paused'}`, "success");
      }
    } catch (err) {
      console.error("Error toggling agent active state:", err);
    }
  };

  const handleDeleteAgent = async (e: React.MouseEvent, agentId: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/agents/custom/${agentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCustomAgents(prev => prev.filter(a => a.id !== agentId));
        addToast(`🗑 Deleted agent "${name}"`, "info");
      }
    } catch (err) {
      console.error("Error deleting agent:", err);
    }
  };

  const handleInstallTemplate = async (template: any) => {
    try {
      const res = await fetch('/api/agents/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          icon: template.icon,
          trigger_type: template.trigger_type,
          trigger_config: template.trigger_config,
          action_type: template.action_type,
          action_config: template.action_config,
          output_type: template.output_type,
          output_config: template.output_config
        })
      });
      
      if (res.ok) {
        addToast(`✦ Successfully installed "${template.name}" template!`, "success");
        fetchCustomAgents();
        setActiveTab('my-agents');
      } else {
        const errorData = await res.json();
        addToast(`Error: ${errorData.error || 'Failed to install'}`, "error");
      }
    } catch (err) {
      console.error("Error installing template:", err);
      addToast("Network error during installation", "error");
    }
  };

  // Expand / collapse handlers
  const toggleGalleryExpanded = (id: string) => {
    setExpandedGalleryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleHistoryExpanded = (id: string) => {
    setExpandedHistoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Quick Run execution
  const executeAgentInPanel = async () => {
    if (!selectedBuiltInAgent) return;
    setIsRunningAgentInPanel(true);
    setPanelCreatedPageId('');
    setPanelOutputPreview('');
    
    // Step 1: Gathering Workspace Data
    setPanelProgressStep(1);
    setPanelProgressText("Gathering workspace data...");
    await new Promise(r => setTimeout(r, 600));

    // Step 2: Analyzing content
    setPanelProgressStep(2);
    setPanelProgressText("Analyzing content...");
    await new Promise(r => setTimeout(r, 1000));

    // Step 3: Generating output
    setPanelProgressStep(3);
    setPanelProgressText("Generating output...");

    try {
      let body: any = {};
      let endpoint = '';

      if (selectedBuiltInAgent.isCustom) {
        endpoint = '/api/agents/custom/run';
        body = { 
          agentId: selectedBuiltInAgent.id,
          context: quickRunContext
        };
      } else {
        endpoint = `/api/agents/${selectedBuiltInAgent.type}`;
        if (selectedBuiltInAgent.type === 'meeting') {
          body = { pageId: selectedPageId };
        } else if (selectedBuiltInAgent.type === 'sop') {
          body = { pageId: selectedPageId };
        } else if (selectedBuiltInAgent.type === 'call') {
          body = { transcript };
        } else if (selectedBuiltInAgent.type === 'performance') {
          body = { period: timePeriod };
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        setPanelProgressStep(4);
        setPanelProgressText("Complete!");
        setPanelOutputPreview(data.preview || data.message || "Agent ran successfully.");
        if (data.pageId) {
          setPanelCreatedPageId(data.pageId);
        } else if (data.outputPageId) {
          setPanelCreatedPageId(data.outputPageId);
        }
        addToast(`✦ Executed: ${selectedBuiltInAgent.name}`, "success");
        fetchRunHistory();
      } else {
        throw new Error(data.error || "Execution failed");
      }
    } catch (err: any) {
      setPanelProgressStep(-1);
      setPanelProgressText(`Failed: ${err.message}`);
      addToast(`Error running agent: ${err.message}`, "error");
    } finally {
      setIsRunningAgentInPanel(false);
    }
  };

  const handleOpenBuiltInPanel = (agent: any) => {
    setSelectedBuiltInAgent({ ...agent, isCustom: false });
    // Reset parameter states
    setTranscript('');
    setSelectedPageId('');
    setTimePeriod('week');
    setClientName('');
    setPanelProgressStep(0);
    setPanelProgressText('');
    setPanelCreatedPageId('');
    setPanelOutputPreview('');
    setQuickRunPanelOpen(true);
  };

  const handleOpenCustomPanel = (agent: CustomAgent) => {
    setSelectedBuiltInAgent({
      id: agent.id,
      name: agent.name,
      icon: agent.icon,
      description: agent.description,
      trigger_type: agent.trigger_type,
      isCustom: true
    });
    setQuickRunContext('');
    setPanelProgressStep(0);
    setPanelProgressText('');
    setPanelCreatedPageId('');
    setPanelOutputPreview('');
    setQuickRunPanelOpen(true);
  };

  // Custom Builder Actions
  const handleOpenBuilder = (agentToEdit?: CustomAgent) => {
    if (agentToEdit) {
      setEditingAgentId(agentToEdit.id);
      setAgentName(agentToEdit.name);
      setAgentIcon(agentToEdit.icon);
      setAgentDescription(agentToEdit.description);
      
      setTriggerType(agentToEdit.trigger_type);
      setScheduleTime(agentToEdit.trigger_config.time || '09:00');
      setScheduleDays(agentToEdit.trigger_config.days || []);
      setTriggerDatabaseId(agentToEdit.trigger_config.database_id || '');
      
      setActionType(agentToEdit.action_type);
      setCustomPrompt(agentToEdit.action_config.prompt || '');
      
      setOutputType(agentToEdit.output_type);
      setOutputPageTitle(agentToEdit.output_config.title || '');
      setOutputParentId(agentToEdit.output_config.parent_id || '');
      setOutputDatabaseId(agentToEdit.output_config.database_id || '');
    } else {
      setEditingAgentId(null);
      setAgentName('');
      setAgentIcon('⚡');
      setAgentDescription('');
      
      setTriggerType('manual');
      setScheduleTime('09:00');
      setScheduleDays([]);
      setTriggerDatabaseId('');
      
      setActionType('summarize_pages');
      setCustomPrompt('');
      
      setOutputType('new_page');
      setOutputPageTitle('');
      setOutputParentId('');
      setOutputDatabaseId('');
    }
    setBuilderStep(1);
    setBuilderOpen(true);
  };

  const handleSaveCustomAgent = async () => {
    setBuilderLoading(true);
    try {
      const payload = {
        name: agentName || "Untitled Agent",
        description: agentDescription,
        icon: agentIcon,
        trigger_type: triggerType,
        trigger_config: triggerType === 'schedule' 
          ? { time: scheduleTime, days: scheduleDays }
          : triggerType === 'database_row_added'
          ? { database_id: triggerDatabaseId }
          : {},
        action_type: actionType,
        action_config: actionType === 'custom_prompt'
          ? { prompt: customPrompt }
          : {},
        output_type: outputType,
        output_config: outputType === 'new_page'
          ? { title: outputPageTitle, parent_id: outputParentId || null }
          : outputType === 'database_row'
          ? { database_id: outputDatabaseId }
          : {}
      };

      const url = editingAgentId ? `/api/agents/custom/${editingAgentId}` : '/api/agents/custom';
      const method = editingAgentId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        addToast(
          editingAgentId 
            ? `✦ Updated agent "${agentName}" successfully!` 
            : `✦ Created custom agent "${agentName}"!`, 
          "success"
        );
        fetchCustomAgents();
        setBuilderOpen(false);
      } else {
        const errorData = await res.json();
        addToast(`Error saving agent: ${errorData.error || 'Unknown error'}`, "error");
      }
    } catch (err: any) {
      console.error(err);
      addToast("Network error saving agent", "error");
    } finally {
      setBuilderLoading(false);
    }
  };

  const handleToggleScheduleDay = (day: string) => {
    setScheduleDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const getSchedulePreview = () => {
    if (scheduleDays.length === 0) return `This agent will run daily at ${scheduleTime}`;
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const dayNames = scheduleDays.map(capitalize).join(' & ');
    return `This agent will run every ${dayNames} at ${scheduleTime}`;
  };

  return (
    <div className={styles.container}>
      {/* HEADER SECTION */}
      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <h2>
            <Zap className={styles.headerIcon} size={24} />
            AI Agents
          </h2>
          {activeTab === 'my-agents' && (
            <button className={styles.createAgentBtn} onClick={() => handleOpenBuilder()}>
              <Plus size={16} />
              Create Agent
            </button>
          )}
        </div>
        <span className={styles.headerDesc}>Autonomous operational workers executing workflow tasks, compiling analytical digests, and writing documents in real-time.</span>
      </div>

      {/* TABS SELECTOR */}
      <div className={styles.tabsRow}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'my-agents' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('my-agents')}
        >
          <Layers size={15} />
          My Agents
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'gallery' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          <BookOpen size={15} />
          Agent Gallery
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={15} />
          Run History
        </button>
      </div>

      {/* TAB CONTENTS */}
      <div className={styles.tabContentArea}>
        
        {/* TAB 1: MY AGENTS */}
        {activeTab === 'my-agents' && (
          <div className={styles.tabWrapper}>
            {/* SECTION A: CLEARSPACE AGENTS */}
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Clearspace Agents</span>
              <div className={styles.grid}>
                {BUILT_IN_AGENTS.map((agent) => (
                  <div key={agent.type} className={styles.agentCard}>
                    <div className={styles.agentCardHeader}>
                      <span className={styles.agentCardEmojiIcon}>{agent.icon}</span>
                      <div className={styles.agentCardMeta}>
                        <h4 className={styles.agentCardName}>{agent.name}</h4>
                        <span className={styles.statusPill}>Ready</span>
                      </div>
                    </div>
                    <p className={styles.agentCardDescription}>{agent.description}</p>
                    <div className={styles.agentCardFooter}>
                      <span className={styles.agentCardLastRun}>Last run: {agent.lastRun}</span>
                      <button 
                        className={styles.runNowBtn}
                        onClick={() => handleOpenBuiltInPanel(agent)}
                      >
                        <Play size={11} fill="currentColor" />
                        Run now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION B: MY CUSTOM AGENTS */}
            <div className={styles.section}>
              <div className={styles.sectionLabelHeader}>
                <span className={styles.sectionLabel}>My Custom Agents</span>
              </div>

              {isLoadingAgents ? (
                <div className={styles.innerLoader}>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Loading custom agents...</span>
                </div>
              ) : customAgents.length === 0 ? (
                <div className={styles.emptyStateContainer}>
                  <span className={styles.emptyStateEmoji}>⚡</span>
                  <h3>No custom agents yet</h3>
                  <p>Build an agent that works exactly the way you need it to run automated tasks.</p>
                  <button className={styles.createFirstAgentBtn} onClick={() => handleOpenBuilder()}>
                    Create your first agent
                  </button>
                </div>
              ) : (
                <div className={styles.grid}>
                  {customAgents.map((agent) => (
                    <div key={agent.id} className={styles.agentCard}>
                      <div className={styles.agentCardHeader}>
                        <span className={styles.agentCardEmojiIcon}>{agent.icon}</span>
                        <div className={styles.agentCardMeta}>
                          <h4 className={styles.agentCardName}>{agent.name}</h4>
                          <span className={styles.triggerBadge}>
                            {agent.trigger_type === 'schedule' ? '🕐 Scheduled' : '▶ Manual'}
                          </span>
                        </div>
                        
                        {/* Custom actions toggle & edit controls */}
                        <div className={styles.customAgentActionsRow}>
                          <button 
                            className={styles.actionIconButton} 
                            onClick={() => handleOpenBuilder(agent)} 
                            title="Edit Agent"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            className={styles.actionIconButtonHover} 
                            onClick={(e) => handleDeleteAgent(e, agent.id, agent.name)} 
                            title="Delete Agent"
                          >
                            <Trash2 size={13} />
                          </button>
                          
                          <div 
                            className={`${styles.customToggleSwitch} ${agent.is_active ? styles.toggleSwitchActive : ''}`}
                            onClick={() => toggleAgentActive(agent)}
                            title={agent.is_active ? "Pause Agent" : "Activate Agent"}
                          >
                            <div className={styles.customToggleKnob} />
                          </div>
                        </div>
                      </div>
                      <p className={styles.agentCardDescription}>{agent.description || "No description provided."}</p>
                      
                      <div className={styles.agentCardFooter}>
                        <span className={styles.agentCardLastRun}>
                          {agent.last_run_at 
                            ? `Last run: ${new Date(agent.last_run_at).toLocaleDateString()}` 
                            : 'Never run'}
                        </span>
                        <button 
                          className={styles.runNowBtn}
                          onClick={() => handleOpenCustomPanel(agent)}
                        >
                          <Play size={11} fill="currentColor" />
                          Run now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AGENT GALLERY */}
        {activeTab === 'gallery' && (
          <div className={styles.tabWrapper}>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Popular Templates</span>
              <div className={styles.grid}>
                {GALLERY_TEMPLATES.map((tpl) => {
                  const isExpanded = expandedGalleryIds.includes(tpl.id);
                  return (
                    <div key={tpl.id} className={styles.galleryCard}>
                      <div className={styles.galleryHeader}>
                        <span className={styles.galleryIcon}>{tpl.icon}</span>
                        <div className={styles.galleryMeta}>
                          <h4 className={styles.galleryName}>{tpl.name}</h4>
                          <span className={styles.galleryTeamsCount}>Used by {tpl.used_count}</span>
                        </div>
                      </div>
                      <p className={styles.galleryDesc}>{tpl.description}</p>
                      
                      {/* Expandable detailed parameters */}
                      <button 
                        className={styles.galleryExpandToggle} 
                        onClick={() => toggleGalleryExpanded(tpl.id)}
                      >
                        <span>{isExpanded ? 'Hide details' : 'What it does'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && (
                        <div className={styles.galleryExpandedPanel}>
                          <div className={styles.galleryExpandedParam}>
                            <strong>Trigger:</strong> 
                            <span>{tpl.trigger_type === 'schedule' ? '🕐 On schedule time' : tpl.trigger_type === 'database_row_added' ? '📊 On new DB entries' : '▶ Manual'}</span>
                          </div>
                          <div className={styles.galleryExpandedParam}>
                            <strong>Action:</strong> 
                            <span>{tpl.action_type === 'custom_prompt' ? '⚡ Custom AI prompt instructions' : tpl.action_type === 'summarize_pages' ? '📋 Predefined summaries block' : '📈 Aggregating dashboards metrics'}</span>
                          </div>
                          <div className={styles.galleryExpandedParam}>
                            <strong>Output:</strong> 
                            <span>{tpl.output_type === 'new_page' ? '📄 Write to a new page document' : tpl.output_type === 'database_row' ? '📊 Insert to database' : '📥 Send workspace inbox alert'}</span>
                          </div>
                          <p className={styles.galleryExpandedDescriptionText}>{tpl.details}</p>
                        </div>
                      )}

                      <button 
                        className={styles.installAgentBtn}
                        onClick={() => handleInstallTemplate(tpl)}
                      >
                        <Plus size={14} />
                        Install Agent
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RUN HISTORY */}
        {activeTab === 'history' && (
          <div className={styles.tabWrapper}>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Executions Log</span>
              
              {isLoadingHistory ? (
                <div className={styles.innerLoader}>
                  <Loader2 className="animate-spin" size={24} />
                  <span>Loading history logs...</span>
                </div>
              ) : runHistory.length === 0 ? (
                <div className={styles.emptyLogsState}>
                  <Clock size={40} className={styles.emptyLogsIcon} />
                  <h3>No agent runs yet</h3>
                  <p>Trigger built-in or custom agents to inspect live operational execution logs here.</p>
                </div>
              ) : (
                <div className={styles.tableCard}>
                  <table className={styles.logsTable}>
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Duration</th>
                        <th>Output</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {runHistory.map((run) => {
                        const isExpanded = expandedHistoryIds.includes(run.id);
                        const displayTime = run.started_at 
                          ? new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '';
                        const displayDate = run.started_at 
                          ? new Date(run.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
                          : '';
                          
                        // Estimate duration if completed
                        let durationStr = run.duration || '—';
                        if (!run.duration && run.completed_at && run.started_at) {
                          const diff = new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
                          durationStr = `${(diff / 1000).toFixed(1)}s`;
                        }

                        return (
                          <React.Fragment key={run.id}>
                            <tr 
                              className={`${styles.tableRow} ${isExpanded ? styles.expandedRowActive : ''}`}
                              onClick={() => toggleHistoryExpanded(run.id)}
                            >
                              <td>
                                <div className={styles.tableAgentInfo}>
                                  <span className={styles.tableAgentIcon}>{getAgentIcon(run.agent_id || run.agent_type)}</span>
                                  <span className={styles.tableAgentName}>{getAgentLabel(run.agent_id || run.agent_type)}</span>
                                </div>
                              </td>
                              <td>
                                <div className={styles.tableStatusContainer}>
                                  {run.status === 'completed' ? (
                                    <span className={`${styles.statusDotBadge} ${styles.badgeSuccess}`}>
                                      <CheckCircle2 size={13} />
                                      Completed
                                    </span>
                                  ) : run.status === 'failed' ? (
                                    <span className={`${styles.statusDotBadge} ${styles.badgeFailed}`}>
                                      <XCircle size={13} />
                                      Failed
                                    </span>
                                  ) : (
                                    <span className={`${styles.statusDotBadge} ${styles.badgeRunning}`}>
                                      <Loader2 size={13} className="animate-spin" />
                                      Running
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={styles.tableDateCell}>
                                <span>{displayDate} at {displayTime}</span>
                              </td>
                              <td className={styles.tableDurationCell}>
                                <span>{durationStr}</span>
                              </td>
                              <td>
                                <div className={styles.tableOutputCell}>
                                  {run.output_page_id ? (
                                    <button 
                                      className={styles.viewPageLink}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (run.output_page_id) setActivePage(run.output_page_id);
                                      }}
                                    >
                                      View page
                                      <ExternalLink size={11} />
                                    </button>
                                  ) : (
                                    <span className={styles.logTextPreview}>
                                      {run.output ? run.output.slice(0, 45) + '...' : run.error || '—'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className={styles.tableExpandCell}>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </td>
                            </tr>
                            
                            {/* Expand row detailed log text */}
                            {isExpanded && (
                              <tr className={styles.expandedContentRow}>
                                <td colSpan={6}>
                                  <div className={styles.expandedLogBlock}>
                                    <div className={styles.expandedLogHeader}>
                                      <h5>Run execution details ({run.id})</h5>
                                      {run.completed_at && (
                                        <span>Completed at: {new Date(run.completed_at).toLocaleString()}</span>
                                      )}
                                    </div>
                                    <div className={styles.expandedLogScrollBox}>
                                      {run.status === 'failed' ? (
                                        <div className={styles.logErrorPanel}>
                                          <AlertCircle size={16} />
                                          <strong>Error log:</strong>
                                          <p>{run.error || "Execution terminated unexpectedly."}</p>
                                        </div>
                                      ) : run.output ? (
                                        <div 
                                          className={styles.markdownContent}
                                          dangerouslySetInnerHTML={{ __html: marked.parse(run.output) }} 
                                        />
                                      ) : (
                                        <span className={styles.noOutputPlaceholder}>No detailed text logged for this run.</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* QUICK RUN PANEL SLIDE-IN (Section 8) */}
      {quickRunPanelOpen && selectedBuiltInAgent && (
        <>
          <div className={styles.panelOverlay} onClick={() => setQuickRunPanelOpen(false)} />
          <div className={styles.quickRunPanel} ref={panelRef}>
            
            <div className={styles.panelHeader}>
              <div className={styles.panelTitleContainer}>
                <span className={styles.panelEmojiIcon}>{selectedBuiltInAgent.icon}</span>
                <div>
                  <h3>{selectedBuiltInAgent.name}</h3>
                  <span className={styles.panelBadge}>
                    {selectedBuiltInAgent.isCustom ? 'Custom Operation' : 'Clearspace System Operation'}
                  </span>
                </div>
              </div>
              <button className={styles.panelCloseBtn} onClick={() => setQuickRunPanelOpen(false)}>×</button>
            </div>

            <div className={styles.panelBody}>
              {/* Dynamic form inputs based on operation types */}
              {!isRunningAgentInPanel && panelProgressStep === 0 ? (
                <div className={styles.panelInputsSection}>
                  <p className={styles.panelDescriptionText}>{selectedBuiltInAgent.description}</p>
                  
                  {/* MEETING SUMMARIZER SPECIFIC FORM */}
                  {selectedBuiltInAgent.type === 'meeting' && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Choose Page with transcript</label>
                      <select 
                        className={styles.panelSelect}
                        value={selectedPageId}
                        onChange={e => setSelectedPageId(e.target.value)}
                      >
                        <option value="">-- Choose Page --</option>
                        {pages.filter(p => p.type === 'editor').map(p => (
                          <option key={p.id} value={p.id}>{p.icon} {p.title || 'Untitled'}</option>
                        ))}
                      </select>
                      <div className={styles.infoAlert}>
                        <Info size={14} />
                        <span>The agent will analyze this page, append structured summaries, and auto-populate outstanding tasks.</span>
                      </div>
                    </div>
                  )}

                  {/* SOP GENERATOR SPECIFIC FORM */}
                  {selectedBuiltInAgent.type === 'sop' && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Choose Page to structure as SOP</label>
                      <select 
                        className={styles.panelSelect}
                        value={selectedPageId}
                        onChange={e => setSelectedPageId(e.target.value)}
                      >
                        <option value="">-- Choose Page --</option>
                        {pages.filter(p => p.type === 'editor').map(p => (
                          <option key={p.id} value={p.id}>{p.icon} {p.title || 'Untitled'}</option>
                        ))}
                      </select>
                      <div className={styles.infoAlert}>
                        <Info size={14} />
                        <span>The agent will transform the page draft into a professional standard operating procedure document.</span>
                      </div>
                    </div>
                  )}

                  {/* WEEKLY DIGEST SPECIFIC FORM */}
                  {selectedBuiltInAgent.type === 'digest' && (
                    <div className={styles.digestPreviewCard}>
                      <Calendar size={24} />
                      <div>
                        <strong>Weekly Digest Schedule</strong>
                        <span>This compiles edited workspace files, OKR logs, and incomplete milestones.</span>
                      </div>
                    </div>
                  )}

                  {/* PERFORMANCE ANALYZER FORM */}
                  {selectedBuiltInAgent.type === 'performance' && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Select analysis period</label>
                      <div className={styles.buttonTogglesRow}>
                        <button 
                          className={`${styles.togglePill} ${timePeriod === 'week' ? styles.togglePillActive : ''}`}
                          onClick={() => setTimePeriod('week')}
                        >
                          This Week
                        </button>
                        <button 
                          className={`${styles.togglePill} ${timePeriod === 'month' ? styles.togglePillActive : ''}`}
                          onClick={() => setTimePeriod('month')}
                        >
                          This Month
                        </button>
                        <button 
                          className={`${styles.togglePill} ${timePeriod === '30days' ? styles.togglePillActive : ''}`}
                          onClick={() => setTimePeriod('30days')}
                        >
                          Last 30 Days
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CLIENT CALL TRANSCRIPT FORM */}
                  {selectedBuiltInAgent.type === 'call' && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Client Name (optional)</label>
                      <input 
                        type="text" 
                        className={styles.panelInput}
                        placeholder="e.g. Acme Corp"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                      />
                      
                      <label className={styles.formLabel} style={{ marginTop: 12 }}>Paste conversation or audio transcript</label>
                      <textarea 
                        className={styles.panelTextarea}
                        placeholder="Rahul: Hi John, let's map the licenses quote..."
                        value={transcript}
                        onChange={e => setTranscript(e.target.value)}
                      />
                    </div>
                  )}

                  {/* CUSTOM AGENTS GATHERING CONTEXT FORM */}
                  {selectedBuiltInAgent.isCustom && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Provide run-time context (optional)</label>
                      <textarea 
                        className={styles.panelTextarea}
                        placeholder="Write down any additional context cues, tags, or guidelines to prioritize during execution..."
                        value={quickRunContext}
                        onChange={e => setQuickRunContext(e.target.value)}
                      />
                    </div>
                  )}

                  <button 
                    className={styles.panelRunBtn}
                    onClick={executeAgentInPanel}
                    disabled={
                      (selectedBuiltInAgent.type === 'meeting' && !selectedPageId) ||
                      (selectedBuiltInAgent.type === 'sop' && !selectedPageId) ||
                      (selectedBuiltInAgent.type === 'call' && !transcript.trim())
                    }
                  >
                    <Play size={14} fill="currentColor" />
                    Run Agent Now
                  </button>
                </div>
              ) : isRunningAgentInPanel ? (
                /* Animated progress steps */
                <div className={styles.panelRunningSection}>
                  <div className={styles.pulsingRunningLoader}>
                    <Loader2 size={36} className="animate-spin" />
                  </div>
                  <h4>Agent executing...</h4>
                  <div className={styles.progressStepsWrapper}>
                    <div className={`${styles.progressStep} ${panelProgressStep >= 1 ? styles.stepActive : ''}`}>
                      <div className={styles.stepCircle}>{panelProgressStep > 1 ? '✓' : '1'}</div>
                      <span>Gathering workspace contexts...</span>
                    </div>
                    <div className={`${styles.progressStep} ${panelProgressStep >= 2 ? styles.stepActive : ''}`}>
                      <div className={styles.stepCircle}>{panelProgressStep > 2 ? '✓' : '2'}</div>
                      <span>Analyzing documents and tickets...</span>
                    </div>
                    <div className={`${styles.progressStep} ${panelProgressStep >= 3 ? styles.stepActive : ''}`}>
                      <div className={styles.stepCircle}>{panelProgressStep > 3 ? '✓' : '3'}</div>
                      <span>Synthesizing output document...</span>
                    </div>
                  </div>
                  <span className={styles.runningSubtext}>{panelProgressText}</span>
                </div>
              ) : (
                /* Completed result panel */
                <div className={styles.panelCompletedSection}>
                  {panelProgressStep === -1 ? (
                    <div className={styles.panelExecutionFailed}>
                      <XCircle size={32} />
                      <h4>Execution Failed</h4>
                      <p>{panelProgressText}</p>
                      <button className={styles.panelRunBtn} onClick={executeAgentInPanel}>
                        Try again
                      </button>
                    </div>
                  ) : (
                    <div className={styles.panelExecutionSuccess}>
                      <div className={styles.successCheckboxAnimation}>
                        <CheckCircle2 size={48} />
                      </div>
                      <h4>Agent Finished!</h4>
                      
                      <div className={styles.outputPreviewBox}>
                        <h5>Response preview:</h5>
                        <p>{panelOutputPreview.slice(0, 240) + '...'}</p>
                      </div>

                      {panelCreatedPageId && (
                        <button 
                          className={styles.openCreatedPageBtn}
                          onClick={() => {
                            setActivePage(panelCreatedPageId);
                            setQuickRunPanelOpen(false);
                          }}
                        >
                          Open Generated Page
                          <ExternalLink size={14} />
                        </button>
                      )}

                      <div className={styles.completedButtonsRow}>
                        <button 
                          className={styles.secondaryPanelBtn} 
                          onClick={() => setQuickRunPanelOpen(false)}
                        >
                          Close Panel
                        </button>
                        <button 
                          className={styles.secondaryPanelBtnActive}
                          onClick={() => setPanelProgressStep(0)}
                        >
                          Run Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* CUSTOM AGENT BUILDER FULL-SCREEN MODAL (Section 3) */}
      {builderOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.builderModal}>
            
            {/* Modal Header */}
            <div className={styles.builderModalHeader}>
              <h3>{editingAgentId ? '⚡ Edit Custom Agent' : '⚡ Custom Agent Builder'}</h3>
              <button className={styles.modalCloseBtn} onClick={() => setBuilderOpen(false)}>×</button>
            </div>

            {/* Steps Wizard Indicators */}
            <div className={styles.wizardIndicatorRow}>
              <div className={`${styles.wizardStep} ${builderStep === 1 ? styles.wizardActive : builderStep > 1 ? styles.wizardCompleted : ''}`}>
                <span className={styles.stepNum}>{builderStep > 1 ? '✓' : '1'}</span>
                <span className={styles.stepName}>Basics</span>
              </div>
              <div className={styles.wizardConnector} />
              <div className={`${styles.wizardStep} ${builderStep === 2 ? styles.wizardActive : builderStep > 2 ? styles.wizardCompleted : ''}`}>
                <span className={styles.stepNum}>{builderStep > 2 ? '✓' : '2'}</span>
                <span className={styles.stepName}>Trigger</span>
              </div>
              <div className={styles.wizardConnector} />
              <div className={`${styles.wizardStep} ${builderStep === 3 ? styles.wizardActive : ''}`}>
                <span className={styles.stepNum}>3</span>
                <span className={styles.stepName}>Action & Output</span>
              </div>
            </div>

            <div className={styles.builderModalBody}>
              
              {/* STEP 1: BASICS */}
              {builderStep === 1 && (
                <div className={styles.builderStepWrapper}>
                  <div className={styles.builderFormGroup}>
                    <label className={styles.builderLabel}>Name your agent</label>
                    <input 
                      type="text" 
                      className={styles.builderInput} 
                      placeholder="e.g. Acme Triage Agent"
                      value={agentName}
                      onChange={e => setAgentName(e.target.value)}
                    />
                  </div>

                  <div className={styles.builderFormGroup}>
                    <label className={styles.builderLabel}>Give it an icon</label>
                    <div className={styles.emojiGrid}>
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button 
                          key={emoji}
                          type="button"
                          className={`${styles.emojiBtn} ${agentIcon === emoji ? styles.emojiSelected : ''}`}
                          onClick={() => setAgentIcon(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.builderFormGroup}>
                    <label className={styles.builderLabel}>What does this agent do?</label>
                    <textarea 
                      className={styles.builderTextareaShort}
                      placeholder="e.g. Scans bug descriptions, estimates priority levels, and formats task checklists."
                      value={agentDescription}
                      onChange={e => setAgentDescription(e.target.value)}
                    />
                  </div>

                  <div className={styles.wizardFooterSingle}>
                    <button 
                      className={styles.continueBtn}
                      disabled={!agentName.trim()}
                      onClick={() => setBuilderStep(2)}
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: TRIGGER */}
              {builderStep === 2 && (
                <div className={styles.builderStepWrapper}>
                  <label className={styles.builderLabel}>When should this agent run?</label>
                  
                  <div className={styles.triggerCardsGrid}>
                    <div 
                      className={`${styles.triggerCard} ${triggerType === 'manual' ? styles.triggerCardSelected : ''}`}
                      onClick={() => setTriggerType('manual')}
                    >
                      <span className={styles.triggerCardIcon}>▶</span>
                      <div className={styles.triggerCardMeta}>
                        <strong>Manually</strong>
                        <span>Run on demand whenever you need it</span>
                      </div>
                    </div>

                    <div 
                      className={`${styles.triggerCard} ${triggerType === 'schedule' ? styles.triggerCardSelected : ''}`}
                      onClick={() => setTriggerType('schedule')}
                    >
                      <span className={styles.triggerCardIcon}>🕐</span>
                      <div className={styles.triggerCardMeta}>
                        <strong>On a schedule</strong>
                        <span>Run automatically at a set time</span>
                      </div>
                    </div>

                    <div 
                      className={`${styles.triggerCard} ${triggerType === 'page_created' ? styles.triggerCardSelected : ''}`}
                      onClick={() => setTriggerType('page_created')}
                    >
                      <span className={styles.triggerCardIcon}>📄</span>
                      <div className={styles.triggerCardMeta}>
                        <strong>When a page is created</strong>
                        <span>Triggers when a new page is added</span>
                      </div>
                    </div>

                    <div 
                      className={`${styles.triggerCard} ${triggerType === 'task_created' ? styles.triggerCardSelected : ''}`}
                      onClick={() => setTriggerType('task_created')}
                    >
                      <span className={styles.triggerCardIcon}>✅</span>
                      <div className={styles.triggerCardMeta}>
                        <strong>When a task is created</strong>
                        <span>Triggers when a new task is added</span>
                      </div>
                    </div>

                    <div 
                      className={`${styles.triggerCard} ${triggerType === 'database_row_added' ? styles.triggerCardSelected : ''}`}
                      onClick={() => setTriggerType('database_row_added')}
                    >
                      <span className={styles.triggerCardIcon}>📊</span>
                      <div className={styles.triggerCardMeta}>
                        <strong>When database row is added</strong>
                        <span>Triggers on new database entries</span>
                      </div>
                    </div>

                    <div 
                      className={`${styles.triggerCard} ${triggerType === 'mention' ? styles.triggerCardSelected : ''}`}
                      onClick={() => setTriggerType('mention')}
                    >
                      <span className={styles.triggerCardIcon}>💬</span>
                      <div className={styles.triggerCardMeta}>
                        <strong>When @mentioned</strong>
                        <span>Runs when you @mention this agent in editor</span>
                      </div>
                    </div>
                  </div>

                  {/* CONDITIONAL FIELD FOR SCHEDULE */}
                  {triggerType === 'schedule' && (
                    <div className={styles.conditionalBlock}>
                      <div className={styles.conditionalInline}>
                        <label className={styles.builderLabel}>Run at</label>
                        <input 
                          type="time" 
                          className={styles.timeSelect}
                          value={scheduleTime}
                          onChange={e => setScheduleTime(e.target.value)}
                        />
                      </div>
                      
                      <label className={styles.builderLabel} style={{ marginTop: 8 }}>On days</label>
                      <div className={styles.daysSelectorRow}>
                        {DAYS_OF_WEEK.map((day) => {
                          const isActive = scheduleDays.includes(day.value);
                          return (
                            <button 
                              key={day.value}
                              type="button"
                              className={`${styles.dayPill} ${isActive ? styles.dayPillActive : ''}`}
                              onClick={() => handleToggleScheduleDay(day.value)}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className={styles.schedulePreviewText}>
                        <Info size={12} />
                        <span>{getSchedulePreview()}</span>
                      </div>
                    </div>
                  )}

                  {/* CONDITIONAL FIELD FOR DATABASE ROW */}
                  {triggerType === 'database_row_added' && (
                    <div className={styles.conditionalBlock}>
                      <label className={styles.builderLabel}>Which database?</label>
                      <select 
                        className={styles.builderSelect}
                        value={triggerDatabaseId}
                        onChange={e => setTriggerDatabaseId(e.target.value)}
                      >
                        <option value="">-- Choose Database --</option>
                        {databases.map(db => (
                          <option key={db.id} value={db.id}>📊 {db.title || 'Untitled Database'}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={styles.wizardFooter}>
                    <button className={styles.backBtn} onClick={() => setBuilderStep(1)}>
                      ← Back
                    </button>
                    <button 
                      className={styles.continueBtn}
                      disabled={
                        (triggerType === 'schedule' && scheduleDays.length === 0) ||
                        (triggerType === 'database_row_added' && !triggerDatabaseId)
                      }
                      onClick={() => setBuilderStep(3)}
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: ACTION & OUTPUT */}
              {builderStep === 3 && (
                <div className={styles.builderStepWrapper}>
                  <div className={styles.twoColumnGrid}>
                    
                    {/* LEFT COLUMN: WHAT SHOULD IT DO? */}
                    <div className={styles.wizardColumn}>
                      <span className={styles.columnTitle}>1. What should it do?</span>
                      
                      <div className={styles.radioGroup}>
                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="actionType" 
                            checked={actionType === 'summarize_pages'}
                            onChange={() => setActionType('summarize_pages')}
                          />
                          <div>
                            <strong>Summarize my pages</strong>
                            <span>Reads recent pages and creates a summary</span>
                          </div>
                        </label>

                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="actionType" 
                            checked={actionType === 'analyze_data'}
                            onChange={() => setActionType('analyze_data')}
                          />
                          <div>
                            <strong>Analyze my tasks</strong>
                            <span>Reviews tasks for insights and patterns</span>
                          </div>
                        </label>

                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="actionType" 
                            checked={actionType === 'generate_report'}
                            onChange={() => setActionType('generate_report')}
                          />
                          <div>
                            <strong>Generate a report</strong>
                            <span>Creates a structured report document</span>
                          </div>
                        </label>

                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="actionType" 
                            checked={actionType === 'draft_report'}
                            onChange={() => setActionType('draft_report')}
                          />
                          <div>
                            <strong>Draft content</strong>
                            <span>Writes content based on your pages</span>
                          </div>
                        </label>

                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="actionType" 
                            checked={actionType === 'custom_prompt'}
                            onChange={() => setActionType('custom_prompt')}
                          />
                          <div>
                            <strong>Custom instruction</strong>
                            <span>Write your own AI prompt</span>
                          </div>
                        </label>
                      </div>

                      {/* CONDITIONAL CUSTOM PROMPT TEXTAREA */}
                      {actionType === 'custom_prompt' && (
                        <div className={styles.customPromptBlock}>
                          <textarea 
                            className={styles.builderTextareaLong}
                            placeholder="e.g. Read recent product speclists and compile three Twitter tags drafts..."
                            value={customPrompt}
                            onChange={e => setCustomPrompt(e.target.value)}
                          />
                          
                          {/* COLLAPSIBLE VARIABLES LIST */}
                          <div className={styles.variablesCollapse}>
                            <button 
                              type="button"
                              className={styles.collapseHeaderBtn}
                              onClick={() => setIsVariablesExpanded(!isVariablesExpanded)}
                            >
                              <span>Variables you can use:</span>
                              {isVariablesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                            {isVariablesExpanded && (
                              <ul className={styles.variablesList}>
                                <li><code>{"{{user_name}}"}</code> - Your full name</li>
                                <li><code>{"{{date}}"}</code> - Today's date</li>
                                <li><code>{"{{recent_pages}}"}</code> - List of recent page titles</li>
                                <li><code>{"{{overdue_tasks}}"}</code> - List of overdue tasks</li>
                                <li><code>{"{{workspace_name}}"}</code> - Workspace name</li>
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: WHERE SHOULD OUTPUT GO? */}
                    <div className={styles.wizardColumn}>
                      <span className={styles.columnTitle}>2. Where should output go?</span>
                      
                      <div className={styles.radioGroup}>
                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="outputType" 
                            checked={outputType === 'new_page'}
                            onChange={() => setOutputType('new_page')}
                          />
                          <div>
                            <strong>📄 Create a new page</strong>
                            <span>Agent creates a page with its output</span>
                          </div>
                        </label>

                        {outputType === 'new_page' && (
                          <div className={styles.outputPageParams}>
                            <label className={styles.builderLabelSmall}>Page title template</label>
                            <input 
                              type="text" 
                              className={styles.builderInputSmall}
                              placeholder="e.g. Report — {{date}}"
                              value={outputPageTitle}
                              onChange={e => setOutputPageTitle(e.target.value)}
                            />
                            
                            <label className={styles.builderLabelSmall} style={{ marginTop: 8 }}>Parent page (optional)</label>
                            <select 
                              className={styles.builderSelectSmall}
                              value={outputParentId}
                              onChange={e => setOutputParentId(e.target.value)}
                            >
                              <option value="">-- None (Top Level) --</option>
                              {pages.filter(p => p.type === 'editor').map(p => (
                                <option key={p.id} value={p.id}>{p.icon} {p.title || 'Untitled'}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="outputType" 
                            checked={outputType === 'inbox_notification'}
                            onChange={() => setOutputType('inbox_notification')}
                          />
                          <div>
                            <strong>📥 Send to my inbox</strong>
                            <span>Appears as a notification in Inbox</span>
                          </div>
                        </label>

                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="outputType" 
                            checked={outputType === 'database_row'}
                            onChange={() => setOutputType('database_row')}
                          />
                          <div>
                            <strong>📊 Add to a database</strong>
                            <span>Creates a new row in a database</span>
                          </div>
                        </label>

                        {outputType === 'database_row' && (
                          <div className={styles.outputPageParams}>
                            <label className={styles.builderLabelSmall}>Target database</label>
                            <select 
                              className={styles.builderSelectSmall}
                              value={outputDatabaseId}
                              onChange={e => setOutputDatabaseId(e.target.value)}
                            >
                              <option value="">-- Choose Database --</option>
                              {databases.map(db => (
                                <option key={db.id} value={db.id}>📊 {db.title || 'Untitled'}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <label className={styles.radioOption}>
                          <input 
                            type="radio" 
                            name="outputType" 
                            checked={outputType === 'email'}
                            onChange={() => setOutputType('email')}
                          />
                          <div>
                            <strong>📧 Send as email</strong>
                            <span>Emails the output directly to you</span>
                          </div>
                        </label>
                      </div>
                    </div>

                  </div>

                  <div className={styles.wizardFooter} style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button className={styles.backBtn} onClick={() => setBuilderStep(2)}>
                      ← Back
                    </button>
                    <button 
                      className={styles.submitBuilderBtn}
                      disabled={
                        builderLoading ||
                        (actionType === 'custom_prompt' && !customPrompt.trim()) ||
                        (outputType === 'database_row' && !outputDatabaseId)
                      }
                      onClick={handleSaveCustomAgent}
                    >
                      {builderLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          <span>Saving agent...</span>
                        </>
                      ) : (
                        <span>{editingAgentId ? 'Update Agent' : 'Create Agent'}</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
