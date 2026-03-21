import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'yt_supabase_url';
const SUPABASE_KEY_KEY = 'yt_supabase_key';
const SUPABASE_DB_KEY = 'yt_supabase_connection_string';

export const getStoredSupabaseUrl = () => localStorage.getItem(SUPABASE_URL_KEY) || '';
export const getStoredSupabaseKey = () => localStorage.getItem(SUPABASE_KEY_KEY) || '';
export const getStoredConnectionString = () => localStorage.getItem(SUPABASE_DB_KEY) || '';
export const parseConnectionString = (connStr) => {
  if (!connStr) return null;
  const match = connStr.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\S+)/);
  if (!match) return null;
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
};

export const saveSupabaseConfig = (url, key) => {
  localStorage.setItem(SUPABASE_URL_KEY, url);
  localStorage.setItem(SUPABASE_KEY_KEY, key);
  supabase = null;
  cachedUrl = '';
  cachedKey = '';
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_KEY_KEY);
  supabase = null;
  cachedUrl = '';
  cachedKey = '';
};

let supabase = null;
let cachedUrl = '';
let cachedKey = '';

export const getSupabaseClient = () => {
  const url = getStoredSupabaseUrl();
  const key = getStoredSupabaseKey();
  if (!url || !key) return null;
  if (!supabase || cachedUrl !== url || cachedKey !== key) {
    supabase = createClient(url, key);
    cachedUrl = url;
    cachedKey = key;
  }
  return supabase;
};

export const testConnection = async (url, key) => {
  try {
    const client = createClient(url, key);
    const { error } = await client.from('playlists').select('id').limit(1);
    if (error && error.code !== '42P01') throw error;
    return { success: true, message: 'Connected successfully!' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const initDatabase = async () => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };

  try {
    const { error } = await client.from('playlists').select('id').limit(1);
    if (error && error.code === '42P01') {
      await client.rpc('exec', {
        query: `
          CREATE TABLE IF NOT EXISTS playlists (
            id TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            thumbnail TEXT,
            channel_title TEXT,
            video_count INTEGER DEFAULT 0,
            type TEXT DEFAULT 'playlist',
            user_id TEXT,
            created_at TIMESTAMP DEFAULT NOW()
          );
          CREATE TABLE IF NOT EXISTS videos (
            id TEXT PRIMARY KEY,
            playlist_id TEXT,
            title TEXT,
            description TEXT,
            thumbnail TEXT,
            channel_title TEXT,
            video_id TEXT,
            position INTEGER,
            published_at TEXT,
            view_count INTEGER DEFAULT 0,
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
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const savePlaylist = async (playlist) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };

  const { error } = await client.from('playlists').upsert([{
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    thumbnail: playlist.thumbnail,
    channel_title: playlist.channelTitle,
    video_count: playlist.videoCount || playlist.video_count || (playlist.videos ? playlist.videos.length : 0),
    type: playlist.type || 'playlist',
    user_id: playlist.userId || 'default'
  }], { onConflict: 'id' });
  
  if (error) return { success: false, error: error.message };

  if (playlist.videos && playlist.videos.length > 0) {
    await savePlaylistVideos(playlist.id, playlist.videos);
  }

  return { success: true };
};

export const savePlaylistVideos = async (playlistId, videos) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };

  const videoRecords = videos.map((v, index) => ({
    id: v.id || `${playlistId}_video_${index}`,
    playlist_id: playlistId,
    title: v.title,
    description: v.description || '',
    thumbnail: v.thumbnail,
    channel_title: v.channelTitle || '',
    video_id: v.id,
    position: index,
    published_at: v.publishedAt || '',
    view_count: v.viewCount || 0,
    user_id: 'default'
  }));

  const { error } = await client.from('videos').upsert(videoRecords, { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const saveVideo = async (video) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };

  const { error } = await client.from('videos').upsert([{
    id: video.id,
    playlist_id: video.playlist_id || video.playlistId,
    title: video.title,
    description: video.description,
    thumbnail: video.thumbnail,
    video_id: video.videoId || video.video_id,
    position: video.position,
    user_id: video.userId || 'default'
  }], { onConflict: 'id' });
  
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const saveLive = async (live) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };

  const { error } = await client.from('lives').upsert([{
    id: live.id,
    title: live.title,
    description: live.description,
    thumbnail: live.thumbnail,
    channel_id: live.channelId || live.channel_id,
    channel_title: live.channelTitle || live.channel_title,
    user_id: live.userId || 'default'
  }], { onConflict: 'id' });
  
  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const saveCourse = async (course) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };

  const { error } = await client.from('courses').upsert([{
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    video_count: course.videoCount || course.video_count,
    user_id: course.userId || 'default'
  }], { onConflict: 'id' });
  
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

export const loadFullPlaylistsFromDb = async () => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured', playlists: [] };

  try {
    const { data: playlists, error } = await client.from('playlists').select('*');
    if (error) throw error;
    if (!playlists || playlists.length === 0) return { success: true, playlists: [] };

    const { data: allVideos, error: videosError } = await client.from('videos').select('*');
    if (videosError) throw videosError;

    const videosByPlaylist = {};
    if (allVideos) {
      allVideos.forEach(video => {
        if (!videosByPlaylist[video.playlist_id]) {
          videosByPlaylist[video.playlist_id] = [];
        }
        videosByPlaylist[video.playlist_id].push({
          id: video.video_id,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          channelTitle: video.channel_title,
          publishedAt: video.published_at,
          viewCount: video.view_count,
          position: video.position
        });
      });
    }

    const fullPlaylists = playlists.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      thumbnail: p.thumbnail,
      channelTitle: p.channel_title,
      videoCount: p.video_count,
      type: p.type || 'playlist',
      videos: videosByPlaylist[p.id] || []
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { success: true, playlists: fullPlaylists };
  } catch (err) {
    return { success: false, error: err.message, playlists: [] };
  }
};

export const deletePlaylistWithVideos = async (playlistId) => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Not configured' };

  try {
    await client.from('videos').delete().eq('playlist_id', playlistId);
    await client.from('playlists').delete().eq('id', playlistId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
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
  } catch (err) {
    return false;
  }
};

export const isVideoSavedInDb = async (videoId) => {
  return isPlaylistSavedInDb(videoId, 'video');
};