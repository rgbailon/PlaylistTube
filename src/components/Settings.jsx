import { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';

function Settings() {
  const { apiKeys, addApiKey, removeApiKey, currentKeyIndex, setActiveKey, quota, resetQuota, getCookie, setCookie, clearHistory, playlistHistory } = useApp();
  
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeysExpanded, setApiKeysExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const btnRef = useRef(null);

  const [youtubeApiExpanded, setYoutubeApiExpanded] = useState(true);
  const [chatApiExpanded, setChatApiExpanded] = useState(true);

  const [chatApiUrl, setChatApiUrl] = useState('');
  const [chatApiKey, setChatApiKey] = useState('');
  const [chatModel, setChatModel] = useState('gpt-3.5-turbo');
  const [chatSaved, setChatSaved] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);

  useEffect(() => {
    const config = getCookie('yt_chatbot_config');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        setChatApiUrl(parsed.url || '');
        setChatApiKey(parsed.key || '');
        setChatModel(parsed.model || 'gpt-3.5-turbo');
      } catch (e) {}
    }
  }, []);

  const handleAddKey = async () => {
    if (!apiKeyInput.trim()) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    if (apiKeys.includes(apiKeyInput.trim())) {
      showStatus('This API key is already added', 'error');
      return;
    }

    setValidating(true);
    if (btnRef.current) btnRef.current.disabled = true;

    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${apiKeyInput.trim()}`
      );
      const data = await resp.json();

      if (!resp.ok || data.error) {
        showStatus('Invalid API key: ' + (data?.error?.message || 'Unknown error'), 'error');
        setValidating(false);
        if (btnRef.current) btnRef.current.disabled = false;
        return;
      }

      await addApiKey(apiKeyInput.trim());
      setApiKeyInput('');
      showStatus('API key verified and added!', 'success');
    } catch (err) {
      showStatus('Invalid API key', 'error');
    } finally {
      setValidating(false);
      if (btnRef.current) btnRef.current.disabled = false;
    }
  };

  const showStatus = (message, type) => {
    setStatusMessage({ message, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleClearAll = () => {
    if (confirm('Clear all API keys?')) {
      apiKeys.forEach((_, i) => removeApiKey(0));
    }
  };

  const saveChatConfig = () => {
    const config = {
      url: chatApiUrl.trim(),
      key: chatApiKey.trim(),
      model: chatModel.trim()
    };
    setCookie('yt_chatbot_config', JSON.stringify(config));
    setChatSaved(true);
    setTimeout(() => setChatSaved(false), 3000);
  };

  const clearChatConfig = () => {
    setChatApiUrl('');
    setChatApiKey('');
    setChatModel('gpt-3.5-turbo');
    document.cookie = 'yt_chatbot_config=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  };

  const chatProviders = [
    {
      name: 'OpenAI',
      url: 'https://api.openai.com/v1',
      models: [
        { name: 'GPT-4o Mini', model: 'gpt-4o-mini' },
        { name: 'GPT-3.5 Turbo', model: 'gpt-3.5-turbo' },
        { name: 'GPT-4o', model: 'gpt-4o' },
      ]
    },
    {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1',
      models: [
        { name: 'DeepSeek V3 (Free)', model: 'deepseek/deepseek-chat' },
        { name: 'Qwen QwQ 32B', model: 'qwen/qwen-2.5-32b-coder' },
        { name: 'Llama 3.1 70B', model: 'meta-llama/llama-3.1-70b-instruct' },
        { name: 'Llama 3.1 8B', model: 'meta-llama/llama-3.1-8b-instruct' },
        { name: 'Mistral 7B', model: 'mistralai/mistral-7b-instruct' },
        { name: 'Phi-4 Mini', model: 'microsoft/phi-4-mini-instruct' },
        { name: 'Gemma 2 9B', model: 'google/gemma-2-9b-it' },
        { name: 'Gemma 2 27B', model: 'google/gemma-2-27b-it' },
        { name: 'Claude 3.5 Haiku', model: 'anthropic/claude-3.5-haiku' },
        { name: 'Claude 3 Haiku', model: 'anthropic/claude-3-haiku' },
        { name: 'Qwen 2.5 72B', model: 'qwen/qwen-2.5-72b-instruct' },
        { name: 'Command R7B', model: 'cohere/command-r7b-12-2024' },
        { name: 'MiniMax-M2', model: 'minimax/minimax-m2.1' },
        { name: 'DeepSeek V2.5', model: 'deepseek/deepseek-v2.5' },
        { name: 'Falcon 3 10B', model: 'tiiuae/falcon-3-10b-instruct' },
        { name: 'Llama 3.2 90B', model: 'meta-llama/llama-3.2-90b-instruct' },
        { name: 'Nous Hermes 3', model: 'nousresearch/nous-hermes-3-llama-3.1-70b' },
        { name: 'Yi 1.5 34B', model: '01-ai/yi-1.5-34b-chat' },
        { name: 'Aya Expanse 8B', model: 'cohere/aya-expanse-8b' },
        { name: 'Mistral Nemo', model: 'mistralai/mistral-nemo' },
      ]
    },
    {
      name: 'Ollama',
      url: 'http://localhost:11434/v1',
      models: [
        { name: 'Llama 3.2 1B', model: 'llama3.2:1b' },
        { name: 'Llama 3.2 3B', model: 'llama3.2:3b' },
        { name: 'Llama 3.1 70B', model: 'llama3.1:70b' },
        { name: 'Llama 3.1 8B', model: 'llama3.1:8b' },
        { name: 'Mistral 7B', model: 'mistral' },
        { name: 'Phi-4', model: 'phi4' },
        { name: 'Phi-3 Mini', model: 'phi3:mini' },
        { name: 'Gemma 2 9B', model: 'gemma2:9b' },
        { name: 'Qwen 2.5 72B', model: 'qwen2.5:72b' },
        { name: 'Qwen 2.5 14B', model: 'qwen2.5:14b' },
        { name: 'Qwen 2.5 7B', model: 'qwen2.5:7b' },
        { name: 'DeepSeek R1 70B', model: 'deepseek-r1:70b' },
        { name: 'DeepSeek R1 32B', model: 'deepseek-r1:32b' },
        { name: 'DeepSeek R1 14B', model: 'deepseek-r1:14b' },
        { name: 'DeepSeek R1 8B', model: 'deepseek-r1:8b' },
        { name: 'Codestral 22B', model: 'codestral' },
        { name: 'WizardLM2 7B', model: 'wizardlm2:7b' },
        { name: 'WizardLM2 8x22B', model: 'wizardlm2:8x22b' },
        { name: 'Aya 23 8B', model: 'aya:23' },
        { name: 'Command R7B', model: 'command-r7b' },
      ]
    },
    {
      name: 'Anthropic',
      url: 'https://api.anthropic.com',
      models: [
        { name: 'Claude 3.5 Haiku', model: 'claude-3-5-haiku-20241022' },
        { name: 'Claude 3 Haiku', model: 'claude-3-haiku-20240307' },
      ]
    },
    {
      name: 'Google',
      url: 'https://generativelanguage.googleapis.com/v1',
      models: [
        { name: 'Gemini 2.0 Flash', model: 'gemini-2.0-flash' },
        { name: 'Gemini 1.5 Flash', model: 'gemini-1.5-flash' },
        { name: 'Gemini 1.5 Pro', model: 'gemini-1.5-pro' },
        { name: 'Gemini 1.5 Flash-8B', model: 'gemini-1.5-flash-8b' },
      ]
    },
    {
      name: 'xAI',
      url: 'https://api.x.ai/v1',
      models: [
        { name: 'Grok 2 Vision', model: 'grok-2-vision-1212' },
        { name: 'Grok 2', model: 'grok-2-1212' },
        { name: 'Grok Beta', model: 'grok-beta' },
      ]
    },
    {
      name: 'Mistral',
      url: 'https://api.mistral.ai/v1',
      models: [
        { name: 'Pixtral 12B', model: 'pixtral-12b-2409' },
        { name: 'Mistral Small', model: 'mistral-small-latest' },
        { name: 'Mistral Nemo', model: 'mistral-nemo-2407' },
      ]
    },
    {
      name: 'Meta',
      url: 'https://api.meta.ai/v1',
      models: [
        { name: 'Llama 3.2 Vision', model: 'llama-3.2-90b-vision-instruct' },
        { name: 'Llama 3.2', model: 'llama-3.2-11b-vision-instruct' },
      ]
    },
  ];

  const allModels = chatProviders.flatMap(p => p.models.map(m => ({ ...m, provider: p.name, providerUrl: p.url })));

  const handleProviderSelect = (provider) => {
    setChatApiUrl(provider.url);
    setChatModel(provider.models[0].model);
  };

  const handleModelSelect = (modelObj) => {
    setChatApiUrl(modelObj.providerUrl);
    setChatModel(modelObj.model);
  };

  const maxQuota = 10000;
  const quotaPercent = Math.min((quota / maxQuota) * 100, 100);

  return (
    <div className="p-3 rounded-lg border mb-3 relative bg-[var(--bg-card)] border-[var(--border-color)]">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--text-main)]">
        <i className="fas fa-cog text-blue-500"></i>
        Settings
      </h3>

      <div className="space-y-4">
        <div>
          <button 
            onClick={() => setYoutubeApiExpanded(!youtubeApiExpanded)} 
            className="flex items-center justify-between w-full text-xs font-medium mb-2 text-[var(--text-main)]"
          >
            <span><i className="fab fa-youtube mr-2 text-red-500"></i>YouTube API</span>
            <i className={`fas fa-chevron-${youtubeApiExpanded ? 'up' : 'down'} text-xs`}></i>
          </button>
          
          {youtubeApiExpanded && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter API key..."
                  className="flex-1 rounded-lg px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                />
                <button onClick={() => setShowKey(!showKey)} className="p-2 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                  <i className={`fas fa-eye${showKey ? '-slash' : ''} text-xs`}></i>
                </button>
              </div>
              
              <div className="flex gap-2 mt-2">
                <button ref={btnRef} onClick={handleAddKey} disabled={validating} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50">
                  {validating ? <span><i className="fas fa-circle-notch fa-spin mr-1"></i>Validating...</span> : <span><i className="fas fa-plus mr-1"></i>Add</span>}
                </button>
                {apiKeys.length > 0 && <button onClick={handleClearAll} className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50 transition">Clear</button>}
              </div>
            </>
          )}

          {apiKeys.length > 0 && youtubeApiExpanded && (
            <div className="mt-3">
              <button onClick={() => setApiKeysExpanded(!apiKeysExpanded)} className="flex items-center justify-between w-full text-xs text-[var(--text-muted)]">
                <span><i className="fas fa-key mr-1"></i>{apiKeys.length} key(s){currentKeyIndex >= 0 && ` (Key ${currentKeyIndex + 1} active)`}</span>
                <i className={`fas fa-chevron-${apiKeysExpanded ? 'up' : 'down'} text-xs`}></i>
              </button>
              
              {apiKeysExpanded && (
                <div className="mt-2 space-y-1">
                  {apiKeys.map((key, index) => (
                    <div key={index} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${index === currentKeyIndex ? 'border border-green-500/50 bg-green-500/10' : 'border border-[var(--border-color)]'}`}>
                      <button onClick={() => setActiveKey(index)} className={`w-6 h-6 rounded flex items-center justify-center ${index === currentKeyIndex ? 'bg-green-500/20 text-green-500' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                        <i className={`fas ${index === currentKeyIndex ? 'fa-check' : 'fa-circle'} text-[10px]`}></i>
                      </button>
                      <span className="flex-1 font-mono truncate text-[var(--text-main)]">{key.substring(0, 8)}...{key.substring(key.length - 4)}</span>
                      <button onClick={() => removeApiKey(index)} className="w-6 h-6 rounded flex items-center justify-center text-red-400 hover:text-red-600">
                        <i className="fas fa-trash text-[10px]"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {statusMessage && <div className={`text-xs px-3 py-2 rounded-lg mt-2 ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{statusMessage.message}</div>}

          {apiKeys.length > 0 && youtubeApiExpanded && (
            <div className="pt-3 mt-3 border-t border-[var(--border-color)]">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[var(--text-muted)]">Quota</span>
                <span className="text-xs text-[var(--text-muted)]">{quota} / {maxQuota}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                <div className="h-full transition-all duration-300" style={{ width: quotaPercent + '%', background: quotaPercent > 90 ? '#ef4444' : quotaPercent > 70 ? '#f59e0b' : '#22c55e' }}></div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-[var(--text-muted)]">{quotaPercent.toFixed(1)}%</span>
                <button onClick={resetQuota} className="text-[10px] hover:text-blue-500 transition text-[var(--text-muted)]"><i className="fas fa-undo mr-0.5"></i>Reset</button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border-color)] pt-3">
          <button 
            onClick={() => setChatApiExpanded(!chatApiExpanded)} 
            className="flex items-center justify-between w-full text-xs font-medium mb-2 text-[var(--text-main)]"
          >
            <span><i className="fas fa-robot mr-2 text-purple-500"></i>AI Chat API</span>
            <i className={`fas fa-chevron-${chatApiExpanded ? 'up' : 'down'} text-xs`}></i>
          </button>
          
          <div className="flex flex-wrap gap-1 mb-2">
            {chatProviders.map((provider) => (
              <button
                key={provider.name}
                onClick={() => handleProviderSelect(provider)}
                className="px-2 py-1 rounded text-xs font-medium transition"
                style={{ 
                  background: chatApiUrl === provider.url ? 'var(--accent-color)' : 'var(--bg-hover)',
                  color: chatApiUrl === provider.url ? 'white' : 'var(--text-main)'
                }}
              >
                {provider.name}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={chatApiUrl}
              onChange={(e) => setChatApiUrl(e.target.value)}
              placeholder="API URL"
              className="w-full rounded-lg px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
            />
            <input
              type="password"
              value={chatApiKey}
              onChange={(e) => setChatApiKey(e.target.value)}
              placeholder="API Key"
              className="w-full rounded-lg px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
            />
            <input
              type="text"
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              placeholder="Model"
              className="w-full rounded-lg px-3 py-1.5 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button onClick={saveChatConfig} className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition">
              <i className="fas fa-save mr-1"></i>Save
            </button>
            <button onClick={clearChatConfig} className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50 transition">
              Clear
            </button>
          </div>

          {chatSaved && <div className="text-xs px-3 py-1.5 mt-2 rounded-lg bg-green-100 text-green-700"><i className="fas fa-check mr-1"></i>Saved!</div>}

          <button 
            onClick={() => setShowAllModels(!showAllModels)}
            className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs transition flex items-center justify-center gap-2"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            <i className={`fas fa-chevron-${showAllModels ? 'up' : 'down'}`}></i>
            {showAllModels ? 'Hide' : 'Show All'} Models ({allModels.length})
          </button>

          {showAllModels && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--border-color)]" style={{ background: 'var(--bg-main)' }}>
              {chatProviders.map((provider) => (
                <div key={provider.name}>
                  <div className="px-2 py-1 text-xs font-semibold sticky top-0" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                    {provider.name}
                  </div>
                  <div className="flex flex-wrap gap-1 p-2">
                    {provider.models.map((m) => (
                      <button
                        key={m.model}
                        onClick={() => handleModelSelect({ ...m, providerUrl: provider.url })}
                        className="px-2 py-0.5 rounded text-[10px] transition"
                        style={{ 
                          background: chatModel === m.model ? 'var(--accent-color)' : 'var(--bg-hover)',
                          color: chatModel === m.model ? 'white' : 'var(--text-main)'
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
