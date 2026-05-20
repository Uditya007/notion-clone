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
import { MoreHorizontal, Star, Clock, Sparkles, Check, X, LayoutGrid, FileText, Trash2, Image as ImageIcon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import KanbanBoard from "./KanbanBoard";
import CalendarView from "./CalendarView";
import InboxView from "./InboxView";
import TasksView from "./TasksView";
import AgentsView from "./AgentsView";
import TemplatesView from "./TemplatesView";
import ShareModal from "./ShareModal";
import TrashView from "./TrashView";
import { useCompletion } from '@ai-sdk/react';
import DatabaseView from "./DatabaseView";
import { supabase } from "@/lib/supabase/client";

const SLASH_COMMANDS = [
  { title: 'Text', icon: '📝', action: (editor: any) => editor.chain().focus().clearNodes().run() },
  { title: 'Heading 1', icon: '#', action: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 1 }).run() },
  { title: 'Heading 2', icon: '##', action: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run() },
  { title: 'Heading 3', icon: '###', action: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 3 }).run() },
  { title: 'Bullet List', icon: '•', action: (editor: any) => editor.chain().focus().clearNodes().toggleBulletList().run() },
  { title: 'Numbered List', icon: '1.', action: (editor: any) => editor.chain().focus().clearNodes().toggleOrderedList().run() },
  { title: 'To-do', icon: '☑', action: (editor: any) => editor.chain().focus().clearNodes().toggleTaskList().run() },
  { title: 'Quote', icon: '"', action: (editor: any) => editor.chain().focus().clearNodes().toggleBlockquote().run() },
  { title: 'Code Block', icon: '<>', action: (editor: any) => editor.chain().focus().clearNodes().toggleCodeBlock().run() },
  { title: 'Divider', icon: '—', action: (editor: any) => editor.chain().focus().clearNodes().setHorizontalRule().run() },
  { title: 'Database', icon: '🗄', action: () => {} },
  { title: 'Ask AI', icon: '✨', action: () => {} },
];

export default function Editor() {
  const [isMounted, setIsMounted] = useState(false);
  const { activePageId, setActivePage } = useAppStore();
  const [activePage, setActivePageData] = useState<any>(null);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [hasDatabase, setHasDatabase] = useState(false);
  
  const activePageIdRef = useRef(activePageId);
  activePageIdRef.current = activePageId;

  const { complete, completion, input, handleInputChange, isLoading, setCompletion } = useCompletion({
    api: '/api/generate',
    streamProtocol: 'text',
  });

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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
  }, []);

  useEffect(() => {
    if (activePageId && !['inbox', 'calendar', 'tasks', 'automations', 'templates', 'trash'].includes(activePageId)) {
      fetchPageData(activePageId);

      const channel = supabase
        .channel(`realtime:page:${activePageId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pages', filter: `id=eq.${activePageId}` }, (payload: any) => {
          setActivePageData(payload.new);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setActivePageData(null);
    }
  }, [activePageId]);

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
        placeholder: "Type '/' for commands or start writing...",
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
        triggerDebouncedSave(pageId, editor.getHTML());
        
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
          
          if (cmd.title === 'Ask AI') {
            setShowAiMenu(true);
          } else if (cmd.title === 'Database') {
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

  useEffect(() => {
    if (editor && activePage && activePage.type === 'editor' && editor.getHTML() !== activePage.content) {
      editor.commands.setContent(activePage.content);
    }
  }, [activePageId, editor]);

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
      const formatted = completion.split('\n\n').map(p => `<p>${p}</p>`).join('');
      editor.commands.insertContent(formatted);
      setCompletion('');
      setShowAiMenu(false);
    }
  };

  const discardAiContent = () => {
    setCompletion('');
    setShowAiMenu(false);
  };

  if (!isMounted) return null;
  if (activePageId === 'calendar') return <CalendarView />;
  if (activePageId === 'inbox') return <InboxView />;
  if (activePageId === 'tasks') return <TasksView />;
  if (activePageId === 'automations') return <AgentsView />;
  if (activePageId === 'templates') return <TemplatesView />;
  if (activePageId === 'trash') return <TrashView />;

  if (!activePage) {
    return (
      <div className={styles.welcomeContainer}>
        <div className={styles.welcomeContent}>
          <div className={styles.welcomeEmoji}>👋</div>
          <h1 className={styles.welcomeTitle}>Welcome to Clearspace</h1>
          <p className={styles.welcomeSubtitle}>
            Your beautiful, secure digital workspace. Choose an existing page from your sidebar or click the "+ Add Page" button to get started!
          </p>
          <div className={styles.welcomeFeatures}>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>📝</span>
              <h3>Quick Notes</h3>
              <p>Write ideas, draft blogs, or take rich meeting notes with TipTap.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🗄</span>
              <h3>Databases</h3>
              <p>Organize projects, boards, galleries, and custom item trackers.</p>
            </div>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>✨</span>
              <h3>AI Assistant</h3>
              <p>Prompt Claude to co-write, translate, or chat about your notes.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const onlineUsers = [
    { id: 1, name: 'Alex', color: '#ff4d4d' },
    { id: 2, name: 'Sarah', color: '#4da6ff' },
  ];

  return (
    <div className={styles.editorContainer}>
      <header className={styles.header}>
        <div className={styles.breadcrumbs}>
          <span className={styles.breadcrumbItem}>{workspaceName}</span>
          <span className={styles.separator}>/</span>
          <span className={styles.breadcrumbItem}>{activePage.title || 'Untitled'}</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.presenceAvatars}>
            {onlineUsers.map(user => (
              <div 
                key={user.id} 
                className={styles.presenceAvatar}
                style={{ backgroundColor: user.color }}
                title={`${user.name} is editing`}
              >
                {user.name.charAt(0)}
              </div>
            ))}
          </div>
          <div className={styles.saveIndicator}>
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </div>
          <button className={styles.shareHeaderBtn} onClick={() => setShowShareModal(true)}>Share</button>
          <button className={styles.iconBtn} title="Page History"><Clock size={18} /></button>
          <button 
            className={`${styles.iconBtn} ${activePage.is_favorite ? styles.iconBtnActive : ''}`}
            onClick={() => updatePageAttribute({ is_favorite: !activePage.is_favorite })}
            title="Toggle Favorite"
          >
            <Star size={18} fill={activePage.is_favorite ? "currentColor" : "none"} />
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

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUploadCover} 
        style={{ display: 'none' }} 
        accept="image/jpeg,image/png,image/webp" 
      />

      {activePage.cover_image && (
        <div className={styles.coverImage}>
          <img src={activePage.cover_image} alt="Cover" />
          <div className={styles.coverControls}>
             <button className={styles.coverBtn} onClick={changeCoverImage}>Change cover</button>
             <button className={styles.coverBtn} onClick={() => fileInputRef.current?.click()}>Upload cover</button>
             <button className={styles.coverBtn} onClick={() => updatePageAttribute({ cover_image: null })}>Remove</button>
          </div>
        </div>
      )}

      <div className={`${styles.contentWrapper} ${!activePage.cover_image ? styles.noCoverContent : ''}`}>
        {!activePage.cover_image && (
          <div className={styles.addCoverWrapper} style={{ display: 'flex', gap: '8px' }}>
             <button className={styles.addCoverBtn} onClick={changeCoverImage}>
               <ImageIcon size={14} /> Add cover
             </button>
             <button className={styles.addCoverBtn} onClick={() => fileInputRef.current?.click()}>
               <ImageIcon size={14} /> Upload custom cover
             </button>
          </div>
        )}

        <div className={`${styles.pageIconWrapper} ${activePage.cover_image ? styles.hasCover : ''}`}>
           <input 
             className={styles.pageIconInput || styles.iconInput} 
             value={activePage.icon || "📄"} 
             onChange={(e) => updatePageAttribute({ icon: e.target.value })}
             maxLength={2}
           />
        </div>

        <input 
          className={styles.titleInput}
          value={activePage.title || ""}
          onChange={(e) => updatePageAttribute({ title: e.target.value })}
          placeholder="Untitled"
        />
        
        <div className={styles.viewToggles}>
          <button 
            className={`${styles.viewToggleBtn} ${activePage.type === 'editor' ? styles.activeView : ''}`}
            onClick={() => updatePageAttribute({ type: 'editor' })}
          >
            <FileText size={14} /> Document
          </button>
          <button 
            className={`${styles.viewToggleBtn} ${activePage.type === 'board' ? styles.activeView : ''}`}
            onClick={() => updatePageAttribute({ type: 'board' })}
          >
            <LayoutGrid size={14} /> Board
          </button>
        </div>

        <div className={styles.editorMain}>
          {activePage.type === 'board' ? (
            <KanbanBoard />
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
                          if (cmd.title === 'Ask AI') {
                            setShowAiMenu(true);
                          } else if (cmd.title === 'Database') {
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
                    >
                      B
                    </button>
                    <button 
                      className={`${styles.bubbleBtn} ${editor.isActive('italic') ? styles.bubbleBtnActive : ''}`}
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      style={{ fontStyle: 'italic' }}
                    >
                      i
                    </button>
                    <button 
                      className={`${styles.bubbleBtn} ${editor.isActive('strike') ? styles.bubbleBtnActive : ''}`}
                      onClick={() => editor.chain().focus().toggleStrike().run()}
                      style={{ textDecoration: 'line-through' }}
                    >
                      S
                    </button>
                    <button 
                      className={`${styles.bubbleBtn} ${editor.isActive('code') ? styles.bubbleBtnActive : ''}`}
                      onClick={() => editor.chain().focus().toggleCode().run()}
                      style={{ fontFamily: 'monospace' }}
                    >
                      {'<>'}
                    </button>
                    <button 
                      className={`${styles.bubbleBtn} ${editor.isActive('heading', { level: 1 }) ? styles.bubbleBtnActive : ''}`}
                      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                      style={{ fontWeight: 'bold' }}
                    >
                      H1
                    </button>
                    <button 
                      className={`${styles.bubbleBtn} ${editor.isActive('heading', { level: 2 }) ? styles.bubbleBtnActive : ''}`}
                      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                      style={{ fontWeight: 'bold' }}
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

              {showAiMenu && (
                <div className={styles.aiPopup}>
                  <form onSubmit={handleAiSubmit} className={styles.aiForm}>
                    <Sparkles size={16} className={styles.aiIcon} />
                    <input 
                      autoFocus
                      className={styles.aiInput}
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Ask AI to write anything..."
                      disabled={isLoading}
                    />
                  </form>
                  
                  {!completion && !isLoading && (
                    <div className={styles.aiOptionsMenu}>
                      <button className={styles.aiOptionBtn} onClick={() => handleAiAction('improve')}>Improve writing</button>
                      <button className={styles.aiOptionBtn} onClick={() => handleAiAction('fix_grammar')}>Fix grammar</button>
                      <button className={styles.aiOptionBtn} onClick={() => handleAiAction('summarize')}>Summarize</button>
                      <button className={styles.aiOptionBtn} onClick={() => handleAiAction('longer')}>Make longer</button>
                      <button className={styles.aiOptionBtn} onClick={() => handleAiAction('shorter')}>Make shorter</button>
                      <button className={styles.aiOptionBtn} onClick={() => handleAiAction('tone_professional')}>Professional tone</button>
                      <button className={styles.aiOptionBtn} onClick={() => handleAiAction('tone_casual')}>Casual tone</button>
                      <button className={styles.aiOptionBtn} onClick={() => handleAiAction('translate')}>Translate to French</button>
                    </div>
                  )}

                  {(completion || isLoading) && (
                    <div className={styles.aiResult}>
                      <div className={styles.aiText}>
                        {completion}
                        {isLoading && <span className={styles.cursor}></span>}
                      </div>
                      {!isLoading && (
                        <div className={styles.aiActions}>
                          <button className={styles.aiActionBtn} onClick={insertAiContent}>
                            <Check size={14} /> Insert
                          </button>
                          <button className={`${styles.aiActionBtn} ${styles.aiActionBtnDanger}`} onClick={discardAiContent}>
                            <X size={14} /> Discard
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
      
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
    </div>
  );
}
