import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { SeederService } from './seeder.service.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const seederService = app.get(SeederService);
    const result = await seederService.seed();
    console.info('\n==========================================');
    console.info('✅ DHRUTO DB SEED COMPLETED SUCCESSFULLY');
    console.info('==========================================');
    console.info(JSON.stringify(result.stats, null, 2));
    console.info('==========================================\n');
  } catch (error) {
    console.error('\n❌ SEED EXECUTION FAILED:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
