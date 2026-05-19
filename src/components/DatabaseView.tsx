import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './DatabaseView.module.css';
import { Plus, Filter, ArrowUpDown, LayoutGrid, LayoutTemplate, LayoutList, MoreHorizontal } from 'lucide-react';
import DatabaseRowModal from './DatabaseRowModal';

export default function DatabaseView({ dbId }: { dbId: string }) {
  const { databases, setDatabaseView, addRow, updateCell, addColumn } = useAppStore();
  const db = databases[dbId];
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  if (!db) return null;

  const handleAddRow = () => {
    addRow(dbId);
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
                    onChange={(e) => updateCell(dbId, row.id, col.id, e.target.value)}
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
    // Basic board: group by a select column, or if none, put all in one column
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.viewTabs}>
          <button 
            className={`${styles.tabBtn} ${db.view === 'table' ? styles.tabActive : ''}`}
            onClick={() => setDatabaseView(dbId, 'table')}
          >
            <LayoutList size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Table
          </button>
          <button 
            className={`${styles.tabBtn} ${db.view === 'board' ? styles.tabActive : ''}`}
            onClick={() => setDatabaseView(dbId, 'board')}
          >
            <LayoutTemplate size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Board
          </button>
          <button 
            className={`${styles.tabBtn} ${db.view === 'gallery' ? styles.tabActive : ''}`}
            onClick={() => setDatabaseView(dbId, 'gallery')}
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

      {db.view === 'table' && renderTable()}
      {db.view === 'board' && renderBoard()}
      {db.view === 'gallery' && renderGallery()}

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
