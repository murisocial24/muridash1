export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = process.env.TOC_ACCESS_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'TOC_ACCESS_TOKEN não configurado no servidor.' });
  }

  // Testar se o token ainda é válido
  try {
    const testRes = await fetch('https://api40.toconline.pt/api/customers?page[size]=1', {
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (testRes.status === 401) {
      // Token expirado — tentar renovar com refresh token
      const refreshToken = process.env.TOC_REFRESH_TOKEN;
      const clientId = process.env.TOC_CLIENT_ID;
      const clientSecret = process.env.TOC_CLIENT_SECRET;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Token expirado e refresh token não disponível.' });
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      params.append('scope', 'commercial');

      const refreshRes = await fetch('https://app40.toconline.pt/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: params.toString(),
      });

      const refreshData = await refreshRes.json();
      if (refreshData.access_token) {
        return res.status(200).json({ access_token: refreshData.access_token });
      } else {
        return res.status(401).json({ error: 'Não foi possível renovar o token.', details: refreshData });
      }
    }

    // Token válido
    return res.status(200).json({ access_token: token });

  } catch (err) {
    return res.status(500).json({ error: 'Erro ao verificar token', details: err.message });
  }
}
