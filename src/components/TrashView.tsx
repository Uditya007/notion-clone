"use client";

import styles from './Views.module.css';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TrashView() {
  const [pages, setPages] = useState<any[]>([]);

  const fetchDeletedPages = async () => {
    try {
      const res = await fetch("/api/pages?deleted=true");
      if (res.ok) {
        const data = await res.json();
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const validPages = data.filter((page: any) => {
          const deletedAt = new Date(page.deleted_at || page.deletedAt || new Date());
          return deletedAt > thirtyDaysAgo;
        });
        
        validPages.sort((a: any, b: any) => new Date(b.deleted_at || b.deletedAt || new Date()).getTime() - new Date(a.deleted_at || a.deletedAt || new Date()).getTime());
        setPages(validPages);
      }
    } catch (err) {
      console.error("Error loading deleted pages:", err);
    }
  };

  useEffect(() => {
    fetchDeletedPages();

    const channel = supabase
      .channel('realtime:trash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        fetchDeletedPages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRestorePage = async (pageId: string) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_deleted: false, deleted_at: null }),
      });
      if (res.ok) {
        fetchDeletedPages();
      }
    } catch (err) {
      console.error("Error restoring page:", err);
    }
  };

  const handlePermanentlyDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to permanently delete this page? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/pages/${pageId}?permanent=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDeletedPages();
      }
    } catch (err) {
      console.error("Error permanently deleting page:", err);
    }
  };

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
                {getDaysAgo(page.deleted_at || page.deletedAt || new Date().toISOString())}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  className={styles.filterBtn}
                  onClick={() => handleRestorePage(page.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RotateCcw size={14} /> Restore
                </button>
                <button 
                  className={styles.filterBtn}
                  onClick={() => handlePermanentlyDeletePage(page.id)}
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
