# Unificando PDF

Ferramenta web de PDF focada em privacidade: nenhum arquivo é armazenado permanentemente. O processamento acontece no servidor, usando arquivos temporários em `/tmp`, e tudo é descartado logo após o download.

## O que o produto oferece

- 16 ferramentas de PDF em uma única interface
- Conversões, compressão, reorganização, proteção e redaction
- Área de tutoriais e guias práticos
- Interface em português, com SEO, sitemap, robots e Open Graph
- PWA com suporte a instalação e experiência de uso contínua
- Banners de estado, erro e conectividade para uma UX mais robusta

## Ferramentas disponíveis

| Ferramenta | Descrição |
|---|---|
| Comprimir PDF | Reduz o tamanho do PDF mantendo a qualidade |
| Juntar PDF | Une vários PDFs em um único arquivo |
| Dividir PDF | Extrai páginas ou intervalos de um PDF |
| Extrair Páginas | Separa páginas selecionadas em PDFs individuais dentro de um `.zip` |
| PDF para Word | Converte PDF em documento `.docx` editável |
| PDF para TXT | Extrai o texto do PDF em um arquivo `.txt` |
| PDF para JPG | Converte páginas do PDF em imagens JPG |
| JPG para PDF | Une imagens JPG, JPEG e PNG em um único PDF |
| Rodar PDF | Gira páginas do PDF em qualquer ângulo |
| Organizar PDF | Reordena ou exclui páginas com drag and drop |
| Proteger PDF | Adiciona senha ao PDF para proteger o acesso |
| Marca d'Água | Adiciona texto de marca d'água em todas as páginas |
| Numerar Páginas | Adiciona numeração automática no cabeçalho ou rodapé |
| PDF para PNG | Converte páginas do PDF em PNG, com fundo transparente |
| Censurar PDF | Oculta permanentemente informações sensíveis com retângulos pretos |
| PDF para Markdown | Converte PDF em Markdown estruturado, útil para RAG e IA |

## Recursos adicionais

- Página de tutoriais em `/tutoriais`
- Página de privacidade em `/privacidade`
- Rota de saúde em `/api/health`
- Fluxos de processamento com fila, limite de concorrência e retry
- Download direto após o processamento
- Metadados completos para indexação e compartilhamento

## Stack

- **Next.js 16** com App Router
- **React 19**
- **TypeScript 5** em modo strict
- **Tailwind CSS 4**
- **pdf-lib** para manipulação de PDFs
- **pdfjs-dist** para leitura e renderização de páginas
- **sharp** e **@napi-rs/canvas** para processamento de imagens
- **archiver** para geração de `.zip`
- **Framer Motion** e **dnd-kit** para animações e drag and drop

## Processamento e dependências

Algumas ferramentas usam binários nativos no servidor:

- **Ghostscript**: compressão e proteção por senha
- **LibreOffice**: conversão de PDF para Word
- **Poppler**: conversão de PDF para JPG
- **qpdf**: apoio em tarefas de manipulação de PDF

Se estiver rodando fora do Docker, instale esses pacotes no seu sistema. No macOS, por exemplo:

```bash
brew install ghostscript libreoffice poppler qpdf
```

## Rodando localmente

```bash
npm install
npm run dev
```

A aplicação sobe em [http://localhost:11005](http://localhost:11005).

## Variáveis de ambiente

Copie o arquivo de exemplo para começar:

```bash
cp .env.example .env.local
```

### Variáveis de servidor

| Variável | Descrição | Padrão |
|---|---|---|
| `NODE_ENV` | Ambiente de execução | `production` |
| `API_SECRET_KEY` | Chave secreta para operações sensíveis | `troque-por-uma-chave-segura` |
| `SITE_URL` | URL pública do site | `https://pdf.unificando.com.br` |
| `MAX_FILE_SIZE` | Tamanho máximo de upload em bytes | `52428800` |
| `MAX_CONCURRENT_JOBS` | Jobs processados em paralelo | `2` |
| `MAX_QUEUE_SIZE` | Tamanho máximo da fila | `5` |
| `RETRY_AFTER_SECONDS` | Tempo de espera quando a fila está cheia | `30` |
| `ALLOWED_ORIGIN` | Origem permitida para requisições CORS | `https://pdf.unificando.com.br` |
| `API_SECRET_KEY` | Proteção opcional da API (/api/pdf/* exige Bearer) | — (auth desativada) |

### Variáveis públicas

| Variável | Descrição | Padrão |
|---|---|---|
| `NEXT_PUBLIC_GA_ID` | ID do Google Analytics | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_ADSENSE_ID` | ID do Google AdSense | `ca-pub-XXXXXXXXXX` |
| `NEXT_PUBLIC_ADSENSE_RESULT_SLOT` | Slot de anúncio na área de resultado | `1234567890` |
| `NEXT_PUBLIC_ADSENSE_FOOTER_SLOT` | Slot de anúncio no rodapé | `0987654321` |
| `NEXT_PUBLIC_DONATION_URL` | Link de apoio ao projeto | `https://buymeacoffee.com/seu-perfil` |
| `NEXT_PUBLIC_DONATION_PIX_KEY` | Chave PIX para doação | `sua-chave-pix` |
| `NEXT_PUBLIC_DONATION_MESSAGE` | Mensagem exibida no banner de apoio | `Se esta ferramenta te ajudou, sua contribuicao ajuda a manter o projeto no ar.` |

Analytics, AdSense e doações são opcionais. O app funciona normalmente sem essas variáveis.

## Build e produção

```bash
npm run build
npm start
```

## Testes

```bash
npm run lint
npm run test
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Docker

```bash
docker compose up -d --build
```

O `docker-compose.yml` expõe a aplicação em `127.0.0.1:11005` e já inclui as dependências nativas necessárias dentro do container. O ambiente usa `tmpfs` para `/tmp`, cache do Next e cache do usuário, mantendo o sistema mais previsível e descartável.

## Estrutura do projeto

```text
src/
  app/           # App Router, páginas, layouts e rotas de API
  components/    # Layout, upload, SEO, PWA, erros e processamento
  config/        # Metadados das ferramentas e tutoriais
  hooks/         # Hooks de UI e fluxo de arquivos
  lib/           # Processamento de PDF, utilitários, fila e analytics
  styles/        # Tokens e estilos globais
tests/           # Unit, integration e e2e
```

## Privacidade

- Nenhum arquivo enviado é persistido em banco ou armazenamento permanente
- O processamento usa arquivos temporários em `/tmp`
- Os arquivos temporários são removidos assim que o download é concluído

