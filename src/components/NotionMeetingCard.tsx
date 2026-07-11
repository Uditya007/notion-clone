"use client";

import React, { useState, useRef } from "react";
import styles from "./NotionMeetingCard.module.css";
import {
  Calendar,
  ChevronDown,
  FileEdit,
  SlidersHorizontal,
  Volume2,
  Copy,
  Mic,
  Square,
  Sparkles
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface NotionMeetingCardProps {
  pageTitle: string;
  onInsertMeetingNotes: (markdownContent: string) => void;
}

export default function NotionMeetingCard({
  pageTitle,
  onInsertMeetingNotes
}: NotionMeetingCardProps) {
  const { addToast } = useAppStore();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  const startTranscribing = () => {
    setIsTranscribing(true);
    setSecondsElapsed(0);
    addToast("🎙️ Started live meeting transcription...", "info");

    timerRef.current = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
  };

  const stopAndSummarize = () => {
    setIsTranscribing(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const generatedNotes = `
### 📋 Executive Summary
Meeting aligned on **${pageTitle || "Project Deliverables"}** execution roadmap, confirming key dates and operational responsibilities across product and design.

### 🎯 Key Decisions
1. **Public Beta Transition**: Approved immediate public beta rollout with desktop application launcher prominently accessible.
2. **Native Desktop UX**: Standardized window tab bar and Notion AI meeting companion block for all desktop users.

### ✅ Action Items
- [ ] **Engineering**: Finalize native desktop window tabs and Notion meeting card integration – *Assignee: Uditya*
- [ ] **Operations**: Monitor real-time transcription latency – *Assignee: Cora AI*
`;

    onInsertMeetingNotes(generatedNotes);
    addToast("✨ Synthesized meeting summary into document!", "success", 4000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.topRow}>
        <div className={styles.headerTitle}>
          <span className={styles.badgeIcon}>
            <Calendar size={15} />
          </span>
          <span>Meeting @Today</span>
          <ChevronDown size={14} style={{ color: "#71717a" }} />
        </div>
      </div>

      {/* Action Bar */}
      <div className={styles.controlsRow}>
        <button className={styles.notesTabBtn}>
          <FileEdit size={13} /> Notes
        </button>

        <div className={styles.rightControls}>
          <SlidersHorizontal size={15} style={{ color: "#71717a", cursor: "pointer" }} />
          {!isTranscribing ? (
            <button className={styles.transcribeBtn} onClick={startTranscribing}>
              <Mic size={14} /> Start transcribing
            </button>
          ) : (
            <button
              className={`${styles.transcribeBtn} ${styles.transcribingActive}`}
              onClick={stopAndSummarize}
            >
              <Square size={13} fill="currentColor" /> Stop & Summarize ({formatTime(secondsElapsed)})
            </button>
          )}
        </div>
      </div>

      {/* Subtext */}
      <div className={styles.subtext}>
        Notion AI will summarize the notes and transcript
      </div>

      {/* Footer */}
      <div className={styles.footerRow}>
        <div className={styles.instructionsSelect}>
          <span>Instructions: Auto</span>
          <ChevronDown size={12} />
        </div>
        <div className={styles.consentText}>
          Confirm everyone being transcribed has given consent. By starting...
        </div>
        <div className={styles.footerIcons}>
          <Volume2 size={14} />
          <Copy
            size={14}
            style={{ cursor: "pointer" }}
            onClick={() => addToast("Copied meeting block info", "info")}
          />
        </div>
      </div>
    </div>
  );
}
