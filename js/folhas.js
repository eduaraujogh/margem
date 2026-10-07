// Folhas inferiores reutilizadas: fonte, termo do glossário, reportar erro
import { D, fonte } from "./data.js";
import { esc, ico, abrirFolha, fecharFolha, aviso, fontes } from "./ui.js";
import { reportar } from "./store.js";

export const ORIGEM = {
  texto: { rotulo: "Texto do PDF", cls: "" },
  transcricao: { rotulo: "Slide em imagem, transcrito e conferido", cls: "" },
  ocr: { rotulo: "Lido de imagem: pode ter erros de leitura", cls: "ocr" },
  imagem: { rotulo: "Página em imagem", cls: "" },
};

export function abrirFonte(id) {
  const f = fonte(id);
  if (!f) return;
  const o = ORIGEM[f.origem];
  abrirFolha(`${f.mat.titulo}`, `
    <div class="row" style="justify-content:space-between;margin-bottom:12px">
      <span class="tag">Página ${f.pagina}</span>
      <span class="origem ${o.cls}">${esc(o.rotulo)}</span>
    </div>
    ${f.texto ? `<div class="quote">${esc(f.texto)}</div>` : `<p class="muted">Esta página do PDF é uma imagem, então não há texto para mostrar aqui. Abra a página para conferir.</p>`}
    <div class="actions">
      <a class="btn" href="#/pdf/${esc(f.material)}/${f.pagina}">${ico.doc} Ver a página no PDF</a>
    </div>`);
  document.querySelector("#sheet-body a.btn")?.addEventListener("click", fecharFolha);
}

export function abrirTermo(id) {
  const g = D.termo[id];
  if (!g) return;
  abrirFolha(g.termo, `<p class="reading" style="font-size:17px">${esc(g.definicao)}</p>${fontes(g.fontes)}`);
}

export function abrirReporte(alvo, descricao) {
  abrirFolha("Algo errado aqui?", `
    <p class="muted small">${esc(descricao)}</p>
    <label class="lbl" for="rep-motivo">O que está errado?</label>
    <textarea class="input" id="rep-motivo" placeholder="Ex.: a resposta certa não bate com o slide"></textarea>
    <p class="hint">Fica salvo no seu progresso. Ao exportar, o arquivo leva esse aviso para corrigirmos o conteúdo.</p>
    <div class="actions"><button class="btn" id="rep-enviar" type="button">Salvar aviso</button></div>`, corpo => {
    corpo.querySelector("#rep-enviar").onclick = () => {
      const m = corpo.querySelector("#rep-motivo").value.trim();
      if (!m) { corpo.querySelector("#rep-motivo").focus(); return; }
      reportar(alvo, m);
      fecharFolha();
      aviso("Aviso salvo. Obrigado!");
    };
  });
}
