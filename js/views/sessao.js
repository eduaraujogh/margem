// Sessão de prática: questões de um tópico, revisão do dia ou simulado
import { D } from "../data.js";
import { esc, ico, fontes, embaralhar, plural, anel } from "../ui.js";
import { responder, marcarRevisao, marcarPraticado, devidos, estadoTopico, LIMITE_REVISAO } from "../store.js";
import { abrirReporte } from "../folhas.js";

let S = null;

export function iniciarSessao(cfg) {
  let ids = [], titulo = "", voltar = "#/";
  if (cfg.tipo === "topico") {
    const qs = D.questoesDo[cfg.topico];
    ids = [...embaralhar(qs.filter(q => q.tipo === "multipla")), ...qs.filter(q => q.tipo !== "multipla")].map(q => q.id);
    titulo = D.top[cfg.topico].titulo; voltar = `#/t/${cfg.topico}`;
  } else if (cfg.tipo === "revisao") {
    ids = devidos().slice(0, LIMITE_REVISAO);
    titulo = "Revisão de hoje"; voltar = "#/";
  } else if (cfg.tipo === "simulado") {
    const tops = cfg.topicos;
    const pool = D.questoes.filter(q => q.tipo === "multipla" && tops.includes(q.topico));
    ids = embaralhar(pool).slice(0, cfg.n || 10).map(q => q.id);
    titulo = cfg.titulo || "Simulado"; voltar = "#/revisar";
  }
  if (!ids.length) return;
  S = { cfg, ids, i: 0, titulo, voltar, acertos: 0, respondida: false, ordem: {}, erradas: [] };
  location.hash = "#/sessao";
}

export function render() {
  if (!S) return { html: `<div class="empty">Nenhuma sessão em andamento.<br><a class="btn small mt" href="#/">Ir para Hoje</a></div>` };
  return {
    titulo: S.titulo, foco: true, voltar: S.voltar, mod: S.cfg.mod || (S.cfg.topico && D.top[S.cfg.topico].modulo),
    html: `<div id="sessao"></div>`,
    montar(el) { desenhar(el.querySelector("#sessao")); },
  };
}

function topo() {
  const n = S.ids.length, i = Math.min(S.i + (S.respondida ? 1 : 0), n);
  return `
    <div class="quiz-top">
      <span class="count">${Math.min(S.i + 1, n)}/${n}</span>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${i}" aria-label="Progresso"><i style="width:${(i / n) * 100}%"></i></div>
    </div>`;
}

function desenhar(box) {
  if (S.i >= S.ids.length) return fim(box);
  const q = D.q[S.ids[S.i]];
  const t = D.top[q.topico];
  const rotuloTopico = S.cfg.tipo === "topico" ? "" : `<div class="eyebrow">${esc(t.titulo)}</div>`;
  if (q.tipo === "multipla") {
    const ordem = S.ordem[q.id] ||= embaralhar(q.alternativas.map((_, k) => k));
    box.innerHTML = `
      ${topo()}
      <div class="q-tipo">${rotuloTopico}</div>
      <h2 class="q-enunciado" id="enun" tabindex="-1">${esc(q.enunciado)}</h2>
      <ul class="options" role="list">
        ${ordem.map(k => `<li><button class="opt" type="button" data-k="${k}"><span class="mark" aria-hidden="true"></span><span>${esc(q.alternativas[k])}</span></button></li>`).join("")}
      </ul>
      <div id="fb"></div>`;
    box.querySelectorAll(".opt").forEach(b => b.onclick = () => escolher(box, q, +b.dataset.k));
  } else {
    box.innerHTML = `
      ${topo()}
      <div class="q-tipo">${rotuloTopico}<div class="eyebrow">Flashcard: tente lembrar antes de virar</div></div>
      <div class="card flash" id="flash">
        <p class="face" id="enun" tabindex="-1">${esc(q.frente)}</p>
        <div id="verso"></div>
      </div>
      <div class="dock" id="acoes"><button class="btn block" id="virar" type="button">Mostrar resposta</button></div>`;
    box.querySelector("#virar").onclick = () => {
      box.querySelector("#verso").innerHTML = `<p class="back">${esc(q.verso)}</p>${fontes(q.fontes)}`;
      box.querySelector("#acoes").innerHTML = `
        <div class="btn-row"><button class="btn ghost" id="nao" type="button">Não lembrei</button><button class="btn" id="sim" type="button">Lembrei</button></div>
        <p style="text-align:center"><button class="link-btn" id="rep" type="button">Isso está errado?</button></p>`;
      box.querySelector("#nao").onclick = () => registrar(box, q, false, true);
      box.querySelector("#sim").onclick = () => registrar(box, q, true, true);
      box.querySelector("#rep").onclick = () => abrirReporte(q.id, `Flashcard: ${q.frente}`);
      box.querySelector("#sim").focus();
    };
  }
  box.querySelector("#enun")?.focus({ preventScroll: true });
}

function escolher(box, q, k) {
  if (S.respondida) return;
  const ok = k === q.correta;
  box.querySelectorAll(".opt").forEach(b => {
    const bk = +b.dataset.k;
    b.disabled = true;
    if (bk === q.correta) { b.classList.add("right"); b.querySelector(".mark").innerHTML = ico.check; }
    else if (bk === k) { b.classList.add("wrong"); b.querySelector(".mark").innerHTML = ico.x; }
    else b.classList.add("dim");
  });
  registrar(box, q, ok, false);
  box.querySelector("#fb").innerHTML = `
    <div class="feedback ${ok ? "ok" : "err"}" role="status">
      <div class="verdict ${ok ? "ok" : "err"}">${ok ? "Certo." : "Não é essa."}</div>
      ${ok ? "" : `<p><strong>Resposta certa:</strong> ${esc(q.alternativas[q.correta])}</p>`}
      <p>${esc(q.explicacao)}</p>
      ${fontes(q.fontes)}
    </div>
    <div class="dock">
      <button class="btn block" id="prox" type="button">${S.i + 1 < S.ids.length ? "Próxima" : "Ver resultado"}</button>
      <p style="text-align:center"><button class="link-btn" id="rep" type="button">Isso está errado?</button></p>
    </div>`;
  box.querySelector("#prox").onclick = () => avancar(box);
  box.querySelector("#rep").onclick = () => abrirReporte(q.id, `Questão: ${q.enunciado}`);
  box.querySelector("#prox").focus({ preventScroll: true });
  box.querySelector("#fb").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function registrar(box, q, ok, avancarJa) {
  S.respondida = true;
  responder(q.id, ok);
  if (S.cfg.tipo === "revisao") marcarRevisao(q.id);
  if (ok) S.acertos++; else S.erradas.push(q.id);
  if (avancarJa) avancar(box);
}

function avancar(box) {
  S.i++; S.respondida = false;
  window.scrollTo(0, 0);
  desenhar(box);
}

function fim(box) {
  if (S.cfg.tipo === "topico") marcarPraticado(S.cfg.topico);
  const n = S.ids.length, a = S.acertos;
  const pct = Math.round((a / n) * 100);
  const msg = pct >= 80 ? "Muito bem. Essas questões voltam na revisão para fixar." : pct >= 50 ? "Bom caminho. As que você errou voltam já amanhã na revisão." : "Vale reler o tópico. As que você errou voltam amanhã na revisão.";
  const erradasTop = [...new Set(S.erradas.map(id => D.q[id].topico))];
  let seguir = `<a class="btn block" href="#/">Ir para Hoje</a>`;
  if (S.cfg.tipo === "topico") {
    const i = D.topicos.findIndex(t => t.id === S.cfg.topico);
    const prox = D.topicos[i + 1];
    seguir = `${prox ? `<a class="btn block" href="#/t/${prox.id}">Próximo tópico: ${esc(prox.titulo)}</a>` : ""}
      <a class="btn ghost block" href="#/t/${S.cfg.topico}">Voltar ao tópico</a>`;
  }
  box.innerHTML = `
    <div class="page-head" style="text-align:center;padding-top:36px">
      <div class="eyebrow">${esc(S.titulo)}</div>
      <div class="mt">${anel(pct, `${a}/${n}`, 140, 12, "result-ring")}</div>
      <p class="muted mt-s">${a === 1 ? "questão certa" : "questões certas"}</p>
      <p class="mt">${msg}</p>
    </div>
    ${erradasTop.length && S.cfg.tipo !== "topico" ? `
      <section class="section">
        <h2 class="section-title">Para reler</h2>
        <div class="list">${erradasTop.map(id => `<a class="item" href="#/t/${id}"><div class="grow t">${esc(D.top[id].titulo)}</div>${ico.chev}</a>`).join("")}</div>
      </section>` : ""}
    <div class="stack mt">${seguir}</div>`;
  S = null;
}
