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

  const { temas, quantidade } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' });
  }

  const prompt = `Você é um professor de matemática. Gere exatamente ${quantidade || 5} exercícios para alunos sobre os seguintes temas: ${temas && temas.length ? temas.join(', ') : 'Equações do 1º Grau'}.
Regras:
1. Use números inteiros e amigáveis (sem dízimas periódicas).
2. Para frações e equações fracionárias, use a barra simples (ex: 2x + 5 = 15 ou 2/3 + 3/4).
3. Para potências, use circunflexo (ex: (x + 3)^2 ou x^2 - 9).
4. Retorne EXCLUSIVAMENTE um array de objetos JSON seguindo este esquema:
[
  {
    "id": 1,
    "tema": "Nome do Tema",
    "enunciado": "Resolva a equação:",
    "expressao": "2x + 4 = 12",
    "gabarito": "x = 4"
  }
]`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.3
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro na API do Gemini' });
    }

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Extrai cirurgicamente apenas o que estiver entre os colchetes [...]
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    const exercicios = JSON.parse(rawText);
    return res.status(200).json({ exercicios });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao processar lista de exercícios: ' + err.message });
  }
}
