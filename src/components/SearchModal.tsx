"use client";
import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './Modals.module.css';
import { Search, FileText, X } from 'lucide-react';

export default function SearchModal() {
  const { isSearchOpen, setSearchOpen, pages, setActivePage } = useAppStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const filteredPages = Object.values(pages).filter(page => 
    page.title.toLowerCase().includes(query.toLowerCase()) || 
    (page.content && page.content.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className={styles.overlay} onClick={() => setSearchOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Search Workspace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={styles.closeBtn} onClick={() => setSearchOpen(false)}>
            <X size={16} />
          </button>
        </div>
        <div className={styles.searchResults}>
          {filteredPages.length === 0 ? (
            <div className={styles.noResults}>No results found.</div>
          ) : (
            <div className={styles.resultsList}>
              <div className={styles.resultsLabel}>Pages</div>
              {filteredPages.map(page => (
                <div 
                  key={page.id} 
                  className={styles.resultItem}
                  onClick={() => setActivePage(page.id)}
                >
                  <span className={styles.pageIcon}>{page.icon || <FileText size={16} />}</span>
                  <span className={styles.pageTitle}>{page.title || 'Untitled'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
