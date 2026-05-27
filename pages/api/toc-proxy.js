export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { resource, token, params = {} } = req.body;
  if (!token || !resource) return res.status(400).json({ error: 'Token e resource são obrigatórios' });

  try {
    const queryParams = new URLSearchParams({ 'page[size]': '20', ...params });
    const response = await fetch(`https://api40.toconline.pt/api/${resource}?${queryParams}`, {
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const text = await response.text();
    try {
      res.status(200).json(JSON.parse(text));
    } catch {
      res.status(500).json({ error: 'Resposta inválida do TOC', raw: text.slice(0, 300) });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao chamar TOC API', details: err.message });
  }
}
