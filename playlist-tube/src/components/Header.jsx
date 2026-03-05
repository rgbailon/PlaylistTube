import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';

const themes = ['light', 'bold', 'dark', 'retro', 'cartoon', 'photo', 'forest', 'ocean', 'sunset', 'cyber', 'coffee', 'netflix'];

function Header() {
  const { theme, setTheme, apiKeys, getCurrentApiKey, setCurrentPlaylist, setCurrentVideoIndex, updateQuota, quota } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const navItems = [
    { id: 'main', path: '/', icon: 'fa-play', label: 'Player' },
    { id: 'search', path: '/search', icon: 'fa-list', label: 'Playlists' },
    { id: 'video', path: '/video', icon: 'fa-play-circle', label: 'Video' },
    { id: 'live', path: '/live', icon: 'fa-broadcast-tower', label: 'Live' },
    { id: 'chat', path: '/chat', icon: 'fa-robot', label: 'AI Chat' },
    { id: 'whiteboard', path: '/whiteboard', icon: 'fa-pen', label: 'Whiteboard' },
    { id: 'privacy', path: '/privacy', icon: 'fa-shield-alt', label: 'Privacy' },
  ];

  const isActive = (path) => location.pathname === path;

  const extractVideoId = (input) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^[a-zA-Z0-9_-]{11}$/
    ];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const extractPlaylistId = (input) => {
    const match = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleVideoSearch = async (e) => {
    e.preventDefault();
    if (!videoSearchQuery.trim()) return;
    if (!getCurrentApiKey()) {
      setSearchError('Please add a YouTube API key in Settings');
      return;
    }
    
    setSearching(true);
    setSearchError(null);
    try {
      const apiKey = getCurrentApiKey();
      const input = videoSearchQuery.trim();
      
      const videoId = extractVideoId(input);
      const playlistId = extractPlaylistId(input);
      
      if (videoId) {
        const video = {
          id: videoId,
          title: videoId,
          channelTitle: 'Direct URL',
        };
        setCurrentPlaylist([video]);
        setCurrentVideoIndex(0);
        navigate('/');
      } else if (playlistId) {
        navigate(`/search?list=${playlistId}`);
      } else {
        navigate(`/video?q=${encodeURIComponent(input)}`);
      }
      setVideoSearchQuery('');
    } catch (err) {
      console.error('Search failed:', err);
      setSearchError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <header 
      className="fixed top-0 left-0 right-0 h-12 z-50 flex items-center justify-between px-4 border-b"
      style={{ 
        background: 'var(--bg-card)', 
        borderColor: 'var(--border-color)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-color)' }}
          >
            <i className="fab fa-youtube text-white text-base"></i>
          </div>
          <span 
            className="text-base font-bold hidden sm:block"
            style={{ color: 'var(--text-main)' }}
          >
            PlaylistTube
          </span>
        </Link>
        
        {apiKeys.length > 0 && (
          <span 
            className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
            style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
          >
            <i className="fas fa-check-circle text-[10px]"></i>
            API Ready
          </span>
        )}
        
        {quota > 0 && (
          <span className="text-xs px-2" style={{ color: quota > 9000 ? '#ef4444' : 'var(--text-muted)' }}>
            {quota}/10000
          </span>
        )}
      </div>

      <form onSubmit={handleVideoSearch} className="hidden md:flex items-center gap-2 mx-4 flex-1 max-w-md">
        {searchError && (
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs whitespace-nowrap">
            {searchError}
          </div>
        )}
        <div className="relative flex-1">
          <input
            type="text"
            value={videoSearchQuery}
            onChange={(e) => setVideoSearchQuery(e.target.value)}
            placeholder="Search video or paste URL..."
            className="w-full rounded-full px-4 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !getCurrentApiKey()}
          className="p-2 rounded-full hover:bg-[var(--bg-hover)] disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
        >
          <i className={`fas ${searching ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
        </button>
      </form>

      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`nav-btn px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
              isActive(item.path) ? 'active' : ''
            }`}
          >
            <i className={`fas ${item.icon} text-sm`}></i>
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition flex items-center gap-2"
            style={{ color: 'var(--text-muted)' }}
          >
            <i className="fas fa-palette text-lg"></i>
            <span className="hidden sm:inline text-sm capitalize">{theme}</span>
            <i className="fas fa-chevron-down text-xs"></i>
          </button>

          {themeDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setThemeDropdownOpen(false)}
              />
              <div 
                className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg z-50 overflow-hidden"
                style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)' 
                }}
              >
                {themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTheme(t);
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-[var(--bg-hover)] transition ${
                      theme === t ? 'font-semibold' : ''
                    }`}
                    style={{ color: theme === t ? 'var(--accent-color)' : 'var(--text-main)' }}
                  >
                    <span className="capitalize">{t}</span>
                    {theme === t && <i className="fas fa-check text-xs"></i>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
