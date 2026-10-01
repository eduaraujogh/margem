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
    classe: "pg-busca",
    html: `
      <div class="search-box">
        <label class="sr" for="q">Buscar em tudo</label>
        <div class="search-field">
          <input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Busque um termo, conceito ou empresa" value="${esc(q0)}">
          <button class="search-clear" id="limpar" type="button" aria-label="Limpar busca" ${q0 ? "" : "hidden"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>
        </div>
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
      const pintar = () => {
        filtros.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === f));
        const q = inp.value.trim(); ultima = q;
        el.querySelector("#limpar").hidden = !inp.value;
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
      inp.addEventListener("keydown", e => { if (e.key === "Enter") inp.blur(); });
      el.querySelector("#limpar").onclick = () => { inp.value = ""; pintar(); inp.focus(); };
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
