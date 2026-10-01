"""Gera content/paginas.json: o texto de cada página dos PDFs, com origem.
origem: "texto" (extraído do PDF), "transcricao" (slide-imagem conferido à mão,
tools/transcricoes.json) ou "ocr" (reconhecido de imagem, não conferido).
Uso: python3 tools/extrair.py"""
import json, re, subprocess, glob, os

MATERIAIS = json.load(open("tools/materiais.json"))
TRANS = {k: v for k, v in json.load(open("tools/transcricoes.json")).items() if not k.startswith("_")}
IGNORAR = set(json.load(open("tools/ignorar.json")))

def n_paginas(pdf):
    return int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout).group(1))

def limpar(t):
    t = re.sub(r"\[cite:[^\]]*\]", "", t)            # marcas de citação soltas no PDF do plano de aula
    t = re.sub("[\uf0b7\uf0a7\uf0d8\uf076\uf0fc\uf06e\uf0a8]", "•", t)
    linhas = [l.strip() for l in t.splitlines()]
    out = []
    for l in linhas:
        if not l: 
            if out and out[-1] != "": out.append("")
            continue
        if re.fullmatch(r"[•o]+", l): out.append("•"); continue
        if out and out[-1] not in ("", "•") and not re.search(r"[.:?!;\"”)]$", out[-1]) and not re.match(r"^(•|-|\d+[.)]|[A-ZÁÉÍÓÚ][^ ]* ?\d*:)", l):
            out[-1] += " " + l
        elif out and out[-1] == "•":
            out[-1] = "• " + l
        else:
            out.append(l)
    out = [x for x in out if x != "•"]
    t = "\n".join(out)
    t = re.sub(r"\n{2,}", "\n", t)
    t = re.sub(r"(\w)- (\w)", r"\1\2", t)            # hifenização de quebra de linha
    return t.strip()

CABECALHOS = [r"^AULA 3 – PLANEJAMENTO ESTRATÉGICO.*$", r"^DATA: 20/08/2026$", r"^Podcast Gestão do Amanhã.*$", r"^.{0,3}$"]

def tirar_cabecalhos(t):
    for c in CABECALHOS:
        t = re.sub(c, "", t, flags=re.M)
    return re.sub(r"\n{2,}", "\n", t).strip()

def limpar_ocr(t, mat):
    if mat == "plataforma-a":
        t = re.sub(r"^\s*(?:E|Em|m|m)\s+(?=[A-Za-zÀ-ú])", "• ", t, flags=re.M)
        t = re.sub(r"^\s*Análise SWOT\s*\|+\s*\d+\s*$|^\s*\d+\s*[|)(]+\s*Análise SWOT\s*$", "", t, flags=re.M)
    return limpar(t)

paginas = []
for m in MATERIAIS:
    pdf = f"pdfs/{m['id']}.pdf"
    for p in range(1, n_paginas(pdf) + 1):
        pid = f"{m['id']}-p{p}"
        if pid in IGNORAR: continue
        if pid in TRANS:
            texto, origem = TRANS[pid], "transcricao"
        else:
            raw = subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), pdf, "-"], capture_output=True, text=True).stdout
            if len(re.sub(r"\s", "", raw)) >= 20:
                texto, origem = tirar_cabecalhos(limpar(raw)), "texto"
            else:
                f = f"tools/ocr/{m['id']}-{p}.txt"
                if not os.path.exists(f): continue
                texto, origem = tirar_cabecalhos(limpar_ocr(open(f).read(), m["id"])), "ocr"
        if len(re.sub(r"\s", "", texto)) < 25: continue
        paginas.append({"id": pid, "material": m["id"], "pagina": p, "origem": origem, "texto": texto})

json.dump(paginas, open("content/paginas.json", "w"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print(len(paginas), "páginas", Counter(x["origem"] for x in paginas))
