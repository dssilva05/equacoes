// api/ocr.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { base64Data, mimeType } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
  }

  try {
    // Usando gemini-2.5-flash estável
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = "Transcreva a equação de 1º grau escrita na imagem. " +
                   "Instruções estritas: " +
                   "1. Use barra / para frações (exemplo: x/2 + 3 = x/3 + 5). " +
                   "2. NÃO utilize LaTeX, cifrões ($), blocos de código nem explicações. " +
                   "3. Responda APENAS com a equação pura em uma única linha.";

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType || "image/jpeg",
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro na API do Gemini' });
    }

    let texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Limpeza de caracteres residuais
    const equacao = texto.replace(/[`$]/g, '').trim();

    if (!equacao) {
      return res.status(422).json({ error: 'A IA não conseguiu identificar caracteres legíveis na imagem.' });
    }

    return res.status(200).json({ equacao });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
