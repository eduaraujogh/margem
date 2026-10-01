import { D, proximoTopico } from "../data.js";
import { esc, ico, fontes, plural } from "../ui.js";
import { abrirTopico, marcarLido, estadoTopico, ROTULO_ESTADO, nota, salvarNota, estado } from "../store.js";
import { iniciarSessao } from "./sessao.js";

const ABAS = [["aprender", "Aprender"], ["chave", "Pontos-chave"], ["praticar", "Praticar"], ["nota", "Nota"]];

export function render(id, aba = "aprender") {
  const t = D.top[id];
  if (!t) throw new Error("tópico");
  if (!ABAS.some(a => a[0] === aba)) aba = "aprender";
  abrirTopico(id);
  const m = D.mod[t.modulo];
  const e = estadoTopico(id);
  const qs = D.questoesDo[id];
  const prox = proximoTopico(t);

  let corpo = "";
  if (aba === "aprender") {
    corpo = `
      <div class="reading">
        ${t.aprender.map(a => `<div class="para"><p>${esc(a.texto)}</p>${fontes(a.fontes)}</div>`).join("")}
      </div>
      ${t.termos.length ? `
        <section class="section">
          <h2 class="section-title">Termos</h2>
          <div class="chips">${t.termos.map(g => `<button class="chip" type="button" data-termo="${g}">${esc(D.termo[g].termo)}</button>`).join("")}</div>
        </section>` : ""}
      ${t.relacionados.length ? `
        <section class="section">
          <h2 class="section-title">Relacionados</h2>
          <div class="chips">${t.relacionados.map(r => `<a class="chip" href="#/t/${r}">${esc(D.top[r].titulo)}</a>`).join("")}</div>
        </section>` : ""}
      <div class="dock"><a class="btn block" href="#/t/${id}/chave" id="lido">Li tudo: ver pontos-chave</a></div>`;
  } else if (aba === "chave") {
    corpo = `
      <ul class="keypoints num">
        ${t.pontosChave.map(k => `<li><p class="kp">${esc(k.texto)}</p>${fontes(k.fontes)}</li>`).join("")}
      </ul>
      <div class="dock"><a class="btn block" href="#/t/${id}/praticar">Praticar este tópico</a></div>`;
  } else if (aba === "praticar") {
    const mult = qs.filter(q => q.tipo === "multipla").length;
    const fl = qs.length - mult;
    const rs = estado().respostas.filter(r => r.t === id);
    const ult = rs.slice(-qs.length);
    corpo = `
      <div class="card mt">
        <p class="reading" style="font-size:17px">${plural(mult, "questão de múltipla escolha", "questões de múltipla escolha")}${fl ? ` e ${plural(fl, "flashcard", "flashcards")}` : ""}.</p>
        <p class="muted small mt-s">Cada resposta mostra a explicação e a página do PDF. Depois, as questões voltam na revisão.</p>
        ${rs.length ? `<p class="small mt-s">Última vez: ${ult.filter(r => r.ok).length} de ${ult.length} certas.</p>` : ""}
        <button class="btn block mt" id="praticar" type="button">${rs.length ? "Praticar de novo" : "Começar"}</button>
      </div>`;
  } else {
    corpo = `
      <label class="sr" for="nota">Sua nota sobre ${esc(t.titulo)}</label>
      <textarea class="note" id="nota" placeholder="Suas anotações sobre este tópico. Salva sozinha.">${esc(nota(id))}</textarea>
      <p class="hint" id="nota-status">Fica só neste aparelho. Use Ajustes para fazer backup.</p>`;
  }

  return {
    titulo: t.titulo,
    voltar: "#/trilha",
    mod: t.modulo, tinta: true,
    html: `
      <div class="topic-head">
        <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip-mod">Módulo ${m.id.replace("mod", "")} · ${esc(m.titulo)}</span><span class="eyebrow mod">${ROTULO_ESTADO[e]}</span></div>
        <h1 class="page-title" style="margin-top:12px">${esc(t.titulo)}</h1>
        <p class="page-sub" style="color:var(--ink-2)">${esc(t.resumo)}</p>
        ${e === "nao" || e === "andamento" ? `<button class="link-btn" id="ja-sei" type="button">Já sei isso: ir direto às questões</button>` : ""}
      </div>
      <div class="tabs" role="tablist" aria-label="Partes do tópico">
        ${ABAS.map(([k, n]) => `<button role="tab" aria-selected="${k === aba}" data-aba="${k}" type="button">${n}</button>`).join("")}
      </div>
      <div role="tabpanel">${corpo}</div>
      ${prox ? `<section class="section"><div class="list"><a class="item" href="#/t/${prox.id}"><div class="grow"><div class="s">Próximo tópico</div><div class="t">${esc(prox.titulo)}</div></div>${ico.chev}</a></div></section>` : ""}`,
    montar(el) {
      el.querySelectorAll("[data-aba]").forEach(b => b.onclick = () => { location.replace(`#/t/${id}/${b.dataset.aba}`); });
      el.querySelector("#lido")?.addEventListener("click", () => marcarLido(id));
      el.querySelector("#praticar")?.addEventListener("click", () => { marcarLido(id); iniciarSessao({ tipo: "topico", topico: id }); });
      el.querySelector("#ja-sei")?.addEventListener("click", () => iniciarSessao({ tipo: "topico", topico: id }));
      const n = el.querySelector("#nota");
      if (n) {
        let tm;
        n.addEventListener("input", () => {
          clearTimeout(tm);
          tm = setTimeout(() => { salvarNota(id, n.value); el.querySelector("#nota-status").textContent = "Salvo."; }, 400);
        });
        return () => { clearTimeout(tm); salvarNota(id, n.value); };
      }
    },
  };
}
