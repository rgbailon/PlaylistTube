import { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CastReceiver from './pages/CastReceiver';
import { getStoredSupabaseUrl, getStoredSupabaseKey, savePlaylist, saveVideo, saveLive, saveCourse, getAllItems, loadFullPlaylistsFromDb, deleteItem, cleanupZeroVideoPlaylists, testWriteAccess } from './lib/database';
import './index.css';

const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const VideoPage = lazy(() => import('./pages/VideoPage'));
const LivePage = lazy(() => import('./pages/LivePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const WhiteboardPage = lazy(() => import('./pages/WhiteboardPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

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
  const [notificationType, setNotificationType] = useState('success'); // 'success' or 'error'
  const [forceSearch, setForceSearch] = useState(null);
const [dbConnected, setDbConnected] = useState(false);
  const [dbSavedItems, setDbSavedItems] = useState({});
  const [dbLoading, setDbLoading] = useState(false);
  const [dbCanWrite, setDbCanWrite] = useState(false);

  useEffect(() => {
    loadSavedData();
    loadTheme();
    loadYouTubeAPI();
    checkDbConnection();

    const handleDbConnected = async () => {
      await loadFromDatabase();
      await loadDbSavedItems();
      const writeTest = await testWriteAccess();
      setDbCanWrite(writeTest.success);
    };
    window.addEventListener('dbConnected', handleDbConnected);
    return () => window.removeEventListener('dbConnected', handleDbConnected);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('yt_current_playlist', JSON.stringify(currentPlaylist));
      localStorage.setItem('yt_current_video_index', currentVideoIndex.toString());
    } catch {
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
      } catch { /* ignore */ }
      return updated;
    });
    try {
      localStorage.setItem('yt_last_search_query', query);
      localStorage.setItem('yt_last_search_type', type);
      setCookie('yt_last_search_query', query);
      setCookie('yt_last_search_type', type);
    } catch { /* ignore */ }
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
      } catch {
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
        const parsedHistory = JSON.parse(savedHistory);
        const filteredHistory = parsedHistory.filter(p => p.videos && p.videos.some(v => v && v.id));
        if (filteredHistory.length !== parsedHistory.length) {
          console.log(`[History] Filtered out ${parsedHistory.length - filteredHistory.length} playlists with zero videos`);
        }
        setPlaylistHistory(filteredHistory);
      } catch {
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
      } catch { /* ignore */ }
    }

    const savedApiCalls = localStorage.getItem('yt_api_calls');
    if (savedApiCalls) {
      try {
        setApiCalls(JSON.parse(savedApiCalls));
      } catch { /* ignore */ }
    }

    const savedSidebarState = localStorage.getItem('yt_sidebar_collapsed') || getCookie('yt_sidebar_collapsed');
    if (savedSidebarState === '1') {
      setSidebarCollapsed(true);
    }

    const savedCurrentPlaylist = localStorage.getItem('yt_current_playlist');
    if (savedCurrentPlaylist) {
      try {
        setCurrentPlaylist(JSON.parse(savedCurrentPlaylist));
      } catch {
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
      } catch {
        setLastSearchResults({});
      }
    }
  };

  const loadFromDatabase = async () => {
    try {
      const cleanupResult = await cleanupZeroVideoPlaylists();
      if (cleanupResult.success && cleanupResult.deleted > 0) {
        console.log(`[DB] Cleaned up ${cleanupResult.deleted} playlist(s) with zero videos`);
      }

      const [playlistsResult, coursesResult, videosResult, livesResult] = await Promise.all([
        loadFullPlaylistsFromDb(),
        getAllItems('course'),
        getAllItems('video'),
        getAllItems('live')
      ]);

      const allDbItems = [];
      const hasRlsError = coursesResult.isRlsError || videosResult.isRlsError || livesResult.isRlsError;
      if (hasRlsError) {
        showNotification('Supabase RLS policies may be blocking data. Check your table permissions.', 'warning');
      }
      
      const dbPlaylists = [];
      if (playlistsResult.success && playlistsResult.playlists) {
        dbPlaylists.push(...playlistsResult.playlists.map(p => ({
          ...p,
          addedAt: p.created_at,
          type: p.type || 'playlist'
        })));
      }
      
      const videosByPlaylistId = {};
      console.log('[DB] Total videos from Supabase:', videosResult.items?.length || 0);
      if (videosResult.success && videosResult.items) {
        videosResult.items.forEach(v => {
          if (v.playlist_id) {
            if (!videosByPlaylistId[v.playlist_id]) {
              videosByPlaylistId[v.playlist_id] = [];
            }
            videosByPlaylistId[v.playlist_id].push({
              id: v.video_id || v.id,
              title: v.title,
              description: v.description || '',
              thumbnail: v.thumbnail || '',
              channelTitle: v.channel_title || '',
              publishedAt: v.published_at,
              viewCount: v.view_count || 0,
              position: v.position
            });
          }
        });
        
        console.log('[DB] Videos grouped by playlist_id:', Object.keys(videosByPlaylistId).length);
        
        videosResult.items.forEach(v => {
          if (!v.playlist_id) {
            allDbItems.push({
              id: v.id,
              title: v.title,
              description: v.description || '',
              thumbnail: v.thumbnail || '',
              channelTitle: v.channel_title || '',
              type: 'video',
              addedAt: v.created_at,
              videos: [{
                id: v.video_id || v.id,
                title: v.title,
                description: v.description || '',
                thumbnail: v.thumbnail || '',
                channelTitle: v.channel_title || '',
                publishedAt: v.published_at,
                viewCount: v.view_count || 0
              }]
            });
          }
        });
      }
      
      if (coursesResult.success && coursesResult.items) {
        console.log('[DB] Courses from Supabase:', coursesResult.items.length);
        coursesResult.items.forEach(c => {
          const courseVideos = videosByPlaylistId[c.id] || [];
          console.log(`[DB] Course "${c.title}" (${c.id}):`, courseVideos.length, 'videos found');
          if (courseVideos.length > 0) {
            allDbItems.push({
              ...c,
              addedAt: c.created_at,
              type: 'courses',
              videos: courseVideos
            });
          } else if (c.video_count && c.video_count > 0) {
            console.log(`[DB] Course "${c.title}" has ${c.video_count} videos in courses table but none in videos table`);
            allDbItems.push({
              ...c,
              addedAt: c.created_at,
              type: 'courses',
              videos: []
            });
          } else {
            console.log(`[DB] Skipping course "${c.title}": no videos in videos table`);
          }
        });
      }
      
      if (dbPlaylists.length > 0) {
        const playlistsWithVideos = dbPlaylists.filter(p => 
          videosByPlaylistId[p.id] && videosByPlaylistId[p.id].length > 0
        );
        const playlistsWithoutVideos = dbPlaylists.filter(p => 
          !videosByPlaylistId[p.id] || videosByPlaylistId[p.id].length === 0
        );
        
        playlistsWithVideos.forEach(p => {
          allDbItems.push({
            ...p,
            videos: videosByPlaylistId[p.id] || []
          });
        });
        
        if (playlistsWithoutVideos.length > 0) {
          console.log(`[DB] ${playlistsWithoutVideos.length} playlist(s) with zero videos found in database`);
        }
      }
      
      if (livesResult.success && livesResult.items) {
        livesResult.items.forEach(l => {
          allDbItems.push({
            id: l.id,
            title: l.title,
            description: l.description || '',
            thumbnail: l.thumbnail || '',
            channelTitle: l.channel_title || '',
            type: 'live',
            addedAt: l.created_at,
            videos: [{
              id: l.id,
              title: l.title,
              description: l.description || '',
              thumbnail: l.thumbnail || '',
              channelTitle: l.channel_title || ''
            }]
          });
        });
      }
      
      if (allDbItems.length > 0) {
        console.log('[DB] Loading', allDbItems.length, 'items from Supabase');
        setPlaylistHistory(prev => {
          const merged = [...prev];
          let addedCount = 0;
          allDbItems.forEach(dbItem => {
            const hasValidVideos = dbItem.videos && dbItem.videos.some(v => v && v.id);
            if (!hasValidVideos) {
              console.log(`[DB] Skipping "${dbItem.title}": no valid videos`);
              return;
            }
            const exists = merged.find(p => p.id === dbItem.id);
            if (!exists) {
              console.log('[DB] Adding from Supabase:', dbItem.title, 'with', dbItem.videos.length, 'videos');
              merged.push(dbItem);
              addedCount++;
            } else {
              console.log('[DB] Already exists in local:', dbItem.id);
            }
          });
          console.log('[DB] Added', addedCount, 'new items from Supabase');
          return merged.sort((a, b) => new Date(b.addedAt || b.created_at) - new Date(a.addedAt || b.created_at));
        });
      } else {
        console.log('[DB] No items found in Supabase');
      }
    } catch (err) {
      console.error('[DB] loadFromDatabase error:', err);
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

  const showNotification = (message, type = 'success') => {
    if (!dbConnected) return;
    setNotification(message);
    setNotificationType(type);
    setTimeout(() => setNotification(null), 3000);
  };

  const safeSaveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
      try {
        document.cookie = `${key}=${encodeURIComponent(value)}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 365}`;
      } catch { /* ignore */ }
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
      setDbLoading(true);
      console.log('[DB] Checking Supabase connection...');
      
      await loadDbSavedItems();
      await loadFromDatabase();
      setDbLoading(false);
      
      setTimeout(async () => {
        console.log('[DB] Testing write access to Supabase...');
        const writeTest = await testWriteAccess();
        setDbCanWrite(writeTest.success);
        if (!writeTest.success) {
          console.warn('[DB] Write access blocked:', writeTest.error);
          if (writeTest.isRlsError) {
            showNotification('⚠ Supabase is read-only. Check RLS policies in Supabase dashboard.', 'warning');
          }
        } else {
          console.log('[DB] Write access confirmed to Supabase');
        }
      }, 100);
    } else {
      console.log('[DB] Supabase not configured - using local storage only');
    }
  };

const loadDbSavedItems = async () => {
    const result = await getAllItems();
    if (result.success && result.items) {
      const savedMap = {};
      result.items.forEach(item => {
        let cleanId = item.id;
        if (cleanId.endsWith('_playlist') || cleanId.endsWith('_video') || cleanId.endsWith('_live') || cleanId.endsWith('_course')) {
          cleanId = cleanId.slice(0, cleanId.lastIndexOf('_'));
        }
        const normalizedType = item.type === 'course' ? 'courses' : item.type;
        savedMap[cleanId] = true;
        savedMap[item.id] = true;
        savedMap[`${cleanId}_${normalizedType}`] = true;
        savedMap[`${cleanId}_${item.type}`] = true;
      });
      setDbSavedItems(savedMap);
    }
  };

const isItemSavedInDb = (id, type) => {
    const normalizedType = type === 'courses' ? 'course' : type;
    return !!(dbSavedItems[id] || dbSavedItems[`${id}_${type}`] || dbSavedItems[`${id}_${normalizedType}`]);
  };

const isDbConfigured = () => !!(getStoredSupabaseUrl() && getStoredSupabaseKey());

const addToHistory = async (playlist, type = 'playlist') => {
    const validVideos = (playlist.videos || []).filter(v => v && v.id);
    if (validVideos.length === 0) {
      console.log('[History] Skipped: playlist has no valid videos');
      return false;
    }
    const existingIndex = playlistHistory.findIndex(p => p.id === playlist.id);
    let newHistory;
    const playlistWithType = { ...playlist, videos: validVideos, type };
    if (existingIndex !== -1) {
      newHistory = [playlistWithType, ...playlistHistory.filter((_, i) => i !== existingIndex)];
    } else {
      newHistory = [playlistWithType, ...playlistHistory];
    }
    setPlaylistHistory(newHistory);
    const sortedHistory = newHistory.sort((a, b) => new Date(b.addedAt || b.created_at) - new Date(a.addedAt || b.created_at));
    const localSuccess = safeSaveToStorage('yt_playlist_history', JSON.stringify(sortedHistory));

    let saveResult = { success: false };
    const dbConfigured = isDbConfigured();
    const alreadySaved = isItemSavedInDb(playlist.id, type);
    console.log('[DB] isDbConfigured:', dbConfigured);
    console.log('[DB] Already in Supabase:', alreadySaved);
    console.log('[DB] Supabase URL:', getStoredSupabaseUrl() ? 'set' : 'empty');
    console.log('[DB] Supabase Key:', getStoredSupabaseKey() ? 'set' : 'empty');

    if (dbConfigured && dbCanWrite && !alreadySaved) {
      const normalizedType = type === 'course' ? 'courses' : type;
      console.log('[DB] Saving type:', normalizedType, 'with', validVideos.length, 'videos');
      try {
        if (normalizedType === 'video' || normalizedType === 'live') {
          const itemToSave = playlistWithType.videos?.[0] || playlistWithType;
          saveResult = normalizedType === 'video'
            ? await saveVideo(itemToSave)
            : await saveLive(itemToSave);
        } else if (normalizedType === 'courses') {
          if (validVideos.length === 0) {
            showNotification('Cannot save course with zero videos to Supabase', 'warning');
          } else {
            saveResult = await saveCourse(playlistWithType);
          }
        } else {
          saveResult = await savePlaylist(playlistWithType);
        }
        console.log('[DB] Save result:', saveResult);
        
        if (saveResult.success) {
          setDbSavedItems(prev => ({ ...prev, [`${playlist.id}_${normalizedType}`]: true }));
          const itemTypeLabel = normalizedType === 'courses' ? 'Course' : normalizedType;
          const title = playlist.title?.substring(0, 30) || 'Item';
          const videoCount = validVideos.length;
          showNotification(`✓ ${itemTypeLabel}: "${title}" (${videoCount} videos) saved to Supabase!`, 'success');
        } else if (saveResult.isQuotaError) {
          console.error('[DB] Storage quota exceeded:', saveResult.error);
          showNotification('⚠ Supabase storage full! Delete items or reduce sizes.', 'warning');
        } else if (saveResult.error && saveResult.error !== 'Not configured') {
          console.error('[DB] Save failed:', saveResult.error);
          if (!saveResult.error.includes('column') || !saveResult.error.includes('does not exist')) {
            showNotification(`✗ Failed to save to Supabase: ${saveResult.error}`, 'error');
          } else {
            showNotification('⚠ Schema mismatch - saved to local storage only', 'warning');
          }
        }
      } catch (err) {
        console.error('[DB] Unexpected error:', err);
        const errMessage = err.message || '';
        if (errMessage.includes('quota') || errMessage.includes('storage') || errMessage.includes('Payload too large') || errMessage.includes('row-level') || errMessage.includes('RLS')) {
          showNotification('⚠ Supabase storage full! Delete items or reduce sizes.', 'warning');
        } else if (errMessage && !errMessage.includes('column') && !errMessage.includes('does not exist')) {
          showNotification(`✗ Supabase error: ${errMessage || 'Failed to save'}`, 'error');
        }
      }
    } else if (dbConfigured && !dbCanWrite) {
      showNotification('⚠ Database is read-only. Cannot save to Supabase.', 'warning');
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
    const success = await addToHistory(playlist, type);
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

const removeFromHistory = async (id) => {
    const item = playlistHistory.find(p => p.id === id);
    const newHistory = playlistHistory.filter(p => p.id !== id);
    setPlaylistHistory(newHistory);
    safeSaveToStorage('yt_playlist_history', JSON.stringify(newHistory));
    
    if (isDbConfigured() && item) {
      const type = item.type || 'playlist';
      const normalizedType = type === 'course' ? 'courses' : type;
      await deleteItem(id, normalizedType);
      setDbSavedItems(prev => {
        const newMap = { ...prev };
        delete newMap[`${id}_${normalizedType}`];
        delete newMap[id];
        return newMap;
      });
    }
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('yt_sidebar_collapsed', newState ? '1' : '0');
    setCookie('yt_sidebar_collapsed', newState ? '1' : '0');
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
    notification, notificationType, showNotification,
    forceSearch, setForceSearch,
    dbConnected, isItemSavedInDb, loadDbSavedItems, dbLoading, dbCanWrite
  };

  return (
    <AppContext.Provider value={value}>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
          <Header />
          {notification && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="px-6 py-4 rounded-xl shadow-2xl text-base font-semibold animate-fade-in transform scale-100"
                   style={{ 
                    background: notificationType === 'error' ? '#ef4444' : notificationType === 'warning' ? '#f59e0b' : 'var(--accent-color)', 
                    color: 'white' 
                  }}>
                <div className="flex items-center gap-3">
                  <i className={`fas ${notificationType === 'error' ? 'fa-exclamation-triangle' : notificationType === 'warning' ? 'fa-exclamation-circle' : 'fa-check-circle'} text-lg`}></i>
                  <span>{notification}</span>
                </div>
              </div>
            </div>
          )}
          <div className="flex">
            <Sidebar />
            <main className={`flex-1 mt-12 h-[calc(100vh-48px)] overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'ml-0 pl-3' : 'md:ml-64'} md:pb-0 pb-16`}>
              <Suspense fallback={<div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-main)' }}><i className="fas fa-spinner fa-spin text-2xl" style={{ color: 'var(--text-muted)' }}></i></div>}>
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
              </Suspense>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
