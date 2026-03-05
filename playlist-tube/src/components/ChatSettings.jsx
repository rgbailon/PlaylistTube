import { useState, useEffect } from 'react';
import { useApp } from '../App';

function ChatSettings() {
  const { getCookie, setCookie } = useApp();
  
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-3.5-turbo');
  const [saved, setSaved] = useState(false);

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

  const saveConfig = () => {
    const config = {
      url: apiUrl.trim(),
      key: apiKey.trim(),
      model: model.trim()
    };
    setCookie('yt_chatbot_config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const clearConfig = () => {
    setApiUrl('');
    setApiKey('');
    setModel('gpt-3.5-turbo');
    document.cookie = 'yt_chatbot_config=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  };

  const presets = [
    { name: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
    { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3-haiku' },
    { name: 'Ollama', url: 'http://localhost:11434/v1', model: 'llama3' },
  ];

  return (
    <div className="p-3 rounded-lg border mb-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
        <i className="fas fa-robot text-purple-500"></i>
        AI Chat Settings
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Provider</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => { setApiUrl(preset.url); setModel(preset.model); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
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
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>API URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full rounded-lg px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-3.5-turbo"
            className="w-full rounded-lg px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveConfig}
            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition"
          >
            <i className="fas fa-save mr-1"></i>
            Save
          </button>
          <button
            onClick={clearConfig}
            className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50 transition"
          >
            Clear
          </button>
        </div>

        {saved && (
          <div className="text-xs px-3 py-2 rounded-lg bg-green-100 text-green-700">
            <i className="fas fa-check mr-1"></i>Settings saved!
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatSettings;
