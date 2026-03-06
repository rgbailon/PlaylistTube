import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';

function SearchPage() {
  const { getCurrentApiKey, updateQuota, setCurrentPlaylist, setCurrentVideoIndex, addToHistory, currentPlaylist, checkAndSwitchApiKey, switchToNextApiKey, apiKeys, saveSearchResults, lastSearchResults, lastSearchQuery, lastSearchType } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState('relevance');
  const [nextPageToken, setNextPageToken] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingPlaylist, setLoadingPlaylist] = useState(null);
  const [addedMessage, setAddedMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lastSearchResults.length > 0 && lastSearchType === 'playlist') {
      setResults(lastSearchResults);
      setSearchQuery(lastSearchQuery);
    } else {
      loadTrendingPlaylists();
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
        updateQuota(-1);
        saveSearchResults(searchQuery, 'playlist', data.items);
      }
    } catch (err) {
      console.error('Failed to load trending:', err);
      setError('Failed to load playlists. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const searchPlaylists = async () => {
    if (!searchQuery.trim()) return;
    
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery)}&type=playlist&order=${sortOrder}&key=${apiKey}`
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
        updateQuota(-1);
        saveSearchResults(searchQuery, 'playlist', data.items);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextPageToken) return;
    
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;

    setLoading(true);
    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery)}&type=playlist&order=${sortOrder}&pageToken=${nextPageToken}&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.items) {
        setResults([...results, ...data.items]);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        updateQuota(-1);
      }
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (order) => {
    setSortOrder(order);
    if (searchQuery) {
      searchPlaylists();
    } else {
      loadTrendingPlaylists();
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
            }));
          allVideos = [...allVideos, ...videos];
        }
        
        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken);

      if (allVideos.length > 0) {
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
            }));
          allVideos = [...allVideos, ...videos];
        }
        
        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken);

      if (allVideos.length > 0) {
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
        
        setAddedMessage(playlist.snippet.title);
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
      
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-100 border border-red-300 text-red-700 text-sm flex items-center gap-2">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
          </div>
        )}
        <div className="rounded-2xl p-6 shadow-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="w-full relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlaylists()}
                  placeholder="Search or paste URL..."
                  className="w-full rounded-xl pl-12 pr-4 py-4 text-sm md:text-base"
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--text-muted)' }}></i>
              </div>
              <button
                onClick={searchPlaylists}
                className="w-full md:w-auto px-8 py-4 rounded-xl font-medium transition flex items-center justify-center gap-2 min-w-[140px]"
                style={{ background: 'var(--accent-color)', color: 'white' }}
              >
                <i className="fas fa-search"></i> Search
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
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
                      background: sortOrder === option.value ? 'var(--accent-color)' : 'var(--bg-hover)',
                      color: sortOrder === option.value ? 'white' : 'var(--text-main)'
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
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
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
                {getCurrentApiKey() ? 'No playlists found' : 'Add an API key to search'}
              </p>
            </div>
          ) : (
            results.map((item) => (
              <div key={item.id.playlistId} className="group">
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 cursor-pointer" onClick={() => loadPlaylist(item.id.playlistId, item)}>
                  <img
                    src={item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url}
                    alt={item.snippet.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/320x180?text=Playlist'; }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fas fa-play text-white text-xl ml-1"></i>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs flex items-center gap-1">
                    <i className="fas fa-list"></i>
                    Playlist
                  </div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => loadPlaylist(item.id.playlistId, item)}>
                    <h3 className="text-sm font-medium line-clamp-2 group-hover:text-blue-500 transition-colors cursor-pointer" style={{ color: 'var(--text-main)' }}>
                      {item.snippet.title}
                    </h3>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                      {item.snippet.channelTitle}
                    </p>
                  </div>
                  <button
                    onClick={(e) => addToPlaylist(item.id.playlistId, item, e)}
                    disabled={loadingPlaylist === item.id.playlistId}
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium transition disabled:opacity-50"
                    style={{ background: 'var(--accent-color)' }}
                  >
                    {loadingPlaylist === item.id.playlistId ? <i className="fas fa-spinner fa-spin text-xs"></i> : <i className="fas fa-plus text-xs"></i>}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <div className="mt-8 text-center pb-8">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-8 py-3 rounded-xl font-medium disabled:opacity-50"
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
