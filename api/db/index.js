import { Client } from 'pg';

const parseConnectionString = (connStr) => {
  connStr = connStr.trim();
  
  if (connStr.startsWith('postgresql://') || connStr.startsWith('postgres://')) {
    const withoutScheme = connStr.replace(/^postgresql:\/\/, '').replace(/^postgres:\/\/, '');
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { connectionString, action, data } = req.body;
    
    if (!connectionString) {
      return res.status(400).json({ success: false, error: 'Connection string required' });
    }

    const config = parseConnectionString(connectionString);
    if (!config) {
      return res.status(400).json({ success: false, error: 'Invalid connection string format' });
    }

    const client = new Client(config);
    await client.connect();

    try {
      switch (action) {
        case 'test': {
          await client.query('SELECT 1');
          return res.status(200).json({ success: true, message: 'Connected successfully!' });
        }

        case 'init': {
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
          return res.status(200).json({ success: true });
        }

        case 'save': {
          const { type, item } = data;
          const table = type === 'video' ? 'videos' : type === 'live' ? 'lives' : type === 'course' ? 'courses' : 'playlists';
          
          const columns = type === 'video' 
            ? '(id, playlist_id, title, description, thumbnail, video_id, position, user_id)'
            : type === 'live'
            ? '(id, title, description, thumbnail, channel_id, channel_title, user_id)'
            : type === 'course'
            ? '(id, title, description, thumbnail, video_count, user_id)'
            : '(id, title, description, thumbnail, video_count, user_id)';
          
          const values = type === 'video'
            ? `($1, $2, $3, $4, $5, $6, $7, $8)`
            : type === 'live'
            ? `($1, $2, $3, $4, $5, $6, $7)`
            : `($1, $2, $3, $4, $5, $6)`;
          
          const params = type === 'video'
            ? [item.id, item.playlist_id, item.title, item.description, item.thumbnail, item.video_id, item.position, item.user_id || 'default']
            : type === 'live'
            ? [item.id, item.title, item.description, item.thumbnail, item.channel_id, item.channel_title, item.user_id || 'default']
            : [item.id, item.title, item.description, item.thumbnail, item.video_count, item.user_id || 'default'];

          await client.query(
            `INSERT INTO ${table} ${columns} VALUES ${values} ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title, description = EXCLUDED.description, thumbnail = EXCLUDED.thumbnail,
             video_count = EXCLUDED.video_count, video_id = EXCLUDED.video_id, position = EXCLUDED.position`,
            params
          );
          return res.status(200).json({ success: true });
        }

        case 'get': {
          const { type } = data;
          const table = type === 'video' ? 'videos' : type === 'live' ? 'lives' : type === 'course' ? 'courses' : 'playlists';
          const { rows } = await client.query(`SELECT * FROM ${table}`);
          return res.status(200).json({ success: true, items: rows });
        }

        case 'delete': {
          const { id, type } = data;
          const table = type === 'video' ? 'videos' : type === 'live' ? 'lives' : type === 'course' ? 'courses' : 'playlists';
          await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
          return res.status(200).json({ success: true });
        }

        case 'exists': {
          const { id, type } = data;
          const table = type === 'video' ? 'videos' : type === 'live' ? 'lives' : type === 'course' ? 'courses' : 'playlists';
          const { rows } = await client.query(`SELECT id FROM ${table} WHERE id = $1`, [id]);
          return res.status(200).json({ exists: rows.length > 0 });
        }

        default:
          return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    } finally {
      await client.end();
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}