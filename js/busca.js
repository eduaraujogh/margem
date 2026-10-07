// Busca local em tópicos, termos, questões e no texto integral dos PDFs
import { D, fonte } from "./data.js";
import { esc } from "./ui.js";

// normaliza caractere a caractere, preservando o comprimento (para destacar no texto original)
const normCh = c => c.normalize("NFD")[0].toLowerCase();
const norm = s => Array.from(s, normCh).join("");
const tokens = s => norm(s).match(/[a-z0-9]+/g) || [];

let idx = null;
export function reiniciarBusca() { idx = null; }
function construir() {
  idx = [];
  const add = (tipo, id, titulo, texto, peso, extra) => {
    const toks = new Set(tokens(titulo + " " + texto));
    idx.push({ tipo, id, titulo, texto, peso, toks, tituloToks: new Set(tokens(titulo)), ...extra });
  };
  for (const t of D.topicos) add("topico", t.id, t.titulo, [t.resumo, ...t.aprender.map(a => a.texto), ...t.pontosChave.map(a => a.texto)].join(" "), 3, { sub: D.mod[t.modulo].titulo });
  for (const g of D.glossario) add("termo", g.id, g.termo, g.definicao, 2.5);
  for (const q of D.questoes) {
    const txt = q.tipo === "multipla" ? `${q.alternativas.join(" ")} ${q.explicacao}` : q.verso;
    add("questao", q.id, q.tipo === "multipla" ? q.enunciado : q.frente, txt, 1.2, { sub: D.top[q.topico].titulo });
  }
  for (const p of D.paginas) if (p.texto) add("pagina", p.id, "", p.texto, 1, { sub: fonte(p.id).rotulo });
}

function dist1(a, b) { // distância de edição até 1
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return d + (a.length - i) + (b.length - j) <= 1;
}

function casa(qt, toks) {
  let melhor = 0;
  for (const t of toks) {
    if (t === qt) return 3;
    if (t.startsWith(qt) && qt.length >= 2) melhor = Math.max(melhor, 2);
    else if (qt.length >= 5 && dist1(qt, t)) melhor = Math.max(melhor, 1);
  }
  return melhor;
}

export function buscar(q, filtro = "") {
  if (!idx) construir();
  const qts = tokens(q).filter(t => t.length >= 2 || /\d/.test(t));
  if (!qts.length) return [];
  const out = [];
  for (const d of idx) {
    if (filtro && d.tipo === "pagina" && !d.id.startsWith(filtro + "-p")) continue;
    if (filtro && d.tipo !== "pagina") continue;
    let s = 0, ok = true;
    for (const qt of qts) {
      const m = casa(qt, d.toks);
      if (!m) { ok = false; break; }
      s += m + (d.tituloToks.has(qt) ? 2 : 0);
    }
    if (ok) out.push({ ...d, score: s * d.peso });
  }
  out.sort((a, b) => b.score - a.score);
  return out.map(r => ({ ...r, trecho: trecho(r.texto, qts) }));
}

// recorta ~180 caracteres em volta da primeira ocorrência e destaca os termos
function trecho(texto, qts, tam = 180) {
  const n = norm(texto);
  let pos = -1;
  for (const qt of qts) { const p = n.search(new RegExp(`\\b${qt}`)); if (p >= 0 && (pos < 0 || p < pos)) pos = p; }
  const ini = Math.max(0, pos < 0 ? 0 : pos - 60);
  let s = texto.slice(ini, ini + tam).replace(/\s+/g, " ");
  return (ini > 0 ? "…" : "") + destacar(s, qts) + (ini + tam < texto.length ? "…" : "");
}

export function destacar(s, qts) {
  const n = norm(s);
  const marcas = [];
  for (const qt of qts) {
    const re = new RegExp(`\\b${qt}[a-z0-9]*`, "g");
    let m; while ((m = re.exec(n))) marcas.push([m.index, m.index + m[0].length]);
  }
  marcas.sort((a, b) => a[0] - b[0]);
  let out = "", i = 0;
  for (const [a, b] of marcas) { if (a < i) continue; out += esc(s.slice(i, a)) + "<mark>" + esc(s.slice(a, b)) + "</mark>"; i = b; }
  return out + esc(s.slice(i));
}
