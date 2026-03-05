import { useApp } from '../App';

function PrivacyPage() {
  const { quota } = useApp();
  const maxQuota = 10000;
  const quotaPercent = Math.min((quota / maxQuota) * 100, 100);

  return (
    <div 
      className="h-[calc(100vh-48px)] overflow-y-auto pb-16 md:pb-0" 
      style={{ background: 'var(--bg-main)' }}
    >
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div 
          className="glass rounded-2xl p-6 md:p-10 shadow-sm border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-center mb-8 md:mb-10">
            <div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-sm"
              style={{ background: '#eff6ff', color: '#2563eb' }}
            >
              <i className="fas fa-shield-alt text-3xl"></i>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
              Privacy & Security
            </h2>
            <p style={{ color: 'var(--text-muted)' }} className="mt-2">
              Simple, transparent, and secure by design.
            </p>
          </div>

          <div className="space-y-6">
            <div 
              className="rounded-xl p-5 md:p-6"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <div className="flex items-start gap-4">
                <i className="fas fa-lock text-xl mt-1" style={{ color: '#16a34a' }}></i>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: '#166534' }}>
                    Privacy First
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#166534' }}>
                    Currently 100% client-side with no external servers or database. Your 
                    playlists and preferences are stored locally in your browser. Database 
                    integration may be added in the future to enable cloud sync and cross-device 
                    access (will be optional).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className="p-5 rounded-xl border"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              >
                <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <i className="fas fa-hdd" style={{ color: 'var(--text-muted)' }}></i>
                  Saved Locally
                </h4>
                <ul className="text-sm space-y-2" style={{ color: 'var(--text-muted)' }}>
                  <li className="flex items-center gap-2">
                    <i className="fas fa-check text-green-500 text-xs"></i>
                    API Key (Cookies)
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="fas fa-check text-green-500 text-xs"></i>
                    Playlist History
                  </li>
                </ul>
              </div>
              <div 
                className="p-5 rounded-xl border"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              >
                <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <i className="fas fa-chart-line" style={{ color: 'var(--text-muted)' }}></i>
                  Analytics
                </h4>
                <ul className="text-sm space-y-2" style={{ color: 'var(--text-muted)' }}>
                  <li className="flex items-center gap-2">
                    <i className="fas fa-check text-green-500 text-xs"></i>
                    Google Analytics (page views)
                  </li>
                  <li className="flex items-center gap-2">
                    <i className="fas fa-times text-red-400 text-xs"></i>
                    No personal data collected
                  </li>
                </ul>
              </div>
            </div>

            <div 
              className="rounded-xl p-4"
              style={{ background: '#fefce8', border: '1px solid #fef08a' }}
            >
              <div className="flex items-start gap-3">
                <i className="fas fa-info-circle mt-0.5" style={{ color: '#ca8a04' }}></i>
                <div>
                  <h4 className="font-semibold text-sm mb-1" style={{ color: '#a16207' }}>
                    Google Analytics
                  </h4>
                  <p className="text-xs" style={{ color: '#a16207' }}>
                    We use Google Analytics to track page views and usage patterns. This helps us 
                    improve the application. No personal information or API keys are ever shared 
                    with Google.
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="rounded-xl border p-5 md:p-6"
              style={{ background: '#eff6ff', border: '#bfdbfe' }}
            >
              <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1e40af' }}>
                <i className="fas fa-key" style={{ color: '#3b82f6' }}></i>
                About Your API Key
              </h3>
              <div className="space-y-3 text-sm" style={{ color: '#1e3a8a' }}>
                <p>
                  You can remove your API key at any time using the 
                  <span className="font-semibold text-red-500 bg-white px-1.5 py-0.5 rounded border border-red-100 ml-1">
                    Clear
                  </span>
                  button in the settings panel.
                </p>
                <p>
                  Clearing your "Playlist History" 
                  <strong className="font-semibold"> does not </strong>
                  remove your API key.
                </p>
                <div className="pt-3 border-t" style={{ borderColor: '#bfdbfe' }}>
                  <p className="text-xs font-semibold mb-1">
                    <i className="fas fa-user-shield mr-1"></i>
                    Security Recommendation:
                  </p>
                  <p className="text-xs opacity-90">
                    We strongly recommend creating a separate 
                    <strong> "Dummy" Google Account</strong> 
                    to generate your API key. This ensures your primary account remains completely 
                    isolated.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>
                How to get a Key
              </h3>
              <div className="space-y-2 text-sm">
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                >
                  <span className="group-hover:text-blue-700">1. Open Google Cloud Console</span>
                  <i className="fas fa-external-link-alt group-hover:text-blue-400"></i>
                </a>
                <div 
                  className="p-3 rounded-lg border"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                >
                  2. Create Project & Enable "YouTube Data API v3"
                </div>
                <div 
                  className="p-3 rounded-lg border"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                >
                  3. Create Credentials (API Key) & Paste here
                </div>
              </div>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>
                <i className="fas fa-chart-pie mr-2"></i>Quota Usage
              </h3>
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm" style={{ color: 'var(--text-main)' }}>API Quota Used Today</span>
                  <span className="text-sm font-semibold" style={{ color: quotaPercent > 90 ? '#ef4444' : quotaPercent > 70 ? '#f59e0b' : '#22c55e' }}>
                    {quota} / {maxQuota}
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                  <div 
                    className="h-full transition-all duration-300" 
                    style={{ 
                      width: quotaPercent + '%',
                      background: quotaPercent > 90 ? '#ef4444' : quotaPercent > 70 ? '#f59e0b' : '#22c55e'
                    }}
                  ></div>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  YouTube Data API has a daily quota of 10,000 units. Each search costs ~100 units.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center pb-8">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Made by <span className="font-semibold">rogel89</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            This website is for educational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPage;
