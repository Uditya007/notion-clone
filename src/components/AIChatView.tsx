import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import styles from './AIChatView.module.css';
import { ArrowLeft, ArrowUp, Copy, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useCompletion } from '@ai-sdk/react';
import { v4 as uuidv4 } from 'uuid';

export default function AIChatView() {
  const { conversations, activeConversationId, setActiveConversation, addMessage } = useAppStore();
  const conv = activeConversationId ? conversations[activeConversationId] : null;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = useState('');

  const { complete, completion, isLoading, setCompletion } = useCompletion({
    api: '/api/generate',
    onFinish: (prompt, result) => {
      if (activeConversationId) {
        addMessage(activeConversationId, {
          id: uuidv4(),
          role: 'assistant',
          content: result,
          timestamp: new Date().toISOString()
        });
      }
      setCompletion('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages, completion]);

  if (!conv) return null;

  const handleSend = async (text: string, isPill = false) => {
    if (!text.trim() || isLoading) return;
    
    // Add user message
    addMessage(conv.id, {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    });

    if (!isPill) setInputText('');

    // Prepare context from past messages
    const historyContext = conv.messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    await complete(text, {
      body: {
        context: historyContext ? `Past conversation context:\n${historyContext}` : '',
        command: 'prompt' // standard chat prompt
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
    // A very basic markdown renderer for bold and codeblocks
    // In a real app, use react-markdown
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
          value={conv.title} 
          onChange={(e) => {
             // In a real app we'd update the title in the store, keeping it simple here
          }}
          readOnly
        />
      </div>

      <div className={styles.messages}>
        {conv.messages.map((msg) => (
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
          <button className={styles.pillBtn} onClick={() => handleSend("Please improve the writing of the following text: ", true)}>✦ Improve writing</button>
          <button className={styles.pillBtn} onClick={() => handleSend("Summarize the key points of the current page in bullet points", true)}>✦ Summarize</button>
          <button className={styles.pillBtn} onClick={() => handleSend("Extract all action items and tasks from the following text", true)}>✦ Find action items</button>
          <button className={styles.pillBtn} onClick={() => handleSend("Translate the following to French: ", true)}>✦ Translate</button>
        </div>
        
        <div className={styles.inputWrapper}>
          <textarea 
            className={styles.textarea}
            placeholder="Ask Clearspace AI anything..."
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
