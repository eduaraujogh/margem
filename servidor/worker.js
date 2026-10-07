// Margem: servidor que transforma um PDF em material de estudo usando o Gemini.
// Roda no Cloudflare Workers (plano gratuito). A chave da IA fica aqui, nunca no app.
//
// Segredos a cadastrar em Settings > Variables and Secrets (tipo "Secret"):
//   GEMINI_API_KEY  chave criada no Google AI Studio
//   CODIGO          código de acesso que a pessoa digita no app (qualquer frase)
//
// O app manda o PDF em base64 (texto puro) para POST /gerar com o cabeçalho X-Margem-Codigo.

const ORIGENS = ["https://eduaraujogh.github.io", "http://localhost:8765"];
const MODELOS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-lite-latest"]; // tenta nesta ordem
const MAX_BASE64 = 14 * 1024 * 1024; // cerca de 10 MB de PDF

const PROMPT = `Você prepara material de estudo para uma estudante universitária brasileira a partir do PDF anexo (slides ou texto de uma aula).

REGRAS
1. Use somente o que está no PDF para conceitos, definições, autores, números e exemplos. Não acrescente conhecimento de fora.
2. Todo item traz o campo "paginas": os números das páginas do PDF em que ele se apoia (inteiros; a primeira página do arquivo é 1). Cite só páginas em que o conteúdo realmente aparece. Leia também o texto que está dentro de imagens e slides.
3. Ignore capas, calendários, dados pessoais do professor, links e avisos.
4. Escreva em português do Brasil, em linguagem simples e direta. Não use travessão.
5. Divida o conteúdo em 2 a 6 tópicos, na ordem em que aparecem no PDF.
6. Em cada tópico:
   - "aprender": 2 a 5 parágrafos curtos que explicam o assunto com outras palavras, sem mudar o sentido.
   - "pontosChave": 3 a 5 frases curtas para memorizar.
   - "pratica": "situacao" é uma situação curta e INVENTADA, em uma empresa ou no dia a dia, que mostra o conceito em uso; "leitura" explica a situação usando o conceito do PDF; "sinais" são 2 a 4 pistas de como reconhecer esse conceito em um caso.
   - "casos": 3 ou 4 questões de múltipla escolha em formato de situação. O cenário é inventado; o conceito cobrado e a resposta certa vêm do PDF. Exatamente 4 alternativas, só uma correta, erradas plausíveis. "correta" é o índice (0 a 3) e deve variar entre as questões. "explicacao" curta, ligando a resposta ao que o PDF diz.
   - "flashcards": 1 ou 2 cartões de definição ("frente" e "verso").
7. "glossario": de 3 a 10 termos que o PDF define.
8. Se o PDF não tiver conteúdo de estudo suficiente, responda {"erro": "motivo em uma frase"}.

Responda apenas com JSON, neste formato:
{"titulo": "título curto do material", "descricao": "uma frase",
 "topicos": [{"titulo": "", "resumo": "uma frase",
   "aprender": [{"texto": "", "paginas": [1]}],
   "pontosChave": [{"texto": "", "paginas": [1]}],
   "pratica": {"situacao": "", "leitura": "", "sinais": [""], "paginas": [1]},
   "casos": [{"enunciado": "", "alternativas": ["", "", "", ""], "correta": 0, "explicacao": "", "paginas": [1]}],
   "flashcards": [{"frente": "", "verso": "", "paginas": [1]}]}],
 "glossario": [{"termo": "", "definicao": "", "paginas": [1]}]}`;

const PREFIXO = '{"contents":[{"parts":[{"inline_data":{"mime_type":"application/pdf","data":"';
const SUFIXO = '"}},{"text":' + JSON.stringify(PROMPT) + '}]}],"generationConfig":{"responseMimeType":"application/json","temperature":0.3,"maxOutputTokens":24000}}';

function cabecalhos(req) {
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGENS.includes(o) ? o : ORIGENS[0],
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Margem-Codigo",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
const json = (req, status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cabecalhos(req) } });

// o app manda o código com encodeURIComponent; maiúsculas e espaços nas pontas não contam
const igual = v => { let t = v || ""; try { t = decodeURIComponent(t); } catch (e) {} return t.trim().toLowerCase(); };

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cabecalhos(req) });
    const url = new URL(req.url);
    if (req.method === "GET") return json(req, 200, { ok: true, servico: "margem", configurado: !!(env.GEMINI_API_KEY && env.CODIGO) });
    if (req.method !== "POST" || url.pathname !== "/gerar") return json(req, 404, { ok: false, erro: "rota" });
    if (!env.GEMINI_API_KEY || !env.CODIGO) return json(req, 500, { ok: false, erro: "config", msg: "Servidor sem chave ou sem código cadastrados." });
    if (igual(req.headers.get("X-Margem-Codigo")) !== igual(env.CODIGO)) return json(req, 401, { ok: false, erro: "codigo", msg: "Código de acesso incorreto." });

    const pdf = await req.arrayBuffer();
    if (pdf.byteLength < 100) return json(req, 400, { ok: false, erro: "vazio", msg: "Nenhum PDF recebido." });
    if (pdf.byteLength > MAX_BASE64) return json(req, 413, { ok: false, erro: "tamanho", msg: "PDF grande demais (máximo de 10 MB)." });

    // monta o pedido sem decodificar o PDF: prefixo + base64 recebido + sufixo
    const corpo = new Blob([PREFIXO, pdf, SUFIXO]);
    let ultimo = "";
    for (const modelo of MODELOS) {
      let r;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" },
          body: corpo,
        });
      } catch (e) { ultimo = `${modelo}: falha de rede`; continue; }
      if ([429, 500, 503, 404].includes(r.status)) { ultimo = `${modelo}: ${r.status}`; continue; }
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) return json(req, 502, { ok: false, erro: "ia", msg: d?.error?.message || `A IA respondeu ${r.status}.` });
      const cand = d.candidates?.[0];
      const texto = (cand?.content?.parts || []).filter(p => !p.thought && p.text).map(p => p.text).join("");
      if (!texto) return json(req, 502, { ok: false, erro: "ia-vazia", msg: `A IA não devolveu conteúdo (${cand?.finishReason || d.promptFeedback?.blockReason || "sem motivo"}).` });
      return json(req, 200, { ok: true, modelo, fim: cand.finishReason, texto, uso: d.usageMetadata });
    }
    return json(req, 503, { ok: false, erro: "ocupada", msg: "A IA gratuita está sobrecarregada agora. Tente de novo em alguns minutos.", detalhe: ultimo });
  },
};
