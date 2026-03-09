import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../App';
import Settings from '../components/Settings';
import LiveChat from '../components/LiveChat';

function PlayerPage() {
  const { currentPlaylist, setCurrentPlaylist, currentVideoIndex, setCurrentVideoIndex, setPlayer, updateQuota, settingsOpen, setSettingsOpen, sidebarCollapsed, playerPanelOpen, setPlayerPanelOpen } = useApp();
  const location = useLocation();

  // Screen recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [formattedTime, setFormattedTime] = useState('00:00');
  const [showRecordButton, setShowRecordButton] = useState(false);
  const recordButtonTimeout = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordedChunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: true,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
        surfaceSwitching: 'include',
      });
      streamRef.current = stream;
      recordedChunksRef.current = [];
      
      const options = { 
        mimeType: 'video/webm;codecs=vp9,opus',
        audioBitsPerSecond: 256000,
        videoBitsPerSecond: 8000000,
      };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp9';
        delete options.audioBitsPerSecond;
        delete options.videoBitsPerSecond;
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        delete options.audioBitsPerSecond;
        delete options.videoBitsPerSecond;
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error('WebM not supported');
        return;
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: options.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => {
          const mins = Math.floor(t / 60);
          const secs = t % 60;
          setFormattedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
          return t + 1;
        });
      }, 1000);
      
      stream.getVideoTracks()[0].onended = () => stopRecording();
    } catch (err) {
      console.error('Recording error:', err);
      alert('Could not start recording: ' + err.message);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const [videoTitle, setVideoTitle] = useState('');
  const [videoChannel, setVideoChannel] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [activeTab, setActiveTab] = useState('playlist');
  const [tabAnimating, setTabAnimating] = useState(false);
  const [mobileTab, setMobileTab] = useState('player');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [showFullscreenPlaylist, setShowFullscreenPlaylist] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const playerContainerId = 'youtube-player';
  const playerRef = useRef(null);
  const isCreatingPlayer = useRef(false);
  const containerRef = useRef(null);
  const hidePlaylistTimeout = useRef(null);
  const clickTimeout = useRef(null);
  const playlistLengthRef = useRef(currentPlaylist.length);
  playlistLengthRef.current = currentPlaylist.length;

  // Handle record button visibility
  const handleMouseEnterLeftZone = () => {
    if (recordButtonTimeout.current) {
      clearTimeout(recordButtonTimeout.current);
    }
    setShowRecordButton(true);
  };

  const handleMouseLeaveLeftZone = () => {
    recordButtonTimeout.current = setTimeout(() => {
      setShowRecordButton(false);
    }, 500);
  };

  const handleRecordButtonHover = () => {
    if (recordButtonTimeout.current) {
      clearTimeout(recordButtonTimeout.current);
    }
  };

  const handleRecordButtonLeave = () => {
    recordButtonTimeout.current = setTimeout(() => {
      setShowRecordButton(false);
    }, 1000);
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (recordButtonTimeout.current) {
        clearTimeout(recordButtonTimeout.current);
      }
    };
  }, []);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (!playerRef.current) return;
      
      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'j':
          e.preventDefault();
          playerRef.current.seekTo(Math.max(0, playerRef.current.getCurrentTime() - 10), true);
          break;
        case 'l':
          e.preventDefault();
          playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10, true);
          break;
        case 'arrowleft':
          e.preventDefault();
          playerRef.current.seekTo(Math.max(0, playerRef.current.getCurrentTime() - 5), true);
          break;
        case 'arrowright':
          e.preventDefault();
          playerRef.current.seekTo(playerRef.current.getCurrentTime() + 5, true);
          break;
        case 'arrowup':
          e.preventDefault();
          playerRef.current.setVolume(Math.min(100, playerRef.current.getVolume() + 10));
          break;
        case 'arrowdown':
          e.preventDefault();
          playerRef.current.setVolume(Math.max(0, playerRef.current.getVolume() - 10));
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          if (playerRef.current.isMuted()) {
            playerRef.current.unMute();
          } else {
            playerRef.current.mute();
          }
          break;
        case 'r':
          if (isFullscreen) {
            e.preventDefault();
            setShowRecordButton(prev => !prev);
          }
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          playerRef.current.seekTo(playerRef.current.getDuration() * (parseInt(e.key) / 10), true);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

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
    if (event.data === window.YT.PlayerState.ENDED) {
      setCurrentVideoIndex(prev => {
        if (prev < playlistLengthRef.current - 1) {
          return prev + 1;
        }
        return prev;
      });
    }
  };

  const loadVideo = (index) => {
    if (!playerRef.current || !currentPlaylist[index]) return;
    const video = currentPlaylist[index];
    playerRef.current.loadVideoById(video.id);
    setVideoTitle(video.title);
    setVideoChannel(video.channelTitle || 'Unknown');
    updateQuota(-1, 'playlistItems');
  };

  const playNext = () => { setCurrentVideoIndex(prev => prev < playlistLengthRef.current - 1 ? prev + 1 : prev); };
  const playPrevious = () => { setCurrentVideoIndex(prev => prev > 0 ? prev - 1 : prev); };
  const playVideo = (index) => { setCurrentVideoIndex(index); };


  const togglePlay = () => {
    if (playerRef.current) {
      const state = playerRef.current.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };

  const handlePlayerClick = (e) => {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      toggleFullscreen();
    } else {
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = null;
        togglePlay();
      }, 250);
    }
  };

const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if (containerRef.current.webkitRequestFullscreen) {
          containerRef.current.webkitRequestFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      setShowFullscreenPlaylist(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        setShowFullscreenPlaylist(false);
        setShowRecordButton(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen && !immersiveMode) return;

    const handleMouseMove = (e) => {
      const screenWidth = window.innerWidth;
      const edgeThreshold = 100;

      // Right edge - show playlist
      if (e.clientX >= screenWidth - edgeThreshold) {
        if (hidePlaylistTimeout.current) {
          clearTimeout(hidePlaylistTimeout.current);
          hidePlaylistTimeout.current = null;
        }
        setShowFullscreenPlaylist(true);
      }

      // Left edge - show record button
      if (e.clientX <= edgeThreshold) {
        if (recordButtonTimeout.current) {
          clearTimeout(recordButtonTimeout.current);
          recordButtonTimeout.current = null;
        }
        setShowRecordButton(true);
      } else if (e.clientX > edgeThreshold && e.clientX < screenWidth - edgeThreshold) {
        // Mouse is in middle - hide record button after delay
        if (!recordButtonTimeout.current) {
          recordButtonTimeout.current = setTimeout(() => {
            setShowRecordButton(false);
            recordButtonTimeout.current = null;
          }, 300);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hidePlaylistTimeout.current) {
        clearTimeout(hidePlaylistTimeout.current);
      }
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    let hideCursorTimeout;
    const showCursor = () => {
      document.body.style.cursor = 'default';
      clearTimeout(hideCursorTimeout);
      hideCursorTimeout = setTimeout(() => {
        if (isFullscreen) {
          document.body.style.cursor = 'none';
        }
      }, 3000);
    };

    document.addEventListener('mousemove', showCursor);
    showCursor();

    return () => {
      clearTimeout(hideCursorTimeout);
      document.body.style.cursor = 'default';
      document.removeEventListener('mousemove', showCursor);
    };
  }, [isFullscreen]);

  const currentVideoId = currentPlaylist[currentVideoIndex]?.id;

  return (
    <div 
      ref={containerRef} 
      className={`h-full flex flex-col md:flex-row overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[9999] bg-black' : ''} ${immersiveMode ? 'fixed inset-0 z-[9999] bg-black' : ''}`}
    >
      {/* Sliding Record Button - Left Side */}
      {isFullscreen && (
        <>
          <div 
            className="fixed left-0 top-0 h-[100vh] w-[100px] z-[9998] cursor-west"
            onMouseEnter={() => {
              if (recordButtonTimeout.current) {
                clearTimeout(recordButtonTimeout.current);
                recordButtonTimeout.current = null;
              }
              setShowRecordButton(true);
            }}
            onMouseLeave={() => {
              recordButtonTimeout.current = setTimeout(() => {
                setShowRecordButton(false);
                recordButtonTimeout.current = null;
              }, 300);
            }}
          />
          <div 
            className={`fixed left-0 top-1/2 -translate-y-1/2 z-[10000] transition-transform duration-300 ease-out ${showRecordButton ? 'translate-x-0' : '-translate-x-full'}`}
            onMouseEnter={handleRecordButtonHover}
            onMouseLeave={handleRecordButtonLeave}
          >
          <button
            onClick={handleRecordClick}
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-r-xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-500 animate-pulse' 
                : 'bg-gray-900/90 hover:bg-red-600'
            }`}
            style={{ 
              color: 'white',
              backdropFilter: 'blur(10px)',
              border: isRecording ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.2)'
            }}
          >
            {isRecording ? (
              <>
                <div className="w-3 h-3 bg-white rounded-sm"></div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-bold">REC</span>
                  <span className="text-[8px] opacity-80">{formattedTime}</span>
                </div>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>
                <span className="text-[10px] font-medium">Record</span>
              </>
            )}
          </button>
        </div>
        </>
      )}

      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isFullscreen ? 'h-screen' : ''} ${immersiveMode ? 'h-screen' : ''}`}>
        <div className={`flex-1 flex flex-col ${isFullscreen ? 'h-screen' : 'p-1 md:p-2 pt-1 pb-24 md:pb-2'} ${immersiveMode ? 'h-screen' : ''} overflow-y-auto relative`}>
          <div className={`flex-1 flex items-center justify-center ${isFullscreen ? 'h-full' : ''} ${immersiveMode ? 'h-full' : ''}`}>
            <div className={`w-full ${isFullscreen ? 'max-w-none h-full' : (sidebarCollapsed ? 'max-w-full' : 'max-w-5xl')} ${immersiveMode ? 'max-w-none h-full' : ''}`}>
              <div 
                className="player-container relative w-full h-full"
                style={isFullscreen || immersiveMode ? {} : { paddingTop: '56.25%' }}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
              >
                {currentPlaylist.length === 0 && !isFullscreen && !immersiveMode && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: '#0f0f0f' }}>
                    <i className="fab fa-youtube text-5xl mb-3" style={{ color: '#6b7280' }}></i>
                    <p style={{ color: '#9ca3af' }}>Ready to play</p>
                    <p className="text-sm mt-1" style={{ color: '#4b5563' }}>Load a playlist to start</p>
                  </div>
                )}
                <div id={playerContainerId} className="absolute inset-0"></div>
                <div 
                  className="absolute z-10"
                  onClick={togglePlay}
                  onDoubleClick={toggleFullscreen}
                  style={{ 
                    width: '85%',
                    height: '85%',
                    top: '7.5%',
                    left: '7.5%'
                  }}
                ></div>
                {(isFullscreen || immersiveMode) && (
                  <>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer"
                      style={{ background: 'transparent' }}
                      onMouseEnter={() => {
                        if (hidePlaylistTimeout.current) {
                          clearTimeout(hidePlaylistTimeout.current);
                          hidePlaylistTimeout.current = null;
                        }
                        setShowFullscreenPlaylist(true);
                      }}
                    />
                  </>
                )}
                {immersiveMode && (
                  <>
                    <button
                      onClick={() => setImmersiveMode(false)}
                      className="absolute top-4 left-4 z-20 p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}
                      title="Exit"
                    >
                      <i className="fas fa-times text-sm"></i>
                    </button>
                    <div 
                      className="absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer"
                      style={{ background: 'transparent' }}
                      onMouseEnter={() => {
                        if (hidePlaylistTimeout.current) {
                          clearTimeout(hidePlaylistTimeout.current);
                          hidePlaylistTimeout.current = null;
                        }
                        setShowFullscreenPlaylist(true);
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {!isFullscreen && !immersiveMode && (
            <div className="md:hidden px-2 pb-2">
              {videoTitle && (
                <div className="mb-2">
                  <h3 className="text-sm font-bold line-clamp-2" style={{ color: 'var(--text-main)' }}>{videoTitle}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{videoChannel}</p>
                </div>
              )}
              {currentPlaylist[currentVideoIndex]?.description && (
                <div className="mb-2 p-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-xs line-clamp-3" style={{ color: 'var(--text-muted)' }}>
                    {currentPlaylist[currentVideoIndex].description}
                  </p>
                </div>
              )}
              {currentVideoId && (
                <div className="mb-2 rounded-lg overflow-hidden" style={{ background: 'var(--bg-card)' }}>
                  <button 
                    onClick={() => setShowComments(!showComments)}
                    className="w-full p-2 flex items-center justify-between border-b"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <h4 className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Comments</h4>
                    <i className={`fas ${showComments ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`} style={{ color: 'var(--text-muted)' }}></i>
                  </button>
                  {showComments && (
                    <div className="h-48 overflow-y-auto">
                      <iframe
                        src={`https://www.youtube.com/comment_thread?video_id=${currentVideoId}&theme=dark`}
                        className="w-full h-full border-0"
                        title="YouTube Comments"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!isFullscreen && !immersiveMode && videoTitle && (
            <div className="hidden md:block mt-2 md:mt-3">
              <h3 className="text-sm md:text-lg font-bold line-clamp-2" style={{ color: 'var(--text-main)' }}>{videoTitle}</h3>
              <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{videoChannel}</p>
              {currentPlaylist[currentVideoIndex]?.description && (
                <div className="mt-2 p-2 rounded-lg" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-xs line-clamp-3" style={{ color: 'var(--text-muted)' }}>
                    {currentPlaylist[currentVideoIndex].description}
                  </p>
                </div>
              )}
              {currentVideoId && (
                <div className="mt-2 rounded-lg overflow-hidden" style={{ background: 'var(--bg-card)' }}>
                  <button 
                    onClick={() => setShowComments(!showComments)}
                    className="w-full p-2 flex items-center justify-between border-b"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <h4 className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>Comments</h4>
                    <i className={`fas ${showComments ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs`} style={{ color: 'var(--text-muted)' }}></i>
                  </button>
                  {showComments && (
                    <div className="h-48 overflow-y-auto">
                      <iframe
                        src={`https://www.youtube.com/comment_thread?video_id=${currentVideoId}&theme=dark`}
                        className="w-full h-full border-0"
                        title="YouTube Comments"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )}
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
        
        {activeTab === 'chat' && !isFullscreen && !immersiveMode && (
          <div className="md:hidden flex-1 overflow-hidden min-h-0">
            {currentVideoId ? <LiveChat videoId={currentVideoId} /> : (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Play a video to use live chat</p>
              </div>
            )}
          </div>
        )}
      </div>

{isFullscreen && (
        <aside 
          className={`fixed right-0 top-0 h-screen w-80 flex flex-col overflow-hidden transition-transform duration-300 z-[9998] ${showFullscreenPlaylist ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ background: 'rgba(30,30,30,0.95)', backdropFilter: 'blur(10px)' }}
          onMouseEnter={() => {
            if (hidePlaylistTimeout.current) {
              clearTimeout(hidePlaylistTimeout.current);
              hidePlaylistTimeout.current = null;
            }
          }}
          onMouseLeave={() => {
            hidePlaylistTimeout.current = setTimeout(() => {
              setShowFullscreenPlaylist(false);
            }, 300);
          }}
        >
          <div className="flex border-b flex-shrink-0" style={{ borderColor: '#404040' }}>
            <button onClick={() => setActiveTab('playlist')} className="flex-1 px-3 py-2 text-sm font-medium" style={{ color: activeTab === 'playlist' ? 'var(--accent-color)' : '#9ca3af', borderBottom: activeTab === 'playlist' ? '2px solid var(--accent-color)' : '2px solid transparent' }}>
              <i className="fas fa-list-ol mr-1"></i>Playlist
            </button>
            <button onClick={() => setActiveTab('chat')} className="flex-1 px-3 py-2 text-sm font-medium" style={{ color: activeTab === 'chat' ? '#22c55e' : '#9ca3af', borderBottom: activeTab === 'chat' ? '2px solid #22c55e' : '2px solid transparent' }}>
              <i className="fas fa-comments mr-1"></i>Live Chat
            </button>
          </div>
          {activeTab === 'playlist' ? (
            <div className="flex-1 h-full overflow-y-auto scrollbar-hide" style={{ background: '#0f0f0f' }}>
              {currentPlaylist.length === 0 ? (
                <div className="text-center py-8">
                  <i className="fas fa-film text-2xl mb-2" style={{ color: '#6b7280' }}></i>
                  <p className="text-sm" style={{ color: '#6b7280' }}>Videos will appear here</p>
                </div>
) : currentPlaylist.map((video, index) => (
                <div key={video.id || index} onClick={() => playVideo(index)} className="flex gap-2 p-2 cursor-pointer mb-1 mx-1 rounded-lg transition-transform duration-200 hover:scale-105 hover:shadow-lg" style={{ background: index === currentVideoIndex ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                  <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0">
                    <img src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
                    {index === currentVideoIndex && isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <i className="fas fa-play text-white text-xs"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 mt-1">
                    <h4 className="text-xs line-clamp-2" style={{ color: '#f3f4f6' }}>{video.title}</h4>
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: '#9ca3af' }}>{video.channelTitle || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-hidden min-h-0 h-full">
              {currentVideoId ? <LiveChat videoId={currentVideoId} /> : (
                <div className="flex items-center justify-center h-full p-4">
                  <p className="text-sm" style={{ color: '#6b7280' }}>Play a video to use live chat</p>
                </div>
              )}
            </div>
          )}
        </aside>
      )}

      {!isFullscreen && !immersiveMode && (
      <aside className={`hidden md:flex w-80 border-l flex-col overflow-hidden order-2 md:order-2 transition-transform duration-300 ${playerPanelOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
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
              <div key={video.id || index} onClick={() => playVideo(index)} className="flex gap-2 p-2 cursor-pointer mb-1 mx-1 rounded-lg" style={{ background: index === currentVideoIndex ? 'var(--bg-hover)' : 'transparent' }}>
                <div className="relative w-24 h-14 rounded overflow-hidden flex-shrink-0">
                  <img src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
                  {index === currentVideoIndex && isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <i className="fas fa-play text-white text-xs"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 mt-1">
                  <h4 className="text-xs line-clamp-2" style={{ color: 'var(--text-main)' }}>{video.title}</h4>
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
          <div className="flex-1 overflow-hidden h-0 min-h-0">
            {currentVideoId ? <LiveChat videoId={currentVideoId} /> : (
              <div className="flex items-center justify-center h-full p-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Play a video to use live chat</p>
              </div>
            )}
          </div>
        )}
      </aside>
      )}
    </div>
  );
}

export default PlayerPage;
