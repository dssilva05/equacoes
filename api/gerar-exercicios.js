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
  const estiloProblema = modalidade === 'problema';

  let diretrizEstilo = "";
  if (estiloProblema) {
    diretrizEstilo = `
MODALIDADE: SITUAÇÕES-PROBLEMA / CONTEXTUALIZADAS (Estilo CEFET, COLTEC, Institutos Federais e Vestibulares).
- Crie enunciados contextualizados realistas, cotidianos ou interdisciplinares (geometria, física básica, finanças, lógica).
- O enunciado deve contar uma história ou problema que exija modelagem matemática.
- O campo "enunciado" deve conter o problema completo com a pergunta final.
- O campo "expressao" deve ser a equação ou expressão matemática exata que resolve o problema (ex: "2x + 15 = 45" ou "(x + 4)^2 = 100").
- No campo "origem", indique uma referência fictícia ou adaptada inspiradora (ex: "Adaptada - CEFET", "Estilo COLTEC", "Contexto Geometria", "Problema Prático").
`;
  } else {
    diretrizEstilo = `
MODALIDADE: EXERCÍCIOS DIRETOS DE FIXAÇÃO.
- Crie enunciados diretos e claros (ex: "Resolva a equação:", "Desenvolva o produto notável:", "Calcule a operação:").
- O campo "expressao" deve conter a expressão direta a ser calculada.
- No campo "origem", coloque "Fixação Algébrica".
`;
  }

  const prompt = `Você é um professor de matemática especialista em elaboração de questões para processos seletivos de Ensino Médio/Técnico e Fundamental II.
Gere exatamente ${qtd} questões abordando os seguintes temas: ${temas && temas.length ? temas.join(', ') : 'Equações do 1º Grau'}.

${diretrizEstilo}

Critérios Gerais:
1. Trabalhe com números inteiros e frações amigáveis (evite dízimas infinitas ou soluções irracionais complexas).
2. Para equações/frações, utilize notação simples com barra (ex: x/2 + 3 = 7 ou 3/4 + 1/2).
3. Para potências, utilize circunflexo (ex: x^2 - 5x + 6 = 0 ou (x + 3)^2).
4. Retorne EXCLUSIVAMENTE um array JSON de objetos:
[
  {
    "id": 1,
    "tema": "Nome do Tema",
    "origem": "Adaptada - CEFET-MG",
    "enunciado": "Texto contextualizado do problema...",
    "expressao": "equação ou expressão a ser resolvida",
    "gabarito": "resposta final clara"
  }
]`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.4
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
