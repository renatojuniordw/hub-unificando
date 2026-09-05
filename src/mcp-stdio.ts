import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AppModule } from './app.module';
import { McpServerFactory } from './modules/mcp/mcp-server.factory';

/**
 * Entry point MCP via stdio — mesmas tools do transporte HTTP (registry
 * compartilhado). Uso: npm run mcp:stdio (Claude Desktop/Cursor/opencode).
 *
 * Quando o stdin fecha (cliente encerrou), o contexto Nest é fechado para o
 * processo terminar (Worker/Redis/Prisma mantêm o event loop vivo).
 */
let shuttingDown = false;

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const factory = app.get(McpServerFactory);
  const server = factory.create();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = (): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    // Fecha o contexto Nest; fallback de 5s caso algum recurso trave o close.
    const timer = setTimeout(() => process.exit(0), 5000);
    timer.unref();
    void app.close().finally(() => process.exit(0));
  };
  transport.onclose = shutdown;
  // Garantia extra: ao fechar o stdin (cliente encerrou), derruba o processo.
  process.stdin.on('end', shutdown);
  process.stdin.on('error', shutdown);
}

main().catch((error: unknown) => {
  console.error('[hub] MCP stdio failed:', error);
  process.exit(1);
});
