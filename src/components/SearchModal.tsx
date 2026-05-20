"use client";

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './Modals.module.css';
import { Search, FileText, X } from 'lucide-react';

export default function SearchModal() {
  const { isSearchOpen, setSearchOpen, setActivePage } = useAppStore();
  const [pagesList, setPagesList] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/pages");
      if (res.ok) {
        const data = await res.json();
        setPagesList(data);
      }
    } catch (err) {
      console.error("Error fetching pages for search:", err);
    }
  };

  useEffect(() => {
    if (isSearchOpen) {
      fetchPages();
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
    }
  }, [isSearchOpen]);

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

  if (!isSearchOpen) return null;

  const filteredPages = pagesList.filter((page: any) => 
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
              {filteredPages.map((page: any) => (
                <div 
                  key={page.id} 
                  className={styles.resultItem}
                  onClick={() => {
                    setActivePage(page.id);
                    setSearchOpen(false);
                  }}
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
