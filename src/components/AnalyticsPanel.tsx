"use client";

import { useEffect, useState } from "react";
import styles from "./AnalyticsPanel.module.css";
import { X, Clock, FileText, CheckCircle2, Calendar, Edit3, ArrowRight } from "lucide-react";

interface AnalyticsPanelProps {
  pageId: string;
  onClose: () => void;
}

interface AnalyticsData {
  wordCount: number;
  charCount: number;
  readTime: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRatio: number;
  activityTimeline: Array<{ date: string; count: number }>;
  recentEdits: Array<{
    id: string;
    userEmail: string;
    actionType: string;
    createdAt: string;
  }>;
}

export default function AnalyticsPanel({ pageId, onClose }: AnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/pages/${pageId}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load document analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [pageId]);

  if (loading) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.header}>
          <span className={styles.title}>Document Analytics</span>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <span>Calculating metrics...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calculate SVG circular progress parameters
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.taskCompletionRatio / 100) * circumference;

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.title}>Document Analytics</span>
        <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
      </div>

      <div className={styles.content}>
        {/* Core Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
              <Clock size={16} />
            </div>
            <div className={styles.statDetails}>
              <span className={styles.statVal}>{data.readTime} min</span>
              <span className={styles.statLbl}>Read Time</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <FileText size={16} />
            </div>
            <div className={styles.statDetails}>
              <span className={styles.statVal}>{data.wordCount}</span>
              <span className={styles.statLbl}>Total Words</span>
            </div>
          </div>
        </div>

        {/* Circular Progress Task Completeness Card */}
        <div className={styles.ratioCard}>
          <div style={{ position: "relative", width: "90px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: "rotate(-90deg)" }}>
              <circle
                cx="45"
                cy="45"
                r={radius}
                fill="transparent"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="6"
              />
              <circle
                cx="45"
                cy="45"
                r={radius}
                fill="transparent"
                stroke={data.taskCompletionRatio === 100 ? "#10b981" : "#8b5cf6"}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                {data.taskCompletionRatio}%
              </span>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={16} style={{ color: "#10b981" }} />
              Checklist Completeness
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {data.completedTasks} of {data.totalTasks} tasks resolved inside this canvas document.
            </span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* 30-Day Grid Activity Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Calendar size={15} style={{ color: "var(--text-muted)" }} />
            <span>30-Day Activity Heatmap</span>
          </div>
          <p className={styles.sectionDesc}>Shading density reflects edit frequency timeline.</p>
          
          <div className={styles.gridContainer}>
            {data.activityTimeline.map((day) => {
              // Calculate HSL shade density based on active updates
              let opacity = 0.05;
              if (day.count > 0) opacity = Math.min(0.2 + day.count * 0.2, 0.95);
              const color = day.count > 0 
                ? `rgba(139, 92, 246, ${opacity})` 
                : "rgba(255, 255, 255, 0.05)";
              const border = day.count > 0 
                ? "1px solid rgba(139, 92, 246, 0.3)" 
                : "1px solid rgba(255, 255, 255, 0.03)";

              return (
                <div
                  key={day.date}
                  className={styles.gridSquare}
                  style={{ backgroundColor: color, border }}
                  title={`${day.date}: ${day.count} modification${day.count === 1 ? "" : "s"}`}
                />
              );
            })}
          </div>
          <div className={styles.gridLegend}>
            <span>Less</span>
            <div className={styles.legendSquare} style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }} />
            <div className={styles.legendSquare} style={{ backgroundColor: "rgba(139, 92, 246, 0.2)" }} />
            <div className={styles.legendSquare} style={{ backgroundColor: "rgba(139, 92, 246, 0.5)" }} />
            <div className={styles.legendSquare} style={{ backgroundColor: "rgba(139, 92, 246, 0.85)" }} />
            <span>More</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Recent Audit logs timeline */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Edit3 size={15} style={{ color: "var(--text-muted)" }} />
            <span>Recent Workspace Events</span>
          </div>
          
          <div className={styles.timeline}>
            {data.recentEdits.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "12.5px", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
                No active modifications recorded.
              </div>
            ) : (
              data.recentEdits.map((edit) => (
                <div key={edit.id} className={styles.timelineItem}>
                  <div className={styles.timelinePoint} />
                  <div className={styles.timelineContent}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.userLabel}>{edit.userEmail.split("@")[0]}</span>
                      <span className={styles.timeLabel}>
                        {new Date(edit.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className={styles.actionLabel}>
                      Modified page <strong style={{ color: "var(--text-main)" }}>{edit.actionType}</strong> property.
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
