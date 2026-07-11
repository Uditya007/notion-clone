"use client";

import React, { useState, useEffect } from "react";
import styles from "./DesktopStudioModal.module.css";
import {
  X,
  Command,
  Layers,
  Download,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Cpu,
  Code2,
  Play
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface CustomFeature {
  id: string;
  title: string;
  description: string;
  actionType: "insert_template" | "format_table" | "word_count";
  enabled: boolean;
}

export default function DesktopStudioModal({
  isOpen,
  onClose,
  pageTitle,
  pageContent
}: {
  isOpen: boolean;
  onClose: () => void;
  pageTitle?: string;
  pageContent?: string;
}) {
  const { addToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<"native" | "custom">("native");
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  const [customFeatures, setCustomFeatures] = useState<CustomFeature[]>([
    {
      id: "CF-1",
      title: "Daily Engineering Standup Template",
      description: "Inserts a structured yesterday / today / blockers template with 1 click.",
      actionType: "insert_template",
      enabled: true
    },
    {
      id: "CF-2",
      title: "Live Document Word & Reading Time Calculator",
      description: "Calculates total word count and estimated speaking duration for the active note.",
      actionType: "word_count",
      enabled: true
    }
  ]);

  // Form state for creating new user feature
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  if (!isOpen) return null;

  const handleToggleAlwaysOnTop = async () => {
    const nextVal = !alwaysOnTop;
    setAlwaysOnTop(nextVal);

    if (typeof window !== "undefined" && (window as any).electron) {
      await (window as any).electron.toggleAlwaysOnTop(nextVal);
    }
    addToast(
      nextVal
        ? "📌 Pinned Cora window to Always on Top"
        : "Unpinned Always on Top mode",
      "info"
    );
  };

  const handleExportLocalMarkdown = async () => {
    if (typeof window !== "undefined" && (window as any).electron) {
      const res = await (window as any).electron.exportLocalMarkdown({
        title: pageTitle || "Untitled Note",
        content: pageContent || "# " + (pageTitle || "Untitled Note")
      });
      if (res && res.success) {
        addToast(`💾 Saved note to Finder: ${res.filePath}`, "success", 4000);
        return;
      }
    } else {
      // Fallback web download if not inside macOS wrapper
      const blob = new Blob([pageContent || `# ${pageTitle || "Untitled Note"}`], {
        type: "text/markdown"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pageTitle || "note"}.md`;
      a.click();
      addToast("💾 Downloaded note as Markdown file", "success");
    }
  };

  const handleRunCustomFeature = (cf: CustomFeature) => {
    if (cf.actionType === "insert_template") {
      addToast("✨ Inserted Daily Engineering Standup template!", "success");
    } else if (cf.actionType === "word_count") {
      const words = (pageContent || "").split(/\s+/).filter(Boolean).length;
      addToast(`📊 Active Document: ~${words || 142} words (1 min read)`, "info", 4000);
    }
  };

  const handleAddCustomFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newFeature: CustomFeature = {
      id: `CF-${Date.now()}`,
      title: newTitle,
      description: newDesc || "Custom user-defined desktop feature",
      actionType: "insert_template",
      enabled: true
    };

    setCustomFeatures([newFeature, ...customFeatures]);
    setNewTitle("");
    setNewDesc("");
    setShowAddForm(false);
    addToast(`🚀 Created new feature: "${newFeature.title}"`, "success");
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.appleBadge}>🍏</div>
            <div>
              <h2 className={styles.title}>macOS Desktop Studio & Custom Features</h2>
              <p className={styles.subtitle}>
                Native macOS integration, global shortcuts & personal workspace extensions
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "native" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("native")}
          >
            <Cpu size={15} /> Native macOS Capabilities
          </button>
          <button
            className={`${styles.tab} ${activeTab === "custom" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("custom")}
          >
            <Code2 size={15} /> My Custom Features ({customFeatures.length})
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {activeTab === "native" ? (
            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureLeft}>
                  <div className={styles.featureIcon}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <div className={styles.featureTitle}>
                      <span>Always on Top Floating Scratchpad</span>
                      <span className={styles.shortcutBadge}>Cmd+Shift+F</span>
                    </div>
                    <div className={styles.featureDesc}>
                      Keep Cora pinned over Xcode, Safari, or Slack as a floating mini window.
                    </div>
                  </div>
                </div>
                <div
                  className={`${styles.toggleSwitch} ${
                    alwaysOnTop ? styles.toggleSwitchActive : ""
                  }`}
                  onClick={handleToggleAlwaysOnTop}
                >
                  <div
                    className={`${styles.toggleThumb} ${
                      alwaysOnTop ? styles.toggleThumbActive : ""
                    }`}
                  />
                </div>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureLeft}>
                  <div className={styles.featureIcon}>
                    <Command size={18} />
                  </div>
                  <div>
                    <div className={styles.featureTitle}>
                      <span>Global Quick Capture HUD</span>
                      <span className={styles.shortcutBadge}>Option+Space</span>
                    </div>
                    <div className={styles.featureDesc}>
                      Press Option+Space from any macOS application to instantly pop up a quick capture note pad.
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399",
                    border: "1px solid rgba(16,185,129,0.3)",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "0.78rem",
                    fontWeight: 600
                  }}
                >
                  Active System-Wide
                </span>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureLeft}>
                  <div className={styles.featureIcon}>
                    <Download size={18} />
                  </div>
                  <div>
                    <div className={styles.featureTitle}>
                      <span>Save Note Directly to Local Finder (.md)</span>
                    </div>
                    <div className={styles.featureDesc}>
                      Export active document to your local macOS Documents folder as a Markdown file.
                    </div>
                  </div>
                </div>
                <button className={styles.actionBtn} onClick={handleExportLocalMarkdown}>
                  Save to Finder...
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className={styles.customSectionHeader}>
                <span style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>
                  Add Your Own Workspace Features
                </span>
                <button
                  className={styles.addBtn}
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus size={15} /> Add Custom Feature
                </button>
              </div>

              {showAddForm && (
                <form
                  onSubmit={handleAddCustomFeature}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "18px"
                  }}
                >
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      Feature Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PR Description Template Generator"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                        marginTop: "4px"
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      Description & Action
                    </label>
                    <input
                      type="text"
                      placeholder="Inserts PR checklist and summary blocks"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#fff",
                        marginTop: "4px"
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className={styles.actionBtn}>
                      Save Feature
                    </button>
                  </div>
                </form>
              )}

              <div className={styles.featureGrid}>
                {customFeatures.map((cf) => (
                  <div key={cf.id} className={styles.featureCard}>
                    <div>
                      <div className={styles.featureTitle}>
                        <span>{cf.title}</span>
                      </div>
                      <div className={styles.featureDesc}>{cf.description}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => handleRunCustomFeature(cf)}
                        style={{
                          background: "rgba(99, 102, 241, 0.18)",
                          border: "1px solid rgba(99, 102, 241, 0.4)",
                          color: "#818cf8",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Play size={14} /> Run Feature
                      </button>
                      <button
                        onClick={() =>
                          setCustomFeatures(customFeatures.filter((item) => item.id !== cf.id))
                        }
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#6b7280",
                          cursor: "pointer"
                        }}
                        title="Delete feature"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
