import { useEffect, useRef, useState } from 'react';
import { scanPageContext } from '../../utils/pageContext';
import ModalBackdrop from '../ModalBackdrop/ModalBackdrop';
import './ChatWidget.css';

function ChatIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8c-1.4 0-2.7-.3-3.8-.9L4 20l1.2-4.2A8 8 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M8 10h8M8 13.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

const STARTERS = ['Explain this page', 'How do I import my calendar?', 'Help me plan a lighter day'];
const HISTORY_STORAGE_KEY = 'odyssey-chat-history';
const HISTORY_LIMIT = 20;

function readHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved
      .map(item => {
        const title = item.title || item.question || 'Untitled chat';
        const messages = Array.isArray(item.messages) && item.messages.length > 0
          ? item.messages
          : (item.question && item.answer)
            ? [
                { id: 'u-1', role: 'user', text: item.question },
                { id: 'a-1', role: 'assistant', text: item.answer },
              ]
            : item.question
              ? [{ id: 'u-1', role: 'user', text: item.question }]
              : [];
        return {
          id: item.id || crypto.randomUUID(),
          title,
          messages,
          createdAt: item.createdAt || new Date().toISOString(),
          conversationId: item.conversationId || null,
        };
      })
      .filter(item => item.title && item.messages.length > 0)
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export default function ChatWidget({ activeIndex, source, forceClose = 0, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stopped, setStopped] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [context, setContext] = useState({ module: '', content: '' });
  const [configured, setConfigured] = useState(null);
  const [history, setHistory] = useState(readHistory);
  const [showHistory, setShowHistory] = useState(false);
  const conversation = useRef(null);
  const request = useRef(null);
  const cancellation = useRef(Promise.resolve());
  const pendingMessageId = useRef(null);
  const lastMessage = useRef('');
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => () => request.current?.controller.abort(), []);

  useEffect(() => {
    if (!open || closing) return;
    const controller = new AbortController();
    fetch('/chat/health', { signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setConfigured(data.configured === true))
      .catch(() => { if (!controller.signal.aborted) setConfigured(null); });
    inputRef.current?.focus();
    return () => controller.abort();
  }, [open, closing]);

  useEffect(() => {
    if (!open || closing) return;
    const canvas = document.querySelector('.canvas');
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setContext(scanPageContext(document, source)), 150);
    };
    refresh();
    canvas?.addEventListener('scroll', refresh, { passive: true });
    return () => { clearTimeout(timer); canvas?.removeEventListener('scroll', refresh); };
  }, [open, closing, activeIndex, source]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [open, messages, loading, error, stopped]);

  function close() {
    setClosing(true);
  }

  const [prevForceClose, setPrevForceClose] = useState(forceClose);
  if (forceClose !== prevForceClose) {
    setPrevForceClose(forceClose);
    if (open && !closing) {
      setClosing(true);
    }
  }

  useEffect(() => {
    onOpenChange?.(open && !closing);
  }, [open, closing, onOpenChange]);

  function handleAnimationEnd(e) {
    if (e.animationName === 'chatPanelExit') {
      setOpen(false);
      setClosing(false);
      launcherRef.current?.focus();
    }
  }

  function saveChatSession(chatId, title, updatedMessages, convId) {
    setHistory(previous => {
      const existingIndex = previous.findIndex(c => c.id === chatId);
      const now = new Date().toISOString();
      let updated;
      if (existingIndex >= 0) {
        const existing = previous[existingIndex];
        const updatedItem = {
          ...existing,
          title: existing.title || title,
          messages: updatedMessages,
          conversationId: convId !== undefined ? convId : (existing.conversationId || null),
          updatedAt: now,
        };
        updated = [updatedItem, ...previous.filter((_, i) => i !== existingIndex)].slice(0, HISTORY_LIMIT);
      } else {
        const newItem = {
          id: chatId,
          title: title || 'New chat',
          messages: updatedMessages,
          conversationId: convId || null,
          createdAt: now,
          updatedAt: now,
        };
        updated = [newItem, ...previous].slice(0, HISTORY_LIMIT);
      }
      try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Fallback if browser storage is unavailable
      }
      return updated;
    });
  }

  function loadChat(item) {
    if (loading) return;
    setCurrentChatId(item.id);
    setMessages(item.messages || []);
    conversation.current = item.conversationId || null;
    setError(null);
    setStopped(false);
    setShowHistory(false);
    inputRef.current?.focus();
  }

  function deleteChat(e, chatId) {
    e.stopPropagation();
    setHistory(previous => {
      const updated = previous.filter(item => item.id !== chatId);
      try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // storage fallback
      }
      return updated;
    });
    if (currentChatId === chatId) {
      newChat();
    }
  }

  async function send(text) {
    text = text.trim();
    if (!text || text.length > 2000 || request.current || configured === false) return;
    const scanned = includeContext ? scanPageContext(document, source) : { module: '', content: '' };
    setContext(scanned);
    const controller = new AbortController();
    const activeRequest = { controller, id: crypto.randomUUID(), stopped: false };
    request.current = activeRequest;
    lastMessage.current = text;
    setLoading(true);
    setError(null);
    setStopped(false);
    setShowHistory(false);
    setDraft('');

    const chatId = currentChatId || crypto.randomUUID();
    if (!currentChatId) {
      setCurrentChatId(chatId);
    }
    const existing = history.find(c => c.id === chatId);
    const chatTitle = existing?.title || text.split('\n')[0].trim() || text;

    const messageId = pendingMessageId.current || crypto.randomUUID();
    pendingMessageId.current = messageId;
    const userMsg = { id: messageId, role: 'user', text };
    const newMessagesWithUser = messages.some(message => message.id === messageId)
      ? messages.map(message => message.id === messageId ? userMsg : message)
      : [...messages, userMsg];
    setMessages(newMessagesWithUser);
    saveChatSession(chatId, chatTitle, newMessagesWithUser, conversation.current);

    // The backend stops Gemini after 25 seconds; this is only a final network fallback.
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      // A retry must wait until the previous provider task releases its session.
      await cancellation.current;
      if (activeRequest.stopped || request.current !== activeRequest) return;
      let res = await fetch('/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, page_context: scanned, conversation_id: conversation.current, request_id: activeRequest.id }),
        signal: controller.signal,
      });

      // If previous session expired on the backend (410), seamlessly create a fresh session
      if (res.status === 410) {
        conversation.current = null;
        res = await fetch('/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, page_context: scanned, conversation_id: null, request_id: activeRequest.id }),
          signal: controller.signal,
        });
      }

      if (!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Cannot reach Odyssey Guide. Start all services with npm run dev and retry.');
      }
      const data = await res.json();
      if (activeRequest.stopped || request.current !== activeRequest) return;
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not send your message. Please retry.');
      if (typeof data.reply !== 'string' || !data.reply.trim() || !data.conversation_id) {
        throw new Error('The guide returned an incomplete reply. Please retry.');
      }
      conversation.current = data.conversation_id;
      pendingMessageId.current = null;
      const finalMessages = [...newMessagesWithUser, { role: 'assistant', text: data.reply }];
      setMessages(finalMessages);
      saveChatSession(chatId, chatTitle, finalMessages, data.conversation_id);
    } catch (err) {
      if (!activeRequest.stopped && request.current === activeRequest) {
        setError(err.name === 'AbortError' ? 'The reply took too long. Please retry.'
          : err instanceof TypeError ? 'Cannot reach Odyssey Guide. Check that the chat service is running.' : err.message);
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === activeRequest) {
        request.current = null;
        setLoading(false);
        inputRef.current?.focus();
      }
    }
  }

  function stopReply() {
    const activeRequest = request.current;
    if (!activeRequest) return;
    activeRequest.stopped = true;
    activeRequest.controller.abort();
    request.current = null;
    setLoading(false);
    setError(null);
    setStopped(true);
    cancellation.current = fetch(`/chat/requests/${activeRequest.id}`, {
      method: 'DELETE', signal: AbortSignal.timeout(5000),
    }).then(res => {
      if (!res.ok) throw new Error('Could not confirm Stop. Please try again shortly.');
    }).catch(() => {
      // The request may finish at the server timeout if the connection is down.
    });
    inputRef.current?.focus();
  }

  function editMessage() {
    setDraft(lastMessage.current);
    inputRef.current?.focus();
  }

  function newChat() {
    if (loading) return;
    const previous = conversation.current;
    conversation.current = null;
    setCurrentChatId(null);
    setMessages([]);
    setError(null);
    setStopped(false);
    setShowHistory(false);
    pendingMessageId.current = null;
    setDraft('');
    lastMessage.current = '';
    setContext(scanPageContext(document, source));
    if (previous) fetch(`/chat/${previous}`, { method: 'DELETE' }).catch(() => {});
    inputRef.current?.focus();
  }

  return (
    <div className="odyssey-chat" data-chat-private>
      <ModalBackdrop
        isOpen={open && !closing}
        onClose={close}
        className="chat-backdrop"
        ariaLabel="Close Odyssey Guide"
      />
      {open && (
        <section
          id="odyssey-chat-panel"
          className={`chat-panel ${closing ? 'chat-panel-closing' : 'chat-panel-opening'}`}
          role="dialog"
          aria-label="Odyssey Guide"
          aria-modal="true"
          onAnimationEnd={handleAnimationEnd}
          onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}
        >
          <header className="chat-header">
            <span className="chat-avatar"><ChatIcon /></span>
            <div><h2>Odyssey Guide</h2><p>A little guidance for your day</p></div>
            <button type="button" className="chat-icon-button" onClick={close} aria-label="Close chat">×</button>
          </header>
          <div className="chat-toolbar">
            <span><span className="chat-status-dot" />AI assistant</span>
            <div className="chat-toolbar-actions">
              <button type="button" onClick={() => setShowHistory(value => !value)} disabled={loading}
                className={showHistory ? 'is-active' : ''} aria-pressed={showHistory}>History</button>
              <button type="button" onClick={newChat} disabled={loading}>New chat</button>
            </div>
          </div>
          <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" tabIndex={0} aria-label="Conversation">
            {showHistory ? (
              <div className="chat-history">
                <div className="chat-history-header">
                  <h3>Chat history</h3>
                  <button
                    type="button"
                    className="chat-history-new-btn"
                    onClick={newChat}
                    disabled={loading}
                  >
                    + New chat
                  </button>
                </div>
                {!history.length ? (
                  <div className="chat-history-empty">
                    <p>No chat history yet</p>
                    <span>Start a conversation to see it saved here.</span>
                  </div>
                ) : (
                  <div className="chat-history-list" role="list">
                    {history.map(item => (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        className={`chat-history-card ${currentChatId === item.id ? 'is-active-chat' : ''}`}
                        onClick={() => loadChat(item)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadChat(item); } }}
                      >
                        <div className="chat-history-card-body">
                          <span className="chat-history-title" title={item.title}>
                            {item.title}
                          </span>
                          <time dateTime={item.createdAt}>
                            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </time>
                        </div>
                        <div className="chat-history-card-actions">
                          <button
                            type="button"
                            className="chat-history-delete-btn"
                            aria-label="Delete chat"
                            title="Delete chat"
                            onClick={(e) => deleteChat(e, item.id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <span className="chat-history-arrow" aria-hidden="true">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : <>
              {!messages.length && <div className="chat-welcome">
                <span className="chat-welcome-mark"><ChatIcon /></span>
                <h3>Find your next small step.</h3>
                <p>I can help you understand your workload, explore your forecast, or find your way around Odyssey.</p>
                <div className="chat-starters">{STARTERS.map(text => <button key={text} type="button" onClick={() => { setDraft(text); inputRef.current?.focus(); }}>{text}<span aria-hidden="true">↗</span></button>)}</div>
              </div>}
              {messages.map((message, index) => <div key={index} className={`chat-message chat-message-${message.role}`}>
                <span className="chat-speaker">{message.role === 'user' ? 'You' : 'Odyssey Guide'}</span>
                <p>{message.text}</p>
              </div>)}
              {loading && <div className="chat-thinking" role="status"><span>Odyssey Guide is thinking…</span><button type="button" onClick={stopReply}>Stop response</button></div>}
              {stopped && <div className="chat-stopped">
                <p role="status">Response stopped.</p>
                <div className="chat-recovery-actions">
                  <button type="button" onClick={() => send(lastMessage.current)}>Try again</button>
                  <button type="button" onClick={editMessage}>Edit message</button>
                </div>
                <p className="chat-stopped-hint">Or type a new question below.</p>
              </div>}
              {error && <div className="chat-error" role="alert"><p>{error}</p><button type="button" onClick={() => send(lastMessage.current)} disabled={loading}>Retry message</button></div>}
            </>}
          </div>
          {!showHistory && <>
            <div className="chat-context">
              <label><input type="checkbox" checked={includeContext} onChange={event => setIncludeContext(event.target.checked)} />Include this page</label>
              {includeContext && context.module && <span className="chat-context-module" title={context.module}>{context.module}</span>}
              <p>{includeContext ? 'Your message and this module’s text are sent to Google Gemini when you send.' : 'Page sharing is off. Start a new chat to remove previously shared context.'}</p>
              {includeContext && <details onToggle={event => { if (event.currentTarget.open) setContext(scanPageContext(document, source)); }}><summary>Preview shared context</summary><pre>{context.content || 'No page context available.'}</pre></details>}
            </div>
            {configured === false && <p className="chat-setup" role="status">Chat needs a Gemini API key. Add GEMINI_API_KEY to the server’s .env file, then restart the app.</p>}
            <form className="chat-composer" onSubmit={event => { event.preventDefault(); send(draft); }}>
              <label className="chat-sr-only" htmlFor="chat-message">Message Odyssey Guide</label>
              <textarea id="chat-message" ref={inputRef} rows={2} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)}
                placeholder="What would help you today?" disabled={loading}
                onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(draft); } }} />
              {loading ? <button type="button" className="chat-stop" aria-label="Stop response" onClick={stopReply}><span /></button>
                : <button type="submit" className="chat-send" aria-label="Send message" disabled={!draft.trim() || configured === false}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 7-7 7 7M12 5v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>}
            </form>
            <p className="chat-footnote">AI can make mistakes. Planning support, not medical advice.</p>
          </>}
        </section>
      )}
      <button
        type="button"
        ref={launcherRef}
        className={`chat-launcher ${open && !closing ? 'is-open' : ''}`}
        aria-label={open && !closing ? 'Close Odyssey Guide' : 'Open Odyssey Guide'}
        aria-expanded={open && !closing}
        aria-controls="odyssey-chat-panel"
        onClick={() => {
          if (open && !closing) {
            close();
          } else {
            setClosing(false);
            setOpen(true);
          }
        }}
      >
        <span className="launcher-icon launcher-icon-chat">
          <ChatIcon />
        </span>
        <span className="launcher-icon launcher-icon-close" aria-hidden="true">
          ✕
        </span>
      </button>
    </div>
  );
}
