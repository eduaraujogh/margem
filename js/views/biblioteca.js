import { D } from "../data.js";
import { esc, ico } from "../ui.js";

export function render() {
  const mats = D.materiais.slice().sort((a, b) => a.ordem - b.ordem);
  return {
    html: `
      <div class="page-head">
        <h1 class="page-title">Biblioteca</h1>
        <p class="page-sub">Os 8 materiais originais. Tudo no app aponta para uma página deles.</p>
      </div>
      <div class="list">
        <a class="item" href="#/glossario"><div class="grow"><div class="t">Glossário</div><div class="s">${D.glossario.length} termos, cada um com a fonte</div></div>${ico.chev}</a>
      </div>
      <section class="section">
        <h2 class="section-title">Materiais</h2>
        <div class="list">
          ${mats.map(m => `
            <a class="item" href="#/material/${m.id}">
              <div class="grow"><div class="t">${esc(m.titulo)}</div><div class="s">${esc(m.tipo)}</div></div>${ico.chev}
            </a>`).join("")}
        </div>
      </section>`,
  };
}
