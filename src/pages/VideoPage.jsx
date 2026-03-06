import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';

function VideoPage() {
  const { getCurrentApiKey, updateQuota, setCurrentPlaylist, setCurrentVideoIndex, currentPlaylist, switchToNextApiKey, saveSearchResults, lastSearchResults, lastSearchQuery, lastSearchType } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState('US');
  const [timeFilter, setTimeFilter] = useState('all');

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

  const formatViews = (count) => {
    if (!count) return '';
    const num = parseInt(count);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

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

  const timeFilters = [
    { value: 'all', label: 'All' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const id = params.get('id');
    if (id) {
      const video = {
        id: id,
        title: id,
        channelTitle: 'Direct URL',
      };
      setCurrentPlaylist([video]);
      setCurrentVideoIndex(0);
      navigate('/');
    } else if (q) {
      setSearchQuery(q);
      handleSearch(q);
    } else if (lastSearchResults.length > 0 && lastSearchType === 'video') {
      setResults(lastSearchResults);
      setSearchQuery(lastSearchQuery);
    }
  }, [location.search]);

  useEffect(() => {
    if (searchQuery && results.length > 0) {
      handleSearch();
    }
  }, [region, timeFilter]);

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

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&regionCode=${region}&key=${apiKey}`;
      
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
      } else if (data.items && data.items.length > 0) {
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        
        let videos = data.items.map(item => ({
          id: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
        }));

        try {
          const statsResp = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
          );
          const statsData = await statsResp.json();
          
          if (statsData.items) {
            const statsMap = {};
            statsData.items.forEach(item => {
              statsMap[item.id] = {
                viewCount: item.statistics?.viewCount,
                publishedAt: item.snippet?.publishedAt,
              };
            });
            
            videos = videos.map(video => ({
              ...video,
              viewCount: statsMap[video.id]?.viewCount,
              publishedAt: statsMap[video.id]?.publishedAt || video.publishedAt,
            }));
            updateQuota(-1);
          }
        } catch (statsErr) {
          console.error('Failed to fetch stats:', statsErr);
        }
        
        setResults(videos);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        saveSearchResults(query, 'video', videos);
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
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(searchQuery)}&type=video&regionCode=${region}&pageToken=${nextPageToken}&key=${apiKey}`;
      
      const publishedAfter = getPublishedAfter();
      if (publishedAfter) {
        url += `&publishedAfter=${publishedAfter}`;
      }
      
      const resp = await fetch(url);
      const data = await resp.json();
      
      if (data.items) {
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        
        let videos = data.items.map(item => ({
          id: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
        }));

        try {
          const statsResp = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
          );
          const statsData = await statsResp.json();
          
          if (statsData.items) {
            const statsMap = {};
            statsData.items.forEach(item => {
              statsMap[item.id] = {
                viewCount: item.statistics?.viewCount,
                publishedAt: item.snippet?.publishedAt,
              };
            });
            
            videos = videos.map(video => ({
              ...video,
              viewCount: statsMap[video.id]?.viewCount,
              publishedAt: statsMap[video.id]?.publishedAt || video.publishedAt,
            }));
            updateQuota(-1);
          }
        } catch (statsErr) {
          console.error('Failed to fetch stats:', statsErr);
        }
        
        setResults([...results, ...videos]);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
      }
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const playVideo = (video) => {
    setCurrentPlaylist([video]);
    setCurrentVideoIndex(0);
    navigate('/');
  };

  const addToPlaylist = (video, e) => {
    e.stopPropagation();
    const newPlaylist = [...currentPlaylist, video];
    setCurrentPlaylist(newPlaylist);
  };

  return (
    <div className="h-[calc(100vh-48px)] overflow-y-auto pb-16 md:pb-0" style={{ background: 'var(--bg-main)' }}>
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
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for videos..."
                  className="w-full rounded-xl pl-12 pr-4 py-4 text-sm md:text-base"
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                />
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'var(--text-muted)' }}></i>
              </div>
              <button
                onClick={() => handleSearch()}
                className="w-full md:w-auto px-8 py-4 rounded-xl font-medium transition flex items-center justify-center gap-2 min-w-[140px]"
                style={{ background: 'var(--accent-color)', color: 'white' }}
              >
                <i className="fas fa-search"></i> Search
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <i className="fas fa-globe text-xs" style={{ color: 'var(--text-muted)' }}></i>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="text-xs rounded-lg px-2 py-1.5"
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                >
                  {regions.map(r => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Time:</span>
                {[
                  { value: 'all', label: 'All' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setTimeFilter(option.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                    style={{ 
                      background: timeFilter === option.value ? 'var(--accent-color)' : 'var(--bg-hover)',
                      color: timeFilter === option.value ? 'white' : 'var(--text-main)'
                    }}
                  >
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
              <i className="fas fa-play-circle text-6xl mb-4" style={{ color: 'var(--text-muted)' }}></i>
              <p style={{ color: 'var(--text-muted)' }} className="text-lg">
                {getCurrentApiKey() ? 'Search for videos' : 'Add an API key to search'}
              </p>
            </div>
          ) : (
            results.map((video) => (
              <div key={video.id} className="group">
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 cursor-pointer" onClick={() => playVideo(video)}>
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/320x180?text=Video'; }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fas fa-play text-white text-xl ml-1"></i>
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => playVideo(video)}>
                    <h3 className="text-sm font-medium line-clamp-2 group-hover:text-blue-500 transition-colors cursor-pointer" style={{ color: 'var(--text-main)' }}>
                      {video.title}
                    </h3>
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                      {video.channelTitle}
                      {video.viewCount && <span> • {formatViews(video.viewCount)} views</span>}
                      {video.publishedAt && <span> • {formatTimeAgo(video.publishedAt)}</span>}
                    </p>
                  </div>
                  <button onClick={(e) => addToPlaylist(video, e)} className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium transition hover:scale-110 active:scale-95" style={{ background: 'var(--accent-color)' }}>
                    <i className="fas fa-plus text-xs"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <div className="mt-8 text-center pb-8">
            <button onClick={loadMore} disabled={loading} className="px-8 py-3 rounded-xl font-medium disabled:opacity-50" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
              {loading ? 'Loading...' : 'Load More Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoPage;
