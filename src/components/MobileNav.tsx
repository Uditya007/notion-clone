"use client";

import React, { useState, useEffect } from "react";
import { 
  Home, 
  FileText, 
  Sparkles, 
  CheckSquare, 
  MoreHorizontal, 
  Calendar, 
  Zap, 
  Settings, 
  Search, 
  Trash2, 
  Inbox, 
  Copy,
  X,
  MessageSquare
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import styles from "./MobileNav.module.css";

export default function MobileNav() {
  const { 
    activePageId, 
    setActivePage, 
    isAIPanelOpen, 
    setAIPanelOpen, 
    setSearchOpen, 
    setSettingsOpen,
    activeConversationId,
    setActiveConversation
  } = useAppStore();

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Close the sheet when navigation occurs
  useEffect(() => {
    setIsSheetOpen(false);
  }, [activePageId, isAIPanelOpen]);

  const handleHomeClick = () => {
    setActivePage(null); // defaults to CommandCenter dashboard
  };

  const handlePagesClick = () => {
    // Dispatch custom event to trigger Sidebar mobile drawer open
    window.dispatchEvent(new CustomEvent("openSidebar"));
  };

  const handleAIClick = async () => {
    // Open the AI panel drawer
    setAIPanelOpen(!isAIPanelOpen);
    
    // Auto-create or select last conversation if not currently in one
    if (!activeConversationId) {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            // Sort by updated time descending
            const sorted = data.sort((a: any, b: any) => {
              const dateA = new Date(a.updated_at || a.updatedAt || 0).getTime();
              const dateB = new Date(b.updated_at || b.updatedAt || 0).getTime();
              return dateB - dateA;
            });
            setActiveConversation(sorted[0].id);
          } else {
            const createRes = await fetch("/api/conversations", { method: "POST" });
            if (createRes.ok) {
              const newConv = await createRes.json();
              setActiveConversation(newConv.id);
            }
          }
        }
      } catch (err) {
        console.error("Error toggling AI conversation from MobileNav:", err);
      }
    }
  };

  const handleTasksClick = () => {
    setActivePage("tasks");
  };

  const isHomeActive = activePageId === null && !isAIPanelOpen;
  const isTasksActive = activePageId === "tasks" && !isAIPanelOpen;
  const isAIActive = isAIPanelOpen;

  return (
    <div className={styles.mobileNavContainer}>
      {/* Bottom Bar Navigation */}
      <nav className={styles.bottomBar}>
        <button 
          className={`${styles.navTab} ${isHomeActive ? styles.navTabActive : ""}`}
          onClick={handleHomeClick}
        >
          <Home className={styles.tabIcon} />
          <span>Home</span>
          {isHomeActive && <span className={styles.activeIndicator} />}
        </button>

        <button 
          className={styles.navTab}
          onClick={handlePagesClick}
        >
          <FileText className={styles.tabIcon} />
          <span>Pages</span>
        </button>

        <button 
          className={`${styles.navTab} ${styles.aiTab} ${isAIActive ? styles.aiTabActive : ""}`}
          onClick={handleAIClick}
        >
          <Sparkles className={styles.tabIcon} />
          <span>AI Chat</span>
          {isAIActive && <span className={styles.activeIndicator} />}
        </button>

        <button 
          className={`${styles.navTab} ${isTasksActive ? styles.navTabActive : ""}`}
          onClick={handleTasksClick}
        >
          <CheckSquare className={styles.tabIcon} />
          <span>Tasks</span>
          {isTasksActive && <span className={styles.activeIndicator} />}
        </button>

        <button 
          className={`${styles.navTab} ${isSheetOpen ? styles.navTabActive : ""}`}
          onClick={() => setIsSheetOpen(true)}
        >
          <MoreHorizontal className={styles.tabIcon} />
          <span>More</span>
        </button>
      </nav>

      {/* Slide-Up Bottom Sheet Backdrop */}
      <div 
        className={`${styles.backdrop} ${isSheetOpen ? styles.backdropVisible : ""}`}
        onClick={() => setIsSheetOpen(false)}
      />

      {/* Slide-Up Bottom Sheet Drawer */}
      <div className={`${styles.bottomSheet} ${isSheetOpen ? styles.bottomSheetVisible : ""}`}>
        <div className={styles.dragHandle} />
        
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>Workspace Tools</span>
          <button className={styles.closeBtn} onClick={() => setIsSheetOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className={styles.menuGrid}>
          <button 
            className={`${styles.gridItem} ${activePageId === "inbox" ? styles.gridItemActive : ""}`}
            onClick={() => setActivePage("inbox")}
          >
            <Inbox className={styles.gridItemIcon} />
            <span>Inbox</span>
          </button>

          <button 
            className={`${styles.gridItem} ${activePageId === "calendar" ? styles.gridItemActive : ""}`}
            onClick={() => setActivePage("calendar")}
          >
            <Calendar className={styles.gridItemIcon} />
            <span>Calendar</span>
          </button>

          <button 
            className={`${styles.gridItem} ${activePageId === "automations" ? styles.gridItemActive : ""}`}
            onClick={() => setActivePage("automations")}
          >
            <Zap className={styles.gridItemIcon} />
            <span>Agents</span>
          </button>

          <button 
            className={`${styles.gridItem} ${activePageId === "templates" ? styles.gridItemActive : ""}`}
            onClick={() => setActivePage("templates")}
          >
            <Copy className={styles.gridItemIcon} />
            <span>Templates</span>
          </button>

          <button 
            className={`${styles.gridItem} ${activePageId === "whatsapp" ? styles.gridItemActive : ""}`}
            onClick={() => setActivePage("whatsapp")}
          >
            <MessageSquare className={styles.gridItemIcon} style={{ color: '#25D366' }} />
            <span>WhatsApp</span>
          </button>


          <button 
            className={styles.gridItem}
            onClick={() => setSearchOpen(true)}
          >
            <Search className={styles.gridItemIcon} />
            <span>Search</span>
          </button>

          <button 
            className={styles.gridItem}
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className={styles.gridItemIcon} />
            <span>Settings</span>
          </button>

          <button 
            className={`${styles.gridItem} ${activePageId === "trash" ? styles.gridItemActive : ""}`}
            onClick={() => setActivePage("trash")}
          >
            <Trash2 className={styles.gridItemIcon} />
            <span>Trash</span>
          </button>
        </div>
      </div>
    </div>
  );
}
