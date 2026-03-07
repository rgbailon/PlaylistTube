import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import * as Tooltip from '@radix-ui/react-tooltip';

function Sidebar() {
  const { playlistHistory, clearHistory, sidebarCollapsed, setSidebarCollapsed, setCurrentPlaylist, setCurrentVideoIndex, removeFromHistory, mobileSidebarOpen, setMobileSidebarOpen } = useApp();
  const [historySearch, setHistorySearch] = useState('');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const navigate = useNavigate();

  // Handle closing animation
  useEffect(() => {
    if (isAnimatingOut) {
      const timer = setTimeout(() => {
        setMobileSidebarOpen(false);
        setIsAnimatingOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimatingOut, setMobileSidebarOpen]);

  // Listen for close event from Header
  useEffect(() => {
    const handleCloseEvent = () => {
      if (mobileSidebarOpen) {
        handleClose();
      }
    };
    window.addEventListener('closeMobileSidebar', handleCloseEvent);
    return () => window.removeEventListener('closeMobileSidebar', handleCloseEvent);
  }, [mobileSidebarOpen]);

  const handleClose = () => {
    setIsAnimatingOut(true);
  };

  const filteredHistory = playlistHistory.filter(item =>
    item.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  const handlePlaylistClick = (playlist) => {
    setCurrentPlaylist(playlist.videos || []);
    setCurrentVideoIndex(0);
    navigate('/');
  };

  const getThumbnail = (playlist) => {
    if (playlist.thumbnail && playlist.thumbnail.startsWith('http')) {
      return playlist.thumbnail;
    }
    if (playlist.videos && playlist.videos[0]?.thumbnail) {
      return playlist.videos[0].thumbnail;
    }
    return 'https://via.placeholder.com/120x68?text=Playlist';
  };

  // Show sidebar when: not collapsed on desktop OR open on mobile
  const shouldShowSidebar = !sidebarCollapsed || mobileSidebarOpen;
  
  if (!shouldShowSidebar) {
    return (
      <>
        <button
          onClick={() => {
            if (window.innerWidth < 768) {
              setMobileSidebarOpen(true);
            } else {
              setSidebarCollapsed(false);
            }
          }}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 p-2 rounded-r-lg shadow-lg hidden md:block"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: 'none', color: 'var(--text-muted)' }}
          title="Show history"
        >
          <i className="fas fa-chevron-right text-xs"></i>
        </button>
        {mobileSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 z-20 bg-black/50 animate-fade-in"
            onClick={handleClose}
          />
        )}
      </>
    );
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      {mobileSidebarOpen && !isAnimatingOut && (
        <div 
          className="md:hidden fixed inset-0 z-20 bg-black/50"
          onClick={handleClose}
        />
      )}
      <aside
        className={`fixed left-0 top-12 bottom-0 w-64 border-r overflow-hidden z-30 
          ${isAnimatingOut ? 'animate-slide-out-left' : 'transition-all duration-300'}
          ${mobileSidebarOpen && !isAnimatingOut ? 'animate-slide-in-left' : ''}
          ${!mobileSidebarOpen && !isAnimatingOut ? '-translate-x-full md:translate-x-0' : ''}
          ${sidebarCollapsed && !mobileSidebarOpen ? 'md:hidden' : ''}`}
        style={{ 
          background: 'var(--bg-card)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 
                className="font-semibold text-sm uppercase tracking-wide flex items-center gap-2"
                style={{ color: 'var(--text-main)' }}
              >
                <i className="fas fa-layer-group text-sm" style={{ color: 'var(--accent-color)' }}></i>
                Library
              </h2>
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    handleClose();
                  } else {
                    setSidebarCollapsed(true);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition"
                style={{ color: 'var(--text-muted)' }}
                title="Collapse"
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
            </div>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}></i>
              <input
                type="text"
                placeholder="Search library..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full rounded-lg pl-9 pr-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-color)] transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <i className="fas fa-list-ul text-2xl" style={{ color: 'var(--text-muted)' }}></i>
                </div>
                <p style={{ color: 'var(--text-main)' }} className="text-sm font-medium">
                  No playlists yet
                </p>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1 text-center">
                  Search and load playlists to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((playlist, index) => (
                  <Tooltip.Root key={playlist.id || index}>
                    <Tooltip.Trigger asChild>
                      <div
                        onClick={() => handlePlaylistClick(playlist)}
                        className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group hover:shadow-md"
                        style={{ 
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div className="relative w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden shadow-sm">
                          <img
                            src={getThumbnail(playlist)}
                            alt={playlist.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/120x68?text=Playlist';
                            }}
                          />
                          <div 
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"
                          >
                            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <i className="fas fa-play text-xs text-gray-800 ml-0.5"></i>
                            </div>
                          </div>
                          {playlist.videoCount && (
                            <span 
                              className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-black/80 text-white font-medium"
                            >
                              {playlist.videoCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--text-main)' }}
                          >
                            {playlist.title}
                          </h3>
                          <p 
                            className="text-xs mt-0.5 truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {playlist.channelTitle || 'YouTube'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span 
                              className="text-[10px]"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {playlist.videos?.length || 0} videos
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(playlist.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 transition-all duration-200 self-start mt-1"
                          style={{ color: 'var(--text-muted)' }}
                          title="Remove"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content 
                        className="max-w-xs px-4 py-3 rounded-xl shadow-lg z-50"
                        sideOffset={5}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                      >
                        <div className="font-medium">{playlist.title}</div>
                        <div className="text-xs mt-1.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                          <span>{playlist.channelTitle || 'YouTube'}</span>
                          <span>•</span>
                          <span>{playlist.videos?.length || 0} videos</span>
                        </div>
                        <Tooltip.Arrow style={{ fill: 'var(--bg-card)' }} />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                ))}
              </div>
            )}
          </div>

          {playlistHistory.length > 0 && (
            <div className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={clearHistory}
                className="w-full text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition hover:bg-red-50"
                style={{ color: 'var(--text-muted)' }}
                title="Clear history"
              >
                <i className="fas fa-trash-alt text-[10px]"></i>
                <span>Clear Library</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </Tooltip.Provider>
  );
}

export default Sidebar;
