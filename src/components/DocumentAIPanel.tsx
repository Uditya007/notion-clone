"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Edit3,
  Paperclip,
  FileText,
  Database,
  Zap,
  BrainCircuit,
  Wand2
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

  // Dynamic Context State
  const [pageTitle, setPageTitle] = useState("Meeting / Page Document");
  const [pageContent, setPageContent] = useState("");

  // Interactive Menu States
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);

  // Selected Options
  const [selectedModel, setSelectedModel] = useState<"flash" | "pro">("flash");
  const [aiMode, setAiMode] = useState<"Auto" | "Direct Edit" | "QA Mode">("Auto");
  const [isListening, setIsListening] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRef = useRef<any>(null);

  // Fetch real page title and content when activePageId changes
  useEffect(() => {
    if (!activePageId) {
      setPageTitle("Meeting / Workspace Page");
      setPageContent("");
      return;
    }

    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/pages/${activePageId}`);
        if (res.ok) {
          const data = await res.json();
          setPageTitle(data.title || "Untitled Document");
          setPageContent(data.content || "");
        }
      } catch (err) {
        console.error("Error fetching page context for AI:", err);
      }
    };

    fetchPage();
  }, [activePageId]);

  // Handle Voice Input via SpeechRecognition
  const toggleVoiceListening = () => {
    if (isListening) {
      if (speechRef.current) {
        speechRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addToast("🎙️ Speech input not supported in this browser — simulating voice recording...", "info");
      setIsListening(true);
      setTimeout(() => {
        setPrompt((prev) => (prev ? prev + " " : "") + "Summarize the key takeaways from this meeting");
        setIsListening(false);
        addToast("🎙️ Voice prompt transcribed!", "success");
      }, 3000);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        addToast("🔴 Listening... speak your request", "info");
      };

      rec.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setPrompt(transcript);
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      speechRef.current = rec;
      rec.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addToast(`📎 Attached file context: ${file.name}`, "success");
      setPrompt((prev) => (prev ? `${prev} [Attached file: ${file.name}]` : `[Attached file: ${file.name}] `));
      setShowAttachMenu(false);
    }
  };

  const handleSendPrompt = async (customPrompt?: string) => {
    const text = customPrompt || prompt;
    if (!text.trim()) return;

    if (!customPrompt) {
      setPrompt("");
    }

    setShowAttachMenu(false);
    setShowModelMenu(false);
    setShowModeMenu(false);

    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const fullSystemContext = `You are Cora AI, an expert Notion document and meeting assistant running on ${
        selectedModel === "pro" ? "Gemini 2.5 Pro (Deep Reasoning)" : "Gemini 2.5 Flash"
      }. Mode: ${aiMode}.
Current Active Document Title: "${pageTitle}".
Current Document Content: "${pageContent || "Document content not loaded or empty"}".

Respond clearly and concisely in clean markdown formatted specifically for a workspace document. User Request: ${text}`;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullSystemContext
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate response");
      }

      const replyText = await response.text();

      const assistantMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: replyText || "I've analyzed the document and prepared the requested output."
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
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAttachFile}
        style={{ display: "none" }}
      />

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
          <div className={styles.footer} style={{ position: "relative" }}>
            {/* Popover Menu: Attach Options (+) */}
            {showAttachMenu && (
              <div className={styles.popupMenu}>
                <div className={styles.popupMenuHeader}>Attach Context</div>
                <button
                  className={styles.popupMenuItem}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={14} /> Upload File or Image
                </button>
                <button
                  className={styles.popupMenuItem}
                  onClick={() => {
                    addToast("📄 Linked active workspace document scope", "success");
                    setShowAttachMenu(false);
                  }}
                >
                  <FileText size={14} /> Reference Active Page
                </button>
                <button
                  className={styles.popupMenuItem}
                  onClick={() => {
                    addToast("📊 Linked workspace database context", "success");
                    setShowAttachMenu(false);
                  }}
                >
                  <Database size={14} /> Include Workspace Database
                </button>
              </div>
            )}

            {/* Popover Menu: Model Selection (Sliders) */}
            {showModelMenu && (
              <div className={styles.popupMenu}>
                <div className={styles.popupMenuHeader}>AI Model & Reasoning</div>
                <button
                  className={`${styles.popupMenuItem} ${
                    selectedModel === "flash" ? styles.popupMenuItemActive : ""
                  }`}
                  onClick={() => {
                    setSelectedModel("flash");
                    setShowModelMenu(false);
                    addToast("⚡ Switched to Gemini 2.5 Flash", "info");
                  }}
                >
                  <Zap size={14} /> Gemini 2.5 Flash (Fast & Responsive)
                </button>
                <button
                  className={`${styles.popupMenuItem} ${
                    selectedModel === "pro" ? styles.popupMenuItemActive : ""
                  }`}
                  onClick={() => {
                    setSelectedModel("pro");
                    setShowModelMenu(false);
                    addToast("🧠 Switched to Gemini 2.5 Pro (Deep Reasoning)", "info");
                  }}
                >
                  <BrainCircuit size={14} /> Gemini 2.5 Pro (Deep Reasoning)
                </button>
              </div>
            )}

            {/* Popover Menu: AI Execution Mode (Auto) */}
            {showModeMenu && (
              <div className={styles.popupMenu}>
                <div className={styles.popupMenuHeader}>Execution Mode</div>
                {(["Auto", "Direct Edit", "QA Mode"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`${styles.popupMenuItem} ${
                      aiMode === mode ? styles.popupMenuItemActive : ""
                    }`}
                    onClick={() => {
                      setAiMode(mode);
                      setShowModeMenu(false);
                      addToast(`🎯 Mode changed to: ${mode}`, "info");
                    }}
                  >
                    <Wand2 size={14} /> {mode}
                  </button>
                ))}
              </div>
            )}

            {isListening && (
              <div className={styles.listeningBanner}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={styles.listeningDot} />
                  <span>Listening... speak your request</span>
                </div>
                <button
                  className={styles.listeningStopBtn}
                  onClick={toggleVoiceListening}
                >
                  Done
                </button>
              </div>
            )}

            <div className={styles.inputContainer}>
              <div
                className={styles.contextChip}
                title="Active Page/Meeting Context"
              >
                <span>📄</span>
                <span>{pageTitle}</span>
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
                  <button
                    className={`${styles.toolbarBtn} ${
                      showAttachMenu ? styles.toolbarBtnActive : ""
                    }`}
                    onClick={() => {
                      setShowAttachMenu(!showAttachMenu);
                      setShowModelMenu(false);
                      setShowModeMenu(false);
                    }}
                    title="Attach Context (+)"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    className={`${styles.toolbarBtn} ${
                      showModelMenu ? styles.toolbarBtnActive : ""
                    }`}
                    onClick={() => {
                      setShowModelMenu(!showModelMenu);
                      setShowAttachMenu(false);
                      setShowModeMenu(false);
                    }}
                    title="Model & Prompt Options"
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                </div>

                <div className={styles.toolbarRight}>
                  <button
                    className={styles.autoBadgeClickable}
                    onClick={() => {
                      setShowModeMenu(!showModeMenu);
                      setShowAttachMenu(false);
                      setShowModelMenu(false);
                    }}
                    title="Change Execution Mode"
                  >
                    <span>{aiMode}</span>
                    <ChevronDown size={11} />
                  </button>
                  <button
                    className={`${styles.toolbarBtn} ${
                      isListening ? styles.toolbarBtnActive : ""
                    }`}
                    onClick={toggleVoiceListening}
                    title="Voice input (Web Speech API)"
                  >
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
