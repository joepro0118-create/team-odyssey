import { useEffect, useRef, useState } from 'react';
import { scanPageContext } from '../../utils/pageContext';
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
    return Array.isArray(saved)
      ? saved.filter(item => typeof item?.question === 'string' && typeof item?.answer === 'string').slice(0, HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export default function ChatWidget({ activeIndex, source }) {
  const [open, setOpen] = useState(false);
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
    if (!open) return;
    const controller = new AbortController();
    fetch('/chat/health', { signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setConfigured(data.configured === true))
      .catch(() => { if (!controller.signal.aborted) setConfigured(null); });
    inputRef.current?.focus();
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const canvas = document.querySelector('.canvas');
    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setContext(scanPageContext(document, source)), 150);
    };
    refresh();
    canvas?.addEventListener('scroll', refresh, { passive: true });
    return () => { clearTimeout(timer); canvas?.removeEventListener('scroll', refresh); };
  }, [open, activeIndex, source]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [open, messages, loading, error, stopped]);

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  function saveToHistory(question, answer) {
    const entry = { id: crypto.randomUUID(), question, answer, createdAt: new Date().toISOString() };
    setHistory(previous => {
      const updated = [entry, ...previous].slice(0, HISTORY_LIMIT);
      try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // The current chat still works if browser storage is unavailable.
      }
      return updated;
    });
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
    const messageId = pendingMessageId.current || crypto.randomUUID();
    pendingMessageId.current = messageId;
    setMessages(prev => prev.some(message => message.id === messageId)
      ? prev.map(message => message.id === messageId ? { ...message, text } : message)
      : [...prev, { id: messageId, role: 'user', text }]);
    // The backend stops Gemini after 25 seconds; this is only a final network fallback.
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
      // A retry must wait until the previous provider task releases its session.
      await cancellation.current;
      if (activeRequest.stopped || request.current !== activeRequest) return;
      const res = await fetch('/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, page_context: scanned, conversation_id: conversation.current, request_id: activeRequest.id }),
        signal: controller.signal,
      });
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
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      saveToHistory(text, data.reply);
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
      {open && (
        <section id="odyssey-chat-panel" className="chat-panel" role="dialog" aria-label="Odyssey Guide" aria-modal="false"
          onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
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
            {showHistory ? <div className="chat-history">
              <h3>Chat history</h3>
              {!history.length ? <p className="chat-history-empty">No history</p> : history.map(item => <article key={item.id} className="chat-history-item">
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
              </article>)}
            </div> : <>
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
      <button type="button" ref={launcherRef} className="chat-launcher" aria-label={open ? 'Close Odyssey Guide' : 'Open Odyssey Guide'} aria-expanded={open} aria-controls="odyssey-chat-panel" onClick={() => open ? close() : setOpen(true)}>
        {open ? <span aria-hidden="true">×</span> : <ChatIcon />}
      </button>
    </div>
  );
}
