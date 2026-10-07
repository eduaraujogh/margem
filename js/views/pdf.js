// Visualizador de PDF (PDF.js), abre direto na página citada
import { D } from "../data.js";
import { esc, ico } from "../ui.js";
import { pdfjs } from "../pdfjs.js";

const cache = {};

export function render(mid, pg) {
  const m = D.mat[mid];
  if (!m) throw new Error("material");
  const total = m.paginas;
  let pagina = Math.max(1, Math.min(+pg || 1, total));
  return {
    titulo: `${m.curto}, p. ${pagina}`,
    voltar: `#/material/${mid}`,
    html: `
      <div class="page-head" style="padding-bottom:8px">
        <div class="eyebrow">${esc(m.tipo)}</div>
        <h1 class="page-title" style="font-size:22px">${esc(m.titulo)}</h1>
      </div>
      <div class="pdf-bar">
        <button class="btn ghost small" id="ant" type="button" aria-label="Página anterior">‹</button>
        <span class="pg" id="pg" aria-live="polite">p. ${pagina} de ${total}</span>
        <button class="btn ghost small" id="prox" type="button" aria-label="Próxima página">›</button>
      </div>
      <div class="pdf-wrap" id="wrap"><div class="loading">Carregando a página…</div></div>
      <p class="mt" style="text-align:center"><a class="link-btn" href="${m.arquivo}#page=${pagina}" target="_blank" rel="noopener" id="ext">Abrir o arquivo original ${ico.ext}</a></p>`,
    montar(el) {
      let vivo = true;
      const wrap = el.querySelector("#wrap");
      const ir = async n => {
        pagina = n;
        el.querySelector("#pg").textContent = `p. ${n} de ${total}`;
        el.querySelector("#ant").disabled = n <= 1;
        el.querySelector("#prox").disabled = n >= total;
        el.querySelector("#ext").href = `${m.arquivo}#page=${n}`;
        history.replaceState(null, "", `#/pdf/${mid}/${n}`);
        try {
          const lib = await pdfjs();
          const doc = cache[mid] ||= await lib.getDocument({ url: m.arquivo }).promise;
          const page = await doc.getPage(n);
          if (!vivo || n !== pagina) return;
          const larg = wrap.clientWidth || 360;
          const base = page.getViewport({ scale: 1 });
          const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
          const vp = page.getViewport({ scale: (larg / base.width) * dpr });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          c.setAttribute("role", "img"); c.setAttribute("aria-label", `Página ${n} de ${m.titulo}`);
          await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
          if (!vivo || n !== pagina) return;
          wrap.replaceChildren(c);
        } catch (e) {
          console.error(e);
          wrap.innerHTML = `<div class="loading">Não consegui mostrar o PDF aqui.<br><a class="btn small mt" href="${m.arquivo}#page=${n}" target="_blank" rel="noopener">Abrir o arquivo na página ${n}</a></div>`;
        }
      };
      el.querySelector("#ant").onclick = () => pagina > 1 && ir(pagina - 1);
      el.querySelector("#prox").onclick = () => pagina < total && ir(pagina + 1);
      // deslizar para trocar de página
      let x0 = null;
      wrap.addEventListener("touchstart", e => { if (e.touches.length === 1) x0 = e.touches[0].clientX; }, { passive: true });
      wrap.addEventListener("touchend", e => {
        if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 60) { if (dx < 0 && pagina < total) ir(pagina + 1); else if (dx > 0 && pagina > 1) ir(pagina - 1); }
      });
      ir(pagina);
      return () => { vivo = false; };
    },
  };
}
