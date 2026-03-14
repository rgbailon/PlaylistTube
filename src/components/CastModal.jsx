import { useState, useEffect } from 'react';

function CastModal({ isOpen, onClose, onConnect, currentVideo }) {
  const [mode, setMode] = useState('menu');
  const [devices, setDevices] = useState([]);
  const [manualIp, setManualIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [localIp, setLocalIp] = useState('');

  useEffect(() => {
    if (isOpen && mode === 'discover') {
      discoverDevices();
      getLocalIP();
    }
    if (isOpen && mode === 'projector') {
      getLocalIP();
    }
  }, [isOpen, mode]);

  const getLocalIP = async () => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const match = event.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (match) {
            setLocalIp(match[1]);
          }
          pc.close();
        }
      };
      pc.createOffer();
    } catch (err) {
      console.error('Could not get local IP:', err);
    }
  };

  const discoverDevices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dlnas');
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.log('DLNA discovery not available');
    }
    setLoading(false);
  };

  const handleManualConnect = () => {
    if (!manualIp.trim()) return;
    const url = manualIp.startsWith('http') ? manualIp : `http://${manualIp}`;
    onConnect(url);
    onClose();
  };

  const handleDeviceSelect = (device) => {
    onConnect(device.url);
    onClose();
  };

  const handleYouTubeDirect = () => {
    if (currentVideo?.id) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${currentVideo.id}`;
      window.open(youtubeUrl, '_blank');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose}></div>
      
      <div className="relative bg-[var(--bg-card)] rounded-xl p-6 w-[90%] max-w-md border border-[var(--border-color)] shadow-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
          <i className="fas fa-times"></i>
        </button>

        <h2 className="text-xl font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
          <i className="fas fa-desktop text-blue-500"></i>
          Cast to Device
        </h2>

        {currentVideo?.id && (
          <div className="mb-4 p-3 bg-blue-600/20 rounded-lg border border-blue-500/30">
            <p className="text-sm text-blue-400">
              <i className="fas fa-video mr-2"></i>
              {currentVideo.title?.substring(0, 40)}...
            </p>
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-3">
            <button
              onClick={handleYouTubeDirect}
              disabled={!currentVideo?.id}
              className="w-full p-4 rounded-lg bg-[var(--bg-hover)] hover:bg-red-600/20 border border-[var(--border-color)] hover:border-red-500 transition flex items-center gap-3 disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                <i className="fab fa-youtube text-red-500 text-xl"></i>
              </div>
              <div className="text-left">
                <div className="font-medium text-[var(--text-main)]">Open YouTube</div>
                <div className="text-xs text-[var(--text-muted)]">Opens video in new tab</div>
              </div>
            </button>

            <button
              onClick={() => setMode('projector')}
              className="w-full p-4 rounded-lg bg-[var(--bg-hover)] hover:bg-green-600/20 border border-[var(--border-color)] hover:border-green-500 transition flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                <i className="fas fa-tv text-green-500"></i>
              </div>
              <div className="text-left">
                <div className="font-medium text-[var(--text-main)]">Cast to Projector/TV</div>
                <div className="text-xs text-[var(--text-muted)]">Open YouTube on projector browser</div>
              </div>
            </button>

            <button
              onClick={() => setMode('discover')}
              className="w-full p-4 rounded-lg bg-[var(--bg-hover)] hover:bg-blue-600/20 border border-[var(--border-color)] hover:border-blue-500 transition flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <i className="fas fa-search text-blue-500"></i>
              </div>
              <div className="text-left">
                <div className="font-medium text-[var(--text-main)]">Scan for Devices</div>
                <div className="text-xs text-[var(--text-muted)]">Find DLNA devices on network</div>
              </div>
            </button>

            <button
              onClick={() => setMode('manual')}
              className="w-full p-4 rounded-lg bg-[var(--bg-hover)] hover:bg-purple-600/20 border border-[var(--border-color)] hover:border-purple-500 transition flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                <i className="fas fa-keyboard text-purple-500"></i>
              </div>
              <div className="text-left">
                <div className="font-medium text-[var(--text-main)]">Enter Projector IP</div>
                <div className="text-xs text-[var(--text-muted)]">Manual connection</div>
              </div>
            </button>
          </div>
        )}

        {mode === 'projector' && (
          <div>
            <button onClick={() => setMode('menu')} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] mb-3">
              <i className="fas fa-arrow-left mr-1"></i> Back
            </button>

            <div className="bg-[var(--bg-hover)] rounded-lg p-4 mb-4">
              <h3 className="font-medium text-[var(--text-main)] mb-2">Quick Steps:</h3>
              <ol className="text-sm text-[var(--text-muted)] space-y-2">
                <li className="flex gap-2"><span className="text-green-500">1.</span> Make sure projector is on same WiFi as laptop</li>
                <li className="flex gap-2"><span className="text-green-500">2.</span> Open browser on projector</li>
                <li className="flex gap-2"><span className="text-green-500">3.</span> Go to: <span className="text-blue-400">youtube.com</span></li>
                <li className="flex gap-2"><span className="text-green-500">4.</span> Play the same video here</li>
              </ol>
            </div>

            <button
              onClick={handleYouTubeDirect}
              disabled={!currentVideo?.id}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <i className="fab fa-youtube"></i>
              Open YouTube
            </button>
          </div>
        )}

        {mode === 'discover' && (
          <div>
            <button onClick={() => setMode('menu')} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] mb-3">
              <i className="fas fa-arrow-left mr-1"></i> Back
            </button>

            <button onClick={discoverDevices} disabled={loading} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 mb-4">
              {loading ? 'Scanning...' : 'Scan for Devices'}
            </button>

            {devices.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {devices.map((device, i) => (
                  <button key={i} onClick={() => handleDeviceSelect(device)} className="w-full p-3 rounded-lg bg-[var(--bg-hover)] hover:bg-blue-600/20 border border-[var(--border-color)] text-left flex items-center gap-3">
                    <i className="fas fa-tv text-gray-400"></i>
                    <span className="text-[var(--text-main)]">{device.name || 'Unknown Device'}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">No devices found</p>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <div>
            <button onClick={() => setMode('menu')} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] mb-3">
              <i className="fas fa-arrow-left mr-1"></i> Back
            </button>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-[var(--text-muted)] block mb-1">Projector IP Address</label>
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="192.168.1.100:3000"
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-main)] border border-[var(--border-color)] focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button onClick={handleManualConnect} disabled={!manualIp.trim()} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                Connect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CastModal;
