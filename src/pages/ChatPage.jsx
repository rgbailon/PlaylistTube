import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App';
import ChatSettings from '../components/ChatSettings';

const getProviderFromUrl = (url) => {
  if (!url) return null;
  if (url.includes('openai.com')) return 'openai';
  if (url.includes('openrouter.ai')) return 'openrouter';
  if (url.includes('anthropic.com')) return 'anthropic';
  if (url.includes('googleusercontent.com') || url.includes('generativelanguage')) return 'google';
  if (url.includes('x.ai')) return 'xai';
  if (url.includes('mistral.ai')) return 'mistral';
  if (url.includes('perplexity.ai')) return 'perplexity';
  if (url.includes('localhost:11434')) return 'ollama';
  return 'default';
};

const buildHeaders = (provider, key) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (!key) return headers;

  switch (provider) {
    case 'anthropic':
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
      break;
    case 'openrouter':
      headers['Authorization'] = `Bearer ${key}`;
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'PlaylistTube';
      break;
    case 'google':
    case 'xai':
    case 'mistral':
    case 'perplexity':
    case 'ollama':
    case 'default':
    default:
      headers['Authorization'] = `Bearer ${key}`;
      break;
  }

  return headers;
};

const buildBody = (provider, model, messages) => {
  if (provider === 'anthropic') {
    const lastMsg = messages[messages.length - 1];
    return {
      model: model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: lastMsg.content }]
    };
  }

  return {
    model: model || 'gpt-3.5-turbo',
    messages: messages,
  };
};

const parseResponse = (provider, data) => {
  if (provider === 'anthropic') {
    if (data.content && data.content[0]?.type === 'text') {
      return data.content[0].text;
    }
    if (data.error) {
      throw new Error(data.error.message || 'API Error');
    }
  }

  if (data.choices && data.choices[0]) {
    return data.choices[0].message.content;
  }

  if (data.error) {
    throw new Error(data.error.message || data.error);
  }

  throw new Error('Invalid response');
};

function ChatPage() {
  const { getCookie, setCookie } = useApp();
  
const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
const chatbotConfig = getCookie('yt_chatbot_config');
      if (!chatbotConfig) {
        const errorMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Please configure your AI API key by clicking the gear icon above.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
        setLoading(false);
        return;
      }

      const config = JSON.parse(chatbotConfig);
      if (!config.url || !config.key) {
        const errorMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Please configure your AI API key by clicking the gear icon above.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
        setLoading(false);
        return;
      }

      const provider = getProviderFromUrl(config.url);
      const allMessages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content }
      ];

      const headers = buildHeaders(provider, config.key);
      const body = buildBody(provider, config.model, allMessages);

      const response = await fetch(`${config.url}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      const content = parseResponse(provider, data);
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Error: ' + err.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        role: 'assistant',
        content: "Hello! I'm your AI assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
<div className="h-[calc(100vh-48px)] flex flex-col" style={{ background: 'var(--bg-main)' }}>
      <div 
        className="flex items-center justify-between px-2 py-1"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}
      >
        <h2 className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
          <i className="fas fa-robot mr-1" style={{ color: 'var(--accent-color)' }}></i>
          <span className="hidden sm:inline">AI Chat</span>
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 sm:p-1 rounded-lg transition hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
            title="Settings"
          >
            <i className="fas fa-cog text-sm"></i>
          </button>
          <button
            onClick={clearChat}
            className="p-1.5 sm:p-1 rounded-lg transition hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
            title="Clear chat"
          >
            <i className="fas fa-redo text-sm"></i>
          </button>
        </div>
      </div>

<div className="flex-1 overflow-y-auto scrollbar-thin p-2 sm:p-4 space-y-4 min-h-0 w-full sm:w-[85%] md:w-[70%] lg:w-[60%] max-w-5xl mx-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                background: msg.role === 'assistant' ? 'var(--accent-color)' : 'var(--bg-hover)',
                color: msg.role === 'assistant' ? 'white' : 'var(--text-muted)'
              }}
            >
              <i className={`fas ${msg.role === 'assistant' ? 'fa-robot' : 'fa-user'} text-xs sm:text-sm`}></i>
            </div>
            <div
              className="rounded-2xl p-3 sm:p-4 max-w-[75%] shadow-sm"
              style={{ 
                background: msg.role === 'user' ? 'var(--accent-color)' : 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: msg.role === 'user' ? 'white' : 'var(--text-main)'
              }}
            >
              <p style={{ color: msg.role === 'user' ? 'white' : 'var(--text-main)', lineHeight: 1.6 }}>
                {msg.content}
              </p>
              <p 
                className="text-[10px] mt-2" 
                style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
              >
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--accent-color)', color: 'white' }}
            >
              <i className="fas fa-robot text-xs sm:text-sm"></i>
            </div>
            <div
              className="rounded-2xl p-3 sm:p-4 shadow-sm"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {showSettings && (
        <div 
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-2"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="rounded-t-2xl sm:rounded-xl p-2 sm:p-4 w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderBottomLeftRadius: '0', borderBottomRightRadius: '0' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                <i className="fas fa-cog mr-1 sm:mr-2" style={{ color: 'var(--accent-color)' }}></i>
                <span className="hidden sm:inline">AI Chat Settings</span>
                <span className="sm:hidden">Settings</span>
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 sm:p-1 rounded-lg transition hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <ChatSettings />
          </div>
        </div>
      )}

<div
        className="flex-shrink-0 px-2 sm:px-4 py-3 w-full sm:w-[85%] md:w-[70%] lg:w-[60%] max-w-5xl mx-auto"
        style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}
      >
        <div className="relative max-w-full mx-auto flex items-center gap-2 sm:gap-3">
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
            className="flex-1 rounded-2xl pl-3 sm:pl-4 pr-10 sm:pr-12 py-2 sm:py-2.5 text-sm resize-none shadow-inner"
            style={{ 
              minHeight: '40px sm:44px', 
              maxHeight: '120px', 
              background: 'var(--bg-main)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-main)'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition hover:scale-110 shadow-md disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: 'var(--accent-color)', color: 'white' }}
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
