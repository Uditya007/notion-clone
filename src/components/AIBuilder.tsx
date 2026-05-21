"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Wand2 } from 'lucide-react';
import styles from './AIBuilder.module.css';
import { useAppStore } from '@/store/useAppStore';

interface AIBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLE_PILLS = [
  "Product launch plan",
  "Startup CRM",
  "Content calendar",
  "Hiring pipeline",
  "Personal life OS",
  "Agency client management",
  "E-commerce store operations",
  "SaaS company wiki",
  "GST & finance tracker",
  "YouTube creator workspace"
];

const STEPS = [
  "✦ Understanding your needs...",
  "✦ Designing structure...",
  "✦ Creating pages...",
  "✦ Building databases...",
  "✦ Adding sample data..."
];

export default function AIBuilder({ isOpen, onClose }: AIBuilderProps) {
  const [description, setDescription] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { setActivePage } = useAppStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBuilding) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 3000);
    } else {
      setCurrentStepIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBuilding]);

  if (!isOpen) return null;

  const handleBuild = async () => {
    if (!description.trim()) return;
    setIsBuilding(true);
    setError(null);
    setCurrentStepIndex(0);

    try {
      const response = await fetch('/api/workspace-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to construct workspace');
      }

      // Workspace ready! Redirect
      if (data.firstPageId) {
        setActivePage(data.firstPageId);
        alert(`✦ Workspace ready! Created ${data.createdCount} pages.`);
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while building the workspace.');
      setIsBuilding(false);
    }
  };

  const handlePillClick = (pill: string) => {
    setDescription(`Build a workspace for a ${pill.toLowerCase()}. Include pages, templates, and database schemas with columns and sample data suited for this setup.`);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <Sparkles className={styles.titleIcon} size={20} />
            <h3>✦ AI Workspace Builder</h3>
          </div>
          {!isBuilding && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          )}
        </div>

        {isBuilding ? (
          <div className={styles.loadingPanel}>
            <div className={styles.spinnerWrapper}>
              <div className={styles.spinnerRing} />
              <Wand2 className={styles.spinnerSparkle} size={32} />
            </div>
            
            <div className={styles.stepsWrapper}>
              {STEPS.map((step, index) => {
                let stepClass = styles.stepItem;
                if (index === currentStepIndex) {
                  stepClass = `${styles.stepItem} ${styles.stepActive}`;
                } else if (index < currentStepIndex) {
                  stepClass = `${styles.stepItem} ${styles.stepCompleted}`;
                }
                return (
                  <div key={index} className={stepClass}>
                    <div className={styles.stepIcon} />
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.content}>
              <div className={styles.textareaWrapper}>
                <label htmlFor="workspace-desc">Describe your ideal workspace in plain English:</label>
                <textarea
                  id="workspace-desc"
                  className={styles.textarea}
                  placeholder="e.g. A content creator workspace for a YouTube channel. Needs a database for scripting pipeline, page for video checklists, and sponsor tracking CRM database..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className={styles.pillsWrapper}>
                <span className={styles.pillsLabel}>Or choose an example:</span>
                <div className={styles.pillsGrid}>
                  {EXAMPLE_PILLS.map((pill) => (
                    <button
                      key={pill}
                      className={styles.pill}
                      onClick={() => handlePillClick(pill)}
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ color: 'var(--black)', fontSize: '13px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--gray-100)', fontWeight: 600 }}>
                  {error}
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <button
                className={styles.buildBtn}
                onClick={handleBuild}
                disabled={!description.trim()}
              >
                <Wand2 size={16} />
                <span>Build My Workspace</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
