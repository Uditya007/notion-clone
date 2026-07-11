"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./MeetingNotesView.module.css";
import { Calendar, Sparkles, FileText, CheckCircle, MoreHorizontal, Mail, Copy, MessageCircle, MessageSquare, X, Settings2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface MeetingNotesViewProps {
  data: {
    summary: {
      actionItems: Array<{ text: string; citations?: number[] }>;
      sections: Array<{ title: string; bullets: Array<{ text: string; citations?: number[] }> }>;
    };
    notes: string;
    transcript: Array<{ index: number; speaker: string; text: string }>;
  };
  pageTitle: string;
  onDisable: () => void; // Toggle back to standard editor
}

export default function MeetingNotesView({ data, pageTitle, onDisable }: MeetingNotesViewProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "notes" | "transcript">("summary");
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({});
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const { addToast, setDocAIPanelOpen } = useAppStore();

  const transcriptRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const toggleCompleted = (idx: number) => {
    setCompletedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCitationClick = (index: number) => {
    setActiveTab("transcript");
    setHighlightedLine(index);

    setTimeout(() => {
      const element = transcriptRefs.current[index];
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    setTimeout(() => {
      setHighlightedLine(null);
    }, 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast("📋 Meeting link copied to clipboard!", "success");
  };

  const handleSendEmail = () => {
    addToast("📧 Onboarding summary emailed to attendees!", "success");
  };

  const handleSendSlack = () => {
    addToast("💬 Meeting notes shared to #sales-outreach-campaign!", "success");
  };

  const handleSendWhatsApp = () => {
    let formattedText = `🎙️ *Meeting Summary: ${pageTitle}*\n\n`;

    if (data.summary.actionItems && data.summary.actionItems.length > 0) {
      formattedText += `📋 *Action Items:*\n`;
      data.summary.actionItems.forEach(item => {
        formattedText += `• ${item.text}\n`;
      });
      formattedText += `\n`;
    }

    if (data.summary.sections && data.summary.sections.length > 0) {
      formattedText += `📝 *Key Points:*\n`;
      data.summary.sections.forEach(sect => {
        if (sect.bullets) {
          sect.bullets.forEach(bullet => {
            formattedText += `• ${bullet.text}\n`;
          });
        }
      });
      formattedText += `\n`;
    }

    formattedText += `_Shared from Cora Workspace_`;

    if (window.innerWidth < 768) {
      window.open(`https://wa.me/?text=${encodeURIComponent(formattedText)}`, '_blank');
    } else {
      navigator.clipboard.writeText(formattedText);
      addToast("📋 Meeting summary copied — paste into WhatsApp!", "success");
    }
  };

  const handleCopyTranscript = () => {
    if (data.transcript) {
      const text = data.transcript.map((line: any) => `${line.speaker}: ${line.text}`).join('\n');
      navigator.clipboard.writeText(text);
      addToast("📋 Transcript copied to clipboard!", "success");
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <Calendar className={styles.calendarIcon} size={22} />
          <h2 className={styles.title}>{pageTitle}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setDocAIPanelOpen(true)}
            title="Open AI Assistant for this meeting"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '6px', padding: '6px 12px', color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <Sparkles size={14} /> AI Assistant
          </button>
          <button className={styles.optionsBtn} onClick={onDisable} title="Open in raw editor">
            <Settings2 size={18} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === "summary" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            <Sparkles size={16} />
            Summary
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "notes" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("notes")}
          >
            <FileText size={16} />
            Notes
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "transcript" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("transcript")}
          >
            <CheckCircle size={16} />
            Transcript
          </button>
        </div>
        <button className={styles.optionsBtn} onClick={onDisable} title="Switch to Raw editor mode">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Share Actions Row */}
      <div className={styles.actionsRow}>
        <span>Share this summary</span>
        <div className={styles.actionButtons}>
          <button className={styles.actionBtn} onClick={handleCopyLink}>
            <Copy size={13} /> Copy link
          </button>
          <button className={styles.actionBtn} onClick={handleSendEmail}>
            <Mail size={13} /> Email
          </button>
          <button className={styles.actionBtn} onClick={handleSendWhatsApp}>
            <MessageSquare size={13} color="#25D366" /> WhatsApp
          </button>
          <button className={`${styles.actionBtn} ${styles.slackBtn}`} onClick={handleSendSlack}>
            <MessageCircle size={13} /> Slack
          </button>
          <button className={styles.closeBtn} onClick={onDisable} title="Switch view">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div key={activeTab} className={styles.contentArea}>
        {activeTab === "summary" && (
          <div>
            {/* Action Items */}
            {data.summary.actionItems && data.summary.actionItems.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Action Items</h3>
                <ul className={styles.actionList}>
                  {data.summary.actionItems.map((item, idx) => (
                    <li key={idx} className={styles.actionItemRow}>
                      <input 
                        type="checkbox" 
                        className={styles.checkbox}
                        checked={!!completedItems[idx]}
                        onChange={() => toggleCompleted(idx)}
                      />
                      <span className={`${styles.bulletItem} ${completedItems[idx] ? styles.completedText : ""}`}>
                        {item.text}
                        {item.citations?.map((c) => (
                          <span 
                            key={c} 
                            className={styles.citation}
                            onClick={() => handleCitationClick(c)}
                            title={`Jump to transcript reference line ${c}`}
                          >
                            {c}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Custom Sections */}
            {data.summary.sections?.map((sect, sIdx) => (
              <div key={sIdx} className={styles.section}>
                <h3 className={styles.sectionTitle}>{sect.title}</h3>
                <ul className={styles.bulletList}>
                  {sect.bullets?.map((bullet, bIdx) => (
                    <li key={bIdx} className={styles.bulletItem}>
                      {bullet.text}
                      {bullet.citations?.map((c) => (
                        <span 
                          key={c} 
                          className={styles.citation}
                          onClick={() => handleCitationClick(c)}
                          title={`Jump to transcript reference line ${c}`}
                        >
                          {c}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {activeTab === "notes" && (
          <div 
            style={{ color: "#d1d5db", fontSize: "14px", lineHeight: "1.6" }}
            dangerouslySetInnerHTML={{ __html: data.notes }} 
          />
        )}

        {activeTab === "transcript" && (
          <div className={styles.transcriptList}>
            <div className={styles.transcriptHeader}>
               <button onClick={handleCopyTranscript} className={styles.actionBtn} style={{ marginBottom: "16px" }}>
                 <Copy size={13} /> Copy transcript
               </button>
            </div>
            {data.transcript?.map((line: any) => (
              <div 
                key={line.index}
                ref={(el) => { transcriptRefs.current[line.index] = el; }}
                className={`${styles.transcriptLine} ${highlightedLine === line.index ? styles.highlightLine : ""}`}
              >
                <span className={styles.transcriptIndex}>{line.index}</span>
                <span className={styles.speakerName}>{line.speaker}</span>
                <span className={styles.speechText}>{line.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
