import { getSupabaseClient } from './database';

export const testSupabaseConnection = async () => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };
  try {
    const { error } = await client.from('playlists').select('id').limit(1);
    if (error) throw error;
    return { success: true, message: 'Connected successfully!' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const initSupabaseDatabase = async () => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };
  try {
    const { error } = await client.rpc('exec', {
      query: `
        CREATE TABLE IF NOT EXISTS playlists (
          id TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          thumbnail TEXT,
          video_count INTEGER DEFAULT 0,
          user_id TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          playlist_id TEXT,
          title TEXT,
          description TEXT,
          thumbnail TEXT,
          video_id TEXT,
          position INTEGER,
          user_id TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lives (
          id TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          thumbnail TEXT,
          channel_id TEXT,
          channel_title TEXT,
          user_id TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          title TEXT,
          description TEXT,
          thumbnail TEXT,
          video_count INTEGER DEFAULT 0,
          user_id TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const savePlaylist = async (playlist) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };
  const { error } = await client.from('playlists').upsert([playlist], { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const saveVideo = async (video) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };
  const { error } = await client.from('videos').upsert([video], { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const saveLive = async (live) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };
  const { error } = await client.from('lives').upsert([live], { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const saveCourse = async (course) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };
  const { error } = await client.from('courses').upsert([course], { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const getAllItems = async (type = null) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured', items: [] };
  try {
    let table;
    switch (type) {
      case 'playlist': table = 'playlists'; break;
      case 'video': table = 'videos'; break;
      case 'live': table = 'lives'; break;
      case 'course': table = 'courses'; break;
      default: table = 'playlists';
    }
    const { data, error } = await client.from(table).select('*');
    if (error) throw error;
    return { success: true, items: data || [] };
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
};

export const deleteItem = async (id, type) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };
  try {
    let table;
    switch (type) {
      case 'playlist': table = 'playlists'; break;
      case 'video': table = 'videos'; break;
      case 'live': table = 'lives'; break;
      case 'course': table = 'courses'; break;
      default: return { success: false, error: 'Unknown type' };
    }
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const isPlaylistSavedInDb = async (playlistId, type) => {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    let table;
    switch (type) {
      case 'playlist': table = 'playlists'; break;
      case 'video': table = 'videos'; break;
      case 'live': table = 'lives'; break;
      case 'course': table = 'courses'; break;
      default: return false;
    }
    const { data } = await client.from(table).select('id').eq('id', playlistId).single();
    return !!data;
  } catch {
    return false;
  }
};

export const isVideoSavedInDb = async (videoId) => {
  return isPlaylistSavedInDb(videoId, 'video');
};