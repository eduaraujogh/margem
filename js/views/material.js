import { D } from "../data.js";
import { esc, ico } from "../ui.js";
import { ORIGEM } from "../folhas.js";

export function render(id) {
  const m = D.mat[id];
  if (!m) throw new Error("material");
  const pags = D.paginas.filter(p => p.material === id);
  const usadas = new Set();
  for (const t of D.topicos) for (const b of [...t.aprender, ...t.pontosChave]) b.fontes.forEach(f => usadas.add(f));
  const topicosQueUsam = D.topicos.filter(t => [...t.aprender, ...t.pontosChave].some(b => b.fontes.some(f => f.startsWith(id + "-p"))));

  return {
    titulo: m.titulo,
    voltar: "#/biblioteca",
    html: `
      <div class="page-head">
        <div class="eyebrow">${esc(m.tipo)}</div>
        <h1 class="page-title">${esc(m.titulo)}</h1>
      </div>
      <div class="btn-row">
        <a class="btn" href="#/pdf/${m.id}/1">${ico.doc} Abrir o PDF</a>
      </div>
      ${topicosQueUsam.length ? `
        <section class="section">
          <h2 class="section-title">Estudado nos tópicos</h2>
          <div class="chips">${topicosQueUsam.map(t => `<a class="chip" href="#/t/${t.id}">${esc(t.titulo)}</a>`).join("")}</div>
        </section>` : ""}
      <section class="section">
        <h2 class="section-title">Páginas com texto</h2>
        <p class="muted small" style="margin:-4px 0 10px">Toque para ler o texto da página. Capas e imagens sem texto ficam só no PDF.</p>
        <div class="list">
          ${pags.map(p => `
            <button class="item" type="button" data-fonte="${p.id}">
              <span class="tag" style="min-width:52px;text-align:center">p. ${p.pagina}</span>
              <div class="grow"><div class="s" style="color:var(--ink-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.texto.slice(0, 160))}</div>
              ${p.origem === "ocr" ? `<div class="origem ocr small">${ORIGEM.ocr.rotulo}</div>` : ""}</div>
            </button>`).join("")}
        </div>
      </section>`,
  };
}
