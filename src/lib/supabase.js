import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nkwpwmhdtakpyajjkfqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rd3B3bWhkdGFrcHlhamprZnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNjcxMTYsImV4cCI6MjA2MTc0MzExNn0.bQkG9ZzjTdW0FPH7DeEWwbDpH_3C99_-rMgV6y1_C8Y';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('playlists').select('id').limit(1);
    if (error) throw error;
    return { success: true, message: 'Connected successfully!' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const initSupabaseDatabase = async () => {
  try {
    const { error } = await supabase.rpc('exec', {
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
  const { data, error } = await supabase
    .from('playlists')
    .upsert([playlist], { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const saveVideo = async (video) => {
  const { data, error } = await supabase
    .from('videos')
    .upsert([video], { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const saveLive = async (live) => {
  const { data, error } = await supabase
    .from('lives')
    .upsert([live], { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const saveCourse = async (course) => {
  const { data, error } = await supabase
    .from('courses')
    .upsert([course], { onConflict: 'id' });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
};

export const getAllItems = async (type = null) => {
  try {
    let table;
    switch (type) {
      case 'playlist': table = 'playlists'; break;
      case 'video': table = 'videos'; break;
      case 'live': table = 'lives'; break;
      case 'course': table = 'courses'; break;
      default: table = 'playlists';
    }
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return { success: true, items: data || [] };
  } catch (err) {
    return { success: false, error: err.message, items: [] };
  }
};

export const deleteItem = async (id, type) => {
  try {
    let table;
    switch (type) {
      case 'playlist': table = 'playlists'; break;
      case 'video': table = 'videos'; break;
      case 'live': table = 'lives'; break;
      case 'course': table = 'courses'; break;
      default: return { success: false, error: 'Unknown type' };
    }
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const isPlaylistSavedInDb = async (playlistId, type) => {
  try {
    let table;
    switch (type) {
      case 'playlist': table = 'playlists'; break;
      case 'video': table = 'videos'; break;
      case 'live': table = 'lives'; break;
      case 'course': table = 'courses'; break;
      default: return false;
    }
    const { data } = await supabase.from(table).select('id').eq('id', playlistId).single();
    return !!data;
  } catch (err) {
    return false;
  }
};

export const isVideoSavedInDb = async (videoId) => {
  return isPlaylistSavedInDb(videoId, 'video');
};