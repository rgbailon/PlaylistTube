import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import ChatSettings from '../components/ChatSettings';
import ReactMarkdown from 'react-markdown';

const getProviderFromUrl = (url) => {
  if (!url) return null;
  if (url.includes('openai.com')) return 'openai';
  if (url.includes('openrouter.ai')) return 'openrouter';
  if (url.includes('anthropic.com')) return 'anthropic';
  if (url.includes('googleusercontent.com') || url.includes('generativelanguage')) return 'google';
  if (url.includes('x.ai')) return 'xai';
  if (url.includes('mistral.ai')) return 'mistral';
  if (url.includes('perplexity.ai')) return 'perplexity';
  if (url.includes('groq.com')) return 'groq';
  if (url.includes('localhost:11434')) return 'ollama';
  return 'default';
};

const buildHeaders = (provider, key) => {
  const headers = { 'Content-Type': 'application/json' };
  if (!key) return headers;

  switch (provider) {
    case 'openai':
    case 'openrouter':
    case 'google':
    case 'xai':
    case 'mistral':
    case 'perplexity':
    case 'groq':
      headers['Authorization'] = `Bearer ${key}`;
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'PlaylistTube';
      }
      break;
    case 'anthropic':
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
      break;
  }
  return headers;
};

const buildBody = (provider, model, messages) => {
  if (provider === 'anthropic') {
    const lastMsg = messages[messages.length - 1];
    return { model, max_tokens: 4096, messages: [{ role: 'user', content: lastMsg.content }] };
  }
  return { model: model || 'gpt-3.5-turbo', messages };
};

const parseResponse = (provider, data, isStreaming = false) => {
  if (provider === 'anthropic') {
    if (data.content?.[0]?.type === 'text') return data.content[0].text;
    if (data.error) throw new Error(data.error.message || 'API Error');
  }
  if (data.choices?.[0]) {
    return isStreaming ? data.choices[0].delta?.content || '' : data.choices[0].message?.content || '';
  }
  if (data.error) throw new Error(data.error.message || data.error);
  return '';
};

function ChatPage() {
  const { getCookie, theme } = useApp();
  
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem('yt_chat_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([{ id: 1, role: 'assistant', content: "Hello! I'm your AI assistant. How can I help you today?", timestamp: new Date() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, []);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      const trimmed = conversations.slice(0, 50).map(conv => ({
        ...conv,
        messages: conv.messages.slice(-50).map(msg => ({
          ...msg,
          content: msg.content?.slice(0, 5000) || ''
        }))
      }));
      localStorage.setItem('yt_chat_conversations', JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save conversations to localStorage:', e);
    }
  }, [conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewConversation = () => {
    const newConv = {
      id: generateId(),
      title: 'New Chat',
      messages: [{ id: generateId(), role: 'assistant', content: "Hello! I'm your AI assistant. How can I help you today?", timestamp: new Date() }],
      createdAt: new Date()
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    setMessages(newConv.messages);
  };

  const selectConversation = (conv) => {
    setCurrentConversationId(conv.id);
    setMessages(conv.messages);
  };

  const deleteConversation = (e, id) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      createNewConversation();
    }
  };

  const saveCurrentConversation = () => {
    if (!input.trim() && messages.length <= 1) return;
    
    const title = messages.find(m => m.role === 'user')?.content?.slice(0, 30) + '...' || 'New Chat';
    
    if (currentConversationId) {
      setConversations(prev => prev.map(c => 
        c.id === currentConversationId ? { ...c, title, messages } : c
      ));
    } else {
      const newConv = { id: generateId(), title, messages, createdAt: new Date() };
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const cleanContent = (content) => {
    if (!content) return '';
    return content
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{3,}/g, ' ')
      .trim();
  };

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { id: generateId(), role: 'user', content: input.trim(), timestamp: new Date() };
    const tempAssistantMessage = { id: generateId(), role: 'assistant', content: '', timestamp: new Date() };

    const newMessages = [...messages, userMessage, tempAssistantMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    saveCurrentConversation();

    try {
      let chatbotConfig = getCookie('yt_chatbot_config') || localStorage.getItem('yt_chatbot_config');
      if (!chatbotConfig) {
        throw new Error('Please configure your AI API key in settings.');
      }

      const config = JSON.parse(chatbotConfig);
      if (!config.url || !config.key) {
        throw new Error('Please configure your AI API key in settings.');
      }

      const provider = getProviderFromUrl(config.url);
      const allMessages = [
        { role: 'system', content: 'You are a helpful AI assistant. Provide clear, well-formatted responses using markdown when appropriate.' },
        ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content }
      ];

      const headers = buildHeaders(provider, config.key);
      const body = buildBody(provider, config.model, allMessages);

      try {
        const response = await fetch(`${config.url}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, stream: true }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'API Error');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let fullContent = '';

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value);
          const lines = chunkValue.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') { done = true; break; }
              try {
                const data = JSON.parse(dataStr);
                const content = parseResponse(provider, data, true);
                if (content) {
                  fullContent += content;
                  setMessages(prev => prev.map(m => m.id === tempAssistantMessage.id ? { ...m, content: fullContent } : m));
                }
              } catch { /* Skip invalid JSON */ }
            }
          }
        }
      } catch {
        const response = await fetch(`${config.url}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await response.json();
        const content = parseResponse(provider, data);
        setMessages(prev => prev.map(m => m.id === tempAssistantMessage.id ? { ...m, content } : m));
      }

      setMessages(prev => {
        const updated = prev.map(m => m.id === tempAssistantMessage.id ? { ...m, content: m.content || "I apologize, but I couldn't generate a response." } : m);
        const title = (updated.find(m => m.role === 'user')?.content?.slice(0, 30) || 'New Chat') + '...';
        if (currentConversationId) {
          setConversations(c => c.map(c => c.id === currentConversationId ? { ...c, title, messages: updated } : c));
        } else {
          const newConv = { id: generateId(), title, messages: updated, createdAt: new Date() };
          setConversations(c => [newConv, ...c]);
          setCurrentConversationId(newConv.id);
        }
        return updated;
      });
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === tempAssistantMessage.id ? { ...m, content: `Error: ${err.message}` } : m));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-[calc(100vh-48px)] flex relative" style={{ background: 'var(--bg-main)' }}>
      {/* Mobile Overlay */}
      {showSidebar && (
        <div 
          className="md:hidden fixed inset-0 z-30 bg-black/50" 
          onClick={() => setShowSidebar(false)}
        />
      )}
      {/* Desktop Sidebar */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} hidden md:flex flex-shrink-0 transition-all duration-300 overflow-hidden`} style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)' }}>
        <div className="w-64 h-full flex flex-col">
        <div className="p-3 flex-shrink-0">
          <button
            onClick={createNewConversation}
            className="w-full py-2.5 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: 'var(--accent-color)', color: theme === 'sun' ? '#000' : '#fff' }}
          >
            <i className="fas fa-plus"></i>
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`px-3 py-2 mx-2 mb-1 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                currentConversationId === conv.id ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span className="text-sm truncate flex-1" style={{ color: 'var(--text-main)' }}>
                <i className="fas fa-message mr-2 text-xs" style={{ color: 'var(--text-muted)' }}></i>
                {conv.title}
              </span>
              <button
                onClick={(e) => deleteConversation(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition"
                style={{ color: 'var(--text-muted)' }}
              >
                <i className="fas fa-trash text-xs"></i>
              </button>
            </div>
          ))}
        </div>
        </div>
      </div>
      {/* Mobile Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:hidden fixed z-40 h-full w-64 transition-transform duration-300 overflow-hidden flex flex-col`} style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)' }}>
        <div className="p-3 flex-shrink-0">
          <button
            onClick={createNewConversation}
            className="w-full py-2.5 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: 'var(--accent-color)', color: theme === 'sun' ? '#000' : '#fff' }}
          >
            <i className="fas fa-plus"></i>
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`px-3 py-2 mx-2 mb-1 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                currentConversationId === conv.id ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
              }`}
            >
              <span className="text-sm truncate flex-1" style={{ color: 'var(--text-main)' }}>
                <i className="fas fa-message mr-2 text-xs" style={{ color: 'var(--text-muted)' }}></i>
                {conv.title}
              </span>
              <button
                onClick={(e) => deleteConversation(e, conv.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition"
                style={{ color: 'var(--text-muted)' }}
              >
                <i className="fas fa-trash text-xs"></i>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
              style={{ color: 'var(--text-muted)' }}
            >
              <i className="fas fa-bars"></i>
            </button>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              <i className="fas fa-robot mr-2" style={{ color: 'var(--accent-color)' }}></i>
              Chat
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition" style={{ color: 'var(--text-muted)' }} title="Settings">
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: msg.role === 'assistant' ? 'var(--accent-color)' : 'var(--bg-hover)', color: msg.role === 'assistant' ? '#fff' : 'var(--text-muted)' }}
              >
                <i className={`fas ${msg.role === 'assistant' ? 'fa-robot' : 'fa-user'} text-sm`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="rounded-2xl p-4 shadow-sm"
                  style={{ background: msg.role === 'user' ? 'var(--accent-color)' : 'var(--bg-card)' }}
                >
                  <div className="prose prose-sm max-w-none">
                    {msg.content && msg.content.trim() && (
                      <ReactMarkdown 
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em>{children}</em>,
                          code: ({ inline, children, ...props }) => inline ? (
                            <code className="px-1.5 py-0.5 rounded text-sm font-mono" style={{ background: msg.role === 'user' ? 'rgba(0,0,0,0.15)' : 'var(--bg-hover)' }}>{children}</code>
                          ) : (
                            <div className="relative group">
                              <pre className="p-3 rounded-lg overflow-x-auto text-sm font-mono mb-2" style={{ background: msg.role === 'user' ? 'rgba(0,0,0,0.15)' : 'var(--bg-hover)' }}>
                                <code {...props}>{children}</code>
                              </pre>
                              <button
                                onClick={() => copyToClipboard(String(children))}
                                className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition"
                                style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}
                              >
                                <i className="fas fa-copy text-xs"></i>
                              </button>
                            </div>
                          ),
                          pre: ({ children }) => <>{children}</>,
                          a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{children}</a>,
                          h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-medium mb-1">{children}</h3>,
                          blockquote: ({ children }) => <blockquote className="border-l-3 border-[var(--border-color)] pl-3 italic opacity-80 mb-2">{children}</blockquote>,
                          hr: () => <hr className="my-4 border-[var(--border-color)]" />,
                          table: ({ children }) => <table className="w-full border-collapse my-2">{children}</table>,
                          th: ({ children }) => <th className="border p-2 bg-[var(--bg-hover)]">{children}</th>,
                          td: ({ children }) => <td className="border p-2">{children}</td>,
                        }}
                      >{cleanContent(msg.content)}</ReactMarkdown>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-2">
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(cleanContent(msg.content))}
                        className="p-1 rounded hover:bg-[var(--bg-hover)] transition opacity-60 hover:opacity-100"
                        style={{ color: 'var(--text-muted)' }}
                        title="Copy"
                      >
                        <i className="fas fa-copy text-xs"></i>
                      </button>
                    )}
                    <span className="text-[10px]" style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
          <div className="max-w-3xl mx-auto relative flex items-center gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message AI..."
              rows="1"
              className="flex-1 rounded-xl pl-4 pr-12 py-3 resize-none shadow-inner text-sm"
              style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: 'var(--accent-color)', color: theme === 'sun' ? '#000' : '#fff' }}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSettings(false)}>
          <div className="rounded-xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto" style={{ background: 'var(--bg-card)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                <i className="fas fa-cog mr-2" style={{ color: 'var(--accent-color)' }}></i>
                Chat Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-muted)' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <ChatSettings />
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
