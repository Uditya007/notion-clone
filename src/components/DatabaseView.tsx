"use client";

import { useState, useEffect } from 'react';
import styles from './DatabaseView.module.css';
import { Plus, Filter, ArrowUpDown, LayoutGrid, LayoutTemplate, LayoutList, Sparkles, Trash2 } from 'lucide-react';
import DatabaseRowModal from './DatabaseRowModal';
import { supabase } from '@/lib/supabase/client';
import { Database, Column, Row } from '@/store/useAppStore';

type AutomationRule = { id: string; db_id?: string; trigger_col_id?: string; trigger_val: string; action_type: string; action_config?: any; };

export default function DatabaseView({ dbId }: { dbId: string }) {
  const [db, setDb] = useState<Database | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Database Automations Panel States
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [automationsList, setAutomationsList] = useState<AutomationRule[]>([]);
  const [selectedColId, setSelectedColId] = useState('');
  const [triggerVal, setTriggerVal] = useState('');
  const [actionType, setActionType] = useState('email');
  const [actionConfigEmail, setActionConfigEmail] = useState('');
  const [actionConfigSummary, setActionConfigSummary] = useState('');
  const [isSavingRule, setIsSavingRule] = useState(false);

  const fetchDatabase = async () => {
    try {
      const res = await fetch(`/api/databases?pageId=${dbId}`);
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
    } catch (err) {
      console.error("Error fetching inline database:", err);
    }
  };

  const fetchAutomations = async () => {
    if (!db?.id) return;
    try {
      const res = await fetch(`/api/databases/automations?dbId=${db.id}`);
      if (res.ok) {
        const data = await res.json();
        setAutomationsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDatabase();

    const channelCols = supabase
      .channel(`realtime:db:cols:${dbId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'db_columns' }, () => {
        fetchDatabase();
      })
      .subscribe();

    const channelRows = supabase
      .channel(`realtime:db:rows:${dbId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'db_rows' }, () => {
        fetchDatabase();
      })
      .subscribe();

    const channelDb = supabase
      .channel(`realtime:db:${dbId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'databases', filter: `page_id=eq.${dbId}` }, () => {
        fetchDatabase();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelCols);
      supabase.removeChannel(channelRows);
      supabase.removeChannel(channelDb);
    };
  }, [dbId]);

  useEffect(() => {
    if (showAutomationModal && db?.id) {
      fetchAutomations();
    }
  }, [showAutomationModal, db?.id]);

  if (!db) return <div style={{ color: 'var(--text-muted)', padding: '16px' }}>Loading Database...</div>;

  const handleAddRow = async () => {
    try {
      const res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addRow', dbId: db.id, cells: {} }),
      });
      if (res.ok) {
        fetchDatabase();
      }
    } catch (err) {
      console.error("Error creating row:", err);
    }
  };

  const handleUpdateCell = async (rowId: string, columnId: string, value: string) => {
    setDb((prev: Database | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r: Row) => {
          if (r.id === rowId) {
            return {
              ...r,
              cells: { ...r.cells, [columnId]: value }
            };
          }
          return r;
        })
      };
    });

    try {
      await fetch('/api/databases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateCell', dbId: db.id, rowId, columnId, value }),
      });
    } catch (err) {
      console.error("Error updating cell:", err);
    }
  };

  const handleSetView = async (viewType: 'table' | 'board' | 'gallery') => {
    setDb((prev: Database | null) => prev ? { ...prev, view: viewType } : null);
    try {
      await fetch('/api/databases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setView', dbId: db.id, viewType }),
      });
    } catch (err) {
      console.error("Error updating view:", err);
    }
  };

  const handleCreateAutomationRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColId || !triggerVal.trim() || !actionType) return;

    setIsSavingRule(true);
    try {
      const config: any = {};
      if (actionType === 'email') config.emailTo = actionConfigEmail;
      if (actionType === 'calendar') config.calendarSummary = actionConfigSummary;

      const res = await fetch('/api/databases/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbId: db.id,
          triggerColId: selectedColId,
          triggerVal,
          actionType,
          actionConfig: config
        })
      });

      if (res.ok) {
        alert("✦ Automation rule created successfully!");
        setSelectedColId('');
        setTriggerVal('');
        setActionConfigEmail('');
        setActionConfigSummary('');
        fetchAutomations();
      } else {
        alert("Error creating automation rule.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/databases/automations?dbId=${db.id}&ruleId=${ruleId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAutomations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderTable = () => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {db.columns.map((col: Column) => (
              <th key={col.id} className={styles.th}>{col.name}</th>
            ))}
            <th className={styles.th} style={{ width: 40 }}><Plus size={14} /></th>
          </tr>
        </thead>
        <tbody>
          {db.rows.map((row: Row) => (
            <tr key={row.id}>
              {db.columns.map((col: Column, idx: number) => (
                <td key={col.id} className={`${styles.td} ${idx === 0 ? styles.titleCell : ''}`}>
                  <input
                    className={styles.cellInput}
                    value={row.cells[col.id] || ''}
                    onChange={(e) => handleUpdateCell(row.id, col.id, e.target.value)}
                    placeholder={idx === 0 ? 'Untitled' : ''}
                  />
                  {idx === 0 && (
                    <button className={styles.openBtn} onClick={() => setSelectedRowId(row.id)}>Open</button>
                  )}
                </td>
              ))}
              <td className={styles.td}></td>
            </tr>
          ))}
          <tr>
            <td colSpan={db.columns.length + 1}>
              <div className={styles.newRowBtn} onClick={handleAddRow}>
                <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> New row
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderBoard = () => {
    const selectCol = db.columns.find((c: Column) => c.type === 'select' || c.type === 'multiselect');
    const groups = selectCol?.options || ['No Status'];
    
    return (
      <div className={styles.boardWrapper}>
        {groups.map((group: string) => (
          <div key={group} className={styles.boardColumn}>
            <div className={styles.boardColHeader}>
              <span className={styles.pill}>{group}</span>
              <span>{db.rows.filter((r: Row) => {
                const cells = r.cells || {};
                const val = cells[selectCol?.id || ''];
                if (Array.isArray(val)) return val.includes(group);
                return val === group || (!selectCol && group === 'No Status');
              }).length}</span>
            </div>
            <div className={styles.boardCards}>
              {db.rows
                .filter((r: Row) => {
                  if (!selectCol) return group === 'No Status';
                  const val = r.cells[selectCol.id];
                  if (Array.isArray(val)) return val.includes(group);
                  return val === group;
                })
                .map((row: Row) => (
                  <div key={row.id} className={styles.boardCard} onClick={() => setSelectedRowId(row.id)}>
                    <div className={styles.cardTitle}>{row.cells[db.columns[0]?.id] || 'Untitled'}</div>
                  </div>
                ))}
            </div>
            <button className={styles.addCardBtn} onClick={handleAddRow}>+ Add card</button>
          </div>
        ))}
      </div>
    );
  };

  const renderGallery = () => (
    <div className={styles.galleryWrapper}>
      {db.rows.map((row: Row) => (
        <div key={row.id} className={styles.galleryCard} onClick={() => setSelectedRowId(row.id)}>
          <div className={styles.galleryCover}>
            <LayoutGrid size={24} opacity={0.2} />
          </div>
          <div className={styles.galleryContent}>
            <div className={styles.galleryTitle}>{row.cells[db.columns[0]?.id] || 'Untitled'}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const activeView = db.view || 'table';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.viewTabs}>
          <button 
            className={`${styles.tabBtn} ${activeView === 'table' ? styles.tabActive : ''}`}
            onClick={() => handleSetView('table')}
          >
            <LayoutList size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Table
          </button>
          <button 
            className={`${styles.tabBtn} ${activeView === 'board' ? styles.tabActive : ''}`}
            onClick={() => handleSetView('board')}
          >
            <LayoutTemplate size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Board
          </button>
          <button 
            className={`${styles.tabBtn} ${activeView === 'gallery' ? styles.tabActive : ''}`}
            onClick={() => handleSetView('gallery')}
          >
            <LayoutGrid size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Gallery
          </button>
        </div>
        <div className={styles.controls}>
          <button className={styles.controlBtn} onClick={() => setShowAutomationModal(true)}>
            <Sparkles size={14} /> Automate
          </button>
          <button className={styles.controlBtn}><Filter size={14} /> Filter</button>
          <button className={styles.controlBtn}><ArrowUpDown size={14} /> Sort</button>
          <button className={styles.primaryBtn} onClick={handleAddRow}>New</button>
        </div>
      </div>

      {activeView === 'table' && renderTable()}
      {activeView === 'board' && renderBoard()}
      {activeView === 'gallery' && renderGallery()}

      {selectedRowId && (
        <DatabaseRowModal 
          dbId={dbId} 
          rowId={selectedRowId} 
          onClose={() => setSelectedRowId(null)} 
        />
      )}

      {/* Database Automations Modal Form */}
      {showAutomationModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>
              <Sparkles size={20} className={styles.modalHeaderIcon} />
              Database Automations
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Configure automated triggers to execute specific AI recommendations or push updates directly to your calendar or mailbox.</p>
            
            {/* Active Rules list */}
            <span className={styles.modalSectionTitle}>Active Automation Rules</span>
            <div className={styles.rulesList}>
              {automationsList.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No active triggers configured. Build one below!</div>
              ) : (
                automationsList.map((rule: AutomationRule) => {
                  const targetColName = db.columns.find((c: Column) => c.id === rule.trigger_col_id)?.name || 'Column';
                  return (
                    <div key={rule.id} className={styles.ruleItem}>
                      <span className={styles.ruleText}>
                        When <strong>{targetColName}</strong> changes to <strong>"{rule.trigger_val}"</strong> → Execute <strong>{rule.action_type.toUpperCase()}</strong>
                      </span>
                      <button className={styles.ruleDeleteBtn} onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Create Trigger Rule Form */}
            <span className={styles.modalSectionTitle}>Add Automation Trigger</span>
            <form onSubmit={handleCreateAutomationRule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>When Column...</label>
                  <select 
                    className={styles.selectField}
                    value={selectedColId}
                    onChange={e => setSelectedColId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Column --</option>
                    {db.columns.map((c: Column) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Changes To Value...</label>
                  <input 
                    className={styles.inputField}
                    placeholder="e.g. Done, High, In Progress"
                    value={triggerVal}
                    onChange={e => setTriggerVal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Execute Action...</label>
                <select 
                  className={styles.selectField}
                  value={actionType}
                  onChange={e => setActionType(e.target.value)}
                  required
                >
                  <option value="email">📧 Send Email Alert</option>
                  <option value="calendar">📅 Add Google Calendar Task</option>
                  <option value="ai">🤖 Spawn Deep AI Analysis Page</option>
                </select>
              </div>

              {actionType === 'email' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Send Notification To Email</label>
                  <input 
                    className={styles.inputField}
                    type="email"
                    placeholder="e.g. manager@corp.com"
                    value={actionConfigEmail}
                    onChange={e => setActionConfigEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              {actionType === 'calendar' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Calendar Event Summary</label>
                  <input 
                    className={styles.inputField}
                    placeholder="e.g. Schedule meeting for task completion"
                    value={actionConfigSummary}
                    onChange={e => setActionConfigSummary(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className={styles.modalFooter}>
                <button type="button" className={styles.tabBtn} onClick={() => setShowAutomationModal(false)}>Close</button>
                <button 
                  type="submit" 
                  className={styles.primaryBtn}
                  disabled={isSavingRule}
                >
                  {isSavingRule ? 'Creating...' : 'Create Trigger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
