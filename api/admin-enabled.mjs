export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const enabled = Boolean(process.env.FIRECRAWL_API_KEY);
  res.status(200).json({ adminEnabled: enabled });
}
