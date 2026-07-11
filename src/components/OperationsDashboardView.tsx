"use client";

import React, { useState } from "react";
import styles from "./OperationsDashboardView.module.css";
import {
  Activity,
  Server,
  Cpu,
  Database,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  RefreshCw,
  Clock,
  Trash2
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface OperationalTask {
  id: string;
  title: string;
  service: string;
  assignee: string;
  priority: "High" | "Normal" | "Low";
  status: "In Progress" | "Completed" | "Pending";
}

export default function OperationsDashboardView() {
  const { addToast } = useAppStore();
  const [tasks, setTasks] = useState<OperationalTask[]>([
    {
      id: "OPS-201",
      title: "Automated Supabase PostgreSQL Read-Replica Failover Drill",
      service: "Database Cluster",
      assignee: "DevOps Lead",
      priority: "High",
      status: "In Progress"
    },
    {
      id: "OPS-202",
      title: "Gemini 2.5 Inference Edge Latency Optimization",
      service: "AI Engine",
      assignee: "AI Research Lead",
      priority: "Normal",
      status: "Completed"
    },
    {
      id: "OPS-203",
      title: "SSL Wildcard Certificate Rotation & Load Balancer Verification",
      service: "API Gateway",
      assignee: "Security Ops",
      priority: "High",
      status: "Pending"
    },
    {
      id: "OPS-204",
      title: "WhatsApp & Twilio Webhook Delivery Retries Audit",
      service: "Messaging Hub",
      assignee: "Integration Team",
      priority: "Normal",
      status: "Completed"
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newService, setNewService] = useState("API Gateway");
  const [newPriority, setNewPriority] = useState<"High" | "Normal" | "Low">("Normal");

  const handleRunDiagnostics = () => {
    addToast("⚙️ Running complete operational infrastructure diagnostics...", "info");
    setTimeout(() => {
      addToast("🟢 Diagnostics Complete: 4 clusters healthy, average latency 118ms", "success", 4000);
    }, 2000);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newItem: OperationalTask = {
      id: `OPS-${200 + tasks.length + 1}`,
      title: newTaskTitle,
      service: newService,
      assignee: "Ops Duty Engineer",
      priority: newPriority,
      status: "In Progress"
    };

    setTasks([newItem, ...tasks]);
    setIsModalOpen(false);
    setNewTaskTitle("");
    addToast(`✅ Logged operational ticket ${newItem.id}`, "success");
  };

  const handleDelete = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    addToast("Closed operational ticket", "info");
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.iconBadge}>📊</div>
          <div>
            <h1 className={styles.title}>System Operations & SLA Command Center</h1>
            <p className={styles.subtitle}>Live infrastructure telemetry, service availability & maintenance operations</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.runDiagnosticsBtn} onClick={handleRunDiagnostics}>
            <Activity size={15} /> Run System Diagnostics
          </button>
          <button className={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Log Ops Event
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div className={styles.statusBanner}>
        <div className={styles.statusLeft}>
          <div className={styles.pulseGreen} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#ffffff" }}>
              All Infrastructure Systems Operational
            </div>
            <div style={{ fontSize: "0.82rem", color: "#9ca3af" }}>
              Last telemetry sync: Just now • SLA Uptime: 99.98% (Current Month)
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "20px", color: "#d1d5db", fontSize: "0.85rem" }}>
          <div>
            <span style={{ color: "#9ca3af" }}>Avg API Latency: </span>
            <strong style={{ color: "#34d399" }}>118ms</strong>
          </div>
          <div>
            <span style={{ color: "#9ca3af" }}>Active Nodes: </span>
            <strong style={{ color: "#ffffff" }}>12 / 12</strong>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className={styles.servicesGrid}>
        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>🚀 Vercel Edge Router & API Gateway</span>
            <span className={styles.servicePill}>Operational</span>
          </div>
          <div className={styles.serviceMetrics}>
            <span>Uptime: 100%</span>
            <span>Latency: 42ms</span>
          </div>
        </div>

        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>🗄️ Supabase PostgreSQL Primary Cluster</span>
            <span className={styles.servicePill}>Operational</span>
          </div>
          <div className={styles.serviceMetrics}>
            <span>Connections: 18 / 200</span>
            <span>Storage: 14.2 GB</span>
          </div>
        </div>

        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>🧠 Google Gemini 2.5 AI Engine</span>
            <span className={styles.servicePill}>Operational</span>
          </div>
          <div className={styles.serviceMetrics}>
            <span>Model: gemini-2.5-flash</span>
            <span>Avg Response: 480ms</span>
          </div>
        </div>

        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>💬 WhatsApp Webhook Ingestion Hub</span>
            <span className={styles.servicePill}>Operational</span>
          </div>
          <div className={styles.serviceMetrics}>
            <span>Delivery SLA: 99.99%</span>
            <span>Queue: 0 msgs</span>
          </div>
        </div>
      </div>

      {/* Operational Incidents & Maintenance Board */}
      <h2 className={styles.sectionTitle}>Active Maintenance & Operational Tasks</h2>
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Ticket ID</th>
              <th className={styles.th}>Task / Protocol Title</th>
              <th className={styles.th}>Target Service</th>
              <th className={styles.th}>Assignee</th>
              <th className={styles.th}>Priority</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th} style={{ width: "60px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className={styles.tr}>
                <td className={styles.td} style={{ fontWeight: 600, color: "#9ca3af" }}>{t.id}</td>
                <td className={styles.td} style={{ fontWeight: 600, color: "#ffffff" }}>{t.title}</td>
                <td className={styles.td}>{t.service}</td>
                <td className={styles.td}>{t.assignee}</td>
                <td className={`${styles.td} ${t.priority === "High" ? styles.priorityHigh : styles.priorityNormal}`}>
                  {t.priority}
                </td>
                <td className={styles.td}>
                  <span
                    style={{
                      background: t.status === "Completed" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                      color: t.status === "Completed" ? "#34d399" : "#60a5fa",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "0.76rem",
                      fontWeight: 600
                    }}
                  >
                    {t.status}
                  </span>
                </td>
                <td className={styles.td}>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer" }}
                    title="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.2rem", color: "#fff", marginTop: 0 }}>Log Operational Event</h3>
            <form onSubmit={handleAddTask}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Title / Protocol</label>
                <input
                  type="text"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    marginTop: "4px"
                  }}
                  placeholder="e.g. Cache Eviction Policy Update"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Service</label>
                <select
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#262626",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    marginTop: "4px"
                  }}
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                >
                  <option value="API Gateway">API Gateway</option>
                  <option value="Database Cluster">Database Cluster</option>
                  <option value="AI Engine">AI Engine</option>
                  <option value="Messaging Hub">Messaging Hub</option>
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "0.8rem", color: "#9ca3af" }}>Priority</label>
                <select
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#262626",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    marginTop: "4px"
                  }}
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px 14px", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "#3b82f6", border: "none", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
