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
  Sparkles,
  Download
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { supabase } from "@/lib/supabase/client";
import AIBuilder from "./AIBuilder";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pagesList, setPagesList] = useState<any[]>([]);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isAIBuilderOpen, setIsAIBuilderOpen] = useState(false);
  
  const { activePageId, setActivePage, setSearchOpen, setSettingsOpen, isAIPanelOpen, setAIPanelOpen } = useAppStore();
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPages();
    fetchProfile();
    fetchGoogleStatus();

    const channel = supabase
      .channel('realtime:pages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        fetchPages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/pages");
      if (res.ok) {
        const data = await res.json();
        setPagesList(data);
      }
    } catch (err) {
      console.error("Error fetching pages:", err);
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
      console.error("Error fetching profile:", err);
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch("/api/google/connect");
      if (res.ok) {
        const data = await res.json();
        setIsGoogleConnected(data.connected);
      }
    } catch (err) {
      console.error("Error fetching Google status:", err);
    }
  };

  const handleAddPage = async (e: React.MouseEvent, parentId: string | null = null) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", parentId, icon: "📄", type: "editor" }),
      });
      if (res.ok) {
        const newPage = await res.json();
        setPagesList((prev) => [...prev, newPage]);
        setActivePage(newPage.id);
      }
    } catch (err) {
      console.error("Error adding page:", err);
    }
  };

  const handleDeletePage = async (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPages();
        if (activePageId === pageId) {
          setActivePage(null);
        }
      }
    } catch (err) {
      console.error("Error deleting page:", err);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch("/api/pages/import", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newPage = await res.json();
        alert(`Successfully imported "${newPage.title}" into Cora!`);
        fetchPages();
        setActivePage(newPage.id);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to import file.");
      }
    } catch (err) {
      console.error("Import error:", err);
      alert("An error occurred during import.");
    } finally {
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    }
  };

  const handlePageSelect = (pageId: string) => {
    setActivePage(pageId);
    if (window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  };

  const buildPageTree = () => {
    const pageMap = new Map();
    pagesList.forEach((p) => pageMap.set(p.id, { ...p, children: [] }));
    const roots: any[] = [];

    pagesList.forEach((p) => {
      const mapped = pageMap.get(p.id);
      if (p.parent_id && pageMap.has(p.parent_id)) {
        pageMap.get(p.parent_id).children.push(mapped);
      } else {
        roots.push(mapped);
      }
    });

    return roots;
  };

  const pageTreeRoots = buildPageTree();

  const PageTreeItem = ({ page, level = 0 }: { page: any, level?: number }) => {
    const [expanded, setExpanded] = useState(true);
    const isActive = activePageId === page.id;

    return (
      <div className={styles.pageTreeWrapper} style={{ paddingLeft: level === 0 ? 0 : 16 }}>
        <div 
          className={`${styles.pageItem} ${isActive ? styles.active : ''}`}
          onClick={() => handlePageSelect(page.id)}
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
            <button className={styles.iconActionBtn} onClick={(e) => handleAddPage(e, page.id)}>
              <Plus size={14} />
            </button>
            <button className={styles.iconActionBtn} onClick={(e) => handleDeletePage(e, page.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {expanded && page.children.length > 0 && (
          <div className={styles.nestedPages}>
            {page.children.map((child: any) => (
              <PageTreeItem key={child.id} page={child} level={level + 1} />
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

  const favorites = pagesList.filter((p) => p.is_favorite);

  return (
    <>
      <div className={styles.mobileOverlay} onClick={() => setIsCollapsed(true)} />
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
          <button className={`${styles.actionItem} ${isAIPanelOpen ? styles.actionItemActive : ''}`} onClick={() => {
            setAIPanelOpen(!isAIPanelOpen);
            if (window.innerWidth <= 768) setIsCollapsed(true);
          }}>
            <Sparkles size={16} />
            <span>Cora AI</span>
          </button>
          <button className={styles.actionItem} onClick={() => setIsAIBuilderOpen(true)}>
            <Sparkles size={16} style={{ color: '#a855f7' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>✦ AI Workspace Builder</span>
          </button>
          
          {/* Import file actions */}
          <button className={styles.actionItem} onClick={() => importFileInputRef.current?.click()}>
            <Download size={16} style={{ transform: 'rotate(180deg)', color: '#3b82f6' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>✦ Import Document</span>
          </button>
          <input 
            type="file" 
            ref={importFileInputRef} 
            onChange={handleImportFileChange}
            accept=".md,.html,.htm"
            style={{ display: 'none' }}
          />

          <button className={styles.actionItem} onClick={() => setSettingsOpen(true)}>
            <Settings size={16} />
            <span>Settings</span>
          </button>
          <button className={`${styles.actionItem} ${activePageId === 'inbox' ? styles.actionItemActive : ''}`} onClick={() => handlePageSelect('inbox')}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Inbox size={16} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', backgroundColor: isGoogleConnected ? '#10b981' : '#a1a1aa', border: '2px solid var(--bg-sidebar)' }} />
            </div>
            <span>Inbox</span>
          </button>
          <button className={`${styles.actionItem} ${activePageId === 'tasks' ? styles.actionItemActive : ''}`} onClick={() => handlePageSelect('tasks')}>
            <CheckSquare size={16} />
            <span>My Tasks</span>
          </button>
          <button className={`${styles.actionItem} ${activePageId === 'calendar' ? styles.actionItemActive : ''}`} onClick={() => handlePageSelect('calendar')}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={16} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', backgroundColor: isGoogleConnected ? '#10b981' : '#a1a1aa', border: '2px solid var(--bg-sidebar)' }} />
            </div>
            <span>Google Calendar</span>
          </button>
          <button className={`${styles.actionItem} ${activePageId === 'automations' ? styles.actionItemActive : ''}`} onClick={() => handlePageSelect('automations')}>
            <Zap size={16} />
            <span>Automations</span>
          </button>
          <button className={`${styles.actionItem} ${activePageId === 'templates' ? styles.actionItemActive : ''}`} onClick={() => handlePageSelect('templates')}>
            <Copy size={16} />
            <span>Templates</span>
          </button>
        </div>

        <div className={styles.scrollArea}>
          {favorites.length > 0 && (
            <div className={styles.pagesSection}>
              <div className={styles.sectionHeader}>
                <span>Favorites</span>
              </div>
              <div className={styles.pageTree}>
                {favorites.map((page: any) => (
                  <PageTreeItem key={`fav-${page.id}`} page={{ ...page, children: [] }} />
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
              {pageTreeRoots.map((page: any) => (
                <PageTreeItem key={page.id} page={page} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={`${styles.actionItem} ${activePageId === 'trash' ? styles.actionItemActive : ''}`} onClick={() => handlePageSelect('trash')}>
            <Trash2 size={16} />
            <span>Trash</span>
          </button>
        </div>
      </aside>
      <AIBuilder isOpen={isAIBuilderOpen} onClose={() => setIsAIBuilderOpen(false)} />
    </>
  );
}
