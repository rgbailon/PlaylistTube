export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    const text = await response.text();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/javascript');
    
    return res.status(200).send(text);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
}
