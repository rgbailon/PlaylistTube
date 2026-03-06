import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PlayerPage from './pages/PlayerPage';
import SearchPage from './pages/SearchPage';
import VideoPage from './pages/VideoPage';
import LivePage from './pages/LivePage';
import ChatPage from './pages/ChatPage';
import WhiteboardPage from './pages/WhiteboardPage';
import PrivacyPage from './pages/PrivacyPage';
import './index.css';

export const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

function App() {
  const [currentPage, setCurrentPage] = useState('main');
  const [player, setPlayer] = useState(null);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [playlistHistory, setPlaylistHistory] = useState([]);
  const [theme, setTheme] = useState('light');
  const [apiKeys, setApiKeys] = useState([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [quota, setQuota] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lastSearchResults, setLastSearchResults] = useState([]);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [lastSearchType, setLastSearchType] = useState('');

  useEffect(() => {
    loadSavedData();
    loadTheme();
    loadYouTubeAPI();
  }, []);

  useEffect(() => {
    localStorage.setItem('yt_current_playlist', JSON.stringify(currentPlaylist));
    localStorage.setItem('yt_current_video_index', currentVideoIndex.toString());
  }, [currentPlaylist, currentVideoIndex]);

  const saveSearchResults = (query, type, results) => {
    setLastSearchQuery(query);
    setLastSearchType(type);
    setLastSearchResults(results);
    localStorage.setItem('yt_last_search_query', query);
    localStorage.setItem('yt_last_search_type', type);
    localStorage.setItem('yt_last_search_results', JSON.stringify(results));
  };

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('yt_theme') || getCookie('yt_theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  };

  const loadSavedData = () => {
    const savedApiKeys = localStorage.getItem('yt_api_keys') || getCookie('yt_api_keys');
    if (savedApiKeys) {
      try {
        setApiKeys(JSON.parse(savedApiKeys));
      } catch (e) {
        setApiKeys([]);
      }
    }

    const savedKeyIndex = localStorage.getItem('yt_current_key_index') || getCookie('yt_current_key_index');
    if (savedKeyIndex) {
      setCurrentKeyIndex(parseInt(savedKeyIndex) || 0);
    }

    const savedHistory = localStorage.getItem('yt_playlist_history') || getCookie('yt_playlist_history');
    if (savedHistory) {
      try {
        setPlaylistHistory(JSON.parse(savedHistory));
      } catch (e) {
        setPlaylistHistory([]);
      }
    }

    const savedQuota = localStorage.getItem('yt_quota') || getCookie('yt_quota');
    if (savedQuota) {
      setQuota(parseInt(savedQuota) || 0);
    }

    const savedSidebarState = localStorage.getItem('yt_sidebar_collapsed') || getCookie('yt_sidebar_collapsed');
    if (savedSidebarState === '1') {
      setSidebarCollapsed(true);
    }

    const savedCurrentPlaylist = localStorage.getItem('yt_current_playlist');
    if (savedCurrentPlaylist) {
      try {
        setCurrentPlaylist(JSON.parse(savedCurrentPlaylist));
      } catch (e) {
        setCurrentPlaylist([]);
      }
    }

    const savedVideoIndex = localStorage.getItem('yt_current_video_index');
    if (savedVideoIndex) {
      setCurrentVideoIndex(parseInt(savedVideoIndex) || 0);
    }

    const savedSearchQuery = localStorage.getItem('yt_last_search_query');
    const savedSearchType = localStorage.getItem('yt_last_search_type');
    const savedSearchResults = localStorage.getItem('yt_last_search_results');
    if (savedSearchResults) {
      try {
        setLastSearchQuery(savedSearchQuery || '');
        setLastSearchType(savedSearchType || '');
        setLastSearchResults(JSON.parse(savedSearchResults));
      } catch (e) {
        setLastSearchResults([]);
      }
    }
  };

  const loadYouTubeAPI = () => {
    if (document.getElementById('youtube-api-script')) return;
    const tag = document.createElement('script');
    tag.id = 'youtube-api-script';
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  };

  const setCookie = (name, value, days = 365) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  };

  const getCookie = (name) => {
    const value = document.cookie.split('; ').find(row => row.startsWith(name + '='));
    return value ? decodeURIComponent(value.split('=')[1]) : null;
  };

  const setNewTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('yt_theme', newTheme);
    setCookie('yt_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const addApiKey = async (key) => {
    const newKeys = [...apiKeys, key];
    setApiKeys(newKeys);
    localStorage.setItem('yt_api_keys', JSON.stringify(newKeys));
    setCookie('yt_api_keys', JSON.stringify(newKeys));
  };

  const removeApiKey = (index) => {
    const newKeys = apiKeys.filter((_, i) => i !== index);
    setApiKeys(newKeys);
    localStorage.setItem('yt_api_keys', JSON.stringify(newKeys));
    setCookie('yt_api_keys', JSON.stringify(newKeys));
    if (currentKeyIndex >= newKeys.length) {
      setCurrentKeyIndex(Math.max(0, newKeys.length - 1));
    }
  };

  const setActiveKey = (index) => {
    setCurrentKeyIndex(index);
    localStorage.setItem('yt_current_key_index', index.toString());
    setCookie('yt_current_key_index', index.toString());
  };

  const getCurrentApiKey = () => {
    if (apiKeys.length === 0) return null;
    return apiKeys[currentKeyIndex];
  };

  const switchToNextApiKey = () => {
    if (apiKeys.length <= 1) return false;
    const nextIndex = (currentKeyIndex + 1) % apiKeys.length;
    setCurrentKeyIndex(nextIndex);
    localStorage.setItem('yt_current_key_index', nextIndex.toString());
    setCookie('yt_current_key_index', nextIndex.toString());
    setQuota(0);
    localStorage.setItem('yt_quota', '0');
    setCookie('yt_quota', '0');
    return true;
  };

  const updateQuota = (amount) => {
    const newQuota = Math.max(0, quota + amount);
    setQuota(newQuota);
    localStorage.setItem('yt_quota', newQuota.toString());
    setCookie('yt_quota', newQuota.toString());
  };

  const checkAndSwitchApiKey = () => {
    if (quota >= 10000 && apiKeys.length > 1) {
      return switchToNextApiKey();
    }
    return false;
  };

  const resetQuota = () => {
    setQuota(0);
    localStorage.setItem('yt_quota', '0');
    setCookie('yt_quota', '0');
  };

  const addToHistory = (playlist) => {
    const existingIndex = playlistHistory.findIndex(p => p.id === playlist.id);
    let newHistory;
    if (existingIndex !== -1) {
      newHistory = [playlist, ...playlistHistory.filter((_, i) => i !== existingIndex)];
    } else {
      newHistory = [playlist, ...playlistHistory];
    }
    setPlaylistHistory(newHistory);
    localStorage.setItem('yt_playlist_history', JSON.stringify(newHistory));
    setCookie('yt_playlist_history', JSON.stringify(newHistory));
  };

  const addVideoToPlaylist = (video) => {
    const playlist = {
      id: `video_${video.id}_${Date.now()}`,
      title: video.title,
      videos: [video],
      thumbnail: video.thumbnail,
      addedAt: new Date().toISOString(),
    };
    addToHistory(playlist);
  };

  const clearHistory = () => {
    setPlaylistHistory([]);
    localStorage.removeItem('yt_playlist_history');
    deleteCookie('yt_playlist_history');
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    localStorage.setItem('yt_sidebar_collapsed', sidebarCollapsed ? '0' : '1');
    setCookie('yt_sidebar_collapsed', sidebarCollapsed ? '0' : '1');
  };

  const value = {
    currentPage, setCurrentPage,
    player, setPlayer,
    currentPlaylist, setCurrentPlaylist,
    currentVideoIndex, setCurrentVideoIndex,
    playlistHistory,
    theme, setTheme: setNewTheme,
    apiKeys, addApiKey, removeApiKey, currentKeyIndex, setActiveKey, getCurrentApiKey, switchToNextApiKey,
    quota, updateQuota, resetQuota, checkAndSwitchApiKey,
    addToHistory, clearHistory, addVideoToPlaylist,
    sidebarCollapsed, setSidebarCollapsed, toggleSidebar,
    settingsOpen, setSettingsOpen,
    mobileSidebarOpen, setMobileSidebarOpen,
    getCookie, setCookie,
    saveSearchResults, lastSearchResults, lastSearchQuery, lastSearchType
  };

  return (
    <AppContext.Provider value={value}>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
          <Header />
          <div className="flex">
            <Sidebar />
            <main className={`flex-1 mt-12 h-[calc(100vh-48px)] overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-64'} md:pb-0 pb-20`}>
              <Routes>
                <Route path="/" element={<PlayerPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/video" element={<VideoPage />} />
                <Route path="/live" element={<LivePage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/whiteboard" element={<WhiteboardPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
