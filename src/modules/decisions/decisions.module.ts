import { Module } from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { DecisionsRepository } from './decisions.repository';
import { DecisionByIdController, ProjectDecisionsController } from './decisions.controller';

@Module({
  controllers: [ProjectDecisionsController, DecisionByIdController],
  providers: [DecisionsService, DecisionsRepository],
  exports: [DecisionsService, DecisionsRepository],
})
export class DecisionsModule {}
