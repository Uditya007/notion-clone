"use client";

import React, { useState } from "react";
import styles from "./SopDocumentView.module.css";
import {
  Check,
  Sparkles,
  ShieldCheck,
  FileText,
  Clock,
  UserCheck,
  BookOpen
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface SopStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export default function SopDocumentView({ pageTitle }: { pageTitle?: string }) {
  const { addToast, setDocAIPanelOpen } = useAppStore();

  const title = pageTitle || "Standard Operating Procedure (SOP)";
  const [steps, setSteps] = useState<SopStep[]>([
    {
      id: 1,
      title: "Step 1: Authorization & Identity Verification",
      description: "Ensure the requesting party has completed multi-factor authentication and holds appropriate IAM clearance.",
      completed: true
    },
    {
      id: 2,
      title: "Step 2: Pre-Execution Environment Safety Audit",
      description: "Check production telemetry dashboard and confirm no active Sev-1 or Sev-2 incidents are underway.",
      completed: true
    },
    {
      id: 3,
      title: "Step 3: Execute Core Protocol & Log Evidence",
      description: "Run the approved procedure script and attach audit logs directly to the compliance tracking ticket.",
      completed: false
    },
    {
      id: 4,
      title: "Step 4: Peer Review & Sign-Off Verification",
      description: "Obtain digital confirmation from lead engineer or HR compliance officer within 24 hours.",
      completed: false
    }
  ]);

  const completedCount = steps.filter(s => s.completed).length;

  const toggleStep = (id: number) => {
    setSteps(prev =>
      prev.map(s => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
    addToast("Updated compliance checklist step", "info");
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconBadge}>📜</div>
          <div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>Verified organizational policy, execution steps & compliance protocol</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setDocAIPanelOpen(true)}
            style={{
              background: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              color: "#c084fc",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Sparkles size={15} /> AI SOP Optimizer
          </button>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className={styles.metadataBar}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Document Version</span>
          <span className={styles.metaValue}>Rev 3.4 (July 2026)</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Compliance Owner</span>
          <span className={styles.metaValue}>Governance & Ops Team</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>SLA Audit Cycle</span>
          <span className={styles.metaValue}>Quarterly Mandatory</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Status</span>
          <span
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16,185,129,0.3)",
              padding: "2px 10px",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 600
            }}
          >
            Approved & Active
          </span>
        </div>
      </div>

      {/* Interactive Checklist */}
      <div className={styles.checklistCard}>
        <div className={styles.checklistTitle}>
          <span>Interactive Protocol Compliance Checklist</span>
          <span style={{ fontSize: "0.85rem", color: "#9ca3af", fontWeight: 500 }}>
            {completedCount} of {steps.length} steps completed
          </span>
        </div>

        <div className={styles.checklistItems}>
          {steps.map(s => (
            <div
              key={s.id}
              className={styles.checklistItem}
              onClick={() => toggleStep(s.id)}
            >
              <div className={`${styles.checkbox} ${s.completed ? styles.checkboxChecked : ""}`}>
                {s.completed && <Check size={12} />}
              </div>
              <div className={styles.itemContent}>
                <span className={`${styles.itemTitle} ${s.completed ? styles.itemTitleDone : ""}`}>
                  {s.title}
                </span>
                <span className={styles.itemDesc}>{s.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Content */}
      <div className={styles.docContent}>
        <h2 className={styles.docHeading}>1. Purpose & Scope</h2>
        <p className={styles.docText}>
          This Standard Operating Procedure defines the mandatory workflows and execution guidelines across organizational departments. Adherence to this protocol is required for all full-time employees, contractors, and automated service agents to ensure operational consistency, security, and audit compliance.
        </p>

        <h2 className={styles.docHeading}>2. Responsibilities & Escalation Matrix</h2>
        <p className={styles.docText}>
          Primary responsibility rests with the designated duty engineer and compliance lead. Should any step in the interactive checklist encounter a blocker or policy conflict, immediately escalate via the Operations Command Center or notify the incident response lead.
        </p>
      </div>
    </div>
  );
}
