import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import LiveChat from './LiveChat';
import Settings from './Settings';

function Header() {
  const { apiKeys, quota, setCurrentPlaylist, setCurrentVideoIndex, mobileSidebarOpen, setMobileSidebarOpen, currentPlaylist, currentVideoIndex, getCurrentApiKey, settingsOpen, setSettingsOpen, setForceSearch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('playlist');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchType, setSearchType] = useState('video');
  const [searching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchSortOrder, setSearchSortOrder] = useState('relevance');
  const [searchRegion, setSearchRegion] = useState(() => {
    const saved = localStorage.getItem('userRegion');
    return saved || 'auto';
  });
  const [searchTimeFilter, setSearchTimeFilter] = useState('all');
  const headerSearchTriggeredRef = useRef(false);

  const getDetectedRegion = () => {
    const saved = localStorage.getItem('userRegion');
    if (saved) return saved;
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const regionMap = {
        'America/New_York': 'US', 'America/Los_Angeles': 'US', 'America/Chicago': 'US',
        'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Mexico_City': 'MX',
        'America/Sao_Paulo': 'BR', 'America/Buenos_Aires': 'BR',
        'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
        'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Manila': 'PH',
        'Asia/Kolkata': 'IN', 'Asia/Shanghai': 'CN', 'Asia/Singapore': 'SG',
        'Australia/Sydney': 'AU', 'Pacific/Auckland': 'NZ',
      };
      const region = regionMap[timezone] || 'US';
      localStorage.setItem('userRegion', region);
      return region;
    } catch { return 'US'; }
  };

const navItems = [
    { id: 'main', path: '/', icon: 'fa-play', label: 'Player' },
    { id: 'search', path: '/search', icon: 'fa-search', label: 'Videos' },
    { id: 'chat', path: '/chat', icon: 'fa-robot', label: 'Chat' },
    { id: 'whiteboard', path: '/whiteboard', icon: 'fa-pen', label: 'Whiteboard' },
    { id: 'privacy', path: '/privacy', icon: 'fa-shield-alt', label: 'Privacy' },
  ];

  const isActive = (path) => location.pathname === path;

  const isValidSuggestion = (text) => {
    if (!text || text.includes('window.') || text.length < 2) return false;
    const gibberishPattern = /^[^a-zA-Z0-9\s]*$/;
    if (gibberishPattern.test(text)) return false;
    const randomChars = text.replace(/[a-zA-Z0-9\s]/g, '').length;
    if (randomChars > text.length * 0.3) return false;
return true;
  };

  useEffect(() => {
    const fetchSuggestions = async (query) => {
      if (!query.trim() || query.length < 2 || headerSearchTriggeredRef.current) {
        setSuggestions([]);
        return;
      }
      try {
        const url = `/api/suggest?q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.split('\n');
        const suggestions = [];
        for (const line of lines) {
          const matches = line.match(/"([^"]+)"/g);
          if (matches) {
            for (const m of matches) {
              let val = m.replace(/"/g, '');
              try { val = JSON.parse('"' + val + '"'); } catch { /* ignore */ }
              if (isValidSuggestion(val)) {
                suggestions.push(val);
              }
            }
          }
        }
        const unique = [...new Set(suggestions)].slice(0, 6);
        setSuggestions(unique);
      } catch { /* ignore */ }
    };

    const timeoutId = setTimeout(() => {
      fetchSuggestions(videoSearchQuery);
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [videoSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.header-suggestions-container')) {
        setSuggestions([]);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion) => {
    setVideoSearchQuery(suggestion);
    setSuggestions([]);
    setSelectedIndex(-1);
    headerSearchTriggeredRef.current = true;
    const region = searchRegion === 'auto' ? getDetectedRegion() : searchRegion;
    const filters = { sortOrder: searchSortOrder, region, timeFilter: searchTimeFilter };
    if (isActive('/search')) {
      setForceSearch({ query: suggestion, type: searchType, filters });
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion)}&type=${searchType}&sort=${searchSortOrder}&region=${region}&time=${searchTimeFilter}`);
    }
  };

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

  const handleVideoSearch = (e) => {
    e.preventDefault();
    if (!videoSearchQuery.trim()) return;
    
    const input = videoSearchQuery.trim();
    const videoId = extractVideoId(input);
    const playlistId = extractPlaylistId(input);
    const region = searchRegion === 'auto' ? getDetectedRegion() : searchRegion;
    
    headerSearchTriggeredRef.current = true;
    setSuggestions([]);
    setSelectedIndex(-1);
    
    if (videoId) {
      if (!getCurrentApiKey()) {
        setSearchError('Please add a YouTube API key in Settings');
        return;
      }
      const video = {
        id: videoId,
        title: videoId,
        channelTitle: 'Direct URL',
      };
      setCurrentPlaylist([video]);
      setCurrentVideoIndex(0);
      navigate('/');
    } else if (playlistId) {
      const filters = { sortOrder: searchSortOrder, region, timeFilter: searchTimeFilter };
      if (isActive('/search')) {
        setForceSearch({ query: `?list=${playlistId}`, type: 'playlist', filters });
      } else {
        navigate(`/search?list=${playlistId}&sort=${searchSortOrder}&region=${region}&time=${searchTimeFilter}`);
      }
    } else {
      const filters = { sortOrder: searchSortOrder, region, timeFilter: searchTimeFilter };
      if (isActive('/search')) {
        setForceSearch({ query: input, type: searchType, filters });
      } else {
        navigate(`/search?q=${encodeURIComponent(input)}&type=${searchType}&sort=${searchSortOrder}&region=${region}&time=${searchTimeFilter}`);
      }
    }
    setVideoSearchQuery('');
  };

  return (
    <>
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
            className="w-8 h-8 rounded-lg flex items-center justify-center logo-icon"
            style={{ background: 'var(--accent-color)' }}
          >
            <i className="fa-solid fa-circle-play text-base" style={{ color: '#000000' }}></i>
          </div>
          <span 
            className="text-base font-bold logo-text"
          >
            PlaylistPlay
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

      <form onSubmit={handleVideoSearch} className="header-search-form hidden md:flex items-center gap-2 mx-4 flex-1 max-w-md">
        {searchError && (
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs whitespace-nowrap">
            {searchError}
          </div>
        )}
        <div className="relative flex-1">
          <input
            type="text"
            value={videoSearchQuery}
            onChange={(e) => {
              setVideoSearchQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => { setSearchFocused(true); headerSearchTriggeredRef.current = false; }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSuggestions([]);
                setSelectedIndex(-1);
                setSearchFocused(false);
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                handleVideoSearch(e);
                return;
              }
              if (suggestions.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
              } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                handleSelectSuggestion(suggestions[selectedIndex]);
              }
            }}
            placeholder="Search video or paste URL..."
            className="w-full rounded-full px-4 py-1.5 text-sm bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
          />
            {searchFocused && videoSearchQuery && suggestions.length > 0 && (
            <div
              className="header-suggestions-container absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="px-4 py-2.5 cursor-pointer text-sm"
                  style={{ 
                    color: 'var(--text-main)', 
                    background: index === selectedIndex ? 'var(--bg-hover)' : 'transparent',
                    borderBottom: index < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none' 
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleVideoSearch}
          disabled={!getCurrentApiKey()}
          className="p-2 rounded-full hover:bg-[var(--bg-hover)] disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
        >
          <i className={`fas ${searching ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
        </button>
      </form>

      <nav className="hidden md:flex items-center gap-1">
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
        <button
          onClick={() => { setSearchFocused(true); headerSearchTriggeredRef.current = false; }}
          className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
          style={{ color: 'var(--text-muted)' }}
        >
          <i className="fas fa-search text-lg"></i>
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
          style={{ color: 'var(--text-muted)' }}
        >
          <i className="fas fa-bars text-lg"></i>
        </button>
      </div>

      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 animate-fade-in"
          onClick={() => { setMobileMenuOpen(false); }}
        />
      )}

      <div 
        className={`md:hidden fixed top-12 right-0 w-64 z-50 shadow-xl h-[calc(100vh-3rem)] overflow-y-auto transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ 
          background: 'var(--bg-card)', 
          borderLeft: '1px solid var(--border-color)' 
        }}
      >
            <nav className="py-2">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => { setMobileMenuOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition ${
                    isActive(item.path) ? 'font-semibold' : ''
                  }`}
                  style={{ 
                    color: isActive(item.path) ? 'var(--accent-color)' : 'var(--text-main)',
                    background: isActive(item.path) ? 'var(--accent-bg)' : 'transparent'
                  }}
                >
                  <i className={`fas ${item.icon} w-5 text-center`}></i>
                  {item.label}
                </Link>
              ))}
            </nav>
            
            <div className="absolute bottom-0 left-0 right-0 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={() => { setMobileMenuOpen(false); setSettingsOpen(true); }}
                className="flex items-center gap-3 px-4 py-3 text-sm w-full transition"
                style={{ color: 'var(--text-main)' }}
              >
                <i className="fas fa-cog w-5 text-center"></i>
                Settings
              </button>
            </div>
          </div>

      </header>

      {/* Mobile Settings Modal */}
      {settingsOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setSettingsOpen(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl"
            style={{ background: 'var(--bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-main)' }}>Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4">
              <Settings />
            </div>
          </div>
        </div>
      )}

      {/* Single Floating Search Bar - Works on Mobile and Desktop */}
      {searchFocused && (
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[25vh] px-2"
          style={{ 
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px) saturate(150%)',
            WebkitBackdropFilter: 'blur(8px) saturate(150%)',
            animation: 'fadeIn 150ms ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSearchFocused(false);
            }
          }}
        >
          <div 
            className="w-full max-w-2xl rounded-xl overflow-hidden"
            style={{ 
              background: 'var(--bg-card, rgba(30, 30, 30, 0.98))',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px var(--border-color, rgba(255, 255, 255, 0.1))',
              animation: 'scaleIn 150ms ease-out'
            }}
          >
              <div className="flex flex-col gap-4 p-2 md:p-3">
              <div className="flex items-center justify-center gap-2">
                <i className="fas fa-search text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}></i>
<input
                  placeholder="Search video or paste URL..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-center w-full font-medium"
                  type="text"
                  value={videoSearchQuery}
                  onChange={(e) => {
                    setVideoSearchQuery(e.target.value);
                    setSelectedIndex(-1);
                  }}
                  onKeyDown={(e) => {
                    if (suggestions.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSelectedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
                      } else if (e.key === 'Enter' && selectedIndex >= 0) {
                        e.preventDefault();
                        handleSelectSuggestion(suggestions[selectedIndex]);
                        setSearchFocused(false);
                        return;
                      }
                    }
                    if (e.key === 'Enter') {
                      handleVideoSearch(e);
                      setSearchFocused(false);
                    } else if (e.key === 'Escape') {
                      setSearchFocused(false);
                    }
                  }}
                  style={{ color: '#ffffff' }}
                  autoFocus
                />
                <button
                  onClick={() => setSearchFocused(false)}
                  className="px-1.5 py-1 rounded-md text-xs"
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.5)',
                    background: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  ESC
                </button>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-2 px-1">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="px-1.5 py-1 rounded-md text-xs font-medium appearance-none cursor-pointer text-center"
                  style={{ 
                    color: '#ffffff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <option value="video" style={{ background: '#1e1e1e', color: '#ffffff' }}>Video</option>
                  <option value="playlist" style={{ background: '#1e1e1e', color: '#ffffff' }}>Playlist</option>
                  <option value="live" style={{ background: '#1e1e1e', color: '#ffffff' }}>Live</option>
                  <option value="courses" style={{ background: '#1e1e1e', color: '#ffffff' }}>Courses</option>
                </select>

                <select
                  value={searchSortOrder}
                  onChange={(e) => setSearchSortOrder(e.target.value)}
                  className="px-1.5 py-1 rounded-md text-xs font-medium appearance-none cursor-pointer text-center"
                  style={{ 
                    color: '#ffffff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <option value="relevance" style={{ background: '#1e1e1e', color: '#ffffff' }}>Relevance</option>
                  <option value="date" style={{ background: '#1e1e1e', color: '#ffffff' }}>Newest</option>
                  <option value="viewCount" style={{ background: '#1e1e1e', color: '#ffffff' }}>Popular</option>
                </select>

                <select
                  value={searchTimeFilter}
                  onChange={(e) => setSearchTimeFilter(e.target.value)}
                  className="px-1.5 py-1 rounded-md text-xs font-medium appearance-none cursor-pointer text-center"
                  style={{ 
                    color: '#ffffff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <option value="all" style={{ background: '#1e1e1e', color: '#ffffff' }}>All Time</option>
                  <option value="today" style={{ background: '#1e1e1e', color: '#ffffff' }}>Today</option>
                  <option value="week" style={{ background: '#1e1e1e', color: '#ffffff' }}>This Week</option>
                  <option value="month" style={{ background: '#1e1e1e', color: '#ffffff' }}>This Month</option>
                </select>

                <select
                  value={searchRegion}
                  onChange={(e) => setSearchRegion(e.target.value)}
                  className="px-1.5 py-1 rounded-md text-xs font-medium appearance-none cursor-pointer text-center"
                  style={{ 
                    color: '#ffffff',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}
                >
                  <option value="auto" style={{ background: '#1e1e1e', color: '#ffffff' }}>Auto</option>
                  <option value="US" style={{ background: '#1e1e1e', color: '#ffffff' }}>US</option>
                  <option value="GB" style={{ background: '#1e1e1e', color: '#ffffff' }}>UK</option>
                  <option value="PH" style={{ background: '#1e1e1e', color: '#ffffff' }}>PH</option>
                  <option value="IN" style={{ background: '#1e1e1e', color: '#ffffff' }}>IN</option>
                  <option value="CA" style={{ background: '#1e1e1e', color: '#ffffff' }}>CA</option>
                  <option value="AU" style={{ background: '#1e1e1e', color: '#ffffff' }}>AU</option>
                  <option value="DE" style={{ background: '#1e1e1e', color: '#ffffff' }}>DE</option>
                  <option value="FR" style={{ background: '#1e1e1e', color: '#ffffff' }}>FR</option>
                  <option value="JP" style={{ background: '#1e1e1e', color: '#ffffff' }}>JP</option>
                  <option value="KR" style={{ background: '#1e1e1e', color: '#ffffff' }}>KR</option>
                  <option value="BR" style={{ background: '#1e1e1e', color: '#ffffff' }}>BR</option>
                  <option value="MX" style={{ background: '#1e1e1e', color: '#ffffff' }}>MX</option>
                </select>
              </div>

              {suggestions.length > 0 && (
                <div
                  className="mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                  style={{ background: 'rgba(20, 20, 20, 0.95)' }}
                >
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        handleSelectSuggestion(suggestion);
                        setSearchFocused(false);
                      }}
                      className="px-4 py-2.5 cursor-pointer text-sm flex items-center gap-3"
                      style={{ 
                        color: '#ffffff', 
                        background: index === selectedIndex ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                        borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none' 
                      }}
                    >
                      <i className="fas fa-search text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}></i>
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    {/* Bottom Navigation for Mobile */}
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 z-50 flex items-center justify-around border-t"
         style={{ 
            background: 'var(--bg-card)', 
            borderColor: 'var(--border-color)',
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}>
      <button
        onClick={() => {
          if (mobileSidebarOpen) {
            window.dispatchEvent(new CustomEvent('closeMobileSidebar'));
          } else {
            setMobileSidebarOpen(true);
          }
        }}
        className="flex flex-col items-center justify-center flex-1 h-full"
        style={{ color: mobileSidebarOpen ? 'var(--accent-color)' : 'var(--text-muted)' }}
      >
        <i className="fas fa-history text-lg"></i>
        <span className="text-[10px] mt-0.5">History</span>
      </button>
      <Link
        to="/"
        className="flex flex-col items-center justify-center flex-1 h-full"
        style={{ color: isActive('/') && !mobileSidebarOpen ? 'var(--accent-color)' : 'var(--text-muted)' }}
      >
        <i className="fas fa-play text-lg"></i>
        <span className="text-[10px] mt-0.5">Player</span>
      </Link>
      <button
        onClick={() => setPlaylistPanelOpen(!playlistPanelOpen)}
        className="flex flex-col items-center justify-center flex-1 h-full"
        style={{ color: playlistPanelOpen ? 'var(--accent-color)' : 'var(--text-muted)' }}
      >
        <i className="fas fa-list text-lg"></i>
        <span className="text-[10px] mt-0.5">Playlists</span>
      </button>
    </nav>

    {/* Mobile Playlist Panel Slide-in */}
    <div className={`md:hidden fixed inset-y-0 right-0 w-[85%] z-40 flex flex-col transition-transform duration-300 overflow-hidden ${playlistPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border-color)', bottom: '56px', top: '48px' }}>
      <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={() => setMobileTab('playlist')} className="flex-1 px-3 py-2 text-xs font-medium" style={{ color: mobileTab === 'playlist' ? 'var(--accent-color)' : 'var(--text-muted)', borderBottom: mobileTab === 'playlist' ? '2px solid var(--accent-color)' : '2px solid transparent' }}>
          <i className="fas fa-list-ol mr-1"></i>Playlist
        </button>
        <button onClick={() => setMobileTab('chat')} className="flex-1 px-3 py-2 text-xs font-medium" style={{ color: mobileTab === 'chat' ? '#22c55e' : 'var(--text-muted)', borderBottom: mobileTab === 'chat' ? '2px solid #22c55e' : '2px solid transparent' }}>
          <i className="fas fa-comments mr-1"></i>Live Chat
        </button>
        <button onClick={() => setPlaylistPanelOpen(false)} className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2" style={{ background: 'var(--bg-main)' }}>
        {mobileTab === 'playlist' ? (
          currentPlaylist.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No videos in playlist
            </p>
          ) : (
            currentPlaylist.map((video, index) => (
              <div key={video.id || index} onClick={() => { setCurrentVideoIndex(index); setPlaylistPanelOpen(false); }} className="flex gap-2 p-2 cursor-pointer mb-1 rounded-lg" style={{ background: index === currentVideoIndex ? 'var(--bg-hover)' : 'transparent' }}>
                <div className="relative w-20 h-12 rounded overflow-hidden flex-shrink-0">
                  <img src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
                  {index === currentVideoIndex && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <i className="fas fa-play text-white text-xs"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs line-clamp-2" style={{ color: 'var(--text-main)' }}>{video.title}</h4>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{video.channelTitle || 'Unknown'}</p>
                </div>
              </div>
            ))
          )
        ) : (
          currentPlaylist[currentVideoIndex]?.id ? (
            <LiveChat videoId={currentPlaylist[currentVideoIndex].id} />
          ) : (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
              Play a video first to use live chat
            </p>
          )
        )}
      </div>
    </div>
    {playlistPanelOpen && (
      <div 
        className="md:hidden fixed inset-0 z-30 bg-black/50"
        onClick={() => setPlaylistPanelOpen(false)}
      />
    )}
    </>
  );
}

export default Header;
