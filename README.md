# Margem

Plataforma de estudos de Planejamento Estratégico feita a partir dos 8 PDFs da disciplina. Site estático (HTML, CSS e JavaScript), sem backend, pensado para o celular.

## Publicar

- **GitHub Pages:** suba esta pasta para um repositório público e ative *Settings → Pages → Deploy from branch → main / (root)*.
- **Netlify:** arraste a pasta (ou o .zip) em app.netlify.com/drop.

Para testar no computador, rode um servidor local na pasta (`python3 -m http.server`) e abra `http://localhost:8000`. Abrir o `index.html` com dois cliques não funciona, porque o navegador bloqueia a leitura do conteúdo por `file://`.

## Estrutura

```
index.html, css/, js/          o app
js/views/                      uma tela por arquivo
content/conteudo.json          tudo o que o app mostra (gerado)
content/paginas.json           texto de cada página dos PDFs (gerado)
content/src/m1..m5.json        tópicos e questões de cada módulo (editar aqui)
content/src/glossario.json     termos (editar aqui)
pdfs/                          os 8 PDFs (imagens comprimidas, texto idêntico ao original)
tools/                         scripts de extração, validação e empacotamento
```

## Regra do conteúdo

Todo texto (explicação, ponto-chave, questão, termo) cita a página de onde veio (`"fontes": ["aula2-p12"]`). Nada é escrito sem fonte nos PDFs.

Slides que são imagem: os usados no conteúdo foram transcritos e conferidos à mão (`tools/transcricoes.json`). Os demais foram lidos por OCR e aparecem no app com o aviso "pode ter erros de leitura".

## Atualizar o conteúdo

```
python3 tools/extrair.py     # PDFs -> content/paginas.json
python3 tools/validar.py     # confere fontes, gabaritos, IDs e aponta trechos para revisar
python3 tools/empacotar.py   # gera content/conteudo.json
```

Depois de publicar uma nova versão, troque `V` em `sw.js` (ex.: `margem-v2`) para os celulares baixarem a atualização.

## Progresso

Fica no navegador de cada aparelho. Em *Ajustes* dá para exportar e importar (para passar do celular para o computador ou fazer backup). Os avisos de "Isso está errado?" vão junto no arquivo exportado.
