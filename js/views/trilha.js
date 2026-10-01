import { D } from "../data.js";
import { esc, ico, anel, numMod } from "../ui.js";
import { estadoTopico, ROTULO_ESTADO } from "../store.js";

export function render() {
  const mods = D.modulos.map(m => {
    const ts = D.topicosDo[m.id];
    const feitos = ts.filter(t => !["nao", "andamento"].includes(estadoTopico(t.id))).length;
    return `
      <section class="modulo-card m-${m.id}" id="${m.id}">
        <div class="modulo-head"><span class="badge" aria-hidden="true">${numMod(m.id)}</span><h2 class="grow">${esc(m.titulo)}</h2>${anel(Math.round(feitos / ts.length * 100), `${feitos}/${ts.length}`, 46, 5)}</div>
        <p class="modulo-desc">${esc(m.aulas)} · ${esc(m.descricao)}</p>
        <div class="rail">
          ${ts.map(t => {
            const e = estadoTopico(t.id);
            return `
            <a class="item ${["estudado", "revisando", "dominado"].includes(e) ? "feito" : ""}" href="#/t/${t.id}">
              <div class="grow"><div class="t">${esc(t.titulo)}</div><div class="s">${esc(t.resumo)}</div><span class="pill ${e}">${ROTULO_ESTADO[e]}</span></div>${ico.chev}
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

      ${mods}`,
  };
}
