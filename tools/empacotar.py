"""Junta materiais, páginas, módulos, tópicos, questões e glossário em content/conteudo.json.
Uso: python3 tools/extrair.py && python3 tools/validar.py && python3 tools/empacotar.py"""
import json, glob, re, subprocess
mats = json.load(open("tools/materiais.json"))
pags = json.load(open("content/paginas.json"))
for m in mats:
    m["arquivo"] = f"pdfs/{m['id']}.pdf"
    info = subprocess.run(["pdfinfo", m["arquivo"]], capture_output=True, text=True).stdout
    m["paginas"] = int(re.search(r"Pages:\s+(\d+)", info).group(1))
mods, tops, qs = [], [], []
for f in sorted(glob.glob("content/src/m*.json")):
    d = json.load(open(f))
    mods.append(d["modulo"])
    for i, t in enumerate(d["topicos"]):
        t["modulo"] = d["modulo"]["id"]; t["ordem"] = i
        tops.append(t)
    qs += d["questoes"]
# casos: "Na prática" por tópico, questões de caso criadas e marcação dos casos que já vinham do material
casos = json.load(open("content/src/casos.json"))
for t in tops:
    if t["id"] in casos["pratica"]: t["pratica"] = casos["pratica"][t["id"]]
for x in qs:
    if x["id"] in casos["casosDoMaterial"]: x["caso"] = True
qs += casos["questoes"]
out = {"versao": 2, "materiais": mats, "modulos": mods, "topicos": tops, "questoes": qs,
       "glossario": json.load(open("content/src/glossario.json")), "paginas": pags}
json.dump(out, open("content/conteudo.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"{sum(1 for x in qs if x.get('caso'))} questões de caso ({sum(1 for x in qs if x.get('criado'))} com cenário criado)")
print(f"{len(mods)} módulos, {len(tops)} tópicos, {len(qs)} questões, {len(out['glossario'])} termos, {len(pags)} páginas")
