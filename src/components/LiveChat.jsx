import { useState, useEffect, useRef } from 'react';

function LiveChat({ videoId }) {
  const [chatUrl, setChatUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (videoId) {
      loadLiveChat();
    }
  }, [videoId]);

  const loadLiveChat = async () => {
    setLoading(true);
    setError(null);
    
    const embedUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${window.location.hostname}`;
    setChatUrl(embedUrl);
    setLoading(false);
  };

  const refreshChat = () => {
    if (iframeRef.current) {
      iframeRef.current.src = chatUrl + '&t=' + Date.now();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-card)' }}>
      <div className="p-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <i className="fas fa-comments text-red-500"></i>
          Live Chat
        </h3>
        <button
          onClick={refreshChat}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-muted)' }}
          title="Refresh chat"
        >
          <i className="fas fa-redo text-xs"></i>
        </button>
      </div>

      <div className="flex-1 relative" style={{ background: 'var(--bg-main)' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-2xl mb-2" style={{ color: 'var(--text-muted)' }}></i>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading chat...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <i className="fas fa-exclamation-circle text-2xl mb-2 text-red-500"></i>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
              <button
                onClick={refreshChat}
                className="mt-2 px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'var(--accent-color)', color: 'white' }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : chatUrl ? (
          <iframe
            ref={iframeRef}
            src={chatUrl}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube Live Chat"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <i className="fas fa-comments text-2xl mb-2" style={{ color: 'var(--text-muted)' }}></i>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No live chat available for this video
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveChat;
