"use client";

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './AIChatView.module.css';
import { ArrowLeft, ArrowUp, Copy, ThumbsDown, ThumbsUp, Sparkles } from 'lucide-react';
import { useCompletion } from '@ai-sdk/react';
import { supabase } from '@/lib/supabase/client';

export default function AIChatView() {
  const { activeConversationId, setActiveConversation, aiModel, setAIModel, addToast, setActivePage } = useAppStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [convTitle, setConvTitle] = useState('New Chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');
  const [isGrounded, setIsGrounded] = useState(true);
  
  // ... rest of the component state/handlers ...

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);

      const channel = supabase
        .channel(`realtime:messages:${activeConversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` }, (payload: any) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const { complete, completion, isLoading, setCompletion } = useCompletion({
    api: '/api/generate',
    streamProtocol: 'text',
    onFinish: async (prompt, result) => {
      // 1. Process Task creation
      const taskMatches = [...result.matchAll(/\[CREATE_TASK:\s*(.*?)\s*\|\s*(.*?)\s*\]/g)];
      for (const match of taskMatches) {
        const title = match[1];
        try {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
          });
          if (res.ok) {
            addToast(`✦ Task created: "${title}"`, "success");
          }
        } catch (e) {
          console.error("Error creating AI task:", e);
        }
      }

      // 2. Process Calendar Event creation
      const eventMatches = [...result.matchAll(/\[CREATE_EVENT:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/g)];
      for (const match of eventMatches) {
        const title = match[1];
        const start = match[2];
        const end = match[3];
        try {
          const res = await fetch('/api/google/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: title,
              start: { dateTime: start },
              end: { dateTime: end },
            }),
          });
          if (res.ok) {
            addToast(`✦ Event scheduled: "${title}"`, "success");
          }
        } catch (e) {
          console.error("Error creating AI Google Calendar event:", e);
        }
      }

      // 3. Process Page creation
      const pageMatches = [...result.matchAll(/\[CREATE_PAGE:\s*([\s\S]*?)\s*\|\s*([\s\S]*?)\s*\]/g)];
      for (const match of pageMatches) {
        const title = match[1];
        const content = match[2];
        try {
          const res = await fetch('/api/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content }),
          });
          if (res.ok) {
            const newPage = await res.json();
            addToast(`✦ Note created: "${title}"! Redirecting...`, "success");
            setTimeout(() => {
              setActivePage(newPage.id);
            }, 1000);
          }
        } catch (e) {
          console.error("Error creating AI page:", e);
        }
      }

      // 4. Process Gmail Send
      const emailMatches = [...result.matchAll(/\[SEND_EMAIL:\s*([\s\S]*?)\s*\|\s*([\s\S]*?)\s*\|\s*([\s\S]*?)\s*\]/g)];
      for (const match of emailMatches) {
        const to = match[1];
        const subject = match[2];
        const body = match[3];
        try {
          const res = await fetch('/api/gmail/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, body }),
          });
          if (res.ok) {
            addToast(`✦ Email successfully sent to ${to}`, "success");
          } else {
            addToast(`Could not send email to ${to}. Please check your Google Connection in Settings.`, "warning");
          }
        } catch (e) {
          console.error("Error sending AI email:", e);
          addToast(`Error trying to send email to ${to}`, "error");
        }
      }

      // Clean all tags from content before saving message to DB
      const cleanContent = result
        .replace(/\[CREATE_TASK:[\s\S]*?\]/g, '')
        .replace(/\[CREATE_EVENT:[\s\S]*?\]/g, '')
        .replace(/\[CREATE_PAGE:[\s\S]*?\]/g, '')
        .replace(/\[SEND_EMAIL:[\s\S]*?\]/g, '')
        .trim();

      if (activeConversationId) {
        try {
          const res = await fetch(`/api/conversations/${activeConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'assistant', content: cleanContent }),
          });
          if (res.ok) {
            const newMsg = await res.json();
            setMessages((prev) => [...prev, newMsg]);
          }
        } catch (e) {
          console.error("Error saving assistant message:", e);
        }
      }
      setCompletion('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, completion]);

  if (!activeConversationId) return null;

  const handleSend = async (text: string, isPill = false) => {
    if (!text.trim() || isLoading) return;
    
    try {
      const res = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: text }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (e) {
      console.error("Error saving user message:", e);
    }

    if (!isPill) setInputText('');

    const historyContext = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    await complete(text, {
      body: {
        context: historyContext ? `Past conversation context:\n${historyContext}` : '',
        command: 'prompt',
        grounded: isGrounded,
        model: aiModel
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputText);
    }
  };

  const renderMarkdown = (text: string) => {
    let cleanText = text
      .replace(/\[CREATE_TASK:[\s\S]*?\]/g, '')
      .replace(/\[CREATE_EVENT:[\s\S]*?\]/g, '')
      .replace(/\[CREATE_PAGE:[\s\S]*?\]/g, '')
      .replace(/\[SEND_EMAIL:[\s\S]*?\]/g, '')
      .trim();
    let html = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => setActiveConversation(null)}>
          <ArrowLeft size={18} />
        </button>
        <input 
          className={styles.titleInput} 
          value={convTitle} 
          onChange={(e) => setConvTitle(e.target.value)}
          readOnly
        />
        
        {/* Dynamic Model Selector directly inside AI Chat View */}
        <div className={styles.modelSelectorContainer}>
          <Sparkles size={13} className={styles.modelSelectorIcon} />
          <select 
            className={styles.modelSelect}
            value={aiModel}
            onChange={(e) => {
              setAIModel(e.target.value);
              const modelLabels: Record<string, string> = {
                'gemini-2.5-flash': 'Gemini 2.5 Flash',
                'gemini-2.5-pro': 'Gemini 2.5 Pro',
                'gemini-1.5-flash': 'Gemini 1.5 Flash',
                'gemini-1.5-pro': 'Gemini 1.5 Pro'
              };
              addToast(`✦ Model switched to ${modelLabels[e.target.value] || e.target.value}`, "success");
            }}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Smart)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((msg: any) => (
          <div key={msg.id} className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.assistantRow}`}>
            {msg.role === 'user' ? (
              <div className={styles.userBubble}>{msg.content}</div>
            ) : (
              <div className={styles.assistantWrapper}>
                <div className={styles.assistantText}>{renderMarkdown(msg.content)}</div>
                <div className={styles.assistantActions}>
                  <button className={styles.actionIconBtn} onClick={() => navigator.clipboard.writeText(msg.content)}><Copy size={14} /></button>
                  <button className={styles.actionIconBtn}><ThumbsUp size={14} /></button>
                  <button className={styles.actionIconBtn}><ThumbsDown size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && completion && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.assistantWrapper}>
              <div className={styles.assistantText}>{renderMarkdown(completion)}</div>
            </div>
          </div>
        )}
        
        {isLoading && !completion && (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <div className={styles.assistantText}>Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <div className={styles.pills}>
          <button 
            className={`${styles.pillBtn} ${isGrounded ? styles.pillBtnActive : ''}`} 
            onClick={() => setIsGrounded(!isGrounded)}
            title="Ask Cora to answer based on documents in your workspace"
          >
            <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} /> 
            {isGrounded ? 'Grounded in Workspace (ON)' : 'Grounded (OFF)'}
          </button>
          <button className={styles.pillBtn} onClick={() => handleSend("Please improve the writing of the following text: ", true)}>✦ Improve writing</button>
          <button className={styles.pillBtn} onClick={() => handleSend("Summarize the key points of the current page in bullet points", true)}>✦ Summarize</button>
          <button className={styles.pillBtn} onClick={() => handleSend("Extract all action items and tasks from the following text", true)}>✦ Find action items</button>
        </div>
        
        <div className={styles.inputWrapper}>
          <textarea 
            className={styles.textarea}
            placeholder="Ask Cora AI anything..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ height: inputText.split('\n').length > 1 ? `${Math.min(inputText.split('\n').length * 20, 100)}px` : '24px' }}
          />
          <button 
            className={styles.sendBtn} 
            onClick={() => handleSend(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
