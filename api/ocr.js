// api/ocr.js
export default async function handler(req, res) {
  // Permite que seu GitHub Pages acesse essa função (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { base64Data, mimeType } = req.body;
  // A chave fica salva em uma variável de ambiente protegida (ninguém vê)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave da API não configurada no servidor.' });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = "Você é um leitor de expressões matemáticas. Identifique a equação do primeiro grau escrita na imagem (mesmo que a lápis ou manuscrita). " +
                   "Responda ESTRITAMENTE e APENAS a equação em formato de texto legível (exemplo: 2x + 5 = 15 ou 3(x-2)=9). " +
                   "Não use markdown, não use LaTeX delimitado por $, não use explicações, apenas a equação.";

    const body = {
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
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const equacao = texto.trim().replace(/`/g, '').replace(/\$/g, '');

    return res.status(200).json({ equacao });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
