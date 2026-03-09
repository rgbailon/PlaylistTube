import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';

function SearchPage() {
  const { getCurrentApiKey, updateQuota, setCurrentPlaylist, setCurrentVideoIndex, addToHistory, currentPlaylist, checkAndSwitchApiKey, switchToNextApiKey, apiKeys, saveSearchResults, lastSearchResults, lastSearchQuery, lastSearchType, addVideoToPlaylist } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState('relevance');
  const [searchType, setSearchType] = useState('video');
  const [nextPageToken, setNextPageToken] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingPlaylist, setLoadingPlaylist] = useState(null);
  const [addedMessage, setAddedMessage] = useState(null);
  const [error, setError] = useState(null);
  const [playlistDetails, setPlaylistDetails] = useState({});
  const [liveDetails, setLiveDetails] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

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

  useEffect(() => {
    const fetchSuggestions = async (query) => {
      if (!query.trim() || query.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`https://corsproxy.io/?https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`);
        const text = await res.text();
        const lines = text.split('\n');
        const suggestions = [];
        for (const line of lines) {
          const matches = line.match(/"([^"]+)"/g);
          if (matches) {
            for (const m of matches) {
              const val = m.replace(/"/g, '');
              if (val && !val.includes('window.') && val.length > 1) {
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
    }, 150);

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

  const handleSelectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
    setSelectedIndex(-1);
    navigate(`/search?q=${encodeURIComponent(suggestion)}&type=${searchType}`);
  };

  const handleKeyDown = (e) => {
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
    
    const searchTypeFromUrl = (type && ['video', 'playlist', 'live', 'shorts_playlist'].includes(type)) ? type : 'video';
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
      }
    }
  }, []);

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
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=popular+playlists&type=playlist&order=${sortOrder}&key=${apiKey}`
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
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=trending&type=video&order=${sortOrder}&key=${apiKey}`
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
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=live+stream&type=video&eventType=live&order=${sortOrder}&key=${apiKey}`
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
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=shorts+playlist&type=playlist&order=${sortOrder}&key=${apiKey}`
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
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(activeQuery)}&type=video&order=${sortOrder}&key=${apiKey}`;
      
      if (activeType === 'playlist') {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(activeQuery)}&type=playlist&order=${sortOrder}&key=${apiKey}`;
      } else if (activeType === 'live') {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(activeQuery)}&type=video&eventType=live&order=${sortOrder}&key=${apiKey}`;
      } else if (activeType === 'shorts_playlist') {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(activeQuery || 'shorts+playlist')}&type=playlist&order=${sortOrder}&key=${apiKey}`;
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
        
        if (activeType === 'playlist' || activeType === 'shorts_playlist') {
          fetchPlaylistDetails(data.items.map(item => item.id.playlistId));
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

  const loadMore = async () => {
    if (!nextPageToken) return;
    
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;

    setLoading(true);
    try {
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery || 'trending')}&type=video&order=${sortOrder}&pageToken=${nextPageToken}&key=${apiKey}`;
      
      if (searchType === 'playlist') {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery || 'popular+playlists')}&type=playlist&order=${sortOrder}&pageToken=${nextPageToken}&key=${apiKey}`;
      } else if (searchType === 'live') {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery || 'live+stream')}&type=video&eventType=live&order=${sortOrder}&pageToken=${nextPageToken}&key=${apiKey}`;
      } else if (searchType === 'shorts_playlist') {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery || 'shorts+playlist')}&type=playlist&order=${sortOrder}&pageToken=${nextPageToken}&key=${apiKey}`;
      }
      
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.items) {
        setResults([...results, ...data.items]);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        
        if (searchType === 'playlist' || searchType === 'shorts_playlist') {
          updateQuota(-1, 'playlists');
          fetchPlaylistDetails(data.items.map(item => item.id.playlistId));
        } else {
          updateQuota(-100, 'search');
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
    if (!searchQuery.trim()) {
      if (searchType === 'playlist') loadTrendingPlaylists();
      else if (searchType === 'video') loadTrendingVideos();
      else if (searchType === 'live') loadTrendingLive();
      else if (searchType === 'shorts_playlist') loadTrendingShortsPlaylists();
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

    try {
      let allVideos = [];
      let nextPageToken = '';
      
      do {
        const url = nextPageToken 
          ? `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${apiKey}`
          : `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;
        
const resp = await fetch(url);
        const data = await resp.json();
        
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
      } while (nextPageToken);

if (allVideos.length > 0) {
        const videoIds = allVideos.map(v => v.id).join(',');
        try {
          const statsResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`);
          const statsData = await statsResp.json();
          console.log('View count response:', statsData);
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

        addToHistory(playlistData);
        setCurrentPlaylist(allVideos);
        setCurrentVideoIndex(0);
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to load playlist:', err);
      alert('Failed to load playlist. Please try again.');
    }
  };

  const playVideo = (item) => {
    const video = {
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
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
    };
    addVideoToPlaylist(video);
    
    setAddedMessage(decodeHtml(item.snippet.title));
    setTimeout(() => setAddedMessage(null), 3000);
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
      
      do {
        const url = nextPageToken 
          ? `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${apiKey}`
          : `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`;
        
        const resp = await fetch(url);
        const data = await resp.json();
        
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
      } while (nextPageToken);

if (allVideos.length > 0) {
        const videoIds = allVideos.map(v => v.id).join(',');
        try {
          const statsResp = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,liveDetails&id=${videoIds}&key=${apiKey}`);
          const statsData = await statsResp.json();
          console.log('View count response:', statsData);
          if (statsData.items) {
            statsData.items.forEach(item => {
              const video = allVideos.find(v => v.id === item.id);
              if (video) {
                if (item.statistics) {
                  video.viewCount = parseInt(item.statistics.viewCount) || 0;
                }
                if (item.liveDetails) {
                  video.liveViewers = parseInt(item.liveDetails.concurrentViewers) || 0;
                }
              }
            });
          }
        } catch (e) {
          console.error('Failed to fetch view counts:', e);
        }

        const newPlaylist = [...currentPlaylist, ...allVideos];
        setCurrentPlaylist(newPlaylist);
        
        const playlistData = {
          id: playlistId,
          title: playlist.snippet.title,
          channelTitle: playlist.snippet.channelTitle,
          thumbnail: playlist.snippet.thumbnails?.medium?.url,
          videos: allVideos,
          videoCount: allVideos.length,
        };
        addToHistory(playlistData);
        
        setAddedMessage(decodeHtml(playlist.snippet.title));
        setTimeout(() => setAddedMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to add playlist:', err);
      alert('Failed to add playlist. Please try again.');
    } finally {
      setLoadingPlaylist(null);
    }
  };

  const sortOptions = [
    { value: 'relevance', label: 'Relevance', icon: 'fa-star' },
    { value: 'date', label: 'Newest First', icon: 'fa-arrow-down' },
    { value: 'viewCount', label: 'Most Viewed', icon: 'fa-eye' },
    { value: 'rating', label: 'Top Rated', icon: 'fa-thumbs-up' },
  ];

  return (
    <div className="h-[calc(100vh-48px)] overflow-y-auto pb-16 md:pb-0" style={{ background: 'var(--bg-main)' }}>
      {addedMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg flex items-center gap-2">
          <i className="fas fa-check-circle"></i>
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
        <div className="px-4 md:px-8 py-6">
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedIndex >= 0) {
                  e.preventDefault();
                  handleSelectSuggestion(suggestions[selectedIndex]);
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (suggestions.length > 0) {
                    setSelectedIndex(prev => e.key === 'ArrowDown' 
                      ? (prev < suggestions.length - 1 ? prev + 1 : 0)
                      : (prev > 0 ? prev - 1 : suggestions.length - 1));
                  }
                } else if (e.key === 'Escape') {
                  setSuggestions([]);
                  setSelectedIndex(-1);
                } else {
                  searchPlaylists();
                }
              }}
              placeholder="Search or paste URL..."
              className="w-full rounded-xl pl-12 pr-4 py-4 text-sm md:text-base shadow-lg"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            />
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--text-muted)' }}></i>
            {suggestions.length > 0 && (
              <div
                className="search-suggestions-container absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl z-50 overflow-hidden"
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
        </div>

        <div className="px-4 md:px-8 pb-4">
          <div className="flex flex-wrap items-center gap-3 justify-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Type:</span>
              <select
                value={searchType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="text-sm rounded-lg px-3 py-2"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              >
                <option value="video">Videos</option>
                <option value="playlist">Playlists</option>
                <option value="live">Live Videos</option>
                <option value="shorts_playlist">Shorts Playlist</option>
              </select>
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              <i className="fas fa-sort mr-2"></i>Sort by:
            </span>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={{ 
                    background: sortOrder === option.value ? 'var(--accent-color)' : 'var(--bg-card)', 
                    color: sortOrder === option.value ? 'white' : 'var(--text-main)',
                    border: '1px solid ' + (sortOrder === option.value ? 'var(--accent-color)' : 'var(--border-color)')
                  }}
                >
                  <i className={`fas ${option.icon} mr-1.5`}></i>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
            {searchType === 'playlist' ? 'Playlists' : searchType === 'video' ? 'Videos' : searchType === 'live' ? 'Live Videos' : 'Shorts Playlists'}
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
                  ? (searchType === 'playlist' ? 'No playlists found' : searchType === 'video' ? 'No videos found' : searchType === 'live' ? 'No live videos found' : 'No shorts playlists found')
                  : 'Add an API key to search'}
              </p>
            </div>
          ) : (
            results.map((item) => (
              <div key={item.id.playlistId || item.id.videoId || item.id.videoId} className="group">
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 cursor-pointer" onClick={() => {
                  if (searchType === 'playlist') loadPlaylist(item.id.playlistId, item);
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
                  {searchType === 'live' && liveDetails[item.id.videoId]?.concurrentViewers && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs flex items-center gap-1">
                      <i className="fas fa-eye"></i>
                      {formatViewers(liveDetails[item.id.videoId].concurrentViewers)}
                    </div>
                  )}
                  {searchType === 'live' && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-red-600 text-white text-xs flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      LIVE
                    </div>
                  )}
                  {searchType === 'shorts_playlist' && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-red-600 text-white text-xs font-medium">
                      SHORTS
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium line-clamp-2 group-hover:text-blue-500 transition-colors cursor-pointer" style={{ color: 'var(--text-main)' }}>
                      {decodeHtml(item.snippet.title)}
                    </h3>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                      {decodeHtml(item.snippet.channelTitle)}
                      {searchType === 'playlist' && playlistDetails[item.id.playlistId]?.publishedAt && (
                        <span> • {formatTimeAgo(playlistDetails[item.id.playlistId].publishedAt)}</span>
                      )}
                      {searchType === 'video' && item.snippet.publishedAt && (
                        <span> • {formatTimeAgo(item.snippet.publishedAt)}</span>
                      )}
                      {searchType === 'shorts_playlist' && item.snippet.publishedAt && (
                        <span> • {formatTimeAgo(item.snippet.publishedAt)}</span>
                      )}
                    </p>
                  </div>
                  {(searchType === 'playlist' || searchType === 'video' || searchType === 'shorts_playlist' || searchType === 'live') && (
                    <button
                      onClick={(e) => {
                        if (searchType === 'playlist') {
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
          <div className="px-4 md:px-8 pb-8 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-8 py-3 rounded-xl font-medium disabled:opacity-50 hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] transition"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            >
              {loading ? 'Loading...' : 'Load More Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
