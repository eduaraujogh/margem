import { D } from "../data.js";
import { esc, ico, plural, anel, numMod } from "../ui.js";
import { devidos, resumo, pontosFracos, proximoAEstudar, estadoTopico, estado, LIMITE_REVISAO } from "../store.js";
import { iniciarSessao } from "./sessao.js";

function saudacao() {
  const h = new Date().getHours();
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function render() {
  const dev = devidos();
  const nRev = Math.min(dev.length, LIMITE_REVISAO);
  const prox = proximoAEstudar();
  const r = resumo();
  const fracos = pontosFracos();
  const novo = estado().respostas.length === 0 && !Object.keys(estado().topicos).length;

  // Próximo passo: revisão vencida vem antes de tópico novo
  let passo;
  if (nRev > 0) {
    passo = `
      <div class="card hero fill">
        <div class="deco" aria-hidden="true"></div>
        <div class="meta">Próximo passo</div>
        <h2>Revisão de hoje</h2>
        <p>${plural(nRev, "questão", "questões")} para não esquecer o que você já estudou. Leva poucos minutos.</p>
        <button class="btn block" id="ir-revisao" type="button">Começar revisão</button>
      </div>`;
  } else if (prox) {
    const m = D.mod[prox.modulo];
    const e = estadoTopico(prox.id);
    passo = `
      <a class="card hero fill card-link" href="#/t/${prox.id}">
        <div class="deco" aria-hidden="true"></div><div class="num" aria-hidden="true">${numMod(prox.modulo)}</div>
        <div class="meta">${e === "andamento" ? "Continuar" : novo ? "Comece por aqui" : "Próximo tópico"} · ${esc(m.titulo)}</div>
        <h2>${esc(prox.titulo)}</h2>
        <p>${esc(prox.resumo)}</p>
        <span class="btn block">${e === "andamento" ? "Continuar estudando" : "Estudar este tópico"}</span>
      </a>`;
  } else {
    passo = `
      <div class="card hero fill">
        <div class="deco" aria-hidden="true"></div>
        <div class="meta">Trilha concluída</div>
        <h2>Você passou por todos os tópicos</h2>
        <p>Agora o melhor uso do tempo é um simulado misto ou reforçar os pontos fracos.</p>
        <a class="btn block" href="#/revisar">Fazer um simulado</a>
      </div>`;
  }

  // Depois da revisão, mostrar também o próximo tópico
  const segundo = nRev > 0 && prox ? `
    <section class="section">
      <h2 class="section-title">Depois da revisão</h2>
      <div class="list">
        <a class="item m-${prox.modulo}" href="#/t/${prox.id}">
          <span class="dot ${estadoTopico(prox.id)}" aria-hidden="true"></span>
          <div class="grow"><div class="t">${esc(prox.titulo)}</div><div class="s">${esc(D.mod[prox.modulo].titulo)}</div></div>${ico.chev}
        </a>
      </div>
    </section>` : "";

  const atencao = fracos.length ? `
    <section class="section">
      <h2 class="section-title">Precisa de atenção</h2>
      <div class="list">
        ${fracos.map(f => `
          <a class="item m-${f.t.modulo}" href="#/t/${f.t.id}">
            <span class="tile" aria-hidden="true">${numMod(f.t.modulo)}</span><div class="grow"><div class="t">${esc(f.t.titulo)}</div><div class="s">${f.erros} erros nas últimas ${f.total} respostas</div></div>${ico.chev}
          </a>`).join("")}
      </div>
    </section>` : "";

  const pct = Math.round((r.estudados / r.total) * 100);
  const comoFunciona = novo ? `
    <section class="section">
      <h2 class="section-title">Como funciona</h2>
      <div class="card stack small">
        <p><strong>1. Estude um tópico.</strong> Explicação curta, pontos-chave e, em cada trecho, a página do PDF de onde veio.</p>
        <p><strong>2. Pratique.</strong> Questões com resposta explicada e fonte.</p>
        <p><strong>3. Revise.</strong> O que você praticou volta aqui nos dias certos para não esquecer.</p>
      </div>
    </section>` : "";

  return {
    mod: nRev > 0 ? null : prox?.modulo,
    html: `
      <div class="page-head">
        <div class="eyebrow">Planejamento Estratégico</div>
        <h1 class="page-title">${saudacao()}.</h1>
      </div>
      ${passo}
      ${segundo}
      ${atencao}
      ${comoFunciona}
      <section class="section">
        <h2 class="section-title">Seu progresso</h2>
        <div class="card">
          <div class="rings">${D.modulos.map(m => {
            const ts = D.topicosDo[m.id];
            const p = Math.round(ts.filter(t => !["nao", "andamento"].includes(estadoTopico(t.id))).length / ts.length * 100);
            return `<a class="ring-item m-${m.id}" href="#/trilha">${anel(p)}<span>${esc(m.titulo)}</span></a>`;
          }).join("")}</div>
          <p class="progress-line small mt" style="text-align:center">${r.estudados} de ${r.total} tópicos estudados · ${r.dominados} ${r.dominados === 1 ? "dominado" : "dominados"}</p>
        </div>
      </section>
      <p class="mt" style="text-align:center"><a class="link-btn" href="#/ajustes">Ajustes e backup do progresso</a></p>`,
    montar(el) {
      el.querySelector("#ir-revisao")?.addEventListener("click", () => iniciarSessao({ tipo: "revisao" }));
    },
  };
}
