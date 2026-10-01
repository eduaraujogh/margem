import { D } from "../data.js";
import { esc, fontes } from "../ui.js";

export function render() {
  const gs = D.glossario.slice().sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));
  return {
    titulo: "Glossário",
    voltar: "#/biblioteca",
    html: `
      <div class="page-head"><h1 class="page-title">Glossário</h1></div>
      <ul class="keypoints">
        ${gs.map(g => `<li id="${g.id}"><p class="kp" style="font-weight:600">${esc(g.termo)}</p><p class="reading mt-s" style="font-size:16px">${esc(g.definicao)}</p>${fontes(g.fontes)}</li>`).join("")}
      </ul>`,
  };
}
