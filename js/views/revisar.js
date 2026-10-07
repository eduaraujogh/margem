import { D } from "../data.js";
import { esc, ico, plural, numMod } from "../ui.js";
import { devidos, pontosFracos, estadoTopico, estado, LIMITE_REVISAO, hoje } from "../store.js";
import { iniciarSessao } from "./sessao.js";

export function render() {
  const dev = devidos();
  const n = Math.min(dev.length, LIMITE_REVISAO);
  const cartoes = Object.keys(estado().cartoes).length;
  const fracos = pontosFracos(10);
  const estudados = D.topicos.filter(t => !["nao", "andamento"].includes(estadoTopico(t.id))).map(t => t.id);
  const proxData = Object.values(estado().cartoes).map(c => c.vence).filter(v => v > hoje()).sort()[0];

  const rev = n ? `
    <div class="card hero fill">
      <div class="deco" aria-hidden="true"></div>
      <div class="meta">Revisão espaçada</div>
      <h2>${plural(n, "questão para hoje", "questões para hoje")}</h2>
      <p>As que você acerta demoram mais para voltar. As que você erra voltam amanhã.</p>
      <button class="btn block" id="rev" type="button">Começar revisão</button>
    </div>` : `
    <div class="card">
      <p class="t" style="font-weight:600">Nada para revisar hoje.</p>
      <p class="muted small mt-s">${cartoes ? `Próxima revisão em ${formatar(proxData)}.` : "As questões que você praticar nos tópicos entram aqui nos dias certos."}</p>
    </div>`;

  const opcoes = [];
  if (fracos.length) opcoes.push(`<button class="item" type="button" data-sim="fracos"><span class="tile" aria-hidden="true">!</span><div class="grow"><div class="t">Pontos fracos</div><div class="s">${plural(fracos.length, "tópico", "tópicos")} com mais erros</div></div>${ico.chev}</button>`);
  if (estudados.length) opcoes.push(`<button class="item" type="button" data-sim="estudados"><span class="tile" aria-hidden="true">∗</span><div class="grow"><div class="t">Tudo o que já estudei</div><div class="s">${plural(estudados.length, "tópico", "tópicos")}, 10 casos misturados</div></div>${ico.chev}</button>`);
  for (const m of D.modulos) opcoes.push(`<button class="item m-${m.id}" type="button" data-sim="${m.id}"><span class="tile" aria-hidden="true">${numMod(m.id)}</span><div class="grow"><div class="t">${esc(m.titulo)}</div><div class="s">${esc(m.aulas)}, até 10 casos</div></div>${ico.chev}</button>`);
  const totalCasos = D.questoes.filter(q => q.caso).length;

  return {
    html: `
      <div class="page-head"><h1 class="page-title">Revisar</h1></div>
      ${rev}
      <section class="section">
        <h2 class="section-title">Prova chegando?</h2>
        <div class="card">
          <p style="font-weight:700">Treino só de casos</p>
          <p class="muted small mt-s">15 situações de empresas, de todos os módulos, no formato que cai na prova. São ${totalCasos} casos no total; os que você ainda não viu vêm primeiro.</p>
          <button class="btn block mt" id="so-casos" type="button">Treinar 15 casos</button>
        </div>
      </section>
      <section class="section">
        <h2 class="section-title">Simulado por módulo</h2>
        <p class="muted small" style="margin:-4px 0 10px">Casos sorteados de um módulo ou dos seus pontos fracos.</p>
        <div class="list">${opcoes.join("")}</div>
      </section>`,
    montar(el) {
      el.querySelector("#rev")?.addEventListener("click", () => iniciarSessao({ tipo: "revisao" }));
      el.querySelector("#so-casos").onclick = () => iniciarSessao({ tipo: "simulado", topicos: D.topicos.map(t => t.id), titulo: "Treino de casos", n: 15, soCasos: true });
      el.querySelectorAll("[data-sim]").forEach(b => b.onclick = () => {
        const k = b.dataset.sim;
        let topicos, titulo;
        if (k === "fracos") { topicos = fracos.map(f => f.t.id); titulo = "Simulado: pontos fracos"; }
        else if (k === "estudados") { topicos = estudados; titulo = "Simulado: tudo o que estudei"; }
        else { topicos = D.topicosDo[k].map(t => t.id); titulo = `Simulado: ${D.mod[k].titulo}`; }
        iniciarSessao({ tipo: "simulado", topicos, titulo, n: 10, mod: D.mod[k] ? k : null });
      });
    },
  };
}

function formatar(iso) {
  if (!iso) return "breve";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}
