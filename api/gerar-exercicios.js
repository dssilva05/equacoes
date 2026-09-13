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

  const { temas, quantidade, modalidade } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' });
  }

  const qtd = parseInt(quantidade, 10) || 5;
  const ehProblema = modalidade === 'problema';

  const prompt = `Você é um professor de matemática especialista em avaliações de Ensino Fundamental II, Médio e processos seletivos (CEFET-MG, COLTEC-UFMG, IFs).
Gere exatamente ${qtd} questões abordando os temas: ${temas && temas.length ? temas.join(', ') : 'Equações do 1º Grau'}.

${ehProblema ? `
MODALIDADE: SITUAÇÕES-PROBLEMA CONTEXTUALIZADAS (Estilo CEFET/COLTEC/IFs).
- Crie problemas contextualizados com situações reais, geometria ou finanças.
- Campo "origem": referência inspiradora (ex: "Adaptada - CEFET-MG", "Estilo COLTEC", "Problema Prático").
- Campo "enunciado": problema completo com a pergunta final.
- Campo "expressao": a equação ou expressão que modela e soluciona o problema (ex: "3x + 12 = 42", "x^2 + 7x - 60 = 0" ou "(x + 3)^2 = 49").
` : `
MODALIDADE: EXERCÍCIOS DIRETOS DE FIXAÇÃO.
- Enunciados diretos (ex: "Resolva a equação:", "Desenvolva o produto notável:").
- Campo "origem": "Fixação Algébrica".
- Campo "expressao": a expressão direta a ser calculada.
`}

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO E TIPOGRAFIA:
1. NUNCA use o caractere cifrão isolado ($) para valores monetários. Em vez de "R$ 42,00", escreva "reais" por extenso (ex: "42 reais" ou "12 reais") para não quebrar o motor KaTeX.
2. Em unidades de área ou volume no enunciado, use potências normais ou notação LaTeX explícita entre parênteses, por exemplo "60 m²" (usando o caractere de quadrado ²) e nunca "m^2" solto no texto.
3. Use apenas números inteiros e frações amigáveis (evite dízimas infinitas).
4. No campo "expressao", use barras simples para frações (ex: 2/3 + 3/4) e circunflexo para potências (ex: x^2, (x+2)^3).
5. O campo "gabarito" deve ser objetivo (ex: "x = 10", "10 reais", "x' = 5, x'' = -12").`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          response_schema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "INTEGER" },
                tema: { type: "STRING" },
                origem: { type: "STRING" },
                enunciado: { type: "STRING" },
                expressao: { type: "STRING" },
                gabarito: { type: "STRING" }
              },
              required: ["id", "tema", "origem", "enunciado", "expressao", "gabarito"]
            }
          },
          temperature: 0.3
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Erro na API do Gemini' });
    }

    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonMatch) rawText = jsonMatch[0];

    const exercicios = JSON.parse(rawText);
    return res.status(200).json({ exercicios });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao processar lista: ' + err.message });
  }
}
