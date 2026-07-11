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
  Download,
  Home,
  LayoutDashboard,
  Bell,
  LogOut,
  User,
  MoreHorizontal,
  GripVertical,
  Sparkles,
  MessageSquare,
  Mic,
  SquarePen,
  Cpu
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useState, useEffect, useRef } from "react";
import { useAppStore, Page, Conversation } from "@/store/useAppStore";
import { supabase } from "@/lib/supabase/client";

type SidebarPage = Page & { parent_id?: string | null; is_favorite?: boolean; is_deleted?: boolean; };
type SidebarPageNode = Omit<SidebarPage, 'children'> & { children: SidebarPageNode[] };
type SidebarConversation = Conversation & { updated_at?: string };
import AIBuilder from "./AIBuilder";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [pagesList, setPagesList] = useState<SidebarPage[]>([]);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [userProfile, setUserProfile] = useState<{ name: string; email: string }>({ name: "User", email: "user@cora.app" });
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isAIBuilderOpen, setIsAIBuilderOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Conversations State
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);

  const getGroupedConversations = () => {
    const nowTime = new Date().getTime();
    const oneWeekAgo = nowTime - 7 * 86400000;
    const thirtyDaysAgo = nowTime - 30 * 86400000;

    const groups = {
      'Past week': [] as SidebarConversation[],
      'Past 30 days': [] as SidebarConversation[],
      'Older': [] as SidebarConversation[]
    };

    const sorted = [...conversations].sort((a: SidebarConversation, b: SidebarConversation) => {
      const dateA = new Date(a.updated_at || a.updatedAt || 0).getTime();
      const dateB = new Date(b.updated_at || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });

    sorted.forEach((conv: SidebarConversation) => {
      const time = new Date(conv.updated_at || conv.updatedAt || 0).getTime();
      if (time >= oneWeekAgo) {
        groups['Past week'].push(conv);
      } else if (time >= thirtyDaysAgo) {
        groups['Past 30 days'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });

    return groups;
  };

  const formatSidebarDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const time = date.getTime();
    const now = new Date();
    const diff = now.getTime() - time;

    if (diff < 3600000) {
      return `${Math.max(1, Math.floor(diff / 60000))}m`;
    }
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h`;
    }
    if (diff < 7 * 86400000) {
      const days = Math.floor(diff / 86400000);
      if (days <= 2) return `${days}d`;
      return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    }
    if (diff < 30 * 86400000) {
      const weeks = Math.floor(diff / (7 * 86400000));
      return `${weeks}w`;
    }
    return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
  };

  const handleChatTabClick = async () => {
    if (activeConversationId) return;
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const sorted = data.sort((a: SidebarConversation, b: SidebarConversation) => {
            const dateA = new Date(a.updated_at || a.updatedAt || 0).getTime();
            const dateB = new Date(b.updated_at || b.updatedAt || 0).getTime();
            return dateB - dateA;
          });
          setActiveConversation(sorted[0].id);
        } else {
          handleCreateConversation();
        }
      }
    } catch (err) {
      console.error('Error opening conversation:', err);
      handleCreateConversation();
    }
  };

  const handleMicTabClick = async () => {
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Meeting @${new Date().toLocaleDateString('default', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}`, icon: "🎙️", type: "editor" }),
      });
      if (res.ok) {
        const newPage = await res.json();
        setPagesList((prev) => [...prev, newPage]);
        setActivePage(newPage.id);
        addToast("🎙️ Created a new meeting note session!", "success");
      }
    } catch (err) {
      console.error("Error creating meeting note:", err);
    }
  };

  // Notification Alert States
  const [alerts, setAlerts] = useState<any>({ overdue: [], dueToday: [], dueTomorrow: [], totalAlerts: 0 });
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const handleOpenSidebar = () => {
      setIsMobileOpen(true);
    };
    window.addEventListener("openSidebar", handleOpenSidebar);
    return () => {
      window.removeEventListener("openSidebar", handleOpenSidebar);
    };
  }, []);
  
  const { activePageId, setActivePage, setSearchOpen, setSettingsOpen, addToast, isAIPanelOpen, setAIPanelOpen, activeConversationId, setActiveConversation } = useAppStore();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const hasShownToastRef = useRef(false);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error('Error fetching conversations in sidebar:', err);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
      });
      if (res.ok) {
        const newConv = await res.json();
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversation(newConv.id);
        addToast("✦ Created new AI Chat session", "success");
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/tasks/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
        
        // Show startup toast on first successful fetch if there are active alerts
        if (!hasShownToastRef.current && data.totalAlerts > 0) {
          const overdueCount = data.overdue.length;
          const todayCount = data.dueToday.length;
          let message = "⚠️ You have task deadlines requiring attention!";
          if (overdueCount > 0 && todayCount > 0) {
            message = `⚠️ Deadline alert: ${overdueCount} task${overdueCount > 1 ? 's are' : ' is'} overdue, and ${todayCount} ${todayCount > 1 ? 'are' : 'is'} due today!`;
          } else if (overdueCount > 0) {
            message = `⚠️ Overdue tasks: ${overdueCount} task${overdueCount > 1 ? 's require' : ' requires'} immediate completion!`;
          } else if (todayCount > 0) {
            message = `💡 Task reminder: You have ${todayCount} task${todayCount > 1 ? 's' : ''} due today.`;
          }
          addToast(message, "warning", 6000);
          hasShownToastRef.current = true;
        }
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  useEffect(() => {
    fetchPages();
    fetchProfile();
    fetchGoogleStatus();
    fetchAlerts();
    fetchConversations();

    const pagesChannel = supabase
      .channel('realtime:pages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        fetchPages();
      })
      .subscribe();

    const tasksChannel = supabase
      .channel('realtime:sidebar_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchAlerts();
      })
      .subscribe();

    const conversationsChannel = supabase
      .channel('realtime:sidebar_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pagesChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Popover Task Item Component
  const PopoverTaskItem = ({ task, badgeClass, badgeText }: { task: any; badgeClass: string; badgeText: string }) => {
    const [completing, setCompleting] = useState(false);
    
    const handleComplete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setCompleting(true);
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        });
        if (res.ok) {
          addToast(`✦ Completed task: "${task.title}"`, "success");
        }
      } catch (err) {
        console.error("Error completing task from popover:", err);
      } finally {
        setCompleting(false);
      }
    };

    return (
      <div 
        className={styles.popoverTaskItem} 
        onClick={() => { setActivePage('tasks'); setShowNotifications(false); }}
      >
        <button 
          className={`${styles.popoverCheckbox} ${completing ? styles.checkboxSpin : ''}`} 
          onClick={handleComplete}
          title="Mark complete"
        />
        <div className={styles.popoverTaskMeta}>
          <span className={styles.popoverTaskTitle}>{task.title}</span>
          <span className={`${styles.popoverTaskBadge} ${badgeClass}`}>{badgeText}</span>
        </div>
      </div>
    );
  };

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
            name: data.full_name || "Cora User",
            email: data.email || "user@cora.app"
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
    setIsMobileOpen(false);
    if (window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const buildPageTree = (): SidebarPageNode[] => {
    const pageMap = new Map<string, SidebarPageNode>();
    pagesList.forEach((p) => pageMap.set(p.id, { ...p, children: [] }));
    const roots: SidebarPageNode[] = [];

    pagesList.forEach((p) => {
      const mapped = pageMap.get(p.id)!;
      if (p.parent_id && pageMap.has(p.parent_id)) {
        pageMap.get(p.parent_id)!.children.push(mapped);
      } else {
        roots.push(mapped);
      }
    });

    return roots;
  };

  const pageTreeRoots = buildPageTree();
  const favorites = pagesList.filter((p) => p.is_favorite);
  const trashCount = pagesList.filter((p) => p.is_deleted).length;

  const PageTreeItem = ({ page, level = 0 }: { page: SidebarPageNode, level?: number }) => {
    const [expanded, setExpanded] = useState(true);
    const isActive = activePageId === page.id;

    return (
      <div className={styles.pageTreeWrapper}>
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
          <div className={styles.nestedPages}>
            {page.children.map((child: SidebarPageNode) => (
              <PageTreeItem key={child.id} page={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed && (!isClient || (typeof window !== "undefined" && window.innerWidth > 768))) {
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
      <div 
        className={`${styles.mobileOverlay} ${isMobileOpen ? styles.mobileOverlayVisible : ""}`} 
        onClick={() => setIsMobileOpen(false)} 
      />
      <aside className={`${styles.sidebar} ${isMobileOpen ? styles.sidebarOpen : ""}`}>
        {/* WORKSPACE HEADER */}
        <div className={styles.header}>
          <div className={styles.workspaceInfo} onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className={styles.workspaceIcon}>
              {workspaceName.charAt(0).toUpperCase()}
            </div>
            <div className={styles.workspaceTextContainer}>
              <span className={styles.workspaceName}>{workspaceName}</span>
            </div>
            <ChevronDown size={14} className={styles.headerChevron} />
          </div>

          <button onClick={() => { setIsCollapsed(true); setIsMobileOpen(false); }} className={styles.collapseBtn} title="Collapse sidebar">
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
              <button className={styles.profileMenuItem} onClick={handleSignOut} style={{ color: "#dc2626" }}>
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>

        {/* TOP TAB BAR */}
        <div className={styles.topTabBar}>
          {activeConversationId === null ? (
            <button className={styles.topTabActive} onClick={() => handlePageSelect('home')}>
              <Home size={15} />
              <span>Home</span>
            </button>
          ) : (
            <button className={styles.topTabButton} onClick={() => handlePageSelect('home')} title="Home">
              <Home size={16} />
            </button>
          )}

          {activeConversationId !== null ? (
            <button className={styles.topTabActive} title="AI Chat">
              <MessageSquare size={15} />
              <span>Chat</span>
            </button>
          ) : (
            <button className={styles.topTabButton} onClick={handleChatTabClick} title="AI Chat">
              <MessageSquare size={16} />
            </button>
          )}

          <button className={styles.topTabButton} onClick={handleMicTabClick} title="New Meeting Note (Voice)">
            <Mic size={16} />
          </button>

          <button 
            className={`${styles.topTabButton} ${activePageId === 'inbox' ? styles.topTabButtonActive : ''}`} 
            onClick={() => handlePageSelect('inbox')} 
            title="Inbox"
          >
            <Inbox size={16} />
          </button>

          <button className={styles.topTabButton} onClick={() => setSearchOpen(true)} title="Search (⌘K)">
            <Search size={16} />
          </button>
        </div>

        {activeConversationId !== null ? (
          /* ==================== AI CHAT MODE SIDEBAR ==================== */
          <>
            {/* AGENTS ROW */}
            <div className={styles.agentsSection}>
              <span className={styles.sectionLabel}>Notion AI</span>
              <div className={styles.agentsRow}>
                <div className={`${styles.agentCard} ${styles.agentCardActive}`}>
                  <div className={styles.agentCircle}>
                    <img src="/notion-ai-avatar.png" alt="Notion AI" className={styles.agentAvatarImg} />
                  </div>
                  <span className={styles.agentLabel}>Notion AI</span>
                </div>
                
                <div className={styles.agentCard} onClick={() => setIsAIBuilderOpen(true)}>
                  <div className={`${styles.agentCircle} ${styles.newAgentCircle}`}>
                    <Plus size={20} />
                  </div>
                  <span className={styles.agentLabel}>New agent</span>
                </div>
              </div>
            </div>

            {/* GROUPED CHAT HISTORY FEED */}
            <div className={styles.chatHistoryFeed}>
              {Object.entries(getGroupedConversations()).map(([label, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={label} className={styles.historyGroup}>
                    <span className={styles.sectionLabel}>{label}</span>
                    <div className={styles.historyList}>
                      {items.map((conv) => {
                        const isActive = activeConversationId === conv.id;
                        return (
                          <div 
                            key={conv.id}
                            className={`${styles.chatHistoryItem} ${isActive ? styles.chatHistoryItemActive : ''}`}
                            onClick={() => setActiveConversation(conv.id)}
                          >
                            <MessageSquare size={14} className={styles.chatHistoryIcon} />
                            <span className={styles.chatHistoryTitle}>{conv.title || 'New Chat'}</span>
                            <span className={styles.chatHistoryDate}>
                              {formatSidebarDate(conv.updated_at || conv.updatedAt || conv.createdAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CHAT FOOTER */}
            <div className={styles.chatFooter}>
              <button className={styles.chatNewChatBtn} onClick={handleCreateConversation}>
                <Plus size={14} />
                <span>New chat</span>
              </button>
              <button className={styles.chatComposeBtn} onClick={handleCreateConversation} title="New chat">
                <SquarePen size={15} />
              </button>
            </div>
          </>
        ) : (
          /* ==================== WORKSPACE MODE SIDEBAR ==================== */
          <>
            {/* QUICK ACTIONS ROW (ONLY SHOWN IN NORMAL MODE TO RETAIN NOTIFICATIONS BELL IF NEEDED) */}
            <div className={styles.bellRowNormal}>
              <div className={styles.bellContainer} ref={notificationsRef}>
                <button 
                  className={`${styles.bellBtnNormal} ${alerts.totalAlerts > 0 ? styles.bellActive : ''} ${showNotifications ? styles.bellBtnNormalActive : ''}`} 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  title="Notifications"
                >
                  <Bell size={14} style={{ marginRight: 6 }} />
                  <span>Tasks Alerts</span>
                  {alerts.totalAlerts > 0 && (
                    <span className={styles.bellBadgeCount}>{alerts.totalAlerts}</span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className={styles.notificationsPopover}>
                    <div className={styles.popoverHeader}>
                      <h4>Task Deadlines</h4>
                      {alerts.totalAlerts === 0 ? (
                        <span className={styles.allClearBadge}>✦ All Clear</span>
                      ) : (
                        <span className={styles.alertCountBadge}>{alerts.totalAlerts} Alert{alerts.totalAlerts > 1 ? 's' : ''}</span>
                      )}
                    </div>
                    
                    <div className={styles.popoverScrollArea}>
                      {alerts.totalAlerts === 0 ? (
                        <div className={styles.popoverEmptyState}>
                          <span className={styles.popoverSparkles}>✦</span>
                          <p>No upcoming task deadlines!</p>
                          <span>Keep up the amazing work!</span>
                        </div>
                      ) : (
                        <>
                          {alerts.overdue.length > 0 && (
                            <div className={styles.alertSection}>
                              <div className={styles.popoverSectionTitle}>Overdue</div>
                              {alerts.overdue.map((task: any) => (
                                <PopoverTaskItem 
                                  key={`overdue-${task.id}`} 
                                  task={task} 
                                  badgeClass={styles.overdueBadge} 
                                  badgeText="Overdue" 
                                />
                              ))}
                            </div>
                          )}
                          
                          {alerts.dueToday.length > 0 && (
                            <div className={styles.alertSection}>
                              <div className={styles.popoverSectionTitle}>Due Today</div>
                              {alerts.dueToday.map((task: any) => (
                                <PopoverTaskItem 
                                  key={`today-${task.id}`} 
                                  task={task} 
                                  badgeClass={styles.todayBadge} 
                                  badgeText="Today" 
                                />
                              ))}
                            </div>
                          )}
                          
                          {alerts.dueTomorrow.length > 0 && (
                            <div className={styles.alertSection}>
                              <div className={styles.popoverSectionTitle}>Due Tomorrow</div>
                              {alerts.dueTomorrow.map((task: any) => (
                                <PopoverTaskItem 
                                  key={`tomorrow-${task.id}`} 
                                  task={task} 
                                  badgeClass={styles.tomorrowBadge} 
                                  badgeText="Tomorrow" 
                                />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {alerts.totalAlerts > 0 && (
                      <button 
                        className={styles.whatsappAlertBtn} 
                        onClick={() => {
                          const phone = window.prompt("Enter WhatsApp number with country code e.g. +919876543210");
                          if (!phone) return;
                          fetch("/api/whatsapp/send-alert", { 
                            method: "POST", 
                            headers: {"Content-Type":"application/json"}, 
                            body: JSON.stringify({ phone, overdue: alerts.overdue, dueToday: alerts.dueToday }) 
                          }).then(res => {
                            if (res.ok) addToast("📱 Task alerts sent to WhatsApp!", "success");
                            else addToast("Failed to send WhatsApp alert", "error");
                          }).catch(() => addToast("Failed to send WhatsApp alert", "error"));
                        }}
                      >
                        📱 Send to WhatsApp
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* NAVIGATION SECTION */}
            <div>
              <span className={styles.sectionLabel}>Workspace</span>
              <div className={styles.navGroup}>
                <button 
                  className={`${styles.navItem} ${activePageId === 'home' ? styles.navActive : ''}`} 
                  onClick={() => handlePageSelect('home')}
                >
                  <Home size={15} className={styles.navIconHome} />
                  <span>Home</span>
                </button>

                <button 
                  className={`${styles.navItem} ${activePageId === 'inbox' ? styles.navActive : ''}`} 
                  onClick={() => handlePageSelect('inbox')}
                >
                  <Inbox size={15} className={styles.navIconInbox} />
                  <span>Inbox</span>
                </button>

                <button 
                  className={`${styles.navItem}`} 
                  onClick={handleChatTabClick}
                >
                  <Sparkles size={15} className={styles.navIconAI} style={{ color: '#eab308' }} />
                  <span>AI Chat</span>
                </button>

                <button 
                  className={`${styles.navItem} ${activePageId === 'tasks' ? styles.navActive : ''}`} 
                  onClick={() => handlePageSelect('tasks')}
                >
                  <CheckSquare size={15} className={styles.navIconTasks} />
                  <span>My Tasks</span>
                </button>

                <button 
                  className={`${styles.navItem} ${activePageId === 'calendar' ? styles.navActive : ''}`} 
                  onClick={() => handlePageSelect('calendar')}
                >
                  <Calendar size={15} className={styles.navIconCalendar} />
                  <span>Calendar</span>
                </button>

                <button 
                  className={`${styles.navItem} ${activePageId === 'automations' ? styles.navActive : ''}`} 
                  onClick={() => handlePageSelect('automations')}
                >
                  <Zap size={15} className={styles.navIconAutomations} />
                  <span>Agents</span>
                </button>

                <button 
                  className={`${styles.navItem} ${activePageId === 'templates' ? styles.navActive : ''}`} 
                  onClick={() => handlePageSelect('templates')}
                >
                  <Copy size={15} className={styles.navIconTemplates} />
                  <span>Templates</span>
                </button>



                <button 
                  className={`${styles.navItem} ${activePageId === 'whatsapp' ? styles.navActive : ''}`} 
                  onClick={() => handlePageSelect('whatsapp')}
                >
                  <MessageSquare size={15} className={styles.navIconWhatsApp} style={{ color: '#25D366' }} />
                  <span>WhatsApp</span>
                </button>


                {/* Document Import trigger inside sidebar items */}
                <button className={styles.navItem} onClick={() => importFileInputRef.current?.click()}>
                  <Download size={15} className={styles.navIconImport} style={{ transform: "rotate(180deg)" }} />
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
                <div>
                  <span className={styles.sectionLabel}>Favorites</span>
                  <div className={styles.pageTree}>
                    {favorites.map((page: any) => (
                      <PageTreeItem key={`fav-${page.id}`} page={{ ...page, children: [] }} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className={styles.pagesSectionHeader}>
                  <span className={styles.sectionLabel}>Today</span>
                  <button className={styles.addPageBtn} onClick={(e) => handleAddPage(e, null)} title="Create new page">
                    <Plus size={14} />
                  </button>
                </div>

                {/* AI MEETING NOTE INSTANT BUTTON (MATCHING DESKTOP SCREENSHOT) */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('create-new-meeting-note'))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    margin: '4px 0 12px 0',
                    background: 'transparent',
                    border: '1px solid #3b82f6',
                    borderRadius: '8px',
                    color: '#60a5fa',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>+</span>
                  <span>New AI meeting note</span>
                </button>

                
                {/* Page tree or beginner state if empty */}
                {pagesList.length === 0 ? (
                  <div className={styles.beginnerHelper}>
                    <span className={styles.beginnerEmoji}>📄</span>
                    <p className={styles.beginnerText}>No pages yet</p>
                    <button className={styles.beginnerAIBtn} onClick={() => setIsAIBuilderOpen(true)}>
                      + Create with AI
                    </button>
                    <button className={styles.beginnerBlankBtn} onClick={(e) => handleAddPage(e, null)}>
                      + Blank page
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

            {/* BOTTOM TRASH & USER SECTION */}
            <div className={styles.footer}>
              <button 
                className={`${styles.navItem} ${activePageId === 'trash' ? styles.navActive : ''}`} 
                onClick={() => handlePageSelect('trash')}
                style={{ margin: 0 }}
              >
                <Trash2 size={15} className={styles.navIconTrash} />
                <span>Trash</span>
                {trashCount > 0 && (
                  <span className={styles.trashBadge}>{trashCount}</span>
                )}
              </button>

              {/* User Profile bottom row */}
              <div className={styles.userRow} onClick={() => setSettingsOpen(true)}>
                <div className={styles.userAvatar}>
                  {userProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.userMeta}>
                  <span className={styles.userName}>{userProfile.name}</span>
                  <span className={styles.userEmail}>{userProfile.email}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
      <AIBuilder isOpen={isAIBuilderOpen} onClose={() => setIsAIBuilderOpen(false)} />
    </>
  );
}
