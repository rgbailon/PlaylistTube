import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';

function LivePage() {
  const { getCurrentApiKey, updateQuota, setCurrentPlaylist, setCurrentVideoIndex, switchToNextApiKey, addVideoToPlaylist } = useApp();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [nextPageToken, setNextPageToken] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [viewerCounts, setViewerCounts] = useState({});

  useEffect(() => {
    loadLiveCategory('all');
  }, []);

  const loadLiveCategory = async (cat) => {
    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      setResults([]);
      setError('Please add a YouTube API key in Settings');
      return;
    }

    setCategory(cat);
    setLoading(true);
    setError(null);
    
    const queries = {
      all: 'live stream',
      gaming: 'gaming live',
      music: 'live music',
      news: 'live news',
      sports: 'live sports',
      technology: 'tech live',
      entertainment: 'entertainment live',
    };

    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${queries[cat]}&type=video&eventType=live&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.error) {
        setError(`API Error: ${data.error.message}`);
        if (data.error.message?.includes('quota') || data.error.code === 403) {
          updateQuota(10000, 'search');
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
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Failed to load live streams:', err);
      setError('Failed to load live streams. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      loadLiveCategory(category);
      return;
    }

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
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&eventType=live&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.error) {
        setError(`API Error: ${data.error.message}`);
        if (data.error.message?.includes('quota') || data.error.code === 403) {
          updateQuota(10000, 'search');
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

  const handleCategoryClick = (cat) => {
    setSearchQuery('');
    loadLiveCategory(cat);
  };

  const loadMore = async () => {
    if (!nextPageToken) return;
    
    const apiKey = getCurrentApiKey();
    if (!apiKey) return;

    setLoading(true);
    try {
      const queries = {
        all: 'live stream',
        gaming: 'gaming live',
        music: 'live music',
        news: 'live news',
        sports: 'live sports',
        technology: 'tech live',
        entertainment: 'entertainment live',
      };
      
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${queries[category]}&type=video&eventType=live&pageToken=${nextPageToken}&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.items) {
        setResults([...results, ...data.items]);
        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken);
        updateQuota(-100, 'search');
      }
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const playVideo = (item, e) => {
    if (e) e.preventDefault();
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

  const playWithChat = (item, e) => {
    e.preventDefault();
    const video = {
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    };
    setCurrentPlaylist([video]);
    setCurrentVideoIndex(0);
    navigate('/?chat=true');
  };

  const addToPlaylist = (item, e) => {
    e.stopPropagation();
    const video = {
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      addedAt: new Date().toISOString(),
    };
    addVideoToPlaylist(video);
  };

  const fetchViewerCounts = async (videoIds) => {
    const apiKey = getCurrentApiKey();
    if (!apiKey || !videoIds.length) return;

    try {
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoIds.join(',')}&key=${apiKey}`
      );
      const data = await resp.json();
      
      if (data.items) {
        const counts = {};
        data.items.forEach(item => {
          if (item.liveStreamingDetails?.concurrentViewers) {
            counts[item.id] = parseInt(item.liveStreamingDetails.concurrentViewers).toLocaleString();
          }
        });
        setViewerCounts(prev => ({ ...prev, ...counts }));
      }
    } catch (err) {
      console.error('Failed to fetch viewer counts:', err);
    }
  };

  useEffect(() => {
    if (results.length > 0) {
      const videoIds = results.map(item => item.id.videoId).filter(id => !viewerCounts[id]);
      if (videoIds.length > 0) {
        fetchViewerCounts(videoIds);
      }
    }
  }, [results]);

  const categories = [
    { id: 'all', label: 'Trending', icon: 'fa-fire' },
    { id: 'gaming', label: 'Gaming', icon: 'fa-gamepad' },
    { id: 'music', label: 'Music', icon: 'fa-music' },
    { id: 'news', label: 'News', icon: 'fa-newspaper' },
    { id: 'sports', label: 'Sports', icon: 'fa-futbol' },
    { id: 'technology', label: 'Tech', icon: 'fa-microchip' },
    { id: 'entertainment', label: 'Entertainment', icon: 'fa-tv' },
  ];

  return (
    <div className="h-[calc(100vh-48px)] overflow-y-auto pb-16 md:pb-0" style={{ background: 'var(--bg-main)' }}>
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
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search live streams..."
              className="w-full rounded-xl pl-12 pr-4 py-4 text-sm md:text-base shadow-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)]"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-[var(--bg-hover)]"
            >
              <i className="fas fa-search" style={{ color: 'var(--text-muted)' }}></i>
            </button>
          </div>
        </div>

        <div className="px-4 md:px-8 pb-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="px-4 py-2 rounded-full text-sm font-medium transition"
                style={{ 
                  background: category === cat.id ? '#dc2626' : 'var(--bg-card)', 
                  color: category === cat.id ? 'white' : 'var(--text-main)',
                  border: '1px solid ' + (category === cat.id ? '#dc2626' : 'var(--border-color)')
                }}
              >
                <i className={`fas ${cat.icon} mr-1`}></i>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 md:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
              {categories.find(c => c.id === category)?.label} Live Streams
            </h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {results.length} streams
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
                <i className="fas fa-broadcast-tower text-6xl mb-4" style={{ color: 'var(--text-muted)' }}></i>
                <p style={{ color: 'var(--text-muted)' }} className="text-lg">
                  {getCurrentApiKey() ? 'No live streams found' : 'Add an API key to search'}
                </p>
              </div>
            ) : (
              results.map((item) => (
                <div key={item.id.videoId} className="group">
                  <div onClick={() => playVideo(item)} className="cursor-pointer">
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                      <img
                        src={item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url}
                        alt={item.snippet.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/320x180?text=Live';
                        }}
                      />
                      <div className="absolute top-2 left-2 px-2 py-1 rounded bg-red-600 text-white text-xs flex items-center gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                      </div>
                      {viewerCounts[item.id.videoId] && (
                        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs flex items-center gap-1">
                          <i className="fas fa-eye"></i>
                          {viewerCounts[item.id.videoId]}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <i className="fas fa-play text-white text-lg ml-1"></i>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium line-clamp-2 group-hover:text-blue-500 transition-colors" style={{ color: 'var(--text-main)' }}>
                      {item.snippet.title}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <p className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                      {item.snippet.channelTitle}
                    </p>
<button
                      onClick={(e) => {
                        e.stopPropagation();
                        const video = {
                          id: item.id.videoId,
                          title: item.snippet.title,
                          channelTitle: item.snippet.channelTitle,
                          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
                          addedAt: new Date().toISOString(),
                          liveViewers: viewerCounts[item.id.videoId] ? parseInt(viewerCounts[item.id.videoId].replace(/,/g, '')) : 0,
                        };
                        addVideoToPlaylist(video);
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition flex-shrink-0 hover:scale-110 active:scale-95"
                      style={{ 
                        background: 'var(--accent-color)', 
                        color: 'white' 
                      }}
                      title="Add to playlist"
                    >
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {hasMore && (
          <div className="px-4 md:px-8 pb-8 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-8 py-3 rounded-xl hover:bg-red-50 hover:border-red-200 transition font-medium disabled:opacity-50"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
            >
              {loading ? 'Loading...' : 'Load More Streams'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LivePage;
