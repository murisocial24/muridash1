export default async function handler(req, res) {
  const code = req.method === 'GET' ? req.query.code : req.body?.code;

  if (!code) {
    return res.status(400).json({ error: 'Código em falta' });
  }

  const clientId = process.env.TOC_CLIENT_ID;
  const clientSecret = process.env.TOC_CLIENT_SECRET;
  const oauthUrl = 'https://app40.toconline.pt/oauth';
  const redirectUri = 'https://oauth.pstmn.io/v1/callback';

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('scope', 'commercial');
    params.append('redirect_uri', redirectUri);

    const tokenRes = await fetch(`${oauthUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    const text = await tokenRes.text();
    let data;
    try { data = JSON.parse(text); } 
    catch { return res.status(500).json({ error: 'Resposta inválida', raw: text.slice(0, 300) }); }

    if (data.access_token) {
      // Devolve o token em formato legível
      return res.status(200).send(`
        <html><body style="font-family:monospace;padding:20px;background:#0a0a0f;color:#22c55e;">
        <h2 style="color:#a78bfa">✅ Token obtido com sucesso!</h2>
        <p style="color:#e8e8f0">Copia este access_token e guarda-o no Vercel como <strong>TOC_ACCESS_TOKEN</strong>:</p>
        <textarea style="width:100%;height:80px;background:#1c1c27;color:#22c55e;border:1px solid #2a2a3a;padding:10px;font-size:13px;border-radius:8px">${data.access_token}</textarea>
        <p style="color:#6b6b80;margin-top:10px">Refresh token (guarda também como TOC_REFRESH_TOKEN):</p>
        <textarea style="width:100%;height:60px;background:#1c1c27;color:#6b6b80;border:1px solid #2a2a3a;padding:10px;font-size:13px;border-radius:8px">${data.refresh_token || 'não disponível'}</textarea>
        <p style="color:#6b6b80;margin-top:10px">Expira em: ${Math.round((data.expires_in || 0) / 86400)} dias</p>
        </body></html>
      `);
    } else {
      return res.status(400).json({ error: 'Token não recebido', details: data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
