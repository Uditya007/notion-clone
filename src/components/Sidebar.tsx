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
  Download,
  Home,
  LayoutDashboard,
  Bell,
  LogOut,
  User,
  MoreHorizontal,
  GripVertical
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
  const [userProfile, setUserProfile] = useState<{ name: string; email: string }>({ name: "User", email: "user@clearspace.app" });
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isAIBuilderOpen, setIsAIBuilderOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const { activePageId, setActivePage, setSearchOpen, setSettingsOpen, isAIPanelOpen, setAIPanelOpen } = useAppStore();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        if (data?.full_name || data?.email) {
          setUserProfile({
            name: data.full_name || "Clearspace User",
            email: data.email || "user@clearspace.app"
          });
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
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
  const favorites = pagesList.filter((p) => p.is_favorite);
  const trashCount = pagesList.filter((p) => p.is_deleted).length;

  const PageTreeItem = ({ page, level = 0 }: { page: any, level?: number }) => {
    const [expanded, setExpanded] = useState(true);
    const isActive = activePageId === page.id;

    return (
      <div className={styles.pageTreeWrapper} style={{ paddingLeft: level === 0 ? 0 : 12 }}>
        <div 
          className={`${styles.pageItem} ${isActive ? styles.pageActive : ''}`}
          onClick={() => handlePageSelect(page.id)}
        >
          {/* Drag Handle placeholder on hover */}
          <div className={styles.dragHandle}>
            <GripVertical size={12} />
          </div>

          <div 
            className={styles.chevronWrapper} 
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {page.children.length > 0 ? (
              expanded ? <ChevronDown size={12} className={styles.chevron} /> : <ChevronRight size={12} className={styles.chevron} />
            ) : (
              <div style={{ width: 12 }} />
            )}
          </div>
          <span className={styles.pageIcon}>{page.icon || "📄"}</span>
          <span className={styles.pageTitle}>{page.title || "Untitled"}</span>
          
          <div className={styles.pageActions}>
            <button className={styles.iconActionBtn} onClick={(e) => handleAddPage(e, page.id)} title="Add sub-page">
              <Plus size={12} />
            </button>
            <button className={styles.iconActionBtn} onClick={(e) => handleDeletePage(e, page.id)} title="Delete page">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {expanded && page.children.length > 0 && (
          <div className={styles.nestedPages} style={{ borderLeft: "1px solid var(--border)", marginLeft: "18px" }}>
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
        <button onClick={() => setIsCollapsed(false)} className={styles.expandBtn} title="Expand sidebar">
          <PanelLeft size={18} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.mobileOverlay} onClick={() => setIsCollapsed(true)} />
      <aside className={styles.sidebar}>
        {/* WORKSPACE HEADER */}
        <div className={styles.header}>
          <div className={styles.workspaceInfo} onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className={styles.workspaceIcon}>
              {workspaceName.charAt(0).toUpperCase()}
            </div>
            <div className={styles.workspaceTextContainer}>
              <span className={styles.workspaceName}>{workspaceName}</span>
              <span className={styles.workspaceSub}>Clearspace Workspace</span>
            </div>
            <ChevronDown size={14} className={styles.headerChevron} />
          </div>

          <button onClick={() => setIsCollapsed(true)} className={styles.collapseBtn} title="Collapse sidebar">
            <PanelLeftClose size={16} />
          </button>

          {/* Profile Menu Dropdown */}
          {showProfileMenu && (
            <div className={styles.profileMenu} ref={profileMenuRef}>
              <div className={styles.profileMenuHeader}>
                <span className={styles.profileMenuName}>{userProfile.name}</span>
                <span className={styles.profileMenuEmail}>{userProfile.email}</span>
              </div>
              <div className={styles.profileMenuDivider}></div>
              <button className={styles.profileMenuItem} onClick={() => { setSettingsOpen(true); setShowProfileMenu(false); }}>
                <Settings size={14} /> Settings
              </button>
              <button className={styles.profileMenuItem} onClick={handleSignOut} style={{ color: "var(--accent-red)" }}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>

        {/* SEARCH ROUNDED INPUT */}
        <div className={styles.searchContainer} onClick={() => setSearchOpen(true)}>
          <div className={styles.searchBar}>
            <Search size={14} />
            <span>Search pages...</span>
            <kbd className={styles.searchShortcut}>⌘K</kbd>
          </div>
        </div>

        {/* QUICK ACTIONS ROW */}
        <div className={styles.quickActionsRow}>
          <button className={styles.rowBtn} onClick={() => setIsAIBuilderOpen(true)} title="✦ AI Builder">
            <Sparkles size={16} />
          </button>
          <button className={styles.rowBtn} onClick={() => handlePageSelect('home')} title="📊 Command Center">
            <LayoutDashboard size={16} />
          </button>
          <button className={styles.rowBtn} onClick={() => handlePageSelect('inbox')} title="🔔 Inbox">
            <Bell size={16} />
          </button>
          <button className={styles.rowBtn} onClick={() => setSettingsOpen(true)} title="⚙️ Settings">
            <Settings size={16} />
          </button>
        </div>

        {/* NAVIGATION SECTION */}
        <div className={styles.navigationSection}>
          <span className={styles.sectionLabel}>Workspace</span>
          <div className={styles.navGroup}>
            <button 
              className={`${styles.navItem} ${activePageId === 'home' ? styles.navActive : ''}`} 
              onClick={() => handlePageSelect('home')}
            >
              <Home size={16} className={styles.navIconHome} />
              <span>Home</span>
            </button>

            <button 
              className={`${styles.navItem} ${activePageId === 'inbox' ? styles.navActive : ''}`} 
              onClick={() => handlePageSelect('inbox')}
            >
              <Inbox size={16} className={styles.navIconInbox} />
              <span>Inbox</span>
            </button>

            <button 
              className={`${styles.navItem} ${activePageId === 'tasks' ? styles.navActive : ''}`} 
              onClick={() => handlePageSelect('tasks')}
            >
              <CheckSquare size={16} className={styles.navIconTasks} />
              <span>My Tasks</span>
            </button>

            <button 
              className={`${styles.navItem} ${activePageId === 'calendar' ? styles.navActive : ''}`} 
              onClick={() => handlePageSelect('calendar')}
            >
              <Calendar size={16} className={styles.navIconCalendar} />
              <span>Calendar</span>
            </button>

            <button 
              className={`${styles.navItem} ${activePageId === 'automations' ? styles.navActive : ''}`} 
              onClick={() => handlePageSelect('automations')}
            >
              <Zap size={16} className={styles.navIconAutomations} />
              <span>Agents</span>
            </button>

            <button 
              className={`${styles.navItem} ${activePageId === 'templates' ? styles.navActive : ''}`} 
              onClick={() => handlePageSelect('templates')}
            >
              <Copy size={16} className={styles.navIconTemplates} />
              <span>Templates</span>
            </button>

            {/* Document Import trigger inside sidebar items */}
            <button className={styles.navItem} onClick={() => importFileInputRef.current?.click()}>
              <Download size={16} className={styles.navIconImport} style={{ transform: "rotate(180deg)" }} />
              <span>Import Document</span>
            </button>
            <input 
              type="file" 
              ref={importFileInputRef} 
              onChange={handleImportFileChange}
              accept=".md,.html,.htm"
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* PAGES SCROLL AREA */}
        <div className={styles.scrollArea}>
          {favorites.length > 0 && (
            <div className={styles.pagesSection}>
              <span className={styles.sectionLabel}>Favorites ★</span>
              <div className={styles.pageTree}>
                {favorites.map((page: any) => (
                  <PageTreeItem key={`fav-${page.id}`} page={{ ...page, children: [] }} />
                ))}
              </div>
            </div>
          )}

          <div className={styles.pagesSection}>
            <div className={styles.pagesSectionHeader}>
              <span className={styles.sectionLabel}>Pages</span>
              <button className={styles.addPageBtn} onClick={(e) => handleAddPage(e, null)} title="Create new page">
                <Plus size={14} />
              </button>
            </div>
            
            {/* Page tree or beginner state if empty */}
            {pagesList.length === 0 ? (
              <div className={styles.beginnerHelper}>
                <span className={styles.beginnerEmoji}>📝</span>
                <p className={styles.beginnerText}>Your pages will appear here</p>
                <button className={styles.beginnerAIBtn} onClick={() => setIsAIBuilderOpen(true)}>
                  ✦ Create with AI
                </button>
                <button className={styles.beginnerBlankBtn} onClick={(e) => handleAddPage(e, null)}>
                  📄 Blank page
                </button>
              </div>
            ) : (
              <div className={styles.pageTree}>
                {pageTreeRoots.map((page: any) => (
                  <PageTreeItem key={page.id} page={page} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM TRASH */}
        <div className={styles.footer}>
          <button 
            className={`${styles.navItem} ${activePageId === 'trash' ? styles.navActive : ''}`} 
            onClick={() => handlePageSelect('trash')}
          >
            <Trash2 size={16} className={styles.navIconTrash} />
            <span>Trash</span>
            {trashCount > 0 && (
              <span className={styles.trashBadge}>{trashCount}</span>
            )}
          </button>
        </div>
      </aside>
      <AIBuilder isOpen={isAIBuilderOpen} onClose={() => setIsAIBuilderOpen(false)} />
    </>
  );
}
