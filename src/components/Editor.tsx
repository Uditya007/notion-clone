"use client";

import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import styles from "./Editor.module.css";
import { useEffect, useState, useRef } from "react";
import { MoreHorizontal, Star, Clock, Sparkles, Check, X, LayoutGrid, FileText, Trash2, Image as ImageIcon, CheckCircle, AlertCircle, Info, Smile, Calendar, UserPlus, ChevronLeft, ChevronRight, Globe, Bell, CornerDownLeft, ThumbsUp, ThumbsDown, Zap } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import KanbanBoard from "./KanbanBoard";
import CalendarView from "./CalendarView";
import InboxView from "./InboxView";
import TasksView from "./TasksView";
import AgentsView from "./AgentsView";
import TemplatesView from "./TemplatesView";
import ShareModal from "./ShareModal";
import TrashView from "./TrashView";
import ExportModal from "./ExportModal";
import WhatsAppView from "./WhatsAppView";
import CommandCenter from "./CommandCenter";
import AudioRecorder from "./AudioRecorder";
import MeetingRecorderDashboard from "./MeetingRecorderDashboard";
import MeetingNotesView from "./MeetingNotesView";
import AnalyticsPanel from "./AnalyticsPanel";
import { Mic, BarChart2, Menu } from "lucide-react";
import { useCompletion } from '@ai-sdk/react';
import DatabaseView from "./DatabaseView";
import { supabase } from "@/lib/supabase/client";
import { markdownToTiptap } from "@/lib/markdownToTiptap";

const SLASH_COMMANDS = [
  { title: 'Text', icon: '📝', action: (editor: any) => editor.chain().focus().clearNodes().run() },
  { title: 'Heading 1', icon: 'H1', action: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 1 }).run() },
  { title: 'Heading 2', icon: 'H2', action: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run() },
  { title: 'Heading 3', icon: 'H3', action: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 3 }).run() },
  { title: 'Bullet List', icon: '•', action: (editor: any) => editor.chain().focus().clearNodes().toggleBulletList().run() },
  { title: 'Numbered List', icon: '1.', action: (editor: any) => editor.chain().focus().clearNodes().toggleOrderedList().run() },
  { title: 'To-do list', icon: '☑', action: (editor: any) => editor.chain().focus().clearNodes().toggleTaskList().run() },
  { title: 'Quote', icon: '"', action: (editor: any) => editor.chain().focus().clearNodes().toggleBlockquote().run() },
  { title: 'Code block', icon: '<>', action: (editor: any) => editor.chain().focus().clearNodes().toggleCodeBlock().run() },
  { title: 'Divider', icon: '—', action: (editor: any) => editor.chain().focus().clearNodes().setHorizontalRule().run() },
  { title: 'Database grid', icon: '🗄', action: () => {} },
  { title: 'Ask AI Builder', icon: '✨', action: () => {} },
];

function markdownToHtml(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inTaskList = false;
  let inCode = false;
  let codeContent = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCode) {
        // End of code block
        html += `<pre><code>${codeContent.trim()}</code></pre>`;
        inCode = false;
        codeContent = '';
      } else {
        // Start of code block
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeContent += line + '\n';
      continue;
    }

    // Handle Headers
    if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3>${line.substring(4)}</h3>`;
      continue;
    }

    // Handle Checklist Items
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (!inTaskList) {
        html += '<ul data-type="taskList">';
        inTaskList = true;
      }
      const checked = line.startsWith('- [x] ');
      const title = line.substring(6);
      html += `<li data-type="taskItem" data-checked="${checked ? 'true' : 'false'}" data-status="${checked ? 'done' : 'todo'}">${title}</li>`;
      continue;
    }

    // Handle standard list items
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inTaskList) {
        html += '</ul>';
        inTaskList = false;
      }
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${line.substring(2)}</li>`;
      continue;
    }

    // Close open lists if an empty or different element is found
    if (line === '') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inTaskList) {
        html += '</ul>';
        inTaskList = false;
      }
      continue;
    }

    // Wrap remaining lines in simple paragraphs
    if (line.length > 0) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inTaskList) {
        html += '</ul>';
        inTaskList = false;
      }

      // Inline styles replacements
      let formattedLine = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');

      html += `<p>${formattedLine}</p>`;
    }
  }

  // Ensure all lists are closed
  if (inList) html += '</ul>';
  if (inTaskList) html += '</ul>';

  return html;
}

function parseContentIfNeeded(content: string): string {
  if (!content) return '';
  if (/<p>|<h1>|<h2>|<h3>|<ul>|<ol>|<li>|<pre>|<code>|<blockquote>/i.test(content)) {
    return content;
  }
  return markdownToHtml(content);
}

const getUserColor = (id: string) => {
  const colors = ['#ff4d4d', '#4da6ff', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

export default function Editor() {
  const [isMounted, setIsMounted] = useState(false);
  const { activePageId, setActivePage, aiModel, addToast } = useAppStore();
  const [activePage, setActivePageData] = useState<any>(null);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [hasDatabase, setHasDatabase] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [onlineUsersList, setOnlineUsersList] = useState<any[]>([]);

  // Page History flyout panel states
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  const fetchPageHistory = async () => {
    if (!activePageId) return;
    setIsFetchingHistory(true);
    try {
      const res = await fetch(`/api/pages/history?pageId=${activePageId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data);
      }
    } catch (err) {
      console.error("Error fetching page history:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleRestoreVersion = async (entryId: string) => {
    if (!activePageId) return;
    if (!confirm("✦ Are you sure you want to restore this version of the document?")) return;

    try {
      const res = await fetch('/api/pages/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: activePageId, entryId })
      });

      if (res.ok) {
        alert("✦ Page version successfully restored!");
        fetchPageData(activePageId);
        fetchPageHistory();
      } else {
        alert("Failed to restore page snapshot.");
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const activePageIdRef = useRef(activePageId);
  activePageIdRef.current = activePageId;

  const { complete, completion, input, handleInputChange, isLoading, setCompletion } = useCompletion({
    api: '/api/generate',
    streamProtocol: 'text',
  });

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isAudioRecordingOpen, setIsAudioRecordingOpen] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [disableMeetingDashboard, setDisableMeetingDashboard] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

  // --- Notion-style Mentions, Dates & Assistant States ---
  const [atMenuOpen, setAtMenuOpen] = useState(false);
  const [atQuery, setAtQuery] = useState("");
  const [atMenuCoords, setAtMenuCoords] = useState({ top: 0, left: 0 });
  const [atMenuIndex, setAtMenuIndex] = useState(0);
  const [workspacePages, setWorkspacePages] = useState<any[]>([]);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerCoords, setDatePickerCoords] = useState({ top: 0, left: 0 });
  const [selectedDatePillElement, setSelectedDatePillElement] = useState<HTMLElement | null>(null);
  const [datePickerDate, setDatePickerDate] = useState<Date>(new Date());
  const [datePickerIncludeTime, setDatePickerIncludeTime] = useState(true);
  const [datePickerEndDate, setDatePickerEndDate] = useState<Date | null>(null);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date().getMonth());
  const [datePickerYear, setDatePickerYear] = useState(new Date().getFullYear());
  const [timeInputVal, setTimeInputVal] = useState("12:00 PM");

  const [datePickerFormat, setDatePickerFormat] = useState("Relative");
  const [datePickerTimeFormat, setDatePickerTimeFormat] = useState("12 hour");
  const [datePickerTimezone, setDatePickerTimezone] = useState("GMT+5:30");
  const [datePickerRemind, setDatePickerRemind] = useState("None");

  const [showMeetingToast, setShowMeetingToast] = useState(false);
  const [meetingToastDismissed, setMeetingToastDismissed] = useState(false);

  // Refs for keydown handler to prevent stale closures
  const atMenuOpenRef = useRef(atMenuOpen);
  atMenuOpenRef.current = atMenuOpen;
  const atQueryRef = useRef(atQuery);
  atQueryRef.current = atQuery;
  const atMenuIndexRef = useRef(atMenuIndex);
  atMenuIndexRef.current = atMenuIndex;
  const workspacePagesRef = useRef(workspacePages);
  workspacePagesRef.current = workspacePages;

  // --- Helper Functions for @ Mentions & Page Links ---
  const getAtMenuItems = () => {
    const query = atQuery.trim().toLowerCase();
    const items: any[] = [];

    // 1. DATE OPTIONS
    const dates = [
      { type: 'date', label: 'Today', date: new Date(), icon: '📅', subtitle: new Date().toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) },
      { type: 'date', label: 'Tomorrow', date: new Date(Date.now() + 86400000), icon: '📅', subtitle: new Date(Date.now() + 86400000).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) },
      { type: 'date', label: 'Yesterday', date: new Date(Date.now() - 86400000), icon: '📅', subtitle: new Date(Date.now() - 86400000).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }) },
    ];
    
    const matchedDates = dates.filter(d => d.label.toLowerCase().includes(query));
    if (matchedDates.length > 0) {
      items.push({ category: 'Date', options: matchedDates });
    }

    // 2. PEOPLE OPTION
    items.push({
      category: 'People',
      options: [
        { type: 'people', label: query ? `Invite "${atQuery}"...` : 'Invite contributors...', queryVal: atQuery, icon: '👤' }
      ]
    });

    // 3. LINK TO PAGE OPTIONS
    const matchedPages = workspacePages
      .filter((p: any) => p.id !== activePageId && (p.title || 'Untitled').toLowerCase().includes(query))
      .slice(0, 5)
      .map((p: any) => ({
        type: 'page',
        id: p.id,
        label: p.title || 'Untitled page',
        icon: p.icon || '📄',
        subtitle: p.parent_title ? `In ${p.parent_title}` : 'Workspace page',
        page: p
      }));

    if (matchedPages.length > 0) {
      items.push({ category: 'Link to page', options: matchedPages });
    } else if (!query) {
      const recent = workspacePages.slice(0, 3).map((p: any) => ({
        type: 'page',
        id: p.id,
        label: p.title || 'Untitled page',
        icon: p.icon || '📄',
        subtitle: 'Recent page',
        page: p
      }));
      if (recent.length > 0) {
        items.push({ category: 'Link to page', options: recent });
      }
    }

    // 4. NEW PAGE OPTION
    if (query.length > 0) {
      items.push({
        category: 'New page',
        options: [
          { type: 'new-page', label: `Create new page "${atQuery}"`, queryVal: atQuery, icon: '➕' }
        ]
      });
    }

    return items;
  };

  const getFlatAtMenuItems = () => {
    const groups = getAtMenuItems();
    const flat: any[] = [];
    groups.forEach(g => {
      g.options.forEach((opt: any) => {
        flat.push({ ...opt, category: g.category });
      });
    });
    return flat;
  };

  const handleSelectAtItem = async (item: any) => {
    if (!editor) return;
    const { state } = editor;
    const { $from } = state.selection;

    const textBefore = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 40),
      $from.parentOffset,
      undefined,
      "\uFFFC"
    );

    const match = textBefore.match(/(?:^|\s)@([^\s]*)$/);
    if (!match) return;

    const atStart = $from.pos - match[0].length;
    const atEnd = $from.pos;

    if (item.type === 'date') {
      const dateStr = item.date.toISOString();
      const labelStr = `@${item.label} ${new Date().toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}`;
      const dateHtml = `<span class="mention-date-pill" data-date="${dateStr}" data-label="${labelStr}" data-include-time="true">${labelStr}</span>&nbsp;`;
      
      editor.chain().focus().deleteRange({ from: atStart, to: atEnd }).insertContent(dateHtml).run();
      addToast(`Inserted date pill: ${item.label}`, "info");
    } 
    else if (item.type === 'people') {
      const inviteName = item.queryVal || 'Contributor';
      const inviteHtml = `<span class="mention-people-pill" data-name="${inviteName}">👤 Invite ${inviteName}</span>&nbsp;`;
      
      editor.chain().focus().deleteRange({ from: atStart, to: atEnd }).insertContent(inviteHtml).run();
      addToast(`Sent mock invitation email to "${inviteName}"!`, "success");
    }
    else if (item.type === 'page') {
      const pageHtml = `<span class="mention-page-pill" data-page-id="${item.id}">${item.icon || '📄'} ${item.label}</span>&nbsp;`;
      
      editor.chain().focus().deleteRange({ from: atStart, to: atEnd }).insertContent(pageHtml).run();
      addToast(`Linked to page: ${item.label}`, "success");
    }
    else if (item.type === 'new-page') {
      try {
        const res = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: item.queryVal || "Untitled Page", icon: "📄", type: "editor" }),
        });
        if (res.ok) {
          const newPage = await res.json();
          const pageHtml = `<span class="mention-page-pill" data-page-id="${newPage.id}">📄 ${newPage.title}</span>&nbsp;`;
          
          editor.chain().focus().deleteRange({ from: atStart, to: atEnd }).insertContent(pageHtml).run();
          addToast(`Created and linked new page: ${newPage.title}!`, "success");
        }
      } catch (err) {
        console.error("Error creating sub-page:", err);
      }
    }

    setAtMenuOpen(false);
    atMenuOpenRef.current = false;
  };

  // --- Monthly Calendar Helpers & Logic ---
  const getDaysInMonthGrid = (month: number, year: number) => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    const days: any[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthTotalDays - i)
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  const getFormattedDatePillLabel = (dateVal: Date, includeTime: boolean, endDate: Date | null) => {
    const now = new Date();
    const isToday = dateVal.toDateString() === now.toDateString();
    
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = dateVal.toDateString() === tomorrow.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = dateVal.toDateString() === yesterday.toDateString();

    let baseLabel = "";
    if (isToday) baseLabel = "Today";
    else if (isTomorrow) baseLabel = "Tomorrow";
    else if (isYesterday) baseLabel = "Yesterday";
    else {
      baseLabel = dateVal.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    let timeStr = "";
    if (includeTime) {
      timeStr = " " + dateVal.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
    }

    let endLabel = "";
    if (endDate) {
      const isEndToday = endDate.toDateString() === now.toDateString();
      const isEndTomorrow = endDate.toDateString() === tomorrow.toDateString();
      const isEndYesterday = endDate.toDateString() === yesterday.toDateString();
      
      let endBase = "";
      if (isEndToday) endBase = "Today";
      else if (isEndTomorrow) endBase = "Tomorrow";
      else if (isEndYesterday) endBase = "Yesterday";
      else {
        endBase = endDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      let endTimeStr = "";
      if (includeTime) {
        endTimeStr = " " + endDate.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
      }
      endLabel = ` → ${endBase}${endTimeStr}`;
    }

    return `@${baseLabel}${timeStr}${endLabel}`;
  };

  const updateDatePillInDoc = (dateVal: Date, includeTime: boolean, endDate: Date | null) => {
    if (!editor || !selectedDatePillElement) return;

    try {
      const pos = editor.view.posAtDOM(selectedDatePillElement, 0);
      if (pos !== null && pos !== undefined) {
        const oldText = selectedDatePillElement.textContent || '';
        const oldLen = oldText.length;
        
        const formattedLabel = getFormattedDatePillLabel(dateVal, includeTime, endDate);
        const newHtml = `<span class="mention-date-pill" data-date="${dateVal.toISOString()}" data-label="${formattedLabel}" data-include-time="${includeTime}"${endDate ? ` data-end-date="${endDate.toISOString()}"` : ''}>${formattedLabel}</span>`;
        
        editor.chain().focus().deleteRange({ from: pos, to: pos + oldLen }).insertContentAt(pos, newHtml).run();
        
        setTimeout(() => {
          if (!editor.view.dom) return;
          const newEl = editor.view.dom.querySelector(`.mention-date-pill[data-date="${dateVal.toISOString()}"]`);
          if (newEl) {
            setSelectedDatePillElement(newEl as HTMLElement);
          }
        }, 50);
      }
    } catch (e) {
      console.error("Error updating date pill:", e);
    }
  };

  const handleCalendarDayClick = (dayDate: Date) => {
    const newDate = new Date(dayDate);
    newDate.setHours(datePickerDate.getHours());
    newDate.setMinutes(datePickerDate.getMinutes());
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    
    setDatePickerDate(newDate);
    updateDatePillInDoc(newDate, datePickerIncludeTime, datePickerEndDate);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Clicking Date Pill opens Detailed picker
    const datePill = target.closest('.mention-date-pill');
    if (datePill) {
      const dateVal = datePill.getAttribute('data-date');
      const includeTimeVal = datePill.getAttribute('data-include-time') === 'true';
      const endDateVal = datePill.getAttribute('data-end-date');
      
      const parsedDate = dateVal ? new Date(dateVal) : new Date();
      setSelectedDatePillElement(datePill as HTMLElement);
      setDatePickerDate(parsedDate);
      setDatePickerIncludeTime(includeTimeVal);
      setDatePickerEndDate(endDateVal ? new Date(endDateVal) : null);
      setDatePickerMonth(parsedDate.getMonth());
      setDatePickerYear(parsedDate.getFullYear());
      setTimeInputVal(parsedDate.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' }));
      
      const rect = datePill.getBoundingClientRect();
      setDatePickerCoords({
        top: rect.bottom + window.scrollY + 8,
        left: Math.max(10, rect.left + window.scrollX - 80)
      });
      setDatePickerOpen(true);
      return;
    }

    // Clicking Linked Page Pill navigates to page
    const pagePill = target.closest('.mention-page-pill');
    if (pagePill) {
      const pageId = pagePill.getAttribute('data-page-id');
      if (pageId) {
        setActivePage(pageId);
      }
      return;
    }
  };

  // --- Real-time @ typing and keyword scanning interceptor ---
  const handleEditorSelectionOrTextUpdate = (editorInstance: any) => {
    if (!editorInstance) return;
    const { state, view } = editorInstance;
    const { selection } = state;
    const { $from } = selection;

    if (!$from.parent.isTextblock) {
      setAtMenuOpen(false);
      atMenuOpenRef.current = false;
      return;
    }

    const textBefore = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 40),
      $from.parentOffset,
      undefined,
      "\uFFFC"
    );

    const match = textBefore.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      const query = match[1];
      setAtQuery(query);
      atQueryRef.current = query;
      setAtMenuOpen(true);
      atMenuOpenRef.current = true;
      setAtMenuIndex(0); // Reset index on new search
      
      // Load workspace pages for links
      if (workspacePages.length === 0) {
        fetch("/api/pages")
          .then(res => res.ok ? res.json() : [])
          .then(data => setWorkspacePages(data))
          .catch(err => console.error("Error loading pages for autocomplete:", err));
      }

      try {
        const domRect = view.coordsAtPos(selection.from);
        setAtMenuCoords({
          top: domRect.bottom + window.scrollY + 5,
          left: Math.max(10, domRect.left + window.scrollX)
        });
      } catch (e) {
        console.warn(e);
      }

      // Scanner for Meeting Notes Assistant
      const activeLine = $from.parent.textContent;
      if (activeLine.toLowerCase().includes("meeting") && !meetingToastDismissed) {
        setShowMeetingToast(true);
      }
    } else {
      setAtMenuOpen(false);
      atMenuOpenRef.current = false;
    }
  };

  // --- Gemini Meeting Outline Generator ---
  const handleAddMeetingNotes = async () => {
    addToast("Generating structured meeting template...", "info");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: "Create a beautiful meeting notes template with fields for Date, attendees list, agenda, key discussions, decision logs, and an action items checklist.",
          command: "prompt",
          model: aiModel
        })
      });
      if (res.ok) {
        const data = await res.json();
        const tiptapJson = markdownToTiptap(data.completion || "") as any;
        if (tiptapJson && tiptapJson.content) {
          editor?.chain().focus().insertContent(tiptapJson.content).run();
        }
        addToast("AI Meeting Notes template prepended!", "success");
        setShowMeetingToast(false);
      } else {
        addToast("Failed to generate meeting template.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Failed to connect to AI server.", "error");
    }
  };

  const COVER_IMAGES = [
    "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=2275&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506744626753-dba37c25a1f1?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473081556163-2a17de81fc97?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=2475&auto=format&fit=crop",
  ];

  const fetchPageData = async (pageId: string) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`);
      if (res.ok) {
        const data = await res.json();
        setActivePageData(data);
        setHasDatabase(data?.type === 'board');
      }
    } catch (err) {
      console.error("Error loading page details:", err);
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

  useEffect(() => {
    setIsMounted(true);
    fetchProfile();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.email?.split('@')[0] || 'Contributor',
          color: getUserColor(user.id)
        });
      }
    });

    const isTipDismissed = localStorage.getItem("cora_editor_tip_dismissed");
    if (!isTipDismissed) {
      setShowTooltip(true);
    }
  }, []);

  useEffect(() => {
    if (activePageId && !['inbox', 'calendar', 'tasks', 'automations', 'templates', 'trash'].includes(activePageId)) {
      setDisableMeetingDashboard(false);
      fetchPageData(activePageId);

      const channel = supabase.channel(`realtime:page:${activePageId}`);
      
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const list = Object.values(state).flat().map((p: any) => p.user).filter(Boolean);
          const uniqueList = list.filter((item, index, self) => 
            index === self.findIndex((t) => t.id === item.id)
          );
          setOnlineUsersList(uniqueList);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pages', filter: `id=eq.${activePageId}` }, (payload: any) => {
          setActivePageData(payload.new);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && currentUser) {
            await channel.track({
              user: currentUser
            });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setActivePageData(null);
      setOnlineUsersList([]);
    }
  }, [activePageId, currentUser]);

  const updatePageAttribute = async (updates: any) => {
    if (!activePageId) return;
    
    setActivePageData((prev: any) => prev ? { ...prev, ...updates } : null);
    
    try {
      await fetch(`/api/pages/${activePageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error("Error updating page attribute:", err);
    }
  };

  const changeCoverImage = () => {
    const currentIndex = COVER_IMAGES.indexOf(activePage?.cover_image || "");
    const nextIndex = (currentIndex + 1) % COVER_IMAGES.length;
    updatePageAttribute({ cover_image: COVER_IMAGES[nextIndex] });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("File exceeds 5MB size limit.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setSaveStatus('saving');
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        await updatePageAttribute({ cover_image: url });
        setSaveStatus('saved');
      } else {
        const err = await res.json();
        alert(err.error || "Failed to upload cover.");
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("An error occurred during file upload.");
      setSaveStatus('saved');
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      GlobalDragHandle.configure({
        dragHandleWidth: 20,
        scrollTreshold: 100,
      }),
      Placeholder.configure({
        placeholder: "Press '/' for formatting commands or invoke AI writer...",
      })
    ],
    content: activePage?.content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    onUpdate: ({ editor }) => {
      const pageId = activePageIdRef.current;
      if (pageId && activePage?.type === 'editor') {
        setSaveStatus('saving');
        triggerDebouncedSave(pageId, JSON.stringify(editor.getJSON()));
        
        const text = editor.getText();
        if (text.endsWith('/ai')) {
          const { state, view } = editor;
          const { tr } = state;
          view.dispatch(tr.delete(state.selection.from - 3, state.selection.from));
          setShowAiMenu(true);
        }
      }
      handleEditorSelectionOrTextUpdate(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      handleEditorSelectionOrTextUpdate(editor);
    }
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const triggerDebouncedSave = (pageId: string, content: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error("Failed to save content:", err);
      }
    }, 1000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor) return;
      const { state } = editor;
      const { $anchor } = state.selection;

      // 1. Intercept keyboard inputs during @ Autocomplete menu active
      if (atMenuOpenRef.current) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const count = getFlatAtMenuItems().length;
          setAtMenuIndex(prev => (prev > 0 ? prev - 1 : count - 1));
          return;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const count = getFlatAtMenuItems().length;
          setAtMenuIndex(prev => (prev < count - 1 ? prev + 1 : 0));
          return;
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const flat = getFlatAtMenuItems();
          const idx = atMenuIndexRef.current;
          if (flat[idx]) {
            handleSelectAtItem(flat[idx]);
          }
          return;
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setAtMenuOpen(false);
          atMenuOpenRef.current = false;
          return;
        }
      }

      // 2. Intercept keyboard inputs during / Slash command menu active
      const isSlashMenuOpen = $anchor.parent.isTextblock && $anchor.parent.textContent === '/';
      
      if (isSlashMenuOpen) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSlashIndex(prev => (prev > 0 ? prev - 1 : SLASH_COMMANDS.length - 1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSlashIndex(prev => (prev < SLASH_COMMANDS.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const cmd = SLASH_COMMANDS[slashIndex];
          
          editor.commands.deleteRange({ from: state.selection.from - 1, to: state.selection.from });
          
          if (cmd.title === 'Ask AI Builder') {
            setShowAiMenu(true);
          } else if (cmd.title === 'Database grid') {
            setHasDatabase(true);
          } else {
            cmd.action(editor);
          }
        } else if (e.key === 'Escape') {
           e.preventDefault();
           editor.commands.deleteRange({ from: state.selection.from - 1, to: state.selection.from });
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [editor, slashIndex]);

  const lastLoadedPageIdRef = useRef<string | null>(null);

  const loadContent = (content: string) => {
    if (!editor) return;
    if (!content || content.trim() === '') {
      if (editor.isEmpty) return;
      editor.commands.setContent({ type: 'doc', content: [] });
      return;
    }

    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
        // DETECT IF IT IS A WRAPPED SINGLE PARAGRAPH OF RAW MARKDOWN
        if (parsed.content && parsed.content.length === 1 && parsed.content[0].type === 'paragraph') {
          const firstNode = parsed.content[0];
          if (firstNode.content && firstNode.content.length === 1 && firstNode.content[0].type === 'text') {
            const textVal = firstNode.content[0].text || '';
            // Match #, ##, ###, * or - list, or numbered list elements
            const isRawMarkdownWrapped = /(?:#|##|###|- |\* |\d+\. |\[[ x]\]|\*\*|_|`)/m.test(textVal);
            if (isRawMarkdownWrapped) {
              const tiptapJson = markdownToTiptap(textVal);
              editor.commands.setContent(tiptapJson);
              const pageId = activePageIdRef.current;
              if (pageId) {
                triggerDebouncedSave(pageId, JSON.stringify(tiptapJson));
              }
              return;
            }
          }
        }

        const currentJSON = editor.getJSON();
        if (JSON.stringify(currentJSON) !== JSON.stringify(parsed)) {
          editor.commands.setContent(parsed);
        }
        return;
      }
    } catch {}

    // HTML fallback
    if (/<p>|<h1>|<h2>|<h3>|<ul>|<ol>|<li>|<pre>|<code>|<blockquote>|<strong>|<em>|<hr>/i.test(content)) {
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
      return;
    }

    // Markdown fallback - convert it
    const tiptapJson = markdownToTiptap(content);
    editor.commands.setContent(tiptapJson);
    const pageId = activePageIdRef.current;
    if (pageId) {
      triggerDebouncedSave(pageId, JSON.stringify(tiptapJson));
    }
  };

  useEffect(() => {
    if (editor && activePage && activePage.type === 'editor') {
      if (lastLoadedPageIdRef.current !== activePageId || !editor.isFocused) {
        loadContent(activePage.content);
        lastLoadedPageIdRef.current = activePageId;
      }
    }
  }, [activePageId, editor, activePage?.content]);

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    complete(input, {
      body: {
        context: editor?.getText() || '',
        command: 'prompt',
        model: aiModel
      }
    });
  };

  const handleAiAction = (command: string) => {
    complete('', {
      body: {
        context: editor?.getText() || '',
        command,
        model: aiModel
      }
    });
  };

  const insertAiContent = () => {
    if (editor && completion) {
      const tiptapJson = markdownToTiptap(completion) as any;
      if (tiptapJson && tiptapJson.content) {
        editor.commands.insertContent(tiptapJson.content);
      }
      setCompletion('');
      setShowAiMenu(false);
    }
  };

  const discardAiContent = () => {
    setCompletion('');
    setShowAiMenu(false);
  };

  const dismissTooltip = () => {
    localStorage.setItem("cora_editor_tip_dismissed", "true");
    setShowTooltip(false);
  };

  let meetingData = null;
  if (activePage?.content && !disableMeetingDashboard) {
    try {
      const parsed = JSON.parse(activePage.content);
      if (parsed && typeof parsed === 'object' && parsed.type === 'meeting') {
        meetingData = parsed;
      }
    } catch (e) {}
  }

  if (!isMounted) return null;
  if (activePageId === 'calendar') return <CalendarView />;
  if (activePageId === 'inbox') return <InboxView />;
  if (activePageId === 'tasks') return <TasksView />;
  if (activePageId === 'automations') return <AgentsView />;
  if (activePageId === 'templates') return <TemplatesView />;
  if (activePageId === 'trash') return <TrashView />;
  if (activePageId === 'whatsapp') return <WhatsAppView />;

  if (!activePage) {
    return <CommandCenter />;
  }

  return (
    <div className={styles.editorContainer}>
      {/* HEADER SECTION */}
      <header className={styles.header}>
        <button 
          className={styles.mobileMenuBtn}
          onClick={() => window.dispatchEvent(new CustomEvent('openSidebar'))}
          title="Open Pages"
        >
          <Menu size={18} />
        </button>
        <div className={styles.breadcrumbs}>
          <span className={styles.breadcrumbItem}>{workspaceName}</span>
          <span className={styles.separator}>/</span>
          <span className={styles.breadcrumbItem}>{activePage.title || 'Untitled'}</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.presenceAvatars}>
            {onlineUsersList.map(user => (
              <div 
                key={user.id} 
                className={styles.presenceAvatar}
                style={{ backgroundColor: user.color, border: `2px solid ${user.color}` }}
                title={`${user.name} is editing live`}
              >
                {user.name.charAt(0).toUpperCase()}
                <span className={styles.presenceDot} />
              </div>
            ))}
          </div>
          
          {/* Pulse Autosaved Label */}
          <div className={styles.saveStatusWrapper}>
            <div className={`${styles.saveDot} ${saveStatus === 'saved' ? styles.dotSaved : styles.dotSaving}`}></div>
            <span className={styles.saveText}>
              {saveStatus === 'saving' ? 'Saving...' : 'Autosaved'}
            </span>
          </div>

          <button 
            className={styles.shareHeaderBtn} 
            onClick={() => setShowExportModal(true)}
            style={{ 
              marginRight: '6px'
            }}
          >
            Export
          </button>
          <button className={styles.shareHeaderBtn} onClick={() => setShowShareModal(true)}>Share</button>
          <button 
            className={`${styles.iconBtn} ${isAudioRecordingOpen ? styles.iconBtnActive : ''}`} 
            title="Record AI Voice Note"
            onClick={() => setIsAudioRecordingOpen(!isAudioRecordingOpen)}
          >
            <Mic size={18} />
          </button>
          <button 
            className={`${styles.iconBtn} ${showHistoryPanel ? styles.iconBtnActive : ''}`} 
            title="Page History"
            onClick={() => {
              setShowHistoryPanel(!showHistoryPanel);
              setShowAnalyticsPanel(false);
              if (!showHistoryPanel) fetchPageHistory();
            }}
          >
            <Clock size={18} />
          </button>
          <button 
            className={`${styles.iconBtn} ${showAnalyticsPanel ? styles.iconBtnActive : ''}`} 
            title="Document Analytics"
            onClick={() => {
              setShowAnalyticsPanel(!showAnalyticsPanel);
              setShowHistoryPanel(false);
            }}
          >
            <BarChart2 size={18} />
          </button>
          <button 
            className={`${styles.iconBtn} ${activePage.is_favorite ? styles.iconBtnActive : ''}`}
            onClick={() => updatePageAttribute({ is_favorite: !activePage.is_favorite })}
            title="Toggle Favorite"
          >
            <Star size={18} fill={activePage.is_favorite ? "var(--black)" : "none"} color={activePage.is_favorite ? "var(--black)" : "currentColor"} />
          </button>
          <button 
            className={styles.iconBtn} 
            title="Delete Page"
            onClick={async () => {
              if (confirm('Are you sure you want to delete this page?')) {
                await fetch(`/api/pages/${activePageId}`, { method: 'DELETE' });
                setActivePage(null);
              }
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* EDITOR CORE LAYOUT */}
      <div className={styles.editorLayoutWrapper}>
        <div className={styles.scrollableContent}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUploadCover} 
            style={{ display: 'none' }} 
            accept="image/jpeg,image/png,image/webp" 
          />

          {activePage.cover_image ? (
            <div className={styles.coverImage}>
              <img src={activePage.cover_image} alt="Cover" />
              <div className={styles.coverControls}>
                 <button className={styles.coverBtn} onClick={changeCoverImage}>Change cover</button>
                 <button className={styles.coverBtn} onClick={() => fileInputRef.current?.click()}>Upload custom</button>
                 <button className={styles.coverBtn} onClick={() => updatePageAttribute({ cover_image: null })} style={{ color: "var(--accent-red)" }}>Remove</button>
              </div>
            </div>
          ) : (
            <div className={styles.coverPlaceholderZone}>
              <div className={styles.addCoverWrapper}>
                 <button className={styles.addCoverBtn} onClick={changeCoverImage}>
                   <ImageIcon size={14} /> Add cover image
                 </button>
                 <button className={styles.addCoverBtn} onClick={() => fileInputRef.current?.click()}>
                   <ImageIcon size={14} /> Upload custom
                 </button>
              </div>
            </div>
          )}

          <div className={`${styles.contentWrapper} ${!activePage.cover_image ? styles.noCoverContent : ''}`}>
            {/* FLOATING EMOJI SELECTOR */}
            <div className={`${styles.pageIconWrapper} ${activePage.cover_image ? styles.hasCover : ''}`}>
               <input 
                 className={styles.iconInput} 
                 value={activePage.icon || "📄"} 
                 onChange={(e) => updatePageAttribute({ icon: e.target.value })}
                 maxLength={2}
                 title="Click to edit emoji"
               />
            </div>

            {/* Untitled Header Outline */}
            <input 
              className={styles.titleInput}
              value={activePage.title || ""}
              onChange={(e) => updatePageAttribute({ title: e.target.value })}
              placeholder="Untitled document"
            />

            {onlineUsersList.length > 1 && (
              <div className={styles.collaboratorActiveBanner}>
                <span className={styles.pulsingLight} />
                <span>
                  {onlineUsersList
                    .filter(u => u.id !== currentUser?.id)
                    .map(u => u.name)
                    .join(', ')}{' '}
                  {onlineUsersList.filter(u => u.id !== currentUser?.id).length === 1 ? 'is' : 'are'}{' '}
                  viewing and editing this document in real-time.
                </span>
              </div>
            )}
            
            <div className={styles.viewToggles}>
              <button 
                className={`${styles.viewToggleBtn} ${activePage.type === 'editor' ? styles.activeView : ''}`}
                onClick={() => updatePageAttribute({ type: 'editor' })}
              >
                <FileText size={14} /> Document view
              </button>
              <button 
                className={`${styles.viewToggleBtn} ${activePage.type === 'board' ? styles.activeView : ''}`}
                onClick={() => updatePageAttribute({ type: 'board' })}
              >
                <LayoutGrid size={14} /> Kanban board
              </button>
            </div>

            <div className={styles.editorMain}>
              {activePage.type === 'board' ? (
                <KanbanBoard 
                  pageId={activePageId!} 
                  initialContent={activePage?.content || ''} 
                  onUpdateContent={(newContent) => updatePageAttribute({ content: newContent })} 
                />
              ) : activePage?.icon === "🎙️" && (!activePage?.content || activePage.content.trim() === "" || activePage.content === '{"type":"doc","content":[{"type":"paragraph"}]}') ? (
                <MeetingRecorderDashboard 
                  pageId={activePageId!} 
                  onTranscriptionComplete={() => fetchPageData(activePageId!)}
                />
              ) : meetingData ? (
                <MeetingNotesView 
                  data={meetingData} 
                  pageTitle={activePage?.title || "Meeting Notes"}
                  onDisable={() => setDisableMeetingDashboard(true)}
                />
              ) : (
                <>
                  {editor && (
                    <FloatingMenu 
                      editor={editor}
                      shouldShow={({ state }) => {
                        const { $anchor } = state.selection;
                        return $anchor.parent.isTextblock && $anchor.parent.textContent === '/';
                      }}
                    >
                      <div className={styles.slashMenu}>
                        {SLASH_COMMANDS.map((cmd, i) => (
                          <button 
                            key={cmd.title}
                            className={`${styles.slashMenuItem} ${i === slashIndex ? styles.slashMenuItemActive : ''}`}
                            onClick={() => {
                              editor.commands.deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from });
                              if (cmd.title === 'Ask AI Builder') {
                                setShowAiMenu(true);
                              } else if (cmd.title === 'Database grid') {
                                setHasDatabase(true);
                              } else {
                                cmd.action(editor);
                              }
                            }}
                          >
                            <span className={styles.slashMenuIcon}>{cmd.icon}</span>
                            {cmd.title}
                          </button>
                        ))}
                      </div>
                    </FloatingMenu>
                  )}

                  {editor && (
                    <BubbleMenu editor={editor}>
                      <div className={styles.bubbleMenu}>
                        <button 
                          className={`${styles.bubbleBtn} ${editor.isActive('bold') ? styles.bubbleBtnActive : ''}`}
                          onClick={() => editor.chain().focus().toggleBold().run()}
                          style={{ fontWeight: 'bold' }}
                          title="Bold text"
                        >
                          B
                        </button>
                        <button 
                          className={`${styles.bubbleBtn} ${editor.isActive('italic') ? styles.bubbleBtnActive : ''}`}
                          onClick={() => editor.chain().focus().toggleItalic().run()}
                          style={{ fontStyle: 'italic' }}
                          title="Italic text"
                        >
                          i
                        </button>
                        <button 
                          className={`${styles.bubbleBtn} ${editor.isActive('strike') ? styles.bubbleBtnActive : ''}`}
                          onClick={() => editor.chain().focus().toggleStrike().run()}
                          style={{ textDecoration: 'line-through' }}
                          title="Strikethrough"
                        >
                          S
                        </button>
                        <button 
                          className={`${styles.bubbleBtn} ${editor.isActive('code') ? styles.bubbleBtnActive : ''}`}
                          onClick={() => editor.chain().focus().toggleCode().run()}
                          style={{ fontFamily: 'monospace' }}
                          title="Inline code"
                        >
                          {'<>'}
                        </button>
                        <button 
                          className={`${styles.bubbleBtn} ${editor.isActive('heading', { level: 1 }) ? styles.bubbleBtnActive : ''}`}
                          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                          style={{ fontWeight: 'bold' }}
                          title="Heading 1"
                        >
                          H1
                        </button>
                        <button 
                          className={`${styles.bubbleBtn} ${editor.isActive('heading', { level: 2 }) ? styles.bubbleBtnActive : ''}`}
                          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                          style={{ fontWeight: 'bold' }}
                          title="Heading 2"
                        >
                          H2
                        </button>
                        <div className={styles.bubbleDivider} />
                        <button 
                          className={`${styles.bubbleBtn} ${styles.aiBubbleBtn}`}
                          onClick={() => setShowAiMenu(true)}
                        >
                          <Sparkles size={14} /> Ask AI
                        </button>
                      </div>
                    </BubbleMenu>
                  )}

                  {/* AI STREAM DIALOG POPUP */}
                  {showAiMenu && (
                    <div className={styles.aiPopup}>
                      <form onSubmit={handleAiSubmit} className={styles.aiForm}>
                        <Sparkles size={16} className={styles.aiIcon} />
                        <input 
                          autoFocus
                          className={styles.aiInput}
                          value={input}
                          onChange={handleInputChange}
                          placeholder="Ask AI to write, generate, or summarize anything..."
                          disabled={isLoading}
                        />
                      </form>
                      
                      {!completion && !isLoading && (
                        <div className={styles.aiOptionsMenu}>
                          <button className={styles.aiOptionBtn} onClick={() => handleAiAction('improve')}>🪄 Improve writing</button>
                          <button className={styles.aiOptionBtn} onClick={() => handleAiAction('fix_grammar')}>✅ Fix spelling & grammar</button>
                          <button className={styles.aiOptionBtn} onClick={() => handleAiAction('summarize')}>📋 Summarize details</button>
                          <button className={styles.aiOptionBtn} onClick={() => handleAiAction('longer')}>✍️ Expand content (make longer)</button>
                          <button className={styles.aiOptionBtn} onClick={() => handleAiAction('shorter')}>✂️ Shorten text (make shorter)</button>
                          <button className={styles.aiOptionBtn} onClick={() => handleAiAction('tone_professional')}>💼 Professional tone</button>
                          <button className={styles.aiOptionBtn} onClick={() => handleAiAction('tone_casual')}>💬 Casual tone</button>
                        </div>
                      )}

                      {(completion || isLoading) && (
                        <div className={styles.aiResult}>
                          <div className={styles.aiText}>
                            {completion}
                            {isLoading && <span className={styles.cursor}>|</span>}
                          </div>
                          {!isLoading && (
                            <div className={styles.aiActions}>
                              <button className={styles.aiActionBtn} onClick={insertAiContent}>
                                <Check size={14} /> Insert into page
                              </button>
                              <button className={`${styles.aiActionBtn} ${styles.aiActionBtnDanger}`} onClick={discardAiContent}>
                                <X size={14} /> Discard response
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <EditorContent editor={editor} />
                  
                  {hasDatabase && (
                    <DatabaseView dbId={activePageId!} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ONBOARDING USER GUIDE TOOLTIP */}
        {showTooltip && (
          <div className={styles.beginnerOnboardingTooltip}>
            <div className={styles.tooltipHeader}>
              <Info size={16} color="var(--primary)" />
              <span className={styles.tooltipTitle}>Quick Editor Tip</span>
              <button className={styles.tooltipClose} onClick={dismissTooltip}>✕</button>
            </div>
            <p className={styles.tooltipDesc}>
              Press <kbd className={styles.tooltipKbd}>/</kbd> anywhere on a blank line to insert database tables, headings, ordered lists, or command the AI Assistant!
            </p>
            <button className={styles.tooltipDismissBtn} onClick={dismissTooltip}>Got it, thanks!</button>
          </div>
        )}

        {/* HISTORY FLYOUT PANEL */}
        {showHistoryPanel && (
          <div className={styles.historySidebar}>
            <div className={styles.historyHeader}>
              <span className={styles.historyTitle}>Version History</span>
              <button className={styles.closeHistoryBtn} onClick={() => setShowHistoryPanel(false)}>✕</button>
            </div>
            
            <div className={styles.historyList}>
              {isFetchingHistory ? (
                <div className={styles.historyLoading}>Loading edit timeline...</div>
              ) : historyLogs.length === 0 ? (
                <div className={styles.historyEmpty}>No edits recorded yet. Start modifying parameters to generate snapshots!</div>
              ) : (
                historyLogs.map(log => (
                  <div key={log.id} className={styles.historyItem}>
                    <div className={styles.historyMeta}>
                      <span className={styles.historyEmail}>{log.user_email}</span>
                      <span className={styles.historyTime}>{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className={styles.historyDesc}>
                      Updated page <strong>{log.action_type}</strong>
                    </div>
                    <div className={styles.historyDiff}>
                      <div className={styles.diffRemoved}>- {log.old_val || 'None'}</div>
                      <div className={styles.diffAdded}>+ {log.new_val || 'None'}</div>
                    </div>
                    <button className={styles.restoreBtn} onClick={() => handleRestoreVersion(log.id)}>Restore this version</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS PANEL */}
        {showAnalyticsPanel && (
          <AnalyticsPanel 
            pageId={activePageId!} 
            onClose={() => setShowAnalyticsPanel(false)}
          />
        )}
      </div>
      
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
      {showExportModal && (
        <ExportModal 
          pageId={activePageId!} 
          pageTitle={activePage?.title || 'Untitled'} 
          pageIcon={activePage?.icon} 
          onClose={() => setShowExportModal(false)} 
        />
      )}
      {isAudioRecordingOpen && (
        <AudioRecorder 
          onTranscribeComplete={(html) => {
            editor?.chain().focus().insertContent(html).run();
          }}
          onClose={() => setIsAudioRecordingOpen(false)}
        />
      )}
    </div>
  );
}
