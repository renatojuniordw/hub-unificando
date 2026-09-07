# Ferramentas — como funcionam e como criar uma nova

Este guia descreve o padrão de uma ferramenta PDF e o passo a passo para adicionar uma nova ao catálogo.

## Como cada ferramenta funciona

Existem **16 ferramentas**; todas seguem o mesmo fluxo de 6 camadas:

```
1. Catálogo        src/config/tools.ts            (registro + SEO)
2. Motor           src/lib/pdf/<slug>.ts          (Buffer → Buffer)
3. API             src/app/api/pdf/<apiSlug>/route.ts
4. Página pública  src/app/ferramentas/<slug>/page.tsx        (Server Component)
5. Interação       src/app/ferramentas/<slug>/<Tool>Client.tsx (Client Component)
6. Testes          tests/unit/lib/pdf/* + tests/integration/api/routes.test.ts
```

### 1. Catálogo — `src/config/tools.ts`

Adicione um item ao array `tools` (ver campos em [`data.md`](./data.md)). O slug alimenta a home, o sitemap, os tutoriais e o SEO.

### 2. Motor — `src/lib/pdf/<slug>.ts`

Função pura que recebe `Buffer` (ou `Buffer[]`) e parâmetros, e retorna `Buffer` (ou estrutura derivada). Exemplos:

- `compress.ts` — `compressPdf(input, quality?)` via **Ghostscript** (com política restritiva) ou fallback pdf-lib
- `merge.ts` — `mergePdfs(inputs: Buffer[])` via pdf-lib
- `split.ts` — `splitPdf(input, range)` via pdf-lib
- `to-word.ts` — `pdfToWord(input)` via **LibreOffice**
- `to-jpg.ts` / `to-png.ts` — via **pdftoppm** (poppler) + sharp/@napi-rs/canvas
- `redact.ts` — via pdfjs-dist + @napi-rs/canvas (render + redação)
- `text.ts` — extração de texto via pdfjs-dist

Operações que chamam **binários externos** devem ser executadas com `binaryLimit(() => ...)` (`src/lib/queue.ts`) para respeitar a concorrência global, e podem usar `withTmpFile` (`src/lib/utils/tmp.ts`) para arquivos temporários.

### 3. API — `src/app/api/pdf/<apiSlug>/route.ts`

Handler `POST` no padrão (veja `src/app/api/pdf/*/route.ts` existentes):

```ts
export async function POST(req: NextRequest) {
  try {
    validateRateLimit(req)                                  // 429 ip/sobrecarga
    const { formData, buffer, fileName } = await parseSinglePdfUpload(req)
    // ou parsePdfUploads / parseImageUploads p/ multi-arquivo
    const result = await binaryLimit(() => motorDoPdf(buffer, param))
    return streamResponse(result, buildOutputFilename(fileName, 'pdf'), 'application/pdf')
  } catch (err) {
    return errorResponse(err)                               // envelope JSON
  }
}
```

Helpers de `src/lib/utils/http.ts`:

| Helper | Uso |
|---|---|
| `parseSinglePdfUpload(req)` | 1 PDF + honeypot + tamanho + magic bytes |
| `parsePdfUploads(req, min?, maxTotal?)` | N PDFs (mín/máx, total) |
| `parseImageUploads(req, maxTotal?)` | N JPG/PNG |
| `requireFormField(formData, name, msg, reason, opts?)` | campo obrigatório com trim/maxLength |
| `streamResponse(buffer, filename, mime)` | resposta binária com `Content-Disposition` |
| `errorResponse(err)` | converte `ApiError` p/ envelope JSON |

O slug da API costuma ser **inglês** (`merge`, `split`, `rotate`, `to-jpg`); o slug público é **português** (`juntar-pdf`). As páginas e tutoriais apontam para o slug público; o client aponta para o endpoint.

### 4. Página pública — `src/app/ferramentas/<slug>/page.tsx`

Server Component que define `metadata` (title/description/canonical) e renderiza o shell + o Client Component:

```tsx
import { ToolPageShell } from '@/components/layout/ToolPageShell'
import { MinhaFerramentaClient } from './MinhaFerramentaClient'

export const metadata = { title: '...', description: '...' }
export default function Page() {
  return (
    <ToolPageShell title="..." description="..." seoDescription="...">
      <MinhaFerramentaClient />
    </ToolPageShell>
  )
}
```

### 5. Interação — `<MinhaFerramentaClient>.tsx`

Client Component (`'use client'`) que usa `useFileProcessor` (`src/hooks/useFileProcessor.ts`) como máquina de estados centralizada (upload, processamento, retry, análise, download). Padrão dos componentes existentes:

```tsx
'use client'
const { status, error, downloadUrl, outputName, processedSize, process,
        retryLast, reset, secondsLeft, progress } = useFileProcessor({
  endpoint: '/api/pdf/<apiSlug>',
  toolName: '<slug>',                 // p/ analytics
  outputFilename: 'saida.pdf',
  timeoutMs: 120_000,                 // 60s default; 120s para multi-arquivo pesado
})

// upload
<DropZone accept={{ 'application/pdf': ['.pdf'] }} multiple onDrop={handleDrop} />
{files.length > 0 && <FileQueue files={files} onReorder={setFiles} onRemove={...} />}

// estados
<ProcessingStatePanel status={status} secondsLeft={secondsLeft} progress={progress}
  onRetry={retryLast} error={error} onReset={reset} />

// conclusão
{status === 'done' && downloadUrl && (
  <SuccessDownload url={downloadUrl} filename={outputName!} onDownload={...}
    fileSize={processedSize} onReset={reset} title="..." />
)}
```

**Multi-arquivo** (merge, jpg-para-pdf): adicionalmente valide no drop com `checkUploadBatch` de `src/lib/limits.ts` para feedback imediato de quantidade/tamanho total (veja `JuntarPdfClient.tsx`).

**Ferramentas especiais**:
- `redigir-pdf` — fluxo próprio (upload → preview de páginas → desenho → apply), com `components/`, `hooks/`, `request.ts` próprios em `src/app/ferramentas/redigir-pdf/`.
- `organizar-pdf` — drag & drop com `@dnd-kit`; custom UI de erro via `renderError` do `ProcessingStatePanel`.

### 6. Testes

- Unitário do motor: `tests/unit/lib/pdf/<slug>.test.ts` (Buffer fake com prefixo `%PDF-`).
- Integração da rota: adicionar cases em `tests/integration/api/routes.test.ts` (400/413/200).
- Validação das rotas: `tests/unit/api/routes-validation.test.ts` cobre automaticamente o contrato (honeypot, sem arquivo, arquivo inválido) para qualquer rota registrada no array `HANDLERS` — **adicione sua rota a esse array**.

## Checklist para nova ferramenta

- [ ] `src/config/tools.ts` — registro (slug, name, seoDescription, icon, tier, accept, multiple, usesBinary)
- [ ] `src/lib/pdf/<slug>.ts` — motor (Buffer → Buffer) + `useBinary` se aplicar
- [ ] `src/app/api/pdf/<apiSlug>/route.ts` — handler POST com helpers de `http.ts`
- [ ] `src/app/ferramentas/<slug>/page.tsx` — metadata + ToolPageShell
- [ ] `src/app/ferramentas/<slug>/<Tool>Client.tsx` — useFileProcessor + componentes de estado
- [ ] Testes unitários do motor + validação de rota em `routes-validation.test.ts` + integração
- [ ] `npm run lint` e `npm run test` verdes
- [ ] (Opcional) tutorial em `src/config/tutorials.ts` com `targetToolSlug`

## Exemplo de referência

- Ferramenta simples: `comprimir-pdf` (um arquivo, parâmetro `quality`)
- Ferramenta multi-arquivo: `juntar-pdf` (`merge`, `parsePdfUploads(req, 2)`)
- Ferramenta com binário: `pdf-para-word` (`to-word`, `binaryLimit`)
- Ferramenta com UI própria: `redigir-pdf` (editor de redação)