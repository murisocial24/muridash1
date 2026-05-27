export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, claudeKey, tocData } = req.body;

  if (!claudeKey) {
    return res.status(400).json({ error: 'Chave Claude não fornecida' });
  }

  const systemPrompt = `És um assistente empresarial especializado em análise de dados financeiros e de gestão. 
Respondes sempre em português de Portugal, de forma clara e profissional.
Quando recebes dados do TOC Online (ERP), analisas-os e respondes à pergunta do utilizador de forma útil e concisa.
Formata as respostas de forma legível — usa listas, valores monetários com €, datas em formato português.
Se não tiveres dados suficientes para responder, diz claramente o que precisas.
Dados TOC disponíveis nesta sessão: ${tocData ? JSON.stringify(tocData).slice(0, 2000) : 'Nenhum dado carregado ainda.'}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro Claude API' });
    }

    res.status(200).json({ content: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno', details: err.message });
  }
}
