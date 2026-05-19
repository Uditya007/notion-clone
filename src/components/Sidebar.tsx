"use client";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Settings,
  Trash2,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Inbox,
  Calendar,
  CheckSquare,
  Zap,
  Copy,
  Sparkles
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSession } from "next-auth/react";

export default function Sidebar() {
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { pages, rootPageIds, activePageId, setActivePage, addPage, deletePage, setSearchOpen, setSettingsOpen, workspaceName, isAIPanelOpen, setAIPanelOpen } = useAppStore();

  const handleAddPage = (e: React.MouseEvent, parentId: string | null = null) => {
    e.stopPropagation();
    addPage(parentId);
  };

  const PageTreeItem = ({ pageId, level = 0 }: { pageId: string, level?: number }) => {
    const page = pages[pageId];
    const [expanded, setExpanded] = useState(true);
    const isActive = activePageId === pageId;
    
    if (!page) return null;

    return (
      <div className={styles.pageTreeWrapper} style={{ paddingLeft: level === 0 ? 0 : 16 }}>
        <div 
          className={`${styles.pageItem} ${isActive ? styles.active : ''}`}
          onClick={() => setActivePage(pageId)}
        >
          <div 
            className={styles.chevronWrapper} 
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {page.children.length > 0 ? (
              expanded ? <ChevronDown size={14} className={styles.chevron} /> : <ChevronRight size={14} className={styles.chevron} />
            ) : (
              <div style={{ width: 14 }} />
            )}
          </div>
          <span>{page.icon}</span>
          <span className={styles.pageTitle}>{page.title || "Untitled"}</span>
          
          <div className={styles.pageActions}>
            <button className={styles.iconActionBtn} onClick={(e) => handleAddPage(e, pageId)}>
              <Plus size={14} />
            </button>
            <button className={styles.iconActionBtn} onClick={(e) => { e.stopPropagation(); deletePage(pageId); }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {expanded && page.children.length > 0 && (
          <div className={styles.nestedPages}>
            {page.children.map(childId => (
              <PageTreeItem key={childId} pageId={childId} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className={styles.collapsedSidebar}>
        <button onClick={() => setIsCollapsed(false)} className={styles.expandBtn}>
          <PanelLeft size={20} />
        </button>
      </div>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.workspaceInfo}>
          <div className={styles.workspaceIcon}>{workspaceName.charAt(0).toUpperCase()}</div>
          <span className={styles.workspaceName}>{workspaceName}</span>
        </div>
        <button onClick={() => setIsCollapsed(true)} className={styles.collapseBtn}>
          <PanelLeftClose size={18} />
        </button>
      </div>

      <div className={styles.quickActions}>
        <button className={styles.actionItem} onClick={() => setSearchOpen(true)}>
          <Search size={16} />
          <span>Search</span>
          <kbd className={styles.shortcut}>⌘K</kbd>
        </button>
        <button className={`${styles.actionItem} ${isAIPanelOpen ? styles.actionItemActive : ''}`} onClick={() => setAIPanelOpen(!isAIPanelOpen)}>
          <Sparkles size={16} />
          <span>Clearspace AI</span>
        </button>
        <button className={styles.actionItem} onClick={() => setSettingsOpen(true)}>
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button className={`${styles.actionItem} ${activePageId === 'inbox' ? styles.actionItemActive : ''}`} onClick={() => setActivePage('inbox')}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Inbox size={16} />
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', backgroundColor: session ? '#10b981' : '#a1a1aa', border: '2px solid var(--bg-sidebar)' }} />
          </div>
          <span>Inbox</span>
        </button>
        <button className={`${styles.actionItem} ${activePageId === 'tasks' ? styles.actionItemActive : ''}`} onClick={() => setActivePage('tasks')}>
          <CheckSquare size={16} />
          <span>My Tasks</span>
        </button>
        <button className={`${styles.actionItem} ${activePageId === 'calendar' ? styles.actionItemActive : ''}`} onClick={() => setActivePage('calendar')}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} />
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', backgroundColor: session ? '#10b981' : '#a1a1aa', border: '2px solid var(--bg-sidebar)' }} />
          </div>
          <span>Google Calendar</span>
        </button>
        <button className={`${styles.actionItem} ${activePageId === 'automations' ? styles.actionItemActive : ''}`} onClick={() => setActivePage('automations')}>
          <Zap size={16} />
          <span>Automations</span>
        </button>
        <button className={`${styles.actionItem} ${activePageId === 'templates' ? styles.actionItemActive : ''}`} onClick={() => setActivePage('templates')}>
          <Copy size={16} />
          <span>Templates</span>
        </button>
      </div>

      <div className={styles.scrollArea}>
        {/* Favorites Section */}
        {Object.values(pages).some(p => p.isFavorite) && (
          <div className={styles.pagesSection}>
            <div className={styles.sectionHeader}>
              <span>Favorites</span>
            </div>
            <div className={styles.pageTree}>
              {Object.values(pages).filter(p => p.isFavorite).map(page => (
                <PageTreeItem key={`fav-${page.id}`} pageId={page.id} />
              ))}
            </div>
          </div>
        )}

        <div className={styles.pagesSection}>
          <div className={styles.sectionHeader}>
            <span>Private</span>
            <button className={styles.addPageBtn} onClick={(e) => handleAddPage(e, null)}>
              <Plus size={16} />
            </button>
          </div>
          
          <div className={styles.pageTree}>
            {rootPageIds.filter(id => !['inbox', 'calendar', 'tasks', 'automations', 'templates'].includes(id)).map(pageId => (
              <PageTreeItem key={pageId} pageId={pageId} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={`${styles.actionItem} ${activePageId === 'trash' ? styles.actionItemActive : ''}`} onClick={() => setActivePage('trash')}>
          <Trash2 size={16} />
          <span>Trash</span>
        </button>
      </div>
    </aside>
  );
}
