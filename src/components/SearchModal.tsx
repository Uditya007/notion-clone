"use client";

import { useEffect, useState, useRef } from 'react';
import { useAppStore, Page } from '@/store/useAppStore';
import styles from './Modals.module.css';
import { Search, FileText, X, Sparkles, AlertCircle } from 'lucide-react';
import { useCompletion } from '@ai-sdk/react';

export default function SearchModal() {
  const { isSearchOpen, setSearchOpen, setActivePage } = useAppStore();
  const [pagesList, setPagesList] = useState<Page[]>([]);
  const [query, setQuery] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
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

  const { complete, completion, isLoading, setCompletion } = useCompletion({
    api: '/api/search/qa',
    streamProtocol: 'text',
  });

  useEffect(() => {
    if (isSearchOpen) {
      fetchPages();
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
      setIsAiMode(false);
      setCompletion('');
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

  const triggerAiSearch = async () => {
    if (!query.trim()) return;
    setIsAiMode(true);
    setCompletion('');
    await complete(query);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey) {
        triggerAiSearch();
      }
    }
  };

  if (!isSearchOpen) return null;

  const filteredPages = pagesList.filter((page: Page) => 
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
            placeholder="Search workspace or ask AI... (Press Ctrl+Enter for AI Answer)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (isAiMode) {
                setIsAiMode(false);
                setCompletion('');
              }
            }}
            onKeyDown={handleInputKeyDown}
          />
          {query.trim() && (
            <button 
              className={styles.aiSearchTriggerBtn} 
              onClick={triggerAiSearch}
              title="Ask Cora AI to answer based on workspace context"
            >
              <Sparkles size={14} className={styles.sparkleIcon} />
              <span>Ask AI</span>
            </button>
          )}
          <button className={styles.closeBtn} onClick={() => setSearchOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className={styles.searchResults}>
          {isAiMode ? (
            <div className={styles.aiContainer}>
              <div className={styles.aiHeader}>
                <Sparkles size={16} className={styles.aiHeaderSparkle} />
                <span className={styles.aiHeaderTitle}>Cora AI Workspace Answer</span>
              </div>
              <div className={styles.aiBody}>
                {completion ? (
                  <div className={styles.aiText} dangerouslySetInnerHTML={{ 
                    __html: completion
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br />')
                  }} />
                ) : isLoading ? (
                  <div className={styles.aiSearchingState}>
                    <span className={styles.pulsingOrb} />
                    Analyzing workspace documents and generating response...
                  </div>
                ) : (
                  <div className={styles.aiEmptyText}>Type a question and ask Cora AI!</div>
                )}
                {isLoading && <span className={styles.aiCursorDot} />}
              </div>
              <div className={styles.aiFooter}>
                <AlertCircle size={12} />
                Grounded in your workspace documents
              </div>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className={styles.noResults}>No matching pages found. Try asking Cora AI instead!</div>
          ) : (
            <div className={styles.resultsList}>
              <div className={styles.resultsLabel}>Matching Pages</div>
              {filteredPages.map((page: Page) => (
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
