"use client";

import React, { useState } from "react";
import styles from "./DocumentAIPanel.module.css";
import { useAppStore } from "@/store/useAppStore";
import {
  X,
  ChevronDown,
  Sparkles,
  AlignLeft,
  LayoutDashboard,
  Languages,
  Search,
  Plus,
  SlidersHorizontal,
  Mic,
  ArrowUp,
  Check,
  Copy,
  Edit3
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  applied?: boolean;
}

export default function DocumentAIPanel() {
  const {
    isDocAIPanelOpen,
    setDocAIPanelOpen,
    activePageId,
    addToast
  } = useAppStore();

  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [pageTitle, setPageTitle] = useState("Meeting / Page Document");

  const handleSendPrompt = async (customPrompt?: string) => {
    const text = customPrompt || prompt;
    if (!text.trim()) return;

    if (!customPrompt) {
      setPrompt("");
    }

    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are Cora AI, an expert Notion document and meeting assistant. Respond to the user's request clearly and concisely in structured markdown formatted for a workspace document. User Request: ${text}`
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate response");
      }

      const replyText = await response.text();

      const assistantMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: replyText || "I've analyzed the document and prepared the requested edits."
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: `⚠️ Could not complete request: ${err.message || "Network error"}. Please try again.`
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    addToast("📋 Copied AI content to clipboard!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyToDocument = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m))
    );
    addToast("✨ AI content copied! Paste directly into your active document.", "success", 4000);
  };

  return (
    <>
      {/* Floating AI Trigger Button on bottom-right of every meeting or page */}
      {!isDocAIPanelOpen && (
        <button
          className={styles.floatingTriggerBtn}
          onClick={() => setDocAIPanelOpen(true)}
          title="Open AI Document Assistant"
        >
          <Sparkles size={20} style={{ color: "#f59e0b" }} />
          <span className={styles.floatingBowtie}>🎀</span>
        </button>
      )}

      {/* Slide-out AI Document Assistant Panel */}
      {isDocAIPanelOpen && (
        <div className={styles.panelContainer}>
          {/* Top Header */}
          <div className={styles.header}>
            <div className={styles.headerTitleGroup}>
              <span>New AI chat</span>
              <ChevronDown size={14} style={{ color: "#9ca3af" }} />
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.headerBtn}
                onClick={() => setDocAIPanelOpen(false)}
                title="Close AI panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className={styles.scrollArea}>
            {/* Cute Mascot & Welcome Heading */}
            <div className={styles.welcomeSection}>
              <div className={styles.mascotAvatar}>
                <Sparkles size={22} style={{ color: "#f59e0b" }} />
                <span className={styles.mascotBowtie}>🎀</span>
              </div>
              <h3 className={styles.welcomeHeading}>
                What can I tie up nicely for you?
              </h3>

              {/* Action Pills */}
              <div className={styles.actionPillsList}>
                <button
                  className={styles.actionPill}
                  onClick={() =>
                    handleSendPrompt(
                      "Summarize this page into executive key takeaways and clear action items."
                    )
                  }
                >
                  <div className={styles.actionPillLeft}>
                    <span className={styles.actionPillIcon}>
                      <AlignLeft size={16} />
                    </span>
                    <span>Summarize this page</span>
                  </div>
                </button>

                <button
                  className={styles.actionPill}
                  onClick={() =>
                    handleSendPrompt(
                      "Create an interactive dashboard table comparing key metrics, milestones, and project statuses from this page."
                    )
                  }
                >
                  <div className={styles.actionPillLeft}>
                    <span className={styles.actionPillIcon}>
                      <LayoutDashboard size={16} />
                    </span>
                    <span>Create an interactive dashboard</span>
                  </div>
                  <span className={styles.newBadge}>New</span>
                </button>

                <button
                  className={styles.actionPill}
                  onClick={() =>
                    handleSendPrompt(
                      "Translate the core content and summary of this page into clear, professional Spanish."
                    )
                  }
                >
                  <div className={styles.actionPillLeft}>
                    <span className={styles.actionPillIcon}>
                      <Languages size={16} />
                    </span>
                    <span>Translate this page</span>
                  </div>
                </button>

                <button
                  className={styles.actionPill}
                  onClick={() =>
                    handleSendPrompt(
                      "Analyze this page for strategic insights, potential risks, and recommended next steps."
                    )
                  }
                >
                  <div className={styles.actionPillLeft}>
                    <span className={styles.actionPillIcon}>
                      <Search size={16} />
                    </span>
                    <span>Analyze for insights</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            {messages.length > 0 && (
              <div className={styles.messageList}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={
                      msg.role === "user"
                        ? styles.userMessage
                        : styles.assistantMessage
                    }
                  >
                    <div>{msg.content}</div>

                    {msg.role === "assistant" && (
                      <div className={styles.messageActions}>
                        <button
                          className={styles.applyBtn}
                          onClick={() =>
                            handleApplyToDocument(msg.id, msg.content)
                          }
                        >
                          <Edit3 size={13} />
                          {msg.applied ? "Applied to Page" : "Apply to Page"}
                        </button>
                        <button
                          className={styles.copyBtn}
                          onClick={() => handleCopy(msg.id, msg.content)}
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={13} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={13} /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className={styles.assistantMessage}>
                    <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
                      ✨ Thinking & analyzing document...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Chat Input */}
          <div className={styles.footer}>
            <div className={styles.inputContainer}>
              <div className={styles.contextChip}>
                <span>📄</span>
                <span>Meeting @June 25, 2026</span>
              </div>

              <textarea
                className={styles.textarea}
                placeholder="Do anything with AI..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
              />

              <div className={styles.inputToolbar}>
                <div className={styles.toolbarLeft}>
                  <button className={styles.toolbarBtn} title="Attach context">
                    <Plus size={15} />
                  </button>
                  <button className={styles.toolbarBtn} title="Filter options">
                    <SlidersHorizontal size={14} />
                  </button>
                </div>

                <div className={styles.toolbarRight}>
                  <span className={styles.autoBadge}>Auto</span>
                  <button className={styles.toolbarBtn} title="Voice prompt">
                    <Mic size={15} />
                  </button>
                  <button
                    className={styles.sendBtn}
                    onClick={() => handleSendPrompt()}
                    disabled={!prompt.trim() || isLoading}
                    title="Send to AI"
                  >
                    <ArrowUp size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
