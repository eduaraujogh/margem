// Margem: roteador e inicialização
import { carregar } from "./data.js";
import { carregarProgresso } from "./store.js";
import { fecharFolha, folhaAberta, esc } from "./ui.js";
import { abrirFonte, abrirTermo } from "./folhas.js";
import * as hoje from "./views/hoje.js";
import * as trilha from "./views/trilha.js";
import * as topico from "./views/topico.js";
import * as sessao from "./views/sessao.js";
import * as revisar from "./views/revisar.js";
import * as biblioteca from "./views/biblioteca.js";
import * as material from "./views/material.js";
import * as pdf from "./views/pdf.js";
import * as busca from "./views/busca.js";
import * as glossario from "./views/glossario.js";
import * as ajustes from "./views/ajustes.js";

const ROTAS = [
  [/^$/, hoje, "hoje"],
  [/^trilha$/, trilha, "trilha"],
  [/^t\/([\w-]+)(?:\/(\w+))?$/, topico, "trilha"],
  [/^sessao$/, sessao, null],
  [/^revisar$/, revisar, "revisar"],
  [/^biblioteca$/, biblioteca, "biblioteca"],
  [/^material\/([\w-]+)$/, material, "biblioteca"],
  [/^pdf\/([\w-]+)\/(\d+)$/, pdf, "biblioteca"],
  [/^busca$/, busca, null],
  [/^glossario$/, glossario, "biblioteca"],
  [/^ajustes$/, ajustes, null],
];

const main = document.getElementById("main");
const topbar = document.getElementById("topbar");
let limpar = null;
let primeira = true;

function rota() {
  const [caminho, qs] = location.hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(qs || "");
  for (const [re, view, aba] of ROTAS) {
    const m = caminho.match(re);
    if (m) return { view, aba, args: m.slice(1), params };
  }
  return { view: hoje, aba: "hoje", args: [], params };
}

function render() {
  fecharFolha();
  limpar?.(); limpar = null;
  const { view, aba, args, params } = rota();
  let r;
  try { r = view.render(...args, params); }
  catch (e) { console.error(e); r = { html: `<div class="empty">Não encontrei esta página.<br><a href="#/">Voltar ao início</a></div>` }; }
  main.innerHTML = `<div class="fade-in">${r.html}</div>`;
  document.title = r.titulo ? `${r.titulo} · Margem` : "Margem";
  document.getElementById("titulo-topo").textContent = r.titulo || "";
  const raiz = ["hoje", "trilha", "revisar", "biblioteca"].includes(aba) && args.length === 0;
  topbar.classList.toggle("has-back", !raiz);
  document.getElementById("voltar").hidden = raiz;
  document.body.classList.toggle("foco", !!r.foco);
  for (const a of document.querySelectorAll(".tabbar a")) {
    if (a.dataset.tab === aba) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  }
  window.scrollTo(0, 0);
  topbar.classList.remove("scrolled");
  limpar = r.montar?.(main) || null;
  if (!primeira) main.focus({ preventScroll: true });
  primeira = false;
  voltarPara = r.voltar || "#/";
}

let voltarPara = "#/";
document.getElementById("voltar").onclick = () => {
  if (history.length > 1 && sessionStorage.getItem("margem.nav")) history.back();
  else location.hash = voltarPara;
};

// cliques delegados: pílulas de fonte e termos
document.addEventListener("click", e => {
  const f = e.target.closest("[data-fonte]");
  if (f) { e.preventDefault(); abrirFonte(f.dataset.fonte); return; }
  const t = e.target.closest("[data-termo]");
  if (t) { e.preventDefault(); abrirTermo(t.dataset.termo); }
});
document.getElementById("sheet-fechar").onclick = fecharFolha;
document.getElementById("sheet-backdrop").onclick = fecharFolha;
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && folhaAberta()) fecharFolha();
  if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); location.hash = "#/busca"; }
});
// arrastar a folha para baixo fecha
(() => {
  const sh = document.getElementById("sheet"); let y0 = null;
  sh.addEventListener("touchstart", e => { if (document.getElementById("sheet-body").scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener("touchmove", e => { if (y0 != null && e.touches[0].clientY - y0 > 0) sh.style.transform = `translateY(${e.touches[0].clientY - y0}px)`; }, { passive: true });
  sh.addEventListener("touchend", e => { const dy = e.changedTouches[0].clientY - (y0 ?? 0); sh.style.transform = ""; if (y0 != null && dy > 90) fecharFolha(); y0 = null; });
})();
addEventListener("scroll", () => topbar.classList.toggle("scrolled", scrollY > 24), { passive: true });
addEventListener("hashchange", () => { try { sessionStorage.setItem("margem.nav", "1"); } catch (e) {} render(); });

(async () => {
  carregarProgresso();
  try {
    await carregar();
  } catch (e) {
    main.innerHTML = `<div class="empty">${esc(e.message)}<br><button class="btn small mt" onclick="location.reload()">Tentar de novo</button></div>`;
    return;
  }
  render();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
