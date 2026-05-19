"use client";
import styles from './Views.module.css';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, useState } from 'react';

export default function TrashView() {
  const { deletedPages, restorePage, permanentlyDeletePage } = useAppStore();
  const [pages, setPages] = useState<any[]>([]);

  useEffect(() => {
    // Filter pages deleted less than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const validPages = Object.values(deletedPages).filter(page => {
      const deletedAt = new Date(page.deletedAt);
      return deletedAt > thirtyDaysAgo;
    });
    
    // Sort by most recently deleted
    validPages.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    
    setPages(validPages);
  }, [deletedPages]);

  const getDaysAgo = (dateStr: string) => {
    const deletedDate = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - deletedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div className={styles.viewTitleWrapper}>
          <Trash2 className={styles.viewIcon} size={24} />
          <h2>Trash</h2>
        </div>
      </div>

      <div className={styles.templatesNotice}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertTriangle size={16} />
          Pages in Trash are permanently deleted after 30 days.
        </div>
      </div>

      {pages.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '64px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑</div>
          <p>Trash is empty</p>
        </div>
      ) : (
        <div className={styles.emailList}>
          <div className={styles.logsHeader}>
            <div>Page</div>
            <div>Deleted</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>
          {pages.map(page => (
            <div key={page.id} className={styles.logRow}>
              <div className={styles.logName} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{page.icon || '📄'}</span>
                {page.title || 'Untitled'}
              </div>
              <div className={styles.logTime}>
                {getDaysAgo(page.deletedAt)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  className={styles.filterBtn}
                  onClick={() => restorePage(page.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={14} /> Restore
                </button>
                <button 
                  className={styles.filterBtn}
                  onClick={() => permanentlyDeletePage(page.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ff4d4d', borderColor: '#ff4d4d' }}
                >
                  <Trash2 size={14} /> Delete Forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
