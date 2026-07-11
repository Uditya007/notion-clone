'use client';

import { useState } from 'react';
import styles from './QuickCaptureHUD.module.css';

export default function QuickCaptureHUD() {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    if (!content.trim()) return;
    setStatus('saving');

    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Quick Capture - ${new Date().toLocaleDateString()}`,
          content: content
        })
      });

      if (res.ok) {
        setStatus('saved');
        setContent('');
        setTimeout(() => {
          setStatus('idle');
          if (typeof window !== 'undefined' && (window as any).electron) {
            // Option+Space HUD window can blur or hide automatically
          }
        }, 1500);
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>⚡ Quick Capture</span>
        {status === 'saving' && <span className={styles.badgeSaving}>Saving...</span>}
        {status === 'saved' && <span className={styles.badgeSaved}>Saved!</span>}
        {status === 'error' && <span className={styles.badgeError}>Error</span>}
      </div>
      <textarea
        className={styles.textarea}
        placeholder="Type a quick note, idea, or reminder..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSave();
          }
        }}
        autoFocus
      />
      <div className={styles.footer}>
        <span className={styles.shortcutText}>Press ⌘+Enter to save</span>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={!content.trim() || status === 'saving'}
        >
          Save Note
        </button>
      </div>
    </div>
  );
}
