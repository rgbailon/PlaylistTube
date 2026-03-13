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
    if (url.includes('groq.com')) return 'groq';
    if (url.includes('localhost:11434')) return 'ollama';
    return 'default';
  };

  const buildHeaders = (provider, key) => {
    const headers = { 'Content-Type': 'application/json' };
    if (!key) return headers;
    switch (provider) {
      case 'openai':
        headers['Authorization'] = `Bearer ${key}`;
        break;
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
      case 'mistral':
        headers['Authorization'] = `Bearer ${key}`;
        break;
      case 'perplexity':
        headers['Authorization'] = `Bearer ${key}`;
        break;
      case 'groq':
        headers['Authorization'] = `Bearer ${key}`;
        break;
      case 'ollama':
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
    { name: 'Anthropic', url: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-5-20250514' },
    { name: 'Google', url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash-exp' },
    { name: 'xAI', url: 'https://api.x.ai/v1', model: 'grok-3-mini' },
    { name: 'Mistral', url: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
    { name: 'Perplexity', url: 'https://api.perplexity.ai/v1', model: 'llama-3.1-sonar-small-128k-online' },
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-4-sonnet' },
    { name: 'Groq', url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-instruct' },
    { name: 'Ollama', url: 'http://localhost:11434/v1', model: 'llama3.3' },
  ];

  const modelsByProvider = {
    openai: [
      { name: 'GPT-4.5', value: 'gpt-4.5', type: 'pro', icon: 'fa-robot' },
      { name: 'GPT-4o', value: 'gpt-4o', type: 'pro', icon: 'fa-robot' },
      { name: 'o1', value: 'o1', type: 'pro', icon: 'fa-brain' },
      { name: 'o1-mini', value: 'o1-mini', type: 'pro', icon: 'fa-brain' },
      { name: 'o3', value: 'o3', type: 'pro', icon: 'fa-brain' },
      { name: 'o3-mini', value: 'o3-mini', type: 'pro', icon: 'fa-brain' },
      { name: 'GPT-4o Mini', value: 'gpt-4o-mini', type: 'free', icon: 'fa-robot' },
      { name: 'GPT-4 Turbo', value: 'gpt-4-turbo', type: 'free', icon: 'fa-robot' },
      { name: 'GPT-4', value: 'gpt-4', type: 'free', icon: 'fa-robot' },
      { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', type: 'free', icon: 'fa-robot' },
    ],
    openrouter: [
      { name: 'Claude 4 Opus', value: 'anthropic/claude-4-opus', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 4 Sonnet', value: 'anthropic/claude-4-sonnet', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3 Opus', value: 'anthropic/claude-3-opus', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet', type: 'free', icon: 'fa-brain' },
      { name: 'Claude 3 Haiku', value: 'anthropic/claude-3-haiku', type: 'free', icon: 'fa-brain' },
      { name: 'GPT-4.5', value: 'openai/gpt-4.5', type: 'pro', icon: 'fa-robot' },
      { name: 'GPT-4o', value: 'openai/gpt-4o', type: 'pro', icon: 'fa-robot' },
      { name: 'GPT-4o Mini', value: 'openai/gpt-4o-mini', type: 'free', icon: 'fa-robot' },
      { name: 'GPT-4', value: 'openai/gpt-4', type: 'free', icon: 'fa-robot' },
      { name: 'Gemini 2.5 Pro', value: 'google/gemini-2.5-pro', type: 'pro', icon: 'fa-gem' },
      { name: 'Gemini 2.0 Flash', value: 'google/gemini-2.0-flash', type: 'pro', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Pro', value: 'google/gemini-pro-1.5', type: 'free', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Flash', value: 'google/gemini-flash-1.5', type: 'free', icon: 'fa-gem' },
      { name: 'Llama 4 Scout', value: 'meta-llama/llama-4-scout', type: 'pro', icon: 'fa-paw' },
      { name: 'Llama 4 Maestro', value: 'meta-llama/llama-4-maestro', type: 'pro', icon: 'fa-paw' },
      { name: 'Llama 3.3 70B', value: 'meta-llama/llama-3.3-70b-instruct', type: 'pro', icon: 'fa-paw' },
      { name: 'Llama 3.1 405B', value: 'meta-llama/llama-3.1-405b', type: 'pro', icon: 'fa-paw' },
      { name: 'Llama 3.1 70B', value: 'meta-llama/llama-3.1-70b', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.1 8B', value: 'meta-llama/llama-3.1-8b', type: 'free', icon: 'fa-paw' },
      { name: 'Mistral Large 3', value: 'mistralai/mistral-large-3', type: 'pro', icon: 'fa-wind' },
      { name: 'Mistral Large', value: 'mistralai/mistral-large', type: 'pro', icon: 'fa-wind' },
      { name: 'Mistral Nemo', value: 'mistralai/mistral-nemo', type: 'free', icon: 'fa-wind' },
      { name: 'Qwen 3 600B', value: 'qwen/qwen3-600b-a14b', type: 'pro', icon: 'fa-wave-square' },
      { name: 'Qwen 3 300B', value: 'qwen/qwen3-300b-a22b', type: 'pro', icon: 'fa-wave-square' },
      { name: 'Qwen 2.5 72B', value: 'qwen/qwen-2.5-72b', type: 'free', icon: 'fa-wave-square' },
      { name: 'Qwen 2.5 VL 235B', value: 'qwen/qwen2.5-vl-235b-a22b-instruct', type: 'free', icon: 'fa-wave-square' },
      { name: 'Google: Gemma 3 27B', value: 'google/gemma-3-27b-it', type: 'free', icon: 'fa-gem' },
      { name: 'Google: Gemma 3 12B', value: 'google/gemma-3-12b-it', type: 'free', icon: 'fa-gem' },
      { name: 'NVIDIA: Nemotron 4', value: 'nvidia/nemotron-4-15b-instruct', type: 'pro', icon: 'fa-microchip' },
      { name: 'NVIDIA: Nemotron 3 Nano', value: 'nvidia/nemotron-3-nano-4b-instruct', type: 'free', icon: 'fa-microchip' },
      { name: 'DeepSeek V3', value: 'deepseek/deepseek-v3-base', type: 'pro', icon: 'fa-brain' },
      { name: 'DeepSeek R1', value: 'deepseek/deepseek-r1', type: 'free', icon: 'fa-brain' },
      { name: 'StepFun: Step 3.5', value: 'stepfun/step-3.5', type: 'free', icon: 'fa-football-ball' },
      { name: 'Arcee AI: Trinity Large', value: 'arcee-ai/trinity-large', type: 'pro', icon: 'fa-cubes' },
      { name: 'Arcee AI: Trinity Mini', value: 'arcee-ai/trinity-mini', type: 'free', icon: 'fa-cubes' },
      { name: 'Z.ai: GLM 4.5', value: 'zhipu/glm-4-9b-chat', type: 'free', icon: 'fa-bolt' },
    ],
    anthropic: [
      { name: 'Claude 4 Opus', value: 'claude-opus-4-5-20250514', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 4 Sonnet', value: 'claude-sonnet-4-5-20250514', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3 Opus', value: 'claude-3-opus-20240229', type: 'pro', icon: 'fa-brain' },
      { name: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229', type: 'free', icon: 'fa-brain' },
      { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307', type: 'free', icon: 'fa-brain' },
    ],
    google: [
      { name: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro-preview-06-05', type: 'pro', icon: 'fa-gem' },
      { name: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash-exp', type: 'pro', icon: 'fa-gem' },
      { name: 'Gemini 2.0 Flash Lite', value: 'gemini-2.0-flash-lite', type: 'free', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', type: 'free', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash-8b-exp-0827', type: 'free', icon: 'fa-gem' },
      { name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', type: 'free', icon: 'fa-gem' },
    ],
    xai: [
      { name: 'Grok 3', value: 'grok-3', type: 'pro', icon: 'fa-bolt' },
      { name: 'Grok 3 Mini', value: 'grok-3-mini', type: 'pro', icon: 'fa-bolt' },
      { name: 'Grok 2 Vision', value: 'grok-2-vision-1212', type: 'pro', icon: 'fa-bolt' },
      { name: 'Grok 2', value: 'grok-2-1212', type: 'free', icon: 'fa-bolt' },
      { name: 'Grok 2 Flash', value: 'grok-2-flash-1212', type: 'free', icon: 'fa-bolt' },
      { name: 'Grok Beta', value: 'grok-beta', type: 'free', icon: 'fa-bolt' },
      { name: 'Grok Vision Beta', value: 'grok-vision-beta', type: 'free', icon: 'fa-eye' },
    ],
    mistral: [
      { name: 'Mistral Large 3', value: 'mistral-large-2411', type: 'pro', icon: 'fa-wind' },
      { name: 'Mistral Large', value: 'mistral-large-latest', type: 'pro', icon: 'fa-wind' },
      { name: 'Mistral Small', value: 'mistral-small-latest', type: 'free', icon: 'fa-wind' },
      { name: 'Mistral Nemo', value: 'mistral-nemo', type: 'free', icon: 'fa-wind' },
      { name: 'Mistral Codestral', value: 'codestral-latest', type: 'free', icon: 'fa-code' },
    ],
    perplexity: [
      { name: 'Sonar Large Online', value: 'llama-3.1-sonar-large-128k-online', type: 'pro', icon: 'fa-search' },
      { name: 'Sonar Huge Online', value: 'llama-3.1-sonar-huge-128k-online', type: 'pro', icon: 'fa-search' },
      { name: 'Sonar Large', value: 'llama-3.1-sonar-large-128k', type: 'free', icon: 'fa-search' },
      { name: 'Sonar Small Online', value: 'llama-3.1-sonar-small-128k-online', type: 'free', icon: 'fa-search' },
      { name: 'Sonar Small', value: 'llama-3.1-sonar-small-128k', type: 'free', icon: 'fa-search' },
    ],
    groq: [
      { name: 'Llama 3.3 70B', value: 'llama-3.3-70b-instruct', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.2 90B Vision', value: 'llama-3.2-90b-vision-instruct', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.2 Vision', value: 'llama-3.2-11b-vision-instruct', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.1 70B', value: 'llama-3.1-70b-instruct', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.1 8B', value: 'llama-3.1-8b-instruct', type: 'free', icon: 'fa-paw' },
      { name: 'Mixtral 8x7B', value: 'mixtral-8x7b-32768', type: 'free', icon: 'fa-wind' },
      { name: 'Gemma 2 9B', value: 'gemma2-9b-it', type: 'free', icon: 'fa-gem' },
      { name: 'Qwen 2.5 72B', value: 'qwen-2.5-72b-instruct', type: 'free', icon: 'fa-wave-square' },
      { name: 'DeepSeek R1', value: 'deepseek-r1-distill-llama-70b', type: 'free', icon: 'fa-brain' },
    ],
    ollama: [
      { name: 'GLM-5 (Z.ai)', value: 'glm-5', type: 'pro', icon: 'fa-bolt' },
      { name: 'Qwen 3.5', value: 'qwen2.5:72b', type: 'free', icon: 'fa-wave-square' },
      { name: 'Qwen 3.5 (Large)', value: 'qwen2.5:122b', type: 'pro', icon: 'fa-wave-square' },
      { name: 'Nemotron-3 Super', value: 'nemotron-3-super', type: 'pro', icon: 'fa-microchip' },
      { name: 'LFM2-24B-A2B', value: 'lfm2-24b-a2b', type: 'free', icon: 'fa-bolt' },
      { name: 'MiniMax-M2.5', value: 'minimax-m2.5', type: 'free', icon: 'fa-brain' },
      { name: 'MiMo-V2-Flash', value: 'mimo-v2-flash', type: 'free', icon: 'fa-bolt' },
      { name: 'Llama 3.3', value: 'llama3.3', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.2', value: 'llama3.2', type: 'free', icon: 'fa-paw' },
      { name: 'Llama 3.1', value: 'llama3.1', type: 'free', icon: 'fa-paw' },
      { name: 'Mistral', value: 'mistral', type: 'free', icon: 'fa-wind' },
      { name: 'Phi 4', value: 'phi4', type: 'free', icon: 'fa-atom' },
      { name: 'Phi 3', value: 'phi3', type: 'free', icon: 'fa-atom' },
      { name: 'Gemma 2', value: 'gemma2', type: 'free', icon: 'fa-gem' },
      { name: 'Qwen 2.5', value: 'qwen2.5', type: 'free', icon: 'fa-wave-square' },
      { name: 'DeepSeek R1', value: 'deepseek-r1', type: 'free', icon: 'fa-brain' },
      { name: 'Mistral Large', value: 'mistral-large', type: 'free', icon: 'fa-wind' },
    ],
    default: [
      { name: 'GPT-4o Mini', value: 'gpt-4o-mini', type: 'free', icon: 'fa-robot' },
      { name: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307', type: 'free', icon: 'fa-brain' },
      { name: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash-exp', type: 'free', icon: 'fa-gem' },
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
