import 'reflect-metadata';
import type { Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import * as packageJson from '../package.json';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { McpHttpService } from './modules/mcp/mcp-http.service';
import { validateEnv } from './shared/config/env';
import { API_PREFIX, MCP_PATH } from './shared/constants';

async function bootstrap(): Promise<void> {
  const env = validateEnv(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health', MCP_PATH] });

  app.enableCors({
    origin: (env.HUB_PUBLIC_CORS_ORIGINS || env.CORS_ORIGINS)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Unificando Hub — Knowledge Platform')
    .setDescription(
      'Official API of the Unificando ecosystem: project registry, knowledge search, ' +
        'documentation, decisions and pre-built LLM context packages.',
    )
    .setVersion(packageJson.version)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // MCP Streamable HTTP — middleware puro no path /mcp (fora do prefixo
  // /api/v1). Registrado antes do listen: responde antes dos middlewares
  // globais do Express (helmet, CORS do Nest) — /mcp tem allowlist, CORS e
  // rate limit próprios (mcp.security.ts) e não deve herdá-los.
  const mcpHttp = app.get(McpHttpService);
  app.use(MCP_PATH, (req: Request, res: Response) => {
    void mcpHttp.handle(req, res);
  });

  await app.listen(env.PORT);
  app.get(Logger).log(`hub-unificando listening on ${env.PORT} (${env.NODE_ENV})`);
  app.get(Logger).log(`Swagger UI at http://localhost:${env.PORT}/api/docs`);
  app.get(Logger).log(`MCP Streamable HTTP at http://localhost:${env.PORT}${MCP_PATH}`);
}

void bootstrap();
