# Projecao futura - PDF Unificando

## Leitura atual do projeto

A base atual ja vai alem de um site simples de "juntar PDF". O produto ja possui:

- Comprimir PDF
- Juntar PDF
- Dividir PDF
- Organizar PDF
- Rodar PDF
- Proteger PDF
- Marca d'agua
- Redigir PDF
- PDF para Word
- PDF para JPG
- PDF para PNG
- JPG para PDF

O padrao tecnico atual facilita expansoes pequenas porque as ferramentas seguem uma estrutura consistente:

- `src/lib/pdf/*`
- `src/app/api/pdf/*`
- `src/app/ferramentas/*`
- testes unitarios e, em alguns casos, integracao

## Adicoes rapidas sem mudar a proposta

### 1. Desbloquear PDF

Prioridade alta.

Motivos:

- Complementa naturalmente `proteger-pdf`
- Ja existe expectativa dessa capacidade na copy atual do site
- Tem bom valor pratico para usuarios que so querem editar ou converter um arquivo protegido

### 2. Extrair paginas do PDF

Separar paginas selecionadas em arquivos individuais, idealmente com download em `.zip`.

Motivos:

- Reaproveita bastante da logica de `dividir-pdf`
- E uma acao comum e facil de explicar para SEO

### 3. PDF para TXT

Extrair apenas o texto do PDF em `.txt`.

Motivos:

- Reaproveita a extracao textual de `pdf-para-word`
- Entrega rapida
- Boa utilidade para quem quer copiar conteudo ou fazer leitura simples

### 4. Numerar paginas

Adicionar numeracao automatica no rodape ou cabecalho.

Motivos:

- Reaproveita conceitos do `marca-dagua`
- Tem uso real em documentos juridicos, academicos e administrativos

### 5. Girar paginas especificas

Expandir `rodar-pdf` para aceitar intervalos e listas de paginas.

Motivos:

- Melhora bastante a utilidade sem criar ferramenta totalmente nova
- Reaproveita logica de paginas ja existente no projeto

## O que nao priorizar agora

- OCR
- assinatura eletronica
- login e historico
- dashboard
- IA e recursos fora do nucleo PDF

Esses itens podem fazer sentido depois, mas aumentam bastante o escopo atual.

## Ajustes de copy importantes

### PDF para Word

A pagina nao deve prometer OCR enquanto o backend falha com PDFs escaneados ou compostos apenas por imagem.

### Proteger PDF

A pagina nao deve sugerir que o proprio site ja remove senha, porque essa ferramenta ainda nao existe.

Isso reforca a oportunidade de lancar `desbloquear-pdf` como proxima extensao natural do catalogo.
