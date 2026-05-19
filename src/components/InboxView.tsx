"use client";
import styles from './InboxView.module.css';
import { Mail, Pencil, Paperclip, CornerUpLeft, X, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

type Email = {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  messageId: string;
  isRead: boolean;
  hasAttachment: boolean;
};

export default function InboxView() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [emailBody, setEmailBody] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isComposing, setIsComposing] = useState(false);
  const [isReplyExpanded, setIsReplyExpanded] = useState(false);
  
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchEmails = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/gmail/messages');
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchEmails();
    }
  }, [session]);

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email);
    setIsReplyExpanded(false);
    setReplyBody('');

    // Mark as read immediately in UI
    if (!email.isRead) {
      setEmails(emails.map(e => e.id === email.id ? { ...e, isRead: true } : e));
      // Mark as read in API
      fetch('/api/gmail/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: email.id, isRead: true })
      });
    }

    // Fetch full body
    setEmailBody('Loading content...');
    try {
      const res = await fetch(`/api/gmail/messages?id=${email.id}`);
      if (res.ok) {
        const data = await res.json();
        // Simple extraction for demo: text/html or text/plain
        const parts = data.payload?.parts || [];
        const htmlPart = parts.find((p: any) => p.mimeType === 'text/html');
        const textPart = parts.find((p: any) => p.mimeType === 'text/plain');
        
        let bodyContent = '';
        if (htmlPart && htmlPart.body?.data) {
          bodyContent = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        } else if (textPart && textPart.body?.data) {
          bodyContent = `<pre style="white-space: pre-wrap; font-family: inherit;">${Buffer.from(textPart.body.data, 'base64').toString('utf-8')}</pre>`;
        } else if (data.payload?.body?.data) {
          bodyContent = Buffer.from(data.payload.body.data, 'base64').toString('utf-8');
        } else {
          bodyContent = '<i>Unable to display email content.</i>';
        }
        setEmailBody(bodyContent);
      }
    } catch (e) {
      setEmailBody('Failed to load email content.');
    }
  };

  const handleSendEmail = async (isReply = false) => {
    setIsSending(true);
    try {
      const payload = isReply ? {
        to: selectedEmail?.from,
        subject: `Re: ${selectedEmail?.subject}`,
        body: replyBody,
        replyToMessageId: selectedEmail?.messageId,
        threadId: selectedEmail?.threadId
      } : {
        to: composeTo,
        subject: composeSubject,
        body: composeBody
      };

      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (isReply) {
          setIsReplyExpanded(false);
          setReplyBody('');
        } else {
          setIsComposing(false);
          setComposeTo('');
          setComposeSubject('');
          setComposeBody('');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Mail size={48} opacity={0.2} />
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Connect Gmail</h3>
          <p style={{ maxWidth: '300px', textAlign: 'center' }}>Sync your real inbox and manage emails inside Clearspace.</p>
          <button className={styles.connectBtn} onClick={() => signIn('google')}>Connect Google Account</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${selectedEmail ? styles.hasSelectedEmail : ''}`}>
      <div className={styles.leftPanel}>
        <div className={styles.toolbar}>
          <button className={styles.composeBtn} onClick={() => setIsComposing(true)}>
            <Pencil size={16} /> Compose
          </button>
          <div className={styles.filterTabs}>
            <button className={`${styles.filterTab} ${styles.active}`}>All</button>
            <button className={styles.filterTab}>Unread</button>
            <button className={styles.filterTab}>Starred</button>
          </div>
        </div>
        
        <div className={styles.emailList}>
          {isLoading && emails.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading emails...</div>
          ) : (
            emails.map(email => {
              const fromName = email.from.split('<')[0].replace(/"/g, '').trim();
              const dateObj = new Date(email.date);
              const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
              
              return (
                <div 
                  key={email.id} 
                  className={`${styles.emailItem} ${!email.isRead ? styles.unread : ''}`}
                  onClick={() => handleSelectEmail(email)}
                  style={{ backgroundColor: selectedEmail?.id === email.id ? 'var(--bg-active)' : '' }}
                >
                  <div className={styles.emailTop}>
                    <span className={styles.emailSender}>{fromName}</span>
                    <span className={styles.emailTime}>{dateStr}</span>
                  </div>
                  <div className={styles.emailSubject}>{email.subject}</div>
                  <div className={styles.emailSnippet}>{email.snippet}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.rightPanel}>
        {!selectedEmail ? (
          <div className={styles.emptyState}>
            <Mail size={48} opacity={0.1} />
            <p>Select an email to read</p>
          </div>
        ) : (
            <div className={styles.emailDetail}>
              <div className={styles.detailHeader}>
                <button 
                  className={styles.mobileBackBtn} 
                  onClick={() => setSelectedEmail(null)}
                >
                  ← Back to Inbox
                </button>
                <div className={styles.detailSubject}>{selectedEmail.subject}</div>
                <div className={styles.detailMeta}>
                  <div>
                    <div className={styles.detailSender}>{selectedEmail.from}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>to me</div>
                  </div>
                  <div className={styles.detailTime}>{new Date(selectedEmail.date).toLocaleString()}</div>
                </div>
              </div>
            
            <div className={styles.detailBody} dangerouslySetInnerHTML={{ __html: emailBody }} />
            
            <div className={styles.replyArea}>
              {!isReplyExpanded ? (
                <div className={styles.replyCollapsed} onClick={() => setIsReplyExpanded(true)}>
                  <CornerUpLeft size={16} />
                  Reply...
                </div>
              ) : (
                <div className={styles.replyExpanded}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Replying to {selectedEmail.from.split('<')[0]}
                  </div>
                  <textarea 
                    autoFocus
                    placeholder="Write your reply..."
                    className={styles.composeBody}
                    style={{ minHeight: '120px', padding: 0 }}
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px' }}>
                    <button 
                      className={styles.sendBtn} 
                      onClick={() => handleSendEmail(true)}
                      disabled={isSending || !replyBody.trim()}
                    >
                      {isSending ? 'Sending...' : 'Send'}
                    </button>
                    <button 
                      className={styles.iconBtn} 
                      style={{ padding: '8px 16px' }}
                      onClick={() => setIsReplyExpanded(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isComposing && (
        <div className={styles.composeModal}>
          <div className={styles.composeHeader}>
            <span>New Message</span>
            <div className={styles.composeActions}>
              <button className={styles.iconBtn} onClick={() => setIsComposing(false)}><X size={16} /></button>
            </div>
          </div>
          <input 
            className={styles.composeInput} 
            placeholder="To" 
            value={composeTo}
            onChange={e => setComposeTo(e.target.value)}
          />
          <input 
            className={styles.composeInput} 
            placeholder="Subject" 
            value={composeSubject}
            onChange={e => setComposeSubject(e.target.value)}
          />
          <textarea 
            className={styles.composeBody} 
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
          />
          <div className={styles.composeFooter}>
            <button 
              className={styles.sendBtn}
              onClick={() => handleSendEmail(false)}
              disabled={isSending || !composeTo.trim() || !composeBody.trim()}
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
