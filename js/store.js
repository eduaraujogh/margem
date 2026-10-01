// Progresso da estudante. Fica no navegador (localStorage) e pode ser exportado/importado.
import { D } from "./data.js";

const CHAVE = "margem.progresso.v1";
const INTERVALOS = [1, 3, 7, 21]; // dias por caixa (Leitner)
export const LIMITE_REVISAO = 20;

let S = vazio();
function vazio() {
  return { versao: 1, topicos: {}, cartoes: {}, respostas: [], notas: {}, reportes: [], criadoEm: hoje() };
}

export function hoje(d = new Date()) {
  const z = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function somaDias(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return hoje(new Date(y, m - 1, d + n));
}
function diasEntre(a, b) {
  const p = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 864e5);
}

export function carregarProgresso() {
  // pede ao navegador para não apagar os dados do app
  try { navigator.storage?.persist?.(); } catch (e) {}
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) S = { ...vazio(), ...JSON.parse(raw) };
  } catch (e) { /* navegador sem armazenamento: segue em memória */ }
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch (e) {}
}
export const estado = () => S;

// Tópicos
export function abrirTopico(id) {
  const t = S.topicos[id] || (S.topicos[id] = {});
  if (!t.aberto) { t.aberto = hoje(); salvar(); }
}
export function marcarLido(id) {
  const t = S.topicos[id] || (S.topicos[id] = {});
  if (!t.lido) { t.lido = hoje(); salvar(); }
}
export function marcarPraticado(id) {
  const t = S.topicos[id] || (S.topicos[id] = {});
  t.praticado = t.praticado || hoje(); salvar();
}
export function pularLeitura(id) { marcarLido(id); }

// Respostas e revisão espaçada
export function responder(qid, acertou) {
  const q = D.q[qid];
  S.respostas.push({ q: qid, t: q?.topico, ok: !!acertou, d: hoje() });
  const c = S.cartoes[qid] || { caixa: 0 };
  c.caixa = acertou ? Math.min((c.caixa || 0) + 1, 4) : 1;
  c.vence = somaDias(hoje(), INTERVALOS[c.caixa - 1]);
  S.cartoes[qid] = c;
  salvar();
}
export function devidos() {
  const h = hoje();
  return Object.entries(S.cartoes)
    .filter(([id, c]) => D.q[id] && c.vence <= h)
    .sort((a, b) => a[1].vence.localeCompare(b[1].vence) || a[1].caixa - b[1].caixa)
    .map(([id]) => id);
}
export function revisouHoje() {
  const h = hoje();
  return S.respostas.some(r => r.d === h && r.rev);
}
export function marcarRevisao(qid) {
  const r = S.respostas[S.respostas.length - 1];
  if (r && r.q === qid) { r.rev = 1; salvar(); }
}

// Estado do tópico: nao | andamento | estudado | revisando | dominado
export function estadoTopico(id) {
  const t = S.topicos[id] || {};
  const rs = S.respostas.filter(r => r.t === id);
  if (dominado(rs)) return "dominado";
  const dias = new Set(rs.map(r => r.d));
  if (t.praticado && dias.size >= 2) return "revisando";
  if (t.praticado) return "estudado";
  if (t.aberto) return "andamento";
  return "nao";
}
// Dominado: 80% ou mais de acerto em pelo menos dois dias com 3 ou mais dias de intervalo
function dominado(rs) {
  const porDia = {};
  for (const r of rs) (porDia[r.d] ||= []).push(r.ok);
  const bons = Object.entries(porDia)
    .filter(([, oks]) => oks.length >= 2 && oks.filter(Boolean).length / oks.length >= 0.8)
    .map(([d]) => d).sort();
  return bons.length >= 2 && diasEntre(bons[0], bons[bons.length - 1]) >= 3;
}
export const ROTULO_ESTADO = { nao: "Não iniciado", andamento: "Em andamento", estudado: "Estudado", revisando: "Em revisão", dominado: "Dominado" };

// Pontos fracos: 40% ou mais de erro nas últimas 10 respostas do tópico (mínimo 3)
export function pontosFracos(max = 3) {
  const out = [];
  for (const t of D.topicos) {
    const rs = S.respostas.filter(r => r.t === t.id).slice(-10);
    if (rs.length < 3) continue;
    const erros = rs.filter(r => !r.ok).length;
    if (erros / rs.length >= 0.4) out.push({ t, erros, total: rs.length });
  }
  return out.sort((a, b) => b.erros / b.total - a.erros / a.total).slice(0, max);
}

export function resumo() {
  let estudados = 0, dominados = 0;
  for (const t of D.topicos) {
    const e = estadoTopico(t.id);
    if (e !== "nao" && e !== "andamento") estudados++;
    if (e === "dominado") dominados++;
  }
  return { total: D.topicos.length, estudados, dominados };
}

export function proximoAEstudar() {
  return D.topicos.find(t => estadoTopico(t.id) === "andamento")
      || D.topicos.find(t => estadoTopico(t.id) === "nao")
      || null;
}

// Notas e reportes
export const nota = id => S.notas[id] || "";
export function salvarNota(id, txt) { S.notas[id] = txt; salvar(); }
export function reportar(alvo, motivo) {
  S.reportes.push({ alvo, motivo, em: new Date().toISOString() });
  salvar();
}

// Exportar / importar / apagar
export function exportar() {
  return JSON.stringify({ app: "margem", exportadoEm: new Date().toISOString(), ...S }, null, 1);
}
export function importar(texto) {
  const d = JSON.parse(texto);
  if (d.app !== "margem" || !d.respostas) throw new Error("Arquivo não reconhecido.");
  delete d.app; delete d.exportadoEm;
  S = { ...vazio(), ...d };
  salvar();
}
export function apagar() { S = vazio(); salvar(); }
