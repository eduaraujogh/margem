"""Valida o conteúdo antes de publicar.
- toda fonte citada existe em content/paginas.json
- questões: alternativa correta válida, sem alternativas repetidas
- termos e tópicos relacionados existem; IDs únicos
- nenhum travessão (—) em texto escrito para o app
- alerta de sobreposição: palavras do texto que não aparecem nas páginas citadas (conferir à mão)"""
import json, glob, re, unicodedata, sys
P = {p["id"]: p for p in json.load(open("content/paginas.json"))}
G = {g["id"]: g for g in json.load(open("content/src/glossario.json"))}
erros, alertas, ids = [], [], set()
def norm(s): return unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
STOP = set(norm(w) for w in "a o e de da do das dos em no na nos nas um uma para por com que se ao aos sua seu suas seus ou mas como mais é são ser foi não sem entre pela pelo the of é".split())
def palavras(s): return [w for w in re.findall(r"[a-z0-9]{4,}", norm(s)) if w not in STOP]
def checar(onde, texto, fontes):
    if "—" in texto: erros.append(f"{onde}: travessão no texto")
    if not fontes: erros.append(f"{onde}: sem fonte"); return
    for f in fontes:
        if f not in P: erros.append(f"{onde}: fonte inexistente {f}")
    base = norm(" ".join(P[f]["texto"] for f in fontes if f in P))
    ws = set(palavras(texto)); falt = [w for w in ws if w[:5] not in base]
    if ws and len(falt) / len(ws) > 0.45: alertas.append(f"{onde}: {len(falt)}/{len(ws)} palavras fora da fonte: {' '.join(sorted(falt)[:12])}")
def uid(i):
    if i in ids: erros.append(f"ID repetido {i}")
    ids.add(i)
for g in G.values():
    uid(g["id"]); checar(g["id"], g["definicao"], g["fontes"])
tops = {}
for f in sorted(glob.glob("content/src/m*.json")):
    d = json.load(open(f))
    for t in d["topicos"]: tops[t["id"]] = t
    for t in d["topicos"]:
        uid(t["id"])
        for i, b in enumerate(t["aprender"]): checar(f"{t['id']}.aprender[{i}]", b["texto"], b["fontes"])
        for i, b in enumerate(t["pontosChave"]): checar(f"{t['id']}.chave[{i}]", b["texto"], b["fontes"])
        for x in t["termos"]:
            if x not in G: erros.append(f"{t['id']}: termo inexistente {x}")
    for q in d["questoes"]:
        uid(q["id"])
        if q["tipo"] == "multipla":
            if not 0 <= q["correta"] < len(q["alternativas"]): erros.append(f"{q['id']}: correta fora do intervalo")
            if len(set(q["alternativas"])) != len(q["alternativas"]): erros.append(f"{q['id']}: alternativas repetidas")
            checar(q["id"], q["enunciado"] + " " + q["alternativas"][q["correta"]] + " " + q["explicacao"], q["fontes"])
        else:
            checar(q["id"], q["frente"] + " " + q["verso"], q["fontes"])
for t in tops.values():
    for r in t["relacionados"]:
        if r not in tops: erros.append(f"{t['id']}: relacionado inexistente {r}")
    for q in []: pass
qt = {}
for f in glob.glob("content/src/m*.json"):
    for q in json.load(open(f))["questoes"]:
        if q["topico"] not in tops: erros.append(f"{q['id']}: tópico inexistente")
        qt[q["topico"]] = qt.get(q["topico"], 0) + 1
for t in tops:
    if qt.get(t, 0) < 2: alertas.append(f"{t}: só {qt.get(t,0)} questões")
print(f"{len(erros)} erros, {len(alertas)} alertas")
for e in erros: print("ERRO", e)
for a in alertas: print("CONFERIR", a)
sys.exit(1 if erros else 0)
