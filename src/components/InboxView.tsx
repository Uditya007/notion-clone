"use client";
import styles from './Views.module.css';
import { Inbox, Mail, Reply, Trash2, Star, CheckSquare } from 'lucide-react';
import { useState } from 'react';

export default function InboxView() {
  const [emails, setEmails] = useState([
    { id: 1, sender: 'Alex Chen', subject: 'Product Roadmap Q3', preview: 'Here is the draft for the new Q3 roadmap. Let me know what you think...', time: '10:42 AM', read: false },
    { id: 2, sender: 'Notion Team', subject: 'Your weekly workspace summary', preview: 'You have 4 new notifications and 2 updates in your workspace.', time: 'Yesterday', read: true },
    { id: 3, sender: 'Sarah Smith', subject: 'Design assets for landing page', preview: 'Attached are the final Figma files for the new landing page.', time: 'Mon', read: true },
    { id: 4, sender: 'GitHub', subject: '[Note Taking App] Run failed', preview: 'Your recent commit failed the CI pipeline checks.', time: 'Mon', read: false },
  ]);

  const markRead = (id: number) => {
    setEmails(emails.map(e => e.id === id ? { ...e, read: true } : e));
  };

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div className={styles.viewTitleWrapper}>
          <Inbox className={styles.viewIcon} size={24} />
          <h2>Mail Inbox</h2>
        </div>
        <div className={styles.headerFilters}>
          <button className={`${styles.filterBtn} ${styles.active}`}>All</button>
          <button className={styles.filterBtn}>Unread</button>
        </div>
      </div>

      <div className={styles.emailList}>
        {emails.map(email => (
          <div 
            key={email.id} 
            className={`${styles.emailItem} ${email.read ? styles.emailRead : ''}`}
            onClick={() => markRead(email.id)}
          >
            <div className={styles.emailAvatar}>{email.sender.charAt(0)}</div>
            <div className={styles.emailContent}>
              <div className={styles.emailTop}>
                <span className={styles.emailSender}>{email.sender}</span>
                <span className={styles.emailTime}>{email.time}</span>
              </div>
              <div className={styles.emailSubject}>{email.subject}</div>
              <div className={styles.emailPreview}>{email.preview}</div>
            </div>
            <div className={styles.emailActions}>
              <button className={styles.actionIcon}><Star size={16} /></button>
              <button className={styles.actionIcon}><Reply size={16} /></button>
              <button className={styles.actionIcon}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
