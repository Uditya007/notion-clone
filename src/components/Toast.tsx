"use client";

import React from 'react';
import { useAppStore, Toast as ToastItem } from '@/store/useAppStore';
import styles from './Toast.module.css';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  const renderIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className={styles.successIcon} size={18} />;
      case 'error':
        return <AlertCircle className={styles.errorIcon} size={18} />;
      case 'warning':
        return <AlertTriangle className={styles.warningIcon} size={18} />;
      case 'info':
      default:
        return <Info className={styles.infoIcon} size={18} />;
    }
  };

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`${styles.toast} ${styles[toast.type]}`}
        >
          {renderIcon(toast.type)}
          <span className={styles.toastText}>{toast.message}</span>
          <button 
            className={styles.toastClose} 
            onClick={() => removeToast(toast.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
