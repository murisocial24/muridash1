import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Quais são os meus clientes mais recentes?',
  'Qual o total faturado este mês?',
  'Mostra-me as faturas em aberto',
  'Que produtos tenho cadastrados?',
  'Lista os fornecedores da empresa',
  'Mostra as últimas compras registadas',
  'Qual é a situação financeira atual?',
];

const TOC_RESOURCES = {
  clientes: 'customers',
  faturas: 'commercial_sales_documents',
  produtos: 'items',
  fornecedores: 'suppliers',
  compras: 'commercial_purchases_documents',
  recibos: 'receipts',
};

function detectResources(question) {
  const q = question.toLowerCase();
  const needed = [];
  if (q.includes('client') || q.includes('customer')) needed.push('clientes');
  if (q.includes('fatur') || q.includes('vend') || q.includes('document')) needed.push('faturas');
  if (q.includes('produto') || q.includes('artigo') || q.includes('stock') || q.includes('item')) needed.push('produtos');
  if (q.includes('fornec') || q.includes('supplier')) needed.push('fornecedores');
  if (q.includes('compra') || q.includes('purchase')) needed.push('compras');
  if (q.includes('recibo') || q.includes('pagamento') || q.includes('receipt')) needed.push('recibos');
  if (q.includes('financ') || q.includes('situação') || q.includes('resumo') || q.includes('total')) {
    needed.push('faturas', 'recibos');
  }
  if (needed.length === 0) needed.push('faturas', 'clientes');
  return [...new Set(needed)];
}

export default function Home() {
  const [claudeKey, setClaudeKey] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [tocToken, setTocToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleConnect() {
    if (!claudeKey.trim()) { alert('Introduz a chave API do Claude primeiro.'); return; }
    setStatus('connecting');
    try {
      const res = await fetch('/api/toc-auth', { method: 'POST' });
      const data = await res.json();
      if (data.access_token) {
        setTocToken(data.access_token);
        setStatus('connected');
      } else {
        console.error('TOC auth error:', data);
        setStatus('error');
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  async function fetchTocData(resources, token) {
    const results = {};
    for (const key of resources) {
      try {
        const res = await fetch('/api/toc-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: TOC_RESOURCES[key], token }),
        });
        const data = await res.json();
        results[key] = data?.data ? data.data.slice(0, 15) : data;
      } catch (e) {
        results[key] = { error: e.message };
      }
    }
    return results;
  }

  async function handleSend(question) {
    const q = question || input.trim();
    if (!q) return;
    if (!claudeKey.trim()) { alert('Introduz a chave API do Claude.'); return; }
    if (status !== 'connected') { alert('Liga primeiro ao TOC Online.'); return; }
    setInput('');
    setLoading(true);
    const userMsg = { role: 'user', content: q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    try {
      const resources = detectResources(q);
      const tocData = await fetchTocData(resources, tocToken);
      const res = await fetch('/api/claude-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claudeKey, tocData, messages: newMessages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || `Erro: ${data.error}` }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  const statusColor = { disconnected: '#ef4444', connecting: '#f59e0b', connected: '#22c55e', error: '#ef4444' }[status];
  const statusLabel = { disconnected: 'Desligado', connecting: 'A ligar…', connected: 'TOC Online ligado ✓', error: 'Erro — tenta novamente' }[status];

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0a0a0f', color: '#e8e8f0', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 4px; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ width: 272, minWidth: 272, background: '#13131a', borderRight: '1px solid #2a2a3a', display: 'flex', flexDirection: 'column', padding: '20px 14px', gap: 18, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottom: '1px solid #2a2a3a' }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✦</div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14 }}>Muri Logic AI</div>
            <div style={{ fontSize: 10, color: '#6b6b80', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Assistente Empresarial</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b6b80', fontFamily: 'DM Mono, monospace' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
          {statusLabel}
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6b80', fontWeight: 600, marginBottom: 8 }}>Chave Claude API</div>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-api03-..."
              value={claudeKey}
              onChange={e => setClaudeKey(e.target.value)}
              style={{ width: '100%', background: '#1c1c27', border: '1px solid #2a2a3a', borderRadius: 8, padding: '9px 32px 9px 10px', color: '#e8e8f0', fontSize: 11, fontFamily: 'DM Mono, monospace', outline: 'none' }}
            />
            <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b6b80', cursor: 'pointer', fontSize: 13 }}>
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
          <button onClick={handleConnect} disabled={status === 'connecting' || status === 'connected'}
            style={{ width: '100%', padding: '10px', background: status === 'connected' ? '#0f2a0f' : 'linear-gradient(135deg, #6c63ff, #a78bfa)', border: status === 'connected' ? '1px solid #22c55e44' : 'none', borderRadius: 8, color: status === 'connected' ? '#22c55e' : 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 12, cursor: status === 'connected' ? 'default' : 'pointer', opacity: status === 'connecting' ? 0.6 : 1 }}>
            {status === 'connecting' ? '⏳ A ligar…' : status === 'connected' ? '✓ Ligado ao TOC' : '⚡ Ligar ao TOC Online'}
          </button>
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6b80', fontWeight: 600, marginBottom: 8 }}>Perguntas frequentes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)}
                style={{ background: '#1c1c27', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#9090a8', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6c63ff'; e.currentTarget.style.color = '#e8e8f0'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a3a'; e.currentTarget.style.color = '#9090a8'; }}
              >{s}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: 10, color: '#6b6b80', textAlign: 'center', paddingTop: 12, borderTop: '1px solid #2a2a3a' }}>
          Powered by Claude AI + TOC Online API
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700 }}>Assistente</div>
            <div style={{ fontSize: 12, color: '#6b6b80', marginTop: 2 }}>— faz uma pergunta sobre a tua empresa</div>
          </div>
          <button onClick={() => setMessages([])} style={{ background: '#1c1c27', border: '1px solid #2a2a3a', borderRadius: 8, color: '#6b6b80', fontSize: 12, padding: '7px 14px', cursor: 'pointer' }}>
            Limpar conversa
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14, color: '#6b6b80', height: '100%' }}>
              <div style={{ width: 60, height: 60, background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>✦</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#e8e8f0' }}>Olá! Sou o teu assistente.</div>
              <div style={{ fontSize: 13, maxWidth: 360, lineHeight: 1.6 }}>Liga ao TOC Online na barra lateral e faz-me qualquer pergunta sobre a tua empresa.</div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: m.role === 'assistant' ? 'linear-gradient(135deg,#6c63ff,#a78bfa)' : '#1c1c27', border: m.role === 'user' ? '1px solid #2a2a3a' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                  {m.role === 'assistant' ? '✦' : '👤'}
                </div>
                <div style={{ background: m.role === 'user' ? '#1c1c27' : '#13131a', border: `1px solid ${m.role === 'user' ? 'rgba(108,99,255,0.3)' : '#2a2a3a'}`, borderRadius: 12, padding: '12px 14px', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {m.content}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</div>
              <div style={{ background: '#13131a', border: '1px solid #2a2a3a', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff', display: 'inline-block', animation: 'bounce 1.2s infinite', animationDelay: `${i*0.2}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '12px 24px 18px', borderTop: '1px solid #2a2a3a', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#13131a', border: '1px solid #2a2a3a', borderRadius: 12, padding: '10px 12px' }}>
            <textarea rows={1} placeholder="Pergunta algo sobre a tua empresa…" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e8e8f0', fontSize: 13, resize: 'none', maxHeight: 120, lineHeight: 1.5, fontFamily: 'DM Sans, sans-serif' }}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (loading || !input.trim()) ? 0.4 : 1, fontSize: 14 }}>
              ➤
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#6b6b80', textAlign: 'center', marginTop: 6 }}>Enter para enviar · Shift+Enter para nova linha</div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-6px);opacity:1} }`}</style>
    </div>
  );
}
