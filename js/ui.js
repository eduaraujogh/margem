// Utilitários de interface: escape, ícones, folha inferior, aviso
import { fonte } from "./data.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const ico = {
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  mais: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13"/></svg>',
  ext: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v5.5H4.5V7H10"/></svg>',
};

// Pílulas de fonte: <button class="src" data-fonte="aula2-p12">Aula 2 · p. 12</button>
export function fontes(ids = []) {
  if (!ids.length) return "";
  return `<div class="src-row">${ids.map(id => {
    const f = fonte(id);
    if (!f) return "";
    return `<button class="src" type="button" data-fonte="${esc(id)}" aria-label="Ver fonte: ${esc(f.mat.titulo)}, página ${f.pagina}">${ico.doc}${esc(f.rotulo)}</button>`;
  }).join("")}</div>`;
}

const $ = id => document.getElementById(id);
let ultimoFoco = null;

export function abrirFolha(titulo, html, aoAbrir) {
  ultimoFoco = document.activeElement;
  $("sheet-titulo").textContent = titulo;
  $("sheet-body").innerHTML = html;
  $("sheet").hidden = false; $("sheet-backdrop").hidden = false;
  $("sheet-body").scrollTop = 0;
  document.body.style.overflow = "hidden";
  $("sheet-fechar").focus();
  aoAbrir?.($("sheet-body"));
}
export function fecharFolha() {
  if ($("sheet").hidden) return;
  $("sheet").hidden = true; $("sheet-backdrop").hidden = true;
  document.body.style.overflow = "";
  ultimoFoco?.focus?.();
}
export const folhaAberta = () => !$("sheet").hidden;

let tt;
export function aviso(msg) {
  const t = $("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2600);
}

export function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function anel(pct, rotulo = `${pct}%`, tam = 58, esp = 6, cls = "ring") {
  const r = (tam - esp) / 2, c = 2 * Math.PI * r;
  return `<div class="${cls}" role="img" aria-label="${pct}%"><svg viewBox="0 0 ${tam} ${tam}" aria-hidden="true"><circle class="trk" cx="${tam / 2}" cy="${tam / 2}" r="${r}"/><circle class="val" cx="${tam / 2}" cy="${tam / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(pct, 100)) / 100)}"/></svg><b>${rotulo}</b></div>`;
}
export const numMod = id => id.replace("mod", "");

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
