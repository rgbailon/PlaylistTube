import { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';

function Settings() {
  const { apiKeys, addApiKey, removeApiKey, currentKeyIndex, setActiveKey, quota, resetQuota, clearHistory, playlistHistory, apiUsage, apiCalls, theme, setTheme, setCurrentPlaylist } = useApp();
  
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeysExpanded, setApiKeysExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [quotaResetTime, setQuotaResetTime] = useState({ pacific: '', philippines: '' });
  const [themeExpanded, setThemeExpanded] = useState(false);
  const [clearPlaylistExpanded, setClearPlaylistExpanded] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    const updateResetTimes = () => {
      const now = new Date();
      
      // Calculate time until midnight Pacific Time (PT)
      // PT is UTC-8, PHT is UTC+8 (16 hours apart)
      const pacificOffset = -8;
      
      // Get current time in Pacific
      const nowPacificMs = now.getTime() + (pacificOffset * 60 * 60 * 1000) - (now.getTimezoneOffset() * 60 * 1000);
      const midnightPacificMs = new Date(nowPacificMs);
      midnightPacificMs.setHours(24, 0, 0, 0); // Next midnight PT
      
      // Time until reset (in milliseconds)
      const timeUntilReset = midnightPacificMs - nowPacificMs;
      
      // Calculate PT actual time when it resets
      const resetTimePT = new Date(midnightPacificMs);
      const ptHours = resetTimePT.getUTCHours();
      const ptMins = resetTimePT.getUTCMinutes();
      const ptSecs = resetTimePT.getUTCSeconds();
      const ptAmpm = ptHours >= 12 ? 'PM' : 'AM';
      const pt12 = ptHours % 12 || 12;
      
      // Convert midnight PT to PHT (add 16 hours)
      const resetTimePHT = new Date(midnightPacificMs + (16 * 60 * 60 * 1000));
      const phHours = resetTimePHT.getUTCHours();
      const phMins = resetTimePHT.getUTCMinutes();
      const phSecs = resetTimePHT.getUTCSeconds();
      const phAmpm = phHours >= 12 ? 'PM' : 'AM';
      const ph12 = phHours % 12 || 12;
      
      setQuotaResetTime({
        pacific: `${pt12}:${ptMins.toString().padStart(2, '0')}:${ptSecs.toString().padStart(2, '0')} ${ptAmpm} PT`,
        philippines: `${ph12}:${phMins.toString().padStart(2, '0')}:${phSecs.toString().padStart(2, '0')} ${phAmpm} PHT`
      });
    };
    
    updateResetTimes();
    const interval = setInterval(updateResetTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalUsed = Object.values(apiUsage).reduce((a, b) => a + b, 0);

const [youtubeApiExpanded, setYoutubeApiExpanded] = useState(false);

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

  const maxQuota = 10000;
  const quotaPercent = Math.min((quota / maxQuota) * 100, 100);

  return (
    <div className="p-3 rounded-lg border mb-3 relative bg-[var(--bg-card)] border-[var(--border-color)]">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--text-main)]">
        <i className="fas fa-cog text-blue-500"></i>
        Settings
      </h3>

      <div className="space-y-4">
        <div className="hidden md:block">
          <button 
            onClick={() => setThemeExpanded(!themeExpanded)} 
            className="flex items-center justify-between w-full text-xs font-medium mb-2 text-[var(--text-main)]"
          >
            <span><i className="fas fa-palette mr-2"></i>Theme</span>
            <i className={`fas fa-chevron-${themeExpanded ? 'up' : 'down'} text-xs`}></i>
          </button>
          
          {themeExpanded && (
            <div className="grid grid-cols-4 gap-2">
              {['light', 'bold', 'dark', 'retro', 'cartoon', 'photo', 'forest', 'forest2', 'ocean', 'sunset', 'cyber', 'coffee', 'netflix', 'sun'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-2 py-1.5 rounded-lg text-xs capitalize transition ${
                    theme === t ? 'ring-2 ring-[var(--accent-color)]' : ''
                  }`}
                  style={{ 
                    background: t === 'light' ? '#f5f5f5' : t === 'bold' ? '#171717' : t === 'dark' ? '#0f172a' : t === 'retro' ? '#fdf6e3' : t === 'cartoon' ? '#fff8f0' : t === 'photo' ? '#000000' : t === 'forest' ? '#14281d' : t === 'forest2' ? '#19270d' : t === 'ocean' ? '#0c4a6e' : t === 'sunset' ? '#4a044e' : t === 'cyber' ? '#000000' : t === 'coffee' ? '#E8D8C4' : t === 'netflix' ? '#141414' : '#1a1a1a',
                    color: t === 'light' || t === 'retro' || t === 'cartoon' || t === 'coffee' ? '#000000' : '#ffffff',
                    border: theme === t ? '2px solid var(--accent-color)' : '1px solid var(--border-color)'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

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
                <span className="text-xs text-[var(--text-muted)]">Total Quota</span>
                <span className="text-xs text-[var(--text-muted)]">{quota} / {maxQuota}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                <div className="h-full transition-all duration-300" style={{ width: quotaPercent + '%', background: quotaPercent > 90 ? '#ef4444' : quotaPercent > 70 ? '#f59e0b' : '#22c55e' }}></div>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-[var(--text-muted)]">{quotaPercent.toFixed(1)}% used</span>
                <button onClick={resetQuota} className="text-[10px] hover:text-blue-500 transition text-[var(--text-muted)]"><i className="fas fa-undo mr-0.5"></i>Reset</button>
              </div>
              <div className="mt-2 text-[10px] text-[var(--text-muted)] bg-[var(--bg-hover)] px-2 py-1.5 rounded">
                <div className="flex items-center gap-2">
                  <i className="fas fa-clock"></i>
                  <span>Resets in: {quotaResetTime.pacific} / {quotaResetTime.philippines}</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                <span className="text-xs font-medium text-[var(--text-muted)]">API Usage Breakdown</span>
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[var(--text-muted)]"><i className="fas fa-search mr-1"></i>Search</span>
                      <span className="text-[var(--text-main)]">{apiUsage.search} units</span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: (apiUsage.search / maxQuota * 100) + '%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[var(--text-muted)]"><i className="fas fa-list mr-1"></i>Playlists</span>
                      <span className="text-[var(--text-main)]">{apiUsage.playlists} units</span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                      <div className="h-full bg-green-500 transition-all duration-300" style={{ width: (apiUsage.playlists / maxQuota * 100) + '%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[var(--text-muted)]"><i className="fas fa-video mr-1"></i>Playlist Items</span>
                      <span className="text-[var(--text-main)]">{apiUsage.playlistItems} units</span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                      <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: (apiUsage.playlistItems / maxQuota * 100) + '%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[var(--text-muted)]"><i className="fas fa-eye mr-1"></i>Video Stats</span>
                      <span className="text-[var(--text-main)]">{apiUsage.videos} units</span>
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                      <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: (apiUsage.videos / maxQuota * 100) + '%' }}></div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-color)]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--text-muted)] font-medium">Total Used</span>
                      <span className="text-[var(--text-main)] font-medium">{totalUsed} units</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--bg-hover)] mt-1">
                      <div className="h-full transition-all duration-300" style={{ width: (totalUsed / maxQuota * 100) + '%', background: totalUsed > 9000 ? '#ef4444' : totalUsed > 7000 ? '#f59e0b' : '#22c55e' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={() => setClearPlaylistExpanded(!clearPlaylistExpanded)} 
            className="flex items-center justify-between w-full text-xs font-medium mb-2 text-[var(--text-main)]"
          >
            <span><i className="fas fa-trash mr-2 text-red-500"></i>Clear Playlist</span>
            <i className={`fas fa-chevron-${clearPlaylistExpanded ? 'up' : 'down'} text-xs`}></i>
          </button>
          
          {clearPlaylistExpanded && (
            <div className="space-y-2">
              <button 
                onClick={() => { if (confirm('Clear current playlist?')) { setCurrentPlaylist([]); }}}
                className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition"
              >
                <i className="fas fa-list mr-1"></i> Clear Current Playlist
              </button>
              <button 
                onClick={() => { if (confirm('Clear all history?')) { clearHistory(); }}}
                className="w-full px-3 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition"
              >
                <i className="fas fa-history mr-1"></i> Clear History
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
