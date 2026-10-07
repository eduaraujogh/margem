import { D } from "../data.js";
import { esc, aviso, abrirFolha, fecharFolha } from "../ui.js";
import { exportar, importar, apagar, estado, hoje } from "../store.js";

export function render() {
  const s = estado();
  let tema = "light";
  try { tema = localStorage.getItem("margem.tema") === "dark" ? "dark" : "light"; } catch (e) {}
  const reps = s.reportes || [];
  const nOcr = D.paginas.filter(p => p.origem === "ocr").length;
  const nTrans = D.paginas.filter(p => p.origem === "transcricao").length;
  return {
    titulo: "Ajustes",
    html: `
      <div class="page-head"><h1 class="page-title">Ajustes</h1></div>

      <section class="section">
        <h2 class="section-title">Aparência</h2>
        <div class="tabs" role="radiogroup" aria-label="Tema" style="position:static;max-width:280px">
          ${[["light", "Sépia"], ["dark", "Escuro"]].map(([k, n]) => `<button type="button" role="radio" aria-selected="${tema === k}" aria-checked="${tema === k}" data-tema="${k}">${n}</button>`).join("")}
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Backup do progresso</h2>
        <div class="card stack">
          <p class="small">Seu progresso fica salvo só neste aparelho e neste navegador. Para passar do celular para o computador (ou não perder nada), exporte o arquivo e importe no outro aparelho.</p>
          <div class="btn-row"><button class="btn soft small" id="exp" type="button">Exportar</button><button class="btn ghost small" id="imp" type="button">Importar</button></div>
          <input type="file" id="arq" accept="application/json,.json" hidden>
          <p class="muted small">${s.respostas.length} respostas registradas${reps.length ? ` · ${reps.length} ${reps.length === 1 ? "aviso de erro" : "avisos de erro"}` : ""}.</p>
        </div>
      </section>

      ${reps.length ? `
      <section class="section">
        <h2 class="section-title">Seus avisos de erro</h2>
        <div class="list">${reps.slice().reverse().map(r => `<div class="item"><div class="grow"><div class="t small">${esc(r.motivo)}</div><div class="s">${esc(r.alvo)} · ${new Date(r.em).toLocaleDateString("pt-BR")}</div></div></div>`).join("")}</div>
        <p class="hint">Mande o arquivo exportado para quem cuida do conteúdo corrigir.</p>
      </section>` : ""}

      <section class="section">
        <h2 class="section-title">Sobre o conteúdo</h2>
        <div class="card stack small">
          <p>Tudo aqui foi escrito a partir dos ${D.materiais.length} materiais da disciplina. Cada explicação, ponto-chave, questão e termo indica a página de onde veio.</p>
          <p>As situações do bloco “Na prática” e das questões marcadas como “Situação criada para praticar” foram inventadas para treinar a aplicação. O conceito cobrado e a resposta certa continuam vindo do material, com a página indicada.</p>
          <p>Alguns slides são imagens. ${nTrans} páginas desse tipo foram transcritas e conferidas. Outras ${nOcr} foram lidas automaticamente e aparecem com o aviso “pode ter erros de leitura”; na dúvida, abra o PDF.</p>
          <p>Viu algo errado? Use “Isso está errado?” nas questões.</p>
        </div>
      </section>

      <section class="section">
        <button class="link-btn" id="zerar" type="button" style="color:var(--err)">Apagar todo o progresso deste aparelho</button>
      </section>`,
    montar(el) {
      el.querySelectorAll("[data-tema]").forEach(b => b.onclick = () => {
        const t = b.dataset.tema;
        try { localStorage.setItem("margem.tema", t); } catch (e) {}
        if (t === "light") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
        el.querySelectorAll("[data-tema]").forEach(x => { x.setAttribute("aria-selected", x === b); x.setAttribute("aria-checked", x === b); });
      });
      el.querySelector("#exp").onclick = () => {
        const blob = new Blob([exportar()], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = `margem-progresso-${hoje()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        aviso("Arquivo de progresso salvo.");
      };
      const arq = el.querySelector("#arq");
      el.querySelector("#imp").onclick = () => arq.click();
      arq.onchange = async () => {
        const f = arq.files[0]; if (!f) return;
        try { importar(await f.text()); aviso("Progresso importado."); location.hash = "#/"; }
        catch (e) { aviso("Esse arquivo não é um backup do Margem."); }
      };
      el.querySelector("#zerar").onclick = () => abrirFolha("Apagar progresso?", `
        <p>Isso apaga respostas, revisões, notas e avisos deste aparelho. Não dá para desfazer, a não ser que você tenha um backup exportado.</p>
        <div class="actions"><button class="btn" id="sim" type="button" style="background:var(--err)">Apagar tudo</button><button class="btn ghost" id="nao" type="button">Cancelar</button></div>`, c => {
        c.querySelector("#sim").onclick = () => { apagar(); fecharFolha(); aviso("Progresso apagado."); location.hash = "#/"; };
        c.querySelector("#nao").onclick = fecharFolha;
      });
    },
  };
}
