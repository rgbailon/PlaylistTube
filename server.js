import express from 'express';
import cors from 'cors';
import { Client } from 'pg';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/pg/test', async (req, res) => {
  const { user, password, host, port, database } = req.body;
  const client = new Client({ user, password, host, port, database });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/pg/init', async (req, res) => {
  const { user, password, host, port, database } = req.body;
  const client = new Client({ user, password, host, port, database });
  try {
    await client.connect();
    await client.query(`
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
    `);
    await client.end();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/pg/save', async (req, res) => {
  const { user, password, host, port, database, playlist, type } = req.body;
  const client = new Client({ user, password, host, port, database });
  try {
    await client.connect();
    const table = type === 'video' ? 'videos' : type === 'live' ? 'lives' : type === 'course' ? 'courses' : 'playlists';
    await client.query(
      `INSERT INTO ${table} (id, title, description, thumbnail, video_count, user_id, video_id, position, channel_id, channel_title)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       thumbnail = EXCLUDED.thumbnail,
       video_count = EXCLUDED.video_count,
       video_id = EXCLUDED.video_id,
       position = EXCLUDED.position`,
      [playlist.id, playlist.title, playlist.description, playlist.thumbnail, playlist.videoCount || playlist.video_count,
       playlist.userId || user, playlist.videoId || playlist.video_id, playlist.position, playlist.channelId, playlist.channelTitle]
    );
    await client.end();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/pg/items', async (req, res) => {
  const { user, password, host, port, database, type } = req.query;
  const client = new Client({ user, password, host, port, database });
  try {
    await client.connect();
    const table = type === 'video' ? 'videos' : type === 'live' ? 'lives' : type === 'course' ? 'courses' : 'playlists';
    const { rows } = await client.query(`SELECT * FROM ${table} WHERE user_id = $1`, [user]);
    await client.end();
    res.json({ success: true, items: rows });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, items: [] });
  }
});

app.post('/pg/delete', async (req, res) => {
  const { user, password, host, port, database, id, type } = req.body;
  const client = new Client({ user, password, host, port, database });
  try {
    await client.connect();
    const table = type === 'video' ? 'videos' : type === 'live' ? 'lives' : type === 'course' ? 'courses' : 'playlists';
    await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    await client.end();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/pg/exists', async (req, res) => {
  const { user, password, host, port, database, id, type } = req.query;
  const client = new Client({ user, password, host, port, database });
  try {
    await client.connect();
    const table = type === 'video' ? 'videos' : type === 'live' ? 'lives' : type === 'course' ? 'courses' : 'playlists';
    const { rows } = await client.query(`SELECT id FROM ${table} WHERE id = $1`, [id]);
    await client.end();
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`DB Proxy running on port ${PORT}`));