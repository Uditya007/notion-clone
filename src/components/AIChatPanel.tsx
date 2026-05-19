import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './AIChatPanel.module.css';
import { Sparkles, MessageSquare, Plus } from 'lucide-react';

export default function AIChatPanel() {
  const { isAIPanelOpen, conversations, activeConversationId, setActiveConversation, createConversation } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Option/Alt + N for New Chat
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'n') {
        e.preventDefault();
        createConversation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createConversation]);

  if (!isAIPanelOpen && Object.keys(conversations).length === 0) return null; // Wait, actually it should collapse entirely

  // Grouping logic
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thirtyDaysAgo = today - 30 * 86400000;

  const groups = {
    'Today': [] as any[],
    'Yesterday': [] as any[],
    'Past 30 days': [] as any[],
    'Older': [] as any[]
  };

  Object.values(conversations)
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .forEach((conv: any) => {
      const time = new Date(conv.updatedAt).getTime();
      if (time >= today) groups['Today'].push(conv);
      else if (time >= yesterday) groups['Yesterday'].push(conv);
      else if (time >= thirtyDaysAgo) groups['Past 30 days'].push(conv);
      else groups['Older'].push(conv);
    });

  const getTimeAgo = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    const diff = Date.now() - time;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 30 * 86400000) return `${Math.floor(diff / 86400000)}d`;
    return new Date(dateStr).toLocaleString('default', { month: 'short' });
  };

  return (
    <div className={`${styles.container} ${!isAIPanelOpen ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={16} className={styles.headerIcon} />
          Clearspace AI
        </div>
        <button className={styles.newAgentBtn}>
          <Plus size={12} /> New agent
        </button>
      </div>

      <div className={styles.history}>
        {Object.entries(groups).map(([label, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={label} className={styles.group}>
              <div className={styles.groupLabel}>{label}</div>
              {items.map(conv => (
                <div 
                  key={conv.id} 
                  className={`${styles.convItem} ${activeConversationId === conv.id ? styles.activeConv : ''}`}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <MessageSquare size={14} className={styles.convIcon} />
                  <span className={styles.convTitle}>{conv.title || 'New Chat'}</span>
                  <span className={styles.convTime}>{getTimeAgo(conv.updatedAt)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <button className={styles.newChatBtn} onClick={() => createConversation()}>
          <span><Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}/> New chat</span>
          <span className={styles.newChatShortcut}>⌘⌥N</span>
        </button>
      </div>
    </div>
  );
}
