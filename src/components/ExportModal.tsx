"use client";

import styles from './Modals.module.css';
import { X, Download, Code, Palette, Printer } from 'lucide-react';

interface ExportModalProps {
  pageId: string;
  pageTitle: string;
  pageIcon?: string;
  onClose: () => void;
}

export default function ExportModal({ pageId, pageTitle, pageIcon, onClose }: ExportModalProps) {
  const triggerExport = (format: 'markdown' | 'html') => {
    // Directly trigger file download via route
    window.open(`/api/pages/${pageId}/export?format=${format}`, '_blank');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.shareModal} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{pageIcon || '📄'}</span>
            <h3 style={{ margin: 0 }}>Export Document</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.shareContent} style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'var(--text-muted)' }}>
            Choose a format to export the document <strong>"{pageTitle || 'Untitled'}"</strong>.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Markdown option */}
            <div 
              onClick={() => triggerExport('markdown')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--white)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--gray-100)',
                  color: 'var(--black)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Code size={20} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Markdown (.md)</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Great for code, blogs, and other developers.</span>
              </div>
              <Download size={16} style={{ color: 'var(--text-muted)' }} />
            </div>

            {/* High-Fidelity HTML / PDF */}
            <div 
              onClick={() => triggerExport('html')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--white)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--gray-100)',
                  color: 'var(--black)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Palette size={20} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>High-Fidelity HTML (.html)</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Perfect for offline sharing or printing as styled PDF reports.</span>
              </div>
              <Download size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 24px' }}>
          <button 
            className={styles.publishBtn} 
            onClick={() => triggerExport('html')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', backgroundColor: 'var(--black)', color: 'var(--white)', border: 'none' }}
          >
            <Printer size={14} />
            <span>Generate & Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
