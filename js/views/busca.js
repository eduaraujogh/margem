import { D } from "../data.js";
import { esc } from "../ui.js";
import { buscar } from "../busca.js";

const GRUPOS = [["topico", "Tópicos"], ["termo", "Termos"], ["questao", "Questões"], ["pagina", "Nos PDFs"]];
let ultima = "";

export function render(params) {
  const q0 = params?.get?.("q") ?? ultima;
  const filtro = params?.get?.("pdf") || "";
  return {
    titulo: "Buscar",
    html: `
      <div class="search-box">
        <label class="sr" for="q">Buscar em tudo</label>
        <input id="q" type="search" inputmode="search" autocomplete="off" placeholder="Ex.: vantagem transitória, Blockbuster, PESTEL" value="${esc(q0)}">
        <div class="chips mt-s" id="filtros" role="group" aria-label="Filtrar por material">
          <button class="chip" type="button" data-f="" aria-pressed="${!filtro}">Tudo</button>
          ${D.materiais.slice().sort((a, b) => a.ordem - b.ordem).map(m => `<button class="chip" type="button" data-f="${m.id}" aria-pressed="${filtro === m.id}">${esc(m.curto)}</button>`).join("")}
        </div>
      </div>
      <div id="res"></div>`,
    montar(el) {
      const inp = el.querySelector("#q"), res = el.querySelector("#res");
      let f = filtro, tm;
      const filtros = el.querySelector("#filtros");
      filtros.style.cssText = "flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding:2px 2px 8px;margin:0 -2px";
      const pintar = () => {
        filtros.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === f));
        const q = inp.value.trim(); ultima = q;
        history.replaceState(null, "", `#/busca?q=${encodeURIComponent(q)}${f ? `&pdf=${f}` : ""}`);
        if (q.length < 2) { res.innerHTML = `<div class="empty">Procure uma palavra, um conceito ou uma empresa citada nas aulas. Mostro de onde veio cada resultado.</div>`; return; }
        const rs = buscar(q, f);
        if (!rs.length) { res.innerHTML = `<div class="empty">Nada encontrado para “${esc(q)}”${f ? ` em ${esc(D.mat[f].curto)}` : ""}.<br>Tente outra palavra ou menos palavras.</div>`; return; }
        res.innerHTML = GRUPOS.map(([tipo, nome]) => {
          const g = rs.filter(r => r.tipo === tipo);
          if (!g.length) return "";
          const max = tipo === "pagina" ? 30 : 8;
          return `<section class="section"><h2 class="section-title">${nome} <span class="muted">(${g.length})</span></h2><div class="list">${g.slice(0, max).map(item).join("")}</div></section>`;
        }).join("");
      };
      inp.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(pintar, 120); });
      filtros.addEventListener("click", e => { const b = e.target.closest("[data-f]"); if (b) { f = b.dataset.f; pintar(); } });
      pintar();
      if (!q0) inp.focus();
    },
  };
}

function item(r) {
  if (r.tipo === "topico") return `<a class="result" href="#/t/${r.id}"><div class="t">${esc(r.titulo)}</div><div class="snip">${r.trecho}</div><div class="o">${esc(r.sub)}</div></a>`;
  if (r.tipo === "termo") return `<button class="result" type="button" data-termo="${r.id}"><div class="t">${esc(r.titulo)}</div><div class="snip">${r.trecho}</div></button>`;
  if (r.tipo === "questao") return `<a class="result" href="#/t/${D.q[r.id].topico}/praticar"><div class="t">${esc(r.titulo)}</div><div class="o">Questão · ${esc(r.sub)}</div></a>`;
  return `<button class="result" type="button" data-fonte="${r.id}"><div class="snip">${r.trecho}</div><div class="o">${esc(r.sub)}</div></button>`;
}
