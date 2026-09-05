import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsRepository } from './projects.repository';
import { ProjectsController } from './projects.controller';
import { DocumentsModule } from '../documents/documents.module';
import { DecisionsModule } from '../decisions/decisions.module';

@Module({
  imports: [DocumentsModule, DecisionsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
