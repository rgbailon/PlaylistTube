export default async function handler(req, res) {
  const { q } = req.query;
  
  if (!q) {
    return res.status(200).json([]);
  }
  
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}`;
    const response = await fetch(url);
    const text = await response.text();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(text);
  } catch (error) {
    console.error('Suggestion proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
}
