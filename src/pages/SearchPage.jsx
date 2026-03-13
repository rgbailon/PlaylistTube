import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';

function SearchPage() {
  const { getCurrentApiKey, updateQuota, setCurrentPlaylist, setCurrentVideoIndex, addToHistory, currentPlaylist, checkAndSwitchApiKey, switchToNextApiKey, apiKeys, saveSearchResults, lastSearchResults, lastSearchQuery, lastSearchType, addVideoToPlaylist, forceSearch, setForceSearch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState('relevance');
  const [searchType, setSearchType] = useState('video');
  const [region, setRegion] = useState('US');
  const [timeFilter, setTimeFilter] = useState('all');
  const [nextPageToken, setNextPageToken] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingPlaylist, setLoadingPlaylist] = useState(null);
  const [addedMessage, setAddedMessage] = useState(null);
  const [addedType, setAddedType] = useState(null);
  const [error, setError] = useState(null);
  const [playlistDetails, setPlaylistDetails] = useState({});
  const [liveDetails, setLiveDetails] = useState({});
  const [videoStats, setVideoStats] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchTriggeredRef = useRef(false);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return diffDays + ' days ago';
    if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago';
    if (diffDays < 365) return Math.floor(diffDays / 30) + ' months ago';
    return Math.floor(diffDays / 365) + ' years ago';
  };

  const decodeHtml = (html) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const formatViewers = (count) => {
    if (!count) return '';
    const num = parseInt(count);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatViews = (count) => {
    if (!count) return '';
    const num = parseInt(count);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M views';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K views';
    return num.toString() + ' views';
  };

  const formatLikes = (count) => {
    if (!count) return '';
    const num = parseInt(count);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const regions = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'PH', name: 'Philippines' },
    { code: 'IN', name: 'India' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
  ];

  const timeFilters = [
    { value: 'all', label: 'All' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  const getPublishedAfter = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        return new Date(now.setDate(now.getDate() - 1)).toISOString();
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      default:
        return null;
    }
  };

  useEffect(() => {
    const fetchSuggestions = async (query) => {
      if (!query.trim() || query.length < 2 || searchTriggeredRef.current) {
        setSuggestions([]);
        return;
      }
      try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const url = isLocalhost 
          ? `https://corsproxy.io/?https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`
          : `/api/suggest?q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const text = await res.text();
        
        if (!text || text.includes('<!DOCTYPE') || text.includes('<html')) {
          setSuggestions([]);
          return;
        }
        
        const lines = text.split('\n');
        const suggestions = [];
        for (const line of lines) {
          const matches = line.match(/"([^"]+)"/g);
          if (matches) {
            for (const m of matches) {
              let val = m.replace(/"/g, '');
              try { val = JSON.parse('"' + val + '"'); } catch(e) {}
              val = val.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
              if (val && val.length >= 2 && !val.includes('window.') && /[a-zA-Z]/.test(val)) {
                suggestions.push(val);
              }
            }
          }
        }
        const unique = [...new Set(suggestions)].slice(0, 6);
        setSuggestions(unique);
      } catch (err) {
        setSuggestions([]);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-suggestions-container')) {
        setSuggestions([]);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (forceSearch) {
      const { query, type } = forceSearch;
      setSearchType(type || 'video');
      searchTriggeredRef.current = true;
      setSuggestions([]);
      setSelectedIndex(-1);
      if (query.startsWith('?list=')) {
        const playlistId = query.replace('?list=', '');
        const playlist = { id: { playlistId }, snippet: { title: 'Playlist', channelTitle: '' } };
        loadPlaylist(playlistId, playlist);
      } else {
        setSearchQuery(query);
        searchPlaylists(type, query);
      }
      setForceSearch(null);
    }
  }, [forceSearch]);

  const handleSelectSuggestion = (suggestion) => {
    searchTriggeredRef.current = true;
    setSearchQuery(suggestion);
    setSuggestions([]);
    setSelectedIndex(-1);
    searchPlaylists(null, suggestion);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      searchTriggeredRef.current = true;
      setSuggestions([]);
      setSelectedIndex(-1);
      searchPlaylists();
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
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const list = params.get('list');
    const type = params.get('type');
    
    const searchTypeFromUrl = (type && ['video', 'playlist', 'live', 'shorts_playlist', 'courses'].includes(type)) ? type : 'video';
    setSearchType(searchTypeFromUrl);
    
    if (list) {
      const playlist = { id: { playlistId: list }, snippet: { title: 'Playlist', channelTitle: '' } };
      loadPlaylist(list, playlist);
    } else if (q) {
      setSearchQuery(q);
      searchPlaylists(searchTypeFromUrl, q);
    } else if (lastSearchResults.length > 0 && lastSearchType === searchType) {
      setResults(lastSearchResults);
      setSearchQuery(lastSearchQuery);
    } else {
      if (searchTypeFromUrl === 'playlist') {
        loadTrendingPlaylists();
      } else if (searchTypeFromUrl === 'video') {
        loadTrendingVideos();
      } else if (searchTypeFromUrl === 'live') {
        loadTrendingLive();
} else if (searchTypeFromUrl === 'shorts_playlist') {
        loadTrendingShortsPlaylists();
      } else if (searchTypeFromUrl === 'courses') {
        loadTrendingCourses();
      }
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchPlaylists();
    } else {
      if (searchType === 'video') {
        loadTrendingVideos();
      } else if (searchType === 'live') {
        loadTrendingLive();
      } else if (searchType === 'playlist') {
        loadTrendingPlaylists();
      } else if (searchType === 'courses') {
        loadTrendingCourses();
      }
    }
  }, [region, timeFilter, sortOrder, searchType]);

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

  const handleSearchInput = (value) => {
    setSearchQuery(value);
    setSelectedIndex(-1);
    searchTriggeredRef.current = false;
    const videoId = extractVideoId(value);
    const playlistId = extractPlaylistId(value);
    if (videoId) {
      navigate(`/video?id=${videoId}`);
    } else if (playlistId) {
      navigate(`/search?list=${playlistId}`);
    }
  };

  const loadTrendingPlaylists = async () => {
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setResults([]);
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const relevanceLang = 'en';
      const playlistOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=popular+playlists&type=playlist&order=${playlistOrder}&relevanceLanguage=${relevanceLang}&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.error) {
        setError(`API Error: ${data.error.message}`);
        if (data.error.message?.includes('quota') || data.error.code === 403) {
          updateQuota(10000);
          if (switchToNextApiKey()) {
            setError('Quota exceeded. Switched to next API key. Please try again.');
            return;
          }
        }
      } else if (data.items) {
        setResults(data.items);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        updateQuota(-1, 'playlists');
        saveSearchResults(searchQuery, 'playlist', data.items);
        fetchPlaylistDetails(data.items.map(item => item.id.playlistId));
      }
    } catch (err) {
      console.error('Failed to load trending:', err);
      setError('Failed to load playlists. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingVideos = async () => {
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setResults([]);
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const relevanceLang = 'en';
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=trending&type=video&order=${sortOrder}&relevanceLanguage=${relevanceLang}&regionCode=${region}&key=${apiKey}`;
      const publishedAfter = getPublishedAfter();
      if (publishedAfter) {
        url += `&publishedAfter=${publishedAfter}`;
      }
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.error) {
        setError(`API Error: ${data.error.message}`);
        if (data.error.message?.includes('quota') || data.error.code === 403) {
          updateQuota(10000);
          if (switchToNextApiKey()) {
            setError('Quota exceeded. Switched to next API key. Please try again.');
            return;
          }
        }
      } else if (data.items) {
        setResults(data.items);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        updateQuota(-100, 'search');
        const videoIds = data.items.map(item => item.id.videoId).filter(Boolean);
        if (videoIds.length > 0) fetchVideoStats(videoIds);
      }
    } catch (err) {
      console.error('Failed to load trending videos:', err);
      setError('Failed to load videos. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingLive = async () => {
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setResults([]);
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const relevanceLang = 'en';
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=live+stream&type=video&eventType=live&order=${sortOrder}&relevanceLanguage=${relevanceLang}&regionCode=${region}&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.error) {
        setError(`API Error: ${data.error.message}`);
        if (data.error.message?.includes('quota') || data.error.code === 403) {
          updateQuota(10000);
          if (switchToNextApiKey()) {
            setError('Quota exceeded. Switched to next API key. Please try again.');
            return;
          }
        }
      } else if (data.items) {
        setResults(data.items);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        updateQuota(-100, 'search');
        fetchLiveDetails(data.items.map(item => item.id.videoId));
        const videoIds = data.items.map(item => item.id.videoId).filter(Boolean);
        if (videoIds.length > 0) fetchVideoStats(videoIds);
      }
    } catch (err) {
      console.error('Failed to load live streams:', err);
      setError('Failed to load live streams. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveDetails = async (videoIds) => {
    if (!videoIds.length) return;
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;
    
    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoIds.join(',')}&key=${apiKey}`
      );
      const data = await resp.json();
      if (data.items) {
        const details = {};
        data.items.forEach(item => {
          if (item.liveStreamingDetails?.concurrentViewers) {
            details[item.id] = {
              concurrentViewers: item.liveStreamingDetails.concurrentViewers,
            };
          }
        });
        setLiveDetails(prev => ({ ...prev, ...details }));
      }
      updateQuota(-1, 'videos');
    } catch (err) {
      console.error('Failed to fetch live details:', err);
    }
  };

const loadTrendingShortsPlaylists = async () => {
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setResults([]);
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const relevanceLang = 'en';
      const shortsOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=shorts+playlist&type=playlist&order=${shortsOrder}&relevanceLanguage=${relevanceLang}&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.error) {
        setError(`API Error: ${data.error.message}`);
        if (data.error.message?.includes('quota') || data.error.code === 403) {
          updateQuota(10000);
          if (switchToNextApiKey()) {
            setError('Quota exceeded. Switched to next API key. Please try again.');
            return;
          }
        }
      } else if (data.items) {
        setResults(data.items);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        updateQuota(-1, 'playlists');
        fetchPlaylistDetails(data.items.map(item => item.id.playlistId));
      }
    } catch (err) {
      console.error('Failed to load shorts playlists:', err);
      setError('Failed to load shorts. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingCourses = async () => {
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setResults([]);
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const relevanceLang = 'en';
      const courseOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=educational+course+tutorial+playlist&type=playlist&order=${courseOrder}&relevanceLanguage=${relevanceLang}&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.error) {
        setError(`API Error: ${data.error.message}`);
        if (data.error.message?.includes('quota') || data.error.code === 403) {
          updateQuota(10000);
          if (switchToNextApiKey()) {
            setError('Quota exceeded. Switched to next API key. Please try again.');
            return;
          }
        }
      } else if (data.items) {
        setResults(data.items);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        updateQuota(-1, 'playlists');
        fetchPlaylistDetails(data.items.map(item => item.id.playlistId));
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Failed to load courses. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const searchPlaylists = async (overrideType = null, overrideQuery = null) => {
    const activeType = overrideType || searchType;
    const activeQuery = overrideQuery !== null ? overrideQuery : searchQuery;
    
if (!activeQuery.trim()) {
      if (activeType === 'playlist') {
        loadTrendingPlaylists();
      } else if (activeType === 'video') {
        loadTrendingVideos();
      } else if (activeType === 'live') {
        loadTrendingLive();
      } else if (activeType === 'shorts') {
        loadTrendingShorts();
      } else if (activeType === 'courses') {
        loadTrendingCourses();
      }
      return;
    }
    
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const relevanceLang = 'en';
      const publishedAfter = getPublishedAfter();
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(activeQuery)}&type=video&order=${sortOrder}&relevanceLanguage=${relevanceLang}&regionCode=${region}&key=${apiKey}`;
      
      if (publishedAfter) {
        url += `&publishedAfter=${publishedAfter}`;
      }
      
      if (activeType === 'playlist') {
        const playlistOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(activeQuery)}&type=playlist&order=${playlistOrder}&relevanceLanguage=${relevanceLang}&regionCode=${region}&key=${apiKey}`;
      } else if (activeType === 'live') {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(activeQuery)}&type=video&eventType=live&order=${sortOrder}&relevanceLanguage=${relevanceLang}&regionCode=${region}&key=${apiKey}`;
} else if (activeType === 'shorts_playlist') {
        const shortsOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(activeQuery || 'shorts+playlist')}&type=playlist&order=${shortsOrder}&relevanceLanguage=${relevanceLang}&regionCode=${region}&key=${apiKey}`;
      } else if (activeType === 'courses') {
        const courseQuery = activeQuery ? `${activeQuery}+course+tutorial` : 'educational+course+tutorial+playlist';
        const courseOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(courseQuery)}&type=playlist&order=${courseOrder}&relevanceLanguage=${relevanceLang}&regionCode=${region}&key=${apiKey}`;
      }
      
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.error) {
        setError(`API Error: ${data.error.message}`);
        if (data.error.message?.includes('quota') || data.error.code === 403) {
          updateQuota(10000);
          if (switchToNextApiKey()) {
            setError('Quota exceeded. Switched to next API key. Please try again.');
            return;
          }
        }
      } else if (data.items) {
        setResults(data.items);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        updateQuota(-100, 'search');
        saveSearchResults(searchQuery, activeType, data.items);
        
if (activeType === 'playlist' || activeType === 'shorts_playlist' || activeType === 'courses') {
          fetchPlaylistDetails(data.items.map(item => item.id.playlistId));
        } else if (activeType === 'video' || activeType === 'live') {
          const videoIds = data.items.map(item => item.id.videoId).filter(Boolean);
          if (videoIds.length > 0) {
            fetchVideoStats(videoIds);
          }
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPlaylistDetails = async (playlistIds) => {
    if (!playlistIds.length) return;
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;
    
    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=contentDetails,snippet&id=${playlistIds.join(',')}&key=${apiKey}`
      );
      const data = await resp.json();
      if (data.items) {
        const details = {};
        data.items.forEach(item => {
          details[item.id] = {
            videoCount: item.contentDetails?.itemCount,
            publishedAt: item.snippet?.publishedAt,
          };
        });
        setPlaylistDetails(prev => ({ ...prev, ...details }));
      }
      updateQuota(-1, 'playlists');
    } catch (err) {
      console.error('Failed to fetch playlist details:', err);
    }
  };

  const fetchVideoStats = async (videoIds) => {
    if (!videoIds.length) return;
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;
    
    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(',')}&key=${apiKey}`
      );
      const data = await resp.json();
      if (data.items) {
        const stats = {};
        data.items.forEach(item => {
          stats[item.id] = {
            viewCount: parseInt(item.statistics?.viewCount) || 0,
            likeCount: parseInt(item.statistics?.likeCount) || 0,
          };
        });
        setVideoStats(prev => ({ ...prev, ...stats }));
      }
      updateQuota(-1, 'videos');
    } catch (err) {
      console.error('Failed to fetch video stats:', err);
    }
  };

  const loadMore = async () => {
    if (!nextPageToken) return;
    
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;

    setLoading(true);
    try {
      const relevanceLang = 'en';
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery || 'trending')}&type=video&order=${sortOrder}&relevanceLanguage=${relevanceLang}&pageToken=${nextPageToken}&key=${apiKey}`;
      
      if (searchType === 'playlist') {
        const playlistOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery || 'popular+playlists')}&type=playlist&order=${playlistOrder}&relevanceLanguage=${relevanceLang}&pageToken=${nextPageToken}&key=${apiKey}`;
      } else if (searchType === 'live') {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery || 'live+stream')}&type=video&eventType=live&order=${sortOrder}&relevanceLanguage=${relevanceLang}&pageToken=${nextPageToken}&key=${apiKey}`;
} else if (searchType === 'shorts_playlist') {
        const shortsOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery || 'shorts+playlist')}&type=playlist&order=${shortsOrder}&relevanceLanguage=${relevanceLang}&pageToken=${nextPageToken}&key=${apiKey}`;
      } else if (searchType === 'courses') {
        const courseQuery = searchQuery ? `${searchQuery}+course+tutorial` : 'educational+course+tutorial+playlist';
        const courseOrder = sortOrder === 'viewCount' || sortOrder === 'rating' ? 'relevance' : sortOrder;
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(courseQuery)}&type=playlist&order=${courseOrder}&relevanceLanguage=${relevanceLang}&pageToken=${nextPageToken}&key=${apiKey}`;
      }
      
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.items) {
        setResults([...results, ...data.items]);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        
if (searchType === 'playlist' || searchType === 'shorts_playlist' || searchType === 'courses') {
          updateQuota(-1, 'playlists');
          fetchPlaylistDetails(data.items.map(item => item.id.playlistId));
        } else if (searchType === 'video' || searchType === 'live') {
          updateQuota(-100, 'search');
          const videoIds = data.items.map(item => item.id.videoId).filter(Boolean);
          if (videoIds.length > 0) fetchVideoStats(videoIds);
        }
      }
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoading(false);
    }
  };

const handleSortChange = (order) => {
    setSortOrder(order);
    setVideoStats({});
    if (!searchQuery.trim()) {
      if (searchType === 'playlist') loadTrendingPlaylists();
      else if (searchType === 'video') loadTrendingVideos();
      else if (searchType === 'live') loadTrendingLive();
      else if (searchType === 'shorts_playlist') loadTrendingShortsPlaylists();
      else if (searchType === 'courses') loadTrendingCourses();
    } else {
      searchPlaylists(searchType, searchQuery);
    }
  };

const handleTypeChange = (type) => {
    setSearchType(type);
    if (!searchQuery.trim()) {
      if (type === 'playlist') loadTrendingPlaylists();
      else if (type === 'video') loadTrendingVideos();
      else if (type === 'live') loadTrendingLive();
      else if (type === 'shorts_playlist') loadTrendingShortsPlaylists();
      else if (type === 'courses') loadTrendingCourses();
    } else {
      searchPlaylists(type, searchQuery);
    }
  };

  const loadPlaylist = async (playlistId, playlist) => {
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      alert('Please add a YouTube API key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let allVideos = [];
      let nextPageToken = '';
      let hasError = false;
      
      do {
        const url = nextPageToken 
          ? `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${apiKey}`
          : `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;
        
        const resp = await fetch(url);
        const data = await resp.json();
        
        if (data.error) {
          console.error('API Error:', data.error);
          hasError = true;
          if (data.error.message?.includes('quota') || data.error.code === 403) {
            updateQuota(10000);
            if (switchToNextApiKey()) {
              setError('Quota exceeded. Switched to next API key. Please try again.');
              setLoading(false);
              return;
            }
          }
          setError(`API Error: ${data.error.message || 'Failed to fetch playlist'}`);
          setLoading(false);
          return;
        }
        
        if (data.items) {
          const videos = data.items
            .filter(item => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
            .map(item => ({
              id: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
              channelTitle: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
              addedAt: new Date().toISOString(),
              viewCount: 0,
            }));
          allVideos = [...allVideos, ...videos];
        }
        
        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken && !hasError);

      if (allVideos.length > 0) {
        const videoIds = allVideos.map(v => v.id).join(',');
        try {
          const statsResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`);
          const statsData = await statsResp.json();
          if (statsData.items) {
            statsData.items.forEach(item => {
              const video = allVideos.find(v => v.id === item.id);
              if (video && item.statistics) {
                video.viewCount = parseInt(item.statistics.viewCount) || 0;
              }
            });
          }
        } catch (e) {
          console.error('Failed to fetch view counts:', e);
        }

        const playlistData = {
          id: playlistId,
          title: playlist.snippet.title,
          channelTitle: playlist.snippet.channelTitle,
          thumbnail: playlist.snippet.thumbnails?.medium?.url,
          videos: allVideos,
          videoCount: allVideos.length,
        };

        addToHistory(playlistData, searchType);
        
        setCurrentPlaylist(allVideos);
        setCurrentVideoIndex(0);
        
        setTimeout(() => {
          navigate('/');
        }, 100);
      } else {
        setError('No videos found in this playlist');
      }
    } catch (err) {
      console.error('Failed to load playlist:', err);
      setError('Failed to load playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const playVideo = (item) => {
    if (!item.id.videoId) return;
    const video = {
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      liveViewers: searchType === 'live' && liveDetails[item.id.videoId]?.concurrentViewers 
        ? parseInt(liveDetails[item.id.videoId].concurrentViewers) : 0,
    };
    setCurrentPlaylist([video]);
    setCurrentVideoIndex(0);
    navigate('/');
  };

  const addSingleVideo = (item, e) => {
    e.stopPropagation();
    const video = {
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      addedAt: new Date().toISOString(),
liveViewers: searchType === 'live' && liveDetails[item.id.videoId]?.concurrentViewers 
        ? parseInt(liveDetails[item.id.videoId].concurrentViewers) : 0,
    };
    addVideoToPlaylist(video, searchType);
    
    setAddedMessage(decodeHtml(item.snippet.title));
    setAddedType(searchType === 'courses' ? 'CRS' : searchType === 'video' ? 'VID' : searchType === 'live' ? 'LIV' : 'PLS');
    setTimeout(() => { setAddedMessage(null); setAddedType(null); }, 3000);
  };

  const addToPlaylist = async (playlistId, playlist, e) => {
    e.stopPropagation();
    
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      alert('Please add a YouTube API key');
      return;
    }

    setLoadingPlaylist(playlistId);

    try {
      let allVideos = [];
      let nextPageToken = '';
      let hasError = false;
      
      do {
        const url = nextPageToken 
          ? `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${apiKey}`
          : `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;
        
        const resp = await fetch(url);
        const data = await resp.json();
        
        if (data.error) {
          console.error('API Error:', data.error);
          hasError = true;
          if (data.error.message?.includes('quota') || data.error.code === 403) {
            updateQuota(10000);
            if (switchToNextApiKey()) {
              alert('Quota exceeded. Switched to next API key. Please try again.');
              setLoadingPlaylist(null);
              return;
            }
          }
          setError(`API Error: ${data.error.message || 'Failed to fetch playlist'}`);
          break;
        }
        
        if (data.items) {
          const videos = data.items
            .filter(item => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
            .map(item => ({
              id: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
              channelTitle: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
              addedAt: new Date().toISOString(),
              viewCount: 0,
            }));
          allVideos = [...allVideos, ...videos];
        }
        
        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken && !hasError);

      if (hasError) {
        setLoadingPlaylist(null);
        return;
      }

      if (allVideos.length > 0) {
        const videoIds = allVideos.map(v => v.id).join(',');
        try {
          const statsResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,liveStreamingDetails&id=${videoIds}&key=${apiKey}`);
          const statsData = await statsResp.json();
          if (statsData.items) {
            statsData.items.forEach(item => {
              const video = allVideos.find(v => v.id === item.id);
              if (video) {
                if (item.statistics) {
                  video.viewCount = parseInt(item.statistics.viewCount) || 0;
                }
                if (item.liveStreamingDetails) {
                  video.liveViewers = parseInt(item.liveStreamingDetails.concurrentViewers) || 0;
                }
              }
            });
          }
        } catch (e) {
          console.error('Failed to fetch view counts:', e);
        }

        const existingVideoIds = new Set(currentPlaylist.map(v => v.id));
        const newVideos = allVideos.filter(v => !existingVideoIds.has(v.id));
        
        if (newVideos.length === 0) {
          setAddedMessage('All videos already in playlist');
          setAddedType('DUP');
          setTimeout(() => { setAddedMessage(null); setAddedType(null); }, 3000);
          setLoadingPlaylist(null);
          return;
        }

        setCurrentPlaylist(prevPlaylist => [...prevPlaylist, ...newVideos]);
        
        const playlistData = {
          id: playlistId,
          title: playlist.snippet.title,
          channelTitle: playlist.snippet.channelTitle,
          thumbnail: playlist.snippet.thumbnails?.medium?.url,
          videos: newVideos,
          videoCount: newVideos.length,
        };
        addToHistory(playlistData, searchType);
        
        const addedCountMsg = newVideos.length !== allVideos.length ? ` (+${newVideos.length} new)` : '';
        setAddedMessage(decodeHtml(playlist.snippet.title) + addedCountMsg);
        setAddedType(searchType === 'courses' ? 'CRS' : searchType === 'video' ? 'VID' : searchType === 'live' ? 'LIV' : 'PLS');
        setTimeout(() => { setAddedMessage(null); setAddedType(null); }, 3000);
      } else {
        setError('No videos found in this playlist');
      }
    } catch (err) {
      console.error('Failed to add playlist:', err);
      setError('Failed to add playlist. Please try again.');
    } finally {
      setLoadingPlaylist(null);
    }
  };

  const sortOptions = [
    { value: 'relevance', label: 'Relevance', icon: 'fa-star' },
    { value: 'date', label: 'Newest', icon: 'fa-clock' },
    { value: 'viewCount', label: 'Popular', icon: 'fa-fire' },
  ];

  return (
    <div className="h-[calc(100vh-48px)] overflow-y-auto pb-16 md:pb-0" style={{ background: 'var(--bg-main)' }}>
{addedMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg flex items-center gap-2">
          <i className="fas fa-check-circle"></i>
          {addedType && <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-bold">{addedType}</span>}
          Added "{addedMessage}" to playlist
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mx-4 md:mx-8 mt-4 p-4 rounded-xl bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}
        <div className="px-4 md:px-8 py-4">
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <div className="relative">
              <select
                value={searchType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2 pr-8 text-xs font-medium cursor-pointer transition-all duration-200"
                style={{ color: 'var(--text-main)' }}
              >
                <option value="video" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Videos</option>
                <option value="playlist" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Playlists</option>
                <option value="live" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Live</option>
                <option value="courses" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Courses</option>
              </select>
              <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'var(--text-muted)' }}></i>
            </div>
            <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                  style={{ 
                    background: sortOrder === option.value ? 'var(--accent-color)' : 'transparent', 
                    color: sortOrder === option.value ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2 pr-8 text-xs font-medium cursor-pointer transition-all duration-200"
                style={{ color: 'var(--text-main)' }}
              >
                {regions.map(r => (
                  <option key={r.code} value={r.code} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{r.name}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'var(--text-muted)' }}></i>
            </div>
            <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-1">
              {timeFilters.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTimeFilter(option.value)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                  style={{ 
                    background: timeFilter === option.value ? 'var(--accent-color)' : 'transparent', 
                    color: timeFilter === option.value ? 'white' : 'var(--text-muted)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSearchFocused(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-all duration-200"
              style={{ color: 'var(--text-muted)' }}
            >
              <i className="fas fa-search text-sm"></i>
            </button>
          </div>
        </div>

        {/* Search Focus Modal */}
        {searchFocused && (
          <div 
            className="fixed inset-0 z-[100]"
            style={{ 
              background: 'rgba(0, 0, 0, 0.3)',
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
            <div className="w-full h-full flex items-start justify-center p-4 pt-16 pointer-events-none overflow-hidden">
              <div 
                className="w-full max-w-2xl rounded-[20px] md:rounded-[40px] pointer-events-auto relative"
                style={{ 
                  background: 'rgba(30, 30, 30, 0.95)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
                  animation: 'scaleIn 150ms ease-out'
                }}
              >
                <div className="flex flex-row items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4">
                  <i className="fas fa-search text-base md:text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}></i>
                  <input
                    placeholder="Search video or paste URL..."
                    className="flex-1 bg-transparent border-none outline-none text-base md:text-lg text-center w-full"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
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
                        e.preventDefault();
                        searchTriggeredRef.current = true;
                        setSuggestions([]);
                        setSelectedIndex(-1);
                        searchPlaylists();
                        setSearchFocused(false);
                      } else if (e.key === 'Escape') {
                        setSearchFocused(false);
                      }
                    }}
                    style={{ color: '#ffffff' }}
                    autoComplete="off"
                    autoFocus
                  />
                  {searchFocused && searchQuery && suggestions.length > 0 && (
                    <div
                      className="search-suggestions-container absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto"
                      style={{ background: 'rgba(30, 30, 30, 0.98)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => { handleSelectSuggestion(suggestion); setSearchFocused(false); }}
                          className="px-4 py-2.5 cursor-pointer text-sm"
                          style={{ 
                            color: index === selectedIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.8)', 
                            background: index === selectedIndex ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                            borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' 
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
                    <button
                      onClick={() => setSearchType('video')}
                      className="px-2 py-1 rounded-md text-xs"
                      style={{ 
                        color: searchType === 'video' ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        background: searchType === 'video' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
                      }}
                    >
                      Video
                    </button>
                    <button
                      onClick={() => setSearchType('playlist')}
                      className="px-2 py-1 rounded-md text-xs"
                      style={{ 
                        color: searchType === 'playlist' ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        background: searchType === 'playlist' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
                      }}
                    >
                      Playlist
                    </button>
                    <button
                      onClick={() => setSearchType('live')}
                      className="px-2 py-1 rounded-md text-xs"
                      style={{ 
                        color: searchType === 'live' ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        background: searchType === 'live' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
                      }}
                    >
                      Live
                    </button>
                    <button
                      onClick={() => setSearchType('courses')}
                      className="px-2 py-1 rounded-md text-xs"
                      style={{ 
                        color: searchType === 'courses' ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        background: searchType === 'courses' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'
                      }}
                    >
                      Courses
                    </button>
                    <button
                      onClick={() => setSearchFocused(false)}
                      className="px-2 py-1 rounded-md text-xs"
                      style={{ 
                        color: 'rgba(255, 255, 255, 0.5)',
                        background: 'rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      ESC
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 md:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
<h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
            {searchType === 'playlist' ? 'Playlists' : searchType === 'video' ? 'Videos' : searchType === 'live' ? 'Live Videos' : searchType === 'shorts_playlist' ? 'Shorts Playlists' : 'Courses'}
          </h2>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {results.length} results
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video rounded-xl mb-3" style={{ background: 'var(--bg-hover)' }}></div>
                <div className="h-4 rounded mb-2" style={{ background: 'var(--bg-hover)', width: '80%' }}></div>
                <div className="h-3 rounded" style={{ background: 'var(--bg-hover)', width: '60%' }}></div>
              </div>
            ))
          ) : results.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <i className="fab fa-youtube text-6xl mb-4" style={{ color: 'var(--text-muted)' }}></i>
<p style={{ color: 'var(--text-muted)' }} className="text-lg">
                {getCurrentApiKey() 
                  ? (searchType === 'playlist' ? 'No playlists found' : searchType === 'video' ? 'No videos found' : searchType === 'live' ? 'No live videos found' : searchType === 'shorts_playlist' ? 'No shorts playlists found' : 'No courses found')
                  : 'Add an API key to search'}
              </p>
            </div>
          ) : (
            results.map((item) => (
              <div key={item.id.playlistId || item.id.videoId || item.id.videoId} className="group">
<div className="relative aspect-video rounded-xl overflow-hidden mb-3 cursor-pointer" onClick={() => {
                  if (searchType === 'playlist' || searchType === 'courses') loadPlaylist(item.id.playlistId, item);
                  else playVideo(item);
                }}>
                  <img
                    src={item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url}
                    alt={item.snippet.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/320x180?text=Video'; }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fas fa-play text-white text-xl ml-1"></i>
                    </div>
                  </div>
                  {searchType === 'video' && videoStats[item.id.videoId]?.viewCount && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs">
                      {formatViews(videoStats[item.id.videoId].viewCount)}
                    </div>
                  )}
                  {searchType === 'playlist' && playlistDetails[item.id.playlistId]?.videoCount && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs flex items-center gap-1">
                      <i className="fas fa-video"></i>
                      {playlistDetails[item.id.playlistId].videoCount}
                    </div>
                  )}
                  {searchType === 'playlist' && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                      Playlist
                    </div>
                  )}
                  {searchType === 'live' && (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded bg-red-600 text-white text-xs flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      LIVE
                    </div>
                  )}
                  {searchType === 'live' && liveDetails[item.id.videoId]?.concurrentViewers && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs flex items-center gap-1">
                      <i className="fas fa-eye"></i>
                      {formatViewers(liveDetails[item.id.videoId].concurrentViewers)}
                    </div>
                  )}
{searchType === 'shorts_playlist' && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-red-600 text-white text-xs font-medium">
                      SHORTS
                    </div>
                  )}
                  {searchType === 'courses' && (
                    <>
                      {playlistDetails[item.id.playlistId]?.videoCount && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs flex items-center gap-1">
                          <i className="fas fa-video"></i>
                          {playlistDetails[item.id.playlistId].videoCount}
                        </div>
                      )}
                      <div className="absolute top-2 right-2 px-2 py-1 rounded bg-blue-600 text-white text-xs font-medium">
                        COURSE
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium line-clamp-2 group-hover:text-blue-500 transition-colors cursor-pointer" style={{ color: 'var(--text-main)' }}>
                      {decodeHtml(item.snippet.title)}
                    </h3>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                      {decodeHtml(item.snippet.channelTitle)}
                      {searchType === 'video' && (videoStats[item.id.videoId]?.viewCount > 0 || videoStats[item.id.videoId]?.likeCount > 0) && (
                        <span>
                          {videoStats[item.id.videoId]?.viewCount > 0 && <span> • {formatViews(videoStats[item.id.videoId].viewCount)}</span>}
                          {videoStats[item.id.videoId]?.likeCount > 0 && <span> • {formatLikes(videoStats[item.id.videoId].likeCount)} likes</span>}
                        </span>
                      )}
                      {searchType === 'video' && !videoStats[item.id.videoId]?.viewCount && !videoStats[item.id.videoId]?.likeCount && item.snippet.publishedAt && (
                        <span> • {formatTimeAgo(item.snippet.publishedAt)}</span>
                      )}
                      {searchType === 'video' && (videoStats[item.id.videoId]?.viewCount > 0 || videoStats[item.id.videoId]?.likeCount > 0) && item.snippet.publishedAt && (
                        <span> • {formatTimeAgo(item.snippet.publishedAt)}</span>
                      )}
                      {searchType === 'live' && liveDetails[item.id.videoId]?.concurrentViewers && (
                        <span> • {formatViewers(liveDetails[item.id.videoId].concurrentViewers)} watching</span>
                      )}
                      {searchType === 'playlist' && playlistDetails[item.id.playlistId]?.publishedAt && (
                        <span> • {formatTimeAgo(playlistDetails[item.id.playlistId].publishedAt)}</span>
                      )}
{searchType === 'shorts_playlist' && item.snippet.publishedAt && (
                        <span> • {formatTimeAgo(item.snippet.publishedAt)}</span>
                      )}
                      {searchType === 'courses' && (
                        <>
                          {playlistDetails[item.id.playlistId]?.videoCount > 0 && (
                            <span> • {playlistDetails[item.id.playlistId].videoCount} videos</span>
                          )}
                          {playlistDetails[item.id.playlistId]?.publishedAt && (
                            <span> • {formatTimeAgo(playlistDetails[item.id.playlistId].publishedAt)}</span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
{(searchType === 'playlist' || searchType === 'video' || searchType === 'shorts_playlist' || searchType === 'live' || searchType === 'courses') && (
                    <button
                      onClick={(e) => {
                        if (searchType === 'playlist' || searchType === 'courses') {
                          addToPlaylist(item.id.playlistId, item, e);
                        } else {
                          addSingleVideo(item, e);
                        }
                      }}
                      disabled={loadingPlaylist === item.id.playlistId}
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium transition disabled:opacity-50 hover:scale-110 active:scale-95"
                      style={{ background: 'var(--accent-color)' }}
                    >
                      {loadingPlaylist === item.id.playlistId ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-plus text-xs"></i>}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-6">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
              style={{ background: 'var(--accent-color)', color: 'white' }}
            >
              {loading ? <><i className="fas fa-circle-notch fa-spin mr-2"></i>Loading...</> : 'Load More'}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default SearchPage;
