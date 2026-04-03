'use client';

import { useState, useRef, useEffect } from 'react';

const DEMO_PASSWORD = 'ronda2026';
const MAX_MESSAGES = 50;

const INITIAL_SUGGESTIONS = [
  "Give me my morning brief",
  "Who should I see first?",
  "Any overnight events?",
  "What's pending across all facilities?",
  "Who's my sickest patient right now?",
];

const FOLLOWUP_SUGGESTIONS = [
  "Tell me more about Davis",
  "Draft a note for Chen's Aricept recheck",
  "Get Dr. Santos on the phone",
  "What about Elm Creek this afternoon?",
  "Prep me for the Williams family meeting",
  "Order the usual on Davis",
];

function formatText(text) {
  const parts = [];
  const lines = text.split('\n');
  
  lines.forEach((line, i) => {
    let processed = line;
    // Bold
    const boldParts = processed.split(/\*\*(.+?)\*\*/g);
    const lineElements = boldParts.map((part, j) => 
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    
    parts.push(<span key={i}>{lineElements}</span>);
    if (i < lines.length - 1) parts.push(<br key={`br-${i}`} />);
  });
  
  return parts;
}

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestionsUsed, setSuggestionsUsed] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const passRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  useEffect(() => {
    if (authed) {
      inputRef.current?.focus();
    }
  }, [authed]);

  const checkPass = () => {
    if (password === DEMO_PASSWORD) {
      setAuthed(true);
    } else {
      setPassError('Incorrect code');
      setPassword('');
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || isLoading || msgCount >= MAX_MESSAGES) return;

    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    
    const newCount = msgCount + 1;
    setMsgCount(newCount);

    const newHistory = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });

      const data = await res.json();

      if (data.content && data.content[0]) {
        const reply = data.content[0].text;
        setHistory(prev => [...prev, { role: 'assistant', content: reply }]);
        setMessages(prev => [...prev, { role: 'ronda', text: reply }]);
        
        if (!suggestionsUsed && newCount <= 3) {
          setShowSuggestions(true);
          setSuggestionsUsed(true);
        }
      } else {
        setMessages(prev => [...prev, { role: 'ronda', text: '*Connection issue — try again.*' }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ronda', text: '*Couldn\'t reach Ronda\'s backend. Check configuration.*' }]);
    }

    setIsLoading(false);
  };

  const resetChat = () => {
    if (!confirm('Reset the conversation?')) return;
    setMessages([]);
    setHistory([]);
    setMsgCount(0);
    setShowSuggestions(true);
    setSuggestionsUsed(false);
  };

  const suggestions = suggestionsUsed ? FOLLOWUP_SUGGESTIONS : INITIAL_SUGGESTIONS;
  const remaining = MAX_MESSAGES - msgCount;
  const limitReached = msgCount >= MAX_MESSAGES;

  // ===== PASSWORD GATE =====
  if (!authed) {
    return (
      <div style={styles.gate}>
        <div style={styles.gateCard}>
          <div style={styles.gateLogo}>R</div>
          <h1 style={styles.gateTitle}>Ronda Demo</h1>
          <p style={styles.gateSub}>This is a private interactive demo.<br/>Enter the access code to continue.</p>
          <input
            ref={passRef}
            type="password"
            style={styles.gateInput}
            placeholder="Access code"
            value={password}
            onChange={e => { setPassword(e.target.value); setPassError(''); }}
            onKeyDown={e => e.key === 'Enter' && checkPass()}
            autoFocus
          />
          {passError && <p style={styles.gateError}>{passError}</p>}
          <button style={styles.gateBtn} onClick={checkPass}>Enter</button>
        </div>
      </div>
    );
  }

  // ===== MAIN APP =====
  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.avatar}>R</div>
        <div style={styles.headerInfo}>
          <div style={styles.headerName}>Ronda</div>
          <div style={styles.headerStatus}>
            <span style={styles.statusDot} />
            <span>Active</span>
          </div>
        </div>
        <div style={styles.headerMeta}>
          <span style={{
            ...styles.counter,
            ...(remaining <= 10 ? { color: '#c95555' } : {})
          }}>{remaining} left</span>
          <button style={styles.resetBtn} onClick={resetChat}>Reset</button>
        </div>
      </div>

      {/* CONTEXT BANNER */}
      <div style={styles.banner}>
        <p style={styles.bannerText}>
          You are <strong>Dr. Sarah Kaplan</strong>, a geriatrician covering 3 SNFs and 1 ALF. 
          Ronda has been working with you for 2 weeks. Try asking about your schedule, pending items, or anything a PALTC physician would need.
        </p>
      </div>

      {/* MESSAGES */}
      <div style={styles.messages}>
        {messages.length === 0 && !isLoading && (
          <div style={styles.welcome}>
            <div style={styles.welcomeAvatar}>R</div>
            <div style={styles.welcomeTitle}>Good morning, Dr. Kaplan</div>
            <div style={styles.welcomeSub}>What do you need?</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            ...styles.msg,
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              ...styles.msgLabel,
              ...(msg.role === 'user' ? styles.msgLabelUser : styles.msgLabelRonda),
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}>
              {msg.role === 'user' ? 'You' : 'Ronda'}
            </div>
            <div style={{
              ...styles.bubble,
              ...(msg.role === 'user' ? styles.bubbleUser : styles.bubbleRonda),
            }}>
              {formatText(msg.text)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={styles.typing}>
            <span style={{ ...styles.typingDot, animationDelay: '0s' }} />
            <span style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
            <span style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* SUGGESTIONS */}
      {showSuggestions && !limitReached && (
        <div style={styles.suggestions}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              style={styles.chip}
              onClick={() => sendMessage(s)}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(61,139,94,0.12)';
                e.target.style.borderColor = 'rgba(61,139,94,0.2)';
                e.target.style.color = '#e8e9ed';
              }}
              onMouseLeave={e => {
                e.target.style.background = '#1c1f2b';
                e.target.style.borderColor = '#2a2d3a';
                e.target.style.color = '#8b8d98';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* INPUT */}
      {!limitReached ? (
        <div style={styles.inputArea}>
          <div style={{ flex: 1 }}>
            <textarea
              ref={inputRef}
              style={styles.inputField}
              placeholder="Message Ronda..."
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
          </div>
          <button
            style={{
              ...styles.sendBtn,
              ...(isLoading || !input.trim() ? { opacity: 0.3, cursor: 'not-allowed' } : {}),
            }}
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      ) : (
        <div style={styles.limitBanner}>
          Demo limit reached.{' '}
          <a href="https://ronda.health" target="_blank" rel="noopener noreferrer" style={{ color: '#4ea870', textDecoration: 'none' }}>
            Visit ronda.health
          </a>{' '}
          to learn more.
        </div>
      )}

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; overflow: hidden; background: #0f1117; }
        @keyframes typingPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 0.8; transform: scale(1); }
        }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 4px; }
        textarea:focus { border-color: #3d8b5e !important; }
      `}</style>
    </div>
  );
}

const styles = {
  // Gate
  gate: {
    position: 'fixed', inset: 0, background: '#0f1117',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    color: '#e8e9ed',
  },
  gateCard: { width: '90%', maxWidth: 380, textAlign: 'center' },
  gateLogo: {
    width: 48, height: 48, background: '#3d8b5e', borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 24px', fontWeight: 600, fontSize: 20, color: '#fff',
  },
  gateTitle: { fontSize: 22, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.02em' },
  gateSub: { fontSize: 14, color: '#8b8d98', marginBottom: 28, lineHeight: 1.5 },
  gateInput: {
    width: '100%', padding: '14px 16px', background: '#161821',
    border: '1px solid #2a2d3a', borderRadius: 8, color: '#e8e9ed',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 14, outline: 'none',
    letterSpacing: '0.05em',
  },
  gateError: { color: '#c95555', fontSize: 13, marginTop: 10 },
  gateBtn: {
    width: '100%', padding: 14, background: '#3d8b5e', color: '#fff',
    border: 'none', borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
    fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 14,
  },

  // App
  app: {
    height: '100dvh', display: 'flex', flexDirection: 'column',
    maxWidth: 720, margin: '0 auto', fontFamily: "'DM Sans', -apple-system, sans-serif",
    color: '#e8e9ed', background: '#0f1117',
  },

  // Header
  header: {
    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
    borderBottom: '1px solid #2a2d3a', background: '#161821', flexShrink: 0,
  },
  avatar: {
    width: 36, height: 36, background: '#3d8b5e', borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, fontSize: 15, color: '#fff', flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' },
  headerStatus: { fontSize: 12, color: '#8b8d98', display: 'flex', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, background: '#3d8b5e', borderRadius: '50%', display: 'inline-block' },
  headerMeta: { display: 'flex', alignItems: 'center', gap: 12 },
  counter: {
    fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#5c5e6a',
    background: '#1c1f2b', padding: '4px 8px', borderRadius: 6,
  },
  resetBtn: {
    background: 'none', border: '1px solid #2a2d3a', color: '#8b8d98',
    fontFamily: "'DM Sans', sans-serif", fontSize: 12, padding: '5px 10px',
    borderRadius: 6, cursor: 'pointer',
  },

  // Banner
  banner: {
    padding: '12px 20px', background: 'rgba(61,139,94,0.12)',
    borderBottom: '1px solid rgba(61,139,94,0.2)', flexShrink: 0,
  },
  bannerText: { fontSize: 12.5, color: '#4ea870', lineHeight: 1.5 },

  // Welcome
  welcome: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingBottom: 40,
  },
  welcomeAvatar: {
    width: 56, height: 56, background: '#3d8b5e', borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, fontSize: 24, color: '#fff', marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 20, fontWeight: 600, color: '#e8e9ed', letterSpacing: '-0.02em',
  },
  welcomeSub: {
    fontSize: 14, color: '#5c5e6a',
  },

  // Messages
  messages: {
    flex: 1, overflowY: 'auto', padding: 20,
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  msg: { maxWidth: '85%', animation: 'msgIn 0.25s ease' },
  msgLabel: {
    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 5, padding: '0 2px',
  },
  msgLabelUser: { color: '#5c5e6a' },
  msgLabelRonda: { color: '#3d8b5e' },
  bubble: {
    padding: '12px 16px', borderRadius: 12, fontSize: 14.5,
    lineHeight: 1.6, whiteSpace: 'pre-wrap', wordWrap: 'break-word',
  },
  bubbleUser: { background: '#2a2d3a', borderBottomRightRadius: 4 },
  bubbleRonda: {
    background: 'rgba(61,139,94,0.10)', border: '1px solid rgba(61,139,94,0.20)',
    borderBottomLeftRadius: 4,
  },

  // Typing
  typing: {
    alignSelf: 'flex-start', padding: '12px 16px',
    background: 'rgba(61,139,94,0.10)', border: '1px solid rgba(61,139,94,0.20)',
    borderRadius: 12, borderBottomLeftRadius: 4,
    display: 'flex', gap: 5, alignItems: 'center',
  },
  typingDot: {
    width: 7, height: 7, background: '#3d8b5e', borderRadius: '50%',
    display: 'inline-block', animation: 'typingPulse 1.4s ease-in-out infinite',
  },

  // Suggestions
  suggestions: {
    padding: '8px 20px 4px', display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0,
  },
  chip: {
    background: '#1c1f2b', border: '1px solid #2a2d3a', color: '#8b8d98',
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: '8px 14px',
    borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
  },

  // Input
  inputArea: {
    padding: '12px 20px 20px', borderTop: '1px solid #2a2d3a',
    background: '#161821', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'flex-end',
  },
  inputField: {
    width: '100%', padding: '13px 16px', background: '#1a1d28',
    border: '1px solid #2a2d3a', borderRadius: 12, color: '#e8e9ed',
    fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, outline: 'none',
    resize: 'none', lineHeight: 1.5, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, background: '#3d8b5e', border: 'none',
    borderRadius: 8, color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  // Limit
  limitBanner: {
    padding: '16px 20px', background: 'rgba(201,85,85,0.1)',
    borderTop: '1px solid rgba(201,85,85,0.2)', textAlign: 'center',
    fontSize: 13.5, color: '#8b8d98', flexShrink: 0,
  },
};
