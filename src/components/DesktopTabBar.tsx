"use client";

import React from "react";
import styles from "./DesktopTabBar.module.css";
import {
  Sidebar as SidebarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Share2,
  Link as LinkIcon,
  Star,
  MoreHorizontal,
  X
} from "lucide-react";

export interface DocumentTab {
  id: string;
  title: string;
  icon?: string;
}

interface DesktopTabBarProps {
  tabs: DocumentTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  onToggleSidebar?: () => void;
  onShare?: () => void;
}

export default function DesktopTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onToggleSidebar,
  onShare
}: DesktopTabBarProps) {
  return (
    <header className={styles.container}>
      {/* Left controls */}
      <div className={styles.leftGroup}>
        {onToggleSidebar && (
          <button
            className={styles.navIconBtn}
            onClick={onToggleSidebar}
            title="Toggle Sidebar"
          >
            <SidebarIcon size={16} />
          </button>
        )}
        <button className={styles.navIconBtn} title="Back">
          <ChevronLeft size={16} />
        </button>
        <button className={styles.navIconBtn} title="Forward">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Tabs list */}
      <div className={styles.tabGroup}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              className={`${styles.tab} ${isActive ? styles.activeTab : ""}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <span className={styles.tabText}>{tab.title || "Untitled"}</span>
              {tabs.length > 1 && (
                <button
                  className={styles.closeTabBtn}
                  onClick={(e) => onCloseTab(tab.id, e)}
                  title="Close tab"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
        <button className={styles.newTabBtn} onClick={onNewTab} title="New Tab">
          <Plus size={16} />
        </button>
      </div>

      {/* Right controls */}
      <div className={styles.rightGroup}>
        <span className={styles.editedText}>Edited just now</span>
        <button className={styles.shareBtn} onClick={onShare}>
          <Share2 size={13} /> Share ⌄
        </button>
        <button className={styles.navIconBtn} title="Copy link">
          <LinkIcon size={14} />
        </button>
        <button className={styles.navIconBtn} title="Favorite">
          <Star size={14} />
        </button>
        <button className={styles.navIconBtn} title="More actions">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </header>
  );
}
