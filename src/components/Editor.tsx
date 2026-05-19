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
import { useEffect, useState } from "react";
import { MoreHorizontal, Star, Clock, Sparkles, Check, X, LayoutGrid, FileText, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import KanbanBoard from "./KanbanBoard";
import CalendarView from "./CalendarView";
import InboxView from "./InboxView";
import TasksView from "./TasksView";
import AutomationsView from "./AutomationsView";
import TemplatesView from "./TemplatesView";
import ShareModal from "./ShareModal";
import { useCompletion } from '@ai-sdk/react';

export default function Editor() {
  const [isMounted, setIsMounted] = useState(false);
  const { pages, activePageId, updatePageContent, updatePageTitle, updatePageIcon, updatePageType, toggleFavorite, deletePage } = useAppStore();
  
  const activePage = activePageId ? pages[activePageId] : null;

  // AI Completion Hook
  const { complete, completion, input, handleInputChange, handleSubmit, isLoading, setCompletion, setInput } = useCompletion({
    api: '/api/generate',
  });

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);

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
      if (activePageId && activePage?.type === 'editor') {
        setSaveStatus('saving');
        updatePageContent(activePageId, editor.getHTML());
        
        if (saveTimeoutId) clearTimeout(saveTimeoutId);
        const timeout = setTimeout(() => setSaveStatus('saved'), 1000);
        setSaveTimeoutId(timeout);
        
        // Detect /ai slash command
        const text = editor.getText();
        if (text.endsWith('/ai')) {
          // Remove the /ai text
          const { state, view } = editor;
          const { tr } = state;
          view.dispatch(tr.delete(state.selection.from - 3, state.selection.from));
          
          // Open AI Menu
          setShowAiMenu(true);
        }
      }
    }
  })

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync editor content when the active page changes
  useEffect(() => {
    if (editor && activePage && activePage.type === 'editor' && editor.getHTML() !== activePage.content) {
      editor.commands.setContent(activePage.content);
    }
  }, [activePageId, editor, activePage]);

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
      // Split by paragraphs and insert
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
  if (!activePage) return null;

  if (activePage.type === 'calendar') return <CalendarView />;
  if (activePage.type === 'inbox') return <InboxView />;
  if (activePage.type === 'tasks') return <TasksView />;
  if (activePage.type === 'automations') return <AutomationsView />;
  if (activePage.type === 'templates') return <TemplatesView />;

  // Mock online presence data
  const onlineUsers = [
    { id: 1, name: 'Alex', color: '#ff4d4d' },
    { id: 2, name: 'Sarah', color: '#4da6ff' },
  ];

  return (
    <div className={styles.editorContainer}>
      <header className={styles.header}>
        <div className={styles.breadcrumbs}>
          <span className={styles.breadcrumbItem}>Uditya's Notion</span>
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
            className={`${styles.iconBtn} ${activePage.isFavorite ? styles.iconBtnActive : ''}`}
            onClick={() => toggleFavorite(activePageId!)}
            title="Toggle Favorite"
          >
            <Star size={18} fill={activePage.isFavorite ? "currentColor" : "none"} />
          </button>
          <button 
            className={styles.iconBtn} 
            title="Delete Page"
            onClick={() => {
              if (confirm('Are you sure you want to delete this page?')) {
                deletePage(activePageId!);
              }
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <div className={styles.coverImage}>
        <img src={activePage.coverImage || "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=2275&auto=format&fit=crop"} alt="Cover" />
        <div className={styles.pageIconWrapper}>
           <input 
             className={styles.iconInput} 
             value={activePage.icon} 
             onChange={(e) => updatePageIcon(activePageId!, e.target.value)}
             maxLength={2}
           />
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <input 
          className={styles.titleInput}
          value={activePage.title}
          onChange={(e) => updatePageTitle(activePageId!, e.target.value)}
          placeholder="Untitled"
        />
        
        <div className={styles.viewToggles}>
          <button 
            className={`${styles.viewToggleBtn} ${activePage.type === 'editor' ? styles.activeView : ''}`}
            onClick={() => updatePageType(activePageId!, 'editor')}
          >
            <FileText size={14} /> Document
          </button>
          <button 
            className={`${styles.viewToggleBtn} ${activePage.type === 'board' ? styles.activeView : ''}`}
            onClick={() => updatePageType(activePageId!, 'board')}
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
                <FloatingMenu editor={editor}>
                  <button 
                    className={styles.aiFloatingBtn}
                    onClick={() => setShowAiMenu(!showAiMenu)}
                  >
                    <Sparkles size={16} /> Ask AI
                  </button>
                </FloatingMenu>
              )}

              {editor && (
                <BubbleMenu editor={editor}>
                  <div className={styles.bubbleMenu}>
                    <button 
                      className={styles.bubbleBtn}
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      style={{ fontWeight: 'bold' }}
                    >
                      B
                    </button>
                    <button 
                      className={styles.bubbleBtn}
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      style={{ fontStyle: 'italic' }}
                    >
                      i
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
            </>
          )}
        </div>
      </div>
      
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
    </div>
  );
}
