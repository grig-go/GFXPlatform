import React, { useState, useRef, useEffect } from 'react';
import styles from './styles.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Documentation context - key topics for the AI to reference
const DOCS_CONTEXT = `You are a helpful documentation assistant for Nova GFX and Pulsar GFX - professional broadcast graphics applications.

Nova GFX is a graphics designer for creating broadcast templates with:
- Elements: Text, Image, Shape, Video, Chart, Map, Countdown, Ticker, Table, Icon, SVG, Lottie animations
- Animation system with keyframes, easing, and animation phases (in, loop, out)
- Template layers for organizing graphics
- AI-powered design assistance
- Real-time preview

Pulsar GFX is a playout controller for:
- Managing channels and layers
- Creating and controlling playlists
- Live playout with keyboard shortcuts (F1-F4, Space, Arrow keys)
- Content editing and data binding
- Multi-channel output

Key concepts:
- Templates contain elements with animations
- Pages are instances of templates with custom content
- Playlists organize pages for sequential or timed playback
- Channels connect to video outputs/players
- Data bindings connect template fields to external data sources

Always provide helpful, accurate answers based on the documentation. If you're unsure about something, say so and suggest where users might find more information.`;

export default function ChatBot(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build message history for context
      const messageHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // In dev, the plugin serves /ai-chat. In production, Netlify function serves /.netlify/functions/ai-chat
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiUrl = isDev ? '/ai-chat' : '/.netlify/functions/ai-chat';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'claude',
          model: 'claude-3-5-haiku-20241022', // Fast model for chat
          systemPrompt: DOCS_CONTEXT,
          messages: [
            ...messageHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: userMessage },
          ],
          maxTokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Extract text from Claude response
      const assistantMessage = data.content?.[0]?.text || 'Sorry, I could not generate a response.';

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again later.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button - Vertical tab on left edge */}
      {!isOpen && (
        <button
          className={styles.chatToggle}
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Helper"
        >
          <svg className={styles.toggleIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          <span className={styles.toggleText}>AI Helper</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <div className={styles.chatTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <span>AI Helper</span>
            </div>
            <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className={styles.chatMessages}>
            {messages.length === 0 && (
              <div className={styles.welcomeMessage}>
                <p>Hi! I'm your documentation assistant for Nova GFX and Pulsar GFX.</p>
                <p>Ask me anything about:</p>
                <ul>
                  <li>Creating templates and elements</li>
                  <li>Animation and keyframes</li>
                  <li>Playlists and playout</li>
                  <li>Keyboard shortcuts</li>
                  <li>Data bindings</li>
                </ul>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${
                  message.role === 'user' ? styles.userMessage : styles.assistantMessage
                }`}
              >
                <div className={styles.messageContent}>{message.content}</div>
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.assistantMessage}`}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.chatInput}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              rows={1}
              disabled={isLoading}
            />
            <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
