// Enviar um PDF do aparelho: a IA (no servidor) monta tópicos, casos e flashcards; o app confere e guarda.
import { SERVIDOR, MAX_MB } from "../config.js";
import { esc, ico, plural, aviso } from "../ui.js";
import { pdfjs } from "../pdfjs.js";
import { salvar, integrar, normalizar } from "../meus.js";

const CH = "margem.codigo";
const TENTATIVAS = 3, ESPERA_S = 20, LIMITE_MS = 5 * 60 * 1000;

let job = null;      // { nome, etapa: ler | ia | salvar | ok | erro, inicio, espera, msg, res }
let arquivo = null;  // PDF escolhido (mantido se der erro, para tentar de novo)
let ouvinte = null;
const avisar = () => ouvinte?.();
const pausa = ms => new Promise(r => setTimeout(r, ms));

class Falha extends Error { constructor(msg, tipo) { super(msg); this.tipo = tipo; } }

async function lerPaginas(buf) {
  let doc;
  try {
    const lib = await pdfjs();
    doc = await lib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  } catch (e) {
    throw new Falha(e?.name === "PasswordException" ? "Este PDF tem senha. Envie uma versão sem senha." : "Não consegui abrir este arquivo como PDF. Confira a internet e se o arquivo abre no seu aparelho.");
  }
  const textos = [];
  for (let n = 1; n <= doc.numPages; n++) {
    let s = "";
    try {
      const tc = await (await doc.getPage(n)).getTextContent();
      for (const it of tc.items) s += it.str + (it.hasEOL ? "\n" : " ");
    } catch (e) { s = ""; }
    s = s.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    textos.push(s.length >= 15 ? s : ""); // página sem texto = slide em imagem
  }
  doc.destroy?.();
  return textos;
}

const base64 = blob => new Promise((ok, erro) => {
  const fr = new FileReader();
  fr.onload = () => ok(String(fr.result).slice(String(fr.result).indexOf(",") + 1));
  fr.onerror = () => erro(new Falha("Não consegui ler o arquivo no aparelho."));
  fr.readAsDataURL(blob);
});

async function pedir(b64, codigo) {
  for (let t = 1; ; t++) {
    const ctl = new AbortController();
    const tm = setTimeout(() => ctl.abort(), LIMITE_MS);
    let r, d;
    try {
      r = await fetch(`${SERVIDOR}/gerar`, { method: "POST", headers: { "Content-Type": "text/plain", "X-Margem-Codigo": encodeURIComponent(codigo) }, body: b64, signal: ctl.signal });
      d = await r.json().catch(() => null);
    } catch (e) {
      throw new Falha(e?.name === "AbortError" ? "A IA demorou demais para responder. Tente de novo; se repetir, envie um PDF menor." : "Sem conexão com o servidor. Confira a internet e tente de novo.");
    } finally { clearTimeout(tm); }
    // o servidor responde 200 e manda o resultado em "ok" (ver servidor/worker.js)
    if (r.ok && d?.ok && d.texto) return d;
    if (r.status === 401) throw new Falha("Código de acesso incorreto. Confira com quem te passou o Margem.", "codigo");
    if ((r.status === 503 || d?.erro === "ocupada") && t < TENTATIVAS) {
      job.espera = `A IA gratuita está cheia agora. Nova tentativa em ${ESPERA_S} segundos (${t + 1} de ${TENTATIVAS}).`; avisar();
      await pausa(ESPERA_S * 1000);
      job.espera = ""; avisar();
      continue;
    }
    throw new Falha(d?.msg || "O servidor não respondeu como esperado. Tente de novo em alguns minutos.");
  }
}

async function processar(file, codigo) {
  job = { nome: file.name, etapa: "ler", inicio: Date.now() }; avisar();
  try {
    const buf = await file.arrayBuffer().catch(() => { throw new Falha("Não consegui ler o arquivo no aparelho."); });
    const pdf = new Blob([buf], { type: "application/pdf" });
    const [textos, b64] = await Promise.all([lerPaginas(buf), base64(pdf)]);
    job.etapa = "ia"; avisar();
    const d = await pedir(b64, codigo);
    try { localStorage.setItem(CH, codigo); } catch (e) {}
    job.etapa = "salvar"; avisar();
    let bruto;
    try { bruto = JSON.parse(d.texto.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "")); }
    catch (e) { throw new Falha(d.fim === "MAX_TOKENS" ? "O PDF rende mais conteúdo do que a IA gratuita consegue devolver de uma vez. Envie em partes menores." : "A IA devolveu uma resposta incompleta. Tente de novo."); }
    const { gerado, descartados } = normalizar(bruto, textos.length, file.name);
    const rec = { id: "u" + Date.now().toString(36), criadoEm: new Date().toISOString(), nome: file.name, paginas: textos.length, textos, gerado, modelo: d.modelo, pdf };
    let guardado = true;
    try { await salvar(rec); } catch (e) { console.warn(e); guardado = false; }
    const primeiro = integrar(rec);
    const soma = k => gerado.topicos.reduce((n, t) => n + t[k].length, 0);
    job = { ...job, etapa: "ok", res: { id: rec.id, titulo: gerado.titulo, primeiro, topicos: gerado.topicos.length, casos: soma("casos"), flashcards: soma("flashcards"), termos: gerado.glossario.length, descartados, guardado, imagens: textos.filter(t => !t).length, paginas: textos.length } };
    arquivo = null;
  } catch (e) {
    if (!(e instanceof Falha)) console.error(e);
    job = { ...job, etapa: "erro", msg: e.message || "Algo deu errado. Tente de novo.", tipo: e.tipo };
  }
  avisar();
  if (!ouvinte) aviso(job.etapa === "ok" ? "Seu PDF virou material de estudo. Veja na Trilha." : "Não deu para criar o material do PDF.");
}

const mb = n => (n / 1048576).toFixed(1).replace(".", ",") + " MB";

export function render() {
  return {
    titulo: "Adicionar PDF",
    voltar: "#/biblioteca",
    html: `
      <div class="page-head">
        <h1 class="page-title">Adicionar um PDF</h1>
        <p class="page-sub">Envie o PDF de uma aula. O Margem cria um módulo novo com tópicos, casos e flashcards a partir dele.</p>
      </div>
      <div id="add"></div>`,
    montar(el) {
      const box = el.querySelector("#add");
      let tm = null;
      const pintar = () => {
        clearInterval(tm);
        if (!job) return formulario(box, pintar);
        if (job.etapa === "ok") return pronto(box, pintar);
        if (job.etapa === "erro") return erro(box, pintar);
        andamento(box);
        const seg = () => { const s = box.querySelector("#seg"); if (s) s.textContent = tempo(Date.now() - job.inicio); };
        tm = setInterval(seg, 1000); seg();
      };
      ouvinte = pintar; pintar();
      return () => { ouvinte = null; clearInterval(tm); };
    },
  };
}

const tempo = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function formulario(box, pintar, erroCodigo = "") {
  let codigo = "";
  try { codigo = localStorage.getItem(CH) || ""; } catch (e) {}
  box.innerHTML = `
    <div class="card">
      <h2 class="passo-t"><span class="passo-n" aria-hidden="true">1</span>Escolha o arquivo</h2>
      <input type="file" id="arq" accept="application/pdf,.pdf" hidden>
      <button class="btn soft block mt-s" id="escolher" type="button">${ico.doc} Escolher PDF</button>
      <p class="hint" id="arq-info">Um PDF por vez, com até ${MAX_MB} MB.</p>

      <h2 class="passo-t mt"><span class="passo-n" aria-hidden="true">2</span><label for="cod">Código de acesso</label></h2>
      <input class="input mt-s" id="cod" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Digite o código" value="${esc(codigo)}">
      <p class="hint ${erroCodigo ? "err" : ""}" id="cod-info">${esc(erroCodigo) || "Quem te passou o Margem te passa o código. Ele fica salvo depois do primeiro envio."}</p>
    </div>

    <div class="card stack small mt">
      <p><strong>Antes de enviar</strong></p>
      <p>O PDF é enviado ao Gemini, a IA do Google, no plano gratuito. O Google pode usar o conteúdo para melhorar os produtos dele. Envie só material de aula, nunca documentos pessoais.</p>
      <p>O que a IA escrever não foi conferido por uma pessoa. Cada trecho mostra a página do PDF para você checar, e o material fica marcado como “Criado por IA”.</p>
    </div>

    <button class="btn block mt" id="criar" type="button" disabled>Criar material de estudo</button>`;
  const arq = box.querySelector("#arq"), cod = box.querySelector("#cod"), info = box.querySelector("#arq-info"), criar = box.querySelector("#criar");
  const checar = () => {
    let ok = !!arquivo;
    if (arquivo) {
      const pdf = arquivo.type === "application/pdf" || /\.pdf$/i.test(arquivo.name);
      const grande = arquivo.size > MAX_MB * 1048576;
      info.classList.toggle("err", !pdf || grande);
      info.textContent = !pdf ? "Esse arquivo não é um PDF." : grande ? `${arquivo.name} tem ${mb(arquivo.size)}. O limite é ${MAX_MB} MB.` : `${arquivo.name} · ${mb(arquivo.size)}`;
      box.querySelector("#escolher").innerHTML = `${ico.doc} Trocar o PDF`;
      ok = pdf && !grande;
    }
    criar.disabled = !(ok && cod.value.trim());
  };
  box.querySelector("#escolher").onclick = () => arq.click();
  arq.onchange = () => { if (arq.files[0]) { arquivo = arq.files[0]; checar(); } };
  cod.oninput = checar;
  criar.onclick = () => { processar(arquivo, cod.value.trim()); };
  checar();
  if (erroCodigo) cod.focus();
}

function andamento(box) {
  const ordem = ["ler", "ia", "salvar"], i = ordem.indexOf(job.etapa);
  const nomes = ["Lendo o PDF no seu aparelho", "Enviando e esperando a IA montar os tópicos", "Conferindo as páginas citadas e salvando"];
  box.innerHTML = `
    <div class="card" role="status" aria-live="polite">
      <p class="eyebrow">${esc(job.nome)}</p>
      <ol class="passos">
        ${nomes.map((n, k) => `<li class="${k < i ? "feito" : k === i ? "agora" : ""}"><span class="b" aria-hidden="true">${k < i ? ico.check : ""}</span><span>${n}${k === i ? "…" : ""}</span></li>`).join("")}
      </ol>
      <p class="hint">${job.espera ? esc(job.espera) : "Costuma levar de 1 a 3 minutos. Deixe o Margem aberto até terminar."} <span id="seg" class="seg"></span></p>
    </div>`;
}

function pronto(box, pintar) {
  const r = job.res;
  box.innerHTML = `
    <div class="card">
      <span class="tag ok">Pronto</span>
      <h2 class="section-title" style="margin:10px 0 6px">${esc(r.titulo)}</h2>
      <p>${plural(r.topicos, "tópico", "tópicos")}, ${plural(r.casos, "caso", "casos")}, ${plural(r.flashcards, "flashcard", "flashcards")} e ${plural(r.termos, "termo", "termos")} no glossário.</p>
      ${r.descartados ? `<p class="muted small mt-s">${plural(r.descartados, "item ficou", "itens ficaram")} de fora porque a IA não indicou uma página válida ou veio incompleto.</p>` : ""}
      ${r.imagens ? `<p class="muted small mt-s">${r.imagens === r.paginas ? "As páginas deste PDF são imagens" : `${plural(r.imagens, "página é imagem", "páginas são imagens")}`}: a IA leu o conteúdo, mas a busca do app não enxerga esse texto. Para conferir, abra a página no PDF.</p>` : ""}
      ${r.guardado ? "" : `<p class="small mt-s" style="color:var(--err)">Este navegador não deixou guardar o material. Ele some quando você fechar o app.</p>`}
      <p class="muted small mt-s">Criado por IA, sem revisão humana. Desconfiou de algo? Toque na página citada e confira no PDF.</p>
      <div class="stack mt">
        <a class="btn block" href="#/t/${r.primeiro}">Começar pelo primeiro tópico</a>
        <a class="btn ghost block" href="#/trilha">Ver na trilha</a>
        <button class="link-btn" id="outro" type="button" style="display:block;margin:0 auto">Enviar outro PDF</button>
      </div>
    </div>`;
  box.querySelector("#outro").onclick = () => { job = null; pintar(); };
}

function erro(box, pintar) {
  const j = job;
  if (j.tipo === "codigo") { try { localStorage.removeItem(CH); } catch (e) {} job = null; return formulario(box, pintar, j.msg); }
  box.innerHTML = `
    <div class="card">
      <span class="tag warn">Não deu certo</span>
      <p class="mt-s" style="font-weight:600">${esc(j.msg)}</p>
      <p class="muted small mt-s">Nada foi alterado no seu material nem no seu progresso.</p>
      <button class="btn block mt" id="de-novo" type="button">Tentar de novo</button>
    </div>`;
  box.querySelector("#de-novo").onclick = () => { job = null; pintar(); };
}
