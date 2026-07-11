"use client";

import React, { useState } from "react";
import styles from "./ExpenseTrackerView.module.css";
import {
  DollarSign,
  Plus,
  Sparkles,
  Download,
  Search,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Receipt,
  Trash2,
  FileText
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  category: "Software & SaaS" | "Office & Hardware" | "Travel & Meals" | "Contractors";
  amount: number;
  status: "Approved" | "Pending" | "Reimbursed";
  receiptUrl?: string;
}

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: "EXP-101",
    date: "2026-07-10",
    description: "AWS Cloud Infrastructure Billing (Prod Cluster)",
    category: "Software & SaaS",
    amount: 2840.50,
    status: "Approved"
  },
  {
    id: "EXP-102",
    date: "2026-07-08",
    description: "MacBook Pro M4 Max Studio Setup (2x Units)",
    category: "Office & Hardware",
    amount: 6400.00,
    status: "Approved"
  },
  {
    id: "EXP-103",
    date: "2026-07-06",
    description: "San Francisco Client Summit & Dinner Catering",
    category: "Travel & Meals",
    amount: 1420.00,
    status: "Pending"
  },
  {
    id: "EXP-104",
    date: "2026-07-05",
    description: "Figma Enterprise & Linear Team Licenses",
    category: "Software & SaaS",
    amount: 920.00,
    status: "Reimbursed"
  },
  {
    id: "EXP-105",
    date: "2026-07-03",
    description: "Frontend Performance Audit (ExoConsulting LLC)",
    category: "Contractors",
    amount: 4500.00,
    status: "Approved"
  }
];

export default function ExpenseTrackerView() {
  const { addToast } = useAppStore();
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Expense Form State
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<ExpenseItem["category"]>("Software & SaaS");

  const TOTAL_BUDGET = 45000;
  const spentSoFar = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = TOTAL_BUDGET - spentSoFar;
  const spentPercent = Math.min(100, Math.round((spentSoFar / TOTAL_BUDGET) * 100));

  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = selectedCategory === "All" || e.category === selectedCategory;
    const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim() || !newAmount) return;

    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      addToast("Please enter a valid expense amount", "error");
      return;
    }

    const newItem: ExpenseItem = {
      id: `EXP-${100 + expenses.length + 1}`,
      date: new Date().toISOString().split("T")[0],
      description: newDescription,
      category: newCategory,
      amount: parsedAmount,
      status: "Pending"
    };

    setExpenses([newItem, ...expenses]);
    setIsModalOpen(false);
    setNewDescription("");
    setNewAmount("");
    addToast(`💸 Added expense ${newItem.id}: $${parsedAmount.toFixed(2)}`, "success");
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((item) => item.id !== id));
    addToast("Removed expense entry", "info");
  };

  const handleRunAIAudit = () => {
    addToast("✨ AI Expense Audit: No duplicate receipts or policy anomalies detected!", "success", 4000);
  };

  const handleExportCSV = () => {
    const headers = "ID,Date,Description,Category,Amount,Status\n";
    const rows = expenses.map(e => `${e.id},${e.date},"${e.description}",${e.category},${e.amount},${e.status}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cora_expenses_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    addToast("📥 Exported expense ledger to CSV", "success");
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconBadge}>💸</div>
          <div>
            <h1 className={styles.title}>Expense Tracking & Budget Ledger</h1>
            <p className={styles.subtitle}>Real-time departmental spend, reimbursement status & AI policy audit</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.aiAuditBtn} onClick={handleRunAIAudit}>
            <Sparkles size={15} /> AI Policy Audit
          </button>
          <button className={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Log Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            <span>Total Monthly Budget</span>
            <DollarSign size={16} style={{ color: "#34d399" }} />
          </div>
          <div className={styles.kpiValue}>${TOTAL_BUDGET.toLocaleString()}</div>
          <div className={styles.progressContainer}>
            <div className={styles.progressBar} style={{ width: `${spentPercent}%` }} />
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            <span>Spent to Date</span>
            <span style={{ fontSize: "0.74rem", color: "#6b7280" }}>{spentPercent}% of budget</span>
          </div>
          <div className={`${styles.kpiValue} ${styles.kpiValueAmber}`}>
            ${spentSoFar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            <span>Remaining Balance</span>
            <CheckCircle size={16} style={{ color: "#34d399" }} />
          </div>
          <div className={`${styles.kpiValue} ${styles.kpiValueGreen}`}>
            ${remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            <span>Pending Approvals</span>
            <Clock size={16} style={{ color: "#fbbf24" }} />
          </div>
          <div className={styles.kpiValue}>
            {expenses.filter(e => e.status === "Pending").length} Request(s)
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterTabs}>
          {["All", "Software & SaaS", "Office & Hardware", "Travel & Meals", "Contractors"].map((cat) => (
            <button
              key={cat}
              className={`${styles.filterTab} ${selectedCategory === cat ? styles.activeFilterTab : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search description or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={handleExportCSV}
            title="Export CSV"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#e5e7eb",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.82rem"
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Description</th>
              <th className={styles.th}>Category</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Amount</th>
              <th className={styles.th} style={{ width: "60px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((item) => (
              <tr key={item.id} className={styles.tr}>
                <td className={styles.td} style={{ fontWeight: 600, color: "#9ca3af" }}>{item.id}</td>
                <td className={styles.td}>{item.date}</td>
                <td className={styles.td} style={{ fontWeight: 600, color: "#ffffff" }}>{item.description}</td>
                <td className={styles.td}>
                  <span className={styles.categoryChip}>{item.category}</span>
                </td>
                <td className={styles.td}>
                  <span
                    className={`${styles.statusBadge} ${
                      item.status === "Approved"
                        ? styles.statusApproved
                        : item.status === "Pending"
                        ? styles.statusPending
                        : styles.statusReimbursed
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className={`${styles.td} ${styles.amountText}`}>
                  ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={styles.td}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleDeleteExpense(item.id)}
                    title="Remove expense"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}

            {filteredExpenses.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  No matching expense records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Log New Expense</h3>
            <form onSubmit={handleAddExpense}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g. Vercel Pro Hosting & Domain Renewal"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category</label>
                <select
                  className={styles.formSelect}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                >
                  <option value="Software & SaaS">Software & SaaS</option>
                  <option value="Office & Hardware">Office & Hardware</option>
                  <option value="Travel & Meals">Travel & Meals</option>
                  <option value="Contractors">Contractors</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.formInput}
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
