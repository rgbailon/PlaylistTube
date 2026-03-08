import { useState, useEffect } from 'react';
import { useApp } from '../App';

function ChatSettings() {
  const { getCookie, setCookie } = useApp();
  
const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [saved, setSaved] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    const config = getCookie('yt_chatbot_config');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        setApiUrl(parsed.url || '');
        setApiKey(parsed.key || '');
        setModel(parsed.model || 'gpt-3.5-turbo');
      } catch (e) {
        console.error('Failed to parse chat config:', e);
      }
    }
}, []);

  const clearConfig = () => {
    setApiUrl('');
    setApiKey('');
    setModel('gpt-3.5-turbo');
    document.cookie = 'yt_chatbot_config=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
    setSaved(false);
    setValidationResult(null);
  };

  const getProviderKey = (url) => {
    if (!url) return 'default';
    if (url.includes('openai.com')) return 'openai';
    if (url.includes('openrouter.ai')) return 'openrouter';
    if (url.includes('anthropic.com')) return 'anthropic';
    if (url.includes('generativelanguage') || url.includes('google')) return 'google';
    if (url.includes('x.ai')) return 'xai';
    if (url.includes('mistral.ai')) return 'mistral';
    if (url.includes('perplexity.ai')) return 'perplexity';
    if (url.includes('localhost:11434')) return 'ollama';
    return 'default';
  };

  const buildHeaders = (provider, key) => {
    const headers = { 'Content-Type': 'application/json' };
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
        headers['Authorization'] = `Bearer ${key}`;
        break;
case 'xai':
        headers['Authorization'] = `Bearer ${key}`;
        break;
      case 'perplexity':
        headers['Authorization'] = `Bearer ${key}`;
        break;
      default:
        headers['Authorization'] = `Bearer ${key}`;
    }
    return headers;
  };

  const buildBody = (provider, modelName) => {
    if (provider === 'anthropic') {
      return { model: modelName, max_tokens: 1024, messages: [{ role: 'user', content: 'Hello' }] };
    }
    return { model: modelName || 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'Hello' }] };
  };

  const validateApi = async () => {
    if (!apiUrl.trim() || !apiKey.trim()) {
      setValidationResult({ success: false, message: 'Please enter API URL and Key' });
      return false;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      const provider = getProviderKey(apiUrl);
      const headers = buildHeaders(provider, apiKey.trim());
      const body = buildBody(provider, model);

      const response = await fetch(`${apiUrl.trim()}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok && !data.error) {
        setValidationResult({ success: true, message: 'Connection successful!' });
        return true;
      } else {
        setValidationResult({ success: false, message: data.error?.message || 'Validation failed' });
        return false;
      }
    } catch (err) {
      setValidationResult({ success: false, message: err.message });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const saveConfig = async () => {
    const valid = await validateApi();
    if (!valid) return;

    const config = {
      url: apiUrl.trim(),
      key: apiKey.trim(),
      model: model.trim()
    };
    setCookie('yt_chatbot_config', JSON.stringify(config));
    setSaved(true);
    setValidationResult(null);
    setTimeout(() => setSaved(false), 3000);
  };

const presets = [
    { name: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { name: 'Anthropic', url: 'https://api.anthropic.com/v1', model: 'claude-3-haiku-20240307' },
    { name: 'Google', url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash-8b-exp-0827' },
    { name: 'xAI', url: 'https://api.x.ai/v1', model: 'grok-2-1212' },
    { name: 'Mistral', url: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
    { name: 'Perplexity', url: 'https://api.perplexity.ai', model: 'llama-3.1-sonar-small-128k-online' },
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet' },
    { name: 'Ollama', url: 'http://localhost:11434/v1', model: 'llama3.2' },
  ];

  const modelsByProvider = {
    openai: [
      { name: 'GPT-4o', value: 'gpt-4o', type: 'pro', icon: 'fa-robot' },
      { name: 'GPT-4o Mini', value: 'gpt-4o-mini', type: 'free', icon: 'fa-robot' },
      { name: 'GPT-4 Turbo', value: 'gpt-4-turbo', type: 'pro', icon: 'fa-robot' },
      { name: 'GPT-4', value: 'gpt-4', type: 'pro', icon: 'fa-robot' },
      { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', type: 'free', icon: 'fa-robot' },
    ],
    openrouter: [
      { name: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet', type: 'free', icon: 'fa-brain' },
      { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku', type: 'free', icon: 'fa-brain' },
      { name: 'GPT-4o', value: 'openai/gpt-4o', type: 'pro', icon: 'fa-robot' },
      { name: 'GPT-4o Mini', value: 'openai/gpt-4o-mini', type: 'free', icon: 'fa-robot' },
      { name: 'GPT-4', value: 'openai/gpt-4', type: 'pro', icon: 'fa-robot' },
      { name: 'Gemini 1.5 Pro', value: 'google/gemini-pro-1.5', type: 'pro', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Flash', value: 'google/gemini-flash-1.5', type: 'free', icon: 'fa-gem' },
      { name: 'Llama 3.1 405B', value: 'meta-llama/llama-3.1-405b', type: 'pro', icon: 'fa-paw' },
      { name: 'Llama 3.1 70B', value: 'meta-llama/llama-3.1-70b', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.1 8B', value: 'meta-llama/llama-3.1-8b', type: 'free', icon: 'fa-paw' },
      { name: 'Mistral Large', value: 'mistralai/mistral-large', type: 'pro', icon: 'fa-wind' },
      { name: 'Mistral Nemo', value: 'mistralai/mistral-nemo', type: 'free', icon: 'fa-wind' },
      { name: 'Qwen 2.5 72B', value: 'qwen/qwen-2.5-72b', type: 'free', icon: 'fa-wave-square' },
      { name: 'StepFun: Step 3.5 Flash', value: 'stepfun/step-3.5-flash:free', type: 'free', icon: 'fa-football-ball' },
      { name: 'Arcee AI: Trinity Large Preview', value: 'arcee-ai/trinity-large-preview:free', type: 'free', icon: 'fa-cubes' },
      { name: 'Z.ai: GLM 4.5 Air', value: 'zhipu/glm-4-9b-chat', type: 'free', icon: 'fa-bolt' },
      { name: 'NVIDIA: Nemotron 3 Nano', value: 'nvidia/nemotron-3-nano-4b-instruct', type: 'free', icon: 'fa-microchip' },
      { name: 'Qwen: Qwen3 235B', value: 'qwen/qwen3-235b-a22b', type: 'free', icon: 'fa-wave-square' },
      { name: 'Qwen: Qwen3 VL 235B', value: 'qwen/qwen2.5-vl-235b-a22b-instruct', type: 'free', icon: 'fa-wave-square' },
      { name: 'Arcee AI: Trinity Mini', value: 'arcee-ai/trinity-mini-preview:free', type: 'free', icon: 'fa-cubes' },
      { name: 'NVIDIA: Nemotron Nano 9B', value: 'nvidia/nemotron-nano-9b-v2-ij-instruct', type: 'free', icon: 'fa-microchip' },
      { name: 'NVIDIA: Nemotron Nano 12B VL', value: 'nvidia/nemotron-nano-12b-v2-vl-instruct', type: 'free', icon: 'fa-microchip' },
      { name: 'OpenAI: gpt-oss-120b', value: 'openai/gpt-oss-120b', type: 'free', icon: 'fa-robot' },
      { name: 'Meta: Llama 3.3 70B', value: 'meta-llama/llama-3.3-70b-instruct', type: 'free', icon: 'fa-paw' },
      { name: 'OpenAI: gpt-oss-20b', value: 'openai/gpt-oss-20b', type: 'free', icon: 'fa-robot' },
      { name: 'Qwen: Qwen3 Coder 480B', value: 'qwen/qwen3-coder-480b-a35b-instruct', type: 'free', icon: 'fa-code' },
      { name: 'Google: Gemma 3 27B', value: 'google/gemma-3-27b-it', type: 'free', icon: 'fa-gem' },
      { name: 'Qwen: Qwen3 Next 80B', value: 'qwen/qwen3-next-80b-a3b-instruct', type: 'free', icon: 'fa-wave-square' },
    ],
    anthropic: [
      { name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229', type: 'free', icon: 'fa-brain' },
      { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307', type: 'free', icon: 'fa-brain' },
    ],
    google: [
      { name: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash-exp', type: 'pro', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', type: 'pro', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash-8b-exp-0827', type: 'free', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', type: 'free', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Flash-8B', value: 'gemini-1.5-flash-8b', type: 'free', icon: 'fa-gem' },
    ],
    xai: [
      { name: 'Grok 2 Vision', value: 'grok-2-vision-1212', type: 'pro', icon: 'fa-bolt' },
      { name: 'Grok 2', value: 'grok-2-1212', type: 'pro', icon: 'fa-bolt' },
      { name: 'Grok 2 Flash', value: 'grok-2-flash-1212', type: 'free', icon: 'fa-bolt' },
      { name: 'Grok Beta', value: 'grok-beta', type: 'free', icon: 'fa-bolt' },
      { name: 'Grok Vision Beta', value: 'grok-vision-beta', type: 'free', icon: 'fa-eye' },
    ],
    mistral: [
      { name: 'Mistral Large', value: 'mistral-large-latest', type: 'pro', icon: 'fa-wind' },
      { name: 'Mistral Small', value: 'mistral-small-latest', type: 'free', icon: 'fa-wind' },
      { name: 'Mistral Nemo', value: 'mistral-nemo', type: 'free', icon: 'fa-wind' },
      { name: 'Mistral Codestral', value: 'codestral-latest', type: 'free', icon: 'fa-code' },
    ],
    perplexity: [
      { name: 'Sonar Large Online', value: 'llama-3.1-sonar-large-128k-online', type: 'pro', icon: 'fa-search' },
      { name: 'Sonar Small Online', value: 'llama-3.1-sonar-small-128k-online', type: 'free', icon: 'fa-search' },
      { name: 'Sonar Large', value: 'llama-3.1-sonar-large-128k', type: 'pro', icon: 'fa-search' },
      { name: 'Sonar Small', value: 'llama-3.1-sonar-small-128k', type: 'free', icon: 'fa-search' },
    ],
    ollama: [
      { name: 'Llama 3.2', value: 'llama3.2', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.1', value: 'llama3.1', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3', value: 'llama3', type: 'free', icon: 'fa-paw' },
      { name: 'Mistral', value: 'mistral', type: 'free', icon: 'fa-wind' },
      { name: 'Phi 3', value: 'phi3', type: 'free', icon: 'fa-atom' },
      { name: 'Gemma 2', value: 'gemma2', type: 'free', icon: 'fa-gem' },
      { name: 'Qwen 2.5', value: 'qwen2.5', type: 'free', icon: 'fa-wave-square' },
    ],
    default: [
      { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', type: 'free', icon: 'fa-robot' },
      { name: 'GPT-4o Mini', value: 'gpt-4o-mini', type: 'free', icon: 'fa-robot' },
    ],
  };

  const availableModels = modelsByProvider[getProviderKey(apiUrl)] || modelsByProvider.default;

  return (
    <div className="p-2 sm:p-3 rounded-lg border mb-2 sm:mb-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
        <i className="fas fa-robot text-purple-500"></i>
        AI Chat Settings
      </h3>

      <div className="space-y-2 sm:space-y-3">
        <div>
          <label className="block text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Provider</label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => { setApiUrl(preset.url); setModel(preset.model); }}
                className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition"
                style={{ 
                  background: apiUrl === preset.url ? 'var(--accent-color)' : 'var(--bg-hover)',
                  color: apiUrl === preset.url ? 'white' : 'var(--text-main)'
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>API URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
          />
        </div>

        <div>
          <label className="block text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
          />
        </div>

<div>
          <label className="block text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Model</label>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            {availableModels.find(m => m.value === model)?.icon && (
              <i className={`fas ${availableModels.find(m => m.value === model)?.icon}`} style={{ color: 'var(--accent-color)' }}></i>
            )}
            <span className="text-[10px] sm:text-xs truncate" style={{ color: 'var(--text-main)' }}>{availableModels.find(m => m.value === model)?.name || 'Select a model'}</span>
          </div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
          >
            <optgroup label="Pro Models">
              {availableModels.filter(m => m.type === 'pro').map((m) => (
                <option key={m.value} value={m.value}>{m.icon ? `⬤ ` : ''}{m.name}</option>
              ))}
            </optgroup>
            <optgroup label="Free Models">
              {availableModels.filter(m => m.type === 'free').map((m) => (
                <option key={m.value} value={m.value}>{m.icon ? `⬤ ` : ''}{m.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

<div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={saveConfig}
            disabled={validating}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] sm:text-xs font-medium transition disabled:opacity-50 min-w-[60px]"
          >
            <i className={`fas ${validating ? 'fa-spinner fa-spin' : 'fa-save'} mr-1`}></i>
            {validating ? '...' : 'Save'}
          </button>
          <button
            onClick={validateApi}
            disabled={validating}
            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-purple-200 text-purple-500 rounded-lg text-[10px] sm:text-xs hover:bg-purple-50 transition disabled:opacity-50"
          >
            <i className="fas fa-plug mr-1"></i>Test
          </button>
          <button
            onClick={clearConfig}
            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-red-200 text-red-500 rounded-lg text-[10px] sm:text-xs hover:bg-red-50 transition"
          >
            Clear
          </button>
        </div>

        {validationResult && (
          <div className={`text-xs px-3 py-2 rounded-lg ${validationResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <i className={`fas ${validationResult.success ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1`}></i>
            {validationResult.message}
          </div>
        )}

        {saved && !validationResult && (
          <div className="text-xs px-3 py-2 rounded-lg bg-green-100 text-green-700">
            <i className="fas fa-check mr-1"></i>Settings saved!
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatSettings;
