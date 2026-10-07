import { D } from "../data.js";
import { esc, ico } from "../ui.js";

const item = m => `
  <a class="item ${m.meu ? `m-${m.modulo}` : ""}" href="#/material/${m.id}">
    <span class="tile" aria-hidden="true">${ico.doc}</span><div class="grow"><div class="t">${esc(m.titulo)}</div><div class="s">${esc(m.meu ? `${m.paginas} páginas · criado por IA` : m.tipo)}</div></div>${ico.chev}
  </a>`;

export function render() {
  const mats = D.materiais.slice().sort((a, b) => a.ordem - b.ordem);
  const base = mats.filter(m => !m.meu), meus = mats.filter(m => m.meu);
  return {
    html: `
      <div class="page-head">
        <h1 class="page-title">Biblioteca</h1>
        <p class="page-sub">Os ${base.length} materiais da disciplina${meus.length ? " e os PDFs que você enviou" : ""}. Tudo no app aponta para uma página deles.</p>
      </div>
      <div class="list">
        <a class="item" href="#/glossario"><span class="tile" aria-hidden="true">Aa</span><div class="grow"><div class="t">Glossário</div><div class="s">${D.glossario.length} termos, cada um com a fonte</div></div>${ico.chev}</a>
      </div>
      <section class="section">
        <h2 class="section-title">Seus PDFs</h2>
        ${meus.length ? `<div class="list">${meus.map(item).join("")}</div>` : `<p class="muted small" style="margin:-4px 0 12px">Tem um PDF de outra aula? Envie e o Margem cria tópicos, casos e flashcards a partir dele.</p>`}
        <a class="btn ${meus.length ? "ghost" : ""} block mt-s" href="#/adicionar">${ico.mais} Adicionar um PDF</a>
      </section>
      <section class="section">
        <h2 class="section-title">Materiais da disciplina</h2>
        <div class="list">${base.map(item).join("")}</div>
      </section>`,
  };
}
