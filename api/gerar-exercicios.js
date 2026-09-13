// api/gerar-exercicios.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { temas, quantidade } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada.' });
  }

  const prompt = `Crie uma lista de ${quantidade || 5} exercícios de matemática adequados para o Ensino Fundamental II / Médio sobre os seguintes temas: ${temas.join(', ')}.
Gere apenas problemas com coeficientes inteiros e soluções amigáveis.
Retorne a resposta EXCLUSIVAMENTE como um array JSON válido (sem texto fora do JSON, sem markdown delimitando com \`\`\`json):
[
  {
    "id": 1,
    "tema": "Nome do Tema",
    "enunciado": "Resolva a equação:",
    "expressao": "3x - 5 = 10",
    "gabarito": "x = 5"
  }
]`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    // Remove marcações de markdown residuais se o modelo enviar
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const exercicios = JSON.parse(rawText);
    return res.status(200).json({ exercicios });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao gerar exercícios: ' + err.message });
  }
}
