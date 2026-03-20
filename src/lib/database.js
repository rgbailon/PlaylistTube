const SUPABASE_DB_KEY = 'yt_supabase_connection_string';

export const getStoredConnectionString = () => {
  return localStorage.getItem(SUPABASE_DB_KEY) || '';
};

export const saveConnectionString = (connStr) => {
  localStorage.setItem(SUPABASE_DB_KEY, connStr);
};

export const clearConnectionString = () => {
  localStorage.removeItem(SUPABASE_DB_KEY);
};

export const parseConnectionString = (connStr) => {
  connStr = connStr.trim();
  
  if (connStr.startsWith('postgresql://') || connStr.startsWith('postgres://')) {
    const withoutScheme = connStr.replace(/^postgresql:\/\//, '').replace(/^postgres:\/\//, '');
    const atIndex = withoutScheme.lastIndexOf('@');
    if (atIndex === -1) return null;
    
    const userPass = withoutScheme.substring(0, atIndex);
    const hostPart = withoutScheme.substring(atIndex + 1);
    
    const colonIndex = userPass.indexOf(':');
    if (colonIndex === -1) return null;
    
    const user = userPass.substring(0, colonIndex);
    const password = userPass.substring(colonIndex + 1);
    
    const slashIndex = hostPart.indexOf('/');
    if (slashIndex === -1) return null;
    
    const hostPort = hostPart.substring(0, slashIndex);
    const database = hostPart.substring(slashIndex + 1);
    
    const portColonIndex = hostPort.lastIndexOf(':');
    if (portColonIndex === -1) return null;
    
    return {
      user,
      password,
      host: hostPort.substring(0, portColonIndex),
      port: parseInt(hostPort.substring(portColonIndex + 1)),
      database,
    };
  }
  
  return null;
};

const getBaseUrl = () => {
  return '/api';
};

export const testConnection = async (connStr) => {
  const config = parseConnectionString(connStr);
  if (!config) {
    return { success: false, error: 'Invalid connection string format' };
  }

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'test' }),
    });
    
    const text = await response.text();
    if (!text) {
      return { success: false, error: 'Empty response from server' };
    }
    
    const data = JSON.parse(text);
    if (!response.ok) {
      return { success: false, error: data.error || 'Connection failed' };
    }
    
    return { success: true, message: 'Connected successfully!' };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to connect' };
  }
};

export const initDatabase = async (connStr) => {
  const config = parseConnectionString(connStr);
  if (!config) return { success: false, error: 'Invalid connection string' };

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'init' }),
    });
    
    const text = await response.text();
    if (!text) {
      return { success: false, error: 'Empty response from server' };
    }
    
    const data = JSON.parse(text);
    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to initialize database' };
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getStoredConnStr = () => {
  return getStoredConnectionString();
};

export const savePlaylist = async (playlist) => {
  const connStr = getStoredConnStr();
  if (!connStr) return { success: false, error: 'No database connection' };

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'save', data: { type: 'playlist', item: playlist } }),
    });
    
    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const saveVideo = async (video) => {
  const connStr = getStoredConnStr();
  if (!connStr) return { success: false, error: 'No database connection' };

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'save', data: { type: 'video', item: video } }),
    });
    
    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const saveLive = async (live) => {
  const connStr = getStoredConnStr();
  if (!connStr) return { success: false, error: 'No database connection' };

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'save', data: { type: 'live', item: live } }),
    });
    
    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const saveCourse = async (course) => {
  const connStr = getStoredConnStr();
  if (!connStr) return { success: false, error: 'No database connection' };

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'save', data: { type: 'course', item: course } }),
    });
    
    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getAllItems = async (type = null) => {
  const connStr = getStoredConnStr();
  if (!connStr) return { success: false, error: 'No database connection', items: [] };

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'get', data: { type: type || 'playlist' } }),
    });
    
    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
};

export const deleteItem = async (id, type) => {
  const connStr = getStoredConnStr();
  if (!connStr) return { success: false, error: 'No database connection' };

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'delete', data: { id, type } }),
    });
    
    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const isPlaylistSavedInDb = async (playlistId, type) => {
  const connStr = getStoredConnStr();
  if (!connStr) return false;

  try {
    const response = await fetch(`${getBaseUrl()}/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString: connStr, action: 'exists', data: { id: playlistId, type } }),
    });
    
    const data = await response.json();
    return data.exists || false;
  } catch (err) {
    return false;
  }
};

export const isVideoSavedInDb = async (videoId) => {
  return isPlaylistSavedInDb(videoId, 'video');
};