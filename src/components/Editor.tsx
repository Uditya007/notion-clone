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
import { MoreHorizontal, Star, Clock, Sparkles, Check, X, LayoutGrid, FileText, Trash2, Image as ImageIcon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import KanbanBoard from "./KanbanBoard";
import CalendarView from "./CalendarView";
import InboxView from "./InboxView";
import TasksView from "./TasksView";
import AutomationsView from "./AutomationsView";
import TemplatesView from "./TemplatesView";
import ShareModal from "./ShareModal";
import TrashView from "./TrashView";
import { useCompletion } from '@ai-sdk/react';

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
  { title: 'Ask AI', icon: '✨', action: () => {} },
];

export default function Editor() {
  const [isMounted, setIsMounted] = useState(false);
  const { pages, activePageId, updatePageContent, updatePageTitle, updatePageIcon, updatePageType, toggleFavorite, deletePage, updatePageCoverImage, workspaceName } = useAppStore();
  
  const activePage = activePageId ? pages[activePageId] : null;

  // AI Completion Hook
  const { complete, completion, input, handleInputChange, handleSubmit, isLoading, setCompletion, setInput } = useCompletion({
    api: '/api/generate',
  });

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  const COVER_IMAGES = [
    "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=2275&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506744626753-dba37c25a1f1?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473081556163-2a17de81fc97?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=2475&auto=format&fit=crop",
  ];

  const changeCoverImage = () => {
    if (!activePageId) return;
    const currentIndex = COVER_IMAGES.indexOf(activePage?.coverImage || "");
    const nextIndex = (currentIndex + 1) % COVER_IMAGES.length;
    updatePageCoverImage(activePageId, COVER_IMAGES[nextIndex]);
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
  if (activePage.type === 'trash') return <TrashView />;

  // Mock online presence data
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

      {activePage.coverImage && (
        <div className={styles.coverImage}>
          <img src={activePage.coverImage} alt="Cover" />
          <div className={styles.coverControls}>
             <button className={styles.coverBtn} onClick={changeCoverImage}>Change cover</button>
             <button className={styles.coverBtn} onClick={() => updatePageCoverImage(activePageId!, null)}>Remove</button>
          </div>
        </div>
      )}

      <div className={`${styles.contentWrapper} ${!activePage.coverImage ? styles.noCoverContent : ''}`}>
        {!activePage.coverImage && (
          <div className={styles.addCoverWrapper}>
             <button className={styles.addCoverBtn} onClick={changeCoverImage}>
               <ImageIcon size={14} /> Add cover
             </button>
          </div>
        )}

        <div className={`${styles.pageIconWrapper} ${activePage.coverImage ? styles.hasCover : ''}`}>
           <input 
             className={styles.iconInput} 
             value={activePage.icon} 
             onChange={(e) => updatePageIcon(activePageId!, e.target.value)}
             maxLength={2}
           />
        </div>

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
            </>
          )}
        </div>
      </div>
      
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}
    </div>
  );
}
