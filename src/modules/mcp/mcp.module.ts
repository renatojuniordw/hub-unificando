import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { DocumentsModule } from '../documents/documents.module';
import { CategoriesModule } from '../categories/categories.module';
import { DecisionsModule } from '../decisions/decisions.module';
import { SearchModule } from '../search/search.module';
import { ContextModule } from '../context/context.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { McpServerFactory } from './mcp-server.factory';
import { McpSessionManager } from './mcp.session-manager';
import { McpHttpService } from './mcp-http.service';

@Module({
  imports: [
    ProjectsModule,
    DocumentsModule,
    CategoriesModule,
    DecisionsModule,
    SearchModule,
    ContextModule,
    IngestionModule,
  ],
  providers: [McpServerFactory, McpSessionManager, McpHttpService],
  exports: [McpServerFactory, McpSessionManager, McpHttpService],
})
export class McpModule {}
