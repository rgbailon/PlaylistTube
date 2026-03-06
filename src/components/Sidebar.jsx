import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import * as Tooltip from '@radix-ui/react-tooltip';

function Sidebar() {
  const { playlistHistory, clearHistory, sidebarCollapsed, setSidebarCollapsed, setCurrentPlaylist, setCurrentVideoIndex } = useApp();
  const [historySearch, setHistorySearch] = useState('');
  const navigate = useNavigate();

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

  if (sidebarCollapsed) {
    return (
      <button
        onClick={() => setSidebarCollapsed(false)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 p-2 rounded-r-lg shadow-lg hidden md:block"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: 'none', color: 'var(--text-muted)' }}
        title="Show history"
      >
        <i className="fas fa-chevron-right text-xs"></i>
      </button>
    );
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <aside
        className="fixed left-0 top-12 bottom-0 w-64 border-r overflow-hidden transition-all duration-300 z-30 hidden md:block"
        style={{ 
          background: 'var(--bg-card)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 
                className="font-semibold text-sm uppercase tracking-wider flex items-center gap-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <i className="fas fa-history text-blue-500"></i>
                History
              </h2>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 rounded hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-muted)' }}
                title="Collapse"
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
            </div>
            <input
              type="text"
              placeholder="Search history..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]"
            />
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <i className="fas fa-history text-xl" style={{ color: 'var(--text-muted)' }}></i>
                </div>
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                  No playlists yet
                </p>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1">
                  Search to add playlists
                </p>
              </div>
            ) : (
              filteredHistory.map((playlist, index) => (
                <Tooltip.Root key={playlist.id || index}>
                  <Tooltip.Trigger asChild>
                    <div
                      onClick={() => handlePlaylistClick(playlist)}
                      className="flex gap-3 p-2 rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition group"
                    >
                      <div className="relative w-24 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                        <img
                          src={getThumbnail(playlist)}
                          alt={playlist.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/120x68?text=Playlist';
                          }}
                        />
                        {playlist.videoCount && (
                          <span 
                            className="absolute bottom-1 right-1 text-[10px] px-1 rounded bg-black/70 text-white"
                          >
                            {playlist.videoCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="text-sm font-medium truncate group-hover:text-blue-500 transition"
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
                        <p 
                          className="text-[10px] mt-0.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {playlist.videos?.length || 0} videos
                        </p>
                      </div>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content 
                      className="max-w-xs px-3 py-2 rounded-lg shadow-lg text-sm z-50"
                      sideOffset={5}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                    >
                      <div className="font-medium">{playlist.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {playlist.channelTitle || 'YouTube'} • {playlist.videos?.length || 0} videos
                      </div>
                      <Tooltip.Arrow style={{ fill: 'var(--bg-card)' }} />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ))
            )}
          </div>

          {playlistHistory.length > 0 && (
            <div className="p-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={clearHistory}
                className="w-full text-xs text-red-500 hover:text-red-600 transition py-1.5 rounded flex items-center justify-center gap-1.5"
                title="Clear history"
              >
                <i className="fas fa-trash-alt text-[10px]"></i>
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </Tooltip.Provider>
  );
}

export default Sidebar;
