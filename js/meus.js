// Materiais enviados pela estudante. Ficam guardados no aparelho (IndexedDB) e são somados ao
// conteúdo do app como novos módulos. O texto de estudo deles é criado por IA (ver servidor/worker.js).
import { D } from "./data.js";
import { reiniciarBusca } from "./busca.js";

const BANCO = "margem", LOJA = "materiais";

function abrir() {
  return new Promise((ok, erro) => {
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA, { keyPath: "id" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
}
async function tx(modo, fn) {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const t = db.transaction(LOJA, modo);
    const req = fn(t.objectStore(LOJA));
    t.oncomplete = () => { db.close(); ok(req?.result); };
    t.onerror = t.onabort = () => { db.close(); erro(t.error); };
  });
}

export async function carregarMeus() {
  try {
    const recs = await tx("readonly", s => s.getAll());
    recs.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
    for (const r of recs) integrar(r);
  } catch (e) { console.warn("Materiais enviados indisponíveis neste navegador.", e); }
}
export async function salvar(rec) { await tx("readwrite", s => s.put(rec)); }
export async function remover(id) { await tx("readwrite", s => s.delete(id)); }

const curto = s => (s.length > 22 ? s.slice(0, 21).trimEnd() + "…" : s);

// Soma um material salvo ao conteúdo em memória. Devolve o id do primeiro tópico.
export function integrar(rec) {
  const g = rec.gerado, mid = rec.id;
  const modId = `mod${D.modulos.length + 1}`;
  const f = ps => ps.map(n => `${mid}-p${n}`);

  const mat = {
    id: mid, titulo: g.titulo, tipo: "Enviado por você", curto: curto(g.titulo), paginas: rec.paginas,
    ordem: Math.max(0, ...D.materiais.map(m => m.ordem)) + 1,
    arquivo: URL.createObjectURL(rec.pdf), meu: true, modulo: modId, nome: rec.nome, criadoEm: rec.criadoEm,
  };
  D.materiais.push(mat); D.mat[mid] = mat;

  rec.textos.forEach((texto, i) => {
    const p = { id: `${mid}-p${i + 1}`, material: mid, pagina: i + 1, origem: texto ? "texto" : "imagem", texto };
    D.paginas.push(p); D.pag[p.id] = p;
  });

  const mod = { id: modId, titulo: g.titulo, descricao: g.descricao, aulas: "Enviado por você", meu: true, material: mid };
  D.modulos.push(mod); D.mod[modId] = mod; D.topicosDo[modId] = [];

  const termos = g.glossario.map((x, i) => ({ id: `${mid}-g${i + 1}`, termo: x.termo, definicao: x.definicao, fontes: f(x.paginas), ia: true, _p: x.paginas }));
  for (const x of termos) { D.glossario.push(x); D.termo[x.id] = x; }

  g.topicos.forEach((t, i) => {
    const tid = `${mid}-t${i + 1}`;
    const pags = new Set([...t.aprender, ...t.pontosChave].flatMap(b => b.paginas));
    const top = {
      id: tid, modulo: modId, titulo: t.titulo, resumo: t.resumo, ia: true, relacionados: [],
      aprender: t.aprender.map(b => ({ texto: b.texto, fontes: f(b.paginas) })),
      pontosChave: t.pontosChave.map(b => ({ texto: b.texto, fontes: f(b.paginas) })),
      termos: termos.filter(x => !x._usado && x._p.some(n => pags.has(n))).map(x => (x._usado = true, x.id)),
    };
    if (t.pratica) top.pratica = { situacao: t.pratica.situacao, leitura: t.pratica.leitura, sinais: t.pratica.sinais, fontes: f(t.pratica.paginas) };
    D.topicos.push(top); D.top[tid] = top; D.topicosDo[modId].push(top); D.questoesDo[tid] = [];
    const add = q => { D.questoes.push(q); D.q[q.id] = q; D.questoesDo[tid].push(q); };
    t.casos.forEach((c, k) => add({ id: `${mid}-c${i + 1}-${k + 1}`, topico: tid, tipo: "multipla", caso: true, criado: true, ia: true, enunciado: c.enunciado, alternativas: c.alternativas, correta: c.correta, explicacao: c.explicacao, fontes: f(c.paginas) }));
    t.flashcards.forEach((c, k) => add({ id: `${mid}-f${i + 1}-${k + 1}`, topico: tid, tipo: "flashcard", ia: true, frente: c.frente, verso: c.verso, fontes: f(c.paginas) }));
  });
  for (const x of termos) { delete x._p; delete x._usado; }
  reiniciarBusca();
  return `${mid}-t1`;
}

// Confere e limpa o que a IA devolveu. Tudo o que não aponta para uma página real do PDF é descartado.
// Devolve { gerado, descartados } ou lança Error com mensagem para a estudante.
export function normalizar(bruto, nPaginas, nomeArquivo = "") {
  let descartados = 0;
  const txt = v => (typeof v === "string" ? v.replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim() : "");
  const pags = v => [...new Set((Array.isArray(v) ? v : [v]).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= nPaginas))].sort((a, b) => a - b).slice(0, 4);
  const lista = v => (Array.isArray(v) ? v : []);
  const manter = (arr, fn) => lista(arr).map(x => { const r = x && typeof x === "object" ? fn(x) : null; if (!r) descartados++; return r; }).filter(Boolean);
  const bloco = b => { const texto = txt(b.texto), paginas = pags(b.paginas); return texto && paginas.length ? { texto, paginas } : null; };

  if (!bruto || typeof bruto !== "object") throw new Error("A IA devolveu uma resposta que não consegui ler. Tente de novo.");
  if (bruto.erro && !lista(bruto.topicos).length) throw new Error(`A IA não conseguiu criar o material: ${txt(String(bruto.erro))}`);

  const topicos = manter(bruto.topicos, t => {
    const titulo = txt(t.titulo);
    const aprender = manter(t.aprender, bloco);
    if (!titulo || !aprender.length) return null;
    const pontosChave = manter(t.pontosChave, bloco);
    let pratica = null;
    if (t.pratica && typeof t.pratica === "object") {
      const p = { situacao: txt(t.pratica.situacao), leitura: txt(t.pratica.leitura), sinais: lista(t.pratica.sinais).map(txt).filter(Boolean).slice(0, 5), paginas: pags(t.pratica.paginas) };
      if (p.situacao && p.leitura && p.sinais.length && p.paginas.length) pratica = p; else descartados++;
    }
    const casos = manter(t.casos, c => {
      const alternativas = lista(c.alternativas).map(txt);
      const q = { enunciado: txt(c.enunciado), alternativas, correta: Number(c.correta), explicacao: txt(c.explicacao), paginas: pags(c.paginas) };
      const ok = q.enunciado && q.explicacao && q.paginas.length && alternativas.length === 4 && alternativas.every(Boolean)
        && new Set(alternativas.map(a => a.toLowerCase())).size === 4 && Number.isInteger(q.correta) && q.correta >= 0 && q.correta <= 3;
      return ok ? q : null;
    });
    const flashcards = manter(t.flashcards, c => { const q = { frente: txt(c.frente), verso: txt(c.verso), paginas: pags(c.paginas) }; return q.frente && q.verso && q.paginas.length ? q : null; });
    if (!casos.length && !flashcards.length) return null; // tópico sem nada para praticar
    return { titulo, resumo: txt(t.resumo), aprender, pontosChave, pratica, casos, flashcards };
  });
  if (!topicos.length) throw new Error("A IA não conseguiu montar tópicos com as páginas deste PDF. Tente de novo ou envie outro arquivo.");

  const glossario = manter(bruto.glossario, x => { const r = { termo: txt(x.termo), definicao: txt(x.definicao), paginas: pags(x.paginas) }; return r.termo && r.definicao && r.paginas.length ? r : null; });
  const titulo = txt(bruto.titulo) || nomeArquivo.replace(/\.pdf$/i, "") || "Material enviado";
  return { gerado: { titulo: titulo.slice(0, 80), descricao: txt(bruto.descricao), topicos, glossario }, descartados };
}
