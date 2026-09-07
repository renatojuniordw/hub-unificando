# Sincronização Automática (Cron)

## Na inicialização do Docker (automático)

O `docker-entrypoint.sh` já executa automaticamente ao subir o container **quando o banco está vazio** (`COUNT(*) FROM medicines = 0`):

```bash
1. npx prisma migrate deploy                 # Migrations (schema)
2. npx tsx prisma/seed.ts                    # ANVISA + Admin
3. npx tsx scripts/sync-farmacia-popular.ts  # Farmácia Popular
4. npx tsx scripts/backfill-indications.ts   # Indicações terapêuticas
5. npx tsx scripts/generate-search-index.ts  # Embeddings (multilingual-e5-base, 768d)
6. npx tsx scripts/generate-tsvector.ts      # Coluna tsvector (regular)
```

> O init **só roda uma vez** (banco vazio). Se o banco já tiver dados, o entrypoint pula a sequência e apenas inicia o servidor. Para regenerar embeddings/tsvector depois, use `npm run search-index` / `npm run tsvector`.

## Rotina semanal via crontab da VPS

Para manter os dados atualizados sem reiniciar o container, adicione no crontab da VPS:

```bash
crontab -e
```

```cron
# ANVISA — todo domingo às 3h
0 3 * * 0 docker exec medicamentos-app sh -c "npx tsx prisma/seed.ts && npm run search-index && npm run tsvector" >> /var/log/sync.log 2>&1

# Farmácia Popular — todo domingo às 4h (após ANVISA + índices)
0 4 * * 0 docker exec medicamentos-app npx tsx scripts/sync-farmacia-popular.ts >> /var/log/sync.log 2>&1

# LGPD — purge de search_logs/search_feedback (> 365 dias) — todo domingo às 5h
0 5 * * 0 docker exec medicamentos-app npx tsx scripts/purge-search-logs.ts >> /var/log/sync.log 2>&1
```

> ⚠️ O container `medicamentos-app` precisa estar rodando para o `docker exec` funcionar.
> O purge respeita a política de retenção (padrão 365 dias) — ver `scripts/purge-search-logs.ts` e a página `/privacidade`.
> Desde 2026-09-03 o seed/sync **preserva IDs** (diff por `reference`): rodar o cron de domingo é idempotente e não quebra URLs `/medicamento/{slug}` (ID preservado no sufixo), favoritos nem comparações.
>
> **Backup e monitoramento** (healthcheck da API + verificação de frescor do backup via `scripts/check-backup-freshness.sh`) também estão agendados — ver seção "Sincronização automática (Cron)" em `docs/DEPLOYMENT.md`.

## Scripts disponíveis para cron

| Comando | Descrição |
|---------|-----------|
| `npm run seed` | Importar ANVISA |
| `npm run farmacia-popular` | Sincronizar Farmácia Popular |
| `npm run search-index` | Gerar embeddings (apenas novos) |
| `npm run tsvector` | Gerar tsvector |
| `npm run purge:logs` | Purge de logs/feedback antigos (retenção LGPD) |

## URLs dos dados

- Medicamentos ANVISA: `https://dados.anvisa.gov.br/dados/CONSULTAS/PRODUTOS/TA_CONSULTA_MEDICAMENTOS.CSV`
- Preços CMED: `https://dados.anvisa.gov.br/dados/TA_PRECOS_MEDICAMENTOS.csv`
- Classes Terapêuticas: `https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv`
- Farmácia Popular (MS): `https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular/arquivos/elenco-de-medicamentos-e-insumos-pfpb.pdf`
- Portal dados abertos: `https://dados.anvisa.gov.br/dados/`
