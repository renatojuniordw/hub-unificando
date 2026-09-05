import { Global, Module } from '@nestjs/common';
import { envProvider } from './env.js';

/**
 * Global module exposing the validated environment (`ENV` token) to every
 * module — including dynamic modules resolved via `forRootAsync({ inject })`.
 */
@Global()
@Module({
  providers: [envProvider],
  exports: [envProvider],
})
export class EnvModule {}
