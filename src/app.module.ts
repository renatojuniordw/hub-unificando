import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DecisionsModule } from './modules/decisions/decisions.module';
import { ClassificationModule } from './modules/classification/classification.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { SearchModule } from './modules/search/search.module';
import { ContextModule } from './modules/context/context.module';
import { McpModule } from './modules/mcp/mcp.module';
import { EnvModule } from './shared/config/env.module';
import { ENV, type Env } from './shared/config/env';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        autoLogging: process.env.NODE_ENV !== 'test',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
        redact: ['req.headers.authorization'],
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => [{ ttl: 60_000, limit: env.THROTTLE_READ }],
    }),
    EnvModule,
    PrismaModule,
    RedisModule,
    HealthModule,
    ProjectsModule,
    DocumentsModule,
    CategoriesModule,
    DecisionsModule,
    ClassificationModule,
    IngestionModule,
    SearchModule,
    ContextModule,
    McpModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
