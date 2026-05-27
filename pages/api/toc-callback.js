export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`/?toc_error=${error || 'sem_codigo'}`);
  }

  // Redirecionar para a página principal com o código
  return res.redirect(`/?toc_code=${code}`);
}
