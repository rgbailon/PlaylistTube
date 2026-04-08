import { useState, useEffect, useRef, useCallback } from 'react';

function CastReceiver() {
  const [status, setStatus] = useState('connecting');
  const [serverUrl, setServerUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [error, setError] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const eventSourceRef = useRef(null);
  const serverUrlRef = useRef('');

  const connectToServer = useCallback((server) => {
    setStatus('connecting');
    setError('');
    serverUrlRef.current = server;

    try {
      const url = `${server}/api/cast-events`;
      eventSourceRef.current = new EventSource(url);

      eventSourceRef.current.onopen = () => {
        setStatus('connected');
        console.log('Connected to cast server');
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'play') {
            setVideoUrl(data.url);
            setVideoTitle(data.title || 'Video');
          } else if (data.type === 'pause') {
            const video = document.getElementById('cast-video');
            if (video) video.pause();
          } else if (data.type === 'stop') {
            setVideoUrl('');
            setVideoTitle('');
          }
        } catch (err) {
          console.error('Error parsing cast event:', err);
        }
      };

      eventSourceRef.current.onerror = (err) => {
        console.error('SSE error:', err);
        setStatus('disconnected');
        setError('Connection lost. Trying to reconnect...');
        
        setTimeout(() => {
          if (serverUrlRef.current) {
            connectToServer(serverUrlRef.current);
          }
        }, 3000);
      };
    } catch (err) {
      setError('Failed to connect: ' + err.message);
      setStatus('error');
    }
  }, []);

  const handleManualConnect = () => {
    if (!ipAddress.trim()) return;
    
    const server = ipAddress.startsWith('http') 
      ? ipAddress 
      : `http://${ipAddress}:3000`;
    
    setServerUrl(server);
    connectToServer(server);
  };

  const getLocalIP = async () => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      await pc.createOffer();
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const match = event.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (match) {
            setIpAddress(match[1]);
          }
          pc.close();
        }
      };
    } catch (err) {
      console.error('Could not get local IP:', err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const server = params.get('server');
    
    if (server) {
      setServerUrl(server);
      connectToServer(server);
    } else {
      setStatus('waiting');
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectToServer]);

  useEffect(() => {
    getLocalIP();
  }, []);

  if (status === 'waiting' || !serverUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-600 flex items-center justify-center">
            <i className="fas fa-tv text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">PlaylistTube Cast Receiver</h1>
          <p className="text-gray-400 mb-6">Waiting for connection...</p>
          
          <div className="bg-gray-900 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-gray-400 mb-3">
              Enter the laptop IP address shown on the PlaylistTube app:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.x.x:3000"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleManualConnect}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Connect
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Or open this URL in your browser: {window.location.href}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-600 flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connection Error</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => {
              setStatus('waiting');
              setServerUrl('');
            }}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
          <span className="text-white text-sm">
            {status === 'connected' ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        <div className="text-gray-400 text-sm">
          PlaylistTube Cast
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center">
        {videoUrl ? (
          <video
            id="cast-video"
            src={videoUrl}
            controls
            autoPlay
            className="max-h-screen w-full"
            onError={() => setError('Video playback error')}
          />
        ) : (
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
              <i className="fas fa-play text-4xl text-gray-600"></i>
            </div>
            <h2 className="text-xl text-white font-medium mb-2">Ready to Cast</h2>
            <p className="text-gray-400">
              Play a video on your laptop and it will appear here
            </p>
          </div>
        )}
      </div>

      {/* Video Info */}
      {videoTitle && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4">
          <h3 className="text-white font-medium truncate">{videoTitle}</h3>
        </div>
      )}
    </div>
  );
}

export default CastReceiver;
