import { D } from "../data.js";
import { esc, ico } from "../ui.js";
import { estadoTopico, ROTULO_ESTADO } from "../store.js";

export function render() {
  const mods = D.modulos.map(m => {
    const ts = D.topicosDo[m.id];
    const feitos = ts.filter(t => !["nao", "andamento"].includes(estadoTopico(t.id))).length;
    return `
      <section class="modulo">
        <div class="modulo-head"><h2>${esc(m.titulo)}</h2><span class="n">${feitos}/${ts.length}</span></div>
        <p class="modulo-desc">${esc(m.aulas)} · ${esc(m.descricao)}</p>
        <div class="list">
          ${ts.map(t => {
            const e = estadoTopico(t.id);
            return `
            <a class="item" href="#/t/${t.id}">
              <span class="dot ${e}" role="img" aria-label="${ROTULO_ESTADO[e]}"></span>
              <div class="grow"><div class="t">${esc(t.titulo)}</div><div class="s">${esc(t.resumo)}</div></div>${ico.chev}
            </a>`;
          }).join("")}
        </div>
      </section>`;
  }).join("");

  return {
    html: `
      <div class="page-head">
        <h1 class="page-title">Trilha</h1>
        <p class="page-sub">${D.topicos.length} tópicos em ${D.modulos.length} módulos, na ordem das aulas.</p>
      </div>
      <div class="legend" aria-label="Legenda">
        ${["andamento", "estudado", "revisando", "dominado"].map(k => `<span><i class="dot ${k}"></i>${ROTULO_ESTADO[k]}</span>`).join("")}
      </div>
      ${mods}`,
  };
}
