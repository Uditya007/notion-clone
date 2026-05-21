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
import { MoreHorizontal, Star, Clock, Sparkles, Check, X, LayoutGrid, FileText, Trash2, Image as ImageIcon, CheckCircle, AlertCircle, Info, Smile } from "lucide-react";
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
import CommandCenter from "./CommandCenter";
import AudioRecorder from "./AudioRecorder";
import AnalyticsPanel from "./AnalyticsPanel";
import { Mic, BarChart2 } from "lucide-react";
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
  const { activePageId, setActivePage } = useAppStore();
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
  const [slashIndex, setSlashIndex] = useState(0);

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
        command: 'prompt'
      }
    });
  };

  const handleAiAction = (command: string) => {
    complete('', {
      body: {
        context: editor?.getText() || '',
        command
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

  if (!isMounted) return null;
  if (activePageId === 'calendar') return <CalendarView />;
  if (activePageId === 'inbox') return <InboxView />;
  if (activePageId === 'tasks') return <TasksView />;
  if (activePageId === 'automations') return <AgentsView />;
  if (activePageId === 'templates') return <TemplatesView />;
  if (activePageId === 'trash') return <TrashView />;

  if (!activePage) {
    return <CommandCenter />;
  }

  return (
    <div className={styles.editorContainer}>
      {/* HEADER SECTION */}
      <header className={styles.header}>
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
