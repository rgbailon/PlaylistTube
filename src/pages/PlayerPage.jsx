import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../App';
import Settings from '../components/Settings';
import LiveChat from '../components/LiveChat';

function PlayerPage() {
  const { currentPlaylist, setCurrentPlaylist, currentVideoIndex, setCurrentVideoIndex, setPlayer, updateQuota, settingsOpen, setSettingsOpen, sidebarCollapsed } = useApp();
  const location = useLocation();

  const [videoTitle, setVideoTitle] = useState('');
  const [videoChannel, setVideoChannel] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [activeTab, setActiveTab] = useState('playlist');
  const [mobileTab, setMobileTab] = useState('player');
  const playerContainerId = 'youtube-player';
  const playerRef = useRef(null);
  const isCreatingPlayer = useRef(false);

  useEffect(() => {
    const initPlayer = () => {
      if (isCreatingPlayer.current) return;
      isCreatingPlayer.current = true;
      if (window.YT && window.YT.Player) {
        createPlayer();
      }
    };
    if (window.YT && window.YT.Player) initPlayer();
    else window.onYouTubeIframeAPIReady = initPlayer;
    return () => { window.onYouTubeIframeAPIReady = null; };
  }, []);

  useEffect(() => {
    if (playerReady && currentPlaylist.length > 0) loadVideo(currentVideoIndex);
  }, [playerReady]);

  useEffect(() => {
    if (playerReady && playerRef.current && currentPlaylist.length > 0) loadVideo(currentVideoIndex);
  }, [currentVideoIndex, currentPlaylist, playerReady]);

  const createPlayer = () => {
    if (!playerRef.current) {
      playerRef.current = new window.YT.Player(playerContainerId, {
        height: '100%', width: '100%',
        playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onStateChange: onPlayerStateChange, onReady: onPlayerReady }
      });
    }
  };

  const onPlayerReady = (event) => { setPlayer(event.target); setPlayerReady(true); };
  const onPlayerStateChange = (event) => {
    setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
    if (event.data === window.YT.PlayerState.ENDED) playNext();
  };

  const loadVideo = (index) => {
    if (!playerRef.current || !currentPlaylist[index]) return;
    const video = currentPlaylist[index];
    playerRef.current.loadVideoById(video.id);
    setVideoTitle(video.title);
    setVideoChannel(video.channelTitle || 'Unknown');
    updateQuota(-1);
  };

  const playNext = () => { if (currentVideoIndex < currentPlaylist.length - 1) setCurrentVideoIndex(currentVideoIndex + 1); };
  const playPrevious = () => { if (currentVideoIndex > 0) setCurrentVideoIndex(currentVideoIndex - 1); };
  const playVideo = (index) => { setCurrentVideoIndex(index); };

  const currentVideoId = currentPlaylist[currentVideoIndex]?.id;

return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden order-2 md:order-1">
        <div className="flex-1 flex flex-col p-2 md:p-6 pt-4 pb-24 md:pb-2 overflow-y-auto">
          <div className="flex-1 flex items-center justify-center">
            <div className={`w-full ${sidebarCollapsed ? 'max-w-full' : 'max-w-5xl'}`}>
              <div className="player-container relative w-full" style={{ paddingTop: '56.25%' }}>
                {currentPlaylist.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: '#0f0f0f' }}>
                    <i className="fab fa-youtube text-5xl mb-3" style={{ color: '#6b7280' }}></i>
                    <p style={{ color: '#9ca3af' }}>Ready to play</p>
                    <p className="text-sm mt-1" style={{ color: '#4b5563' }}>Load a playlist to start</p>
                  </div>
                )}
                <div id={playerContainerId} className="absolute inset-0"></div>
              </div>
            </div>
          </div>
          {videoTitle && (
            <div className="mt-2 md:mt-3">
              <h3 className="text-sm md:text-lg font-bold line-clamp-2" style={{ color: 'var(--text-main)' }}>{videoTitle}</h3>
              <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{videoChannel}</p>
            </div>
          )}
          <div className="hidden md:hidden gap-2 mt-2 md:mt-3">
            <button onClick={playPrevious} disabled={currentVideoIndex === 0} className="flex-1 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm disabled:opacity-50" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
              <i className="fas fa-step-backward mr-1"></i>Prev
            </button>
            <button onClick={playNext} disabled={currentVideoIndex >= currentPlaylist.length - 1} className="flex-1 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm disabled:opacity-50" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
              Next<i className="fas fa-step-forward ml-1"></i>
            </button>
          </div>
        </div>
        
        <div className="md:hidden border-t flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex">
            <button onClick={() => setActiveTab('chat')} className="flex-1 px-3 py-2 text-xs font-medium" style={{ color: activeTab === 'chat' ? '#22c55e' : 'var(--text-muted)', borderBottom: activeTab === 'chat' ? '2px solid #22c55e' : '2px solid transparent' }}>
              <i className="fas fa-comments mr-1"></i>Live Chat
            </button>
            <button onClick={() => setActiveTab('playlist')} className="flex-1 px-3 py-2 text-xs font-medium" style={{ color: activeTab === 'playlist' ? 'var(--accent-color)' : 'var(--text-muted)', borderBottom: activeTab === 'playlist' ? '2px solid var(--accent-color)' : '2px solid transparent' }}>
              <i className="fas fa-list-ol mr-1"></i>Playlist
            </button>
            <button onClick={() => setSettingsOpen(!settingsOpen)} className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
              <i className="fas fa-cog"></i>
            </button>
          </div>
          {settingsOpen && <div className="flex-shrink-0"><Settings /></div>}
        </div>
        
        {activeTab === 'chat' && (
          <div className="md:hidden flex-1 overflow-hidden" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            {currentVideoId ? <LiveChat videoId={currentVideoId} /> : (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Play a video to use live chat</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'playlist' && (
          <div className="md:hidden flex-1 overflow-y-auto" style={{ background: 'var(--bg-main)', maxHeight: 'calc(100vh - 320px)' }}>
            {currentPlaylist.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-film text-2xl mb-2" style={{ color: 'var(--text-muted)' }}></i>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Videos will appear here</p>
              </div>
            ) : currentPlaylist.map((video, index) => (
              <div key={video.id || index} onClick={() => playVideo(index)} className="flex gap-2 p-2 cursor-pointer mb-1 mx-1 rounded-lg" style={{ background: index === currentVideoIndex ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0">
                  <img src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
                  {index === currentVideoIndex && isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <i className="fas fa-play text-white text-xs"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs line-clamp-2" style={{ color: index === currentVideoIndex ? '#3b82f6' : 'var(--text-main)' }}>{video.title}</h4>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{video.channelTitle || 'Unknown'}</p>
                  {video.viewCount !== undefined && video.viewCount > 0 && (
                    <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>
                      <i className="fas fa-eye mr-1"></i>{video.viewCount.toLocaleString()} views
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="hidden md:flex w-80 border-l flex-col overflow-hidden order-1 md:order-2 md:border-l-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={() => { setActiveTab('playlist'); setSettingsOpen(false); }} className="flex-1 px-3 py-2 text-sm font-medium" style={{ color: activeTab === 'playlist' ? 'var(--accent-color)' : 'var(--text-muted)', borderBottom: activeTab === 'playlist' ? '2px solid var(--accent-color)' : '2px solid transparent' }}>
            <i className="fas fa-list-ol mr-1"></i><span className="hidden md:inline">Playlist</span>
          </button>
          <button onClick={() => { setActiveTab('chat'); setSettingsOpen(false); }} className="flex-1 px-3 py-2 text-sm font-medium" style={{ color: activeTab === 'chat' ? '#22c55e' : 'var(--text-muted)', borderBottom: activeTab === 'chat' ? '2px solid #22c55e' : '2px solid transparent' }}>
            <i className="fas fa-comments mr-1"></i><span className="hidden md:inline">Live Chat</span>
          </button>
          <button onClick={() => setSettingsOpen(!settingsOpen)} className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
            <i className="fas fa-cog"></i>
          </button>
        </div>
        {settingsOpen && <div className="flex-shrink-0"><Settings /></div>}
        {activeTab === 'playlist' ? (
          <div className="flex-1 overflow-y-auto h-0 min-h-[200px]" style={{ background: 'var(--bg-main)' }}>
            {currentPlaylist.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-film text-2xl mb-2" style={{ color: 'var(--text-muted)' }}></i>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Videos will appear here</p>
              </div>
            ) : currentPlaylist.map((video, index) => (
              <div key={video.id || index} onClick={() => playVideo(index)} className="flex gap-2 p-2 cursor-pointer mb-1 mx-1 rounded-lg" style={{ background: index === currentVideoIndex ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0">
                  <img src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
                  {index === currentVideoIndex && isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <i className="fas fa-play text-white text-xs"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs line-clamp-2" style={{ color: index === currentVideoIndex ? '#3b82f6' : 'var(--text-main)' }}>{video.title}</h4>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{video.channelTitle || 'Unknown'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {video.publishedAt && (
                      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        <i className="fas fa-calendar-alt mr-1"></i>
                        {new Date(video.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                    {video.liveViewers > 0 && (
                      <span className="text-[9px]" style={{ color: '#ef4444' }}>
                        <i className="fas fa-circle mr-1"></i>
                        {video.liveViewers.toLocaleString()} watching
                      </span>
                    )}
                    {video.viewCount !== undefined && video.viewCount > 0 && !video.liveViewers && (
                      <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                        <i className="fas fa-eye mr-1"></i>
                        {video.viewCount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden h-0 min-h-[200px]">
            {currentVideoId ? <LiveChat videoId={currentVideoId} /> : (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Play a video to use live chat</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export default PlayerPage;
