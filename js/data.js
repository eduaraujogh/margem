// Conteúdo de estudo (somente leitura), gerado por tools/empacotar.py
export const D = {
  materiais: [], modulos: [], topicos: [], questoes: [], glossario: [], paginas: [],
  mat: {}, mod: {}, top: {}, q: {}, termo: {}, pag: {},
  topicosDo: {}, questoesDo: {},
};

export async function carregar() {
  const r = await fetch("content/conteudo.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("Não foi possível carregar o conteúdo.");
  const c = await r.json();
  Object.assign(D, c);
  for (const m of D.materiais) D.mat[m.id] = m;
  for (const m of D.modulos) { D.mod[m.id] = m; D.topicosDo[m.id] = []; }
  for (const t of D.topicos) { D.top[t.id] = t; D.topicosDo[t.modulo].push(t); D.questoesDo[t.id] = []; }
  for (const q of D.questoes) { D.q[q.id] = q; D.questoesDo[q.topico]?.push(q); }
  for (const g of D.glossario) D.termo[g.id] = g;
  for (const p of D.paginas) D.pag[p.id] = p;
}

// "aula2-p12" -> { material, pagina, rotulo: "Aula 2 · p. 12" }
export function fonte(id) {
  const p = D.pag[id];
  if (!p) return null;
  const m = D.mat[p.material];
  return { ...p, mat: m, rotulo: `${m.curto} · p. ${p.pagina}` };
}

export function proximoTopico(t) {
  const i = D.topicos.indexOf(t);
  return D.topicos[i + 1] || null;
}
