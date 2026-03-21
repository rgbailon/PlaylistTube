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
import CastReceiver from './pages/CastReceiver';
import { getStoredSupabaseUrl, getStoredSupabaseKey, savePlaylist, saveVideo, saveLive, saveCourse, getAllItems, loadFullPlaylistsFromDb } from './lib/database';
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
  const [apiUsage, setApiUsage] = useState({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 });
  const [apiCalls, setApiCalls] = useState({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [playlistPanelOpen, setPlaylistPanelOpen] = useState(false);
  const [playerPanelOpen, setPlayerPanelOpen] = useState(true);
  const [lastSearchResults, setLastSearchResults] = useState({});
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [lastSearchType, setLastSearchType] = useState('');
const [notification, setNotification] = useState(null);
  const [forceSearch, setForceSearch] = useState(null);
  const [dbConnected, setDbConnected] = useState(false);
  const [dbSavedItems, setDbSavedItems] = useState({});

useEffect(() => {
    loadSavedData();
    loadTheme();
    loadYouTubeAPI();
    checkDbConnection();

    const handleDbConnected = () => {
      loadFromDatabase();
      loadDbSavedItems();
    };
    window.addEventListener('dbConnected', handleDbConnected);
    return () => window.removeEventListener('dbConnected', handleDbConnected);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('yt_current_playlist', JSON.stringify(currentPlaylist));
      localStorage.setItem('yt_current_video_index', currentVideoIndex.toString());
    } catch (e) {
      if (typeof showNotification === 'function') {
        showNotification('Storage full! Cannot save current playlist.');
      }
    }
  }, [currentPlaylist, currentVideoIndex]);

  const saveSearchResults = (query, type, results) => {
    setLastSearchQuery(query);
    setLastSearchType(type);
    setLastSearchResults(prev => {
      const updated = { ...prev, [type]: results };
      try {
        localStorage.setItem('yt_last_search_results', JSON.stringify(updated));
        document.cookie = `yt_last_search_results=${encodeURIComponent(JSON.stringify(updated))}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`;
      } catch (e) {}
      return updated;
    });
    try {
      localStorage.setItem('yt_last_search_query', query);
      localStorage.setItem('yt_last_search_type', type);
      setCookie('yt_last_search_query', query);
      setCookie('yt_last_search_type', type);
    } catch (e) {}
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

    const savedApiUsage = localStorage.getItem('yt_api_usage');
    if (savedApiUsage) {
      try {
        setApiUsage(JSON.parse(savedApiUsage));
      } catch (e) {}
    }

    const savedApiCalls = localStorage.getItem('yt_api_calls');
    if (savedApiCalls) {
      try {
        setApiCalls(JSON.parse(savedApiCalls));
      } catch (e) {}
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

    const savedSearchQuery = localStorage.getItem('yt_last_search_query') || getCookie('yt_last_search_query');
    const savedSearchType = localStorage.getItem('yt_last_search_type') || getCookie('yt_last_search_type');
    const savedSearchResults = localStorage.getItem('yt_last_search_results') || getCookie('yt_last_search_results');
    if (savedSearchResults) {
      try {
        setLastSearchQuery(savedSearchQuery || '');
        setLastSearchType(savedSearchType || '');
        setLastSearchResults(JSON.parse(savedSearchResults));
      } catch (e) {
        setLastSearchResults({});
      }
    }
  };

  const loadFromDatabase = async () => {
    const result = await loadFullPlaylistsFromDb();
    if (result.success && result.playlists && result.playlists.length > 0) {
      const dbPlaylists = result.playlists.map(p => ({
        ...p,
        addedAt: p.created_at
      }));
      
      const playlistsNeedingVideos = dbPlaylists.filter(p => !p.videos || p.videos.length === 0);
      
      for (const playlist of playlistsNeedingVideos) {
        const apiKey = getCurrentApiKey();
        if (apiKey && playlist.id) {
          try {
            const resp = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlist.id}&key=${apiKey}`
            );
            const data = await resp.json();
            if (data.items && data.items.length > 0) {
              const videos = data.items
                .filter(item => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
                .map((item, index) => ({
                  id: item.snippet.resourceId.videoId,
                  title: item.snippet.title,
                  description: item.snippet.description,
                  thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                  channelTitle: item.snippet.channelTitle,
                  publishedAt: item.snippet.publishedAt,
                  viewCount: 0,
                }));
              
              const playlistIndex = dbPlaylists.findIndex(p => p.id === playlist.id);
              if (playlistIndex !== -1) {
                dbPlaylists[playlistIndex].videos = videos;
                dbPlaylists[playlistIndex].videoCount = videos.length;
              }
            }
          } catch (err) {
            console.error('Failed to fetch videos for playlist:', playlist.id, err);
          }
        }
      }
      
      setPlaylistHistory(prev => {
        const merged = [...prev];
        dbPlaylists.forEach(dbPlaylist => {
          const exists = merged.find(p => p.id === dbPlaylist.id);
          if (!exists) {
            merged.push(dbPlaylist);
          }
        });
        return merged;
      });
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

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const safeSaveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
      try {
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 365}`;
      } catch (cookieError) {}
      return true;
    } catch (error) {
      if (typeof showNotification === 'function') {
        if (error.name === 'QuotaExceededError' || 
            error.code === 22 || 
            error.message?.includes('Quota exceeded') ||
            error.message?.includes('quota')) {
          showNotification('Storage full! Please clear some playlists to add more videos.');
        } else {
          showNotification('Failed to save. Storage may be full.');
        }
      }
      return false;
    }
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
    setApiUsage({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 });
    setApiCalls({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 });
    localStorage.setItem('yt_quota', '0');
    localStorage.setItem('yt_api_usage', JSON.stringify({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 }));
    localStorage.setItem('yt_api_calls', JSON.stringify({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 }));
    setCookie('yt_quota', '0');
    return true;
  };

  const API_COSTS = {
    search: 100,
    playlistItems: 1,
    playlists: 1,
    videos: 1,
    channels: 1,
    other: 1,
  };

  const updateQuota = (amount, type = 'other') => {
    const cost = Math.abs(amount);
    const newQuota = Math.max(0, quota + amount);
    setQuota(newQuota);
    localStorage.setItem('yt_quota', newQuota.toString());
    setCookie('yt_quota', newQuota.toString());
    
    if (amount < 0) {
      setApiUsage(prev => {
        const newApiUsage = { ...prev, [type]: prev[type] + cost };
        localStorage.setItem('yt_api_usage', JSON.stringify(newApiUsage));
        return newApiUsage;
      });
      setApiCalls(prev => {
        const newApiCalls = { ...prev, [type]: prev[type] + 1 };
        localStorage.setItem('yt_api_calls', JSON.stringify(newApiCalls));
        return newApiCalls;
      });
    } else if (amount > 0 && amount !== 10000) {
      setApiUsage(prev => {
        const newApiUsage = { ...prev, [type]: prev[type] + cost };
        localStorage.setItem('yt_api_usage', JSON.stringify(newApiUsage));
        return newApiUsage;
      });
      setApiCalls(prev => {
        const newApiCalls = { ...prev, [type]: prev[type] + 1 };
        localStorage.setItem('yt_api_calls', JSON.stringify(newApiCalls));
        return newApiCalls;
      });
    }
  };

  const checkAndSwitchApiKey = () => {
    if (quota >= 10000 && apiKeys.length > 1) {
      return switchToNextApiKey();
    }
    return false;
  };

  const resetQuota = () => {
    setQuota(0);
    setApiUsage({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 });
    setApiCalls({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 });
    localStorage.setItem('yt_quota', '0');
    localStorage.setItem('yt_api_usage', JSON.stringify({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 }));
    localStorage.setItem('yt_api_calls', JSON.stringify({ search: 0, playlistItems: 0, playlists: 0, videos: 0, channels: 0, other: 0 }));
    setCookie('yt_quota', '0');
  };

const checkDbConnection = async () => {
    const url = getStoredSupabaseUrl();
    const key = getStoredSupabaseKey();
    if (url && key) {
      setDbConnected(true);
      loadDbSavedItems();
      loadFromDatabase();
    }
  };

  const loadDbSavedItems = async () => {
    const result = await getAllItems();
    if (result.success && result.items) {
      const savedMap = {};
      result.items.forEach(item => {
        savedMap[`${item.id}_${item.type}`] = true;
      });
      setDbSavedItems(savedMap);
    }
  };

  const isItemSavedInDb = (id, type) => {
    return dbSavedItems[`${id}_${type}`] || false;
  };

const addToHistory = async (playlist, type = 'playlist') => {
    const existingIndex = playlistHistory.findIndex(p => p.id === playlist.id);
    let newHistory;
    const playlistWithType = { ...playlist, type };
    if (existingIndex !== -1) {
      newHistory = [playlistWithType, ...playlistHistory.filter((_, i) => i !== existingIndex)];
    } else {
      newHistory = [playlistWithType, ...playlistHistory];
    }
    setPlaylistHistory(newHistory);
    const localSuccess = safeSaveToStorage('yt_playlist_history', JSON.stringify(newHistory));

    if (dbConnected) {
      let saveResult;
      if (type === 'video') {
        saveResult = await saveVideo(playlistWithType);
      } else if (type === 'live') {
        saveResult = await saveLive(playlistWithType);
      } else if (type === 'courses') {
        saveResult = await saveCourse(playlistWithType);
      } else {
        saveResult = await savePlaylist(playlistWithType);
      }
      if (saveResult.success) {
        setDbSavedItems(prev => ({ ...prev, [`${playlist.id}_${type}`]: true }));
      }
    }

    return localSuccess;
  };

  const addVideoToPlaylist = async (video, type = 'video') => {
    const playlist = {
      id: `video_${video.id}_${Date.now()}`,
      title: video.title,
      videos: [video],
      thumbnail: video.thumbnail,
      addedAt: new Date().toISOString(),
      type,
    };
    const success = addToHistory(playlist, type);
    if (success) {
      const totalVideos = playlistHistory.reduce((acc, p) => acc + (p.videos?.length || 0), 0) + 1;
      showNotification(`Added: ${video.title.substring(0, 20)}${video.title.length > 20 ? '...' : ''} (${totalVideos} videos)`);
    }
  };

  const clearHistory = () => {
    setPlaylistHistory([]);
    localStorage.removeItem('yt_playlist_history');
    deleteCookie('yt_playlist_history');
  };

  const removeFromHistory = (id) => {
    const newHistory = playlistHistory.filter(p => p.id !== id);
    setPlaylistHistory(newHistory);
    safeSaveToStorage('yt_playlist_history', JSON.stringify(newHistory));
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
    quota, updateQuota, resetQuota, checkAndSwitchApiKey, apiUsage, apiCalls,
    addToHistory, clearHistory, addVideoToPlaylist, removeFromHistory,
    sidebarCollapsed, setSidebarCollapsed, toggleSidebar,
    settingsOpen, setSettingsOpen,
    mobileSidebarOpen, setMobileSidebarOpen,
    playlistPanelOpen, setPlaylistPanelOpen,
    playerPanelOpen, setPlayerPanelOpen,
    getCookie, setCookie,
    saveSearchResults, lastSearchResults, lastSearchQuery, lastSearchType,
    notification, showNotification,
    forceSearch, setForceSearch,
    dbConnected, isItemSavedInDb, loadDbSavedItems
  };

  return (
    <AppContext.Provider value={value}>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
          <Header />
          {notification && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in" style={{ background: 'var(--accent-color)', color: 'white' }}>
              <i className="fas fa-check-circle mr-2"></i>
              {notification}
            </div>
          )}
          <div className="flex">
            <Sidebar />
            <main className={`flex-1 mt-12 h-[calc(100vh-48px)] overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'ml-0 pl-3' : 'md:ml-64'} md:pb-0 pb-16`}>
              <Routes>
                <Route path="/" element={<PlayerPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/video" element={<VideoPage />} />
                <Route path="/live" element={<LivePage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/whiteboard" element={<WhiteboardPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/cast" element={<CastReceiver />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
