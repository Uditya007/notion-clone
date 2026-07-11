"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Smartphone, 
  Send, 
  Copy, 
  Check, 
  CheckCheck, 
  Settings, 
  AlertCircle, 
  Calendar, 
  ArrowLeft,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Code,
  Terminal,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  PlusSquare,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import styles from "./WhatsAppView.module.css";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  pageId?: string;
};

type WebhookActivity = {
  timestamp: string;
  message: string;
  direction: "inbound" | "outbound";
  payload: any;
};

export default function WhatsAppView() {
  const { addToast, setActivePage } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "assistant",
      content: "👋 *Welcome to Cora AI Scheduling Bot!* \n\nI can help you schedule tasks or create workspace meeting note pages directly from this chat. Try typing a message below or clicking one of the suggestions to see how I process your schedule requests live! \n\nFor example: \n- *Schedule task: review design mockups tomorrow at 5pm* \n- *Schedule meeting: Project Sync on Monday at 10am*",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "read"
    }
  ]);
  
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("https://clearspace.app/api/whatsapp/webhook");
  const [activeTab, setActiveTab] = useState<"simulator" | "credentials">("simulator");
  
  // Dashboard states
  const [nlpEnabled, setNlpEnabled] = useState(true);
  const [autoPages, setAutoPages] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [digestPhone, setDigestPhone] = useState("");
  
  // Webhook activities log
  const [activities, setActivities] = useState<WebhookActivity[]>([
    {
      timestamp: new Date().toLocaleTimeString(),
      direction: "inbound",
      message: "Simulator initialized. Waiting for payloads...",
      payload: { system: "ready", listeningOn: "/api/whatsapp/webhook" }
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Set local origin for webhook URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
      const savedPhone = localStorage.getItem("cora-wa-phone");
      if (savedPhone) setDigestPhone(savedPhone);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDigestPhone(val);
    localStorage.setItem("cora-wa-phone", val);
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const playSound = (type: "send" | "receive") => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "send") {
        // Soft high tick
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        // Double notification sound
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    addToast("Webhook URL copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputValue("");
    }

    // 1. Add user message
    const userMsgId = Math.random().toString(36).substring(2, 9);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: userMsgId,
      role: "user",
      content: text,
      time: timeNow,
      status: "sent"
    };

    setMessages(prev => [...prev, newMsg]);
    playSound("send");

    // Update statuses to delivered, then read
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, status: "delivered" } : m));
    }, 400);

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, status: "read" } : m));
    }, 800);

    // 2. Start bot typing
    setIsTyping(true);

    // Log outbound webhook trigger activity
    const inboundActivity: WebhookActivity = {
      timestamp: new Date().toLocaleTimeString(),
      direction: "inbound",
      message: `Triggered Webhook POST`,
      payload: {
        url: "/api/whatsapp/webhook",
        body: {
          message: text,
          from: "+14155238886"
        }
      }
    };
    setActivities(prev => [inboundActivity, ...prev]);

    try {
      // 3. Post to webhook
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          from: "+14155238886"
        })
      });

      if (!res.ok) {
        throw new Error(`Webhook responded with status ${res.status}`);
      }

      const data = await res.json();
      setIsTyping(false);
      playSound("receive");

      // 4. Add bot response
      const botMsgId = Math.random().toString(36).substring(2, 9);
      const botMsg: Message = {
        id: botMsgId,
        role: "assistant",
        content: data.reply || "Sorry, I encountered an issue processing that scheduling request.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pageId: data.page?.id
      };

      setMessages(prev => [...prev, botMsg]);

      // Log success activity
      const outboundActivity: WebhookActivity = {
        timestamp: new Date().toLocaleTimeString(),
        direction: "outbound",
        message: `Received Webhook Response`,
        payload: data
      };
      setActivities(prev => [outboundActivity, ...prev]);

      if (data.task) {
        addToast(`📅 Task scheduled: "${data.task.title}"`, "success", 4000);
      } else if (data.page) {
        addToast(`🎙️ Meeting Page created: "${data.page.title}"`, "success", 4000);
      }

    } catch (err: any) {
      console.error("WhatsApp webhook simulator failed:", err);
      setIsTyping(false);
      
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: `⚠️ *Connection Error* \n\nFailed to deliver message to webhook. Please ensure your Supabase tables and environment variables are active. \n\n*Error details:* ${err.message || err}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
      playSound("receive");

      // Log failure activity
      const errorActivity: WebhookActivity = {
        timestamp: new Date().toLocaleTimeString(),
        direction: "outbound",
        message: `Webhook Execution Failure`,
        payload: { error: err.message || err }
      };
      setActivities(prev => [errorActivity, ...prev]);
    }
  };

  const handleSuggestionClick = (phrase: string) => {
    handleSendMessage(phrase);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const parseFormattedContent = (content: string) => {
    // Basic WhatsApp style formatting replacement (e.g. *bold* -> <strong>bold</strong>)
    let formatted = content;
    // Bold
    formatted = formatted.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
    // Italics
    formatted = formatted.replace(/_(.*?)_/g, "<em>$1</em>");
    // Strike
    formatted = formatted.replace(/~(.*?)~/g, "<del>$1</del>");
    // Code blocks
    formatted = formatted.replace(/`(.*?)`/g, "<code>$1</code>");
    // Newlines to breaks
    return { __html: formatted.replace(/\n/g, "<br />") };
  };

  const quickSuggestions = [
    "Schedule task: Submit monthly invoice tomorrow by 5pm",
    "Schedule meeting: Project sync next Monday at 10am",
    "Remind me to buy milk tomorrow at 8am",
    "Schedule task: Review Figma designs tomorrow at 3pm"
  ];

  return (
    <div className={styles.wrapper}>
      {/* HEADER ACTION AREA */}
      <div className={styles.dashboardHeader}>
        <div className={styles.titleGroup}>
          <MessageSquare className={styles.headerIcon} style={{ color: "#25D366" }} />
          <div>
            <h1>WhatsApp Integration Dashboard</h1>
            <div className={styles.connectedBadge}>
              <span className={styles.connectedDot} />
              Live
            </div>
            <p>Schedule tasks and create dynamic meeting documents via chat.</p>
          </div>
        </div>
        <div className={styles.audioToggle}>
          <button 
            className={styles.soundBtn} 
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute sounds" : "Unmute sounds"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID FOR INTERACTIVE VIEW */}
      <div className={styles.gridContainer}>
        
        {/* LEFT COLUMN: THE REAL-TIME WHATSAPP MOBILE SIMULATOR */}
        <div className={styles.simulatorColumn}>
          <div className={styles.phoneDevice}>
            {/* Phone Top Notch */}
            <div className={styles.phoneSpeaker} />
            <div className={styles.phoneStatusBar}>
              <span className={styles.statusBarTime}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
              <div className={styles.statusBarIcons}>
                <Smartphone size={12} />
                <span className={styles.networkDot}>5G</span>
                <span className={styles.batteryPercent}>100%</span>
              </div>
            </div>

            {/* WhatsApp App Bar */}
            <div className={styles.whatsappAppBar}>
              <div className={styles.whatsappContactArea}>
                <div className={styles.botAvatar}>
                  <Sparkles size={16} className={styles.avatarSparkle} />
                </div>
                <div className={styles.contactInfo}>
                  <span className={styles.contactName}>Cora AI Assistant</span>
                  <span className={styles.contactStatus}>
                    {isTyping ? (
                      <span className={styles.typingPulse}>typing...</span>
                    ) : (
                      <>
                        <span className={styles.onlineDot} /> Online
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div className={styles.appBarActions}>
                <Video size={16} />
                <Phone size={15} />
                <MoreVertical size={16} />
              </div>
            </div>

            {/* Chat Conversation Area */}
            <div className={styles.chatScroller}>
              <div className={styles.chatOverlayGrid} />
              
              <div className={styles.encryptionNotice}>
                <Lock size={10} style={{ marginRight: 4 }} /> Messages and calls are end-to-end encrypted. No one outside of this chat, not even Meta, can read them.
              </div>

              <div className={styles.dateDivider}>TODAY</div>

              <div className={styles.messageList}>
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.assistantRow}`}
                  >
                    <div className={`${styles.bubble} ${msg.role === 'user' ? styles.userBubble : styles.assistantBubble}`}>
                      <div className={styles.bubbleText} dangerouslySetInnerHTML={parseFormattedContent(msg.content)} />
                      
                      {msg.pageId && (
                        <button 
                          className={styles.clickOpenPageBtn}
                          onClick={() => {
                            setActivePage(msg.pageId!);
                            addToast("Opened scheduled meeting page!", "info");
                          }}
                        >
                          <ExternalLink size={12} style={{ marginRight: 4 }} />
                          Open Meeting Document
                        </button>
                      )}

                      <div className={styles.bubbleMeta}>
                        <span className={styles.bubbleTime}>{msg.time}</span>
                        {msg.role === 'user' && (
                          <span className={styles.bubbleChecks}>
                            {msg.status === 'sent' && <Check size={12} style={{ color: "var(--text-muted)" }} />}
                            {msg.status === 'delivered' && <CheckCheck size={12} style={{ color: "var(--text-muted)" }} />}
                            {msg.status === 'read' && <CheckCheck size={12} style={{ color: "#34B7F1" }} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className={styles.messageRow + " " + styles.assistantRow}>
                    <div className={styles.bubble + " " + styles.assistantBubble + " " + styles.typingBubble}>
                      <span className={styles.typingDot}></span>
                      <span className={styles.typingDot}></span>
                      <span className={styles.typingDot}></span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Suggestions Quick Buttons */}
            <div className={styles.quickSuggestionsBar}>
              <div className={styles.suggestionsScroll}>
                {quickSuggestions.map((phrase, i) => (
                  <button 
                    key={i} 
                    className={styles.suggestionPill}
                    onClick={() => handleSuggestionClick(phrase)}
                  >
                    {phrase.length > 32 ? phrase.slice(0, 32) + "..." : phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Dock */}
            <div className={styles.inputDock}>
              <div className={styles.textInputWrapper}>
                <Smile size={18} className={styles.inputLeftIcon} />
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message to schedule..." 
                  className={styles.chatInputField}
                />
                <Paperclip size={18} className={styles.inputRightIcon} />
                <Mic size={18} className={styles.inputRightIcon} />
              </div>
              <button 
                onClick={() => handleSendMessage()}
                className={`${styles.sendButton} ${inputValue.trim() ? styles.sendButtonActive : ''}`}
                disabled={!inputValue.trim()}
              >
                <Send size={16} fill="var(--white)" style={{ transform: inputValue.trim() ? "translate(1px, 0)" : "none" }} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CONFIGURATION DASHBOARD & EVENT LOGGER */}
        <div className={styles.configColumn}>
          
          {/* TAB HEADER */}
          <div className={styles.tabHeaders}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'simulator' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('simulator')}
            >
              <Terminal size={14} style={{ marginRight: 6 }} />
              Live Activity Logger
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'credentials' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('credentials')}
            >
              <Settings size={14} style={{ marginRight: 6 }} />
              Integration Setup
            </button>
          </div>

          <div className={styles.panelContent}>
            {activeTab === 'simulator' ? (
              <>
                {/* WEBHOOK URL ENDPOINT DISPLAY CARD */}
                <div className={styles.webhookUrlCard}>
                  <div className={styles.webhookHeader}>
                    <span className={styles.webhookBadge}>Production Webhook URL</span>
                    <span className={styles.webhookMethod}>POST</span>
                  </div>
                  <div className={styles.urlInputRow}>
                    <input 
                      type="text" 
                      value={webhookUrl} 
                      readOnly 
                      className={styles.webhookUrlInput} 
                    />
                    <button 
                      onClick={handleCopyWebhook} 
                      className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                  <p className={styles.webhookDesc}>
                    Set this endpoint in your Meta WhatsApp Developer console or Twilio Console sandbox to forward incoming chat messages directly into your workspace.
                  </p>
                </div>

                /* LIVE EVENT PAYLOAD LOGGER */
                <div className={styles.loggerPanel}>
                  <div className={styles.panelHeaderGroup}>
                    <h3>📡 Real-time Parser Output</h3>
                    <button 
                      className={styles.clearLogsBtn}
                      onClick={() => setActivities([{
                        timestamp: new Date().toLocaleTimeString(),
                        direction: "inbound",
                        message: "Logger cleared. Awaiting event payloads...",
                        payload: {}
                      }])}
                    >
                      Clear Logs
                    </button>
                  </div>
                  
                  <div className={styles.logsScroller}>
                    {activities.map((act, i) => (
                      <div key={i} className={styles.logCard}>
                        <div className={styles.logMetaRow}>
                          <span className={`${styles.directionTag} ${act.direction === 'inbound' ? styles.tagInbound : styles.tagOutbound}`}>
                            {act.direction === 'inbound' ? "POST REQUEST" : "JSON RESPONSE"}
                          </span>
                          <span className={styles.logTimestamp}>
                            <Clock size={11} style={{ marginRight: 4 }} />
                            {act.timestamp}
                          </span>
                        </div>
                        
                        <div className={styles.logMsg}>{act.message}</div>
                        
                        {Object.keys(act.payload).length > 0 && (
                          <div className={styles.payloadPreContainer}>
                            <div className={styles.preCodeHeader}>
                              <Code size={12} style={{ marginRight: 4 }} />
                              <span>Payload JSON</span>
                            </div>
                            <pre className={styles.payloadPre}>
                              {JSON.stringify(act.payload, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* USER-FRIENDLY WHATSAPP INTEGRATION HUB */
              <div className={styles.settingsForm}>
                
                {/* OFFICIAL WHATSAPP BOT CARD */}
                <div className={styles.botHeroCard}>
                  <div className={styles.botHeroHeader}>
                    <div className={styles.botHeroTitle}>
                      <MessageSquare size={18} style={{ color: "#25D366" }} />
                      <span>Cora AI Assistant on WhatsApp</span>
                    </div>
                    <span className={styles.connectedBadge} style={{ margin: 0 }}>
                      <span className={styles.connectedDot} />
                      Connected & Ready
                    </span>
                  </div>
                  <p className={styles.botHeroDesc}>
                    Chat with Cora from your mobile phone on WhatsApp to schedule tasks, capture meeting notes, and receive daily briefings anytime, anywhere.
                  </p>
                  <div className={styles.botHeroActions}>
                    <a 
                      href="https://wa.me/14155238886?text=join%20cora" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={styles.primaryWaBtn}
                    >
                      💬 Start WhatsApp Bot ↗
                    </a>
                    <button 
                      className={styles.secondaryWaBtn}
                      onClick={() => {
                        fetch("/api/whatsapp/send-alert", { method: "POST" })
                          .then(() => addToast("📱 Sent test notification to WhatsApp!", "success"))
                          .catch(() => addToast("Failed to send test alert", "error"));
                      }}
                    >
                      📱 Send Test Alert
                    </button>
                  </div>
                </div>

                {/* DAILY DIGEST CONFIGURATION */}
                <div className={styles.digestSection}>
                  <div className={styles.digestTitle}>
                    <span>☀️</span>
                    <span>Morning Daily Digest</span>
                  </div>
                  <p className={styles.botHeroDesc}>
                    Enter your WhatsApp phone number with country code to receive a morning summary of due tasks and updated pages.
                  </p>
                  <input 
                    type="text" 
                    value={digestPhone} 
                    onChange={handlePhoneChange} 
                    placeholder="+919876543210" 
                    className={styles.digestInput}
                  />
                  <button 
                    onClick={() => {
                      if (!digestPhone) {
                        alert("Enter your WhatsApp number first");
                        return;
                      }
                      fetch("/api/whatsapp/daily-digest?phone=" + encodeURIComponent(digestPhone))
                        .then(res => {
                          if (res.ok) addToast("☀️ Daily digest sent to WhatsApp!", "success");
                          else addToast("Failed to send digest", "error");
                        })
                        .catch(() => addToast("Failed to send digest", "error"));
                    }}
                    className={styles.digestBtn}
                  >
                    📱 Send Today's Digest Now
                  </button>
                </div>

                {/* AUTOMATION PREFERENCES */}
                <div className={styles.settingsGroup}>
                  <h3>⚡ AI & Automation Capabilities</h3>
                  
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Gemini 2.5 Smart NLP Intent Extraction</span>
                      <span className={styles.toggleSub}>Automatically parse task titles, dates, times, and action items from conversational chat messages.</span>
                    </div>
                    <label className={styles.switch}>
                      <input 
                        type="checkbox" 
                        checked={nlpEnabled} 
                        onChange={(e) => setNlpEnabled(e.target.checked)} 
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Auto-Create Notion Meeting Documents</span>
                      <span className={styles.toggleSub}>Automatically create structured workspace pages when you schedule meetings via WhatsApp.</span>
                    </div>
                    <label className={styles.switch}>
                      <input 
                        type="checkbox" 
                        checked={autoPages} 
                        onChange={(e) => setAutoPages(e.target.checked)} 
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>

                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>WhatsApp Confirmation & Deadline Alerts</span>
                      <span className={styles.toggleSub}>Receive instant callback confirmations and deadline reminders on your linked WhatsApp number.</span>
                    </div>
                    <label className={styles.switch}>
                      <input 
                        type="checkbox" 
                        checked={smsAlerts} 
                        onChange={(e) => setSmsAlerts(e.target.checked)} 
                      />
                      <span className={styles.slider} />
                    </label>
                  </div>
                </div>

                {/* QUICK COMMAND REFERENCE */}
                <div className={styles.cheatSheetCard}>
                  <div className={styles.cheatSheetHeader}>
                    <span>💬 Try These Commands on WhatsApp</span>
                  </div>
                  <div className={styles.cheatSheetList}>
                    <div className={styles.cheatSheetItem}>
                      <span>Schedule a task</span>
                      <span className={styles.cheatSheetCommand}>Schedule task: Review designs tomorrow at 5pm</span>
                    </div>
                    <div className={styles.cheatSheetItem}>
                      <span>Schedule a meeting</span>
                      <span className={styles.cheatSheetCommand}>Schedule meeting: Team Sync on Monday at 10am</span>
                    </div>
                    <div className={styles.cheatSheetItem}>
                      <span>Get daily briefing</span>
                      <span className={styles.cheatSheetCommand}>Daily digest</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
