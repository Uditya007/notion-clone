"use client";

import { useState, useEffect } from 'react';
import styles from './DatabaseView.module.css';
import { Plus, Filter, ArrowUpDown, LayoutGrid, LayoutTemplate, LayoutList } from 'lucide-react';
import DatabaseRowModal from './DatabaseRowModal';
import { supabase } from '@/lib/supabase/client';

export default function DatabaseView({ dbId }: { dbId: string }) {
  const [db, setDb] = useState<any>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

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
    setDb((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r: any) => {
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

  const handleSetView = async (viewType: string) => {
    setDb((prev: any) => prev ? { ...prev, view_type: viewType } : null);
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

  const renderTable = () => (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {db.columns.map((col: any) => (
              <th key={col.id} className={styles.th}>{col.name}</th>
            ))}
            <th className={styles.th} style={{ width: 40 }}><Plus size={14} /></th>
          </tr>
        </thead>
        <tbody>
          {db.rows.map((row: any) => (
            <tr key={row.id}>
              {db.columns.map((col: any, idx: number) => (
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
    const selectCol = db.columns.find((c: any) => c.type === 'select' || c.type === 'multiselect');
    const groups = selectCol?.options || ['No Status'];
    
    return (
      <div className={styles.boardWrapper}>
        {groups.map((group: any) => (
          <div key={group} className={styles.boardColumn}>
            <div className={styles.boardColHeader}>
              <span className={styles.pill}>{group}</span>
              <span>{db.rows.filter((r: any) => (r.cells[selectCol?.id || ''] || []).includes(group) || (!selectCol && group === 'No Status')).length}</span>
            </div>
            <div className={styles.boardCards}>
              {db.rows
                .filter((r: any) => {
                  if (!selectCol) return group === 'No Status';
                  const val = r.cells[selectCol.id];
                  if (Array.isArray(val)) return val.includes(group);
                  return val === group;
                })
                .map((row: any) => (
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
      {db.rows.map((row: any) => (
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

  const activeView = db.view_type || 'table';

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
    </div>
  );
}
